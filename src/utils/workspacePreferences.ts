/* ============================================================================
 * workspacePreferences —— 工作台显示偏好（本地 + 云端双向同步，账号/设备级）
 * ----------------------------------------------------------------------------
 * 存储策略与防丢铁律：
 * 1. 本地双轨沙箱固化：
 *    - 主键：localStorage（obsidian_workspace_preferences）
 *    - 镜像备份：localStorage（obsidian_workspace_preferences_backup）
 *    - 隔离沙箱：SandboxStorageGuard（obsidian:workspace_preferences_v3）
 *    三道坚实防线，硬刷新绝对不丢失！
 * 2. 云端 TCB 真实持久化：
 *    - 专用集合：obsidian_workspace_preferences（无需依赖特定登录态）
 *    - 账号级镜像：obsidian_truck_users 文档中的 workspacePreferences
 *    - 每次云端读写前严格执行 ensureCloudbaseAuth() 鉴权
 * 3. LWW 时间戳防倒退自愈 (Last-Write-Wins)：
 *    - 本地比云端新时，严格拒绝被云端老旧数据冲刷覆盖，并自动反向推送到云端自愈！
 *    - 云端更新时，自动同步回写本地并广播全站！
 * ==========================================================================*/

import { safeGetStorage, safeSetStorage } from './safeStorage';
import { getCloudbaseApp, ensureCloudbaseAuth, TCB_COLLECTIONS } from './cloudbase';
import { SandboxStorageGuard } from './sandbox/SandboxManager';
import {
  DEVICE_PRESETS,
  CUSTOM_DEVICE_ID,
  clampCustomDim
} from '../constants/deviceViewport';

export type ContentWidthPref = 'compact' | 'standard' | 'wide';
export type OrdersColumnsPref = 'auto' | 2 | 3 | 4;
export type PreviewRoleId = 'merchant' | 'rider' | 'platform';
export const PREVIEW_ROLE_IDS: PreviewRoleId[] = ['merchant', 'rider', 'platform'];

/** 快捷操作按钮与悬浮标签显示模式：always (常驻图文) | icon_only (仅图标，悬停显字) */
export type ButtonDisplayMode = 'always' | 'icon_only';

export interface PreviewControl {
  /** 一键总开关：关闭时三端全部收起（端开关状态保留，重开无副作用） */
  masterEnabled: boolean;
  /** 三端独立开关 */
  ends: Record<PreviewRoleId, boolean>;
}

export interface VoicePrefsSubset {
  enabled: boolean;
  volume: number;
  rate: number;
  pitch: number;
  persona: string;
  personaVoiceMap?: Record<string, string>;
  chimeStyle: string;
  soundEffectEnabled: boolean;
  humanCadenceEnabled: boolean;
  autoPlayNewOrder: boolean;
  autoPlayUrgent: boolean;
  autoPlayCalling: boolean;
  autoPlayQueueWait: boolean;
  autoPlayRiderPool: boolean;
  autoPlayRiderAction: boolean;
}

const MARKETING_SUBTABS = new Set([
  'coupons', 'activity', 'stacking_matrix', 'payment', 'delivery_threshold', 'anti_abuse', 'qr_diagnostics'
]);

export interface WorkspacePrefs {
  contentWidth: ContentWidthPref;
  /** 内容区屏幕占比百分比 (50% ~ 100%，由进度阻力滑块控制；根据当前视口实时计算最大宽度 px，而非写死) */
  contentWidthPercent?: number;
  /** 窗口安全边距 (0px ~ 32px，默认为 0px 彻底消除窗口外层安全边距，支持阻力吸附与自定义调节) */
  windowSafeMargin: number;
  ordersColumns: OrdersColumnsPref;
  marginFloorPercent: number;
  /** 客食端预览管控（四开关） */
  previewControl: PreviewControl;
  /** 预览机型：DEVICE_PRESETS 档位 id 或 'custom' */
  previewDevice: string;
  /** 自定义分辨率（仅 previewDevice === 'custom' 时生效，280–1024 钳制） */
  previewCustom: { width: number; height: number };
  /** 预览横屏（宽高互换） */
  previewRotated: boolean;
  /** 各端预览列开合记忆（默认收起） */
  previewPanelOpen: Record<PreviewRoleId, boolean>;
  /** 语音播报配置云端镜像 */
  voice?: VoicePrefsSubset;
  /** 侧栏折叠 */
  sidebarCollapsed?: boolean;
  /** 最近停留的功能模块 */
  activeTab?: string;
  /** 营销中心子页签记忆 */
  marketingSubTab?: string;
  /** 快捷与悬浮按钮显示模式：'always'(常驻图文) | 'icon_only'(仅显示图标，悬停显字) */
  buttonDisplayMode: ButtonDisplayMode;
  updatedAt?: string;
}

