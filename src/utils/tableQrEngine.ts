/**
 * 桌台二维码引擎 (Table QR Engine) —— T2
 *
 * 承载 TABLE-QR-LINK-ORDERING-SYSTEM-SPEC.md 的 §3。
 *
 * 设计决策说明（都写在代码里，避免后来者改错）：
 *  1. **长期码 + 可控轮换**，不是一次性码。立牌是物理印刷品，一次性码会逼迫
 *     每次重新打印；改为长期有效 + 商家可主动轮换 + 旧令牌宽限期。
 *  2. **宽限期 10 分钟**：轮换瞬间正在扫码的人不应被打断，宽限期内无感重定向到新令牌。
 *  3. **短码兜底**：二维码磨损/反光时，服务员可凭 "A1-8F3K" 人工录入，
 *     走同一套校验，避免"扫不出来就没法点餐"。
 *  4. **落点决策集中在 resolveScan()**：把六种落点分支收敛为一处，
 *     防止 UI 各写一份判断导致"有的入口校验了 qrEnabled、有的没校验"。
 */

import { TableItem } from '../types';
import { getMerchantTables, saveMerchantTables } from './tableStorage';
import { QR_TOKEN_GRACE_MS, ScanResolution, TableQrPayload } from '../types/tableSession';
import {
  ParticipantSeed,
  getOpenSessionByTableCode,
  requestLink
} from './tableSessionEngine';

/** 保留的退役令牌条数（仅用于宽限期校验） */
const QR_HISTORY_LIMIT = 3;

const SHORT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混字符 I/O/0/1

// -------------------------------------------------------------
// 令牌生成
// -------------------------------------------------------------

/**
 * 生成二维码令牌。
 * 使用 crypto.getRandomValues（可用时），避免 Math.random 的低熵与可预测性；
 * 环境不支持时退化为 Math.random 并在控制台显式告警（不静默降级）。
 */
