import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CategoryType, DishItem } from '../types';
import { CATEGORY_TAXONOMY, PrimaryCategoryConfig } from '../data/categoryTaxonomy';

const DEFAULT_CATEGORY_KEYS: CategoryType[] = [
  'popular',
  'skewers',
  'yakitori',
  'baked',
  'western',
  'mains',
  'drinks',
  'desserts',
  'snacks'
];

export interface CategorySectionData {
  catKey: CategoryType;
  category: PrimaryCategoryConfig;
  dishes: DishItem[];
}

interface CategoryStickyHeaderBarProps {
  activeCategory: CategoryType;
  categorySections: CategorySectionData[];
  categories?: CategoryType[];
  onToggleSoundFeedback?: () => void;
  soundFeedbackEnabled?: boolean;
}

export const CategoryStickyHeaderBar: React.FC<CategoryStickyHeaderBarProps> = ({
  activeCategory,
  categorySections,
  categories = DEFAULT_CATEGORY_KEYS
}) => {
  const prevCategoryRef = useRef<CategoryType>(activeCategory);
  const directionRef = useRef<number>(1);

  // 计算切换方向：向下浏览为 1 (向上滚入)，向上浏览为 -1 (向下滚入)
  useEffect(() => {
    if (prevCategoryRef.current !== activeCategory) {
      const prevIdx = categories.indexOf(prevCategoryRef.current);
      const currIdx = categories.indexOf(activeCategory);
      directionRef.current = currIdx >= prevIdx ? 1 : -1;
      prevCategoryRef.current = activeCategory;
    }
  }, [activeCategory, categories]);

  const currentSection = categorySections.find((s) => s.catKey === activeCategory);
  const currentCategory = currentSection?.category || CATEGORY_TAXONOMY[activeCategory];
  const itemCount = currentSection?.dishes.length ?? 0;

  const displayName = currentCategory?.name || '热销爆款';
  const displayEnName = currentCategory?.enName || activeCategory.toUpperCase();

  // 齿轮遮罩滚轮动效：上下齿轮遮罩切换 + 显著渐显渐隐 + 机械咬合微虚化弹性
  const gearVariants = {
    initial: (dir: number) => ({
      y: dir > 0 ? '110%' : '-110%',
      opacity: 0,
      scale: 0.94,
      filter: 'blur(3px)'
    }),
    animate: {
      y: '0%',
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        y: { type: 'spring', stiffness: 340, damping: 26, mass: 0.75 },
        opacity: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
        scale: { duration: 0.24 },
        filter: { duration: 0.2 }
      }
    },
    exit: (dir: number) => ({
      y: dir > 0 ? '-110%' : '110%',
      opacity: 0,
      scale: 0.94,
      filter: 'blur(3px)',
      transition: {
        y: { type: 'spring', stiffness: 340, damping: 26, mass: 0.75 },
        opacity: { duration: 0.2, ease: 'easeInOut' },
        scale: { duration: 0.18 },
        filter: { duration: 0.16 }
      }
    })
  };

  return (
    <div
      id="category-sticky-header-bar"
      className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs px-3 py-1.5 border-b border-[#E2E4E8] flex items-center justify-between select-none shadow-2xs w-full"
    >
      {/* 左侧：方形黑色指示块 + 齿轮渐变遮罩滚动品类标题 */}
      <div className="flex items-center space-x-2 min-w-0">
        {/* 方形黑色高质感指示块，伴随机械咬合瞬态微动 */}
        <motion.span
          key={`square-block-${activeCategory}`}
          initial={{ scale: 0.65, rotate: directionRef.current > 0 ? 45 : -45, opacity: 0.4 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 450, damping: 22 }}
          className="w-2 h-2 rounded-[2px] bg-black shrink-0 shadow-2xs"
          aria-hidden="true"
        />

        {/* 齿轮遮罩窗口 (上下齿轮渐隐渐显渐变遮罩) */}
        <div
          className="relative overflow-hidden h-5 flex items-center min-w-0 [mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_82%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_82%,transparent_100%)]"
        >
          <AnimatePresence custom={directionRef.current} mode="popLayout" initial={false}>
            <motion.div
              key={`category-text-${activeCategory}`}
              custom={directionRef.current}
              variants={gearVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex items-center space-x-1.5 whitespace-nowrap will-change-transform py-0.5"
            >
              <span className="font-bold text-xs sm:text-[13px] tracking-tight text-black">
                {displayName}
              </span>
              <span className="font-sans text-[9px] sm:text-[9.5px] text-gray-400">
                /{displayEnName}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 右侧：菜品数量，配合齿轮遮罩渐显渐隐上下滚动 */}
      <div className="relative overflow-hidden h-4 flex items-center justify-end shrink-0 pl-2 [mask-image:linear-gradient(to_bottom,transparent_0%,black_20%,black_80%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_20%,black_80%,transparent_100%)]">
        <AnimatePresence custom={directionRef.current} mode="popLayout" initial={false}>
          <motion.span
            key={`category-count-${activeCategory}-${itemCount}`}
            custom={directionRef.current}
            variants={gearVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-[10px] font-sans font-medium text-gray-500 block whitespace-nowrap"
          >
            {itemCount} ITEMS
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};
