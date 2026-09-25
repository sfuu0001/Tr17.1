/* ============================================================================
 * TableMembersPanel —— 同桌成员管理面板（T3-4）
 * ----------------------------------------------------------------------------
 * SPEC §2.6：
 *  - 权限分层：me.authority === 'manage' 才显示管理操作列
 *  - presence 圆点：online=olive / idle=amber / offline=neutral（离线仍可移出）
 *  - 脱敏纪律：列表只出现 maskedId / grantedByMasked
 *  - 数据回显纪律：变更后不手动 setState，统一 TABLE_SESSION_MUTATED 驱动
 *  - 顾客互不可见：不渲染他人 lastNode
 * ==========================================================================*/

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DiningParticipant, PresenceState } from '../../types/tableSession';
import {
  setParticipantAuthority,
  removeParticipant,
  transferOwnership
} from '../../utils/tableSessionEngine';
import { useTableSessionUi } from './useTableSessionUi';

interface TableMembersPanelProps {
  open: boolean;
  onClose: () => void;
  showToast?: (msg: string) => void;
}

const PRESENCE_DOT: Record<PresenceState, { cls: string; label: string }> = {
  online: { cls: 'bg-status-olive', label: '在线' },
  idle: { cls: 'bg-accent-orange', label: '离开' },
  offline: { cls: 'bg-border-main', label: '离线' }
};

const GRANT_SOURCE_LABEL: Record<DiningParticipant['grantSource'], string> = {
  self_bind: '首绑',
  delegated: '授权加入',
  system_elevated: '系统提升'
};

export function TableMembersPanel({ open, onClose, showToast }: TableMembersPanelProps) {
  const { activeSession, myParticipant, identity, actions } = useTableSessionUi();
  const [confirmTarget, setConfirmTarget] = useState<{
    kind: 'remove' | 'transfer';
    participant: DiningParticipant;
  } | null>(null);

  if (!activeSession || !myParticipant || !identity) return null;

  const isManager = myParticipant.authority === 'manage';
  const isOwner = myParticipant.role === 'owner';
  const members = activeSession.participants.filter((p) => !p.removedAt);
  const activeCount = members.filter((p) => p.presence !== 'offline').length;

  const handleAuthorityToggle = (target: DiningParticipant) => {
    const next = target.authority === 'manage' ? 'order_only' : 'manage';
    const res = setParticipantAuthority({
      sessionId: activeSession.sessionId,
      actorId: identity.participantId,
      targetId: target.participantId,
      authority: next
    });
    showToast?.(res.message);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-dark-container/50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-sm bg-page-bg flex flex-col"
            role="dialog"
            aria-label="同桌成员管理"
          >
            {/* 头部 */}
            <div className="bg-dark-container px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">
                  {activeSession.tableCode} 号桌 · {activeCount}/{members.length} 人在线
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  你是{isOwner ? '桌主' : '成员'} ·{' '}
                  {isManager ? '拥有管理权限' : '仅可点餐'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-console flex items-center justify-center text-white/70 hover:text-white"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            {/* 成员列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {members.map((p) => {
                const dot = PRESENCE_DOT[p.presence];
                const isSelf = p.participantId === identity.participantId;
                const manageable = isManager && !isSelf;
                return (
                  <div
                    key={p.participantId}
                    className={`bg-card-bg border border-border-main rounded-console p-4 ${
                      p.presence === 'offline' ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${dot.cls}`} aria-label={dot.label} />
                      <span className="font-mono text-sm font-medium text-text-prominent">
                        {p.maskedId}
                      </span>
                      {isSelf && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-page-bg text-text-muted">
                          我
                        </span>
                      )}
                      {p.role === 'owner' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-accent-orange text-white">
                          桌主
                        </span>
                      )}
                      <span className="ml-auto text-xs text-text-muted">{dot.label}</span>
                    </div>

                    <div className="text-xs text-text-muted space-y-1">
                      <p>
                        权限：{p.authority === 'manage' ? '管理' : '仅点餐'} · 来源：
                        {GRANT_SOURCE_LABEL[p.grantSource]}
                        {p.grantedByMasked && `（${p.grantedByMasked} 授权）`}
                      </p>
                      <p>加入于 {new Date(p.joinedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>

                    {/* 管理操作列（仅 manage 权限可见） */}
                    {manageable && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border-main">
                        {p.role !== 'owner' && (
                          <button
                            onClick={() => handleAuthorityToggle(p)}
                            className="h-8 px-3 rounded-console bg-page-bg border border-border-main text-xs text-text-secondary"
                          >
                            {p.authority === 'manage' ? '设为仅点餐' : '给予管理权限'}
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmTarget({ kind: 'remove', participant: p })}
                          className="h-8 px-3 rounded-console bg-status-terracotta/10 border border-status-terracotta text-xs text-status-terracotta"
                        >
                          移出同桌
                        </button>
                        {isOwner && p.role !== 'owner' && (
                          <button
                            onClick={() => setConfirmTarget({ kind: 'transfer', participant: p })}
                            className="h-8 px-3 rounded-console bg-slate-blue text-xs text-white"
                          >
                            移交桌主
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 仅点餐者可见的升级入口 */}
              {!isManager && (
                <div className="bg-card-bg border border-border-main rounded-console p-4 text-center">
                  <p className="text-xs text-text-secondary">
                    如需协助点餐或管理成员，可向桌主申请管理权限
                  </p>
                </div>
              )}
            </div>

            {/* 二次确认层 */}
            <AnimatePresence>
              {confirmTarget && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-dark-container/60 flex items-center justify-center p-6"
                >
                  <div className="w-full max-w-xs bg-card-bg rounded-console-xl p-6 text-center">
                    {confirmTarget.kind === 'remove' ? (
                      <>
                        <p className="text-sm font-bold text-text-prominent mb-2">
                          确认移出 {confirmTarget.participant.maskedId}？
                        </p>
                        <p className="text-xs text-text-muted mb-5">
                          移出后 TA 将立即无法在本桌下单
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setConfirmTarget(null)}
                            className="flex-1 h-10 rounded-console border border-border-main text-sm text-text-secondary"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => {
                              const res = removeParticipant({
                                sessionId: activeSession.sessionId,
                                actorId: identity.participantId,
                                targetId: confirmTarget.participant.participantId,
                                reason: '成员移出'
                              });
                              showToast?.(res.message);
                              setConfirmTarget(null);
                            }}
                            className="flex-1 h-10 rounded-console bg-status-terracotta text-white text-sm font-medium"
                          >
                            确认移出
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-text-prominent mb-2">
                          确认将桌主移交给 {confirmTarget.participant.maskedId}？
                        </p>
                        <p className="text-xs text-status-terracotta mb-5">
                          此操作不可撤销，你将变为普通成员（仅点餐）
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setConfirmTarget(null)}
                            className="flex-1 h-10 rounded-console border border-border-main text-sm text-text-secondary"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => {
                              const res = transferOwnership({
                                sessionId: activeSession.sessionId,
                                toParticipantId: confirmTarget.participant.participantId,
                                actorId: identity.participantId
                              });
                              showToast?.(res.message);
                              setConfirmTarget(null);
                            }}
                            className="flex-1 h-10 rounded-console bg-slate-blue text-white text-sm font-medium"
                          >
                            确认移交
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
