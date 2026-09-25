import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal,
  SlidersHorizontal,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Zap,
  Activity,
  Wifi,
  WifiOff,
  ShoppingBag,
  CreditCard,
  UserCheck,
  Search,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Bike,
  CookingPot,
  Package,
  Truck,
  RotateCw,
  Ban,
  ShieldCheck,
  Check,
  ChevronRight,
  RefreshCw,
  Flame,
  ArrowRight,
  Lock,
  Unlock,
  Layers,
  HelpCircle
} from 'lucide-react';
import { useDevSimulation } from '../../context/DevSimulationContext';
import { Order, DishItem, UserProfile } from '../../types';
import { GranularOrderStatus, ALL_GRANULAR_FLOW_STEPS, getOrderStatusConfig } from '../../utils/orderFlowEngine';
import { SIMULATION_POINTS_REGISTRY } from '../../utils/simulationRegistry';
import { useToast } from '../ui/ToastContext';

interface DevSimulationControlCenterProps {
  orders: Order[];
  onAdvanceOrderStatus: (orderNo: string, nextStatus: GranularOrderStatus, extra?: any) => void;
  dishes: DishItem[];
  userProfile?: UserProfile;
  onProfileUpdated?: (user: UserProfile) => void;
  onInjectSampleOrder?: (type: 'standard' | 'cancel_flow' | 'reassign_flow') => void;
  onNavigateToTracking?: () => void;
}

