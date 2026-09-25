import { ActiveDeliveryOrder, PoolDeliveryOrder } from '../types';

// Multi-task Batching & Waypoints
export interface DeliveryWaypoint {
  id: string;
  orderId: string;
  orderNo: string;
  type: 'pickup' | 'dropoff';
  title: string;
  address: string;
  distanceDesc: string;
  estimatedMinutes: number;
  isCompleted: boolean;
  customerName?: string;
  itemsSummary: string;
}

// IoT Thermal Box Sensors
export interface ThermalBoxState {
  hotZoneTemp: number; // 68℃
  hotZoneTarget: number; // 70℃
  hotZoneStatus: 'optimal' | 'warming' | 'warning';
  coldZoneTemp: number; // 3.2℃
  coldZoneTarget: number; // 2.0℃
  coldZoneStatus: 'optimal' | 'cooling' | 'warning';
  lidClosed: boolean;
  batterySoc: number; // 84%
  batteryRangeKm: number; // 32km
  nearbySwapStations: {
    name: string;
    distanceMeters: number;
    availableBatteries: number;
  }[];
}

// KDS Preparation Sync
export interface KdsPrepStatus {
  orderId: string;
  orderNo: string;
  dishName: string;
  progressPercent: number; // e.g. 85%
  remainingSeconds: number;
  station: '炭烤炉台' | '冷饮站台' | '打包出餐架' | '骑手保温箱';
  statusText: string;
  pickupShelfCode: string; // e.g. "03 号保温取餐格"
}

// Gamified Rider Quests & Level
export interface RiderQuest {
  id: string;
  title: string;
  desc: string;
  rewardText: string;
  currentCount: number;
  targetCount: number;
  isClaimed: boolean;
  isCompleted: boolean;
}

export interface RiderLevelInfo {
  levelTitle: string; // "黑曜石王牌骑士"
  levelGrade: number; // 5
  currentExp: number;
  nextLevelExp: number;
  totalOrdersDelivered: number;
  onTimeRate: number; // 99.8%
  fiveStarRating: number; // 4.99
  streakDays: number;
}

// Delivery History & GPS Footprint
export interface HistoricalDelivery {
  id: string;
  orderNo: string;
  completedTime: string;
  customerName: string;
  deliveryAddress: string;
  itemsSummary: string;
  durationMinutes: number;
  distanceKm: number;
  earnings: number;
  rating: number;
  comment?: string;
  tags: string[];
}
