import {
  VersionPointer,
  MilestoneSnapshot,
  MerchantOperator,
  FieldDiff,
  FieldPatch,
  VersionModuleType,
  VersionActionType,
  RuleHit,
  ChainProof,
  ChainVerifyReport,
  GovernanceHealthReport,
  GovernanceAction,
  RetentionTier
} from '../types/versionTracking';
import { safeGetStorage, safeSetStorage } from './safeStorage';
import {
  ENTITY_SCOPE_REGISTRY,
  FieldConflict,
  applyEntityPatches,
  applyEntityRestore,
  describeCoverage as describeRollbackCoverage,
  detectFieldConflicts,
  explainUnsupported,
  isModuleRollbackSupported,
  readEntity,
  summarizeConflicts
} from './rollbackGuard';
import { buildFieldPatches, detectPatchConflicts, summarizePatches } from './patchEngine';
import {
  GENESIS_HASH,
  anchorChainTail,
  computeChainProof,
  isCryptoAvailable,
  verifyChain as verifyChainCore
} from './integrityChain';
import {
  evaluateRules,
  getQuarantineEntries,
  highestAction,
  highestSeverity,
  quarantineEntity,
  releaseQuarantine,
  summarizeHits
} from './governanceRuleEngine';
import {
  POINTER_RETENTION_CAP,
  applyRetentionPolicy,
  initPersistentStore,
  persistentStore,
  retentionTierOf
} from './persistentStore';
import {
  GovernanceMutationDraft,
  assertGatewayConsistency,
  buildPatchesForDraft,
  describeCoverage as describeGatewayCoverage,
  installStorageWriteHook,
  markExplicitlyRecorded,
  registerGovernanceCommitHandler
} from './governedStorage';

/** 回滚失败的结构化原因，供调用方与 UI 区分处置策略（不再返回含糊的通用错误） */
export type RollbackFailureReason =
  | 'NOT_FOUND'
  | 'NOT_REVERTIBLE'
  | 'CONFLICT'
  | 'UNSUPPORTED'
  | 'FIELD_NOT_FOUND'
  | 'APPLY_FAILED';

// Storage Keys
const STORAGE_KEY_POINTERS = 'obsidian_version_pointers';
const STORAGE_KEY_SNAPSHOTS = 'obsidian_milestone_snapshots';
const STORAGE_KEY_ACTIVE_OPERATOR = 'obsidian_current_merchant_operator';

function safeDispatchEvent(name: string, detail?: unknown): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch {}
  }
}

// -------------------------------------------------------------
// 治理告警窗口去重（仅影响 console 输出）
// -------------------------------------------------------------

/**
 * 为什么需要去重：
 *   规则引擎对**每一条**版本指针独立判定，而一次批量写入会产生大量指针
 *   （典型场景：冷启动播种一次性写入 127 道菜 → 127 条指针 → 127 次同样的
 *   「10 分钟内价格字段被修改 N 次」告警）。逐条 console.warn 会让单条信息
 *   重复上百次，把控制台里真正有用的错误彻底淹没 —— 而这恰恰是本项目最
 *   看重的可运维性。
 *
 * 边界（务必保持）：
 *   本机制**只决定日志是否打印**。ruleHits 的计算、riskLevel / governanceAction /
 *   isSuspectedMistake / mistakeReason 的落盘一律照旧，审计链不受任何影响。
 *   被抑制的只是"同一条已知告警的重复副本"，而不是告警本身。
 */
const RULE_WARNING_WINDOW_MS = 10_000;

interface RuleWarningWindow {
  windowStart: number;
  /** 本窗口内累计命中次数（含已打印的那次） */
  total: number;
  /** 本窗口内已打印次数 */
  emitted: number;
}

const ruleWarningWindows = new Map<string, RuleWarningWindow>();

/**
 * 判定某条治理告警在当前时间窗口内是否应打印。
 * @returns emit 是否打印；suppressedInPrevWindow 上一个窗口被抑制的条数（用于在恢复打印时交代）
 */
function shouldEmitRuleWarning(
  signature: string,
  now: number
): { emit: boolean; suppressedInPrevWindow: number } {
  const entry = ruleWarningWindows.get(signature);

  if (!entry) {
    // 防御性清理：「模块 × 规则组合」理论上有限，仅防极端情况下无界增长
    if (ruleWarningWindows.size > 200) ruleWarningWindows.clear();
    ruleWarningWindows.set(signature, { windowStart: now, total: 1, emitted: 1 });
    return { emit: true, suppressedInPrevWindow: 0 };
  }

  if (now - entry.windowStart >= RULE_WARNING_WINDOW_MS) {
    // 窗口到期：本次恢复打印，并交代上一窗口内被抑制的条数，避免"静默丢日志"
    const suppressedInPrevWindow = entry.total - entry.emitted;
    ruleWarningWindows.set(signature, { windowStart: now, total: 1, emitted: 1 });
    return { emit: true, suppressedInPrevWindow };
  }

  entry.total += 1;
  return { emit: false, suppressedInPrevWindow: 0 };
}

/** 构造告警签名：同一模块 + 同一组规则 视为同类，避免不同规则互相掩盖 */
function ruleWarningSignature(module: string, hits: { ruleId: string }[]): string {
  const rules = Array.from(new Set(hits.map((h) => h.ruleId))).sort().join('+');
  return `${module}:${rules}`;
}

// Default Merchant Operators (Staff accounts)
export const DEFAULT_MERCHANT_OPERATORS: MerchantOperator[] = [
  {
    id: 'op-01',
    username: 'zhanglei_mgr',
    name: '张磊',
    role: 'manager',
    roleName: '店长 / 运营总管',
    avatar: '👨‍💼',
    deviceInfo: 'iPad Pro 12.9 (餐车总控台 POS-01)',
    ip: '192.168.1.102',
    shiftBadge: '早班总控'
  },
  {
    id: 'op-02',
    username: 'chef_wang',
    name: '王师傅',
    role: 'grill_chef',
    roleName: '炭烤档口主厨 / 研发',
    avatar: '👨‍🍳',
    deviceInfo: 'KDS 触屏工业端 (KDS-KITCHEN-01)',
    ip: '192.168.1.108',
    shiftBadge: '后厨主理'
  },
  {
    id: 'op-03',
    username: 'lixiaomeng_cashier',
    name: '李晓萌',
    role: 'cashier',
    roleName: '前台领班 / 收银主管',
    avatar: '👩‍💼',
    deviceInfo: '移动收银手持机 (POS-MOBILE-02)',
    ip: '192.168.1.115',
    shiftBadge: '中班领班'
  },
  {
    id: 'op-04',
    username: 'chenhao_bar',
    name: '陈浩',
    role: 'barista',
    roleName: '特调水吧师 / 辅料管理',
    avatar: '🧑‍🍳',
    deviceInfo: '水吧操作平板 (BAR-PAD-01)',
    ip: '192.168.1.120',
    shiftBadge: '全天水吧'
  },
  {
    id: 'op-05',
    username: 'zhaoqiang_dispatch',
    name: '赵强',
    role: 'rider',
    roleName: '外卖专送领队 / 配送调配',
    avatar: '🛵',
    deviceInfo: '骑手调度控制台 (DISPATCH-01)',
    ip: '192.168.1.133',
    shiftBadge: '外卖专班'
  },
  {
    id: 'op-sys',
    username: 'system_daemon',
    name: '系统自动化服务',
    role: 'system',
    roleName: '智能风控与云端守护进程',
    avatar: '🤖',
    deviceInfo: 'CloudBase Serverless Node.js Worker',
    ip: '10.0.4.18',
    shiftBadge: '24H 常驻'
  }
];

// Human-friendly field labels mapping
const FIELD_LABEL_MAP: Record<string, string> = {
  // Dishes
  name: '菜品/原料名称',
  enName: '英文名称',
  price: '销售价格 (¥)',
  originalPrice: '划线原价 (¥)',
  deliveryDiscount: '外卖立减金额 (¥)',
  dineInDiscount: '堂食立减金额 (¥)',
  available: '上架/售罄状态',
  unavailableReason: '沽清/停售原因',
  category: '品类所属分类',
  subCategoryName: '二级子分类',
  spicinessLevel: '默认辣度',
  flavor: '推荐风味',
  prepTime: '预估出餐时长',
  description: '菜品简介与卖点',
  craftStandardNote: '烹饪工艺要点',
  isPopular: '热销爆款推荐',
  isChefSpecial: '主厨甄选标识',

  // Materials & Stock
  currentStock: '当前在库库存量',
  safetyStock: '安全库存警戒线',
  reorderSuggestion: '建议补货量',
  purchasePrice: '采购参考单价 (¥)',
  storageLocation: '库位与储存温区',
  supplier: '合作供应商名称',
  supplierPhone: '供货商联系电话',
  status: '库存/运营状态',
  remark: '调整原因/备注',

  // Coupons & Marketing
  title: '优惠券/活动名称',
  code: '兑换券码',
  discountValue: '优惠面额/折扣率',
  minSpend: '使用门槛金额 (¥)',
  allowStackWithActivity: '允许叠加全场满减',
  allowStackWithVIP: '允许叠加VIP会员折扣',
  isExclusive: '是否为排他独享券',
  totalQuantity: '总发行量上限',
  expireDate: '到期截止日期',
  scopeType: '适用商品范围',

  // Tables & GPS
  tableCode: '桌台编号',
  qrCode: '扫码点餐码',
  qrEnabled: '桌码点餐开关',
  stallLocation: '流动餐车站位地址',
  deliveryRadius: '外送服务半径 (km)',
  businessHours: '营业时段配置',

  // Staff & RBAC
  phone: '联系手机号',
  roleTitle: '岗位职称',
  permissions: '系统操作权限清单',

  // Delivery settings
  minDeliveryAmount: '起送最低消费门槛 (¥)',
  deliveryFee: '基础配送运费 (¥)',
  freeDeliveryThreshold: '免外送费包邮门槛 (¥)'
};

