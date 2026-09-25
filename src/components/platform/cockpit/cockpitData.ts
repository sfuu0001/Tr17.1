/**
 * 品牌区域运维地图数据大屏 - 核心数据模型与模拟基座
 * 覆盖五大主体：区经理（网格）、固定门店、流动餐车、配送骑手、终端用户
 */

// 1. 区经理档案接口
export interface ManagerEntity {
  id: string;
  name: string;
  code: string;
  phone: string;
  zoneId: string;
  zoneName: string;
  status: 'online' | 'offline';
  entryDate: string;
  lastOnline: string;
  currentAddress: string;
  managedStores: number;
  activeTrucks: number;
  onlineRiders: number;
  todayPatrolCount: number;
  offlineMins: number; // 离线时长 (分钟)
  abnormalNotes?: string;
  coords: { x: number; y: number };
  patrolPath: { x: number; y: number; time: string; spotName: string }[];
}

// 2. 固定门店档案接口
export interface StoreEntity {
  id: string;
  name: string;
  code: string;
  address: string;
  openedAt: string;
  managerName: string;
  managerCode: string;
  phone: string;
  status: 'open' | 'paused' | 'renovating' | 'fault';
  todayOrders: number;
  customerFlow: number;
  revenue: number;
  stationedRiders: number;
  onDutyStaff: number;
  serviceRadiusMeters: number;
  zoneId: string;
  zoneName: string;
  coords: { x: number; y: number };
  faultReason?: string;
}

// 3. 流动餐车档案接口 (6大业务状态)
export type TruckStatusType =
  | 'unprepared' // 未打样
  | 'prepped' // 已打样/筹备完成
  | 'open' // 正常营业
  | 'paused' // 暂停营业
  | 'closed' // 收摊离岗
  | 'fault'; // 故障异常

export interface TruckEntity {
  id: string;
  name: string;
  code: string;
  zoneId: string;
  zoneName: string;
  managerName: string;
  managerCode: string;
  phone: string;
  status: TruckStatusType;
  dutyHoursToday: number;
  todayOrders: number;
  coveredUsers: number;
  stoveTemp: string;
  batteryPercent: number;
  coords: { x: number; y: number };
  coverageRadiusMeters: number;
  movingPath: { x: number; y: number; time: string; status: string }[];
  statusLogs: { time: string; oldStatus: string; newStatus: string; operator: string }[];
  inspectionLogs: { time: string; item: string; result: 'pass' | 'warning' | 'fail'; inspector: string }[];
  pendingQueue: number;
}

// 4. 配送骑手与订单接口
export interface RiderActiveOrder {
  orderNo: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoords: { x: number; y: number };
  dropoffCoords: { x: number; y: number };
  status: 'pickup_pending' | 'picking' | 'delivering' | 'arriving' | 'timeout_risk';
  remainingMins: number;
  amount: number;
  path: { x: number; y: number }[];
}

export interface RiderEntity {
  id: string;
  name: string;
  code: string;
  phone: string;
  stationName: string;
  zoneId: string;
  zoneName: string;
  status: 'online' | 'offline' | 'resting';
  onlineDurationMins: number;
  speedKmh: number;
  todayCompleted: number;
  timeoutCount: number;
  rating: number;
  coords: { x: number; y: number };
  activeOrders: RiderActiveOrder[];
  historyTrips: { x: number; y: number; time: string }[];
}

// 5. 终端用户散点与态势接口
export interface UserEntity {
  id: string;
  phoneMask: string;
  zoneId: string;
  zoneName: string;
  lastActive: string;
  coords: { x: number; y: number };
  isCluster?: boolean;
  clusterCount?: number;
  orderFrequency: string;
}

