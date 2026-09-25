/**
 * Urban Radar 流动餐车 GPS 极速专送平台 - RBAC 精细化权限与多级安全访问控制引擎
 * 
 * 权限分级体系架构:
 * - L0: 顾客端 (Customer) - 浏览选品、加购、雷达追踪、领券
 * - L1: 骑手端 (Rider) - 抢单派送、状态汇报、车载轨迹、收益结算、客商联络室
 * - L2: 商家餐车端 (Merchant RBAC)
 *       ├─ manager (店长/运营总管): 全域管辖、改价、退款、查看利润、考勤与员工RBAC分配、应急容灾
 *       ├─ cashier (前台领班/收银): 堂食桌台开台/结账、POS下单、打印小票、排队叫号、打卡
 *       ├─ grill_chef (炭烤档口主厨): KDS烤炉看板划单、工艺SOP、出肉率与初加工登记、原料报损
 *       ├─ barista (特调水吧师): KDS水吧看板划单、咖啡茶饮制作、工艺SOP、原料报损
 *       └─ staff (驻店学徒/传菜): 基础备菜出餐查看
 * - L3: 特许加盟联邦 (Franchise Federation)
 *       ├─ hq_admin (总部超管): 全国爆品强锁定、分账提成费率、保证金扣罚、全网透视
 *       ├─ hq_finance (总部财务): 周期结算单划付、分账审计
 *       └─ franchisee_owner (加盟商主账号): 辖下多车调配、供应链订货、对账单确认
 * - L4: 平台监管端 (Platform Super Control) - 跨店抽佣设置、全网网格监控、争议仲裁
 * - L5: 开发者与底层运维 (Developer & DBA) - 灾备重置、环境模拟、硬件黑名单解除
 */

import { StaffRole } from '../types';
import { MerchantSession } from './staffAndRiderAuthEngine';
import { safeGetStorage, safeSetStorage } from './safeStorage';

// ==================== 1. 标准权限编码定义 ====================
export type PermissionCode =
  // 订单与交易
  | 'order:view'                  // 查看订单列表
  | 'order:operate'               // 接单、备餐、完成出餐
  | 'order:cancel'                // 主动取消订单
  | 'order:refund'                // 发起与审批整单退款 (敏感)
  | 'order:delivery_operate'      // 骑手专送操作
  | 'order:view_assigned'         // 查看指派给本人的订单

  // 堂食与收银
  | 'pos:order'                   // POS 开单与改单
  | 'pos:checkout'                // 收银结账扣款
  | 'pos:discount'                // 赋予临时减免或赠饮折扣 (敏感)
  | 'table:manage'                // 堂食桌台开台/拼桌/清台
  | 'queue:call'                  // 等位叫号与号单作废
  | 'receipt:print'               // 补打/重打消费小票

  // KDS 厨房显示系统
  | 'kds:grill_view'              // 炭烤档口看板
  | 'kds:barista_view'            // 水吧冷萃看板
  | 'kds:finish_dish'             // 划单完成出品

  // 菜品、供应链与成本
  | 'menu:view'                   // 查看菜单列表
  | 'menu:status_toggle'          // 临时沽清/上架菜品
  | 'menu:price_edit'             // 修改菜品销售价与外卖价 (敏感)
  | 'sop:view'                    // 查看标准配方与工艺工序
  | 'supply:order'                // 供应链采购/订货申请
  | 'loss:record'                 // 损耗与初加工出肉率登记
  | 'inventory:close'             // 每日打烊盘点确认

  // 财务核算与敏感报表
  | 'finance:view_basic'          // 查看基础营收流水
  | 'finance:view_profit'         // 查看纯利润、物料成本与毛利率 (极度敏感)
  | 'finance:export'              // 导出财务与销售 CSV 报表 (敏感)
  | 'finance:data_correct'        // 收款台账/流水数据删除与更正 (敏感)
  | 'marketing:data_correct'      // 优惠券与营销统计数据删改/废弃 (敏感)
  | 'finance:settle'              // 结算打款确认

  // 团队与组织权限
  | 'staff:view_roster'           // 查看员工花名册
  | 'staff:clockin'               // 个人考勤上下班打卡
  | 'staff:manage_members'        // 增删员工档案、薪资与提成设定 (敏感)
  | 'staff:edit_rbac'             // 调整岗位权限矩阵 (敏感)

  // 应急容灾与底盘控制
  | 'contingency:view'            // 查看数据修改记录
  | 'contingency:rollback'        // 执行版本指针回滚 (敏感)
  | 'contingency:wipe_db'         // 生产数据库重置/模拟清空 (极度危险)

  // 特许加盟总部
  | 'franchise:view'              // 查看特许经营联邦
  | 'franchise:hq_policy_lock'    // 锁定总部爆品配方与价格 (总部权限)
  | 'franchise:settle_payout'     // 划拨加盟商分账 (总部权限)
  | 'franchise:audit_store'       // 执行督导巡检并扣罚保证金 (总部权限)
  | 'franchise:order_supply'      // 加盟商订购物料

  // 平台监管
  | 'platform:access'             // 进入平台监管总控
  | 'platform:commission_edit'    // 调整商家抽佣比例 (平台敏感)
  | 'platform:arbitration'        // 裁决客商争议 (平台敏感)
  | 'platform:truck_matrix';      // 调度全域餐车网格

