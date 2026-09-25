import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SynergyChatRoomView } from './SynergyChatRoomView';
import { FleetGroupChatRoomView } from './FleetGroupChatRoomView';
import { WeChatMessageSessionsView } from './WeChatMessageSessionsView';
import { Order, DishItem } from '../../types';
import { INITIAL_ORDERS } from '../../data/mockData';
import {
  getActiveTruckConfig,
  getAllTruckConfigs,
  TruckLocationConfig
} from '../../utils/truckLocationEngine';
import {
  sendOrderChatMessage,
  getOrderChatMessages,
  getUnreadCountForRole,
  subscribeOrderChat
} from '../../utils/chatHub';
import {
  getGroupChatUnreadCount,
  subscribeGroupChat,
  GroupChannelType
} from '../../utils/truckGroupChatEngine';
import { safeVibrate } from '../../utils/haptics';
import { getCurrentBoundTable } from '../../utils/tableStorage';
import { useTableSessionUi } from '../table/useTableSessionUi';
import { getMemberAvatar } from '../../utils/tableAvatarHelper';
import {
  Truck,
  ArrowLeft,
  Phone,
  PhoneCall,
  Clock,
  Thermometer,
  CheckCheck,
  Check,
  Bike,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Activity,
  Navigation,
  ShieldCheck,
  X,
  MapPin,
  UtensilsCrossed,
  MoreVertical,
  Radio,
  LayoutGrid,
  Zap,
  Flame,
  Users,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Shuffle,
  Send,
  MessageSquare,
  ArrowUpDown,
  Building2,
  Store
} from 'lucide-react';

export type SynergyRoomMode = 'order' | 'truck_community' | 'fleet_dispatch';

