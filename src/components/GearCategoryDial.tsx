import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Cog,
  ChevronUp,
  ChevronDown,
  HelpCircle,
  X,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CategoryType, DishItem } from '../types';
import { CATEGORY_TAXONOMY, SubCategoryConfig } from '../data/categoryTaxonomy';
import { playGearTickSound, playGearEngageSound, toggleAudioMute, isMuted } from '../utils/hapticAudio';

interface GearCategoryDialProps {
  activeCategory: CategoryType;
  activeSubCategory: string;
  onSubCategoryChange: (subCatId: string) => void;
  onCategoryChange?: (cat: CategoryType) => void;
  dishes?: DishItem[];
  subCategoryCounts?: Record<string, number>;
  className?: string;
  isFloating?: boolean;
  theme?: 'white' | 'dark';
}

const ITEM_HEIGHT = 36; // compact px per item

export const GearCategoryDial: React.FC<GearCategoryDialProps> = ({
  activeCategory,
  activeSubCategory,
  onSubCategoryChange,
  dishes = [],
  subCategoryCounts = {},
  className = '',
  isFloating = true,
  theme = 'white'
}) => {
  const [isAudioOff, setIsAudioOff] = useState(() => isMuted());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNoviceGuide, setShowNoviceGuide] = useState(() => {
    try {
      return localStorage.getItem('obsidian_gear_guide_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isDemoing, setIsDemoing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastTickIndexRef = useRef<number>(0);

  // Compute dynamic list of 2nd-level tags for the current active 1st-level category
  const subCategoryList = useMemo<SubCategoryConfig[]>(() => {
    const primaryConfig = CATEGORY_TAXONOMY[activeCategory];
    if (primaryConfig && primaryConfig.subCategories && primaryConfig.subCategories.length > 0) {
      return primaryConfig.subCategories;
    }

    // Default fallback list when category is 'all' or has no subcategories
    if (activeCategory === 'all') {
      return [
        { id: 'all', name: '全部', enName: 'All Menu', icon: '✨', desc: '全品类美食精选' },
        { id: 'skewers-beef-creative', name: '网红牛串', enName: 'Creative Beef', icon: '🥩', badge: '爆款', desc: '香菜泡椒和牛串' },
        { id: 'skewers-meat', name: '经典牛羊', enName: 'Beef & Lamb', icon: '🍖', desc: '经典羊肉串' },
        { id: 'skewers-seafood', name: '海鲜鲜捕', enName: 'Seafood', icon: '🦐', desc: '生蚝与基围虾' },
        { id: 'yakitori-classic', name: '日式烧鸟', enName: 'Yakitori', icon: '🍢', desc: '鸡肉与提灯' },
        { id: 'baked-seafood', name: '芝士焗物', enName: 'Baked Seafood', icon: '🧀', desc: '芝士焗波龙' },
        { id: 'western-steak', name: '和牛牛排', enName: 'Wagyu Steak', icon: '🥩', desc: 'M5+原切牛排' },
        { id: 'drinks-special', name: '冷萃特饮', enName: 'Cold Brews', icon: '🥤', desc: '低温慢萃饮品' },
        { id: 'desserts-sweet', name: '手作甜品', enName: 'Desserts', icon: '🍰', desc: '熔岩蛋糕' }
      ];
    }

    if (activeCategory === 'popular') {
      return [
        { id: 'all', name: '全部热销', enName: 'All Popular', icon: '🔥', desc: '全部口碑爆款' },
        { id: 'skewers-beef-creative', name: '爆款烤串', enName: 'Hit Skewers', icon: '🍢', desc: '高复购炭烤串' },
        { id: 'baked-seafood', name: '招牌焗物', enName: 'Hit Baked', icon: '🧀', desc: '芝士拉丝必点' },
        { id: 'western-steak', name: '和牛大餐', enName: 'Hit Steak', icon: '🥩', desc: '招牌原切牛排' },
        { id: 'drinks-special', name: '人气特饮', enName: 'Hit Drinks', icon: '🥤', desc: '佐餐冰爽解腻' }
      ];
    }

    if (activeCategory === 'mains') {
      return [
        { id: 'all', name: '全部主食', enName: 'All Mains', icon: '🍚', desc: '全部饱腹主食' },
        { id: 'mains-rice', name: '和牛炒饭', enName: 'Wagyu Rice', icon: '🍳', desc: '大火现炒粒粒分明' },
        { id: 'mains-pasta', name: '墨汁意面', enName: 'Squid Ink Pasta', icon: '🍝', desc: '浓汁墨鱼风味' },
        { id: 'mains-tongue', name: '牛舌饭', enName: 'Beef Tongue Bowl', icon: '🥘', desc: '原粒越光大米' }
      ];
    }

    return [{ id: 'all', name: '全部', enName: 'All Items', icon: '✨', desc: '全品类' }];
  }, [activeCategory]);

  // Current active index in the list
  const activeIndex = useMemo(() => {
    const idx = subCategoryList.findIndex((item) => item.id === activeSubCategory);
    return idx >= 0 ? idx : 0;
  }, [subCategoryList, activeSubCategory]);

  // Synchronize scroll offset when activeIndex changes from outside
  useEffect(() => {
    if (!isDragging && !isDemoing) {
      setScrollOffset(-activeIndex * ITEM_HEIGHT);
      lastTickIndexRef.current = activeIndex;
    }
  }, [activeIndex, isDragging, isDemoing]);

  // Handle switching to a specific index with mechanical engagement
  const selectIndex = useCallback(
    (index: number, playEngage = true) => {
      const clampedIndex = Math.max(0, Math.min(index, subCategoryList.length - 1));
      const targetSubCat = subCategoryList[clampedIndex];
      if (targetSubCat) {
        if (playEngage) {
          playGearEngageSound();
        } else {
          playGearTickSound(800);
        }
        onSubCategoryChange(targetSubCat.id);
      }
    },
    [subCategoryList, onSubCategoryChange]
  );

  // Stepper Handlers (▲ / ▼)
  const handleStepUp = () => {
    if (activeIndex > 0) {
      selectIndex(activeIndex - 1, true);
    }
  };

  const handleStepDown = () => {
    if (activeIndex < subCategoryList.length - 1) {
      selectIndex(activeIndex + 1, true);
    }
  };

  // Native Wheel Event Listener with passive: false to strictly prevent window scroll jitter
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let wheelTimeout: NodeJS.Timeout | null = null;
    let accumulatedDelta = 0;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      accumulatedDelta += e.deltaY;
      if (Math.abs(accumulatedDelta) >= 16) {
        const step = accumulatedDelta > 0 ? 1 : -1;
        accumulatedDelta = 0;
        const target = Math.max(0, Math.min(activeIndex + step, subCategoryList.length - 1));
        if (target !== activeIndex) {
          selectIndex(target, true);
        }
      }

      if (wheelTimeout) clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        accumulatedDelta = 0;
      }, 150);
    };

    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheelNative);
      if (wheelTimeout) clearTimeout(wheelTimeout);
    };
  }, [activeIndex, subCategoryList.length, selectIndex]);

  // Touch / Drag Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - dragStartY;
    const newOffset = -activeIndex * ITEM_HEIGHT + diff;

    const maxOffset = 15;
    const minOffset = -(subCategoryList.length - 1) * ITEM_HEIGHT - 15;
    const boundedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));
    setScrollOffset(boundedOffset);

    const rawIndex = Math.round(-boundedOffset / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(rawIndex, subCategoryList.length - 1));

    if (clampedIndex !== lastTickIndexRef.current) {
      lastTickIndexRef.current = clampedIndex;
      playGearTickSound(680 + clampedIndex * 35);
      const activeItem = subCategoryList[clampedIndex];
      if (activeItem) {
        onSubCategoryChange(activeItem.id);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const rawIndex = Math.round(-scrollOffset / ITEM_HEIGHT);
    const targetIndex = Math.max(0, Math.min(rawIndex, subCategoryList.length - 1));
    selectIndex(targetIndex, true);
  };

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientY - dragStartY;
    const newOffset = -activeIndex * ITEM_HEIGHT + diff;
    const boundedOffset = Math.max(
      -(subCategoryList.length - 1) * ITEM_HEIGHT - 15,
      Math.min(15, newOffset)
    );
    setScrollOffset(boundedOffset);

    const rawIndex = Math.round(-boundedOffset / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(rawIndex, subCategoryList.length - 1));
    if (clampedIndex !== lastTickIndexRef.current) {
      lastTickIndexRef.current = clampedIndex;
      playGearTickSound(700 + clampedIndex * 30);
      const activeItem = subCategoryList[clampedIndex];
      if (activeItem) {
        onSubCategoryChange(activeItem.id);
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const rawIndex = Math.round(-scrollOffset / ITEM_HEIGHT);
    const targetIndex = Math.max(0, Math.min(rawIndex, subCategoryList.length - 1));
    selectIndex(targetIndex, true);
  };

  // Novice Guide Dismissal
  const handleDismissGuide = () => {
    setShowNoviceGuide(false);
    try {
      localStorage.setItem('obsidian_gear_guide_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  // Novice Guide Demo Animation
  const handleRunDemo = async () => {
    setIsDemoing(true);
    try {
      for (let i = 0; i < Math.min(3, subCategoryList.length); i++) {
        selectIndex(i, true);
        await new Promise((resolve) => setTimeout(resolve, 360));
      }
      for (let i = Math.min(2, subCategoryList.length - 1); i >= 0; i--) {
        selectIndex(i, true);
        await new Promise((resolve) => setTimeout(resolve, 360));
      }
    } finally {
      setIsDemoing(false);
    }
  };

  const gearTeethCount = 14;

  // Render Mini Collapsed Floating Pill
  if (isCollapsed) {
    return (
      <div className={`select-none ${className}`}>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-1.5 px-2 py-1.5 bg-black/40 text-white rounded-xl border border-amber-500/80 shadow-[0_6px_20px_rgba(0,0,0,0.3)] backdrop-blur-xs hover:bg-black/60 transition-transform active:scale-95 cursor-pointer"
          title="展开齿轮选择器"
        >
          <Cog className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span className="text-[10px] font-black text-amber-300 truncate max-w-[55px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {subCategoryList[activeIndex]?.name || '齿轮'}
          </span>
          <Maximize2 className="w-2.5 h-2.5 text-neutral-300" />
        </button>
      </div>
    );
  }

  return (
    <div
      id="gear-category-roller"
      className={`relative select-none w-full ${className}`}
    >
      {/* Novice Guide Floating Tutorial Overlay */}
      <AnimatePresence>
        {showNoviceGuide && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute -top-2 left-0 w-[230px] sm:w-[250px] z-50 p-2.5 bg-neutral-950/95 text-white rounded-xl border border-rose-500 shadow-[0_12px_28px_rgba(244,63,94,0.4)] backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                </span>
                <h4 className="text-[11px] font-black text-white flex items-center gap-1 truncate">
                  <Cog className="w-3 h-3 text-rose-400 animate-spin shrink-0" />
                  <span>齿轮极速切换 · 新手引导</span>
                </h4>
              </div>
              <button
                type="button"
                onClick={handleDismissGuide}
                className="w-4 h-4 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                title="关闭"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <p className="text-[10px] text-neutral-300 leading-relaxed mt-1.5 font-medium">
              左侧齿轮选择器支持<strong className="text-amber-300 font-bold">即时换挡</strong>。在齿轮上<strong className="text-white font-bold">上下滑动</strong>，即可模拟实体机械按键即刻切换二级分类。
            </p>

            <div className="mt-2 p-1.5 bg-black/60 rounded-lg border border-neutral-800 flex items-center justify-between gap-1">
              <div className="text-[9.5px] text-neutral-300 truncate">
                👆 随滑随切 / 即刻生效
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleRunDemo}
                  disabled={isDemoing}
                  className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[9.5px] font-bold rounded border border-neutral-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDemoing ? '...' : '试一试'}
                </button>
                <button
                  type="button"
                  onClick={handleDismissGuide}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[9.5px] font-black rounded shadow-xs transition-colors cursor-pointer"
                >
                  知道了
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Gear Dial Chassis */}
      <div
        style={{
          backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
          borderColor: theme === 'dark' ? '#010101' : '#e5e7eb',
          color: theme === 'dark' ? '#ffffff' : '#111827',
          borderRadius: '12px',
          fontWeight: 'normal',
        }}
        className={`relative w-full h-[min(504px,calc(100vh-130px))] flex flex-col border transition-all duration-300 ${
          showNoviceGuide
            ? 'ring-2 ring-rose-500/30'
            : theme === 'dark'
            ? 'hover:border-amber-400/50 shadow-[0_4px_16px_rgba(0,0,0,0.2)]'
            : 'hover:border-amber-400/80 shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
        } overflow-hidden`}
      >
        {/* Chassis Top Bar */}
        <div className={`px-1 sm:px-1.5 py-1 shrink-0 ${theme === 'dark' ? 'bg-black/60 border-b border-white/20' : 'bg-neutral-50/90 border-b border-neutral-200'} flex items-center justify-between gap-0.5 sm:gap-1`}>
          <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
            <Cog
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${theme === 'dark' ? 'text-amber-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]' : 'text-amber-500'} shrink-0 transition-transform ${
                isDragging ? 'animate-spin' : ''
              }`}
            />
            <span className={`text-[9px] sm:text-[10px] font-bold ${theme === 'dark' ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]' : 'text-neutral-900'} tracking-tight truncate`}>
              2级分类
            </span>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextMuted = toggleAudioMute();
                setIsAudioOff(nextMuted);
              }}
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded flex items-center justify-center transition-colors cursor-pointer ${
                isAudioOff
                  ? (theme === 'dark' ? 'bg-black/40 text-neutral-400 hover:text-neutral-200' : 'bg-neutral-200/80 text-neutral-400 hover:text-neutral-600')
                  : (theme === 'dark' ? 'bg-black/40 text-amber-400 hover:text-amber-300' : 'bg-amber-100 text-amber-700 hover:bg-amber-200')
              }`}
              title={isAudioOff ? '开启机械按键音效' : '关闭机械按键音效'}
            >
              {isAudioOff ? <VolumeX className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> : <Volume2 className="w-2 h-2 sm:w-2.5 sm:h-2.5" />}
            </button>

            {/* Step Arrows */}
            <div className={`flex items-center ${theme === 'dark' ? 'bg-black/40 rounded border border-white/15' : 'bg-neutral-100 rounded border border-neutral-300'} p-0.2`}>
              <button
                type="button"
                onClick={handleStepUp}
                disabled={activeIndex <= 0}
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 flex items-center justify-center ${theme === 'dark' ? 'text-neutral-300 hover:text-white' : 'text-neutral-700 hover:text-black'} disabled:opacity-20 transition-colors cursor-pointer`}
                title="上一个 (▲)"
              >
                <ChevronUp className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
              </button>
              <button
                type="button"
                onClick={handleStepDown}
                disabled={activeIndex >= subCategoryList.length - 1}
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 flex items-center justify-center ${theme === 'dark' ? 'text-neutral-300 hover:text-white' : 'text-neutral-700 hover:text-black'} disabled:opacity-20 transition-colors cursor-pointer`}
                title="下一个 (▼)"
              >
                <ChevronDown className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
              </button>
            </div>

            {/* Minimize */}
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded ${theme === 'dark' ? 'bg-black/40 hover:bg-black/60 text-neutral-300 hover:text-white' : 'bg-neutral-200/80 hover:bg-neutral-300 text-neutral-600 hover:text-neutral-900'} flex items-center justify-center transition-colors cursor-pointer`}
              title="折叠齿轮机"
            >
              <Minimize2 className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
            </button>
          </div>
        </div>

        {/* Roller Interaction Stage */}
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative flex-1 min-h-0 bg-transparent cursor-grab active:cursor-grabbing overflow-hidden select-none touch-none overscroll-contain flex"
        >
          {/* Center Active Optical Reticle */}
          <div className={`absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[36px] ${theme === 'dark' ? 'bg-amber-500/15 border-y border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.25)]' : 'bg-amber-500/10 border-y border-amber-400/60'} pointer-events-none z-10 flex items-center justify-between px-1.5`}>
            <div className="flex items-center gap-0.5">
              <div className="w-0.8 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_4px_rgba(245,158,11,0.8)]" />
            </div>
            <div className={`text-[8px] tabular-nums font-bold ${theme === 'dark' ? 'text-amber-300 bg-black/50 border-amber-500/40' : 'text-amber-800 bg-white/90 border-amber-300 shadow-2xs'} px-1 py-0.2 rounded border`}>
              {activeIndex + 1}/{subCategoryList.length}
            </div>
          </div>

          {/* Dynamic Scrollable SubCategory Items Cylinder */}
          <div
            style={{ paddingLeft: '4px' }}
            className="flex-1 relative h-full flex items-center pr-1"
          >
            <motion.div
              animate={{
                y: scrollOffset
              }}
              transition={
                isDragging
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 350, damping: 28 }
              }
              className="w-full absolute left-1 right-1 top-1/2 -translate-y-[18px] flex flex-col"
            >
              {subCategoryList.map((item, idx) => {
                const isSelected = activeIndex === idx;
                const offsetFromCenter = idx - activeIndex;
                const distance = Math.abs(offsetFromCenter);

                const scale = Math.max(0.82, 1 - distance * 0.08);
                const opacity = Math.max(0.3, 1 - distance * 0.24);
                const rotateX = offsetFromCenter * 14;

                const count = subCategoryCounts[item.id] || 0;

                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    style={{
                      height: ITEM_HEIGHT,
                      transform: `perspective(360px) rotateX(${rotateX}deg) scale(${scale})`,
                      opacity
                    }}
                    onClick={() => selectIndex(idx, true)}
                    className={`w-full flex items-center justify-between px-1 sm:px-1.5 rounded-lg text-left transition-colors cursor-pointer select-none ${
                      isSelected
                        ? (theme === 'dark' ? 'text-white font-black' : 'bg-amber-100/90 text-neutral-900 font-bold border border-amber-300/80 shadow-2xs')
                        : (theme === 'dark' ? 'text-white/80 hover:text-white font-semibold' : 'text-neutral-700 hover:text-neutral-950 font-medium')
                    }`}
                  >
                    <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                      <span className={`text-[11px] sm:text-xs shrink-0 ${theme === 'dark' ? 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]' : ''}`}>
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <span
                          className={`text-[10px] sm:text-[11px] truncate block ${
                            isSelected
                              ? (theme === 'dark' ? 'text-amber-300 font-black drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]' : 'text-amber-950 font-bold')
                              : (theme === 'dark' ? 'text-white font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]' : 'text-neutral-800 font-medium')
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {count > 0 && (
                        <span
                          className={`text-[8px] sm:text-[8.5px] tabular-nums px-0.8 sm:px-1 py-0.2 rounded-full font-bold shadow-xs ${
                            isSelected
                              ? 'bg-amber-500 text-black'
                              : (theme === 'dark' ? 'bg-black/50 text-white border border-white/20' : 'bg-neutral-100 text-neutral-700 border border-neutral-300')
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
