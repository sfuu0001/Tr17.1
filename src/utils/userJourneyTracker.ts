/**
 * 用户全链路微时序操作监听与强判断流失诊断引擎 (User Journey Tracker Pro)
 * 
 * 核心升级特性：
 * 1. 【高精度微时序追踪】：精确到毫秒级（HH:mm:ss.SSS）记录用户端每一次细粒度交互
 * 2. 【五大分段业务阶段】：探索导购段 -> 选配定制段 -> 购物车筹备段 -> 收银决策段 -> 支付履约段
 * 3. 【强判断诊断引擎】：基于行为特征与停留时序，自动诊断 7 大类流失/阻力归因并生成针对性挽回策略
 * 4. 【犹豫与卡点探测】：自动探测规格切换纠结、起送门槛敏感、结算临门一脚中断等阻碍
 */

export type JourneyNodeType =
  | 'landing'           // 1. 进店访问
  | 'browsing'          // 2. 浏览菜单/分类
  | 'view_detail'       // 3. 点击菜品详情/选配
  | 'cart_active'       // 4. 加入购物车/选购中
  | 'checkout'          // 5. 进入收银结算台
  | 'payment_pending'   // 6. 拉起支付/等待付款
  | 'order_success'     // 7. 支付成功成单
  | 'completed'         // 7. 支付成功成单 (同义别名)
  | 'cancelled'         // 8. 主动取消
  | 'idle_exit';        // 9. 闲置超时/无操作退出

export type JourneyStage =
  | 'stage_discovery'    // 探索导购段: 进店、切换模式、选桌、浏览分类
  | 'stage_selection'    // 选配定制段: 查看详情、规格选择、变体切换、加购
  | 'stage_cart'         // 购物车筹备段: 展开抽屉、修改数量、删除单项、清空
  | 'stage_checkout'     // 收银决策段: 结算台、优惠券、地址、备注、退出放弃
  | 'stage_fulfillment'  // 支付履约段: 提交订单、等待扫码、支付成功、雷达追踪、退单
  | 'stage_inactive';    // 闲置跳出段: 超时跳出、页面关闭

export type UserActionType =
  | 'page_enter'              // 进店访问
  | 'switch_dining_mode'       // 切换就餐模式 (堂食/外卖/自提)
  | 'select_table'             // 绑定堂食桌号
  | 'select_category'          // 切换分类
  | 'select_subcategory'       // 切换子分类
  | 'view_dish'                // 查看菜品详情
  | 'open_dish_modal'          // 展开菜品定制面板
  | 'close_dish_modal'         // 关闭菜品定制面板 (未加购)
  | 'select_spec_option'       // 选择规格选项 (辣度/分量/配料)
  | 'change_dish_variant'      // 切换主规格变体
  | 'modify_spec'              // 调整规格/辣度 (别名兼容)
  | 'add_to_cart'              // 确认加购
  | 'quick_add'                // 快捷+1加购
  | 'batch_add'                // 批量多选加购
  | 'modify_cart_qty'          // 修改购物车数量
  | 'remove_cart_item'         // 移除单项
  | 'clear_cart'               // 清空购物车
  | 'open_cart'                // 打开购物车抽屉
  | 'view_cart'                // 查看购物车抽屉
  | 'close_cart'               // 关闭购物车抽屉
  | 'enter_checkout'           // 点击去结算
  | 'select_payment_method'    // 切换支付方式
  | 'apply_coupon'             // 选择并使用卡券
  | 'claim_coupon_qr'          // 扫码领取优惠券
  | 'cancel_coupon'            // 取消卡券
  | 'input_order_notes'        // 输入订单备注
  | 'cancel_checkout'          // 退出结算台
  | 'submit_order'             // 提交订单
  | 'cancel_order'             // 取消订单
  | 'view_tracking'            // 查看雷达配送
  | 'idle_heartbeat'           // 无操作心跳
  | 'idle_timeout'             // 闲置超时
  | 'exit_page';               // 离开页面

export type JudgmentType =
  | 'CRITICAL_CHECKOUT_ABANDON'   // 🚨 临门一脚中断 (结算页未付款返回)
  | 'SPEC_CONFUSION_DROP'         // ⚠️ 规格纠结放弃 (多次切换定制选项后关闭退出)
  | 'DELIVERY_THRESHOLD_BLOCK'    // 🛑 起送/运费门槛阻退 (未满包邮在结算前放弃)
  | 'CART_EMPTIED_LEAVE'          // 🛒 清空购物车跑单 (选购后主动全清)
  | 'DINE_IN_UNBOUND_QUIT'        // 🪑 堂食桌台未选放弃
  | 'BOUNCE_NO_INTERACTION'       // ⏱️ 进店冷启动秒退
  | 'SEAMLESS_PURCHASE';          // ⭐ 顺畅极速成单

export interface GranularDiagnosticInfo {
  judgmentType: JudgmentType;
  judgmentTitle: string;
  judgmentBadgeColor: 'red' | 'amber' | 'emerald' | 'purple' | 'neutral';
  hesitationIndex: number; // 0 - 100 犹豫指数
  frictionLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  summaryDiagnosis: string; // 核心诊断归因
  actionableSuggestion: string; // 针对性挽回策略
  detectedBottleneckNode?: JourneyNodeType;
}

export interface JourneyActionLog {
  id: string;
  stepIndex: number;               // 第几步操作
  stage: JourneyStage;             // 所处业务阶段
  stageLabel: string;              // 阶段中文名
  timestamp: number;               // 毫秒时间戳
  timeStr: string;                 // 精确时间: HH:mm:ss.SSS
  actionType: UserActionType;      // 操作分类
  label: string;                   // 详尽可读描述
  node: JourneyNodeType;           // 对应漏斗节点
  durationFromPrevMs: number;      // 距上一次操作间隔毫秒
  durationFromPrevSeconds: number; // 兼容秒数
  dwellSeconds?: number;           // 停留时长
  isHesitation?: boolean;          // 是否属于犹豫行为
  riskLevel?: 'normal' | 'hesitation' | 'high_friction' | 'critical_dropoff';
  details?: Record<string, any>;   // 业务快照数据
}

export interface UserJourneySession {
  sessionId: string;
  userId: string;
  userPhone?: string;
  userDevice: string;
  sourceChannel: '扫码点餐' | '外卖配送' | '公众号/小程序' | '到店自提' | '直接访问';
  startTime: number;
  lastActiveTime: number;
  totalDurationSeconds: number;
  status: 'active' | 'completed' | 'abandoned' | 'cancelled' | 'idle_timeout';
  currentNode: JourneyNodeType;
  dropOffNode?: JourneyNodeType;
  dropOffReason?: string;
  actions: JourneyActionLog[];
  cartSnapshot?: {
    itemsCount: number;
    totalPrice: number;
    dishNames: string[];
  };
  orderNo?: string;
  orderAmount?: number;
  diagnosis?: GranularDiagnosticInfo;
  hesitationScore?: number;
  frictionPointsCount?: number;
}

export interface FunnelNodeMetric {
  node: JourneyNodeType;
  name: string;
  stepIndex: number;
  stageName: string;
  reachedSessionsCount: number;
  dropOffCount: number;
  conversionRatePercent: number;
  overallConversionPercent: number;
  dropOffPercent: number;
  typicalReasons: string[];
  avgDwellSeconds: number;
  frictionLevel: 'low' | 'medium' | 'high';
}

const STORAGE_KEY_SESSIONS = 'obsidian_user_journey_sessions_v1';
const CURRENT_SESSION_ID_KEY = 'obsidian_current_journey_session_id';

