/* ============================================================================
 * useTableSessionUi —— 顾客端桌台会话状态聚合 Hook（T3-1）
 * ----------------------------------------------------------------------------
 * 设计约束（见 TABLE-UI-LAYER-DESIGN-SPEC.md §4.1）：
 *  - 模块级单例状态：所有组件共享同一份，避免 Context 嵌套。
 *  - 事件订阅只在此处发生，组件不直接订阅 reactiveSyncBus。
 *  - 所有引擎调用集中于此或事件处理器中，render 体内零引擎调用。
 *  - 行为上报（分类/菜品/购物车）失败静默 + 节流，绝不打断点餐主流程。
 * ==========================================================================*/

import { useEffect, useState } from 'react';
import {
  TableSession,
  DiningParticipant,
  LinkRequest,
  ScanResolution,
  ScanOutcomeKind
} from '../../types/tableSession';
import {
  getSessionById,
  getOpenSessionByTableCode,
  listParticipants,
  listSessionOverviews,
  listPendingRequests,
  acquireFirstBind,
  finalizeFirstBind,
  requestLink,
  canParticipantOrder,
  updateParticipantNode,
  updateParticipantCart,
  touchPresence,
  refreshPresence,
  writeProbe,
  ParticipantSeed
} from '../../utils/tableSessionEngine';
import { resolveScan } from '../../utils/tableQrEngine';
import { settleLinkAuthoritative, syncPendingSettlements } from '../../utils/tableSessionCloud';
import { resolveIdentity, ResolvedIdentity } from '../../utils/identityBinding';
import { reactiveSyncBus } from '../../utils/reactiveSyncBus';

/* ---------------------------------------------------------------------------
 * 模块级单例状态 + 轻量订阅（consoleTokens 同风格，不用 Context）
 * ------------------------------------------------------------------------- */

export interface TableLinkRequestPayload {
  requestId: string;
  sessionId: string;
  tableCode: string;
  requesterId: string;
  requesterMaskedId: string;
  requesterName: string;
  targets: string[];
  expiresAt: string;
}

export interface TableSessionUiState {
  identity: ResolvedIdentity | null;
  activeSession: TableSession | null;
  myParticipant: DiningParticipant | null;
  /** 我自己发出的、等待裁决的申请 */
  pendingLinkRequest: LinkRequest | null;
  /** 收到的待我裁决的请求（弹窗串行队列，FIFO） */
  linkDialogQueue: TableLinkRequestPayload[];
  /** 最近一次加入成功时显示的落名人（"本次授权由 xxx 处理"） */
  lastSettledBy: string | null;
  ready: boolean;
}

let state: TableSessionUiState = {
  identity: null,
  activeSession: null,
  myParticipant: null,
  pendingLinkRequest: null,
  linkDialogQueue: [],
  lastSettledBy: null,
  ready: false
};

const listeners = new Set<() => void>();

function setState(patch: Partial<TableSessionUiState>): void {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

function getState(): TableSessionUiState {
  return state;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---------------------------------------------------------------------------
 * 内部动作
 * ------------------------------------------------------------------------- */

let initPromise: Promise<void> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let settleSyncTimer: ReturnType<typeof setInterval> | null = null;

function seedOf(identity: ResolvedIdentity): ParticipantSeed {
  return { participantId: identity.participantId, deviceFingerprint: identity.deviceFingerprint };
}

/** 从存储中找到"我所在"的活跃会话并刷新 */
function reloadMySession(participantId: string | undefined): void {
  if (!participantId) {
    setState({ activeSession: null, myParticipant: null });
    return;
  }
  // 遍历会话找自己（顾客端只有一张桌的语义，数量极小）
  const overviews = listSessionOverviews();
  for (const row of overviews) {
    const session = getSessionById(row.sessionId);
    if (!session || session.status === 'closed') continue;
    const me = session.participants.find(
      (p) => p.participantId === participantId && !p.removedAt
    );
    if (me) {
      setState({ activeSession: session, myParticipant: me });
      return;
    }
  }
  setState({ activeSession: null, myParticipant: null });
}

function reloadPendingRequest(participantId: string | undefined): void {
  if (!participantId) {
    setState({ pendingLinkRequest: null });
    return;
  }
  // 重新检索：我发出且仍 pending 的请求
  const mine = listPendingRequests().find(
    (r) => r.requesterId === participantId && r.status === 'pending'
  );
  setState({ pendingLinkRequest: mine ?? null });
}

function startHeartbeat(participantId: string, sessionId: string): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    try {
      touchPresence(sessionId, participantId);
      refreshPresence(sessionId);
      reloadMySession(participantId);
    } catch {
      /* 心跳失败静默 —— 网络恢复后下一轮自愈 */
    }
  }, 30_000);
}

function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/* ---------------------------------------------------------------------------
 * 事件订阅（只在首次 init 时绑定一次）
 * ------------------------------------------------------------------------- */

let eventsBound = false;

