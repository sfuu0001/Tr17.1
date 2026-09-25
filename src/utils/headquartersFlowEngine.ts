/**
 * Urban Radar 流动餐车 GPS 极速专送平台 - 总部分级权限、组件功能授权、流量分流与状态分层引擎
 */

import { safeGetStorage, safeSetStorage } from './safeStorage';

// ==================== 1. 总部分级角色体系 (L1 - L5) ====================
export type HeadquartersTier = 'L1_HQ_SUPER' | 'L2_REGION_DIRECTOR' | 'L3_STATION_MASTER' | 'L4_TRUCK_LEAD' | 'L5_AUDIT_COMPLIANCE';

export interface HeadquartersRoleMeta {
  tier: HeadquartersTier;
  level: number;
  name: string;
  shortName: string;
  badgeColor: string;
  themeColor: string;
  description: string;
  defaultDataScope: 'global' | 'regional' | 'station' | 'single_truck' | 'audit_readonly';
  allowedTrucksCount: string;
  canApproveDualControl: boolean;
}

export const HEADQUARTERS_ROLES: Record<HeadquartersTier, HeadquartersRoleMeta> = {
  L1_HQ_SUPER: {
    tier: 'L1_HQ_SUPER',
    level: 1,
    name: '集团全域超级管理控制中心',
    shortName: 'L1 集团超管',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
    themeColor: '#e11d48',
    description: '全网全域主控：掌控平台底层费率、应急全网熔断降级闸、资金清算划拨与特权审批。',
    defaultDataScope: 'global',
    allowedTrucksCount: '全域餐车 (100%)',
    canApproveDualControl: true
  },
  L2_REGION_DIRECTOR: {
    tier: 'L2_REGION_DIRECTOR',
    level: 2,
    name: '城市/战区运营总监',
    shortName: 'L2 战区总监',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    themeColor: '#9333ea',
    description: '商圈与战区车队统筹：餐车泊位选址、商圈电子围栏解禁越界审批、战区抽佣浮动与跨车协调。',
    defaultDataScope: 'regional',
    allowedTrucksCount: '战区集群 (8-15 辆)',
    canApproveDualControl: true
  },
  L3_STATION_MASTER: {
    tier: 'L3_STATION_MASTER',
    level: 3,
    name: '片区站长 / 调度督导',
    shortName: 'L3 调度督导',
    badgeColor: 'bg-sky-100 text-sky-900 border-sky-300',
    themeColor: '#0284c7',
    description: '实时网格运力管控：餐车超载跨车转单调拨、骑手在途干预、SLA 超时接管、后厨现场抽检。',
    defaultDataScope: 'station',
    allowedTrucksCount: '片区微网格 (3-6 辆)',
    canApproveDualControl: false
  },
  L4_TRUCK_LEAD: {
    tier: 'L4_TRUCK_LEAD',
    level: 4,
    name: '流动餐车站长 / 档口主理人',
    shortName: 'L4 餐车站长',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    themeColor: '#059669',
    description: '单车实体营运：菜品实时沽清/现烤上架、出餐质检验真拍照、单车收银台开单与核销单签发。',
    defaultDataScope: 'single_truck',
    allowedTrucksCount: '指定单一餐车 (1 辆)',
    canApproveDualControl: false
  },
  L5_AUDIT_COMPLIANCE: {
    tier: 'L5_AUDIT_COMPLIANCE',
    level: 5,
    name: '特许合规与财务审计专员',
    shortName: 'L5 合规审计',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    themeColor: '#d97706',
    description: '纯只读安全审计：GPS巡航轨迹全量追溯、商圈越界排查、财务清算台账 CSV 导出与合规存档。',
    defaultDataScope: 'audit_readonly',
    allowedTrucksCount: '只读审计全域',
    canApproveDualControl: false
  }
};

// ==================== 1.5 组织在编人员档案库 (Staff & User Directory) ====================
export interface HeadquartersStaffUser {
  id: string;
  name: string;
  displayName: string;
  avatar: string;
  tier: HeadquartersTier;
  roleTitle: string;
  employeeId: string;
  phone: string;
  assignedScopeType: 'all' | 'district' | 'truck';
  assignedScopeId: string;
  assignedScopeName: string;
  status: 'online' | 'busy' | 'offline';
  lastActive: string;
  directPermissions?: string[]; // 人员专属直接赋权/白名单
}

