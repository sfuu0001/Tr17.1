export interface UserAddress {
  id: string;
  name: string;
  phone: string;
  tag: '公司' | '家' | '学校' | '其他';
  address: string;
  detail: string;
  isDefault: boolean;
  createdAt?: string;
  remarks?: string;
  houseNumber?: string;
  latitude?: number;
  longitude?: number;
}

export interface UserPreferences {
  spiciness: 'none' | 'mild' | 'medium' | 'hot';
  cutlery: 'needed' | 'not_needed' | 'eco';
  autoApplyCoupons: boolean;
  radarTracking: boolean;
  smsNotification: boolean;
  dietaryNote?: string;
}

export interface UserWalletTransaction {
  id: string;
  type: 'recharge' | 'expense' | 'refund' | 'reward';
  title: string;
  amount: number;
  balanceAfter: number;
  timestamp: string;
  orderNo?: string;
}

export interface UserBoundDevice {
  id: string;
  deviceName: string;
  hardwareHash: string;
  deviceFingerprint: string;
  gpuRenderer?: string;
  physicalResolution?: string;
  platform?: string;
  boundAt: string;
  isCurrent?: boolean;
  status: 'trusted' | 'suspended';
}

export interface UserDeviceHardwareDetails {
  hardwareHash: string;
  deviceFingerprint: string;
  confidenceScore: number;
  gpuRenderer: string;
  gpuVendor: string;
  webglScore?: string;
  audioDspHash: string;
  canvasHash: string;
  physicalResolution: string;
  colorDepth: number;
  pixelRatio: number;
  cpuCores: number;
  deviceMemoryGb?: number;
  maxTouchPoints: number;
  timezone: string;
  platform: string;
  languages: string[];
  collectedAt: string;
}

export interface UserViolationLog {
  id: string;
  action: 'ban' | 'unban' | 'blacklist_hw' | 'unblacklist_hw' | 'asset_adjust' | 'points_adjust';
  reason: string;
  timestamp: string;
  operator: string;
}

export interface UserViolationRecord {
  status: 'normal' | 'banned' | 'hardware_blacklisted';
  reason?: string;
  bannedAt?: string;
  operator?: string;
  blacklistFingerprints?: string[];
  history?: UserViolationLog[];
}

export interface UserProfile {
  uid: string;
  nickname: string;
  phone: string;
  password?: string;
  avatar: string;
  bio: string;
  gender: 'secret' | 'male' | 'female';
  birthday: string;
  membershipTier: 'standard' | 'vip_silver' | 'vip_black_elite';
  isVIPActive: boolean;
  points: number;
  balance: number;
  addresses: UserAddress[];
  preferences: UserPreferences;
  walletHistory: UserWalletTransaction[];
  cloudSyncedAt?: string;
  authProvider: 'cloudbase_auth' | 'custom_phone' | 'anonymous';
  hardwareHash?: string;
  deviceFingerprint?: string;
  autoLoginScore?: number;
  createdAt: string;
  hardwareDetails?: UserDeviceHardwareDetails;
  boundDevices?: UserBoundDevice[];
  pairingCode?: string;
  crossBrowserTested?: boolean;
  antiWipeRecoveryTested?: boolean;
  status?: 'normal' | 'banned' | 'hardware_blacklisted';
  violationRecord?: UserViolationRecord;
}

export interface CloudFunctionCallLog {
  id: string;
  functionName: string;
  action?: string;
  timestamp: string;
  durationMs: number;
  status: 'success' | 'warning' | 'error';
  requestPayload: any;
  responsePayload: any;
  source: 'cloud_function' | 'local_fallback' | 'cloudbase_db';
  message: string;
}
