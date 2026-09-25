import { DishItem, Order, TruckInfo, TableItem, KdsTicket, HeldOrder, PoolDeliveryOrder, ActiveDeliveryOrder } from '../types';

export const INITIAL_TABLES: TableItem[] = [
  // 01号车 (静安大悦城旗舰车) 台位矩阵
  {
    id: 'tbl-1',
    truckId: 'truck-01',
    code: 'A1',
    name: '餐车外摆 01 号桌',
    zone: 'patio',
    zoneLabel: '餐车外摆区',
    capacity: 2,
    currentGuests: 2,
    status: 'dining',
    elapsedMinutes: 28,
    orderNo: 'UR-DIN-9821',
    orderTime: '12:20',
    tablePhase: 'serving',
    serverName: '小林 (No.04)',
    totalAmount: 186.0,
    flowNodes: [
      { id: 'fn-1', nodeKey: 'placed', title: '扫码开台下单', description: '微信扫码开台成功，预收已确认', time: '12:20', status: 'completed', operator: '食客本人' },
      { id: 'fn-2', nodeKey: 'kitchen_accepted', title: '后厨接单排产', description: '炭火档与饮品档已同步接单', time: '12:21', status: 'completed', operator: '厨师长阿豪' },
      { id: 'fn-3', nodeKey: 'cooking', title: '核心菜品炙烤', description: '和牛汉堡肉饼高温炭火炙烤', time: '12:25', status: 'completed', operator: '炙烤专岗' },
      { id: 'fn-4', nodeKey: 'serving', title: '陆续出餐上桌', description: '已上桌 2 道，余 1 道最后浇汁出锅', time: '12:38', status: 'current', operator: '传菜员小林' },
      { id: 'fn-5', nodeKey: 'all_served', title: '餐品全部齐备', description: '所有单品已核对上齐，尽享美餐', status: 'pending' },
      { id: 'fn-6', nodeKey: 'completed', title: '结账清台就绪', description: '宾客就餐完毕，保洁翻台备候', status: 'pending' }
    ],
    orderItems: [
      { 
        id: 'td-1',
        name: '碳烤和牛小汉堡双重奏', 
        quantity: 2, 
        price: 126.0,
        serveStatus: 'served',
        prepProgress: 100,
        station: '炭火炙烤档',
        serveTime: '12:35',
        options: '五分熟, 招牌黑椒汁',
        isChefSpecial: true
      },
      { 
        id: 'td-2',
        name: '黑曜极夜冷萃冰咖', 
        quantity: 1, 
        price: 22.0,
        serveStatus: 'served',
        prepProgress: 100,
        station: '冷饮现调档',
        serveTime: '12:26',
        options: '少冰, 无糖'
      },
      { 
        id: 'td-3',
        name: '冷萃黑金茉莉提拉米苏', 
        quantity: 1, 
        price: 38.0,
        serveStatus: 'cooking',
        prepProgress: 75,
        station: '西点烘焙档',
        options: '微甜, 加双份可可粉'
      }
    ]
  },
  {
    id: 'tbl-2',
    truckId: 'truck-01',
    code: 'A2',
    name: '餐车外摆 02 号桌',
    zone: 'patio',
    zoneLabel: '餐车外摆区',
    capacity: 4,
    currentGuests: 3,
    status: 'dining',
    elapsedMinutes: 12,
    orderNo: 'UR-DIN-7078',
    orderTime: '12:36',
    tablePhase: 'cooking',
    serverName: '阿豪 (No.02)',
    totalAmount: 248.0,
    flowNodes: [
      { id: 'fn-21', nodeKey: 'placed', title: '扫码开台下单', description: '宾客 3 人开台，已勾选 3 项招牌单品', time: '12:36', status: 'completed', operator: '食客本人' },
      { id: 'fn-22', nodeKey: 'kitchen_accepted', title: '后厨接单排产', description: '分档分发，果木五花与玉棋已入炉', time: '12:37', status: 'completed', operator: '主理人阿豪' },
      { id: 'fn-23', nodeKey: 'cooking', title: '核心菜品炙烤', description: '主厨正在炭火慢烘黑豚五花与熔岩蛋糕', time: '12:40', status: 'current', operator: '炭烤主厨' },
      { id: 'fn-24', nodeKey: 'serving', title: '陆续出餐上桌', description: '待出炉后即刻出餐', status: 'pending' },
      { id: 'fn-25', nodeKey: 'all_served', title: '餐品全部齐备', description: '等待齐菜', status: 'pending' },
      { id: 'fn-26', nodeKey: 'completed', title: '结账清台就绪', description: '待就餐完毕', status: 'pending' }
    ],
    orderItems: [
      { 
        id: 'td-21',
        name: '果木烟熏黑豚炙烤五花', 
        quantity: 1, 
        price: 55.0,
        serveStatus: 'cooking',
        prepProgress: 80,
        station: '炭火炙烤档',
        options: '孜然椒盐味, 焦香金黄',
        isChefSpecial: true
      },
      { 
        id: 'td-22',
        name: '黑松露墨汁手工玉棋', 
        quantity: 2, 
        price: 176.0,
        serveStatus: 'cooking',
        prepProgress: 60,
        station: '意式现煮档',
        options: '浓郁黑松露酱, 现磨巴马干酪'
      },
      { 
        id: 'td-23',
        name: '火山岩黑熔岩蛋糕', 
        quantity: 1, 
        price: 36.0,
        serveStatus: 'preparing',
        prepProgress: 30,
        station: '西点烘焙档',
        options: '流心爆浆'
      }
    ]
  },
  {
    id: 'tbl-3',
    truckId: 'truck-01',
    code: 'A3',
    name: '餐车外摆 03 号桌',
    zone: 'patio',
    zoneLabel: '餐车外摆区',
    capacity: 2,
    status: 'cleaning',
    elapsedMinutes: 4,
    orderNo: 'UR-DIN-9790',
    orderTime: '11:40',
    tablePhase: 'completed',
    serverName: '阿豪 (No.02)'
  },
  {
    id: 'tbl-4',
    truckId: 'truck-01',
    code: 'B1',
    name: '散座 01 号位',
    zone: 'hall',
    zoneLabel: '室内散座',
    capacity: 2,
    status: 'idle',
    orderNo: 'UR-DIN-B01'
  },
  {
    id: 'tbl-5',
    truckId: 'truck-01',
    code: 'B2',
    name: '散座 02 号位',
    zone: 'hall',
    zoneLabel: '室内散座',
    capacity: 4,
    currentGuests: 4,
    status: 'dining',
    elapsedMinutes: 42,
    orderNo: 'UR-DIN-8815',
    orderTime: '12:05',
    tablePhase: 'all_served',
    serverName: '小林 (No.04)',
    totalAmount: 312.0,
    flowNodes: [
      { id: 'fn-51', nodeKey: 'placed', title: '扫码开台下单', description: '宾客 4 人聚餐点单', time: '12:05', status: 'completed' },
      { id: 'fn-52', nodeKey: 'kitchen_accepted', title: '后厨接单排产', description: '牛排炭火档加急排单', time: '12:06', status: 'completed' },
      { id: 'fn-53', nodeKey: 'cooking', title: '核心菜品炙烤', description: '和牛排与汉堡已炙烤熟成', time: '12:18', status: 'completed' },
      { id: 'fn-54', nodeKey: 'serving', title: '陆续出餐上桌', description: '已全部核对无误上齐', time: '12:30', status: 'completed' },
      { id: 'fn-55', nodeKey: 'all_served', title: '餐品全部齐备', description: '桌台菜品已全齐，用餐中', time: '12:32', status: 'completed' },
      { id: 'fn-56', nodeKey: 'completed', title: '结账清台就绪', description: '宾客用餐完毕后出单结账', status: 'pending' }
    ],
    orderItems: [
      { 
        id: 'td-51',
        name: '极炙炭烤和牛排 (300g)', 
        quantity: 1, 
        price: 188.0,
        serveStatus: 'served',
        prepProgress: 100,
        station: '炭火炙烤档',
        serveTime: '12:28',
        options: '七分熟, 喜马拉雅黑岩盐',
        isChefSpecial: true
      },
      { 
        id: 'td-52',
        name: '碳烤和牛小汉堡双重奏', 
        quantity: 1, 
        price: 63.0,
        serveStatus: 'served',
        prepProgress: 100,
        station: '炭火炙烤档',
        serveTime: '12:24'
      },
      { 
        id: 'td-53',
        name: '黑曜极夜冷萃冰咖', 
        quantity: 2, 
        price: 44.0,
        serveStatus: 'served',
        prepProgress: 100,
        station: '冷饮现调档',
        serveTime: '12:10'
      }
    ]
  },
  {
    id: 'tbl-6',
    truckId: 'truck-01',
    code: 'C1',
    name: '雅致景观卡座 01',
    zone: 'booth',
    zoneLabel: '雅致卡座',
    capacity: 6,
    status: 'reserved',
    reservation: {
      guestName: '张先生 (VIP)',
      phone: '138****9912',
      timeText: '18:30 (预计 15 分钟后到店)',
      countdownMinutes: 15
    }
  },
  {
    id: 'tbl-7',
    truckId: 'truck-01',
    code: 'C2',
    name: '雅致景观卡座 02',
    zone: 'booth',
    zoneLabel: '雅致卡座',
    capacity: 6,
    status: 'idle'
  },
  // 02号车 (科技园分舵) 专属台位
  {
    id: 'tbl-02-1',
    truckId: 'truck-02',
    code: 'K1',
    name: '科技园露天吧台 01',
    zone: 'patio',
    zoneLabel: '餐车外摆区',
    capacity: 2,
    currentGuests: 2,
    status: 'dining',
    elapsedMinutes: 18,
    serverName: '张伟 (No.07)',
    totalAmount: 142.0,
    orderItems: [
      { name: '碳烤和牛小汉堡双重奏', quantity: 2, price: 126.0 },
      { name: '黑曜极夜冷萃冰咖', quantity: 1, price: 22.0 }
    ]
  },
  {
    id: 'tbl-02-2',
    truckId: 'truck-02',
    code: 'K2',
    name: '科技园露天吧台 02',
    zone: 'patio',
    zoneLabel: '餐车外摆区',
    capacity: 2,
    status: 'idle'
  },
  {
    id: 'tbl-02-3',
    truckId: 'truck-02',
    code: 'T1',
    name: '极速自提等候区 01',
    zone: 'hall',
    zoneLabel: '室内散座',
    capacity: 4,
    status: 'idle'
  },
  // 03号车 (滨江潮玩站) 专属台位
  {
    id: 'tbl-03-1',
    truckId: 'truck-03',
    code: 'S1',
    name: '滨江江景露营椅 01',
    zone: 'patio',
    zoneLabel: '餐车外摆区',
    capacity: 2,
    currentGuests: 2,
    status: 'dining',
    elapsedMinutes: 35,
    serverName: '李欣 (No.09)',
    totalAmount: 215.0,
    orderItems: [
      { name: '果木烟熏黑豚炙烤五花', quantity: 2, price: 110.0 },
      { name: '暗夜冷萃黑金特调', quantity: 2, price: 56.0 }
    ]
  },
  {
    id: 'tbl-03-2',
    truckId: 'truck-03',
    code: 'S2',
    name: '滨江江景露营椅 02',
    zone: 'patio',
    zoneLabel: '餐车外摆区',
    capacity: 4,
    status: 'idle'
  }
];

