import React, { useState } from 'react';
import { Tag, Plus, X, Check, Sparkles, Flame, ChefHat, RotateCcw, Hash, Layers } from 'lucide-react';

export const FLAVOR_TAG_PRESET_CATEGORIES = [
  {
    id: 'roast_smoke',
    category: '🔥 经典炙烤 & 烟熏',
    tags: ['炙烤焦香', '果木熏香', '黑椒浓郁', '炭火微焦', '孜然飘香', '蒜香扑鼻', '经典炭烤', '葱香浓郁']
  },
  {
    id: 'texture',
    category: '🥩 口感质地 & 鲜汁',
    tags: ['鲜嫩多汁', '外酥里嫩', '弹牙爽脆', '入口即化', '软烂入味', '金黄酥脆', '爆汁爆浆', '肉质紧实']
  },
  {
    id: 'taste_layer',
    category: '🌶️ 味觉风味层次',
    tags: ['麻辣鲜香', '微辣过瘾', '甜咸适口', '蜜汁回甘', '青花藤椒', '黑松露香', '泰式酸辣', '奶香浓郁', '芝士拉丝']
  },
  {
    id: 'craft_special',
    category: '✨ 特色工艺 & 推荐',
    tags: ['手工现串', '主厨秘配', '原汁原味', '低卡轻食', '居酒屋经典', '下酒绝配', '招牌必点', '先卤后烤']
  }
];

export const ALL_FLAVOR_TAG_PRESETS = FLAVOR_TAG_PRESET_CATEGORIES.flatMap((c) => c.tags);

export const FLAVOR_TAG_PACKAGES = [
  { name: '🔥 炭烤招牌包', tags: ['炙烤焦香', '鲜嫩多汁', '黑椒浓郁', '炭火微焦'] },
  { name: '🌶️ 川香麻辣包', tags: ['麻辣鲜香', '青花藤椒', '微辣过瘾', '下酒绝配'] },
  { name: '🧀 芝士拉丝包', tags: ['奶香浓郁', '芝士拉丝', '金黄酥脆', '甜咸适口'] },
  { name: '🌿 清爽低卡包', tags: ['原汁原味', '低卡轻食', '弹牙爽脆', '主厨秘配'] },
  { name: '🍯 蜜汁甜香包', tags: ['蜜汁回甘', '外酥里嫩', '果木熏香', '招牌必点'] }
];

interface FlavorTagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  title?: string;
  description?: string;
  compact?: boolean;
  /** 'industrial' = 跟随 DishParameterRulesModal 工业控制台风视觉（默认 default 兼容旧样式） */
  variant?: 'default' | 'industrial';
}

