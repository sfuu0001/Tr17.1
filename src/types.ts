import { PaymentVoucher } from './types/payment';

export type CategoryType = 'all' | 'popular' | 'skewers' | 'yakitori' | 'baked' | 'western' | 'mains' | 'drinks' | 'desserts' | 'snacks';

export type SubCategoryType =
  | 'all'
  // Skewers sub-categories
  | 'skewers-beef-creative'
  | 'skewers-meat'
  | 'skewers-pork-poultry'
  | 'skewers-seafood'
  | 'skewers-balls-tofu'
  | 'skewers-veggie'
  | 'skewers-special'
  // Yakitori sub-categories
  | 'yakitori-classic'
  | 'yakitori-special'
  | 'yakitori-giblets'
  | 'yakitori-wings-veggie'
  // Baked & Gratin sub-categories
  | 'baked-seafood'
  | 'baked-staple'
  | 'baked-appetizer'
  // Western sub-categories
  | 'western-steak'
  | 'western-burger-pasta'
  | 'western-starters'
  | 'western-dessert'
  // General sub-categories
  | 'drinks-special'
  | 'desserts-sweet';

export type ViewMode = 'grid2' | 'grid' | 'list';

export type DiningMode = 'delivery' | 'dine_in' | 'pickup';

export interface DishOptionChoice {
  label: string;
  enLabel?: string;
  extraPrice: number;
  imageUrl?: string; // 选项实物图
  blueprintImageUrl?: string; // 选项专属工匠线稿图
  sketchType?: string; // 选项矢量图纸类型
  description?: string; // 工艺说明
}

export interface DishOptionGroup {
  name: string;
  enName?: string;
  required?: boolean;
  choices: DishOptionChoice[];
}

export interface DishVariantImageStyle {
  aspectRatio?: '1:1' | '4:3' | '16:9' | 'round'; // 比例样式 (方形 / 微距 / 宽屏 / 圆形徽章)
  borderStyle?: 'none' | 'subtle' | 'purple' | 'amber' | 'emerald' | 'dashed'; // 独立外框装饰风格
  fitMode?: 'cover' | 'contain'; // 呈现适配模式 (裁剪铺满 / 完整呈现)
  badgeText?: string; // 变体图片专属角标 (如: 超大份 / 双倍肉 / 爆浆拉丝 / 主厨首选 / 尝鲜特惠)
  badgeColor?: 'purple' | 'amber' | 'emerald' | 'red' | 'neutral'; // 角标主题配色
  filter?: 'normal' | 'warm' | 'crisp' | 'lowkey'; // 画面滤镜基调 (原色 / 暖光醇厚 / 鲜锐微距 / 暗调氛围)
}

export interface DishVariant {
  id: string; // 变体唯一标识
  name: string; // 变体名称 (如: '标准单人份', '豪华加厚双拼', '加料大份')
  enName?: string; // 英文名称 (如: 'Single Standard', 'Double Thick Stack')
  sku?: string; // 独立变体编码/SKU
  price: number; // 独立价格 (¥)
  originalPrice?: number; // 独立划线原价 (¥)
  imageUrl?: string; // 单独实物图片 (未设置时继承主图)
  blueprintImageUrl?: string; // 变体专属工匠线稿图 (支持手动上传或自动程序渲染)
  sketchType?: string; // 变体矢量草图类型 (burger/skewer/doneness/fries/steak/drink等)
  imageStyle?: DishVariantImageStyle; // 单独图片样式 (比例、边框、角标、滤镜)
  description?: string; // 变体专属卖点/规格描述
  isDefault?: boolean; // 是否设为默认选中变体
  available?: boolean; // 变体是否在售 (默认 true)
  /** 按份售卖参数：一份含几个/几串（如 3 串/份），未填默认 1 */
  unitsPerServing?: number;
  /** 按份售卖单位（份/串/杯…），顾客端展示为"一份 3 串" */
  saleUnit?: string;
  /** 该规格最低加购数量（如最低 2 串起售） */
  minPurchaseQty?: number;
  badgeText?: string; // 专属角标文字
  badgeStyle?: string; // 专属角标风格配色
  imageFit?: 'cover' | 'contain'; // 图片适配模式
  borderStyle?: 'none' | 'subtle' | 'purple' | 'amber' | 'emerald' | 'dashed'; // 边框装饰风格
  visualFilter?: 'normal' | 'warm' | 'crisp' | 'lowkey'; // 画面滤镜基调
  artisanCode?: string; // 专属工匠代号
  refCode?: string; // 专属料号
  specRatio?: string; // 核心配比 (如 RATIO 8:2)
  coreTemp?: string; // 核心温控 (如 TEMP 58°C)
}

export interface FieldSelectorMediaItem {
  id: string; // 字段选择项唯一键 (如 'variant_v1' 或 'flavor_黑松露蒜香' 或 'option_Truffle Fries')
  key?: string; // 兼容键名
  fieldCategory?: 'variant' | 'flavor' | 'option' | 'spiciness' | 'cooking_style' | string; // 字段类别
  category?: string; // 兼容别名
  fieldName?: string; // 选项原名
  targetFieldId?: string; // 目标字段标识
  labelZh: string; // 中文显示名
  labelEn: string; // 英文显示名
  imageUrl?: string; // 实物图片
  blueprintImageUrl?: string; // 线稿图纸
  sketchType?: string; // 矢量草图类型
  sketchNoteZh?: string; // 线稿工艺说明（中文）
  sketchNoteEn?: string; // 线稿工艺说明（英文）
  coreMetricZh?: string; // 核心指标（中文）
  coreMetricEn?: string; // 核心指标（英文）
  coreTemp?: string; // 核心温控
  specRatio?: string; // 配比参数
  artisanCode?: string; // 工匠代号
  updatedAt?: string; // 最后更新时间戳
}

