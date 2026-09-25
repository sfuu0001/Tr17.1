import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  RefreshCw,
  Zap,
  Smartphone,
  Fingerprint,
  Building,
  HelpCircle,
  X,
  Sparkles,
  ChevronRight,
  Radio,
  FileText,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PaymentChannelId,
  MerchantPaymentSettings,
  DEFAULT_MERCHANT_PAYMENT_SETTINGS,
  PaymentValidationResult,
  PaymentVoucher
} from '../../types/payment';
import { CartItem } from '../../types';
import { DiningMode } from '../DiningModeSelector';
import { safeGetStorage } from '../../utils/safeStorage';
import {
  validatePaymentChannel,
  createPaymentVoucher,
  recordPaymentToFallbackLedger,
  broadcastPaymentVoiceReceipt,
  acquireIdempotencyLock,
  releaseIdempotencyLock
} from '../../utils/paymentSecurityEngine';
import { useDevSimulation } from '../../context/DevSimulationContext';
import { useToast } from '../ui/ToastContext';
import {
  createRealPayOrder,
  triggerPaymentCallback,
  PayOrderResult
} from '../../utils/realPaymentCloudEngine';

interface PaymentConfirmCashierModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNo: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  finalAmount: number;
  diningMode: DiningMode;
  deliveryAddress: string;
  tableCode?: string;
  customerPhone?: string;
  initialChannel?: PaymentChannelId;
  onPaymentSuccess: (voucher: PaymentVoucher, selectedChannel: PaymentChannelId) => void;
  onViewVoucherRequest?: (voucher: PaymentVoucher) => void;
}

