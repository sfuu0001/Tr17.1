import React, { useState, useMemo, useRef } from 'react';
import {
  Building2,
  ChevronRight,
  ChevronDown,
  Search,
  Check,
  X,
  RefreshCw,
  Lock,
  Unlock,
  Truck,
  Users,
  Radio,
  SlidersHorizontal,
  BadgeCheck,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Edit3,
  Layers,
  Thermometer,
  Eye,
  AlertCircle,
  PenTool
} from 'lucide-react';
import {
  CascadeDistrictNode,
  CascadeDirectorNode,
  CascadeTruckNode,
  CascadeRiderNode,
  CascadeSuperAdminNode,
  CascadeMasterControllerNode,
  CURRENT_AUDITOR,
  getTrucksByDirectorId
} from '../../../utils/cascadeMeshEngine';
import { EditableEntityType } from './CascadeEditEntityModal';
import { CascadeHierarchyView } from './CascadeHierarchyView';
import { CascadePerspectiveLinkCanvas } from './CascadePerspectiveLinkCanvas';

interface CascadeMatrixHeaderProps {
  isMatrixOpen: boolean;
  setIsMatrixOpen: (open: boolean) => void;
  selectedDistrictId: string;
  setSelectedDistrictId: (id: string) => void;
  selectedDirectorId: string;
  setSelectedDirectorId: (id: string) => void;
  selectedTruckId: string;
  setSelectedTruckId: (id: string) => void;
  selectedRiderId: string;
  setSelectedRiderId: (id: string) => void;
  currentDistrict: CascadeDistrictNode;
  currentDirector: CascadeDirectorNode;
  currentTruck: CascadeTruckNode;
  currentRider: CascadeRiderNode;
  districts: CascadeDistrictNode[];
  directors: CascadeDirectorNode[];
  trucks: CascadeTruckNode[];
  riders: CascadeRiderNode[];
  superAdmins: CascadeSuperAdminNode[];
  masterControllers: CascadeMasterControllerNode[];
  isEditUnlocked: boolean;
  setIsEditUnlocked: (unlocked: boolean) => void;
  onOpenEditModal: (
    type: EditableEntityType,
    id: string,
    currentName: string,
    extraLabel?: string,
    extraValue?: string
  ) => void;
  onResetEntityNames: () => void;
  showToast: (msg: string, desc?: string) => void;
}