export interface DishItem {
  id: string;
  name: string;
  enName: string;
  description: string;
  price: number;
  originalPrice?: number;
  prevPrice?: number;
  deliveryDiscount?: number; // 外卖立减金额 (¥)
  dineInDiscount?: number; // 堂食立减金额 (¥)
  deliveryDiscountTag?: string; // 外卖立减标签/规则
  dineInDiscountTag?: string; // 堂食立减标签/规则
  discountRuleNote?: string;
  category: 'skewers' | 'yakitori' | 'baked' | 'western' | 'mains' | 'drinks' | 'desserts' | 'snacks';
  subCategory?: string; // e.g. 'skewers-meat', 'yakitori-classic', 'baked-seafood'
  subCategoryName?: string; // e.g. '经典鸡肉', '焗烤海鲜'
  isPopular?: boolean;
  isChefSpecial?: boolean;
  orderType: 'delivery' | 'dine_in' | 'both';
  badgeText?: string;
  typeTag: string; // e.g. "外卖", "堂食"
  discountTag?: string; // e.g. "外卖立减¥5"
  prepTime: string; // e.g. "约8m"
  imageUrl: string;
  available: boolean;
  unavailableReason?: string;
  optionGroups?: DishOptionGroup[];
  nutrition?: {
    calories?: string;
    protein?: string;
  };
  originSource?: string;
  chefNotes?: string;
  galleryImages?: {
    url: string;
    label: string;
  }[];
  // --- Specified Parameters for Dish Management & Customization ---
  spicinessLevel?: string; // 默认辣度 (如: '不辣', '微辣', '中辣', '重辣', '变态辣')
  spicinessOptions?: string[]; // 可选辣度池 (如: ['不辣 (原味)', '微辣 (推荐)', '中辣 (经典川香)', '重辣 (嗜辣专享)', '变态辣 (魔鬼椒)'])
  flavor?: string; // 默认口味 (如: '秘制黑椒酱香', '经典炭烤椒盐', '秘传孜然麻辣', '青花椒藤椒', '黑松露蒜香', '蜜汁原味')
  flavorOptions?: string[]; // 可选口味池
  /** 口味池每个选项的专属变体图片 (key = 口味名)，顾客端选择口味时展示 */
  flavorOptionImages?: Record<string, string>;
  flavorTags?: string[]; // 菜品风味标签 (支持自定义输入与多选标签库，如: ['炙烤焦香', '鲜嫩多汁', '黑椒浓郁', '果木熏香'])
  cookingStyle?: string; // 制作风格 (如: '炭火现烤 (果木炭慢烘)', '高压微炸 (外酥里嫩)', '远红外炙烤 (锁鲜多汁)', '铁板生煎 (焦香浓郁)', '生滚锁鲜 (清润鲜甜)', '先卤后烤 (软烂入味)', '酥脆金黄 (轻油薄脆)')
  cookingStyleOptions?: string[]; // 可选制作风格池
  craftStandardNote?: string; // 制作工艺/烹饪SOP要点
  customTags?: string[]; // 自定义标签 (如: ['手工现串', '秘制酱料', '炭火明档'])
  barcode?: string; // 商品条形码/EAN-13/69码/自编码 (支持扫码枪快速录入与扫码点单)
  isCloned?: boolean; // 快速复制标识
  variants?: DishVariant[]; // 菜品独立变体与多规格 (支持各变体单独图片样式与独立定价)
  // --- 工匠蓝图与图纸规格定制扩展 ---
  artisanCode?: string; // 工匠编号 (如: 'ARTISAN #04')
  refCode?: string; // 参考料号 (如: 'REF: SK-2048')
  specRatio?: string; // 核心配比 (如: 'RATIO 7:3')
  coreTemp?: string; // 核心温控 (如: 'TEMP 56°C')
  specComponents?: Array<{
    role: string;
    label: string;
    detail: string;
  }>; // 核心组分规格清单 (如: PATTY / BUN / SAUCE)
  flavorMetrics?: Array<{
    label: string;
    score: number;
    maxScore: number;
  }>; // 风味刻度方块指标 (如: 炙烤焦香 4/5)
  fieldSelectorMediaMap?: Record<string, FieldSelectorMediaItem>; // 口味风格、配菜、变体等字段选择器专属图库与线稿映射池
  // --- 食材产地溯源与商品配方 SOP 扩展 ---
  ingredients?: DishIngredientItem[]; // 食材原料配方清单
  inspectionBatchNo?: string; // 食品检验检疫批号/报告编号
  coldChainTemp?: string; // 冷链储运温控标准 (如: '全程 ≤ -18℃ 恒温深冷')
  supplierName?: string; // 供货商 / 品牌资质单位
  sopCookingSteps?: Array<{
    stepNumber: number;
    title: string;
    description: string;
    targetTemp?: string;
    durationSeconds?: number;
    keyCheckPoint?: string;
  }>; // 制作与烤制 SOP 详细工序
}

/** 单个食材原料配方溯源项定义 */
export interface DishIngredientItem {
  id: string;
  name: string; // 材料名称 (如: '澳洲M5谷饲和牛肉条')
  dosageGrams: number | string; // 用量克重或单位 (如: 120 或 '120g' / '1个' / '30ml')
  brand: string; // 食材品牌 (如: '澳大利亚AACO / 昆士兰特选')
  origin: string; // 原产地 / 种植或养殖基地 (如: '澳大利亚昆士兰州达令草场')
  productionDate: string; // 食材生产日期 (如: '2026-03-01')
  shelfLife: string; // 保质期 (如: '180天 (至2026-08-31)')
  freezerLocation: string; // 备注冷冻冰库位置 (如: '车载深冷冰库A-02层 (-18℃)')
  barcode: string; // 原料条形码 (如: '6970123456789')
  packagingPhotoUrl?: string; // 食材包装实物拍照存根主图
  packagingPhotos?: string[]; // 食材包装多角度拍照存根图库
  storageTemp?: string; // 储运温区 (如: '≤ -18℃ 冻藏')
  inspectionCertNo?: string; // 检疫合格证号/溯源凭证
  notes?: string; // 品控备注
}

