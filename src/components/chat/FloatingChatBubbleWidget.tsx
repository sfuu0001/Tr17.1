import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  MessageSquareText,
  Bike,
  Store,
  User,
  X,
  ChevronUp,
  Send,
  Radio,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Timer,
  GripVertical
} from 'lucide-react';
import { Order } from '../../types';
import {
  ChatMessageItem,
  ChatRole,
  getOrderChatMessages,
  getLatestChatMessage,
  getUnreadCountForRole,
  markOrderChatAsRead,
  subscribeOrderChat,
  sendOrderChatMessage,
  calculateChatSLAResponse,
  formatExactTime,
  formatRelativeTime
} from '../../utils/chatHub';
import { UnifiedOmniChatModal } from './UnifiedOmniChatModal';
import { fallbackToast } from '../../utils/fallbackToast';

export interface FloatingChatBubbleWidgetProps {
  role: 'user' | 'rider' | 'merchant' | 'platform';
  orders: Order[];
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onAcceptOrder?: (orderId: string) => void;
  onRejectOrder?: (orderId: string, reason: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  showToast?: (msg: string) => void;
  defaultOrderId?: string;
  onOpenAggregatedHub?: () => void;
}

export const FloatingChatBubbleWidget: React.FC<FloatingChatBubbleWidgetProps> = ({
  role,
  orders,
  onAdvanceOrderStatus,
  onAcceptOrder,
  onRejectOrder,
  onAuditRefund,
  showToast = (msg: string) => fallbackToast(msg),
  defaultOrderId,
  onOpenAggregatedHub
}) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isExpandedPreview, setIsExpandedPreview] = useState(false);
  const [selectedOrderNo, setSelectedOrderNo] = useState<string>('');
  const [quickInput, setQuickInput] = useState('');
  const [chatTick, setChatTick] = useState(0);

  // Active / Relevant orders for chat
  const activeChatOrders = useMemo(() => {
    const valid = orders.filter((o) => o.status !== 'cancelled');
    return valid.length > 0 ? valid : orders.slice(0, 3);
  }, [orders]);

  // Set default selected order
  useEffect(() => {
    if (defaultOrderId) {
      const found = orders.find((o) => o.id === defaultOrderId || o.orderNo === defaultOrderId);
      if (found) {
        setSelectedOrderNo(found.orderNo.replace(/^#/, ''));
        return;
      }
    }
    if (activeChatOrders.length > 0 && !selectedOrderNo) {
      setSelectedOrderNo(activeChatOrders[0].orderNo.replace(/^#/, ''));
    }
  }, [defaultOrderId, activeChatOrders, selectedOrderNo, orders]);

  // Periodic tick for dynamic live timer & SLA countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setChatTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to chat events to update unread badge and latest message
  useEffect(() => {
    const unsub = subscribeOrderChat(undefined, () => {
      setChatTick((t) => t + 1);
    });
    return () => unsub();
  }, []);

  const currentOrder = useMemo(() => {
    if (!selectedOrderNo) return activeChatOrders[0];
    return activeChatOrders.find((o) => o.orderNo.replace(/^#/, '') === selectedOrderNo) || activeChatOrders[0];
  }, [activeChatOrders, selectedOrderNo]);

  const activeOrderNo = (currentOrder?.orderNo || 'DEL-9912').replace(/^#/, '');

  // Calculate unread counts
  const currentUnread = useMemo(() => {
    return getUnreadCountForRole(activeOrderNo, role);
  }, [activeOrderNo, role, chatTick]);

  const totalUnreadAll = useMemo(() => {
    return activeChatOrders.reduce((acc, ord) => {
      return acc + getUnreadCountForRole(ord.orderNo.replace(/^#/, ''), role);
    }, 0);
  }, [activeChatOrders, role, chatTick]);

  const latestMsg = useMemo(() => {
    return getLatestChatMessage(activeOrderNo, currentOrder);
  }, [activeOrderNo, currentOrder, chatTick]);

  // SLA Calculation for current active conversation
  const slaResponse = useMemo(() => {
    return calculateChatSLAResponse(activeOrderNo, role, currentOrder);
  }, [activeOrderNo, role, currentOrder, chatTick]);

  const handleOpenFullChat = (ordNo?: string) => {
    if (ordNo) {
      setSelectedOrderNo(ordNo.replace(/^#/, ''));
      markOrderChatAsRead(ordNo, role);
    } else {
      markOrderChatAsRead(activeOrderNo, role);
    }
    setIsExpandedPreview(false);
    setIsOpenModal(true);
  };

  const handleSendQuickReply = (text: string) => {
    if (!text.trim()) return;
    const senderName =
      role === 'merchant'
        ? currentOrder?.truckName || '黑曜石餐车 · 南广场总站'
        : role === 'rider'
        ? currentOrder?.courierName || '陈志远 · 专线金牌骑手'
        : role === 'platform'
        ? '平台客服与仲裁运营组'
        : currentOrder?.customerName || '食客';

    sendOrderChatMessage(activeOrderNo, {
      senderRole: role,
      senderName,
      type: 'text',
      text: text.trim()
    });

    setQuickInput('');
    showToast(`[在线联络] 消息已实时广播至 #${activeOrderNo}`);
  };

  // Quick preset shortcuts based on role
  const quickPresets =
    role === 'merchant'
      ? ['🔥 正在高温果木炭烤中，约3分钟出餐', '🛵 骑手师傅已接单，请注意查收', '🎁 已随单赠送招牌特调饮品一杯']
      : role === 'rider'
      ? ['🛵 已到达餐车档口取餐，保温箱已锁闭', '⚡ 正在加急专送，预计4分钟送达', '📦 餐品已轻放于指定前台/外卖架']
      : role === 'platform'
      ? ['🛡️ 平台客服已介入并为您核对餐品履约进度', '⚡ 已敦促商家加急出餐并派送专线骑手', '💰 如有缺品漏发平台支持极速先行赔付']
      : ['📦 麻烦放一楼前台外卖架', '📞 到达请电话联系我', '⚡ 炭烤堡请防颠簸'];

  // Track whether dragging occurred to prevent triggering click on drag release
  const isDraggingRef = useRef(false);

  if (activeChatOrders.length === 0 && !currentOrder && !onOpenAggregatedHub) {
    return null;
  }

  return (
    <>
      {/* Floating Draggable Chat Bubble Capsule */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.15}
        onDragStart={() => {
          isDraggingRef.current = true;
        }}
        onDragEnd={() => {
          // Slight delay to prevent immediate click event
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 150);
        }}
        initial={{ x: 0, y: 0 }}
        className="fixed bottom-20 md:bottom-10 right-3 sm:right-5 max-sm:right-auto max-sm:left-1/2 max-sm:-translate-x-1/2 z-40 flex flex-col items-center sm:items-end gap-1.5 select-none touch-none"
      >
        {/* Expanded Quick Drawer / Preview */}
        <AnimatePresence>
          {isExpandedPreview && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="bg-white text-[#37352f] rounded-2xl border border-[#d3d1cb] shadow-2xl p-3.5 w-76 sm:w-84 overflow-hidden flex flex-col gap-2.5 backdrop-blur-md mb-1"
            >
              {/* Header with SLA status */}
              <div className="flex items-center justify-between border-b border-[#f1f1ef] pb-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-white ${
                      role === 'merchant'
                        ? 'bg-[#37352f]'
                        : role === 'rider'
                        ? 'bg-[#1b442b]'
                        : role === 'platform'
                        ? 'bg-indigo-600'
                        : 'bg-black'
                    }`}
                  >
                    {role === 'merchant' ? (
                      <Store className="w-3.5 h-3.5" />
                    ) : role === 'rider' ? (
                      <Bike className="w-3.5 h-3.5" />
                    ) : role === 'platform' ? (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="font-bold text-xs">
                    {role === 'merchant'
                      ? '商家端 · 即时联络'
                      : role === 'rider'
                      ? '骑手端 · 专送联络'
                      : role === 'platform'
                      ? '平台总控 · 客服'
                      : '即时客服'}
                  </span>
                  <span className="text-[9.5px] tabular-nums bg-[#edf3ec] text-[#2b593f] px-1.5 py-0.2 rounded font-bold">
                    三端直连
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsExpandedPreview(false)}
                  className="p-1 text-[#787774] hover:text-black hover:bg-[#f1f1ef] rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Aggregated Message Center Hub Entry Banner */}
              <button
                type="button"
                onClick={() => {
                  setIsExpandedPreview(false);
                  if (onOpenAggregatedHub) {
                    onOpenAggregatedHub();
                  } else {
                    handleOpenFullChat(activeOrderNo);
                  }
                }}
                className="w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white hover:brightness-110 text-xs font-bold flex items-center justify-between transition-all shadow-xs cursor-pointer border border-neutral-700/80"
                title="打开全网三端即时联络聚合总成"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/40">
                    <MessageSquareText className="w-3 h-3" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11.5px]">消息中心聚合中枢</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 tabular-nums font-bold">
                        全网全单
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-neutral-300 font-medium">
                  <span>查看全部</span>
                  <ArrowRight className="w-3 h-3 text-neutral-400" />
                </div>
              </button>

              {/* SLA Response Rate & Timeout Alert Banner */}
              <div
                className={`p-2 rounded-xl text-xs flex items-start gap-2 border transition-all ${
                  slaResponse.isOverdue
                    ? 'bg-rose-50 border-rose-200 text-rose-800 animate-pulse'
                    : slaResponse.isWarning
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50/80 border-emerald-200/70 text-emerald-900'
                }`}
              >
                <div className="p-1 rounded-md bg-white/80 shrink-0 mt-0.5 shadow-2xs">
                  {slaResponse.isOverdue ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  ) : slaResponse.isWarning ? (
                    <Timer className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px]">
                      {slaResponse.isOverdue
                        ? '⚠️ 超时未回复预警'
                        : slaResponse.isWaitingReply
                        ? '⏱️ 待回复响应'
                        : '✨ 联络响应时效极佳'}
                    </span>
                    <span className="tabular-nums font-black text-[11px]">
                      {slaResponse.isWaitingReply ? slaResponse.formattedTimer : `SLA ${slaResponse.responseRatePercent}%`}
                    </span>
                  </div>
                  <p className="text-[10px] opacity-90 mt-0.5 leading-snug truncate">
                    {slaResponse.slaAlertMessage}
                  </p>
                </div>
              </div>

              {/* Order selector pills */}
              {activeChatOrders.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                  {activeChatOrders.map((ord) => {
                    const cNo = ord.orderNo.replace(/^#/, '');
                    const isSel = cNo === activeOrderNo;
                    const unread = getUnreadCountForRole(cNo, role);
                    return (
                      <button
                        key={ord.id}
                        type="button"
                        onClick={() => {
                          setSelectedOrderNo(cNo);
                          markOrderChatAsRead(cNo, role);
                        }}
                        className={`px-2 py-0.5 rounded-[4px] text-[11px] tabular-nums font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer border ${
                          isSel
                            ? 'bg-[#37352f] text-white border-[#37352f]'
                            : 'bg-[#f7f7f5] text-[#5a5854] border-[#e6e6e4] hover:bg-[#eaeae7]'
                        }`}
                      >
                        <span>#{cNo}</span>
                        {unread > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#eb5757] animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Latest message preview box */}
              <div
                onClick={() => handleOpenFullChat(activeOrderNo)}
                className="bg-[#fbfbfa] p-2.5 rounded-xl border border-[#e6e6e4] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] transition-all cursor-pointer space-y-1.5 group"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-semibold text-[#37352f]">
                    <span>订单 #{activeOrderNo}</span>
                    <span className="text-[10px] text-[#787774] font-normal">
                      ({currentOrder?.customerName || '食客'})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#9b9a97] tabular-nums">
                    <Clock className="w-3 h-3" />
                    <span>{latestMsg?.timeExact || latestMsg?.time || '刚刚'}</span>
                    {latestMsg?.timestamp && (
                      <span className="text-[9px] text-[#787774]">({formatRelativeTime(latestMsg.timestamp)})</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#5a5854] line-clamp-2 leading-relaxed">
                  {latestMsg?.text ||
                    (latestMsg?.voiceTranscribed
                      ? `[语音] ${latestMsg.voiceTranscribed}`
                      : latestMsg?.statusChangeInfo
                      ? `[状态更新] ${latestMsg.statusChangeInfo.title}`
                      : '暂无新消息，点击开启三端即时通话')}
                </p>

                <div className="flex items-center justify-between text-[10px] text-[#787774] pt-1 border-t border-[#f1f1ef]">
                  <span className="text-[#2b593f] font-semibold group-hover:underline flex items-center gap-1">
                    点击进入完整对话室
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                  <span className="tabular-nums text-[#9b9a97]">时间戳存证</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-[#787774] block">一键快传给三端:</span>
                <div className="flex flex-col gap-1">
                  {quickPresets.map((txt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendQuickReply(txt)}
                      className="text-left text-[11px] p-1.5 bg-[#f7f7f5] hover:bg-[#edf3ec] hover:text-[#2b593f] rounded-[4px] border border-[#e6e6e4] transition-colors cursor-pointer truncate"
                    >
                      {txt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Input Row */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuickReply(quickInput);
                }}
                className="flex items-center gap-1.5 pt-1"
              >
                <input
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder="快捷输入留言..."
                  className="flex-1 px-2.5 py-1.5 text-xs bg-[#f7f7f5] border border-[#d3d1cb] rounded-lg focus:outline-none focus:border-[#37352f]"
                />
                <button
                  type="submit"
                  disabled={!quickInput.trim()}
                  className="p-1.5 bg-[#37352f] text-white hover:bg-[#201f1d] disabled:opacity-40 rounded-lg cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary Floating Trigger Capsule: [消息中心聚合按钮] + [当前单号微调直达] */}
        <div
          className={`p-1 sm:p-1.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex items-center gap-1 sm:gap-1.5 border backdrop-blur-md transition-all duration-150 ${
            slaResponse.isOverdue
              ? 'bg-rose-950/95 text-white border-rose-600 ring-2 ring-rose-500/50'
              : slaResponse.isWarning
              ? 'bg-amber-950/95 text-white border-amber-600'
              : role === 'platform'
              ? 'bg-indigo-950/95 text-white border-indigo-600'
              : 'bg-[#181816]/95 text-white border-neutral-700/80 hover:border-neutral-500'
          }`}
        >
          {/* Grip drag indicator */}
          <div className="pl-1 pr-0.5 cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-200">
            <GripVertical className="w-3.5 h-3.5 opacity-60" />
          </div>

          {/* Primary Action Button: 消息中心聚合按钮 */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (isDraggingRef.current) return;
              if (onOpenAggregatedHub) {
                onOpenAggregatedHub();
              } else {
                handleOpenFullChat(activeOrderNo);
              }
            }}
            id="floating-msg-center-hub-btn"
            className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-r from-neutral-800 to-neutral-700 hover:from-neutral-700 hover:to-neutral-600 text-white border border-neutral-600/70 transition-all cursor-pointer shadow-xs group select-none"
            title="点击打开消息中心聚合 (查看全部订单与三端协同流)"
          >
            {/* Animated pulsing dot */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  slaResponse.isOverdue ? 'bg-rose-400' : slaResponse.isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  slaResponse.isOverdue ? 'bg-rose-500' : slaResponse.isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
            </span>

            <MessageSquareText className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />

            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold whitespace-nowrap">
              <span>消息中心</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold leading-none">
                聚合
              </span>
            </div>

            {/* Total unread badge across all orders */}
            {totalUnreadAll > 0 && (
              <span className="bg-[#eb5757] text-white tabular-nums font-extrabold text-[9.5px] min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center animate-bounce shadow-xs">
                {totalUnreadAll}
              </span>
            )}
          </motion.button>

          {/* Divider */}
          <div className="w-[1px] h-3.5 bg-neutral-700/80 shrink-0" />

          {/* Secondary Action Pill: 当前订单直达 / 展开快捷抽屉 */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              if (isDraggingRef.current) return;
              if (isExpandedPreview) {
                handleOpenFullChat(activeOrderNo);
              } else {
                setIsExpandedPreview(true);
              }
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-full text-white hover:bg-white/10 transition-all cursor-pointer select-none"
            title={`当前专属会话: 订单 #${activeOrderNo} · 点击展开快捷回复`}
          >
            <span className="text-[10.5px] font-medium text-neutral-300">
              {role === 'merchant'
                ? '商家'
                : role === 'rider'
                ? '骑手'
                : role === 'platform'
                ? '平台'
                : '客服'}
            </span>
            <span className="tabular-nums text-[9.5px] text-neutral-300 bg-white/10 px-1 py-0.2 rounded">
              #{activeOrderNo}
            </span>

            {/* SLA countdown badge or warning indicator */}
            {slaResponse.isWaitingReply && (
              <span
                className={`tabular-nums text-[9px] font-bold px-1 py-0.2 rounded-full flex items-center gap-0.5 ${
                  slaResponse.isOverdue
                    ? 'bg-rose-600 text-white animate-bounce'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                <Timer className="w-2.5 h-2.5" />
                {slaResponse.formattedTimer}
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Unified Full-Screen Omni Chat Modal */}
      {isOpenModal && (
        <UnifiedOmniChatModal
          isOpen={isOpenModal}
          onClose={() => setIsOpenModal(false)}
          order={currentOrder}
          orderNo={activeOrderNo}
          viewerRole={role}
          onAdvanceOrderStatus={onAdvanceOrderStatus}
          onAcceptOrder={onAcceptOrder}
          onRejectOrder={onRejectOrder}
          onAuditRefund={onAuditRefund}
          showToast={showToast}
        />
      )}
    </>
  );
};

