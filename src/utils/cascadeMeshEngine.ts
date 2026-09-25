/**
 * URBAN RADAR v4.9.2 - 级联极简版 (全屏权限配置标准版)
 * Cascade Mesh Topology & Permission Engine
 * 摒弃历史旧 token 数据，提供全新统一数据模型与完整权限分层
 */

import { safeGetStorage, safeSetStorage } from './safeStorage';
import {
  getMerchantSession,
  getRiderSession,
  MerchantSession,
  RiderSession
} from './staffAndRiderAuthEngine';

// ==================== 1. 权限分类与控制等级 ====================
export type PermissionCategory = 'dispatch' | 'comm' | 'approval' | 'ops' | 'finance';
export type SecurityLevel = 'SEC-L1' | 'SEC-L2' | 'SEC-L3' | 'SEC-L4' | 'SEC-L5';

export interface CascadePermissionItem {
  id: string;
  category: PermissionCategory;
  categoryLabel: string;
  categorySub: string;
  name: string;
  badge: string;
  code: string;
  level: SecurityLevel;
  levelLabel: string;
  rule: string;
  scope: string;
  requiresApproval?: boolean;
  approvalSigner?: string;
  locked?: boolean;
  lockReason?: string;
  enabled: boolean;
}

// 15 项标准全域权限定义（含调度、通讯、审批、运维与财务结算五大职能）
export const INITIAL_PERMISSION_ITEMS: CascadePermissionItem[] = [
  // 调度权限组 (Dispatch Core)
  {
    id: 'PERM_GPS_BROADCAST',
    category: 'dispatch',
    categoryLabel: '调度权限组',
    categorySub: 'Dispatch Core',
    name: 'GPS 高精专线轨迹广播',
    badge: '10Hz 直连',
    code: 'MESH-TRK-01 / RTK 亚米级',
    level: 'SEC-L1',
    levelLabel: 'SEC-L1 常规',
    rule: '向顾客端小程序与战区大屏毫秒级实时同步骑手与餐车行驶经纬度',
    scope: '全域公开 · 实时广播',
    enabled: true
  },
  {
    id: 'PERM_OVERFLOW_GRAB',
    category: 'dispatch',
    categoryLabel: '调度权限组',
    categorySub: 'Dispatch Core',
    name: '跨车超载溢出抢单权',
    badge: '自动分流',
    code: 'DISP-OVERFLOW-POLL',
    level: 'SEC-L2',
    levelLabel: 'SEC-L2 受控',
    rule: '当 03 号餐车排队超 10 单时，自动承接邻近 04 号餐车溢出单并参与运费拆账',
    scope: '03车 ↔ 04车 联动',
    enabled: true
  },
  {
    id: 'PERM_SURGE_PRICING',
    category: 'dispatch',
    categoryLabel: '调度权限组',
    categorySub: 'Dispatch Core',
    name: '动态天气加价调整权',
    badge: '需审批',
    code: 'PRICE-DYNAMIC-SURGE',
    level: 'SEC-L3',
    levelLabel: 'SEC-L3 高危',
    rule: '极端天气下自主发起运价浮动加成（1.2x ~ 2.0x），生效需辖区 L2 战区总监批准',
    scope: '需 L2 赵志成签署',
    requiresApproval: true,
    approvalSigner: 'L2 赵志成',
    enabled: false
  },
  {
    id: 'PERM_GEOFENCE_BYPASS',
    category: 'dispatch',
    categoryLabel: '调度权限组',
    categorySub: 'Dispatch Core',
    name: '异常驻留与电子围栏豁免',
    badge: '自治偏航',
    code: 'GEOFENCE-BYPASS-500M',
    level: 'SEC-L2',
    levelLabel: 'SEC-L2 受控',
    rule: '因道路施工或临时管控，允许单兵在预设网格航线偏离 500 米内自主绕行不触发违规',
    scope: '商圈 3km 履约半径',
    enabled: true
  },

  // 车载通讯组 (Voice Trunk)
  {
    id: 'PERM_INTERCOM_VOICE',
    category: 'comm',
    categoryLabel: '车载通讯组',
    categorySub: 'Voice Trunk',
    name: '车前专线对讲语音直连',
    badge: '433MHz 模拟',
    code: 'INTERCOM-DIRECT-CH3',
    level: 'SEC-L1',
    levelLabel: 'SEC-L1 常规',
    rule: '接入餐车主厨与在途骑手专属硬件双工低延时语音直通频道，无需占用蜂窝公网流量',
    scope: '车端 ↔ 骑手终端直连',
    enabled: true
  },
  {
    id: 'PERM_PROOF_HASH',
    category: 'comm',
    categoryLabel: '车载通讯组',
    categorySub: 'Voice Trunk',
    name: '紧急催单与现场拍照存证',
    badge: '区块链存证',
    code: 'PROOF-HASH-SIGN',
    level: 'SEC-L1',
    levelLabel: 'SEC-L1 常规',
    rule: '支持无接触交付送达现场拍照并生成带 GPS 时戳的哈希摘要并立即上链存证',
    scope: '全域溯源防窜单',
    enabled: true
  },
  {
    id: 'PERM_VOIP_CALL',
    category: 'comm',
    categoryLabel: '车载通讯组',
    categorySub: 'Voice Trunk',
    name: '顾客联络室虚拟号码呼叫',
    badge: '双向隐私',
    code: 'VOIP-MASK-CALL',
    level: 'SEC-L1',
    levelLabel: 'SEC-L1 常规',
    rule: '基于华为云中间号双向加密外呼直通点餐顾客，严格隔离真实手机号码与订单地址',
    scope: '当前在派订单有效',
    enabled: true
  },

  // 审批权限组 (Dual-Approval)
  {
    id: 'PERM_REQ_TRANSFER',
    category: 'approval',
    categoryLabel: '审批权限组',
    categorySub: 'Dual-Approval',
    name: '跨区调度申请发起权',
    badge: '发起权',
    code: 'AUTH-REQ-TRANSFER',
    level: 'SEC-L2',
    levelLabel: 'SEC-L2 受控',
    rule: '遇高峰拥堵或车辆故障时，允许直接向调度中枢发起协同转派工单申请',
    scope: '已获申请权 (放行)',
    enabled: true
  },
  {
    id: 'PERM_KILL_SWITCH',
    category: 'approval',
    categoryLabel: '审批权限组',
    categorySub: 'Dual-Approval',
    name: '全域应急熔断执行权 (Kill-Switch)',
    badge: '需L1超管',
    code: 'KILLSWITCH-EMERGENCY-STOP',
    level: 'SEC-L4',
    levelLabel: 'SEC-L4 极高危',
    rule: '瞬间关停餐车全部外接订单入流通道，单兵无权执行，须总部超管联合签署',
    scope: '锁定禁用 · 需超管权',
    locked: true,
    lockReason: '须总部超管联合签署',
    enabled: false
  },
  {
    id: 'PERM_FAST_REFUND',
    category: 'approval',
    categoryLabel: '审批权限组',
    categorySub: 'Dual-Approval',
    name: '小额退款快捷免审豁免权 (≤ ¥50)',
    badge: '免审豁免',
    code: 'REFUND-FASTPASS-50CNY',
    level: 'SEC-L2',
    levelLabel: 'SEC-L2 受控',
    rule: '针对汤品倾洒、延误 >25 分钟等客观异常现场一键直退，当日限额 ¥200',
    scope: '单日额度限制 ¥200',
    enabled: false
  },

  // 运维与审计组 (Ops & Audit)
  {
    id: 'PERM_SKU_OFFSHELF',
    category: 'ops',
    categoryLabel: '运维与审计组',
    categorySub: 'Ops & Audit',
    name: '实时单品快速估清下架',
    badge: '档口即时',
    code: 'SKU-OFFSHELF-QUICK',
    level: 'SEC-L1',
    levelLabel: 'SEC-L1 常规',
    rule: '当重点食材售罄（如和牛炙烤饼）直接在手持端触发下架，秒级置灰点餐端菜单',
    scope: '当前餐车 SKU 全量',
    enabled: true
  },
  {
    id: 'PERM_TEMP_SENSOR',
    category: 'ops',
    categoryLabel: '运维与审计组',
    categorySub: 'Ops & Audit',
    name: '车载保温箱温控读取与预警',
    badge: 'IoT 遥测',
    code: 'IOT-TEMPSENS-READ',
    level: 'SEC-L1',
    levelLabel: 'SEC-L1 常规',
    rule: '直读餐车温控箱传感器（实时 68.4°C），低于 60°C 时骑手端声光同步预警',
    scope: '餐车温控传感器',
    enabled: true
  },
  {
    id: 'PERM_AUDIT_CHAIN',
    category: 'ops',
    categoryLabel: '运维与审计组',
    categorySub: 'Ops & Audit',
    name: '全量底层操作审计回溯权',
    badge: 'L5 专属',
    code: 'AUDIT-CHAIN-INSPECT',
    level: 'SEC-L5',
    levelLabel: 'SEC-L5 特权',
    rule: '穿透检索全域 90 天内全部指令操作人签名与区块链哈希，仅 HQ 审计席可用',
    scope: '方敏慧 (L5) 专用',
    locked: true,
    lockReason: '仅 HQ 审计席可用',
    enabled: false
  },

  // 财务结算与分账组 (Finance & Settlement)
  {
    id: 'PERM_SPLIT_LEDGER',
    category: 'finance',
    categoryLabel: '财务结算与分账组',
    categorySub: 'Finance & Split',
    name: '跨车协同运费阶梯拆账核算权',
    badge: '实时分账',
    code: 'FIN-SPLIT-LEDGER-VIEW',
    level: 'SEC-L1',
    levelLabel: 'SEC-L1 常规',
    rule: '单兵可直接在手持终端核验跨车分流承接订单产生的 30% 阶梯奖励分账明细与当日佣金结算',
    scope: '个人钱包与账单存证',
    enabled: true
  },
  {
    id: 'PERM_CASH_COLLECT',
    category: 'finance',
    categoryLabel: '财务结算与分账组',
    categorySub: 'Finance & Split',
    name: '现场非标餐品补差代收免审权 (≤ ¥30)',
    badge: '即时补差',
    code: 'FIN-OFFLINE-SETTLE-PASS',
    level: 'SEC-L2',
    levelLabel: 'SEC-L2 受控',
    rule: '支持现场对非标定制（如加双倍和牛片）差价一键扫码代收，单笔 ¥30 内免经总监逐单签批',
    scope: '单笔限额 ¥30 内免审',
    enabled: true
  }
];

