import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  UtensilsCrossed,
  ShoppingBag,
  ChefHat,
  ShieldAlert,
  Radio,
  Tag,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Store,
  Sparkles,
  Bell,
  SlidersHorizontal,
  Scale,
  Package,
  BookOpen,
  RotateCcw,
  Shield,
  ChevronDown,
  Check,
  Layers,
  Cloud,
  Printer,
  Megaphone,
  UserCheck,
  Users,
  BellRing,
  Award,
  MapPin,
  Barcode,
  Menu as MenuIcon,
  MessageSquareText,
  Truck,
  CreditCard,
  Bike,
  GitBranch,
  Bluetooth,
  Crown,
  Smartphone,
  Fingerprint,
  Maximize2,
  Minimize2,
  Clock,
  Activity,
  ShieldCheck,
  ArrowRightLeft,
  Zap,
  QrCode,
  Settings2,
  Trash2,
  LogOut,
  LayoutDashboard,
  Command
} from 'lucide-react';
import { GlobalTacticalCommandPalette } from '../common/GlobalTacticalCommandPalette';
import { MerchantPrecisionConsole } from './MerchantPrecisionConsole';
import { MerchantOperationsDeck } from './MerchantOperationsDeck';
import { MerchantSession, maskPhoneNumber } from '../../utils/staffAndRiderAuthEngine';
import { canAccessMerchantTab, getActiveManagerOverride, ROLE_LEVEL_META } from '../../utils/rbacEngine';
import { PermissionDeniedGuard } from '../auth/PermissionDeniedGuard';
import { StaffShiftHandoverModal } from '../auth/StaffShiftHandoverModal';
import { DishItem, Order, TruckInfo, TableItem, KdsTicket, HeldOrder, TableDishItem } from '../../types';
import { INITIAL_TABLES, INITIAL_KDS_TICKETS, INITIAL_HELD_ORDERS } from '../../data/posMockData';
import { resolveOrderChannelType, normalizeOrderKey, isOrderMatch } from '../../utils/orderNormalizer';
import { merchantBackupEngine } from '../../utils/merchantBackupEngine';
import { DynamicTableMorphWidget } from '../table/DynamicTableMorphWidget';
import { syncSingleModuleToCloud, pullSingleModuleFromCloud } from '../../utils/cloudbase';
import { CloudbaseStatusModal } from '../CloudbaseStatusModal';
import { OrderHistoryMessagesModal } from '../chat/OrderHistoryMessagesModal';
import { MerchantScannerConsole } from './MerchantScannerConsole';
import { globalScannerEngine } from '../../utils/barcodeScannerEngine';
import { rematchAllDishImages } from '../../utils/dishImageMatcher';
import { getMerchantCommissionConfigs, MerchantCommissionConfig } from '../../utils/commissionEngine';
import { globalVersionEngine } from '../../utils/versionPointerEngine';
import { voiceAlerts, hydrateVoiceFromCloudSubset } from '../../utils/voiceAlertEngine';
import { onTableCleanedRelease } from '../../utils/tableStorage';

import { MerchantTables } from './MerchantTables';
import { MerchantTableSessionMonitor } from './table/MerchantTableSessionMonitor';
import { MerchantQrManageModal } from './table/MerchantQrManageModal';
import { MerchantOrders } from './MerchantOrders';
import { MerchantKDS } from './MerchantKDS';
import { MerchantHeldOrders } from './MerchantHeldOrders';
import { MerchantStallGPS } from './MerchantStallGPS';
import { MerchantMenuChannel } from './MerchantMenuChannel';
import { MerchantAnalytics } from './MerchantAnalytics';
import { MerchantLossHub } from './MerchantLossHub';
import { MerchantInventory } from './MerchantInventory';
import { MerchantCraftSOP } from './MerchantCraftSOP';
import { MerchantShiftRefund } from './MerchantShiftRefund';
import { MerchantAuditLog } from './MerchantAuditLog';
import { MerchantVersionTrackingView } from './MerchantVersionTrackingView';
import { setAvailabilityOverride, setChannelOverride } from '../../utils/dishAvailability';
import { setDishFieldOverride } from '../../utils/dishFieldOverrides';
import { MerchantCloudSyncView } from './MerchantCloudSyncView';
import { CraftStandardView } from './CraftStandardView';
import { MerchantMarketingHub } from './MerchantMarketingHub';
import { MaterialView } from './MaterialView';
import { ProcessingLossView } from './ProcessingLossView';
import { InventoryView } from './InventoryView';
import { SkuManagementView } from './SkuManagementView';
import { MerchantVoiceControls } from './MerchantVoiceControls';
import { MerchantPrintingHub } from './MerchantPrintingHub';
import { MerchantCallingHub } from './MerchantCallingHub';
import { MerchantContingencyHub } from './MerchantContingencyHub';
import { FranchiseHQModal } from './FranchiseHQModal';
import { UiverseDynamicStudioModal } from './uiverse/UiverseDynamicStudioModal';
import { useUiverseSkin } from './uiverse/useUiverseSkin';
import {
  globalFranchiseEngine,
  FRANCHISE_TENANT_EVENT
} from '../../utils/franchiseTenantEngine';
import { FranchiseTenantContext } from '../../types/franchise';
import { MerchantMemberCRM } from './MerchantMemberCRM';
import { MerchantUserDataCenter } from './MerchantUserDataCenter';
import { getUserDataRecords } from '../../utils/userDataRegistry';
import { MerchantStaffHub } from './MerchantStaffHub';
import { MerchantTruckExpandSettings } from './MerchantTruckExpandSettings';
import { MerchantCategoryBrandSettings } from './MerchantCategoryBrandSettings';
import { MerchantPaymentChannels } from './MerchantPaymentChannels';
import { MerchantMasterControlCenter } from './MerchantMasterControlCenter';
import { MerchantDataFallbackCenter } from './MerchantDataFallbackCenter';
import { AutomatedSentinelDashboard } from '../common/AutomatedSentinelDashboard';
import { automatedSentinel, SentinelSystemState } from '../../utils/automatedSentinelEngine';
import { reactiveSyncBus } from '../../utils/reactiveSyncBus';
import { MerchantSidebar, TabItemConfig } from './MerchantSidebar';
import { WorkspaceDisplaySettingsPanel } from './WorkspaceDisplaySettingsPanel';
import { RecycleBinModal } from './RecycleBinModal';
import { getRecycleBinCount, subscribeRecycleBin } from '../../utils/recycleBinEngine';
import { WorkspacePrefs, DEFAULT_WORKSPACE_PREFS, loadLocalPrefs, saveLocalPrefs, fetchPrefsFromCloud, mergeLocalPrefs, contentWidthClass, getWorkspacePrefsSnapshot, subscribeWorkspacePrefs } from '../../utils/workspacePreferences';
import { OmniAggregatedChatHub } from '../chat/OmniAggregatedChatHub';
import { BluetoothSpeakerModal } from './BluetoothSpeakerModal';
import { globalBluetoothAudio } from '../../utils/bluetoothAudioEngine';
import { BusinessStatusModal } from './BusinessStatusModal';
import { TruckBusinessScopeDropdown } from './TruckBusinessScopeDropdown';
import { MerchantHardwareHubModal } from './MerchantHardwareHubModal';
import { GlobalQuickCallModal } from './GlobalQuickCallModal';
import {
  BusinessStatusConfig,
  getBusinessStatus,
  getTruckBusinessStatus,
  toggleBusinessOperating
} from '../../utils/businessStatusEngine';
import { getUnifiedTruckName } from '../../utils/truckNaming';

interface MerchantSystemViewProps {
  dishes: DishItem[];
  orders: Order[];
  truck: TruckInfo;
  initialTab?: MerchantTab;
  activeTabControlled?: MerchantTab;
  onTabChange?: (tab: MerchantTab) => void;
  isRoleActive?: boolean;
  onUpdateDishes?: React.Dispatch<React.SetStateAction<DishItem[]>>;
  onAdvanceOrderStatus: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onSyncOrderItems?: (orderNo: string, items: TableDishItem[]) => void;
  onRejectOrder?: (orderId: string, reason: string) => void;
  onDeleteOrder?: (orderId: string, reason?: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  onToggleNonRefundable?: (orderId: string, nonRefundable: boolean) => void;
  onUpdateTruckLocation?: (newLocation: string, radiusKm: number) => void;
  onSwitchRole: (role: 'customer' | 'merchant' | 'rider') => void;
  merchantSession?: MerchantSession | null;
  onOpenPhoneAuth?: () => void;
  onLogoutMerchant?: () => void;
}

export type MerchantTab =
  | 'operations_deck'
  | 'precision_console'
  | 'master_control'
  | 'data_fallback'
  | 'tables'
  | 'orders'
  | 'contingency'
  | 'kds'
  | 'calling'
  | 'printing'
  | 'held'
  | 'scanner'
  | 'payment_channels'
  | 'marketing'
  | 'category_brands'
  | 'truck_expand'
  | 'members'
  | 'materials'
  | 'craft_standards'
  | 'processing_loss'
  | 'inventory_close'
  | 'sku_params'
  | 'loss'
  | 'inventory'
  | 'sop'
  | 'shifts'
  | 'staff'
  | 'version_tracking'
  | 'cloud_sync'
  | 'sentinel'
  | 'audit'
  | 'gps'
  | 'menu'
  | 'user_data_mgmt'
  | 'analytics';

// Storage helpers
function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function safeSetStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore
  }
}

