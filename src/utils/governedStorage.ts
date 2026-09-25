/**
 * 受治写入网关 (Governed Storage Gateway) —— P1-a
 *
 * 修复的问题：
 *   "渗透级"要求记录能力覆盖全部持久化写入路径，不能依赖人工埋点。
 *   改造前全项目只有 29 处 recordDataMutation 调用，集中在 4 个组件，
 *   15 个模块中仅 5-6 个有真实写入点 —— 属于"抽样记录"而非全覆盖，
 *   漏点是必然的，且随代码演进会持续漂移。
 *
 * 设计洞察：
 *   utils/safeStorage.ts 已经是全部持久化的**唯一出口**。与其继续在业务
 *   代码里加埋点，不如把记录能力下沉到出口处自动拦截 —— 业务侧零改动
 *   即可获得覆盖，这才是"渗透"。
 *
 * 本模块提供：
 *   1. governedWrite()：写入时自动 diff 上一版并生成版本指针；
 *   2. withTransaction()：把"一次业务操作改多个键"聚合为一条指针，
 *      否则回滚只能回一半；
 *   3. 与显式埋点去重：同一 key+entity 在短时间内已被 recordDataMutation
 *      覆盖时，网关不再重复记录。
 */

import { VersionActionType, VersionModuleType, VersionPointer } from '../types/versionTracking';
import {
  safeGetStorage,
  safeSetStorage,
  registerStorageWriteHook,
  withStorageWriteHookSuspended
} from './safeStorage';
import { buildFieldPatches } from './patchEngine';
import { ALL_MODULES, ENTITY_SCOPE_REGISTRY, listAllStorageKeys } from './rollbackGuard';

// -------------------------------------------------------------
// 键 → 模块映射
// -------------------------------------------------------------

export interface GovernedKeyDescriptor {
  module: VersionModuleType;
  /** 集合型（数组）还是单例型（对象） */
  kind: 'collection' | 'singleton';
  /** 业务可读名，用于生成 entityName */
  label: string;
  /** 单例模块的记录实体 ID 约定 */
  singletonEntityId?: string;
  /**
   * 集合内实体的主键字段名。
   * 缺省按 id / code / key 匹配；领域模型用专属主键（sessionId / requestId / probeId）
   * 时必须显式声明，否则网关无法识别实体变更，会整批视为"无变化"而漏记。
   */
  idField?: string;
  /**
   * 记录模式：
   *   auto（默认）—— 每次变更自动生成版本指针
   *   silent      —— 仅登记受治、可读可回滚，但**不自动生成指针**。
   *                 用于高频遥测（行为探针）：逐条进版本链会瞬间冲垮保留配额，
   *                 且"回滚遥测"本身没有业务意义。需要时可用 forceRecord 显式记录。
   */
  recordMode?: 'auto' | 'silent';
}

const g = (
  module: VersionModuleType,
  kind: 'collection' | 'singleton',
  label: string,
  singletonEntityId?: string,
  idField?: string,
  recordMode: 'auto' | 'silent' = 'auto'
): GovernedKeyDescriptor => ({ module, kind, label, singletonEntityId, idField, recordMode });

/**
 * 覆盖 rollbackGuard 适配表中的全部键。
 * 业务侧任何对这批键的写入，只要走 governedWrite，就会自动产生版本指针。
 */
