/**
 * 统一回收站引擎 (Recycle Bin Engine) — 2026-09-16
 * ----------------------------------------------------------------------------
 * 契约（用户决策 2026-09-16）：
 *  - 保留期 30 天，过期自动清除；
 *  - 「恢复」把快照写回源 storage 键并派发同键 storage 事件（模块既有监听自动刷新）；
 *  - 「彻底删除」必须具备品牌总部 (HQ) 身份（二次权限，isHqUser）；
 *  - 删除/恢复/清空均写入 obsidian_recycle_bin_v1 并广播 RECYCLE_BIN_CHANGED；
 *  - 云同步：经 syncEngine L5 总线广播 + transport outbox 即时出箱（秒同步，仅业务数据类）。
 */
import { safeGetStorage, safeSetStorage } from './safeStorage';
import { syncEngine } from './syncEngine';

export const RECYCLE_BIN_STORAGE_KEY = 'obsidian_recycle_bin_v1';
export const RECYCLE_BIN_EVENT = 'obsidian_recycle_bin_changed';
export const RECYCLE_BIN_RETENTION_DAYS = 30;
const RECYCLE_BIN_CAP = 300;

export interface RecycleBinEntry {
  binId: string;
  /** 实体类型：material / coupon / category_brand / staff / ingredient_trace / table_qr / order / adjustment / generic … */
  type: string;
  typeLabel: string;
  refId: string;
  label: string;
  /** 删除时的完整对象快照 */
  snapshot: unknown;
  /** 源 storage 键（恢复目标） */
  storageKey: string;
  /**
   * 源容器形态：
   *  - array：storageKey 直接是 T[]（按 idField 查重后 unshift）；
   *  - map：storageKey 是 Record<refId, T>；
   *  - nested-array：storageKey 是 Record<ownerId, T[]>（嵌套数组，如菜品配方明细
   *    obsidian_dish_ingredients_map_v1 = Record<dishId, Ingredient[]>），
   *    恢复时定位 ownerId 对应数组按 idField 查重后插回。
   */
  container: 'array' | 'map' | 'nested-array';
  /** nested-array 形态下的宿主 ID（如 dishId） */
  ownerId?: string;
  idField: string;
  deletedAtMs: number;
  deletedAt: string;
  deletedBy: string;
}

let cached: RecycleBinEntry[] | null = null;

const rid = () => 'bin_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function load(): RecycleBinEntry[] {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(RECYCLE_BIN_STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as RecycleBinEntry[]) : [];
    // 30 天保留期到期自动清除
    const cutoff = Date.now() - RECYCLE_BIN_RETENTION_DAYS * 86400000;
    cached = list.filter((e) => e && e.deletedAtMs >= cutoff);
  } catch {
    cached = [];
  }
  return cached!;
}

function persist(list: RecycleBinEntry[]): void {
  cached = list;
  safeSetStorage(RECYCLE_BIN_STORAGE_KEY, list);
  try {
    window.dispatchEvent(new CustomEvent(RECYCLE_BIN_EVENT));
  } catch {
    // ignore
  }
  try {
    // 秒同步：L5 总线广播（云通道由 transport outbox 即时出箱）
    syncEngine.broadcast('RECYCLE_BIN_CHANGED', { count: list.length, at: Date.now() });
  } catch {
    // ignore
  }
}

export function getRecycleBinEntries(): RecycleBinEntry[] {
  return [...load()].sort((a, b) => b.deletedAtMs - a.deletedAtMs);
}

export function getRecycleBinCount(): number {
  return load().length;
}

export function subscribeRecycleBin(callback: () => void): () => void {
  window.addEventListener(RECYCLE_BIN_EVENT, callback);
  return () => window.removeEventListener(RECYCLE_BIN_EVENT, callback);
}

export interface SoftDeleteInput {
  type: string;
  typeLabel: string;
  refId: string;
  label: string;
  snapshot: unknown;
  storageKey: string;
  container?: 'array' | 'map' | 'nested-array';
  /** nested-array 形态下的宿主 ID（如 dishId） */
  ownerId?: string;
  idField?: string;
  deletedBy?: string;
}

/** 删除统一入口：模块在真正移除数据前调用，携带完整快照与源键信息 */
export function softDeleteToRecycleBin(input: SoftDeleteInput): RecycleBinEntry {
  const entry: RecycleBinEntry = {
    ...input,
    container: input.container ?? 'array',
    idField: input.idField ?? 'id',
    deletedBy: input.deletedBy ?? '-',
    binId: rid(),
    deletedAtMs: Date.now(),
    deletedAt: new Date().toISOString()
  };
  const list = load();
  list.unshift(entry);
  if (list.length > RECYCLE_BIN_CAP) list.length = RECYCLE_BIN_CAP;
  persist(list);
  return entry;
}

/** 恢复：写回源键 → 派发同键 storage 事件（同文档监听器立即刷新）→ 移出回收站 */
export function restoreFromRecycleBin(binId: string): { ok: boolean; message: string } {
  const list = load();
  const entry = list.find((e) => e.binId === binId);
  if (!entry) return { ok: false, message: '条目不存在或已过期' };
  try {
    if (entry.container === 'map') {
      const obj = safeGetStorage<Record<string, unknown>>(entry.storageKey, {});
      if (obj[entry.refId]) return { ok: false, message: '源配置已存在同名数据，恢复中止（避免覆盖）' };
      obj[entry.refId] = entry.snapshot;
      safeSetStorage(entry.storageKey, obj);
    } else if (entry.container === 'nested-array') {
      if (!entry.ownerId) return { ok: false, message: '恢复失败：条目缺少宿主 ID（ownerId），无法定位源数据' };
      const map = safeGetStorage<Record<string, unknown[]>>(entry.storageKey, {});
      const list = Array.isArray(map[entry.ownerId]) ? map[entry.ownerId] : [];
      const exists = list.some((x) => x && x[entry.idField] === entry.refId);
      if (exists) return { ok: false, message: '源配方已存在同 ID 数据，恢复中止（避免重复）' };
      map[entry.ownerId] = [entry.snapshot, ...list];
      safeSetStorage(entry.storageKey, map);
    } else {
      const arr = safeGetStorage<Record<string, unknown>[]>(entry.storageKey, []);
      const exists = arr.some((x) => x && x[entry.idField] === entry.refId);
      if (exists) return { ok: false, message: '源列表已存在同 ID 数据，恢复中止（避免重复）' };
      safeSetStorage(entry.storageKey, [entry.snapshot, ...arr]);
    }
    // 同文档 storage 通知：手动构造 StorageEvent（模块既有跨页监听无需任何改动即生效）
    try {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: entry.storageKey,
          newValue: localStorage.getItem(entry.storageKey) || '',
          storageArea: window.localStorage,
          bubbles: true
        })
      );
    } catch {
      // ignore
    }
    persist(list.filter((e) => e.binId !== binId));
    return { ok: true, message: `【${entry.label}】已恢复到原模块` };
  } catch (err) {
    return { ok: false, message: '恢复失败：' + String(err) };
  }
}

/** 彻底删除：需要品牌总部 (HQ) 二次权限 */
export function purgeFromRecycleBin(
  binId: string,
  opts: { isHqUser: boolean }
): { ok: boolean; message: string } {
  if (!opts.isHqUser) return { ok: false, message: '彻底删除需要品牌总部 (HQ) 权限二次确认' };
  const list = load().filter((e) => e.binId !== binId);
  persist(list);
  return { ok: true, message: '已彻底删除（不可恢复）' };
}
