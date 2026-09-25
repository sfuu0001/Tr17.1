/**
 * 回滚安全守卫 (Rollback Guard) —— P0-a / P1-b / P2-a
 *
 * 本模块是 versionPointerEngine 的唯一存储读写底座，承担三件事：
 *
 *  1. 存储适配表（P1-b）
 *     —— 把「模块 → 持久化键」的映射收敛为唯一事实来源。
 *        改造前 rollbackPointer 只实现了 6/15 个模块的分支，其余模块
 *        落入"通用兜底"直接当成功返回；rollbackSingleField 更只实现了 3 个模块，
 *        且对未支持模块静默返回 success 并写入虚假存证。
 *
 *  2. 一致性校验（P0-a / G4）
 *     —— 回滚前比对"当前实际值"与"指针对应版本之后应有的值"，不一致则拒绝。
 *
 *  3. 带校验的写入（P0-a / G5、P2-a）
 *     —— 所有写入都检查返回值，失败即中止；字段级写入走 JSON Pointer 补丁。
 */

import { FieldPatch, PatchOp, VersionModuleType } from '../types/versionTracking';
import { safeGetStorage, safeSetStorage } from './safeStorage';
import { getByPointer, setByPointer } from './patchEngine';

// -------------------------------------------------------------
// 存储适配表（唯一事实来源）
// -------------------------------------------------------------

export interface StoreKeyDescriptor {
  key: string;
  kind: 'collection' | 'singleton';
  /** 单例键的实体标识别名 —— 写入方沿用的自由命名（如 'delivery-config'） */
  aliases?: string[];
  /**
   * 集合内实体的主键字段名。
   * 缺省时按 id / code / key 三个候选字段匹配；领域模型用专属主键
   * （如 TableSession.sessionId、LinkRequest.requestId）时必须显式声明，
   * 否则会出现"数据写进去了但回滚找不到实体"的覆盖盲区。
   */
  idField?: string;
}

export interface ModuleScopeDescriptor {
  moduleLabel: string;
  keys: StoreKeyDescriptor[];
  /**
   * 由快照体系管理，不走实体级回滚：
   *   fallback —— 全局兜底本身没有独立数据实体
   *   system   —— 实体是快照/审计记录，业务语义上不应被"回滚"
   */
  snapshotManaged?: boolean;
}

const c = (key: string, idField?: string): StoreKeyDescriptor => ({ key, kind: 'collection', idField });
const s = (key: string, aliases: string[] = []): StoreKeyDescriptor => ({ key, kind: 'singleton', aliases });

/**
 * 15 个模块的完整覆盖。
 * 键名来自全仓 `obsidian_*` 持久化键清点结果（含历史遗留的多套同义键）。
 */