export const GOVERNED_KEY_MAP: Record<string, GovernedKeyDescriptor> = {
  // dishes
  obsidian_truck_dishes: g('dishes', 'collection', '菜品与菜单管理'),
  // materials
  obsidian_truck_materials: g('materials', 'collection', '原料与库存资产'),
  obsidian_inventory_stock: g('materials', 'collection', '库存快照'),
  // coupons
  obsidian_merchant_coupons: g('coupons', 'collection', '优惠券与营销发券'),
  // marketing
  obsidian_activity_rules: g('marketing', 'collection', '阶梯满减与叠享规则'),
  obsidian_stacking_settings: g('marketing', 'singleton', '叠享配置', 'promo-stacking-config'),
  // tables
  obsidian_merchant_tables: g('tables', 'collection', '堂食桌台与就餐流转'),
  obsidian_tables: g('tables', 'collection', '堂食桌台（遗留键）'),
  // orders
  obsidian_truck_orders: g('orders', 'collection', '全渠道订单数据'),
  obsidian_orders: g('orders', 'collection', '订单（遗留键）'),
  obsidian_customer_orders: g('orders', 'collection', '顾客订单'),
  obsidian_real_pay_orders: g('orders', 'collection', '实付订单'),
  obsidian_merchant_held_orders: g('orders', 'collection', '挂单'),
  // calling_queue
  obsidian_queue_tickets: g('calling_queue', 'collection', '前台排队与叫号中心'),
  obsidian_waiting_queue: g('calling_queue', 'collection', '等位队列'),
  obsidian_calling_history: g('calling_queue', 'collection', '叫号历史'),
  // kds
  obsidian_merchant_tickets: g('kds', 'collection', '后厨制作与划菜工单'),
  // staff
  obsidian_staff_members: g('staff', 'collection', '员工花名册与RBAC'),
  obsidian_staff: g('staff', 'collection', '员工（遗留键）'),
  obsidian_truck_users: g('staff', 'collection', '餐车用户'),
  // payments
  obsidian_merchant_payment_channels: g('payments', 'collection', '支付渠道与结算'),
  obsidian_payment_channels: g('payments', 'collection', '支付渠道（遗留键）'),
  // craft_standards
  obsidian_craft_standards: g('craft_standards', 'collection', '主厨SOP与工艺配方'),
  // delivery
  obsidian_delivery_settings: g('delivery', 'singleton', '外卖配送与运费配置', 'delivery-config'),
  // stall_gps
  obsidian_truck_info: g('stall_gps', 'singleton', '餐车GPS与营业时段', 'truck-info'),
  obsidian_truck_location_configs: g('stall_gps', 'singleton', '餐车位点配置', 'truck-location-configs'),
  obsidian_truck_expand_config: g('stall_gps', 'singleton', '餐车扩展配置', 'truck-expand-config'),
  // system
  obsidian_business_status: g('system', 'singleton', '营业状态', 'business-status'),
  obsidian_truck_business_statuses: g('system', 'collection', '各餐车独立营业与渠道状态', 'business-status', 'truckId'),
  // table_session（堂食桌台会话与多端联动授权）
  obsidian_table_sessions: g('table_session', 'collection', '堂食桌台会话', undefined, 'sessionId'),
  obsidian_table_link_requests: g('table_session', 'collection', '桌台联动授权请求', undefined, 'requestId'),
  obsidian_table_session_probes: g('table_session', 'collection', '桌台会话行为探针', undefined, 'probeId', 'silent')
};

export function isGovernedKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(GOVERNED_KEY_MAP, key);
}

// -------------------------------------------------------------
// 与显式埋点去重
// -------------------------------------------------------------

const EXPLICIT_DEDUPE_WINDOW_MS = 800;
const recentExplicit: Array<{ key: string; entityId: string; at: number }> = [];

function purgeExplicit(now: number): void {
  const cutoff = now - EXPLICIT_DEDUPE_WINDOW_MS;
  for (let i = recentExplicit.length - 1; i >= 0; i -= 1) {
    if (recentExplicit[i].at < cutoff) recentExplicit.splice(i, 1);
  }
}

/**
 * 由 recordDataMutation 调用：声明"这次变更已经有人工埋点覆盖了"。
 * 网关在随后的去重窗口内不再为同一 key+entity 重复生成指针。
 */
export function markExplicitlyRecorded(targetKeys: string[], entityId: string): void {
  const at = Date.now();
  targetKeys.forEach((key) => recentExplicit.push({ key, entityId, at }));
  purgeExplicit(at);
}

