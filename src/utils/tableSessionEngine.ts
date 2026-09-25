/**
 * 堂食桌台会话引擎 (Table Session Engine) —— T1
 *
 * 承载 TABLE-QR-LINK-ORDERING-SYSTEM-SPEC.md 的 §2（数据模型）与 §4（授权协议）。
 *
 * 三条不可妥协的立场，均在本文件落实：
 *  1. 授权判定在数据层：canParticipantOrder() 是唯一裁决入口，UI 隐藏按钮不算数。
 *  2. "任一同意即生效"靠 CAS 幂等：settleLinkRequest() 以 status==='pending'
 *     作为比较并交换条件，首个成功者写入 resolvedBy，其余调用返回明确原因
 *     （不是抛错，而是"已被 X 处理"）。
 *  3. 并发首绑靠闸门：acquireFirstBind() 用 bindingLock + ownerParticipantId 空值双重校验，
 *     失败方自动降级为"加入申请"而非报错。
 *
 * 所有业务写入经 withTransaction + governedWrite，因此自动获得版本指针与回滚能力。
 *
 * ⚠️ 原子性边界：本引擎的 CAS 在**同一 JS 上下文内**是原子的（同步读改写）。
 * 跨标签页/跨设备不具备原子性，必须依赖服务端通道 —— 见规范 §11 第 1 项。
 */

import {
  BINDING_LOCK_TTL_MS,
  LINK_REQUEST_TTL_MS,
  PRESENCE_IDLE_MS,
  PRESENCE_OFFLINE_MS,
  CasFailureReason,
  CasOutcome,
  DiningParticipant,
  LinkRequest,
  ParticipantAuthority,
  ParticipantCartSummary,
  ParticipantLastNode,
  PresenceState,
  ProbePhase,
  SessionClosedBy,
  TableSession,
  TableSessionProbe
} from '../types/tableSession';
import { safeGetStorage } from './safeStorage';
import { governedWrite, withTransaction } from './governedStorage';
import { reactiveSyncBus } from './reactiveSyncBus';

// -------------------------------------------------------------
// 存储键
// -------------------------------------------------------------

export const KEY_SESSIONS = 'obsidian_table_sessions';
export const KEY_LINK_REQUESTS = 'obsidian_table_link_requests';
export const KEY_PROBES = 'obsidian_table_session_probes';

/** 探针环形缓冲上限：遥测类数据，超出后按最旧优先淘汰 */
export const PROBE_BUFFER_CAP = 800;

// -------------------------------------------------------------
// 基础工具
// -------------------------------------------------------------

function rid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(now: Date = new Date()): string {
  return now.toISOString();
}

function fmtLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 脱敏点餐 id：cust_9f8a7b6c5d4e → cust_****5d4e
 * 商家端默认展示脱敏值；完整 id 仅审计导出可见（见规范 §6.4）。
 */
export function maskId(participantId: string): string {
  if (!participantId) return '';
  if (participantId.length <= 8) return participantId.replace(/.(?=.{2})/g, '*');
  return `${participantId.slice(0, 5)}****${participantId.slice(-4)}`;
}

/** 脱敏昵称/手机号 */
export function maskName(raw?: string): string {
  const name = (raw || '').trim();
  if (!name) return '匿名食客';
  if (/^\d{11}$/.test(name)) return `${name.slice(0, 3)}****${name.slice(-4)}`;
  if (name.length <= 1) return name;
  if (name.length === 2) return `${name[0]}*`;
  return `${name.slice(0, 2)}***`;
}

function ok<T>(message: string, value?: T): CasOutcome<T> {
  return { ok: true, message, value };
}

function fail<T>(reason: CasFailureReason, message: string, value?: T): CasOutcome<T> {
  return { ok: false, reason, message, value };
}

// -------------------------------------------------------------
// 读取
// -------------------------------------------------------------

export function getSessions(): TableSession[] {
  const list = safeGetStorage<TableSession[]>(KEY_SESSIONS, []);
  return Array.isArray(list) ? list : [];
}

export function getLinkRequests(): LinkRequest[] {
  const list = safeGetStorage<LinkRequest[]>(KEY_LINK_REQUESTS, []);
  return Array.isArray(list) ? list : [];
}

export function getProbes(): TableSessionProbe[] {
  const list = safeGetStorage<TableSessionProbe[]>(KEY_PROBES, []);
  return Array.isArray(list) ? list : [];
}

export function getSessionById(sessionId: string): TableSession | undefined {
  return getSessions().find((s) => s.sessionId === sessionId);
}

/** 取该桌当前处于打开态的会话（一张桌同一时刻至多一个 open 会话） */
export function getOpenSessionByTableCode(tableCode: string): TableSession | undefined {
  const code = (tableCode || '').toUpperCase();
  return getSessions().find((s) => s.tableCode.toUpperCase() === code && s.status !== 'closed');
}

/** 该桌历史占用轮次 + 1 */
export function nextOccupancySeq(tableCode: string): number {
  const code = (tableCode || '').toUpperCase();
  return getSessions().filter((s) => s.tableCode.toUpperCase() === code).length + 1;
}

// -------------------------------------------------------------
// 写入（统一受治）
// -------------------------------------------------------------

function persistSessions(next: TableSession[]): void {
  governedWrite(KEY_SESSIONS, next);
}

function persistLinkRequests(next: LinkRequest[]): void {
  governedWrite(KEY_LINK_REQUESTS, next);
}

function upsertSession(session: TableSession): TableSession[] {
  const all = getSessions();
  const exists = all.some((s) => s.sessionId === session.sessionId);
  const next = exists
    ? all.map((s) => (s.sessionId === session.sessionId ? session : s))
    : [session, ...all];
  persistSessions(next);
  return next;
}

// -------------------------------------------------------------
// 探针
// -------------------------------------------------------------