export function randomToken(bytes = 10): string {
  const g: any = globalThis as any;
  if (g.crypto && typeof g.crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(bytes);
    g.crypto.getRandomValues(buf);
    return Array.from(buf)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  console.warn('[TableQrEngine] 当前环境不支持 crypto.getRandomValues，二维码令牌熵降低（仅限开发环境）');
  let out = '';
  for (let i = 0; i < bytes * 2; i += 1) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

/** 人眼可读短码：桌号 + 4 位大写字符 */
export function generateShortCode(tableCode: string): string {
  let suffix = '';
  const g: any = globalThis as any;
  if (g.crypto && typeof g.crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(4);
    g.crypto.getRandomValues(buf);
    suffix = Array.from(buf)
      .map((b) => SHORT_CODE_ALPHABET[b % SHORT_CODE_ALPHABET.length])
      .join('');
  } else {
    for (let i = 0; i < 4; i += 1) {
      suffix += SHORT_CODE_ALPHABET[Math.floor(Math.random() * SHORT_CODE_ALPHABET.length)];
    }
  }
  return `${tableCode.toUpperCase()}-${suffix}`;
}

export function buildQrUrl(tableCode: string, token: string): string {
  const g: any = globalThis as any;
  const origin = g.location?.origin && typeof g.location.origin === 'string' ? g.location.origin : '';
  return `${origin}/t/${encodeURIComponent(tableCode.toUpperCase())}?t=${encodeURIComponent(token)}`;
}

// -------------------------------------------------------------
// 初始化与轮换
// -------------------------------------------------------------

/** 为单个桌台补齐二维码字段（纯函数，不落盘） */
export function ensureTableQr(table: TableItem): TableItem {
  if (table.qrToken && table.qrCode && table.qrVersion) {
    return table.qrEnabled === undefined ? { ...table, qrEnabled: true } : table;
  }
  const now = new Date().toISOString();
  return {
    ...table,
    qrCode: table.qrCode || generateShortCode(table.code),
    qrToken: table.qrToken || randomToken(),
    qrVersion: table.qrVersion || 1,
    qrEnabled: table.qrEnabled === undefined ? true : table.qrEnabled,
    qrIssuedAt: table.qrIssuedAt || now,
    qrHistory: table.qrHistory || []
  };
}

/** 为全部桌台补齐二维码字段并落盘（幂等，供启动时调用） */
export function ensureAllTableQr(): TableItem[] {
  const tables = getMerchantTables();
  let changed = false;
  const next = tables.map((t) => {
    const ensured = ensureTableQr(t);
    if (ensured !== t) changed = true;
    return ensured;
  });
  if (changed) saveMerchantTables(next);
  return next;
}

/**
 * 轮换某桌二维码令牌。
 * 旧令牌进入 history 并开始计宽限期；宽限期后彻底失效。
 * 触发场景：疑似二维码外传、桌台清台、商家主动安全加固。
 */
export function rotateTableQr(
  tableCode: string,
  options: { now?: Date } = {}
): { success: boolean; message: string; table?: TableItem; newToken?: string } {
  const code = (tableCode || '').toUpperCase();
  const nowStr = (options.now ?? new Date()).toISOString();
  const tables = getMerchantTables();
  const target = tables.find((t) => t.code.toUpperCase() === code);
  if (!target) {
    return { success: false, message: `未找到桌台 ${tableCode}` };
  }

  const ensured = ensureTableQr(target);
  const newToken = randomToken();
  const nextVersion = (ensured.qrVersion || 1) + 1;
  const history = [
    ...(ensured.qrHistory || []),
    { token: ensured.qrToken as string, version: ensured.qrVersion || 1, retiredAt: nowStr }
  ].slice(-QR_HISTORY_LIMIT);

  const updated: TableItem = {
    ...ensured,
    qrToken: newToken,
    qrVersion: nextVersion,
    qrIssuedAt: nowStr,
    qrHistory: history
  };

  saveMerchantTables(tables.map((t) => (t.id === target.id ? updated : t)));

  return {
    success: true,
    message: `桌台 ${code} 二维码已轮换至 v${nextVersion}，旧码 10 分钟内仍可扫码（之后失效）`,
    table: updated,
    newToken
  };
}

export function setTableQrEnabled(tableCode: string, enabled: boolean): { success: boolean; message: string } {
  const code = (tableCode || '').toUpperCase();
  const tables = getMerchantTables();
  const target = tables.find((t) => t.code.toUpperCase() === code);
  if (!target) return { success: false, message: `未找到桌台 ${tableCode}` };

  const updated = { ...ensureTableQr(target), qrEnabled: enabled };
  saveMerchantTables(tables.map((t) => (t.id === target.id ? updated : t)));
  return { success: true, message: `桌码点餐已${enabled ? '开启' : '关闭'}` };
}

/** 会话与桌台的双向关联（开台时绑定、清台时解除） */
export function linkSessionToTable(tableCode: string, sessionId: string | null): void {
  const code = (tableCode || '').toUpperCase();
  const tables = getMerchantTables();
  let changed = false;
  const next = tables.map((t) => {
    if (t.code.toUpperCase() !== code) return t;
    if ((t.activeSessionId || undefined) === (sessionId || undefined)) return t;
    changed = true;
    return { ...t, activeSessionId: sessionId || undefined };
  });
  if (changed) saveMerchantTables(next);
}

// -------------------------------------------------------------
// 令牌校验
// -------------------------------------------------------------

export type TokenState = 'current' | 'grace' | 'expired' | 'mismatch';

export function resolveQrToken(
  table: TableItem,
  token: string,
  now: Date = new Date()
): { state: TokenState; currentToken?: string } {
  const ensured = ensureTableQr(table);
  if (!token) return { state: 'expired', currentToken: ensured.qrToken };

  if (token === ensured.qrToken) return { state: 'current', currentToken: ensured.qrToken };

  const retired = (ensured.qrHistory || []).find((h) => h.token === token);
  if (!retired) return { state: 'mismatch', currentToken: ensured.qrToken };

  const retiredAt = new Date(retired.retiredAt).getTime();
  if (!Number.isNaN(retiredAt) && now.getTime() - retiredAt <= QR_TOKEN_GRACE_MS) {
    return { state: 'grace', currentToken: ensured.qrToken };
  }
  return { state: 'expired', currentToken: ensured.qrToken };
}

// -------------------------------------------------------------
// 扫码落点决策（六种分支收敛于此）
// -------------------------------------------------------------

/**
 * 解析一次扫码请求。
 *
 * 分支优先级（顺序不可调换，否则会出现"二维码已关闭但仍能首绑"这类漏洞）：
 *   1. 桌台不存在（短码兜底校验失败）      → invalid_short_code
 *   2. 令牌不匹配且不在宽限期              → token_expired
 *   3. 令牌处于宽限期                      → token_grace_redirect（无感重定向新码）
 *   4. 桌码点餐被关闭                      → qr_disabled
 *   5. 已是本桌成员                        → already_joined
 *   6. 有人正在首绑（绑定锁未过期）         → table_busy_binding
 *   7. 已开台（存在 open 会话）            → request_link（发起联动授权请求）
 *   8. 空闲桌台                            → open_first_bind（进入首绑）
 */
export function resolveScan(params: {
  tableCode: string;
  token?: string;
  shortCode?: string;
  seed: ParticipantSeed;
  now?: Date;
}): ScanResolution {
  const now = params.now ?? new Date();
  const code = (params.tableCode || '').toUpperCase().trim();
  const tables = getMerchantTables();

  let table = tables.find((t) => t.code.toUpperCase() === code);

  // 短码兜底：桌号扫不出来时按短码反查（大小写与空格容错）
  if (!table && params.shortCode) {
    const short = params.shortCode.toUpperCase().replace(/\s/g, '');
    table = tables.find((t) => (t.qrCode || '').toUpperCase() === short);
  }

  if (!table) {
    return {
      kind: 'invalid_short_code',
      message: '未识别到有效桌号，请核对二维码或短码，或呼叫服务员协助'
    };
  }

  const ensured = ensureTableQr(table);

  // 令牌校验（仅当本次带了 token；纯短码路径跳过令牌，属有意设计：短码是人工兜底通道）
  if (params.token !== undefined) {
    const tokenState = resolveQrToken(ensured, params.token, now);
    if (tokenState.state === 'mismatch' || tokenState.state === 'expired') {
      return {
        kind: 'token_expired',
        tableId: ensured.id,
        tableCode: ensured.code,
        message: '桌码已更新，请扫描桌上的最新二维码'
      };
    }
    if (tokenState.state === 'grace') {
      return {
        kind: 'token_grace_redirect',
        tableId: ensured.id,
        tableCode: ensured.code,
        redirectToken: tokenState.currentToken,
        message: '桌码已更新，正在为你跳转到最新桌码…'
      };
    }
  }

  if (ensured.qrEnabled === false) {
    return {
      kind: 'qr_disabled',
      tableId: ensured.id,
      tableCode: ensured.code,
      message: '本桌暂未开放在线点餐，请呼叫服务员协助'
    };
  }

  const session = getOpenSessionByTableCode(ensured.code);

  if (session) {
    const mine = session.participants.find(
      (p) => p.participantId === params.seed.participantId && !p.removedAt
    );
    if (mine) {
      return {
        kind: 'already_joined',
        tableId: ensured.id,
        tableCode: ensured.code,
        sessionId: session.sessionId,
        message: '你已在本桌成员名单中，可直接点餐'
      };
    }

    // 绑定锁仍有效 → 有人正在开台，提示稍候（避免第二个人同时进入首绑表单）
    if (session.bindingLockAt) {
      const lockAge = now.getTime() - new Date(session.bindingLockAt).getTime();
      if (lockAge >= 0 && lockAge < 3 * 60 * 1000) {
        return {
          kind: 'table_busy_binding',
          tableId: ensured.id,
          tableCode: ensured.code,
          sessionId: session.sessionId,
          message: '本桌正在开台，请稍候重试'
        };
      }
    }

    // 已开台 → 走联动授权申请
    const req = requestLink({ tableCode: ensured.code, seed: params.seed, now });
    return {
      kind: 'request_link',
      tableId: ensured.id,
      tableCode: ensured.code,
      sessionId: session.sessionId,
      message: req.ok
        ? `已向同桌成员发出授权请求，请等待同意后即可点餐`
        : `授权请求未发出：${req.message}`
    };
  }

  return {
    kind: 'open_first_bind',
    tableId: ensured.id,
    tableCode: ensured.code,
    message: '本桌尚未开台，完成绑定后即可点餐'
  };
}

// -------------------------------------------------------------
// 打印数据源
// -------------------------------------------------------------

/** 供 TableBatchPrintModal 等打印入口取用 */
export function getQrPrintSource(): TableQrPayload[] {
  return getMerchantTables().map((t) => {
    const ensured = ensureTableQr(t);
    return {
      tableCode: ensured.code,
      qrToken: ensured.qrToken as string,
      qrVersion: ensured.qrVersion as number,
      shortCode: ensured.qrCode as string,
      url: buildQrUrl(ensured.code, ensured.qrToken as string)
    };
  });
}

export function getQrPayloadByTableCode(tableCode: string): TableQrPayload | undefined {
  return getQrPrintSource().find((p) => p.tableCode.toUpperCase() === (tableCode || '').toUpperCase());
}