// 6. 网格模型接口
export interface ZoneMesh {
  id: string;
  name: string;
  code: string;
  color: string;
  fillColor: string;
  polygonPoints: string;
  centerCoords: { x: number; y: number };
  managerName: string;
  managerCode: string;
  storesCount: number;
  trucksCount: number;
  ridersCount: number;
  onlineUsersCount: number;
  coverageRatePercent: number;
  supplySaturationPercent: number; // 运力饱和度
  description: string;
}

// 7. 异常预警记录
export interface AnomalyRecord {
  id: string;
  type: 'person' | 'device' | 'order' | 'coverage';
  title: string;
  detail: string;
  level: 'critical' | 'warning' | 'info';
  targetKey: string;
  zoneName: string;
  occurredAt: string;
  status: 'pending' | 'resolved';
  resolvedAt?: string;
  resolver?: string;
}

// 8. 操作审计日志
export interface AuditLogItem {
  id: string;
  action: string;
  operator: string;
  role: string;
  time: string;
  details: string;
}

// ==========================================
// 初始模拟基准数据 (完整覆盖核心业务场景)
// ==========================================

export const INITIAL_ZONES: ZoneMesh[] = [
  {
    id: 'zone-01',
    name: '静安创智 CBD',
    code: 'ZONE-01-JA',
    color: '#1a1c1b',
    fillColor: 'rgba(26,28,27,0.04)',
    // 真实贴合南京西路、陕西北路、北京西路与常德路街区围合之多边形轮廓 (12个街区拐角锚点)
    polygonPoints: '480,310 620,295 760,290 850,320 890,420 920,530 870,580 750,590 610,595 510,570 460,460 470,360',
    centerCoords: { x: 680, y: 440 },
    managerName: '陈浩',
    managerCode: 'MGR-002',
    storesCount: 1,
    trucksCount: 2,
    ridersCount: 6,
    onlineUsersCount: 420,
    coverageRatePercent: 98.5,
    supplySaturationPercent: 88,
    description: '南京西路高端写字楼群与核心商务区，白领午餐与下午茶高频消费网格。'
  },
  {
    id: 'zone-02',
    name: '苏河湾金融商圈',
    code: 'ZONE-02-SH',
    color: '#006d36',
    fillColor: 'rgba(0,109,54,0.04)',
    // 真实贴合苏州河S形蜿蜒水岸、北苏州路与四川北路滨水街区 (14个蜿蜒水岸锚点)
    polygonPoints: '860,290 960,280 1060,295 1170,305 1250,330 1310,400 1340,510 1320,620 1240,650 1120,640 1010,630 920,620 880,520 860,400',
    centerCoords: { x: 1080, y: 480 },
    managerName: '赵志成',
    managerCode: 'MGR-001',
    storesCount: 2,
    trucksCount: 3,
    ridersCount: 12,
    onlineUsersCount: 680,
    coverageRatePercent: 99.2,
    supplySaturationPercent: 94,
    description: '沿河滨水复合商圈与品质居住带，夜市经济与日式烧鸟炙烤核心集聚区。'
  },
  {
    id: 'zone-03',
    name: '张江高科创新谷',
    code: 'ZONE-03-ZJ',
    color: '#d97706',
    fillColor: 'rgba(217,119,6,0.04)',
    // 贴合世纪大道延伸段、科苑路与碧波路高科技园区街区网格 (12个园区街区锚点)
    polygonPoints: '1280,360 1420,370 1560,390 1690,420 1710,540 1680,660 1620,760 1500,770 1380,750 1260,700 1250,560 1260,440',
    centerCoords: { x: 1460, y: 560 },
    managerName: '张晓鹏',
    managerCode: 'MGR-003',
    storesCount: 1,
    trucksCount: 1,
    ridersCount: 4,
    onlineUsersCount: 320,
    coverageRatePercent: 96.8,
    supplySaturationPercent: 72,
    description: '高新技术产业集聚区，加班夜宵与程序员集中点位，移动餐车重点试点。'
  }
];