function bindEventsOnce(): void {
  if (eventsBound) return;
  eventsBound = true;

  const myId = () => state.identity?.participantId;

  reactiveSyncBus.subscribe('TABLE_SESSION_MUTATED', (payload) => {
    // 会话变更 → 若与我相关则整体刷新（事件驱动，禁止组件手动 refetch）
    const session = getSessionById(payload.sessionId);
    const mine = state.activeSession?.sessionId === payload.sessionId;
    const involvesMe =
      session?.participants.some((p) => p.participantId === myId() && !p.removedAt) ?? false;
    if (mine || involvesMe || payload.change === 'closed') {
      reloadMySession(myId());
    }
  });

  reactiveSyncBus.subscribe('TABLE_LINK_REQUEST', (payload) => {
    if (!Array.isArray(payload.targets) || !myId()) return;
    if (!payload.targets.includes(myId()!)) return;
    // 串行队列：同一时刻只弹一个，其余 FIFO
    setState({
      linkDialogQueue: [...state.linkDialogQueue, payload].filter(
        (item, idx, arr) => arr.findIndex((x) => x.requestId === item.requestId) === idx
      )
    });
  });

  reactiveSyncBus.subscribe('TABLE_LINK_SETTLED', (payload) => {
    // 1) 从弹窗队列移除该请求（所有端都要做，包括没弹窗的端）
    setState({
      linkDialogQueue: state.linkDialogQueue.filter((x) => x.requestId !== payload.requestId),
      lastSettledBy: payload.resolvedByMasked ?? null
    });
    // 2) 若是我发出的申请被裁决 → 状态机推进
    if (state.pendingLinkRequest?.requestId === payload.requestId) {
      if (payload.status === 'granted') {
        setState({ pendingLinkRequest: null });
        reloadMySession(myId());
      } else if (payload.status === 'denied' || payload.status === 'expired') {
        setState({ pendingLinkRequest: null });
      }
    }
    // 3) 授权给我 → 刷新会话
    if (payload.status === 'granted') {
      reloadMySession(myId());
    }
  });

  // PARTICIPANT_NODE_CHANGED：同桌成员查看菜品/分类变更 -> 协同联动刷新
  reactiveSyncBus.subscribe('PARTICIPANT_NODE_CHANGED', (payload) => {
    if (state.activeSession?.sessionId === payload.sessionId) {
      reloadMySession(myId());
    }
  });
}

/* ---------------------------------------------------------------------------
 * 行为上报节流（分类 ≥1.5s / 菜品 ≥800ms，保留最新值）
 * ------------------------------------------------------------------------- */

let lastCategoryReport = 0;
let lastDishReport = 0;
const CATEGORY_INTERVAL_MS = 1500;
const DISH_INTERVAL_MS = 800;

function safeReportNode(
  node: { categoryId?: string; categoryName?: string; lastClickedDishId?: string; lastClickedDishName?: string },
  at: string
): void {
  const { activeSession, myParticipant, identity } = state;
  if (!activeSession || !myParticipant || !identity) return; // 未入座直接短路
  try {
    updateParticipantNode({
      sessionId: activeSession.sessionId,
      participantId: identity.participantId,
      node: { ...node, at }
    });
  } catch {
    /* 遥测失败静默：永远不允许打断点餐 */
  }
}

/* ---------------------------------------------------------------------------
 * 对外 Hook
 * ------------------------------------------------------------------------- */

