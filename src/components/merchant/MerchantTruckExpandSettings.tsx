import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  Zap,
  Ban,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Truck,
  Layers,
  Vibrate,
  Eye,
  RotateCcw,
  Save,
  Play,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Flame,
  Info,
  EyeOff,
  Cloud,
  RefreshCw,
  HardDriveDownload,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TruckExpandConfig,
  TruckExpandMode,
  TruckExpandTarget,
  TruckExpandScene,
  DEFAULT_TRUCK_EXPAND_CONFIG,
  getTruckExpandConfig,
  saveTruckExpandConfig,
  getStrategyDescription,
  resetUserDismissedRecord,
  normalizeTruckId
} from '../../utils/truckExpandSettings';
import {
  fetchTruckExpandConfigFromCloud,
  pushTruckExpandConfigToCloud,
  TCB_COLLECTIONS
} from '../../utils/cloudbase';
import { SandboxStorageGuard } from '../../utils/sandbox/SandboxManager';

interface MerchantTruckExpandSettingsProps {
  showToast: (msg: string) => void;
}

export const MerchantTruckExpandSettings: React.FC<MerchantTruckExpandSettingsProps> = ({ showToast }) => {
  // 当前租户 ID
  const currentTruckId = normalizeTruckId();

  // 当前配置状态（默认直接从本地坚实沙箱恢复）
  const [config, setConfig] = useState<TruckExpandConfig>(() => getTruckExpandConfig(currentTruckId));
  const [isSavedToCloud, setIsSavedToCloud] = useState<boolean>(true);

  // 云端与本地持久化诊断状态
  const [cloudSyncState, setCloudSyncState] = useState<'idle' | 'syncing' | 'synced' | 'offline_persisted' | 'fallback'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    const c = getTruckExpandConfig(currentTruckId);
    return c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString('zh-CN', { hour12: false }) : '';
  });
  const [isPushingCloud, setIsPushingCloud] = useState<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 实时动效模拟器状态
  const [simActive, setSimActive] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0);
  const [simRemainingSeconds, setSimRemainingSeconds] = useState<number>(config.delaySeconds);
  const [simExpanded, setSimExpanded] = useState<boolean>(false);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. 启动模拟器动效
  const startSimulation = useCallback((targetConfig?: TruckExpandConfig) => {
    const current = targetConfig || config;
    if (simTimerRef.current) clearTimeout(simTimerRef.current);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    setSimExpanded(false);
    setSimProgress(0);

    if (current.mode === 'disabled') {
      setSimActive(false);
      setSimRemainingSeconds(0);
      return;
    }

    if (current.mode === 'immediate') {
      setSimActive(false);
      setSimRemainingSeconds(0);
      setSimExpanded(true);
      return;
    }

    const durationSeconds = current.delaySeconds || 2.0;
    setSimRemainingSeconds(parseFloat(durationSeconds.toFixed(1)));
    setSimActive(true);

    const stepMs = 50;
    const totalSteps = (durationSeconds * 1000) / stepMs;
    let currentStep = 0;

    simIntervalRef.current = setInterval(() => {
      currentStep++;
      const pct = Math.min((currentStep / totalSteps) * 100, 100);
      setSimProgress(pct);
      const remain = Math.max(0, durationSeconds - (currentStep * stepMs) / 1000);
      setSimRemainingSeconds(parseFloat(remain.toFixed(1)));

      if (currentStep >= totalSteps) {
        if (simIntervalRef.current) clearInterval(simIntervalRef.current);
        setSimActive(false);
        setSimExpanded(true);
      }
    }, stepMs);
  }, [config]);

  // 停止模拟
  const stopSimulation = useCallback(() => {
    if (simTimerRef.current) clearTimeout(simTimerRef.current);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    setSimActive(false);
  }, []);

  // 重置模拟
  const resetSimulation = useCallback(() => {
    stopSimulation();
    setSimExpanded(false);
    setSimProgress(0);
    setSimRemainingSeconds(config.delaySeconds);
  }, [config.delaySeconds, stopSimulation]);

  // 2. 从腾讯云拉取持久化配置（具备本地防冲掉 LWW 机制）
  const loadFromCloud = useCallback(async (isManual: boolean = false) => {
    setCloudSyncState('syncing');
    try {
      const res = await fetchTruckExpandConfigFromCloud(currentTruckId);
      if (res.success && res.config) {
        setConfig(res.config);
        setIsSavedToCloud(true);
        startSimulation(res.config);
        setCloudSyncState(res.fromCloud ? 'synced' : 'offline_persisted');
        setLastSyncTime(new Date(res.config.updatedAt || Date.now()).toLocaleTimeString('zh-CN', { hour12: false }));
        if (isManual) {
          showToast(res.fromCloud ? '已从腾讯云同步最新餐车策略配置' : '本地策略已对齐 (离线保护就绪)');
        }
      } else {
        setCloudSyncState('offline_persisted');
        if (isManual) {
          showToast('已从本地安全沙箱载入配置 (云端离线运行中)');
        }
      }
    } catch {
      setCloudSyncState('offline_persisted');
      if (isManual) {
        showToast('云端拉取受阻，已使用本地高保真双轨存储');
      }
    }
  }, [currentTruckId, showToast, startSimulation]);

  useEffect(() => {
    loadFromCloud(false);
    return () => {
      if (simTimerRef.current) clearTimeout(simTimerRef.current);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [loadFromCloud]);

  // 3. 核心机制：修改参数即时落盘本地沙箱 + 防抖写入云端
  const updateField = <K extends keyof TruckExpandConfig>(key: K, value: TruckExpandConfig[K]) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      
      // 🛡️ 铁壁防御：立即同步落盘至本地沙箱，绝不等待任何异步！硬刷新 100% 不丢！
      saveTruckExpandConfig(next, currentTruckId);
      setIsSavedToCloud(false);
      setCloudSyncState('offline_persisted');
      setLastSyncTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }));

      // 实时重启模拟器动效
      startSimulation(next);

      // 异步防抖上推腾讯云（1.2 秒内无继续操作自动写云端）
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const ok = await pushTruckExpandConfigToCloud(next, currentTruckId);
          if (ok) {
            setIsSavedToCloud(true);
            setCloudSyncState('synced');
            setLastSyncTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
          }
        } catch {
          // ignore background push error
        }
      }, 1200);

      return next;
    });
  };

  // 4. 手动点击“立即永久保存至云端”
  const handleSaveToCloud = async () => {
    setIsPushingCloud(true);
    setCloudSyncState('syncing');

    // 本地再次坚固确权
    const saved = saveTruckExpandConfig(config, currentTruckId);
    setConfig(saved);

    // 显式推送腾讯云
    const cloudOk = await pushTruckExpandConfigToCloud(saved, currentTruckId);
    setIsPushingCloud(false);

    if (cloudOk) {
      setIsSavedToCloud(true);
      setCloudSyncState('synced');
      setLastSyncTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      showToast(`餐车策略已双轨永久落盘 (腾讯云 + 本地)：${getStrategyDescription(saved)}`);
    } else {
      setIsSavedToCloud(false);
      setCloudSyncState('offline_persisted');
      showToast(`餐车展开策略已永久落盘本地 (云端离线运行中)：${getStrategyDescription(saved)}`);
    }
  };

  // 恢复默认推荐
  const handleResetDefault = () => {
    const next = {
      ...DEFAULT_TRUCK_EXPAND_CONFIG,
      truckId: currentTruckId,
      updatedAt: new Date().toISOString()
    };
    setConfig(next);
    saveTruckExpandConfig(next, currentTruckId);
    setIsSavedToCloud(false);
    setCloudSyncState('offline_persisted');
    showToast('已重置为系统标准策略 (2.0秒自动展开)，已坚实落盘');
    startSimulation(next);
  };

  // 快捷预设场景
  const applyPreset = (type: 'flash_sale' | 'classic_2s' | 'minimal') => {
    let next: TruckExpandConfig;
    if (type === 'flash_sale') {
      next = {
        ...config,
        mode: 'immediate',
        delaySeconds: 0,
        target: 'both',
        triggerScene: 'always',
        showCountdownRing: false,
        hapticFeedback: true,
        enableOnNavTabHome: true
      };
      showToast('已载入预设：【大促高转化】直接展开餐车与看板');
    } else if (type === 'classic_2s') {
      next = {
        ...config,
        mode: 'countdown',
        delaySeconds: 2.0,
        target: 'both',
        triggerScene: 'daily_first',
        showCountdownRing: true,
        userCancelable: true,
        hapticFeedback: true
      };
      showToast('已载入预设：【标准温和】2秒倒计时智能展开');
    } else {
      next = {
        ...config,
        mode: 'disabled',
        delaySeconds: 0,
        target: 'menu_pullup',
        triggerScene: 'manual_dismiss_suppress',
        showCountdownRing: false
      };
      showToast('已载入预设：【纯净手动】常驻折叠不自动打扰');
    }

    setConfig(next);
    saveTruckExpandConfig(next, currentTruckId);
    setIsSavedToCloud(false);
    setCloudSyncState('offline_persisted');
    startSimulation(next);
  };

  const PRESET_SECONDS = [1.0, 1.5, 2.0, 3.0, 5.0, 8.0, 10.0];

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* 1. Header Toolbar (遵循 AGENTS.md 规范：单排白底工控、极简三位一体高亮) */}
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-bold text-neutral-900 tracking-tight">
                  餐车触达与自动展开策略配置
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 leading-none">
                  双轨权威落盘
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 leading-none">
                  餐车站号: {currentTruckId}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                数据实时双轨落盘（本地沙箱即时固化 + 腾讯云开发 TCB 持久化），硬刷新绝不丢失。
              </p>
            </div>
          </div>

          {/* Preset Buttons: 严格遵循 AGENTS.md 规范 (h-8, rounded-full, 纯白卡片底，三位一体同色高亮) */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => applyPreset('classic_2s')}
              className={`h-8 px-3.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border bg-white whitespace-nowrap ${
                config.mode === 'countdown' && config.delaySeconds === 2.0
                  ? 'border-emerald-600 text-emerald-700 ring-1.5 ring-emerald-600/15 font-bold shadow-2xs'
                  : 'border-neutral-200/90 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 shadow-2xs'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>标准推荐 (2.0s)</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('flash_sale')}
              className={`h-8 px-3.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border bg-white whitespace-nowrap ${
                config.mode === 'immediate'
                  ? 'border-rose-500 text-rose-600 ring-1.5 ring-rose-500/15 font-bold shadow-2xs'
                  : 'border-neutral-200/90 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 shadow-2xs'
              }`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span>大促即开 (0s)</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('minimal')}
              className={`h-8 px-3.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border bg-white whitespace-nowrap ${
                config.mode === 'disabled'
                  ? 'border-amber-500 text-amber-600 ring-1.5 ring-amber-500/15 font-bold shadow-2xs'
                  : 'border-neutral-200/90 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 shadow-2xs'
              }`}
            >
              <Ban className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>纯净手动</span>
            </button>
          </div>
        </div>

        {/* Status Ribbon (单排流式、真实呈现云端与本地状态) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-neutral-500">运行策略:</span>
            <span className="h-7 px-2.5 rounded-lg bg-neutral-50 border border-neutral-200/80 text-neutral-900 font-bold flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                config.mode === 'countdown' ? 'bg-emerald-500 animate-pulse' : config.mode === 'immediate' ? 'bg-rose-500' : 'bg-neutral-400'
              }`} />
              {getStrategyDescription(config)}
            </span>
            <span className="text-[11px] text-neutral-500">
              (触达: {config.target === 'both' ? '看板+抽屉联动' : config.target === 'menu_pullup' ? '底部抽屉菜单' : '顶部看板'})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* 云端真实持久化标识 */}
            <div className={`h-7 px-2.5 rounded-lg border flex items-center gap-1.5 font-medium whitespace-nowrap ${
              cloudSyncState === 'synced'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : cloudSyncState === 'syncing'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              <Cloud className={`w-3.5 h-3.5 ${cloudSyncState === 'syncing' ? 'animate-spin text-blue-600' : cloudSyncState === 'synced' ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span>
                {cloudSyncState === 'syncing'
                  ? '腾讯云对齐中...'
                  : cloudSyncState === 'synced'
                  ? `腾讯云已持久化 (${TCB_COLLECTIONS.TRUCK_EXPAND_CONFIG})`
                  : '本地沙箱坚实落盘 (离线就绪)'}
              </span>
            </div>

            {/* 主动重拉云端 */}
            <button
              type="button"
              onClick={() => loadFromCloud(true)}
              title="从腾讯云重新同步最新策略"
              className="h-7 px-2.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200/90 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap"
            >
              <RefreshCw className={`w-3 h-3 text-neutral-500 ${cloudSyncState === 'syncing' ? 'animate-spin' : ''}`} />
              <span>从云端同步</span>
            </button>

            <div className="text-[11px] text-neutral-500 flex items-center gap-1 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>最后落盘: {lastSyncTime || '已就绪'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Grid: 左侧配置表单 + 右侧真机模拟器 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: 7 Columns */}
        <div className="lg:col-span-7 space-y-4">
          {/* Section 1: 前台浮动气泡独立渲染控制 */}
          <div className="bg-white rounded-xl border border-neutral-200/90 p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <h2 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-neutral-500" />
                <span>1. 前台底栏浮动气泡与状态按钮独立渲染控制</span>
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                即时落盘 · 全端同步
              </span>
            </div>

            <p className="text-xs text-neutral-500">
              设置前台顾客端底部导航栏上方两个特定浮动交互组件的独立渲染与显隐：
            </p>

            <div className="space-y-2">
              {/* Switch 1: 左侧“展开餐车”气泡按钮开关 */}
              <div className={`flex items-start justify-between p-3 rounded-xl border transition-all ${
                config.showPullUpMenuPill !== false
                  ? 'bg-emerald-50/20 border-emerald-200/70'
                  : 'bg-white border-neutral-200/70 opacity-70'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                    config.showPullUpMenuPill !== false
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                  }`}>
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-neutral-900">
                        【展开餐车】浮动气泡按钮
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border leading-none ${
                        config.showPullUpMenuPill !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                      }`}>
                        {config.showPullUpMenuPill !== false ? '已开启渲染' : '已关闭隐藏'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      控制前台底部导航“点单”上方是否渲染“X秒后展开餐车 / 展开餐车菜单”浮动胶囊气泡。
                    </p>
                  </div>
                </div>
                <div className="ml-3 shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    id="merchant-toggle-pullup-pill"
                    checked={config.showPullUpMenuPill !== false}
                    onChange={(e) => updateField('showPullUpMenuPill', e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Switch 2: 右侧“订单履约状态”气泡按钮开关 */}
              <div className={`flex items-start justify-between p-3 rounded-xl border transition-all ${
                config.showActiveOrderBubble !== false
                  ? 'bg-emerald-50/20 border-emerald-200/70'
                  : 'bg-white border-neutral-200/70 opacity-70'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                    config.showActiveOrderBubble !== false
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                  }`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-neutral-900">
                        【订单履约状态】实时浮动气泡
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border leading-none ${
                        config.showActiveOrderBubble !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                      }`}>
                        {config.showActiveOrderBubble !== false ? '已开启渲染' : '已关闭隐藏'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      控制前台底部导航“订单”上方是否渲染“配送中 约XX分 / 制作中”动态履约进度气泡。
                    </p>
                  </div>
                </div>
                <div className="ml-3 shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    id="merchant-toggle-active-order-bubble"
                    checked={config.showActiveOrderBubble !== false}
                    onChange={(e) => updateField('showActiveOrderBubble', e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Switch 3: 页面滚动浏览品类联动 HUD */}
              <div className={`flex items-start justify-between p-3 rounded-xl border transition-all ${
                config.showScrollLinkageHud === true
                  ? 'bg-amber-50/20 border-amber-200'
                  : 'bg-white border-neutral-200/70'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                    config.showScrollLinkageHud === true
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                  }`}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-neutral-900">
                        【页面滚动浏览品类联动 HUD】浮动气泡
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border leading-none ${
                        config.showScrollLinkageHud === true
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                      }`}>
                        {config.showScrollLinkageHud === true ? '已开启显示' : '已删除 / 纯净无遮挡'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      滑动菜品时顶部滑出的联动指示气泡。默认遵照设计铁律保持删除/纯净模式，全屏点单无遮挡。
                    </p>
                  </div>
                </div>
                <div className="ml-3 shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    id="merchant-toggle-scroll-linkage-hud"
                    checked={config.showScrollLinkageHud === true}
                    onChange={(e) => updateField('showScrollLinkageHud', e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Switch 4: 左侧【2级齿轮选择器】双栏分类机 */}
              <div className={`flex items-start justify-between p-3 rounded-xl border transition-all ${
                config.showGearCategoryDial !== false
                  ? 'bg-emerald-50/20 border-emerald-200/70'
                  : 'bg-white border-neutral-200/70 opacity-70'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                    config.showGearCategoryDial !== false
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                  }`}>
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-neutral-900">
                        【2级齿轮选择器】双栏分类机渲染开关
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border leading-none ${
                        config.showGearCategoryDial !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                      }`}>
                        {config.showGearCategoryDial !== false ? '双栏模式 (已开启)' : '单栏模式 (已隐藏)'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      控制顾客端点餐主界面左侧的“2级齿轮分类滚轮”是否渲染。开启为双栏并排结构，关闭为单栏全宽浏览。
                    </p>

                    {/* 配色微调 */}
                    {config.showGearCategoryDial !== false && (
                      <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-neutral-500">外观主题：</span>
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateField('gearDialTheme', 'white')}
                            className={`h-7 px-3 rounded-full text-xs font-medium transition-all cursor-pointer bg-white border whitespace-nowrap ${
                              (config.gearDialTheme || 'white') === 'white'
                                ? 'border-emerald-600 text-emerald-700 ring-1.5 ring-emerald-600/15 font-bold shadow-2xs'
                                : 'border-neutral-200/90 text-neutral-600 hover:text-neutral-900'
                            }`}
                          >
                            白色极简 (推荐)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateField('gearDialTheme', 'dark')}
                            className={`h-7 px-3 rounded-full text-xs font-medium transition-all cursor-pointer bg-white border whitespace-nowrap ${
                              config.gearDialTheme === 'dark'
                                ? 'border-neutral-900 text-neutral-900 ring-1.5 ring-neutral-900/15 font-bold shadow-2xs'
                                : 'border-neutral-200/90 text-neutral-600 hover:text-neutral-900'
                            }`}
                          >
                            工控深色
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-3 shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    id="merchant-toggle-gear-dial"
                    checked={config.showGearCategoryDial !== false}
                    onChange={(e) => updateField('showGearCategoryDial', e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: 选择餐车展开模式 (Expansion Mode) */}
          <div className="bg-white rounded-xl border border-neutral-200/90 p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <h2 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-neutral-500" />
                <span>2. 选择餐车展开模式 (Expansion Mode)</span>
              </h2>
              <span className="text-xs text-neutral-500">点击卡片即时落盘</span>
            </div>

            <div className="space-y-2">
              {/* Mode 1: 倒计时自动展开 */}
              <div
                onClick={() => updateField('mode', 'countdown')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                  config.mode === 'countdown'
                    ? 'border-emerald-600 bg-emerald-50/20 ring-1.5 ring-emerald-600/15'
                    : 'border-neutral-200/90 hover:border-neutral-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      config.mode === 'countdown' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                    }`}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-neutral-900">倒计时自动展开</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          商家自定时间
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        进入首页后前台展示环形倒计时进度，倒计时结束自动平滑展开餐车菜单与优惠。
                      </p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    config.mode === 'countdown' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-neutral-300 bg-white'
                  }`}>
                    {config.mode === 'countdown' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {/* 倒计时时长滑动调节 */}
                {config.mode === 'countdown' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-emerald-100 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-600">
                        自定义倒计时时长:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold text-emerald-700">
                          {config.delaySeconds.toFixed(1)}
                        </span>
                        <span className="text-xs text-neutral-500">秒后自动展开</span>
                      </div>
                    </div>

                    {/* Range Slider */}
                    <div className="space-y-1">
                      <input
                        type="range"
                        min="0.5"
                        max="10.0"
                        step="0.5"
                        value={config.delaySeconds}
                        onChange={(e) => updateField('delaySeconds', parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                      <div className="flex justify-between text-[10px] text-neutral-400 px-0.5 font-medium">
                        <span>0.5s (极速)</span>
                        <span>2.0s (标准)</span>
                        <span>5.0s</span>
                        <span>10.0s (充裕)</span>
                      </div>
                    </div>

                    {/* 快捷秒数胶囊 */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs text-neutral-500 mr-1">快捷设定:</span>
                      {PRESET_SECONDS.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateField('delaySeconds', sec);
                          }}
                          className={`h-7 px-3 rounded-full text-xs font-medium transition-all cursor-pointer border bg-white whitespace-nowrap ${
                            config.delaySeconds === sec
                              ? 'border-emerald-600 text-emerald-700 ring-1.5 ring-emerald-600/15 font-bold shadow-2xs'
                              : 'text-neutral-600 border-neutral-200/90 hover:border-neutral-300'
                          }`}
                        >
                          {sec === 2.0 ? '2.0秒 (推荐)' : `${sec.toFixed(1)}秒`}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Mode 2: 直接展开 */}
              <div
                onClick={() => updateField('mode', 'immediate')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                  config.mode === 'immediate'
                    ? 'border-rose-500 bg-rose-50/20 ring-1.5 ring-rose-500/15'
                    : 'border-neutral-200/90 hover:border-neutral-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      config.mode === 'immediate' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                    }`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-neutral-900">直接展开</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          0秒无需等待
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        顾客打开页面或点击点单时立即展示餐车抽屉，零延迟强曝光，适合大促冲刺与新品活动。
                      </p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    config.mode === 'immediate' ? 'border-rose-600 bg-rose-600 text-white' : 'border-neutral-300 bg-white'
                  }`}>
                    {config.mode === 'immediate' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* Mode 3: 不自动展开 (纯手动) */}
              <div
                onClick={() => updateField('mode', 'disabled')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                  config.mode === 'disabled'
                    ? 'border-amber-500 bg-amber-50/20 ring-1.5 ring-amber-500/15'
                    : 'border-neutral-200/90 hover:border-neutral-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      config.mode === 'disabled' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                    }`}>
                      <Ban className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-neutral-900">不自动展开 (纯手动触发)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                          保持常驻折叠
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        页面进入时不自动弹出任何浮窗，仅当顾客主动点击“展开餐车”胶囊或上拉手势时才展开。
                      </p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    config.mode === 'disabled' ? 'border-amber-600 bg-amber-600 text-white' : 'border-neutral-300 bg-white'
                  }`}>
                    {config.mode === 'disabled' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: 触达目标与防扰规则 */}
          <div className="bg-white rounded-xl border border-neutral-200/90 p-4 space-y-4 shadow-2xs">
            <h2 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5 uppercase tracking-wider border-b border-neutral-100 pb-2.5">
              <Layers className="w-3.5 h-3.5 text-neutral-500" />
              <span>3. 展开触达目标与防扰规则</span>
            </h2>

            {/* Target Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">展开触达目标区域:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'both', label: '顶部与底部联动', desc: '看板+抽屉全部展开' },
                  { id: 'menu_pullup', label: '仅底部餐车抽屉', desc: '展开底部优惠菜单' },
                  { id: 'banner', label: '仅顶部餐车看板', desc: '展开活动热度榜' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateField('target', item.id as TruckExpandTarget)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      config.target === item.id
                        ? 'border-emerald-600 bg-emerald-50/20 text-emerald-800 ring-1.5 ring-emerald-600/15 font-bold shadow-2xs'
                        : 'border-neutral-200/90 hover:border-neutral-300 text-neutral-700 bg-white'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[11px] text-neutral-500 font-normal mt-0.5 truncate">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger Scene Frequency */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-neutral-700">生效频次策略:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'daily_first', label: '每日首次进入', sub: '推荐 · 防高频打扰' },
                  { id: 'manual_dismiss_suppress', label: '关闭后不再自动弹出', sub: '尊重意愿 · 永不打扰' },
                  { id: 'once_per_session', label: '单次会话只弹一次', sub: '会话隔离 · 刷新重算' },
                  { id: 'new_visitor', label: '仅新客首单生效', sub: '专属新手引导' },
                  { id: 'always', label: '每次进入首页', sub: '最高曝光率' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateField('triggerScene', item.id as TruckExpandScene)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      config.triggerScene === item.id
                        ? 'border-emerald-600 bg-emerald-50/20 text-emerald-800 ring-1.5 ring-emerald-600/15 font-bold shadow-2xs'
                        : 'border-neutral-200/90 hover:border-neutral-300 text-neutral-700 bg-white'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className={`text-[10.5px] mt-0.5 ${config.triggerScene === item.id ? 'text-emerald-700' : 'text-neutral-500'}`}>
                      {item.sub}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Multi-Scenario Controls */}
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <div className="text-xs font-bold text-neutral-700">多场景智能收起与防打扰规则:</div>

              {/* Scenario 1: 用户主动关闭后记住 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/60 border border-neutral-200/80">
                <div className="flex items-center gap-2.5">
                  <EyeOff className="w-4 h-4 text-neutral-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-neutral-900">用户主动关闭后记住状态（不再重复弹出）</div>
                    <div className="text-xs text-neutral-500">
                      用户点击右上角或向下滑动关闭菜单后，系统自动记录，下次进入不再强制自动展开
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.rememberUserDismissal ?? true}
                  onChange={(e) => updateField('rememberUserDismissal', e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                />
              </div>

              {/* Scenario 2: 自动展开后自动收起倒计时 */}
              <div className="p-3 rounded-xl bg-neutral-50/60 border border-neutral-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-neutral-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-neutral-900">展开后自动收起倒计时</div>
                      <div className="text-xs text-neutral-500">
                        {config.autoCollapseAfterSeconds > 0
                          ? `展开 ${config.autoCollapseAfterSeconds} 秒后若无操作自动收起，避免遮挡商品列表`
                          : '设置为 0 秒表示保持展开常开状态，直到用户主动关闭'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white border border-neutral-200 text-neutral-900">
                    {config.autoCollapseAfterSeconds === 0 ? '不自动收起' : `${config.autoCollapseAfterSeconds}秒后收起`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  {[0, 3, 5, 8, 10].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => updateField('autoCollapseAfterSeconds', sec)}
                      className={`flex-1 h-7 text-xs rounded-lg border transition-all cursor-pointer font-medium ${
                        config.autoCollapseAfterSeconds === sec
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-bold ring-1.5 ring-emerald-600/15'
                          : 'bg-white text-neutral-700 border-neutral-200/90 hover:bg-neutral-50'
                      }`}
                    >
                      {sec === 0 ? '常开' : `${sec}秒`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scenario 3: 加购后自动收起 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/60 border border-neutral-200/80">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-neutral-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-neutral-900">加购商品后自动收起餐车浮层</div>
                    <div className="text-xs text-neutral-500">
                      顾客在菜单中点击“加购”或选择规格加入选购单后，自动收起菜单方便继续浏览
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.collapseOnAddToCart ?? true}
                  onChange={(e) => updateField('collapseOnAddToCart', e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                />
              </div>

              {/* Scenario 4: 路由切换自动收起 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/60 border border-neutral-200/80">
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-4 h-4 text-neutral-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-neutral-900">切换页面时自动收起</div>
                    <div className="text-xs text-neutral-500">
                      进入选购单、订单中心或配送雷达跟踪时，自动收起餐车抽屉
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.collapseOnNavigate ?? true}
                  onChange={(e) => updateField('collapseOnNavigate', e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                />
              </div>

              {/* Scenario 5: 页面滚动时自动收起 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/60 border border-neutral-200/80">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-neutral-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-neutral-900">向下滑动商品列表时自动收起</div>
                    <div className="text-xs text-neutral-500">
                      顾客大幅度滑动菜单查看菜品时，智能释放屏幕视窗空间
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.collapseOnPageScroll ?? true}
                  onChange={(e) => updateField('collapseOnPageScroll', e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                />
              </div>

              {/* 清除顾客主动关闭记录标记 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/60 border border-neutral-200/80">
                <div>
                  <div className="text-xs font-bold text-neutral-900">重置顾客关闭记录 (测试专用)</div>
                  <div className="text-xs text-neutral-500">
                    清除本地存储中顾客主动点击“关闭”的防打扰标记，恢复首次进入自动弹出效果
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetUserDismissedRecord();
                    showToast('已重置顾客关闭记录，恢复首次自动弹出测试');
                  }}
                  className="h-7 px-3 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200/90 text-xs font-medium rounded-lg cursor-pointer shrink-0 transition-colors shadow-2xs whitespace-nowrap"
                >
                  清除标记
                </button>
              </div>

              {/* Switch 6: 倒计时环形动效 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/60 border border-neutral-200/80">
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-neutral-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-neutral-900">展开倒计时环形进度动画</div>
                    <div className="text-xs text-neutral-500">
                      在“点单”气泡内展示绿色环形倒计时进度条与脉冲雷达微动效
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.showCountdownRing}
                  onChange={(e) => updateField('showCountdownRing', e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                />
              </div>

              {/* Switch 7: 手势打断 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/60 border border-neutral-200/80">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-neutral-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-neutral-900">顾客滑动屏幕时自动取消展开</div>
                    <div className="text-xs text-neutral-500">
                      若顾客在倒计时期间主动上下滑动菜单，视为沉浸浏览，自动终止弹出
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.userCancelable}
                  onChange={(e) => updateField('userCancelable', e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                />
              </div>

              {/* Switch 8: 震动反馈 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/60 border border-neutral-200/80">
                <div className="flex items-center gap-2.5">
                  <Vibrate className="w-4 h-4 text-neutral-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-neutral-900">展开时触觉震动反馈 (Haptic)</div>
                    <div className="text-xs text-neutral-500">
                      移动端展开瞬间提供 40ms 轻微振动触感
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.hapticFeedback}
                  onChange={(e) => updateField('hapticFeedback', e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: 5 Columns 真机沙箱模拟器 */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200/90 p-4 space-y-3.5 sticky top-16 shadow-2xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <h2 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Smartphone className="w-3.5 h-3.5 text-neutral-500" />
                <span>实时真机动效模拟器 (Simulator)</span>
              </h2>
              <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">
                实时沙箱
              </span>
            </div>

            <p className="text-xs text-neutral-500">
              在下方真机沙箱中实时模拟顾客前台视觉响应与倒计时过程：
            </p>

            {/* Simulated Phone Frame */}
            <div className="border border-neutral-200/90 rounded-xl bg-neutral-50/50 p-2.5">
              <div className="bg-white rounded-lg overflow-hidden min-h-[380px] flex flex-col justify-between border border-neutral-200/90 relative shadow-inner">
                {/* Phone Status Bar */}
                <div className="bg-neutral-50 px-3 py-1.5 flex items-center justify-between text-[11px] text-neutral-500 border-b border-neutral-200/80">
                  <span className="font-bold text-neutral-800">12:30</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>餐车前台实时预览</span>
                  </div>
                </div>

                {/* Top Banner */}
                <div className="p-3 space-y-2">
                  <div className="bg-white rounded-lg p-2.5 border border-neutral-200/90 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-neutral-900">黑曜石主厨移动餐车</span>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      营业中 0.8km
                    </span>
                  </div>

                  {/* Simulated Dishes */}
                  <div className="grid grid-cols-2 gap-2 opacity-60">
                    <div className="bg-white p-2 rounded-lg border border-neutral-200/80 text-[11px]">
                      <div className="font-bold text-neutral-900">和牛小汉堡双重奏</div>
                      <div className="text-emerald-700 font-bold mt-0.5">¥63.0</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-neutral-200/80 text-[11px]">
                      <div className="font-bold text-neutral-900">松露墨汁土豆玉棋</div>
                      <div className="text-emerald-700 font-bold mt-0.5">¥88.0</div>
                    </div>
                  </div>
                </div>

                {/* Center Simulator Status Overlay */}
                <div className="px-3 py-2 text-center">
                  {simActive ? (
                    <div className="inline-flex flex-col items-center gap-1.5 bg-white px-3.5 py-2.5 rounded-xl border border-emerald-200 shadow-sm animate-in zoom-in-95">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 -rotate-90 text-emerald-600 shrink-0" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="9" fill="none" stroke="#f1f1ef" strokeWidth="3" />
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3"
                            strokeDasharray={56.5}
                            strokeDashoffset={56.5 - (56.5 * simProgress) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="text-xs font-bold text-emerald-800">
                          {simRemainingSeconds}s 倒计时进行中...
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500">
                        进度: {Math.round(simProgress)}%
                      </span>
                    </div>
                  ) : simExpanded ? (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-300 text-xs font-bold shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>餐车抽屉已自动滑出展开！</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 bg-neutral-50 text-neutral-600 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs">
                      <Info className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{config.mode === 'disabled' ? '当前配置为手动模式' : '准备就绪，点击下方开始模拟'}</span>
                    </div>
                  )}
                </div>

                {/* Simulated Drawer */}
                <AnimatePresence>
                  {simExpanded && (
                    <motion.div
                      initial={{ y: 120, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 120, opacity: 0 }}
                      transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                      className="absolute bottom-12 left-2 right-2 bg-white rounded-t-xl border border-neutral-200/90 shadow-lg p-3 space-y-2 z-20"
                    >
                      <div className="w-8 h-1 bg-neutral-200 rounded-full mx-auto" />
                      <div className="flex items-center justify-between text-xs font-bold text-neutral-900">
                        <span className="flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-rose-500" />
                          <span>今日餐车热门爆款 & 5折神券</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setSimExpanded(false)}
                          className="text-[11px] text-neutral-500 hover:text-neutral-900 font-medium"
                        >
                          收起
                        </button>
                      </div>
                      <div className="bg-neutral-50 text-neutral-800 border border-neutral-200/80 p-2 rounded-lg text-xs flex items-center justify-between">
                        <span>满¥35立减¥5券 (全场通用)</span>
                        <span className="bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          已领取
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Simulated Bottom Dock */}
                <div className="bg-neutral-50 border-t border-neutral-200/80 px-3 py-2 flex items-center justify-around text-center text-[10px] z-10">
                  <div className="relative">
                    {/* Simulated Floating Tooltip (Left: Expand Truck) */}
                    {config.showPullUpMenuPill !== false && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-emerald-700 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                        {simActive ? `${simRemainingSeconds}s后展开` : config.mode === 'immediate' ? '直接展开' : config.mode === 'disabled' ? '点击展开' : `${config.delaySeconds.toFixed(1)}s后展开`}
                      </div>
                    )}
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center justify-center mx-auto">
                      <Truck className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-emerald-700">点单</span>
                  </div>

                  <div className="text-neutral-500">
                    <div className="w-6 h-6 rounded-lg mx-auto bg-white border border-neutral-200 flex items-center justify-center text-xs">
                      🛒
                    </div>
                    <span>选购单</span>
                  </div>

                  <div className="relative text-neutral-500">
                    {/* Simulated Floating Tooltip (Right: Active Order) */}
                    {config.showActiveOrderBubble !== false && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping inline-block" />
                        <span>配送中 约12分</span>
                      </div>
                    )}
                    <div className="w-6 h-6 rounded-lg mx-auto bg-white border border-neutral-200 flex items-center justify-center text-xs">
                      📋
                    </div>
                    <span>订单</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulator Action Buttons (遵循 h-8, rounded-lg, 纯白卡片底与同色高亮) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => startSimulation()}
                className="h-8 bg-white hover:bg-neutral-50 text-emerald-700 border border-emerald-600/70 ring-1.5 ring-emerald-600/10 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5" />
                <span>开始模拟</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopSimulation();
                  setSimExpanded(true);
                }}
                className="h-8 bg-white hover:bg-neutral-50 text-rose-600 border border-rose-400 ring-1.5 ring-rose-500/10 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>立即展开</span>
              </button>

              <button
                type="button"
                onClick={resetSimulation}
                className="h-8 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200/90 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重置</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Sticky Action Bar (双重保障，支持手动立即写云端与重置) */}
      <div className="sticky bottom-2 z-30 bg-white/95 backdrop-blur-md rounded-xl border border-neutral-200/90 p-3 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-900">
              当前运行策略：{getStrategyDescription(config)}
            </div>
            <div className="text-[11px] text-neutral-500 flex items-center gap-2 flex-wrap">
              <span>
                {isPushingCloud
                  ? '正在永久落盘至腾讯云开发数据库...'
                  : isSavedToCloud
                  ? '已与腾讯云开发 (TCB) 及本地沙箱双轨权威同步'
                  : '本地沙箱已100%固化落盘 (硬刷新不丢)，可随时推送到云端备份'}
              </span>
              {cloudSyncState === 'synced' && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full font-bold">
                  [云端权威]
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefault}
            className="h-8 px-3 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200/90 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
            <span>恢复默认 (2s)</span>
          </button>

          <button
            type="button"
            disabled={isPushingCloud}
            onClick={handleSaveToCloud}
            className={`h-8 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-2xs ${
              isPushingCloud
                ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-wait'
                : isSavedToCloud
                ? 'bg-white text-emerald-700 border border-emerald-600 ring-1.5 ring-emerald-600/15 hover:bg-emerald-50'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600'
            }`}
          >
            {isPushingCloud ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>
              {isPushingCloud
                ? '正在保存至腾讯云...'
                : isSavedToCloud
                ? '已落盘 · 再次备份到云端'
                : '立即永久保存至云端'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