export const DEFAULT_WORKSPACE_PREFS: WorkspacePrefs = {
  contentWidth: 'standard',
  contentWidthPercent: 88,
  windowSafeMargin: 0,
  ordersColumns: 'auto',
  marginFloorPercent: 50,
  previewControl: { masterEnabled: true, ends: { merchant: true, rider: true, platform: true } },
  previewDevice: 'iphone-15-pro-max',
  previewCustom: { width: 430, height: 932 },
  previewRotated: false,
  previewPanelOpen: { merchant: false, rider: false, platform: false },
  buttonDisplayMode: 'icon_only',
  updatedAt: new Date('2026-01-01T00:00:00Z').toISOString()
};

export const WIDTH_RESISTANCE_ANCHORS = [
  { percent: 60, label: '紧凑专注', desc: '分屏多窗' },
  { percent: 75, label: '适中标准', desc: '黄金比例' },
  { percent: 88, label: '沉浸宽屏', desc: '空间充裕' },
  { percent: 100, label: '全宽铺满', desc: '100% 流式' }
] as const;

/** 窗口安全边距磁吸阻力锚点 (0px 无边距 / 8px 微距 / 16px 标准 / 24px 宽松) */
export const MARGIN_RESISTANCE_ANCHORS = [
  { px: 0, label: '无安全边距', desc: '0px 极致贴边铺满' },
  { px: 8, label: '微边距', desc: '8px 精炼紧凑' },
  { px: 16, label: '标准边距', desc: '16px 舒适留白' },
  { px: 24, label: '宽松边距', desc: '24px 开阔呼吸' }
] as const;

/** 窗口边距磁吸阻力计算：若距锚点偏差在 ±1px 内，则自动吸附至锚点 */
export function applyMarginResistanceSnap(val: number, snapThreshold = 1): number {
  const clamped = Math.min(32, Math.max(0, Math.round(val)));
  for (const anchor of MARGIN_RESISTANCE_ANCHORS) {
    if (Math.abs(clamped - anchor.px) <= snapThreshold) {
      return anchor.px;
    }
  }
  return clamped;
}

/** 磁吸阻力计算：若距锚点偏差在 ±2% 内，则自动吸附至锚点 */
export function applyResistanceSnap(val: number, snapThreshold = 2): number {
  const clamped = Math.min(100, Math.max(50, Math.round(val)));
  for (const anchor of WIDTH_RESISTANCE_ANCHORS) {
    if (Math.abs(clamped - anchor.percent) <= snapThreshold) {
      return anchor.percent;
    }
  }
  return clamped;
}

const LOCAL_KEY = 'obsidian_workspace_preferences';
const LOCAL_BACKUP_KEY = 'obsidian_workspace_preferences_backup';
const SANDBOX_KEY = 'obsidian:workspace_preferences_v3';
const DEVICE_IDS = new Set<string>([...DEVICE_PRESETS.map((d) => d.id), CUSTOM_DEVICE_ID]);

/** 判断 a 是否比 b 更新 */
function isNewer(a?: string, b?: string): boolean {
  if (!a) return false;
  if (!b) return true;
  return new Date(a).getTime() >= new Date(b).getTime();
}

/**
 * 深度归一化配置（云端数据损坏 / 字段缺失均安全回落）
 */
