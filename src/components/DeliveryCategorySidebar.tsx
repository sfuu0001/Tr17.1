import React, { useEffect, useRef, useState } from 'react';
import {
  Flame,
  UtensilsCrossed,
  Beef,
  CookingPot,
  Coffee,
  CakeSlice,
  Cookie,
  Sparkles,
  Layers,
  Drumstick,
  XCircle,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CategoryType } from '../types';
import { CATEGORY_TAXONOMY, PrimaryCategoryConfig } from '../data/categoryTaxonomy';
import { playCategoryLinkSound, playCategorySnapSound } from '../utils/hapticAudio';
import { safeVibrate } from '../utils/haptics';

interface DeliveryCategorySidebarProps {
  categories: CategoryType[];
  activeCategory: CategoryType;
  onSelectCategory: (category: CategoryType) => void;
  categoryCounts?: Record<string, number>;
  categoryCartCounts?: Record<string, number>;
  categoryScrollProgress?: number;
  isScrolling?: boolean;
  soundFeedbackEnabled?: boolean;
  onToggleSoundFeedback?: () => void;
}

const CategoryThemedIcon: React.FC<{
  catKey: CategoryType;
  isActive: boolean;
  className?: string;
}> = ({ catKey, isActive, className = 'w-4 h-4' }) => {
  const iconColor = isActive ? 'text-[#FF9900]' : 'text-gray-500';

  switch (catKey) {
    case 'popular':
      return <Flame className={`${className} ${iconColor}`} />;
    case 'skewers':
      return <UtensilsCrossed className={`${className} ${iconColor}`} />;
    case 'yakitori':
      return <Drumstick className={`${className} ${iconColor}`} />;
    case 'baked':
      return <Layers className={`${className} ${iconColor}`} />;
    case 'western':
      return <Beef className={`${className} ${iconColor}`} />;
    case 'mains':
      return <CookingPot className={`${className} ${iconColor}`} />;
    case 'drinks':
      return <Coffee className={`${className} ${iconColor}`} />;
    case 'desserts':
      return <CakeSlice className={`${className} ${iconColor}`} />;
    case 'snacks':
      return <Cookie className={`${className} ${iconColor}`} />;
    case 'all':
    default:
      return <Sparkles className={`${className} ${iconColor}`} />;
  }
};

