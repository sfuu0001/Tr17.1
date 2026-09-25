/**
 * 版本感知与自愈清理网关 (Version Purge Gateway)
 *
 * 核心目标:
 * 1. 每次应用构建与更新发布后，客户端自动比对构建指纹 (__APP_BUILD_VERSION__)
 * 2. 发现版本更新时，毫秒级清空旧版本遗留的本地脏数据、用户档案、Base64文件与保险箱缓存
 * 3. 驱动全端数据 100% 切换为从腾讯云开发 (CloudBase/COS) 实时拉取
 * 4. 彻底杜绝版本升级后遗留旧账号、旧订单、旧菜单与本地堆积文件的缺陷
 */

export const ACTIVE_BUILD_VERSION: string =
  typeof __APP_BUILD_VERSION__ !== 'undefined' ? __APP_BUILD_VERSION__ : 'v2.9.0-dev';

export const ACTIVE_BUILD_TIMESTAMP: string =
  typeof __APP_BUILD_TIMESTAMP__ !== 'undefined' ? __APP_BUILD_TIMESTAMP__ : new Date().toISOString();

export const STORAGE_VERSION_KEY = 'URBAN_RADAR_ACTIVE_BUILD_VERSION';
export const STORAGE_PURGE_AUDIT_KEY = 'URBAN_RADAR_VERSION_PURGE_AUDIT';

export interface VersionPurgeAudit {
  oldVersion: string | null;
  newVersion: string;
  purgedAt: string;
  purgedStorageKeysCount: number;
  clearedIndexedDB: boolean;
  cloudSyncForced: boolean;
}

/**
 * 需在版本更新时强制清空的 LocalStorage 业务/用户/文件键名前缀清单
 */
const SENSITIVE_STORAGE_PATTERNS = [
  'obsidian_user_profile',
  'obsidian_device_auth',
  'obsidian_cloud_device_registry',
  'obsidian_hardware_hash',
  'obsidian_merchant_user_data',
  'obsidian_truck_orders',
  'obsidian_order_chats',
  'obsidian_queue_tickets',
  'obsidian_quick_call_history',
  'obsidian_table_sessions',
  'obsidian_table_link_requests',
  'obsidian_cart_backup',
  'obsidian_image_library',
  'obsidian_cached_images',
  'obsidian_cf_logs',
  'obsidian_file_',
  'obsidian_upload_',
  'obsidian_avatar_',
  'obsidian_cached_avatar_',
  'obsidian_receipt_',
  'obsidian_draft_',
  'blob_cache_'
];

/**
 * 需严格保留的基础只读/UI配置键与商户租户核心策略（免打扰项）
 */
const WHITELIST_STORAGE_KEYS = new Set([
  'obsidian_theme_preference',
  'obsidian_sound_muted',
  'obsidian_kds_auto_voice',
  'obsidian_truck_expand_config',
  'obsidian_active_truck_id',
  'obsidian_sandbox_context_v1',
  'obsidian_truck_info',
  'obsidian_truck_locations',
  'obsidian_category_brand_configs',
  'obsidian_workspace_preferences',
  'obsidian_workspace_preferences_backup',
  'obsidian_merchant_sidebar_collapsed',
  'obsidian_merchant_active_tab',
  'obsidian_merchant_marketing_tab'
]);

/**
 * 清除所有关联 Cookie
 */
function purgeRelatedCookies(): void {
  if (typeof document === 'undefined') return;
  const cookieNames = [
    'obsidian_user_profile',
    'obsidian_device_auth',
    'obsidian_hardware_hash',
    'obsidian_session_token'
  ];
  for (const name of cookieNames) {
    try {
      document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
    } catch {}
  }
}

/**
 * 清空持久化 IndexedDB 中的旧身份保险箱与临时文件缓存
 */
