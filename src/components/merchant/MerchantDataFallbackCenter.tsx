import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  History,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  Download,
  Upload,
  RefreshCw,
  Camera,
  Layers,
  Sparkles,
  ArrowRight,
  Database,
  Lock,
  Clock,
  FileSpreadsheet,
  Check,
  FileCheck
} from 'lucide-react';
import {
  VersionPointer,
  MilestoneSnapshot,
  MerchantOperator,
  VersionModuleType
} from '../../types/versionTracking';
import {
  getVersionPointers,
  getMilestoneSnapshots,
  createMilestoneSnapshot,
  restoreMilestoneSnapshot,
  rollbackVersionPointer,
  DEFAULT_MERCHANT_OPERATORS,
  MODULE_NAME_MAP
} from '../../utils/versionPointerEngine';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';
import { DateRangeFilter } from '../common/DateRangeFilter';
import { DateFilterState, resolveDateRange, isWithinRange } from '../../utils/dateFilter';
import { useMemo } from 'react';

interface MerchantDataFallbackCenterProps {
  showToast: (msg: string, detail?: string) => void;
  onNavigateToModule?: (module: VersionModuleType) => void;
}

export const MerchantDataFallbackCenter: React.FC<MerchantDataFallbackCenterProps> = ({
  showToast,
  onNavigateToModule
}) => {
  const [pointers, setPointers] = useState<VersionPointer[]>(() => getVersionPointers());
  const [snapshots, setSnapshots] = useState<MilestoneSnapshot[]>(() => getMilestoneSnapshots());
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('all');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyMistakes, setOnlyMistakes] = useState<boolean>(true); // 默认优先聚焦疑似误操作
  // 时间区间筛选（版本指针按操作时间过滤）
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const dateRange = useMemo(() => resolveDateRange(dateFilter), [dateFilter]);

  const [selectedPointerForDiff, setSelectedPointerForDiff] = useState<VersionPointer | null>(null);
  const [isSnapshotCreating, setIsSnapshotCreating] = useState<boolean>(false);
  const [newSnapshotTitle, setNewSnapshotTitle] = useState<string>('');
  const [isCreateSnapshotModalOpen, setIsCreateSnapshotModalOpen] = useState<boolean>(false);

  const reloadData = () => {
    setPointers(getVersionPointers());
    setSnapshots(getMilestoneSnapshots());
  };

  useEffect(() => {
    // FIX(审计P1-4): 事件名与 versionPointerEngine 实际派发对齐
    // (此前监听 obsidian_version_pointer_recorded / _rollback_completed / _milestone_snapshot_created 均无人派发)
    const handleStorageEvent = () => reloadData();
    window.addEventListener('obsidian_version_pointers_updated', handleStorageEvent);
    window.addEventListener('obsidian_data_restored', handleStorageEvent);
    window.addEventListener('obsidian_operator_changed', handleStorageEvent);
    return () => {
      window.removeEventListener('obsidian_version_pointers_updated', handleStorageEvent);
      window.removeEventListener('obsidian_data_restored', handleStorageEvent);
      window.removeEventListener('obsidian_operator_changed', handleStorageEvent);
    };
  }, []);

  // Filtered operations
  const filteredPointers = pointers.filter((p) => {
    if (!isWithinRange(new Date(p.timestamp).getTime(), dateRange)) {
      return false;
    }
    if (selectedOperatorFilter !== 'all' && p.operator.id !== selectedOperatorFilter) {
      return false;
    }
    if (selectedModuleFilter !== 'all' && p.module !== selectedModuleFilter) {
      return false;
    }
    if (onlyMistakes && !p.isSuspectedMistake && p.riskLevel !== 'high_risk') {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const text = `${p.entityName} ${p.summary} ${p.operator.name} ${p.versionTag}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  const suspectedMistakesCount = pointers.filter(
    (p) => p.isSuspectedMistake || p.riskLevel === 'high_risk'
  ).length;

  // Handle Rollback
  const handleRollback = (pointer: VersionPointer) => {
    const res = businessTransactionEngine.executeCascadingRollback({
      pointerId: pointer.pointerId,
      operatorName: '全域数据兜底中心管理员',
      showToast
    });
    if (res.success) {
      reloadData();
      setSelectedPointerForDiff(null);
    }
  };

  // Handle Create Snapshot
  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapshotTitle.trim()) return;
    setIsSnapshotCreating(true);
    try {
      const s = createMilestoneSnapshot(
        newSnapshotTitle.trim(),
        '管理员手动在数据兜底中心触发的应急全量状态镜像',
        'emergency_backup'
      );
      showToast(`【全量安全快照已生成】快照ID: ${s.snapshotId}`, '系统全域数据已进行防篡改存证！');
      reloadData();
      setIsCreateSnapshotModalOpen(false);
      setNewSnapshotTitle('');
    } finally {
      setIsSnapshotCreating(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* 顶部安全态势与标题栏 */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-slate-900 text-amber-400 rounded-lg shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                实时经营数据安全兜底与版本恢复中枢
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>实时容灾兜底激活中</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              保障餐车全域经营数据完整性。全量追踪全部账号（店长/收银/后厨/系统）的每一次变更，精准比对差异，防范员工误操作并支持一键无损回退。
            </p>
          </div>
        </div>

        {/* 顶部快捷操作 */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsCreateSnapshotModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>生成全量系统快照</span>
          </button>
          <button
            type="button"
            onClick={reloadData}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>刷新最新流水</span>
          </button>
        </div>
      </div>

      {/* 核心指标卡片：4大业务数据池健康与兜底状态 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">全渠道订单数据池</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900">100%</span>
            <span className="text-[11px] text-emerald-600 font-medium">双向存证完备</span>
          </div>
          <p className="text-[11px] text-slate-500">
            支持外卖/堂食/自提订单账本追溯，改价与退款有痕存证
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">堂食台位矩阵数据池</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900">18 桌</span>
            <span className="text-[11px] text-slate-500">状态锁保护正常</span>
          </div>
          <p className="text-[11px] text-slate-500">
            开台、并单、换桌、清台操作全流程记录，支持误清台恢复
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">前台排队叫号数据池</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900">已开通</span>
            <span className="text-[11px] text-amber-700 font-medium">临时/完全作废隔离</span>
          </div>
          <p className="text-[11px] text-slate-500">
            支持弃号暂挂一键恢复叫号，防止服务员误过号造成纠纷
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">疑似误操作报警</span>
            {suspectedMistakesCount > 0 ? (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${suspectedMistakesCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {suspectedMistakesCount} 处
            </span>
            <span className="text-[11px] text-rose-600 font-medium">待管理员复核</span>
          </div>
          <p className="text-[11px] text-slate-500">
            包含异常大额折扣、非正常时间作废工单、高频改单
          </p>
        </div>
      </div>

      {/* 员工账号风控透视雷达卡片 */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>当前全部员工账号操作审计追踪</span>
          </h3>
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} compact />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {DEFAULT_MERCHANT_OPERATORS.map((op) => {
            const opCount = pointers.filter((p) => p.operator.id === op.id).length;
            const opMistakes = pointers.filter(
              (p) => p.operator.id === op.id && (p.isSuspectedMistake || p.riskLevel === 'high_risk')
            ).length;
            const isSelected = selectedOperatorFilter === op.id;

            return (
              <div
                key={op.id}
                onClick={() => setSelectedOperatorFilter(isSelected ? 'all' : op.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">{op.avatar || '👤'}</span>
                  {opMistakes > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold font-mono">
                      {opMistakes} 预警
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs text-slate-900 truncate">{op.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{op.roleName}</div>
                <div className="text-[11px] font-mono font-semibold text-slate-700 mt-2 flex justify-between">
                  <span>总流水:</span>
                  <b>{opCount} 次</b>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 操作记录对比筛选过滤条 */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Module Filter */}
            <select
              value={selectedModuleFilter}
              onChange={(e) => setSelectedModuleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-semibold focus:outline-none focus:border-slate-800"
            >
              <option value="all">📂 全部业务模块</option>
              <option value="orders">🧾 全渠道订单数据</option>
              <option value="calling_queue">📢 前台排队与叫号中心</option>
              <option value="tables">🪑 堂食桌台与就餐流转</option>
              <option value="kds">🍳 后厨制作与划菜工单</option>
              <option value="dishes">🍔 菜品与菜单管理</option>
              <option value="materials">📦 原料与库存资产</option>
            </select>

            {/* Operator Filter */}
            <select
              value={selectedOperatorFilter}
              onChange={(e) => setSelectedOperatorFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-semibold focus:outline-none focus:border-slate-800"
            >
              <option value="all">👥 全部操作人员</option>
              {DEFAULT_MERCHANT_OPERATORS.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.name} ({op.roleName})
                </option>
              ))}
            </select>

            {/* Only Mistakes Toggle */}
            <button
              type="button"
              onClick={() => setOnlyMistakes((prev) => !prev)}
              className={`px-3 py-1.5 rounded text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
                onlyMistakes
                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${onlyMistakes ? 'text-rose-600' : 'text-slate-400'}`} />
              <span>{onlyMistakes ? '正在聚焦: 疑似误操作/高危变更' : '显示全量操作记录'}</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索单号/桌号/菜品/操作人..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-800"
            />
          </div>
        </div>

        {/* 流水列表与详细对比展示 */}
        <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
          {filteredPointers.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="font-semibold text-xs">当前筛选条件下未检索到可疑操作记录</p>
              <p className="text-[11px] text-slate-400 mt-0.5">各项数据版本均保持完整健康的基线状态</p>
            </div>
          ) : (
            filteredPointers.map((p) => {
              const isSelected = selectedPointerForDiff?.pointerId === p.pointerId;
              const isSuspected = p.isSuspectedMistake || p.riskLevel === 'high_risk';

              return (
                <div
                  key={p.pointerId}
                  className={`p-3.5 transition-colors ${
                    isSelected ? 'bg-slate-50 ring-1 ring-slate-300' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base">{p.operator.avatar || '👤'}</span>
                        <span className="font-bold text-xs text-slate-900">{p.operator.name}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                          {p.operator.roleName}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {MODULE_NAME_MAP[p.module]}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                          {p.actionName}
                        </span>

                        {isSuspected && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                            <span>疑似员工误操作</span>
                          </span>
                        )}

                        {p.status === 'reverted' && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-slate-200 text-slate-600">
                            已回滚复原
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-700">
                        <span className="font-semibold text-slate-900 mr-1.5">{p.entityName}:</span>
                        <span>{p.summary}</span>
                      </div>

                      {p.mistakeReason && (
                        <div className="text-[11px] text-rose-700 font-medium flex items-center gap-1 mt-0.5">
                          <span>⚠️ 风控拦截原因: {p.mistakeReason}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 md:self-center">
                      <span className="text-[11px] text-slate-400 font-mono">{p.formattedTime}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPointerForDiff(isSelected ? null : p)}
                        className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded cursor-pointer transition-all"
                      >
                        {isSelected ? '收起对比' : '查看差异对比'}
                      </button>

                      {p.status !== 'reverted' && p.isRevertible && (
                        <button
                          type="button"
                          onClick={() => handleRollback(p)}
                          className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1 ${
                            isSuspected
                              ? 'bg-rose-700 hover:bg-rose-800 text-white'
                              : 'bg-indigo-700 hover:bg-indigo-800 text-white'
                          }`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>一键恢复此版本</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 展开的 Before vs After 双版本对比面板 */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-3 bg-white p-3 rounded border border-slate-200">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>该账号本次操作字段明细对比 (Before vs After)</span>
                        <span className="font-mono text-[11px] text-slate-400">流水凭证: {p.integrityHash}</span>
                      </div>

                      {p.fieldDiffs && p.fieldDiffs.length > 0 ? (
                        <div className="border border-slate-200 rounded overflow-hidden divide-y divide-slate-100 text-xs">
                          {p.fieldDiffs.map((diff, idx) => (
                            <div key={idx} className="p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2">
                              <span className="font-bold text-slate-700 w-36">{diff.fieldLabel}</span>
                              <div className="grid grid-cols-2 gap-3 flex-1 font-mono text-[11px]">
                                <div className="bg-rose-50 p-2 rounded border border-rose-200 text-rose-900">
                                  <span className="text-[10px] text-rose-600 font-bold block font-sans">
                                    操作前原始状态 (Before):
                                  </span>
                                  <span className="break-all">{diff.oldValueDisplay}</span>
                                </div>
                                <div className="bg-emerald-50 p-2 rounded border border-emerald-200 text-emerald-900">
                                  <span className="text-[10px] text-emerald-600 font-bold block font-sans">
                                    员工修改后状态 (After):
                                  </span>
                                  <span className="break-all">{diff.newValueDisplay}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded text-xs text-slate-500 italic">
                          当前为全量快照镜像操作，无单一离散字段差分。
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                        <div>操作终端: {p.operator.deviceInfo} (IP: {p.operator.ip})</div>
                        <div className="flex items-center gap-1 text-indigo-600">
                          <Check className="w-3.5 h-3.5" />
                          <span>支持毫秒级无损版本恢复</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 全系统里程碑快照备份库 */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-sm text-slate-900">系统全量快照与灾备归档库</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">已存储 {snapshots.length} 个快照镜像</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {snapshots.map((snap) => (
            <div
              key={snap.snapshotId}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 truncate">{snap.title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                  {snap.tagLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2">{snap.description}</p>
              <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-200 flex justify-between">
                <span>{snap.createdAt}</span>
                <span>创建人: {snap.createdBy.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 创建全量快照弹窗 */}
      {isCreateSnapshotModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-300 shadow-2xl w-full max-w-md p-5 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base">创建全域系统安全快照</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateSnapshotModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSnapshot} className="space-y-3.5 text-xs">
              <p className="text-slate-600">
                将立即备份餐车当前全域订单、桌台状态、等位队列、KDS出餐工单与库存快照，生成不可篡改的时间戳存证。
              </p>

              <div>
                <label className="block text-slate-600 font-medium mb-1">快照名称 / 备注标题</label>
                <input
                  type="text"
                  required
                  placeholder="如: 午市高峰前全域状态备份 / 结账盘点前镜像"
                  value={newSnapshotTitle}
                  onChange={(e) => setNewSnapshotTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-slate-800 text-xs bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSnapshotModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSnapshotCreating}
                  className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded font-bold cursor-pointer shadow-xs active:scale-95"
                >
                  {isSnapshotCreating ? '正在生成快照...' : '立即生成快照'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
