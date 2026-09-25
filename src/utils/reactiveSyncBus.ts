/**
 * 响应式同步总线（传输层门面）
 *
 * C1 改造说明：本模块原有实现与 BroadcastChannel 强耦合（仅同浏览器可用）。
 * 现改为**委托给 TransportManager**，由它层叠 L0 广播 / L1 CloudBase watch /
 * L2 上行队列 / L3 轮询。公开 API 保持向后兼容：
 *
 *   reactiveSyncBus.subscribe(eventType, cb)              // 原有签名不变
 *   reactiveSyncBus.publish(eventType, payload)           // 原有签名不变
 *
 * 新增（可选）：
 *   subscribe(eventType, cb, filter)   // 收窄订阅，避免快照风暴
 *   publish(eventType, payload, opts)  // 指定 targets / 会话 / 桌号
 *   configureTransport({ cloudChannel, enableCloud, identity })
 *   transportHealth()                  // 供探针与监测台
 *
 * 目标推导规则：由 describeRouting() 统一从事件类型与 payload 推导
 * targets / sessionIds / tableCodes，避免各调用点各写一份。
 */

import {
  TransportManager,
  TransportManagerOptions,
  TransportManager as TransportManagerType
} from './transport/transportManager';

export type ReactiveEventType =
  | 'DISH_PRICE_CHANGED'        // 菜品改价或售罄状态变更 -> 食客端菜单与购物车联动
  | 'KDS_DISH_FINISHED'         // KDS 厨房后厨划单出品 -> 食客端雷达与骑手派送池联动
  | 'TRUCK_LOCATION_MOVED'      // 餐车 GPS 坐标移动或展开收起 -> 全域地图与电子围栏联动
  | 'ORDER_STATUS_MUTATED'      // 订单状态流转 (接单/备餐/骑手在途/已送达) -> 全局联动
  | 'INVENTORY_STOCK_ALERT'     // 原物料低水位或损耗过大 -> 商家后厨与采购联动
  | 'SENTINEL_POLICY_TRIGGERED' // 自动化安全策略触发 (限流/收缩配送半径/熔断) -> 全端联动
  | 'EMERGENCY_PEAK_MITIGATION' // 爆单紧急削峰与排队限流 -> 客户端加购提示与时延调整
  | 'FRANCHISE_POLICY_LOCKED'   // 总部下发爆品配方强锁定 -> 各分舵与餐车工作台锁定
  // ---- 堂食桌台会话与多端联动授权 ----
  | 'TABLE_SESSION_MUTATED'     // 会话成员增减 / 状态变更 -> 同桌各端与商家端监测台
  | 'TABLE_LINK_REQUEST'        // 联动授权请求 —— 目标端弹出强制授权弹窗
  | 'TABLE_LINK_SETTLED'        // 请求已被处理（任一同意/拒绝/超时）-> 其余端即时收窗
  | 'PARTICIPANT_NODE_CHANGED'; // 参与者浏览分类/点击菜品变更 -> 商家监测台（调用方须节流）

export interface ReactivePayloadMap {
  DISH_PRICE_CHANGED: { dishId: string; newPrice?: number; isSoldOut?: boolean; operator: string };
  KDS_DISH_FINISHED: { orderId: string; dishName: string; station: 'grill' | 'barista'; finishedAt: string };
  TRUCK_LOCATION_MOVED: { truckId: string; coordinates: [number, number]; radiusKm: number; address: string };
  ORDER_STATUS_MUTATED: { orderId: string; oldStatus: string; newStatus: string; updatedAt: string };
  INVENTORY_STOCK_ALERT: { materialId: string; materialName: string; currentStock: number; safeStock: number };
  SENTINEL_POLICY_TRIGGERED: { policyId: string; level: 'info' | 'warning' | 'critical'; title: string; actionApplied: string };
  EMERGENCY_PEAK_MITIGATION: { isActive: boolean; queueDelayMinutes: number; restrictedCategories?: string[]; reason: string };
  FRANCHISE_POLICY_LOCKED: { lockedSkuIds: string[]; lockedPricePolicy: boolean; enforcedBy: string };
  TABLE_SESSION_MUTATED: {
    sessionId: string;
    tableCode: string;
    change:
      | 'opened'
      | 'participant_joined'
      | 'participant_removed'
      | 'authority_changed'
      | 'owner_transferred'
      | 'cart_updated'
      | 'closed';
    participantId?: string;
    actorId?: string;
    at: string;
  };
  TABLE_LINK_REQUEST: {
    requestId: string;
    sessionId: string;
    tableCode: string;
    requesterId: string;
    requesterMaskedId: string;
    requesterName: string;
    targets: string[];
    expiresAt: string;
  };
  TABLE_LINK_SETTLED: {
    requestId: string;
    sessionId: string;
    tableCode: string;
    status: 'granted' | 'denied' | 'expired' | 'superseded';
    resolvedBy?: string;
    resolvedByMasked?: string;
    resolvedByName?: string;
    at: string;
  };
  PARTICIPANT_NODE_CHANGED: {
    sessionId: string;
    tableCode: string;
    participantId: string;
    categoryId?: string;
    categoryName?: string;
    lastClickedDishId?: string;
    lastClickedDishName?: string;
    at: string;
  };
}

