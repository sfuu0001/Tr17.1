import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserCheck,
  X,
  Check,
  Shield,
  Clock,
  Sparkles,
  ArrowRightLeft,
  ChevronRight
} from 'lucide-react';
import {
  PRESET_MERCHANT_STAFF,
  PresetStaffAccount,
  MerchantSession,
  loginMerchantWithPhone,
  maskPhoneNumber
} from '../../utils/staffAndRiderAuthEngine';
import { ROLE_LEVEL_META } from '../../utils/rbacEngine';
import { syncCascadeIdentityFromSession } from '../../utils/cascadeMeshEngine';

interface StaffShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: MerchantSession | null;
  onHandoverSuccess: (newSession: MerchantSession) => void;
  showToast: (msg: string) => void;
}

export const StaffShiftHandoverModal: React.FC<StaffShiftHandoverModalProps> = ({
  isOpen,
  onClose,
  currentSession,
  onHandoverSuccess,
  showToast
}) => {
  const [isSwitching, setIsSwitching] = useState<string | null>(null);

  const handleSelectStaff = async (staff: PresetStaffAccount) => {
    setIsSwitching(staff.staffNo);

    try {
      const res = await loginMerchantWithPhone({
        phone: staff.phone,
        authMethod: 'one_click'
      });

      if (res.success && res.session) {
        syncCascadeIdentityFromSession(res.session, 'merchant');
        showToast(`交接班成功！当前当值人员已切换为【${staff.name}】(${staff.roleTitle})`);
        onHandoverSuccess(res.session);
        onClose();
      } else {
        showToast(res.message);
      }
    } catch {
      showToast('交接班切换失败，请重试');
    } finally {
      setIsSwitching(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl border border-neutral-300 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-[#1a1a17] text-white p-4 sm:p-5 flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] tabular-nums text-amber-300 mb-2">
                <ArrowRightLeft className="w-3 h-3 text-amber-400" />
                <span>FOOD TRUCK SHIFT HANDOVER MATRIX</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                餐车站在岗交接班 · 岗位即时换登
              </h2>
              <p className="text-xs text-neutral-300 mt-1">
                支持餐车一线员工快速交接考勤。设备底层硬件指纹保持绑定，瞬间完成岗位权限重配。
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Shift Badge */}
          <div className="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 flex items-center justify-between text-xs">
            <span className="text-neutral-500">当前在岗交接人员:</span>
            <span className="font-bold text-[#1a1a17] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {currentSession ? `${currentSession.name} (${currentSession.roleTitle})` : '未登录'}
            </span>
          </div>

          {/* Staff Roster Cards */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5">
            {PRESET_MERCHANT_STAFF.map((staff) => {
              const isCurrent = currentSession?.phone === staff.phone;
              const roleMeta = ROLE_LEVEL_META[staff.role];
              const isLoading = isSwitching === staff.staffNo;

              return (
                <div
                  key={staff.staffNo}
                  onClick={() => !isCurrent && !isLoading && handleSelectStaff(staff)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isCurrent
                      ? 'border-emerald-600 bg-emerald-50/50 cursor-default ring-1 ring-emerald-500/30'
                      : 'border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xl shrink-0">
                        {staff.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#1a1a17]">{staff.name}</span>
                          <span className="text-[10px] tabular-nums text-neutral-500 px-1.5 py-0.2 rounded bg-neutral-100 border border-neutral-200">
                            {staff.staffNo}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${roleMeta.badgeColor}`}>
                            {staff.roleTitle}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1 tabular-nums">
                          手机号: {maskPhoneNumber(staff.phone)} · {staff.tag}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {roleMeta.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 self-center">
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-md">
                          <Check className="w-3.5 h-3.5" />
                          当值中
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(isSwitching)}
                          className="px-3 py-1 bg-white hover:bg-neutral-100 text-[#1a1a17] border border-neutral-300 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        >
                          {isLoading ? '切换中...' : '交接上班'}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
            <span>如需录入新员工，请使用店长权限在「员工花名册」中录入。</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 font-medium cursor-pointer"
            >
              关闭
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