export const ENTITY_SCOPE_REGISTRY: Record<VersionModuleType, ModuleScopeDescriptor> = {
  dishes: {
    moduleLabel: '菜品与菜单管理',
    keys: [c('obsidian_truck_dishes')]
  },
  materials: {
    moduleLabel: '原料与库存资产',
    keys: [c('obsidian_truck_materials'), c('obsidian_inventory_stock')]
  },
  coupons: {
    moduleLabel: '优惠券与营销发券',
    keys: [c('obsidian_merchant_coupons')]
  },
  marketing: {
    moduleLabel: '阶梯满减与叠享规则',
    keys: [
      c('obsidian_activity_rules'),
      s('obsidian_stacking_settings', ['promo-stacking-config', 'stacking-config', 'marketing-config'])
    ]
  },
  tables: {
    moduleLabel: '堂食桌台与就餐流转',
    keys: [c('obsidian_merchant_tables'), c('obsidian_tables')]
  },
  orders: {
    moduleLabel: '全渠道订单数据',
    keys: [
      c('obsidian_truck_orders'),
      c('obsidian_orders'),
      c('obsidian_customer_orders'),
      c('obsidian_real_pay_orders'),
      c('obsidian_merchant_held_orders')
    ]
  },
  calling_queue: {
    moduleLabel: '前台排队与叫号中心',
    keys: [c('obsidian_queue_tickets'), c('obsidian_waiting_queue'), c('obsidian_calling_history')]
  },
  kds: {
    moduleLabel: '后厨制作与划菜工单',
    keys: [c('obsidian_merchant_tickets')]
  },
  staff: {
    moduleLabel: '员工花名册与RBAC',
    keys: [c('obsidian_staff_members'), c('obsidian_staff'), c('obsidian_truck_users')]
  },
  payments: {
    moduleLabel: '支付渠道与结算',
    keys: [c('obsidian_merchant_payment_channels'), c('obsidian_payment_channels')]
  },
  craft_standards: {
    moduleLabel: '主厨SOP与工艺配方',
    keys: [c('obsidian_craft_standards')]
  },
  table_session: {
    moduleLabel: '堂食桌台会话与联动授权',
    keys: [
      c('obsidian_table_sessions', 'sessionId'),
      c('obsidian_table_link_requests', 'requestId'),
      c('obsidian_table_session_probes', 'probeId')
    ]
  },
  delivery: {
    moduleLabel: '外卖配送与运费配置',
    keys: [s('obsidian_delivery_settings', ['delivery-config', 'delivery_settings'])]
  },
  stall_gps: {
    moduleLabel: '餐车GPS与营业时段',
    keys: [
      s('obsidian_truck_info', ['truck-info', 'stall-gps-config', 'gps-config']),
      s('obsidian_truck_location_configs', ['truck-location-configs']),
      s('obsidian_truck_expand_config', ['truck-expand-config'])
    ]
  },
  fallback: {
    moduleLabel: '全系统数据安全兜底',
    keys: [],
    snapshotManaged: true
  },
  system: {
    moduleLabel: '系统应急与全局配置',
    keys: [
      s('obsidian_business_status', ['business-status', 'system-config']),
      // FIX(治理一致性): 该键已在写入网关 GOVERNED_KEY_MAP 登记，但此前遗漏于本适配表，
      // 导致 assertGatewayConsistency 报告「已接入写入网关但缺少回滚适配」——
      // 即版本指针可以生成，却没有任何回滚路径，属真实的功能缺口。
      c('obsidian_truck_business_statuses', 'truckId')
    ],
    snapshotManaged: true
  }
};

export const ALL_MODULES = Object.keys(ENTITY_SCOPE_REGISTRY) as VersionModuleType[];

/** 视为噪声、不参与一致性判定的字段 */
export const IGNORED_COMPARE_KEYS = ['updatedAt', 'createdAt', 'lastModified', 'pointerId', 'revision'];

const ID_CANDIDATE_FIELDS = ['id', 'code', 'key'];

// -------------------------------------------------------------
// 读取
// -------------------------------------------------------------

export interface EntityReadResult {
  supported: boolean;
  found: boolean;
  entity: Record<string, any> | null;
  storageKey?: string;
  kind?: 'collection' | 'singleton';
}

function matchEntityId(item: any, entityId: string, idField?: string): boolean {
  if (!item || typeof item !== 'object') return false;
  if (idField) return item[idField] === entityId;
  return ID_CANDIDATE_FIELDS.some((f) => item[f] === entityId);
}

/**
 * 读取模块内的目标实体。
 * 变更：由"单键"升级为"多键"——历史遗留的同义键（如 obsidian_orders /
 * obsidian_customer_orders）都会被检索，消除"数据写在 A 键、回滚去 B 键找"的问题。
 */
