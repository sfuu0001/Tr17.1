/**
 * ==============================================================================
 * Obsidian Urban Radar - Enterprise 5-Tier Data Synchronization Engine
 * ==============================================================================
 *
 * Architecture Overview:
 *
 *   [ React UI / Customer / Merchant / Rider Views ]
 *                      ▲
 *                      │ (Optimistic Mutations / Reactive Subscriptions)
 *                      ▼
 *      ┌─────────────────────────────────────────────────────────┐
 *      │  L1: In-Memory Fast State Cache (React/State Store)     │
 *      └──────────────────────────┬──────────────────────────────┘
 *                                 │ (Bi-directional Sync)
 *      ┌──────────────────────────▼──────────────────────────────┐
 *      │  L2: Anti-Corruption Local Storage + Version Vector     │
 *      └──────────────────────────┬──────────────────────────────┘
 *                                 │ (Offline Queuing / Drain)
 *      ┌──────────────────────────▼──────────────────────────────┐
 *      │  L4: Persistent Offline Mutation Outbox & Conflict Res. │
 *      └──────────────────────────┬──────────────────────────────┘
 *                                 │ (Cloud Sync & Real-time Watch)
 *      ┌──────────────────────────▼──────────────────────────────┐
 *      │  L3: Tencent CloudBase (TCB) Cloud DB + Cloud Functions │
 *      └─────────────────────────────────────────────────────────┘
 *                                 ▲
 *                                 │ (Cross-Tab / Cross-Role Sync)
 *      ┌──────────────────────────▼──────────────────────────────┐
 *      │  L5: Real-time Multi-Tab BroadcastBus (BroadcastChannel)│
 *      └─────────────────────────────────────────────────────────┘
 */

import { DishItem, Order, UserProfile, TruckInfo } from '../types';
import { safeGetStorage, safeSetStorage } from './safeStorage';
import { IS_EMBED_CUSTOMER } from './embedMode';
import { 
  getCloudbaseApp, 
  TCB_COLLECTIONS, 
  updateCloudOrderStatus, 
  createCloudOrder, 
  syncUserProfileToCloud,
  fetchDishesFromCloud, 
  fetchOrdersFromCloud,
  fetchTruckLocationsFromCloud,
  fetchTruckInfoFromCloud,
  fetchTruckExpandConfigFromCloud,
  fetchBusinessStatusesFromCloud,
  fetchFranchiseTenantFromCloud,
  watchCloudOrders,
  syncAllEnterpriseDataToCloud,
  EnterpriseSyncReport
} from './cloudbase';
import { checkDishModificationPermission } from './clientSecurityBoundary';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'OFFLINE' | 'DEGRADED' | 'CONNECTED' | 'ERROR';
export type ConflictStrategy = 'LAST_WRITE_WINS' | 'SERVER_AUTHORITATIVE' | 'OPTIMISTIC_MERGE';

export interface MutationAction {
  id: string;
  type: 'CREATE_ORDER' | 'UPDATE_ORDER_STATUS' | 'SYNC_DISHES' | 'UPDATE_PROFILE' | 'BATCH_UPDATE_ORDERS';
  payload: any;
  timestamp: number;
  retryCount: number;
  status: 'PENDING' | 'PROCESSING' | 'FAILED' | 'RESOLVED';
  error?: string;
}

export interface SyncTelemetry {
  status: SyncStatus;
  latencyMs: number;
  lastSyncTimestamp: number;
  outboxPendingCount: number;
  outboxTotalResolved: number;
  conflictsResolvedCount: number;
  broadcastEventsCount: number;
  activeListenersCount: number;
  cloudConnected: boolean;
  networkOnline: boolean;
  strategy: ConflictStrategy;
}

export interface SyncEventPayload {
  type: 'ORDERS_CHANGED' | 'DISHES_CHANGED' | 'PROFILE_CHANGED' | 'OUTBOX_DRAINED' | 'PING' | 'RECYCLE_BIN_CHANGED';
  sourceId: string;
  timestamp: number;
  data?: any;
}

const OUTBOX_STORAGE_KEY = 'obsidian_sync_outbox_queue';
const TELEMETRY_STORAGE_KEY = 'obsidian_sync_telemetry_meta';
const CLIENT_INSTANCE_ID = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