export const INITIAL_KDS_TICKETS: KdsTicket[] = [
  {
    id: 'kds-1',
    ticketNo: '#KDS-082',
    tableOrChannel: '外摆 A1 桌',
    channelType: 'dine_in',
    orderTime: '18:14',
    elapsedMinutes: 6,
    status: 'cooking',
    items: [
      { id: 'ki-1', dishName: '碳烤和牛小汉堡双重奏', quantity: 2, options: '五分熟 + 松露薯条', notes: '不要洋葱', isCompleted: false },
      { id: 'ki-2', dishName: '黑松露墨汁手工玉棋', quantity: 1, options: '现刨黑松露加量', isCompleted: true },
      { id: 'ki-3', dishName: '黑曜极夜冷萃冰咖', quantity: 2, options: '少冰无糖', isCompleted: true }
    ]
  },
  {
    id: 'kds-2',
    ticketNo: '#UR-9821',
    tableOrChannel: '外卖专送 #UR-9821',
    channelType: 'delivery',
    orderTime: '18:08',
    elapsedMinutes: 12,
    status: 'cooking',
    items: [
      { id: 'ki-4', dishName: '果木烟熏黑豚炙烤五花', quantity: 1, options: '黑蒜微辣 + 厚切薯角', notes: '加急专送', isCompleted: false },
      { id: 'ki-5', dishName: '碳烤和牛小汉堡双重奏', quantity: 1, options: '七分熟', isCompleted: false }
    ]
  },
  {
    id: 'kds-3',
    ticketNo: '#UR-9804',
    tableOrChannel: '外卖专送 #UR-9804',
    channelType: 'delivery',
    orderTime: '18:02',
    elapsedMinutes: 18,
    status: 'cooking',
    items: [
      { id: 'ki-6', dishName: '极炙和牛拼盘 (双人份)', quantity: 1, options: '主厨特调酱', notes: '超时催单中！', isCompleted: false },
      { id: 'ki-7', dishName: '冷萃黑金茉莉提拉米苏', quantity: 2, isCompleted: true }
    ]
  }
];

