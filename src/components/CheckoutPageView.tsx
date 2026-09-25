import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ShoppingBag,
  MapPin,
  Clock,
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  Check,
  Edit2,
  Lock,
  Tag,
  Gift,
  CheckCircle2,
  X,
  Sparkles,
  Zap,
  Radio,
  FileText,
  QrCode,
  Smartphone,
  CreditCard,
  Building,
  RefreshCw,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem, BoundTableInfo } from '../types';
import { DiningMode } from './DiningModeSelector';
import { TableBindModal } from './table/TableBindModal';
import { useTableSessionUi } from './table/useTableSessionUi';
import { AddressSelectorModal } from './AddressSelectorModal';
import { getCurrentBoundTable } from '../utils/tableStorage';
import { useToast } from './ui/ToastContext';
import { PaymentChannelId, PaymentVoucher } from '../types/payment';
import { ElectronicPaymentVoucherModal } from './payment/ElectronicPaymentVoucherModal';
import { matchDishImageUrl } from '../utils/dishImageMatcher';
import { userJourneyTracker } from '../utils/userJourneyTracker';
import { CouponItem, UserCouponRecord } from '../types/coupon';
import {
  getAvailableUserCoupons,
  getMerchantCoupons,
  getUserCouponRecords,
  saveUserCouponRecords,
  pickBestAvailableCoupon,
  resolveCouponByCode
} from '../utils/couponEngine';
import {
  createPaymentVoucher,
  broadcastPaymentVoiceReceipt
} from '../utils/paymentSecurityEngine';
import { getActiveTruckConfig } from '../utils/truckLocationEngine';

export interface CheckoutPageViewProps {
  items: CartItem[];
  deliveryAddress: string;
  onChangeAddress: (newAddress: string) => void;
  onOpenAddressModal?: () => void;
  diningMode: DiningMode;
  onDiningModeChange: (mode: DiningMode) => void;
  isVIPActive: boolean;
  onBackToMenu: () => void;
  onUpdateCartQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveCartItem: (cartItemId: string) => void;
  onCompleteCheckout: (
    orderNotes: string,
    coupon: string,
    paymentMethod: string,
    paymentVoucher?: PaymentVoucher
  ) => string | void;
  onGoToTracking: (orderId?: string) => void;
  onGoToOrders: () => void;
}

// 支付方式选项定义
export type PaymentMethodKey = 'wechat' | 'alipay' | 'unionpay' | 'ecny' | 'corp';

interface PaymentChannelOption {
  key: PaymentMethodKey;
  channelId: PaymentChannelId;
  name: string;
  badge: string;
  desc: string;
  discount: number;
  iconBg: string;
  iconColor: string;
}

const PAYMENT_OPTIONS: PaymentChannelOption[] = [
  {
    key: 'wechat',
    channelId: 'wechat',
    name: '微信支付',
    badge: '推荐 · 首单立减',
    desc: '官方安全直连 · 支持指纹 / 面容免密',
    discount: 3.0,
    iconBg: '#07c160',
    iconColor: '#ffffff'
  },
  {
    key: 'alipay',
    channelId: 'alipay',
    name: '支付宝',
    badge: '芝麻免密 · 花呗分期',
    desc: '蚂蚁保驾护航 · 快捷转账与红包直抵',
    discount: 2.5,
    iconBg: '#1677ff',
    iconColor: '#ffffff'
  },
  {
    key: 'unionpay',
    channelId: 'card',
    name: '银联 / 云闪付 · Apple Pay',
    badge: 'NFC 碰一碰',
    desc: '招商银行储蓄卡(9201) · 笔笔立减随机返',
    discount: 2.0,
    iconBg: '#d92d20',
    iconColor: '#ffffff'
  },
  {
    key: 'ecny',
    channelId: 'dcep',
    name: '数字人民币 (e-CNY)',
    badge: '央行0费率 · 双离线',
    desc: '国家法定数字货币 · 硬钱包智能合约收兑',
    discount: 4.0,
    iconBg: '#e11d48',
    iconColor: '#ffffff'
  },
  {
    key: 'corp',
    channelId: 'enterprise',
    name: '大悦城企业餐补直扣',
    badge: '白名单免密',
    desc: '企业授信额度结存：¥348.50 · 每月自动报销',
    discount: 5.0,
    iconBg: '#1a1a17',
    iconColor: '#ffffff'
  }
];