export interface CartItem {
  cartItemId: string;
  dish: DishItem;
  quantity: number;
  selectedOptions: Record<string, string>;
  selectedVariant?: DishVariant; // 选中的菜品变体
  calculatedPrice: number;
  truckId?: string;
  truckName?: string;
  participantId?: string; // 堂食点餐成员ID (如 'owner', 'p-lin', 'p-qiang')
  participantName?: string; // 点餐人昵称 (如 '桌主 (你)', '同桌食客·小林', '同桌食客·阿强')
  participantAvatar?: string; // 点餐人头像
  cartId?: string; // 独立购物车标识 (如 '#CART-A1-01', '#CART-A1-02')
}

export interface OrderItemRecord {
  dishId?: string;
  name: string;
  quantity: number;
  price: number;
  options?: string;
  variantName?: string;
  variantPrice?: number;
  imageUrl?: string;
  serveStatus?: 'preparing' | 'cooking' | 'ready_to_serve' | 'served' | 'urged';
  prepProgress?: number; // 0 - 100
  station?: string; // e.g. "炭火炙烤档", "焗烤西点档", "冷饮吧台"
  serveTime?: string;
  // 划菜与补偿扩展
  isStruckOff?: boolean; // 商家是否划菜/作废该餐品
  struckOffReason?: string; // 划菜原因备注（原料沽清、烤糊重做失败、食客退菜等）
  struckOffAt?: string; // 划菜时间
  struckOffOperator?: string; // 划菜操作人
  compensationType?: 'refund' | 'free_gift' | 'replace_dish' | 'coupon' | 'none'; // 补偿方案
  compensationDetail?: string; // 补偿明细描述
  compensationAmount?: number; // 补偿/退款金额
  isCompensatoryGift?: boolean; // 是否是作为补偿赠送的新增餐品
  replacedFromDishName?: string; // 换购来源菜品名
  // 点餐人归属
  addedBy?: string; // 添加人昵称 (如: '桌主 (你)', '同桌食客·小林')
  addedByAvatar?: string; // 添加人头像
  participantId?: string; // 点餐人ID
}

export interface OrderAnomalyRecord {
  id: string;
  orderId: string;
  orderNo: string;
  node: 'placed' | 'accepted' | 'cooking' | 'ready' | 'delivering' | 'delivered' | 'refund';
  anomalyType:
    | 'unaccepted_timeout'
    | 'stock_out'
    | 'cooking_delay'
    | 'rider_rejected'
    | 'rider_unassigned_timeout'
    | 'delivery_unreachable'
    | 'delivery_weather_blocked'
    | 'refund_dispute'
    | 'manual_intervention';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  reportedBy: 'system' | 'merchant' | 'rider' | 'customer';
  reportedAt: string;
  status: 'pending_audit' | 'resolved' | 'escalated';
  resolutionNote?: string;
  fallbackActionTaken?: string;
}

export interface RiderRejectionRecord {
  id: string;
  orderId: string;
  orderNo: string;
  riderId: string;
  riderName: string;
  reason: string;
  reasonCode: 'out_of_range' | 'capacity_full' | 'extreme_weather' | 'vehicle_battery_fault' | 'dispatch_timeout' | 'other';
  rejectedAt: string;
  penaltyApplied?: boolean;
  remainingRejectionQuota?: number;
  reassignedTo?: string;
  bountyBump?: number;
}

export interface TruckLocationSnapshot {
  truckId: string;
  truckName: string;
  latitude: number;
  longitude: number;
  locationName: string;
  deliveryRadiusKm: number;
  snapshotAt: string;
}

export interface OrderAuditLogRecord {
  time: string;
  operator: string;
  role: 'system' | 'merchant' | 'rider' | 'customer' | 'audit_center';
  action: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  truckId?: string; // 租户隔离唯一键 (e.g. 'truck-01', 'truck-02')
  truckName: string;
  userId?: string;
  userPhone?: string;
  customerName?: string;
  courierId?: string; // 锁定骑手唯一UID
  items: OrderItemRecord[];
  totalAmount: number;
  // 独立分账账本隔离字段
  merchantNetPayout?: number; // 商家结算实收净额 (¥)
  riderDeliveryFee?: number; // 骑手运费提成 (¥)
  platformCommission?: number; // 平台抽成 (¥)
  status:
    | 'pending'
    | 'cooking'
    | 'ready'
    | 'rider_heading'
    | 'waiting_pickup'
    | 'picked_up'
    | 'delivering'
    | 'completed'
    | 'cancel_requested'
    | 'merchant_rejected'
    | 'rider_rejected'
    | 'reassigning_rider'
    | 'refund_pending'
    | 'refunded'
    | 'cancelled';
  statusText: string;
  createdTime: string;
  estimatedDeliveryTime: string;
  etaMinutes: number;
  courierName?: string;
  courierPhone?: string;
  deliveryAddress: string;
  progressPercent: number;
  stepIndex?: number;
  channelType?: 'delivery' | 'dine_in' | 'pickup';
  merchantAccepted?: boolean;
  riderAccepted?: boolean;
  nonRefundable?: boolean;
  refundStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  refundReason?: string;
  refundFeedback?: string;
  refundAppliedAt?: string;
  refundRejectReason?: string;
  refundPassedStep?: number;
  // Fallback & Contingency fields
  rejectionCount?: number;
  lastRejectionReason?: string;
  rejectionRecords?: RiderRejectionRecord[];
  anomalies?: OrderAnomalyRecord[];
  deliveryBounty?: number;
  isMerchantSelfDelivery?: boolean;
  isEscalatedToMerchant?: boolean;
  pickupCode?: string; // 骑手取件核销码 (例如 "8821" 或 "PK-8821")
  pickupShelfCode?: string; // 保温取餐架编号 (例如 "01 号保温取餐格")
  pickupVerifiedAt?: string; // 取餐核销时间戳
  pickupVerifiedBy?: string; // 核销执行者 (例如 "餐车后厨扫码枪" / "骑手扫码核验")
  auditLogs?: OrderAuditLogRecord[];
  tableCode?: string; // 堂食对应的桌台编码 (如 "A1", "B2")
  tableId?: string; // 堂食桌台ID
  tableZone?: string; // 堂食桌台区域 (如 "餐车外摆休闲区")
  serverName?: string; // 传菜服务员姓名
  channel?: 'delivery' | 'dine_in' | 'pickup' | string;
  statusType?: string;
  isConvertedFromDineIn?: boolean; // 是否由堂食审核转为外卖
  convertAuditReason?: string; // 堂食转外卖审核原因
  paymentMethod?: string; // 支付渠道标识 (如 'wechat', 'alipay', 'card', 'dcep', 'enterprise')
  paymentVoucher?: PaymentVoucher; // 安全支付防伪电子凭证与对账存证回执
  dinerCount?: number; // 堂食就餐人数
  truckLocation?: string; // 餐车停泊位置说明
  remark?: string; // 订单备注信息
  truckLocationSnapshot?: TruckLocationSnapshot; // 订单履约级停靠点与围栏快照 (隔离后续站台漂移客诉)
}

