import React, { useState, useRef, useEffect } from 'react';
import {
  Bike,
  Zap,
  Radio,
  Wallet,
  ArrowLeft,
  Store,
  Sparkles,
  MapPin,
  CheckCircle2,
  ChevronDown,
  Check,
  History,
  Award,
  Thermometer,
  CloudRain,
  Menu as MenuIcon,
  Smartphone,
  Fingerprint,
  Building2,
  BatteryCharging,
  ShieldAlert
} from 'lucide-react';
import { RiderSession, maskPhoneNumber } from '../../utils/staffAndRiderAuthEngine';
import { TruckInfo, Order, PoolDeliveryOrder, ActiveDeliveryOrder } from '../../types';
import { INITIAL_POOL_ORDERS, INITIAL_ACTIVE_DELIVERY } from '../../data/posMockData';
import {
  DeliveryWaypoint,
  KdsPrepStatus,
  ThermalBoxState,
  RiderLevelInfo,
  RiderQuest,
  HistoricalDelivery
} from '../../types/rider';
import { isOrderMatch, normalizeOrderKey, isOrderExcludedFromRider, resolveOrderChannelType } from '../../utils/orderNormalizer';
import { voiceAlerts } from '../../utils/voiceAlertEngine';

import { RiderActiveTask } from './RiderActiveTask';
import { RiderOrderPool } from './RiderOrderPool';
import { RiderRadarProximity } from './RiderRadarProximity';
import { RiderEarnings } from './RiderEarnings';
import { RiderSmartRouteElevatorHUD } from './RiderSmartRouteElevatorHUD';
import { RiderBatterySwapMap } from './RiderBatterySwapMap';
import { RiderIncidentWaiverModal } from './RiderIncidentWaiverModal';
import { RiderSidebar, RiderTabItemConfig } from './RiderSidebar';
import { FloatingChatBubbleWidget } from '../chat/FloatingChatBubbleWidget';
import { OmniAggregatedChatHub } from '../chat/OmniAggregatedChatHub';

interface RiderSystemViewProps {
  truck: TruckInfo;
  orders: Order[];
  onAdvanceOrderStatus: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onUpdateTruckLocation?: (newLocation: string, radiusKm: number) => void;
  onSwitchRole: (role: 'customer' | 'merchant' | 'rider') => void;
  riderSession?: RiderSession | null;
  onOpenPhoneAuth?: () => void;
  onLogoutRider?: () => void;
}

export type RiderTab =
  | 'active'
  | 'pool'
  | 'route_hud'
  | 'battery_swap'
  | 'radar'
  | 'earnings'
  | 'waiver_pool';

// Initial Multi-Order Queue (Pre-assigning UR-9821 and UR-98215)
const INITIAL_ACTIVE_ORDERS: ActiveDeliveryOrder[] = [
  INITIAL_ACTIVE_DELIVERY,
  {
    id: 'ord-98215',
    orderNo: 'UR-98215',
    userId: 'tcb_u_88201948',
    phase: 'dropoff',
    truckName: '黑曜石 01 号流动餐车',
    truckAddress: '西藏北路曲阜路交叉口 · 大悦城南广场',
    truckDistanceMeters: 180,
    customerName: '先锋食客 · 墨客 (VIP)',
    customerPhone: '138-8888-9201',
    deliveryAddress: '西藏北路 166 号大悦城商务座 1204 室',
    addressDistanceKm: 0.52,
    items: [
      { name: '极炙炭烤和牛排 (300g)', quantity: 1, price: 188.0, checked: true },
      { name: '碳烤和牛小汉堡双重奏', quantity: 1, price: 63.0, checked: true },
      { name: '暗夜虚空冷萃浓缩咖啡', quantity: 2, price: 28.0, checked: true }
    ],
    totalPrice: 307.0,
    courierEarnings: 15.0,
    customerNote: '前台有门禁，放置前台取餐架并拍照通知即可，谢谢！',
    etaMinutes: 6,
    speedKmh: 22,
    routeProgress: 75
  },
  {
    id: 'del-active-2',
    orderNo: 'UR-9804',
    userId: 'tcb_u_88201948',
    phase: 'pickup',
    truckName: '黑曜石 01 号流动餐车',
    truckAddress: '西藏北路曲阜路交叉口 · 大悦城南广场',
    truckDistanceMeters: 220,
    customerName: '先锋食客 · 墨客',
    customerPhone: '138-8888-9201',
    deliveryAddress: '西藏北路 166 号大悦城商务座 1204 室',
    addressDistanceKm: 0.52,
    items: [
      { name: '果木烟熏黑豚炙烤五花', quantity: 1, price: 55.0, checked: false },
      { name: '黑曜石松露金黄脆薯', quantity: 1, price: 32.0, checked: true }
    ],
    totalPrice: 87.0,
    courierEarnings: 10.5,
    customerNote: '前台有门禁，到楼下请先电话联系我下楼。',
    etaMinutes: 14,
    speedKmh: 19,
    routeProgress: 20
  }
];

// Initial IoT State
const INITIAL_IOT_STATE: ThermalBoxState = {
  hotZoneTemp: 68.4,
  hotZoneTarget: 70.0,
  hotZoneStatus: 'optimal',
  coldZoneTemp: 2.8,
  coldZoneTarget: 2.0,
  coldZoneStatus: 'optimal',
  lidClosed: true,
  batterySoc: 82,
  batteryRangeKm: 34,
  nearbySwapStations: [
    { name: '铁塔换电 24h 智能站 (大悦城北门)', distanceMeters: 180, availableBatteries: 6 },
    { name: '小哈换电柜 (西藏北路地铁站 2 号口)', distanceMeters: 360, availableBatteries: 4 }
  ]
};