/**
 * 写一条行为探针。
 * 探针为遥测类数据：网关以 silent 模式登记（可读可回滚，但不进版本链），
 * 由本函数自行做环形淘汰，避免冲垮分层保留配额。
 */
export function writeProbe(input: {
  phase: ProbePhase;
  sessionId: string;
  tableCode: string;
  participantId?: string;
  traceId?: string;
  payload?: Record<string, unknown>;
}): TableSessionProbe {
  const probe: TableSessionProbe = {
    probeId: rid('probe'),
    traceId: input.traceId || rid('trace'),
    sessionId: input.sessionId,
    tableCode: input.tableCode,
    participantId: input.participantId,
    phase: input.phase,
    payload: input.payload ?? {},
    at: nowIso()
  };
  const next = [probe, ...getProbes()].slice(0, PROBE_BUFFER_CAP);
  governedWrite(KEY_PROBES, next);
  return probe;
}

/** 该会话的探针时间线（按时间正序） */
export function getProbesBySession(sessionId: string): TableSessionProbe[] {
  return getProbes()
    .filter((p) => p.sessionId === sessionId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

// -------------------------------------------------------------
// 参与者工厂
// -------------------------------------------------------------

export interface ParticipantSeed {
  participantId: string;
  displayName?: string;
  deviceFingerprint?: string;
}

function buildParticipant(
  seed: ParticipantSeed,
  sessionId: string,
  opts: {
    role: DiningParticipant['role'];
    authority: ParticipantAuthority;
    grantSource: DiningParticipant['grantSource'];
    grantedBy?: string;
    grantedByMasked?: string;
  }
): DiningParticipant {
  const now = nowIso();
  return {
    participantId: seed.participantId,
    sessionId,
    maskedId: maskId(seed.participantId),
    displayName: maskName(seed.displayName),
    role: opts.role,
    authority: opts.authority,
    grantSource: opts.grantSource,
    grantedBy: opts.grantedBy,
    grantedByMasked: opts.grantedByMasked,
    grantedAt: opts.grantedBy ? now : undefined,
    joinedAt: now,
    presence: 'online',
    lastSeenAt: now,
    deviceFingerprint: seed.deviceFingerprint || 'unknown-device',
    lastNode: {},
    cartSummary: { itemCount: 0, totalAmount: 0, updatedAt: now },
    spendAttribution: 0
  };
}

/** 活跃参与者（未被移除） */
export function activeParticipants(session: TableSession): DiningParticipant[] {
  return session.participants.filter((p) => !p.removedAt);
}

/** 有授权权的活跃成员（第三人场景下的弹窗目标集合） */
export function authorizerIds(session: TableSession): string[] {
  return activeParticipants(session)
    .filter((p) => p.authority === 'manage')
    .map((p) => p.participantId);
}

// -------------------------------------------------------------
// 在线态
// -------------------------------------------------------------

export function resolvePresence(lastSeenAt: string, now: Date = new Date()): PresenceState {
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return 'offline';
  const delta = now.getTime() - t;
  if (delta > PRESENCE_OFFLINE_MS) return 'offline';
  if (delta > PRESENCE_IDLE_MS) return 'idle';
  return 'online';
}

/** 重算全员的在线态并落盘（供定时心跳任务调用） */
export function refreshPresence(sessionId: string, now: Date = new Date()): TableSession | undefined {
  const session = getSessionById(sessionId);
  if (!session) return undefined;
  const next: TableSession = {
    ...session,
    participants: session.participants.map((p) => ({
      ...p,
      presence: p.removedAt ? 'offline' : resolvePresence(p.lastSeenAt, now)
    }))
  };
  upsertSession(next);
  return next;
}

export function touchPresence(sessionId: string, participantId: string): CasOutcome<TableSession> {
  return withTransaction(`参与者心跳: ${participantId}`, () => {
    const session = getSessionById(sessionId);
    if (!session) return fail<TableSession>('NOT_FOUND', '会话不存在');
    const target = session.participants.find((p) => p.participantId === participantId);
    if (!target || target.removedAt) {
      return fail<TableSession>('FORBIDDEN', '该参与者不在当前会话中');
    }
    const now = nowIso();
    const next: TableSession = {
      ...session,
      participants: session.participants.map((p) =>
        p.participantId === participantId
          ? { ...p, lastSeenAt: now, presence: 'online' as PresenceState }
          : p
      )
    };
    upsertSession(next);
    return ok('心跳已更新', next);
  });
}

// -------------------------------------------------------------
// T1 核心 1：CAS 首绑
// -------------------------------------------------------------

/**
 * 抢占桌台首绑权。
 *
 * 并发首绑是真实场景（同团客人同时扫码）：必须恰好有一个成功者。
 * 两道闸门：
 *   1) bindingLock —— 绑定进行中的短锁（默认 3 分钟），阻断并发进入表单
 *   2) ownerParticipantId 空值校验 —— 最终裁决，锁失效时兜底
 * 失败者返回 ALREADY_BOUND / BINDING_LOCKED，由调用方转为"申请加入"流程。
 */
export function acquireFirstBind(params: {
  tableId: string;
  tableCode: string;
  seed: ParticipantSeed;
  now?: Date;
}): CasOutcome<TableSession> {
  const { tableId, tableCode, seed } = params;
  const now = params.now ?? new Date();
  const nowStr = nowIso(now);

  return withTransaction(`桌台首绑: ${tableCode}`, () => {
    const existing = getOpenSessionByTableCode(tableCode);

    // 闸门 1：有人正在开台 → 一律等待。
    // 必须早于 ALREADY_BOUND 判定：此时会话尚未确认（status='locked'），
    // 若直接告知"已开台，转为加入申请"，第一个人放弃绑定后第二人就被卡在错误分支上。
    if (
      existing &&
      isBindingLockActive(existing, now) &&
      existing.bindingLockBy !== seed.participantId
    ) {
      return fail<TableSession>('BINDING_LOCKED', '有人正在绑定本桌，请稍候重试', existing);
    }

    if (existing) {
      // 已是桌主本人重复扫码 → 幂等返回，不报错
      if (existing.ownerParticipantId === seed.participantId) {
        return ok('你已是该桌桌主', existing);
      }
      return fail<TableSession>(
        'ALREADY_BOUND',
        `该桌已由 ${maskId(existing.ownerParticipantId)} 开台，已为你转为加入申请`,
        existing
      );
    }

    // 闸门 2：创建会话（owner 写入即视为 CAS 成功）
    // 注意状态初值为 'locked'（绑定中），由 finalizeFirstBind 翻为 'open'。
    // 这样 acquireFirstBind 的 bindingLock 分支才是可达的 —— 否则会出现
    // "第二个人在首绑进行中直接进入申请流程"的漏洞。
    const session: TableSession = {
      sessionId: rid('sess'),
      tableId,
      tableCode,
      occupancySeq: nextOccupancySeq(tableCode),
      status: 'locked',
      bindingLockAt: nowStr,
      bindingLockBy: seed.participantId,
      qrToken: '',
      qrVersion: 1,
      qrIssuedAt: nowStr,
      openedAt: nowStr,
      ownerParticipantId: seed.participantId,
      participants: [
        buildParticipant(seed, '', {
          role: 'owner',
          authority: 'manage',
          grantSource: 'self_bind'
        })
      ],
      pendingRequests: [],
      guestCount: 0,
      riskFlags: []
    };
    session.participants[0].sessionId = session.sessionId;

    upsertSession(session);
    writeProbe({
      phase: 'first_bind',
      sessionId: session.sessionId,
      tableCode,
      participantId: seed.participantId,
      payload: { occupancySeq: session.occupancySeq, outcome: 'owner_acquired' }
    });

    reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
      sessionId: session.sessionId,
      tableCode,
      change: 'opened',
      participantId: seed.participantId,
      at: nowStr
    });

    return ok('首绑成功，你已成为本桌桌主', session);
  });
}

