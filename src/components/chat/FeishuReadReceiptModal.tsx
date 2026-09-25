import React, { useState } from 'react';
import {
  X,
  CheckCheck,
  Clock,
  BellRing,
  Store,
  User,
  Bike,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  ChatMessageItem,
  RoleMemberReadInfo,
  MessageReadReceiptSummary,
  dingRemindMember,
  ChatRole
} from '../../utils/chatHub';
import { Order } from '../../types';

export interface FeishuReadReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ChatMessageItem | null;
  summary: MessageReadReceiptSummary | null;
  order?: Order;
  activeRole: ChatRole;
  showToast?: (title: string, desc?: string) => void;
  playChimeSound?: () => void;
}

export const FeishuReadReceiptModal: React.FC<FeishuReadReceiptModalProps> = ({
  isOpen,
  onClose,
  message,
  summary,
  order,
  activeRole,
  showToast = () => {},
  playChimeSound = () => {}
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'read' | 'unread'>('all');
  const [dingedRoles, setDingedRoles] = useState<Record<string, boolean>>({});

  if (!isOpen || !message || !summary) return null;

  const handleDing = (targetRole: ChatRole, memberName: string) => {
    if (dingedRoles[targetRole]) {
      showToast('已发送过催阅', `您已向【${memberName}】发送过强提醒，请稍候`);
      return;
    }

    const res = dingRemindMember(message.orderNo, message.id, targetRole, activeRole);
    if (res.success) {
      setDingedRoles((prev) => ({ ...prev, [targetRole]: true }));
      playChimeSound();
      showToast('DING 催阅成功', res.message);
    }
  };

  const getRoleIcon = (role: ChatRole) => {
    switch (role) {
      case 'merchant':
        return <Store className="w-4 h-4 text-amber-700 stroke-[1.5]" />;
      case 'user':
        return <User className="w-4 h-4 text-emerald-700 stroke-[1.5]" />;
      case 'rider':
        return <Bike className="w-4 h-4 text-sky-700 stroke-[1.5]" />;
      case 'platform':
        return <ShieldCheck className="w-4 h-4 text-indigo-700 stroke-[1.5]" />;
      default:
        return <User className="w-4 h-4 text-neutral-700 stroke-[1.5]" />;
    }
  };

  const displayedMembers =
    activeTab === 'read'
      ? summary.readMembers
      : activeTab === 'unread'
      ? summary.unreadMembers
      : [...summary.readMembers, ...summary.unreadMembers];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/15 border border-neutral-200/90 ring-1 ring-black/5 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏：飞书风格纯净排版 */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-100 bg-neutral-50/70 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
              <CheckCheck className="w-3.5 h-3.5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center gap-1.5">
                <span>消息已读状态明细</span>
                <span className="text-[11px] tabular-nums font-medium text-neutral-400">
                  (共 {summary.totalParticipants} 位协同成员)
                </span>
              </h3>
              <p className="text-[11px] text-neutral-500 tabular-nums font-normal">
                {message.timeExact || message.time} · 发送人: {message.senderName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 flex items-center justify-center transition cursor-pointer"
            title="关闭"
          >
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        {/* 消息预览缩略卡片 */}
        <div className="px-4 py-2.5 bg-neutral-50/50 border-b border-neutral-100 text-[12px] text-neutral-600 flex items-center gap-2">
          <span className="tabular-nums text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-white/90 border border-neutral-200 text-neutral-700 shrink-0 shadow-3xs">
            原消息
          </span>
          <span className="truncate text-neutral-800 font-normal">
            {message.type === 'voice'
              ? `[语音消息 ${message.voiceDuration || 5}秒] ${message.voiceTranscribed || ''}`
              : message.type === 'image'
              ? `[拍照存证留样] ${message.imageTitle || ''}`
              : message.type === 'status_change'
              ? `[状态变更] ${message.statusChangeInfo?.title || ''}`
              : message.text || '已发送协同指令'}
          </span>
        </div>

        {/* 飞书风格选项卡：全部 / 已读 / 未读 */}
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-1 border-b border-neutral-100 bg-white/80">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-neutral-900 text-white font-bold shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 font-medium'
            }`}
          >
            <span>全部成员</span>
            <span className={`text-[10px] tabular-nums px-1 rounded font-semibold ${activeTab === 'all' ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}>
              {summary.totalParticipants}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('read')}
            className={`px-3 py-1.5 text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'read'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 font-medium'
            }`}
          >
            <span>已读</span>
            <span className={`text-[10px] tabular-nums px-1 rounded font-semibold ${activeTab === 'read' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'}`}>
              {summary.readCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`px-3 py-1.5 text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'unread'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 font-medium'
            }`}
          >
            <span>未读</span>
            <span className={`text-[10px] tabular-nums px-1 rounded font-semibold ${activeTab === 'unread' ? 'bg-amber-700 text-amber-100' : 'bg-amber-50 text-amber-700 border border-amber-200/60'}`}>
              {summary.unreadCount}
            </span>
          </button>
        </div>

        {/* 成员详细列表 */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 p-2 sm:p-3 space-y-1">
          {displayedMembers.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-400">
              暂无该状态下的成员
            </div>
          ) : (
            displayedMembers.map((member) => {
              const isDinged = Boolean(dingedRoles[member.role]);
              const canDing = !member.isRead && member.role !== activeRole;

              return (
                <div
                  key={member.role}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                        {getRoleIcon(member.role)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                          member.isRead ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-neutral-900 truncate">
                          {member.name}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${member.roleBadgeColor}`}
                        >
                          {member.roleLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5 tabular-nums">
                        {member.isRead ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[1.5]" />
                            <span className="text-emerald-700 font-medium">已读</span>
                            <span>·</span>
                            <span>{member.readTimeStr || '刚刚已读'}</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-500 stroke-[1.5]" />
                            <span className="text-amber-700 font-medium">尚未阅读</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 右侧动作：钉钉经典 DING 催阅 / 已读状态 */}
                  <div className="shrink-0 pl-2">
                    {member.isRead ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.8 rounded-lg border border-emerald-200">
                        <CheckCheck className="w-3 h-3 stroke-[1.5]" />
                        <span>已阅</span>
                      </span>
                    ) : canDing ? (
                      <button
                        type="button"
                        onClick={() => handleDing(member.role, member.name)}
                        disabled={isDinged}
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shadow-2xs ${
                          isDinged
                            ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                            : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
                        }`}
                        title="向未读成员发送协同强提醒 (DING)"
                      >
                        <BellRing className="w-3 h-3 stroke-[1.5]" />
                        <span>{isDinged ? '已DING提醒' : '一键DING'}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] tabular-nums text-neutral-400 bg-neutral-100 px-2 py-0.8 rounded-lg">
                        待查看
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部信息提示 */}
        <div className="px-4 py-2.5 bg-neutral-50/90 border-t border-neutral-100 text-[11px] text-neutral-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>三端协同信令链路：状态毫秒级热同步</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-700 hover:text-black font-medium cursor-pointer"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
