import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  MessageSquare,
  MessageSquareText,
  Clock,
  CheckCircle2,
  Bike,
  Store,
  ChefHat,
  Filter,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Phone,
  MapPin,
  Flame,
  Radio,
  Send,
  ChevronRight,
  Copy,
  Receipt,
  RotateCcw,
  SlidersHorizontal,
  AlertCircle,
  ShoppingBag
} from 'lucide-react';
import { Order, DishItem } from '../../types';
import {
  getLatestChatMessage,
  getUnreadCountForRole,
  subscribeOrderChat,
  formatRelativeTime,
  formatExactTime,
  ChatRole
} from '../../utils/chatHub';
import { matchDishImageUrl } from '../../utils/dishImageMatcher';
import { UnifiedOmniChatModal } from './UnifiedOmniChatModal';
import { ActiveMessageFormModal } from './ActiveMessageFormModal';
import { EmbeddedOrderChat } from './EmbeddedOrderChat';
import { OmniAggregatedChatHub } from './OmniAggregatedChatHub';
import { fallbackToastCompat } from '../../utils/fallbackToast';

export interface OrderHistoryMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  dishes?: DishItem[];
  viewerRole?: 'user' | 'rider' | 'merchant' | 'platform' | 'customer';
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onRejectOrder?: (orderId: string, reason: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  showToast?: (title: string, desc?: string) => void;
  onTrackOrder?: (orderId: string) => void;
}

type FilterStatusType = 'all' | 'active' | 'cooking' | 'delivering' | 'completed' | 'refund';