export const INITIAL_MANAGERS: ManagerEntity[] = [
  {
    id: 'mgr-001',
    name: '赵志成',
    code: 'MGR-001',
    phone: '13800138001',
    zoneId: 'zone-02',
    zoneName: '苏河湾金融商圈',
    status: 'online',
    entryDate: '2023-03-15',
    lastOnline: '刚刚',
    currentAddress: '苏河湾万象天地中庭指挥哨点',
    managedStores: 2,
    activeTrucks: 3,
    onlineRiders: 12,
    todayPatrolCount: 4,
    offlineMins: 0,
    coords: { x: 980, y: 360 },
    patrolPath: [
      { x: 920, y: 340, time: '09:30', spotName: '恒隆中庭前置工坊' },
      { x: 980, y: 360, time: '11:15', spotName: '苏河湾03号餐车出摊点' },
      { x: 1040, y: 420, time: '14:20', spotName: '万象天地外卖交接区' },
      { x: 980, y: 360, time: '17:00', spotName: '晚市高峰现场督导' }
    ]
  },
  {
    id: 'mgr-002',
    name: '陈浩',
    code: 'MGR-002',
    phone: '13800138002',
    zoneId: 'zone-01',
    zoneName: '静安创智 CBD',
    status: 'online',
    entryDate: '2023-06-20',
    lastOnline: '2分钟前',
    currentAddress: '静安大悦城直营旗舰店后勤处',
    managedStores: 1,
    activeTrucks: 2,
    onlineRiders: 6,
    todayPatrolCount: 3,
    offlineMins: 0,
    coords: { x: 640, y: 370 },
    patrolPath: [
      { x: 620, y: 350, time: '10:00', spotName: '大悦城直营店晨会' },
      { x: 720, y: 440, time: '12:00', spotName: '01号和牛车温控巡检' },
      { x: 640, y: 370, time: '15:30', spotName: '备料物流交接复核' }
    ]
  },
  {
    id: 'mgr-003',
    name: '张晓鹏',
    code: 'MGR-003',
    phone: '13800138003',
    zoneId: 'zone-03',
    zoneName: '张江高科创新谷',
    status: 'offline',
    entryDate: '2024-01-10',
    lastOnline: '52分钟前',
    currentAddress: '张江高科微型前置仓B区',
    managedStores: 1,
    activeTrucks: 1,
    onlineRiders: 4,
    todayPatrolCount: 1,
    offlineMins: 52,
    abnormalNotes: '已离线超过设定阈值 (45分钟)，未收到巡查签到报备，系统已触发标红预警！',
    coords: { x: 1420, y: 490 },
    patrolPath: [
      { x: 1420, y: 490, time: '10:30', spotName: '张江前置仓晨检' }
    ]
  }
];

