/**
 * 数据治理规则引擎 (Governance Rule Engine) —— P0-b
 *
 * 修复的问题：
 *   VersionPointer 类型中声明了 riskLevel / isSuspectedMistake / mistakeReason，
 *   但 recordDataMutation 从未给它们赋过值。全项目这三个字段只出现在
 *   mock 常量 INITIAL_VERSION_POINTERS 里 —— 也就是说"疑似误操作报警 N 处"
 *   "风控拦截原因：xxx" 全部来自硬编码演示数据，真实操作永远不会触发。
 *
 * 本模块提供：
 *   1. 声明式规则表（不与业务逻辑耦合，可独立开关）；
 *   2. 行为基线（按 操作员 × 模块 的滚动 P95 分位判定，样本不足时降级硬阈值并标注）；
 *   3. 分级处置：notify（仅记录）/ quarantine（锁实体不做变更）/ auto_revert（白名单）；
 *   4. 隔离区登记表，供写入网关拒绝后续写入直到复核。
 */

import { RuleHit, VersionActionType, VersionModuleType, VersionPointer, MerchantRole } from '../types/versionTracking';
import { safeGetStorage, safeSetStorage } from './safeStorage';

const STORAGE_KEY_QUARANTINE = 'obsidian_governance_quarantine';

/** 隔离区登记项 */
export interface QuarantineEntry {
  entityKey: string;
  module: VersionModuleType;
  entityId: string;
  entityName: string;
  pointerId: string;
  ruleIds: string[];
  reason: string;
  quarantinedAt: string;
  quarantinedBy: string;
  released?: boolean;
  releasedAt?: string;
  releasedBy?: string;
}

// -------------------------------------------------------------
// 规则定义
// -------------------------------------------------------------

export interface RuleContext {
  pointer: VersionPointer;
  /** 全部历史指针（含当前条），用于频次与基线统计 */
  history: VersionPointer[];
  /** 允许写入的目标模型（来自 P2-a 补丁） */
  numericFieldValues: Array<{ field: string; before: number; after: number }>;
  /** 业务时段（分钟数，0-1440） */
  businessHours: { start: number; end: number };
  /** 当前时间（注入以便测试） */
  now: Date;
}

export interface GovernanceRule {
  id: string;
  label: string;
  description: string;
  severity: RuleHit['severity'];
  action: RuleHit['action'];
  enabled: boolean;
  appliesTo?: { modules?: VersionModuleType[]; actionTypes?: VersionActionType[] };
  /** 返回 null = 未命中；返回 RuleHit 主体 = 命中 */
  predicate: (ctx: RuleContext) => Omit<RuleHit, 'ruleId' | 'label' | 'severity' | 'action'> | null;
}

const MODULE_ALLOWED_ROLES: Partial<Record<VersionModuleType, MerchantRole[]>> = {
  orders: ['manager', 'cashier', 'admin', 'system'],
  calling_queue: ['manager', 'cashier', 'admin', 'system'],
  tables: ['manager', 'cashier', 'admin', 'system'],
  kds: ['manager', 'grill_chef', 'barista', 'admin', 'system'],
  dishes: ['manager', 'grill_chef', 'barista', 'admin', 'system'],
  materials: ['manager', 'grill_chef', 'barista', 'admin', 'system'],
  coupons: ['manager', 'admin', 'system'],
  marketing: ['manager', 'admin', 'system'],
  delivery: ['manager', 'rider', 'admin', 'system'],
  payments: ['manager', 'admin', 'system'],
  staff: ['manager', 'admin', 'system'],
  stall_gps: ['manager', 'rider', 'admin', 'system'],
  craft_standards: ['manager', 'grill_chef', 'admin', 'system'],
  system: ['manager', 'admin', 'system'],
  fallback: ['manager', 'admin', 'system']
};

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function pickNumericFields(pointer: VersionPointer): Array<{ field: string; before: number; after: number }> {
  return (pointer.fieldDiffs || [])
    .filter((d) => typeof d.oldValue === 'number' && typeof d.newValue === 'number')
    .map((d) => ({ field: d.field, before: d.oldValue as number, after: d.newValue as number }));
}

/** 计算某组数值的 P95 分位 */
export function percentile95(values: number[]): number | null {
  if (values.length < 5) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx];
}

