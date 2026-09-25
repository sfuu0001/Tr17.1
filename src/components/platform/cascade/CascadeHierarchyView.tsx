import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Crown,
  UserCheck,
  Truck,
  Bike,
  Search,
  ChevronRight,
  ExternalLink,
  Edit3,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Phone,
  Layers,
  Thermometer,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  CascadeSuperAdminNode,
  CascadeMasterControllerNode,
  CascadeDistrictNode,
  CascadeDirectorNode,
  CascadeTruckNode,
  CascadeRiderNode,
  getTrucksByDirectorId
} from '../../../utils/cascadeMeshEngine';
import { EditableEntityType } from './CascadeEditEntityModal';

interface CascadeHierarchyViewProps {
  superAdmins: CascadeSuperAdminNode[];
  masterControllers: CascadeMasterControllerNode[];
  districts: CascadeDistrictNode[];
  directors: CascadeDirectorNode[];
  trucks: CascadeTruckNode[];
  riders: CascadeRiderNode[];
  selectedDistrictId: string;
  selectedDirectorId: string;
  selectedTruckId: string;
  selectedRiderId: string;
  onSelectNode: (type: 'district' | 'director' | 'truck' | 'rider', id: string) => void;
  isEditUnlocked: boolean;
  onOpenEditModal: (
    type: EditableEntityType,
    id: string,
    currentName: string,
    extraLabel?: string,
    extraValue?: string
  ) => void;
}