/** 首绑收尾：填写就餐人数后正式开台（status: locked → open） */
export function finalizeFirstBind(
  sessionId: string,
  guestCount: number,
  actorId?: string
): CasOutcome<TableSession> {
  return withTransaction(`首绑收尾: ${sessionId}`, () => {
    const session = getSessionById(sessionId);
    if (!session) return fail<TableSession>('NOT_FOUND', '会话不存在');
    if (session.status === 'closed') return fail<TableSession>('INVALID_STATE', '会话已关闭');
    // 只有桌主本人可以收尾，防止他人抢开台
    if (actorId && session.ownerParticipantId !== actorId) {
      return fail<TableSession>('FORBIDDEN', '只有桌主可以完成开台');
    }

    const nowStr = nowIso();
    const next: TableSession = {
      ...session,
      status: 'open',
      guestCount: Math.max(1, Math.floor(guestCount) || 1),
      bindingLockAt: undefined,
      bindingLockBy: undefined
    };
    upsertSession(next);

    reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
      sessionId,
      tableCode: session.tableCode,
      change: 'opened',
      participantId: session.ownerParticipantId,
      actorId: actorId ?? session.ownerParticipantId,
      at: nowStr
    });
    writeProbe({
      phase: 'first_bind',
      sessionId,
      tableCode: session.tableCode,
      participantId: session.ownerParticipantId,
      payload: { outcome: 'finalized', guestCount: next.guestCount }
    });

    return ok(`已开台，就餐人数 ${next.guestCount}`, next);
  });
}

/** 绑定锁是否仍有效（未过期） */
export function isBindingLockActive(session: TableSession, now: Date): boolean {
  if (!session.bindingLockAt) return false;
  const age = now.getTime() - new Date(session.bindingLockAt).getTime();
  return age >= 0 && age < BINDING_LOCK_TTL_MS;
}

// -------------------------------------------------------------
// T1 核心 2：联动授权请求 + CAS 收敛
// -------------------------------------------------------------

/**
 * 发起联动授权请求。
 * targets 为当前全部有管理权的活跃成员 —— 这就是"第三人同时向 1 和 2 弹窗"的载体。
 */
export function requestLink(params: {
  tableCode: string;
  seed: ParticipantSeed;
  now?: Date;
}): CasOutcome<LinkRequest> {
  const { tableCode, seed } = params;
  const now = params.now ?? new Date();
  const nowStr = nowIso(now);

  return withTransaction(`桌台联动申请: ${tableCode}`, () => {
    const session = getOpenSessionByTableCode(tableCode);
    if (!session) {
      return fail<LinkRequest>('NOT_FOUND', '该桌尚未开台，请先完成首绑');
    }

    // 开台尚未确认期间不接受加入申请 —— 该判定必须在数据层，
    // 否则绕过 resolveScan 直接调用本函数即可在开台中途插入成员。
    if (isBindingLockActive(session, now)) {
      return fail<LinkRequest>('BINDING_LOCKED', '本桌正在开台，请稍候重试');
    }

    const existingSelf = session.participants.find(
      (p) => p.participantId === seed.participantId && !p.removedAt
    );
    if (existingSelf) {
      return ok('你已在本桌成员名单中', undefined);
    }

    const alreadyPending = session.pendingRequests.find(
      (r) => r.requesterId === seed.participantId && r.status === 'pending'
    );
    if (alreadyPending) {
      return fail<LinkRequest>('CAS_CONFLICT', '你的申请已在等待处理', alreadyPending);
    }

    // 目标集合：优先在线管理者；全部离线时退化为全部管理者（由商家端兜底处理）
    const online = activeParticipants(session).filter(
      (p) => p.authority === 'manage' && resolvePresence(p.lastSeenAt, now) !== 'offline'
    );
    const allManage = activeParticipants(session).filter((p) => p.authority === 'manage');
    const targetPool = online.length > 0 ? online : allManage;

    if (targetPool.length === 0) {
      return fail<LinkRequest>(
        'FORBIDDEN',
        '本桌当前无可用授权人，请呼叫服务员协助处理'
      );
    }

    const request: LinkRequest = {
      requestId: rid('lr'),
      sessionId: session.sessionId,
      tableCode: session.tableCode,
      requesterId: seed.participantId,
      requesterMaskedId: maskId(seed.participantId),
      requesterName: maskName(seed.displayName),
      targets: targetPool.map((p) => p.participantId),
      createdAt: nowStr,
      expiresAt: nowIso(new Date(now.getTime() + LINK_REQUEST_TTL_MS)),
      status: 'pending'
    };

    upsertSession({ ...session, pendingRequests: [...session.pendingRequests, request] });
    persistLinkRequests([request, ...getLinkRequests()]);

    reactiveSyncBus.publish('TABLE_LINK_REQUEST', {
      requestId: request.requestId,
      sessionId: request.sessionId,
      tableCode: request.tableCode,
      requesterId: request.requesterId,
      requesterMaskedId: request.requesterMaskedId,
      requesterName: request.requesterName,
      targets: request.targets,
      expiresAt: request.expiresAt
    });

    writeProbe({
      phase: 'link_request',
      sessionId: session.sessionId,
      tableCode: session.tableCode,
      participantId: seed.participantId,
      payload: { requestId: request.requestId, targets: request.targets }
    });

    return ok(`已向 ${request.targets.length} 位成员发出授权请求`, request);
  });
}