export const CascadeMatrixHeader: React.FC<CascadeMatrixHeaderProps> = ({
  isMatrixOpen,
  setIsMatrixOpen,
  selectedDistrictId,
  setSelectedDistrictId,
  selectedDirectorId,
  setSelectedDirectorId,
  selectedTruckId,
  setSelectedTruckId,
  selectedRiderId,
  setSelectedRiderId,
  currentDistrict,
  currentDirector,
  currentTruck,
  currentRider,
  districts,
  directors,
  trucks,
  riders,
  superAdmins,
  masterControllers,
  isEditUnlocked,
  setIsEditUnlocked,
  onOpenEditModal,
  onResetEntityNames,
  showToast
}) => {
  const [matrixSearch, setMatrixSearch] = useState<string>('');
  const [matrixTab, setMatrixTab] = useState<'grid' | 'hierarchy'>('grid');
  const [isPenLinkEnabled, setIsPenLinkEnabled] = useState<boolean>(true);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<{
    type: 'district' | 'director' | 'truck' | 'rider';
    item: any;
  } | null>(null);

  // Search filter
  const q = matrixSearch.trim().toLowerCase();
  const filteredDistricts = districts.filter(
    (d) => !q || d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)
  );
  const filteredDirectors = directors.filter(
    (d) =>
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.title.toLowerCase().includes(q) ||
      d.uid.toLowerCase().includes(q) ||
      d.managedTruckIds.some((tId) => {
        const t = trucks.find((tr) => tr.id === tId);
        return t?.name.toLowerCase().includes(q);
      })
  );
  const filteredTrucks = trucks.filter(
    (t) => !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.directorName.toLowerCase().includes(q)
  );
  const filteredRiders = riders.filter(
    (r) =>
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.uid.toLowerCase().includes(q) ||
      r.employeeId.toLowerCase().includes(q)
  );

  // 获取当前选中战区总监直属管辖的餐车列表
  const managedTrucksByCurrentDirector = useMemo(() => {
    return getTrucksByDirectorId(selectedDirectorId);
  }, [selectedDirectorId, trucks]);

  return (
    <header className="bg-white border-b border-[#e4e4df] sticky top-0 z-40 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-xs">
      {/* Left: Brand + MESH pill */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#1a1a17] text-white flex items-center justify-center font-black text-xs tracking-tight shadow-2xs">
          UR
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-[#1a1a17]">
              CASCADE MESH
            </h1>
            <span className="text-[9px] font-mono px-1 rounded-sm bg-[#f0f0ed] text-[#787774] border border-[#e4e4df]">
              v4.9.2
            </span>
          </div>
          <p className="text-[10px] text-[#787774] hidden md:block">全域级联穿透与状态分流总成</p>
        </div>
        <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 hidden lg:inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          10Hz MESH
        </span>
      </div>

      {/* Center: Cascade Breadcrumbs & Toggle */}
      <div className="relative flex-1 max-w-2xl mx-2 sm:mx-4 min-w-0">
        <button
          onClick={() => setIsMatrixOpen(!isMatrixOpen)}
          className="w-full flex items-center justify-between px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#f7f6f3] border border-[#e4e4df] hover:border-[#1a1a17] transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-1 sm:gap-1.5 text-xs overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
            <span className="font-bold text-[#1a1a17] truncate max-w-[90px] sm:max-w-[130px]">
              {currentDistrict.name.replace('金融商圈', '')}
            </span>
            <ChevronRight className="w-3 h-3 text-[#787774] shrink-0" />
            <span className="font-bold text-blue-700 truncate max-w-[80px] sm:max-w-[110px]">
              {currentDirector.title} {currentDirector.avatarChar}
            </span>
            <ChevronRight className="w-3 h-3 text-[#787774] shrink-0" />
            <span className="font-bold text-orange-700 truncate max-w-[80px] sm:max-w-[120px]">
              {currentTruck.name.split('(')[0]}
            </span>
            <ChevronRight className="w-3 h-3 text-[#787774] shrink-0" />
            <span className="font-bold text-emerald-700 truncate max-w-[80px] sm:max-w-[100px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {currentRider.shortName}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[#787774] group-hover:text-[#1a1a17] shrink-0 pl-1.5">
            <span className="text-[10px] hidden md:inline font-mono">级联拓扑</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isMatrixOpen ? 'rotate-180 text-[#1a1a17]' : ''
              }`}
            />
          </div>
        </button>

        {/* Dropdown Popover */}
        {isMatrixOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[95vw] sm:w-[720px] md:w-[820px] lg:w-[940px] bg-white rounded-xl border border-[#e4e4df] shadow-2xl z-50 transition-all duration-200 p-3 sm:p-4 text-xs max-h-[85vh] overflow-y-auto">
            {/* Popover Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#e4e4df] gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <SlidersHorizontal className="w-4 h-4 text-[#1a1a17]" />
                <span className="font-bold text-sm text-[#1a1a17]">
                  全域级联穿透矩阵 (4-Level Mesh Topology)
                </span>

                {/* Tab Switcher */}
                <div className="flex items-center bg-[#f0f0ed] p-0.5 rounded-md border border-[#e4e4df] text-[11px]">
                  <button
                    onClick={() => setMatrixTab('grid')}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      matrixTab === 'grid'
                        ? 'bg-white text-[#1a1a17] shadow-2xs'
                        : 'text-[#787774] hover:text-[#1a1a17]'
                    }`}
                  >
                    4-Level 穿透选择
                  </button>
                  <button
                    onClick={() => setMatrixTab('hierarchy')}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      matrixTab === 'hierarchy'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-[#787774] hover:text-blue-700'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    全域层级用户与权限全景
                  </button>
                </div>
              </div>

              {/* Right: Anti-accidental Edit Lock & Search */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* 钢笔透视链路切换胶囊 */}
                <button
                  onClick={() => {
                    const next = !isPenLinkEnabled;
                    setIsPenLinkEnabled(next);
                    showToast(
                      next ? '已开启钢笔透视链路 (动态贝塞尔)' : '已隐藏钢笔透视链路',
                      next ? '自动追踪当前所选节点并计算平滑穿透链路' : '已切换至纯卡片矩阵视角'
                    );
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 border shadow-2xs ${
                    isPenLinkEnabled
                      ? 'bg-blue-50 text-blue-800 border-blue-200 ring-1 ring-blue-300'
                      : 'bg-[#fafaf9] text-[#787774] border-[#e4e4df] hover:text-[#1a1a17]'
                  }`}
                  title="点击切换是否渲染跨层级透视钢笔贝塞尔链路"
                >
                  <PenTool className={`w-3.5 h-3.5 ${isPenLinkEnabled ? 'text-blue-600' : 'text-[#787774]'}`} />
                  <span>钢笔透视链路</span>
                  {isPenLinkEnabled && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  )}
                </button>

                {/* 防误操作解锁/锁定按钮 */}
                <button
                  onClick={() => {
                    const next = !isEditUnlocked;
                    setIsEditUnlocked(next);
                    showToast(
                      next ? '已解锁名称编辑 (防误触保护已解除)' : '已锁定防误操作保护',
                      next
                        ? '现在可直接修改区域商圈、战区总监、餐车和单兵名称'
                        : '所有实体已恢复安全锁定保护，防止误操作'
                    );
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0 ${
                    isEditUnlocked
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-2 ring-amber-400/50 animate-pulse'
                      : 'bg-[#fafaf9] text-[#787774] border border-[#e4e4df] hover:text-[#1a1a17] hover:bg-white'
                  }`}
                  title={isEditUnlocked ? '点击锁定以防止误操作' : '点击解锁以修改实体名称'}
                >
                  {isEditUnlocked ? (
                    <Unlock className="w-3.5 h-3.5 text-amber-700" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-[#787774]" />
                  )}
                  <span className="whitespace-nowrap">{isEditUnlocked ? '🔓 编辑已解锁' : '🔒 实体保护已锁定'}</span>
                </button>

                {/* Reset Entity Names button if unlocked */}
                {isEditUnlocked && (
                  <button
                    onClick={() => {
                      if (window.confirm('确定要重置所有商圈、总监、餐车和单兵名称至默认初始值吗？')) {
                        onResetEntityNames();
                        showToast('已重置所有实体名称至系统默认基准');
                      }
                    }}
                    className="p-1 rounded-md border border-[#e4e4df] text-[#787774] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    title="重置所有实体名称"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Matrix Search */}
                <div className="relative w-40 sm:w-52 shrink-0">
                  <Search className="w-3.5 h-3.5 text-[#787774] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="检索总监/餐车/单兵/商圈..."
                    value={matrixSearch}
                    onChange={(e) => setMatrixSearch(e.target.value)}
                    className="w-full pl-7 pr-6 py-1 text-xs rounded-md border border-[#e4e4df] bg-[#f7f6f3] focus:bg-white focus:outline-hidden focus:border-[#1a1a17]"
                  />
                  {matrixSearch && (
                    <button
                      onClick={() => setMatrixSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#787774] hover:text-[#1a1a17] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content Body: Tab 1: 4-Column Grid OR Tab 2: Full Hierarchy View */}
            {matrixTab === 'hierarchy' ? (
              <div className="py-3">
                <CascadeHierarchyView
                  superAdmins={superAdmins}
                  masterControllers={masterControllers}
                  districts={districts}
                  directors={directors}
                  trucks={trucks}
                  riders={riders}
                  selectedDistrictId={selectedDistrictId}
                  selectedDirectorId={selectedDirectorId}
                  selectedTruckId={selectedTruckId}
                  selectedRiderId={selectedRiderId}
                  onSelectNode={(type, id) => {
                    if (type === 'district') setSelectedDistrictId(id);
                    if (type === 'director') setSelectedDirectorId(id);
                    if (type === 'truck') setSelectedTruckId(id);
                    if (type === 'rider') setSelectedRiderId(id);
                    showToast(`已选择实体并联动穿透`, `实体编号: ${id}`);
                  }}
                  isEditUnlocked={isEditUnlocked}
                  onOpenEditModal={onOpenEditModal}
                />
              </div>
            ) : (
              <>
                {/* 4-Column Cascade Grid with Relative Positioning & Perspective Link Canvas */}
                <div ref={gridContainerRef} className="relative py-3">
                  {/* ★ 增加透视效果的钢笔链接线条，自动被点击的节点自动计算链路并且正确绘制 */}
                  <CascadePerspectiveLinkCanvas
                    containerRef={gridContainerRef}
                    selectedDistrictId={selectedDistrictId}
                    selectedDirectorId={selectedDirectorId}
                    selectedTruckId={selectedTruckId}
                    selectedRiderId={selectedRiderId}
                    isEnabled={isPenLinkEnabled}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 relative z-10">
                    {/* Col 1: L1 区域商圈 */}
                    <div className="space-y-2 border-r-0 lg:border-r border-[#e4e4df]/60 pr-0 lg:pr-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#787774]">
                        <span>01 区域商圈 (L1)</span>
                        <span className="font-mono text-[10px]">{filteredDistricts.length}</span>
                      </div>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {filteredDistricts.map((d) => (
                          <div key={d.id} className="relative group">
                            <button
                              id={`cascade-col-node-${d.id}`}
                              onClick={() => {
                                setSelectedDistrictId(d.id);
                                showToast(`已切换商圈: ${d.name}`);
                              }}
                              onMouseEnter={() => setHoveredEntity({ type: 'district', item: d })}
                              className={`w-full p-2 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                                selectedDistrictId === d.id
                                  ? 'bg-[#1a1a17] text-white shadow-md ring-2 ring-neutral-700/60 ring-offset-1'
                                  : 'bg-[#fafaf9] hover:bg-[#f0f0ed] text-[#37352f]'
                              }`}
                            >
                              <div className="truncate pr-1">
                                <div className="font-bold text-xs truncate">{d.name}</div>
                                <div
                                  className={`text-[9.5px] font-mono ${
                                    selectedDistrictId === d.id ? 'text-[#a0a09a]' : 'text-[#787774]'
                                  }`}
                                >
                                  {d.id}
                                </div>
                              </div>
                              <span
                                className={`text-[9px] px-1 py-0.2 rounded font-mono shrink-0 ${
                                  d.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-neutral-100 text-[#787774]'
                                }`}
                              >
                                {d.statusLabel}
                              </span>
                            </button>
                            {isEditUnlocked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenEditModal('district', d.id, d.name);
                                }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded bg-amber-500 text-white shadow-xs hover:bg-amber-600 transition-all cursor-pointer"
                                title="修改商圈名称"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Col 2: L2 指挥总监 */}
                    <div className="space-y-2 border-r-0 lg:border-r border-[#e4e4df]/60 pr-0 lg:pr-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#787774]">
                        <span>02 指挥总监 (L2)</span>
                        <span className="font-mono text-[10px]">{filteredDirectors.length}</span>
                      </div>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {filteredDirectors.map((dir) => {
                          const isSelected = selectedDirectorId === dir.id;
                          return (
                            <div key={dir.id} className="relative group">
                              <button
                                id={`cascade-col-node-${dir.id}`}
                                onClick={() => {
                                  setSelectedDirectorId(dir.id);
                                  showToast(`已穿透总监席: ${dir.name}`, `直管 ${dir.managedTruckIds.length} 辆移动餐车`);
                                }}
                                onMouseEnter={() => setHoveredEntity({ type: 'director', item: dir })}
                                className={`w-full p-2 rounded-lg text-left transition-all cursor-pointer flex items-center gap-2 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/70 ring-offset-1'
                                    : 'bg-[#fafaf9] hover:bg-[#f0f0ed] text-[#37352f]'
                                }`}
                              >
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isSelected
                                      ? 'bg-white text-blue-700'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {dir.avatarChar}
                                </div>
                                <div className="truncate flex-1">
                                  <div className="font-bold text-xs truncate">{dir.name}</div>
                                  <div
                                    className={`text-[9.5px] truncate flex items-center justify-between ${
                                      isSelected ? 'text-blue-100' : 'text-[#787774]'
                                    }`}
                                  >
                                    <span>{dir.title}</span>
                                    <span className="font-mono text-[9px] opacity-90">
                                      管辖: {dir.managedTruckIds.length}车
                                    </span>
                                  </div>
                                </div>
                              </button>
                              {isEditUnlocked && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenEditModal('director', dir.id, dir.name, '总监职位', dir.jobTitle);
                                  }}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded bg-amber-500 text-white shadow-xs hover:bg-amber-600 transition-all cursor-pointer"
                                  title="修改总监名称"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Col 3: L3 移动餐车 */}
                    <div className="space-y-2 border-r-0 lg:border-r border-[#e4e4df]/60 pr-0 lg:pr-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#787774]">
                        <span>03 移动餐车 (L3)</span>
                        <span className="font-mono text-[10px]">{filteredTrucks.length}</span>
                      </div>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {filteredTrucks.map((truck) => {
                          const isSelected = selectedTruckId === truck.id;
                          const isUnderCurrentDirector = truck.directorId === selectedDirectorId;

                          return (
                            <div key={truck.id} className="relative group">
                              <button
                                id={`cascade-col-node-${truck.id}`}
                                onClick={() => {
                                  setSelectedTruckId(truck.id);
                                  showToast(`已锁定餐车: ${truck.name}`);
                                }}
                                onMouseEnter={() => setHoveredEntity({ type: 'truck', item: truck })}
                                className={`w-full p-2 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400/70 ring-offset-1'
                                    : isUnderCurrentDirector
                                    ? 'bg-orange-50/50 border border-orange-200/80 hover:bg-orange-100/50 text-[#37352f]'
                                    : 'bg-[#fafaf9] hover:bg-[#f0f0ed] text-[#37352f]'
                                }`}
                              >
                                <div className="truncate pr-1">
                                  <div className="flex items-center gap-1">
                                    <div className="font-bold text-xs truncate">{truck.name}</div>
                                    {isUnderCurrentDirector && (
                                      <span className={`text-[8px] px-1 rounded font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-800'}`}>
                                        直属
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className={`text-[9.5px] truncate ${
                                      isSelected ? 'text-orange-100' : 'text-[#787774]'
                                    }`}
                                  >
                                    {truck.chefName || truck.id} · {truck.tempCelsius}°C
                                  </div>
                                </div>
                                <span
                                  className={`text-[9px] px-1 py-0.2 rounded font-mono shrink-0 ${
                                    truck.statusType === 'overloaded'
                                      ? isSelected
                                        ? 'bg-rose-800 text-rose-100'
                                        : 'bg-rose-100 text-rose-800'
                                      : truck.statusType === 'idle'
                                      ? isSelected
                                        ? 'bg-emerald-800 text-emerald-100'
                                        : 'bg-emerald-100 text-emerald-800'
                                      : isSelected
                                      ? 'bg-blue-800 text-blue-100'
                                      : 'bg-blue-50 text-blue-800'
                                  }`}
                                >
                                  {truck.queueCount}单
                                </span>
                              </button>
                              {isEditUnlocked && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenEditModal('truck', truck.id, truck.name, '车长主厨', truck.chefName);
                                  }}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded bg-amber-500 text-white shadow-xs hover:bg-amber-600 transition-all cursor-pointer"
                                  title="修改餐车名称"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Col 4: L4 基层单兵 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#787774]">
                        <span>04 基层单兵 (L4)</span>
                        <span className="font-mono text-[10px]">{filteredRiders.length}</span>
                      </div>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {filteredRiders.map((rider) => {
                          const isSelected = selectedRiderId === rider.id;
                          return (
                            <div key={rider.id} className="relative group">
                              <button
                                id={`cascade-col-node-${rider.id}`}
                                onClick={() => {
                                  setSelectedRiderId(rider.id);
                                  showToast(`已聚焦单兵: ${rider.name}`);
                                }}
                                onMouseEnter={() => setHoveredEntity({ type: 'rider', item: rider })}
                                className={`w-full p-2 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/70 ring-offset-1'
                                    : 'bg-[#fafaf9] hover:bg-[#f0f0ed] text-[#37352f]'
                                }`}
                              >
                                <div className="truncate pr-1">
                                  <div className="font-bold text-xs truncate flex items-center gap-1">
                                    <span>{rider.name}</span>
                                  </div>
                                  <div
                                    className={`text-[9.5px] truncate ${
                                      isSelected ? 'text-emerald-100' : 'text-[#787774]'
                                    }`}
                                  >
                                    {rider.role} · 完单: {rider.completedOrders}
                                  </div>
                                </div>
                                <span
                                  className={`text-[9px] px-1 py-0.2 rounded font-mono shrink-0 ${
                                    rider.status === 'locked'
                                      ? isSelected
                                        ? 'bg-emerald-800 text-white'
                                        : 'bg-amber-100 text-amber-900'
                                      : isSelected
                                      ? 'bg-emerald-800 text-white'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {rider.statusLabel}
                                </span>
                              </button>
                              {isEditUnlocked && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenEditModal('rider', rider.id, rider.name, '单兵职称', rider.jobPosition);
                                  }}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded bg-amber-500 text-white shadow-xs hover:bg-amber-600 transition-all cursor-pointer"
                                  title="修改单兵名称"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ★ 战区总监管辖餐车直属透视栏 (满足用户核心诉求：“我查询某个战区总监，我可以直观地看到战区总监下能管理的餐车有哪些”) */}
                <div className="mt-2.5 p-3 rounded-lg bg-orange-50/40 border border-orange-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                      <span className="font-bold text-orange-950">
                        战区总监直辖餐车全景透视：【{currentDirector.name}】
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 font-bold">
                        共管辖 {managedTrucksByCurrentDirector.length} 辆移动餐车
                      </span>
                    </div>
                    <span className="text-[11px] text-[#787774] hidden sm:inline">
                      点击卡片快速穿透至该餐车
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {managedTrucksByCurrentDirector.map((truck) => (
                      <div
                        key={truck.id}
                        onClick={() => {
                          setSelectedTruckId(truck.id);
                          showToast(`已直接穿透至总监管辖餐车: ${truck.name}`);
                        }}
                        className={`p-2 rounded-md border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          selectedTruckId === truck.id
                            ? 'bg-orange-600 text-white border-orange-700 shadow-xs'
                            : 'bg-white border-orange-200 hover:bg-orange-50/80 text-[#37352f]'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold truncate text-xs">{truck.name}</div>
                          <div className="text-[10px] opacity-80 truncate">
                            车长: {truck.chefName || '已在席'} · 负载: {truck.queueCount}单
                          </div>
                        </div>
                        <span
                          className={`text-[9px] px-1 py-0.5 rounded font-mono shrink-0 ${
                            selectedTruckId === truck.id
                              ? 'bg-white/20 text-white'
                              : truck.statusType === 'overloaded'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {truck.tempCelsius}°C
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Embedded Active Inspection Panel */}
                <div className="mt-2.5 p-2.5 rounded-lg bg-[#fafaf9] border border-[#e4e4df] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1a1a17]">
                      {hoveredEntity ? (
                        hoveredEntity.type === 'district'
                          ? `商圈详情: ${hoveredEntity.item.name} (${hoveredEntity.item.id})`
                          : hoveredEntity.type === 'director'
                          ? `总监档案: ${hoveredEntity.item.name} · 管辖 ${hoveredEntity.item.managedTruckIds?.length || 0} 辆餐车`
                          : hoveredEntity.type === 'truck'
                          ? `餐车遥测: ${hoveredEntity.item.name} · 车长: ${hoveredEntity.item.chefName || '在席'} · 排队: ${hoveredEntity.item.queueCount}单`
                          : `单兵状态: ${hoveredEntity.item.name} · 终端: ${hoveredEntity.item.deviceIp}`
                      ) : (
                        `当前聚焦单兵: ${currentRider.name} · 设备: ${currentRider.deviceIp} · 今日完成: ${currentRider.completedOrders} 单`
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => {
                        setSelectedDistrictId('DIST-SUHE');
                        setSelectedDirectorId('DIR-ZHAO');
                        setSelectedTruckId('TRUCK-03');
                        setSelectedRiderId('RIDER-ZHOU');
                        showToast('已重置穿透路径至标准基准');
                      }}
                      className="px-2.5 py-1 rounded-md border border-[#d2d2cd] text-xs font-medium text-[#37352f] hover:bg-white cursor-pointer"
                    >
                      重设选择
                    </button>
                    <button
                      onClick={() => {
                        setIsMatrixOpen(false);
                        showToast(
                          '已锁定当前穿透视角',
                          `已穿透至 ${currentDistrict.name} > ${currentDirector.name} > ${currentTruck.name} > ${currentRider.name}`
                        );
                      }}
                      className="px-3 py-1 rounded-md bg-[#1a1a17] text-white text-xs font-bold hover:bg-black cursor-pointer"
                    >
                      锁定当前穿透视角
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: L5 Auditor Chip + Reset Button */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#fafaf9] border border-[#e4e4df] text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[#787774]">审计席:</span>
          <span className="font-bold text-[#1a1a17]">{CURRENT_AUDITOR.name}</span>
          <span className="text-[9px] font-mono px-1 rounded bg-purple-100 text-purple-800 font-bold">
            SM4 双签
          </span>
        </div>

        <button
          onClick={() => {
            setSelectedDistrictId('DIST-SUHE');
            setSelectedDirectorId('DIR-ZHAO');
            setSelectedTruckId('TRUCK-03');
            setSelectedRiderId('RIDER-ZHOU');
            showToast('已重设穿透视角至初始苏河湾');
          }}
          className="p-1.5 rounded-lg border border-[#e4e4df] text-[#787774] hover:text-[#1a1a17] hover:bg-[#f7f6f3] transition-colors cursor-pointer"
          title="重设视角"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