export const MerchantSystemView: React.FC<MerchantSystemViewProps> = ({
  dishes,
  orders,
  truck,
  initialTab,
  activeTabControlled,
  onTabChange,
  isRoleActive = true,
  onUpdateDishes,
  onAdvanceOrderStatus,
  onSyncOrderItems,
  onRejectOrder,
  onDeleteOrder,
  onAuditRefund,
  onToggleNonRefundable,
  onUpdateTruckLocation,
  onSwitchRole,
  merchantSession,
  onOpenPhoneAuth,
  onLogoutMerchant
}) => {
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const tabScrollPositionsRef = useRef<Record<string, number>>({});

  const [activeTab, setActiveTabInternal] = useState<MerchantTab>(() => {
    const cached = safeGetStorage<MerchantTab | null>('obsidian_merchant_active_tab', null);
    if (activeTabControlled) return activeTabControlled;
    if (cached) return cached;
    return initialTab || 'tables';
  });

  // 当外部受控 activeTab 变化时同步
  useEffect(() => {
    if (activeTabControlled && activeTabControlled !== activeTab) {
      setActiveTabInternal(activeTabControlled);
    }
  }, [activeTabControlled]);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isUiverseStudioOpen, setIsUiverseStudioOpen] = useState(false);
  const { skin: uiverseSkin, updateSkin: setUiverseSkin } = useUiverseSkin();

  // 全局 Command+K / Ctrl+K 指令中枢快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scrollActiveTabIntoView = useCallback((tabId: string, smooth: boolean = true) => {
    requestAnimationFrame(() => {
      const container = tabsContainerRef.current || document.getElementById('merchant-quick-tabs-container');
      const targetBtn = document.getElementById(`merchant-tab-btn-${tabId}`);
      if (container && targetBtn) {
        const containerRect = container.getBoundingClientRect();
        const btnRect = targetBtn.getBoundingClientRect();
        const offsetLeft = btnRect.left - containerRect.left;
        const targetScrollLeft = container.scrollLeft + offsetLeft - (containerRect.width / 2) + (btnRect.width / 2);
        container.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    });
  }, []);

  const setActiveTab = useCallback((nextTab: MerchantTab) => {
    // 1. 记录切换前旧 Tab 的 scrollTop 滚动高度
    if (mainScrollRef.current) {
      tabScrollPositionsRef.current[activeTab] = mainScrollRef.current.scrollTop;
    }

    setActiveTabInternal(nextTab);
    safeSetStorage('obsidian_merchant_active_tab', nextTab);
    // v3 偏好云端绑定：tab 记忆双写（换设备/本地被清自动恢复）
    try { mergeLocalPrefs({ activeTab: nextTab }); } catch { /* 云同步失败不影响本地 */ }
    onTabChange?.(nextTab);

    // 2. 自动平滑对齐并将新激活的视觉标签滚动至横向导航栏居中视线内
    scrollActiveTabIntoView(nextTab, true);

    // 3. 恢复新 Tab 之前的 scrollTop 滚动位置
    requestAnimationFrame(() => {
      if (mainScrollRef.current) {
        const savedTop = tabScrollPositionsRef.current[nextTab] || 0;
        mainScrollRef.current.scrollTop = savedTop;
      }
    });
  }, [activeTab, onTabChange, scrollActiveTabIntoView]);

  // 当角色切换切回商家端（isRoleActive 变为 true）时恢复滚动与视觉焦点
  useEffect(() => {
    if (isRoleActive) {
      requestAnimationFrame(() => {
        if (mainScrollRef.current) {
          const savedTop = tabScrollPositionsRef.current[activeTab] || 0;
          mainScrollRef.current.scrollTop = savedTop;
        }
        scrollActiveTabIntoView(activeTab, false);
      });
    }
  }, [isRoleActive, activeTab, scrollActiveTabIntoView]);

  // 挂载初始定位
  useEffect(() => {
    scrollActiveTabIntoView(activeTab, false);
  }, []);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() =>
    safeGetStorage<boolean>('obsidian_merchant_sidebar_collapsed', false)
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCloudbaseModalOpen, setIsCloudbaseModalOpen] = useState<boolean>(false);
  const [isMessageFormModalOpen, setIsMessageFormModalOpen] = useState<boolean>(false);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState<boolean>(false);
  const [isHardwareHubOpen, setIsHardwareHubOpen] = useState<boolean>(false);
  const [isQuickCallModalOpen, setIsQuickCallModalOpen] = useState<boolean>(false);
  const [isShiftHandoverOpen, setIsShiftHandoverOpen] = useState<boolean>(false);
  const [forceRbacTick, setForceRbacTick] = useState<number>(0);
  const [btConfig, setBtConfig] = useState(() => globalBluetoothAudio.getConfig());
  const [activeBtDevice, setActiveBtDevice] = useState(() => globalBluetoothAudio.getActiveDevice());
  const [isQrManageOpen, setIsQrManageOpen] = useState<boolean>(false);

  // 方案 C：全局快捷键 Alt+C 随时唤出即时叫号广播小窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.altKey && (e.key === 'c' || e.key === 'C')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'c' || e.key === 'C'))
      ) {
        e.preventDefault();
        setIsQuickCallModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleBtUpdate = () => {
      setBtConfig(globalBluetoothAudio.getConfig());
      setActiveBtDevice(globalBluetoothAudio.getActiveDevice());
    };
    window.addEventListener('obsidian_bluetooth_speaker_changed', handleBtUpdate);
    return () => window.removeEventListener('obsidian_bluetooth_speaker_changed', handleBtUpdate);
  }, []);

  // 五维自动化安全中枢 (Sentinel State) 订阅与感知注入
  const [sentinelState, setSentinelState] = useState<SentinelSystemState>(() => automatedSentinel.getState());
  useEffect(() => {
    const unsub = automatedSentinel.subscribe((next) => {
      setSentinelState({ ...next });
    });
    return () => unsub();
  }, []);

  // 1. 感知层自动闭环反馈：依据待出餐单量自动研判后厨负载
  useEffect(() => {
    const cookingOrders = orders.filter((o) => o.status === 'cooking');
    const backlogCount = cookingOrders.length;
    const avgWait = Math.max(5, Math.round(backlogCount * 3.5));
    automatedSentinel.reportKitchenStatus(backlogCount, avgWait);
  }, [orders]);

  // Franchise & Tenant Context
  const [isFranchiseHQModalOpen, setIsFranchiseHQModalOpen] = useState<boolean>(false);
  const [franchiseContext, setFranchiseContext] = useState<FranchiseTenantContext>(() =>
    globalFranchiseEngine.getContext()
  );

  // Multi-Truck Tenant Scope Isolation State
  const allMerchantTruckConfigs = useMemo(() => getMerchantCommissionConfigs(), []);
  const merchantTruckConfigs = useMemo(() => {
    return allMerchantTruckConfigs.filter((t) => franchiseContext.accessibleTruckIds.includes(t.truckId));
  }, [allMerchantTruckConfigs, franchiseContext.accessibleTruckIds]);

  const [selectedTruckId, setSelectedTruckId] = useState<string>(() => {
    const saved = safeGetStorage<string>('obsidian_merchant_selected_truck', 'truck-01');
    const ctx = globalFranchiseEngine.getContext();
    return ctx.accessibleTruckIds.includes(saved) ? saved : (ctx.currentTruckId || 'truck-01');
  });

  useEffect(() => {
    const handleTenant = (e: Event) => {
      const custom = e as CustomEvent<FranchiseTenantContext>;
      const next = custom.detail || globalFranchiseEngine.getContext();
      setFranchiseContext(next);
      if (next.currentTruckId && next.currentTruckId !== selectedTruckId) {
        setSelectedTruckId(next.currentTruckId);
      }
    };
    window.addEventListener(FRANCHISE_TENANT_EVENT, handleTenant);
    return () => window.removeEventListener(FRANCHISE_TENANT_EVENT, handleTenant);
  }, [selectedTruckId]);

  const activeTruckConfig = useMemo(() => {
    return merchantTruckConfigs.find((t) => t.truckId === selectedTruckId) || merchantTruckConfigs[0] || allMerchantTruckConfigs[0];
  }, [merchantTruckConfigs, selectedTruckId, allMerchantTruckConfigs]);

  const handleSelectTruck = (truckId: string) => {
    if (!globalFranchiseEngine.isTruckAccessible(truckId)) {
      showToast(`越权拦截：当前加盟商视角无权访问餐车 [${truckId}]！`);
      return;
    }
    setSelectedTruckId(truckId);
    globalFranchiseEngine.switchTruck(truckId);
    safeSetStorage('obsidian_merchant_selected_truck', truckId);
    const target = allMerchantTruckConfigs.find((t) => t.truckId === truckId);
    showToast(`已切换管理作用域至: 【${target?.truckName || truckId}】`);
  };

  // Subscribe to hardware barcode scanner events in merchant view
  useEffect(() => {
    const unsub = globalScannerEngine.subscribe((result) => {
      if (result.type === 'member') {
        setActiveTab('members');
        showToast(`[扫码枪] 识别会员: ${result.title}，已跳转会员CRM`);
      } else if (result.type === 'order') {
        setActiveTab('orders');
        showToast(`[扫码枪] 识别订单: ${result.title}，已跳转订单中心`);
      } else if (result.type === 'table') {
        setActiveTab('tables');
        showToast(`[扫码枪] 识别桌台: ${result.title}，已跳转堂食管理`);
      } else if (result.type === 'dish') {
        showToast(`[扫码枪] 识别菜品: ${result.title} (${result.subtitle || ''})`);
      } else if (result.type === 'coupon') {
        showToast(`[扫码枪] 核销优惠券: ${result.title}`);
      } else if (result.type === 'material') {
        setActiveTab('materials');
        showToast(`[扫码枪] 识别原料码: ${result.title}，已跳转原物料库存`);
      }
    });
    return () => unsub();
  }, []);

  // Merchant Local/Shared State with persistent local storage
  const [tables, setTables] = useState<TableItem[]>(() =>
    safeGetStorage<TableItem[]>('obsidian_merchant_tables', INITIAL_TABLES)
  );
  const [tickets, setTickets] = useState<KdsTicket[]>(() =>
    safeGetStorage<KdsTicket[]>('obsidian_merchant_tickets', INITIAL_KDS_TICKETS)
  );
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() =>
    safeGetStorage<HeldOrder[]>('obsidian_merchant_held_orders', INITIAL_HELD_ORDERS)
  );
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [isOmniChatHubOpen, setIsOmniChatHubOpen] = useState(false);

  // Business Status (Open / Closed) Master Switch State for selected truck
  const [businessStatus, setBusinessStatusState] = useState<BusinessStatusConfig>(() =>
    getTruckBusinessStatus(selectedTruckId)
  );
  const [isBusinessStatusModalOpen, setIsBusinessStatusModalOpen] = useState<boolean>(false);

  // Sync state whenever selectedTruckId changes
  useEffect(() => {
    setBusinessStatusState(getTruckBusinessStatus(selectedTruckId));
  }, [selectedTruckId]);

  useEffect(() => {
    const handleStatusChanged = (e: Event) => {
      const custom = e as CustomEvent<{
        truckId?: string;
        status?: BusinessStatusConfig;
        allStatuses?: Record<string, BusinessStatusConfig>;
      }>;
      if (custom.detail?.status && custom.detail.truckId === selectedTruckId) {
        setBusinessStatusState(custom.detail.status);
      } else if (custom.detail?.allStatuses && custom.detail.allStatuses[selectedTruckId]) {
        setBusinessStatusState(custom.detail.allStatuses[selectedTruckId]);
      } else {
        setBusinessStatusState(getTruckBusinessStatus(selectedTruckId));
      }
    };
    window.addEventListener('obsidian_business_status_changed', handleStatusChanged);
    return () => window.removeEventListener('obsidian_business_status_changed', handleStatusChanged);
  }, [selectedTruckId]);
  // 桌台首帧标记:挂载初期先以云端为准，避免本地初始快照直接覆盖云端更新
  const skipFirstTableSyncRef = useRef(true);

  useEffect(() => {
    safeSetStorage('obsidian_merchant_tables', tables);
    // 首次挂载不推送本地初始数据(等待云端拉取结果，防止覆盖其他端更新)
    if (skipFirstTableSyncRef.current) {
      skipFirstTableSyncRef.current = false;
      return;
    }
    // 防抖推送桌台快照至云端集合 obsidian_tables (跨端同步台位占用状态)
    const timer = setTimeout(() => {
      syncSingleModuleToCloud('tables').catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [tables]);

  // 进入商家端时从云端拉取一次桌台状态，覆盖本地(仅当云端真实存在数据时)
  useEffect(() => {
    pullSingleModuleFromCloud('tables')
      .then((res) => {
        // res.error 为空才代表确实来自云端;本地回退(error 含提示)跳过，避免空转覆盖
        if (res.success && !res.error && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setTables(res.data as TableItem[]);
        }
      })
      .catch(() => {});
  }, []);

  // Listen to external table update events (from client dine-in table binding or order creation)
  useEffect(() => {
    const handleTablesUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<TableItem[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setTables(customEvent.detail);
      } else {
        setTables(safeGetStorage<TableItem[]>('obsidian_merchant_tables', INITIAL_TABLES));
      }
    };
    window.addEventListener('obsidian_tables_updated', handleTablesUpdated);
    return () => window.removeEventListener('obsidian_tables_updated', handleTablesUpdated);
  }, []);

  // 监听版本回滚引擎:桌台数据被回滚后，从权威键 obsidian_merchant_tables 重载并刷新台位矩阵
  useEffect(() => {
    const handleDataRestored = (e: Event) => {
      const detail = (e as CustomEvent<{ module?: string; fullRestore?: boolean }>).detail || {};
      if (!detail.module || detail.module === 'tables' || detail.fullRestore) {
        setTables(safeGetStorage<TableItem[]>('obsidian_merchant_tables', INITIAL_TABLES));
      }
    };
    window.addEventListener('obsidian_data_restored', handleDataRestored);
    return () => window.removeEventListener('obsidian_data_restored', handleDataRestored);
  }, []);

  // Automatic match & sync of dine-in orders (such as Order #7078) to merchant tables
  // + Reverse sync: when a dine-in order reaches a terminal state (completed/refunded/cancelled),
  //   release the bound table to cleaning (requires staff to finish cleaning before idle).
  useEffect(() => {
    const dineInOrders = orders.filter(o => resolveOrderChannelType(o) === 'dine_in');
    if (dineInOrders.length === 0) return;

    const TERMINAL_STATUSES = new Set(['completed', 'refunded', 'cancelled', 'merchant_rejected']);
    const activeDineIn = dineInOrders.filter(o => !TERMINAL_STATUSES.has(o.status));
    const terminalDineIn = dineInOrders.filter(o => TERMINAL_STATUSES.has(o.status));

    setTables(prevTables => {
      let hasChanges = false;
      const nextTables = prevTables.map(tbl => {
        // 1) Forward: bind active dine-in order to an idle/matched table
        const matchingOrder = activeDineIn.find(o => {
          if (o.tableCode && o.tableCode.toUpperCase() === tbl.code.toUpperCase()) return true;
          if (o.tableId && o.tableId === tbl.id) return true;
          if (tbl.code === 'A2' && (normalizeOrderKey(o.orderNo) === '7078' || normalizeOrderKey(o.id) === '7078')) return true;
          return false;
        });

        if (matchingOrder) {
          const cleanOrderNo = matchingOrder.orderNo.replace(/^#/, '');
          if (tbl.orderNo !== cleanOrderNo || tbl.status === 'idle') {
            hasChanges = true;
            return {
              ...tbl,
              status: tbl.status === 'idle' ? ('dining' as const) : tbl.status,
              orderNo: cleanOrderNo,
              currentGuests: tbl.currentGuests || 2,
              serverName: tbl.serverName || '小林 (No.04)',
              orderItems: (tbl.orderItems && tbl.orderItems.length > 0)
                ? tbl.orderItems
                : matchingOrder.items.map((it, idx) => ({
                    id: `matched-dish-${idx}`,
                    dishId: it.dishId || `dish-${idx}`,
                    name: it.name,
                    price: it.price,
                    quantity: it.quantity,
                    kitchenStation: 'charcoal' as const,
                    serveStatus: (matchingOrder.stepIndex && matchingOrder.stepIndex >= 3) ? ('served' as const) : ('cooking' as const)
                  }))
            };
          }
        }

        // 2) Reverse: terminal dine-in order bound to this table -> flip to cleaning + clear items
        //    (only when the table is genuinely bound to that terminal orderNo)
        const boundTerminal = terminalDineIn.find(o => {
          const oNo = (o.orderNo || '').replace(/^#/, '');
          const tblNo = (tbl.orderNo || '').replace(/^#/, '');
          if (!oNo || !tblNo) return false;
          return oNo === tblNo;
        });
        if (boundTerminal) {
          const needsClean = tbl.status !== 'cleaning' || (tbl.orderItems && tbl.orderItems.length > 0);
          if (needsClean) {
            hasChanges = true;
            return {
              ...tbl,
              status: 'cleaning' as const,
              tablePhase: undefined,
              orderItems: [],
              elapsedMinutes: 1
            };
          }
        }
        return tbl;
      });

      return hasChanges ? nextTables : prevTables;
    });
  }, [orders]);

  useEffect(() => {
    safeSetStorage('obsidian_merchant_tickets', tickets);
  }, [tickets]);

  useEffect(() => {
    safeSetStorage('obsidian_merchant_held_orders', heldOrders);
  }, [heldOrders]);

  // Sync localOrders whenever parent orders prop changes and voice alert on new incoming orders
  const prevOrderIdsRef = useRef<Set<string>>(new Set(orders.map(o => o.id)));
  useEffect(() => {
    setLocalOrders(orders);

    const currentIds = new Set(orders.map(o => o.id));
    const newArrivals = orders.filter(o => !prevOrderIdsRef.current.has(o.id));
    if (newArrivals.length > 0) {
      const latest = newArrivals[0];
      // Real-human voice announcement for new self-operated order
      voiceAlerts.newSelfOperatedOrder(
        latest.orderNo || latest.id,
        latest.totalAmount,
        latest.customerName || '自营专送食客'
      );
    }
    prevOrderIdsRef.current = currentIds;
  }, [orders]);

  // Tenant-Scoped Orders for Current Selected Truck
  const scopedOrders = useMemo(() => {
    return localOrders.filter((o) => {
      // Match explicit truckId or fallback to matching truckName substring
      if (o.truckId) {
        return o.truckId === selectedTruckId;
      }
      if (selectedTruckId === 'truck-01') {
        return !o.truckName || o.truckName.includes('01') || o.truckName.includes('南广场');
      }
      if (selectedTruckId === 'truck-02') {
        return o.truckName?.includes('02') || o.truckName?.includes('科技园');
      }
      if (selectedTruckId === 'truck-03') {
        return o.truckName?.includes('03') || o.truckName?.includes('滨江');
      }
      return false;
    });
  }, [localOrders, selectedTruckId]);

  // Tenant-Scoped Tables for Current Selected Truck
  const scopedTables = useMemo(() => {
    return tables.filter((t) => {
      if (t.truckId) {
        return t.truckId === selectedTruckId;
      }
      return selectedTruckId === 'truck-01';
    });
  }, [tables, selectedTruckId]);

  // Sync active cooking orders into KDS tickets dynamically for current truck
  useEffect(() => {
    const cookingOrders = scopedOrders.filter((o) => o.status === 'cooking');
    setTickets((prevTickets) => {
      const existingTicketNos = new Set(prevTickets.map((t) => t.ticketNo.replace('#', '')));
      const newTicketsFromOrders: KdsTicket[] = [];

      cookingOrders.forEach((co) => {
        const cleanNo = co.orderNo.replace('#', '');
        if (!existingTicketNos.has(cleanNo)) {
          newTicketsFromOrders.push({
            id: `kds-${co.id}`,
            ticketNo: co.orderNo.startsWith('#') ? co.orderNo : `#${co.orderNo}`,
            tableOrChannel: `${co.truckName || '餐车'} · 专送`,
            channelType: 'delivery',
            orderTime: co.createdTime || '刚刚',
            elapsedMinutes: 1,
            status: 'cooking',
            items: co.items.map((it, idx) => ({
              id: `item-${co.id}-${idx}`,
              dishName: it.name,
              quantity: it.quantity,
              isCompleted: false
            }))
          });
        }
      });

      if (newTicketsFromOrders.length > 0) {
        return [...prevTickets, ...newTicketsFromOrders];
      }
      return prevTickets;
    });
  }, [scopedOrders]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const allTabsConfig: TabItemConfig[] = [
    // 实时经营 — 营业核心高频作业链路
    { id: 'operations_deck', label: '全渠道运营总控 (Deck)', category: '实时经营', icon: LayoutDashboard },
    { id: 'precision_console', label: '全渠道供售打样主控', category: '实时经营', icon: Radio },
    { id: 'orders', label: '全渠道订单中心', category: '实时经营', icon: ShoppingBag, badge: scopedOrders.filter(o => o.status === 'cooking' || o.status === 'pending').length },
    { id: 'kds', label: 'KDS 后厨出餐看板', category: '实时经营', icon: ChefHat, badge: tickets.length },
    { id: 'tables', label: '堂食台位矩阵', category: '实时经营', icon: UtensilsCrossed, badge: tables.filter(t => t.status === 'dining').length },
    { id: 'calling', label: '前台叫号取餐/等位', category: '实时经营', icon: Megaphone },
    { id: 'printing', label: '档口小票拆单打印', category: '实时经营', icon: Printer },
    { id: 'master_control', label: '经营总控与实时漏斗', category: '实时经营', icon: Activity },
    { id: 'held', label: '挂账风控与未结账', category: '实时经营', icon: Clock, badge: heldOrders.length, badgeAlert: true },
    { id: 'contingency', label: '异常退款与兜底审核', category: '实时经营', icon: ShieldAlert, badge: scopedOrders.filter(o => (o.rejectionCount && o.rejectionCount > 0) || o.refundStatus === 'pending' || o.status === 'refund_pending').length, badgeAlert: true },
    { id: 'data_fallback', label: '版本快照与数据容灾', category: '实时经营', icon: ShieldCheck, badgeAlert: true },

    // 菜品供应链 — 菜品、工艺、原料、库存与损耗
    { id: 'menu', label: '菜品管理与渠道沽清', category: '菜品供应链', icon: Tag },
    { id: 'materials', label: '原物料与安全库存', category: '菜品供应链', icon: Package },
    { id: 'craft_standards', label: '制作工艺与配方标准', category: '菜品供应链', icon: BookOpen },
    { id: 'processing_loss', label: '初加工出肉率核算', category: '菜品供应链', icon: Scale },
    { id: 'sku_params', label: '数字参数与标准规范', category: '菜品供应链', icon: Layers },
    { id: 'inventory_close', label: '每日打烊闭环盘点', category: '菜品供应链', icon: Shield },
    { id: 'loss', label: '全链路损耗监控', category: '菜品供应链', icon: TrendingDown },

    // 支付财务与报表
    { id: 'analytics', label: '营收与客流分析大屏', category: '支付财务与报表', icon: TrendingUp },
    { id: 'payment_channels', label: '支付收款与渠道配置', category: '支付财务与报表', icon: CreditCard },
    { id: 'shifts', label: '收银交班与对账清算', category: '支付财务与报表', icon: RotateCcw },
    { id: 'audit', label: '操作审计与离线队列', category: '支付财务与报表', icon: Shield },

    // 营销会员
    { id: 'marketing', label: '优惠券发布与营销活动', category: '营销会员', icon: SlidersHorizontal },
    { id: 'members', label: '会员储值与积分资产', category: '营销会员', icon: Users },
    { id: 'user_data_mgmt', label: '全域用户档案中心', category: '营销会员', icon: Fingerprint, badge: getUserDataRecords().length },
    { id: 'category_brands', label: '分类品牌与类目故事', category: '营销会员', icon: Sparkles },

    // 门店与位置
    { id: 'gps', label: '餐车停靠与 GPS 广播', category: '门店与位置', icon: Radio },
    { id: 'truck_expand', label: '餐车展开与底栏气泡', category: '门店与位置', icon: SlidersHorizontal },

    // 系统团队与硬件
    { id: 'staff', label: '员工花名册与岗位权限', category: '系统团队与硬件', icon: UserCheck },
    { id: 'scanner', label: '智能扫码枪硬件控制台', category: '系统团队与硬件', icon: Barcode },
    { id: 'cloud_sync', label: '腾讯云数据同步中枢', category: '系统团队与硬件', icon: Cloud },
    { id: 'version_tracking', label: '数据修改与版本追踪', category: '系统团队与硬件', icon: GitBranch },
    {
      id: 'sentinel',
      label: '五维自动化安全防护 (Sensing)',
      category: '系统团队与硬件',
      icon: Zap,
      badge: sentinelState.activeDecisions.length,
      badgeAlert: sentinelState.threatLevel !== 'SECURE'
    }
  ];

  const currentTabConfig = allTabsConfig.find(t => t.id === activeTab) || allTabsConfig[0];
  const CurrentIcon = currentTabConfig.icon;

  // Categories for grouped menu (ordered by merchant daily workflow)
  const categories = ['实时经营', '菜品供应链', '支付财务与报表', '营销会员', '门店与位置', '系统团队与硬件'];

  // --- Handlers for Tables Matrix ---
  const handleOpenTable = (tableId: string, guests: number, server: string) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'dining',
              currentGuests: guests,
              serverName: server,
              elapsedMinutes: 1,
              totalAmount: 128.0,
              tablePhase: 'cooking',
              orderNo: undefined,
              orderTime: undefined,
              orderItems: [{ name: '碳烤和牛小汉堡双重奏', quantity: 2, price: 128.0 }]
            }
          : t
      )
    );
  };

  const handleCheckoutTable = (tableId: string, discount: number, isAaSplit: boolean) => {
    // 1. 若该桌存在进行中的堂食订单，先联动推进订单至已完成(结账翻台)，保证订单中心与台位矩阵同步
    const boundTable = tables.find((t) => t.id === tableId);
    if (boundTable && boundTable.orderNo) {
      const cleanNo = String(boundTable.orderNo).replace(/^#/, '');
      const matchedOrder = orders.find(
        (o) =>
          resolveOrderChannelType(o) === 'dine_in' &&
          !['completed', 'refunded', 'cancelled', 'merchant_rejected'].includes(o.status) &&
          ((o.orderNo || '').replace(/^#/, '') === cleanNo ||
            (o.tableCode && o.tableCode.toUpperCase() === (boundTable.code || '').toUpperCase()))
      );
      if (matchedOrder && onAdvanceOrderStatus) {
        onAdvanceOrderStatus(matchedOrder.orderNo || matchedOrder.id, 'completed', {
          status: 'completed',
          stepIndex: 4,
          statusText: '餐品全齐·结账翻台'
        });
      }
    }

    // 2. 桌台翻为保洁状态并清空点餐明细与单号残留
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'cleaning',
              elapsedMinutes: 1,
              orderItems: [],
              tablePhase: undefined,
              orderNo: undefined,
              orderTime: undefined,
              currentGuests: undefined
            }
          : t
      )
    );
  };

  const handleTransferTable = (fromTableId: string, toTableId: string) => {
    const fromTable = tables.find((t) => t.id === fromTableId);
    if (!fromTable) return;

    setTables((prev) =>
      prev.map((t) => {
        if (t.id === fromTableId) {
          return { ...t, status: 'cleaning', elapsedMinutes: 1, orderItems: [], orderNo: undefined, orderTime: undefined, tablePhase: undefined, currentGuests: undefined };
        }
        if (t.id === toTableId) {
          return {
            ...t,
            status: 'dining',
            currentGuests: fromTable.currentGuests,
            serverName: fromTable.serverName,
            totalAmount: fromTable.totalAmount,
            orderItems: fromTable.orderItems
          };
        }
        return t;
      })
    );
  };

  const handleReleaseTable = (tableId: string) => {
    const res = onTableCleanedRelease(tableId);
    if (res.transferred && res.waitingItem && res.updatedTable) {
      setTables((prev) => prev.map((t) => (t.id === res.updatedTable!.id ? res.updatedTable! : t)));
      showToast(`桌台 ${res.updatedTable.code} 保洁完成，已自动纳入等位 ${res.waitingItem.code} (${res.waitingItem.guests}人) 入座！`);
    } else {
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId
            ? {
                ...t,
                status: 'idle',
                elapsedMinutes: 0,
                orderItems: [],
                tablePhase: undefined,
                orderNo: undefined,
                orderTime: undefined,
                totalAmount: undefined,
                currentGuests: undefined,
                serverName: undefined
              }
            : t
        )
      );
    }
  };

  const handleUpdateTable = (updatedTable: TableItem) => {
    setTables((prev) => prev.map((t) => (t.id === updatedTable.id ? updatedTable : t)));
  };

  const handleVoidTableOrder = (tableId: string, reason: string, targetStatus: 'idle' | 'cleaning' = 'idle') => {
    const targetTable = tables.find((t) => t.id === tableId);
    if (!targetTable) return;

    // 1. 若有关联订单，找到并作废/删除
    if (targetTable.orderNo) {
      const cleanOrderNo = String(targetTable.orderNo).replace(/^#/, '');
      const matchedOrder = orders.find(
        (o) =>
          resolveOrderChannelType(o) === 'dine_in' &&
          ((o.orderNo || '').replace(/^#/, '') === cleanOrderNo ||
            (o.tableCode && o.tableCode.toUpperCase() === targetTable.code.toUpperCase()))
      );
      if (matchedOrder) {
        handleDeleteOrder(matchedOrder.orderNo || matchedOrder.id, `堂食台位作废: ${reason}`);
      }
    }

    // 2. 更新桌台状态
    const updatedTable: TableItem = {
      ...targetTable,
      status: targetStatus,
      orderNo: undefined,
      orderTime: undefined,
      orderItems: [],
      totalAmount: 0,
      tablePhase: undefined,
      currentGuests: undefined,
      serverName: undefined,
      elapsedMinutes: 0
    };

    setTables((prev) => prev.map((t) => (t.id === tableId ? updatedTable : t)));

    // 3. 记录多账号协同版本控制快照
    globalVersionEngine.recordDataMutation({
      module: 'tables',
      entityId: targetTable.id,
      entityName: `${targetTable.code} 桌 (${targetTable.name})`,
      actionType: 'void_order',
      beforeData: targetTable,
      afterData: updatedTable,
      customSummary: `作废 ${targetTable.code} 桌堂食订单，原因: ${reason}; 桌位已恢复为 ${targetStatus === 'idle' ? '空闲' : '保洁'}`
    });

    showToast(`桌台 ${targetTable.code} 订单已作废并清台释放！(原因: ${reason})`);
  };

  // --- Handlers for Orders ---
  const handleAcceptOrder = (orderId: string) => {
    showToast(`已接单，工单已自动注入 KDS 后厨制作队列！`);
  };

  const handleRejectOrder = (orderId: string, reason: string) => {
    setLocalOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (onRejectOrder) {
      onRejectOrder(orderId, reason);
    }
  };

  // --- Handlers for KDS ---
  const handleFinishTicket = (ticketId: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    // Match corresponding order and advance to ready for delivery / delivering
    const matchedOrder = orders.find(
      (o) =>
        o.id === ticketId ||
        `kds-${o.id}` === ticketId ||
        o.orderNo === ticketId ||
        ticketId.includes(o.orderNo) ||
        o.orderNo.includes(ticketId.replace('#', '').replace('kds-', '').replace('DEL-', 'UR-'))
    );
    if (matchedOrder && matchedOrder.status === 'cooking') {
      onAdvanceOrderStatus(matchedOrder.orderNo || matchedOrder.id, 'delivering');
    }
    showToast(`工单出餐完成，已通知专送骑手取餐！`);
  };

  // 全渠道订单中心与后厨删除/作废统一调度
  const handleDeleteOrder = (orderId: string, reason?: string) => {
    // 1. 从商家端本地订单集剔除
    setLocalOrders((prev) => prev.filter((o) => !isOrderMatch(o, orderId)));
    // 2. 从后厨KDS工单队列同步清理关联工单
    const cleanId = orderId.replace(/^#/, '');
    setTickets((prev) => {
      const next = prev.filter((t) => !t.ticketNo.includes(cleanId) && t.id !== orderId);
      safeSetStorage('obsidian_merchant_tickets', next);
      return next;
    });
    // 3. 调用主应用删除持久化
    if (onDeleteOrder) {
      onDeleteOrder(orderId, reason);
    }
  };

  const handleDeleteTicket = (ticketId: string, deleteAssociatedOrder: boolean, reason?: string) => {
    const targetTicket = tickets.find((t) => t.id === ticketId);
    setTickets((prev) => {
      const next = prev.filter((t) => t.id !== ticketId);
      safeSetStorage('obsidian_merchant_tickets', next);
      return next;
    });

    if (targetTicket) {
      merchantBackupEngine.logAction(
        '后厨出餐',
        'delete',
        `作废后厨工单 ${targetTicket.ticketNo}`,
        `桌位/渠道: ${targetTicket.tableOrChannel}, 原因: ${reason || '后厨手动作废删除'}`
      );
    }

    if (deleteAssociatedOrder && targetTicket) {
      const cleanNo = targetTicket.ticketNo.replace(/^#/, '');
      handleDeleteOrder(cleanNo, reason || '后厨出餐看板作废');
    } else {
      showToast(`后厨工单 ${targetTicket?.ticketNo || ticketId} 已从制作队列作废删除！`);
    }
  };

  const handleToggleItemComplete = (ticketId: string, itemId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          items: t.items.map((it) => (it.id === itemId ? { ...it, isCompleted: !it.isCompleted } : it))
        };
      })
    );
  };

  const handleBatchFinishDish = (dishName: string) => {
    setTickets((prev) =>
      prev.map((t) => ({
        ...t,
        items: t.items.map((it) => (it.dishName === dishName ? { ...it, isCompleted: true } : it))
      }))
    );
  };

  // --- Handlers for Held Orders ---
  const handleResumeCheckout = (heldOrder: HeldOrder) => {
    // 恢复收银：将挂单从风控列表移除并切回桌台/收银视图，便于继续结算
    setHeldOrders((prev) => prev.filter((h) => h.id !== heldOrder.id));
    setActiveTab('tables');
  };

  const handleSendReminder = (orderId: string) => {
    // 真实催付：记录最近一次催付时间（持久化），挂单保留以便追踪回执
    const nowStr = new Date().toLocaleString('zh-CN', { hour12: false });
    setHeldOrders((prev) =>
      prev.map((h) => (h.id === orderId ? { ...h, lastReminderAt: nowStr } : h))
    );
    showToast('已向顾客手机下发催付账单短信通知！');
  };

  const handleConvertToTakeaway = (orderId: string) => {
    // 真实转外带：将堂食挂单标记为外带打包（持久化），释放堂食桌位风控
    setHeldOrders((prev) =>
      prev.map((h) =>
        h.id === orderId
          ? { ...h, convertedToTakeaway: true, tableName: '外带打包', tableCode: '外带' }
          : h
      )
    );
    showToast('挂单已转为外带保温打包，可交付顾客带走！');
  };

  const handleVoidOrder = (orderId: string) => {
    // 真实作废冲正：取消该笔挂账账单（从风控列表移除）
    setHeldOrders((prev) => prev.filter((h) => h.id !== orderId));
    showToast('挂单已作废冲正，相关账单与库存占用已取消！');
  };

  // --- Handlers for GPS ---
  const handleUpdateGPS = (newLocation: string, radiusKm: number) => {
    if (onUpdateTruckLocation) {
      onUpdateTruckLocation(newLocation, radiusKm);
    }
  };

  // --- Handlers for Menu Dishes ---
  const handleToggleAvailability = (dishId: string) => {
    if (onUpdateDishes) {
      const oldDish = dishes.find((d) => d.id === dishId);
      if (oldDish) {
        const policy = globalFranchiseEngine.getPolicy(dishId);
        const ctx = globalFranchiseEngine.getContext();
        if (policy?.isHqLocked && policy.requireHqApprovalForDelist && !ctx.isHqUser && oldDish.available) {
          showToast(`越权拦截：【${oldDish.name}】为总部核心爆品（全国统配），禁止加盟商擅自下架，需向区域督导报备！`);
          return;
        }

        globalVersionEngine.recordDataMutation({
          module: 'dishes',
          entityId: dishId,
          entityName: oldDish.name,
          actionType: 'update',
          beforeData: { id: dishId, available: oldDish.available },
          afterData: { id: dishId, available: !oldDish.available },
          customSummary: `菜品【${oldDish.name}】状态切换为：${!oldDish.available ? '恢复上架供应' : '下架/沽清'}`
        });
        const nextAvail = !oldDish.available;
        setAvailabilityOverride(dishId, nextAvail);
        setChannelOverride(dishId, {
          delivery: nextAvail,
          dineIn: nextAvail,
          pickup: nextAvail
        });
      }
      onUpdateDishes((prev) =>
        prev.map((d) => (d.id === dishId ? { ...d, available: !d.available } : d))
      );
    }
  };

  const handleUpdateDish = (updatedDish: DishItem) => {
    if (onUpdateDishes) {
      const oldDish = dishes.find((d) => d.id === updatedDish.id);
      if (oldDish) {
        if (updatedDish.price !== oldDish.price) {
          const val = globalFranchiseEngine.validateDishPriceUpdate(
            updatedDish.id,
            updatedDish.name,
            updatedDish.price,
            oldDish.price
          );
          if (!val.allowed) {
            showToast(val.reason || '改价失败：超出总部价格合规红线');
            return;
          }
        }
        const policy = globalFranchiseEngine.getPolicy(updatedDish.id);
        const ctx = globalFranchiseEngine.getContext();
        if (policy?.isHqLocked && !ctx.isHqUser && updatedDish.name !== oldDish.name) {
          showToast(`越权拦截：【${oldDish.name}】为总部品牌受保护菜品，加盟商无权更改菜品名称！`);
          return;
        }

        globalVersionEngine.recordDataMutation({
          module: 'dishes',
          entityId: updatedDish.id,
          entityName: updatedDish.name,
          actionType: 'update',
          beforeData: oldDish,
          afterData: updatedDish
        });
        if (typeof updatedDish.available === 'boolean') {
          setAvailabilityOverride(updatedDish.id, updatedDish.available);
        }
        // 种下「字段级」本地覆盖：名称/价格/描述/图片/分类/规格/排序等商家改动，
        // 刷新后不会被 fetchDishesFromCloud 的云端覆盖冲掉
        setDishFieldOverride(updatedDish.id, updatedDish);
      }
      onUpdateDishes((prev) =>
        prev.map((d) => (d.id === updatedDish.id ? updatedDish : d))
      );
    }
  };

  const handleAddNewDish = (newDish: Partial<DishItem>) => {
    if (onUpdateDishes) {
      const fullDish: DishItem = {
        id: newDish.id || `dish-${Date.now()}`,
        name: newDish.name || '新品',
        enName: newDish.enName || 'New Dish',
        price: newDish.price || 38.0,
        originalPrice: newDish.originalPrice,
        prevPrice: newDish.prevPrice,
        deliveryDiscount: newDish.deliveryDiscount,
        dineInDiscount: newDish.dineInDiscount,
        deliveryDiscountTag: newDish.deliveryDiscountTag,
        dineInDiscountTag: newDish.dineInDiscountTag,
        discountTag: newDish.discountTag,
        discountRuleNote: newDish.discountRuleNote,
        category: newDish.category || 'mains',
        subCategory: newDish.subCategory,
        subCategoryName: newDish.subCategoryName,
        typeTag: newDish.typeTag || '新品上市',
        badgeText: newDish.badgeText,
        description: newDish.description || '',
        prepTime: newDish.prepTime || '约8m',
        imageUrl: newDish.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        available: newDish.available !== undefined ? newDish.available : true,
        unavailableReason: newDish.unavailableReason,
        orderType: newDish.orderType || 'both',
        optionGroups: newDish.optionGroups,
        nutrition: newDish.nutrition,
        originSource: newDish.originSource,
        chefNotes: newDish.chefNotes,
        galleryImages: newDish.galleryImages,
        spicinessLevel: newDish.spicinessLevel,
        spicinessOptions: newDish.spicinessOptions,
        flavor: newDish.flavor,
        flavorOptions: newDish.flavorOptions,
        flavorTags: newDish.flavorTags,
        cookingStyle: newDish.cookingStyle,
        cookingStyleOptions: newDish.cookingStyleOptions,
        craftStandardNote: newDish.craftStandardNote,
        customTags: newDish.customTags,
        isCloned: newDish.isCloned
      };

      globalVersionEngine.recordDataMutation({
        module: 'dishes',
        entityId: fullDish.id,
        entityName: fullDish.name,
        actionType: 'create',
        beforeData: null,
        afterData: fullDish
      });

      onUpdateDishes((prev) => [fullDish, ...prev]);
    }
  };

  const handleRematchAllImages = () => {
    const rematched = rematchAllDishImages(dishes);
    if (onUpdateDishes) {
      onUpdateDishes(rematched);
    }
    showToast(`已成功重新匹配全部 ${rematched.length} 道菜品的云端高清实拍美食图！`);
  };

  // 商家底栏 5 大核心入口活跃状态与角标计算
  const cookingOrdersCount = useMemo(() => {
    return scopedOrders.filter((o) => o.status === 'cooking' || o.status === 'pending').length;
  }, [scopedOrders]);

  const riskAlertCount = useMemo(() => {
    const pendingRefunds = scopedOrders.filter(
      (o) => (o.rejectionCount && o.rejectionCount > 0) || o.refundStatus === 'pending' || o.status === 'refund_pending'
    ).length;
    return heldOrders.length + pendingRefunds;
  }, [scopedOrders, heldOrders]);

  const isDishActive = ['menu', 'materials', 'craft_standards', 'processing_loss', 'category_brands', 'truck_expand', 'marketing', 'sku_params', 'inventory'].includes(activeTab);
  const isOrdersActive = ['orders', 'kds', 'tables', 'calling', 'printing', 'scanner'].includes(activeTab);
  const isRiskActive = ['contingency', 'held', 'shifts', 'loss', 'inventory_close', 'audit', 'payment_channels'].includes(activeTab);

  // 侧边栏打开/关闭切换逻辑 (响应式适配移动端抽屉与桌面端折叠)
  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => {
        const next = !prev;
        safeSetStorage('obsidian_merchant_sidebar_collapsed', next);
        return next;
      });
    }
  };

  // Desktop workspace full-width toggle
  // v3 迁移：废弃 obsidian_merchant_fullwidth 双轨（曾游离于 wsPrefs 之外、不上云、
  // 且覆盖 contentWidth 三档），统一为 wsPrefs.contentWidth: 'wide' 单一真源。
  // 旧键做一次性读取迁移后移除。
  useEffect(() => {
    try {
      if (localStorage.getItem('obsidian_merchant_fullwidth') === 'true') {
        const cur = getWorkspacePrefsSnapshot();
        if (cur.contentWidth !== 'wide') {
          updateWsPrefs({ contentWidth: 'wide' });
        }
        localStorage.removeItem('obsidian_merchant_fullwidth');
      }
    } catch { /* 迁移失败静默降级 */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFullWidthWorkspace = () => {
    const isWideNow = wsPrefs.contentWidth === 'wide' || (wsPrefs.contentWidthPercent ?? 88) >= 100;
    const targetPercent = isWideNow ? 88 : 100;
    updateWsPrefs({
      contentWidth: isWideNow ? 'standard' : 'wide',
      contentWidthPercent: targetPercent
    });
    showToast(isWideNow ? '已切换为屏幕占比 88% 居中工作台' : '已切换为全宽铺满工作台 (100% 视口)');
  };

  // Real-time clock for desktop status bar
  const [currentTime, setCurrentTime] = useState<string>(() =>
    new Date().toLocaleTimeString('zh-CN', { hour12: false })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isSidebarActive = isMobileSidebarOpen;

  // ============ 方向三: 工作台显示偏好（本地 + 云端双向同步）============
  const [wsPrefs, setWsPrefs] = useState<WorkspacePrefs>(() => loadLocalPrefs() ?? DEFAULT_WORKSPACE_PREFS);
  const [wsSyncState, setWsSyncState] = useState<'idle' | 'saving' | 'synced' | 'local_only'>('idle');
  const [wsPanelOpen, setWsPanelOpen] = useState(false);

  // 响应式监听工作台偏好变更（包含按钮显示模式、内容宽度等全局广播）
  useEffect(() => {
    const unsub = subscribeWorkspacePrefs(() => {
      setWsPrefs(getWorkspacePrefsSnapshot());
    });
    return unsub;
  }, []);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [recycleBinCount, setRecycleBinCount] = useState<number>(() => getRecycleBinCount());
  useEffect(() => {
    const unsub = subscribeRecycleBin(() => setRecycleBinCount(getRecycleBinCount()));
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPrefsFromCloud().then((cloud) => {
      if (cancelled || !cloud) return;
      setWsPrefs((prev) => {
        const cloudNewer = !prev.updatedAt || (cloud.updatedAt ?? '') >= (prev.updatedAt ?? '');
        if (cloudNewer) {
          saveLocalPrefs(cloud);
          return cloud;
        }
        return prev;
      });
      // v3 偏好自愈：本地键缺失而云端有值时回写本地（本地文件被清场景）
      try {
        if (typeof cloud.activeTab === 'string' && !safeGetStorage<MerchantTab | null>('obsidian_merchant_active_tab', null)) {
          safeSetStorage('obsidian_merchant_active_tab', cloud.activeTab as MerchantTab);
          setActiveTabInternal(cloud.activeTab as MerchantTab);
        }
        if (typeof cloud.sidebarCollapsed === 'boolean' && localStorage.getItem('obsidian_merchant_sidebar_collapsed') === null) {
          safeSetStorage('obsidian_merchant_sidebar_collapsed', cloud.sidebarCollapsed);
          setIsSidebarCollapsed(cloud.sidebarCollapsed);
        }
        // v3 批次3：语音播报配置云端自愈（本地键缺失时静默水合，selectedVoiceName 设备级除外）
        if (cloud.voice) {
          hydrateVoiceFromCloudSubset(cloud.voice as Partial<import('../../utils/voiceAlertEngine').VoiceConfig>);
        }
      } catch { /* 自愈失败静默降级 */ }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateWsPrefs = (patch: Partial<WorkspacePrefs>) => {
    // 深合并（基于最新本地快照，避免嵌套字段互相覆盖）→ 本地即时 + 云端异步跟随
    const { merged, cloudSync } = mergeLocalPrefs(patch);
    setWsPrefs(merged);
    setWsSyncState('saving');
    cloudSync
      .then((r) => setWsSyncState(r ? 'synced' : 'local_only'))
      .catch(() => setWsSyncState('local_only'));
  };

  // 顶部员工账号菜单下拉控制
  const [isStaffMenuOpen, setIsStaffMenuOpen] = useState(false);
  // 手机端顶部快捷功能下拉菜单控制
  const [isMobileMoreMenuOpen, setIsMobileMoreMenuOpen] = useState(false);

  return (
    <div className="h-screen w-full bg-[#f7f7f5] text-[#37352f] flex flex-col font-sans overflow-hidden select-none selection:bg-[#37352f] selection:text-white">
      {/* 1. Global Navigation Top Bar */}
      <header
        style={{
          paddingLeft: (wsPrefs.windowSafeMargin ?? 0) > 0 ? `${Math.max(8, wsPrefs.windowSafeMargin)}px` : undefined,
          paddingRight: (wsPrefs.windowSafeMargin ?? 0) > 0 ? `${Math.max(8, wsPrefs.windowSafeMargin)}px` : undefined
        }}
        className={`h-12 sm:h-13 shrink-0 bg-[#ffffff] border-b border-[#e6e6e4] py-1.5 flex items-center justify-between shadow-2xs gap-1.5 sm:gap-3 z-30 transition-all duration-150 ${
          (wsPrefs.windowSafeMargin ?? 0) > 0 ? '' : 'px-2 sm:px-3'
        }`}
      >
        {/* Left: Mobile Sidebar Toggle + Back + Store Brand + Truck Selector */}
        <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 shrink">
          {/* Mobile Sidebar Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden p-1.5 bg-white hover:bg-[#f7f7f5] text-[#37352f] rounded-[2px] transition-all cursor-pointer border border-[#e6e6e4] flex items-center justify-center shrink-0 shadow-2xs"
            title="展开28个功能模块侧边栏"
            aria-label="展开功能模块侧边栏"
          >
            <MenuIcon className="w-4 h-4 text-[#37352f]" />
          </button>

          {/* Return to Customer Storefront */}
          <button
            type="button"
            onClick={() => onSwitchRole('customer')}
            className="px-2 sm:px-2.5 py-1 bg-white hover:bg-[#f7f7f5] text-[#1a1918] border border-[#1a1918] rounded-full transition-all cursor-pointer flex items-center gap-1 font-normal text-xs shadow-2xs shrink-0 whitespace-nowrap"
            title="返回前台顾客点餐"
            aria-label="返回前台顾客点餐"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#1a1918] shrink-0" />
            <span className="font-normal whitespace-nowrap">切回前台</span>
          </button>

          {/* Vertical Separator */}
          <div className="h-4 w-[1px] bg-[#e6e6e4] shrink-0" />

          {/* Store Brand Badge */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border border-[#1a1918] text-[#1a1918] flex items-center justify-center font-normal text-xs shrink-0 shadow-2xs">
              <Store className="w-3.5 h-3.5 text-[#1a1918]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-normal text-xs sm:text-sm text-[#201f1d] whitespace-nowrap tracking-tight">
                商家总控
              </span>
              <span className="text-[10px] font-mono bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.2 rounded-full shrink-0 hidden lg:inline-block font-normal">
                在线
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-[#e6e6e4] shrink-0 hidden sm:block" />

          {/* Truck Scope & Business Switches Dropdown Popover (含租户沙箱与渠道调度一体化复合胶囊) */}
          <TruckBusinessScopeDropdown
            selectedTruckId={selectedTruckId}
            onSelectTruck={handleSelectTruck}
            merchantTruckConfigs={merchantTruckConfigs}
            businessStatus={businessStatus}
            onOpenDetailedModal={() => setIsBusinessStatusModalOpen(true)}
            showToast={showToast}
            onOpenHQModal={() => setIsFranchiseHQModalOpen(true)}
          />

          <div className="h-4 w-[1px] bg-[#e6e6e4] shrink-0 hidden md:block" />

          {/* Verified Phone Staff Dropdown Capsule (精简折叠卡片) */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setIsStaffMenuOpen((prev) => !prev)}
              className={`h-7 sm:h-8 px-2 rounded-[4px] border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                isStaffMenuOpen
                  ? 'bg-white border-[#1a1918] shadow-2xs'
                  : 'bg-white border-[#e8e7e3] hover:border-[#1a1918] hover:bg-[#fafaf9]'
              }`}
              title="员工账号与当班状态"
            >
              <Smartphone className="w-3 h-3 text-[#1a1918] shrink-0" />
              <span className="text-[11px] sm:text-[11.5px] font-bold text-[#1a1918] truncate max-w-[100px]">
                {merchantSession?.name || '张伟 (店长)'}
              </span>
              <span className="font-mono text-[10px] text-[#787770]">
                {merchantSession?.phone ? maskPhoneNumber(merchantSession.phone) : '138****8000'}
              </span>
              <span
                className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-mono font-bold"
                title="已完成指纹与设备硬件绑定"
              >
                🪪
              </span>
              <ChevronDown
                className={`w-3 h-3 text-[#787770] transition-transform ${
                  isStaffMenuOpen ? 'rotate-180 text-[#1a1918]' : ''
                }`}
              />
            </button>

            {/* 员工下拉气泡菜单 */}
            {isStaffMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsStaffMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-[#1a1918] rounded-[6px] shadow-xl p-2 z-50 text-xs space-y-1.5">
                  <div className="px-2 py-1.5 bg-[#f9f9f7] rounded-[4px] border border-[#e8e7e3]">
                    <div className="font-bold text-[#1a1918] text-[11.5px] flex items-center justify-between">
                      <span>{merchantSession?.name || '张伟 (店长)'}</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">在岗执勤</span>
                    </div>
                    <div className="font-mono text-[#787770] text-[10px] mt-0.5">
                      手机号: {merchantSession?.phone ? maskPhoneNumber(merchantSession.phone) : '138****8000'}
                    </div>
                  </div>

                  <div className="pt-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsStaffMenuOpen(false);
                        setIsShiftHandoverOpen(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-[4px] text-left hover:bg-[#f4f4f2] text-[#1a1918] flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 font-medium"><ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" /> 当班交接班结算</span>
                      <span className="text-[10px] text-[#787770]">对账</span>
                    </button>

                    {onOpenPhoneAuth && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsStaffMenuOpen(false);
                          onOpenPhoneAuth();
                        }}
                        className="w-full px-2.5 py-1.5 rounded-[4px] text-left hover:bg-[#f4f4f2] text-[#1a1918] flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 font-medium"><Smartphone className="w-3.5 h-3.5 text-blue-600" /> 切换员工账号</span>
                        <span className="text-[10px] text-[#787770]">换号</span>
                      </button>
                    )}

                    {onLogoutMerchant && (
                      <>
                        <div className="h-px bg-[#e8e7e3] my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setIsStaffMenuOpen(false);
                            onLogoutMerchant();
                          }}
                          className="w-full px-2.5 py-1.5 rounded-[4px] text-left hover:bg-rose-50 text-rose-600 flex items-center justify-between cursor-pointer font-bold"
                        >
                          <span className="flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" /> 退出商家端</span>
                          <span className="text-[10px] text-rose-400">登出</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 五维自动化安全中枢常驻胶囊 (精简版微标) */}
          <button
            type="button"
            id="global-sentinel-status-capsule"
            onClick={() => setActiveTab('sentinel')}
            className={`hidden md:flex items-center gap-1 h-7 sm:h-8 px-2 rounded-[4px] border text-xs font-mono font-bold cursor-pointer transition-all ${
              sentinelState.threatLevel === 'SECURE'
                ? 'bg-white text-[#1a1918] border-[#e8e7e3] hover:border-[#1a1918] hover:bg-[#fafaf9]'
                : sentinelState.threatLevel === 'CRITICAL'
                ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
            title="五维自动化安全与自闭环中枢 (Sensing-Safety)"
          >
            <Zap className={`w-3 h-3 ${sentinelState.threatLevel === 'SECURE' ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span>{sentinelState.overallHealthScore}</span>
            {sentinelState.activeDecisions.length > 0 && (
              <span className="px-1 py-0.1 rounded-[2px] text-[9px] bg-red-600 text-white font-medium">
                {sentinelState.activeDecisions.length}
              </span>
            )}
          </button>
        </div>

        {/* Top Right Quick Switches */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* 手机端专属：快捷功能下拉菜单 (Mobile Quick Actions Dropdown Menu) */}
          <div className="relative md:hidden">
            <button
              type="button"
              id="mobile-header-quick-menu-trigger"
              onClick={() => setIsMobileMoreMenuOpen((v) => !v)}
              className="px-2 py-1 bg-white hover:bg-neutral-50 active:scale-95 text-[#1a1918] rounded-[3px] border border-[#e6e6e4] text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer whitespace-nowrap"
              aria-label="快捷工具中枢菜单"
              aria-expanded={isMobileMoreMenuOpen}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[11px] font-medium whitespace-nowrap">快捷中枢</span>
              <ChevronDown className={`w-3 h-3 text-neutral-500 transition-transform ${isMobileMoreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* 下拉菜单面板 */}
            {isMobileMoreMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMobileMoreMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-[#1a1918] rounded-[6px] shadow-2xl p-1.5 z-50 text-xs space-y-0.5">
                  <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    快捷工具与中枢
                  </div>
                  {/* 1. UIverse 动态组件 */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMoreMenuOpen(false);
                      setIsUiverseStudioOpen(true);
                    }}
                    className="w-full px-2 py-1.5 rounded-[4px] text-left hover:bg-amber-50 text-neutral-900 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>UIverse 动态组件库</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 font-mono border border-amber-500/40">
                      对接
                    </span>
                  </button>
                  {/* 2. 即时喊号广播 */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMoreMenuOpen(false);
                      setIsQuickCallModalOpen(true);
                    }}
                    className="w-full px-2 py-1.5 rounded-[4px] text-left hover:bg-neutral-100 text-neutral-900 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                      <span>全域喊号广播小窗</span>
                    </span>
                    <span className="text-[10px] text-neutral-400">Alt+C</span>
                  </button>
                  {/* 3. 特许加盟与总部爆品 */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMoreMenuOpen(false);
                      setIsFranchiseHQModalOpen(true);
                    }}
                    className="w-full px-2 py-1.5 rounded-[4px] text-left hover:bg-neutral-100 text-neutral-900 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Crown className="w-3.5 h-3.5 text-amber-700" />
                      <span>加盟商/HQ爆品中枢</span>
                    </span>
                    <span className="text-[10px] text-neutral-400">HQ</span>
                  </button>
                  {/* 4. 硬件与协同中枢 */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMoreMenuOpen(false);
                      setIsHardwareHubOpen(true);
                    }}
                    className="w-full px-2 py-1.5 rounded-[4px] text-left hover:bg-neutral-100 text-neutral-900 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-700" />
                      <span>硬件与多设备协同</span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </button>
                  {/* 5. 餐车驻点与工况热配置 (商家专属) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMoreMenuOpen(false);
                      setActiveTab('gps');
                    }}
                    className="w-full px-2 py-1.5 rounded-[4px] text-left hover:bg-neutral-100 text-neutral-900 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>餐车驻点与工况热更新</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-300">
                      商家设置
                    </span>
                  </button>
                  {/* 6. 营业状态与渠道总控 */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMoreMenuOpen(false);
                      setIsBusinessStatusModalOpen(true);
                    }}
                    className="w-full px-2 py-1.5 rounded-[4px] text-left hover:bg-neutral-100 text-neutral-900 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span className={`w-2.5 h-2.5 rounded-full ${businessStatus.isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span>营业状态与渠道总控</span>
                    </span>
                    <span className="text-[10px] text-neutral-500">{businessStatus.isOpen ? '营业中' : '已打烊'}</span>
                  </button>
                  {/* 6. 五维安全中枢 */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMoreMenuOpen(false);
                      setActiveTab('sentinel');
                    }}
                    className="w-full px-2 py-1.5 rounded-[4px] text-left hover:bg-neutral-100 text-neutral-900 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      <span>安全与自愈中枢</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 font-bold">{sentinelState.overallHealthScore}分</span>
                  </button>
                  {/* 7. 交接班对账 */}
                  <div className="h-px bg-neutral-200 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMoreMenuOpen(false);
                      setIsShiftHandoverOpen(true);
                    }}
                    className="w-full px-2 py-1.5 rounded-[4px] text-left hover:bg-neutral-100 text-neutral-900 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                      <span>当班交接班对账</span>
                    </span>
                    <span className="text-[10px] text-neutral-400">结算</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 桌面端/平板端平铺按钮组 (Desktop/Tablet Expanded Buttons: hidden on < md) */}
          <div className="hidden md:flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* 方案 C：全局顶部常驻即时喊号浮窗入口 */}
            <button
              type="button"
              id="global-header-quick-call-btn"
              onClick={() => setIsQuickCallModalOpen(true)}
              className="group/btn p-1.5 sm:px-2 sm:py-1 bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-semibold text-xs rounded-[2px] transition-all cursor-pointer border border-amber-500 flex items-center justify-center shadow-2xs shrink-0"
              title="全域即时叫号广播小窗（自提催取/呼叫骑手/堂食传菜/全域喊客，快捷键: Alt+C）"
              aria-label="喊号广播"
            >
              <Megaphone className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover/btn:max-w-[80px] group-hover/btn:opacity-100 group-hover/btn:ml-1 transition-all duration-200 font-semibold">喊号广播</span>
            </button>

            {/* UIverse 动态组件中枢与自动匹配入口 */}
            <button
              type="button"
              id="uiverse-dynamic-studio-btn"
              onClick={() => setIsUiverseStudioOpen(true)}
              className="px-2.5 py-1 rounded-full font-bold text-xs transition-all cursor-pointer border flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:shadow-[0_0_18px_rgba(245,158,11,0.6)] bg-neutral-950 hover:bg-neutral-900 text-amber-300 border-amber-500/60 active:scale-95 shrink-0 whitespace-nowrap"
              title="对接 https://uiverse.io 动态组件库 · 自动匹配与视觉皮肤引擎"
              aria-label="UIverse 动态组件中枢"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
              <span className="font-mono text-white text-[11px] whitespace-nowrap">UIverse 动态组件</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/40 shrink-0">
                对接
              </span>
            </button>

            {/* 特许加盟与总部爆品中枢 */}
            <button
              type="button"
              id="franchise-hq-hub-btn"
              onClick={() => setIsFranchiseHQModalOpen(true)}
              className="group/btn p-1.5 sm:px-2 sm:py-1 bg-white hover:bg-slate-50 active:scale-95 text-black font-semibold text-xs rounded-[2px] transition-all cursor-pointer border border-[#e6e6e4] flex items-center justify-center shadow-2xs shrink-0"
              title="特许经营与加盟商多租户中枢 · 核心爆品全国强锁定"
              aria-label="加盟/HQ爆品中枢"
            >
              <Crown className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover/btn:max-w-[120px] group-hover/btn:opacity-100 group-hover/btn:ml-1 transition-all duration-200 font-semibold text-black">加盟/HQ爆品中枢</span>
            </button>
          </div>

          {/* 营业状态总开关 (All devices) */}
          <button
            type="button"
            onClick={() => setIsBusinessStatusModalOpen(true)}
            className={`group/btn p-1.5 sm:px-2 sm:py-1 rounded-[2px] font-semibold text-xs transition-all cursor-pointer border flex items-center justify-center shadow-2xs shrink-0 whitespace-nowrap ${
              businessStatus.isOpen
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-300 animate-pulse'
            }`}
            title={`流动餐车营业状态总控（当前: ${businessStatus.isOpen ? '营业中' : '已打烊'}）`}
            aria-label={businessStatus.isOpen ? '营业中' : '已打烊'}
          >
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${businessStatus.isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover/btn:max-w-[60px] group-hover/btn:opacity-100 group-hover/btn:ml-1 transition-all duration-200 font-semibold">{businessStatus.isOpen ? '营业中' : '已打烊'}</span>
          </button>

          {/* 协同中枢聚合胶囊 (Tablet: md ~ xl) */}
          <button
            type="button"
            onClick={() => setIsHardwareHubOpen(true)}
            className="hidden md:flex xl:hidden group/btn p-1.5 sm:px-2 sm:py-1 bg-white hover:bg-slate-50 text-black rounded-[2px] font-semibold text-xs transition-all cursor-pointer border border-[#e6e6e4] items-center justify-center shadow-2xs shrink-0"
            title="打开硬件与协同中枢"
            aria-label="硬件与协同中枢"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-black shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover/btn:max-w-[48px] group-hover/btn:opacity-100 group-hover/btn:ml-1 transition-all duration-200 text-black">协同</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-0.5" />
          </button>

          {/* Desktop Expanded Buttons: Only visible on >= xl screens */}
          <div className="hidden xl:flex items-center gap-1 sm:gap-1.5 shrink-0">
            <MerchantVoiceControls showToast={showToast} />

            {/* Bluetooth Audio Player */}
            <button
              type="button"
              onClick={() => setIsBluetoothModalOpen(true)}
              style={{ backgroundColor: '#ffffff' }}
              className={`group/btn p-1.5 sm:px-2 sm:py-1 bg-white hover:bg-neutral-50 rounded-[2px] font-semibold text-xs transition-all cursor-pointer border flex items-center shadow-2xs shrink-0 ${
                activeBtDevice && activeBtDevice.status === 'connected'
                  ? 'text-blue-900 border-blue-200'
                  : 'text-neutral-700 border-[#e6e6e4]'
              }`}
              title={`流动餐车蓝牙音箱 · 当前: ${
                activeBtDevice?.status === 'connected' ? activeBtDevice.name : '未连接'
              }`}
            >
              <Bluetooth className={`w-3.5 h-3.5 shrink-0 ${
                activeBtDevice && activeBtDevice.status === 'connected' ? 'text-blue-600' : 'text-neutral-500'
              }`} />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover/btn:max-w-[48px] group-hover/btn:opacity-100 group-hover/btn:ml-1 transition-all duration-200">蓝牙</span>
              {activeBtDevice && activeBtDevice.status === 'connected' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('scanner');
                showToast('已切换至智能扫码枪硬件控制台');
              }}
              className={`group/btn p-1.5 sm:px-2 sm:py-1 rounded-[2px] font-semibold text-xs transition-all cursor-pointer border flex items-center shadow-2xs shrink-0 ${
                activeTab === 'scanner'
                  ? 'bg-[#2b593f] text-white border-[#2b593f]'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
              title="智能扫码枪硬件控制台"
            >
              <Barcode className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'scanner' ? 'text-white' : 'text-emerald-700'}`} />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover/btn:max-w-[48px] group-hover/btn:opacity-100 group-hover/btn:ml-1 transition-all duration-200">扫码</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-0.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsMessageFormModalOpen(true)}
              className="group/btn p-1.5 sm:px-2 sm:py-1 bg-white hover:bg-neutral-50 text-neutral-800 rounded-[2px] font-semibold text-xs transition-all cursor-pointer border border-[#e6e6e4] flex items-center shadow-2xs shrink-0"
              title="订单协同消息与历史表单"
            >
              <div className="relative shrink-0">
                <MessageSquareText className="w-3.5 h-3.5 text-emerald-700 shrink-0 group-hover/btn:scale-110 transition-transform" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover/btn:max-w-[48px] group-hover/btn:opacity-100 group-hover/btn:ml-1 transition-all duration-200">消息</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCloudbaseModalOpen(true)}
              className="group/btn p-1.5 sm:px-2 sm:py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-[2px] font-semibold text-xs transition-all cursor-pointer border border-sky-200 flex items-center shadow-2xs shrink-0"
              title="腾讯云数据同步"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover/btn:max-w-[48px] group-hover/btn:opacity-100 group-hover/btn:ml-1 transition-all duration-200">同步</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-0.5" />
            </button>
          </div>

          {/* 骑手端入口 */}
          <button
            type="button"
            onClick={() => onSwitchRole('rider')}
            style={{ backgroundColor: '#ffffff' }}
            className="group/btn hidden sm:flex p-1.5 sm:px-2 sm:py-1 bg-white hover:bg-[#f8f8f7] text-[#37352f] rounded-[2px] font-semibold text-xs transition-all cursor-pointer border border-[#e6e6e4] items-center shrink-0 shadow-2xs"
            title="切换至骑手端配送界面"
          >
            <Bike className="w-3.5 h-3.5 text-[#2b593f] shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover/btn:max-w-[60px] group-hover/btn:opacity-100 group-hover/btn:ml-1 transition-all duration-200 font-semibold">骑手端</span>
          </button>
        </div>
      </header>

      {/* 2. Main Flex Container: Left Sidebar + Right Workspace (视口纵向已彻底释放，不再受独立横幅挤压) */}
      <div className="flex-1 flex flex-row min-h-0 w-full overflow-hidden relative">
        {/* Left Sidebar Navigation */}
        <MerchantSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          tabsConfig={allTabsConfig}
          categories={categories}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => {
            setIsSidebarCollapsed((prev) => {
              const next = !prev;
              safeSetStorage('obsidian_merchant_sidebar_collapsed', next);
              // v3 偏好云端绑定：折叠状态双写
              try { mergeLocalPrefs({ sidebarCollapsed: next }); } catch { /* 云同步失败不影响本地 */ }
              return next;
            });
          }}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          truckName={getUnifiedTruckName(selectedTruckId, 'standard')}
          merchantSession={merchantSession}
        />

        {/* Right Main Dashboard Workspace */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#f7f7f5]">
          {/* Subheader: Active Module Breadcrumb Capsules + Quick Pill Bar + Inline Right Controls */}
          {/* 修复：回收站/显示设置此前为 absolute 悬浮层（z-30）压在面包屑行（z-20）之上，
              现改为行内右端控制组，随文档流排布，不再遮挡任何面包屑元素 */}
          <div
            style={{
              paddingLeft: (wsPrefs.windowSafeMargin ?? 0) > 0 ? `${Math.max(8, wsPrefs.windowSafeMargin)}px` : undefined,
              paddingRight: (wsPrefs.windowSafeMargin ?? 0) > 0 ? `${Math.max(8, wsPrefs.windowSafeMargin)}px` : undefined
            }}
            className={`shrink-0 bg-[#ffffff]/95 backdrop-blur-xs border-b border-[#e6e6e4] py-1.5 shadow-2xs flex items-center gap-2 z-20 transition-all duration-150 ${
              (wsPrefs.windowSafeMargin ?? 0) > 0 ? '' : 'pl-2.5 pr-2 sm:pl-3.5 sm:pr-3'
            }`}
          >
            {/* Desktop Breadcrumb Capsules (Hidden on mobile to give full row to quick pill bar) */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              <span
                className="px-2.5 py-1 rounded-full bg-white border border-[#e6e6e4] text-[11px] font-normal text-[#787774] whitespace-nowrap shadow-2xs"
                title="所属功能分组"
              >
                {currentTabConfig.category}
              </span>
              <span
                className="px-2.5 py-1 rounded-full bg-white text-[#1a1918] border border-[#1a1918] text-[11px] font-normal flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
                title="当前所在模块"
              >
                <CurrentIcon className="w-3 h-3 shrink-0 text-[#1a1918]" />
                <span>{currentTabConfig.label}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                {currentTabConfig.badge !== undefined && currentTabConfig.badge > 0 && (
                  <span
                    className={`text-[9.5px] font-mono font-normal px-1.5 py-0.2 rounded-full border ${
                      currentTabConfig.badgeAlert
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-neutral-100 text-[#1a1918] border-neutral-300'
                    }`}
                  >
                    {currentTabConfig.badge}
                  </span>
                )}
              </span>
            </div>

            {/* Quick Frequent Modules (Desktop & Mobile horizontal scrollable capsule bar) */}
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
              <div
                id="merchant-quick-tabs-container"
                ref={tabsContainerRef}
                className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 w-full scroll-smooth"
              >
                {(() => {
                  const baseQuickTabs = [
                    { id: 'orders', label: '订单', icon: ShoppingBag, badge: scopedOrders.filter(o => o.status === 'cooking' || o.status === 'pending').length },
                    { id: 'kds', label: 'KDS', icon: ChefHat, badge: tickets.length },
                    { id: 'tables', label: '堂食台位', icon: UtensilsCrossed, badge: tables.filter(t => t.status === 'dining').length },
                    { id: 'calling', label: '叫号', icon: BellRing },
                    { id: 'printing', label: '打印', icon: Printer },
                    { id: 'menu', label: '菜品', icon: Tag },
                    { id: 'contingency', label: '兜底审核', icon: ShieldAlert, badge: scopedOrders.filter(o => (o.rejectionCount && o.rejectionCount > 0) || o.refundStatus === 'pending' || o.status === 'refund_pending').length, badgeAlert: true },
                    { id: 'held', label: '未结账', icon: ShieldAlert, badge: heldOrders.length, badgeAlert: true },
                    { id: 'data_fallback', label: '数据兜底', icon: ShieldCheck, badgeAlert: true },
                    { id: 'analytics', label: '报表', icon: TrendingUp },
                    { id: 'members', label: '会员', icon: Award },
                    { id: 'user_data_mgmt', label: '统一档案', icon: Fingerprint },
                    { id: 'truck_expand', label: '展开底栏', icon: SlidersHorizontal },
                    { id: 'gps', label: '驻点·GPS', icon: MapPin },
                    { id: 'staff', label: '员工', icon: Users }
                  ];

                  // 布局修复：当前模块已在左侧面包屑胶囊中展示，不再前置到快捷条
                  // （此前非快捷 tab 激活时会与面包屑重复渲染同一条目）
                  const displayTabs = baseQuickTabs;
                  const isIconOnly = wsPrefs.buttonDisplayMode === 'icon_only';

                  return (
                    <>
                      {displayTabs.map((quick) => {
                        const Icon = quick.icon;
                        const isSelected = activeTab === quick.id;
                        return (
                          <button
                            key={quick.id}
                            id={`merchant-tab-btn-${quick.id}`}
                            data-tab-id={quick.id}
                            type="button"
                            title={quick.label}
                            onClick={() => setActiveTab(quick.id as MerchantTab)}
                            className={`rounded-full text-xs font-normal flex items-center transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 border group ${
                              isIconOnly ? 'px-2 py-1' : 'px-2.5 py-1 gap-1.5'
                            } ${
                              isSelected
                                ? 'border border-[#1a1918] bg-white text-[#1a1918] shadow-2xs'
                                : 'border border-transparent bg-transparent text-[#5c5a54] hover:border-[#d3d1cb] hover:bg-neutral-50 hover:text-[#1a1918]'
                            }`}
                          >
                            <Icon className={`w-3 h-3 shrink-0 transition-colors ${isSelected ? 'text-[#1a1918]' : 'text-[#8c8a85]'}`} />
                            <span
                              className={`font-normal tracking-tight transition-all duration-200 overflow-hidden whitespace-nowrap ${
                                isIconOnly
                                  ? 'max-w-0 opacity-0 group-hover:max-w-[140px] group-hover:opacity-100 group-hover:ml-1'
                                  : ''
                              }`}
                            >
                              {quick.label}
                            </span>
                            {isSelected && (
                              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ${isIconOnly ? 'ml-0.5' : ''}`} />
                            )}
                            {quick.badge !== undefined && quick.badge > 0 && (
                              <span
                                className={`text-[9.5px] font-mono font-normal px-1.5 py-0.2 rounded-full border shrink-0 ${
                                  isIconOnly ? 'ml-0.5' : ''
                                } ${
                                  isSelected
                                    ? 'bg-neutral-100 text-[#1a1918] border-neutral-300'
                                    : quick.badgeAlert
                                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                                    : 'bg-[#efefed] text-[#5c5a54] border-transparent'
                                }`}
                              >
                                {quick.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="md:hidden px-2.5 py-1 rounded-full text-xs font-normal flex items-center gap-1 text-[#787774] hover:bg-[#efefed] hover:text-[#1a1918] shrink-0 border border-dashed border-[#d3d1cb] bg-white"
                        title="展开全部功能模块侧边栏"
                      >
                        <MenuIcon className="w-3 h-3 text-[#787774]" />
                        <span className="whitespace-nowrap font-normal">全部</span>
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Right Inline Controls: 回收站 / 显示设置 / 宽度切换（行内排布，支持根据显示偏好折叠为纯图标模式） */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* 指令中枢 (Command+K) 快捷入口 */}
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className={`h-7 flex items-center bg-[#1c1e21] hover:bg-black text-white rounded-full text-[11px] font-mono transition-all cursor-pointer shadow-2xs group ${
                  wsPrefs.buttonDisplayMode === 'icon_only' ? 'px-2' : 'px-2.5 gap-1.5'
                }`}
                title="战术指令中枢 (支持快捷键 Cmd+K / Ctrl+K 穿梭)"
              >
                <Command className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline font-sans text-xs">指令台</span>
                <span className="text-[9px] bg-white/20 px-1 py-0.2 rounded font-mono hidden md:inline">⌘K</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRecycleBinOpen(true)}
                className={`h-7 flex items-center bg-white hover:bg-[#f8f8f7] border border-[#e6e6e4] hover:border-[#000000] rounded-full text-[11px] font-bold text-[#37352f] transition-all cursor-pointer group ${
                  wsPrefs.buttonDisplayMode === 'icon_only' ? 'px-2' : 'px-2 gap-1'
                }`}
                title="统一回收站（删除的业务数据 30 天内可恢复）"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span
                  className={`transition-all duration-200 overflow-hidden whitespace-nowrap ${
                    wsPrefs.buttonDisplayMode === 'icon_only'
                      ? 'max-w-0 opacity-0 group-hover:max-w-[70px] group-hover:opacity-100 group-hover:ml-1'
                      : 'hidden sm:inline'
                  }`}
                >
                  回收站
                </span>
                {recycleBinCount > 0 && (
                  <span className={`text-[9.5px] font-mono font-bold px-1 rounded-full bg-[#201f1d] text-white shrink-0 ${wsPrefs.buttonDisplayMode === 'icon_only' ? 'ml-1' : ''}`}>
                    {recycleBinCount}
                  </span>
                )}
              </button>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setWsPanelOpen((v) => !v)}
                  className={`h-7 flex items-center border rounded-full text-[11px] font-bold transition-all cursor-pointer group ${
                    wsPrefs.buttonDisplayMode === 'icon_only' ? 'px-2' : 'px-2 gap-1'
                  } ${
                    wsPanelOpen
                      ? 'bg-[#000000] text-white border-[#000000]'
                      : 'bg-white text-[#1a1c1b] border-[#e6e6e4] hover:border-[#000000]'
                  }`}
                  title="工作台显示设置（快捷与悬浮按钮显示模式 / 内容宽度 / 订单列数 / 毛利红线 / 客食端预览管控）"
                >
                  <Settings2 className="w-3.5 h-3.5 shrink-0" />
                  <span
                    className={`transition-all duration-200 overflow-hidden whitespace-nowrap ${
                      wsPrefs.buttonDisplayMode === 'icon_only'
                        ? 'max-w-0 opacity-0 group-hover:max-w-[80px] group-hover:opacity-100 group-hover:ml-1'
                        : 'hidden sm:inline'
                    }`}
                  >
                    显示设置
                  </span>
                </button>
                <WorkspaceDisplaySettingsPanel
                  open={wsPanelOpen}
                  onClose={() => setWsPanelOpen(false)}
                  prefs={wsPrefs}
                  onChange={updateWsPrefs}
                  syncState={wsSyncState}
                  showToast={showToast}
                />
              </div>
              <button
                type="button"
                onClick={toggleFullWidthWorkspace}
                className={`hidden xl:flex h-7 bg-white hover:bg-[#f8f8f7] text-[#787774] hover:text-[#201f1d] rounded-full transition-all cursor-pointer items-center border border-[#e6e6e4] hover:border-[#d3d1cb] shrink-0 text-xs font-medium group ${
                  wsPrefs.buttonDisplayMode === 'icon_only' ? 'px-2' : 'px-2 gap-1'
                }`}
                title={wsPrefs.contentWidth === 'wide' ? '切换为标准居中工作台（宽度三档可在显示设置调节）' : '切换为全宽铺满工作台 (100% Fluid)'}
              >
                {wsPrefs.contentWidth === 'wide' ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-[#5a5854] shrink-0" />
                    <span
                      className={`text-[11px] transition-all duration-200 overflow-hidden whitespace-nowrap ${
                        wsPrefs.buttonDisplayMode === 'icon_only'
                          ? 'max-w-0 opacity-0 group-hover:max-w-[60px] group-hover:opacity-100 group-hover:ml-1'
                          : 'hidden 2xl:inline'
                      }`}
                    >
                      居中
                    </span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-[#5a5854] shrink-0" />
                    <span
                      className={`text-[11px] transition-all duration-200 overflow-hidden whitespace-nowrap ${
                        wsPrefs.buttonDisplayMode === 'icon_only'
                          ? 'max-w-0 opacity-0 group-hover:max-w-[60px] group-hover:opacity-100 group-hover:ml-1'
                          : 'hidden 2xl:inline'
                      }`}
                    >
                      全宽
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
          <RecycleBinModal
            open={isRecycleBinOpen}
            onClose={() => setIsRecycleBinOpen(false)}
            showToast={showToast}
          />

          {/* 3. Main Dashboard Workspace Content */}
          <main
            ref={mainScrollRef as any}
            onScroll={() => {
              if (mainScrollRef.current) {
                tabScrollPositionsRef.current[activeTab] = mainScrollRef.current.scrollTop;
              }
            }}
            style={{
              maxWidth:
                wsPrefs.contentWidth === 'wide' || (wsPrefs.contentWidthPercent && wsPrefs.contentWidthPercent >= 100)
                  ? 'none'
                  : wsPrefs.contentWidthPercent
                  ? `${wsPrefs.contentWidthPercent}%`
                  : undefined,
              paddingLeft: (wsPrefs.windowSafeMargin ?? 0) > 0 ? `${wsPrefs.windowSafeMargin}px` : undefined,
              paddingRight: (wsPrefs.windowSafeMargin ?? 0) > 0 ? `${wsPrefs.windowSafeMargin}px` : undefined,
              paddingTop: (wsPrefs.windowSafeMargin ?? 0) > 0 ? `${wsPrefs.windowSafeMargin}px` : undefined
            }}
            className={`merchant-workspace-readable font-['Space_Grotesk',sans-serif] flex-1 overflow-y-auto w-full mx-auto transition-all duration-150 p-2 sm:p-4 lg:p-5 ${
              wsPrefs.contentWidthPercent && wsPrefs.contentWidthPercent >= 100
                ? 'max-w-none'
                : wsPrefs.contentWidthPercent
                ? 'mx-auto'
                : contentWidthClass(wsPrefs.contentWidth)
            } pb-3 md:pb-8 custom-scrollbar`}
          >
          <div className="w-full">
        {(() => {
          const accessCheck = canAccessMerchantTab(activeTab, merchantSession);
          if (!accessCheck.allowed) {
            return (
              <PermissionDeniedGuard
                requirement={accessCheck.requirement}
                merchantSession={merchantSession}
                onBackToAllowedTab={() => setActiveTab('orders')}
                onOpenShiftHandover={() => setIsShiftHandoverOpen(true)}
                onOverrideGranted={() => setForceRbacTick((t) => t + 1)}
                showToast={showToast}
              />
            );
          }
          return (
            <>
        {activeTab === 'data_fallback' && (
          <MerchantDataFallbackCenter
            showToast={showToast}
            onNavigateToModule={(mod) => {
              const m = mod as string;
              if (m === 'tables') setActiveTab('tables');
              else if (m === 'orders') setActiveTab('orders');
              else if (m === 'kds') setActiveTab('kds');
              else if (m === 'calling_queue') setActiveTab('calling');
              else if (m === 'dishes') setActiveTab('menu');
              else if (m === 'shifts') setActiveTab('shifts');
              else if (m === 'members') setActiveTab('members');
              else if (m === 'fallback') setActiveTab('data_fallback');
            }}
          />
        )}

        {activeTab === 'tables' && (
          <>
            {/* 商家端平滑注入实时同桌协同点餐小组件（全状态双向同步与管理） */}
            <div className="mb-4">
              <DynamicTableMorphWidget
                currentTable="A1"
                diningMode="dine_in"
                isMerchantView={true}
                showToast={showToast}
              />
            </div>

            <MerchantTables
              tables={scopedTables}
              orders={scopedOrders}
              menuItems={dishes}
              onOpenTable={handleOpenTable}
              onCheckoutTable={handleCheckoutTable}
              onTransferTable={handleTransferTable}
              onReleaseTable={handleReleaseTable}
              onUpdateTable={handleUpdateTable}
              onSyncOrderItems={onSyncOrderItems}
              onVoidTableOrder={handleVoidTableOrder}
              showToast={showToast}
            />
            {/* T3：桌台会话监测台（L1/L2/L3 三层下钻 + 商家兜底队列） */}
            <MerchantTableSessionMonitor
              showToast={showToast}
              onOpenVersionTracking={() => setActiveTab('version_tracking')}
            />
            {/* T3：桌码管理（轮换/启停/打印） */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsQrManageOpen(true)}
                className="h-9 px-4 rounded-console bg-dark-container hover:bg-neutral-800 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-accent-orange" />
                <span>桌码与二维码管理</span>
              </button>
            </div>
            <MerchantQrManageModal
              open={isQrManageOpen}
              onClose={() => setIsQrManageOpen(false)}
              showToast={showToast}
            />
          </>
        )}

        {activeTab === 'orders' && (
          <MerchantOrders
            orders={scopedOrders}
            onAcceptOrder={handleAcceptOrder}
            onAdvanceOrderStatus={onAdvanceOrderStatus}
            onRejectOrder={handleRejectOrder}
            onDeleteOrder={handleDeleteOrder}
            onAuditRefund={onAuditRefund}
            onToggleNonRefundable={onToggleNonRefundable}
            showToast={showToast}
          />
        )}

        {activeTab === 'contingency' && (
          <MerchantContingencyHub
            orders={scopedOrders}
            onAdvanceOrderStatus={onAdvanceOrderStatus}
            onAuditRefund={onAuditRefund}
            showToast={showToast}
          />
        )}

        {activeTab === 'kds' && (
          <MerchantKDS
            tickets={tickets}
            onFinishTicket={handleFinishTicket}
            onDeleteTicket={handleDeleteTicket}
            onToggleItemComplete={handleToggleItemComplete}
            onBatchFinishDish={handleBatchFinishDish}
            showToast={showToast}
          />
        )}

        {activeTab === 'calling' && (
          <MerchantCallingHub
            orders={scopedOrders}
            showToast={showToast}
          />
        )}

        {activeTab === 'printing' && (
          <MerchantPrintingHub
            orders={scopedOrders}
            dishes={dishes}
            showToast={showToast}
          />
        )}

        {activeTab === 'held' && (
          <MerchantHeldOrders
            heldOrders={heldOrders}
            onResumeCheckout={handleResumeCheckout}
            onSendReminder={handleSendReminder}
            onConvertToTakeaway={handleConvertToTakeaway}
            onVoidOrder={handleVoidOrder}
            showToast={showToast}
          />
        )}

        {activeTab === 'materials' && (
          <MaterialView
            showToast={showToast}
          />
        )}

        {activeTab === 'craft_standards' && (
          <CraftStandardView
            showToast={showToast}
          />
        )}

        {activeTab === 'processing_loss' && (
          <ProcessingLossView
            showToast={showToast}
          />
        )}

        {activeTab === 'inventory_close' && (
          <InventoryView
            showToast={showToast}
          />
        )}

        {activeTab === 'sku_params' && (
          <SkuManagementView
            showToast={showToast}
          />
        )}

        {activeTab === 'loss' && (
          <MerchantLossHub
            showToast={showToast}
          />
        )}

        {activeTab === 'inventory' && (
          <MerchantInventory
            showToast={showToast}
            dishes={dishes}
          />
        )}

        {activeTab === 'sop' && (
          <MerchantCraftSOP
            showToast={showToast}
          />
        )}

        {activeTab === 'shifts' && (
          <MerchantShiftRefund
            showToast={showToast}
            orders={localOrders}
            onAuditRefund={onAuditRefund}
          />
        )}

        {activeTab === 'staff' && (
          <MerchantStaffHub
            showToast={showToast}
          />
        )}

        {activeTab === 'cloud_sync' && (
          <MerchantCloudSyncView
            showToast={showToast}
          />
        )}

        {activeTab === 'version_tracking' && (
          <MerchantVersionTrackingView
            showToast={showToast}
          />
        )}

        {activeTab === 'sentinel' && (
          <AutomatedSentinelDashboard
            showToast={showToast}
          />
        )}

        {activeTab === 'audit' && (
          <MerchantAuditLog
            showToast={showToast}
          />
        )}

        {activeTab === 'marketing' && (
          <MerchantMarketingHub
            showToast={showToast}
          />
        )}

        {activeTab === 'category_brands' && (
          <MerchantCategoryBrandSettings
            showToast={showToast}
          />
        )}

        {activeTab === 'truck_expand' && (
          <MerchantTruckExpandSettings
            showToast={showToast}
          />
        )}

        {activeTab === 'members' && (
          <MerchantMemberCRM
            showToast={showToast}
          />
        )}

        {activeTab === 'gps' && (
          <MerchantStallGPS
            truck={truck}
            onUpdateLocation={handleUpdateGPS}
            showToast={showToast}
          />
        )}

        {activeTab === 'user_data_mgmt' && (
          <MerchantUserDataCenter
            showToast={showToast}
          />
        )}

        {activeTab === 'menu' && (
          <MerchantMenuChannel
            dishes={dishes}
            onToggleAvailability={handleToggleAvailability}
            onAddNewDish={handleAddNewDish}
            onUpdateDish={handleUpdateDish}
            onBulkUpdateDishes={onUpdateDishes}
            onRematchAllImages={handleRematchAllImages}
            showToast={showToast}
          />
        )}

        {activeTab === 'scanner' && (
          <MerchantScannerConsole
            dishes={dishes}
            orders={localOrders}
            tables={tables}
            onDishScanned={(scannedDish) => {
              showToast(`[扫码枪] 识别菜品: ${scannedDish.name} (¥${scannedDish.price.toFixed(2)})`);
            }}
            showToast={showToast}
          />
        )}

        {activeTab === 'payment_channels' && (
          <MerchantPaymentChannels
            showToast={showToast}
            truckName={activeTruckConfig?.truckName}
          />
        )}

        {activeTab === 'analytics' && (
          <MerchantAnalytics
            orders={scopedOrders}
            dishes={dishes}
            showToast={showToast}
            onOpenMasterControl={() => setActiveTab('master_control')}
          />
        )}

        {activeTab === 'operations_deck' && (
          <MerchantOperationsDeck
            orders={scopedOrders}
            tables={tables}
            selectedTruckId={selectedTruckId}
            onSelectTruckId={(tid) => handleSelectTruck(tid)}
            showToast={showToast}
          />
        )}

        {activeTab === 'precision_console' && (
          <MerchantPrecisionConsole
            selectedTruckId={selectedTruckId}
            onStationSelect={(stNum) => setSelectedTruckId(`truck-0${stNum}`)}
          />
        )}

        {activeTab === 'master_control' && (
          <MerchantMasterControlCenter
            orders={scopedOrders}
            dishes={dishes}
            showToast={showToast}
            onDataRestored={() => {
              showToast('数据已从快照恢复！全系统状态重新校准。');
            }}
          />
        )}
            </>
          );
        })()}
          </div>
          </main>


          {/* 3.5. 嵌入主内容区底部的直立底部导航栏 (直立无圆角·工整直角·移动端内嵌) */}
          <nav
            id="merchant-embedded-bottom-nav"
            aria-label="商家端内嵌底部导航栏"
            className="md:hidden shrink-0 w-full bg-white border-t border-[#d3d1cb] z-20 select-none shadow-[0_-2px_6px_rgba(0,0,0,0.03)] rounded-none"
          >
            <div className="grid grid-cols-5 divide-x divide-[#ebebe8] h-12 w-full">
              {/* 0. 菜单 (触发侧边栏打开与关闭) */}
              <button
                type="button"
                id="merchant-nav-tab-menu"
                onClick={handleToggleSidebar}
                title={isMobileSidebarOpen || !isSidebarCollapsed ? '关闭侧边栏' : '打开侧边栏'}
                className={`h-full rounded-none flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer select-none relative ${
                  isSidebarActive
                    ? 'bg-[#2b593f] text-white'
                    : 'bg-white text-[#5a5854] hover:bg-[#f7f7f5] hover:text-[#1a1c1b] active:bg-[#efefed]'
                }`}
              >
                <MenuIcon className={`w-4 h-4 shrink-0 ${isSidebarActive ? 'text-white' : 'text-[#6a6864]'}`} />
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">菜单</span>
              </button>

              {/* 1. 菜品管理 */}
              <button
                type="button"
                id="merchant-nav-tab-dish"
                onClick={() => {
                  setActiveTab('menu');
                  setIsMobileSidebarOpen(false);
                }}
                className={`h-full rounded-none flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer select-none relative ${
                  isDishActive && !isSidebarActive
                    ? 'bg-[#2b593f] text-white'
                    : 'bg-white text-[#5a5854] hover:bg-[#f7f7f5] hover:text-[#1a1c1b] active:bg-[#efefed]'
                }`}
              >
                <UtensilsCrossed className={`w-4 h-4 shrink-0 ${isDishActive && !isSidebarActive ? 'text-white' : 'text-[#6a6864]'}`} />
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">菜品管理</span>
              </button>

              {/* 2. 订单 */}
              <button
                type="button"
                id="merchant-nav-tab-orders"
                onClick={() => {
                  setActiveTab('orders');
                  setIsMobileSidebarOpen(false);
                }}
                className={`h-full rounded-none flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer select-none relative ${
                  isOrdersActive && !isSidebarActive
                    ? 'bg-[#2b593f] text-white'
                    : 'bg-white text-[#5a5854] hover:bg-[#f7f7f5] hover:text-[#1a1c1b] active:bg-[#efefed]'
                }`}
              >
                <div className="relative">
                  <ShoppingBag className={`w-4 h-4 shrink-0 ${isOrdersActive && !isSidebarActive ? 'text-white' : 'text-[#6a6864]'}`} />
                  {cookingOrdersCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-3.5 flex items-center justify-center text-[9px] font-bold font-mono bg-[#eb5757] text-white rounded-[2px] leading-none shadow-2xs">
                      {cookingOrdersCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">订单</span>
              </button>

              {/* 3. 风控 */}
              <button
                type="button"
                id="merchant-nav-tab-risk"
                onClick={() => {
                  setActiveTab('contingency');
                  setIsMobileSidebarOpen(false);
                }}
                className={`h-full rounded-none flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer select-none relative ${
                  isRiskActive && !isSidebarActive
                    ? 'bg-[#2b593f] text-white'
                    : 'bg-white text-[#5a5854] hover:bg-[#f7f7f5] hover:text-[#1a1c1b] active:bg-[#efefed]'
                }`}
              >
                <div className="relative">
                  <ShieldAlert className={`w-4 h-4 shrink-0 ${isRiskActive && !isSidebarActive ? 'text-white' : 'text-[#d97706]'}`} />
                  {riskAlertCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-3.5 flex items-center justify-center text-[9px] font-bold font-mono bg-[#d97706] text-white rounded-[2px] leading-none shadow-2xs">
                      {riskAlertCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">风控</span>
              </button>

              {/* 4. 联络 */}
              <button
                type="button"
                id="merchant-nav-tab-chat"
                onClick={() => {
                  setIsOmniChatHubOpen(true);
                  setIsMobileSidebarOpen(false);
                }}
                className={`h-full rounded-none flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer select-none relative ${
                  isOmniChatHubOpen
                    ? 'bg-[#2b593f] text-white'
                    : 'bg-white text-[#5a5854] hover:bg-[#f7f7f5] hover:text-[#1a1c1b] active:bg-[#efefed]'
                }`}
              >
                <div className="relative">
                  <MessageSquareText className={`w-4 h-4 shrink-0 ${isOmniChatHubOpen ? 'text-white' : 'text-[#6a6864]'}`} />
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#4dab63] ring-1.5 ring-white" />
                </div>
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">联络</span>
              </button>
            </div>
          </nav>

          {/* 4. Desktop Workstation Bottom Status Bar (Hidden on Mobile) */}
          <footer className="hidden md:flex h-7 shrink-0 bg-[#ffffff] border-t border-[#e6e6e4] px-3 lg:px-4 items-center justify-between text-[11px] text-[#787774] font-medium z-10 select-none">
            {/* Left: System Readiness & Connectivity */}
            <div className="flex items-center gap-2 lg:gap-3 min-w-0">
              <div className="flex items-center gap-1 text-emerald-700 font-semibold shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>POS 实时联机</span>
              </div>
              <span className="text-[#d3d1cb]">|</span>
              <div className="flex items-center gap-1 text-[#5a5854] shrink-0">
                <Truck className="w-3 h-3 text-[#2b593f]" />
                <span className="truncate">{getUnifiedTruckName(selectedTruckId, 'standard')}</span>
                <span className={`text-[9.5px] px-1 py-0.1 rounded font-mono ${
                  businessStatus.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {businessStatus.isOpen ? '营业中' : '已打烊'}
                </span>
              </div>
              <span className="text-[#d3d1cb] hidden lg:inline">|</span>
              <div className="hidden lg:flex items-center gap-1 text-[#5a5854] shrink-0">
                <Cloud className="w-3 h-3 text-sky-600" />
                <span>腾讯云 CloudBase 已就绪</span>
              </div>
              <span className="text-[#d3d1cb] hidden xl:inline">|</span>
              <div className="hidden xl:flex items-center gap-1 text-[#5a5854] shrink-0">
                <Barcode className="w-3 h-3 text-emerald-600" />
                <span>扫码枪即插即用</span>
              </div>
            </div>

            {/* Center / Right: Module hint & Operator & Live Clock */}
            <div className="flex items-center gap-2 lg:gap-3 shrink-0">
              <span className="hidden xl:inline text-[#9b9a97] font-mono text-[10.5px]">
                快捷键: Alt+1~4 切换模块组 | Ctrl+Shift+D 调试中枢
              </span>
              <span className="text-[#d3d1cb] hidden xl:inline">|</span>
              <div className="flex items-center gap-1 text-[#37352f]">
                <Smartphone className="w-3 h-3 text-[#2b593f]" />
                <span>{merchantSession?.name || '张伟 (店长)'}</span>
              </div>
              <span className="text-[#d3d1cb]">|</span>
              <div className="flex items-center gap-1 font-mono text-[#5a5854] font-bold">
                <Clock className="w-3 h-3 text-[#787774]" />
                <span>{currentTime}</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Omni Aggregated Chat Hub Modal */}
      {isOmniChatHubOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-[4px] max-w-5xl w-full h-[88vh] border border-[#e9e9e7] shadow-2xl overflow-hidden flex flex-col">
            <OmniAggregatedChatHub
              orders={localOrders}
              viewerRole="merchant"
              onAdvanceOrderStatus={onAdvanceOrderStatus}
              onRejectOrder={onRejectOrder}
              onAuditRefund={onAuditRefund}
              showToast={showToast}
              onClose={() => setIsOmniChatHubOpen(false)}
              isModalMode={true}
            />
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 right-5 z-50 bg-[#201f1d] text-white px-4 py-2.5 rounded-[3px] shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150 border border-white/10">
          <Sparkles className="w-4 h-4 text-[#fde047]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cloudbase Sync Modal */}
      <CloudbaseStatusModal
        isOpen={isCloudbaseModalOpen}
        onClose={() => setIsCloudbaseModalOpen(false)}
        dishes={dishes}
        orders={localOrders}
        onDishesUpdated={(updatedDishes) => {
          if (onUpdateDishes) {
            onUpdateDishes(updatedDishes);
          }
        }}
        isConnected={true}
      />

      {/* Order History Messages Form Modal */}
      <OrderHistoryMessagesModal
        isOpen={isMessageFormModalOpen}
        onClose={() => setIsMessageFormModalOpen(false)}
        orders={localOrders}
        dishes={dishes}
        viewerRole="merchant"
        onAdvanceOrderStatus={onAdvanceOrderStatus}
        onRejectOrder={onRejectOrder}
        onAuditRefund={onAuditRefund}
        showToast={showToast}
      />

      {/* Bluetooth Speaker Link & Binding System Modal */}
      <BluetoothSpeakerModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
        showToast={showToast}
      />

      {/* Business Status Master Toggle & Setting Modal */}
      <BusinessStatusModal
        isOpen={isBusinessStatusModalOpen}
        onClose={() => setIsBusinessStatusModalOpen(false)}
        truckId={selectedTruckId}
        truckName={getUnifiedTruckName(selectedTruckId, 'standard')}
        allTrucks={merchantTruckConfigs}
        onStatusChanged={(newStatus) => {
          setBusinessStatusState(newStatus);
        }}
      />

      {/* Merchant Hardware & Multi-Terminal Hub Modal */}
      <MerchantHardwareHubModal
        isOpen={isHardwareHubOpen}
        onClose={() => setIsHardwareHubOpen(false)}
        activeBtDevice={activeBtDevice}
        btConfig={btConfig}
        onOpenBluetoothModal={() => setIsBluetoothModalOpen(true)}
        onOpenScanner={() => {
          setActiveTab('scanner');
          showToast('已切换至智能扫码枪硬件控制台');
        }}
        onOpenMessageForm={() => setIsMessageFormModalOpen(true)}
        onOpenCloudbaseModal={() => setIsCloudbaseModalOpen(true)}
        onOpenQuickCall={() => setIsQuickCallModalOpen(true)}
        onSwitchToRider={() => onSwitchRole('rider')}
        merchantSession={merchantSession}
        onOpenPhoneAuth={onOpenPhoneAuth}
        onLogoutMerchant={onLogoutMerchant}
        showToast={showToast}
        maskPhoneNumber={maskPhoneNumber}
      />

      {/* Franchise HQ & Multi-Tenant Governance Modal */}
      <FranchiseHQModal
        isOpen={isFranchiseHQModalOpen}
        onClose={() => setIsFranchiseHQModalOpen(false)}
        dishes={dishes}
        showToast={showToast}
        onSelectTruck={handleSelectTruck}
      />

      {/* 方案 C：全局顶部常驻即时喊号浮窗 (全域呼叫广播中枢) */}
      <GlobalQuickCallModal
        isOpen={isQuickCallModalOpen}
        onClose={() => setIsQuickCallModalOpen(false)}
        orders={scopedOrders}
        showToast={showToast}
      />

      {/* 员工在岗交接班与即时岗位权限换乘弹窗 */}
      <StaffShiftHandoverModal
        isOpen={isShiftHandoverOpen}
        onClose={() => setIsShiftHandoverOpen(false)}
        currentSession={merchantSession || null}
        onHandoverSuccess={() => {
          setForceRbacTick((t) => t + 1);
        }}
        showToast={showToast}
      />

      {/* 机电指令中枢 (Command+K 全局指令台) */}
      <GlobalTacticalCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={(tabId) => {
          setActiveTab(tabId as MerchantTab);
          setIsCommandPaletteOpen(false);
        }}
        showToast={showToast}
      />

      {/* UIverse.io 动态组件对接与自动匹配中枢 */}
      <UiverseDynamicStudioModal
        isOpen={isUiverseStudioOpen}
        onClose={() => setIsUiverseStudioOpen(false)}
        currentSkin={uiverseSkin}
        onSelectSkin={(newSkin) => {
          setUiverseSkin(newSkin);
        }}
        onShowToast={showToast}
      />
    </div>
  );
};
