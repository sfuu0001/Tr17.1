import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Activity,
  Users,
  ShoppingBag,
  ArrowRight,
  Clock,
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Database,
  Download,
  Upload,
  Layers,
  ChevronDown,
  ChevronRight,
  Eye,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Check,
  Gauge,
  Sliders,
  PlayCircle,
  History,
  Sparkles,
  AlertOctagon,
  HelpCircle,
  ArrowUpRight,
  TrendingDown,
  Target,
  Radio
} from 'lucide-react';
import { MerchantPrecisionConsole } from './MerchantPrecisionConsole';
import { Order, DishItem } from '../../types';
import {
  userJourneyTracker,
  UserJourneySession,
  FunnelNodeMetric,
  JourneyNodeType,
  GranularDiagnosticInfo,
  JourneyStage
} from '../../utils/userJourneyTracker';
import {
  merchantBackupEngine,
  MerchantAuditLogItem,
  MerchantBackupSnapshot
} from '../../utils/merchantBackupEngine';
import { DateRangeFilter } from '../common/DateRangeFilter';
import {
  DateFilterState,
  resolveDateRange,
  isWithinRange
} from '../../utils/dateFilter';

interface MerchantMasterControlCenterProps {
  orders: Order[];
  dishes: DishItem[];
  showToast: (msg: string) => void;
  onDataRestored?: () => void;
  initialSubTab?: 'channel_matrix' | 'journey_funnel' | 'backup_fallback' | 'audit_logs';
}