// ==================== 2. 级联穿透层级节点数据 ====================

// L0: 管理这些区域商圈的最高级账号 (支持一个或多个最高管理员)
export interface CascadeSuperAdminNode {
  id: string;
  name: string;
  uid: string;
  role: string;
  levelLabel: string;
  avatarChar: string;
  scope: string;
  verifiedSm4: boolean;
  status: 'online' | 'standby';
  statusLabel: string;
  directDistrictIds: string[];
  phone: string;
  title: string;
}

export const INITIAL_SUPER_ADMINS: CascadeSuperAdminNode[] = [
  {
    id: 'ADMIN-FANG',
    name: '方敏慧',
    uid: 'HQ-ROOT-01',
    role: '首席安全审计官',
    title: '独立复核最高权 (L5/L0)',
    levelLabel: '最高特权组',
    avatarChar: '方',
    scope: '全域商圈根证书签发 · 审计防篡改',
    verifiedSm4: true,
    status: 'online',
    statusLabel: '在线验签',
    directDistrictIds: ['DIST-SUHE', 'DIST-JINGAN', 'DIST-ZHANGJIANG'],
    phone: '138-0010-9901'
  },
  {
    id: 'ADMIN-LU',
    name: '陆建华',
    uid: 'HQ-SUPER-001',
    role: '全域营运总执掌',
    title: '商圈最高统管负责人',
    levelLabel: '最高特权组',
    avatarChar: '陆',
    scope: '全域商圈开设 · 指挥总监任免 · 运价底线核准',
    verifiedSm4: true,
    status: 'online',
    statusLabel: '在席督战',
    directDistrictIds: ['DIST-SUHE', 'DIST-JINGAN', 'DIST-ZHANGJIANG'],
    phone: '139-1120-8802'
  },
  {
    id: 'ADMIN-LIN',
    name: '林逸夫',
    uid: 'HQ-SUPER-002',
    role: '应急指挥执委',
    title: '全域应急熔断签批人',
    levelLabel: '最高特权组',
    avatarChar: '林',
    scope: 'Kill-Switch 熔断执行 · 跨省防汛紧急调拨',
    verifiedSm4: true,
    status: 'standby',
    statusLabel: '协同备勤',
    directDistrictIds: ['DIST-SUHE', 'DIST-JINGAN'],
    phone: '136-2290-7703'
  }
];

// L1 辅控: 商圈主控管理用户 (Master Controllers - 每个商圈下的核心主控用户)
export interface CascadeMasterControllerNode {
  id: string;
  name: string;
  uid: string;
  districtId: string;
  title: string;
  roleBadge: string;
  isPrimary: boolean;
  avatarChar: string;
  phone: string;
  status: 'on_duty' | 'cooperative';
  statusLabel: string;
  permissions: string[];
}

export const INITIAL_MASTER_CONTROLLERS: CascadeMasterControllerNode[] = [
  {
    id: 'CTRL-SHW-01',
    name: '孙德盛 (调度长)',
    uid: 'MTR-SHW-01',
    districtId: 'DIST-SUHE',
    title: '苏河湾总控席调度长',
    roleBadge: '主控责任人',
    isPrimary: true,
    avatarChar: '盛',
    phone: '137-9901-2211',
    status: 'on_duty',
    statusLabel: '主控在席',
    permissions: ['商圈全域大屏', '一键全车分流', '10Hz GPS直读', '商圈加价签署']
  },
  {
    id: 'CTRL-SHW-02',
    name: '钱伟 (现场运营督导)',
    uid: 'MTR-SHW-02',
    districtId: 'DIST-SUHE',
    title: '苏河湾现场督导协同席',
    roleBadge: '协同主控',
    isPrimary: false,
    avatarChar: '伟',
    phone: '135-4421-9988',
    status: 'cooperative',
    statusLabel: '现场机动',
    permissions: ['电子围栏临时豁免', '商圈SKU快速调货', '车前专线直呼']
  },
  {
    id: 'CTRL-JA-01',
    name: '王晓东 (总调度)',
    uid: 'MTR-JA-01',
    districtId: 'DIST-JINGAN',
    title: '静安创智 CBD 主控责任人',
    roleBadge: '主控责任人',
    isPrimary: true,
    avatarChar: '东',
    phone: '139-3388-1122',
    status: 'on_duty',
    statusLabel: '主控在席',
    permissions: ['商圈大屏全控', '楼宇梯控联调', '高峰限流入流']
  },
  {
    id: 'CTRL-ZJ-01',
    name: '李建国 (产业园总控)',
    uid: 'MTR-ZJ-01',
    districtId: 'DIST-ZHANGJIANG',
    title: '张江高科总调度',
    roleBadge: '主控责任人',
    isPrimary: true,
    avatarChar: '国',
    phone: '136-7788-0099',
    status: 'cooperative',
    statusLabel: '离线备用',
    permissions: ['离线应急容灾', '跨园区转运', '批量核销下发']
  }
];