export function readEntity(module: VersionModuleType, entityId: string): EntityReadResult {
  const scope = ENTITY_SCOPE_REGISTRY[module];
  if (!scope || scope.keys.length === 0) {
    return { supported: false, found: false, entity: null };
  }

  const singletons: Array<{ desc: StoreKeyDescriptor; value: Record<string, any> | null }> = [];

  for (const desc of scope.keys) {
    if (desc.kind === 'collection') {
      const list = safeGetStorage<any[]>(desc.key, []);
      if (!Array.isArray(list)) continue;
      const entity = list.find((item) => matchEntityId(item, entityId, desc.idField));
      if (entity) {
        return { supported: true, found: true, entity, storageKey: desc.key, kind: 'collection' };
      }
    } else {
      const obj = safeGetStorage<Record<string, any> | null>(desc.key, null);
      const usable = !!obj && typeof obj === 'object' && !Array.isArray(obj);
      singletons.push({ desc, value: usable ? obj : null });
      const aliasHit = desc.aliases?.includes(entityId) || desc.key === entityId;
      if (aliasHit) {
        return { supported: true, found: usable, entity: usable ? obj : null, storageKey: desc.key, kind: 'singleton' };
      }
    }
  }

  if (singletons.length > 0) {
    // 单例模块：优先取第一个已初始化的配置键，其次取第一个键（容忍未初始化）
    const preferred = singletons.find((x) => x.value) ?? singletons[0];
    return {
      supported: true,
      found: !!preferred.value,
      entity: preferred.value,
      storageKey: preferred.desc.key,
      kind: 'singleton'
    };
  }

  // 集合型模块：实体不存在（可能已被删除）
  const firstCollection = scope.keys.find((k) => k.kind === 'collection');
  return {
    supported: true,
    found: false,
    entity: null,
    storageKey: firstCollection?.key,
    kind: 'collection'
  };
}

/** 返回该模块实际承载实体的键（用于写入时定位） */
export function resolveWriteKey(module: VersionModuleType, entityId: string): string | undefined {
  return readEntity(module, entityId).storageKey ?? ENTITY_SCOPE_REGISTRY[module]?.keys[0]?.key;
}

// -------------------------------------------------------------
// 一致性校验 (G4)
// -------------------------------------------------------------

export interface FieldConflict {
  field: string;
  fieldLabel: string;
  expected: unknown;
  actual: unknown;
}

export function detectFieldConflicts(
  expectedAfter: Record<string, any> | null,
  actual: Record<string, any> | null,
  labelOf?: (field: string) => string
): FieldConflict[] {
  const label = (f: string) => (labelOf ? labelOf(f) : f);

  if (expectedAfter === null) {
    if (actual !== null) {
      return [
        {
          field: '__entity__',
          fieldLabel: '实体存在性',
          expected: '已被删除',
          actual: '当前仍存在（可能被重新创建或修改）'
        }
      ];
    }
    return [];
  }

  if (actual === null) {
    return [
      {
        field: '__entity__',
        fieldLabel: '实体存在性',
        expected: '存在',
        actual: '当前已不存在（可能已被删除）'
      }
    ];
  }

  const conflicts: FieldConflict[] = [];
  Object.keys(expectedAfter).forEach((key) => {
    if (IGNORED_COMPARE_KEYS.includes(key)) return;
    const exp = expectedAfter[key];
    const act = actual[key];
    if (JSON.stringify(exp) !== JSON.stringify(act)) {
      conflicts.push({ field: key, fieldLabel: label(key), expected: exp, actual: act });
    }
  });
  return conflicts;
}

export function summarizeConflicts(
  conflicts: FieldConflict[],
  display: (v: unknown) => string = (v) => JSON.stringify(v) ?? 'undefined'
): string {
  return conflicts
    .slice(0, 3)
    .map((c) => `${c.fieldLabel}: 期望 ${display(c.expected)} / 实际 ${display(c.actual)}`)
    .join('；');
}

// -------------------------------------------------------------
// 写入 (G3 + G5 + P2-a)
// -------------------------------------------------------------

export interface WriteOutcome {
  success: boolean;
  message: string;
  /** 实际被写入的持久化键 */
  storageKey?: string;
}

