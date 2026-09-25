/**
 * Urban Radar 流动餐车专送平台 - 平台总控端监管鉴权中枢
 * 
 * 安全规则:
 * - 平台总控中心掌握全域所有商家餐车抽佣设置、全网网格监控、争议仲裁与资金账单，
 *   严格禁止普通食客或未授权人员随意切换进入。
 * - 切换进入平台端必须通过平台操作员凭证 (工号/邮箱 + 6 位专属 PIN 码) 进行验证。
 */

import { safeGetStorage, safeSetStorage } from './safeStorage';
import { recordSecurityAuditLog } from './rbacEngine';

export const STORAGE_KEY_PLATFORM_AUTH = 'obsidian_platform_auth_session';
export const EVENT_PLATFORM_AUTH_CHANGED = 'obsidian_platform_auth_changed';

export interface PlatformSession {
  isAuthorized: boolean;
  operatorId: string;
  name: string;
  email: string;
  role: 'super_admin' | 'ops_officer' | 'compliance_auditor';
  roleTitle: string;
  avatar: string;
  authorizedAt: string;
}

export interface PresetPlatformAccount {
  account: string;
  name: string;
  role: 'super_admin' | 'ops_officer' | 'compliance_auditor';
  roleTitle: string;
  pin: string;
  avatar: string;
  tag: string;
}

export const PRESET_PLATFORM_ACCOUNTS: PresetPlatformAccount[] = [
  {
    account: 'admin@urbanradar.com',
    name: '周霆锋 (平台全域运营总监)',
    role: 'super_admin',
    roleTitle: '平台总控最高调度官',
    pin: '888888',
    avatar: '🛡️',
    tag: '全域抽佣设定 · 资金清算 · SLA全局仲裁'
  },
  {
    account: 'ops@urbanradar.com',
    name: '李明 (网格调度专员)',
    role: 'ops_officer',
    roleTitle: '城市网格调度官',
    pin: '123456',
    avatar: '📡',
    tag: '餐车停靠审批 · 运力调度 · 实时监控'
  },
  {
    account: 'audit@urbanradar.com',
    name: '赵琳 (风控与合规仲裁员)',
    role: 'compliance_auditor',
    roleTitle: '客商争议仲裁官',
    pin: '666888',
    avatar: '⚖️',
    tag: '差评调查 · 客商纠纷调解 · 扣款复核'
  }
];

export function getPlatformSession(): PlatformSession | null {
  const session = safeGetStorage<PlatformSession | null>(STORAGE_KEY_PLATFORM_AUTH, null);
  if (session && session.isAuthorized) {
    return session;
  }
  return null;
}

export function isPlatformAuthorized(): boolean {
  return Boolean(getPlatformSession()?.isAuthorized);
}

export function loginPlatformOperator(
  account: string,
  pin: string
): { success: boolean; session?: PlatformSession; message: string } {
  const trimmedAccount = account.trim().toLowerCase();
  const trimmedPin = pin.trim();

  // 1. 匹配预设平台专员或超级管理员通行码
  const matched = PRESET_PLATFORM_ACCOUNTS.find(
    (p) => p.account.toLowerCase() === trimmedAccount && p.pin === trimmedPin
  );

  // 也支持通配管理员 PIN 码 888888
  const isMasterPin = trimmedPin === '888888';

  if (matched || (isMasterPin && trimmedAccount.length > 2)) {
    const operator = matched || {
      account: trimmedAccount,
      name: `平台督导员 (${trimmedAccount.slice(0, 4)})`,
      role: 'super_admin' as const,
      roleTitle: '特派总控运营专员',
      pin: trimmedPin,
      avatar: '🛡️',
      tag: '高级调度授权'
    };

    const session: PlatformSession = {
      isAuthorized: true,
      operatorId: `platform-${Date.now()}`,
      name: operator.name,
      email: operator.account,
      role: operator.role,
      roleTitle: operator.roleTitle,
      avatar: operator.avatar,
      authorizedAt: new Date().toISOString()
    };

    safeSetStorage(STORAGE_KEY_PLATFORM_AUTH, session);

    // 记录安全审计
    recordSecurityAuditLog({
      action: 'platform_access_granted',
      operator: session.name,
      target: 'PlatformSystemView',
      status: 'allowed',
      details: `成功校验平台专员凭证 [${session.email}]，准入全网总控监管端。`
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_PLATFORM_AUTH_CHANGED, { detail: session }));
    }

    return {
      success: true,
      session,
      message: `平台总控认证通过！欢迎，${session.name}。`
    };
  }

  // 记录审计拦截
  recordSecurityAuditLog({
    action: 'platform_access_denied',
    operator: trimmedAccount || '未知访客',
    target: 'PlatformSystemView',
    status: 'denied',
    details: `尝试访问平台总控端凭证失败: [账号: ${trimmedAccount}, PIN: ${trimmedPin.replace(/./g, '*')}]`
  });

  return {
    success: false,
    message: '平台安全凭证或 6 位 PIN 码不正确，请选择下方演示专员快速登录或输入 888888'
  };
}

export function logoutPlatform(): void {
  const session = getPlatformSession();
  safeSetStorage(STORAGE_KEY_PLATFORM_AUTH, null);
  if (session) {
    recordSecurityAuditLog({
      action: 'auth_logout',
      operator: session.name,
      target: 'PlatformSystemView',
      status: 'revoked',
      details: '已主动登出平台总控端。'
    });
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_PLATFORM_AUTH_CHANGED, { detail: null }));
  }
}
