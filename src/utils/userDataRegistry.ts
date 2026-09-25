/**
 * 商家端统一用户数据中心 — 数据聚合与持久化层
 *
 * 将「客户端无密码登录」(UserAuthModal / autoAuthEngine) 中产生的用户档案
 * (UserProfile 全量字段: 手机号、昵称、会员等级、积分、余额、地址簿、
 * 偏好设置、钱包流水、设备硬件指纹等) 系统移植至商家端，
 * 做成一个可检索、可编辑、可运营的统一用户数据管理后台。
 *
 * 数据来源 (首次进入时自动聚合去重):
 *  1. 客户端设备注册库 obsidian_cloud_device_registry (含各设备绑定的 userProfile)
 *  2. 当前登录用户档案 obsidian_user_profile
 *  3. INITIAL_USER_PROFILE 种子账号
 *  4. 内置演示账号 (覆盖不同会员等级, 便于后台运营演示)
 *
 * 聚合后写入商家端独立存储 obsidian_merchant_user_data,
 * 后续商家端的编辑以该存储为唯一事实来源 (与客户端互不污染)。
 */

import { UserProfile, UserBoundDevice, UserDeviceHardwareDetails } from '../types/user';
import { INITIAL_USER_PROFILE } from '../data/mockUser';

const MERCHANT_USER_DATA_KEY = 'obsidian_merchant_user_data';
const CLIENT_DEVICE_REGISTRY_KEY = 'obsidian_cloud_device_registry';
const CLIENT_CURRENT_PROFILE_KEY = 'obsidian_user_profile';

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 确保每个用户都拥有完整的硬件特征矩阵与多设备互联初始数据
 */
export function ensureUserHardwareDetails(u: UserProfile): UserProfile {
  const seed = Math.abs(u.uid.split('').reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0));
  const hwSuffix = u.uid.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '88AA';
  const hw = u.hardwareHash || `HW-CORE-${hwSuffix}`;
  const dev = u.deviceFingerprint || `DEV-FPR-${hwSuffix}`;
  const pairing = u.pairingCode || `UR-${hwSuffix}-BIND`;

  const gpuOptions = [
    { renderer: 'Apple M2 Pro (Metal 3)', vendor: 'Apple Inc.' },
    { renderer: 'NVIDIA GeForce RTX 4070 Laptop GPU', vendor: 'NVIDIA Corporation' },
    { renderer: 'Intel(R) Iris(R) Xe Graphics (TGL GT2)', vendor: 'Intel Inc.' },
    { renderer: 'Qualcomm Adreno 740', vendor: 'Qualcomm' }
  ];
  const selectedGpu = gpuOptions[seed % gpuOptions.length];

  const resolutions = ['2560x1440 (2K Retina)', '1170x2532 (OLED SuperRetina)', '2880x1800 (16-inch Display)', '3840x2160 (4K UHD)'];
  const res = resolutions[seed % resolutions.length];

  const defaultDetails: UserDeviceHardwareDetails = u.hardwareDetails || {
    hardwareHash: hw,
    deviceFingerprint: dev,
    confidenceScore: u.autoLoginScore ?? 99.8,
    gpuRenderer: selectedGpu.renderer,
    gpuVendor: selectedGpu.vendor,
    webglScore: `0x${(seed * 31 + 0x1000).toString(16).slice(-8).toUpperCase()}`,
    audioDspHash: `DSP-${(seed * 17 + 0x2000).toString(16).slice(-8).toUpperCase()}`,
    canvasHash: `CNV-${(seed * 43 + 0x3000).toString(16).slice(-8).toUpperCase()}`,
    physicalResolution: res,
    colorDepth: 24,
    pixelRatio: 2.0,
    cpuCores: seed % 2 === 0 ? 8 : 12,
    deviceMemoryGb: seed % 2 === 0 ? 16 : 8,
    maxTouchPoints: seed % 3 === 0 ? 5 : 0,
    timezone: 'Asia/Shanghai (CST +0800)',
    platform: seed % 3 === 0 ? 'iPhone / iOS 17.5' : seed % 2 === 0 ? 'MacIntel / macOS 14.5' : 'Win32 / Windows 11 Pro',
    languages: ['zh-CN', 'zh', 'en-US'],
    collectedAt: u.createdAt || nowStamp()
  };

  const defaultDevices: UserBoundDevice[] =
    u.boundDevices && u.boundDevices.length > 0
      ? u.boundDevices
      : [
          {
            id: `dev-${u.uid}-1`,
            deviceName:
              seed % 3 === 0
                ? 'iPhone 15 Pro (食客常用机)'
                : seed % 2 === 0
                ? 'MacBook Pro 14" (主力机)'
                : 'ThinkPad X1 (商务电脑)',
            hardwareHash: hw,
            deviceFingerprint: dev,
            gpuRenderer: selectedGpu.renderer,
            physicalResolution: res,
            platform: defaultDetails.platform,
            boundAt: u.createdAt || nowStamp(),
            isCurrent: true,
            status: 'trusted'
          },
          ...(seed % 2 === 0
            ? [
                {
                  id: `dev-${u.uid}-2`,
                  deviceName: 'iPad Air 5 (餐车自提备用机)',
                  hardwareHash: `HW-PAD-${hwSuffix}`,
                  deviceFingerprint: `DEV-PAD-${hwSuffix}`,
                  gpuRenderer: 'Apple M1 GPU',
                  physicalResolution: '2360x1640',
                  platform: 'iPadOS / Safari',
                  boundAt: '2026-07-10 14:20',
                  isCurrent: false,
                  status: 'trusted' as const
                }
              ]
            : [])
        ];

  return {
    ...u,
    password: u.password || (u.phone ? `Pass@${u.phone.replace(/[^0-9]/g, '').slice(-4) || '8888'}` : 'Radar#2026'),
    hardwareHash: hw,
    deviceFingerprint: dev,
    pairingCode: pairing,
    autoLoginScore: u.autoLoginScore ?? 99.8,
    crossBrowserTested: u.crossBrowserTested ?? true,
    antiWipeRecoveryTested: u.antiWipeRecoveryTested ?? true,
    hardwareDetails: defaultDetails,
    boundDevices: defaultDevices
  };
}

