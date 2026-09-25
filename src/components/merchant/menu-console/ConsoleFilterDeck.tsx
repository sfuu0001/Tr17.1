import React from 'react';
import { Search, ChevronDown, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { ConsoleStatusFilter } from './consoleTokens';

/* ============================================================================
 * ③ CATEGORY & ADVANCED PARAMETERS FILTER DECK — 类目与高级参数筛选甲板
 * ----------------------------------------------------------------------------
 * 结构（与参考稿 section 2 对齐）：
 *   a. 9 类目横向滚动标签条（active = 深色结构块）
 *   b. 功能搜索台：56px 浮标搜索框 + 2 个 56px 浮标下拉 + 56px 漏斗按钮
 *   c. QUICK TAGS 快筛胶囊矩阵
 *   d. 可折叠的高级参数漏斗面板（价格区间 / 规格 / 条码 / 立减）
 * 三端：lg 起搜索台单行四段；lg 以下纵向堆叠，下拉与漏斗保持 56px 触控高度。
 * ========================================================================== */

const SELECT_TRIGGER =
  'relative h-14 bg-card-bg border border-border-main hover:border-slate-blue-border rounded-console transition-colors w-full lg:w-48';
const SELECT_FLOATING_LABEL =
  'absolute left-space-md top-2 font-label-micro text-text-muted uppercase tracking-wider leading-tight pointer-events-none z-10';
const SELECT_CONTROL =
  'absolute inset-0 w-full h-full pt-5 pb-1.5 pl-space-md pr-8 bg-transparent font-label-sm font-bold appearance-none cursor-pointer focus:outline-none';

interface QuickTag {
  label: string;
  query: string;
  /** 「珍稀部位」等高价值快筛使用琥珀高亮，与参考稿一致 */
  highlight?: boolean;
}

const QUICK_TAGS: QuickTag[] = [
  { label: '#全部', query: '' },
  { label: '#日式烧鸟', query: '烧鸟' },
  { label: '#备长炭烤', query: '炭烤' },
  { label: '#珍稀部位', query: '提灯', highlight: true },
  { label: '#芝士焗海鲜', query: '焗' },
  { label: '#金黄拉丝', query: '拉丝' },
  { label: '#招牌炭烤', query: '招牌' },
  { label: '#外卖专享', query: '外卖' }
];

export interface ConsoleFilterDeckProps {
  categories: Array<{ id: string; name: string; count: number }>;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: ConsoleStatusFilter;
  setStatusFilter: (filter: ConsoleStatusFilter) => void;
  cookingStyleFilter: string;
  setCookingStyleFilter: (style: string) => void;
  cookingStyles: string[];
  /** 用于下拉框读数（全渠道在售 / 已沽清计数） */
  activeCount: number;
  depletedCount: number;
  isAdvancedFilterOpen: boolean;
  setIsAdvancedFilterOpen: (open: boolean) => void;
  advPriceMin: string;
  setAdvPriceMin: (value: string) => void;
  advPriceMax: string;
  setAdvPriceMax: (value: string) => void;
  advHasVariants: boolean;
  setAdvHasVariants: (value: boolean) => void;
  advHasBarcode: boolean;
  setAdvHasBarcode: (value: boolean) => void;
  advHasDiscount: boolean;
  setAdvHasDiscount: (value: boolean) => void;
  onResetAllFilters: () => void;
}

export const ConsoleFilterDeck: React.FC<ConsoleFilterDeckProps> = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  cookingStyleFilter,
  setCookingStyleFilter,
  cookingStyles,
  activeCount,
  depletedCount,
  isAdvancedFilterOpen,
  setIsAdvancedFilterOpen,
  advPriceMin,
  setAdvPriceMin,
  advPriceMax,
  setAdvPriceMax,
  advHasVariants,
  setAdvHasVariants,
  advHasBarcode,
  setAdvHasBarcode,
  advHasDiscount,
  setAdvHasDiscount,
  onResetAllFilters
}) => {
  const advanceFilterCount =
    Number(Boolean(advPriceMin)) +
    Number(Boolean(advPriceMax)) +
    Number(advHasVariants) +
    Number(advHasBarcode) +
    Number(advHasDiscount);

  return (
    <div className="bg-card-bg rounded-console p-space-md border border-border-main space-y-space-md">
      {/* a. 类目标签条（移动端横向滚动，滚动条隐藏） */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 console-scroll-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const displayName = cat.id === 'all' ? '全部品类' : cat.name;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-space-md py-1.5 rounded-console font-label-sm tracking-tight whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-dark-container text-white font-bold'
                  : 'bg-card-bg border border-border-main hover:bg-slate-blue-bg hover:border-slate-blue-border text-slate-blue font-medium'
              }`}
            >
              {displayName} ({cat.count})
            </button>
          );
        })}
      </div>

      {/* b. 功能搜索台 */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-space-sm">
        {/* 浮标搜索框 */}
        <div className="flex-1 w-full h-14 flex items-center gap-space-sm bg-card-bg px-space-md rounded-console border border-border-main hover:border-slate-blue-border transition-colors">
          <Search className="w-[18px] h-[18px] text-text-muted shrink-0" strokeWidth={1.9} />
          <div className="flex flex-col justify-center flex-1 min-w-0">
            <span className="font-label-micro text-text-muted uppercase tracking-wider leading-tight">
              KEYWORD / CODE SEARCH
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索品名、英文代号、条形码、SOP 工艺..."
              className="bg-transparent text-text-prominent font-label-md placeholder:text-text-muted focus:outline-none w-full font-medium"
            />
          </div>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="font-label-micro px-1.5 py-0.5 rounded-console bg-page-bg border border-border-main text-text-muted hover:text-text-prominent uppercase shrink-0 cursor-pointer"
            >
              CLEAR
            </button>
          ) : (
            <span className="font-label-micro px-1.5 py-0.5 rounded-console bg-page-bg border border-border-main text-text-muted uppercase shrink-0">
              ESC
            </span>
          )}
        </div>

        {/* 制作风格下拉 */}
        <div className={SELECT_TRIGGER}>
          <span className={SELECT_FLOATING_LABEL}>CRAFT STYLE</span>
          <select
            aria-label="制作风格筛选"
            value={cookingStyleFilter === 'all' ? 'all' : cookingStyleFilter}
            onChange={(event) =>
              setCookingStyleFilter(event.target.value === 'all' ? 'all' : event.target.value)
            }
            className={`${SELECT_CONTROL} text-text-prominent`}
          >
            <option value="all">全部制作风格 (ALL)</option>
            {cookingStyles.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
          <ChevronDown className="w-[18px] h-[18px] text-slate-blue absolute right-space-md top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* 渠道状态下拉 */}
        <div className={SELECT_TRIGGER}>
          <span className={SELECT_FLOATING_LABEL}>CHANNEL STATUS</span>
          <select
            aria-label="渠道状态筛选"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ConsoleStatusFilter)}
            className={`${SELECT_CONTROL} ${
              statusFilter === 'available'
                ? 'text-status-olive'
                : statusFilter === 'unavailable'
                ? 'text-status-terracotta'
                : 'text-text-prominent'
            }`}
          >
            <option value="all">全渠道状态: 全部 ({activeCount + depletedCount})</option>
            <option value="available">全渠道在售 ({activeCount})</option>
            <option value="unavailable">全渠道已沽清 ({depletedCount})</option>
          </select>
          <ChevronDown className="w-[18px] h-[18px] text-slate-blue absolute right-space-md top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* 高级参数漏斗 */}
        <button
          type="button"
          title="高级参数漏斗"
          aria-label="高级参数漏斗"
          aria-pressed={isAdvancedFilterOpen}
          onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
          className={`relative w-full lg:w-14 h-14 flex items-center justify-center rounded-console border transition-all shrink-0 cursor-pointer ${
            isAdvancedFilterOpen || advanceFilterCount > 0
              ? 'bg-signal-sky-surface border-signal-sky-border text-signal-sky-strong'
              : 'bg-slate-blue-bg border-slate-blue-border text-slate-blue hover:bg-slate-blue hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" strokeWidth={1.9} />
          <span
            className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
              advanceFilterCount > 0 ? 'bg-status-terracotta' : 'bg-status-olive'
            }`}
          />
        </button>
      </div>

      {/* c. QUICK TAGS 快筛胶囊矩阵 */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider mr-1">QUICK TAGS:</span>
        {QUICK_TAGS.map((tag) => {
          const isAllActive = tag.label === '#全部' && !searchQuery;
          const isQueryActive = Boolean(tag.query) && searchQuery === tag.query;

          let tone = 'bg-card-bg border border-border-main text-slate-blue hover:bg-slate-blue-bg';
          if (isAllActive || isQueryActive) {
            tone = 'bg-dark-container text-white border border-transparent font-bold';
          } else if (tag.highlight) {
            tone = 'bg-signal-amber-surface border border-signal-amber text-signal-amber-strong font-bold';
          }

          return (
            <button
              key={tag.label}
              type="button"
              onClick={() => setSearchQuery(tag.query)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-console transition-colors cursor-pointer ${tone}`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>

      {/* d. 高级参数漏斗面板 */}
      {isAdvancedFilterOpen && (
        <div className="pt-space-md border-t border-border-main grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <span className="font-label-micro text-text-muted uppercase">PRICE RANGE (¥)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                placeholder="最低价"
                value={advPriceMin}
                onChange={(event) => setAdvPriceMin(event.target.value)}
                className="w-full h-8 px-2 bg-card-bg border border-border-main rounded-console font-label-md text-text-prominent placeholder:text-text-light-mono focus:outline-none focus:border-dark-container"
              />
              <span className="text-text-muted font-label-md">-</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="最高价"
                value={advPriceMax}
                onChange={(event) => setAdvPriceMax(event.target.value)}
                className="w-full h-8 px-2 bg-card-bg border border-border-main rounded-console font-label-md text-text-prominent placeholder:text-text-light-mono focus:outline-none focus:border-dark-container"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 h-8 mt-auto cursor-pointer select-none font-label-md text-text-body">
            <input
              type="checkbox"
              checked={advHasVariants}
              onChange={(event) => setAdvHasVariants(event.target.checked)}
              className="w-3.5 h-3.5 accent-dark-container rounded-console cursor-pointer"
            />
            <span>仅含多规格 / 变体矩阵</span>
          </label>

          <label className="flex items-center gap-2 h-8 mt-auto cursor-pointer select-none font-label-md text-text-body">
            <input
              type="checkbox"
              checked={advHasBarcode}
              onChange={(event) => setAdvHasBarcode(event.target.checked)}
              className="w-3.5 h-3.5 accent-dark-container rounded-console cursor-pointer"
            />
            <span>已绑定商品条码 (69 码)</span>
          </label>

          <div className="flex items-center gap-space-sm h-8 mt-auto">
            <label className="flex items-center gap-2 cursor-pointer select-none font-label-md text-text-body">
              <input
                type="checkbox"
                checked={advHasDiscount}
                onChange={(event) => setAdvHasDiscount(event.target.checked)}
                className="w-3.5 h-3.5 accent-dark-container rounded-console cursor-pointer"
              />
              <span>已配置立减</span>
            </label>
            <button
              type="button"
              onClick={onResetAllFilters}
              className="ml-auto flex items-center gap-1 px-2 py-1 bg-card-bg border border-border-main hover:bg-page-bg rounded-console font-label-micro text-text-secondary uppercase transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={2} />
              重置
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsoleFilterDeck;