export function normalizePrefs(raw: Partial<WorkspacePrefs>): WorkspacePrefs {
  const width = (['compact', 'standard', 'wide'] as const).includes(raw.contentWidth as any)
    ? (raw.contentWidth as ContentWidthPref)
    : DEFAULT_WORKSPACE_PREFS.contentWidth;
  const contentWidthPercent =
    typeof raw.contentWidthPercent === 'number' && !isNaN(raw.contentWidthPercent)
      ? Math.min(100, Math.max(50, Math.round(raw.contentWidthPercent)))
      : width === 'wide'
      ? 100
      : width === 'compact'
      ? 65
      : 88;
  const windowSafeMargin =
    typeof raw.windowSafeMargin === 'number' && !isNaN(raw.windowSafeMargin)
      ? Math.min(32, Math.max(0, Math.round(raw.windowSafeMargin)))
      : DEFAULT_WORKSPACE_PREFS.windowSafeMargin;
  const colsOk = raw.ordersColumns === 'auto' || [2, 3, 4].includes(raw.ordersColumns as any);
  const cols = colsOk ? (raw.ordersColumns as OrdersColumnsPref) : DEFAULT_WORKSPACE_PREFS.ordersColumns;
  const mf = typeof raw.marginFloorPercent === 'number' && !isNaN(raw.marginFloorPercent)
    ? Math.min(95, Math.max(10, Math.round(raw.marginFloorPercent)))
    : DEFAULT_WORKSPACE_PREFS.marginFloorPercent;

  const rawPc = (raw.previewControl ?? {}) as Partial<PreviewControl>;
  const rawEnds = (rawPc.ends ?? {}) as Partial<Record<PreviewRoleId, boolean>>;
  const previewControl: PreviewControl = {
    masterEnabled: typeof rawPc.masterEnabled === 'boolean' ? rawPc.masterEnabled : DEFAULT_WORKSPACE_PREFS.previewControl.masterEnabled,
    ends: {
      merchant: typeof rawEnds.merchant === 'boolean' ? rawEnds.merchant : true,
      rider: typeof rawEnds.rider === 'boolean' ? rawEnds.rider : true,
      platform: typeof rawEnds.platform === 'boolean' ? rawEnds.platform : true
    }
  };

  const previewDevice = typeof raw.previewDevice === 'string' && DEVICE_IDS.has(raw.previewDevice)
    ? raw.previewDevice
    : DEFAULT_WORKSPACE_PREFS.previewDevice;

  const rawCustom = (raw.previewCustom ?? {}) as Partial<{ width: number; height: number }>;
  const previewCustom = {
    width: clampCustomDim(typeof rawCustom.width === 'number' ? rawCustom.width : 430),
    height: clampCustomDim(typeof rawCustom.height === 'number' ? rawCustom.height : 932)
  };

  const previewRotated = raw.previewRotated === true;

  const rawOpen = (raw.previewPanelOpen ?? {}) as Partial<Record<PreviewRoleId, boolean>>;
  const previewPanelOpen: Record<PreviewRoleId, boolean> = {
    merchant: rawOpen.merchant === true,
    rider: rawOpen.rider === true,
    platform: rawOpen.platform === true
  };

  let voice: VoicePrefsSubset | undefined;
  if (raw.voice && typeof raw.voice === 'object') {
    const v = raw.voice as Partial<VoicePrefsSubset>;
    const num = (x: unknown, d: number, lo: number, hi: number) =>
      typeof x === 'number' && !isNaN(x) ? Math.min(hi, Math.max(lo, x)) : d;
    voice = {
      enabled: typeof v.enabled === 'boolean' ? v.enabled : true,
      volume: num(v.volume, 1.0, 0.1, 1.0),
      rate: num(v.rate, 1.0, 0.6, 1.5),
      pitch: num(v.pitch, 1.0, 0.6, 1.5),
      persona: typeof v.persona === 'string' ? v.persona.slice(0, 40) : 'gentle_female',
      personaVoiceMap:
        v.personaVoiceMap && typeof v.personaVoiceMap === 'object'
          ? Object.fromEntries(
              Object.entries(v.personaVoiceMap)
                .filter(([, n]) => typeof n === 'string')
                .slice(0, 10)
            )
          : undefined,
      chimeStyle: typeof v.chimeStyle === 'string' ? v.chimeStyle.slice(0, 40) : 'crystal_bell',
      soundEffectEnabled: v.soundEffectEnabled !== false,
      humanCadenceEnabled: v.humanCadenceEnabled !== false,
      autoPlayNewOrder: v.autoPlayNewOrder !== false,
      autoPlayUrgent: v.autoPlayUrgent !== false,
      autoPlayCalling: v.autoPlayCalling !== false,
      autoPlayQueueWait: v.autoPlayQueueWait !== false,
      autoPlayRiderPool: v.autoPlayRiderPool !== false,
      autoPlayRiderAction: v.autoPlayRiderAction !== false
    };
  }

  const sidebarCollapsed = raw.sidebarCollapsed === true;
  const activeTab =
    typeof raw.activeTab === 'string' && /^[a-z_]{1,40}$/.test(raw.activeTab) ? raw.activeTab : undefined;
  const marketingSubTab =
    typeof raw.marketingSubTab === 'string' && MARKETING_SUBTABS.has(raw.marketingSubTab)
      ? raw.marketingSubTab
      : undefined;

  const buttonDisplayMode: ButtonDisplayMode =
    raw.buttonDisplayMode === 'always' ? 'always' : 'icon_only';

  return {
    contentWidth: width,
    contentWidthPercent,
    windowSafeMargin,
    ordersColumns: cols,
    marginFloorPercent: mf,
    previewControl,
    previewDevice,
    previewCustom,
    previewRotated,
    previewPanelOpen,
    voice,
    sidebarCollapsed,
    activeTab,
    marketingSubTab,
    buttonDisplayMode,
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

/**
 * 本地三轨读取（主键 + 镜像备份 + 沙箱隔离槽，取最新者自愈）
 */
export function loadLocalPrefs(): WorkspacePrefs | null {
  const fromMain = safeGetStorage<Partial<WorkspacePrefs> | null>(LOCAL_KEY, null);
  const fromBackup = safeGetStorage<Partial<WorkspacePrefs> | null>(LOCAL_BACKUP_KEY, null);
  const fromSandbox = SandboxStorageGuard.get<Partial<WorkspacePrefs> | null>('global', SANDBOX_KEY, null);

  const candidates: WorkspacePrefs[] = [];
  if (fromMain && Object.keys(fromMain).length > 0) candidates.push(normalizePrefs(fromMain));
  if (fromBackup && Object.keys(fromBackup).length > 0) candidates.push(normalizePrefs(fromBackup));
  if (fromSandbox && Object.keys(fromSandbox).length > 0) candidates.push(normalizePrefs(fromSandbox));

  if (candidates.length === 0) return null;

  // 排序挑选 updatedAt 最大的一个
  candidates.sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  });

  const newest = candidates[0];

  // 自愈写回其他可能丢失或陈旧的键（静默落盘，绝不分发事件，彻底杜绝在 React 组件渲染初始化期间触发外部组件的 setState）
  if (!fromMain || !fromBackup || !fromSandbox) {
    safeSetStorage(LOCAL_KEY, newest);
    safeSetStorage(LOCAL_BACKUP_KEY, newest);
    SandboxStorageGuard.set('global', SANDBOX_KEY, newest);
    cachedSnapshot = newest;
  }

  return newest;
}