/** 写入集合/单例的容器，并真实校验返回值 */
function persistContainer(
  desc: StoreKeyDescriptor,
  next: unknown
): WriteOutcome {
  if (!safeSetStorage(desc.key, next)) {
    return {
      success: false,
      message: `写入 ${desc.key} 失败（本地存储配额可能已满），数据未发生任何变更`
    };
  }
  return { success: true, message: 'ok', storageKey: desc.key };
}

function findKeyDescriptor(
  module: VersionModuleType,
  storageKey: string | undefined
): StoreKeyDescriptor | undefined {
  const scope = ENTITY_SCOPE_REGISTRY[module];
  if (!scope) return undefined;
  if (storageKey) {
    const hit = scope.keys.find((k) => k.key === storageKey);
    if (hit) return hit;
  }
  return scope.keys[0];
}

/**
 * 字段级补丁写入（P2-a）：按 JSON Pointer 只修改目标路径。
 * 未注册适配的模块一律拒绝执行 —— 绝不产生"未改数据却成功"的路径。
 */
export function applyEntityPatch(
  module: VersionModuleType,
  entityId: string,
  path: string,
  op: PatchOp,
  value: unknown,
  storageKeyHint?: string
): WriteOutcome {
  const scope = ENTITY_SCOPE_REGISTRY[module];
  if (!scope || scope.keys.length === 0) {
    return {
      success: false,
      message: `模块「${module}」尚未注册可写适配，已拒绝执行以免产生虚假修复存证`
    };
  }
  if (scope.snapshotManaged) {
    return {
      success: false,
      message: `模块「${module}」由快照体系管理，不支持实体级回滚，请使用全量快照还原`
    };
  }

  const current = readEntity(module, entityId);
  const storageKey = storageKeyHint || current.storageKey;
  const desc = findKeyDescriptor(module, storageKey);
  if (!desc) {
    return { success: false, message: `模块「${module}」缺少可写键定义` };
  }

  if (desc.kind === 'singleton') {
    const obj = safeGetStorage<Record<string, any> | null>(desc.key, null);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return { success: false, message: `未读取到配置对象 ${desc.key}，无法执行字段级修复` };
    }
    const next = setByPointer(obj, path, value, op);
    return persistContainer(desc, next);
  }

  const list = safeGetStorage<any[]>(desc.key, []);
  if (!Array.isArray(list)) {
    return { success: false, message: `${desc.key} 不是合法数组，无法执行字段级修复` };
  }

  let hit = false;
  const next = list.map((item) => {
    if (!matchEntityId(item, entityId, desc.idField)) return item;
    hit = true;
    return setByPointer(item, path, value, op);
  });

  if (!hit) {
    return { success: false, message: `未在 ${desc.key} 中找到实体 ${entityId}，数据未发生任何变更` };
  }
  return persistContainer(desc, next);
}

/** 批量应用补丁（按实体根处理）；任一失败则回滚已应用的补丁 */
export function applyEntityPatches(
  module: VersionModuleType,
  entityId: string,
  patches: FieldPatch[]
): { success: boolean; message: string; applied: number; failedPatch?: FieldPatch } {
  const appliedList: FieldPatch[] = [];
  for (const patch of patches) {
    const outcome = applyEntityPatch(
      module,
      entityId,
      patch.path,
      patch.op,
      patch.value,
      patch.targetKey
    );
    if (!outcome.success) {
      // 补偿：把已应用的补丁反向写回
      for (const done of [...appliedList].reverse()) {
        applyEntityPatch(
          module,
          entityId,
          done.path,
          done.op === 'add' ? 'remove' : done.op === 'remove' ? 'add' : 'replace',
          done.expectedCurrent,
          done.targetKey
        );
      }
      return { success: false, message: outcome.message, applied: appliedList.length, failedPatch: patch };
    }
    appliedList.push(patch);
  }
  return { success: true, message: 'ok', applied: appliedList.length };
}

