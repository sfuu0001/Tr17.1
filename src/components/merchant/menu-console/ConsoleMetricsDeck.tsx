import React from 'react';
import {
  CategoryDensitySegment,
  ChannelTelemetry,
  DepletionBreakdown
} from './consoleTokens';

/* ============================================================================
 * ② KEY METRICS BENCH DECK — 三列基座指标卡
 * ----------------------------------------------------------------------------
 * 三端：mobile 单列纵向 → md 起三列等宽（grid-cols-1 md:grid-cols-3）。
 * 三张卡共用同一骨架：标签行 + 32px 主读数 + 容量条 + 双列脚注。
 * 语义色严格取自令牌：中性 / status-olive / signal-critical。
 * ========================================================================== */

interface MetricShellProps {
  eyebrow: string;
  eyebrowClass: string;
  title: string;
  badge: React.ReactNode;
  children: React.ReactNode;
}

const MetricShell: React.FC<MetricShellProps> = ({ eyebrow, eyebrowClass, title, badge, children }) => (
  <div className="bg-card-bg p-space-md border border-border-main flex flex-col justify-between relative overflow-hidden rounded-console">
    <div className="flex items-start justify-between gap-space-sm">
      <div className="flex flex-col min-w-0">
        <span className={`font-label-micro uppercase tracking-wider font-bold ${eyebrowClass}`}>
          {eyebrow}
        </span>
        <span className="font-headline-sm text-text-prominent font-bold mt-0.5">{title}</span>
      </div>
      {badge}
    </div>
    {children}
  </div>
);

export interface ConsoleMetricsDeckProps {
  telemetry: ChannelTelemetry;
  density: CategoryDensitySegment[];
  depletion: DepletionBreakdown;
  /** 品类库实际类目数（区别于密度分布的分段数） */
  categoryTotal: number;
  /** 平均出品时效（秒）；未接入真实 KDS 时展示派生的稳定读数 */
  avgPrepSeconds?: number;
}