// ==================== 2. 角色默认基线权限映射 ====================
export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, PermissionCode[]> = {
  manager: [
    // 店长拥有一切餐车经营与审批权限
    'order:view', 'order:operate', 'order:cancel', 'order:refund',
    'pos:order', 'pos:checkout', 'pos:discount', 'table:manage', 'queue:call', 'receipt:print',
    'kds:grill_view', 'kds:barista_view', 'kds:finish_dish',
    'menu:view', 'menu:status_toggle', 'menu:price_edit', 'sop:view', 'supply:order', 'loss:record', 'inventory:close',
    'finance:view_basic', 'finance:view_profit', 'finance:export', 'finance:settle',
    'finance:data_correct', 'marketing:data_correct',
    'staff:view_roster', 'staff:clockin', 'staff:manage_members', 'staff:edit_rbac',
    'contingency:view', 'contingency:rollback', 'contingency:wipe_db',
    'franchise:view', 'franchise:order_supply'
  ],
  cashier: [
    'order:view', 'order:operate',
    'pos:order', 'pos:checkout', 'table:manage', 'queue:call', 'receipt:print',
    'menu:view', 'menu:status_toggle',
    'finance:view_basic',
    'staff:view_roster', 'staff:clockin',
    'inventory:close',
    'franchise:view'
  ],
  grill_chef: [
    'order:view',
    'kds:grill_view', 'kds:finish_dish',
    'sop:view', 'loss:record', 'inventory:close',
    'staff:clockin'
  ],
  barista: [
    'order:view',
    'kds:barista_view', 'kds:finish_dish',
    'sop:view', 'loss:record', 'inventory:close',
    'staff:clockin'
  ],
  rider: [
    'order:view_assigned',
    'order:delivery_operate',
    'staff:clockin'
  ]
};

// 角色友好中文名与职责等级
export const ROLE_LEVEL_META: Record<StaffRole, { name: string; tier: string; badgeColor: string; description: string }> = {
  manager: {
    name: '店长 / 运营总管',
    tier: 'Tier 1 · 核心支配者',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    description: '掌控餐车全生命周期：定价调幅、全额退款、财务损益净利、人员权限调度及系统应急容灾。'
  },
  cashier: {
    name: '前台领班 / 收银员',
    tier: 'Tier 2 · 营业窗口',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    description: '负责堂食接待、桌台矩阵维护、POS开单结账、小票打印及等位叫号流转。'
  },
  grill_chef: {
    name: '炭烤档口主厨',
    tier: 'Tier 3 · 生产出品',
    badgeColor: 'bg-orange-50 text-orange-900 border-orange-200',
    description: '专注于KDS出餐看板划单、炭火炉温控制、标准工艺配方执行与初加工出肉率登记。'
  },
  barista: {
    name: '特调水吧师',
    tier: 'Tier 3 · 饮品出品',
    badgeColor: 'bg-cyan-50 text-cyan-900 border-cyan-200',
    description: '负责冷萃咖啡、特调气泡水制作划单，管理水吧工器具与原料损耗。'
  },
  rider: {
    name: '流动专送骑士',
    tier: 'Tier 4 · 物流履约',
    badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    description: '负责雷达指派订单配送、在途轨迹上报、驻点保温箱监控与客商联络。'
  }
};

