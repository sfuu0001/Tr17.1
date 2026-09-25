import React, { useState } from 'react';
import {
  ClipboardList,
  ChefHat,
  PackageCheck,
  Navigation,
  Clock,
  ShoppingBag,
  Bike,
  MapPin,
  Check,
  AlertTriangle,
  RefreshCw,
  Ban,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Lock,
  Unlock,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TrackingStatus } from '../../types/tracking';
import {
  GranularOrderStatus,
  getOrderStatusConfig,
  SEQUENTIAL_FORWARD_FLOW,
  ALL_GRANULAR_FLOW_STEPS
} from '../../utils/orderFlowEngine';
import { useDevSimulation } from '../../context/DevSimulationContext';
import { SimulationProbe } from '../dev/SimulationProbe';

interface TrackingStepIndicatorProps {
  currentStatus?: TrackingStatus | string;
  onSimulateStep?: (status: GranularOrderStatus) => void;
  allowSimulation?: boolean;
}

export const TrackingStepIndicator: React.FC<TrackingStepIndicatorProps> = ({
  currentStatus = 'delivering',
  onSimulateStep,
  allowSimulation = true
}) => {
  const { isSimulationAllowed, openDevAuthModal, isAdminDeveloper } = useDevSimulation();
  const effectiveAllowSimulation = Boolean(allowSimulation && isSimulationAllowed);
  const [showSimulator, setShowSimulator] = useState(false);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const statusConfig = getOrderStatusConfig(currentStatus);
  const activeKey = statusConfig.key;

  const handleStepClick = (step: { id: GranularOrderStatus; label: string }) => {
    if (!effectiveAllowSimulation) {
      setLockedNotice(`节点【${step.label}】已锁定：当前为非管理员视角，不可修改订单流转状态`);
      setTimeout(() => setLockedNotice(null), 3500);
      return;
    }
    onSimulateStep?.(step.id);
  };

  // Granular forward flow definition for horizontal visual stages
  const granularSteps: {
    id: GranularOrderStatus;
    stepNum: string;
    label: string;
    subText: string;
    icon: any;
    isCompleted: boolean;
    isActive: boolean;
  }[] = [
    {
      id: 'pending',
      stepNum: '01',
      label: '下单已付',
      subText: '已入队',
      icon: ClipboardList,
      isCompleted: activeKey !== 'pending' && !statusConfig.isException,
      isActive: activeKey === 'pending'
    },
    {
      id: 'cooking',
      stepNum: '02',
      label: '餐车接单',
      subText: activeKey === 'cooking' ? '炭火现制中' : '已接单',
      icon: ChefHat,
      isCompleted:
        !statusConfig.isException &&
        ['ready', 'rider_heading', 'waiting_pickup', 'picked_up', 'delivering', 'completed'].includes(activeKey),
      isActive: activeKey === 'cooking'
    },
    {
      id: 'ready',
      stepNum: '03',
      label: '制作完成',
      subText: activeKey === 'ready' ? '保温封装' : '现烤完毕',
      icon: PackageCheck,
      isCompleted:
        !statusConfig.isException &&
        ['rider_heading', 'waiting_pickup', 'picked_up', 'delivering', 'completed'].includes(activeKey),
      isActive: activeKey === 'ready'
    },
    {
      id: 'rider_heading',
      stepNum: '04',
      label: '赶往商家',
      subText: activeKey === 'rider_heading' ? '正在赶来' : '骑手已配',
      icon: Navigation,
      isCompleted:
        !statusConfig.isException &&
        ['waiting_pickup', 'picked_up', 'delivering', 'completed'].includes(activeKey),
      isActive: activeKey === 'rider_heading'
    },
    {
      id: 'waiting_pickup',
      stepNum: '05',
      label: '等待取餐',
      subText: activeKey === 'waiting_pickup' ? '已到店待核销' : '到店待取',
      icon: Clock,
      isCompleted:
        !statusConfig.isException &&
        ['picked_up', 'delivering', 'completed'].includes(activeKey),
      isActive: activeKey === 'waiting_pickup'
    },
    {
      id: 'picked_up',
      stepNum: '06',
      label: '骑手已取',
      subText: activeKey === 'picked_up' ? '装箱封签' : '已装箱',
      icon: ShoppingBag,
      isCompleted:
        !statusConfig.isException &&
        ['delivering', 'completed'].includes(activeKey),
      isActive: activeKey === 'picked_up'
    },
    {
      id: 'delivering',
      stepNum: '07',
      label: '配送中',
      subText: activeKey === 'delivering' ? '极速飞驰' : '专送中',
      icon: Bike,
      isCompleted: !statusConfig.isException && activeKey === 'completed',
      isActive: activeKey === 'delivering'
    },
    {
      id: 'completed',
      stepNum: '08',
      label: '已送达',
      subText: activeKey === 'completed' ? '妥投交付' : '终点',
      icon: MapPin,
      isCompleted: activeKey === 'completed',
      isActive: activeKey === 'completed'
    }
  ];

  return (
    <SimulationProbe pointId="SIM_ORDER_FLOW_MACHINE">
      <div className="bg-white border-b border-[#ededeb] relative select-none">
        {/* 1. Exception / Dispatch Intervention Alert Banner (If abnormal/branch flow) */}
      {statusConfig.isException && (
        <div className="px-3.5 pt-3 pb-1">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-none border flex items-start gap-2.5 shadow-2xs ${
              activeKey === 'merchant_rejected'
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : activeKey === 'rider_rejected'
                ? 'bg-orange-50 border-orange-200 text-orange-950'
                : activeKey === 'reassigning_rider'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : activeKey === 'cancel_requested'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-neutral-100 border-neutral-300 text-neutral-800'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {activeKey === 'merchant_rejected' ? (
                <Ban className="w-5 h-5 text-rose-600" />
              ) : activeKey === 'rider_rejected' ? (
                <ShieldAlert className="w-5 h-5 text-orange-600 animate-pulse" />
              ) : activeKey === 'reassigning_rider' ? (
                <RefreshCw className="w-5 h-5 text-amber-600 animate-spin" />
              ) : activeKey === 'cancel_requested' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 animate-bounce" />
              ) : (
                <Clock className="w-5 h-5 text-neutral-600" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-xs sm:text-sm tracking-tight flex items-center gap-1.5">
                  <span>{statusConfig.label}</span>
                  <span className="text-[10px] font-sans px-1.5 py-0.2 rounded-none font-bold border uppercase bg-white/80">
                    {statusConfig.badgeText}
                  </span>
                </span>
                <span className="text-[10.5px] font-sans opacity-70">异常调度</span>
              </div>
              <p className="text-[11px] mt-1 opacity-90 leading-relaxed">
                {statusConfig.subText}
              </p>
              <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                {activeKey === 'reassigning_rider' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                    已追加 ¥2.00 调度补贴 · 锁定周边 800m 骑手
                  </span>
                )}
                {activeKey === 'cancel_requested' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-medium">
                    待餐车主理人审核中 · 审核通过后原路秒退
                  </span>
                )}
                {activeKey === 'merchant_rejected' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-200/70 text-rose-900 font-medium">
                    实付款项已原路退回至微信/银联账户
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2. Active Step Highlight Bar (Current Step Badge + Subtitle) */}
      <div className="px-3.5 pt-3 pb-1 flex items-center justify-between gap-2 border-b border-neutral-100">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-medium text-neutral-500 shrink-0">当前流转节点:</span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${statusConfig.badgeClass}`}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: statusConfig.dotColor }}
            />
            <span>{statusConfig.label}</span>
          </span>
        </div>

        {/* Toggle dynamic state simulation panel or Non-admin Lock Badge */}
        {effectiveAllowSimulation ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-sans font-bold">
              <Unlock className="w-2.5 h-2.5" /> 管理员可改
            </span>
            <button
              type="button"
              onClick={() => setShowSimulator((prev) => !prev)}
              className="text-[10.5px] text-neutral-600 hover:text-black font-medium flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-all cursor-pointer shadow-2xs"
              title="查看或模拟切换所有细化流程节点"
            >
              <SlidersHorizontal className="w-3 h-3 text-neutral-500" />
              <span>流转模拟 ({ALL_GRANULAR_FLOW_STEPS.length} 状态)</span>
              {showSimulator ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openDevAuthModal()}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 text-[10.5px] font-medium border border-neutral-200/80 transition-all cursor-pointer shadow-2xs shrink-0"
            title="当前为普通食客视图，流转节点已锁定；点击唤出管理员登录"
          >
            <Lock className="w-3 h-3 text-neutral-500" />
            <span>节点已锁定</span>
            <span className="text-[9.5px] text-neutral-400 font-normal underline">管理员登录</span>
          </button>
        )}
      </div>

      {/* Non-Admin Locked Intervention Alert Banner */}
      <AnimatePresence>
        {lockedNotice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3.5 pt-2 overflow-hidden"
          >
            <div className="bg-amber-50 border border-amber-200 text-amber-950 px-3 py-2 rounded-none text-xs flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium text-[11px] leading-snug">{lockedNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => openDevAuthModal()}
                className="px-2 py-0.5 rounded-none bg-white text-amber-900 font-bold border border-amber-300 text-[10.5px] hover:bg-amber-100 shrink-0 cursor-pointer shadow-2xs"
              >
                管理员认证
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Granular Dynamic Step Selector (Simulation Bar) */}
      <AnimatePresence>
        {showSimulator && effectiveAllowSimulation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-neutral-900 text-white p-3 space-y-2.5 overflow-hidden"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>全状态流程模拟器 · 点击即时流转切换</span>
              </span>
              <span className="text-[10px] text-neutral-400 font-sans">
                即时同步订单与跟踪视图
              </span>
            </div>

            {/* Forward Normal Flow */}
            <div className="space-y-1">
              <span className="text-[10px] text-neutral-400 font-semibold block">
                正向流转全节点（从餐车接单到送达）：
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_GRANULAR_FLOW_STEPS.filter((s) => s.category === '正向主流程').map((step) => {
                  const isCurrent = activeKey === step.key;
                  return (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => onSimulateStep?.(step.key)}
                      className={`px-2 py-1 rounded-none text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                        isCurrent
                          ? 'bg-amber-400 text-neutral-950 font-bold shadow-xs scale-105'
                          : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white'
                      }`}
                    >
                      {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-neutral-950" />}
                      <span>{step.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Abnormal / Branch Flow */}
            <div className="space-y-1 pt-1 border-t border-neutral-800">
              <span className="text-[10px] text-rose-300 font-semibold block">
                逆向分支与异常调度节点（客户终止 / 拒单 / 切换骑手）：
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_GRANULAR_FLOW_STEPS.filter((s) => s.category === '异常与调度分支').map((step) => {
                  const isCurrent = activeKey === step.key;
                  return (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => onSimulateStep?.(step.key)}
                      className={`px-2 py-1 rounded-none text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                        isCurrent
                          ? 'bg-rose-500 text-white font-bold shadow-xs scale-105'
                          : 'bg-neutral-800 text-rose-200 hover:bg-neutral-700 hover:text-white'
                      }`}
                    >
                      {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      <span>{step.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Horizontal Granular Timeline (Scrollable & Responsive) */}
      <div className="p-3 py-4 overflow-x-auto notion-scrollbar relative">
        {/* Guide connecting track */}
        <div className="min-w-[580px] sm:min-w-0 relative">
          <div className="absolute top-[38px] left-6 right-6 h-[2px] bg-neutral-200 z-0 pointer-events-none" />

          <div className="grid grid-cols-8 gap-1 text-center items-start relative z-10">
            {granularSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  onClick={() => handleStepClick(step)}
                  className={`flex flex-col items-center select-none transition-transform ${
                    effectiveAllowSimulation
                      ? 'cursor-pointer group hover:scale-105'
                      : 'cursor-default group/locked'
                  }`}
                  title={
                    effectiveAllowSimulation
                      ? `[管理员] 点击切换至【${step.label}】状态`
                      : `【${step.label}】(当前为非管理员，流转节点已锁定不可修改)`
                  }
                >
                  {/* Step Number */}
                  <div className="h-4.5 flex items-center justify-center mb-1">
                    {step.isActive ? (
                      <span className="bg-[#181816] text-white text-[9px] font-bold font-sans px-1 py-0.2 rounded-none">
                        {step.stepNum}
                      </span>
                    ) : (
                      <span className="bg-[#f0f0ee] text-[#787872] text-[9px] font-bold font-sans px-1 py-0.2 rounded-none">
                        {step.stepNum}
                      </span>
                    )}
                  </div>

                  {/* Step Circle with Ripple or Check Badge */}
                  <div className="relative my-0.5 flex items-center justify-center">
                    {step.isActive ? (
                      <div className="relative flex items-center justify-center">
                        <motion.div
                          animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
                          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeOut' }}
                          className="absolute w-9 h-9 rounded-full border-2 border-black pointer-events-none"
                        />
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shadow-md relative z-10 border-2 border-white">
                          <Icon className="w-4 h-4 stroke-[2.2]" />
                        </div>
                      </div>
                    ) : step.isCompleted ? (
                      <div className="relative">
                        <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-xs border-2 border-white">
                          <Icon className="w-3.5 h-3.5 stroke-[2]" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#10b981] text-white flex items-center justify-center text-[7px] border border-white rounded-full shadow-2xs">
                          <Check className="w-2 h-2 stroke-[3.5]" />
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`w-7 h-7 rounded-full bg-[#f0f0ee] text-[#9ca3af] transition-colors flex items-center justify-center border-2 border-white ${
                          effectiveAllowSimulation ? 'group-hover:bg-[#e4e4e0]' : ''
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 stroke-[1.8]" />
                      </div>
                    )}
                  </div>

                  {/* Step Label */}
                  <span
                    className={`text-[11.5px] mt-1 leading-tight ${
                      step.isActive
                        ? 'font-black text-black'
                        : step.isCompleted
                        ? 'font-bold text-neutral-800'
                        : 'font-medium text-[#787770]'
                    }`}
                  >
                    {step.label}
                  </span>

                  {/* Step Subtext */}
                  <span
                    className={`text-[9.5px] mt-0.5 line-clamp-1 leading-tight ${
                      step.isActive
                        ? 'text-[#ea580c] font-bold'
                        : step.isCompleted
                        ? 'text-[#059669] font-medium'
                        : 'text-[#9ca3af] font-normal'
                    }`}
                  >
                    {step.subText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Non-Admin Security Lock Hint at Timeline Footer */}
        {!effectiveAllowSimulation && (
          <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400 px-0.5">
            <span className="flex items-center gap-1 font-sans">
              <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
              <span>食客实时追踪 · 节点流转已受保护锁定</span>
            </span>
            <button
              type="button"
              onClick={() => openDevAuthModal()}
              className="text-neutral-500 hover:text-neutral-900 underline font-medium cursor-pointer transition-colors"
            >
              管理员身份验证
            </button>
          </div>
        )}
      </div>
    </div>
  </SimulationProbe>
);
};