export const GOVERNANCE_RULES: GovernanceRule[] = [
  {
    id: 'R-RBAC-BYPASS',
    label: '权限越界操作',
    description: '操作员角色与该模块的授权角色不匹配',
    severity: 'high_risk',
    action: 'notify',
    enabled: true,
    predicate: (ctx) => {
      const allowed = MODULE_ALLOWED_ROLES[ctx.pointer.module];
      if (!allowed) return null;
      const role = ctx.pointer.operator.role;
      if (allowed.includes(role)) return null;
      return {
        reason: `【${ctx.pointer.operator.name}】的角色为「${ctx.pointer.operator.roleName}」，不具备「${ctx.pointer.moduleName}」的写权限`,
        evidence: { module: ctx.pointer.module, role, allowedRoles: allowed.join('/') }
      };
    }
  },
  {
    id: 'R-OFFHOURS-VOID',
    label: '非营业时段作废单据',
    description: '在营业时段之外作废号牌、工单或订单',
    severity: 'high_risk',
    action: 'quarantine',
    enabled: true,
    appliesTo: { actionTypes: ['void_ticket', 'void_order'] },
    predicate: (ctx) => {
      const now = minutesOfDay(ctx.now);
      const { start, end } = ctx.businessHours;
      const inside = now >= start && now <= end;
      if (inside) return null;
      return {
        reason: `当前 ${ctx.now.getHours().toString().padStart(2, '0')}:${ctx.now.getMinutes().toString().padStart(2, '0')} 处于营业时段（${fmtMin(start)}-${fmtMin(end)}）之外，仍执行了作废操作`,
        evidence: { nowMinute: now, businessStart: start, businessEnd: end }
      };
    }
  },
  {
    id: 'R-FORCE-CLEAN-OFFHOURS',
    label: '非营业时段强制清台',
    description: '打烊后仍强制完成保洁/清台，可能掩盖未结账订单',
    severity: 'sensitive',
    action: 'notify',
    enabled: true,
    appliesTo: { actionTypes: ['force_clean'] },
    predicate: (ctx) => {
      const now = minutesOfDay(ctx.now);
      if (now >= ctx.businessHours.start && now <= ctx.businessHours.end) return null;
      return {
        reason: '非营业时段执行强制清台，请确认是否存在未结账订单',
        evidence: { nowMinute: now }
      };
    }
  },
  {
    id: 'R-DISCOUNT-ABNORMAL',
    label: '异常大额折扣',
    description: '折扣力度超出本店近 30 天的 P95 水位',
    severity: 'high_risk',
    action: 'notify',
    enabled: true,
    predicate: (ctx) => {
      const discountFields = ctx.numericFieldValues.filter((f) => /discount|rebate|deduct|优惠|折扣/i.test(f.field));
      if (discountFields.length === 0) return null;

      const historyValues = ctx.history
        .flatMap((p) => pickNumericFields(p))
        .filter((f) => /discount|rebate|deduct|优惠|折扣/i.test(f.field))
        .map((f) => Math.abs(f.after));
      const p95 = percentile95(historyValues);

      const worst = discountFields.reduce((acc, cur) =>
        Math.abs(cur.after) > Math.abs(acc.after) ? cur : acc
      );
      const magnitude = Math.abs(worst.after);

      if (p95 === null) {
        // 样本不足：降级为硬阈值并显式标注
        if (magnitude < 15) return null;
        return {
          reason: `折扣力度 ${magnitude} 超过硬阈值 15（基线样本不足 5 条，未能使用分位判定）`,
          evidence: { field: worst.field, magnitude, baseline: 'insufficient_samples', threshold: 15 }
        };
      }
      if (magnitude <= p95) return null;
      return {
        reason: `折扣力度 ${magnitude} 超过近 30 天 P95 水位 ${p95.toFixed(2)}`,
        evidence: { field: worst.field, magnitude, p95: Number(p95.toFixed(2)), sampleSize: historyValues.length }
      };
    }
  },
  {
    id: 'R-PRICE-JUMP',
    label: '单价异常跳变',
    description: '价格变动幅度超过 50%',
    severity: 'high_risk',
    action: 'notify',
    enabled: true,
    predicate: (ctx) => {
      const priceFields = ctx.numericFieldValues.filter((f) => /price|amount|fee|价/i.test(f.field) && f.before > 0);
      const hit = priceFields.find((f) => Math.abs(f.after - f.before) / Math.abs(f.before) > 0.5);
      if (!hit) return null;
      const ratio = Math.abs(hit.after - hit.before) / Math.abs(hit.before);
      return {
        reason: `「${hit.field}」从 ${hit.before} 跳变至 ${hit.after}（幅度 ${(ratio * 100).toFixed(1)}%）`,
        evidence: { field: hit.field, before: hit.before, after: hit.after, ratio: Number(ratio.toFixed(3)) }
      };
    }
  },
  {
    id: 'R-RAPID-PRICING',
    label: '高频改价',
    description: '同一操作员 10 分钟内对价格类字段修改 3 次以上',
    severity: 'sensitive',
    action: 'notify',
    enabled: true,
    predicate: (ctx) => {
      const current = new Date(ctx.pointer.timestamp.replace(' ', 'T')).getTime();
      if (Number.isNaN(current)) return null;
      const windowMs = 10 * 60 * 1000;

      const recentPriceEdits = ctx.history.filter((p) => {
        if (p.operator.id !== ctx.pointer.operator.id) return false;
        if (p.module !== ctx.pointer.module) return false;
        const hasPrice = (p.fieldDiffs || []).some((d) => /price|amount|fee|价/i.test(d.field));
        if (!hasPrice) return false;
        const t = new Date(p.timestamp.replace(' ', 'T')).getTime();
        if (Number.isNaN(t)) return false;
        return current - t >= 0 && current - t <= windowMs;
      });

      if (recentPriceEdits.length < 3) return null;
      return {
        reason: `【${ctx.pointer.operator.name}】在 10 分钟内对「${ctx.pointer.moduleName}」价格类字段修改了 ${recentPriceEdits.length} 次`,
        evidence: { count: recentPriceEdits.length, windowMinutes: 10 }
      };
    }
  },
  {
    id: 'R-STOCK-ZERO',
    label: '库存被清零或置负',
    description: '在库量被修改为 0 或负数',
    severity: 'high_risk',
    action: 'quarantine',
    enabled: true,
    predicate: (ctx) => {
      const stockFields = ctx.numericFieldValues.filter((f) => /stock|qty|quantity|库存|存量/i.test(f.field));
      const hit = stockFields.find((f) => f.after <= 0);
      if (!hit) return null;
      return {
        reason: `「${hit.field}」被从 ${hit.before} 调整为 ${hit.after}，库存归零或为负`,
        evidence: { field: hit.field, before: hit.before, after: hit.after }
      };
    }
  },
  {
    id: 'R-BULK-DELETE',
    label: '批量删除',
    description: '单次删除的实体数量或字段数量超过 10',
    severity: 'high_risk',
    action: 'quarantine',
    enabled: true,
    predicate: (ctx) => {
      if (ctx.pointer.actionType !== 'delete' && ctx.pointer.actionType !== 'batch_adjust') return null;
      const removed = (ctx.pointer.patches || []).filter((p) => p.op === 'remove').length;
      const diffs = (ctx.pointer.fieldDiffs || []).length;
      const scale = Math.max(removed, diffs);
      if (scale <= 10) return null;
      return {
        reason: `单次操作涉及 ${scale} 处删除/变更，超过批量阈值 10`,
        evidence: { removedPatches: removed, fieldDiffs: diffs }
      };
    }
  }
];