export const INITIAL_STORES: StoreEntity[] = [
  {
    id: 'store-001',
    name: '苏河湾中央工坊旗舰店',
    code: 'STORE-001',
    address: '上海市静安区福建北路100号苏河湾万象天地中庭',
    openedAt: '2023-04-18',
    managerName: '赵志成',
    managerCode: 'MGR-001',
    phone: '021-62889901',
    status: 'open',
    todayOrders: 188,
    customerFlow: 540,
    revenue: 24580.0,
    stationedRiders: 8,
    onDutyStaff: 12,
    serviceRadiusMeters: 3000,
    zoneId: 'zone-02',
    zoneName: '苏河湾金融商圈',
    coords: { x: 1120, y: 420 }
  },
  {
    id: 'store-002',
    name: '静安大悦城直营精品店',
    code: 'STORE-002',
    address: '上海市静安区西藏北路166号大悦城南座1F-08',
    openedAt: '2023-08-01',
    managerName: '陈浩',
    managerCode: 'MGR-002',
    phone: '021-62889902',
    status: 'open',
    todayOrders: 142,
    customerFlow: 410,
    revenue: 18920.0,
    stationedRiders: 4,
    onDutyStaff: 8,
    serviceRadiusMeters: 2500,
    zoneId: 'zone-01',
    zoneName: '静安创智 CBD',
    coords: { x: 780, y: 350 }
  },
  {
    id: 'store-003',
    name: '张江微型快配前置仓',
    code: 'STORE-003',
    address: '上海市浦东新区张江高科博云路2号创智港北门',
    openedAt: '2024-02-15',
    managerName: '张晓鹏',
    managerCode: 'MGR-003',
    phone: '021-50889903',
    status: 'open',
    todayOrders: 96,
    customerFlow: 230,
    revenue: 11400.0,
    stationedRiders: 3,
    onDutyStaff: 5,
    serviceRadiusMeters: 3500,
    zoneId: 'zone-03',
    zoneName: '张江高科创新谷',
    coords: { x: 1480, y: 520 }
  },
  {
    id: 'store-004',
    name: '苏河湾北岸体验店',
    code: 'STORE-004',
    address: '上海市静安区天目东路98号',
    openedAt: '2023-11-20',
    managerName: '赵志成',
    managerCode: 'MGR-001',
    phone: '021-62889904',
    status: 'fault',
    todayOrders: 12,
    customerFlow: 35,
    revenue: 1420.0,
    stationedRiders: 1,
    onDutyStaff: 2,
    serviceRadiusMeters: 2000,
    zoneId: 'zone-02',
    zoneName: '苏河湾金融商圈',
    coords: { x: 990, y: 310 },
    faultReason: '后厨双温冷库传感器偶发离线，为保障食品安全暂封停接单，工程团队检修中。'
  }
];