export const DEFAULT_STAFF_USERS: HeadquartersStaffUser[] = [
  {
    id: 'USR-AE-01',
    name: '陈志远 (AE)',
    displayName: 'AE · 集团总架构师',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    tier: 'L1_HQ_SUPER',
    roleTitle: '集团总系统架构师 & 全域超级管理员',
    employeeId: 'HQ-AE-001',
    phone: '186-0218-8888',
    assignedScopeType: 'all',
    assignedScopeId: 'all',
    assignedScopeName: '集团全域 6 辆餐车及战区中枢',
    status: 'online',
    lastActive: '当前在线',
    directPermissions: ['COMP_KILL_SWITCH', 'COMP_GLOBAL_COMMISSION', 'COMP_CROSS_TRUCK_TRANSFER', 'COMP_SURGE_PRICING', 'COMP_INTERCOM_BROADCAST', 'COMP_INVOICE_SETTLEMENT', 'COMP_GEOFENCE_OVERRIDE', 'COMP_FINANCE_CSV_EXPORT']
  },
  {
    id: 'USR-HQ-02',
    name: '林梦华',
    displayName: '林梦华 · 集团运营VP',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    tier: 'L1_HQ_SUPER',
    roleTitle: '集团高级运营副总裁 / 双人复核常任理事',
    employeeId: 'HQ-002',
    phone: '139-1122-3344',
    assignedScopeType: 'all',
    assignedScopeId: 'all',
    assignedScopeName: '集团全域 6 辆餐车及战区中枢',
    status: 'online',
    lastActive: '2分钟前',
    directPermissions: ['COMP_KILL_SWITCH', 'COMP_GLOBAL_COMMISSION', 'COMP_CROSS_TRUCK_TRANSFER', 'COMP_GEOFENCE_OVERRIDE']
  },
  {
    id: 'USR-REG-01',
    name: '赵海鹏',
    displayName: '赵海鹏 · 华东战区总监',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    tier: 'L2_REGION_DIRECTOR',
    roleTitle: '华东核心商圈战区运营总监',
    employeeId: 'REG-EAST-01',
    phone: '138-1234-5678',
    assignedScopeType: 'district',
    assignedScopeId: 'district-jingan',
    assignedScopeName: '静安CBD & 苏河湾战区 (01/02/03/04号车)',
    status: 'online',
    lastActive: '5分钟前',
    directPermissions: ['COMP_CROSS_TRUCK_TRANSFER', 'COMP_SURGE_PRICING', 'COMP_INTERCOM_BROADCAST', 'COMP_GEOFENCE_OVERRIDE']
  },
  {
    id: 'USR-REG-02',
    name: '钱思敏',
    displayName: '钱思敏 · 浦东张江总监',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
    tier: 'L2_REGION_DIRECTOR',
    roleTitle: '张江科技创新园区战区总监',
    employeeId: 'REG-EAST-02',
    phone: '137-9876-5432',
    assignedScopeType: 'district',
    assignedScopeId: 'district-zhangjiang',
    assignedScopeName: '张江集成电港创新园区 (05/06号车)',
    status: 'online',
    lastActive: '刚刚',
    directPermissions: ['COMP_CROSS_TRUCK_TRANSFER', 'COMP_SURGE_PRICING', 'COMP_INTERCOM_BROADCAST']
  },
  {
    id: 'USR-ST-01',
    name: '孙铭',
    displayName: '孙铭 · 静安片区站长',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    tier: 'L3_STATION_MASTER',
    roleTitle: '静安大悦城微网格调度督导',
    employeeId: 'ST-JINGAN-01',
    phone: '135-2233-4455',
    assignedScopeType: 'truck',
    assignedScopeId: 'truck-01',
    assignedScopeName: '01号车 (翡翠青) & 02号车 (曜岩灰)',
    status: 'online',
    lastActive: '当前在线',
    directPermissions: ['COMP_CROSS_TRUCK_TRANSFER', 'COMP_INTERCOM_BROADCAST']
  },
  {
    id: 'USR-ST-02',
    name: '周小川',
    displayName: '周小川 · 苏河湾站长',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
    tier: 'L3_STATION_MASTER',
    roleTitle: '苏河湾万象天地调度督导',
    employeeId: 'ST-SUHE-02',
    phone: '136-3344-5566',
    assignedScopeType: 'truck',
    assignedScopeId: 'truck-03',
    assignedScopeName: '03号车 (极光蓝) & 04号车 (星云紫)',
    status: 'online',
    lastActive: '10分钟前',
    directPermissions: ['COMP_CROSS_TRUCK_TRANSFER', 'COMP_INTERCOM_BROADCAST']
  },
  {
    id: 'USR-TK-01',
    name: '王建国',
    displayName: '王建国 · 01号车站长',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    tier: 'L4_TRUCK_LEAD',
    roleTitle: '01号流动餐车店长兼炭烤主理人',
    employeeId: 'TK-ALPHA-01',
    phone: '131-4455-6677',
    assignedScopeType: 'truck',
    assignedScopeId: 'truck-01',
    assignedScopeName: '黑曜石 01 号流动餐车 (大悦城南广场)',
    status: 'online',
    lastActive: '当前出餐中',
    directPermissions: ['COMP_INVOICE_SETTLEMENT']
  },
  {
    id: 'USR-TK-02',
    name: '李雪梅',
    displayName: '李雪梅 · 02号车店长',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    tier: 'L4_TRUCK_LEAD',
    roleTitle: '02号流动餐车店长兼烘焙主管',
    employeeId: 'TK-BETA-02',
    phone: '132-5566-7788',
    assignedScopeType: 'truck',
    assignedScopeId: 'truck-02',
    assignedScopeName: '黑曜石 02 号流动餐车 (北座连廊)',
    status: 'busy',
    lastActive: '高峰出餐中',
    directPermissions: ['COMP_INVOICE_SETTLEMENT']
  },
  {
    id: 'USR-TK-03',
    name: '张大勇',
    displayName: '张大勇 · 03号车站长',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
    tier: 'L4_TRUCK_LEAD',
    roleTitle: '03号流动餐车站长',
    employeeId: 'TK-GAMMA-03',
    phone: '133-6677-8899',
    assignedScopeType: 'truck',
    assignedScopeId: 'truck-03',
    assignedScopeName: '黑曜石 03 号流动餐车 (万象天地)',
    status: 'online',
    lastActive: '当前在线',
    directPermissions: ['COMP_INVOICE_SETTLEMENT']
  },
  {
    id: 'USR-TK-04',
    name: '陆晓峰',
    displayName: '陆晓峰 · 04号车站长',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
    tier: 'L4_TRUCK_LEAD',
    roleTitle: '04号流动餐车站长',
    employeeId: 'TK-DELTA-04',
    phone: '134-7788-9900',
    assignedScopeType: 'truck',
    assignedScopeId: 'truck-04',
    assignedScopeName: '黑曜石 04 号流动餐车 (静安国际中心)',
    status: 'online',
    lastActive: '巡航备餐中',
    directPermissions: ['COMP_INVOICE_SETTLEMENT']
  },
  {
    id: 'USR-AUD-01',
    name: '黄立成',
    displayName: '黄立成 · 合规稽查专员',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
    tier: 'L5_AUDIT_COMPLIANCE',
    roleTitle: '全网食品特许合规与GPS越界稽核专员',
    employeeId: 'AUD-FOOD-01',
    phone: '180-8899-0011',
    assignedScopeType: 'all',
    assignedScopeId: 'all',
    assignedScopeName: '全域餐车合规稽核 (纯只读)',
    status: 'online',
    lastActive: '在线审计中',
    directPermissions: ['COMP_FINANCE_CSV_EXPORT']
  },
  {
    id: 'USR-AUD-02',
    name: '郑雅婷',
    displayName: '郑雅婷 · 财务清算审计员',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    tier: 'L5_AUDIT_COMPLIANCE',
    roleTitle: '商户分润资金清算与税务审计员',
    employeeId: 'AUD-FIN-02',
    phone: '181-9900-1122',
    assignedScopeType: 'all',
    assignedScopeId: 'all',
    assignedScopeName: '资金清算台账审计 (纯只读)',
    status: 'online',
    lastActive: '在线审计中',
    directPermissions: ['COMP_FINANCE_CSV_EXPORT']
  }
];

