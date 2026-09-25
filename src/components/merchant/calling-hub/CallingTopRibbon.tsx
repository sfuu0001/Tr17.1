import React from 'react';
import {
  Megaphone,
  Timer,
  QrCode,
  CloudDownload,
  Tv2,
  PlusCircle,
  Signal,
  Server,
  Gauge,
  type LucideIcon
} from 'lucide-react';
import { UiverseAudioEqualizer } from '../uiverse/UiverseDynamicComponents';

/* ============================================================================
 * ① TOP GLOBAL STATUS & ACTION RIBBON — 顶层全局状态与动作缎带  [RAD OPS]
 * ----------------------------------------------------------------------------
 * 结构（与参考稿 (4) section 1 对齐）：
 *   a. 标题血缘：重色结构胶囊标题（URBAN RADAR // …）+ LIVE CALLING(蓝) + 版本 +
 *      子标题尾随 DISP_FREQ 遥测
 *   b. 动作组：4 个 32×32 图标方钮 + 1 个重色「取号」主行动
 *   c. 快速指标缎带：4 格（蓝/绿/橙/琥珀 五色分工），点 + 标签 + 等宽彩色读数
 *
 * 与参考稿的差异（有意为之）：参考稿把 LOC/RTK/NODE/LOAD 放在**页面级 sticky 头部**，
 * 本项目该位置已由商户端 App Shell 占用，故此遥测下沉到本缎带的子标题行内联呈现，
 * 避免出现两条重复的置顶栏。
 * ========================================================================== */

interface SquareActionProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  iconClass: string;
  pulse?: boolean;
}

const SquareAction: React.FC<SquareActionProps> = ({ icon: Icon, label, onClick, iconClass, pulse }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className="relative h-8 w-8 bg-rad-surface hover:bg-rad-subtle text-rad-text-main border border-rad-line rounded-rad flex items-center justify-center transition-colors shadow-xs cursor-pointer group"
  >
    <Icon className={`w-[17px] h-[17px] ${iconClass} group-hover:scale-110 transition-transform`} strokeWidth={1.9} />
    {pulse && (
      <span className="w-1.5 h-1.5 rounded-full bg-rad-blue animate-ping absolute top-1.5 right-1.5" />
    )}
  </button>
);

interface QuickMetricProps {
  dotClass: string;
  label: string;
  value: string;
  unit: string;
  valueClass: string;
  pulse?: boolean;
}

const QuickMetric: React.FC<QuickMetricProps> = ({ dotClass, label, value, unit, valueClass, pulse }) => (
  <div className="bg-rad-inset border border-rad-line rounded-rad px-3 py-1.5 flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass} ${pulse ? 'animate-ping' : ''}`} />
      <span className="text-xs text-rad-text-muted font-medium truncate">{label}</span>
    </div>
    <div className="flex items-baseline gap-1 shrink-0">
      <span className={`font-mono text-lg font-bold ${valueClass}`}>{value}</span>
      <span className="font-mono text-[11px] text-rad-text-muted hidden sm:inline">{unit}</span>
    </div>
  </div>
);

export interface CallingTopRibbonProps {
  waitingCount: number;
  pickupWaitingCount: number;
  calledCount: number;
  tempVoidCount: number;
  isTvMode: boolean;
  onOpenStrategy: () => void;
  onOpenVerify: () => void;
  onSyncPickup: () => void;
  onToggleTv: () => void;
  onOpenNewTicket: () => void;
}

