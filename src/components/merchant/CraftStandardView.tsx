import React, { useState } from 'react';
import {
  ChefHat,
  Search,
  Sparkles,
  Calculator,
  Flame,
  Scale,
  TrendingUp,
  Cloud,
  Database,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Layers,
  Clock,
  Info,
  DollarSign
} from 'lucide-react';
import { CraftStandardItem } from '../../types';
import { INITIAL_CRAFT_ITEMS } from '../../data/mockEnhancedData';
import { CraftDetailModal } from './CraftDetailModal';

interface CraftStandardViewProps {
  showToast: (msg: string) => void;
}

export const CraftStandardView: React.FC<CraftStandardViewProps> = ({ showToast }) => {
  const [styleMode, setStyleMode] = useState<'new' | 'original'>('new');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  
  // Detail Modal state
  const [modalCraft, setModalCraft] = useState<CraftStandardItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Categories matching user's full spec
  const categories = [
    '全部',
    '烤肉类',
    '海鲜类',
    '蔬菜类',
    '豆制品类',
    '主食面点类',
    '特色网红类',
    '特色内脏类'
  ];

  const filteredCrafts = INITIAL_CRAFT_ITEMS.filter((item) => {
    // Category match
    const matchCategory =
      selectedCategory === '全部' ||
      item.categoryName === selectedCategory ||
      (selectedCategory === '烤肉类' && item.category === 'meat') ||
      (selectedCategory === '海鲜类' && item.category === 'seafood') ||
      (selectedCategory === '蔬菜类' && (item.category === 'veg' || item.category === 'veggie')) ||
      (selectedCategory === '豆制品类' && item.category === 'tofu') ||
      (selectedCategory === '主食面点类' && (item.categoryName === '主食面点类' || item.subCategory === '面点' || item.subCategory === '米制品')) ||
      (selectedCategory === '特色网红类' && (item.categoryName === '特色网红类' || item.category === 'special' || item.subCategory === '锡纸类' || item.subCategory === '甜品烤物' || item.subCategory === '特色小吃' || item.subCategory === '卷类')) ||
      (selectedCategory === '特色内脏类' && (item.categoryName === '特色内脏类' || item.subCategory === '禽内脏' || item.subCategory === '羊肉类' || item.name.includes('肠') || item.name.includes('腰') || item.name.includes('心') || item.name.includes('胗')));

    // Search query match
    const q = (searchQuery || globalSearchQuery).trim().toLowerCase();
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.categoryName && item.categoryName.toLowerCase().includes(q)) ||
      (item.subCategory && item.subCategory.toLowerCase().includes(q)) ||
      (item.flavorTag && item.flavorTag.toLowerCase().includes(q)) ||
      (item.tasteProfile && item.tasteProfile.toLowerCase().includes(q)) ||
      (item.recommendedPart && item.recommendedPart.toLowerCase().includes(q));

    return matchCategory && matchSearch;
  });

  const handleOpenDetail = (craft: CraftStandardItem) => {
    setModalCraft(craft);
    setIsModalOpen(true);
  };

  const getFlavorStyle = (tag?: string) => {
    switch (tag) {
      case '蜜汁':
        return {
          bg: 'bg-[#fff7ed] border-[#ffedd5] text-[#c2410c]',
          dot: 'bg-[#ea580c]'
        };
      case '原味':
      case '原味孜然':
        return {
          bg: 'bg-[#f1f5f9] border-[#e2e8f0] text-[#475569]',
          dot: 'bg-[#94a3b8]'
        };
      case '香辣':
      case '剁椒':
        return {
          bg: 'bg-[#fef2f2] border-[#fee2e2] text-[#b91c1c]',
          dot: 'bg-[#ef4444]'
        };
      case '蒜蓉':
        return {
          bg: 'bg-[#ecfdf5] border-[#d1fae5] text-[#047857]',
          dot: 'bg-[#10b981]'
        };
      case '黑椒':
      case '奥尔良':
        return {
          bg: 'bg-[#fffbeb] border-[#fde68a] text-[#b45309]',
          dot: 'bg-[#f59e0b]'
        };
      default:
        return {
          bg: 'bg-[#fff7ed] border-[#ffedd5] text-[#c2410c]',
          dot: 'bg-[#ea580c]'
        };
    }
  };

  return (
    <div id="craft-standard-view" className="space-y-3 text-xs text-[#0f172a]">
      {/* 1. Top Global Search Bar */}
      <div className="bg-white p-2.5 rounded-[3px] border border-[#e6e6e4] shadow-2xs flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-[#787774] shrink-0 ml-1" />
        <input
          type="text"
          placeholder="搜索原料、报损记录、员工、SKU..."
          value={globalSearchQuery}
          onChange={(e) => setGlobalSearchQuery(e.target.value)}
          className="w-full text-xs text-[#37352f] placeholder-[#9b9a97] bg-transparent focus:outline-none font-normal"
        />
      </div>

      {/* 2. Main Page Header matching precision standard */}
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-bold text-[#0f172a] tracking-tight">
            烤串工艺与配方标准
          </h1>
          <span className="text-[11px] text-[#787774] hidden sm:inline font-normal">
            出肉率核算与标准克重穿串 SOP
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented Switcher [ 新样式 | 原样式 ] */}
          <div className="bg-[#f1f1ef] p-0.5 rounded-[3px] border border-[#e6e6e4] flex items-center">
            <button
              type="button"
              onClick={() => setStyleMode('new')}
              className={`px-2.5 py-0.5 rounded-[2px] text-xs transition-all cursor-pointer ${
                styleMode === 'new'
                  ? 'bg-white text-[#37352f] font-medium shadow-2xs'
                  : 'text-[#787774] hover:text-black font-normal'
              }`}
            >
              紧凑视图
            </button>
            <button
              type="button"
              onClick={() => setStyleMode('original')}
              className={`px-2.5 py-0.5 rounded-[2px] text-xs transition-all cursor-pointer ${
                styleMode === 'original'
                  ? 'bg-white text-[#37352f] font-medium shadow-2xs'
                  : 'text-[#787774] hover:text-black font-normal'
              }`}
            >
              明细清单
            </button>
          </div>

          {/* Status Badge: ● 云端 */}
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] px-2 py-0.5 rounded-[3px] text-[11px] font-normal flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>云端基准</span>
          </div>
        </div>
      </div>

      {/* 3. Sub Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-[#787774] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="搜索串品 / 原料 / 味型…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-[#e6e6e4] rounded-[3px] pl-8 pr-3 py-1.5 text-xs text-[#37352f] placeholder-[#9b9a97] focus:outline-none focus:border-[#2383e2] shadow-2xs font-normal"
        />
      </div>

      {/* 4. Category Pills Horizontal Filter */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 hide-scrollbar">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-[3px] text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-[#37352f] text-white border-[#37352f] font-medium shadow-2xs'
                  : 'bg-white text-[#5a5853] hover:text-black border-[#e6e6e4] hover:bg-[#f1f1ef] font-normal'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 5. Content Area depending on styleMode */}
      {styleMode === 'new' ? (
        /* --- NEW STYLE: 2-column Compact Bento Skewer Cards --- */
        <div className="grid grid-cols-2 gap-2.5 pb-2">
          {filteredCrafts.map((craft) => {
            const yieldVal = craft.yieldRate
              ? (craft.yieldRate <= 1 ? Math.round(craft.yieldRate * 100) : craft.yieldRate)
              : 85;
            const skewersPerKgVal = craft.skewersPerKg || (craft.standardWeightG ? Number(((yieldVal / 100 * 1000) / craft.standardWeightG).toFixed(1)) : 28.3);
            const displayFlavor = craft.flavorTag || '蜜汁';
            const flavorStyle = getFlavorStyle(displayFlavor);
            const profitVal = craft.estimatedProfit 
              ? craft.estimatedProfit.toFixed(2)
              : (craft.pricePerSkewer * 0.55).toFixed(2);

            return (
              <button
                key={craft.id}
                type="button"
                onClick={() => handleOpenDetail(craft)}
                className="bg-white border border-[#e6e6e4] rounded-[3px] p-2.5 sm:p-3 text-left active:scale-[0.99] transition-all duration-150 group cursor-pointer shadow-2xs hover:border-[#d3d1cb] flex flex-col justify-between"
              >
                <div>
                  {/* Header: Title + Flavor Badge */}
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="text-sm font-semibold text-[#0f172a] leading-snug group-hover:text-[#2383e2] transition-colors truncate">
                      {craft.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[2px] border ${flavorStyle.bg} font-normal shrink-0`}>
                      <span className={`w-1 h-1 rounded-full ${flavorStyle.dot}`} />
                      {displayFlavor}
                    </span>
                  </div>

                  {/* Subcategory Tags */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#fbfbfa] text-[#787774] font-normal rounded-[2px] border border-[#e6e6e4]">
                      {craft.categoryName || '烤肉类'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#fbfbfa] text-[#787774] font-normal rounded-[2px] border border-[#e6e6e4]">
                      {craft.subCategory || '猪肉类'}
                    </span>
                  </div>

                  {/* 3 Metric Rows */}
                  <div className="mt-2 space-y-0.5 text-[11px] text-[#787774]">
                    <div className="flex justify-between">
                      <span className="font-normal">克重</span>
                      <span className="font-normal font-mono text-[#37352f]">{craft.standardWeightG || 30}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-normal">出肉率</span>
                      <span className="font-medium font-mono text-emerald-700">{yieldVal}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-normal">每kg出串</span>
                      <span className="font-normal font-mono text-[#37352f]">{skewersPerKgVal}串</span>
                    </div>
                  </div>
                </div>

                {/* Footer: Price + Profit */}
                <div className="mt-2 pt-2 border-t border-[#f1f1ef] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#0f172a] font-mono">
                    ¥{craft.pricePerSkewer.toFixed(2)}
                    <span className="text-[10px] font-normal text-[#787774]">/串</span>
                  </span>
                  <span className="text-[10.5px] font-medium text-emerald-800 font-mono">
                    毛利 ¥{profitVal}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* --- ORIGINAL STYLE: 1-column Full Width Detailed Cards with SOP Summary & Cost Calculation --- */
        <div className="space-y-2 pb-2">
          {filteredCrafts.map((craft) => {
            const yieldVal = craft.yieldRate
              ? (craft.yieldRate <= 1 ? Math.round(craft.yieldRate * 100) : craft.yieldRate)
              : 85;
            const skewersPerKgVal = craft.skewersPerKg || (craft.standardWeightG ? Number(((yieldVal / 100 * 1000) / craft.standardWeightG).toFixed(1)) : 28.3);
            const displayFlavor = craft.flavorTag || '蜜汁';
            const flavorStyle = getFlavorStyle(displayFlavor);
            const profitVal = craft.estimatedProfit 
              ? craft.estimatedProfit.toFixed(2)
              : (craft.pricePerSkewer * 0.55).toFixed(2);
            const theoreticalCost = (craft.pricePerSkewer - Number(profitVal)).toFixed(2);

            return (
              <button
                key={craft.id}
                type="button"
                onClick={() => handleOpenDetail(craft)}
                className="w-full bg-white border border-[#e6e6e4] rounded-[3px] p-3 sm:p-3.5 text-left active:scale-[0.99] transition-all cursor-pointer shadow-2xs hover:border-[#d3d1cb] group"
              >
                {/* Header: Name + Flavor + Subcategories + Yield Rate */}
                <div className="flex justify-between items-start border-b border-[#f1f1ef] pb-2 gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-[#0f172a] text-sm group-hover:text-[#2383e2] transition-colors">
                        {craft.name}
                      </h3>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[2px] border ${flavorStyle.bg} font-normal shrink-0`}>
                        <span className={`w-1 h-1 rounded-full ${flavorStyle.dot}`} />
                        {displayFlavor}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className="text-[10.5px] px-1.5 py-0.5 bg-[#fbfbfa] text-[#787774] font-normal rounded-[2px] border border-[#e6e6e4]">
                        {craft.categoryName || '烤肉类'}
                      </span>
                      <span className="text-[10.5px] px-1.5 py-0.5 bg-[#fbfbfa] text-[#787774] font-normal rounded-[2px] border border-[#e6e6e4]">
                        {craft.subCategory || '猪肉类'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11.5px] font-semibold text-emerald-700 font-mono shrink-0">
                    出肉率 {yieldVal}%
                  </span>
                </div>

                {/* Detailed Metrics Table */}
                <div className="space-y-1 text-xs text-[#787774] mt-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-normal">原料肉名称</span>
                    <span className="font-normal text-[#37352f] text-right truncate max-w-[200px]">
                      {craft.recommendedPart || craft.name}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-normal">每串标准克重</span>
                    <span className="font-normal font-mono text-[#37352f]">{craft.standardWeightG || 30} g</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-normal">毛肉每kg理论出串数</span>
                    <span className="font-normal font-mono text-[#37352f]">{skewersPerKgVal} 串</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="font-normal">单串理论成本</span>
                    <span className="font-medium font-mono text-[#37352f]">¥{theoreticalCost}</span>
                  </div>
                </div>

                {/* SOP Key Note Box */}
                <div className="mt-2 text-[11px] text-[#787774] leading-relaxed bg-[#fbfbfa] p-2 rounded-[2px] border border-[#e6e6e4]">
                  <span className="font-medium text-[#37352f] inline-block mr-1">穿串与切割要领:</span>
                  <span className="font-normal text-[#5a5853] line-clamp-2">
                    {craft.threadingMethod || craft.cutDirection || `${craft.name}标准工艺，中火快烤锁汁。`}
                  </span>
                </div>

                {/* Card Bottom: Price + Profit + 查看详情 */}
                <div className="mt-2 pt-2 border-t border-[#f1f1ef] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#0f172a] font-mono">
                      ¥{craft.pricePerSkewer.toFixed(2)}
                      <span className="text-[10px] font-normal text-[#787774]">/串</span>
                    </span>
                    <span className="text-[10.5px] font-medium text-emerald-800 font-mono">
                      毛利 ¥{profitVal}
                    </span>
                  </div>
                  <span className="flex items-center gap-0.5 text-[11px] font-normal text-[#2383e2]">
                    <span>查看工艺详情</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail Modal Component */}
      {isModalOpen && modalCraft && (
        <CraftDetailModal
          craft={modalCraft}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
};
