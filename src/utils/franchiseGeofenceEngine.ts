import {
  FranchiseGeofenceConfig,
  GeofenceInspectionStatus,
  TemporaryDispatchPermit
} from '../types/franchise';
import { safeGetStorage, safeSetStorage } from './safeStorage';

export const FRANCHISE_GEOFENCE_EVENT = 'franchise_geofence_updated';

// 初始特许加盟商法定签约营运网格与电子围栏
export const INITIAL_GEOFENCE_CONFIGS: FranchiseGeofenceConfig[] = [
  {
    franchiseeId: 'FRAN-SH-001',
    franchiseeName: '黑曜石流动餐车 · 静安卓越分部',
    assignedTruckIds: ['truck-01', 'truck-02'],
    authorizedTerritoryName: '上海 · 静安核心商务及潮玩商业区',
    centerLat: 31.2450,
    centerLng: 121.4680,
    radiusKm: 3.8, // 3.8公里准入半径
    isStrictEnforcement: true,
    maxDailyDisplacementKm: 15.0,
    allowedGridPoints: [
      { name: '静安大悦城摩天轮广场专营位', lat: 31.2425, lng: 121.4695, tag: '核心定点' },
      { name: '市北高新园区2号移动泊位', lat: 31.2980, lng: 121.4460, tag: '工作日早午餐点' },
      { name: '苏河湾万象天地绿地西区', lat: 31.2460, lng: 121.4780, tag: '夜市周末点' }
    ]
  },
  {
    franchiseeId: 'FRAN-SH-002',
    franchiseeName: '黑曜石流动餐车 · 浦东潮玩特许部',
    assignedTruckIds: ['truck-03'],
    authorizedTerritoryName: '上海 · 浦东世博滨江与前滩太古里网格',
    centerLat: 31.1850,
    centerLng: 121.4980,
    radiusKm: 4.2, // 4.2公里准入半径
    isStrictEnforcement: true,
    maxDailyDisplacementKm: 20.0,
    allowedGridPoints: [
      { name: '世博源5区滨江庆典广场', lat: 31.1865, lng: 121.4920, tag: '核心定点' },
      { name: '前滩太古里临街流动车位', lat: 31.1550, lng: 121.5030, tag: '周末巡游点' },
      { name: '梅赛德斯奔驰演艺中心西门', lat: 31.1890, lng: 121.4910, tag: '演唱会保供位' }
    ]
  },
  {
    franchiseeId: 'FRAN-SH-003',
    franchiseeName: '黑曜石流动餐车 · 徐汇西岸艺术驿站',
    assignedTruckIds: ['truck-04'],
    authorizedTerritoryName: '上海 · 徐汇西岸美术馆大道与滨江带',
    centerLat: 31.1700,
    centerLng: 121.4550,
    radiusKm: 3.5,
    isStrictEnforcement: true,
    maxDailyDisplacementKm: 18.0,
    allowedGridPoints: [
      { name: '西岸美术馆1号临江露台', lat: 31.1680, lng: 121.4580, tag: '艺术季定点' },
      { name: '油罐艺术公园绿地入场口', lat: 31.1640, lng: 121.4620, tag: '文创快闪点' }
    ]
  }
];

// 初始临时跨区摆摊/出摊报备单
export const INITIAL_DISPATCH_PERMITS: TemporaryDispatchPermit[] = [
  {
    id: 'PERMIT-2026-0908-01',
    franchiseeId: 'FRAN-SH-001',
    franchiseeName: '黑曜石流动餐车 · 静安卓越分部',
    truckId: 'truck-01',
    eventName: '2026 迷笛金秋草地音乐节 · 官方指定特约餐饮车',
    targetLocationName: '上海市浦东新区森兰绿地大草坪B区',
    targetLat: 31.3320,
    targetLng: 121.5840,
    allowedRadiusKm: 1.5,
    startTime: '2026-09-12 10:00',
    endTime: '2026-09-13 23:00',
    reason: '受主办方官方邀请进驻音乐节外围，已获得浦东文旅与城管联合临时摆摊批文',
    estimatedRevenue: 48000,
    status: 'approved',
    reviewedBy: '总部区域运营总监 · 陆明远',
    reviewedAt: '2026-09-07 16:30',
    reviewNote: '报备资料齐全，出展保单已录入，放行出摊',
    createdAt: '2026-09-07 11:20'
  },
  {
    id: 'PERMIT-2026-0908-02',
    franchiseeId: 'FRAN-SH-002',
    franchiseeName: '黑曜石流动餐车 · 浦东潮玩特许部',
    truckId: 'truck-03',
    eventName: '张江高科某生物医药企业独家年会包场冷餐',
    targetLocationName: '浦东新区张江微电子港内庭',
    targetLat: 31.2050,
    targetLng: 121.5950,
    allowedRadiusKm: 0.8,
    startTime: '2026-09-18 16:00',
    endTime: '2026-09-18 22:00',
    reason: '企业定制300人下午茶汉堡玉棋套餐，非对外公开摆摊',
    estimatedRevenue: 28000,
    status: 'pending',
    createdAt: '2026-09-08 09:30'
  }
];