// L1: 区域商圈节点 (包含主控用户与指挥总监关系)
export interface CascadeDistrictNode {
  id: string;
  name: string;
  tag: string;
  status: 'active' | 'cooperative' | 'offline';
  statusLabel: string;
  code: string;
  superAdminIds: string[];
  masterControllerIds: string[];
  directorIds: string[];
}

export const INITIAL_DISTRICTS: CascadeDistrictNode[] = [
  {
    id: 'DIST-SUHE',
    name: '苏河湾金融商圈',
    tag: 'L1',
    status: 'active',
    statusLabel: '主控',
    code: 'DIST-021-SHW',
    superAdminIds: ['ADMIN-FANG', 'ADMIN-LU', 'ADMIN-LIN'],
    masterControllerIds: ['CTRL-SHW-01', 'CTRL-SHW-02'],
    directorIds: ['DIR-ZHAO', 'DIR-LIU']
  },
  {
    id: 'DIST-JINGAN',
    name: '静安创智 CBD',
    tag: 'L1',
    status: 'cooperative',
    statusLabel: '协同',
    code: 'DIST-021-JA',
    superAdminIds: ['ADMIN-FANG', 'ADMIN-LU'],
    masterControllerIds: ['CTRL-JA-01'],
    directorIds: ['DIR-LIU']
  },
  {
    id: 'DIST-ZHANGJIANG',
    name: '张江高科产业园',
    tag: 'L1',
    status: 'offline',
    statusLabel: '离线',
    code: 'DIST-021-ZJ',
    superAdminIds: ['ADMIN-FANG', 'ADMIN-LU'],
    masterControllerIds: ['CTRL-ZJ-01'],
    directorIds: ['DIR-ZHAO']
  }
];

// L2: 指挥总监节点 (强化直属管辖餐车与直属单兵)
export interface CascadeDirectorNode {
  id: string;
  name: string;
  title: string;
  avatarChar: string;
  uid: string;
  pwdHash: string;
  secKey: string;
  jobTitle: string;
  terminalIp: string;
  status: 'on_duty' | 'cooperative';
  statusLabel: string;
  districtId: string;
  managedTruckIds: string[]; // ★ 直属管辖移动餐车 ID 列表！
  managedRiderIds: string[]; // 直属基层单兵 ID 列表
  permissionsSummary: string[]; // 拥有主要权限概要
}

export const INITIAL_DIRECTORS: CascadeDirectorNode[] = [
  {
    id: 'DIR-ZHAO',
    name: '赵志成 (战区总监)',
    title: '战区总监',
    avatarChar: '成',
    uid: 'HQ-DIR-0021',
    pwdHash: 'PWD: ********** [SM4验签]',
    secKey: 'SEC-KEY-9281-PASS',
    jobTitle: 'DIR-SHW-01 · 苏河湾总控指挥',
    terminalIp: '10.24.18.99 (机房控制台)',
    status: 'on_duty',
    statusLabel: '在席',
    districtId: 'DIST-SUHE',
    managedTruckIds: ['TRUCK-01', 'TRUCK-03', 'TRUCK-04'], // 赵志成直接管辖 3 辆餐车
    managedRiderIds: ['RIDER-ZHOU', 'RIDER-CHEN', 'RIDER-WANG'],
    permissionsSummary: ['跨车分流签批', '动态天气加价调整', '协同转派下达', '车长考评']
  },
  {
    id: 'DIR-LIU',
    name: '刘文韬 (巡查督导)',
    title: '巡查督导',
    avatarChar: '韬',
    uid: 'HQ-DIR-0028',
    pwdHash: 'PWD: ********** [SM4验签]',
    secKey: 'SEC-KEY-9288-PASS',
    jobTitle: 'DIR-SHW-02 · 巡查机动督导',
    terminalIp: '10.24.18.105 (移动巡查机)',
    status: 'cooperative',
    statusLabel: '协同',
    districtId: 'DIST-SUHE',
    managedTruckIds: ['TRUCK-02', 'TRUCK-05'], // 刘文韬管辖 2 辆餐车
    managedRiderIds: ['RIDER-LI'],
    permissionsSummary: ['电子围栏越界免审', '现场非标补差复核', '食品安全温控抽检']
  }
];

// L3: 移动餐车资产节点 (精确归属总监与商圈)
export interface CascadeTruckNode {
  id: string;
  name: string;
  queueCount: number;
  statusLabel: string;
  statusType: 'overloaded' | 'idle' | 'normal';
  tempCelsius: number;
  districtId: string;
  directorId: string; // ★ 所属指挥总监 ID！
  directorName: string; // 指挥总监姓名
  chefName: string; // 车长/主厨
  location: string;
  stationedRiderIds: string[]; // 驻车骑手
}

export const INITIAL_TRUCKS: CascadeTruckNode[] = [
  {
    id: 'TRUCK-03',
    name: '03号流动餐车 (炙烤)',
    queueCount: 14,
    statusLabel: '14单超载',
    statusType: 'overloaded',
    tempCelsius: 68.4,
    districtId: 'DIST-SUHE',
    directorId: 'DIR-ZHAO',
    directorName: '赵志成 (战区总监)',
    chefName: '张伟 (店长/车长)',
    location: '苏河湾滨水步道 1 号泊位',
    stationedRiderIds: ['RIDER-ZHOU']
  },
  {
    id: 'TRUCK-04',
    name: '04号流动餐车 (协同)',
    queueCount: 4,
    statusLabel: '4单空闲',
    statusType: 'idle',
    tempCelsius: 65.2,
    districtId: 'DIST-SUHE',
    directorId: 'DIR-ZHAO',
    directorName: '赵志成 (战区总监)',
    chefName: '李明 (副主厨/车长)',
    location: '苏河湾金融大厦南广场',
    stationedRiderIds: ['RIDER-CHEN']
  },
  {
    id: 'TRUCK-01',
    name: '01号流动餐车 (翡翠青)',
    queueCount: 8,
    statusLabel: '8单正常',
    statusType: 'normal',
    tempCelsius: 67.0,
    districtId: 'DIST-SUHE',
    directorId: 'DIR-ZHAO',
    directorName: '赵志成 (战区总监)',
    chefName: '王海滨 (资深车长)',
    location: '华润万象天地北门',
    stationedRiderIds: ['RIDER-WANG']
  },
  {
    id: 'TRUCK-02',
    name: '02号流动餐车 (曜岩灰)',
    queueCount: 6,
    statusLabel: '6单正常',
    statusType: 'normal',
    tempCelsius: 66.8,
    districtId: 'DIST-SUHE',
    directorId: 'DIR-LIU',
    directorName: '刘文韬 (巡查督导)',
    chefName: '陈伟 (驻车调度兼厨长)',
    location: '大悦城摩天轮连廊',
    stationedRiderIds: ['RIDER-LI']
  },
  {
    id: 'TRUCK-05',
    name: '05号流动餐车 (轻食甜品)',
    queueCount: 3,
    statusLabel: '3单空闲',
    statusType: 'idle',
    tempCelsius: 4.8,
    districtId: 'DIST-SUHE',
    directorId: 'DIR-LIU',
    directorName: '刘文韬 (巡查督导)',
    chefName: '周小曼 (西点主理)',
    location: '静安国际中心喷泉广场',
    stationedRiderIds: []
  }
];

