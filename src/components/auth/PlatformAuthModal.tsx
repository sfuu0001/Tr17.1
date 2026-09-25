import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  X,
  Check,
  AlertCircle,
  Building2,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import {
  loginPlatformOperator,
  PRESET_PLATFORM_ACCOUNTS,
  PresetPlatformAccount,
  PlatformSession
} from '../../utils/platformAuthEngine';

interface PlatformAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: PlatformSession) => void;
  showToast: (msg: string) => void;
}

export const PlatformAuthModal: React.FC<PlatformAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  showToast
}) => {
  const [selectedAccount, setSelectedAccount] = useState<PresetPlatformAccount>(PRESET_PLATFORM_ACCOUNTS[0]);
  const [inputAccount, setInputAccount] = useState<string>(PRESET_PLATFORM_ACCOUNTS[0].account);
  const [inputPin, setInputPin] = useState<string>(PRESET_PLATFORM_ACCOUNTS[0].pin);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSelectPreset = (preset: PresetPlatformAccount) => {
    setSelectedAccount(preset);
    setInputAccount(preset.account);
    setInputPin(preset.pin);
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    setTimeout(() => {
      const res = loginPlatformOperator(inputAccount, inputPin);
      setIsSubmitting(false);

      if (res.success && res.session) {
        showToast(res.message);
        onSuccess(res.session);
      } else {
        setErrorMsg(res.message);
      }
    }, 250);
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
          className="bg-white rounded-2xl border border-neutral-300 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header Banner */}
          <div className="bg-[#1a1a17] text-white p-4 sm:p-5 flex items-start justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-400/40 text-[10px] tabular-nums text-indigo-200 mb-2">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                <span>LEVEL-4 SUPERVISION SECURITY GATE</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                平台总控中心 · 专员安全准入门禁
              </h2>
              <p className="text-xs text-neutral-300 mt-1 max-w-md">
                平台端涉及全域流动餐车站抽佣比例、跨店资金结算、争议仲裁与网格监控，须验证平台专员凭证。
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors relative z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
            {/* Rapid Preset Selector */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-2 flex items-center justify-between">
                <span>快速体验演示专员账号 (点击填入):</span>
                <span className="text-[10px] tabular-nums text-neutral-400">3 组预设权限</span>
              </label>
              <div className="space-y-2">
                {PRESET_PLATFORM_ACCOUNTS.map((preset) => {
                  const isSelected = selectedAccount.account === preset.account;
                  return (
                    <div
                      key={preset.account}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                          : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{preset.avatar}</span>
                          <div>
                            <div className="text-xs font-bold text-[#1a1a17] flex items-center gap-1.5">
                              {preset.name}
                              <span className="text-[10px] tabular-nums font-normal px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                                {preset.roleTitle}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 mt-0.5">{preset.tag}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] tabular-nums font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                            PIN: {preset.pin}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  平台专员工号 / 邮箱
                </label>
                <input
                  type="text"
                  value={inputAccount}
                  onChange={(e) => setInputAccount(e.target.value)}
                  placeholder="如 admin@urbanradar.com"
                  className="w-full text-xs tabular-nums px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center justify-between">
                  <span>6 位安全访问 PIN 码</span>
                  <span className="text-[10px] text-neutral-400 tabular-nums">通用万能放行码: 888888</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={10}
                    value={inputPin}
                    onChange={(e) => setInputPin(e.target.value)}
                    placeholder="输入 6 位数字 PIN"
                    className="w-full text-xs tabular-nums tracking-widest px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                  <KeyRound className="w-4 h-4 text-neutral-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#1a1a17] hover:bg-neutral-800 rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isSubmitting ? '验证中...' : '核验证据并进入总控端'}</span>
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
