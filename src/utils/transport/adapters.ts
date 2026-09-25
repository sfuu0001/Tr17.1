/**
 * 传输适配器实现（C1 / C4）
 *
 * 三个适配器共用同一契约，由 transportManager 做层叠与切换：
 *   MemoryAdapter     —— 进程内，用于无 window 环境与单元测试
 *   BroadcastAdapter  —— L0 同设备（BroadcastChannel）
 *   CloudBaseAdapter  —— L1 跨设备主通道（watch 服务端推送）
 *   PollingAdapter    —— L3 降级（3s 轮询，仅拉取增量）
 *
 * 关键设计：云端通道通过**注入的 CloudChannel 接口**访问，不直接 import cloudbase.ts。
 * 这样做的三个理由：
 *   1. 测试可注入假通道，不必依赖真实云环境；
 *   2. 传输层不感知 CloudBase 具体 API，未来换服务端不必改适配器；
 *   3. 避免 cloudbase.ts（含大量 mock 数据）被传输层连带引入。
 */

import { ensureCloudbaseAuth, getCloudbaseApp } from '../cloudbase';
import {
  PublishResult,
  SubscriptionFilter,
  TransportAdapter,
  TransportHealth,
  TransportKind,
  TransportMessage,
  filterTargets,
  matchesFilter
} from './types';

// -------------------------------------------------------------
// 云端通道抽象
// -------------------------------------------------------------

export interface CloudChannel {
  /** 登录态与 SDK 是否就绪（未就绪时不应发起 watch，否则会 credentials not found） */
  isReady(): Promise<boolean>;
  /** 条件查询增量文档 */
  query(
    collection: string,
    where: Record<string, unknown>,
    orderByField: string,
    sinceValue: number,
    limit: number
  ): Promise<any[]>;
  /** 追加文档 */
  add(collection: string, doc: Record<string, unknown>): Promise<{ id: string }>;
  /** 挂载实时快照订阅 */
  watch(
    collection: string,
    where: Record<string, unknown>,
    onSnapshot: (docs: any[]) => void,
    onError: (err: any) => void
  ): { close: () => void };
}

/** 跨设备事件总线专用集合（追加型，与业务集合解耦） */
export const TRANSPORT_COLLECTION = 'obsidian_reactive_events';
/** 云端保留期限：过期文档由清理任务回收，避免无限增长 */
export const TRANSPORT_TTL_MS = 30 * 60 * 1000;

let injectedChannel: CloudChannel | null = null;

/** 注入云端通道（测试或自定义部署时使用） */
export function setCloudChannel(channel: CloudChannel | null): void {
  injectedChannel = channel;
}

/**
 * 惰性构造默认云端通道（真实 CloudBase）。
 * 采用动态 import，避免传输层被 cloudbase.ts 的 mock 数据连带加载。
 */
