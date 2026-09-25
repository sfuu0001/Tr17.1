/**
 * 数据沙箱与全链路传输拓扑及客诉溯源诊断引擎 (Data Sandbox & Traceability Engine)
 * 支持 5-Tier 传输管道仿真、微时延探针监测、混沌故障注入与各笔客诉全生命周期诊断
 */

export interface PipelineTierNode {
  id: 'T0_EDGE' | 'T1_STREAM' | 'T2_MASKING' | 'T3_CORE' | 'T4_COS';
  tierCode: string;
  name: string;
  enName: string;
  category: 'ingress' | 'stream' | 'security' | 'compute' | 'storage';
  description: string;
  latencyMs: number;
  qps: number;
  errorRate: number; // 0.00 ~ 1.00
  bufferUsagePercent: number; // 0 ~ 100
  status: 'healthy' | 'warning' | 'critical';
  activeConnections: number;
  upstreamId?: string;
  downstreamId?: string;
  techStack: string;
  primaryKey: string;
  activeAlarms: string[];
  metrics: {
    cpuLoad: number;
    memMb: number;
    networkInMbps: number;
    networkOutMbps: number;
  };
}

export interface TraceDataPacket {
  packetId: string;
  traceId: string;
  source: string;
  destination: string;
  payloadType: 'GPS_HEARTBEAT' | 'ORDER_EVENT' | 'MASKED_MIRROR' | 'DISPATCH_MATCH' | 'COS_ARCHIVE_SIG';
  sizeBytes: number;
  timestamp: string;
  hopCount: number;
  latencyAccumulatedMs: number;
  isSimulatedFailure: boolean;
  status: 'flying' | 'consumed' | 'dropped';
}

export interface ComplaintStageDetail {
  stageId: 'customer_trigger' | 'truck_prep' | 'rider_transit' | 'network_gateway' | 'platform_verdict';
  stageName: string;
  enStageName: string;
  nodeName: string;
  operator: string;
  timestamp: string;
  durationText: string;
  status: 'normal' | 'anomaly' | 'critical' | 'resolved';
  metrics: {
    label: string;
    value: string;
    isAbnormal?: boolean;
  }[];
  evidenceTitle: string;
  evidenceItems: string[];
  diagnosticTip: string;
  traceHash: string;
}

export interface ComplaintTraceRecord {
  complaintId: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  truckId: string;
  truckName: string;
  riderId: string;
  riderName: string;
  disputeType: 'spill_damage' | 'severe_delay' | 'fake_completion' | 'geofence_breach' | 'food_cold';
  disputeTitle: string;
  summary: string;
  orderAmount: number;
  payoutAmount: number;
  createdAt: string;
  resolvedAt?: string;
  status: 'resolved' | 'arbitrating' | 'escalated';
  rootCauseNode: 'RIDER_FLEET' | 'TRUCK_KITCHEN' | 'NETWORK_SIGNAL' | 'CUSTOMER_MISTAKE';
  attribution: {
    merchantPercent: number;
    riderPercent: number;
    platformNetPercent: number;
    forceMajeurePercent: number;
  };
  stages: ComplaintStageDetail[];
  cosEvidenceKey: string;
  sm3AuditProof: string;
}