export interface TruckSynergyRoomPageViewProps {
  orders?: Order[];
  dishes?: DishItem[];
  viewerRole?: 'user' | 'rider' | 'merchant' | 'platform' | 'customer';
  onBackToMenu?: () => void;
  onTrackOrder?: (orderId: string) => void;
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onRejectOrder?: (orderId: string, reason: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  showToast?: (title: string, desc?: string) => void;
  diningMode?: string;
  onSwitchTable?: () => void;
  initialRoomMode?: SynergyRoomMode;
  initialCommunityTruckId?: string;
  onSubViewModeChange?: (mode: 'session_list' | 'chat_room') => void;
}

export type SynergyWidgetTab = 'telemetry' | 'order' | 'quick_actions' | 'table';

/**
 * TruckSynergyRoomPageView - 餐车智联多群协同中枢
 * ============================================================================
 * 支持三大独立信道与数据严格隔离：
 * 1. 【⚡ 订单专线 (Active Order Chat)】: 针对具体订单的三端（食客/骑手/餐车）履约协同
 * 2. 【🍔 餐车老饕群 (Truck Foodie Group)】: 独立餐车站台老饕粉丝群，现烤秒杀、限定尝鲜互动
 * 3. 【📻 车队调度群 (Fleet Command Hub)】: 01/02/03/04多餐车跨车原料调拨、泊位联动、对讲指挥
 * ============================================================================
 */
export const TruckSynergyRoomPageView: React.FC<TruckSynergyRoomPageViewProps> = ({
  orders = [],
  dishes = [],
  viewerRole = 'user',
  onBackToMenu,
  onTrackOrder,
  showToast,
  diningMode = 'delivery',
  onSwitchTable,
  initialRoomMode,
  initialCommunityTruckId,
  onSubViewModeChange
}) => {
  const allTrucks = useMemo(() => getAllTruckConfigs(), []);
  const [activeTruck, setActiveTruck] = useState<TruckLocationConfig>(() => getActiveTruckConfig());
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [activeChannel, setActiveChannel] = useState<'all' | 'rider' | 'merchant'>('all');
  const [showChannelDropdown, setShowChannelDropdown] = useState<boolean>(false);
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [showSessionSwitcher, setShowSessionSwitcher] = useState<boolean>(false);
  const [cascadeSelectedTruckId, setCascadeSelectedTruckId] = useState<string>(() => activeTruck?.id || 'truck-01');
  const [cascadePreviewOrderId, setCascadePreviewOrderId] = useState<string>('');
  const [quickSendBusy, setQuickSendBusy] = useState<string | null>(null);

  // 当前主信道模式：订单专线 vs 餐车老饕群 vs 车队调度大群
  const [synergyRoomMode, setSynergyRoomMode] = useState<SynergyRoomMode>(() => {
    if (initialRoomMode) return initialRoomMode;
    try {
      const stored = sessionStorage.getItem('obsidian_synergy_room_mode') as SynergyRoomMode | null;
      if (stored && ['order', 'truck_community', 'fleet_dispatch'].includes(stored)) {
        return stored;
      }
    } catch {}
    return 'order';
  });

  // 核心子界面切换模式：'session_list' (微信样式会话总览) vs 'chat_room' (聊天室子界面)
  const [subViewMode, setSubViewMode] = useState<'session_list' | 'chat_room'>(() => {
    return initialRoomMode ? 'chat_room' : 'session_list';
  });

  // 外部 initialRoomMode 监听：未指定时严格锁定为消息主入口 (session_list)
  useEffect(() => {
    if (initialRoomMode) {
      setSynergyRoomMode(initialRoomMode);
      setSubViewMode('chat_room');
    } else {
      setSubViewMode('session_list');
    }
  }, [initialRoomMode]);

  // 同步当前子界面模式至父容器（用于全屏沉浸接管与隐藏底部通用导航条）
  useEffect(() => {
    onSubViewModeChange?.(subViewMode);
  }, [subViewMode, onSubViewModeChange]);

  // 打开具体订单专线
  const handleOpenOrderChat = (orderNo: string) => {
    safeVibrate(15);
    setSelectedOrderId(orderNo);
    setSynergyRoomMode('order');
    setSubViewMode('chat_room');
  };

  // 打开餐车老饕群
  const handleOpenCommunityChat = (truckId: string) => {
    safeVibrate(15);
    setSelectedCommunityTruckId(truckId);
    setSynergyRoomMode('truck_community');
    setSubViewMode('chat_room');
  };

  // 打开车队调度群
  const handleOpenFleetChat = () => {
    safeVibrate(15);
    setSynergyRoomMode('fleet_dispatch');
    setSubViewMode('chat_room');
  };

  // 当前选中的餐车老饕群 channelId
  const [selectedCommunityTruckId, setSelectedCommunityTruckId] = useState<string>(() => {
    if (initialCommunityTruckId) return initialCommunityTruckId;
    return activeTruck?.id || 'truck-01';
  });

  // 各信道未读消息数实时感知
  const [orderUnreadCount, setOrderUnreadCount] = useState<number>(0);
  const [communityUnreadCount, setCommunityUnreadCount] = useState<number>(0);
  const [fleetUnreadCount, setFleetUnreadCount] = useState<number>(0);

  // 顶栏智联小物件折叠状态
  const [isWidgetExpanded, setIsWidgetExpanded] = useState<boolean>(() => {
    try {
      const stored = sessionStorage.getItem('obsidian_synergy_widget_expanded');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const [activeWidgetTab, setActiveWidgetTab] = useState<SynergyWidgetTab>(() => {
    try {
      const storedTab = sessionStorage.getItem('obsidian_synergy_widget_tab') as SynergyWidgetTab | null;
      if (storedTab && ['telemetry', 'order', 'quick_actions', 'table'].includes(storedTab)) {
        return storedTab;
      }
    } catch {}
    return diningMode === 'dine_in' ? 'table' : 'telemetry';
  });

  const handleToggleWidget = () => {
    safeVibrate(15);
    setIsWidgetExpanded((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem('obsidian_synergy_widget_expanded', String(next));
      } catch {}
      return next;
    });
  };

  const handleSelectWidgetTab = (tab: SynergyWidgetTab) => {
    safeVibrate(10);
    setActiveWidgetTab(tab);
    try {
      sessionStorage.setItem('obsidian_synergy_widget_tab', tab);
    } catch {}
  };

  const handleSelectRoomMode = (mode: SynergyRoomMode) => {
    safeVibrate(15);
    setSynergyRoomMode(mode);
    try {
      sessionStorage.setItem('obsidian_synergy_room_mode', mode);
    } catch {}
  };

  // 桌台协同信息
  const { activeSession } = useTableSessionUi();
  const currentBoundTable = useMemo(() => getCurrentBoundTable(), []);
  const activeTableCode = (activeSession?.tableCode || currentBoundTable?.code || 'A1').toUpperCase();
  const activeParticipants = useMemo(() => {
    if (!activeSession || !activeSession.participants) return [];
    return activeSession.participants.filter((p) => !p.removedAt);
  }, [activeSession]);

  const tableTotalCartItems = useMemo(() => {
    return activeParticipants.reduce((sum, p) => sum + (p.cartSummary?.itemCount || 0), 0);
  }, [activeParticipants]);

  const tableTotalCartAmount = useMemo(() => {
    return activeParticipants.reduce((sum, p) => sum + (p.cartSummary?.totalAmount || 0), 0);
  }, [activeParticipants]);

  // 同步餐车配置
  useEffect(() => {
    const truck = getActiveTruckConfig();
    if (truck) {
      setActiveTruck(truck);
      if (!initialCommunityTruckId) {
        setSelectedCommunityTruckId(truck.id);
      }
    }
  }, [initialCommunityTruckId]);

  // 当前关联的可选订单列表（保证总有可供三段式呈现的真实/拟真订单）
  const activeOrders = useMemo(() => {
    if (orders && orders.length > 0) return orders;
    return INITIAL_ORDERS;
  }, [orders]);

  // 当前选中的订单
  const matchedOrder = useMemo(() => {
    if (selectedOrderId) {
      const found = activeOrders.find((o) => o.orderNo === selectedOrderId || o.id === selectedOrderId);
      if (found) return found;
    }
    return activeOrders[0] || null;
  }, [activeOrders, selectedOrderId]);

  const activeOrderNo = useMemo(() => {
    return matchedOrder ? (matchedOrder.orderNo || matchedOrder.id || 'UR-9821').replace(/^#/, '') : 'UR-9821';
  }, [matchedOrder]);

  // 当前级联预览的订单详情
  const activePreviewOrder = useMemo(() => {
    const targetId = cascadePreviewOrderId || selectedOrderId || activeOrderNo;
    const found = activeOrders.find((o) => (o.orderNo || o.id || '').replace(/^#/, '') === targetId.replace(/^#/, ''));
    return found || matchedOrder;
  }, [activeOrders, cascadePreviewOrderId, selectedOrderId, activeOrderNo, matchedOrder]);

  const orderTotal = useMemo(() => {
    if (matchedOrder?.totalAmount) return Number(matchedOrder.totalAmount).toFixed(1);
    return '186.0';
  }, [matchedOrder]);

  // 监听订单专线未读消息
  useEffect(() => {
    const roleKey = viewerRole === 'merchant' ? 'merchant' : viewerRole === 'rider' ? 'rider' : 'user';
    setOrderUnreadCount(getUnreadCountForRole(activeOrderNo, roleKey));

    const unsub = subscribeOrderChat(activeOrderNo, () => {
      setOrderUnreadCount(getUnreadCountForRole(activeOrderNo, roleKey));
    });
    return () => unsub();
  }, [activeOrderNo, viewerRole]);

  // 监听餐车老饕群未读消息
  useEffect(() => {
    setCommunityUnreadCount(getGroupChatUnreadCount('truck_community', selectedCommunityTruckId));
    const unsub = subscribeGroupChat('truck_community', selectedCommunityTruckId, () => {
      setCommunityUnreadCount(getGroupChatUnreadCount('truck_community', selectedCommunityTruckId));
    });
    return () => unsub();
  }, [selectedCommunityTruckId]);

  // 监听车队调度群未读消息
  useEffect(() => {
    setFleetUnreadCount(getGroupChatUnreadCount('fleet_dispatch', 'fleet-command'));
    const unsub = subscribeGroupChat('fleet_dispatch', 'fleet-command', () => {
      setFleetUnreadCount(getGroupChatUnreadCount('fleet_dispatch', 'fleet-command'));
    });
    return () => unsub();
  }, []);

  const handleToggleCall = () => {
    safeVibrate(20);
    setIsCallActive((prev) => !prev);
    if (!isCallActive && showToast) {
      showToast('正在直连餐车专属热线', `${activeTruck.name || '流动餐车'} · 主理人通话仿真已接通`);
    }
  };

  const handleMarkAllRead = () => {
    safeVibrate(15);
    setShowSessionSwitcher(false);
    setOrderUnreadCount(0);
    setCommunityUnreadCount(0);
    setFleetUnreadCount(0);
    if (showToast) {
      showToast('全部标记已读', '当前协同会话未读计数已清空');
    }
  };

  const handleQuoteDishInChat = (dishName: string) => {
    safeVibrate(15);
    try {
      sendOrderChatMessage(activeOrderNo, {
        type: 'text',
        senderRole: viewerRole === 'merchant' ? 'merchant' : viewerRole === 'rider' ? 'rider' : 'user',
        senderName: viewerRole === 'merchant' ? '流动餐车·主理人' : viewerRole === 'rider' ? '专送骑手' : '食客（你）',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
        text: `【餐品进度咨询】请问订单中的「${dishName}」目前制作进度如何？`
      });
      if (showToast) {
        showToast('已向餐车发送进度咨询', dishName);
      }
    } catch {}
  };

  const handleSendQuickAction = (actionText: string, actionId: string) => {
    setQuickSendBusy(actionId);
    safeVibrate(15);
    try {
      sendOrderChatMessage(activeOrderNo, {
        type: 'text',
        senderRole: viewerRole === 'merchant' ? 'merchant' : viewerRole === 'rider' ? 'rider' : 'user',
        senderName: viewerRole === 'merchant' ? '流动餐车·主理人' : viewerRole === 'rider' ? '专送骑手' : '食客（你）',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
        text: `【餐车快捷协同·${actionText}】来自食客桌台协同消息：${actionText}，当前绑定餐车：${activeTruck.name || '01号餐车'}`
      });
      if (showToast) {
        showToast('已向餐车发送互动通知', actionText);
      }
    } catch {
    } finally {
      setTimeout(() => setQuickSendBusy(null), 500);
    }
  };

  const isDineIn = diningMode === 'dine_in' || !!activeSession;

  // 当前老饕群对应的餐车配置
  const communityTruckConfig = useMemo(() => {
    return allTrucks.find((t) => t.id === selectedCommunityTruckId) || activeTruck;
  }, [allTrucks, selectedCommunityTruckId, activeTruck]);

  // 若处于会话总览模式，渲染类似微信聊天的入口三段式表单
  if (subViewMode === 'session_list') {
    return (
      <WeChatMessageSessionsView
        orders={activeOrders}
        allTrucks={allTrucks}
        activeTruck={activeTruck}
        viewerRole={viewerRole}
        onOpenOrderChat={handleOpenOrderChat}
        onOpenCommunityChat={handleOpenCommunityChat}
        onOpenFleetChat={handleOpenFleetChat}
        onTrackOrder={onTrackOrder}
        onBackToMenu={onBackToMenu}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-white flex flex-col transition-colors select-none overflow-hidden font-sans">
      {/* =========================================================================
          顶部主标题栏 (44px 紧凑收拢 Header)：
          收拢为：[返回键] + [会话主标题胶囊(带下拉切换)] ──── [一键电话] + [智联看板]
          彻底解决多按钮堆叠、碎片化与文字省略号问题
          ========================================================================= */}
      <header className="shrink-0 h-11 bg-white/95 backdrop-blur-xl border-b border-neutral-200/80 px-2.5 sm:px-4 flex items-center justify-between z-30 select-none shadow-xs">
        {/* 左侧：返回会话列表键 + 会话主标识交互胶囊 */}
        <div className="flex items-center space-x-2 min-w-0">
          <button
            type="button"
            id="synergy-room-back-btn"
            onClick={() => {
              safeVibrate(15);
              setSubViewMode('session_list');
            }}
            className="h-7 px-2 rounded-lg hover:bg-neutral-100/90 active:bg-neutral-200/80 text-neutral-800 flex items-center gap-1 transition cursor-pointer shrink-0 shadow-2xs border border-neutral-200/80"
            title="返回消息会话列表"
            aria-label="返回消息会话列表"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2.2]" />
            <span className="text-xs font-bold hidden xs:inline">消息列表</span>
          </button>

          {/* 会话主标题交互胶囊：轻触即弹出快速切换菜单 */}
          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() => {
                safeVibrate(15);
                setShowSessionSwitcher(!showSessionSwitcher);
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg backdrop-blur-xs text-neutral-900 transition cursor-pointer min-w-0 border shadow-2xs group ${
                showSessionSwitcher
                  ? 'bg-neutral-200/90 border-neutral-300 ring-1 ring-black/5'
                  : 'bg-neutral-100/80 hover:bg-neutral-100/95 border-neutral-200/80 hover:border-neutral-300'
              }`}
              title="点击切换关联订单或餐车站台"
              aria-expanded={showSessionSwitcher}
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  synergyRoomMode === 'order'
                    ? 'bg-emerald-500 animate-pulse'
                    : synergyRoomMode === 'truck_community'
                    ? 'bg-teal-500 animate-pulse'
                    : 'bg-amber-500 animate-pulse'
                }`}
              />

              {/* 模式专属标题 */}
              <span className="font-bold text-xs sm:text-sm text-neutral-900 tracking-tight truncate max-w-[130px] xs:max-w-[200px] sm:max-w-[260px]">
                {synergyRoomMode === 'order'
                  ? `订单 #${activeOrderNo.slice(-4)}`
                  : synergyRoomMode === 'truck_community'
                  ? `${communityTruckConfig.name.replace('流动餐车', '')} · 老饕群`
                  : '车队指挥调度群'}
              </span>

              {/* 辅助状态徽标 */}
              {synergyRoomMode === 'order' ? (
                isDineIn ? (
                  <span className="text-[10px] font-bold text-orange-800 bg-orange-500/10 px-1.5 py-0.5 rounded-md border border-orange-300/40 shrink-0">
                    {activeTableCode}桌
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-neutral-700 bg-white/90 px-1.5 py-0.5 rounded-md border border-neutral-200/90 shrink-0 shadow-3xs">
                    ¥{orderTotal}
                  </span>
                )
              ) : synergyRoomMode === 'truck_community' ? (
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-300/40 shrink-0 hidden xs:inline">
                  384人
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-300/40 shrink-0 hidden xs:inline">
                  4车联调
                </span>
              )}

              <ChevronDown
                className={`w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 transition-transform duration-200 shrink-0 ${
                  showSessionSwitcher ? 'rotate-180 text-neutral-900' : ''
                }`}
              />
            </button>

            {/* 会话与订单树状级联选择器 (Tree-Cascading Popover Selector - 3 Columns) */}
            {showSessionSwitcher && (
              <div className="absolute left-0 mt-1.5 w-[335px] xs:w-[490px] sm:w-[560px] max-w-[94vw] bg-white/95 backdrop-blur-xl border border-neutral-200/90 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs overflow-hidden">
                {/* 顶部标题与说明 */}
                <div className="px-3.5 pb-2 border-b border-neutral-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-neutral-400">树状三级级联协同选择器</div>
                    <div className="text-xs font-bold text-neutral-900 mt-0.5">
                      餐车站台 ➔ 订单 / 工具 ➔ 订单商品清单
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSessionSwitcher(false)}
                    className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 三列树状级联主体 */}
                <div className="grid grid-cols-12 min-h-[240px] max-h-[290px] border-b border-neutral-100">
                  {/* 第一级：餐车列 (占 3 列) */}
                  <div className="col-span-4 xs:col-span-3 border-r border-neutral-100/90 bg-neutral-50/70 p-1.5 space-y-1 overflow-y-auto">
                    <div className="px-1.5 py-1 text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider">
                      1. 餐车站台
                    </div>
                    {allTrucks.map((trk) => {
                      const isSelected = trk.id === cascadeSelectedTruckId;
                      const isCurrentTruck = trk.id === activeTruck.id;
                      return (
                        <button
                          key={trk.id}
                          type="button"
                          onClick={() => {
                            safeVibrate(10);
                            setCascadeSelectedTruckId(trk.id);
                          }}
                          className={`w-full text-left p-1.5 xs:p-2 rounded-xl flex items-center justify-between cursor-pointer transition text-xs select-none ${
                            isSelected
                              ? 'bg-white shadow-xs font-bold text-neutral-900 border border-neutral-200/80 ring-1 ring-black/5'
                              : 'hover:bg-neutral-200/50 text-neutral-600'
                          }`}
                        >
                          <div className="min-w-0 pr-1">
                            <div className="truncate font-bold leading-tight text-[11px] xs:text-xs">
                              {trk.name.replace('黑曜石', '').replace('流动餐车', '').trim() || trk.name}
                            </div>
                            <div className="text-[9px] text-neutral-400 truncate mt-0.5">
                              {trk.locationName.split('·')[0] || trk.locationName}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {isCurrentTruck && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="当前驻点" />
                            )}
                            <ChevronRight className={`w-3 h-3 transition-colors ${isSelected ? 'text-neutral-900' : 'text-neutral-300'}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* 第二级：对应订单列、社群、车队 (占 4 列) */}
                  <div className="col-span-8 xs:col-span-4 border-r border-neutral-100/90 p-2 overflow-y-auto space-y-2 bg-white">
                    {/* A. 对应餐车的关联订单 */}
                    <div>
                      <div className="px-1 text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>2. 协同订单</span>
                        <span className="text-[9px] font-normal text-neutral-400">
                          {allTrucks.find((t) => t.id === cascadeSelectedTruckId)?.name.slice(0, 5)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {activeOrders.length > 0 ? (
                          activeOrders.slice(0, 4).map((ord) => {
                            const no = (ord.orderNo || ord.id).replace(/^#/, '');
                            const isCurrentOrder = synergyRoomMode === 'order' && no === activeOrderNo;
                            const isPreviewSelected = (activePreviewOrder?.orderNo || activePreviewOrder?.id || '').replace(/^#/, '') === no;
                            return (
                              <button
                                key={ord.id || ord.orderNo}
                                type="button"
                                onClick={() => {
                                  setCascadePreviewOrderId(no);
                                  setSelectedOrderId(ord.orderNo || ord.id);
                                  handleSelectRoomMode('order');
                                  const targetTruck = allTrucks.find((t) => t.id === cascadeSelectedTruckId);
                                  if (targetTruck) setActiveTruck(targetTruck);
                                  safeVibrate(15);
                                }}
                                className={`w-full text-left px-2 py-1.5 rounded-xl flex items-center justify-between cursor-pointer transition text-xs ${
                                  isPreviewSelected || isCurrentOrder
                                    ? 'bg-neutral-900 text-white font-bold shadow-2xs'
                                    : 'hover:bg-neutral-100 text-neutral-800 border border-neutral-100'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate min-w-0">
                                  <Zap className={`w-3 h-3 shrink-0 ${isPreviewSelected || isCurrentOrder ? 'text-amber-400' : 'text-amber-500'}`} />
                                  <span className="font-semibold truncate">#{no.slice(-4)}</span>
                                  <span className="text-[10px] opacity-75">¥{Number(ord.totalAmount || 0).toFixed(1)}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isCurrentOrder && (
                                    <span className="text-[9px] font-bold text-emerald-300">当前</span>
                                  )}
                                  <ChevronRight className={`w-3 h-3 ${isPreviewSelected || isCurrentOrder ? 'text-white/60' : 'text-neutral-300'}`} />
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="text-[11px] text-neutral-400 italic px-2 py-1">暂无履约中订单</div>
                        )}
                      </div>
                    </div>

                    {/* B & C: 老饕社群与跨车调度 (纯图标式横排展示) */}
                    <div className="pt-2 border-t border-neutral-100">
                      <div className="px-1 text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                        协同通道与工具
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* 1. 老饕社群图标按钮 */}
                        {(() => {
                          const targetTruck = allTrucks.find((t) => t.id === cascadeSelectedTruckId) || activeTruck;
                          const isCurrentCommunity = synergyRoomMode === 'truck_community' && selectedCommunityTruckId === cascadeSelectedTruckId;
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCommunityTruckId(cascadeSelectedTruckId);
                                setActiveTruck(targetTruck);
                                handleSelectRoomMode('truck_community');
                                safeVibrate(15);
                              }}
                              className={`flex-1 py-1.5 px-1 rounded-xl flex items-center justify-center relative cursor-pointer transition border ${
                                isCurrentCommunity
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                  : 'bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200/80'
                              }`}
                              title={`${targetTruck.name.slice(-4)} · 老饕社群`}
                            >
                              <Users className="w-4 h-4 shrink-0" />
                              {isCurrentCommunity && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-200" />
                              )}
                            </button>
                          );
                        })()}

                        {/* 2. 车队调度图标按钮 */}
                        {(() => {
                          const isCurrentFleet = synergyRoomMode === 'fleet_dispatch';
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectRoomMode('fleet_dispatch');
                                safeVibrate(15);
                              }}
                              className={`flex-1 py-1.5 px-1 rounded-xl flex items-center justify-center relative cursor-pointer transition border ${
                                isCurrentFleet
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                                  : 'bg-amber-50/80 hover:bg-amber-100/80 text-amber-700 border-amber-200/80'
                              }`}
                              title="黑曜石车队指挥调度群"
                            >
                              <Radio className="w-4 h-4 shrink-0" />
                              {isCurrentFleet && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-200" />
                              )}
                            </button>
                          );
                        })()}

