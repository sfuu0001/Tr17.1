import QRCode from 'qrcode';
import { DishItem, DishVariant } from '../types';

export interface SingleDishQrParams {
  dishId: string;
  variantId?: string;
  qty?: number;
  selectedOptions?: Record<string, string>;
  action?: 'add_to_cart' | 'quick_pay';
}

export interface ComboQrItem {
  dishId: string;
  dishName: string;
  variantId?: string;
  variantName?: string;
  price: number;
  qty: number;
  selectedOptions?: Record<string, string>;
}

export interface ComboQrParams {
  comboId?: string;
  comboName: string;
  items: ComboQrItem[];
  action?: 'combo_cart' | 'combo_pay';
}

export type QrActionPayload =
  | {
      type: 'single';
      action: 'add_to_cart' | 'quick_pay';
      dishId: string;
      variantId?: string;
      qty: number;
      options?: Record<string, string>;
    }
  | {
      type: 'combo';
      action: 'combo_cart' | 'combo_pay';
      comboName: string;
      items: ComboQrItem[];
    }
  | {
      type: 'coupon';
      action: 'claim_coupon' | 'redeem_coupon';
      couponCode: string;
      val?: number;
      couponType?: string;
      truckId?: string;
    }
  | {
      type: 'table';
      action: 'table_scan';
      tableCode: string;
      token?: string;
      shortCode?: string;
      truckId?: string;
    }
  | {
      type: 'pickup';
      action: 'verify_pickup';
      pickupCode: string;
    };

