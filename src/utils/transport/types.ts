/**
 * 跨设备实时传输层 —— 契约定义（C1）
 *
 * 决策依据见 CROSS-DEVICE-REALTIME-CHANNEL-DECISION.md。
 *
 * 分层的意义：业务代码（引擎与 UI）只与 TransportAdapter 接口交互，
 * 不感知底层是 BroadcastChannel / CloudBase watch / 轮询。
 * 于是"换通道"不再是全仓改造，而是替换一个适配器实现。
 */

export type TransportKind = 'memory' | 'broadcast' | 'cloudbase' | 'polling';

/** 跨设备消息信封 —— 传输层只认这个结构，不认业务语义 */
export interface TransportMessage<T = unknown> {
  /** 幂等去重键：接收端按此去重，避免跨通道（L0+L1）双重投递 */
  eventId: string;
  /** 全链路追踪号，与探针共用 */
  traceId: string;
  type: string;
  payload: T;
  emittedAt: string;
  /** 毫秒时间戳，便于云端 where 条件过滤 */
  emittedAtMs: number;
  emittedBy: string;
  /** 收件人标识集合（participantId / 'merchant' / 'customer'） */
  targets: string[];
  /** 用于按桌收窄订阅 */
  tableCodes: string[];
  sessionIds: string[];
  /** 过期时间（云端保留期限，便于清理） */
  expiresAtMs: number;
}

/** 订阅过滤器：**必须收窄**，否则一店多桌会形成快照风暴（见决策书 §3.1） */
export interface SubscriptionFilter {
  /** 只接收这些桌的消息 */
  tableCodes?: string[];
  /** 只接收这些会话的消息 */
  sessionIds?: string[];
  /** 只接收发给我的消息 */
  participantIds?: string[];
  /** 是否接收面向全体的广播（targets 含 '*'） */
  includeBroadcast?: boolean;
}

export interface TransportHealth {
  kind: TransportKind;
  connected: boolean;
  latencyMs: number;
  consecutiveFailures: number;
  lastError?: string;
  lastErrorAt?: string;
  /** 已投递/已接收计数，供探针与监测台展示 */
  publishedCount: number;
  receivedCount: number;
}

export interface PublishResult {
  delivered: boolean;
  /** 达成的通道（可能多个：本地 + 远端） */
  via: TransportKind[];
  error?: string;
}

export interface TransportAdapter {
  readonly kind: TransportKind;
  /** 该通道是否可用（由 manager 在切换前询问） */
  isAvailable(): boolean;
  publish(message: TransportMessage): Promise<PublishResult>;
  subscribe(filter: SubscriptionFilter, onMessage: (message: TransportMessage) => void): () => void;
  health(): TransportHealth;
  close(): void;
}

// -------------------------------------------------------------
// 过滤判定（由 manager 统一实现，各适配器复用）
// -------------------------------------------------------------

/** 判断消息是否命中订阅过滤器 */
export function matchesFilter(message: TransportMessage, filter: SubscriptionFilter): boolean {
  const targets = message.targets || [];
  const isBroadcast = targets.includes('*');

  const participantIds = filter.participantIds || [];
  const tableCodes = filter.tableCodes || [];
  const sessionIds = filter.sessionIds || [];

  // 无任何收窄条件时视为"全量订阅"（仅商家端应如此使用）
  if (participantIds.length === 0 && tableCodes.length === 0 && sessionIds.length === 0) {
    return true;
  }

  // 定向命中
  if (participantIds.length > 0 && targets.some((t) => participantIds.includes(t))) {
    return true;
  }
  if (tableCodes.length > 0 && (message.tableCodes || []).some((t) => tableCodes.includes(t))) {
    return true;
  }
  if (sessionIds.length > 0 && (message.sessionIds || []).some((s) => sessionIds.includes(s))) {
    return true;
  }

  // 全体广播：必须显式选择接收（includeBroadcast === true）。
  // 若默认接收，收窄订阅就形同虚设 —— 一条 '*' 广播会泄漏到所有顾客端。
  if (isBroadcast && filter.includeBroadcast === true) return true;

  return false;
}

/** 从过滤器推导出用于云端 where 的目标标识（云适配器用） */
export function filterTargets(filter: SubscriptionFilter): string[] {
  const out = new Set<string>();
  (filter.participantIds || []).forEach((v) => out.add(v));
  (filter.tableCodes || []).forEach((v) => out.add(v));
  (filter.sessionIds || []).forEach((v) => out.add(v));
  if (out.size === 0) out.add('*');
  return [...out];
}

// -------------------------------------------------------------
// eventId 去重（跨通道防重投）
// -------------------------------------------------------------

/** 有界的已处理 eventId 集合（LRU 语义，避免无界增长） */
export class SeenRegistry {
  private seen = new Set<string>();
  private order: string[] = [];

  constructor(private capacity = 500) {}

  /** 首次见到返回 true（应处理）；重复返回 false（应丢弃） */
  public firstTime(eventId: string): boolean {
    if (!eventId) return true;
    if (this.seen.has(eventId)) return false;
    this.seen.add(eventId);
    this.order.push(eventId);
    if (this.order.length > this.capacity) {
      const evicted = this.order.shift();
      if (evicted) this.seen.delete(evicted);
    }
    return true;
  }

  public clear(): void {
    this.seen.clear();
    this.order = [];
  }

  public get size(): number {
    return this.seen.size;
  }
}
