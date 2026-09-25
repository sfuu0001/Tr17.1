import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  UtensilsCrossed,
  ShoppingBag,
  ClipboardList,
  User,
  SlidersHorizontal,
  Bike,
  Flame,
  CheckCircle2,
  ChevronRight,
  MessageSquareText,
  Truck,
  Lock,
  Unlock,
  ShieldCheck,
  ChevronUp,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DiningMode } from './DiningModeSelector';
import { UserRole } from './RoleSwitcherDropdown';
import { Order } from '../types';
import { UnifiedNavDrawer } from './UnifiedNavDrawer';
import { useFlyingCart } from '../utils/FlyingCartContext';
import {
  TruckExpandConfig,
  getTruckExpandConfig,
  subscribeTruckExpandConfig
} from '../utils/truckExpandSettings';
import {
  subscribeOrderChat,
  getUnreadCountForRole
} from '../utils/chatHub';
import {
  subscribeGroupChat,
  getGroupChatUnreadCount
} from '../utils/truckGroupChatEngine';
import { BottomCartBar } from './BottomCartBar';
import { safeGetStorage, safeSetStorage } from '../utils/safeStorage';
import { safeVibrate } from '../utils/haptics';

export type NavTabType = 'home' | 'orders' | 'tracking' | 'profile' | 'checkout' | 'coupons' | 'cart' | 'order_messages' | 'trucks';