// ==================== 1.6 可视化效果与实时开关状态 ====================
export interface VisualLiveEffectState {
  killSwitchActive: boolean; // 应急一键熔断降级闸
  killSwitchScope: 'all' | string; // 熔断作用域: 'all' 或单车 ID
  overflowEnabled: boolean; // 跨车应急转单溢出分流
  overflowRatio: number; // 0 - 100 溢出比率
  surgeEnabled: boolean; // 动态运价加价杠杆
  surgeMultiplier: number; // 1.0 - 2.5
  intercomActive: boolean; // 专线车载对讲广播通道
  geofenceUnlocked: boolean; // 商圈电子围栏临时特批通行
  billingEnabled: boolean; // 单车收银台核销发票签发
}

export const DEFAULT_LIVE_EFFECT_STATE: VisualLiveEffectState = {
  killSwitchActive: false,
  killSwitchScope: 'all',
  overflowEnabled: true,
  overflowRatio: 30,
  surgeEnabled: false,
  surgeMultiplier: 1.2,
  intercomActive: true,
  geofenceUnlocked: false,
  billingEnabled: true
};

// ==================== 2. 组件功能授权清单定义 ====================
export type ComponentRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ComponentFeatureDef {
  id: string;
  name: string;
  category: 'core_control' | 'dispatch_flow' | 'finance_rate' | 'kitchen_pos' | 'compliance_audit';
  riskLevel: ComponentRiskLevel;
  description: string;
  requiresDualApproval: boolean;
  defaultAllowedTiers: HeadquartersTier[];
}