/**
 * 收敛授权请求 —— 本模块最关键的 CAS 原语。
 *
 * 比较并交换条件：request.status === 'pending'
 * 首个成功者写入 resolvedBy；其余调用方得到 CAS_CONFLICT 与"已被 X 处理"的提示，
 * 这是"任一同意即同步关闭其余弹窗"的**数据层保证**，而非 UI 层协调。
 */
export function settleLinkRequest(params: {
  requestId: string;
  decision: 'granted' | 'denied';
  actorId: string;
  reason?: string;
  now?: Date;
}): CasOutcome<LinkRequest> {
  const { requestId, decision, actorId, reason } = params;
  const now = params.now ?? new Date();
  const nowStr = nowIso(now);

  return withTransaction(`桌台联动授权: ${requestId}`, () => {
    const requests = getLinkRequests();
    const request = requests.find((r) => r.requestId === requestId);
    if (!request) return fail<LinkRequest>('NOT_FOUND', '授权请求不存在');

    // ---- CAS 校验：非 pending 一律不允许再写入 ----
    if (request.status !== 'pending') {
      const who = request.resolvedByMasked || '其他成员';
      return fail<LinkRequest>(
        'CAS_CONFLICT',
        `该请求已由 ${who} 处理（当前状态：${request.status}）`,
        request
      );
    }

    if (new Date(request.expiresAt).getTime() < now.getTime()) {
      const expired: LinkRequest = { ...request, status: 'expired', resolvedAt: nowStr };
      persistLinkRequests(requests.map((r) => (r.requestId === requestId ? expired : r)));
      return fail<LinkRequest>('EXPIRED', '该授权请求已超时，请重新发起', expired);
    }

    const session = getSessionById(request.sessionId);
    if (!session) return fail<LinkRequest>('NOT_FOUND', '会话不存在');

    // ---- 操作者资格校验（授权判定在数据层）----
    if (!request.targets.includes(actorId)) {
      return fail<LinkRequest>('FORBIDDEN', '你不是本请求的被授权对象');
    }
    const actor = session.participants.find((p) => p.participantId === actorId && !p.removedAt);
    if (!actor) return fail<LinkRequest>('FORBIDDEN', '你已不在本桌成员名单中');
    if (actor.authority !== 'manage') {
      return fail<LinkRequest>('FORBIDDEN', '你没有授权他人的权限');
    }

    // ---- 写入 ----
    const settled: LinkRequest = {
      ...request,
      status: decision,
      resolvedBy: actorId,
      resolvedByMasked: actor.maskedId,
      resolvedByName: actor.displayName,
      resolvedAt: nowStr,
      denyReason: decision === 'denied' ? reason : undefined
    };

    let nextSession: TableSession = session;

    if (decision === 'granted') {
      const requesterExists = session.participants.find(
        (p) => p.participantId === request.requesterId && !p.removedAt
      );
      if (!requesterExists) {
        const joined = buildParticipant(
          {
            participantId: request.requesterId,
            displayName: request.requesterName,
            deviceFingerprint: 'joined-via-link'
          },
          session.sessionId,
          {
            role: 'member',
            authority: 'order_only',
            grantSource: 'delegated',
            grantedBy: actorId,
            grantedByMasked: actor.maskedId
          }
        );
        joined.displayName = request.requesterName;
        nextSession = {
          ...session,
          participants: [...session.participants, joined]
        };
      }
    }

    // 同一申请人其余待决请求一并作废，避免重复授权
    const supersededIds = new Set<string>();
    if (decision === 'granted') {
      requests.forEach((r) => {
        if (
          r.requestId !== requestId &&
          r.status === 'pending' &&
          r.requesterId === request.requesterId
        ) {
          supersededIds.add(r.requestId);
        }
      });
    }

    const nextRequests = requests.map((r) => {
      if (r.requestId === requestId) return settled;
      if (supersededIds.has(r.requestId)) {
        return { ...r, status: 'superseded' as const, resolvedAt: nowStr };
      }
      return r;
    });

    nextSession = {
      ...nextSession,
      pendingRequests: nextSession.pendingRequests.map((r) => {
        if (r.requestId === requestId) return settled;
        if (supersededIds.has(r.requestId)) {
          return { ...r, status: 'superseded' as const, resolvedAt: nowStr };
        }
        return r;
      })
    };

    upsertSession(nextSession);
    persistLinkRequests(nextRequests);

    // 广播收敛结果 —— 其余端收到即关闭弹窗
    reactiveSyncBus.publish('TABLE_LINK_SETTLED', {
      requestId,
      sessionId: request.sessionId,
      tableCode: request.tableCode,
      status: decision,
      resolvedBy: actorId,
      resolvedByMasked: actor.maskedId,
      resolvedByName: actor.displayName,
      at: nowStr
    });

    if (decision === 'granted') {
      reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
        sessionId: request.sessionId,
        tableCode: request.tableCode,
        change: 'participant_joined',
        participantId: request.requesterId,
        actorId,
        at: nowStr
      });
    }

    writeProbe({
      phase: 'link_settled',
      sessionId: request.sessionId,
      tableCode: request.tableCode,
      participantId: actorId,
      payload: {
        requestId,
        decision,
        requesterId: request.requesterId,
        resolvedBy: actorId,
        superseded: [...supersededIds]
      }
    });

    return ok(
      decision === 'granted'
        ? `已授权 ${request.requesterMaskedId} 加入本桌（授权人：${actor.maskedId}）`
        : `已拒绝 ${request.requesterMaskedId} 的加入申请（处理人：${actor.maskedId}）`,
      settled
    );
  });
}