export const DeliveryCategorySidebar: React.FC<DeliveryCategorySidebarProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  categoryCounts = {},
  categoryCartCounts = {},
  soundFeedbackEnabled = true,
  onToggleSoundFeedback
}) => {
  const sidebarContainerRef = useRef<HTMLDivElement>(null);
  const previousActiveCatRef = useRef<CategoryType>(activeCategory);
  const lastSoundTimeRef = useRef<number>(0);

  // 手指跟踪、长按预选择与落点切换交互状态 (同底部导航栏动态交互逻辑)
  const [isPreselecting, setIsPreselecting] = useState(false);
  const [previewCategory, setPreviewCategory] = useState<CategoryType | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isCancelZone, setIsCancelZone] = useState(false);

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPointerDownRef = useRef(false);
  const startPointerPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const didTriggerDragRef = useRef(false);
  const activeCatRef = useRef(activeCategory);
  activeCatRef.current = activeCategory;
  const previewCategoryRef = useRef<CategoryType | null>(null);
  previewCategoryRef.current = previewCategory;

  // 联动容器自动居中滚动
  useEffect(() => {
    const container = sidebarContainerRef.current;
    if (!container || !activeCategory || isPreselecting) return;

    const activeItem = container.querySelector<HTMLElement>(
      `[data-sidebar-category="${activeCategory}"]`
    );
    if (activeItem) {
      const containerHeight = container.clientHeight;
      const itemOffsetTop = activeItem.offsetTop;
      const itemHeight = activeItem.clientHeight;
      const targetScroll = itemOffsetTop - containerHeight / 2 + itemHeight / 2;

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }

    if (previousActiveCatRef.current !== activeCategory) {
      previousActiveCatRef.current = activeCategory;

      const now = Date.now();
      if (soundFeedbackEnabled && now - lastSoundTimeRef.current > 180) {
        const idx = categories.indexOf(activeCategory);
        playCategoryLinkSound(idx >= 0 ? idx : 0);
        lastSoundTimeRef.current = now;
      }
    }
  }, [activeCategory, soundFeedbackEnabled, categories, isPreselecting]);

  const handleItemClick = (catKey: CategoryType) => {
    if (soundFeedbackEnabled) {
      playCategorySnapSound();
    }
    onSelectCategory(catKey);
  };

  /** 根据手指或鼠标在视口中的绝对坐标计算对应的目标侧边栏分类项 */
  const getCategoryAtPoint = (clientX: number, clientY: number): CategoryType | null => {
    if (!sidebarContainerRef.current) return null;
    const rect = sidebarContainerRef.current.getBoundingClientRect();

    // 在侧边栏水平中心线上进行垂直采样，手指左右轻微抖动也能稳定定位当前垂直分类项
    const sampleX = rect.left + rect.width / 2;
    const el = document.elementFromPoint(sampleX, clientY);
    if (el) {
      const catBtn = el.closest('[data-sidebar-category]');
      if (catBtn) {
        const catKey = catBtn.getAttribute('data-sidebar-category') as CategoryType;
        if (catKey && categories.includes(catKey)) return catKey;
      }
    }

    // 几何容灾保底：遍历各个分类 DOM 元素位置
    const categoryButtons = sidebarContainerRef.current.querySelectorAll<HTMLElement>('[data-sidebar-category]');
    for (let i = 0; i < categoryButtons.length; i++) {
      const btn = categoryButtons[i];
      const btnRect = btn.getBoundingClientRect();
      if (clientY >= btnRect.top && clientY <= btnRect.bottom) {
        const catKey = btn.getAttribute('data-sidebar-category') as CategoryType;
        if (catKey && categories.includes(catKey)) return catKey;
      }
    }

    // 若超出顶部或底部边界，返回最接近的首项或末项
    if (clientY < rect.top) return categories[0] || null;
    if (clientY > rect.bottom) return categories[categories.length - 1] || null;

    return null;
  };

  const handlePointerDown = (clientX: number, clientY: number, sourceCat?: CategoryType) => {
    isPointerDownRef.current = true;
    didTriggerDragRef.current = false;
    startPointerPosRef.current = { x: clientX, y: clientY, time: Date.now() };

    // 长按 140ms 激活手指预选择与跟随模式 (与底栏导航逻辑一致)
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      if (!isPointerDownRef.current) return;
      didTriggerDragRef.current = true;
      setIsPreselecting(true);
      const initialCat = sourceCat || getCategoryAtPoint(clientX, clientY) || activeCatRef.current;
      setPreviewCategory(initialCat);
      setCursorPos({ x: clientX, y: clientY });
      safeVibrate(22);
      if (soundFeedbackEnabled) {
        const idx = categories.indexOf(initialCat);
        playCategoryLinkSound(idx >= 0 ? idx : 0);
      }
    }, 140);
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isPointerDownRef.current || !startPointerPosRef.current) return;

    const deltaX = Math.abs(clientX - startPointerPosRef.current.x);
    const deltaY = Math.abs(clientY - startPointerPosRef.current.y);

    // 移动超过 8px 时立即激活预选择，无需等待长按计时器结束
    if (!didTriggerDragRef.current && (deltaX > 8 || deltaY > 8)) {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      didTriggerDragRef.current = true;
      setIsPreselecting(true);
    }

    if (didTriggerDragRef.current || isPreselecting) {
      setCursorPos({ x: clientX, y: clientY });

      if (sidebarContainerRef.current) {
        const rect = sidebarContainerRef.current.getBoundingClientRect();
        // 向右滑出侧边栏 85px（滑入右侧菜品流）或向上/下过远时判定为进入取消区域
        if (
          clientX > rect.right + 85 ||
          clientX < rect.left - 45 ||
          clientY < rect.top - 60 ||
          clientY > rect.bottom + 60
        ) {
          if (!isCancelZone) {
            setIsCancelZone(true);
            safeVibrate(15);
          }
          return;
        } else if (isCancelZone) {
          setIsCancelZone(false);
          safeVibrate(15);
        }

        // 边缘自动滚动优化：当拖拽靠近侧边栏上下边缘时，平滑自动滚动侧边栏
        if (clientY < rect.top + 50) {
          sidebarContainerRef.current.scrollTop -= 6;
        } else if (clientY > rect.bottom - 50) {
          sidebarContainerRef.current.scrollTop += 6;
        }
      }

      const hoveredCat = getCategoryAtPoint(clientX, clientY);
      if (hoveredCat && hoveredCat !== previewCategoryRef.current) {
        setPreviewCategory(hoveredCat);
        safeVibrate(18); // 划过新分类项时轻触震动反馈
        if (soundFeedbackEnabled) {
          const idx = categories.indexOf(hoveredCat);
          playCategoryLinkSound(idx >= 0 ? idx : 0);
        }
      }
    }
  };

  const handlePointerUp = (clientX: number, clientY: number) => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    const wasDragging = didTriggerDragRef.current || isPreselecting;
    isPointerDownRef.current = false;

    if (wasDragging) {
      if (isCancelZone) {
        // 用户滑入取消区域松开
        safeVibrate([15, 30]);
      } else {
        // 根据落点位置执行切换
        const landingCat = previewCategoryRef.current || getCategoryAtPoint(clientX, clientY);
        if (landingCat) {
          handleItemClick(landingCat);
          safeVibrate(30);
        }
      }
    }

    // 延迟 50ms 复位 didTriggerDragRef，避免松开时触发按钮的原生 click 重复响应
    setTimeout(() => {
      didTriggerDragRef.current = false;
    }, 50);

    setIsPreselecting(false);
    setPreviewCategory(null);
    setCursorPos(null);
    setIsCancelZone(false);
    startPointerPosRef.current = null;
  };

  // 全局鼠标指针与触摸兜底监听，保障快速拖拽划出侧边栏范围时依然平滑跟踪与释放
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPointerDownRef.current) {
        handlePointerMove(e.clientX, e.clientY);
      }
    };
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isPointerDownRef.current) {
        handlePointerUp(e.clientX, e.clientY);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };
  }, [categories, soundFeedbackEnabled]);

  // 移动端在预选择模式下阻止默认页面拉扯，保证手指指滑极其跟手
  useEffect(() => {
    const container = sidebarContainerRef.current;
    if (!container) return;

    const handleTouchMoveNative = (e: TouchEvent) => {
      if (isPointerDownRef.current && (didTriggerDragRef.current || isPreselecting)) {
        if (e.cancelable) e.preventDefault();
        const t = e.touches[0];
        if (t) handlePointerMove(t.clientX, t.clientY);
      }
    };

    container.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
    return () => {
      container.removeEventListener('touchmove', handleTouchMoveNative);
    };
  }, [isPreselecting]);

  // 预选择生效期间实时动态高亮手指所指的按钮
  const effectiveActiveCategory =
    isPreselecting && !isCancelZone && previewCategory ? previewCategory : activeCategory;
  const effectiveActiveIndex = categories.indexOf(effectiveActiveCategory);

  // 计算当前预览分类的详细信息，用于灵动悬浮气泡 HUD 展示
  const previewConfig: PrimaryCategoryConfig | undefined = CATEGORY_TAXONOMY[effectiveActiveCategory];
  const previewDisplayName = previewConfig?.sidebarName || previewConfig?.name || '分类';
  const previewDishCount = categoryCounts[effectiveActiveCategory] ?? 0;
  const previewCartCount = categoryCartCounts[effectiveActiveCategory] || 0;
  const previewIndexStr = `#${String(effectiveActiveIndex >= 0 ? effectiveActiveIndex + 1 : 1).padStart(2, '0')}`;

  // 计算悬浮气泡相对于侧边栏的贴靠位置
  const sidebarRect = sidebarContainerRef.current?.getBoundingClientRect();
  const hudLeft = sidebarRect ? sidebarRect.right + 10 : 76;
  const hudTop = cursorPos
    ? Math.max(70, Math.min(typeof window !== 'undefined' ? window.innerHeight - 70 : 500, cursorPos.y))
    : 100;

  return (
    <>
      <aside
        id="delivery-category-sidebar"
        ref={sidebarContainerRef}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) handlePointerDown(t.clientX, t.clientY);
        }}
        onTouchEnd={(e) => {
          const t = e.changedTouches[0];
          if (t) handlePointerUp(t.clientX, t.clientY);
        }}
        onTouchCancel={(e) => {
          const t = e.changedTouches[0];
          if (t) handlePointerUp(t.clientX, t.clientY);
        }}
        onMouseDown={(e) => {
          if (e.button === 0) handlePointerDown(e.clientX, e.clientY);
        }}
        className={`sticky top-0 self-start w-[64px] sm:w-[72px] h-[calc(100dvh-125px)] max-h-[calc(100dvh-125px)] bg-white border-r border-[#E2E4E8] flex flex-col shrink-0 select-none overflow-y-auto overscroll-contain touch-pan-y no-scrollbar z-30 shadow-2xs transition-all ${
          isPreselecting ? 'ring-1 ring-[#FF9900]/40' : ''
        }`}
        style={{
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* Top Index & Stats Counter */}
        <div className="py-1 px-1 sm:px-2 text-center border-b border-[#E2E4E8] flex items-center justify-center space-x-1 text-[10px] tabular-nums sticky top-0 bg-white z-10">
          <span className="font-bold text-black">{effectiveActiveIndex >= 0 ? effectiveActiveIndex + 1 : 1}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-500">{categories.length}</span>
          <button
            type="button"
            onClick={onToggleSoundFeedback}
            title={soundFeedbackEnabled ? '点击静音提示' : '点击开启提示'}
            className="w-3.5 h-3.5 rounded-full bg-[#FF9900] text-white font-bold inline-flex items-center justify-center text-[9px] scale-90 cursor-pointer transition-transform hover:scale-105 active:scale-95"
          >
            !
          </button>
        </div>

        {/* Category List */}
        <nav
          id="delivery-category-nav"
          className="flex flex-col text-center divide-y divide-[#ECEEF1] bg-white pb-14 relative"
        >
          {categories.map((catKey, idx) => {
            const config: PrimaryCategoryConfig | undefined = CATEGORY_TAXONOMY[catKey];
            if (!config) return null;

            const isActive = effectiveActiveCategory === catKey;
            const isHoverPreview = isPreselecting && !isCancelZone && previewCategory === catKey;
            const cartCount = categoryCartCounts[catKey] || 0;
            const dishCount = categoryCounts[catKey] ?? 0;
            const displayName = config.sidebarName || config.name;
            const indexStr = `#${String(idx + 1).padStart(2, '0')}`;

            if (isActive) {
              return (
                <button
                  key={catKey}
                  type="button"
                  data-sidebar-category={catKey}
                  onClick={() => {
                    if (!didTriggerDragRef.current) {
                      handleItemClick(catKey);
                    }
                  }}
                  className={`py-2 px-0.5 sm:px-1 flex flex-col items-center justify-center bg-[#181818] text-white relative shadow-inner cursor-pointer select-none transition-all duration-150 ${
                    isHoverPreview ? 'scale-[1.03] z-20 ring-1 ring-[#FF9900]/70' : ''
                  }`}
                >
                  {/* 右侧微光指示柱 (手指跟随高亮时的动效条) */}
                  <span
                    className={`absolute right-0 top-1 bottom-1 w-1 bg-[#FF9900] rounded-l-full transition-all duration-150 ${
                      isHoverPreview ? 'opacity-100 shadow-[0_0_8px_#FF9900]' : 'opacity-80'
                    }`}
                  />

                  <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[#FF9900]">
                    <CategoryThemedIcon
                      catKey={catKey}
                      isActive={true}
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF9900] transition-transform ${
                        isHoverPreview ? 'scale-110' : ''
                      }`}
                    />
                  </div>
                  <span className="text-[7.5px] sm:text-[8px] tabular-nums text-gray-400">{indexStr}</span>
                  <span className="text-[9.5px] sm:text-[10px] font-bold text-white tracking-tight truncate w-full px-0.5 text-center">
                    {displayName}
                  </span>
                  <span className="text-[7.5px] sm:text-[8px] text-[#FF9900] scale-90 leading-none mt-0.5 font-medium">
                    {dishCount}款
                  </span>
                  {cartCount > 0 && (
                    <span className="absolute top-1 right-1 bg-[#FF3B30] text-white text-[8px] tabular-nums font-bold min-w-[13px] h-[13px] px-0.5 rounded-full flex items-center justify-center leading-none shadow-xs">
                      {cartCount}
                    </span>
                  )}
                </button>
              );
            }

            return (
              <button
                key={catKey}
                type="button"
                data-sidebar-category={catKey}
                onClick={() => {
                  if (!didTriggerDragRef.current) {
                    handleItemClick(catKey);
                  }
                }}
                className="py-2 px-0.5 sm:px-1 flex flex-col items-center justify-center text-gray-700 relative bg-white hover:bg-neutral-100 transition-colors cursor-pointer select-none"
              >
                <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-gray-500">
                  <CategoryThemedIcon catKey={catKey} isActive={false} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                </div>
                <span className="text-[7.5px] sm:text-[8px] tabular-nums text-gray-400 mt-0.5">{indexStr}</span>
                <span className="text-[9.5px] sm:text-[10px] font-bold tracking-tight text-gray-700 truncate w-full px-0.5 text-center">
                  {displayName}
                </span>
                <span className="text-[7.5px] sm:text-[8px] text-gray-400 scale-90 leading-none mt-0.5">
                  {dishCount}款
                </span>
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 bg-[#FF3B30] text-white text-[8px] tabular-nums font-bold min-w-[13px] h-[13px] px-0.5 rounded-full flex items-center justify-center leading-none">
                    {cartCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 手指长按拖拽跟随预选择灵动悬浮指示器 (Floating Finger Track & Category Preselect HUD) */}
      <AnimatePresence>
        {isPreselecting && cursorPos && (
          <motion.div
            key="sidebar-preselect-hud"
            initial={{ opacity: 0, scale: 0.85, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: -6 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              top: `${hudTop}px`,
              left: `${hudLeft}px`,
              transform: 'translateY(-50%)'
            }}
            className="fixed z-50 pointer-events-none select-none flex items-center"
          >
            {/* 左侧微光指向三角标 (瞄准侧边栏当前手指划过的分类项) */}
            <div
              className={`w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] transition-colors duration-150 shrink-0 ${
                isCancelZone ? 'border-r-red-600' : 'border-r-[#FF9900]'
              }`}
            />

            {/* 灵动气泡主体 */}
            <div
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.45)] border text-xs whitespace-nowrap transition-colors duration-150 ${
                isCancelZone
                  ? 'bg-red-950/95 border-red-500/80 text-red-100 shadow-[0_6px_20px_rgba(239,68,68,0.4)]'
                  : 'bg-[#121417]/95 border-[#FF9900]/80 text-white shadow-[0_6px_24px_rgba(255,153,0,0.35)]'
              }`}
            >
              {isCancelZone ? (
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-xs text-red-100">松开取消切换</span>
                    <span className="text-[9px] text-red-300">手指移回左侧列表即可恢复</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* 分类主题图标勋章 */}
                  <div className="w-7 h-7 rounded-lg bg-[#222] border border-[#FF9900]/50 flex items-center justify-center text-[#FF9900] shrink-0 shadow-inner">
                    <CategoryThemedIcon
                      catKey={effectiveActiveCategory}
                      isActive={true}
                      className="w-4 h-4 text-[#FF9900] animate-pulse"
                    />
                  </div>

                  {/* 分类信息区 */}
                  <div className="flex flex-col text-left min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] tabular-nums text-[#FF9900] font-bold">
                        {previewIndexStr}
                      </span>
                      <span className="text-xs font-bold text-white tracking-tight">
                        {previewDisplayName}
                      </span>
                      {previewCartCount > 0 && (
                        <span className="bg-[#FF3B30] text-white text-[9px] tabular-nums font-bold px-1 rounded-full">
                          {previewCartCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[9.5px] text-gray-400 mt-0.5">
                      <span className="text-[#FF9900] font-medium">{previewDishCount} 款菜品</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-emerald-400 font-medium">松开即刻直达</span>
                    </div>
                  </div>

                  {/* 松开跳转高亮胶囊提示 */}
                  <div className="ml-1 px-2 py-0.8 rounded-full bg-[#FF9900]/20 border border-[#FF9900]/50 text-[#FF9900] text-[10px] font-bold shrink-0 animate-pulse flex items-center gap-0.5">
                    <span>松开直达</span>
                    <ChevronRight className="w-2.5 h-2.5" />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
