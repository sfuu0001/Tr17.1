import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  X,
  Ban,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Navigation,
  Clock,
  Compass,
  ExternalLink,
  Layers,
  Crosshair,
  Maximize2,
  Share2,
  Phone,
  MessageSquare,
  AlertCircle,
  Receipt,
  FileText,
  Copy,
  UtensilsCrossed,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TruckInfo, Order } from '../types';
import { OrderTrackingData } from '../types/tracking';
import {
  GranularOrderStatus,
  getOrderStatusConfig,
  ORDER_STATUS_CONFIG_MAP
} from '../utils/orderFlowEngine';
import { useDevSimulation } from '../context/DevSimulationContext';
import { PaymentVoucher } from '../types/payment';
import { queryPaymentVoucherByOrderNo, createPaymentVoucher } from '../utils/paymentSecurityEngine';
import { ElectronicPaymentVoucherModal } from './payment/ElectronicPaymentVoucherModal';
import { TrackingChatModal } from './tracking/TrackingChatModal';
import { DineInTrackingSection, PickupTrackingSection, TrackingRadarMap } from './tracking';
import { useToast } from './ui/ToastContext';

export interface OrderTrackingViewProps {
  orderId?: string;
  order?: Order;
  truck?: TruckInfo;
  deliveryAddress?: string;
  onBackToMenu?: () => void;
  customData?: Partial<OrderTrackingData>;
  onContactCourier?: () => void;
  onUrgeOrder?: () => void;
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onApplyRefund?: (orderId: string, reason: string, feedback: string, passedStep: string) => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  orderId = '#UR-98215',
  order,
  truck,
  deliveryAddress = '西藏北路 166 号大悦城',
  onBackToMenu,
  onContactCourier,
  onUrgeOrder,
  onAdvanceOrderStatus,
  onApplyRefund
}) => {
  const { isSimulationAllowed, openDevAuthModal } = useDevSimulation();
  const toast = useToast();
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [cancelReason, setCancelReason] = useState('制作或等待配送时间过长');
  const [cancelNote, setCancelNote] = useState('');
  const [mapLayer, setMapLayer] = useState<'standard' | 'satellite'>('standard');
  const [tickerIndex, setTickerIndex] = useState(0);
  const [isVoucherDropdownOpen, setIsVoucherDropdownOpen] = useState(false);
  const [activeCollapseTab, setActiveCollapseTab] = useState<'dishes' | 'fees' | 'escrow'>('dishes');
  const voucherDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close voucher dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (voucherDropdownRef.current && !voucherDropdownRef.current.contains(e.target as Node)) {
        setIsVoucherDropdownOpen(false);
      }
    };
    if (isVoucherDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVoucherDropdownOpen]);

  const showToast = (msg: string) => {
    toast.info(msg);
  };

  const cleanOrderNo = order?.orderNo || order?.id || orderId;
  const statusConfig = getOrderStatusConfig(order?.status);

  // Dynamic courier information
  const courierData = {
    id: 'c-1',
    name: order?.courierName?.split(' ')[0] || '陈志远',
    title: order?.courierName || '陈志远 (专线骑手 R-8821)',
    phone: order?.courierPhone || '138-1829-9201',
    rating: 4.99,
    completedOrders: 1840,
    isInsulatedBoxSanitized: true
  };

  // Payment voucher
  const paymentVoucher: PaymentVoucher = useMemo(() => {
    if (order?.paymentVoucher) return order.paymentVoucher;
    const existing = queryPaymentVoucherByOrderNo(cleanOrderNo);
    if (existing) return existing;
    const discount = (order as any)?.couponDiscount ?? (order as any)?.discountAmount ?? 0;
    return createPaymentVoucher({
      orderNo: cleanOrderNo,
      channelId: (order?.paymentMethod as any) || 'wechat',
      paidAmount: order?.totalAmount ?? 307.0,
      originalAmount: (order?.totalAmount ?? 307.0) + discount,
      discountAmount: discount,
      diningMode: order?.channelType || 'delivery'
    });
  }, [order, cleanOrderNo]);

  // Dynamic dishes array from real order or fallback default
  const defaultDishes = [
    { name: '炭烤招牌黑松露和牛堡', count: 2, price: 196.0 },
    { name: '法式松露粗薯条 (大份)', count: 1, price: 43.0 },
    { name: '冷萃耶加雪菲精品冰咖啡', count: 1, price: 38.0 }
  ];

  const dishes = order?.items && order.items.length > 0
    ? order.items.map((it) => ({
        name: it.name,
        count: it.quantity,
        price: (it.price || 45.0) * it.quantity
      }))
    : defaultDishes;

  const totalItemsCount = dishes.reduce((sum, d) => sum + d.count, 0);
  const packageFee = (order as any)?.deliveryFee !== undefined ? ((order as any).deliveryFee + 4.0) : 30.0;
  const totalAmount = order?.totalAmount ?? 307.0;

  // Auto cycling ticker every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev === 0 ? 1 : 0));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleShareTracking = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
    }
    showToast('实时配送轨迹链接已复制，可直接分享给好友');
  };

  const handleOpenNav = () => {
    const dest = encodeURIComponent(order?.deliveryAddress || deliveryAddress);
    window.open(`https://uri.amap.com/navigation?to=121.4737,31.2304,${dest}&mode=ride&callnative=1`, '_blank');
    showToast('正在打开高德地图官方骑行导航...');
  };

  const handleSimulateSpeed = () => {
    setIsSimulating(true);
    showToast('已开启 1.5x 绿波专线加速仿真');
    setTimeout(() => setIsSimulating(false), 2200);
  };

  const handleSubmitCancelRequest = () => {
    if (onAdvanceOrderStatus) {
      onAdvanceOrderStatus(cleanOrderNo, 'cancel_requested', {
        status: 'cancel_requested',
        statusText: '客户申请终止订单',
        refundStatus: 'pending',
        refundReason: cancelReason,
        refundFeedback: cancelNote || '顾客在订单流转中发起了终止取消申请',
        refundAppliedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      });
    } else if (onApplyRefund) {
      onApplyRefund(cleanOrderNo, cancelReason, cancelNote, statusConfig.label);
    }
    setIsCancelModalOpen(false);
    showToast('终止订单申请已提交，等待餐车主理人审核');
  };

  // 步骤 3-7 动态热更新节点配置 (第 3 槽位动态演进模型)
  const dynamicHotUpdateSteps = [
    {
      step: 3,
      badge: '03 制作中',
      title: '制作中',
      subTitle: '餐车现烤备餐',
      desc: '智能烤炉定温烘焙锁鲜',
      progressWidth: '40%'
    },
    {
      step: 4,
      badge: '04 赶往中',
      title: '赶往商家',
      subTitle: '高德绿波调度',
      desc: '专线骑手全速奔赴流动餐车',
      progressWidth: '58%'
    },
    {
      step: 5,
      badge: '05 已取餐',
      title: '骑手已取餐',
      subTitle: '保温封箱消杀',
      desc: '红外测温锁定恒温箱',
      progressWidth: '72%'
    },
    {
      step: 6,
      badge: '06 配送中',
      title: '极速飞驰',
      subTitle: '骑手已提货极速送达',
      desc: `专线骑手${courierData.name}极速配送`,
      progressWidth: '85%'
    },
    {
      step: 7,
      badge: '07 确认送达',
      title: '即将送达',
      subTitle: '请准备签收核销',
      desc: '骑手抵达目的地，扫码核销',
      progressWidth: '96%'
    }
  ];

  // 将后台真实订单状态严密映射至 1~7 履约里程碑节点
  const resolveOrderStep = (curOrder?: Order | null): number => {
    if (!curOrder) return 6; // 默认专送飞驰中
    if (curOrder.status === 'completed') return 7;
    if (curOrder.status === 'delivering') return 6;
    if (curOrder.status === 'picked_up') return 5;
    if (
      curOrder.status === 'rider_heading' ||
      curOrder.status === 'waiting_pickup' ||
      curOrder.status === 'reassigning_rider' ||
      curOrder.status === 'rider_rejected'
    ) {
      return 4;
    }
    if (curOrder.status === 'cooking' || curOrder.status === 'ready') return 3;
    if (curOrder.status === 'pending') {
      return curOrder.merchantAccepted ? 2 : 1;
    }
    if (typeof curOrder.stepIndex === 'number' && curOrder.stepIndex >= 1 && curOrder.stepIndex <= 7) {
      return curOrder.stepIndex;
    }
    return 6;
  };

  const realStep = useMemo(() => resolveOrderStep(order), [
    order?.status,
    order?.stepIndex,
    order?.merchantAccepted,
    order?.riderAccepted
  ]);

  const stepToDynIndex = (s: number) => {
    if (s <= 3) return 0;
    if (s === 4) return 1;
    if (s === 5) return 2;
    if (s === 6) return 3;
    return 4;
  };

  // 状态固定强绑定后台订单数据：去除非同步自动循环，仅在后台数据刷新（order.status / stepIndex 等变化）时执行热更新
  const [dynamicStepIndex, setDynamicStepIndex] = useState(() => stepToDynIndex(realStep));
  const prevOrderRef = useRef({
    status: order?.status,
    stepIndex: order?.stepIndex,
    step: realStep
  });

  useEffect(() => {
    const targetIndex = stepToDynIndex(realStep);
    // 当检测到后台订单状态或节点发生变动时，执行平滑热更新动画与提示
    if (
      prevOrderRef.current.status !== order?.status ||
      prevOrderRef.current.stepIndex !== order?.stepIndex ||
      prevOrderRef.current.step !== realStep
    ) {
      prevOrderRef.current = {
        status: order?.status,
        stepIndex: order?.stepIndex,
        step: realStep
      };
      setDynamicStepIndex(targetIndex);
      const stepObj = dynamicHotUpdateSteps[targetIndex];
      if (stepObj) {
        showToast(`后台数据刷新：履约节点已热更新至【${stepObj.badge}】`);
      }
    } else {
      // 保持当前固定状态不变
      if (dynamicStepIndex !== targetIndex) {
        setDynamicStepIndex(targetIndex);
      }
    }
  }, [order?.status, order?.stepIndex, realStep]);

  const activeDyn = dynamicHotUpdateSteps[dynamicStepIndex];

  // 计算连接指示线进度
  const overallProgressWidth = useMemo(() => {
    if (realStep <= 1) return '12%';
    if (realStep === 2) return '33%';
    if (realStep === 3) return '50%';
    if (realStep === 4) return '65%';
    if (realStep === 5) return '78%';
    if (realStep === 6) return '88%';
    return '100%';
  }, [realStep]);

  // Pipeline 7 stages definition (基于确认的标准流程，并与第3槽位及真实状态强联动)
  // 1. 用户下单
  // 2. 等待商家接单
  // 3. 商家已接单（制作中）
  // 4. 骑手正在赶往商家
  // 5. 骑手已取餐
  // 6. 骑手配送中
  // 7. 确认送达
  const pipelineStages = useMemo(() => [
    {
      id: '07',
      stepNum: 7,
      title: realStep === 7 ? '节点 07：确认送达 (当前)' : '节点 07：确认送达',
      time: '预计 12:52:00',
      desc: '骑手送达目的地，顾客凭核销码扫码确认，资金解冻清算完成。',
      hash: '0x9E2B...11A8',
      isActive: realStep === 7,
      passed: realStep >= 7
    },
    {
      id: '06',
      stepNum: 6,
      title: realStep === 6 ? '节点 06：骑手配送中 (当前)' : '节点 06：骑手配送中',
      time: order?.createdTime ? `${order.createdTime.slice(0, 5)}:22` : '12:48:22',
      desc: `专线骑手${courierData.name}已启动实时高德绿波航线，航速 ${isSimulating ? 36 : 24}km/h 配送中。`,
      hash: '0x8F9C...44D1',
      isActive: realStep === 6,
      passed: realStep >= 6
    },
    {
      id: '05',
      stepNum: 5,
      title: realStep === 5 ? '节点 05：骑手已取餐 (当前)' : '节点 05：骑手已取餐',
      time: '12:46:10',
      desc: '骑手已到餐车取餐，红外测温 68.5°C，双联保全封条锁毕，装入温控箱。',
      hash: '0x7B1E...33A2',
      isActive: realStep === 5,
      passed: realStep >= 5
    },
    {
      id: '04',
      stepNum: 4,
      title: realStep === 4 ? '节点 04：骑手正在赶往商家 (当前)' : '节点 04：骑手正在赶往商家',
      time: '12:42:30',
      desc: `系统智能调度最近专线骑手${courierData.name}接单，正全速赶往流动餐车提餐。`,
      hash: '0x5C4A...91F0',
      isActive: realStep === 4,
      passed: realStep >= 4
    },
    {
      id: '03',
      stepNum: 3,
      title: realStep === 3 ? '节点 03：商家已接单制作中 (当前)' : '节点 03：商家已接单（制作中）',
      time: '12:35:18',
      desc: `${order?.truckName || truck?.name || '黑曜石 01 号流动餐车'}智能烤炉定温 220°C 现烤制作中。`,
      hash: '0x3D8B...88C4',
      isActive: realStep === 3,
      passed: realStep >= 3
    },
    {
      id: '02',
      stepNum: 2,
      title: realStep === 2 ? '节点 02：等待商家接单 (当前)' : '节点 02：等待商家接单 (已确认)',
      time: '12:32:04',
      desc: `餐车车载终端打印备餐传票，锁定流水号 #${cleanOrderNo.replace(/^#/, '')}。`,
      hash: '0x1F08...66D2',
      isActive: realStep === 2,
      passed: realStep >= 2
    },
    {
      id: '01',
      stepNum: 1,
      title: realStep === 1 ? '节点 01：用户下单 (当前)' : '节点 01：用户下单 (支付入账)',
      time: '12:30:58',
      desc: '资金存管清算成功，生成全周期状态机监视线程。',
      hash: '0x0E97...55C1',
      isActive: realStep === 1,
      passed: realStep >= 1
    }
  ], [realStep, courierData.name, isSimulating, order?.createdTime, order?.truckName, truck?.name, cleanOrderNo]);

  const isDineIn = order?.channelType === 'dine_in' || order?.channel === 'dine_in' || !!order?.tableCode;
  const isPickup = order?.channelType === 'pickup' || order?.channel === 'pickup' || !!order?.pickupCode;

  const currentOrderTime = order?.createdTime
    ? (order.createdTime.length <= 5 ? `${order.createdTime}:22` : order.createdTime)
    : '12:48:22';

  return (
    <div id="order-tracking-container" className="w-full flex justify-center p-0 relative bg-[#FAFAFA] min-h-full flex-1 text-slate-900 antialiased selection:bg-[#00B96B] selection:text-white pb-20 sm:pb-28">
      {/* Full-Screen Real-Time Order Dashboard */}
      <div
        id="order-tracking-card"
        className="w-full max-w-5xl min-h-full flex-1 bg-[#FAFAFA] flex flex-col relative overflow-hidden pb-8 sm:pb-12 border-0 sm:border-x sm:border-gray-200 shadow-none"
      >
        {/* BEGIN: TopBar */}
        <header className="pt-3 pb-2 px-3.5 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center space-x-2">
            {/* Back Button */}
            <button
              aria-label="返回上一页"
              onClick={onBackToMenu}
              className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>

            {/* Order Meta */}
            <div className="flex items-center space-x-1.5 text-xs min-w-0 flex-1 overflow-hidden">
              <div className="inline-flex items-center bg-gray-100 border border-gray-200/70 rounded-full px-2 py-0.5 space-x-1.5 flex-shrink-0 shadow-sm">
                <span className="font-sans font-bold text-[11px] text-gray-900 tracking-tight">
                  #{cleanOrderNo.replace(/^#/, '')}
                </span>
                <span className="w-0.5 h-2.5 bg-gray-300" />
                <span className="font-sans text-[10px] text-gray-500 font-medium">
                  {currentOrderTime}
                </span>
              </div>
              <div className="inline-flex items-center space-x-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00B96B] animate-pulse-dot inline-block mr-0.5" />
                <span className="truncate">
                  {isDineIn ? '堂食点单' : isPickup ? '到店自提' : '餐车专送'}
                </span>
              </div>
            </div>
          </div>

          {/* Notification Icon */}
          <button
            aria-label="查看通知"
            onClick={() => showToast('已开启订单状态即时声音与震动提醒')}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 active:bg-gray-100 transition-colors cursor-pointer"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        </header>
        {/* END: TopBar */}

        {/* BEGIN: PaymentGuarantee (Enhanced with Dropdown Menu & Collapsible Accordion) */}
        <div className="bg-neutral-50 border-y border-neutral-200/80 transition-all" data-purpose="payment-guarantee-accordion-hub">
          {/* Main Top Header Bar: Accordion Toggle Button + Voucher Dropdown Menu */}
          <div className="px-3.5 py-2 flex items-center justify-between gap-3">
            {/* Left: Collapsible Trigger Button */}
            <button
              id="toggle-order-detail-collapse-btn"
              type="button"
              onClick={() => setIsOrderDetailOpen((prev) => !prev)}
              className="flex items-center gap-2 text-xs text-neutral-800 font-medium cursor-pointer text-left active:opacity-80 transition-opacity flex-1 min-w-0"
              title="点击展开/收起订单餐品、费用与资金保全折叠抽屉"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold text-sm text-neutral-900 font-sans tracking-tight">
                  ¥{totalAmount.toFixed(2)}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded-md shrink-0">
                  <span>双轨保全入账</span>
                </span>
              </div>
              <div className="flex items-center gap-0.5 text-xs text-neutral-500 hover:text-neutral-900 ml-1 shrink-0 font-normal">
                <span>{isOrderDetailOpen ? '收起' : '明细'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isOrderDetailOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {/* Right: Dropdown Menu Trigger & Panel (凭证与服务下拉菜单) */}
            <div ref={voucherDropdownRef} className="relative shrink-0">
              <button
                id="voucher-actions-dropdown-btn"
                type="button"
                onClick={() => setIsVoucherDropdownOpen((prev) => !prev)}
                className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer select-none shrink-0 whitespace-nowrap ${
                  isVoucherDropdownOpen
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                    : 'bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-100/80 active:scale-95 shadow-2xs'
                }`}
                aria-haspopup="true"
                aria-expanded={isVoucherDropdownOpen}
                title="点击展开凭证与发票服务下拉菜单"
              >
                <Receipt className={`w-3.5 h-3.5 ${isVoucherDropdownOpen ? 'text-white' : 'text-neutral-600'}`} />
                <span>凭证与服务</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${
                    isVoucherDropdownOpen ? 'rotate-180 text-white' : 'text-neutral-400'
                  }`}
                />
              </button>

              {/* Dropdown Menu Popover Panel */}
              <AnimatePresence>
                {isVoucherDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute top-full right-0 mt-1.5 z-50 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-2 text-left divide-y divide-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Top Triangle Indicator */}
                    <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white border-t border-l border-gray-100 rotate-45 pointer-events-none" />

                    {/* Menu Item 1: Electronic Payment Voucher */}
                    <div className="py-1">
                      <button
                        id="menu-open-voucher-btn"
                        type="button"
                        onClick={() => {
                          setIsVoucherModalOpen(true);
                          setIsVoucherDropdownOpen(false);
                        }}
                        className="w-full px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer flex items-center gap-2 hover:bg-emerald-50/70 text-gray-800 group"
                      >
                        <div className="w-6 h-6 rounded-md bg-emerald-100/70 text-[#00B96B] flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-gray-900 flex items-center justify-between">
                            <span>电子支付凭证</span>
                            <span className="text-[9px] font-sans font-bold text-[#00B96B] bg-emerald-50 px-1.5 py-0.2 rounded">
                              已签章
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate">双联电子票据 · 资金托管入账</p>
                        </div>
                      </button>
                    </div>

                    {/* Menu Item 2: Electronic Invoice */}
                    <div className="py-1">
                      <button
                        id="menu-apply-invoice-btn"
                        type="button"
                        onClick={() => {
                          setIsVoucherDropdownOpen(false);
                          showToast('电子增值税普通发票申请已受理，开票后将自动推送至注册邮箱');
                        }}
                        className="w-full px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer flex items-center gap-2 hover:bg-gray-50 text-gray-800 group"
                      >
                        <div className="w-6 h-6 rounded-md bg-amber-100/70 text-amber-600 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-gray-900 flex items-center justify-between">
                            <span>申请数电发票</span>
                            <span className="text-[9px] text-amber-600 font-medium">即时开具</span>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate">企业报销抬头 · 微信卡包归集</p>
                        </div>
                      </button>
                    </div>

                    {/* Menu Item 3: Copy Transaction Number & Hash */}
                    <div className="py-1">
                      <button
                        id="menu-copy-tx-btn"
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            navigator.clipboard?.writeText(paymentVoucher?.voucherNo || cleanOrderNo);
                          }
                          setIsVoucherDropdownOpen(false);
                          showToast(`已复制结算流水号: ${paymentVoucher?.voucherNo || cleanOrderNo}`);
                        }}
                        className="w-full px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer flex items-center gap-2 hover:bg-gray-50 text-gray-800 group"
                      >
                        <div className="w-6 h-6 rounded-md bg-sky-100/70 text-sky-600 flex items-center justify-center shrink-0">
                          <Copy className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-gray-900 flex items-center justify-between">
                            <span>复制流水单号</span>
                            <span className="text-[9px] font-sans text-gray-400">存证哈希</span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-sans truncate">
                            {paymentVoucher?.voucherNo || cleanOrderNo}
                          </p>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Multi-Tab Collapsible Accordion Content */}
          <AnimatePresence>
            {isOrderDetailOpen && (
              <motion.div
                id="order-detail-collapse"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="overflow-hidden bg-white/95 border-t border-[#D1EFE2] text-xs text-gray-700"
              >
                <div className="px-3.5 py-2.5 space-y-2.5">
                  {/* Internal Segmented Accordion Tabs (折叠分段选择器，避免冗长文字平铺) */}
                  <div className="flex items-center gap-1 bg-[#f4f4f2] p-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setActiveCollapseTab('dishes')}
                      className={`flex-1 py-1 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        activeCollapseTab === 'dishes'
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <UtensilsCrossed className="w-3 h-3" />
                      <span>餐品明细 ({totalItemsCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCollapseTab('fees')}
                      className={`flex-1 py-1 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        activeCollapseTab === 'fees'
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <Receipt className="w-3 h-3" />
                      <span>费用分摊</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCollapseTab('escrow')}
                      className={`flex-1 py-1 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        activeCollapseTab === 'escrow'
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3 text-[#00B96B]" />
                      <span>资金保全</span>
                    </button>
                  </div>

                  {/* Tab 1: 餐品明细折叠区 */}
                  {activeCollapseTab === 'dishes' && (
                    <div className="space-y-1.5 pt-0.5">
                      {dishes.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-[11px] bg-[#fafaf8] px-2.5 py-1.5 rounded-lg border border-gray-100"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-4 h-4 rounded-full bg-emerald-50 text-[#00B96B] font-sans text-[10px] font-bold flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-gray-900 font-medium truncate">{d.name}</span>
                            <span className="text-gray-400 text-[10px] font-sans">x{d.count}</span>
                          </div>
                          <span className="font-sans font-bold text-gray-900 shrink-0">
                            ¥{d.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 2: 费用与抵扣分摊折叠区 (精炼结构，消除冗长长句) */}
                  {activeCollapseTab === 'fees' && (
                    <div className="bg-[#fafaf8] p-2.5 rounded-xl border border-gray-100 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-gray-600">
                        <span>餐品原价小计</span>
                        <span className="font-amount">¥{(totalAmount - packageFee).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-600">
                        <span>专线恒温配送费 & 锁鲜包材</span>
                        <span className="font-amount">¥{packageFee.toFixed(2)}</span>
                      </div>
                      {(order as any)?.couponDiscount ? (
                        <div className="flex items-center justify-between text-emerald-700 font-medium">
                          <span>卡券减免抵扣</span>
                          <span className="font-amount">-¥{Number((order as any).couponDiscount).toFixed(2)}</span>
                        </div>
                      ) : null}
                      <div className="pt-1.5 border-t border-gray-200/80 flex items-center justify-between text-xs font-bold text-gray-900">
                        <span>微信支付实结金额</span>
                        <span className="font-amount text-[#00B96B] text-sm">¥{totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: 资金保全细节 (将原本平铺的长篇大论收纳为结构化微卡片) */}
                  {activeCollapseTab === 'escrow' && (
                    <div className="bg-[#fafaf8] p-2.5 rounded-xl border border-gray-100 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-[#00B96B]" />
                          <span>履约清算专户监管状态</span>
                        </span>
                        <span className="text-[10px] font-sans text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                          资金锁定中
                        </span>
                      </div>
                      <p className="text-[10.5px] text-gray-500 leading-snug">
                        资金全额由银行专户托管。骑手妥投扫码核销后清算至商户，未履约可随时极速原路退回。
                      </p>
                      <div className="pt-1 border-t border-gray-200/60 flex items-center justify-between text-[10px] text-gray-400 font-sans">
                        <span>存证流水: {paymentVoucher?.voucherNo?.slice(0, 16) || cleanOrderNo}...</span>
                        <span className="text-[#00B96B] font-medium">区块链已防伪存证</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* END: PaymentGuarantee */}

        {isDineIn ? (
          <DineInTrackingSection
            order={order || ({
              id: cleanOrderNo,
              orderNo: cleanOrderNo,
              tableCode: 'A1',
              channelType: 'dine_in',
              channel: 'dine_in',
              totalAmount: totalAmount,
              items: dishes.map((d, i) => ({
                id: `it-${i}`,
                name: d.name,
                quantity: d.count,
                price: d.price / d.count
              }))
            } as any)}
            onBackToMenu={onBackToMenu}
            showToast={showToast}
          />
        ) : isPickup ? (
          <PickupTrackingSection
            order={order || ({
              id: cleanOrderNo,
              orderNo: cleanOrderNo,
              pickupCode: '8806',
              pickupShelfCode: '01 号智能保温取餐柜 (65℃恒温)',
              channelType: 'pickup',
              channel: 'pickup',
              totalAmount: totalAmount,
              items: dishes.map((d, i) => ({
                id: `it-${i}`,
                name: d.name,
                quantity: d.count,
                price: d.price / d.count
              }))
            } as any)}
            onBackToMenu={onBackToMenu}
            showToast={showToast}
          />
        ) : (
          <>
            {/* BEGIN: MapBoard - High Fidelity AMap Real Radar Map */}
            <TrackingRadarMap
              truck={truck}
              order={order}
              destinationLabel={order?.deliveryAddress || deliveryAddress}
              truckName={order?.truckName || truck?.name || '流动餐车'}
              initialSpeed={isSimulating ? 36 : 24}
              initialDistanceMeters={315}
              isSimulating={isSimulating}
              onSimulate={handleSimulateSpeed}
            />
            {/* END: MapBoard */}

            {/* BEGIN: RiderProfileCard */}
            <section className="bg-white px-3.5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600">
                    <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="5.5" cy="17.5" r="3.5" strokeWidth="1.8" />
                      <circle cx="18.5" cy="17.5" r="3.5" strokeWidth="1.8" />
                      <path d="M15 6h-3l-2.5 4H5.5M12 17.5V11l4-3.5h3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                    </svg>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#00B96B] border-2 border-white flex items-center justify-center text-white">
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fillRule="evenodd" />
                    </svg>
                  </span>
                </div>

                <div className="h-12 overflow-hidden relative flex-1 min-w-0">
                  <AnimatePresence mode="wait">
                    {tickerIndex === 0 ? (
                      <motion.div
                        key="status-ticker"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className="h-12 flex flex-col justify-center min-w-0"
                      >
                        <div className="flex items-center space-x-1.5 truncate">
                          <span className="w-2 h-2 rounded-full bg-[#FF7D00] animate-pulse-dot inline-block flex-shrink-0" />
                          <h2 className="font-bold text-gray-900 text-sm tracking-tight truncate">
                            骑手配送中 · 极速专送
                          </h2>
                        </div>
                        <div className="flex items-center space-x-1.5 mt-1">
                          <span className="bg-emerald-50 text-[#00B96B] border border-emerald-200 text-[10px] px-1.5 py-0.2 rounded font-medium flex-shrink-0">
                            保温箱已消毒
                          </span>
                          <span className="text-[10px] text-gray-400 truncate">
                            专线绿波飞驰中
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="courier-ticker"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className="h-12 flex flex-col justify-center min-w-0"
                      >
                        <div className="flex items-center space-x-1 truncate">
                          <h2 className="font-bold text-gray-900 text-sm truncate">{courierData.name}</h2>
                          <span className="text-xs text-gray-500 font-normal truncate">(专线骑手 R-8821)</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="inline-flex items-center text-amber-500 text-xs font-semibold">★ 4.99</span>
                          <span className="text-[11px] text-gray-400 truncate">已安全完成 {courierData.completedOrders} 单</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex flex-col space-y-1.5 w-24 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsChatModalOpen(true);
                    onContactCourier?.();
                  }}
                  className="bg-[#1A1A17] hover:bg-black active:scale-95 text-white text-xs py-1.5 px-2 rounded-full font-medium flex items-center justify-center space-x-1 transition-all cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>在线联系</span>
                </button>
                <button
                  type="button"
                  onClick={() => showToast(`正在拨通专线骑手 ${courierData.name} (${courierData.phone})`)}
                  className="bg-gray-100 text-gray-800 text-xs py-1.5 px-2 rounded-full font-medium flex items-center justify-center space-x-1 hover:bg-gray-200 active:bg-gray-300 active:scale-95 transition-all cursor-pointer"
                >
                  <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span>电话联系</span>
                </button>
              </div>
            </section>
            {/* END: RiderProfileCard */}

            {/* BEGIN: AddressRoute */}
            <section className="bg-white px-3.5 py-2.5 border-b border-gray-100 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 font-bold text-gray-800 truncate flex-1 min-w-0">
                <span className="text-sm flex-shrink-0">🏠</span>
                <span className="truncate">{order?.truckName || truck?.name || '黑曜石 01 号流动餐车'}</span>
              </div>
              <div className="flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium mx-2 flex-shrink-0">
                <span className="text-[10px] mr-1">↗</span> 高德测距 {truck?.distanceKm || 0.65} km
              </div>
              <div className="flex items-center justify-end space-x-1 font-bold text-gray-800 truncate flex-1 min-w-0">
                <span className="text-rose-500 font-bold flex-shrink-0">📍</span>
                <span className="truncate">{order?.deliveryAddress || deliveryAddress}</span>
              </div>
            </section>
            {/* END: AddressRoute */}

            {/* BEGIN: FulfillmentPipeline */}
            <section className="bg-white px-3.5 py-3.5 mt-2 border-t border-b border-gray-100">
              {/* Header: Title, Pipeline tag, Locked node badge */}
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#00B96B] animate-pulse-dot inline-block" />
                  <span className="text-xs font-semibold tracking-wider text-gray-900 uppercase">状态</span>
                  <span className="text-[10px] font-sans text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                    UR-PIPELINE // 7 STAGES
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPipelineModalOpen(true)}
                  className="flex items-center space-x-1 text-[11px] text-[#067A4B] font-medium bg-[#EBF7F2] hover:bg-emerald-50 active:scale-[0.98] px-2.5 py-1 rounded-full border border-[#D1EFE2] shadow-sm transition-all cursor-pointer group"
                >
                  <svg className="w-3.5 h-3.5 text-[#00B96B] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fillRule="evenodd" />
                  </svg>
                  <span className="font-bold">实时流转 0{realStep}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-[10px] text-emerald-800 flex items-center">
                    7阶段明细
                    <svg className="w-3 h-3 ml-0.5 transform group-hover:translate-x-0.5 transition-transform text-[#00B96B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                    </svg>
                  </span>
                </button>
              </div>

              {/* 4-Milestone Progress Component */}
              <div className="relative pt-2 pb-2">
                {/* Connecting Lines with dynamic progress extension */}
                <div className="absolute top-[28px] left-[10%] right-[10%] h-[3px] bg-gray-200 -z-0 rounded-full" />
                <div
                  className="absolute top-[28px] left-[10%] h-[3px] bg-[#00B96B] -z-0 rounded-full transition-all duration-700 ease-out"
                  style={{ width: overallProgressWidth }}
                />

                {/* 4 Major Milestone Columns (Slot 1: 下单, Slot 2: 接单, Slot 3: 步骤3-7动态热更新, Slot 4: 确认送达) */}
                <div className="grid grid-cols-4 gap-1 relative z-10 text-center">
                  {/* Milestone 1: 步骤 1 - 用户下单 (固定位置已完成) */}
                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-2xl bg-[#EBF7F2] border-2 border-[#00B96B] flex items-center justify-center text-[#00B96B] shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                      </svg>
                    </div>
                    <div className="mt-2 flex items-center space-x-1">
                      <span className="text-[9px] font-sans text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded font-bold border border-emerald-200">
                        01
                      </span>
                      <span className="text-[11px] font-bold text-gray-900 whitespace-nowrap">用户下单</span>
                    </div>
                    <span className="text-[9px] text-gray-500 mt-0.5 whitespace-nowrap">资金存管入账</span>
                    <div className="flex items-center space-x-1 mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00B96B]" />
                    </div>
                  </div>

                  {/* Milestone 2: 步骤 2 - 等待商家接单 (固定位置已确认) */}
                  <div className="flex flex-col items-center">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ${
                      realStep >= 2
                        ? 'bg-[#EBF7F2] border-2 border-[#00B96B] text-[#00B96B]'
                        : 'bg-white border-2 border-dashed border-gray-300 text-gray-400'
                    }`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                      </svg>
                    </div>
                    <div className="mt-2 flex items-center space-x-1">
                      <span className={`text-[9px] font-sans px-1 py-0.2 rounded font-bold ${
                        realStep >= 2
                          ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                          : 'text-gray-400 bg-gray-100'
                      }`}>
                        02
                      </span>
                      <span className={`text-[11px] whitespace-nowrap ${realStep >= 2 ? 'font-bold text-gray-900' : 'font-medium text-gray-500'}`}>
                        商家接单
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-500 mt-0.5 whitespace-nowrap">
                      {realStep >= 2 ? '车载排单确认' : '等待餐车接单'}
                    </span>
                    <div className="flex items-center space-x-1 mt-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${realStep >= 2 ? 'bg-[#00B96B]' : 'bg-gray-300'}`} />
                    </div>
                  </div>

                  {/* Milestone 3: 核心动态热更新槽位 (承载步骤 3-7 真实数据热更新，固定锁定后台状态) */}
                  <div
                    className="flex flex-col items-center transform -translate-y-1 cursor-pointer select-none group"
                    onClick={() => {
                      if (isSimulationAllowed && onAdvanceOrderStatus) {
                        const statusSequence: Order['status'][] = ['cooking', 'rider_heading', 'picked_up', 'delivering', 'completed'];
                        const curIdx = statusSequence.indexOf(order?.status as Order['status']);
                        const nextStatus = statusSequence[(curIdx + 1) % statusSequence.length];
                        onAdvanceOrderStatus(cleanOrderNo, nextStatus);
                        showToast(`开发者仿真：触发后台状态推进 ➔ 【${nextStatus}】`);
                      } else {
                        showToast(`当前履约状态：【${activeDyn.badge}】· 实时锁定后台数据`);
                      }
                    }}
                    title={isSimulationAllowed ? "开发者模式：点击推进后台真实订单状态并触发热更新" : `当前履约节点：${activeDyn.badge} · 锁定后台数据`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-[#1A1A17] border-2 border-gray-800 flex items-center justify-center text-white shadow-lg">
                        {activeDyn.step === 3 && (
                          /* 制作中：工业锁鲜现烤料理锅与三道优雅升腾热气 */
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M3 13c0 3.87 3.13 7 7 7s7-3.13 7-7H3z" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M17 14.5l4.5-2" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M7 9.5c0-1.5 1-2 1-3.5s-1-1.5-1-3" strokeWidth="2.1" strokeLinecap="round" />
                            <path d="M10.5 9.5c0-1.5 1-2 1-3.5s-1-1.5-1-3" strokeWidth="2.1" strokeLinecap="round" />
                            <path d="M14 9.5c0-1.5 1-2 1-3.5s-1-1.5-1-3" strokeWidth="2.1" strokeLinecap="round" />
                          </svg>
                        )}
                        {activeDyn.step === 4 && (
                          /* 赶往商家：战术 GPS 导航指针全速赶往商家雷达信标 */
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M3 11l19-9-9 19-2-8-8-2z" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M14 4a7 7 0 016 6" strokeWidth="2.1" strokeLinecap="round" />
                            <circle cx="19" cy="5" r="1.5" fill="currentColor" />
                          </svg>
                        )}
                        {activeDyn.step === 5 && (
                          /* 已取餐：恒温防震密封箱与安全锁毕 */
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="3" y="7" width="18" height="14" rx="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8.5 14l2.5 2.5 4.5-4.5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {activeDyn.step === 6 && (
                          /* 配送中：原版黑金专线极速飞驰机车 */
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="5.5" cy="17.5" r="3.5" strokeWidth="2" />
                            <circle cx="18.5" cy="17.5" r="3.5" strokeWidth="2" />
                            <path d="M15 6h-3l-2.5 4H5.5M12 17.5V11l4-3.5h3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                        )}
                        {activeDyn.step === 7 && (
                          /* 即将送达：高敏近距雷达锁定信标 */
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21s-6-5.333-6-10a6 6 0 0112 0c0 4.667-6 10-6 10z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="11" r="2.5" strokeWidth="2" />
                            <path d="M19 8a8 8 0 010 6M5 8a8 8 0 000 6" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        )}
                      </div>
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FF7D00] animate-pulse-dot border border-white" />
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`dyn-text-${activeDyn.step}`}
                        initial={{ opacity: 0, y: 2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -2 }}
                        transition={{ duration: 0.18 }}
                        className="flex flex-col items-center mt-1"
                      >
                        <div className="flex items-center space-x-1">
                          <span className="text-[9px] font-sans text-white bg-[#FF7D00] px-1 py-0.2 rounded font-bold">
                            {activeDyn.badge}
                          </span>
                          <span className="text-[11px] font-extrabold text-gray-900 whitespace-nowrap">
                            {activeDyn.title}
                          </span>
                        </div>
                        <span className="text-[9px] text-[#FF7D00] mt-0.5 whitespace-nowrap font-medium">
                          {activeDyn.subTitle}
                        </span>
                      </motion.div>
                    </AnimatePresence>

                    {/* 步骤 3-7 动态进度指示点 (依据真实 realStep 精确点亮) */}
                    <div className="flex items-center space-x-1 mt-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${realStep >= 3 ? 'bg-[#00B96B]' : 'bg-gray-300'}`} />
                      <span className={`w-1.5 h-1.5 rounded-full ${realStep >= 4 ? 'bg-[#00B96B]' : 'bg-gray-300'}`} />
                      <span className={`w-1.5 h-1.5 rounded-full ${realStep >= 5 ? 'bg-[#00B96B]' : 'bg-gray-300'}`} />
                      <span className={`w-1.5 h-1.5 rounded-full ${realStep >= 6 ? (realStep >= 7 ? 'bg-[#00B96B]' : 'bg-[#FF7D00] animate-pulse-dot') : 'bg-gray-300'}`} />
                    </div>
                  </div>

                  {/* Milestone 4: 步骤 7 - 确认送达 (固定终点槽位，根据真实后台状态同步完成) */}
                  <div className={`flex flex-col items-center transition-opacity duration-300 ${realStep >= 7 ? 'opacity-100' : 'opacity-60'}`}>
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm transition-all ${
                      realStep >= 7
                        ? 'bg-[#EBF7F2] border-2 border-[#00B96B] text-[#00B96B]'
                        : 'bg-white border-2 border-dashed border-gray-300 text-gray-400'
                    }`}>
                      {realStep >= 7 ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                          <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                        </svg>
                      )}
                    </div>
                    <div className="mt-2 flex items-center space-x-1">
                      <span className={`text-[9px] font-sans px-1 py-0.2 rounded font-bold ${
                        realStep >= 7
                          ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                          : 'text-gray-400 bg-gray-100'
                      }`}>
                        07
                      </span>
                      <span className={`text-[11px] whitespace-nowrap ${realStep >= 7 ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                        确认送达
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 mt-0.5 whitespace-nowrap">
                      {realStep >= 7 ? '妥投签收已入账' : '目的地无接触签收'}
                    </span>
                    <div className="flex items-center space-x-1 mt-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${realStep >= 7 ? 'bg-[#00B96B]' : 'bg-gray-300'}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Telemetry Info Row */}
              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-1 text-gray-600 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF7D00] inline-block flex-shrink-0" />
                  <span>当前专线骑手配送时速</span>
                  <span className="font-bold font-sans text-gray-900">{isSimulating ? 36 : 24} km/h</span>
                  <span className="text-gray-400">，预计剩余</span>
                  <span className="text-[#FF7D00] font-bold font-sans">6 分钟</span>
                  <span className="text-gray-400">送达</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-700 flex-shrink-0 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setIsPipelineModalOpen(true)}
                    className="hover:text-gray-900 cursor-pointer transition-colors"
                  >
                    展开节点时间轴
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChatModalOpen(true);
                      onContactCourier?.();
                    }}
                    className="hover:text-gray-900 cursor-pointer transition-colors"
                  >
                    联系专送员
                  </button>
                </div>
              </div>
            </section>
            {/* END: FulfillmentPipeline */}
          </>
        )}

        {/* BEGIN: BottomActions */}
        <footer className="mt-4 px-4 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-3">
            {/* Expedite Service */}
            <button
              type="button"
              onClick={() => {
                onUrgeOrder?.();
                showToast('已转接专属人工催单客服与流动餐车调度中枢');
              }}
              className="flex items-center space-x-1 hover:text-gray-900 active:opacity-75 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span>催单服务</span>
            </button>

            {/* Cancel Order Request (Red) */}
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="flex items-center space-x-1 text-[#F53F3F] font-medium hover:text-red-700 active:opacity-75 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#F53F3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path d="M4.93 4.93l14.14 14.14" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span>申请终止订单</span>
            </button>
          </div>

          {/* Share Trajectory */}
          <button
            type="button"
            onClick={handleShareTracking}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 active:opacity-75 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span>分享轨迹</span>
          </button>
        </footer>
        {/* END: BottomActions */}

        {/* Pipeline 8-Stage Modal */}
        <AnimatePresence>
          {isPipelineModalOpen && (
            <div
              id="pipeline-modal"
              className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex flex-col justify-end transition-all"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 flex flex-col max-h-[85%] overflow-hidden"
              >
                {/* Header */}
                <div className="px-4 pt-3.5 pb-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-[#EBF7F2] border border-[#D1EFE2] flex items-center justify-center text-[#00B96B]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h3 className="text-xs font-bold text-gray-900">流转节点存证状态机</h3>
                        <span className="bg-[#00B96B]/10 text-[#00B96B] border border-[#00B96B]/30 text-[9px] font-bold px-1.5 py-0.2 rounded font-sans">
                          UR-7 STAGES
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 font-sans">
                        区块链哈希存证已同步 · 实时监控中
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPipelineModalOpen(false)}
                    className="w-7 h-7 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </button>
                </div>

                {/* Body: Timeline Logs */}
                <div className="px-4 py-3 overflow-y-auto space-y-3 no-scrollbar text-xs">
                  {pipelineStages.map((stage, idx) => (
                    <div key={stage.id} className="flex items-start space-x-3 relative">
                      <div className="flex flex-col items-center">
                        {stage.isActive ? (
                          <div className="w-4 h-4 rounded-full bg-[#FF7D00] animate-pulse-dot border-2 border-white shadow flex items-center justify-center" />
                        ) : stage.passed ? (
                          <div className="w-3.5 h-3.5 rounded-full bg-[#00B96B] flex items-center justify-center text-white text-[9px]">
                            ✓
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-400 text-[9px]">
                            ○
                          </div>
                        )}
                        {idx < pipelineStages.length - 1 && (
                          <div className="w-0.5 h-10 bg-gray-200 mt-1" />
                        )}
                      </div>

                      <div
                        className={`flex-1 rounded-lg p-2.5 ${
                          stage.isActive
                            ? 'bg-amber-500/10 border border-yellow-500/20'
                            : 'bg-gray-50 border border-gray-200/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[11px] ${
                              stage.isActive ? 'font-bold text-gray-900' : 'font-medium text-gray-800'
                            }`}
                          >
                            {stage.title}
                          </span>
                          <span
                            className={`text-[10px] font-sans ${
                              stage.isActive ? 'text-[#FF7D00] font-semibold' : 'text-gray-400'
                            }`}
                          >
                            {stage.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-700 mt-1">{stage.desc}</p>
                        <div className="mt-1.5 text-[9px] font-sans text-gray-400 bg-white/70 px-1.5 py-0.5 rounded flex items-center justify-between">
                          <span>存证哈希: {stage.hash}</span>
                          <span className="text-[#00B96B] font-bold">✓ 校验一致</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-100 bg-white flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-sans">UR-TRACE // BLOCK-HEIGHT #9821</span>
                  <button
                    type="button"
                    onClick={() => setIsPipelineModalOpen(false)}
                    className="bg-[#1A1A17] text-white text-xs px-4 py-1.5 rounded-lg font-medium hover:bg-black transition-colors cursor-pointer"
                  >
                    收起明细
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Realistic Real-Time Chat Bubble Interface Modal */}
      <TrackingChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        courier={courierData}
        order={order}
        orderId={cleanOrderNo}
        deliveryAddress={order?.deliveryAddress || deliveryAddress}
        onCallPhone={() => showToast(`正在呼叫专送骑手 ${courierData.name} (${courierData.phone})`)}
      />

      {/* Customer Cancel / Terminate Order Request Modal */}
      <AnimatePresence>
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-2xl border border-gray-200 shadow-2xl overflow-hidden text-xs"
            >
              {/* Header */}
              <div className="p-3.5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-950 font-bold text-sm">
                  <Ban className="w-4.5 h-4.5 text-rose-600" />
                  <span>申请终止订单 (发起退款)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="text-neutral-400 hover:text-black cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-4 space-y-3.5 text-neutral-700">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                  <strong>温馨提示：</strong> 当前订单已进入【{statusConfig.label}】流程。若餐车主理人已在烤制备餐，将结合食材损耗确认审核。
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-neutral-800 text-[11.5px]">选择终止原因：</label>
                  <div className="space-y-1">
                    {[
                      '制作或等待配送时间过长',
                      '送达地址填写错误，需修改重下',
                      '误操作多下 / 菜品规格选错',
                      '临时有外出安排无法取餐',
                      '其他不可抗力原因'
                    ].map((reason) => (
                      <label
                        key={reason}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                          cancelReason === reason
                            ? 'bg-rose-50 border-rose-300 text-rose-950 font-medium'
                            : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="cancel_reason"
                          checked={cancelReason === reason}
                          onChange={() => setCancelReason(reason)}
                          className="accent-rose-600"
                        />
                        <span className="text-[11px]">{reason}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-800 text-[11.5px]">补充说明 (选填)：</label>
                  <textarea
                    rows={2}
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                    placeholder="请输入详细诉求，主理人将加急跟进处理..."
                    className="w-full p-2 border border-neutral-300 rounded-xl text-xs resize-none outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-3 py-1.5 rounded-full border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold cursor-pointer"
                >
                  暂不取消
                </button>
                <button
                  type="button"
                  onClick={handleSubmitCancelRequest}
                  className="px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  确认提交申请
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Electronic Payment Voucher Inspection Modal */}
      <ElectronicPaymentVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        voucher={paymentVoucher}
        onReprintPrintReceipt={() => {
          showToast('已将防伪凭据推送到餐车热敏小票机');
        }}
      />
    </div>
  );
};