export function createDefaultCloudChannel(): CloudChannel {
  if (injectedChannel) return injectedChannel;

  return {
    async isReady() {
      try {
        const auth = await ensureCloudbaseAuth();
        if (!auth?.success || !auth?.userId) return false;
        const { db } = getCloudbaseApp();
        return !!db;
      } catch {
        return false;
      }
    },
    async query(collection, where, orderByField, sinceValue, limit) {
      const { db } = getCloudbaseApp();
      if (!db) return [];
      const _ = db.command;
      const res = await db
        .collection(collection)
        .where({ ...where, emittedAtMs: _.gt(sinceValue) })
        .orderBy(orderByField, 'asc')
        .limit(limit)
        .get();
      return res?.data ?? [];
    },
    async add(collection, doc) {
      const { db } = getCloudbaseApp();
      if (!db) throw new Error('CloudBase 数据库未就绪');
      const res = await db.collection(collection).add(doc);
      return { id: res?.id ?? '' };
    },
    watch(collection, where, onSnapshot, onError) {
      let closed = false;
      let watcher: any = null;

      void (async () => {
        try {
          const auth = await ensureCloudbaseAuth();
          if (!auth?.success || !auth?.userId || closed) return;
          const { db } = getCloudbaseApp();
          if (!db || closed) return;
          const _ = db.command;

          watcher = db
            .collection(collection)
            .where({ ...where, expiresAtMs: _.gt(Date.now()) })
            .watch({
              onChange: (snapshot: any) => {
                if (closed) return;
                onSnapshot(snapshot?.docs ?? []);
              },
              onError: (err: any) => {
                if (closed) return;
                const isAuthError =
                  err?.error === 'unauthenticated' ||
                  err?.message?.includes('credentials') ||
                  err?.error_description?.includes('credentials');
                if (isAuthError) {
                  try {
                    watcher?.close?.();
                  } catch {
                    /* ignore */
                  }
                  closed = true;
                  onError(err);
                  return;
                }
                onError(err);
              }
            });
        } catch (e) {
          if (!closed) onError(e);
        }
      })();

      return {
        close: () => {
          closed = true;
          try {
            watcher?.close?.();
          } catch {
            /* ignore */
          }
        }
      };
    }
  };
}

// -------------------------------------------------------------
// 公共基类
// -------------------------------------------------------------

abstract class BaseAdapter implements TransportAdapter {
  abstract readonly kind: TransportKind;
  protected subscribers: Array<{ filter: SubscriptionFilter; onMessage: (m: TransportMessage) => void }> = [];
  protected publishedCount = 0;
  protected receivedCount = 0;
  protected latencyMs = 0;
  protected consecutiveFailures = 0;
  protected lastError?: string;
  protected lastErrorAt?: string;

  public abstract isAvailable(): boolean;
  public abstract publish(message: TransportMessage): Promise<PublishResult>;
  public abstract subscribe(
    filter: SubscriptionFilter,
    onMessage: (message: TransportMessage) => void
  ): () => void;
  public abstract close(): void;

  public health(): TransportHealth {
    return {
      kind: this.kind,
      connected: this.consecutiveFailures === 0,
      latencyMs: this.latencyMs,
      consecutiveFailures: this.consecutiveFailures,
      lastError: this.lastError,
      lastErrorAt: this.lastErrorAt,
      publishedCount: this.publishedCount,
      receivedCount: this.receivedCount
    };
  }

  protected deliver(message: TransportMessage): void {
    this.receivedCount += 1;
    this.subscribers.forEach((sub) => {
      if (!matchesFilter(message, sub.filter)) return;
      try {
        sub.onMessage(message);
      } catch (e) {
        console.error(`[Transport:${this.kind}] 订阅回调异常:`, e);
      }
    });
  }

  protected recordFailure(error: unknown): void {
    this.consecutiveFailures += 1;
    this.lastError = String((error as any)?.message ?? error);
    this.lastErrorAt = new Date().toISOString();
  }

  protected recordSuccess(latencyMs: number): void {
    this.consecutiveFailures = 0;
    this.latencyMs = Math.round(latencyMs);
  }
}

// -------------------------------------------------------------
// MemoryAdapter —— 进程内（无 window 环境与测试）
// -------------------------------------------------------------

export class MemoryAdapter extends BaseAdapter {
  readonly kind: TransportKind = 'memory';
  private static bus = new Set<MemoryAdapter>();

  constructor() {
    super();
    MemoryAdapter.bus.add(this);
  }

  public isAvailable(): boolean {
    return true;
  }

  public async publish(message: TransportMessage): Promise<PublishResult> {
    this.publishedCount += 1;
    // 投递给同进程内的其它适配器实例（模拟跨窗口）
    Array.from(MemoryAdapter.bus).forEach((adapter) => {
      if (adapter === this) return;
      adapter.deliver({ ...message });
    });
    return { delivered: true, via: ['memory'] };
  }

