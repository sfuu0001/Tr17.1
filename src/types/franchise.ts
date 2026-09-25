export type OrganizationRole =
  | 'hq_admin'            // 品牌总部最高超管 (全网穿透 / 菜单统领 / 分账清算)
  | 'regional_director'   // 区域大区督导 (巡检打分 / 区域调拨)
  | 'franchisee_owner'    // 特许加盟商/合伙人 (名下多车独立核算 / 进货报账)
  | 'truck_manager'       // 单车店长/车长 (车端就绪 / 极速出餐)
  | 'staff';              // 基础操作员 (后厨烤工 / 传菜)

export interface FranchiseeProfile {
  id: string;                    // 唯一加盟商编号，如 'FRAN-SH-001'
  companyName: string;           // 企业主体 / 执照名称
  brandBranchName: string;       // 加盟品牌分舵名称，如 '黑曜石流动餐车 · 静安卓越分部'
  ownerName: string;             // 签约负责人姓名
  phone: string;                 // 负责人电话 (已加密或脱敏)
  licenseNo: string;             // 营业执照 / 统一信用代码
  cityRegion: string;            // 所属城市与网格大区，如 '上海 · 核心市区 (静安/普陀)'
  contractStart: string;         // 合同签约生效日
  contractEnd: string;           // 合同届满日
  assignedTruckIds: string[];    // 名下特许经营餐车 ID 列表，如 ['truck-01', 'truck-02']
  depositBalance: number;        // 履约保证金余额 (元)
  depositRequired: number;       // 应缴保证金门槛 (元)
  royaltyRatePercent: number;    // 品牌特许权使用费提成比例 (%)，默认 5.0%
  status: 'active' | 'probation' | 'suspended'; // 正常经营 | 观察整改 | 冻结停机
  complianceScore: number;       // 综合合规信用分 (满分100，如96分)
  monthlyGmvQuota: number;       // 月度对赌保底考核 GMV (元)
  notes?: string;                // 总部批注备忘
  updatedAt: string;
}

export interface FranchiseDishPolicy {
  dishId: string;
  isHqLocked: boolean;           // 是否为总部品牌强锁定爆品 (防加盟商私改)
  lockedReason: string;          // 锁定原因说明 (如: 全国统一心智爆款/冷链配方统一)
  hqBasePrice: number;           // 总部全国统一定价 (元)
  allowedMinPrice: number;       // 加盟商允许下浮底线 (元)
  allowedMaxPrice: number;       // 加盟商允许上浮红线 (元)
  allowFranchiseePriceOverride: boolean; // 是否允许加盟商在安全区间内微调
  requireHqApprovalForDelist: boolean;   // 下架/沽清是否强制总部审批
  bomSkuCode?: string;           // 绑定的中央供应链半成品物料 SKU
  recommendedMarginRate: number; // 预期毛利率参考 (如 0.65 为 65%)
  lastLockedAt?: string;
  lockedBy?: string;
}

export interface FranchiseTenantContext {
  currentRole: OrganizationRole;
  currentFranchiseeId: string;   // 'HQ' 或加盟商 ID，如 'FRAN-SH-001'
  currentTruckId: string;        // 当前控制台聚焦的餐车 ID
  accessibleTruckIds: string[];  // 当前身份允许操控的餐车列表
  isHqUser: boolean;             // 是否为总部透视视角
  operatorName: string;          // 当前操作员称呼
}

export interface FranchisePriceAuditLog {
  id: string;
  timestamp: string;
  dishId: string;
  dishName: string;
  franchiseeId: string;
  truckId: string;
  operator: string;
  beforePrice: number;
  afterPrice: number;
  action: 'hq_lock' | 'hq_unlock' | 'franchisee_override' | 'blocked_attempt';
  status: 'allowed' | 'rejected';
  reason: string;
}

// ==========================================
// Phase 2: BOM 原料级强绑定与防飞单/私采溯源
// ==========================================

