import React, { useState, useEffect, useMemo } from 'react';
import {
  DynamicFeedsPageView
} from './DynamicFeedsPageView';
import { SynergyChatRoomView } from './SynergyChatRoomView';
import { Order, DishItem } from '../../types';
import {
  getActiveTruckConfig,
  getAllTruckConfigs,
  TruckLocationConfig
} from '../../utils/truckLocationEngine';
import { sendOrderChatMessage } from '../../utils/chatHub';
import {
  Truck,
  ArrowLeft,
  Radio,
  Clock,
  Thermometer,
  ShieldCheck,
  CheckCheck,
  Send,
  SlidersHorizontal,
  Zap,
  UtensilsCrossed,
  MessageSquare,
  Flame,
  Coffee,
  BellRing,
  CheckCircle2,
  Navigation,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';

export interface OrderHistoryMessagesViewProps {
  orders: Order[];
  dishes?: DishItem[];
  viewerRole?: 'user' | 'rider' | 'merchant' | 'platform' | 'customer';
  onBackToMenu?: () => void;
  onTrackOrder?: (orderId: string) => void;
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onRejectOrder?: (orderId: string, reason: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  showToast?: (title: string, desc?: string) => void;
}

export type MainTabType = 'chatroom' | 'feeds';
export type MessageCategory = 'all' | 'truck' | 'order' | 'system';

/**
 * OrderHistoryMessagesView
 * 店铺消息与互动中心（沉浸式全屏页面 · 保留底部全局导航）
 * 真实餐车数据联动：驻点 GPS、车载温控/后厨状态、出餐排队广播、一键催单/备注/自提直连
 */
export const OrderHistoryMessagesView: React.FC<OrderHistoryMessagesViewProps> = (props) => {
  const [activeSubView, setActiveSubView] = useState<MainTabType>('chatroom');
  const [activeCategory, setActiveCategory] = useState<MessageCategory>('all');
  const [hasMarkedAllRead, setHasMarkedAllRead] = useState<boolean>(false);
  const [activeTruck, setActiveTruck] = useState<TruckLocationConfig>(() => getActiveTruckConfig());
  const [quickSendBusy, setQuickSendBusy] = useState<string | null>(null);
  const [isWidgetExpanded, setIsWidgetExpanded] = useState<boolean>(false);

  // 定期同步实时餐车信息
  useEffect(() => {
    const truck = getActiveTruckConfig();
    if (truck) setActiveTruck(truck);
  }, []);

  const matchedOrder = useMemo(() => {
    if (!props.orders || props.orders.length === 0) return undefined;
    return props.orders.find((o) => o.orderNo === 'UR-9821' || o.id === 'UR-9821') || props.orders[0];
  }, [props.orders]);

  const activeOrderNo = matchedOrder?.orderNo || 'UR-9821';

  // 快捷向餐车发送催单/备注/自提确认互动记录
  const handleSendQuickAction = (actionText: string, actionType: string) => {
    setQuickSendBusy(actionType);
    try {
      sendOrderChatMessage(activeOrderNo, {
        type: 'text',
        senderRole: props.viewerRole === 'merchant' ? 'merchant' : props.viewerRole === 'rider' ? 'rider' : 'user',
        senderName: props.viewerRole === 'merchant' ? '流动餐车·主理人' : props.viewerRole === 'rider' ? '专送骑手' : '食客（你）',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
        text: `【餐车交互·${actionText}】来自食客桌台协同消息：${actionText}，当前绑定餐车：${activeTruck.name}`
      });
      if (props.showToast) {
        props.showToast('已向餐车发送互动通知', actionText);
      }
    } catch {
      // safe fallback
    } finally {
      setTimeout(() => setQuickSendBusy(null), 600);
    }
  };

  const handleMarkAllRead = () => {
    setHasMarkedAllRead(true);
    if (props.showToast) {
      props.showToast('已标记全量消息为已读', '餐车通知与互动提醒已清空');
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F7F7F6] flex flex-col pb-24 transition-colors">
      {/* 顶部专业全屏标题栏 */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs">
        <div className="max-w-4xl mx-auto px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <button
              type="button"
              onClick={props.onBackToMenu}
              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
              title="返回点单菜单"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.4]" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className="text-[15px] font-extrabold text-neutral-900 tracking-tight flex items-center gap-1.5 truncate">
                  <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>店铺消息与餐车互动</span>
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  三端直连中
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                实时对接 {activeTruck.name || '流动餐车'} · GPS 极速协同
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={handleMarkAllRead}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center space-x-1 transition-all cursor-pointer ${
                hasMarkedAllRead
                  ? 'bg-neutral-100 text-neutral-400'
                  : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 shadow-2xs'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">全部已读</span>
            </button>
          </div>
        </div>

        {/* 实时餐车站台数据小组件 (Food Truck Live Telemetry Widget) */}
        <div className="max-w-4xl mx-auto px-3 sm:px-3.5 pb-2" id="truck-live-status-widget">
          <div className="rounded-2xl bg-white/95 backdrop-blur-md text-neutral-900 shadow-2xs border border-neutral-200/90 transition-all duration-200 overflow-hidden hover:border-neutral-300">
            {/* 小组件紧凑主栏 */}
            <div className="px-3 py-2 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
              {/* 左侧：餐车图标徽标 + 车牌与站台名 */}
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 shrink-0 relative">
                  <Truck className="w-3.5 h-3.5" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white animate-pulse" />
                </div>
                <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-neutral-900 text-xs truncate">
                    {activeTruck.name || '黑曜石 01 号流动餐车'}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-md bg-neutral-100 text-neutral-600 text-[10px] font-mono border border-neutral-200/80 shrink-0">
                    {(activeTruck as any).licensePlate || '沪A·TRK01'}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono hidden md:flex items-center gap-0.5 shrink-0 font-medium">
                    <Navigation className="w-2.5 h-2.5 text-emerald-600" />
                    {activeTruck.latitude ? `${activeTruck.latitude.toFixed(4)}, ${activeTruck.longitude.toFixed(4)}` : '静安大悦城'}
                  </span>
                </div>
              </div>

              {/* 右侧：出餐广播小组件胶囊 + 展开/折叠控件 */}
              <div className="flex items-center space-x-1.5 ml-auto shrink-0">
                <div className="px-2 py-0.5 rounded-full bg-amber-50/90 border border-amber-200/80 text-[10.5px] text-amber-950 flex items-center space-x-1.5 shadow-2xs font-medium">
                  <Radio className="w-3 h-3 text-amber-600 animate-pulse shrink-0" />
                  <span>排队 <strong className="text-amber-950 font-mono font-bold">3</strong> 份 · 约 <strong className="text-emerald-700 font-mono font-bold">6-8</strong> 分</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWidgetExpanded(!isWidgetExpanded)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 text-[10.5px] font-medium transition cursor-pointer"
                  title={isWidgetExpanded ? '收起小组件详情' : '展开小组件详情'}
                  aria-expanded={isWidgetExpanded}
                >
                  <span className="hidden xs:inline">{isWidgetExpanded ? '收起' : '组件详情'}</span>
                  {isWidgetExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-neutral-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                  )}
                </button>
              </div>
            </div>

            {/* 小组件展开态：便携 Bento 子卡片网格 */}
            {isWidgetExpanded && (
              <div className="px-3 pb-2.5 pt-1 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] animate-in fade-in duration-150">
                {/* 传感器子卡 1：温控 */}
                <div className="p-2 rounded-xl bg-neutral-50/90 border border-neutral-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Thermometer className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-sans">后厨冷链保鲜</span>
                      <span className="font-mono font-semibold text-neutral-800 text-[11px]">-18℃~72℃ 正常</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/60">
                    实时监控
                  </span>
                </div>

                {/* 传感器子卡 2：主理人 */}
                <div className="p-2 rounded-xl bg-neutral-50/90 border border-neutral-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-sans">站台主理人</span>
                      <span className="font-semibold text-neutral-800 text-[11px]">周站长</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/60">
                    已认证
                  </span>
                </div>

                {/* 传感器子卡 3：GPS与网络 */}
                <div className="p-2 rounded-xl bg-neutral-50/90 border border-neutral-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-sans">GPS 专网直连</span>
                      <span className="font-mono font-semibold text-neutral-800 text-[11px]">延迟 &lt; 20ms</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/60 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    在线
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 快捷催单/加辣/自提确认互动胶囊栏 */}
        <div className="max-w-4xl mx-auto px-3.5 pb-2.5 overflow-x-auto flex items-center space-x-2 scrollbar-none">
          <span className="text-[11px] text-neutral-500 font-medium shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-neutral-600 stroke-[1.5]" />
            快速联络：
          </span>
          {[
            { id: 'urge', label: '催单加急', text: '请问当前订单备餐还需要多久？已在等候区', icon: Flame },
            { id: 'spicy', label: '备注加辣/调味', text: '餐品请多放黑椒浓汁，尽量少辣，谢谢餐车师傅！', icon: SlidersHorizontal },
            { id: 'pickup', label: '到达餐车站台', text: '我已到达餐车旁，请问在哪个取餐窗口？', icon: CheckCircle2 },
            { id: 'paper', label: '纸巾餐具加料', text: '需要多备一份一次性环保餐具与消毒湿巾', icon: UtensilsCrossed }
          ].map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => handleSendQuickAction(act.text, act.id)}
                disabled={quickSendBusy === act.id}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-white hover:bg-neutral-50 active:scale-95 border border-neutral-200/90 text-neutral-800 shadow-2xs flex items-center space-x-1 whitespace-nowrap transition cursor-pointer disabled:opacity-50"
              >
                <Icon className="w-3 h-3 text-neutral-700 stroke-[1.5]" />
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>

        {/* 视图切换分栏导航 */}
        <div className="max-w-4xl mx-auto px-3.5 flex items-center space-x-6 text-xs border-t border-neutral-100">
          <button
            type="button"
            onClick={() => setActiveSubView('chatroom')}
            className={`py-2.5 relative font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              activeSubView === 'chatroom'
                ? 'text-neutral-950'
                : 'text-neutral-500 hover:text-neutral-800 font-medium'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>餐车专属联络室 (#{activeOrderNo})</span>
            {activeSubView === 'chatroom' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-neutral-900 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('feeds')}
            className={`py-2.5 relative font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              activeSubView === 'feeds'
                ? 'text-neutral-950'
                : 'text-neutral-500 hover:text-neutral-800 font-medium'
            }`}
          >
            <BellRing className="w-3.5 h-3.5 text-amber-600" />
            <span>全域互动动态流</span>
            {activeSubView === 'feeds' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-neutral-900 rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* 主视图内容呈现区 */}
      <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col">
        {activeSubView === 'chatroom' ? (
          <div className="bg-white shadow-xs rounded-b-2xl border-x border-b border-neutral-200/80 overflow-hidden flex flex-col flex-1 h-[calc(100vh-220px)] min-h-[560px]">
            <SynergyChatRoomView
              order={matchedOrder}
              orderNo={activeOrderNo}
              embedded={true}
              onBack={() => setActiveSubView('feeds')}
              onOpenStore={props.onBackToMenu}
              showToast={props.showToast}
              viewerRole={props.viewerRole === 'customer' ? 'user' : (props.viewerRole || 'user')}
            />
          </div>
        ) : (
          <div className="bg-white shadow-xs border-x border-neutral-200/60 pb-12">
            <DynamicFeedsPageView
              {...props}
              embedded={true}
              onTrackOrder={(orderId) => {
                if (orderId === 'UR-9821' || orderId.includes('9821')) {
                  setActiveSubView('chatroom');
                } else if (props.onTrackOrder) {
                  props.onTrackOrder(orderId);
                }
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default OrderHistoryMessagesView;