export function useTableSessionUi(): TableSessionUiState & {
  actions: {
    init: () => Promise<void>;
    scan: (tableCode: string, token?: string, shortCode?: string) => ScanResolution;
    firstBind: (
      tableId: string,
      tableCode: string,
      guestCount: number
    ) => Promise<{ ok: boolean; message: string; degradedToLink?: boolean }>;
    requestLink: (tableCode: string) => { ok: boolean; message: string };
    settle: (
      requestId: string,
      decision: 'granted' | 'denied'
    ) => Promise<{ ok: boolean; message: string; conflictWith?: string }>;
    dismissDialog: (requestId: string) => void;
    reportCategory: (categoryId: string, categoryName: string) => void;
    reportDishClick: (dishId: string, dishName: string) => void;
    reportCart: (
      itemCount: number,
      totalAmount: number,
      items?: Array<{ dishId: string; dishName: string; quantity: number; price?: number }>
    ) => void;
    canOrder: () => boolean;
    leave: () => void;
  };
} {
  const [, force] = useState(0);

  useEffect(() => {
    const unsub = subscribe(() => force((n) => n + 1));
    return unsub;
  }, []);

  const actions = {
    init: async () => {
      if (initPromise) return initPromise;
      initPromise = (async () => {
        bindEventsOnce();
        const identity = await resolveIdentity();
        reactiveSyncBus.setIdentity(identity.participantId);
        setState({ identity, ready: true });
        reloadMySession(identity.participantId);
        reloadPendingRequest(identity.participantId);
        if (state.activeSession) {
          startHeartbeat(identity.participantId, state.activeSession.sessionId);
        }
        // 断网补同步：恢复联网后把本地裁决过的请求补交服务端（静默）
        if (settleSyncTimer) clearInterval(settleSyncTimer);
        settleSyncTimer = setInterval(() => {
          syncPendingSettlements().catch(() => {});
        }, 60_000);
        syncPendingSettlements().catch(() => {});
      })();
      return initPromise;
    },

    scan: (tableCode, token, shortCode) => {
      if (!state.identity) {
        const early: ScanResolution = {
          kind: 'invalid_short_code',
          message: '身份尚未就绪，请稍候重试'
        };
        return early;
      }
      const res = resolveScan({
        tableCode,
        token,
        shortCode,
        seed: seedOf(state.identity)
      });
      try {
        writeProbe({
          phase: 'scan',
          sessionId: res.sessionId ?? '-',
          tableCode: res.tableCode ?? tableCode,
          participantId: state.identity.participantId,
          payload: { kind: res.kind }
        });
      } catch {
        /* 探针失败静默 */
      }
      return res;
    },

    firstBind: async (tableId, tableCode, guestCount) => {
      if (!state.identity) return { ok: false, message: '身份尚未就绪' };
      const acquired = acquireFirstBind({
        tableId,
        tableCode,
        seed: seedOf(state.identity)
      });
      if (!acquired.ok) {
        // CAS 落败（被抢先 / 绑定锁）→ 自动降级为加入申请，不是报错页
        if (
          acquired.reason === 'ALREADY_BOUND' ||
          acquired.reason === 'BINDING_LOCKED' ||
          acquired.reason === 'CAS_CONFLICT'
        ) {
          const link = requestLink({ tableCode, seed: seedOf(state.identity) });
          if (link.ok && link.value) {
            setState({ pendingLinkRequest: link.value });
          }
          return { ok: false, message: acquired.message, degradedToLink: true };
        }
        return { ok: false, message: acquired.message };
      }
      const session = acquired.value!;
      const finalized = finalizeFirstBind(session.sessionId, guestCount);
      if (!finalized.ok) {
        return { ok: false, message: finalized.message };
      }
      reloadMySession(state.identity.participantId);
      if (state.activeSession) {
        startHeartbeat(state.identity.participantId, state.activeSession.sessionId);
      }
      return { ok: true, message: finalized.message };
    },

    requestLink: (tableCode) => {
      if (!state.identity) return { ok: false, message: '身份尚未就绪' };
      const link = requestLink({ tableCode, seed: seedOf(state.identity) });
      if (link.ok && link.value) {
        setState({ pendingLinkRequest: link.value });
      }
      return { ok: link.ok, message: link.message };
    },

    settle: async (requestId, decision) => {
      if (!state.identity) return { ok: false, message: '身份尚未就绪' };
      const result = await settleLinkAuthoritative({
        requestId,
        decision,
        actorId: state.identity.participantId
      });
      if (!result.ok && result.reason === 'CAS_CONFLICT') {
        const value = result.value as LinkRequest | undefined;
        return {
          ok: false,
          message: result.message,
          conflictWith: value?.resolvedByMasked
        };
      }
      // 引擎内部已发布 TABLE_LINK_SETTLED；此处只需返回结果供弹窗转成功态
      reloadMySession(state.identity.participantId);
      return { ok: result.ok, message: result.message };
    },

    dismissDialog: (requestId) => {
      setState({
        linkDialogQueue: state.linkDialogQueue.filter((x) => x.requestId !== requestId)
      });
    },

    reportCategory: (categoryId, categoryName) => {
      const now = Date.now();
      if (now - lastCategoryReport < CATEGORY_INTERVAL_MS) return;
      lastCategoryReport = now;
      safeReportNode(
        { categoryId, categoryName, lastClickedDishId: undefined, lastClickedDishName: undefined },
        new Date(now).toISOString()
      );
    },

    reportDishClick: (dishId, dishName) => {
      const now = Date.now();
      if (now - lastDishReport < DISH_INTERVAL_MS) return;
      lastDishReport = now;
      safeReportNode(
        { lastClickedDishId: dishId, lastClickedDishName: dishName },
        new Date(now).toISOString()
      );
    },

    reportCart: (itemCount, totalAmount, items) => {
      const { activeSession, identity } = state;
      if (!activeSession || !identity) return;
      try {
        updateParticipantCart({
          sessionId: activeSession.sessionId,
          participantId: identity.participantId,
          cart: {
            itemCount,
            totalAmount,
            updatedAt: new Date().toISOString(),
            items: items || []
          }
        });
      } catch {
        /* 静默 */
      }
    },

    canOrder: () => {
      const { activeSession, identity } = state;
      if (!activeSession || !identity) return true; // 非桌台模式放行
      return canParticipantOrder(activeSession, identity.participantId).ok;
    },

    leave: () => {
      stopHeartbeat();
      setState({ activeSession: null, myParticipant: null, pendingLinkRequest: null });
    }
  };

  return { ...state, actions };
}

/** 非组件环境读取快照（引擎侧守卫等场景） */
export function getTableSessionUiSnapshot(): TableSessionUiState {
  return getState();
}
