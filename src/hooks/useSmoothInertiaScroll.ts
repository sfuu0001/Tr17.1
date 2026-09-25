import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseSmoothInertiaScrollOptions {
  threshold?: number;
  friction?: number;
  velocityMultiplier?: number;
  stopThreshold?: number;
  scrollStep?: number;
}

export function useSmoothInertiaScroll(options: UseSmoothInertiaScrollOptions = {}) {
  const {
    threshold = 4,
    friction = 0.92,
    velocityMultiplier = 1.4,
    stopThreshold = 0.2,
    scrollStep = 160
  } = options;

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isScrollingActive, setIsScrollingActive] = useState(false);

  const dragStartYRef = useRef(0);
  const dragStartScrollTopRef = useRef(0);
  const lastClientYRef = useRef(0);
  const velocityYRef = useRef(0);
  const dragMovedRef = useRef(false);
  const inertiaAnimationRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanScrollUp(scrollTop > 4);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 4);
  }, []);

  const handleScroll = useCallback(() => {
    updateScrollState();
    setIsScrollingActive(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (!isDragging) setIsScrollingActive(false);
    }, 400);
  }, [updateScrollState, isDragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Condition C2: Ignore inputs, buttons, toggles, interactive elements
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.closest('[data-no-drag="true"]')
    ) {
      return;
    }

    const el = scrollContainerRef.current;
    if (!el) return;

    if (inertiaAnimationRef.current) {
      cancelAnimationFrame(inertiaAnimationRef.current);
      inertiaAnimationRef.current = null;
    }

    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartScrollTopRef.current = el.scrollTop;
    lastClientYRef.current = e.clientY;
    velocityYRef.current = 0;
    dragMovedRef.current = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - dragStartYRef.current;
      if (Math.abs(delta) > threshold) {
        dragMovedRef.current = true;
      }
      velocityYRef.current = moveEvent.clientY - lastClientYRef.current;
      lastClientYRef.current = moveEvent.clientY;

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = dragStartScrollTopRef.current - delta;
      }
      setIsScrollingActive(true);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      // Inertia Momentum
      if (Math.abs(velocityYRef.current) > 1.2 && scrollContainerRef.current) {
        let currentVelocity = velocityYRef.current * velocityMultiplier;
        const glide = () => {
          if (!scrollContainerRef.current || Math.abs(currentVelocity) < stopThreshold) {
            inertiaAnimationRef.current = null;
            setIsScrollingActive(false);
            return;
          }
          scrollContainerRef.current.scrollTop -= currentVelocity;
          currentVelocity *= friction;
          inertiaAnimationRef.current = requestAnimationFrame(glide);
        };
        inertiaAnimationRef.current = requestAnimationFrame(glide);
      } else {
        setTimeout(() => {
          dragMovedRef.current = false;
          setIsScrollingActive(false);
        }, 80);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [threshold, friction, velocityMultiplier, stopThreshold]);

  const scrollSmoothBy = useCallback((direction: 'up' | 'down') => {
    if (!scrollContainerRef.current) return;
    const delta = direction === 'up' ? -scrollStep : scrollStep;
    scrollContainerRef.current.scrollBy({ top: delta, behavior: 'smooth' });
  }, [scrollStep]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    updateScrollState();
    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (inertiaAnimationRef.current) cancelAnimationFrame(inertiaAnimationRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [updateScrollState]);

  return {
    scrollContainerRef,
    canScrollUp,
    canScrollDown,
    isDragging,
    isScrollingActive,
    dragMovedRef,
    handleScroll,
    handleMouseDown,
    scrollSmoothBy,
    updateScrollState
  };
}
