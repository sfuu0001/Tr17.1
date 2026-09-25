/**
 * 持久化存储层 (Persistent Store) —— P2-b
 *
 * 修复的问题：
 *   1. 全部数据放在 localStorage（5-10MB 硬上限），版本指针上限被压到 60 条；
 *   2. 超过 25 条的记录执行"脱水"——把 beforeSnapshot / afterSnapshot 替换为
 *      { summary, entityId }，导致这些版本**永久失去回滚能力**，而 UI 仍显示
 *      "一键恢复此版本"按钮；
 *   3. 无 schema 版本号、无迁移策略，结构一变就静默丢数据。
 *
 * 本模块提供：
 *   - IndexedDB 作为主存储（容量按磁盘配额，通常 >50MB），localStorage 作为
 *     同步读缓存与降级后备；
 *   - 写入失败不再静默：自动降级到内存镜像并记账，供治理健康面板展示；
 *   - schema 版本号 + 迁移钩子；
 *   - 分层保留策略：permanent / long / rolling 三档，超限时**归档快照但保留补丁**
 *     —— 因为回滚只需要补丁，不再需要完整快照。
 */

import { RetentionTier, VersionModuleType, VersionPointer } from '../types/versionTracking';
import { safeGetStorage, safeSetStorage } from './safeStorage';

export const SCHEMA_VERSION = 2;
const DB_NAME = 'obsidian_governance_store';
const DB_STORE = 'kv';
const META_KEY = 'obsidian_governance_store_meta';

/** 版本指针的存储容量上限（补丁化后单条体积下降约 1-2 个数量级，故可大幅提升） */
export const POINTER_RETENTION_CAP = 3000;

const MODULE_TIER: Record<VersionModuleType, RetentionTier> = {
  // 合规与资金相关：永久保留
  system: 'permanent',
  fallback: 'permanent',
  staff: 'permanent',
  payments: 'permanent',
  // 经营核心：长周期保留
  orders: 'long',
  kds: 'long',
  coupons: 'long',
  marketing: 'long',
  delivery: 'long',
  stall_gps: 'long',
  craft_standards: 'long',
  // 桌台会话与联动授权：授权链、成员增减属纠纷相关，需长周期保留；
  // 高频的行为探针在写入时用 tierOverride='rolling' 单独降级。
  table_session: 'long',
  // 高频、体量大：滚动保留
  dishes: 'rolling',
  materials: 'rolling',
  tables: 'rolling',
  calling_queue: 'rolling'
};

const TIER_QUOTA: Record<RetentionTier, number> = {
  permanent: Number.POSITIVE_INFINITY,
  long: 1500,
  rolling: 1000
};

/**
 * rolling 层中保留"完整快照"的最大条数；超出的更旧记录才会被归档（剥离重快照、保留补丁）。
 *
 * 为什么需要这个下界：早期实现用 `rolling.length * 0.5` 作为剥离起点，
 * 于是记录数很少时（甚至只有 1 条）**最新记录也会被立刻归档** ——
 * 随后回滚时拿被剥离的摘要对象去比对实体，会产生 100% 的假冲突。
 */
const ROLLING_FULL_SNAPSHOT_KEEP = 200;

export function retentionTierOf(module: VersionModuleType): RetentionTier {
  return MODULE_TIER[module] ?? 'rolling';
}

// -------------------------------------------------------------
// 存储健康度
// -------------------------------------------------------------

export interface PersistenceHealth {
  backend: 'indexeddb' | 'localstorage' | 'memory';
  schemaVersion: number;
  degraded: boolean;
  failureCount: number;
  lastFailureAt?: string;
  lastFailureReason?: string;
}

// -------------------------------------------------------------
// IndexedDB 封装
// -------------------------------------------------------------