/**
 * 【一次性消费语义】命中即移除。
 *
 * 为什么必须消费而不是"窗口内持续抑制"：
 *   曾用 `some(...)` 实现，导致同一实体的**后续不同变更**也被静默丢弃 ——
 *   用户 1.5 秒内连改两次同一会员资料/同一桌台会话，第二次不留任何版本记录，
 *   且没有任何报错。这属于最难发现的一类数据治理缺陷。
 *   消费式匹配保证：一条显式埋点只抵消一条网关自动记录，
 *   多出来的变更宁可多记一条（可见、可去重），也绝不静默丢弃。
 */
function wasExplicitlyRecorded(key: string, entityId: string): boolean {
  const now = Date.now();
  purgeExplicit(now);
  const idx = recentExplicit.findIndex((r) => r.key === key && r.entityId === entityId);
  if (idx < 0) return false;
  recentExplicit.splice(idx, 1);
  return true;
}

// -------------------------------------------------------------
// 上一版缓存
// -------------------------------------------------------------

const lastValueRegistry = new Map<string, unknown>();

function baselineOf(key: string): unknown {
  if (lastValueRegistry.has(key)) return lastValueRegistry.get(key);
  const value = safeGetStorage<unknown>(key, undefined);
  lastValueRegistry.set(key, value);
  return value;
}

/** 实体主键候选 */
const ID_FIELDS = ['id', 'code', 'key'];

function entityIdOf(item: any, idField?: string): string | null {
  if (!item || typeof item !== 'object') return null;
  const fields = idField ? [idField] : ID_FIELDS;
  for (const f of fields) {
    const v = item[f];
    if (typeof v === 'string' || typeof v === 'number') return String(v);
  }
  return null;
}

/** 实体展示名：优先业务可读字段，领域模型（会话/请求/探针）退化到主键或 label */
function entityNameOf(item: any, fallback: string, idField?: string): string {
  return (
    item?.name ||
    item?.title ||
    item?.code ||
    item?.dishName ||
    item?.displayName ||
    (idField ? item?.[idField] : undefined) ||
    item?.tableCode ||
    fallback
  );
}

// -------------------------------------------------------------
// 事务上下文
// -------------------------------------------------------------

export interface GovernanceMutationDraft {
  targetKey: string;
  module: VersionModuleType;
  entityId: string;
  entityName: string;
  actionType: VersionActionType;
  beforeData: unknown;
  afterData: unknown;
}

interface TxContext {
  label: string;
  drafts: GovernanceMutationDraft[];
}

let txContext: TxContext | null = null;

/** 由 versionPointerEngine 注入，避免循环依赖 */
type CommitHandler = (
  drafts: GovernanceMutationDraft[],
  label: string,
  transactionId: string
) => void;
let commitHandler: CommitHandler | null = null;

export function registerGovernanceCommitHandler(handler: CommitHandler): void {
  commitHandler = handler;
}

let txSeq = 0;

/**
 * 事务包装：同一事务内的多次写入会被聚合后一次性提交，
 * 从而"一次业务操作 = 一条指针"。
 */
export function withTransaction<T>(label: string, fn: () => T): T {
  const isRoot = txContext === null;
  if (isRoot) txContext = { label, drafts: [] };
  let result: T;
  try {
    result = fn();
  } catch (e) {
    if (isRoot) {
      txContext = null;
      throw e;
    }
    throw e;
  }
  if (isRoot) {
    const ctx = txContext!;
    txContext = null;
    flush(ctx);
  }
  return result;
}

function flush(ctx: TxContext): void {
  if (ctx.drafts.length === 0) return;
  if (!commitHandler) {
    console.warn('[GovernedStorage] 未注册提交处理器，本次自动记录被跳过');
    return;
  }
  txSeq += 1;
  const transactionId = `tx_${Date.now().toString(36)}_${txSeq}`;
  try {
    commitHandler(ctx.drafts, ctx.label, transactionId);
  } catch (e) {
    console.error('[GovernedStorage] 自动记录提交失败，业务数据已写入但未生成版本指针:', e);
  }
}

// -------------------------------------------------------------
// 写入
// -------------------------------------------------------------

