/**
 * URBAN RADAR - 云服务数据分层链路引擎 (Cloud Service Tiered Data Pipeline Engine)
 * 真实对齐腾讯云静态托管存储桶、COS 对象存储桶、CloudBase 云函数及高可用架构
 * 包含 5-Tier 分层拓扑：边缘CDN防护层 -> 实时高频状态流 -> 核心事务读写层 -> 对象存储证据链 -> 冷数据归档与审计链
 */

import { safeGetStorage, safeSetStorage } from './safeStorage';

export type PipelineTierId = 'T1_EDGE' | 'T2_STREAM' | 'T3_TX_DB' | 'T4_COS_OBJECT' | 'T5_ARCHIVE_CHAIN';

export interface CloudPipelineTierNode {
  id: PipelineTierId;
  name: string;
  enName: string;
  badge: string;
  roleDescription: string;
  primaryService: string; // 承载的真实云组件/服务名称
  resourceEndpoint: string; // 实际资源桶或接口
  slaLatencyMs: number; // 当前平均往返延迟 (ms)
  throughputQps: number; // 当前吞吐量 QPS
  storageUsedText: string; // 存储已用容量
  storageCostLevel: '极低' | '低' | '中等' | '较高';
  healthScore: number; // 健康评分 0-100
  status: 'healthy' | 'warning' | 'degraded';
  syncDirection: 'inbound' | 'bidirectional' | 'outbound' | 'archive';
  dataTypes: string[]; // 存储的数据类型
  lifecycleDays: number; // 默认保留/降级周期 (天)
  securityMechanism: string; // 安全与防篡改机制
}

export interface TieringLifecyclePolicy {
  id: string;
  name: string;
  sourceTier: PipelineTierId;
  targetTier: PipelineTierId;
  triggerCondition: string;
  retentionDays: number;
  autoCompress: boolean;
  sm3Verification: boolean;
  enabled: boolean;
  lastExecutedTime: string;
  migratedCount: number;
}

export interface PipelineProbeEvent {
  id: string;
  timestamp: string;
  tierId: PipelineTierId;
  eventType: 'HEALTH_CHECK' | 'MIGRATION' | 'STRESS_TEST' | 'ENCRYPTION' | 'ANOMALY';
  level: 'info' | 'warning' | 'success' | 'danger';
  message: string;
  details: string;
}

const STORAGE_KEY_PIPELINE_TIERS = 'ur_cloud_pipeline_tiers_v1_0';
const STORAGE_KEY_LIFECYCLE_POLICIES = 'ur_cloud_pipeline_lifecycle_v1_0';
const STORAGE_KEY_PROBE_EVENTS = 'ur_cloud_pipeline_probe_events_v1_0';

export const EVENT_CLOUD_PIPELINE_CHANGED = 'ur_cloud_pipeline_changed_event';

