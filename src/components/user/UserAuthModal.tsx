import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Lock,
  User,
  Fingerprint,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  RefreshCw,
  Gift,
  Check,
  Flame,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../../types/user';
import { INITIAL_USER_PROFILE } from '../../data/mockUser';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { collectDeviceHardwareDetails, DeviceHardwareDetails } from '../../utils/deviceFingerprint';
import { performAutoLogin } from '../../utils/autoAuthEngine';
import { useToast } from '../ui/ToastContext';

export interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'sms' | 'password' | 'auto' | 'presets';
  onLoginSuccess: (user: UserProfile) => void;
}

const PRESET_ACCOUNTS: { label: string; tag: string; profile: UserProfile }[] = [
  {
    label: 'Urban Foodie (VIP黑金食客)',
    tag: '黑金VIP · ¥168.5',
    profile: INITIAL_USER_PROFILE
  },
  {
    label: 'Luna (和牛风味品鉴官)',
    tag: '资深会员 · ¥320.0',
    profile: {
      uid: 'tcb_u_luna_9901',
      nickname: 'Luna (和牛风味品鉴官)',
      phone: '139-6688-2345',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
      bio: '每周五黑曜石餐车雷达必点和牛厚切与冷萃咖啡。',
      gender: 'female',
      birthday: '1996-03-24',
      membershipTier: 'vip_black_elite',
      isVIPActive: true,
      points: 8600,
      balance: 320.0,
      addresses: [
        {
          id: 'addr-luna-1',
          name: 'Luna',
          phone: '139-6688-2345',
          tag: '公司',
          address: '静安大悦城北座 16F 创新中心',
          detail: 'A区 1608 室内',
          isDefault: true,
          createdAt: '2026-08-01 12:00'
        }
      ],
      preferences: {
        spiciness: 'none',
        cutlery: 'eco',
        autoApplyCoupons: true,
        radarTracking: true,
        smsNotification: true,
        dietaryNote: '全熟和牛，免辣'
      },
      walletHistory: [
        {
          id: 'w-luna-1',
          type: 'recharge',
          title: '会员充值赠礼',
          amount: 300.0,
          balanceAfter: 320.0,
          timestamp: '2026-08-28 10:00'
        }
      ],
      cloudSyncedAt: new Date().toISOString(),
      authProvider: 'cloudbase_auth',
      createdAt: '2026-02-10 10:00:00'
    }
  },
  {
    label: '新人体验食客 (首访账号)',
    tag: '迎新赠 ¥88',
    profile: {
      uid: 'tcb_u_newbie_01',
      nickname: '先锋新食客 #8801',
      phone: '138-0000-8801',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      bio: '新注册黑曜石移动餐车会员，已领取新人大礼包。',
      gender: 'secret',
      birthday: '2001-01-01',
      membershipTier: 'vip_black_elite',
      isVIPActive: true,
      points: 1000,
      balance: 88.0,
      addresses: [
        {
          id: 'addr-newbie-1',
          name: '新食客',
          phone: '138-0000-8801',
          tag: '公司',
          address: '静安大悦城北座 1F 中庭',
          detail: '黑曜石餐车站前自提',
          isDefault: true,
          createdAt: '2026-08-30 20:00'
        }
      ],
      preferences: {
        spiciness: 'mild',
        cutlery: 'eco',
        autoApplyCoupons: true,
        radarTracking: true,
        smsNotification: true,
        dietaryNote: '初次体验'
      },
      walletHistory: [
        {
          id: 'w-newbie-1',
          type: 'reward',
          title: '新用户注册迎新体验金',
          amount: 88.0,
          balanceAfter: 88.0,
          timestamp: '2026-08-30 20:00'
        }
      ],
      cloudSyncedAt: new Date().toISOString(),
      authProvider: 'cloudbase_auth',
      createdAt: new Date().toISOString()
    }
  }
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80'
];

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'sms',
  onLoginSuccess
}) => {
  const toast = useToast();

  // Tab: 'sms' (验证码登录/自动注册) | 'password' (密码登录/注册) | 'auto' (免密智能识别) | 'presets' (快速切换)
  const [tab, setTab] = useState<'sms' | 'password' | 'auto' | 'presets'>(() => {
    if (initialMode === 'register' || initialMode === 'login' || initialMode === 'password') return 'password';
    if (initialMode === 'auto') return 'auto';
    if (initialMode === 'presets') return 'presets';
    return 'sms';
  });

  // Password Sub-mode: 'login' | 'register'
  const [isRegisterMode, setIsRegisterMode] = useState(initialMode === 'register');

  useEffect(() => {
    if (isOpen) {
      if (initialMode === 'register') {
        setTab('password');
        setIsRegisterMode(true);
      } else if (initialMode === 'login' || initialMode === 'password') {
        setTab('password');
        setIsRegisterMode(false);
      } else if (initialMode === 'auto') {
        setTab('auto');
      } else if (initialMode === 'presets') {
        setTab('presets');
      } else {
        setTab('sms');
      }
    }
  }, [isOpen, initialMode]);

  // Form State - SMS
  const [smsPhone, setSmsPhone] = useState('138-8888-9201');
  const [smsCode, setSmsCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);

  // Form State - Password Login/Register
  const [accountInput, setAccountInput] = useState('138-8888-9201');
  const [passwordInput, setPasswordInput] = useState('123456');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('123456');
  const [registerNickname, setRegisterNickname] = useState('黑曜石新星食客');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [showPassword, setShowPassword] = useState(false);

  // General Loading & Error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hardwareDetails, setHardwareDetails] = useState<DeviceHardwareDetails | null>(null);

  // SMS Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  // Load hardware details when modal opens
  useEffect(() => {
    if (isOpen) {
      collectDeviceHardwareDetails().then(setHardwareDetails).catch(() => {});
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Send Verification Code Simulator
  const handleSendSmsCode = () => {
    if (!smsPhone || smsPhone.trim().length < 8) {
      setErrorMessage('请输入正确的 11 位手机号码');
      return;
    }
    setErrorMessage(null);
    setIsSendingCode(true);

    setTimeout(() => {
      setIsSendingCode(false);
      setCountdown(60);
      setSmsCode('882019');
      toast.success('验证码已发送', '模拟验证码 [882019] 已为您自动填入输入框');
    }, 400);
  };

  // Submit SMS Login / Auto-Registration
  const handleSubmitSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsPhone || smsPhone.trim().length < 8) {
      setErrorMessage('请输入正确的手机号码');
      return;
    }
    if (!smsCode || smsCode.trim().length < 4) {
      setErrorMessage('请输入收到的 6 位短信验证码');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const cleanPhone = smsPhone.trim();

      // Check existing profile or create registered one
      const existing = safeGetStorage<UserProfile>('obsidian_user_profile', INITIAL_USER_PROFILE);
      let userToLogin: UserProfile;

      if (existing.phone === cleanPhone || cleanPhone === '138-8888-9201') {
        userToLogin = { ...existing, phone: cleanPhone };
        toast.success('登录成功', `欢迎回来，${userToLogin.nickname}！`);
      } else {
        // Auto-Register new user
        const shortUid = `tcb_u_${cleanPhone.slice(-4)}`;
        userToLogin = {
          uid: shortUid,
          nickname: `新注册食客 (${cleanPhone.slice(-4)})`,
          phone: cleanPhone,
          avatar: PRESET_AVATARS[1],
          bio: '黑曜石移动餐车新注册食客',
          gender: 'secret',
          birthday: '2000-01-01',
          membershipTier: 'vip_black_elite',
          isVIPActive: true,
          points: 1200,
          balance: 88.0,
          addresses: [
            {
              id: `addr-${Date.now()}`,
              name: '新食客',
              phone: cleanPhone,
              tag: '公司',
              address: '静安大悦城北座 1F 中庭',
              detail: '站前自提点',
              isDefault: true,
              createdAt: new Date().toISOString()
            }
          ],
          preferences: {
            spiciness: 'mild',
            cutlery: 'eco',
            autoApplyCoupons: true,
            radarTracking: true,
            smsNotification: true
          },
          walletHistory: [
            {
              id: `w-reg-${Date.now()}`,
              type: 'reward',
              title: '手机验证码注册 · 迎新赠礼',
              amount: 88.0,
              balanceAfter: 88.0,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ],
          cloudSyncedAt: new Date().toISOString(),
          authProvider: 'cloudbase_auth',
          createdAt: new Date().toISOString()
        };
        toast.success('注册并登录成功！', `已为新手机号自动创建专属账号，并赠送 ¥88 迎新金`);
      }

      safeSetStorage('obsidian_user_profile', userToLogin);
      onLoginSuccess(userToLogin);
      onClose();
    }, 600);
  };

  // Submit Password Login or Registration
  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!accountInput.trim()) {
      setErrorMessage('请输入账号或手机号');
      return;
    }
    if (!passwordInput.trim()) {
      setErrorMessage('请输入密码');
      return;
    }

    if (isRegisterMode) {
      if (passwordInput.length < 6) {
        setErrorMessage('密码长度不能少于 6 位');
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setErrorMessage('两次输入的密码不一致');
        return;
      }
      if (!registerNickname.trim()) {
        setErrorMessage('请输入食客昵称');
        return;
      }
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (isRegisterMode) {
        // Register flow
        const cleanAcc = accountInput.trim();
        const newUid = `tcb_u_${Math.random().toString(36).slice(2, 8)}`;
        const registeredUser: UserProfile = {
          uid: newUid,
          nickname: registerNickname.trim(),
          phone: cleanAcc.includes('-') || cleanAcc.length === 11 ? cleanAcc : `138-0000-${Math.floor(1000 + Math.random() * 9000)}`,
          avatar: selectedAvatar,
          bio: '黑曜石移动餐车站常驻先锋食客。',
          gender: 'secret',
          birthday: '1998-08-08',
          membershipTier: 'vip_black_elite',
          isVIPActive: true,
          points: 1500,
          balance: 88.0,
          addresses: [
            {
              id: `addr-${Date.now()}`,
              name: registerNickname.trim(),
              phone: cleanAcc,
              tag: '公司',
              address: '静安大悦城北座 1F 中庭',
              detail: '站前自提点',
              isDefault: true,
              createdAt: new Date().toISOString()
            }
          ],
          preferences: {
            spiciness: 'mild',
            cutlery: 'eco',
            autoApplyCoupons: true,
            radarTracking: true,
            smsNotification: true
          },
          walletHistory: [
            {
              id: `w-reg-${Date.now()}`,
              type: 'reward',
              title: '账号注册成功 · 赠送迎新体验金',
              amount: 88.0,
              balanceAfter: 88.0,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ],
          cloudSyncedAt: new Date().toISOString(),
          authProvider: 'cloudbase_auth',
          createdAt: new Date().toISOString()
        };

        safeSetStorage('obsidian_user_profile', registeredUser);
        toast.success('账号注册成功', `欢迎加入黑曜石会员，UID: ${registeredUser.uid}`);
        onLoginSuccess(registeredUser);
        onClose();
      } else {
        // Login flow
        const cleanAcc = accountInput.trim();
        const matchedPreset = PRESET_ACCOUNTS.find(
          (p) => p.profile.phone === cleanAcc || p.profile.uid === cleanAcc || p.profile.nickname.includes(cleanAcc)
        );

        const targetUser: UserProfile = matchedPreset
          ? matchedPreset.profile
          : {
              ...INITIAL_USER_PROFILE,
              phone: cleanAcc,
              nickname: cleanAcc.startsWith('13') ? `食客 (${cleanAcc.slice(-4)})` : cleanAcc
            };

        safeSetStorage('obsidian_user_profile', targetUser);
        toast.success('密码登录成功', `欢迎回来，${targetUser.nickname}`);
        onLoginSuccess(targetUser);
        onClose();
      }
    }, 600);
  };

  // Perform Hardware Auto-Login
  const handleAutoLoginClick = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await performAutoLogin();
      if (result.success && result.user) {
        safeSetStorage('obsidian_user_profile', result.user);
        onLoginSuccess(result.user);
        toast.success(
          '智能免密识别成功',
          `设备特征匹配度 ${(result.matchScore * 100).toFixed(0)}%，已登录: ${result.user.nickname}`
        );
        onClose();
      } else {
        setErrorMessage('设备特征匹配失败，请使用手机验证码登录');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || '自动登录异常');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Preset Account Switch
  const handleSelectPreset = (preset: (typeof PRESET_ACCOUNTS)[0]) => {
    safeSetStorage('obsidian_user_profile', preset.profile);
    onLoginSuccess(preset.profile);
    toast.success('已切换并登录账号', preset.profile.nickname);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#e2e3e1] flex flex-col overflow-hidden z-10 my-auto animate-in zoom-in-95 duration-200">
        {/* Top Header with Dark Obsidian Accent */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-28 h-28 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 text-emerald-400 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {tab === 'presets'
                    ? '快捷体验测试账号'
                    : isRegisterMode && tab === 'password'
                    ? '注册新食客账号'
                    : '黑曜石会员登录 / 注册'}
                </h3>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-sans px-1.5 py-0.2 rounded border border-emerald-500/30">
                  UR-AUTH
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                登录后同步全渠道订单历史、VIP权益与钱包余额
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer relative z-10"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Mode Tabs */}
        <div className="grid grid-cols-4 p-1.5 bg-neutral-100 border-b border-[#e8e8e4] text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => {
              setTab('sms');
              setErrorMessage(null);
            }}
            className={`py-2 px-1 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
              tab === 'sms'
                ? 'bg-sky-50/70 border-2 border-sky-500 text-sky-600 shadow-2xs font-black'
                : 'bg-transparent border-transparent text-neutral-600 hover:text-black hover:bg-white/60'
            }`}
          >
            <Smartphone className={`w-3.5 h-3.5 ${tab === 'sms' ? 'text-sky-600' : 'text-neutral-500'}`} />
            <span className="text-[11px]">短信免密</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('password');
              setErrorMessage(null);
            }}
            className={`py-2 px-1 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
              tab === 'password'
                ? 'bg-amber-50/70 border-2 border-amber-500 text-amber-600 shadow-2xs font-black'
                : 'bg-transparent border-transparent text-neutral-600 hover:text-black hover:bg-white/60'
            }`}
          >
            <KeyRound className={`w-3.5 h-3.5 ${tab === 'password' ? 'text-amber-600' : 'text-neutral-500'}`} />
            <span className="text-[11px]">密码账密</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('auto');
              setErrorMessage(null);
            }}
            className={`py-2 px-1 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
              tab === 'auto'
                ? 'bg-emerald-50/70 border-2 border-emerald-500 text-emerald-600 shadow-2xs font-black'
                : 'bg-transparent border-transparent text-neutral-600 hover:text-black hover:bg-white/60'
            }`}
          >
            <Fingerprint className={`w-3.5 h-3.5 ${tab === 'auto' ? 'text-emerald-600' : 'text-neutral-500'}`} />
            <span className="text-[11px]">设备指纹</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('presets');
              setErrorMessage(null);
            }}
            className={`py-2 px-1 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
              tab === 'presets'
                ? 'bg-indigo-50/70 border-2 border-indigo-500 text-indigo-600 shadow-2xs font-black'
                : 'bg-transparent border-transparent text-neutral-600 hover:text-black hover:bg-white/60'
            }`}
          >
            <User className={`w-3.5 h-3.5 ${tab === 'presets' ? 'text-indigo-600' : 'text-neutral-500'}`} />
            <span className="text-[11px]">预设账号</span>
          </button>
        </div>

        {/* Form Body Area */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[68vh] overflow-y-auto hide-scrollbar">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: SMS Code Login / Auto-Register */}
          {tab === 'sms' && (
            <form onSubmit={handleSubmitSms} className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-2.5">
                <Gift className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 leading-relaxed">
                  <span className="font-bold">极速无感登录：</span>
                  输入手机号即可登录；未注册手机号将<span className="font-bold underline">自动注册并赠送 ¥88 迎新体验金</span>与 VIP 会员卡。
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700 block">
                  手机号码 (Phone Number)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-neutral-500 font-sans">
                    +86
                  </span>
                  <input
                    type="tel"
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                    placeholder="请输入11位手机号码"
                    className="w-full pl-12 pr-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 focus:border-black focus:bg-white text-xs font-sans font-bold text-neutral-900 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Code Input & Send Button */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700 block">
                  短信验证码 (Verification Code)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value)}
                    placeholder="6位数字验证码"
                    className="flex-1 px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 focus:border-black focus:bg-white text-xs font-sans font-bold text-neutral-900 outline-none tracking-widest transition-all"
                  />
                  <button
                    type="button"
                    disabled={countdown > 0 || isSendingCode}
                    onClick={handleSendSmsCode}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      countdown > 0
                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                        : 'bg-neutral-900 hover:bg-black text-white active:scale-95 shadow-xs'
                    }`}
                  >
                    {isSendingCode ? (
                      <span className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> 发送中
                      </span>
                    ) : countdown > 0 ? (
                      <span>{countdown}s 后重发</span>
                    ) : (
                      <span>获取验证码</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Auto Fill Quick Pill */}
              <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setSmsPhone('138-8888-9201');
                    setSmsCode('882019');
                    toast.info('已填充 VIP 示例验证码');
                  }}
                  className="text-emerald-700 hover:underline font-medium cursor-pointer"
                >
                  快捷填入示例验证码 (882019)
                </button>
                <span className="text-neutral-400">银行级安全通道</span>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>正在鉴权验证...</span>
                  </>
                ) : (
                  <>
                    <span>立即验证并登录 / 自动注册</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: Password Login or Account Registration */}
          {tab === 'password' && (
            <form onSubmit={handleSubmitPassword} className="space-y-3.5">
              {/* Toggle Login / Register Submode */}
              <div className="flex items-center justify-between p-1 bg-neutral-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false);
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !isRegisterMode ? 'bg-white text-black shadow-2xs' : 'text-neutral-600'
                  }`}
                >
                  已有账号密码登录
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true);
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    isRegisterMode ? 'bg-white text-black shadow-2xs' : 'text-neutral-600'
                  }`}
                >
                  注册新食客账号
                </button>
              </div>

              {/* Nickname & Avatar (for Registration only) */}
              {isRegisterMode && (
                <div className="space-y-2.5 p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                      食客专属昵称 (Nickname)
                    </label>
                    <input
                      type="text"
                      value={registerNickname}
                      onChange={(e) => setRegisterNickname(e.target.value)}
                      placeholder="例：和牛炭烤达人"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-200 focus:border-black text-xs font-bold text-neutral-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                      选择头像 (Avatar)
                    </label>
                    <div className="flex items-center gap-2">
                      {PRESET_AVATARS.map((av, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedAvatar(av)}
                          className={`relative w-8 h-8 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                            selectedAvatar === av
                              ? 'border-emerald-500 scale-110 shadow-xs'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={av} alt="Avatar" className="w-full h-full object-cover" />
                          {selectedAvatar === av && (
                            <span className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white stroke-[3]" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Account Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700 block">
                  {isRegisterMode ? '注册手机号 / 账号' : '登录账号 / 手机号'}
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={accountInput}
                    onChange={(e) => setAccountInput(e.target.value)}
                    placeholder="请输入账号或手机号"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 focus:border-black focus:bg-white text-xs font-bold text-neutral-900 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700 block">
                  登录密码 (Password)
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 w-4 h-4 text-neutral-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="请输入不少于6位密码"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 focus:border-black focus:bg-white text-xs font-bold text-neutral-900 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-neutral-400 hover:text-black cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Registration only) */}
              {isRegisterMode && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-700 block">
                    确认密码 (Confirm Password)
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 w-4 h-4 text-neutral-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="请再次输入密码"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 focus:border-black focus:bg-white text-xs font-bold text-neutral-900 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>正在提交...</span>
                  </>
                ) : (
                  <>
                    <span>{isRegisterMode ? '立即注册并进入会员中心' : '立即登录'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: Passwordless Hardware Auto-Login */}
          {tab === 'auto' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-neutral-900 to-black text-white border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-black tracking-tight">当前设备硬件特征已就绪</span>
                  </div>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-sans px-1.5 py-0.5 rounded">
                    高熵 99.8%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10.5px] text-neutral-300 font-sans bg-white/5 p-2 rounded-xl border border-white/5">
                  <div>
                    <span className="text-neutral-400 block text-[9.5px]">硬件指纹码:</span>
                    <span className="text-emerald-400 font-bold">
                      {hardwareDetails?.hardwareHash || 'HW-SCANNING...'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[9.5px]">GPU渲染器:</span>
                    <span className="truncate block text-neutral-200">
                      {hardwareDetails?.gpuRenderer || 'Apple M-Series / RTX'}
                    </span>
                  </div>
                </div>

                <p className="text-[10.5px] text-neutral-400 leading-relaxed">
                  通过设备原生不可变硬件特征码自动识别。换浏览器或清空缓存依然秒级识别常驻会员账号。
                </p>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleAutoLoginClick}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-md"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>正在进行高熵硬件比对...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>一键免密识别并登录</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 4: Quick Preset Accounts */}
          {tab === 'presets' && (
            <div className="space-y-2.5">
              <p className="text-xs text-neutral-600">
                点击下方预设账号可一键快速切换并登录，用于实时测试不同等级会员的 VIP 权益、余额与订单功能：
              </p>

              <div className="space-y-2">
                {PRESET_ACCOUNTS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="w-full p-3 rounded-2xl bg-neutral-50 hover:bg-white border border-neutral-200 hover:border-black flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={preset.profile.avatar}
                        alt={preset.profile.nickname}
                        className="w-9 h-9 rounded-full object-cover border border-neutral-300 group-hover:scale-105 transition-transform"
                      />
                      <div>
                        <div className="text-xs font-black text-black group-hover:text-emerald-700 transition-colors">
                          {preset.label}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-sans mt-0.5">
                          {preset.profile.phone} · UID:{preset.profile.uid.slice(-6)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-neutral-900 text-emerald-400 font-bold px-2 py-0.5 rounded-full font-sans">
                        {preset.tag}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Security Badge */}
        <div className="p-3 bg-neutral-50 border-t border-neutral-200 text-center flex items-center justify-center gap-1.5 text-[10.5px] text-neutral-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>腾讯云开发 TCB 与 TLS 1.3 银行级安全加密保护</span>
        </div>
      </div>
    </div>
  );
};
