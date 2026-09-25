// Multi-channel and Activity Management Rules & Anti-Abuse Engine
import { safeGetStorage, safeSetStorage } from './safeStorage';

export interface PaymentDiscountRule {
  id: 'wechat' | 'alipay' | 'card' | 'enterprise';
  name: string;
  icon: string;
  tag: string;
  discountType: 'fixed' | 'percent' | 'random';
  discountValue: number; // e.g. 3 for -3元, or 0.95 for 95折
  minThreshold: number; // 最低消费门槛
  maxDiscountCap: number; // 封顶最高立减金额（防止超大额倒贴）
  description: string;
  enabled: boolean;
}

export interface ActivityDiscountTier {
  threshold: number; // 满额门槛 (元)
  cutAmount: number; // 立减金额 (元)
  discountRate?: number; // 或打折比例 (如 0.9 为 9折)
  label?: string; // 阶梯描述
}

export interface ActivityPromoRule {
  id: string;
  name: string;
  type: 'tiered_threshold' | 'threshold_cut' | 'every_threshold' | 'percent_discount' | 'first_order' | 'time_flash';
  threshold: number; // 一级/基准门槛
  cutAmount: number; // 一级/基准减免金额
  discountRate?: number; // 折扣比例 (如 0.88 为 88折)
  tiers?: ActivityDiscountTier[]; // 阶梯满减多级配置 (如 满50减5, 满100减15, 满200减35)
  everyStep?: number; // 每满 step (如 每满50)
  everyCut?: number; // 每满减 cut (如 减6)
  everyMaxCap?: number; // 每满减最高封顶
  allowStackWithCoupon: boolean; // 是否允许与优惠券叠加 (true: 同享, false: 互斥)
  allowStackWithVIP?: boolean; // 是否允许与VIP会员折扣叠加 (true: 同享, false: 互斥)
  allowStackWithPayment: boolean; // 是否允许与支付渠道立减叠加
  allowStackWithDishDiscount?: boolean; // 是否允许与单品特价折扣叠加
  stackingPolicy?: 'stack_all' | 'coupon_exclusive' | 'vip_exclusive' | 'exclusive_best';
  stackingNote?: string;
  applicableChannels: ('delivery' | 'dine_in' | 'pickup')[];
  enabled: boolean;
  timeSlot?: 'all_day' | 'lunch_only' | 'dinner_night' | 'custom';
  customTimeStart?: string;
  customTimeEnd?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

// 优惠全局同享与互斥配置矩阵
export interface PromotionStackingSettings {
  allowActivityStackCoupon: boolean; // 满减活动与优惠券同享
  allowActivityStackVIP: boolean; // 满减活动与VIP会员折扣同享
  allowCouponStackVIP: boolean; // 优惠券与VIP会员折扣同享
  allowPaymentStackAll: boolean; // 支付渠道立减与各类优惠同享
  allowDishDiscountStackActivity: boolean; // 单品特价是否计入整单满减
  autoPickBestCombo: boolean; // 优惠互斥时系统自动计算并推荐最大优惠组合
}

export const DEFAULT_STACKING_SETTINGS: PromotionStackingSettings = {
  allowActivityStackCoupon: true, // 默认允许同享
  allowActivityStackVIP: true,
  allowCouponStackVIP: true,
  allowPaymentStackAll: true,
  allowDishDiscountStackActivity: true,
  autoPickBestCombo: true
};

export interface AntiAbuseConfig {
  maxDiscountRatio: number; // 整体最大折扣上限比例，例如 0.65 表示优惠后实付金额不能低于原价的 35%
  minPayAmount: number; // 最低实付兜底金额，例如 1.00 元，禁止 0 元免单或负数订单
  preventCouponDoubleDip: boolean; // 是否禁止相同类型优惠券多重叠加
  singleItemMaxDiscountCap: number; // 单品场景立减最高封顶
  logAbuseWarnings: boolean; // 是否记录预警日志
  enableTruckIsolationRiskControl?: boolean; // 开启多餐车优惠券隔离防护
  preventCrossTruckArbitrage?: boolean; // 拦截跨餐车站口套券与套利
  maxUniversalCouponBurnPerTruck?: number; // 通用券单车每日核销限额（元）
}

// 默认支付渠道立减策略配置
export const DEFAULT_PAYMENT_RULES: PaymentDiscountRule[] = [
  {
    id: 'wechat',
    name: '微信支付',
    icon: '🟢',
    tag: '随机立减最高¥8',
    discountType: 'fixed',
    discountValue: 3.0,
    minThreshold: 30.0,
    maxDiscountCap: 8.0,
    description: '满30元立减3元，首单随机立减最高8元',
    enabled: true
  },
  {
    id: 'alipay',
    name: '支付宝',
    icon: '🔵',
    tag: '立减¥2.5 · 花呗分期',
    discountType: 'fixed',
    discountValue: 2.5,
    minThreshold: 25.0,
    maxDiscountCap: 5.0,
    description: '满25元立减2.5元，支持花呗分期',
    enabled: true
  },
  {
    id: 'card',
    name: '银联/信用卡',
    icon: '💳',
    tag: '随机立减¥1~¥5',
    discountType: 'fixed',
    discountValue: 2.0,
    minThreshold: 40.0,
    maxDiscountCap: 5.0,
    description: '绑定信用卡单笔满40立减2元',
    enabled: true
  },
  {
    id: 'enterprise',
    name: '企业餐补签单',
    icon: '🏢',
    tag: '签约企业免密报销',
    discountType: 'fixed',
    discountValue: 5.0,
    minThreshold: 50.0,
    maxDiscountCap: 10.0,
    description: '企业认证员工午间专属立减5元',
    enabled: true
  }
];

// 默认活动满减阶梯（含多阶梯自动满减、每满减、限时活动）
export const DEFAULT_ACTIVITY_RULES: ActivityPromoRule[] = [
  {
    id: 'act-tiered-main',
    name: '餐车阶梯自动满减 (午晚市通享)',
    type: 'tiered_threshold',
    threshold: 50.0,
    cutAmount: 6.0,
    tiers: [
      { threshold: 50.0, cutAmount: 6.0, label: '满50减6' },
      { threshold: 100.0, cutAmount: 15.0, label: '满100减15' },
      { threshold: 180.0, cutAmount: 32.0, label: '满180减32' }
    ],
    allowStackWithCoupon: true,
    allowStackWithVIP: true,
    allowStackWithPayment: true,
    allowStackWithDishDiscount: true,
    applicableChannels: ['delivery', 'dine_in', 'pickup'],
    enabled: true,
    description: '全品类订单满额自动触发阶梯立减，可与优惠券同享'
  },
  {
    id: 'act-night-flash',
    name: '深夜炙烤大额特惠 (21:00-02:00)',
    type: 'threshold_cut',
    threshold: 120.0,
    cutAmount: 20.0,
    allowStackWithCoupon: false, // 独享大额满减，与优惠券互斥
    allowStackWithVIP: true,
    allowStackWithPayment: true,
    allowStackWithDishDiscount: false,
    applicableChannels: ['delivery', 'dine_in'],
    enabled: true,
    description: '夜间高额立减 ¥20 (独享优惠，不与普通卡券同享)'
  },
  {
    id: 'act-every-step',
    name: '狂欢聚餐每满减 (每满50减5)',
    type: 'every_threshold',
    threshold: 50.0,
    cutAmount: 5.0,
    everyStep: 50.0,
    everyCut: 5.0,
    everyMaxCap: 25.0,
    allowStackWithCoupon: true,
    allowStackWithVIP: true,
    allowStackWithPayment: true,
    applicableChannels: ['dine_in', 'delivery', 'pickup'],
    enabled: false,
    description: '多买多优惠，每满50立减5元，最高立减25元'
  }
];

// 默认防恶意叠加与薅羊毛风控配置
export const DEFAULT_ANTI_ABUSE_CONFIG: AntiAbuseConfig = {
  maxDiscountRatio: 0.65, // 综合优惠总额最多占订单小计的 65%，实付至少保留 35%
  minPayAmount: 1.0, // 订单最低必须实付 ¥1.00，严禁 0 元或负数订单
  preventCouponDoubleDip: true, // 开启防优惠券同享与霸王餐风控
  singleItemMaxDiscountCap: 25.0,
  logAbuseWarnings: true
};

/**
 * 优惠计算结果结构体
 */
export interface CalculationResult {
  subtotal: number;
  totalDishSavings: number; // 单品外卖/堂食立减省下的总额
  activityDiscount: number; // 满减活动减免金额
  activityRuleApplied: ActivityPromoRule | null;
  activityTierApplied?: ActivityDiscountTier | null;
  couponDiscount: number; // 优惠券减免
  couponApplied: string | null;
  vipDiscount: number; // VIP会员专享立减
  paymentDiscount: number; // 支付渠道立减
  paymentRuleApplied: PaymentDiscountRule | null;
  deliveryFee: number;
  effectiveDeliveryFee: number;
  totalDiscount: number; // 原始可享受的各项优惠总和
  cappedDiscount: number; // 风控截断后的最终实际优惠总和
  isAbusePrevented: boolean; // 是否触发了防薅羊毛拦截截断
  abuseReason?: string; // 拦截触发原因说明
  isTruckIsolated?: boolean; // 是否触发了多餐车隔离拦截
  isolationWarning?: string; // 餐车隔离风控警告说明
  isStackingConflict: boolean; // 是否存在优惠互斥
  stackingExplanation: string; // 优惠同享/互斥状态解释说明
  grandTotal: number; // 最终顾客应付实付金额
  savingsBreakdown: Array<{
    type: 'activity' | 'coupon' | 'vip' | 'payment' | 'delivery';
    title: string;
    amount: number;
    stacked: boolean;
    note?: string;
  }>;
}

export function getStoredStackingSettings(): PromotionStackingSettings {
  return safeGetStorage<PromotionStackingSettings>('obsidian_stacking_settings', DEFAULT_STACKING_SETTINGS);
}

export function saveStoredStackingSettings(settings: PromotionStackingSettings): void {
  safeSetStorage('obsidian_stacking_settings', settings);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('PROMOTION_SETTINGS_CHANGED', { detail: settings }));
  }
}