export interface BoundTableInfo {
  id: string;
  code: string; // e.g. "A1", "A2", "B1", "B2", "C1", "W01"
  name?: string; // e.g. "餐车外摆 01 号桌", "等位候补 01 号"
  zone: string; // e.g. "patio" | "bar" | "indoor" | "waiting"
  zoneLabel: string; // e.g. "餐车外摆区", "等位候补区"
  capacity: number;
  guests: number;
  serverName?: string;
  tableStatus?: any;
  isWaiting?: boolean; // 是否处于等位候补状态
  waitingCode?: string; // 等位编号 (如 "W01")
}

export interface WaitingTableItem {
  id: string;
  code: string; // e.g. "W01", "W02"
  name: string; // e.g. "等位候补 01 号"
  guests: number;
  phone?: string;
  guestName?: string;
  orderNo?: string;
  orderTime?: string;
  totalAmount?: number;
  orderItems?: TableDishItem[];
  preferredZone?: string;
  createdAt: string;
  elapsedMinutes?: number;
  status: 'waiting' | 'transferred' | 'cancelled';
  transferredToTableCode?: string;
  transferredAt?: string;
}

export interface TruckScheduleStop {
  time: string;
  location: string;
  address?: string;
  isCurrent?: boolean;
  status?: 'passed' | 'current' | 'upcoming';
  note?: string;
}

// ---- Merchant System Types ----
export type TableZone = 'all' | 'patio' | 'hall' | 'booth';
export type TableStatus = 'idle' | 'dining' | 'cleaning' | 'reserved';

export type TableFlowStage = 'placed' | 'kitchen_accepted' | 'cooking' | 'serving' | 'all_served' | 'completed';

export interface TableDishItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  options?: string;
  serveStatus?: 'preparing' | 'cooking' | 'ready_to_serve' | 'served' | 'urged';
  prepProgress?: number; // 0 - 100
  station?: string;
  serveTime?: string;
  imageUrl?: string;
  isChefSpecial?: boolean;
  isStruckOff?: boolean;
  struckOffReason?: string;
  struckOffAt?: string;
  compensationType?: 'refund' | 'free_gift' | 'replace_dish' | 'coupon' | 'none';
  compensationDetail?: string;
  compensationAmount?: number;
  isCompensatoryGift?: boolean;
  addedBy?: string;
}

export interface TableFlowNode {
  id: string;
  nodeKey: TableFlowStage;
  title: string;
  description: string;
  time?: string;
  status: 'completed' | 'current' | 'pending';
  operator?: string;
}

export interface TableItem {
  id: string;
  truckId?: string;
  code: string; // e.g. "A1", "B3"
  name: string;
  zone: 'patio' | 'hall' | 'booth';
  zoneLabel: string;
  capacity: number;
  currentGuests?: number;
  status: TableStatus;
  elapsedMinutes?: number;
  serverName?: string;
  totalAmount?: number;
  orderNo?: string; // 关联堂食订单号，便于快速检索与核销 (如 "UR-DIN-9821")
  orderTime?: string; // 开台/下单时间
  tablePhase?: TableFlowStage; // 当前状态流转节点
  orderItems?: TableDishItem[];
  flowNodes?: TableFlowNode[];
  reservation?: {
    guestName: string;
    phone: string;
    timeText: string;
    countdownMinutes: number;
  };
  /** ===== 桌台二维码体系（T2）=====
   *  三者必须物理同框印刷：人眼可读桌号 + 二维码 + 人工兜底短码，
   *  避免"二维码在桌上、桌号在墙上"导致对不上账。 */
  /** 人眼可读短码，如 "A1-8F3K"（二维码破损时的人工录入通道） */
  qrCode?: string;
  /** 当前有效扫码令牌 */
  qrToken?: string;
  /** 令牌版本，轮换时递增 */
  qrVersion?: number;
  /** 桌码点餐开关 */
  qrEnabled?: boolean;
  qrIssuedAt?: string;
  /** 已退役令牌（用于轮换后的宽限期校验，仅保留最近若干条） */
  qrHistory?: Array<{ token: string; version: number; retiredAt: string }>;
  /** 当前打开的桌台会话，便于矩阵页一键下钻 */
  activeSessionId?: string;
}

export interface KdsDishTimelineNode {
  step: 'ordered' | 'prep' | 'cooking' | 'ready';
  label: string;
  timestamp: string;
  operator?: string;
  note?: string;
}