class UserJourneyTracker {
  private currentSessionId: string | null = null;
  private lastActionTimestamp: number = Date.now();
  private idleCheckTimer: any = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.initCurrentSession();
    this.startIdleMonitor();
  }

  /**
   * 初始化或恢复当前浏览器会话
   */
  public initCurrentSession(customUserId?: string): string {
    if (typeof window === 'undefined') return 'SESSION-DEFAULT';

    let sid = sessionStorage.getItem(CURRENT_SESSION_ID_KEY);
    if (!sid) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      sid = `SES-${datePart}-${randomSuffix}`;
      sessionStorage.setItem(CURRENT_SESSION_ID_KEY, sid);

      const device = this.detectDevice();
      const now = Date.now();
      const newSession: UserJourneySession = {
        sessionId: sid,
        userId: customUserId || `GUEST-${Math.floor(10000 + Math.random() * 90000)}`,
        userDevice: device,
        sourceChannel: '扫码点餐',
        startTime: now,
        lastActiveTime: now,
        totalDurationSeconds: 0,
        status: 'active',
        currentNode: 'landing',
        actions: [
          {
            id: `act-${now}-1`,
            stepIndex: 1,
            stage: 'stage_discovery',
            stageLabel: '探索导购段',
            timestamp: now,
            timeStr: this.formatPreciseTime(now),
            actionType: 'page_enter',
            label: '食客扫码进入餐车流动点单首页',
            node: 'landing',
            durationFromPrevMs: 0,
            durationFromPrevSeconds: 0,
            riskLevel: 'normal'
          }
        ]
      };

      newSession.diagnosis = this.computeSessionDiagnosis(newSession);
      const sessions = this.getAllSessions();
      sessions.unshift(newSession);
      this.saveSessions(sessions);
    } else if (customUserId) {
      const sessions = this.getAllSessions();
      const session = sessions.find((s) => s.sessionId === sid);
      if (session && session.userId.startsWith('GUEST-')) {
        session.userId = customUserId;
        this.saveSessions(sessions);
      }
    }

    this.currentSessionId = sid;
    return sid;
  }

  /**
   * 记录细粒度用户交互操作 (毫秒级精度与分段记录)
   */
  public trackAction(
    actionType: UserActionType,
    label: string,
    details?: Record<string, any>,
    targetNode?: JourneyNodeType
  ) {
    if (!this.currentSessionId) {
      this.initCurrentSession();
    }

    const now = Date.now();
    const durationFromPrevMs = Math.max(0, now - this.lastActionTimestamp);
    const durationFromPrevSeconds = Math.round(durationFromPrevMs / 1000);
    this.lastActionTimestamp = now;

    const node = targetNode || this.deriveNodeFromAction(actionType);
    const stage = this.deriveStageFromActionAndNode(actionType, node);
    const stageLabel = this.getStageLabel(stage);

    const sessions = this.getAllSessions();
    let session = sessions.find((s) => s.sessionId === this.currentSessionId);

    if (!session) {
      this.initCurrentSession();
      session = sessions.find((s) => s.sessionId === this.currentSessionId);
      if (!session) return;
    }

    const isHesitation =
      durationFromPrevMs >= 12000 ||
      actionType === 'close_dish_modal' ||
      actionType === 'cancel_checkout' ||
      actionType === 'clear_cart';

    const riskLevel: JourneyActionLog['riskLevel'] =
      actionType === 'cancel_checkout' || actionType === 'cancel_order'
        ? 'critical_dropoff'
        : actionType === 'clear_cart' || actionType === 'close_dish_modal'
        ? 'high_friction'
        : isHesitation
        ? 'hesitation'
        : 'normal';

    const actionLog: JourneyActionLog = {
      id: `act-${now}-${Math.floor(Math.random() * 1000)}`,
      stepIndex: session.actions.length + 1,
      stage,
      stageLabel,
      timestamp: now,
      timeStr: this.formatPreciseTime(now),
      actionType,
      label,
      node,
      details,
      durationFromPrevMs,
      durationFromPrevSeconds,
      isHesitation,
      riskLevel
    };

    session.actions.push(actionLog);
    session.lastActiveTime = now;
    session.totalDurationSeconds = Math.round((now - session.startTime) / 1000);
    session.currentNode = node;

    // 状态流转与流失阻力归因判断
    if (actionType === 'submit_order') {
      session.currentNode = 'payment_pending';
      if (details?.orderNo) session.orderNo = details.orderNo;
      if (details?.totalAmount || details?.amount) session.orderAmount = details.totalAmount || details.amount;
    } else if (actionType === 'cancel_order') {
      session.status = 'cancelled';
      session.dropOffNode = 'cancelled';
      session.dropOffReason = details?.reason || '在订单流转或收银页面主动申请终止/退单';
    } else if (actionType === 'cancel_checkout') {
      session.status = 'abandoned';
      session.dropOffNode = 'checkout';
      session.dropOffReason = '已进入收银核对台，但在支付确认前返回放弃';
    } else if (actionType === 'clear_cart') {
      session.status = 'abandoned';
      session.dropOffNode = 'cart_active';
      session.dropOffReason = '选购多件餐品后主动一键清空购物车，放弃成单';
    } else if (actionType === 'close_dish_modal' && !session.actions.some((a) => a.actionType === 'add_to_cart')) {
      session.dropOffNode = 'view_detail';
      session.dropOffReason = '在菜品选配定制面板停留后未加购退出，疑似规格不满意';
    }

    if (details?.cartSnapshot) {
      session.cartSnapshot = details.cartSnapshot;
    }

    // 重新计算全会话强判断诊断
    session.diagnosis = this.computeSessionDiagnosis(session);
    session.hesitationScore = session.diagnosis.hesitationIndex;
    session.frictionPointsCount = session.actions.filter((a) => a.isHesitation || a.riskLevel === 'high_friction' || a.riskLevel === 'critical_dropoff').length;

    this.saveSessions(sessions);
    this.notifyListeners();
  }

  /**
   * 标记订单成功支付成单
   */
  public markOrderSuccess(orderNo: string, amount: number) {
    if (!this.currentSessionId) return;
    const now = Date.now();
    const sessions = this.getAllSessions();
    const session = sessions.find((s) => s.sessionId === this.currentSessionId);
    if (!session) return;

    session.status = 'completed';
    session.currentNode = 'order_success';
    session.orderNo = orderNo;
    session.orderAmount = amount;
    session.lastActiveTime = now;
    session.totalDurationSeconds = Math.round((now - session.startTime) / 1000);

    const prevMs = Math.max(0, now - this.lastActionTimestamp);
    session.actions.push({
      id: `act-${now}-success`,
      stepIndex: session.actions.length + 1,
      stage: 'stage_fulfillment',
      stageLabel: '支付履约段',
      timestamp: now,
      timeStr: this.formatPreciseTime(now),
      actionType: 'submit_order',
      label: `支付成功成单！订单号 ${orderNo}，实付 ¥${amount.toFixed(2)}`,
      node: 'order_success',
      details: { orderNo, amount },
      durationFromPrevMs: prevMs,
      durationFromPrevSeconds: Math.round(prevMs / 1000),
      riskLevel: 'normal'
    });

    session.diagnosis = this.computeSessionDiagnosis(session);
    this.saveSessions(sessions);
    this.notifyListeners();
  }

  /**
   * 标记订单取消或终止
   */
  public markOrderCancelled(orderNo: string, reason: string = '顾客在流转中申请终止或取消') {
    if (!this.currentSessionId) return;
    const now = Date.now();
    const sessions = this.getAllSessions();
    const session = sessions.find((s) => s.sessionId === this.currentSessionId);
    if (!session) return;

    session.status = 'cancelled';
    session.currentNode = 'cancelled';
    session.dropOffNode = 'cancelled';
    session.dropOffReason = reason;
    session.orderNo = orderNo;
    session.lastActiveTime = now;
    session.totalDurationSeconds = Math.round((now - session.startTime) / 1000);

    const prevMs = Math.max(0, now - this.lastActionTimestamp);
    session.actions.push({
      id: `act-${now}-cancel`,
      stepIndex: session.actions.length + 1,
      stage: 'stage_fulfillment',
      stageLabel: '支付履约段',
      timestamp: now,
      timeStr: this.formatPreciseTime(now),
      actionType: 'cancel_order',
      label: `顾客取消/申请终止订单: ${orderNo} (${reason})`,
      node: 'cancelled',
      details: { orderNo, reason },
      durationFromPrevMs: prevMs,
      durationFromPrevSeconds: Math.round(prevMs / 1000),
      riskLevel: 'critical_dropoff'
    });

    session.diagnosis = this.computeSessionDiagnosis(session);
    this.saveSessions(sessions);
    this.notifyListeners();
  }

  /**
   * 强判断诊断体系：综合分析会话所有分段操作，输出归因和经营建议
   */
  public computeSessionDiagnosis(session: UserJourneySession): GranularDiagnosticInfo {
    const actions = session.actions;
    const hasSuccess = session.status === 'completed' || session.currentNode === 'order_success';
    const hasCancelled = session.status === 'cancelled' || actions.some((a) => a.actionType === 'cancel_order');
    const hasCheckout = actions.some((a) => a.actionType === 'enter_checkout' || a.node === 'checkout');
    const hasCancelCheckout = actions.some((a) => a.actionType === 'cancel_checkout');
    const hasClearCart = actions.some((a) => a.actionType === 'clear_cart');
    const specChangeCount = actions.filter((a) => a.actionType === 'select_spec_option' || a.actionType === 'change_dish_variant' || a.actionType === 'modify_spec').length;
    const hasClosedDishWithoutAdd = actions.some((a) => a.actionType === 'close_dish_modal') && !actions.some((a) => a.actionType === 'add_to_cart');

    // 1. 成功成单
    if (hasSuccess) {
      return {
        judgmentType: 'SEAMLESS_PURCHASE',
        judgmentTitle: '极速黄金成单',
        judgmentBadgeColor: 'emerald',
        hesitationIndex: Math.min(25, Math.round(session.totalDurationSeconds / 10)),
        frictionLevel: 'none',
        summaryDiagnosis: `食客操作顺畅，历时 ${session.totalDurationSeconds} 秒顺利支付成单，全链路未发生卡点。`,
        actionableSuggestion: '可向该食客推送【次单立减 ¥5】或【赠饮福利】提升高价值老客复购率。',
        detectedBottleneckNode: undefined
      };
    }

    // 2. 临门一脚中断 (进入结算台后返回)
    if (hasCheckout && (hasCancelCheckout || session.status === 'abandoned')) {
      return {
        judgmentType: 'CRITICAL_CHECKOUT_ABANDON',
        judgmentTitle: '收银临门一脚中断',
        judgmentBadgeColor: 'red',
        hesitationIndex: 88,
        frictionLevel: 'critical',
        summaryDiagnosis: `高价值流失：食客已成功加购并进入结算台，但停留后返回退出，未点击最终付款。`,
        actionableSuggestion: '建议在结算台接入【首单减免 / 赠送小菜挽留弹窗】并在 5 分钟内下发定向召回短信/通知。',
        detectedBottleneckNode: 'checkout'
      };
    }

    // 3. 运费/起送门槛阻退 (加购但未满起送，或者因配送费放弃)
    if (session.cartSnapshot && session.cartSnapshot.totalPrice > 0 && session.cartSnapshot.totalPrice < 80 && (hasCancelCheckout || session.dropOffNode === 'cart_active')) {
      return {
        judgmentType: 'DELIVERY_THRESHOLD_BLOCK',
        judgmentTitle: '起送/运费门槛阻退',
        judgmentBadgeColor: 'amber',
        hesitationIndex: 78,
        frictionLevel: 'high',
        summaryDiagnosis: `食客已选购 ¥${session.cartSnapshot.totalPrice.toFixed(0)} 餐品，因未达 ¥80 包邮或需支付配送费犹豫流失。`,
        actionableSuggestion: '建议在购物车顶部高亮提示【差 ¥' + (80 - session.cartSnapshot.totalPrice).toFixed(0) + ' 免配送费】，并智能推荐 ¥8~15 凑单小吃。',
        detectedBottleneckNode: 'cart_active'
      };
    }

    // 4. 清空购物车跑单
    if (hasClearCart) {
      return {
        judgmentType: 'CART_EMPTIED_LEAVE',
        judgmentTitle: '主动清空购物车跑单',
        judgmentBadgeColor: 'red',
        hesitationIndex: 82,
        frictionLevel: 'high',
        summaryDiagnosis: `负面信号：食客选购了餐品后主动点击清空购物车并离开，疑似对价格、辣度或餐品搭配失望。`,
        actionableSuggestion: '复查被清空餐品的定价敏感度与配料说明，提供【一键找平替】或【自选拼盘】选项。',
        detectedBottleneckNode: 'cart_active'
      };
    }

    // 5. 规格纠结放弃 (频繁切换规格后关闭弹窗)
    if (specChangeCount >= 2 || hasClosedDishWithoutAdd) {
      return {
        judgmentType: 'SPEC_CONFUSION_DROP',
        judgmentTitle: '规格选配纠结放弃',
        judgmentBadgeColor: 'purple',
        hesitationIndex: 72,
        frictionLevel: 'high',
        summaryDiagnosis: `选配卡点：食客在菜品详情面板多次切换辣度/份量/加料，停留耗时过长，最终未加购关闭。`,
        actionableSuggestion: '简化必选项数量，将最受欢迎配置设为主厨默认推荐，降低顾客决策疲劳。',
        detectedBottleneckNode: 'view_detail'
      };
    }

    // 6. 主动取消退款
    if (hasCancelled) {
      return {
        judgmentType: 'CRITICAL_CHECKOUT_ABANDON',
        judgmentTitle: '已下单申请终止/退款',
        judgmentBadgeColor: 'red',
        hesitationIndex: 90,
        frictionLevel: 'critical',
        summaryDiagnosis: `售后中断：顾客已成单但发起取消退单申请（理由：${session.dropOffReason || '顾客主动取消'}）。`,
        actionableSuggestion: '餐车前台需在 60 秒内通过协同联络室呼叫食客沟通安抚，优先提供加急出餐补救。',
        detectedBottleneckNode: 'cancelled'
      };
    }

    // 7. 进店秒退跳出
    if (actions.length <= 2 && session.totalDurationSeconds <= 8) {
      return {
        judgmentType: 'BOUNCE_NO_INTERACTION',
        judgmentTitle: '进店冷启动秒退',
        judgmentBadgeColor: 'neutral',
        hesitationIndex: 95,
        frictionLevel: 'medium',
        summaryDiagnosis: `进店即走：顾客进店仅停留 ${session.totalDurationSeconds} 秒，未产生有效滑动与分类浏览。`,
        actionableSuggestion: '优化进店首屏头图与主推爆款陈列，前置【新客立减 ¥8】大额徽标提升视觉留存率。',
        detectedBottleneckNode: 'landing'
      };
    }

    // 兜底：浏览中途跳出
    return {
      judgmentType: 'BOUNCE_NO_INTERACTION',
      judgmentTitle: '浏览中途流失退出',
      judgmentBadgeColor: 'amber',
      hesitationIndex: 60,
      frictionLevel: 'medium',
      summaryDiagnosis: `顾客在【${this.getNodeLabel(session.currentNode)}】阶段停止交互，停留时长 ${session.totalDurationSeconds} 秒。`,
      actionableSuggestion: '建议配置限时抢购跑马灯，强化餐车现制新鲜感，刺激食客快速下单。',
      detectedBottleneckNode: session.currentNode
    };
  }

  /**
   * 定时监听用户无操作闲置超时 (Idle Timeout)
   */
  private startIdleMonitor() {
    if (typeof window === 'undefined') return;

    if (this.idleCheckTimer) clearInterval(this.idleCheckTimer);

    this.idleCheckTimer = setInterval(() => {
      if (!this.currentSessionId) return;
      const now = Date.now();
      const idleMs = now - this.lastActionTimestamp;
      const idleSeconds = Math.round(idleMs / 1000);

      if (idleSeconds >= 90) {
        const sessions = this.getAllSessions();
        const session = sessions.find((s) => s.sessionId === this.currentSessionId);
        if (session && session.status === 'active') {
          session.status = 'idle_timeout';
          session.dropOffNode = session.currentNode;
          session.dropOffReason = `在【${this.getNodeLabel(session.currentNode)}】节点超过 90 秒无任何交互，已判定为闲置退出`;
          session.actions.push({
            id: `act-${now}-idle`,
            stepIndex: session.actions.length + 1,
            stage: 'stage_inactive',
            stageLabel: '闲置跳出段',
            timestamp: now,
            timeStr: this.formatPreciseTime(now),
            actionType: 'idle_timeout',
            label: `食客无操作闲置超时（停留于 ${this.getNodeLabel(session.currentNode)}），会话已封存`,
            node: 'idle_exit',
            durationFromPrevMs: idleMs,
            durationFromPrevSeconds: idleSeconds,
            riskLevel: 'high_friction'
          });
          session.diagnosis = this.computeSessionDiagnosis(session);
          this.saveSessions(sessions);
          this.notifyListeners();
        }
      }
    }, 15000);
  }

  /**
   * 产生高拟真全分段演示样本（保障大屏与总控开箱即有极致精度的微时序与强判断演示）
   */
  public generateMockSessionsIfEmpty() {
    const existing = this.getAllSessions();
    if (existing.length >= 6) return;

    const baseTime = Date.now() - 3600000 * 2.5;

    const sampleSessions: UserJourneySession[] = [
      // 样本 1：极速黄金成单（标杆）
      {
        sessionId: 'SES-20260907-8821',
        userId: 'GUEST-88210 (VIP 金卡·陈先生)',
        userPhone: '138****9201',
        userDevice: 'iPhone 15 Pro (Safari / 微信)',
        sourceChannel: '扫码点餐',
        startTime: baseTime - 480000,
        lastActiveTime: baseTime - 120000,
        totalDurationSeconds: 360,
        status: 'completed',
        currentNode: 'order_success',
        orderNo: 'UR-20260907-8821',
        orderAmount: 168.0,
        cartSnapshot: {
          itemsCount: 3,
          totalPrice: 168.0,
          dishNames: ['秘制黑椒炭烤牛肋条', '现烤炭火大生蚝', '招牌炭烤厚切牛舌']
        },
        actions: [
          { id: '1', stepIndex: 1, stage: 'stage_discovery', stageLabel: '探索导购段', timestamp: baseTime - 480000, timeStr: '19:12:10.120', actionType: 'page_enter', label: '扫桌码进入流动餐车点单小程序', node: 'landing', durationFromPrevMs: 0, durationFromPrevSeconds: 0, riskLevel: 'normal' },
          { id: '2', stepIndex: 2, stage: 'stage_discovery', stageLabel: '探索导购段', timestamp: baseTime - 440000, timeStr: '19:12:50.450', actionType: 'select_category', label: '切换浏览分类：特色炭烤 (热门爆款推荐)', node: 'browsing', durationFromPrevMs: 40330, durationFromPrevSeconds: 40, riskLevel: 'normal' },
          { id: '3', stepIndex: 3, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: baseTime - 400000, timeStr: '19:13:30.812', actionType: 'open_dish_modal', label: '展开菜品定制弹窗：秘制黑椒炭烤牛肋条', node: 'view_detail', durationFromPrevMs: 39638, durationFromPrevSeconds: 40, riskLevel: 'normal' },
          { id: '4', stepIndex: 4, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: baseTime - 375000, timeStr: '19:13:55.204', actionType: 'select_spec_option', label: '选择定制规格：辣度 -> 微辣 (先锋特调)', node: 'view_detail', durationFromPrevMs: 25000, durationFromPrevSeconds: 25, isHesitation: false, riskLevel: 'normal' },
          { id: '5', stepIndex: 5, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: baseTime - 350000, timeStr: '19:14:20.618', actionType: 'add_to_cart', label: '确认加购：秘制黑椒炭烤牛肋条 x1 (实付 ¥68.00)', node: 'cart_active', durationFromPrevMs: 25000, durationFromPrevSeconds: 25, riskLevel: 'normal' },
          { id: '6', stepIndex: 6, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: baseTime - 310000, timeStr: '19:15:00.320', actionType: 'quick_add', label: '快捷加购：现烤炭火大生蚝 x4 (实付 ¥48.00)', node: 'cart_active', durationFromPrevMs: 40000, durationFromPrevSeconds: 40, riskLevel: 'normal' },
          { id: '7', stepIndex: 7, stage: 'stage_cart', stageLabel: '购物车筹备段', timestamp: baseTime - 270000, timeStr: '19:15:40.910', actionType: 'open_cart', label: '打开选购单抽屉，核对 3 件餐品清单 (合计 ¥168.00)', node: 'cart_active', durationFromPrevMs: 40000, durationFromPrevSeconds: 40, riskLevel: 'normal' },
          { id: '8', stepIndex: 8, stage: 'stage_checkout', stageLabel: '收银决策段', timestamp: baseTime - 220000, timeStr: '19:16:30.150', actionType: 'enter_checkout', label: '点击底部去结算，进入收银结算台 (绑定 A2 号桌)', node: 'checkout', durationFromPrevMs: 50000, durationFromPrevSeconds: 50, riskLevel: 'normal' },
          { id: '9', stepIndex: 9, stage: 'stage_checkout', stageLabel: '收银决策段', timestamp: baseTime - 170000, timeStr: '19:17:20.400', actionType: 'select_payment_method', label: '选择支付渠道：微信买单 · 立减 ¥5.00', node: 'checkout', durationFromPrevMs: 50000, durationFromPrevSeconds: 50, riskLevel: 'normal' },
          { id: '10', stepIndex: 10, stage: 'stage_fulfillment', stageLabel: '支付履约段', timestamp: baseTime - 120000, timeStr: '19:18:10.890', actionType: 'submit_order', label: '支付成功并推送出单！订单号 UR-20260907-8821', node: 'order_success', durationFromPrevMs: 50000, durationFromPrevSeconds: 50, riskLevel: 'normal' }
        ]
      },

      // 样本 2：收银临门一脚中断 (高价值流失典型)
      {
        sessionId: 'SES-20260907-6419',
        userId: 'GUEST-64192 (常客食客)',
        userPhone: '159****4192',
        userDevice: 'Xiaomi 14 (微信内置浏览器)',
        sourceChannel: '外卖配送',
        startTime: baseTime - 720000,
        lastActiveTime: baseTime - 510000,
        totalDurationSeconds: 210,
        status: 'abandoned',
        currentNode: 'checkout',
        dropOffNode: 'checkout',
        dropOffReason: '已进入收银核对台，但在支付确认前返回放弃',
        cartSnapshot: {
          itemsCount: 2,
          totalPrice: 112.0,
          dishNames: ['极帜双层和牛芝士汉堡', '香草黄油法式土豆丸子']
        },
        actions: [
          { id: '1', stepIndex: 1, stage: 'stage_discovery', stageLabel: '探索导购段', timestamp: baseTime - 720000, timeStr: '18:45:10.050', actionType: 'page_enter', label: '访问餐车外卖主页', node: 'landing', durationFromPrevMs: 0, durationFromPrevSeconds: 0, riskLevel: 'normal' },
          { id: '2', stepIndex: 2, stage: 'stage_discovery', stageLabel: '探索导购段', timestamp: baseTime - 680000, timeStr: '18:45:50.320', actionType: 'switch_dining_mode', label: '确认就餐模式：外卖专送 (大悦城 3km 范围)', node: 'browsing', durationFromPrevMs: 40000, durationFromPrevSeconds: 40, riskLevel: 'normal' },
          { id: '3', stepIndex: 3, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: baseTime - 630000, timeStr: '18:46:40.110', actionType: 'add_to_cart', label: '加购：极帜双层和牛芝士汉堡 x1 (¥68.00)', node: 'cart_active', durationFromPrevMs: 50000, durationFromPrevSeconds: 50, riskLevel: 'normal' },
          { id: '4', stepIndex: 4, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: baseTime - 590000, timeStr: '18:47:20.500', actionType: 'add_to_cart', label: '加购：香草黄油法式土豆丸子 x1 (¥44.00)', node: 'cart_active', durationFromPrevMs: 40000, durationFromPrevSeconds: 40, riskLevel: 'normal' },
          { id: '5', stepIndex: 5, stage: 'stage_checkout', stageLabel: '收银决策段', timestamp: baseTime - 550000, timeStr: '18:48:00.800', actionType: 'enter_checkout', label: '进入结算页，核对地址与总额 (应付 ¥112.00)', node: 'checkout', durationFromPrevMs: 40000, durationFromPrevSeconds: 40, riskLevel: 'normal' },
          { id: '6', stepIndex: 6, stage: 'stage_checkout', stageLabel: '收银决策段', timestamp: baseTime - 510000, timeStr: '18:48:40.990', actionType: 'cancel_checkout', label: '在结算页面未确认支付，点击返回放弃退出', node: 'checkout', durationFromPrevMs: 40000, durationFromPrevSeconds: 40, isHesitation: true, riskLevel: 'critical_dropoff' }
        ]
      },

      // 样本 3：规格选配纠结放弃 (产品体验卡点)
      {
        sessionId: 'SES-20260907-3921',
        userId: 'GUEST-39218',
        userDevice: 'iPhone 14 (Safari)',
        sourceChannel: '扫码点餐',
        startTime: baseTime - 1200000,
        lastActiveTime: baseTime - 1050000,
        totalDurationSeconds: 150,
        status: 'abandoned',
        currentNode: 'view_detail',
        dropOffNode: 'view_detail',
        dropOffReason: '在菜品选配定制面板停留后未加购退出，疑似规格不满意',
        actions: [
          { id: '1', stepIndex: 1, stage: 'stage_discovery', stageLabel: '探索导购段', timestamp: baseTime - 1200000, timeStr: '18:20:10.020', actionType: 'page_enter', label: '扫码进店浏览', node: 'landing', durationFromPrevMs: 0, durationFromPrevSeconds: 0, riskLevel: 'normal' },
          { id: '2', stepIndex: 2, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: baseTime - 1160000, timeStr: '18:20:50.400', actionType: 'open_dish_modal', label: '展开菜品选配弹窗：招牌炭烤厚切牛舌', node: 'view_detail', durationFromPrevMs: 40000, durationFromPrevSeconds: 40, riskLevel: 'normal' },
          { id: '3', stepIndex: 3, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: baseTime - 1130000, timeStr: '18:21:20.100', actionType: 'select_spec_option', label: '选择规格：风味调味 -> 先锋盐烤 (海盐微辛)', node: 'view_detail', durationFromPrevMs: 30000, durationFromPrevSeconds: 30, isHesitation: true, riskLevel: 'hesitation' },
          { id: '4', stepIndex: 4, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: baseTime - 1100000, timeStr: '18:21:50.800', actionType: 'select_spec_option', label: '切换规格：风味调味 -> 招牌黑椒复合汁 (+¥3.00)', node: 'view_detail', durationFromPrevMs: 30000, durationFromPrevSeconds: 30, isHesitation: true, riskLevel: 'hesitation' },
          { id: '5', stepIndex: 5, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: baseTime - 1070000, timeStr: '18:22:20.300', actionType: 'change_dish_variant', label: '切换份量版本：加大份 200g (+¥22.00)', node: 'view_detail', durationFromPrevMs: 30000, durationFromPrevSeconds: 30, isHesitation: true, riskLevel: 'hesitation' },
          { id: '6', stepIndex: 6, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: baseTime - 1050000, timeStr: '18:22:40.050', actionType: 'close_dish_modal', label: '关闭菜品选配弹窗，放弃加购退出', node: 'view_detail', durationFromPrevMs: 20000, durationFromPrevSeconds: 20, isHesitation: true, riskLevel: 'high_friction' }
        ]
      },

      // 样本 4：起送/运费门槛阻退
      {
        sessionId: 'SES-20260907-5512',
        userId: 'GUEST-55120',
        userDevice: 'HONOR Magic 6 (Android)',
        sourceChannel: '外卖配送',
        startTime: baseTime - 1800000,
        lastActiveTime: baseTime - 1620000,
        totalDurationSeconds: 180,
        status: 'abandoned',
        currentNode: 'cart_active',
        dropOffNode: 'cart_active',
        dropOffReason: '选购菜品后清空购物车放弃下单',
        cartSnapshot: {
          itemsCount: 1,
          totalPrice: 48.0,
          dishNames: ['极帜双层和牛芝士汉堡']
        },
        actions: [
          { id: '1', stepIndex: 1, stage: 'stage_discovery', stageLabel: '探索导购段', timestamp: baseTime - 1800000, timeStr: '17:40:00.100', actionType: 'page_enter', label: '通过外卖分享进入餐车', node: 'landing', durationFromPrevMs: 0, durationFromPrevSeconds: 0, riskLevel: 'normal' },
          { id: '2', stepIndex: 2, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: baseTime - 1740000, timeStr: '17:41:00.250', actionType: 'add_to_cart', label: '加购极帜汉堡 x1 (小计 ¥48.00，差 ¥32 免运费)', node: 'cart_active', durationFromPrevMs: 60000, durationFromPrevSeconds: 60, riskLevel: 'normal' },
          { id: '3', stepIndex: 3, stage: 'stage_cart', stageLabel: '购物车筹备段', timestamp: baseTime - 1670000, timeStr: '17:42:10.800', actionType: 'open_cart', label: '展开选购单核对，提示还需 ¥5.00 配送费', node: 'cart_active', durationFromPrevMs: 70000, durationFromPrevSeconds: 70, isHesitation: true, riskLevel: 'hesitation' },
          { id: '4', stepIndex: 4, stage: 'stage_cart', stageLabel: '购物车筹备段', timestamp: baseTime - 1620000, timeStr: '17:43:00.500', actionType: 'clear_cart', label: '主动清空选购单，放弃下单退出', node: 'cart_active', durationFromPrevMs: 50000, durationFromPrevSeconds: 50, isHesitation: true, riskLevel: 'high_friction' }
        ]
      },

      // 样本 5：已下单申请取消退款
      {
        sessionId: 'SES-20260907-7733',
        userId: 'GUEST-77331 (张女士)',
        userPhone: '137****7733',
        userDevice: 'MacBook Pro (Chrome)',
        sourceChannel: '到店自提',
        startTime: baseTime - 2200000,
        lastActiveTime: baseTime - 1900000,
        totalDurationSeconds: 300,
        status: 'cancelled',
        currentNode: 'cancelled',
        dropOffNode: 'cancelled',
        dropOffReason: '客户申请终止订单 (理由：行程有变改期取餐)',
        orderNo: 'UR-PK-7733',
        orderAmount: 92.0,
        actions: [
          { id: '1', stepIndex: 1, stage: 'stage_discovery', stageLabel: '探索导购段', timestamp: baseTime - 2200000, timeStr: '17:00:10.050', actionType: 'page_enter', label: '打开到店自提专窗点单', node: 'landing', durationFromPrevMs: 0, durationFromPrevSeconds: 0, riskLevel: 'normal' },
          { id: '2', stepIndex: 2, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: baseTime - 2120000, timeStr: '17:01:30.200', actionType: 'add_to_cart', label: '加购：炭火炙烤和牛串拼盘 x2 (¥92.00)', node: 'cart_active', durationFromPrevMs: 80000, durationFromPrevSeconds: 80, riskLevel: 'normal' },
          { id: '3', stepIndex: 3, stage: 'stage_checkout', stageLabel: '收银决策段', timestamp: baseTime - 2050000, timeStr: '17:02:40.500', actionType: 'enter_checkout', label: '自提专窗结算台提交', node: 'checkout', durationFromPrevMs: 70000, durationFromPrevSeconds: 70, riskLevel: 'normal' },
          { id: '4', stepIndex: 4, stage: 'stage_fulfillment', stageLabel: '支付履约段', timestamp: baseTime - 2000000, timeStr: '17:03:30.800', actionType: 'submit_order', label: '支付成单 UR-PK-7733', node: 'order_success', durationFromPrevMs: 50000, durationFromPrevSeconds: 50, riskLevel: 'normal' },
          { id: '5', stepIndex: 5, stage: 'stage_fulfillment', stageLabel: '支付履约段', timestamp: baseTime - 1900000, timeStr: '17:05:10.150', actionType: 'cancel_order', label: '客户在协同联络室发起申请终止订单 (临时改期)', node: 'cancelled', durationFromPrevMs: 100000, durationFromPrevSeconds: 100, riskLevel: 'critical_dropoff' }
        ]
      },

      // 样本 6：进店冷启动秒退
      {
        sessionId: 'SES-20260907-1082',
        userId: 'GUEST-10829',
        userDevice: 'vivo X100 (Android)',
        sourceChannel: '直接访问',
        startTime: baseTime - 2600000,
        lastActiveTime: baseTime - 2595000,
        totalDurationSeconds: 5,
        status: 'abandoned',
        currentNode: 'landing',
        dropOffNode: 'landing',
        dropOffReason: '进入首页后 5 秒内未发生任何交互点击，秒退跳出 (Bounce)',
        actions: [
          { id: '1', stepIndex: 1, stage: 'stage_discovery', stageLabel: '探索导购段', timestamp: baseTime - 2600000, timeStr: '16:40:00.100', actionType: 'page_enter', label: '通过外链访问餐车首页', node: 'landing', durationFromPrevMs: 0, durationFromPrevSeconds: 0, riskLevel: 'normal' },
          { id: '2', stepIndex: 2, stage: 'stage_inactive', stageLabel: '闲置跳出段', timestamp: baseTime - 2595000, timeStr: '16:40:05.320', actionType: 'exit_page', label: '未产生任何滑动点击，5秒内直接关闭页面退出', node: 'landing', durationFromPrevMs: 5220, durationFromPrevSeconds: 5, riskLevel: 'high_friction' }
        ]
      }
    ];

    sampleSessions.forEach((s) => {
      s.diagnosis = this.computeSessionDiagnosis(s);
      s.hesitationScore = s.diagnosis.hesitationIndex;
      s.frictionPointsCount = s.actions.filter((a) => a.isHesitation || a.riskLevel === 'high_friction' || a.riskLevel === 'critical_dropoff').length;
    });

    const merged = [...existing, ...sampleSessions];
    this.saveSessions(merged);
  }

  /**
   * 现场交互仿真器：一键注入 5 种典型真实场景的微时序链路
   */
  public simulateScenario(scenario: 'checkout_drop' | 'spec_confusion' | 'delivery_threshold' | 'cart_empty' | 'quick_success'): UserJourneySession {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const sid = `SES-SIM-${randomSuffix}`;
    const now = Date.now();
    let newSession: UserJourneySession;

    if (scenario === 'checkout_drop') {
      newSession = {
        sessionId: sid,
        userId: `GUEST-SIM-${randomSuffix} (结算退出)`,
        userPhone: '138****4411',
        userDevice: 'iPhone 15 Pro (微信)',
        sourceChannel: '外卖配送',
        startTime: now - 95000,
        lastActiveTime: now,
        totalDurationSeconds: 95,
        status: 'abandoned',
        currentNode: 'checkout',
        dropOffNode: 'checkout',
        dropOffReason: '已进入收银核对台，但在支付确认前返回放弃',
        cartSnapshot: { itemsCount: 2, totalPrice: 98.0, dishNames: ['秘制黑椒炭烤牛肋条', '现烤炭火大生蚝'] },
        actions: [
          { id: '1', stepIndex: 1, stage: 'stage_discovery', stageLabel: '探索导购段', timestamp: now - 95000, timeStr: this.formatPreciseTime(now - 95000), actionType: 'page_enter', label: '外卖专线进店', node: 'landing', durationFromPrevMs: 0, durationFromPrevSeconds: 0, riskLevel: 'normal' },
          { id: '2', stepIndex: 2, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: now - 65000, timeStr: this.formatPreciseTime(now - 65000), actionType: 'add_to_cart', label: '加购：秘制黑椒牛肋条 x1 (¥68.00)', node: 'cart_active', durationFromPrevMs: 30000, durationFromPrevSeconds: 30, riskLevel: 'normal' },
          { id: '3', stepIndex: 3, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: now - 40000, timeStr: this.formatPreciseTime(now - 40000), actionType: 'quick_add', label: '快捷加购：现烤大生蚝 x2 (¥30.00)', node: 'cart_active', durationFromPrevMs: 25000, durationFromPrevSeconds: 25, riskLevel: 'normal' },
          { id: '4', stepIndex: 4, stage: 'stage_checkout', stageLabel: '收银决策段', timestamp: now - 20000, timeStr: this.formatPreciseTime(now - 20000), actionType: 'enter_checkout', label: '进入收银结算台，开始核对配送地址', node: 'checkout', durationFromPrevMs: 20000, durationFromPrevSeconds: 20, riskLevel: 'normal' },
          { id: '5', stepIndex: 5, stage: 'stage_checkout', stageLabel: '收银决策段', timestamp: now, timeStr: this.formatPreciseTime(now), actionType: 'cancel_checkout', label: '在结算页面未确认支付，点击返回放弃退出', node: 'checkout', durationFromPrevMs: 20000, durationFromPrevSeconds: 20, isHesitation: true, riskLevel: 'critical_dropoff' }
        ]
      };
    } else if (scenario === 'spec_confusion') {
      newSession = {
        sessionId: sid,
        userId: `GUEST-SIM-${randomSuffix} (规格纠结)`,
        userDevice: 'Xiaomi 14 (Chrome)',
        sourceChannel: '扫码点餐',
        startTime: now - 80000,
        lastActiveTime: now,
        totalDurationSeconds: 80,
        status: 'abandoned',
        currentNode: 'view_detail',
        dropOffNode: 'view_detail',
        dropOffReason: '在菜品选配定制面板停留后未加购退出，疑似规格不满意',
        actions: [
          { id: '1', stepIndex: 1, stage: 'stage_discovery', stageLabel: '探索导购段', timestamp: now - 80000, timeStr: this.formatPreciseTime(now - 80000), actionType: 'page_enter', label: '扫码进入餐车点单', node: 'landing', durationFromPrevMs: 0, durationFromPrevSeconds: 0, riskLevel: 'normal' },
          { id: '2', stepIndex: 2, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: now - 60000, timeStr: this.formatPreciseTime(now - 60000), actionType: 'open_dish_modal', label: '点击展开：极帜双层和牛芝士汉堡', node: 'view_detail', durationFromPrevMs: 20000, durationFromPrevSeconds: 20, riskLevel: 'normal' },
          { id: '3', stepIndex: 3, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: now - 45000, timeStr: this.formatPreciseTime(now - 45000), actionType: 'select_spec_option', label: '选择定制：熟度 -> 7分熟 (先锋主厨推荐)', node: 'view_detail', durationFromPrevMs: 15000, durationFromPrevSeconds: 15, isHesitation: true, riskLevel: 'hesitation' },
          { id: '4', stepIndex: 4, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: now - 30000, timeStr: this.formatPreciseTime(now - 30000), actionType: 'select_spec_option', label: '切换定制：配料 -> 双倍黑松露酱 (+¥8.00)', node: 'view_detail', durationFromPrevMs: 15000, durationFromPrevSeconds: 15, isHesitation: true, riskLevel: 'hesitation' },
          { id: '5', stepIndex: 5, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: now, timeStr: this.formatPreciseTime(now), actionType: 'close_dish_modal', label: '关闭定制弹窗，未加购退出', node: 'view_detail', durationFromPrevMs: 30000, durationFromPrevSeconds: 30, isHesitation: true, riskLevel: 'high_friction' }
        ]
      };
    } else if (scenario === 'delivery_threshold') {
      newSession = {
        sessionId: sid,
        userId: `GUEST-SIM-${randomSuffix} (运费敏感)`,
        userDevice: 'Huawei Mate 60 (浏览器)',
        sourceChannel: '外卖配送',
        startTime: now - 75000,
        lastActiveTime: now,
        totalDurationSeconds: 75,
        status: 'abandoned',
        currentNode: 'cart_active',
        dropOffNode: 'cart_active',
        dropOffReason: '选购菜品后清空购物车放弃下单',
        cartSnapshot: { itemsCount: 1, totalPrice: 58.0, dishNames: ['秘制黑椒炭烤牛肋条'] },
        actions: [
          { id: '1', stepIndex: 1, stage: 'stage_discovery', stageLabel: '探索导购段', timestamp: now - 75000, timeStr: this.formatPreciseTime(now - 75000), actionType: 'page_enter', label: '外卖进店', node: 'landing', durationFromPrevMs: 0, durationFromPrevSeconds: 0, riskLevel: 'normal' },
          { id: '2', stepIndex: 2, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: now - 45000, timeStr: this.formatPreciseTime(now - 45000), actionType: 'add_to_cart', label: '加购单品 ¥58.00 (差 ¥22 包邮)', node: 'cart_active', durationFromPrevMs: 30000, durationFromPrevSeconds: 30, riskLevel: 'normal' },
          { id: '3', stepIndex: 3, stage: 'stage_cart', stageLabel: '购物车筹备段', timestamp: now - 20000, timeStr: this.formatPreciseTime(now - 20000), actionType: 'open_cart', label: '查看购物车，发现需付 ¥5 运费', node: 'cart_active', durationFromPrevMs: 25000, durationFromPrevSeconds: 25, isHesitation: true, riskLevel: 'hesitation' },
          { id: '4', stepIndex: 4, stage: 'stage_cart', stageLabel: '购物车筹备段', timestamp: now, timeStr: this.formatPreciseTime(now), actionType: 'clear_cart', label: '主动清空选购单，放弃购买退出', node: 'cart_active', durationFromPrevMs: 20000, durationFromPrevSeconds: 20, isHesitation: true, riskLevel: 'high_friction' }
        ]
      };
    } else if (scenario === 'cart_empty') {
      newSession = {
        sessionId: sid,
        userId: `GUEST-SIM-${randomSuffix} (清空跑单)`,
        userDevice: 'OPPO Find X7 (Android)',
        sourceChannel: '扫码点餐',
        startTime: now - 60000,
        lastActiveTime: now,
        totalDurationSeconds: 60,
        status: 'abandoned',
        currentNode: 'cart_active',
        dropOffNode: 'cart_active',
        dropOffReason: '选购菜品后清空购物车放弃下单',
        actions: [
          { id: '1', stepIndex: 1, stage: 'stage_discovery', stageLabel: '探索导购段', timestamp: now - 60000, timeStr: this.formatPreciseTime(now - 60000), actionType: 'page_enter', label: '进店扫码', node: 'landing', durationFromPrevMs: 0, durationFromPrevSeconds: 0, riskLevel: 'normal' },
          { id: '2', stepIndex: 2, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: now - 35000, timeStr: this.formatPreciseTime(now - 35000), actionType: 'quick_add', label: '快捷加购生蚝 x2 (¥30.00)', node: 'cart_active', durationFromPrevMs: 25000, durationFromPrevSeconds: 25, riskLevel: 'normal' },
          { id: '3', stepIndex: 3, stage: 'stage_cart', stageLabel: '购物车筹备段', timestamp: now, timeStr: this.formatPreciseTime(now), actionType: 'clear_cart', label: '点击清空选购单并退出', node: 'cart_active', durationFromPrevMs: 35000, durationFromPrevSeconds: 35, isHesitation: true, riskLevel: 'high_friction' }
        ]
      };
    } else {
      // quick_success
      newSession = {
        sessionId: sid,
        userId: `GUEST-SIM-${randomSuffix} (成单标杆)`,
        userPhone: '186****9912',
        userDevice: 'iPhone 15 Pro Max',
        sourceChannel: '扫码点餐',
        startTime: now - 50000,
        lastActiveTime: now,
        totalDurationSeconds: 50,
        status: 'completed',
        currentNode: 'order_success',
        orderNo: `UR-SIM-${randomSuffix}`,
        orderAmount: 128.0,
        actions: [
          { id: '1', stepIndex: 1, stage: 'stage_discovery', stageLabel: '探索导购段', timestamp: now - 50000, timeStr: this.formatPreciseTime(now - 50000), actionType: 'page_enter', label: '扫桌码进入小程序', node: 'landing', durationFromPrevMs: 0, durationFromPrevSeconds: 0, riskLevel: 'normal' },
          { id: '2', stepIndex: 2, stage: 'stage_selection', stageLabel: '选配定制段', timestamp: now - 35000, timeStr: this.formatPreciseTime(now - 35000), actionType: 'add_to_cart', label: '加购爆款烤串拼盘 x1 (¥128.00)', node: 'cart_active', durationFromPrevMs: 15000, durationFromPrevSeconds: 15, riskLevel: 'normal' },
          { id: '3', stepIndex: 3, stage: 'stage_checkout', stageLabel: '收银决策段', timestamp: now - 20000, timeStr: this.formatPreciseTime(now - 20000), actionType: 'enter_checkout', label: '进入结算台', node: 'checkout', durationFromPrevMs: 15000, durationFromPrevSeconds: 15, riskLevel: 'normal' },
          { id: '4', stepIndex: 4, stage: 'stage_fulfillment', stageLabel: '支付履约段', timestamp: now, timeStr: this.formatPreciseTime(now), actionType: 'submit_order', label: '支付成功成单 UR-SIM-' + randomSuffix, node: 'order_success', durationFromPrevMs: 20000, durationFromPrevSeconds: 20, riskLevel: 'normal' }
        ]
      };
    }

    newSession.diagnosis = this.computeSessionDiagnosis(newSession);
    newSession.hesitationScore = newSession.diagnosis.hesitationIndex;
    newSession.frictionPointsCount = newSession.actions.filter((a) => a.isHesitation || a.riskLevel === 'high_friction' || a.riskLevel === 'critical_dropoff').length;

    const all = this.getAllSessions();
    all.unshift(newSession);
    this.saveSessions(all);
    this.notifyListeners();
    return newSession;
  }

  /**
   * 漏斗转化指标统计与流失归因 (增强阶段聚合)
   */
  public getFunnelMetrics(): {
    totalSessions: number;
    steps: FunnelNodeMetric[];
    dropOffSummary: {
      unsubmittedCheckoutCount: number; // 结算页未提交
      cartAbandonedCount: number;       // 加购未结算
      paymentCancelledCount: number;    // 支付主动取消
      idleExitCount: number;            // 闲置/无操作退出
      bounceCount: number;              // 进店秒退
    };
  } {
    this.generateMockSessionsIfEmpty();
    const sessions = this.getAllSessions();
    const total = Math.max(1, sessions.length);

    const reachedLanding = sessions.length;
    const reachedBrowsing = sessions.filter((s) => s.actions.some((a) => a.node !== 'landing')).length;
    const reachedCart = sessions.filter((s) => s.actions.some((a) => a.node === 'cart_active' || a.node === 'checkout' || a.node === 'payment_pending' || a.node === 'order_success')).length;
    const reachedCheckout = sessions.filter((s) => s.actions.some((a) => a.node === 'checkout' || a.node === 'payment_pending' || a.node === 'order_success')).length;
    const reachedPayment = sessions.filter((s) => s.actions.some((a) => a.node === 'payment_pending' || a.node === 'order_success')).length;
    const reachedSuccess = sessions.filter((s) => s.status === 'completed' || s.currentNode === 'order_success').length;

    const stepsData = [
      { node: 'landing', count: reachedLanding, name: '1. 进店访问', stageName: '探索导购段', dwell: 18, friction: 'low' as const, reasons: ['扫码进入餐车', '定位附近配送点'] },
      { node: 'browsing', count: reachedBrowsing, name: '2. 浏览菜单/分类', stageName: '探索导购段', dwell: 35, friction: 'medium' as const, reasons: ['未找到心仪菜品', '价格与份量比对'] },
      { node: 'cart_active', count: reachedCart, name: '3. 加入购物车', stageName: '选配定制段', dwell: 48, friction: 'high' as const, reasons: ['加购后清空放弃', '起送价或起步份量门槛'] },
      { node: 'checkout', count: reachedCheckout, name: '4. 进入结算核对', stageName: '收银决策段', dwell: 42, friction: 'high' as const, reasons: ['配送费/包装费疑虑', '同桌拼单迟疑'] },
      { node: 'payment_pending', count: reachedPayment, name: '5. 拉起支付收银', stageName: '支付履约段', dwell: 25, friction: 'medium' as const, reasons: ['支付方式未绑卡', '用户主动点击取消支付'] },
      { node: 'order_success', count: reachedSuccess, name: '6. 支付完成成单', stageName: '支付履约段', dwell: 12, friction: 'low' as const, reasons: ['已生成正式出单小票并推送后厨'] }
    ];

    const steps: FunnelNodeMetric[] = stepsData.map((st, idx) => {
      const prevCount = idx === 0 ? st.count : stepsData[idx - 1].count;
      const dropCount = Math.max(0, prevCount - st.count);
      const conversionRate = prevCount > 0 ? Math.round((st.count / prevCount) * 100) : 0;
      const overallConversion = total > 0 ? Math.round((st.count / total) * 100) : 0;
      const dropOffPercent = prevCount > 0 ? Math.round((dropCount / prevCount) * 100) : 0;

      return {
        node: st.node as JourneyNodeType,
        name: st.name,
        stepIndex: idx + 1,
        stageName: st.stageName,
        reachedSessionsCount: st.count,
        dropOffCount: dropCount,
        conversionRatePercent: conversionRate,
        overallConversionPercent: overallConversion,
        dropOffPercent: dropOffPercent,
        typicalReasons: st.reasons,
        avgDwellSeconds: st.dwell,
        frictionLevel: st.friction
      };
    });

    const unsubmittedCheckoutCount = sessions.filter(
      (s) => s.dropOffNode === 'checkout' || (s.actions.some((a) => a.node === 'checkout') && s.status !== 'completed' && s.dropOffNode !== 'payment_pending')
    ).length;

    const cartAbandonedCount = sessions.filter(
      (s) => s.dropOffNode === 'cart_active' || (s.actions.some((a) => a.node === 'cart_active') && !s.actions.some((a) => a.node === 'checkout') && s.status !== 'completed')
    ).length;

    const paymentCancelledCount = sessions.filter(
      (s) => s.dropOffNode === 'payment_pending' || s.status === 'cancelled'
    ).length;

    const bounceCount = sessions.filter(
      (s) => s.dropOffNode === 'landing' || (s.actions.length <= 2 && s.totalDurationSeconds <= 15)
    ).length;

    const idleExitCount = sessions.filter((s) => s.status === 'idle_timeout').length;

    return {
      totalSessions: total,
      steps,
      dropOffSummary: {
        unsubmittedCheckoutCount,
        cartAbandonedCount,
        paymentCancelledCount,
        idleExitCount,
        bounceCount
      }
    };
  }

  public getAllSessions(): UserJourneySession[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (!raw) return [];
      const parsed: UserJourneySession[] = JSON.parse(raw);
      return parsed.map((s) => {
        if (!s.diagnosis) {
          s.diagnosis = this.computeSessionDiagnosis(s);
        }
        return s;
      });
    } catch {
      return [];
    }
  }

  public getSessionById(sessionId: string): UserJourneySession | null {
    const sessions = this.getAllSessions();
    return sessions.find((s) => s.sessionId === sessionId) || null;
  }

  public clearAllSessions() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_SESSIONS);
      sessionStorage.removeItem(CURRENT_SESSION_ID_KEY);
      this.currentSessionId = null;
    }
    this.notifyListeners();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error in user journey listener:', err);
      }
    });
  }

  private saveSessions(sessions: UserJourneySession[]) {
    if (typeof window === 'undefined') return;
    try {
      const capped = sessions.slice(0, 100);
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(capped));
    } catch (err) {
      console.warn('Failed to persist user journey sessions:', err);
    }
  }

  private deriveNodeFromAction(actionType: UserActionType): JourneyNodeType {
    switch (actionType) {
      case 'page_enter':
        return 'landing';
      case 'select_category':
      case 'select_subcategory':
      case 'switch_dining_mode':
      case 'select_table':
        return 'browsing';
      case 'view_dish':
      case 'open_dish_modal':
      case 'close_dish_modal':
      case 'select_spec_option':
      case 'change_dish_variant':
      case 'modify_spec':
        return 'view_detail';
      case 'add_to_cart':
      case 'quick_add':
      case 'batch_add':
      case 'modify_cart_qty':
      case 'remove_cart_item':
      case 'clear_cart':
      case 'open_cart':
      case 'view_cart':
      case 'close_cart':
        return 'cart_active';
      case 'enter_checkout':
      case 'cancel_checkout':
      case 'select_payment_method':
      case 'apply_coupon':
      case 'cancel_coupon':
      case 'input_order_notes':
        return 'checkout';
      case 'submit_order':
        return 'payment_pending';
      case 'cancel_order':
        return 'cancelled';
      case 'idle_timeout':
        return 'idle_exit';
      default:
        return 'browsing';
    }
  }

  private deriveStageFromActionAndNode(actionType: UserActionType, node: JourneyNodeType): JourneyStage {
    if (actionType === 'idle_timeout' || actionType === 'exit_page') return 'stage_inactive';
    if (node === 'landing' || actionType === 'switch_dining_mode' || actionType === 'select_table' || actionType === 'select_category' || actionType === 'select_subcategory') {
      return 'stage_discovery';
    }
    if (node === 'view_detail' || actionType === 'open_dish_modal' || actionType === 'close_dish_modal' || actionType === 'select_spec_option' || actionType === 'change_dish_variant') {
      return 'stage_selection';
    }
    if (node === 'cart_active' || actionType === 'add_to_cart' || actionType === 'quick_add' || actionType === 'batch_add' || actionType === 'modify_cart_qty' || actionType === 'clear_cart') {
      return 'stage_cart';
    }
    if (node === 'checkout' || actionType === 'enter_checkout' || actionType === 'cancel_checkout' || actionType === 'select_payment_method' || actionType === 'apply_coupon') {
      return 'stage_checkout';
    }
    if (node === 'payment_pending' || node === 'order_success' || node === 'completed' || node === 'cancelled' || actionType === 'submit_order' || actionType === 'cancel_order' || actionType === 'view_tracking') {
      return 'stage_fulfillment';
    }
    return 'stage_discovery';
  }

  public getStageLabel(stage: JourneyStage): string {
    const map: Record<JourneyStage, string> = {
      stage_discovery: '探索导购段',
      stage_selection: '选配定制段',
      stage_cart: '购物车筹备段',
      stage_checkout: '收银决策段',
      stage_fulfillment: '支付履约段',
      stage_inactive: '闲置跳出段'
    };
    return map[stage] || stage;
  }

  public getNodeLabel(node: JourneyNodeType): string {
    const map: Record<JourneyNodeType, string> = {
      landing: '进店访问',
      browsing: '浏览菜单',
      view_detail: '菜品定制',
      cart_active: '选购加购',
      checkout: '核对结算',
      payment_pending: '拉起支付',
      order_success: '支付成单',
      completed: '支付成单',
      cancelled: '主动取消',
      idle_exit: '无操作退出'
    };
    return map[node] || node;
  }

  private detectDevice(): string {
    if (typeof window === 'undefined') return 'Desktop Browser';
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'iPhone (Safari / 微信)';
    if (/iPad/i.test(ua)) return 'iPad Tablet';
    if (/Android/i.test(ua)) return 'Android (Mobile / 微信)';
    if (/Macintosh/i.test(ua)) return 'MacBook (Chrome)';
    if (/Windows/i.test(ua)) return 'Windows PC';
    return 'Web Client';
  }

  private formatPreciseTime(ts: number): string {
    const d = new Date(ts);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  }
}

export const userJourneyTracker = new UserJourneyTracker();
