/**
 * 跨设备实时通道 —— 运行时接线（C4 / C5 / C6）
 *
 * 为什么需要单独一个 bootstrap 模块：
 *   transportManager / adapters / identityBinding 都是"能力"，不是"行为"。
 *   若不在应用启动时把三者接起来，它们会一直处于待命状态 ——
 *   表现为"代码都在、功能全不生效"，且不会有任何报错。
 *   （同类陷阱：本仓 governance 层的写入钩子必须由 initGovernance() 装载才生效。）
 *
 * 接线内容：
 *   C5 身份绑定  —— 解析 participantId 作为 emittedBy 与跨设备收件人标识
 *   C4 订阅适配  —— 以身份/桌号收窄订阅，避免一店多桌的快照风暴
 *   C6 降级与恢复 —— 降级状态对外可见；恢复后补投上行队列并补交待对账裁决
 *
 * 设计立场：
 *   1. **不阻塞界面**。身份解析与云通道就绪都是异步且可能失败的，
 *      启动流程绝不能 await 它们 —— 降级为 device_local 是合法状态，不是错误。
 *   2. **降级必须可见**。identity mode 与 transport health 都对外暴露，
 *      供商家端探针与顾客端提示使用。静默降级比崩溃更危险。
 */

import { resolveIdentity, getCachedIdentity, clearIdentityCache, type ResolvedIdentity } from './identityBinding';
import { reactiveSyncBus } from './reactiveSyncBus';
import { syncPendingSettlements } from './tableSessionCloud';
import type { LayerHealth } from './transport/transportManager';

export interface RealtimeBootstrapResult {
  identity: ResolvedIdentity;
  /** 传输层是否已按身份重建（false 表示仅有本地总线） */
  transportConfigured: boolean;
}

export interface RealtimeDiagnostics {
  identity: ResolvedIdentity | null;
  /** 身份模式的用户可读描述（降级时为提示文案） */
  identityLabel: string;
  identityHint: string;
  transport: LayerHealth;
  /** 是否处于"降级但仍可用"状态 —— 商家端探针应据此告警 */
  degraded: boolean;
  /** 降级是否源于身份未绑定云端（换设备会丢失成员身份） */
  identityUnbound: boolean;
}

let initialized = false;
let lastResult: RealtimeBootstrapResult | null = null;
let healthTimer: ReturnType<typeof setInterval> | null = null;
let lastDegraded = false;
let reconcileListenerAttached = false;

/** 健康巡检周期：与 transportManager 的恢复周期同量级 */
const DIAGNOSTIC_INTERVAL_MS = 15000;

/**
 * 启动实时通道（幂等）。
 *
 * @param options.force 强制重新解析身份（登录态变化后调用）
 * @param options.enableCloud 是否启用跨设备通道；缺省 true。
 *        无云端环境（纯本地演示 / 单机离线）应显式传 false，避免无谓的重连开销。
 */
export async function initRealtimeTransport(
  options: { force?: boolean; enableCloud?: boolean } = {}
): Promise<RealtimeBootstrapResult> {
  const enableCloud = options.enableCloud !== false;

  let identity: ResolvedIdentity;
  try {
    identity = await resolveIdentity({ force: options.force });
  } catch (e: any) {
    // resolveIdentity 内部已兜底，此处仅防御性处理
    console.warn('[RealtimeBootstrap] 身份解析异常，降级为本地总线:', e?.message ?? e);
    clearIdentityCache();
    identity = await resolveIdentity({ force: true });
  }

  let transportConfigured = false;
  try {
    // 以 participantId 作为本端标识：跨设备事件据此判定收件人。
    // 若用随机 id，换设备后 grantedBy 找不到对应参与者，授权链会断裂。
    reactiveSyncBus.configureTransport({
      enableCloud,
      identity: identity.participantId
    });
    transportConfigured = enableCloud;
  } catch (e: any) {
    // 传输层重建失败不应中断应用 —— 退化为仅本地总线
    console.warn('[RealtimeBootstrap] 传输层接线失败，退化为本地总线:', e?.message ?? e);
  }

  lastResult = { identity, transportConfigured };
  initialized = true;

  attachHealthWatch();
  attachRecoveryReconcile();

  if (identity.mode === 'device_local') {
    // 明确告警而非静默：这是"功能看似正常、换设备后成员身份丢失"的根源
    console.warn(
      '[RealtimeBootstrap] 身份未绑定云端（device_local 模式）：',
      identity.degradedReason,
      '｜换设备需重新申请加入本桌。'
    );
  }

  return lastResult;
}

