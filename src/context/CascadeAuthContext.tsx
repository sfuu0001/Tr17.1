import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  CascadePermissionItem,
  MeshTierLevel,
  ActiveMeshIdentity,
  getCascadePermissions,
  saveCascadePermissions,
  toggleCascadePermission,
  applyGoldRiderPreset,
  applyAllOpenPreset,
  resetBaselinePreset,
  requestElevatedPrivilege,
  getActiveMeshIdentity,
  setActiveMeshIdentity,
  switchMeshTier,
  evaluateMeshPermission,
  getL3IdentityFromSession,
  getL4IdentityFromSession,
  EVENT_CASCADE_PERMISSIONS_CHANGED,
  EVENT_CASCADE_IDENTITY_CHANGED,
  DEFAULT_MESH_IDENTITIES
} from '../utils/cascadeMeshEngine';
import {
  EVENT_MERCHANT_AUTH_CHANGED,
  EVENT_RIDER_AUTH_CHANGED
} from '../utils/staffAndRiderAuthEngine';
import { useToast } from '../components/ui/ToastContext';

export interface PermissionEvaluationResult {
  allowed: boolean;
  item?: CascadePermissionItem;
  reason?: string;
  requiresApproval?: boolean;
  signer?: string;
  locked?: boolean;
}

export interface CascadeAuthContextType {
  permissions: CascadePermissionItem[];
  activeIdentity: ActiveMeshIdentity;
  canExecute: (permId: string) => PermissionEvaluationResult;
  hasPermission: (permId: string) => boolean;
  switchTier: (tier: MeshTierLevel, specificNodeId?: string) => void;
  togglePermission: (permId: string) => void;
  requestElevation: (permId: string, durationMinutes?: number, reason?: string) => boolean;
  applyPreset: (type: 'gold' | 'all' | 'baseline') => void;
  isTierAtLeast: (tier: MeshTierLevel) => boolean;
  promptPermissionBlocked: (permId: string, customTitle?: string) => void;
}

const CascadeAuthContext = createContext<CascadeAuthContextType | null>(null);

const TIER_ORDER: Record<MeshTierLevel, number> = {
  CUSTOMER: 0,
  L4: 1, // 基层现场单兵
  L3: 2, // 站点移动餐车
  L2: 3, // 战区指挥总监
  L1: 4, // 区域商圈主控
  L0: 5, // HQ最高全权席
  L5: 6  // 独立特权审计席
};