export const ConsoleMetricsDeck: React.FC<ConsoleMetricsDeckProps> = ({
  telemetry,
  density,
  depletion,
  categoryTotal,
  avgPrepSeconds = 182
}) => {
  const totalLabel = telemetry.total;
  // 密度分布覆盖率：分段百分比之和，用于「xx% REG」读数
  const densityCoverage = density.reduce((sum, seg) => sum + seg.percent, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
      {/* 卡 1 · 菜品总数矩阵 */}
      <MetricShell
        eyebrow="SKU METRICS CLUSTER"
        eyebrowClass="text-text-muted"
        title="菜品总数矩阵"
        badge={
          <span className="font-label-micro px-2 py-0.5 bg-page-bg border border-border-main text-text-prominent font-bold rounded-console shrink-0">
            TOTAL {totalLabel}
          </span>
        }
      >
        <div className="my-space-md flex items-baseline gap-2">
          <span className="font-headline-lg text-[32px] leading-none text-text-prominent font-bold">
            {totalLabel}
          </span>
          <span className="font-label-sm text-text-body">项活跃资产</span>
          <span className="font-label-micro text-text-light-mono ml-auto">
            {categoryTotal} 大品类库
          </span>
        </div>
        <div className="space-y-1.5 pt-space-xs">
          <div className="flex justify-between font-label-micro text-text-muted">
            <span>类目密度分布 (CAPACITY)</span>
            <span className="font-bold text-text-prominent">{densityCoverage}% REG</span>
          </div>
          <div className="w-full bg-page-bg border border-border-main h-2 overflow-hidden flex rounded-console">
            {density.map((seg) => (
              <div
                key={seg.label}
                className={`h-full ${seg.className}`}
                style={{ width: `${seg.percent}%` }}
                title={`${seg.label} ${seg.percent}%`}
              />
            ))}
          </div>
          <div className="flex justify-between font-label-micro text-text-muted pt-0.5">
            {density.map((seg) => (
              <span key={`legend-${seg.label}`}>
                {seg.label} {seg.percent}%
              </span>
            ))}
          </div>
        </div>
      </MetricShell>

      {/* 卡 2 · 正常在售矩阵 */}
      <MetricShell
        eyebrow="CHANNELS LIVE MONITOR"
        eyebrowClass="text-signal-live-text"
        title="正常在售矩阵"
        badge={
          <div className="flex items-center gap-1 px-2 py-0.5 border rounded-console bg-signal-live-surface border-signal-live-border-strong shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-live" />
            <span className="font-label-micro font-bold uppercase text-signal-live-strong">
              ACTIVE {telemetry.activePercent}%
            </span>
          </div>
        }
      >
        <div className="my-space-md flex items-baseline gap-2">
          <span className="font-headline-lg text-[32px] leading-none font-bold text-signal-live-text">
            {telemetry.active}
          </span>
          <span className="font-label-sm text-text-body">项全网供售</span>
          <span className="font-label-micro ml-auto font-semibold text-signal-live-text">
            双通道通畅 · RTK OK
          </span>
        </div>
        <div className="space-y-1.5 pt-space-xs">
          <div className="flex justify-between font-label-micro text-text-muted">
            <span>
              堂食 (Dine-in) {telemetry.dineInCount}/{telemetry.total}
            </span>
            <span className="font-bold text-signal-live-text">
              外卖 (Delivery) {telemetry.deliveryCount}/{telemetry.total}
            </span>
          </div>
          <div className="w-full bg-page-bg border border-border-main h-2 overflow-hidden rounded-console">
            <div
              className="h-full bg-signal-live"
              style={{ width: `${telemetry.activePercent}%` }}
            />
          </div>
          <div className="flex justify-between font-label-micro text-text-body">
            <span>
              车边取餐准备率:{' '}
              {telemetry.active > 0
                ? Math.round((telemetry.pickupCount / telemetry.active) * 100)
                : 0}
              %
            </span>
            <span>平均出品时效: {avgPrepSeconds}s</span>
          </div>
        </div>
      </MetricShell>

      {/* 卡 3 · 全渠道沽清监控 */}
      <MetricShell
        eyebrow="SUPPLY DEPLETION ALERT"
        eyebrowClass="text-signal-critical-text"
        title="全渠道沽清监控"
        badge={
          <div className="flex items-center gap-1 px-2 py-0.5 border rounded-console bg-signal-critical-surface border-signal-critical-border shrink-0">
            <span className="w-1.5 h-1.5 rounded-full animate-ping bg-signal-critical" />
            <span className="font-label-micro font-bold uppercase text-signal-critical-strong">
              {telemetry.depleted > 0 ? 'OUT OF STOCK' : 'ALL CLEAR'}
            </span>
          </div>
        }
      >
        <div className="my-space-md flex items-baseline gap-2">
          <span className="font-headline-lg text-[32px] leading-none font-bold text-signal-critical">
            {String(telemetry.depleted).padStart(2, '0')}
          </span>
          <span className="font-label-sm text-text-body">项急需复配</span>
          <span className="font-label-micro font-bold ml-auto text-signal-critical-text">
            {telemetry.depleted > 0 ? 'CRITICAL INTERVENTION' : 'NOMINAL'}
          </span>
        </div>
        <div className="space-y-1.5 pt-space-xs">
          <div className="flex justify-between font-label-micro text-text-muted gap-2">
            <span className="truncate">缺料涉及品类: {depletion.topCategories}</span>
            <span className="font-bold text-signal-critical-text shrink-0">
              {telemetry.limited} 项限售
            </span>
          </div>
          <div className="w-full bg-page-bg border border-border-main h-2 overflow-hidden rounded-console">
            <div
              className="h-full bg-signal-critical"
              style={{ width: `${Math.max(depletion.heatRatio, telemetry.depleted > 0 ? 4 : 0)}%` }}
            />
          </div>
          <div className="flex justify-between font-label-micro text-text-body gap-2">
            <span className="truncate">中央厨房冷链派送中 (ETA: 45min)</span>
            <span className="underline cursor-pointer text-signal-sky-strong hover:text-text-prominent font-semibold shrink-0">
              调度配给 →
            </span>
          </div>
        </div>
      </MetricShell>
    </div>
  );
};

export default ConsoleMetricsDeck;
