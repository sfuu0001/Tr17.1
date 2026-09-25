/**
 * 传输层管理器（C1 / C6）
 *
 * 职责：
 *   1. 层叠 L0–L3 通道：Broadcast（同设备）+ CloudBase（跨设备）+ 轮询（降级）
 *   2. eventId 幂等去重：跨通道与自回声双重投递都会被过滤
 *   3. 连续失败自动切换降级通道，恢复后自动切回并补拉
 *   4. 上行失败落本地 outbox（L2 断网不丢），恢复后重放
 *
 * 业务代码只与 reactiveSyncBus 交互；本管理器是它的传输实现。
 */

import {
  PublishResult,
  SeenRegistry,
  SubscriptionFilter,
  TransportAdapter,
  TransportHealth,
  TransportKind,
  TransportMessage,
  matchesFilter
} from './types';
import {
  BroadcastAdapter,
  CloudBaseAdapter,
  CloudChannel,
  MemoryAdapter,
  POLLING_INTERVAL_MS,
  PollingAdapter
} from './adapters';

const TRANSPORT_OUTBOX_KEY = 'obsidian_transport_outbox';
/** 健康评估周期 */
const HEALTH_CHECK_INTERVAL_MS = 5000;
/** 降级状态下尝试恢复的周期 */
const RECOVER_INTERVAL_MS = 60000;
/** 本地上行队列上限 */
const OUTBOX_CAP = 200;

function rid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export interface PublishOptions {
  targets?: string[];
  tableCodes?: string[];
  sessionIds?: string[];
  traceId?: string;
  emittedBy?: string;
}

export interface LayerHealth {
  broadcast: TransportHealth | null;
  cloudbase: TransportHealth | null;
  polling: TransportHealth | null;
  activeKind: TransportKind;
  degraded: boolean;
  outboxSize: number;
  seenCount: number;
}

export interface TransportManagerOptions {
  /** 注入云端通道（测试用）；缺省走真实 CloudBase */
  cloudChannel?: CloudChannel;
  /** 是否启用跨设备通道（无云端环境时置 false，仅本地总线） */
  enableCloud?: boolean;
  identity?: string;
}

export class TransportManager {
  private broadcast: BroadcastAdapter;
  private cloud: CloudBaseAdapter | null = null;
  private polling: PollingAdapter | null = null;
  private memory = new MemoryAdapter();

  private seen = new SeenRegistry(800);
  private subscribers: Array<{ filter: SubscriptionFilter; onMessage: (m: TransportMessage) => void }> = [];
  private unsubscribers: Array<() => void> = [];

  private outbox: TransportMessage[] = [];
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private recoverTimer: ReturnType<typeof setInterval> | null = null;
  private pollingActive = false;
  private identity: string;
  private lastCursorMs = 0;
  private closed = false;
  private cloudEnabled: boolean;

  constructor(options: TransportManagerOptions = {}) {
    this.identity = options.identity ?? 'anonymous';
    this.cloudEnabled = options.enableCloud !== false;
    this.broadcast = new BroadcastAdapter();

    if (this.cloudEnabled) {
      const channel = options.cloudChannel;
      this.cloud = new CloudBaseAdapter(channel);
      this.polling = new PollingAdapter(channel, POLLING_INTERVAL_MS);
    }

    this.loadOutbox();
  }

  // -----------------------------------------------------------
  // 身份
  // -----------------------------------------------------------

  /** 更新本端标识（participantId / merchantId），用于 emittedBy 与订阅收窄 */
  public setIdentity(identity: string): void {
    this.identity = identity || 'anonymous';
  }

  public getIdentity(): string {
    return this.identity;
  }

  // -----------------------------------------------------------
  // 订阅
  // -----------------------------------------------------------