export interface KdsTicketItem {
  id: string;
  dishName: string;
  quantity: number;
  options?: string;
  notes?: string;
  isCompleted: boolean;
  orderTime?: string; // 下单时间
  prepStartTime?: string; // 备料开始时间
  cookingStartTime?: string; // 上灶烹制/炭烤时间
  servedTime?: string; // 出餐完成时间
  totalDurationSeconds?: number; // 下单到出餐总耗时(秒)
  timeline?: KdsDishTimelineNode[]; // 精确各环节时间线记录
  statusStep?: 'ordered' | 'prep' | 'cooking' | 'ready';
}

export interface KdsTicket {
  id: string;
  ticketNo: string;
  tableOrChannel: string;
  channelType: 'dine_in' | 'delivery' | 'pickup';
  orderTime: string;
  elapsedMinutes: number;
  status: 'cooking' | 'ready';
  pickupCode?: string;
  pickupShelfCode?: string;
  items: KdsTicketItem[];
  completedAt?: string; // 整单出餐完成时刻
  totalCookSeconds?: number;
  isUrged?: boolean;
  urgeCount?: number;
  urgedAt?: number;
}

export interface HeldOrder {
  id: string;
  orderNo: string;
  tableCode: string;
  tableName: string;
  serverName: string;
  startTime: string;
  heldMinutes: number;
  totalAmount: number;
  isHighRisk: boolean;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  lastReminderAt?: string;
  convertedToTakeaway?: boolean;
}

// ---- Rider System Types ----
export interface PoolDeliveryOrder {
  id: string;
  orderNo: string;
  truckId?: string;
  userId?: string;
  userPhone?: string;
  customerName?: string;
  originName: string;
  originAddress: string;
  distanceToOriginMeters: number;
  destinationName: string;
  destinationAddress: string;
  distanceKm: number;
  itemsSummary: string;
  itemCount: number;
  estimatedEarnings: number;
  baseFee: number;
  distanceFee: number;
  truckSubsidy: number;
  tipFee?: number;
  urgentTag?: string;
  isTruckSpecial: boolean;
  publishedTimeAgo: string;
  expectedDeliveryTime: string;
  pickupCode?: string;
  pickupShelfCode?: string;
}

export interface ActiveDeliveryOrder {
  id: string;
  orderNo: string;
  truckId?: string;
  userId?: string;
  phase: 'pickup' | 'dropoff';
  pickupCode?: string;
  pickupShelfCode?: string;
  pickupVerified?: boolean;
  pickupVerifiedAt?: string;
  truckName: string;
  truckAddress: string;
  truckDistanceMeters: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  addressDistanceKm: number;
  items: {
    name: string;
    quantity: number;
    price: number;
    checked?: boolean;
  }[];
  totalPrice: number;
  courierEarnings: number;
  customerNote?: string;
  etaMinutes: number;
  speedKmh: number;
  routeProgress: number; // 0 - 100
}

export interface TruckInfo {
  id: string;
  name: string;
  code: string;
  status: 'roaming' | 'stationary' | 'offline';
  statusText: string;
  distanceKm: number;
  latitude?: number;
  longitude?: number;
  walkingTimeMin?: number;
  currentLocationName: string;
  nextStopName: string;
  nextStopEta: string;
  speedKmh: number;
  routeProgress: number;
  temperature: number;
  batteryPercent: number;
  totalOrdersToday: number;
  rating?: number;
  reviewCount?: number;
  chefName?: string;
  chefTitle?: string;
  chefBio?: string;
  hygieneLevel?: string;
  equipmentSpecs?: string[];
  schedule?: TruckScheduleStop[];
  coverImageUrl?: string;
}

// ---- Material & Purchase Types ----
export interface MaterialItem {
  id: string;
  sku: string;
  name: string;
  category: '肉类原料' | '海鲜水产' | '蔬菜品类' | '豆制品类' | '饮品辅料' | '消耗包材' | '主食面点' | '调料调味';
  currentStock: number;
  safetyStock: number;
  reorderSuggestion: number;
  unit: string;
  purchasePrice: number;
  storageLocation: string;
  supplier: string;
  supplierSuggest?: boolean;
  supplierContact?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  supplierLeadDays?: number; // 供货周期(天)
  supplierRating?: number; // 合作商星级 1-5
  purchaseCount: number;
  lastPurchased: string;
  status: 'warning' | 'normal' | 'in_transit' | 'restocked';
  stockStatus?: 'in_stock' | 'out_of_stock' | 'pending_in';
  isInStock?: boolean;
  standardYieldRate?: number;
  // 穿串加工与在售状态
  isFinishedSkewer?: boolean; // 是否已是成品串串原料
  yieldSkewerCount?: number; // 制成了多少串
  skewerLocation?: string; // 成品串串存放位置 (如 餐车急冻冷藏抽屉 B-02)
  isOnSale?: boolean; // 有无在售上架
  linkedDishId?: string; // 关联在售菜品 ID
  linkedDishName?: string; // 关联在售菜品名称
  isUsed?: boolean; // 是否使用了这个原料
  usedQuantity?: number; // 用了多少 (kg/单位)
  remainingStock?: number; // 剩余库存

  // 采购渠道与商品基本信息
  platformName?: string; // 平台名称 (美菜网 / 快驴 / 盒马 / 批发市场 / 批发市场小程序)
  procurementMethod?: string; // 采购方式 (平台直采 / 批发市场线下 / 批发市场小程序 / 厂家配送)
  storageMethod?: string; // 存储方式 (常温通风 / 冷藏 0~4℃ / 微冻 -2~0℃ / 冷冻 -18℃以下)
  flavor?: string; // 产品口味 (如 奥尔良、麻辣、孜然、原味、秘制黑椒等)
  productForm?: string; // 产品形态 (原切生肉块 / 腌制生胚 / 手工穿制串 / 半熟预炸串 / 真空装)
  description?: string; // 商品描述信息

