/**
 * URBAN RADAR - 用户数据统一档案分层引擎 (User Dossier Engine)
 * 支持食客(Customer)、骑手(Rider/L4)、餐车车长(Merchant/L3)、战区总监(District/L2)、商圈主控(L1)及超管(L0/L5)
 * 提供四层递进式档案数据模型、国密加解密标记、字段级动态脱敏与穿透审计机制
 */

import { safeGetStorage, safeSetStorage } from './safeStorage';
import { MeshTierLevel } from './cascadeMeshEngine';

export type UserDossierCategory =
  | 'customer'
  | 'rider'
  | 'merchant'
  | 'district'
  | 'control'
  | 'hq';

export type AccountStatus = 'active' | 'restricted' | 'frozen';

// 四层递进式档案模型
export interface UserUnifiedProfile {
  // Layer 1: 基础身份与准入鉴权层 (Identity & Security)
  id: string; // 唯一系统档案号
  name: string; // 真实姓名
  avatar: string; // 头像标识
  phone: string; // 完整手机号 (受脱敏策略控制)
  idCardHash: string; // 身份证号脱敏或哈希 (310110********1234)
  gender: 'male' | 'female' | 'other';
  category: UserDossierCategory;
  meshTier: MeshTierLevel;
  securityRating: 'SEC-L1' | 'SEC-L2' | 'SEC-L3' | 'SEC-L4' | 'SEC-L5';
  sm4Certified: boolean; // 国密SM4数字证书已签发
  certificateNo: string; // 证书编码

  // Layer 2: 组织架构与网格管辖层 (Mesh & Jurisdiction)
  organization: string; // 所在组织 (如：静安区苏河湾战区/闪送单兵一营)
  gridCode: string; // 网格编号 (如：GRID-SUHE-01)
  assignedTruckId?: string; // 关联驻守餐车 (如：TRUCK-03)
  assignedTruckName?: string; // 餐车名称
  directSupervisorId?: string; // 直属上级工号
  directSupervisorName?: string; // 直属上级姓名
  dispatchRadiusKm: number; // 调度半径 (km)
  overflowGrabQuota: number; // 每日跨车/跨网格抢单配额

  // Layer 3: 业务履约与风控画像层 (Performance & Risk)
  status: AccountStatus;
  creditScore: number; // 信用分 (0-100)
  totalOrdersFulfilled: number; // 历史完成单量
  onTimeRatePercent: number; // 准时履约率 (%)
  complaintCount: number; // 历史被投诉/纠纷次数
  healthPermitExpiry?: string; // 健康证到期时间
  totalGmvContributed: number; // 产生GMV或流水 (元)
  emergencyContact: string; // 紧急联系人
  emergencyPhone: string; // 紧急联系人电话

