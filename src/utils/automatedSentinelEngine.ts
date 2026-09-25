/**
 * Urban Radar 流动餐车 GPS 极速专送平台 - 自动化安全与五维自闭环控制中枢 (Automated Sentinel Engine)
 * 
 * 五大工业级闭环控制维度架构:
 * 1. 感知层 (Sensing): 后厨阻塞度、网络健康状态、离线数据挤压、设备硬件心跳、客流并发涌入
 * 2. 定位层 (Localization): 电子围栏物理定界、餐车坐标合规度、单据在途精准空间状态机
 * 3. 判断层 (Inference): 爆单风险指数、脱圈违规判定、BOM断货危机推演、恶意资金退款嗅探
 * 4. 决策层 (Decision): 自动限流排队决策、配送辐射半径动态自适应收缩、紧急熔断保护
 * 5. 控制安全层 (Safety & Control): 自动化熔断器、自愈式跨端状态广播、异常隔离与沙箱保护
 */

import { reactiveSyncBus } from './reactiveSyncBus';
import { IS_EMBED_CUSTOMER } from './embedMode';

export type SentinelThreatLevel = 'SECURE' | 'GUARDED' | 'ELEVATED' | 'CRITICAL';

export interface SensingTelemetry {
  // 1. 物理环境与后厨负载感知
  kdsBacklogCount: number;         // 后厨待制作单据数量
  kdsAverageWaitMinutes: number;   // 平均出餐等待时长(分)
  isKitchenOverloaded: boolean;    // 是否处于后厨超负荷状态
  
  // 2. 网络与通信感知
  networkStatus: 'online' | 'degraded' | 'offline';
  rttLatencyMs: number;            // 通信往返延迟
  pendingOfflineTxCount: number;   // 本地堆积待同步离线事务数

  // 3. 硬件外设健康感知
  bluetoothSpeakerConnected: boolean;
  thermalPrinterStatus: 'ready' | 'paper_low' | 'offline';
  scannerStatus: 'ready' | 'standby';

  // 4. 空间位置感知 (GPS / 围栏)
  truckCoordinates: [number, number];
  approvedGeofenceCenter: [number, number];
  approvedGeofenceRadiusMeters: number;
  currentDriftDistanceMeters: number;
  isGeofenceCompliant: boolean;

  // 5. 交易风控与财务安全感知
  hourlyRefundCount: number;
  suspiciousTransactionsDetected: number;
}

export interface SentinelAutonomousDecision {
  policyId: string;
  triggeredAt: string;
  threatLevel: SentinelThreatLevel;
  title: string;
  dimension: 'Sensing' | 'Localization' | 'Inference' | 'Decision' | 'Control';
  inferenceRationale: string;    // 判断推理逻辑
  automatedActionApplied: string; // 自动化执行的控制措施
  isAutoReversible: boolean;
  status: 'active' | 'resolved' | 'suppressed';
}

export interface SentinelSystemState {
  overallHealthScore: number;    // 0 ~ 100 综合健康分
  threatLevel: SentinelThreatLevel;
  activeDecisions: SentinelAutonomousDecision[];
  telemetry: SensingTelemetry;
  // 自动化控制执行参数
  activeDynamicDeliveryRadiusKm: number; // 默认 3.5km，爆单或异常时自动收缩至 1.5km
  adaptiveExtraQueueMinutes: number;     // 动态附加给前台的预估出餐等待时长
  isOnlineOrderAdmissionPaused: boolean; // 是否自动暂停线上进单
  isOfflineSafetyVaultEngaged: boolean;  // 是否开启离线金库保护
  lastEvaluatedAt: string;
}

const STORAGE_KEY = 'urban_radar_sentinel_state_v1';
const DEFAULT_GEOFENCE_CENTER: [number, number] = [121.4737, 31.2304]; // 默认驻点

class AutomatedSentinelEngine {
  private state: SentinelSystemState;
  private listeners: Set<(state: SentinelSystemState) => void> = new Set();
  private heartbeatTimer: any = null;