// ==================== 3. 商家工作台 25 项 Tab 权限需求矩阵 ====================
export interface TabPermissionRequirement {
  tabId: string;
  tabLabel: string;
  requiredPermission: PermissionCode;
  minimumRole: StaffRole;
  category: string;
  isSensitive: boolean;
  helpTip: string;
}

export const MERCHANT_TAB_PERMISSIONS: Record<string, TabPermissionRequirement> = {
  // 实时经营
  orders: {
    tabId: 'orders',
    tabLabel: '极速出餐流水看板',
    requiredPermission: 'order:view',
    minimumRole: 'barista',
    category: '实时经营',
    isSensitive: false,
    helpTip: '所有在岗员工均可查看实时出餐订单流水。'
  },
  pos: {
    tabId: 'pos',
    tabLabel: '前台开台点单与扫码结账',
    requiredPermission: 'pos:checkout',
    minimumRole: 'cashier',
    category: '实时经营',
    isSensitive: false,
    helpTip: '前台领班与收银员具备操作开台、点单与扫码收银权限。'
  },
  kds: {
    tabId: 'kds',
    tabLabel: 'KDS 后厨出品大屏',
    requiredPermission: 'kds:finish_dish',
    minimumRole: 'barista',
    category: '实时经营',
    isSensitive: false,
    helpTip: '厨师与水吧师可进行出品状态划单推进。'
  },
  queue: {
    tabId: 'queue',
    tabLabel: '等位叫号呼叫中心',
    requiredPermission: 'queue:call',
    minimumRole: 'cashier',
    category: '实时经营',
    isSensitive: false,
    helpTip: '前台收银负责叫号呼叫、过号处理与桌号绑定。'
  },

  // 支付财务与报表
  finance: {
    tabId: 'finance',
    tabLabel: '财务对账与损益',
    requiredPermission: 'finance:view_profit',
    minimumRole: 'manager',
    category: '支付财务与报表',
    isSensitive: true,
    helpTip: '涉及店铺净利润、营业额及抽佣成本，仅限店长权限查阅。'
  },
  audit: {
    tabId: 'audit',
    tabLabel: '操作审计与离线队列',
    requiredPermission: 'finance:view_basic',
    minimumRole: 'cashier',
    category: '支付财务与报表',
    isSensitive: false,
    helpTip: '收银与店长可核对历史交易与离线重发队列。'
  },
  analytics: {
    tabId: 'analytics',
    tabLabel: '营收与客流大屏',
    requiredPermission: 'finance:view_profit',
    minimumRole: 'manager',
    category: '支付财务与报表',
    isSensitive: true,
    helpTip: '全维度毛利走势与畅销客流模型仅向店长开放。'
  },

  // 菜品供应链
  menu: {
    tabId: 'menu',
    tabLabel: '菜品多渠道与沽清',
    requiredPermission: 'menu:status_toggle',
    minimumRole: 'cashier',
    category: '菜品供应链',
    isSensitive: false,
    helpTip: '收银与店长均可执行临时售罄与重新上架。'
  },
  craft_standards: {
    tabId: 'craft_standards',
    tabLabel: '制作工艺与配方标准',
    requiredPermission: 'sop:view',
    minimumRole: 'grill_chef',
    category: '菜品供应链',
    isSensitive: false,
    helpTip: '后厨主厨与水吧调饮师可随时查阅官方 SOP 标准工艺。'
  },
  processing_loss: {
    tabId: 'processing_loss',
    tabLabel: '初加工出肉率核算',
    requiredPermission: 'loss:record',
    minimumRole: 'grill_chef',
    category: '菜品供应链',
    isSensitive: false,
    helpTip: '炭烤主厨负责肉类解冻初加工称重与出肉率核算。'
  },
  materials: {
    tabId: 'materials',
    tabLabel: '原物料与安全库存',
    requiredPermission: 'supply:order',
    minimumRole: 'cashier',
    category: '菜品供应链',
    isSensitive: false,
    helpTip: '查看辅料用量、低水位补货提醒。'
  },
  sku_params: {
    tabId: 'sku_params',
    tabLabel: '数字参数与标准管理',
    requiredPermission: 'menu:price_edit',
    minimumRole: 'manager',
    category: '菜品供应链',
    isSensitive: true,
    helpTip: '菜品 SKU 规格与加料加价规则属于核心经营参数。'
  },
  inventory_close: {
    tabId: 'inventory_close',
    tabLabel: '每日打烊闭环盘点',
    requiredPermission: 'inventory:close',
    minimumRole: 'cashier',
    category: '菜品供应链',
    isSensitive: false,
    helpTip: '每日打烊由收银与当值厨师协同实物盘点并提交确认。'
  },
  loss: {
    tabId: 'loss',
    tabLabel: '全链路损耗监控',
    requiredPermission: 'loss:record',
    minimumRole: 'grill_chef',
    category: '菜品供应链',
    isSensitive: false,
    helpTip: '后厨对烤焦、变质、撒漏等实际耗损进行录入申报。'
  },

  // 营销会员
  marketing: {
    tabId: 'marketing',
    tabLabel: '优惠券发布与营销风控中枢',
    requiredPermission: 'menu:price_edit',
    minimumRole: 'manager',
    category: '营销会员',
    isSensitive: true,
    helpTip: '优惠券面额发放与风控防刷阈值涉及营业成本，必须店长授权。'
  },
  category_brands: {
    tabId: 'category_brands',
    tabLabel: '分类品牌弹窗与类目故事管理',
    requiredPermission: 'menu:price_edit',
    minimumRole: 'manager',
    category: '营销会员',
    isSensitive: false,
    helpTip: '品牌宣发与故事文案设定由店长统筹维护。'
  },
  members: {
    tabId: 'members',
    tabLabel: '会员储值卡与积分资产',
    requiredPermission: 'pos:checkout',
    minimumRole: 'cashier',
    category: '营销会员',
    isSensitive: false,
    helpTip: '收银可协助顾客进行储值充卡与积分抵现。'
  },
  user_data_mgmt: {
    tabId: 'user_data_mgmt',
    tabLabel: '用户数据中心 (统一档案)',
    requiredPermission: 'finance:view_profit',
    minimumRole: 'manager',
    category: '营销会员',
    isSensitive: true,
    helpTip: '涉及客群隐私与消费画像，仅供店长查阅。'
  },

  // 门店与位置
  truck_expand: {
    tabId: 'truck_expand',
    tabLabel: '餐车展开与底栏气泡控制',
    requiredPermission: 'pos:order',
    minimumRole: 'cashier',
    category: '门店与位置',
    isSensitive: false,
    helpTip: '餐车实时开市收市展开参数配置。'
  },
  gps: {
    tabId: 'gps',
    tabLabel: '餐车停靠与 GPS 广播',
    requiredPermission: 'pos:order',
    minimumRole: 'cashier',
    category: '门店与位置',
    isSensitive: false,
    helpTip: '广播当前餐车驻点坐标与极速配送半径。'
  },

  // 系统团队与硬件
  staff: {
    tabId: 'staff',
    tabLabel: '员工花名册与岗位权限',
    requiredPermission: 'staff:manage_members',
    minimumRole: 'manager',
    category: '系统团队与硬件',
    isSensitive: true,
    helpTip: '录用新员工、指派岗位以及调整权限矩阵仅限店长操作。'
  },
  cloud_sync: {
    tabId: 'cloud_sync',
    tabLabel: '腾讯云服务数据同步中枢 (CloudBase)',
    requiredPermission: 'contingency:view',
    minimumRole: 'manager',
    category: '系统团队与硬件',
    isSensitive: true,
    helpTip: '云端双向同步状态监控与离线缓存同步指令。'
  },
  version_tracking: {
    tabId: 'version_tracking',
    tabLabel: '数据修改指针与版本追踪修复',
    requiredPermission: 'contingency:rollback',
    minimumRole: 'manager',
    category: '系统团队与硬件',
    isSensitive: true,
    helpTip: '敏感指针追踪与时光机回滚操作，防人为误删。'
  },
  sentinel: {
    tabId: 'sentinel',
    tabLabel: '五维自动化安全与自闭环中枢',
    requiredPermission: 'contingency:view',
    minimumRole: 'barista',
    category: '系统团队与硬件',
    isSensitive: false,
    helpTip: '实时监听后厨超载、网络中断、围栏脱圈与自适应熔断执行。'
  },
  scanner: {
    tabId: 'scanner',
    tabLabel: '智能扫码枪硬件控制台',
    requiredPermission: 'pos:checkout',
    minimumRole: 'cashier',
    category: '系统团队与硬件',
    isSensitive: false,
    helpTip: '硬件条码扫描器配对与指令模拟。'
  }
};

