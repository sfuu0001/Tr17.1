import React, { useEffect, useRef } from 'react';

/**
 * 极致 120FPS 硬件加速滚动舒展动效 Hook 与组件
 *
 * 彻底解决「帧率变低」的技术方案：
 * 1. 移出 React 组件生命周期：绝不在此频繁 setState 触发组件重渲染与 Fiber 树对比
 * 2. 移除 Framer Motion JS 主线程计算：将 transform/opacity 的补间完全移交浏览器 GPU Compositor 硬件加速
 * 3. 极速 dataset DOM 标记：IntersectionObserver 直接向元素写入 data-reveal="visible" 或 "hidden-down"
 * 4. 离屏 0 耗损瞬间复位：滚出视口时 transition: none !important 毫秒级复位，滚入时顺畅执行 0.32s 展开
 */

let sharedObserver: IntersectionObserver | null = null;
let currentScrollRoot: HTMLElement | null = null;

function getOrCreateSharedObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
    return null;
  }

  const scrollContainer =
    document.getElementById('main-content-scroll-area') ||
    document.querySelector('.overflow-y-auto') ||
    null;

  if (!sharedObserver || currentScrollRoot !== scrollContainer) {
    if (sharedObserver) {
      sharedObserver.disconnect();
    }
    currentScrollRoot = scrollContainer as HTMLElement | null;

    sharedObserver = new IntersectionObserver(
      (entries) => {
        // 使用批量处理，直接操作 DOM dataset 属性
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const target = entry.target as HTMLElement;
          if (!target) continue;

          if (entry.isIntersecting) {
            target.setAttribute('data-reveal', 'visible');
          } else {
            const rootTop = entry.rootBounds ? entry.rootBounds.top : 0;
            const isAbove = entry.boundingClientRect.top < rootTop;
            target.setAttribute('data-reveal', isAbove ? 'hidden-up' : 'hidden-down');
          }
        }
      },
      {
        root: currentScrollRoot,
        // 轻微收缩底部 10px，既保障首屏秒显，又使滚动自然触发
        rootMargin: '0px 0px -10px 0px',
        threshold: 0,
      }
    );
  }

  return sharedObserver;
}

/**
 * 保持兼容的空变体对象（供旧接口解构使用，避免破坏现有引用）
 */
export const organicCardScrollVariants = {};

/**
 * 高性能 0 主线程开销滚动动效 Hook
 */
export function useCardScrollReveal() {
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    if (!el.classList.contains('organic-card-reveal')) {
      el.classList.add('organic-card-reveal');
    }

    const observer = getOrCreateSharedObserver();
    if (!observer) {
      el.setAttribute('data-reveal', 'visible');
      return;
    }

    observer.observe(el);

    return () => {
      if (el) {
        observer.unobserve(el);
      }
    };
  }, []);

  return { elementRef, currentVariant: 'visible', isVisible: true };
}

/**
 * 极简极速 GPU 硬件加速通用包裹容器
 */
export const OrganicCardReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}> = ({ children, className = '', style, id, onClick }) => {
  const { elementRef } = useCardScrollReveal();
  return (
    <div
      ref={elementRef as any}
      id={id}
      onClick={onClick}
      data-reveal="hidden-down"
      style={style}
      className={`organic-card-reveal ${className}`}
    >
      {children}
    </div>
  );
};