// Module names mapping
export const MODULE_NAME_MAP: Record<VersionModuleType, string> = {
  orders: '全渠道订单数据',
  calling_queue: '前台排队与叫号中心',
  tables: '堂食桌台与就餐流转',
  kds: '后厨制作与划菜工单',
  fallback: '全系统数据安全兜底',
  dishes: '菜品与菜单管理',
  materials: '原料与库存资产',
  coupons: '优惠券与营销发券',
  marketing: '阶梯满减与叠享规则',
  staff: '员工花名册与RBAC',
  delivery: '外卖配送与运费配置',
  payments: '支付渠道与结算',
  stall_gps: '餐车GPS与营业时段',
  craft_standards: '主厨SOP与工艺配方',
  table_session: '堂食桌台会话与联动授权',
  system: '系统应急与全局配置'
};

// Action names mapping
export const ACTION_NAME_MAP: Record<VersionActionType, string> = {
  create: '新增录入',
  update: '字段修改',
  delete: '删除/注销',
  void_ticket: '作废号牌/工单',
  void_order: '作废堂食订单',
  discount_override: '修改折扣/优惠',
  table_transfer: '转台/换桌',
  force_clean: '强制完成保洁',
  batch_adjust: '批量调价/盘点',
  rollback: '版本回滚修复',
  snapshot_restore: '全量快照还原',
  snapshot_create: '创建安全快照'
};

