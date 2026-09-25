import React from 'react';
import {
  BellRing,
  ListOrdered,
  RefreshCw,
  Maximize,
  Minimize,
  Info
} from 'lucide-react';
import { TvCallingEntry, TvRosterEntry } from './callingTokens';

/* ============================================================================
 * ⑥ DUAL-SCREEN LIVE TV MIRROR — 双屏 TV 现场排队大屏实时镜像  [RAD OPS]
 * ----------------------------------------------------------------------------
 * 结构（参考稿 (4) section 6 对齐）：
 *   TV 机位标题条（脉冲点 + display 标题 + 蓝色分辨率徽标 + 同步读数 + 全屏输出）
 *   → 12 栏内嵌画面：左 5 栏「正在请进 / 请取餐」（自提=绿、堂食=琥珀）
 *     + 语音遥测；右 7 栏「等候队列序列」格子矩阵 + 过号保留规则页脚
 * 注意：与 (3) 版不同，(4) 的大屏镜像走**浅色**画面（白卡 + 信号色数字），
 *       仅在取餐/桌号徽章上用实心信号色，故整体不再是深色面板。
 * 三端：<lg 纵向堆叠（左栏在上）；格子 2 列 → sm 3 列。
 * ========================================================================== */

export interface CallingTvMirrorProps {
  calling: TvCallingEntry[];
  roster: TvRosterEntry[];
  waitingCount: number;
  lockerTotal: number;
  personaName: string;
  volumeLabel: string;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
}

export const CallingTvMirror: React.FC<CallingTvMirrorProps> = ({
  calling,
  roster,
  waitingCount,
  lockerTotal,
  personaName,
  volumeLabel,
  isFullScreen,
  onToggleFullScreen
}) => {
  return (
    <section className="bg-white text-rad-text-main border border-rad-line rounded-rad p-3.5 shadow-xs space-y-3">
      {/* TV 机位标题条 */}
      <div className="flex items-center justify-between pb-2.5 border-b border-rad-line-light flex-wrap gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <h2 className="font-display text-sm font-bold tracking-wide text-rad-text-main">
            前台双屏 / TV 现场排队大屏实时镜像 (55" HDMI-1 / EDID: URBAN-DISP-01)
          </h2>
          <span className="bg-rad-blue-subtle border border-rad-blue/30 px-2 py-0.5 rounded-rad-sm font-mono text-[10px] text-rad-blue uppercase font-bold shrink-0">
            1080P 60Hz DUAL-CHANNEL
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 font-mono text-[11px] text-rad-text-muted">
            <RefreshCw className="w-[15px] h-[15px] text-rad-text-muted" strokeWidth={2} />
            <span>与前台母带广播实时 0ms 同步</span>
          </div>
          <button
            type="button"
            onClick={onToggleFullScreen}
            className="h-7 px-2.5 bg-rad-surface hover:bg-rad-subtle text-rad-text-main rounded-rad text-xs font-mono flex items-center gap-1 border border-rad-line shadow-xs cursor-pointer"
          >
            {isFullScreen ? (
              <Minimize className="w-[14px] h-[14px]" strokeWidth={2} />
            ) : (
              <Maximize className="w-[14px] h-[14px]" strokeWidth={2} />
            )}
            <span>独立全屏弹窗输出</span>
          </button>
        </div>
      </div>

      {/* TV 画面框 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-rad-inset p-3 rounded-rad border border-rad-line">
        {/* 左：正在请进 / 请取餐 */}
        <div className="lg:col-span-5 bg-white border border-rad-line p-3 rounded-rad flex flex-col justify-between shadow-xs">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-rad-line-light gap-2">
              <div className="flex items-center gap-1.5 text-rad-orange font-bold text-xs tracking-wider">
                <BellRing className="w-5 h-5 animate-bounce" strokeWidth={2} />
                <span>正在请进 / 请取餐</span>
              </div>
              <span className="font-mono text-[10px] text-rad-text-muted uppercase shrink-0">NOW CALLING</span>
            </div>

            {calling.length === 0 ? (
              <div className="py-10 text-center font-mono text-xs text-rad-text-muted">
                暂无呼叫中的号码，后厨备料制作中…
              </div>
            ) : (
              calling.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-rad-inset border border-rad-line p-2.5 rounded-rad-sm flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span
                      className={`font-mono text-3xl font-black tracking-wider ${
                        entry.tone === 'primary' ? 'text-rad-green' : 'text-rad-amber'
                      }`}
                    >
                      {entry.queueNo}
                    </span>
                    <p className="text-xs font-medium text-rad-text-muted mt-0.5">
                      {entry.title} · <strong className="text-rad-text-main font-bold">{entry.target}</strong>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-rad-sm font-mono text-xs font-bold ${
                        entry.tone === 'primary'
                          ? 'bg-rad-green text-white'
                          : 'bg-rad-amber-subtle border border-rad-amber/30 text-rad-amber'
                      }`}
                    >
                      {entry.codeLabel} {entry.codeValue}
                    </span>
                    <p
                      className={`font-mono text-[10px] font-semibold mt-1 whitespace-nowrap ${
                        entry.tone === 'primary' ? 'text-rad-orange' : 'text-rad-text-muted'
                      }`}
                    >
                      {entry.hint}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-rad-line-light flex items-center justify-between font-mono text-[10px] text-rad-text-muted gap-2">
            <span className="flex items-center gap-1 text-rad-green font-semibold min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-rad-green animate-ping shrink-0" />
              <span className="truncate">语音广播引擎: {personaName} 真人音频流在线</span>
            </span>
            <span className="text-rad-text-main font-bold shrink-0">VOLUME: {volumeLabel}</span>
          </div>
        </div>

        {/* 右：等候队列序列 */}
        <div className="lg:col-span-7 bg-white border border-rad-line p-3 rounded-rad flex flex-col justify-between shadow-xs">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-rad-line-light gap-2">
              <div className="flex items-center gap-1.5 text-rad-text-main font-bold text-xs tracking-wider">
                <ListOrdered className="w-5 h-5 text-rad-blue" strokeWidth={2} />
                <span>等候队列序列 (顺序备餐入座)</span>
              </div>
              <span className="font-mono text-[10px] text-rad-text-muted uppercase shrink-0">
                QUEUE ROSTER ({waitingCount} 组)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto console-scroll-none">
              {roster.length === 0 ? (
                <div className="col-span-full py-8 text-center font-mono text-[11px] text-rad-text-muted">
                  队列已清空 · 等待新顾客取号
                </div>
              ) : (
                roster.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-rad-inset border border-rad-line p-2 rounded-rad-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`font-mono text-xl font-bold ${entry.numberClass}`}>{entry.queueNo}</span>
                      <span
                        className={`font-mono text-[10px] px-1 rounded-rad-sm font-semibold ${entry.positionClass}`}
                      >
                        {entry.positionLabel}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-rad-text-muted gap-1">
                      <span className="truncate">{entry.typeLabel}</span>
                      <span className={`font-semibold shrink-0 ${entry.etaClass}`}>{entry.etaLabel}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-rad-line-light flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 font-mono text-[10px] text-rad-text-muted">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3 text-rad-blue shrink-0" strokeWidth={2} />
              如过号将保留 3 个顺位，请注意收银台叫号或留意手机微信取餐提醒
            </span>
            <span className="text-rad-blue font-bold shrink-0">
              URBAN RADAR Q-SYNC v4.8 · {lockerTotal} 柜位在线
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallingTvMirror;