function hasIndexedDb(): boolean {
  return typeof globalThis !== 'undefined' && !!(globalThis as any).indexedDB;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = (globalThis as any).indexedDB.open(DB_NAME, SCHEMA_VERSION);
    req.onupgradeneeded = () => {
      const db: IDBDatabase = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

// -------------------------------------------------------------
// 紧凑缓存转换与配额保护
// -------------------------------------------------------------

/**
 * 为 localStorage 生成轻量级同步缓存副本。
 * 解决问题：
 *   localStorage 全站共享 5MB 硬上限，而版本指针列表累积大量实体完整快照（全量菜品/订单等）
 *   会导致单次写入轻易超过几兆，造成 QuotaExceededError 报错。
 * 分层策略：
 *   - IndexedDB 持久化包含全部历史与完整快照的权威数据（无 5MB 限制）；
 *   - memoryMirror 维护当前会话的 100% 完整全量数据；
 *   - localStorage 仅保留最新 30 条紧凑缓存（最新 5 条完整保留以备即时回滚，其余剥离庞大快照保留补丁），体积仅 20~30KB。
 */
export function compactPointersForCache(pointers: VersionPointer[]): VersionPointer[] {
  if (!Array.isArray(pointers)) return [];
  const maxLocalCount = 30;
  return pointers.slice(0, maxLocalCount).map((p, idx) => {
    if (idx < 5) return p;
    return {
      ...p,
      beforeSnapshot: p.beforeSnapshot ? { summary: p.summary, entityId: p.entityId } : undefined,
      afterSnapshot: p.afterSnapshot ? { summary: p.summary, entityId: p.entityId } : undefined
    };
  });
}

// -------------------------------------------------------------
// 主类
// -------------------------------------------------------------

class PersistentStore {
  private db: IDBDatabase | null = null;
  private memoryMirror = new Map<string, unknown>();
  private initialized = false;
  private failureCount = 0;
  private lastFailureAt?: string;
  private lastFailureReason?: string;
  private backend: PersistenceHealth['backend'] = 'localstorage';

  /** 清理可能在历史运行中累积的过大 localStorage 缓存（如超大历史快照或未精简指针） */
  private cleanupOversizedLocalStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      if (window.localStorage.getItem('obsidian_milestone_snapshots')) {
        window.localStorage.removeItem('obsidian_milestone_snapshots');
      }
      const rawPointers = window.localStorage.getItem('obsidian_version_pointers');
      if (rawPointers && rawPointers.length > 60000) {
        try {
          const parsed = JSON.parse(rawPointers);
          if (Array.isArray(parsed)) {
            const compacted = compactPointersForCache(parsed as VersionPointer[]);
            window.localStorage.setItem('obsidian_version_pointers', JSON.stringify(compacted));
          }
        } catch {}
      }
    } catch {}
  }

  /** 幂等初始化：把 IndexedDB 中比 localStorage 更新的键回填到同步缓存 */
  public async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    this.cleanupOversizedLocalStorage();

    if (!hasIndexedDb()) {
      this.backend = 'localstorage';
      this.recordFailure('当前环境不支持 IndexedDB，继续使用 localStorage（容量受限）');
      return;
    }

    try {
      this.db = await openDb();
      this.backend = 'indexeddb';
      await this.migrate();
      await this.hydrateFromIndexedDb();
    } catch (e: any) {
      this.backend = 'localstorage';
      this.recordFailure(`IndexedDB 初始化失败，已降级至 localStorage: ${e?.message ?? e}`);
    }
  }

  /** schema 迁移钩子 */
  private async migrate(): Promise<void> {
    const meta = safeGetStorage<{ schemaVersion?: number } | null>(META_KEY, null);
    const from = meta?.schemaVersion ?? 1;
    if (from >= SCHEMA_VERSION) return;

    // v1 → v2：旧记录没有 chainProof / patches，补齐空位并打标，
    // 使其可被新的回滚路径安全识别（不伪造哈希，而是留待补算）。
    const legacy = safeGetStorage<VersionPointer[] | null>('obsidian_version_pointers', null);
    if (Array.isArray(legacy)) {
      const upgraded = legacy.map((p) => ({
        ...p,
        chainProof: p.chainProof ?? null,
        patches: p.patches ?? [],
        tier: p.tier ?? retentionTierOf(p.module)
      }));
      safeSetStorage('obsidian_version_pointers', compactPointersForCache(upgraded));
      await this.set('obsidian_version_pointers', upgraded);
    }

    safeSetStorage(META_KEY, {
      schemaVersion: SCHEMA_VERSION,
      migratedFrom: from,
      migratedAt: new Date().toISOString()
    });
    console.info(`[PersistentStore] schema 已从 v${from} 迁移至 v${SCHEMA_VERSION}`);
  }

  /** 用 IndexedDB 中的权威数据回填同步缓存与内存镜像 */
  private async hydrateFromIndexedDb(): Promise<void> {
    const keys = await this.keys();
    for (const key of keys) {
      if (!key.startsWith('obsidian_')) continue;
      const value = await this.get<unknown>(key);
      if (value === undefined) continue;
      // 权威数据无损回填内存镜像
      this.memoryMirror.set(key, value);
      const localRaw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (!localRaw) {
        let valToStore = value;
        if (key === 'obsidian_version_pointers' && Array.isArray(value)) {
          valToStore = compactPointersForCache(value as VersionPointer[]);
        } else if (key === 'obsidian_milestone_snapshots' && Array.isArray(value)) {
          valToStore = (value as any[]).slice(0, 5).map((s) => ({ ...s, payload: {} }));
        }
        safeSetStorage(key, valToStore);
      }
    }
  }

  /**
   * 同步读取：内存镜像（全量、最新） → localStorage（同步缓存） → 默认值。
   */
  public getSync<T>(key: string, fallback: T): T {
    // 1. 优先使用当前会话中的内存镜像（保持 100% 数据保真与无损快照）
    const cached = this.memoryMirror.get(key);
    if (cached !== undefined) return cached as T;

    // 2. 其次使用 localStorage 同步缓存
    const fromLocal = safeGetStorage<T | undefined>(key, undefined);
    if (fromLocal !== undefined) return fromLocal;

    return fallback;
  }

  /**
   * 同步写入：内存镜像（全量无损）+ IndexedDB（持久权威路径）+ localStorage（紧凑同步缓存）。
   * 分级存储：当数据体量触发 localStorage 配额保护时，降级由 IndexedDB 权威承担，不产生异常报错。
   */
  public setSync<T>(key: string, value: T): boolean {
    this.memoryMirror.set(key, value);

    // 对于版本指针列表与里程碑快照等超大实体，写入 localStorage 时使用轻量同步缓存避免超限
    let valueToStoreInLocal: unknown = value;
    if (key === 'obsidian_version_pointers' && Array.isArray(value)) {
      valueToStoreInLocal = compactPointersForCache(value as VersionPointer[]);
    } else if (key === 'obsidian_milestone_snapshots' && Array.isArray(value)) {
      valueToStoreInLocal = (value as any[]).slice(0, 5).map((s) => ({ ...s, payload: {} }));
    }

    const localOk = safeSetStorage(key, valueToStoreInLocal);

    // IndexedDB 异步写入（持久权威路径，包含 100% 完整快照与历史数据）
    void this.set(key, value).catch((e) => {
      this.recordFailure(`IndexedDB 写入失败 ${key}: ${e?.message ?? e}`);
    });

    if (!localOk) {
      if (this.db) {
        // localStorage 配额已满时由 IndexedDB 承担主存储，是正常的分级存储行为，不记为故障
        this.recordDegraded(`localStorage 写入受限（配额保护），已由 IndexedDB 主存储持久化: ${key}`);
        return true;
      }
      this.recordFailure(`localStorage 与 IndexedDB 均不可用，数据仅存于内存: ${key}`);
      return false;
    }
    return true;
  }

  public async get<T>(key: string): Promise<T | undefined> {
    if (!this.db) return this.memoryMirror.get(key) as T | undefined;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  public async set<T>(key: string, value: T): Promise<boolean> {
    if (!this.db) return false;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(DB_STORE, 'readwrite');
      const req = tx.objectStore(DB_STORE).put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  public async keys(): Promise<string[]> {
    if (!this.db) return Array.from(this.memoryMirror.keys());
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).getAllKeys();
      req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String));
      req.onerror = () => reject(req.error);
    });
  }

  public async remove(key: string): Promise<void> {
    this.memoryMirror.delete(key);
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    if (!this.db) return;
    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(DB_STORE, 'readwrite');
      const req = tx.objectStore(DB_STORE).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private recordDegraded(reason: string): void {
    this.lastFailureAt = new Date().toISOString();
    this.lastFailureReason = reason;
    console.info(`[PersistentStore] ${reason}`);
  }

  private recordFailure(reason: string): void {
    this.failureCount += 1;
    this.lastFailureAt = new Date().toISOString();
    this.lastFailureReason = reason;
    console.error(`[PersistentStore] ${reason}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('obsidian_governance_storage_failure', {
          detail: { reason, failureCount: this.failureCount, at: this.lastFailureAt }
        })
      );
    }
  }

  public get health(): PersistenceHealth {
    return {
      backend: this.backend,
      schemaVersion: SCHEMA_VERSION,
      degraded: this.failureCount > 0,
      failureCount: this.failureCount,
      lastFailureAt: this.lastFailureAt,
      lastFailureReason: this.lastFailureReason
    };
  }
}

export const persistentStore = new PersistentStore();

/** 应用启动时调用一次（幂等） */
export function initPersistentStore(): void {
  void persistentStore.init();
}

// -------------------------------------------------------------
// 分层保留策略
// -------------------------------------------------------------

export interface RetentionPlan {
  kept: VersionPointer[];
  /** 被归档（剥离重快照但保留补丁）的条数 */
  archivedCount: number;
  /** 被彻底淘汰的条数 */
  droppedCount: number;
  detail: Record<RetentionTier, { before: number; after: number }>;
}

/**
 * 分层保留。
 *
 * 与旧实现的关键差异：
 *   旧：超过 25 条即"脱水" beforeSnapshot / afterSnapshot —— 直接摧毁回滚能力。
 *   新：仅在超出**该层配额**时才动 oldest，且归档时**保留 patches**。
 *       由于 P2-a 之后回滚只依赖补丁，归档不会损失字段级回滚能力，
 *       只是在需要整实体还原的场景降级为"仅补丁可回"。
 */
export function applyRetentionPolicy(
  pointers: VersionPointer[],
  cap: number = POINTER_RETENTION_CAP
): RetentionPlan {
  const detail: RetentionPlan['detail'] = {
    permanent: { before: 0, after: 0 },
    long: { before: 0, after: 0 },
    rolling: { before: 0, after: 0 }
  };

  const bucketed: Record<RetentionTier, VersionPointer[]> = { permanent: [], long: [], rolling: [] };
  pointers.forEach((p) => {
    const tier = p.tier ?? retentionTierOf(p.module);
    bucketed[tier].push({ ...p, tier });
  });
  (Object.keys(bucketed) as RetentionTier[]).forEach((tier) => {
    detail[tier].before = bucketed[tier].length;
  });

  // 1. 逐层按配额裁剪（记录为倒序存储，数组尾部为最旧）
  const keptByTier: Record<RetentionTier, VersionPointer[]> = { permanent: [], long: [], rolling: [] };
  (['permanent', 'long', 'rolling'] as RetentionTier[]).forEach((tier) => {
    const quota = TIER_QUOTA[tier];
    keptByTier[tier] = Number.isFinite(quota) ? bucketed[tier].slice(0, quota) : bucketed[tier];
  });

  // 2. 总量仍超限时，优先从 rolling 开始淘汰（不动 permanent）
  let total = keptByTier.permanent.length + keptByTier.long.length + keptByTier.rolling.length;
  const dropOrder: RetentionTier[] = ['rolling', 'long'];
  for (const tier of dropOrder) {
    while (total > cap && keptByTier[tier].length > 0) {
      keptByTier[tier].pop();
      total -= 1;
    }
    if (total <= cap) break;
  }

  (Object.keys(keptByTier) as RetentionTier[]).forEach((tier) => {
    detail[tier].after = keptByTier[tier].length;
  });

  const keptTierMap = new Map<string, RetentionTier>();
  (Object.keys(keptByTier) as RetentionTier[]).forEach((tier) => {
    keptByTier[tier].forEach((p) => keptTierMap.set(p.pointerId, tier));
  });

  // 3. 归档：仅在"快照被剥离"时才标记 contentArchived；
  //    没有补丁且快照被剥离的记录才真正不可回滚。
  let archivedCount = 0;
  const kept = pointers
    .filter((p) => keptTierMap.has(p.pointerId))
    .map((p) => {
      const expanded = { ...p, tier: keptTierMap.get(p.pointerId) };
      if (expanded.patches && expanded.patches.length > 0) return expanded;
      // 无补丁的记录依赖完整快照才能回滚，因此保留快照，不做剥离
      return expanded;
    });

  // 4. 体积控制：只有 rolling 层记录数超过「完整快照保留条数」时，
  //    才对更旧的记录剥离重快照（补丁保留，字段级回滚能力不受影响）。
  const rollingKept = kept.filter((p) => p.tier === 'rolling');
  for (let i = ROLLING_FULL_SNAPSHOT_KEEP; i < rollingKept.length; i += 1) {
    const target = rollingKept[i];
    if (!target.patches || target.patches.length === 0) continue;
    if (target.contentArchived) continue;
    target.beforeSnapshot = { summary: target.summary, entityId: target.entityId };
    target.afterSnapshot = { summary: target.summary, entityId: target.entityId };
    target.contentArchived = true;
    archivedCount += 1;
  }

  return {
    kept,
    archivedCount,
    droppedCount: pointers.length - kept.length,
    detail
  };
}

/** 保留策略说明（供 UI 展示） */
export function describeRetentionPolicy(): Array<{
  tier: RetentionTier;
  quota: string;
  modules: VersionModuleType[];
  note: string;
}> {
  const notes: Record<RetentionTier, string> = {
    permanent: '永不淘汰（合规与资金相关）',
    long: '长周期保留，超限时按最旧优先淘汰',
    rolling: '滚动保留；有补丁的记录归档快照但保留字段级回滚能力'
  };
  return (Object.keys(TIER_QUOTA) as RetentionTier[]).map((tier) => ({
    tier,
    quota: Number.isFinite(TIER_QUOTA[tier]) ? String(TIER_QUOTA[tier]) : '不限',
    modules: (Object.keys(MODULE_TIER) as VersionModuleType[]).filter((m) => MODULE_TIER[m] === tier),
    note: notes[tier]
  }));
}
