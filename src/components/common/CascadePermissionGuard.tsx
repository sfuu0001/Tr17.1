import React from 'react';
import { Lock, ShieldAlert, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useCascadeAuth } from '../../context/CascadeAuthContext';

interface CascadePermissionGuardProps {
  permId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDisabledNotice?: boolean;
  inlineBadge?: boolean;
}

/**
 * 级联分层授权守卫组件 (Cascade Permission Guard)
 * 依据全域 4-Level Mesh 拓扑矩阵与当前层级身份严格拦截/保护受控业务区域
 */
export const CascadePermissionGuard: React.FC<CascadePermissionGuardProps> = ({
  permId,
  children,
  fallback,
  showDisabledNotice = true,
  inlineBadge = false
}) => {
  const { canExecute, requestElevation } = useCascadeAuth();
  const evaluation = canExecute(permId);

  if (evaluation.allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (inlineBadge) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono select-none"
        title={evaluation.reason}
      >
        <Lock className="w-3 h-3 text-amber-600" />
        <span>【{evaluation.item?.name || permId}】受限</span>
      </div>
    );
  }

  if (!showDisabledNotice) {
    return null;
  }

  return (
    <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 text-amber-900 text-xs space-y-2 select-none shadow-2xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>全域级联穿透分层授权拦截</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 font-mono text-amber-800 border border-amber-300">
            {evaluation.item?.level || '受控'}
          </span>
        </div>
        {evaluation.requiresApproval && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
            需总监审批
          </span>
        )}
      </div>

      <p className="text-[11px] text-amber-800/90 leading-relaxed">
        {evaluation.reason || '当前身份在全域 4-Level Mesh Topology 矩阵中未获得该业务项放权。'}
      </p>

      <div className="flex items-center justify-between pt-1 text-[10px] text-amber-700/80 border-t border-amber-200/60">
        <span className="font-mono">权限代码: {evaluation.item?.code || permId}</span>
        <button
          onClick={() => requestElevation(permId, 30, '现场协同临时提权申请')}
          className="font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-0.5 cursor-pointer"
        >
          申请临时放行 <ArrowUpRight className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
};
