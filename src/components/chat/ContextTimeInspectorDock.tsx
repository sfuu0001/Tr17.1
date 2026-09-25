import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  AlertTriangle,
  Flame,
  Bike,
  ShieldCheck,
  Timer,
  ChevronDown,
  ArrowDown,
  Utensils,
  MessageSquareQuote
} from 'lucide-react';
import { Order } from '../../types';
import {
  ChatMessageItem,
  ChatRole,
  calculateChatSLAResponse,
  respondToSLASupervision,
  resolveSLASupervision
} from '../../utils/chatHub';

export interface ContextTimeInspectorDockProps {
  order?: Order;
  orderNo?: string;
  messages: ChatMessageItem[];
  activeRole: ChatRole;
  time?: string;
  onScrollToBottom?: () => void;
  onSLAAction?: (messageId: string, action: 'respond' | 'resolve' | 'log', payload?: any) => void;
  onQuoteDish?: (dishItem: any) => void;
  showToast?: (title: string, desc?: string) => void;
  className?: string;
}

/**
 * ContextTimeInspectorDock (上下文中嵌入式·自动化时间与双胶囊督察组件)
 * 
 * 核心自动化设计：
 * 1. 嵌入式展示：作为上下文消息流中的时间锚点直接渲染（非顶部悬浮），与 IMG_3443 时间微标无缝融合；
 * 2. 上下文时间按钮：
 *    - 正常或已闭环状态：展示极简纯净的 [ 🕒 13:21 ] 时间胶囊；
 *    - SLA 督察超时状态：自动在时间按钮上高亮告警（[ ⚠️ 13:21 · SLA督察超时 ]）；
 *    - SLA 恢复正常或处理完毕：自动清除告警标记，恢复纯净时间显示。
 * 3. 上下文时间按钮之下展示两个胶囊版的缩小按钮：
 *    - 胶囊 1 (SLA 督察胶囊)：实时感知待响应/督办中/超时/已闭环，点击可展开处置抽屉；
 *    - 胶囊 2 (订单实时跟进胶囊)：实时联动订单底部时间线状态（制作中/专送中/出餐待取）；
 *      若订单已完成 (completed / delivered / cancelled)，则自动化隐藏不再显示！
 */