/**
 * 本地三轨即时保存（毫秒级坚实落盘，硬刷新 100% 不丢）
 */
export function saveLocalPrefs(prefs: WorkspacePrefs, options?: { silent?: boolean }) {
  const normalized = normalizePrefs(prefs);
  safeSetStorage(LOCAL_KEY, normalized);
  safeSetStorage(LOCAL_BACKUP_KEY, normalized);
  SandboxStorageGuard.set('global', SANDBOX_KEY, normalized);
  cachedSnapshot = normalized;

  if (!options?.silent && typeof window !== 'undefined') {
    // 异步调度广播，避免在 React 当前渲染调用栈中同步触发外部组件 (如 MainAppContent 中通过 useSyncExternalStore) 的 setState
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('obsidian_workspace_prefs_changed', { detail: normalized }));
    });
  }
}

/** 深合并补丁类型（嵌套字段允许部分覆盖） */
export type WorkspacePrefsPatch = Partial<Omit<WorkspacePrefs, 'previewControl' | 'previewPanelOpen' | 'previewCustom' | 'voice'>> & {
  previewControl?: { masterEnabled?: boolean; ends?: Partial<Record<PreviewRoleId, boolean>> };
  previewPanelOpen?: Partial<Record<PreviewRoleId, boolean>>;
  previewCustom?: Partial<{ width: number; height: number }>;
  voice?: Partial<VoicePrefsSubset>;
};

