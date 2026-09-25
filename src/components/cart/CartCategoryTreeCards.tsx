import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight,
  Plus,
  ArrowRight,
  Layers,
  ChevronDown,
  Check,
  Sparkles
} from 'lucide-react';
import { DishItem } from '../../types';
import { CATEGORY_TAXONOMY, PrimaryCategoryConfig } from '../../data/categoryTaxonomy';
import { matchDishImageUrl } from '../../utils/dishImageMatcher';

interface CartCategoryTreeCardsProps {
  dishes?: DishItem[];
  onAddToCart?: (dish: DishItem) => void;
  onGoToCategory?: (category: string, subCategory?: string) => void;
  onGoToMenu?: () => void;
}

export const CartCategoryTreeCards: React.FC<CartCategoryTreeCardsProps> = ({
  dishes = [],
  onAddToCart,
  onGoToCategory,
  onGoToMenu
}) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [addedDishId, setAddedDishId] = useState<string | null>(null);

  // List of primary categories (exclude 'all')
  const categoriesList = React.useMemo(() => {
    return Object.values(CATEGORY_TAXONOMY).filter((cat) => cat.id !== 'all');
  }, []);

  const handleAddDishClick = (dish: DishItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(dish);
      setAddedDishId(dish.id);
      setTimeout(() => setAddedDishId(null), 1200);
    }
  };

  return (
    <div className="w-full space-y-2.5 my-3">
      {/* Title Bar with Clean Typography */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-neutral-900 text-amber-400 flex items-center justify-center shadow-2xs">
            <Layers className="w-3.2 h-3.2" />
          </div>
          <h3 className="text-xs sm:text-sm font-black text-neutral-900 tracking-tight">
            餐车品类推荐
          </h3>
          <span className="text-[10px] text-neutral-400 font-medium hidden sm:inline">
            精选现制风味 · 快速点单
          </span>
        </div>

        {onGoToMenu && (
          <button
            type="button"
            onClick={onGoToMenu}
            className="text-[11px] font-bold text-neutral-600 hover:text-black flex items-center gap-0.5 cursor-pointer group transition-colors"
          >
            <span>完整菜单</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Streamlined Category Bento Grid (2 cols on mobile, 4 cols on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {categoriesList.map((cat) => {
          const isExpanded = activeCategoryId === cat.id;
          const categoryDishes = dishes
            .filter((d) => d.category === cat.id || (cat.id === 'popular' && d.isPopular))
            .slice(0, 3);

          const subCount = cat.subCategories?.length || 0;

          return (
            <motion.div
              key={`tree-cat-${cat.id}`}
              onClick={() => {
                if (isExpanded) {
                  onGoToCategory?.(cat.id);
                } else {
                  setActiveCategoryId(cat.id);
                }
              }}
              className={`rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between ${
                isExpanded
                  ? 'bg-white border-neutral-900 shadow-md ring-1 ring-neutral-900/15'
                  : 'bg-white hover:bg-neutral-50/80 border-[#e5e5e2] hover:border-neutral-400 shadow-2xs'
              }`}
            >
              {/* Card Header & Content */}
              <div className="p-3 sm:p-3.5 space-y-2">
                {/* Top Row: Icon + Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-xl bg-neutral-100 border border-neutral-200/80 flex items-center justify-center text-base shrink-0 shadow-2xs">
                    {cat.icon}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {cat.badge && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 whitespace-nowrap">
                        {cat.badge}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-neutral-900' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Category Title & English */}
                <div>
                  <h4 className="text-xs sm:text-[13px] font-black text-neutral-900 leading-tight">
                    {cat.name}
                  </h4>
                  <p className="text-[10px] text-neutral-400 tabular-nums mt-0.5 truncate">
                    {cat.enName}
                  </p>
                </div>

                {/* Clean Description */}
                <p className="text-[11px] text-neutral-600 line-clamp-1 leading-relaxed">
                  {cat.desc}
                </p>

                {/* Subcategory Pills or Highlights */}
                {cat.subCategories && cat.subCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {cat.subCategories.slice(0, isExpanded ? 6 : 3).map((sub) => (
                      <button
                        key={`sub-${cat.id}-${sub.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGoToCategory?.(cat.id, sub.id);
                        }}
                        className="px-1.5 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-black text-[10px] font-medium transition-colors truncate max-w-[120px]"
                      >
                        {sub.name.replace(/全部|经典/g, '') || sub.name}
                      </button>
                    ))}
                    {!isExpanded && cat.subCategories.length > 3 && (
                      <span className="px-1 py-0.5 text-[9.5px] text-neutral-400 tabular-nums">
                        +{cat.subCategories.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="pt-1">
                    <span className="inline-block px-1.5 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-[10px]">
                      {cat.tagline ? cat.tagline.split('·')[0] : '黑曜石招牌现制'}
                    </span>
                  </div>
                )}

                {/* Expanded Dish Previews */}
                <AnimatePresence>
                  {isExpanded && categoryDishes.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="pt-2.5 border-t border-neutral-100 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400">
                        <span>招牌现制菜品</span>
                        <span className="text-neutral-500">点击 + 快速加购</span>
                      </div>
                      <div className="space-y-1">
                        {categoryDishes.map((dish) => (
                          <div
                            key={`tree-dish-${dish.id}`}
                            className="flex items-center justify-between gap-1.5 bg-neutral-50 p-1.5 rounded-xl border border-neutral-200/60 hover:bg-white hover:border-neutral-300 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <img
                                src={matchDishImageUrl({ name: dish.name, imageUrl: dish.imageUrl })}
                                alt={dish.name}
                                className="w-7 h-7 rounded-lg object-cover border border-neutral-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-neutral-900 truncate">
                                  {dish.name}
                                </p>
                                <span className="text-[10px] tabular-nums font-bold text-neutral-800">
                                  ¥{dish.price}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleAddDishClick(dish, e)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs ${
                                addedDishId === dish.id
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-neutral-900 hover:bg-black text-white active:scale-95'
                              }`}
                              title="加入餐车"
                            >
                              {addedDishId === dish.id ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Quick Action Footer */}
              <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-[10.5px]">
                <span className="text-neutral-400 font-medium">
                  {subCount > 0 ? `${subCount} 个分类子项` : '招牌直达'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGoToCategory?.(cat.id);
                  }}
                  className="font-bold text-neutral-900 hover:text-black flex items-center gap-0.5 cursor-pointer group"
                >
                  <span>进入分类</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

