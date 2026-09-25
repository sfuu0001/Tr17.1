import React from 'react';
import {
  Building2,
  Users,
  Truck,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ExternalLink,
  Sliders,
  CheckCircle2,
  Lock,
  Smartphone,
  Edit3
} from 'lucide-react';
import {
  CascadeDistrictNode,
  CascadeDirectorNode,
  CascadeTruckNode,
  CascadeRiderNode,
  CURRENT_AUDITOR
} from '../../../utils/cascadeMeshEngine';
import { EditableEntityType } from './CascadeEditEntityModal';

interface CascadeTopologySidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  district: CascadeDistrictNode;
  director: CascadeDirectorNode;
  truck: CascadeTruckNode;
  rider: CascadeRiderNode;
  onOpenL1Modal: () => void;
  onOpenL2Select: () => void;
  onOpenTruckModal: () => void;
  onOpenRiderModal: () => void;
  onOpenSM4Modal: () => void;
  isEditUnlocked?: boolean;
  onOpenEditModal?: (
    type: EditableEntityType,
    id: string,
    currentName: string,
    extraLabel?: string,
    extraValue?: string
  ) => void;
}

export const CascadeTopologySidebar: React.FC<CascadeTopologySidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  district,
  director,
  truck,
  rider,
  onOpenL1Modal,
  onOpenL2Select,
  onOpenTruckModal,
  onOpenRiderModal,
  onOpenSM4Modal,
  isEditUnlocked = false,
  onOpenEditModal
}) => {
  if (isCollapsed) {
    return (
      <aside className="w-14 bg-white rounded-xl border border-[#e4e4df] shadow-xs p-2 flex flex-col items-center justify-between gap-3 shrink-0 self-stretch min-h-[560px] transition-all duration-200">
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            onClick={onToggleCollapse}
            title="展开拓扑侧栏"
            className="w-9 h-9 rounded-lg bg-[#f7f6f3] border border-[#e4e4df] flex items-center justify-center text-[#787774] hover:text-[#1a1a17] hover:bg-[#eae9e5] transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-[#e4e4df] my-1" />

          {/* Quick Hop Mini-Icons */}
          <button
            onClick={onOpenL1Modal}
            title={`L1 商圈: ${district.name}`}
            className="w-9 h-9 rounded-lg bg-[#1a1a17] text-white flex items-center justify-center font-mono font-bold text-xs hover:ring-2 hover:ring-black/20 cursor-pointer"
          >
            L1
          </button>

          <button
            onClick={onOpenL2Select}
            title={`L2 战区总监: ${director.name} (管辖 ${director.managedTruckIds?.length || 0} 车)`}
            className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-mono font-bold text-xs hover:bg-blue-100 cursor-pointer"
          >
            L2
          </button>

          <button
            onClick={onOpenTruckModal}
            title={`L3 餐车站台: ${truck.name}`}
            className="w-9 h-9 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 flex items-center justify-center font-mono font-bold text-xs hover:bg-orange-100 cursor-pointer"
          >
            L3
          </button>

          <button
            onClick={onOpenRiderModal}
            title={`L4 现场单兵: ${rider.name}`}
            className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-mono font-bold text-xs hover:bg-emerald-100 cursor-pointer"
          >
            L4
          </button>

          <button
            onClick={onOpenSM4Modal}
            title="L5 审计权: 方敏慧"
            className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-mono font-bold text-xs hover:bg-purple-100 cursor-pointer"
          >
            L5
          </button>
        </div>

        <div className="text-[10px] text-[#787774] font-mono [writing-mode:vertical-lr] tracking-widest uppercase opacity-70">
          5-HOP MESH
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full md:w-80 shrink-0 bg-white rounded-xl border border-[#e4e4df] shadow-xs p-4 flex flex-col gap-3.5 transition-all duration-200">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#e4e4df]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-[#787774] tracking-wider uppercase">
            5-HOP TRACE MATRIX
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-[#f7f6f3] border border-[#e4e4df] font-mono text-[#787774]">
            全链路闭环
          </span>
          <button
            onClick={onToggleCollapse}
            title="收起侧栏，获得更宽表格视图"
            className="p-1 rounded-md text-[#787774] hover:text-[#1a1a17] hover:bg-[#f0f0ed] transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-3 relative">
        {/* Continuous gradient trace line with perspective neural pulse */}
        <div className="absolute left-[22px] top-6 bottom-8 w-[2.5px] bg-gradient-to-b from-stone-900 via-blue-600 via-orange-500 via-emerald-600 to-purple-600 -z-0 opacity-75 rounded-full"></div>
        <div className="absolute left-[22.5px] top-6 bottom-8 w-[1px] bg-white/90 -z-0 animate-pulse"></div>

        {/* HOP 1: L1 区域商圈 */}
        <div className="relative z-10 flex items-start gap-2.5 p-2.5 rounded-lg bg-[#fafaf9] border border-[#e4e4df] hover:border-[#1a1a17] transition-all group">
          <div className="w-7 h-7 rounded-md bg-[#1a1a17] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
            1
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1a1a17]">L1 区域商圈 (主控权)</span>
              <div className="flex items-center gap-1">
                {isEditUnlocked && onOpenEditModal && (
                  <button
                    onClick={() => onOpenEditModal('district', district.id, district.name)}
                    className="p-0.5 text-amber-700 hover:text-amber-900 rounded cursor-pointer"
                    title="修改商圈名称"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  onClick={onOpenL1Modal}
                  className="text-[9.5px] font-bold text-[#787774] hover:text-[#1a1a17] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  视角 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
            <div className="text-[11px] text-[#201f1d] font-bold truncate mt-0.5">
              {district.name}
            </div>
            <div className="text-[10px] text-emerald-700 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {district.code || district.id} · SM2 锚定
            </div>
          </div>
        </div>

        {/* HOP 2: L2 战区总监 */}
        <div className="relative z-10 flex items-start gap-2.5 p-2.5 rounded-lg bg-[#fafaf9] border border-[#e4e4df] hover:border-[#1a1a17] transition-all group">
          <div className="w-7 h-7 rounded-md bg-[#2563eb] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
            2
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1a1a17]">L2 战区总监 (指挥权)</span>
              <div className="flex items-center gap-1">
                {isEditUnlocked && onOpenEditModal && (
                  <button
                    onClick={() =>
                      onOpenEditModal('director', director.id, director.name, '总监职务', director.jobTitle)
                    }
                    className="p-0.5 text-amber-700 hover:text-amber-900 rounded cursor-pointer"
                    title="修改总监名称"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  onClick={onOpenL2Select}
                  className="text-[9.5px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  透视 <ChevronRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
            <div className="text-[11px] text-[#201f1d] font-bold truncate mt-0.5">
              {director.name}
            </div>
            <div className="text-[10px] text-[#787774] font-mono mt-0.5 flex items-center justify-between">
              <span>UID: {director.uid}</span>
              <span className="text-blue-700 font-bold">直管 {director.managedTruckIds?.length || 0} 辆餐车</span>
            </div>
          </div>
        </div>

        {/* HOP 3: L3 站点餐车 */}
        <div className="relative z-10 flex items-start gap-2.5 p-2.5 rounded-lg bg-[#fafaf9] border border-[#e4e4df] hover:border-[#1a1a17] transition-all group">
          <div className="w-7 h-7 rounded-md bg-orange-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
            3
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1a1a17]">L3 移动餐车 (站点权)</span>
              <div className="flex items-center gap-1">
                {isEditUnlocked && onOpenEditModal && (
                  <button
                    onClick={() =>
                      onOpenEditModal('truck', truck.id, truck.name, '车长主厨', truck.chefName)
                    }
                    className="p-0.5 text-amber-700 hover:text-amber-900 rounded cursor-pointer"
                    title="修改餐车名称"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  onClick={onOpenTruckModal}
                  className="text-[9.5px] font-bold text-orange-700 hover:text-orange-900 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  调度 <Sliders className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
            <div className="text-[11px] text-[#201f1d] font-bold truncate mt-0.5">
              {truck.name}
            </div>
            <div className="text-[10px] text-orange-700 font-medium mt-0.5 flex items-center gap-1">
              <span className="px-1 py-0.2 rounded bg-orange-100 border border-orange-200 font-bold">
                {truck.statusLabel}
              </span>
              <span>· 温控 {truck.tempCelsius}°C</span>
            </div>
          </div>
        </div>

        {/* HOP 4: L4 现场单兵 */}
        <div className="relative z-10 flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-300 transition-all group shadow-2xs">
          <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
            4
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-950">L4 现场单兵 (现场权)</span>
              <div className="flex items-center gap-1">
                {isEditUnlocked && onOpenEditModal && (
                  <button
                    onClick={() =>
                      onOpenEditModal('rider', rider.id, rider.name, '单兵职务', rider.jobPosition)
                    }
                    className="p-0.5 text-amber-700 hover:text-amber-900 rounded cursor-pointer"
                    title="修改单兵名称"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  onClick={onOpenRiderModal}
                  className="text-[9.5px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  全息档案 <Smartphone className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
            <div className="text-[11px] text-[#201f1d] font-bold truncate mt-0.5">
              {rider.name}
            </div>
            <div className="text-[10px] text-emerald-800 font-mono mt-0.5">
              UID: {rider.uid} · 今日已完 {rider.completedOrders} 单
            </div>
          </div>
        </div>

        {/* HOP 5: L5 独立审计席 */}
        <div className="relative z-10 flex items-start gap-2.5 p-2.5 rounded-lg bg-[#fafaf9] border border-[#e4e4df] hover:border-[#1a1a17] transition-all group">
          <div className="w-7 h-7 rounded-md bg-purple-700 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
            5
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1a1a17]">L5 独立审计席 (审计权)</span>
              <button
                onClick={onOpenSM4Modal}
                className="text-[9.5px] font-bold text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                验签 <ShieldCheck className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="text-[11px] text-[#201f1d] font-bold truncate mt-0.5">
              {CURRENT_AUDITOR.name} ({CURRENT_AUDITOR.roleBadge})
            </div>
            <div className="text-[10px] text-[#787774] font-mono mt-0.5">
              UID: {CURRENT_AUDITOR.uid} · SM4 双签
            </div>
          </div>
        </div>
      </div>

      {/* Live status badge at sidebar bottom */}
      <div className="mt-auto p-2.5 rounded-lg bg-[#f7f6f3] border border-[#e3e2de] text-[10px] text-[#787774] space-y-1">
        <div className="flex items-center justify-between text-[#37352f] font-bold">
          <span>穿透链路防篡改</span>
          <span className="text-emerald-700">100% 闭环</span>
        </div>
        <p className="leading-tight text-[9.5px]">
          指令由 L1 根节点签发，经 L2 战区与 L3 餐车透传，下发至 L4 现场单兵，全量变更由 L5 审计席上链存证。
        </p>
      </div>
    </aside>
  );
};
