import { DiningMode } from '../types';
import { safeGetStorage, safeSetStorage } from './safeStorage';

export interface DeliverySettings {
  minDeliveryAmount: number; // 外卖起送结算金额 (元，默认 35)
  requirePostDiscountAmount: boolean; // 是否必须为剔除优惠后的实际金额起送 (默认 true)
  freeDeliveryThreshold: number; // 满额包邮/免配送费标准 (元，默认 80)
  deliveryFee: number; // 基础配送费 (元，默认 5)
  excludeDiscountsFromMinSpend: boolean; // 计算起送门槛时严格剔除各类优惠券、满减与单品立减 (默认 true)
  minimumNoticeText?: string;
  updatedAt?: string;
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  minDeliveryAmount: 35,
  requirePostDiscountAmount: true,
  freeDeliveryThreshold: 80,
  deliveryFee: 5,
  excludeDiscountsFromMinSpend: true,
  minimumNoticeText: '外卖专送需实付（剔除优惠后实际金额）达到起送门槛',
  updatedAt: '2026-08-27 12:00:00'
};

const STORAGE_KEY = 'obsidian_delivery_settings';
export const DELIVERY_SETTINGS_EVENT = 'obsidian_delivery_settings_changed';

/**
 * 获取当前商家配置的外卖起送与配送费规则
 */
export function getDeliverySettings(): DeliverySettings {
  const current = safeGetStorage<DeliverySettings>(STORAGE_KEY, DEFAULT_DELIVERY_SETTINGS);
  return {
    ...DEFAULT_DELIVERY_SETTINGS,
    ...current
  };
}

/**
 * 商家端更新并广播全网外卖起送规则
 */
export function saveDeliverySettings(newSettings: Partial<DeliverySettings>): DeliverySettings {
  const current = getDeliverySettings();
  const merged: DeliverySettings = {
    ...current,
    ...newSettings,
    updatedAt: new Date().toLocaleString('zh-CN')
  };
  safeSetStorage(STORAGE_KEY, merged);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DELIVERY_SETTINGS_EVENT, { detail: merged }));
  }
  return merged;
}

export interface DeliveryThresholdCalculation {
  subtotal: number;
  totalDiscount: number;
  actualAmount: number; // 剔除优惠后的实际结算金额
  isEligible: boolean;
  amountNeeded: number;
  minDeliveryAmount: number;
  freeDeliveryThreshold: number;
  deliveryFee: number;
  effectiveDeliveryFee: number;
  grandTotal: number;
  reason?: string;
}

/**
 * 严格基于剔除优惠后的实际金额计算外卖起送门槛与各项费用
 */
export function calculateDeliveryThreshold(
  subtotal: number,
  totalDiscount: number,
  diningMode: DiningMode,
  customSettings?: DeliverySettings
): DeliveryThresholdCalculation {
  const settings = customSettings || getDeliverySettings();
  
  const minDeliveryAmount = settings.minDeliveryAmount;
  const freeDeliveryThreshold = settings.freeDeliveryThreshold;
  const standardFee = settings.deliveryFee;

  // 剔除优惠后的实际商品菜品应付金额
  const actualAmount = Math.max(0, subtotal - (settings.excludeDiscountsFromMinSpend ? totalDiscount : 0));

  let isEligible = true;
  let amountNeeded = 0;
  let effectiveDeliveryFee = 0;

  if (diningMode === 'delivery') {
    // 外卖模式下，校验是否达到起送金额
    if (subtotal <= 0) {
      isEligible = false;
      amountNeeded = minDeliveryAmount;
    } else if (settings.excludeDiscountsFromMinSpend) {
      // 必须剔除优惠后的实际金额才可起送
      isEligible = actualAmount >= minDeliveryAmount;
      amountNeeded = Math.max(0, minDeliveryAmount - actualAmount);
    } else {
      isEligible = subtotal >= minDeliveryAmount;
      amountNeeded = Math.max(0, minDeliveryAmount - subtotal);
    }

    // 满额免配送费判定 (通常以商品原小计或实付小计为准，这里以 subtotal >= freeDeliveryThreshold 为准)
    effectiveDeliveryFee = (subtotal > 0 && subtotal >= freeDeliveryThreshold) ? 0 : standardFee;
  } else {
    // 堂食与自提：只要商品数 > 0 即可下单，免配送费
    isEligible = subtotal > 0;
    amountNeeded = 0;
    effectiveDeliveryFee = 0;
  }

  // 最终用户应付总金额 (含生效的配送费)
  const grandTotal = Math.max(
    0,
    subtotal + (subtotal > 0 ? effectiveDeliveryFee : 0) - totalDiscount
  );

  let reason = '';
  if (diningMode === 'delivery' && !isEligible) {
    if (settings.excludeDiscountsFromMinSpend && totalDiscount > 0) {
      reason = `起送需实付满 ¥${minDeliveryAmount}（已剔除优惠 ¥${totalDiscount.toFixed(2)}，当前实付 ¥${actualAmount.toFixed(2)}，还差 ¥${amountNeeded.toFixed(2)}）`;
    } else {
      reason = `外卖起送标准为 ¥${minDeliveryAmount}（还差 ¥${amountNeeded.toFixed(2)}）`;
    }
  }

  return {
    subtotal,
    totalDiscount,
    actualAmount,
    isEligible,
    amountNeeded,
    minDeliveryAmount,
    freeDeliveryThreshold,
    deliveryFee: standardFee,
    effectiveDeliveryFee,
    grandTotal,
    reason
  };
}