/** 供 UI 判断是否已启动（未启动时不应展示"实时同步中"之类文案） */
export function isRealtimeInitialized(): boolean {
  return initialized;
}

/**
 * 降级状态巡检：
 * 通道连续失败会由 transportManager 自动切到轮询，但**应用层无人知晓**。
 * 这里把状态变化转成一条可被探针与界面消费的事件，让降级"可见"。
 */
function attachHealthWatch(): void {
  if (healthTimer) return;
  healthTimer = setInterval(() => {
    let health: LayerHealth;
    try {
      health = reactiveSyncBus.transportHealth();
    } catch {
      return;
    }
    const degraded = health.degraded || health.activeKind === 'polling';
    if (degraded !== lastDegraded) {
      lastDegraded = degraded;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('obsidian_transport_degraded', {
            detail: { degraded, activeKind: health.activeKind, outboxSize: health.outboxSize }
          })
        );
      }
      if (degraded) {
        console.warn(
          `[RealtimeBootstrap] 实时通道降级（active=${health.activeKind}，待发队列 ${health.outboxSize} 条）`
        );
      } else {
        console.log('[RealtimeBootstrap] 实时通道已恢复正常');
      }
    }
  }, DIAGNOSTIC_INTERVAL_MS);
}

/**
 * 恢复后对账：
 * 降级期间本地 CAS 产生的裁决必须补交服务端，
 * 否则"恢复后服务端权威状态"与"本地已生效状态"会长期分叉。
 * 这类分叉不会自愈，必须在通道恢复时主动收敛。
 */
function attachRecoveryReconcile(): void {
  if (reconcileListenerAttached || typeof window === 'undefined') return;
  reconcileListenerAttached = true;

  window.addEventListener('obsidian_transport_degraded', ((e: CustomEvent) => {
    if (e?.detail?.degraded) return; // 仅在恢复时触发对账
    void (async () => {
      try {
        await reactiveSyncBus.flushOutbox();
        const res = await syncPendingSettlements();
        if (res.attempted > 0) {
          console.log(
            `[RealtimeBootstrap] 通道恢复，待对账裁决补交完成：尝试 ${res.attempted}，确认 ${res.confirmed}，冲突 ${res.conflicted}`
          );
        }
      } catch (err: any) {
        console.warn('[RealtimeBootstrap] 恢复对账失败（将在下次恢复时重试）:', err?.message ?? err);
      }
    })();
  }) as EventListener);
}

/**
 * 商家端探针与诊断面板的读数入口。
 * 返回的是**真实**状态，不是占位值 —— 界面不得在此之上编造健康度。
 */
export function getRealtimeDiagnostics(): RealtimeDiagnostics {
  const identity = getCachedIdentity();
  let transport: LayerHealth;
  try {
    transport = reactiveSyncBus.transportHealth();
  } catch {
    transport = {
      broadcast: null,
      cloudbase: null,
      polling: null,
      activeKind: 'memory',
      degraded: true,
      outboxSize: 0,
      seenCount: 0
    };
  }

  const identityUnbound = identity?.mode === 'device_local';
  const degraded = transport.degraded || transport.activeKind === 'polling' || identityUnbound;

  return {
    identity,
    identityLabel: describeIdentity(identity),
    identityHint: describeIdentityHint(identity),
    transport,
    degraded,
    identityUnbound
  };
}

function describeIdentity(identity: ResolvedIdentity | null): string {
  if (!identity) return '身份未解析';
  return identity.mode === 'cloud_bound' ? '云端已绑定' : '仅本设备有效';
}

function describeIdentityHint(identity: ResolvedIdentity | null): string {
  if (!identity) return '正在解析身份…';
  if (identity.mode === 'cloud_bound') {
    return '换设备登录同一账号仍可保持本桌成员身份';
  }
  return `云登录不可用${identity.degradedReason ? `（${identity.degradedReason}）` : ''}，换设备需重新申请加入本桌`;
}

/** 释放：测试与登出时使用 */
export function disposeRealtimeTransport(): void {
  if (healthTimer) {
    clearInterval(healthTimer);
    healthTimer = null;
  }
  initialized = false;
  lastResult = null;
  lastDegraded = false;
}
