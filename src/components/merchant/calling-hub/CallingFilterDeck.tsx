import React from 'react';
import { Search } from 'lucide-react';
import { ChannelFilter, QueueCategoryFilter, WaitFocusFilter } from './callingTokens';

/* ============================================================================
 * ④ QUEUE TICKETS FILTER & DUAL-ROW INDUSTRIAL SELECTORS — 票据筛选选择器 [RAD OPS]
 * ----------------------------------------------------------------------------
 * 结构（参考稿 (4) section 4 对齐）：
 *   a. 状态页签行：活动页签为重色结构块（计数用 white/20 叠色），
 *      其余为白底描边；呼叫中/暂挂/完成分别用橙/琥珀/绿计数底色
 *      + 右侧等宽搜索框
 *   b. 双行选择器：CATEGORY（重色活动 chip）/ WAIT STATUS
 *      （超时=红底描边+脉冲点、队头就绪=绿底描边）
 * 三端：页签横向滚动；搜索 <sm 占满整行；选择器 1 列 → md 2 列。
 * ========================================================================== */

interface SelectorChip {
  key: string;
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: 'dark' | 'plain' | 'red' | 'green';
  pulse?: boolean;
}

const SelectorChip: React.FC<SelectorChip> = ({ label, active, onClick, tone = 'plain', pulse }) => {
  let skin: string;
  if (tone === 'dark') {
    skin = active ? 'bg-rad-dark text-white border border-transparent' : 'text-rad-text-muted hover:text-rad-text-main';
  } else if (tone === 'red') {
    skin = 'bg-rad-red-subtle border border-rad-red/30 text-rad-red';
  } else if (tone === 'green') {
    skin = 'bg-rad-green-subtle border border-rad-green/30 text-rad-green';
  } else {
    skin = active
      ? 'bg-rad-dark text-white border border-transparent'
      : 'bg-rad-surface border border-rad-line text-rad-text-main hover:bg-rad-subtle';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-2 py-0.5 rounded-rad-sm font-mono text-[11px] flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap font-medium ${skin}`}
    >
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-rad-red animate-ping" />}
      <span>{label}</span>
    </button>
  );
};

export interface CallingFilterDeckProps {
  activeFilter: QueueCategoryFilter;
  setActiveFilter: (filter: QueueCategoryFilter) => void;
  channelFilter: ChannelFilter;
  setChannelFilter: (filter: ChannelFilter) => void;
  waitFocus: WaitFocusFilter;
  setWaitFocus: (focus: WaitFocusFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  counts: {
    all: number;
    waiting: number;
    called: number;
    tempVoid: number;
    permVoid: number;
    finished: number;
    overdue: number;
    ready: number;
  };
}

export const CallingFilterDeck: React.FC<CallingFilterDeckProps> = ({
  activeFilter,
  setActiveFilter,
  channelFilter,
  setChannelFilter,
  waitFocus,
  setWaitFocus,
  searchQuery,
  setSearchQuery,
  counts
}) => {
  const tabs: Array<{ key: QueueCategoryFilter; label: string; count: number; countClass: string }> = [
    { key: 'all', label: '全部队列', count: counts.all, countClass: 'bg-white/20 text-white' },
    { key: 'waiting', label: '等候中', count: counts.waiting, countClass: 'bg-rad-subtle text-rad-text-muted' },
    { key: 'called', label: '呼叫中', count: counts.called, countClass: 'bg-rad-orange-subtle text-rad-orange font-bold' },
    { key: 'temp_void', label: '临时作废 (暂挂)', count: counts.tempVoid, countClass: 'bg-rad-amber-subtle text-rad-amber font-semibold' },
    { key: 'perm_void', label: '完全作废', count: counts.permVoid, countClass: 'bg-rad-subtle text-rad-text-muted' },
    { key: 'finished', label: '已就餐 / 已取餐', count: counts.finished, countClass: 'bg-rad-green-subtle text-rad-green' }
  ];

  return (
    <section className="bg-rad-surface border border-rad-line rounded-rad p-3 shadow-xs space-y-2.5">
      {/* a. 状态页签行 + 搜索 */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-rad-line-light">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 console-scroll-none max-w-full">
          {tabs.map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer bg-white border ${
                  active
                    ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                    : 'border-[#e6e6e4] hover:border-zinc-300 text-[#5a5854] hover:text-zinc-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                    active && tab.key === 'all'
                      ? 'bg-zinc-900 text-white'
                      : tab.countClass
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="w-[15px] h-[15px] absolute left-2 top-1.5 text-rad-text-muted pointer-events-none"
            strokeWidth={2}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSearchQuery('');
            }}
            placeholder="搜索排队号 / 手机尾号 / 顾客姓名... [ESC]"
            className="w-full h-7 pl-7 pr-2 bg-rad-inset border border-rad-line rounded-rad text-xs font-mono placeholder:text-rad-text-muted focus:outline-none focus:border-rad-dark focus:bg-white"
          />
        </div>
      </div>

      {/* b. 双行工业选择器 (Deck Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2 bg-[#fbfbfa] border border-[#e6e6e4] px-2.5 py-1.5 rounded-full">
          <span className="font-mono text-[10px] text-[#787774] uppercase font-bold whitespace-nowrap">
            CHANNEL:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setChannelFilter('all')}
              className={`px-3 py-1 rounded-full font-mono text-[11px] flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap font-medium border ${
                channelFilter === 'all'
                  ? 'bg-[#37352f] text-white border-[#37352f] font-semibold shadow-2xs'
                  : 'bg-white text-[#5b5a56] hover:text-[#191817] border-[#e6e6e4]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${channelFilter === 'all' ? 'bg-[#4dab63]' : 'bg-[#d3d1cb]'}`} />
              <span>全部渠道</span>
            </button>

            <button
              type="button"
              onClick={() => setChannelFilter('pickup')}
              className={`px-3 py-1 rounded-full font-mono text-[11px] flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap font-medium border ${
                channelFilter === 'pickup'
                  ? 'bg-[#d9730d] text-white border-[#d9730d] font-semibold shadow-2xs'
                  : 'bg-[#fdf8f4] text-[#b06000] hover:bg-[#fbeddb] border-[#fae2a0]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${channelFilter === 'pickup' ? 'bg-white' : 'bg-[#d9730d]'}`} />
              <span>🛍️ 自提 (PICKUP)</span>
            </button>

            <button
              type="button"
              onClick={() => setChannelFilter('table')}
              className={`px-3 py-1 rounded-full font-mono text-[11px] flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap font-medium border ${
                channelFilter === 'table'
                  ? 'bg-[#37352f] text-white border-[#37352f] font-semibold shadow-2xs'
                  : 'bg-[#f7f7f5] text-[#37352f] hover:bg-[#efefed] border-[#d3d1cb]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${channelFilter === 'table' ? 'bg-[#4dab63]' : 'bg-[#787774]'}`} />
              <span>🍽️ 堂食 (DINE-IN)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#fbfbfa] border border-[#e6e6e4] px-2.5 py-1.5 rounded-full justify-between md:justify-start">
          <span className="font-mono text-[10px] text-[#787774] uppercase font-bold whitespace-nowrap">
            WAIT STATUS:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setWaitFocus('all')}
              className={`px-3 py-1 rounded-full font-mono text-[11px] flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap font-medium border ${
                waitFocus === 'all'
                  ? 'bg-[#37352f] text-white border-[#37352f] font-semibold shadow-2xs'
                  : 'bg-white text-[#5b5a56] hover:text-[#191817] border-[#e6e6e4]'
              }`}
            >
              <span>全部进度</span>
            </button>

            <button
              type="button"
              onClick={() => setWaitFocus('overdue')}
              className={`px-3 py-1 rounded-full font-mono text-[11px] flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap font-medium border ${
                waitFocus === 'overdue'
                  ? 'bg-rose-600 text-white border-rose-600 font-semibold shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
              }`}
            >
              {counts.overdue > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />}
              <span>超时预警 ({counts.overdue})</span>
            </button>

            <button
              type="button"
              onClick={() => setWaitFocus('ready')}
              className={`px-3 py-1 rounded-full font-mono text-[11px] flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap font-medium border ${
                waitFocus === 'ready'
                  ? 'bg-[#2b593f] text-white border-[#2b593f] font-semibold shadow-2xs'
                  : 'bg-[#f2f8f4] text-[#1e4632] hover:bg-[#e6f4ec] border-[#c4e3d0]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#4dab63]" />
              <span>队头就绪 ({counts.ready})</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallingFilterDeck;
