/**
 * ==============================================================================
 * Obsidian Urban Radar - Client User Usage Boundary & Sensitive Field Guard
 * 客户端用户使用边界与云端敏感字段防篡改安全卫士
 * ==============================================================================
 *
 * 核心安全职责:
 * 1. 严格划分普通客户端食客 (Customer) 与系统/商家 (Merchant/Admin) 的操作边界。
 * 2. 严禁客户端食客对云端核心资产/敏感字段进行任何非授权修改：
 *    - 用户档案敏感字段: balance(钱包余额), points(积分), membershipTier(VIP等级),
 *      isVIPActive, walletHistory(资金流水), uid(不可变身份), role(系统权限), creditScore 等。
 *    - 菜单SKU价格敏感字段: price(售价), costPrice(成本), discount(折扣), inventory, name 等。
 *    - 订单敏感字段: totalPrice(应付总额), actualPrice(实付金额), platformFee(平台抽佣),
 *      merchantIncome(商家结算实收), paymentStatus(支付凭证状态) 等。
 * 3. 实行“白名单注入式清洗 (Whitelist Sanitization)”与“服务端/云端权威源字段强锁定”，
 *    在任何云端写入或云函数调用前，剥离并阻断全部越权字段。
 */

import { UserProfile, UserAddress, UserPreferences } from '../types/user';
import { DishItem, Order } from '../types';
import { safeGetStorage, safeSetStorage } from './safeStorage';
import { recordCloudFunctionLog } from './cloudbase';

/**
 * 客户端食客允许自维护的非敏感字段白名单 (Customer Mutable Whitelist)
 */
export const CUSTOMER_MUTABLE_PROFILE_FIELDS: (keyof UserProfile)[] = [
  'nickname',
  'avatar',
  'phone',
  'bio',
  'gender',
  'birthday',
  'addresses',
  'preferences'
];

/**
 * 食客绝对禁止篡改的云端敏感资产与权限字段 (Customer Strictly Read-Only Fields)
 */
export const SENSITIVE_PROFILE_FIELDS: (keyof UserProfile | string)[] = [
  'balance',
  'points',
  'membershipTier',
  'isVIPActive',
  'walletHistory',
  'uid',
  'authProvider',
  'hardwareHash',
  'deviceFingerprint',
  'role',
  'isStaff',
  'isAdmin',
  'discountRate',
  'creditScore',
  'walletFrozen',
  'createdAt'
];

/**
 * 订单不可被客户端单方面篡改的敏感金融与履约字段
 */
export const SENSITIVE_ORDER_FIELDS: (keyof Order | string)[] = [
  'totalPrice',
  'actualPrice',
  'payableAmount',
  'discountAmount',
  'platformFee',
  'commissionRate',
  'deliveryFee',
  'merchantIncome',
  'paymentStatus',
  'merchantPaidStatus',
  'settlementTime',
  'riderEarnings'
];

export interface BoundaryCheckResult<T> {
  allowed: boolean;
  sanitizedData: T;
  tamperedFields: string[];
  violationWarning?: string;
}

/**
 * 记录客户端越界修改审计告警
 */
export function recordBoundaryAuditViolation(
  action: string,
  tamperedFields: string[],
  target: string,
  uid?: string
): void {
  const message = `[安全边界告警] 客户端用户 (UID: ${uid || 'Anonymous'}) 试图越权修改云端敏感字段: [${tamperedFields.join(', ')}]，操作已被安全网关拦截并执行权威源还原。`;
  console.warn(message);

  try {
    recordCloudFunctionLog({
      functionName: 'clientSecurityBoundary',
      action: `boundary_guard_${action}`,
      timestamp: new Date().toLocaleTimeString(),
      durationMs: 1,
      status: 'warning',
      requestPayload: { action, tamperedFields, target, uid },
      responsePayload: { blocked: true, sanitized: true },
      source: 'local_fallback',
      message
    });
  } catch {
    // ignore
  }
}

/**
 * 1. 用户档案清洗防护:
 * 提取客户端允许修改的非敏感白名单字段，强制与云端/本地权威资产合并，阻断对 balance / points / vip / role 的篡改。
 */
