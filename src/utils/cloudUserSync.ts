/**
 * 权威云端用户实时拉取与状态同步引擎 (Cloud User Sync Engine)
 *
 * 核心目标:
 * 1. 用户数据以腾讯云开发 (CloudBase) `obsidian_truck_users` 集合为唯一权威源 (Single Source of Truth)
 * 2. 淘汰本地假数据持久化与跨版本无感继承脏档案的旧机制
 * 3. 支持实时订阅 (Realtime Watcher): 云端充值、扣款、升级、领券变动毫秒级推送客户端
 * 4. 账号退出时提供彻底的无残留销毁机制
 */

import { UserProfile } from '../types/user';
import { getCloudbaseApp, ensureCloudbaseAuth, TCB_COLLECTIONS, TCB_FUNCTION_NAMES, callCloudFunction } from './cloudbase';
import { revokeAllEphemeralUrls } from './cloudFileStorage';

export interface CloudUserSyncState {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  source: 'cloud_live' | 'cloud_function' | 'unauthenticated';
}

/**
 * 从云端实时拉取权威用户资料 (优先云数据库直连，其次云函数降级)
 *
 * @param uid 用户唯一标识
 */
export async function fetchLiveUserProfileFromCloud(uid: string): Promise<{
  success: boolean;
  profile: UserProfile | null;
  source: 'cloud_live' | 'cloud_function' | 'not_found';
  error?: string;
}> {
  if (!uid || uid === 'guest') {
    return { success: false, profile: null, source: 'not_found' };
  }

  try {
    const { db: tcbDb } = getCloudbaseApp();

    // 1. 优先直查 CloudBase 数据库集合
    if (tcbDb) {
      const res = await tcbDb.collection(TCB_COLLECTIONS.USERS).where({ uid }).get();
      if (res && res.data && res.data.length > 0) {
        const liveProfile = res.data[0] as UserProfile;
        console.log(`[CloudUserSync] 🌐 成功从云数据库实时拉取到最新用户档案 (${uid}):`, liveProfile.nickname);
        return {
          success: true,
          profile: liveProfile,
          source: 'cloud_live'
        };
      }
    }

    // 2. 其次通过云函数拉取
    const cfRes = await callCloudFunction<any>(TCB_FUNCTION_NAMES.USER_PROFILE, {
      action: 'get_profile',
      uid
    });

    if (cfRes.success && cfRes.result) {
      const liveProfile = cfRes.result.data || cfRes.result.user || cfRes.result;
      if (liveProfile && liveProfile.uid) {
        console.log(`[CloudUserSync] ⚡ 通过云函数实时拉取到最新用户档案 (${uid}):`, liveProfile.nickname);
        return {
          success: true,
          profile: liveProfile as UserProfile,
          source: 'cloud_function'
        };
      }
    }
  } catch (err: any) {
    console.warn(`[CloudUserSync] 从云端拉取用户 [${uid}] 异常:`, err?.message || err);
  }

  return { success: false, profile: null, source: 'not_found' };
}

/**
 * 实时订阅云端用户状态 (Realtime Watcher)
 * 监听积分变动、会员卡升级、地址变动等，云端一旦更新，自动回调推送
 */
export function subscribeLiveUserProfile(
  uid: string,
  onUpdate: (profile: UserProfile) => void
): () => void {
  if (!uid || uid === 'guest' || typeof window === 'undefined') {
    return () => {};
  }

  let watcherInstance: any = null;
  let isClosed = false;

  (async () => {
    try {
      const { auth: tcbAuth, db: tcbDb } = getCloudbaseApp();
      if (!tcbDb || !tcbAuth || isClosed) return;

      const authRes = await ensureCloudbaseAuth();
      if (!authRes?.success || !authRes?.userId || isClosed) {
        return;
      }

      if (tcbDb && typeof tcbDb.collection === 'function') {
        watcherInstance = tcbDb
          .collection(TCB_COLLECTIONS.USERS)
          .where({ uid })
          .watch({
            onChange: (snapshot: any) => {
              if (isClosed) return;
              if (snapshot && snapshot.docs && snapshot.docs.length > 0) {
                const latestDoc = snapshot.docs[0] as UserProfile;
                console.log(`[CloudUserSync] 🔔 监听到云端用户档案变动推送 (${uid}):`, latestDoc);
                onUpdate(latestDoc);
              }
            },
            onError: (err: any) => {
              if (isClosed) return;
              console.warn('[CloudUserSync] 用户资料实时通道休眠/暂无推送权限:', err?.message || err);
            }
          });
      }
    } catch (err: any) {
      if (!isClosed) {
        console.warn('[CloudUserSync] 初始化用户实时 Watcher 失败:', err?.message || err);
      }
    }
  })();

  return () => {
    isClosed = true;
    if (watcherInstance && typeof watcherInstance.close === 'function') {
      try {
        watcherInstance.close();
      } catch {}
    }
  };
}

/**
 * 保存/更新用户资料至权威云端
 */
export async function saveLiveUserProfileToCloud(profile: UserProfile): Promise<boolean> {
  if (!profile || !profile.uid) return false;

  try {
    const { db: tcbDb } = getCloudbaseApp();
    if (tcbDb) {
      const sanitized = {
        ...profile,
        updatedAt: new Date().toISOString()
      };

      const existing = await tcbDb.collection(TCB_COLLECTIONS.USERS).where({ uid: profile.uid }).get();
      if (existing.data && existing.data.length > 0) {
        await tcbDb.collection(TCB_COLLECTIONS.USERS).doc(existing.data[0]._id).update(sanitized);
      } else {
        await tcbDb.collection(TCB_COLLECTIONS.USERS).add(sanitized);
      }
      console.log(`[CloudUserSync] 💾 已将最新用户资料同步写入云端数据库 (${profile.uid})`);
      return true;
    }
  } catch (err: any) {
    console.warn('[CloudUserSync] 云端用户资料写入失败:', err?.message || err);
  }
  return false;
}

/**
 * 用户退出登录与身份销毁清理 (零磁盘残留)
 */
export async function purgeUserSessionAndLogout(): Promise<void> {
  console.log('[CloudUserSync] 🚪 执行用户安全退出与临时资源清理...');

  // 1. 释放所有临时内存 ObjectURL 文件
  revokeAllEphemeralUrls();

  // 2. 清除用户关联的存储项
  const keys = [
    'obsidian_user_profile',
    'obsidian_device_auth',
    'obsidian_user_orders'
  ];

  for (const k of keys) {
    try {
      localStorage.removeItem(k);
    } catch {}
  }

  try {
    sessionStorage.clear();
  } catch {}

  // 3. 尝试注销 CloudBase 认证
  try {
    const { auth: tcbAuth } = getCloudbaseApp();
    if (tcbAuth && typeof tcbAuth.signOut === 'function') {
      await tcbAuth.signOut().catch(() => {});
    }
  } catch {}

  console.log('[CloudUserSync] ✅ 用户会话已完全销毁，客户端已回归纯净云端新会话状态.');
}