  // 规格与公斤价格换算
  brand?: string; // 品牌名称 (如 恒阳、双汇、正大、蜀海、安井等)
  specGramsPerPack?: number; // 规格：单包克重 (g)
  specPacksPerBox?: number; // 规格：每件/箱多少包
  specBoxes?: number; // 规格：采购件/箱数
  specCalculatedKg?: number; // 换算：约等于多少公斤 (kg)
  pricePerKg?: number; // 价格：每公斤是多少钱 (元/kg)

  // 物流履约
  destinationLocation?: string; // 物流配送到指定的地点 (如 静安大悦城餐车仓)
  orderTime?: string; // 下单时间 (YYYY-MM-DD HH:mm)
  deliveryTime?: string; // 送达时间 (YYYY-MM-DD HH:mm)
  logisticsStatus?: 'pending' | 'shipping' | 'delivered' | 'inspected'; // 物流配送状态

  // 产品资质与标准溯源
  standardCode?: string; // 产品标准号 (如 GB/T 20575)
  productionDate?: string; // 生产日期
  manufacturer?: string; // 生产商
  productionAddress?: string; // 生产地址
  originPlace?: string; // 产地 (如 山东潍坊、内蒙古赤峰)
  hotline?: string; // 销售/服务热线

  shelfLifeDays?: number;
  storageTempZone?: string; // 温区 (如 '冷冻 -18℃', '冷藏 0-4℃', '常温通风')
  minOrderQty?: number; // 起订量
  batchNo?: string;
  spec?: string;
  expiryDate?: string;
  remark?: string;
  updatedAt?: string;
}

export interface SkewerProductionLog {
  id: string;
  materialId: string;
  materialName: string;
  usedAmountKg: number;
  yieldSkewerCount: number;
  avgGramsPerSkewer: number;
  costPerSkewer: number;
  storageLocation: string;
  isOnSale: boolean;
  linkedDishName?: string;
  operator: string;
  timestamp: string;
  notes?: string;
}

export interface PurchaseRecord {
  id: string;
  purchaseNo: string;
  timestamp: string;
  itemName: string;
  category: string;
  supplier: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  status: 'completed' | 'in_transit' | 'pending_approval';
  buyer: string;
  notes?: string;

  // 扩展采购与规格溯源信息
  platformName?: string;
  procurementMethod?: string;
  brand?: string;
  storageMethod?: string;
  flavor?: string;
  productForm?: string;
  description?: string;
  specGramsPerPack?: number;
  specPacksPerBox?: number;
  specBoxes?: number;
  specCalculatedKg?: number;
  pricePerKg?: number;
  destinationLocation?: string;
  orderTime?: string;
  deliveryTime?: string;
  standardCode?: string;
  productionDate?: string;
  manufacturer?: string;
  productionAddress?: string;
  originPlace?: string;
  hotline?: string;
}

// ---- SKU Digital Params Types ----
export interface SkuHistoryLog {
  timestamp: string;
  field: string;
  before: string;
  after: string;
  operator: string;
}

export interface SkuParamItem {
  id: string;
  sku: string;
  name: string;
  category: '肉类原料' | '海鲜水产' | '蔬菜品类' | '豆制品类' | '饮品辅料' | '消耗包材' | '主食面点' | '调料调味';
  purchasePrice: number; // 采购单价 (元/单位)
  safetyStock: number; // 安全库存警戒线
  reorderSuggestion: number; // 建议补货量
  shelfLifeDays: number; // 保质期天数
  currentStock: number; // 当前在库数量
  unit: string; // 单位 (kg/只/瓶/个)
  standardYieldRate: number; // 标准出肉率/出成率 (0.0 - 1.0, 如 0.75 为 75%)
  storageLocation: string; // 存放库位与温区
  stockValue: number; // 在库理论资产价值
  stockStatus?: 'in_stock' | 'out_of_stock' | 'pending_in'; // 在库状态: 在库现货 | 未在库/缺货 | 待入库/在途
  isInStock?: boolean; // 是否在库布尔值
  batchNo?: string; // 生产批次编号 (如 LOT-20260829-01)
  spec?: string; // 规格包装 (如 25kg/箱, 1kg/袋)
  supplier?: string; // 直通供货商
  skewersPerKg?: number; // 标杆每公斤出串数 (串/kg)
  productionDate?: string; // 生产/入库批次日期
  expiryDate?: string; // 到期日期
  meatYieldDesc?: string; // 出肉属性备注说明
  imageUrl?: string;
  sparklineHistory?: number[];
  historyLogs?: SkuHistoryLog[];
}

export interface CostCompositionItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
}

export interface CraftHistoryLink {
  date: string;
  type: 'purchase' | 'loss';
  summary: string;
  amount: number;
  operator: string;
}

export interface ProcessingLossRecord {
  id: string;
  date: string;
  materialName: string;
  category: string;
  grossWeight: number; // 毛料重量 kg
  netWeight: number; // 净料重量 kg
  yieldRate: number; // 实际出成率 = 净/毛 (0.0 - 1.0)
  standardRate: number; // 标准出成率阈值
  lossRate: number; // 损耗率
  operator: string;
  lossKg: number;
  unitPrice: number; // 元/kg
  lossAmount: number; // 损耗金额 ¥
  lossReason: string;
  notes: string;
  status: 'normal' | 'warning' | 'critical';
}

export interface LossTrackingRecord {
  id: string;
  date: string;
  itemName: string;
  category: 'grill' | 'expire' | 'staff' | 'spill' | 'other';
  categoryLabel: string;
  quantity: number;
  unit: string;
  estimatedCost: number; // 估算成本 ¥
  responsiblePerson: string;
  station: 'grill' | 'cold' | 'bar' | 'all';
  reason: string;
  isFromRefund?: boolean;
}