export const DevSimulationControlCenter: React.FC<DevSimulationControlCenterProps> = ({
  orders,
  onAdvanceOrderStatus,
  dishes,
  userProfile,
  onProfileUpdated,
  onInjectSampleOrder,
  onNavigateToTracking
}) => {
  const {
    isAdminDeveloper,
    adminUser,
    previewAsConsumer,
    isSimulationAllowed,
    inspectorMode,
    networkDelayMs,
    simulateOffline,
    simulatedOutOfStockDishIds,
    simulatePaymentOutcome,
    radarSpeedMultiplier,
    isDevControlCenterOpen,
    closeDevControlCenter,
    togglePreviewAsConsumer,
    toggleInspectorMode,
    setNetworkDelayMs,
    setSimulateOffline,
    toggleDishOutOfStock,
    setSimulatePaymentOutcome,
    setRadarSpeedMultiplier,
    clearAllSimulations,
    logoutAdmin
  } = useDevSimulation();

  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'flow' | 'experiments' | 'inspector' | 'identity'>('flow');

  // Selected order for simulation
  const [selectedOrderNo, setSelectedOrderNo] = useState<string>('');
  
  // Auto-play state
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(2000); // 2000ms default
  const autoPlayTimerRef = useRef<any>(null);

  // Sync selected order with orders
  useEffect(() => {
    if (orders.length > 0 && !selectedOrderNo) {
      const activeOrder = orders.find((o) => o.status !== 'completed' && o.status !== 'refunded') || orders[0];
      setSelectedOrderNo(activeOrder.orderNo || activeOrder.id);
    }
  }, [orders, selectedOrderNo]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, []);

  if (!isDevControlCenterOpen) return null;

  const currentOrder = orders.find((o) => (o.orderNo || o.id) === selectedOrderNo) || orders[0];
  const currentStatusConfig = currentOrder ? getOrderStatusConfig(currentOrder.status) : null;

  // Handle single-step transition
  const handleJumpToStatus = (statusKey: GranularOrderStatus) => {
    if (!currentOrder) {
      toast.info('当前无可用测试订单，请先注入测试订单');
      return;
    }
    const targetNo = currentOrder.orderNo || currentOrder.id;
    onAdvanceOrderStatus(targetNo, statusKey);
    toast.info(`[状态模拟] 订单已跳转至: ${getOrderStatusConfig(statusKey).label}`);
  };

  // Auto-play runner
  const toggleAutoPlay = () => {
    if (isAutoPlaying) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      setIsAutoPlaying(false);
      toast.info('全链路状态自动演练已暂停');
    } else {
      if (!currentOrder) {
        toast.info('请先选择或注入一个待演练订单');
        return;
      }
      setIsAutoPlaying(true);
      toast.info('全链路状态演练已启动，将按设定周期平滑推进！');

      const normalStages: GranularOrderStatus[] = [
        'pending',
        'cooking',
        'ready',
        'rider_heading',
        'waiting_pickup',
        'picked_up',
        'delivering',
        'completed'
      ];

      autoPlayTimerRef.current = setInterval(() => {
        // Look up latest order state
        const targetOrder = orders.find((o) => (o.orderNo || o.id) === selectedOrderNo);
        const currentKey = targetOrder?.status as GranularOrderStatus || 'pending';
        const currentIndex = normalStages.indexOf(currentKey);

        if (currentIndex === -1 || currentIndex >= normalStages.length - 1) {
          // Loop or stop
          clearInterval(autoPlayTimerRef.current);
          setIsAutoPlaying(false);
          toast.info('全链路正向流转演练已达完成阶段');
        } else {
          const nextStage = normalStages[currentIndex + 1];
          onAdvanceOrderStatus(targetOrder?.orderNo || targetOrder?.id || selectedOrderNo, nextStage);
        }
      }, playSpeed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        className="w-full max-w-4xl bg-[#111213] text-white rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden font-sans flex flex-col max-h-[92vh]"
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                  前端调试与全状态流转模拟中枢
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  {previewAsConsumer ? '👁️ 普通食客模式' : '⚡ 管理员全开'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 flex items-center gap-2">
                <span>授权账号: <strong className="text-neutral-200">{adminUser?.username || 'admin'}</strong></span>
                <span className="text-neutral-600">|</span>
                <span>所属部门: {adminUser?.department || '研发工程中枢'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Preview As Consumer Button */}
            <button
              type="button"
              onClick={togglePreviewAsConsumer}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                previewAsConsumer
                  ? 'bg-amber-500 text-black border-amber-400 shadow-xs'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
              }`}
              title="切换为普通非管理员视角，检验所有模拟按钮是否彻底隐藏并锁定"
            >
              {previewAsConsumer ? <Eye className="w-3.5 h-3.5 text-black" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
              <span>{previewAsConsumer ? '切回开发者模式' : '预览普通食客视角'}</span>
            </button>

            {/* Logout Admin */}
            <button
              type="button"
              onClick={() => {
                logoutAdmin();
                toast.info('已退出管理员身份，客户端所有模拟功能全部锁定');
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-neutral-800/80 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-300 border border-neutral-700 hover:border-rose-500/40 transition-colors cursor-pointer"
              title="清除授权并彻底锁定所有调试模拟能力"
            >
              退出管理
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={closeDevControlCenter}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Notice Banner */}
        {previewAsConsumer && (
          <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>当前处于【普通用户端纯净预览】。客户端所有流转模拟组件、单步按钮及调试工具已全部被硬性锁定。</span>
            </span>
            <button
              type="button"
              onClick={togglePreviewAsConsumer}
              className="text-[11px] font-bold underline cursor-pointer"
            >
              立即解除预览
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-5 border-b border-neutral-800 bg-neutral-900/40 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('flow')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'flow'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>订单 13 状态流转模拟</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('experiments')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'experiments'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>功能性实验模拟 (弱网/售罄/支付)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inspector')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'inspector'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>模拟点位全局探测排查 ({SIMULATION_POINTS_REGISTRY.length})</span>
            {inspectorMode && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('identity')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'identity'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>食客身份与特权沙盒</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: Order Lifecycle 13 Stages Simulation */}
          {activeTab === 'flow' && (
            <div className="space-y-5">
              {/* Order Selector & Quick Injectors */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-mono">
                      当前选定调试订单
                    </span>
                    <select
                      value={selectedOrderNo}
                      onChange={(e) => setSelectedOrderNo(e.target.value)}
                      className="bg-neutral-800 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 border border-neutral-700 outline-hidden font-mono truncate max-w-[220px]"
                    >
                      {orders.map((o) => (
                        <option key={o.id} value={o.orderNo || o.id}>
                          #{o.orderNo || o.id} ({getOrderStatusConfig(o.status).shortLabel} · ¥{o.totalAmount})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Order Injectors */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {onInjectSampleOrder && (
                    <>
                      <button
                        type="button"
                        onClick={() => onInjectSampleOrder('standard')}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1 border border-neutral-700 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>注入标准配送单</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onInjectSampleOrder('reassign_flow')}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1 border border-neutral-700 cursor-pointer"
                      >
                        <Bike className="w-3 h-3 text-sky-400" />
                        <span>注入骑手拒单单</span>
                      </button>
                    </>
                  )}

                  {onNavigateToTracking && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDevControlCenter();
                        onNavigateToTracking();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>直达雷达追踪页</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Current Status Overview Card */}
              {currentStatusConfig && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-neutral-850 border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3.5 h-3.5 rounded-full animate-pulse shrink-0"
                      style={{ backgroundColor: currentStatusConfig.dotColor }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400">当前订单状态:</span>
                        <span className="text-sm font-black text-white">
                          {currentStatusConfig.label}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-amber-400 border border-neutral-700">
                          阶段 {currentStatusConfig.stepIndex + 1} / 8
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {currentStatusConfig.desc}
                      </p>
                    </div>
                  </div>

                  {/* Auto Play Controller */}
                  <div className="flex items-center gap-2">
                    <select
                      value={playSpeed}
                      onChange={(e) => setPlaySpeed(Number(e.target.value))}
                      className="bg-neutral-800 text-white text-xs font-mono rounded-lg px-2 py-1.5 border border-neutral-700"
                    >
                      <option value={3000}>1x 速度 (3s/步)</option>
                      <option value={1800}>2x 速度 (1.8s/步)</option>
                      <option value={800}>4x 极速 (0.8s/步)</option>
                    </select>

                    <button
                      type="button"
                      onClick={toggleAutoPlay}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isAutoPlaying
                          ? 'bg-amber-500 text-black shadow-md animate-pulse'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {isAutoPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                      <span>{isAutoPlaying ? '暂停演练' : '自动连贯推进'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 1. Forward Happy Path (正向履约流) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>正向履约全流程节点 (点击即时切换)：</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_GRANULAR_FLOW_STEPS.filter((s) => s.category === '正向主流程').map((step) => {
                    const isCurrent = currentOrder?.status === step.key;
                    return (
                      <button
                        key={step.key}
                        type="button"
                        onClick={() => handleJumpToStatus(step.key)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[64px] ${
                          isCurrent
                            ? 'bg-emerald-950/70 border-emerald-500/80 text-white ring-2 ring-emerald-500/30'
                            : 'bg-neutral-900/90 hover:bg-neutral-850 border-neutral-800 text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-neutral-500">#{step.key}</span>
                          {isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          )}
                        </div>
                        <span className="text-xs font-bold block mt-1">
                          {step.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Exception & Dynamic Reassignment Flows (异常与智能转派分支) */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>异常与动态调度分支流转 (核心业务容灾演习)：</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_GRANULAR_FLOW_STEPS.filter((s) => s.category !== '正向主流程').map((step) => {
                    const isCurrent = currentOrder?.status === step.key;
                    return (
                      <button
                        key={step.key}
                        type="button"
                        onClick={() => handleJumpToStatus(step.key)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[64px] ${
                          isCurrent
                            ? 'bg-amber-950/70 border-amber-500/80 text-white ring-2 ring-amber-500/30'
                            : 'bg-neutral-900/90 hover:bg-neutral-850 border-neutral-800 text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-amber-500/80">#{step.key}</span>
                          <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">
                            异常分支
                          </span>
                        </div>
                        <span className="text-xs font-bold block mt-1">
                          {step.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Functional Experiments (弱网/售罄/支付) */}
          {activeTab === 'experiments' && (
            <div className="space-y-6">
              {/* 1. Network Simulation */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-sky-400" />
                    <h4 className="text-xs font-bold text-white">网络环境仿真与弱网延迟注入</h4>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {simulateOffline ? '🔴 离线断网' : networkDelayMs > 0 ? `🟡 延迟 +${networkDelayMs}ms` : '🟢 正常网络'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNetworkDelayMs(0);
                      setSimulateOffline(false);
                      toast.info('网络已恢复正常高速直连');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      !simulateOffline && networkDelayMs === 0
                        ? 'bg-sky-600 text-white border-sky-500'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-750'
                    }`}
                  >
                    标准直连 (0ms)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNetworkDelayMs(800);
                      setSimulateOffline(false);
                      toast.info('已开启 4G 弱网模拟 (+800ms)');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      !simulateOffline && networkDelayMs === 800
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-750'
                    }`}
                  >
                    4G 弱网 (+800ms)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNetworkDelayMs(2500);
                      setSimulateOffline(false);
                      toast.info('已开启 Slow 3G 高延迟模拟 (+2500ms)');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      !simulateOffline && networkDelayMs === 2500
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-750'
                    }`}
                  >
                    Slow 3G (+2500ms)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimulateOffline(!simulateOffline);
                      toast.info(simulateOffline ? '网络已恢复' : '已模拟断网离线，将测试 Outbox 离线队列');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      simulateOffline
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-750'
                    }`}
                  >
                    {simulateOffline ? '🔴 恢复在线' : '模拟断网离线'}
                  </button>
                </div>
              </div>

              {/* 2. Stockout Circuit Simulation */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <h4 className="text-xs font-bold text-white">菜品库存售罄熔断实验 (Out-of-Stock)</h4>
                  </div>
                  <span className="text-[11px] text-neutral-400">
                    已熔断: {simulatedOutOfStockDishIds.length} 样菜品
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  勾选菜品将即刻将其库存模拟为 0，测试前台“已售罄”置灰、加购拦截与结算校验。
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                  {dishes.slice(0, 9).map((dish) => {
                    const isOutOfStock = simulatedOutOfStockDishIds.includes(dish.id);
                    return (
                      <button
                        key={dish.id}
                        type="button"
                        onClick={() => {
                          toggleDishOutOfStock(dish.id);
                          toast.info(isOutOfStock ? `【${dish.name}】已恢复在售` : `【${dish.name}】已模拟售罄`);
                        }}
                        className={`p-2 rounded-lg border text-xs text-left font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          isOutOfStock
                            ? 'bg-rose-950/60 border-rose-500/80 text-rose-300'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-750'
                        }`}
                      >
                        <span className="truncate">{dish.name}</span>
                        {isOutOfStock ? (
                          <span className="text-[9px] bg-rose-500 text-white font-bold px-1 rounded">
                            已售罄
                          </span>
                        ) : (
                          <span className="text-[9px] text-neutral-500 font-mono">在售</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Payment Gateway Simulation */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white">收银支付网关结果仿真实验</h4>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">
                    当前: {simulatePaymentOutcome}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatePaymentOutcome('normal');
                      toast.info('支付模式已重置为正常行为');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      simulatePaymentOutcome === 'normal'
                        ? 'bg-neutral-700 text-white border-neutral-500'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    正常支付流程
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatePaymentOutcome('timeout');
                      toast.info('已设定下一次支付触发网关超时');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      simulatePaymentOutcome === 'timeout'
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    强制模拟支付超时
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatePaymentOutcome('fail');
                      toast.info('已设定下一次支付触发卡内余额不足');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      simulatePaymentOutcome === 'fail'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    强制模拟拒付失败
                  </button>
                </div>
              </div>

              {/* Reset all */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    clearAllSimulations();
                    toast.info('所有功能性实验已重置为默认状态');
                  }}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>一键复位所有实验参数</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Simulation Points Inspector & Audit */}
          {activeTab === 'inspector' && (
            <div className="space-y-4">
              {/* Master Inspector Toggle Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-neutral-900 to-neutral-900 border border-amber-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold shrink-0">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">
                      全局模拟组件与开发点位探测器 (Inspector Mode)
                    </h4>
                    <p className="text-xs text-neutral-400">
                      开启后将在全站页面所有具备模拟功能的组件外侧标记琥珀色探测光环及锁定状态。
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    toggleInspectorMode();
                    toast.info(inspectorMode ? '已关闭全屏模拟点位高亮' : '全屏模拟点位高亮探测已开启！');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    inspectorMode
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'bg-neutral-800 hover:bg-neutral-750 text-white border border-neutral-700'
                  }`}
                >
                  <span>{inspectorMode ? '点位高亮中 (点击关闭)' : '开启点位高亮探测'}</span>
                </button>
              </div>

              {/* Simulation Points Checklist Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-neutral-300 block">
                  项目模拟能力登记册与锁定审计表 ({SIMULATION_POINTS_REGISTRY.length} 项)：
                </span>

                <div className="border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-800/60 bg-neutral-900/50">
                  {SIMULATION_POINTS_REGISTRY.map((point) => (
                    <div key={point.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-neutral-900 transition-colors">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">
                            {point.name}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                            {point.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-snug">
                          {point.description}
                        </p>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          📁 {point.filePath}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-800/60">
                          <Lock className="w-2.5 h-2.5" />
                          <span>非管理员全锁定</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Customer Identity & Perks Sandbox */}
          {activeTab === 'identity' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>食客特权与边界沙盒测试 (快速切换用户状态)</span>
                </h4>
                <p className="text-xs text-neutral-400">
                  无需切换账号即可瞬时切换当前用户的会员等级、钱包余额与优惠券，检验结算折扣与会员专属通道。
                </p>

                {userProfile && onProfileUpdated && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onProfileUpdated({
                          ...userProfile,
                          membershipTier: 'standard',
                          isVIPActive: false
                        });
                        toast.info('已切换为普通食客身份');
                      }}
                      className="p-2.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-750 text-left cursor-pointer"
                    >
                      <span className="text-xs font-bold text-white block">普通食客</span>
                      <span className="text-[10px] text-neutral-400">无 VIP 专属折扣</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onProfileUpdated({
                          ...userProfile,
                          membershipTier: 'vip_black_elite',
                          isVIPActive: true
                        });
                        toast.info('已升级为黑曜石黑卡 VIP！享 88 折直降');
                      }}
                      className="p-2.5 rounded-lg border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-left cursor-pointer"
                    >
                      <span className="text-xs font-bold text-amber-300 block">黑曜石黑卡 VIP</span>
                      <span className="text-[10px] text-amber-400">激活 88 折与专属徽章</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onProfileUpdated({
                          ...userProfile,
                          balance: 0
                        });
                        toast.info('已将当前钱包余额清零，测试免密余额不足拦截');
                      }}
                      className="p-2.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-750 text-left cursor-pointer"
                    >
                      <span className="text-xs font-bold text-rose-300 block">余额为 0</span>
                      <span className="text-[10px] text-neutral-400">测试无余额结算拦截</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onProfileUpdated({
                          ...userProfile,
                          balance: 999
                        });
                        toast.info('已将当前钱包充值 ¥999 模拟余额');
                      }}
                      className="p-2.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-750 text-left cursor-pointer"
                    >
                      <span className="text-xs font-bold text-emerald-300 block">余额充沛 (¥999)</span>
                      <span className="text-[10px] text-neutral-400">测试钱包一键免密闪付</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>前端沙盒状态隔离已激活 · 普通食客端已 100% 锁定</span>
          </div>

          <button
            type="button"
            onClick={closeDevControlCenter}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-colors cursor-pointer"
          >
            完成并收起
          </button>
        </div>
      </motion.div>
    </div>
  );
};