export interface GovernedWriteResult {
  /** 业务数据是否成功落盘 */
  success: boolean;
  /** 是否触发了版本记录（false = 非受治键 / 已去重 / 无变化） */
  recorded: boolean;
  message: string;
}

/**
 * 受治写入：唯一的业务数据写入入口。
 *
 * - 集合型键：按实体逐条 diff，新增→create、删除→delete、修改→update（带补丁）
 * - 单例型键：整体 diff 为一条 update
 * - 任一实体在去重窗口内已被显式埋点覆盖 → 跳过，避免重复存证
 */
export function governedWrite<T>(key: string, next: T, options: { forceRecord?: boolean } = {}): GovernedWriteResult {
  const descriptor = GOVERNED_KEY_MAP[key];
  const before = baselineOf(key);

  // 本函数自带记录逻辑，故在本调用期间摘除持久化出口钩子，
  // 避免同一次变更被"显式路径 + 自动钩子"记录两遍。
  const writeOk = withStorageWriteHookSuspended(() => safeSetStorage(key, next));
  if (!writeOk) {
    console.error(`[GovernedStorage] 业务数据写入失败: ${key}（本地存储配额可能已满）`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('obsidian_governance_storage_failure', {
          detail: { storageKey: key, reason: 'write_failed', stage: 'business_write' }
        })
      );
    }
    return { success: false, recorded: false, message: `业务数据写入失败（配额可能已满）: ${key}` };
  }

  lastValueRegistry.set(key, next);

  if (!descriptor) {
    return { success: true, recorded: false, message: '非受治键，未生成版本记录' };
  }

  if (descriptor.recordMode === 'silent' && !options.forceRecord) {
    return { success: true, recorded: false, message: '该键为静默登记（遥测类），未生成版本记录' };
  }

  const drafts = buildDrafts(descriptor, key, before, next);
  const pending = drafts.filter(
    (d) => options.forceRecord || !wasExplicitlyRecorded(d.targetKey, d.entityId)
  );
  if (pending.length === 0) {
    return { success: true, recorded: false, message: '该变更已由显式埋点覆盖，网关自动去重' };
  }

  if (txContext) {
    txContext.drafts.push(...pending);
    return { success: true, recorded: true, message: `已并入事务「${txContext.label}」` };
  }

  flush({ label: '自动记录', drafts: pending });
  return { success: true, recorded: true, message: `已生成 ${pending.length} 条版本记录` };
}

// -------------------------------------------------------------
// P1-a：持久化出口钩子（覆盖率 100% 的实现路径）
// -------------------------------------------------------------

/**
 * 初始化播种判据。
 *
 * 为什么必须单独识别它：
 *   冷启动时首份种子数据（菜单 / 订单等）是从**空基线**写入的，其本质是
 *   「初始化播种」而非「业务变更」。若按变更逐条建指针，一次菜单播种会产生
 *   上百条 create 记录（实测 127 道菜 + 9 笔订单 → 137 条），并逐条进入
 *   反篡改规则评估 —— 于是**一次合法的初始化被误判为 sensitive 级价格篡改**，
 *   同时造成 O(n²) 写放大（每条记录都全量重写整个指针数组）。
 *
 * 判据收敛原则：
 *   以「基线为空」为**主判据**；数组大幅增长仅作批量导入兜底。
 *   这样既覆盖冷启动播种，又不会把真实的批量改价误纳入豁免。
 */
const SEED_GROWTH_FACTOR = 5;
const SEED_GROWTH_MIN_DELTA = 20;

function isInitialSeed(prev: unknown, next: unknown): boolean {
  if (next === undefined || next === null) return false;

  const prevIsEmpty =
    prev === undefined || prev === null || (Array.isArray(prev) && prev.length === 0);
  if (prevIsEmpty) return true;

  // 兜底：集合型键从少量条目跃增为大量条目（批量导入），同样不属于逐条业务变更
  if (Array.isArray(prev) && Array.isArray(next)) {
    return next.length > prev.length * SEED_GROWTH_FACTOR + SEED_GROWTH_MIN_DELTA;
  }

  return false;
}

