import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  ArrowLeft,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  TabPermissionRequirement,
  ROLE_LEVEL_META,
  verifyAndGrantManagerOverride,
  getActiveManagerOverride
} from '../../utils/rbacEngine';
import { MerchantSession, maskPhoneNumber } from '../../utils/staffAndRiderAuthEngine';

interface PermissionDeniedGuardProps {
  requirement?: TabPermissionRequirement;
  merchantSession?: MerchantSession | null;
  onBackToAllowedTab: () => void;
  onOpenShiftHandover: () => void;
  onOverrideGranted: () => void;
  showToast: (msg: string) => void;
}

export const PermissionDeniedGuard: React.FC<PermissionDeniedGuardProps> = ({
  requirement,
  merchantSession,
  onBackToAllowedTab,
  onOpenShiftHandover,
  onOverrideGranted,
  showToast
}) => {
  const [overridePin, setOverridePin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeOverride = getActiveManagerOverride();
  const currentRoleMeta = merchantSession ? ROLE_LEVEL_META[merchantSession.role] : null;
  const requiredRoleMeta = requirement ? ROLE_LEVEL_META[requirement.minimumRole] : null;

  const handleVerifyOverride = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    setTimeout(() => {
      const res = verifyAndGrantManagerOverride(
        overridePin,
        merchantSession?.name || '未知操作员',
        `临时放行访问模块: [${requirement?.tabLabel || '受限模块'}]`
      );
      setIsSubmitting(false);

      if (res.success) {
        showToast(res.message);
        onOverrideGranted();
      } else {
        setErrorMsg(res.message);
      }
    }, 200);
  };

  return (
    <div className="w-full py-8 sm:py-12 px-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-neutral-300 shadow-xl max-w-xl w-full p-6 sm:p-8 text-[#1a1a17]">
        {/* Top Warning Banner */}
        <div className="flex items-start gap-4 pb-5 border-b border-neutral-200">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-100/70 border border-amber-300/60 text-[10px] tabular-nums text-amber-900 font-bold mb-1">
              <Lock className="w-3 h-3" />
              <span>RBAC 岗位权限受限</span>
            </div>
            <h2 className="text-lg font-bold text-[#1a1a17] tracking-tight">
              当前岗位无权访问「{requirement?.tabLabel || '该受控模块'}」
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              {requirement?.helpTip || '此模块属于敏感经营与财务资产范畴，需满足对应的岗位层级授权。'}
            </p>
          </div>
        </div>

        {/* Current Identity vs Required Hierarchy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
            <span className="text-[10px] tabular-nums text-neutral-400 block uppercase tracking-wider">
              当前在岗身份
            </span>
            <div className="text-sm font-bold text-[#1a1a17] mt-1 flex items-center gap-1.5">
              <span>{merchantSession?.name || '未登入'}</span>
              <span className="text-xs font-normal text-neutral-500 tabular-nums">
                ({merchantSession?.phone ? maskPhoneNumber(merchantSession.phone) : '无'})
              </span>
            </div>
            <div className="mt-1">
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${currentRoleMeta?.badgeColor || 'bg-neutral-100 text-neutral-600'}`}>
                {currentRoleMeta?.name || '未知岗位'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200">
            <span className="text-[10px] tabular-nums text-amber-700 block uppercase tracking-wider">
              准入最低要求
            </span>
            <div className="text-sm font-bold text-[#1a1a17] mt-1 flex items-center gap-1.5">
              <span>{requiredRoleMeta?.name || '店长授权'}</span>
            </div>
            <div className="mt-1">
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${requiredRoleMeta?.badgeColor || 'bg-amber-100 text-amber-800'}`}>
                {requiredRoleMeta?.tier || '核心管理权限'}
              </span>
            </div>
          </div>
        </div>

        {/* Action 1: Manager Temporary PIN Override */}
        <div className="bg-[#fbfbf9] p-4 rounded-xl border border-neutral-200 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              店长现场临时提权 (放行 15 分钟)
            </span>
            <span className="text-[10px] tabular-nums text-neutral-400">测试放行码: 8888</span>
          </div>
          <form onSubmit={handleVerifyOverride} className="flex gap-2">
            <input
              type="password"
              maxLength={8}
              value={overridePin}
              onChange={(e) => setOverridePin(e.target.value)}
              placeholder="输入 4~6 位店长放行 PIN"
              className="flex-1 text-xs tabular-nums px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />
            <button
              type="submit"
              disabled={isSubmitting || !overridePin}
              className="px-3.5 py-1.5 bg-[#1a1a17] hover:bg-neutral-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? '核验中...' : '立即提权放行'}
            </button>
          </form>
          {errorMsg && (
            <p className="text-[11px] text-red-600 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errorMsg}
            </p>
          )}
        </div>

        {/* Footer Navigation Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-200">
          <button
            type="button"
            onClick={onBackToAllowedTab}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回允许的常规操作</span>
          </button>

          <button
            type="button"
            onClick={onOpenShiftHandover}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300/80 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>快速交接班 / 切换店长登录</span>
          </button>
        </div>
      </div>
    </div>
  );
};