                        {/* 3. 雷达实时追踪图标按钮 */}
                        {onTrackOrder && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowSessionSwitcher(false);
                              onTrackOrder(activeOrderNo);
                              safeVibrate(15);
                            }}
                            className="flex-1 py-1.5 px-1 rounded-xl flex items-center justify-center cursor-pointer transition border bg-blue-50/80 hover:bg-blue-100/80 text-blue-700 border-blue-200/80"
                            title="雷达实时全景追踪"
                          >
                            <Navigation className="w-4 h-4 shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 第三级：订单详情商品列表 (占 5 列，小屏下若展开则平滑展示) */}
                  <div className="hidden xs:block xs:col-span-5 p-2 overflow-y-auto bg-neutral-50/50">
                    <div className="px-1 text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>3. 订单商品列表</span>
                      {activePreviewOrder && (
                        <span className="text-[9.5px] font-bold text-neutral-700">
                          #{((activePreviewOrder.orderNo || activePreviewOrder.id || '').replace(/^#/, '')).slice(-4)}
                        </span>
                      )}
                    </div>

                    {activePreviewOrder ? (
                      <div className="space-y-1.5">
                        {/* 订单元信息摘要 */}
                        <div className="bg-white p-2 rounded-xl border border-neutral-100 shadow-3xs flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 text-neutral-600">
                            <ShoppingBag className="w-3.5 h-3.5 text-neutral-400" />
                            <span>共 {activePreviewOrder.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0} 件餐品</span>
                          </div>
                          <span className="font-bold text-neutral-900">
                            ¥{Number(activePreviewOrder.totalAmount || 0).toFixed(1)}
                          </span>
                        </div>

                        {/* 商品明细列表 */}
                        <div className="space-y-1">
                          {activePreviewOrder.items && activePreviewOrder.items.length > 0 ? (
                            activePreviewOrder.items.map((it, idx) => (
                              <div
                                key={it.dishId || `${it.name}-${idx}`}
                                className="bg-white p-1.5 rounded-lg border border-neutral-100 text-[10.5px] flex items-center justify-between hover:bg-neutral-50/80 transition"
                              >
                                <div className="min-w-0 pr-1">
                                  <div className="font-semibold text-neutral-800 truncate">{it.name}</div>
                                  {(it.options || it.variantName) && (
                                    <div className="text-[9px] text-neutral-400 truncate">
                                      {[it.variantName, it.options].filter(Boolean).join(' · ')}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-bold text-neutral-900">×{it.quantity || 1}</div>
                                  <div className="text-[9.5px] text-neutral-500">¥{Number(it.price || 0).toFixed(1)}</div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="bg-white p-2 rounded-lg text-center text-neutral-400 italic text-[11px]">
                              暂无菜品明细
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-neutral-400 py-6 text-center">
                        <ShoppingBag className="w-6 h-6 stroke-[1.5] mb-1.5 text-neutral-300" />
                        <span className="text-[11px]">请在第二列选择订单</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 底部快捷动作栏 */}
                <div className="pt-2 px-3 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="px-2 py-1 rounded-lg hover:bg-neutral-100 flex items-center gap-1.5 text-neutral-600 font-medium cursor-pointer transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>全部已读</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSessionSwitcher(false)}
                    className="px-2 py-1 rounded-lg bg-neutral-900 text-white font-medium cursor-pointer transition hover:bg-neutral-800 shadow-2xs"
                  >
                    <span>确定进入</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：高度收拢为仅 2 个核心按键 (电话直连 + 智联看板) */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* 按键 1: 电话呼叫 */}
          <button
            type="button"
            onClick={handleToggleCall}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition cursor-pointer shadow-xs hover:shadow-sm ${
              isCallActive
                ? 'bg-rose-500 border-rose-600 text-white animate-pulse'
                : 'bg-emerald-50/90 border-emerald-200/90 hover:bg-emerald-100/90 text-emerald-700 backdrop-blur-xs'
            }`}
            title={isCallActive ? '挂断通话' : '一键直连餐车主理人与骑手'}
            aria-label="一键电话通话"
          >
            {isCallActive ? <PhoneCall className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
          </button>

          {/* 按键 2: 智联中枢综合看板 (整合原本的小物件、订单金额与更多菜单) */}
          <button
            type="button"
            id="toggle-synergy-widget-btn"
            onClick={handleToggleWidget}
            className={`h-7 px-2.5 rounded-lg border flex items-center gap-1.5 transition-all duration-150 cursor-pointer select-none shadow-2xs ${
              isWidgetExpanded
                ? 'bg-amber-50 text-amber-900 border-amber-300 ring-1.5 ring-amber-500/15 font-bold'
                : 'bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-800 border-neutral-200/90 font-medium'
            }`}
            title={isWidgetExpanded ? '点击折叠协同看板' : '展开餐车遥测、关联订单与快捷面板'}
            aria-expanded={isWidgetExpanded}
          >
            <LayoutGrid className={`w-3.5 h-3.5 ${isWidgetExpanded ? 'text-amber-600' : 'text-neutral-600'}`} />
            <span className="text-[11px]">看板</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${
                isWidgetExpanded ? 'rotate-180 text-amber-600' : 'text-neutral-400'
              }`}
            />
          </button>
        </div>
      </header>

      {/* =========================================================================
          ⭐ 核心小物件看板 (Synergy Precision Widget)：可折叠/展开的智联中枢面板
          ========================================================================= */}
      <AnimatePresence>
        {isWidgetExpanded && (
          <motion.section
            id="synergy-top-widget"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="shrink-0 w-full bg-linear-to-b from-white via-[#FCFCFB] to-neutral-50 border-b border-neutral-200/90 shadow-sm overflow-hidden z-25 select-none"
          >
            <div className="max-w-4xl mx-auto p-2.5 sm:p-3.5 space-y-2.5">
              {/* 小物件内部 Tab 切换导航 + 右侧折叠手柄 */}
              <div className="flex items-center justify-between gap-1.5 flex-nowrap border-b border-neutral-200/90 pb-0">
                <nav className="flex items-center gap-1 sm:gap-3 overflow-x-auto scrollbar-none -mb-px" aria-label="协同看板选项卡">
                  <button
                    type="button"
                    onClick={() => handleSelectWidgetTab('telemetry')}
                    className={`h-8 px-2 sm:px-2.5 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap border-b-2 -mb-px transition-all select-none ${
                      activeWidgetTab === 'telemetry'
                        ? 'border-emerald-600 text-emerald-800 font-bold'
                        : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 font-medium'
                    }`}
                  >
                    <Truck className={`w-3.5 h-3.5 ${activeWidgetTab === 'telemetry' ? 'text-emerald-600' : 'text-neutral-400'}`} />
                    <span>餐车遥测</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectWidgetTab('order')}
                    className={`h-8 px-2 sm:px-2.5 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap border-b-2 -mb-px transition-all select-none ${
                      activeWidgetTab === 'order'
                        ? 'border-amber-600 text-amber-800 font-bold'
                        : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 font-medium'
                    }`}
                  >
                    <UtensilsCrossed className={`w-3.5 h-3.5 ${activeWidgetTab === 'order' ? 'text-amber-600' : 'text-neutral-400'}`} />
                    <span>关联订单 (#{activeOrderNo.slice(-4)})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectWidgetTab('quick_actions')}
                    className={`h-8 px-2 sm:px-2.5 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap border-b-2 -mb-px transition-all select-none ${
                      activeWidgetTab === 'quick_actions'
                        ? 'border-amber-500 text-amber-700 font-bold'
                        : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 font-medium'
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 ${activeWidgetTab === 'quick_actions' ? 'text-amber-500' : 'text-neutral-400'}`} />
                    <span>快捷交互</span>
                  </button>

                  {isDineIn && (
                    <button
                      type="button"
                      onClick={() => handleSelectWidgetTab('table')}
                      className={`h-8 px-2 sm:px-2.5 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap border-b-2 -mb-px transition-all select-none ${
                        activeWidgetTab === 'table'
                          ? 'border-orange-500 text-orange-700 font-bold'
                          : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 font-medium'
                      }`}
                    >
                      <Users className={`w-3.5 h-3.5 ${activeWidgetTab === 'table' ? 'text-orange-500' : 'text-neutral-400'}`} />
                      <span>堂食同桌 ({activeTableCode}桌)</span>
                      {tableTotalCartItems > 0 && (
                        <span className="ml-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300/60 tabular-nums">
                          {tableTotalCartItems}件
                        </span>
                      )}
                    </button>
                  )}
                </nav>

                {/* 显式折叠按钮 */}
                <button
                  type="button"
                  onClick={handleToggleWidget}
                  className="h-7 px-2 mb-1 rounded-lg text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200/80 transition flex items-center gap-1 shrink-0 cursor-pointer shadow-3xs"
                  title="折叠收起小物件"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="hidden xs:inline">收起</span>
                </button>
              </div>

              {/* Tab 1: 餐车遥测 */}
              {activeWidgetTab === 'telemetry' && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-white border border-neutral-200/80 shadow-2xs">
                      <div className="flex items-center gap-1 text-neutral-400 text-[10px] mb-1 font-medium">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>当前驻泊点</span>
                      </div>
                      <span className="font-bold text-neutral-900 block truncate">{activeTruck.locationName}</span>
                      <span className="text-[10px] font-medium text-neutral-500">距您约 350m · 沪A·TRK01</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-neutral-200/80 shadow-2xs">
                      <div className="flex items-center gap-1 text-neutral-400 text-[10px] mb-1 font-medium">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>排队出餐</span>
                      </div>
                      <span className="font-bold text-amber-900">3 份等待制作</span>
                      <span className="text-[10px] font-semibold text-emerald-700 block">预计 6-8 分钟送达</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-neutral-200/80 shadow-2xs">
                      <div className="flex items-center gap-1 text-neutral-400 text-[10px] mb-1 font-medium">
                        <Thermometer className="w-3 h-3 text-rose-500" />
                        <span>冷链温控</span>
                      </div>
                      <span className="font-bold text-neutral-900">-18℃~72℃ 正常</span>
                      <span className="text-[10px] text-emerald-600 font-semibold block">后厨恒温保鲜中</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-neutral-200/80 shadow-2xs">
                      <div className="flex items-center gap-1 text-neutral-400 text-[10px] mb-1 font-medium">
                        <Activity className="w-3 h-3 text-blue-500" />
                        <span>GPS 遥测信标</span>
                      </div>
                      <span className="font-bold text-neutral-900">延迟 &lt; 20ms</span>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        双频定位在线
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-neutral-100/60 rounded-xl px-2.5 py-1.5 text-xs text-neutral-600 border border-neutral-200/60 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium text-neutral-800">主理人: 周站长 (已认证)</span>
                      <span className="text-[10.5px] font-medium text-neutral-500">电池剩余 84% · 续航 160km</span>
                    </div>
                    {onTrackOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          safeVibrate(15);
                          onTrackOrder(activeOrderNo);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>打开雷达地图追踪</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: 关联订单 */}
              {activeWidgetTab === 'order' && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs px-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 text-xs">#{activeOrderNo}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        {matchedOrder?.status === 'cooking' ? '制作中' : matchedOrder?.status === 'delivering' ? '专送中' : '协同履约中'}
                      </span>
                      <span className="font-extrabold text-neutral-900">¥{Number(matchedOrder?.totalAmount || 186).toFixed(2)}</span>
                    </div>
                    <span className="text-[11px] text-neutral-500 font-medium">
                      预计 {matchedOrder?.etaMinutes || 6} 分钟送达
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto scrollbar-none pr-0.5">
                    {(matchedOrder?.items && matchedOrder.items.length > 0 ? matchedOrder.items : [
                      { name: '极夜炭烤和牛堡', quantity: 1, price: 58 },
                      { name: '西西里风味炸鸡块', quantity: 1, price: 32 },
                      { name: '极夜西西里气泡水', quantity: 2, price: 18 }
                    ]).map((item: any, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => handleQuoteDishInChat(item.name)}
                        className="p-2 rounded-xl bg-white hover:bg-emerald-50/70 border border-neutral-200/80 hover:border-emerald-300 flex items-center justify-between transition cursor-pointer shadow-2xs group"
                        title="点击直接向餐车咨询出餐进度"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <UtensilsCrossed className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-600 shrink-0" />
                          <span className="font-bold text-neutral-800 text-xs truncate">{item.name}</span>
                          <span className="text-neutral-500 font-medium text-[11px]">x{item.quantity}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-bold text-neutral-900 text-xs">¥{Number(item.price || 0).toFixed(2)}</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shadow-3xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            咨询
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: 快捷交互 */}
              {activeWidgetTab === 'quick_actions' && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>轻触卡片，一键向餐车发送高频协同指令：</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'urge', label: '催单加急', text: '请问当前订单备餐还需要多久？已在等候区', icon: Flame, color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100' },
                      { id: 'spicy', label: '口味加辣/少辣', text: '餐品请多放黑椒浓汁，尽量少辣，谢谢餐车师傅！', icon: SlidersHorizontal, color: 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100' },
                      { id: 'pickup', label: '到达餐车站台', text: '我已到达餐车旁，请问在哪个取餐窗口？', icon: CheckCheck, color: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100' },
                      { id: 'paper', label: '需要餐具纸巾', text: '需要多备一份一次性环保餐具与消毒湿巾', icon: UtensilsCrossed, color: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' }
                    ].map((act) => {
                      const Icon = act.icon;
                      return (
                        <button
                          key={act.id}
                          type="button"
                          disabled={quickSendBusy === act.id}
                          onClick={() => handleSendQuickAction(act.text, act.id)}
                          className={`p-2 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer active:scale-97 shadow-2xs ${act.color} disabled:opacity-50`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs">{act.label}</span>
                            <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                          </div>
                          <span className="text-[10px] opacity-75 line-clamp-1 truncate">{act.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 4: 堂食协同 */}
              {isDineIn && activeWidgetTab === 'table' && (
                <div className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-200/90 text-xs space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-neutral-900 text-sm">
                        {activeTableCode} 号桌
                      </span>
                      <span className="text-xs font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {activeParticipants.length || 1} 人在席
                      </span>
                      <span className="text-xs font-bold text-neutral-700">
                        整桌已选: {tableTotalCartItems} 件 · ¥{tableTotalCartAmount.toFixed(2)}
                      </span>
                    </div>

                    {onSwitchTable && (
                      <button
                        type="button"
                        onClick={onSwitchTable}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-orange-100 text-orange-900 font-bold border border-orange-200 transition flex items-center gap-1 cursor-pointer shadow-3xs"
                      >
                        <Shuffle className="w-3 h-3" />
                        <span>换桌/加桌</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-orange-200/50">
                    <span className="text-[11px] text-orange-900/80 font-medium">同桌点餐成员：</span>
                    <div className="flex -space-x-1.5 items-center">
                      {(activeParticipants.length > 0 ? activeParticipants : [{ participantId: 'me', displayName: '食客' }]).map((m, idx) => (
                        <img
                          key={m.participantId}
                          src={getMemberAvatar(m.participantId, idx)}
                          alt={m.displayName}
                          className="w-6 h-6 rounded-full object-cover border-2 border-white shadow-2xs"
                          title={m.displayName}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 看板底部综合操作条：收拢全部已读、雷达追踪、收起看板 */}
              <div className="pt-2 border-t border-neutral-200/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>全部已读</span>
                  </button>

                  {onTrackOrder && (
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleWidget();
                        onTrackOrder(activeOrderNo);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200/80 text-blue-700 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>雷达实时追踪</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleToggleWidget}
                  className="px-2.5 py-1 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>收起看板</span>
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* =========================================================================
          ⭐ 核心导航第二排：协同信道与右对齐下拉菜单按钮
          ========================================================================= */}
      {synergyRoomMode === 'order' && (
        <div className="shrink-0 h-9 bg-neutral-50/90 backdrop-blur-md border-b border-neutral-200/70 px-3 sm:px-4 flex items-center justify-between z-20 select-none shadow-3xs">
          {/* 左侧：协同信道标签 */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-semibold shrink-0">
            <Radio className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2]" />
            <span>协同信道</span>
          </div>

          {/* 右侧：下拉菜单按钮（右对齐） */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowChannelDropdown(!showChannelDropdown)}
              className="h-8 px-2.5 rounded-lg bg-white hover:bg-neutral-50 active:bg-neutral-100 border border-neutral-200/90 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 shadow-3xs cursor-pointer transition select-none"
              title="切换消息过滤信道"
            >
              <span className="text-neutral-500 text-[11px]">发送范围:</span>
              <div className="flex items-center gap-1">
                {activeChannel === 'all' ? (
                  <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : activeChannel === 'rider' ? (
                  <Bike className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                ) : (
                  <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                )}
                <span className={`font-bold ${
                  activeChannel === 'all'
                    ? 'text-emerald-700'
                    : activeChannel === 'rider'
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}>
                  {activeChannel === 'all' ? '全员 (3人)' : activeChannel === 'rider' ? '专线骑手' : '餐车后厨'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${showChannelDropdown ? 'rotate-180 text-neutral-800' : ''}`} />
            </button>

            {/* 下拉菜单面板 */}
            {showChannelDropdown && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white/95 backdrop-blur-xl rounded-xl border border-neutral-200/90 shadow-xl py-1.5 px-1 z-40 animate-in fade-in zoom-in-95 duration-100 text-xs">
                <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400">选择消息发送与展示范围</div>
                <div className="space-y-0.5 mt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChannel('all');
                      setShowChannelDropdown(false);
                      safeVibrate(15);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                      activeChannel === 'all'
                        ? 'bg-emerald-50/90 text-emerald-950 font-bold border border-emerald-200/80 shadow-3xs'
                        : 'hover:bg-neutral-50 text-neutral-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-emerald-100/80 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <span className="text-xs">全员 (3人)</span>
                    </div>
                    {activeChannel === 'all' && (
                      <span className="inline-flex items-center gap-0.5 text-[10.5px] text-emerald-700 font-bold px-1.5 py-0.2 rounded-full bg-emerald-100/90 leading-none shrink-0">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                        <span>当前</span>
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveChannel('rider');
                      setShowChannelDropdown(false);
                      safeVibrate(15);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                      activeChannel === 'rider'
                        ? 'bg-amber-50/90 text-amber-950 font-bold border border-amber-200/80 shadow-3xs'
                        : 'hover:bg-neutral-50 text-neutral-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-amber-100/80 flex items-center justify-center shrink-0">
                        <Bike className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      </div>
                      <span className="text-xs">专线骑手</span>
                    </div>
                    {activeChannel === 'rider' && (
                      <span className="inline-flex items-center gap-0.5 text-[10.5px] text-amber-700 font-bold px-1.5 py-0.2 rounded-full bg-amber-100/90 leading-none shrink-0">
                        <Check className="w-3 h-3 text-amber-600 stroke-[2.5]" />
                        <span>当前</span>
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveChannel('merchant');
                      setShowChannelDropdown(false);
                      safeVibrate(15);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                      activeChannel === 'merchant'
                        ? 'bg-rose-50/90 text-rose-950 font-bold border border-rose-200/80 shadow-3xs'
                        : 'hover:bg-neutral-50 text-neutral-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-rose-100/80 flex items-center justify-center shrink-0">
                        <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      </div>
                      <span className="text-xs">餐车后厨</span>
                    </div>
                    {activeChannel === 'merchant' && (
                      <span className="inline-flex items-center gap-0.5 text-[10.5px] text-rose-700 font-bold px-1.5 py-0.2 rounded-full bg-rose-100/90 leading-none shrink-0">
                        <Check className="w-3 h-3 text-rose-600 stroke-[2.5]" />
                        <span>当前</span>
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          沉浸式消息流：按选中的信道模式严格隔离渲染（全屏展示，杜绝 max-w-4xl 左右留空）
          ========================================================================= */}
      <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-white">
        {synergyRoomMode === 'order' ? (
          <SynergyChatRoomView
            order={matchedOrder}
            orderNo={activeOrderNo}
            embedded={true}
            hideHeader={true}
            activeChannel={activeChannel}
            onChannelChange={setActiveChannel}
            isCallActive={isCallActive}
            onToggleCall={handleToggleCall}
            onBack={() => setSubViewMode('session_list')}
            onOpenStore={onBackToMenu}
            showToast={showToast}
            viewerRole={viewerRole === 'customer' ? 'user' : (viewerRole || 'user')}
          />
        ) : synergyRoomMode === 'truck_community' ? (
          <FleetGroupChatRoomView
            channelType="truck_community"
            channelId={selectedCommunityTruckId}
            currentTruck={communityTruckConfig}
            viewerRole={viewerRole === 'customer' ? 'user' : (viewerRole || 'user')}
            showToast={showToast}
            onSwitchTruck={(trkId) => setSelectedCommunityTruckId(trkId)}
          />
        ) : (
          <FleetGroupChatRoomView
            channelType="fleet_dispatch"
            channelId="fleet-command"
            currentTruck={activeTruck}
            viewerRole={viewerRole === 'customer' ? 'user' : (viewerRole || 'user')}
            showToast={showToast}
          />
        )}
      </main>
    </div>
  );
};

export default TruckSynergyRoomPageView;