/** 批量清理超时请求；返回被置为 expired 的条数 */
export function expireStaleRequests(now: Date = new Date()): number {
  const requests = getLinkRequests();
  const stale = requests.filter(
    (r) => r.status === 'pending' && new Date(r.expiresAt).getTime() < now.getTime()
  );
  if (stale.length === 0) return 0;

  const nowStr = nowIso(now);
  const staleIds = new Set(stale.map((r) => r.requestId));

  persistLinkRequests(
    requests.map((r) =>
      staleIds.has(r.requestId) ? { ...r, status: 'expired' as const, resolvedAt: nowStr } : r
    )
  );

  const sessions = getSessions().map((s) => {
    const hit = s.pendingRequests.some((r) => staleIds.has(r.requestId) && r.status === 'pending');
    if (!hit) return s;
    return {
      ...s,
      pendingRequests: s.pendingRequests.map((r) =>
        staleIds.has(r.requestId) && r.status === 'pending'
          ? { ...r, status: 'expired' as const, resolvedAt: nowStr }
          : r
      )
    };
  });
  persistSessions(sessions);

  stale.forEach((r) => {
    reactiveSyncBus.publish('TABLE_LINK_SETTLED', {
      requestId: r.requestId,
      sessionId: r.sessionId,
      tableCode: r.tableCode,
      status: 'expired',
      at: nowStr
    });
    writeProbe({
      phase: 'link_settled',
      sessionId: r.sessionId,
      tableCode: r.tableCode,
      participantId: r.requesterId,
      payload: { requestId: r.requestId, decision: 'expired' }
    });
  });

  return stale.length;
}

// -------------------------------------------------------------
// C3：服务端裁决结果的落地与降级对账
// -------------------------------------------------------------

const KEY_PENDING_SYNC = 'obsidian_table_link_pending_sync';

interface PendingSyncEntry {
  requestId: string;
  sessionId: string;
  decision: 'granted' | 'denied';
  actorId: string;
  at: string;
}

export function listPendingSync(): PendingSyncEntry[] {
  const list = safeGetStorage<PendingSyncEntry[]>(KEY_PENDING_SYNC, []);
  return Array.isArray(list) ? list : [];
}

function markPendingSync(entry: PendingSyncEntry): void {
  const next = [entry, ...listPendingSync().filter((e) => e.requestId !== entry.requestId)];
  governedWrite(KEY_PENDING_SYNC, next);
}

export function clearPendingSync(requestId: string): void {
  governedWrite(
    KEY_PENDING_SYNC,
    listPendingSync().filter((e) => e.requestId !== requestId)
  );
}

/**
 * 落地**服务端已裁决**的授权结果。
 *
 * 与 settleLinkRequest 的区别：本函数**不做 CAS 校验** ——
 * 因为比较并交换已经由服务端条件更新完成，本地只是把权威结果写下来。
 * 若在此再做一次本地 CAS，会在"服务端已成功但本地状态落后"时误判为冲突。
 */
export function applyServerSettlement(params: {
  requestId: string;
  decision: 'granted' | 'denied';
  resolvedBy: string;
  resolvedByName?: string;
  reason?: string;
  now?: Date;
}): CasOutcome<LinkRequest> {
  const { requestId, decision, resolvedBy, resolvedByName, reason } = params;
  const nowStr = nowIso(params.now ?? new Date());

  return withTransaction(`落地服务端授权裁决: ${requestId}`, () => {
    const requests = getLinkRequests();
    const request = requests.find((r) => r.requestId === requestId);
    if (!request) return fail<LinkRequest>('NOT_FOUND', '授权请求不存在');

    const session = getSessionById(request.sessionId);
    if (!session) return fail<LinkRequest>('NOT_FOUND', '会话不存在');

    const settled: LinkRequest = {
      ...request,
      status: decision,
      resolvedBy,
      resolvedByMasked: maskId(resolvedBy),
      resolvedByName: resolvedByName || maskName(undefined),
      resolvedAt: nowStr,
      denyReason: decision === 'denied' ? reason : undefined
    };

    let nextSession = session;

    if (decision === 'granted') {
      const exists = session.participants.find(
        (p) => p.participantId === request.requesterId && !p.removedAt
      );
      if (!exists) {
        const joined = buildParticipant(
          {
            participantId: request.requesterId,
            displayName: request.requesterName,
            deviceFingerprint: 'joined-via-link'
          },
          session.sessionId,
          {
            role: 'member',
            authority: 'order_only',
            grantSource: 'delegated',
            grantedBy: resolvedBy,
            grantedByMasked: maskId(resolvedBy)
          }
        );
        joined.displayName = request.requesterName;
        nextSession = { ...session, participants: [...session.participants, joined] };
      }
    }

    // 同一申请人其余待决请求一并作废
    const superseded = new Set<string>();
    if (decision === 'granted') {
      requests.forEach((r) => {
        if (r.requestId !== requestId && r.status === 'pending' && r.requesterId === request.requesterId) {
          superseded.add(r.requestId);
        }
      });
    }
    const mapReq = (r: LinkRequest): LinkRequest => {
      if (r.requestId === requestId) return settled;
      if (superseded.has(r.requestId)) return { ...r, status: 'superseded', resolvedAt: nowStr };
      return r;
    };

    persistLinkRequests(requests.map(mapReq));
    upsertSession({
      ...nextSession,
      pendingRequests: nextSession.pendingRequests.map(mapReq)
    });
    clearPendingSync(requestId);

    reactiveSyncBus.publish(
      'TABLE_LINK_SETTLED',
      {
        requestId,
        sessionId: request.sessionId,
        tableCode: request.tableCode,
        status: decision,
        resolvedBy,
        resolvedByMasked: maskId(resolvedBy),
        resolvedByName: resolvedByName || maskName(undefined),
        at: nowStr
      },
      { sessionIds: [request.sessionId], tableCodes: [request.tableCode] }
    );

    writeProbe({
      phase: 'link_settled',
      sessionId: request.sessionId,
      tableCode: request.tableCode,
      participantId: resolvedBy,
      payload: { requestId, decision, source: 'server', requesterId: request.requesterId }
    });

    return ok(`已落地服务端裁决：${decision}（授权人 ${maskId(resolvedBy)}）`, settled);
  });
}

