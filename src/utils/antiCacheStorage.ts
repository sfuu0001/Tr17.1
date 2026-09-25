/**
 * Anti-Cache Clearing Multi-Tier Persistent Vault
 * 
 * 多重抗清除持久化储存引擎:
 * 1. LocalStorage 主持久层
 * 2. SessionStorage 会话层
 * 3. IndexedDB 独立离线存储数据库 (`obsidian_identity_vault`)
 * 4. Document Cookie (长效会话标记)
 * 
 * 即使用户点击「清除浏览器缓存」或清除 LocalStorage，系统仍能从 IndexedDB 或 Cookie
 * 以及云端硬件指纹匹配库中瞬间无感重构恢复！
 */

import { ACTIVE_BUILD_VERSION, STORAGE_VERSION_KEY } from './versionPurgeGateway';

const DB_NAME = 'obsidian_identity_vault';
const DB_VERSION = 1;
const STORE_NAME = 'user_vault';

interface VaultRecord {
  key: string;
  value: any;
  updatedAt: string;
}

/**
 * 打开或初始化 IndexedDB
 */
function openIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = (e: any) => {
        resolve(e.target.result);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * 写入 IndexedDB
 */
export async function writeIndexedDB(key: string, value: any): Promise<boolean> {
  try {
    const db = await openIndexedDB();
    if (!db) return false;

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const record: VaultRecord = {
        key,
        value,
        updatedAt: new Date().toISOString()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * 读取 IndexedDB
 */
export async function readIndexedDB<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openIndexedDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.value !== undefined) {
          resolve(req.result.value as T);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * 写入长效 Cookie
 */
export function writeCookie(name: string, value: string, days = 365): void {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // ignore
  }
}

/**
 * 读取 Cookie
 */
export function readCookie(name: string): string | null {
  try {
    const nameEQ = encodeURIComponent(name) + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * 删除 Cookie
 */
export function deleteCookie(name: string): void {
  try {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  } catch {
    // ignore
  }
}

/**
 * 多重冗余存储: 一次性将身份数据注入 LocalStorage, SessionStorage, IndexedDB, Cookie
 */
export async function persistVaultIdentity(key: string, data: any): Promise<void> {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);

  // 1. LocalStorage
  try {
    localStorage.setItem(key, jsonStr);
  } catch {
    // ignore
  }

  // 2. SessionStorage
  try {
    sessionStorage.setItem(key, jsonStr);
  } catch {
    // ignore
  }

  // 3. IndexedDB
  await writeIndexedDB(key, data);

  // 4. Cookie
  writeCookie(key, jsonStr);
}

/**
 * 多重容灾恢复: 当 LocalStorage 被清空时，从 IndexedDB、Cookie 或 Session 自动拉起并自愈
 */
export async function recoverVaultIdentity<T = any>(key: string): Promise<T | null> {
  // 版本保护检查：若当前未完成版本验证或正处于版本更新过渡期，不盲目从离线保险箱回填旧版本残留
  try {
    const currentVer = localStorage.getItem(STORAGE_VERSION_KEY);
    if (currentVer && currentVer !== ACTIVE_BUILD_VERSION) {
      console.info(`[AntiCache] 检测到版本跨代更新 [${currentVer} -> ${ACTIVE_BUILD_VERSION}]，跳过旧保险箱复活，交由云端权威拉取.`);
      return null;
    }
  } catch {}

  // 1. 尝试 LocalStorage
  try {
    const val = localStorage.getItem(key);
    if (val) {
      return JSON.parse(val) as T;
    }
  } catch {
    // ignore
  }

  // 2. 尝试 SessionStorage
  try {
    const val = sessionStorage.getItem(key);
    if (val) {
      const parsed = JSON.parse(val) as T;
      // 自愈修复写入 LocalStorage
      try { localStorage.setItem(key, val); } catch {}
      return parsed;
    }
  } catch {
    // ignore
  }

  // 3. 尝试 IndexedDB
  const idbVal = await readIndexedDB<T>(key);
  if (idbVal) {
    // 自愈修复写入 LocalStorage 与 Cookie
    try {
      localStorage.setItem(key, JSON.stringify(idbVal));
      writeCookie(key, JSON.stringify(idbVal));
    } catch {}
    return idbVal;
  }

  // 4. 尝试 Cookie
  const cookieVal = readCookie(key);
  if (cookieVal) {
    try {
      const parsed = JSON.parse(cookieVal) as T;
      // 自愈修复写入 LocalStorage
      try { localStorage.setItem(key, cookieVal); } catch {}
      return parsed;
    } catch {}
  }

  return null;
}

/**
 * 模拟完全清空所有浏览器缓存与本地存储 (用于真实测试跨缓存自愈与云端设备识别能力)
 */
export async function wipeAllLocalCaches(): Promise<void> {
  try {
    localStorage.clear();
    sessionStorage.clear();
    deleteCookie('obsidian_user_profile');
    deleteCookie('obsidian_device_auth');
    deleteCookie('obsidian_hardware_hash');

    // 清空 IndexedDB 存储
    const db = await openIndexedDB();
    if (db) {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
    }
  } catch (err) {
    console.warn('[AntiCache] Wipe error:', err);
  }
}
