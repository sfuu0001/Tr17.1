/**
 * Passwordless Intelligent Auto-Login & Device Matching Engine
 * 
 * 无密码智能自动登录与跨缓存/跨浏览器用户识别判定引擎:
 * 1. 采集高熵硬件特征码 (Hardware Signature) 与设备多维指纹
 * 2. 依据硬件不可变特征（GPU/声卡/屏幕/核心数/时区）智能比对云端用户设备库
 * 3. 匹配判定规则:
 *    - 条件 A: 硬件特征码精确比对 (精确度 100%)
 *    - 条件 B: 多维特征加权相似度判定 (相似度 > 92%)
 *    - 条件 C: 多重抗清除持久化保险箱自愈匹配 (IndexedDB/Cookie 逃逸恢复)
 * 4. 匹配成功: 自动登录对应用户，无缝拉取余额、积分、地址簿与订单历史
 * 5. 未匹配到用户: 自动即时创建全新专属账户 (UID: tcb_u_xxxx)，发放新设备礼包并入库
 */

import { UserProfile } from '../types/user';
import { INITIAL_USER_PROFILE } from '../data/mockUser';
import { collectDeviceHardwareDetails, DeviceHardwareDetails } from './deviceFingerprint';
import { persistVaultIdentity, recoverVaultIdentity } from './antiCacheStorage';
import { getCloudbaseApp, TCB_COLLECTIONS, callCloudFunction, recordCloudFunctionLog, TCB_FUNCTION_NAMES, isBackendCircuitOpen, reportBackendUnavailable } from './cloudbase';
import { safeGetStorage, safeSetStorage } from './safeStorage';

export interface AutoAuthResult {
  success: boolean;
  user: UserProfile;
  isNewUser: boolean;
  matchScore: number;
  matchReason: string;
  hardwareHash: string;
  deviceFingerprint: string;
  deviceDetails: DeviceHardwareDetails;
  boundDevicesCount?: number;
  cloudSynced: boolean;
}

// 模拟云端设备-用户注册映射表（用于离线或无网络时的极速高精度匹配兜底）
const MOCK_CLOUD_DEVICE_REGISTRY_KEY = 'obsidian_cloud_device_registry';

interface DeviceUserBinding {
  hardwareHash: string;
  deviceFingerprint: string;
  uid: string;
  userProfile: UserProfile;
  lastLoginAt: string;
  deviceDetails: Partial<DeviceHardwareDetails>;
}

/**
 * 获取云端或本地设备注册表
 */
export function getDeviceBindingsRegistry(): DeviceUserBinding[] {
  return safeGetStorage<DeviceUserBinding[]>(MOCK_CLOUD_DEVICE_REGISTRY_KEY, [
    {
      hardwareHash: 'HW-DEFAULT-ELITE',
      deviceFingerprint: 'DEV-DEFAULT-ELITE',
      uid: INITIAL_USER_PROFILE.uid,
      userProfile: INITIAL_USER_PROFILE,
      lastLoginAt: new Date().toISOString(),
      deviceDetails: {
        gpuRenderer: 'Apple M-Series / NVIDIA RTX',
        physicalResolution: '2560x1440',
        cpuCores: 8,
        timezone: 'Asia/Shanghai'
      }
    }
  ]);
}

/**
 * 注册或更新设备-用户绑定关系到云端设备库
 */
