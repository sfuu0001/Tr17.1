import { Order } from '../types';

export type GranularOrderStatus =
  | 'pending'              // 待商家接单 (待支付/已支付待接单)
  | 'cooking'              // 餐车已接单·制作中
  | 'ready'                // 已制作完成·保温封装
  | 'rider_heading'        // 骑手正在赶往商家
  | 'waiting_pickup'       // 等待骑手取餐·已到店待核销
  | 'picked_up'            // 骑手已取餐·装箱封签
  | 'delivering'           // 骑手配送中·极速履约
  | 'completed'            // 已送达·订单完成
  | 'cancel_requested'     // 客户申请终止订单·审核中
  | 'merchant_rejected'    // 商家已拒单·已全额退款
  | 'rider_rejected'       // 骑手已拒单·调度异常
  | 'reassigning_rider'    // 正在切换骑手·智能重新派单
  | 'refund_pending'       // 售后退款审核中
  | 'refunded'             // 已全额退款
  | 'cancelled';           // 订单已终止取消

export interface OrderStatusConfig {
  key: GranularOrderStatus;
  label: string;
  shortLabel: string;
  badgeText: string;
  subText: string;
  desc: string;
  stepIndex: number; // 0 to 7
  totalSteps: number;
  stageGroup: 'placed' | 'prep' | 'pickup' | 'dispatch' | 'completed' | 'exception';
  badgeClass: string;
  dotColor: string;
  isException?: boolean;
}

