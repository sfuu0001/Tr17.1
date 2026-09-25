import React, { useState, useMemo, useRef, useEffect, useCallback, useSyncExternalStore, lazy, Suspense } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { Header } from './components/Header';
import { TruckBanner } from './components/TruckBanner';
import { TruckPullUpMenu } from './components/TruckPullUpMenu';
import { DishCard } from './components/DishCard';
import { DishListRow } from './components/DishListRow';
import { DishDetailModal } from './components/DishDetailModal';
import { DeliveryCategorySidebar } from './components/DeliveryCategorySidebar';
import { LinkedCategoryFloatingBar } from './components/LinkedCategoryFloatingBar';
import { CartDrawer } from './components/CartDrawer';
import { CartPageView } from './components/CartPageView';
import { CheckoutPageView } from './components/CheckoutPageView';
import { OrderTrackingView } from './components/OrderTrackingView';
import { VIPPerkModal } from './components/VIPPerkModal';
import { AddressSelectorModal } from './components/AddressSelectorModal';
import { BottomNavBar, NavTabType } from './components/BottomNavBar';
import { FilterModal } from './components/FilterModal';
import { BatchActionBar } from './components/BatchActionBar';
import { DiningMode } from './components/DiningModeSelector';
import { DynamicTableMorphWidget } from './components/table/DynamicTableMorphWidget';
import { CompanionDishInteraction } from './components/table/CompanionDishBadge';
import { getMemberAvatar } from './utils/tableAvatarHelper';
import { UserRole } from './components/RoleSwitcherDropdown';
import { OrdersPageView } from './components/OrdersPageView';
import { ProfilePageView } from './components/ProfilePageView';
import { UserCouponsPageView } from './components/UserCouponsPageView';
// 三大角色端视图改为**动态导入**（声明见文件下方「角色端视图按需加载」区块）：
// 它们受 mountedRoles 保活门控，只有角色首次激活时才真正挂载，
// 因此不会进入首屏包，而是在角色切换时按需拉取。
// ⛔ 分辨率锁定：客食端电脑端手机壳视口（iPhone 15 Pro Max 430×932）——尺寸常量禁止修改，见 src/constants/deviceViewport.ts
import { CustomerPhoneFrame } from './components/customer/CustomerPhoneFrame';
import { OrderHistoryMessagesModal } from './components/chat/OrderHistoryMessagesModal';
import { TruckSynergyRoomPageView } from './components/chat/TruckSynergyRoomPageView';
import { DynamicFeedsPageView } from './components/chat/DynamicFeedsPageView';
import { CloudbaseStatusModal } from './components/CloudbaseStatusModal';
import { INITIAL_DISHES, INITIAL_ORDERS, INITIAL_TRUCK_INFO } from './data/mockData';
import { useMobileSwipeNav } from './hooks/useMobileSwipeNav';
import { SwipeGestureIndicator } from './components/SwipeGestureIndicator';
import { CategoryStickyHeaderBar } from './components/CategoryStickyHeaderBar';
// ---- 客食端预览（v3 根层分栏）----
import { CustomerPreviewColumn } from './components/preview/CustomerPreviewColumn';
import { subscribeWorkspacePrefs, getWorkspacePrefsSnapshot, mergeLocalPrefs, PreviewRoleId } from './utils/workspacePreferences';
import { DESKTOP_MEDIA_QUERY } from './constants/deviceViewport';
import { IS_EMBED_CUSTOMER } from './utils/embedMode';

/** 角色持久化（embed 预览会话内不写 storage，避免污染宿主账号） */
function persistUserRole(role: UserRole) {
  if (IS_EMBED_CUSTOMER) return;
  safeSetStorage('obsidian_user_role', role);
}
import { CATEGORY_TAXONOMY } from './data/categoryTaxonomy';
import { INITIAL_USER_PROFILE } from './data/mockUser';
import { CategoryType, DishItem, Order, ViewMode, CartItem, TruckInfo, UserProfile, DishVariant, TableDishItem } from './types';
import { PaymentVoucher } from './types/payment';
import { FilterOptions, INITIAL_FILTER_OPTIONS } from './types/filter';
import { UtensilsCrossed, RefreshCw, FilterX, CheckSquare, Square, Smartphone } from 'lucide-react';
import { FlyingCartProvider } from './utils/FlyingCartContext';
import { ToastProvider, useToast } from './components/ui/ToastContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { DishSkeletonGrid } from './components/ui/DishSkeletonGrid';
import { safeGetStorage, safeSetStorage } from './utils/safeStorage';
import { getTruckBusinessStatus } from './utils/businessStatusEngine';
import { applyAvailabilityOverrides, setAvailabilityOverride, isDishAvailableInChannel } from './utils/dishAvailability';
import { applyDishFieldOverrides } from './utils/dishFieldOverrides';
import { resolveCouponByCode, markCouponUsed, claimCouponByCode } from './utils/couponEngine';
import { getTruckInfo, saveTruckInfo } from './utils/truckInfo';
import { isOrderMatch, normalizeOrderKey, getCanonicalOrderNo } from './utils/orderNormalizer';
import { getCurrentBoundTable, setCurrentBoundTable, bindOrderToMerchantTable } from './utils/tableStorage';
import { sendOrderChatMessage, getUnreadCountForRole, subscribeOrderChat } from './utils/chatHub';
import { rematchAllDishImages } from './utils/dishImageMatcher';
import { safeVibrate } from './utils/haptics';
import { merchantBackupEngine } from './utils/merchantBackupEngine';
import { performAutoLogin } from './utils/autoAuthEngine';
import { AuthGateView, type AuthGateRole } from './components/auth/AuthGateView';
import { syncCascadeIdentityFromSession } from './utils/cascadeMeshEngine';
import { PlatformAuthModal } from './components/auth/PlatformAuthModal';
import { isPlatformAuthorized } from './utils/platformAuthEngine';
import { automatedSentinel, SentinelSystemState } from './utils/automatedSentinelEngine';
import { initGovernance } from './utils/versionPointerEngine';
import { initRealtimeTransport } from './utils/realtimeBootstrap';
import { reactiveSyncBus } from './utils/reactiveSyncBus';
import { useTableSessionUi } from './components/table/useTableSessionUi';
import { TableScanLanding } from './components/table/TableScanLanding';
import { TableMembersPanel } from './components/table/TableMembersPanel';
import { TableBindModal } from './components/table/TableBindModal';
import {
  isMerchantLoggedIn,
  isRiderLoggedIn,
  getMerchantSession,
  getRiderSession,
  logoutMerchant,
  logoutRider,
  MerchantSession,
  RiderSession,
  EVENT_MERCHANT_AUTH_CHANGED,
  EVENT_RIDER_AUTH_CHANGED
} from './utils/staffAndRiderAuthEngine';
import { playCategoryLinkSound, playCategorySnapSound } from './utils/hapticAudio';
import { 
  ensureCloudbaseAuth, 
  fetchDishesFromCloud, 
  fetchOrdersFromCloud, 
  fetchUserProfileFromCloudFunction,
  fetchTruckLocationsFromCloud,
  fetchTruckInfoFromCloud,
  fetchTruckExpandConfigFromCloud,
  pushTruckLocationToCloud,
  pushTruckInfoToCloud,
  watchTruckLocations,
  watchTruckExpandConfig,
  createCloudOrder, 
  updateCloudOrderStatus, 
  watchCloudOrders,
  notifyOrdersChanged,
  syncSingleModuleToCloud,
  TCB_ENV_ID 
} from './utils/cloudbase';
import { subscribeLiveUserProfile, fetchLiveUserProfileFromCloud } from './utils/cloudUserSync';
import { syncEngine } from './utils/syncEngine';
import { globalScannerEngine, ensureDishBarcodes, playScannerBeep } from './utils/barcodeScannerEngine';
import { parseQrScanResult, QrActionPayload } from './utils/qrCodeEngine';
import { globalFranchiseEngine } from './utils/franchiseTenantEngine';
import { globalFranchiseSplitEngine } from './utils/franchiseSplitPayEngine';
import { INITIAL_TABLES } from './data/posMockData';
import {
  TruckExpandConfig,
  getTruckExpandConfig,
  subscribeTruckExpandConfig,
  hasUserDismissedTruckMenu,
  recordUserDismissedTruckMenu,
  OPEN_TRUCK_EXPAND_SETTINGS_EVENT
} from './utils/truckExpandSettings';
import {
  CategoryBrandModalConfig,
  getCategoryBrandConfigs,
  subscribeCategoryBrandConfigs,
  shouldShowCategoryBrandModal,
  recordCategoryBrandModalSeen,
  resetSingleCategorySeenRecord
} from './utils/categoryBrandSettings';
import { SandboxStorageGuard } from './utils/sandbox/SandboxManager';
import { dispatchAutoPrintForPaidOrder } from './utils/autoPrintDispatcherEngine';
import { userJourneyTracker } from './utils/userJourneyTracker';
import { 
  parseCurrentRoute, 
  syncRouteToBrowser, 
  initRouterPatch, 
  AppRouteLocation 
} from './utils/routerPatch';
import { CategoryBrandModal } from './components/CategoryBrandModal';
import { DeliveryRangeModal } from './components/DeliveryRangeModal';
import {
  getActiveTruckConfig,
  evaluateDeliveryRange,
  subscribeTruckConfigs,
  DeliveryRangeEvaluation
} from './utils/truckLocationEngine';
import { DevSimulationProvider } from './context/DevSimulationContext';
import { DevFloatingDock } from './components/dev/DevFloatingDock';
import { DevAuthModal } from './components/dev/DevAuthModal';
import { DevSimulationControlCenter } from './components/dev/DevSimulationControlCenter';
import { CascadeAuthProvider, useCascadeAuth } from './context/CascadeAuthContext';

// -------------------------------------------------------------
// 角色端视图按需加载（配合 mountedRoles Keep-Alive 门控）
// -------------------------------------------------------------
//
// 为什么可行：角色视图由 mountedRoles 保活门控 —— 角色**首次激活**时才挂载，
// 之后常驻并用 CSS 显隐，以免来回切换导致滚动位置与视觉标签重置。
// 因此这三个视图天然适合动态导入：首屏只加载食客端，
// 商户端（约 8.4 万行）/ 平台端（约 1.9 万行）/ 骑手端（约 0.9 万行）
// 只在用户真正切换到对应角色时才拉取。

/** 角色端视图加载占位（仅在首次切换到该角色的极短时间内可见） */
const RoleViewFallback = (
  <div className="w-full min-h-screen grid place-items-center">
    <span className="text-sm text-[#8a8a82]">正在加载视图…</span>
  </div>
);

const MerchantSystemView = lazy(() =>
  import('./components/merchant/MerchantSystemView').then((m) => ({ default: m.MerchantSystemView }))
);
const RiderSystemView = lazy(() =>
  import('./components/rider/RiderSystemView').then((m) => ({ default: m.RiderSystemView }))
);
const PlatformSystemView = lazy(() =>
  import('./components/platform/PlatformSystemView').then((m) => ({ default: m.PlatformSystemView }))
);

export default function App() {
  return (
    <ErrorBoundary>
      <DevSimulationProvider>
        <ToastProvider>
          <CascadeAuthProvider>
            <FlyingCartProvider>
              <MainAppContent />
            </FlyingCartProvider>
          </CascadeAuthProvider>
        </ToastProvider>
      </DevSimulationProvider>
    </ErrorBoundary>
  );
}

// Helper to ensure order list has strictly unique ids
function deduplicateOrders(list: Order[]): Order[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const cleanId = (item.id || '').replace(/^#/, '');
    const cleanNo = (item.orderNo || '').replace(/^#/, '');
    const key = cleanId || cleanNo;
    if (!key || seen.has(cleanId) || seen.has(cleanNo)) return false;
    if (cleanId) seen.add(cleanId);
    if (cleanNo) seen.add(cleanNo);
    return true;
  });
}