// 预置 5 级数据传输管道节点
export const INITIAL_PIPELINE_NODES: PipelineTierNode[] = [
  {
    id: 'T0_EDGE',
    tierCode: 'S0',
    name: '边缘探针接入网关',
    enName: 'Edge Signal & Ingress Gateway',
    category: 'ingress',
    description: '10Hz车载GPS信令、食客APP心跳、反作弊防刷与边缘鉴权',
    latencyMs: 12,
    qps: 342,
    errorRate: 0.001,
    bufferUsagePercent: 24,
    status: 'healthy',
    activeConnections: 1280,
    downstreamId: 'T1_STREAM',
    techStack: 'Nginx + Lua Edge + WAF 防刷',
    primaryKey: 'edge_sess_uid',
    activeAlarms: [],
    metrics: {
      cpuLoad: 28,
      memMb: 512,
      networkInMbps: 45.2,
      networkOutMbps: 43.1
    }
  },
  {
    id: 'T1_STREAM',
    tierCode: 'S1',
    name: '实时调度消息总线',
    enName: 'Real-time Event Stream RingBuffer',
    category: 'stream',
    description: '餐车位置实时拓扑广播、跨网格转单事件分发、低延时消息队列',
    latencyMs: 18,
    qps: 280,
    errorRate: 0.002,
    bufferUsagePercent: 38,
    status: 'healthy',
    activeConnections: 940,
    upstreamId: 'T0_EDGE',
    downstreamId: 'T2_MASKING',
    techStack: 'Kafka Stream + Redis RingBuffer',
    primaryKey: 'stream_topic_id',
    activeAlarms: [],
    metrics: {
      cpuLoad: 42,
      memMb: 1024,
      networkInMbps: 38.5,
      networkOutMbps: 37.9
    }
  },
  {
    id: 'T2_MASKING',
    tierCode: 'S2',
    name: '内存动态脱敏与镜像网关',
    enName: 'Dynamic Masking & Sandbox Replica',
    category: 'security',
    description: '手机号掩码、高斯时空扰动、国密SM4动态加密、生产写隔离保护',
    latencyMs: 6,
    qps: 210,
    errorRate: 0.0,
    bufferUsagePercent: 19,
    status: 'healthy',
    activeConnections: 480,
    upstreamId: 'T1_STREAM',
    downstreamId: 'T3_CORE',
    techStack: 'SM3/SM4 内存级加密 + Sandbox Proxy',
    primaryKey: 'masked_token_id',
    activeAlarms: [],
    metrics: {
      cpuLoad: 19,
      memMb: 380,
      networkInMbps: 22.4,
      networkOutMbps: 22.1
    }
  },
  {
    id: 'T3_CORE',
    tierCode: 'S3',
    name: '分布式撮合与计算核心',
    enName: 'Distributed Matching & Simulation Core',
    category: 'compute',
    description: '动态运价熔断算法推演、蜂窝网格就近匹配、ACID事务处理',
    latencyMs: 46,
    qps: 165,
    errorRate: 0.004,
    bufferUsagePercent: 62,
    status: 'healthy',
    activeConnections: 720,
    upstreamId: 'T2_MASKING',
    downstreamId: 'T4_COS',
    techStack: 'Node.js Cluster + ACID Postgres Trans',
    primaryKey: 'match_core_ord',
    activeAlarms: [],
    metrics: {
      cpuLoad: 61,
      memMb: 2048,
      networkInMbps: 18.2,
      networkOutMbps: 15.6
    }
  },
  {
    id: 'T4_COS',
    tierCode: 'S4',
    name: '腾讯云COS冷存证与归档仓',
    enName: 'Tencent COS Cold Archive & Audit Vault',
    category: 'storage',
    description: '客诉存证影像、分账快照、不可篡改哈希、T+30冷归档',
    latencyMs: 78,
    qps: 45,
    errorRate: 0.0,
    bufferUsagePercent: 12,
    status: 'healthy',
    activeConnections: 120,
    upstreamId: 'T3_CORE',
    techStack: 'Tencent Cloud COS (ap-shanghai) + JSON Archive',
    primaryKey: 'cos_evidence_etag',
    activeAlarms: [],
    metrics: {
      cpuLoad: 12,
      memMb: 256,
      networkInMbps: 8.9,
      networkOutMbps: 2.1
    }
  }
];