export const ORDER_STATUS_CONFIG_MAP: Record<GranularOrderStatus, OrderStatusConfig> = {
  pending: {
    key: 'pending',
    label: '待商家接单确认',
    shortLabel: '待接单',
    badgeText: 'PENDING',
    subText: '食客已完成支付，工单进入餐车系统待接单队列',
    desc: '系统已将订单推送到餐车站台，等待餐车主理人审核接单',
    stepIndex: 0,
    totalSteps: 7,
    stageGroup: 'placed',
    badgeClass: 'bg-neutral-100 text-neutral-800 border-neutral-300',
    dotColor: '#787774'
  },
  cooking: {
    key: 'cooking',
    label: '餐车已接单 · 后厨现制中',
    shortLabel: '餐车已接单',
    badgeText: 'PREPARING',
    subText: '主理人已接单，炭火炙烤台与现制工位正在全力制作',
    desc: '餐车主理人确认接单，餐品已分单至 KDS 炙烤炉台，现做现烤',
    stepIndex: 1,
    totalSteps: 7,
    stageGroup: 'prep',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    dotColor: '#d9730d'
  },
  ready: {
    key: 'ready',
    label: '已制作完成 · 待取餐',
    shortLabel: '已制作完成',
    badgeText: 'READY',
    subText: '餐品炙烤烹饪完毕，已放入餐车保温出餐架',
    desc: '后厨出餐完毕并完成双层食品级锁温封装，放入恒温取餐格等待骑手',
    stepIndex: 2,
    totalSteps: 7,
    stageGroup: 'prep',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
    dotColor: '#2563eb'
  },
  rider_heading: {
    key: 'rider_heading',
    label: '骑手已接单 · 正在赶往商家',
    shortLabel: '骑手赶往商家',
    badgeText: 'RIDER HEADING',
    subText: '专线骑手已分配并接单，正全速赶往流动餐车取餐点',
    desc: '系统匹配最优路线骑手，骑手正在前往餐车站台取餐',
    stepIndex: 3,
    totalSteps: 7,
    stageGroup: 'pickup',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    dotColor: '#4f46e5'
  },
  waiting_pickup: {
    key: 'waiting_pickup',
    label: '等待骑手取餐 · 骑手已到店',
    shortLabel: '等待骑手取餐',
    badgeText: 'ARRIVED AT TRUCK',
    subText: '骑手已到达餐车站台，正在核对单号并向主理人出示取件码',
    desc: '骑手到达餐车 50 米内，正在进行取件码核验与温控箱核对',
    stepIndex: 4,
    totalSteps: 7,
    stageGroup: 'pickup',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-300',
    dotColor: '#7c3aed'
  },
  picked_up: {
    key: 'picked_up',
    label: '骑手已取餐 · 装箱封签',
    shortLabel: '骑手已取餐',
    badgeText: 'PICKED UP',
    subText: '骑手已完成核验与餐品装箱，贴上锁鲜封签准备启程',
    desc: '骑手输入取件码完成核销，餐品放入 68℃ 智能恒温箱装箱锁温',
    stepIndex: 5,
    totalSteps: 7,
    stageGroup: 'dispatch',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-300',
    dotColor: '#0891b2'
  },
  delivering: {
    key: 'delivering',
    label: '骑手配送中 · 极速专送',
    shortLabel: '骑手配送中',
    badgeText: 'EN ROUTE',
    subText: '骑手专线极速骑行中，全程 GPS 轨迹与温控监测',
    desc: '专线骑手正在前往您的收货地址，开启绿波专送与实时温控',
    stepIndex: 6,
    totalSteps: 7,
    stageGroup: 'dispatch',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dotColor: '#059669'
  },
  completed: {
    key: 'completed',
    label: '订单已妥投送达 · 感谢惠顾',
    shortLabel: '已送达',
    badgeText: 'DELIVERED',
    subText: '餐品已安全送达指定地址，感谢您品尝黑曜石流动餐车！',
    desc: '骑手已完成现场交付/存证拍照，订单全流程圆满履约',
    stepIndex: 7,
    totalSteps: 7,
    stageGroup: 'completed',
    badgeClass: 'bg-stone-100 text-stone-800 border-stone-300',
    dotColor: '#2b593f'
  },

  // 逆向与异常分支状态
  cancel_requested: {
    key: 'cancel_requested',
    label: '客户申请终止订单 · 待商家审核',
    shortLabel: '申请终止订单',
    badgeText: 'CANCEL REQUESTED',
    subText: '客户发起了终止/取消订单申请，餐车主理人正在审核处理',
    desc: '顾客提交了终止订单申请与退款诉求，主理人确认制作进度后将审核退款',
    stepIndex: -1,
    totalSteps: 7,
    stageGroup: 'exception',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-400',
    dotColor: '#d9730d',
    isException: true
  },
  merchant_rejected: {
    key: 'merchant_rejected',
    label: '商家已拒单 · 已全额原路退款',
    shortLabel: '商家已拒单',
    badgeText: 'MERCHANT REJECTED',
    subText: '餐车因售罄或极端客流超载未能接单，款项已原路退回',
    desc: '餐车主理人已驳回订单，支付金额已自动原路全额退回到付款账户',
    stepIndex: -1,
    totalSteps: 7,
    stageGroup: 'exception',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-400',
    dotColor: '#e11d48',
    isException: true
  },
  rider_rejected: {
    key: 'rider_rejected',
    label: '骑手已拒单 · 触发调度风控',
    shortLabel: '骑手已拒单',
    badgeText: 'RIDER REJECTED',
    subText: '原分配骑手因运力突发原因拒单，正在触发调度中枢重派',
    desc: '原骑手因路况或突发情况取消该单，系统记录风控并触发调度加码',
    stepIndex: -1,
    totalSteps: 7,
    stageGroup: 'exception',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-400',
    dotColor: '#ea580c',
    isException: true
  },
  reassigning_rider: {
    key: 'reassigning_rider',
    label: '正在切换骑手 · 智能重新派单中',
    shortLabel: '正在切换骑手',
    badgeText: 'REASSIGNING RIDER',
    subText: '调度系统自动加码运力补贴，正在匹配周边 1km 最优专送骑手',
    desc: '调度中枢已启动紧急重派机制，注入加急补贴，正在锁定就近可用运力',
    stepIndex: -1,
    totalSteps: 7,
    stageGroup: 'exception',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
    dotColor: '#f59e0b',
    isException: true
  },
  refund_pending: {
    key: 'refund_pending',
    label: '退款审核中 · 售后处理中',
    shortLabel: '退款审核中',
    badgeText: 'REFUND PENDING',
    subText: '退单申请正在处理中，客服与商家正在审核退款原委',
    desc: '客户提交了售后申请，等待餐车主理人核对后全额退款',
    stepIndex: -1,
    totalSteps: 7,
    stageGroup: 'exception',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    dotColor: '#d9730d',
    isException: true
  },
  refunded: {
    key: 'refunded',
    label: '已全额退款 · 订单已关闭',
    shortLabel: '已全额退款',
    badgeText: 'REFUNDED',
    subText: '订单已成功终止并完成全额退款，原路返还至支付账户',
    desc: '退款流程已全部执行完成，资金原路返还，订单归档关闭',
    stepIndex: -1,
    totalSteps: 7,
    stageGroup: 'exception',
    badgeClass: 'bg-stone-200 text-stone-700 border-stone-400',
    dotColor: '#787774',
    isException: true
  },
  cancelled: {
    key: 'cancelled',
    label: '订单已取消终止',
    shortLabel: '已取消',
    badgeText: 'CANCELLED',
    subText: '订单已终止并关闭',
    desc: '该订单已终止执行并归档',
    stepIndex: -1,
    totalSteps: 7,
    stageGroup: 'exception',
    badgeClass: 'bg-stone-200 text-stone-700 border-stone-400',
    dotColor: '#787774',
    isException: true
  }
};

/**
 * 规范化解析订单当前状态配置
 */