export function sanitizeUserProfileForCloud(
  inputProfile: Partial<UserProfile>,
  authoritativeProfile: UserProfile
): BoundaryCheckResult<UserProfile> {
  const tamperedFields: string[] = [];

  // 检测是否存在对敏感字段的篡改企图
  SENSITIVE_PROFILE_FIELDS.forEach((fieldKey) => {
    const key = fieldKey as keyof UserProfile;
    if (key in inputProfile && inputProfile[key] !== undefined) {
      const inputVal = JSON.stringify(inputProfile[key]);
      const authVal = JSON.stringify(authoritativeProfile[key]);
      if (inputVal !== authVal) {
        tamperedFields.push(String(key));
      }
    }
  });

  // 严格白名单提取：仅允许合并安全的个人属性
  const safeAddresses: UserAddress[] = Array.isArray(inputProfile.addresses)
    ? inputProfile.addresses.map((a) => ({
        id: a.id || `addr-${Date.now()}`,
        name: String(a.name || '').slice(0, 30),
        phone: String(a.phone || '').slice(0, 20),
        tag: a.tag || '公司',
        address: String(a.address || '').slice(0, 100),
        detail: String(a.detail || '').slice(0, 100),
        isDefault: Boolean(a.isDefault),
        createdAt: a.createdAt || new Date().toLocaleString()
      }))
    : authoritativeProfile.addresses;

  const safePreferences: UserPreferences = inputProfile.preferences
    ? {
        spiciness: inputProfile.preferences.spiciness || authoritativeProfile.preferences?.spiciness || 'mild',
        cutlery: inputProfile.preferences.cutlery || authoritativeProfile.preferences?.cutlery || 'eco',
        autoApplyCoupons: inputProfile.preferences.autoApplyCoupons !== undefined
          ? Boolean(inputProfile.preferences.autoApplyCoupons)
          : authoritativeProfile.preferences?.autoApplyCoupons ?? true,
        radarTracking: inputProfile.preferences.radarTracking !== undefined
          ? Boolean(inputProfile.preferences.radarTracking)
          : authoritativeProfile.preferences?.radarTracking ?? true,
        smsNotification: inputProfile.preferences.smsNotification !== undefined
          ? Boolean(inputProfile.preferences.smsNotification)
          : authoritativeProfile.preferences?.smsNotification ?? true,
        dietaryNote: String(inputProfile.preferences.dietaryNote || authoritativeProfile.preferences?.dietaryNote || '').slice(0, 100)
      }
    : authoritativeProfile.preferences;

  // 组装最终安全的 UserProfile，敏感资产字段 100% 锁定权威源
  const sanitizedProfile: UserProfile = {
    // 基础权威标识 (只读)
    uid: authoritativeProfile.uid,
    authProvider: authoritativeProfile.authProvider,
    hardwareHash: authoritativeProfile.hardwareHash,
    deviceFingerprint: authoritativeProfile.deviceFingerprint,
    createdAt: authoritativeProfile.createdAt,

    // 核心金融资产与等级 (锁定权威源，严禁客户端篡改)
    balance: Number(authoritativeProfile.balance) || 0,
    points: Number(authoritativeProfile.points) || 0,
    membershipTier: authoritativeProfile.membershipTier || 'standard',
    isVIPActive: Boolean(authoritativeProfile.isVIPActive),
    walletHistory: Array.isArray(authoritativeProfile.walletHistory) ? authoritativeProfile.walletHistory : [],

    // 客户端允许修改的白名单信息 (限制长度与格式)
    nickname: String(inputProfile.nickname ?? authoritativeProfile.nickname).trim().slice(0, 30),
    avatar: String(inputProfile.avatar ?? authoritativeProfile.avatar).trim().slice(0, 500),
    bio: String(inputProfile.bio ?? authoritativeProfile.bio).trim().slice(0, 200),
    gender: (inputProfile.gender === 'male' || inputProfile.gender === 'female' || inputProfile.gender === 'secret')
      ? inputProfile.gender
      : authoritativeProfile.gender,
    birthday: String(inputProfile.birthday ?? authoritativeProfile.birthday).slice(0, 20),
    phone: String(inputProfile.phone ?? authoritativeProfile.phone).trim().slice(0, 20),

    addresses: safeAddresses,
    preferences: safePreferences,
    cloudSyncedAt: new Date().toISOString()
  };

  if (tamperedFields.length > 0) {
    recordBoundaryAuditViolation('sanitize_user_profile', tamperedFields, 'obsidian_truck_users', authoritativeProfile.uid);
  }

  return {
    allowed: tamperedFields.length === 0,
    sanitizedData: sanitizedProfile,
    tamperedFields,
    violationWarning: tamperedFields.length > 0 ? `已阻断敏感字段修改: ${tamperedFields.join(', ')}` : undefined
  };
}