export function getStoredActivityRules(): ActivityPromoRule[] {
  return safeGetStorage<ActivityPromoRule[]>('obsidian_activity_rules', DEFAULT_ACTIVITY_RULES);
}

export function saveStoredActivityRules(rules: ActivityPromoRule[]): void {
  safeSetStorage('obsidian_activity_rules', rules);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('PROMOTION_ACTIVITIES_CHANGED', { detail: rules }));
  }
}

/**
 * 智能优惠计算与风控拦截引擎 (Promotion & Anti-Abuse Calculation Engine)
 */
export function calculateOrderDiscounts(params: {
  subtotal: number;
  diningMode: 'delivery' | 'dine_in' | 'pickup';
  paymentMethod: 'wechat' | 'alipay' | 'card' | 'enterprise';
  couponCode?: string | null;
  isVIPActive?: boolean;
  truckId?: string;
  activityRules?: ActivityPromoRule[];
  paymentRules?: PaymentDiscountRule[];
  stackingSettings?: PromotionStackingSettings;
  antiAbuse?: AntiAbuseConfig;
}): CalculationResult {
  const {
    subtotal,
    diningMode,
    paymentMethod,
    couponCode,
    isVIPActive = false,
    truckId = 'truck-01',
    activityRules = getStoredActivityRules(),
    paymentRules = DEFAULT_PAYMENT_RULES,
    stackingSettings = getStoredStackingSettings(),
    antiAbuse = DEFAULT_ANTI_ABUSE_CONFIG
  } = params;

  // 1. 计算配送费 (满80包邮)
  const deliveryFee = diningMode === 'delivery' ? 5.0 : 0.0;
  const effectiveDeliveryFee = diningMode !== 'delivery' ? 0.0 : subtotal >= 80.0 ? 0.0 : deliveryFee;

  // 2. 计算活动满减 (支持阶梯满减、每满减、普通满减)
  let activityDiscount = 0;
  let activityRuleApplied: ActivityPromoRule | null = null;
  let activityTierApplied: ActivityDiscountTier | null = null;

  const validActivities = activityRules.filter(
    (a) => a.enabled && a.applicableChannels.includes(diningMode) && subtotal >= (a.threshold || 0)
  );

  if (validActivities.length > 0) {
    // 对每个有效活动计算可获得的减免金额
    const evaluated = validActivities.map((act) => {
      let cut = 0;
      let matchedTier: ActivityDiscountTier | null = null;

      if (act.type === 'tiered_threshold' && act.tiers && act.tiers.length > 0) {
        // 阶梯满减：找到满足条件的最高阶梯
        const sortedTiers = [...act.tiers].sort((a, b) => b.threshold - a.threshold);
        for (const tier of sortedTiers) {
          if (subtotal >= tier.threshold) {
            cut = tier.cutAmount;
            if (tier.discountRate && tier.discountRate < 1) {
              cut = Math.max(cut, subtotal * (1 - tier.discountRate));
            }
            matchedTier = tier;
            break;
          }
        }
      } else if (act.type === 'every_threshold') {
        const step = act.everyStep || 50;
        const perCut = act.everyCut || 5;
        const times = Math.floor(subtotal / step);
        cut = times * perCut;
        if (act.everyMaxCap && act.everyMaxCap > 0) {
          cut = Math.min(cut, act.everyMaxCap);
        }
      } else if (act.type === 'percent_discount' && act.discountRate) {
        cut = subtotal * (1 - act.discountRate);
      } else {
        cut = act.cutAmount;
      }

      return { act, cut, matchedTier };
    });

    // 找出减免金额最大的一项活动
    evaluated.sort((a, b) => b.cut - a.cut);
    if (evaluated.length > 0 && evaluated[0].cut > 0) {
      activityDiscount = parseFloat(evaluated[0].cut.toFixed(2));
      activityRuleApplied = evaluated[0].act;
      activityTierApplied = evaluated[0].matchedTier;
    }
  }

  // 3. 计算优惠券抵扣
  let couponDiscount = 0;
  let couponApplied: string | null = null;
  let isTruckIsolated = false;
  let isolationWarning: string | undefined = undefined;
  const activeCoupon = couponCode || (isVIPActive ? 'UR-VIP5' : null);

  if (activeCoupon && subtotal > 0) {
    let matchedCouponVal = 5.0;
    const cleanCode = activeCoupon.trim().toUpperCase();

    try {
      const savedMerchant = typeof window !== 'undefined' ? localStorage.getItem('obsidian_merchant_coupons') : null;
      if (savedMerchant) {
        const list = JSON.parse(savedMerchant);
        const match = list.find((c: any) => c.code.toUpperCase() === cleanCode);
        if (match) {
          // 校验多餐车隔离与风控规则
          if (match.truckScopeType === 'specific_trucks' && match.applicableTruckIds && match.applicableTruckIds.length > 0) {
            if (!match.applicableTruckIds.includes(truckId)) {
              isTruckIsolated = true;
              const names = match.applicableTruckNames?.join(' / ') || match.applicableTruckIds.join(', ');
              isolationWarning = `触发餐车隔离风控：优惠券【${cleanCode}】仅限【${names}】使用，当前餐车(${truckId})已被隔离拦截`;
              matchedCouponVal = 0;
            }
          }

          if (!isTruckIsolated && subtotal >= (match.minSpend || 0)) {
            if (match.couponType === 'discount_percent') {
              const calculated = subtotal * (1 - match.discountValue);
              matchedCouponVal = Math.min(calculated, match.maxDiscountCap || 20);
            } else if (match.couponType === 'delivery_free') {
              matchedCouponVal = effectiveDeliveryFee > 0 ? effectiveDeliveryFee : 5.0;
            } else {
              matchedCouponVal = match.discountValue;
            }
          } else if (!isTruckIsolated && subtotal < (match.minSpend || 0)) {
            matchedCouponVal = 0;
          }
        }
      } else {
        if (cleanCode.includes('LUNCH10') && subtotal >= 30) matchedCouponVal = 10.0;
        else if (cleanCode.includes('WEEKEND20') && subtotal >= 100) matchedCouponVal = 20.0;
        else if (cleanCode.includes('DRINK88') && subtotal >= 25) matchedCouponVal = 6.0;
        else if (cleanCode.includes('VIP5')) matchedCouponVal = 5.0;
        else if (cleanCode.startsWith('UR-')) matchedCouponVal = 8.0;
      }
    } catch (e) {
      if (cleanCode.includes('10')) matchedCouponVal = 10.0;
      else if (cleanCode.includes('20')) matchedCouponVal = 20.0;
      else matchedCouponVal = 5.0;
    }

    if (!isTruckIsolated) {
      couponDiscount = parseFloat(matchedCouponVal.toFixed(2));
      couponApplied = activeCoupon;
    }
  }

  // 4. VIP 会员专享抵扣 (例如黑金 VIP 专享优惠)
  let vipDiscount = 0;
  if (isVIPActive && subtotal >= 30) {
    vipDiscount = 3.0; // VIP 专享额外立减 ¥3.00
  }

  // 5. 校验同享与互斥规则 (Stacking & Exclusion Evaluation)
  let isStackingConflict = false;
  let stackingExplanation = '✅ 优惠规则计算正常';

  // 检查满减与优惠券的同享关系
  const actAllowsCoupon = activityRuleApplied ? activityRuleApplied.allowStackWithCoupon : true;
  const globalAllowsActCoupon = stackingSettings.allowActivityStackCoupon;
  const canStackActCoupon = actAllowsCoupon && globalAllowsActCoupon;

  if (activityDiscount > 0 && couponDiscount > 0 && !canStackActCoupon) {
    isStackingConflict = true;
    // 互斥：按最优组合策略选取最大者
    if (stackingSettings.autoPickBestCombo) {
      if (couponDiscount > activityDiscount) {
        stackingExplanation = `ℹ️ 该满减活动(${activityRuleApplied?.name})与优惠券互斥，系统已为您自动选用减免力度更大的优惠券(-¥${couponDiscount.toFixed(2)})`;
        activityDiscount = 0;
        activityRuleApplied = null;
        activityTierApplied = null;
      } else {
        stackingExplanation = `ℹ️ 该满减活动(${activityRuleApplied?.name})与优惠券互斥，系统已为您自动选用减免力度更大的自动满减(-¥${activityDiscount.toFixed(2)})`;
        couponDiscount = 0;
        couponApplied = null;
      }
    } else {
      stackingExplanation = `⚠️ 满减与优惠券暂不支持同享，请选择使用其一`;
    }
  } else if (activityDiscount > 0 && couponDiscount > 0 && canStackActCoupon) {
    stackingExplanation = `✨ 自动满减(-¥${activityDiscount.toFixed(2)}) 与 优惠券(-¥${couponDiscount.toFixed(2)}) 已同享生效`;
  }

  // 检查 VIP 会员权益与满减同享
  const actAllowsVIP = activityRuleApplied?.allowStackWithVIP ?? true;
  if (vipDiscount > 0 && activityDiscount > 0 && (!actAllowsVIP || !stackingSettings.allowActivityStackVIP)) {
    // 互斥
    if (activityDiscount >= vipDiscount) {
      vipDiscount = 0;
    } else {
      activityDiscount = 0;
    }
  }

  // 6. 计算支付渠道立减
  let paymentDiscount = 0;
  let paymentRuleApplied: PaymentDiscountRule | null = null;
  const currentPayRule = paymentRules.find((p) => p.id === paymentMethod && p.enabled);

  if (currentPayRule && subtotal >= currentPayRule.minThreshold) {
    if (activityRuleApplied && !activityRuleApplied.allowStackWithPayment) {
      // 支付立减互斥
    } else {
      paymentDiscount = Math.min(currentPayRule.discountValue, currentPayRule.maxDiscountCap);
      paymentRuleApplied = currentPayRule;
    }
  }

  // 7. 汇总可享受的各项优惠
  const totalDiscount = parseFloat((activityDiscount + couponDiscount + vipDiscount + paymentDiscount).toFixed(2));

  // 8. 构造优惠明细列表 (Savings Breakdown)
  const savingsBreakdown: CalculationResult['savingsBreakdown'] = [];
  if (activityDiscount > 0 && activityRuleApplied) {
    savingsBreakdown.push({
      type: 'activity',
      title: activityTierApplied ? `${activityRuleApplied.name} (${activityTierApplied.label || `满¥${activityTierApplied.threshold}减¥${activityTierApplied.cutAmount}`})` : activityRuleApplied.name,
      amount: activityDiscount,
      stacked: canStackActCoupon,
      note: canStackActCoupon ? '自动匹配 · 可与券同享' : '独享满减'
    });
  }
  if (couponDiscount > 0 && couponApplied) {
    savingsBreakdown.push({
      type: 'coupon',
      title: `优惠券抵扣 [${couponApplied}]`,
      amount: couponDiscount,
      stacked: canStackActCoupon,
      note: canStackActCoupon ? '已叠加' : '优先抵扣'
    });
  }
  if (vipDiscount > 0) {
    savingsBreakdown.push({
      type: 'vip',
      title: '黑金 VIP 专享尊享立减',
      amount: vipDiscount,
      stacked: true,
      note: '会员权益'
    });
  }
  if (paymentDiscount > 0 && paymentRuleApplied) {
    savingsBreakdown.push({
      type: 'payment',
      title: `${paymentRuleApplied.name}渠道立减`,
      amount: paymentDiscount,
      stacked: true,
      note: paymentRuleApplied.tag
    });
  }
  if (diningMode === 'delivery' && subtotal >= 80.0) {
    savingsBreakdown.push({
      type: 'delivery',
      title: '满80元免配送费',
      amount: 5.0,
      stacked: true,
      note: '外卖包邮'
    });
  }

  // 9. 防恶意叠加与薅羊毛风控截断 (Anti-Abuse Cap)
  let cappedDiscount = totalDiscount;
  let isAbusePrevented = false;
  let abuseReason: string | undefined = undefined;

  const maxAllowedDiscount = Math.max(0, subtotal * antiAbuse.maxDiscountRatio);
  const minRequiredOrderAmount = antiAbuse.minPayAmount;

  if (subtotal > 0 && totalDiscount > maxAllowedDiscount) {
    cappedDiscount = parseFloat(maxAllowedDiscount.toFixed(2));
    isAbusePrevented = true;
    abuseReason = `触发系统防过度叠加保护：本单最高优惠比例限制为 ${(antiAbuse.maxDiscountRatio * 100).toFixed(0)}%，已为您自动锁定最优立减额 ¥${cappedDiscount.toFixed(2)}`;
  }

  // 确保最终实付金额不低于最低限额 (如 ¥1.00)
  let grandTotal = subtotal + effectiveDeliveryFee - cappedDiscount;
  if (subtotal > 0 && grandTotal < minRequiredOrderAmount) {
    grandTotal = minRequiredOrderAmount;
    cappedDiscount = Math.max(0, subtotal + effectiveDeliveryFee - minRequiredOrderAmount);
    isAbusePrevented = true;
    abuseReason = `触发实付兜底保护：根据餐车风控规则，特惠订单最低实付金额为 ¥${minRequiredOrderAmount.toFixed(2)}`;
  }

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    totalDishSavings: 0,
    activityDiscount,
    activityRuleApplied,
    activityTierApplied,
    couponDiscount,
    couponApplied,
    vipDiscount,
    paymentDiscount,
    paymentRuleApplied,
    deliveryFee,
    effectiveDeliveryFee,
    totalDiscount,
    cappedDiscount: parseFloat(cappedDiscount.toFixed(2)),
    isAbusePrevented,
    abuseReason,
    isTruckIsolated,
    isolationWarning,
    isStackingConflict,
    stackingExplanation,
    grandTotal: Math.max(0, parseFloat(grandTotal.toFixed(2))),
    savingsBreakdown
  };
}
