import React from 'react';
import {
  AudioLines,
  Bluetooth,
  BluetoothOff,
  UserCheck,
  Play,
  Volume2,
  Wrench,
  Mic,
  ShoppingBag,
  LayoutGrid,
  type LucideIcon
} from 'lucide-react';

/* ============================================================================
 * ③ REAL-AUDIO BROADCASTING CONSOLE & ACOUSTIC ROUTER — 真人母带叫号广播台 [RAD OPS]
 * ----------------------------------------------------------------------------
 * 结构（参考稿 (4) section 3 对齐）：
 *   a. 路由标题条：重色结构胶囊「真人母带原声引擎」+ 播报员读数 + 蓝牙专线
 *   b. 频率模式与音色动作组：播报 1 遍 / 连报 2 遍（含琥珀推荐标）、切换音色、
 *      试听取餐叫号、试听等位叫号、自检
 *   c. 即时人工播报干预条：号码输入（等宽大写）+ 人数单选 + 喊取餐 / 喊入座
 * 三端：动作组换行；干预条 md 起单行（输入左 / 动作右），md 以下纵向堆叠。
 * ========================================================================== */

interface GhostButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  iconClass?: string;
}

const GhostButton: React.FC<GhostButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  iconClass = 'text-rad-slate'
}) => (
  <button
    type="button"
    onClick={onClick}
    className="h-8 px-2.5 bg-rad-surface hover:bg-rad-subtle text-rad-text-main border border-rad-line rounded-rad text-xs font-medium flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
  >
    <Icon className={`w-[14px] h-[14px] ${iconClass}`} strokeWidth={2} />
    <span>{label}</span>
  </button>
);

export interface CallingVoiceConsoleProps {
  personaName: string;
  personaGenderLabel: string;
  personaAvatar: string;
  speedLabel: string;
  toneLabel: string;
  btConnected: boolean;
  btLabel: string;
  repeatCalls: 1 | 2;
  setRepeatCalls: (times: 1 | 2) => void;
  manualCallNumber: string;
  setManualCallNumber: (value: string) => void;
  manualPartySize: number;
  setManualPartySize: (size: number) => void;
  onCyclePersona: () => void;
  onTestPickup: () => void;
  onTestQueue: () => void;
  onSelfCheck: () => void;
  onManualBroadcast: (actionType: 'pickup' | 'table') => void;
  onOpenBluetooth: () => void;
}

const PARTY_SIZE_OPTIONS = [2, 4, 6, 8] as const;

