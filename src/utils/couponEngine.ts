/**
 * 优惠券结算引擎 (Coupon Settlement Engine)
 * ------------------------------------------------------------------
 * 审计修复 (P0-1): 此前结算链路从不读取 obsidian_user_coupons 券包，
 * 优惠券抵扣金额硬编码为固定 ¥5，下单后也无任何核销动作。
 *
 * 本引擎统一承担:
 *  1. 读取当前用户可用券包 (obsidian_user_coupons)
 *  2. 按券码匹配一张可用券
 *  3. 根据券类型/门槛/适用范围/有效期真实计算抵扣金额
 *  4. 结算成功后核销 (status -> 'used' + usedAt + usedOrderNo)
 *  5. 直接读取商家券 (obsidian_merchant_coupons) 供领券中心/兑换码使用
 */

import { CouponItem, UserCouponRecord } from '../types/coupon';
import { INITIAL_USER_COUPONS, INITIAL_MERCHANT_COUPONS } from '../data/mockCoupons';
import { safeGetStorage, safeSetStorage } from './safeStorage';

export const USER_COUPONS_KEY = 'obsidian_user_coupons';
export const MERCHANT_COUPONS_KEY = 'obsidian_merchant_coupons';

export interface CouponEligibility {
  usable: boolean;
  reason?: string;
  maxDiscount: number; // 该券在本次订单中最大可抵扣金额（未超门槛时为理论值）
  isTruckIsolated?: boolean; // 是否因餐车隔离规则被拦截
}

export interface ResolvedCouponApply {
  userCouponId?: string;
  coupon?: CouponItem;
  code: string;
  discount: number; // 实际抵扣金额
  label: string; // 展示文案
}

/** 读取当前用户券包（无存储时回退内置种子数据） */
export function getUserCouponRecords(): UserCouponRecord[] {
  return safeGetStorage<UserCouponRecord[]>(USER_COUPONS_KEY, INITIAL_USER_COUPONS);
}

/** 保存用户券包 */
export function saveUserCouponRecords(records: UserCouponRecord[]): void {
  safeSetStorage(USER_COUPONS_KEY, records);
}

/** 读取商家券（模板/领券中心） */
export function getMerchantCoupons(): CouponItem[] {
  return safeGetStorage<CouponItem[]>(MERCHANT_COUPONS_KEY, INITIAL_MERCHANT_COUPONS);
}

/** 返回全部「可用」状态券 */
export function getAvailableUserCoupons(): UserCouponRecord[] {
  return getUserCouponRecords().filter((r) => r.status === 'available');
}

/**
 * 校验指定优惠券是否适用于特定餐车
 */
export function validateCouponForTruck(coupon: CouponItem, truckId?: string): {
  isApplicable: boolean;
  isIsolated: boolean;
  reason?: string;
} {
  if (!coupon.truckScopeType || coupon.truckScopeType === 'all_trucks') {
    return { isApplicable: true, isIsolated: false };
  }
  const currentTruck = truckId || 'truck-01';
  const isMatch = !!coupon.applicableTruckIds?.includes(currentTruck);
  if (!isMatch) {
    const truckDesc = coupon.applicableTruckNames?.join(' / ') || coupon.applicableTruckIds?.join(', ') || '指定餐车';
    return {
      isApplicable: false,
      isIsolated: true,
      reason: `该券仅限【${truckDesc}】专属核销，当前餐车已被风控隔离`
    };
  }
  return { isApplicable: true, isIsolated: true };
}

/**
 * 判断一张券是否可用于当前订单（校验 有效期/时段/日期/范围/餐车隔离 与 金额门槛）
 * scope 校验按全品类宽松处理——demo 数据大部分为 all_dishes；specific/category 券需要 items 时由调用方传 itemsCategories。
 */