export interface BomIngredient {
  materialId: string;            // 物料唯一ID
  materialName: string;          // 物料名称 (如 'A5和牛纯牛肉饼')
  skuCode: string;               // 供应链统配物料SKU编码 (如 'MAT-WAGYU-A5')
  unit: string;                  // 单位 (g, 个, ml, 串, 套)
  quantityPerServing: number;    // 单份成菜标准耗用量
  isHqMandatory: boolean;        // 是否为总部统配红线物料 (严禁本地私采)
  costPerUnit: number;           // 总部供货给加盟商的单价 (元)
}

export interface DishBomRecipe {
  dishId: string;
  dishName: string;
  category: string;
  ingredients: BomIngredient[];
  theoreticalCost: number;       // 理论原料总成本 (元)
  standardYieldRate: number;     // 正常出品率/合格率 (如 0.98 为 98%)
  isCoreDish: boolean;           // 是否为特许爆品核心 BOM
  updatedAt: string;
}

export interface AntiLeakageAudit {
  dishId: string;
  dishName: string;
  franchiseeId: string;
  truckId: string;
  period: string;
  actualSalesQuantity: number;   // POS系统实销出单量 (来自线上及堂食订单)
  theoreticalMaterialRequired: number; // 理论按BOM应消耗核心统配件数/量
  hqProcuredQuantity: number;    // 加盟商向总部中央仓实际采购进料总量
  varianceQuantity: number;      // 差额 (实销理论耗量 - 总部采购量)
  variancePercent: number;       // 偏差率 (%)
  riskLevel: 'safe' | 'low_risk' | 'high_risk_private_sourcing' | 'unrecorded_sales';
  estimatedLossOrLeakage: number;// 预估违规涉案货值 / 飞单漏报营业额 (元)
  inspectionNote: string;        // 智能研判诊断结论
  detectedAt: string;
}

export interface SupplyOrderItem {
  materialId: string;
  materialName: string;
  skuCode: string;
  unit: string;
  requestedQty: number;
  unitPrice: number;
  subtotal: number;
}

export interface FranchiseSupplyOrder {
  id: string;
  franchiseeId: string;
  franchiseeName: string;
  truckId: string;
  status: 'submitted' | 'hq_approved' | 'in_transit' | 'delivered' | 'cancelled';
  items: SupplyOrderItem[];
  totalAmount: number;
  deliveryAddress: string;
  trackingNo?: string;
  coldChainTempZone: '冷冻 -18℃' | '冷藏 0-4℃' | '常温通风';
  createdAt: string;
  approvedAt?: string;
  deliveredAt?: string;
  notes?: string;
}

// ==========================================
// Phase 3: 经营电子围栏与跨界经营合规风控
// ==========================================

export interface FranchiseGeofenceConfig {
  franchiseeId: string;
  franchiseeName: string;
  assignedTruckIds: string[];
  authorizedTerritoryName: string; // 签约特许法定营运片区
  centerLat: number;
  centerLng: number;
  radiusKm: number;              // 签约授权准入半径 (公里)
  allowedGridPoints: { name: string; lat: number; lng: number; tag: string }[];
  isStrictEnforcement: boolean;  // 是否开启越界红色警报
  maxDailyDisplacementKm: number;
}

export interface GeofenceInspectionStatus {
  truckId: string;
  truckName: string;
  currentLat: number;
  currentLng: number;
  currentLocationName: string;
  targetTerritoryName: string;
  distanceToCenterKm: number;
  offsetFromBoundaryKm: number;  // >0 表示超出法定授权范围的公里数
  complianceStatus: 'in_bounds' | 'boundary_warning' | 'out_of_bounds' | 'temporary_permitted';
  temporaryPermitActive?: boolean;
  activePermitName?: string;
  lastCheckedAt: string;
}