export const COMPONENT_FEATURE_CATALOG: ComponentFeatureDef[] = [
  {
    id: 'COMP_KILL_SWITCH',
    name: '全域突发应急一键熔断降级闸',
    category: 'core_control',
    riskLevel: 'CRITICAL',
    description: '极端恶劣天气或安全事故时，全域一键强制暂停接单、广播暂停并冻结在线履约。',
    requiresDualApproval: true,
    defaultAllowedTiers: ['L1_HQ_SUPER']
  },
  {
    id: 'COMP_GLOBAL_COMMISSION',
    name: '平台基础分账抽佣规则与费率配置器',
    category: 'finance_rate',
    riskLevel: 'HIGH',
    description: '调控全网餐车基准分润比例、骑手配送分成基准线与固定服务费。',
    requiresDualApproval: true,
    defaultAllowedTiers: ['L1_HQ_SUPER', 'L2_REGION_DIRECTOR']
  },
  {
    id: 'COMP_CROSS_TRUCK_TRANSFER',
    name: '跨餐车站口应急转单与运力调拨中枢',
    category: 'dispatch_flow',
    riskLevel: 'MEDIUM',
    description: '将超负荷餐车排队订单一键分流调拨给 1.5km 范围内的兄弟餐车协同出餐。',
    requiresDualApproval: false,
    defaultAllowedTiers: ['L1_HQ_SUPER', 'L2_REGION_DIRECTOR', 'L3_STATION_MASTER']
  },
  {
    id: 'COMP_SURGE_PRICING',
    name: '商圈动态运价杠杆与天气加价引擎',
    category: 'finance_rate',
    riskLevel: 'MEDIUM',
    description: '暴雨/高峰期启动智能运价上浮 1.2x~2.0x，定向补偿在途专线骑手。',
    requiresDualApproval: false,
    defaultAllowedTiers: ['L1_HQ_SUPER', 'L2_REGION_DIRECTOR']
  },
  {
    id: 'COMP_INTERCOM_BROADCAST',
    name: '专线车载对讲强插广播与高精信标发射机',
    category: 'dispatch_flow',
    riskLevel: 'MEDIUM',
    description: '向全网或战区骑手车载端强插下发语音调度广播，广播平台时空基准信标。',
    requiresDualApproval: false,
    defaultAllowedTiers: ['L1_HQ_SUPER', 'L2_REGION_DIRECTOR', 'L3_STATION_MASTER']
  },
  {
    id: 'COMP_INVOICE_SETTLEMENT',
    name: '餐车核销账单签发与顾客开票台',
    category: 'kitchen_pos',
    riskLevel: 'LOW',
    description: '签发具备加密防伪编码的实物提货账单卡，确认履约完成并沉淀税务凭据。',
    requiresDualApproval: false,
    defaultAllowedTiers: ['L1_HQ_SUPER', 'L2_REGION_DIRECTOR', 'L4_TRUCK_LEAD']
  },
  {
    id: 'COMP_GEOFENCE_OVERRIDE',
    name: '特许商圈营运电子围栏越界特批解禁',
    category: 'compliance_audit',
    riskLevel: 'HIGH',
    description: '审批餐车驶出约定泊位巡航时的临时通行许可，抑制越界报警与保证金扣罚。',
    requiresDualApproval: true,
    defaultAllowedTiers: ['L1_HQ_SUPER', 'L2_REGION_DIRECTOR']
  },
  {
    id: 'COMP_FINANCE_CSV_EXPORT',
    name: '全域财务清算与商户净收益台账 CSV 导出',
    category: 'finance_rate',
    riskLevel: 'MEDIUM',
    description: '打包导出订单流水、商户抽成净额、骑手赏金扣缴与税务备查明细。',
    requiresDualApproval: false,
    defaultAllowedTiers: ['L1_HQ_SUPER', 'L2_REGION_DIRECTOR', 'L5_AUDIT_COMPLIANCE']
  }
];