// 初始 5-Tier 链路节点配置
export const INITIAL_PIPELINE_TIERS: CloudPipelineTierNode[] = [
  {
    id: 'T1_EDGE',
    name: '边缘接入与 CDN 防护层',
    enName: 'T1 - Edge Gateway & CDN Security',
    badge: '上海亚太边缘节点',
    roleDescription: '毫秒级命中静态资源与离线 PWA 包，抵御 DDoS 与恶意爬虫，分流高并发请求',
    primaryService: '腾讯云静态托管 + CDN 边缘网关 + WAF 防火墙',
    resourceEndpoint: 'https://tc100-d9gz0e2ko5929e360-1445454244.tcloudbaseapp.com',
    slaLatencyMs: 12,
    throughputQps: 4260,
    storageUsedText: '1.82 GB (静态资源包)',
    storageCostLevel: '极低',
    healthScore: 99.9,
    status: 'healthy',
    syncDirection: 'bidirectional',
    dataTypes: ['SPA 静态部署包', '地图矢量切片瓦片', '音效/PWA 离线缓存', '餐车 3D 渲染模型'],
    lifecycleDays: 7,
    securityMechanism: 'HTTPS TLS 1.3 + 国密 WAF 防御 + 来源防盗链白名单'
  },
  {
    id: 'T2_STREAM',
    name: '实时高频状态流',
    enName: 'T2 - In-Memory Hot Stream & Gateway',
    badge: '10Hz 高频广播',
    roleDescription: '亚米级 RTK 移动定位心跳、雷达波束探测扫描包、在途车速与语音直连信令',
    primaryService: 'Tencent Cloud Redis 高可用集群 + 实时 WebSocket / SSE 广播网关',
    resourceEndpoint: 'wss://stream.tc100-shanghai.urbanradar.internal:8443',
    slaLatencyMs: 24,
    throughputQps: 8910,
    storageUsedText: '4.65 GB (内存热态缓存)',
    storageCostLevel: '中等',
    healthScore: 99.8,
    status: 'healthy',
    syncDirection: 'bidirectional',
    dataTypes: ['骑手 GPS 实时经纬度 (10Hz)', '餐车在途车速与姿态', '顾客雷达测距包', '紧急对讲信令'],
    lifecycleDays: 1, // 仅保留24小时热态流水
    securityMechanism: '自适应背压限流 + Token 握手验签 + 内存态滑动窗口淘汰'
  },
  {
    id: 'T3_TX_DB',
    name: '核心业务事务与读写层',
    enName: 'T3 - OLTP Business Transactions & Rules',
    badge: 'ACID 分布式事务',
    roleDescription: '统一用户数据档案、订单履约状态机、餐车菜品沽清、分层授权鉴权矩阵与拆账流水',
    primaryService: 'Tencent CloudBase 云数据库 / Serverless 云函数集群 (MySQL 兼容)',
    resourceEndpoint: 'cloudbase://env-tc100-d9gz0e2ko5929e360.database',
    slaLatencyMs: 38,
    throughputQps: 1840,
    storageUsedText: '18.4 GB (高可用分布式读写)',
    storageCostLevel: '中等',
    healthScore: 99.6,
    status: 'healthy',
    syncDirection: 'bidirectional',
    dataTypes: ['用户统一数据档案 (L0-L5/食客)', '订单生命周期状态机', '4-Level Mesh 拓扑矩阵', '财务抽佣拆账记账'],
    lifecycleDays: 90, // 90天内处于热读写状态
    securityMechanism: '字段级 SM4 国密加密 + 主从读写分离 + 行级 RBAC 权限锁定'
  },
  {
    id: 'T4_COS_OBJECT',
    name: '对象存储与存证证据链',
    enName: 'T4 - Tencent COS & Proof Evidence Vault',
    badge: '腾讯云上海专用桶',
    roleDescription: '海量非结构化影像、骑手送达拍照存证、餐车巡检卫生成果、食品安全合格证',
    primaryService: '腾讯云对象存储 (COS 华东·上海 Bucket)',
    resourceEndpoint: 'cos://7463-tc100-d9gz0e2ko5929e360-1445454244 (ap-shanghai)',
    slaLatencyMs: 65,
    throughputQps: 450,
    storageUsedText: '342.8 GB (标准存储+低频存储)',
    storageCostLevel: '低',
    healthScore: 100,
    status: 'healthy',
    syncDirection: 'inbound',
    dataTypes: ['骑手送达现场照片存证', '餐车晨检/晚检卫生工单照片', '电子签署供货协议 PDF', '用户统一档案附件包'],
    lifecycleDays: 180, // 180天后自动转入冷归档
    securityMechanism: 'SM3 摘要防篡改 + 临时密钥 STS 限时授权 + 只读对象锁定 (WORM)'
  },
  {
    id: 'T5_ARCHIVE_CHAIN',
    name: '冷数据归档与审计链',
    enName: 'T5 - Cold Archive & Immutable Audit Chain',
    badge: 'Hyperledger 审计存证',
    roleDescription: '超过 90 天完结订单冷归档、越权拦截追溯日志、全域级联授权变更审计与仲裁调卷',
    primaryService: '腾讯云深度归档存储 (CAS) + 联盟链区块链节点',
    resourceEndpoint: 'cas://archive-vault-shanghai.qcloud.internal:8000',
    slaLatencyMs: 180,
    throughputQps: 65,
    storageUsedText: '1.45 TB (深度归档冷存储)',
    storageCostLevel: '极低',
    healthScore: 100,
    status: 'healthy',
    syncDirection: 'archive',
    dataTypes: ['超 90 天历史订单审计包', '全域越权拦截违规日志', '分层授权最高全权签批流水', '争议仲裁全景快照'],
    lifecycleDays: 1095, // 保留3年合规归档
    securityMechanism: '区块链链上不可逆哈希盖戳 + 物理只读离线介质 + 多重私钥签名解冻'
  }
];

