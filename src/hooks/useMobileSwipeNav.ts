import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NavTabType } from '../components/BottomNavBar';
import { safeVibrate } from '../utils/haptics';
import { safeGetStorage } from '../utils/safeStorage';

/**
 * 顾客端底部核心按钮横向排布顺序 (与 BottomNavBar 保持 1:1 严格一致)
 * 1. 点餐 (home)
 * 2. 专送 (tracking)
 * 3. 消息 (order_messages)
 * 4. 餐车 (trucks)
 * 5. 工单 (orders)
 * 6. 我的 (profile)
 */
export const CUSTOMER_SWIPE_TABS: NavTabType[] = [
  'home',
  'tracking',
  'order_messages',
  'trucks',
  'orders',
  'profile'
];

export const SWIPE_TAB_LABELS: Record<string, string> = {
  home: '点餐',
  tracking: '专送',
  order_messages: '消息',
  trucks: '餐车',
  orders: '工单',
  profile: '我的',
  cart: '选购单',
  checkout: '收银台',
  coupons: '卡券'
};

export interface SwipeFeedbackState {
  visible: boolean;
  direction: 'left' | 'right';
  targetTab: NavTabType;
  label: string;
  isBoundary?: boolean;
}

interface UseMobileSwipeNavOptions {
  activeTab: NavTabType;
  onSelectTab: (tab: NavTabType) => void;
  /** 是否禁用手势（如弹窗处于开启状态时） */
  disabled?: boolean;
}

/**
 * 手机端全屏横向滑动手势 Hook
 * 捕获左滑/右滑以快速切换底部核心导航按钮，并提供触感反馈与方向浮动 HUD
 */
