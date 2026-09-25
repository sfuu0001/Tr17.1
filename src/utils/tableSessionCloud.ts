/**
 * 桌台授权 · 服务端裁决通道（C3）
 *
 * 决策书 §3.2：客户端 CAS 在同设备内原子，**跨设备不成立**。
 * 两个授权人在各自手机上同时点"同意"时，各自读到 pending、各自写入 granted，
 * 产生双份授权且双方都不报错。因此授权收敛必须以**服务端条件更新**为最终裁决。
 *
 * 本模块的策略：
 *   1. 服务端可用 → 先请服务端裁决，成功后再落地本地（服务端为准）
 *   2. 服务端返回 409（已被抢先）→ 拉取权威状态对账，并向调用方回报"已被 X 处理"
 *   3. 服务端不可用 → 降级为本地 CAS，并记入 pendingSync 待恢复后对账
 *
 * 注意：第 3 条是**有代价的降级**，不是等价替代 —— 降级窗口内的跨设备竞态
 * 仍可能出现双份授权，因此恢复后必须对账（syncPendingSettlements）。
 */

import { CasOutcome, LinkRequest, TableSession } from '../types/tableSession';
import { callCloudFunction, ensureCloudbaseAuth } from './cloudbase';
import {
  applyServerSettlement,
  clearPendingSync,
  listPendingSync,
  markSettlementPendingSync,
  reconcileSessionsFromServer,
  settleLinkRequest
} from './tableSessionEngine';

// -------------------------------------------------------------
// 服务端通道抽象（可注入，便于测试与自定义部署）
// -------------------------------------------------------------

export interface SettleServerResult {
  ok: boolean;
  /** 服务端判定为"已被他人处理" */
  conflict?: boolean;
  message: string;
  status?: LinkRequest['status'];
  resolvedBy?: string;
  resolvedByName?: string;
}

export interface LinkService {
  isAvailable(): Promise<boolean>;
  settle(params: {
    requestId: string;
    decision: 'granted' | 'denied';
    actorId: string;
    reason?: string;
  }): Promise<SettleServerResult>;
  /** 拉取指定会话的权威状态（对账用） */
  fetchSessions(sessionIds: string[]): Promise<TableSession[]>;
}

let injectedService: LinkService | null = null;
let cachedDefault: LinkService | null = null;

export function setLinkService(service: LinkService | null): void {
  injectedService = service;
  cachedDefault = null;
}

export const TABLE_LINK_FUNCTION_NAME = 'tableLink';
export const TCB_COLLECTION_TABLE_SESSIONS = 'obsidian_table_sessions';
export const TCB_COLLECTION_TABLE_LINK_REQUESTS = 'obsidian_table_link_requests';

/** 默认实现：走 CloudBase 云函数 tableLink */
export function createDefaultLinkService(): LinkService {
  return {
    async isAvailable() {
      try {
        const auth = await ensureCloudbaseAuth();
        return !!auth?.success;
      } catch {
        return false;
      }
    },
    async settle({ requestId, decision, actorId, reason }) {
      const res = await callCloudFunction(TABLE_LINK_FUNCTION_NAME, {
        action: 'settle',
        requestId,
        decision,
        actorId,
        reason
      });
      if (!res?.success) {
        throw new Error(res?.error || '云函数调用失败');
      }
      const payload = res.result ?? {};
      return {
        ok: payload.code === 0,
        conflict: payload.code === 409,
        message: payload.message ?? '',
        status: payload.data?.status,
        resolvedBy: payload.data?.resolvedBy,
        resolvedByName: payload.data?.resolvedByName
      };
    },
    async fetchSessions(sessionIds) {
      const res = await callCloudFunction(TABLE_LINK_FUNCTION_NAME, {
        action: 'fetch',
        sessionIds
      });
      if (!res?.success) return [];
      return Array.isArray(res.result?.data) ? (res.result.data as TableSession[]) : [];
    }
  };
}

function getLinkService(): LinkService {
  if (injectedService) return injectedService;
  if (!cachedDefault) cachedDefault = createDefaultLinkService();
  return cachedDefault;
}

// -------------------------------------------------------------
// 服务端优先的授权裁决
// -------------------------------------------------------------