export const INITIAL_TRUCKS: TruckEntity[] = [
  {
    id: 'truck-01',
    name: '01号黑曜和牛极速餐车',
    code: 'VAN-SHW-01',
    zoneId: 'zone-01',
    zoneName: '静安创智 CBD',
    managerName: '陈浩',
    managerCode: 'MGR-002',
    phone: '13918001001',
    status: 'open',
    dutyHoursToday: 6.5,
    todayOrders: 68,
    coveredUsers: 280,
    stoveTemp: '280°C',
    batteryPercent: 94,
    coords: { x: 720, y: 440 },
    coverageRadiusMeters: 1800,
    pendingQueue: 4,
    movingPath: [
      { x: 660, y: 410, time: '11:00', status: '出摊就位' },
      { x: 720, y: 440, time: '12:30', status: '午高峰营业中' },
      { x: 720, y: 440, time: '17:30', status: '晚市平稳巡航' }
    ],
    statusLogs: [
      { time: '10:30', oldStatus: '未打样', newStatus: '已打样/筹备完成', operator: '主厨-林师傅' },
      { time: '11:00', oldStatus: '已打样', newStatus: '正常营业', operator: '系统自动开单' }
    ],
    inspectionLogs: [
      { time: '10:45', item: '车载燃气自闭阀与排风负压', result: 'pass', inspector: '陈浩 (区经理)' },
      { time: '15:00', item: '冷藏恒温柜温度 (-2°C)', result: 'pass', inspector: '巡检专员-王工' }
    ]
  },
  {
    id: 'truck-02',
    name: '02号手作冷萃移动工坊',
    code: 'VAN-SHW-02',
    zoneId: 'zone-01',
    zoneName: '静安创智 CBD',
    managerName: '陈浩',
    managerCode: 'MGR-002',
    phone: '13918001002',
    status: 'prepped',
    dutyHoursToday: 1.0,
    todayOrders: 0,
    coveredUsers: 0,
    stoveTemp: '65°C(保温待命)',
    batteryPercent: 88,
    coords: { x: 580, y: 490 },
    coverageRadiusMeters: 1500,
    pendingQueue: 0,
    movingPath: [
      { x: 580, y: 490, time: '13:00', status: '下午茶点位就位备勤' }
    ],
    statusLogs: [
      { time: '12:30', oldStatus: '未打样', newStatus: '已打样/筹备完成', operator: '咖啡师-小赵' }
    ],
    inspectionLogs: [
      { time: '13:10', item: '纯净水反渗透过滤水质TDS', result: 'pass', inspector: '陈浩 (区经理)' }
    ]
  },
  {
    id: 'truck-03',
    name: '03号烧鸟炙烤旗舰餐车',
    code: 'VAN-SHW-03',
    zoneId: 'zone-02',
    zoneName: '苏河湾金融商圈',
    managerName: '赵志成',
    managerCode: 'MGR-001',
    phone: '13918001003',
    status: 'open',
    dutyHoursToday: 7.2,
    todayOrders: 112,
    coveredUsers: 490,
    stoveTemp: '290°C',
    batteryPercent: 86,
    coords: { x: 1040, y: 510 },
    coverageRadiusMeters: 2000,
    pendingQueue: 14, // 排队超限异常!
    movingPath: [
      { x: 990, y: 480, time: '11:30', status: '静安大悦城连廊出摊' },
      { x: 1040, y: 510, time: '17:00', status: '苏河湾夜市主哨点' }
    ],
    statusLogs: [
      { time: '11:00', oldStatus: '未打样', newStatus: '正常营业', operator: '烧鸟长-严师傅' }
    ],
    inspectionLogs: [
      { time: '16:30', item: '备料储量与炭火净风机', result: 'pass', inspector: '赵志成 (区经理)' }
    ]
  },
  {
    id: 'truck-04',
    name: '04号和风便当极速承接车',
    code: 'VAN-SHW-04',
    zoneId: 'zone-02',
    zoneName: '苏河湾金融商圈',
    managerName: '赵志成',
    managerCode: 'MGR-001',
    phone: '13918001004',
    status: 'open',
    dutyHoursToday: 6.0,
    todayOrders: 58,
    coveredUsers: 240,
    stoveTemp: '240°C',
    batteryPercent: 92,
    coords: { x: 1160, y: 570 },
    coverageRadiusMeters: 1600,
    pendingQueue: 3,
    movingPath: [
      { x: 1160, y: 570, time: '11:30', status: '苏河湾东区就位' }
    ],
    statusLogs: [
      { time: '11:15', oldStatus: '已打样', newStatus: '正常营业', operator: '主理人-郑师傅' }
    ],
    inspectionLogs: [
      { time: '11:30', item: '保温箱电控温差校验', result: 'pass', inspector: '赵志成 (区经理)' }
    ]
  },
  {
    id: 'truck-05',
    name: '05号鲜果特调甜品车',
    code: 'VAN-SHW-05',
    zoneId: 'zone-02',
    zoneName: '苏河湾金融商圈',
    managerName: '赵志成',
    managerCode: 'MGR-001',
    phone: '13918001005',
    status: 'paused',
    dutyHoursToday: 3.5,
    todayOrders: 28,
    coveredUsers: 110,
    stoveTemp: '冷萃区',
    batteryPercent: 78,
    coords: { x: 910, y: 570 },
    coverageRadiusMeters: 1200,
    pendingQueue: 0,
    movingPath: [
      { x: 910, y: 570, time: '14:00', status: '下午茶点位临时休整备料' }
    ],
    statusLogs: [
      { time: '16:00', oldStatus: '正常营业', newStatus: '暂停营业', operator: '店员补货报备' }
    ],
    inspectionLogs: [
      { time: '14:30', item: '制冰机消毒与滤芯状态', result: 'pass', inspector: '赵志成 (区经理)' }
    ]
  },
  {
    id: 'truck-06',
    name: '06号深夜串烧专备车',
    code: 'VAN-SHW-06',
    zoneId: 'zone-03',
    zoneName: '张江高科创新谷',
    managerName: '张晓鹏',
    managerCode: 'MGR-003',
    phone: '13918001006',
    status: 'open',
    dutyHoursToday: 2.5,
    todayOrders: 18,
    coveredUsers: 140,
    stoveTemp: '220°C',
    batteryPercent: 94,
    coords: { x: 1460, y: 580 },
    coverageRadiusMeters: 1800,
    pendingQueue: 1,
    movingPath: [
      { x: 1460, y: 580, time: '16:00', status: '张江园区试运营出摊' }
    ],
    statusLogs: [
      { time: '15:30', oldStatus: '已打样', newStatus: '试运营营业', operator: '烧烤师-高师傅' }
    ],
    inspectionLogs: [
      { time: '15:45', item: '底盘电力总成自检', result: 'pass', inspector: '张晓鹏 (区经理)' }
    ]
  }
];