/** 降级模式下记录"本地已裁决但未获服务端确认"，供恢复后对账 */
export function markSettlementPendingSync(params: {
  requestId: string;
  sessionId: string;
  decision: 'granted' | 'denied';
  actorId: string;
}): void {
  markPendingSync({ ...params, at: nowIso() });
  writeProbe({
    phase: 'anomaly',
    sessionId: params.sessionId,
    tableCode: getSessionById(params.sessionId)?.tableCode ?? '',
    participantId: params.actorId,
    payload: { phase: 'settlement_pending_sync', requestId: params.requestId, decision: params.decision }
  });
}

/**
 * 用服务端权威会话覆盖本地（对账）。
 * 仅同步活动状态字段，保留本地探针与请求明细，避免"对账把本地观测数据抹掉"。
 */
export function reconcileSessionsFromServer(serverSessions: TableSession[]): number {
  if (!Array.isArray(serverSessions) || serverSessions.length === 0) return 0;
  return withTransaction('对账服务端桌台会话', () => {
    const local = getSessions();
    const byId = new Map(serverSessions.map((s) => [s.sessionId, s]));
    let changed = 0;
    const next = local.map((s) => {
      const remote = byId.get(s.sessionId);
      if (!remote) return s;
      changed += 1;
      return {
        ...s,
        status: remote.status,
        participants: remote.participants,
        pendingRequests: remote.pendingRequests,
        ownerParticipantId: remote.ownerParticipantId,
        guestCount: remote.guestCount,
        closedAt: remote.closedAt,
        closedBy: remote.closedBy
      };
    });
    if (changed > 0) persistSessions(next);
    return changed;
  });
}

// -------------------------------------------------------------
// T1 核心 3：授权判定（数据层唯一裁决入口）
// -------------------------------------------------------------

/**
 * 判断某点餐 id 是否有权在本桌下单。
 * 这是"授权判定必须在数据层"的落点：UI 隐藏按钮不算数，下单前必须过这里。
 */
export function canParticipantOrder(
  session: TableSession | undefined,
  participantId: string
): CasOutcome<DiningParticipant> {
  if (!session) return fail<DiningParticipant>('NOT_FOUND', '会话不存在，请重新扫码');
  if (session.status === 'closed') {
    return fail<DiningParticipant>('INVALID_STATE', '本桌会话已结束，请重新扫码开台');
  }
  const me = session.participants.find((p) => p.participantId === participantId);
  if (!me) return fail<DiningParticipant>('FORBIDDEN', '你不在本桌成员名单中');
  if (me.removedAt) return fail<DiningParticipant>('FORBIDDEN', '你已被移出本桌，如属误操作请联系服务员');
  // 授权链完整性：非桌主必须有 grantedBy，否则视为数据完整性异常（对应 R-ORPHAN-PARTICIPANT）
  if (me.role !== 'owner' && !me.grantedBy) {
    return fail<DiningParticipant>(
      'FORBIDDEN',
      '你的授权来源缺失，为保护账目安全已暂缓下单，请联系服务员核验'
    );
  }
  return ok('可下单', me);
}

// -------------------------------------------------------------
// T1 核心 4：成员管理（已授权者的管理权）
// -------------------------------------------------------------

export function removeParticipant(params: {
  sessionId: string;
  targetId: string;
  actorId: string;
  reason?: string;
}): CasOutcome<TableSession> {
  const { sessionId, targetId, actorId, reason } = params;

  return withTransaction(`移除同桌成员: ${targetId}`, () => {
    const session = getSessionById(sessionId);
    if (!session) return fail<TableSession>('NOT_FOUND', '会话不存在');

    const actor = session.participants.find((p) => p.participantId === actorId && !p.removedAt);
    const target = session.participants.find((p) => p.participantId === targetId && !p.removedAt);

    if (!target) return fail<TableSession>('NOT_FOUND', '目标成员不存在或已被移除');
    if (target.role === 'owner') {
      return fail<TableSession>('FORBIDDEN', '桌主不可被移除，如需变更请先转移桌主或由商家介入');
    }
    // 自己退出允许；移除他人需管理权
    if (actorId !== targetId) {
      if (!actor) return fail<TableSession>('FORBIDDEN', '你已不在本桌成员名单中');
      if (actor.authority !== 'manage') {
        return fail<TableSession>('FORBIDDEN', '你没有管理同桌成员的权限');
      }
    }

    const nowStr = nowIso();
    const next: TableSession = {
      ...session,
      participants: session.participants.map((p) =>
        p.participantId === targetId
          ? {
              ...p,
              removedAt: nowStr,
              removedBy: actorId,
              removedByMasked: maskId(actorId),
              removeReason: reason || (actorId === targetId ? '自行退出' : '被同桌管理者移出')
            }
          : p
      ),
      pendingRequests: session.pendingRequests.map((r) =>
        r.requesterId === targetId && r.status === 'pending'
          ? { ...r, status: 'superseded' as const, resolvedAt: nowStr }
          : r
      )
    };

    upsertSession(next);

    reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
      sessionId,
      tableCode: session.tableCode,
      change: 'participant_removed',
      participantId: targetId,
      actorId,
      at: nowStr
    });

    writeProbe({
      phase: 'participant_removed',
      sessionId,
      tableCode: session.tableCode,
      participantId: targetId,
      payload: { actorId, reason: reason || '' }
    });

    return ok(`已移除成员 ${target.maskedId}`, next);
  });
}

