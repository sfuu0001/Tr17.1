import React from 'react';
import {
  CornerUpLeft,
  Eye,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';
import { ChatMessageItem, ChatRole } from '../../utils/chatHub';

export interface FeishuMessageActionsProps {
  message: ChatMessageItem;
  activeRole: ChatRole;
  isSelf: boolean;
  onQuoteReply: (msg: ChatMessageItem) => void;
  onOpenReadReceipt: (msg: ChatMessageItem) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onRecallMessage?: (msg: ChatMessageItem) => void;
  showToast?: (title: string, desc?: string) => void;
}

const QUICK_EMOJIS = ['👍', '⚡', '🤝', '❤️'];

export const FeishuMessageActions: React.FC<FeishuMessageActionsProps> = ({
  message,
  activeRole,
  isSelf,
  onQuoteReply,
  onOpenReadReceipt,
  onToggleReaction,
  onRecallMessage,
  showToast = () => {}
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy =
      message.text ||
      message.voiceTranscribed ||
      message.statusChangeInfo?.title ||
      '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      showToast('已复制内容', '消息文本已拷贝至剪贴板');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 检查是否可在 2 分钟内撤回
  const canRecall =
    !message.isRecalled &&
    (isSelf || activeRole === 'platform') &&
    message.senderRole !== 'system' &&
    Date.now() - (message.timestamp || Date.now()) <= 2 * 60 * 1000;

  return (
    <div
      className={`flex items-center gap-0.5 bg-white/90 backdrop-blur-xl px-2 py-1 rounded-full shadow-lg shadow-black/10 border border-neutral-200/80 ring-1 ring-black/5 text-neutral-600 animate-in fade-in zoom-in-95 duration-150 z-30 ${
        isSelf ? 'origin-bottom-right' : 'origin-bottom-left'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 快捷表情表态按钮群 */}
      <div className="flex items-center gap-0.5 pr-1 border-r border-neutral-200/80">
        {QUICK_EMOJIS.map((emoji) => {
          const hasReacted = message.reactions?.[emoji]?.includes(activeRole);
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => onToggleReaction(message.id, emoji)}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition cursor-pointer hover:scale-125 active:scale-95 ${
                hasReacted ? 'bg-amber-100/90 ring-1 ring-amber-400/80' : 'hover:bg-neutral-100/80'
              }`}
              title={`表态 ${emoji}`}
            >
              <span>{emoji}</span>
            </button>
          );
        })}
      </div>

      {/* 引用回复按钮 */}
      <button
        type="button"
        onClick={() => onQuoteReply(message)}
        className="w-6 h-6 rounded-md hover:bg-neutral-100/80 flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition cursor-pointer"
        title="引用回复"
      >
        <CornerUpLeft className="w-3.5 h-3.5 stroke-[1.5]" />
      </button>

      {/* 撤回消息 (2分钟内有效) */}
      {canRecall && onRecallMessage && (
        <button
          type="button"
          onClick={() => onRecallMessage(message)}
          className="w-6 h-6 rounded-md hover:bg-rose-50/90 flex items-center justify-center text-neutral-500 hover:text-rose-600 transition cursor-pointer"
          title="撤回消息 (2分钟内)"
        >
          <RotateCcw className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>
      )}

      {/* 查看已读明细 */}
      <button
        type="button"
        onClick={() => onOpenReadReceipt(message)}
        className="w-6 h-6 rounded-md hover:bg-neutral-100/80 flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition cursor-pointer"
        title="已读/未读明细"
      >
        <Eye className="w-3.5 h-3.5 stroke-[1.5]" />
      </button>

      {/* 复制文本 */}
      <button
        type="button"
        onClick={handleCopy}
        className="w-6 h-6 rounded-md hover:bg-neutral-100/80 flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition cursor-pointer"
        title="复制消息"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2]" />
        ) : (
          <Copy className="w-3.5 h-3.5 stroke-[1.5]" />
        )}
      </button>
    </div>
  );
};

export interface FeishuReactionsRowProps {
  reactions?: Record<string, string[]>;
  activeRole: ChatRole;
  onToggleReaction: (emoji: string) => void;
}

export const FeishuReactionsRow: React.FC<FeishuReactionsRowProps> = ({
  reactions,
  activeRole,
  onToggleReaction
}) => {
  if (!reactions || Object.keys(reactions).length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(reactions).map(([emoji, roles]) => {
        if (!roles || roles.length === 0) return null;
        const hasReacted = roles.includes(activeRole);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggleReaction(emoji)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs tabular-nums transition cursor-pointer border shadow-2xs backdrop-blur-xs ${
              hasReacted
                ? 'bg-amber-50/90 text-amber-900 border-amber-300/90 font-semibold ring-1 ring-amber-400/30'
                : 'bg-white/90 text-neutral-700 border-neutral-200/90 hover:bg-neutral-50/90 font-medium'
            }`}
          >
            <span>{emoji}</span>
            <span className="text-[10px] opacity-80">{roles.length}</span>
          </button>
        );
      })}
    </div>
  );
};
