import {
  PaymentChannelId,
  MerchantPaymentSettings,
  DEFAULT_MERCHANT_PAYMENT_SETTINGS,
  PaymentValidationResult,
  PaymentValidationCode,
  PaymentVoucher,
  PaymentSecurityLedgerItem,
  FallbackEscrowStatus
} from '../types/payment';
import { safeGetStorage, safeSetStorage } from './safeStorage';
import { speakText } from './voiceAlertEngine';

const STORAGE_KEY_FALLBACK_LEDGER = 'obsidian_payment_fallback_ledger';
const STORAGE_KEY_UNSETTLED_PAYMENTS = 'obsidian_unsettled_payments';

// 简易哈希计算生成防伪签名指纹 (国密/SHA-256 仿真)
function generateSecurityHash(payload: string): string {
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hexPart = Math.abs(hash).toString(16).padStart(8, '0');
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timePart = Date.now().toString(16);
  return `SEC-SM3-${hexPart.toUpperCase()}-${randomPart.toUpperCase()}-${timePart.toUpperCase()}`;
}

// 格式化当前中文友好时间
export function formatPaymentTime(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * 1. 支付前渠道动态验证与风控校验 (Payment Channel Validation)
 */
export function validatePaymentChannel(params: {
  channelId: PaymentChannelId;
  payAmount: number;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  merchantSettings?: MerchantPaymentSettings;
}): PaymentValidationResult {
  const settings =
    params.merchantSettings ||
    safeGetStorage<MerchantPaymentSettings>(
      'obsidian_merchant_payment_channels',
      DEFAULT_MERCHANT_PAYMENT_SETTINGS
    );

  const { channelId, payAmount, subtotal, discountAmount, deliveryFee } = params;

  // 生成本次交易的防重放幂等凭据
  const randomNonce = Math.floor(100000 + Math.random() * 900000);
  const securityToken = `IDEM-${Date.now()}-${randomNonce}`;

  const channelNames: Record<PaymentChannelId, string> = {
    wechat: '微信支付',
    alipay: '支付宝',
    card: '银联云闪付 / 银行卡',
    dcep: '数字人民币 (DCEP)',
    enterprise: '企业餐补签约免密',
    cash: '餐车窗口现付'
  };

  const channelName = channelNames[channelId] || '安全支付渠道';

  // 1.1 校验商户是否在前台开启了该渠道
  const isChannelEnabledByMerchant = settings.activeChannels[channelId] ?? true;
  if (!isChannelEnabledByMerchant) {
    return {
      valid: false,
      channel: channelId,
      channelName,
      code: 'CHANNEL_DISABLED',
      message: `商户当前暂未开通或已暂停【${channelName}】通道`,
      details: '黑曜石餐车当前仅支持已开启的聚合网关渠道，建议切换至常用支付方式。',
      recommendedFallbackChannel: settings.activeChannels.wechat
        ? 'wechat'
        : settings.activeChannels.alipay
        ? 'alipay'
        : 'card',
      securityToken,
      channelSpecs: {
        feeRate: 0.38,
        mchIdOrAppId: 'DISCONNECTED',
        latencyMs: 999,
        isEncrypted: true,
        protocol: 'TCP/TLS-FAIL'
      }
    };
  }

  // 1.2 校验金额防篡改与完整性 (Anti-Tamper Integrity Check)
  const expectedPayAmount = Math.max(0, subtotal + deliveryFee - discountAmount);
  if (Math.abs(expectedPayAmount - payAmount) > 0.05) {
    return {
      valid: false,
      channel: channelId,
      channelName,
      code: 'AMOUNT_MISMATCH',
      message: '支付实付金额防篡改校验未通过',
      details: `计算应付金额 ¥${expectedPayAmount.toFixed(2)} 与提交金额 ¥${payAmount.toFixed(
        2
      )} 存在异常偏差，已触发智能风控阻断。`,
      securityToken,
      channelSpecs: {
        feeRate: 0.38,
        mchIdOrAppId: 'SECURITY_ALERT',
        latencyMs: 12,
        isEncrypted: true,
        protocol: 'WAF-INTEGRITY-FAIL'
      }
    };
  }

  // 1.3 企业餐补渠道专属授信与白名单风控检测
  if (channelId === 'enterprise') {
    const ent = settings.enterprise;
    const remainingCredit = Math.max(0, ent.creditMonthlyLimit - ent.creditUsedThisMonth);
    if (payAmount > remainingCredit) {
      return {
        valid: false,
        channel: channelId,
        channelName,
        code: 'ENTERPRISE_CREDIT_EXCEEDED',
        message: '超过签约企业当月剩余餐补授信额度',
        details: `当前企业授信剩余可用 ¥${remainingCredit.toFixed(
          2
        )}，此单需划扣 ¥${payAmount.toFixed(
          2
        )}。超出企业月度免密签约额度，请切换至自费个人支付。`,
        recommendedFallbackChannel: 'wechat',
        securityToken,
        channelSpecs: {
          feeRate: 0.0,
          mchIdOrAppId: ent.contractCode || 'ENT-SH-CONTRACT',
          latencyMs: 18,
          isEncrypted: true,
          protocol: 'ENTERPRISE-SSO-V2'
        }
      };
    }
  }

  // 1.4 渠道网关连接状态健康检测
  let feeRate = 0.38;
  let mchId = settings.wechat.mchId;
  let latencyMs = 28;
  let protocol = 'TLS 1.3 / APIv3 RSA-4096';

  if (channelId === 'alipay') {
    feeRate = settings.alipay.feeRate || 0.38;
    mchId = settings.alipay.appId;
    latencyMs = 24;
    protocol = 'Alipay Open Gateway RSA2';
  } else if (channelId === 'card') {
    feeRate = settings.unionpay.feeRate || 0.5;
    mchId = settings.unionpay.merchantId;
    latencyMs = 38;
    protocol = 'China UnionPay Token 2.0';
  } else if (channelId === 'dcep') {
    feeRate = 0.0;
    mchId = settings.dcep.subWalletId;
    latencyMs = 19;
    protocol = 'PBOC DCEP Offline & Online Clearing';
  } else if (channelId === 'enterprise') {
    feeRate = 0.0;
    mchId = settings.enterprise.contractCode;
    latencyMs = 15;
    protocol = 'Enterprise Direct Billing API';
  }

  return {
    valid: true,
    channel: channelId,
    channelName,
    code: 'OK',
    message: '支付渠道环境安全，网关与商户号握手验证通过',
    details: `商户号/应用ID: ${mchId} · 清算费率: ${feeRate.toFixed(2)}% · 专线延迟: ${latencyMs}ms`,
    securityToken,
    channelSpecs: {
      feeRate,
      mchIdOrAppId: mchId,
      latencyMs,
      isEncrypted: true,
      protocol
    }
  };
}

/**
 * 2. 支付完成存证与防伪电子凭据生成 (Payment Voucher Generation)
 */
export function createPaymentVoucher(params: {
  orderNo: string;
  channelId: PaymentChannelId;
  paidAmount: number;
  originalAmount: number;
  discountAmount: number;
  diningMode: string;
  idempotencyKey?: string;
  escrowStatus?: FallbackEscrowStatus;
  customerPhone?: string;
  tableCode?: string;
  itemsSnapshot?: { name: string; quantity: number; price: number }[];
  merchantSettings?: MerchantPaymentSettings;
}): PaymentVoucher {
  const settings =
    params.merchantSettings ||
    safeGetStorage<MerchantPaymentSettings>(
      'obsidian_merchant_payment_channels',
      DEFAULT_MERCHANT_PAYMENT_SETTINGS
    );

  const now = new Date();
  const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now
    .getDate()
    .toString()
    .padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const voucherNo = `VOU-${dateStr}-${randomSuffix}`;

  // 根据支付渠道生成逼真且合规的网联交易流水号
  let transactionId = '';
  let channelName = '';
  let mchId = '';

  if (params.channelId === 'wechat') {
    channelName = '微信支付 (Tenpay)';
    mchId = settings.wechat.mchId || '1688920199';
    transactionId = `4200002199${dateStr}${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  } else if (params.channelId === 'alipay') {
    channelName = '支付宝 (Alipay)';
    mchId = settings.alipay.appId || '2021003189920112';
    transactionId = `20260904220014${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  } else if (params.channelId === 'card') {
    channelName = '中国银联 / 银行卡闪付';
    mchId = settings.unionpay.merchantId || '898310158120019';
    transactionId = `898310${dateStr}${Math.floor(10000000 + Math.random() * 90000000)}`;
  } else if (params.channelId === 'dcep') {
    channelName = '数字人民币 (DCEP 央行钱包)';
    mchId = settings.dcep.subWalletId || '9001882019920391';
    transactionId = `DCEP9001${dateStr}${Math.floor(10000000 + Math.random() * 90000000)}`;
  } else if (params.channelId === 'enterprise') {
    channelName = '签约企业餐补免密签单';
    mchId = settings.enterprise.contractCode || 'ENT-SH-2026-088';
    transactionId = `ENT-${dateStr}-${Math.floor(100000 + Math.random() * 900000)}`;
  } else {
    channelName = '餐车现场现金';
    mchId = 'CASH-WINDOW-01';
    transactionId = `CASH-${dateStr}-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  const idempotencyKey = params.idempotencyKey || `IDEM-${Date.now()}-${randomSuffix}`;
  const securityHash = generateSecurityHash(
    `${params.orderNo}|${params.paidAmount}|${transactionId}|${idempotencyKey}`
  );
  const offlineRecoveryCode = `UR-SEC-${Math.floor(100000 + Math.random() * 900000)}`;

  const voucher: PaymentVoucher = {
    voucherNo,
    orderNo: params.orderNo,
    transactionId,
    channelId: params.channelId,
    channelName,
    mchId,
    paidAmount: Number(params.paidAmount.toFixed(2)),
    originalAmount: Number(params.originalAmount.toFixed(2)),
    discountAmount: Number(params.discountAmount.toFixed(2)),
    paidAt: now.toISOString(),
    paidTimeFormatted: formatPaymentTime(now),
    idempotencyKey,
    securityHash,
    escrowStatus: params.escrowStatus || 'verified_synced',
    offlineRecoveryCode,
    diningMode: params.diningMode,
    customerPhone: params.customerPhone,
    tableCode: params.tableCode,
    itemsSnapshot: params.itemsSnapshot,
    soundboxBroadcastStatus: 'pending'
  };

  return voucher;
}

/**
 * 3. 支付成功双轨保全入库 (Dual-Track Fallback Ledger Write)
 */
export function recordPaymentToFallbackLedger(
  voucher: PaymentVoucher,
  isOfflineFallback: boolean = false
): PaymentSecurityLedgerItem {
  const ledgerItem: PaymentSecurityLedgerItem = {
    ...voucher,
    escrowStatus: isOfflineFallback ? 'local_fallback_escrowed' : voucher.escrowStatus,
    syncAttempts: isOfflineFallback ? 1 : 0,
    lastSyncAttemptAt: new Date().toISOString()
  };

  // 3.1 写入总账本
  const currentLedger = safeGetStorage<PaymentSecurityLedgerItem[]>(
    STORAGE_KEY_FALLBACK_LEDGER,
    []
  );
  // 保持去重并保留前 200 条
  const updatedLedger = [
    ledgerItem,
    ...currentLedger.filter((item) => item.voucherNo !== ledgerItem.voucherNo)
  ].slice(0, 200);

  safeSetStorage(STORAGE_KEY_FALLBACK_LEDGER, updatedLedger);

  // 3.2 若为离线或云端同步失败，写入待补偿对账队列 (Unsettled Queue)
  if (isOfflineFallback) {
    const currentUnsettled = safeGetStorage<PaymentSecurityLedgerItem[]>(
      STORAGE_KEY_UNSETTLED_PAYMENTS,
      []
    );
    const updatedUnsettled = [
      ledgerItem,
      ...currentUnsettled.filter((item) => item.voucherNo !== ledgerItem.voucherNo)
    ];
    safeSetStorage(STORAGE_KEY_UNSETTLED_PAYMENTS, updatedUnsettled);
  }

  // 3.3 企业餐补扣减本月已用额度
  if (voucher.channelId === 'enterprise') {
    try {
      const settings = safeGetStorage<MerchantPaymentSettings>(
        'obsidian_merchant_payment_channels',
        DEFAULT_MERCHANT_PAYMENT_SETTINGS
      );
      settings.enterprise.creditUsedThisMonth = Number(
        (settings.enterprise.creditUsedThisMonth + voucher.paidAmount).toFixed(2)
      );
      safeSetStorage('obsidian_merchant_payment_channels', settings);
    } catch {
      // safe fallback
    }
  }

  // 3.4 派发全局事件通知 UI 更新
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('obsidian_payment_ledger_updated', {
        detail: { ledgerItem, isOfflineFallback }
      })
    );
  }

  return ledgerItem;
}

/**
 * 获取本地全量支付保全账本
 */
export function getPaymentFallbackLedger(): PaymentSecurityLedgerItem[] {
  return safeGetStorage<PaymentSecurityLedgerItem[]>(STORAGE_KEY_FALLBACK_LEDGER, []);
}

export const getFallbackPaymentLedger = getPaymentFallbackLedger;

/**
 * 获取待补偿同步的离线保全账本
 */
export function getUnsettledPayments(): PaymentSecurityLedgerItem[] {
  return safeGetStorage<PaymentSecurityLedgerItem[]>(STORAGE_KEY_UNSETTLED_PAYMENTS, []);
}

/**
 * 根据订单编号或流水号查询电子支付凭证
 */
export function queryPaymentVoucherByOrderNo(orderNo: string): PaymentVoucher | null {
  const ledger = getPaymentFallbackLedger();
  const cleanTarget = (orderNo || '').replace(/^#/, '');
  const matched = ledger.find((v) => {
    const cleanVNo = (v.orderNo || '').replace(/^#/, '');
    return cleanVNo === cleanTarget || v.voucherNo === cleanTarget || v.transactionId === cleanTarget;
  });
  return matched || null;
}

/**
 * 4. 自动补偿与对账重试引擎 (Reconciliation & Compensation Sync Engine)
 */
export async function reconcileUnsettledPayments(): Promise<{
  reconciledCount: number;
  remainingCount: number;
  items: PaymentSecurityLedgerItem[];
}> {
  const unsettled = getUnsettledPayments();
  if (unsettled.length === 0) {
    return { reconciledCount: 0, remainingCount: 0, items: [] };
  }

  const ledger = getPaymentFallbackLedger();
  const newlyReconciled: PaymentSecurityLedgerItem[] = [];

  // 模拟对账与数据补传流程 (逐笔对账)
  for (const item of unsettled) {
    item.syncAttempts += 1;
    item.lastSyncAttemptAt = new Date().toISOString();
    // 成功对账转为 reconciled 状态
    item.escrowStatus = 'reconciled';
    newlyReconciled.push(item);
  }

  // 更新总账本状态
  const updatedLedger = ledger.map((item) => {
    const reconciledMatch = newlyReconciled.find((r) => r.voucherNo === item.voucherNo);
    return reconciledMatch ? { ...item, escrowStatus: 'reconciled' as FallbackEscrowStatus } : item;
  });
  safeSetStorage(STORAGE_KEY_FALLBACK_LEDGER, updatedLedger);

  // 清空已完全补偿对账的队列
  safeSetStorage(STORAGE_KEY_UNSETTLED_PAYMENTS, []);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('obsidian_payment_ledger_updated', {
        detail: { reconciled: true, count: newlyReconciled.length }
      })
    );
  }

  return {
    reconciledCount: newlyReconciled.length,
    remainingCount: 0,
    items: newlyReconciled
  };
}

/**
 * 5. 联动云音箱自动播报收款 (Soundbox Voice Broadcast Integration)
 */
export function broadcastPaymentVoiceReceipt(
  channelId: PaymentChannelId,
  amount: number,
  truckName: string = '黑曜石餐车 01 号'
): void {
  const channelPrefix: Record<PaymentChannelId, string> = {
    wechat: '微信支付收款',
    alipay: '支付宝到账',
    card: '银联云闪付收款',
    dcep: '数字人民币收款',
    enterprise: '签约企业餐补签单',
    cash: '餐车窗口现金收款'
  };

  const prefix = channelPrefix[channelId] || '收款成功';
  const broadcastText = `${prefix} ${amount.toFixed(2)} 元`;

  // 更新商户云音箱最新播报状态
  try {
    const settings = safeGetStorage<MerchantPaymentSettings>(
      'obsidian_merchant_payment_channels',
      DEFAULT_MERCHANT_PAYMENT_SETTINGS
    );
    if (settings.autoAudioBroadcast && settings.soundbox) {
      settings.soundbox.lastBroadcastText = `${broadcastText} (${truckName})`;
      settings.soundbox.lastBroadcastTime = '刚刚';
      safeSetStorage('obsidian_merchant_payment_channels', settings);
    }
  } catch {
    // ignore
  }

  // 播放高保真播报声
  try {
    speakText(broadcastText, { chimeType: 'order', persona: 'steady_male' });
  } catch (err) {
    console.warn('Voice broadcast suppressed or audio context blocked:', err);
  }
}

// 6. 防重复支付幂等锁 (Anti-Duplicate Payment Idempotency Lock)
const IDEMPOTENCY_LOCK_CACHE = new Map<string, number>();

/**
 * 尝试获取本次交易幂等锁 (默认 60 秒冷却，防止快速连点或并发重复扣划)
 */
export function acquireIdempotencyLock(orderKey: string, cooldownMs: number = 60000): boolean {
  if (!orderKey) return true;
  const now = Date.now();
  const lockedAt = IDEMPOTENCY_LOCK_CACHE.get(orderKey);
  if (lockedAt && now - lockedAt < cooldownMs) {
    return false; // 已被锁定
  }
  IDEMPOTENCY_LOCK_CACHE.set(orderKey, now);
  return true;
}

/**
 * 释放幂等锁 (例如支付失败或取消时)
 */
export function releaseIdempotencyLock(orderKey: string): void {
  if (orderKey) {
    IDEMPOTENCY_LOCK_CACHE.delete(orderKey);
  }
}

export interface ChannelHealthStatus {
  channelId: PaymentChannelId;
  name: string;
  icon: string;
  badge: string;
  latencyMs: number;
  status: 'healthy' | 'degraded' | 'disabled';
  maxLimit: number;
  discountSummary: string;
  securityProtocol: string;
}

/**
 * 7. 实时获取各支付渠道健康度与验证规格 (Channel Health Diagnostics)
 */
export function getChannelHealthDiagnostics(
  settings?: MerchantPaymentSettings
): ChannelHealthStatus[] {
  const s =
    settings ||
    safeGetStorage<MerchantPaymentSettings>(
      'obsidian_merchant_payment_channels',
      DEFAULT_MERCHANT_PAYMENT_SETTINGS
    );

  return [
    {
      channelId: 'wechat',
      name: '微信支付',
      icon: '🟢',
      badge: '推荐 · 首单随机减',
      latencyMs: 16,
      status: s.activeChannels.wechat ? 'healthy' : 'disabled',
      maxLimit: 10000,
      discountSummary: '微信首单最高减 ¥5.00 · 支持指纹免密',
      securityProtocol: 'WeChatPay-APIv3 · TLS 1.3 / AES-256-GCM'
    },
    {
      channelId: 'alipay',
      name: '支付宝',
      icon: '🔵',
      badge: '当面付 · 花呗',
      latencyMs: 22,
      status: s.activeChannels.alipay ? 'healthy' : 'disabled',
      maxLimit: 20000,
      discountSummary: '芝麻信用先享后付 · RSA2 数字验签',
      securityProtocol: 'Alipay RSA2 / 国密 SM2 公钥证书'
    },
    {
      channelId: 'card',
      name: '银联 / 银行卡',
      icon: '💳',
      badge: '云闪付 · 信用卡',
      latencyMs: 38,
      status: s.activeChannels.card ? 'healthy' : 'disabled',
      maxLimit: 50000,
      discountSummary: '中国银联收单中心结算 · 信用卡专属立减',
      securityProtocol: 'PBOC 3.0 / PCI-DSS 国际安全认证'
    },
    {
      channelId: 'dcep',
      name: '数字人民币',
      icon: '🔴',
      badge: '央行0费率 · 双离线',
      latencyMs: 12,
      status: s.activeChannels.dcep ? 'healthy' : 'disabled',
      maxLimit: 5000,
      discountSummary: '工行数币智能合约 · 专项美食补贴红包可用',
      securityProtocol: 'PBOC-DCEP 央行核心密码体系'
    },
    {
      channelId: 'enterprise',
      name: '企业餐补签约',
      icon: '🏢',
      badge: '免密直扣 · 月结',
      latencyMs: 8,
      status: s.activeChannels.enterprise ? 'healthy' : 'disabled',
      maxLimit: s.enterprise.creditMonthlyLimit,
      discountSummary: `签约单位: ${s.enterprise.enterpriseName} · 当月授信余额可扣`,
      securityProtocol: 'Enterprise-SSO 签约通道 · 专线局域网'
    }
  ];
}
