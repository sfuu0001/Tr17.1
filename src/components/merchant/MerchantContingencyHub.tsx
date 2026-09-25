import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Zap,
  Bike,
  Flame,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Phone,
  RotateCw,
  Search,
  Lock,
  Unlock,
  Store,
  DollarSign,
  FileText,
  AlertCircle,
  Camera,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Layers,
  Sparkles,
  RefreshCw,
  Activity,
  Maximize2,
  Check,
  X,
  Package,
  Utensils,
  ShoppingBag,
  MapPin,
  FlameKindling
} from 'lucide-react';
import { Order } from '../../types';
import { UnifiedOmniChatModal } from '../chat/UnifiedOmniChatModal';
import { getOrGeneratePickupCode, getPickupShelfCode } from '../../utils/pickupCodeEngine';
import { resolveOrderChannelType } from '../../utils/orderNormalizer';
import { safeGetStorage } from '../../utils/safeStorage';
import { getUnifiedTruckName } from '../../utils/truckNaming';

interface MerchantContingencyHubProps {
  orders: Order[];
  onAdvanceOrderStatus: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  showToast: (msg: string) => void;
}

export const MerchantContingencyHub: React.FC<MerchantContingencyHubProps> = ({
  orders,
  onAdvanceOrderStatus,
  onAuditRefund,
  showToast
}) => {
  // Navigation Nodes Pipeline Filter
  const [activeNodeTab, setActiveNodeTab] = useState<
    'all' | 'unaccepted' | 'cooking' | 'rider_rejection' | 'transit' | 'refund'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  // View Style Mode: 'detailed' (大卡片) | 'compact' (紧凑行) | 'drawer' (折叠抽屉)
  const [viewMode, setViewMode] = useState<'detailed' | 'compact' | 'drawer'>('detailed');

  // Meal Accordion Expansion: map of orderId -> boolean, plus batch toggle state
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [allMealsExpanded, setAllMealsExpanded] = useState<boolean>(true);

  // Drawer Opened cards for Drawer mode
  const [drawerOpenedCards, setDrawerOpenedCards] = useState<Record<string, boolean>>(() => {
    // Default open first card
    return { '0': true };
  });

  // Emergency Fuse / Circuit Breaker Modal
  const [isEmergencyFuseOpen, setIsEmergencyFuseOpen] = useState(false);
  const [fuseActive, setFuseActive] = useState(false);
  const [fuseReason, setFuseReason] = useState('暴雨天气与高峰运力极度紧张，临时限流熔断');

  // Fallback Action Modal State
  const [activeActionModal, setActiveActionModal] = useState<{
    type: 're_dispatch_bonus' | 'self_delivery' | 'turn_pickup' | 'remake_delay' | 'force_deliver_photo';
    order: Order;
  } | null>(null);

  const [bonusAmount, setBonusAmount] = useState<number>(3.0);
  const [remakeReason, setRemakeReason] = useState<string>('果木炭火火候过猛导致肉串焦化，主厨已重新下炉烤制');

  // Per-item refund arbitration reject reason (keyed by order id)
  const [refundRejectReasons, setRefundRejectReasons] = useState<Record<string, string>>({});
  const [chatOrder, setChatOrder] = useState<Order | null>(null);

  // Compute Anomaly Metrics across nodes
  const unacceptedOrders = orders.filter(
    (o) => o.status === 'pending' || (o.stepIndex === 0 && !o.merchantAccepted)
  );
  const cookingDelayOrders = orders.filter(
    (o) => o.status === 'cooking' && ((o.etaMinutes && o.etaMinutes > 20) || o.stepIndex === 1)
  );
  const riderRejectedOrders = orders.filter(
    (o) =>
      (o.rejectionCount && o.rejectionCount > 0) ||
      o.isEscalatedToMerchant ||
      (o.status === 'ready' && !o.riderAccepted)
  );
  const transitIssueOrders = orders.filter(
    (o) => o.status === 'delivering' && ((o.anomalies && o.anomalies.length > 0) || (o.etaMinutes && o.etaMinutes > 25))
  );
  const refundDisputeOrders = orders.filter(
    (o) => o.refundStatus === 'pending' || o.status === 'refund_pending'
  );

  const allAnomalyCount =
    unacceptedOrders.length +
    cookingDelayOrders.length +
    riderRejectedOrders.length +
    transitIssueOrders.length +
    refundDisputeOrders.length;

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (activeNodeTab === 'unaccepted')
          return o.status === 'pending' || (o.stepIndex === 0 && !o.merchantAccepted);
        if (activeNodeTab === 'cooking') return o.status === 'cooking';
        if (activeNodeTab === 'rider_rejection')
          return (
            (o.rejectionCount && o.rejectionCount > 0) ||
            o.isEscalatedToMerchant ||
            (o.status === 'ready' && !o.riderAccepted)
          );
        if (activeNodeTab === 'transit') return o.status === 'delivering';
        if (activeNodeTab === 'refund')
          return o.refundStatus === 'pending' || o.status === 'refund_pending';

        // 'all' shows all pipeline orders
        return true;
      })
      .filter((o) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          o.orderNo.toLowerCase().includes(q) ||
          (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(q)) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.courierName && o.courierName.toLowerCase().includes(q)) ||
          (o.userId && o.userId.toLowerCase().includes(q)) ||
          (o.tableCode && o.tableCode.toLowerCase().includes(q)) ||
          (o.pickupCode && o.pickupCode.toLowerCase().includes(q))
        );
      });
  }, [orders, activeNodeTab, searchQuery]);

  // Toggle meal detail for a specific card
  const toggleMealDetail = (orderKey: string) => {
    setExpandedMeals((prev) => {
      const current = prev[orderKey] !== undefined ? prev[orderKey] : allMealsExpanded;
      return { ...prev, [orderKey]: !current };
    });
  };

  // Toggle batch meal details
  const handleToggleAllMeals = () => {
    const nextState = !allMealsExpanded;
    setAllMealsExpanded(nextState);
    const updated: Record<string, boolean> = {};
    filteredOrders.forEach((o, idx) => {
      const key = o.id || o.orderNo || String(idx);
      updated[key] = nextState;
    });
    setExpandedMeals(updated);
    showToast(nextState ? '已一键展开全部工单餐品明细' : '已一键折叠全部工单餐品明细');
  };

  // Toggle card drawer in drawer view
  const toggleCardDrawer = (orderKey: string) => {
    setDrawerOpenedCards((prev) => ({
      ...prev,
      [orderKey]: !prev[orderKey]
    }));
  };

  // Action Handlers
  const handleExecuteReDispatchBonus = (order: Order) => {
    const newBounty = (order.deliveryBounty || 0) + bonusAmount;
    onAdvanceOrderStatus(order.orderNo || order.id, 'ready', {
      status: 'ready',
      stepIndex: 2,
      deliveryBounty: newBounty,
      isEscalatedToMerchant: false,
      statusText: `调度赏金已加码 +¥${bonusAmount.toFixed(1)}，已再次广播周边骑手`,
      auditLogs: [
        ...(order.auditLogs || []),
        {
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          operator: '餐车调度中枢',
          role: 'merchant',
          action: '加码转派赏金',
          note: `骑手拒接后触发加码调度，追加 +¥${bonusAmount.toFixed(1)} 专送赏金，当前总补贴 ¥${newBounty.toFixed(1)}`
        }
      ]
    });
    showToast(`工单 #${order.orderNo} 已追加 ¥${bonusAmount.toFixed(1)} 加急赏金并重新广播至骑手抢单池！`);
    setActiveActionModal(null);
  };

  const handleExecuteMerchantSelfDelivery = (order: Order) => {
    onAdvanceOrderStatus(order.orderNo || order.id, 'delivering', {
      status: 'delivering',
      stepIndex: 3,
      isMerchantSelfDelivery: true,
      courierName: '餐车主理人专属直送 (车长代送)',
      courierPhone: '021-8899-0110',
      statusText: '餐车主理人已启动兜底自送，正在直达您的地址',
      progressPercent: 75,
      auditLogs: [
        ...(order.auditLogs || []),
        {
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          operator: '餐车主理人',
          role: 'merchant',
          action: '启动主理人直送',
          note: '触发运力短缺兜底预案，主理人接管配送，保障 15 分钟内锁鲜妥投'
        }
      ]
    });
    showToast(`工单 #${order.orderNo} 已切换为【主理人专属自送】，配送状态已推进并同步客户端！`);
    setActiveActionModal(null);
  };

  const handleExecuteTurnToPickup = (order: Order) => {
    const refundFee = 6.0;
    onAdvanceOrderStatus(order.orderNo || order.id, 'ready', {
      channelType: 'pickup',
      status: 'ready',
      stepIndex: 2,
      statusText: '已协商转为餐车自提，已原路退回运费 ¥6.00',
      totalAmount: Math.max(0, order.totalAmount - refundFee),
      auditLogs: [
        ...(order.auditLogs || []),
        {
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          operator: '餐车店长',
          role: 'merchant',
          action: '转为到车自提',
          note: `与顾客协商成功，已扣减并退还配送费包装费 ¥${refundFee.toFixed(2)}，餐品移至 01 号保温取餐格`
        }
      ]
    });
    showToast(`工单 #${order.orderNo} 已转为【到车自提】，已退还配送费 ¥${refundFee.toFixed(2)}！`);
    setActiveActionModal(null);
  };

  const handleExecuteRemakeDelay = (order: Order) => {
    onAdvanceOrderStatus(order.orderNo || order.id, 'cooking', {
      status: 'cooking',
      stepIndex: 1,
      etaMinutes: (order.etaMinutes || 12) + 8,
      statusText: '餐车主厨加急重制中（已发放 500 延误积分）',
      auditLogs: [
        ...(order.auditLogs || []),
        {
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          operator: '后厨 KDS 主管',
          role: 'merchant',
          action: '重做报备与延误补偿',
          note: `原因：${remakeReason}。系统已顺延送达时间 8 分钟并推送顾客补偿 500 积分`
        }
      ]
    });
    showToast(`已提交工单 #${order.orderNo} 重制报备，已顺延送达时间并赠送顾客延误补贴！`);
    setActiveActionModal(null);
  };

  const handleExecuteForceDeliverPhoto = (order: Order) => {
    onAdvanceOrderStatus(order.orderNo || order.id, 'completed', {
      status: 'completed',
      stepIndex: 4,
      progressPercent: 100,
      statusText: '已由商家核验拍照妥投存证',
      auditLogs: [
        ...(order.auditLogs || []),
        {
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          operator: '履约风控审核员',
          role: 'merchant',
          action: '安全妥投审核归档',
          note: '骑手已上传写字楼前台/门卫存证照片，风控审核通过，工单闭环归档'
        }
      ]
    });
    showToast(`工单 #${order.orderNo} 妥投审核通过，状态推进至【已完成】并归档！`);
    setActiveActionModal(null);
  };

  // Toggle Emergency Fuse
  const handleToggleEmergencyFuse = () => {
    const next = !fuseActive;
    setFuseActive(next);
    setIsEmergencyFuseOpen(false);
    showToast(
      next
        ? `⚠️ 已开启餐车紧急熔断机制！新订单流转已限制，调度池触发降级保护：${fuseReason}`
        : '✅ 已解除紧急熔断，系统状态机已恢复常态吞吐调度！'
    );
  };

  return (
    <div className="w-full flex flex-col font-sans text-xs antialiased selection:bg-[#37352f] selection:text-white pb-6">
      {/* ========================================================================= */}
      {/* BEGIN: GlobalHeader (全链路突发情况与审核中枢专用顶栏)                     */}
      {/* ========================================================================= */}
      <header className="bg-white border-b border-[#e6e6e4] sticky top-0 z-20 px-3 sm:px-6 py-3 shadow-2xs">
        <div className="max-w-[2000px] mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          {/* System Identity & Security Status */}
          <div className="flex items-start sm:items-center space-x-3">
            <div className="bg-[#fde8e8] border border-[#f8b4b4] p-2 text-[#d44333] shrink-0 rounded-[2px]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-semibold text-[#37352f] tracking-tight">
                  全链路突发情况兜底与审核中枢
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-[#fde8e8] text-[#d44333] border border-[#f8b4b4] rounded-[2px]">
                  <span className="w-1.5 h-1.5 bg-[#d44333] mr-1.5 animate-pulse rounded-full"></span>
                  异常监控中 ({allAnomalyCount} 项待把控)
                </span>
                {fuseActive && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-[#d9730d] text-white rounded-[2px]">
                    ⚡ 紧急熔断生效中
                  </span>
                )}
              </div>
              <p className="text-[#787774] text-xs mt-0.5">
                覆盖下单、后厨制作、骑手拒单、在途受阻、退单仲裁全节点，杜绝死锁与卡单，确保状态机安全流转
              </p>
            </div>
          </div>

          {/* Quick Operations & Global Search */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0 flex-wrap">
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-[#787774]">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索单号 / 地址 / 骑手..."
                className="w-full bg-[#f7f7f5] border border-[#e6e6e4] pl-8 pr-3 py-1.5 text-xs text-[#37352f] focus:bg-white focus:border-[#37352f] placeholder-[#787774] rounded-[2px] outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-[#787774] hover:text-[#37352f] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                try {
                  const fresh = safeGetStorage<Order[]>('obsidian_truck_orders', orders);
                  if (typeof window !== 'undefined' && fresh.length > 0) {
                    window.dispatchEvent(new CustomEvent('obsidian_orders_updated', { detail: fresh }));
                  }
                  showToast(`全链路工单状态同步完成，已载入 ${fresh.length} 笔本地权威订单`);
                } catch (e) {
                  console.error('全屏刷新失败:', e);
                  showToast('全屏刷新失败，请稍后重试');
                }
              }}
              className="bg-white border border-[#e6e6e4] hover:bg-[#f7f7f5] text-[#37352f] px-3 py-1.5 text-xs font-medium inline-flex items-center space-x-1.5 rounded-[2px] cursor-pointer shadow-2xs"
              title="强制同步流转状态"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#5a5854]" />
              <span className="hidden sm:inline">全屏刷新</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEmergencyFuseOpen(true)}
              className={`border px-3 py-1.5 text-xs font-semibold flex items-center space-x-1 rounded-[2px] cursor-pointer transition-colors shadow-2xs ${
                fuseActive
                  ? 'bg-[#d9730d] hover:bg-[#b06000] text-white border-[#d9730d]'
                  : 'bg-[#37352f] border-[#37352f] hover:bg-[#201f1d] text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>{fuseActive ? '熔断管理' : '紧急熔断'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Nodes Pipeline Filter */}
        <nav className="max-w-[2000px] mx-auto mt-2.5 pt-2.5 border-t border-[#e6e6e4] flex items-center gap-1.5 overflow-x-auto text-xs whitespace-nowrap scrollbar-none">
          {[
            { id: 'all', label: '全链路监控', count: orders.length, icon: ShieldAlert },
            { id: 'unaccepted', label: '1. 接单超时兜底', count: unacceptedOrders.length, icon: Clock },
            { id: 'cooking', label: '2. 后厨重制/超时', count: cookingDelayOrders.length, icon: Flame },
            { id: 'rider_rejection', label: '3. 骑手拒接/二次调度', count: riderRejectedOrders.length, icon: Bike },
            { id: 'transit', label: '4. 配送在途异常', count: transitIssueOrders.length, icon: AlertTriangle },
            { id: 'refund', label: '5. 售后退款仲裁', count: refundDisputeOrders.length, icon: DollarSign }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeNodeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveNodeTab(tab.id as any)}
                className={`px-3 py-1.5 font-semibold border inline-flex items-center space-x-1.5 transition-colors cursor-pointer rounded-full bg-white ${
                  isActive
                    ? 'border-zinc-900 text-zinc-900 shadow-2xs'
                    : 'hover:bg-slate-50 text-[#5a5854] hover:text-zinc-900 border-[#e6e6e4] hover:border-zinc-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-900' : 'text-[#787774]'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 text-[10.5px] font-mono font-semibold ml-1 rounded-full ${
                    isActive ? 'bg-zinc-900 text-white' : 'bg-[#f0f0ee] text-[#5a5854] border border-[#e6e6e4]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </header>
      {/* END: GlobalHeader */}

      {/* ========================================================================= */}
      {/* BEGIN: MainContent (中枢量化指标 + 卡片样式切换开关 + 结构化工单网格)    */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-[1780px] w-full mx-auto p-3 sm:p-5 lg:p-6 space-y-4">
        {/* BEGIN: QuickMetricsDashboard (中枢监控量化指标条) */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 sm:p-4 border border-[#e6e6e4] rounded-[4px] shadow-2xs">
          <div className="border-r border-[#efefed] pr-3">
            <div className="text-[#787774] text-[10.5px] uppercase tracking-wider font-mono">
              ACTIVE PIPELINE ORDERS
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl sm:text-2xl font-semibold font-mono text-[#37352f]">
                {orders.length}
              </span>
              <span className="text-[#2b593f] font-medium text-xs">
                {allAnomalyCount === 0 ? '全节点无阻滞' : `${allAnomalyCount} 项待介入`}
              </span>
            </div>
          </div>
          <div className="border-r border-[#efefed] pr-3 pl-1 sm:pl-3">
            <div className="text-[#787774] text-[10.5px] uppercase tracking-wider font-mono">
              DISPATCH EXCEPTION RATE
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl sm:text-2xl font-semibold font-mono text-[#2b593f]">
                {orders.length > 0 ? ((riderRejectedOrders.length / orders.length) * 100).toFixed(2) : '0.00'}%
              </span>
              <span className="text-[#787774] text-xs">基准线良好</span>
            </div>
          </div>
          <div className="border-r border-[#efefed] pr-3 pl-1 sm:pl-3">
            <div className="text-[#787774] text-[10.5px] uppercase tracking-wider font-mono">
              AVG INTERVENTION SLA
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl sm:text-2xl font-semibold font-mono text-[#37352f]">
                1.8 <span className="text-xs font-normal">min</span>
              </span>
              <span className="text-[#d9730d] font-medium text-xs">兜底高灵敏</span>
            </div>
          </div>
          <div className="pl-1 sm:pl-3">
            <div className="text-[#787774] text-[10.5px] uppercase tracking-wider font-mono">
              KITCHEN WORKLOAD INDEX
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl sm:text-2xl font-semibold font-mono text-[#1c5598]">
                {Math.min(98, 45 + cookingDelayOrders.length * 12)}%
              </span>
              <span className="text-[#787774] text-xs">产能均衡</span>
            </div>
          </div>
        </section>
        {/* END: QuickMetricsDashboard */}

        {/* BEGIN: ViewSwitcherBar (卡片样式切换开关：大卡片 / 紧凑行 / 折叠抽屉) */}
        <section className="bg-white border border-[#e6e6e4] px-3 sm:px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2.5 rounded-[4px] shadow-2xs">
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-[#787774] font-semibold text-xs uppercase tracking-wider font-mono flex items-center mr-1">
              <LayoutGrid className="w-3.5 h-3.5 mr-1 text-[#5a5854]" />
              卡片样式切换:
            </span>
            <div className="inline-flex border border-[#e6e6e4] p-0.5 bg-[#f7f7f5] rounded-[2px]">
              {/* 大卡片 */}
              <button
                type="button"
                onClick={() => setViewMode('detailed')}
                className={`px-2.5 py-1 text-xs border border-transparent transition-colors flex items-center gap-1.5 cursor-pointer rounded-[2px] ${
                  viewMode === 'detailed'
                    ? 'bg-[#37352f] text-white font-semibold shadow-2xs'
                    : 'text-[#5a5854] hover:text-[#37352f] hover:bg-[#e8e8e6]'
                }`}
                title="完整大卡片视图"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-semibold">大卡片</span>
              </button>

              {/* 紧凑行 */}
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`px-2.5 py-1 text-xs border border-transparent transition-colors flex items-center gap-1.5 cursor-pointer rounded-[2px] ${
                  viewMode === 'compact'
                    ? 'bg-[#37352f] text-white font-semibold shadow-2xs'
                    : 'text-[#5a5854] hover:text-[#37352f] hover:bg-[#e8e8e6]'
                }`}
                title="紧凑行列表视图"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-medium">紧凑行</span>
              </button>

              {/* 折叠抽屉 */}
              <button
                type="button"
                onClick={() => setViewMode('drawer')}
                className={`px-2.5 py-1 text-xs border border-transparent transition-colors flex items-center gap-1.5 cursor-pointer rounded-[2px] ${
                  viewMode === 'drawer'
                    ? 'bg-[#37352f] text-white font-semibold shadow-2xs'
                    : 'text-[#5a5854] hover:text-[#37352f] hover:bg-[#e8e8e6]'
                }`}
                title="折叠抽屉视图"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-medium">折叠抽屉</span>
              </button>
            </div>
          </div>

          {/* 右侧批量控制与辅助工具 */}
          <div className="flex items-center space-x-2 self-end md:self-auto">
            <button
              type="button"
              onClick={handleToggleAllMeals}
              className="bg-[#f7f7f5] hover:bg-[#efefed] border border-[#e6e6e4] text-[#37352f] px-2.5 py-1 text-xs font-medium inline-flex items-center space-x-1 rounded-[2px] cursor-pointer shadow-2xs"
            >
              {allMealsExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-[#787774]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[#787774]" />
              )}
              <span>{allMealsExpanded ? '一键折叠餐品明细' : '一键展开全部餐品'}</span>
            </button>
            <span className="text-[#e6e6e4]">|</span>
            <div className="text-[11px] text-[#787774] font-mono hidden sm:inline-flex items-center">
              <span>展示状态: </span>
              <span className="font-semibold text-[#37352f] ml-1">
                {viewMode === 'detailed'
                  ? '大卡片 (默认)'
                  : viewMode === 'compact'
                  ? '紧凑行列表'
                  : '折叠抽屉视图'}
              </span>
            </div>
          </div>
        </section>
        {/* END: ViewSwitcherBar */}

        {/* BEGIN: OrdersGrid (结构化双列/流式工单卡片) */}
        <section
          className={`transition-all ${
            viewMode === 'compact'
              ? 'grid grid-cols-1 gap-2'
              : 'grid grid-cols-1 md:grid-cols-2 gap-4'
          }`}
          data-purpose="order-cards-container"
        >
          {filteredOrders.length === 0 ? (
            <div className="col-span-full bg-white border border-[#e6e6e4] p-12 text-center space-y-2 rounded-[4px] shadow-2xs">
              <CheckCircle2 className="w-10 h-10 text-[#2b593f] mx-auto" />
              <h4 className="font-semibold text-sm text-[#37352f]">当前节点运行平稳</h4>
              <p className="text-xs text-[#787774]">所有工单均在规范状态机内正常推进，未发生卡单或异常阻塞</p>
            </div>
          ) : (
            filteredOrders.map((order, idx) => {
              const cardKey = order.id || order.orderNo || String(idx);
              const isMealOpen =
                expandedMeals[cardKey] !== undefined ? expandedMeals[cardKey] : allMealsExpanded;
              const isDrawerOpen =
                viewMode !== 'drawer' || (drawerOpenedCards[cardKey] ?? (idx === 0));

              const orderChannel = resolveOrderChannelType(order);
              const isDineIn = orderChannel === 'dine_in';
              const isPickup = orderChannel === 'pickup';
              const isDelivery = orderChannel === 'delivery';

              const isPendingAccept = order.status === 'pending' || (order.stepIndex === 0 && !order.merchantAccepted);
              const isCooking = order.status === 'cooking';
              const isReady = order.status === 'ready';
              const isDelivering = order.status === 'delivering';
              const isCompleted = order.status === 'completed';
              const isRefundPending = order.refundStatus === 'pending' || order.status === 'refund_pending';
              const isRefunded = order.status === 'refunded' || order.status === 'cancelled';

              const hasRejections =
                (order.rejectionCount && order.rejectionCount > 0) ||
                (order.rejectionRecords && order.rejectionRecords.length > 0) ||
                order.isEscalatedToMerchant;

              // Pickup and shelf code
              const pickupCode = getOrGeneratePickupCode(order.orderNo, order.pickupCode);
              const shelfCode = getPickupShelfCode(order.id || order.orderNo, order.pickupShelfCode);

              const totalQty = order.items.reduce((acc, it) => acc + (it.quantity || 1), 0);
              const itemCount = order.items.length;

              // Net payout calculation
              const netPayout =
                order.merchantNetPayout !== undefined
                  ? order.merchantNetPayout
                  : order.totalAmount - (isDelivery ? 10.5 : 0);

              return (
                <article
                  key={`ord-contingency-${cardKey}`}
                  className="bg-white border border-[#e6e6e4] hover:border-[#37352f] transition-all flex flex-col justify-between shadow-2xs rounded-[4px] overflow-hidden"
                  data-purpose="order-card"
                >
                  <div>
                    {/* 1. 卡片顶栏：左侧黑色实底单号徽标与餐车标签，右侧场景标签 */}
                    <div
                      onClick={() => viewMode === 'drawer' && toggleCardDrawer(cardKey)}
                      className={`px-3.5 sm:px-4 py-2 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between gap-2 flex-wrap ${
                        viewMode === 'drawer' ? 'cursor-pointer select-none hover:bg-[#efefed]' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="bg-[#37352f] text-white font-mono font-semibold px-2 py-0.5 text-xs tracking-wider rounded-[2px]">
                          #{order.orderNo.replace(/^#/, '')}
                        </span>
                        <span className="text-xs font-medium text-[#37352f] bg-white border border-[#e6e6e4] px-2 py-0.5 rounded-[2px] flex items-center gap-1">
                          <Store className="w-3 h-3 text-[#2b593f]" />
                          <span>{order.truckName || '黑曜石 01号流动餐车'}</span>
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-wrap">
                        {isDineIn ? (
                          <span className="bg-[#ebf3fc] text-[#1c5598] border border-[#d2e4f8] px-2 py-0.5 text-xs font-medium rounded-[2px]">
                            🍽️ 堂食就餐 · {order.tableCode ? `${order.tableCode}号桌` : 'A2号桌'}
                          </span>
                        ) : isPickup ? (
                          <span className="bg-[#edf6f1] text-[#2b593f] border border-[#cbe4d7] px-2 py-0.5 text-xs font-medium rounded-[2px]">
                            🛍️ 到店自提 · 智能恒温柜
                          </span>
                        ) : (
                          <span className="bg-[#f0eef8] text-[#553c9a] border border-[#ded8f4] px-2 py-0.5 text-xs font-medium rounded-[2px]">
                            🛵 专送外卖 · 智能调度
                          </span>
                        )}

                        {/* Status Phase Badge */}
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-[2px] border ${
                            isRefundPending
                              ? 'bg-[#fde8e8] text-[#d44333] border-[#f8b4b4] animate-pulse'
                              : isPendingAccept
                              ? 'bg-[#fef3d6] text-[#d9730d] border-[#fae2a0]'
                              : isCooking
                              ? 'bg-[#fef3d6] text-[#d9730d] border-[#fae2a0]'
                              : isReady
                              ? 'bg-[#ebf3fc] text-[#1c5598] border-[#d2e4f8]'
                              : isDelivering
                              ? 'bg-[#ebf3fc] text-[#1c5598] border-[#d2e4f8]'
                              : 'bg-[#edf6f1] text-[#2b593f] border-[#cbe4d7]'
                          }`}
                        >
                          {order.statusText ||
                            (isPendingAccept
                              ? '待接单 (阶段 0/4)'
                              : isCooking
                              ? '后厨现制中 (阶段 1/4)'
                              : isReady
                              ? '待取餐 (阶段 2/4)'
                              : isDelivering
                              ? '配送在途 (阶段 3/4)'
                              : '妥投完成 (阶段 4/4)')}
                        </span>

                        {viewMode === 'drawer' && (
                          <span className="font-mono text-xs font-semibold text-[#787774] pl-1">
                            {isDrawerOpen ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. 卡片次级元信息栏 */}
                    <div className="px-3.5 sm:px-4 py-1.5 bg-white border-b border-[#efefed] flex items-center justify-between text-xs text-[#787774] font-mono flex-wrap gap-1.5">
                      <div className="flex items-center space-x-2.5 flex-wrap">
                        <span>
                          UID: {order.userId ? (order.userId.length > 14 ? `${order.userId.slice(0, 12)}...` : order.userId) : '139-7078-8821'}{' '}
                          ({order.customerName ? order.customerName.replace(/^先锋食客\s*[·•]?\s*/, '') : '先锋食客'})
                        </span>
                        <span className="text-[#e6e6e4]">|</span>
                        <span>下单: {order.createdTime || '12:24:18'}</span>
                        <span className="text-[#e6e6e4]">|</span>
                        <span className="text-[#37352f] font-sans font-medium">
                          {isDineIn
                            ? `排单: #${order.orderNo.slice(-2)} (现场叫号)`
                            : isPickup
                            ? `取件码: ${pickupCode}`
                            : `骑手: ${order.courierName || '陈志远 (R-8821)'}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isRefundPending ? (
                          <span className="text-[#d44333] font-semibold font-sans text-[11px] animate-pulse">
                            ⚠️ 退单待仲裁
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onAdvanceOrderStatus(order.orderNo || order.id, 'refund_pending', {
                                status: 'refund_pending',
                                refundStatus: 'pending',
                                refundReason: '商家主动发起售后仲裁协助',
                                statusText: '退单待仲裁'
                              });
                              showToast(`已为工单 #${order.orderNo} 开启退单仲裁流程`);
                            }}
                            className="text-[#d9730d] cursor-pointer hover:underline font-sans text-[11px] font-medium"
                          >
                            申请退单仲裁
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Body (Controlled by Drawer mode or always visible in detailed/compact) */}
                    {isDrawerOpen && (
                      <>
                        {/* 异常风控预警横幅：骑手拒单 */}
                        {hasRejections && (
                          <div className="p-2.5 bg-[#fde8e8] border-b border-[#f8b4b4] text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-[#d44333]">
                              <span className="font-semibold flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-[#d44333]" />
                                <span>触发骑手拒单风控预警（已拒单 {order.rejectionCount || 1} 次）</span>
                              </span>
                              <span className="text-[10.5px] font-mono bg-red-100 px-1.5 py-0.2 rounded-[2px] font-medium">
                                系统已启动二次加权转派
                              </span>
                            </div>
                            <p className="text-[11px] text-[#5a5854]">
                              <strong>最后拒接事由：</strong>
                              {order.lastRejectionReason ||
                                '超出配送极限半径 (>5km)，已自动追加 +¥2.00 调度加急赏金重新广播周边骑手'}
                            </p>
                          </div>
                        )}

                        {/* 异常风控预警横幅：售后退款待仲裁 */}
                        {isRefundPending && (
                          <div className="p-3 bg-[#fef3d6] border-b border-[#fae2a0] text-xs space-y-2">
                            <div className="flex items-center justify-between text-[#37352f] font-semibold">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-[#d9730d]" />
                                <span>顾客发起售后退款申请（审核中）</span>
                              </span>
                              <span className="text-[10px] font-mono text-[#787774]">
                                申请时间: {order.refundAppliedAt || '刚刚'}
                              </span>
                            </div>
                            <div className="bg-white p-2 border border-[#fae2a0] rounded-[2px] text-[11px] space-y-1">
                              <div>
                                <span className="text-[#787774]">退单原因: </span>
                                <strong className="text-[#37352f]">
                                  {order.refundReason || '临时有事 / 行程变更'}
                                </strong>
                              </div>
                              {order.refundFeedback && (
                                <div>
                                  <span className="text-[#787774]">顾客说明: </span>
                                  <span className="italic text-[#5a5854]">"{order.refundFeedback}"</span>
                                </div>
                              )}
                            </div>

                            {/* Inline Arbitration Actions */}
                            <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <input
                                type="text"
                                value={refundRejectReasons[order.id] || ''}
                                onChange={(e) =>
                                  setRefundRejectReasons((prev) => ({
                                    ...prev,
                                    [order.id]: e.target.value
                                  }))
                                }
                                placeholder="驳回原因（如：餐品已入炉高温炙烤）"
                                className="flex-1 px-2.5 py-1 bg-white border border-[#fae2a0] text-xs rounded-[2px] outline-none text-[#37352f]"
                              />
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const reason =
                                      refundRejectReasons[order.id]?.trim() ||
                                      '餐品已下锅高温炙烤，无法中途取消';
                                    if (onAuditRefund) {
                                      onAuditRefund(order.id, false, reason);
                                    } else {
                                      onAdvanceOrderStatus(order.orderNo || order.id, 'cooking', {
                                        status: 'cooking',
                                        refundStatus: 'rejected',
                                        refundRejectReason: reason,
                                        statusText: '后厨现制中 (退款已驳回)'
                                      });
                                    }
                                    showToast(`工单 #${order.orderNo} 退款申请已驳回：${reason}`);
                                  }}
                                  className="px-2.5 py-1 bg-white hover:bg-[#fde8e8] text-[#d44333] border border-[#f8b4b4] text-xs font-semibold rounded-[2px] cursor-pointer shadow-2xs"
                                >
                                  驳回退单
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onAuditRefund) {
                                      onAuditRefund(order.id, true);
                                    } else {
                                      onAdvanceOrderStatus(order.orderNo || order.id, 'refunded', {
                                        status: 'refunded',
                                        refundStatus: 'approved',
                                        statusText: '已全额退款取消'
                                      });
                                    }
                                    showToast(`工单 #${order.orderNo} 退款审核已通过，款项原路退回！`);
                                  }}
                                  className="px-3 py-1 bg-[#2b593f] hover:bg-[#204430] text-white text-xs font-semibold rounded-[2px] cursor-pointer flex items-center gap-1 shadow-2xs"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>同意退单并原路退款</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. 餐品明细区域结构化升级 */}
                        <div className="p-3 sm:p-4">
                          <div className="border border-[#e6e6e4] bg-[#f7f7f5] rounded-[2px] overflow-hidden">
                            <div
                              onClick={() => toggleMealDetail(cardKey)}
                              className="px-3 py-2 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between cursor-pointer select-none"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-[#37352f] text-xs">
                                  菜品清单 (共{itemCount}品{totalQty}件)
                                </span>
                                {isDineIn ? (
                                  <span className="bg-[#edf6f1] text-[#2b593f] border border-[#cbe4d7] text-[10px] px-1.5 py-0.2 font-medium rounded-[2px]">
                                    现制热食
                                  </span>
                                ) : isPickup ? (
                                  <span className="bg-[#edf6f1] text-[#2b593f] border border-[#cbe4d7] text-[10px] px-1.5 py-0.2 font-medium rounded-[2px]">
                                    已封装保温袋
                                  </span>
                                ) : (
                                  <span className="bg-[#f0eef8] text-[#553c9a] border border-[#ded8f4] text-[10px] px-1.5 py-0.2 font-medium rounded-[2px]">
                                    专送铝箔温控箱
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 text-[#787774] text-[11px] font-mono">
                                <span>
                                  {isDineIn
                                    ? '上桌进度 0/3'
                                    : isPickup
                                    ? `入柜 ${order.pickupShelfCode || '8'} 分钟`
                                    : `预计 ${order.etaMinutes || 6} 分钟送达`}
                                </span>
                                <span className="text-[#787774]">
                                  {isMealOpen ? '▲ 收起' : '▼ 展开'}
                                </span>
                              </div>
                            </div>

                            {/* Expandable items table */}
                            {isMealOpen && (
                              <div className="p-3 bg-white">
                                <ul className="space-y-1.5 text-xs text-[#37352f] divide-y divide-dashed divide-[#efefed]">
                                  {order.items.map((it, itemIdx) => (
                                    <li
                                      key={itemIdx}
                                      className="flex justify-between items-center py-1 first:pt-0"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium text-[#37352f]">{it.name}</span>
                                        {it.options && (
                                          <span className="text-[#787774] text-[11px]">
                                            [{it.options}]
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-mono font-semibold text-[#37352f] text-xs">
                                        x{it.quantity}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* 4. 履约与地址信息 */}
                          <div className="mt-2.5 p-2.5 bg-[#f7f7f5] border border-[#e6e6e4] text-xs flex justify-between items-center rounded-[2px] flex-wrap gap-2">
                            <div>
                              <div className="text-[#787774] text-[11px]">
                                {isDineIn
                                  ? '就餐位置与人数:'
                                  : isPickup
                                  ? '自提柜机位置:'
                                  : '配送目的地:'}
                              </div>
                              <div className="font-semibold text-[#37352f] mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-[#d44333] shrink-0" />
                                <span>
                                  {isDineIn
                                    ? `餐车外摆区 · ${order.tableCode ? `${order.tableCode}号桌` : 'A2号桌'} (${order.dinerCount || 3}人入座)`
                                    : isPickup
                                    ? `${getUnifiedTruckName(order.truckId || 'truck-01', 'short')}自提点 (${order.truckLocation || '大悦城北广场侧面'})`
                                    : (order.deliveryAddress || '西藏北路 166 号大悦城商务座 1204 室')}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[#787774] text-[11px] block">
                                {isDineIn
                                  ? '后厨传菜状态'
                                  : isPickup
                                  ? '保温温控'
                                  : '承运专线骑手'}
                              </span>
                              <span className="font-mono font-medium text-xs text-[#37352f]">
                                {isDineIn
                                  ? (order.status === 'cooking' ? '等待首道菜品制作完成' : '出餐传菜陆续上桌')
                                  : isPickup
                                  ? '65°C 恒温锁鲜'
                                  : (order.courierName || '陈志远 138-1829-9201')}
                              </span>
                            </div>
                          </div>

                          {/* 权威防篡改流转存证 (Audit Trail Logs) */}
                          {order.auditLogs && order.auditLogs.length > 0 && (
                            <div className="mt-2.5 bg-[#f7f7f5] p-2 border border-[#e6e6e4] text-[11px] space-y-1 rounded-[2px]">
                              <span className="font-semibold text-[#5a5854] block">
                                🛡️ 权威防篡改流转存证:
                              </span>
                              <div className="space-y-0.5 max-h-20 overflow-y-auto font-mono text-[10.5px]">
                                {order.auditLogs.map((log, lIdx) => (
                                  <div key={lIdx} className="text-[#5a5854] flex items-center gap-2">
                                    <span className="text-[#787774]">{log.time}</span>
                                    <span className="font-semibold text-[#37352f]">[{log.operator}]</span>
                                    <span>{log.action}</span>
                                    {log.note && <span className="text-[#787774]">({log.note})</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    {/* 5. 结算与净额模块 */}
                    <div className="px-3.5 sm:px-4 py-2 bg-[#f7f7f5] border-t border-b border-[#e6e6e4] flex items-center justify-between text-xs">
                      <div className="text-[#787774] font-mono text-[11px]">
                        {isDineIn ? (
                          <span>堂食在线微信付 · 平台免佣 · 无配送费</span>
                        ) : isPickup ? (
                          <span>线上预结清 · 自提包装费 ¥0.00</span>
                        ) : (
                          <span>
                            专送配送费 ¥{(order.riderDeliveryFee || 6.0).toFixed(1)} · 平台服务费 ¥{(order.platformCommission || 4.5).toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-[#787774] text-[11px]">
                          {isDineIn ? '应收净额:' : '结算金额:'}
                        </span>
                        <span className="font-mono text-base sm:text-lg font-semibold text-[#37352f]">
                          ¥{order.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* 6. 工具箱与行动推进操作栏整合 */}
                    <div className="p-2.5 sm:p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      {/* 突发情况兜底工具箱按钮组 */}
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap">
                        {/* 气泡联络室 */}
                        <button
                          type="button"
                          onClick={() => setChatOrder(order)}
                          className="bg-[#37352f] hover:bg-[#201f1d] text-white p-1.5 border border-[#37352f] shrink-0 cursor-pointer rounded-[2px] shadow-2xs"
                          title="开启三端即时气泡联络室"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        </button>

                        {/* Button 1: 加码转派 */}
                        <button
                          type="button"
                          onClick={() => setActiveActionModal({ type: 're_dispatch_bonus', order })}
                          className="bg-[#fef3d6] text-[#d9730d] border border-[#fae2a0] hover:bg-[#fde8a8] px-2 py-1 text-xs font-medium shrink-0 cursor-pointer rounded-[2px] shadow-2xs"
                          title="追加调度赏金重新广播给周边骑手"
                        >
                          ⚡ 加码转派 (+¥3.0)
                        </button>

                        {/* Button 2: 主理人直送 */}
                        <button
                          type="button"
                          onClick={() => setActiveActionModal({ type: 'self_delivery', order })}
                          className="bg-[#edf6f1] text-[#2b593f] border border-[#cbe4d7] hover:bg-[#ddf0e5] px-2 py-1 text-xs font-medium shrink-0 cursor-pointer rounded-[2px] shadow-2xs"
                          title="餐车主理人亲自接管配送"
                        >
                          🏠 主理人直送
                        </button>

                        {/* Button 3: 转自提退运费 */}
                        <button
                          type="button"
                          onClick={() => setActiveActionModal({ type: 'turn_pickup', order })}
                          className="bg-[#ebf3fc] text-[#1c5598] border border-[#d2e4f8] hover:bg-[#d8ebff] px-2 py-1 text-xs font-medium shrink-0 cursor-pointer rounded-[2px] shadow-2xs"
                          title="与顾客协商转为现场自提并退配送费"
                        >
                          💧 转自提退运费
                        </button>

                        {/* Button 4: 烤焦重做/延误 */}
                        <button
                          type="button"
                          onClick={() => setActiveActionModal({ type: 'remake_delay', order })}
                          className="bg-[#f4effa] text-[#6b46c1] border border-[#e2d5f8] hover:bg-[#ebe1f8] px-2 py-1 text-xs font-medium shrink-0 cursor-pointer rounded-[2px] shadow-2xs"
                          title="后厨烤焦重做或延误报备"
                        >
                          🔄 烤焦重做/延误
                        </button>

                        {/* Button 5: 存证妥投归档 */}
                        <button
                          type="button"
                          onClick={() => setActiveActionModal({ type: 'force_deliver_photo', order })}
                          className="bg-[#f7f7f5] text-[#5a5854] border border-[#e6e6e4] hover:bg-[#efefed] px-2 py-1 text-xs font-medium shrink-0 cursor-pointer rounded-[2px] shadow-2xs"
                          title="核验证照拍照妥投存证归档"
                        >
                          🛡️ 存证妥投归档
                        </button>
                      </div>

                      {/* 权威推进动作按钮 */}
                      <div className="shrink-0">
                        {isPendingAccept && (
                          <button
                            type="button"
                            onClick={() => {
                              onAdvanceOrderStatus(order.orderNo || order.id, 'cooking', {
                                merchantAccepted: true,
                                stepIndex: 1,
                                status: 'cooking',
                                statusText: '后厨现制制作中',
                                progressPercent: 35
                              });
                              showToast(`已接单 #${order.orderNo}，工单已流转至制作环节！`);
                            }}
                            className="w-full sm:w-auto bg-[#d9730d] hover:bg-[#b06000] text-white font-semibold px-4 py-1.5 text-xs transition-colors flex items-center justify-center space-x-1.5 rounded-[2px] cursor-pointer shadow-2xs"
                          >
                            <span>权威接单 (进入制作)</span>
                          </button>
                        )}

                        {isCooking && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isDineIn) {
                                onAdvanceOrderStatus(order.orderNo || order.id, 'delivering', {
                                  status: 'delivering',
                                  stepIndex: 3,
                                  statusText: '堂食陆续出餐上桌中',
                                  progressPercent: 75
                                });
                                showToast(`工单 #${order.orderNo} 制作完毕，传菜上桌中！`);
                              } else {
                                onAdvanceOrderStatus(order.orderNo || order.id, 'ready', {
                                  status: 'ready',
                                  stepIndex: 2,
                                  statusText: isPickup ? '餐品已入保温柜待取' : '出餐完毕，待骑手取餐',
                                  progressPercent: 60
                                });
                                showToast(`工单 #${order.orderNo} 已出餐，待骑手/顾客取餐！`);
                              }
                            }}
                            className="w-full sm:w-auto bg-[#d9730d] hover:bg-[#b06000] text-white font-semibold px-4 py-1.5 text-xs transition-colors flex items-center justify-center space-x-1.5 rounded-[2px] cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                          >
                            <span>
                              {isDineIn ? '制作完成 · 传菜上桌' : '出餐完毕 (推进至待取)'}
                            </span>
                          </button>
                        )}

                        {isReady && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isPickup) {
                                onAdvanceOrderStatus(order.orderNo || order.id, 'completed', {
                                  status: 'completed',
                                  stepIndex: 4,
                                  progressPercent: 100,
                                  statusText: '顾客现场自提核销完成'
                                });
                                showToast(`工单 #${order.orderNo} 顾客自提核销完毕，已闭环！`);
                              } else {
                                onAdvanceOrderStatus(order.orderNo || order.id, 'delivering', {
                                  status: 'delivering',
                                  stepIndex: 3,
                                  statusText: '骑手已取餐，专线极速配送中',
                                  progressPercent: 80
                                });
                                showToast(`工单 #${order.orderNo} 推进至【专送配送中】！`);
                              }
                            }}
                            className="w-full sm:w-auto bg-[#37352f] hover:bg-[#201f1d] text-white font-semibold px-4 py-1.5 text-xs transition-colors flex items-center justify-center space-x-1.5 rounded-[2px] cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                          >
                            <span>
                              {isPickup ? '确认已取 (流转终态)' : '确认已取餐 (推进至配送)'}
                            </span>
                          </button>
                        )}

                        {isDelivering && (
                          <button
                            type="button"
                            onClick={() => {
                              onAdvanceOrderStatus(order.orderNo || order.id, 'completed', {
                                status: 'completed',
                                stepIndex: 4,
                                progressPercent: 100,
                                statusText: isDineIn ? '堂食结账翻台完成' : '餐品已妥投送达完成'
                              });
                              showToast(`工单 #${order.orderNo} 推进至【已完成】终态！`);
                            }}
                            className="w-full sm:w-auto bg-[#2b593f] hover:bg-[#204430] text-white font-semibold px-4 py-1.5 text-xs transition-colors flex items-center justify-center space-x-1.5 rounded-[2px] cursor-pointer shadow-2xs"
                          >
                            <span>
                              {isDineIn ? '结账翻台 (推进至终态)' : '完成妥投 (推进至终态)'}
                            </span>
                          </button>
                        )}

                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[#2b593f] font-semibold px-3 py-1.5 text-xs bg-[#edf6f1] border border-[#cbe4d7] rounded-[2px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>已妥投交付完成</span>
                          </span>
                        )}

                        {isRefunded && (
                          <span className="inline-flex items-center gap-1 text-[#787774] font-medium px-3 py-1.5 text-xs bg-[#f7f7f5] border border-[#e6e6e4] rounded-[2px]">
                            <span>已退款关闭</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
        {/* END: OrdersGrid */}
      </main>
      {/* END: MainContent */}

      {/* ========================================================================= */}
      {/* BEGIN: MainFooter                                                         */}
      {/* ========================================================================= */}
      <footer className="bg-white border-t border-[#e6e6e4] px-4 py-3 text-xs text-[#787774] mt-8">
        <div className="max-w-[2000px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-[#2b593f] inline-block rounded-full"></span>
            <span className="font-medium text-[#37352f]">状态机实时双向握手正常</span>
            <span>· 全链路风控守护中</span>
          </div>
          <div className="font-mono text-[11px] text-[#787774]">
            SECURITY LEVEL: HIGH | CLUSTER-ID: SHA-CORE-09 | LATENCY: 14ms
          </div>
        </div>
      </footer>
      {/* END: MainFooter */}

      {/* ========================================================================= */}
      {/* Action Fallback Dialog Modals (突发异常兜底措施审批弹窗)                  */}
      {/* ========================================================================= */}
      {activeActionModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white text-[#37352f] w-full max-w-md border border-[#e6e6e4] shadow-xl p-4 space-y-3.5 rounded-[4px]">
            <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-2">
              <span className="font-semibold text-sm text-[#37352f] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#d44333]" />
                <span>突发异常兜底措施审批</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="text-[#787774] hover:text-[#37352f] cursor-pointer p-1 rounded-[2px]"
              >
                ✕
              </button>
            </div>

            {/* Type Specific Form Inputs */}
            {activeActionModal.type === 're_dispatch_bonus' && (
              <div className="space-y-2.5 text-xs">
                <p className="text-[#5a5854]">
                  当前工单 <strong>#{activeActionModal.order.orderNo}</strong> 遭遇骑手拒单或暂无接单。追加调度补贴可极速激活周边高意愿骑手。
                </p>
                <div className="space-y-1">
                  <span className="font-medium text-[#37352f]">加码平台调度赏金:</span>
                  <div className="flex items-center gap-2">
                    {[2.0, 3.0, 5.0, 8.0].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setBonusAmount(amt)}
                        className={`px-3 py-1 border font-semibold rounded-[2px] cursor-pointer transition-colors shadow-2xs ${
                          bonusAmount === amt
                            ? 'bg-[#37352f] text-white border-[#37352f]'
                            : 'bg-[#f7f7f5] text-[#37352f] border-[#e6e6e4] hover:bg-[#efefed]'
                        }`}
                      >
                        +¥{amt.toFixed(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-2 bg-[#ebf3fc] border border-[#d2e4f8] text-[11px] text-[#1c5598] rounded-[2px]">
                  💡 审批确认后，工单将带加权标签重新推送到骑手抢单池第一顺位。
                </div>
              </div>
            )}

            {activeActionModal.type === 'self_delivery' && (
              <div className="space-y-2 text-xs">
                <p className="text-[#5a5854]">
                  确认启动 <strong>【餐车主理人专属自送】</strong> 模式？系统将把承运骑手变更为餐车车长，直接将状态推进至配送中。
                </p>
                <div className="p-2 bg-[#edf6f1] border border-[#cbe4d7] text-[11px] text-[#2b593f] rounded-[2px]">
                  ⚡ 适用场景：周边 1km 内高端大单、或运力极端紧张时保障客户体验。
                </div>
              </div>
            )}

            {activeActionModal.type === 'turn_pickup' && (
              <div className="space-y-2 text-xs">
                <p className="text-[#5a5854]">
                  确认将外卖订单 <strong>#{activeActionModal.order.orderNo}</strong> 协商转为 <strong>【到车自提】</strong>？
                </p>
                <p className="text-[11px] text-[#787774]">
                  系统将自动退还配送费与包装费（¥6.00），餐品移入餐车恒温取餐格，并向顾客发送取餐码。
                </p>
              </div>
            )}

            {activeActionModal.type === 'remake_delay' && (
              <div className="space-y-2 text-xs">
                <span className="font-medium text-[#37352f]">重做与延误说明 (将同步后厨与顾客):</span>
                <input
                  type="text"
                  value={remakeReason}
                  onChange={(e) => setRemakeReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#f7f7f5] border border-[#e6e6e4] text-xs focus:bg-white focus:border-[#37352f] outline-none rounded-[2px]"
                />
                <p className="text-[11px] text-[#787774]">
                  将自动为预计送达时间顺延 8 分钟，并向顾客赠送 500 积分以提升满意度。
                </p>
              </div>
            )}

            {activeActionModal.type === 'force_deliver_photo' && (
              <div className="space-y-2 text-xs">
                <p className="text-[#5a5854]">
                  已核验骑手送达照片/写字楼前台存证。确认执行安全妥投，结束配送并将订单推进至【已送达完成】终态？
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e6e6e4]">
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="px-3 py-1.5 border border-[#e6e6e4] text-xs font-medium text-[#37352f] hover:bg-[#f7f7f5] rounded-[2px] cursor-pointer shadow-2xs"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeActionModal.type === 're_dispatch_bonus')
                    handleExecuteReDispatchBonus(activeActionModal.order);
                  if (activeActionModal.type === 'self_delivery')
                    handleExecuteMerchantSelfDelivery(activeActionModal.order);
                  if (activeActionModal.type === 'turn_pickup')
                    handleExecuteTurnToPickup(activeActionModal.order);
                  if (activeActionModal.type === 'remake_delay')
                    handleExecuteRemakeDelay(activeActionModal.order);
                  if (activeActionModal.type === 'force_deliver_photo')
                    handleExecuteForceDeliverPhoto(activeActionModal.order);
                }}
                className="px-4 py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white text-xs font-semibold shadow-2xs cursor-pointer rounded-[2px]"
              >
                确认执行兜底
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Fuse Modal (紧急熔断控制中枢) */}
      {isEmergencyFuseOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white text-[#37352f] w-full max-w-md border border-[#e6e6e4] shadow-xl p-4 space-y-3.5 rounded-[4px]">
            <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-2">
              <span className="font-semibold text-sm text-[#37352f] flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#d9730d]" />
                <span>全链路紧急熔断中枢</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEmergencyFuseOpen(false)}
                className="text-[#787774] hover:text-[#37352f] cursor-pointer p-1 rounded-[2px]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <p className="text-[#5a5854] leading-relaxed">
                紧急熔断用于应对突发暴雨恶劣天气、周边运力极度短缺或后厨设备检修等极端突发状况。触发后将暂停外部自动派单流转并开启兜底排队防护。
              </p>

              <div className="space-y-1">
                <span className="font-medium text-[#37352f]">熔断触发事由说明:</span>
                <input
                  type="text"
                  value={fuseReason}
                  onChange={(e) => setFuseReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#f7f7f5] border border-[#e6e6e4] text-xs focus:bg-white focus:border-[#37352f] outline-none rounded-[2px]"
                />
              </div>

              <div
                className={`p-2.5 border text-xs rounded-[2px] ${
                  fuseActive
                    ? 'bg-[#fef3d6] border-[#fae2a0] text-[#d9730d]'
                    : 'bg-[#f7f7f5] border-[#e6e6e4] text-[#37352f]'
                }`}
              >
                <div className="font-semibold">
                  当前熔断状态: {fuseActive ? '⚡ 正在生效中 (限流保护)' : '🟢 常态就绪 (未熔断)'}
                </div>
                <p className="text-[11px] mt-1 text-[#5a5854]">
                  {fuseActive
                    ? '全链路已启动降级防护，点击下方按钮可随时解除熔断并恢复正常吞吐。'
                    : '点击下方按钮将立即启动熔断，通知在途骑手与食客并阻断卡单风险。'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e6e6e4]">
              <button
                type="button"
                onClick={() => setIsEmergencyFuseOpen(false)}
                className="px-3 py-1.5 border border-[#e6e6e4] text-xs font-medium text-[#37352f] hover:bg-[#f7f7f5] rounded-[2px] cursor-pointer shadow-2xs"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={handleToggleEmergencyFuse}
                className={`px-4 py-1.5 text-xs font-semibold text-white shadow-2xs cursor-pointer rounded-[2px] ${
                  fuseActive ? 'bg-[#2b593f] hover:bg-[#204430]' : 'bg-[#d44333] hover:bg-[#b03024]'
                }`}
              >
                {fuseActive ? '解除紧急熔断' : '确认触发紧急熔断'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Omni Chat Modal (三端气泡即时联络室) */}
      {chatOrder && (
        <UnifiedOmniChatModal
          isOpen={true}
          order={chatOrder}
          viewerRole="merchant"
          onClose={() => setChatOrder(null)}
          onAdvanceOrderStatus={onAdvanceOrderStatus}
          onAuditRefund={onAuditRefund}
          showToast={showToast}
        />
      )}
    </div>
  );
};
