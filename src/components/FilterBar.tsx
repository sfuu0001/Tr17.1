import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  Sliders,
  Star,
  CheckSquare,
  SquareCheck,
  CheckCheck,
  Sparkles,
  LayoutGrid,
  Grid2X2,
  List,
  Menu,
  ChevronDown,
  ChevronUp,
  Tag,
  Percent,
  TrendingDown,
  Layers,
  UtensilsCrossed,
  Flame,
  Beef,
  CookingPot,
  Coffee,
  CakeSlice,
  Fish,
  Drumstick,
  Salad,
  Sandwich,
  Utensils,
  Cookie,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CategoryType, ViewMode, DishItem, DiningMode } from '../types';
import { CATEGORY_TAXONOMY } from '../data/categoryTaxonomy';
import { SearchDropdown } from './SearchDropdown';

// Category Dynamic Animated Icon Component
interface DynamicIconProps {
  categoryId: string;
  isActive?: boolean;
  className?: string;
}

const DynamicCategoryIcon: React.FC<DynamicIconProps> = ({ categoryId, isActive = false, className = 'w-3.5 h-3.5' }) => {
  const iconColor = isActive ? 'text-neutral-900' : 'text-neutral-500';

  const getIconElement = () => {
    switch (categoryId) {
      case 'all':
        return (
          <motion.div
            className="flex items-center justify-center"
            animate={isActive ? { rotate: [0, 20, -15, 0], scale: [1, 1.15, 0.95, 1] } : { rotate: [0, 8, 0], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: isActive ? 2.5 : 4, ease: 'easeInOut' }}
          >
            <Sparkles className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'popular':
        return (
          <motion.div
            className="flex items-center justify-center"
            animate={{
              scale: [1, 1.2, 0.98, 1.15, 1],
              y: [0, -2, 0.5, -1, 0],
              rotate: [0, -4, 4, -2, 0]
            }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          >
            <Flame className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'skewers':
        return (
          <motion.div
            className="flex items-center justify-center"
            animate={isActive ? { rotate: [0, -14, 14, -8, 0], scale: [1, 1.12, 1] } : { rotate: [0, -6, 6, 0] }}
            transition={{ repeat: Infinity, duration: isActive ? 2 : 3.5, ease: 'easeInOut' }}
          >
            <UtensilsCrossed className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'yakitori':
        return (
          <motion.div
            className="flex items-center justify-center"
            animate={isActive ? { rotate: [0, -12, 12, 0], scale: [1, 1.16, 1] } : { rotate: [0, -4, 4, 0] }}
            transition={{ repeat: Infinity, duration: 2.1, ease: 'easeInOut' }}
          >
            <Flame className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'baked':
        return (
          <motion.div
            className="flex items-center justify-center"
            animate={isActive ? { scale: [1, 1.18, 0.96, 1], y: [0, -1.5, 0] } : { scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          >
            <UtensilsCrossed className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'western':
        return (
          <motion.div
            className="flex items-center justify-center"
            animate={isActive ? { scale: [1, 1.16, 1], y: [0, -1.2, 0] } : { scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          >
            <Beef className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'mains':
        return (
          <motion.div
            className="flex items-center justify-center"
            animate={isActive ? { y: [0, -2, 0, -1, 0], rotate: [0, -4, 4, 0] } : { y: [0, -1, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          >
            <CookingPot className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'drinks':
        return (
          <motion.div
            className="flex items-center justify-center"
            animate={isActive ? { rotate: [0, 8, -8, 4, 0], y: [0, -1.5, 0] } : { rotate: [0, 4, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
          >
            <Coffee className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'desserts':
        return (
          <motion.div
            className="flex items-center justify-center"
            animate={isActive ? { scale: [1, 1.18, 0.94, 1.1, 1], y: [0, -2, 0] } : { y: [0, -1, 0] }}
            transition={{ repeat: Infinity, duration: 2.0, ease: 'easeInOut' }}
          >
            <CakeSlice className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'snacks':
        return (
          <motion.div
            className="flex items-center justify-center"
            animate={isActive ? { rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] } : { rotate: [0, 6, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
          >
            <Cookie className={`${className} ${iconColor}`} />
          </motion.div>
        );
      default:
        return (
          <motion.div
            className="flex items-center justify-center"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <Utensils className={`${className} ${iconColor}`} />
          </motion.div>
        );
    }
  };

  return <div className="inline-flex items-center justify-center shrink-0">{getIconElement()}</div>;
};

// Sub-Category Dynamic Icon Component
const DynamicSubCategoryIcon: React.FC<{ subCatId: string; isSubActive?: boolean; className?: string }> = ({
  subCatId,
  isSubActive = false,
  className = 'w-3 h-3'
}) => {
  const iconColor = isSubActive ? 'text-neutral-900' : 'text-neutral-500';

  const getSubIcon = () => {
    switch (subCatId) {
      case 'all':
        return (
          <motion.div animate={isSubActive ? { rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] } : {}}>
            <Sparkles className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'skewers-beef-creative':
        return (
          <motion.div animate={isSubActive ? { scale: [1, 1.2, 1] } : {}} transition={{ repeat: Infinity, duration: 1.8 }}>
            <Beef className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'skewers-meat':
        return (
          <motion.div animate={isSubActive ? { y: [0, -1.5, 0], scale: [1, 1.15, 1] } : {}} transition={{ repeat: Infinity, duration: 1.5 }}>
            <Flame className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'skewers-pork-poultry':
        return (
          <motion.div animate={isSubActive ? { rotate: [0, 8, -8, 0] } : {}} transition={{ repeat: Infinity, duration: 2 }}>
            <Drumstick className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'skewers-seafood':
        return (
          <motion.div animate={isSubActive ? { x: [0, 1.5, -1.5, 0], rotate: [0, 6, -6, 0] } : {}} transition={{ repeat: Infinity, duration: 1.8 }}>
            <Fish className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'skewers-balls-tofu':
        return (
          <motion.div animate={isSubActive ? { scale: [1, 1.15, 1] } : {}}>
            <Layers className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'skewers-veggie':
        return (
          <motion.div animate={isSubActive ? { rotate: [0, 10, -10, 0] } : {}} transition={{ repeat: Infinity, duration: 2.2 }}>
            <Salad className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'skewers-special':
        return (
          <motion.div animate={isSubActive ? { y: [0, -1.5, 0] } : {}} transition={{ repeat: Infinity, duration: 1.6 }}>
            <CookingPot className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'yakitori-classic':
        return (
          <motion.div animate={isSubActive ? { rotate: [0, 8, -8, 0] } : {}} transition={{ repeat: Infinity, duration: 2 }}>
            <Drumstick className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'yakitori-special':
        return (
          <motion.div animate={isSubActive ? { scale: [1, 1.2, 1] } : {}} transition={{ repeat: Infinity, duration: 1.8 }}>
            <Flame className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'yakitori-giblets':
        return (
          <motion.div animate={isSubActive ? { scale: [1, 1.15, 1] } : {}}>
            <UtensilsCrossed className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'yakitori-wings-veggie':
        return (
          <motion.div animate={isSubActive ? { rotate: [0, 10, -10, 0] } : {}} transition={{ repeat: Infinity, duration: 2.2 }}>
            <Salad className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'baked-seafood':
        return (
          <motion.div animate={isSubActive ? { x: [0, 1.5, -1.5, 0] } : {}} transition={{ repeat: Infinity, duration: 1.8 }}>
            <Fish className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'baked-staple':
        return (
          <motion.div animate={isSubActive ? { y: [0, -1.5, 0] } : {}} transition={{ repeat: Infinity, duration: 1.6 }}>
            <CookingPot className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'baked-appetizer':
        return (
          <motion.div animate={isSubActive ? { scale: [1, 1.15, 1] } : {}}>
            <Cookie className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'western-steak':
        return (
          <motion.div animate={isSubActive ? { scale: [1, 1.15, 1] } : {}}>
            <Beef className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'western-burger-pasta':
        return (
          <motion.div animate={isSubActive ? { y: [0, -1.2, 0] } : {}}>
            <Sandwich className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'western-starters':
        return (
          <motion.div animate={isSubActive ? { rotate: [0, 8, -8, 0] } : {}}>
            <Utensils className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'western-dessert':
        return (
          <motion.div animate={isSubActive ? { scale: [1, 1.15, 1], y: [0, -1, 0] } : {}}>
            <CakeSlice className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'drinks-special':
        return (
          <motion.div animate={isSubActive ? { rotate: [0, 8, -8, 0] } : {}}>
            <Coffee className={`${className} ${iconColor}`} />
          </motion.div>
        );
      case 'desserts-sweet':
        return (
          <motion.div animate={isSubActive ? { scale: [1, 1.15, 1] } : {}}>
            <CakeSlice className={`${className} ${iconColor}`} />
          </motion.div>
        );
      default:
        return <Utensils className={`${className} ${iconColor}`} />;
    }
  };

  return <div className="inline-flex items-center justify-center shrink-0">{getSubIcon()}</div>;
};

interface FilterBarProps {
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  activeCategory?: CategoryType;
  onCategoryChange?: (cat: CategoryType) => void;
  activeSubCategory?: string;
  onSubCategoryChange?: (subCat: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryCounts?: Record<string, number>;
  onOpenFilterModal: () => void;
  activeFilterCount: number;
  isMultiSelectMode: boolean;
  onToggleMultiSelectMode: () => void;
  isAllSelected?: boolean;
  onToggleSelectAll?: () => void;
  selectedCount?: number;
  allDishes: DishItem[];
  searchResults: DishItem[];
  onSelectDish: (dish: DishItem) => void;
  onQuickAdd: (dish: DishItem, e: React.MouseEvent) => void;
  diningMode?: DiningMode;
  onlyDiscountFilter?: boolean;
  onToggleDiscountFilter?: () => void;
  hideHorizontalCategories?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  viewMode = 'grid',
  onViewModeChange,
  activeCategory = 'all',
  onCategoryChange,
  activeSubCategory = 'all',
  onSubCategoryChange,
  searchQuery,
  onSearchChange,
  categoryCounts,
  onOpenFilterModal,
  activeFilterCount,
  isMultiSelectMode,
  onToggleMultiSelectMode,
  isAllSelected = false,
  onToggleSelectAll,
  selectedCount = 0,
  allDishes,
  searchResults,
  onSelectDish,
  onQuickAdd,
  diningMode = 'delivery',
  onlyDiscountFilter = false,
  onToggleDiscountFilter,
  hideHorizontalCategories = false
}) => {
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isPromoBarExpanded, setIsPromoBarExpanded] = useState(false);
  const [isSubCatDropdownOpen, setIsSubCatDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const subCatDropdownRef = useRef<HTMLDivElement>(null);

  // Current primary category config
  const currentCategoryConfig = CATEGORY_TAXONOMY[activeCategory] || CATEGORY_TAXONOMY.popular || CATEGORY_TAXONOMY.skewers;
  const hasSubCategories = currentCategoryConfig.subCategories && currentCategoryConfig.subCategories.length > 0;

  // Sub-category dish counts calculation
  const subCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    if (!hasSubCategories) return counts;

    const availableInCat = allDishes.filter((d) => d.available && d.category === activeCategory);
    counts.all = availableInCat.length;

    availableInCat.forEach((dish) => {
      if (dish.subCategory) {
        counts[dish.subCategory] = (counts[dish.subCategory] || 0) + 1;
      }
    });

    return counts;
  }, [allDishes, activeCategory, hasSubCategories]);

  // Active sub-category object
  const activeSubCatObj = useMemo(() => {
    if (!hasSubCategories || !currentCategoryConfig.subCategories) return null;
    return currentCategoryConfig.subCategories.find((s) => s.id === activeSubCategory) || currentCategoryConfig.subCategories[0];
  }, [currentCategoryConfig, activeSubCategory, hasSubCategories]);

  // 1. 智能折扣与促销自动判定系统
  const promoSummary = useMemo(() => {
    let maxSave = 0;
    let minRate = 10;
    let maxDrop = 0;
    let discountItemCount = 0;
    const keyHighlights: string[] = [];

    allDishes.forEach((d) => {
      const hasOriginal = d.originalPrice && d.originalPrice > d.price;
      const hasDrop = d.prevPrice && d.prevPrice > d.price;
      const hasTag = Boolean(d.discountTag || d.deliveryDiscount || d.dineInDiscount);

      if (hasOriginal || hasDrop || hasTag) {
        discountItemCount++;
      }

      if (hasOriginal) {
        const diff = d.originalPrice! - d.price;
        if (diff > maxSave) maxSave = diff;
        const rate = (d.price / d.originalPrice!) * 10;
        if (rate < minRate) minRate = rate;
      }

      if (hasDrop) {
        const drop = d.prevPrice! - d.price;
        if (drop > maxDrop) maxDrop = drop;
      }
    });

    if (minRate < 9.5) {
      keyHighlights.push(`限时${minRate.toFixed(1)}折起`);
    }
    if (maxDrop > 0) {
      keyHighlights.push(`最高立降¥${maxDrop.toFixed(0)}`);
    }
    if (maxSave > 0) {
      keyHighlights.push(`单品省¥${maxSave.toFixed(0)}`);
    }
    if (diningMode === 'delivery') {
      keyHighlights.push('满¥35减¥5');
    }

    return {
      discountItemCount,
      keyHighlights,
      hasPromos: keyHighlights.length > 0
    };
  }, [allDishes, diningMode]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchDropdownOpen(false);
      }
      if (
        subCatDropdownRef.current &&
        !subCatDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSubCatDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-scroll the active category button into center of the horizontal scroll bar
  useEffect(() => {
    if (!categoryScrollRef.current) return;
    const activeBtn = categoryScrollRef.current.querySelector<HTMLElement>(`[data-category-id="${activeCategory}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [activeCategory]);

  const categoriesList = Object.values(CATEGORY_TAXONOMY).filter((cat) => cat.id !== 'all');

  return (
    <div
      className={`w-full flex flex-col gap-1 relative py-0 transition-all ${
        isSearchDropdownOpen || isSubCatDropdownOpen ? 'z-50' : 'z-20'
      }`}
      ref={searchContainerRef}
    >
      {/* Unified Omnichannel Category & Subcategory Navigator (一级与二级分类一体化融合组件，如有垂直侧边栏可收起以留出更多点餐空间) */}
      {!hideHorizontalCategories && (
        <div className="w-full bg-white rounded-2xl border border-[#e8e8e6] p-1 sm:p-1.5 shadow-2xs transition-all relative z-20" ref={subCatDropdownRef}>
          {/* 1. Level 1 Primary Category Bar (全宽横向平滑滚动条) */}
          <div className="w-full overflow-hidden relative">
            <div
              ref={categoryScrollRef}
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth w-full py-0.5 px-0.5"
            >
              {categoriesList.map((cat) => {
                const isActive = activeCategory === cat.id && !onlyDiscountFilter;
                const count = categoryCounts ? categoryCounts[cat.id] : undefined;
                const catHasSub = !!(cat.subCategories && cat.subCategories.length > 0);

                return (
                  <motion.button
                    key={cat.id}
                    data-category-id={cat.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      if (onCategoryChange) onCategoryChange(cat.id as CategoryType);
                      if (isActive && catHasSub) {
                        setIsSubCatDropdownOpen((prev) => !prev);
                      } else {
                        if (onSubCategoryChange) onSubCategoryChange('all');
                        setIsSubCatDropdownOpen(false);
                      }
                    }}
                    className={`py-1 sm:py-1.5 rounded-xl text-[11.5px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer select-none px-2.5 sm:px-3 shadow-2xs ${
                      isActive
                        ? 'bg-[#18181b] text-white border border-black shadow-xs font-black'
                        : 'bg-[#fafaf9] text-[#4d4c46] border border-[#e8e8e6] hover:bg-neutral-100 hover:text-black'
                    }`}
                  >
                    <DynamicCategoryIcon
                      categoryId={cat.id}
                      isActive={isActive}
                      className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#6e6d66]'}`}
                    />
                    <span>{cat.name}</span>
                    {isActive && catHasSub && activeSubCategory !== 'all' && activeSubCatObj && (
                      <span className="text-[9.5px] border border-white/30 text-white tabular-nums px-1 py-0.2 rounded bg-white/15">
                        {activeSubCatObj.name}
                      </span>
                    )}
                    {count !== undefined && count > 0 && (
                      <span
                        className={`text-[9.5px] sm:text-[10px] px-1.5 py-0.2 rounded-full tabular-nums font-bold leading-tight transition-colors border ${
                          isActive
                            ? 'border-white/30 text-white/90 bg-white/10'
                            : 'border-[#e4e4e0] text-[#7a7972] bg-white/60'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                    {isActive && catHasSub && (
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-200 ${
                          isSubCatDropdownOpen ? 'rotate-180 text-white' : 'text-white/80'
                        }`}
                      />
                    )}
                  </motion.button>
                );
              })}

              {/* Integrated Promo Pill inside Category Scroll Line */}
              {promoSummary.hasPromos && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setIsPromoBarExpanded((prev) => !prev)}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11.5px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer select-none shadow-2xs ${
                    isPromoBarExpanded
                      ? 'bg-amber-600 text-white border border-amber-700 font-black shadow-xs'
                      : 'bg-amber-50/90 text-amber-900 border border-amber-300/90 hover:bg-amber-100'
                  }`}
                  title="查看智能优惠速览与折扣收纳"
                >
                  <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isPromoBarExpanded ? 'text-white' : 'text-amber-600'}`} />
                  <span>特惠</span>
                  <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full tabular-nums font-bold border ${
                    isPromoBarExpanded ? 'border-white/30 text-white bg-white/15' : 'border-amber-300 text-amber-900 bg-white/80'
                  }`}>
                    {promoSummary.discountItemCount}
                  </span>
                  {isPromoBarExpanded ? (
                    <ChevronUp className="w-3 h-3 text-white shrink-0" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-amber-800 shrink-0" />
                  )}
                </motion.button>
              )}
            </div>
          </div>

          {/* 2. Integrated Level 2 Sub-category Seamless Stream (内嵌无缝二级细分流) */}
          <AnimatePresence>
            {hasSubCategories && (
              <motion.div
                key={`subcat-seamless-${activeCategory}`}
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden border-t border-[#f0f0ed] pt-1.5"
              >
                <div className="flex items-center justify-between gap-1.5">
                  {/* Horizontal Quick-filter Subcategory Stream */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth py-0.5 flex-1 min-w-0">
                    {/* Category Indicator Badge */}
                    <span className="text-[10px] font-bold text-neutral-600 border border-neutral-200 px-2 py-0.5 rounded-lg shrink-0 flex items-center gap-1 whitespace-nowrap bg-transparent">
                      <DynamicCategoryIcon categoryId={activeCategory} isActive={false} className="w-2.5 h-2.5" />
                      <span>{currentCategoryConfig.name}专区</span>
                    </span>

                    {/* Micro Sub-category Pills */}
                    {currentCategoryConfig.subCategories.map((subCat) => {
                      const isSubActive = activeSubCategory === subCat.id;
                      const count = subCategoryCounts[subCat.id] || 0;

                      return (
                        <motion.button
                          key={subCat.id}
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (onSubCategoryChange) onSubCategoryChange(subCat.id);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer select-none bg-transparent ${
                            isSubActive
                              ? 'border-2 border-neutral-900 text-neutral-900 font-black'
                              : 'border border-[#e2e3e1] text-[#55544d] hover:border-neutral-400 hover:text-neutral-900'
                          }`}
                          title={subCat.desc}
                        >
                          <DynamicSubCategoryIcon subCatId={subCat.id} isSubActive={isSubActive} />
                          <span>{subCat.name}</span>
                          {count > 0 && (
                            <span
                              className={`text-[8.5px] px-1 rounded-full tabular-nums leading-tight bg-transparent border ${
                                isSubActive
                                  ? 'border-neutral-900 text-neutral-900 font-bold'
                                  : 'border-neutral-200 text-[#787770]'
                              }`}
                            >
                              {count}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Quick Toggle / Full Overview Button */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setIsSubCatDropdownOpen((prev) => !prev)}
                    className={`shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer select-none bg-transparent ${
                      isSubCatDropdownOpen
                        ? 'border-2 border-neutral-900 text-neutral-900 font-black'
                        : 'border border-[#e2e3e1] text-[#55544d] hover:border-neutral-400 hover:text-neutral-900'
                    }`}
                    title="展开细分品类全景菜单"
                  >
                    <span>{isSubCatDropdownOpen ? '收起' : '全览'}</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        isSubCatDropdownOpen ? 'rotate-180 text-neutral-900' : 'text-neutral-500'
                      }`}
                    />
                  </motion.button>
                </div>

                {/* Dropdown Floating Full Overview Menu */}
                <AnimatePresence>
                  {isSubCatDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                      className="mt-2 pt-2 border-t border-[#f0f0ed]"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#f4f4f0] px-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-neutral-900">
                            {currentCategoryConfig.name} 细分品类全览
                          </span>
                          {currentCategoryConfig.badge && (
                            <span className="text-[8.5px] text-amber-900 font-bold px-1 py-0.2 rounded border border-amber-300 bg-transparent">
                              {currentCategoryConfig.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] tabular-nums text-neutral-500">
                          {currentCategoryConfig.tagline}
                        </span>
                      </div>

                      {/* Sub-category Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[220px] overflow-y-auto no-scrollbar p-0.5">
                        {currentCategoryConfig.subCategories.map((subCat) => {
                          const isSubActive = activeSubCategory === subCat.id;
                          const count = subCategoryCounts[subCat.id] || 0;

                          return (
                            <motion.button
                              key={subCat.id}
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => {
                                if (onSubCategoryChange) onSubCategoryChange(subCat.id);
                                setIsSubCatDropdownOpen(false);
                              }}
                              className={`flex items-start justify-between p-2 rounded-xl border text-left transition-all cursor-pointer select-none bg-transparent ${
                                isSubActive
                                  ? 'border-2 border-neutral-900'
                                  : 'border-neutral-200 hover:border-neutral-400'
                              }`}
                            >
                              <div className="flex items-start gap-1.5 min-w-0">
                                <div className="mt-0.5 shrink-0">
                                  <DynamicSubCategoryIcon subCatId={subCat.id} isSubActive={isSubActive} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className={`text-[11px] sm:text-xs font-bold truncate ${isSubActive ? 'text-neutral-900 font-black' : 'text-neutral-700'}`}>
                                      {subCat.name}
                                    </span>
                                  </div>
                                  {subCat.desc && (
                                    <p className="text-[9px] sm:text-[9.5px] truncate mt-0.5 leading-tight text-neutral-500">
                                      {subCat.desc}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-end shrink-0 ml-1.5">
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded-full tabular-nums font-bold leading-tight bg-transparent border ${
                                    isSubActive
                                      ? 'border-neutral-900 text-neutral-900'
                                      : 'border-neutral-200 text-[#787770]'
                                  }`}
                                >
                                  {count}
                                </span>
                                {isSubActive && (
                                  <Check className="w-3 h-3 text-neutral-900 stroke-[3] mt-1" />
                                )}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 3. Intelligent Auto-Folded Promotion Drawer */}
      <AnimatePresence>
        {isPromoBarExpanded && promoSummary.hasPromos && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#fffbf0] via-[#fff9eb] to-[#fff5e0] border border-[#f0dfb8] rounded-lg p-1.5 sm:p-2 text-xs text-[#6e4808] flex flex-wrap items-center justify-between gap-1 shadow-2xs">
              <div className="flex items-center gap-1 flex-wrap">
                <div className="inline-flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 shadow-2xs">
                  <Tag className="w-2.5 h-2.5" />
                  <span>智能折扣</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap text-[10px]">
                  {promoSummary.keyHighlights.map((hl, i) => (
                    <span
                      key={i}
                      className="bg-white/80 border border-amber-200/80 px-1.5 py-0.5 rounded font-medium text-amber-950"
                    >
                      {hl}
                    </span>
                  ))}
                </div>
              </div>

              {onToggleDiscountFilter && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={onToggleDiscountFilter}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors cursor-pointer shrink-0 border ${
                    onlyDiscountFilter
                      ? 'bg-amber-900 text-white border-amber-950'
                      : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {onlyDiscountFilter ? '✓ 正在显示特惠' : '仅看特惠菜品'}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Search & Action Bar (精细化现代极简风格: 视图切换 + 高级微推杆搜索栏) */}
      <section className="flex items-center gap-2 relative w-full">
        {/* View Mode Segmented Box: [ ⊞ | ☰ ] */}
        {onViewModeChange && (
          <div className="flex items-center bg-neutral-100/90 p-0.5 rounded-lg border border-neutral-200/80 h-9 shrink-0 select-none shadow-inner">
            {/* Grid View (⊞) */}
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'list') {
                  onViewModeChange('grid2');
                } else if (viewMode === 'grid2') {
                  onViewModeChange('grid');
                } else {
                  onViewModeChange('grid2');
                }
              }}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-all cursor-pointer select-none ${
                viewMode !== 'list'
                  ? 'bg-white text-[#1a1c1b] shadow-xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title={viewMode === 'grid' ? '当前：大图卡片 (点击切换双列网格)' : '网格视图'}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            {/* List View (☰) */}
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-all cursor-pointer select-none ${
                viewMode === 'list'
                  ? 'bg-white text-[#1a1c1b] shadow-xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="单列列表视图"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search Bar matching modern obsidian styling */}
        <div className="relative flex-1 flex items-center h-9 rounded-lg bg-neutral-100/80 border border-neutral-200/80 px-2.5 min-w-0 transition-all focus-within:bg-white focus-within:border-neutral-400 focus-within:shadow-xs">
          <Search className="w-4 h-4 text-neutral-400 shrink-0 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchDropdownOpen(true)}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setIsSearchDropdownOpen(true);
            }}
            placeholder="搜索菜品、食材、炭烤、和牛..."
            className="w-full pl-2 pr-2 bg-transparent text-[13px] outline-none transition-all placeholder:text-neutral-400 text-neutral-800 font-normal"
          />

          {/* Right Action Cluster inside Search Bar: Star | Sliders */}
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="text-neutral-400 hover:text-black p-0.5 rounded-full transition-colors cursor-pointer"
                title="清空搜索"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Star Icon Button (热门推荐与风向榜) */}
            <button
              type="button"
              onClick={() => setIsSearchDropdownOpen(!isSearchDropdownOpen)}
              className="transition-transform cursor-pointer flex items-center justify-center p-0.5 hover:scale-110"
              title="查看热门榜单与精选"
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </button>

            {/* Vertical Divider */}
            <div className="w-[1px] h-3.5 bg-neutral-300" />

            {/* Filter Sliders Button (垂直调节推杆图标) */}
            <button
              type="button"
              onClick={onOpenFilterModal}
              className="text-neutral-600 hover:text-black transition-colors cursor-pointer flex items-center justify-center relative p-0.5"
              title="高级筛选器"
            >
              <Sliders className="w-4 h-4 text-neutral-600" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 border border-white" />
              )}
            </button>
          </div>
        </div>

        {/* Search & Trend Rankings Dropdown */}
        <SearchDropdown
          isOpen={isSearchDropdownOpen}
          onClose={() => setIsSearchDropdownOpen(false)}
          searchQuery={searchQuery}
          onSelectSearchQuery={(query) => {
            onSearchChange(query);
            setIsSearchDropdownOpen(false);
          }}
          allDishes={allDishes}
          searchResults={searchResults}
          onSelectDish={onSelectDish}
          onQuickAdd={onQuickAdd}
        />
      </section>
    </div>
  );
};