// ==================== 4. 临时店长代签提权机制 (Emergency Manager Override) ====================
const STORAGE_KEY_OVERRIDE_TOKEN = 'obsidian_temp_manager_override';
const DEFAULT_MANAGER_OVERRIDE_PINS = ['8888', '666666', '123456'];

export interface ManagerOverrideSession {
  authorizedBy: string;
  grantedAt: string;
  expiresAt: string; // ISO string, 15 minutes window
  reason: string;
}

/**
 * 获取当前有效的店长临时提权授权
 */
export function getActiveManagerOverride(): ManagerOverrideSession | null {
  const session = safeGetStorage<ManagerOverrideSession | null>(STORAGE_KEY_OVERRIDE_TOKEN, null);
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() > Date.now()) {
    return session;
  }
  // 已过期，清除
  safeSetStorage(STORAGE_KEY_OVERRIDE_TOKEN, null);
  return null;
}

/**
 * 校验并激活店长临时放行授权
 */
export function verifyAndGrantManagerOverride(pin: string, operatorName: string, reason: string = '业务紧急调权'): { success: boolean; message: string } {
  const trimmed = pin.trim();
  if (DEFAULT_MANAGER_OVERRIDE_PINS.includes(trimmed)) {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15分钟有效期
    const session: ManagerOverrideSession = {
      authorizedBy: '张伟 (店长)',
      grantedAt: new Date().toISOString(),
      expiresAt,
      reason
    };
    safeSetStorage(STORAGE_KEY_OVERRIDE_TOKEN, session);

    // 记录安全审计事件
    recordSecurityAuditLog({
      action: 'manager_override_granted',
      operator: operatorName,
      target: reason,
      status: 'granted',
      details: `店长授权码校验通过，为操作员 [${operatorName}] 授予 15 分钟临时高权放行。`
    });

    return {
      success: true,
      message: '店长临时授权通过！已为您授予 15 分钟紧急操作窗口。'
    };
  }

  // 记录未授权尝试
  recordSecurityAuditLog({
    action: 'manager_override_failed',
    operator: operatorName,
    target: reason,
    status: 'denied',
    details: `输入了错误的店长授权码: [${trimmed.slice(0, 2)}**]`
  });

  return {
    success: false,
    message: '授权码有误，请输入有效的 4~6 位店长安全授权码 (默认 8888)'
  };
}