// L4: 基层单兵/骑手节点
export interface CascadeRiderNode {
  id: string;
  name: string;
  shortName: string;
  avatarChar: string;
  role: string;
  uid: string;
  employeeId: string;
  token: string;
  pwdHash: string;
  jobPosition: string;
  affiliatedEntity: string;
  validPeriod: string;
  deviceIp: string;
  completedOrders: number;
  status: 'locked' | 'cooperative';
  statusLabel: string;
  truckId: string;
  directorId: string;
  districtId: string;
}

// 刷新生成全新的 Mesh Token，摒弃旧有废弃 token 数据
export function generateFreshMeshToken(): string {
  const timestamp = Date.now().toString(16).slice(-4);
  const rand1 = Math.random().toString(16).slice(2, 6);
  const rand2 = Math.random().toString(16).slice(2, 6);
  return `TKN-${timestamp}-${rand1}-${rand2}`;
}

export const INITIAL_RIDERS: CascadeRiderNode[] = [
  {
    id: 'RIDER-ZHOU',
    name: '周凯 (专送骑手)',
    shortName: '周凯',
    avatarChar: '凯',
    role: '专送骑手',
    uid: 'USR-RIDER-SHW-082',
    employeeId: 'R-SHW-082',
    token: 'TKN-9a8f-28c0-449e',
    pwdHash: 'PWD: ********** [已SM4哈希验签]',
    jobPosition: 'R-SHW-082 · 专送单兵',
    affiliatedEntity: '苏河湾 · 03号流动餐车',
    validPeriod: '当日 08:00 - 23:30',
    deviceIp: 'PDA-9018 / 192.168.4.32',
    completedOrders: 18,
    status: 'locked',
    statusLabel: '当前锁定',
    truckId: 'TRUCK-03',
    directorId: 'DIR-ZHAO',
    districtId: 'DIST-SUHE'
  },
  {
    id: 'RIDER-CHEN',
    name: '陈志远 (金牌骑手)',
    shortName: '陈志远',
    avatarChar: '远',
    role: '金牌骑手',
    uid: 'USR-RIDER-SHW-088',
    employeeId: 'R-SHW-088',
    token: 'TKN-8b2c-9011-55fa',
    pwdHash: 'PWD: ********** [已验签]',
    jobPosition: 'R-SHW-088 · 协同备勤',
    affiliatedEntity: '苏河湾 04号餐车',
    validPeriod: '当日 08:00 - 23:30',
    deviceIp: 'PDA-9022 / 192.168.4.39',
    completedOrders: 23,
    status: 'cooperative',
    statusLabel: '协同',
    truckId: 'TRUCK-04',
    directorId: 'DIR-ZHAO',
    districtId: 'DIST-SUHE'
  },
  {
    id: 'RIDER-WANG',
    name: '王强 (极速单兵)',
    shortName: '王强',
    avatarChar: '强',
    role: '极速单兵',
    uid: 'USR-RIDER-SHW-091',
    employeeId: 'R-SHW-091',
    token: 'TKN-7c3a-1082-99bd',
    pwdHash: 'PWD: ********** [已验签]',
    jobPosition: 'R-SHW-091 · 极速先锋',
    affiliatedEntity: '苏河湾 01号餐车',
    validPeriod: '当日 09:00 - 22:00',
    deviceIp: 'PDA-9031 / 192.168.4.55',
    completedOrders: 16,
    status: 'cooperative',
    statusLabel: '在途',
    truckId: 'TRUCK-01',
    directorId: 'DIR-ZHAO',
    districtId: 'DIST-SUHE'
  },
  {
    id: 'RIDER-LI',
    name: '李晓峰 (协同骑手)',
    shortName: '李晓峰',
    avatarChar: '峰',
    role: '协同骑手',
    uid: 'USR-RIDER-SHW-095',
    employeeId: 'R-SHW-095',
    token: 'TKN-6b5d-4491-00cc',
    pwdHash: 'PWD: ********** [已验签]',
    jobPosition: 'R-SHW-095 · 摩天轮点位驻泊',
    affiliatedEntity: '苏河湾 02号餐车',
    validPeriod: '当日 10:00 - 23:00',
    deviceIp: 'PDA-9045 / 192.168.4.88',
    completedOrders: 12,
    status: 'cooperative',
    statusLabel: '驻守',
    truckId: 'TRUCK-02',
    directorId: 'DIR-LIU',
    districtId: 'DIST-SUHE'
  }
];

// 兼容现有静态导出的引用
export const CASCADE_DISTRICTS = INITIAL_DISTRICTS;
export const CASCADE_DIRECTORS = INITIAL_DIRECTORS;
export const CASCADE_TRUCKS = INITIAL_TRUCKS;
export const CASCADE_RIDERS = INITIAL_RIDERS;

// L5: 审计权
export interface CascadeAuditorNode {
  id: string;
  name: string;
  uid: string;
  roleBadge: string;
  qualification: string;
  device: string;
  verifiedSm4: boolean;
}

export const CURRENT_AUDITOR: CascadeAuditorNode = {
  id: 'AUD-FANG',
  name: '方敏慧',
  uid: 'HQ-AUD-09',
  roleBadge: 'L5 审计',
  qualification: '独立复核权',
  device: 'PDA-9018 · 433MHz 车机',
  verifiedSm4: true
};

// ==================== 3. 关联审批工单数据 ====================
export interface AssociatedWorkOrder {
  id: string;
  title: string;
  urgency: 'high' | 'normal';
  requiresLevel: string;
  proposer: string;
  proposerTime: string;
  target: string;
  expectedBenefit: string;
  status: 'pending' | 'approved' | 'rejected';
  approver?: string;
  approvedTime?: string;
}

export const INITIAL_WORK_ORDER: AssociatedWorkOrder = {
  id: '#AUTH-9902',
  title: '03号餐车排队超限(14单)申请将周凯临时调度至 04 号车协同分流',
  urgency: 'high',
  requiresLevel: '需 L5 复核签批',
  proposer: '赵志成 (L2 战区总监)',
  proposerTime: '10:42:15',
  target: '苏河湾 04 号车 (承接 30% 产能)',
  expectedBenefit: '提升履约率 +24%',
  status: 'pending'
};

// ==================== 4. 90天审计日志记录 ====================
export interface CascadeAuditLog {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  targetSubject: string;
  meshHash: string;
}

export const INITIAL_AUDIT_LOGS: CascadeAuditLog[] = [
  {
    id: 'LOG-8801',
    timestamp: '2026-09-09 10:45:12',
    operator: '方敏慧 (L5 审计)',
    action: '下发【金牌骑手】专属权限矩阵基线',
    targetSubject: '周凯 (R-SHW-082)',
    meshHash: '0x9fa1...88b2'
  },
  {
    id: 'LOG-8802',
    timestamp: '2026-09-09 10:30:05',
    operator: '赵志成 (L2 战区总监)',
    action: '发起跨车溢出分流申请 (#AUTH-9902)',
    targetSubject: '03号车 ➔ 04号车',
    meshHash: '0x7dc4...112e'
  },
  {
    id: 'LOG-8803',
    timestamp: '2026-09-09 09:15:00',
    operator: '系统自动鉴权网关',
    action: '更新 RTK 亚米级高精轨迹广播基准',
    targetSubject: '全域骑手终端 MESH',
    meshHash: '0x4ea8...339a'
  }
];