/**
 * 内置演示账号 — 覆盖不同会员等级与状态, 使管理后台首次进入即有可运营数据。
 */
const DEMO_USERS: UserProfile[] = [
  {
    uid: 'tcb_u_demo_silver',
    nickname: '陈先生 (银卡会员)',
    phone: '137-2233-4455',
    password: 'Pass@4455',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bio: '每周三固定光顾午餐档, 偏好轻辣。',
    gender: 'male',
    birthday: '1992-07-09',
    membershipTier: 'vip_silver',
    isVIPActive: true,
    points: 1850,
    balance: 56.0,
    addresses: [
      {
        id: 'addr-demo-silver-1',
        name: '陈先生',
        phone: '137-2233-4455',
        tag: '公司',
        address: '静安区南京西路 1788 号',
        detail: '商务楼 22F 前台',
        isDefault: true,
        createdAt: '2026-06-12 09:30'
      }
    ],
    preferences: {
      spiciness: 'mild',
      cutlery: 'needed',
      autoApplyCoupons: true,
      radarTracking: true,
      smsNotification: true,
      dietaryNote: '微辣, 不要香菜'
    },
    walletHistory: [
      {
        id: 'w-demo-silver-1',
        type: 'recharge',
        title: '银卡会员充值',
        amount: 100.0,
        balanceAfter: 56.0,
        timestamp: '2026-07-01 12:00'
      }
    ],
    cloudSyncedAt: new Date().toISOString(),
    authProvider: 'custom_phone',
    hardwareHash: 'HW-DEMO-SILVER-77',
    deviceFingerprint: 'DEV-DEMO-SILVER-77',
    autoLoginScore: 98.5,
    createdAt: '2026-06-12 09:30:00'
  },
  {
    uid: 'tcb_u_demo_std',
    nickname: '小雨 (普通食客)',
    phone: '136-7788-1122',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    bio: '偶尔路过自提, 尚未开通会员。',
    gender: 'female',
    birthday: '2001-11-22',
    membershipTier: 'standard',
    isVIPActive: false,
    points: 320,
    balance: 12.5,
    addresses: [
      {
        id: 'addr-demo-std-1',
        name: '小雨',
        phone: '136-7788-1122',
        tag: '学校',
        address: '上海大学延长校区',
        detail: '南门快递柜旁',
        isDefault: true,
        createdAt: '2026-08-02 19:10'
      }
    ],
    preferences: {
      spiciness: 'hot',
      cutlery: 'eco',
      autoApplyCoupons: false,
      radarTracking: false,
      smsNotification: true
    },
    walletHistory: [],
    cloudSyncedAt: new Date().toISOString(),
    authProvider: 'cloudbase_auth',
    hardwareHash: 'HW-DEMO-STD-21',
    deviceFingerprint: 'DEV-DEMO-STD-21',
    autoLoginScore: 95.0,
    createdAt: '2026-08-02 19:10:00'
  },
  {
    uid: 'tcb_u_demo_black',
    nickname: 'Kobe (黑金 VIP)',
    phone: '139-0011-2233',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    bio: '和牛资深品鉴官, 月均消费过万。',
    gender: 'male',
    birthday: '1988-02-14',
    membershipTier: 'vip_black_elite',
    isVIPActive: true,
    points: 12800,
    balance: 880.0,
    addresses: [
      {
        id: 'addr-demo-black-1',
        name: 'Kobe',
        phone: '139-0011-2233',
        tag: '家',
        address: '浦东新区陆家嘴环路 1000 号',
        detail: '恒生大厦 45F',
        isDefault: true,
        createdAt: '2026-03-20 10:00'
      },
      {
        id: 'addr-demo-black-2',
        name: 'Kobe (公司)',
        phone: '139-0011-2233',
        tag: '公司',
        address: '徐汇区漕溪北路 18 号',
        detail: '环球中心 30F',
        isDefault: false,
        createdAt: '2026-05-08 14:00'
      }
    ],
    preferences: {
      spiciness: 'none',
      cutlery: 'eco',
      autoApplyCoupons: true,
      radarTracking: true,
      smsNotification: true,
      dietaryNote: '全熟和牛, 免辣, 过敏: 花生'
    },
    walletHistory: [
      {
        id: 'w-demo-black-1',
        type: 'recharge',
        title: '黑金会员大额储值',
        amount: 1000.0,
        balanceAfter: 880.0,
        timestamp: '2026-08-15 11:20'
      },
      {
        id: 'w-demo-black-2',
        type: 'expense',
        title: '餐车订单支付 - UR-7741',
        amount: -120.0,
        balanceAfter: 880.0,
        timestamp: '2026-08-28 20:05',
        orderNo: 'UR-7741'
      }
    ],
    cloudSyncedAt: new Date().toISOString(),
    authProvider: 'cloudbase_auth',
    hardwareHash: 'HW-DEMO-BLACK-99',
    deviceFingerprint: 'DEV-DEMO-BLACK-99',
    autoLoginScore: 99.8,
    createdAt: '2026-03-20 10:00:00'
  }
];