interface BottomNavBarProps {
  activeTab: NavTabType;
  onSelectTab: (tab: NavTabType) => void;
  cartCount: number;
  cartTotal: number;
  cartSavings?: number;
  onOpenCart: () => void;
  onProceedToCheckout?: () => void;
  diningMode: DiningMode;
  onDiningModeChange: (mode: DiningMode) => void;
  orders?: Order[];
  onOpenOrders?: () => void;
  isVIPActive?: boolean;
  onOpenVIP?: () => void;
  deliveryAddress?: string;
  onChangeAddress?: () => void;
  currentRole?: UserRole;
  onSelectRole?: (role: UserRole) => void;
  pendingOrdersCount?: number;
  onOpenCloudbase?: () => void;
  isPullUpMenuOpen?: boolean;
  onOpenPullUpMenu?: () => void;
  onOpenMessageHub?: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  cartCount,
  cartTotal,
  cartSavings,
  onOpenCart,
  onProceedToCheckout,
  diningMode,
  onDiningModeChange,
  orders = [],
  onOpenOrders = () => {},
  isVIPActive = false,
  onOpenVIP = () => {},
  deliveryAddress = '北京市朝阳区大悦城北座中庭',
  onChangeAddress = () => {},
  currentRole = 'customer',
  onSelectRole = () => {},
  pendingOrdersCount = 3,
  onOpenCloudbase,
  isPullUpMenuOpen = false,
  onOpenPullUpMenu,
  onOpenMessageHub
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOpeningMenu2s, setIsOpeningMenu2s] = useState(false);
  const [countdownProgress, setCountdownProgress] = useState(0);
  const [truckExpandConfig, setTruckExpandConfig] = useState<TruckExpandConfig>(() => getTruckExpandConfig());
  const twoSecTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const cartBtnRef = useRef<HTMLDivElement | null>(null);
  const { registerCartTarget, badgeBounce } = useFlyingCart();
  const [chatTick, setChatTick] = useState(0);

  // 防误触锁定状态：设计为“整栏全覆盖状态样式”
  const [isNavLocked, setIsNavLocked] = useState<boolean>(() => {
    return safeGetStorage<boolean>('obsidian_bottom_nav_locked', false);
  });
  // 提示用户轻触或滑动解锁的脉冲动效
  const [showLockPrompt, setShowLockPrompt] = useState(false);
  const lockPromptTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleNavLock = (locked: boolean) => {
    setIsNavLocked(locked);
    safeSetStorage('obsidian_bottom_nav_locked', locked);
    safeVibrate(30);
  };

  const handleLockedBarClick = () => {
    setShowLockPrompt(true);
    if (lockPromptTimerRef.current) clearTimeout(lockPromptTimerRef.current);
    lockPromptTimerRef.current = setTimeout(() => {
      setShowLockPrompt(false);
    }, 1800);
    safeVibrate([20, 30, 20]);
  };

  // Subscribe to real-time chat updates to refresh unread badges (Order Chat + Fleet Group Chat)
  useEffect(() => {
    const unsubOrder = subscribeOrderChat(undefined, () => {
      setChatTick((t) => t + 1);
    });
    const unsubGroup = subscribeGroupChat(undefined, undefined, () => {
      setChatTick((t) => t + 1);
    });
    return () => {
      unsubOrder();
      unsubGroup();
    };
  }, []);

  const totalUnreadMessages = useMemo(() => {
    const normalizedRole = currentRole === 'rider' ? 'rider' : currentRole === 'merchant' ? 'merchant' : 'user';
    const orderUnread = orders.reduce((acc, ord) => {
      const ordNo = (ord.orderNo || '').replace(/^#/, '');
      if (!ordNo) return acc;
      return acc + getUnreadCountForRole(ordNo, normalizedRole);
    }, 0);
    const groupUnread =
      getGroupChatUnreadCount('fleet_dispatch', 'fleet-command') +
      getGroupChatUnreadCount('truck_community', 'truck-01');
    return orderUnread + groupUnread;
  }, [orders, currentRole, chatTick]);

  // Subscribe to merchant configuration updates
  useEffect(() => {
    const unsub = subscribeTruckExpandConfig((cfg) => {
      setTruckExpandConfig(cfg);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (cartBtnRef.current) {
      registerCartTarget(cartBtnRef.current);
    }
  }, [registerCartTarget]);

  // Handle Tab 1 (点单按钮) Click: 根据商家后台策略（直接展开 / 倒计时展开 / 不展开）执行
  const handleOrderTabClick = () => {
    if (isNavLocked) {
      handleLockedBarClick();
      return;
    }
    onSelectTab('home');

    // If pull up menu is already open, clicking can toggle it or keep it open
    if (isPullUpMenuOpen) {
      if (onOpenPullUpMenu) onOpenPullUpMenu();
      return;
    }

    // Clear any previous timer
    if (twoSecTimerRef.current) {
      clearTimeout(twoSecTimerRef.current);
      twoSecTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // 1. 如果商家后台设置为“直接展开 (immediate)”或“纯手动模式 (disabled)”下点击
    if (truckExpandConfig.mode === 'immediate' || truckExpandConfig.mode === 'disabled' || !truckExpandConfig.enableOnTabClick) {
      if (truckExpandConfig.hapticFeedback) {
        safeVibrate(40);
      }
      if (onOpenPullUpMenu) onOpenPullUpMenu();
      return;
    }

    // 2. 如果商家后台设置为“倒计时自动展开 (countdown)”
    const duration = Math.max(500, (truckExpandConfig.delaySeconds || 2) * 1000);
    setIsOpeningMenu2s(true);
    setCountdownProgress(0);

    const startTime = Date.now();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setCountdownProgress(pct);
      if (pct >= 100 && progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }, 35);

    twoSecTimerRef.current = setTimeout(() => {
      setIsOpeningMenu2s(false);
      setCountdownProgress(0);
      if (truckExpandConfig.hapticFeedback) {
        safeVibrate(40);
      }
      if (onOpenPullUpMenu) {
        onOpenPullUpMenu();
      }
      twoSecTimerRef.current = null;
    }, duration);
  };

  const handleTouchStart = () => {
    if (isNavLocked) return;
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      safeVibrate(50);
      if (onOpenPullUpMenu) {
        onOpenPullUpMenu();
      } else {
        setIsDrawerOpen(true);
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (twoSecTimerRef.current) clearTimeout(twoSecTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (lockPromptTimerRef.current) clearTimeout(lockPromptTimerRef.current);
    };
  }, []);

  // Dynamically find primary active order directly from live synchronized orders prop
  const deliveringOrders = orders.filter((o) => o.status === 'delivering');
  const cookingOrders = orders.filter((o) => o.status === 'cooking');
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const activeOrders = [...deliveringOrders, ...cookingOrders];

  // 文件夹式标签元数据 (Folder Tab Meta: Active Expands, Inactive Tucks)
  const navTabs = [
    { id: 'home' as const, label: '点餐', icon: UtensilsCrossed },
    { id: 'tracking' as const, label: '专送', icon: Bike },
    {
      id: 'order_messages' as const,
      label: '消息',
      icon: MessageSquareText,
      badge: totalUnreadMessages > 0 ? (totalUnreadMessages > 9 ? '9+' : String(totalUnreadMessages)) : undefined,
      badgeType: (totalUnreadMessages > 0 ? 'red' : undefined) as any,
    },
    { id: 'trucks' as const, label: '餐车', icon: Truck, badgeType: 'green-dot' as const },
    {
      id: 'orders' as const,
      label: '工单',
      icon: ClipboardList,
      badge: activeOrders.length > 0 ? String(activeOrders.length) : undefined,
      badgeType: (activeOrders.length > 0 ? 'orange' : undefined) as any,
    },
    { id: 'profile' as const, label: '我的', icon: User, badgeType: 'orange-dot' as const },
  ];

  // 手指或鼠标位置跟踪、长按预选择与落点切换逻辑
  const [isPreselecting, setIsPreselecting] = useState(false);
  const [previewTab, setPreviewTab] = useState<NavTabType | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isCancelZone, setIsCancelZone] = useState(false);

  const dockContainerRef = useRef<HTMLDivElement | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPointerDownRef = useRef(false);
  const startPointerPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const didTriggerDragRef = useRef(false);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const handleTabClick = (tabId: NavTabType) => {
    if (isNavLocked) {
      handleLockedBarClick();
      return;
    }
    if (tabId === 'home') {
      handleOrderTabClick();
      return;
    }
    if (tabId === 'order_messages') {
      if (onOpenMessageHub) onOpenMessageHub();
    }
    onSelectTab(tabId);
  };

  /** 根据手指或鼠标在视口中的绝对坐标计算对应的目标导航按钮 */
  const getTabAtPoint = (clientX: number, clientY: number): NavTabType | null => {
    if (!dockContainerRef.current) return null;
    const rect = dockContainerRef.current.getBoundingClientRect();

    // 向上滑动超出底栏 65px 以上判定为进入取消区域
    if (clientY < rect.top - 65 || clientY > rect.bottom + 45) {
      return null;
    }

    // 在底栏垂直中心线上进行采样，即使手指轻微晃动也能稳定定位水平按钮
    const sampleY = rect.top + rect.height / 2;
    const el = document.elementFromPoint(clientX, sampleY);
    if (el) {
      const tabButton = el.closest('[data-nav-tab-id]');
      if (tabButton) {
        const tabId = tabButton.getAttribute('data-nav-tab-id') as NavTabType;
        if (tabId) return tabId;
      }
    }

    // 容灾保底：根据触摸点在底栏内的水平相对百分比定位
    const relativeX = clientX - rect.left;
    const usableWidth = rect.width - (isNavLocked ? 0 : 36);
    if (usableWidth <= 0) return null;
    const ratio = Math.max(0, Math.min(0.999, relativeX / usableWidth));
    const idx = Math.floor(ratio * navTabs.length);
    return navTabs[idx]?.id || null;
  };

  const handlePointerDown = (clientX: number, clientY: number, sourceTab?: NavTabType) => {
    if (isNavLocked) return;

    isPointerDownRef.current = true;
    didTriggerDragRef.current = false;
    startPointerPosRef.current = { x: clientX, y: clientY, time: Date.now() };

    // 长按 140ms 激活预选择
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      if (!isPointerDownRef.current) return;
      didTriggerDragRef.current = true;
      setIsPreselecting(true);
      const initialTab = sourceTab || getTabAtPoint(clientX, clientY) || activeTabRef.current;
      setPreviewTab(initialTab);
      setCursorPos({ x: clientX, y: clientY });
      safeVibrate(22);
    }, 140);
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isPointerDownRef.current || !startPointerPosRef.current) return;

    const deltaX = Math.abs(clientX - startPointerPosRef.current.x);
    const deltaY = Math.abs(clientY - startPointerPosRef.current.y);

    // 移动超过 6px 时立即激活预选择与滑动跟踪，无需等待长按计时器
    if (!didTriggerDragRef.current && (deltaX > 6 || deltaY > 6)) {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      didTriggerDragRef.current = true;
      setIsPreselecting(true);
    }

    if (didTriggerDragRef.current || isPreselecting) {
      setCursorPos({ x: clientX, y: clientY });

      if (dockContainerRef.current) {
        const rect = dockContainerRef.current.getBoundingClientRect();
        // 向上划离底栏 55px 以上进入取消判定
        if (clientY < rect.top - 55) {
          if (!isCancelZone) {
            setIsCancelZone(true);
            safeVibrate(15);
          }
          return;
        } else if (isCancelZone) {
          setIsCancelZone(false);
          safeVibrate(15);
        }
      }

      const hoveredTab = getTabAtPoint(clientX, clientY);
      if (hoveredTab && hoveredTab !== previewTab) {
        setPreviewTab(hoveredTab);
        safeVibrate(18); // 划过新按钮时轻触震动反馈
      }
    }
  };

  const handlePointerUp = (clientX: number, clientY: number) => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    const wasDragging = didTriggerDragRef.current || isPreselecting;
    const startPos = startPointerPosRef.current;
    const touchDuration = startPos ? Date.now() - startPos.time : 0;
    const deltaX = startPos ? clientX - startPos.x : 0;
    const deltaY = startPos ? clientY - startPos.y : 0;

    isPointerDownRef.current = false;
    didTriggerDragRef.current = false;

    if (wasDragging) {
      if (isCancelZone) {
        // 用户上滑取消切换
        safeVibrate([15, 30]);
      } else {
        // 判定是否属于底栏快速横滑轻扫 (Flick Swipe)
        const isQuickFlick = touchDuration > 30 && touchDuration < 420 && Math.abs(deltaX) > 24 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1;
        let landingTab: NavTabType | null = null;

        if (isQuickFlick) {
          const curIdx = navTabs.findIndex((t) => t.id === activeTabRef.current);
          if (curIdx !== -1) {
            if (deltaX < 0 && curIdx < navTabs.length - 1) {
              // 向左滑 -> 切换到下一 Tab
              landingTab = navTabs[curIdx + 1].id;
            } else if (deltaX > 0 && curIdx > 0) {
              // 向右滑 -> 切换到上一 Tab
              landingTab = navTabs[curIdx - 1].id;
            }
          }
        }

        if (!landingTab) {
          // 连续滑动拖拽落点判定
          landingTab = previewTab || getTabAtPoint(clientX, clientY);
        }

        if (landingTab) {
          handleTabClick(landingTab);
          safeVibrate(30);
        }
      }
    }

    setIsPreselecting(false);
    setPreviewTab(null);
    setCursorPos(null);
    setIsCancelZone(false);
    startPointerPosRef.current = null;
  };

  // 全局鼠标指针兜底监听，保障快速拖拽划出底栏范围时依然平滑跟踪与释放
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
  }, []);

  // 预选择生效期间实时动态高亮手指所指的按钮，并实时堆叠其他按钮
  const effectiveActiveTab = isPreselecting && !isCancelZone && previewTab ? previewTab : activeTab;
  const activeIdx = navTabs.findIndex((t) => t.id === effectiveActiveTab);

  return (
    <>
      {/* 平行常驻底栏总座 (Fixed Parallel Docking Footer) */}
      <footer
        id="bottom-navbar-outer-wrapper"
        className="w-full shrink-0 z-40 flex flex-col bg-white select-none relative border-t border-neutral-200/80 pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* 祖容器上侧柔和环境光渐变投影 */}
        <div className="absolute -top-3 left-0 right-0 h-3 pointer-events-none bg-gradient-to-t from-black/[0.04] to-transparent z-10" />

        {/* 上层平行常驻：购物车结算条 (仅在点餐主界面且购物车非空时呈现，实时订单全屏等界面下隐藏，保留纯净底栏导航) */}
        {activeTab === 'home' && cartCount > 0 && (
          <BottomCartBar
            cartCount={cartCount}
            cartTotal={cartTotal}
            cartSavings={cartSavings}
            onOpenCart={onOpenCart}
            onProceedToCheckout={onProceedToCheckout}
            cartTargetRef={cartBtnRef}
          />
        )}

        {/* 下层平行常驻：系统主导航栏（纯白底色、高亮精细深蓝卡片展开、非高亮通透微显） */}
        <div
          id="bottom-main-dock-nav"
          ref={dockContainerRef}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) handlePointerDown(t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (t) handlePointerMove(t.clientX, t.clientY);
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
          className="relative flex items-center h-[58px] sm:h-[60px] px-1 py-1.5 text-center bg-white border-t border-neutral-200/80 w-full max-w-xl mx-auto overflow-hidden select-none touch-none shadow-[0_-2px_12px_rgba(0,0,0,0.03)]"
        >
          {navTabs.map((tab, idx) => {
            const isActive = tab.id === effectiveActiveTab;
            const isLeft = idx < activeIdx;
            const isRight = idx > activeIdx;

            // 层叠次序：当前高亮卡居于顶层 (z-30)；左侧卡向右递增叠压；右侧卡向左递增叠压，均向高亮卡聚拢堆叠
            const zIndex = isActive ? 30 : isLeft ? 10 + idx : 25 - idx;

            return (
              <button
                key={tab.id}
                type="button"
                id={`bottom-nav-${tab.id}-tab`}
                data-nav-tab-id={tab.id}
                onClick={() => {
                  if (!didTriggerDragRef.current) {
                    handleTabClick(tab.id);
                  }
                }}
                onTouchStart={tab.id === 'home' ? handleTouchStart : undefined}
                onTouchEnd={tab.id === 'home' ? handleTouchEnd : undefined}
                onMouseDown={tab.id === 'home' ? handleTouchStart : undefined}
                onMouseUp={tab.id === 'home' ? handleTouchEnd : undefined}
                onMouseLeave={tab.id === 'home' ? handleTouchEnd : undefined}
                onContextMenu={
                  tab.id === 'home'
                    ? (e) => {
                        e.preventDefault();
                        if (onOpenPullUpMenu) onOpenPullUpMenu();
                        else setIsDrawerOpen(true);
                      }
                    : undefined
                }
                title={tab.label}
                style={{ zIndex }}
                className={`relative flex items-center justify-center h-[44px] sm:h-[46px] my-auto cursor-pointer transition-all duration-300 ease-out select-none rounded-xl ${
                  isActive
                    ? `flex-[2] sm:flex-[2.2] min-w-0 mx-0.5 z-30 bg-white text-[#1E40AF] border-[1.5px] border-[#1E40AF] shadow-[0_2px_8px_rgba(30,64,175,0.12)] flex-row gap-1.5 px-2 sm:px-2.5 translate-y-0 ${
                        isPreselecting && !isCancelZone ? 'ring-2 ring-blue-500/50 shadow-[0_0_12px_rgba(30,64,175,0.25)]' : ''
                      }`
                    : 'flex-1 min-w-0 mx-0.5 z-10 bg-transparent hover:bg-neutral-100/90 active:bg-neutral-200/60 text-[#374151] border-0 shadow-none flex-col py-0.5 px-0.5 translate-y-0 group'
                }`}
              >
                {/* 图标容器与角标 */}
                <div className="relative flex items-center justify-center shrink-0">
                  <tab.icon
                    className={`stroke-current stroke-[1.35] transition-all duration-200 ${
                      isActive
                        ? 'w-5 h-5 text-[#1E40AF]'
                        : 'w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#374151] group-hover:text-black'
                    }`}
                  />

                  {/* 状态徽标 (红底消息数 / 橙底工单数 / 状态圆点) */}
                  {tab.badgeType === 'red' && Boolean(tab.badge) && (
                    <span
                      className={`absolute -top-1.5 ${
                        isActive ? '-right-2' : '-right-2'
                      } bg-[#FF3B30] text-white tabular-nums text-[7px] font-bold px-1 rounded-full leading-tight shadow-xs pointer-events-none`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  {tab.badgeType === 'orange' && Boolean(tab.badge) && (
                    <span
                      className={`absolute -top-1.5 ${
                        isActive ? '-right-2' : '-right-2'
                      } bg-[#FF9900] text-white tabular-nums text-[7px] font-bold px-1 rounded-full leading-tight shadow-xs pointer-events-none`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  {tab.badgeType === 'green-dot' && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#00B96B] rounded-full pointer-events-none shadow-xs"
                    />
                  )}
                  {tab.badgeType === 'orange-dot' && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#FF9900] rounded-full pointer-events-none shadow-xs"
                    />
                  )}
                </div>

                {/* 文字标签 (Active: 水平并排展示深蓝加粗; Squeezed: 紧凑垂直单行小标) */}
                <span
                  className={`tracking-tight whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'text-xs sm:text-[12.5px] font-bold text-[#1E40AF]'
                      : 'text-[8.5px] sm:text-[9px] font-semibold text-[#4B5563] group-hover:text-black leading-none mt-0.5 truncate max-w-full text-center'
                  }`}
                >
                  {tab.label}
                </span>

                {/* 点餐长按倒计时指示条 */}
                {tab.id === 'home' && isOpeningMenu2s && (
                  <div className="absolute bottom-1 left-2 right-2 h-[2px] bg-blue-100 overflow-hidden rounded-full">
                    <div
                      className="h-full bg-[#1E40AF] transition-all duration-75"
                      style={{ width: `${countdownProgress}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}

          {/* 右端常驻：状态加锁切换触发端点 (Lock Toggle Pill Trigger / Security Clasp) */}
          {!isNavLocked && (
            <button
              type="button"
              id="bottom-nav-lock-toggle-btn"
              onClick={() => toggleNavLock(true)}
              className="relative z-10 h-[44px] sm:h-[46px] my-auto w-8 sm:w-8.5 px-0.5 flex flex-col items-center justify-center bg-transparent hover:bg-neutral-100/90 active:bg-neutral-200/60 border-0 shadow-none rounded-xl text-[#4B5563] hover:text-black transition-colors cursor-pointer shrink-0 ml-0.5 mr-0.5 group"
              title="切换为防误触全栏锁定模式"
            >
              <Lock className="w-3.5 h-3.5 stroke-[#4B5563] group-hover:stroke-black stroke-[1.35] group-hover:scale-105 transition-transform" />
              <span className="text-[7.5px] tabular-nums tracking-tighter mt-0.5 text-[#4B5563] group-hover:text-black font-semibold">
                锁定
              </span>
            </button>
          )}

          {/* =========================================================================
              【整栏全覆盖状态样式】：防误触锁定遮罩层 (Full Morphing State Overlay)
              平滑滑入覆盖全部 Tab 区域，拦截误触，并支持平滑滑动/轻触一键解锁
             ========================================================================= */}
          <AnimatePresence>
            {isNavLocked && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                id="bottom-navbar-locked-overlay"
                onClick={handleLockedBarClick}
                className={`absolute inset-0 z-50 flex items-center justify-between px-3 bg-[#111111]/96 backdrop-blur-md text-white select-none transition-shadow ${
                  showLockPrompt ? 'ring-2 ring-amber-400/80 shadow-lg' : ''
                }`}
              >
                {/* 状态指示区与防护说明 */}
                <div className="flex items-center space-x-2 min-w-0 pr-2">
                  <div className="w-7 h-7 rounded-sm bg-[#222222] border border-[#333333] flex items-center justify-center shrink-0 text-amber-400">
                    <Lock className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <div className="flex flex-col text-left leading-tight min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-white tracking-tight">
                        导航已防误触锁定
                      </span>
                      <span className="text-[9px] tabular-nums text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1 py-0.2 rounded-xs">
                        PROTECTED
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 tabular-nums truncate">
                      {showLockPrompt ? '⚠️ 请轻触右侧按钮或滑动解除锁定' : '防止点餐及浏览时误触跳页'}
                    </span>
                  </div>
                </div>

                {/* 右侧：平滑解锁状态切换控制器 (Smooth Unlock Toggle Button) */}
                <button
                  type="button"
                  id="bottom-nav-unlock-trigger-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNavLock(false);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-neutral-100 text-black rounded-xs text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                >
                  <Unlock className="w-3.5 h-3.5 stroke-[2.2] text-[#111]" />
                  <span>轻触解锁</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 手指/鼠标跟踪预选择灵动悬浮指示器 (Floating Finger Track & Preselect HUD) */}
        <AnimatePresence>
          {isPreselecting && cursorPos && (
            <motion.div
              key="dock-preselect-hud"
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 6 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              style={{
                left: `${Math.max(65, Math.min(typeof window !== 'undefined' ? window.innerWidth - 65 : 300, cursorPos.x))}px`
              }}
              className="fixed bottom-[74px] -translate-x-1/2 z-50 pointer-events-none select-none"
            >
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-xl shadow-2xl border text-xs font-semibold whitespace-nowrap transition-colors duration-150 ${
                  isCancelZone
                    ? 'bg-red-950/92 border-red-500/60 text-red-200 shadow-[0_4px_16px_rgba(239,68,68,0.3)]'
                    : 'bg-neutral-950/92 border-blue-500/60 text-white shadow-[0_4px_20px_rgba(30,64,175,0.35)]'
                }`}
              >
                {isCancelZone ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 animate-pulse" />
                    <span>松开取消切换</span>
                  </>
                ) : (
                  <>
                    {(() => {
                      const currentPreview = navTabs.find((t) => t.id === previewTab);
                      const IconComponent = currentPreview?.icon || UtensilsCrossed;
                      return <IconComponent className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-pulse" />;
                    })()}
                    <span className="font-bold tracking-tight">
                      切至「{navTabs.find((t) => t.id === previewTab)?.label || '目标'}」
                    </span>
                    <span className="text-[10px] text-blue-300 font-normal bg-blue-500/25 px-1.5 py-0.5 rounded-full">
                      松开即达
                    </span>
                  </>
                )}
              </div>

              {/* 向下微光三角指示针，垂直瞄准手指触摸落点 */}
              <div
                className={`w-0 h-0 mx-auto border-x-[5px] border-x-transparent border-t-[6px] transition-colors duration-150 ${
                  isCancelZone ? 'border-t-red-500/60' : 'border-t-blue-500/60'
                }`}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </footer>

      {/* Unified Nav Drawer Component */}
      <UnifiedNavDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        diningMode={diningMode}
        onDiningModeChange={onDiningModeChange}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={onOpenCart}
        orders={orders}
        onOpenOrders={onOpenOrders}
        isVIPActive={isVIPActive}
        onOpenVIP={onOpenVIP}
        deliveryAddress={deliveryAddress}
        onChangeAddress={onChangeAddress}
        onOpenCoupons={() => onSelectTab('coupons')}
        currentRole={currentRole}
        onSelectRole={onSelectRole}
        pendingOrdersCount={pendingOrdersCount}
        onNavigateHome={() => onSelectTab('home')}
        onOpenCloudbase={onOpenCloudbase}
      />
    </>
  );
};
