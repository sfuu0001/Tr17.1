/**
 * 敏感数据操作门禁 (Sensitive Action Gate) — 2026-09-16
 * ----------------------------------------------------------------------------
 * 行级"删/改/废弃"权限统一入口，配合 P2 数据治理工具使用：
 *  - usePermissionGate(code)：UI 渲染期判定（按钮 disabled + 原因提示），
 *    监听商家登录态变化事件自动重算；
 *  - executeSensitiveAction()：执行期复检 + 确认 + SecurityAuditLog 审计留痕。
 * 权限不足时提供店长 PIN 临时提权通道（复用 rbacEngine.verifyAndGrantManagerOverride）。
 */
import { useEffect, useState } from 'react';
import {
  checkStaffPermission,
  recordSecurityAuditLog,
  verifyAndGrantManagerOverride,
  PermissionCode,
  SecurityAuditEvent
} from './rbacEngine';
import {
  getMerchantSession,
  EVENT_MERCHANT_AUTH_CHANGED
} from './staffAndRiderAuthEngine';

export interface SensitiveActionGate {
  allowed: boolean;
  reason?: string;
}

/** 渲染期判定：当前登录员工是否具备指定敏感权限 */
export function evaluateSensitivePermission(permission: PermissionCode): SensitiveActionGate {
  return checkStaffPermission(getMerchantSession(), permission);
}

/** UI Hook：权限不足时按钮置灰并展示原因（登录/登出/提权自动刷新） */
export function usePermissionGate(permission: PermissionCode): SensitiveActionGate {
  const [gate, setGate] = useState<SensitiveActionGate>(() => evaluateSensitivePermission(permission));

  useEffect(() => {
    const recompute = () => setGate(evaluateSensitivePermission(permission));
    recompute();
    window.addEventListener(EVENT_MERCHANT_AUTH_CHANGED, recompute);
    return () => window.removeEventListener(EVENT_MERCHANT_AUTH_CHANGED, recompute);
  }, [permission]);

  return gate;
}

export interface SensitiveActionMeta {
  module: string;
  /** 审计动作归类（写入 SecurityAuditLog.action 扩展位前的摘要用） */
  actionLabel: string;
  entityName: string;
  detail?: string;
}

export interface SensitiveActionResult<T> {
  ok: boolean;
  message: string;
  result?: T;
}

/**
 * 执行敏感数据操作：执行期二次权限复检（防 gate 过期）→ action() → 审计留痕。
 * 调用方负责在 action() 内完成业务写入（本函数不代写业务数据）。
 */
export function executeSensitiveAction<T>(
  permission: PermissionCode,
  meta: SensitiveActionMeta,
  action: () => T
): SensitiveActionResult<T> {
  const gate = evaluateSensitivePermission(permission);
  if (!gate.allowed) {
    return { ok: false, message: gate.reason || '该操作需要店长权限，请联系店长或使用店长授权码临时提权。' };
  }
  try {
    const result = action();
    const session = getMerchantSession();
    const auditEvent: Omit<SecurityAuditEvent, 'id' | 'timestamp'> = {
      action: meta.module === 'finance' ? 'sensitive_refund' : 'sensitive_staff_modify',
      operator: session?.name || '-',
      target: `${meta.module} · ${meta.entityName}`,
      status: 'granted',
      details: `[${meta.actionLabel}] ${meta.detail || '敏感数据操作已完成并记录审计'}`
    };
    recordSecurityAuditLog(auditEvent);
    return { ok: true, message: `${meta.actionLabel}完成（已记录店长级审计）`, result };
  } catch (err) {
    return { ok: false, message: '操作失败：' + String(err) };
  }
}

/**
 * 店长 PIN 临时提权（15 分钟窗口），供权限不足时的"申请提权"入口调用。
 */
export function requestManagerOverride(pin: string, operatorName: string, reason: string) {
  return verifyAndGrantManagerOverride(pin, operatorName, reason);
}
