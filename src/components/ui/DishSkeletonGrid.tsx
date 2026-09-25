import React from 'react';
import { motion } from 'motion/react';
import type { Variants } from 'motion/react';
import { ChefHat, Flame, Clock } from 'lucide-react';
import { ViewMode } from '../../types';

/**
 * 4 维生机微动：左侧锚定向右穿透展开动画变体 (Left-Anchored Organic Rightward Penetration)
 *
 * 核心特征：
 * 1. transformOrigin: 'left center'（严格锁定在左侧边缘）
 * 2. scaleX 穿透: [0.22, 1.045, 0.99, 1.0] (向右爆发刺出，微过冲后平稳吸附)
 * 3. scaleY 体积呼吸: [0.96, 0.95, 1.02, 1.0] (冲刺期上下紧绷收窄 5%，到位回弹释放)
 * 4. rotateZ 甩尾微晃: [0, -1.4, 0.6, 0] (惯性下垂 -> 反翘 -> 水平复位)
 * 5. 纵向瀑布流阶梯错峰: delay = index * 0.045s
 */
export const organicPenetrationVariants: Variants = {
  initial: {
    scaleX: 0.22,
    scaleY: 0.96,
    rotateZ: 0,
    opacity: 0.25,
    transformOrigin: 'left center',
  },
  animate: (index: number) => ({
    scaleX: [0.22, 1.045, 0.99, 1.0],
    scaleY: [0.96, 0.95, 1.02, 1.0],
    rotateZ: [0, -1.4, 0.6, 0],
    opacity: [0.25, 0.92, 1, 1],
    transition: {
      delay: index * 0.045,
      duration: 0.44,
      times: [0, 0.52, 0.78, 1],
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

/**
 * 内部骨架元素视差滞后（Liquid Parallax Lag）
 * 比外壳滞后约 65ms 启动，从 -22px 向右滑移就位，产生外壳先至破风、内容注水流动的视差感
 */
export const interiorParallaxVariants: Variants = {
  initial: {
    x: -24,
    opacity: 0.3,
  },
  animate: (index: number) => ({
    x: 0,
    opacity: 1,
    transition: {
      delay: index * 0.045 + 0.065,
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

interface DishSkeletonGridProps {
  count?: number;
  viewMode?: ViewMode;
  /** 是否开启从左向右微动入场动画（默认 true） */
  animate?: boolean;
}

/**
 * 单张卡片加载态 - 骨架屏版（左锚向右穿透 + 4维微动）
 */
export const DishCardSkeleton: React.FC<{ index?: number; animate?: boolean }> = ({
  index = 0,
  animate = true,
}) => {
  return (
    <motion.div
      custom={index}
      initial={animate ? 'initial' : false}
      animate={animate ? 'animate' : undefined}
      variants={organicPenetrationVariants}
      className="bg-white rounded-xl overflow-hidden shadow-xs border border-[#e2e3e1] flex flex-col relative select-none will-change-transform origin-left"
    >
      {/* 穿透光刃（向右冲刺时前端产生的高亮拖尾光晕） */}
      {animate && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: [0, 0.85, 0], x: [0, 15, 0] }}
          transition={{ delay: index * 0.045 + 0.08, duration: 0.42 }}
          className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-r from-transparent via-amber-400/25 to-amber-500/50 pointer-events-none z-30"
        />
      )}

      {/* 顶部 1:1 / 142px 黑曜石暗调机位图片骨架槽 */}
      <div className="relative h-[130px] sm:h-[142px] w-full bg-[#161616] overflow-hidden">
        {/* Shimmer 光影流动层（从左至右 90deg 顺向流动） */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.09] to-transparent -translate-x-full animate-shimmer" />

        {/* 居中主厨图腾水印 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-25">
          <ChefHat className="w-8 h-8 text-neutral-400" />
        </div>

        {/* 左上角用餐模式胶囊骨架 */}
        <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1">
          <div className="h-4 w-11 bg-white/15 backdrop-blur-xs rounded flex items-center gap-1 px-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <div className="h-1.5 w-5 bg-white/30 rounded" />
          </div>
        </div>

        {/* 右上角特色标胶囊骨架 */}
        <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1">
          <div className="h-4 w-12 bg-amber-500/20 backdrop-blur-xs border border-amber-500/30 rounded flex items-center gap-1 px-1">
            <Flame className="w-2.5 h-2.5 text-amber-400/60" />
            <div className="h-1.5 w-6 bg-amber-400/40 rounded" />
          </div>
        </div>

        {/* 底部出餐与制作时间骨架 */}
        <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10 flex justify-between items-center">
          <div className="h-4 w-14 bg-black/60 backdrop-blur-xs rounded flex items-center gap-1 px-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
            <div className="h-1.5 w-7 bg-white/30 rounded" />
          </div>
          <div className="h-4 w-11 bg-black/60 backdrop-blur-xs rounded flex items-center gap-1 px-1.5">
            <Clock className="w-2 h-2 text-white/40" />
            <div className="h-1.5 w-5 bg-white/30 rounded" />
          </div>
        </div>
      </div>

      {/* 底部信息区骨架（内部视差延迟滑入） */}
      <motion.div
        custom={index}
        initial={animate ? 'initial' : false}
        animate={animate ? 'animate' : undefined}
        variants={interiorParallaxVariants}
        className="p-2 sm:p-2.5 flex flex-col flex-grow justify-between bg-white"
      >
        <div>
          {/* 中文菜品标题骨架 */}
          <div className="flex items-center justify-between gap-2">
            <div className="h-3.5 sm:h-4 bg-neutral-200 rounded w-3/4" />
            <div className="h-3 bg-neutral-100 rounded w-6" />
          </div>

          {/* 英文品名骨架 */}
          <div className="h-2.5 bg-neutral-100 rounded w-1/2 mt-1.5" />

          {/* 优惠标签/阶梯立减计算条骨架 */}
          <div className="mt-2 mb-1 p-1 bg-amber-50/60 border border-amber-100/70 rounded flex items-center justify-between">
            <div className="h-2 w-16 bg-amber-200/70 rounded" />
            <div className="h-2 w-8 bg-amber-200/50 rounded" />
          </div>
        </div>

        {/* 价格与操作加购区骨架 */}
        <div className="flex items-center justify-between pt-1.5 border-t border-[#f0f0ee] gap-1.5 min-w-0 mt-1">
          <div className="flex items-baseline gap-1">
            <div className="h-4 sm:h-5 bg-neutral-800 rounded w-14" />
            <div className="h-2.5 bg-neutral-200 rounded w-8 hidden sm:block" />
          </div>

          {/* 加购按钮骨架 */}
          <div className="h-6 sm:h-6.5 w-14 bg-black rounded-lg flex items-center justify-center gap-1 px-1.5 shadow-2xs">
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="h-2 w-6 bg-white/70 rounded" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/**
 * 列表单行加载态 - 骨架屏版（左锚向右穿透 + 4维微动）
 */
export const DishListRowSkeleton: React.FC<{ index?: number; animate?: boolean }> = ({
  index = 0,
  animate = true,
}) => {
  return (
    <motion.div
      custom={index}
      initial={animate ? 'initial' : false}
      animate={animate ? 'animate' : undefined}
      variants={organicPenetrationVariants}
      className="bg-white rounded-xl overflow-hidden shadow-xs border border-[#e2e3e1] flex flex-row items-stretch relative select-none will-change-transform origin-left"
    >
      {/* 穿透光刃（向右冲刺时前端产生的高亮拖尾光晕） */}
      {animate && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: [0, 0.85, 0], x: [0, 15, 0] }}
          transition={{ delay: index * 0.045 + 0.08, duration: 0.42 }}
          className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-r from-transparent via-amber-400/25 to-amber-500/50 pointer-events-none z-30"
        />
      )}

      {/* 左侧固定缩略图骨架槽（作为最先落桩的稳固基点） */}
      <div className="relative w-24 sm:w-32 min-h-[90px] sm:min-h-[100px] bg-[#161616] overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.09] to-transparent -translate-x-full animate-shimmer" />
        <div className="absolute inset-0 flex items-center justify-center opacity-25">
          <ChefHat className="w-6 h-6 text-neutral-400" />
        </div>
        <div className="absolute top-1 left-1">
          <div className="h-3.5 w-9 bg-white/20 backdrop-blur-xs rounded" />
        </div>
        <div className="absolute bottom-1 left-1">
          <div className="h-3.5 w-10 bg-black/60 backdrop-blur-xs rounded" />
        </div>
      </div>

      {/* 右侧信息骨架（随外壳向右拉伸时产生视差滞后滑入） */}
      <motion.div
        custom={index}
        initial={animate ? 'initial' : false}
        animate={animate ? 'animate' : undefined}
        variants={interiorParallaxVariants}
        className="p-2 sm:p-2.5 flex-1 min-w-0 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="h-3.5 sm:h-4 bg-neutral-200 rounded w-2/3" />
            <div className="h-3 bg-amber-500/20 rounded w-12" />
          </div>
          <div className="h-2.5 bg-neutral-100 rounded w-1/3 mt-1.5" />
          <div className="h-2 bg-neutral-100 rounded w-4/5 mt-1 hidden sm:block" />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#f0f0ee]">
          <div className="flex items-baseline gap-1">
            <div className="h-4 sm:h-5 bg-neutral-800 rounded w-14" />
            <div className="h-2.5 bg-neutral-200 rounded w-8 hidden sm:block" />
          </div>
          <div className="h-6 w-14 bg-black rounded-lg flex items-center justify-center gap-1 shadow-2xs">
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="h-2 w-6 bg-white/70 rounded" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/**
 * 完整骨架屏网格组件 - 支持视图模式与数量自定义
 */
export const DishSkeletonGrid: React.FC<DishSkeletonGridProps> = ({
  count = 6,
  viewMode = 'list',
  animate = true,
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  if (viewMode === 'list') {
    return (
      <div className="space-y-2 pt-0 w-full overflow-hidden">
        {items.map((i) => (
          <DishListRowSkeleton key={i} index={i} animate={animate} />
        ))}
      </div>
    );
  }

  if (viewMode === 'grid2') {
    return (
      <div className="grid grid-cols-2 gap-x-2 sm:gap-x-2.5 gap-y-2 sm:gap-y-2.5 pt-0 w-full overflow-hidden">
        {items.map((i) => (
          <DishCardSkeleton key={i} index={i} animate={animate} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-2 sm:gap-x-2.5 gap-y-2 sm:gap-y-2.5 pt-0 w-full overflow-hidden">
      {items.map((i) => (
        <DishCardSkeleton key={i} index={i} animate={animate} />
      ))}
    </div>
  );
};
