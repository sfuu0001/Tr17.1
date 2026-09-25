export type MerchantRole = 'manager' | 'cashier' | 'grill_chef' | 'barista' | 'rider' | 'admin' | 'system';

export interface MerchantOperator {
  id: string;
  username: string;
  name: string;
  role: MerchantRole;
  roleName: string;
  avatar?: string;
  deviceInfo: string;
  ip: string;
  shiftBadge?: string;
}

export type VersionModuleType =
  | 'dishes'
  | 'materials'
  | 'coupons'
  | 'marketing'
  | 'tables'
  | 'orders'
  | 'calling_queue'
  | 'kds'
  | 'fallback'
  | 'staff'
  | 'delivery'
  | 'payments'
  | 'stall_gps'
  | 'craft_standards'
  /** 堂食桌台会话与多端联动授权（二维码点餐、参与者授权链、探针） */
  | 'table_session'
  | 'system';

export type VersionActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'void_ticket'
  | 'void_order'
  | 'discount_override'
  | 'table_transfer'
  | 'force_clean'
  | 'batch_adjust'
  | 'rollback'
  | 'snapshot_restore'
  | 'snapshot_create';

export interface FieldDiff {
  field: string;
  fieldLabel: string;
  diffType: 'added' | 'modified' | 'removed';
  oldValue: any;
  newValue: any;
  oldValueDisplay: string;
  newValueDisplay: string;
}

// -------------------------------------------------------------
// P2-a：字段级可执行补丁（RFC 6902-lite）
// -------------------------------------------------------------

export type PatchOp = 'replace' | 'add' | 'remove';

export interface FieldPatch {
  /** 目标持久化键 */
  targetKey: string;
  /** 集合内实体主键；单例模块为配置标识 */
  entityId: string;
  /** RFC 6902 JSON Pointer 路径，如 /price 或 /variants/0/price */
  path: string;
  /** 逆向恢复所需的操作：把值改回 `value` */
  op: PatchOp;
  /** 逆向值（= 变更前的旧值） */
  value: unknown;
  /** 乐观并发校验基准（= 变更后的期望当前值） */
  expectedCurrent: unknown;
  fieldLabel: string;
}

// -------------------------------------------------------------
// P0-c：密码学存证链
// -------------------------------------------------------------

export interface ChainProof {
  algorithm: 'SHA-256';
  /** 本条记录语义内容（fieldDiffs + patches + 快照）的规范化摘要 */
  contentDigest: string;
  /** 本条记录规范化后的内容哈希（身份字段 + contentDigest） */
  payloadHash: string;
  /** 上一条记录的链哈希（创世节点为 64 个 0） */
  prevChainHash: string;
  /** 链哈希 = SHA256(prevChainHash + ':' + payloadHash) */
  chainHash: string;
  /** 服务端锚定标识（前端模型下防篡改的最终裁决依据） */
  anchorId?: string;
  anchoredAt?: string;
}

export interface ChainVerifyReport {
  valid: boolean;
  checkedCount: number;
  /** 断链记录的 pointerId 列表 */
  brokenPointerIds: string[];
  /** 首处断链的详情，便于定位 */
  firstBrokenAt?: {
    pointerId: string;
    versionTag: string;
    expectedChainHash: string;
    actualChainHash: string;
    reason: 'chain_mismatch' | 'payload_modified' | 'content_modified' | 'missing_proof';
  };
  verifiedAt: string;
}

// -------------------------------------------------------------
// P0-b：规则引擎命中结果
// -------------------------------------------------------------

export type GovernanceSeverity = 'low' | 'sensitive' | 'high_risk';
export type GovernanceAction = 'none' | 'notify' | 'quarantine' | 'auto_revert';

export interface RuleHit {
  ruleId: string;
  label: string;
  severity: GovernanceSeverity;
  action: GovernanceAction;
  /** 命中原因（可直接展示给管理员） */
  reason: string;
  /** 触发该判定的量化依据 */
  evidence?: Record<string, string | number>;
}

