import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Cloud,
  Database,
  Search,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Terminal,
  FileText,
  Download,
  Filter,
  Sparkles,
  Layers,
  Lock,
  Compass,
  Clock,
  Smartphone,
  Truck,
  Bike,
  Radio,
  Eye,
  Bug,
  RotateCcw,
  Check,
  X,
  Share2,
  ExternalLink,
  Info
} from 'lucide-react';
import {
  PipelineTierNode,
  TraceDataPacket,
  ComplaintTraceRecord,
  INITIAL_PIPELINE_NODES,
  PRESET_COMPLAINT_TRACES,
  generateMockDataPacket
} from '../../../utils/dataSandboxEngine';
import { exportToCsv } from '../../../utils/dataExportEngine';
import { fallbackToast } from '../../../utils/fallbackToast';

interface DataSandboxGovernancePanelProps {
  showToast?: (msg: string) => void;
}

export const DataSandboxGovernancePanel: React.FC<DataSandboxGovernancePanelProps> = ({
  showToast = (msg: string) => fallbackToast(msg)
}) => {
  // 当前子视图：1. 传输拓扑探针 | 2. 各笔客诉全链路诊断 | 3. 动态脱敏与镜像
  const [activeSubTab, setActiveSubTab] = useState<'topology_probe' | 'complaint_journey' | 'masking_rules'>('topology_probe');

  // 节点管道实时状态
  const [nodes, setNodes] = useState<PipelineTierNode[]>(INITIAL_PIPELINE_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<PipelineTierNode['id']>('T0_EDGE');

  // 实时飞行数据包流模拟
  const [flyingPackets, setFlyingPackets] = useState<TraceDataPacket[]>([]);
  const [isLiveTelemetryRunning, setIsLiveTelemetryRunning] = useState<boolean>(true);

  // 客诉追踪诊断选中单据
  const [complaintRecords, setComplaintRecords] = useState<ComplaintTraceRecord[]>(PRESET_COMPLAINT_TRACES);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string>(PRESET_COMPLAINT_TRACES[0].complaintId);
  const [complaintFilterType, setComplaintFilterType] = useState<string>('all');
  const [complaintSearchQuery, setComplaintSearchQuery] = useState<string>('');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // 故障注入状态
  const [injectedFaults, setInjectedFaults] = useState<{ [nodeId: string]: string }>({});

  // 动态数据包流动动画定时器
  useEffect(() => {
    if (!isLiveTelemetryRunning) return;

    const interval = setInterval(() => {
      // 随机生成沿管道节点传输的数据包
      const nodePairs: [PipelineTierNode['id'], PipelineTierNode['id']][] = [
        ['T0_EDGE', 'T1_STREAM'],
        ['T1_STREAM', 'T2_MASKING'],
        ['T2_MASKING', 'T3_CORE'],
        ['T3_CORE', 'T4_COS']
      ];
      const randomPair = nodePairs[Math.floor(Math.random() * nodePairs.length)];
      const newPacket = generateMockDataPacket(randomPair[0], randomPair[1]);

      setFlyingPackets((prev) => [newPacket, ...prev.slice(0, 7)]);
    }, 1800);

    return () => clearInterval(interval);
  }, [isLiveTelemetryRunning]);

  // 当前选中节点对象
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  }, [nodes, selectedNodeId]);

  // 当前选中客诉单据对象
  const selectedComplaint = useMemo(() => {
    return complaintRecords.find((c) => c.complaintId === selectedComplaintId) || complaintRecords[0];
  }, [complaintRecords, selectedComplaintId]);

  // 过滤后的客诉案例
  const filteredComplaints = useMemo(() => {
    return complaintRecords.filter((c) => {
      const matchType = complaintFilterType === 'all' || c.disputeType === complaintFilterType;
      const q = complaintSearchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        c.complaintId.toLowerCase().includes(q) ||
        c.orderNo.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.disputeTitle.toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [complaintRecords, complaintFilterType, complaintSearchQuery]);

  // 故障注入处理
  const handleInjectFault = (nodeId: PipelineTierNode['id'], faultType: string) => {
    setInjectedFaults((prev) => ({ ...prev, [nodeId]: faultType }));
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            status: 'critical',
            latencyMs: n.latencyMs * 4,
            errorRate: 0.18,
            bufferUsagePercent: Math.min(96, n.bufferUsagePercent + 45),
            activeAlarms: [`[混沌注入] ${faultType}`, `时延突增 > ${n.latencyMs * 4}ms`]
          };
        }
        return n;
      })
    );
    showToast(`已向节点【${nodeId}】注入混沌故障: ${faultType}`);
  };

  // 节点自愈恢复
  const handleRecoverNode = (nodeId: PipelineTierNode['id']) => {
    setInjectedFaults((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    const defaultNode = INITIAL_PIPELINE_NODES.find((n) => n.id === nodeId);
    if (defaultNode) {
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? defaultNode : n)));
    }
    showToast(`节点【${nodeId}】已成功触发自动化熔断自愈，恢复绿色健康态！`);
  };

  // 导出客诉诊断全景报告为 CSV
  const handleExportComplaintReport = (complaint: ComplaintTraceRecord) => {
    const rows = complaint.stages.map((st, idx) => ({
      '阶段序号': `第 ${idx + 1} 阶段`,
      '阶段名称': st.stageName,
      '工序节点': st.nodeName,
      '责任人/设备': st.operator,
      '时间戳': st.timestamp,
      '耗时': st.durationText,
      '状态': st.status === 'critical' ? '异常严重' : st.status === 'anomaly' ? '偏离警告' : '正常通过',
      '核心取证数据': st.evidenceItems.join('; '),
      '诊断结论': st.diagnosticTip,
      'SM3防伪哈希': st.traceHash
    }));

    exportToCsv(
      `客诉全链路诊断报告_${complaint.complaintId}_${complaint.orderNo}`,
      [
        { key: '阶段序号', label: '阶段序号' },
        { key: '阶段名称', label: '阶段名称' },
        { key: '工序节点', label: '工序节点' },
        { key: '责任人/设备', label: '责任人/设备' },
        { key: '时间戳', label: '时间戳' },
        { key: '耗时', label: '耗时' },
        { key: '状态', label: '状态' },
        { key: '核心取证数据', label: '核心取证数据' },
        { key: '诊断结论', label: '诊断结论' },
        { key: 'SM3防伪哈希', label: 'SM3防伪哈希' }
      ],
      rows
    );
    showToast(`已导出【${complaint.complaintId}】工笔全链路诊断取证报告`);
  };

  return (
    <div className="space-y-3.5 text-[#37352f]">
      {/* 顶部：沙箱运行态与生产隔离盾看板 (Notion Token Styled Header) */}
      <div className="bg-white border border-[#e9e9e7] rounded-xl p-3 sm:p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#1a1a17] text-white flex items-center justify-center font-black shrink-0 shadow-2xs">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-[#201f1d]">
                  数据沙箱分层治理与全链路溯源面板
                </h1>
                <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  生产隔离盾 100% 锁定
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                  S0-S4 TIER PIPELINE
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#787774] mt-0.5 line-clamp-1 sm:line-clamp-none">
                毫秒级数据流向拓扑监测 · 探针瓶颈秒级定位 · 各笔客诉工笔级时空还原 · 生产零污染
              </p>
            </div>
          </div>

          {/* 状态与子面板切换器 */}
          <div className="flex items-center gap-1.5 bg-[#f7f6f3] p-1 rounded-lg border border-[#e3e2de] shrink-0 self-start sm:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('topology_probe')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeSubTab === 'topology_probe'
                  ? 'bg-white text-[#1a1a17] shadow-2xs border border-[#d3d1cb]'
                  : 'text-[#787774] hover:text-[#201f1d]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>数据传输链路拓扑</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('complaint_journey')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeSubTab === 'complaint_journey'
                  ? 'bg-white text-[#1a1a17] shadow-2xs border border-[#d3d1cb]'
                  : 'text-[#787774] hover:text-[#201f1d]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>各笔客诉全链路溯源</span>
              <span className="text-[9px] font-mono px-1 rounded bg-blue-100 text-blue-800 font-bold">
                工笔视界
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('masking_rules')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeSubTab === 'masking_rules'
                  ? 'bg-white text-[#1a1a17] shadow-2xs border border-[#d3d1cb]'
                  : 'text-[#787774] hover:text-[#201f1d]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>动态脱敏与镜像矩阵</span>
            </button>
          </div>
        </div>

        {/* 顶部四指标微胶囊 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-[#f1f1ef]">
          <div className="bg-[#f7f6f3] p-2 rounded-lg border border-[#e3e2de]">
            <div className="text-[10px] text-neutral-500 font-medium">全链路实时吞吐</div>
            <div className="text-xs sm:text-sm font-black text-neutral-900 font-mono mt-0.5">
              {nodes.reduce((acc, curr) => acc + curr.qps, 0)} <span className="text-[10px] font-normal text-neutral-400">QPS</span>
            </div>
          </div>
          <div className="bg-[#f7f6f3] p-2 rounded-lg border border-[#e3e2de]">
            <div className="text-[10px] text-neutral-500 font-medium">端到端平均累积延时</div>
            <div className="text-xs sm:text-sm font-black text-[#2b593f] font-mono mt-0.5">
              {nodes.reduce((acc, curr) => acc + curr.latencyMs, 0)} <span className="text-[10px] font-normal text-neutral-400">ms (P99合格)</span>
            </div>
          </div>
          <div className="bg-[#f7f6f3] p-2 rounded-lg border border-[#e3e2de]">
            <div className="text-[10px] text-neutral-500 font-medium">客诉溯源案例库</div>
            <div className="text-xs sm:text-sm font-black text-blue-700 font-mono mt-0.5">
              {complaintRecords.length} <span className="text-[10px] font-normal text-neutral-400">笔 (全量传感器已对齐)</span>
            </div>
          </div>
          <div className="bg-[#f7f6f3] p-2 rounded-lg border border-[#e3e2de]">
            <div className="text-[10px] text-neutral-500 font-medium">生产数据脱敏合规率</div>
            <div className="text-xs sm:text-sm font-black text-purple-700 font-mono mt-0.5">
              100% <span className="text-[10px] font-normal text-neutral-400">(SM4 + 高斯扰动)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 视图 1: 数据传输全链路拓扑与探针排查 (Pipeline Topology) */}
      {/* ======================================================== */}
      {activeSubTab === 'topology_probe' && (
        <div className="space-y-3.5">
          {/* 核心传输拓扑大图 */}
          <div className="bg-white border border-[#e9e9e7] rounded-xl p-4 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f1ef]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-xs sm:text-sm font-black text-[#201f1d]">
                  五层数据传输链路拓扑 (端到端数据流向与健康探针)
                </h2>
                <span className="text-[10px] text-neutral-400 font-mono">
                  点击任意节点展开深度检测探针
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLiveTelemetryRunning(!isLiveTelemetryRunning)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                    isLiveTelemetryRunning
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-neutral-100 border-neutral-200 text-neutral-600'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isLiveTelemetryRunning ? 'animate-spin' : ''}`} />
                  <span>{isLiveTelemetryRunning ? '信令实时流运行中' : '已暂停'}</span>
                </button>
              </div>
            </div>

            {/* 拓扑节点横向排布流 (Responsive 5-Tier Pipeline with animated connector wires) */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-4">
              {nodes.map((node, index) => {
                const isSelected = node.id === selectedNodeId;
                const hasFault = !!injectedFaults[node.id];
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`relative p-3.5 rounded-xl border transition-all cursor-pointer select-none group ${
                      isSelected
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-emerald-500/20'
                        : hasFault
                        ? 'bg-rose-50/80 border-rose-400 text-neutral-900 hover:border-rose-500'
                        : 'bg-[#fcfbf9] border-[#e8e7e3] text-neutral-900 hover:bg-white hover:border-[#d3d1cb]'
                    }`}
                  >
                    {/* 节点序号与分类徽标 */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-white/20 text-emerald-300'
                            : hasFault
                            ? 'bg-rose-200 text-rose-800'
                            : 'bg-[#ecebe7] text-neutral-700'
                        }`}
                      >
                        {node.tierCode} · {node.category.toUpperCase()}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          hasFault
                            ? 'bg-rose-500 animate-ping'
                            : node.status === 'healthy'
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        }`}
                      />
                    </div>

                    {/* 节点标题 */}
                    <div className="min-w-0">
                      <div className="text-xs font-black truncate">{node.name}</div>
                      <div
                        className={`text-[9.5px] font-mono truncate mt-0.5 ${
                          isSelected ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        {node.enName}
                      </div>
                    </div>

                    {/* 核心参数微矩阵 */}
                    <div
                      className={`grid grid-cols-2 gap-1.5 mt-3 pt-2 text-[10px] font-mono border-t ${
                        isSelected ? 'border-neutral-800' : 'border-[#eeedea]'
                      }`}
                    >
                      <div>
                        <div className={isSelected ? 'text-neutral-400' : 'text-neutral-500'}>单跳延时</div>
                        <div className={`font-bold ${hasFault ? 'text-rose-500' : isSelected ? 'text-emerald-300' : 'text-emerald-700'}`}>
                          {node.latencyMs} ms
                        </div>
                      </div>
                      <div>
                        <div className={isSelected ? 'text-neutral-400' : 'text-neutral-500'}>当前吞吐</div>
                        <div className="font-bold">{node.qps} QPS</div>
                      </div>
                      <div>
                        <div className={isSelected ? 'text-neutral-400' : 'text-neutral-500'}>缓冲占用</div>
                        <div className={`font-bold ${node.bufferUsagePercent > 70 ? 'text-rose-500' : ''}`}>
                          {node.bufferUsagePercent}%
                        </div>
                      </div>
                      <div>
                        <div className={isSelected ? 'text-neutral-400' : 'text-neutral-500'}>错误率</div>
                        <div className={`font-bold ${node.errorRate > 0 ? 'text-rose-500' : ''}`}>
                          {(node.errorRate * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* 故障告警浮标 */}
                    {hasFault && (
                      <div className="mt-2 text-[9.5px] font-bold text-rose-600 flex items-center gap-1 bg-rose-100 px-1.5 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{injectedFaults[node.id]}</span>
                      </div>
                    )}

                    {/* 指向下一个节点的连接箭头 (桌面端) */}
                    {index < 4 && (
                      <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-[#d3d1cb] items-center justify-center text-neutral-400 shadow-2xs pointer-events-none">
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 链路实时飞行信令数据包观测池 */}
            <div className="mt-4 pt-3 border-t border-[#f1f1ef]">
              <div className="text-[11px] font-bold text-neutral-700 flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-neutral-500" />
                  实时传输光纤信令数据包流 (Live Trace Telemetry Stream)
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  最近捕捉 {flyingPackets.length} 帧
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {flyingPackets.map((pkt) => (
                  <div
                    key={pkt.packetId}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono shrink-0 transition-all ${
                      pkt.status === 'dropped'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-[#f7f6f3] border-[#e2e1dc] text-neutral-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        pkt.status === 'dropped' ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'
                      }`}
                    />
                    <span className="font-bold">{pkt.source} → {pkt.destination}</span>
                    <span className="px-1 py-0.2 rounded bg-neutral-200 text-neutral-700 text-[9px]">
                      {pkt.payloadType}
                    </span>
                    <span className="text-neutral-500">{pkt.sizeBytes} B</span>
                    <span className="text-emerald-700 font-bold">{pkt.latencyAccumulatedMs}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 选中节点的「深度探针监测仪 (Node Inspector)」 */}
          <div className="bg-white border border-[#e9e9e7] rounded-xl p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#f1f1ef] gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold">
                  {selectedNode.tierCode}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black text-neutral-900">
                      节点深度探针监测: {selectedNode.name}
                    </h3>
                    <span
                      className={`text-[9.5px] font-mono px-2 py-0.2 rounded font-bold ${
                        selectedNode.status === 'healthy'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {selectedNode.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-mono">
                    技术载体: {selectedNode.techStack} · 主隔离索引: {selectedNode.primaryKey}
                  </p>
                </div>
              </div>

              {/* 混沌故障注入与自愈控制区 */}
              <div className="flex items-center gap-2">
                {injectedFaults[selectedNode.id] ? (
                  <button
                    type="button"
                    onClick={() => handleRecoverNode(selectedNode.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>执行自动化自愈修复</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleInjectFault(selectedNode.id, '网络高阻抖动 (时延x4)')}
                      className="px-2.5 py-1.2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-bold cursor-pointer border border-[#d3d1cb] flex items-center gap-1"
                    >
                      <Bug className="w-3 h-3 text-amber-600" />
                      <span>注入网络抖动</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInjectFault(selectedNode.id, '瞬时过载拥堵 (丢包率18%)')}
                      className="px-2.5 py-1.2 rounded-lg bg-neutral-100 hover:bg-rose-100 text-neutral-800 text-[11px] font-bold cursor-pointer border border-[#d3d1cb] flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3 text-rose-600" />
                      <span>注入过载丢包</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 探针详细指标 4-Col Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
              <div className="p-2.5 bg-[#f7f6f3] rounded-lg border border-[#e3e2de]">
                <div className="text-[10.5px] text-neutral-500">单节点 CPU 负载</div>
                <div className="text-sm font-black font-mono mt-1 text-neutral-900">
                  {selectedNode.metrics.cpuLoad}%
                </div>
                <div className="w-full bg-neutral-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full ${selectedNode.metrics.cpuLoad > 75 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${selectedNode.metrics.cpuLoad}%` }}
                  />
                </div>
              </div>

              <div className="p-2.5 bg-[#f7f6f3] rounded-lg border border-[#e3e2de]">
                <div className="text-[10.5px] text-neutral-500">驻留内存占用</div>
                <div className="text-sm font-black font-mono mt-1 text-neutral-900">
                  {selectedNode.metrics.memMb} MB
                </div>
                <div className="text-[10px] text-neutral-400 mt-1 font-mono">RingBuffer 内存安全水位</div>
              </div>

              <div className="p-2.5 bg-[#f7f6f3] rounded-lg border border-[#e3e2de]">
                <div className="text-[10.5px] text-neutral-500">输入带宽 (Ingress)</div>
                <div className="text-sm font-black font-mono mt-1 text-neutral-900">
                  {selectedNode.metrics.networkInMbps} Mbps
                </div>
                <div className="text-[10px] text-neutral-400 mt-1 font-mono">10Hz 车载时空信令流入</div>
              </div>

              <div className="p-2.5 bg-[#f7f6f3] rounded-lg border border-[#e3e2de]">
                <div className="text-[10.5px] text-neutral-500">输出带宽 (Egress)</div>
                <div className="text-sm font-black font-mono mt-1 text-neutral-900">
                  {selectedNode.metrics.networkOutMbps} Mbps
                </div>
                <div className="text-[10px] text-neutral-400 mt-1 font-mono">下游调度事件分发</div>
              </div>
            </div>

            {/* 告警日志与根因排查指引 */}
            <div className="mt-2 p-3 bg-[#fcfbf9] border border-[#e8e7e3] rounded-lg text-xs space-y-1.5">
              <div className="font-bold text-neutral-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  故障定位排查指南与架构备忘
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {selectedNode.activeAlarms.length > 0 ? '⚠️ 存在活跃告警' : '✅ 状态正常无告警'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                {selectedNode.description}。若上游出现突发高并发倾泻，该节点会自动激活反压缓冲（Backpressure Buffer）机制，并将非关键调试日志静默降级至冷存证仓库，确保食客点餐与骑手抢派单 0 阻塞。
              </p>
              {selectedNode.activeAlarms.length > 0 && (
                <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px] space-y-0.5">
                  <div className="font-bold">实时触发告警事件：</div>
                  {selectedNode.activeAlarms.map((alm, idx) => (
                    <div key={idx} className="font-mono text-[10px]">
                      • {alm}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 视图 2: 各笔客诉全链路工笔/时空蓝图视界 (Complaint Journey E2E Visualizer) */}
      {/* ========================================================================= */}
      {activeSubTab === 'complaint_journey' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* 左侧：客诉单据列表与检索 (4 Cols) */}
          <div className="lg:col-span-4 bg-white border border-[#e9e9e7] rounded-xl p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f1ef]">
              <div className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs sm:text-sm font-black text-neutral-900">各笔客诉溯源库</h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200">
                {filteredComplaints.length} 案卷
              </span>
            </div>

            {/* 搜索与类型过滤 */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索案卷号 / 订单号 / 食客..."
                  value={complaintSearchQuery}
                  onChange={(e) => setComplaintSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f7f6f3] border border-[#e3e2de] rounded-lg text-neutral-800 focus:outline-none focus:border-black font-medium"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { id: 'all', label: '全部争议' },
                  { id: 'spill_damage', label: '餐品泼洒' },
                  { id: 'severe_delay', label: '严重超时' },
                  { id: 'geofence_breach', label: '脱圈跨区' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setComplaintFilterType(item.id)}
                    className={`px-2 py-1 rounded text-[10.5px] font-bold transition-all shrink-0 cursor-pointer ${
                      complaintFilterType === item.id
                        ? 'bg-neutral-900 text-white'
                        : 'bg-[#f7f6f3] text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 案卷卡片列表 */}
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-0.5">
              {filteredComplaints.map((item) => {
                const isSelected = item.complaintId === selectedComplaintId;
                return (
                  <div
                    key={item.complaintId}
                    onClick={() => {
                      setSelectedComplaintId(item.complaintId);
                      setActiveStepIndex(0);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 shadow-2xs ring-1 ring-blue-400/30'
                        : 'bg-[#fcfbf9] border-[#e8e7e3] hover:bg-white hover:border-[#d3d1cb]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span className="font-bold text-neutral-900">{item.complaintId}</span>
                      <span className="text-neutral-500">{item.orderNo}</span>
                    </div>

                    <div className="text-xs font-black text-neutral-900 line-clamp-1">
                      {item.disputeTitle}
                    </div>

                    <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f0efe9] text-[10px]">
                      <span className="text-neutral-600 font-medium">{item.customerName}</span>
                      <span className="font-mono font-bold text-emerald-800">
                        先行赔付 ¥{item.payoutAmount.toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右侧：工笔/蓝图级时空穿透诊断大屏 (8 Cols Blueprint Visualizer) */}
          <div className="lg:col-span-8 bg-white border border-[#e9e9e7] rounded-xl p-4 shadow-2xs space-y-4">
            {/* 蓝图头部：案卷信息与责任定责归属条 */}
            <div className="pb-3 border-b border-[#f1f1ef]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-900 text-white">
                      {selectedComplaint.complaintId}
                    </span>
                    <h2 className="text-sm sm:text-base font-black text-neutral-900">
                      {selectedComplaint.disputeTitle}
                    </h2>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono mt-1 flex items-center gap-2 flex-wrap">
                    <span>关联订单: <b>{selectedComplaint.orderNo}</b></span>
                    <span>·</span>
                    <span>食客: <b>{selectedComplaint.customerName}</b> ({selectedComplaint.customerPhone})</span>
                    <span>·</span>
                    <span>餐车: <b>{selectedComplaint.truckName}</b></span>
                    <span>·</span>
                    <span>骑手: <b>{selectedComplaint.riderName}</b></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleExportComplaintReport(selectedComplaint)}
                    className="px-3 py-1.5 rounded-lg bg-[#2b593f] hover:bg-[#224732] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>导出全链路调查书</span>
                  </button>
                </div>
              </div>

              {/* 责任定责比例尺 (Attribution Bar) */}
              <div className="mt-3 bg-[#f7f6f3] p-2.5 rounded-lg border border-[#e3e2de]">
                <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 mb-1.5">
                  <span>多方定责归属比例 (Root Cause Attribution)</span>
                  <span className="font-mono text-emerald-800">
                    已赔付 ¥{selectedComplaint.payoutAmount.toFixed(2)} (原路退回)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden flex bg-neutral-200">
                  {selectedComplaint.attribution.merchantPercent > 0 && (
                    <div
                      className="bg-amber-500 h-full text-[8.5px] font-bold text-white flex items-center justify-center font-mono"
                      style={{ width: `${selectedComplaint.attribution.merchantPercent}%` }}
                      title={`商户责任: ${selectedComplaint.attribution.merchantPercent}%`}
                    >
                      商户 {selectedComplaint.attribution.merchantPercent}%
                    </div>
                  )}
                  {selectedComplaint.attribution.riderPercent > 0 && (
                    <div
                      className="bg-rose-500 h-full text-[8.5px] font-bold text-white flex items-center justify-center font-mono"
                      style={{ width: `${selectedComplaint.attribution.riderPercent}%` }}
                      title={`骑手责任: ${selectedComplaint.attribution.riderPercent}%`}
                    >
                      骑手 {selectedComplaint.attribution.riderPercent}%
                    </div>
                  )}
                  {selectedComplaint.attribution.platformNetPercent > 0 && (
                    <div
                      className="bg-emerald-600 h-full text-[8.5px] font-bold text-white flex items-center justify-center font-mono"
                      style={{ width: `${selectedComplaint.attribution.platformNetPercent}%` }}
                      title={`平台兜底: ${selectedComplaint.attribution.platformNetPercent}%`}
                    >
                      平台 {selectedComplaint.attribution.platformNetPercent}%
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 五维穿透式生命周期流水线卡片 (5-Stage Diagnostic Timeline) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  时空穿透溯源时间轴 (从食客诉求到平台仲裁归档)
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono">
                  国密 SM3 存证 Hash 已锚定
                </span>
              </div>

              {/* 5 个阶段时空工笔线卡 */}
              <div className="space-y-3 relative">
                {selectedComplaint.stages.map((stage, sIdx) => {
                  const isCritical = stage.status === 'critical';
                  const isAnomaly = stage.status === 'anomaly';
                  return (
                    <div
                      key={stage.stageId}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCritical
                          ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-200'
                          : isAnomaly
                          ? 'bg-amber-50/40 border-amber-300'
                          : 'bg-[#fcfbf9] border-[#e8e7e3]'
                      }`}
                    >
                      {/* 阶段标题栏 */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#f0efe9]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center text-white shrink-0 ${
                              isCritical ? 'bg-rose-600' : isAnomaly ? 'bg-amber-600' : 'bg-neutral-800'
                            }`}
                          >
                            0{sIdx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-black text-neutral-900">
                              {stage.stageName}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono ml-2">
                              {stage.enStageName}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10.5px] font-mono">
                          <span className="text-neutral-500">{stage.timestamp}</span>
                          <span className="px-1.5 py-0.2 rounded bg-white border border-[#d3d1cb] font-bold text-neutral-700">
                            {stage.durationText}
                          </span>
                        </div>
                      </div>

                      {/* 责任人与核心传感器数值 */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2.5">
                        <div className="p-2 bg-white/80 rounded-lg border border-[#e8e7e3]">
                          <div className="text-[9.5px] text-neutral-500">工序责任方/节点</div>
                          <div className="text-[11px] font-bold text-neutral-900 mt-0.5 truncate">
                            {stage.operator}
                          </div>
                        </div>

                        {stage.metrics.map((m, mIdx) => (
                          <div
                            key={mIdx}
                            className={`p-2 rounded-lg border ${
                              m.isAbnormal
                                ? 'bg-rose-100/70 border-rose-300 text-rose-900'
                                : 'bg-white/80 border-[#e8e7e3] text-neutral-900'
                            }`}
                          >
                            <div className="text-[9.5px] text-neutral-500">{m.label}</div>
                            <div className="text-[11px] font-bold mt-0.5 font-mono truncate">
                              {m.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 证据链条与诊断结论 */}
                      <div className="bg-white p-2.5 rounded-lg border border-[#eeedea] text-xs space-y-1">
                        <div className="font-bold text-neutral-800 text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>{stage.evidenceTitle}</span>
                        </div>
                        <ul className="text-[11px] text-neutral-600 space-y-0.5 pl-4 list-disc">
                          {stage.evidenceItems.map((evi, eIdx) => (
                            <li key={eIdx}>{evi}</li>
                          ))}
                        </ul>

                        <div className="mt-2 pt-1.5 border-t border-[#f4f3ef] flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-neutral-500 gap-1 font-mono">
                          <span className="text-emerald-800 font-bold">
                            💡 调查研判: {stage.diagnosticTip}
                          </span>
                          <span className="truncate text-neutral-400">
                            Hash: {stage.traceHash.substring(0, 26)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 腾讯云 COS 冷存证归档凭证底栏 */}
            <div className="p-3 bg-[#f7f6f3] rounded-xl border border-[#e3e2de] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-700 shrink-0" />
                <div className="min-w-0 font-mono text-[10.5px]">
                  <div className="text-neutral-700 font-bold truncate">
                    腾讯云 COS 存证 Key: {selectedComplaint.cosEvidenceKey}
                  </div>
                  <div className="text-neutral-400 truncate text-[9.5px]">
                    国密 SM3 电子签名: {selectedComplaint.sm3AuditProof}
                  </div>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] shrink-0 self-start sm:self-auto">
                已安全落锁不可篡改
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* 视图 3: 动态脱敏与镜像矩阵 (Masking Rules & Production Mirror) */}
      {/* =============================================================== */}
      {activeSubTab === 'masking_rules' && (
        <div className="bg-white border border-[#e9e9e7] rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#f1f1ef] gap-2">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-neutral-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>生产数据安全脱敏与影子镜像矩阵 (S2 Tier Data Masking)</span>
              </h2>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                严防真实食客隐私泄露，所有沙箱推演与测试均基于字段级掩码与高斯时空扰动副本
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-mono font-bold text-[11px]">
              国密 SM4 加密已激活
            </span>
          </div>

          {/* 脱敏规则配置表 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f7f6f3] text-neutral-600 font-bold border-b border-[#e3e2de]">
                  <th className="p-2.5">字段类别</th>
                  <th className="p-2.5">脱敏策略算法</th>
                  <th className="p-2.5">生产原数据 (只读隔离)</th>
                  <th className="p-2.5">沙箱镜像脱敏后呈现</th>
                  <th className="p-2.5">合规安全等级</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f1ef]">
                <tr>
                  <td className="p-2.5 font-bold text-neutral-900">食客手机号</td>
                  <td className="p-2.5 font-mono text-neutral-600">中间4位掩码替换 (MASK_MID_4)</td>
                  <td className="p-2.5 font-mono text-neutral-400 line-through">13812345678</td>
                  <td className="p-2.5 font-mono font-bold text-purple-700">138****5678</td>
                  <td className="p-2.5"><span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">符合个保法</span></td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-neutral-900">食客送达精准坐标</td>
                  <td className="p-2.5 font-mono text-neutral-600">高斯空间扰动 (GAUSS_JITTER ±150m)</td>
                  <td className="p-2.5 font-mono text-neutral-400 line-through">121.492102, 31.238914</td>
                  <td className="p-2.5 font-mono font-bold text-purple-700">121.491500, 31.239400</td>
                  <td className="p-2.5"><span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">脱敏地理围栏</span></td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-neutral-900">商户结算银行账户</td>
                  <td className="p-2.5 font-mono text-neutral-600">国密 SM3 单向散列 (HASH_PROOF)</td>
                  <td className="p-2.5 font-mono text-neutral-400 line-through">622202******1984</td>
                  <td className="p-2.5 font-mono font-bold text-purple-700">sm3:8f92b4c10a2e...</td>
                  <td className="p-2.5"><span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">金融级不可逆</span></td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-neutral-900">交易流水金额</td>
                  <td className="p-2.5 font-mono text-neutral-600">随机浮点扰动 (FLOAT_JITTER ±5%)</td>
                  <td className="p-2.5 font-mono text-neutral-400 line-through">¥ 142.50</td>
                  <td className="p-2.5 font-mono font-bold text-purple-700">¥ 145.20</td>
                  <td className="p-2.5"><span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">仿真防猜测</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-[#fcfbf9] rounded-xl border border-[#e8e7e3] text-xs flex items-center justify-between text-neutral-600">
            <span>🛡️ 隔离原则：沙箱环境下产生的一切仿真测试订单均带有 <code>is_sandbox: true</code> 元数据染色，彻底防止渗透生产财务报表。</span>
            <button
              type="button"
              onClick={() => showToast('已刷新沙箱脱敏镜像缓存')}
              className="px-3 py-1 rounded-lg bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer"
            >
              刷新脱敏镜像
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