export const INITIAL_RIDERS: RiderEntity[] = [
  {
    id: 'rider-01',
    name: '周凯',
    code: 'R-8821',
    phone: '13911112221',
    stationName: '苏河湾极速专送主哨站',
    zoneId: 'zone-02',
    zoneName: '苏河湾金融商圈',
    status: 'online',
    onlineDurationMins: 310,
    speedKmh: 24,
    todayCompleted: 26,
    timeoutCount: 0,
    rating: 4.98,
    coords: { x: 920, y: 490 },
    activeOrders: [
      {
        orderNo: 'UR-98215',
        pickupAddress: '03号烧鸟车 (苏河湾出摊点)',
        dropoffAddress: '华侨城苏河湾行政公馆 8号楼',
        pickupCoords: { x: 1040, y: 510 },
        dropoffCoords: { x: 900, y: 470 },
        status: 'delivering',
        remainingMins: 4,
        amount: 88.5,
        path: [
          { x: 1040, y: 510 },
          { x: 980, y: 500 },
          { x: 920, y: 490 },
          { x: 900, y: 470 }
        ]
      }
    ],
    historyTrips: [
      { x: 1120, y: 420, time: '14:20' },
      { x: 1040, y: 510, time: '15:10' },
      { x: 920, y: 490, time: '17:40' }
    ]
  },
  {
    id: 'rider-02',
    name: '李想',
    code: 'R-8822',
    phone: '13911112222',
    stationName: '静安创智专配分站',
    zoneId: 'zone-01',
    zoneName: '静安创智 CBD',
    status: 'online',
    onlineDurationMins: 280,
    speedKmh: 22,
    todayCompleted: 22,
    timeoutCount: 0,
    rating: 4.95,
    coords: { x: 790, y: 440 },
    activeOrders: [
      {
        orderNo: 'UR-98218',
        pickupAddress: '01号和牛车 (静安大悦城连廊)',
        dropoffAddress: '静安国际中心 2座 18F',
        pickupCoords: { x: 720, y: 440 },
        dropoffCoords: { x: 840, y: 430 },
        status: 'arriving',
        remainingMins: 2,
        amount: 118.0,
        path: [
          { x: 720, y: 440 },
          { x: 790, y: 440 },
          { x: 840, y: 430 }
        ]
      }
    ],
    historyTrips: [
      { x: 720, y: 440, time: '13:00' },
      { x: 790, y: 440, time: '17:35' }
    ]
  },
  {
    id: 'rider-03',
    name: '王强',
    code: 'R-8823',
    phone: '13911112223',
    stationName: '静安创智专配分站',
    zoneId: 'zone-01',
    zoneName: '静安创智 CBD',
    status: 'resting',
    onlineDurationMins: 190,
    speedKmh: 0,
    todayCompleted: 15,
    timeoutCount: 0,
    rating: 4.92,
    coords: { x: 670, y: 460 },
    activeOrders: [],
    historyTrips: []
  },
  {
    id: 'rider-04',
    name: '赵磊',
    code: 'R-8824',
    phone: '13911112224',
    stationName: '苏河湾极速专送主哨站',
    zoneId: 'zone-02',
    zoneName: '苏河湾金融商圈',
    status: 'online',
    onlineDurationMins: 340,
    speedKmh: 16,
    todayCompleted: 19,
    timeoutCount: 1,
    rating: 4.82,
    coords: { x: 1190, y: 530 },
    activeOrders: [
      {
        orderNo: 'UR-98204',
        pickupAddress: '苏河湾中央工坊旗舰店',
        dropoffAddress: '海伦路地铁站商圈出口',
        pickupCoords: { x: 1120, y: 420 },
        dropoffCoords: { x: 1240, y: 550 },
        status: 'timeout_risk', // 超时风险预警!
        remainingMins: 1,
        amount: 72.0,
        path: [
          { x: 1120, y: 420 },
          { x: 1190, y: 530 },
          { x: 1240, y: 550 }
        ]
      }
    ],
    historyTrips: []
  },
  {
    id: 'rider-05',
    name: '陈志远',
    code: 'R-8825',
    phone: '13911112225',
    stationName: '张江高科极速先锋站',
    zoneId: 'zone-03',
    zoneName: '张江高科创新谷',
    status: 'online',
    onlineDurationMins: 210,
    speedKmh: 28,
    todayCompleted: 21,
    timeoutCount: 0,
    rating: 4.96,
    coords: { x: 1430, y: 560 },
    activeOrders: [
      {
        orderNo: 'UR-98230',
        pickupAddress: '张江微型快配前置仓',
        dropoffAddress: '张江人工智能岛 3幢 8F',
        pickupCoords: { x: 1480, y: 520 },
        dropoffCoords: { x: 1380, y: 600 },
        status: 'delivering',
        remainingMins: 5,
        amount: 65.0,
        path: [
          { x: 1480, y: 520 },
          { x: 1430, y: 560 },
          { x: 1380, y: 600 }
        ]
      }
    ],
    historyTrips: [
      { x: 1480, y: 520, time: '14:00' },
      { x: 1430, y: 560, time: '17:25' }
    ]
  }
];