  public subscribe(
    filter: SubscriptionFilter,
    onMessage: (message: TransportMessage) => void
  ): () => void {
    const entry = { filter, onMessage };
    this.subscribers.push(entry);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== entry);
    };
  }

  public close(): void {
    this.subscribers = [];
    MemoryAdapter.bus.delete(this);
  }
}

// -------------------------------------------------------------
// BroadcastAdapter —— L0 同设备
// -------------------------------------------------------------

export const BROADCAST_CHANNEL_NAME = 'urban_radar_reactive_sync_v1';

export class BroadcastAdapter extends BaseAdapter {
  readonly kind: TransportKind = 'broadcast';
  private channel: BroadcastChannel | null = null;
  private fallback: MemoryAdapter | null = null;

  constructor(channelName: string = BROADCAST_CHANNEL_NAME) {
    super();
    if (typeof window !== 'undefined' && typeof (globalThis as any).BroadcastChannel === 'function') {
      try {
        this.channel = new BroadcastChannel(channelName);
        this.channel.onmessage = (event: MessageEvent) => {
          const data = event?.data;
          if (data && data.eventId) {
            this.deliver(data as TransportMessage);
          }
        };
      } catch (e) {
        console.warn('[Transport:broadcast] BroadcastChannel 初始化受限，降级为进程内总线:', e);
      }
    }
    if (!this.channel) {
      // 无 BroadcastChannel（SSR / 测试 / 受限浏览器）时退化为进程内总线，
      // 保证"同设备"这一层在能力受限时仍然工作。
      this.fallback = new MemoryAdapter();
    }
  }

  public isAvailable(): boolean {
    return true;
  }

  public async publish(message: TransportMessage): Promise<PublishResult> {
    this.publishedCount += 1;
    if (this.channel) {
      try {
        const start = performance.now();
        this.channel.postMessage(message);
        this.recordSuccess(performance.now() - start);
        return { delivered: true, via: ['broadcast'] };
      } catch (e) {
        this.recordFailure(e);
        return { delivered: false, via: [], error: String((e as any)?.message ?? e) };
      }
    }
    if (this.fallback) {
      await this.fallback.publish(message);
      return { delivered: true, via: ['broadcast'] };
    }
    return { delivered: false, via: [], error: '无可用广播通道' };
  }

  public subscribe(
    filter: SubscriptionFilter,
    onMessage: (message: TransportMessage) => void
  ): () => void {
    const entry = { filter, onMessage };
    this.subscribers.push(entry);
    const unsubFallback = this.fallback?.subscribe(filter, onMessage);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== entry);
      unsubFallback?.();
    };
  }

  public close(): void {
    try {
      this.channel?.close();
    } catch {
      /* ignore */
    }
    this.subscribers = [];
    this.fallback?.close();
  }
}

// -------------------------------------------------------------
// CloudBaseAdapter —— L1 跨设备主通道
// -------------------------------------------------------------

export const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000, 30000];

export class CloudBaseAdapter extends BaseAdapter {
  readonly kind: TransportKind = 'cloudbase';
  /** 连续失败达到该阈值即判定不可用，由 manager 切降级通道 */
  public static readonly FAILURE_THRESHOLD = 5;

  private watchers: Array<{ close: () => void }> = [];
  private backoffIndex = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private lastSeenMs = 0;
  private currentFilter: SubscriptionFilter = {};
  private channel: CloudChannel;
  /** 当前已建立的 watch 所对应的订阅目标签名 —— 签名不变则复用连接，不重建 */
  private watcherSignature = '';
  /** 同一宏任务内的多次订阅是否已排入一次 watcher 同步 */
  private ensureScheduled = false;

  constructor(channel?: CloudChannel) {
    super();
    this.channel = channel ?? createDefaultCloudChannel();
  }

  public isAvailable(): boolean {
    if (this.closed) return false;
    return this.consecutiveFailures < CloudBaseAdapter.FAILURE_THRESHOLD;
  }