class FranchiseGeofenceEngine {
  private configs: FranchiseGeofenceConfig[];
  private permits: TemporaryDispatchPermit[];

  constructor() {
    this.configs = safeGetStorage<FranchiseGeofenceConfig[]>('obsidian_franchise_geofences', INITIAL_GEOFENCE_CONFIGS);
    this.permits = safeGetStorage<TemporaryDispatchPermit[]>('obsidian_franchise_permits', INITIAL_DISPATCH_PERMITS);
  }

  private notify() {
    window.dispatchEvent(new CustomEvent(FRANCHISE_GEOFENCE_EVENT, { detail: { timestamp: Date.now() } }));
  }

  public getConfigs(): FranchiseGeofenceConfig[] {
    return this.configs;
  }

  public getConfigByFranchisee(franchiseeId: string): FranchiseGeofenceConfig | undefined {
    return this.configs.find(c => c.franchiseeId === franchiseeId);
  }

  public getConfigByTruck(truckId: string): FranchiseGeofenceConfig | undefined {
    return this.configs.find(c => c.assignedTruckIds.includes(truckId));
  }

  public getPermits(franchiseeId?: string): TemporaryDispatchPermit[] {
    if (!franchiseeId || franchiseeId === 'HQ') {
      return this.permits;
    }
    return this.permits.filter(p => p.franchiseeId === franchiseeId);
  }

  public submitTemporaryPermit(
    permit: Omit<TemporaryDispatchPermit, 'id' | 'createdAt' | 'status'>
  ): TemporaryDispatchPermit {
    const newPermit: TemporaryDispatchPermit = {
      ...permit,
      id: `PERMIT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toLocaleString(),
      status: 'pending'
    };
    this.permits = [newPermit, ...this.permits];
    safeSetStorage('obsidian_franchise_permits', this.permits);
    this.notify();
    return newPermit;
  }

  public reviewPermit(permitId: string, approved: boolean, note: string, reviewerName: string = '总部特许运营部'): boolean {
    const target = this.permits.find(p => p.id === permitId);
    if (!target) return false;
    target.status = approved ? 'approved' : 'rejected';
    target.reviewedBy = reviewerName;
    target.reviewedAt = new Date().toLocaleString();
    target.reviewNote = note;
    safeSetStorage('obsidian_franchise_permits', this.permits);
    this.notify();
    return true;
  }

  /**
   * 计算地球表面两点间的地球弧长距离 (大圆公式 Haversine)
   * 返回单位：公里 (km)
   */
  public calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 地球平均半径 (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  /**
   * 核心算法：实时巡检流动餐车定位与法定加盟商经营网格
   */
  public inspectTruckLocation(
    truckId: string,
    currentLat: number,
    currentLng: number,
    currentLocationName: string = '流动停靠点'
  ): GeofenceInspectionStatus {
    const config = this.getConfigByTruck(truckId) || this.configs[0];
    const truckName = `${truckId.toUpperCase()} 号特许餐车`;

    // 1. 先检索该车是否有生效中且已核准的临时跨区出摊报备 (Temporary Dispatch Permit)
    const activePermit = this.permits.find(p => {
      if (p.truckId !== truckId || p.status !== 'approved') return false;
      // 检查当前距离临时报备点是否在允许半径内
      const distToPermit = this.calculateDistanceKm(currentLat, currentLng, p.targetLat, p.targetLng);
      return distToPermit <= p.allowedRadiusKm * 1.2;
    });

    if (activePermit) {
      return {
        truckId,
        truckName,
        currentLat,
        currentLng,
        currentLocationName,
        targetTerritoryName: `${config.authorizedTerritoryName} (临时特批: ${activePermit.eventName})`,
        distanceToCenterKm: 0,
        offsetFromBoundaryKm: 0,
        complianceStatus: 'temporary_permitted',
        temporaryPermitActive: true,
        activePermitName: activePermit.eventName,
        lastCheckedAt: new Date().toLocaleTimeString()
      };
    }

    // 2. 正常校验法定网格
    const distToCenter = this.calculateDistanceKm(currentLat, currentLng, config.centerLat, config.centerLng);
    const offset = distToCenter - config.radiusKm;

    let complianceStatus: GeofenceInspectionStatus['complianceStatus'] = 'in_bounds';
    if (offset <= 0) {
      complianceStatus = 'in_bounds';
    } else if (offset <= 0.6) {
      complianceStatus = 'boundary_warning'; // 边界模糊区 (<600米)
    } else {
      complianceStatus = 'out_of_bounds'; // 明确越界经营！
    }

    return {
      truckId,
      truckName,
      currentLat,
      currentLng,
      currentLocationName,
      targetTerritoryName: config.authorizedTerritoryName,
      distanceToCenterKm: distToCenter,
      offsetFromBoundaryKm: parseFloat(Math.max(0, offset).toFixed(2)),
      complianceStatus,
      temporaryPermitActive: false,
      lastCheckedAt: new Date().toLocaleTimeString()
    };
  }
}

export const globalFranchiseGeofenceEngine = new FranchiseGeofenceEngine();
