import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  ShieldCheck,
  Radio,
  ChevronRight,
  Search,
  Check,
  X,
  RefreshCw,
  Sliders,
  Download,
  CheckSquare,
  History,
  Share2,
  Save,
  Lock,
  Truck,
  Users,
  ExternalLink,
  SlidersHorizontal,
  BadgeCheck,
  CheckCircle2,
  Filter,
  Flame,
  Clock,
  Layers,
  FileText,
  Zap,
  DollarSign,
  Wallet
} from 'lucide-react';

import {
  CascadePermissionItem,
  getCascadePermissions,
  toggleCascadePermission,
  applyGoldRiderPreset,
  applyAllOpenPreset,
  resetBaselinePreset,
  saveCascadePermissions,
  getCascadeDistricts,
  getCascadeDirectors,
  getCascadeTrucks,
  getCascadeRiders,
  getCascadeSuperAdmins,
  getCascadeMasterControllers,
  updateCascadeDistrictName,
  updateCascadeDirectorName,
  updateCascadeTruckName,
  updateCascadeRiderName,
  resetCascadeEntitiesStore,
  CascadeDistrictNode,
  CascadeDirectorNode,
  CascadeTruckNode,
  CascadeRiderNode,
  CascadeSuperAdminNode,
  CascadeMasterControllerNode,
  CURRENT_AUDITOR,
  getAssociatedWorkOrder,
  updateWorkOrderStatus,
  AssociatedWorkOrder,
  getCascadeAuditLogs,
  CascadeAuditLog,
  generateFreshMeshToken,
  requestElevatedPrivilege,
  syncDepartmentBaselines
} from '../../utils/cascadeMeshEngine';

import {
  CascadeEditEntityModal,
  EditableEntityData,
  EditableEntityType
} from './cascade/CascadeEditEntityModal';

import {
  L1RootCertModal,
  TruckDispatchModal,
  RiderDetailModal,
  SM4VerifyModal,
  DepartmentSyncModal,
  TemplateDistributionModal,
  ElevatedPrivilegeModal,
  WorkOrderTraceModal,
  AuditLogModal
} from './cascade/CascadeModals';

import { CascadeTopologySidebar } from './cascade/CascadeTopologySidebar';
import { CascadeMatrixHeader } from './cascade/CascadeMatrixHeader';

interface HeadquartersPermissionAndFlowMatrixProps {
  showToast: (msg: string, desc?: string) => void;
}