export const OrderHistoryMessagesModal: React.FC<OrderHistoryMessagesModalProps> = ({
  isOpen,
  onClose,
  orders,
  dishes = [],
  viewerRole = 'merchant',
  onAdvanceOrderStatus,
  onRejectOrder,
  onAuditRefund,
  showToast = (t, d) => fallbackToastCompat(t, d),
  onTrackOrder
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatusType>('all');
  const [chatTick, setChatTick] = useState(0);
  const [activeHubView, setActiveHubView] = useState<'orders' | 'omni_hub'>('orders');

  // Active chat modal state
  const [chatTargetOrder, setChatTargetOrder] = useState<Order | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  // Active inline embedded chat order id
  const [expandedChatOrderId, setExpandedChatOrderId] = useState<string | null>(null);

  // Active quick message form state
  const [isMessageFormOpen, setIsMessageFormOpen] = useState(false);
  const [prefilledOrderId, setPrefilledOrderId] = useState<string>('');

  // Subscribe to real-time chat updates across all orders
  useEffect(() => {
    const unsub = subscribeOrderChat(undefined, () => {
      setChatTick((t) => t + 1);
    });
    return () => unsub();
  }, []);

  const normalizedRole: ChatRole =
    viewerRole === 'customer' || viewerRole === 'user'
      ? 'user'
      : viewerRole === 'rider'
      ? 'rider'
      : viewerRole === 'platform'
      ? 'platform'
      : 'merchant';

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Status Filter
      if (statusFilter === 'active') {
        if (order.status === 'completed' || order.status === 'cancelled') return false;
      } else if (statusFilter === 'cooking') {
        if (order.status !== 'cooking') return false;
      } else if (statusFilter === 'delivering') {
        if (order.status !== 'delivering') return false;
      } else if (statusFilter === 'completed') {
        if (order.status !== 'completed') return false;
      } else if (statusFilter === 'refund') {
        if (order.status !== 'cancelled' && order.refundStatus !== 'pending') return false;
      }

      // 2. Search Query (orderNo, dishes, address, courier, customer)
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const orderNoMatch = (order.orderNo || '').toLowerCase().includes(q);
      const itemsMatch = order.items?.some((i) => (i.name || '').toLowerCase().includes(q));
      const addressMatch = (order.deliveryAddress || '').toLowerCase().includes(q);
      const courierMatch = (order.courierName || '').toLowerCase().includes(q);
      const customerMatch = (order.customerName || '').toLowerCase().includes(q);
      const statusTextMatch = (order.statusText || '').toLowerCase().includes(q);

      return orderNoMatch || itemsMatch || addressMatch || courierMatch || customerMatch || statusTextMatch;
    });
  }, [orders, statusFilter, searchQuery]);

  // Total unread messages across all filtered orders
  const totalUnreadCount = useMemo(() => {
    return orders.reduce((sum, ord) => {
      const ordNo = (ord.orderNo || '').replace(/^#/, '');
      return sum + getUnreadCountForRole(ordNo, normalizedRole);
    }, 0);
  }, [orders, normalizedRole, chatTick]);

  // Open Chat for specific order
  const handleOpenOrderChat = (order: Order) => {
    setChatTargetOrder(order);
    setIsChatModalOpen(true);
  };

  // Open Quick Dispatch Form for specific order
  const handleOpenDispatchForm = (order: Order) => {
    setPrefilledOrderId(order.orderNo.replace(/^#/, ''));
    setIsMessageFormOpen(true);
  };

  // Copy order no
  const handleCopyOrderNo = (orderNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText?.(orderNo);
    showToast('已复制订单号', orderNo);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="bg-[#ffffff] w-full max-w-4xl rounded-2xl shadow-2xl border border-[#e6e6e4] overflow-hidden flex flex-col my-auto max-h-[92vh]"
        >
          {/* 1. Modal Top Bar Header */}
          <div className="bg-[#f7f7f5] px-4 sm:px-6 py-3.5 border-b border-[#e6e6e4] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#201f1d] text-white flex items-center justify-center shadow-xs">
                <Receipt className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-[#1a1c1b]">
                    消息中心聚合 · 历史订单与在线沟通
                  </h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800">
                    共 {orders.length} 单
                  </span>
                  {totalUnreadCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                      {totalUnreadCount} 条新消息
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#787774]">
                  全网历史订单明细与三端在线实时通讯流总成
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Tab Switcher */}
              <div className="flex items-center p-0.5 bg-neutral-200/90 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveHubView('orders')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    activeHubView === 'orders'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  订单消息表单
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHubView('omni_hub')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    activeHubView === 'omni_hub'
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  三端即时聚合流
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsMessageFormOpen(true)}
                className="px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="激活广播或向各端发送协同工单"
              >
                <MessageSquareText className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">激活协同表单</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-[#e8e8e6] text-[#787774] hover:text-[#1a1c1b] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {activeHubView === 'omni_hub' ? (
            <div className="flex-1 overflow-hidden flex flex-col min-h-[500px]">
              <OmniAggregatedChatHub
                orders={orders}
                viewerRole={normalizedRole}
                onAdvanceOrderStatus={onAdvanceOrderStatus}
                onRejectOrder={onRejectOrder}
                onAuditRefund={onAuditRefund}
                showToast={(m) => showToast(m)}
                isModalMode={true}
              />
            </div>
          ) : (
            <>
              {/* 2. Search & Filter Bar */}
          <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-[#e6e6e4] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#787774] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索订单号 / 菜品名称 / 顾客 / 配送地址 / 骑手..."
                className="w-full h-8.5 pl-9 pr-3 rounded-xl border border-[#d3d1cb] bg-[#fafafa] focus:bg-white text-xs font-medium text-[#37352f] focus:outline-none focus:ring-1 focus:ring-neutral-800 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
              {[
                { id: 'all', label: '全部' },
                { id: 'active', label: '进行中' },
                { id: 'cooking', label: '现烤中' },
                { id: 'delivering', label: '专送中' },
                { id: 'completed', label: '已完成' },
                { id: 'refund', label: '售后/退款' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as FilterStatusType)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-[#37352f] text-white shadow-2xs'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Orders Form List Table Body (50% Card Width / 2 Columns) */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 flex flex-col items-center justify-center">
                <ShoppingBag className="w-10 h-10 mb-2 stroke-1 text-neutral-300" />
                <p className="text-xs font-semibold text-neutral-600">未找到符合筛选条件的订单表单</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">请尝试清除关键词或切换分类筛选</p>
              </div>
            ) : (
              <div className="flex flex-col space-y-2.5">
                {filteredOrders.map((order, idx) => {
                const cleanNo = (order.orderNo || '').replace(/^#/, '');
                const unreadCount = getUnreadCountForRole(cleanNo, normalizedRole);
                const latestMessage = getLatestChatMessage(cleanNo, order);

                // Status Badge styling
                const statusBadge =
                  order.status === 'cooking'
                    ? { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: '🔥 烹饪制作中' }
                    : order.status === 'delivering'
                    ? { bg: 'bg-sky-50 text-sky-800 border-sky-200', text: '🛵 骑手专送中' }
                    : order.status === 'completed'
                    ? { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: '✅ 已送达完成' }
                    : { bg: 'bg-rose-50 text-rose-800 border-rose-200', text: '⚠️ 已取消/退款' };

                return (
                  <div
                    key={`chat-ord-${order.id || cleanNo || idx}-${idx}`}
                    onClick={() => handleOpenOrderChat(order)}
                    className="pt-3 first:pt-0 bg-[#ffffff] hover:bg-[#fafaf8] rounded-xl p-3 border border-[#e6e6e4] hover:border-neutral-800 transition-all flex flex-col gap-2 cursor-pointer group"
                  >
                    {/* Top Row: Order ID, Dining Mode, Status, Time */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleCopyOrderNo(order.orderNo, e)}
                          className="font-mono font-bold text-xs text-[#201f1d] hover:text-emerald-700 flex items-center gap-1 cursor-pointer bg-neutral-100 px-2 py-0.5 rounded-md"
                          title="点击复制订单号"
                        >
                          <span>#{cleanNo}</span>
                          <Copy className="w-3 h-3 text-neutral-400" />
                        </button>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {order.channelType === 'delivery'
                            ? '外卖配送'
                            : order.channelType === 'pickup'
                            ? '到车自提'
                            : '现场堂食'}
                        </span>

                        <span
                          className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.bg} inline-flex items-center gap-1 transition-all ${order.isRecentlyUpdated ? 'ring-2 ring-emerald-400/50' : ''}`}
                        >
                          {order.isRecentlyUpdated && (
                            <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 animate-pulse-dot" />
                            </span>
                          )}
                          <span>{statusBadge.text}</span>
                          {order.isRecentlyUpdated && (
                            <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/90 px-1 py-0.2 rounded-full leading-none normal-case animate-pulse">
                              最新
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#787774]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{order.createdTime || '刚刚'}</span>
                        <span className="font-bold text-sm text-[#201f1d] ml-1">
                          ¥{order.totalAmount || 0}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Customer / Delivery / Address Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-neutral-600 gap-1 bg-[#fafaf9] px-2.5 py-1.5 rounded-lg border border-neutral-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{order.deliveryAddress || '到车自提取餐'}</span>
                      </div>
                      {order.courierName && (
                        <div className="flex items-center gap-1.5 text-sky-700 font-medium shrink-0">
                          <Bike className="w-3.5 h-3.5 shrink-0" />
                          <span>骑手: {order.courierName} ({order.courierPhone || '专送保密'})</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Real-time Message Snippet & "Open Online Chat" Action Button */}
                    <div className="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 bg-[#fbfbfa] -mx-3 -mb-2 px-3 py-2 rounded-b-xl">
                      {/* Latest Message preview */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <MessageSquare className="w-4 h-4 text-emerald-700" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                          )}
                        </div>
                        <div className="text-[11px] truncate flex items-center gap-1.5">
                          <span className="font-bold text-neutral-700 shrink-0">
                            {latestMessage?.senderRole === 'user'
                              ? '顾客:'
                              : latestMessage?.senderRole === 'rider'
                              ? '骑手:'
                              : latestMessage?.senderRole === 'platform'
                              ? '平台:'
                              : '餐车:'}
                          </span>
                          <span className="text-neutral-600 truncate">
                            {latestMessage?.text || '暂无新对话，点击右侧开启即时在线协同...'}
                          </span>
                          {latestMessage?.timestamp && (
                            <span className="text-[9.5px] text-neutral-400 shrink-0">
                              · {formatRelativeTime(latestMessage.timestamp)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-400 group-hover:text-neutral-900 transition-colors shrink-0">
                        {unreadCount > 0 && (
                          <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full mr-1">
                            {unreadCount}
                          </span>
                        )}
                        <span className="hidden sm:inline text-[10.5px] text-neutral-400 group-hover:text-neutral-700">进入消息</span>
                        <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>

          {/* 4. Footer */}
          <div className="bg-[#f7f7f5] px-4 sm:px-6 py-2.5 border-t border-[#e6e6e4] flex items-center justify-between shrink-0 text-xs">
            <span className="text-[11px] text-[#787774]">
              提示：所有订单聊天消息均通过实时通讯总线加密分发，支持三方即时协同与云端存证
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white border border-[#d3d1cb] hover:bg-neutral-100 text-neutral-800 text-xs font-bold transition-all cursor-pointer"
            >
              关闭
            </button>
          </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Online Chat Modal triggered for the specific order */}
      {chatTargetOrder && (
        <UnifiedOmniChatModal
          isOpen={isChatModalOpen}
          onClose={() => {
            setIsChatModalOpen(false);
            setChatTargetOrder(null);
          }}
          order={chatTargetOrder}
          orderNo={chatTargetOrder.orderNo.replace(/^#/, '')}
          viewerRole={normalizedRole}
          onAdvanceOrderStatus={onAdvanceOrderStatus}
          onRejectOrder={onRejectOrder}
          onAuditRefund={onAuditRefund}
          showToast={(msg) => showToast(msg)}
        />
      )}

      {/* Quick Dispatch / Active Message Form Modal */}
      <ActiveMessageFormModal
        isOpen={isMessageFormOpen}
        onClose={() => setIsMessageFormOpen(false)}
        orders={orders}
        dishes={dishes}
        viewerRole={viewerRole}
        onAdvanceOrderStatus={onAdvanceOrderStatus}
        showToast={showToast}
        onOpenOmniChat={(ordNo) => {
          setIsMessageFormOpen(false);
          const found = orders.find((o) => o.orderNo.replace(/^#/, '') === (ordNo || '').replace(/^#/, ''));
          if (found) {
            handleOpenOrderChat(found);
          }
        }}
      />
    </AnimatePresence>
  );
};
