import React from 'react';
import {
  PersonStanding,
  Megaphone,
  MessageSquare,
  Check,
  Pause,
  X,
  Recycle,
  LockOpen,
  PauseCircle,
  RotateCcw,
  Trash2,
  Clock3,
  type LucideIcon
} from 'lucide-react';
import { QueueTicket } from '../../../types';
import {
  OVERDUE_META,
  QUEUE_SERIES,
  TICKET_STATUS_META,
  WaitMetrics,
  formatClock,
  getProgressBarClass,
  getTicketSubLabel,
  getTicketTypeLabel,
  getWaitProgress,
  maskPhone
} from './callingTokens';

/* ============================================================================
 * ⑤ CORE QUEUE TICKETS MATRIX — 工业级排队票据矩阵  [RAD OPS]
 * ----------------------------------------------------------------------------
 * 骨架（参考稿 (4) section 5 对齐）：
 *   卡头（等宽 text-3xl 大号排队号 + 桌型/柜位 + 状态徽章 + 顺位读数）
 *   → 顾客元信息条（超时态换成红调底）→ 等位诊断三行 → 耗时进度条
 *   → 备注 / 自定义时长入口 → 动作控制组（顶部细分割线）
 *
 * 状态语义色分工（严格不跨用途借用）：
 *   waiting=blue · called=orange · overdue=red · temp_void=amber ·
 *   perm_void=灰 · seated/completed=green
 * 超时卡片额外使用 2px 红色描边整卡高亮，保证在 3 列网格中第一眼可辨。
 * 三端：1 列 → md 2 列 → xl 3 列。
 * ========================================================================== */

export interface CallingTicketGridProps {
  tickets: QueueTicket[];
  metricsOf: (ticket: QueueTicket) => WaitMetrics;
  onCall: (ticket: QueueTicket) => void;
  onRemind: (ticket: QueueTicket) => void;
  onSeat: (ticketId: string) => void;
  onVerifyOut: (ticket: QueueTicket) => void;
  onPass: (ticketId: string) => void;
  onVoid: (ticket: QueueTicket, action: 'temp_void' | 'perm_void') => void;
  onRequeue: (ticketId: string, action: 'requeue' | 'recall') => void;
  onCustomWait: (ticket: QueueTicket) => void;
  onResetFilters: () => void;
}

type ActionSkin = 'call' | 'red' | 'white' | 'green' | 'redSubtle' | 'amberSubtle' | 'mutedDanger';

interface CardActionProps {
  icon?: LucideIcon;
  label: string;
  onClick: () => void;
  skin: ActionSkin;
  title?: string;
  pulse?: boolean;
}

const SKINS: Record<ActionSkin, string> = {
  call: 'bg-[#37352f] hover:bg-[#191817] text-white font-semibold shadow-2xs',
  red: 'bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-2xs',
  white: 'bg-white hover:bg-[#f7f7f5] border border-[#d3d1cb] text-[#37352f] font-semibold shadow-2xs',
  green: 'bg-[#2b593f] hover:bg-[#204430] text-white font-semibold shadow-2xs',
  redSubtle:
    'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white font-bold shadow-2xs',
  amberSubtle: 'bg-[#fdf8f4] border border-[#fae2a0] text-[#b06000] font-semibold shadow-2xs',
  mutedDanger:
    'bg-white border border-[#e6e6e4] text-[#787774] hover:text-rose-600 font-medium shadow-2xs'
};

const CardAction: React.FC<CardActionProps> = ({ icon: Icon, label, onClick, skin, title, pulse }) => (
  <button
    type="button"
    title={title || label}
    onClick={onClick}
    className={`h-7 px-3 rounded-full text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${SKINS[skin]}`}
  >
    {Icon && (
      <Icon
        className={`w-[14px] ${skin === 'call' ? 'text-amber-300' : ''} ${pulse ? 'animate-pulse' : ''}`}
        strokeWidth={2}
      />
    )}
    <span>{label}</span>
  </button>
);

