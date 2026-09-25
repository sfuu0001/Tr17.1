// Merchant Payment Channel Gateway Configuration Types

export type PaymentChannelId = 'wechat' | 'alipay' | 'card' | 'dcep' | 'enterprise' | 'cash';

export interface WechatPayConfig {
  mchId: string; // 微信支付商户号 (10位数字)
  appId: string; // 关联服务号/小程序 AppID
  apiV3Key: string; // APIv3 32位密钥
  serialNo: string; // 证书序列号
  privateKeyMasked: string; // 证书私钥 (掩码展示)
  subMchId?: string; // 特约商户号/服务商模式
  profitSharingEnabled: boolean; // 是否开启服务商/骑手实时分账
  jsapiPay: boolean; // JSAPI / 小程序唤起
  nativePay: boolean; // 扫码支付
  facePay: boolean; // 刷脸支付
  feeRate: number; // 结算费率 % (如 0.38)
  status: 'connected' | 'unconfigured' | 'testing' | 'error';
  lastPingAt?: string;
}

export interface AlipayConfig {
  appId: string; // 支付宝应用 AppID (16位数字)
  merchantPrivateKey: string; // RSA2 应用私钥
  alipayPublicKey: string; // 支付宝公钥
  signType: 'RSA2' | 'SM2'; // 签名类型
  certMode: boolean; // 是否启用公钥证书模式
  faceToFacePay: boolean; // 当面付 (条码/声波)
  huabeiPay: boolean; // 花呗分期
  creditFreeDeposit: boolean; // 芝麻信用免押
  feeRate: number; // 结算费率 % (如 0.38)
  status: 'connected' | 'unconfigured' | 'testing' | 'error';
  lastPingAt?: string;
}

export interface UnionPayConfig {
  merchantId: string; // 银联商户 MID (15位)
  terminalId: string; // 终端 TID (8位)
  acquirerName: string; // 收单机构 (如 中国银联 / 银联商务 / 招商银行收单)
  cloudQuickPass: boolean; // 云闪付支持
  applePay: boolean; // Apple Pay / NFC 手机闪付
  creditCardDiscount: boolean; // 信用卡立减优惠活动
  feeRate: number; // 结算费率 % (如 0.50)
  status: 'connected' | 'unconfigured' | 'testing' | 'error';
  lastPingAt?: string;
}

export interface DcepConfig {
  subWalletId: string; // 数字人民币商户子钱包编号 (16位)
  operatorOrg: string; // 运营机构 (如 工商银行 / 建设银行 / 农业银行 / 中国银行)
  nfcOfflinePay: boolean; // 双离线碰一碰支付支持
  smartContractAudit: boolean; // 智能合约定向补贴支持
  feeRate: number; // 结算费率 % (0.00% 央行政策免手续费)
  status: 'connected' | 'unconfigured' | 'testing' | 'error';
  lastPingAt?: string;
}

export interface EnterpriseBillingConfig {
  contractCode: string; // 企业签署协议号 (如 BTY-2026-SH01)
  enterpriseName: string; // 签约企业名称 (如 字节跳动上海研发中心 / 腾讯大厦)
  creditMonthlyLimit: number; // 月度总授信额度 (¥)
  creditUsedThisMonth: number; // 当月已签单消费 (¥)
  allowNoPasswordDeduction: boolean; // 员工企业工卡/指纹免密直扣
  employeeWhitelistCount: number; // 授权白名单员工数
  status: 'connected' | 'unconfigured' | 'testing' | 'error';
}

export interface SoundboxDeviceConfig {
  deviceId: string; // 云音箱 SN 设备序列号
  deviceName: string; // 设备名称
  model: string; // 型号 (如 微信小飞匣 Q3 / 支付宝极速播报云音箱 4G版)
  volume: number; // 音量 (0 - 100)
  voiceSpeed: 'normal' | 'fast' | 'slow'; // 播报语速
  bindChannel: 'all' | 'wechat' | 'alipay'; // 绑定播报渠道
  online: boolean; // 在线状态
  batteryPercent: number; // 电池电量 %
  lastBroadcastText?: string;
  lastBroadcastTime?: string;
}

export interface MerchantPaymentSettings {
  wechat: WechatPayConfig;
  alipay: AlipayConfig;
  unionpay: UnionPayConfig;
  dcep: DcepConfig;
  enterprise: EnterpriseBillingConfig;
  soundbox: SoundboxDeviceConfig;
  // 前台启用的支付渠道列表
  activeChannels: {
    wechat: boolean;
    alipay: boolean;
    card: boolean;
    dcep: boolean;
    enterprise: boolean;
    cash: boolean;
  };
  // 智能收款台码配置
  staticQrCodeUrl?: string; // 聚合收款静态码
  autoAudioBroadcast: boolean; // 自动语音播报开关
  defaultTZeroSettlement: boolean; // T+0 实时到账极速提现
  updatedAt: string;
}

