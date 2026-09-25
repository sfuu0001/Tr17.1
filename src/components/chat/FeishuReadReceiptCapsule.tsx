import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  BellRing,
  Store,
  User,
  Bike,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  ChatMessageItem,
  MessageReadReceiptSummary,
  getMessageReadReceiptSummary,
  ChatRole
} from '../../utils/chatHub';
import { Order } from '../../types';
import { FeishuReadReceiptModal } from './FeishuReadReceiptModal';

export interface FeishuReadReceiptCapsuleProps {
  message: ChatMessageItem;
  order?: Order;
  activeRole: ChatRole;
  isFirstMessage?: boolean;
  isSelf: boolean;
  compact?: boolean;
  showToast?: (title: string, desc?: string) => void;
  playChimeSound?: () => void;
  onOpenModal?: () => void;
}

export const FeishuReadReceiptCapsule: React.FC<FeishuReadReceiptCapsuleProps> = ({
  message,
  order,
  activeRole,
  isFirstMessage = false,
  isSelf,
  compact = false,
  showToast = () => {},
  playChimeSound = () => {},
  onOpenModal
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenDetail = () => {
    if (onOpenModal) {
      onOpenModal();
    } else {
      setIsModalOpen(true);
    }
  };

  // 计算消息的已读未读摘要
  const summary: MessageReadReceiptSummary = getMessageReadReceiptSummary(message, order, activeRole);

  // 飞书式双色/环形微徽标
  const renderFeishuRingIcon = () => {
    if (summary.isAllRead) {
      return <CheckCheck className="w-2.5 h-2.5 text-emerald-600 stroke-[2]" />;
    }
    if (summary.readCount > 0) {
      // 部分已读：类似飞书/钉钉的已读进度环
      return (
        <svg className="w-2.5 h-2.5 text-amber-600 -rotate-90" viewBox="0 0 16 16">
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="transparent"
            className="text-neutral-200"
          />
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="transparent"
            strokeDasharray={37.7}
            strokeDashoffset={37.7 * (1 - summary.readCount / Math.max(1, summary.totalParticipants))}
            className="text-amber-500 transition-all duration-300"
          />
        </svg>
      );
    }
    return <Check className="w-2.5 h-2.5 text-neutral-400 stroke-[1.5]" />;
  };

  return (
    <>
      <div className="flex flex-col items-end">
        {/* 飞书 / 钉钉标志性已读未读交互胶囊 (支持极简微标模式降噪) */}
        {compact ? (
          <button
            type="button"
            onClick={handleOpenDetail}
            className={`group inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] tabular-nums tracking-tight transition-all duration-150 cursor-pointer select-none border backdrop-blur-xs shadow-3xs active:scale-95 ${
              summary.isAllRead
                ? 'bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-800 border-emerald-200/80'
                : summary.readCount > 0
                ? 'bg-amber-50/80 hover:bg-amber-100/90 text-amber-900 border-amber-200/80'
                : 'bg-neutral-100/80 hover:bg-neutral-200/90 text-neutral-600 border-neutral-200/80'
            }`}
            title={`点击查看已读详情 (${summary.readCount}/${summary.totalParticipants})`}
          >
            {renderFeishuRingIcon()}
            <span className="font-sans font-semibold text-[9.5px]">
              {summary.isAllRead ? '已读' : `${summary.readCount}/${summary.totalParticipants}`}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenDetail}
            className={`group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] tabular-nums tracking-tight transition-all duration-150 cursor-pointer select-none border shadow-2xs backdrop-blur-xs active:scale-95 ${
              summary.isAllRead
                ? 'bg-emerald-50/90 hover:bg-emerald-100 text-emerald-800 border-emerald-200/80 hover:border-emerald-300'
                : summary.readCount > 0
                ? 'bg-amber-50/90 hover:bg-amber-100 text-amber-900 border-amber-200/80 hover:border-amber-300'
                : 'bg-neutral-100/90 hover:bg-neutral-200 text-neutral-600 border-neutral-200/80'
            }`}
            title="点击查看各角色详细已读时间与未读催阅明细"
          >
            {renderFeishuRingIcon()}

            {/* 状态文字展示：全员已读 或 商家已读·客户端已读·骑手未读 */}
            <span className="font-sans font-semibold">
              {summary.isAllRead
                ? `全部已读 (${summary.readCount}/${summary.totalParticipants})`
                : summary.readCount > 0
                ? `${summary.readCount}人已读 · ${summary.unreadRolesSummary}`
                : `未读 (0/${summary.totalParticipants})`}
            </span>

            <ChevronRight className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {/* 若为首条消息 (订单创建 / 商家接单启动锚点)，展示钉钉/飞书风格的【三端全链路触达看板】 */}
        {isFirstMessage && (
          <div className="mt-2 w-full max-w-sm rounded-2xl bg-white/90 backdrop-blur-xl border border-neutral-200/80 p-3 shadow-sm space-y-2 text-left">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-neutral-900 tracking-tight">
                  首条协同启动 · 三端已读态
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenDetail}
                className="text-[10px] text-neutral-500 hover:text-neutral-900 tabular-nums flex items-center gap-0.5 cursor-pointer font-medium"
              >
                <span>明细</span>
                <ChevronRight className="w-3 h-3 stroke-[1.5]" />
              </button>
            </div>

            {/* 三端状态横向矩阵：餐车商家、客户端食客、专线骑手 */}
            <div className="grid grid-cols-3 gap-1.5">
              {summary.readMembers
                .concat(summary.unreadMembers)
                .slice(0, 3)
                .map((member) => (
                  <div
                    key={member.role}
                    onClick={handleOpenDetail}
                    className={`p-2 rounded-xl border flex flex-col justify-between transition cursor-pointer shadow-3xs backdrop-blur-xs ${
                      member.isRead
                        ? 'bg-emerald-50/60 border-emerald-200/80 hover:bg-emerald-50/90'
                        : 'bg-amber-50/60 border-amber-200/80 hover:bg-amber-50/90'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-neutral-800 truncate">
                        {member.roleLabel.replace('端', '')}
                      </span>
                      {member.isRead ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[9.5px] tabular-nums">
                      {member.isRead ? (
                        <span className="text-emerald-700 font-medium">
                          {member.readTimeStr ? member.readTimeStr.slice(0, 5) : '已读'}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium">未读</span>
                      )}
                      {!member.isRead && member.role !== activeRole && (
                        <span className="text-[8.5px] text-amber-800 underline">DING</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* 弹出的飞书/钉钉已读未读明细抽屉 Modal */}
      <FeishuReadReceiptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        message={message}
        summary={summary}
        order={order}
        activeRole={activeRole}
        showToast={showToast}
        playChimeSound={playChimeSound}
      />
    </>
  );
};