export function setParticipantAuthority(params: {
  sessionId: string;
  targetId: string;
  authority: ParticipantAuthority;
  actorId: string;
}): CasOutcome<TableSession> {
  const { sessionId, targetId, authority, actorId } = params;

  return withTransaction(`调整成员权限: ${targetId}`, () => {
    const session = getSessionById(sessionId);
    if (!session) return fail<TableSession>('NOT_FOUND', '会话不存在');

    const actor = session.participants.find((p) => p.participantId === actorId && !p.removedAt);
    if (!actor || actor.authority !== 'manage') {
      return fail<TableSession>('FORBIDDEN', '你没有调整成员权限的资格');
    }
    const target = session.participants.find((p) => p.participantId === targetId && !p.removedAt);
    if (!target) return fail<TableSession>('NOT_FOUND', '目标成员不存在');
    if (target.role === 'owner') {
      return fail<TableSession>('FORBIDDEN', '桌主权限固定为管理者，不可下调');
    }
    if (target.authority === authority) {
      return ok('权限未发生变化', session);
    }

    const nowStr = nowIso();
    const next: TableSession = {
      ...session,
      participants: session.participants.map((p) =>
        p.participantId === targetId ? { ...p, authority } : p
      )
    };
    upsertSession(next);

    reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
      sessionId,
      tableCode: session.tableCode,
      change: 'authority_changed',
      participantId: targetId,
      actorId,
      at: nowStr
    });
    writeProbe({
      phase: 'authority_changed',
      sessionId,
      tableCode: session.tableCode,
      participantId: targetId,
      payload: { authority, actorId }
    });

    return ok(
      `${target.maskedId} 的权限已调整为「${authority === 'manage' ? '可管理' : '仅点餐'}」`,
      next
    );
  });
}

export function transferOwnership(params: {
  sessionId: string;
  toParticipantId: string;
  actorId: string;
}): CasOutcome<TableSession> {
  const { sessionId, toParticipantId, actorId } = params;

  return withTransaction(`转移桌主: ${toParticipantId}`, () => {
    const session = getSessionById(sessionId);
    if (!session) return fail<TableSession>('NOT_FOUND', '会话不存在');
    if (session.ownerParticipantId !== actorId) {
      return fail<TableSession>('FORBIDDEN', '只有桌主本人可以转移桌主身份');
    }
    const target = session.participants.find(
      (p) => p.participantId === toParticipantId && !p.removedAt
    );
    if (!target) return fail<TableSession>('NOT_FOUND', '目标成员不存在');

    const nowStr = nowIso();
    const next: TableSession = {
      ...session,
      ownerParticipantId: toParticipantId,
      participants: session.participants.map((p) => {
        if (p.participantId === toParticipantId) {
          return { ...p, role: 'owner' as const, authority: 'manage' as const };
        }
        if (p.participantId === actorId) {
          return { ...p, role: 'member' as const, authority: 'manage' as const };
        }
        return p;
      })
    };
    upsertSession(next);

    reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
      sessionId,
      tableCode: session.tableCode,
      change: 'owner_transferred',
      participantId: toParticipantId,
      actorId,
      at: nowStr
    });
    writeProbe({
      phase: 'authority_changed',
      sessionId,
      tableCode: session.tableCode,
      participantId: toParticipantId,
      payload: { action: 'owner_transferred', from: actorId }
    });

    return ok(`桌主已转交给 ${target.maskedId}`, next);
  });
}

// -------------------------------------------------------------
// 参与者行为视图（商家端 R3/R4）
// -------------------------------------------------------------

export function updateParticipantNode(params: {
  sessionId: string;
  participantId: string;
  node: ParticipantLastNode;
}): CasOutcome<DiningParticipant> {
  const { sessionId, participantId, node } = params;

  return withTransaction(`参与者节点更新: ${participantId}`, () => {
    const session = getSessionById(sessionId);
    if (!session) return fail<DiningParticipant>('NOT_FOUND', '会话不存在');
    const me = session.participants.find((p) => p.participantId === participantId && !p.removedAt);
    if (!me) return fail<DiningParticipant>('NOT_FOUND', '参与者不存在');

    const at = node.at || nowIso();
    const updated: DiningParticipant = {
      ...me,
      lastSeenAt: at,
      presence: 'online',
      lastNode: {
        categoryId: node.categoryId ?? me.lastNode.categoryId,
        categoryName: node.categoryName ?? me.lastNode.categoryName,
        lastClickedDishId: node.lastClickedDishId ?? me.lastNode.lastClickedDishId,
        lastClickedDishName: node.lastClickedDishName ?? me.lastNode.lastClickedDishName,
        at
      }
    };

    const next: TableSession = {
      ...session,
      participants: session.participants.map((p) =>
        p.participantId === participantId ? updated : p
      )
    };
    upsertSession(next);

    // 商家端监测台消费此事件；调用方须节流（建议 1s）
    reactiveSyncBus.publish('PARTICIPANT_NODE_CHANGED', {
      sessionId,
      tableCode: session.tableCode,
      participantId,
      categoryId: updated.lastNode.categoryId,
      categoryName: updated.lastNode.categoryName,
      lastClickedDishId: updated.lastNode.lastClickedDishId,
      lastClickedDishName: updated.lastNode.lastClickedDishName,
      at
    });

    return ok('节点已更新', updated);
  });
}

