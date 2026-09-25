import React, { useState } from 'react';
import {
  Flame,
  ChefHat,
  Sparkles,
  BookOpen,
  Thermometer,
  Clock,
  Scale,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { CraftStandardItem, SauceRecipeItem } from '../../types';
import { INITIAL_CRAFT_ITEMS, INITIAL_SAUCE_RECIPES } from '../../data/mockEnhancedData';

interface MerchantCraftSOPProps {
  showToast: (msg: string) => void;
}

export const MerchantCraftSOP: React.FC<MerchantCraftSOPProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'sop' | 'sauces'>('sop');
  const [selectedCraft, setSelectedCraft] = useState<CraftStandardItem>(INITIAL_CRAFT_ITEMS[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredCrafts = INITIAL_CRAFT_ITEMS.filter((item) => {
    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tasteProfile.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Header Navigation Controller */}
      <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-3 flex-wrap shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('sop')}
            className={`px-3 py-1.5 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sop'
                ? 'bg-[#37352f] text-white shadow-xs'
                : 'bg-[#f1f1ef] text-[#5a5854] hover:bg-[#e8e8e6]'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5 text-[#fde047]" />
            <span>菜品烤制工艺 SOP 标卡 (Craft SOP)</span>
            <span className="font-mono text-[10px] bg-black/20 px-1 rounded">
              {INITIAL_CRAFT_ITEMS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sauces')}
            className={`px-3 py-1.5 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sauces'
                ? 'bg-[#37352f] text-white shadow-xs'
                : 'bg-[#f1f1ef] text-[#5a5854] hover:bg-[#e8e8e6]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#d9730d]" />
            <span>酱料撒料配方库 (Sauce &amp; BOM)</span>
            <span className="font-mono text-[10px] bg-black/20 px-1 rounded">
              {INITIAL_SAUCE_RECIPES.length}
            </span>
          </button>
        </div>

        <div className="text-[11px] text-[#787774]">
          标准化出品规范 · 统一温控时间与撒料节奏
        </div>
      </div>

      {/* 2. SOP Section */}
      {activeTab === 'sop' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Left Menu / Craft Cards List (4 cols) */}
          <div className="md:col-span-4 space-y-2.5">
            <div className="bg-white p-2.5 rounded-[3px] border border-[#e6e6e4] space-y-2 shadow-2xs">
              {/* Category Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: '全部' },
                  { id: 'meat', label: '牛羊肉类' },
                  { id: 'seafood', label: '海鲜类' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2 py-0.5 rounded-[2px] text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-[#37352f] text-white'
                        : 'bg-[#efefed] text-[#5a5854] hover:bg-[#e6e6e4]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Craft Cards */}
              <div className="space-y-1.5">
                {filteredCrafts.map((craft) => {
                  const isSelected = selectedCraft.id === craft.id;
                  return (
                    <div
                      key={craft.id}
                      onClick={() => setSelectedCraft(craft)}
                      className={`p-2.5 rounded-[3px] border transition-all cursor-pointer space-y-1 ${
                        isSelected
                          ? 'bg-[#fbf3db] border-[#d9730d] shadow-xs'
                          : 'bg-[#fbfbfa] border-[#e6e6e4] hover:border-[#37352f]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#37352f]">{craft.name}</span>
                        <span className="font-mono text-[11px] text-[#2b593f] font-bold">
                          ¥{craft.pricePerSkewer.toFixed(1)}/串
                        </span>
                      </div>
                      <p className="text-[10.5px] text-[#787774] truncate">{craft.tasteProfile}</p>
                      <div className="flex items-center gap-2 text-[9.5px] text-[#5a5854] pt-0.5 border-t border-[#efefed]">
                        <span>炉温: {craft.grillTemp.split(' ')[0]}</span>
                        <span>烤时: {craft.grillTimeMin}m</span>
                        <span>克重: {craft.standardWeightG}g</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Detail Inspection Stage (8 cols) */}
          <div className="md:col-span-8 space-y-3">
            {/* Header info */}
            <div className="bg-white p-4 rounded-[3px] border border-[#e6e6e4] space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#efefed] pb-2.5 flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#37352f]">{selectedCraft.name}</h3>
                    <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.5 rounded font-bold">
                      {selectedCraft.categoryName}
                    </span>
                    <span className="text-[10px] bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8] px-1.5 py-0.5 rounded font-bold">
                      标准单串 {selectedCraft.standardWeightG}g
                    </span>
                  </div>
                  <p className="text-[11px] text-[#787774] mt-0.5">
                    核心风味特征: {selectedCraft.tasteProfile}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#787774] block">建议售价</span>
                  <span className="font-mono font-bold text-lg text-[#2b593f]">
                    ¥{selectedCraft.pricePerSkewer.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* 4 Core Dimensions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* 1. 选料与切配 */}
                <div className="bg-[#fbfbfa] p-3 rounded-[3px] border border-[#e6e6e4] space-y-1.5">
                  <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-[#2b593f]" />
                    <span>① 选料与切配规范</span>
                  </h4>
                  <div className="space-y-1 text-[11px] text-[#5a5854]">
                    <div>
                      <strong className="text-[#37352f]">推荐部位:</strong> {selectedCraft.recommendedPart}
                    </div>
                    <div>
                      <strong className="text-[#37352f]">黄金肥瘦比:</strong> {selectedCraft.fatLeanRatio}
                    </div>
                    <div>
                      <strong className="text-[#37352f]">切配规格:</strong> {selectedCraft.cutSize}
                    </div>
                    <div>
                      <strong className="text-[#37352f]">下刀手法:</strong> {selectedCraft.cutDirection}
                    </div>
                  </div>
                </div>

                {/* 2. 腌制配方 */}
                <div className="bg-[#fbfbfa] p-3 rounded-[3px] border border-[#e6e6e4] space-y-1.5">
                  <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#1c5598]" />
                    <span>② 腌制与配料标准</span>
                  </h4>
                  <div className="space-y-1 text-[11px] text-[#5a5854]">
                    <div>
                      <strong className="text-[#37352f]">腌制流派:</strong> {selectedCraft.marinadeType}
                    </div>
                    <div>
                      <strong className="text-[#37352f]">温控与时长:</strong> {selectedCraft.marinadeTemp}℃ 冷藏 / {selectedCraft.marinadeRecommendedMin} 分钟
                    </div>
                    <div>
                      <strong className="text-[#37352f]">配料比 (每kg):</strong>{' '}
                      {selectedCraft.marinadeIngredients
                        .map((m) => `${m.name} ${m.qtyPerKg}${m.unit}`)
                        .join(' + ')}
                    </div>
                    <div className="text-[10px] text-[#787774]">
                      {selectedCraft.marinadeNotes}
                    </div>
                  </div>
                </div>

                {/* 3. 烤制 SOP */}
                <div className="bg-[#fbfbfa] p-3 rounded-[3px] border border-[#e6e6e4] space-y-1.5 sm:col-span-2">
                  <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-[#d9730d]" />
                    <span>③ 烤炉温控与翻面撒料 SOP (核心出餐标准)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#5a5854]">
                    <div>
                      <strong className="text-[#37352f]">炭火温度:</strong>{' '}
                      <span className="font-mono text-[#d9730d] font-bold">
                        {selectedCraft.grillTemp}
                      </span>
                    </div>
                    <div>
                      <strong className="text-[#37352f]">标准烤时:</strong>{' '}
                      <span className="font-mono font-bold text-[#37352f]">
                        {selectedCraft.grillTimeMin} 分钟
                      </span>
                    </div>
                    <div>
                      <strong className="text-[#37352f]">翻烤节奏:</strong> {selectedCraft.turningMethod}
                    </div>
                    <div>
                      <strong className="text-[#37352f]">撒料时机:</strong> {selectedCraft.seasoningTiming}
                    </div>
                    <div className="sm:col-span-2">
                      <strong className="text-[#37352f]">熟度判定:</strong> {selectedCraft.donenessCheck}
                    </div>
                  </div>
                </div>

                {/* 4. 避坑与食品安全 */}
                <div className="bg-[#fff7ed] p-3 rounded-[3px] border border-[#fed7aa] space-y-1 sm:col-span-2 text-xs">
                  <div className="flex items-center gap-1.5 text-[#ea580c] font-bold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>烤师防踩坑与安全警告 (Avoidance SOP)</span>
                  </div>
                  <p className="text-[11px] text-[#9a3412] leading-relaxed">
                    {selectedCraft.smokeAndOilNote}
                  </p>
                </div>
              </div>

              {/* 5. 分步工序流程 */}
              <div className="space-y-2 pt-2 border-t border-[#efefed]">
                <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#787774]" />
                  <span>分步标准化作业工序 (Standard Work Steps)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {selectedCraft.prepSteps.map((s) => (
                    <div
                      key={s.step}
                      className="bg-[#fbfbfa] p-2.5 rounded-[3px] border border-[#e6e6e4] space-y-1 text-center"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#37352f] text-white inline-flex items-center justify-center font-bold text-[10px]">
                        {s.step}
                      </span>
                      <h5 className="font-bold text-xs text-[#37352f]">{s.title}</h5>
                      <p className="text-[10px] text-[#787774]">{s.desc}</p>
                      <span className="inline-block text-[9px] font-mono font-bold bg-[#edf3ec] text-[#2b593f] px-1 rounded border border-[#c4dcbc]">
                        {s.keyMetric}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Sauces & Seasoning BOM Section */}
      {activeTab === 'sauces' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INITIAL_SAUCE_RECIPES.map((sauce) => (
            <div
              key={sauce.id}
              className="bg-white rounded-[3px] border border-[#e6e6e4] p-3.5 space-y-2.5 shadow-2xs hover:border-[#37352f] transition-all"
            >
              <div className="flex items-center justify-between border-b border-[#efefed] pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      sauce.type === '撒料'
                        ? 'bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8]'
                        : 'bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc]'
                    }`}
                  >
                    {sauce.type}
                  </span>
                  <h4 className="font-bold text-xs text-[#37352f]">{sauce.name}</h4>
                </div>
                <span className="text-[10px] text-[#787774]">保质期: {sauce.shelfLifeDays}天</span>
              </div>

              <div className="space-y-1.5 text-xs text-[#5a5854]">
                <div>
                  <strong className="text-[#37352f] text-[11px] block mb-0.5">适用场景:</strong>
                  <p className="text-[11px] text-[#787774] bg-[#fbfbfa] p-1.5 rounded-[2px] border border-[#efefed]">
                    {sauce.usage}
                  </p>
                </div>

                <div>
                  <strong className="text-[#37352f] text-[11px] block mb-0.5">
                    标准配比 BOM (精确克重):
                  </strong>
                  <p className="text-[11px] text-[#37352f] font-mono bg-[#fbfbfa] p-2 rounded-[2px] border border-[#e6e6e4] leading-relaxed">
                    {sauce.ingredients}
                  </p>
                </div>

                <div className="bg-[#fffbeb] p-2 rounded-[2px] border border-[#fde68a] text-[10.5px] text-[#b45309]">
                  <strong>操作窍门:</strong> {sauce.keyTips}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