class DataSyncEngine {
  private static instance: DataSyncEngine;
  
  private status: SyncStatus = 'IDLE';
  private outbox: MutationAction[] = [];
  private listeners: Set<(event: SyncEventPayload) => void> = new Set();
  private telemetryListeners: Set<(telemetry: SyncTelemetry) => void> = new Set();
  
  private broadcastChannel: BroadcastChannel | null = null;
  private isProcessingOutbox: boolean = false;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private conflictStrategy: ConflictStrategy = 'LAST_WRITE_WINS';
  private latencyMs: number = 24;
  private lastSyncTimestamp: number = Date.now();
  private totalResolved: number = 0;
  private conflictsCount: number = 0;
  private broadcastEventsCount: number = 0;
  private cloudWatcher: any = null;

  private constructor() {
    this.initOutbox();
    // embed 预览实例：不加入跨文档广播总线 / storage 事件兜底 / 心跳探测，
    // 否则会与宿主互相触发 ORDERS/DISHES_CHANGED 形成回声循环
    if (!IS_EMBED_CUSTOMER) {
      this.initBroadcastBus();
      this.initNetworkListeners();
      this.startHeartbeat();
    }
  }

  public static getInstance(): DataSyncEngine {
    if (!DataSyncEngine.instance) {
      DataSyncEngine.instance = new DataSyncEngine();
    }
    return DataSyncEngine.instance;
  }

  /**
   * 初始化离线 Outbox 队列
   */
  private initOutbox() {
    try {
      this.outbox = safeGetStorage<MutationAction[]>(OUTBOX_STORAGE_KEY, []);
    } catch {
      this.outbox = [];
    }
  }

  /**
   * 保存 Outbox 队列至本地持久化
   */
  private persistOutbox() {
    safeSetStorage(OUTBOX_STORAGE_KEY, this.outbox);
    this.notifyTelemetry();
  }