export const INITIAL_HELD_ORDERS: HeldOrder[] = [
  {
    id: 'held-1',
    orderNo: '#HOLD-901',
    tableCode: 'A1',
    tableName: '餐车外摆 01 号桌',
    serverName: '小林 (No.04)',
    startTime: '17:35',
    heldMinutes: 38,
    totalAmount: 186.0,
    isHighRisk: true,
    items: [
      { name: '碳烤和牛小汉堡双重奏', quantity: 2, price: 126.0 },
      { name: '冷萃黑金茉莉提拉米苏', quantity: 1, price: 38.0 },
      { name: '黑曜极夜冷萃冰咖', quantity: 1, price: 22.0 }
    ]
  },
  {
    id: 'held-2',
    orderNo: '#HOLD-902',
    tableCode: 'B2',
    tableName: '散座 02 号位',
    serverName: '阿豪 (No.02)',
    startTime: '17:55',
    heldMinutes: 18,
    totalAmount: 312.0,
    isHighRisk: false,
    items: [
      { name: '极炙炭烤和牛排 (300g)', quantity: 1, price: 188.0 },
      { name: '碳烤和牛小汉堡双重奏', quantity: 1, price: 63.0 },
      { name: '黑曜极夜冷萃冰咖', quantity: 2, price: 44.0 }
    ]
  }
];