export const ContextTimeInspectorDock: React.FC<ContextTimeInspectorDockProps> = ({
  order,
  orderNo = '',
  messages,
  activeRole,
  time,
  onScrollToBottom,
  onSLAAction,
  onQuoteDish,
  showToast = () => {},
  className = ''
}) => {
  const cleanOrderNo = (orderNo || order?.orderNo || 'OD-8921').replace(/^#/, '');

  // 1秒动态心跳：驱动倒计时、超时判定与实时刷新
  const [tick, setTick] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 弹出处置抽屉状态
  const [isSlaDetailOpen, setIsSlaDetailOpen] = useState(false);
  const [isOrderQuickOpen, setIsOrderQuickOpen] = useState(false);
  const [isDishesDropdownOpen, setIsDishesDropdownOpen] = useState(true);
  const [slaResolutionNote, setSlaResolutionNote] = useState('');

  // 实时 SLA 响应状态计算
  const slaResponse = useMemo(() => {
    return calculateChatSLAResponse(cleanOrderNo, activeRole, order);
  }, [cleanOrderNo, activeRole, order, tick]);

  // 查找消息流中最新的 SLA 督办工单
  const activeSlaMessage = useMemo(() => {
    return messages
      .slice()
      .reverse()
      .find(
        (m) =>
          m.slaSupervision &&
          (m.slaSupervision.status === 'pending' || m.slaSupervision.status === 'in_progress')
      );
  }, [messages]);

  const latestSlaMessage = useMemo(() => {
    return messages
      .slice()
      .reverse()
      .find((m) => Boolean(m.slaSupervision));
  }, [messages]);

  // 自动化判定：是否存在 SLA 督察超时
  const isSlaOverdue = useMemo(() => {
    if (slaResponse.isOverdue) return true;
    if (activeSlaMessage?.slaSupervision) {
      return Date.now() > activeSlaMessage.slaSupervision.deadlineAt;
    }
    return false;
  }, [slaResponse.isOverdue, activeSlaMessage, tick]);

  // 自动化判定：SLA 是否已办结或达标闭环
  const isSlaResolved = useMemo(() => {
    if (!activeSlaMessage && latestSlaMessage?.slaSupervision) {
      const st = latestSlaMessage.slaSupervision.status;
      return st === 'resolved' || st === 'overdue_resolved';
    }
    return false;
  }, [activeSlaMessage, latestSlaMessage]);

  // 自动化判定：订单是否已完成 (已完成订单自动隐藏，不显示)
  const isOrderCompleted = useMemo(() => {
    if (!order) return false;
    const s = order.status;
    return s === 'completed' || s === 'delivered' || s === 'cancelled' || s === 'refunded';
  }, [order?.status]);

  // 上下文时间显示 (优先取外部传入的 message.time，若无则取最新消息时间)
  const displayTime = useMemo(() => {
    if (time) return time;
    const last = messages[messages.length - 1];
    if (last?.time) return last.time;
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }, [time, messages]);

  // 处理 SLA 工单响应与归档
  const handleResolveSla = () => {
    if (!activeSlaMessage?.id) {
      showToast('暂无未决督办工单', '当前会话履约时效合规');
      setIsSlaDetailOpen(false);
      return;
    }

    if (onSLAAction) {
      onSLAAction(activeSlaMessage.id, 'resolve', {
        note: slaResolutionNote.trim() || '已现场完成出餐装箱与交接，督办闭环'
      });
    } else {
      resolveSLASupervision(
        cleanOrderNo,
        activeSlaMessage.id,
        activeRole === 'merchant' ? '餐车主厨' : activeRole === 'rider' ? '专线骑手' : '调度总控',
        activeRole,
        slaResolutionNote.trim() || '现场履约协同完毕，督办闭环'
      );
      showToast('SLA 督办已闭环办结', '工单已归档，恢复正常时钟展示');
    }
    setIsSlaDetailOpen(false);
    setSlaResolutionNote('');
  };

  const handleRespondSla = () => {
    if (!activeSlaMessage?.id) return;
    if (onSLAAction) {
      onSLAAction(activeSlaMessage.id, 'respond', { note: '已确认接单响应，排入极速通道' });
    } else {
      respondToSLASupervision(
        cleanOrderNo,
        activeSlaMessage.id,
        activeRole === 'merchant' ? '餐车主厨' : activeRole === 'rider' ? '专线骑手' : '调度总控',
        activeRole,
        '已确认接单响应，排入极速通道'
      );
      showToast('已确认接单响应', '首次响应时间已记录并进入加速交付');
    }
    setIsSlaDetailOpen(false);
  };

  // 订单实时跟进状态映射 (跟进底部时间轴)
  const orderStageInfo = useMemo(() => {
    if (!order) {
      return {
        label: '履约协同中',
        subText: '调度中',
        colorClass: 'border-emerald-500/80 text-emerald-800 ring-emerald-500/15',
        icon: Bike
      };
    }

    switch (order.status) {
      case 'cooking':
        return {
          label: '后厨制作中',
          subText: `约 ${order.etaMinutes || 4} 分钟`,
          colorClass: 'border-amber-400 text-amber-800 ring-amber-500/15',
          icon: Flame
        };
      case 'delivering':
        return {
          label: '全速专送中',
          subText: `距 350m`,
          colorClass: 'border-emerald-500 text-emerald-800 ring-emerald-600/15',
          icon: Bike
        };
      case 'pending':
        return {
          label: '待接单出餐',
          subText: '调度排队',
          colorClass: 'border-sky-400 text-sky-800 ring-sky-500/15',
          icon: Timer
        };
      default:
        return {
          label: '协同履约中',
          subText: `¥${Number(order.totalAmount || 0).toFixed(0)}`,
          colorClass: 'border-neutral-300 text-neutral-800 ring-neutral-900/10',
          icon: ShieldCheck
        };
    }
  }, [order?.status, order?.etaMinutes, order?.totalAmount]);

  const StageIcon = orderStageInfo.icon;

  return (
    <div
      className={`flex flex-col items-center my-2.5 select-none w-full ${className}`}
      data-purpose="context-time-inspector-embedded"
    >
      {/* 1. 上下文时间按钮 (嵌入上下文消息流中，若 SLA 超时则高亮告警，恢复正常则纯净展示) */}
      <motion.button
        type="button"
        layout
        onClick={() => {
          if (isSlaOverdue || activeSlaMessage) {
            setIsSlaDetailOpen((prev) => !prev);
            setIsOrderQuickOpen(false);
          } else {
            showToast('会话上下文时钟', `记录节点时刻：${displayTime} · 安全协同`);
          }
        }}
        className={`transition-all duration-200 cursor-pointer shadow-3xs whitespace-nowrap active:scale-95 ${
          isSlaOverdue
            ? 'inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10.5px] tabular-nums font-bold border border-rose-300 ring-1 ring-rose-500/20 hover:bg-rose-100'
            : 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500 text-[10.5px] tabular-nums font-medium border border-neutral-200/60 hover:bg-neutral-200/80 hover:text-neutral-800'
        }`}
        title={isSlaOverdue ? 'SLA 督察超时 · 点击处置' : `上下文时间 ${displayTime}`}
      >
        {isSlaOverdue ? (
          <>
            <AlertTriangle className="w-2.5 h-2.5 text-rose-600 animate-pulse shrink-0" />
            <span>{displayTime}</span>
            <span className="w-1 h-1 rounded-full bg-rose-400 shrink-0" />
            <span className="text-[10px] text-rose-800 font-bold">SLA督察超时</span>
          </>
        ) : (
          <>
            <Clock className="w-2.5 h-2.5 text-neutral-400 stroke-[1.5] shrink-0" />
            <span>{displayTime}</span>
          </>
        )}
      </motion.button>

      {/* 2. 上下文时间按钮之下显示订单实时跟进胶囊 (实时的跟进底部时间线底部，已完成订单自动隐藏不显示) */}
      <AnimatePresence>
        {!isOrderCompleted && (
          <div className="flex items-center justify-center mt-1.5">
            <motion.button
              key="order-realtime-capsule"
              type="button"
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              onClick={() => {
                setIsOrderQuickOpen((prev) => !prev);
                setIsSlaDetailOpen(false);
              }}
              className={`h-6 px-2.5 rounded-full bg-white text-[10px] transition-all duration-150 cursor-pointer inline-flex items-center gap-1 shadow-3xs whitespace-nowrap active:scale-95 border ${orderStageInfo.colorClass} hover:bg-neutral-50/80`}
              title="订单实时进度 · 点击展开"
            >
              <StageIcon className="w-2.5 h-2.5 shrink-0" />
              <span className="font-bold">#{cleanOrderNo} {orderStageInfo.label}</span>
              <span className="text-[9px] font-medium px-1 py-0.2 rounded-full bg-neutral-100 text-neutral-700 leading-none shrink-0">
                {orderStageInfo.subText}
              </span>
              <ChevronDown className={`w-2.5 h-2.5 text-neutral-400 transition-transform duration-150 ${isOrderQuickOpen ? 'rotate-180' : ''}`} />
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* SLA 督察详情内嵌展开面板 */}
      <AnimatePresence>
        {isSlaDetailOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="mt-2 w-full max-w-sm rounded-xl backdrop-blur-xl bg-white/95 border border-neutral-200/90 shadow-xl shadow-neutral-950/10 p-3 text-xs text-neutral-800 z-20"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-neutral-900 text-[12px]">SLA 履约督察处置</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSlaDetailOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">督察单号：</span>
                <span className="font-bold text-neutral-800">
                  {activeSlaMessage?.slaSupervision?.ticketId || latestSlaMessage?.slaSupervision?.ticketId || 'SLA-AUTO-LIVE'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500">当前时效状态：</span>
                <span className={`font-bold ${isSlaOverdue ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {isSlaOverdue ? '⚠️ 严重超时（加急调度中）' : isSlaResolved ? '已达标完成归档' : '正常履约中'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500">倒计时 / 时效指标：</span>
                <span className="font-bold text-neutral-900">
                  {slaResponse.formattedTimer}
                </span>
              </div>

              {activeSlaMessage && (
                <div className="pt-2 border-t border-neutral-100">
                  <input
                    type="text"
                    value={slaResolutionNote}
                    onChange={(e) => setSlaResolutionNote(e.target.value)}
                    placeholder="处置说明（如：现烤已装箱交接骑手）..."
                    className="w-full h-8 px-2.5 rounded-lg border border-neutral-200 text-xs bg-white focus:outline-none focus:border-neutral-900 mb-2"
                  />
                  <div className="flex gap-1.5">
                    {activeSlaMessage.slaSupervision?.status === 'pending' && (
                      <button
                        type="button"
                        onClick={handleRespondSla}
                        className="flex-1 h-8 rounded-lg bg-white border border-neutral-200 hover:border-neutral-900 text-neutral-800 font-bold transition cursor-pointer"
                      >
                        确认接单响应
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleResolveSla}
                      className="flex-1 h-8 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition cursor-pointer"
                    >
                      办结归档
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 订单实时跟进内嵌展开面板 */}
      <AnimatePresence>
        {isOrderQuickOpen && order && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="mt-2 w-full max-w-sm rounded-xl backdrop-blur-xl bg-white/95 border border-neutral-200/90 shadow-xl shadow-neutral-950/10 p-3 text-xs text-neutral-800 z-20"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-1.5">
                <StageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-neutral-900 text-[12px]">
                  订单 #{cleanOrderNo} 实时进度
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOrderQuickOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">当前阶段：</span>
                <span className="font-bold text-neutral-900">{orderStageInfo.label}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500">预计送达：</span>
                <span className="font-bold text-emerald-700">约 {order.etaMinutes || 4} 分钟 (距 350m)</span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-neutral-500 shrink-0">配送地址：</span>
                <span className="font-medium text-neutral-800 text-right truncate">
                  {order.deliveryAddress || '徐汇滨江油罐艺术中心 1 号馆'}
                </span>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="pt-2 border-t border-neutral-100">
                  {/* 抽屉下拉菜单触发栏 (可折叠/展开) */}
                  <button
                    type="button"
                    onClick={() => setIsDishesDropdownOpen(!isDishesDropdownOpen)}
                    className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg bg-neutral-50/80 hover:bg-neutral-100/90 text-left border border-neutral-200/60 transition-colors cursor-pointer group select-none"
                    aria-expanded={isDishesDropdownOpen}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Utensils className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-800 shrink-0" />
                      <span className="text-[11.5px] font-bold text-neutral-800">
                        单品快速咨询
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-white text-neutral-600 border border-neutral-200/80 shrink-0 tabular-nums">
                        {order.items.length} 道菜品
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10.5px] text-neutral-400 group-hover:text-neutral-700 shrink-0">
                      <span>{isDishesDropdownOpen ? '收起列表' : '展开菜单'}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isDishesDropdownOpen ? 'rotate-180 text-neutral-700' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* 抽屉下拉内容：每个菜品展示为文本表单卡片，右侧配置单品单独咨询按钮 */}
                  <AnimatePresence initial={false}>
                    {isDishesDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                          {order.items.map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2.5 p-2 rounded-lg bg-white border border-neutral-200/90 hover:border-neutral-300 shadow-3xs transition-all duration-150"
                            >
                              {/* 菜品文本表单信息 */}
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[12px] font-bold text-neutral-900 truncate">
                                    {item.name}
                                  </span>
                                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 shrink-0 tabular-nums">
                                    x{item.quantity || 1}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10.5px] text-neutral-500">
                                  {item.price !== undefined && (
                                    <span className="font-semibold text-neutral-800 tabular-nums">
                                      ¥{Number(item.price).toFixed(0)}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/70 shrink-0">
                                    {order.status === 'cooking' ? '后厨现烤中' : order.status === 'delivering' ? '恒温专送中' : '履约备餐'}
                                  </span>
                                </div>
                              </div>

                              {/* 右侧菜品单独咨询按钮 */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (onQuoteDish) onQuoteDish(item);
                                  setIsOrderQuickOpen(false);
                                  showToast('已引用单品', `正在咨询：${item.name}`);
                                }}
                                className="h-7 px-2.5 rounded-lg bg-white hover:bg-neutral-900 text-neutral-700 hover:text-white border border-neutral-200/90 hover:border-neutral-900 shadow-3xs text-[11px] font-medium inline-flex items-center gap-1 shrink-0 whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95"
                                title={`单独咨询 ${item.name}`}
                              >
                                <MessageSquareQuote className="w-3 h-3 shrink-0" />
                                <span>单独咨询</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {onScrollToBottom && (
                <div className="pt-2 border-t border-neutral-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onScrollToBottom();
                      setIsOrderQuickOpen(false);
                    }}
                    className="h-7 px-2.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-700 text-[11px] font-medium border border-neutral-200/90 inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <ArrowDown className="w-3 h-3 text-neutral-500" />
                    <span>查看底部完整时间线</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