const IconAction: React.FC<{ icon: LucideIcon; title: string; onClick: () => void }> = ({
  icon: Icon,
  title,
  onClick
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    className="h-7 w-7 bg-white border border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#787774] hover:text-[#37352f] rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
  >
    <Icon className="w-[14px] h-[14px]" strokeWidth={2} />
  </button>
);

const DiagnosticRow: React.FC<{ label: string; value: string; className?: string }> = ({
  label,
  value,
  className = 'text-rad-text-muted'
}) => (
  <div className={`flex items-center justify-between font-mono text-[11px] gap-2 ${className}`}>
    <span className="shrink-0">{label}</span>
    <span className="font-bold truncate">{value}</span>
  </div>
);

export const CallingTicketGrid: React.FC<CallingTicketGridProps> = ({
  tickets,
  metricsOf,
  onCall,
  onRemind,
  onSeat,
  onVerifyOut,
  onPass,
  onVoid,
  onRequeue,
  onCustomWait,
  onResetFilters
}) => {
  if (tickets.length === 0) {
    return (
      <section className="bg-rad-surface border border-rad-line rounded-rad p-8 shadow-xs text-center flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-rad border border-rad-line bg-rad-inset flex items-center justify-center">
          <Clock3 className="w-5 h-5 text-rad-text-muted" strokeWidth={1.8} />
        </div>
        <h3 className="text-sm font-bold text-rad-text-main">当前筛选条件下没有排队票据</h3>
        <p className="text-xs text-rad-text-muted">建议切换状态页签、渠道选择器，或清空搜索关键词</p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-1 h-7 px-3 bg-rad-dark text-white rounded-rad text-xs font-bold font-mono hover:bg-rad-dark-card transition-colors cursor-pointer"
        >
          重置全部筛选
        </button>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {tickets.map((ticket) => {
        const metrics = metricsOf(ticket);
        const isPickup = ticket.queueType === 'pickup';
        const isOverdue = ticket.status === 'waiting' && metrics.isOverdue;
        const isReady = ticket.status === 'waiting' && metrics.aheadCount === 0;
        const isVoided = ticket.status === 'temp_void' || ticket.status === 'perm_void';
        const isFinished = ticket.status === 'seated' || ticket.status === 'passed' || ticket.status === 'completed';

        const statusMeta = isOverdue
          ? OVERDUE_META
          : ticket.status === 'called'
          ? { ...TICKET_STATUS_META.called, label: `呼叫中 · 连叫${ticket.calledCount || 1}次` }
          : TICKET_STATUS_META[ticket.status];

        const progress = getWaitProgress(ticket, metrics);
        const progressClass = getProgressBarClass(ticket, metrics);

        const subLabelClass = isOverdue
          ? 'text-rad-red'
          : ticket.status === 'called'
          ? 'text-rad-orange'
          : isFinished
          ? 'text-rad-green'
          : 'text-rad-blue';

        return (
          <div
            key={ticket.id}
            className={`bg-white rounded-[4px] p-3.5 shadow-2xs transition-all flex flex-col justify-between ${
              isOverdue
                ? 'border-2 border-rose-500'
                : isPickup
                ? 'border-l-[4px] border-l-[#d9730d] border-[#e6e6e4] hover:border-[#37352f]'
                : 'border-l-[4px] border-l-[#37352f] border-[#e6e6e4] hover:border-[#37352f]'
            }`}
          >
            <div className="space-y-2.5">
              {/* 卡头 */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`font-mono text-3xl font-extrabold tracking-tight leading-none shrink-0 ${statusMeta.number}`}
                  >
                    {ticket.queueNo}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-rad-text-main truncate">
                      {getTicketTypeLabel(ticket)}
                    </div>
                    <div className={`font-mono text-[10px] font-semibold truncate ${subLabelClass}`}>
                      {getTicketSubLabel(ticket, metrics)}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`px-2.5 py-0.5 font-mono text-[10px] rounded-full font-bold uppercase inline-flex items-center gap-1 ${statusMeta.badge}`}
                  >
                    {statusMeta.dot && <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />}
                    <span className="whitespace-nowrap">{statusMeta.label}</span>
                  </span>
                  <div className="font-mono text-[10px] text-rad-text-muted mt-0.5 whitespace-nowrap">
                    {ticket.status === 'called' ? (
                      <>
                        提货码: <strong className="text-rad-text-main">#{ticket.queueNo.replace(/\D/g, '') || '0000'}</strong>
                      </>
                    ) : isVoided ? (
                      `作废 ${formatClock(ticket.voidAt)}`
                    ) : (
                      `前方 ${metrics.aheadCount} 桌`
                    )}
                  </div>
                </div>
              </div>

              {/* 顾客元信息条 */}
              <div
                className={`p-2 rounded-rad-sm flex items-center justify-between text-xs gap-2 ${
                  isOverdue
                    ? 'bg-rad-red-subtle/40 border border-rad-red/20'
                    : 'bg-rad-inset border border-rad-line-light'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <PersonStanding
                    className={`w-[15px] h-[15px] shrink-0 ${isOverdue ? 'text-rad-red' : 'text-rad-slate'}`}
                    strokeWidth={2}
                  />
                  <span className="font-semibold text-rad-text-main truncate">
                    {ticket.guestName || '现场顾客'}
                  </span>
                  <span className="font-mono text-rad-text-muted truncate">{maskPhone(ticket.phone)}</span>
                </div>
                <span className="font-mono text-[11px] text-rad-text-muted shrink-0">
                  {isPickup ? '入柜' : '取号'} {formatClock(ticket.takeTime || ticket.createdAt)}
                </span>
              </div>

              {/* 等位诊断 */}
              <div className="space-y-1.5 text-xs font-mono">
                <DiagnosticRow
                  label={isPickup ? '入柜保温时长' : '已等候时长'}
                  value={
                    isOverdue
                      ? `${ticket.waitTimeMin} 分钟 (超 ${ticket.waitTimeMin - metrics.standardMin}m)`
                      : `${ticket.waitTimeMin} 分钟`
                  }
                  className={isOverdue ? 'text-rad-red font-semibold' : 'text-rad-text-muted'}
                />
                <DiagnosticRow
                  label={isPickup ? '自提标准时效' : '商家设定标准'}
                  value={
                    ticket.customWaitMin
                      ? `${ticket.customWaitMin} 分钟 (已自定义)`
                      : isPickup
                      ? `${metrics.standardMin} 分钟内取餐最佳`
                      : `${metrics.standardMin} 分钟`
                  }
                />
                <DiagnosticRow
                  label={isOverdue ? '超时未到店提醒' : isPickup ? '母带广播播报' : '系统自动预估还需'}
                  value={
                    isFinished
                      ? '流程已归档'
                      : isVoided
                      ? ticket.voidReason || '作废已记录'
                      : isPickup
                      ? `正在扬声器第 ${ticket.calledCount || 1} 次循环`
                      : isReady
                      ? `约 ${metrics.remainingMinutes} 分钟 (即将翻台)`
                      : `约 ${metrics.remainingMinutes} 分钟`
                  }
                  className={
                    isOverdue
                      ? 'text-rad-red font-semibold'
                      : isReady || isPickup
                      ? 'text-rad-blue font-semibold'
                      : metrics.remainingMinutes > 10
                      ? 'text-rad-amber font-semibold'
                      : 'text-rad-text-main'
                  }
                />

                {/* 耗时进度条 */}
                <div className="w-full bg-rad-track h-1.5 rounded-[1px] overflow-hidden mt-1">
                  <div className={`h-full ${progressClass}`} style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* 备注 / 自定义时长入口 */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {ticket.note ? (
                  <span className="font-mono text-[10px] text-rad-text-muted bg-rad-inset border border-rad-line-light px-1.5 py-0.5 rounded-rad-sm truncate">
                    {ticket.note}
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-rad-text-muted">无附加备注</span>
                )}
                <button
                  type="button"
                  onClick={() => onCustomWait(ticket)}
                  className="font-mono text-[10px] text-rad-blue hover:text-rad-dark underline cursor-pointer shrink-0"
                  title="为该单单独设置等位/出餐标准时长"
                >
                  自定义时长
                </button>
              </div>
            </div>

            {/* 动作控制组 */}
            <div className="mt-3 pt-2.5 border-t border-rad-line-light flex items-center justify-between gap-1 flex-wrap">
              {ticket.status === 'waiting' && isOverdue && (
                <>
                  <CardAction icon={Megaphone} label="优先叫号" skin="red" onClick={() => onCall(ticket)} />
                  <CardAction
                    icon={RotateCcw}
                    label="顺延重排"
                    skin="white"
                    onClick={() => onRequeue(ticket.id, 'requeue')}
                  />
                  <IconAction icon={X} title="完全作废" onClick={() => onVoid(ticket, 'perm_void')} />
                </>
              )}

              {ticket.status === 'waiting' && !isOverdue && (
                <>
                  <div className="flex items-center gap-1.5">
                    <CardAction
                      icon={Megaphone}
                      label="叫号"
                      skin="call"
                      title="等位呼叫广播"
                      pulse
                      onClick={() => onCall(ticket)}
                    />
                    <CardAction icon={MessageSquare} label="提醒" skin="white" onClick={() => onRemind(ticket)} />
                    <CardAction icon={Check} label="入座" skin="white" onClick={() => onSeat(ticket.id)} />
                  </div>
                  <div className="flex items-center gap-1">
                    <IconAction icon={Pause} title="过号暂挂" onClick={() => onPass(ticket.id)} />
                    <IconAction icon={X} title="完全作废" onClick={() => onVoid(ticket, 'perm_void')} />
                  </div>
                </>
              )}

              {ticket.status === 'called' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <CardAction icon={Recycle} label="重呼" skin="call" title="再次语音呼叫" onClick={() => onCall(ticket)} />
                    {isPickup ? (
                      <CardAction
                        icon={LockOpen}
                        label="出库"
                        skin="green"
                        title="核销出库"
                        onClick={() => onVerifyOut(ticket)}
                      />
                    ) : (
                      <CardAction icon={Check} label="入座" skin="green" title="确认入座" onClick={() => onSeat(ticket.id)} />
                    )}
                    <CardAction
                      icon={PauseCircle}
                      label="暂挂"
                      skin="mutedDanger"
                      onClick={() => onPass(ticket.id)}
                    />
                  </div>
                  <IconAction icon={X} title="完全作废" onClick={() => onVoid(ticket, 'perm_void')} />
                </>
              )}

              {ticket.status === 'temp_void' && (
                <>
                  <CardAction
                    icon={RotateCcw}
                    label="恢复"
                    skin="amberSubtle"
                    title="一键恢复叫号"
                    onClick={() => onRequeue(ticket.id, 'recall')}
                  />
                  <CardAction
                    icon={Trash2}
                    label="作废"
                    skin="redSubtle"
                    title="完全作废"
                    onClick={() => onVoid(ticket, 'perm_void')}
                  />
                </>
              )}

              {ticket.status === 'perm_void' && (
                <CardAction
                  icon={RotateCcw}
                  label="恢复"
                  skin="white"
                  title="撤销作废 · 恢复队列"
                  onClick={() => onRequeue(ticket.id, 'requeue')}
                />
              )}

              {isFinished && (
                <span className="font-mono text-[10px] text-rad-text-muted px-1 py-1">
                  {ticket.status === 'seated' ? '已入座 · 流程归档' : '已过号 · 可重新入队'}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default CallingTicketGrid;