/**
 * 提前吊销临时提权
 */
export function revokeManagerOverride(): void {
  safeSetStorage(STORAGE_KEY_OVERRIDE_TOKEN, null);
}

// ==================== 5. 权限判断工具函数 ====================

/**
 * 检查当前员工是否具备指定权限
 */
export function checkStaffPermission(
  session: MerchantSession | null | undefined,
  requiredPermission: PermissionCode
): { allowed: boolean; reason?: string } {
  // 1. 若无员工会话
  if (!session || !session.isLoggedIn) {
    return { allowed: false, reason: '未登录商家员工账号，请先通过手机号验真登录。' };
  }

  // 2. 店长拥有全域特权
  if (session.role === 'manager' || session.permissions.includes('all')) {
    return { allowed: true };
  }

  // 3. 检查是否有处于有效期内的店长临时提权
  const activeOverride = getActiveManagerOverride();
  if (activeOverride) {
    return { allowed: true, reason: `已获得店长临时放行授权 (有效期至 ${new Date(activeOverride.expiresAt).toLocaleTimeString()})` };
  }

  // 4. 检查用户个性化显式权限或所属岗位基线权限
  const roleDefaultPermissions = ROLE_DEFAULT_PERMISSIONS[session.role] || [];
  const customPermissions = (session.permissions || []) as PermissionCode[];

  const hasDirect = customPermissions.includes(requiredPermission);
  const hasRoleDefault = roleDefaultPermissions.includes(requiredPermission);

  if (hasDirect || hasRoleDefault) {
    return { allowed: true };
  }

  const roleMeta = ROLE_LEVEL_META[session.role];
  return {
    allowed: false,
    reason: `当前岗位【${roleMeta.name}】无权访问该功能，该操作仅限上级岗位或店长授权。`
  };
}