export const CallingVoiceConsole: React.FC<CallingVoiceConsoleProps> = ({
  personaName,
  personaGenderLabel,
  personaAvatar,
  speedLabel,
  toneLabel,
  btConnected,
  btLabel,
  repeatCalls,
  setRepeatCalls,
  manualCallNumber,
  setManualCallNumber,
  manualPartySize,
  setManualPartySize,
  onCyclePersona,
  onTestPickup,
  onTestQueue,
  onSelfCheck,
  onManualBroadcast,
  onOpenBluetooth
}) => {
  return (
    <section className="bg-rad-surface border border-rad-line rounded-rad p-3.5 shadow-xs space-y-3">
      {/* a. 路由标题条 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-rad-inset border border-rad-line p-2 rounded-rad">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-rad-dark text-white px-2.5 py-1 rounded-rad">
            <AudioLines className="w-[17px] h-[17px] text-amber-300 animate-pulse" strokeWidth={2} />
            <span className="font-display text-[13px] font-bold">真人母带原声引擎 · 无机械电音</span>
          </div>

          <div className="flex items-center gap-1.5 bg-rad-surface border border-rad-line px-2 py-1 rounded-rad text-xs">
            <span className="w-2 h-2 rounded-full bg-rad-green shrink-0" />
            <span className="text-rad-text-main">
              播报员：<strong className="font-semibold">{personaName}</strong> ({personaGenderLabel})
            </span>
            <span className="font-mono text-[10px] text-rad-text-muted">
              | 语速: {speedLabel} | {toneLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenBluetooth}
            title="流动餐车外放蓝牙音箱链接与声学路由"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-rad text-xs border transition-colors cursor-pointer ${
              btConnected
                ? 'bg-rad-blue-subtle border-rad-blue/30 text-rad-blue'
                : 'bg-rad-surface border-rad-line text-rad-text-muted hover:text-rad-text-main'
            }`}
          >
            {btConnected ? (
              <Bluetooth className="w-[15px] h-[15px]" strokeWidth={2} />
            ) : (
              <BluetoothOff className="w-[15px] h-[15px]" strokeWidth={2} />
            )}
            <span className="font-mono text-[11px] font-semibold">{btLabel}</span>
          </button>
        </div>

        {/* b. 频率模式与音色动作组 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-rad-subtle border border-rad-line p-0.5 rounded-rad text-xs">
            <button
              type="button"
              onClick={() => setRepeatCalls(1)}
              className={`px-2.5 py-1 rounded-rad-sm transition-colors cursor-pointer ${
                repeatCalls === 1
                  ? 'bg-rad-surface text-rad-text-main shadow-xs font-semibold'
                  : 'text-rad-text-muted hover:text-rad-text-main font-medium'
              }`}
            >
              播报 1 遍
            </button>
            <button
              type="button"
              onClick={() => setRepeatCalls(2)}
              className={`px-2.5 py-1 rounded-rad-sm flex items-center gap-1 transition-colors cursor-pointer ${
                repeatCalls === 2
                  ? 'bg-rad-surface text-rad-text-main shadow-xs font-semibold'
                  : 'text-rad-text-muted hover:text-rad-text-main font-medium'
              }`}
            >
              <span>连报 2 遍</span>
              <span className="text-[10px] bg-rad-amber-subtle text-rad-amber border border-rad-amber/30 px-1 rounded-rad-sm">
                集市户外推荐
              </span>
            </button>
          </div>

          <GhostButton icon={UserCheck} label="切换音色风格" onClick={onCyclePersona} iconClass="text-rad-blue" />
          <GhostButton icon={Play} label="试听取餐叫号" onClick={onTestPickup} iconClass="text-rad-green" />
          <GhostButton icon={Volume2} label="试听等位叫号" onClick={onTestQueue} iconClass="text-rad-blue" />
          <GhostButton icon={Wrench} label="自检" onClick={onSelfCheck} />
        </div>
      </div>

      {/* c. 即时人工播报干预条 */}
      <div className="bg-rad-inset border border-rad-line p-2 rounded-rad flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <span className="text-xs font-bold text-rad-text-main whitespace-nowrap flex items-center gap-1">
            <Mic className="w-[16px] h-[16px] text-rad-blue" strokeWidth={2} />
            即时人工播报干预:
          </span>
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              value={manualCallNumber}
              onChange={(event) => setManualCallNumber(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onManualBroadcast('pickup');
              }}
              placeholder="输入号码 (如 P08 或 A03)"
              className="w-full h-7 px-2.5 bg-rad-surface text-rad-text-main border border-rad-line rounded-rad font-mono text-xs uppercase placeholder:text-rad-text-muted focus:outline-none focus:border-rad-dark"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <div className="flex items-center gap-1.5 bg-rad-surface border border-rad-line px-2 py-1 rounded-rad flex-wrap">
            <span className="text-[11px] text-rad-text-muted">人数:</span>
            {PARTY_SIZE_OPTIONS.map((size) => (
              <label key={size} className="flex items-center gap-1 font-mono text-[11px] cursor-pointer">
                <input
                  type="radio"
                  name="calling-manual-party-size"
                  checked={manualPartySize === size}
                  onChange={() => setManualPartySize(size)}
                  className="accent-[#0B1522] cursor-pointer"
                />
                <span>
                  {size}人{size === 8 ? '+' : ''}
                </span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onManualBroadcast('pickup')}
            className="h-7 px-3 bg-rad-dark hover:bg-rad-dark-card text-white rounded-rad text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <ShoppingBag className="w-[14px] h-[14px] text-amber-300" strokeWidth={2} />
            <span className="font-mono">喊取餐</span>
          </button>
          <button
            type="button"
            onClick={() => onManualBroadcast('table')}
            className="h-7 px-3 bg-rad-surface hover:bg-rad-subtle border border-rad-line text-rad-text-main rounded-rad text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <LayoutGrid className="w-[14px] h-[14px] text-rad-slate" strokeWidth={2} />
            <span className="font-mono">喊入座</span>
          </button>
        </div>
      </div>

      <p className="font-mono text-[10px] text-rad-text-muted flex items-center gap-1.5">
        <span className="text-sm leading-none">{personaAvatar}</span>
        当前音色包已就绪 · 支持一键循环切换真人母带
      </p>
    </section>
  );
};

export default CallingVoiceConsole;
