/**
 * 安全的 localStorage 封装，防止 JSON.parse 异常与隐身模式/沙箱配额超限抛错
 */

export function safeGetStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`[SafeStorage] 读取键 "${key}" 异常，返回默认值:`, err);
    return defaultValue;
  }
}

// -------------------------------------------------------------
// 配额自愈与应急清理
// -------------------------------------------------------------

function tryRecoverQuota(failedKey: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    let recovered = false;
    // 1. 优先移除体积巨大的快照载荷（已在 IndexedDB 中持久化）
    if (window.localStorage.getItem('obsidian_milestone_snapshots')) {
      window.localStorage.removeItem('obsidian_milestone_snapshots');
      recovered = true;
    }
    // 2. 清理临时性旧审计日志
    const purgeCandidates = ['obsidian_franchise_audit', 'obsidian_security_audit_logs'];
    for (const pk of purgeCandidates) {
      if (pk !== failedKey && window.localStorage.getItem(pk)) {
        window.localStorage.removeItem(pk);
        recovered = true;
      }
    }
    // 3. 若版本指针过大，裁剪 localStorage 中的副本
    if (failedKey !== 'obsidian_version_pointers') {
      const rawPointers = window.localStorage.getItem('obsidian_version_pointers');
      if (rawPointers && rawPointers.length > 50000) {
        try {
          const parsed = JSON.parse(rawPointers);
          if (Array.isArray(parsed) && parsed.length > 15) {
            const compacted = parsed.slice(0, 15).map((p: any) => ({
              ...p,
              beforeSnapshot: undefined,
              afterSnapshot: undefined
            }));
            window.localStorage.setItem('obsidian_version_pointers', JSON.stringify(compacted));
            recovered = true;
          }
        } catch {}
      }
    }
    return recovered;
  } catch {
    return false;
  }
}

export function safeSetStorage<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  // 治理网关写入钩子（P1-a）：在持久化唯一出口处自动生成版本记录，
  // 业务侧无需改动任何调用点即可获得 100% 覆盖。
  //
  // 【必须在写入前捕获上一版值】：
  // 曾把 prev 的读取放在 setItem 之后，读到的是刚写入的新值，
  // 导致 buildDrafts 的 diff 恒为空 —— 自动记录路径整条失效（静默空转）。
  const shouldHook = storageWriteHook !== null && !hookRunning;
  const prev = shouldHook ? safeGetStorage<unknown>(key, undefined) : undefined;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err: any) {
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      (typeof err?.message === 'string' && err.message.toLowerCase().includes('quota'));

    if (isQuotaError && tryRecoverQuota(key)) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // 自愈重试仍超限，由持久层/内存镜像提供兜底
        return false;
      }
    } else {
      return false;
    }
  }

  if (shouldHook) {
    hookRunning = true;
    try {
      storageWriteHook!(key, value, prev);
    } catch (err) {
      // 钩子异常不得影响业务写入结果（数据已落盘）
      console.warn(`[SafeStorage] 写入钩子执行异常（业务数据已落盘）:`, err);
    } finally {
      hookRunning = false;
    }
  }
  return true;
}

// -------------------------------------------------------------
// P1-a：持久化出口写入钩子
// -------------------------------------------------------------

/**
 * 由治理网关注册。采用"注册回调"而不是直接 import 治理模块，
 * 以避免 safeStorage ↔ governedStorage ↔ versionPointerEngine 的循环依赖。
 */
export type StorageWriteHook = (key: string, next: unknown, prev: unknown) => void;

let storageWriteHook: StorageWriteHook | null = null;
/** 重入保护：钩子自身引发的写入不再触发钩子，防止无限递归 */
let hookRunning = false;

export function registerStorageWriteHook(hook: StorageWriteHook | null): void {
  storageWriteHook = hook;
}

/** 供测试与诊断使用：当前是否已安装写入钩子 */
export function hasStorageWriteHook(): boolean {
  return storageWriteHook !== null;
}

/**
 * 临时摘除写入钩子执行 fn。
 *
 * 用途：governedWrite 这类**自带记录逻辑**的显式路径，
 * 若其内部的 safeSetStorage 再触发一次钩子，同一次变更会被记录两遍。
 * 显式路径负责去重，因此需要在本调用期间让出钩子。
 */
export function withStorageWriteHookSuspended<T>(fn: () => T): T {
  const saved = storageWriteHook;
  storageWriteHook = null;
  try {
    return fn();
  } finally {
    storageWriteHook = saved;
  }
}
