/* ============================================================================
 * TableLinkWaiting —— 等待授权页（T3-3）
 * ----------------------------------------------------------------------------
 * 4 态状态机（SPEC §2.4）：
 *   WAITING → granted → JOINED（进菜单）
 *   WAITING → denied  → DENIED（重新申请）
 *   WAITING → 超时    → TIMEOUT（重新申请 / 呼叫服务员）
 * TTL 倒计时必须可见：60s 环形进度，<10s 变 terracotta 脉冲。
 * 禁止编造"预计等待 x 分钟"文案 —— 真实 TTL 就是 60 秒。
 * ==========================================================================*/

import React, { useEffect, useMemo, useState } from 'react';
import { useTableSessionUi } from './useTableSessionUi';

interface TableLinkWaitingProps {
  tableCode: string;
  onGranted: () => void;
  showToast?: (msg: string) => void;
}

type WaitingPhase = 'waiting' | 'denied' | 'timeout';

export function TableLinkWaiting({ tableCode, onGranted, showToast }: TableLinkWaitingProps) {
  const { pendingLinkRequest, activeSession, actions } = useTableSessionUi();
  const [phase, setPhase] = useState<WaitingPhase>('waiting');
  const [remaining, setRemaining] = useState(60);

  // 倒计时（以引擎返回的 expiresAt 为准，不用本地 60s 假设）
  useEffect(() => {
    if (phase !== 'waiting' || !pendingLinkRequest) return;
    const expiresAt = new Date(pendingLinkRequest.expiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) setPhase('timeout');
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pendingLinkRequest, phase]);

  // granted 由 useTableSessionUi 的 TABLE_LINK_SETTLED 订阅驱动：
  // pendingLinkRequest 清空 + activeSession 出现 = 我已被授权
  useEffect(() => {
    if (phase === 'waiting' && activeSession) {
      onGranted();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession, phase]);

  const handleReapply = () => {
    const res = actions.requestLink(tableCode);
    if (res.ok) {
      setPhase('waiting');
    } else {
      showToast?.(res.message);
    }
  };

  const ringStyle = useMemo(() => {
    // conic-gradient 环形进度（色值取自 index.css @theme 权威令牌）
    const pct = Math.max(0, Math.min(100, (remaining / 60) * 100));
    const urgent = remaining <= 10;
    return {
      background: `conic-gradient(${
        urgent ? 'var(--color-status-terracotta)' : 'var(--color-accent-orange)'
      } ${pct}%, var(--color-border-main) ${pct}%)`,
      urgent
    };
  }, [remaining]);

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md bg-card-bg border border-border-main rounded-console-xl p-8 text-center">
        {phase === 'waiting' && (
          <>
            {/* TTL 环形倒计时 */}
            <div
              className={`w-28 h-28 rounded-full mx-auto mb-6 flex items-center justify-center ${
                ringStyle.urgent ? 'animate-pulse' : ''
              }`}
              style={{ background: ringStyle.background }}
              role="timer"
              aria-label={`授权倒计时 ${remaining} 秒`}
            >
              <div className="w-24 h-24 rounded-full bg-card-bg flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-text-prominent tabular-nums">
                  {remaining}
                </span>
                <span className="text-xs text-text-muted">秒</span>
              </div>
            </div>

            <h1 className="text-lg font-bold text-text-prominent mb-2">
              等待同桌成员授权
            </h1>
            <p className="text-sm text-text-secondary mb-1">
              已向 <span className="text-text-prominent font-medium">{tableCode}</span> 号桌发送加入请求
            </p>
            <p className="text-xs text-text-muted mb-8">
              任一同桌成员同意后你将立即进入点餐
            </p>

            <button
              onClick={() => {
                actions.dismissDialog(pendingLinkRequest?.requestId ?? '');
                onGranted();
              }}
              className="text-sm text-text-muted underline underline-offset-4"
            >
              取消并返回
            </button>
          </>
        )}

        {phase === 'denied' && (
          <>
            <div className="text-5xl mb-4">🚪</div>
            <h1 className="text-lg font-bold text-text-prominent mb-2">请求被拒绝</h1>
            <p className="text-sm text-text-secondary mb-8">
              同桌成员拒绝了本次加入申请
            </p>
            <button
              onClick={handleReapply}
              className="w-full h-12 rounded-console bg-accent-orange text-white text-sm font-medium mb-3"
            >
              重新申请
            </button>
            <button
              onClick={() => (window.location.href = 'tel:')}
              className="text-sm text-slate-blue underline underline-offset-4"
            >
              呼叫服务员协助
            </button>
          </>
        )}

        {phase === 'timeout' && (
          <>
            <div className="text-5xl mb-4">⌛</div>
            <h1 className="text-lg font-bold text-text-prominent mb-2">授权请求已超时</h1>
            <p className="text-sm text-text-secondary mb-8">
              60 秒内无人响应，可能同桌成员暂未查看手机
            </p>
            <button
              onClick={handleReapply}
              className="w-full h-12 rounded-console bg-accent-orange text-white text-sm font-medium mb-3"
            >
              重新申请
            </button>
            <button
              onClick={() => (window.location.href = 'tel:')}
              className="text-sm text-slate-blue underline underline-offset-4"
            >
              呼叫服务员协助
            </button>
          </>
        )}
      </div>
    </div>
  );
}