// ==================== 3. 流量分流与调度策略配置 ====================
export interface SplitFlowRule {
  id: string;
  name: string;
  type: 'capacity_overflow' | 'ab_strategy' | 'vip_priority' | 'canary_feature';
  enabled: boolean;
  ratioPercent: number; // 0 - 100
  sourceLabel: string;
  targetALabel: string;
  targetBLabel: string;
  targetARatio: number;
  targetBRatio: number;
  criteria: string;
  estimatedQps: number;
  healthStatus: 'healthy' | 'stressed' | 'balanced';
}

export const DEFAULT_SPLIT_RULES: SplitFlowRule[] = [
  {
    id: 'RULE_CAPACITY_OVERFLOW',
    name: '餐车后厨超载自动溢出分流 (Spillover Routing)',
    type: 'capacity_overflow',
    enabled: true,
    ratioPercent: 30,
    sourceLabel: '主营运餐车备餐队列',
    targetALabel: '本地直接炭烤制作 (70%)',
    targetBLabel: '溢出转派临近协同备用车 (30%)',
    targetARatio: 70,
    targetBRatio: 30,
    criteria: '当主餐车待出餐单数 > 6 单或等待预估 > 20分钟触发',
    estimatedQps: 42,
    healthStatus: 'balanced'
  },
  {
    id: 'RULE_AB_STRATEGY',
    name: 'A/B 履约路径动态分流 (Canary Dispatch)',
    type: 'ab_strategy',
    enabled: true,
    ratioPercent: 50,
    sourceLabel: '全网普通外送订单',
    targetALabel: '就近物理餐车首发直配 (80%)',
    targetBLabel: '动态热力中心虚拟中转 (20%)',
    targetARatio: 80,
    targetBRatio: 20,
    criteria: '基于蜂窝网格实时路况与红绿灯延迟模型分配',
    estimatedQps: 118,
    healthStatus: 'healthy'
  },
  {
    id: 'RULE_VIP_PRIORITY',
    name: '黑金会员特权绿色快速通道 (VIP Fast-Track)',
    type: 'vip_priority',
    enabled: true,
    ratioPercent: 100,
    sourceLabel: '黑金/企业常客订单',
    targetALabel: '金牌专线骑手优先接单 (100%)',
    targetBLabel: '普通派单池 (0%)',
    targetARatio: 100,
    targetBRatio: 0,
    criteria: '黑金食客 0秒响应、优先锁定扒炉前排、配备双层控温箱',
    estimatedQps: 26,
    healthStatus: 'healthy'
  },
  {
    id: 'RULE_CANARY_FEATURE',
    name: '新版现烤合单推荐算法灰度分流 (Algorithm Canary)',
    type: 'canary_feature',
    enabled: true,
    ratioPercent: 35,
    sourceLabel: '食客进入联络室加单',
    targetALabel: '新版时空热力智能推荐 (35%)',
    targetBLabel: '经典热销固定单品 (65%)',
    targetARatio: 35,
    targetBRatio: 65,
    criteria: '按用户 DeviceFingerprint 散列平滑灰度分配',
    estimatedQps: 58,
    healthStatus: 'balanced'
  }
];

// ==================== 4. 状态分层分流拓扑模型 ====================
export interface FlowStateNode {
  id: string;
  layer: 'ingress' | 'dispatch' | 'intransit' | 'settlement';
  layerName: string;
  name: string;
  subText: string;
  activeCount: number;
  flowThroughputRps: number;
  status: 'normal' | 'pulsing' | 'diverting' | 'warning';
  splitBranch?: string;
  slaAvgSeconds: number;
}