// Initial KDS Status
const INITIAL_KDS_STATUSES: Record<string, KdsPrepStatus> = {
  'del-active-1': {
    orderId: 'del-active-1',
    orderNo: '#DEL-8821',
    dishName: '碳烤和牛小汉堡双重奏',
    progressPercent: 95,
    remainingSeconds: 30,
    station: '打包出餐架',
    statusText: '已装入双层保温袋',
    pickupShelfCode: '01 号保温取餐格'
  },
  'del-active-2': {
    orderId: 'del-active-2',
    orderNo: '#DEL-8822',
    dishName: '极炙和牛拼盘 (双人份)',
    progressPercent: 70,
    remainingSeconds: 120,
    station: '炭烤炉台',
    statusText: '主厨炭火炙烤中',
    pickupShelfCode: '03 号保温取餐格'
  }
};

// Initial Quests
const INITIAL_QUESTS: RiderQuest[] = [
  {
    id: 'q-1',
    title: '餐车极速先锋',
    desc: '今日完成 5 笔流动餐车高客单专送',
    rewardText: '+¥15 现金补贴',
    currentCount: 3,
    targetCount: 5,
    isClaimed: false,
    isCompleted: false
  },
  {
    id: 'q-2',
    title: '品质锁鲜 100%',
    desc: '保持妥投实景照片拍摄存证合规',
    rewardText: '免罚保护卡 x1',
    currentCount: 3,
    targetCount: 3,
    isClaimed: false,
    isCompleted: true
  },
  {
    id: 'q-3',
    title: '五星好评达人',
    desc: '累计收获 3 个顾客五星温度锁鲜好评',
    rewardText: '+¥10 餐补券',
    currentCount: 2,
    targetCount: 3,
    isClaimed: false,
    isCompleted: false
  }
];

// Initial Level
const INITIAL_LEVEL_INFO: RiderLevelInfo = {
  levelTitle: '黑曜石王牌骑士',
  levelGrade: 5,
  currentExp: 4280,
  nextLevelExp: 5000,
  totalOrdersDelivered: 1248,
  onTimeRate: 99.8,
  fiveStarRating: 4.99,
  streakDays: 42
};

// Initial History Delivery List
const INITIAL_HISTORY: HistoricalDelivery[] = [
  {
    id: 'hist-1',
    orderNo: '#DEL-8818',
    completedTime: '17:35',
    customerName: '张总 (星空影院)',
    deliveryAddress: '静安大悦城 8 楼影院 3 号检票口',
    itemsSummary: '黑松露炭烤和牛汉堡 x2 + 冷萃咖啡 x2',
    durationMinutes: 11,
    distanceKm: 0.48,
    earnings: 9.5,
    rating: 5,
    tags: ['超快送达', '餐品滚烫', '保温袋完好']
  },
  {
    id: 'hist-2',
    orderNo: '#DEL-8815',
    completedTime: '16:50',
    customerName: '刘女士 (河滨花园)',
    deliveryAddress: '曲阜路 58 弄河滨花园 3 号楼 601',
    itemsSummary: '果木烟熏黑豚五花 x1 + 提拉米苏 x1',
    durationMinutes: 13,
    distanceKm: 1.2,
    earnings: 13.0,
    rating: 5,
    tags: ['态度极好', '包装严实']
  },
  {
    id: 'hist-3',
    orderNo: '#DEL-8812',
    completedTime: '15:20',
    customerName: '赵先生',
    deliveryAddress: '大悦城北座写字楼 7F 创新中心',
    itemsSummary: '黑松露墨汁手工玉棋 x2',
    durationMinutes: 9,
    distanceKm: 0.35,
    earnings: 8.5,
    rating: 5,
    tags: ['秒送达', '品质极高']
  }
];

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