/**
 * 从客户端各数据源聚合用户档案, 按 uid 去重。
 */
function aggregateFromClient(): UserProfile[] {
  const map = new Map<string, UserProfile>();
  const push = (u?: UserProfile) => {
    if (u && u.uid) map.set(u.uid, u);
  };

  push(INITIAL_USER_PROFILE);

  try {
    const regRaw = localStorage.getItem(CLIENT_DEVICE_REGISTRY_KEY);
    if (regRaw) {
      const reg = JSON.parse(regRaw) as { userProfile?: UserProfile }[];
      reg.forEach((b) => push(b.userProfile));
    }
  } catch {
    /* ignore */
  }

  try {
    const cur = localStorage.getItem(CLIENT_CURRENT_PROFILE_KEY);
    if (cur) push(JSON.parse(cur));
  } catch {
    /* ignore */
  }

  let list = Array.from(map.values());
  // 若聚合后仅默认账号, 补充演示账号使后台有运营数据
  if (list.length <= 1) {
    list = [INITIAL_USER_PROFILE, ...DEMO_USERS];
  }
  return list;
}

/**
 * 读取商家端统一用户数据 (首次自动从客户端聚合并落盘，且自动补齐高熵硬件矩阵与设备互联数据)。
 */
export function getUserDataRecords(): UserProfile[] {
  let list: UserProfile[] = [];
  try {
    const raw = localStorage.getItem(MERCHANT_USER_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
  } catch {
    /* fall through to aggregate */
  }
  if (list.length === 0) {
    list = aggregateFromClient();
  }

  // 保证每一个用户都具备与客户端免密登录系统完全一致的高熵硬件矩阵与互联设备
  const enriched = list.map(ensureUserHardwareDetails);
  try {
    localStorage.setItem(MERCHANT_USER_DATA_KEY, JSON.stringify(enriched));
  } catch {
    /* ignore */
  }
  return enriched;
}

/**
 * 全量覆盖保存商家端用户数据。
 */
export function saveUserDataRecords(users: UserProfile[]): void {
  try {
    const enriched = users.map(ensureUserHardwareDetails);
    localStorage.setItem(MERCHANT_USER_DATA_KEY, JSON.stringify(enriched));
  } catch {
    /* ignore */
  }
}

/**
 * 新增或更新单个用户 (按 uid 判重)。
 */
export function upsertUser(user: UserProfile): UserProfile[] {
  const list = getUserDataRecords();
  const enriched = ensureUserHardwareDetails(user);
  const idx = list.findIndex((u) => u.uid === enriched.uid);
  if (idx >= 0) {
    list[idx] = enriched;
  } else {
    list.unshift(enriched);
  }
  saveUserDataRecords(list);
  return list;
}

/**
 * 删除用户 (按 uid)。
 */
export function deleteUser(uid: string): UserProfile[] {
  const list = getUserDataRecords().filter((u) => u.uid !== uid);
  saveUserDataRecords(list);
  return list;
}

/**
 * 生成一个全新的用户档案 (对标客户端无密码注册逻辑)。
 */
export function createBlankUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  const ts = nowStamp();
  const uid = overrides.uid || `tcb_u_${Math.random().toString(36).slice(2, 10)}`;
  const base: UserProfile = {
    uid,
    nickname: overrides.nickname || '新注册食客',
    phone: overrides.phone || '',
    avatar: overrides.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    bio: overrides.bio || '商家后台手动创建的会员档案',
    gender: overrides.gender || 'secret',
    birthday: overrides.birthday || '2000-01-01',
    membershipTier: overrides.membershipTier || 'standard',
    isVIPActive: overrides.isVIPActive ?? false,
    points: overrides.points ?? 0,
    balance: overrides.balance ?? 0,
    addresses: overrides.addresses || [],
    preferences: overrides.preferences || {
      spiciness: 'mild',
      cutlery: 'eco',
      autoApplyCoupons: true,
      radarTracking: true,
      smsNotification: true
    },
    walletHistory: overrides.walletHistory || [],
    cloudSyncedAt: new Date().toISOString(),
    authProvider: overrides.authProvider || 'custom_phone',
    hardwareHash: overrides.hardwareHash,
    deviceFingerprint: overrides.deviceFingerprint,
    autoLoginScore: overrides.autoLoginScore ?? 99.8,
    createdAt: overrides.createdAt || ts
  };
  return ensureUserHardwareDetails(base);
}

