import { Order } from '../types';

export interface MerchantCommissionConfig {
  truckId: string;
  truckName: string;
  category: string;
  platformRatePercent: number; // 平台抽成比例 (%) e.g. 5.0 (5%)
  fixedServiceFee: number; // 单笔固定技术服务费 (元) e.g. 0.50
  riderDeliverySharePercent: number; // 骑手运费提成比例 (%) e.g. 80.0
  status: 'active' | 'suspended' | 'pending_audit';
  settlementCycle: 'realtime' | 'daily' | 'weekly';
  contactPerson: string;
  contactPhone: string;
  licenseNo: string;
  depositAmount: number; // 商家履约保证金 (元)
  joinDate: string;
  totalOrdersCount?: number;
  totalGmvAmount?: number;
  healthScore?: number; // 98分
  avgResponseSeconds?: number; // 14s
}

export interface GlobalCommissionSettings {
  defaultPlatformRatePercent: number; // 默认平台抽成比例 (%) e.g. 5.0%
  defaultFixedServiceFee: number; // 默认单笔技术服务费 (元) e.g. 0.50
  defaultRiderSharePercent: number; // 默认骑手提成比例 (%) e.g. 80.0%
  autoSettlementEnabled: boolean;
  minWithdrawAmount: number; // 最低提现门槛 e.g. 100元
  penaltyRatePercent: number; // 违规罚息扣点率 (%) e.g. 1.5%
  refundCommissionDeduction: 'full_refund' | 'split_loss' | 'merchant_covered';
  updatedAt: string;
}

export interface OrderCommissionSplit {
  orderId: string;
  orderNo: string;
  truckName: string;
  customerName: string;
  totalAmount: number; // 实付总额
  platformCommission: number; // 平台抽成 (¥)
  platformRateUsed: number; // 适用抽成比例 (%)
  fixedFeeUsed: number; // 适用固定服务费 (¥)
  riderDeliveryFee: number; // 骑手运费提成 (¥)
  riderShareRateUsed: number; // 骑手提成分配比例 (%)
  merchantNetPayout: number; // 商家结算实收净额 (¥) = Total - Platform - Rider
  settlementStatus: 'settled' | 'pending' | 'refund_adjusted';
  createdAt: string;
  channelType: string;
}

const GLOBAL_SETTINGS_KEY = 'obsidian_global_commission_settings';
const MERCHANTS_CONFIG_KEY = 'obsidian_merchant_commission_configs';
const COMMISSION_EVENT_NAME = 'obsidian_commission_update_event';

// Default initial multi-merchant list
const INITIAL_MERCHANTS: MerchantCommissionConfig[] = [
  {
    truckId: 'truck-01',
    truckName: '黑曜石餐车 · 南广场总站 (01号旗舰车)',
    category: '炭火烧烤 & 日式日烧',
    platformRatePercent: 5.0,
    fixedServiceFee: 0.5,
    riderDeliverySharePercent: 85.0,
    status: 'active',
    settlementCycle: 'realtime',
    contactPerson: '陆浩天 (旗舰店长)',
    contactPhone: '13817298811',
    licenseNo: 'SH-FD-2026-88091',
    depositAmount: 10000,
    joinDate: '2026-01-15',
    totalOrdersCount: 1420,
    totalGmvAmount: 128450.0,
    healthScore: 99,
    avgResponseSeconds: 12
  },
  {
    truckId: 'truck-02',
    truckName: '黑曜石移动分舵 · 科技园2号车',
    category: '西餐烤肉 & 汉堡轻食',
    platformRatePercent: 4.5,
    fixedServiceFee: 0.5,
    riderDeliverySharePercent: 80.0,
    status: 'active',
    settlementCycle: 'daily',
    contactPerson: '周维康',
    contactPhone: '13918239922',
    licenseNo: 'SH-FD-2026-88102',
    depositAmount: 8000,
    joinDate: '2026-02-01',
    totalOrdersCount: 960,
    totalGmvAmount: 84200.0,
    healthScore: 96,
    avgResponseSeconds: 18
  },
  {
    truckId: 'truck-03',
    truckName: '黑曜石夜市快闪车 · 滨江潮玩站',
    category: '特色串烧 & 精酿饮品',
    platformRatePercent: 6.0,
    fixedServiceFee: 0.8,
    riderDeliverySharePercent: 82.0,
    status: 'active',
    settlementCycle: 'daily',
    contactPerson: '林筱晨',
    contactPhone: '13761209933',
    licenseNo: 'SH-FD-2026-88219',
    depositAmount: 5000,
    joinDate: '2026-02-18',
    totalOrdersCount: 680,
    totalGmvAmount: 59300.0,
    healthScore: 94,
    avgResponseSeconds: 22
  },
  {
    truckId: 'truck-04',
    truckName: '极夜西西里青柠 · 专属饮品餐车',
    category: '冷萃咖啡 & 特调微气泡',
    platformRatePercent: 3.8,
    fixedServiceFee: 0.3,
    riderDeliverySharePercent: 78.0,
    status: 'active',
    settlementCycle: 'realtime',
    contactPerson: '苏曼 (首席调饮师)',
    contactPhone: '13601827744',
    licenseNo: 'SH-FD-2026-88301',
    depositAmount: 6000,
    joinDate: '2026-03-01',
    totalOrdersCount: 510,
    totalGmvAmount: 32400.0,
    healthScore: 98,
    avgResponseSeconds: 15
  },
  {
    truckId: 'truck-05',
    truckName: '黑曜石新加盟 · 大学城3号餐车',
    category: '焗烤主食 & 炸物小吃',
    platformRatePercent: 5.5,
    fixedServiceFee: 0.5,
    riderDeliverySharePercent: 80.0,
    status: 'pending_audit',
    settlementCycle: 'weekly',
    contactPerson: '王浩',
    contactPhone: '13599812255',
    licenseNo: 'SH-FD-2026-88415',
    depositAmount: 3000,
    joinDate: '2026-03-10',
    totalOrdersCount: 45,
    totalGmvAmount: 3820.0,
    healthScore: 91,
    avgResponseSeconds: 35
  }
];