// ---- Inventory & Stocktake Types ----
export interface StocktakeItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  systemQty: number; // 理论结存 (期初+进-销-损)
  actualQty: number; // 实盘数量
  variance: number; // 差异 = 实盘 - 系统
  unitCost: number;
  varianceCost: number;
  status: 'ok' | 'investigate';
  abcClass: 'A' | 'B' | 'C';
  locked: boolean;
}

export interface StoreTransferRecord {
  id: string;
  transferNo: string;
  date: string;
  fromStore: string;
  toStore: string;
  itemName: string;
  quantity: number;
  unit: string;
  operator: string;
  status: 'completed' | 'in_transit';
}

// ---- Craft SOP & Recipe Types ----
export interface MarinadeIngredient {
  name: string;
  qtyPerKg: number;
  unit: string;
  note?: string;
}

export interface CraftPrepStep {
  step: number;
  title: string;
  desc: string;
  durationMin: number;
  keyMetric: string;
}

export interface CraftStandardItem {
  id: string;
  name: string;
  category: 'meat' | 'seafood' | 'veggie' | 'tofu' | 'veg' | 'special';
  categoryName: string;
  tasteProfile: string;
  pricePerSkewer: number;
  icon?: string;
  // 选料与切配
  recommendedPart: string;
  fatLeanRatio: string;
  cutSize: string;
  cutDirection: string;
  piecesPerSkewer: number;
  // 腌制配方
  marinadeType: string;
  marinadeIngredients: MarinadeIngredient[];
  marinadeTemp: number; // ℃
  marinadeRecommendedMin: number; // 分钟
  marinadeNotes: string;
  // 穿串与烤制 SOP
  skewerSpec: string;
  threadingMethod: string;
  grillType: string;
  grillTemp: string; // e.g. "200-220℃ 表面覆白灰"
  grillTimeMin: number;
  turningMethod: string;
  seasoningTiming: string;
  donenessCheck: string;
  smokeAndOilNote: string; // 避坑提示
  prepSteps: CraftPrepStep[];
  linkedSauceNames: string[];
  standardWeightG: number;
  yieldRate?: number; // e.g. 0.85 (85%)
  skewersPerKg?: number; // e.g. 28.3
  estimatedProfit?: number; // e.g. 2.20
  subCategory?: string; // e.g. '猪肉类'
  flavorTag?: string; // e.g. '蜜汁', '原味', '香辣'
  flavorColor?: 'orange' | 'white' | 'red' | 'green' | 'amber' | 'gray' | 'slate';
}

export interface SauceRecipeItem {
  id: string;
  name: string;
  type: '撒料' | '酱料';
  usage: string;
  ingredients: string;
  shelfLifeDays: number;
  keyTips: string;
}

// ---- Shift & Refund & Reservation Types ----
export interface ShiftRecord {
  id: string;
  shiftNo: string;
  startTime: string;
  endTime: string;
  closedBy: string;
  successor: string;
  grossSales: number;
  wechatSales: number;
  alipaySales: number;
  cashSales: number;
  actualCash: number;
  cashDiff: number;
  diffReason: 'none' | 'count_error' | 'change_error' | 'unrecorded_sale' | 'discount_mis';
  diffReasonText: string;
  orderCount: number;
  note?: string;
}

export interface RefundRecord {
  id: string;
  refundNo: string;
  orderNo: string;
  date: string;
  amount: number;
  method: string;
  reasonCategory: string;
  reasonNote: string;
  notifyKitchen: boolean;
  authorizedBy: string;
  cookedIsLoss: boolean;
  items: { name: string; quantity: number; price: number }[];
  status: 'approved' | 'rejected' | 'pending';
}

export interface ReservationItem {
  id: string;
  guestName: string;
  phone: string;
  guestCount: number;
  tableCode: string;
  reservationTime: string;
  countdownMin: number;
  depositAmount: number;
  depositStatus: 'paid' | 'unpaid' | 'refunded';
  status: 'confirmed' | 'arrived' | 'cancelled';
  note?: string;
}

// ---- Audit & Offline Outbox Types ----
export interface AuditLogItem {
  id: string;
  timestamp: string;
  operator: string;
  role: string;
  actionType: 'create' | 'update' | 'delete' | 'lock' | 'auth';
  targetModule: string;
  targetItem: string;
  description: string;
  beforeValue?: string;
  afterValue?: string;
}

export interface OutboxItem {
  id: string;
  timestamp: string;
  action: string;
  target: string;
  payloadSummary: string;
  sign: string;
  status: 'queued' | 'synced' | 'failed';
}

export interface DeliverySettings {
  minDeliveryAmount: number;
  requirePostDiscountAmount: boolean;
  freeDeliveryThreshold: number;
  deliveryFee: number;
  excludeDiscountsFromMinSpend: boolean;
  minimumNoticeText?: string;
  updatedAt?: string;
}

// ---- Printing & Station Types ----
export type PrinterStationType = 'grill' | 'bar' | 'fry' | 'cashier' | 'pass';
export type PrinterConnectionType = 'bluetooth' | 'usb' | 'network' | 'wifi';

export interface PrinterStation {
  id: string;
  name: string;
  stationType: PrinterStationType;
  connectionType?: PrinterConnectionType; // 蓝牙 / USB / 网口 / WiFi
  deviceIp: string;
  port?: number; // 默认 9100
  macAddress?: string;
  usbVendorId?: string;
  usbProductId?: string;
  modelBrand?: string;
  paperWidth: '58mm' | '80mm';
  copies: number;
  autoPrintOnNewOrder: boolean;
  categoriesHandled: string[]; // e.g. ['skewers', 'western', 'drinks', 'snacks']
  status: 'online' | 'offline' | 'warning';
  lastPrintedAt?: string;
  pingLatencyMs?: number;
  batteryLevel?: number;
  sensorStatus?: {
    paperOut?: boolean;
    coverOpen?: boolean;
    overheated?: boolean;
  };
}

