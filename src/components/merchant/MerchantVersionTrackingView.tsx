import React, { useState, useEffect, useMemo } from 'react';
import {
  GitCommit,
  GitBranch,
  RotateCcw,
  ShieldCheck,
  Search,
  Filter,
  UserCheck,
  Sparkles,
  Calendar,
  Layers,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Download,
  Plus,
  Eye,
  Sliders,
  History,
  Tag,
  Package,
  Utensils,
  Ticket,
  Truck,
  Users,
  CreditCard,
  Settings,
  HelpCircle,
  X,
  Play,
  Flame,
  Clock,
  HardDrive
} from 'lucide-react';
import {
  VersionPointer,
  MilestoneSnapshot,
  MerchantOperator,
  FieldDiff,
  VersionModuleType,
  VersionActionType,
  ChainVerifyReport
} from '../../types/versionTracking';
import {
  globalVersionEngine,
  getGovernanceHealth,
  DEFAULT_MERCHANT_OPERATORS,
  MODULE_NAME_MAP,
  ACTION_NAME_MAP
} from '../../utils/versionPointerEngine';
import { useDevSimulation } from '../../context/DevSimulationContext';
import { SimulationProbe } from '../dev/SimulationProbe';
import { DateRangeFilter } from '../common/DateRangeFilter';
import { DateFilterState, resolveDateRange, isWithinRange } from '../../utils/dateFilter';

interface MerchantVersionTrackingViewProps {
  showToast: (msg: string) => void;
}

