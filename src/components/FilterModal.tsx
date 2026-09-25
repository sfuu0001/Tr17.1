import React from 'react';
import {
  X,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Bike,
  Utensils,
  Layers,
  Sparkles,
  Tag,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { FilterOptions, INITIAL_FILTER_OPTIONS } from '../types/filter';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: FilterOptions;
  onChange: (options: FilterOptions) => void;
  resultCount: number;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  options,
  onChange,
  resultCount
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onChange(INITIAL_FILTER_OPTIONS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Container */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#e2e3e1] overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e2e3e1] bg-[#f9f9f7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-black" />
            <h2 className="text-base font-bold text-[#1a1c1b]">菜品筛选器</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-neutral-200 flex items-center justify-center text-[#787770] hover:text-black transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Price Range */}
          <div>
            <label className="text-xs font-bold text-[#787770] uppercase tracking-wider block mb-2.5">
              价格区间
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'all', label: '不限', icon: <Sparkles className="w-3 h-3 shrink-0" /> },
                { key: '0-30', label: '¥0-30', icon: <Tag className="w-3 h-3 shrink-0" /> },
                { key: '30-60', label: '¥30-60', icon: <Tag className="w-3 h-3 shrink-0" /> },
                { key: '60+', label: '¥60以上', icon: <Tag className="w-3 h-3 shrink-0" /> }
              ].map((item) => {
                const isSelected = options.priceRange === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      onChange({ ...options, priceRange: item.key as FilterOptions['priceRange'] })
                    }
                    className={`py-2 px-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-black text-white border-black shadow-xs'
                        : 'bg-white text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dining Type */}
          <div>
            <label className="text-xs font-bold text-[#787770] uppercase tracking-wider block mb-2.5">
              用餐与取餐模式
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'all', label: '全部方式', icon: <Layers className="w-3.5 h-3.5 shrink-0" /> },
                { key: 'delivery', label: '外卖配送', icon: <Bike className="w-3.5 h-3.5 shrink-0" /> },
                { key: 'dine_in', label: '现场堂食', icon: <Utensils className="w-3.5 h-3.5 shrink-0" /> }
              ].map((item) => {
                const isSelected = options.orderType === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      onChange({ ...options, orderType: item.key as FilterOptions['orderType'] })
                    }
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-black text-white border-black shadow-xs'
                        : 'bg-white text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feature Switches */}
          <div>
            <label className="text-xs font-bold text-[#787770] uppercase tracking-wider block mb-2.5">
              特色偏好
            </label>
            <div className="space-y-2">
              <label
                onClick={() => onChange({ ...options, onlyAvailable: !options.onlyAvailable })}
                className="flex items-center justify-between p-3 rounded-xl border border-[#e2e3e1] bg-white hover:bg-neutral-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-[#1a1c1b]">仅看当前可点选 (在售中)</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    options.onlyAvailable
                      ? 'bg-black border-black text-white'
                      : 'border-[#c8c7be] bg-white'
                  }`}
                >
                  {options.onlyAvailable && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </label>

              <label
                onClick={() => onChange({ ...options, hasDiscount: !options.hasDiscount })}
                className="flex items-center justify-between p-3 rounded-xl border border-[#e2e3e1] bg-white hover:bg-neutral-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-[#1a1c1b]">立减优惠 / 特惠菜品</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    options.hasDiscount
                      ? 'bg-black border-black text-white'
                      : 'border-[#c8c7be] bg-white'
                  }`}
                >
                  {options.hasDiscount && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </label>

              <label
                onClick={() => onChange({ ...options, isChefSpecial: !options.isChefSpecial })}
                className="flex items-center justify-between p-3 rounded-xl border border-[#e2e3e1] bg-white hover:bg-neutral-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="text-xs font-bold text-[#1a1c1b]">主厨特选 / 招牌推荐</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    options.isChefSpecial
                      ? 'bg-black border-black text-white'
                      : 'border-[#c8c7be] bg-white'
                  }`}
                >
                  {options.isChefSpecial && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f9f9f7] border-t border-[#e2e3e1] flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-lg border border-[#e2e3e1] bg-white text-xs font-bold text-[#474741] hover:text-black hover:bg-neutral-100 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer text-center shadow-xs"
          >
            查看筛选结果 ({resultCount} 款)
          </button>
        </div>
      </div>
    </div>
  );
};
