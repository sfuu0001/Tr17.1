/**
 * Obsidian Food Truck - Simulation Points Registry & Audit Map
 * 前端调试与功能性实验模拟点位全景登记册
 * 
 * 记录客户端项目中所有使用到状态模拟、数据仿真与实验测试的功能点位，
 * 用于开发者与管理员在调试时进行全景检查、点位高亮排查与权限锁定校验。
 */

export interface SimulationPoint {
  id: string;
  name: string;
  category: 'state_machine' | 'telemetry' | 'network' | 'business_experiment' | 'identity';
  description: string;
  filePath: string;
  triggerCondition: string;
  regularUserAllowed: boolean; // 是否允许普通非管理员用户触发（根据业务要求全部为 false）
  features: string[];
}

export const SIMULATION_POINTS_REGISTRY: SimulationPoint[] = [
  {
    id: 'SIM_ORDER_FLOW_MACHINE',
    name: '订单全生命周期 13 状态流转机',
    category: 'state_machine',
    description: '支持正向履约8个核心节点与5个异常分支（拒单/转派/退款/终止）的毫秒级即时切换与自动推演。',
    filePath: 'src/utils/orderFlowEngine.ts & src/components/tracking/TrackingStepIndicator.tsx',
    triggerCondition: '仅限管理员/开发者登录后在追踪页及调试底座触发，普通用户端彻底隐藏并锁定。',
    regularUserAllowed: false,
    features: ['13状态即时流转', '全链路自动演练', '单步推进', '异常分支模拟']
  },
  {
    id: 'SIM_RADAR_CRUISE_TRACK',
    name: '骑手高精雷达巡航与轨迹推进',
    category: 'telemetry',
    description: '模拟骑手沿配送线路的实时经纬度位移、时速脉冲、剩余米数倒计时及到店/送达终点检测。',
    filePath: 'src/components/tracking/TrackingRadarMap.tsx',
    triggerCondition: '单步模拟(+15%)与巡航演示按钮仅对管理员开放；普通用户仅展示客观实时轨迹。',
    regularUserAllowed: false,
    features: ['单步推进15%', '多倍速平滑巡航', '终点自动到店检测', 'GPS偏航校准']
  },
  {
    id: 'SIM_RIDER_REASSIGN_DISPATCH',
    name: '骑手拒单 ➔ 调度加码 ➔ 智能重派仿真',
    category: 'state_machine',
    description: '仿真原骑手突发拒单后，调度中枢注入 ¥2.00 调度补贴并重新匹配 800m 内新骑手的自动化流转。',
    filePath: 'src/App.tsx (handleAdvanceOrderStatus) & src/utils/orderFlowEngine.ts',
    triggerCondition: '管理员触发 rider_rejected 状态后系统自动联动推演；普通用户无法人工发起。',
    regularUserAllowed: false,
    features: ['拒单状态挂起', '1.8秒后自动转派', '调度补贴注入', '新骑手接单闭环']
  },
  {
    id: 'SIM_MERCHANT_REJECT_REFUND',
    name: '餐车站台拒单与原路退款闭环',
    category: 'state_machine',
    description: '模拟流动餐车高峰爆单或原料断供时的驳回接单，资金全额原路退回用户钱包/支付账户。',
    filePath: 'src/App.tsx & src/components/OrdersPageView.tsx',
    triggerCondition: '开发者调试触发，测试退单资金状态同步与消息推送。',
    regularUserAllowed: false,
    features: ['商家驳回操作', '自动原路退款', '系统通知自动同步']
  },
  {
    id: 'SIM_CUSTOMER_CANCEL_REQUEST',
    name: '顾客申请终止订单与审核流转',
    category: 'state_machine',
    description: '模拟顾客在餐车备餐阶段发起的订单终止申请，主理人介入审核判定是否可退款。',
    filePath: 'src/components/OrderTrackingView.tsx & src/App.tsx',
    triggerCondition: '普通用户端受不可退款时限锁定；管理员可任意阶段强制推演测试。',
    regularUserAllowed: false,
    features: ['退单诉求提交', '审核状态挂起', '退款结果反馈']
  },
  {
    id: 'SIM_NETWORK_THROTTLE',
    name: '网络抖动与弱网/离线注入实验',
    category: 'network',
    description: '模拟 Slow 3G (1800ms 延迟)、随机丢包或网络完全中断，测试前端抗抖动与离线Outbox队列。',
    filePath: 'src/context/DevSimulationContext.tsx & src/utils/cloudbase.ts',
    triggerCondition: '仅管理员开发者可在控制台中开启实验；普通用户访问走真实网络。',
    regularUserAllowed: false,
    features: ['延迟注入(0-3000ms)', '离线断网仿真', '离线队列重试']
  },
  {
    id: 'SIM_STOCKOUT_CIRCUIT',
    name: '菜品库存熔断与售罄拦截实验',
    category: 'business_experiment',
    description: '模拟菜品在用户加购或结算并发瞬间被抢空售罄，校验前端置灰、提示与自动移出机制。',
    filePath: 'src/context/DevSimulationContext.tsx & src/components/DishCard.tsx',
    triggerCondition: '仅开发者在控制台勾选实验菜品生效，非管理员无权篡改商品库存。',
    regularUserAllowed: false,
    features: ['一键置空库存', '加购防穿透拦截', '售罄气泡标签']
  },
  {
    id: 'SIM_PAYMENT_GATEWAY_OUTCOME',
    name: '收银支付网关结果仿真实验',
    category: 'business_experiment',
    description: '强行设定下一次结账支付的结果（即时成功、网关超时、余额不足驳回），用于健壮性测试。',
    filePath: 'src/context/DevSimulationContext.tsx & src/components/CheckoutPageView.tsx',
    triggerCondition: '仅限管理员控制台开启，确保测试结账边界。',
    regularUserAllowed: false,
    features: ['支付超时回退', '风控拒付拦截', '免密快捷支付']
  },
  {
    id: 'SIM_IDENTITY_IMPERSONATION',
    name: '多身份与VIP特权快速模拟实验',
    category: 'identity',
    description: '无需注册即可将当前前端用户一键切换为黑曜石黑卡VIP、高积分会员或零余额新用户。',
    filePath: 'src/context/DevSimulationContext.tsx & src/components/ProfilePageView.tsx',
    triggerCondition: '仅限开发者用于测试折扣计算与VIP专属权益渲染。',
    regularUserAllowed: false,
    features: ['黑卡VIP一键切换', '余额与积分设定', '身份越权边界校验']
  }
];