export interface BluetoothPrinterDevice {
  id: string;
  name: string;
  connectionType?: PrinterConnectionType;
  macAddress?: string;
  ipAddress?: string;
  port?: number;
  usbVendorId?: string;
  usbProductId?: string;
  paperWidth: '58mm' | '80mm';
  status: 'connected' | 'disconnected' | 'connecting';
  batteryLevel?: number; // e.g. 85
  signalRssi?: number; // e.g. -58 dBm
  pingLatencyMs?: number;
  isDefault?: boolean;
  autoPrintNewOrders?: boolean;
  lastPrintedAt?: string;
  modelBrand: string; // e.g. 'Gprinter 佳博 58便携票据机', 'Xprinter 芯烨 XP-58IIH'
  firmwareVersion?: string;
  copies?: number;
}

export interface DetectedPrinterDevice {
  id: string;
  name: string;
  connectionType: PrinterConnectionType;
  modelBrand: string;
  identifier: string; // MAC or IP:Port or USB VID:PID
  paperWidth: '58mm' | '80mm';
  status: 'online' | 'offline' | 'warning' | 'paper_out' | 'cover_open';
  pingLatencyMs?: number;
  rssi?: number;
  batteryLevel?: number;
  rawDeviceRef?: any;
  lastDetectedAt: string;
  suggestedStation?: PrinterStationType;
}

export interface BluetoothPrintTaskLog {
  id: string;
  timestamp: string;
  printerName: string;
  connectionType?: PrinterConnectionType;
  orderNo: string;
  bytesCount: number;
  status: 'success' | 'failed' | 'transmitting';
  taskType: 'order_receipt' | 'self_test' | 'beep_test' | 'feed_lines' | 'cut_paper';
  detail?: string;
}

export interface ReceiptTemplateConfig {
  headerTitle: string;
  subHeader: string;
  showOrderNo: boolean;
  showTableCode: boolean;
  showDishDetails: boolean;
  showOptionNotes: boolean;
  showPrice: boolean;
  showQrCode: boolean;
  qrCodeType: 'wifi' | 'invoice' | 'wechat' | 'pickup';
  wifiName: string;
  wifiPassword?: string;
  footerNotes: string;
  customerCopyText: string;
  kitchenCopyText: string;
  // 三大就餐场景专属配置 (堂食、自提、外卖)
  activePreviewChannel?: 'auto' | 'dine_in' | 'pickup' | 'delivery';
  // 堂食 (Dine-in)
  dineInTitle?: string;
  showDineInTableBig?: boolean; // 桌号大号字体 size('large')
  showDineInGuests?: boolean; // 就餐人数 (如 4位)
  dineInZoneNotice?: string; // 外摆区提示
  // 自提 (Self-Pickup)
  pickupTitle?: string;
  showPickupCodeBig?: boolean; // 取餐码大号字体框线
  showPickupShelf?: boolean; // 保温格/自提柜位置
  pickupLockerCode?: string; // 默认自提格
  // 外卖 (Delivery)
  deliveryTitle?: string;
  showDeliveryAddressBig?: boolean; // 配送地址大号字体 size('large')
  showDeliveryRiderNotes?: boolean; // 骑手联络/备注
  showFoodSafetySeal?: boolean; // 食安封签
}

// ---- Member CRM & Loyalty Types ----
export type MemberTier = 'regular' | 'silver' | 'gold' | 'diamond';

export interface MemberRecord {
  id: string;
  memberNo: string;
  name: string;
  phone: string;
  avatarUrl?: string;
  tier: MemberTier;
  tierName: string;
  discountRate: number; // e.g. 0.95 for 95折
  balance: number; // 储值余额
  points: number; // 积分
  totalSpent: number; // 累计消费
  orderCount: number; // 消费频次
  lastVisit: string;
  registeredAt: string;
  tags: string[];
  couponCount: number;
}

export interface MemberRechargeRecord {
  id: string;
  recordNo: string;
  memberId: string;
  memberName: string;
  phone: string;
  rechargeAmount: number; // 充值本金
  bonusAmount: number; // 赠送金额
  totalReceived: number; // 实际到账
  paymentMethod: 'wechat' | 'alipay' | 'cash' | 'pos';
  operator: string;
  timestamp: string;
  note?: string;
}

export interface MemberPointsRecord {
  id: string;
  memberId: string;
  memberName: string;
  changeType: 'earn' | 'redeem' | 'adjust';
  points: number;
  balanceAfter: number;
  reason: string;
  timestamp: string;
}

// ---- Staff & RBAC Types ----
export type StaffRole = 'manager' | 'cashier' | 'grill_chef' | 'barista' | 'rider';

export interface StaffMember {
  id: string;
  staffNo: string;
  name: string;
  phone: string;
  avatarUrl?: string;
  role: StaffRole;
  roleTitle: string;
  permissions: string[];
  status: 'active' | 'on_break' | 'off_duty';
  shiftStart?: string;
  workHoursToday: number;
  monthlySales: number;
  monthlyCommission: number;
  joinedDate: string;
}

// ---- Calling & Queue Types ----
export type QueueType = 'small' | 'medium' | 'large' | 'pickup';

export interface QueueTicket {
  id: string;
  queueNo: string; // e.g. "A01", "B05", "P108"
  queueType: QueueType;
  guestName?: string;
  phone?: string;
  partySize: number;
  waitTimeMin: number;
  status: 'waiting' | 'called' | 'seated' | 'passed' | 'completed' | 'temp_void' | 'perm_void';
  calledCount: number;
  createdAt: string; // 初始取号时间 (ISO 或时间文本)
  takeTime?: string;
  calledAt?: string;
  voidAt?: string; // 作废时间
  voidReason?: string; // 作废原因
  customWaitMin?: number; // 商家自定义设置的该单等位时间(分钟)
  estimatedWaitMin?: number; // 系统自动计算还需等待时长(分钟)
  note?: string;
}

export * from './types/user';