// ==================== 5. 持久化存储与旧 token 清洗机制 ====================
export const EVENT_CASCADE_PERMISSIONS_CHANGED = 'ur_cascade_permissions_changed_v4_9';
export const EVENT_CASCADE_IDENTITY_CHANGED = 'ur_cascade_identity_changed_v4_9';

const STORAGE_KEY_PERMISSIONS = 'ur_cascade_mesh_permissions_v4_9';
const STORAGE_KEY_WORK_ORDER = 'ur_cascade_mesh_work_order_v4_9';
const STORAGE_KEY_AUDIT_LOGS = 'ur_cascade_mesh_audit_logs_v4_9';
const STORAGE_KEY_ACTIVE_CHAIN = 'ur_cascade_active_chain_v4_9';
const STORAGE_KEY_ACTIVE_IDENTITY = 'ur_cascade_active_identity_v4_9';

export type MeshTierLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'CUSTOMER';

export interface ActiveMeshIdentity {
  tier: MeshTierLevel;
  tierLabel: string;
  name: string;
  uid: string;
  roleTitle: string;
  scopeLabel: string;
  nodeId: string;
  avatarChar: string;
  verifiedSm4: boolean;
  colorClass: string;
}

// 预设层级典型身份模板
export const DEFAULT_MESH_IDENTITIES: Record<MeshTierLevel, ActiveMeshIdentity> = {
  L0: {
    tier: 'L0',
    tierLabel: 'L0 HQ最高全权席',
    name: '张建国',
    uid: 'HQ-ADM-01',
    roleTitle: '集团执行总裁 / 最高安全官',
    scopeLabel: '全域所有商圈 · 根证书签发权',
    nodeId: 'SUPER-01',
    avatarChar: '张',
    verifiedSm4: true,
    colorClass: 'bg-purple-900 text-purple-100 border-purple-700'
  },
  L1: {
    tier: 'L1',
    tierLabel: 'L1 区域商圈主控',
    name: '陈浩宇',
    uid: 'DIST-CTRL-01',
    roleTitle: '苏河湾大悦城商圈主控首席',
    scopeLabel: '静安苏河湾商圈全域 (DIST-SUHE)',
    nodeId: 'CTRL-01',
    avatarChar: '陈',
    verifiedSm4: true,
    colorClass: 'bg-stone-900 text-stone-100 border-stone-700'
  },
  L2: {
    tier: 'L2',
    tierLabel: 'L2 战区指挥总监',
    name: '赵志成',
    uid: 'DIR-ZHAO-01',
    roleTitle: '浦西战区总监 (直辖3车8单兵)',
    scopeLabel: '直属管辖 03/04/01 号移动餐车',
    nodeId: 'DIR-ZHAO',
    avatarChar: '赵',
    verifiedSm4: true,
    colorClass: 'bg-blue-900 text-blue-100 border-blue-700'
  },
  L3: {
    tier: 'L3',
    tierLabel: 'L3 站点移动餐车',
    name: '张伟 (店长)',
    uid: 'ST-001',
    roleTitle: '03号餐车店长 / 车长 (在岗/炙烤站台)',
    scopeLabel: '苏河湾 1 号泊位 · 站点控制权',
    nodeId: 'TRUCK-03',
    avatarChar: '张',
    verifiedSm4: true,
    colorClass: 'bg-orange-900 text-orange-100 border-orange-700'
  },
  L4: {
    tier: 'L4',
    tierLabel: 'L4 基层现场单兵',
    name: '陈志远 (王牌骑士)',
    uid: 'R-8821',
    roleTitle: '黑曜石王牌骑士 (RTK 亚米级骑手)',
    scopeLabel: '驻守 03 号餐车 · 3km 履约半径',
    nodeId: 'RIDER-ZHOU',
    avatarChar: '陈',
    verifiedSm4: true,
    colorClass: 'bg-emerald-900 text-emerald-100 border-emerald-700'
  },
  L5: {
    tier: 'L5',
    tierLabel: 'L5 独立审计席',
    name: '方敏慧',
    uid: 'HQ-AUD-09',
    roleTitle: '全域合规审计员 (独立复核权)',
    scopeLabel: '全网底层区块链日志穿透',
    nodeId: 'AUD-FANG',
    avatarChar: '方',
    verifiedSm4: true,
    colorClass: 'bg-indigo-900 text-indigo-100 border-indigo-700'
  },
  CUSTOMER: {
    tier: 'CUSTOMER',
    tierLabel: '食客会员端',
    name: '普通会员顾客',
    uid: 'USR-CUST-88',
    roleTitle: '黑曜石尊享食客',
    scopeLabel: '点餐 / 极速雷达配送服务',
    nodeId: 'CUST-01',
    avatarChar: '客',
    verifiedSm4: false,
    colorClass: 'bg-stone-800 text-stone-200 border-stone-600'
  }
};

/**
 * 动态根据在岗商户 Session 生成 L3 席位身份（拒绝硬编码“张建军”，实时反映在岗专员）
 */
export function getL3IdentityFromSession(session?: MerchantSession | null): ActiveMeshIdentity {
  const s = session !== undefined ? session : getMerchantSession();
  if (s && s.isLoggedIn && s.name) {
    const rawName = s.name.replace(/\s*\(.*?\)/g, '').trim();
    return {
      tier: 'L3',
      tierLabel: 'L3 站点移动餐车',
      name: s.name,
      uid: s.staffNo || s.staffId || 'ST-001',
      roleTitle: `03号餐车 ${s.roleTitle || '在岗车长'}`,
      scopeLabel: `苏河湾 1 号泊位 · ${s.name}`,
      nodeId: 'TRUCK-03',
      avatarChar: rawName ? rawName.slice(0, 1) : '张',
      verifiedSm4: true,
      colorClass: 'bg-orange-900 text-orange-100 border-orange-700'
    };
  }
  return {
    tier: 'L3',
    tierLabel: 'L3 站点移动餐车',
    name: '张伟 (店长)',
    uid: 'ST-001',
    roleTitle: '03号餐车店长 / 车长 (炙烤站台)',
    scopeLabel: '苏河湾 1 号泊位 · 站点控制权',
    nodeId: 'TRUCK-03',
    avatarChar: '张',
    verifiedSm4: true,
    colorClass: 'bg-orange-900 text-orange-100 border-orange-700'
  };
}

/**
 * 动态根据在岗骑手 Session 生成 L4 席位身份
 */
export function getL4IdentityFromSession(session?: RiderSession | null): ActiveMeshIdentity {
  const s = session !== undefined ? session : getRiderSession();
  if (s && s.isLoggedIn && s.name) {
    const rawName = s.name.replace(/\s*\(.*?\)/g, '').trim();
    return {
      tier: 'L4',
      tierLabel: 'L4 基层现场单兵',
      name: s.name,
      uid: s.riderNo || s.riderId || 'R-8821',
      roleTitle: `${s.levelTitle || '金牌先锋'} · 专送单兵`,
      scopeLabel: `驻守 03 号餐车 · ${s.name}`,
      nodeId: 'RIDER-ZHOU',
      avatarChar: rawName ? rawName.slice(0, 1) : '陈',
      verifiedSm4: true,
      colorClass: 'bg-emerald-900 text-emerald-100 border-emerald-700'
    };
  }
  return {
    tier: 'L4',
    tierLabel: 'L4 基层现场单兵',
    name: '陈志远 (王牌骑士)',
    uid: 'R-8821',
    roleTitle: '黑曜石王牌骑士 · 专送单兵',
    scopeLabel: '驻守 03 号餐车 · 3km 履约半径',
    nodeId: 'RIDER-ZHOU',
    avatarChar: '陈',
    verifiedSm4: true,
    colorClass: 'bg-emerald-900 text-emerald-100 border-emerald-700'
  };
}