export function getOrderStatusConfig(orderOrStatus?: Order | string | null): OrderStatusConfig {
  if (!orderOrStatus) {
    return ORDER_STATUS_CONFIG_MAP.pending;
  }
  const statusStr = (typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus.status || 'pending').toLowerCase();

  // 1. 检查是否存在直接匹配
  if (statusStr in ORDER_STATUS_CONFIG_MAP) {
    return ORDER_STATUS_CONFIG_MAP[statusStr as GranularOrderStatus];
  }

  // 2. 兼容各种历史或变体关键词匹配
  if (statusStr.includes('merchant_reject') || statusStr.includes('商家已拒单') || statusStr.includes('商家拒单')) {
    return ORDER_STATUS_CONFIG_MAP.merchant_rejected;
  }
  if (statusStr.includes('rider_reject') || statusStr.includes('骑手已拒单') || statusStr.includes('骑手拒单')) {
    return ORDER_STATUS_CONFIG_MAP.rider_rejected;
  }
  if (statusStr.includes('reassign') || statusStr.includes('切换骑手') || statusStr.includes('重新派单')) {
    return ORDER_STATUS_CONFIG_MAP.reassigning_rider;
  }
  if (statusStr.includes('cancel_request') || statusStr.includes('终止') || statusStr.includes('申请取消')) {
    return ORDER_STATUS_CONFIG_MAP.cancel_requested;
  }
  if (statusStr.includes('refund_pending') || statusStr.includes('退款中') || statusStr.includes('退单申请')) {
    return ORDER_STATUS_CONFIG_MAP.cancel_requested;
  }
  if (statusStr.includes('refunded') || statusStr.includes('已退款')) {
    return ORDER_STATUS_CONFIG_MAP.refunded;
  }
  if (statusStr.includes('heading') || statusStr.includes('赶往商家') || statusStr.includes('正在赶往')) {
    return ORDER_STATUS_CONFIG_MAP.rider_heading;
  }
  if (statusStr.includes('waiting') || statusStr.includes('等待取餐') || statusStr.includes('到店待取')) {
    return ORDER_STATUS_CONFIG_MAP.waiting_pickup;
  }
  if (statusStr.includes('picked') || statusStr.includes('已取餐')) {
    return ORDER_STATUS_CONFIG_MAP.picked_up;
  }
  if (statusStr.includes('ready') || statusStr.includes('已制作完成') || statusStr.includes('制作完成')) {
    return ORDER_STATUS_CONFIG_MAP.ready;
  }
  if (statusStr.includes('deliver') || statusStr.includes('配送') || statusStr.includes('en_route')) {
    return ORDER_STATUS_CONFIG_MAP.delivering;
  }
  if (statusStr.includes('complet') || statusStr.includes('送达') || statusStr.includes('妥投')) {
    return ORDER_STATUS_CONFIG_MAP.completed;
  }
  if (statusStr.includes('cook') || statusStr.includes('制作') || statusStr.includes('备餐') || statusStr.includes('接单')) {
    return ORDER_STATUS_CONFIG_MAP.cooking;
  }

  return ORDER_STATUS_CONFIG_MAP.pending;
}

/**
 * 完整细化流转步骤清单（正向主链）
 */
export const SEQUENTIAL_FORWARD_FLOW: GranularOrderStatus[] = [
  'pending',          // 1. 待商家接单
  'cooking',          // 2. 餐车已接单·后厨制作中
  'ready',            // 3. 已制作完成·保温封装
  'rider_heading',    // 4. 骑手正在赶往商家
  'waiting_pickup',   // 5. 等待骑手取餐·骑手已到店
  'picked_up',        // 6. 骑手已取餐·装箱封签
  'delivering',       // 7. 骑手配送中·极速专送
  'completed'         // 8. 订单已送达
];

/**
 * 所有细化动态流程清单（包含异常与调度分支）
 */
export const ALL_GRANULAR_FLOW_STEPS: {
  key: GranularOrderStatus;
  title: string;
  category: '正向主流程' | '异常与调度分支';
  desc: string;
}[] = [
  { key: 'pending', title: '待商家接单', category: '正向主流程', desc: '用户已提交支付，餐车接单排队中' },
  { key: 'cooking', title: '餐车已接单', category: '正向主流程', desc: '餐车主理人已接单，炉台炭火现制中' },
  { key: 'ready', title: '已制作完成', category: '正向主流程', desc: '出餐烹饪完毕，置于恒温取餐格' },
  { key: 'rider_heading', title: '骑手正在赶往商家', category: '正向主流程', desc: '专线骑手接单并开启高德导航前往餐车' },
  { key: 'waiting_pickup', title: '等待骑手取餐', category: '正向主流程', desc: '骑手已到达餐车站台，等待核验取件码' },
  { key: 'picked_up', title: '骑手已取餐', category: '正向主流程', desc: '骑手核验通过，装入 68℃ 恒温箱锁鲜' },
  { key: 'delivering', title: '骑手配送中', category: '正向主流程', desc: '骑手专线极速送餐，实时轨迹更新' },
  { key: 'completed', title: '已送达', category: '正向主流程', desc: '已顺利妥投交付客户，订单完结' },
  { key: 'cancel_requested', title: '客户申请终止订单', category: '异常与调度分支', desc: '食客提交申请终止，主理人审核中' },
  { key: 'merchant_rejected', title: '商家已拒单', category: '异常与调度分支', desc: '餐车因超载/物料售罄驳回，全额原路退款' },
  { key: 'rider_rejected', title: '骑手已拒单', category: '异常与调度分支', desc: '骑手由于突发车辆故障/路况取消工单' },
  { key: 'reassigning_rider', title: '正在切换骑手', category: '异常与调度分支', desc: '系统注入调度补贴，智能转派就近新骑手' },
  { key: 'refunded', title: '已全额退款', category: '异常与调度分支', desc: '款项原路返还，流程正式终止关闭' }
];