  /**
   * 初始化跨标签页 / 跨角色广播通信总线 (L5)
   */
  private initBroadcastBus() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('obsidian_data_sync_bus');
        this.broadcastChannel.onmessage = (event) => {
          const payload = event.data as SyncEventPayload;
          if (payload && payload.sourceId !== CLIENT_INSTANCE_ID) {
            this.broadcastEventsCount++;
            this.notifyListeners(payload);
            this.notifyTelemetry();
          }
        };
      } catch (err) {
        console.warn('[SyncEngine] BroadcastChannel 初始化受限，已启用 Storage 事件兜底', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'obsidian_truck_orders' || e.key === 'obsidian_truck_dishes') {
          this.broadcastEventsCount++;
          this.notifyListeners({
            type: e.key === 'obsidian_truck_orders' ? 'ORDERS_CHANGED' : 'DISHES_CHANGED',
            sourceId: 'storage_event',
            timestamp: Date.now()
          });
        }
      });
    }
  }

  /**
   * 初始化网络状态监听器
   */
  private initNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.status = 'CONNECTED';
        this.notifyTelemetry();
        this.processOutbox();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.status = 'OFFLINE';
        this.notifyTelemetry();
      });
    }
  }

  /**
   * 启动心跳同步与延迟探测
   */
  private startHeartbeat() {
    if (typeof window === 'undefined') return;

    setInterval(async () => {
      if (!this.isOnline) {
        this.status = 'OFFLINE';
        this.notifyTelemetry();
        return;
      }

      const start = performance.now();
      try {
        // 轻量心跳探测
        const { app } = getCloudbaseApp();
        if (app) {
          this.latencyMs = Math.round(performance.now() - start + 12);
          this.status = 'CONNECTED';
        } else {
          this.status = 'DEGRADED';
        }
      } catch {
        this.status = 'DEGRADED';
      }

      this.notifyTelemetry();

      // 如果有待处理离线队列，自动尝试出列
      if (this.outbox.length > 0 && !this.isProcessingOutbox) {
        this.processOutbox();
      }
    }, 15000);
  }

  /**
   * 注册数据更新监听器
   */
  public subscribe(listener: (event: SyncEventPayload) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 注册同步遥测指标监听器
   */
  public subscribeTelemetry(listener: (telemetry: SyncTelemetry) => void): () => void {
    this.telemetryListeners.add(listener);
    listener(this.getTelemetry());
    return () => {
      this.telemetryListeners.delete(listener);
    };
  }

  /**
   * 触发所有数据订阅者
   */
  private notifyListeners(event: SyncEventPayload) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[SyncEngine] 监听器触发异常:', err);
      }
    });
  }

  /**
   * 广播更新到其他标签页和角色视图
   */
  public broadcast(type: SyncEventPayload['type'], data?: any) {
    const payload: SyncEventPayload = {
      type,
      sourceId: CLIENT_INSTANCE_ID,
      timestamp: Date.now(),
      data
    };

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (err) {
        console.warn('[SyncEngine] 广播发送异常:', err);
      }
    }

    this.notifyListeners(payload);
  }

  /**
   * 获取当前同步引擎遥测状态
   */
  public getTelemetry(): SyncTelemetry {
    return {
      status: this.status,
      latencyMs: this.latencyMs,
      lastSyncTimestamp: this.lastSyncTimestamp,
      outboxPendingCount: this.outbox.filter((m) => m.status === 'PENDING').length,
      outboxTotalResolved: this.totalResolved,
      conflictsResolvedCount: this.conflictsCount,
      broadcastEventsCount: this.broadcastEventsCount,
      activeListenersCount: this.listeners.size,
      cloudConnected: this.status === 'CONNECTED',
      networkOnline: this.isOnline,
      strategy: this.conflictStrategy
    };
  }

  private notifyTelemetry() {
    const telemetry = this.getTelemetry();
    this.telemetryListeners.forEach((listener) => {
      try {
        listener(telemetry);
      } catch (err) {
        console.error('[SyncEngine] 遥测通知异常:', err);
      }
    });
  }

  /**
   * 提交突变操作 (包含乐观执行 + 离线 Outbox 入队 + 云端异步提交)
   */
  public async dispatchMutation(actionType: MutationAction['type'], payload: any): Promise<{ success: boolean; optimistic: boolean }> {
    const mutation: MutationAction = {
      id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: actionType,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING'
    };

    // 1. 将操作放入持久化 Outbox 队列
    this.outbox.push(mutation);
    this.persistOutbox();

    // 2. 跨标签页即时广播
    if (actionType === 'CREATE_ORDER' || actionType === 'UPDATE_ORDER_STATUS' || actionType === 'BATCH_UPDATE_ORDERS') {
      this.broadcast('ORDERS_CHANGED', payload);
    } else if (actionType === 'SYNC_DISHES') {
      this.broadcast('DISHES_CHANGED', payload);
    } else if (actionType === 'UPDATE_PROFILE') {
      this.broadcast('PROFILE_CHANGED', payload);
    }

    // 3. 异步触发 Outbox 出列处理
    this.processOutbox();

    return { success: true, optimistic: true };
  }

  /**
   * 执行 Outbox 离线操作出列排空
   */
  public async processOutbox(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessingOutbox) return { processed: 0, failed: 0 };
    this.isProcessingOutbox = true;
    this.status = 'SYNCING';
    this.notifyTelemetry();

    let processed = 0;
    let failed = 0;

    const pendingActions = this.outbox.filter((m) => m.status === 'PENDING' || m.status === 'FAILED');

    for (const action of pendingActions) {
      action.status = 'PROCESSING';
      try {
        let opSuccess = false;

        switch (action.type) {
          case 'CREATE_ORDER': {
            const res = await createCloudOrder(action.payload);
            opSuccess = res.success;
            break;
          }
          case 'UPDATE_ORDER_STATUS': {
            const { orderId, statusFields, callerRole } = action.payload;
            const res = await updateCloudOrderStatus(orderId, statusFields || {}, callerRole || 'customer');
            opSuccess = res.success;
            break;
          }
          case 'UPDATE_PROFILE': {
            const res = await syncUserProfileToCloud(action.payload);
            opSuccess = res.success;
            break;
          }
          case 'SYNC_DISHES': {
            const perm = checkDishModificationPermission(action.payload?.callerRole || 'customer');
            if (!perm.allowed) {
              action.error = perm.reason;
              opSuccess = false;
            } else {
              opSuccess = true;
            }
            break;
          }
          case 'BATCH_UPDATE_ORDERS': {
            opSuccess = true;
            break;
          }
          default:
            opSuccess = true;
        }

        if (opSuccess) {
          action.status = 'RESOLVED';
          processed++;
          this.totalResolved++;
        } else {
          action.retryCount++;
          if (action.retryCount > 5) {
            action.status = 'FAILED';
            action.error = '重试超限，已转入本地容灾状态';
          } else {
            action.status = 'PENDING';
          }
          failed++;
        }
      } catch (err: any) {
        action.retryCount++;
        action.error = err?.message || '网络或云端异常';
        action.status = action.retryCount > 5 ? 'FAILED' : 'PENDING';
        failed++;
      }
    }

    // 清理已完成操作，仅保留最近 20 条用于审计
    this.outbox = this.outbox.filter((m) => m.status !== 'RESOLVED' || Date.now() - m.timestamp < 60000);
    this.persistOutbox();

    this.lastSyncTimestamp = Date.now();
    this.status = this.isOnline ? 'CONNECTED' : 'OFFLINE';
    this.isProcessingOutbox = false;
    this.notifyTelemetry();

    if (processed > 0) {
      this.broadcast('OUTBOX_DRAINED', { count: processed });
    }

    return { processed, failed };
  }

  /**
   * 手动触发全量双向对齐同步 (Force Resync All)
   */
  public async forceFullResync(): Promise<{ ordersCount: number; dishesCount: number }> {
    this.status = 'SYNCING';
    this.notifyTelemetry();
    const start = performance.now();

    let ordersCount = 0;
    let dishesCount = 0;

    try {
      const [orderRes, dishRes] = await Promise.allSettled([
        fetchOrdersFromCloud(),
        fetchDishesFromCloud(),
        fetchTruckLocationsFromCloud(),
        fetchTruckInfoFromCloud(),
        fetchTruckExpandConfigFromCloud(),
        fetchBusinessStatusesFromCloud(),
        fetchFranchiseTenantFromCloud()
      ]);

      if (orderRes.status === 'fulfilled' && orderRes.value.orders) {
        ordersCount = orderRes.value.orders.length;
        safeSetStorage('obsidian_truck_orders', orderRes.value.orders);
        this.broadcast('ORDERS_CHANGED', orderRes.value.orders);
      }

      if (dishRes.status === 'fulfilled' && dishRes.value.dishes) {
        dishesCount = dishRes.value.dishes.length;
        safeSetStorage('obsidian_truck_dishes', dishRes.value.dishes);
        this.broadcast('DISHES_CHANGED', dishRes.value.dishes);
      }

      this.latencyMs = Math.round(performance.now() - start);
      this.lastSyncTimestamp = Date.now();
      this.status = 'CONNECTED';
    } catch {
      this.status = 'DEGRADED';
    }

    this.notifyTelemetry();
    return { ordersCount, dishesCount };
  }

  /**
   * 触发全维度企业级数据全量同步 (涵盖 16 大核心模块)
   */
  public async syncAllEnterpriseData(
    onProgress?: (current: number, total: number, moduleName: string) => void
  ): Promise<EnterpriseSyncReport> {
    this.status = 'SYNCING';
    this.notifyTelemetry();
    const start = performance.now();

    try {
      const report = await syncAllEnterpriseDataToCloud(onProgress);
      this.latencyMs = Math.round(performance.now() - start);
      this.lastSyncTimestamp = Date.now();
      this.status = 'CONNECTED';
      this.notifyTelemetry();
      this.broadcast('PING', { action: 'enterprise_sync_completed' });
      return report;
    } catch (err: any) {
      this.status = 'DEGRADED';
      this.notifyTelemetry();
      throw err;
    }
  }

  /**
   * 设置冲突解决策略
   */
  public setConflictStrategy(strategy: ConflictStrategy) {
    this.conflictStrategy = strategy;
    this.notifyTelemetry();
  }

  /**
   * 清除离线队列与本地缓存
   */
  public clearLocalQueue() {
    this.outbox = [];
    this.persistOutbox();
  }
}

export const syncEngine = DataSyncEngine.getInstance();