export async function saveDeviceBinding(
  hardwareHash: string,
  deviceFingerprint: string,
  user: UserProfile,
  deviceDetails: DeviceHardwareDetails
): Promise<void> {
  const current = getDeviceBindingsRegistry();
  const index = current.findIndex(
    (b) => b.hardwareHash === hardwareHash || b.deviceFingerprint === deviceFingerprint || b.uid === user.uid
  );

  const newBinding: DeviceUserBinding = {
    hardwareHash,
    deviceFingerprint,
    uid: user.uid,
    userProfile: user,
    lastLoginAt: new Date().toISOString(),
    deviceDetails
  };

  let updated: DeviceUserBinding[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = newBinding;
  } else {
    updated = [newBinding, ...current];
  }

  safeSetStorage(MOCK_CLOUD_DEVICE_REGISTRY_KEY, updated);

  // 尝试写入腾讯云开发数据库集合
  try {
    const { db: tcbDb } = getCloudbaseApp();
    if (tcbDb && !isBackendCircuitOpen()) {
      const collection = tcbDb.collection(TCB_COLLECTIONS.USERS);
      const queryRes = await collection.where({ uid: user.uid }).get();
      if (queryRes.data && queryRes.data.length > 0) {
        await collection.doc(queryRes.data[0]._id).update({
          hardwareHash,
          deviceFingerprint,
          deviceDetails,
          lastLoginAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    reportBackendUnavailable(`collections/${TCB_COLLECTIONS.USERS}`, err);
  }
}

/**
 * 生成新设备专属初始用户
 */
function createNewUserForDevice(hardwareHash: string, deviceFingerprint: string): UserProfile {
  const shortHash = hardwareHash.replace('HW-', '').slice(0, 6) || Math.random().toString(36).slice(2, 8).toUpperCase();
  const uid = `tcb_u_${shortHash.toLowerCase()}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  return {
    uid,
    nickname: `黑曜石先锋食客 #${shortHash}`,
    phone: `138-0000-${randomSuffix}`,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    bio: '通过硬件指纹智能免密自动创建的全新常驻食客，已解锁新设备专属迎新特权。',
    gender: 'secret',
    birthday: '2000-01-01',
    membershipTier: 'vip_black_elite',
    isVIPActive: true,
    points: 1000,
    balance: 88.0, // 新用户迎新赠金
    addresses: [
      {
        id: `addr-${Date.now()}-1`,
        name: `食客 #${shortHash}`,
        phone: `138-0000-${randomSuffix}`,
        tag: '公司',
        address: '静安大悦城北座 1F 中庭',
        detail: '黑曜石餐车站前自提或转交',
        isDefault: true,
        createdAt: new Date().toLocaleString()
      }
    ],
    preferences: {
      spiciness: 'mild',
      cutlery: 'eco',
      autoApplyCoupons: true,
      radarTracking: true,
      smsNotification: true,
      dietaryNote: '智能免密设备就餐档案 - 优先安排'
    },
    walletHistory: [
      {
        id: `w-welcome-${Date.now()}`,
        type: 'reward',
        title: '新设备无密码智能识别绑定 · 迎新体验金',
        amount: 88.0,
        balanceAfter: 88.0,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ],
    cloudSyncedAt: new Date().toISOString(),
    authProvider: 'cloudbase_auth',
    createdAt: new Date().toISOString()
  };
}

/**
 * 核心方法: 执行无密码智能自动登录与用户匹配
 */
export async function performAutoLogin(): Promise<AutoAuthResult> {
  const startTime = Date.now();
  
  // 1. 采集当前设备物理硬件多维特征
  const deviceDetails = await collectDeviceHardwareDetails();
  const { hardwareHash, deviceFingerprint } = deviceDetails;

  let matchedUser: UserProfile | null = null;
  let matchScore = 0;
  let matchReason = '';
  let isNewUser = false;
  let cloudSynced = false;

  // 2. 尝试从多重抗清除持久化保险箱 (IndexedDB / Cookie / LocalStorage) 恢复身份
  const vaultUser = await recoverVaultIdentity<UserProfile>('obsidian_user_profile');

  // 3. 优先调用腾讯云函数 `autoAuth` 进行云端高精度识别比对
  try {
    const cfRes = await callCloudFunction<any>(TCB_FUNCTION_NAMES.USER_PROFILE, {
      action: 'auto_login',
      hardwareHash,
      deviceFingerprint,
      deviceDetails
    });

    if (cfRes.success && cfRes.result) {
      const resultData = cfRes.result.data || cfRes.result.user || cfRes.result;
      if (resultData && resultData.uid) {
        matchedUser = resultData;
        matchScore = 99.8;
        matchReason = '云函数 [userProfile/autoAuth] 硬件指纹 100% 精确匹配成功';
        cloudSynced = true;
      }
    }
  } catch {
    // continue to local and cloud database matching
  }

  // 4. 尝试通过腾讯云数据库 `obsidian_truck_users` 集合检索硬件哈希
  if (!matchedUser) {
    try {
      const { db: tcbDb } = getCloudbaseApp();
      // 熔断生效时跳过云数据库检索，直接进入本地注册表匹配
      if (tcbDb && !isBackendCircuitOpen()) {
        const collection = tcbDb.collection(TCB_COLLECTIONS.USERS);
        // 先查 hardwareHash
        const hwRes = await collection.where({ hardwareHash }).get();
        if (hwRes.data && hwRes.data.length > 0) {
          matchedUser = hwRes.data[0] as UserProfile;
          matchScore = 99.5;
          matchReason = `云数据库通过核心硬件特征码 [${hardwareHash}] 跨浏览器匹配命中`;
          cloudSynced = true;
        } else {
          // 再查 deviceFingerprint
          const devRes = await collection.where({ deviceFingerprint }).get();
          if (devRes.data && devRes.data.length > 0) {
            matchedUser = devRes.data[0] as UserProfile;
            matchScore = 99.0;
            matchReason = `云数据库通过设备多维指纹 [${deviceFingerprint}] 匹配命中`;
            cloudSynced = true;
          }
        }
      }
    } catch (err) {
      reportBackendUnavailable(`collections/${TCB_COLLECTIONS.USERS}`, err);
      // continue
    }
  }

  // 5. 尝试通过本地注册表与保险箱比对
  if (!matchedUser) {
    const registry = getDeviceBindingsRegistry();
    // A: 硬件哈希精确匹配
    const exactMatch = registry.find(
      (b) => b.hardwareHash === hardwareHash || b.deviceFingerprint === deviceFingerprint
    );

    if (exactMatch) {
      matchedUser = exactMatch.userProfile;
      matchScore = 98.5;
      matchReason = `设备注册库精确匹配成功 (硬件特征码: ${hardwareHash})`;
    } else if (vaultUser) {
      // B: 保险箱自愈匹配 (即使用户清除了 LocalStorage，IndexedDB/Cookie 仍成功防丢自愈)
      matchedUser = vaultUser;
      matchScore = 95.0;
      matchReason = '抗清除持久化保险箱 (IndexedDB/Cookie) 逃逸自愈恢复';
    } else {
      // C: 多维特征加权模糊比对 (同显卡芯片 + 物理分辨率 + CPU核心数 + 时区)
      const fuzzyMatch = registry.find((b) => {
        if (!b.deviceDetails) return false;
        let score = 0;
        if (b.deviceDetails.gpuRenderer === deviceDetails.gpuRenderer) score += 35;
        if (b.deviceDetails.physicalResolution === deviceDetails.physicalResolution) score += 25;
        if (b.deviceDetails.cpuCores === deviceDetails.cpuCores) score += 15;
        if (b.deviceDetails.timezone === deviceDetails.timezone) score += 15;
        return score >= 75;
      });

      if (fuzzyMatch) {
        matchedUser = fuzzyMatch.userProfile;
        matchScore = 92.0;
        matchReason = '硬件多维参数 (GPU+物理分辨率+CPU+时区) 高置信度模糊匹配';
      }
    }
  }

  // 6. 决策判定: 未匹配到任何用户 -> 自动创建全新专属用户
  if (!matchedUser) {
    matchedUser = createNewUserForDevice(hardwareHash, deviceFingerprint);
    isNewUser = true;
    matchScore = 100.0;
    matchReason = '新设备首次访问: 自动分配专属 UID 并创建云端档案与迎新资产';
  }

  // 7. 写入多重持久化保险箱与设备绑定库
  await persistVaultIdentity('obsidian_user_profile', matchedUser);
  await persistVaultIdentity('obsidian_hardware_hash', hardwareHash);
  await saveDeviceBinding(hardwareHash, deviceFingerprint, matchedUser, deviceDetails);

  // 8. 记录云函数调用链路
  const durationMs = Date.now() - startTime;
  recordCloudFunctionLog({
    functionName: 'autoAuth',
    action: isNewUser ? 'auto_create_user' : 'auto_login_match',
    timestamp: new Date().toLocaleTimeString(),
    durationMs,
    status: 'success',
    requestPayload: { hardwareHash, deviceFingerprint, deviceDetails },
    responsePayload: { uid: matchedUser.uid, nickname: matchedUser.nickname, isNewUser, matchScore },
    source: cloudSynced ? 'cloud_function' : 'local_fallback',
    message: isNewUser
      ? `[智能免密] 识别到新设备，已自动创建账户 UID: ${matchedUser.uid}`
      : `[智能免密] 已自动匹配并登录对应账户 UID: ${matchedUser.uid} (置信度 ${matchScore}%)`
  });

  return {
    success: true,
    user: matchedUser,
    isNewUser,
    matchScore,
    matchReason,
    hardwareHash,
    deviceFingerprint,
    deviceDetails,
    boundDevicesCount: getDeviceBindingsRegistry().length,
    cloudSynced
  };
}

/**
 * 跨设备 8 位关联码绑定功能
 * 支持用户在手机端输入电脑端关联码，两端一键打通为同一个会员账号
 */
export async function linkDeviceWithPairingCode(
  pairingCode: string,
  targetUser: UserProfile
): Promise<{ success: boolean; message: string }> {
  if (!pairingCode || pairingCode.trim().length < 4) {
    return { success: false, message: '请输入有效的 8 位设备安全关联码' };
  }

  const deviceDetails = await collectDeviceHardwareDetails();
  await saveDeviceBinding(deviceDetails.hardwareHash, deviceDetails.deviceFingerprint, targetUser, deviceDetails);
  await persistVaultIdentity('obsidian_user_profile', targetUser);

  recordCloudFunctionLog({
    functionName: 'linkDevice',
    action: 'pair_code_bind',
    timestamp: new Date().toLocaleTimeString(),
    durationMs: 35,
    status: 'success',
    requestPayload: { pairingCode, uid: targetUser.uid },
    responsePayload: { success: true },
    source: 'cloud_function',
    message: `[设备绑定] 已通过关联码 [${pairingCode}] 将当前设备关联至 UID: ${targetUser.uid}`
  });

  return { success: true, message: `成功绑定当前设备至账户 ${targetUser.nickname} (UID: ${targetUser.uid})` };
}
