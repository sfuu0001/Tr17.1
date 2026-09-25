import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown, ArrowUp, Layers, Sparkles } from 'lucide-react';
import { CategoryType } from '../types';
import { CATEGORY_TAXONOMY, PrimaryCategoryConfig } from '../data/categoryTaxonomy';

interface LinkedCategoryFloatingBarProps {
  categories: CategoryType[];
  activeCategory: CategoryType;
  onSelectCategory: (category: CategoryType) => void;
  categoryCounts?: Record<string, number>;
  onScrollToTop?: () => void;
  categoryScrollProgress?: number;
}

export const LinkedCategoryFloatingBar: React.FC<LinkedCategoryFloatingBarProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  categoryCounts = {},
  onScrollToTop,
  categoryScrollProgress = 0
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [justChanged, setJustChanged] = useState(false);

  // 监听滚动距离，在进入菜品瀑布流后优雅浮现 (scrollY > 340px)
  useEffect(() => {
    let ticking = false;
    const mainEl = document.getElementById('main-content-scroll-area');

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = (mainEl ? mainEl.scrollTop : 0) || window.scrollY;
          setIsVisible(scrollY > 340);
          ticking = false;
        });
        ticking = true;
      }
    };

    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 当联动分类变化时触发微动效反馈
  useEffect(() => {
    setJustChanged(true);
    const timer = setTimeout(() => setJustChanged(false), 500);
    return () => clearTimeout(timer);
  }, [activeCategory]);

  const currentIndex = categories.indexOf(activeCategory);
  const currentConfig: PrimaryCategoryConfig | undefined = CATEGORY_TAXONOMY[activeCategory];
  const count = categoryCounts[activeCategory] ?? 0;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < categories.length - 1;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPrev) {
      onSelectCategory(categories[currentIndex - 1]);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasNext) {
      onSelectCategory(categories[currentIndex + 1]);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && currentConfig && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="fixed bottom-[58px] sm:bottom-[64px] right-2.5 sm:right-5 z-28 pointer-events-auto select-none"
        >
          <div className="flex items-center gap-1 bg-neutral-950/92 backdrop-blur-md text-white px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-full border border-neutral-700/70 shadow-xl shadow-black/25">
            {/* 当前分类主胶囊按钮 (点击可平滑重置至当前分类起点) */}
            <button
              type="button"
              onClick={() => onSelectCategory(activeCategory)}
              className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full hover:bg-white/10 active:scale-95 transition-all text-left cursor-pointer group"
              title="点击对齐到该分类断点"
            >
              <div
                className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center text-xs transition-transform ${
                  justChanged ? 'scale-125 rotate-6' : 'scale-100'
                } bg-white/15`}
              >
                <span>{currentConfig.icon || '🍽️'}</span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] sm:text-xs font-black tracking-tight text-white whitespace-nowrap">
                    {currentConfig.name}
                  </span>
                  <span className="text-[9px] tabular-nums text-amber-400 bg-amber-400/15 px-1 rounded border border-amber-400/30 leading-none">
                    {currentIndex + 1}/{categories.length}
                  </span>
                </div>
                {count > 0 && (
                  <span className="text-[8.5px] text-neutral-400 tabular-nums leading-none">
                    {count}款精选
                  </span>
                )}
              </div>
            </button>

            {/* 分割细线 */}
            <div className="w-[1px] h-4 bg-neutral-700 mx-0.5" />

            {/* 上一分类快捷跳转 */}
            <button
              type="button"
              disabled={!hasPrev}
              onClick={handlePrev}
              title={hasPrev ? `上一类：${CATEGORY_TAXONOMY[categories[currentIndex - 1]]?.name}` : '已是第一类'}
              className={`p-1 sm:p-1.5 rounded-full transition-all cursor-pointer ${
                hasPrev
                  ? 'text-neutral-200 hover:text-white hover:bg-white/15 active:scale-90'
                  : 'text-neutral-600 cursor-not-allowed opacity-40'
              }`}
            >
              <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* 下一分类快捷跳转 */}
            <button
              type="button"
              disabled={!hasNext}
              onClick={handleNext}
              title={hasNext ? `下一类：${CATEGORY_TAXONOMY[categories[currentIndex + 1]]?.name}` : '已是最后一类'}
              className={`p-1 sm:p-1.5 rounded-full transition-all cursor-pointer ${
                hasNext
                  ? 'text-neutral-200 hover:text-white hover:bg-white/15 active:scale-90'
                  : 'text-neutral-600 cursor-not-allowed opacity-40'
              }`}
            >
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* 回到顶部快速按钮 */}
            {onScrollToTop && (
              <>
                <div className="w-[1px] h-4 bg-neutral-700 mx-0.5" />
                <button
                  type="button"
                  onClick={onScrollToTop}
                  title="回到菜单顶部"
                  className="p-1 sm:p-1.5 rounded-full text-neutral-300 hover:text-amber-400 hover:bg-white/15 active:scale-90 transition-all cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </>
            )}

            {/* 实时滚动百分比填充轨 (反馈当前分类内滚动的具体深度) */}
            <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-white/10 rounded-full overflow-hidden pointer-events-none">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-75"
                style={{ width: `${Math.max(8, Math.min(100, Math.round(categoryScrollProgress * 100)))}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
