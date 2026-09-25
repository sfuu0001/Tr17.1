import React from 'react';
import { SeriesLoad } from './callingTokens';

/* ============================================================================
 * ② FOUR-COLUMN QUEUE METRICS HUD CARDS — 四列队列指标甲板  [RAD OPS]
 * ----------------------------------------------------------------------------
 * 结构（参考稿 (4) section 2 + 信息完整性补全）：
 *   顶部 2px 系列信号色条（蓝/琥珀/橙/绿）
 *   → 类目标签 + 系列徽标
 *   → 大号等宽主读数 + 单位
 *   → 内嵌底台：参考节拍 / 预估最长等待（自提为出餐耗时 / 柜位占用）
 *
 * 与参考稿的有意差异：参考稿该卡的「参考节拍 / 预估等待」两行被重复渲染了两遍
 * （Stitch 生成瑕疵），且省略了类目名与等候桌数。此处仅渲染一遍，并补回
 * 类目读数 —— 否则运营侧无法从甲板看出各桌型积压量。
 * 三端：1 列 → sm 2 列 → xl 4 列（适配常驻侧栏占宽）。
 * ========================================================================== */

export interface CallingQueueMetricsProps {
  loads: SeriesLoad[];
  lockerOccupied: number;
  lockerTotal: number;
}

export const CallingQueueMetrics: React.FC<CallingQueueMetricsProps> = ({
  loads,
  lockerOccupied,
  lockerTotal
}) => {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {loads.map((load) => {
        const isPickup = load.key === 'pickup';
        return (
          <div
            key={load.key}
            className="bg-rad-surface border border-rad-line rounded-rad p-3 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-rad-dark transition-colors"
          >
            {/* 系列信号色条 */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${load.meta.accentBar}`} />

            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-rad-text-muted truncate">{load.meta.catLabel}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-rad-sm font-mono text-[10px] font-bold shrink-0 ${load.meta.seriesBadge}`}
                >
                  {load.meta.series}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="font-mono text-2xl font-extrabold text-rad-text-main leading-none">
                  {load.waitingCount}
                </span>
                <span className="text-[11px] text-rad-text-muted">
                  {isPickup ? '单待取' : '桌等候中'}
                </span>
                <span className={`font-mono text-[10px] ml-auto shrink-0 ${load.loadClass}`}>
                  {load.loadLabel}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-rad-line-light space-y-1 bg-rad-inset p-2 rounded-rad-sm">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-rad-text-muted">{isPickup ? '参考出餐耗时' : '参考翻台节拍'}</span>
                <span className="font-semibold text-rad-text-main">
                  {load.paceMin}m / {isPickup ? '单' : '桌'}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-rad-text-muted">{isPickup ? '智能柜位状态' : '预估最长等待'}</span>
                {isPickup ? (
                  <span className="font-bold text-rad-text-main">
                    {lockerOccupied} / {lockerTotal} 仓已占用
                  </span>
                ) : (
                  <span className={`font-bold ${load.waitClass}`}>约 {load.longestWaitMin} 分钟</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default CallingQueueMetrics;