// 获取当前活跃级联身份（L3/L4 动态透传最新在岗 session 数据）
export function getActiveMeshIdentity(): ActiveMeshIdentity {
  const saved = safeGetStorage<ActiveMeshIdentity | null>(STORAGE_KEY_ACTIVE_IDENTITY, null);
  if (saved && saved.tier) {
    if (saved.tier === 'L3') {
      const live = getL3IdentityFromSession();
      return {
        ...saved,
        name: live.name,
        uid: live.uid,
        roleTitle: live.roleTitle,
        scopeLabel: live.scopeLabel,
        avatarChar: live.avatarChar
      };
    }
    if (saved.tier === 'L4') {
      const live = getL4IdentityFromSession();
      return {
        ...saved,
        name: live.name,
        uid: live.uid,
        roleTitle: live.roleTitle,
        scopeLabel: live.scopeLabel,
        avatarChar: live.avatarChar
      };
    }
    return saved;
  }
  return DEFAULT_MESH_IDENTITIES.CUSTOMER;
}

// 设置当前活跃级联身份并全网广播
export function setActiveMeshIdentity(identity: ActiveMeshIdentity): void {
  safeSetStorage(STORAGE_KEY_ACTIVE_IDENTITY, identity);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_CASCADE_IDENTITY_CHANGED, { detail: identity }));
  }
}

// 全域身份快速同步中枢：把新登入的在岗专员即时透传至级联拓扑矩阵
export function syncCascadeIdentityFromSession(
  session: MerchantSession | RiderSession | null,
  role: 'merchant' | 'rider'
): void {
  const current = getActiveMeshIdentity();
  if (role === 'merchant') {
    const updated = getL3IdentityFromSession(session as MerchantSession);
    if (current.tier === 'L3') {
      setActiveMeshIdentity(updated);
    }
  } else if (role === 'rider') {
    const updated = getL4IdentityFromSession(session as RiderSession);
    if (current.tier === 'L4') {
      setActiveMeshIdentity(updated);
    }
  }
}

// 按层级直接切换活跃身份（动态适配各端当值专员）
export function switchMeshTier(tier: MeshTierLevel, specificNodeId?: string): ActiveMeshIdentity {
  let target: ActiveMeshIdentity;
  if (tier === 'L3') {
    target = getL3IdentityFromSession();
  } else if (tier === 'L4') {
    target = getL4IdentityFromSession();
  } else {
    target = { ...DEFAULT_MESH_IDENTITIES[tier] };
  }
  if (specificNodeId) {
    target.nodeId = specificNodeId;
  }
  setActiveMeshIdentity(target);
  appendCascadeAuditLog({
    operator: 'HQ 会话鉴权中枢',
    action: `切换全域操作视角至【${target.tierLabel} · ${target.name}】`,
    targetSubject: `工号: ${target.uid} / 节点: ${target.nodeId}`
  });
  return target;
}

// 清除历史废弃旧数据/Token 键，保障纯净性
export function purgeObsoleteHistoricalTokens(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const obsoleteKeys = [
    'ur_legacy_token',
    'ur_old_permissions_token',
    'ur_temporary_token_v1',
    'ur_test_token_store'
  ];
  obsoleteKeys.forEach((k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // ignore
    }
  });
}

// 获取权限项 (自动合并全量维度，确保新增分类与新项无损补齐)
export function getCascadePermissions(): CascadePermissionItem[] {
  purgeObsoleteHistoricalTokens();
  const saved = safeGetStorage<CascadePermissionItem[]>(STORAGE_KEY_PERMISSIONS, null as any);
  if (saved && Array.isArray(saved) && saved.length > 0) {
    // 确保任何新增的 INITIAL_PERMISSION_ITEMS 均合并补齐
    const savedMap = new Map<string, CascadePermissionItem>();
    saved.forEach((item) => savedMap.set(item.id, item));
    const merged = INITIAL_PERMISSION_ITEMS.map((init) => {
      const existing = savedMap.get(init.id);
      return existing ? { ...init, enabled: existing.enabled } : init;
    });
    safeSetStorage(STORAGE_KEY_PERMISSIONS, merged);
    return merged;
  }
  safeSetStorage(STORAGE_KEY_PERMISSIONS, INITIAL_PERMISSION_ITEMS);
  return INITIAL_PERMISSION_ITEMS;
}

// 保存权限项并广播全局变动
export function saveCascadePermissions(items: CascadePermissionItem[]): void {
  safeSetStorage(STORAGE_KEY_PERMISSIONS, items);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_CASCADE_PERMISSIONS_CHANGED, { detail: items }));
  }
}

// 全域分层鉴权核心评估器 (Hierarchical Mesh Permission Evaluator)
export function evaluateMeshPermission(
  permId: string,
  userTier?: MeshTierLevel
): {
  allowed: boolean;
  item?: CascadePermissionItem;
  reason?: string;
  requiresApproval?: boolean;
  signer?: string;
  locked?: boolean;
} {
  const currentIdentity = userTier ? { tier: userTier } : getActiveMeshIdentity();
  const tier = currentIdentity.tier;
  const permissions = getCascadePermissions();
  const item = permissions.find((p) => p.id === permId);

  // 未受矩阵管控项默认放行
  if (!item) {
    return { allowed: true };
  }

  // 1. 全局开关处于关闭状态
  if (!item.enabled) {
    return {
      allowed: false,
      item,
      reason: `【${item.name}】(${item.code}) 当前在全域拓扑矩阵中已被全局置灰停用，需管理员点亮放行`
    };
  }

  // 2. 权限项被锁定 (特权锁)
  if (item.locked) {
    // L0 超管和 L5 审计席可拥有豁免审核权，其余层级拦截
    if (tier !== 'L0' && tier !== 'L5') {
      return {
        allowed: false,
        item,
        locked: true,
        reason: `【${item.name}】属于高阶锁定项：${item.lockReason || '须由总部超管或独立审计席联合签批豁免'}`
      };
    }
  }

  // 3. 层级与等级匹配规则 (SEC-L1 ~ SEC-L5)
  // L0 最高超管拥有除 L5 独立审计特殊隔离外的全权
  if (tier === 'L0') {
    return { allowed: true, item };
  }

  // 极高危熔断权限 (SEC-L4) 仅限 L0 执行 (此时 tier 已排除 L0)
  if (item.level === 'SEC-L4') {
    return {
      allowed: false,
      item,
      reason: `【${item.name}】为 SEC-L4 极高危熔断权，当前【${currentIdentity.tier}】无权执行，须由 L0 最高超管联合签署`
    };
  }

  // 审计专权 (SEC-L5) 仅限 L5 审计员方敏慧调阅回溯 (此时 tier 已排除 L0)
  if (item.level === 'SEC-L5' && tier !== 'L5') {
    return {
      allowed: false,
      item,
      reason: `【${item.name}】为 SEC-L5 特权，仅限 L5 独立审计席 (方敏慧) 调阅回溯`
    };
  }

  // 审批要求项 (Requires Approval)
  if (item.requiresApproval) {
    // 若操作人已经是总监 (L2) 或商圈主控 (L1)，允许自主签署或放行
    if (tier !== 'L1' && tier !== 'L2') {
      return {
        allowed: false,
        requiresApproval: true,
        signer: item.approvalSigner || 'L2 战区总监 赵志成',
        item,
        reason: `【${item.name}】需经上级【${item.approvalSigner || 'L2 战区总监 赵志成'}】复核签署后方可执行`
      };
    }
  }

  // 食客端限制
  if (tier === 'CUSTOMER') {
    const customerAllowedIds = ['PERM_GPS_BROADCAST', 'PERM_VOIP_CALL', 'PERM_PROOF_HASH'];
    if (!customerAllowedIds.includes(permId)) {
      return {
        allowed: false,
        item,
        reason: `食客端无权调用内部运维/调度权限【${item.name}】`
      };
    }
  }

  return { allowed: true, item };
}