export interface VersionPointer {
  pointerId: string;
  versionTag: string;
  timestamp: string;
  formattedTime: string;
  operator: MerchantOperator;
  module: VersionModuleType;
  moduleName: string;
  actionType: VersionActionType;
  actionName: string;
  entityId: string;
  entityName: string;
  summary: string;
  fieldDiffs: FieldDiff[];
  /** P2-a：可执行的字段级补丁；为空表示该记录为全量快照型操作 */
  patches?: FieldPatch[];
  beforeSnapshot: any;
  afterSnapshot: any;
  isRollback?: boolean;
  rollbackSourcePointerId?: string;
  isRevertible: boolean;
  /** @deprecated P0-c 起改用 chainProof（真实 SHA-256）。保留仅为兼容历史数据。 */
  integrityHash: string;
  /** P0-c：真实密码学存证（null 表示正在异步补算） */
  chainProof?: ChainProof | null;
  /** P2-b：快照已被分层保留策略归档（归档后跳过内容摘要校验，仅校验链） */
  contentArchived?: boolean;
  /** P0-b：命中规则明细 */
  ruleHits?: RuleHit[];
  /** P0-b：规则引擎给出的处置等级 */
  governanceAction?: GovernanceAction;
  /** P2-b：用于分层保留的策略层级 */
  tier?: RetentionTier;
  /**
   * P1-a：事务标识。
   * 一次业务操作若涉及多个实体/键，会生成多条指针，但共享同一 transactionId，
   * 从而既能按实体独立回滚，也能按事务整体回溯。
   */
  transactionId?: string;
  /** 事务的业务标签（如"批量调价"） */
  transactionLabel?: string;
  status: 'active' | 'reverted' | 'superseded';
  riskLevel?: 'normal' | 'sensitive' | 'high_risk';
  isSuspectedMistake?: boolean;
  mistakeReason?: string;
  revertedAt?: string;
  revertedBy?: string;
}

/** P2-b：分层保留策略 */
export type RetentionTier = 'permanent' | 'long' | 'rolling';

export interface MilestoneSnapshot {
  snapshotId: string;
  title: string;
  description: string;
  createdAt: string;
  createdBy: MerchantOperator;
  tag: 'pre_rush' | 'post_rush' | 'pricing_campaign' | 'emergency_backup' | 'manual';
  tagLabel: string;
  dataSummary: {
    dishesCount: number;
    materialsCount: number;
    couponsCount: number;
    staffCount: number;
    tablesCount: number;
  };
  payload: {
    dishes?: any;
    materials?: any;
    coupons?: any;
    activityRules?: any;
    tables?: any;
    staff?: any;
    deliverySettings?: any;
    truckInfo?: any;
  };
  /** @deprecated 改用 chainProof */
  integrityHash: string;
  chainProof?: ChainProof | null;
}

export interface VersionFilterState {
  searchQuery: string;
  selectedOperatorId: string;
  selectedModule: string;
  selectedAction: string;
  dateRange: 'all' | 'today' | '7days' | '30days';
  onlyRevertible: boolean;
}

// -------------------------------------------------------------
// P1-a：治理健康度快照（供 UI 展示真实能力边界）
// -------------------------------------------------------------

export interface GovernanceHealthReport {
  generatedAt: string;
  pointerCount: number;
  retentionCap: number;
  persistence: {
    backend: 'indexeddb' | 'localstorage' | 'memory';
    schemaVersion: number;
    degraded: boolean;
    lastFailureAt?: string;
    failureCount: number;
  };
  coverage: {
    totalModules: number;
    instrumentedModules: number;
    missingModules: VersionModuleType[];
    unsupportedRollbackModules: VersionModuleType[];
  };
  integrity: ChainVerifyReport | null;
  risk: {
    total: number;
    highRisk: number;
    quarantined: number;
    autoReverted: number;
  };
}