/**
 * 与 governedWrite 的区别：此处业务数据**已经落盘**，只负责生成版本记录。
 * 由 safeStorage 的写入钩子调用，因此绝不能再次写入业务键（防循环）。
 */
export function governedRecordOnly(key: string, prev: unknown, next: unknown): void {
  const descriptor = GOVERNED_KEY_MAP[key];
  if (!descriptor) return; // 非受治键：不记录
  // 静默登记（遥测类，如行为探针）：可读可回滚，但不自动进版本链，避免冲垮保留配额
  if (descriptor.recordMode === 'silent') return;

  // FIX(P0 版本指针风暴): 初始化播种只落 **1 条聚合存证**，不再逐条生成 create。
  // 审计可追溯（存证含播种条数），但不会产生上百条误判记录与写放大。
  if (isInitialSeed(prev, next)) {
    const seededCount = Array.isArray(next) ? next.length : 1;
    if (seededCount > 0) {
      pendingHookDrafts.push({
        targetKey: key,
        module: descriptor.module,
        entityId: descriptor.singletonEntityId || key,
        entityName: descriptor.label,
        actionType: 'create',
        beforeData: null,
        afterData: { __seed__: true, seededCount, seededLabel: descriptor.label }
      });
      scheduleHookFlush();
    }
    return;
  }

  const drafts = buildDrafts(descriptor, key, prev, next);
  if (drafts.length === 0) return;
  pendingHookDrafts.push(...drafts);
  scheduleHookFlush();
}

let pendingHookDrafts: GovernanceMutationDraft[] = [];
let hookFlushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 延迟到下一个宏任务再提交：
 *  1. 同一事件循环内的多次写入被折叠为一次提交（近似 L2 事务聚合）；
 *  2. 让"业务写入 → 紧随其后的显式 recordDataMutation 埋点"能在去重窗口
 *     内先自我标记，由 markExplicitlyRecorded 消解重复存证。
 */
function scheduleHookFlush(): void {
  if (hookFlushTimer !== null) return;
  hookFlushTimer = setTimeout(() => {
    hookFlushTimer = null;
    flushHookDrafts();
  }, 0);
}

function flushHookDrafts(): void {
  if (pendingHookDrafts.length === 0) return;
  const drafts = pendingHookDrafts;
  pendingHookDrafts = [];
  const pending = drafts.filter((d) => !wasExplicitlyRecorded(d.targetKey, d.entityId));
  if (pending.length === 0) return;
  flush({ label: '持久化出口自动记录', drafts: pending });
}

/** 安装写入钩子；由 initGovernance() 在应用启动时调用（幂等） */
export function installStorageWriteHook(): void {
  registerStorageWriteHook((key, next, prev) => {
    governedRecordOnly(key, prev, next);
  });
}

/** 卸载钩子（便于测试与诊断） */
export function uninstallStorageWriteHook(): void {
  registerStorageWriteHook(null);
  pendingHookDrafts = [];
  if (hookFlushTimer !== null) {
    clearTimeout(hookFlushTimer);
    hookFlushTimer = null;
  }
}