// 切换某个权限项的开关
export function toggleCascadePermission(id: string): CascadePermissionItem[] {
  const current = getCascadePermissions();
  const updated = current.map((item) => {
    if (item.id === id) {
      if (item.locked) return item; // 锁定项不切换
      return { ...item, enabled: !item.enabled };
    }
    return item;
  });
  saveCascadePermissions(updated);
  return updated;
}

// 应用【金牌骑手】基准 (放权 10 项常用高频放行权限)
export function applyGoldRiderPreset(): CascadePermissionItem[] {
  const goldAllowedIds = [
    'PERM_GPS_BROADCAST',
    'PERM_OVERFLOW_GRAB',
    'PERM_GEOFENCE_BYPASS',
    'PERM_INTERCOM_VOICE',
    'PERM_PROOF_HASH',
    'PERM_VOIP_CALL',
    'PERM_REQ_TRANSFER',
    'PERM_SKU_OFFSHELF',
    'PERM_TEMP_SENSOR',
    'PERM_SPLIT_LEDGER',
    'PERM_CASH_COLLECT'
  ];
  const current = getCascadePermissions();
  const updated = current.map((item) => ({
    ...item,
    enabled: item.locked ? false : goldAllowedIds.includes(item.id)
  }));
  saveCascadePermissions(updated);
  return updated;
}

// 一键全开特权 (非锁定的均开放)
export function applyAllOpenPreset(): CascadePermissionItem[] {
  const current = getCascadePermissions();
  const updated = current.map((item) => ({
    ...item,
    enabled: item.locked ? false : true
  }));
  saveCascadePermissions(updated);
  return updated;
}

// 重置岗位基线
export function resetBaselinePreset(): CascadePermissionItem[] {
  safeSetStorage(STORAGE_KEY_PERMISSIONS, INITIAL_PERMISSION_ITEMS);
  return INITIAL_PERMISSION_ITEMS;
}

// 特权提权申请 / 临时豁免放行
export function requestElevatedPrivilege(
  permId: string,
  durationMinutes: number,
  reason: string,
  operatorName: string = '方敏慧 (L5 审计席)'
): { success: boolean; item?: CascadePermissionItem } {
  const current = getCascadePermissions();
  const target = current.find((p) => p.id === permId);
  if (!target) return { success: false };

  // 临时点亮权限
  const updated = current.map((p) => {
    if (p.id === permId) {
      return { ...p, enabled: true, locked: false, lockReason: `临时提权放行 (${durationMinutes}分钟): ${reason}` };
    }
    return p;
  });
  saveCascadePermissions(updated);

  appendCascadeAuditLog({
    operator: operatorName,
    action: `签批特权提权 [${target.name}] 有效期 ${durationMinutes} 分钟`,
    targetSubject: `单兵: 周凯 (R-SHW-082) · 事由: ${reason}`
  });

  return { success: true, item: updated.find((p) => p.id === permId) };
}

// 全部门基线同步
export function syncDepartmentBaselines(
  districtName: string = '苏河湾战区',
  operatorName: string = '方敏慧 (L5 审计席)'
): { syncedCount: number; riders: string[] } {
  const riders = ['周凯 (R-SHW-082)', '李想 (R-SHW-083)', '王涛 (R-SHW-084)', '陈晨 (R-SHW-085)'];
  
  appendCascadeAuditLog({
    operator: operatorName,
    action: `全部门基线同步广播至 ${districtName}`,
    targetSubject: `共覆盖 ${riders.length} 名在岗专线骑手与 2 辆流动餐车`
  });

  return { syncedCount: riders.length, riders };
}

// 生成分发权限模板签名与载荷
export function generateTemplateDistributionPayload(templateType: string = 'gold_rider'): {
  templateCode: string;
  signatureToken: string;
  targetRole: string;
  jsonPayload: string;
  validPeriod: string;
} {
  const token = generateFreshMeshToken();
  const templateCode = `TPL-MESH-${templateType.toUpperCase()}-2026`;
  const perms = getCascadePermissions();
  const grantedCodes = perms.filter((p) => p.enabled).map((p) => p.code);

  const payload = {
    templateCode,
    version: '4.9.2',
    timestamp: new Date().toISOString(),
    sm4Token: token,
    grantedPermissionsCount: grantedCodes.length,
    permissions: grantedCodes
  };

  return {
    templateCode,
    signatureToken: token,
    targetRole: templateType === 'gold_rider' ? '金牌专送骑手' : '标准轮值单兵',
    jsonPayload: JSON.stringify(payload, null, 2),
    validPeriod: '72 小时 (自动失效)'
  };
}

// 关联工单
export function getAssociatedWorkOrder(): AssociatedWorkOrder {
  const saved = safeGetStorage<AssociatedWorkOrder>(STORAGE_KEY_WORK_ORDER, null as any);
  if (saved) return saved;
  safeSetStorage(STORAGE_KEY_WORK_ORDER, INITIAL_WORK_ORDER);
  return INITIAL_WORK_ORDER;
}

export function updateWorkOrderStatus(status: 'approved' | 'rejected' | 'pending'): AssociatedWorkOrder {
  const current = getAssociatedWorkOrder();
  const updated: AssociatedWorkOrder = {
    ...current,
    status,
    approver: status === 'pending' ? undefined : '方敏慧 (L5 审计席)',
    approvedTime: status === 'pending' ? undefined : new Date().toLocaleTimeString('zh-CN', { hour12: false })
  };
  safeSetStorage(STORAGE_KEY_WORK_ORDER, updated);

  // 如果审批通过，自动开启关联的跨车溢出特权与状态
  if (status === 'approved') {
    const perms = getCascadePermissions().map((p) => {
      if (p.id === 'PERM_OVERFLOW_GRAB' || p.id === 'PERM_REQ_TRANSFER') {
        return { ...p, enabled: true };
      }
      return p;
    });
    saveCascadePermissions(perms);
  }

  // 写入审计日志
  if (status !== 'pending') {
    appendCascadeAuditLog({
      operator: '方敏慧 (L5 审计)',
      action: status === 'approved' ? '核准通过工单 #AUTH-9902 并授权' : '驳回工单 #AUTH-9902',
      targetSubject: '周凯 (R-SHW-082) ↔ 04号车'
    });
  }

  return updated;
}