export function updateParticipantCart(params: {
  sessionId: string;
  participantId: string;
  cart: ParticipantCartSummary;
}): CasOutcome<DiningParticipant> {
  const { sessionId, participantId, cart } = params;

  return withTransaction(`参与者购物车更新: ${participantId}`, () => {
    const session = getSessionById(sessionId);
    if (!session) return fail<DiningParticipant>('NOT_FOUND', '会话不存在');
    const me = session.participants.find((p) => p.participantId === participantId && !p.removedAt);
    if (!me) return fail<DiningParticipant>('NOT_FOUND', '参与者不存在');

    const updated: DiningParticipant = { ...me, cartSummary: cart, lastSeenAt: nowIso() };
    upsertSession({
      ...session,
      participants: session.participants.map((p) =>
        p.participantId === participantId ? updated : p
      )
    });

    reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
      sessionId,
      tableCode: session.tableCode,
      change: 'cart_updated',
      participantId,
      at: nowIso()
    });

    return ok('购物车摘要已更新', updated);
  });
}

// -------------------------------------------------------------
// 会话生命周期
// -------------------------------------------------------------

export function closeSession(params: {
  sessionId: string;
  closedBy: SessionClosedBy;
  actorId?: string;
}): CasOutcome<TableSession> {
  const { sessionId, closedBy, actorId } = params;

  return withTransaction(`关闭桌台会话: ${sessionId}`, () => {
    const session = getSessionById(sessionId);
    if (!session) return fail<TableSession>('NOT_FOUND', '会话不存在');
    if (session.status === 'closed') return ok('会话已关闭', session);

    const nowStr = nowIso();
    const next: TableSession = {
      ...session,
      status: 'closed',
      closedAt: nowStr,
      closedBy,
      closedByParticipantId: actorId,
      pendingRequests: session.pendingRequests.map((r) =>
        r.status === 'pending' ? { ...r, status: 'expired' as const, resolvedAt: nowStr } : r
      )
    };
    upsertSession(next);

    reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
      sessionId,
      tableCode: session.tableCode,
      change: 'closed',
      actorId,
      at: nowStr
    });
    writeProbe({
      phase: 'session_closed',
      sessionId,
      tableCode: session.tableCode,
      participantId: actorId,
      payload: { closedBy }
    });

    return ok(`会话已关闭（${closedBy}）`, next);
  });
}

// -------------------------------------------------------------
// 商家端只读聚合
// -------------------------------------------------------------

export interface SessionOverviewRow {
  sessionId: string;
  tableCode: string;
  status: TableSession['status'];
  occupancySeq: number;
  openedAt: string;
  openedAtLocal: string;
  durationMinutes: number;
  ownerMaskedId: string;
  participantCount: number;
  activeParticipantCount: number;
  pendingRequestCount: number;
  totalAmount: number;
  riskFlags: string[];
  participants: DiningParticipant[];
}

/** 商家端监测台 L1 行数据 */
export function listSessionOverviews(now: Date = new Date()): SessionOverviewRow[] {
  return getSessions()
    .filter((s) => s.status !== 'closed')
    .map((s) => {
      const active = activeParticipants(s);
      const opened = new Date(s.openedAt).getTime();
      const durationMinutes = Number.isNaN(opened)
        ? 0
        : Math.max(0, Math.round((now.getTime() - opened) / 60000));
      return {
        sessionId: s.sessionId,
        tableCode: s.tableCode,
        status: s.status,
        occupancySeq: s.occupancySeq,
        openedAt: s.openedAt,
        openedAtLocal: fmtLocal(s.openedAt),
        durationMinutes,
        ownerMaskedId: maskId(s.ownerParticipantId),
        participantCount: s.participants.length,
        activeParticipantCount: active.length,
        pendingRequestCount: s.pendingRequests.filter((r) => r.status === 'pending').length,
        totalAmount: active.reduce((sum, p) => sum + (p.cartSummary?.totalAmount || 0), 0),
        riskFlags: s.riskFlags,
        participants: active.map((p) => ({
          ...p,
          presence: resolvePresence(p.lastSeenAt, now)
        }))
      };
    })
    .sort((a, b) => b.durationMinutes - a.durationMinutes);
}

/** 商家端 L2：某会话的活跃成员（含实时在线态） */
export function listParticipants(sessionId: string, now: Date = new Date()): DiningParticipant[] {
  const session = getSessionById(sessionId);
  if (!session) return [];
  return activeParticipants(session).map((p) => ({
    ...p,
    presence: resolvePresence(p.lastSeenAt, now)
  }));
}

/** 待办：所有待决授权请求（商家端告警用） */
export function listPendingRequests(): LinkRequest[] {
  return getLinkRequests().filter((r) => r.status === 'pending');
}

/** 完整性巡检：找出"非桌主却无授权来源"的孤儿参与者（对应 R-ORPHAN-PARTICIPANT） */
export function findOrphanParticipants(): Array<{ sessionId: string; tableCode: string; participantId: string }> {
  const out: Array<{ sessionId: string; tableCode: string; participantId: string }> = [];
  getSessions().forEach((s) => {
    if (s.status === 'closed') return;
    activeParticipants(s).forEach((p) => {
      if (p.role !== 'owner' && !p.grantedBy) {
        out.push({ sessionId: s.sessionId, tableCode: s.tableCode, participantId: p.participantId });
      }
    });
  });
  return out;
}