export const STATE_FLOW_PIPELINE: FlowStateNode[] = [
  // Layer 1: 接入与鉴权分流
  {
    id: 'NODE_INGRESS_AUTH',
    layer: 'ingress',
    layerName: '第一层 · 接入与网关鉴权',
    name: '全域请求接入与角色鉴权网关',
    subText: '食客端/POS/第三方聚合',
    activeCount: 168,
    flowThroughputRps: 124,
    status: 'normal',
    slaAvgSeconds: 0.12
  },
  {
    id: 'NODE_SPLIT_ROUTER',
    layer: 'ingress',
    layerName: '第一层 · 接入与网关鉴权',
    name: '动态时空分流路由中枢',
    subText: 'A/B策略 · 溢出分流 · VIP专线',
    activeCount: 42,
    flowThroughputRps: 124,
    status: 'diverting',
    splitBranch: '分流至 4 条支路',
    slaAvgSeconds: 0.25
  },

  // Layer 2: 运力与后厨备餐分流
  {
    id: 'NODE_KITCHEN_LOCAL',
    layer: 'dispatch',
    layerName: '第二层 · 运力调度与后厨制作',
    name: '主营运餐车 KDS 现烤出炉',
    subText: '70% 本地常规烤架出品',
    activeCount: 65,
    flowThroughputRps: 78,
    status: 'pulsing',
    slaAvgSeconds: 380
  },
  {
    id: 'NODE_KITCHEN_SPILLOVER',
    layer: 'dispatch',
    layerName: '第二层 · 运力调度与后厨制作',
    name: '溢出协同餐车备餐 (1.5km)',
    subText: '30% 峰值排队溢出调拨',
    activeCount: 19,
    flowThroughputRps: 24,
    status: 'diverting',
    splitBranch: '跨车协同',
    slaAvgSeconds: 420
  },

  // Layer 3: 物流车载流动层
  {
    id: 'NODE_RIDER_VIP',
    layer: 'intransit',
    layerName: '第三层 · 物流车载动态流转',
    name: '金牌专线车载极速送达',
    subText: 'VIP 双层锁温箱 · 15分钟妥投',
    activeCount: 22,
    flowThroughputRps: 26,
    status: 'pulsing',
    slaAvgSeconds: 610
  },
  {
    id: 'NODE_RIDER_STANDARD',
    layer: 'intransit',
    layerName: '第三层 · 物流车载动态流转',
    name: '标准巡航车队专线配送',
    subText: '高精 GPS 实时回传 · 外卖架自提',
    activeCount: 54,
    flowThroughputRps: 68,
    status: 'normal',
    slaAvgSeconds: 780
  },

  // Layer 4: 结算与审计归档
  {
    id: 'NODE_INVOICE_SETTLE',
    layer: 'settlement',
    layerName: '第四层 · 交付清算与合规审计',
    name: '实物核销验真与账单签发',
    subText: '商户对账单 · 平台抽成解冻',
    activeCount: 38,
    flowThroughputRps: 45,
    status: 'normal',
    slaAvgSeconds: 15
  },
  {
    id: 'NODE_DUAL_AUDIT',
    layer: 'settlement',
    layerName: '第四层 · 交付清算与合规审计',
    name: '双人复核审计归档池',
    subText: 'L1/L2 授权留存 · CSV导出',
    activeCount: 6,
    flowThroughputRps: 12,
    status: 'normal',
    slaAvgSeconds: 30
  }
];

// ==================== 5. 双人复核审批单定义 ====================
export interface DualControlApprovalItem {
  id: string;
  featureId: string;
  featureName: string;
  proposerTier: HeadquartersTier;
  proposerName: string;
  proposedAction: string;
  proposedTime: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approverTier?: HeadquartersTier;
  approverName?: string;
  approverTime?: string;
}

export const DEFAULT_APPROVALS: DualControlApprovalItem[] = [
  {
    id: 'APPV-2026-001',
    featureId: 'COMP_GLOBAL_COMMISSION',
    featureName: '平台基础分账抽佣规则与费率配置器',
    proposerTier: 'L2_REGION_DIRECTOR',
    proposerName: '静安战区运营总监 张峰',
    proposedAction: '静安创智商圈餐车提成率由 5.0% 调整为 7.5%',
    proposedTime: '10:14:22',
    reason: '商圈客流激增，加派 4 名专线骑手，需调增提成补偿运力激励',
    status: 'pending'
  },
  {
    id: 'APPV-2026-002',
    featureId: 'COMP_KILL_SWITCH',
    featureName: '全域突发应急一键熔断降级闸',
    proposerTier: 'L1_HQ_SUPER',
    proposerName: '总部安全风控处 陈志远',
    proposedAction: '雷暴黄色预警，申请临时对 02 号陆家嘴餐车开启熔断待命',
    proposedTime: '09:30:15',
    reason: '江边强阵风 8 级，启动安全生产应急防汛规程',
    status: 'approved',
    approverTier: 'L1_HQ_SUPER',
    approverName: '集团副总裁兼总指挥 李国强',
    approverTime: '09:32:04'
  }
];

// ==================== 6. 本地持久化与状态管理 ====================
const STORAGE_KEY_PERMISSIONS = 'ur_hq_component_permissions_v1';
const STORAGE_KEY_SPLIT_RULES = 'ur_hq_split_rules_v1';
const STORAGE_KEY_APPROVALS = 'ur_hq_dual_approvals_v1';
const STORAGE_KEY_CURRENT_TIER = 'ur_hq_active_impersonation_tier_v1';