export const MerchantMasterControlCenter: React.FC<MerchantMasterControlCenterProps> = ({
  orders,
  dishes,
  showToast,
  onDataRestored,
  initialSubTab = 'channel_matrix'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'channel_matrix' | 'journey_funnel' | 'backup_fallback' | 'audit_logs'>(
    initialSubTab
  );
  // 时间区间筛选（三个子页统一：会话 startTime / 快照与审计 timestamp）
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const dateRange = useMemo(() => resolveDateRange(dateFilter), [dateFilter]);
  const [sessions, setSessions] = useState<UserJourneySession[]>([]);
  const [funnelData, setFunnelData] = useState<ReturnType<typeof userJourneyTracker.getFunnelMetrics>>({
    totalSessions: 0,
    steps: [],
    dropOffSummary: {
      unsubmittedCheckoutCount: 0,
      cartAbandonedCount: 0,
      paymentCancelledCount: 0,
      idleExitCount: 0,
      bounceCount: 0
    }
  });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionFilterNode, setSessionFilterNode] = useState<string>('all');
  const [sessionSearchKeyword, setSessionSearchKeyword] = useState<string>('');

  // 备份与兜底状态
  const [snapshots, setSnapshots] = useState<MerchantBackupSnapshot[]>([]);
  const [auditLogs, setAuditLogs] = useState<MerchantAuditLogItem[]>([]);
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [newSnapshotReason, setNewSnapshotReason] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [confirmRollbackId, setConfirmRollbackId] = useState<string | null>(null);

  // 监听并同步数据
  const refreshAllData = () => {
    const allSessions = userJourneyTracker.getAllSessions();
    setSessions(allSessions);
    setFunnelData(userJourneyTracker.getFunnelMetrics());
    setSnapshots(merchantBackupEngine.getSnapshots());
    setAuditLogs(merchantBackupEngine.getAuditLogs());
    if (allSessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(allSessions[0].sessionId);
    }
  };

  useEffect(() => {
    refreshAllData();
    const unsubJourney = userJourneyTracker.subscribe(refreshAllData);
    const unsubBackup = merchantBackupEngine.subscribe(refreshAllData);
    return () => {
      unsubJourney();
      unsubBackup();
    };
  }, []);

  // 过滤后的用户会话列表
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (!isWithinRange(s.startTime, dateRange)) return false;
      if (sessionFilterNode !== 'all') {
        if (sessionFilterNode === 'completed' && s.status !== 'completed') return false;
        if (sessionFilterNode === 'unsubmitted' && s.dropOffNode !== 'checkout' && s.dropOffNode !== 'cart_active') return false;
        if (sessionFilterNode === 'cancelled' && s.status !== 'cancelled') return false;
        if (sessionFilterNode === 'idle_timeout' && s.status !== 'idle_timeout') return false;
      }
      if (sessionSearchKeyword.trim()) {
        const kw = sessionSearchKeyword.toLowerCase();
        const matchId = s.sessionId.toLowerCase().includes(kw);
        const matchUser = s.userId.toLowerCase().includes(kw);
        const matchDevice = s.userDevice.toLowerCase().includes(kw);
        const matchOrder = s.orderNo?.toLowerCase().includes(kw);
        return matchId || matchUser || matchDevice || matchOrder;
      }
      return true;
    });
  }, [sessions, sessionFilterNode, sessionSearchKeyword, dateRange]);

  // 时间区间过滤后的快照与审计列表
  const filteredSnapshots = useMemo(
    () => snapshots.filter((snap) => isWithinRange(snap.timestamp, dateRange)),
    [snapshots, dateRange]
  );
  const filteredAuditLogs = useMemo(
    () => auditLogs.filter((log) => isWithinRange(log.timestamp, dateRange)),
    [auditLogs, dateRange]
  );

  const selectedSession = useMemo(() => {
    return sessions.find((s) => s.sessionId === selectedSessionId) || sessions[0] || null;
  }, [sessions, selectedSessionId]);

  // 手动触发创建快照
  const handleCreateSnapshotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapshotLabel.trim()) {
      showToast('请输入备份版本标签！');
      return;
    }
    merchantBackupEngine.createSnapshot(
      newSnapshotLabel.trim(),
      newSnapshotReason.trim() || '商家手动保存全量快照',
      orders,
      dishes,
      '商家总控操作员'
    );
    setNewSnapshotLabel('');
    setNewSnapshotReason('');
    setIsCreatingSnapshot(false);
    showToast('全量数据备份快照已创建并妥善封存！');
  };

  // 执行兜底回滚
  const handleExecuteRollback = (snapId: string) => {
    const res = merchantBackupEngine.rollbackToSnapshot(snapId);
    setConfirmRollbackId(null);
    if (res.success) {
      showToast(res.message);
      if (onDataRestored) onDataRestored();
    } else {
      showToast(res.message);
    }
  };

  // 阶段徽章计算
  const getStageBadge = (stage?: JourneyStage) => {
    switch (stage) {
      case 'stage_discovery':
        return { label: '探索导购段', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'stage_selection':
        return { label: '选配定制段', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'stage_cart':
        return { label: '购物车筹备段', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'stage_checkout':
        return { label: '收银决策段', color: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'stage_fulfillment':
        return { label: '支付履约段', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'stage_inactive':
      default:
        return { label: '闲置跳出段', color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  // 阻力等级徽章
  const getFrictionBadge = (level: GranularDiagnosticInfo['frictionLevel']) => {
    switch (level) {
      case 'critical':
        return { label: '严重流失', color: 'bg-red-100 text-red-800 border-red-300 ring-1 ring-red-300/50' };
      case 'high':
        return { label: '中高阻力', color: 'bg-orange-100 text-orange-800 border-orange-300' };
      case 'medium':
        return { label: '犹豫观望', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'none':
      default:
        return { label: '顺畅转化', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
  };

  // 快捷模拟高拟真微时序分段链路
  const handleSimulateScenario = (scenario: 'checkout_drop' | 'spec_confusion' | 'delivery_threshold' | 'cart_empty' | 'quick_success') => {
    const newSession = userJourneyTracker.simulateScenario(scenario);
    refreshAllData();
    setSelectedSessionId(newSession.sessionId);
    showToast(`已生成【${newSession.diagnosis?.judgmentTitle || '高拟真微时序'}】链路仿真数据！`);
  };

  // 重置全量会话数据
  const handleResetSessionData = () => {
    userJourneyTracker.clearAllSessions();
    userJourneyTracker.generateMockSessionsIfEmpty();
    refreshAllData();
    showToast('已重新初始化高保真分段操作监听数据池！');
  };

  return (
    <div className="space-y-4 text-xs">
      {/* 顶部主横幅：商家端总控中枢说明与快速切换 */}
      <div className="bg-white p-4 rounded-lg border border-[#e6e6e4] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#2b593f] text-white flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#37352f]">商家端总控中枢 (Master Operations Hub)</h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#edf3ec] text-[#2b593f] border border-[#d6e4d4]">
                用户全程监听 · 节点流失反馈 · 全量备份兜底
              </span>
            </div>
            <p className="text-[11px] text-[#787774] mt-0.5">
              实时监听访客全路径行为，定位未提交/取消/退出中断节点；全盘操作版本备份与一键安全兜底回滚。
            </p>
          </div>
        </div>

        {/* 导航 Tab 切换 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-[#f1f1ef] p-0.5 rounded border border-[#e6e6e4] flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSubTab('channel_matrix')}
              className={`px-3 py-1.5 rounded font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'channel_matrix'
                  ? 'bg-console-dark text-white shadow-xs'
                  : 'text-[#787774] hover:text-black'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-console-accent" />
              <span>全渠道供售与打样主控</span>
              <span className="w-1.5 h-1.5 rounded-full bg-console-accent animate-ping" />
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('journey_funnel')}
              className={`px-3 py-1.5 rounded font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'journey_funnel'
                  ? 'bg-white text-[#37352f] shadow-xs'
                  : 'text-[#787774] hover:text-black'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#2b593f]" />
              <span>用户行为监听与流量漏斗</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('backup_fallback')}
              className={`px-3 py-1.5 rounded font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'backup_fallback'
                  ? 'bg-white text-[#37352f] shadow-xs'
                  : 'text-[#787774] hover:text-black'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-amber-600" />
              <span>操作全量备份与兜底恢复</span>
              {snapshots.length > 0 && (
                <span className="ml-0.5 px-1 bg-[#37352f] text-white rounded text-[10px] font-mono">
                  {snapshots.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('audit_logs')}
              className={`px-3 py-1.5 rounded font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'audit_logs'
                  ? 'bg-white text-[#37352f] shadow-xs'
                  : 'text-[#787774] hover:text-black'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#2383e2]" />
              <span>操作审计流水 ({auditLogs.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={refreshAllData}
            title="刷新总控最新状态"
            className="p-1.5 bg-white hover:bg-[#f1f1ef] text-[#37352f] border border-[#d3d1cb] rounded cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* 时间区间筛选：会话/快照/审计三子页统一生效 */}
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} className="ml-1" />
        </div>
      </div>

      {/* SUBTAB 0: 全渠道供售与营业打样主控矩阵 (Direct Replica from Design Spec) */}
      {activeSubTab === 'channel_matrix' && (
        <div className="rounded-lg overflow-hidden border border-console-borderDark/60 shadow-xs">
          <MerchantPrecisionConsole />
        </div>
      )}

      {/* 4 项总控 KPI 指标卡 (仅在非 channel_matrix 漏斗子页面展示) */}
      {activeSubTab !== 'channel_matrix' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span>总进店访客量 (Sessions)</span>
            <Users className="w-4 h-4 text-[#2b593f]" />
          </div>
          <p className="text-xl font-mono font-bold text-[#2b593f]">
            {funnelData.totalSessions} <span className="text-xs font-normal text-[#787774]">人次</span>
          </p>
          <div className="text-[10px] text-[#787774] flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>实时全链路监听中 (包含移动端与扫码)</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span>最终成单转化率</span>
            <ShoppingBag className="w-4 h-4 text-[#2b593f]" />
          </div>
          <p className="text-xl font-mono font-bold text-[#37352f]">
            {funnelData.steps.length > 0
              ? `${funnelData.steps[funnelData.steps.length - 1].overallConversionPercent}%`
              : '0%'}
          </p>
          <span className="text-[10px] text-[#2b593f] font-semibold">
            成单人数: {funnelData.steps[funnelData.steps.length - 1]?.reachedSessionsCount || 0} 单
          </span>
        </div>

        <div className="bg-white p-3.5 rounded border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span>流失中断总告警</span>
            <AlertTriangle className="w-4 h-4 text-[#eb5757]" />
          </div>
          <p className="text-xl font-mono font-bold text-[#eb5757]">
            {funnelData.dropOffSummary.unsubmittedCheckoutCount +
              funnelData.dropOffSummary.cartAbandonedCount +
              funnelData.dropOffSummary.paymentCancelledCount +
              funnelData.dropOffSummary.idleExitCount}{' '}
            <span className="text-xs font-normal text-[#787774]">人次</span>
          </p>
          <span className="text-[10px] text-[#eb5757]">
            结算未提交 {funnelData.dropOffSummary.unsubmittedCheckoutCount} · 取消 {funnelData.dropOffSummary.paymentCancelledCount}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded border border-[#e6e6e4] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#787774]">
            <span>全量数据安全兜底</span>
            <Database className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-mono font-bold text-amber-700">
            {snapshots.length} <span className="text-xs font-normal text-[#787774]">个备份版本</span>
          </p>
          <div className="text-[10px] text-[#4dab63] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#4dab63]" />
            <span>支持任意时间点一键兜底回滚</span>
          </div>
        </div>
      </div>
      )}

      {/* SUBTAB 1: 用户行为监听与流量漏斗 */}
      {activeSubTab === 'journey_funnel' && (
        <div className="space-y-4">
          {/* 1. 流量节点转化漏斗条 (Funnel Steps) */}
          <div className="bg-white p-4 rounded-lg border border-[#e6e6e4] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#efefed] pb-2 flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#2b593f]" />
                  <span>各用户节点流量漏斗与转化率分析 (Traffic Funnel by Node)</span>
                </h4>
                <p className="text-[11px] text-[#787774]">
                  从进店到成单的全流程流量流转，清晰反映每一步的到达人次与流失率
                </p>
              </div>

              {/* 快捷微时序高拟真仿真触发器 */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[#787774] flex items-center gap-1 font-semibold">
                  <PlayCircle className="w-3.5 h-3.5 text-[#2b593f]" />
                  <span>高拟真链路仿真:</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleSimulateScenario('checkout_drop')}
                  title="模拟顾客在收银结算台核销优惠后因起送费与运费犹豫最终放弃"
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold rounded text-[11px] cursor-pointer inline-flex items-center gap-1 transition-colors"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                  <span>收银临门放弃</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateScenario('spec_confusion')}
                  title="模拟顾客在多规格弹窗中反复切换分量与辣度，耗时42秒未加购退出"
                  className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-semibold rounded text-[11px] cursor-pointer inline-flex items-center gap-1 transition-colors"
                >
                  <Sliders className="w-3 h-3 text-purple-700" />
                  <span>规格选配纠结</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateScenario('delivery_threshold')}
                  title="模拟顾客加购一份餐品差5元达起送门槛，反复犹豫后离开"
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 font-semibold rounded text-[11px] cursor-pointer inline-flex items-center gap-1 transition-colors"
                >
                  <TrendingDown className="w-3 h-3 text-rose-700" />
                  <span>起送门槛阻退</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateScenario('cart_empty')}
                  title="模拟顾客加购多款菜品后在购物车点击一键清空并退出"
                  className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 font-semibold rounded text-[11px] cursor-pointer inline-flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-orange-700" />
                  <span>清空跑单</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateScenario('quick_success')}
                  title="模拟50秒顺畅选购、自提立减并立即成单出单"
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold rounded text-[11px] cursor-pointer inline-flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-emerald-700" />
                  <span>极速黄金成单</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetSessionData}
                  title="清空现有会话并载入全新基准仿真微时序数据集"
                  className="px-2 py-1 bg-[#f1f1ef] hover:bg-[#e6e6e4] text-[#5a5854] border border-[#d3d1cb] font-semibold rounded text-[11px] cursor-pointer inline-flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重置数据池</span>
                </button>
              </div>
            </div>

            {/* 6 阶段漏斗水平递进矩阵 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {funnelData.steps.map((step, idx) => {
                const isLast = idx === funnelData.steps.length - 1;
                const isFirst = idx === 0;
                return (
                  <div
                    key={step.node}
                    className={`p-3 rounded border relative flex flex-col justify-between ${
                      isLast
                        ? 'bg-[#edf3ec]/70 border-[#c7dbc4]'
                        : step.dropOffCount > 0
                        ? 'bg-[#fafafa] border-[#e6e6e4]'
                        : 'bg-white border-[#e6e6e4]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-[#787774]">
                        <span className="font-semibold text-[#37352f]">{step.name}</span>
                        <span className="font-mono font-bold">#{step.stepIndex}</span>
                      </div>

                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-lg font-mono font-bold text-[#1a1c1b]">
                          {step.reachedSessionsCount}
                        </span>
                        <span className="text-[10px] text-[#787774]">人到达</span>
                      </div>

                      {/* 进度条指示 */}
                      <div className="w-full bg-[#efefed] h-1.5 rounded-full overflow-hidden my-1.5">
                        <div
                          style={{ width: `${step.overallConversionPercent}%` }}
                          className={`h-full ${isLast ? 'bg-[#2b593f]' : 'bg-[#37352f]'}`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#787774]">总转化率</span>
                        <span className="font-mono font-bold text-[#2b593f]">{step.overallConversionPercent}%</span>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#ebebe8] text-[10px]">
                      {!isFirst ? (
                        <div className="flex items-center justify-between text-[#eb5757]">
                          <span>流失人次</span>
                          <span className="font-mono font-bold">-{step.dropOffCount} ({step.dropOffPercent}%)</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-[#787774]">起点入口</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. 核心流失中断诊断反馈三格卡片 (精准反馈 3 大核心诉求) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 卡片 A: 哪个节点未完成订单提交 */}
            <div className="bg-white p-3.5 rounded-lg border border-[#fed7aa] bg-orange-50/20 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#fed7aa] pb-1.5">
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-orange-600" />
                  <span className="font-bold text-xs text-[#37352f]">未完成订单提交节点反馈</span>
                </div>
                <span className="px-1.5 py-0.2 font-mono font-bold text-[11px] bg-orange-100 text-orange-800 rounded">
                  {funnelData.dropOffSummary.unsubmittedCheckoutCount + funnelData.dropOffSummary.cartAbandonedCount} 人
                </span>
              </div>
              <p className="text-[11px] text-[#787774] leading-relaxed">
                记录顾客进入【结算核对页】或【加购后】未最终确认提交：
              </p>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-2 bg-white rounded border border-[#fed7aa] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#37352f] block">核对结算页停留未提交</span>
                    <span className="text-[10px] text-[#787774]">主要原因：核对配送费/打包费时迟疑、等待拼单</span>
                  </div>
                  <span className="font-mono font-bold text-orange-700">
                    {funnelData.dropOffSummary.unsubmittedCheckoutCount} 人
                  </span>
                </div>
                <div className="p-2 bg-white rounded border border-[#fed7aa] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#37352f] block">加购菜品后清空放弃</span>
                    <span className="text-[10px] text-[#787774]">主要原因：起送门槛或菜品份量考量后放弃</span>
                  </div>
                  <span className="font-mono font-bold text-orange-700">
                    {funnelData.dropOffSummary.cartAbandonedCount} 人
                  </span>
                </div>
              </div>
            </div>

            {/* 卡片 B: 哪个节点取消了订单 */}
            <div className="bg-white p-3.5 rounded-lg border border-[#fecaca] bg-rose-50/20 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#fecaca] pb-1.5">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span className="font-bold text-xs text-[#37352f]">主动取消订单节点反馈</span>
                </div>
                <span className="px-1.5 py-0.2 font-mono font-bold text-[11px] bg-rose-100 text-rose-800 rounded">
                  {funnelData.dropOffSummary.paymentCancelledCount} 人
                </span>
              </div>
              <p className="text-[11px] text-[#787774] leading-relaxed">
                记录顾客在拉起支付收银台后的取消动作：
              </p>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-2 bg-white rounded border border-[#fecaca] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#37352f] block">支付界面主动取消付款</span>
                    <span className="text-[10px] text-[#787774]">在微信/支付宝密码界面点击取消</span>
                  </div>
                  <span className="font-mono font-bold text-rose-700">
                    {funnelData.dropOffSummary.paymentCancelledCount} 人
                  </span>
                </div>
                <div className="p-2 bg-white rounded border border-[#fecaca] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#37352f] block">支付超时未付款自动失效</span>
                    <span className="text-[10px] text-[#787774]">超过 15 分钟未支付订单关闭</span>
                  </div>
                  <span className="font-mono font-bold text-rose-700">0 人</span>
                </div>
              </div>
            </div>

            {/* 卡片 C: 哪个节点退出程序无任何操作 */}
            <div className="bg-white p-3.5 rounded-lg border border-[#e2e8f0] bg-slate-50/30 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-600" />
                  <span className="font-bold text-xs text-[#37352f]">退出程序/无操作跳出反馈</span>
                </div>
                <span className="px-1.5 py-0.2 font-mono font-bold text-[11px] bg-slate-100 text-slate-800 rounded">
                  {funnelData.dropOffSummary.idleExitCount + funnelData.dropOffSummary.bounceCount} 人
                </span>
              </div>
              <p className="text-[11px] text-[#787774] leading-relaxed">
                记录进店后无交互秒退，或浏览期间静止超时的用户：
              </p>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-2 bg-white rounded border border-[#e2e8f0] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#37352f] block">进店后 10 秒内秒退 (Bounce)</span>
                    <span className="text-[10px] text-[#787774]">未发生任何点击滑动直接离开</span>
                  </div>
                  <span className="font-mono font-bold text-slate-700">
                    {funnelData.dropOffSummary.bounceCount} 人
                  </span>
                </div>
                <div className="p-2 bg-white rounded border border-[#e2e8f0] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#37352f] block">菜单浏览无操作超时 (Idle)</span>
                    <span className="text-[10px] text-[#787774]">停留超过 90 秒无任何动作休眠退出</span>
                  </div>
                  <span className="font-mono font-bold text-slate-700">
                    {funnelData.dropOffSummary.idleExitCount} 人
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 用户会话记录列表与操作时间轴 (Session Stream & Actions Timeline) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* 左侧：用户会话列表 (5 列) */}
            <div className="lg:col-span-5 bg-white p-3.5 rounded-lg border border-[#e6e6e4] shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#efefed] pb-2">
                <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#2b593f]" />
                  <span>实时访客会话全记录 ({filteredSessions.length})</span>
                </h4>
                <span className="text-[10px] text-[#787774]">点击检视该用户全程操作</span>
              </div>

              {/* 搜索与节点过滤 */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#787774]" />
                  <input
                    type="text"
                    placeholder="搜索会话ID / 顾客 / 设备..."
                    value={sessionSearchKeyword}
                    onChange={(e) => setSessionSearchKeyword(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 text-xs border border-[#d3d1cb] rounded focus:outline-hidden focus:border-[#2b593f]"
                  />
                </div>
                <select
                  value={sessionFilterNode}
                  onChange={(e) => setSessionFilterNode(e.target.value)}
                  className="px-2 py-1 text-xs border border-[#d3d1cb] rounded bg-white text-[#37352f]"
                >
                  <option value="all">全部节点</option>
                  <option value="completed">成功成单</option>
                  <option value="unsubmitted">结算/加购未提交</option>
                  <option value="cancelled">主动取消</option>
                  <option value="idle_timeout">无操作/超时退出</option>
                </select>
              </div>

              {/* 会话列表 */}
              <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-8 text-[#787774] text-[11px]">暂无匹配的访客会话数据</div>
                ) : (
                  filteredSessions.map((s) => {
                    const isSelected = selectedSession?.sessionId === s.sessionId;
                    const frictionBadge = getFrictionBadge(s.diagnosis?.frictionLevel || 'none');
                    return (
                      <div
                        key={s.sessionId}
                        onClick={() => setSelectedSessionId(s.sessionId)}
                        className={`p-2.5 rounded border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-[#edf3ec] border-[#2b593f] shadow-xs'
                            : 'bg-[#fafafa] hover:bg-[#f1f1ef] border-[#e6e6e4]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[11px] text-[#1a1c1b]">{s.sessionId}</span>
                            <span className="text-[10px] text-[#787774]">· {s.sourceChannel}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {s.diagnosis?.frictionLevel && s.diagnosis.frictionLevel !== 'none' && (
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${frictionBadge.color}`}>
                                {frictionBadge.label}
                              </span>
                            )}
                            {s.status === 'completed' && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#edf3ec] text-[#2b593f]">
                                已成单 ¥{s.orderAmount?.toFixed(0)}
                              </span>
                            )}
                            {s.status === 'abandoned' && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                未提交
                              </span>
                            )}
                            {s.status === 'cancelled' && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                取消支付
                              </span>
                            )}
                            {s.status === 'idle_timeout' && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                无操作退出
                              </span>
                            )}
                            {s.status === 'active' && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 animate-pulse">
                                进行中
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 强判断标签与犹豫指数 */}
                        {s.diagnosis && (
                          <div className="mt-1 flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-[#2b593f] truncate max-w-[190px]">
                              {s.diagnosis.judgmentTitle}
                            </span>
                            <span className={`font-mono font-semibold ${
                              s.diagnosis.hesitationIndex > 60
                                ? 'text-rose-600'
                                : s.diagnosis.hesitationIndex > 30
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}>
                              犹豫度 {s.diagnosis.hesitationIndex}%
                            </span>
                          </div>
                        )}

                        <div className="mt-1 flex items-center justify-between text-[10px] text-[#787774]">
                          <span className="truncate max-w-[170px]">{s.userId} · {s.userDevice}</span>
                          <span>时长: {s.totalDurationSeconds}秒 / {s.actions.length}步微时序</span>
                        </div>

                        {s.dropOffReason && (
                          <div className="mt-1 text-[10px] text-orange-700 bg-orange-50/70 p-1 rounded border border-orange-200 truncate">
                            中断: {s.dropOffReason}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 右侧：所选会话的全程操作时间轴 Action Log (7 列) */}
            <div className="lg:col-span-7 bg-white p-3.5 rounded-lg border border-[#e6e6e4] shadow-2xs space-y-3">
              {selectedSession ? (
                <>
                  <div className="flex items-center justify-between border-b border-[#efefed] pb-2 flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-[#37352f]">
                          会话微时序轨迹详情: <span className="font-mono text-[#2b593f]">{selectedSession.sessionId}</span>
                        </h4>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f1f1ef] text-[#5a5854]">
                          {selectedSession.userDevice}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#787774] mt-0.5">
                        访问入口: {selectedSession.sourceChannel} · 用户标识: {selectedSession.userId} · 总停留时长: {selectedSession.totalDurationSeconds} 秒
                      </p>
                    </div>

                    {selectedSession.orderNo && (
                      <span className="font-mono text-[11px] font-bold bg-[#edf3ec] text-[#2b593f] px-2 py-0.5 rounded border border-[#c7dbc4]">
                        关联订单: {selectedSession.orderNo}
                      </span>
                    )}
                  </div>

                  {/* 核心强判断流失归因诊断面板 (Strong Judgment Diagnostic Hub) */}
                  {selectedSession.diagnosis ? (
                    <div className="p-3 bg-[#fafafa] rounded-lg border border-[#e6e6e4] space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getFrictionBadge(selectedSession.diagnosis.frictionLevel).color}`}>
                            {getFrictionBadge(selectedSession.diagnosis.frictionLevel).label}
                          </span>
                          <h5 className="font-bold text-xs text-[#1a1c1b] flex items-center gap-1">
                            <Target className="w-3.5 h-3.5 text-[#2b593f]" />
                            <span>{selectedSession.diagnosis.judgmentTitle}</span>
                          </h5>
                        </div>

                        {/* 犹豫指数微型仪表 */}
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Gauge className="w-3.5 h-3.5 text-[#787774]" />
                          <span className="text-[#787774]">链路犹豫指数:</span>
                          <span className={`font-mono font-bold ${
                            selectedSession.diagnosis.hesitationIndex > 60
                              ? 'text-rose-600'
                              : selectedSession.diagnosis.hesitationIndex > 30
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}>
                            {selectedSession.diagnosis.hesitationIndex}%
                          </span>
                          <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${selectedSession.diagnosis.hesitationIndex}%` }}
                              className={`h-full ${
                                selectedSession.diagnosis.hesitationIndex > 60
                                  ? 'bg-rose-500'
                                  : selectedSession.diagnosis.hesitationIndex > 30
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 诊断详情 */}
                      <p className="text-[11px] text-[#37352f] leading-relaxed bg-white p-2 rounded border border-[#ebebe8]">
                        <span className="font-semibold text-[#787774] block text-[10px] mb-0.5">流失阻碍诊断 (Strong Judgment):</span>
                        {selectedSession.diagnosis.summaryDiagnosis}
                      </p>

                      {/* 专属策略建议 */}
                      <div className="text-[11px] text-[#2b593f] bg-[#edf3ec]/70 p-2 rounded border border-[#c7dbc4] flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#2b593f] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-[10px]">系统推荐经营对策 (Actionable Suggestion):</span>
                          <span>{selectedSession.diagnosis.actionableSuggestion}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-[11px] text-[#2b593f] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>该顾客已顺畅完成全流程点单并成功出餐结账。</span>
                    </div>
                  )}

                  {/* 购物车快照 */}
                  {selectedSession.cartSnapshot && selectedSession.cartSnapshot.dishNames.length > 0 && (
                    <div className="p-2 bg-[#f7f7f5] rounded border border-[#e6e6e4] text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-[#787774]" />
                        <span>加购明细: {selectedSession.cartSnapshot.dishNames.join('、')}</span>
                      </div>
                      <span className="font-mono font-bold text-[#2b593f]">
                        共计 ¥{selectedSession.cartSnapshot.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* 逐秒交互动作时间轴 */}
                  <div className="space-y-2 pt-1 max-h-[340px] overflow-y-auto pr-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-[#787774] block">
                        全程分段微时序轨迹流水 ({selectedSession.actions.length} 次精确事件 · 毫秒级时序):
                      </span>
                      <span className="text-[10px] text-[#787774]">高敏感度判断与强追踪</span>
                    </div>

                    <div className="relative pl-4 border-l border-[#d3d1cb] space-y-2.5">
                      {selectedSession.actions.map((act, idx) => {
                        const isSuccess = act.node === 'order_success';
                        const isDrop = act.node === 'cancelled' || act.actionType === 'cancel_checkout' || act.node === 'idle_exit';
                        const stageBadge = getStageBadge(act.stage);
                        const isHesitation = act.isHesitation || act.durationFromPrevSeconds > 25;

                        return (
                          <div key={act.id || idx} className="relative">
                            {/* 时间轴圆点 */}
                            <span
                              className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                                isSuccess
                                  ? 'bg-[#2b593f]'
                                  : isDrop
                                  ? 'bg-rose-500'
                                  : isHesitation
                                  ? 'bg-amber-500 ring-amber-200'
                                  : 'bg-[#787774]'
                              }`}
                            />

                            <div className={`p-2.5 rounded border space-y-1 ${
                              isHesitation
                                ? 'bg-amber-50/40 border-amber-200'
                                : isDrop
                                ? 'bg-rose-50/40 border-rose-200'
                                : 'bg-[#fbfbfa] border-[#ebebe8]'
                            }`}>
                              <div className="flex items-center justify-between text-[10px] flex-wrap gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-[#787774]">#{String(idx + 1).padStart(2, '0')}</span>
                                  <span className="font-mono font-bold text-[#1a1c1b]">{act.timeStr}</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${stageBadge.color}`}>
                                    {stageBadge.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {isHesitation && (
                                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" />
                                      <span>深度犹豫</span>
                                    </span>
                                  )}
                                  <span className="font-mono text-[#787774]">
                                    {idx === 0 ? '首触点' : `+${act.durationFromPrevSeconds}s`}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[11px] font-semibold text-[#1a1c1b] leading-tight">
                                {act.label}
                              </p>

                              {/* 详细参数预览 */}
                              {act.details && Object.keys(act.details).length > 0 && (
                                <div className="text-[10px] bg-white/80 p-1 rounded border border-[#e6e6e4] flex items-center gap-2 flex-wrap text-[#5a5854]">
                                  {Object.entries(act.details).map(([k, v]) => {
                                    if (typeof v === 'object' && v !== null) {
                                      return (
                                        <span key={k} className="font-mono">
                                          {k}: {JSON.stringify(v)}
                                        </span>
                                      );
                                    }
                                    return (
                                      <span key={k} className="font-mono">
                                        {k}: <span className="font-bold text-[#1a1c1b]">{String(v)}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[10px] text-[#787774] pt-0.5">
                                <span>业务节点: 【{userJourneyTracker.getNodeLabel(act.node)}】</span>
                                <span className="font-mono text-[9px] bg-neutral-100 px-1 rounded">{act.actionType}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-20 text-center text-[#787774]">请选择左侧会话检视具体操作轨迹</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: 操作全量备份与兜底恢复 */}
      {activeSubTab === 'backup_fallback' && (
        <div className="space-y-4">
          {/* 备份操作操作台 */}
          <div className="bg-white p-4 rounded-lg border border-[#e6e6e4] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#efefed] pb-2 flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-amber-600" />
                  <span>商家端全量数据版本快照与一键兜底回滚 (Backup & Disaster Recovery)</span>
                </h4>
                <p className="text-[11px] text-[#787774]">
                  自动捕获商家端修改与删除前的数据快照，任何误操作均可一键安全兜底回滚至历史版本。
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingSnapshot(!isCreatingSnapshot)}
                  className="px-3 py-1.5 bg-[#2b593f] hover:bg-[#20432f] text-white rounded font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>立即创建全量备份快照</span>
                </button>
              </div>
            </div>

            {/* 创建快照表单 */}
            {isCreatingSnapshot && (
              <form onSubmit={handleCreateSnapshotSubmit} className="p-3 bg-[#f7f7f5] rounded border border-[#d3d1cb] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#37352f]">新建数据安全快照封存</span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingSnapshot(false)}
                    className="text-[#787774] hover:text-black cursor-pointer text-xs"
                  >
                    取消
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="版本标签 (如：晚市打烊前封存 / 批量修改报表前基准)"
                    value={newSnapshotLabel}
                    onChange={(e) => setNewSnapshotLabel(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-[#d3d1cb] rounded bg-white"
                  />
                  <input
                    type="text"
                    placeholder="备份原因/备注 (选填)"
                    value={newSnapshotReason}
                    onChange={(e) => setNewSnapshotReason(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-[#d3d1cb] rounded bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#37352f] hover:bg-black text-white rounded font-semibold text-xs cursor-pointer"
                >
                  确认生成并入库备份版本
                </button>
              </form>
            )}

            {/* 快照版本列表 */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-[#37352f] block">
                已留存备份快照版本树 (共 {snapshots.length} 个历史版本):
              </span>

              <div className="space-y-2">
                {snapshots.length === 0 ? (
                  <div className="text-center py-6 text-[#787774]">暂无历史快照版本</div>
                ) : (
                  filteredSnapshots.map((snap, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <div
                        key={snap.id}
                        className={`p-3 rounded border flex flex-wrap items-center justify-between gap-3 ${
                          isFirst ? 'bg-white border-[#2b593f] shadow-xs ring-1 ring-[#2b593f]/20' : 'bg-[#fafafa] border-[#e6e6e4]'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#1a1c1b]">{snap.label}</span>
                            <span className="font-mono text-[10px] text-[#787774] bg-[#f1f1ef] px-1.5 py-0.5 rounded">
                              {snap.id}
                            </span>
                            {isFirst && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#edf3ec] text-[#2b593f]">
                                最新快照
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#787774]">
                            时间: <span className="font-mono text-[#37352f]">{snap.timeStr}</span> · 包含: {snap.ordersCount} 笔订单 · {snap.dishesCount} 道菜品 · {snap.adjustmentsCount} 项报表修改
                          </p>
                          {snap.reason && (
                            <p className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded inline-block">
                              备注: {snap.reason}
                            </p>
                          )}
                        </div>

                        {/* 回滚操作 */}
                        <div className="flex items-center gap-2">
                          {confirmRollbackId === snap.id ? (
                            <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded border border-rose-200">
                              <span className="text-[10px] text-rose-800 font-bold">确定兜底回滚至此版本？</span>
                              <button
                                type="button"
                                onClick={() => handleExecuteRollback(snap.id)}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                确认还原
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRollbackId(null)}
                                className="px-1.5 py-0.5 bg-white text-[#787774] rounded text-[10px] cursor-pointer"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRollbackId(snap.id)}
                              className="px-3 py-1 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                              <span>一键兜底回滚</span>
                            </button>
                          )}

                          {!isFirst && (
                            <button
                              type="button"
                              onClick={() => merchantBackupEngine.deleteSnapshot(snap.id)}
                              title="删除此过期快照"
                              className="p-1 text-[#787774] hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: 商家端操作审计流水 */}
      {activeSubTab === 'audit_logs' && (
        <div className="bg-white p-4 rounded-lg border border-[#e6e6e4] shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#efefed] pb-2">
            <div>
              <h4 className="font-bold text-xs text-[#37352f] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#2383e2]" />
                <span>商家端操作审计流水记录 (Operation Audit Logs)</span>
              </h4>
              <p className="text-[11px] text-[#787774]">
                记录商家端在报表修改、订单删除、调账记账、版本回滚过程中的全部动作与操作人
              </p>
            </div>
            <span className="font-mono text-xs text-[#787774]">共 {auditLogs.length} 条记录</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="text-center py-10 text-[#787774]">暂无商家端操作审计流水</div>
            ) : (
              filteredAuditLogs.map((log) => (
                <div key={log.id} className="p-2.5 rounded border border-[#ebebe8] bg-[#fafafa] space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-[#eef3fb] text-[#2383e2]">
                        {log.module}
                      </span>
                      <span className="font-semibold text-xs text-[#1a1c1b]">{log.title}</span>
                    </div>
                    <span className="font-mono text-[10px] text-[#787774]">{log.timeStr}</span>
                  </div>
                  <p className="text-[11px] text-[#5a5854]">{log.details}</p>
                  <div className="text-[10px] text-[#787774] flex items-center justify-between pt-0.5">
                    <span>操作人: {log.operator}</span>
                    <span className="font-mono text-[9.5px] text-[#9b9a97]">{log.id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
