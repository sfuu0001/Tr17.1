/**
 * Pickup Code & Verification Engine
 * 统一处理流动餐车外卖/自提与骑手取件码配备、条码/二维码生成与双端核销匹配
 */

export interface PickupVerificationRecord {
  orderId: string;
  orderNo: string;
  pickupCode: string;
  pickupShelfCode: string;
  verifiedAt: string;
  verifiedBy: string; // e.g. "流动餐车扫码枪" | "骑手核验" | "KDS主厨核销"
  channel: 'delivery' | 'pickup' | 'dine_in';
}

const PICKUP_EVENT_KEY = 'obsidian_pickup_verified_event';

/**
 * 获取或派生订单的标准 4 位/6 位取件码
 * 优先使用自定义 pickupCode；否则提取订单号中的末 4 位数字；若不足则根据订单号哈希派生
 */
export function getOrGeneratePickupCode(orderNo?: string, explicitCode?: string): string {
  if (explicitCode && explicitCode.trim()) {
    return explicitCode.trim();
  }
  if (!orderNo) {
    return '8821';
  }
  // 提取订单号中的数字
  const digits = orderNo.replace(/\D/g, '');
  if (digits.length >= 4) {
    return digits.slice(-4);
  } else if (digits.length > 0) {
    return digits.padStart(4, '8');
  }
  // 兜底哈希计算
  let hash = 0;
  for (let i = 0; i < orderNo.length; i++) {
    hash = (hash * 31 + orderNo.charCodeAt(i)) % 9000;
  }
  return String(1000 + Math.abs(hash));
}

/**
 * 获取取件格 / 保温柜编号
 */
export function getPickupShelfCode(orderIdOrNo?: string, explicitShelf?: string): string {
  if (explicitShelf && explicitShelf.trim()) {
    return explicitShelf.trim();
  }
  if (!orderIdOrNo) return '01 号保温取餐格';
  const digits = orderIdOrNo.replace(/\D/g, '');
  const num = digits ? parseInt(digits.slice(-2), 10) || 1 : 1;
  const shelfNum = ((num - 1) % 6) + 1;
  return `${String(shelfNum).padStart(2, '0')} 号保温取餐格`;
}

/**
 * 校验输入的核销码是否匹配订单
 */
export function verifyPickupCode(
  inputCode: string,
  target: { pickupCode?: string; orderNo?: string }
): boolean {
  if (!inputCode) return false;
  const cleanInput = inputCode.trim().toUpperCase().replace(/^(PICKUP:|PK-|#)/i, '');
  const targetCode = getOrGeneratePickupCode(target.orderNo, target.pickupCode).toUpperCase();
  const cleanOrderNo = (target.orderNo || '').replace(/^#/, '').toUpperCase();

  // 1. 完全匹配取件码数字 (如 "8821")
  if (cleanInput === targetCode) return true;
  // 2. 匹配带前缀 "PK-8821"
  if (cleanInput === `PK-${targetCode}`) return true;
  // 3. 匹配完整订单号 或 订单号末 4 位（禁用模糊后缀匹配，防止单字符误放行）
  const last4 = cleanOrderNo.slice(-4);
  if (cleanInput === cleanOrderNo || cleanInput === last4) return true;

  return false;
}

/**
 * 广播取件核销事件（同步到各端）
 */
export function dispatchPickupVerifiedEvent(record: PickupVerificationRecord): void {
  try {
    const payload = JSON.stringify(record);
    localStorage.setItem(PICKUP_EVENT_KEY, payload);
    // 触发同页面与跨窗口事件
    window.dispatchEvent(new CustomEvent('obsidian_order_pickup_event', { detail: record }));
  } catch (e) {
    // ignore
  }
}

/**
 * 订阅取件核销事件
 */
export function subscribePickupVerifiedEvent(
  callback: (record: PickupVerificationRecord) => void
): () => void {
  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<PickupVerificationRecord>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === PICKUP_EVENT_KEY && e.newValue) {
      try {
        const record = JSON.parse(e.newValue);
        callback(record);
      } catch (err) {
        // ignore
      }
    }
  };

  window.addEventListener('obsidian_order_pickup_event', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('obsidian_order_pickup_event', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