export function getComponentPermissions(): Record<string, HeadquartersTier[]> {
  const saved = safeGetStorage<Record<string, HeadquartersTier[]>>(STORAGE_KEY_PERMISSIONS, null);
  if (saved) return saved;

  // Initialize from catalog defaults
  const initial: Record<string, HeadquartersTier[]> = {};
  COMPONENT_FEATURE_CATALOG.forEach((item) => {
    initial[item.id] = [...item.defaultAllowedTiers];
  });
  safeSetStorage(STORAGE_KEY_PERMISSIONS, initial);
  return initial;
}

export function saveComponentPermissions(map: Record<string, HeadquartersTier[]>): void {
  safeSetStorage(STORAGE_KEY_PERMISSIONS, map);
}

export function toggleTierForComponent(featureId: string, tier: HeadquartersTier): Record<string, HeadquartersTier[]> {
  const current = getComponentPermissions();
  const list = current[featureId] || [];
  if (list.includes(tier)) {
    current[featureId] = list.filter((t) => t !== tier);
  } else {
    current[featureId] = [...list, tier];
  }
  saveComponentPermissions(current);
  return current;
}

export function getSplitRules(): SplitFlowRule[] {
  const saved = safeGetStorage<SplitFlowRule[]>(STORAGE_KEY_SPLIT_RULES, null);
  if (saved && Array.isArray(saved) && saved.length > 0) return saved;
  safeSetStorage(STORAGE_KEY_SPLIT_RULES, DEFAULT_SPLIT_RULES);
  return DEFAULT_SPLIT_RULES;
}

export function saveSplitRules(rules: SplitFlowRule[]): void {
  safeSetStorage(STORAGE_KEY_SPLIT_RULES, rules);
}

export function updateSplitRuleRatio(ruleId: string, targetARatio: number): SplitFlowRule[] {
  const rules = getSplitRules().map((r) => {
    if (r.id === ruleId) {
      const clampedA = Math.max(0, Math.min(100, Math.round(targetARatio)));
      return {
        ...r,
        targetARatio: clampedA,
        targetBRatio: 100 - clampedA
      };
    }
    return r;
  });
  saveSplitRules(rules);
  return rules;
}

export function toggleSplitRuleEnabled(ruleId: string): SplitFlowRule[] {
  const rules = getSplitRules().map((r) => {
    if (r.id === ruleId) {
      return { ...r, enabled: !r.enabled };
    }
    return r;
  });
  saveSplitRules(rules);
  return rules;
}

export function getDualApprovals(): DualControlApprovalItem[] {
  const saved = safeGetStorage<DualControlApprovalItem[]>(STORAGE_KEY_APPROVALS, null);
  if (saved && Array.isArray(saved)) return saved;
  safeSetStorage(STORAGE_KEY_APPROVALS, DEFAULT_APPROVALS);
  return DEFAULT_APPROVALS;
}

export function updateApprovalStatus(id: string, status: 'approved' | 'rejected', approverName: string): DualControlApprovalItem[] {
  const list = getDualApprovals().map((item) => {
    if (item.id === id) {
      return {
        ...item,
        status,
        approverTier: 'L1_HQ_SUPER' as HeadquartersTier,
        approverName,
        approverTime: new Date().toLocaleTimeString('zh-CN', { hour12: false })
      };
    }
    return item;
  });
  safeSetStorage(STORAGE_KEY_APPROVALS, list);
  return list;
}

export function submitDualApprovalRequest(
  featureId: string,
  featureName: string,
  proposedAction: string,
  reason: string,
  proposerTier: HeadquartersTier,
  proposerName: string
): DualControlApprovalItem {
  const currentList = getDualApprovals();
  const newItem: DualControlApprovalItem = {
    id: `APPV-${new Date().getFullYear()}-${String(currentList.length + 1).padStart(3, '0')}`,
    featureId,
    featureName,
    proposerTier,
    proposerName,
    proposedAction,
    proposedTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    reason,
    status: 'pending'
  };
  const updated = [newItem, ...currentList];
  safeSetStorage(STORAGE_KEY_APPROVALS, updated);
  return newItem;
}

export interface ComponentExecutionLog {
  id: string;
  featureId: string;
  featureName: string;
  executedByTier: HeadquartersTier;
  operatorName: string;
  actionSummary: string;
  timestamp: string;
  details: string;
  status: 'success' | 'warn' | 'blocked';
}