export const CascadeHierarchyView: React.FC<CascadeHierarchyViewProps> = ({
  superAdmins,
  masterControllers,
  districts,
  directors,
  trucks,
  riders,
  selectedDistrictId,
  selectedDirectorId,
  selectedTruckId,
  selectedRiderId,
  onSelectNode,
  isEditUnlocked,
  onOpenEditModal
}) => {
  // 战区总监快速筛选透视
  const [directorFilter, setDirectorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 当前所选战区总监直辖餐车
  const activeDirector = useMemo(() => {
    return directors.find((d) => d.id === selectedDirectorId) || directors[0];
  }, [directors, selectedDirectorId]);

  const managedTrucksForActiveDirector = useMemo(() => {
    if (!activeDirector) return [];
    return getTrucksByDirectorId(activeDirector.id);
  }, [activeDirector, trucks]);

  // 某商圈下的主控管理用户
  const currentControllers = useMemo(() => {
    return masterControllers.filter((c) => c.districtId === selectedDistrictId);
  }, [masterControllers, selectedDistrictId]);

  // 过滤后的总监列表
  const filteredDirectors = useMemo(() => {
    return directors.filter((dir) => {
      if (directorFilter !== 'all' && dir.id !== directorFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = dir.name.toLowerCase().includes(q);
        const matchTitle = dir.jobTitle.toLowerCase().includes(q);
        const matchTruck = dir.managedTruckIds.some((tId) => {
          const t = trucks.find((tr) => tr.id === tId);
          return t?.name.toLowerCase().includes(q);
        });
        if (!matchName && !matchTitle && !matchTruck) return false;
      }
      return true;
    });
  }, [directors, directorFilter, searchQuery, trucks]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Top Banner & Quick Controls */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-xl p-4 sm:p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold">
              全域精准层级穿透架构
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
              含本层级下全部权限用户
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold tracking-tight">
            HQ 5 级层级用户与战区总监管辖餐车全景矩阵
          </h3>
          <p className="text-xs text-stone-300">
            从「最高级多管理员账号」到「商圈主控管理用户」，再到「战区指挥总监 ➔ 直属移动餐车 ➔ 基层单兵」，层级穿透与管辖权限一览无余。
          </p>
        </div>

        {/* Search & Director Picker */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索总监 / 餐车 / 用户..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-stone-800/80 border border-stone-600 text-xs text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-stone-800/80 border border-stone-600 px-2 py-1 rounded-lg text-xs">
            <span className="text-stone-400 text-[11px] shrink-0">透视总监:</span>
            <select
              value={directorFilter}
              onChange={(e) => setDirectorFilter(e.target.value)}
              className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-stone-800">全部战区总监</option>
              {directors.map((d) => (
                <option key={d.id} value={d.id} className="bg-stone-800">
                  {d.name} ({d.managedTruckIds.length} 辆管辖餐车)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================
          LEVEL 0: 管理这些区域商圈的最高级账号 (一个或多个)
      ======================================================== */}
      <div className="bg-white rounded-xl border border-[#e4e4df] p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#e4e4df]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs shadow-2xs">
              L0
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#1a1a17]">
                  全域商圈最高级账号管理组 (HQ Super Administrators)
                </h4>
                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-mono font-bold">
                  {superAdmins.length} 位最高全权账号
                </span>
              </div>
              <p className="text-[11px] text-[#787774]">
                拥有全域所有商圈开设、总监授权签批、SM4 根证书核发及紧急熔断执行最高权
              </p>
            </div>
          </div>
        </div>

        {/* Super Admins Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {superAdmins.map((admin) => (
            <div
              key={admin.id}
              className="p-3.5 rounded-lg border border-[#e4e4df] bg-[#fafaf9] hover:bg-white hover:border-purple-300 transition-all space-y-2 relative group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                    {admin.avatarChar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-[#1a1a17]">{admin.name}</span>
                      <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    </div>
                    <span className="text-[10px] text-purple-700 font-medium">
                      {admin.role}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    admin.status === 'online'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {admin.statusLabel}
                </span>
              </div>

              <div className="text-[11px] text-[#787774] space-y-1 pt-1 border-t border-[#e4e4df]/80">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono text-[#787774]">UID: {admin.uid}</span>
                  <span className="text-emerald-700 font-bold">SM4 国密验签</span>
                </div>
                <p className="text-[11px] text-[#37352f] leading-snug line-clamp-2">
                  <span className="font-semibold text-purple-900">特权范围: </span>
                  {admin.scope}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================
          LEVEL 1: 区域商圈 & 商圈主控管理用户
      ======================================================== */}
      <div className="bg-white rounded-xl border border-[#e4e4df] p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-[#e4e4df] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shadow-2xs">
              L1
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#1a1a17]">
                  区域商圈及商圈主控管理用户 (District & Master Controllers)
                </h4>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                  精准到商圈主控层级
                </span>
              </div>
              <p className="text-[11px] text-[#787774]">
                当前商圈各控制席调度长与现场督查负责人，负责辖区大屏全局监控与高峰分流
              </p>
            </div>
          </div>

          {/* District Switcher Pills */}
          <div className="flex items-center gap-1.5">
            {districts.map((d) => (
              <div key={d.id} className="relative group">
                <button
                  onClick={() => onSelectNode('district', d.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedDistrictId === d.id
                      ? 'bg-[#1a1a17] text-white shadow-xs'
                      : 'bg-[#fafaf9] text-[#787774] border border-[#e4e4df] hover:bg-white hover:text-[#1a1a17]'
                  }`}
                >
                  <Building2 className="w-3 h-3" />
                  {d.name}
                  <span className="text-[9px] opacity-75 font-normal">({d.statusLabel})</span>
                </button>
                {isEditUnlocked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEditModal('district', d.id, d.name);
                    }}
                    className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-amber-500 text-white shadow-sm hover:scale-110 transition-transform cursor-pointer"
                    title="修改商圈名称"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Master Controllers Card Row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#787774]">
            <span className="font-bold text-[#37352f] flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              该商圈下设主控管理用户群：
            </span>
            <span className="text-[11px]">共 {currentControllers.length} 位主控与协同督查席</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentControllers.map((ctrl) => (
              <div
                key={ctrl.id}
                className="p-3 rounded-lg border border-blue-200/80 bg-blue-50/30 hover:bg-blue-50/60 transition-colors space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      {ctrl.avatarChar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-[#1a1a17]">{ctrl.name}</span>
                        {ctrl.isPrimary && (
                          <span className="text-[9px] px-1 rounded bg-blue-100 text-blue-800 font-bold">
                            主控
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#787774]">{ctrl.title}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {ctrl.statusLabel}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-blue-200/60 text-[10px] text-[#555] space-y-1">
                  <div className="flex items-center justify-between text-[#787774]">
                    <span className="font-mono">工号: {ctrl.uid}</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      {ctrl.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {ctrl.permissions.map((p, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded bg-white border border-blue-200 text-blue-900 text-[9px] font-medium"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================
          LEVEL 2: 战区指挥总监 & 直辖移动餐车透视
          (核心满足：“我查询某个战区总监，我可以直观地看到战区总监下能管理的餐车有哪些”)
      ======================================================== */}
      <div className="bg-white rounded-xl border border-[#e4e4df] p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#e4e4df] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-xs shadow-2xs">
              L2
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#1a1a17]">
                  战区指挥总监与直属管辖餐车矩阵 (Theater Directors & Managed Trucks)
                </h4>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200 font-bold">
                  支持直观查询总监管辖餐车
                </span>
              </div>
              <p className="text-[11px] text-[#787774]">
                点击任意战区总监卡片，即刻透视并联动其直属管辖的所有流动餐车站台与现场单兵
              </p>
            </div>
          </div>
        </div>

        {/* Directors Cards & Underneath Managed Trucks */}
        <div className="space-y-4">
          {filteredDirectors.map((director) => {
            const isSelected = selectedDirectorId === director.id;
            const managedTrucks = getTrucksByDirectorId(director.id);

            return (
              <div
                key={director.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/10 shadow-sm'
                    : 'border-[#e4e4df] bg-[#fafaf9] hover:bg-white'
                }`}
              >
                {/* Director Row Header */}
                <div
                  onClick={() => onSelectNode('director', director.id)}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer border-b border-[#e4e4df]/60"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs ${
                        isSelected ? 'bg-orange-600' : 'bg-stone-700'
                      }`}
                    >
                      {director.avatarChar}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-[#1a1a17]">
                          {director.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-100 text-orange-900 font-bold">
                          {director.title}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-600 text-white font-bold animate-pulse">
                            当前透视中
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#787774]">
                        {director.jobTitle} · 终端: {director.terminalIp}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="text-xs font-bold text-orange-800">
                        直辖管辖 {managedTrucks.length} 辆移动餐车
                      </div>
                      <div className="text-[10px] text-[#787774]">
                        {director.managedRiderIds.length} 名直属单兵
                      </div>
                    </div>

                    {isEditUnlocked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEditModal(
                            'director',
                            director.id,
                            director.name,
                            '职位职称',
                            director.jobTitle
                          );
                        }}
                        className="p-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="修改总监名称"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>改名</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* ★ Direct Managed Trucks Gallery for this Director */}
                <div className="p-3.5 bg-white space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#37352f] flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-orange-600" />
                      【{director.name}】直辖移动餐车透视明细：
                    </span>
                    <span className="text-[11px] text-[#787774]">
                      点击任意餐车可直接穿透联动
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {managedTrucks.map((truck) => {
                      const isTruckSelected = selectedTruckId === truck.id;

                      return (
                        <div
                          key={truck.id}
                          onClick={() => {
                            onSelectNode('director', director.id);
                            onSelectNode('truck', truck.id);
                          }}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer space-y-1.5 relative group ${
                            isTruckSelected
                              ? 'border-orange-500 bg-orange-50/30 ring-1 ring-orange-400'
                              : 'border-[#e4e4df] bg-[#fafaf9] hover:bg-white hover:border-orange-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                              <span className="text-xs font-bold text-[#1a1a17] truncate">
                                {truck.name}
                              </span>
                            </div>

                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                truck.statusType === 'overloaded'
                                  ? 'bg-rose-100 text-rose-800'
                                  : truck.statusType === 'idle'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {truck.statusLabel}
                            </span>
                          </div>

                          <div className="text-[10px] text-[#787774] space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span>车长: {truck.chefName || '未指定'}</span>
                              <span className="font-mono flex items-center gap-0.5 text-amber-700">
                                <Thermometer className="w-2.5 h-2.5" />
                                {truck.tempCelsius}°C
                              </span>
                            </div>
                            <p className="truncate text-[#555]">泊位: {truck.location}</p>
                          </div>

                          {isEditUnlocked && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenEditModal(
                                  'truck',
                                  truck.id,
                                  truck.name,
                                  '车长/主厨',
                                  truck.chefName
                                );
                              }}
                              className="absolute top-1.5 right-1.5 p-1 rounded-md bg-amber-100 text-amber-900 opacity-0 group-hover:opacity-100 hover:bg-amber-200 transition-all cursor-pointer"
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
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          LEVEL 4: 基层单兵 / 专送骑手 (该层级下全部权限用户)
      ======================================================== */}
      <div className="bg-white rounded-xl border border-[#e4e4df] p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-[#e4e4df] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shadow-2xs">
              L4
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#1a1a17]">
                  基层单兵与末端专送权限用户 (Field Riders & Terminal Operators)
                </h4>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  全部实名专送单兵
                </span>
              </div>
              <p className="text-[11px] text-[#787774]">
                执行一线订单极速送达的专送单兵，可在此快速穿透查看其领取的 15 项核心操作权限
              </p>
            </div>
          </div>
        </div>

        {/* Riders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {riders.map((rider) => {
            const isSelected = selectedRiderId === rider.id;
            return (
              <div
                key={rider.id}
                onClick={() => onSelectNode('rider', rider.id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer space-y-2 relative group ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-400'
                    : 'border-[#e4e4df] bg-[#fafaf9] hover:bg-white hover:border-emerald-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                        isSelected ? 'bg-emerald-600' : 'bg-stone-600'
                      }`}
                    >
                      {rider.avatarChar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-[#1a1a17]">{rider.name}</span>
                      </div>
                      <p className="text-[10px] text-[#787774]">{rider.role}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      rider.status === 'locked'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {rider.statusLabel}
                  </span>
                </div>

                <div className="text-[10px] text-[#787774] space-y-0.5 pt-1.5 border-t border-[#e4e4df]/80">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">工号: {rider.employeeId}</span>
                    <span className="font-bold text-emerald-800">
                      今日: {rider.completedOrders}单
                    </span>
                  </div>
                  <p className="truncate text-[#555]">{rider.affiliatedEntity}</p>
                  <p className="font-mono text-[9px] text-[#888] truncate">{rider.deviceIp}</p>
                </div>

                {isEditUnlocked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEditModal('rider', rider.id, rider.name, '单兵职务', rider.jobPosition);
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-amber-100 text-amber-900 opacity-0 group-hover:opacity-100 hover:bg-amber-200 transition-all cursor-pointer"
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
  );
};