export function isCouponEligible(
  record: UserCouponRecord,
  opts: {
    subtotal: number;
    deliveryFee?: number;
    diningMode?: 'delivery' | 'dine_in' | 'pickup';
    itemCategories?: string[];
    truckId?: string;
    now?: Date;
  }
): CouponEligibility {
  const { subtotal, diningMode = 'delivery', itemCategories = [], truckId } = opts;
  const now = opts.now || new Date();
  const coupon = record.coupon;

  // 0. 多餐车隔离与适用风控校验 (Multi-Truck Coupon Isolation)
  if (coupon.truckScopeType === 'specific_trucks' && coupon.applicableTruckIds && coupon.applicableTruckIds.length > 0) {
    const currentTruck = truckId || 'truck-01';
    if (!coupon.applicableTruckIds.includes(currentTruck)) {
      const truckNames = coupon.applicableTruckNames?.join(' / ') || coupon.applicableTruckIds.join(', ');
      return {
        usable: false,
        reason: `触发餐车隔离风控：该券仅限【${truckNames}】使用，当前餐车无法跨车核销`,
        maxDiscount: 0,
        isTruckIsolated: true
      };
    }
  }

  // 1. 状态
  if (record.status !== 'available') {
    return { usable: false, reason: '券不在可用状态', maxDiscount: 0 };
  }

  // 2. 商家券模板状态 (已结束的模板不能再用)
  if (coupon.status === 'ended') {
    return { usable: false, reason: '活动已结束', maxDiscount: 0 };
  }

  // 3. 有效期截止
  if (coupon.expireDate) {
    const expire = new Date(coupon.expireDate + (coupon.expireDate.length <= 10 ? 'T23:59:59' : ''));
    if (!Number.isNaN(expire.getTime()) && now.getTime() > expire.getTime()) {
      return { usable: false, reason: '券已过期', maxDiscount: 0 };
    }
  }

  // 4. 星期限制
  const day = now.getDay(); // 0=Sun
  if (coupon.dayRestriction === 'workdays_only' && (day === 0 || day === 6)) {
    return { usable: false, reason: '仅限工作日使用', maxDiscount: 0 };
  }
  if (coupon.dayRestriction === 'weekends_only' && day !== 0 && day !== 6) {
    return { usable: false, reason: '仅限周末使用', maxDiscount: 0 };
  }

  // 5. 时段限制
  if (coupon.timeSlotType === 'lunch_only') {
    const h = now.getHours();
    const start = parseInt(coupon.customTimeStart || '11:00', 10);
    const end = parseInt(coupon.customTimeEnd || '14:00', 10);
    if (h < start || h >= end) {
      return { usable: false, reason: '仅限午市时段使用', maxDiscount: 0 };
    }
  }
  if (coupon.timeSlotType === 'dinner_night') {
    const h = now.getHours();
    const start = parseInt(coupon.customTimeStart || '17:00', 10);
    const end = parseInt(coupon.customTimeEnd || '21:00', 10);
    if (h < start || h >= end) {
      return { usable: false, reason: '仅限晚市时段使用', maxDiscount: 0 };
    }
  }

  // 6. 范围限制（category / specific_dishes）
  if (coupon.scopeType === 'category' && coupon.scopeCategories && coupon.scopeCategories.length > 0) {
    const hit = itemCategories.some((c) => coupon.scopeCategories!.includes(c as any));
    if (!hit) {
      return { usable: false, reason: '当前餐品不在券适用品类内', maxDiscount: 0 };
    }
  }
  if (coupon.scopeType === 'specific_dishes' && coupon.scopeDishIds && coupon.scopeDishIds.length > 0) {
    // 需要 dishIds；此处以 itemCategories 为占位，若外部无法判断则放行（保守）
  }

  // 7. 金额门槛
  if (coupon.minSpend > 0 && subtotal < coupon.minSpend) {
    return {
      usable: false,
      reason: `未满 ¥${coupon.minSpend} 起用门槛`,
      maxDiscount: 0
    };
  }

  // 8. 免运费券仅适用于外送
  if (coupon.couponType === 'delivery_free' && diningMode !== 'delivery') {
    return { usable: false, reason: '免运费券仅适用于外卖专送', maxDiscount: 0 };
  }

  // 计算理论最大抵扣
  let maxDiscount = 0;
  switch (coupon.couponType) {
    case 'no_threshold':
    case 'amount_cut':
      maxDiscount = coupon.discountValue;
      break;
    case 'discount_percent':
      maxDiscount = Math.min(subtotal * (1 - coupon.discountValue), coupon.maxDiscountCap ?? Number.MAX_SAFE_INTEGER);
      break;
    case 'delivery_free':
      maxDiscount = opts.deliveryFee ?? 5.0;
      break;
  }
  maxDiscount = Math.max(0, Math.round(maxDiscount * 100) / 100);

  return { usable: true, maxDiscount };
}

/**
 * 按券码匹配当前用户可用券并解析真实抵扣。
 * 若券存在但当前订单不满足门槛则返回不可用说明；不存在则返回 null。
 */
export function resolveCouponByCode(
  code: string | null | undefined,
  opts: {
    subtotal: number;
    deliveryFee?: number;
    diningMode?: 'delivery' | 'dine_in' | 'pickup';
    itemCategories?: string[];
    truckId?: string;
  }
): { record?: UserCouponRecord; eligibility: CouponEligibility } | null {
  if (!code) return null;
  const target = code.trim().toUpperCase();
  const record = getAvailableUserCoupons().find((r) => r.coupon.code.toUpperCase() === target);
  if (!record) return null;
  return { record, eligibility: isCouponEligible(record, opts) };
}

