/**
 * Urban Radar 客户端与云端数据沙箱治理中枢 (Sandbox Storage Guard)
 * 实现「租户餐车 (Tenant) - 角色私域 (Role) - 用户独立 (User) - 操作员 (Operator)」四维沙箱隔离
 */

import { safeGetStorage, safeSetStorage } from '../safeStorage';

export interface SandboxContext {
  /** 当前餐车/租户标识 (默认 truck_001) */
  truckId: string;
  /** 当前用户唯一标识 UID (会员账号 / 微信 openid / 匿名指纹) */
  userId: string;
  /** 当前所处角色 */
  role: 'customer' | 'merchant' | 'rider' | 'platform';
  /** 当前商户操作员工号/岗位ID */
  operatorId?: string;
}

const SANDBOX_CONTEXT_KEY = 'obsidian_sandbox_context_v1';
export const SANDBOX_CONTEXT_CHANGED_EVENT = 'obsidian_sandbox_context_changed';

// 默认兜底上下文
const DEFAULT_CONTEXT: SandboxContext = {
  truckId: 'truck_001',
  userId: 'guest_anonymous',
  role: 'customer'
};

export class SandboxStorageGuard {
  private static context: SandboxContext = (() => {
    if (typeof window === 'undefined') return DEFAULT_CONTEXT;
    try {
      const saved = safeGetStorage<SandboxContext | null>(SANDBOX_CONTEXT_KEY, null);
      if (saved && saved.truckId) {
        return { ...DEFAULT_CONTEXT, ...saved };
      }
      // 尝试从老版本的 truck_id 获取初始状态
      const legacyTruckId = localStorage.getItem('obsidian_active_truck_id');
      if (legacyTruckId) {
        const cleaned = legacyTruckId.replace(/"/g, '');
        return { ...DEFAULT_CONTEXT, truckId: cleaned || 'truck_001' };
      }
    } catch {
      // ignore
    }
    return DEFAULT_CONTEXT;
  })();

  /**
   * 更新当前沙箱上下文 (切换餐车/登录用户/切换角色)
   */
  public static updateContext(partial: Partial<SandboxContext>): SandboxContext {
    const prev = { ...this.context };
    this.context = { ...this.context, ...partial };
    
    // 持久化当前沙箱元信息
    safeSetStorage(SANDBOX_CONTEXT_KEY, this.context);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(SANDBOX_CONTEXT_CHANGED_EVENT, {
          detail: { prev, current: this.context }
        })
      );
    }
    return this.context;
  }

  /**
   * 获取当前激活的沙箱上下文快照
   */
  public static getContext(): Readonly<SandboxContext> {
    return this.context;
  }

  /**
   * 获取当前餐车租户ID
   */
  public static getTruckId(): string {
    return this.context.truckId || 'truck_001';
  }

  /**
   * 获取当前用户UID
   */
  public static getUserId(): string {
    return this.context.userId || 'guest_anonymous';
  }

  /**
   * 按照沙箱边界解析生成统一隔离复合 Key
   * @param scope 隔离作用域：
   *  - 'tenant': 餐车站号租户级 (餐车配置、展开策略、桌台、物料库存)
   *  - 'user': 用户个人私域 (用户地址簿、卡券包、足迹历史)
   *  - 'operator': 商家员工操作员级 (现场暂存挂单、交接班草稿)
   *  - 'global': 全局通用配置 (支付渠道定义、城市参数)
   * @param baseKey 业务基础键名 (如 'truck_expand_config')
   */
  public static resolveKey(
    scope: 'tenant' | 'user' | 'operator' | 'global',
    baseKey: string,
    explicitEntityId?: string
  ): string {
    const truckId = explicitEntityId || this.context.truckId || 'truck_001';
    const userId = explicitEntityId || this.context.userId || 'guest_anonymous';
    const opId = explicitEntityId || this.context.operatorId || 'default';

    switch (scope) {
      case 'tenant':
        return `obsidian:t_${truckId}:${baseKey}`;
      case 'user':
        return `obsidian:u_${userId}:${baseKey}`;
      case 'operator':
        return `obsidian:t_${truckId}:op_${opId}:${baseKey}`;
      case 'global':
      default:
        return `obsidian:global:${baseKey}`;
    }
  }

  /**
   * 具备平滑迁移能力的沙箱数据读取器
   * 优先读取沙箱复合 Key，若不存在则优雅回退读取旧版全局 Key 并完成写入升级
   */
  public static get<T>(
    scope: 'tenant' | 'user' | 'operator' | 'global',
    baseKey: string,
    fallbackValue: T,
    legacyKey?: string,
    explicitEntityId?: string
  ): T {
    const sandboxKey = this.resolveKey(scope, baseKey, explicitEntityId);
    
    // 1. 尝试从沙箱读取
    const sandboxVal = safeGetStorage<T | null>(sandboxKey, null);
    if (sandboxVal !== null && sandboxVal !== undefined) {
      return sandboxVal;
    }

    // 2. 如果存在旧版全局 Key，尝试平滑回退与自动升级
    if (legacyKey) {
      const legacyVal = safeGetStorage<T | null>(legacyKey, null);
      if (legacyVal !== null && legacyVal !== undefined) {
        // 自动升级至新沙箱存储
        safeSetStorage(sandboxKey, legacyVal);
        return legacyVal;
      }
    }

    return fallbackValue;
  }

  /**
   * 沙箱数据安全写入器
   * 写入沙箱隔离 Key，可选择性同步更新旧版 Key 以保持外部老代码向后兼容
   */
  public static set<T>(
    scope: 'tenant' | 'user' | 'operator' | 'global',
    baseKey: string,
    value: T,
    syncToLegacyKey?: string,
    explicitEntityId?: string
  ): void {
    const sandboxKey = this.resolveKey(scope, baseKey, explicitEntityId);
    safeSetStorage(sandboxKey, value);

    if (syncToLegacyKey) {
      // 保持向后兼容兼容镜像，同时方便单机老组件免改动过渡
      safeSetStorage(syncToLegacyKey, value);
    }
  }
}