// Helper for deduplicating pool orders
function deduplicatePoolOrders(list: PoolDeliveryOrder[]): PoolDeliveryOrder[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = normalizeOrderKey(item.orderNo || item.id);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateActiveOrders(list: ActiveDeliveryOrder[]): ActiveDeliveryOrder[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = normalizeOrderKey(item.orderNo || item.id);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const RiderSystemView: React.FC<RiderSystemViewProps> = ({
  truck,
  orders,
  onAdvanceOrderStatus,
  onSwitchRole,
  riderSession,
  onOpenPhoneAuth,
  onLogoutRider
}) => {
  const [activeTab, setActiveTabInternal] = useState<RiderTab>(() => {
    return safeGetStorage<RiderTab>('obsidian_rider_active_tab', 'active');
  });

  const setActiveTab = (tab: RiderTab) => {
    setActiveTabInternal(tab);
    safeSetStorage('obsidian_rider_active_tab', tab);
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() =>
    safeGetStorage<boolean>('obsidian_rider_sidebar_collapsed', false)
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Multi-Task & Global Rider State (with local persistence & deduplication)
  const [activeOrders, setActiveOrders] = useState<ActiveDeliveryOrder[]>(() =>
    deduplicateActiveOrders(safeGetStorage<ActiveDeliveryOrder[]>('obsidian_rider_active_orders', INITIAL_ACTIVE_ORDERS))
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string>(() => {
    const saved = safeGetStorage<ActiveDeliveryOrder[]>('obsidian_rider_active_orders', INITIAL_ACTIVE_ORDERS);
    return saved[0]?.id || INITIAL_ACTIVE_ORDERS[0]?.id || '';
  });
  const [poolOrders, setPoolOrders] = useState<PoolDeliveryOrder[]>(() =>
    deduplicatePoolOrders(safeGetStorage<PoolDeliveryOrder[]>('obsidian_rider_pool_orders', INITIAL_POOL_ORDERS))
  );
  const [isOmniChatHubOpen, setIsOmniChatHubOpen] = useState<boolean>(false);

  // IoT & Vehicle state
  const [iotState, setIotState] = useState<ThermalBoxState>(() =>
    safeGetStorage<ThermalBoxState>('obsidian_rider_iot_state', INITIAL_IOT_STATE)
  );
  const [levelInfo, setLevelInfo] = useState<RiderLevelInfo>(() =>
    safeGetStorage<RiderLevelInfo>('obsidian_rider_level_info', INITIAL_LEVEL_INFO)
  );
  const [quests, setQuests] = useState<RiderQuest[]>(() =>
    safeGetStorage<RiderQuest[]>('obsidian_rider_quests', INITIAL_QUESTS)
  );
  const [historyList, setHistoryList] = useState<HistoricalDelivery[]>(() =>
    safeGetStorage<HistoricalDelivery[]>('obsidian_rider_history', INITIAL_HISTORY)
  );

  // Weather & Surge Pricing
  const [isBadWeather, setIsBadWeather] = useState<boolean>(false);
  const surgeBonusAmount = 3.5;

  // Rider Auto-Accept / Auto-Grab switch (Default: FALSE - orders remain in pool as 待取件 / 待接单)
  const [isAutoAcceptRider, setIsAutoAcceptRider] = useState<boolean>(() =>
    safeGetStorage<boolean>('obsidian_rider_auto_accept', false)
  );

  // Persist states to storage
  useEffect(() => {
    safeSetStorage('obsidian_rider_auto_accept', isAutoAcceptRider);
  }, [isAutoAcceptRider]);

  useEffect(() => {
    safeSetStorage('obsidian_rider_sidebar_collapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  useEffect(() => {
    safeSetStorage('obsidian_rider_active_orders', activeOrders);
  }, [activeOrders]);

  useEffect(() => {
    safeSetStorage('obsidian_rider_pool_orders', poolOrders);
  }, [poolOrders]);

  useEffect(() => {
    safeSetStorage('obsidian_rider_history', historyList);
  }, [historyList]);

  useEffect(() => {
    safeSetStorage('obsidian_rider_iot_state', iotState);
  }, [iotState]);

  useEffect(() => {
    safeSetStorage('obsidian_rider_quests', quests);
  }, [quests]);

  useEffect(() => {
    safeSetStorage('obsidian_rider_level_info', levelInfo);
  }, [levelInfo]);

  // Dynamically synchronize customer orders with Rider tasks and pool
  useEffect(() => {
    // 1. Check completed or non-delivery orders (堂食与自提订单严格禁止流入骑手端)
    const isExcludedFromRider = (identifier: string) => {
      return orders.some((o) => {
        if (!isOrderMatch(o, identifier)) return false;
        if (o.status === 'completed' || o.stepIndex === 4) return true;
        // 堂食与自提订单必须从骑手端排除 (除非商家手动审核转为外卖)
        return isOrderExcludedFromRider(o);
      });
    };

    setActiveOrders((prevActive) => {
      let changed = false;
      const nextActive = prevActive.filter((ao) => {
        if (isExcludedFromRider(ao.orderNo || ao.id)) {
          changed = true;
          return false;
        }
        return true;
      });
      return changed ? deduplicateActiveOrders(nextActive) : prevActive;
    });

    setPoolOrders((prevPool) => {
      let changed = false;
      const nextPool = prevPool.filter((po) => {
        if (isExcludedFromRider(po.orderNo || po.id)) {
          changed = true;
          return false;
        }
        return true;
      });
      return changed ? deduplicatePoolOrders(nextPool) : prevPool;
    });

    // 2. Check in-progress customer orders (严格过滤：仅限外卖配送单 delivery，排除堂食 dine_in 与自提 pickup)
    const inProgress = orders.filter((o) => {
      if (isOrderExcludedFromRider(o)) {
        return false;
      }
      return o.status === 'cooking' || o.status === 'delivering' || o.status === 'ready';
    });
    if (inProgress.length === 0) return;

    setActiveOrders((prevActive) => {
      const active = [...prevActive];
      let updated = false;

      for (const ord of inProgress) {
        const key = normalizeOrderKey(ord.orderNo || ord.id);
        const existingIdx = active.findIndex((a) => isOrderMatch(a, key));
        const shouldBeActive = isAutoAcceptRider || ord.status === 'delivering' || ord.courierId === 'rider-8821' || key === '9821' || key === '98215';

        if (existingIdx >= 0) {
          const existing = active[existingIdx];
          const newPhase = ord.status === 'delivering' ? 'dropoff' : 'pickup';
          if (existing.phase !== newPhase || (ord.etaMinutes !== undefined && existing.etaMinutes !== ord.etaMinutes)) {
            active[existingIdx] = {
              ...existing,
              phase: newPhase,
              etaMinutes: ord.etaMinutes || existing.etaMinutes,
              routeProgress: ord.status === 'delivering' ? 75 : 25,
              items: existing.items.map((it) => ({
                ...it,
                checked: ord.status === 'delivering' ? true : it.checked
              }))
            };
            updated = true;
          }
        } else if (shouldBeActive && active.length < 5) {
          active.push({
            id: ord.id,
            orderNo: ord.orderNo || ord.id,
            truckId: ord.truckId || 'truck-01',
            userId: ord.userId,
            phase: ord.status === 'delivering' ? 'dropoff' : 'pickup',
            truckName: ord.truckName || truck.name || '黑曜石 01 号流动餐车',
            truckAddress: truck.currentLocationName || '西藏北路曲阜路交叉口 · 大悦城南广场',
            truckDistanceMeters: 180,
            customerName: ord.customerName || '先锋食客',
            customerPhone: ord.userPhone || '138-8888-9201',
            deliveryAddress: ord.deliveryAddress || '西藏北路 166 号大悦城商务座',
            addressDistanceKm: 0.85,
            items: ord.items.map((it) => ({
              name: it.name,
              quantity: it.quantity,
              price: it.price,
              checked: ord.status === 'delivering'
            })),
            totalPrice: ord.totalAmount,
            courierEarnings: ord.riderDeliveryFee || Math.max(9.5, Math.round(ord.totalAmount * 0.12 * 10) / 10),
            customerNote: '餐品新鲜炙烤，保温箱锁鲜专送',
            etaMinutes: ord.etaMinutes || 10,
            speedKmh: 21,
            routeProgress: ord.status === 'delivering' ? 65 : 20
          });
          updated = true;
        }
      }
      return updated ? deduplicateActiveOrders(active) : prevActive;
    });

    // Also populate pool orders for orders not yet active
    setPoolOrders((prevPool) => {
      const pool = [...prevPool];
      let updated = false;

      for (const ord of inProgress) {
        const key = normalizeOrderKey(ord.orderNo || ord.id);
        const inActive = activeOrders.some((a) => isOrderMatch(a, key));
        const inHistory = historyList.some((h) => isOrderMatch(h, key));
        const inPool = pool.some((p) => isOrderMatch(p, key));

        if (!inActive && !inHistory && !inPool && ord.status !== 'completed') {
          pool.unshift({
            id: ord.id,
            orderNo: ord.orderNo.startsWith('#') ? ord.orderNo : `#${ord.orderNo}`,
            truckId: ord.truckId || 'truck-01',
            originName: ord.truckName || truck.name || '黑曜石 01 号流动餐车',
            originAddress: truck.currentLocationName,
            distanceToOriginMeters: 180,
            destinationName: '顾客专送点',
            destinationAddress: ord.deliveryAddress || '西藏北路 166 号大悦城',
            distanceKm: 0.95,
            itemsSummary: ord.items.map((i) => `${i.name} x${i.quantity}`).join(', '),
            itemCount: ord.items.reduce((s, i) => s + i.quantity, 0),
            estimatedEarnings: ord.riderDeliveryFee || Math.max(9.5, Math.round(ord.totalAmount * 0.12 * 10) / 10),
            baseFee: 7.0,
            distanceFee: 2.5,
            truckSubsidy: 3.0,
            isTruckSpecial: true,
            urgentTag: ord.status === 'cooking' ? '待取件 (后厨备餐)' : '待取件 (闪送专送)',
            publishedTimeAgo: '刚刚',
            expectedDeliveryTime: '15 分钟内'
          });
          updated = true;
        }
      }
      return updated ? deduplicatePoolOrders(pool) : prevPool;
    });
  }, [orders, truck, isAutoAcceptRider]);

  // Keep selectedOrderId valid
  useEffect(() => {
    if (activeOrders.length > 0 && !activeOrders.some((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(activeOrders[0].id);
    }
  }, [activeOrders, selectedOrderId]);

  // Dynamic KDS Statuses for all active tasks
  const kdsStatuses: Record<string, KdsPrepStatus> = {};
  activeOrders.forEach((ord) => {
    const isDropoff = ord.phase === 'dropoff';
    kdsStatuses[ord.id] = {
      orderId: ord.id,
      orderNo: `#${ord.orderNo.replace('#', '')}`,
      dishName: ord.items[0]?.name || '黑曜石炙烤和牛餐品',
      progressPercent: isDropoff ? 100 : Math.max(70, ord.routeProgress || 70),
      remainingSeconds: isDropoff ? 0 : 45,
      station: isDropoff ? '骑手保温箱' : '打包出餐架',
      statusText: isDropoff ? '已装入双层保温袋' : '主厨炭火炙烤中',
      pickupShelfCode: '02 号保温取餐格'
    };
  });

  // Truck Relocation warning
  const [truckRelocationWarning, setTruckRelocationWarning] = useState<{
    isRelocating: boolean;
    offsetMeters: number;
    newAddress: string;
  }>({
    isRelocating: true,
    offsetMeters: 60,
    newAddress: '大悦城北座西侧 · 地铁 3 号口临时停靠点'
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const allTabsConfig: RiderTabItemConfig[] = [
    { id: 'active', label: '当前专送任务', category: '配送调度', icon: Bike, badge: activeOrders.length },
    { id: 'pool', label: '极速抢单大厅', category: '配送调度', icon: Zap, badge: poolOrders.length },
    { id: 'route_hud', label: '梯控导航 & SLA沙漏', category: '智能导航', icon: Building2 },
    { id: 'battery_swap', label: '换电网络 & 续航', category: '智能导航', icon: BatteryCharging },
    { id: 'radar', label: '餐车动态雷达', category: '路线与收益', icon: Radio },
    { id: 'earnings', label: '收益与秒提现', category: '路线与收益', icon: Wallet },
    { id: 'waiver_pool', label: '现场取证 & 一键免责', category: '安全与免责', icon: ShieldAlert }
  ];

  const currentTabConfig = allTabsConfig.find(t => t.id === activeTab) || allTabsConfig[0];
  const CurrentIcon = currentTabConfig.icon;
  const categories = ['配送调度', '智能导航', '路线与收益', '安全与免责'];

  // Sequential Waypoints generation based on active orders
  const waypoints: DeliveryWaypoint[] = [];
  activeOrders.forEach((ord) => {
    if (ord.phase === 'pickup') {
      waypoints.push({
        id: `wp-pick-${ord.id}`,
        orderId: ord.id,
        orderNo: ord.orderNo,
        type: 'pickup',
        title: ord.truckName,
        address: ord.truckAddress,
        distanceDesc: `距您 ${ord.truckDistanceMeters}m`,
        estimatedMinutes: 3,
        isCompleted: false,
        itemsSummary: ord.items.map(i => i.name).join(', ')
      });
    }
    waypoints.push({
      id: `wp-drop-${ord.id}`,
      orderId: ord.id,
      orderNo: ord.orderNo,
      type: 'dropoff',
      title: `${ord.customerName} (${ord.deliveryAddress.slice(0, 10)}...)`,
      address: ord.deliveryAddress,
      distanceDesc: `${ord.addressDistanceKm}km`,
      estimatedMinutes: 8,
      isCompleted: ord.phase === 'dropoff' ? false : false,
      customerName: ord.customerName,
      itemsSummary: ord.items.map(i => i.name).join(', ')
    });
  });

  // Handlers for Active Task
  const handleAdvancePhase = (orderId: string) => {
    const target = activeOrders.find((o) => isOrderMatch(o, orderId));
    if (!target) return;

    if (target.phase === 'pickup') {
      setActiveOrders((prev) =>
        prev.map((o) =>
          o.id === target.id
            ? {
                ...o,
                phase: 'dropoff',
                etaMinutes: 8,
                routeProgress: 60,
                items: o.items.map((it) => ({ ...it, checked: true }))
              }
            : o
        )
      );

      // Trigger Rider Voice Alert
      voiceAlerts.riderArrivedPickup(target.orderNo, target.truckName);

      if (onAdvanceOrderStatus) {
        onAdvanceOrderStatus(target.orderNo || target.id, 'delivering', {
          courierName: '陈志远 (专线骑手 R-8821)',
          courierPhone: '138-1829-9201',
          etaMinutes: target.etaMinutes || 8,
          statusText: '配送中'
        });
      }
    } else {
      // Complete dropoff
      const remaining = activeOrders.filter((o) => o.id !== target.id);
      setActiveOrders(remaining);
      if (remaining.length > 0 && selectedOrderId === target.id) {
        setSelectedOrderId(remaining[0].id);
      }

      // Trigger Rider Voice Alert
      voiceAlerts.riderOrderDelivered(target.orderNo, target.courierEarnings);

      // Append to history
      const newHistItem: HistoricalDelivery = {
        id: `hist-${Date.now()}`,
        orderNo: target.orderNo,
        completedTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        customerName: target.customerName,
        deliveryAddress: target.deliveryAddress,
        itemsSummary: target.items.map(i => `${i.name} x${i.quantity}`).join(' + '),
        durationMinutes: 12,
        distanceKm: target.addressDistanceKm,
        earnings: target.courierEarnings + (isBadWeather ? surgeBonusAmount : 0),
        rating: 5,
        tags: ['超快妥投', '温度达标', '结算已到账']
      };
      setHistoryList((h) => [newHistItem, ...h]);

      if (onAdvanceOrderStatus) {
        onAdvanceOrderStatus(target.orderNo || target.id, 'completed', {
          etaMinutes: 0,
          progressPercent: 100,
          statusText: '已送达'
        });
      }
    }
  };

  const handleUploadDeliveryPhoto = (orderId: string) => {
    // photo recorded
  };

  const handleToggleItemCheck = (orderId: string, itemIndex: number) => {
    setActiveOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const newItems = [...ord.items];
        newItems[itemIndex].checked = !newItems[itemIndex].checked;
        return { ...ord, items: newItems };
      })
    );
  };

  // Handlers for Grab Order
  const handleGrabOrder = (order: PoolDeliveryOrder) => {
    if (activeOrders.length >= 3) {
      showToast('当前已挂靠 3 个并发工单（达并发上限），请先送达部分工单！');
      return;
    }

    setPoolOrders((prev) => prev.filter((o) => o.id !== order.id));
    const newActive: ActiveDeliveryOrder = {
      id: order.id,
      orderNo: order.orderNo.replace(/^#/, ''),
      userId: order.userId,
      phase: 'pickup',
      truckName: order.originName,
      truckAddress: order.originAddress,
      truckDistanceMeters: order.distanceToOriginMeters,
      customerName: order.customerName || '先锋食客 (顺路专送)',
      customerPhone: order.userPhone || '138-8888-9201',
      deliveryAddress: order.destinationAddress,
      addressDistanceKm: order.distanceKm,
      items: [
        { name: order.itemsSummary, quantity: order.itemCount, price: 68.0, checked: false }
      ],
      totalPrice: 68.0,
      courierEarnings: order.estimatedEarnings,
      customerNote: '请轻拿轻放，餐品温度非常高，送达后致电即可。',
      etaMinutes: 18,
      speedKmh: 20,
      routeProgress: 10
    };

    setActiveOrders((prev) => [...prev, newActive]);
    setSelectedOrderId(newActive.id);
    setActiveTab('active');
    
    // Voice alert for rider order accepted
    voiceAlerts.riderOrderAccepted(order.orderNo, order.originName);

    if (onAdvanceOrderStatus) {
      onAdvanceOrderStatus(order.orderNo, 'cooking', {
        courierName: '陈志远 (骑手已接单待取餐)',
        courierPhone: '138-1829-9201'
      });
    }

    showToast(`成功顺路接单【${order.orderNo}】！已为您重构最优送达路顺，并同步客户端状态。`);
  };

  // Handle Rider Reject & Boundary Release with escalation to Contingency Hub
  const handleRejectOrder = (orderId: string, orderNo: string, reason: string, reasonCode: string) => {
    // 1. Remove from active list if present
    setActiveOrders((prev) => prev.filter((o) => o.id !== orderId && o.orderNo !== orderNo.replace(/^#/, '')));

    // 2. Re-insert or upgrade into pool with bonus bounty tag
    setPoolOrders((prev) => {
      const exists = prev.some((p) => p.id === orderId || p.orderNo.replace(/^#/, '') === orderNo.replace(/^#/, ''));
      if (exists) {
        return prev.map((p) => {
          if (p.id === orderId || p.orderNo.replace(/^#/, '') === orderNo.replace(/^#/, '')) {
            return {
              ...p,
              truckSubsidy: p.truckSubsidy + 2.0,
              estimatedEarnings: p.estimatedEarnings + 2.0,
              urgentTag: `已加急转派 (+¥2.0 调度补贴 · ${reason.slice(0, 10)})`
            };
          }
          return p;
        });
      }
      return [
        {
          id: orderId,
          orderNo: `#${orderNo.replace(/^#/, '')}`,
          originName: truck.name || '黑曜石 01 号流动餐车',
          originAddress: truck.currentLocationName,
          distanceToOriginMeters: 180,
          destinationName: '顾客专送点',
          destinationAddress: '西藏北路 166 号大悦城商务座',
          distanceKm: 0.95,
          itemsSummary: '现烤餐品套餐',
          itemCount: 1,
          estimatedEarnings: 11.5,
          baseFee: 7.0,
          distanceFee: 2.5,
          truckSubsidy: 5.0,
          isTruckSpecial: true,
          urgentTag: `二次加急重派 (+¥2.0 · ${reason.slice(0, 8)})`,
          publishedTimeAgo: '刚刚',
          expectedDeliveryTime: '15 分钟内'
        },
        ...prev
      ];
    });

    // 3. Keep central merchant status aligned
    if (onAdvanceOrderStatus) {
      onAdvanceOrderStatus(orderNo, 'cooking', {
        courierName: '调度中枢重新转派中 (加码补贴)',
        statusText: '制作中 (运力智能重派中)'
      });
    }

    showToast(`工单 #${orderNo.replace(/^#/, '')} 拒接记录已归档，触发边界风控与二次智能转派机制！`);
  };

  // IoT Adjustment
  const handleAdjustTemp = (zone: 'hot' | 'cold', target: number) => {
    setIotState((prev) => ({
      ...prev,
      [zone === 'hot' ? 'hotZoneTarget' : 'coldZoneTarget']: target,
      [zone === 'hot' ? 'hotZoneTemp' : 'coldZoneTemp']: target
    }));
  };

  const handleToggleLid = () => {
    setIotState((prev) => ({ ...prev, lidClosed: !prev.lidClosed }));
  };

  const handleReserveBatterySwap = (stationName: string) => {
    setIotState((prev) => ({ ...prev, batterySoc: 100, batteryRangeKm: 48 }));
  };

  const handleClaimQuest = (questId: string) => {
    setQuests((prev) =>
      prev.map((q) => (q.id === questId ? { ...q, isClaimed: true } : q))
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#37352f] flex flex-col font-sans selection:bg-[#37352f] selection:text-white">
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#ffffff] border-b border-[#e6e6e4] px-3.5 sm:px-4 py-2 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Sidebar Trigger Button */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden p-1.5 hover:bg-[#efefed] rounded-[3px] text-[#787774] hover:text-[#37352f] transition-all cursor-pointer flex items-center justify-center border border-[#d3d1cb]"
            title="展开功能导航栏"
          >
            <MenuIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSwitchRole('customer')}
            className="px-2 py-1 bg-[#201f1d] hover:bg-black text-white rounded-[4px] transition-all cursor-pointer flex items-center gap-1 font-bold text-xs shadow-2xs shrink-0"
            title="返回前台顾客点餐"
            aria-label="返回前台顾客点餐"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-white" />
            <span>切回前台</span>
          </button>

          <div className="h-4 w-[1px] bg-[#e6e6e4] shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-[3px] bg-[#2b593f] text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Bike className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-xs sm:text-sm text-[#37352f] truncate">骑士工作台</span>
              <span className="text-[10px] font-mono bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1 py-0.2 rounded-[2px] shrink-0 hidden xs:inline-block">
                在线
              </span>
            </div>
          </div>
        </div>

        {/* Top Right Controls & Switches */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Verified Phone Rider Badge & Device Fingerprint Invariant Indicator */}
          <div className="flex items-center gap-1 bg-[#edf3ec] border border-[#c4dcbc] rounded-[4px] px-1.5 py-0.5 shrink-0 text-xs">
            <Smartphone className="w-3.5 h-3.5 text-[#2b593f] shrink-0" />
            <span className="font-bold text-[#2b593f] truncate max-w-[80px] xs:max-w-[110px] sm:max-w-none">
              {riderSession?.name || '陈志远 (R-8821)'}
            </span>
            <span className="font-mono text-[10.5px] text-[#2b593f]/80 hidden sm:inline">
              {riderSession?.phone ? maskPhoneNumber(riderSession.phone) : '138****9201'}
            </span>
            <span
              className="text-[9px] bg-emerald-200/70 text-emerald-900 border border-emerald-300 p-0.5 rounded shrink-0 flex items-center"
              title={`手机号已实名核验 · 底层硬件指纹 [${riderSession?.hardwareHash || 'HW-INVARIANT'}] 保持绑定`}
            >
              <Fingerprint className="w-2.5 h-2.5 text-emerald-700" />
            </span>
            {onOpenPhoneAuth && (
              <button
                type="button"
                onClick={onOpenPhoneAuth}
                className="text-[10px] text-blue-700 hover:text-blue-900 underline ml-0.5 font-medium cursor-pointer"
                title="更换登录手机号或切换其他骑手账号"
              >
                切换
              </button>
            )}
            {onLogoutRider && (
              <button
                type="button"
                onClick={onLogoutRider}
                className="text-[10px] text-red-600 hover:text-red-800 underline ml-0.5 font-medium cursor-pointer"
                title="退出骑手端登录"
              >
                退出
              </button>
            )}
          </div>

          {/* 骑手自动抢单/接单开关 */}
          <button
            type="button"
            onClick={() => {
              const next = !isAutoAcceptRider;
              setIsAutoAcceptRider(next);
              showToast(next ? '已开启极速自动抢单（新任务自动接单）' : '已关闭自动抢单（新任务将保留在抢单大厅待取件）');
            }}
            className={`px-2 py-1 rounded-[3px] font-semibold text-xs flex items-center gap-1 cursor-pointer border transition-all shadow-2xs ${
              isAutoAcceptRider
                ? 'bg-[#edf3ec] text-[#2b593f] border-[#c4dcbc] hover:bg-[#e1ece0]'
                : 'bg-[#fbe4e4] text-[#c93b3b] border-[#f0c3c3] hover:bg-[#f8d7d7]'
            }`}
            title={isAutoAcceptRider ? '点击关闭自动抢单' : '点击开启自动抢单'}
          >
            <Zap className={`w-3.5 h-3.5 ${isAutoAcceptRider ? 'text-[#4dab63]' : 'text-[#c93b3b]'}`} />
            <span>{isAutoAcceptRider ? '自动抢单' : '手动抢单'}</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchRole('merchant')}
            className="px-2 sm:px-2.5 py-1 bg-[#f1f1ef] hover:bg-[#e8e8e6] text-[#37352f] rounded-[3px] font-semibold text-xs transition-all cursor-pointer border border-[#d3d1cb] shrink-0 hidden sm:inline-block"
          >
            商家端
          </button>
        </div>
      </header>

      {/* 2. Main Flex Layout with Sticky Left Sidebar */}
      <div className="flex-1 flex w-full relative">
        {/* Left Notion-styled Navigation Sidebar */}
        <RiderSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          tabsConfig={allTabsConfig}
          categories={categories}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          iotState={iotState}
          levelInfo={levelInfo}
          riderName={riderSession?.name || '陈志远 (R-8821)'}
        />

        {/* Right Dynamic Workspace */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#f7f7f5]">
          {/* Workspace Sticky Breadcrumb & Quick Jump Bar */}
          <div className="sticky top-[45px] z-20 bg-[#ffffff] border-b border-[#e6e6e4] px-3.5 sm:px-4 py-2 shadow-2xs">
            <div className="flex items-center justify-between gap-3">
              {/* Active Path & Status */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-[3px] bg-[#2b593f] text-white flex items-center justify-center shrink-0">
                  <CurrentIcon className="w-3 h-3" />
                </div>
                <div className="flex items-center gap-1 text-xs truncate">
                  <span className="text-[#787774]">{currentTabConfig.category}</span>
                  <span className="text-[#9b9a97]">/</span>
                  <span className="font-bold text-[#37352f]">{currentTabConfig.label}</span>
                </div>
                {currentTabConfig.badge !== undefined && currentTabConfig.badge > 0 && (
                  <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] shrink-0 bg-[#2b593f] text-white">
                    {currentTabConfig.badge}
                  </span>
                )}
              </div>

              {/* Quick Jump Pills for Desktop */}
              <div className="hidden sm:flex items-center gap-1">
                {allTabsConfig.map((quick) => {
                  const Icon = quick.icon;
                  const isSelected = activeTab === quick.id;
                  return (
                    <button
                      key={quick.id}
                      type="button"
                      onClick={() => setActiveTab(quick.id as RiderTab)}
                      className={`px-2.5 py-1 rounded-[3px] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#2b593f] text-white shadow-2xs'
                          : 'text-[#787774] hover:bg-[#f1f1ef] hover:text-[#37352f]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{quick.label}</span>
                      {quick.badge !== undefined && quick.badge > 0 && (
                        <span
                          className={`text-[9px] font-mono font-bold px-1 rounded-[2px] ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-[#e6e6e4] text-[#37352f]'
                          }`}
                        >
                          {quick.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content Body */}
          <main className="flex-1 p-3.5 sm:p-4 max-w-5xl w-full mx-auto pb-16">
            {activeTab === 'active' && (
              <RiderActiveTask
                activeOrders={activeOrders}
                selectedOrderId={selectedOrderId}
                onSelectOrder={(id) => setSelectedOrderId(id)}
                onAdvancePhase={handleAdvancePhase}
                onRejectOrder={handleRejectOrder}
                onUploadDeliveryPhoto={handleUploadDeliveryPhoto}
                onToggleItemCheck={handleToggleItemCheck}
                waypoints={waypoints}
                kdsStatuses={kdsStatuses}
                iotState={iotState}
                onAdjustTemp={handleAdjustTemp}
                onToggleLid={handleToggleLid}
                onReserveBatterySwap={handleReserveBatterySwap}
                levelInfo={levelInfo}
                quests={quests}
                onClaimQuest={handleClaimQuest}
                historyList={historyList}
                isBadWeather={isBadWeather}
                onToggleWeather={() => setIsBadWeather(!isBadWeather)}
                surgeBonusAmount={surgeBonusAmount}
                truckRelocationWarning={truckRelocationWarning}
                onQuickGrabMore={() => setActiveTab('pool')}
                showToast={showToast}
                onJumpToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'pool' && (
              <RiderOrderPool
                orders={poolOrders}
                onGrabOrder={handleGrabOrder}
                onRejectFromPool={handleRejectOrder}
                showToast={showToast}
              />
            )}

            {activeTab === 'route_hud' && (
              <RiderSmartRouteElevatorHUD
                activeOrders={activeOrders}
                onAdvanceOrderStatus={(orderId, status) => {
                  if (onAdvanceOrderStatus) onAdvanceOrderStatus(orderId, status as any);
                }}
                showToast={showToast}
              />
            )}

            {activeTab === 'battery_swap' && (
              <RiderBatterySwapMap showToast={showToast} />
            )}

            {activeTab === 'waiver_pool' && (
              <RiderIncidentWaiverModal
                activeOrders={activeOrders}
                showToast={showToast}
              />
            )}

            {activeTab === 'radar' && (
              <RiderRadarProximity
                truck={truck}
                onNavigateToTruck={() => setActiveTab('active')}
                showToast={showToast}
              />
            )}

            {activeTab === 'earnings' && (
              <RiderEarnings
                orders={orders}
                historyList={historyList}
                truck={truck}
                showToast={showToast}
              />
            )}
          </main>
        </div>
      </div>

      {/* Fixed Bottom Navigation Bar - Rider (Notion Token Theme) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#fbfbfa]/95 backdrop-blur-md border-t border-[#e9e9e7] shadow-lg px-2 sm:px-4 py-2">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Mobile All Modules Drawer Button */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden py-1.5 px-2 rounded-[4px] flex flex-col items-center justify-center gap-0.5 text-[#37352f] hover:bg-[#efefed] transition-all cursor-pointer shrink-0"
            title="全部配送功能模块"
          >
            <MenuIcon className="w-4 h-4 text-[#37352f]" />
            <span className="text-[10px] font-bold">全部功能</span>
          </button>

          {/* 1. 专送 */}
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-1.5 px-2 rounded-[4px] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'bg-[#2b593f] text-white shadow-2xs'
                : 'text-[#787774] hover:bg-[#f1f1ef] hover:text-[#37352f]'
            }`}
          >
            <Bike className="w-4 h-4" />
            <div className="text-center sm:text-left">
              <div className="text-xs font-bold leading-tight flex items-center gap-1 justify-center sm:justify-start">
                <span>1. 专送</span>
                {activeOrders.length > 0 && (
                  <span className="bg-white/20 text-white font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                    {activeOrders.length}
                  </span>
                )}
              </div>
              <div className={`text-[10px] hidden sm:block ${activeTab === 'active' ? 'text-white/80' : 'text-[#9b9a97]'}`}>
                正在专送 · 恒温导航
              </div>
            </div>
          </button>

          {/* 2. 抢单 */}
          <button
            type="button"
            onClick={() => setActiveTab('pool')}
            className={`flex-1 py-1.5 px-2 rounded-[4px] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer relative ${
              activeTab === 'pool'
                ? 'bg-[#2b593f] text-white shadow-2xs'
                : 'text-[#787774] hover:bg-[#f1f1ef] hover:text-[#37352f]'
            }`}
          >
            <Zap className="w-4 h-4 text-[#d97706]" />
            <div className="text-center sm:text-left">
              <div className="text-xs font-bold leading-tight flex items-center gap-1 justify-center sm:justify-start">
                <span>2. 抢单</span>
                {poolOrders.length > 0 && (
                  <span className="bg-[#d97706] text-white font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                    {poolOrders.length}
                  </span>
                )}
              </div>
              <div className={`text-[10px] hidden sm:block ${activeTab === 'pool' ? 'text-white/80' : 'text-[#9b9a97]'}`}>
                接单大厅 · 顺路抢单
              </div>
            </div>
          </button>

          {/* 3. 我的 */}
          <button
            type="button"
            onClick={() => setActiveTab('earnings')}
            className={`flex-1 py-1.5 px-2 rounded-[4px] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer relative ${
              activeTab === 'earnings' || activeTab === 'radar'
                ? 'bg-[#2b593f] text-white shadow-2xs'
                : 'text-[#787774] hover:bg-[#f1f1ef] hover:text-[#37352f]'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <div className="text-center sm:text-left">
              <div className="text-xs font-bold leading-tight">3. 我的</div>
              <div className={`text-[10px] hidden sm:block ${activeTab === 'earnings' || activeTab === 'radar' ? 'text-white/80' : 'text-[#9b9a97]'}`}>
                收益 · 装备 · 换电雷达
              </div>
            </div>
          </button>

          {/* Quick Omni Tri-party Chat Hub Access */}
          <button
            type="button"
            onClick={() => setIsOmniChatHubOpen(true)}
            className="p-2 sm:px-3 sm:py-1.5 rounded-[4px] bg-[#f7f6f3] border border-[#e3e2de] text-[#37352f] hover:bg-[#eef4f0] hover:text-[#2b593f] hover:border-[#d2e4d7] flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="打开全网三端联络聚合总成 (骑手/商家/客户/平台)"
          >
            <Radio className="w-4 h-4 text-[#2b593f] animate-pulse" />
            <span className="text-xs font-bold hidden md:inline">三端聚合联络</span>
          </button>
        </div>
      </div>

      {/* Omni Aggregated Chat Hub Modal */}
      {isOmniChatHubOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-[4px] max-w-5xl w-full h-[88vh] border border-[#e9e9e7] shadow-2xl overflow-hidden flex flex-col">
            <OmniAggregatedChatHub
              orders={orders}
              viewerRole="rider"
              onAdvanceOrderStatus={onAdvanceOrderStatus}
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

      {/* Online Rider Floating Chat Bubble */}
      <FloatingChatBubbleWidget
        role="rider"
        orders={orders}
        defaultOrderId={selectedOrderId}
        onAdvanceOrderStatus={onAdvanceOrderStatus}
        showToast={showToast}
        onOpenAggregatedHub={() => setIsOmniChatHubOpen(true)}
      />
    </div>
  );
};