/**
 * 为指定用户添加一台新信任设备
 */
export function addBoundDeviceToUser(
  user: UserProfile,
  device: {
    deviceName: string;
    hardwareHash: string;
    gpuRenderer?: string;
    physicalResolution?: string;
    platform?: string;
  }
): UserProfile {
  const newDevice: UserBoundDevice = {
    id: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    deviceName: device.deviceName || '新互联终端设备',
    hardwareHash: device.hardwareHash || `HW-BOUND-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    deviceFingerprint: `DEV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    gpuRenderer: device.gpuRenderer || 'WebGL Generic Core',
    physicalResolution: device.physicalResolution || '2560x1440',
    platform: device.platform || 'Cross-Platform Client',
    boundAt: nowStamp(),
    isCurrent: false,
    status: 'trusted'
  };
  const updated: UserProfile = {
    ...user,
    boundDevices: [newDevice, ...(user.boundDevices || [])]
  };
  return updated;
}

/**
 * 解绑某台设备
 */
export function removeBoundDeviceFromUser(user: UserProfile, deviceId: string): UserProfile {
  return {
    ...user,
    boundDevices: (user.boundDevices || []).filter((d) => d.id !== deviceId)
  };
}

/**
 * 切换某台设备的信任状态 (trusted / suspended)
 */
