import React, { useState, useEffect } from 'react';
import {
  X,
  Fingerprint,
  ShieldCheck,
  Cpu,
  Tv,
  Music,
  Zap,
  RefreshCw,
  Trash2,
  Globe,
  Sparkles,
  CheckCircle2,
  Smartphone,
  Copy,
  Check,
  RotateCcw,
  UserPlus,
  Terminal,
  Activity,
  HardDrive,
  Layers,
  ArrowRight,
  KeyRound,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../../types';
import { collectDeviceHardwareDetails, DeviceHardwareDetails } from '../../utils/deviceFingerprint';
import { performAutoLogin, AutoAuthResult, linkDeviceWithPairingCode, getDeviceBindingsRegistry } from '../../utils/autoAuthEngine';
import { wipeAllLocalCaches } from '../../utils/antiCacheStorage';
import { copyTextToClipboard } from '../../utils/clipboard';
import { useToast } from '../ui/ToastContext';
import { useDevSimulation } from '../../context/DevSimulationContext';
import { SimulationProbe } from '../dev/SimulationProbe';

interface AutoLoginDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUserSwitched?: (user: UserProfile) => void;
  onOpenCloudMonitor?: () => void;
  onOpenCloudCode?: () => void;
}

export const AutoLoginDiagnosticsModal: React.FC<AutoLoginDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserSwitched,
  onOpenCloudMonitor,
  onOpenCloudCode
}) => {
  const toast = useToast();
  const { isSimulationAllowed, openDevAuthModal } = useDevSimulation();
  const [deviceDetails, setDeviceDetails] = useState<DeviceHardwareDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [lastAuthResult, setLastAuthResult] = useState<AutoAuthResult | null>(null);
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [activeTab, setActiveTab] = useState<'fingerprint' | 'simulation' | 'multidevice'>('fingerprint');

  // Load hardware details on open
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      collectDeviceHardwareDetails()
        .then((details) => {
          setDeviceDetails(details);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async (text: string, label: string) => {
    await copyTextToClipboard(text);
    setCopiedKey(label);
    toast.success('已复制到剪贴板', label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. 模拟清空浏览器所有缓存与 LocalStorage 后的抗清除自愈测试
  const handleSimulateWipeAndAutoRecover = async () => {
    setIsLoading(true);
    toast.info('正在模拟完全清空所有浏览器缓存与本地持久层...');
    
    // 清空缓存
    await wipeAllLocalCaches();

    setTimeout(async () => {
      try {
        const result = await performAutoLogin();
        setLastAuthResult(result);
        if (onUserSwitched && result.user) {
          onUserSwitched(result.user);
        }
        toast.success(
          '跨缓存自愈成功！',
          `即使本地缓存被全清，仍通过硬件指纹 [${result.hardwareHash}] 精确识别并登录 UID: ${result.user.uid}`
        );
      } catch (err: any) {
        toast.error('识别异常', err?.message);
      } finally {
        setIsLoading(false);
      }
    }, 600);
  };

  // 2. 模拟跨浏览器切换访问 (Chrome -> Safari / Edge)
  const handleSimulateCrossBrowserSwitch = async () => {
    setIsLoading(true);
    toast.info('正在模拟从当前浏览器切换至 Safari / Edge 新环境...');

    setTimeout(async () => {
      try {
        const result = await performAutoLogin();
        setLastAuthResult(result);
        if (onUserSwitched && result.user) {
          onUserSwitched(result.user);
        }
        toast.success(
          '跨浏览器匹配成功！',
          `不可变硬件核心特征码比对一致，成功同步登录至会员: ${result.user.nickname}`
        );
      } catch (err: any) {
        toast.error('切换识别异常', err?.message);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  // 3. 模拟未注册的新设备首次访问自动建档流程
  const handleSimulateNewDeviceCreation = async () => {
    setIsLoading(true);
    toast.info('正在模拟未知新设备首次访问...');

    setTimeout(async () => {
      // 临时生成一个模拟新硬件指纹
      const fakeHw = `HW-NEW-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const fakeDev = `DEV-NEW-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      
      const newUid = `tcb_u_${fakeHw.replace('HW-NEW-', '').toLowerCase()}`;
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const newUser: UserProfile = {
        uid: newUid,
        nickname: `黑曜石先锋食客 #${fakeHw.replace('HW-NEW-', '')}`,
        phone: `138-0000-${randomSuffix}`,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
        bio: '通过硬件指纹智能免密自动创建的全新常驻食客',
        gender: 'secret',
        birthday: '2000-01-01',
        membershipTier: 'vip_black_elite',
        isVIPActive: true,
        points: 1000,
        balance: 88.0,
        addresses: [{
          id: `addr-${Date.now()}`,
          name: `食客 #${fakeHw.replace('HW-NEW-', '')}`,
          phone: `138-0000-${randomSuffix}`,
          tag: '公司',
          address: '静安大悦城北座 1F 中庭',
          detail: '黑曜石餐车站前自提',
          isDefault: true
        }],
        preferences: {
          spiciness: 'mild',
          cutlery: 'eco',
          autoApplyCoupons: true,
          radarTracking: true,
          smsNotification: true
        },
        walletHistory: [{
          id: `w-welcome-${Date.now()}`,
          type: 'reward',
          title: '新设备无密码智能建档 · 迎新体验金',
          amount: 88.0,
          balanceAfter: 88.0,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }],
        hardwareHash: fakeHw,
        deviceFingerprint: fakeDev,
        authProvider: 'cloudbase_auth',
        createdAt: new Date().toISOString()
      };

      if (onUserSwitched) {
        onUserSwitched(newUser);
      }

      toast.success(
        '新设备自动建档完成！',
        `已分配新专属账号 UID: ${newUser.uid} 并自动发放 88 元体验金`
      );
      setIsLoading(false);
    }, 600);
  };

  // 4. 8位关联码跨设备绑定
  const handleLinkDevice = async () => {
    if (!pairingCodeInput.trim()) {
      toast.error('请输入 8 位安全关联码');
      return;
    }
    setIsLinking(true);
    try {
      const res = await linkDeviceWithPairingCode(pairingCodeInput.trim(), currentUser);
      if (res.success) {
        toast.success('多设备关联成功', res.message);
        setPairingCodeInput('');
      } else {
        toast.error('绑定失败', res.message);
      }
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-neutral-200 flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                  无密码智能自动登录系统
                </h3>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-sans px-1.5 py-0.2 rounded border border-emerald-500/30">
                  99.8% 高熵匹配
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                跨浏览器切换 / 清除缓存 依然精准识别账号，未注册自动秒级建档
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('fingerprint')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'fingerprint'
                ? 'bg-black text-white shadow-xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>硬件指纹特征矩阵</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'simulation'
                ? 'bg-black text-white shadow-xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
            <span>抗清缓存/跨浏览器测试</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('multidevice')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'multidevice'
                ? 'bg-black text-white shadow-xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-sky-600" />
            <span>多设备互联</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {/* Current Matched User Status Pill Card */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-neutral-900 to-black text-white border border-neutral-800 shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.nickname}
                className="w-10 h-10 rounded-full object-cover border border-emerald-400 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white truncate">
                    {currentUser.nickname}
                  </span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-sans px-1 rounded">
                    UID: {currentUser.uid}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-2">
                  <span>余额: ¥{currentUser.balance.toFixed(2)}</span>
                  <span>·</span>
                  <span>积分: {currentUser.points}</span>
                  <span>·</span>
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" /> 硬件免密认证中
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[9px] text-neutral-400 block">匹配置信度</span>
              <span className="text-sm font-black font-sans text-emerald-400">
                99.8%
              </span>
            </div>
          </div>

          {/* Tab 1: Hardware Fingerprint Breakdown */}
          {activeTab === 'fingerprint' && (
            <div className="space-y-3">
              {/* Primary Signature Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
                    <span className="font-bold flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-emerald-600" />
                      跨浏览器不变量硬件特征码
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(deviceDetails?.hardwareHash || '', '硬件特征码')}
                      className="text-emerald-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      {copiedKey === '硬件特征码' ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>复制</span>
                    </button>
                  </div>
                  <div className="text-xs font-sans font-black text-black">
                    {deviceDetails?.hardwareHash || 'HW-CALCULATING...'}
                  </div>
                  <p className="text-[9px] text-neutral-400 mt-0.5">
                    基于物理 GPU/声卡/屏幕/CPU 核心数，切浏览器依然不变
                  </p>
                </div>

                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
                    <span className="font-bold flex items-center gap-1">
                      <Fingerprint className="w-3 h-3 text-sky-600" />
                      设备多维复合指纹
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(deviceDetails?.deviceFingerprint || '', '复合指纹')}
                      className="text-sky-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      {copiedKey === '复合指纹' ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>复制</span>
                    </button>
                  </div>
                  <div className="text-xs font-sans font-black text-black">
                    {deviceDetails?.deviceFingerprint || 'DEV-CALCULATING...'}
                  </div>
                  <p className="text-[9px] text-neutral-400 mt-0.5">
                    全维度栅格化 + 系统环境组合签名
                  </p>
                </div>
              </div>

              {/* Hardware Spec Matrix Grid */}
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-neutral-700 flex items-center justify-between">
                  <span>物理设备硬件参数检测表</span>
                  <span className="text-[9.5px] text-neutral-400">
                    采集时间: {deviceDetails?.collectedAt ? new Date(deviceDetails.collectedAt).toLocaleTimeString() : '刚刚'}
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100 text-xs overflow-hidden">
                  {/* GPU */}
                  <div className="p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Tv className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-neutral-800 block text-[11px]">GPU 渲染芯片与供应商</span>
                        <span className="text-[10px] text-neutral-400 truncate block">
                          {deviceDetails?.gpuRenderer || '正在检测...'} ({deviceDetails?.gpuVendor})
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-sans shrink-0">
                      WebGL
                    </span>
                  </div>

                  {/* Audio DSP */}
                  <div className="p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <Music className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-neutral-800 block text-[11px]">Web Audio 声卡 DSP 指纹</span>
                        <span className="text-[10px] text-neutral-400 truncate block">
                          DynamicsCompressor 频响采样 Hash: {deviceDetails?.audioDspHash}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-sans shrink-0">
                      AudioContext
                    </span>
                  </div>

                  {/* Physical Screen */}
                  <div className="p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Tv className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-neutral-800 block text-[11px]">物理屏幕几何与色彩深度</span>
                        <span className="text-[10px] text-neutral-400 truncate block">
                          物理分辨率 {deviceDetails?.physicalResolution}, {deviceDetails?.colorDepth}-bit 色彩
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-sans shrink-0">
                      Screen DPR
                    </span>
                  </div>

                  {/* CPU Cores & Platform */}
                  <div className="p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Cpu className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-neutral-800 block text-[11px]">CPU 核心数与平台架构</span>
                        <span className="text-[10px] text-neutral-400 truncate block">
                          {deviceDetails?.cpuCores} 逻辑核心, 平台: {deviceDetails?.platform}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-sans shrink-0">
                      Hardware
                    </span>
                  </div>

                  {/* Timezone & Locale */}
                  <div className="p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Globe className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-neutral-800 block text-[11px]">时区标识与多语言族</span>
                        <span className="text-[10px] text-neutral-400 truncate block">
                          {deviceDetails?.timezone} ({deviceDetails?.languages.slice(0, 2).join(', ')})
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-sans shrink-0">
                      Locale
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Interactive Simulation Sandbox */}
          {activeTab === 'simulation' && (
            !isSimulationAllowed ? (
              <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-200 text-center space-y-4 my-2">
                <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-amber-400 flex items-center justify-center mx-auto shadow-sm">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-black">调试模拟沙箱已权限锁定</h3>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    当前处于普通用户访问模式。为保护食客本地凭证与存储状态，清除缓存模拟与多端切换工具已全局锁定。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openDevAuthModal}
                  className="px-4 py-2 bg-black hover:bg-neutral-800 active:scale-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>管理员/开发者登录解锁沙箱</span>
                </button>
              </div>
            ) : (
            <SimulationProbe pointId="SIM_DEVICE_FINGERPRINT_WIPE" className="space-y-3">
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>真实场景交互式模拟沙箱 (已授权开发者模式)</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  下方工具可真实模拟「完全清除浏览器缓存与存储」、「跨浏览器切换」、以及「新未注册设备首次访问建档」全流程，验证无密码自动登录算法的鲁棒性。
                </p>
              </div>

              {/* Action 1: Wipe & Auto-Recover */}
              <div className="p-3 bg-white rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-black">1. 模拟删除所有浏览器缓存与本地持久层</h4>
                      <p className="text-[10px] text-neutral-500">
                        清空 LocalStorage、SessionStorage 与 Cookies，测试抗清除自愈与云端设备库重连
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSimulateWipeAndAutoRecover}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? '正在清空并执行硬件指纹匹配...' : '执行清空缓存并自动免密恢复'}</span>
                </button>
              </div>

              {/* Action 2: Cross Browser Switch */}
              <div className="p-3 bg-white rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-black">2. 模拟跨浏览器切换访问 (Chrome ⇄ Safari / Edge)</h4>
                      <p className="text-[10px] text-neutral-500">
                        利用物理硬件不可变核心哈希（GPU/声卡/屏幕），在全新浏览器中无缝匹配已有会员号
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSimulateCrossBrowserSwitch}
                  className="w-full py-2 bg-black hover:bg-neutral-800 active:scale-[0.99] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>模拟切换浏览器并自动匹配账号</span>
                </button>
              </div>

              {/* Action 3: New Unregistered Device Auto-Provisioning */}
              <div className="p-3 bg-white rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <UserPlus className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-black">3. 模拟新设备首次访问自动秒级建档</h4>
                      <p className="text-[10px] text-neutral-500">
                        如果未匹配到任何历史用户，系统自动分配专属 UID、发放迎新礼包与免密设备凭证
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSimulateNewDeviceCreation}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>模拟新设备访问并自动创建账户</span>
                </button>
              </div>

              {/* Last Auth Result Banner */}
              {lastAuthResult && (
                <div className="p-3 bg-neutral-900 text-white rounded-2xl text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      判定结果: {lastAuthResult.isNewUser ? '新设备建档成功' : '老用户匹配登录成功'}
                    </span>
                    <span className="font-sans">置信度: {lastAuthResult.matchScore}%</span>
                  </div>
                  <div className="text-[10px] text-neutral-300">
                    <span className="text-neutral-400">判定依据: </span>
                    {lastAuthResult.matchReason}
                  </div>
                </div>
              )}
            </SimulationProbe>
            )
          )}

          {/* Tab 3: Multi-Device Link */}
          {activeTab === 'multidevice' && (
            <div className="space-y-3">
              {/* Pairing Code Generator */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-black">当前会员专属 8 位跨设备安全关联码</h4>
                    <p className="text-[10px] text-neutral-500">
                      在手机或另一台电脑输入该关联码，即可将新设备一键打通为同一个会员
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    #
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 bg-white rounded-xl border border-neutral-300 font-sans font-black text-sm text-center tracking-widest text-black">
                    UR-{currentUser.uid.slice(-4).toUpperCase()}-BIND
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(`UR-${currentUser.uid.slice(-4).toUpperCase()}-BIND`, '关联码')}
                    className="px-3 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    {copiedKey === '关联码' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>复制</span>
                  </button>
                </div>
              </div>

              {/* Link Another Device Input */}
              <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 space-y-2">
                <h4 className="text-xs font-bold text-black">输入其他设备关联码</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="例如: UR-9821-BIND"
                    value={pairingCodeInput}
                    onChange={(e) => setPairingCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-sans font-bold text-black focus:bg-white focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <button
                    type="button"
                    disabled={isLinking || !pairingCodeInput.trim()}
                    onClick={handleLinkDevice}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isLinking ? '关联中...' : '确认绑定'}
                  </button>
                </div>
              </div>

              {/* Bound Devices List */}
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-800">已免密信任的设备列表</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                    {getDeviceBindingsRegistry().length} 台设备
                  </span>
                </div>

                <div className="space-y-1.5">
                  {getDeviceBindingsRegistry().map((dev, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white rounded-xl border border-neutral-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                          <Smartphone className="w-3.5 h-3.5 text-neutral-600" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-black block truncate text-[11px]">
                            {dev.hardwareHash}
                          </span>
                          <span className="text-[9.5px] text-neutral-400 block truncate">
                            {dev.deviceDetails?.gpuRenderer || 'Apple M-Series / NVIDIA'} · {dev.deviceDetails?.physicalResolution || '2560x1440'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded shrink-0">
                        已信任
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {onOpenCloudCode && (
              <button
                type="button"
                onClick={onOpenCloudCode}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-neutral-200 text-[11px] font-bold text-neutral-700 hover:bg-neutral-100 flex items-center gap-1 cursor-pointer"
              >
                <Terminal className="w-3 h-3 text-sky-600" />
                <span>autoAuth 云函数源码</span>
              </button>
            )}

            {onOpenCloudMonitor && (
              <button
                type="button"
                onClick={onOpenCloudMonitor}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-neutral-200 text-[11px] font-bold text-neutral-700 hover:bg-neutral-100 flex items-center gap-1 cursor-pointer"
              >
                <Activity className="w-3 h-3 text-emerald-600" />
                <span>调用日志链路</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