/**
 * 检查当前员工是否允许访问指定的商家功能 Tab
 */
export function canAccessMerchantTab(
  tabId: string,
  session: MerchantSession | null | undefined
): { allowed: boolean; requirement?: TabPermissionRequirement; reason?: string } {
  const req = MERCHANT_TAB_PERMISSIONS[tabId];
  if (!req) {
    // 未特别声明的 Tab 默认允许访问
    return { allowed: true };
  }

  const check = checkStaffPermission(session, req.requiredPermission);
  return {
    allowed: check.allowed,
    requirement: req,
    reason: check.reason
  };
}

// ==================== 6. 安全审计日志系统 (Security Audit Logger) ====================
export interface SecurityAuditEvent {
  id: string;
  timestamp: string;
  action:
    | 'auth_login'
    | 'auth_logout'
    | 'tab_access_denied'
    | 'sensitive_price_override'
    | 'sensitive_refund'
    | 'sensitive_staff_modify'
    | 'manager_override_granted'
    | 'manager_override_failed'
    | 'platform_access_granted'
    | 'platform_access_denied';
  operator: string;
  target: string;
  status: 'allowed' | 'denied' | 'granted' | 'revoked';
  details: string;
}

const STORAGE_KEY_SECURITY_AUDIT = 'obsidian_security_audit_events';

export function getSecurityAuditLogs(): SecurityAuditEvent[] {
  return safeGetStorage<SecurityAuditEvent[]>(STORAGE_KEY_SECURITY_AUDIT, [
    {
      id: 'sec-init-01',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      action: 'auth_login',
      operator: '张伟 (店长)',
      target: 'ST-001',
      status: 'allowed',
      details: '通过 138****8000 手机号实名验证登录商家总管工作台。'
    },
    {
      id: 'sec-init-02',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      action: 'tab_access_denied',
      operator: '李晓芳 (前台领班/收银)',
      target: 'finance',
      status: 'denied',
      details: '尝试访问【财务对账与损益】受阻，已引导提权或交接班。'
    }
  ]);
}

export function recordSecurityAuditLog(event: Omit<SecurityAuditEvent, 'id' | 'timestamp'>): void {
  try {
    const existing = getSecurityAuditLogs();
    const newRecord: SecurityAuditEvent = {
      ...event,
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    const updated = [newRecord, ...existing.slice(0, 99)]; // 保持最新 100 条
    safeSetStorage(STORAGE_KEY_SECURITY_AUDIT, updated);
  } catch (err) {
    console.warn('[RBAC] 记录安全日志失败:', err);
  }
}
