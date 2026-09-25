import {
  FranchiseeProfile,
  FranchiseDishPolicy,
  FranchiseTenantContext,
  FranchisePriceAuditLog,
  OrganizationRole
} from '../types/franchise';

const FRANCHISE_TENANT_KEY = 'obsidian_franchise_tenant_ctx';
const FRANCHISE_PROFILES_KEY = 'obsidian_franchise_profiles';
const FRANCHISE_POLICIES_KEY = 'obsidian_franchise_dish_policies';
const FRANCHISE_AUDIT_KEY = 'obsidian_franchise_price_audit_logs';
const FRANCHISE_MODE_TOGGLE_KEY = 'obsidian_franchise_mode_enabled';

export const FRANCHISE_TENANT_EVENT = 'obsidian_franchise_tenant_changed';
export const FRANCHISE_POLICY_EVENT = 'obsidian_franchise_policy_changed';
export const FRANCHISE_TOGGLE_EVENT = 'obsidian_franchise_toggle_changed';


// 初始总部与特许加盟商档案库
export const INITIAL_FRANCHISEE_PROFILES: FranchiseeProfile[] = [
  {
    id: 'FRAN-SH-001',
    companyName: '上海静安卓越餐饮管理合伙企业 (有限合伙)',
    brandBranchName: '黑曜石流动餐车 · 静安卓越特许分部',
    ownerName: '张建国 (合伙投资人)',
    phone: '13817298811',
    licenseNo: '91310106MA1FY8809X',
    cityRegion: '上海 · 静安区 / 普陀区 (大悦城及科技园网格)',
    contractStart: '2026-01-01',
    contractEnd: '2028-12-31',
    assignedTruckIds: ['truck-01', 'truck-02'],
    depositBalance: 30000,
    depositRequired: 30000,
    royaltyRatePercent: 5.0,
    status: 'active',
    complianceScore: 98,
    monthlyGmvQuota: 180000,
    notes: '2026年度五星级加盟商标杆，名下两台车坪效稳居前列，严守总部冷链标准。',
    updatedAt: '2026-08-28'
  },
  {
    id: 'FRAN-SH-002',
    companyName: '上海浦东潮创餐饮服务有限公司',
    brandBranchName: '黑曜石流动餐车 · 浦东滨江潮玩特许分部',
    ownerName: '李晓峰 (车长合伙人)',
    phone: '13918239922',
    licenseNo: '91310115MA1H89102L',
    cityRegion: '上海 · 浦东新区 (世博滨江 / 前滩潮玩区)',
    contractStart: '2026-03-01',
    contractEnd: '2029-02-28',
    assignedTruckIds: ['truck-03'],
    depositBalance: 20000,
    depositRequired: 20000,
    royaltyRatePercent: 5.5,
    status: 'active',
    complianceScore: 95,
    monthlyGmvQuota: 100000,
    notes: '聚焦夜市集市与滨江露营地场景，精酿饮品动销率极高。',
    updatedAt: '2026-08-28'
  }
];

