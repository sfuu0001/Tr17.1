import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ShieldCheck,
  X,
  Lock,
  ArrowRight,
  Sparkles,
  Store,
  Bike,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Eye,
  EyeOff,
  Cpu,
  KeyRound,
  Zap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PRESET_MERCHANT_STAFF,
  PRESET_RIDERS,
  loginMerchantWithPhone,
  loginRiderWithPhone,
  MerchantSession,
  RiderSession,
  maskPhoneNumber
} from '../../utils/staffAndRiderAuthEngine';
import { collectDeviceHardwareDetails, DeviceHardwareDetails } from '../../utils/deviceFingerprint';
import { useToast } from '../ui/ToastContext';

export interface StaffRiderPhoneAuthModalProps {
  isOpen: boolean;
  role: 'merchant' | 'rider';
  onClose: () => void;
  onSuccess: (session: MerchantSession | RiderSession) => void;
}

export const StaffRiderPhoneAuthModal: React.FC<StaffRiderPhoneAuthModalProps> = ({
  isOpen,
  role,
  onClose,
  onSuccess
}) => {
  const toast = useToast();

  const isMerchant = role === 'merchant';
  const roleName = isMerchant ? '商家端' : '骑手端';
  const roleTitle = isMerchant ? 'POS 商家工作台' : '骑士专送工作台';

  const [authMode, setAuthMode] = useState<'sms' | 'pwd' | 'presets'>('sms');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showFingerprintDetails, setShowFingerprintDetails] = useState(false);
  const [deviceDetails, setDeviceDetails] = useState<DeviceHardwareDetails | null>(null);

  // Initialize hardware fingerprint on open
  useEffect(() => {
    if (isOpen) {
      collectDeviceHardwareDetails().then((details) => {
        setDeviceDetails(details);
      });
      // Default to first preset phone for easy experience
      if (!phone) {
        const defaultPhone = isMerchant
          ? PRESET_MERCHANT_STAFF[0].phone
          : PRESET_RIDERS[0].phone;
        setPhone(defaultPhone);
        setSmsCode('888888');
      }
    }
  }, [isOpen, isMerchant]);

  // Countdown timer for SMS
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen) return null;

  // Preset list based on current role
  const presetList = isMerchant ? PRESET_MERCHANT_STAFF : PRESET_RIDERS;

  const handleSendCode = () => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 11) {
      setErrorMessage('请输入正确的 11 位手机号码');
      return;
    }
    setErrorMessage('');
    const mockCode = '888888';
    setCountdown(60);
    setSmsCode(mockCode);
    toast.success(
      `【验证码已发送至 ${maskPhoneNumber(clean)}】`,
      `动态验证码: ${mockCode} (已自动为您填入)`
    );
  };

  const handleSelectPreset = (pPhone: string) => {
    setPhone(pPhone);
    setSmsCode('888888');
    setPassword('888888');
    setErrorMessage('');
    setAuthMode('sms');
    toast.info(`已选定在册账号: ${maskPhoneNumber(pPhone)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 11) {
      setErrorMessage('请输入正确的 11 位手机号码');
      return;
    }

    if (authMode === 'sms' && !smsCode.trim()) {
      setErrorMessage('请输入手机短信验证码');
      return;
    }

    if (authMode === 'pwd' && !password.trim()) {
      setErrorMessage('请输入登录密码');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      if (isMerchant) {
        const res = await loginMerchantWithPhone({
          phone: clean,
          smsCode,
          password,
          authMethod: authMode === 'sms' ? 'phone_sms' : 'phone_pwd'
        });
        setIsLoading(false);
        if (res.success && res.session) {
          toast.success('商家端手机实名登录成功', res.message);
          onSuccess(res.session);
          onClose();
        } else {
          setErrorMessage(res.message);
        }
      } else {
        const res = await loginRiderWithPhone({
          phone: clean,
          smsCode,
          password,
          authMethod: authMode === 'sms' ? 'phone_sms' : 'phone_pwd'
        });
        setIsLoading(false);
        if (res.success && res.session) {
          toast.success('骑手端手机实名登录成功', res.message);
          onSuccess(res.session);
          onClose();
        } else {
          setErrorMessage(res.message);
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || '登录失败，请重试');
    }
  };

  return (
    <div
      id="staff-rider-phone-auth-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="w-full max-w-lg bg-[#141517] text-white rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden font-sans relative flex flex-col max-h-[92vh]"
      >
        {/* Top Decorative Border Accent */}
        <div
          className={`h-1.5 w-full ${
            isMerchant
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
              : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600'
          }`}
        />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800/80 flex items-start justify-between bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                isMerchant
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {isMerchant ? <Store className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white tracking-tight">
                  {roleTitle} · 手机号实名认证
                </h2>
                <span
                  className={`text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded border ${
                    isMerchant
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {roleName}登录
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isMerchant
                  ? '进入商家后台须先完成手机号验证 · 掌管餐车POS与出餐'
                  : '接单配送须先完成手机号验证 · 掌管车辆轨迹与抢单'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="关闭认证窗口"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hardware Fingerprint Preservation Banner */}
        <div className="px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Fingerprint className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-[11.5px] leading-tight text-neutral-300 truncate">
              <span className="text-white font-medium">设备指纹状态：</span>
              <span className="text-emerald-400 tabular-nums font-bold">
                {deviceDetails?.hardwareHash || 'HW-COLLECTING...'}
              </span>
              <span className="text-neutral-400 ml-1.5 hidden sm:inline">
                (已保持绑定不变 · 物理特征无损继承)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFingerprintDetails(!showFingerprintDetails)}
            className="text-[11px] text-neutral-400 hover:text-neutral-200 underline cursor-pointer shrink-0 font-medium"
          >
            {showFingerprintDetails ? '收起指纹矩阵' : '查看指纹'}
          </button>
        </div>

        {/* Collapsible Hardware Fingerprint Details */}
        <AnimatePresence>
          {showFingerprintDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-[#0d0e10] border-b border-neutral-800 px-4 py-3 text-[11px] tabular-nums text-neutral-300 space-y-1.5"
            >
              <div className="flex justify-between border-b border-neutral-800/60 pb-1 text-neutral-400 text-[10px]">
                <span>硬件特征项 (Hardware Invariant Core)</span>
                <span className="text-emerald-400">状态: 100% 保持绑定不变</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                <div>
                  <span className="text-neutral-500">屏幕物理矩阵:</span>{' '}
                  <span className="text-neutral-200">{deviceDetails?.physicalResolution || '1920x1080 (2.0x)'}</span>
                </div>
                <div>
                  <span className="text-neutral-500">GPU 芯片与渲染器:</span>{' '}
                  <span className="text-neutral-200 truncate block">
                    {deviceDetails?.gpuRenderer || 'Apple / WebGL Metal GPU'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">声卡 DSP 散列:</span>{' '}
                  <span className="text-neutral-200">{deviceDetails?.audioDspHash || 'ad_88b1'}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Canvas 渲染哈希:</span>{' '}
                  <span className="text-neutral-200">{deviceDetails?.canvasHash || 'cv_c41e'}</span>
                </div>
              </div>
              <p className="text-[10px] text-neutral-500 italic pt-0.5">
                * 注：登录手机号将直接与此底层硬件特征码安全关联，无论切换多少次员工，设备指纹均持久保持不变。
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-neutral-900 rounded-xl border border-neutral-800 gap-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('sms');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'sms'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>短信验证码登录</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('pwd');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'pwd'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>手机密码登录</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('presets');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'presets'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>在册账号选单</span>
            </button>
          </div>

          {/* Preset Accounts Quick Picker */}
          {authMode === 'presets' ? (
            <div className="space-y-2.5">
              <div className="text-xs text-neutral-400 flex items-center justify-between">
                <span>选择已登记的{isMerchant ? '餐车在职员工' : '注册配送骑士'}手机号：</span>
                <span className="text-[11px] text-neutral-500">点击一键登录</span>
              </div>
              <div className="space-y-2">
                {presetList.map((preset) => {
                  const isCur = phone.replace(/\D/g, '') === preset.phone;
                  return (
                    <div
                      key={preset.phone}
                      onClick={() => handleSelectPreset(preset.phone)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isCur
                          ? isMerchant
                            ? 'bg-amber-500/10 border-amber-500/40 text-white'
                            : 'bg-emerald-500/10 border-emerald-500/40 text-white'
                          : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700 text-neutral-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center text-base shrink-0">
                          {preset.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white truncate">
                              {preset.name}
                            </span>
                            <span className="text-[10px] tabular-nums px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                              {'staffNo' in preset ? preset.staffNo : preset.riderNo}
                            </span>
                          </div>
                          <div className="text-xs tabular-nums text-neutral-400 mt-0.5">
                            手机号: {maskPhoneNumber(preset.phone)} · {preset.tag}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPreset(preset.phone);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          isCur
                            ? isMerchant
                              ? 'bg-amber-500 text-neutral-950 font-black'
                              : 'bg-emerald-500 text-neutral-950 font-black'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                        }`}
                      >
                        {isCur ? '已选定' : '选择此号'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Phone Input */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
                  <span>登录手机号 (必填)</span>
                  <span className="text-[11px] text-neutral-500 tabular-nums">11位大陆号码</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-neutral-400 text-xs tabular-nums font-bold select-none">
                    +86
                  </div>
                  <input
                    type="tel"
                    maxLength={11}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="请输入手机号码"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white tabular-nums placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  {phone && (
                    <button
                      type="button"
                      onClick={() => setPhone('')}
                      className="absolute right-3 text-neutral-500 hover:text-neutral-300 text-xs cursor-pointer"
                    >
                      清空
                    </button>
                  )}
                </div>
              </div>

              {/* Mode 1: SMS Code Input */}
              {authMode === 'sms' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
                    <span>短信验证码</span>
                    <button
                      type="button"
                      onClick={() => setSmsCode('888888')}
                      className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                    >
                      一键填入验证码 (888888)
                    </button>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value.trim())}
                      placeholder="6位短信验证码"
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white tabular-nums tracking-wider placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      disabled={countdown > 0}
                      onClick={handleSendCode}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                        countdown > 0
                          ? 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                          : isMerchant
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {countdown > 0 ? `${countdown}s 后重新发送` : '获取验证码'}
                    </button>
                  </div>
                </div>
              )}

              {/* Mode 2: Password Input */}
              {authMode === 'pwd' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
                    <span>账号密码</span>
                    <span className="text-[11px] text-neutral-500">预设密码: 888888</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入登录密码"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 pr-10 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-neutral-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-xl font-bold text-sm text-neutral-950 flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all ${
                  isMerchant
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400'
                    : 'bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400'
                } ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>正在核验手机号与绑定硬件特征...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      手机号验证并进入{roleName}工作台
                    </span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Security and Fingerprint Invariance Note Footer */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800/80 text-[11px] text-neutral-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>手机号实名鉴权 · 设备硬件指纹信息持续不变</span>
          </div>
          <span className="text-[10px] text-neutral-500 tabular-nums">Urban Radar Auth v3.2</span>
        </div>
      </motion.div>
    </div>
  );
};