/**
 * 深合并补丁 → 本地三轨即时落盘 → 云端异步自愈推送 → 全局广播
 */
export function mergeLocalPrefs(patch: WorkspacePrefsPatch): {
  merged: WorkspacePrefs;
  cloudSync: Promise<boolean>;
} {
  const cur = loadLocalPrefs() ?? { ...DEFAULT_WORKSPACE_PREFS };
  const next = normalizePrefs({
    ...cur,
    ...patch,
    previewControl: {
      masterEnabled: patch.previewControl?.masterEnabled ?? cur.previewControl.masterEnabled,
      ends: { ...cur.previewControl.ends, ...(patch.previewControl?.ends ?? {}) }
    },
    previewPanelOpen: { ...cur.previewPanelOpen, ...(patch.previewPanelOpen ?? {}) },
    previewCustom: { ...cur.previewCustom, ...(patch.previewCustom ?? {}) },
    voice: patch.voice ? { ...(cur.voice ?? {}), ...patch.voice } as VoicePrefsSubset : cur.voice,
    updatedAt: new Date().toISOString()
  });

  // 1. 本地即刻落盘
  saveLocalPrefs(next);

  // 2. 异步推云端
  const cloudSync = savePrefsToCloud(next);

  return { merged: next, cloudSync };
}

// ---------------- 订阅快照（App 根层 / 预览列 / 四开关组件共用） ----------------

let cachedSnapshot: WorkspacePrefs | null = null;

export function getWorkspacePrefsSnapshot(): WorkspacePrefs {
  if (!cachedSnapshot) {
    cachedSnapshot = loadLocalPrefs() ?? { ...DEFAULT_WORKSPACE_PREFS };
  }
  return cachedSnapshot;
}

export function subscribeWorkspacePrefs(cb: (e?: CustomEvent) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    // 异步排队通知订阅者，确保脱离 React 渲染阶段
    queueMicrotask(() => {
      cb(e as CustomEvent);
    });
  };
  window.addEventListener('obsidian_workspace_prefs_changed', handler);
  return () => window.removeEventListener('obsidian_workspace_prefs_changed', handler);
}

/** 内容宽度偏好 → main 容器类 */
export function contentWidthClass(pref: ContentWidthPref): string {
  if (pref === 'compact') return 'max-w-7xl mx-auto';
  if (pref === 'wide') return 'max-w-none';
  return 'max-w-[2000px] mx-auto';
}

/** 订单列数偏好 → 网格类 */
export function ordersColumnsClass(pref: OrdersColumnsPref): string {
  if (pref === 'auto') return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';
  if (pref === 2) return 'grid-cols-1 md:grid-cols-2';
  if (pref === 3) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
  return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';
}

// ---------------- 云端双向权威同步 ----------------

interface UserDocShape {
  _id?: string;
  uid?: string;
  workspacePreferences?: Partial<WorkspacePrefs>;
  prefsUpdatedAt?: string;
}

function getSyncIdentifier(): { uid: string | null; deviceId: string; truckId: string } {
  const profile = safeGetStorage<{ uid?: string }>('obsidian_user_profile', {});
  const truckId = safeGetStorage<string>('obsidian_active_truck_id', 'T01');
  let deviceId = safeGetStorage<string>('obsidian_device_id', '');
  if (!deviceId) {
    deviceId = `dev_${Math.random().toString(36).slice(2, 10)}`;
    safeSetStorage('obsidian_device_id', deviceId);
  }
  return {
    uid: profile?.uid ?? null,
    deviceId,
    truckId: truckId || 'T01'
  };
}

/**
 * 从云端拉取偏好（具备 LWW 时间戳防倒退自愈保护）
 */