export interface TemporaryDispatchPermit {
  id: string;
  franchiseeId: string;
  franchiseeName: string;
  truckId: string;
  eventName: string;             // 跨区报备活动名 (如 '迷笛草地音乐节特许流动餐饮专位')
  targetLocationName: string;    // 临时出摊目标地址
  targetLat: number;
  targetLng: number;
  allowedRadiusKm: number;       // 临时特批半径
  startTime: string;
  endTime: string;
  reason: string;
  estimatedRevenue: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

// ==========================================
// Phase 4: 实时分账清算、D+1结算与门店督导巡检
// ==========================================

export type SplitSettlementStatus =
  | 'pending_clearance'        // 待清算结算 (D+1准结算流水)
  | 'settled'                  // 已结算划付至加盟商专户
  | 'frozen_for_investigation' // 涉嫌飞单/跨界营运·风控冻结款项
  | 'refund_clawback';         // 售后退款原路追回冲抵

export interface TransactionSplitDetail {
  id: string;
  orderId: string;
  orderNo: string;
  franchiseeId: string;
  franchiseeName: string;
  truckId: string;
  orderAmount: number;                 // 实付订单金额 (毛交易额 GMV)
  platformTechFee: number;             // 平台技术通道费 (如 0.6%)
  hqRoyaltyFee: number;                // 总部品牌特许使用费 (如 5.0%)
  marketingFundFee: number;            // 全国统筹营销基金 (如 2.0%)
  franchiseeSettlementAmount: number;  // 加盟商最终应结净额
  settlementCycle: 'D+0' | 'D+1' | 'T+7';
  settlementStatus: SplitSettlementStatus;
  settledAt?: string;
  freezeReason?: string;
  clawbackAmount?: number;
  createdAt: string;
}

export interface FranchiseeSettlementBill {
  id: string;
  billNo: string;
  franchiseeId: string;
  franchiseeName: string;
  settlementDate: string;              // 账单归属日期 (YYYY-MM-DD)
  totalOrdersCount: number;
  totalGrossRevenue: number;
  totalHqRoyalty: number;
  totalMarketingFund: number;
  totalTechFee: number;
  totalNetPayout: number;              // 划付给加盟商的净收益
  status: 'reconciled' | 'paid' | 'disputed';
  generatedAt: string;
  paidAt?: string;
}

export interface FranchiseSplitConfig {
  franchiseeId: string;
  royaltyRatePercent: number;          // 品牌特许权益金比率 (%)
  marketingRatePercent: number;        // 市场营销基金比率 (%)
  techFeeRatePercent: number;          // 交易通道费率 (%)
  settlementCycle: 'D+0' | 'D+1' | 'T+7';
  autoPayoutEnabled: boolean;          // 是否开启 D+1 零点系统自动划付
}

// 门店督导巡检打分卡
export interface StoreInspectionItem {
  id: string;
  title: string;
  standard: string;
  passed: boolean;
  deduction: number;
  note?: string;
}

export interface StoreInspectionCategory {
  categoryKey: 'food_safety' | 'vehicle_compliance' | 'temperature_coldchain' | 'brand_visual' | 'service_sop';
  categoryName: string;
  maxScore: number;
  currentScore: number;
  items: StoreInspectionItem[];
}

export type InspectionGrade = 'A' | 'B' | 'C' | 'D';

export interface StoreInspectionCard {
  id: string;
  inspectionNo: string;
  franchiseeId: string;
  franchiseeName: string;
  truckId: string;
  inspectorName: string;               // 区域督导专员姓名
  inspectionDate: string;
  score: number;                       // 综合评分 0 - 100
  grade: InspectionGrade;              // A: 90-100 优秀, B: 80-89 良好, C: 70-79 需整改, D: <70 停业
  categories: StoreInspectionCategory[];
  criticalFindings: string[];          // 关键隐患与问题发现
  rectificationRequired: boolean;      // 是否需要下发限期整改单
  rectificationDeadline?: string;      // 限期整改截止时间
  rectificationStatus: 'passed' | 'pending_rectification' | 'reinspected_passed' | 'rectification_overdue';
  penaltyAmount: number;               // 扣罚履约保证金金额 (元)
  penaltyPaid: boolean;
  reinspectionNotes?: string;
  createdAt: string;
}

// 履约保证金明细记录
export interface DepositTransactionRecord {
  id: string;
  franchiseeId: string;
  franchiseeName: string;
  type: 'initial_deposit' | 'penalty_deduction' | 'freeze' | 'unfreeze' | 'replenishment';
  amount: number;
  balanceAfter: number;
  reason: string;
  relatedInspectionNo?: string;
  operator: string;
  createdAt: string;
}

// 特许经营双模式开关配置
export interface FranchiseFeatureToggle {
  enableFranchiseMode: boolean;        // 是否开启特许加盟超级控制台模式
  activePreset: 'single_store' | 'franchise_federation';
}