export function toggleDeviceTrustStatus(user: UserProfile, deviceId: string): UserProfile {
  return {
    ...user,
    boundDevices: (user.boundDevices || []).map((d) =>
      d.id === deviceId
        ? { ...d, status: d.status === 'trusted' ? ('suspended' as const) : ('trusted' as const) }
        : d
    )
  };
}

/**
 * 重新生成用户的 8 位跨设备关联码
 */
export function regenerateUserPairingCode(user: UserProfile): UserProfile {
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return {
    ...user,
    pairingCode: `UR-${user.uid.slice(-4).toUpperCase()}-${rnd}-BIND`
  };
}

/**
 * 模拟诊断判定
 */
export function runSimulatedUserDiagnostic(
  user: UserProfile,
  kind: 'anti_wipe' | 'cross_browser' | 'new_device'
): {
  success: boolean;
  score: number;
  reason: string;
  timestamp: string;
} {
  const ts = nowStamp();
  if (kind === 'anti_wipe') {
    return {
      success: true,
      score: user.autoLoginScore || 99.8,
      reason: `即便全清浏览器 LocalStorage/Cookies，底层抗清除保险箱利用硬件指纹 [${user.hardwareHash || 'HW-CORE'}] 精准锁定食客档案 ${user.nickname} (UID: ${user.uid})。`,
      timestamp: ts
    };
  }
  if (kind === 'cross_browser') {
    return {
      success: true,
      score: 99.5,
      reason: `跨浏览器物理硬件不变性比对通过 (Chrome ⇄ Safari / Edge)。物理声卡 DSP/GPU 核心哈希一致，成功自动同步至该账号。`,
      timestamp: ts
    };
  }
  return {
    success: true,
    score: 98.9,
    reason: `未注册新设备秒级建档规则已预热就绪：分配专属账号、写入首发设备多维指纹并自动注入迎新体验金。`,
    timestamp: ts
  };
}

/**
 * 调整用户余额/积分, 并写入一条钱包流水。
 */
export function adjustUserBalance(
  user: UserProfile,
  kind: 'balance' | 'points',
  delta: number,
  note: string
): UserProfile {
  const updated: UserProfile = { ...user };
  if (kind === 'balance') {
    const newBalance = Math.max(0, Number((user.balance + delta).toFixed(2)));
    updated.walletHistory = [
      {
        id: `w-mgr-${Date.now()}`,
        type: delta >= 0 ? 'recharge' : 'expense',
        title: note || (delta >= 0 ? '商家后台充值/调增' : '商家后台扣减'),
        amount: Number(delta.toFixed(2)),
        balanceAfter: newBalance,
        timestamp: nowStamp(),
        orderNo: 'MERCHANT-MGR'
      },
      ...user.walletHistory
    ];
    updated.balance = newBalance;
  } else {
    updated.points = Math.max(0, user.points + delta);
  }
  return updated;
}

/**
 * 直接设置用户账户资产与积分 (支持直接输入精确数值)
 */