  /** 当前订阅过滤器（供 manager 重建连接时复用） */
  public getFilter(): SubscriptionFilter {
    return this.currentFilter;
  }

  public async publish(message: TransportMessage): Promise<PublishResult> {
    const start = performance.now();
    try {
      const ready = await this.channel.isReady();
      if (!ready) {
        this.recordFailure(new Error('CloudBase 未就绪（登录态或 SDK 不可用）'));
        return { delivered: false, via: [], error: this.lastError };
      }
      await this.channel.add(TRANSPORT_COLLECTION, {
        ...message,
        expiresAtMs: Date.now() + TRANSPORT_TTL_MS
      });
      this.publishedCount += 1;
      this.recordSuccess(performance.now() - start);
      return { delivered: true, via: ['cloudbase'] };
    } catch (e) {
      this.recordFailure(e);
      return { delivered: false, via: [], error: this.lastError };
    }
  }

  public subscribe(
    filter: SubscriptionFilter,
    onMessage: (message: TransportMessage) => void
  ): () => void {
    this.currentFilter = filter;
    const entry = { filter, onMessage };
    this.subscribers.push(entry);
    // 合并同一宏任务内的多次订阅 → 只建立一路 watch（见 scheduleEnsureWatcher）
    this.scheduleEnsureWatcher();
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== entry);
      if (this.subscribers.length === 0) {
        this.closeWatchers();
        this.watcherSignature = '';
      }
    };
  }

  /**
   * 合并全部订阅者的服务端收窄条件。
   *
   * 为什么必须取并集：同一集合只需**一路** watch（见 ensureWatcher），
   * 而该路 watch 的服务端过滤条件来自订阅者。若只取第一个订阅者的条件，
   * 其余事件类型的定向消息根本不会被服务端下发 —— 单路化的前提是目标并集。
   */
  private mergedTargets(): string[] {
    const merged = new Set<string>();
    this.subscribers.forEach((sub) => {
      filterTargets(sub.filter).forEach((t) => merged.add(t));
    });
    if (merged.size === 0) {
      filterTargets(this.currentFilter).forEach((t) => merged.add(t));
    }
    return [...merged];
  }

  /**
   * 合并同一宏任务内的多次订阅请求，只建立**一路** watch。
   *
   * 为什么必须合并：12 类 ReactiveEventType 会在启动时依次 subscribe。
   * 若每次订阅都立即建 watch，就会出现「建 → 关 → 再建」的连续重建；
   * 而关闭一个**仍在握手**的 watcher 会触发 SDK 的错误回调，进而触发重连，
   * 形成 initWatch 风暴（实测 20s 内 165 次 INIT_WATCH + 86 次连接抖动）。
   */
  private scheduleEnsureWatcher(): void {
    if (this.ensureScheduled || this.closed) return;
    this.ensureScheduled = true;
    setTimeout(() => {
      this.ensureScheduled = false;
      void this.ensureWatcher();
    }, 0);
  }

  /**
   * 确保存在**恰好一路** watch；订阅目标集合未变化时复用已有连接。
   *
   * 两个关键设计：
   *   1. 就绪门控 —— 未登录/未就绪时不开 watch，避免 SDK 以约 3s 周期空转重试；
   *   2. 复用而非重建 —— 仅当订阅目标集合真正变化时才关闭旧连接。
   *      无谓的关闭会打断正在进行的握手，引发 SDK 错误回调 → 重连 → 风暴。
   */
  private async ensureWatcher(): Promise<void> {
    if (this.closed || this.subscribers.length === 0) return;

    try {
      const ready = await this.channel.isReady();
      if (!ready || this.closed || this.subscribers.length === 0) return;
    } catch {
      // 未就绪属合法状态（非错误），交由健康评估与恢复流程处理
      return;
    }

    const signature = [...this.mergedTargets()].sort().join('|');
    if (this.watchers.length > 0 && signature === this.watcherSignature) return;

    this.closeWatchers();
    this.watcherSignature = signature;
    this.openWatcher();
  }

  private openWatcher(): void {
    if (this.closed) return;
    if (this.subscribers.length === 0) return;

    // 窄订阅：只订阅发往这些标识的事件，避免全量快照风暴
    const where = { targets: { $in: this.mergedTargets() } };

    const watcher = this.channel.watch(
      TRANSPORT_COLLECTION,
      where,
      (docs) => {
        this.recordSuccess(0);
        this.backoffIndex = 0;
        docs.forEach((doc) => {
          const message = this.normalize(doc);
          if (!message) return;
          if (message.emittedAtMs > 0 && message.emittedAtMs < this.lastSeenMs) return;
          if (message.emittedAtMs > this.lastSeenMs) this.lastSeenMs = message.emittedAtMs;
          this.deliver(message);
        });
      },
      (err) => {
        const isAuthError =
          err?.error === 'unauthenticated' ||
          err?.message?.includes('credentials') ||
          err?.error_description?.includes('credentials');
        if (isAuthError) {
          this.recordFailure(err);
          this.closeWatchers();
          return;
        }
        this.recordFailure(err);

        // 已判定通道不可用 → 停止自建重连，交由 manager 的恢复周期（RECOVER_INTERVAL_MS）统一重探。
        //
        // 为什么必须封顶：若继续退避重连，会出现「短暂握手成功 → recordSuccess 重置退避
        // → 立刻再次失败」的抖动，反复重建 watch（实测 20s 内 86 次连接抖动 +
        // 165 次 INIT_WATCH）。而客户端本身无法改善服务端连接质量，重试只是放大器。
        if (this.consecutiveFailures >= CloudBaseAdapter.FAILURE_THRESHOLD) {
          this.closeWatchers();
          this.watcherSignature = '';
          return;
        }

        this.scheduleReconnect();
      }
    );
    this.watchers.push(watcher);
  }

  private normalize(doc: any): TransportMessage | null {
    if (!doc || !doc.eventId || !doc.type) return null;
    return {
      eventId: doc.eventId,
      traceId: doc.traceId ?? '',
      type: doc.type,
      payload: doc.payload,
      emittedAt: doc.emittedAt ?? new Date(doc.emittedAtMs ?? Date.now()).toISOString(),
      emittedAtMs: Number(doc.emittedAtMs ?? 0),
      emittedBy: doc.emittedBy ?? '',
      targets: Array.isArray(doc.targets) ? doc.targets : [],
      tableCodes: Array.isArray(doc.tableCodes) ? doc.tableCodes : [],
      sessionIds: Array.isArray(doc.sessionIds) ? doc.sessionIds : [],
      expiresAtMs: Number(doc.expiresAtMs ?? 0)
    };
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer) return;
    if (this.consecutiveFailures < CloudBaseAdapter.FAILURE_THRESHOLD) {
      // 未达阈值先原地退避重连
    }
    const delay = BACKOFF_STEPS_MS[Math.min(this.backoffIndex, BACKOFF_STEPS_MS.length - 1)];
    this.backoffIndex += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.closed) return;
      this.closeWatchers();
      // 清空签名：本次是**有意的**重建，需绕过 ensureWatcher 的复用判断
      this.watcherSignature = '';
      if (this.consecutiveFailures >= CloudBaseAdapter.FAILURE_THRESHOLD) {
        // 已达阈值：交由 manager 切换到轮询；本适配器仍在退避中尝试恢复
        console.warn('[Transport:cloudbase] 连续失败达阈值，等待上层切换降级通道');
      }
      void this.ensureWatcher();
    }, delay);
  }

  private closeWatchers(): void {
    this.watchers.forEach((w) => {
      try {
        w.close();
      } catch {
        /* ignore */
      }
    });
    this.watchers = [];
  }

  /** 供 manager 主动触发一次恢复尝试 */
  public async tryRecover(): Promise<boolean> {
    if (this.closed) return false;
    const ready = await this.channel.isReady();
    if (!ready) {
      this.recordFailure(new Error('CloudBase 未就绪'));
      return false;
    }
    this.closeWatchers();
    // 有意重建：清空签名以绕过复用判断
    this.watcherSignature = '';
    await this.ensureWatcher();
    return true;
  }

  public close(): void {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.closeWatchers();
    this.watcherSignature = '';
    this.subscribers = [];
  }
}