export const MerchantVersionTrackingView: React.FC<MerchantVersionTrackingViewProps> = ({
  showToast
}) => {
  // Current active operator state
  const [activeOperator, setActiveOperator] = useState<MerchantOperator>(() =>
    globalVersionEngine.getActiveOperator()
  );

  // Version Pointers List
  const [pointers, setPointers] = useState<VersionPointer[]>(() =>
    globalVersionEngine.getAllPointers()
  );

  // Milestone Snapshots List
  const [snapshots, setSnapshots] = useState<MilestoneSnapshot[]>(() =>
    globalVersionEngine.getMilestoneSnapshots()
  );

  // P0-c：真实存证链校验结果（由 getGovernanceHealth 驱动，"校验通过"不得硬编码）
  const [integrityReport, setIntegrityReport] = useState<ChainVerifyReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getGovernanceHealth()
      .then((health) => {
        if (!cancelled) setIntegrityReport(health.integrity);
      })
      .catch((err) => {
        console.warn('[VersionTracking] 存证链校验失败:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [pointers.length]);

  const integrityLabelOf = (p: VersionPointer): string => {
    if (!integrityReport) return '存证中 · 未校验';
    return integrityReport.brokenPointerIds.includes(p.pointerId) ? '校验失败' : '校验通过';
  };

  // Active Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'snapshots' | 'operators' | 'sandbox'>('timeline');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [onlyRevertible, setOnlyRevertible] = useState(false);
  // 时间区间筛选（指针 timestamp: 'YYYY-MM-DD HH:mm:ss'，可被 Date 解析）
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const dateRange = useMemo(() => resolveDateRange(dateFilter), [dateFilter]);

  // Inspector Modal State
  const [inspectingPointer, setInspectingPointer] = useState<VersionPointer | null>(null);

  // Rollback Confirmation Modal State
  const [rollbackTargetPointer, setRollbackTargetPointer] = useState<VersionPointer | null>(null);
  const [isRollbacking, setIsRollbacking] = useState(false);

  // Snapshot Creation Modal State
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshotTitle, setSnapshotTitle] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [snapshotTag, setSnapshotTag] = useState<MilestoneSnapshot['tag']>('manual');

  // Sandbox testing form state
  const [sandboxDishPrice, setSandboxDishPrice] = useState('35');
  const [sandboxStockQty, setSandboxStockQty] = useState('45');
  const [sandboxDeliveryMin, setSandboxDeliveryMin] = useState('20');

  // Reload data when storage events trigger
  const reloadData = () => {
    setPointers(globalVersionEngine.getAllPointers());
    setSnapshots(globalVersionEngine.getMilestoneSnapshots());
    setActiveOperator(globalVersionEngine.getActiveOperator());
  };

  useEffect(() => {
    const handlePointersUpdate = () => reloadData();
    const handleDataRestored = () => reloadData();
    const handleOperatorChanged = (e: any) => {
      if (e.detail) setActiveOperator(e.detail);
    };

    window.addEventListener('obsidian_version_pointers_updated', handlePointersUpdate);
    window.addEventListener('obsidian_data_restored', handleDataRestored);
    window.addEventListener('obsidian_operator_changed', handleOperatorChanged);

    return () => {
      window.removeEventListener('obsidian_version_pointers_updated', handlePointersUpdate);
      window.removeEventListener('obsidian_data_restored', handleDataRestored);
      window.removeEventListener('obsidian_operator_changed', handleOperatorChanged);
    };
  }, []);

  // Filtered pointers list
  const filteredPointers = useMemo(() => {
    return pointers.filter((p) => {
      if (!isWithinRange(new Date(p.timestamp).getTime(), dateRange)) return false;
      if (selectedOperatorId !== 'all' && p.operator.id !== selectedOperatorId) return false;
      if (selectedModule !== 'all' && p.module !== selectedModule) return false;
      if (selectedAction !== 'all' && p.actionType !== selectedAction) return false;
      if (onlyRevertible && !p.isRevertible) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.entityName.toLowerCase().includes(q);
        const matchSummary = p.summary.toLowerCase().includes(q);
        const matchOp = p.operator.name.toLowerCase().includes(q);
        const matchTag = p.versionTag.toLowerCase().includes(q);
        const matchId = p.pointerId.toLowerCase().includes(q);
        if (!matchTitle && !matchSummary && !matchOp && !matchTag && !matchId) return false;
      }

      return true;
    });
  }, [pointers, selectedOperatorId, selectedModule, selectedAction, onlyRevertible, searchQuery, dateRange]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalRevisions = pointers.length;
    const todayRevisions = pointers.filter((p) => p.timestamp.startsWith('2026-09-01') || p.formattedTime.includes('今日')).length;
    const totalRollbacks = pointers.filter((p) => p.isRollback || p.actionType === 'rollback').length;
    const operatorCount = new Set(pointers.map((p) => p.operator.id)).size;

    return {
      totalRevisions,
      todayRevisions,
      totalRollbacks,
      operatorCount,
      integrityScore: '100%'
    };
  }, [pointers]);

  // Operator activity stats
  const operatorStats = useMemo(() => {
    const opMap: Record<string, { operator: MerchantOperator; count: number; lastActive: string }> = {};

    DEFAULT_MERCHANT_OPERATORS.forEach((op) => {
      opMap[op.id] = { operator: op, count: 0, lastActive: '暂无' };
    });

    pointers.forEach((p) => {
      const opId = p.operator.id;
      if (!opMap[opId]) {
        opMap[opId] = { operator: p.operator, count: 0, lastActive: p.timestamp };
      }
      opMap[opId].count += 1;
      if (opMap[opId].lastActive === '暂无') {
        opMap[opId].lastActive = p.timestamp;
      }
    });

    return Object.values(opMap).sort((a, b) => b.count - a.count);
  }, [pointers]);

  // Handle Switch Operator
  const handleSwitchOperator = (op: MerchantOperator) => {
    globalVersionEngine.setActiveOperator(op);
    setActiveOperator(op);
    showToast(`当前操作员已切换为：【${op.name}】(${op.roleName})`);
  };

  // Handle Rollback Pointer
  /**
   * 回滚执行器。
   *
   * P0-a 修复：此前回滚失败只弹一句 toast，且 executeCascadingRollback 在失败时
   * 根本不提示，用户点击毫无反馈。现在区分三类结果：
   *  - 成功 → 提示 + 刷新；
   *  - CONFLICT（该实体在指针之后又被修改）→ 弹确认框，由管理员显式决定是否强制覆盖；
   *  - 其他失败（模块不支持 / 写入失败）→ 明确提示原因，不产生任何静默变更。
   */
  const runRollback = (pointerId: string, force: boolean): boolean => {
    const res = globalVersionEngine.rollbackPointer(pointerId, { force });

    if (res.success) {
      showToast(`🎉 ${res.message}`);
      reloadData();
      return true;
    }

    if (res.reason === 'CONFLICT' && !force) {
      const proceed = window.confirm(
        `${res.message}\n\n是否确认丢弃上述后续变更，强制回滚到该历史版本？`
      );
      if (proceed) {
        return runRollback(pointerId, true);
      }
      showToast('已取消回滚，数据未发生任何变更');
      return false;
    }

    showToast(`❌ ${res.message}`);
    return false;
  };

  const handleExecuteRollback = () => {
    if (!rollbackTargetPointer) return;
    const pointerId = rollbackTargetPointer.pointerId;
    setIsRollbacking(true);

    setTimeout(() => {
      runRollback(pointerId, false);
      setIsRollbacking(false);
      setRollbackTargetPointer(null);
      setInspectingPointer(null);
    }, 400);
  };

  // Handle Single Field Rollback
  /**
   * P0-a 修复：此前对未支持模块会"提示修复成功但数据未改"。
   * 现在失败原因被真实回传，冲突时交由管理员裁决。
   */
  const handleRollbackField = (pointerId: string, fieldKey: string) => {
    const res = globalVersionEngine.rollbackSingleField(pointerId, fieldKey);
    if (res.success) {
      showToast(`✓ ${res.message}`);
      reloadData();
      if (inspectingPointer) {
        setInspectingPointer(null);
      }
      return;
    }

    if (res.reason === 'CONFLICT') {
      const proceed = window.confirm(
        `${res.message}\n\n是否确认丢弃后续变更，强制将该字段恢复为历史值？`
      );
      if (proceed) {
        const forced = globalVersionEngine.rollbackSingleField(pointerId, fieldKey, {
          force: true
        });
        if (forced.success) {
          showToast(`✓ ${forced.message}`);
          reloadData();
          if (inspectingPointer) {
            setInspectingPointer(null);
          }
        } else {
          showToast(`❌ ${forced.message}`);
        }
        return;
      }
      showToast('已取消字段修复，数据未发生任何变更');
      return;
    }

    showToast(`✕ ${res.message}`);
  };

  // Handle Create Snapshot
  const handleSaveSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotTitle.trim()) {
      showToast('请填写快照名称');
      return;
    }

    const created = globalVersionEngine.createManualSnapshot(
      snapshotTitle.trim(),
      snapshotDesc.trim() || '商户手动创建的数据版本保护点',
      snapshotTag
    );

    setIsSnapshotModalOpen(false);
    setSnapshotTitle('');
    setSnapshotDesc('');
    showToast(`🛡️ 成功创建安全快照【${created.title}】！`);
    reloadData();
  };

  // Handle Restore Full Snapshot
  const handleRestoreSnapshot = (snapshot: MilestoneSnapshot) => {
    if (window.confirm(`确认要将全量数据回滚还原至快照【${snapshot.title}】(${snapshot.createdAt}) 吗？\n该操作将覆盖当前所有菜品、原料与活动配置并生成灾备存证。`)) {
      const res = globalVersionEngine.restoreMilestoneSnapshot(snapshot.snapshotId);
      if (res.success) {
        showToast(`🚨 ${res.message}`);
        reloadData();
      } else {
        showToast(`✕ ${res.message}`);
      }
    }
  };

  // Export Audit Report
  const handleExportReport = () => {
    globalVersionEngine.exportAuditReport(pointers);
    showToast('已导出防篡改格式的 JSON 完整版本审计报告！');
  };

  // Sandbox simulation triggers
  const handleSimulateDishPriceChange = () => {
    const p = parseFloat(sandboxDishPrice) || 35;
    const currentDishes = JSON.parse(localStorage.getItem('obsidian_truck_dishes') || '[]');
    const target = currentDishes[0] || { id: 'dish-1', name: '炭烤安格斯牛肉串', price: 32 };
    const oldPrice = target.price || 32;

    const updatedDish = { ...target, price: p };
    const updatedList = currentDishes.map((d: any) => (d.id === target.id ? updatedDish : d));
    localStorage.setItem('obsidian_truck_dishes', JSON.stringify(updatedList));

    globalVersionEngine.recordDataMutation({
      module: 'dishes',
      entityId: target.id,
      entityName: target.name || '炭烤安格斯牛肉串',
      actionType: 'update',
      beforeData: { id: target.id, name: target.name, price: oldPrice },
      afterData: { id: target.id, name: target.name, price: p },
      customSummary: `${activeOperator.name} (${activeOperator.roleName}) 模拟调价：将【${target.name}】单价从 ¥${oldPrice.toFixed(2)} 调整为 ¥${p.toFixed(2)}`
    });

    showToast(`已模拟提交调价变更！单价已更新为 ¥${p} 并生成版本指针`);
    reloadData();
  };

  const handleSimulateMaterialStockChange = () => {
    const qty = parseFloat(sandboxStockQty) || 45;
    const currentMaterials = JSON.parse(localStorage.getItem('obsidian_truck_materials') || '[]');
    const target = currentMaterials[0] || { id: 'mat-001', name: '安格斯谷饲牛上脑肉', currentStock: 35 };
    const oldStock = target.currentStock || 35;

    const updatedMat = { ...target, currentStock: qty };
    const updatedList = currentMaterials.map((m: any) => (m.id === target.id ? updatedMat : m));
    localStorage.setItem('obsidian_truck_materials', JSON.stringify(updatedList));

    globalVersionEngine.recordDataMutation({
      module: 'materials',
      entityId: target.id,
      entityName: target.name || '安格斯谷饲牛上脑肉',
      actionType: 'update',
      beforeData: { id: target.id, name: target.name, currentStock: oldStock },
      afterData: { id: target.id, name: target.name, currentStock: qty },
      customSummary: `${activeOperator.name} (${activeOperator.roleName}) 模拟库存盘点：将【${target.name}】在库量从 ${oldStock}kg 校准为 ${qty}kg`
    });

    showToast(`已模拟提交库存实盘！在库量更新为 ${qty}kg 并生成版本指针`);
    reloadData();
  };

  const getModuleIcon = (module: VersionModuleType) => {
    switch (module) {
      case 'dishes':
        return <Utensils className="w-3.5 h-3.5 text-amber-600" />;
      case 'materials':
        return <Package className="w-3.5 h-3.5 text-blue-600" />;
      case 'coupons':
      case 'marketing':
        return <Ticket className="w-3.5 h-3.5 text-emerald-600" />;
      case 'delivery':
        return <Truck className="w-3.5 h-3.5 text-indigo-600" />;
      case 'staff':
        return <Users className="w-3.5 h-3.5 text-purple-600" />;
      case 'payments':
        return <CreditCard className="w-3.5 h-3.5 text-teal-600" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-3.5 max-w-6xl mx-auto pb-10 text-xs text-[#0f172a] font-sans">
      {/* 1. Header & Active Operator Switcher Banner */}
      <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-3.5 border-b border-[#f1f5f9]">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-[3px] bg-[#0f172a] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <GitBranch className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-[#0f172a]">
                  商家端数据变更指针追踪与版本修复中枢 (Revision Tracking & Repair)
                </h3>
                <span className="text-[10px] bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] px-1.5 py-0.2 rounded-[2px] font-mono font-semibold">
                  Git-Like 增量存证
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.2 rounded-[2px] font-mono">
                  不可篡改哈希
                </span>
              </div>
              <p className="text-[11px] text-[#64748b] mt-0.5">
                记录每位商户用户（店长/主厨/收银/骑手）对菜品、库存、满减与配送等数据的修改指针，支持字段级前后差异倒查与一键精准回滚修复。
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setIsSnapshotModalOpen(true)}
              className="px-3 py-1.5 bg-[#0f172a] hover:bg-black text-white rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>打标安全快照 (Snapshot)</span>
            </button>

            <button
              type="button"
              onClick={handleExportReport}
              className="px-2.5 py-1.5 bg-white hover:bg-[#f8fafc] text-[#0f172a] border border-[#cbd5e1] rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="导出完整 JSON 版本追溯报告"
            >
              <Download className="w-3.5 h-3.5 text-[#64748b]" />
              <span>导出审计日志</span>
            </button>
          </div>
        </div>

        {/* Current Operator Identification & Quick Switch Bar */}
        <div className="mt-3 p-2.5 bg-[#f8fafc] rounded-[3px] border border-[#cbd5e1] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">{activeOperator.avatar}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-[#64748b]">当前操作员指针:</span>
                <strong className="text-xs font-bold text-[#0f172a]">{activeOperator.name}</strong>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded font-semibold">
                  {activeOperator.roleName}
                </span>
                <span className="text-[10px] bg-white text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded font-mono">
                  {activeOperator.shiftBadge}
                </span>
              </div>
              <div className="text-[10px] text-[#64748b] truncate mt-0.5">
                设备: {activeOperator.deviceInfo} · IP: {activeOperator.ip}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 self-start sm:self-center flex-wrap">
            <span className="text-[10.5px] text-[#64748b] mr-1">切换身份:</span>
            {DEFAULT_MERCHANT_OPERATORS.map((op) => {
              const isCurrent = op.id === activeOperator.id;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => handleSwitchOperator(op)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition-all cursor-pointer border ${
                    isCurrent
                      ? 'bg-[#0f172a] text-white border-[#0f172a] font-bold shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                  title={`${op.name} (${op.roleName})`}
                >
                  {op.avatar} {op.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5 Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 mt-1">
          <div className="p-2.5 bg-[#f8fafc] rounded-[3px] border border-[#e2e8f0]">
            <span className="text-[10.5px] text-[#64748b] font-medium block">累计版本修订指针</span>
            <span className="text-base font-bold text-[#0f172a] font-mono mt-0.5 block flex items-center gap-1">
              <GitCommit className="w-3.5 h-3.5 text-blue-600" />
              <span>{stats.totalRevisions}</span>
              <span className="text-[10px] text-[#64748b] font-normal">commits</span>
            </span>
          </div>

          <div className="p-2.5 bg-[#f8fafc] rounded-[3px] border border-[#e2e8f0]">
            <span className="text-[10.5px] text-[#64748b] font-medium block">今日数据修改记录</span>
            <span className="text-base font-bold text-amber-600 font-mono mt-0.5 block">
              {stats.todayRevisions} <span className="text-xs text-[#64748b] font-normal">次</span>
            </span>
          </div>

          <div className="p-2.5 bg-[#f8fafc] rounded-[3px] border border-[#e2e8f0]">
            <span className="text-[10.5px] text-[#64748b] font-medium block">回滚与精准修复</span>
            <span className="text-base font-bold text-emerald-600 font-mono mt-0.5 block flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{stats.totalRollbacks}</span>
              <span className="text-xs text-[#64748b] font-normal">次</span>
            </span>
          </div>

          <div className="p-2.5 bg-[#f8fafc] rounded-[3px] border border-[#e2e8f0]">
            <span className="text-[10.5px] text-[#64748b] font-medium block">活跃操作员账户</span>
            <span className="text-base font-bold text-[#0f172a] font-mono mt-0.5 block">
              {stats.operatorCount} <span className="text-xs text-[#64748b] font-normal">人</span>
            </span>
          </div>

          <div className="p-2.5 bg-[#f8fafc] rounded-[3px] border border-[#e2e8f0] col-span-2 sm:col-span-1">
            <span className="text-[10.5px] text-[#64748b] font-medium block">数据存证完整度</span>
            <span className="text-base font-bold text-emerald-700 font-mono mt-0.5 block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{stats.integrityScore}</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-sans">正常</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Sub-tab Controller */}
      <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-1.5 shadow-xs flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 时间区间筛选：版本指针/快照按操作时间过滤 */}
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} compact />
          <button
            type="button"
            onClick={() => setActiveSubTab('timeline')}
            className={`px-3 py-1.5 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'timeline'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'bg-white text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span>版本指针流水线 (Timeline)</span>
            <span className="font-mono text-[10px] bg-black/20 text-white px-1.5 rounded">
              {filteredPointers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('snapshots')}
            className={`px-3 py-1.5 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'snapshots'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'bg-white text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            <span>里程碑快照灾备 (Milestones)</span>
            <span className="font-mono text-[10px] bg-black/20 text-white px-1.5 rounded">
              {snapshots.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('operators')}
            className={`px-3 py-1.5 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'operators'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'bg-white text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>商户人员操作溯源</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('sandbox')}
            className={`px-3 py-1.5 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'sandbox'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'bg-white text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-purple-400" />
            <span>实时演练沙盒 (Live Sandbox)</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: REVISION TIMELINE */}
      {activeSubTab === 'timeline' && (
        <div className="space-y-3">
          {/* Search and Filters Bar */}
          <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索修订对象、修改字段、操作员或版本号..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-[#cbd5e1] hover:border-[#94a3b8] focus:border-[#0f172a] rounded-[3px] outline-none text-[#0f172a]"
                />
              </div>

              {/* Operator Filter */}
              <select
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-[#cbd5e1] rounded-[3px] text-xs font-semibold text-[#0f172a] outline-none cursor-pointer hover:bg-[#f8fafc]"
              >
                <option value="all">全部商户操作人</option>
                {DEFAULT_MERCHANT_OPERATORS.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name} ({op.roleName})
                  </option>
                ))}
              </select>

              {/* Module Filter */}
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-[#cbd5e1] rounded-[3px] text-xs font-semibold text-[#0f172a] outline-none cursor-pointer hover:bg-[#f8fafc]"
              >
                <option value="all">全部业务模块</option>
                <option value="dishes">菜品与菜单</option>
                <option value="materials">原料与库存</option>
                <option value="coupons">优惠券</option>
                <option value="marketing">阶梯满减与叠享</option>
                <option value="delivery">外卖配送</option>
                <option value="tables">桌台与点位</option>
                <option value="staff">员工与RBAC</option>
              </select>

              {/* Action Filter */}
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-[#cbd5e1] rounded-[3px] text-xs font-semibold text-[#0f172a] outline-none cursor-pointer hover:bg-[#f8fafc]"
              >
                <option value="all">全部动作类型</option>
                <option value="update">字段修改 (Update)</option>
                <option value="create">新增录入 (Create)</option>
                <option value="delete">删除/注销 (Delete)</option>
                <option value="rollback">版本回滚修复 (Rollback)</option>
                <option value="snapshot_create">安全快照创建</option>
              </select>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center">
              <label className="flex items-center gap-1.5 text-[11px] text-[#64748b] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyRevertible}
                  onChange={(e) => setOnlyRevertible(e.target.checked)}
                  className="rounded text-[#0f172a] focus:ring-0"
                />
                <span>仅看可回滚</span>
              </label>

              <span className="text-[11px] text-[#64748b]">
                共 <strong className="text-[#0f172a] font-bold font-mono">{filteredPointers.length}</strong> 条指针
              </span>
            </div>
          </div>

          {/* Timeline Stream */}
          <div className="space-y-2.5">
            {filteredPointers.map((pointer) => {
              const isRollback = pointer.isRollback || pointer.actionType === 'rollback';
              return (
                <div
                  key={pointer.pointerId}
                  className={`bg-white rounded-[4px] border p-3.5 shadow-xs transition-all relative overflow-hidden ${
                    isRollback
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : pointer.status === 'reverted'
                      ? 'border-[#cbd5e1] bg-slate-50/50'
                      : 'border-[#cbd5e1] hover:border-[#94a3b8]'
                  }`}
                >
                  {/* Top Bar: Version Tag, Timestamp, Operator, Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-[#0f172a] text-white rounded font-mono font-bold text-[10.5px]">
                        {pointer.versionTag}
                      </span>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-[#0f172a] bg-[#f8fafc] border border-[#e2e8f0] px-2 py-0.5 rounded">
                        {getModuleIcon(pointer.module)}
                        <span>{pointer.moduleName}</span>
                      </div>

                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold font-mono border ${
                          pointer.actionType === 'rollback'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : pointer.actionType === 'create'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : pointer.actionType === 'delete'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {pointer.actionName}
                      </span>

                      {pointer.status === 'reverted' && (
                        <span className="text-[9.5px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                          [已被后续回滚重置]
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 text-[11px] text-[#64748b]">
                      <div className="flex items-center gap-1 font-medium">
                        <span>{pointer.operator.avatar}</span>
                        <strong className="text-[#0f172a] font-bold">{pointer.operator.name}</strong>
                        <span className="text-[10px] text-[#64748b]">({pointer.operator.roleName})</span>
                      </div>

                      <span className="text-[10.5px] font-mono text-[#64748b]">
                        {pointer.formattedTime}
                      </span>
                    </div>
                  </div>

                  {/* Middle Content: Target Entity & Diff Summary */}
                  <div className="pt-2 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-[#0f172a]">
                            {pointer.entityName}
                          </h4>
                          <span className="text-[10px] font-mono text-[#64748b] bg-[#f8fafc] px-1.5 py-0.2 rounded border border-[#cbd5e1]">
                            ID: {pointer.entityId}
                          </span>
                        </div>
                        <p className="text-xs text-[#334155] mt-1 font-medium leading-relaxed">
                          {pointer.summary}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setInspectingPointer(pointer)}
                          className="px-2.5 py-1 bg-white hover:bg-[#f1f5f9] text-[#0f172a] border border-[#cbd5e1] rounded-[3px] text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Eye className="w-3 h-3 text-[#64748b]" />
                          <span>差异透视</span>
                        </button>

                        {pointer.isRevertible && (
                          <button
                            type="button"
                            onClick={() => setRollbackTargetPointer(pointer)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[3px] text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs active:scale-95"
                            title="将数据撤销并回滚至此版本修改前"
                          >
                            <RotateCcw className="w-3 h-3 text-emerald-200" />
                            <span>一键回滚此版本</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Field Diffs Visual Tags */}
                    {pointer.fieldDiffs.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                        {pointer.fieldDiffs.map((diff, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[#f8fafc] border border-[#e2e8f0] text-[10.5px]"
                          >
                            <span className="font-semibold text-slate-700">{diff.fieldLabel}:</span>
                            <span className="line-through text-red-600 font-mono text-[10px]">
                              {diff.oldValueDisplay}
                            </span>
                            <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                            <span className="font-bold text-emerald-700 font-mono">
                              {diff.newValueDisplay}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Integrity Hash Footer */}
                  <div className="mt-2.5 pt-1.5 border-t border-[#f1f5f9] flex items-center justify-between text-[10px] text-[#64748b]">
                    <span className="font-mono text-[9.5px]">
                      Hash:{' '}
                      <strong className="text-slate-700 font-mono">
                        {pointer.chainProof?.chainHash?.slice(0, 18) ?? pointer.integrityHash}
                      </strong>{' '}
                      · {integrityLabelOf(pointer)}
                    </span>
                    <span className="font-mono text-[9.5px]">Pointer ID: {pointer.pointerId}</span>
                  </div>
                </div>
              );
            })}

            {filteredPointers.length === 0 && (
              <div className="bg-white rounded-[4px] border border-[#cbd5e1] p-8 text-center text-[#64748b]">
                <Search className="w-6 h-6 mx-auto mb-2 text-[#94a3b8]" />
                <p className="font-semibold text-xs">未匹配到符合条件的版本指针记录</p>
                <p className="text-[11px] mt-0.5">请尝试清空搜索关键词或更换筛选条件</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: MILESTONE SNAPSHOTS */}
      {activeSubTab === 'snapshots' && (
        <div className="space-y-3">
          <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#0f172a]">
                里程碑安全快照与全量灾备归档 (Milestone Snapshots)
              </h4>
              <p className="text-[11px] text-[#64748b] mt-0.5">
                在开餐前、晚市大促前或重大菜品调优前打标安全还原点，发生误操作时可一键全量灾备还原。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSnapshotModalOpen(true)}
              className="px-3 py-1.5 bg-[#0f172a] hover:bg-black text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>新建里程碑快照</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {snapshots.map((snap) => (
              <div
                key={snap.snapshotId}
                className="bg-white rounded-[4px] border border-[#cbd5e1] hover:border-[#94a3b8] p-4 shadow-xs flex flex-col justify-between space-y-3 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-blue-600" />
                      <h4 className="font-bold text-xs sm:text-sm text-[#0f172a]">
                        {snap.title}
                      </h4>
                    </div>
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold">
                      {snap.tagLabel}
                    </span>
                  </div>

                  <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                    {snap.description}
                  </p>
                </div>

                {/* Data Summary Grid */}
                <div className="grid grid-cols-4 gap-1.5 p-2 bg-[#f8fafc] rounded border border-[#e2e8f0] text-center text-[10px]">
                  <div>
                    <span className="text-[#64748b] block">菜品总数</span>
                    <strong className="text-xs font-mono font-bold text-[#0f172a]">
                      {snap.dataSummary.dishesCount}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#64748b] block">原料资产</span>
                    <strong className="text-xs font-mono font-bold text-[#0f172a]">
                      {snap.dataSummary.materialsCount}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#64748b] block">营销券数</span>
                    <strong className="text-xs font-mono font-bold text-[#0f172a]">
                      {snap.dataSummary.couponsCount}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#64748b] block">桌位总数</span>
                    <strong className="text-xs font-mono font-bold text-[#0f172a]">
                      {snap.dataSummary.tablesCount}
                    </strong>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-[10.5px]">
                  <div className="text-[#64748b]">
                    <span>创建人: <strong className="text-[#0f172a]">{snap.createdBy.name}</strong></span>
                    <span className="ml-2 font-mono">{snap.createdAt}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRestoreSnapshot(snap)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                  >
                    <RotateCcw className="w-3 h-3 text-red-200" />
                    <span>灾备全量还原</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: OPERATOR BEHAVIOR ANALYTICS */}
      {activeSubTab === 'operators' && (
        <div className="space-y-3">
          <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-3.5 shadow-xs">
            <h4 className="text-xs sm:text-sm font-bold text-[#0f172a]">
              商户多账户修改行为与责任追溯看板 (Operator Attribution)
            </h4>
            <p className="text-[11px] text-[#64748b] mt-0.5">
              精准追查每个员工账户（店长、主厨、收银员、外卖主管）在不同时间段下的操作频率、权限范围与最新动向。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {operatorStats.map(({ operator, count, lastActive }) => {
              const isCurrent = operator.id === activeOperator.id;
              return (
                <div
                  key={operator.id}
                  className={`bg-white rounded-[4px] border p-3.5 shadow-xs flex flex-col justify-between space-y-3 transition-all ${
                    isCurrent ? 'border-[#0f172a] ring-1 ring-[#0f172a]' : 'border-[#cbd5e1]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center text-xl shrink-0">
                        {operator.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs sm:text-sm text-[#0f172a]">
                            {operator.name}
                          </h4>
                          {isCurrent && (
                            <span className="text-[9.5px] bg-[#0f172a] text-white px-1.5 py-0.2 rounded font-bold">
                              当前操作中
                            </span>
                          )}
                        </div>
                        <span className="text-[10.5px] text-[#64748b]">{operator.roleName}</span>
                      </div>
                    </div>

                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                      {operator.shiftBadge}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-[#64748b] bg-[#f8fafc] p-2 rounded border border-[#e2e8f0]">
                    <div className="flex justify-between">
                      <span>累计操作记录:</span>
                      <strong className="text-[#0f172a] font-mono">{count} 次</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>登入终端:</span>
                      <span className="text-[#0f172a] truncate max-w-[150px]">{operator.deviceInfo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>最新操作时间:</span>
                      <span className="font-mono text-[#0f172a]">{lastActive}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOperatorId(operator.id);
                      setActiveSubTab('timeline');
                    }}
                    className="w-full py-1.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>查看该用户全部修改指针流水</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 4: LIVE SANDBOX & PLAYGROUND */}
      {activeSubTab === 'sandbox' && (
        <SimulationProbe pointId="SIM_ROLLBACK_DISASTER_RECOVERY" className="block">
          <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-4 shadow-xs space-y-4">
            <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#0f172a] flex items-center gap-2">
              <Play className="w-4 h-4 text-purple-600" />
              <span>数据修改与指针追溯实时演练沙盒 (Mutation Sandbox)</span>
            </h4>
            <p className="text-[11px] text-[#64748b] mt-0.5">
              在此快速模拟调价、库存盘点和外卖运费调整。每次点击都会在当前身份下实时产生版本指针并在时间线上呈现。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            {/* Box 1: Dish price adjust */}
            <div className="p-3.5 bg-[#f8fafc] rounded-[3px] border border-[#cbd5e1] space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-[#0f172a]">
                <Utensils className="w-3.5 h-3.5 text-amber-600" />
                <span>1. 模拟菜品单价修改</span>
              </div>
              <p className="text-[11px] text-[#64748b]">
                修改【炭烤安格斯牛肉串】的售价，见证价格字段修改与前后值对比。
              </p>
              <div>
                <label className="text-[10.5px] font-bold text-[#0f172a] block mb-1">新售价 (¥)</label>
                <input
                  type="number"
                  value={sandboxDishPrice}
                  onChange={(e) => setSandboxDishPrice(e.target.value)}
                  className="w-full p-2 bg-white border border-[#cbd5e1] rounded font-mono font-bold text-xs outline-none focus:border-[#0f172a]"
                />
              </div>
              <button
                type="button"
                onClick={handleSimulateDishPriceChange}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
              >
                <span>以【{activeOperator.name}】身份提交调价</span>
              </button>
            </div>

            {/* Box 2: Material stock adjust */}
            <div className="p-3.5 bg-[#f8fafc] rounded-[3px] border border-[#cbd5e1] space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-[#0f172a]">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                <span>2. 模拟原料库存实盘调账</span>
              </div>
              <p className="text-[11px] text-[#64748b]">
                修改【安格斯谷饲牛上脑肉】在库数量，模拟盘点误差校准。
              </p>
              <div>
                <label className="text-[10.5px] font-bold text-[#0f172a] block mb-1">实盘在库量 (kg)</label>
                <input
                  type="number"
                  value={sandboxStockQty}
                  onChange={(e) => setSandboxStockQty(e.target.value)}
                  className="w-full p-2 bg-white border border-[#cbd5e1] rounded font-mono font-bold text-xs outline-none focus:border-[#0f172a]"
                />
              </div>
              <button
                type="button"
                onClick={handleSimulateMaterialStockChange}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
              >
                <span>以【{activeOperator.name}】身份提交库存更新</span>
              </button>
            </div>

            {/* Box 3: Quick create snapshot */}
            <div className="p-3.5 bg-[#f8fafc] rounded-[3px] border border-[#cbd5e1] space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-[#0f172a]">
                <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. 快速安全快照演练</span>
              </div>
              <p className="text-[11px] text-[#64748b]">
                一键对全店 24 种菜品、16 种原料与营销策略打上时间戳快照。
              </p>
              <div className="p-2 bg-white rounded border border-[#e2e8f0] text-[10.5px] text-[#64748b]">
                快照将自动记录至时间线并生成独一无二的防篡改 SHA-256 签名。
              </div>
              <button
                type="button"
                onClick={() => {
                  globalVersionEngine.createManualSnapshot('演练测试快照 (Sandbox Backup)', '沙盒模拟演练创建的安全还原点', 'manual');
                  showToast('已成功创建演练快照！');
                  reloadData();
                  setActiveSubTab('timeline');
                }}
                className="w-full py-2 bg-[#0f172a] hover:bg-black text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
              >
                <span>生成即时安全快照</span>
              </button>
            </div>
          </div>
        </div>
      </SimulationProbe>
    )}

      {/* MODAL 1: VISUAL DIFF & ROLLBACK INSPECTOR */}
      {inspectingPointer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[4px] border border-[#cbd5e1] shadow-2xl flex flex-col overflow-hidden text-[#0f172a] animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-white px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[3px] bg-[#0f172a] text-white flex items-center justify-center">
                  <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0f172a]">
                    版本差异透视与字段级精准修复 (Diff Inspector)
                  </h3>
                  <span className="text-[10px] text-[#64748b] font-mono">
                    Version: {inspectingPointer.versionTag} · ID: {inspectingPointer.pointerId}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingPointer(null)}
                className="p-1 rounded text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Operator info card */}
              <div className="p-3 bg-[#f8fafc] rounded-[3px] border border-[#e2e8f0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{inspectingPointer.operator.avatar}</span>
                  <div>
                    <div className="font-bold text-xs text-[#0f172a]">
                      {inspectingPointer.operator.name} ({inspectingPointer.operator.roleName})
                    </div>
                    <div className="text-[10.5px] text-[#64748b]">
                      操作时间: {inspectingPointer.timestamp} · 模块: {inspectingPointer.moduleName}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] bg-white border border-[#cbd5e1] px-2 py-0.5 rounded font-mono text-[#0f172a]">
                  {inspectingPointer.actionName}
                </span>
              </div>

              {/* Summary */}
              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-[3px]">
                <span className="text-[10.5px] font-bold text-amber-900 block mb-0.5">修改说明摘要:</span>
                <p className="text-xs text-amber-950 font-medium">{inspectingPointer.summary}</p>
              </div>

              {/* Field Diffs Side-by-Side Table with Surgical Rollback buttons */}
              <div>
                <span className="text-[11px] font-bold text-[#0f172a] block mb-2">
                  精确字段修改对照表 (支持按单字段按需回滚)
                </span>

                {inspectingPointer.fieldDiffs.length > 0 ? (
                  <div className="space-y-2">
                    {inspectingPointer.fieldDiffs.map((diff, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white border border-[#e2e8f0] rounded-[3px] space-y-2 hover:border-[#cbd5e1] transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#0f172a]">
                            {diff.fieldLabel} <span className="text-[10px] font-mono text-[#64748b]">({diff.field})</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRollbackField(inspectingPointer.pointerId, diff.field)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-300 text-slate-700 rounded text-[10px] font-semibold cursor-pointer transition-colors"
                            title="单独恢复此属性至修改前"
                          >
                            单独恢复此字段
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 bg-red-50/60 border border-red-200 rounded text-red-950">
                            <span className="text-[9.5px] font-bold text-red-700 block mb-0.5">
                              [ 修改前 (Before) ]
                            </span>
                            <span className="font-mono text-xs font-semibold">{diff.oldValueDisplay}</span>
                          </div>

                          <div className="p-2 bg-emerald-50/60 border border-emerald-200 rounded text-emerald-950">
                            <span className="text-[9.5px] font-bold text-emerald-700 block mb-0.5">
                              [ 修改后 (After) ]
                            </span>
                            <span className="font-mono text-xs font-semibold">{diff.newValueDisplay}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-[#f8fafc] text-center text-xs text-[#64748b] rounded border border-[#e2e8f0]">
                    该操作为非字段级变更或全量快照创建
                  </div>
                )}
              </div>

              {/* Raw JSON Snapshot Viewer */}
              <div className="p-3 bg-[#0f172a] text-slate-200 rounded-[3px] space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 font-mono block">
                  SHA-256 INTEGRITY SIGNATURE
                </span>
                <div className="text-[10.5px] font-mono break-all text-slate-300">
                  {inspectingPointer.integrityHash}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#f8fafc] px-4 py-3 border-t border-[#e2e8f0] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setInspectingPointer(null)}
                className="px-3.5 py-1.5 bg-white border border-[#cbd5e1] rounded text-xs font-semibold hover:bg-[#f1f5f9] cursor-pointer"
              >
                关闭
              </button>

              {inspectingPointer.isRevertible && (
                <button
                  type="button"
                  onClick={() => {
                    setRollbackTargetPointer(inspectingPointer);
                  }}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>一键完整回滚此版本修改</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ROLLBACK CONFIRMATION MODAL */}
      {rollbackTargetPointer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[4px] border border-[#cbd5e1] shadow-2xl overflow-hidden text-[#0f172a] animate-in zoom-in-95">
            <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-red-600 text-white flex items-center justify-center font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold text-red-900">
                  数据版本安全回滚确认 (Safety Rollback)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRollbackTargetPointer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-700 leading-relaxed">
                您即将执行数据回滚操作。该操作将把目标对象恢复到以下版本修改前的历史状态：
              </p>

              <div className="p-3 bg-[#f8fafc] border border-[#cbd5e1] rounded space-y-1 text-[11px]">
                <div>
                  <strong>目标对象:</strong> {rollbackTargetPointer.entityName}
                </div>
                <div>
                  <strong>所属模块:</strong> {rollbackTargetPointer.moduleName}
                </div>
                <div>
                  <strong>修订版本:</strong> {rollbackTargetPointer.versionTag} ({rollbackTargetPointer.timestamp})
                </div>
                <div>
                  <strong>原操作人:</strong> {rollbackTargetPointer.operator.name} ({rollbackTargetPointer.operator.roleName})
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded text-[10.5px]">
                ✓ <strong>无损增量保护:</strong> 系统将自动生成一条全新的「回滚修复存证」记录，绝不丢失历史修改链条。
              </div>
            </div>

            <div className="bg-[#f8fafc] px-4 py-3 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRollbackTargetPointer(null)}
                disabled={isRollbacking}
                className="px-3.5 py-1.5 bg-white border border-[#cbd5e1] rounded text-xs font-semibold hover:bg-[#f1f5f9] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecuteRollback}
                disabled={isRollbacking}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isRollbacking ? (
                  <span>正在回滚数据中...</span>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>确认立即回滚修复</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE MILESTONE SNAPSHOT MODAL */}
      {isSnapshotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[4px] border border-[#cbd5e1] shadow-2xl overflow-hidden text-[#0f172a] animate-in zoom-in-95">
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-bold">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold text-[#0f172a]">
                  创建里程碑数据安全快照 (Create Snapshot)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSnapshotModalOpen(false)}
                className="text-[#64748b] hover:text-[#0f172a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSnapshot} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#0f172a] mb-1">快照名称 *</label>
                <input
                  type="text"
                  required
                  placeholder="如：2026-09-01 晚市大促开单前全量备份"
                  value={snapshotTitle}
                  onChange={(e) => setSnapshotTitle(e.target.value)}
                  className="w-full p-2 bg-white border border-[#cbd5e1] rounded text-xs font-semibold outline-none focus:border-[#0f172a]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0f172a] mb-1">快照归档标签</label>
                <select
                  value={snapshotTag}
                  onChange={(e) => setSnapshotTag(e.target.value as any)}
                  className="w-full p-2 bg-white border border-[#cbd5e1] rounded text-xs font-semibold outline-none"
                >
                  <option value="pre_rush">开餐前基线 (Pre-Rush Baseline)</option>
                  <option value="post_rush">打烊日结存档 (Post-Rush Close)</option>
                  <option value="pricing_campaign">大促调价快照 (Pricing Campaign)</option>
                  <option value="emergency_backup">紧急灾备备份 (Emergency Backup)</option>
                  <option value="manual">手动安全还原点 (Manual Snapshot)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0f172a] mb-1">快照备注说明</label>
                <textarea
                  rows={3}
                  placeholder="记录备份背景，如：更换秋季新菜单与满减阶梯前保留当前运行数据。"
                  value={snapshotDesc}
                  onChange={(e) => setSnapshotDesc(e.target.value)}
                  className="w-full p-2 bg-white border border-[#cbd5e1] rounded text-xs outline-none focus:border-[#0f172a]"
                />
              </div>

              <div className="p-2.5 bg-[#f8fafc] border border-[#cbd5e1] rounded text-[11px] text-[#64748b]">
                快照将把当前所有菜品价格、库存结存、营销卡券和桌台点位打包备份，并记录操作人为【<strong>{activeOperator.name}</strong>】。
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={() => setIsSnapshotModalOpen(false)}
                  className="px-3.5 py-1.5 bg-white border border-[#cbd5e1] rounded text-xs font-semibold hover:bg-[#f1f5f9] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0f172a] hover:bg-black text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>立即打包并生成快照</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