export async function fetchPrefsFromCloud(): Promise<WorkspacePrefs | null> {
  try {
    const authOk = await ensureCloudbaseAuth();
    if (!authOk) {
      console.warn('[TCB] fetchPrefsFromCloud: 云端会话未就绪，使用本地高保真三轨存储');
      return loadLocalPrefs();
    }

    const { db } = getCloudbaseApp();
    if (!db) return loadLocalPrefs();

    const { uid, truckId } = getSyncIdentifier();
    let cloudData: Partial<WorkspacePrefs> | null = null;
    let cloudUpdatedAt: string | undefined;

    // 优先 1：专有工作台偏好集合 (支持 truckId 或 uid 索引)
    try {
      const col = db.collection(TCB_COLLECTIONS.WORKSPACE_PREFS);
      const query = uid ? { uid } : { truckId };
      const res = await col.where(query).limit(1).get();
      if (res?.data?.length > 0) {
        cloudData = res.data[0].workspacePreferences || res.data[0];
        cloudUpdatedAt = res.data[0].updatedAt || res.data[0].prefsUpdatedAt;
      }
    } catch {
      // 专有集合查询失败时尝试用户集合
    }

    // 优先 2：用户文档集合
    if (!cloudData && uid) {
      try {
        const userRes = await db.collection(TCB_COLLECTIONS.USERS).where({ uid }).limit(1).get();
        const userDoc = userRes?.data?.[0] as UserDocShape | undefined;
        if (userDoc?.workspacePreferences) {
          cloudData = userDoc.workspacePreferences;
          cloudUpdatedAt = userDoc.prefsUpdatedAt;
        }
      } catch {}
    }

    const local = loadLocalPrefs();

    // 🛡️ 核心防冲掉策略 (LWW)：如果本地比云端更新，绝不覆盖本地，而是反向推送到云端自愈！
    if (local && cloudUpdatedAt && isNewer(local.updatedAt, cloudUpdatedAt)) {
      console.info('[TCB] 本地工作台偏好比云端更新，启动云端自愈推送...');
      savePrefsToCloud(local).catch(() => {});
      return local;
    }

    if (cloudData && Object.keys(cloudData).length > 0) {
      const normalizedCloud = normalizePrefs({
        ...cloudData,
        updatedAt: cloudUpdatedAt || cloudData.updatedAt || new Date().toISOString()
      });
      // 云端比本地新，回写本地三轨并广播
      saveLocalPrefs(normalizedCloud);
      return normalizedCloud;
    }

    // 若云端尚无数据，将本地数据初始化推送给云端
    if (local) {
      savePrefsToCloud(local).catch(() => {});
      return local;
    }

    return null;
  } catch (err) {
    console.warn('[TCB] fetchPrefsFromCloud 异常，平滑降级为本地:', err);
    return loadLocalPrefs();
  }
}

/**
 * 写云端（双集合落地：专属集合 + 用户文档）
 */
export async function savePrefsToCloud(prefs: WorkspacePrefs): Promise<boolean> {
  try {
    const authOk = await ensureCloudbaseAuth();
    if (!authOk) return false;

    const { db } = getCloudbaseApp();
    if (!db) return false;

    const { uid, truckId, deviceId } = getSyncIdentifier();
    const primaryKey = uid ? { uid } : { truckId };
    const payload = {
      ...primaryKey,
      deviceId,
      truckId,
      workspacePreferences: prefs,
      prefsUpdatedAt: prefs.updatedAt || new Date().toISOString(),
      updatedAt: prefs.updatedAt || new Date().toISOString()
    };

    let saved = false;

    // 1. 写入专属配置集合
    try {
      const col = db.collection(TCB_COLLECTIONS.WORKSPACE_PREFS);
      const res = await col.where(primaryKey).limit(1).get();
      if (res?.data?.length > 0) {
        await col.doc(res.data[0]._id).update(payload);
      } else {
        await col.add(payload);
      }
      saved = true;
    } catch {
      // 降级继续写用户集合
    }

    // 2. 如果存在 uid，同步写入用户档案
    if (uid) {
      try {
        const uCol = db.collection(TCB_COLLECTIONS.USERS);
        const uRes = await uCol.where({ uid }).limit(1).get();
        if (uRes?.data?.length > 0) {
          await uCol.doc(uRes.data[0]._id).update({
            workspacePreferences: prefs,
            prefsUpdatedAt: prefs.updatedAt
          });
          saved = true;
        }
      } catch {}
    }

    return saved;
  } catch (err) {
    console.warn('[TCB] savePrefsToCloud 异常:', err);
    return false;
  }
}