export function useMobileSwipeNav({
  activeTab,
  onSelectTab,
  disabled = false
}: UseMobileSwipeNavOptions) {
  const [feedback, setFeedback] = useState<SwipeFeedbackState | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 触摸坐标与时序追踪
  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchCurrentPos = useRef<{ x: number; y: number } | null>(null);
  const isGestureCancelled = useRef<boolean>(false);

  // 鼠标拖拽模拟（电脑端预览支持）
  const mouseStartPos = useRef<{ x: number; y: number; time: number; active: boolean } | null>(null);

  // 触发反馈浮层
  const triggerFeedback = useCallback((state: Omit<SwipeFeedbackState, 'visible'>) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback({ ...state, visible: true });
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
    }, 1100);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  /** 检查是否触摸在不可触发全局滑动的局部交互元素上 */
  const isIgnoredTarget = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;

    let el: HTMLElement | null = target;
    let depth = 0;
    while (el && el !== document.body && depth < 8) {
      depth++;
      const tag = el.tagName.toLowerCase();
      // 输入框、滑块、文本域、按钮
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return true;
      }
      // 底栏独立具备高精度落点预选追踪系统，避免全局手势冲突
      if (
        el.id === 'bottom-main-dock-nav' ||
        el.id === 'bottom-navbar-outer-wrapper' ||
        el.closest('#bottom-navbar-outer-wrapper')
      ) {
        return true;
      }
      // 显式标记禁止手势的区域
      if (el.getAttribute('data-no-swipe') === 'true' || el.classList.contains('no-swipe')) {
        return true;
      }
      // 地图画布区域
      if (
        el.id === 'radar-map-canvas' ||
        el.classList.contains('amap-container') ||
        el.classList.contains('leaflet-container')
      ) {
        return true;
      }
      // 局部横向滚动容器 (如分类标签条、菜品横滑推荐等)
      if (el.scrollWidth > el.clientWidth + 12) {
        const style = window.getComputedStyle(el);
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
          return true;
        }
      }
      el = el.parentElement;
    }
    return false;
  };

  /** 执行横向滑动手势判定与按钮切换 */
  const handleSwipeAction = useCallback(
    (deltaX: number, deltaY: number, duration: number) => {
      // 判定条件：横向距离 >= 46px，横向偏向比纵向高 1.35 倍，且手势耗时在 60ms ~ 550ms 之间
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX < 46) return false;
      if (absX <= absY * 1.35) return false;
      if (duration < 50 || duration > 550) return false;

      // 检查底部导航栏是否处于防误触锁定状态
      const isLocked = safeGetStorage<boolean>('obsidian_bottom_nav_locked', false);
      if (isLocked) {
        safeVibrate([20, 40, 20]);
        triggerFeedback({
          direction: deltaX < 0 ? 'left' : 'right',
          targetTab: activeTab,
          label: '底栏已锁定 · 请先双击解锁',
          isBoundary: true
        });
        return true;
      }

      if (deltaX < 0) {
        // === 向左滑动 (Swipe Left) -> 切换至下一个按钮 ===
        const currentIndex = CUSTOMER_SWIPE_TABS.indexOf(activeTab);
        if (currentIndex !== -1) {
          if (currentIndex < CUSTOMER_SWIPE_TABS.length - 1) {
            const nextTab = CUSTOMER_SWIPE_TABS[currentIndex + 1];
            safeVibrate(25);
            triggerFeedback({
              direction: 'left',
              targetTab: nextTab,
              label: `切至「${SWIPE_TAB_LABELS[nextTab] || nextTab}」`
            });
            onSelectTab(nextTab);
            return true;
          } else {
            // 已在最右侧末项（我的）
            safeVibrate([15, 30]);
            triggerFeedback({
              direction: 'left',
              targetTab: activeTab,
              label: '已在末项 · 我的',
              isBoundary: true
            });
            return true;
          }
        }
      } else {
        // === 向右滑动 (Swipe Right) -> 切换至上一个按钮 ===
        const currentIndex = CUSTOMER_SWIPE_TABS.indexOf(activeTab);
        if (currentIndex !== -1) {
          if (currentIndex > 0) {
            const prevTab = CUSTOMER_SWIPE_TABS[currentIndex - 1];
            safeVibrate(25);
            triggerFeedback({
              direction: 'right',
              targetTab: prevTab,
              label: `切至「${SWIPE_TAB_LABELS[prevTab] || prevTab}」`
            });
            onSelectTab(prevTab);
            return true;
          } else {
            // 已在最左侧首项（点餐）
            safeVibrate([15, 30]);
            triggerFeedback({
              direction: 'right',
              targetTab: activeTab,
              label: '已在首项 · 点餐',
              isBoundary: true
            });
            return true;
          }
        } else if (activeTab === 'cart' || activeTab === 'coupons' || activeTab === 'checkout') {
          // 二级页面向右滑动快速返回首页点单
          safeVibrate(25);
          triggerFeedback({
            direction: 'right',
            targetTab: 'home',
            label: '返回 · 点餐'
          });
          onSelectTab('home');
          return true;
        }
      }

      return false;
    },
    [activeTab, onSelectTab, triggerFeedback]
  );

  // Touch 事件处理器
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      if (e.touches.length !== 1) {
        touchStartPos.current = null;
        return;
      }
      if (isIgnoredTarget(e.target)) {
        touchStartPos.current = null;
        return;
      }
      const t = e.touches[0];
      touchStartPos.current = { x: t.clientX, y: t.clientY, time: Date.now() };
      touchCurrentPos.current = { x: t.clientX, y: t.clientY };
      isGestureCancelled.current = false;
    },
    [disabled]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || !touchStartPos.current || isGestureCancelled.current) return;
      const t = e.touches[0];
      touchCurrentPos.current = { x: t.clientX, y: t.clientY };

      const deltaX = t.clientX - touchStartPos.current.x;
      const deltaY = t.clientY - touchStartPos.current.y;

      // 如果纵向位移明显大于横向位移，则判定为用户正在垂直滚动页面，立即取消手势捕捉
      if (Math.abs(deltaY) > 30 && Math.abs(deltaY) > Math.abs(deltaX) * 1.4) {
        isGestureCancelled.current = true;
      }
    },
    [disabled]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || !touchStartPos.current || isGestureCancelled.current) {
        touchStartPos.current = null;
        touchCurrentPos.current = null;
        return;
      }
      const endX = touchCurrentPos.current?.x ?? touchStartPos.current.x;
      const endY = touchCurrentPos.current?.y ?? touchStartPos.current.y;
      const deltaX = endX - touchStartPos.current.x;
      const deltaY = endY - touchStartPos.current.y;
      const duration = Date.now() - touchStartPos.current.time;

      handleSwipeAction(deltaX, deltaY, duration);

      touchStartPos.current = null;
      touchCurrentPos.current = null;
      isGestureCancelled.current = false;
    },
    [disabled, handleSwipeAction]
  );

  const onTouchCancel = useCallback(() => {
    touchStartPos.current = null;
    touchCurrentPos.current = null;
    isGestureCancelled.current = false;
  }, []);

  // Mouse 事件处理器 (供桌面端预览模拟手机滑动)
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      if (e.button !== 0) return; // 仅左键
      if (isIgnoredTarget(e.target)) return;

      mouseStartPos.current = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
        active: true
      };
    },
    [disabled]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!mouseStartPos.current || !mouseStartPos.current.active) return;
      const deltaX = e.clientX - mouseStartPos.current.x;
      const deltaY = e.clientY - mouseStartPos.current.y;
      const duration = Date.now() - mouseStartPos.current.time;
      mouseStartPos.current = null;

      handleSwipeAction(deltaX, deltaY, duration);
    },
    [handleSwipeAction]
  );

  return {
    feedback,
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel
    },
    mouseHandlers: {
      onMouseDown,
      onMouseUp
    }
  };
}