// 默认商户支付配置 (已内置高仿真合规参数，开箱即用)
export const DEFAULT_MERCHANT_PAYMENT_SETTINGS: MerchantPaymentSettings = {
  wechat: {
    mchId: '1688920199',
    appId: 'wx88a7c20199f30b91',
    apiV3Key: 'ObsidianFoodTruckApiV3Secret202609',
    serialNo: '7F3E2B894410A9D21654C908129034EFA9109012',
    privateKeyMasked: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----',
    subMchId: '1900223910',
    profitSharingEnabled: true,
    jsapiPay: true,
    nativePay: true,
    facePay: true,
    feeRate: 0.38,
    status: 'connected',
    lastPingAt: '刚刚 (响应 32ms · 握手成功)'
  },
  alipay: {
    appId: '2021003189920112',
    merchantPrivateKey: 'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...',
    alipayPublicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAx4b7899...',
    signType: 'RSA2',
    certMode: true,
    faceToFacePay: true,
    huabeiPay: true,
    creditFreeDeposit: true,
    feeRate: 0.38,
    status: 'connected',
    lastPingAt: '刚刚 (响应 28ms · 握手成功)'
  },
  unionpay: {
    merchantId: '898310158120019',
    terminalId: '88290119',
    acquirerName: '中国银联上海分公司收单中心',
    cloudQuickPass: true,
    applePay: true,
    creditCardDiscount: true,
    feeRate: 0.50,
    status: 'connected',
    lastPingAt: '10分钟前 (响应 45ms)'
  },
  dcep: {
    subWalletId: '9001882019920391',
    operatorOrg: '中国工商银行上海分行数币运营部',
    nfcOfflinePay: true,
    smartContractAudit: true,
    feeRate: 0.00,
    status: 'connected',
    lastPingAt: '20分钟前 (央行数币清算网联在线)'
  },
  enterprise: {
    contractCode: 'ENT-SH-2026-BYTEDANCE-088',
    enterpriseName: '静安大悦城与恒隆商务签约企业员工餐补',
    creditMonthlyLimit: 50000.0,
    creditUsedThisMonth: 18920.0,
    allowNoPasswordDeduction: true,
    employeeWhitelistCount: 326,
    status: 'connected'
  },
  soundbox: {
    deviceId: 'SBX-4G-9920188',
    deviceName: '黑曜石餐车 01 号 4G极速云音箱',
    model: '极速语音播报音箱 4G Pro (内置eSIM)',
    volume: 85,
    voiceSpeed: 'normal',
    bindChannel: 'all',
    online: true,
    batteryPercent: 94,
    lastBroadcastText: '微信支付收款 38.00 元 (餐车 01 号)',
    lastBroadcastTime: '2 分钟前'
  },
  activeChannels: {
    wechat: true,
    alipay: true,
    card: true,
    dcep: true,
    enterprise: true,
    cash: true
  },
  staticQrCodeUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
  autoAudioBroadcast: true,
  defaultTZeroSettlement: true,
  updatedAt: new Date().toISOString()
};

// 支付渠道状态与风控校验结果
export type PaymentValidationCode = 
  | 'OK' 
  | 'CHANNEL_DISABLED' 
  | 'GATEWAY_ERROR' 
  | 'ENTERPRISE_CREDIT_EXCEEDED' 
  | 'AMOUNT_MISMATCH' 
  | 'RISK_BLOCKED';

export interface PaymentValidationResult {
  valid: boolean;
  channel: PaymentChannelId;
  channelName: string;
  code: PaymentValidationCode;
  message: string;
  details?: string;
  recommendedFallbackChannel?: PaymentChannelId;
  securityToken: string; // 幂等防重放凭证 (Idempotency Token)
  channelSpecs: {
    feeRate: number;
    mchIdOrAppId: string;
    latencyMs: number;
    isEncrypted: boolean;
    protocol: string;
  };
}

// 支付兜底承保状态
export type FallbackEscrowStatus = 
  | 'verified_synced'          // 已通过云端实时对账验证
  | 'local_fallback_escrowed'  // 网络离线/微服务延迟，已转入本地加密兜底存证承保
  | 'reconciled';              // 异步对账完成已核实

// 防伪电子支付凭证 / 资金清算回执
export interface PaymentVoucher {
  voucherNo: string; // e.g. VOU-20260904-8902
  orderNo: string; // e.g. UR-8902 / UR-DIN-8902
  transactionId: string; // 微信/支付宝/银联/数币流水号
  channelId: PaymentChannelId;
  channelName: string;
  mchId: string; // 商户号 / 收单机构终端号
  paidAmount: number; // 实付金额
  originalAmount: number; // 原价商品小计 + 运费
  discountAmount: number; // 综合立减优惠总计
  paidAt: string; // 交易时间 (ISO)
  paidTimeFormatted: string; // 友好格式化时间 (如 2026-09-04 15:52:10)
  idempotencyKey: string; // 幂等键
  securityHash: string; // 国密/SHA-256 数字签名防篡改校验码
  escrowStatus: FallbackEscrowStatus;
  offlineRecoveryCode: string; // 离线保全码 / 防伪核销码
  diningMode: string; // 用餐模式 (外卖/堂食/自提)
  customerPhone?: string;
  tableCode?: string;
  itemsSnapshot?: {
    name: string;
    quantity: number;
    price: number;
  }[];
  soundboxBroadcastStatus?: 'broadcasted' | 'pending' | 'muted';
}

// 本地兜底对账账本记录项
export interface PaymentSecurityLedgerItem extends PaymentVoucher {
  syncAttempts: number;
  lastSyncAttemptAt?: string;
  syncErrorMessage?: string;
}