// 初始总部强锁定核心招牌爆品策略
export const INITIAL_DISH_POLICIES: FranchiseDishPolicy[] = [
  {
    dishId: 'dish-1',
    isHqLocked: true,
    lockedReason: '【品牌核心心智】A5宫崎和牛厚肉饼与黑松露配方统一，全国统一定价，严禁加盟商擅自涨价或私改原料。',
    hqBasePrice: 63.0,
    allowedMinPrice: 58.0,
    allowedMaxPrice: 68.0,
    allowFranchiseePriceOverride: false, // 核心招牌严禁修改价格
    requireHqApprovalForDelist: true,
    bomSkuCode: 'SKU-MEAT-WAGYU-01',
    recommendedMarginRate: 0.62,
    lastLockedAt: '2026-08-20',
    lockedBy: '总部主厨委员评议组'
  },
  {
    dishId: 'dish-2',
    isHqLocked: true,
    lockedReason: '【总部供应链爆品】法国黑松露手工玉棋，预拌粉料由中央冷链直供，严禁下架。',
    hqBasePrice: 48.0,
    allowedMinPrice: 45.0,
    allowedMaxPrice: 52.0,
    allowFranchiseePriceOverride: true, // 允许在 ±¥3 内弹性微调
    requireHqApprovalForDelist: true,
    bomSkuCode: 'SKU-STAPLE-GNOCCHI-02',
    recommendedMarginRate: 0.68,
    lastLockedAt: '2026-08-20',
    lockedBy: '总部运营总监'
  },
  {
    dishId: 'dish-3',
    isHqLocked: true,
    lockedReason: '【招牌热销】日式备长炭炙烤安格斯牛板腱串，统一定量 120g/串，锁死标准工艺。',
    hqBasePrice: 28.0,
    allowedMinPrice: 26.0,
    allowedMaxPrice: 32.0,
    allowFranchiseePriceOverride: false,
    requireHqApprovalForDelist: true,
    bomSkuCode: 'SKU-MEAT-BEEF-03',
    recommendedMarginRate: 0.65,
    lastLockedAt: '2026-08-20',
    lockedBy: '总部品牌督导部'
  },
  {
    dishId: 'dish-4',
    isHqLocked: true,
    lockedReason: '【核心特调】冷萃日晒耶加雪菲特调，咖啡豆统采统发，防散装豆冲抵。',
    hqBasePrice: 22.0,
    allowedMinPrice: 20.0,
    allowedMaxPrice: 25.0,
    allowFranchiseePriceOverride: true,
    requireHqApprovalForDelist: false,
    bomSkuCode: 'SKU-DRINK-COLDBREW-04',
    recommendedMarginRate: 0.75,
    lastLockedAt: '2026-08-20',
    lockedBy: '总部研发实验室'
  }
];

// 默认初始租户上下文：总部超级管理员视角
export const DEFAULT_TENANT_CONTEXT: FranchiseTenantContext = {
  currentRole: 'hq_admin',
  currentFranchiseeId: 'HQ',
  currentTruckId: 'truck-01',
  accessibleTruckIds: ['truck-01', 'truck-02', 'truck-03', 'truck-04', 'truck-05'],
  isHqUser: true,
  operatorName: '黑曜石品牌管理总部 (HQ-001)'
};

function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSetStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore
  }
}

class FranchiseTenantEngine {
  private context: FranchiseTenantContext;
  private profiles: FranchiseeProfile[];
  private dishPolicies: FranchiseDishPolicy[];
  private auditLogs: FranchisePriceAuditLog[];
  private franchiseModeEnabled: boolean;

  constructor() {
    this.context = safeGetStorage<FranchiseTenantContext>(FRANCHISE_TENANT_KEY, DEFAULT_TENANT_CONTEXT);
    this.profiles = safeGetStorage<FranchiseeProfile[]>(FRANCHISE_PROFILES_KEY, INITIAL_FRANCHISEE_PROFILES);
    this.dishPolicies = safeGetStorage<FranchiseDishPolicy[]>(FRANCHISE_POLICIES_KEY, INITIAL_DISH_POLICIES);
    this.auditLogs = safeGetStorage<FranchisePriceAuditLog[]>(FRANCHISE_AUDIT_KEY, []);
    this.franchiseModeEnabled = safeGetStorage<boolean>(FRANCHISE_MODE_TOGGLE_KEY, true);
  }

  // --- Feature Toggle ---
  public isFranchiseModeEnabled(): boolean {
    return this.franchiseModeEnabled;
  }