async function purgeIndexedDbVaults(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) return false;

  const targetDatabases = [
    'obsidian_identity_vault',
    'obsidian_file_vault',
    'obsidian_cache_store'
  ];

  let anyCleared = false;
  for (const dbName of targetDatabases) {
    try {
      await new Promise<void>((resolve) => {
        const req = window.indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => {
          anyCleared = true;
          resolve();
        };
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    } catch {
      // ignore deletion errors
    }
  }
  return anyCleared;
}

/**
 * 清理 LocalStorage 中所有敏感用户数据与文件残留
 */
function purgeLocalStorageUserData(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;

  let purgedCount = 0;
  const keysToRemove: string[] = [];

  try {
    const total = localStorage.length;
    for (let i = 0; i < total; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 命中白名单则保留
      if (WHITELIST_STORAGE_KEYS.has(key)) continue;

      // 租户策略、沙箱隔离配置、餐车设置与工作台显示偏好永久保留，防误清除
      if (key.startsWith('obsidian:t_') || key.startsWith('obsidian_truck_expand_') || key.startsWith('obsidian_workspace_')) continue;

      // 命中版本 key 本身不删除（稍后更新）
      if (key === STORAGE_VERSION_KEY || key === STORAGE_PURGE_AUDIT_KEY) continue;

      // 检查敏感模式
      const matchesSensitive = SENSITIVE_STORAGE_PATTERNS.some((pattern) => key.startsWith(pattern) || key.includes(pattern));

      // 检查超大 Base64 数据字符串 (任何 > 50KB 疑似内联文件的 key 也强制移除)
      let isOversizedData = false;
      try {
        const val = localStorage.getItem(key);
        if (val && val.length > 50000 && (val.startsWith('data:') || val.includes('base64'))) {
          isOversizedData = true;
        }
      } catch {}

      if (matchesSensitive || isOversizedData) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
      purgedCount++;
    }
  } catch (err) {
    console.warn('[VersionPurge] LocalStorage purge error:', err);
  }

  return purgedCount;
}

/**
 * 核心生命周期入口：在应用最早阶段运行版本探测与清理
 *
 * 1. 比对当前构建指纹 ACTIVE_BUILD_VERSION 与本地记录
 * 2. 若发现版本更新（或首次使用该机制），清空残留的旧用户文件与数据
 * 3. 记录版本审计并触发全局事件通知云端重新同步
 */
export async function checkAndExecuteVersionPurge(): Promise<VersionPurgeAudit | null> {
  if (typeof window === 'undefined') return null;

  let recordedVersion: string | null = null;
  try {
    recordedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
  } catch {}

  const isVersionMismatch = recordedVersion !== ACTIVE_BUILD_VERSION;

  if (!isVersionMismatch) {
    // 版本完全一致，无需清空
    return null;
  }

  console.info(
    `[VersionPurgeGateway] 🚀 检测到新版本发布! 旧版=[${recordedVersion || 'None'}] -> 新版=[${ACTIVE_BUILD_VERSION}]. 启动全量脏数据与文件清理...`
  );

  // 1. 清理 LocalStorage 用户数据与大文件
  const purgedCount = purgeLocalStorageUserData();

  // 2. 清理 SessionStorage
  try {
    sessionStorage.clear();
  } catch {}

  // 3. 清除相关长效 Cookie
  purgeRelatedCookies();

  // 4. 清空 IndexedDB 保险箱
  const idbCleared = await purgeIndexedDbVaults();

  // 5. 更新最新版本戳
  try {
    localStorage.setItem(STORAGE_VERSION_KEY, ACTIVE_BUILD_VERSION);
  } catch {}

  const audit: VersionPurgeAudit = {
    oldVersion: recordedVersion,
    newVersion: ACTIVE_BUILD_VERSION,
    purgedAt: new Date().toISOString(),
    purgedStorageKeysCount: purgedCount,
    clearedIndexedDB: idbCleared,
    cloudSyncForced: true
  };

  try {
    localStorage.setItem(STORAGE_PURGE_AUDIT_KEY, JSON.stringify(audit));
  } catch {}

  console.info(
    `[VersionPurgeGateway] ✅ 清理完毕! 共清理 ${purgedCount} 个本地用户数据项, IDB清除=${idbCleared}. 数据源已全面重定向至云端实时拉取.`
  );

  // 广播全局清理完成事件，提示 UI 层从云端全新拉取
  try {
    window.dispatchEvent(
      new CustomEvent('urban-radar:version-purged', {
        detail: audit
      })
    );
  } catch {}

  return audit;
}

/**
 * 手动强制一键全量清空本地缓存并从云端刷新拉取
 * 供用户、店长或开发者在个人中心/设置面板手动触发
 */
export async function manualForceCloudPurgeAndReload(): Promise<void> {
  if (typeof window === 'undefined') return;

  console.log('[VersionPurgeGateway] 用户手动触发一键云端强制刷新与本地清空...');

  // 1. 清空全部 LocalStorage (保留白名单系统偏好)
  purgeLocalStorageUserData();

  // 2. 清理 SessionStorage 与 Cookie
  try { sessionStorage.clear(); } catch {}
  purgeRelatedCookies();

  // 3. 清空 IndexedDB
  await purgeIndexedDbVaults();

  // 4. 写入最新版本号
  try {
    localStorage.setItem(STORAGE_VERSION_KEY, ACTIVE_BUILD_VERSION);
  } catch {}

  // 5. 重新加载页面，纯净接入云端
  window.location.reload();
}
