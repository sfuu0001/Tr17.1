import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  UserCheck,
  X,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Terminal,
  Cpu
} from 'lucide-react';
import { useDevSimulation, DESIGNATED_ADMIN_ACCOUNTS, DESIGNATED_ADMIN_PASSWORD } from '../../context/DevSimulationContext';
import { useToast } from '../ui/ToastContext';

export const DevAuthModal: React.FC = () => {
  const { isDevAuthModalOpen, closeDevAuthModal, loginAdmin } = useDevSimulation();
  const toast = useToast();

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isDevAuthModalOpen) return null;

  const handleFillPreset = () => {
    setAccount('admin');
    setPassword(DESIGNATED_ADMIN_PASSWORD);
    setErrorMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    setTimeout(() => {
      const res = loginAdmin(account, password);
      setIsSubmitting(false);

      if (res.success) {
        toast.info(res.message);
      } else {
        setErrorMessage(res.message);
      }
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        className="w-full max-w-md bg-[#121314] text-white rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden font-sans relative"
      >
        {/* Top Glow Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-500" />

        {/* Header */}
        <div className="p-5 pb-4 border-b border-neutral-800/80 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">
                  开发者与管理员调试认证
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DEV-MODE
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                前端状态机模拟 · 弱网实验 · 模拟点位排查
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDevAuthModal}
            className="w-7 h-7 rounded-full bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Safety Boundary Notice */}
        <div className="px-5 py-3 bg-neutral-900/60 border-b border-neutral-800/60 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11.5px] leading-relaxed text-neutral-300">
            <strong className="text-amber-300">安全沙盒隔离：</strong>
            未登录指定管理员时，客户端全站彻底锁定并隐藏所有仿真组件与流转调试器，确保普通食客体验完全纯净。
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Account */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-300 flex items-center justify-between">
              <span>管理员开发者账号</span>
              <span className="text-[10px] text-neutral-500 font-mono">admin / dev@obsidian.com</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <UserCheck className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="请输入管理员账号 (如 admin)"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700/80 text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-300 flex items-center justify-between">
              <span>开发者凭证密码</span>
              <span className="text-[10px] text-neutral-500 font-mono">默认密钥: admin888</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入开发者管理员密码"
                required
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700/80 text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Preset Filling */}
          <div className="pt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={handleFillPreset}
              className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium underline underline-offset-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>一键填入管理员演示账号密码</span>
            </button>
            <span className="text-[10px] text-neutral-500 font-mono">快捷键 Ctrl+Shift+D</span>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={closeDevAuthModal}
              className="flex-1 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-xs font-black text-black tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '正在核验凭证...' : '验证并解锁调试'}</span>
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="p-3 bg-neutral-950/80 border-t border-neutral-800/60 text-center text-[10.5px] text-neutral-500">
          黑曜石流动餐车站台 · 前端客户端安全调试控制中枢 v2.6.4
        </div>
      </motion.div>
    </div>
  );
};