// 审计日志
export function getCascadeAuditLogs(): CascadeAuditLog[] {
  const saved = safeGetStorage<CascadeAuditLog[]>(STORAGE_KEY_AUDIT_LOGS, null as any);
  if (saved && Array.isArray(saved)) return saved;
  safeSetStorage(STORAGE_KEY_AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  return INITIAL_AUDIT_LOGS;
}

export function appendCascadeAuditLog(log: Omit<CascadeAuditLog, 'id' | 'timestamp' | 'meshHash'>): CascadeAuditLog {
  const current = getCascadeAuditLogs();
  const newLog: CascadeAuditLog = {
    ...log,
    id: `LOG-${Date.now().toString().slice(-4)}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    meshHash: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`
  };
  const updated = [newLog, ...current.slice(0, 49)];
  safeSetStorage(STORAGE_KEY_AUDIT_LOGS, updated);
  return newLog;
}

// ==================== 6. 实体名称动态修改与层级管辖穿透引擎 ====================
const STORAGE_KEY_CUSTOM_ENTITIES = 'ur_cascade_mesh_custom_entities_v4_9';

export interface CustomEntitiesStore {
  districts?: Record<string, Partial<CascadeDistrictNode>>;
  directors?: Record<string, Partial<CascadeDirectorNode>>;
  trucks?: Record<string, Partial<CascadeTruckNode>>;
  riders?: Record<string, Partial<CascadeRiderNode>>;
  superAdmins?: Record<string, Partial<CascadeSuperAdminNode>>;
  masterControllers?: Record<string, Partial<CascadeMasterControllerNode>>;
}

function getCustomEntitiesStore(): CustomEntitiesStore {
  return safeGetStorage<CustomEntitiesStore>(STORAGE_KEY_CUSTOM_ENTITIES, {}) || {};
}

function saveCustomEntitiesStore(store: CustomEntitiesStore): void {
  safeSetStorage(STORAGE_KEY_CUSTOM_ENTITIES, store);
}

// 1. 获取最高级账号组 (支持一个或多个最高管理账号)
export function getCascadeSuperAdmins(): CascadeSuperAdminNode[] {
  const store = getCustomEntitiesStore();
  const overrides = store.superAdmins || {};
  return INITIAL_SUPER_ADMINS.map((admin) => ({
    ...admin,
    ...(overrides[admin.id] || {})
  }));
}

// 2. 获取商圈主控管理用户
export function getCascadeMasterControllers(): CascadeMasterControllerNode[] {
  const store = getCustomEntitiesStore();
  const overrides = store.masterControllers || {};
  return INITIAL_MASTER_CONTROLLERS.map((ctrl) => ({
    ...ctrl,
    ...(overrides[ctrl.id] || {})
  }));
}

// 获取某商圈下的主控管理用户列表
export function getMasterControllersByDistrictId(districtId: string): CascadeMasterControllerNode[] {
  const all = getCascadeMasterControllers();
  return all.filter((c) => c.districtId === districtId);
}

// 3. 获取区域/商圈列表 (动态合并自定义名称)
export function getCascadeDistricts(): CascadeDistrictNode[] {
  const store = getCustomEntitiesStore();
  const overrides = store.districts || {};
  return INITIAL_DISTRICTS.map((dist) => ({
    ...dist,
    ...(overrides[dist.id] || {})
  }));
}

// 4. 获取指挥总监列表 (动态合并自定义名称)
export function getCascadeDirectors(): CascadeDirectorNode[] {
  const store = getCustomEntitiesStore();
  const overrides = store.directors || {};
  return INITIAL_DIRECTORS.map((dir) => ({
    ...dir,
    ...(overrides[dir.id] || {})
  }));
}

// 5. 获取移动餐车列表 (动态合并自定义名称)
export function getCascadeTrucks(): CascadeTruckNode[] {
  const store = getCustomEntitiesStore();
  const overrides = store.trucks || {};
  return INITIAL_TRUCKS.map((truck) => ({
    ...truck,
    ...(overrides[truck.id] || {})
  }));
}

// 6. 获取基层单兵/骑手列表 (动态合并自定义名称)
export function getCascadeRiders(): CascadeRiderNode[] {
  const store = getCustomEntitiesStore();
  const overrides = store.riders || {};
  return INITIAL_RIDERS.map((rider) => ({
    ...rider,
    ...(overrides[rider.id] || {})
  }));
}

// ★ 核心功能：按战区总监查询管辖的所有餐车
export function getTrucksByDirectorId(directorId: string): CascadeTruckNode[] {
  const trucks = getCascadeTrucks();
  const directors = getCascadeDirectors();
  const director = directors.find((d) => d.id === directorId);
  if (!director) return trucks.filter((t) => t.directorId === directorId);
  return trucks.filter((t) => director.managedTruckIds.includes(t.id) || t.directorId === directorId);
}

// 修改区域/商圈名称
export function updateCascadeDistrictName(id: string, newName: string): CascadeDistrictNode[] {
  const store = getCustomEntitiesStore();
  store.districts = store.districts || {};
  store.districts[id] = { ...store.districts[id], name: newName };
  saveCustomEntitiesStore(store);
  appendCascadeAuditLog({
    operator: 'HQ 最高控制台',
    action: `修改商圈名称为【${newName}】`,
    targetSubject: `商圈 ID: ${id}`
  });
  return getCascadeDistricts();
}

// 修改战区总监名称及职称
export function updateCascadeDirectorName(id: string, newName: string, title?: string, jobTitle?: string): CascadeDirectorNode[] {
  const store = getCustomEntitiesStore();
  store.directors = store.directors || {};
  store.directors[id] = {
    ...store.directors[id],
    name: newName,
    ...(title ? { title } : {}),
    ...(jobTitle ? { jobTitle } : {})
  };
  saveCustomEntitiesStore(store);
  appendCascadeAuditLog({
    operator: 'HQ 最高控制台',
    action: `修改战区总监档案为【${newName}】`,
    targetSubject: `总监 ID: ${id}`
  });
  return getCascadeDirectors();
}

// 修改移动餐车名称及车长
export function updateCascadeTruckName(id: string, newName: string, chefName?: string): CascadeTruckNode[] {
  const store = getCustomEntitiesStore();
  store.trucks = store.trucks || {};
  store.trucks[id] = {
    ...store.trucks[id],
    name: newName,
    ...(chefName ? { chefName } : {})
  };
  saveCustomEntitiesStore(store);
  appendCascadeAuditLog({
    operator: 'HQ 最高控制台',
    action: `修改移动餐车站台名称为【${newName}】`,
    targetSubject: `餐车 ID: ${id}`
  });
  return getCascadeTrucks();
}

// 修改基层单兵骑手名称及岗位
export function updateCascadeRiderName(id: string, newName: string, role?: string, jobPosition?: string): CascadeRiderNode[] {
  const store = getCustomEntitiesStore();
  store.riders = store.riders || {};
  const shortName = newName.replace(/\s*\(.*?\)\s*/g, '').trim();
  store.riders[id] = {
    ...store.riders[id],
    name: newName,
    shortName: shortName || newName,
    ...(role ? { role } : {}),
    ...(jobPosition ? { jobPosition } : {})
  };
  saveCustomEntitiesStore(store);
  appendCascadeAuditLog({
    operator: 'HQ 最高控制台',
    action: `修改基层单兵名称为【${newName}】`,
    targetSubject: `单兵 ID: ${id}`
  });
  return getCascadeRiders();
}

// 一键重置所有实体名称至默认初始值
export function resetCascadeEntityNames(): void {
  safeSetStorage(STORAGE_KEY_CUSTOM_ENTITIES, {});
  appendCascadeAuditLog({
    operator: 'HQ 最高控制台',
    action: '重置全域商圈、总监、餐车与单兵实体名称至出厂基准',
    targetSubject: '全域实体命名'
  });
}

export const resetCascadeEntitiesStore = resetCascadeEntityNames;


