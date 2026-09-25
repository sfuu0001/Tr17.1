import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cloud,
  Server,
  Layers,
  Database,
  Archive,
  Zap,
  Activity,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Cpu,
  Lock,
  FileCode2,
  Sliders,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  History
} from 'lucide-react';
import {
  PipelineTierId,
  CloudPipelineTierNode,
  TieringLifecyclePolicy,
  PipelineProbeEvent,
  getPipelineTiers,
  getLifecyclePolicies,
  getPipelineProbeEvents,
  triggerPipelineStressTest,
  triggerLifecycleExecution,
  EVENT_CLOUD_PIPELINE_CHANGED
} from '../../../utils/cloudPipelineEngine';

interface CloudServiceTieringPipelineProps {
  showToast: (msg: string) => void;
}

export const CloudServiceTieringPipeline: React.FC<CloudServiceTieringPipelineProps> = ({ showToast }) => {
  const [tiers, setTiers] = useState<CloudPipelineTierNode[]>(getPipelineTiers());
  const [policies, setPolicies] = useState<TieringLifecyclePolicy[]>(getLifecyclePolicies());
  const [probeEvents, setProbeEvents] = useState<PipelineProbeEvent[]>(getPipelineProbeEvents());
  const [selectedTierId, setSelectedTierId] = useState<PipelineTierId>('T3_TX_DB');
  const [isSimulating, setIsSimulating] = useState(false);

  // 刷新状态
  useEffect(() => {
    const handleUpdate = () => {
      setTiers(getPipelineTiers());
      setPolicies(getLifecyclePolicies());
      setProbeEvents(getPipelineProbeEvents());
    };
    window.addEventListener(EVENT_CLOUD_PIPELINE_CHANGED, handleUpdate);
    return () => window.removeEventListener(EVENT_CLOUD_PIPELINE_CHANGED, handleUpdate);
  }, []);

  const selectedTier = tiers.find((t) => t.id === selectedTierId) || tiers[0];

  // 触发高并发压测演练
  const handleRunStressTest = (tierId: PipelineTierId) => {
    setIsSimulating(true);
    const res = triggerPipelineStressTest(tierId);
    setTimeout(() => {
      setIsSimulating(false);
      if (res.success) {
        showToast(res.message);
      }
    }, 400);
  };

  // 触发手动生命周期下沉
  const handleRunPolicyMigration = (policyId: string) => {
    const res = triggerLifecycleExecution(policyId);
    if (res.success) {
      showToast(`已成功执行冷热数据迁移，本次下沉 ${res.migratedDelta} 条合规历史数据至底层审计池`);
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部总览卡片：腾讯云基础设施架构概览 */}
      <div className="bg-gradient-to-r from-[#181816] to-[#252522] border border-[#383834] rounded-xl p-4 text-white shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                <span>腾讯云生态 5-Tier 云服务数据分层链路架构</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 font-normal">
                  ap-shanghai
                </span>
              </h2>
            </div>
            <p className="text-xs text-neutral-300 max-w-3xl leading-relaxed">
              基于已实装的静态网站托管存储桶、COS 对象存储与 CloudBase 事务集群，实现从边缘接入防刷、10Hz 高频轨迹流、ACID 业务事务，到海量存证哈希与冷审计链的全链路闭环流转。
            </p>
          </div>

          {/* 关键资源快速定位胶囊 */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10">
              <div className="text-[10px] text-neutral-400">静态托管专属域名</div>
              <div className="text-emerald-300 truncate max-w-[220px]">
                tc100-d9gz0e2ko5929e360...tcloudbaseapp.com
              </div>
            </div>
            <div className="bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10">
              <div className="text-[10px] text-neutral-400">华东·上海 COS 存证桶</div>
              <div className="text-amber-300 truncate max-w-[200px]">
                7463-tc100-d9gz0e2ko5929e360...
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Tier 水平全景分层链路拓扑 */}
      <div className="bg-white border border-[#e2e3e1] rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-neutral-800" />
            <h3 className="text-xs font-bold text-[#1a1a17]">全域数据分层链路流转拓扑</h3>
            <span className="text-[10px] text-neutral-400 font-mono">Data Tiering Pipeline Topology</span>
          </div>
          <span className="text-[11px] font-mono text-neutral-500">
            点击链路节点查看详细探针指标与控制选项
          </span>
        </div>

        {/* 5 个分层卡片流水线 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 relative">
          {tiers.map((tier, idx) => {
            const isSelected = tier.id === selectedTierId;
            return (
              <div
                key={tier.id}
                onClick={() => setSelectedTierId(tier.id)}
                className={`relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-neutral-900 border-neutral-900 text-white shadow-md ring-2 ring-neutral-400/30'
                    : 'bg-[#fafaf8] border-neutral-200/90 text-neutral-800 hover:border-neutral-400 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-neutral-200/70 text-neutral-700'
                    }`}>
                      Tier {idx + 1}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-500 font-bold">
                      {tier.healthScore}%
                    </span>
                  </div>

                  <h4 className={`text-xs font-black tracking-tight mb-1 ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                    {tier.name}
                  </h4>
                  <div className={`text-[10px] font-mono mb-2 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {tier.badge}
                  </div>

                  <p className={`text-[11px] leading-snug line-clamp-2 mb-3 ${isSelected ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    {tier.roleDescription}
                  </p>
                </div>

                <div className="border-t border-white/10 pt-2 space-y-1 font-mono text-[10px]">
                  <div className="flex justify-between">
                    <span className={isSelected ? 'text-neutral-400' : 'text-neutral-500'}>延迟 SLA:</span>
                    <span className="font-bold text-emerald-400">{tier.slaLatencyMs}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isSelected ? 'text-neutral-400' : 'text-neutral-500'}>吞吐 QPS:</span>
                    <span className="font-bold">{tier.throughputQps.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isSelected ? 'text-neutral-400' : 'text-neutral-500'}>已用存储:</span>
                    <span className="truncate max-w-[90px]">{tier.storageUsedText.split(' ')[0]}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 选定 Tier 的高精探针指标与控制台 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧：选定分层的高级配置与压测控制 */}
        <div className="lg:col-span-2 bg-white border border-[#e2e3e1] rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <h3 className="text-sm font-black text-neutral-900">
                  【{selectedTier.name}】实时链路探针与承载配置
                </h3>
              </div>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">
                {selectedTier.enName} · 资源端点: {selectedTier.resourceEndpoint}
              </p>
            </div>

            <button
              type="button"
              disabled={isSimulating}
              onClick={() => handleRunStressTest(selectedTier.id)}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>{isSimulating ? '压测注水中...' : '注入高并发突发脉冲'}</span>
            </button>
          </div>

          {/* 四项关键参数 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#fbfbf9] p-3 rounded-lg border border-neutral-200">
              <div className="text-neutral-500 mb-1">主承载服务组件</div>
              <div className="font-bold text-neutral-800 text-[11px]">
                {selectedTier.primaryService}
              </div>
            </div>

            <div className="bg-[#fbfbf9] p-3 rounded-lg border border-neutral-200">
              <div className="text-neutral-500 mb-1">当前 SLA 往返延迟</div>
              <div className="text-base font-black text-emerald-600 font-mono">
                {selectedTier.slaLatencyMs} ms
              </div>
            </div>

            <div className="bg-[#fbfbf9] p-3 rounded-lg border border-neutral-200">
              <div className="text-neutral-500 mb-1">当前并发吞吐量</div>
              <div className="text-base font-black text-neutral-900 font-mono">
                {selectedTier.throughputQps.toLocaleString()} QPS
              </div>
            </div>

            <div className="bg-[#fbfbf9] p-3 rounded-lg border border-neutral-200">
              <div className="text-neutral-500 mb-1">存储开销评级</div>
              <div className="text-base font-black text-indigo-600 font-mono">
                {selectedTier.storageCostLevel}
              </div>
            </div>
          </div>

          {/* 承载的数据实体与安全机制 */}
          <div className="space-y-2 text-xs">
            <div className="font-bold text-neutral-700">该层级核心承载数据模型：</div>
            <div className="flex flex-wrap gap-1.5">
              {selectedTier.dataTypes.map((dt, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded bg-[#f7f6f3] border border-[#e2e3e1] text-neutral-700 text-[11px]"
                >
                  {dt}
                </span>
              ))}
            </div>

            <div className="pt-2">
              <span className="font-bold text-neutral-700">安全与防篡改防御机制：</span>
              <div className="mt-1 p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-600 font-mono text-[11px] flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{selectedTier.securityMechanism}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：实时探针自检与事件日志流 */}
        <div className="bg-white border border-[#e2e3e1] rounded-xl p-4 shadow-2xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-neutral-900">实时链路探针与存证日志</h4>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">实时事件流</span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {probeEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 rounded-lg border border-neutral-200/80 bg-[#fbfbf9] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-neutral-400">{evt.timestamp}</span>
                    <span className={`text-[9px] font-mono px-1 rounded font-bold ${
                      evt.level === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : evt.level === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {evt.eventType}
                    </span>
                  </div>
                  <div className="font-medium text-neutral-800 text-[11px]">
                    {evt.message}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 break-all">
                    {evt.details}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-100 text-[10px] text-neutral-400 flex items-center justify-between">
            <span>腾讯云上海区域监控探针</span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              全链路正常
            </span>
          </div>
        </div>
      </div>

      {/* 数据生命周期分层策略下沉控制台 */}
      <div className="bg-white border border-[#e2e3e1] rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-[#1a1a17]">
              数据生命周期下沉规则策略库 (Data Lifecycle Tiering Policies)
            </h3>
          </div>
          <span className="text-[11px] text-neutral-500">
            自动根据数据时效从热态内存流向冷归档与区块链哈希盖戳
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f7f6f3] border-b border-[#e2e3e1] text-[#787774] font-medium">
                <th className="py-2.5 px-3">策略名称</th>
                <th className="py-2.5 px-3">数据流向 (源 ➔ 目标)</th>
                <th className="py-2.5 px-3">触发条件与下沉周期</th>
                <th className="py-2.5 px-3">防篡改验真</th>
                <th className="py-2.5 px-3">最近执行时间</th>
                <th className="py-2.5 px-3">累计归档迁移量</th>
                <th className="py-2.5 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f1ef]">
              {policies.map((pol) => (
                <tr key={pol.id} className="hover:bg-[#fafaf8] transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-neutral-900">{pol.name}</div>
                    <div className="text-[10px] font-mono text-neutral-400">{pol.id}</div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
                        {pol.sourceTier}
                      </span>
                      <ArrowRight className="w-3 h-3 text-neutral-400" />
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                        {pol.targetTier}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="text-neutral-700 text-[11px]">{pol.triggerCondition}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      保留周期: {pol.retentionDays} 天
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    {pol.sm3Verification ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        SM3 哈希验真
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-400 font-mono">标准传输</span>
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono text-[11px] text-neutral-600">
                    {pol.lastExecutedTime}
                  </td>

                  <td className="py-3 px-3 font-mono text-[11px] font-bold text-neutral-800">
                    {pol.migratedCount.toLocaleString()} 条
                  </td>

                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRunPolicyMigration(pol.id)}
                      className="px-2.5 py-1 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 text-emerald-600" />
                      <span>立即执行下沉</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