  constructor() {
    this.state = this.loadInitialState();
    this.startAutonomousLoop();
  }

  private loadInitialState(): SentinelSystemState {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            ...parsed,
            lastEvaluatedAt: new Date().toISOString()
          };
        }
      } catch (e) {
        console.warn('[Sentinel] 读取本地哨兵状态失败，重置为默认值:', e);
      }
    }

    return {
      overallHealthScore: 98,
      threatLevel: 'SECURE',
      activeDecisions: [],
      telemetry: {
        kdsBacklogCount: 4,
        kdsAverageWaitMinutes: 8,
        isKitchenOverloaded: false,
        networkStatus: 'online',
        rttLatencyMs: 42,
        pendingOfflineTxCount: 0,
        bluetoothSpeakerConnected: true,
        thermalPrinterStatus: 'ready',
        scannerStatus: 'ready',
        truckCoordinates: [121.4737, 31.2304],
        approvedGeofenceCenter: DEFAULT_GEOFENCE_CENTER,
        approvedGeofenceRadiusMeters: 500,
        currentDriftDistanceMeters: 18,
        isGeofenceCompliant: true,
        hourlyRefundCount: 0,
        suspiciousTransactionsDetected: 0
      },
      activeDynamicDeliveryRadiusKm: 3.5,
      adaptiveExtraQueueMinutes: 0,
      isOnlineOrderAdmissionPaused: false,
      isOfflineSafetyVaultEngaged: false,
      lastEvaluatedAt: new Date().toISOString()
    };
  }

  public getState(): SentinelSystemState {
    return this.state;
  }

  public subscribe(listener: (state: SentinelSystemState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    // embed 预览实例：保留内存态与监听器，但不落盘 —— 每次写入都会向宿主
    // 派发 storage 事件，参与跨文档回声循环
    if (typeof window !== 'undefined' && !IS_EMBED_CUSTOMER) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        // ignore
      }
    }
    this.listeners.forEach((fn) => fn(this.state));
  }

  /**
   * 1. 感知层上报注入：后厨实时情况
   */
  public reportKitchenStatus(pendingCount: number, avgWaitMins: number): void {
    this.state.telemetry.kdsBacklogCount = pendingCount;
    this.state.telemetry.kdsAverageWaitMinutes = avgWaitMins;
    this.state.telemetry.isKitchenOverloaded = pendingCount >= 10 || avgWaitMins >= 25;
    this.evaluateAutonomousLoop();
  }

  /**
   * 2. 定位层上报注入：餐车真实 GPS 坐标移动
   */
  public reportTruckGPS(coords: [number, number]): void {
    this.state.telemetry.truckCoordinates = coords;
    
    // 计算偏离中心距离 (Haversine 简易平面近似)
    const [lng1, lat1] = coords;
    const [lng2, lat2] = this.state.telemetry.approvedGeofenceCenter;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = Math.round(6371000 * c);

    this.state.telemetry.currentDriftDistanceMeters = distanceMeters;
    this.state.telemetry.isGeofenceCompliant =
      distanceMeters <= this.state.telemetry.approvedGeofenceRadiusMeters;

    this.evaluateAutonomousLoop();
  }

  /**
   * 3. 通信与离线挤压感知上报
   */
  public reportNetworkPulse(status: 'online' | 'degraded' | 'offline', latencyMs: number, offlineCount: number): void {
    this.state.telemetry.networkStatus = status;
    this.state.telemetry.rttLatencyMs = latencyMs;
    this.state.telemetry.pendingOfflineTxCount = offlineCount;
    this.evaluateAutonomousLoop();
  }

  /**
   * 4. 财务风控与可疑退款感知上报
   */
  public reportRefundEvent(amount: number, reason: string): void {
    this.state.telemetry.hourlyRefundCount += 1;
    if (amount > 150) {
      this.state.telemetry.suspiciousTransactionsDetected += 1;
    }
    this.evaluateAutonomousLoop();
  }

  /**
   * 自动化闭环循环：判断 (Inference) -> 决策 (Decision) -> 控制安全 (Control & Safety)
   */
  public evaluateAutonomousLoop(): void {
    const decisions: SentinelAutonomousDecision[] = [];
    let score = 100;

    // --- 规则 1: 后厨严重拥堵闭环控制 ---
    if (this.state.telemetry.kdsBacklogCount >= 12 || this.state.telemetry.kdsAverageWaitMinutes >= 30) {
      score -= 28;
      decisions.push({
        policyId: 'POL-KDS-MITIGATION',
        triggeredAt: new Date().toISOString(),
        threatLevel: 'CRITICAL',
        title: '后厨产能超载·自动熔断限流已介入',
        dimension: 'Inference',
        inferenceRationale: `当前待制单量已达 ${this.state.telemetry.kdsBacklogCount} 笔，均单等候超 ${this.state.telemetry.kdsAverageWaitMinutes} 分钟，已击穿餐车高峰产能红线。`,
        automatedActionApplied: '自动收紧外送半径至 1.5km，并向顾客端注入 +25 分钟出餐缓冲期预警',
        isAutoReversible: true,
        status: 'active'
      });
      this.state.activeDynamicDeliveryRadiusKm = 1.5;
      this.state.adaptiveExtraQueueMinutes = 25;
      
      // 联动发布给前端总线
      reactiveSyncBus.publish('EMERGENCY_PEAK_MITIGATION', {
        isActive: true,
        queueDelayMinutes: 25,
        reason: '当前时段后厨单量密集，系统已启动产能自适应保护'
      });
    } else if (this.state.telemetry.kdsBacklogCount >= 7) {
      score -= 12;
      decisions.push({
        policyId: 'POL-KDS-ELEVATED',
        triggeredAt: new Date().toISOString(),
        threatLevel: 'ELEVATED',
        title: '高峰产能预警·出餐时长弹性延长',
        dimension: 'Decision',
        inferenceRationale: `待制作单数 (${this.state.telemetry.kdsBacklogCount}) 上升，预估出餐耗时增长。`,
        automatedActionApplied: '前台预计送达时长动态平滑追加 +10 分钟',
        isAutoReversible: true,
        status: 'active'
      });
      this.state.activeDynamicDeliveryRadiusKm = 2.5;
      this.state.adaptiveExtraQueueMinutes = 10;
    } else {
      // 恢复常态
      this.state.activeDynamicDeliveryRadiusKm = 3.5;
      this.state.adaptiveExtraQueueMinutes = 0;
      reactiveSyncBus.publish('EMERGENCY_PEAK_MITIGATION', {
        isActive: false,
        queueDelayMinutes: 0,
        reason: '产能恢复畅通'
      });
    }

    // --- 规则 2: 空间定位与电子围栏脱圈违规判定 ---
    if (!this.state.telemetry.isGeofenceCompliant) {
      score -= 35;
      decisions.push({
        policyId: 'POL-GEO-DRIFT',
        triggeredAt: new Date().toISOString(),
        threatLevel: 'CRITICAL',
        title: '餐车物理偏航·脱离营运许可电子围栏',
        dimension: 'Localization',
        inferenceRationale: `定位显示已偏离许可驻点 ${this.state.telemetry.currentDriftDistanceMeters} 米（允许半径 ${this.state.telemetry.approvedGeofenceRadiusMeters} 米），判定存在脱圈外摆或无证移位风险。`,
        automatedActionApplied: '触发车载声光告警，暂停线上远距接单，锁定提现通道',
        isAutoReversible: true,
        status: 'active'
      });
      this.state.isOnlineOrderAdmissionPaused = true;
    } else {
      this.state.isOnlineOrderAdmissionPaused = false;
    }

    // --- 规则 3: 网络通信断连与本地安全离线金库 ---
    if (this.state.telemetry.networkStatus === 'offline' || this.state.telemetry.pendingOfflineTxCount >= 10) {
      score -= 22;
      decisions.push({
        policyId: 'POL-NET-OFFLINE-VAULT',
        triggeredAt: new Date().toISOString(),
        threatLevel: 'GUARDED',
        title: '通信链路降级·本地离线金库已挂载',
        dimension: 'Control',
        inferenceRationale: `检测到网络失联或离线排队事务达到 ${this.state.telemetry.pendingOfflineTxCount} 笔，存在数据丢单风险。`,
        automatedActionApplied: '激活离线隔离沙箱，单据写透本地 IndexedDB/LocalStorage，暂缓跨店同步',
        isAutoReversible: true,
        status: 'active'
      });
      this.state.isOfflineSafetyVaultEngaged = true;
    } else {
      this.state.isOfflineSafetyVaultEngaged = false;
    }

    // --- 规则 4: 异常退款与风控审计 ---
    if (this.state.telemetry.suspiciousTransactionsDetected >= 2 || this.state.telemetry.hourlyRefundCount >= 5) {
      score -= 25;
      decisions.push({
        policyId: 'POL-RISK-REFUND-SURGE',
        triggeredAt: new Date().toISOString(),
        threatLevel: 'CRITICAL',
        title: '退款频次异动·资金防刷防御激活',
        dimension: 'Control',
        inferenceRationale: `近 1 小时内发生 ${this.state.telemetry.hourlyRefundCount} 次退款，其中包含 ${this.state.telemetry.suspiciousTransactionsDetected} 笔大额资金撤回，疑似异常恶意刷单。`,
        automatedActionApplied: '阻断自动即时退款，强制转入店长与平台风控专员二级双重审核池',
        isAutoReversible: false,
        status: 'active'
      });
    }

    // 计算安全等级
    this.state.overallHealthScore = Math.max(0, Math.min(100, score));
    if (score >= 90) {
      this.state.threatLevel = 'SECURE';
    } else if (score >= 75) {
      this.state.threatLevel = 'GUARDED';
    } else if (score >= 50) {
      this.state.threatLevel = 'ELEVATED';
    } else {
      this.state.threatLevel = 'CRITICAL';
    }

    this.state.activeDecisions = decisions;
    this.state.lastEvaluatedAt = new Date().toISOString();

    this.notify();
  }

  /**
   * 启动后台自主心跳探测 (每 15 秒模拟与网络同步)
   */
  private startAutonomousLoop(): void {
    if (typeof window === 'undefined') return;
    this.heartbeatTimer = setInterval(() => {
      // 探针心跳
      this.evaluateAutonomousLoop();
    }, 15000);
  }

  /**
   * 人工/自动化一键复位与自愈
   */
  public executeManualRecoveryAction(policyId: string): void {
    if (policyId === 'POL-KDS-MITIGATION') {
      this.state.telemetry.kdsBacklogCount = Math.max(2, this.state.telemetry.kdsBacklogCount - 6);
      this.state.telemetry.kdsAverageWaitMinutes = 12;
    } else if (policyId === 'POL-GEO-DRIFT') {
      this.state.telemetry.truckCoordinates = [...this.state.telemetry.approvedGeofenceCenter];
      this.state.telemetry.currentDriftDistanceMeters = 15;
      this.state.telemetry.isGeofenceCompliant = true;
    } else if (policyId === 'POL-NET-OFFLINE-VAULT') {
      this.state.telemetry.networkStatus = 'online';
      this.state.telemetry.pendingOfflineTxCount = 0;
    } else if (policyId === 'POL-RISK-REFUND-SURGE') {
      this.state.telemetry.hourlyRefundCount = 0;
      this.state.telemetry.suspiciousTransactionsDetected = 0;
    }

    this.evaluateAutonomousLoop();
  }
}

export const automatedSentinel = new AutomatedSentinelEngine();