const STORAGE_KEY_EXEC_LOGS = 'ur_hq_component_exec_logs_v1';

export function getComponentExecutionLogs(): ComponentExecutionLog[] {
  const saved = safeGetStorage<ComponentExecutionLog[]>(STORAGE_KEY_EXEC_LOGS, null);
  if (saved && Array.isArray(saved)) return saved;
  const defaults: ComponentExecutionLog[] = [
    {
      id: 'EXEC-091',
      featureId: 'COMP_CROSS_TRUCK_TRANSFER',
      featureName: '跨餐车站口应急转单与运力调拨中枢',
      executedByTier: 'L3_STATION_MASTER',
      operatorName: '静安站长',
      actionSummary: '将 01 号车 3 笔现烤肉串单调拨至 04 号协同车',
      timestamp: '10:05:12',
      details: '调拨单号: #ORD-9821, #ORD-9824, #ORD-9825; 距离: 1.2km; 预计节省备餐时间 14分钟',
      status: 'success'
    },
    {
      id: 'EXEC-090',
      featureId: 'COMP_INTERCOM_BROADCAST',
      featureName: '专线车载对讲强插广播与高精信标发射机',
      executedByTier: 'L2_REGION_DIRECTOR',
      operatorName: '静安战区总监',
      actionSummary: '下发车载强插调度语音: [午市高峰保供预警, 开启双层控温箱]',
      timestamp: '09:50:00',
      details: '广播频段: CH-01 全域战区; 接收端: 12辆在途专送车; 确认回传率: 100%',
      status: 'success'
    }
  ];
  safeSetStorage(STORAGE_KEY_EXEC_LOGS, defaults);
  return defaults;
}

export function appendComponentExecutionLog(log: Omit<ComponentExecutionLog, 'id' | 'timestamp'>): ComponentExecutionLog {
  const list = getComponentExecutionLogs();
  const newLog: ComponentExecutionLog = {
    ...log,
    id: `EXEC-${String(list.length + 92).padStart(3, '0')}`,
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false })
  };
  const updated = [newLog, ...list.slice(0, 49)];
  safeSetStorage(STORAGE_KEY_EXEC_LOGS, updated);
  return newLog;
}

export function getActiveImpersonationTier(): HeadquartersTier {
  return safeGetStorage<HeadquartersTier>(STORAGE_KEY_CURRENT_TIER, 'L1_HQ_SUPER');
}

export function setActiveImpersonationTier(tier: HeadquartersTier): void {
  safeSetStorage(STORAGE_KEY_CURRENT_TIER, tier);
}

// ==================== 7. 人员档案与实时开关持久化 ====================
const STORAGE_KEY_STAFF_USERS = 'ur_hq_staff_users_v1';
const STORAGE_KEY_LIVE_EFFECTS = 'ur_hq_live_effects_state_v1';

export function getStaffUsers(): HeadquartersStaffUser[] {
  const saved = safeGetStorage<HeadquartersStaffUser[]>(STORAGE_KEY_STAFF_USERS, null);
  if (saved && Array.isArray(saved) && saved.length > 0) return saved;
  safeSetStorage(STORAGE_KEY_STAFF_USERS, DEFAULT_STAFF_USERS);
  return DEFAULT_STAFF_USERS;
}

export function saveStaffUsers(users: HeadquartersStaffUser[]): void {
  safeSetStorage(STORAGE_KEY_STAFF_USERS, users);
}

export function toggleStaffDirectPermission(userId: string, featureId: string): HeadquartersStaffUser[] {
  const list = getStaffUsers().map((u) => {
    if (u.id === userId) {
      const perms = u.directPermissions || [];
      const updated = perms.includes(featureId) ? perms.filter((p) => p !== featureId) : [...perms, featureId];
      return { ...u, directPermissions: updated };
    }
    return u;
  });
  saveStaffUsers(list);
  return list;
}

export function getVisualLiveEffects(): VisualLiveEffectState {
  const saved = safeGetStorage<VisualLiveEffectState>(STORAGE_KEY_LIVE_EFFECTS, null);
  if (saved) return saved;
  safeSetStorage(STORAGE_KEY_LIVE_EFFECTS, DEFAULT_LIVE_EFFECT_STATE);
  return DEFAULT_LIVE_EFFECT_STATE;
}

export function updateVisualLiveEffects(partial: Partial<VisualLiveEffectState>): VisualLiveEffectState {
  const current = getVisualLiveEffects();
  const next = { ...current, ...partial };
  safeSetStorage(STORAGE_KEY_LIVE_EFFECTS, next);
  return next;
}