export const CallingTopRibbon: React.FC<CallingTopRibbonProps> = ({
  waitingCount,
  pickupWaitingCount,
  calledCount,
  tempVoidCount,
  isTvMode,
  onOpenStrategy,
  onOpenVerify,
  onSyncPickup,
  onToggleTv,
  onOpenNewTicket
}) => {
  return (
    <section className="bg-rad-surface border border-rad-line rounded-rad p-3.5 shadow-xs">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* a. 标题血缘 */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-rad-dark text-white px-2.5 py-1 rounded-rad">
              <Megaphone className="w-[16px] h-[16px] text-amber-300 animate-pulse" strokeWidth={2} />
              <h1 className="font-display text-base font-bold tracking-tight">
                URBAN RADAR // 前台叫号取餐与等位排队中枢
              </h1>
            </div>
            <div className="bg-rad-blue-subtle text-rad-blue border border-rad-blue/30 px-2 py-0.5 rounded-rad font-mono font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <span>LIVE CALLING</span>
              <UiverseAudioEqualizer active={true} />
            </div>
            <span className="bg-rad-subtle border border-rad-line px-2 py-0.5 rounded-rad font-mono text-[11px] text-rad-text-muted">
              v4.8.2-PROD
            </span>
          </div>
          <p className="text-xs text-rad-text-muted flex items-center gap-2 flex-wrap">
            <span>全渠道自提取餐、智能恒温柜出库核销、桌台等位翻台测算及多通道真人母带广播中枢</span>
            <span className="inline-block w-1 h-1 rounded-full bg-rad-line" />
            <span className="font-mono text-[11px]">DISP_FREQ: 100Hz</span>
            {/* App Shell 已占用置顶位，故遥测在此内联 */}
            <span className="inline-block w-1 h-1 rounded-full bg-rad-line" />
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Signal className="w-[14px] h-[14px] text-rad-blue" strokeWidth={2} />
              RTK 5G: <strong className="text-rad-text-main">18ms</strong>
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Server className="w-[14px] h-[14px] text-rad-green" strokeWidth={2} />
              NODE: <strong className="text-rad-text-main">ONLINE (EDGE-04)</strong>
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Gauge className="w-[14px] h-[14px] text-rad-amber" strokeWidth={2} />
              LOAD: <strong className="text-rad-text-main">42% DISP</strong>
            </span>
          </p>
        </div>

        {/* b. 动作组 */}
        <div className="flex items-center gap-2 flex-wrap">
          <SquareAction
            icon={Timer}
            label="自定义等位标准"
            iconClass="text-rad-slate"
            onClick={onOpenStrategy}
          />
          <SquareAction
            icon={QrCode}
            label="核销取餐码"
            iconClass="text-rad-blue"
            onClick={onOpenVerify}
            pulse
          />
          <SquareAction
            icon={CloudDownload}
            label="同步自提单"
            iconClass="text-rad-slate"
            onClick={onSyncPickup}
          />
          <SquareAction
            icon={Tv2}
            label={isTvMode ? '收起排队大屏' : '排队大屏投影/收起'}
            iconClass="text-rad-blue"
            onClick={onToggleTv}
          />
          <button
            type="button"
            title="现场顾客取号"
            onClick={onOpenNewTicket}
            className="h-8 px-3 bg-rad-dark hover:bg-rad-dark-card text-white rounded-rad text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-[18px] h-[18px] text-amber-300 animate-pulse" strokeWidth={2} />
            <span className="font-mono">取号</span>
          </button>
        </div>
      </div>

      {/* c. 快速指标缎带 */}
      <div className="mt-3 pt-2.5 border-t border-rad-line-light grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <QuickMetric
          dotClass="bg-rad-blue"
          label="当前排队"
          value={String(waitingCount)}
          unit="组等待"
          valueClass="text-rad-blue"
        />
        <QuickMetric
          dotClass="bg-rad-green"
          label="待取出库"
          value={String(pickupWaitingCount)}
          unit="单就绪"
          valueClass="text-rad-green"
        />
        <QuickMetric
          dotClass="bg-rad-orange"
          pulse={calledCount > 0}
          label="叫号呼叫中"
          value={String(calledCount)}
          unit="组播报中"
          valueClass="text-rad-orange"
        />
        <QuickMetric
          dotClass="bg-rad-amber"
          label="临时作废 (暂挂)"
          value={String(tempVoidCount)}
          unit="组暂留"
          valueClass="text-rad-amber"
        />
      </div>
    </section>
  );
};

export default CallingTopRibbon;