// 预置全链路各笔客诉诊断档案（精准还原餐车与骑手实际履约痛点）
export const PRESET_COMPLAINT_TRACES: ComplaintTraceRecord[] = [
  {
    complaintId: 'CMP-202609-0891',
    orderNo: 'ORD-2026-98102',
    customerName: '李思颖 (白领园区食客)',
    customerPhone: '138****6621',
    truckId: 'truck-01',
    truckName: '黑曜石 01 号炭烤餐车 (科技园站)',
    riderId: 'rider-03',
    riderName: '王凯 (闪电专送03号)',
    disputeType: 'spill_damage',
    disputeTitle: '现烤和牛汉堡汤汁严重翻泼 & 冰滴冷萃倾覆',
    summary: '食客开箱反馈包装盒严重变形，汉堡汤汁渗出，冷萃咖啡封口破裂泼洒，申请全额退款。',
    orderAmount: 78.0,
    payoutAmount: 78.0,
    createdAt: '2026-09-10 12:28:14',
    resolvedAt: '2026-09-10 12:35:40',
    status: 'resolved',
    rootCauseNode: 'RIDER_FLEET',
    attribution: {
      merchantPercent: 10,
      riderPercent: 75,
      platformNetPercent: 15,
      forceMajeurePercent: 0
    },
    cosEvidenceKey: 'evidence/complaints/202609/cmp_0891_spill_damage.jpg',
    sm3AuditProof: '8f92b4c10a2e783d941fa023e41b9c7d0284e51189ac3f4b6201e7d9821af001',
    stages: [
      {
        stageId: 'customer_trigger',
        stageName: '食客发起争议',
        enStageName: 'Customer Dispute Trigger',
        nodeName: '食客终端 (iOS App v3.2)',
        operator: '李思颖 (食客本人)',
        timestamp: '12:28:14',
        durationText: 'T+0s',
        status: 'anomaly',
        metrics: [
          { label: '上报网络', value: '5G NSA (-78dBm)' },
          { label: '位置偏差', value: '园区B座 (±3.2m)' },
          { label: '诉求类型', value: '全额退款+重新制作' }
        ],
        evidenceTitle: '食客上传现场影像存证',
        evidenceItems: [
          '上传 2 张汉堡盒被外力挤压塌陷照片（防伪水印完整）',
          '餐品条码扫描一致：#ORD-2026-98102',
          '温控标签变色：出餐至开箱温差正常'
        ],
        diagnosticTip: '开箱时间距离送达仅 1分40秒，排除食客自留放置受损可能。',
        traceHash: 'sm3:3e819ac4092b11ef8710acde48001122'
      },
      {
        stageId: 'truck_prep',
        stageName: '餐车后厨备餐',
        enStageName: 'Food Truck Prep & QC',
        nodeName: '黑曜石01号智能后厨台',
        operator: '张主理人 (工号 C101)',
        timestamp: '12:05:30 ~ 12:12:45',
        durationText: '备餐耗时 7分15秒',
        status: 'normal',
        metrics: [
          { label: '称重质检', value: '540g (合格)' },
          { label: '封口机压力', value: '0.45MPa (双层扣锁)' },
          { label: '出餐拍照存证', value: '系统自动抓拍无损' }
        ],
        evidenceTitle: '餐车出餐端机器视觉检测',
        evidenceItems: [
          '视觉质检抓拍图片对比：出餐瞬间封口完好无渗漏',
          '放置专用保温卡槽并锁定安全搭扣',
          '骑手取餐扫码复核确认无外伤'
        ],
        diagnosticTip: '餐车后厨出餐流程完全合规，包装符合防溢规范。',
        traceHash: 'sm3:a01f82c091bc22ee7182bcfe59102244'
      },
      {
        stageId: 'rider_transit',
        stageName: '骑手配送履约',
        enStageName: 'Rider In-Transit Telemetry',
        nodeName: '专送摩托车 GPS + 六轴加速度计',
        operator: '王凯 (骑手)',
        timestamp: '12:14:10 ~ 12:26:30',
        durationText: '配送用时 12分20秒',
        status: 'critical',
        metrics: [
          { label: '最高时速', value: '44.8 km/h', isAbnormal: true },
          { label: '急刹车告警', value: '3次 (减速度 > 1.6G)', isAbnormal: true },
          { label: '减速带冲击', value: 'Z轴加速度 2.1G', isAbnormal: true }
        ],
        evidenceTitle: '车载物联网黑匣子传感器异动',
        evidenceItems: [
          '12:19:42 于创新大道减速带处产生 2.1G 纵向震动',
          '12:21:05 遭遇路口行人紧急避让刹车，水平减速度达 1.75G',
          '保温箱内陀螺仪回传发生倾角 42° 瞬间晃动'
        ],
        diagnosticTip: '传感器明确证实配送途中有强烈颠簸和急刹倾覆，为本次泼洒根本原因。',
        traceHash: 'sm3:5b7194cc21ea34ff9981bcde59114488'
      },
      {
        stageId: 'network_gateway',
        stageName: '信令与时空链路',
        enStageName: 'Signal & Mesh Gateway',
        nodeName: 'T0/T1 蜂窝网格边缘调度',
        operator: '平台自动监测中枢',
        timestamp: '12:20:00',
        durationText: '时延 14ms',
        status: 'normal',
        metrics: [
          { label: 'GPS心跳断连', value: '0次 (信令饱满)' },
          { label: '微服务链路耗时', value: '28ms (无阻塞)' },
          { label: '数据包丢失率', value: '0.00%' }
        ],
        evidenceTitle: '全链路通信日志追踪',
        evidenceItems: [
          '骑手端至餐车调度信令延迟保持在 18ms 以内',
          '高频轨迹数据点完整上报无丢帧',
          '未触发恶劣天气自动降速补偿'
        ],
        diagnosticTip: '数据传输链路一切正常，非系统通信故障或GPS飘移假死。',
        traceHash: 'sm3:9c84e1aa33ef66dd8812cdae11223344'
      },
      {
        stageId: 'platform_verdict',
        stageName: '平台智能仲裁',
        enStageName: 'Platform Smart Arbitration',
        nodeName: '黑曜石风控仲裁引擎',
        operator: '仲裁专员 #9001 (协同 AI 辅助判责)',
        timestamp: '12:35:40',
        durationText: '用时 7分26秒',
        status: 'resolved',
        metrics: [
          { label: '定责结果', value: '骑手运送不当责任 75%' },
          { label: '处置时效', value: '极速先行赔付' },
          { label: '退赔总额', value: '¥78.00 (原路退回)' }
        ],
        evidenceTitle: '仲裁闭环与凭证归档',
        evidenceItems: [
          '向食客先行全额退款 ¥78.00 并赠送 ¥15 无门槛道歉卡券',
          '对骑手王凯记录急刹泼洒违规扣分，扣减当单运力提成',
          '生成国密 SM3 存证哈希并同步上链，归档至腾讯云 COS 存储桶'
        ],
        diagnosticTip: '闭环时间低于平台 SLA（10分钟标准），三端无二次争议。',
        traceHash: 'sm3:8f92b4c10a2e783d941fa023e41b9c7d0284e51189ac3f4b6201e7d9821af001'
      }
    ]
  },
  {
    complaintId: 'CMP-202609-0742',
    orderNo: 'ORD-2026-97834',
    customerName: '张建军 (创投大厦食客)',
    customerPhone: '139****1984',
    truckId: 'truck-02',
    truckName: '黑曜石 02 号炭火居酒餐车 (金融街站)',
    riderId: 'rider-01',
    riderName: '李明 (闪电专送01号)',
    disputeType: 'severe_delay',
    disputeTitle: '午高峰订单超时 38 分钟 & 骑手到店空等',
    summary: '午间大单超时严重，食客开会前未收到餐品，现场骑手投诉餐车虚假点击出餐。',
    orderAmount: 142.0,
    payoutAmount: 45.0,
    createdAt: '2026-09-10 12:40:11',
    resolvedAt: '2026-09-10 12:52:05',
    status: 'resolved',
    rootCauseNode: 'TRUCK_KITCHEN',
    attribution: {
      merchantPercent: 85,
      riderPercent: 0,
      platformNetPercent: 15,
      forceMajeurePercent: 0
    },
    cosEvidenceKey: 'evidence/complaints/202609/cmp_0742_delay_kitchen.jpg',
    sm3AuditProof: '19ac72f094e82b3d901ca923e41a9c7d0284e51189ac3f4b6201e7d982110022',
    stages: [
      {
        stageId: 'customer_trigger',
        stageName: '食客发起超时催单',
        enStageName: 'Customer Delay Complaint',
        nodeName: '食客终端 (Android)',
        operator: '张建军',
        timestamp: '12:40:11',
        durationText: '超时 25 分钟',
        status: 'critical',
        metrics: [
          { label: '承诺送达', value: '12:15:00' },
          { label: '实际状态', value: '骑手仍在等待取餐' },
          { label: '客户情绪', value: '愤怒 (催单3次未果)' }
        ],
        evidenceTitle: '催单链路聚合记录',
        evidenceItems: [
          '12:20 第一次智能催单提醒',
          '12:28 第二次人工介入催促',
          '12:40 正式提起违约赔付申诉'
        ],
        diagnosticTip: '超出平台最大履约承诺阈值（+30分钟）。',
        traceHash: 'sm3:4a19c72e901ca23e41a9c7d0284e5118'
      },
      {
        stageId: 'truck_prep',
        stageName: '餐车出餐卡死',
        enStageName: 'Kitchen Bottleneck & Premature Call',
        nodeName: '黑曜石02号烤台控制屏',
        operator: '林师傅 (主烤工)',
        timestamp: '12:02:10 ~ 12:38:00',
        durationText: '后厨滞留 35分50秒',
        status: 'critical',
        metrics: [
          { label: '炭火温度', value: '410°C (正常)' },
          { label: '烤架排队深度', value: '14串积压 (超负荷)', isAbnormal: true },
          { label: '提前呼叫骑手', value: '提前 22 分钟误点', isAbnormal: true }
        ],
        evidenceTitle: '餐车出餐排队日志审计',
        evidenceItems: [
          '12:12:00 餐车员工为了避免超时扣分，提前点击了【餐品已出餐】',
          '导致骑手李明 12:15 赶到现场，却被告知“还要再等20分钟”',
          '骑手在餐车旁滞留 23 分钟，错失 3 笔接单机会'
        ],
        diagnosticTip: '确凿存在“虚假出餐”违规，责任全在商户后厨拥堵及操作失误。',
        traceHash: 'sm3:981aef02941bceea7182bcfe59101122'
      },
      {
        stageId: 'rider_transit',
        stageName: '骑手到店等待',
        enStageName: 'Rider In-Place Wait',
        nodeName: '骑手车载定位终端',
        operator: '李明 (骑手)',
        timestamp: '12:15:20 ~ 12:38:40',
        durationText: '原地驻留 23分20秒',
        status: 'anomaly',
        metrics: [
          { label: '到店准时率', value: '提前 3 分钟到店' },
          { label: '驻留静止时长', value: '23分20秒', isAbnormal: true },
          { label: '骑手申诉', value: '虚假出餐空等赔偿' }
        ],
        evidenceTitle: '骑手静止坐标轨迹存证',
        evidenceItems: [
          'GPS持续显示在餐车 15 米范围内，无擅自离开行为',
          '12:22 骑手发起【出餐慢驻留汇报】',
          '12:39 终于取得餐品开始派送'
        ],
        diagnosticTip: '骑手履约无过失，且遭遇了重大误工损失。',
        traceHash: 'sm3:189acfe0291ba22ee7182bcfe5913344'
      },
      {
        stageId: 'network_gateway',
        stageName: '信令吞吐诊断',
        enStageName: 'Stream Gateway Probe',
        nodeName: 'T1 调度总线',
        operator: '系统自动探针',
        timestamp: '12:12:00',
        durationText: '时延 11ms',
        status: 'normal',
        metrics: [
          { label: '调度信令投递', value: '100% 达成' },
          { label: '时间戳差值', value: '< 15ms' }
        ],
        evidenceTitle: '出餐点击信令时间戳比对',
        evidenceItems: [
          '商户平板端出餐上报时间戳与服务端接收时间戳误差仅 12ms',
          '排除网络拥堵造成的迟发误判'
        ],
        diagnosticTip: '信令正常，证实点击动作由操作员主动触发。',
        traceHash: 'sm3:2901aef02941bceea7182bcfe5915566'
      },
      {
        stageId: 'platform_verdict',
        stageName: '智能惩戒与补偿',
        enStageName: 'Sanction & Compensation',
        nodeName: '平台仲裁中心',
        operator: '仲裁专员 #9003',
        timestamp: '12:52:05',
        durationText: '用时 11分54秒',
        status: 'resolved',
        metrics: [
          { label: '商户扣款惩罚', value: '¥100.00 (虚假出餐)' },
          { label: '食客道歉代金券', value: '¥30.00' },
          { label: '骑手空等误工费', value: '¥15.00' }
        ],
        evidenceTitle: '多方清算单据',
        evidenceItems: [
          '对黑曜石 02 号餐车处以违约警告扣罚，商户信誉分扣减 2 分',
          '全额补贴骑手李明误工补贴 ¥15.00 即时到账',
          '为食客张建军退还运费并赠送 ¥30.00 平台无门槛券'
        ],
        diagnosticTip: '商户已在管理后台签署违约扣款确认，案例归档。',
        traceHash: 'sm3:19ac72f094e82b3d901ca923e41a9c7d0284e51189ac3f4b6201e7d982110022'
      }
    ]
  },
  {
    complaintId: 'CMP-202609-0521',
    orderNo: 'ORD-2026-96510',
    customerName: '赵晓雨 (江景公寓食客)',
    customerPhone: '186****7732',
    truckId: 'truck-04',
    truckName: '黑曜石 04 号流动炭烤车 (外滩临时点)',
    riderId: 'rider-02',
    riderName: '陈强 (闪电专送02号)',
    disputeType: 'geofence_breach',
    disputeTitle: '餐车违规脱离特许网格导致跨区配送严重超时',
    summary: '餐车因私自挪动至人流聚集区，超出规划电子围栏 1.2 公里，导致骑手多骑行 3.5 公里。',
    orderAmount: 96.0,
    payoutAmount: 25.0,
    createdAt: '2026-09-10 11:35:10',
    resolvedAt: '2026-09-10 11:48:22',
    status: 'resolved',
    rootCauseNode: 'TRUCK_KITCHEN',
    attribution: {
      merchantPercent: 90,
      riderPercent: 0,
      platformNetPercent: 10,
      forceMajeurePercent: 0
    },
    cosEvidenceKey: 'evidence/complaints/202609/cmp_0521_geofence_breach.jpg',
    sm3AuditProof: '33aa82c091bc22ee7182bcfe59102244a01f82c091bc22ee7182bcfe59102299',
    stages: [
      {
        stageId: 'customer_trigger',
        stageName: '食客询问送达位置',
        enStageName: 'Customer Inquire',
        nodeName: '微信小程序',
        operator: '赵晓雨',
        timestamp: '11:35:10',
        durationText: 'T+0s',
        status: 'normal',
        metrics: [
          { label: '预计到达', value: '11:30 (已超5分钟)' },
          { label: '地图距离', value: '异动拉长至 4.2km', isAbnormal: true }
        ],
        evidenceTitle: '用户端距离显示突变',
        evidenceItems: ['食客反映下单时餐车仅在 800米外，付款后发现距离暴增至 4公里以上'],
        diagnosticTip: '明显发生了驻点空间位移。',
        traceHash: 'sm3:5519c72e901ca23e41a9c7d0284e5118'
      },
      {
        stageId: 'truck_prep',
        stageName: '餐车脱圈移位',
        enStageName: 'Geofence Breach',
        nodeName: '车载北斗/GPS双模定位盒',
        operator: '黑曜石04号车组',
        timestamp: '11:15:00 ~ 11:30:00',
        durationText: '移动距离 1.45km',
        status: 'critical',
        metrics: [
          { label: '围栏允许半径', value: '200 米' },
          { label: '实际偏离距离', value: '1450 米', isAbnormal: true },
          { label: '脱圈报警触发', value: '已上报云端雷达', isAbnormal: true }
        ],
        evidenceTitle: '围栏脱圈报警轨迹',
        evidenceItems: [
          '11:18:24 触发电子围栏越界告警（经度 121.4921, 纬度 31.2389）',
          '餐车私自开动避开城管检查，未在调度系统执行【转点报备】'
        ],
        diagnosticTip: '严重违背特许经营网格准则，造成全网派单混乱。',
        traceHash: 'sm3:661aef02941bceea7182bcfe59101122'
      },
      {
        stageId: 'rider_transit',
        stageName: '骑手跨区追车',
        enStageName: 'Rider Chasing Truck',
        nodeName: '骑手导航终端',
        operator: '陈强',
        timestamp: '11:22:00 ~ 11:42:00',
        durationText: '多耗时 16 分钟',
        status: 'anomaly',
        metrics: [
          { label: '原计划里程', value: '1.2 km' },
          { label: '实际行驶里程', value: '4.8 km', isAbnormal: true },
          { label: '电瓶电量消耗', value: '额外消耗 28%' }
        ],
        evidenceTitle: '骑手绕行轨迹复盘',
        evidenceItems: ['骑手原定前往原点，到达后扑空，通过即时联络室才得知餐车已挪动至外滩广场'],
        diagnosticTip: '骑手承受超负荷额外里程。',
        traceHash: 'sm3:779acfe0291ba22ee7182bcfe5913344'
      },
      {
        stageId: 'network_gateway',
        stageName: '合规雷达告警同步',
        enStageName: 'Radar Alarm Ingestion',
        nodeName: 'T0 边缘网关',
        operator: '系统自动记录',
        timestamp: '11:18:25',
        durationText: '时延 8ms',
        status: 'normal',
        metrics: [{ label: '告警入库延迟', value: '12ms' }, { label: '事件完整度', value: '100%' }],
        evidenceTitle: '合规告警日志',
        evidenceItems: ['合规雷达瞬时识别越界并下发短信警示车长'],
        diagnosticTip: '技术监控全链路正常工作。',
        traceHash: 'sm3:8801aef02941bceea7182bcfe5915566'
      },
      {
        stageId: 'platform_verdict',
        stageName: '围栏违规重罚与补贴',
        enStageName: 'Penalty & Mileage Subsidy',
        nodeName: '合规风控仲裁席',
        operator: '仲裁专员 #9002',
        timestamp: '11:48:22',
        durationText: '用时 13分12秒',
        status: 'resolved',
        metrics: [
          { label: '餐车停机整顿', value: '封禁派单 2小时' },
          { label: '违规罚金', value: '¥200.00' },
          { label: '骑手里程补偿', value: '¥25.00' }
        ],
        evidenceTitle: '违规处罚书与存证',
        evidenceItems: [
          '强制黑曜石04号餐车暂停派单2小时并返回既定网格',
          '划拨 ¥25.00 专项里程跑腿补偿至骑手账户',
          '给予食客赠送 ¥20.00 无门槛补偿券'
        ],
        diagnosticTip: '违规行为已记入该餐车站长年终考评档案。',
        traceHash: 'sm3:33aa82c091bc22ee7182bcfe59102244a01f82c091bc22ee7182bcfe59102299'
      }
    ]
  }
];