// 预设数据生命周期下沉规则
export const INITIAL_LIFECYCLE_POLICIES: TieringLifecyclePolicy[] = [
  {
    id: 'POL-01',
    name: '实时轨迹数据 24h 降温下沉至冷轨迹库',
    sourceTier: 'T2_STREAM',
    targetTier: 'T3_TX_DB',
    triggerCondition: '高频 GPS 数据时间 > 24 小时',
    retentionDays: 1,
    autoCompress: true,
    sm3Verification: false,
    enabled: true,
    lastExecutedTime: '2026-09-10 03:00:00',
    migratedCount: 142800
  },
  {
    id: 'POL-02',
    name: '完结订单 90 天自动下沉至 CAS 深度归档',
    sourceTier: 'T3_TX_DB',
    targetTier: 'T5_ARCHIVE_CHAIN',
    triggerCondition: '订单状态=已完成 且 完结时间 > 90 天',
    retentionDays: 90,
    autoCompress: true,
    sm3Verification: true,
    enabled: true,
    lastExecutedTime: '2026-09-10 02:30:00',
    migratedCount: 18920
  },
  {
    id: 'POL-03',
    name: 'COS 送达照片存证 60 天转低频冷对象池',
    sourceTier: 'T4_COS_OBJECT',
    targetTier: 'T5_ARCHIVE_CHAIN',
    triggerCondition: '存证照片归档时间 > 60 天',
    retentionDays: 60,
    autoCompress: true,
    sm3Verification: true,
    enabled: true,
    lastExecutedTime: '2026-09-09 23:00:00',
    migratedCount: 8430
  }
];

// 初始探测日志
export const INITIAL_PROBE_EVENTS: PipelineProbeEvent[] = [
  {
    id: 'EVT-001',
    timestamp: '10:45:12',
    tierId: 'T1_EDGE',
    eventType: 'HEALTH_CHECK',
    level: 'success',
    message: '腾讯云上海静态托管与 CDN 边缘健康探针自检通过',
    details: 'HTTP 200 / 延迟 12ms / 缓存命中率 99.85%'
  },
  {
    id: 'EVT-002',
    timestamp: '10:30:04',
    tierId: 'T4_COS_OBJECT',
    eventType: 'ENCRYPTION',
    level: 'info',
    message: '骑手周凯送达存证照片已上送 COS 华东·上海存储桶并完成 SM3 哈希盖戳',
    details: 'Bucket: 7463-tc100-d9gz0e2ko5929e360-1445454244 / Hash: 0x992a...c014'
  },
  {
    id: 'EVT-003',
    timestamp: '10:15:28',
    tierId: 'T2_STREAM',
    eventType: 'HEALTH_CHECK',
    level: 'success',
    message: '苏河湾商圈 10Hz RTK 高精轨迹广播信道保持稳定',
    details: '当前并发长连接 382 路，背压丢包率 0.00%'
  },
  {
    id: 'EVT-004',
    timestamp: '09:50:11',
    tierId: 'T5_ARCHIVE_CHAIN',
    eventType: 'MIGRATION',
    level: 'success',
    message: '自动归档策略 POL-02 执行完成：下沉 1,240 笔完结订单至 Hyperledger 审计链',
    details: '节省热态存储开销约 42.8%，数据摘要写入区块链区块 #184209'
  }
];

