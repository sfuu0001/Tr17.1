import React from 'react';
import {
  Award,
  Sparkles,
  Zap,
  CheckCircle2,
  Gift,
  Star,
  ShieldCheck,
  ChevronRight,
  X
} from 'lucide-react';
import { RiderLevelInfo, RiderQuest } from '../../types/rider';

interface RiderLevelQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelInfo: RiderLevelInfo;
  quests: RiderQuest[];
  onClaimQuest: (questId: string) => void;
  showToast: (msg: string) => void;
}

export const RiderLevelQuestModal: React.FC<RiderLevelQuestModalProps> = ({
  isOpen,
  onClose,
  levelInfo,
  quests,
  onClaimQuest,
  showToast
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-[#37352f] w-full max-w-md rounded-[4px] border border-[#e6e6e4] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8] flex items-center justify-center font-bold shadow-2xs">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-[#37352f]">
                  {levelInfo.levelTitle}
                </span>
                <span className="text-[10px] bg-[#fbf3db] text-[#8f6412] px-1.5 py-0.2 rounded font-mono font-bold border border-[#ecd9a8]">
                  LV.{levelInfo.levelGrade}
                </span>
              </div>
              <p className="text-[10.5px] text-[#787774]">
                连续跑单 {levelInfo.streakDays} 天 · 专送优先派单权生效中
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[3px] hover:bg-[#efefed] text-[#787774] hover:text-[#37352f] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
          {/* Level Progress Card */}
          <div className="p-3 bg-[#fafafa] rounded-[3px] border border-[#e6e6e4] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#787774]">经验成长值</span>
              <span className="font-mono text-[#8f6412] font-semibold">
                {levelInfo.currentExp} / {levelInfo.nextLevelExp} EXP
              </span>
            </div>
            <div className="w-full bg-[#e6e6e4] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#2b593f] h-full transition-all duration-300"
                style={{ width: `${(levelInfo.currentExp / levelInfo.nextLevelExp) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10.5px] text-[#787774] pt-0.5">
              <span>准时率: <strong className="text-[#2b593f] font-mono">{levelInfo.onTimeRate}%</strong></span>
              <span>评分: <strong className="text-[#8f6412] font-mono">{levelInfo.fiveStarRating}★</strong></span>
              <span>累计送达: <strong className="text-[#37352f] font-mono">{levelInfo.totalOrdersDelivered}单</strong></span>
            </div>
          </div>

          {/* Daily Quests List */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-[#37352f] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#d9730d]" />
              <span>今日骑士专属挑战任务:</span>
            </span>

            <div className="space-y-2">
              {quests.map((quest) => (
                <div
                  key={quest.id}
                  className="p-3 bg-[#fafafa] rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-[#37352f]">{quest.title}</span>
                      <span className="text-[10px] bg-[#fbf3db] text-[#8f6412] px-1.5 py-0.2 rounded border border-[#ecd9a8]">
                        {quest.rewardText}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[#787774]">{quest.desc}</p>
                    <div className="text-[10px] text-[#9b9a97] font-mono">
                      进度: {quest.currentCount} / {quest.targetCount}
                    </div>
                  </div>

                  {quest.isClaimed ? (
                    <span className="px-3 py-1 bg-[#efefed] text-[#9b9a97] rounded-[3px] text-[11px] font-medium shrink-0">
                      已领取
                    </span>
                  ) : quest.isCompleted ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClaimQuest(quest.id);
                        showToast(`成功领取奖励：${quest.rewardText}！已发放至您的账户。`);
                      }}
                      className="px-3 py-1 bg-[#2b593f] hover:bg-[#204430] active:scale-98 text-white rounded-[3px] text-[11px] font-medium shrink-0 cursor-pointer shadow-2xs transition-all flex items-center gap-1"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>领奖励</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1 bg-[#efefed] text-[#787774] rounded-[3px] text-[11px] shrink-0 font-mono">
                      进行中
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 bg-white hover:bg-[#efefed] border border-[#d3d1cb] text-[#37352f] rounded-[3px] font-medium text-xs cursor-pointer transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
