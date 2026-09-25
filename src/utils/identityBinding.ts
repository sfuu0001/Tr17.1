/**
 * 顾客身份绑定（C5）
 *
 * 决策书 §3.3：跨设备的前提是**同一顾客在不同设备上是同一个 participantId**。
 * 否则换设备后 grantedBy 指向的授权人找不到、findOrphanParticipants 大量误报、
 * 授权链直接断裂。
 *
 * 绑定规则：
 *   participantId 权威值 = 由 CloudBase 登录 uid 派生的稳定标识
 *   deviceFingerprint   = 仅作辅助归并信号（换设备/清缓存时用于归并）
 *
 * 降级规则（硬性）：匿名登录失败时进入 device_local 模式，
 * **必须显式告知用户"当前为设备内有效"**，不得静默假装已登录 ——
 * 否则用户换设备后会莫名其妙地"失去桌台成员身份"而无人能解释原因。
 */

import { ensureCloudbaseAuth } from './cloudbase';

export type IdentityMode = 'cloud_bound' | 'device_local';

export interface ResolvedIdentity {
  participantId: string;
  mode: IdentityMode;
  cloudUid?: string;
  deviceFingerprint: string;
  resolvedAt: string;
  /** 降级原因（用于 UI 明确提示） */
  degradedReason?: string;
}

export interface IdentityProvider {
  /** 返回登录 uid；不可用时给出原因 */
  getUid(): Promise<{ ok: boolean; uid?: string; error?: string }>;
}

const STORAGE_KEY_IDENTITY_CACHE = 'obsidian_participant_identity_v1';
const STORAGE_KEY_HARDWARE_HASH = 'obsidian_hardware_hash';

let injectedProvider: IdentityProvider | null = null;
let cached: ResolvedIdentity | null = null;

export function setIdentityProvider(provider: IdentityProvider | null): void {
  injectedProvider = provider;
}

/** 默认身份提供者：惰性接入 CloudBase 匿名登录 */
function defaultProvider(): IdentityProvider {
  return {
    async getUid() {
      try {
        const res = await ensureCloudbaseAuth();
        if (res?.success && res.userId) return { ok: true, uid: res.userId };
        return { ok: false, error: res?.error || '匿名登录未成功' };
      } catch (e: any) {
        return { ok: false, error: e?.message || 'CloudBase 不可用' };
      }
    }
  };
}

// -------------------------------------------------------------
// 稳定短哈希（FNV-1a）
// -------------------------------------------------------------

/**
 * 由 uid 派生 participantId。
 * 不直接使用原始 uid：一是避免把登录 uid 暴露在业务数据与界面里，
 * 二是不同环境（测试/生产）可通过盐值隔离。
 */
export function deriveParticipantId(uid: string, salt = 'obsidian_table'): string {
  let h = 2166136261;
  const input = `${salt}:${uid}`;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = (h >>> 0).toString(36).padStart(7, '0');
  let h2 = 2166136261 ^ 0x9e3779b9;
  for (let i = input.length - 1; i >= 0; i -= 1) {
    h2 ^= input.charCodeAt(i);
    h2 = Math.imul(h2, 16777619);
  }
  const b = (h2 >>> 0).toString(36).padStart(7, '0');
  return `cust_${a}${b}`.slice(0, 18);
}

// -------------------------------------------------------------
// 设备指纹（辅助归并）
// -------------------------------------------------------------

function readHardwareHash(): string {
  try {
    const g: any = globalThis as any;
    const existing = g.localStorage?.getItem(STORAGE_KEY_HARDWARE_HASH);
    if (existing) return existing;
    const generated = `HW-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    g.localStorage?.setItem(STORAGE_KEY_HARDWARE_HASH, generated);
    return generated;
  } catch {
    return 'HW-UNKNOWN';
  }
}

// -------------------------------------------------------------
// 解析
// -------------------------------------------------------------

/**
 * 解析本端身份（幂等，带进程内缓存）。
 * @param options.force 忽略缓存重新解析（登录状态变化后调用）
 */
export async function resolveIdentity(
  options: { force?: boolean; provider?: IdentityProvider } = {}
): Promise<ResolvedIdentity> {
  if (!options.force && cached) return cached;

  const provider = options.provider ?? injectedProvider ?? defaultProvider();
  const deviceFingerprint = readHardwareHash();

  let result: ResolvedIdentity;
  try {
    const auth = await provider.getUid();
    if (auth.ok && auth.uid) {
      result = {
        participantId: deriveParticipantId(auth.uid),
        mode: 'cloud_bound',
        cloudUid: auth.uid,
        deviceFingerprint,
        resolvedAt: new Date().toISOString()
      };
    } else {
      result = {
        participantId: `cust_local_${deviceFingerprint.replace(/^HW-/, '').toLowerCase()}`,
        mode: 'device_local',
        deviceFingerprint,
        resolvedAt: new Date().toISOString(),
        degradedReason: auth.error || '云登录不可用'
      };
    }
  } catch (e: any) {
    result = {
      participantId: `cust_local_${deviceFingerprint.replace(/^HW-/, '').toLowerCase()}`,
      mode: 'device_local',
      deviceFingerprint,
      resolvedAt: new Date().toISOString(),
      degradedReason: e?.message || '身份解析异常'
    };
  }

  cached = result;
  try {
    const g: any = globalThis as any;
    g.localStorage?.setItem(STORAGE_KEY_IDENTITY_CACHE, JSON.stringify(result));
  } catch {
    /* ignore */
  }
  return result;
}

export function getCachedIdentity(): ResolvedIdentity | null {
  if (cached) return cached;
  try {
    const g: any = globalThis as any;
    const raw = g.localStorage?.getItem(STORAGE_KEY_IDENTITY_CACHE);
    if (!raw) return null;
    cached = JSON.parse(raw) as ResolvedIdentity;
    return cached;
  } catch {
    return null;
  }
}

export function clearIdentityCache(): void {
  cached = null;
  try {
    const g: any = globalThis as any;
    g.localStorage?.removeItem(STORAGE_KEY_IDENTITY_CACHE);
  } catch {
    /* ignore */
  }
}

/**
 * 身份模式的用户可见文案。
 * 降级时必须展示 mode === 'device_local' 的提示，避免用户误以为换设备后
 * 仍能保持桌台成员身份。
 */
export function describeIdentityMode(identity: ResolvedIdentity | null): {
  label: string;
  hint: string;
  degraded: boolean;
} {
  if (!identity) {
    return { label: '身份未就绪', hint: '正在识别本机身份…', degraded: true };
  }
  if (identity.mode === 'cloud_bound') {
    return {
      label: '已绑定云端身份',
      hint: '换设备后仍可保持同桌成员身份',
      degraded: false
    };
  }
  return {
    label: '仅本机有效',
    hint: `云登录不可用（${identity.degradedReason || '未知原因'}），换设备需重新申请加入本桌`,
    degraded: true
  };
}