export const CheckoutPageView: React.FC<CheckoutPageViewProps> = ({
  items,
  deliveryAddress,
  onChangeAddress,
  onOpenAddressModal,
  diningMode,
  onDiningModeChange,
  isVIPActive,
  onBackToMenu,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onCompleteCheckout,
  onGoToTracking,
  onGoToOrders
}) => {
  const toast = useToast();

  // 当前主阶段：Stage 1 确认明细 <-> Stage 2 安全收兑
  const [activeStage, setActiveStage] = useState<1 | 2>(1);

  // 选中的支付方式（默认微信支付）
  const [selectedMethodKey, setSelectedMethodKey] = useState<PaymentMethodKey>('wechat');
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);

  // 备注与忌口偏好
  const [remarkInput, setRemarkInput] = useState('');
  const [isRemarkOpen, setIsRemarkOpen] = useState(false);
  const [quickTags, setQuickTags] = useState<string[]>([]);

  // 优惠券状态
  const [couponCode, setCouponCode] = useState<string>('');
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [customCouponInput, setCustomCouponInput] = useState('');

  // 堂食绑定桌台状态
  const [boundTable, setBoundTable] = useState<BoundTableInfo | null>(() => getCurrentBoundTable());
  const [isTableBindModalOpen, setIsTableBindModalOpen] = useState(false);
  // T3 会话状态（单例）：开台会话存在时优先展示会话信息，绑定验证统一由 TableBindModal 承担
  const tableSession = useTableSessionUi();

  // 地址选择器弹窗
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // 二维码倒计时（Stage 2）
  const [qrCountdown, setQrCountdown] = useState(60);

  // 支付完成与凭据状态
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [createdOrderNo, setCreatedOrderNo] = useState('');
  const [completedVoucher, setCompletedVoucher] = useState<PaymentVoucher | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isPayingNow, setIsPayingNow] = useState(false);

  // 监听桌台绑定变化
  useEffect(() => {
    const handleBoundTableChanged = (e: Event) => {
      const customEvent = e as CustomEvent<BoundTableInfo | null>;
      setBoundTable(customEvent.detail ?? getCurrentBoundTable());
    };
    window.addEventListener('obsidian_bound_table_changed', handleBoundTableChanged);
    return () => window.removeEventListener('obsidian_bound_table_changed', handleBoundTableChanged);
  }, []);

  // Stage 2 二维码倒计时刷新
  useEffect(() => {
    if (activeStage !== 2) return;
    const timer = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeStage]);

  // 费用计算引擎
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.calculatedPrice, 0), [items]);
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  // 包装费 (环保降解餐盒与保温袋)
  const packagingFee = useMemo(() => (totalQuantity > 0 ? 2.0 : 0.0), [totalQuantity]);

  // 配送费规则 (外卖满 80 免配送费，否则 5 元)
  const activeDeliveryFee = useMemo(() => {
    if (totalQuantity === 0 || diningMode !== 'delivery') return 0.0;
    return subtotal >= 80 ? 0.0 : 5.0;
  }, [totalQuantity, diningMode, subtotal]);

  // 优惠券匹配与折扣
  const itemCategoryList = useMemo(() => items.map((i) => i.dish?.category as string), [items]);
  const couponEligibility = useMemo(() => {
    if (!couponCode || totalQuantity === 0) return null;
    return resolveCouponByCode(couponCode, {
      subtotal,
      deliveryFee: activeDeliveryFee,
      diningMode: diningMode as any,
      itemCategories: itemCategoryList
    });
  }, [couponCode, subtotal, activeDeliveryFee, diningMode, totalQuantity, itemCategoryList]);

  const effectiveCouponDiscount =
    totalQuantity === 0
      ? 0
      : couponEligibility?.record && couponEligibility.eligibility.usable
      ? couponEligibility.eligibility.maxDiscount
      : 0;

  // 自动推荐最优优惠券
  useEffect(() => {
    if (totalQuantity === 0) return;
    const best = pickBestAvailableCoupon({
      subtotal,
      deliveryFee: activeDeliveryFee,
      diningMode: diningMode as any,
      itemCategories: itemCategoryList
    });
    if (best) {
      setCouponCode(best.coupon.code);
    }
  }, [subtotal, totalQuantity, activeDeliveryFee, diningMode, itemCategoryList]);

  // 支付渠道立减
  const currentMethod = useMemo(
    () => PAYMENT_OPTIONS.find((p) => p.key === selectedMethodKey) || PAYMENT_OPTIONS[0],
    [selectedMethodKey]
  );
  const channelDiscount = currentMethod.discount;

  // VIP 折扣
  const vipDiscount = isVIPActive ? 3.0 : 0.0;

  // 总优惠额度
  const totalDiscount = useMemo(() => {
    return Number((effectiveCouponDiscount + channelDiscount + vipDiscount).toFixed(2));
  }, [effectiveCouponDiscount, channelDiscount, vipDiscount]);

  // 最终实付金额
  const finalAmount = useMemo(() => {
    const raw = subtotal + packagingFee + activeDeliveryFee - totalDiscount;
    return Math.max(0.01, Number(raw.toFixed(2)));
  }, [subtotal, packagingFee, activeDeliveryFee, totalDiscount]);

  // 履约模式切换
  const handleFulfillmentSelect = (mode: DiningMode) => {
    onDiningModeChange(mode);
    if (mode === 'dine_in' && !boundTable) {
      setIsTableBindModalOpen(true);
    }
    const label = mode === 'delivery' ? '外卖配送' : mode === 'pickup' ? '到车自提' : '堂食餐位';
    toast.info(`已切换履约方式为：${label}`);
  };

  // 快捷备注切换
  const handleToggleTag = (tag: string) => {
    setQuickTags((prev) => {
      const next = prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag];
      return next;
    });
  };

  // 组合备注文本
  const finalRemarkText = useMemo(() => {
    const parts: string[] = [];
    if (quickTags.length > 0) parts.push(quickTags.join('、'));
    if (remarkInput.trim()) parts.push(remarkInput.trim());
    return parts.join('；') || '无特殊偏好要求';
  }, [quickTags, remarkInput]);

  // 提交支付
  const handleExecutePayment = () => {
    if (isPayingNow) return;
    setIsPayingNow(true);

    const generatedOrderNo = `ORD-${Date.now().toString().slice(-5)}`;
    const itemsSnapshot = items.map((i) => ({
      name: i.dish.name,
      quantity: i.quantity,
      price: i.calculatedPrice / i.quantity
    }));

    // 生成安全电子存证凭据
    const voucher = createPaymentVoucher({
      orderNo: generatedOrderNo,
      channelId: currentMethod.channelId,
      paidAmount: finalAmount,
      originalAmount: subtotal + packagingFee + activeDeliveryFee,
      discountAmount: totalDiscount,
      diningMode,
      itemsSnapshot
    });

    setTimeout(() => {
      setIsPayingNow(false);
      setCompletedVoucher(voucher);
      setCreatedOrderNo(generatedOrderNo);
      setIsPaidSuccess(true);

      // 车载 4G 云音箱播报语音仿真
      broadcastPaymentVoiceReceipt(currentMethod.channelId, finalAmount);

      // 调用主应用下单流水
      onCompleteCheckout(
        finalRemarkText,
        couponCode,
        currentMethod.channelId,
        voucher
      );

      toast.success('支付成功 · 存证已入库', `凭据号: ${voucher.voucherNo} · 主厨已接收订单`);
    }, 600);
  };

  // 购物车为空视图
  if (items.length === 0 && !isPaidSuccess) {
    return (
      <div className="w-full h-full bg-[#f9f9f7] flex items-center justify-center p-4">
        <div className="max-w-[430px] w-full bg-white border border-[#e2e2dc] rounded-[5px] p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-[5px] bg-[#f4f4f2] border border-[#e2e2dc] flex items-center justify-center mx-auto text-[#787770]">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#1a1a17]">选购清单暂无餐品</h3>
            <p className="text-xs text-[#787770] leading-relaxed">
              黑曜石 01 号移动餐车已就绪，快去菜单挑选炭火现制招牌美味吧！
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToMenu}
            className="w-full py-2.5 bg-[#1a1a17] hover:bg-black text-white text-xs font-semibold rounded-[5px] transition-all shadow-xs cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回挑选餐品</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#f9f9f7] relative overflow-hidden select-none">
      {/* ========================================================
          TOP STATUS & GLOBAL NAVIGATION
         ======================================================== */}
      <header className="shrink-0 z-30 bg-[#f9f9f7]/95 backdrop-blur-md px-4 pt-3 pb-0 border-b border-[#e2e2dc]">
          {/* 系统状态条 */}
          <div className="flex justify-between items-center text-[10px] text-[#787770] tabular-nums pb-2">
            <span>09:41</span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[#059669] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
                专线连接
              </span>
              <span>5G · 100%</span>
            </div>
          </div>

          {/* 导航栏 */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5" style={{ height: '27.7778px' }}>
              <button
                type="button"
                id="globalBackBtn"
                onClick={() => {
                  if (activeStage === 2) {
                    setActiveStage(1);
                  } else {
                    onBackToMenu();
                  }
                }}
                className="w-8 h-8 rounded-[5px] bg-white border border-[#e2e2dc] flex items-center justify-center text-[#1a1a17] hover:bg-[#f4f4f2] active:scale-95 transition-all shadow-2xs cursor-pointer"
                title="返回"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-base font-black tracking-tight text-[#1a1a17]">
                  {activeStage === 1 ? '订单结算' : '安全收兑'}
                </h1>
                <p className="text-[10.5px] text-[#787770]">
                  {activeStage === 1
                    ? '黑曜石流动餐车 · 极速专线'
                    : `${currentMethod.name} · 官方安全收单`}
                </p>
              </div>
            </div>

            {/* 加密保障徽章 */}
            <div className="flex items-center gap-1 bg-[#eafaf1] text-[#059669] border border-[#bbf0d4] px-2 py-0.5 rounded-[5px] text-[10px] font-medium shadow-2xs">
              <ShieldCheck className="w-3 h-3 text-[#059669]" />
              <span>加密保障</span>
            </div>
          </div>

          {/* ========================================================
              【1号区域步骤导航重构】：左对齐双步骤 Tab
             ======================================================== */}
          <nav className="flex justify-start gap-8 mt-1 border-t border-[#f0f0eb] pt-2 text-xs font-medium">
            <button
              type="button"
              id="stepTab1"
              onClick={() => setActiveStage(1)}
              className={`pb-2 border-b-2 transition-all cursor-pointer ${
                activeStage === 1
                  ? 'border-[#1a1a17] font-bold text-[#1a1a17]'
                  : 'border-transparent text-[#787770] hover:text-[#1a1a17]'
              }`}
            >
              1. 确认明细
            </button>
            <button
              type="button"
              id="stepTab2"
              onClick={() => setActiveStage(2)}
              className={`pb-2 border-b-2 transition-all cursor-pointer ${
                activeStage === 2
                  ? 'border-[#1a1a17] font-bold text-[#1a1a17]'
                  : 'border-transparent text-[#787770] hover:text-[#1a1a17]'
              }`}
            >
              2. 安全收兑
            </button>
          </nav>
        </header>

        {/* ========================================================
            SCROLLABLE CONTENT AREA
           ======================================================== */}
        <main className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-6 overscroll-contain">
          {/* ====================================================
              STAGE 1: 确认明细
             ==================================================== */}
          {activeStage === 1 && (
            <div id="stage1-container" className="space-y-3">
              {/* ====================================================
                  【2号区域模式切换重构】：靠左对齐 Tab 模式选择
                 ==================================================== */}
              <div className="flex justify-start gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleFulfillmentSelect('delivery')}
                  className={`px-3.5 py-1.5 rounded-[5px] transition-all cursor-pointer ${
                    diningMode === 'delivery'
                      ? 'bg-[#1a1a17] text-white shadow-xs'
                      : 'bg-white text-[#787770] border border-[#e2e2dc] hover:text-[#1a1a17]'
                  }`}
                >
                  外卖配送
                </button>
                <button
                  type="button"
                  onClick={() => handleFulfillmentSelect('pickup')}
                  className={`px-3.5 py-1.5 rounded-[5px] transition-all cursor-pointer ${
                    diningMode === 'pickup'
                      ? 'bg-[#1a1a17] text-white shadow-xs'
                      : 'bg-white text-[#787770] border border-[#e2e2dc] hover:text-[#1a1a17]'
                  }`}
                >
                  到车自提
                </button>
                <button
                  type="button"
                  onClick={() => handleFulfillmentSelect('dine_in')}
                  className={`px-3.5 py-1.5 rounded-[5px] transition-all cursor-pointer ${
                    diningMode === 'dine_in'
                      ? 'bg-[#1a1a17] text-white shadow-xs'
                      : 'bg-white text-[#787770] border border-[#e2e2dc] hover:text-[#1a1a17]'
                  }`}
                >
                  堂食餐位
                </button>
              </div>

              {/* 履约方式卡片 */}
              <div className="bg-white rounded-[5px] p-3 border border-[#e2e2dc] shadow-xs space-y-2">
                {diningMode === 'delivery' ? (
                  <>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-[#1a1a17] text-white text-[9.5px] px-1.5 py-0.5 rounded-[5px] font-medium">
                            公司
                          </span>
                          <span className="font-bold text-sm text-[#1a1a17]">
                            {deliveryAddress || '静安大悦城 · 商务座 16F 前台'}
                          </span>
                        </div>
                        <p className="text-xs text-[#787770]">
                          李先生 (先锋食客) <span className="tabular-nums ml-1">138****9201</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenAddressModal) {
                            onOpenAddressModal();
                          } else {
                            setIsAddressModalOpen(true);
                          }
                        }}
                        className="text-xs text-[#1a1a17] font-semibold underline hover:opacity-75 cursor-pointer shrink-0"
                      >
                        修改
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#059669] bg-[#eafaf1] px-2 py-1 rounded-[5px] font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>极速出餐专线：预计 12 分钟内 骑手送达</span>
                    </div>
                  </>
                ) : diningMode === 'pickup' ? (
                  <>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-[#1a1a17] text-white text-[9.5px] px-1.5 py-0.5 rounded-[5px] font-medium">
                            自提
                          </span>
                          <span className="font-bold text-sm text-[#1a1a17]">
                            黑曜石流动餐车 01 号（大悦城北座中庭）
                          </span>
                        </div>
                        <p className="text-xs text-[#787770]">
                          餐车当前泊位：大悦城北广场下沉庭院 · 距您 120 米
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#059669] bg-[#eafaf1] px-2 py-1 rounded-[5px] font-medium">
                      <Zap className="w-3.5 h-3.5" />
                      <span>到车出示提货码即取 · 炭火恒温柜免排队</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-[#1a1a17] text-white text-[9.5px] px-1.5 py-0.5 rounded-[5px] font-medium">
                            堂食
                          </span>
                          <span className="font-bold text-sm text-[#1a1a17]">
                            {tableSession.activeSession
                              ? `${tableSession.activeSession.tableCode} 号桌 · ${tableSession.activeSession.participants.filter((p) => !p.removedAt).length} 人同桌`
                              : boundTable
                              ? `${boundTable.zoneLabel || '餐车外摆区'} · ${boundTable.code} 号桌`
                              : '尚未绑定堂食餐位'}
                          </span>
                        </div>
                        <p className="text-xs text-[#787770]">
                          {tableSession.activeSession
                            ? `会话 ${tableSession.activeSession.sessionId.slice(-6)} · 你的身份 ${tableSession.myParticipant?.maskedId ?? '—'}${
                                tableSession.myParticipant?.role === 'owner' ? '（桌主）' : ''
                              }`
                            : boundTable
                            ? `${boundTable.guests} 位食客 · 专职服务员 ${boundTable.serverName || '阿豪'}`
                            : '请点击右侧扫码或输入餐桌台号'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsTableBindModalOpen(true)}
                        className="text-xs text-[#1a1a17] font-semibold underline hover:opacity-75 cursor-pointer shrink-0"
                      >
                        {tableSession.activeSession || boundTable ? '更换餐位' : '绑定餐台'}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#059669] bg-[#eafaf1] px-2 py-1 rounded-[5px] font-medium">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>主厨现烹现传 · 约 8-10 分钟直接送至座位</span>
                    </div>
                  </>
                )}
              </div>

              {/* ====================================================
                  【3号区域整合为单个一体化卡片】：
                  餐品明细与费用 + 优惠备注与偏好 + 默认支付方式入口
                 ==================================================== */}
              <div className="bg-white rounded-[5px] border border-[#e2e2dc] shadow-xs overflow-hidden">
                {/* ---------------- 第一子区块：餐品明细与费用 ---------------- */}
                <div className="p-3">
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-[#f0f0eb] mb-2.5">
                    <span className="font-bold text-[#1a1a17] flex items-center gap-1.5">
                      {(() => {
                        const trk = getActiveTruckConfig();
                        const logo = trk?.logo || trk?.image;
                        return logo ? (
                          <span className="w-4 h-4 rounded-xs overflow-hidden border border-emerald-500/50 inline-block shrink-0">
                            <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                          </span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                        );
                      })()}
                      {getActiveTruckConfig()?.name || '黑曜石餐车'} · 主厨现制订单
                    </span>
                    <span className="tabular-nums text-[#787770] text-[11px]">ORD-89214</span>
                  </div>

                  {/* 餐品列表 */}
                  <div className="space-y-3">
                    {items.map((item) => {
                      const imageSrc = item.dish?.imageUrl || matchDishImageUrl(item.dish || { name: '' });
                      const itemOptions = Object.values(item.selectedOptions || {}).filter(Boolean);
                      const unitPrice = (item.calculatedPrice / item.quantity).toFixed(2);

                      return (
                        <div key={item.cartItemId} className="flex gap-2.5 items-start">
                          <img
                            src={imageSrc}
                            alt={item.dish?.name}
                            className="w-12 h-12 rounded-[5px] object-cover bg-[#f4f4f2] shrink-0 border border-[#e2e2dc]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-xs text-[#1a1a17] truncate">
                                {item.dish?.name}
                              </h4>
                              <span className="tabular-nums font-bold text-xs text-[#1a1a17] ml-2 shrink-0">
                                ¥{item.calculatedPrice.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-[#787770] truncate mt-0.5">
                              {itemOptions.length > 0
                                ? itemOptions.join(' · ')
                                : '主厨秘制配方 · 现点现做'}
                            </p>
                            <div className="flex justify-between items-center mt-1.5">
                              <span className="bg-[#f4f4f2] text-[#1a1a17] text-[9.5px] px-1 py-0.5 rounded-[5px] font-medium border border-[#e2e2dc]">
                                主厨热卖
                              </span>
                              {/* 数量调整步进器 */}
                              <div className="flex items-center gap-1.5 bg-[#f9f9f7] border border-[#e2e2dc] rounded-[5px] px-1 py-0.5 text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.quantity <= 1) {
                                      onRemoveCartItem(item.cartItemId);
                                      toast.info('已移除餐品', item.dish.name);
                                    } else {
                                      onUpdateCartQuantity(item.cartItemId, item.quantity - 1);
                                    }
                                  }}
                                  className="w-4 h-4 flex items-center justify-center text-[#787770] hover:text-[#1a1a17] active:scale-90"
                                >
                                  {item.quantity <= 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                </button>
                                <span className="tabular-nums font-bold text-xs px-1 text-[#1a1a17]">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateCartQuantity(item.cartItemId, item.quantity + 1)}
                                  className="w-4 h-4 flex items-center justify-center text-[#787770] hover:text-[#1a1a17] active:scale-90"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 费用明细行 */}
                  <div className="pt-3 mt-2 border-t border-[#f0f0eb] space-y-1.5 text-xs text-[#787770]">
                    <div className="flex justify-between items-center">
                      <span>环保降解餐盒与保温袋</span>
                      <span className="font-amount text-[#1a1a17]">¥{packagingFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <span>专线配送费</span>
                        {subtotal >= 80 && (
                          <span className="text-[10px] text-[#059669] bg-[#eafaf1] px-1 rounded-[5px]">
                            满80免配送
                          </span>
                        )}
                      </div>
                      <span className="font-amount text-[#1a1a17]">
                        {activeDeliveryFee === 0 ? (
                          <>
                            <span className="line-through text-[#787770] mr-1 text-[11px] font-amount">¥5.00</span>
                            <span className="text-[#059669] font-bold font-amount">¥0.00</span>
                          </>
                        ) : (
                          `¥${activeDeliveryFee.toFixed(2)}`
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ---------------- 第二子区块：折扣券与偏好 ---------------- */}
                <div className="p-3 bg-[#f9f9f7]/50 border-t border-[#f0f0eb] space-y-2 text-xs">
                  {/* 餐车专属折扣券 */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 text-[#1a1a17] font-medium">
                      <Tag className="w-3.5 h-3.5 text-[#059669]" />
                      <span>餐车专属折扣券</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCouponModalOpen(true)}
                      className="font-medium text-[#059669] flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      {effectiveCouponDiscount > 0 ? (
                        <>已立减 -¥{effectiveCouponDiscount.toFixed(2)}</>
                      ) : (
                        <span className="text-[#787770]">暂无选用 · 点此选择</span>
                      )}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 企业餐补 / 满减抵扣 */}
                  <div className="flex justify-between items-center">
                    <span className="text-[#787770] flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5 text-[#787770]" />
                      <span>渠道直减 & 阶梯满减</span>
                    </span>
                    <span className="tabular-nums text-[#059669] font-semibold">
                      -¥{(channelDiscount + vipDiscount).toFixed(2)}
                    </span>
                  </div>

                  {/* 备注与偏好设置 */}
                  <div className="pt-2 border-t border-[#f0f0eb]">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[#787770] font-medium">备注与忌口偏好</span>
                      <button
                        type="button"
                        onClick={() => setIsRemarkOpen((v) => !v)}
                        className="text-[11px] text-[#1a1a17] underline hover:opacity-80 cursor-pointer"
                      >
                        {isRemarkOpen ? '收起自定义' : '展开自定义备注'}
                      </button>
                    </div>

                    {/* 快捷标签 */}
                    <div className="flex flex-wrap gap-1.5">
                      {['免葱蒜香菜', '放置前台置物架', '多放炭火烤酱', '需要一次性餐具', '免辣微甜'].map((tag) => {
                        const isSelected = quickTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleToggleTag(tag)}
                            className={`text-[10.5px] px-2 py-0.5 rounded-[5px] border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#1a1a17] text-white border-[#1a1a17]'
                                : 'bg-white text-[#787770] border-[#e2e2dc] hover:text-[#1a1a17]'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    {/* 自定义备注展开输入框 */}
                    {isRemarkOpen && (
                      <div className="mt-2">
                        <textarea
                          rows={2}
                          value={remarkInput}
                          onChange={(e) => setRemarkInput(e.target.value)}
                          placeholder="填写其他特殊打包或配送偏好要求（如放挂钩、敲门放门把手等）"
                          className="w-full text-xs p-2 bg-white border border-[#e2e2dc] rounded-[5px] text-[#1a1a17] placeholder:text-[#787770] focus:outline-none focus:border-[#1a1a17] resize-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* ---------------- 第三子区块：默认支付方式入口与下拉选择浮层 ---------------- */}
                <div className="p-3 border-t border-[#f0f0eb] relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-[#1a1a17]">支付渠道选择</span>
                    <span className="text-[10.5px] text-[#787770]">已启用极速双重验密收兑</span>
                  </div>

                  {/* 默认/选中支付方式入口 */}
                  <div
                    onClick={() => setIsMethodDropdownOpen((v) => !v)}
                    className="flex items-center justify-between p-2.5 bg-[#f9f9f7] border border-[#e2e2dc] rounded-[5px] cursor-pointer hover:border-[#1a1a17] transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-[5px] flex items-center justify-center shrink-0"
                        style={{ backgroundColor: currentMethod.iconBg, color: currentMethod.iconColor }}
                      >
                        {selectedMethodKey === 'wechat' ? (
                          <Smartphone className="w-4 h-4" />
                        ) : selectedMethodKey === 'alipay' ? (
                          <Zap className="w-4 h-4" />
                        ) : selectedMethodKey === 'unionpay' ? (
                          <CreditCard className="w-4 h-4" />
                        ) : selectedMethodKey === 'ecny' ? (
                          <QrCode className="w-4 h-4" />
                        ) : (
                          <Building className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#1a1a17]">{currentMethod.name}</span>
                          <span className="text-[9.5px] bg-[#eafaf1] text-[#059669] px-1.5 py-0.2 rounded-[5px] font-medium">
                            {currentMethod.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#787770] truncate max-w-[210px]">
                          {currentMethod.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#787770]">
                      <span className="text-[11px] font-medium">切换渠道</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isMethodDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* 下拉浮层支付方式菜单 */}
                  <AnimatePresence>
                    {isMethodDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="mt-2 bg-white border border-[#e2e2dc] rounded-[5px] p-1.5 shadow-lg space-y-1 z-20"
                      >
                        {PAYMENT_OPTIONS.map((opt) => {
                          const isSelected = selectedMethodKey === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                setSelectedMethodKey(opt.key);
                                setIsMethodDropdownOpen(false);
                                toast.success(`已切换支付方式为：${opt.name}`);
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-[5px] transition-all text-left cursor-pointer ${
                                isSelected ? 'bg-[#f4f4f2] border border-[#e2e2dc]' : 'hover:bg-[#f9f9f7]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-7 h-7 rounded-[5px] flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: opt.iconBg, color: opt.iconColor }}
                                >
                                  {opt.key === 'wechat' ? (
                                    <Smartphone className="w-3.5 h-3.5" />
                                  ) : opt.key === 'alipay' ? (
                                    <Zap className="w-3.5 h-3.5" />
                                  ) : opt.key === 'unionpay' ? (
                                    <CreditCard className="w-3.5 h-3.5" />
                                  ) : opt.key === 'ecny' ? (
                                    <QrCode className="w-3.5 h-3.5" />
                                  ) : (
                                    <Building className="w-3.5 h-3.5" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-[#1a1a17]">{opt.name}</span>
                                    <span className="text-[9px] bg-[#eafaf1] text-[#059669] px-1 py-0.2 rounded-[5px]">
                                      {opt.badge}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-[#787770]">{opt.desc}</p>
                                </div>
                              </div>
                              <div className="shrink-0 pl-2">
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    isSelected
                                      ? 'border-[#1a1a17] bg-[#1a1a17] text-white'
                                      : 'border-[#e2e2dc] bg-white'
                                  }`}
                                >
                                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              STAGE 2: 安全收兑 (官方安全收兑与动态扫码)
             ==================================================== */}
          {activeStage === 2 && (
            <div id="stage2-container" className="space-y-3">
              {/* 官方收兑顶栏卡片 */}
              <div
                className="rounded-[5px] p-4 text-white shadow-xs relative overflow-hidden"
                style={{
                  backgroundColor:
                    selectedMethodKey === 'wechat'
                      ? '#07c160'
                      : selectedMethodKey === 'alipay'
                      ? '#1677ff'
                      : selectedMethodKey === 'ecny'
                      ? '#e11d48'
                      : selectedMethodKey === 'unionpay'
                      ? '#d92d20'
                      : '#1a1a17'
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-[5px] bg-white/20 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-xs tracking-tight">
                      {currentMethod.name} · 官方安全收银
                    </span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full tabular-nums backdrop-blur-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    实时回查中
                  </span>
                </div>

                <div className="mt-4">
                  <span className="text-[11px] opacity-90 block">
                    向商户「黑曜石流动餐车（大悦城站）」付款
                  </span>
                  <div className="text-3xl font-black tabular-nums tracking-tight mt-0.5 flex items-baseline gap-1">
                    <span className="text-xl">¥</span>
                    <span>{finalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 动态收款二维码展示容器 */}
              <div className="bg-white rounded-[5px] p-5 border border-[#e2e2dc] shadow-xs text-center space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#1a1a17]">
                    出示付款码或直接手机扫码
                  </h3>
                  <p className="text-[11px] text-[#787770]">
                    支持微信“扫一扫”、云闪付或长按识别直接收兑
                  </p>
                </div>

                {/* 矢量二维码展示画板 */}
                <div className="inline-block p-3 bg-white border border-[#e2e2dc] rounded-[5px] shadow-xs relative">
                  <svg
                    className="w-44 h-44 mx-auto text-[#1a1a17]"
                    viewBox="0 0 100 100"
                    fill="currentColor"
                  >
                    {/* 左上角定位角 */}
                    <rect x="5" y="5" width="26" height="26" fill="#1a1a17" rx="3" />
                    <rect x="9" y="9" width="18" height="18" fill="white" rx="2" />
                    <rect x="13" y="13" width="10" height="10" fill="#1a1a17" rx="1.5" />

                    {/* 右上角定位角 */}
                    <rect x="69" y="5" width="26" height="26" fill="#1a1a17" rx="3" />
                    <rect x="73" y="9" width="18" height="18" fill="white" rx="2" />
                    <rect x="77" y="13" width="10" height="10" fill="#1a1a17" rx="1.5" />

                    {/* 左下角定位角 */}
                    <rect x="5" y="69" width="26" height="26" fill="#1a1a17" rx="3" />
                    <rect x="9" y="73" width="18" height="18" fill="white" rx="2" />
                    <rect x="13" y="77" width="10" height="10" fill="#1a1a17" rx="1.5" />

                    {/* 拟真数据栅格 */}
                    <rect x="36" y="8" width="5" height="5" />
                    <rect x="46" y="8" width="8" height="5" />
                    <rect x="58" y="8" width="6" height="5" />
                    <rect x="36" y="18" width="9" height="5" />
                    <rect x="49" y="18" width="5" height="5" />
                    <rect x="58" y="18" width="6" height="5" />

                    <rect x="8" y="36" width="5" height="5" />
                    <rect x="18" y="36" width="9" height="5" />
                    <rect x="36" y="36" width="5" height="5" />
                    <rect x="46" y="36" width="9" height="5" />
                    <rect x="60" y="36" width="5" height="5" />
                    <rect x="70" y="36" width="8" height="5" />
                    <rect x="83" y="36" width="9" height="5" />

                    <rect x="8" y="46" width="8" height="5" />
                    <rect x="21" y="46" width="5" height="5" />
                    <rect x="36" y="46" width="6" height="6" />
                    <rect x="58" y="46" width="7" height="5" />
                    <rect x="70" y="46" width="5" height="5" />
                    <rect x="80" y="46" width="12" height="5" />

                    <rect x="8" y="56" width="5" height="5" />
                    <rect x="18" y="56" width="5" height="5" />
                    <rect x="36" y="56" width="8" height="5" />
                    <rect x="49" y="56" width="7" height="5" />
                    <rect x="60" y="56" width="5" height="5" />
                    <rect x="70" y="56" width="12" height="5" />
                    <rect x="86" y="56" width="6" height="5" />

                    <rect x="36" y="69" width="5" height="5" />
                    <rect x="46" y="69" width="9" height="5" />
                    <rect x="60" y="69" width="5" height="5" />
                    <rect x="70" y="69" width="6" height="5" />
                    <rect x="81" y="69" width="11" height="5" />

                    <rect x="36" y="79" width="7" height="5" />
                    <rect x="48" y="79" width="7" height="5" />
                    <rect x="60" y="79" width="5" height="5" />
                    <rect x="70" y="79" width="9" height="5" />
                    <rect x="84" y="79" width="8" height="5" />

                    {/* 中心品牌 LOGO 贴片 */}
                    <rect x="41" y="41" width="18" height="18" fill="white" rx="3" />
                    <rect
                      x="43"
                      y="43"
                      width="14"
                      height="14"
                      fill={currentMethod.iconBg}
                      rx="2"
                    />
                  </svg>

                  {/* 倒计时刷新胶囊 */}
                  <div className="absolute bottom-1 right-1 bg-[#f4f4f2] text-[#787770] tabular-nums text-[9px] px-1.5 py-0.5 rounded-[5px] border border-[#e2e2dc] flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span>{qrCountdown}s 自动更新</span>
                  </div>
                </div>

                {/* 订单防伪校验码 */}
                <div className="space-y-1">
                  <div className="tabular-nums text-[10.5px] text-[#787770]">
                    TX-20250519-89214732948-WXPAY
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#059669] bg-[#eafaf1] py-1.5 px-3 rounded-[5px] font-medium border border-[#bbf0d4]">
                    <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
                    <span>4G 云音箱与车载打印机已连线待出单</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ========================================================
            FIXED BOTTOM ACTION BAR
           ======================================================== */}
        <footer className="shrink-0 z-30 bg-[#f9f9f7]/95 backdrop-blur-md border-t border-[#e2e2dc] p-3">
          {activeStage === 1 ? (
            <div id="footer-stage1" className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-[#787770] flex items-center gap-1">
                  <span>应付总额</span>
                  {totalDiscount > 0 && (
                    <span className="text-[10px] text-[#059669] bg-[#eafaf1] px-1 rounded-[5px] font-medium font-amount">
                      省¥{totalDiscount.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="text-xl font-black font-amount text-[#1a1a17]">
                  <span className="text-sm">¥</span>
                  {finalAmount.toFixed(2)}
                </div>
              </div>

              <button
                type="button"
                id="btn-goto-stage2"
                onClick={() => setActiveStage(2)}
                className="flex-1 bg-[#1a1a17] text-white py-2.5 rounded-[5px] font-bold text-xs hover:bg-black active:scale-[0.98] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>去支付</span>
                <span className="font-amount">¥{finalAmount.toFixed(2)}</span>
              </button>
            </div>
          ) : (
            <div id="footer-stage2" className="flex items-center gap-2">
              <button
                type="button"
                id="btn-back-to-stage1"
                onClick={() => setActiveStage(1)}
                className="px-3.5 py-2.5 bg-white border border-[#e2e2dc] text-[#1a1a17] rounded-[5px] text-xs font-semibold hover:bg-[#f4f4f2] active:scale-95 transition-all cursor-pointer"
              >
                返回明细
              </button>
              <button
                type="button"
                id="btn-simulate-pay"
                disabled={isPayingNow}
                onClick={handleExecutePayment}
                className="flex-1 text-white py-2.5 rounded-[5px] font-bold text-xs active:scale-[0.98] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor:
                    selectedMethodKey === 'wechat'
                      ? '#07c160'
                      : selectedMethodKey === 'alipay'
                      ? '#1677ff'
                      : '#1a1a17'
                }}
              >
                {isPayingNow ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>正在双重对账验密...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>立即支付 ¥{finalAmount.toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </footer>

        {/* ========================================================
            PAYMENT SUCCESS MODAL DIALOG
           ======================================================== */}
        <AnimatePresence>
          {isPaidSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="bg-white border border-[#e2e2dc] rounded-[5px] p-6 max-w-xs w-full text-center space-y-4 shadow-xl"
              >
                <div className="w-12 h-12 bg-[#eafaf1] text-[#059669] rounded-[5px] border border-[#bbf0d4] flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-black text-base text-[#1a1a17]">
                    支付成功 · 正在配餐
                  </h3>
                  <p className="text-xs text-[#787770]">
                    实付 ¥{finalAmount.toFixed(2)} · 厨房已接收订单，取餐号{' '}
                    <span className="tabular-nums font-bold text-[#1a1a17]">
                      #{createdOrderNo ? createdOrderNo.slice(-4) : 'A082'}
                    </span>
                  </p>
                </div>

                {/* 存证防伪标签 */}
                <div className="p-2 bg-[#f9f9f7] rounded-[5px] border border-[#e2e2dc] text-left text-[11px] space-y-1">
                  <div className="flex justify-between text-[#787770]">
                    <span>订单流水</span>
                    <span className="tabular-nums text-[#1a1a17]">{createdOrderNo || 'ORD-89214'}</span>
                  </div>
                  <div className="flex justify-between text-[#787770]">
                    <span>支付渠道</span>
                    <span className="text-[#059669] font-medium">{currentMethod.name}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaidSuccess(false);
                      onGoToTracking(createdOrderNo);
                    }}
                    className="w-full py-2.5 bg-[#1a1a17] hover:bg-black text-white text-xs font-bold rounded-[5px] shadow-xs cursor-pointer"
                  >
                    查看订单出餐进度
                  </button>
                  {completedVoucher && (
                    <button
                      type="button"
                      onClick={() => setIsVoucherModalOpen(true)}
                      className="w-full py-2 bg-white hover:bg-[#f4f4f2] text-[#1a1a17] border border-[#e2e2dc] text-xs font-semibold rounded-[5px] cursor-pointer"
                    >
                      查看防伪电子凭据
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 优惠券选择弹窗 */}
        <AnimatePresence>
          {isCouponModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border border-[#e2e2dc] rounded-[5px] p-5 max-w-sm w-full space-y-4 shadow-xl text-[#1a1a17]"
              >
                <div className="flex justify-between items-center border-b border-[#f0f0eb] pb-2">
                  <h3 className="font-bold text-sm">选择餐车优惠券</h3>
                  <button
                    type="button"
                    onClick={() => setIsCouponModalOpen(false)}
                    className="text-[#787770] hover:text-[#1a1a17]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 兑换码手动输入 */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCouponInput}
                    onChange={(e) => setCustomCouponInput(e.target.value.toUpperCase())}
                    placeholder="输入券码如 OBSIDIAN10"
                    className="flex-1 text-xs px-2.5 py-1.5 border border-[#e2e2dc] rounded-[5px] uppercase tabular-nums focus:outline-none focus:border-[#1a1a17]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!customCouponInput.trim()) {
                        toast.warning('请输入券码');
                        return;
                      }
                      setCouponCode(customCouponInput.trim());
                      toast.success(`已应用优惠券 [${customCouponInput.trim()}]`);
                      setCustomCouponInput('');
                      setIsCouponModalOpen(false);
                    }}
                    className="px-3 py-1.5 bg-[#1a1a17] text-white text-xs font-semibold rounded-[5px] hover:bg-black"
                  >
                    兑换
                  </button>
                </div>

                {/* 券列表 */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {getAvailableUserCoupons().map((item) => {
                    const isSelected = couponCode === item.coupon.code;
                    return (
                      <div
                        key={item.userCouponId}
                        onClick={() => {
                          setCouponCode(item.coupon.code);
                          toast.success(`已选用 ${item.coupon.title}`);
                          setIsCouponModalOpen(false);
                        }}
                        className={`p-2.5 rounded-[5px] border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#059669] bg-[#eafaf1]'
                            : 'border-[#e2e2dc] bg-white hover:border-[#1a1a17]'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-xs">{item.coupon.title}</h4>
                            <p className="text-[10px] text-[#787770]">满 ¥{item.coupon.minSpend} 可用</p>
                          </div>
                          <div className="text-right">
                            <span className="tabular-nums font-bold text-sm text-[#059669]">
                              ¥{item.coupon.discountValue}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setCouponCode('');
                      toast.info('已取消选用优惠券');
                      setIsCouponModalOpen(false);
                    }}
                    className="w-full py-1.5 text-center text-xs text-[#787770] hover:text-[#1a1a17] border border-dashed border-[#e2e2dc] rounded-[5px]"
                  >
                    不使用优惠券
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 地址选择弹窗 */}
        <AddressSelectorModal
          isOpen={isAddressModalOpen}
          onClose={() => setIsAddressModalOpen(false)}
          currentAddress={deliveryAddress}
          onSelectAddress={(addr) => {
            onChangeAddress(addr);
            setIsAddressModalOpen(false);
            toast.info('配送地址已切换', addr);
          }}
        />

        {/* 堂食绑桌弹窗 */}
        <TableBindModal
          isOpen={isTableBindModalOpen}
          onClose={() => setIsTableBindModalOpen(false)}
          currentBoundTable={boundTable}
          onBindTable={(tbl) => {
            setBoundTable(tbl);
            setIsTableBindModalOpen(false);
            toast.success('堂食桌台已绑定', `${tbl.zoneLabel} · ${tbl.code}号桌`);
          }}
        />

        {/* 电子回执与存证凭据弹窗 */}
        <ElectronicPaymentVoucherModal
          isOpen={isVoucherModalOpen}
          onClose={() => setIsVoucherModalOpen(false)}
          voucher={completedVoucher}
          onGoToOrderTracking={(orderNo) => {
            setIsVoucherModalOpen(false);
            onGoToTracking(orderNo);
          }}
        />
      </div>
  );
};