export const INITIAL_POOL_ORDERS: PoolDeliveryOrder[] = [
  {
    id: 'pool-1',
    orderNo: 'UR-9823',
    userId: 'tcb_u_10293847',
    userPhone: '139-1122-3344',
    customerName: '张总 (星空影院)',
    originName: '黑曜石 01 号流动餐车',
    originAddress: '大悦城北座 1 号门外广场 (距您 350m)',
    distanceToOriginMeters: 350,
    destinationName: '静安大悦城 8 楼影院 3 号检票口',
    destinationAddress: '西藏北路 166 号大悦城 8F',
    distanceKm: 0.45,
    itemsSummary: '黑松露炭烤和牛汉堡 x1 + 冰拿铁 x1',
    itemCount: 2,
    estimatedEarnings: 9.5,
    baseFee: 5.5,
    distanceFee: 2.0,
    truckSubsidy: 2.0,
    urgentTag: '加急专送 +¥2.0',
    isTruckSpecial: true,
    publishedTimeAgo: '1 分钟前发布',
    expectedDeliveryTime: '18:40 (剩余 22 分钟)'
  },
  {
    id: 'pool-2',
    orderNo: 'UR-9825',
    userId: 'tcb_u_88201948',
    userPhone: '138-8888-9201',
    customerName: '先锋食客 · 墨客',
    originName: '黑曜石 01 号流动餐车',
    originAddress: '大悦城北座 1 号门外广场 (距您 420m)',
    distanceToOriginMeters: 420,
    destinationName: '西藏北路 199 号金融大厦 18F 前台',
    destinationAddress: '西藏北路 199 号金融大厦 1802',
    distanceKm: 0.82,
    itemsSummary: '极炙和牛拼盘 (双人份) x1 + 提拉米苏 x2',
    itemCount: 3,
    estimatedEarnings: 12.0,
    baseFee: 5.5,
    distanceFee: 3.5,
    truckSubsidy: 1.5,
    tipFee: 1.5,
    urgentTag: 'VIP 免运专派',
    isTruckSpecial: true,
    publishedTimeAgo: '3 分钟前发布',
    expectedDeliveryTime: '18:50 (剩余 32 分钟)'
  },
  {
    id: 'pool-3',
    orderNo: 'UR-9828',
    userId: 'tcb_u_77889900',
    userPhone: '137-5566-7788',
    customerName: '刘女士 (河滨花园)',
    originName: '黑曜石 01 号流动餐车',
    originAddress: '大悦城北座 1 号门外广场 (距您 280m)',
    distanceToOriginMeters: 280,
    destinationName: '曲阜路 58 弄河滨花园 3 号楼 601',
    destinationAddress: '曲阜路 58 弄 3 号楼 601',
    distanceKm: 1.4,
    itemsSummary: '果木烟熏黑豚五花 x2 + 冷萃咖啡 x2',
    itemCount: 4,
    estimatedEarnings: 14.5,
    baseFee: 5.5,
    distanceFee: 5.0,
    truckSubsidy: 2.0,
    tipFee: 2.0,
    urgentTag: '高额补贴单',
    isTruckSpecial: false,
    publishedTimeAgo: '5 分钟前发布',
    expectedDeliveryTime: '19:00 (剩余 42 分钟)'
  }
];

export const INITIAL_ACTIVE_DELIVERY: ActiveDeliveryOrder = {
  id: 'del-active-1',
  orderNo: 'UR-9821',
  userId: 'tcb_u_88201948',
  phase: 'pickup',
  truckName: '黑曜石 01 号流动餐车',
  truckAddress: '西藏北路曲阜路交叉口 · 大悦城南广场',
  truckDistanceMeters: 220,
  customerName: '先锋食客 · 墨客 (VIP)',
  customerPhone: '138-8888-9201',
  deliveryAddress: '西藏北路 166 号大悦城商务座 1204 室',
  addressDistanceKm: 0.52,
  items: [
    { name: '碳烤和牛小汉堡双重奏 (五分熟)', quantity: 2, price: 126.0, checked: true },
    { name: '黑曜极夜冷萃冰咖 (少冰)', quantity: 1, price: 22.0, checked: false }
  ],
  totalPrice: 148.0,
  courierEarnings: 8.5,
  customerNote: '请勿敲门，放在前台取餐架并拍照通知即可，谢谢！',
  etaMinutes: 14,
  speedKmh: 21,
  routeProgress: 35
};
