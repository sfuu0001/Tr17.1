/**
 * Urban Radar 流动餐车 GPS 极速专送平台 - 五维自动化安全中枢态势看板 (Automated Sentinel Dashboard)
 * 涵盖：感知 (Sensing) -> 定位 (Localization) -> 判断 (Inference) -> 决策 (Decision) -> 控制安全 (Safety & Control)
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Navigation,
  Cpu,
  Flame,
  Wifi,
  WifiOff,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Lock,
  ArrowRight,
  Radio,
  Zap
} from 'lucide-react';
import {
  automatedSentinel,
  SentinelSystemState,
  SentinelThreatLevel
} from '../../utils/automatedSentinelEngine';

interface AutomatedSentinelDashboardProps {
  showToast: (msg: string) => void;
}

export const AutomatedSentinelDashboard: React.FC<AutomatedSentinelDashboardProps> = ({
  showToast
}) => {
  const [sentinelState, setSentinelState] = useState<SentinelSystemState>(() =>
    automatedSentinel.getState()
  );
  const [activeTab, setActiveTab] = useState<'cockpit' | 'decisions' | 'simulator'>('cockpit');

  useEffect(() => {
    const unsubscribe = automatedSentinel.subscribe((next) => {
      setSentinelState({ ...next });
    });
    return () => unsubscribe();
  }, []);

  const getThreatBadge = (level: SentinelThreatLevel) => {
    switch (level) {
      case 'SECURE':
        return {
          label: '安全畅通 (SECURE)',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500'
        };
      case 'GUARDED':
        return {
          label: '预警防御 (GUARDED)',
          color: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'ELEVATED':
        return {
          label: '高负荷戒备 (ELEVATED)',
          color: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500'
        };
      case 'CRITICAL':
        return {
          label: '严重熔断阻断 (CRITICAL)',
          color: 'bg-red-50 text-red-800 border-red-200',
          dot: 'bg-red-500 animate-ping'
        };
    }
  };

  const threatBadge = getThreatBadge(sentinelState.threatLevel);

  return (
    <div className="space-y-4">
      {/* 1. 顶部总览状态栏 */}
      <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                sentinelState.threatLevel === 'SECURE'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : sentinelState.threatLevel === 'CRITICAL'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              {sentinelState.threatLevel === 'SECURE' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-[#1a1a17]">
                  五维自动化安全与自闭环控制中枢
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${threatBadge.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${threatBadge.dot}`} />
                  {threatBadge.label}
                </span>
              </div>
              <p className="text-xs text-[#787774] mt-0.5">
                感知 (Sensing) ➔ 定位 (Localization) ➔ 判断 (Inference) ➔ 决策 (Decision) ➔ 控制安全 (Safety & Control)
              </p>
            </div>
          </div>

          {/* 综合安全指数 */}
          <div className="flex items-center gap-4 bg-[#fbfbfa] border border-[#ecebe8] px-4 py-2.5 rounded-lg">
            <div className="text-right">
              <div className="text-[11px] text-[#787774] font-medium">全域安全指数</div>
              <div className="text-xl font-bold font-mono text-[#1a1a17]">
                {sentinelState.overallHealthScore}
                <span className="text-xs text-[#787774] font-normal"> / 100</span>
              </div>
            </div>
            <div className="w-12 h-12 relative flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#e3e2e0]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={
                    sentinelState.overallHealthScore >= 80
                      ? 'text-emerald-500'
                      : sentinelState.overallHealthScore >= 60
                      ? 'text-amber-500'
                      : 'text-red-500'
                  }
                  strokeDasharray={`${sentinelState.overallHealthScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <Zap className="w-4 h-4 text-[#37352f] absolute" />
            </div>
          </div>
        </div>

        {/* 标签栏 */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#f1f1ef]">
          <button
            type="button"
            onClick={() => setActiveTab('cockpit')}
            className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer ${
              activeTab === 'cockpit'
                ? 'bg-[#37352f] text-white'
                : 'text-[#787774] hover:bg-[#f7f7f5]'
            }`}
          >
            五维态势座舱
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('decisions')}
            className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'decisions'
                ? 'bg-[#37352f] text-white'
                : 'text-[#787774] hover:bg-[#f7f7f5]'
            }`}
          >
            <span>自主决策执行池</span>
            {sentinelState.activeDecisions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white">
                {sentinelState.activeDecisions.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'bg-[#37352f] text-white'
                : 'text-[#787774] hover:bg-[#f7f7f5]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>自适应安全沙盒演练</span>
          </button>
        </div>
      </div>

      {/* 2. 主内容区 */}
      {activeTab === 'cockpit' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 维度 1: 感知层 (Sensing) */}
          <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1a1a17]">1. 感知层 (Sensing)</h3>
                  <p className="text-[11px] text-[#787774]">物理环境与负载探针</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                100% 实时上报
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#f7f7f5]">
                <span className="text-[#787774]">后厨未出品积压单</span>
                <span
                  className={`font-mono font-bold ${
                    sentinelState.telemetry.kdsBacklogCount >= 10
                      ? 'text-red-600'
                      : 'text-[#1a1a17]'
                  }`}
                >
                  {sentinelState.telemetry.kdsBacklogCount} 单
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#f7f7f5]">
                <span className="text-[#787774]">平均预计出餐等待</span>
                <span className="font-mono font-bold text-[#1a1a17]">
                  {sentinelState.telemetry.kdsAverageWaitMinutes} 分钟
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#f7f7f5]">
                <span className="text-[#787774]">网络通信状态 / 延迟</span>
                <span className="font-mono text-xs flex items-center gap-1">
                  {sentinelState.telemetry.networkStatus === 'online' ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-red-600" />
                  )}
                  <span>{sentinelState.telemetry.rttLatencyMs}ms</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-[#787774]">离线待同步事务挤压</span>
                <span className="font-mono font-semibold text-[#1a1a17]">
                  {sentinelState.telemetry.pendingOfflineTxCount} 笔
                </span>
              </div>
            </div>
          </div>

          {/* 维度 2: 定位层 (Localization) */}
          <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1a1a17]">2. 定位层 (Localization)</h3>
                  <p className="text-[11px] text-[#787774]">驻点网格与电子围栏</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  sentinelState.telemetry.isGeofenceCompliant
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {sentinelState.telemetry.isGeofenceCompliant ? '围栏内合规' : '越界脱圈'}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#f7f7f5]">
                <span className="text-[#787774]">核准驻点中心</span>
                <span className="font-mono text-[11px] text-[#1a1a17]">
                  [{sentinelState.telemetry.approvedGeofenceCenter.join(', ')}]
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#f7f7f5]">
                <span className="text-[#787774]">许可营运半径</span>
                <span className="font-mono font-semibold text-[#1a1a17]">
                  {sentinelState.telemetry.approvedGeofenceRadiusMeters} 米
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#f7f7f5]">
                <span className="text-[#787774]">当前漂移位移</span>
                <span
                  className={`font-mono font-bold ${
                    sentinelState.telemetry.currentDriftDistanceMeters >
                    sentinelState.telemetry.approvedGeofenceRadiusMeters
                      ? 'text-red-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {sentinelState.telemetry.currentDriftDistanceMeters} 米
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-[#787774]">单据状态追踪机</span>
                <span className="text-emerald-700 font-semibold text-[11px]">
                  FSM 全域锁存对齐
                </span>
              </div>
            </div>
          </div>

          {/* 维度 3: 判断层 (Inference) */}
          <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1a1a17]">3. 判断层 (Inference)</h3>
                  <p className="text-[11px] text-[#787774]">风险推演与阈值判决</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                实时推理
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#f7f7f5]">
                <span className="text-[#787774]">出餐爆单风险等级</span>
                <span
                  className={`font-bold ${
                    sentinelState.telemetry.isKitchenOverloaded
                      ? 'text-red-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {sentinelState.telemetry.isKitchenOverloaded ? '超荷临界' : '正常受控'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#f7f7f5]">
                <span className="text-[#787774]">驻点偏航违规判定</span>
                <span
                  className={`font-bold ${
                    !sentinelState.telemetry.isGeofenceCompliant
                      ? 'text-red-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {!sentinelState.telemetry.isGeofenceCompliant ? '脱圈违章' : '合法驻留'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#f7f7f5]">
                <span className="text-[#787774]">近1小时退款异动</span>
                <span className="font-mono font-semibold text-[#1a1a17]">
                  {sentinelState.telemetry.hourlyRefundCount} 笔
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-[#787774]">大额疑似刷单威胁</span>
                <span
                  className={`font-mono font-bold ${
                    sentinelState.telemetry.suspiciousTransactionsDetected > 0
                      ? 'text-red-600'
                      : 'text-neutral-500'
                  }`}
                >
                  {sentinelState.telemetry.suspiciousTransactionsDetected} 笔
                </span>
              </div>
            </div>
          </div>

          {/* 维度 4: 决策层 (Decision) */}
          <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1a1a17]">4. 决策层 (Decision)</h3>
                  <p className="text-[11px] text-[#787774]">自适应弹性调节策略</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                自主调控
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#f7f7f5]">
                <span className="text-[#787774]">自适应专送服务半径</span>
                <span className="font-mono font-bold text-indigo-700">
                  {sentinelState.activeDynamicDeliveryRadiusKm} km
                  {sentinelState.activeDynamicDeliveryRadiusKm < 3.5 && (
                    <span className="text-red-600 text-[10px] ml-1">(防超载已收缩)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#f7f7f5]">
                <span className="text-[#787774]">前台自适应附加等候</span>
                <span className="font-mono font-bold text-[#1a1a17]">
                  +{sentinelState.adaptiveExtraQueueMinutes} 分钟
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#f7f7f5]">
                <span className="text-[#787774]">线上进单总门禁准入</span>
                <span
                  className={`font-semibold ${
                    sentinelState.isOnlineOrderAdmissionPaused
                      ? 'text-red-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {sentinelState.isOnlineOrderAdmissionPaused ? '自动暂停接单' : '正常开放进单'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-[#787774]">全端联动总线状态</span>
                <span className="text-emerald-700 font-mono text-[11px] flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>BroadcastChannel Active</span>
                </span>
              </div>
            </div>
          </div>

          {/* 维度 5: 控制安全层 (Safety & Control) */}
          <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1a1a17]">5. 控制安全层 (Control & Safety)</h3>
                  <p className="text-[11px] text-[#787774]">自动化熔断拦截与自愈闭环</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                双保险执行器
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-[#fbfbfa] border border-[#ecebe8] p-3 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1a1a17]">本地离线数据金库 (Offline Vault)</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      sentinelState.isOfflineSafetyVaultEngaged
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {sentinelState.isOfflineSafetyVaultEngaged ? '挂载保护中' : '待命'}
                  </span>
                </div>
                <p className="text-[11px] text-[#787774]">
                  当网络波动断连时，自动阻断远程写失败，将单据写透本地 IndexedDB 沙箱，网络恢复后自愈对账。
                </p>
              </div>

              <div className="bg-[#fbfbfa] border border-[#ecebe8] p-3 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1a1a17]">资金退款二级熔断隔离</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      sentinelState.telemetry.suspiciousTransactionsDetected > 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {sentinelState.telemetry.suspiciousTransactionsDetected > 0
                      ? '已触发拦截池'
                      : '正常监控'}
                  </span>
                </div>
                <p className="text-[11px] text-[#787774]">
                  出现多笔频发退款或单笔巨额异常撤回时，阻断即时返还，强制锁定必须经由店长PIN及平台审批。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 活跃自主决策执行列表 */}
      {activeTab === 'decisions' && (
        <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1a1a17]">
              当前活跃的自主安全决策 ({sentinelState.activeDecisions.length})
            </h3>
            <span className="text-xs text-[#787774]">
              系统已根据五维指标动态介入执行
            </span>
          </div>

          {sentinelState.activeDecisions.length === 0 ? (
            <div className="p-8 text-center text-[#787774] border border-dashed border-[#e3e2e0] rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="text-xs font-semibold text-[#1a1a17]">当前各维度运行正常，无熔断与干预策略</div>
              <div className="text-[11px] text-[#787774] mt-0.5">
                系统持续通过感知探针监听后厨、网络、GPS 和交易风控。
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sentinelState.activeDecisions.map((decision) => (
                <div
                  key={decision.policyId}
                  className="border border-[#e3e2e0] rounded-lg p-3 sm:p-4 bg-[#fbfbfa] space-y-2"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#37352f] text-white">
                        {decision.dimension}
                      </span>
                      <h4 className="text-xs font-bold text-[#1a1a17]">{decision.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#787774]">
                        {new Date(decision.triggeredAt).toLocaleTimeString()}
                      </span>
                      {decision.isAutoReversible && (
                        <button
                          type="button"
                          onClick={() => {
                            automatedSentinel.executeManualRecoveryAction(decision.policyId);
                            showToast(`已执行策略 [${decision.policyId}] 紧急自愈复位`);
                          }}
                          className="px-2 py-1 rounded bg-white hover:bg-[#f7f7f5] border border-[#d3d1cb] text-[11px] font-semibold text-[#37352f] flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>一键自愈复位</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-[#5a5854] bg-white p-2.5 rounded border border-[#ecebe8] space-y-1">
                    <div>
                      <span className="font-semibold text-[#1a1a17]">判决推理依据：</span>
                      {decision.inferenceRationale}
                    </div>
                    <div className="text-indigo-800 font-medium flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 shrink-0" />
                      <span>已生效自动化控制：{decision.automatedActionApplied}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. 仿真沙盒：手动触发不同场景演练五维自动化反应 */}
      {activeTab === 'simulator' && (
        <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#1a1a17]">五维自动化自适应沙盒实测</h3>
            <p className="text-xs text-[#787774] mt-0.5">
              点击以下模拟故障信号，检验系统「感知 ➔ 定位 ➔ 判断 ➔ 决策 ➔ 控制安全」自动化闭环反应。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 模拟 1: 后厨严重爆单 */}
            <div className="p-3 border border-[#e3e2e0] rounded-lg bg-[#fbfbfa] flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-800">
                  <Flame className="w-4 h-4" />
                  <span>后厨极速爆单超载</span>
                </div>
                <p className="text-[11px] text-[#787774] mt-1">
                  注入待出餐 15 单，等待 35 分钟。观察配送半径收缩至 1.5km 与出餐缓冲 +25m。
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  automatedSentinel.reportKitchenStatus(15, 35);
                  showToast('已模拟注入：后厨超载爆单 15 单！自动化限流已触发');
                }}
                className="w-full py-1.5 rounded bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold cursor-pointer"
              >
                注入爆单超载
              </button>
            </div>

            {/* 模拟 2: GPS 脱圈外摆 */}
            <div className="p-3 border border-[#e3e2e0] rounded-lg bg-[#fbfbfa] flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                  <Navigation className="w-4 h-4" />
                  <span>餐车脱圈移位违规</span>
                </div>
                <p className="text-[11px] text-[#787774] mt-1">
                  漂移 650 米（超出 500 米围栏红线）。观察系统自动暂停线上接单与告警。
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  automatedSentinel.reportTruckGPS([121.485, 31.238]);
                  showToast('已模拟注入：餐车偏离驻点 650 米！脱圈自动熔断已触发');
                }}
                className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                注入脱圈偏航
              </button>
            </div>

            {/* 模拟 3: 网络中断与离线堆积 */}
            <div className="p-3 border border-[#e3e2e0] rounded-lg bg-[#fbfbfa] flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                  <WifiOff className="w-4 h-4" />
                  <span>通信中断与离线堆积</span>
                </div>
                <p className="text-[11px] text-[#787774] mt-1">
                  模拟网络完全中断，离线排队 12 笔。观察离线金库挂载与防丢单保护。
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  automatedSentinel.reportNetworkPulse('offline', 9999, 12);
                  showToast('已模拟注入：网络失联断网！离线安全金库已挂载');
                }}
                className="w-full py-1.5 rounded bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-bold cursor-pointer"
              >
                注入断网挤压
              </button>
            </div>

            {/* 模拟 4: 异动高频退款 */}
            <div className="p-3 border border-[#e3e2e0] rounded-lg bg-[#fbfbfa] flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span>异动退款资金防刷</span>
                </div>
                <p className="text-[11px] text-[#787774] mt-1">
                  模拟单小时连续 6 次退款与大额提回。观察自动阻断即时退款转入审核池。
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  automatedSentinel.reportRefundEvent(260, '批量取消重试');
                  automatedSentinel.reportRefundEvent(180, '大额菜品异议');
                  showToast('已模拟注入：资金异常退款！二级人工审核熔断已激活');
                }}
                className="w-full py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                注入异常退款
              </button>
            </div>
          </div>

          {/* 一键全系统自愈复原 */}
          <div className="pt-2 border-t border-[#f1f1ef] flex justify-end">
            <button
              type="button"
              onClick={() => {
                automatedSentinel.reportKitchenStatus(3, 8);
                automatedSentinel.reportTruckGPS([121.4737, 31.2304]);
                automatedSentinel.reportNetworkPulse('online', 38, 0);
                automatedSentinel.executeManualRecoveryAction('POL-RISK-REFUND-SURGE');
                showToast('全系统五维指标已一键安全复位至绿标最佳状态');
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>一键恢复全系统绿标常态</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