function buildDrafts(
  descriptor: GovernedKeyDescriptor,
  key: string,
  before: unknown,
  after: unknown
): GovernanceMutationDraft[] {
  const { module, kind, label, singletonEntityId, idField } = descriptor;

  if (kind === 'singleton') {
    if (JSON.stringify(before ?? null) === JSON.stringify(after ?? null)) return [];
    return [
      {
        targetKey: key,
        module,
        entityId: singletonEntityId || key,
        entityName: label,
        actionType: 'update',
        beforeData: before ?? null,
        afterData: after ?? null
      }
    ];
  }

  const beforeList = Array.isArray(before) ? before : [];
  const afterList = Array.isArray(after) ? after : [];

  const beforeMap = new Map<string, any>();
  beforeList.forEach((item) => {
    const id = entityIdOf(item, idField);
    if (id) beforeMap.set(id, item);
  });
  const afterMap = new Map<string, any>();
  afterList.forEach((item) => {
    const id = entityIdOf(item, idField);
    if (id) afterMap.set(id, item);
  });

  const drafts: GovernanceMutationDraft[] = [];

  afterMap.forEach((item, id) => {
    const prev = beforeMap.get(id);
    if (!prev) {
      drafts.push({
        targetKey: key,
        module,
        entityId: id,
        entityName: entityNameOf(item, label, idField),
        actionType: 'create',
        beforeData: null,
        afterData: item
      });
      return;
    }
    if (JSON.stringify(prev) === JSON.stringify(item)) return;
    drafts.push({
      targetKey: key,
      module,
      entityId: id,
      entityName: entityNameOf(item, label, idField),
      actionType: 'update',
      beforeData: prev,
      afterData: item
    });
  });

  beforeMap.forEach((item, id) => {
    if (afterMap.has(id)) return;
    drafts.push({
      targetKey: key,
      module,
      entityId: id,
      entityName: entityNameOf(item, label, idField),
      actionType: 'delete',
      beforeData: item,
      afterData: null
    });
  });

  return drafts;
}

/** 供引擎生成补丁使用 */
export function buildPatchesForDraft(
  draft: GovernanceMutationDraft,
  labelOf: (field: string) => string
): ReturnType<typeof buildFieldPatches> {
  if (draft.actionType !== 'update') return [];
  return buildFieldPatches(
    draft.targetKey,
    draft.entityId,
    draft.beforeData,
    draft.afterData,
    labelOf
  );
}

// -------------------------------------------------------------
// 缓存重置
// -------------------------------------------------------------

/**
 * 清空网关的进程内缓存（上一版值快照 + 显式埋点去重窗口）。
 *
 * 使用场景：
 *   1. 测试隔离；
 *   2. 导入外部备份后需要重新建立"上一版"基线，否则 next diff 会拿旧值比对。
 */
export function resetGovernanceCaches(): void {
  lastValueRegistry.clear();
  recentExplicit.length = 0;
}

// -------------------------------------------------------------
// 覆盖率自述
// -------------------------------------------------------------

export interface CoverageReport {
  /** 适配表声明的全部键 */
  declaredKeys: string[];
  /** 网关已映射的键 */
  governedKeys: string[];
  /** 适配表中有、网关中无（会导致"有记录但回滚找不到存储"） */
  missingInGateway: string[];
  /** 模块覆盖率 */
  moduleCoverage: { total: number; instrumented: number; missing: VersionModuleType[] };
}

export function describeCoverage(): CoverageReport {
  const declaredKeys = listAllStorageKeys();
  const governedKeys = Object.keys(GOVERNED_KEY_MAP);
  const missingInGateway = declaredKeys.filter((k) => !governedKeys.includes(k));

  const instrumentedModules = new Set(Object.values(GOVERNED_KEY_MAP).map((d) => d.module));
  const missing = ALL_MODULES.filter((m) => !instrumentedModules.has(m));

  return {
    declaredKeys,
    governedKeys,
    missingInGateway,
    moduleCoverage: {
      total: ALL_MODULES.length,
      instrumented: ALL_MODULES.length - missing.length,
      missing
    }
  };
}

/** 便捷断言：开发期用于发现"模块有适配表但网关漏配键"的漂移 */
export function assertGatewayConsistency(): void {
  const report = describeCoverage();
  if (report.missingInGateway.length > 0) {
    console.warn(
      `[GovernedStorage] 以下键在回滚适配表中声明但未接入写入网关，将无法自动记录: ${report.missingInGateway.join(', ')}`
    );
  }
  const adapterKeys = Object.values(ENTITY_SCOPE_REGISTRY).flatMap((s) => s.keys.map((k) => k.key));
  const orphan = report.governedKeys.filter((k) => !adapterKeys.includes(k));
  if (orphan.length > 0) {
    console.warn(
      `[GovernedStorage] 以下键已接入写入网关但缺少回滚适配（有记录却回不了）: ${orphan.join(', ')}`
    );
  }
}