export const CascadeAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const toast = useToast();
  const [permissions, setPermissions] = useState<CascadePermissionItem[]>(() => getCascadePermissions());
  const [activeIdentity, setActiveIdentityState] = useState<ActiveMeshIdentity>(() => getActiveMeshIdentity());

  // 监听全网权限变更、级联身份变更以及商户/骑手登录与交接班事件
  useEffect(() => {
    const handlePermsChanged = (e: any) => {
      const items = e.detail || getCascadePermissions();
      setPermissions([...items]);
    };
    const handleIdentityChanged = (e: any) => {
      const iden = e.detail || getActiveMeshIdentity();
      setActiveIdentityState({ ...iden });
    };

    // 商户登录或交接班时：若当前处于 L3 席位视角，动态无缝同步
    const handleMerchantAuthChanged = (e: any) => {
      const session = e.detail;
      const updatedL3 = getL3IdentityFromSession(session);
      setActiveIdentityState((prev) => {
        if (prev.tier === 'L3') {
          setActiveMeshIdentity(updatedL3);
          return updatedL3;
        }
        return prev;
      });
    };

    // 骑手登录或换登时：若当前处于 L4 席位视角，动态无缝同步
    const handleRiderAuthChanged = (e: any) => {
      const session = e.detail;
      const updatedL4 = getL4IdentityFromSession(session);
      setActiveIdentityState((prev) => {
        if (prev.tier === 'L4') {
          setActiveMeshIdentity(updatedL4);
          return updatedL4;
        }
        return prev;
      });
    };

    window.addEventListener(EVENT_CASCADE_PERMISSIONS_CHANGED, handlePermsChanged);
    window.addEventListener(EVENT_CASCADE_IDENTITY_CHANGED, handleIdentityChanged);
    window.addEventListener(EVENT_MERCHANT_AUTH_CHANGED, handleMerchantAuthChanged);
    window.addEventListener(EVENT_RIDER_AUTH_CHANGED, handleRiderAuthChanged);

    return () => {
      window.removeEventListener(EVENT_CASCADE_PERMISSIONS_CHANGED, handlePermsChanged);
      window.removeEventListener(EVENT_CASCADE_IDENTITY_CHANGED, handleIdentityChanged);
      window.removeEventListener(EVENT_MERCHANT_AUTH_CHANGED, handleMerchantAuthChanged);
      window.removeEventListener(EVENT_RIDER_AUTH_CHANGED, handleRiderAuthChanged);
    };
  }, []);

  // 核心鉴权评估
  const canExecute = useCallback(
    (permId: string): PermissionEvaluationResult => {
      return evaluateMeshPermission(permId, activeIdentity.tier);
    },
    [activeIdentity.tier, permissions]
  );

  // 快捷布尔判断
  const hasPermission = useCallback(
    (permId: string): boolean => {
      return canExecute(permId).allowed;
    },
    [canExecute]
  );

  // 快捷弹出受限拦截提示
  const promptPermissionBlocked = useCallback(
    (permId: string, customTitle?: string) => {
      const evalRes = canExecute(permId);
      if (evalRes.allowed) return;

      const title = customTitle || `【${evalRes.item?.name || permId}】分层授权拦截`;
      const desc = evalRes.reason || '当前层级无权执行该受控操作，请联系战区总监或超管赋权';

      toast.error(title, desc);
    },
    [canExecute, toast]
  );

  // 切换层级身份
  const switchTier = useCallback(
    (tier: MeshTierLevel, specificNodeId?: string) => {
      const newIdentity = switchMeshTier(tier, specificNodeId);
      setActiveIdentityState({ ...newIdentity });
      toast.info(
        `已切换全域级联授权身份: ${newIdentity.tierLabel}`,
        `当前视角：${newIdentity.name} (${newIdentity.roleTitle})`
      );
    },
    [toast]
  );

  // 切换某项权限
  const handleTogglePermission = useCallback(
    (permId: string) => {
      const next = toggleCascadePermission(permId);
      setPermissions([...next]);
      const target = next.find((p) => p.id === permId);
      if (target) {
        toast.info(
          `全域级联权限变更: ${target.name}`,
          `状态已设为: ${target.enabled ? '【放行点亮】' : '【全局熔断置灰】'}`
        );
      }
    },
    [toast]
  );

  // 提权申请
  const handleRequestElevation = useCallback(
    (permId: string, durationMinutes: number = 30, reason: string = '现场高峰临时提权') => {
      const res = requestElevatedPrivilege(permId, durationMinutes, reason, `${activeIdentity.name} (${activeIdentity.tierLabel})`);
      if (res.success) {
        setPermissions(getCascadePermissions());
        toast.success(
          `特权临时放行成功: ${res.item?.name}`,
          `有效期 ${durationMinutes} 分钟，已记入全域区块链审计链条`
        );
        return true;
      }
      toast.error('提权签批失败', '未找到目标权限项或被物理熔断锁死');
      return false;
    },
    [activeIdentity, toast]
  );

  // 预设应用
  const handleApplyPreset = useCallback(
    (type: 'gold' | 'all' | 'baseline') => {
      let updated: CascadePermissionItem[] = [];
      if (type === 'gold') {
        updated = applyGoldRiderPreset();
        toast.success('已应用【金牌骑手】专属放权基线', '放行 10 项常用高频通讯与抢单特权');
      } else if (type === 'all') {
        updated = applyAllOpenPreset();
        toast.warning('已一键开放全域受控权限 (非锁定项全开)', '全系统进入宽松高协同模式');
      } else {
        updated = resetBaselinePreset();
        toast.info('已恢复全域岗位出厂初始基线', '重置为标准受控安全策略');
      }
      setPermissions([...updated]);
    },
    [toast]
  );

  // 辅助比较层级
  const isTierAtLeast = useCallback(
    (tier: MeshTierLevel): boolean => {
      return (TIER_ORDER[activeIdentity.tier] || 0) >= (TIER_ORDER[tier] || 0);
    },
    [activeIdentity.tier]
  );

  return (
    <CascadeAuthContext.Provider
      value={{
        permissions,
        activeIdentity,
        canExecute,
        hasPermission,
        switchTier,
        togglePermission: handleTogglePermission,
        requestElevation: handleRequestElevation,
        applyPreset: handleApplyPreset,
        isTierAtLeast,
        promptPermissionBlocked
      }}
    >
      {children}
    </CascadeAuthContext.Provider>
  );
};

export const useCascadeAuth = (): CascadeAuthContextType => {
  const context = useContext(CascadeAuthContext);
  if (!context) {
    throw new Error('useCascadeAuth must be used within a CascadeAuthProvider');
  }
  return context;
};