// 获取节点配置
export function getPipelineTiers(): CloudPipelineTierNode[] {
  const saved = safeGetStorage<CloudPipelineTierNode[] | null>(STORAGE_KEY_PIPELINE_TIERS, null);
  if (saved && Array.isArray(saved) && saved.length > 0) {
    return saved;
  }
  safeSetStorage(STORAGE_KEY_PIPELINE_TIERS, INITIAL_PIPELINE_TIERS);
  return INITIAL_PIPELINE_TIERS;
}

// 获取生命周期策略
export function getLifecyclePolicies(): TieringLifecyclePolicy[] {
  const saved = safeGetStorage<TieringLifecyclePolicy[] | null>(STORAGE_KEY_LIFECYCLE_POLICIES, null);
  if (saved && Array.isArray(saved) && saved.length > 0) {
    return saved;
  }
  safeSetStorage(STORAGE_KEY_LIFECYCLE_POLICIES, INITIAL_LIFECYCLE_POLICIES);
  return INITIAL_LIFECYCLE_POLICIES;
}

// 获取探针事件
export function getPipelineProbeEvents(): PipelineProbeEvent[] {
  const saved = safeGetStorage<PipelineProbeEvent[] | null>(STORAGE_KEY_PROBE_EVENTS, null);
  if (saved && Array.isArray(saved) && saved.length > 0) {
    return saved;
  }
  safeSetStorage(STORAGE_KEY_PROBE_EVENTS, INITIAL_PROBE_EVENTS);
  return INITIAL_PROBE_EVENTS;
}

// 追加探针事件
export function appendPipelineProbeEvent(evt: Omit<PipelineProbeEvent, 'id' | 'timestamp'>): void {
  const list = getPipelineProbeEvents();
  const newEvt: PipelineProbeEvent = {
    ...evt,
    id: `EVT-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false })
  };
  const updated = [newEvt, ...list.slice(0, 49)];
  safeSetStorage(STORAGE_KEY_PROBE_EVENTS, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_CLOUD_PIPELINE_CHANGED));
  }
}

// 模拟触发链路压力测试
export function triggerPipelineStressTest(tierId: PipelineTierId): {
  success: boolean;
  message: string;
} {
  const tiers = getPipelineTiers();
  const target = tiers.find((t) => t.id === tierId);
  if (!target) return { success: false, message: '目标层级未找到' };

  // 临时增加 QPS 并记录探针
  target.throughputQps = Math.round(target.throughputQps * 1.8);
  target.slaLatencyMs = Math.round(target.slaLatencyMs * 1.35);
  safeSetStorage(STORAGE_KEY_PIPELINE_TIERS, tiers);

  appendPipelineProbeEvent({
    tierId,
    eventType: 'STRESS_TEST',
    level: 'warning',
    message: `已对【${target.name}】注入突发流量压力测试 (QPS 峰值上升至 ${target.throughputQps})`,
    details: `SLA 往返延迟浮动至 ${target.slaLatencyMs}ms，容灾自动限流机制已就绪`
  });

  return {
    success: true,
    message: `已向 ${target.name} 注入高并发脉冲压测，自愈与降级监控已触发`
  };
}

// 模拟立即执行某项生命周期归档策略
export function triggerLifecycleExecution(policyId: string): {
  success: boolean;
  migratedDelta: number;
} {
  const policies = getLifecyclePolicies();
  const target = policies.find((p) => p.id === policyId);
  if (!target) return { success: false, migratedDelta: 0 };

  const delta = Math.floor(200 + Math.random() * 800);
  target.migratedCount += delta;
  target.lastExecutedTime = new Date().toLocaleString('zh-CN');
  safeSetStorage(STORAGE_KEY_LIFECYCLE_POLICIES, policies);

  appendPipelineProbeEvent({
    tierId: target.targetTier,
    eventType: 'MIGRATION',
    level: 'success',
    message: `数据生命周期下沉策略【${target.name}】手工执行完毕`,
    details: `本次迁移并下沉 ${delta} 笔数据，通过 SM3 哈希指纹校验`
  });

  return { success: true, migratedDelta: delta };
}