/**
 * 2. 菜品 SKU 菜单库修改权限校验:
 * 食客端严禁向云端 `shaokao-sku` 集合写入、新增或覆盖菜品定价与库存。
 */
export function checkDishModificationPermission(
  callerRole: 'customer' | 'staff' | 'merchant_admin' = 'customer'
): { allowed: boolean; reason?: string } {
  if (callerRole === 'customer') {
    const reason = '客户端食客无权对云端菜品库、SKU定价与库存执行修改或覆盖操作';
    recordBoundaryAuditViolation('modify_dish_sku', ['price', 'inventory', 'sku_data'], 'shaokao-sku');
    return { allowed: false, reason };
  }
  return { allowed: true };
}

/**
 * 3. 订单状态更新边界防护:
 * 食客仅允许取消未制作订单或完成收货确认，禁止修改订单金额或结算数据。
 */
export function sanitizeOrderStatusUpdateForCustomer(
  existingOrder: Order,
  updatePayload: Partial<Order>
): BoundaryCheckResult<Partial<Order>> {
  const tamperedFields: string[] = [];
  const safeUpdate: Partial<Order> = {};

  // 检查敏感字段篡改
  SENSITIVE_ORDER_FIELDS.forEach((f) => {
    const key = f as keyof Order;
    if (key in updatePayload && updatePayload[key] !== undefined) {
      if (updatePayload[key] !== existingOrder[key]) {
        tamperedFields.push(String(key));
      }
    }
  });

  // 食客端仅允许更新合法的状态（例如：申请退款/取消）
  // 客户可发起: cancel_requested / refund_pending (申请待商家审核) / pending 单直接取消(completed)
  if (updatePayload.status) {
    const nextStatus = updatePayload.status;
    if (nextStatus === 'cancel_requested' || nextStatus === 'refund_pending') {
      // 客户有权发起取消/退款申请(不得用于推进制作与配送进度)
      safeUpdate.status = nextStatus;
      safeUpdate.statusText = updatePayload.statusText || (nextStatus === 'cancel_requested' ? '客户申请终止订单' : '退单审核中');
    } else if (nextStatus === 'completed' && existingOrder.status === 'pending') {
      safeUpdate.status = 'completed';
      safeUpdate.statusText = updatePayload.statusText || '已取消/已退款';
    } else if (nextStatus === existingOrder.status) {
      safeUpdate.status = existingOrder.status;
    } else {
      tamperedFields.push('status');
    }
  }

  // 允许食客携带退款/取消申请附带的反馈字段
  if (!tamperedFields.includes('status')) {
    if (updatePayload.refundStatus && updatePayload.refundStatus !== existingOrder.refundStatus) {
      if (updatePayload.refundStatus === 'pending') safeUpdate.refundStatus = 'pending';
    }
    if (updatePayload.refundReason !== undefined && !tamperedFields.includes('refundReason')) {
      safeUpdate.refundReason = String(updatePayload.refundReason).slice(0, 200);
    }
    if (updatePayload.refundFeedback !== undefined && !tamperedFields.includes('refundFeedback')) {
      safeUpdate.refundFeedback = String(updatePayload.refundFeedback).slice(0, 200);
    }
  }

  if (tamperedFields.length > 0) {
    recordBoundaryAuditViolation('update_order_status', tamperedFields, 'obsidian_truck_orders', existingOrder.userId);
  }

  return {
    allowed: tamperedFields.length === 0,
    sanitizedData: safeUpdate,
    tamperedFields,
    violationWarning: tamperedFields.length > 0 ? `阻断非法修改订单字段: ${tamperedFields.join(', ')}` : undefined
  };
}
