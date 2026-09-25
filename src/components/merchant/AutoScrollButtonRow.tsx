/* ============================================================================
 * AutoScrollButtonRow —— 卡片内按钮行自适应左右滚动遮罩容器
 * ----------------------------------------------------------------------------
 * 解决痛点：
 *   1. 按钮文字严禁转行（结合子元素 whitespace-nowrap 与 text 缩放）
 *   2. 视口或卡片狭窄发生大幅溢出时，容器自动呈现左右渐变滚动遮罩
 *   3. 自动监听 ResizeObserver 与滚动位置，动态显隐左右遮罩
 * ==========================================================================*/

import React, { useRef, useState, useEffect, useCallback } from 'react';

interface AutoScrollButtonRowProps {
  children: React.ReactNode;
  className?: string;
  gradientBg?: string; // 遮罩底色渐变起点，默认从白色渐变
}

export function AutoScrollButtonRow({
  children,
  className = '',
  gradientBg = 'from-white'
}: AutoScrollButtonRowProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // 留出 2px 容差，避免浮点数精度误判
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateScrollState());
      ro.observe(el);
    } else {
      window.addEventListener('resize', updateScrollState);
    }

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  return (
    <div className={`relative min-w-0 w-full overflow-hidden ${className}`}>
      {/* 左侧动态滚动指示遮罩 (当向右滑动后淡入) */}
      <div
        className={`pointer-events-none absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r ${gradientBg} via-white/90 to-transparent z-10 transition-opacity duration-200 ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* 右侧动态滚动指示遮罩 (当右侧有未展开内容时淡入) */}
      <div
        className={`pointer-events-none absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l ${gradientBg} via-white/90 to-transparent z-10 transition-opacity duration-200 ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* 滚动容器 */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full py-0.5 px-0.5 flex-nowrap"
      >
        {children}
      </div>
    </div>
  );
}