export function setDirectUserAssets(
  user: UserProfile,
  newBalance: number,
  newPoints: number,
  note: string = '商家后台直接调整'
): UserProfile {
  const safeBal = Math.max(0, Number(newBalance.toFixed(2)));
  const safePts = Math.max(0, Math.floor(newPoints));
  const deltaBal = safeBal - user.balance;

  const history = [...user.walletHistory];
  if (Math.abs(deltaBal) > 0.001) {
    history.unshift({
      id: `w-mgr-${Date.now()}`,
      type: deltaBal > 0 ? 'recharge' : 'expense',
      title: `${note} (资产校准: ¥${safeBal})`,
      amount: Number(deltaBal.toFixed(2)),
      balanceAfter: safeBal,
      timestamp: nowStamp(),
      orderNo: 'ASSET-RECALIB'
    });
  }

  return {
    ...user,
    balance: safeBal,
    points: safePts,
    walletHistory: history
  };
}

/**
 * 处置用户违规状态: 封号 / 全指纹黑名单 / 解封
 */
export function setUserViolationAction(
  user: UserProfile,
  action: 'ban' | 'unban' | 'blacklist_hw' | 'unblacklist_hw',
  reason: string,
  operator: string = '商家管理员'
): UserProfile {
  const ts = nowStamp();
  const currentRecord = user.violationRecord || {
    status: user.status || 'normal',
    history: []
  };

  const logs = [...(currentRecord.history || [])];
  let nextStatus: 'normal' | 'banned' | 'hardware_blacklisted' = 'normal';
  let blacklistedFps: string[] = currentRecord.blacklistFingerprints || [];

  if (action === 'ban') {
    nextStatus = 'banned';
    logs.unshift({
      id: `viol-${Date.now()}`,
      action: 'ban',
      reason,
      timestamp: ts,
      operator
    });
  } else if (action === 'blacklist_hw') {
    nextStatus = 'hardware_blacklisted';
    // 收集该用户所有已知的硬件特征与关联设备硬件
    const fps = new Set<string>();
    if (user.hardwareHash) fps.add(user.hardwareHash);
    if (user.deviceFingerprint) fps.add(user.deviceFingerprint);
    if (user.hardwareDetails?.audioDspHash) fps.add(user.hardwareDetails.audioDspHash);
    if (user.hardwareDetails?.canvasHash) fps.add(user.hardwareDetails.canvasHash);
    (user.boundDevices || []).forEach((d) => {
      if (d.hardwareHash) fps.add(d.hardwareHash);
      if (d.deviceFingerprint) fps.add(d.deviceFingerprint);
    });
    blacklistedFps = Array.from(fps);

    logs.unshift({
      id: `viol-${Date.now()}`,
      action: 'blacklist_hw',
      reason,
      timestamp: ts,
      operator
    });
  } else if (action === 'unban' || action === 'unblacklist_hw') {
    nextStatus = 'normal';
    blacklistedFps = [];
    logs.unshift({
      id: `viol-${Date.now()}`,
      action: action,
      reason,
      timestamp: ts,
      operator
    });
  }

  return {
    ...user,
    status: nextStatus,
    violationRecord: {
      status: nextStatus,
      reason: nextStatus !== 'normal' ? reason : undefined,
      bannedAt: nextStatus !== 'normal' ? ts : undefined,
      operator: nextStatus !== 'normal' ? operator : undefined,
      blacklistFingerprints: blacklistedFps,
      history: logs
    }
  };
}

/**
 * 将用户列表导出为 CSV 文本 (供后台运营下载)。
 */
export function usersToCsv(users: UserProfile[]): string {
  const header = [
    'UID',
    '昵称',
    '手机号',
    '会员等级',
    'VIP生效',
    '积分',
    '余额',
    '注册来源',
    '设备指纹',
    '免密置信度',
    '地址数',
    '创建时间'
  ];
  const rows = users.map((u) =>
    [
      u.uid,
      u.nickname,
      u.phone,
      u.membershipTier,
      u.isVIPActive ? '是' : '否',
      u.points,
      u.balance,
      u.authProvider,
      u.hardwareHash || '',
      u.autoLoginScore != null ? `${u.autoLoginScore}%` : '',
      u.addresses.length,
      u.createdAt
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header.join(','), ...rows].join('\n');
}