export const INITIAL_ANOMALIES: AnomalyRecord[] = [
  {
    id: 'ANM-001',
    type: 'person',
    title: '区经理长时离线未报备预警',
    detail: '张江高科创新谷负责区经理【张晓鹏 MGR-003】已连续离线超 52 分钟，未接收到例行巡检签到。',
    level: 'critical',
    targetKey: 'mgr-003',
    zoneName: '张江高科创新谷',
    occurredAt: '17:15',
    status: 'pending'
  },
  {
    id: 'ANM-002',
    type: 'device',
    title: '流动餐车排队超限分流预警',
    detail: '【03号烧鸟炙烤流动车】当前积压待制作订单达 14 单，超过负荷阈值(10单)，建议启用 04号餐车分流削峰。',
    level: 'critical',
    targetKey: 'truck-03',
    zoneName: '苏河湾金融商圈',
    occurredAt: '17:35',
    status: 'pending'
  },
  {
    id: 'ANM-003',
    type: 'order',
    title: '专送订单即将超时与路径偏离',
    detail: '骑手赵磊配送订单【#UR-98204】剩余履约时效不足 1 分钟，且轨迹偏离常规路径 200 米。',
    level: 'warning',
    targetKey: 'rider-04',
    zoneName: '苏河湾金融商圈',
    occurredAt: '17:42',
    status: 'pending'
  },
  {
    id: 'ANM-004',
    type: 'coverage',
    title: '滨江绿地东区客流密集且无运力覆盖',
    detail: '滨江步道聚集食客预估达 180 人，方圆 2.5km 内暂无在营流动餐车站桩，存在显著供给真空盲区。',
    level: 'warning',
    targetKey: 'zone-02',
    zoneName: '苏河湾金融商圈',
    occurredAt: '17:20',
    status: 'pending'
  }
];