export const HeadquartersPermissionAndFlowMatrix: React.FC<HeadquartersPermissionAndFlowMatrixProps> = ({
  showToast
}) => {
  // 1. 级联穿透选择状态 (L1 -> L2 -> L3 -> L4)
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('DIST-SUHE');
  const [selectedDirectorId, setSelectedDirectorId] = useState<string>('DIR-ZHAO');
  const [selectedTruckId, setSelectedTruckId] = useState<string>('TRUCK-03');
  const [selectedRiderId, setSelectedRiderId] = useState<string>('RIDER-ZHOU');

  // 实体数据 (支持动态改名与持久化)
  const [districts, setDistricts] = useState<CascadeDistrictNode[]>(getCascadeDistricts());
  const [directors, setDirectors] = useState<CascadeDirectorNode[]>(getCascadeDirectors());
  const [trucks, setTrucks] = useState<CascadeTruckNode[]>(getCascadeTrucks());
  const [riders, setRiders] = useState<CascadeRiderNode[]>(getCascadeRiders());
  const [superAdmins, setSuperAdmins] = useState<CascadeSuperAdminNode[]>(getCascadeSuperAdmins());
  const [masterControllers, setMasterControllers] = useState<CascadeMasterControllerNode[]>(getCascadeMasterControllers());

  // 防误操作解锁/锁定机制状态
  const [isEditUnlocked, setIsEditUnlocked] = useState<boolean>(false);

  // 编辑模态框状态
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editModalData, setEditModalData] = useState<EditableEntityData | null>(null);

  // 下拉穿透导图浮层展开状态
  const [isMatrixOpen, setIsMatrixOpen] = useState<boolean>(false);

  // 拓扑侧栏折叠状态 (支持自由展开/收起，彻底解决右侧遮挡溢出)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // 2. 权限数据状态 (包含全部 5 大分类 15 项标准权限)
  const [permissions, setPermissions] = useState<CascadePermissionItem[]>(getCascadePermissions());

  // 3. 关联工单状态
  const [workOrder, setWorkOrder] = useState<AssociatedWorkOrder>(getAssociatedWorkOrder());

  // 4. 模态框状态集中管理
  const [isL1ModalOpen, setIsL1ModalOpen] = useState<boolean>(false);
  const [isTruckModalOpen, setIsTruckModalOpen] = useState<boolean>(false);
  const [isRiderModalOpen, setIsRiderModalOpen] = useState<boolean>(false);
  const [isSM4ModalOpen, setIsSM4ModalOpen] = useState<boolean>(false);
  const [isDeptSyncModalOpen, setIsDeptSyncModalOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [isElevateModalOpen, setIsElevateModalOpen] = useState<boolean>(false);
  const [targetElevateItem, setTargetElevateItem] = useState<CascadePermissionItem | null>(null);
  const [isTraceModalOpen, setIsTraceModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<CascadeAuditLog[]>(getCascadeAuditLogs());

  // 5. 权限表格过滤与检索状态
  const [filterTab, setFilterTab] = useState<'all' | 'granted' | 'restricted'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [ruleFilter, setRuleFilter] = useState<string>('');

  // 6. 动态保存广播状态与时间戳
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [clockStr, setClockStr] = useState<string>('');
  const [idemToken, setIdemToken] = useState<string>('IDEM-99201-4928');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockStr(now.toISOString().replace('T', ' ').substring(0, 19));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 选中的实体引用
  const currentDistrict = useMemo(
    () => districts.find((d) => d.id === selectedDistrictId) || districts[0],
    [districts, selectedDistrictId]
  );
  const currentDirector = useMemo(
    () => directors.find((d) => d.id === selectedDirectorId) || directors[0],
    [directors, selectedDirectorId]
  );
  const currentTruck = useMemo(
    () => trucks.find((t) => t.id === selectedTruckId) || trucks[0],
    [trucks, selectedTruckId]
  );
  const currentRider = useMemo(
    () => riders.find((r) => r.id === selectedRiderId) || riders[0],
    [riders, selectedRiderId]
  );

  // 打开实体名称编辑弹窗
  const handleOpenEditModal = (
    type: EditableEntityType,
    id: string,
    currentName: string,
    extraLabel?: string,
    extraValue?: string
  ) => {
    setEditModalData({
      type,
      id,
      currentName,
      extraLabel,
      extraValue
    });
    setIsEditModalOpen(true);
  };

  // 保存实体名称修改并触发重新渲染
  const handleSaveEntityName = (
    type: EditableEntityType,
    id: string,
    newName: string,
    extraValue?: string
  ) => {
    if (type === 'district') {
      updateCascadeDistrictName(id, newName);
      setDistricts(getCascadeDistricts());
      showToast('区域/商圈名称已更新', `商圈已重命名为: ${newName}`);
    } else if (type === 'director') {
      updateCascadeDirectorName(id, newName, extraValue);
      setDirectors(getCascadeDirectors());
      showToast('战区总监信息已更新', `总监姓名: ${newName}`);
    } else if (type === 'truck') {
      updateCascadeTruckName(id, newName, extraValue);
      setTrucks(getCascadeTrucks());
      showToast('移动餐车信息已更新', `餐车名称: ${newName}`);
    } else if (type === 'rider') {
      updateCascadeRiderName(id, newName, extraValue);
      setRiders(getCascadeRiders());
      showToast('基层单兵信息已更新', `单兵姓名: ${newName}`);
    }
  };

  // 一键重置所有实体名称至默认
  const handleResetEntityNames = () => {
    resetCascadeEntitiesStore();
    setDistricts(getCascadeDistricts());
    setDirectors(getCascadeDirectors());
    setTrucks(getCascadeTrucks());
    setRiders(getCascadeRiders());
    showToast('已重置所有自定义名称至默认基准');
  };

  // 统计数据
  const grantedCount = useMemo(() => permissions.filter((p) => p.enabled).length, [permissions]);
  const restrictedCount = useMemo(() => permissions.filter((p) => !p.enabled).length, [permissions]);

  // 各分类数量统计
  const categoryCounts = useMemo(() => {
    return {
      dispatch: permissions.filter((p) => p.category === 'dispatch').length,
      comm: permissions.filter((p) => p.category === 'comm').length,
      approval: permissions.filter((p) => p.category === 'approval').length,
      ops: permissions.filter((p) => p.category === 'ops').length,
      finance: permissions.filter((p) => p.category === 'finance').length
    };
  }, [permissions]);

  // 表格多重过滤逻辑
  const filteredPermissions = useMemo(() => {
    return permissions.filter((item) => {
      // 1. 状态 Tab 过滤
      if (filterTab === 'granted' && !item.enabled) return false;
      if (filterTab === 'restricted' && item.enabled) return false;

      // 2. 分类过滤
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      // 3. 安全等级过滤
      if (levelFilter !== 'all' && item.level !== levelFilter) return false;

      // 4. 组件名称 / CODE 检索
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchCode = item.code.toLowerCase().includes(query);
        const matchBadge = item.badge.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchBadge) return false;
      }

      // 5. 规则内容与范围检索
      if (ruleFilter.trim()) {
        const query = ruleFilter.trim().toLowerCase();
        const matchRule = item.rule.toLowerCase().includes(query);
        const matchScope = item.scope.toLowerCase().includes(query);
        if (!matchRule && !matchScope) return false;
      }

      return true;
    });
  }, [permissions, filterTab, categoryFilter, levelFilter, searchQuery, ruleFilter]);

  // 处理权限开关点击
  const handleToggle = (item: CascadePermissionItem) => {
    if (item.locked) {
      setTargetElevateItem(item);
      setIsElevateModalOpen(true);
      return;
    }
    const next = toggleCascadePermission(item.id);
    setPermissions(next);
    showToast(
      `${item.enabled ? '已收回' : '已放权'}：${item.name}`,
      `作用域: ${item.scope} · 下发至 ${currentRider.name}`
    );
  };

  // 处理预设放权
  const handleApplyGoldRider = () => {
    const next = applyGoldRiderPreset();
    setPermissions(next);
    showToast('已应用【金牌专送骑手】基准', '已放权 10 项常用高频放行权限');
  };

  const handleApplyAllOpen = () => {
    const next = applyAllOpenPreset();
    setPermissions(next);
    showToast('已一键全开可用特权', '所有非系统级锁定权限均已开放');
  };

  const handleResetBaseline = () => {
    const next = resetBaselinePreset();
    setPermissions(next);
    showToast('已重置为系统岗位基线', '权限已恢复至初始安全基准');
  };

  // 确认特权放行
  const handleConfirmElevate = (duration: number, reason: string) => {
    if (!targetElevateItem) return;
    const res = requestElevatedPrivilege(targetElevateItem.id, duration, reason);
    if (res.success) {
      setPermissions(getCascadePermissions());
      setAuditLogs(getCascadeAuditLogs());
      showToast(
        `特权放行成功: ${targetElevateItem.name}`,
        `有效期 ${duration} 分钟 · 事由: ${reason}`
      );
    }
  };

  // 确认部门基线同步
  const handleConfirmDeptSync = () => {
    const res = syncDepartmentBaselines(currentDistrict.name);
    setAuditLogs(getCascadeAuditLogs());
    showToast(
      '全部门基线同步下发成功',
      `已向 ${currentDistrict.name} 下辖 ${res.syncedCount} 名骑手单兵完成 MESH 广播同步`
    );
  };

  // 工单审批状态切换
  const handleWorkOrderAction = (status: 'approved' | 'rejected' | 'pending') => {
    const updated = updateWorkOrderStatus(status);
    setWorkOrder(updated);
    if (status === 'approved') {
      setPermissions(getCascadePermissions());
      setAuditLogs(getCascadeAuditLogs());
      showToast('工单核准签批成功', '已开放跨车超载溢出抢单权与调度权，并生成 SM4 数字存证');
    } else if (status === 'rejected') {
      setAuditLogs(getCascadeAuditLogs());
      showToast('已驳回工单 #AUTH-9902 申请', '已向周凯终端回传驳回意见');
    } else {
      showToast('工单已重置为待审核状态');
    }
  };

  // 导出权限拓扑表 CSV
  const handleExportTopologyCSV = () => {
    const header = '权限分类,组件名称,CODE代码,安全等级,规则定义,穿透作用域,授权状态,锁定说明\n';
    const rows = permissions
      .map(
        (p) =>
          `"${p.categoryLabel}","${p.name}","${p.code}","${p.levelLabel}","${p.rule}","${p.scope}","${
            p.enabled ? '已放权' : '受限'
          }","${p.locked ? p.lockReason || '锁定' : '无'}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cascade_permissions_${selectedRiderId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('权限拓扑配置已导出', '已保存全量权限表结构 CSV');
  };

  // 保存配置并下发授权生效
  const handleSaveAndBroadcast = () => {
    setIsSaving(true);
    setTimeout(() => {
      saveCascadePermissions(permissions);
      const newToken = generateFreshMeshToken();
      setIdemToken(`IDEM-${newToken.slice(4)}`);
      setIsSaving(false);
      showToast(
        '配置已下发并生效！',
        `MESH 幂等令牌 [${newToken}] 已刷新，${currentRider.name} 手持终端权限已同步生效`
      );
    }, 900);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f2] text-[#1a1a17] font-sans antialiased selection:bg-[#1a1a17] selection:text-white">
      {/* 1. Header 级联导航栏 */}
      <CascadeMatrixHeader
        isMatrixOpen={isMatrixOpen}
        setIsMatrixOpen={setIsMatrixOpen}
        selectedDistrictId={selectedDistrictId}
        setSelectedDistrictId={setSelectedDistrictId}
        selectedDirectorId={selectedDirectorId}
        setSelectedDirectorId={setSelectedDirectorId}
        selectedTruckId={selectedTruckId}
        setSelectedTruckId={setSelectedTruckId}
        selectedRiderId={selectedRiderId}
        setSelectedRiderId={setSelectedRiderId}
        currentDistrict={currentDistrict}
        currentDirector={currentDirector}
        currentTruck={currentTruck}
        currentRider={currentRider}
        districts={districts}
        directors={directors}
        trucks={trucks}
        riders={riders}
        superAdmins={superAdmins}
        masterControllers={masterControllers}
        isEditUnlocked={isEditUnlocked}
        setIsEditUnlocked={setIsEditUnlocked}
        onOpenEditModal={handleOpenEditModal}
        onResetEntityNames={handleResetEntityNames}
        showToast={showToast}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 w-full p-3 sm:p-5 md:p-6 flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
        {/* Left: Collapsible 5-Hop Topology Sidebar */}
        <CascadeTopologySidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          district={currentDistrict}
          director={currentDirector}
          truck={currentTruck}
          rider={currentRider}
          onOpenL1Modal={() => setIsL1ModalOpen(true)}
          onOpenL2Select={() => setIsMatrixOpen(true)}
          onOpenTruckModal={() => setIsTruckModalOpen(true)}
          onOpenRiderModal={() => setIsRiderModalOpen(true)}
          onOpenSM4Modal={() => setIsSM4ModalOpen(true)}
          isEditUnlocked={isEditUnlocked}
          onOpenEditModal={handleOpenEditModal}
        />

        {/* Right: Permission Matrix Table & Controls Container */}
        <div className="flex-1 min-w-0 w-full space-y-4 sm:space-y-5">
          {/* Action Header Card */}
          <div className="bg-white rounded-xl border border-[#e4e4df] shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#e4e4df]">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#1a1a17]">
                    岗位矩阵与组件细粒度授权总成
                  </h2>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    全量 5 大类 / 15 项核心权限
                  </span>
                </div>
                <p className="text-xs text-[#787774] mt-1">
                  当前穿透对象：
                  <span className="font-bold text-[#1a1a17]">{currentDistrict.name}</span>
                  <span className="mx-1">➔</span>
                  <span className="font-bold text-blue-700">{currentDirector.name}</span>
                  <span className="mx-1">➔</span>
                  <span className="font-bold text-orange-700">{currentTruck.name}</span>
                  <span className="mx-1">➔</span>
                  <span className="font-bold text-emerald-700">{currentRider.name}</span>
                </p>
              </div>

              {/* Quick Action Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleApplyGoldRider}
                  className="px-2.5 py-1.5 rounded-lg border border-[#e4e4df] bg-[#fafaf9] hover:bg-white text-xs font-bold text-[#37352f] hover:text-[#1a1a17] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  金牌骑手基准
                </button>
                <button
                  onClick={handleApplyAllOpen}
                  className="px-2.5 py-1.5 rounded-lg border border-[#e4e4df] bg-[#fafaf9] hover:bg-white text-xs font-bold text-[#37352f] hover:text-[#1a1a17] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  一键全开特权
                </button>
                <button
                  onClick={handleResetBaseline}
                  className="px-2.5 py-1.5 rounded-lg border border-[#e4e4df] bg-[#fafaf9] hover:bg-white text-xs font-medium text-[#787774] hover:text-[#1a1a17] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  重置基线
                </button>
                <button
                  onClick={() => setIsDeptSyncModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  全部门基线同步
                </button>
                <button
                  onClick={handleExportTopologyCSV}
                  className="px-2.5 py-1.5 rounded-lg border border-[#d2d2cd] text-xs font-medium text-[#37352f] hover:bg-white transition-all cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  导出拓扑表
                </button>
              </div>
            </div>

            {/* Status Filter Tabs & Counts */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-[#f7f6f3] p-1 rounded-lg border border-[#e4e4df]">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterTab === 'all'
                      ? 'bg-white text-[#1a1a17] shadow-2xs'
                      : 'text-[#787774] hover:text-[#1a1a17]'
                  }`}
                >
                  <span>全部权限</span>
                  <span className="text-[10px] font-mono px-1 rounded bg-[#e4e4df]/70">
                    {permissions.length}
                  </span>
                </button>
                <button
                  onClick={() => setFilterTab('granted')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterTab === 'granted'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-[#787774] hover:text-[#1a1a17]'
                  }`}
                >
                  <span>已放权 / 生效</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded ${
                      filterTab === 'granted' ? 'bg-emerald-700' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {grantedCount}
                  </span>
                </button>
                <button
                  onClick={() => setFilterTab('restricted')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterTab === 'restricted'
                      ? 'bg-[#1a1a17] text-white shadow-2xs'
                      : 'text-[#787774] hover:text-[#1a1a17]'
                  }`}
                >
                  <span>受限 / 锁定</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded ${
                      filterTab === 'restricted' ? 'bg-black/30' : 'bg-[#e4e4df]/70 text-[#787774]'
                    }`}
                  >
                    {restrictedCount}
                  </span>
                </button>
              </div>

              {/* Category Quick Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 text-xs">
                {[
                  { id: 'all', label: '全域', count: permissions.length },
                  { id: 'dispatch', label: '调度', count: categoryCounts.dispatch },
                  { id: 'comm', label: '通讯', count: categoryCounts.comm },
                  { id: 'approval', label: '审批', count: categoryCounts.approval },
                  { id: 'ops', label: '运维', count: categoryCounts.ops },
                  { id: 'finance', label: '财务结算', count: categoryCounts.finance }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-2 py-0.8 rounded-md text-xs font-medium border transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      categoryFilter === cat.id
                        ? 'bg-[#1a1a17] text-white border-[#1a1a17] font-bold'
                        : 'bg-[#fafaf9] border-[#e4e4df] text-[#787774] hover:text-[#1a1a17]'
                    }`}
                  >
                    {cat.label} ({cat.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Search Inputs Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
              {/* Category Select */}
              <div className="sm:col-span-3">
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#e4e4df] bg-[#f7f6f3] text-xs font-medium text-[#37352f] focus:outline-hidden focus:border-[#1a1a17] cursor-pointer"
                  >
                    <option value="all">全部分类 ({permissions.length})</option>
                    <option value="dispatch">调度权限组 ({categoryCounts.dispatch})</option>
                    <option value="comm">车载通讯组 ({categoryCounts.comm})</option>
                    <option value="approval">审批权限组 ({categoryCounts.approval})</option>
                    <option value="ops">运维与审计组 ({categoryCounts.ops})</option>
                    <option value="finance">财务结算与分账组 ({categoryCounts.finance})</option>
                  </select>
                </div>
              </div>

              {/* Name & CODE Search */}
              <div className="sm:col-span-4">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#787774] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="检索组件名称、CODE、徽章..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-6 py-1.5 text-xs rounded-lg border border-[#e4e4df] bg-[#f7f6f3] focus:bg-white focus:outline-hidden focus:border-[#1a1a17]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#787774] hover:text-[#1a1a17] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Security Level Select */}
              <div className="sm:col-span-2">
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#e4e4df] bg-[#f7f6f3] text-xs font-medium text-[#37352f] focus:outline-hidden focus:border-[#1a1a17] cursor-pointer"
                >
                  <option value="all">全部等级</option>
                  <option value="SEC-L1">SEC-L1 常规</option>
                  <option value="SEC-L2">SEC-L2 受控</option>
                  <option value="SEC-L3">SEC-L3 高危</option>
                  <option value="SEC-L5">SEC-L5 特权</option>
                </select>
              </div>

              {/* Rule & Scope Search */}
              <div className="sm:col-span-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#787774] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="检索判定规则与作用域..."
                    value={ruleFilter}
                    onChange={(e) => setRuleFilter(e.target.value)}
                    className="w-full pl-8 pr-6 py-1.5 text-xs rounded-lg border border-[#e4e4df] bg-[#f7f6f3] focus:bg-white focus:outline-hidden focus:border-[#1a1a17]"
                  />
                  {ruleFilter && (
                    <button
                      onClick={() => setRuleFilter('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#787774] hover:text-[#1a1a17] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Permissions Matrix Table (Enhanced with sticky switch column & zero-overflow) */}
          <div className="bg-white rounded-xl border border-[#e4e4df] shadow-xs flex flex-col">
            {/* Table top indicator banner */}
            <div className="px-4 py-2 bg-[#fafaf9] border-b border-[#e4e4df] flex items-center justify-between text-[11px] text-[#787774]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1a1a17]">
                  展示 {filteredPermissions.length} 项细粒度权限
                </span>
                {filterTab !== 'all' && (
                  <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1 rounded">
                    筛选状态: {filterTab === 'granted' ? '已放权' : '受限'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#787774]">
                <span className="hidden sm:inline">可左右滑动查看全部 6 列</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  授权开关已固定右侧
                </span>
              </div>
            </div>

            {/* Scrollable table container */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#e4e4df] bg-[#f7f6f3] text-[11px] font-bold text-[#787774]">
                    <th className="py-2.5 px-4 w-32 shrink-0">权限分类</th>
                    <th className="py-2.5 px-4 min-w-[200px]">功能组件与 CODE</th>
                    <th className="py-2.5 px-3 w-28 shrink-0">控制等级</th>
                    <th className="py-2.5 px-4 min-w-[240px]">授权判定规则</th>
                    <th className="py-2.5 px-3 w-32 shrink-0">穿透作用域</th>
                    {/* STICKY RIGHT COLUMN: 授权开关 */}
                    <th className="py-2.5 px-4 w-28 text-center shrink-0 sticky right-0 bg-[#f7f6f3] shadow-[-6px_0_12px_rgba(0,0,0,0.03)] border-l border-[#e4e4df]">
                      授权开关
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0ed]">
                  {filteredPermissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#787774] text-xs">
                        未匹配到符合条件的权限项，请尝试清除搜索条件
                      </td>
                    </tr>
                  ) : (
                    filteredPermissions.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-[#fafaf9] transition-colors group ${
                          item.enabled ? 'bg-white' : 'bg-neutral-50/40 text-[#787774]'
                        }`}
                      >
                        {/* 1. Category */}
                        <td className="py-3 px-4 font-medium align-top">
                          <div className="font-bold text-[#1a1a17] flex items-center gap-1.5">
                            {item.category === 'dispatch' && (
                              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            )}
                            {item.category === 'comm' && (
                              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                            )}
                            {item.category === 'approval' && (
                              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                            )}
                            {item.category === 'ops' && (
                              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                            )}
                            {item.category === 'finance' && (
                              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                            )}
                            <span>{item.categoryLabel}</span>
                          </div>
                          <div className="text-[10px] text-[#787774] font-mono mt-0.5">
                            {item.categorySub}
                          </div>
                        </td>

                        {/* 2. Component Name & CODE */}
                        <td className="py-3 px-4 align-top">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-bold text-xs ${
                                item.enabled ? 'text-[#1a1a17]' : 'text-[#787774]'
                              }`}
                            >
                              {item.name}
                            </span>
                            <span className="text-[9.5px] px-1 py-0.2 rounded font-mono bg-[#f0f0ed] text-[#787774] border border-[#e4e4df]">
                              {item.badge}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-[#787774] mt-0.5 break-all">
                            {item.code}
                          </div>
                        </td>

                        {/* 3. Security Level */}
                        <td className="py-3 px-3 align-top">
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm inline-block ${
                              item.level === 'SEC-L1'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : item.level === 'SEC-L2'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : item.level === 'SEC-L3'
                                ? 'bg-orange-50 text-orange-800 border border-orange-200'
                                : 'bg-purple-50 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {item.levelLabel}
                          </span>
                        </td>

                        {/* 4. Rule Definition */}
                        <td className="py-3 px-4 align-top">
                          <p className="text-xs leading-relaxed text-[#37352f]">{item.rule}</p>
                          {item.requiresApproval && (
                            <div className="text-[10px] text-orange-700 font-bold mt-1 flex items-center gap-1">
                              <span>需签批：</span>
                              <span className="font-mono">{item.approvalSigner}</span>
                            </div>
                          )}
                          {item.locked && (
                            <div className="text-[10px] text-rose-700 font-bold mt-1 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span>{item.lockReason || '系统策略受控'}</span>
                            </div>
                          )}
                        </td>

                        {/* 5. Scope */}
                        <td className="py-3 px-3 align-top text-[11px] font-mono text-[#787774]">
                          {item.scope}
                        </td>

                        {/* 6. STICKY RIGHT COLUMN: 授权开关 */}
                        <td className="py-3 px-4 align-top text-center sticky right-0 bg-white group-hover:bg-[#fafaf9] shadow-[-6px_0_12px_rgba(0,0,0,0.03)] border-l border-[#e4e4df] z-10">
                          {item.locked ? (
                            <button
                              onClick={() => handleToggle(item)}
                              title="受控锁定项，点击申请临时提权"
                              className="inline-flex items-center justify-center w-11 h-6 rounded-full bg-neutral-200 text-[#787774] cursor-pointer hover:bg-rose-100 hover:text-rose-700 transition-colors"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggle(item)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                item.enabled ? 'bg-emerald-600' : 'bg-[#d2d2cd]'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                  item.enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Associated Work Order Box (#AUTH-9902) */}
          <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  {workOrder.id}
                </span>
                <h3 className="text-sm font-bold text-[#1a1a17]">{workOrder.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                    workOrder.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : workOrder.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {workOrder.status === 'approved'
                    ? '已核准放权'
                    : workOrder.status === 'rejected'
                    ? '已驳回'
                    : '待L5签批'}
                </span>
                <span className="text-[10px] text-[#787774] font-mono">{workOrder.proposerTime}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#37352f]">
              <div className="space-y-1">
                <span className="text-[10px] text-[#787774] block">申请理由与提报人</span>
                <p className="leading-relaxed font-medium">发起人: {workOrder.proposer}</p>
                <p className="text-[11px] text-[#787774]">{workOrder.expectedBenefit}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-[#787774] block">流转路由与涉及车端</span>
                <p className="font-mono font-bold text-[#1a1a17]">{workOrder.target}</p>
                <span className="text-[10px] text-orange-700 block">
                  {workOrder.urgency === 'high' ? '高危紧急 (需即时分流)' : '常规'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-[#787774] block">风控模型评级与核准人</span>
                <div className="font-bold text-emerald-700">{workOrder.requiresLevel}</div>
                <div className="text-[10px] text-[#787774]">
                  核准席: {workOrder.approver || '方敏慧 (L5 独立审计)'}
                </div>
              </div>
            </div>

            {/* Work Order Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-amber-100">
              <button
                onClick={() => setIsTraceModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-[#d2d2cd] bg-white text-xs font-medium text-[#37352f] hover:bg-[#fafaf9] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                查看工单全景流转
              </button>

              <div className="flex items-center gap-2 justify-end">
                {workOrder.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleWorkOrderAction('rejected')}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                    >
                      驳回申请
                    </button>
                    <button
                      onClick={() => handleWorkOrderAction('approved')}
                      className="px-4 py-1.5 rounded-lg bg-[#1a1a17] text-white text-xs font-bold hover:bg-black cursor-pointer shadow-2xs"
                    >
                      核准签批并放权
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleWorkOrderAction('pending')}
                    className="px-3 py-1.5 rounded-lg border border-[#d2d2cd] bg-white text-xs font-medium text-[#787774] hover:text-[#1a1a17] cursor-pointer"
                  >
                    重新审核
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 5. Sticky Footer Action Bar */}
      <footer className="bg-white border-t border-[#e4e4df] sticky bottom-0 z-30 px-4 sm:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 text-xs text-[#787774] w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>IDEM: {idemToken}</span>
          </div>
          <span className="hidden md:inline">|</span>
          <div className="hidden md:flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-[#787774]" />
            <span>{clockStr}</span>
          </div>
          <span className="hidden lg:inline text-[11px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
            L5 独立审计在线
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-[#d2d2cd] text-xs font-medium text-[#37352f] hover:bg-[#fafaf9] flex items-center gap-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            查看权限变更日志 (90天)
          </button>
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-[#d2d2cd] text-xs font-medium text-[#37352f] hover:bg-[#fafaf9] flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            分发当前权限模板
          </button>
          <button
            onClick={handleSaveAndBroadcast}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-[#1a1a17] text-white text-xs font-bold hover:bg-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? '正在加密下发 MESH 数据包...' : '保存配置并下发授权生效'}
          </button>
        </div>
      </footer>

      {/* 6. All Interactive Modals */}
      <L1RootCertModal
        isOpen={isL1ModalOpen}
        onClose={() => setIsL1ModalOpen(false)}
        showToast={showToast}
      />
      <TruckDispatchModal
        isOpen={isTruckModalOpen}
        onClose={() => setIsTruckModalOpen(false)}
        truckName={currentTruck.name}
        queueCount={currentTruck.queueCount}
        tempCelsius={currentTruck.tempCelsius}
        onActivateOverflow={() => {
          const next = toggleCascadePermission('PERM_OVERFLOW_GRAB');
          setPermissions(next);
        }}
        showToast={showToast}
      />
      <RiderDetailModal
        isOpen={isRiderModalOpen}
        onClose={() => setIsRiderModalOpen(false)}
        showToast={showToast}
      />
      <SM4VerifyModal
        isOpen={isSM4ModalOpen}
        onClose={() => setIsSM4ModalOpen(false)}
        showToast={showToast}
      />
      <DepartmentSyncModal
        isOpen={isDeptSyncModalOpen}
        onClose={() => setIsDeptSyncModalOpen(false)}
        onConfirmSync={handleConfirmDeptSync}
      />
      <TemplateDistributionModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        showToast={showToast}
      />
      <ElevatedPrivilegeModal
        isOpen={isElevateModalOpen}
        onClose={() => setIsElevateModalOpen(false)}
        targetItem={targetElevateItem}
        onConfirmElevate={handleConfirmElevate}
      />
      <WorkOrderTraceModal
        isOpen={isTraceModalOpen}
        onClose={() => setIsTraceModalOpen(false)}
      />
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditLogs={auditLogs}
        showToast={showToast}
      />
      <CascadeEditEntityModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        data={editModalData}
        onSave={handleSaveEntityName}
        showToast={showToast}
      />
    </div>
  );
};

export default HeadquartersPermissionAndFlowMatrix;