  /**
   * 订阅事件。
   * filter 必须尽量收窄：顾客端只订阅"我这张桌 + 发给我"的事件，
   * 否则一店多桌会形成快照风暴（决策书 §3.1）。
   */
  public subscribe(
    filter: SubscriptionFilter,
    onMessage: (message: TransportMessage) => void
  ): () => void {
    const entry = { filter, onMessage };
    this.subscribers.push(entry);

    // L0 同设备
    this.unsubscribers.push(this.broadcast.subscribe(filter, (m) => this.onRemote(m)));

    // L2 进程内（BroadcastChannel 不可用时的兜底）
    this.unsubscribers.push(this.memory.subscribe(filter, (m) => this.onRemote(m)));

    // L1 跨设备
    if (this.cloud) {
      this.unsubscribers.push(this.cloud.subscribe(filter, (m) => this.onRemote(m)));
    }

    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== entry);
    };
  }

  /**
   * 统一分发入口。
   *
   * 必须在此处再做一次 matchesFilter —— 适配器层只保证"该适配器订阅命中"，
   * 而 manager 会把一次远端消息扇出给**全部**订阅者。
   * 若此处不过滤，收窄订阅形同虚设：
   *   一条发给 cust_B 的授权请求会泄漏给同进程所有端（快照风暴 + 隐私泄漏）。
   * 本地 publish 同理：发布者自身若不在收件人集合内，也不应收到自己的事件。
   */
  private dispatchToSubscribers(message: TransportMessage): void {
    this.subscribers.forEach((sub) => {
      if (!matchesFilter(message, sub.filter)) return;
      try {
        sub.onMessage(message);
      } catch (e) {
        console.error('[Transport] 订阅回调异常:', e);
      }
    });
  }

  /** 远端消息入口：统一去重后再分发 */
  private onRemote(message: TransportMessage): void {
    if (this.closed) return;
    if (!this.seen.firstTime(message.eventId)) return;
    if (message.emittedAtMs > this.lastCursorMs) this.lastCursorMs = message.emittedAtMs;
    this.dispatchToSubscribers(message);
  }

  // -----------------------------------------------------------
  // 发布
  // -----------------------------------------------------------

  public async publish(
    type: string,
    payload: unknown,
    options: PublishOptions = {}
  ): Promise<PublishResult> {
    const now = Date.now();
    const message: TransportMessage = {
      eventId: rid('evt'),
      traceId: options.traceId || rid('trace'),
      type,
      payload,
      emittedAt: new Date(now).toISOString(),
      emittedAtMs: now,
      emittedBy: options.emittedBy || this.identity,
      targets: options.targets && options.targets.length > 0 ? options.targets : ['*'],
      tableCodes: options.tableCodes ?? [],
      sessionIds: options.sessionIds ?? [],
      expiresAtMs: now + 30 * 60 * 1000
    };

    // 先标记已见：本端投递与随后云端回显共用同一 eventId，
    // 若不预先标记，自己的订阅者会收到两次。
    this.seen.firstTime(message.eventId);
    this.lastCursorMs = Math.max(this.lastCursorMs, now);

    // 1) 本地立即投递（BroadcastChannel 不会回调自身上下文，必须显式投递）
    //    仍走 matchesFilter：收窄订阅的端不应因"自己是发布者"而多收一条。
    this.dispatchToSubscribers(message);

    const via: TransportKind[] = ['memory'];

    // 2) L0 同设备广播（供同浏览器其它标签页）
    const localRes = await this.broadcast.publish(message);
    if (localRes.delivered) via.push('broadcast');

    // 3) L1 跨设备
    if (this.cloud && !this.pollingActive) {
      const cloudRes = await this.cloud.publish(message);
      if (cloudRes.delivered) {
        via.push('cloudbase');
      } else {
        this.enqueueOutbox(message);
      }
    } else if (this.cloud && this.pollingActive) {
      // 降级期间：轮询通道不承担上行，进入 outbox 等待恢复
      this.enqueueOutbox(message);
      void this.cloud.tryRecover();
    }

    return { delivered: via.length > 0, via };
  }

  // -----------------------------------------------------------
  // L2 上行队列（断网不丢）
  // -----------------------------------------------------------

  private loadOutbox(): void {
    try {
      const g: any = globalThis as any;
      const raw = g.localStorage?.getItem(TRANSPORT_OUTBOX_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) this.outbox = parsed.slice(-OUTBOX_CAP);
    } catch {
      this.outbox = [];
    }
  }

  private persistOutbox(): void {
    try {
      const g: any = globalThis as any;
      g.localStorage?.setItem(TRANSPORT_OUTBOX_KEY, JSON.stringify(this.outbox.slice(-OUTBOX_CAP)));
    } catch (e) {
      console.warn('[Transport] 上行队列持久化失败（可能配额已满）:', e);
    }
  }

  private enqueueOutbox(message: TransportMessage): void {
    if (this.outbox.some((m) => m.eventId === message.eventId)) return;
    this.outbox.push(message);
    if (this.outbox.length > OUTBOX_CAP) this.outbox = this.outbox.slice(-OUTBOX_CAP);
    this.persistOutbox();
    // 秒同步（业务数据类）：入箱后 ~0.9s 内立即尝试一次快重试，
    // 不等 60s 恢复周期 —— 业务写操作 ≤1s 云端可达的关键兜底路径
    this.scheduleFastOutboxRetry();
  }

  private fastRetryTimer: ReturnType<typeof setTimeout> | null = null;

  private scheduleFastOutboxRetry(): void {
    if (this.fastRetryTimer) return;
    this.fastRetryTimer = setTimeout(() => {
      this.fastRetryTimer = null;
      if (this.outbox.length > 0 && this.cloud) {
        void this.flushOutbox().catch(() => {});
      }
    }, 900);
    // 不阻塞进程退出
    (this.fastRetryTimer as any)?.unref?.();
  }

  /** 重放上行队列；成功投递的条目出列。返回成功条数 */
  public async flushOutbox(): Promise<number> {
    if (!this.cloud || this.outbox.length === 0) return 0;
    let ok = 0;
    const remaining: TransportMessage[] = [];
    for (const message of this.outbox) {
      // 超期事件直接丢弃（避免恢复后投递过时授权请求）
      if (message.expiresAtMs && message.expiresAtMs < Date.now()) continue;
      const res = await this.cloud.publish(message);
      if (res.delivered) ok += 1;
      else remaining.push(message);
    }
    this.outbox = remaining;
    this.persistOutbox();
    return ok;
  }

  public getOutboxSize(): number {
    return this.outbox.length;
  }

  // -----------------------------------------------------------
  // L3/L4：降级与恢复
  // -----------------------------------------------------------

  /** 启动健康评估与恢复定时器（幂等） */
  public start(): void {
    if (this.closed) return;
    if (this.healthTimer) return;

    this.healthTimer = setInterval(() => {
      void this.evaluateHealth();
    }, HEALTH_CHECK_INTERVAL_MS);

    this.recoverTimer = setInterval(() => {
      void this.tryRestore();
    }, RECOVER_INTERVAL_MS);

    // 网络恢复时立即尝试出列与切回
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        void this.tryRestore();
      });
    }
  }

  private async evaluateHealth(): Promise<void> {
    if (!this.cloud || !this.polling) return;
    const cloudHealth = this.cloud.health();

    if (!this.pollingActive && cloudHealth.consecutiveFailures >= CloudBaseAdapter.FAILURE_THRESHOLD) {
      this.activatePolling();
    }
  }

  /** 立即评估一次健康度（供测试与商家端"立即体检"入口） */
  public async evaluateHealthNow(): Promise<void> {
    await this.evaluateHealth();
  }

  /** 手动/自动切到 L3 轮询 */
  public activatePolling(): void {
    if (!this.polling || this.pollingActive) return;
    this.pollingActive = true;
    const filter = this.subscribers[0]?.filter ?? {};
    this.unsubscribers.push(this.polling.subscribe(filter, (m) => this.onRemote(m)));
    console.warn('[Transport] 跨设备主通道连续失败，已降级至 3s 轮询（L3）');
    this.emitProbe('anomaly', { phase: 'transport_degraded', activeKind: 'polling' });
  }

  /** 尝试恢复 L1；成功则关闭轮询 */
  public async tryRestore(): Promise<boolean> {
    if (!this.cloud) return false;
    const restored = await this.cloud.tryRecover();
    if (!restored) return false;

    await this.flushOutbox();

    if (this.pollingActive && this.polling) {
      this.pollingActive = false;
      // 补拉一次，避免降级窗口内的消息缺口
      await this.polling.pullOnce();
      console.info('[Transport] 跨设备主通道已恢复，退出轮询降级（L3 → L1）');
      this.emitProbe('anomaly', { phase: 'transport_restored', activeKind: 'cloudbase' });
    }
    return true;
  }

  private emitProbe(phase: string, payload: Record<string, unknown>): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('obsidian_transport_health_changed', {
          detail: { phase, ...payload, at: new Date().toISOString() }
        })
      );
    }
  }

  // -----------------------------------------------------------
  // 健康度（供探针与监测台）
  // -----------------------------------------------------------

  public health(): LayerHealth {
    const activeKind: TransportKind = !this.cloud
      ? 'broadcast'
      : this.pollingActive
        ? 'polling'
        : 'cloudbase';
    return {
      broadcast: this.broadcast.health(),
      cloudbase: this.cloud?.health() ?? null,
      polling: this.polling?.health() ?? null,
      activeKind,
      degraded: this.pollingActive,
      outboxSize: this.outbox.length,
      seenCount: this.seen.size
    };
  }

  public isDegraded(): boolean {
    return this.pollingActive;
  }

  public close(): void {
    this.closed = true;
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    if (this.recoverTimer) {
      clearInterval(this.recoverTimer);
      this.recoverTimer = null;
    }
    this.unsubscribers.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
    this.unsubscribers = [];
    this.broadcast.close();
    this.cloud?.close();
    this.polling?.close();
    this.memory.close();
    this.subscribers = [];
  }
}

export const transportManager = new TransportManager();