export const FlavorTagSelector: React.FC<FlavorTagSelectorProps> = ({
  selectedTags = [],
  onChange,
  title = '菜品风味标签设定 (Flavor Tags)',
  description = '支持多选预设标签及自定义新增风味标签，在前台菜品详情与列表中实时展示',
  compact = false,
  variant = 'default'
}) => {
  const ind = variant === 'industrial';
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTagsPool, setCustomTagsPool] = useState<string[]>(() => {
    // Collect any current tags that are not in the predefined presets
    return selectedTags.filter((t) => !ALL_FLAVOR_TAG_PRESETS.includes(t));
  });

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;

    if (!selectedTags.includes(trimmed)) {
      onChange([...selectedTags, trimmed]);
    }
    if (!customTagsPool.includes(trimmed) && !ALL_FLAVOR_TAG_PRESETS.includes(trimmed)) {
      setCustomTagsPool((prev) => [...prev, trimmed]);
    }
    setCustomTagInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomTag();
    }
  };

  const handleApplyPackage = (pkgTags: string[]) => {
    // Merge without duplicates
    const combined = Array.from(new Set([...selectedTags, ...pkgTags]));
    onChange(combined);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // Filter tags based on selected category tab
  const displayCategories =
    activeCategory === 'all'
      ? FLAVOR_TAG_PRESET_CATEGORIES
      : FLAVOR_TAG_PRESET_CATEGORIES.filter((c) => c.id === activeCategory);

  return (
    <div className={ind ? "p-3.5 bg-[#f9f9f7] border border-[#e2e3e1] space-y-3" : "p-space-md bg-surface-canvas border border-border-hairline space-y-space-md"}>
      {/* 1. Header with Info & Active Count */}
      <div className="flex items-center justify-between flex-wrap gap-space-xs pb-space-xs border-b border-border-hairline">
        <div className="flex items-center gap-space-xs font-bold text-on-surface font-headline-sm text-headline-sm">
          <Tag className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <span>{title}</span>
          <span className="bg-primary text-on-primary font-label-micro text-label-micro px-1.5 py-0.5">
            已选 {selectedTags.length}
          </span>
        </div>
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="font-label-micro text-label-micro text-text-muted hover:text-status-alert flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>清空已选</span>
          </button>
        )}
      </div>

      {description && !ind && (
        <p className="font-body-sm text-body-sm text-text-muted -mt-1 leading-snug">
          {description}
        </p>
      )}
      {ind && (
        <p className="text-[10px] text-[#787770] -mt-1 leading-snug">
          多选预设或自定义标签 · 顾客端实时展示
        </p>
      )}

      {/* 2. Currently Selected Tags (Active Display Box) */}
      <div className={ind ? "p-2.5 bg-[#ffffff] border border-[#d3d1cb] space-y-1.5" : "p-space-sm bg-surface-container border border-border-control space-y-space-xs"}>
        <div className="flex items-center justify-between font-label-sm text-label-sm">
          <span className="font-bold text-on-surface flex items-center gap-1">
            <Hash className="w-3 h-3 text-text-muted" />
            <span>{ind ? "顾客端展示标签:" : "当前菜品风味标签 (顾客端展示):"}</span>
          </span>
          <span className="font-label-micro text-label-micro text-text-muted font-mono">
            {selectedTags.length === 0 ? '点击下方标签即可多选添加' : `共 ${selectedTags.length} 个标签`}
          </span>
        </div>

        {selectedTags.length === 0 ? (
          <div className="py-2.5 px-3 border border-dashed border-border-control bg-surface-canvas text-center font-body-sm text-body-sm text-text-muted">
            暂未添加风味标签，可点击下方预设标签多选，或在输入框中自定义添加
          </div>
        ) : (
          <div className="flex flex-wrap gap-space-xs max-h-28 overflow-y-auto hide-scrollbar">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 bg-surface-canvas text-on-surface font-label-sm text-label-sm px-2 py-1 border border-border-hairline shadow-sm font-mono"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-status-alert text-text-muted cursor-pointer transition-colors"
                  title={`移除 ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3. Custom Tag Input Section */}
      <div className="space-y-1">
        <label className="font-label-sm text-label-sm text-text-secondary flex items-center gap-1 font-bold">
          <Plus className="w-3 h-3 text-text-muted" />
          <span>自定义添加风味标签:</span>
        </label>
        <div className="flex items-center gap-space-xs">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="输入自定义风味标签 (如: 迷迭香草、柠檬薄荷、芥末蜂蜜酱)"
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-1.5 bg-surface-container border border-border-control text-on-surface font-label-sm text-label-sm focus:outline-none focus:border-primary placeholder:text-text-muted shadow-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleAddCustomTag}
            disabled={!customTagInput.trim()}
            className={`px-3 py-1.5 font-label-sm text-label-sm font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              customTagInput.trim()
                ? 'bg-primary hover:bg-neutral-800 text-on-primary shadow-sm'
                : 'bg-surface-variant text-text-muted cursor-not-allowed'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>添加标签</span>
          </button>
        </div>
      </div>

      {/* 4. Quick Recommend Flavor Packages */}
      <div className="space-y-space-xs pt-1">
        <div className="flex items-center gap-1 font-label-sm text-label-sm font-bold text-on-surface">
          <Sparkles className="w-3 h-3 text-text-muted" />
          <span>{ind ? "快捷风味包:" : "快捷推荐风味包 (一键多选组合):"}</span>
        </div>
        <div className="flex flex-wrap gap-space-xs">
          {FLAVOR_TAG_PACKAGES.map((pkg) => {
            const isFullyApplied = pkg.tags.every((t) => selectedTags.includes(t));
            return (
              <button
                key={pkg.name}
                type="button"
                onClick={() => handleApplyPackage(pkg.tags)}
                className={`px-2 py-1 font-label-sm text-label-sm border transition-all cursor-pointer flex items-center gap-1 ${
                  isFullyApplied
                    ? 'bg-primary text-on-primary border-primary shadow-sm font-bold'
                    : 'bg-surface-container text-on-surface border-border-control hover:bg-surface-variant'
                }`}
                title={`包含: ${pkg.tags.join('、')}`}
              >
                <span>{pkg.name}</span>
                {isFullyApplied && <Check className="w-3 h-3 text-on-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Preset Categories & Multi-Select Tag Matrix */}
      <div className="space-y-space-xs pt-1 border-t border-border-hairline">
        {/* Category Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-1">
          <span className="font-label-sm text-label-sm font-bold text-on-surface flex items-center gap-1">
            <Layers className="w-3 h-3 text-text-muted" />
            <span>风味标签库多选区:</span>
          </span>

          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-2 py-0.5 font-label-micro text-label-micro font-semibold transition-colors cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface border border-border-control hover:bg-surface-variant'
              }`}
            >
              全部
            </button>
            {FLAVOR_TAG_PRESET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2 py-0.5 font-label-micro text-label-micro font-semibold transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface border border-border-control hover:bg-surface-variant'
                }`}
              >
                {cat.category.split(' ')[1] || cat.category}
              </button>
            ))}
          </div>
        </div>

        {/* Tag Matrix */}
        <div className={ind ? "space-y-2 max-h-44 overflow-y-auto hide-scrollbar p-2.5 bg-[#ffffff] border border-[#e2e3e1]" : "space-y-space-sm max-h-48 overflow-y-auto hide-scrollbar p-space-sm bg-surface-container border border-border-control"}>
          {displayCategories.map((group) => (
            <div key={group.id} className="space-y-1">
              <div className="font-label-micro text-label-micro font-bold text-text-muted font-mono">
                {group.category}
              </div>
              <div className="flex flex-wrap gap-space-xs">
                {group.tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-2 py-1 font-label-sm text-label-sm border transition-all cursor-pointer flex items-center gap-1 select-none font-mono ${
                        isSelected
                          ? 'bg-primary text-on-primary border-primary font-bold shadow-sm'
                          : 'bg-surface-container text-on-surface border-border-hairline hover:bg-surface-variant'
                      }`}
                    >
                      <span>{tag}</span>
                      {isSelected ? (
                        <Check className="w-3 h-3 text-on-primary shrink-0" />
                      ) : (
                        <span className="text-text-muted text-[10px]">+</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* If custom tags exist in pool and 'all' is selected */}
          {customTagsPool.length > 0 && activeCategory === 'all' && (
            <div className="space-y-1 pt-1 border-t border-border-hairline">
              <div className="font-label-micro text-label-micro font-bold text-text-muted font-mono">
                ✨ 自定义已添加历史池
              </div>
              <div className="flex flex-wrap gap-space-xs">
                {customTagsPool.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-2 py-1 font-label-sm text-label-sm border transition-all cursor-pointer flex items-center gap-1 select-none font-mono ${
                        isSelected
                          ? 'bg-primary text-on-primary border-primary font-bold shadow-sm'
                          : 'bg-surface-container text-on-surface border-dashed border-border-control hover:bg-surface-variant'
                      }`}
                    >
                      <span>{tag}</span>
                      {isSelected ? (
                        <Check className="w-3 h-3 text-on-primary shrink-0" />
                      ) : (
                        <span className="text-text-muted text-[10px]">+</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