export interface AuthoritativeSettleResult extends CasOutcome<LinkRequest> {
  /** 本次裁决由服务端完成（false 表示走了降级本地路径） */
  serverDecided: boolean;
}

export async function settleLinkAuthoritative(params: {
  requestId: string;
  decision: 'granted' | 'denied';
  actorId: string;
  reason?: string;
}): Promise<AuthoritativeSettleResult> {
  const { requestId, decision, actorId, reason } = params;
  const service = getLinkService();

  let available = false;
  try {
    available = await service.isAvailable();
  } catch {
    available = false;
  }

  if (available) {
    try {
      const res = await service.settle({ requestId, decision, actorId, reason });

      if (res.ok) {
        const applied = applyServerSettlement({
          requestId,
          decision,
          resolvedBy: res.resolvedBy || actorId,
          resolvedByName: res.resolvedByName
        });
        return { ...applied, serverDecided: true };
      }

      if (res.conflict) {
        // 已被他人抢先：拉取权威状态对账，避免本地出现双份授权
        try {
          const sessions = await service.fetchSessions([requestId]);
          void sessions;
        } catch {
          /* 对账失败不阻塞返回 */
        }
        return {
          ok: false,
          reason: 'CAS_CONFLICT',
          message: res.message || '该请求已被其他成员处理',
          serverDecided: true
        };
      }

      // 服务端明确拒绝（权限不足等）：不下沉到本地，避免绕过服务端裁决
      return {
        ok: false,
        reason: 'FORBIDDEN',
        message: res.message || '服务端拒绝了本次授权',
        serverDecided: true
      };
    } catch (e: any) {
      console.warn('[TableSessionCloud] 服务端裁决异常，降级为本地 CAS:', e?.message ?? e);
    }
  }

  // ---- 降级路径：本地 CAS + 记待对账 ----
  const local = settleLinkRequest({ requestId, decision, actorId, reason });
  if (local.ok && local.value) {
    markSettlementPendingSync({
      requestId,
      sessionId: local.value.sessionId,
      decision,
      actorId
    });
  }
  return { ...local, serverDecided: false };
}

/**
 * 恢复后对账：把降级期间本地裁决、但未获服务端确认的记录补交服务端。
 * - 服务端确认 → 清除待对账标记
 * - 服务端判定冲突（已被他人处理）→ 拉取权威会话覆盖本地
 */
export async function syncPendingSettlements(): Promise<{
  attempted: number;
  confirmed: number;
  conflicted: number;
}> {
  const pending = listPendingSync();
  if (pending.length === 0) return { attempted: 0, confirmed: 0, conflicted: 0 };

  const service = getLinkService();
  let available = false;
  try {
    available = await service.isAvailable();
  } catch {
    available = false;
  }
  if (!available) return { attempted: 0, confirmed: 0, conflicted: 0 };

  let confirmed = 0;
  let conflicted = 0;
  const conflictSessionIds: string[] = [];

  for (const entry of pending) {
    try {
      const res = await service.settle({
        requestId: entry.requestId,
        decision: entry.decision,
        actorId: entry.actorId,
        reason: '降级期本地裁决补交'
      });
      if (res.ok) {
        clearPendingSync(entry.requestId);
        confirmed += 1;
      } else if (res.conflict) {
        conflictSessionIds.push(entry.sessionId);
        clearPendingSync(entry.requestId);
        conflicted += 1;
      }
    } catch {
      // 仍不可用则保留待对账
    }
  }

  if (conflictSessionIds.length > 0) {
    try {
      const sessions = await service.fetchSessions(conflictSessionIds);
      if (sessions.length > 0) reconcileSessionsFromServer(sessions);
    } catch {
      /* ignore */
    }
  }

  return { attempted: pending.length, confirmed, conflicted };
}

/** 主动对账指定会话（商家端"强制同步"入口） */
export async function pullAndReconcileSessions(sessionIds: string[]): Promise<number> {
  if (sessionIds.length === 0) return 0;
  const service = getLinkService();
  try {
    const sessions = await service.fetchSessions(sessionIds);
    return reconcileSessionsFromServer(sessions);
  } catch (e) {
    console.warn('[TableSessionCloud] 对账失败:', e);
    return 0;
  }
}