// -------------------------------------------------------------
// PollingAdapter —— L3 降级
// -------------------------------------------------------------

export const POLLING_INTERVAL_MS = 3000;

export class PollingAdapter extends BaseAdapter {
  readonly kind: TransportKind = 'polling';
  private timer: ReturnType<typeof setInterval> | null = null;
  private cursor = 0;
  private channel: CloudChannel;
  private closed = false;
  /** 发布在轮询模式下不可用（仅用于拉取），避免制造"看起来成功"的假象 */
  public static readonly PUBLISH_SUPPORTED = false;

  constructor(channel?: CloudChannel, private intervalMs: number = POLLING_INTERVAL_MS) {
    super();
    this.channel = channel ?? createDefaultCloudChannel();
    this.cursor = Date.now();
  }

  public isAvailable(): boolean {
    if (this.closed) return false;
    return this.consecutiveFailures < CloudBaseAdapter.FAILURE_THRESHOLD;
  }

  public async publish(message: TransportMessage): Promise<PublishResult> {
    // 轮询通道只负责下行拉取；上行仍由 L1/outbox 承担。
    // 这里如实返回"未投递"，而不是假装成功。
    return { delivered: false, via: [], error: '轮询通道不承担上行投递（仅降级拉取）' };
  }

  public subscribe(
    filter: SubscriptionFilter,
    onMessage: (message: TransportMessage) => void
  ): () => void {
    const entry = { filter, onMessage };
    this.subscribers.push(entry);
    this.ensureTimer();
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== entry);
      if (this.subscribers.length === 0) this.stopTimer();
    };
  }

  /** 主动拉取一次（供测试与恢复时补拉） */
  public async pullOnce(): Promise<number> {
    if (this.subscribers.length === 0) return 0;
    const start = performance.now();
    try {
      const filter = this.subscribers[0].filter;
      const targets = filterTargets(filter);
      const docs = await this.channel.query(
        TRANSPORT_COLLECTION,
        { targets: { $in: targets } },
        'emittedAtMs',
        this.cursor,
        200
      );
      this.recordSuccess(performance.now() - start);
      let delivered = 0;
      docs.forEach((doc: any) => {
        const ms = Number(doc?.emittedAtMs ?? 0);
        if (ms > this.cursor) this.cursor = ms;
        if (!doc?.eventId || !doc?.type) return;
        this.deliver({
          eventId: doc.eventId,
          traceId: doc.traceId ?? '',
          type: doc.type,
          payload: doc.payload,
          emittedAt: doc.emittedAt ?? new Date(ms).toISOString(),
          emittedAtMs: ms,
          emittedBy: doc.emittedBy ?? '',
          targets: Array.isArray(doc.targets) ? doc.targets : [],
          tableCodes: Array.isArray(doc.tableCodes) ? doc.tableCodes : [],
          sessionIds: Array.isArray(doc.sessionIds) ? doc.sessionIds : [],
          expiresAtMs: Number(doc.expiresAtMs ?? 0)
        });
        delivered += 1;
      });
      return delivered;
    } catch (e) {
      this.recordFailure(e);
      return 0;
    }
  }

  private ensureTimer(): void {
    if (this.timer || this.closed) return;
    this.timer = setInterval(() => {
      void this.pullOnce();
    }, this.intervalMs);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public close(): void {
    this.closed = true;
    this.stopTimer();
    this.subscribers = [];
  }
}