const DEFAULT_GLOBAL_SETTINGS: GlobalCommissionSettings = {
  defaultPlatformRatePercent: 5.0,
  defaultFixedServiceFee: 0.5,
  defaultRiderSharePercent: 80.0,
  autoSettlementEnabled: true,
  minWithdrawAmount: 100,
  penaltyRatePercent: 1.5,
  refundCommissionDeduction: 'full_refund',
  updatedAt: new Date().toISOString()
};

function notifyCommissionUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COMMISSION_EVENT_NAME));
  }
}

/**
 * 获取全局平台抽佣与分账设置
 */
export function getGlobalCommissionSettings(): GlobalCommissionSettings {
  try {
    const raw = localStorage.getItem(GLOBAL_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_GLOBAL_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_GLOBAL_SETTINGS;
}

/**
 * 保存全局平台抽佣与分账设置
 */
export function saveGlobalCommissionSettings(settings: Partial<GlobalCommissionSettings>): GlobalCommissionSettings {
  const current = getGlobalCommissionSettings();
  const next: GlobalCommissionSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  notifyCommissionUpdate();
  return next;
}

/**
 * 获取全平台所有商户/餐车抽佣与资质档案
 */
export function getMerchantCommissionConfigs(): MerchantCommissionConfig[] {
  try {
    const raw = localStorage.getItem(MERCHANTS_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(MERCHANTS_CONFIG_KEY, JSON.stringify(INITIAL_MERCHANTS));
  } catch {
    // ignore
  }
  return INITIAL_MERCHANTS;
}

/**
 * 保存或更新单个商家/餐车的抽成与资质档案
 */
export function saveMerchantCommissionConfig(config: MerchantCommissionConfig): MerchantCommissionConfig[] {
  const current = getMerchantCommissionConfigs();
  const idx = current.findIndex((m) => m.truckId === config.truckId);
  let next: MerchantCommissionConfig[];
  if (idx >= 0) {
    next = [...current];
    next[idx] = { ...next[idx], ...config };
  } else {
    next = [config, ...current];
  }
  try {
    localStorage.setItem(MERCHANTS_CONFIG_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  notifyCommissionUpdate();
  return next;
}

/**
 * 批量更新商户抽佣率
 */
export function updateMerchantRate(truckId: string, newRatePercent: number, fixedFee?: number): void {
  const merchants = getMerchantCommissionConfigs();
  const found = merchants.find((m) => m.truckId === truckId);
  if (found) {
    found.platformRatePercent = Number(newRatePercent.toFixed(2));
    if (fixedFee !== undefined) found.fixedServiceFee = Number(fixedFee.toFixed(2));
    saveMerchantCommissionConfig(found);
  }
}

/**
 * 切换商户营业/管制状态
 */
export function toggleMerchantStatus(truckId: string, status: 'active' | 'suspended' | 'pending_audit'): void {
  const merchants = getMerchantCommissionConfigs();
  const found = merchants.find((m) => m.truckId === truckId);
  if (found) {
    found.status = status;
    saveMerchantCommissionConfig(found);
  }
}

/**
 * 精确计算单笔订单的三端分账拆解 (平台抽佣、骑手配送提成、商家实收)
 */
export function calculateOrderCommissionSplit(order: Order, customConfig?: MerchantCommissionConfig): OrderCommissionSplit {
  const globalSettings = getGlobalCommissionSettings();
  const merchants = getMerchantCommissionConfigs();
  const matchedMerchant = customConfig || merchants.find((m) => m.truckName === order.truckName || order.truckName?.includes(m.truckName)) || merchants[0];

  const totalAmount = Math.max(0, order.totalAmount || 0);
  const platformRateUsed = matchedMerchant?.platformRatePercent ?? globalSettings.defaultPlatformRatePercent;
  const fixedFeeUsed = matchedMerchant?.fixedServiceFee ?? globalSettings.defaultFixedServiceFee;
  const riderShareRateUsed = matchedMerchant?.riderDeliverySharePercent ?? globalSettings.defaultRiderSharePercent;

  // 平台抽佣 = 订单实付 * 比例 + 单笔技术服务费
  const rawPlatformCommission = totalAmount * (platformRateUsed / 100) + fixedFeeUsed;
  const platformCommission = Number(Math.min(totalAmount * 0.3, Math.max(0.1, rawPlatformCommission)).toFixed(2));

  // 骑手配送提成 (如果是外卖单则核算运费提成，堂食/自提则为0)
  const isDelivery = (order.channelType || 'delivery') === 'delivery';
  const baseDeliveryFee = isDelivery ? 6.0 : 0.0;
  const riderDeliveryFee = Number((baseDeliveryFee * (riderShareRateUsed / 100) + (order.deliveryBounty || 0)).toFixed(2));

  // 商家实收净额 = 实付总额 - 平台抽佣 - 骑手提成 (若退款则标记异常)
  const isRefunded = order.status === 'refunded';
  const merchantNetPayout = isRefunded ? 0.0 : Number(Math.max(0, totalAmount - platformCommission - (isDelivery ? riderDeliveryFee * 0.3 : 0)).toFixed(2));

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    truckName: order.truckName || matchedMerchant.truckName,
    customerName: order.customerName || '食客',
    totalAmount,
    platformCommission: isRefunded ? 0 : platformCommission,
    platformRateUsed,
    fixedFeeUsed,
    riderDeliveryFee: isRefunded ? 0 : riderDeliveryFee,
    riderShareRateUsed,
    merchantNetPayout,
    settlementStatus: isRefunded ? 'refund_adjusted' : order.status === 'completed' ? 'settled' : 'pending',
    createdAt: order.createdTime || new Date().toLocaleTimeString(),
    channelType: order.channelType || 'delivery'
  };
}

/**
 * 汇总全平台所有订单的财务流水大盘
 */
export function calculateAllOrdersCommissionSummary(orders: Order[]) {
  const globalSettings = getGlobalCommissionSettings();
  const merchants = getMerchantCommissionConfigs();

  let totalGmv = 0;
  let totalPlatformCommission = 0;
  let totalMerchantNetPayout = 0;
  let totalRiderDeliveryIncome = 0;
  let settledOrdersCount = 0;
  let pendingOrdersCount = 0;
  let refundAdjustedCount = 0;

  const splits: OrderCommissionSplit[] = orders.map((ord) => {
    const split = calculateOrderCommissionSplit(ord);
    totalGmv += split.totalAmount;
    totalPlatformCommission += split.platformCommission;
    totalMerchantNetPayout += split.merchantNetPayout;
    totalRiderDeliveryIncome += split.riderDeliveryFee;

    if (split.settlementStatus === 'settled') settledOrdersCount++;
    else if (split.settlementStatus === 'pending') pendingOrdersCount++;
    else if (split.settlementStatus === 'refund_adjusted') refundAdjustedCount++;

    return split;
  });

  const effectiveCommissionRatePercent = totalGmv > 0 ? Number(((totalPlatformCommission / totalGmv) * 100).toFixed(2)) : globalSettings.defaultPlatformRatePercent;

  return {
    totalGmv: Number(totalGmv.toFixed(2)),
    totalPlatformCommission: Number(totalPlatformCommission.toFixed(2)),
    totalMerchantNetPayout: Number(totalMerchantNetPayout.toFixed(2)),
    totalRiderDeliveryIncome: Number(totalRiderDeliveryIncome.toFixed(2)),
    effectiveCommissionRatePercent,
    settledOrdersCount,
    pendingOrdersCount,
    refundAdjustedCount,
    splits,
    merchantsCount: merchants.length,
    activeMerchantsCount: merchants.filter((m) => m.status === 'active').length
  };
}

/**
 * 监听抽佣设置变更
 */
export function subscribeCommissionUpdates(callback: () => void): () => void {
  if (typeof window !== 'undefined') {
    window.addEventListener(COMMISSION_EVENT_NAME, callback);
  }
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(COMMISSION_EVENT_NAME, callback);
    }
  };
}