// Simple pseudo-random hash generator for data integrity signatures
function generateHash(dataStr: string): string {
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256_${hex}${Date.now().toString(16).slice(-6)}`;
}

/** 取 JSON Pointer 的末段 token（用于把补丁路径映射回字段名） */
function pointerTail(path: string): string {
  const seg = path.split('/').pop() || '';
  return seg.replace(/~1/g, '/').replace(/~0/g, '~');
}

// Generate human-readable format for diff values
function formatDiffValue(val: any): string {
  if (val === undefined || val === null) return '无 / 未配置';
  if (typeof val === 'boolean') return val ? '是 (开启)' : '否 (关闭)';
  if (typeof val === 'number') return `${val}`;
  if (Array.isArray(val)) return `[${val.join(', ')}]`;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

// Compute deep structural diff between before and after objects
export function computeFieldDiffs(beforeObj: any, afterObj: any): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  if (!beforeObj && !afterObj) return diffs;

  const allKeys = new Set([
    ...Object.keys(beforeObj || {}),
    ...Object.keys(afterObj || {})
  ]);

  // Keys to ignore from noisy visual diff
  const ignoredKeys = new Set([
    'updatedAt',
    'createdAt',
    'id',
    'pointerId',
    'lastModified'
  ]);

  allKeys.forEach((key) => {
    if (ignoredKeys.has(key)) return;

    const beforeVal = beforeObj ? beforeObj[key] : undefined;
    const afterVal = afterObj ? afterObj[key] : undefined;

    const beforeStr = JSON.stringify(beforeVal);
    const afterStr = JSON.stringify(afterVal);

    if (beforeStr !== afterStr) {
      let diffType: 'added' | 'modified' | 'removed' = 'modified';
      if (beforeVal === undefined && afterVal !== undefined) {
        diffType = 'added';
      } else if (beforeVal !== undefined && afterVal === undefined) {
        diffType = 'removed';
      }

      const fieldLabel = FIELD_LABEL_MAP[key] || key;

      diffs.push({
        field: key,
        fieldLabel,
        diffType,
        oldValue: beforeVal,
        newValue: afterVal,
        oldValueDisplay: formatDiffValue(beforeVal),
        newValueDisplay: formatDiffValue(afterVal)
      });
    }
  });

  return diffs;
}

// Initial Mock Version Pointers (Rich timeline of historical operations)
const RAW_INITIAL_VERSION_POINTERS: VersionPointer[] = [
  {
    pointerId: 'rev_call_void_9918',
    versionTag: 'v2.6.53',
    timestamp: '2026-09-07 14:32:10',
    formattedTime: '14:32 (28分钟前)',
    operator: DEFAULT_MERCHANT_OPERATORS[2], // 李晓萌 (收银)
    module: 'calling_queue',
    moduleName: '前台排队与叫号中心',
    actionType: 'void_ticket',
    actionName: '作废号牌/工单',
    entityId: 'q-A08',
    entityName: '等位号牌 #A08 (小桌 2人)',
    summary: '收银员李晓萌 将排队号牌 #A08 设置为【临时作废(暂挂)】，原因：过号2次呼叫未应答',
    fieldDiffs: [
      {
        field: 'status',
        fieldLabel: '排队号状态',
        diffType: 'modified',
        oldValue: 'waiting',
        newValue: 'temp_void',
        oldValueDisplay: '等待叫号中',
        newValueDisplay: '临时作废 (暂挂保留)'
      },
      {
        field: 'voidReason',
        fieldLabel: '作废原因说明',
        diffType: 'added',
        oldValue: null,
        newValue: '过号2次呼叫未应答',
        oldValueDisplay: '无',
        newValueDisplay: '过号2次呼叫未应答'
      }
    ],
    beforeSnapshot: {
      id: 'q-A08',
      queueNo: 'A08',
      guestName: '孙女士',
      partySize: 2,
      status: 'waiting',
      waitTimeMin: 22
    },
    afterSnapshot: {
      id: 'q-A08',
      queueNo: 'A08',
      guestName: '孙女士',
      partySize: 2,
      status: 'temp_void',
      voidReason: '过号2次呼叫未应答',
      waitTimeMin: 22
    },
    isRevertible: true,
    integrityHash: 'sha256_call9918_a1b2c3',
    status: 'active',
    riskLevel: 'sensitive',
    isSuspectedMistake: true,
    mistakeReason: '顾客已到前台窗口，员工可能误判为弃号，建议快速一键恢复！'
  },
  {
    pointerId: 'rev_order_discount_8801',
    versionTag: 'v2.6.52',
    timestamp: '2026-09-07 13:45:20',
    formattedTime: '13:45 (1小时前)',
    operator: DEFAULT_MERCHANT_OPERATORS[2], // 李晓萌 (收银)
    module: 'orders',
    moduleName: '全渠道订单数据',
    actionType: 'discount_override',
    actionName: '修改折扣/优惠',
    entityId: 'ord-UR-DIN-9821',
    entityName: '堂食订单 #UR-DIN-9821 (A1桌)',
    summary: '收银员李晓萌 执行结账改价，折扣率从 1.0 (原价) 误改为 0.5 (5折特惠)，实付降为 ¥94.00',
    fieldDiffs: [
      {
        field: 'discount',
        fieldLabel: '结账折扣率',
        diffType: 'modified',
        oldValue: 1.0,
        newValue: 0.5,
        oldValueDisplay: '无折扣 (100%)',
        newValueDisplay: '5折特权优惠 (50%)'
      },
      {
        field: 'totalAmount',
        fieldLabel: '应付实结金额 (¥)',
        diffType: 'modified',
        oldValue: 188.0,
        newValue: 94.0,
        oldValueDisplay: '¥188.00',
        newValueDisplay: '¥94.00'
      }
    ],
    beforeSnapshot: {
      orderNo: 'UR-DIN-9821',
      tableCode: 'A1',
      totalAmount: 188.0,
      discount: 1.0,
      status: 'dining'
    },
    afterSnapshot: {
      orderNo: 'UR-DIN-9821',
      tableCode: 'A1',
      totalAmount: 94.0,
      discount: 0.5,
      status: 'dining'
    },
    isRevertible: true,
    integrityHash: 'sha256_ord8801_f5e4d3',
    status: 'active',
    riskLevel: 'high_risk',
    isSuspectedMistake: true,
    mistakeReason: '折扣幅度异常过大 (>30%)，且缺少店长授权工单凭证，疑似误操作！'
  },
  {
    pointerId: 'rev_table_transfer_3312',
    versionTag: 'v2.6.51',
    timestamp: '2026-09-07 12:50:05',
    formattedTime: '12:50 (2小时前)',
    operator: DEFAULT_MERCHANT_OPERATORS[0], // 张磊 (店长)
    module: 'tables',
    moduleName: '堂食桌台与就餐流转',
    actionType: 'table_transfer',
    actionName: '转台/换桌',
    entityId: 'tbl-A2',
    entityName: '桌台 A2 换至 B1 (餐车内卡座)',
    summary: '店长张磊 将 A2桌 (4人) 顾客整体转台至 B1大卡座，关联订单自动合并流转',
    fieldDiffs: [
      {
        field: 'tableCode',
        fieldLabel: '绑定台位编号',
        diffType: 'modified',
        oldValue: 'A2',
        newValue: 'B1',
        oldValueDisplay: 'A2 (外摆小桌)',
        newValueDisplay: 'B1 (餐车内卡座)'
      }
    ],
    beforeSnapshot: {
      sourceTable: 'A2',
      targetTable: 'B1',
      status: 'dining'
    },
    afterSnapshot: {
      sourceTable: 'A2',
      targetTable: 'B1',
      status: 'dining'
    },
    isRevertible: true,
    integrityHash: 'sha256_tbl3312_c9b8a7',
    status: 'active',
    riskLevel: 'normal'
  },
  {
    pointerId: 'rev_kds_item_scratch_1102',
    versionTag: 'v2.6.50',
    timestamp: '2026-09-07 12:20:15',
    formattedTime: '12:20 (2.5小时前)',
    operator: DEFAULT_MERCHANT_OPERATORS[1], // 王师傅 (后厨)
    module: 'kds',
    moduleName: '后厨制作与划菜工单',
    actionType: 'update',
    actionName: '字段修改',
    entityId: 'kds-K103',
    entityName: '后厨工单 #K103 (安格斯汉堡)',
    summary: '后厨王师傅 完成「双层安格斯厚牛堡」出餐制作划菜，用时 7分32秒',
    fieldDiffs: [
      {
        field: 'isCompleted',
        fieldLabel: '菜品制作划菜状态',
        diffType: 'modified',
        oldValue: false,
        newValue: true,
        oldValueDisplay: '烹制制作中',
        newValueDisplay: '已划菜出餐'
      }
    ],
    beforeSnapshot: {
      ticketNo: 'K103',
      dishName: '双层安格斯厚牛堡',
      isCompleted: false
    },
    afterSnapshot: {
      ticketNo: 'K103',
      dishName: '双层安格斯厚牛堡',
      isCompleted: true
    },
    isRevertible: true,
    integrityHash: 'sha256_kds1102_e2d1c0',
    status: 'active',
    riskLevel: 'normal'
  },
  {
    pointerId: 'rev_9a4f2101_1725189200',
    versionTag: 'v2.6.48',
    timestamp: '2026-09-01 11:45:12',
    formattedTime: '今日 11:45',
    operator: DEFAULT_MERCHANT_OPERATORS[0], // 张磊
    module: 'dishes',
    moduleName: '菜品与菜单管理',
    actionType: 'update',
    actionName: '字段修改',
    entityId: 'dish-1',
    entityName: '炭烤安格斯牛肉串 (3串/份)',
    summary: '店长张磊 将菜品价格从 ¥38.00 调低至 ¥32.00，新增外卖立减 ¥3.00 并调整风味标签',
    fieldDiffs: [
      {
        field: 'price',
        fieldLabel: '销售价格 (¥)',
        diffType: 'modified',
        oldValue: 38,
        newValue: 32,
        oldValueDisplay: '¥38.00',
        newValueDisplay: '¥32.00'
      },
      {
        field: 'deliveryDiscount',
        fieldLabel: '外卖立减金额 (¥)',
        diffType: 'added',
        oldValue: 0,
        newValue: 3,
        oldValueDisplay: '¥0.00',
        newValueDisplay: '¥3.00'
      },
      {
        field: 'flavor',
        fieldLabel: '推荐风味',
        diffType: 'modified',
        oldValue: '经典椒盐',
        newValue: '秘制黑椒酱香 (主厨推荐)',
        oldValueDisplay: '经典椒盐',
        newValueDisplay: '秘制黑椒酱香 (主厨推荐)'
      }
    ],
    beforeSnapshot: {
      id: 'dish-1',
      name: '炭烤安格斯牛肉串 (3串/份)',
      price: 38,
      deliveryDiscount: 0,
      flavor: '经典椒盐',
      available: true
    },
    afterSnapshot: {
      id: 'dish-1',
      name: '炭烤安格斯牛肉串 (3串/份)',
      price: 32,
      deliveryDiscount: 3,
      flavor: '秘制黑椒酱香 (主厨推荐)',
      available: true
    },
    isRevertible: true,
    integrityHash: 'sha256_88e40129bc7891',
    status: 'active'
  },
  {
    pointerId: 'rev_8b3c9902_1725184500',
    versionTag: 'v2.6.47',
    timestamp: '2026-09-01 10:28:45',
    formattedTime: '今日 10:28',
    operator: DEFAULT_MERCHANT_OPERATORS[1], // 王师傅
    module: 'materials',
    moduleName: '原料与库存资产',
    actionType: 'update',
    actionName: '库存校准与安全线调优',
    entityId: 'mat-001',
    entityName: '安格斯谷饲牛上脑肉 (原切)',
    summary: '炭烤主厨王师傅 进行晨间盘点实测调账：实盘校准库存 +12.5kg，上调安全库存警戒线至 30.0kg',
    fieldDiffs: [
      {
        field: 'currentStock',
        fieldLabel: '当前在库库存量',
        diffType: 'modified',
        oldValue: 35.5,
        newValue: 48.0,
        oldValueDisplay: '35.5 kg',
        newValueDisplay: '48.0 kg'
      },
      {
        field: 'safetyStock',
        fieldLabel: '安全库存警戒线',
        diffType: 'modified',
        oldValue: 20.0,
        newValue: 30.0,
        oldValueDisplay: '20.0 kg',
        newValueDisplay: '30.0 kg'
      },
      {
        field: 'remark',
        fieldLabel: '调整原因/备注',
        diffType: 'modified',
        oldValue: '常规采购入库',
        newValue: '2026-09-01: 晨间开餐盘点差异校准 (+12.5kg)',
        oldValueDisplay: '常规采购入库',
        newValueDisplay: '2026-09-01: 晨间开餐盘点差异校准 (+12.5kg)'
      }
    ],
    beforeSnapshot: {
      id: 'mat-001',
      name: '安格斯谷饲牛上脑肉 (原切)',
      currentStock: 35.5,
      safetyStock: 20.0,
      status: 'normal'
    },
    afterSnapshot: {
      id: 'mat-001',
      name: '安格斯谷饲牛上脑肉 (原切)',
      currentStock: 48.0,
      safetyStock: 30.0,
      status: 'normal'
    },
    isRevertible: true,
    integrityHash: 'sha256_77c10931af6420',
    status: 'active'
  },
  {
    pointerId: 'rev_7d1e8803_1725178100',
    versionTag: 'v2.6.46',
    timestamp: '2026-09-01 08:35:20',
    formattedTime: '今日 08:35',
    operator: DEFAULT_MERCHANT_OPERATORS[2], // 李晓萌
    module: 'coupons',
    moduleName: '优惠券与营销发券',
    actionType: 'create',
    actionName: '新增录入',
    entityId: 'cpn-lunch-10',
    entityName: '午市炙烤专享立减券 (¥10)',
    summary: '前台领班李晓萌 新上线营销券【午市炙烤专享立减券】：满 ¥50 立减 ¥10，支持全场满减与VIP叠享',
    fieldDiffs: [
      {
        field: 'title',
        fieldLabel: '优惠券/活动名称',
        diffType: 'added',
        oldValue: undefined,
        newValue: '午市炙烤专享满减券',
        oldValueDisplay: '无',
        newValueDisplay: '午市炙烤专享满减券'
      },
      {
        field: 'discountValue',
        fieldLabel: '优惠面额/折扣率',
        diffType: 'added',
        oldValue: undefined,
        newValue: 10,
        oldValueDisplay: '无',
        newValueDisplay: '¥10.00'
      },
      {
        field: 'minSpend',
        fieldLabel: '使用门槛金额 (¥)',
        diffType: 'added',
        oldValue: undefined,
        newValue: 50,
        oldValueDisplay: '无',
        newValueDisplay: '满 ¥50.00 可用'
      },
      {
        field: 'allowStackWithActivity',
        fieldLabel: '允许叠加全场满减',
        diffType: 'added',
        oldValue: undefined,
        newValue: true,
        oldValueDisplay: '无',
        newValueDisplay: '是 (开启)'
      }
    ],
    beforeSnapshot: null,
    afterSnapshot: {
      id: 'cpn-lunch-10',
      title: '午市炙烤专享满减券',
      code: 'UR-LUNCH10',
      discountValue: 10,
      minSpend: 50,
      allowStackWithActivity: true,
      status: 'active'
    },
    isRevertible: true,
    integrityHash: 'sha256_55a90184ce1174',
    status: 'active'
  },
  {
    pointerId: 'rev_6a0f7704_1725154800',
    versionTag: 'v2.6.45',
    timestamp: '2026-08-31 22:15:00',
    formattedTime: '昨日 22:15',
    operator: DEFAULT_MERCHANT_OPERATORS[0], // 张磊
    module: 'marketing',
    moduleName: '阶梯满减与叠享规则',
    actionType: 'update',
    actionName: '阶梯满减策略调整',
    entityId: 'promo-stacking-config',
    entityName: '全场阶梯满减与防刷风控规则',
    summary: '店长张磊 更新满减阶梯规则：新增【满120减18】与【满200减35】，开启支付渠道立减叠加',
    fieldDiffs: [
      {
        field: 'activityRules',
        fieldLabel: '阶梯满减档位',
        diffType: 'modified',
        oldValue: '满50减5, 满80减10',
        newValue: '满50减5, 满80减10, 满120减18, 满200减35',
        oldValueDisplay: '2个档位',
        newValueDisplay: '4个阶梯档位'
      },
      {
        field: 'stackCouponWithPayment',
        fieldLabel: '券与支付渠道立减叠加',
        diffType: 'modified',
        oldValue: false,
        newValue: true,
        oldValueDisplay: '否 (互斥)',
        newValueDisplay: '是 (允许叠加)'
      }
    ],
    beforeSnapshot: {
      activityRules: [
        { minSpend: 50, discountAmount: 5 },
        { minSpend: 80, discountAmount: 10 }
      ],
      stackCouponWithPayment: false
    },
    afterSnapshot: {
      activityRules: [
        { minSpend: 50, discountAmount: 5 },
        { minSpend: 80, discountAmount: 10 },
        { minSpend: 120, discountAmount: 18 },
        { minSpend: 200, discountAmount: 35 }
      ],
      stackCouponWithPayment: true
    },
    isRevertible: true,
    integrityHash: 'sha256_33b81092de9932',
    status: 'active'
  },
  {
    pointerId: 'rev_5e9b6605_1725142100',
    versionTag: 'v2.6.44',
    timestamp: '2026-08-31 18:40:15',
    formattedTime: '昨日 18:40',
    operator: DEFAULT_MERCHANT_OPERATORS[4], // 赵强
    module: 'delivery',
    moduleName: '外卖配送与运费配置',
    actionType: 'update',
    actionName: '字段修改',
    entityId: 'delivery-config',
    entityName: '餐车半径外卖配送与运费策略',
    summary: '外卖主管赵强 将起送最低消费从 ¥25.00 下调为 ¥20.00，免外送费门槛设为 ¥68.00',
    fieldDiffs: [
      {
        field: 'minDeliveryAmount',
        fieldLabel: '起送最低消费门槛 (¥)',
        diffType: 'modified',
        oldValue: 25,
        newValue: 20,
        oldValueDisplay: '¥25.00',
        newValueDisplay: '¥20.00'
      },
      {
        field: 'freeDeliveryThreshold',
        fieldLabel: '免外送费包邮门槛 (¥)',
        diffType: 'modified',
        oldValue: 88,
        newValue: 68,
        oldValueDisplay: '¥88.00',
        newValueDisplay: '¥68.00'
      }
    ],
    beforeSnapshot: {
      minDeliveryAmount: 25,
      freeDeliveryThreshold: 88,
      deliveryFee: 5
    },
    afterSnapshot: {
      minDeliveryAmount: 20,
      freeDeliveryThreshold: 68,
      deliveryFee: 5
    },
    isRevertible: true,
    integrityHash: 'sha256_22f70183ee4489',
    status: 'active'
  }
];

/**
 * 演示数据消毒（P0-b）。
 *
 * 改造前 isSuspectedMistake / riskLevel / mistakeReason 只存在于这批 mock 常量中，
 * 而 recordDataMutation 从未给它们赋过值 —— 也就是说"疑似误操作报警 N 处"
 * "风控拦截原因：xxx" 全部是演示数据在冒充真实风控结果，真实操作永远不触发。
 * 现在风险标记一律由 governanceRuleEngine 实时判定，演示数据不再携带任何风险标记。
 */
const INITIAL_VERSION_POINTERS: VersionPointer[] = RAW_INITIAL_VERSION_POINTERS.map((p) => ({
  ...p,
  isSuspectedMistake: undefined,
  riskLevel: undefined,
  mistakeReason: undefined,
  ruleHits: [],
  governanceAction: 'none' as const,
  patches: [],
  chainProof: null,
  integrityHash: '(legacy-demo)'
}));

// Initial Milestone Snapshots
const RAW_INITIAL_SNAPSHOTS: MilestoneSnapshot[] = [
  {
    snapshotId: 'snap_20260901_0800',
    title: '2026-09-01 早市开餐前基准快照 (Milestone)',
    description: '完成晨间采购入库及菜单价格核对后的稳定运营快照，供全天应急比对与回滚。',
    createdAt: '2026-09-01 08:00:00',
    createdBy: DEFAULT_MERCHANT_OPERATORS[0],
    tag: 'pre_rush',
    tagLabel: '开餐前基线',
    dataSummary: {
      dishesCount: 24,
      materialsCount: 16,
      couponsCount: 8,
      staffCount: 5,
      tablesCount: 12
    },
    payload: {},
    integrityHash: 'sha256_99bba102938475'
  },
  {
    snapshotId: 'snap_20260831_2330',
    title: '2026-08-31 晚市打烊日结安全存档',
    description: '全天营业结束日结结算快照，包含完整库存结存及营销核销明细。',
    createdAt: '2026-08-31 23:30:12',
    createdBy: DEFAULT_MERCHANT_OPERATORS[0],
    tag: 'post_rush',
    tagLabel: '打烊日结存档',
    dataSummary: {
      dishesCount: 24,
      materialsCount: 16,
      couponsCount: 7,
      staffCount: 5,
      tablesCount: 12
    },
    payload: {},
    integrityHash: 'sha256_88ffa901827364'
  }
];

/**
 * 演示快照消毒：剥离伪造的 integrityHash，改为 chainProof: null（待真实补算）。
 */
const INITIAL_SNAPSHOTS: MilestoneSnapshot[] = RAW_INITIAL_SNAPSHOTS.map((s) => ({
  ...s,
  chainProof: null,
  integrityHash: '(legacy-demo)'
}));

// -------------------------------------------------------------
// Engine API Class
// -------------------------------------------------------------

class VersionPointerEngine {
  // Get active merchant operator
  public getActiveOperator(): MerchantOperator {
    return safeGetStorage<MerchantOperator>(
      STORAGE_KEY_ACTIVE_OPERATOR,
      DEFAULT_MERCHANT_OPERATORS[0]
    );
  }

  // Set active merchant operator
  public setActiveOperator(operator: MerchantOperator): void {
    safeSetStorage(STORAGE_KEY_ACTIVE_OPERATOR, operator);
    safeDispatchEvent('obsidian_operator_changed', operator);
  }

  /**
   * 读取版本指针。
   *
   * 若有**尚未落盘的内存副本**（批模式或合并写入进行中），优先返回它 ——
   * 否则批内后续的 recordDataMutation 会读到磁盘上的旧数组，
   * 导致 updatedPointers = [newPointer, ...旧数组] 覆盖而非追加，反而丢记录。
   */
  public getAllPointers(): VersionPointer[] {
    if (this.pendingPointers) return this.pendingPointers;
    return this.readPointers();
  }

  /** 仅从持久化层读取（不含内存缓冲），供落盘与批开始时取基线 */
  private readPointers(): VersionPointer[] {
    return persistentStore.getSync<VersionPointer[]>(
      STORAGE_KEY_POINTERS,
      INITIAL_VERSION_POINTERS
    );
  }

  // -----------------------------------------------------------
  // 批量 / 合并落盘（消除 O(n²) 全量重写）
  // -----------------------------------------------------------

  /**
   * 尚未落盘的最新指针数组。为 null 表示内存与磁盘一致。
   *
   * 为什么需要它：
   *   原实现中每一处 savePointers 都会把**整个指针数组**重新序列化写入
   *   localStorage。一次批量记录 N 条指针 → N 次全量写盘，即 O(n²)。
   *   实测冷启动播种场景写盘 276 次（137 条记录 × 2 处落盘）。
   */
  private pendingPointers: VersionPointer[] | null = null;

  /** 批模式嵌套深度（0 表示不在批内） */
  private batchDepth = 0;

  /** 合并写入的定时器（同一事件循环内的多次请求折叠为一次） */
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  /** 开启批模式：批内 savePointers 只更新内存，由 endBatchPersist 统一落盘 */
  public beginBatchPersist(): void {
    if (this.batchDepth === 0 && this.pendingPointers === null) {
      this.pendingPointers = this.readPointers();
    }
    this.batchDepth += 1;
  }

  /** 结束批模式并落盘一次。**必须放在 finally 中**，否则批内异常会造成内存有、磁盘无 */
  public endBatchPersist(): void {
    if (this.batchDepth === 0) return;
    this.batchDepth -= 1;
    if (this.batchDepth > 0) return;
    const pending = this.pendingPointers;
    if (pending) this.persistNow(pending);
  }

  /**
   * 延迟合并落盘：供 **派生字段回写** 使用（典型：backfillChainProof 异步补算存证）。
   *
   * 与 savePointers 的区别：不立即写盘，而是把请求折叠到下一个宏任务。
   * 一批异步补算（如 137 条）因此只产生 1 次全量写盘。
   *
   * 数据安全性：指针本体已由 recordDataMutation 路径落盘，此处仅延后派生的
   * chainProof 哈希；即便页面在延迟窗口内关闭，下次启动的
   * `backfillAllChainProofs()` 自愈会为重算缺失存证 —— 不会造成永久丢失。
   */
  public savePointersDeferred(pointers: VersionPointer[]): void {
    this.pendingPointers = pointers;
    if (this.batchDepth > 0) return;
    if (this.persistTimer !== null) return;

    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      const pending = this.pendingPointers;
      if (pending) this.persistNow(pending);
    }, 0);
    (this.persistTimer as unknown as { unref?: () => void })?.unref?.();
  }

  /**
   * 持久化版本指针。
   *
   * 与旧实现的关键差异（P2-b）：
   *   旧：硬上限 60 条；超过 25 条即"脱水" beforeSnapshot / afterSnapshot ——
   *       被脱水的历史版本永久失去回滚能力，而 UI 仍显示"一键恢复此版本"。
   *   新：分层保留（permanent / long / rolling），仅在超出该层配额时才动最旧记录，
   *       且归档时保留补丁（P2-a 之后回滚只需补丁，不再需要完整快照）；
   *       写路径升级为 IndexedDB 主存储 + localStorage 同步缓存。
   *
   * 批模式 / 合并模式由 beginBatchPersist / savePointersDeferred 控制，
   * 本方法只负责"真正落盘"这一件事。
   */
  public savePointers(pointers: VersionPointer[]): void {
    this.pendingPointers = pointers;
    // 批内：不落盘，等 endBatchPersist 统一写入
    if (this.batchDepth > 0) return;
    this.persistNow(pointers);
  }

  /** 真正执行一次持久化（含保留策略、失败上报与事件派发） */
  private persistNow(pointers: VersionPointer[]): void {
    this.pendingPointers = null;

    const plan = applyRetentionPolicy(pointers, POINTER_RETENTION_CAP);
    const pruned = plan.kept;

    // G5 修复：持久化失败必须可见 —— 原实现忽略返回值，配额超限时会静默丢弃版本历史
    const persisted = persistentStore.setSync(STORAGE_KEY_POINTERS, pruned);
    if (!persisted) {
      console.error(
        `[VersionPointerEngine] 版本指针持久化失败：本地存储与 IndexedDB 均不可用，${pruned.length} 条记录仅存于内存。`
      );
      safeDispatchEvent('obsidian_governance_storage_failure', {
        storageKey: STORAGE_KEY_POINTERS,
        attemptedCount: pruned.length,
        reason: 'write_failed'
      });
    }

    if (plan.droppedCount > 0 || plan.archivedCount > 0) {
      console.info(
        `[VersionPointerEngine] 保留策略生效：淘汰 ${plan.droppedCount} 条，归档快照 ${plan.archivedCount} 条（补丁保留，字段级回滚能力不受影响）。`
      );
    }

    safeDispatchEvent('obsidian_version_pointers_updated', pruned);
  }

  /** 释放被规则引擎隔离的实体，恢复其可写性 */
  public releaseQuarantinedEntity(entityKey: string): boolean {
    const operator = this.getActiveOperator();
    const ok = releaseQuarantine(entityKey, operator.name);
    if (ok) {
      this.savePointers(this.getAllPointers());
    }
    return ok;
  }

  /**
   * 标记原指针为已回滚，并补齐审计链字段。
   * 原实现只写 status: 'reverted'，遗漏了类型中已声明的 revertedAt / revertedBy，
   * 导致无法直接查询"这条记录何时、被谁回滚"。
   */
  private markPointerReverted(pointerId: string, operator: MerchantOperator): void {
    const updated = this.getAllPointers().map((p) =>
      p.pointerId === pointerId
        ? {
            ...p,
            status: 'reverted' as const,
            revertedAt: new Date().toISOString(),
            revertedBy: operator.name
          }
        : p
    );
    this.savePointers(updated);
  }

  // Record a new data mutation pointer
  public recordDataMutation<T>(params: {
    module: VersionModuleType;
    entityId: string;
    entityName: string;
    actionType: VersionActionType;
    beforeData: T | null;
    afterData: T | null;
    customSummary?: string;
    operatorOverride?: MerchantOperator;
    isRollback?: boolean;
    rollbackSourcePointerId?: string;
    /** P1-a：同一次业务事务的标识与标签 */
    transactionId?: string;
    transactionLabel?: string;
    /** P2-b：覆写分层保留层级（高频探针可降级为 rolling，避免挤占纠纷相关的 long 层配额） */
    tierOverride?: RetentionTier;
    /**
     * 记录来源：
     *   explicit（默认）—— 业务代码的人工埋点，需要声明"这次变更已有人工覆盖"，
     *                       以便写入网关对同一次变更去重
     *   gateway        —— 写入网关自动产生的记录。**绝不能**参与去重声明，
     *                       否则会形成自抑制闭环：网关记录 A 时标记去重，
     *                       紧接着的同实体变更 B 被误判为重复而静默丢弃。
     */
    origin?: 'explicit' | 'gateway';
  }): VersionPointer {
    const operator = params.operatorOverride || this.getActiveOperator();
    const fieldDiffs = computeFieldDiffs(params.beforeData, params.afterData);

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const formattedTime = `今日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const pointerId = `rev_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const existingPointers = this.getAllPointers();
    const versionNumber = existingPointers.length + 1;
    const versionTag = `v2.6.${versionNumber + 48}`;

    // Auto generate descriptive summary if not provided
    let summary = params.customSummary;
    if (!summary) {
      const actionName = ACTION_NAME_MAP[params.actionType];
      if (params.actionType === 'create') {
        summary = `${operator.name} (${operator.roleName}) 新增创建【${params.entityName}】`;
      } else if (params.actionType === 'delete') {
        summary = `${operator.name} (${operator.roleName}) 下架删除【${params.entityName}】`;
      } else if (params.actionType === 'rollback') {
        summary = `⚠️ ${operator.name} (${operator.roleName}) 执行了数据版本回滚修复，恢复【${params.entityName}】至历史状态`;
      } else {
        const diffSummary = fieldDiffs
          .slice(0, 3)
          .map((d) => `${d.fieldLabel}: ${d.oldValueDisplay} ➔ ${d.newValueDisplay}`)
          .join('；');
        summary = `${operator.name} (${operator.roleName}) 执行【${actionName}】：${diffSummary || '更新对象参数'}`;
      }
    }

    // ---------------- P2-a：把变更表达为可执行的字段级补丁 ----------------
    // 补丁使回滚不再依赖完整 beforeSnapshot，从而让"归档快照"不再等于"失去回滚能力"。
    // 注意：create / delete 的语义是"实体级增删"，无法用字段补丁表达，
    // 因此这类记录不生成补丁，由 applyEntityRestore 负责。
    const isEntityLifecycle = params.actionType === 'create' || params.actionType === 'delete';
    const patches = isEntityLifecycle
      ? []
      : buildFieldPatches(
          this.resolvePatchesKey(params.module, params.entityId),
          params.entityId,
          params.beforeData,
          params.afterData,
          (field) => FIELD_LABEL_MAP[field] || field
        );

    const newPointer: VersionPointer = {
      pointerId,
      versionTag,
      timestamp,
      formattedTime,
      operator,
      module: params.module,
      moduleName: MODULE_NAME_MAP[params.module] || params.module,
      actionType: params.actionType,
      actionName: ACTION_NAME_MAP[params.actionType] || params.actionType,
      entityId: params.entityId,
      entityName: params.entityName,
      summary,
      fieldDiffs,
      patches,
      beforeSnapshot: params.beforeData,
      afterSnapshot: params.afterData,
      isRollback: params.isRollback,
      rollbackSourcePointerId: params.rollbackSourcePointerId,
      isRevertible: true,
      // P0-c：不再生成伪造哈希；真实 SHA-256 由 backfillChainProof 异步补算。
      integrityHash: '(pending-sha256)',
      chainProof: null,
      tier: params.tierOverride ?? retentionTierOf(params.module),
      transactionId: params.transactionId,
      transactionLabel: params.transactionLabel,
      status: 'active'
    };

    // ---------------- P0-b：规则引擎实时判定 ----------------
    // 修复动作本身不再参与风险判定，避免"修复触发新告警"的自激循环。
    const isRepairAction =
      !!params.isRollback ||
      params.actionType === 'rollback' ||
      params.actionType === 'snapshot_restore';

    // 初始化播种（冷启动种子数据）同样不参与反篡改计数：
    // 它是一次性的初始化写入，不具备"短时间内反复变更价格"的攻击特征，
    // 参与计数只会把合法初始化误判为敏感级篡改。
    // 判据依赖写入网关在聚合存证上打的 __seed__ 标记（见 governedStorage.ts），
    // 因此**不会豁免任何真实的业务变更记录**。
    const isBulkSeed =
      (params.afterData as unknown as { __seed__?: boolean } | null)?.__seed__ === true;

    const ruleHits: RuleHit[] = isRepairAction || isBulkSeed
      ? []
      : evaluateRules(newPointer, [newPointer, ...existingPointers]);

    newPointer.ruleHits = ruleHits;
    newPointer.governanceAction = highestAction(ruleHits) as GovernanceAction;
    newPointer.riskLevel = highestSeverity(ruleHits);
    newPointer.isSuspectedMistake = ruleHits.some((h) => h.severity === 'high_risk');
    newPointer.mistakeReason = ruleHits.length > 0 ? summarizeHits(ruleHits) : undefined;

    if (ruleHits.length > 0) {
      const verdict = shouldEmitRuleWarning(
        ruleWarningSignature(newPointer.module, ruleHits),
        Date.now()
      );
      if (verdict.emit) {
        const carry =
          verdict.suppressedInPrevWindow > 0
            ? `（上一统计窗口内同类告警已抑制 ${verdict.suppressedInPrevWindow} 条重复副本，审计链记录不受影响）`
            : '';
        console.warn(
          `[VersionPointerEngine] 治理规则命中 ${ruleHits.length} 项（${newPointer.riskLevel}）：${newPointer.mistakeReason}${carry}`
        );
      }
    }

    // quarantine 处置：登记隔离以阻止后续写入；不修改已经落盘的业务数据
    if (newPointer.governanceAction === 'quarantine') {
      const entry = quarantineEntity(newPointer, ruleHits);
      if (entry) {
        console.warn(
          `[VersionPointerEngine] 实体已进入隔离区待复核：${entry.entityKey}（触发规则 ${entry.ruleIds.join('/')}）`
        );
      }
    }

    const updatedPointers = [newPointer, ...existingPointers];
    this.savePointers(updatedPointers);

    // P1-a：告知写入网关"这次变更已有显式埋点覆盖"，避免与自动记录重复存证。
    // 关键：只有人工埋点才声明去重；网关自动记录声明去重会导致自抑制闭环。
    if (params.origin !== 'gateway') {
      markExplicitlyRecorded(
        patches.length > 0
          ? Array.from(new Set(patches.map((p) => p.targetKey)))
          : [this.resolvePatchesKey(params.module, params.entityId)],
        params.entityId
      );
    }

    // P0-c：异步补算真实链哈希（crypto.subtle 为异步 API，不能阻塞同步写入路径）
    this.enqueueChainBackfill(newPointer.pointerId);

    return newPointer;
  }

  /** 解析补丁与回滚应作用的持久化键 */
  private resolvePatchesKey(module: VersionModuleType, entityId: string): string {
    const current = readEntity(module, entityId);
    if (current.storageKey) return current.storageKey;
    const scope = ENTITY_SCOPE_REGISTRY[module];
    return scope?.keys[0]?.key ?? `obsidian_${module}`;
  }

  // ---------------- P0-c：存证链 ----------------

  private chainQueue: Promise<unknown> = Promise.resolve();

  /**
   * 串行化的存证补算队列。
   * 必须串行：链哈希依赖"前驱记录的 chainHash"，并发补算会让多条记录
   * 取到同一个前驱，导致链结构错误。
   */
  private enqueueChainBackfill(pointerId: string): void {
    this.chainQueue = this.chainQueue
      .then(() => this.backfillChainProof(pointerId))
      .catch((e) => {
        console.error('[VersionPointerEngine] 存证补算失败:', e);
      });
  }

  /** 为单条记录补算真实 SHA-256 链哈希 */
  public async backfillChainProof(pointerId: string): Promise<ChainProof | null> {
    if (!isCryptoAvailable()) {
      console.warn(
        '[VersionPointerEngine] 当前环境不支持 crypto.subtle（需 HTTPS 或 localhost），无法生成密码学存证；该记录保持 pending 状态。'
      );
      return null;
    }

    const ordered = [...this.getAllPointers()].reverse();
    const idx = ordered.findIndex((p) => p.pointerId === pointerId);
    if (idx < 0) return null;

    const prevChainHash = idx === 0 ? GENESIS_HASH : ordered[idx - 1].chainProof?.chainHash ?? GENESIS_HASH;
    const proof = await computeChainProof(prevChainHash, ordered[idx]);

    const latest = this.getAllPointers();
    const updated = latest.map((p) =>
      p.pointerId === pointerId
        ? { ...p, chainProof: proof, integrityHash: proof.chainHash }
        : p
    );
    // 合并落盘：批量补算时（如冷启动自愈）把多次全量重写折叠为一次
    this.savePointersDeferred(updated);
    safeDispatchEvent('obsidian_chain_proof_updated', { pointerId, proof });
    return proof;
  }

  /** 为全部缺失存证的记录补算（用于启动自愈与 schema 迁移后） */
  public async backfillAllChainProofs(): Promise<number> {
    if (!isCryptoAvailable()) return 0;
    const ordered = [...this.getAllPointers()].reverse();
    let fixed = 0;
    let prev = GENESIS_HASH;

    const rebuilt: VersionPointer[] = [];
    for (const node of ordered) {
      let proof: ChainProof | null = node.chainProof ?? null;
      if (!proof) {
        proof = await computeChainProof(prev, node);
        fixed += 1;
      }
      rebuilt.push({ ...node, chainProof: proof, integrityHash: proof.chainHash });
      prev = proof.chainHash;
    }

    if (fixed > 0) {
      this.savePointers(rebuilt.reverse());
      console.info(`[VersionPointerEngine] 已为 ${fixed} 条历史记录补算真实 SHA-256 存证。`);
    }
    return fixed;
  }

  /** 真实校验整条存证链；UI 必须使用本方法的返回值，禁止硬编码"校验通过" */
  public async verifyChain(fullContentCheck = true): Promise<ChainVerifyReport> {
    return verifyChainCore(this.getAllPointers(), { fullContentCheck });
  }

  /** 把链尾哈希锚定到服务端（前端可信模型的必要补充） */
  public async anchorChain(
    uploader?: Parameters<typeof anchorChainTail>[1]
  ): Promise<ReturnType<typeof anchorChainTail>> {
    return anchorChainTail(this.getAllPointers(), uploader);
  }

  // Rollback to beforeSnapshot of a specific revision pointer
  /**
   * 整实体回滚。
   *
   * 本次修复（P0-a）：
   *  - G2/G3：未注册存储适配的模块显式失败（reason: 'UNSUPPORTED'），
   *           不再落入"通用兜底把 restoredSuccessfully 置为 true"的假成功路径；
   *  - G4：回滚前比对当前实际状态与 afterSnapshot，存在冲突时默认拒绝，
   *         避免静默覆盖该指针之后产生的合法变更；
   *  - G5：任何一次持久化写入失败都立即中止，不标记 reverted、不写入修复存证。
   */
  public rollbackPointer(
    pointerId: string,
    options?: { force?: boolean }
  ): {
    success: boolean;
    message: string;
    newPointer?: VersionPointer;
    reason?: RollbackFailureReason;
    conflicts?: FieldConflict[];
  } {
    const pointers = this.getAllPointers();
    const targetPointer = pointers.find((p) => p.pointerId === pointerId);

    if (!targetPointer) {
      return {
        success: false,
        reason: 'NOT_FOUND',
        message: `未找到指针ID ${pointerId} 对应的修订版本`
      };
    }

    if (!targetPointer.isRevertible) {
      return {
        success: false,
        reason: 'NOT_REVERTIBLE',
        message: '该版本已被标记为不可逆操作或已被覆盖'
      };
    }

    // G3：能力判定必须早于一致性校验 —— 对不支持回滚的模块做冲突比对毫无意义，
    // 且会让用户收到"字段冲突"这种误导性原因，掩盖真正的问题（该模块回不了）。
    if (!isModuleRollbackSupported(targetPointer.module) && targetPointer.module !== 'marketing') {
      return {
        success: false,
        reason: 'UNSUPPORTED',
        message: explainUnsupported(targetPointer.module)
      };
    }

    const operator = this.getActiveOperator();
    const { module, entityId, entityName, beforeSnapshot, afterSnapshot } = targetPointer;

    // G4：基线一致性校验。
    //  - marketing 为复合模块（快照形状 {activityRules, stackCouponWithPayment} 与
    //    单一持久化键的形状不一致），无法做整实体基线比对，故排除在外；
    //  - 快照已归档（contentArchived）的记录不能用 afterSnapshot 比对 —— 它已被
    //    剥离为摘要对象，比对会产生 100% 的假冲突。此时改用补丁自带的
    //    expectedCurrent 作为基线（补丁在归档时被完整保留）。
    if (!options?.force && module !== 'marketing') {
      const current = readEntity(module, entityId);
      const patchesOfTarget = targetPointer.patches || [];
      const usePatchBaseline = !!targetPointer.contentArchived && patchesOfTarget.length > 0;

      if (usePatchBaseline) {
        if (current.supported && current.entity) {
          const raw = detectPatchConflicts(patchesOfTarget, () => current.entity);
          if (raw.length > 0) {
            const conflicts: FieldConflict[] = raw.map((c) => ({
              field: c.path,
              fieldLabel: c.fieldLabel,
              expected: c.expected,
              actual: c.actual
            }));
            return {
              success: false,
              reason: 'CONFLICT',
              conflicts,
              message:
                `【回滚已中止】实体【${entityName}】在版本 ${targetPointer.versionTag} 之后已被再次修改，` +
                `直接回滚会静默覆盖这些变更。冲突字段：${summarizeConflicts(conflicts, (v) => formatDiffValue(v))}。` +
                `请先复核最新版本；确认要丢弃后续变更时，可使用强制回滚。`
            };
          }
        }
      } else if (current.supported) {
        const conflicts = detectFieldConflicts(
          afterSnapshot,
          current.entity,
          (f) => FIELD_LABEL_MAP[f] || f
        );
        if (conflicts.length > 0) {
          return {
            success: false,
            reason: 'CONFLICT',
            conflicts,
            message:
              `【回滚已中止】实体【${entityName}】在版本 ${targetPointer.versionTag} 之后已被再次修改，` +
              `直接回滚会静默覆盖这些变更。冲突字段：${summarizeConflicts(conflicts)}。` +
              `请先复核最新版本；确认要丢弃后续变更时，可使用强制回滚。`
          };
        }
      }
    }

    // G5：统一写入通道，任何一次写入失败立即中止流程
    const writeState: { error: string | null; wroteAny: boolean } = {
      error: null,
      wroteAny: false
    };
    const guardWrite = (key: string, value: unknown): void => {
      if (safeSetStorage(key, value)) {
        writeState.wroteAny = true;
      } else {
        writeState.error = `写入 ${key} 失败（本地存储配额可能已满），已中止回滚且未产生任何变更存证`;
      }
    };

    try {
      if (module === 'marketing') {
        // marketing 是唯一的复合模块：一个模块对应两个持久化键
        // （obsidian_activity_rules 集合 + obsidian_stacking_settings 单例），
        // 其快照形状为 { activityRules, stackCouponWithPayment }，无法用统一适配表还原。
        if (beforeSnapshot) {
          if (beforeSnapshot.activityRules) {
            guardWrite('obsidian_activity_rules', beforeSnapshot.activityRules);
          }
          if (beforeSnapshot.stackCouponWithPayment !== undefined) {
            // FIX(审计P0): 原写入不存在的键 'obsidian_promotion_stacking'(全仓0读取)。
            // 实际配置键为 'obsidian_stacking_settings' (promotionEngine.ts getStoredStackingSettings),
            // 快照布尔字段 stackCouponWithPayment 对应叠享配置 allowPaymentStackAll。
            const current = safeGetStorage<any>('obsidian_stacking_settings', {});
            const restored = { ...current, allowPaymentStackAll: !!beforeSnapshot.stackCouponWithPayment };
            guardWrite('obsidian_stacking_settings', restored);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('PROMOTION_SETTINGS_CHANGED', { detail: restored }));
            }
          }
        }
      } else if (isModuleRollbackSupported(module)) {
        // P2-a：优先走字段级补丁 —— 即使保留策略已归档快照（contentArchived），
        // 只要补丁还在，字段级回滚能力就不受影响。
        const usePatches =
          !!targetPointer.contentArchived &&
          !!targetPointer.patches &&
          targetPointer.patches.length > 0;

        const outcome = usePatches
          ? (() => {
              const r = applyEntityPatches(module, entityId, targetPointer.patches!);
              return { success: r.success, message: r.message };
            })()
          : applyEntityRestore(module, entityId, beforeSnapshot);

        if (outcome.success) {
          writeState.wroteAny = true;
        } else {
          writeState.error = outcome.message;
        }
      } else {
        // G3 修复：此处原为「通用兜底直接置 restoredSuccessfully = true」，
        // 导致未实现分支的模块既未恢复任何数据、又返回成功并写入一条"成功回滚"存证。
        return {
          success: false,
          reason: 'UNSUPPORTED',
          message: explainUnsupported(module)
        };
      }
    } catch (e: any) {
      return {
        success: false,
        reason: 'APPLY_FAILED',
        message: `回滚失败: ${e?.message || '未知错误'}`
      };
    }

    // G5：写入失败一律中止，不进入"标记 reverted + 写存证"环节
    if (writeState.error) {
      return { success: false, reason: 'APPLY_FAILED', message: writeState.error };
    }

    // G3：未产生任何实际写入时不得返回成功
    if (!writeState.wroteAny) {
      return {
        success: false,
        reason: 'UNSUPPORTED',
        message: `模块「${module}」的该条记录未包含可还原的数据，已中止回滚且未产生修复存证`
      };
    }

    // 至此写入已确认成功，才生成修复存证（append-only 无损审计链）
    const rollbackPointer = this.recordDataMutation({
      module,
      entityId,
      entityName,
      actionType: 'rollback',
      beforeData: afterSnapshot,
      afterData: beforeSnapshot,
      customSummary: `🛡️ ${operator.name} (${operator.roleName}) 成功执行数据回滚，将【${entityName}】还原至版本 ${targetPointer.versionTag} (${targetPointer.formattedTime})`,
      operatorOverride: operator,
      isRollback: true,
      rollbackSourcePointerId: pointerId
    });

    // 标记原指针并补齐审计链字段（原实现遗漏 revertedAt / revertedBy）
    this.markPointerReverted(pointerId, operator);

    // Dispatch data restored event across entire applet
    safeDispatchEvent('obsidian_data_restored', {
      module,
      entityId,
      pointerId,
      restoredData: beforeSnapshot
    });

    return {
      success: true,
      message: `已成功将【${entityName}】回滚至历史版本 (${targetPointer.versionTag}) 并生成修复存证！`,
      newPointer: rollbackPointer
    };
  }

  // Surgical Single-field Rollback
  /**
   * 字段级精准修复。
   *
   * 原实现存在致命缺陷（G3）：对 dishes / materials / coupons 之外的模块
   * —— 不修改任何数据、不报错、却写入一条「🔧 精准单字段修复」存证并返回 success，
   * 即审计链会记录一次从未发生的修复。本次彻底移除该路径。
   *
   * 现在的不变式：
   *  1. 未注册写适配的模块 → 显式失败（UNSUPPORTED），不写入任何存证；
   *  2. 实体不存在 → 显式失败，不写入任何存证；
   *  3. 当前字段值 ≠ 该指针的 newValue（说明此后被再次修改）→ 显式失败（CONFLICT），
   *     除非调用方显式传入 force；
   *  4. 写入失败（配额超限）→ 显式失败（APPLY_FAILED），不写入任何存证；
   *  5. 只有在写入确实成功之后，才生成修复存证并标记原指针。
   */
  public rollbackSingleField(
    pointerId: string,
    fieldKey: string,
    options?: { force?: boolean }
  ): {
    success: boolean;
    message: string;
    reason?: RollbackFailureReason;
    conflicts?: FieldConflict[];
  } {
    const pointers = this.getAllPointers();
    const targetPointer = pointers.find((p) => p.pointerId === pointerId);

    if (!targetPointer) {
      return { success: false, reason: 'NOT_FOUND', message: '未找到指定版本' };
    }

    const targetDiff = targetPointer.fieldDiffs.find((d) => d.field === fieldKey);
    const patch = (targetPointer.patches || []).find((pt) => pointerTail(pt.path) === fieldKey);

    if (!targetDiff && !patch) {
      return {
        success: false,
        reason: 'FIELD_NOT_FOUND',
        message: `该版本中未发现字段「${fieldKey}」的修改记录`
      };
    }

    // 优先使用记录携带的字段补丁（P2-a）；历史数据回退为按 fieldDiffs 合成补丁。
    const planned: FieldPatch[] = patch
      ? [patch]
      : [
          {
            targetKey: this.resolvePatchesKey(targetPointer.module, targetPointer.entityId),
            entityId: targetPointer.entityId,
            path: `/${fieldKey}`,
            op: 'replace',
            value: targetDiff!.oldValue,
            expectedCurrent: targetDiff!.newValue,
            fieldLabel: targetDiff!.fieldLabel
          }
        ];

    return this.executePatchRepair(targetPointer, planned, options);
  }

  /**
   * 补丁级批量精准回滚（P2-a）。
   * @param paths 只回滚指定 JSON Pointer；不传则回滚该记录的全部补丁。
   */
  public rollbackPatches(
    pointerId: string,
    paths?: string[],
    options?: { force?: boolean }
  ): {
    success: boolean;
    message: string;
    reason?: RollbackFailureReason;
    conflicts?: FieldConflict[];
  } {
    const targetPointer = this.getAllPointers().find((p) => p.pointerId === pointerId);
    if (!targetPointer) {
      return { success: false, reason: 'NOT_FOUND', message: '未找到指定版本' };
    }

    const all = targetPointer.patches || [];
    if (all.length === 0) {
      return {
        success: false,
        reason: 'FIELD_NOT_FOUND',
        message:
          '该记录为实体级增删或全量快照型操作，没有可用的字段级补丁，请使用整实体回滚或快照还原'
      };
    }

    const selected =
      paths && paths.length > 0 ? all.filter((p) => paths.includes(p.path)) : all;
    if (selected.length === 0) {
      return {
        success: false,
        reason: 'FIELD_NOT_FOUND',
        message: `指定的路径未在该记录中找到: ${(paths || []).join(', ')}`
      };
    }

    return this.executePatchRepair(targetPointer, selected, options);
  }

  /**
   * 统一修复执行器。
   *
   * 不变式（P0-a 起强制，避免"未改数据却返回成功"的审计链造假）：
   *  1. 未注册写适配的模块 → 显式失败，不写任何存证；
   *  2. 实体不存在 → 显式失败，不写任何存证；
   *  3. 补丁基准与当前值不一致 → CONFLICT（除非 force）；
   *  4. 写入失败 → APPLY_FAILED，不写任何存证；
   *  5. 只有写入确实成功之后，才生成修复存证并标记原指针。
   */
  private executePatchRepair(
    targetPointer: VersionPointer,
    patches: FieldPatch[],
    options?: { force?: boolean }
  ): {
    success: boolean;
    message: string;
    reason?: RollbackFailureReason;
    conflicts?: FieldConflict[];
  } {
    const { module, entityId, entityName, pointerId } = targetPointer;
    const operator = this.getActiveOperator();

    // 不变式 1
    if (!isModuleRollbackSupported(module)) {
      return {
        success: false,
        reason: 'UNSUPPORTED',
        message: `${explainUnsupported(module)}（本次未修改任何数据，也未生成修复存证）`
      };
    }

    // 不变式 2
    const current = readEntity(module, entityId);
    if (!current.supported || !current.found || !current.entity) {
      return {
        success: false,
        reason: 'APPLY_FAILED',
        message: `未在存储中找到实体【${entityName}】(${entityId})，本次未修改任何数据`
      };
    }

    // 不变式 3
    if (!options?.force) {
      const rawConflicts = detectPatchConflicts(patches, () => current.entity);
      if (rawConflicts.length > 0) {
        const conflicts: FieldConflict[] = rawConflicts.map((c) => ({
          field: c.path,
          fieldLabel: c.fieldLabel,
          expected: c.expected,
          actual: c.actual
        }));
        return {
          success: false,
          reason: 'CONFLICT',
          conflicts,
          message:
            '【修复已中止】以下字段在该版本之后已被再次修改，直接修复会静默覆盖这些变更：' +
            `${summarizeConflicts(conflicts, (v) => formatDiffValue(v))}。` +
            '请先复核最新版本，或在确认丢弃后续变更后使用强制修复。'
        };
      }
    }

    // 不变式 4
    const outcome = applyEntityPatches(module, entityId, patches);
    if (!outcome.success) {
      return {
        success: false,
        reason: 'APPLY_FAILED',
        message: `${outcome.message}（已回滚本次部分写入，数据保持修复前状态）`
      };
    }

    // 不变式 5
    this.recordDataMutation({
      module,
      entityId,
      entityName,
      actionType: 'rollback',
      beforeData: Object.fromEntries(patches.map((p) => [p.path, p.expectedCurrent])),
      afterData: Object.fromEntries(patches.map((p) => [p.path, p.value])),
      customSummary: `🔧 ${operator.name} 补丁级精准修复：对【${entityName}】回写 ${patches.length} 处字段（${summarizePatches(patches)}）`,
      operatorOverride: operator,
      isRollback: true,
      rollbackSourcePointerId: pointerId
    });

    this.markPointerReverted(pointerId, operator);

    safeDispatchEvent('obsidian_data_restored', { module, entityId, paths: patches.map((p) => p.path) });

    return {
      success: true,
      message: `已精准回写 ${patches.length} 处字段（${summarizePatches(patches)}）`
    };
  }

  // Milestone Snapshots API
  public getMilestoneSnapshots(): MilestoneSnapshot[] {
    return persistentStore.getSync<MilestoneSnapshot[]>(
      STORAGE_KEY_SNAPSHOTS,
      INITIAL_SNAPSHOTS
    );
  }

  public saveMilestoneSnapshots(snapshots: MilestoneSnapshot[]): void {
    const persisted = persistentStore.setSync(STORAGE_KEY_SNAPSHOTS, snapshots);
    if (!persisted) {
      console.error('[VersionPointerEngine] 里程碑快照持久化失败，本地存储与 IndexedDB 均不可用');
    }
  }

  /**
   * 重建快照存证链。
   * 快照数量少，采用整链重建而非增量补算，实现简单且不会出现链断裂。
   */
  private async backfillSnapshotChain(): Promise<void> {
    if (!isCryptoAvailable()) return;
    const ordered = [...this.getMilestoneSnapshots()].reverse();
    let prev = GENESIS_HASH;
    const rebuilt: MilestoneSnapshot[] = [];
    for (const snap of ordered) {
      const proof = await computeChainProof(prev, snap);
      rebuilt.push({ ...snap, chainProof: proof, integrityHash: proof.chainHash });
      prev = proof.chainHash;
    }
    this.saveMilestoneSnapshots(rebuilt.reverse());
    safeDispatchEvent('obsidian_snapshot_chain_updated', {});
  }

  /** 校验快照存证链 */
  public async verifySnapshotChain(fullContentCheck = true): Promise<ChainVerifyReport> {
    return verifyChainCore(this.getMilestoneSnapshots(), { fullContentCheck });
  }

  /**
   * 治理健康度体检报告。
   * 把所有"能力边界"如实暴露给 UI：覆盖率、持久化后端、存证链状态、风险计数、
   * 以及仍不支持回滚的模块清单 —— 避免出现"界面说能回滚、实际回不了"的情况。
   */
  public async getGovernanceHealth(): Promise<GovernanceHealthReport> {
    const pointers = this.getAllPointers();
    const gateway = describeGatewayCoverage();
    const rollback = describeRollbackCoverage();
    const quarantine = getQuarantineEntries().filter((e) => !e.released);

    let integrity: ChainVerifyReport | null = null;
    try {
      integrity = await verifyChainCore(pointers, { fullContentCheck: true });
    } catch (e) {
      console.warn('[VersionPointerEngine] 存证链校验失败:', e);
    }

    return {
      generatedAt: new Date().toISOString(),
      pointerCount: pointers.length,
      retentionCap: POINTER_RETENTION_CAP,
      persistence: persistentStore.health,
      coverage: {
        totalModules: gateway.moduleCoverage.total,
        instrumentedModules: gateway.moduleCoverage.instrumented,
        missingModules: gateway.moduleCoverage.missing,
        unsupportedRollbackModules: rollback.unsupported
      },
      integrity,
      risk: {
        total: pointers.filter((p) => (p.ruleHits || []).length > 0).length,
        highRisk: pointers.filter((p) => p.isSuspectedMistake).length,
        quarantined: quarantine.length,
        autoReverted: pointers.filter((p) => p.governanceAction === 'auto_revert').length
      }
    };
  }

  /** 启动自愈：由 initGovernance() 调用 */
  public async selfHeal(): Promise<{ chainFixed: number; snapshotsRebuilt: boolean }> {
    const chainFixed = await this.backfillAllChainProofs();
    await this.backfillSnapshotChain();
    assertGatewayConsistency();
    return { chainFixed, snapshotsRebuilt: true };
  }

  // Create a full manual milestone snapshot
  public createManualSnapshot(
    title: string,
    description: string,
    tag: MilestoneSnapshot['tag'] = 'manual'
  ): MilestoneSnapshot {
    const operator = this.getActiveOperator();
    const dishes = safeGetStorage<any[]>('obsidian_truck_dishes', []);
    const materials = safeGetStorage<any[]>('obsidian_truck_materials', []);
    const coupons = safeGetStorage<any[]>('obsidian_merchant_coupons', []);
    const staff = safeGetStorage<any[]>('obsidian_staff_members', []);
    const tables = safeGetStorage<any[]>('obsidian_merchant_tables', []);
    const delivery = safeGetStorage<any>('obsidian_delivery_settings', {});
    const activityRules = safeGetStorage<any>('obsidian_activity_rules', []);

    const now = new Date();
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const tagLabelMap: Record<MilestoneSnapshot['tag'], string> = {
      pre_rush: '开餐前基线',
      post_rush: '打烊日结存档',
      pricing_campaign: '大促改价快照',
      emergency_backup: '紧急灾备备份',
      manual: '手动安全还原点'
    };

    const payload = {
      dishes,
      materials,
      coupons,
      staff,
      tables,
      deliverySettings: delivery,
      activityRules
    };

    // P0-c：不再生成伪造哈希。真实 SHA-256 存证由 backfillSnapshotChain() 异步补算，
    // 在此之前 UI 应显示"存证中"而非"校验通过"。
    const integrityHash = '(pending-sha256)';
    const snapshotId = `snap_${Date.now()}`;

    const newSnapshot: MilestoneSnapshot = {
      snapshotId,
      title,
      description,
      createdAt,
      createdBy: operator,
      tag,
      tagLabel: tagLabelMap[tag],
      dataSummary: {
        dishesCount: dishes.length,
        materialsCount: materials.length,
        couponsCount: coupons.length,
        staffCount: staff.length,
        tablesCount: tables.length
      },
      payload,
      integrityHash
    };

    const snapshots = [newSnapshot, ...this.getMilestoneSnapshots()];
    this.saveMilestoneSnapshots(snapshots);
    // P0-c：异步重建快照存证链
    void this.backfillSnapshotChain();

    // Record pointer for snapshot creation
    this.recordDataMutation({
      module: 'system',
      entityId: snapshotId,
      entityName: title,
      actionType: 'snapshot_create',
      beforeData: null,
      afterData: { snapshotId, title, tag },
      customSummary: `💾 ${operator.name} 创建了全局数据安全里程碑快照【${title}】`
    });

    return newSnapshot;
  }

  // Restore full snapshot
  public restoreMilestoneSnapshot(snapshotId: string): {
    success: boolean;
    message: string;
  } {
    const snapshots = this.getMilestoneSnapshots();
    const target = snapshots.find((s) => s.snapshotId === snapshotId);
    if (!target) return { success: false, message: '未找到指定快照' };

    const operator = this.getActiveOperator();

    try {
      // G5 修复：快照还原涉及多个键的批量写入，任一失败都必须中止并如实报告，
      // 否则会出现"部分还原却提示成功"的更隐蔽的数据损坏。
      const failures: string[] = [];
      const restore = (key: string, value: unknown) => {
        if (value === undefined || value === null) return;
        if (!safeSetStorage(key, value)) failures.push(key);
      };

      restore('obsidian_truck_dishes', target.payload.dishes);
      restore('obsidian_truck_materials', target.payload.materials);
      restore('obsidian_merchant_coupons', target.payload.coupons);
      restore('obsidian_staff_members', target.payload.staff);
      restore('obsidian_merchant_tables', target.payload.tables);
      restore('obsidian_delivery_settings', target.payload.deliverySettings);
      restore('obsidian_activity_rules', target.payload.activityRules);

      if (failures.length > 0) {
        return {
          success: false,
          message: `快照还原中断：以下键写入失败（本地存储配额可能已满）：${failures.join(', ')}。数据可能处于部分还原状态，请立即释放存储空间后重试。`
        };
      }

      // Record pointer
      this.recordDataMutation({
        module: 'system',
        entityId: snapshotId,
        entityName: target.title,
        actionType: 'snapshot_restore',
        beforeData: null,
        afterData: { snapshotId, title: target.title },
        customSummary: `🚨 ${operator.name} 执行了全量数据快照灾备还原，恢复至【${target.title}】(${target.createdAt})`
      });

      safeDispatchEvent('obsidian_data_restored', { fullRestore: true, snapshotId });

      return {
        success: true,
        message: `全量快照【${target.title}】已成功还原至当前生产数据库！`
      };
    } catch (e: any) {
      return { success: false, message: `还原失败: ${e.message}` };
    }
  }

  /**
   * 导出防篡改审计报告。
   * 输出内容包含真实链哈希（chainProof）、命中规则明细与补丁集，
   * 便于在离线环境中逐条重算校验。
   */
  public exportAuditReport(pointers: VersionPointer[]): void {
    const chainSummary = pointers.map((p) => ({
      pointerId: p.pointerId,
      versionTag: p.versionTag,
      timestamp: p.timestamp,
      operator: `${p.operator.name}(${p.operator.roleName})`,
      module: p.moduleName,
      actionType: p.actionType,
      entityId: p.entityId,
      entityName: p.entityName,
      summary: p.summary,
      riskLevel: p.riskLevel ?? 'normal',
      isSuspectedMistake: !!p.isSuspectedMistake,
      mistakeReason: p.mistakeReason ?? null,
      ruleHits: p.ruleHits ?? [],
      governanceAction: p.governanceAction ?? 'none',
      patches: p.patches ?? [],
      fieldDiffs: p.fieldDiffs,
      prevChainHash: p.chainProof?.prevChainHash ?? null,
      payloadHash: p.chainProof?.payloadHash ?? null,
      contentDigest: p.chainProof?.contentDigest ?? null,
      chainHash: p.chainProof?.chainHash ?? null,
      status: p.status,
      revertedAt: p.revertedAt ?? null,
      revertedBy: p.revertedBy ?? null
    }));

    const dataStr = JSON.stringify(
      {
        exportTime: new Date().toISOString(),
        merchantId: 'URBAN_RADAR_FOOD_TRUCK_01',
        chainAlgorithm: 'SHA-256',
        chainGenesis: GENESIS_HASH,
        totalRevisions: pointers.length,
        verifiedProofCount: pointers.filter((p) => !!p.chainProof).length,
        retentionCap: POINTER_RETENTION_CAP,
        coverage: describeGatewayCoverage().moduleCoverage,
        versionPointers: chainSummary
      },
      null,
      2
    );

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Obsidian_Version_Audit_Report_${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const globalVersionEngine = new VersionPointerEngine();

// -------------------------------------------------------------
// P1-a：把写入网关的自动记录接到引擎上
// -------------------------------------------------------------

registerGovernanceCommitHandler(
  (drafts: GovernanceMutationDraft[], label: string, transactionId: string) => {
    const operator = globalVersionEngine.getActiveOperator();

    // 批模式：一次事务内的 N 条记录只在结束时落盘一次，
    // 避免每条记录都全量重写整个指针数组（O(n²) 写放大）。
    // endBatchPersist 必须置于 finally —— 若批内抛错而未落盘，
    // 会造成「内存有、磁盘无」的审计缺口。
    globalVersionEngine.beginBatchPersist();
    try {
      drafts.forEach((draft) => {
        // 初始化播种不是任何操作员的业务行为，不可归因到当前登录人名下
        const isSeed =
          (draft.afterData as unknown as { __seed__?: boolean } | null)?.__seed__ === true;

        const customSummary = isSeed
          ? `🌐 网关自动记录（事务：${label}）｜系统启动初始化播种【${draft.entityName}】`
          : `🌐 网关自动记录（事务：${label}）｜${operator.name} 对【${draft.entityName}】执行「${ACTION_NAME_MAP[draft.actionType]}」`;

        globalVersionEngine.recordDataMutation({
          module: draft.module,
          entityId: draft.entityId,
          entityName: draft.entityName,
          actionType: draft.actionType,
          beforeData: draft.beforeData,
          afterData: draft.afterData,
          transactionId,
          transactionLabel: label,
          origin: 'gateway',
          customSummary
        });
      });
    } finally {
      globalVersionEngine.endBatchPersist();
    }
  }
);

/**
 * 治理子系统启动入口（幂等）。
 * 在应用挂载时调用一次：初始化 IndexedDB → 补算历史存证 → 校验网关一致性。
 */
export function initGovernance(): void {
  initPersistentStore();
  // P1-a：安装持久化出口写入钩子 —— 业务侧零改动即获得 100% 版本记录覆盖
  installStorageWriteHook();
  // 网关与回滚适配表的一致性自检（"有记录却回不了"的漂移在启动期暴露）
  assertGatewayConsistency();
  void globalVersionEngine
    .selfHeal()
    .then((res) => {
      if (res.chainFixed > 0) {
        console.info(`[Governance] 启动自愈完成：补算 ${res.chainFixed} 条记录的真实 SHA-256 存证。`);
      }
    })
    .catch((e) => console.error('[Governance] 启动自愈失败:', e));
}

// Convenience helper exports for components
export const getVersionPointers = (): VersionPointer[] => globalVersionEngine.getAllPointers();
export const getMilestoneSnapshots = (): MilestoneSnapshot[] => globalVersionEngine.getMilestoneSnapshots();
export const createMilestoneSnapshot = (
  title: string,
  description: string = '手动创建快照',
  tag: MilestoneSnapshot['tag'] = 'manual'
): MilestoneSnapshot => globalVersionEngine.createManualSnapshot(title, description, tag);
export const restoreMilestoneSnapshot = (snapshotId: string) => globalVersionEngine.restoreMilestoneSnapshot(snapshotId);
export const rollbackVersionPointer = (
  pointerId: string,
  options?: { force?: boolean }
) => {
  const res = globalVersionEngine.rollbackPointer(pointerId, options);
  return {
    success: res.success,
    message: res.message,
    revertedPointer: res.newPointer,
    reason: res.reason,
    conflicts: res.conflicts,
    error: res.success ? undefined : res.message
  };
};
export const rollbackVersionPatches = (
  pointerId: string,
  paths?: string[],
  options?: { force?: boolean }
) => globalVersionEngine.rollbackPatches(pointerId, paths, options);
export const verifyVersionChain = (fullContentCheck = true) =>
  globalVersionEngine.verifyChain(fullContentCheck);
export const getGovernanceHealth = () => globalVersionEngine.getGovernanceHealth();
export const getGovernanceCoverage = () => ({
  gateway: describeGatewayCoverage(),
  rollback: describeRollbackCoverage()
});
export const getActiveMerchantOperator = () => globalVersionEngine.getActiveOperator();
export const setActiveMerchantOperator = (opIdOrOperator: string | MerchantOperator) => {
  if (typeof opIdOrOperator === 'string') {
    const found = DEFAULT_MERCHANT_OPERATORS.find(op => op.id === opIdOrOperator);
    if (found) {
      globalVersionEngine.setActiveOperator(found);
    }
  } else {
    globalVersionEngine.setActiveOperator(opIdOrOperator);
  }
};