/**
 * 获取当前应用的基础 URL
 */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location && window.location.host) {
    return `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  }
  return 'https://tc100-d9gz0e2ko5929e360-1445454244.tcloudbaseapp.com';
}

/**
 * 构建优惠券领券推广真实 URL
 */
export function buildCouponClaimQrUrl(couponCode: string, truckId?: string): string {
  const baseUrl = getAppBaseUrl();
  const url = new URL(baseUrl);
  url.searchParams.set('action', 'claim_coupon');
  url.searchParams.set('coupon', couponCode);
  if (truckId && truckId !== 'all') {
    url.searchParams.set('truck', truckId);
  }
  return url.toString();
}

/**
 * 构建优惠券出示核销真实 URL
 */
export function buildCouponRedeemQrUrl(couponCode: string, val?: number, type?: string): string {
  const baseUrl = getAppBaseUrl();
  const url = new URL(baseUrl);
  url.searchParams.set('action', 'redeem_coupon');
  url.searchParams.set('code', couponCode);
  if (val !== undefined) url.searchParams.set('val', String(val));
  if (type) url.searchParams.set('type', type);
  url.searchParams.set('ts', String(Date.now()));
  return url.toString();
}

/**
 * 构建桌号扫码入座真实 URL
 */
export function buildTableQrUrl(tableCode: string, token: string, truckId?: string): string {
  const baseUrl = getAppBaseUrl();
  const url = new URL(baseUrl);
  url.searchParams.set('table', tableCode.toUpperCase());
  url.searchParams.set('t', token);
  if (truckId) url.searchParams.set('truck', truckId);
  return url.toString();
}

/**
 * 构建单品/规格扫码点餐真实 URL
 */
export function buildSingleDishQrUrl(params: SingleDishQrParams): string {
  const baseUrl = getAppBaseUrl();
  const url = new URL(baseUrl);
  url.searchParams.set('action', params.action || 'add_to_cart');
  url.searchParams.set('dishId', params.dishId);
  if (params.variantId) {
    url.searchParams.set('variantId', params.variantId);
  }
  url.searchParams.set('qty', String(params.qty || 1));
  if (params.selectedOptions && Object.keys(params.selectedOptions).length > 0) {
    url.searchParams.set('opts', encodeURIComponent(JSON.stringify(params.selectedOptions)));
  }
  return url.toString();
}

/**
 * 构建套餐多品组合扫码真实 URL
 */
export function buildComboQrUrl(params: ComboQrParams): string {
  const baseUrl = getAppBaseUrl();
  const url = new URL(baseUrl);
  url.searchParams.set('action', params.action || 'combo_cart');
  url.searchParams.set('comboName', params.comboName);
  
  // 紧凑编码数据
  const payload = params.items.map((i) => ({
    d: i.dishId,
    n: i.dishName,
    v: i.variantId || '',
    vn: i.variantName || '',
    p: i.price,
    q: i.qty,
    o: i.selectedOptions || {}
  }));
  url.searchParams.set('combo', encodeURIComponent(JSON.stringify(payload)));
  return url.toString();
}

/**
 * 使用 qrcode 库生成真实高解析度二维码 DataURL (PNG)
 */
export async function generateQrCodeDataUrl(
  text: string,
  options?: {
    width?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  }
): Promise<string> {
  const opts = {
    width: options?.width || 320,
    margin: options?.margin ?? 2,
    color: {
      dark: options?.darkColor || '#000000',
      light: options?.lightColor || '#ffffff'
    },
    errorCorrectionLevel: 'M' as const
  };
  return QRCode.toDataURL(text, opts);
}

/**
 * 使用 qrcode 库生成真实矢量 SVG 格式二维码
 */
export async function generateQrCodeSvg(
  text: string,
  options?: {
    width?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  }
): Promise<string> {
  const opts = {
    width: options?.width || 320,
    margin: options?.margin ?? 2,
    color: {
      dark: options?.darkColor || '#000000',
      light: options?.lightColor || '#ffffff'
    },
    errorCorrectionLevel: 'M' as const
  };
  return QRCode.toString(text, { ...opts, type: 'svg' });
}

/**
 * 解析二维码 URL 或纯文本指令
 */
export function parseQrScanResult(textOrUrl: string): QrActionPayload | null {
  if (!textOrUrl) return null;

  try {
    let url: URL;
    if (textOrUrl.startsWith('http://') || textOrUrl.startsWith('https://')) {
      url = new URL(textOrUrl);
    } else if (textOrUrl.includes('action=')) {
      url = new URL(`http://localhost/?${textOrUrl.replace(/^\?/, '')}`);
    } else {
      // 尝试解析 JSON 格式
      const parsed = JSON.parse(textOrUrl);
      if (parsed.action && parsed.dishId) {
        return {
          type: 'single',
          action: parsed.action,
          dishId: parsed.dishId,
          variantId: parsed.variantId,
          qty: parsed.qty || 1,
          options: parsed.options
        };
      }
      if (parsed.action && parsed.items) {
        return {
          type: 'combo',
          action: parsed.action,
          comboName: parsed.comboName || '配置套餐',
          items: parsed.items
        };
      }
      return null;
    }

    const action = url.searchParams.get('action');

    // 1. 桌台扫码入座处理 (/t/:code 或 ?table= 或 action=table_order / action=table_scan)
    const pathname = url.pathname || '';
    let tableCode = url.searchParams.get('table');
    if (!tableCode && pathname.includes('/t/')) {
      const parts = pathname.split('/t/');
      if (parts[1]) {
        tableCode = decodeURIComponent(parts[1].split('/')[0]).toUpperCase();
      }
    }
    if (tableCode) {
      return {
        type: 'table',
        action: 'table_scan',
        tableCode: tableCode.toUpperCase(),
        token: url.searchParams.get('t') || url.searchParams.get('token') || undefined,
        shortCode: url.searchParams.get('shortCode') || url.searchParams.get('sc') || undefined,
        truckId: url.searchParams.get('truck') || undefined
      };
    }

    // 2. 优惠券领取/核销处理 (claim_coupon, redeem_coupon, ?coupon=)
    if (action === 'claim_coupon' || action === 'redeem_coupon' || url.searchParams.has('coupon')) {
      const couponCode = (
        url.searchParams.get('coupon') ||
        url.searchParams.get('code') ||
        ''
      ).trim().toUpperCase();

      if (couponCode) {
        const valStr = url.searchParams.get('val');
        const val = valStr ? parseFloat(valStr) : undefined;
        const couponType = url.searchParams.get('type') || undefined;
        const truckId = url.searchParams.get('truck') || undefined;
        return {
          type: 'coupon',
          action: action === 'redeem_coupon' ? 'redeem_coupon' : 'claim_coupon',
          couponCode,
          val,
          couponType,
          truckId
        };
      }
    }

    // 3. 骑手/顾客取餐核销处理 (verify_pickup, ?pickupCode=)
    if (action === 'verify_pickup' || url.searchParams.has('pickupCode')) {
      const pickupCode = (url.searchParams.get('pickupCode') || url.searchParams.get('code') || '').trim().toUpperCase();
      if (pickupCode) {
        return {
          type: 'pickup',
          action: 'verify_pickup',
          pickupCode
        };
      }
    }

    // 4. 单品扫码加购或直达支付
    if (action === 'add_to_cart' || action === 'quick_pay' || url.searchParams.has('dishId')) {
      const dishId = url.searchParams.get('dishId');
      if (dishId) {
        const variantId = url.searchParams.get('variantId') ?? undefined;
        const qty = parseInt(url.searchParams.get('qty') || '1', 10);
        let options: Record<string, string> | undefined;
        const rawOpts = url.searchParams.get('opts');
        if (rawOpts) {
          try {
            options = JSON.parse(decodeURIComponent(rawOpts));
          } catch {
            // ignore
          }
        }

        return {
          type: 'single',
          action: action === 'quick_pay' ? 'quick_pay' : 'add_to_cart',
          dishId,
          variantId: variantId || undefined,
          qty: isNaN(qty) || qty < 1 ? 1 : qty,
          options
        };
      }
    }

    // 5. 套餐组合扫码加购或直达支付
    if (action === 'combo_cart' || action === 'combo_pay' || url.searchParams.has('combo')) {
      const comboName = url.searchParams.get('comboName') || '热卖特选套餐';
      const rawCombo = url.searchParams.get('combo');
      if (rawCombo) {
        try {
          const rawItems = JSON.parse(decodeURIComponent(rawCombo));
          if (Array.isArray(rawItems)) {
            const items: ComboQrItem[] = rawItems.map((r: any) => ({
              dishId: r.d || r.dishId,
              dishName: r.n || r.dishName || '精选餐品',
              variantId: r.v || r.variantId || undefined,
              variantName: r.vn || r.variantName || undefined,
              price: Number(r.p || r.price || 0),
              qty: Number(r.q || r.qty || 1),
              selectedOptions: r.o || r.selectedOptions || {}
            }));

            return {
              type: 'combo',
              action: action === 'combo_pay' ? 'combo_pay' : 'combo_cart',
              comboName,
              items
            };
          }
        } catch {
          // ignore
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('[qrCodeEngine] Failed to parse QR scan result:', err);
    return null;
  }
}