function MainAppContent() {
  const toast = useToast();

  // Core state
  const [truck, setTruck] = useState<TruckInfo>(() => getTruckInfo());
  const [dishes, setDishes] = useState<DishItem[]>(() => {
    const raw = safeGetStorage<DishItem[]>('obsidian_truck_dishes', INITIAL_DISHES);
    return applyAvailabilityOverrides(
      applyDishFieldOverrides(ensureDishBarcodes(rematchAllDishImages(raw)))
    );
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const raw = safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS);
    return deduplicateOrders(raw);
  });
  // FIX(审计P0): 最新订单引用（供 mount 期订阅闭包读取最新值，避免 stale closure）
  const ordersRef = useRef<Order[]>(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    return safeGetStorage<UserProfile>('obsidian_user_profile', INITIAL_USER_PROFILE);
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [synergyInitialRoomMode, setSynergyInitialRoomMode] = useState<'order' | 'truck_community' | 'fleet_dispatch' | undefined>(undefined);
  const [synergyInitialTruckId, setSynergyInitialTruckId] = useState<string>('truck-01');
  const [synergySubViewMode, setSynergySubViewMode] = useState<'session_list' | 'chat_room'>('session_list');
  const [categorySortMap, setCategorySortMap] = useState<Record<string, 'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC' | 'HOT'>>({});

  const handleCycleSort = (catKey: string) => {
    setCategorySortMap((prev) => {
      const current = prev[catKey] || 'DEFAULT';
      const next = current === 'DEFAULT' ? 'PRICE_ASC' : current === 'PRICE_ASC' ? 'PRICE_DESC' : current === 'PRICE_DESC' ? 'HOT' : 'DEFAULT';
      return { ...prev, [catKey]: next };
    });
  };

  const [activeCategory, setActiveCategory] = useState<CategoryType>('popular');
  const [categoryScrollProgress, setCategoryScrollProgress] = useState<number>(0);
  const [isScrollingDishes, setIsScrollingDishes] = useState<boolean>(false);
  const [highlightedCategorySection, setHighlightedCategorySection] = useState<CategoryType | null>(null);
  const [soundFeedbackEnabled, setSoundFeedbackEnabled] = useState<boolean>(true);
  const [linkageToastInfo, setLinkageToastInfo] = useState<{
    catName: string;
    icon: string;
    count: number;
  } | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('西藏北路 166 号大悦城商务座 1204 室');
  const [isVIPActive, setIsVIPActive] = useState(true);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [onlyDiscountFilter, setOnlyDiscountFilter] = useState(false);

  // Cascade authorization & mesh tier sync
  const { switchTier } = useCascadeAuth();

  // Dining Mode & Role State
  const [diningMode, setDiningMode] = useState<DiningMode>('delivery');
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (IS_EMBED_CUSTOMER) return 'customer';
    const parsed = parseCurrentRoute();
    if (parsed.role && ['customer', 'merchant', 'rider', 'platform'].includes(parsed.role)) {
      if (parsed.role === 'merchant' && !isMerchantLoggedIn()) {
        return 'customer';
      }
      if (parsed.role === 'rider' && !isRiderLoggedIn()) {
        return 'customer';
      }
      if (parsed.role === 'platform' && !isPlatformAuthorized()) {
        return 'customer';
      }
      return parsed.role;
    }
    const saved = safeGetStorage<UserRole>('obsidian_user_role', 'customer');
    return saved || 'customer';
  });

  // 消息实时订阅与未读统计 (供顶部标题栏与全局路由感知)
  const [chatTick, setChatTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeOrderChat(undefined, () => {
      setChatTick((prev) => prev + 1);
    });
    return () => unsub();
  }, []);

  const totalUnreadMessages = useMemo(() => {
    const normalizedRole = currentRole === 'rider' ? 'rider' : currentRole === 'merchant' ? 'merchant' : 'user';
    return orders.reduce((acc, ord) => {
      const ordNo = (ord.orderNo || '').replace(/^#/, '');
      if (!ordNo) return acc;
      return acc + getUnreadCountForRole(ordNo, normalizedRole);
    }, 0);
  }, [orders, currentRole, chatTick]);

  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string | null>(() => {
    const parsed = parseCurrentRoute();
    return parsed.orderId || null;
  });

  // ---- T3 桌台会话：状态聚合 + 扫码参数 + 成员面板开关 ----
  const tableSession = useTableSessionUi();
  const [membersPanelOpen, setMembersPanelOpen] = useState(false);
  const scanParams = useMemo(() => {
    if (typeof window === 'undefined') return { table: undefined, token: undefined, shortCode: undefined };
    const params = new URLSearchParams(window.location.search);
    let table = params.get('table') ?? undefined;
    if (!table && window.location.pathname.includes('/t/')) {
      const parts = window.location.pathname.split('/t/');
      if (parts[1]) {
        table = decodeURIComponent(parts[1].split('/')[0]).toUpperCase();
      }
    }
    const token = params.get('token') ?? params.get('t') ?? undefined;
    const shortCode = params.get('shortCode') ?? params.get('sc') ?? undefined;
    return {
      table,
      token,
      shortCode
    };
  }, []);
  const hasScanParams = useMemo(() => {
    return Boolean(scanParams.table || scanParams.token || scanParams.shortCode);
  }, [scanParams]);

  // 当通过外部扫码、携带桌号链接进入时，自动无缝切换至堂食扫码点餐模式
  useEffect(() => {
    if (scanParams.table) {
      setDiningMode('dine_in');
    }
  }, [scanParams.table]);

  useEffect(() => {
    void tableSession.actions.init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 行为节点上报：分类切换（节流在 actions 内）
  useEffect(() => {
    tableSession.actions.reportCategory(activeCategory, activeCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);


  // Staff & Rider Phone Authentication Gating States (强制手机号实名登录，设备硬件指纹保持绑定不变)
  const [isPlatformAuthModalOpen, setIsPlatformAuthModalOpen] = useState(false);
  const [targetAuthRole, setTargetAuthRole] = useState<'merchant' | 'rider'>('merchant');
  // 统一路由登录门：全屏接管式登录（AuthGateView），替代旧的弹窗式登录入口
  const [authGateRole, setAuthGateRole] = useState<AuthGateRole | null>(null);
  const [merchantSession, setMerchantSession] = useState<MerchantSession | null>(() => getMerchantSession());
  const [riderSession, setRiderSession] = useState<RiderSession | null>(() => getRiderSession());

  useEffect(() => {
    const handleMerchantChange = (e: any) => {
      setMerchantSession(e.detail !== undefined ? e.detail : getMerchantSession());
    };
    const handleRiderChange = (e: any) => {
      setRiderSession(e.detail !== undefined ? e.detail : getRiderSession());
    };
    window.addEventListener(EVENT_MERCHANT_AUTH_CHANGED, handleMerchantChange);
    window.addEventListener(EVENT_RIDER_AUTH_CHANGED, handleRiderChange);
    return () => {
      window.removeEventListener(EVENT_MERCHANT_AUTH_CHANGED, handleMerchantChange);
      window.removeEventListener(EVENT_RIDER_AUTH_CHANGED, handleRiderChange);
    };
  }, []);

  // 自动化安全中枢 (Automated Sentinel) 状态与反应式总线监听
  const [sentinelState, setSentinelState] = useState<SentinelSystemState>(() => automatedSentinel.getState());
  const [peakMitigationNotice, setPeakMitigationNotice] = useState<{
    isActive: boolean;
    queueDelayMinutes: number;
    reason: string;
  } | null>(null);

  useEffect(() => {
    const unsubSentinel = automatedSentinel.subscribe((next) => {
      setSentinelState({ ...next });
    });
    const unsubBus = reactiveSyncBus.subscribe('EMERGENCY_PEAK_MITIGATION', (payload) => {
      if (payload.isActive) {
        setPeakMitigationNotice(payload);
      } else {
        setPeakMitigationNotice(null);
      }
    });
    // FIX(审计P0): 补齐孤儿事件订阅，使已发布的总线事件产生真实联动副作用
    const unsubTruckMoved = reactiveSyncBus.subscribe('TRUCK_LOCATION_MOVED', () => {
      // 餐车 GPS 变更 -> 触发配送范围评估/多餐车配置版本刷新
      setTruckConfigVersion((v) => v + 1);
    });
    const unsubDishChanged = reactiveSyncBus.subscribe('DISH_PRICE_CHANGED', (payload) => {
      // 商家改价/下架 -> 食客菜单即时刷新（含本地覆盖层）
      setDishes((prev) => {
        const mapped = prev.map((d) => {
          if (d.id !== payload.dishId) return d;
          return {
            ...d,
            available: payload.isSoldOut !== undefined ? !payload.isSoldOut : d.available,
            price: payload.newPrice !== undefined ? payload.newPrice : d.price
          };
        });
        safeSetStorage('obsidian_truck_dishes', applyDishFieldOverrides(mapped));
        return mapped;
      });
    });
    const unsubOrderMutated = reactiveSyncBus.subscribe('ORDER_STATUS_MUTATED', () => {
      // 订单流转 -> 广播同步引擎，追踪视图读取最新 orders 自动刷新
      // embed 预览实例不广播（防跨文档回声）
      if (!IS_EMBED_CUSTOMER) syncEngine.broadcast('ORDERS_CHANGED', ordersRef.current);
    });
    return () => {
      unsubSentinel();
      unsubBus();
      unsubTruckMoved();
      unsubDishChanged();
      unsubOrderMutated();
    };
  }, []);

  // Delivery Range Evaluation & Multi-Truck Engine
  const [truckConfigVersion, setTruckConfigVersion] = useState(0);
  const [isDeliveryRangeModalOpen, setIsDeliveryRangeModalOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeTruckConfigs(() => {
      setTruckConfigVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  const deliveryEvaluation = useMemo(() => {
    const activeTruck = getActiveTruckConfig();
    return evaluateDeliveryRange(activeTruck, deliveryAddress, diningMode);
  }, [deliveryAddress, diningMode, truckConfigVersion]);

  // Filter & Multi-Select states
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(INITIAL_FILTER_OPTIONS);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedDishIds, setSelectedDishIds] = useState<Set<string>>(new Set());

  // Active modals & Navigation tabs
  const [selectedDishForDetail, setSelectedDishForDetail] = useState<DishItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isVIPModalOpen, setIsVIPModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isCloudbaseModalOpen, setIsCloudbaseModalOpen] = useState(false);
  const [isMessageFormModalOpen, setIsMessageFormModalOpen] = useState(false);
  const [isPullUpMenuOpen, setIsPullUpMenuOpen] = useState(false);
  const [isTableBindModalOpen, setIsTableBindModalOpen] = useState(false);
  const [isCloudbaseConnected, setIsCloudbaseConnected] = useState(false);
  const [cloudbaseAuthUserId, setCloudbaseAuthUserId] = useState<string | undefined>(undefined);
  const [activeNavTab, setActiveNavTab] = useState<NavTabType>(() => {
    const parsed = parseCurrentRoute();
    if (parsed.role === 'customer' && parsed.tab) {
      return parsed.tab;
    }
    return 'home';
  });
  const [navHistory, setNavHistory] = useState<NavTabType[]>(() => {
    const parsed = parseCurrentRoute();
    if (parsed.role === 'customer' && parsed.tab && parsed.tab !== 'home') {
      return ['home', parsed.tab];
    }
    return ['home'];
  });

  const navigateTo = (tab: NavTabType) => {
    if (tab === 'order_messages') {
      setSynergyInitialRoomMode(undefined);
      setSynergySubViewMode('session_list');
    }
    if (tab === activeNavTab) {
      if (tab === 'order_messages') {
        // 重复点击消息按钮：强制重置为消息主入口（会话列表）
        setSynergyInitialRoomMode(undefined);
        setSynergySubViewMode('session_list');
      }
      return;
    }
    setNavHistory((prev) => {
      if (prev[prev.length - 1] === tab) return prev;
      return [...prev, tab];
    });
    setActiveNavTab(tab);
    if (tab !== 'home' && truckExpandConfig.collapseOnNavigate && isPullUpMenuOpen) {
      setIsPullUpMenuOpen(false);
    }

    // 写入浏览器路由历史，保障浏览器回退/前进正常工作
    syncRouteToBrowser({
      role: currentRole,
      tab,
      orderId: tab === 'tracking' ? (activeTrackingOrderId || undefined) : undefined
    });

    // 全程监听用户流转节点
    if (tab === 'checkout') {
      userJourneyTracker.trackAction(
        'enter_checkout',
        '进入收银台准备结账',
        { cartItemsCount: cart.length, totalCartPrice },
        'checkout'
      );
    } else if (tab === 'cart') {
      userJourneyTracker.trackAction(
        'view_cart',
        '打开选购单抽屉',
        { cartItemsCount: cart.length, totalCartPrice },
        'cart_active'
      );
    } else if (tab === 'tracking') {
      userJourneyTracker.trackAction(
        'view_tracking',
        '查看雷达配送实时轨迹',
        {},
        'completed'
      );
    }
  };

  const handleBackNav = () => {
    if (activeNavTab === 'checkout') {
      userJourneyTracker.trackAction(
        'cancel_checkout',
        '在结算页面未确认支付，点击返回',
        { cartItemsCount: cart.length, totalCartPrice },
        'checkout'
      );
    }
    // 若浏览器有历史状态，优先配合浏览器原生后退
    if (typeof window !== 'undefined' && window.history.length > 1 && navHistory.length > 1) {
      window.history.back();
      return;
    }

    setNavHistory((prev) => {
      if (prev.length <= 1) {
        setActiveNavTab('home');
        syncRouteToBrowser({ role: currentRole, tab: 'home' });
        return ['home'];
      }
      const nextHistory = prev.slice(0, -1);
      const targetTab = nextHistory[nextHistory.length - 1] || 'home';
      setActiveNavTab(targetTab);
      syncRouteToBrowser({ role: currentRole, tab: targetTab });
      return nextHistory;
    });
  };

  const previousNavTab = useMemo(() => {
    if (navHistory.length >= 2) {
      return navHistory[navHistory.length - 2];
    }
    return 'home';
  }, [navHistory]);

  const [activeCategoryBrandModal, setActiveCategoryBrandModal] = useState<CategoryBrandModalConfig | null>(null);
  const [categoryBrandConfigs, setCategoryBrandConfigs] = useState<Record<string, CategoryBrandModalConfig>>(() =>
    getCategoryBrandConfigs()
  );

  useEffect(() => {
    const unsub = subscribeCategoryBrandConfigs((newConfigs) => {
      setCategoryBrandConfigs(newConfigs);
    });
    return unsub;
  }, []);

  // 全程监听食客端端操作行为会话（embed 预览会话内跳过，降低主线程占用）
  useEffect(() => {
    if (IS_EMBED_CUSTOMER) return;
    userJourneyTracker.initCurrentSession(userProfile?.nickname || '先锋食客');
    userJourneyTracker.generateMockSessionsIfEmpty();
  }, []);

  const [merchantActiveTab, setMerchantActiveTab] = useState<string>(() => {
    const parsed = parseCurrentRoute();
    if (parsed.merchantTab) return parsed.merchantTab;
    return safeGetStorage<string>('obsidian_merchant_active_tab', 'tables');
  });

  // 角色端视图保活生命周期管理（Keep-Alive）：避免多端来回切换时 DOM 被销毁重挂载而导致视觉标签与滚动位置重置
  const [mountedRoles, setMountedRoles] = useState<Record<UserRole, boolean>>(() => ({
    customer: true,
    merchant: currentRole === 'merchant',
    rider: currentRole === 'rider',
    platform: currentRole === 'platform'
  }));

  useEffect(() => {
    setMountedRoles((prev) => {
      if (prev[currentRole]) return prev;
      return { ...prev, [currentRole]: true };
    });
  }, [currentRole]);

  // 监听浏览器原生前进/后退 (PopState/Hash) 与多端深链 (SPA Router Patch)
  useEffect(() => {
    const unbind = initRouterPatch((route: AppRouteLocation) => {
      if (route.role && route.role !== currentRole) {
        if (route.role === 'merchant' && !isMerchantLoggedIn()) {
          setTargetAuthRole('merchant');
          setAuthGateRole('merchant');
          return;
        }
        if (route.role === 'rider' && !isRiderLoggedIn()) {
          setTargetAuthRole('rider');
          setAuthGateRole('rider');
          return;
        }
        if (route.role === 'platform' && !isPlatformAuthorized()) {
          setIsPlatformAuthModalOpen(true);
          return;
        }
        setCurrentRole(route.role);
        persistUserRole(route.role);
      }

      if (route.role === 'customer' && route.tab) {
        setActiveNavTab(route.tab);
        setNavHistory((prev) => (prev[prev.length - 1] === route.tab ? prev : [...prev, route.tab]));
      }
      if (route.merchantTab) {
        setMerchantActiveTab(route.merchantTab);
      }
      if (route.orderId) {
        setActiveTrackingOrderId(route.orderId);
      }
      if (route.table) {
        setDiningMode('dine_in');
      }
    });

    return unbind;
  }, [currentRole]);

  // 初次挂载时将解析出的合法深链参数安全同步回写地址栏
  useEffect(() => {
    const current = parseCurrentRoute();
    syncRouteToBrowser(current, { replace: true });
  }, []);

  // 「菜单界面与活动轮播」模块已下线：一次性清除其本地残留数据（用户确认不保留）
  useEffect(() => {
    try {
      localStorage.removeItem('obsidian_menu_design_system_v2');
    } catch {
      // ignore
    }
  }, []);

  // Ensure page resets to top whenever switching navigation tabs to prevent scroll overflow offsets
  const mainScrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (mainScrollContainerRef.current) {
      mainScrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeNavTab]);

  const menuSectionRef = useRef<HTMLDivElement>(null);

  // Initialize Tencent CloudBase
  useEffect(() => {
    let isMounted = true;

    // 0. 启动数据治理子系统（幂等）：IndexedDB 持久化、历史存证补链、
    //    持久化出口写入网关（覆盖率 100%）、网关一致性自检
    initGovernance();

    // 0.1 启动跨设备实时通道（幂等，不阻塞界面）。
    //      身份解析与云通道就绪均可能失败，降级为 device_local 是合法状态，
    //      因此这里不 await —— 失败也不能挡住应用启动。
    //      embed 预览实例不启动（避免双份 WebSocket / 健康定时器 / 出箱写盘）。
    if (!IS_EMBED_CUSTOMER) {
      void initRealtimeTransport().catch((err) => {
        console.warn('[Realtime] 实时通道启动异常（降级本地总线）:', err);
      });
    }

    // 1. 匿名鉴权连接
    ensureCloudbaseAuth()
      .then((authRes) => {
        if (!isMounted) return;
        if (authRes.success) {
          setIsCloudbaseConnected(true);
          setCloudbaseAuthUserId(authRes.userId);
          console.log('[TCB] 腾讯云开发后台连接成功! 环境:', TCB_ENV_ID, 'UID:', authRes.userId);
          // 登录态就绪后强制重新解析身份，把 participantId 从
          // 设备指纹派生值升级为云端 uid 派生值（否则换设备会丢失桌台成员身份）
          if (!IS_EMBED_CUSTOMER) {
            void initRealtimeTransport({ force: true }).catch((err) => {
              console.warn('[Realtime] 身份重绑定失败（保持设备内有效模式）:', err);
            });
          }
        }
      })
      .catch((err) => {
        console.warn('[TCB] 鉴权初始化异常 (降级本地模式):', err);
      });

    // 2. 从云端拉取菜品
    fetchDishesFromCloud()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.fromCloud && res.dishes && res.dishes.length > 0) {
          setDishes(applyDishFieldOverrides(applyAvailabilityOverrides(res.dishes)));
        }
      })
      .catch((err) => {
        console.warn('[TCB] 拉取菜品异常 (使用本地菜品):', err);
      });

    // 3. 从云端拉取订单
    fetchOrdersFromCloud()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.fromCloud && res.orders && res.orders.length > 0) {
          setOrders(deduplicateOrders(res.orders));
        }
      })
      .catch((err) => {
        console.warn('[TCB] 拉取订单异常 (使用本地订单):', err);
      });

    // 3.5 从腾讯云拉取餐车位置与主信息（若云端尚无则自动兜底并建档）
    fetchTruckLocationsFromCloud()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.configs && res.configs.length > 0) {
          setTruckConfigVersion((v) => v + 1);
          const active = getActiveTruckConfig();
          if (active) {
            setTruck((prev) => ({
              ...prev,
              currentLocationName: active.locationName || prev.currentLocationName,
              latitude: active.latitude ?? prev.latitude,
              longitude: active.longitude ?? prev.longitude
            }));
          }
        }
      })
      .catch((err) => {
        console.warn('[TCB] 拉取餐车位置异常 (使用本地配置):', err);
      });

    fetchTruckInfoFromCloud()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.truck) {
          setTruck((prev) => ({
            ...prev,
            ...res.truck
          }));
          if (res.truck.id) {
            SandboxStorageGuard.updateContext({ truckId: res.truck.id });
          }
        }
      })
      .catch((err) => {
        console.warn('[TCB] 拉取餐车信息异常 (使用本地资料):', err);
      });

    // 3.6 从腾讯云拉取餐车触达与自动展开策略配置（支持云端持久化策略即刻同步）
    fetchTruckExpandConfigFromCloud()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.config) {
          setTruckExpandConfig(res.config);
        }
      })
      .catch((err) => {
        console.warn('[TCB] 拉取餐车展开策略配置异常 (使用本地策略):', err);
      });

    // 4. 无密码智能硬件指纹自动匹配登录 / 新设备自动建档
    performAutoLogin()
      .then((authResult) => {
        if (!isMounted) return;
        if (authResult.success && authResult.user) {
          setUserProfile(authResult.user);
          // 注入沙箱上下文隔离凭据
          SandboxStorageGuard.updateContext({
            userId: authResult.user.uid,
            role: currentRole
          });
          // 如果用户有默认地址，自动同步为当前选中的配送地址
          const defaultAddr = authResult.user.addresses?.find((a) => a.isDefault);
          if (defaultAddr) {
            setDeliveryAddress(`${defaultAddr.address} ${defaultAddr.detail}`);
          }
          if (authResult.isNewUser) {
            console.log(`[智能免密] 识别到新设备 (${authResult.hardwareHash})，已自动创建账户:`, authResult.user.uid);
          } else {
            console.log(`[智能免密] 硬件指纹命中 (${authResult.hardwareHash})，已自动免密登录:`, authResult.user.uid);
          }
        }
      })
      .catch((err) => {
        console.warn('[TCB] 自动登录引擎异常 (使用本地资料保底):', err);
        fetchUserProfileFromCloudFunction()
          .then((res) => {
            if (!isMounted) return;
            if (res.success && res.profile) {
              setUserProfile(res.profile);
            }
          })
          .catch(() => {});
      });

    // 5. 实时监听订单与餐车位点变动（三端同步）
    //    embed 预览实例不参与：不注册 storage 监听、不连云端 watch WebSocket，
    //    仅一次性读取本地快照，防止与宿主形成跨文档回声循环（性能杀手）。
    let watcher: { close: () => void } | null = null;
    let truckWatcher: { close: () => void } | null = null;
    if (!IS_EMBED_CUSTOMER) {
      watcher = watchCloudOrders((liveOrders) => {
        if (!isMounted) return;
        if (liveOrders && liveOrders.length > 0) {
          setOrders(liveOrders);
          syncEngine.broadcast('ORDERS_CHANGED', liveOrders);
        }
      });

      truckWatcher = watchTruckLocations((liveConfigs) => {
        if (!isMounted) return;
        setTruckConfigVersion((v) => v + 1);
        const active = liveConfigs.find((t) => t.id === truck.id || t.id === 'truck-01') || liveConfigs[0];
        if (active) {
          setTruck((prev) => ({
            ...prev,
            currentLocationName: active.locationName || prev.currentLocationName,
            latitude: active.latitude ?? prev.latitude,
            longitude: active.longitude ?? prev.longitude
          }));
        }
      });
    }

    // 6. 订阅五层同步总线 (L5 跨标签页 / 跨端广播监听) —— embed 预览实例不参与
    let unsubSync: (() => void) | null = null;
    if (!IS_EMBED_CUSTOMER) {
      unsubSync = syncEngine.subscribe((event) => {
        if (!isMounted) return;
        if (event.type === 'ORDERS_CHANGED' && event.data && Array.isArray(event.data)) {
          setOrders(event.data);
        } else if (event.type === 'DISHES_CHANGED' && event.data && Array.isArray(event.data)) {
          setDishes(applyDishFieldOverrides(applyAvailabilityOverrides(event.data)));
        } else if (event.type === 'OUTBOX_DRAINED') {
          fetchOrdersFromCloud().then((res) => {
            if (res.orders && res.orders.length > 0 && isMounted) {
              setOrders(res.orders);
            }
          });
        }
      });
    }

    // 6.2 embed 预览实例：菜品/店铺信息单向实时同步（只听 storage、永不回写）。
    //     订单的单向同步由 watchCloudOrders 的 embed 分支负责。
    let unsubEmbedSync: (() => void) | null = null;
    if (IS_EMBED_CUSTOMER) {
      const handleEmbedStorage = (e: StorageEvent) => {
        if (!isMounted || !e.newValue) return;
        try {
          if (e.key === 'obsidian_truck_dishes') {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setDishes(applyAvailabilityOverrides(applyDishFieldOverrides(rematchAllDishImages(ensureDishBarcodes(parsed)))));
            }
          } else if (e.key === 'obsidian_truck_info') {
            const parsed = JSON.parse(e.newValue);
            if (parsed && typeof parsed === 'object') {
              setTruck(parsed as TruckInfo);
            }
          } else if (e.key === 'obsidian_truck_location_configs') {
            setTruckConfigVersion((v) => v + 1);
            const active = getActiveTruckConfig();
            if (active) {
              setTruck((prev) => ({
                ...prev,
                currentLocationName: active.locationName || prev.currentLocationName,
                latitude: active.latitude ?? prev.latitude,
                longitude: active.longitude ?? prev.longitude
              }));
            }
          }
        } catch {
          // ignore
        }
      };
      window.addEventListener('storage', handleEmbedStorage);
      unsubEmbedSync = () => window.removeEventListener('storage', handleEmbedStorage);
    }

    return () => {
      isMounted = false;
      if (watcher) watcher.close();
      if (truckWatcher) truckWatcher.close();
      if (unsubSync) unsubSync();
      if (unsubEmbedSync) unsubEmbedSync();
    };
  }, []);

  // Synchronize orders to secure local storage & sync engine whenever changed
  // embed 预览实例只读不写：写入共享键会向宿主派发 storage 事件（回声循环源头之一）
  useEffect(() => {
    if (IS_EMBED_CUSTOMER) return;
    safeSetStorage('obsidian_truck_orders', orders);
    notifyOrdersChanged(orders);
  }, [orders]);

  // Synchronize dishes to secure local storage & sync engine whenever changed
  useEffect(() => {
    if (IS_EMBED_CUSTOMER) return;
    safeSetStorage('obsidian_truck_dishes', dishes);
  }, [dishes]);

  // Synchronize truck (店铺/餐车信息) to secure local storage whenever changed
  useEffect(() => {
    if (IS_EMBED_CUSTOMER) return;
    saveTruckInfo(truck);
  }, [truck]);

  // 监听版本回滚引擎:菜单/订单数据被回滚到历史版本后，从本地权威键重载进 React state
  useEffect(() => {
    const handleDataRestored = (e: Event) => {
      const detail = (e as CustomEvent<{ module?: string; fullRestore?: boolean }>).detail || {};
      if (!detail.module || detail.module === 'dishes' || detail.fullRestore) {
        const fresh = safeGetStorage<DishItem[]>('obsidian_truck_dishes', INITIAL_DISHES);
        setDishes(
          applyAvailabilityOverrides(
            applyDishFieldOverrides(rematchAllDishImages(ensureDishBarcodes(fresh)))
          )
        );
      }
      if (!detail.module || detail.module === 'orders' || detail.fullRestore) {
        const freshOrders = safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS);
        setOrders(deduplicateOrders(freshOrders));
      }
    };
    window.addEventListener('obsidian_data_restored', handleDataRestored);

    // FIX(审计P0): 补订商家业务引擎已派发但无人消费的 CustomEvent，
    // 解决"商家端改单/改菜后，同标签页已挂载的食客/商家视图不即时刷新"问题。
    const handleDishesUpdated = (e: Event) => {
      const detail = (e as CustomEvent<DishItem[]>).detail;
      if (Array.isArray(detail) && detail.length > 0) {
        setDishes(applyDishFieldOverrides(applyAvailabilityOverrides(rematchAllDishImages(detail))));
      } else {
        const fresh = safeGetStorage<DishItem[]>('obsidian_truck_dishes', INITIAL_DISHES);
        setDishes(applyDishFieldOverrides(applyAvailabilityOverrides(rematchAllDishImages(fresh))));
      }
    };
    const handleOrdersUpdated = (e: Event) => {
      const detail = (e as CustomEvent<Order[]>).detail;
      if (Array.isArray(detail) && detail.length > 0) {
        setOrders(deduplicateOrders(detail));
      } else {
        const freshOrders = safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS);
        setOrders(deduplicateOrders(freshOrders));
      }
    };
    window.addEventListener('obsidian_dishes_updated', handleDishesUpdated);
    window.addEventListener('obsidian_orders_updated', handleOrdersUpdated);

    // 监听版本自动清理事件：从云端实时全量拉取最新用户资料与订单
    const handleVersionPurged = () => {
      console.log('[App] 捕获版本清理与云端就绪事件，正在从云端实时拉取权威档案...');
      fetchUserProfileFromCloudFunction()
        .then((res) => {
          if (res.success && res.profile && isMounted) {
            setUserProfile(res.profile);
          }
        })
        .catch(() => {});
    };
    window.addEventListener('urban-radar:version-purged', handleVersionPurged);

    return () => {
      window.removeEventListener('obsidian_data_restored', handleDataRestored);
      window.removeEventListener('obsidian_dishes_updated', handleDishesUpdated);
      window.removeEventListener('obsidian_orders_updated', handleOrdersUpdated);
      window.removeEventListener('urban-radar:version-purged', handleVersionPurged);
    };
  }, []);

  // 6.3 权威云端用户实时订阅 (Realtime Watcher: 余额、积分、会员等级与订单状态实时推送)
  useEffect(() => {
    if (!userProfile?.uid || userProfile.uid === 'guest') return;
    const unsub = subscribeLiveUserProfile(userProfile.uid, (liveProfile) => {
      setUserProfile((prev) => ({
        ...prev,
        ...liveProfile
      }));
    });
    return () => {
      unsub();
    };
  }, [userProfile?.uid]);

  // 7. 智能餐车自动展开与多场景智能收起策略引擎
  const [truckExpandConfig, setTruckExpandConfig] = useState<TruckExpandConfig>(() => getTruckExpandConfig());
  const autoExpandTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoCollapseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoExpandedRef = useRef<boolean>(false);

  useEffect(() => {
    const unsub = subscribeTruckExpandConfig((cfg) => {
      setTruckExpandConfig(cfg);
    });
    const watcher = watchTruckExpandConfig((cfg) => {
      setTruckExpandConfig(cfg);
    });

    // 监听全局快捷唤起餐车触达与自动展开策略配置面板
    const handleOpenSettings = () => {
      setCurrentRole('merchant');
      setMerchantActiveTab('truck_expand');
      safeSetStorage('obsidian_merchant_active_tab', 'truck_expand');
      persistUserRole('merchant');
      switchTier('MERCHANT');
      syncRouteToBrowser({ role: 'merchant', merchantTab: 'truck_expand' });
      toast.info('已开启「餐车触达与自动展开策略配置」面板');
    };
    window.addEventListener(OPEN_TRUCK_EXPAND_SETTINGS_EVENT, handleOpenSettings);

    return () => {
      unsub();
      watcher.close();
      window.removeEventListener(OPEN_TRUCK_EXPAND_SETTINGS_EVENT, handleOpenSettings);
    };
  }, []);

  // 场景 1: 初次进入网页 / 首页倒计时自动展开；若用户曾经关闭过且开启了“记住关闭/防打扰”，则不重复弹出
  useEffect(() => {
    // 仅在顾客端首页且未手动展开时根据商家后台配置触发
    if (currentRole !== 'customer' || activeNavTab !== 'home') {
      if (autoExpandTimerRef.current) {
        clearTimeout(autoExpandTimerRef.current);
        autoExpandTimerRef.current = null;
      }
      return;
    }

    if (isPullUpMenuOpen) {
      return;
    }

    // 关键场景规则 A: 如果用户之前主动关闭了菜单，并且配置了 rememberUserDismissal 或防打扰策略，直接跳过自动弹出
    if (truckExpandConfig.rememberUserDismissal && hasUserDismissedTruckMenu()) {
      return;
    }

    // 关键场景规则 B: 频次策略校验
    if (truckExpandConfig.triggerScene === 'daily_first' && hasAutoExpandedRef.current) {
      return;
    }
    if (truckExpandConfig.triggerScene === 'manual_dismiss_suppress' && hasUserDismissedTruckMenu()) {
      return;
    }

    if (!truckExpandConfig.enableOnNavTabHome) {
      return;
    }

    // A. 直接展开模式 (immediate)
    if (truckExpandConfig.mode === 'immediate') {
      autoExpandTimerRef.current = setTimeout(() => {
        setIsPullUpMenuOpen(true);
        hasAutoExpandedRef.current = true;
        if (truckExpandConfig.hapticFeedback) {
          // FIX(控制台 intervention): 自动展开发生在无用户手势的定时器中，
          // 直接调用 navigator.vibrate 会被浏览器策略阻断并产生控制台错误条目。
          safeVibrate(40);
        }
      }, 350);
      return;
    }

    // B. 倒计时自动展开模式 (countdown，默认 2 秒)
    if (truckExpandConfig.mode === 'countdown') {
      const delayMs = Math.max(500, (truckExpandConfig.delaySeconds || 2) * 1000);
      autoExpandTimerRef.current = setTimeout(() => {
        setIsPullUpMenuOpen(true);
        hasAutoExpandedRef.current = true;
        if (truckExpandConfig.hapticFeedback) {
          // FIX(控制台 intervention): 同 immediate 模式，避免无手势振动被策略阻断
          safeVibrate(40);
        }
      }, delayMs);
      return;
    }

    // C. 不展开模式 (disabled) - 保持收起
  }, [currentRole, activeNavTab, isPullUpMenuOpen, truckExpandConfig]);

  // 场景 2: 自动展开后如果配置了自动收起 (autoCollapseAfterSeconds > 0)，自动在指定秒数后平滑收起
  useEffect(() => {
    if (isPullUpMenuOpen && truckExpandConfig.autoCollapseAfterSeconds > 0) {
      if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = setTimeout(() => {
        setIsPullUpMenuOpen(false);
      }, truckExpandConfig.autoCollapseAfterSeconds * 1000);
    } else {
      if (autoCollapseTimerRef.current) {
        clearTimeout(autoCollapseTimerRef.current);
        autoCollapseTimerRef.current = null;
      }
    }
    return () => {
      if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
    };
  }, [isPullUpMenuOpen, truckExpandConfig.autoCollapseAfterSeconds]);

  // 场景 3: 页面滚动打断 / 自动收起场景
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | Window;
      const scrollY = target instanceof HTMLElement ? target.scrollTop : window.scrollY;
      if (truckExpandConfig.collapseOnPageScroll && isPullUpMenuOpen) {
        // 用户大幅滚动浏览列表时自动收起餐车浮层
        if (scrollY > 160) {
          setIsPullUpMenuOpen(false);
        }
      }
      // 如果在倒计时期间用户主动滚动且开启了手势打断，则取消本次倒计时弹出
      if (truckExpandConfig.userCancelable && autoExpandTimerRef.current) {
        clearTimeout(autoExpandTimerRef.current);
        autoExpandTimerRef.current = null;
      }
    };

    const scrollContainer = mainScrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isPullUpMenuOpen, truckExpandConfig.collapseOnPageScroll, truckExpandConfig.userCancelable]);

  // 关闭餐车菜单时记录用户主动关闭行为 (供后续场景判断)
  const handleClosePullUpMenu = (isManual = true) => {
    setIsPullUpMenuOpen(false);
    if (isManual) {
      recordUserDismissedTruckMenu(true);
    }
  };

  useEffect(() => {
    return () => {
      if (autoExpandTimerRef.current) clearTimeout(autoExpandTimerRef.current);
      if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
    };
  }, []);

  // Initialize Global Hardware Barcode Scanner Engine
  useEffect(() => {
    globalScannerEngine.init(() => ({
      dishes,
      orders,
      tables: INITIAL_TABLES
    }));

    const unsubscribe = globalScannerEngine.subscribe((result) => {
      // If in customer role, trigger smart cart addition or perk activation
      if (currentRole === 'customer') {
        if (result.type === 'dish' && result.matchedData) {
          const dish = result.matchedData as DishItem;
          if (dish.available) {
            setCart((prev) => {
              const existing = prev.find((item) => item.dish.id === dish.id);
              if (existing) {
                return prev.map((item) =>
                  item.dish.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
                );
              }
              return [
                ...prev,
                {
                  cartItemId: `cart-${dish.id}-${Date.now()}`,
                  dish,
                  quantity: 1,
                  selectedOptions: {},
                  calculatedPrice: dish.price
                }
              ];
            });
            toast.success(`[扫码枪] 已自动加入购物车`, `${dish.name} · ¥${dish.price.toFixed(2)}`);
          } else {
            toast.warning(`[扫码枪] 该菜品已沽清`, `${dish.name} 暂不可点`);
          }
        } else if (result.type === 'member') {
          setIsVIPActive(true);
          toast.success(`[扫码枪] 识别会员身份`, `${result.title} · VIP 9折特权已激活！`);
        } else if (result.type === 'coupon') {
          toast.success(`[扫码枪] 优惠券核销成功`, `${result.title} · 下单立减 ¥10！`);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [dishes, orders, currentRole, toast]);

  // Role selection handler: 骑手端和商家端账号登录必须通过手机号，设备绑定的指纹信息不变
  const handleSelectRole = (role: UserRole) => {
    if (role === 'merchant') {
      if (!isMerchantLoggedIn()) {
        setTargetAuthRole('merchant');
        // 统一路由登录：进入全屏登录门，而非弹窗
        setAuthGateRole('merchant');
        return;
      }
      switchTier('L3');
    } else if (role === 'rider') {
      if (!isRiderLoggedIn()) {
        setTargetAuthRole('rider');
        setAuthGateRole('rider');
        return;
      }
      switchTier('L4');
    } else if (role === 'platform') {
      if (!isPlatformAuthorized()) {
        setIsPlatformAuthModalOpen(true);
        return;
      }
      switchTier('L1');
    } else if (role === 'customer') {
      switchTier('CUSTOMER');
    }
    setCurrentRole(role);
    persistUserRole(role);
    syncRouteToBrowser({ role, tab: activeNavTab });
  };

  const handleStaffRiderAuthSuccess = (
    session: MerchantSession | RiderSession,
    authenticatedRole?: AuthGateRole
  ) => {
    // 自动类型辨识，杜绝角色混淆
    const isMerchant = authenticatedRole
      ? authenticatedRole === 'merchant'
      : 'staffNo' in session;

    if (isMerchant) {
      const mSession = session as MerchantSession;
      setMerchantSession(mSession);
      setCurrentRole('merchant');
      setTargetAuthRole('merchant');
      persistUserRole('merchant');
      switchTier('L3');
      syncCascadeIdentityFromSession(mSession, 'merchant');
      syncRouteToBrowser({ role: 'merchant' });
      toast.success(`商户工作台已核验登入：${mSession.name} (${mSession.roleTitle})`);
    } else {
      const rSession = session as RiderSession;
      setRiderSession(rSession);
      setCurrentRole('rider');
      setTargetAuthRole('rider');
      persistUserRole('rider');
      switchTier('L4');
      syncCascadeIdentityFromSession(rSession, 'rider');
      syncRouteToBrowser({ role: 'rider' });
      toast.success(`骑士专送工作台已核验登入：${rSession.name} (${rSession.levelTitle})`);
    }
    setAuthGateRole(null);
  };

  // Toggle dish available state for merchant portal
  const handleToggleDishAvailability = (dishId: string) => {
    const target = dishes.find((d) => d.id === dishId);
    if (target) {
      const nextState = !target.available;
      setAvailabilityOverride(dishId, nextState);
      toast.info(nextState ? `已上架: ${target.name}` : `已下架: ${target.name}`);
      // FIX(审计P0): 上/下架属售罄状态变更，广播给食客端菜单与购物车实时联动
      try {
        reactiveSyncBus.publish('DISH_PRICE_CHANGED', {
          dishId,
          isSoldOut: !nextState,
          operator: 'merchant'
        });
      } catch {
        // 总线异常静默降级
      }
    }
    setDishes((prev) =>
      prev.map((d) => {
        if (d.id === dishId) {
          return { ...d, available: !d.available };
        }
        return d;
      })
    );
  };

  // Dining Mode Change
  const handleDiningModeChange = (mode: DiningMode) => {
    setDiningMode(mode);
    const activeTruckStatus = getTruckBusinessStatus(truck.id || 'truck-01');

    if (!activeTruckStatus.isOpen) {
      toast.warning('当前餐车已打烊', `${activeTruckStatus.closeReason || '暂停接单中'}，预计恢复：${activeTruckStatus.reopenTime}`);
      return;
    }

    if (mode === 'delivery') {
      if (activeTruckStatus.deliveryOpen === false) {
        toast.warning('当前餐车已暂停外卖专送', '该站台暂未开放外送接单，下单前请切换堂食或自提');
      } else if (deliveryEvaluation.isOutOfRange) {
        toast.warning('已切换为外卖模式', '当前地址超出餐车 1.5km 极速配送范围，请核对地址');
      } else {
        toast.success('已切换为外卖专送', '餐车专人直送 · 满¥80免配送费');
      }
    } else if (mode === 'dine_in') {
      if (activeTruckStatus.dineInOpen === false) {
        toast.warning('当前餐车已暂停堂食就餐', '该站台暂未开放堂食就座点餐，下单前请切换自提或外卖');
      }
      const bound = getCurrentBoundTable();
      const activeCode = tableSession.activeSession?.tableCode || bound?.code;
      if (activeCode) {
        toast.success('已切换为堂食模式', `当前就餐桌位: ${activeCode} 号桌 · 免包装费现点现制`);
      } else {
        toast.info('已切换为堂食模式', '请选座开台或扫码，餐车将直接传菜至桌');
        // 仅在非外部扫码进入时弹出选座开台，避免与外部扫码落点组件双开
        if (!hasScanParams) {
          setIsTableBindModalOpen(true);
        }
      }
    } else if (mode === 'pickup') {
      if (activeTruckStatus.pickupOpen === false) {
        toast.warning('当前餐车已暂停到车自提', '该站台暂未开放窗口自提预订，下单前请切换外卖或堂食');
      } else {
        toast.success('已切换为自提模式', '0元配送费 · 凭提货码至餐车窗口秒取');
      }
    }
  };

  // Refresh menu simulation
  const handleRefreshMenu = () => {
    setIsLoadingMenu(true);
    fetchDishesFromCloud().then((res) => {
      setIsLoadingMenu(false);
      if (res.success && res.fromCloud && res.dishes.length > 0) {
        setDishes(applyDishFieldOverrides(applyAvailabilityOverrides(res.dishes)));
        toast.success('菜单已从腾讯云同步至最新', '餐车实时库存与促销状态已刷新');
      } else {
        toast.success('菜单已同步至最新', '餐车实时库存与促销状态已刷新');
      }
    }).catch(() => {
      setIsLoadingMenu(false);
      toast.success('菜单已同步至最新');
    });
  };

  // Advance order status flow for merchant & rider portals with robust specified order matching & status sync
  const handleAdvanceOrderStatus = (
    orderIdentifier: string,
    targetStatus?: Order['status'],
    extraDetails?: Partial<Order>
  ) => {
    // 1. Strict canonical matching via normalizer (with INITIAL_ORDERS fallback)
    let targetOrder = orders.find((o) => isOrderMatch(o, orderIdentifier));
    let isFromInitial = false;

    if (!targetOrder) {
      targetOrder = INITIAL_ORDERS.find((o) => isOrderMatch(o, orderIdentifier));
      if (targetOrder) {
        isFromInitial = true;
      }
    }

    if (!targetOrder) {
      console.warn(`[handleAdvanceOrderStatus] 未找到匹配订单: ${orderIdentifier}`);
      return;
    }

    // Determine next status
    const nextStatus = targetStatus || (targetOrder.status === 'cooking' ? 'delivering' : 'completed');
    const targetId = targetOrder.id;
    const targetNo = targetOrder.orderNo;

    let updateData: Partial<Order> = {};
    if (nextStatus === 'cooking') {
      toast.success(`订单 ${targetNo} 状态已同步：餐车已接单`, '餐车主理人已确认接单，后厨炭火现制中');
      updateData = {
        status: 'cooking',
        statusText: '餐车已接单 · 现制中',
        merchantAccepted: true,
        progressPercent: 20,
        etaMinutes: extraDetails?.etaMinutes !== undefined ? extraDetails.etaMinutes : 16,
        stepIndex: 1,
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'merchant',
        senderName: '黑曜石餐车主厨',
        type: 'text',
        text: `【餐车已接单】主理人已接单，炭烤炉台现烤现制中，预计 ${updateData.etaMinutes} 分钟后制作完成！`
      });
    } else if (nextStatus === 'ready') {
      toast.success(`订单 ${targetNo} 状态已同步：已制作完成`, '餐品已封装完毕并置于餐车恒温取餐格，等待骑手取餐');
      updateData = {
        status: 'ready',
        statusText: '已制作完成 · 待取餐',
        merchantAccepted: true,
        progressPercent: 40,
        etaMinutes: extraDetails?.etaMinutes !== undefined ? extraDetails.etaMinutes : 12,
        stepIndex: 2,
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'merchant',
        senderName: '黑曜石餐车出餐台',
        type: 'text',
        text: '【已制作完成】餐品已完成双层食品级锁温封装，已放入 01 号保温取餐格，呼叫专线骑手取餐！'
      });
    } else if (nextStatus === 'rider_heading') {
      toast.success(`订单 ${targetNo} 状态已同步：骑手正在赶往商家`, '专线骑手已接单，正在全速赶往流动餐车站台');
      updateData = {
        status: 'rider_heading',
        statusText: '骑手正在赶往商家',
        merchantAccepted: true,
        riderAccepted: true,
        progressPercent: 50,
        etaMinutes: extraDetails?.etaMinutes !== undefined ? extraDetails.etaMinutes : 10,
        courierName: extraDetails?.courierName || targetOrder.courierName || '陈志远 (专线骑手 R-8821)',
        courierPhone: extraDetails?.courierPhone || targetOrder.courierPhone || '138-1829-9201',
        stepIndex: 3,
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'rider',
        senderName: updateData.courierName || '陈志远 (专线骑手 R-8821)',
        type: 'text',
        text: '【骑手已接单】专线骑手已接单，开启高德专线导航，正在全速赶往餐车取餐点！'
      });
    } else if (nextStatus === 'waiting_pickup') {
      toast.success(`订单 ${targetNo} 状态已同步：等待骑手取餐`, '骑手已到达流动餐车，正在出示取件码核验');
      updateData = {
        status: 'waiting_pickup',
        statusText: '等待骑手取餐 · 骑手已到店',
        progressPercent: 60,
        etaMinutes: extraDetails?.etaMinutes !== undefined ? extraDetails.etaMinutes : 9,
        stepIndex: 4,
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'rider',
        senderName: extraDetails?.courierName || targetOrder.courierName || '陈志远 (专线骑手 R-8821)',
        type: 'text',
        text: '【骑手已到店】已到达流动餐车停靠点，正在向主理人出示取件码核销取餐！'
      });
    } else if (nextStatus === 'picked_up') {
      toast.success(`订单 ${targetNo} 状态已同步：骑手已取餐`, '骑手已完成核验与装箱，贴上锁鲜封签');
      updateData = {
        status: 'picked_up',
        statusText: '骑手已取餐 · 装箱封签',
        merchantAccepted: true,
        riderAccepted: true,
        progressPercent: 70,
        etaMinutes: extraDetails?.etaMinutes !== undefined ? extraDetails.etaMinutes : 8,
        stepIndex: 5,
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'rider',
        senderName: extraDetails?.courierName || targetOrder.courierName || '陈志远 (专线骑手 R-8821)',
        type: 'text',
        text: '【骑手已取餐】餐品核验无误，已装入 68℃ 恒温智能保温箱贴上锁鲜封签，即将启程配送！'
      });
    } else if (nextStatus === 'delivering') {
      toast.success(
        `订单 ${targetNo} 状态已同步：骑手配送中`,
        `骑手专线极速送餐中（预计 ${extraDetails?.etaMinutes || 6} 分钟送达）`
      );
      updateData = {
        status: 'delivering',
        statusText: '骑手配送中 · 极速专送',
        merchantAccepted: true,
        riderAccepted: true,
        progressPercent: 85,
        stepIndex: 6,
        etaMinutes: extraDetails?.etaMinutes !== undefined ? extraDetails.etaMinutes : 6,
        courierName: extraDetails?.courierName || targetOrder.courierName || '陈志远 (专线骑手 R-8821)',
        courierPhone: extraDetails?.courierPhone || targetOrder.courierPhone || '138-1829-9201',
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'rider',
        senderName: updateData.courierName || '陈志远 (专线骑手 R-8821)',
        type: 'text',
        text: `【专送出发】骑手已从餐车启程专线飞驰，温控 68°C 保持滚烫，预计 ${updateData.etaMinutes} 分钟内送达！`
      });
    } else if (nextStatus === 'completed') {
      toast.success(
        `订单 ${targetNo} 状态已同步：已送达结算`,
        '骑手已妥投送达，已完成报酬结算并实时同步至前端客户端'
      );
      updateData = {
        status: 'completed',
        statusText: '已妥投送达',
        progressPercent: 100,
        stepIndex: 7,
        etaMinutes: 0,
        estimatedDeliveryTime: '已送达',
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'rider',
        senderName: extraDetails?.courierName || targetOrder.courierName || '陈志远 (专线骑手 R-8821)',
        type: 'text',
        text: '【送达提醒】您的餐品已顺利妥投送达至指定交付点，保温封签完好，请尽快趁热享用！如有疑问随时在此联络。'
      });
    } else if (nextStatus === 'cancel_requested') {
      toast.info(`订单 ${targetNo}：客户申请终止订单`, '顾客已提交取消申请，等待餐车主理人确认审核');
      updateData = {
        status: 'cancel_requested',
        statusText: '客户申请终止订单',
        refundStatus: 'pending',
        refundReason: extraDetails?.refundReason || '客户申请终止订单',
        refundFeedback: extraDetails?.refundFeedback || '顾客在订单流转中发起了终止订单申请',
        refundAppliedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'system',
        senderName: '系统调度提示',
        type: 'text',
        text: `【终止申请】顾客已提交申请终止订单，理由：${updateData.refundReason}。请餐车主理人加急审核处理！`
      });
      userJourneyTracker.markOrderCancelled(targetNo, extraDetails?.refundReason || '客户申请终止订单');
    } else if (nextStatus === 'merchant_rejected') {
      toast.error(`订单 ${targetNo}：商家已拒单`, '餐车已驳回订单，款项已全额原路退还至支付账户');
      updateData = {
        status: 'merchant_rejected',
        statusText: '商家已拒单 · 已退款',
        refundStatus: 'approved',
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'merchant',
        senderName: '餐车站台主理人',
        type: 'text',
        text: '【商家已拒单】非常抱歉，流动餐车因当前客流满负荷或食材售罄无法接单，支付金额已全额原路自动退还！'
      });
    } else if (nextStatus === 'rider_rejected') {
      toast.info(`订单 ${targetNo}：骑手已拒单`, '原骑手因突发路况改派，系统调度中枢正在智能切换骑手');
      updateData = {
        status: 'rider_rejected',
        statusText: '骑手已拒单 · 智能转派中',
        courierName: '系统调度中枢重新匹配中...',
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'system',
        senderName: '云端调度中枢',
        type: 'text',
        text: '【骑手已拒单】原专送骑手因车辆/突发路况发起转单，系统已记录风控，正在加码补贴重新转派就近骑手！'
      });

      // 自动联动仿真：1.8秒后流转到“正在切换骑手”，再过2.5秒重新由新骑手接单
      setTimeout(() => {
        handleAdvanceOrderStatus(targetNo, 'reassigning_rider', {
          courierName: '调度中枢注入补贴转派中'
        });
        setTimeout(() => {
          handleAdvanceOrderStatus(targetNo, 'rider_heading', {
            courierName: '周强 (特约加急骑手 R-9022)',
            courierPhone: '139-7712-8833'
          });
        }, 2800);
      }, 1800);
    } else if (nextStatus === 'reassigning_rider') {
      toast.info(`订单 ${targetNo}：正在切换骑手`, '调度系统已注入 ¥2.00 调度补贴，正在锁定周边 800m 最优骑手');
      updateData = {
        status: 'reassigning_rider',
        statusText: '正在切换骑手 · 调度中',
        ...extraDetails
      };
      sendOrderChatMessage(targetNo, {
        senderRole: 'system',
        senderName: '云端调度中枢',
        type: 'text',
        text: '【正在切换骑手】已加码 ¥2.00 调度补贴，正在调动周边 800 米高评分专送骑手前往餐车接驾！'
      });
    } else if (nextStatus === 'refunded') {
      toast.info(`订单 ${targetNo}：已全额退款`, '资金已原路退回，订单已关闭');
      updateData = {
        status: 'refunded',
        statusText: '已全额退款',
        refundStatus: 'approved',
        ...extraDetails
      };
    } else {
      updateData = {
        status: nextStatus,
        ...extraDetails
      };
    }

    setOrders((prev) => {
      let updated: Order[];
      if (isFromInitial && !prev.some((o) => isOrderMatch(o, targetId) || isOrderMatch(o, targetNo))) {
        const mergedOrder: Order = { ...targetOrder!, ...updateData };
        updated = [mergedOrder, ...prev];
      } else {
        updated = prev.map((o) => {
          if (isOrderMatch(o, targetId) || isOrderMatch(o, targetNo)) {
            return { ...o, ...updateData };
          }
          return o;
        });
      }
      safeSetStorage('obsidian_truck_orders', updated);
      return updated;
    });

    updateCloudOrderStatus(targetId, updateData, 'merchant_admin');
    if (targetNo && targetNo !== targetId) {
      updateCloudOrderStatus(targetNo, updateData, 'merchant_admin');
    }

    // FIX(审计P0): 订单状态真实流转后发布反应式总线事件，供食客追踪/骑手派送池等联动刷新
    try {
      reactiveSyncBus.publish('ORDER_STATUS_MUTATED', {
        orderId: targetNo || targetId,
        oldStatus: targetOrder?.status || 'unknown',
        newStatus: nextStatus,
        updatedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false })
      });
    } catch {
      // 总线异常静默降级
    }
  };

  // Merchant Audit Refund Handler
  const handleAuditRefund = (orderId: string, approved: boolean, rejectReason?: string) => {
    const targetOrder = orders.find((o) => isOrderMatch(o, orderId));
    let cloudUpdate: Partial<Order> = {};
    setOrders((prev) =>
      prev.map((o) => {
        if (isOrderMatch(o, orderId)) {
          if (approved) {
            cloudUpdate = {
              status: 'refunded' as const,
              statusText: '已退款',
              refundStatus: 'approved' as const
            };
            return { ...o, ...cloudUpdate };
          } else {
            // Restore status before refund request based on passed step
            const restoredStatus =
              o.refundPassedStep === 3
                ? 'delivering'
                : o.refundPassedStep === 2
                ? 'ready'
                : o.refundPassedStep === 1
                ? 'cooking'
                : 'pending';
            cloudUpdate = {
              status: restoredStatus as any,
              statusText:
                restoredStatus === 'delivering'
                  ? '配送中'
                  : restoredStatus === 'ready'
                  ? '已出餐待取'
                  : restoredStatus === 'cooking'
                  ? '制作中'
                  : '待接单',
              refundStatus: 'rejected' as const,
              refundRejectReason: rejectReason || '商家审核驳回退单'
            };
            return { ...o, ...cloudUpdate };
          }
        }
        return o;
      })
    );
    // 同步审核结果至云端，避免 watch 快照将本地审核回滚
    if (targetOrder && Object.keys(cloudUpdate).length > 0) {
      updateCloudOrderStatus(targetOrder.orderNo || targetOrder.id, cloudUpdate, 'merchant_admin');
    }
    if (approved) {
      toast.success('退单审核已通过', '款项已原路退回至顾客账户');
    } else {
      toast.info('退单申请已驳回', `驳回原因：${rejectReason || '不满足退单条件'}`);
    }
  };

  // Merchant Toggle Non-Refundable Lock Handler
  const handleToggleNonRefundable = (orderId: string, nonRefundable: boolean) => {
    const cleanId = (orderId || '').trim().replace(/^#/, '');
    setOrders((prev) =>
      prev.map((o) => {
        const cleanOrdNo = (o.orderNo || '').trim().replace(/^#/, '');
        const cleanOrdId = (o.id || '').trim().replace(/^#/, '');
        if (cleanOrdId === cleanId || cleanOrdNo === cleanId) {
          return { ...o, nonRefundable };
        }
        return o;
      })
    );
    // 同步不可退锁定状态至云端
    updateCloudOrderStatus(cleanId, { nonRefundable }, 'merchant_admin');
    toast.info(nonRefundable ? '已设置该订单为【不可退单】' : '已解除该订单不可退单锁定');
  };

  // 同步桌台菜品进度到对应堂食订单：商家端台位矩阵的出餐进度回流至顾客端追踪视图
  const handleSyncTableOrderItems = (orderNo: string, items: TableDishItem[]) => {
    const cleanTarget = (orderNo || '').replace(/^#/, '');
    setOrders((prev) =>
      prev.map((o) => {
        const cleanNo = (o.orderNo || '').replace(/^#/, '');
        if (cleanNo !== cleanTarget) return o;
        return {
          ...o,
          items: o.items.map((it) => {
            const match = items.find((di) => (di.id && di.id === it.dishId) || di.name === it.name);
            if (!match) return it;
            return {
              ...it,
              serveStatus: match.serveStatus,
              prepProgress: match.prepProgress,
              serveTime: match.serveTime
            };
          })
        };
      })
    );
  };

  // Customer Apply Refund Feedback Handler (客户端只能做申请反馈)
  const handleApplyRefund = (
    orderId: string,
    reason: string,
    feedback: string,
    passedStep: number | string
  ) => {
    const cleanId = (orderId || '').trim().replace(/^#/, '');
    const target = orders.find((o) => {
      const cleanOrdNo = (o.orderNo || '').trim().replace(/^#/, '');
      const cleanOrdId = (o.id || '').trim().replace(/^#/, '');
      return cleanOrdId === cleanId || cleanOrdNo === cleanId;
    });

    if (target?.nonRefundable) {
      toast.error('该订单为不可退单商品', '商家已锁定该订单退款权限，请直接致电商家沟通！');
      return;
    }

    const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const refundPayload: Partial<Order> = {
      status: 'refund_pending' as const,
      statusText: '退单审核中',
      refundStatus: 'pending' as const,
      refundReason: reason,
      refundFeedback: feedback,
      refundPassedStep: typeof passedStep === 'number' ? passedStep : 0,
      refundAppliedAt: timeStr
    };
    setOrders((prev) =>
      prev.map((o) => {
        const cleanOrdNo = (o.orderNo || '').trim().replace(/^#/, '');
        const cleanOrdId = (o.id || '').trim().replace(/^#/, '');
        if (cleanOrdId === cleanId || cleanOrdNo === cleanId) {
          return { ...o, ...refundPayload };
        }
        return o;
      })
    );
    // 同步退款申请至云端 (sanitize 已放行 customer 发起 refund_pending 申请)
    updateCloudOrderStatus(cleanId, refundPayload, 'customer');

    // 注入五维自动化安全风控感知 (异动退款监测)
    const targetOrder = orders.find((o) => isOrderMatch(o, cleanId));
    if (targetOrder) {
      automatedSentinel.reportRefundEvent(targetOrder.totalAmount || 0, reason || '食客申请退款');
    }

    toast.success('退单申请已提交', `已在节点 ${passedStep} 提交反馈，等待商家审核处理`);
  };

  // Update truck GPS & location across customer, merchant and rider portals
  const handleUpdateTruckLocation = (
    newLocation: string,
    radiusKm?: number,
    coords?: [number, number]
  ) => {
    setTruck((prev) => {
      const activeCoords: [number, number] = coords || [
        prev.longitude ?? 121.4690,
        prev.latitude ?? 31.2435
      ];
      const updated = {
        ...prev,
        currentLocationName: newLocation,
        longitude: activeCoords[0],
        latitude: activeCoords[1]
      };
      saveTruckInfo(updated); // 商家修改餐车停靠点需落盘，刷新后保留

      // 联动五维自动化安全中枢 (定位合规判定) 与全域反应式总线
      automatedSentinel.reportTruckGPS(activeCoords);
      reactiveSyncBus.publish('TRUCK_LOCATION_MOVED', {
        truckId: updated.id || 'truck-01',
        coordinates: activeCoords,
        radiusKm: radiusKm !== undefined ? radiusKm : (automatedSentinel.getState().activeDynamicDeliveryRadiusKm || 3.0),
        address: newLocation
      });

      // 异步推送云端 (静默双轨同步至腾讯云开发集合)
      void pushTruckInfoToCloud(updated).catch(() => {});
      void syncSingleModuleToCloud('truck_locations').catch(() => {});

      return updated;
    });
    toast.success('餐车停靠位置与GPS已全网广播', `新停靠点：${newLocation}`);
  };

  // Reject / Cancel order flow
  const handleRejectOrder = (orderId: string, reason: string) => {
    const target = orders.find((o) => isOrderMatch(o, orderId));
    // 本地标记为商家拒单终态(而非静默移除)，与云端 watch 保持同步语义
    setOrders((prev) =>
      prev.map((o) => {
        if (isOrderMatch(o, orderId)) {
          return {
            ...o,
            status: 'merchant_rejected' as const,
            statusText: '商家已拒单 · 已退款',
            refundStatus: 'approved' as const,
            rejectionCount: (o.rejectionCount || 0) + 1,
            lastRejectionReason: reason
          };
        }
        return o;
      })
    );
    // 云端同步拒单状态
    if (target) {
      updateCloudOrderStatus(target.orderNo || target.id, {
        status: 'merchant_rejected',
        statusText: '商家已拒单 · 已退款',
        refundStatus: 'approved'
      }, 'merchant_admin');
    }
    toast.error('订单已取消退款', `订单已拒单并原路退款：${reason}`);
  };

  // Delete / Discard order flow (Omnichannel & KDS synchronized deletion)
  const handleDeleteOrder = (orderId: string, reason?: string) => {
    const target = orders.find((o) => isOrderMatch(o, orderId));
    const cleanId = orderId.replace(/^#/, '');

    // 1. 留存安全回滚快照与操作日志
    if (target) {
      merchantBackupEngine.createSnapshot(
        `删除订单 #${cleanId} 快照`,
        `删除理由: ${reason || '商家后台手动删除作废'} (原金额 ¥${target.totalAmount.toFixed(2)})`,
        orders,
        dishes
      );
      const currentDeleted = merchantBackupEngine.getDeletedOrderIds();
      if (!currentDeleted.includes(target.orderNo)) {
        merchantBackupEngine.saveDeletedOrderIds([...currentDeleted, target.orderNo]);
      }
      merchantBackupEngine.logAction(
        '全渠道订单',
        'delete',
        `作废删除订单 #${target.orderNo.replace(/^#/, '')}`,
        `操作人: 商家管理员, 原因: ${reason || '手动作废删除'}, 金额: ¥${target.totalAmount.toFixed(2)}`
      );
    }

    // 2. 本地物理移除并持久化存储
    setOrders((prev) => {
      const next = prev.filter((o) => !isOrderMatch(o, orderId));
      safeSetStorage('obsidian_truck_orders', next);
      return next;
    });

    toast.success(`订单 #${cleanId} 已从系统删除作废！`, reason ? `作废原因: ${reason}` : '已归档并生成安全快照');
  };

  // Active Filter Count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterOptions.priceRange !== 'all') count++;
    if (filterOptions.orderType !== 'all') count++;
    if (filterOptions.onlyAvailable) count++;
    if (filterOptions.hasDiscount || onlyDiscountFilter) count++;
    if (filterOptions.isChefSpecial) count++;
    return count;
  }, [filterOptions, onlyDiscountFilter]);

  // Sequential category taxonomy order for storefront display
  const ORDERED_CATEGORY_KEYS: CategoryType[] = [
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

  // Group dishes sequentially by category breakpoint for unified continuous flow
  const categorySections = useMemo(() => {
    return ORDERED_CATEGORY_KEYS.map((catKey) => {
      const catDef = CATEGORY_TAXONOMY[catKey];
      if (!catDef) return null;

      const matchingDishes = dishes.filter((dish) => {
        const isAvailableInCurrentMode = isDishAvailableInChannel(dish, diningMode);
        if (!isAvailableInCurrentMode) return false;

        // Category match
        if (catKey === 'popular') {
          if (!dish.isPopular) return false;
        } else {
          if (dish.category !== catKey) return false;
        }

        // SubCategory match (if active category matches this section and a specific subcategory is selected)
        if (
          activeCategory === catKey &&
          activeSubCategory &&
          activeSubCategory !== 'all' &&
          dish.subCategory &&
          dish.subCategory !== activeSubCategory
        ) {
          return false;
        }

        // Price Range filter
        if (filterOptions.priceRange === '0-30' && dish.price > 30) return false;
        if (filterOptions.priceRange === '30-60' && (dish.price <= 30 || dish.price > 60)) return false;
        if (filterOptions.priceRange === '60+' && dish.price <= 60) return false;

        // Order type filter
        if (filterOptions.orderType === 'delivery' && dish.orderType === 'dine_in') return false;
        if (filterOptions.orderType === 'dine_in' && dish.orderType === 'delivery') return false;

        // Availability filter
        if (filterOptions.onlyAvailable && !isAvailableInCurrentMode) return false;

        // Discount filter
        if ((filterOptions.hasDiscount || onlyDiscountFilter) && !dish.discountTag && !dish.originalPrice && !dish.prevPrice) {
          return false;
        }

        // Chef Special filter
        if (filterOptions.isChefSpecial && !dish.isChefSpecial && !dish.badgeText?.includes('招牌')) return false;

        // Search match
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = dish.name.toLowerCase().includes(q);
          const matchesEn = dish.enName.toLowerCase().includes(q);
          const matchesDesc = dish.description.toLowerCase().includes(q);
          const matchesTag = dish.typeTag.toLowerCase().includes(q) || (dish.badgeText && dish.badgeText.toLowerCase().includes(q));
          if (!matchesName && !matchesEn && !matchesDesc && !matchesTag) {
            return false;
          }
        }

        return true;
      });

      // Apply category-level sorting if requested
      const sortMode = categorySortMap[catKey] || 'DEFAULT';
      let sortedDishes = [...matchingDishes];
      if (sortMode === 'PRICE_ASC') {
        sortedDishes.sort((a, b) => a.price - b.price);
      } else if (sortMode === 'PRICE_DESC') {
        sortedDishes.sort((a, b) => b.price - a.price);
      } else if (sortMode === 'HOT') {
        sortedDishes.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
      }

      return {
        catKey,
        category: catDef,
        dishes: sortedDishes
      };
    }).filter((section): section is { catKey: CategoryType; category: typeof CATEGORY_TAXONOMY[CategoryType]; dishes: DishItem[] } =>
      section !== null && section.dishes.length > 0
    );
  }, [dishes, diningMode, activeCategory, activeSubCategory, filterOptions, searchQuery, onlyDiscountFilter, categorySortMap]);

  // Dynamic available taxonomy category keys for linked floating bar
  const availableTaxonomyKeys = useMemo(() => {
    const activeKeys = categorySections.map((s) => s.catKey);
    return activeKeys.length > 0 ? activeKeys : ORDERED_CATEGORY_KEYS;
  }, [categorySections]);

  // Aggregated dishes across all visible sequential sections
  const filteredDishes = useMemo(() => {
    return categorySections.flatMap((s) => s.dishes);
  }, [categorySections]);

  // Category counts (front-end customer menu)
  const categoryCounts = useMemo(() => {
    const availableList = dishes.filter((d) => isDishAvailableInChannel(d, diningMode));
    return {
      all: availableList.length,
      popular: availableList.filter((d) => d.isPopular).length,
      skewers: availableList.filter((d) => d.category === 'skewers').length,
      yakitori: availableList.filter((d) => d.category === 'yakitori').length,
      baked: availableList.filter((d) => d.category === 'baked').length,
      western: availableList.filter((d) => d.category === 'western').length,
      mains: availableList.filter((d) => d.category === 'mains').length,
      drinks: availableList.filter((d) => d.category === 'drinks').length,
      desserts: availableList.filter((d) => d.category === 'desserts').length,
      snacks: availableList.filter((d) => d.category === 'snacks').length
    };
  }, [dishes, diningMode]);

  // Subcategory Counts
  const subCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    dishes.forEach((d) => {
      if (isDishAvailableInChannel(d, diningMode) && d.subCategory) {
        counts[d.subCategory] = (counts[d.subCategory] || 0) + 1;
      }
    });
    return counts;
  }, [dishes, diningMode]);

  // Cart helper totals
  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const totalCartPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.calculatedPrice, 0);
  }, [cart]);

  // 行为节点上报：购物车摘要（桌台会话内才生效，actions 内部短路）
  useEffect(() => {
    const items = cart.map((item) => ({
      dishId: item.dish.id,
      dishName: item.dish.name,
      quantity: item.quantity,
      price: item.calculatedPrice
    }));
    tableSession.actions.reportCart(cart.length, totalCartPrice, items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, totalCartPrice]);

  // 实时同桌点餐协同微标：计算同桌其他用户正在看、已选加购的菜品状态联动
  const [synergyTick, setSynergyTick] = useState(0);

  useEffect(() => {
    if (diningMode !== 'dine_in' || !tableSession.activeSession) return;
    const interval = setInterval(() => setSynergyTick((t) => (t + 1) % 10000), 5000);
    return () => clearInterval(interval);
  }, [diningMode, tableSession.activeSession]);

  const companionDishInteractions = useMemo<Record<string, CompanionDishInteraction>>(() => {
    if (diningMode !== 'dine_in' || !tableSession.activeSession) {
      return {};
    }
    const myId = tableSession.myParticipant?.participantId;
    const participants = tableSession.activeSession.participants.filter(
      (p) => !p.removedAt && p.participantId !== myId
    );
    if (participants.length === 0) return {};

    const now = Date.now();
    const map: Record<string, CompanionDishInteraction> = {};

    participants.forEach((p, idx) => {
      const avatar = p.avatar || getMemberAvatar(p.participantId, idx);

      // 1. 最近查看与挑菜中 (45秒内有效)
      const lastNode = p.lastNode;
      if (lastNode?.at && (lastNode.lastClickedDishId || lastNode.lastClickedDishName)) {
        const diff = now - new Date(lastNode.at).getTime();
        if (diff >= 0 && diff < 45_000) {
          const targetDish = dishes.find(
            (d) =>
              (lastNode.lastClickedDishId && d.id === lastNode.lastClickedDishId) ||
              (lastNode.lastClickedDishName && d.name === lastNode.lastClickedDishName)
          );
          if (targetDish) {
            if (!map[targetDish.id]) {
              map[targetDish.id] = { viewers: [], cartAdders: [] };
            }
            if (!map[targetDish.id].viewers.some((v) => v.participantId === p.participantId)) {
              map[targetDish.id].viewers.push({
                participantId: p.participantId,
                displayName: p.displayName || '同桌食客',
                avatar,
                at: lastNode.at
              });
            }
          }
        }
      }

      // 2. 已加购菜品联动
      if (p.cartSummary?.items && Array.isArray(p.cartSummary.items)) {
        p.cartSummary.items.forEach((ci) => {
          if (!ci || ci.quantity <= 0) return;
          const targetDish = dishes.find(
            (d) =>
              (ci.dishId && d.id === ci.dishId) ||
              (ci.dishName && d.name === ci.dishName)
          );
          if (targetDish) {
            if (!map[targetDish.id]) {
              map[targetDish.id] = { viewers: [], cartAdders: [] };
            }
            const existingAdder = map[targetDish.id].cartAdders.find(
              (ca) => ca.participantId === p.participantId
            );
            if (existingAdder) {
              existingAdder.quantity += ci.quantity;
            } else {
              map[targetDish.id].cartAdders.push({
                participantId: p.participantId,
                displayName: p.displayName || '同桌食客',
                avatar,
                quantity: ci.quantity
              });
            }
          }
        });
      }
    });

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diningMode, tableSession.activeSession, tableSession.myParticipant, dishes, synergyTick]);

  const totalCartSavings = useMemo(() => {
    const dishSavings = cart.reduce((sum, item) => {
      const orig = item.dish.originalPrice || item.dish.prevPrice || 0;
      const base = item.dish.price;
      const diff = orig > base ? (orig - base) * item.quantity : 0;
      return sum + diff;
    }, 0);
    if (dishSavings > 0) return dishSavings;
    if (isVIPActive) return 5;
    if (cart.length > 0) return 7;
    return 0;
  }, [cart, isVIPActive]);

  // Map of dishId -> quantity in cart for quick badge
  const dishQuantitiesInCart = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach((item) => {
      map[item.dish.id] = (map[item.dish.id] || 0) + item.quantity;
    });
    return map;
  }, [cart]);

  // Aggregated cart quantities per category for delivery sidebar badges
  const categoryCartCounts = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach((item) => {
      const cat = item.dish.category;
      map[cat] = (map[cat] || 0) + item.quantity;
      if (item.dish.isPopular) {
        map.popular = (map.popular || 0) + item.quantity;
      }
    });
    return map;
  }, [cart]);

  // Selected dishes info for batch actions
  const selectedDishes = useMemo(() => {
    return dishes.filter((d) => selectedDishIds.has(d.id));
  }, [dishes, selectedDishIds]);

  const totalSelectedAmount = useMemo(() => {
    return selectedDishes.reduce((sum, d) => sum + d.price, 0);
  }, [selectedDishes]);

  const availableFilteredDishes = useMemo(() => {
    return filteredDishes.filter((d) => d.available);
  }, [filteredDishes]);

  const isAllSelected = useMemo(() => {
    if (availableFilteredDishes.length === 0) return false;
    return availableFilteredDishes.every((d) => selectedDishIds.has(d.id));
  }, [availableFilteredDishes, selectedDishIds]);

  // Multi-select handlers
  const handleToggleSelect = (dish: DishItem) => {
    if (!dish.available) {
      toast.warning('暂不可选', `${dish.name} 现已售罄或暂停供应`);
      return;
    }
    if (!isMultiSelectMode) {
      setIsMultiSelectMode(true);
    }
    setSelectedDishIds((prev) => {
      const next = new Set(prev);
      if (next.has(dish.id)) {
        next.delete(dish.id);
      } else {
        next.add(dish.id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDishIds(new Set());
      setIsMultiSelectMode(false);
      toast.info('已清空并退出自选');
    } else {
      const allIds = new Set(availableFilteredDishes.map((d) => d.id));
      setSelectedDishIds(allIds);
      setIsMultiSelectMode(true);
      toast.success('已勾选当前所有在售菜品', `共选中 ${allIds.size} 款菜品，可点击下方批量加入购物车`);
    }
  };

  const handleClearSelection = () => {
    setSelectedDishIds(new Set());
  };

  const handleExitMultiSelect = () => {
    setIsMultiSelectMode(false);
    setSelectedDishIds(new Set());
  };

  const handleBatchAddToCart = () => {
    if (selectedDishes.length === 0) return;

    selectedDishes.forEach((dish) => {
      if (dish.available) {
        handleAddToCart(dish, 1, {}, dish.price, false);
      }
    });

    toast.success('批量加购成功', `已将 ${selectedDishes.length} 件餐品加入选购单`);
    handleClearSelection();
    setActiveNavTab('cart');
  };

  // Cart operations
  const handleAddToCart = (
    dish: DishItem,
    quantity: number,
    selectedOptions: Record<string, string>,
    totalPrice: number,
    showToastAlert = true,
    selectedVariant?: DishVariant
  ) => {
    if (!dish.available) {
      toast.error('加购失败', `${dish.name} 暂时缺货`);
      return;
    }

    // 行为节点上报：菜品点击（节流 800ms，未入座时内部短路静默）
    tableSession.actions.reportDishClick(dish.id, dish.name);

    const optionKey = Object.entries(selectedOptions)
      .sort()
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    const variantKey = selectedVariant ? `var:${selectedVariant.id}` : '';
    const cartItemId = `${dish.id}-${variantKey}-${optionKey}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.cartItemId === cartItemId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        updated[existingIdx].calculatedPrice += totalPrice;
        return updated;
      } else {
        return [
          ...prev,
          {
            cartItemId,
            dish,
            quantity,
            selectedOptions,
            selectedVariant,
            calculatedPrice: totalPrice
          }
        ];
      }
    });

    if (truckExpandConfig.collapseOnAddToCart && isPullUpMenuOpen) {
      setIsPullUpMenuOpen(false);
    }
    if (showToastAlert) {
      const variantTitle = selectedVariant ? ` (${selectedVariant.name})` : '';
      toast.success('已加入选购单', `${dish.name}${variantTitle} x${quantity} (¥${totalPrice.toFixed(2)})`);
    }

    // 全程监听食客加购行为
    userJourneyTracker.trackAction(
      'add_to_cart',
      `加购餐品: ${dish.name} x${quantity} (¥${totalPrice.toFixed(2)})`,
      { dishId: dish.id, dishName: dish.name, quantity, price: totalPrice, diningMode },
      'cart_active'
    );
  };

  // -------------------------------------------------------------
  // Real Usable QR Code Engine Execution (单点/直接支付/组合扫码加购与直达支付)
  // -------------------------------------------------------------
  const executeQrAction = useCallback(
    (payload: QrActionPayload) => {
      if (!payload) return;

      if (payload.type === 'single') {
        const dish = dishes.find((d) => d.id === payload.dishId);
        if (!dish) {
          toast.error('未找到对应菜品', `菜品 ID: ${payload.dishId} 暂未在当前菜单中发现`);
          return;
        }

        const variant = payload.variantId
          ? dish.variants?.find((v) => v.id === payload.variantId)
          : undefined;

        const unitPrice = variant ? variant.price : dish.price;
        const qty = payload.qty || 1;
        const options = payload.options || {};
        const totalPrice = unitPrice * qty;

        handleAddToCart(dish, qty, options, totalPrice, false, variant);

        if (payload.action === 'quick_pay') {
          setActiveNavTab('checkout');
          setIsCartOpen(false);
          setIsPullUpMenuOpen(false);
          const varText = variant ? ` (${variant.name})` : '';
          toast.success(
            '扫码直达收银台',
            `已为您将【${dish.name}${varText}】加入收银台，请核对并支付`
          );
          playScannerBeep('beep_order');
        } else {
          setActiveNavTab('cart');
          const varText = variant ? ` (${variant.name})` : '';
          toast.success(
            '扫码加购成功',
            `已自动将【${dish.name}${varText} x${qty}】加入选购单`
          );
          playScannerBeep('beep_cart');
        }
      } else if (payload.type === 'combo') {
        let addedCount = 0;
        payload.items.forEach((item) => {
          const dish = dishes.find((d) => d.id === item.dishId);
          if (dish) {
            const variant = item.variantId
              ? dish.variants?.find((v) => v.id === item.variantId)
              : undefined;
            const unitPrice = variant ? variant.price : item.price || dish.price;
            const qty = item.qty || 1;
            const options = item.selectedOptions || {};
            handleAddToCart(dish, qty, options, unitPrice * qty, false, variant);
            addedCount++;
          }
        });

        if (payload.action === 'combo_pay') {
          setActiveNavTab('checkout');
          setIsCartOpen(false);
          setIsPullUpMenuOpen(false);
          toast.success(
            '扫码套餐直达支付',
            `【${payload.comboName}】(共 ${addedCount} 样餐品) 已自动装入收银台，请核对并完成支付`
          );
          playScannerBeep('beep_order');
        } else {
          setActiveNavTab('cart');
          toast.success(
            '扫码套餐加购成功',
            `【${payload.comboName}】(共 ${addedCount} 样餐品) 已自动加入选购单`
          );
          playScannerBeep('beep_cart');
        }
      } else if (payload.type === 'coupon') {
        // 优惠券扫码直领与风控校验
        const claimRes = claimCouponByCode(payload.couponCode, { currentTruckId: truck.id });
        if (claimRes.success) {
          playScannerBeep('beep_coupon');
          toast.success(
            '优惠券领取成功',
            claimRes.message
          );
          userJourneyTracker.trackAction(
            'claim_coupon_qr',
            `扫码领取优惠券: ${payload.couponCode}`,
            { couponCode: payload.couponCode, truckId: truck.id },
            'cart_active'
          );
        } else {
          playScannerBeep('beep_error');
          toast.warning('优惠券领取提示', claimRes.message);
        }
      } else if (payload.type === 'table') {
        // 桌台扫码接入
        setDiningMode('dine_in');
        playScannerBeep('beep_table');
        toast.info(
          '识别就餐桌位二维码',
          `桌号: ${payload.tableCode} · 正在接入点餐台...`
        );
        if (tableSession.ready) {
          tableSession.actions.scan(payload.tableCode, payload.token, payload.shortCode);
        }
      } else if (payload.type === 'pickup') {
        // 订单取餐码核销识别
        playScannerBeep('beep_order');
        toast.success(
          '扫码识别取餐码',
          `提货取餐码: ${payload.pickupCode} · 已完成核验`
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dishes, truck.id, tableSession]
  );

  // 1. 挂载时检测 URL 搜索参数（真实手机相机扫码打开 / 浏览器访问）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = window.location.search;
    const pathname = window.location.pathname;
    if (!search && !pathname.includes('/t/')) return;
    if (!search.includes('action=') && !search.includes('table=') && !search.includes('coupon=') && !search.includes('dishId=') && !search.includes('combo=') && !pathname.includes('/t/')) return;

    const payload = parseQrScanResult(window.location.href);
    if (payload) {
      if (payload.type === 'table') {
        setDiningMode('dine_in');
      }
      // 避免页面刷新重复加购或领券，在非桌台模式下清理 URL 参数
      if (payload.type !== 'table') {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      setTimeout(() => {
        executeQrAction(payload);
      }, 400);
    }
  }, [executeQrAction]);

  // 2. 监听站内扫码枪/扫码摄像头/仿真调试事件
  useEffect(() => {
    const handleCustomQrAction = (e: Event) => {
      const customEvent = e as CustomEvent<QrActionPayload>;
      if (customEvent.detail) {
        executeQrAction(customEvent.detail);
      }
    };
    window.addEventListener('URBAN_RADAR_QR_ACTION', handleCustomQrAction);
    return () => {
      window.removeEventListener('URBAN_RADAR_QR_ACTION', handleCustomQrAction);
    };
  }, [executeQrAction]);

  const handleQuickAdd = (dish: DishItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dish.available) {
      toast.warning('暂不可选', `${dish.name} 已售罄或暂时无法供应`);
      return;
    }

    // If has required options or variants, open modal for customization
    if ((dish.optionGroups && dish.optionGroups.length > 0) || (dish.variants && dish.variants.length > 0)) {
      setSelectedDishForDetail(dish);
      return;
    }

    handleAddToCart(dish, 1, {}, dish.price, true);
    if (truckExpandConfig.collapseOnAddToCart && isPullUpMenuOpen) {
      setIsPullUpMenuOpen(false);
    }
  };

  const handleUpdateCartQuantity = (cartItemId: string, newQty: number) => {
    userJourneyTracker.trackAction(
      'modify_cart_qty',
      `修改选购项数量为: ${newQty}`,
      { cartItemId, newQty },
      'cart_active'
    );
    if (newQty <= 0) {
      setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
      toast.info('已移除餐品');
    } else {
      setCart((prev) =>
        prev.map((item) => {
          if (item.cartItemId === cartItemId) {
            const unitPrice = item.calculatedPrice / item.quantity;
            return {
              ...item,
              quantity: newQty,
              calculatedPrice: unitPrice * newQty
            };
          }
          return item;
        })
      );
    }
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
    toast.info('已从选购单移除');
  };

  const handleClearCart = () => {
    userJourneyTracker.trackAction('clear_cart', '主动清空选购单', {}, 'cart_active');
    setCart([]);
    toast.info('选购单已清空');
  };

  const handleCheckout = (
    notes: string,
    couponCode?: string,
    paymentMethod?: string,
    paymentVoucher?: PaymentVoucher
  ): string | void => {
    // 检查当前餐车及对应就餐方式的营业状态
    const activeTruckStatus = getTruckBusinessStatus(truck.id || 'truck-01');
    if (!activeTruckStatus.isOpen) {
      toast.error('当前餐车站台已打烊歇业', `${activeTruckStatus.closeReason || '暂停接单中'}，预计恢复接单时间：${activeTruckStatus.reopenTime}`);
      return;
    }
    if (diningMode === 'dine_in' && activeTruckStatus.dineInOpen === false) {
      toast.error('当前餐车暂停堂食就餐', '该餐车暂未开放堂食就座点单，请在商家后台开启堂食或切换到车自提/外卖配送');
      return;
    }
    if (diningMode === 'delivery' && activeTruckStatus.deliveryOpen === false) {
      toast.error('当前餐车暂停外卖配送', '该餐车暂未开放外卖专送，请在商家后台开启外卖或切换到车自提/堂食');
      return;
    }
    if (diningMode === 'pickup' && activeTruckStatus.pickupOpen === false) {
      toast.error('当前餐车暂停到车自提', '该餐车暂未开放到车自提预订，请在商家后台开启自提或切换外卖/堂食');
      return;
    }

    // T3 授权判定下沉数据层：桌台会话内无下单权限 → 阻断并引导申请加入
    if (diningMode === 'dine_in' && !tableSession.actions.canOrder()) {
      toast.error('暂不能下单', '你需要先加入本桌点餐并获得授权');
      setMembersPanelOpen(true);
      return;
    }
    const userUidSuffix = userProfile.uid.slice(-4);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const isDineIn = diningMode === 'dine_in';
    const isPickup = diningMode === 'pickup';
    const newOrderNo = paymentVoucher?.orderNo || (isDineIn
      ? `UR-DIN-${randomSuffix}`
      : isPickup
      ? `UR-PK-${randomSuffix}`
      : `UR-${randomSuffix}`);

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    // FIX(审计P0): 结算优惠券必须从用户券包真实解析抵扣金额并核销，
    // 取代原先写死 `(couponCode || isVIPActive) ? 5 : 0` 的假实现。
    const itemCategories = cart.map((i) => i.dish.category as string);
    const deliveryFee0 = diningMode === 'delivery' ? (totalCartPrice >= 80 ? 0 : 5) : 0;
    const resolvedCoupon = resolveCouponByCode(couponCode, {
      subtotal: totalCartPrice,
      deliveryFee: deliveryFee0,
      diningMode,
      itemCategories
    });
    let couponSaving = 0;
    let appliedCouponCode: string | undefined;
    if (resolvedCoupon?.record && resolvedCoupon.eligibility.usable) {
      couponSaving = resolvedCoupon.eligibility.maxDiscount;
      appliedCouponCode = resolvedCoupon.record.coupon.code;
    } else if (resolvedCoupon?.record) {
      appliedCouponCode = couponCode;
    }
    const discount = couponSaving > 0 ? couponSaving : appliedCouponCode ? 0 : isVIPActive ? 5 : 0;
    const deliveryFee = diningMode === 'delivery' ? (totalCartPrice >= 80 ? 0 : 5) : 0;
    const finalAmount = Math.max(0, totalCartPrice + deliveryFee - discount);

    const boundTbl = isDineIn ? getCurrentBoundTable() : null;
    const finalDeliveryAddress = isDineIn
      ? `${boundTbl?.zoneLabel || '餐车外摆区'} · ${boundTbl?.code || 'A2'} 号桌 (${boundTbl?.guests || 2}人就餐)`
      : isPickup
      ? '黑曜石流动餐车 01 号（大悦城北座中庭 · 自提专窗）'
      : deliveryAddress;

    const activeTruckSnapshotConfig = getActiveTruckConfig();
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNo: newOrderNo,
      userId: userProfile.uid,
      userPhone: userProfile.phone,
      customerName: userProfile.nickname || '先锋食客',
      truckId: activeTruckSnapshotConfig.id || truck.id || 'truck-01',
      truckName: truck.name,
      truckLocation: activeTruckSnapshotConfig.locationName,
      truckLocationSnapshot: {
        truckId: activeTruckSnapshotConfig.id || truck.id || 'truck-01',
        truckName: truck.name,
        latitude: activeTruckSnapshotConfig.latitude,
        longitude: activeTruckSnapshotConfig.longitude,
        locationName: activeTruckSnapshotConfig.locationName,
        deliveryRadiusKm: activeTruckSnapshotConfig.deliveryRadiusKm,
        snapshotAt: new Date().toISOString()
      },
      channelType: diningMode,
      channel: diningMode,
      tableCode: boundTbl?.code || (isDineIn ? 'A2' : undefined),
      tableId: boundTbl?.id || (isDineIn ? 'tbl-2' : undefined),
      tableZone: boundTbl?.zoneLabel || (isDineIn ? '餐车外摆休闲区' : undefined),
      serverName: boundTbl?.serverName || (isDineIn ? '阿豪 (No.02)' : undefined),
      items: cart.map((i) => ({
        name: i.dish.name,
        quantity: i.quantity,
        price: i.calculatedPrice / i.quantity,
        options: Object.values(i.selectedOptions).join(', ')
      })),
      totalAmount: finalAmount,
      paymentMethod: paymentMethod || 'wechat',
      paymentVoucher: paymentVoucher,
      status: 'cooking',
      statusText: isDineIn
        ? '后厨现制出餐中 (堂食)'
        : isVIPActive
        ? 'VIP 优先现制中'
        : '餐车现制中',
      createdTime: timeStr,
      estimatedDeliveryTime: isDineIn ? '约 8-10 分钟传菜上桌' : '约 12 分钟后',
      etaMinutes: isDineIn ? 8 : 12,
      courierName: isDineIn ? undefined : '黑曜石专线急速送餐员 (专线 01)',
      courierPhone: isDineIn ? undefined : '138-1829-9201',
      deliveryAddress: finalDeliveryAddress,
      progressPercent: 30
    };

    // 如果是堂食模式，将订单和菜品深度绑定到商家端对应桌台
    if (isDineIn) {
      bindOrderToMerchantTable(
        boundTbl?.code || 'A2',
        newOrderNo,
        cart.map((i) => ({
          name: i.dish.name,
          quantity: i.quantity,
          price: i.calculatedPrice / i.quantity
        })),
        finalAmount,
        boundTbl?.guests || 2
      );
      // 绑定桌台后推送云端桌台集合，保障跨设备商家端可见 (防抖在商家端已有; 此处直接同步一次)
      syncSingleModuleToCloud('tables').catch(() => {});
    }

    setOrders((prev) => [newOrder, ...prev]);
    setActiveTrackingOrderId(newOrder.id);
    createCloudOrder(newOrder, userProfile.uid);
    setCart([]);

    // 自动化打印流水线：客户在线支付成功后，即时驱动绑定的打印机出纸
    dispatchAutoPrintForPaidOrder(newOrder).catch((err) => {
      console.warn('自动化打印流水线调度捕获异常:', err);
    });

    // FIX(审计P0): 真实券结算后核销该券（标记已使用 + 绑定订单号）
    if (appliedCouponCode && couponSaving > 0) {
      markCouponUsed(appliedCouponCode, newOrderNo);
      userJourneyTracker.trackAction(
        'apply_coupon',
        `结算成功核销优惠券 [${appliedCouponCode}] (立减 ¥${couponSaving.toFixed(2)})`,
        { code: appliedCouponCode, saving: couponSaving, orderNo: newOrderNo },
        'completed'
      );
    }

    // 自动接入特许加盟分账清算引擎 (Phase 4 自动化 D+1 细账归集)
    try {
      const tenantCtx = globalFranchiseEngine.getContext();
      const targetFranId = tenantCtx.isHqUser ? 'FRAN-SH-001' : tenantCtx.currentFranchiseeId;
      globalFranchiseSplitEngine.recordOrderSplit(newOrder, targetFranId, tenantCtx.currentTruckId);
    } catch {
      // 容灾静默降级
    }

    // 全程监听：记录订单成功提交节点
    userJourneyTracker.trackAction(
      'submit_order',
      `成功提交并支付订单: ${newOrderNo} (¥${finalAmount.toFixed(2)})`,
      { orderNo: newOrderNo, amount: finalAmount, channel: diningMode, itemsCount: newOrder.items.length },
      'completed'
    );
    userJourneyTracker.markOrderSuccess(newOrderNo, finalAmount);

    toast.success(
      isDineIn ? '堂食订单已成功提交！' : '订单已成功提交并同步至腾讯云！',
      isDineIn
        ? `订单号 ${newOrderNo} · 已绑定 ${boundTbl?.code || 'A2'} 号桌，后厨火速现制中`
        : `订单号 ${newOrderNo} (UID: ${userProfile.uid.slice(-6)})，餐车正在火速为您现制`
    );
    return newOrderNo;
  };

  const isManualScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCategorySelect = (cat: CategoryType) => {
    setActiveCategory(cat);
    setActiveSubCategory('all');
    setOnlyDiscountFilter(false);
    setCategoryScrollProgress(0);
    setHighlightedCategorySection(cat);

    // 监听分类切换
    userJourneyTracker.trackAction(
      'select_category',
      `切换并浏览品类: ${CATEGORY_TAXONOMY[cat]?.name || cat}`,
      { category: cat },
      'browsing'
    );

    if (soundFeedbackEnabled) {
      playCategorySnapSound();
    }

    // Set lock flag so scrollspy doesn't override during smooth scroll animation
    isManualScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isManualScrollingRef.current = false;
      setHighlightedCategorySection(null);
    }, 1100);

    // Smooth scroll to target category section breakpoint
    const sectionEl = document.getElementById(`category-section-${cat}`);
    if (sectionEl) {
      const scrollContainer = mainScrollContainerRef.current;
      if (scrollContainer) {
        const containerTop = scrollContainer.getBoundingClientRect().top;
        const elementTop = sectionEl.getBoundingClientRect().top;
        const currentScroll = scrollContainer.scrollTop;
        const stickyOffset = 6;
        const targetScroll = currentScroll + (elementTop - containerTop) - stickyOffset;
        scrollContainer.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        });
      } else {
        const headerEl = document.getElementById('main-unified-header');
        const headerHeight = headerEl ? headerEl.offsetHeight : 52;
        const stickyOffset = headerHeight + 14;
        const elementPosition = sectionEl.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = Math.max(0, elementPosition - stickyOffset);

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }

    // Trigger Category Brand Popup if conditions are met
    if (cat !== 'all' && cat !== 'popular') {
      const brandConfigs = getCategoryBrandConfigs();
      const cfg = brandConfigs[cat];
      if (cfg && shouldShowCategoryBrandModal(cat, cfg)) {
        setActiveCategoryBrandModal(cfg);
        recordCategoryBrandModalSeen(cat);
      }
    }
  };

  // 菜品穿透锚点定位器 (Dish Penetration Anchor Locator)
  const scrollToDish = (dishId: string) => {
    const targetDish = dishes.find((d) => d.id === dishId);
    if (!targetDish) return;

    // 若当前品类筛选排除了该菜品，重置为主列表视图
    if (activeCategory !== 'all' && activeCategory !== targetDish.category) {
      setActiveCategory('all');
    }
    // 清除顶层搜索词以确保完整菜品流呈现在文档流中
    if (searchQuery) {
      setSearchQuery('');
    }

    // 锁定手动滚动标记，避免 ScrollSpy 在平滑动画中误报
    isManualScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isManualScrollingRef.current = false;
    }, 1300);

    setTimeout(() => {
      const dishEl = document.getElementById(`dish-item-${dishId}`);
      if (dishEl) {
        const scrollContainer = mainScrollContainerRef.current;
        if (scrollContainer) {
          const containerTop = scrollContainer.getBoundingClientRect().top;
          const elementTop = dishEl.getBoundingClientRect().top;
          const currentScroll = scrollContainer.scrollTop;
          const stickyOffset = 70;
          const targetScroll = currentScroll + (elementTop - containerTop) - stickyOffset;
          scrollContainer.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
          });
        } else {
          dishEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // 激活聚光脉冲穿透高亮动画
        dishEl.classList.remove('dish-anchor-highlight');
        void dishEl.offsetWidth; // 触发 DOM 重绘
        dishEl.classList.add('dish-anchor-highlight');
        setTimeout(() => {
          dishEl.classList.remove('dish-anchor-highlight');
        }, 2400);

        toast.success('穿透锚定成功', `已精准定位至「${targetDish.name}」`);
      } else {
        const sectionEl = document.getElementById(`category-section-${targetDish.category}`);
        if (sectionEl) {
          sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 100);
  };

  const scrollEndTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastInfoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 联动滚动监听器 (ScrollSpy) — 菜品卡片滚动时实时联动侧边栏与微触感反馈机制
  useEffect(() => {
    if (activeNavTab !== 'home') return;

    let ticking = false;
    const scrollContainer = mainScrollContainerRef.current;

    const handleWindowScrollSpy = () => {
      if (isManualScrollingRef.current) return;

      setIsScrollingDishes(true);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = setTimeout(() => {
        setIsScrollingDishes(false);
      }, 250);

      if (!ticking) {
        window.requestAnimationFrame(() => {
          ticking = false;
          if (isManualScrollingRef.current) return;

          const sectionElements = document.querySelectorAll<HTMLElement>('[data-category-section]');
          if (sectionElements.length === 0) return;

          // 计算断点激活线：当在独立滚动主容器中时，以容器顶部+35px为判定线
          const containerRect = scrollContainer?.getBoundingClientRect();
          const headerEl = document.getElementById('main-unified-header');
          const headerRect = headerEl?.getBoundingClientRect();
          const activationThreshold = containerRect
            ? containerRect.top + 35
            : (headerRect ? headerRect.bottom + 25 : 77);

          // 页面触底检测：当到达底部附近时，自动高亮最后一个在售品类（如酥脆小食）
          const isNearBottom = scrollContainer
            ? scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 60
            : window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;

          if (isNearBottom) {
            const lastSection = sectionElements[sectionElements.length - 1];
            const lastCat = lastSection?.getAttribute('data-category-section') as CategoryType;
            if (lastCat) {
              if (lastCat !== activeCategory) {
                setActiveCategory(lastCat);
                if (soundFeedbackEnabled) {
                  const idx = ORDERED_CATEGORY_KEYS.indexOf(lastCat);
                  playCategoryLinkSound(idx >= 0 ? idx : 0);
                }
              }
              setCategoryScrollProgress(1);
            }
            return;
          }

          let activeSectionId: CategoryType | null = null;
          let currentSectionProgress = 0;

          // 遍历各个分类断点，找到视口激活线下方/交汇的最优断点，并计算该分类内部的滚动进度
          sectionElements.forEach((el) => {
            const sectionCat = el.getAttribute('data-category-section') as CategoryType;
            const rect = el.getBoundingClientRect();
            // 只要断点的 top 小于等于激活线，说明已经滚动进入此分类
            if (rect.top <= activationThreshold) {
              activeSectionId = sectionCat;
              const sectionHeight = Math.max(rect.height, 1);
              const scrolledPast = activationThreshold - rect.top;
              currentSectionProgress = Math.max(0, Math.min(1, scrolledPast / sectionHeight));
            }
          });

          // 若尚未滚入第一分类或者位于页面顶部区域，默认高亮第一个展示分类
          if (!activeSectionId && sectionElements.length > 0) {
            const firstCat = sectionElements[0].getAttribute('data-category-section') as CategoryType;
            if (firstCat) {
              activeSectionId = firstCat;
              currentSectionProgress = 0;
            }
          }

          if (activeSectionId) {
            setCategoryScrollProgress(Number(currentSectionProgress.toFixed(2)));

            if (activeSectionId !== activeCategory) {
              setActiveCategory(activeSectionId);

              // 触发品类切换反馈 (微触感音效 + 联动提示 HUD)
              if (soundFeedbackEnabled) {
                const idx = ORDERED_CATEGORY_KEYS.indexOf(activeSectionId);
                playCategoryLinkSound(idx >= 0 ? idx : 0);
              }

              const cfg = CATEGORY_TAXONOMY[activeSectionId];
              if (cfg) {
                const count = categoryCounts[activeSectionId] || 0;
                setLinkageToastInfo({
                  catName: cfg.name,
                  icon: cfg.icon || '🍽️',
                  count
                });
                if (toastInfoTimeoutRef.current) clearTimeout(toastInfoTimeoutRef.current);
                toastInfoTimeoutRef.current = setTimeout(() => {
                  setLinkageToastInfo(null);
                }, 1300);
              }
            }
          }
        });
        ticking = true;
      }
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleWindowScrollSpy, { passive: true });
    }
    window.addEventListener('scroll', handleWindowScrollSpy, { passive: true });
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleWindowScrollSpy);
      }
      window.removeEventListener('scroll', handleWindowScrollSpy);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
      if (toastInfoTimeoutRef.current) clearTimeout(toastInfoTimeoutRef.current);
    };
  }, [activeNavTab, activeCategory, soundFeedbackEnabled, categoryCounts]);

  const handleScrollToMenu = () => {
    if (menuSectionRef.current) {
      menuSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavSelect = (tab: NavTabType) => {
    if (tab === 'home') {
      setNavHistory(['home']);
      setActiveNavTab('home');
      if (mainScrollContainerRef.current) {
        mainScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'order_messages') {
      setSynergyInitialRoomMode(undefined);
      setSynergySubViewMode('session_list');
      navigateTo('order_messages');
    } else {
      navigateTo(tab);
    }
    if (tab !== 'home' && truckExpandConfig.collapseOnNavigate && isPullUpMenuOpen) {
      setIsPullUpMenuOpen(false);
    }
  };

  const isFullScreenView =
    activeNavTab === 'tracking' ||
    activeNavTab === 'orders' ||
    activeNavTab === 'profile' ||
    activeNavTab === 'trucks' ||
    activeNavTab === 'order_messages';

  // ============ 客食端预览：根层分栏（v3）· 生效判定链 ============
  const [isDesktopDevice, setIsDesktopDevice] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(DESKTOP_MEDIA_QUERY).matches
      : false
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsDesktopDevice(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  const wsPrefsLive = useSyncExternalStore(subscribeWorkspacePrefs, getWorkspacePrefsSnapshot);
  const previewRole: PreviewRoleId | null =
    currentRole === 'merchant' || currentRole === 'rider' || currentRole === 'platform' ? currentRole : null;
  const previewFeatureOn = isDesktopDevice && previewRole !== null && wsPrefsLive.previewControl.masterEnabled && wsPrefsLive.previewControl.ends[previewRole];
  const previewColumnOpen = previewFeatureOn && previewRole !== null && wsPrefsLive.previewPanelOpen[previewRole];
  // embed 预览轻量模式：暂停 CSS 装饰动画（html[data-embed-lite] 规则）
  useEffect(() => {
    if (IS_EMBED_CUSTOMER) {
      document.documentElement.dataset.embedLite = '1';
    } else {
      delete document.documentElement.dataset.embedLite;
    }
  }, []);

  const togglePreviewPanel = (open: boolean) => {
    if (previewRole) mergeLocalPrefs({ previewPanelOpen: { [previewRole]: open } as Partial<Record<PreviewRoleId, boolean>> });
  };

  // 手机端全屏横向滑动手势切换核心导航按钮 (点餐 / 专送 / 消息 / 餐车 / 工单 / 我的)
  const isAnyCustomerModalOpen = Boolean(
    selectedDishForDetail ||
    isCartOpen ||
    isVIPModalOpen ||
    isAddressModalOpen ||
    isCloudbaseModalOpen ||
    isMessageFormModalOpen ||
    isTableBindModalOpen ||
    isFilterModalOpen ||
    isDeliveryRangeModalOpen ||
    isPullUpMenuOpen ||
    activeCategoryBrandModal
  );

  const {
    feedback: swipeFeedback,
    touchHandlers: swipeTouchHandlers,
    mouseHandlers: swipeMouseHandlers
  } = useMobileSwipeNav({
    activeTab: activeNavTab,
    onSelectTab: handleNavSelect,
    disabled: currentRole !== 'customer' || isAnyCustomerModalOpen
  });

  return (
    <MotionConfig reducedMotion={IS_EMBED_CUSTOMER ? 'always' : 'never'}>
      {/* 统一路由登录门：需要核验身份时全屏接管（商户端 / 骑手端共用，保持 Hook 计数始终稳定） */}
      {authGateRole ? (
        <AuthGateView
          role={authGateRole}
          onSwitchRole={(next) => {
            setAuthGateRole(next);
            setTargetAuthRole(next);
          }}
          onSuccess={(session, role) => {
            handleStaffRiderAuthSuccess(session, role);
          }}
          onCancel={() => {
            setAuthGateRole(null);
            setCurrentRole('customer');
            switchTier('CUSTOMER');
            persistUserRole('customer');
            syncRouteToBrowser({ role: 'customer', tab: 'home' });
            toast.info('已切回前台顾客点餐');
          }}
        />
      ) : (
        <div className="h-screen w-full flex overflow-hidden">
      <div className="flex-1 min-w-0 h-full">
        <>
      {/* 1. 商家端工作台 (Keep-Alive 保活容器，状态、横向导航与滚动位置完全持久化) */}
      {mountedRoles.merchant && (
        <div
          id="role-container-merchant"
          className={`w-full min-h-screen ${currentRole === 'merchant' ? 'block' : 'hidden'}`}
          style={{ display: currentRole === 'merchant' ? 'block' : 'none' }}
        >
          <Suspense fallback={RoleViewFallback}>
            <MerchantSystemView
              dishes={dishes}
              orders={orders}
              truck={truck}
              initialTab={merchantActiveTab as any}
              activeTabControlled={merchantActiveTab as any}
              onTabChange={(tab) => {
                setMerchantActiveTab(tab);
                safeSetStorage('obsidian_merchant_active_tab', tab);
                syncRouteToBrowser({ role: 'merchant', merchantTab: tab });
              }}
              isRoleActive={currentRole === 'merchant'}
              merchantSession={merchantSession}
              onOpenPhoneAuth={() => {
                setTargetAuthRole('merchant');
                setAuthGateRole('merchant');
              }}
              onLogoutMerchant={() => {
                logoutMerchant();
                setMerchantSession(null);
                setCurrentRole('customer');
                switchTier('CUSTOMER');
                persistUserRole('customer');
                syncRouteToBrowser({ role: 'customer', tab: 'home' });
                toast.info('已退出商家工作台，切回前台顾客点餐');
              }}
              onUpdateDishes={setDishes}
              onAdvanceOrderStatus={handleAdvanceOrderStatus}
              onRejectOrder={handleRejectOrder}
              onDeleteOrder={handleDeleteOrder}
              onUpdateTruckLocation={handleUpdateTruckLocation}
              onSwitchRole={handleSelectRole}
              onAuditRefund={handleAuditRefund}
              onSyncOrderItems={handleSyncTableOrderItems}
              onToggleNonRefundable={handleToggleNonRefundable}
            />
          </Suspense>
        </div>
      )}

      {/* 2. 骑士配送专送工作台 (Keep-Alive 保活容器) */}
      {mountedRoles.rider && (
        <div
          id="role-container-rider"
          className={`w-full min-h-screen ${currentRole === 'rider' ? 'block' : 'hidden'}`}
          style={{ display: currentRole === 'rider' ? 'block' : 'none' }}
        >
          <Suspense fallback={RoleViewFallback}>
            <RiderSystemView
              orders={orders}
              truck={truck}
              riderSession={riderSession}
              onOpenPhoneAuth={() => {
                setTargetAuthRole('rider');
                setAuthGateRole('rider');
              }}
              onLogoutRider={() => {
                logoutRider();
                setRiderSession(null);
                setCurrentRole('customer');
                switchTier('CUSTOMER');
                persistUserRole('customer');
                syncRouteToBrowser({ role: 'customer', tab: 'home' });
                toast.info('已退出骑士专送工作台，切回前台顾客点餐');
              }}
              onAdvanceOrderStatus={handleAdvanceOrderStatus}
              onUpdateTruckLocation={handleUpdateTruckLocation}
              onSwitchRole={handleSelectRole}
            />
          </Suspense>
        </div>
      )}

      {/* 3. 平台端总控工作台 (Keep-Alive 保活容器) */}
      {mountedRoles.platform && (
        <div
          id="role-container-platform"
          className={`min-h-screen bg-[#f9f9f7] text-[#1a1c1b] flex flex-col antialiased ${currentRole === 'platform' ? 'flex' : 'hidden'}`}
          style={{ display: currentRole === 'platform' ? 'flex' : 'none' }}
        >
          <Header
            cartCount={totalCartCount}
            onOpenCart={() => navigateTo('cart')}
            onOpenRadar={() => navigateTo('tracking')}
            onOpenVIP={() => setIsVIPModalOpen(true)}
            isVIPActive={isVIPActive}
            diningMode={diningMode}
            onDiningModeChange={handleDiningModeChange}
            deliveryAddress={deliveryAddress}
            onChangeAddress={() => setIsAddressModalOpen(true)}
            currentRole={currentRole}
            onSelectRole={handleSelectRole}
            onOpenAuthGate={(role) => setAuthGateRole(role)}
            pendingOrdersCount={orders.filter((o) => o.status === 'cooking').length}
            activeNavTab={activeNavTab}
            previousNavTab={previousNavTab}
            onBackToMenu={handleBackNav}
            onOpenCloudbaseModal={() => setIsCloudbaseModalOpen(true)}
            onOpenMessageForm={() => setIsMessageFormModalOpen(true)}
            unreadMessagesCount={totalUnreadMessages}
            isCloudbaseConnected={isCloudbaseConnected}
            deliveryEvaluation={deliveryEvaluation}
            currentTable={
              tableSession.activeSession?.tableCode
                ? `${tableSession.activeSession.tableCode} 号桌`
                : getCurrentBoundTable()?.code
                ? `${getCurrentBoundTable()!.code} 号桌`
                : 'A-08 桌'
            }
            onSwitchTable={() => setIsTableBindModalOpen(true)}
            truckSpotName="黑曜石01车 · 北座中庭"
            onOpenPickupDetail={() => setIsDeliveryRangeModalOpen(true)}
          />
          <main className="w-full px-2 sm:px-4 lg:px-6 py-2 flex-grow">
            <Suspense fallback={RoleViewFallback}>
              <PlatformSystemView
                orders={orders}
                onSelectRole={handleSelectRole}
                showToast={(msg) => toast.info(msg)}
              />
            </Suspense>
          </main>
        </div>
      )}

      {/* 4. 顾客端前台点餐体验区 (Keep-Alive 保活容器) */}
      <div
        id="role-container-customer"
        className={`w-full h-full ${currentRole === 'customer' ? 'block' : 'hidden'}`}
        style={{ display: currentRole === 'customer' ? 'block' : 'none' }}
      >
        {/* ⛔ 分辨率锁定 RESOLUTION LOCK（产品负责人 2026-09-16 指定）：
            客食端在电脑端统一装入 iPhone 15 Pro Max 手机壳视口（逻辑 430×932 CSS px）。
            尺寸唯一权威来源 src/constants/deviceViewport.ts —— 任何 AI/开发者修复
            其他问题时禁止改动分辨率；确需变更必须获产品负责人明确授权。 */}
        <CustomerPhoneFrame>
        <div 
          className="absolute inset-0 w-full text-[#121212] flex flex-col bg-white selection:bg-black selection:text-white font-sans antialiased overflow-hidden"
        >
          {/* 手机端横向滑动快速切换按钮浮动反馈 HUD */}
          <SwipeGestureIndicator feedback={swipeFeedback} />

          {/* Full-Screen Container matching requested layout */}
          <div className="w-full h-full bg-white flex flex-col relative overflow-hidden">
        {/* T3 桌台门禁：仅在存在 URL 扫码参数且未入座、且未打开选座开台弹窗时显示，彻底杜绝双组件同时打开冲突 */}
        {hasScanParams && diningMode === 'dine_in' && tableSession.ready && !tableSession.activeSession && !isTableBindModalOpen && (
          <div className="absolute inset-0 z-[70] overflow-y-auto bg-page-bg">
            <TableScanLanding
              tableCode={scanParams.table}
              token={scanParams.token}
              shortCode={scanParams.shortCode}
              onEntered={() => {
                /* 入座判定由 activeSession 事件驱动，无需手动解除门禁 */
              }}
              onClose={() => {
                setDiningMode('delivery');
                toast.info('已退出扫码点餐', '已切换回外卖专送模式');
              }}
              onOpenMatrix={() => {
                setIsTableBindModalOpen(true);
              }}
              showToast={(msg) => toast.info(msg)}
            />
          </div>
        )}

        {/* T3 同桌成员管理面板 */}
        <TableMembersPanel
          open={membersPanelOpen && !!tableSession.activeSession}
          onClose={() => setMembersPanelOpen(false)}
          showToast={(msg) => toast.info(msg)}
        />

        {/* Top Header with Dynamic Dining Mode Selector, Role Switcher Dropdown (仅在点单等主界面显示，全屏界面由各界面专属标题栏承载) */}
        {!isFullScreenView && activeNavTab !== 'checkout' && (
          <div className="shrink-0 w-full z-40">
            <Header
              cartCount={totalCartCount}
              onOpenCart={() => navigateTo('cart')}
              onOpenRadar={() => navigateTo('tracking')}
              onOpenVIP={() => navigateTo('profile')}
              isVIPActive={isVIPActive}
              diningMode={diningMode}
              onDiningModeChange={handleDiningModeChange}
              deliveryAddress={deliveryAddress}
              onChangeAddress={() => setIsAddressModalOpen(true)}
              currentRole={currentRole}
              onSelectRole={handleSelectRole}
              onOpenAuthGate={(role) => setAuthGateRole(role)}
              pendingOrdersCount={orders.filter((o) => o.status === 'cooking').length}
              activeNavTab={activeNavTab}
              previousNavTab={previousNavTab}
              onBackToMenu={handleBackNav}
              onOpenCloudbaseModal={() => setIsCloudbaseModalOpen(true)}
              onOpenMessageForm={() => {
                setSynergyInitialRoomMode(undefined);
                setSynergySubViewMode('session_list');
                navigateTo('order_messages');
              }}
              unreadMessagesCount={totalUnreadMessages}
              isCloudbaseConnected={isCloudbaseConnected}
              deliveryEvaluation={deliveryEvaluation}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              currentTable={
                tableSession.activeSession?.tableCode
                  ? `${tableSession.activeSession.tableCode} 号桌`
                  : getCurrentBoundTable()?.code
                  ? `${getCurrentBoundTable()!.code} 号桌`
                  : 'A-08 桌'
              }
              onSwitchTable={() => setIsTableBindModalOpen(true)}
              truckSpotName="黑曜石01车 · 北座中庭"
              onOpenPickupDetail={() => setIsDeliveryRangeModalOpen(true)}
              activeOrderNo="8921"
              onOpenFilterModal={() => setIsFilterModalOpen(true)}
              onlyDiscountFilter={onlyDiscountFilter}
              onToggleDiscountFilter={() => setOnlyDiscountFilter((prev) => !prev)}
              allDishes={dishes}
              dishQuantitiesInCart={dishQuantitiesInCart}
              onSelectDish={(d) => {
                tableSession.actions.reportDishClick(d.id, d.name);
                setSelectedDishForDetail(d);
              }}
              onQuickAdd={(d, e) => handleQuickAdd(d, e)}
              onAnchorToDish={(d) => scrollToDish(d.id)}
              onAnchorToCategory={(catKey) => handleCategorySelect(catKey as CategoryType)}
              activeFilterCount={activeFilterCount}
            />
          </div>
        )}

      {/* Main Content Area - Independently scrollable, flex-1, strictly bounded above bottom navbar so navbar never covers content */}
      <main 
        id="main-content-scroll-area"
        ref={mainScrollContainerRef}
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollPaddingTop: isFullScreenView ? '0px' : '64px',
          scrollPaddingBottom: isFullScreenView ? '60px' : '110px'
        }}
        className={`flex-1 min-h-0 w-full relative ${
          activeNavTab === 'checkout' || activeNavTab === 'order_messages'
            ? 'overflow-hidden p-0 m-0 flex flex-col h-full'
            : isFullScreenView
            ? 'overflow-y-auto overflow-x-hidden w-full p-0 m-0 overscroll-contain touch-pan-y scroll-smooth [scrollbar-gutter:stable]'
            : 'overflow-y-auto overflow-x-hidden w-full px-0 sm:px-2 pt-0 pb-16 overscroll-contain touch-pan-y scroll-smooth [scrollbar-gutter:stable]'
        }`}
      >
        {/* 界面无缝极速切换：0 延迟即刻响应，轻量 0.12s 顺滑淡入，告别整屏缩放与卡顿 */}
        <motion.div
          key={activeNavTab}
          id={`tab-view-container-${activeNavTab}`}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.12,
            ease: 'easeOut'
          }}
          className={`w-full flex-1 flex flex-col min-h-0 ${
            activeNavTab === 'checkout' || activeNavTab === 'order_messages' ? 'h-full' : ''
          }`}
        >
            {activeNavTab === 'checkout' ? (
          <CheckoutPageView
            items={cart}
            deliveryAddress={deliveryAddress}
            onChangeAddress={(addr) => {
              setDeliveryAddress(addr);
              toast.info('配送地址已修改');
            }}
            onOpenAddressModal={() => setIsAddressModalOpen(true)}
            diningMode={diningMode}
            onDiningModeChange={handleDiningModeChange}
            isVIPActive={isVIPActive}
            onBackToMenu={handleBackNav}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onRemoveCartItem={handleRemoveCartItem}
            onCompleteCheckout={(notes, coupon, paymentMethod) => {
              return handleCheckout(notes, coupon, paymentMethod) || '';
            }}
            onGoToTracking={(orderId) => {
              if (orderId) setActiveTrackingOrderId(orderId);
              navigateTo('tracking');
            }}
            onGoToOrders={() => navigateTo('orders')}
          />
        ) : activeNavTab === 'cart' ? (
          <CartPageView
            items={cart}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            onProceedToCheckout={() => navigateTo('checkout')}
            onGoToMenu={handleBackNav}
            deliveryAddress={deliveryAddress}
            onOpenAddress={() => setIsAddressModalOpen(true)}
            isVIPActive={isVIPActive}
            diningMode={diningMode}
            onDiningModeChange={handleDiningModeChange}
            currentRole={currentRole}
            onSelectRole={handleSelectRole}
            dishes={dishes}
            onAddToCart={(dish) => {
              handleAddToCart(dish, 1, {}, dish.price, false);
            }}
            onGoToCategory={(cat, subCat) => {
              handleCategorySelect(cat as CategoryType);
              if (subCat) {
                setActiveSubCategory(subCat);
              }
              navigateTo('home');
            }}
            onCompleteCheckout={(notes, coupon, paymentMethod, voucher) => {
              const res = handleCheckout(notes, coupon, paymentMethod, voucher);
              return typeof res === 'string' ? res : '';
            }}
            onGoToTracking={(orderId) => {
              if (orderId) setActiveTrackingOrderId(orderId);
              navigateTo('tracking');
            }}
          />
        ) : activeNavTab === 'tracking' ? (
          (() => {
            const activeTrackingOrder =
              (activeTrackingOrderId
                ? orders.find((o) => isOrderMatch(o, activeTrackingOrderId)) ||
                  INITIAL_ORDERS.find((o) => isOrderMatch(o, activeTrackingOrderId))
                : null) ||
              orders.find((o) => o.status === 'delivering') ||
              orders.find((o) => o.status === 'cooking') ||
              orders[0];

            return (
              <OrderTrackingView
                orderId={
                  activeTrackingOrder?.orderNo
                    ? `#${activeTrackingOrder.orderNo.replace(/^#/, '')}`
                    : activeTrackingOrder?.id || '#DEL-9912'
                }
                order={activeTrackingOrder}
                truck={truck}
                deliveryAddress={deliveryAddress}
                onBackToMenu={handleBackNav}
                onAdvanceOrderStatus={handleAdvanceOrderStatus}
                onApplyRefund={handleApplyRefund}
              />
            );
          })()
        ) : activeNavTab === 'orders' ? (
          <OrdersPageView
            orders={orders}
            onOpenRadar={(orderId) => {
              if (orderId) setActiveTrackingOrderId(orderId);
              navigateTo('tracking');
            }}
            onOpenVIP={() => setIsVIPModalOpen(true)}
            onGoToMenu={handleBackNav}
            userProfile={userProfile}
            onOrdersUpdated={setOrders}
            onApplyRefund={handleApplyRefund}
            onRefreshOrders={() => {
              setOrders((prev) =>
                prev.map((o) =>
                  o.status === 'cooking'
                    ? { ...o, status: 'delivering', statusText: '配送中', progressPercent: 75, etaMinutes: 6 }
                    : o
                )
              );
              toast.success('订单状态已刷新');
            }}
          />
        ) : activeNavTab === 'profile' ? (
          <ProfilePageView
            onOpenRadar={() => navigateTo('tracking')}
            onOpenVIP={() => navigateTo('profile')}
            onOpenAddress={() => setIsAddressModalOpen(true)}
            onOpenCoupons={() => navigateTo('coupons')}
            onOpenCloudSync={() => setIsCloudbaseModalOpen(true)}
            onGoToMenu={handleBackNav}
            currentAddress={deliveryAddress}
            isVIPActive={isVIPActive}
            userProfile={userProfile}
            onProfileUpdated={setUserProfile}
            orders={orders}
            onOrdersUpdated={setOrders}
          />
        ) : activeNavTab === 'coupons' ? (
          <UserCouponsPageView
            onBackToMenu={handleBackNav}
            onGoToCategory={(cat) => {
              handleCategorySelect(cat);
              navigateTo('home');
            }}
            onOpenVIP={() => navigateTo('profile')}
            isVIPActive={isVIPActive}
          />
        ) : activeNavTab === 'trucks' ? (
          <DynamicFeedsPageView
            orders={orders}
            dishes={dishes}
            viewerRole={currentRole}
            onBackToMenu={handleBackNav}
            onTrackOrder={(ordId) => {
              setActiveTrackingOrderId(ordId);
              navigateTo('tracking');
            }}
            onAdvanceOrderStatus={handleAdvanceOrderStatus}
            onRejectOrder={handleRejectOrder}
            onAuditRefund={handleAuditRefund}
            showToast={(t, d) => toast.success(t, d)}
            embedded={false}
            onOpenGroupChat={(channelType, trkId) => {
              setSynergyInitialRoomMode(channelType);
              if (trkId) {
                setSynergyInitialTruckId(trkId);
              }
              try {
                sessionStorage.setItem('obsidian_synergy_room_mode', channelType);
              } catch {}
              navigateTo('order_messages');
            }}
          />
        ) : activeNavTab === 'order_messages' ? (
          <TruckSynergyRoomPageView
            orders={orders}
            dishes={dishes}
            viewerRole={currentRole}
            onBackToMenu={handleBackNav}
            onTrackOrder={(ordId) => {
              setActiveTrackingOrderId(ordId);
              navigateTo('tracking');
            }}
            onAdvanceOrderStatus={handleAdvanceOrderStatus}
            onRejectOrder={handleRejectOrder}
            onAuditRefund={handleAuditRefund}
            showToast={(t, d) => toast.success(t, d)}
            diningMode={diningMode}
            onSwitchTable={() => setIsTableBindModalOpen(true)}
            initialRoomMode={synergyInitialRoomMode}
            initialCommunityTruckId={synergyInitialTruckId}
            onSubViewModeChange={setSynergySubViewMode}
          />
        ) : (
          <>
            {/* A1号桌同桌多人点餐小组件：灵动组件变形效果 + 竖向多头像点餐状态流 */}
            {diningMode === 'dine_in' && (
              <DynamicTableMorphWidget
                currentTable={
                  tableSession.activeSession?.tableCode ||
                  getCurrentBoundTable()?.code ||
                  'A1'
                }
                onSwitchTable={() => setIsTableBindModalOpen(true)}
                showToast={(title, desc) => toast.info(title, desc)}
                diningMode={diningMode}
              />
            )}

            {/* Menu Dishes Sequential Content: Displayed by Category in Ordered Sequence with Linked Breakpoints */}
            <div ref={menuSectionRef} className="w-full min-w-0 pt-1">
              {isLoadingMenu ? (
                <DishSkeletonGrid count={6} viewMode={viewMode} />
              ) : categorySections.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-[#e2e3e1] space-y-3.5 shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-[#787770] shadow-2xs">
                    <FilterX className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-black">未找到符合条件的菜品</h3>
                    <p className="text-xs text-[#787770] max-w-sm mx-auto mt-1">
                      {onlyDiscountFilter
                        ? '当前分类下暂无专属特惠菜品，可重置特惠筛选或查看全部'
                        : '尝试清除搜索关键词或重置筛选条件，查看黑曜石餐车全部招牌佳肴。'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategory('popular');
                        setSearchQuery('');
                        setOnlyDiscountFilter(false);
                        setFilterOptions(INITIAL_FILTER_OPTIONS);
                        toast.info('已重置所有筛选条件');
                      }}
                      className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <span>重置并查看全部</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRefreshMenu}
                      className="px-3.5 py-2 bg-neutral-100 text-neutral-800 text-xs font-semibold rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>刷新数据</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 min-h-0 relative items-start">
                  {/* Left Column: Delivery Category Sidebar */}
                  <DeliveryCategorySidebar
                    categories={ORDERED_CATEGORY_KEYS}
                    activeCategory={activeCategory}
                    onSelectCategory={handleCategorySelect}
                    categoryCounts={categoryCounts}
                    categoryCartCounts={categoryCartCounts}
                    categoryScrollProgress={categoryScrollProgress}
                    isScrolling={isScrollingDishes}
                    soundFeedbackEnabled={soundFeedbackEnabled}
                    onToggleSoundFeedback={() => setSoundFeedbackEnabled((prev) => !prev)}
                  />

                  {/* Right Column: Ordered Category Breakpoints & Dish Stream */}
                  <div className={`flex-1 min-w-0 bg-white ${cart.length > 0 ? 'pb-36' : 'pb-24'} select-none relative transition-[padding] duration-200`}>
                    {/* Unified Sticky Header Strip with Vertical Gear-Wheel Mask Transition & Circular Indicator */}
                    <CategoryStickyHeaderBar
                      activeCategory={activeCategory}
                      categorySections={categorySections}
                      categories={ORDERED_CATEGORY_KEYS}
                    />

                    {categorySections.map((section, sectionIdx) => {
                      return (
                        <section
                          key={section.catKey}
                          id={`category-section-${section.catKey}`}
                          data-category-section={section.catKey}
                          className="w-full min-w-0"
                        >
                          {/* Subtle section separator divider when scrolling past first category */}
                          {sectionIdx > 0 && (
                            <div className="pt-3 pb-1 px-3 flex items-center gap-2 select-none opacity-40">
                              <div className="h-[1px] flex-1 bg-[#E2E4E8]" />
                              <span className="text-[9px] tabular-nums uppercase tracking-wider text-gray-400">
                                {section.category.name}
                              </span>
                              <div className="h-[1px] flex-1 bg-[#E2E4E8]" />
                            </div>
                          )}

                          {/* Dishes in this Category Section */}
                          {viewMode === 'grid2' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-2.5 p-1.5 sm:p-3 bg-white">
                              {section.dishes.map((dish) => {
                                const isDishOutOfRange =
                                  diningMode === 'delivery' &&
                                  deliveryEvaluation.isOutOfRange &&
                                  (dish.orderType === 'delivery' || dish.orderType === 'both');

                                return (
                                  <DishCard
                                    key={dish.id}
                                    dish={dish}
                                    diningMode={diningMode}
                                    cartQuantity={dishQuantitiesInCart[dish.id] || 0}
                                    onSelect={(d) => {
                                      tableSession.actions.reportDishClick(d.id, d.name);
                                      setSelectedDishForDetail(d);
                                    }}
                                    onQuickAdd={(d, e) => handleQuickAdd(d, e)}
                                    isMultiSelectMode={isMultiSelectMode}
                                    isSelected={selectedDishIds.has(dish.id)}
                                    onToggleSelect={(d) => handleToggleSelect(d)}
                                    isOutOfRange={isDishOutOfRange}
                                    deliveryRadiusKm={deliveryEvaluation.radiusKm}
                                    currentDistanceKm={deliveryEvaluation.distanceKm}
                                    onOutOfRangeClick={() => setIsDeliveryRangeModalOpen(true)}
                                    companionInteraction={companionDishInteractions[dish.id]}
                                    onCompanionBadgeClick={(msg) => toast.info('同桌点单协同', msg)}
                                  />
                                );
                              })}
                            </div>
                          ) : (
                            <div className="bg-white">
                              {section.dishes.map((dish) => {
                                const isDishOutOfRange =
                                  diningMode === 'delivery' &&
                                  deliveryEvaluation.isOutOfRange &&
                                  (dish.orderType === 'delivery' || dish.orderType === 'both');

                                return (
                                  <DishListRow
                                    key={dish.id}
                                    dish={dish}
                                    diningMode={diningMode}
                                    cartQuantity={dishQuantitiesInCart[dish.id] || 0}
                                    onSelect={(d) => {
                                      tableSession.actions.reportDishClick(d.id, d.name);
                                      setSelectedDishForDetail(d);
                                    }}
                                    onQuickAdd={(d, e) => handleQuickAdd(d, e)}
                                    isMultiSelectMode={isMultiSelectMode}
                                    isSelected={selectedDishIds.has(dish.id)}
                                    onToggleSelect={(d) => handleToggleSelect(d)}
                                    isOutOfRange={isDishOutOfRange}
                                    deliveryRadiusKm={deliveryEvaluation.radiusKm}
                                    currentDistanceKm={deliveryEvaluation.distanceKm}
                                    onOutOfRangeClick={() => setIsDeliveryRangeModalOpen(true)}
                                    companionInteraction={companionDishInteractions[dish.id]}
                                    onCompanionBadgeClick={(msg) => toast.info('同桌点单协同', msg)}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </section>
                      );
                    })}

                    {/* End of Menu Obsidian Guarantee Card */}
                    <div className="pt-6 pb-6 text-center flex flex-col items-center justify-center gap-2 text-gray-400 select-none">
                      <div className="h-[1px] w-28 bg-gray-200" />
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white border border-[#E2E4E8] text-[11px] font-semibold text-gray-700 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
                        <span>黑曜石 01 号餐车 · 现制热食全品类已浏览完毕</span>
                      </div>
                      <p className="text-[10px] text-gray-400 tabular-nums">
                        全单即点现烹 · 优质食材锁鲜直达
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        </motion.div>
      </main>

      {/* 菜品卡片滚动与侧边栏联动反馈悬浮指示器 (Floating Linked Scroll HUD - 已按要求默认删除，保持全屏纯净点单体验；可由后台设计系统按需控制) */}
      <AnimatePresence>
        {(truckExpandConfig.showScrollLinkageHud ?? false) && linkageToastInfo && isScrollingDishes && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-45 pointer-events-none"
          >
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-neutral-950/92 backdrop-blur-md text-white rounded-full shadow-xl border border-neutral-700/80 text-xs font-semibold">
              <span className="text-sm select-none">{linkageToastInfo.icon}</span>
              <span className="text-amber-400 font-bold">{linkageToastInfo.catName}</span>
              <span className="text-neutral-400 text-[10.5px] tabular-nums">
                共 {linkageToastInfo.count} 款 · 浏览 {Math.round(categoryScrollProgress * 100)}%
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Batch Action Bar for Multi-Select */}
      <BatchActionBar
        isMultiSelectMode={isMultiSelectMode}
        selectedCount={selectedDishes.length}
        totalSelectedAmount={totalSelectedAmount}
        isAllSelected={isAllSelected}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={handleClearSelection}
        onBatchAddToCart={handleBatchAddToCart}
        onExitMultiSelect={handleExitMultiSelect}
      />

      {/* Advanced Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        options={filterOptions}
        onChange={setFilterOptions}
        resultCount={filteredDishes.length}
      />

      {/* Modals & Drawers */}
      <DishDetailModal
        dish={selectedDishForDetail}
        diningMode={diningMode}
        isOpen={Boolean(selectedDishForDetail)}
        onClose={() => setSelectedDishForDetail(null)}
        onAddToCart={(d, qty, opts, price, variant) => handleAddToCart(d, qty, opts, price, true, variant)}
        isOutOfRange={diningMode === 'delivery' && deliveryEvaluation.isOutOfRange}
        deliveryRadiusKm={deliveryEvaluation.radiusKm}
        currentDistanceKm={deliveryEvaluation.distanceKm}
        onSwitchToPickup={() => {
          setDiningMode('pickup');
          toast.info('已切换为到车自提模式 (免配送费/无配送范围限制)');
        }}
        onChangeAddress={() => setIsAddressModalOpen(true)}
        companionInteraction={selectedDishForDetail ? companionDishInteractions[selectedDishForDetail.id] : undefined}
      />

      {/* Delivery Range Diagnostic & Fleet Switching Modal */}
      <DeliveryRangeModal
        isOpen={isDeliveryRangeModalOpen}
        onClose={() => setIsDeliveryRangeModalOpen(false)}
        evaluation={deliveryEvaluation}
        activeTruck={getActiveTruckConfig()}
        deliveryAddress={deliveryAddress}
        cartItemCount={cart.length}
        onSwitchToPickup={() => {
          setDiningMode('pickup');
          setIsDeliveryRangeModalOpen(false);
          toast.info('已切换为到车自提模式 (免配送费/无配送范围限制)');
        }}
        onChangeAddress={() => {
          setIsDeliveryRangeModalOpen(false);
          setIsAddressModalOpen(true);
        }}
        onSelectTruck={(truckId) => {
          setTruckConfigVersion((v) => v + 1);
          toast.success('已切换当前选定餐车', '商品配送范围与距离已自动重新评估，购物车已平移');
        }}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setActiveNavTab('checkout');
        }}
        deliveryAddress={deliveryAddress}
        onOpenAddress={() => setIsAddressModalOpen(true)}
        isVIPActive={isVIPActive}
        diningMode={diningMode}
        onDiningModeChange={handleDiningModeChange}
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        pendingOrdersCount={orders.filter((o) => o.status === 'cooking').length}
        dishes={dishes}
        onAddToCart={(dish) => {
          handleAddToCart(dish, 1, {}, dish.price, false);
        }}
        onGoToCategory={(cat, subCat) => {
          handleCategorySelect(cat as CategoryType);
          if (subCat) {
            setActiveSubCategory(subCat);
          }
          navigateTo('home');
        }}
      />

      <VIPPerkModal
        isOpen={isVIPModalOpen}
        onClose={() => setIsVIPModalOpen(false)}
        isVIPActive={isVIPActive}
        onToggleVIP={() => {
          setIsVIPActive((v) => {
            const next = !v;
            toast.info(next ? 'VIP 权益已启用' : 'VIP 权益已暂停');
            return next;
          });
        }}
      />

      <AddressSelectorModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        currentAddress={deliveryAddress}
        onSelectAddress={(addr) => {
          setDeliveryAddress(addr);
          toast.info('配送地址已切换', addr);
        }}
      />

      <CloudbaseStatusModal
        isOpen={isCloudbaseModalOpen}
        onClose={() => setIsCloudbaseModalOpen(false)}
        dishes={dishes}
        orders={orders}
        onDishesUpdated={setDishes}
        onOrdersUpdated={setOrders}
        isConnected={isCloudbaseConnected}
        authUserId={cloudbaseAuthUserId}
      />

      <OrderHistoryMessagesModal
        isOpen={isMessageFormModalOpen}
        onClose={() => setIsMessageFormModalOpen(false)}
        orders={orders}
        dishes={dishes}
        viewerRole={currentRole}
        onAdvanceOrderStatus={handleAdvanceOrderStatus}
        onRejectOrder={handleRejectOrder}
        onAuditRefund={handleAuditRefund}
        showToast={(t, d) => toast.success(t, d)}
        onTrackOrder={() => {
          setIsMessageFormModalOpen(false);
          navigateTo('tracking');
        }}
      />

      {/* Category Brand Popup Showcase Modal */}
      <CategoryBrandModal
        isOpen={Boolean(activeCategoryBrandModal)}
        onClose={() => setActiveCategoryBrandModal(null)}
        config={activeCategoryBrandModal}
        onConfirmStartShopping={() => {
          setActiveCategoryBrandModal(null);
          handleScrollToMenu();
        }}
        onNeverShowAgain={(catId) => {
          recordCategoryBrandModalSeen(catId);
          toast.info('已记录偏好', '下次切换该品类将不再自动弹出品牌介绍');
        }}
      />

      {/* 堂食选座开台 / 换桌模态框 */}
      <TableBindModal
        isOpen={isTableBindModalOpen}
        onClose={() => {
          setIsTableBindModalOpen(false);
          // 若关闭时未绑定桌台且未建立会话，平滑回退至外卖模式，避免卡在无桌台状态
          if (!getCurrentBoundTable() && !tableSession.activeSession) {
            setDiningMode('delivery');
            toast.info('已退出堂食选座', '为您保留外卖专送模式');
          }
        }}
        currentBoundTable={getCurrentBoundTable()}
        onConfirmBind={(table) => {
          setCurrentBoundTable(table);
          setIsTableBindModalOpen(false);
          toast.success(`已选定 ${table.code} 号桌`, `${table.zoneLabel} · ${table.guests}人就座`);
        }}
        truckName={truck.name}
      />

      {/* Position #3: Truck Pull-Up Menu / Drawer (Elements moved from #1) */}
      <TruckPullUpMenu
        isOpen={isPullUpMenuOpen}
        onClose={() => handleClosePullUpMenu(true)}
        truck={truck}
        orderCount={orders.length}
        deliveryAddress={deliveryAddress}
        diningMode={diningMode}
        dishes={dishes}
        onSelectDish={(d) => {
          setIsPullUpMenuOpen(false);
          setSelectedDishForDetail(d);
        }}
        onQuickAdd={(d, e) => handleQuickAdd(d, e)}
        onOpenOrders={() => {
          setIsPullUpMenuOpen(false);
          navigateTo('orders');
        }}
        onOpenRadar={() => {
          setIsPullUpMenuOpen(false);
          navigateTo('tracking');
        }}
        onOpenVIP={() => {
          setIsPullUpMenuOpen(false);
          setIsVIPModalOpen(true);
        }}
        onChangeAddress={() => {
          setIsPullUpMenuOpen(false);
          setIsAddressModalOpen(true);
        }}
        onScrollToMenu={() => {
          setIsPullUpMenuOpen(false);
          handleScrollToMenu();
        }}
        onOpenCart={() => {
          setIsPullUpMenuOpen(false);
          navigateTo('cart');
        }}
      />

      {/* Mobile Responsive Bottom Navigation */}
      {activeNavTab !== 'checkout' && !(activeNavTab === 'order_messages' && synergySubViewMode === 'chat_room') && (
        <BottomNavBar
          activeTab={activeNavTab}
          onSelectTab={handleNavSelect}
          cartCount={totalCartCount}
          cartTotal={totalCartPrice}
          cartSavings={totalCartSavings}
          onOpenCart={() => navigateTo('cart')}
          onProceedToCheckout={() => navigateTo('checkout')}
          diningMode={diningMode}
          onDiningModeChange={handleDiningModeChange}
          orders={orders}
          onOpenOrders={() => navigateTo('orders')}
          isVIPActive={isVIPActive}
          onOpenVIP={() => navigateTo('profile')}
          deliveryAddress={deliveryAddress}
          onChangeAddress={() => setIsAddressModalOpen(true)}
          currentRole={currentRole}
          onSelectRole={handleSelectRole}
          pendingOrdersCount={orders.filter((o) => o.status === 'cooking').length}
          onOpenCloudbase={() => setIsCloudbaseModalOpen(true)}
          isPullUpMenuOpen={isPullUpMenuOpen}
          onOpenPullUpMenu={() => setIsPullUpMenuOpen((prev) => !prev)}
          onOpenMessageHub={() => {
            setSynergyInitialRoomMode(undefined);
            setSynergySubViewMode('session_list');
            navigateTo('order_messages');
          }}
        />
      )}

      {/* Developer Frontend Simulation & Diagnostics Station (Admin Gated) */}
      <DevFloatingDock />
      <DevAuthModal />
      <DevSimulationControlCenter
        orders={orders}
        onAdvanceOrderStatus={handleAdvanceOrderStatus}
        dishes={dishes}
        userProfile={userProfile}
        onProfileUpdated={(up) => setUserProfile(up)}
        onInjectSampleOrder={(type) => {
          const sampleDish = dishes[0] || { name: '炭烤和牛小汉堡', price: 68 };
          const newOrder: Order = {
            id: `ord-sim-${Date.now()}`,
            orderNo: `SIM-${Math.floor(1000 + Math.random() * 9000)}`,
            items: [
              {
                name: sampleDish.name,
                price: sampleDish.price || 68,
                quantity: 2,
                options: '秘制黑椒酱香'
              }
            ],
            totalAmount: (sampleDish.price || 50) * 2,
            status: type === 'cancel_flow' ? 'cancel_requested' : type === 'reassign_flow' ? 'rider_rejected' : 'ready',
            statusText: type === 'cancel_flow' ? '客户申请终止订单' : type === 'reassign_flow' ? '骑手拒单/切换骑手中' : '已制作完成/待取餐',
            createdTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            estimatedDeliveryTime: '约20分钟',
            etaMinutes: 20,
            deliveryAddress: deliveryAddress || '静安区南京西路1601号越洋广场',
            truckName: truck.name,
            progressPercent: type === 'cancel_flow' ? 40 : 35
          };
          setOrders((prev) => [newOrder, ...prev]);
          safeSetStorage('obsidian_truck_orders', [newOrder, ...orders]);
          toast.success(`已注入仿真订单【${newOrder.orderNo}】并进入状态流水！`);
        }}
        onNavigateToTracking={() => navigateTo('tracking')}
      />

      {/* Platform Level-4 Security Access Gatekeeper */}
      <PlatformAuthModal
        isOpen={isPlatformAuthModalOpen}
        onClose={() => setIsPlatformAuthModalOpen(false)}
        onSuccess={() => {
          setCurrentRole('platform');
          switchTier('L1');
          persistUserRole('platform');
          syncRouteToBrowser({ role: 'platform' });
          toast.success('平台总控安全门禁认证通过');
        }}
        showToast={(msg) => toast.info(msg)}
      />
        </div>
      </div>
        </CustomerPhoneFrame>
    </div>

    {/* 全局公用弹窗与硬件/云端连接中心 */}
    <CloudbaseStatusModal
      isOpen={isCloudbaseModalOpen}
      onClose={() => setIsCloudbaseModalOpen(false)}
      dishes={dishes}
      orders={orders}
      onDishesUpdated={setDishes}
      isConnected={isCloudbaseConnected}
      authUserId={cloudbaseAuthUserId}
    />
    <OrderHistoryMessagesModal
      isOpen={isMessageFormModalOpen}
      onClose={() => setIsMessageFormModalOpen(false)}
      orders={orders}
      dishes={dishes}
      viewerRole={currentRole}
      onAdvanceOrderStatus={handleAdvanceOrderStatus}
      onRejectOrder={handleRejectOrder}
      onAuditRefund={handleAuditRefund}
      showToast={(t, d) => toast.success(t, d)}
      onTrackOrder={() => {
        setIsMessageFormModalOpen(false);
        navigateTo('tracking');
      }}
    />
  </>
      </div>

      {/* ★ 右栏 · 客食端预览壳容器列（三端共用；customer 本体不渲染） */}
      {previewColumnOpen && previewRole && (
        <CustomerPreviewColumn role={previewRole} onClose={() => togglePreviewPanel(false)} />
      )}

      {/* 收起后的重展开细把手（审计把手正上方，支持仅图标与常驻模式切换） */}
      {previewFeatureOn && !previewColumnOpen && (
        <button
          type="button"
          onClick={() => togglePreviewPanel(true)}
          className={`fixed right-0 z-40 bg-[#185FA5] text-white border border-[#0C447C] border-r-0 rounded-l-[4px] shadow-lg cursor-pointer hover:bg-[#0C447C] transition-all duration-200 group flex items-center justify-center ${
            wsPrefsLive.buttonDisplayMode === 'icon_only'
              ? 'p-2'
              : 'px-1 py-2.5'
          }`}
          style={{
            top: 'calc(50% - 150px)',
            ...(wsPrefsLive.buttonDisplayMode === 'always'
              ? { writingMode: 'vertical-rl', letterSpacing: '3px', fontSize: '11px', fontWeight: 700 }
              : {})
          }}
          title="展开客食端实时预览列"
        >
          {wsPrefsLive.buttonDisplayMode === 'icon_only' ? (
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Smartphone className="w-3.5 h-3.5 shrink-0 text-white" />
              <span className="max-w-0 opacity-0 group-hover:max-w-[85px] group-hover:opacity-100 transition-all duration-200 overflow-hidden whitespace-nowrap text-[11px] font-bold">
                客食端预览
              </span>
            </div>
          ) : (
            '客食端预览'
          )}
        </button>
      )}
    </div>
      )}
    </MotionConfig>
  );
}

