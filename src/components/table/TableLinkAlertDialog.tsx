/* ============================================================================
 * TableLinkAlertDialog —— 强制授权弹窗（T3-3 · 核心交互）
 * ----------------------------------------------------------------------------
 * SPEC §2.5：
 *  - role="alertdialog" + aria-modal + 自动聚焦 + body 滚动锁
 *  - 提交走 settleLinkAuthoritative（云端权威裁决，内部含本地 CAS 降级）
 *  - 三态呈现：success / CAS_CONFLICT（不报错，"已由 x 处理"）/ EXPIRED
 *  - TABLE_LINK_SETTLED 到达 → 全端同步自动关闭并显示落名人
 *  - 串行队列：一次只弹一个（队列由 useTableSessionUi 维护）
 * ==========================================================================*/

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTableSessionUi } from './useTableSessionUi';

interface TableLinkAlertDialogProps {
  /** 授权成功进入菜单的回调（当前用户是新申请者时不会触发；此弹窗只给授权人看） */
  onResolved?: () => void;
  showToast?: (msg: string) => void;
}

type DialogPhase = 'deciding' | 'success' | 'expired';

export function TableLinkAlertDialog({ onResolved, showToast }: TableLinkAlertDialogProps) {
  const { linkDialogQueue, lastSettledBy, actions } = useTableSessionUi();
  const [phase, setPhase] = useState<DialogPhase>('deciding');
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(60);
  const agreeRef = useRef<HTMLButtonElement>(null);

  const current = linkDialogQueue[0] ?? null;

  // 弹窗出现时重置状态 + 聚焦同意 + body 滚动锁
  useEffect(() => {
    if (current) {
      setPhase('deciding');
      setBusy(false);
      agreeRef.current?.focus();
      document.body.style.overflow = 'hidden';
      const expiresAt = new Date(current.expiresAt).getTime();
      const tick = () => {
        const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
        setRemaining(left);
        if (left <= 0) setPhase('expired');
      };
      tick();
      const timer = setInterval(tick, 1000);
      return () => {
        clearInterval(timer);
        document.body.style.overflow = '';
      };
    }
    document.body.style.overflow = '';
    return undefined;
  }, [current?.requestId]);

  // TABLE_LINK_SETTLED 到达（他人已处理）→ 引擎从队列移除后 current 变化。
  // 若 lastSettledBy 非空且队列恰好清空，短暂显示"已由 x 处理"由 toast 承担。
  useEffect(() => {
    if (!current && lastSettledBy && showToast) {
      showToast(`本次授权由 ${lastSettledBy} 处理`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, lastSettledBy]);

  const handleDecide = async (decision: 'granted' | 'denied') => {
    if (!current || busy || phase !== 'deciding') return;
    setBusy(true);
    try {
      const result = await actions.settle(current.requestId, decision);
      if (result.ok) {
        setPhase('success');
        setTimeout(() => {
          actions.dismissDialog(current.requestId);
          onResolved?.();
        }, 2000);
      } else if (result.conflictWith) {
        // CAS 落败：不报错，静默转"已被处理"
        showToast?.(`该请求已由 ${result.conflictWith} 处理`);
        actions.dismissDialog(current.requestId);
      } else {
        showToast?.(result.message);
        actions.dismissDialog(current.requestId);
      }
    } finally {
      setBusy(false);
    }
  };

  // Android 返回 / ESC = 不响应（不是拒绝）
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current?.requestId]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.requestId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] bg-dark-container/70 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.92, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            role="alertdialog"
            aria-modal="true"
            aria-label="同桌点餐联动请求"
            className="w-full max-w-sm bg-card-bg rounded-console-xl overflow-hidden shadow-2xl"
          >
            {/* 标题条 */}
            <div className="bg-dark-container px-5 py-3.5 flex items-center gap-2">
              <span className="text-base">🔗</span>
              <span className="text-sm font-medium text-white">同桌点餐联动请求</span>
              {phase === 'deciding' && (
                <span
                  className={`ml-auto text-xs tabular-nums ${
                    remaining <= 10 ? 'text-status-terracotta' : 'text-text-muted'
                  }`}
                >
                  ⏱ {remaining}s 后自动过期
                </span>
              )}
            </div>

            <div className="p-5">
              {phase === 'deciding' && (
                <>
                  <p className="text-center mb-1">
                    <span className="text-lg font-bold text-text-prominent font-mono">
                      {current.requesterMaskedId}
                    </span>
                    <span className="text-sm text-text-secondary ml-1">请求加入</span>
                  </p>
                  <p className="text-center text-sm text-text-secondary mb-5">
                    {current.tableCode} 号桌
                  </p>

                  {/* 权限边界 —— 授权人决策依据，必须写明 */}
                  <div className="bg-page-bg rounded-console p-4 mb-5 space-y-2">
                    <p className="text-xs text-text-muted mb-1">同意后 TA 将可以：</p>
                    <p className="text-sm text-status-olive">✓ 浏览菜单并加购</p>
                    <p className="text-sm text-status-olive">✓ 提交点餐（本次就餐内）</p>
                    <p className="text-sm text-status-terracotta">
                      ✗ 管理同桌成员 / 修改你的权限
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDecide('denied')}
                      disabled={busy}
                      className="flex-1 h-12 rounded-console border border-border-main text-text-secondary text-sm font-medium disabled:opacity-50"
                    >
                      拒绝
                    </button>
                    <button
                      ref={agreeRef}
                      onClick={() => handleDecide('granted')}
                      disabled={busy}
                      className={`flex-1 h-12 rounded-console text-white text-sm font-medium ${
                        busy ? 'bg-border-main cursor-wait' : 'bg-accent-orange'
                      }`}
                    >
                      {busy ? '处理中…' : '✓ 同意'}
                    </button>
                  </div>
                </>
              )}

              {phase === 'success' && (
                <div className="py-8 text-center">
                  <div className="text-5xl mb-3">✅</div>
                  <p className="text-base font-bold text-text-prominent mb-1">已授权</p>
                  <p className="text-sm text-text-secondary">
                    本次授权由 <span className="font-mono">{lastSettledBy ?? '你'}</span> 处理
                  </p>
                </div>
              )}

              {phase === 'expired' && (
                <div className="py-8 text-center">
                  <div className="text-5xl mb-3 opacity-40">⌛</div>
                  <p className="text-base font-bold text-text-prominent mb-1">请求已超时</p>
                  <p className="text-sm text-text-secondary mb-5">
                    该加入请求未被及时处理，已自动过期
                  </p>
                  <button
                    onClick={() => actions.dismissDialog(current.requestId)}
                    className="w-full h-11 rounded-console bg-page-bg border border-border-main text-sm text-text-secondary"
                  >
                    关闭
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
