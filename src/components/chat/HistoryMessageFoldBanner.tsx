import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  History,
  ChevronDown,
  ChevronUp,
  Clock,
  Radio,
  Camera,
  ShieldCheck,
  FileSpreadsheet,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { ChatMessageItem } from '../../utils/chatHub';

export interface HistoryMessageFoldBannerProps {
  /** 折叠的消息总数 */
  foldedCount: number;
  /** 当前房间总消息数 */
  totalCount: number;
  /** 是否处于展开状态 */
  isExpanded: boolean;
  /** 切换展开/折叠状态 */
  onToggleExpand: () => void;
  /** 折叠的历史消息集合（用于计算时间段与分类构成） */
  foldedMessages: ChatMessageItem[];
  /** 是否开启自动折叠功能（开关控制） */
  autoFoldEnabled?: boolean;
  /** 切换自动折叠功能 */
  onToggleAutoFold?: () => void;
}

export const HistoryMessageFoldBanner: React.FC<HistoryMessageFoldBannerProps> = ({
  foldedCount,
  totalCount,
  isExpanded,
  onToggleExpand,
  foldedMessages,
  autoFoldEnabled = true,
  onToggleAutoFold
}) => {
  if (foldedCount <= 0) return null;

  // 统计历史消息的时间跨度与类型分布
  const startTime = foldedMessages[0]?.time || '';
  const endTime = foldedMessages[foldedMessages.length - 1]?.time || '';

  const systemNotices = foldedMessages.filter(
    (m) => m.type === 'system_notice' || m.senderRole === 'system'
  ).length;
  const voiceCount = foldedMessages.filter((m) => m.type === 'voice').length;
  const imageCount = foldedMessages.filter(
    (m) => m.type === 'image' || m.text?.includes('[IMAGE]:')
  ).length;
  const cardCount = foldedMessages.filter(
    (m) => m.type === 'status_change' || m.exceptionWorkflow || m.text?.startsWith('【餐车交互·')
  ).length;

  return (
    <div className="w-full my-2 space-y-2 select-none" data-purpose="history-message-fold-container">
      {/* 折叠模式下的优雅胶囊容器 */}
      {!isExpanded ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="rounded-2xl border border-neutral-200/90 bg-white/95 p-3 shadow-2xs transition-all duration-200 hover:border-neutral-300 hover:shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            {/* 左侧说明与状态徽章 */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0 border border-neutral-200/70">
                <History className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-neutral-900 tracking-tight">
                    早前协同记录已智能折叠
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10.5px] tabular-nums font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200/80">
                    {foldedCount} 条历史
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5 truncate">
                  {startTime && endTime && (
                    <span className="flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3 text-neutral-400 shrink-0" />
                      <span>{startTime === endTime ? startTime : `${startTime} ~ ${endTime}`}</span>
                    </span>
                  )}
                  {startTime && endTime && <span>·</span>}
                  <span>已自动隐藏早前对话以保持界面清爽</span>
                </div>
              </div>
            </div>

            {/* 右侧交互主按钮 */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onToggleExpand}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-2xs transition-all active:scale-[0.97] cursor-pointer"
                title="展开历史协同记录"
              >
                <span>展开记录</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 分类元信息筹码条 */}
          {(systemNotices > 0 || voiceCount > 0 || imageCount > 0 || cardCount > 0) && (
            <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-neutral-400 font-medium">折叠包含：</span>
                {systemNotices > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neutral-50 text-neutral-600 border border-neutral-200/60 text-[10px]">
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                    系统通知 {systemNotices}
                  </span>
                )}
                {voiceCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neutral-50 text-neutral-600 border border-neutral-200/60 text-[10px]">
                    <Radio className="w-2.5 h-2.5 text-amber-600" />
                    语音对讲 {voiceCount}
                  </span>
                )}
                {imageCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neutral-50 text-neutral-600 border border-neutral-200/60 text-[10px]">
                    <Camera className="w-2.5 h-2.5 text-blue-600" />
                    存证图像 {imageCount}
                  </span>
                )}
                {cardCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neutral-50 text-neutral-600 border border-neutral-200/60 text-[10px]">
                    <FileSpreadsheet className="w-2.5 h-2.5 text-purple-600" />
                    工单/状态 {cardCount}
                  </span>
                )}
              </div>

              {onToggleAutoFold && (
                <button
                  type="button"
                  onClick={onToggleAutoFold}
                  className="text-[10.5px] text-neutral-400 hover:text-neutral-700 transition cursor-pointer flex items-center gap-1 ml-auto shrink-0"
                  title="切换自动折叠设置"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>{autoFoldEnabled ? '自动折叠中' : '常态展示'}</span>
                </button>
              )}
            </div>
          )}
        </motion.div>
      ) : (
        /* 展开模式下的置顶精简状态条 */
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-neutral-200/70 bg-neutral-100/80 px-3 py-1.5 flex items-center justify-between text-xs text-neutral-600"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium">已呈现全部历史消息 (早前 {foldedCount} 条，总计 {totalCount} 条)</span>
          </div>

          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 text-[11px] font-semibold transition active:scale-[0.98] cursor-pointer shadow-2xs"
            title="收起早前历史记录"
          >
            <span>收起历史</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* 视觉分界分割线：指引实况最新动态起点 */}
      <div className="flex items-center justify-center my-3 text-[10px] text-neutral-400 gap-3 tabular-nums">
        <div className="h-px bg-neutral-200/80 flex-1" />
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100/90 text-neutral-500 border border-neutral-200/60 shadow-2xs">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="font-sans font-medium">实况协同会话 · 以下为最新动态</span>
        </div>
        <div className="h-px bg-neutral-200/80 flex-1" />
      </div>
    </div>
  );
};
