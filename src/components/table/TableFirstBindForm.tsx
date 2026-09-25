/* ============================================================================
 * TableFirstBindForm —— 首绑表单（T3-2）
 * ----------------------------------------------------------------------------
 * 引擎：acquireFirstBind → finalizeFirstBind（SPEC §2.3）
 * CAS 落败（20 人抢一桌的落败方）→ 自动降级 request_link，不是报错页。
 * 禁止出现姓名/手机号字段 —— 首绑要的是速度，不是信息采集。
 * ==========================================================================*/

import React, { useState } from 'react';
import { useTableSessionUi } from './useTableSessionUi';

interface TableFirstBindFormProps {
  tableId: string;
  tableCode: string;
  onEntered: () => void;
  showToast?: (msg: string) => void;
}

export function TableFirstBindForm({
  tableId,
  tableCode,
  onEntered,
  showToast
}: TableFirstBindFormProps) {
  const { actions } = useTableSessionUi();
  const [guestCount, setGuestCount] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [degraded, setDegraded] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await actions.firstBind(tableId, tableCode, guestCount);
      if (res.ok) {
        showToast?.(`${tableCode} 号桌已开台`);
        onEntered();
        return;
      }
      if (res.degradedToLink) {
        // 已被他人抢先开台 → 已自动转为加入申请，呈现等待态提示
        setDegraded(true);
        return;
      }
      showToast?.(res.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (degraded) {
    return (
      <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md bg-card-bg border border-border-main rounded-console-xl p-8 text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-lg font-bold text-text-prominent mb-2">
            {tableCode} 号桌刚被其他人开通
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            已自动为你发起加入申请，等待同桌成员授权
          </p>
          <div className="h-1 rounded-full bg-page-bg overflow-hidden">
            <div className="h-full w-1/3 bg-accent-orange animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md bg-card-bg border border-border-main rounded-console-xl p-8">
        <div className="text-center mb-8">
          <p className="text-xs text-text-muted mb-1">你是本桌第一位点餐的人</p>
          <h1 className="text-2xl font-bold text-text-prominent">
            {tableCode}
            <span className="text-sm text-text-secondary font-normal ml-2">号桌</span>
          </h1>
        </div>

        {/* 就餐人数选择器（唯一字段） */}
        <div className="mb-8">
          <label className="block text-sm text-text-secondary mb-3">就餐人数</label>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setGuestCount((n) => Math.max(1, n - 1))}
              disabled={guestCount <= 1}
              className="w-12 h-12 rounded-console bg-page-bg border border-border-main text-text-prominent text-xl disabled:opacity-40"
              aria-label="减少人数"
            >
              −
            </button>
            <span className="text-4xl font-bold text-text-prominent w-16 text-center tabular-nums">
              {guestCount}
            </span>
            <button
              onClick={() => setGuestCount((n) => Math.min(12, n + 1))}
              disabled={guestCount >= 12}
              className="w-12 h-12 rounded-console bg-page-bg border border-border-main text-text-prominent text-xl disabled:opacity-40"
              aria-label="增加人数"
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={`w-full h-13 py-3.5 rounded-console text-base font-medium text-white ${
            submitting ? 'bg-border-main cursor-wait' : 'bg-accent-orange'
          }`}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              正在开台…
            </span>
          ) : (
            '开台点餐'
          )}
        </button>

        <p className="text-xs text-text-muted text-center mt-4">
          开台后你将成为桌主，可管理本桌点餐成员
        </p>
      </div>
    </div>
  );
}