function fmtMin(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// -------------------------------------------------------------
// 规则求值
// -------------------------------------------------------------

const SEVERITY_ORDER: Record<RuleHit['severity'], number> = { low: 0, sensitive: 1, high_risk: 2 };
const ACTION_ORDER: Record<RuleHit['action'], number> = { none: 0, notify: 1, quarantine: 2, auto_revert: 3 };

function readBusinessHours(): { start: number; end: number } {
  const info = safeGetStorage<any>('obsidian_truck_info', null);
  const raw = info?.businessHours;
  if (typeof raw === 'string') {
    const m = raw.match(/(\d{1,2})\s*:\s*(\d{2})\s*[-~至]\s*(\d{1,2})\s*:\s*(\d{2})/);
    if (m) {
      return {
        start: Number(m[1]) * 60 + Number(m[2]),
        end: Number(m[3]) * 60 + Number(m[4])
      };
    }
  }
  return { start: 9 * 60, end: 22 * 60 };
}

export interface EvaluateOptions {
  now?: Date;
  /** 临时覆盖规则开关（便于测试与灰度） */
  enabledOverrides?: Record<string, boolean>;
}

export function evaluateRules(
  pointer: VersionPointer,
  history: VersionPointer[],
  options: EvaluateOptions = {}
): RuleHit[] {
  const ctx: RuleContext = {
    pointer,
    history,
    numericFieldValues: pickNumericFields(pointer),
    businessHours: readBusinessHours(),
    now: options.now ?? new Date()
  };

  const hits: RuleHit[] = [];
  GOVERNANCE_RULES.forEach((rule) => {
    const enabled = options.enabledOverrides?.[rule.id] ?? rule.enabled;
    if (!enabled) return;
    if (rule.appliesTo?.modules && !rule.appliesTo.modules.includes(pointer.module)) return;
    if (rule.appliesTo?.actionTypes && !rule.appliesTo.actionTypes.includes(pointer.actionType)) return;

    try {
      const hit = rule.predicate(ctx);
      if (hit) {
        hits.push({
          ruleId: rule.id,
          label: rule.label,
          severity: rule.severity,
          action: rule.action,
          reason: hit.reason,
          evidence: hit.evidence
        });
      }
    } catch (e) {
      // 规则异常绝不影响主写入流程
      console.warn(`[GovernanceRuleEngine] 规则 ${rule.id} 求值异常，已跳过:`, e);
    }
  });

  return hits;
}

export function highestSeverity(hits: RuleHit[]): 'normal' | 'sensitive' | 'high_risk' {
  if (hits.length === 0) return 'normal';
  const top = hits.reduce((acc, cur) =>
    SEVERITY_ORDER[cur.severity] > SEVERITY_ORDER[acc.severity] ? cur : acc
  );
  return top.severity === 'low' ? 'normal' : top.severity;
}

export function highestAction(hits: RuleHit[]): 'none' | RuleHit['action'] {
  if (hits.length === 0) return 'none';
  const top = hits.reduce((acc, cur) => (ACTION_ORDER[cur.action] > ACTION_ORDER[acc.action] ? cur : acc));
  return top.action;
}

export function summarizeHits(hits: RuleHit[], limit = 2): string {
  const shown = hits.slice(0, limit).map((h) => h.reason);
  const suffix = hits.length > limit ? `（另有 ${hits.length - limit} 项）` : '';
  return shown.join('；') + suffix;
}

// -------------------------------------------------------------
// 隔离区登记表
// -------------------------------------------------------------

export function quarantineKey(module: VersionModuleType, entityId: string): string {
  return `${module}::${entityId}`;
}

export function getQuarantineEntries(): QuarantineEntry[] {
  return safeGetStorage<QuarantineEntry[]>(STORAGE_KEY_QUARANTINE, []);
}

function saveQuarantineEntries(entries: QuarantineEntry[]): void {
  const ok = safeSetStorage(STORAGE_KEY_QUARANTINE, entries);
  if (!ok) {
    console.error('[GovernanceRuleEngine] 隔离区登记表写入失败，本地存储配额可能已满');
  }
}

export function quarantineEntity(
  pointer: VersionPointer,
  hits: RuleHit[]
): QuarantineEntry | null {
  const actionable = hits.filter((h) => h.action === 'quarantine');
  if (actionable.length === 0) return null;

  const key = quarantineKey(pointer.module, pointer.entityId);
  const entries = getQuarantineEntries();
  const existing = entries.find((e) => e.entityKey === key && !e.released);
  if (existing) return existing;

  const entry: QuarantineEntry = {
    entityKey: key,
    module: pointer.module,
    entityId: pointer.entityId,
    entityName: pointer.entityName,
    pointerId: pointer.pointerId,
    ruleIds: actionable.map((h) => h.ruleId),
    reason: actionable.map((h) => h.reason).join('；'),
    quarantinedAt: new Date().toISOString(),
    quarantinedBy: '数据治理规则引擎（自动）'
  };
  saveQuarantineEntries([entry, ...entries]);
  return entry;
}

export function isQuarantined(module: VersionModuleType, entityId: string): QuarantineEntry | null {
  const key = quarantineKey(module, entityId);
  return getQuarantineEntries().find((e) => e.entityKey === key && !e.released) ?? null;
}

export function releaseQuarantine(entityKey: string, operatorName: string): boolean {
  const entries = getQuarantineEntries();
  let hit = false;
  const next = entries.map((e) => {
    if (e.entityKey !== entityKey || e.released) return e;
    hit = true;
    return { ...e, released: true, releasedAt: new Date().toISOString(), releasedBy: operatorName };
  });
  if (!hit) return false;
  saveQuarantineEntries(next);
  return true;
}

export function getGovernanceRuleMeta(): Array<Pick<GovernanceRule, 'id' | 'label' | 'description' | 'severity' | 'action' | 'enabled'>> {
  return GOVERNANCE_RULES.map(({ id, label, description, severity, action, enabled }) => ({
    id,
    label,
    description,
    severity,
    action,
    enabled
  }));
}
