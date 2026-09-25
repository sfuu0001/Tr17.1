import React, { useState, useEffect, useSyncExternalStore } from 'react';
import {
  ShieldAlert,
  History,
  RotateCcw,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  X,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Users,
  Eye,
  ArrowRight,
  Layers,
  Sparkles,
  ExternalLink,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import {
  VersionPointer,
  MerchantOperator,
  VersionModuleType,
  FieldDiff
} from '../../types/versionTracking';
import {
  getVersionPointers,
  DEFAULT_MERCHANT_OPERATORS,
  rollbackVersionPointer,
  MODULE_NAME_MAP,
  ACTION_NAME_MAP
} from '../../utils/versionPointerEngine';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';
import { subscribeWorkspacePrefs, getWorkspacePrefsSnapshot } from '../../utils/workspacePreferences';

interface AccountAuditDrawerProps {
  currentModule: VersionModuleType;
  title?: string;
  onRestoreSuccess?: (revertedPointer: VersionPointer) => void;
  showToast: (msg: string, detail?: string) => void;
  onOpenFullFallbackCenter?: () => void;
}

export const AccountAuditDrawer: React.FC<AccountAuditDrawerProps> = ({
  currentModule,
  title,
  onRestoreSuccess,
  showToast,
  onOpenFullFallbackCenter
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pointers, setPointers] = useState<VersionPointer[]>(() => getVersionPointers());
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('all');
  const [onlyMistakes, setOnlyMistakes] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPointer, setSelectedPointer] = useState<VersionPointer | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const wsPrefs = useSyncExternalStore(subscribeWorkspacePrefs, getWorkspacePrefsSnapshot);
  const isIconOnly = wsPrefs.buttonDisplayMode === 'icon_only';

  // Reload pointers when drawer opens or storage event fires
  const reloadPointers = () => {
    setPointers(getVersionPointers());
  };

  useEffect(() => {
    // FIX(审计P1-4): 事件名与 versionPointerEngine 实际派发对齐
    // (此前监听的 obsidian_version_pointer_recorded / _rollback_completed 均无人派发，面板永不刷新)
    const handleStorageChange = () => reloadPointers();
    window.addEventListener('obsidian_version_pointers_updated', handleStorageChange);
    window.addEventListener('obsidian_data_restored', handleStorageChange);
    window.addEventListener('obsidian_operator_changed', handleStorageChange);
    return () => {
      window.removeEventListener('obsidian_version_pointers_updated', handleStorageChange);
      window.removeEventListener('obsidian_data_restored', handleStorageChange);
      window.removeEventListener('obsidian_operator_changed', handleStorageChange);
    };
  }, []);

  // Filter pointers: priority to currentModule, or allow switching to all modules
  const [scopeAllModules, setScopeAllModules] = useState(false);

  const filteredPointers = pointers.filter(p => {
    if (!scopeAllModules && p.module !== currentModule) {
      return false;
    }
    if (selectedOperatorId !== 'all' && p.operator.id !== selectedOperatorId) {
      return false;
    }
    if (onlyMistakes && !p.isSuspectedMistake && p.riskLevel !== 'high_risk') {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${p.entityName} ${p.summary} ${p.operator.name} ${p.versionTag}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  const suspectedMistakeCount = pointers.filter(
    p => (scopeAllModules || p.module === currentModule) && (p.isSuspectedMistake || p.riskLevel === 'high_risk')
  ).length;

  const handleRollback = async (pointer: VersionPointer) => {
    if (isRestoring) return;
    setIsRestoring(true);
    try {
      const result = businessTransactionEngine.executeCascadingRollback({
        pointerId: pointer.pointerId,
        operatorName: '内嵌审计抽屉值班人员',
        showToast
      });
      if (result.success && result.revertedPointer) {
        reloadPointers();
        setSelectedPointer(null);
        if (onRestoreSuccess) {
          onRestoreSuccess(result.revertedPointer);
        }
      }
    } catch {
      showToast('回滚执行异常，请重试');
    } finally {
      setIsRestoring(false);
    }
  };

  const currentModuleName = MODULE_NAME_MAP[currentModule] || '当前页面';

  return (
    <>
      {/* 1. 右侧浮动折叠吸附抓手 (Floating Handle Tab) */}
      <aside 
        aria-label="账号操作审计与数据兜底侧边栏"
        className="js-audit-handle fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center"
      >
        <button
          type="button"
          onClick={() => {
            reloadPointers();
            setIsOpen(prev => !prev);
          }}
          className={`flex flex-col items-center gap-1 rounded-l-md shadow-xl border-l border-y transition-all cursor-pointer select-none group ${
            isIconOnly && !isOpen ? 'py-2 px-1.5' : 'py-3 px-1.5'
          } ${
            isOpen
              ? 'bg-slate-900 text-white border-slate-700'
              : suspectedMistakeCount > 0
              ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 animate-bounce sm:animate-none'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400'
          }`}
          title={isOpen ? '收起操作对比与数据兜底组件' : '展开当前页面各账号操作记录对比与版本恢复兜底'}
        >
          {suspectedMistakeCount > 0 ? (
            <AlertTriangle className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
          ) : (
            <ShieldAlert className={`w-4 h-4 shrink-0 ${isOpen ? 'text-amber-400' : 'text-slate-600 group-hover:text-slate-900'}`} />
          )}

          <span
            className={`text-[11px] font-bold [writing-mode:vertical-lr] tracking-widest transition-all duration-200 overflow-hidden whitespace-nowrap ${
              isIconOnly && !isOpen
                ? 'max-h-0 opacity-0 group-hover:max-h-[160px] group-hover:opacity-100 group-hover:py-1'
                : 'py-1'
            }`}
          >
            {isOpen ? '收起审计' : '操作审计·数据兜底'}
          </span>

          {suspectedMistakeCount > 0 ? (
            <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center font-mono shrink-0">
              {suspectedMistakeCount}
            </span>
          ) : (
            <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
        </button>
      </aside>

      {/* 2. 背景半透明遮罩 (移动端点击可收起) */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/25 backdrop-blur-[1px] z-40 transition-opacity"
        />
      )}

      {/* 3. 右侧滑出折叠抽屉面板 */}
      <aside
        aria-label="账号操作对比与版本恢复抽屉"
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[460px] md:w-[500px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transform transition-transform duration-200 ease-out text-slate-800 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-800 rounded text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base tracking-tight">
                  {title || '操作记录对比与版本恢复兜底'}
                </h3>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {currentModuleName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none mt-1">
                聚焦追踪各员工/管理员操作历史，精准比对差异并支持一键版本恢复
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            title="关闭侧边栏"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Controls: 账号聚焦 & 误操作筛选 */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5 text-xs">
          {/* Operator Selector (账号选择聚焦) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-slate-600 font-semibold shrink-0">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>聚焦账号:</span>
            </div>

            <select
              value={selectedOperatorId}
              onChange={(e) => setSelectedOperatorId(e.target.value)}
              className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded font-medium text-slate-800 focus:outline-none focus:border-slate-800"
            >
              <option value="all">👥 全部操作账号 ({pointers.length} 条流水)</option>
              {DEFAULT_MERCHANT_OPERATORS.map(op => {
                const opCount = pointers.filter(p => p.operator.id === op.id).length;
                return (
                  <option key={op.id} value={op.id}>
                    {op.avatar} {op.name} ({op.roleName}) - {opCount} 条
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search and Scope Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索单号/桌号/菜品/操作摘要..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-slate-800"
              />
            </div>

            <button
              type="button"
              onClick={() => setScopeAllModules(prev => !prev)}
              className={`px-2 py-1 rounded text-[11px] font-medium border cursor-pointer whitespace-nowrap transition-colors ${
                scopeAllModules
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
              title="切换是仅看当前页面还是看系统全模块操作"
            >
              {scopeAllModules ? '全域模块' : '当前模块'}
            </button>
          </div>

          {/* Quick Filter: 仅看高危/疑似误操作 */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={onlyMistakes}
                onChange={(e) => setOnlyMistakes(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-500" />
                <span>仅聚焦疑似误操作 / 高危变更</span>
              </span>
            </label>

            {onOpenFullFallbackCenter && (
              <button
                type="button"
                onClick={onOpenFullFallbackCenter}
                className="text-indigo-600 hover:text-indigo-800 text-[11px] flex items-center gap-0.5 cursor-pointer font-medium"
              >
                <span>全域兜底中心</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Pointer List & Detail Comparison Section */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 divide-y divide-slate-100">
          {filteredPointers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-80" />
              <p className="text-xs font-medium">当前筛选条件下暂无操作记录</p>
              <p className="text-[11px] text-slate-400">所有数据版本正常，未监测到异常风险</p>
            </div>
          ) : (
            filteredPointers.map((p) => {
              const isSelected = selectedPointer?.pointerId === p.pointerId;
              const isHighRisk = p.riskLevel === 'high_risk' || p.isSuspectedMistake;

              return (
                <div
                  key={p.pointerId}
                  className={`pt-3 first:pt-0 transition-all ${
                    isSelected ? 'bg-slate-50/80 -mx-2 px-2 py-2 rounded-lg border border-slate-300' : ''
                  }`}
                >
                  {/* Item Summary Bar */}
                  <div
                    onClick={() => setSelectedPointer(isSelected ? null : p)}
                    className="cursor-pointer group flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base leading-none">{p.operator.avatar || '👤'}</span>
                        <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600">
                          {p.operator.name}
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1 py-0.2 rounded font-mono">
                          {p.operator.roleName}
                        </span>

                        {isHighRisk && (
                          <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                            <span>疑似误操作</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                        <span>{p.formattedTime}</span>
                        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        {p.actionName}
                      </span>
                      <span className="font-medium text-slate-900 truncate max-w-[200px]">
                        {p.entityName}
                      </span>
                    </div>

                    <p className="text-[11.5px] text-slate-600 line-clamp-2 leading-relaxed">
                      {p.summary}
                    </p>
                  </div>

                  {/* 展开的 Before vs After 双版本对比面板 */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-3 text-xs animate-in fade-in duration-150">
                      {/* 误操作告警说明 */}
                      {p.mistakeReason && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-900 text-[11px] flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">风控模型预警原因:</span>
                            <span>{p.mistakeReason}</span>
                          </div>
                        </div>
                      )}

                      {/* 核心字段差异表格 (Field Diffs) */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                          <span>变更字段深度比对 (Before vs After)</span>
                          <span className="font-mono text-[10px] text-slate-400">版本: {p.versionTag}</span>
                        </div>

                        {p.fieldDiffs && p.fieldDiffs.length > 0 ? (
                          <div className="border border-slate-200 rounded overflow-hidden divide-y divide-slate-100">
                            {p.fieldDiffs.map((diff, idx) => (
                              <div key={idx} className="p-2 bg-white flex flex-col gap-1 text-[11px]">
                                <span className="font-bold text-slate-700">{diff.fieldLabel}</span>
                                <div className="grid grid-cols-2 gap-2 font-mono">
                                  <div className="bg-rose-50/60 p-1.5 rounded border border-rose-100 text-rose-900">
                                    <span className="text-[10px] text-rose-600 block font-sans">操作前 (旧值):</span>
                                    <span className="break-all">{diff.oldValueDisplay}</span>
                                  </div>
                                  <div className="bg-emerald-50/60 p-1.5 rounded border border-emerald-100 text-emerald-900">
                                    <span className="text-[10px] text-emerald-600 block font-sans">操作后 (新值):</span>
                                    <span className="break-all">{diff.newValueDisplay}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic p-2 bg-slate-50 rounded">
                            无结构化离散字段变更（全量快照归档）
                          </p>
                        )}
                      </div>

                      {/* 操作设备与存证签名 */}
                      <div className="p-2 bg-slate-100/70 rounded text-[10.5px] text-slate-500 space-y-0.5 font-mono">
                        <div>终端设备: {p.operator.deviceInfo}</div>
                        <div>IP地址: {p.operator.ip} · 防篡改哈希: {p.integrityHash.slice(0, 16)}...</div>
                      </div>

                      {/* 恢复与回滚操作按钮 */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500">
                          {p.status === 'reverted' ? '该记录已完成过回滚' : '若确认为误操作，可一键复原'}
                        </span>

                        <button
                          type="button"
                          disabled={!p.isRevertible || p.status === 'reverted' || isRestoring}
                          onClick={() => handleRollback(p)}
                          className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs active:scale-95 ${
                            p.status === 'reverted'
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : isHighRisk
                              ? 'bg-rose-700 hover:bg-rose-800 text-white'
                              : 'bg-indigo-700 hover:bg-indigo-800 text-white'
                          }`}
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                          <span>{p.status === 'reverted' ? '已恢复此版本' : '一键恢复此数据版本'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer Status */}
        <div className="p-2.5 sm:p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
          <span className="flex items-center gap-1 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>实时数据兜底引擎就绪</span>
          </span>
          <button
            type="button"
            onClick={reloadPointers}
            className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
          >
            刷新流水
          </button>
        </div>
      </aside>
    </>
  );
};