// 获取全部客诉诊断数据
export function getAllComplaintTraces(): ComplaintTraceRecord[] {
  return PRESET_COMPLAINT_TRACES;
}

// 模拟实时数据包流动发生器
export function generateMockDataPacket(sourceId: string, destId: string): TraceDataPacket {
  const types: TraceDataPacket['payloadType'][] = [
    'GPS_HEARTBEAT',
    'ORDER_EVENT',
    'MASKED_MIRROR',
    'DISPATCH_MATCH',
    'COS_ARCHIVE_SIG'
  ];
  const selectedType = types[Math.floor(Math.random() * types.length)];
  const isErr = Math.random() < 0.03; // 3% 偶发网络微抖动

  return {
    packetId: `PKT-${Date.now().toString(36)}-${Math.floor(Math.random() * 900 + 100)}`,
    traceId: `TRC-${Math.random().toString(16).substring(2, 10)}`,
    source: sourceId,
    destination: destId,
    payloadType: selectedType,
    sizeBytes: Math.floor(Math.random() * 1400 + 200),
    timestamp: new Date().toLocaleTimeString(),
    hopCount: Math.floor(Math.random() * 3 + 1),
    latencyAccumulatedMs: Math.floor(Math.random() * 45 + 10),
    isSimulatedFailure: isErr,
    status: isErr ? 'dropped' : 'flying'
  };
}