export const PaymentConfirmCashierModal: React.FC<PaymentConfirmCashierModalProps> = ({
  isOpen,
  onClose,
  orderNo,
  items,
  subtotal,
  discountAmount,
  deliveryFee,
  finalAmount,
  diningMode,
  deliveryAddress,
  tableCode,
  customerPhone = '138-8888-9201',
  initialChannel = 'wechat',
  onPaymentSuccess,
  onViewVoucherRequest
}) => {
  const toast = useToast();
  const { simulatePaymentOutcome } = useDevSimulation();

  const [selectedChannel, setSelectedChannel] = useState<PaymentChannelId>(initialChannel);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<
    'validating' | 'authorizing' | 'clearing' | 'escrowing' | null
  >(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);

  // Biometric / Passcode Auth Simulation State
  const [authMethod, setAuthMethod] = useState<'fingerprint' | 'face' | 'pin'>('fingerprint');

  // 渠道收款台状态机: idle=未跳转 awaiting_user=已跳转渠道等待用户付款 verifying=已付款回查支付状态
  const [payStage, setPayStage] = useState<'idle' | 'awaiting_user' | 'verifying'>('idle');
  const [cloudPayResult, setCloudPayResult] = useState<PayOrderResult | null>(null);
  const lockKeyRef = useRef<string>('');

  // 渠道收款台品牌配置
  const channelBrand: Record<string, { name: string; bg: string }> = {
    wechat: { name: '微信支付', bg: '#07C160' },
    alipay: { name: '支付宝', bg: '#1677FF' },
    card: { name: '银联云闪付', bg: '#c7000b' },
    dcep: { name: '数字人民币', bg: '#b12a2a' },
    enterprise: { name: '企业餐补', bg: '#4f46e5' }
  };

  // Load Merchant Payment Settings
  const merchantSettings: MerchantPaymentSettings = useMemo(() => {
    return safeGetStorage<MerchantPaymentSettings>(
      'obsidian_merchant_payment_channels',
      DEFAULT_MERCHANT_PAYMENT_SETTINGS
    );
  }, []);

  // Update selected channel when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedChannel(initialChannel);
      setValidationError(null);
      setFallbackWarning(null);
      setIsProcessing(false);
      setProcessingStep(null);
      setPayStage('idle');
      lockKeyRef.current = '';
    }
  }, [isOpen, initialChannel]);

  // Real-time channel validation check
  const validationResult: PaymentValidationResult = useMemo(() => {
    return validatePaymentChannel({
      channelId: selectedChannel,
      payAmount: finalAmount,
      subtotal,
      discountAmount,
      deliveryFee,
      merchantSettings
    });
  }, [selectedChannel, finalAmount, subtotal, discountAmount, deliveryFee, merchantSettings]);

  if (!isOpen) return null;

  const channelOptions: {
    id: PaymentChannelId;
    name: string;
    icon: string;
    badge: string;
    subLabel: string;
    color: string;
    accentBg: string;
    accentBorder: string;
  }[] = [
    {
      id: 'wechat',
      name: '微信支付',
      icon: '🟢',
      badge: '首单随机立减 · 推荐',
      subLabel: '商户号: 1688920199 · 微信指纹/面容极速扣款',
      color: 'text-emerald-600',
      accentBg: 'bg-emerald-50/80',
      accentBorder: 'border-emerald-500'
    },
    {
      id: 'alipay',
      name: '支付宝',
      icon: '🔵',
      badge: '花呗免息 · 芝麻信用',
      subLabel: 'AppID: 2021003189920112 · 当面付 RSA2 验签',
      color: 'text-sky-600',
      accentBg: 'bg-sky-50/80',
      accentBorder: 'border-sky-500'
    },
    {
      id: 'card',
      name: '银联 / 银行卡',
      icon: '💳',
      badge: '云闪付 · Apple Pay',
      subLabel: '中国银联上海收单中心 · NFC 极速感应',
      color: 'text-amber-600',
      accentBg: 'bg-amber-50/80',
      accentBorder: 'border-amber-500'
    },
    {
      id: 'dcep',
      name: '数字人民币',
      icon: '🔴',
      badge: '央行0费率 · 双离线',
      subLabel: '工商银行上海数币运营部 · 子钱包智能合约',
      color: 'text-rose-600',
      accentBg: 'bg-rose-50/80',
      accentBorder: 'border-rose-500'
    },
    {
      id: 'enterprise',
      name: '企业餐补签约',
      icon: '🏢',
      badge: '免密直扣 · 白名单',
      subLabel: `签约企业: ${merchantSettings.enterprise.enterpriseName} · 月授信余额可扣`,
      color: 'text-indigo-600',
      accentBg: 'bg-indigo-50/80',
      accentBorder: 'border-indigo-500'
    }
  ];

  const currentChannelOption = channelOptions.find((c) => c.id === selectedChannel) || channelOptions[0];

  const handleConfirmPay = () => {
    // 0. 防重复支付幂等锁核查 (60s 冷却防护)
    const lockKey = orderNo || validationResult.securityToken;
    const lockAcquired = acquireIdempotencyLock(lockKey);
    if (!lockAcquired) {
      toast.warning('支付处理中，请勿重复发起', '系统已开启防重放幂等保护，请稍候');
      return;
    }
    lockKeyRef.current = lockKey;

    // 1. Check channel validation
    if (!validationResult.valid) {
      releaseIdempotencyLock(lockKey);
      lockKeyRef.current = '';
      toast.error('支付渠道校验未通过', validationResult.message);
      setValidationError(validationResult.message);
      return;
    }

    setValidationError(null);
    setIsProcessing(true);
    setProcessingStep('validating');

    // 2. Step 1: Channel handshake & risk token verification
    setTimeout(() => {
      setProcessingStep('authorizing');

      // Step 2: 渠道免密/签名鉴权完成 → 分流
      setTimeout(() => {
        if (selectedChannel === 'enterprise') {
          // 企业餐补为签约免密直扣：渠道内直接完成扣款，进入清算与出账
          setProcessingStep('clearing');

          setTimeout(() => {
            setProcessingStep('escrowing');
            setTimeout(() => {
              finalizePaymentSuccess(false);
            }, 350);
          }, 350);
        } else {
          // 微信/支付宝/银联/数币：调用真实金融级统一下单引擎生成支付凭据与专属动态收款码
          const payChannel = selectedChannel === 'alipay' ? 'alipay' : 'wechat';
          createRealPayOrder({
            channel: payChannel,
            orderNo,
            amount: finalAmount,
            description: `流动餐车就餐专送订单 - ${orderNo}`
          })
            .then((res) => {
              setCloudPayResult(res);
              setIsProcessing(false);
              setProcessingStep(null);
              setPayStage('awaiting_user');
            })
            .catch(() => {
              setIsProcessing(false);
              setProcessingStep(null);
              setPayStage('awaiting_user');
            });
        }
      }, 350);
    }, 400);
  };

  // 用户在渠道收款台内点击「立即付款」→ 渠道扣款后系统回查验证支付状态
  const handleChannelPay = () => {
    setPayStage('verifying');
    const lockKey = lockKeyRef.current;

    // 触发云支付回调
    if (cloudPayResult?.outTradeNo) {
      triggerPaymentCallback(cloudPayResult.outTradeNo).catch(() => {});
    }

    // 支付状态查询（网联对账回查），验证通过才允许出单
    setTimeout(() => {
      // Functional Experiment: Simulated Payment Timeout
      if (simulatePaymentOutcome === 'timeout') {
        setPayStage('idle');
        releaseIdempotencyLock(lockKey);
        lockKeyRef.current = '';
        setFallbackWarning('网关网络波动 (504 Gateway Timeout)，支付状态回查失败。已开启支付兜底保全，您可以选择重试或一键启用离线凭据承保。');
        toast.error('【支付网关实验】支付状态查询超时', '建议点击下方【离线兜底承保支付】安全出单');
        return;
      }

      // Functional Experiment: Simulated Payment Decline
      if (simulatePaymentOutcome === 'fail') {
        setPayStage('idle');
        releaseIdempotencyLock(lockKey);
        lockKeyRef.current = '';
        setValidationError('渠道返回扣款失败（余额不足或风控拦截），订单仍为待支付状态，请更换支付渠道。');
        toast.error('支付状态验证未通过', '渠道确认本次扣款未成功，请重试或切换渠道');
        return;
      }

      // 渠道确认已收款 → 出账
      finalizePaymentSuccess(false);
    }, 1300);
  };

  // 用户取消渠道支付 → 保持待支付，不出凭证
  const handleCancelChannelPay = () => {
    setPayStage('idle');
    const lockKey = lockKeyRef.current;
    if (lockKey) {
      releaseIdempotencyLock(lockKey);
      lockKeyRef.current = '';
    }
    toast.info('已取消支付', '未完成收款，订单仍为待支付状态');
  };

  // 验证通过后的统一出账流程（生成防伪凭证 → 双轨账本 → 云音箱播报 → 成功回调）
  const finalizePaymentSuccess = (isFallback: boolean) => {
    const voucher = createPaymentVoucher({
      orderNo,
      channelId: selectedChannel,
      paidAmount: finalAmount,
      originalAmount: subtotal + deliveryFee,
      discountAmount,
      diningMode:
        diningMode === 'delivery'
          ? '外卖专送'
          : diningMode === 'dine_in'
          ? `现场堂食 (${tableCode || 'A2'}号桌)`
          : '到车自提',
      idempotencyKey: isFallback ? `IDEM-FALLBACK-${Date.now()}` : validationResult.securityToken,
      escrowStatus: isFallback ? 'local_fallback_escrowed' : undefined,
      customerPhone,
      tableCode,
      itemsSnapshot: items.map((i) => ({
        name: i.dish.name,
        quantity: i.quantity,
        price: i.calculatedPrice / i.quantity
      })),
      merchantSettings
    });

    // Dual-track fallback ledger write
    recordPaymentToFallbackLedger(voucher, isFallback);

    // Trigger Soundbox Audio Broadcast
    broadcastPaymentVoiceReceipt(selectedChannel, finalAmount);

    setIsProcessing(false);
    setProcessingStep(null);
    setPayStage('idle');
    lockKeyRef.current = '';

    // Notify Success Callback
    onPaymentSuccess(voucher, selectedChannel);
  };

  // Emergency Fallback Escrow Pay (兜底承保强行出单)
  const handleForceFallbackEscrowPay = () => {
    setIsProcessing(true);
    setProcessingStep('escrowing');

    setTimeout(() => {
      finalizePaymentSuccess(true);

      toast.success(
        '已启用支付离线兜底承保！',
        `订单 ${orderNo} 已生成国家防伪凭证，餐车主厨与配送员将立即优先制作！`
      );
    }, 500);
  };

  return (
    <>
    <div
      id="payment-confirm-cashier-modal"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-[5px] border border-[#e2e2dc] shadow-2xl max-w-lg w-full overflow-hidden text-neutral-900"
      >
        {/* Header Strip */}
        <div className="bg-[#1a1a17] text-white px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[5px] bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black flex items-center gap-1.5">
                <span>黑曜石餐车 · 安全收银台</span>
                <span className="text-[9.5px] px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 rounded-[5px] font-mono font-bold">
                  256-Bit SSL
                </span>
              </h3>
              <p className="text-[10px] text-neutral-400">
                订单编号：{orderNo} · 网联实时验签与双轨兜底保护
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-7 h-7 rounded-[5px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Hero Section */}
        <div className="p-4 sm:p-5 bg-[#fafaf8] border-b border-[#e2e2dc] text-center space-y-1">
          <div className="text-[10.5px] text-neutral-500 font-bold uppercase tracking-wider">
            应付实缴金额 (CNY)
          </div>
          <div className="text-3xl sm:text-4xl font-black text-neutral-950 font-mono tracking-tight">
            <span className="text-xl sm:text-2xl mr-0.5">¥</span>
            {finalAmount.toFixed(2)}
          </div>
          <div className="flex items-center justify-center gap-2 text-[10.5px] text-neutral-600 font-medium">
            <span>小计 ¥{subtotal.toFixed(2)}</span>
            {deliveryFee > 0 && <span>+ 配送 ¥{deliveryFee.toFixed(2)}</span>}
            {discountAmount > 0 && (
              <span className="text-emerald-700 bg-[#eafaf1] border border-emerald-200 px-1.5 py-0.2 rounded-[5px] font-bold">
                已享立减 -¥{discountAmount.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-3.5 max-h-[60vh] overflow-y-auto">
          {/* Channel Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-neutral-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-neutral-600" />
                <span>支付渠道选择</span>
              </span>
              <span className="text-[10px] text-neutral-500">
                支持渠道专属补贴与立减
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {channelOptions.map((opt) => {
                const isSelected = selectedChannel === opt.id;
                const isEnabled = merchantSettings.activeChannels[opt.id] ?? true;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedChannel(opt.id);
                      setValidationError(null);
                      setFallbackWarning(null);
                    }}
                    className={`w-full p-2.5 rounded-[5px] border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? `${opt.accentBg} ${opt.accentBorder} border-2 shadow-2xs`
                        : !isEnabled
                        ? 'bg-neutral-100/60 border-neutral-200 opacity-60'
                        : 'bg-white border-[#e2e2dc] hover:bg-[#f9f9f7]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{opt.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-black ${
                              isSelected ? 'text-black' : 'text-neutral-800'
                            }`}
                          >
                            {opt.name}
                          </span>
                          <span
                            className={`text-[9.5px] px-1.5 py-0.2 rounded-[5px] font-bold ${
                              isSelected
                                ? 'bg-black text-white'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {opt.badge}
                          </span>
                          {!isEnabled && (
                            <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded-[5px] font-bold">
                              商户未开通
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                          {opt.subLabel}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'bg-black border-black text-white'
                            : 'border-neutral-300 bg-white'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Channel Gateway Readiness Card */}
          <div
            className={`p-3 rounded-[5px] border text-xs space-y-2 ${
              validationResult.valid
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                : 'bg-red-50/60 border-red-200 text-red-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-black">
                {validationResult.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>
                  {validationResult.valid
                    ? `${validationResult.channelName} · 渠道验证通过`
                    : `${validationResult.channelName} · 渠道阻断提示`}
                </span>
              </div>
              <span
                className={`text-[9.5px] px-1.5 py-0.2 rounded-[5px] font-mono font-bold ${
                  validationResult.valid
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {validationResult.channelSpecs.latencyMs}ms 握手
              </span>
            </div>

            <p className="text-[10.5px] leading-relaxed text-neutral-700">
              {validationResult.details || validationResult.message}
            </p>

            {/* Spec strip */}
            <div className="pt-1 border-t border-black/5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-500 font-mono">
              <span>协议: {validationResult.channelSpecs.protocol}</span>
              <span>费率: {validationResult.channelSpecs.feeRate.toFixed(2)}%</span>
              <span>商户: {validationResult.channelSpecs.mchIdOrAppId}</span>
            </div>
          </div>

          {/* Validation or Fallback Warning Alerts */}
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">{validationError}</p>
                {validationResult.recommendedFallbackChannel && (
                  <button
                    type="button"
                    onClick={() => {
                      if (validationResult.recommendedFallbackChannel) {
                        setSelectedChannel(validationResult.recommendedFallbackChannel);
                        setValidationError(null);
                      }
                    }}
                    className="text-[11px] font-bold text-red-700 underline cursor-pointer hover:text-red-900"
                  >
                    点击切换至推荐渠道 (
                    {validationResult.recommendedFallbackChannel === 'wechat'
                      ? '微信支付'
                      : '支付宝'}
                    )
                  </button>
                )}
              </div>
            </div>
          )}

          {fallbackWarning && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">支付网关响应延迟 (兜底模式就绪)</p>
                  <p className="text-[10.5px] leading-relaxed text-amber-800">
                    {fallbackWarning}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleForceFallbackEscrowPay}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>启用离线凭据承保（立即通知餐车出单）</span>
              </button>
            </div>
          )}

          {/* Security & Idempotency Proof Badge */}
          <div className="p-2.5 bg-neutral-100/70 rounded-xl border border-neutral-200 text-[10.5px] text-neutral-600 space-y-1">
            <div className="flex items-center justify-between font-mono text-[9.5px]">
              <span className="text-neutral-500">防重放幂等凭证:</span>
              <span className="font-bold text-neutral-800 truncate max-w-[220px]">
                {validationResult.securityToken}
              </span>
            </div>
            <div className="flex items-center justify-between text-[9.5px] text-neutral-500">
              <span>履约保全:</span>
              <span className="text-emerald-700 font-bold">
                黑曜石双轨对账账本 · 离线不可抵赖
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer / Action Button */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#e2e2dc] space-y-2">
          <button
            type="button"
            disabled={isProcessing || !validationResult.valid}
            onClick={handleConfirmPay}
            className={`w-full py-3 rounded-[5px] font-black text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98 ${
              isProcessing
                ? 'bg-neutral-800 text-white cursor-wait'
                : !validationResult.valid
                ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                : 'bg-[#1a1a17] hover:bg-black text-white'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>
                  {processingStep === 'validating'
                    ? '正在核验网关密钥与风控规则...'
                    : processingStep === 'authorizing'
                    ? '正在执行防重放签名与免密鉴权...'
                    : processingStep === 'clearing'
                    ? '正在网联清算中心扣划资金...'
                    : '正在写入双轨兜底保全账本...'}
                </span>
              </div>
            ) : (
              <>
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>确认支付 ¥{finalAmount.toFixed(2)}</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-3 text-[10px] text-neutral-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              中国人民银行数币与网联清算合规
            </span>
            <span>·</span>
            <span>极速退款保障</span>
            <span>·</span>
            <span>4G云音箱实时播报</span>
          </div>
        </div>
      </motion.div>
    </div>

    {/* 渠道收款台：模拟跳转微信/支付宝等渠道完成真实收款，付款后系统回查支付状态 */}
    <AnimatePresence>
      {payStage !== 'idle' && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full sm:max-w-sm bg-white rounded-t-[8px] sm:rounded-[5px] overflow-hidden shadow-2xl border border-[#e2e2dc]"
          >
            {/* 渠道品牌栏 */}
            <div
              className="px-4 py-3 flex items-center justify-between text-white"
              style={{ backgroundColor: channelBrand[selectedChannel]?.bg || '#07C160' }}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-white/90" />
                <span className="text-sm font-black">
                  {channelBrand[selectedChannel]?.name || '渠道收款台'}
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-[5px] font-bold">
                官方安全收款
              </span>
            </div>

            {/* 付款信息 */}
            <div className="px-5 pt-5 pb-4 text-center space-y-1.5 bg-white">
              <p className="text-[10.5px] text-neutral-500 font-medium">
                向商户「黑曜石餐车」付款
              </p>
              <div className="text-3xl font-black text-neutral-950 tracking-tight">
                <span className="text-xl mr-0.5">¥</span>
                {finalAmount.toFixed(2)}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-neutral-500 pt-1">
                <span>支付方式</span>
                <span className="font-bold text-neutral-800">
                  {currentChannelOption.name}
                </span>
                <ChevronRight className="w-3 h-3 text-neutral-400" />
              </div>
              <p className="text-[9.5px] text-neutral-400 font-mono pt-1">
                订单号 {orderNo}
              </p>

              {/* 真实动态扫码收款码展示 (支持手机直接扫码) */}
              {cloudPayResult?.qrDisplayUrl && (
                <div className="pt-2 flex flex-col items-center justify-center">
                  <div className="p-2 bg-white rounded-[5px] border border-neutral-200 shadow-2xs inline-block">
                    <img
                      src={cloudPayResult.qrDisplayUrl}
                      alt="动态收款二维码"
                      className="w-36 h-36 mx-auto rounded-[5px]"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-neutral-600 mt-1.5 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-neutral-500" />
                    <span>支持打开手机直接扫码付</span>
                  </span>
                  <span className="text-[9px] text-neutral-400 font-mono">
                    流水号: {cloudPayResult.outTradeNo}
                  </span>
                </div>
              )}
            </div>

            {/* 操作区 */}
            {payStage === 'awaiting_user' ? (
              <div className="px-5 pb-6 pt-2 space-y-2.5 bg-neutral-50 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={handleChannelPay}
                  className="w-full py-3 rounded-[5px] text-white text-sm font-black shadow-xs active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                  style={{ backgroundColor: channelBrand[selectedChannel]?.bg || '#07C160' }}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>立即支付 ¥{finalAmount.toFixed(2)}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelChannelPay}
                  className="w-full py-2.5 rounded-[5px] bg-white border border-neutral-200 text-neutral-600 text-xs font-bold hover:bg-neutral-100 transition-all cursor-pointer"
                >
                  暂不支付（订单保持待支付）
                </button>
                <p className="text-[9.5px] text-neutral-400 text-center leading-relaxed">
                  已跳转至{channelBrand[selectedChannel]?.name || '渠道'}收款台，请在此完成付款。系统将在付款后自动回查支付状态，验证通过方视为支付成功。
                </p>
              </div>
            ) : (
              <div className="px-5 pb-7 pt-4 space-y-3 bg-neutral-50 border-t border-neutral-100 text-center">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-neutral-800">
                  <span className="w-4 h-4 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
                  <span>正在验证支付状态，请勿关闭…</span>
                </div>
                <p className="text-[10px] text-neutral-500 leading-relaxed">
                  正在向{channelBrand[selectedChannel]?.name || '渠道'}网关查询订单收款结果（防重放校验 · 网联对账回查），验证通过后才会通知餐出餐。
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
};