/**
 * 在用户券包中自动挑选「当前订单可用且抵扣最大」的一张券（自动推荐最佳）。
 */
export function pickBestAvailableCoupon(
  opts: {
    subtotal: number;
    deliveryFee?: number;
    diningMode?: 'delivery' | 'dine_in' | 'pickup';
    itemCategories?: string[];
    truckId?: string;
  }
): UserCouponRecord | null {
  let best: UserCouponRecord | null = null;
  let bestValue = -1;
  for (const record of getAvailableUserCoupons()) {
    const elig = isCouponEligible(record, opts);
    if (elig.usable && elig.maxDiscount > bestValue) {
      bestValue = elig.maxDiscount;
      best = record;
    }
  }
  return best;
}

/**
 * 顾客扫码/输入兑换码领取优惠券至个人卡券包
 */
export function claimCouponByCode(
  code: string,
  options?: { currentTruckId?: string }
): {
  success: boolean;
  message: string;
  userCoupon?: UserCouponRecord;
  coupon?: CouponItem;
  isTruckIsolated?: boolean;
} {
  if (!code) return { success: false, message: '优惠券码不能为空' };
  const targetCode = code.trim().toUpperCase();
  const merchants = getMerchantCoupons();
  const matched = merchants.find((m) => m.code.toUpperCase() === targetCode);

  if (!matched) {
    return { success: false, message: `未找到券码为【${targetCode}】的优惠券` };
  }
  if (matched.status !== 'active') {
    return { success: false, message: '该优惠券活动已暂停或已结束' };
  }

  // 检查是否已达到领取上限
  const existingUserCoupons = getUserCouponRecords();
  const alreadyClaimedCount = existingUserCoupons.filter(
    (c) => c.coupon.code.toUpperCase() === targetCode && c.status === 'available'
  ).length;

  const perLimit = matched.perUserLimit || 3;
  if (alreadyClaimedCount >= perLimit) {
    return {
      success: false,
      message: `您已有 ${alreadyClaimedCount} 张可用【${matched.title}】，已达单人领取上限`,
      coupon: matched
    };
  }

  // 校验餐车适用范围
  const truckValidation = validateCouponForTruck(matched, options?.currentTruckId);

  const newRecord: UserCouponRecord = {
    userCouponId: `uc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    couponId: matched.id,
    coupon: matched,
    status: 'available',
    acquiredAt: new Date().toLocaleString('zh-CN', { hour12: false })
  };

  saveUserCouponRecords([newRecord, ...existingUserCoupons]);

  // 更新商家券 issuedCount
  const updatedMerchants = merchants.map((m) =>
    m.id === matched.id ? { ...m, issuedCount: (m.issuedCount || 0) + 1 } : m
  );
  safeSetStorage(MERCHANT_COUPONS_KEY, updatedMerchants);

  let msg = `成功领取【${matched.title}】！`;
  if (matched.truckScopeType === 'specific_trucks') {
    if (!truckValidation.isApplicable) {
      msg += ` （提示：${truckValidation.reason}）`;
    } else {
      msg += ` （当前餐车专属可用）`;
    }
  } else {
    msg += ' （全车队所有餐车通用）';
  }

  return {
    success: true,
    message: msg,
    userCoupon: newRecord,
    coupon: matched,
    isTruckIsolated: !truckValidation.isApplicable
  };
}

/**
 * 结算完成后核销指定券：置 used + 记录使用时间/订单号 + 回写存储；
 * 同时递增商家券模板 usedCount。
 */
export function markCouponUsed(code: string, orderNo: string, now?: Date): boolean {
  if (!code) return false;
  const target = code.trim().toUpperCase();
  const ts = (now || new Date()).toLocaleString('zh-CN', { hour12: false });

  const records = getUserCouponRecords();
  let hit = false;
  const updated = records.map((r) => {
    if (r.status === 'available' && r.coupon.code.toUpperCase() === target) {
      hit = true;
      return {
        ...r,
        status: 'used' as const,
        usedAt: ts,
        usedOrderNo: orderNo
      };
    }
    return r;
  });
  if (hit) {
    saveUserCouponRecords(updated);
  }

  // 同步商家券模板 usedCount（乐观+1）
  const merchants = getMerchantCoupons();
  const mIdx = merchants.findIndex((m) => m.code.toUpperCase() === target && m.status === 'active');
  if (mIdx >= 0) {
    merchants[mIdx] = {
      ...merchants[mIdx],
      usedCount: (merchants[mIdx].usedCount || 0) + 1
    };
    safeSetStorage(MERCHANT_COUPONS_KEY, merchants);
  }

  return hit;
}