  // Layer 4: 云端资源与存证哈希 (Cloud & Proof Traces)
  cosDossierArchiveUrl?: string; // 腾讯云 COS 统一档案附件包地址
  latestProofHash?: string; // 最近一次履约/存证哈希指纹
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY_DOSSIERS = 'ur_unified_user_dossiers_v1_0';
export const EVENT_USER_DOSSIERS_CHANGED = 'ur_user_dossiers_changed_event';

// 预设高拟真全域统一档案数据集
export const INITIAL_USER_DOSSIERS: UserUnifiedProfile[] = [
  {
    id: 'USR-HQ-001',
    name: '张建国',
    avatar: '张',
    phone: '13816668888',
    idCardHash: '310101********0019',
    gender: 'male',
    category: 'hq',
    meshTier: 'L0',
    securityRating: 'SEC-L4',
    sm4Certified: true,
    certificateNo: 'SM4-HQ-ROOT-2026-0001',
    organization: 'Urban Radar 集团最高执行委员会',
    gridCode: 'GRID-GLOBAL-HQ',
    directSupervisorName: '董事会最高执委会',
    dispatchRadiusKm: 50,
    overflowGrabQuota: 9999,
    status: 'active',
    creditScore: 100,
    totalOrdersFulfilled: 0,
    onTimeRatePercent: 100,
    complaintCount: 0,
    totalGmvContributed: 8420000,
    emergencyContact: '总办秘书处',
    emergencyPhone: '021-8899-0001',
    cosDossierArchiveUrl: 'cos://7463-tc100-d9gz0e2ko5929e360-1445454244/dossiers/hq-001.pdf',
    latestProofHash: '0x8f3c...b881a',
    createdAt: '2025-01-01 09:00:00',
    updatedAt: '2026-09-10 10:30:00'
  },
  {
    id: 'USR-CTRL-010',
    name: '陈浩宇',
    avatar: '陈',
    phone: '13917772222',
    idCardHash: '310108********3312',
    gender: 'male',
    category: 'control',
    meshTier: 'L1',
    securityRating: 'SEC-L3',
    sm4Certified: true,
    certificateNo: 'SM4-DIST-SUHE-2026-003',
    organization: '苏河湾大悦城核心商圈主控席',
    gridCode: 'GRID-SUHE-CORE',
    directSupervisorId: 'USR-HQ-001',
    directSupervisorName: '张建国 (L0 集团执行总裁)',
    dispatchRadiusKm: 15,
    overflowGrabQuota: 500,
    status: 'active',
    creditScore: 99,
    totalOrdersFulfilled: 12480,
    onTimeRatePercent: 99.4,
    complaintCount: 1,
    totalGmvContributed: 420800,
    emergencyContact: '商圈应急值班台',
    emergencyPhone: '021-8899-0119',
    cosDossierArchiveUrl: 'cos://7463-tc100-d9gz0e2ko5929e360-1445454244/dossiers/ctrl-010.pdf',
    latestProofHash: '0x49c1...fa310',
    createdAt: '2025-03-15 10:00:00',
    updatedAt: '2026-09-10 11:20:00'
  },
  {
    id: 'USR-DIR-022',
    name: '赵志成',
    avatar: '赵',
    phone: '13601889922',
    idCardHash: '310115********4156',
    gender: 'male',
    category: 'district',
    meshTier: 'L2',
    securityRating: 'SEC-L2',
    sm4Certified: true,
    certificateNo: 'SM4-DIR-PX-2026-008',
    organization: '浦西战区先锋指挥部 (辖3车8单兵)',
    gridCode: 'GRID-PX-WEST-01',
    directSupervisorId: 'USR-CTRL-010',
    directSupervisorName: '陈浩宇 (L1 商圈主控首席)',
    dispatchRadiusKm: 8,
    overflowGrabQuota: 200,
    status: 'active',
    creditScore: 98,
    totalOrdersFulfilled: 8960,
    onTimeRatePercent: 98.7,
    complaintCount: 2,
    totalGmvContributed: 285400,
    emergencyContact: '李红霞 (配偶)',
    emergencyPhone: '13812345678',
    cosDossierArchiveUrl: 'cos://7463-tc100-d9gz0e2ko5929e360-1445454244/dossiers/dir-022.pdf',
    latestProofHash: '0x7e22...198b',
    createdAt: '2025-05-10 08:30:00',
    updatedAt: '2026-09-10 09:15:00'
  },
  {
    id: 'USR-TRK-031',
    name: '张建军',
    avatar: '建',
    phone: '13818901234',
    idCardHash: '320502********7819',
    gender: 'male',
    category: 'merchant',
    meshTier: 'L3',
    securityRating: 'SEC-L2',
    sm4Certified: true,
    certificateNo: 'SM4-CHEF-TK03-2026-031',
    organization: '黑曜石炙烤 03 号移动餐车工作站',
    gridCode: 'GRID-SUHE-01',
    assignedTruckId: 'TRUCK-03',
    assignedTruckName: '黑曜石 03 号·苏河湾滨河先锋车',
    directSupervisorId: 'USR-DIR-022',
    directSupervisorName: '赵志成 (L2 浦西战区总监)',
    dispatchRadiusKm: 3.5,
    overflowGrabQuota: 50,
    status: 'active',
    creditScore: 97,
    totalOrdersFulfilled: 5410,
    onTimeRatePercent: 99.1,
    complaintCount: 0,
    healthPermitExpiry: '2027-06-30',
    totalGmvContributed: 168900,
    emergencyContact: '餐车后厨副班长',
    emergencyPhone: '13918880011',
    cosDossierArchiveUrl: 'cos://7463-tc100-d9gz0e2ko5929e360-1445454244/dossiers/chef-031.pdf',
    latestProofHash: '0x33ca...09ff',
    createdAt: '2025-08-01 11:00:00',
    updatedAt: '2026-09-10 12:00:00'
  },
  {
    id: 'USR-RID-082',
    name: '周凯',
    avatar: '凯',
    phone: '15921884433',
    idCardHash: '341221********5670',
    gender: 'male',
    category: 'rider',
    meshTier: 'L4',
    securityRating: 'SEC-L1',
    sm4Certified: true,
    certificateNo: 'SM4-RIDER-ZHOU-2026-082',
    organization: '闪送骑士第一冲锋支队 (RTK 亚米级)',
    gridCode: 'GRID-SUHE-01',
    assignedTruckId: 'TRUCK-03',
    assignedTruckName: '黑曜石 03 号·苏河湾滨河先锋车',
    directSupervisorId: 'USR-TRK-031',
    directSupervisorName: '张建军 (L3 03号餐车车长)',
    dispatchRadiusKm: 3.0,
    overflowGrabQuota: 30,
    status: 'active',
    creditScore: 99,
    totalOrdersFulfilled: 3820,
    onTimeRatePercent: 99.8,
    complaintCount: 0,
    healthPermitExpiry: '2027-08-15',
    totalGmvContributed: 98500,
    emergencyContact: '周志刚 (父亲)',
    emergencyPhone: '15899992211',
    cosDossierArchiveUrl: 'cos://7463-tc100-d9gz0e2ko5929e360-1445454244/dossiers/rider-082.pdf',
    latestProofHash: '0x992a...c014',
    createdAt: '2025-09-10 14:00:00',
    updatedAt: '2026-09-10 12:45:00'
  },
  {
    id: 'USR-RID-095',
    name: '孙立明',
    avatar: '明',
    phone: '17701993355',
    idCardHash: '320623********9912',
    gender: 'male',
    category: 'rider',
    meshTier: 'L4',
    securityRating: 'SEC-L1',
    sm4Certified: true,
    certificateNo: 'SM4-RIDER-SUN-2026-095',
    organization: '闪送骑士第二中队 (大悦城快响)',
    gridCode: 'GRID-SUHE-02',
    assignedTruckId: 'TRUCK-04',
    assignedTruckName: '黑曜石 04 号·大悦城北广场车',
    directSupervisorId: 'USR-DIR-022',
    directSupervisorName: '赵志成 (L2 浦西战区总监)',
    dispatchRadiusKm: 3.0,
    overflowGrabQuota: 25,
    status: 'active',
    creditScore: 94,
    totalOrdersFulfilled: 2190,
    onTimeRatePercent: 96.2,
    complaintCount: 3,
    healthPermitExpiry: '2027-03-20',
    totalGmvContributed: 56200,
    emergencyContact: '孙立国 (兄长)',
    emergencyPhone: '13611110022',
    cosDossierArchiveUrl: 'cos://7463-tc100-d9gz0e2ko5929e360-1445454244/dossiers/rider-095.pdf',
    latestProofHash: '0xbb10...88de',
    createdAt: '2025-11-20 10:20:00',
    updatedAt: '2026-09-10 11:50:00'
  },
  {
    id: 'USR-CUST-881',
    name: '林美宣',
    avatar: '林',
    phone: '13817654321',
    idCardHash: '310104********2248',
    gender: 'female',
    category: 'customer',
    meshTier: 'CUSTOMER',
    securityRating: 'SEC-L1',
    sm4Certified: false,
    certificateNo: 'SM4-CUST-LIN-2026-881',
    organization: '苏河湾大悦城白领食客俱乐部',
    gridCode: 'GRID-SUHE-01',
    dispatchRadiusKm: 1.5,
    overflowGrabQuota: 0,
    status: 'active',
    creditScore: 99,
    totalOrdersFulfilled: 68,
    onTimeRatePercent: 100,
    complaintCount: 0,
    totalGmvContributed: 3480,
    emergencyContact: '林先生',
    emergencyPhone: '13900001122',
    cosDossierArchiveUrl: 'cos://7463-tc100-d9gz0e2ko5929e360-1445454244/dossiers/cust-881.pdf',
    latestProofHash: '0x71fa...3310',
    createdAt: '2026-01-15 12:30:00',
    updatedAt: '2026-09-10 12:30:00'
  },
  {
    id: 'USR-AUD-009',
    name: '方敏慧',
    avatar: '方',
    phone: '13918009988',
    idCardHash: '310112********1980',
    gender: 'female',
    category: 'hq',
    meshTier: 'L5',
    securityRating: 'SEC-L5',
    sm4Certified: true,
    certificateNo: 'SM4-AUDIT-FANG-2026-009',
    organization: 'Urban Radar 全域合规独立审计委员会',
    gridCode: 'GRID-GLOBAL-AUDIT',
    directSupervisorName: '董事会监事会',
    dispatchRadiusKm: 50,
    overflowGrabQuota: 0,
    status: 'active',
    creditScore: 100,
    totalOrdersFulfilled: 0,
    onTimeRatePercent: 100,
    complaintCount: 0,
    totalGmvContributed: 0,
    emergencyContact: '监事会合规处',
    emergencyPhone: '021-8899-0099',
    cosDossierArchiveUrl: 'cos://7463-tc100-d9gz0e2ko5929e360-1445454244/dossiers/aud-009.pdf',
    latestProofHash: '0xaa90...44cc',
    createdAt: '2025-02-01 09:00:00',
    updatedAt: '2026-09-10 11:00:00'
  }
];

// 获取所有用户档案
export function getAllUserDossiers(): UserUnifiedProfile[] {
  const saved = safeGetStorage<UserUnifiedProfile[] | null>(STORAGE_KEY_DOSSIERS, null);
  if (saved && Array.isArray(saved) && saved.length > 0) {
    return saved;
  }
  safeSetStorage(STORAGE_KEY_DOSSIERS, INITIAL_USER_DOSSIERS);
  return INITIAL_USER_DOSSIERS;
}

// 保存单个或批量用户档案
export function saveUserDossier(profile: UserUnifiedProfile): void {
  const list = getAllUserDossiers();
  const index = list.findIndex((u) => u.id === profile.id);
  let updatedList: UserUnifiedProfile[];
  if (index >= 0) {
    updatedList = [...list];
    updatedList[index] = { ...profile, updatedAt: new Date().toLocaleString('zh-CN') };
  } else {
    updatedList = [
      {
        ...profile,
        createdAt: new Date().toLocaleString('zh-CN'),
        updatedAt: new Date().toLocaleString('zh-CN')
      },
      ...list
    ];
  }
  safeSetStorage(STORAGE_KEY_DOSSIERS, updatedList);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_USER_DOSSIERS_CHANGED, { detail: updatedList }));
  }
}

// 删除用户档案
export function deleteUserDossier(id: string): void {
  const list = getAllUserDossiers().filter((u) => u.id !== id);
  safeSetStorage(STORAGE_KEY_DOSSIERS, list);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_USER_DOSSIERS_CHANGED, { detail: list }));
  }
}

// 动态字段脱敏函数 (根据当前查看者权限决定)
export function getMaskedPhone(phone: string, canViewPlaintext: boolean): string {
  if (canViewPlaintext) return phone;
  if (!phone || phone.length < 7) return '***-****-****';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1-****-$2');
}

export function getMaskedIdCard(idCard: string, canViewPlaintext: boolean): string {
  if (canViewPlaintext) return idCard;
  if (!idCard || idCard.length < 8) return '****************';
  return idCard.replace(/(\d{6})\d+(\d{4})/, '$1********$2');
}
