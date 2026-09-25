/**
 * 堂食桌台会话与多端联动授权 —— 领域类型
 *
 * 设计要点（对应 TABLE-QR-LINK-ORDERING-SYSTEM-SPEC.md §2）：
 *  - TableSession 描述「一个物理占用期」，而非单个客户端的绑定关系
 *    （原有的 BoundTableInfo 只描述后者，无法承载"一张桌多个点餐 id"）
 *  - DiningParticipant.grantedBy 构成授权链，使任何成员都能回溯到授权源头
 *  - LinkRequest.targets 是"同时向 1 和 2 弹窗"的载体，
 *    resolvedBy 是"任一同意后落名"的载体
 */

// -------------------------------------------------------------
// 枚举
// -------------------------------------------------------------

export type TableSessionStatus = 'open' | 'locked' | 'closing' | 'closed';

/** 桌主（首绑者） | 成员（被授权加入） */
export type ParticipantRole = 'owner' | 'member';

/** manage = 可管理同桌其它 id；order_only = 仅可点餐 */
export type ParticipantAuthority = 'manage' | 'order_only';

export type ParticipantGrantSource = 'self_bind' | 'delegated' | 'system_elevated';

export type PresenceState = 'online' | 'idle' | 'offline';

export type LinkRequestStatus = 'pending' | 'granted' | 'denied' | 'expired' | 'superseded';

export type SessionClosedBy = 'table_cleared' | 'merchant' | 'owner' | 'system';

// -------------------------------------------------------------
// 时序常量
// -------------------------------------------------------------

/** 心跳超过该时长视为 idle */
export const PRESENCE_IDLE_MS = 90 * 1000;
/** 心跳超过该时长视为 offline */
export const PRESENCE_OFFLINE_MS = 5 * 60 * 1000;
/** 联动授权请求的有效期 */
export const LINK_REQUEST_TTL_MS = 60 * 1000;
/** 首绑进行中的锁定窗口（防并发首绑） */
export const BINDING_LOCK_TTL_MS = 3 * 60 * 1000;
/** 二维码轮换后旧令牌的宽限期 */
export const QR_TOKEN_GRACE_MS = 10 * 60 * 1000;

// -------------------------------------------------------------
// 参与者
// -------------------------------------------------------------

export interface ParticipantLastNode {
  categoryId?: string;
  categoryName?: string;
  lastClickedDishId?: string;
  lastClickedDishName?: string;
  at?: string;
}

export interface ParticipantCartItem {
  dishId: string;
  dishName: string;
  quantity: number;
  price?: number;
}

export interface ParticipantCartSummary {
  itemCount: number;
  totalAmount: number;
  updatedAt: string;
  items?: ParticipantCartItem[];
}

export interface DiningParticipant {
  /** 点餐 id —— 与客户端会话一一对应 */
  participantId: string;
  sessionId: string;
  /** 商家端默认展示的脱敏 id，如 cust_****8821 */
  maskedId: string;
  /** 脱敏昵称 */
  displayName: string;
  role: ParticipantRole;
  authority: ParticipantAuthority;
  grantSource: ParticipantGrantSource;
  /** 授权人 participantId —— 授权链的核心字段 */
  grantedBy?: string;
  grantedByMasked?: string;
  grantedAt?: string;
  joinedAt: string;
  presence: PresenceState;
  lastSeenAt: string;
  deviceFingerprint: string;
  /** 商家端要看的"当前浏览分类 / 上次点击菜品" */
  lastNode: ParticipantLastNode;
  cartSummary: ParticipantCartSummary;
  spendAttribution: number;
  removedAt?: string;
  removedBy?: string;
  removedByMasked?: string;
  removeReason?: string;
}

// -------------------------------------------------------------
// 联动授权请求
// -------------------------------------------------------------

export interface LinkRequest {
  requestId: string;
  sessionId: string;
  tableCode: string;
  requesterId: string;
  requesterMaskedId: string;
  requesterName: string;
  /** 被请求的授权人集合（第三人场景下为 [P1, P2]） */
  targets: string[];
  createdAt: string;
  expiresAt: string;
  status: LinkRequestStatus;
  /** 首个 CAS 成功者 —— "本次授权由谁完成" */
  resolvedBy?: string;
  resolvedByMasked?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  denyReason?: string;
}

// -------------------------------------------------------------
// 桌台会话
// -------------------------------------------------------------

export interface TableSession {
  sessionId: string;
  tableId: string;
  tableCode: string;
  /** 本桌第几轮占用，用于版本追溯与统计 */
  occupancySeq: number;
  status: TableSessionStatus;
  /** 首绑进行中的锁定时间（防并发首绑） */
  bindingLockAt?: string;
  bindingLockBy?: string;
  qrToken: string;
  qrVersion: number;
  qrIssuedAt: string;
  openedAt: string;
  closedAt?: string;
  closedBy?: SessionClosedBy;
  closedByParticipantId?: string;
  ownerParticipantId: string;
  participants: DiningParticipant[];
  pendingRequests: LinkRequest[];
  guestCount: number;
  riskFlags: string[];
  /** 链存证引用（chainHash），会话关闭时固化 */
  integrityRef?: string;
}

// -------------------------------------------------------------
// CAS 结果
// -------------------------------------------------------------

export type CasFailureReason =
  | 'NOT_FOUND'
  | 'CAS_CONFLICT'
  | 'ALREADY_BOUND'
  | 'BINDING_LOCKED'
  | 'FORBIDDEN'
  | 'EXPIRED'
  | 'INVALID_STATE'
  | 'WRITE_FAILED';

export interface CasOutcome<T> {
  ok: boolean;
  reason?: CasFailureReason;
  message: string;
  value?: T;
}

// -------------------------------------------------------------
// 二维码与扫码落点（T2）
// -------------------------------------------------------------

export type ScanOutcomeKind =
  | 'open_first_bind'
  | 'request_link'
  | 'already_joined'
  | 'qr_disabled'
  | 'table_busy_binding'
  | 'token_grace_redirect'
  | 'token_expired'
  | 'invalid_short_code';

export interface ScanResolution {
  kind: ScanOutcomeKind;
  tableId?: string;
  tableCode?: string;
  sessionId?: string;
  /** 宽限期内重定向到最新令牌 */
  redirectToken?: string;
  message: string;
}

export interface TableQrPayload {
  tableCode: string;
  qrToken: string;
  qrVersion: number;
  /** 人眼可读短码，二维码破损时的人工兜底录入通道 */
  shortCode: string;
  url: string;
}

// -------------------------------------------------------------
// 探针（T6 预留，T1 起即可写入）
// -------------------------------------------------------------

export type ProbePhase =
  | 'scan'
  | 'first_bind'
  | 'link_request'
  | 'link_settled'
  | 'participant_removed'
  | 'authority_changed'
  | 'presence_changed'
  | 'session_closed'
  | 'anomaly';

export interface TableSessionProbe {
  probeId: string;
  traceId: string;
  sessionId: string;
  tableCode: string;
  participantId?: string;
  phase: ProbePhase;
  payload: Record<string, unknown>;
  at: string;
}