export interface ReactiveSubscriptionFilter {
  tableCodes?: string[];
  sessionIds?: string[];
  participantIds?: string[];
  includeBroadcast?: boolean;
}

export interface ReactivePublishOptions {
  targets?: string[];
  tableCodes?: string[];
  sessionIds?: string[];
  traceId?: string;
  emittedBy?: string;
}

type EventCallback<T extends ReactiveEventType> = (payload: ReactivePayloadMap[T]) => void;

/** 事件路由推导：决定这条事件发给谁、属于哪张桌/哪个会话 */
export function describeRouting(
  eventType: ReactiveEventType,
  payload: any
): { targets: string[]; tableCodes: string[]; sessionIds: string[] } {
  const tableCodes: string[] = [];
  const sessionIds: string[] = [];
  const targets: string[] = ['*']; // '*' = 全体（商家端与全局事件）

  if (payload && typeof payload === 'object') {
    if (typeof payload.tableCode === 'string') tableCodes.push(payload.tableCode);
    if (typeof payload.sessionId === 'string') sessionIds.push(payload.sessionId);
  }

  // 定向投递：只有这些收件人需要立刻弹窗
  if (eventType === 'TABLE_LINK_REQUEST' && Array.isArray(payload?.targets)) {
    payload.targets.forEach((t: unknown) => {
      if (typeof t === 'string') targets.push(t);
    });
  }

  return { targets, tableCodes, sessionIds };
}

class ReactiveSyncBusEngine {
  private manager: TransportManagerType;
  private listeners: Map<ReactiveEventType, Set<EventCallback<any>>> = new Map();
  private managerUnsubs: Array<() => void> = [];
  private boundTypes = new Set<ReactiveEventType>();
  private filters: Map<ReactiveEventType, ReactiveSubscriptionFilter> = new Map();

  constructor(options?: TransportManagerOptions) {
    this.manager = new TransportManager(options);
    this.manager.start();
  }

  /** 重建传输层（测试注入假通道 / 自定义部署时使用） */
  public configureTransport(options: TransportManagerOptions): void {
    this.managerUnsubs.forEach((fn) => fn());
    this.managerUnsubs = [];
    this.boundTypes.clear();
    this.manager.close();
    this.manager = new TransportManager(options);
    this.manager.start();
    // 按已登记的过滤器重建订阅
    this.listeners.forEach((_set, type) => this.ensureManagerSubscription(type));
  }

  /** 更新本端标识，用于 emittedBy 与跨设备收件人判定 */
  public setIdentity(identity: string): void {
    this.manager.setIdentity(identity);
  }

  private ensureManagerSubscription(eventType: ReactiveEventType): void {
    if (this.boundTypes.has(eventType)) return;
    this.boundTypes.add(eventType);
    const filter = this.filters.get(eventType) ?? {};
    const unsub = this.manager.subscribe(filter, (message) => {
      if (message.type !== eventType) return;
      this.dispatchLocal(eventType, message.payload as any, false);
    });
    this.managerUnsubs.push(unsub);
  }

  /**
   * 订阅特定响应式事件。
   * @param filter 可选收窄条件；不传则接收该类型的全部事件（沿用旧行为）
   */
  public subscribe<T extends ReactiveEventType>(
    eventType: T,
    callback: EventCallback<T>,
    filter?: ReactiveSubscriptionFilter
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
      const effective: ReactiveSubscriptionFilter = filter ?? {};
      this.filters.set(eventType, effective);
      this.ensureManagerSubscription(eventType);
    }
    const set = this.listeners.get(eventType)!;
    set.add(callback);

    return () => {
      set.delete(callback);
    };
  }

  /**
   * 发布全局事件。
   * 本地订阅者同步收到；同浏览器其它标签页经 L0 广播收到；
   * 跨设备经 L1 CloudBase 推送收到（失败则入 L2 队列）。
   */
  public publish<T extends ReactiveEventType>(
    eventType: T,
    payload: ReactivePayloadMap[T],
    options: ReactivePublishOptions = {}
  ): void {
    const routing = describeRouting(eventType, payload);
    void this.manager.publish(eventType, payload, {
      targets: [...(options.targets ?? []), ...routing.targets],
      tableCodes: [...(options.tableCodes ?? []), ...routing.tableCodes],
      sessionIds: [...(options.sessionIds ?? []), ...routing.sessionIds],
      traceId: options.traceId,
      emittedBy: options.emittedBy
    });
  }

  /** 传输层健康度：降级状态、各通道失败次数、上行队列长度 */
  public transportHealth() {
    return this.manager.health();
  }

  public isDegraded(): boolean {
    return this.manager.isDegraded();
  }

  public flushOutbox(): Promise<number> {
    return this.manager.flushOutbox();
  }

  private dispatchLocal<T extends ReactiveEventType>(
    eventType: T,
    payload: ReactivePayloadMap[T],
    broadcastDomEvent = true
  ): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[ReactiveBus] 事件处理回调异常 [${eventType}]:`, err);
        }
      });
    }

    // 兼容派发原生 DOM CustomEvent（保留旧契约）
    if (broadcastDomEvent && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(`reactive_bus:${eventType}`, {
          detail: payload
        })
      );
    }
  }
}

export const reactiveSyncBus = new ReactiveSyncBusEngine();