  public setFranchiseMode(enabled: boolean): void {
    this.franchiseModeEnabled = enabled;
    safeSetStorage(FRANCHISE_MODE_TOGGLE_KEY, enabled);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(FRANCHISE_TOGGLE_EVENT, { detail: { enabled } }));
    }
  }

  // --- Context & Role Switching ---
  public getContext(): FranchiseTenantContext {
    return { ...this.context };
  }

  public switchContext(role: OrganizationRole, franchiseeId: string, truckId?: string): FranchiseTenantContext {
    let accessibleTrucks: string[] = ['truck-01', 'truck-02', 'truck-03'];
    let opName = '黑曜石品牌管理总部 (HQ)';
    const isHq = role === 'hq_admin' || role === 'regional_director' || franchiseeId === 'HQ';

    if (!isHq) {
      const foundFranchisee = this.profiles.find((p) => p.id === franchiseeId);
      if (foundFranchisee) {
        accessibleTrucks = [...foundFranchisee.assignedTruckIds];
        opName = `${foundFranchisee.ownerName} · ${foundFranchisee.brandBranchName}`;
      } else {
        accessibleTrucks = ['truck-01'];
      }
    }

    const fallbackTruck = accessibleTrucks.includes(truckId || '') ? (truckId as string) : accessibleTrucks[0] || 'truck-01';

    this.context = {
      currentRole: role,
      currentFranchiseeId: isHq ? 'HQ' : franchiseeId,
      currentTruckId: fallbackTruck,
      accessibleTruckIds: accessibleTrucks,
      isHqUser: isHq,
      operatorName: opName
    };

    safeSetStorage(FRANCHISE_TENANT_KEY, this.context);
    this.notifyTenantChanged();
    return { ...this.context };
  }

  public switchTruck(truckId: string): boolean {
    if (!this.context.accessibleTruckIds.includes(truckId)) {
      return false; // 越权防范：加盟商不可访问非名下餐车
    }
    this.context.currentTruckId = truckId;
    safeSetStorage(FRANCHISE_TENANT_KEY, this.context);
    this.notifyTenantChanged();
    return true;
  }

  public isTruckAccessible(truckId: string): boolean {
    return this.context.accessibleTruckIds.includes(truckId);
  }

  // --- Franchisee Profiles Management ---
  public getProfiles(): FranchiseeProfile[] {
    return [...this.profiles];
  }

  public getProfileById(id: string): FranchiseeProfile | undefined {
    return this.profiles.find((p) => p.id === id);
  }

  public saveProfile(profile: FranchiseeProfile): void {
    const idx = this.profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) {
      this.profiles[idx] = { ...profile, updatedAt: new Date().toISOString().split('T')[0] };
    } else {
      this.profiles.push({ ...profile, updatedAt: new Date().toISOString().split('T')[0] });
    }
    safeSetStorage(FRANCHISE_PROFILES_KEY, this.profiles);
    this.notifyTenantChanged();
  }

  public updateProfile(profile: FranchiseeProfile): void {
    this.saveProfile(profile);
  }

  // --- Brand Menu Policies & Lock Mechanism ---
  public getPolicies(): FranchiseDishPolicy[] {
    return [...this.dishPolicies];
  }

  public getPolicy(dishId: string): FranchiseDishPolicy | undefined {
    return this.dishPolicies.find((p) => p.dishId === dishId);
  }

  public savePolicy(policy: FranchiseDishPolicy): void {
    // 仅总部最高管理员具备配方/售价锁定权限
    const idx = this.dishPolicies.findIndex((p) => p.dishId === policy.dishId);
    if (idx >= 0) {
      this.dishPolicies[idx] = { ...policy, lastLockedAt: new Date().toISOString().split('T')[0] };
    } else {
      this.dishPolicies.push({ ...policy, lastLockedAt: new Date().toISOString().split('T')[0] });
    }
    safeSetStorage(FRANCHISE_POLICIES_KEY, this.dishPolicies);
    this.notifyPolicyChanged();
  }

  public toggleDishLock(dishId: string, isLocked: boolean, reason?: string): FranchiseDishPolicy {
    let policy = this.getPolicy(dishId);
    if (!policy) {
      policy = {
        dishId,
        isHqLocked: isLocked,
        lockedReason: reason || '总部品牌统一策略设定',
        hqBasePrice: 38.0,
        allowedMinPrice: 35.0,
        allowedMaxPrice: 42.0,
        allowFranchiseePriceOverride: false,
        requireHqApprovalForDelist: true,
        recommendedMarginRate: 0.65,
        lastLockedAt: new Date().toISOString().split('T')[0],
        lockedBy: this.context.operatorName
      };
    } else {
      policy.isHqLocked = isLocked;
      if (reason) policy.lockedReason = reason;
      policy.lastLockedAt = new Date().toISOString().split('T')[0];
      policy.lockedBy = this.context.operatorName;
    }
    this.savePolicy(policy);

    this.recordAuditLog({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      dishId,
      dishName: `菜品 #${dishId}`,
      franchiseeId: this.context.currentFranchiseeId,
      truckId: this.context.currentTruckId,
      operator: this.context.operatorName,
      beforePrice: policy.hqBasePrice,
      afterPrice: policy.hqBasePrice,
      action: isLocked ? 'hq_lock' : 'hq_unlock',
      status: 'allowed',
      reason: isLocked ? `总部锁定菜品: ${policy.lockedReason}` : '总部解除菜品强锁定'
    });

    return policy;
  }

  /**
   * 加盟商改价合规安全校验引擎 (Pre-Flight Modification Guard)
   */
  public validateDishPriceUpdate(
    dishId: string,
    dishName: string,
    targetPrice: number,
    oldPrice: number
  ): {
    allowed: boolean;
    reason?: string;
    policy?: FranchiseDishPolicy;
  } {
    const policy = this.getPolicy(dishId);

    // 总部用户拥有全量定价裁决权
    if (this.context.isHqUser) {
      return { allowed: true, policy };
    }

    // 未被总部纳入强管辖范围的非核心自选辅食，允许加盟商自主调价
    if (!policy || !policy.isHqLocked) {
      return { allowed: true, policy };
    }

    // 核心爆品且不允许任何调价
    if (!policy.allowFranchiseePriceOverride) {
      this.recordAuditLog({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        dishId,
        dishName,
        franchiseeId: this.context.currentFranchiseeId,
        truckId: this.context.currentTruckId,
        operator: this.context.operatorName,
        beforePrice: oldPrice,
        afterPrice: targetPrice,
        action: 'blocked_attempt',
        status: 'rejected',
        reason: `越权拦截：【${dishName}】为总部特级核心爆品，全国统一定价 ¥${policy.hqBasePrice.toFixed(2)}，禁止加盟商改动。`
      });

      return {
        allowed: false,
        reason: `【${dishName}】为总部特级核心爆品（全国统一零售价 ¥${policy.hqBasePrice.toFixed(2)}）。总部已锁定调价权限，加盟商无权擅改！`,
        policy
      };
    }

    // 允许在上下限区间内微调，校验上下限
    if (targetPrice < policy.allowedMinPrice || targetPrice > policy.allowedMaxPrice) {
      this.recordAuditLog({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        dishId,
        dishName,
        franchiseeId: this.context.currentFranchiseeId,
        truckId: this.context.currentTruckId,
        operator: this.context.operatorName,
        beforePrice: oldPrice,
        afterPrice: targetPrice,
        action: 'blocked_attempt',
        status: 'rejected',
        reason: `价格超出总部特许浮动区间 [¥${policy.allowedMinPrice} ~ ¥${policy.allowedMaxPrice}]`
      });

      return {
        allowed: false,
        reason: `调价失败：【${dishName}】总部许可浮动范围为 ¥${policy.allowedMinPrice.toFixed(2)} ~ ¥${policy.allowedMaxPrice.toFixed(2)}。当前输入 ¥${targetPrice.toFixed(2)} 超出红线范围！`,
        policy
      };
    }

    // 合规区间内微调，记录合规日志
    this.recordAuditLog({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      dishId,
      dishName,
      franchiseeId: this.context.currentFranchiseeId,
      truckId: this.context.currentTruckId,
      operator: this.context.operatorName,
      beforePrice: oldPrice,
      afterPrice: targetPrice,
      action: 'franchisee_override',
      status: 'allowed',
      reason: `加盟商合规区间内微调 (指导价 ¥${policy.hqBasePrice} -> ¥${targetPrice})`
    });

    return { allowed: true, policy };
  }

  // --- Audit Logs ---
  public getAuditLogs(): FranchisePriceAuditLog[] {
    return [...this.auditLogs];
  }

  private recordAuditLog(log: FranchisePriceAuditLog): void {
    this.auditLogs = [log, ...this.auditLogs.slice(0, 99)]; // 保留近100条审计
    safeSetStorage(FRANCHISE_AUDIT_KEY, this.auditLogs);
  }

  // --- Event Dispatchers ---
  private notifyTenantChanged(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(FRANCHISE_TENANT_EVENT, { detail: { ...this.context } })
      );
    }
  }

  private notifyPolicyChanged(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(FRANCHISE_POLICY_EVENT, { detail: [...this.dishPolicies] })
      );
    }
  }
}

export const globalFranchiseEngine = new FranchiseTenantEngine();