/**
 * 实体级还原：把实体整体恢复至 beforeSnapshot。
 *
 * - beforeSnapshot 为 null 且实体当前存在 → 删除（回滚"新建"动作）
 * - beforeSnapshot 非 null 且实体不存在 → 重新插入（回滚"删除"动作）
 * - 均存在 → 浅合并（保留实体中未被本次变更触碰的字段）
 */
export function applyEntityRestore(
  module: VersionModuleType,
  entityId: string,
  beforeSnapshot: Record<string, any> | null
): WriteOutcome {
  const scope = ENTITY_SCOPE_REGISTRY[module];
  if (!scope || scope.keys.length === 0) {
    return {
      success: false,
      message: `模块「${module}」尚未注册可写适配，已拒绝执行以免产生虚假修复存证`
    };
  }
  if (scope.snapshotManaged) {
    return {
      success: false,
      message: `模块「${module}」由快照体系管理，不支持实体级回滚，请使用全量快照还原`
    };
  }

  const current = readEntity(module, entityId);
  const storageKey = current.storageKey;
  const desc = findKeyDescriptor(module, storageKey);
  if (!desc) return { success: false, message: `模块「${module}」缺少可写键定义` };

  if (desc.kind === 'singleton') {
    if (beforeSnapshot === null) {
      return { success: false, message: `单例配置 ${desc.key} 不支持还原至空值` };
    }
    return persistContainer(desc, beforeSnapshot);
  }

  const list = safeGetStorage<any[]>(desc.key, []);
  if (!Array.isArray(list)) {
    return { success: false, message: `${desc.key} 不是合法数组，无法执行实体还原` };
  }

  const exists = list.some((item) => matchEntityId(item, entityId, desc.idField));
  let next: any[];

  if (beforeSnapshot === null) {
    if (!exists) {
      return { success: false, message: `实体 ${entityId} 当前已不存在，无需还原` };
    }
    next = list.filter((item) => !matchEntityId(item, entityId, desc.idField));
  } else if (!exists) {
    next = [beforeSnapshot, ...list];
  } else {
    next = list.map((item) =>
      matchEntityId(item, entityId, desc.idField) ? { ...item, ...beforeSnapshot } : item
    );
  }

  return persistContainer(desc, next);
}

// -------------------------------------------------------------
// 能力自述
// -------------------------------------------------------------

export function isModuleRollbackSupported(module: VersionModuleType): boolean {
  const scope = ENTITY_SCOPE_REGISTRY[module];
  if (!scope) return false;
  return scope.keys.length > 0 && !scope.snapshotManaged;
}

export function getUnsupportedModules(modules: VersionModuleType[]): VersionModuleType[] {
  return modules.filter((m) => !isModuleRollbackSupported(m));
}

export function explainUnsupported(module: VersionModuleType): string {
  const scope = ENTITY_SCOPE_REGISTRY[module];
  if (!scope) {
    return `模块「${module}」尚未接入存储适配表，暂不支持自动回滚，可使用全量快照还原。`;
  }
  if (scope.snapshotManaged) {
    return `模块「${module}」（${scope.moduleLabel}）由快照体系管理，其记录不指向可回滚的业务实体，请使用全量快照还原。`;
  }
  return `模块「${module}」暂不支持自动回滚，可使用全量快照还原。`;
}

/** 覆盖率自述：供治理健康面板展示真实边界 */
export function describeCoverage(): {
  total: number;
  supported: VersionModuleType[];
  unsupported: VersionModuleType[];
} {
  const total = ALL_MODULES.length;
  const supported = ALL_MODULES.filter((m) => isModuleRollbackSupported(m));
  return { total, supported, unsupported: getUnsupportedModules(ALL_MODULES) };
}

/** 全量键清单（供 P1-a 写入网关覆盖检查） */
export function listAllStorageKeys(): string[] {
  return ALL_MODULES.flatMap((m) => ENTITY_SCOPE_REGISTRY[m].keys.map((k) => k.key));
}
