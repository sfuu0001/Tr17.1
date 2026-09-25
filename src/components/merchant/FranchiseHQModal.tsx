import React, { useState, useEffect } from 'react';
import {
  Building2,
  Crown,
  Lock,
  Unlock,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Sliders,
  DollarSign,
  FileText,
  RefreshCw,
  Users,
  Coins,
  ArrowRight,
  ShieldAlert,
  History,
  Package,
  Compass,
  Award,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import {
  globalFranchiseEngine,
  FRANCHISE_TENANT_EVENT,
  FRANCHISE_POLICY_EVENT,
  FRANCHISE_TOGGLE_EVENT
} from '../../utils/franchiseTenantEngine';
import {
  FranchiseeProfile,
  FranchiseDishPolicy,
  FranchiseTenantContext,
  FranchisePriceAuditLog,
  OrganizationRole
} from '../../types/franchise';
import { DishItem } from '../../types';
import { FranchiseBomTab } from './franchise/FranchiseBomTab';
import { FranchiseSupplyTab } from './franchise/FranchiseSupplyTab';
import { FranchiseGeofenceTab } from './franchise/FranchiseGeofenceTab';
import { FranchiseSplitTab } from './franchise/FranchiseSplitTab';
import { FranchiseAuditTab } from './franchise/FranchiseAuditTab';

interface FranchiseHQModalProps {
  isOpen: boolean;
  onClose: () => void;
  dishes: DishItem[];
  showToast: (msg: string) => void;
  onSelectTruck?: (truckId: string) => void;
}

export const FranchiseHQModal: React.FC<FranchiseHQModalProps> = ({
  isOpen,
  onClose,
  dishes,
  showToast,
  onSelectTruck
}) => {
  const [context, setContext] = useState<FranchiseTenantContext>(() => globalFranchiseEngine.getContext());
  const [profiles, setProfiles] = useState<FranchiseeProfile[]>(() => globalFranchiseEngine.getProfiles());
  const [policies, setPolicies] = useState<FranchiseDishPolicy[]>(() => globalFranchiseEngine.getPolicies());
  const [auditLogs, setAuditLogs] = useState<FranchisePriceAuditLog[]>(() => globalFranchiseEngine.getAuditLogs());
  const [isFranchiseMode, setIsFranchiseMode] = useState<boolean>(() => globalFranchiseEngine.isFranchiseModeEnabled());

  const [activeTab, setActiveTab] = useState<
    'tenants' | 'policies' | 'bom' | 'supply' | 'geofence' | 'split' | 'store_audit' | 'audit'
  >('tenants');

  // Policy Editing State (HQ mode only)
  const [editingPolicyDishId, setEditingPolicyDishId] = useState<string | null>(null);
  const [editMinPrice, setEditMinPrice] = useState<string>('');
  const [editMaxPrice, setEditMaxPrice] = useState<string>('');
  const [editAllowOverride, setEditAllowOverride] = useState<boolean>(false);
  const [editLockedReason, setEditLockedReason] = useState<string>('');

  useEffect(() => {
    const handleTenant = (e: Event) => {
      const custom = e as CustomEvent<FranchiseTenantContext>;
      if (custom.detail) setContext(custom.detail);
      else setContext(globalFranchiseEngine.getContext());
    };
    const handlePolicy = (e: Event) => {
      const custom = e as CustomEvent<FranchiseDishPolicy[]>;
      if (custom.detail) setPolicies(custom.detail);
      else setPolicies(globalFranchiseEngine.getPolicies());
    };

    window.addEventListener(FRANCHISE_TENANT_EVENT, handleTenant);
    window.addEventListener(FRANCHISE_POLICY_EVENT, handlePolicy);
    return () => {
      window.removeEventListener(FRANCHISE_TENANT_EVENT, handleTenant);
      window.removeEventListener(FRANCHISE_POLICY_EVENT, handlePolicy);
    };
  }, []);

  if (!isOpen) return null;

  const handleSwitchRole = (role: OrganizationRole, franchiseeId: string, truckId?: string) => {
    const next = globalFranchiseEngine.switchContext(role, franchiseeId, truckId);
    setContext(next);
    if (onSelectTruck && next.currentTruckId) {
      onSelectTruck(next.currentTruckId);
    }
    showToast(`租户视角已切换至: 【${next.operatorName}】`);
  };

  const handleToggleLock = (dishId: string, currentLocked: boolean) => {
    if (!context.isHqUser) {
      showToast('越权拦截：仅总部超级管理员 (HQ) 具备锁定或解除爆品权限！');
      return;
    }
    const updated = globalFranchiseEngine.toggleDishLock(dishId, !currentLocked);
    setPolicies(globalFranchiseEngine.getPolicies());
    setAuditLogs(globalFranchiseEngine.getAuditLogs());
    showToast(
      !currentLocked
        ? `已将菜品 #${dishId} 升级为【总部核心强锁定爆品】`
        : `已解除菜品 #${dishId} 的总部强锁定，开放加盟商自主定价`
    );
  };

  const handleSavePolicyEdit = (dishId: string) => {
    if (!context.isHqUser) return;
    const policy = policies.find((p) => p.dishId === dishId);
    if (!policy) return;

    const minP = parseFloat(editMinPrice) || policy.allowedMinPrice;
    const maxP = parseFloat(editMaxPrice) || policy.allowedMaxPrice;

    if (minP > maxP) {
      showToast('配置错误：允许浮动下限不可高于上限！');
      return;
    }

    const updated: FranchiseDishPolicy = {
      ...policy,
      allowedMinPrice: minP,
      allowedMaxPrice: maxP,
      allowFranchiseePriceOverride: editAllowOverride,
      lockedReason: editLockedReason.trim() || policy.lockedReason
    };

    globalFranchiseEngine.savePolicy(updated);
    setPolicies(globalFranchiseEngine.getPolicies());
    setEditingPolicyDishId(null);
    showToast('总部爆品管控策略已更新并全网分发');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white border border-slate-300 w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl rounded-none">
        {/* Header */}
        <div style={{ backgroundColor: '#ffffff', color: '#000000' }} className="p-4 bg-white text-black flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 style={{ color: '#000000' }} className="text-base font-bold tracking-tight text-black">特许经营与加盟商多租户中枢</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-semibold rounded-[2px]">
                  Franchise Hub v4.0 Full
                </span>
              </div>
              <p style={{ color: '#4b5563' }} className="text-xs text-slate-600 mt-0.5">
                五级组织架构 · 爆品配方锁 · BOM防飞单 · 供应链订货 · 电子围栏 · D+1实时分账 · 督导巡检
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !isFranchiseMode;
                setIsFranchiseMode(next);
                globalFranchiseEngine.setFranchiseMode(next);
                showToast(next ? '已启用【特许经营多租户中台模式】' : '已切换为【单店标准轻量模式】');
              }}
              style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#cbd5e1' }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 text-xs border border-slate-300 rounded-[3px] cursor-pointer transition-colors"
              title="切换加盟多租户模式或单店标准模式"
            >
              <span className="text-slate-600">特许模式:</span>
              <span className={`font-bold font-mono ${isFranchiseMode ? 'text-amber-700' : 'text-slate-500'}`}>
                {isFranchiseMode ? '联邦已开启' : '单店模式'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{ color: '#000000' }}
              className="p-1.5 text-slate-500 hover:text-black hover:bg-slate-100 rounded-[3px] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Active Tenant Ribbon */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">当前激活身份:</span>
            <span
              className={`font-bold px-2 py-0.5 flex items-center gap-1 border ${
                context.isHqUser
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              {context.isHqUser ? <Crown className="w-3.5 h-3.5 text-amber-600" /> : <Building2 className="w-3.5 h-3.5 text-emerald-600" />}
              {context.operatorName}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">
              可控餐车 ({context.accessibleTruckIds.length}台):{' '}
              <span className="font-mono font-semibold text-slate-900">
                {context.accessibleTruckIds.join(', ')}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500">聚焦餐车:</span>
            <span className="font-mono font-bold px-2 py-0.5 bg-white border border-slate-300 text-indigo-700">
              {context.currentTruckId}
            </span>
          </div>
        </div>

        {/* Tab Navigation (All 8 Architectural Dimensions) */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('tenants')}
            className={`py-2 px-3 shrink-0 flex items-center gap-1 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'tenants'
                ? 'border-indigo-600 bg-white text-indigo-900'
                : 'border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>加盟组织 ({profiles.length + 1})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('policies')}
            className={`py-2 px-3 shrink-0 flex items-center gap-1 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'policies'
                ? 'border-indigo-600 bg-white text-indigo-900'
                : 'border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>爆品配方锁 ({policies.filter((p) => p.isHqLocked).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bom')}
            className={`py-2 px-3 shrink-0 flex items-center gap-1 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'bom'
                ? 'border-indigo-600 bg-white text-indigo-900'
                : 'border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>BOM防飞单</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('supply')}
            className={`py-2 px-3 shrink-0 flex items-center gap-1 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'supply'
                ? 'border-indigo-600 bg-white text-indigo-900'
                : 'border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>中央商城订货</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('geofence')}
            className={`py-2 px-3 shrink-0 flex items-center gap-1 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'geofence'
                ? 'border-indigo-600 bg-white text-indigo-900'
                : 'border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>电子围栏合规</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('split')}
            className={`py-2 px-3 shrink-0 flex items-center gap-1 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'split'
                ? 'border-indigo-600 bg-white text-indigo-900'
                : 'border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>D+1实时分账</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('store_audit')}
            className={`py-2 px-3 shrink-0 flex items-center gap-1 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'store_audit'
                ? 'border-indigo-600 bg-white text-indigo-900'
                : 'border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>督导巡检与履约金</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('audit');
              setAuditLogs(globalFranchiseEngine.getAuditLogs());
            }}
            className={`py-2 px-3 shrink-0 flex items-center gap-1 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'audit'
                ? 'border-indigo-600 bg-white text-indigo-900'
                : 'border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>调价审计 ({auditLogs.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: Tenants & Role Switching */}
          {activeTab === 'tenants' && (
            <div className="space-y-4">
              <div className="bg-amber-50/70 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
                <Crown className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">多租户沙箱切换说明：</span>
                  点击下方卡片可即时模拟不同加盟商或总部最高管理组视角。
                  切换后，餐车下拉菜单自动按特许授权餐车收敛过滤，非名下餐车数据完全不可见。
                </div>
              </div>

              {/* 1. HQ Role Card */}
              <div
                className={`p-4 border transition-all ${
                  context.isHqUser
                    ? 'border-amber-500 bg-amber-50/30 ring-1 ring-amber-400'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
                      HQ
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        黑曜石品牌管理总部 (HQ Executive)
                        <span className="text-[11px] px-1.5 py-0.2 bg-amber-100 text-amber-800 font-semibold border border-amber-300">
                          全网穿透视角
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        最高决策中枢 · 全网菜单定价锁死 · 供应链集采与全量财务结算穿透
                      </p>
                    </div>
                  </div>

                  {context.isHqUser ? (
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 border border-amber-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 当前激活
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSwitchRole('hq_admin', 'HQ', 'truck-01')}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition-colors"
                    >
                      切换至总部超管
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">特许管辖范围</span>
                    <span className="font-semibold text-slate-800">全国所有流动餐车</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">菜单价格主权</span>
                    <span className="font-semibold text-emerald-700">最高锁定/发布权</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">财务报表权限</span>
                    <span className="font-semibold text-slate-800">穿透全网全量流水</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">当前管辖车辆</span>
                    <span className="font-mono font-semibold text-indigo-700">truck-01, 02, 03</span>
                  </div>
                </div>
              </div>

              {/* 2. Franchisee Profiles List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  特许加盟商沙箱档案 (Franchisee Sandboxes)
                </h4>

                {profiles.map((franchisee) => {
                  const isActive =
                    !context.isHqUser && context.currentFranchiseeId === franchisee.id;

                  return (
                    <div
                      key={franchisee.id}
                      className={`p-4 border transition-all ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-400'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                            加盟
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-950">
                                {franchisee.brandBranchName}
                              </h4>
                              <span className="text-[11px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-300">
                                {franchisee.id}
                              </span>
                              <span
                                className={`text-[11px] px-1.5 py-0.2 font-semibold border ${
                                  franchisee.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                {franchisee.status === 'active' ? '正常履约经营' : '整改观察期'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {franchisee.companyName} · 法人: {franchisee.ownerName} ({franchisee.phone})
                            </p>
                          </div>
                        </div>

                        {isActive ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 当前激活
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleSwitchRole(
                                'franchisee_owner',
                                franchisee.id,
                                franchisee.assignedTruckIds[0]
                              )
                            }
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer transition-colors"
                          >
                            切换此加盟商视角
                          </button>
                        )}
                      </div>

                      {/* Detail Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-slate-200/80 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">特许经营餐车</span>
                          <span className="font-mono font-bold text-indigo-700">
                            {franchisee.assignedTruckIds.join('、')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">履约保证金余额</span>
                          <span
                            className={`font-semibold ${
                              franchisee.depositBalance >= franchisee.depositRequired
                                ? 'text-emerald-700'
                                : 'text-rose-600'
                            }`}
                          >
                            ¥{franchisee.depositBalance.toLocaleString()} / ¥
                            {franchisee.depositRequired.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">品牌使用费提成</span>
                          <span className="font-semibold text-slate-800">
                            {franchisee.royaltyRatePercent.toFixed(1)}% (按实付流水)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">合规信用评分</span>
                          <span className="font-semibold text-amber-700">
                            {franchisee.complianceScore} 分 (五星标杆)
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-1.5 border border-slate-200/60">
                        <span className="font-semibold text-slate-700">签约片区:</span>{' '}
                        {franchisee.cityRegion} |{' '}
                        <span className="font-semibold text-slate-700">合同期:</span>{' '}
                        {franchisee.contractStart} 至 {franchisee.contractEnd}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: HQ Policies & Menu Lock */}
          {activeTab === 'policies' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-300 p-3 text-xs text-slate-700 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900">核心爆品锁死与价格主权机制：</span>
                  被总部强锁定的菜品，其名称、核心配方与基准售价在加盟商/单车端均为**只读受保护状态**。
                  加盟商无法私自提高售价或下架招牌菜，防范加盟店私改配方或飞单私售。
                  {context.isHqUser ? (
                    <span className="text-amber-800 font-semibold block mt-1">
                      您当前为【品牌总部 (HQ)】身份，可点击右侧按钮锁定/解锁任意菜品并设定浮动区间。
                    </span>
                  ) : (
                    <span className="text-slate-600 block mt-1">
                      您当前为【加盟商】身份，仅能查看总部锁定规则，无权解除锁定。
                    </span>
                  )}
                </div>
              </div>

              {/* Policies List Table */}
              <div className="border border-slate-300 divide-y divide-slate-200">
                {dishes.slice(0, 8).map((dish) => {
                  const policy = policies.find((p) => p.dishId === dish.id);
                  const isLocked = policy?.isHqLocked || false;
                  const isEditingThis = editingPolicyDishId === dish.id;

                  return (
                    <div key={dish.id} className={`p-3.5 text-xs ${isLocked ? 'bg-amber-50/20' : 'bg-white'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {dish.imageUrl ? (
                            <img
                              src={dish.imageUrl}
                              alt={dish.name}
                              className="w-12 h-12 object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                              无图
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900">{dish.name}</span>
                              <span className="text-[11px] font-mono text-slate-500">#{dish.id}</span>
                              {isLocked ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300">
                                  <Lock className="w-3 h-3 text-amber-700" />
                                  👑 总部强锁定 (HQ Locked)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[11px] border border-slate-300">
                                  <Unlock className="w-3 h-3 text-slate-400" />
                                  加盟商自主管理
                                </span>
                              )}
                            </div>

                            <div className="text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                              <span>当前在售标价: <strong className="text-slate-900">¥{dish.price.toFixed(2)}</strong></span>
                              {isLocked && policy && (
                                <>
                                  <span>总部基准价: <strong className="text-amber-800">¥{policy.hqBasePrice.toFixed(2)}</strong></span>
                                  <span>
                                    允许浮动:{' '}
                                    {policy.allowFranchiseePriceOverride ? (
                                      <span className="text-emerald-700 font-medium">
                                        ¥{policy.allowedMinPrice} ~ ¥{policy.allowedMaxPrice}
                                      </span>
                                    ) : (
                                      <span className="text-rose-600 font-medium">严格禁止改价</span>
                                    )}
                                  </span>
                                  {policy.bomSkuCode && (
                                    <span className="font-mono text-slate-600">BOM: {policy.bomSkuCode}</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {context.isHqUser ? (
                          <div className="flex items-center gap-1.5">
                            {isLocked && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isEditingThis) {
                                    setEditingPolicyDishId(null);
                                  } else {
                                    setEditingPolicyDishId(dish.id);
                                    setEditMinPrice(String(policy?.allowedMinPrice || dish.price - 3));
                                    setEditMaxPrice(String(policy?.allowedMaxPrice || dish.price + 3));
                                    setEditAllowOverride(policy?.allowFranchiseePriceOverride || false);
                                    setEditLockedReason(policy?.lockedReason || '');
                                  }
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-300 cursor-pointer text-xs"
                              >
                                {isEditingThis ? '取消配置' : '配置浮动'}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggleLock(dish.id, isLocked)}
                              className={`px-3 py-1 font-bold text-xs cursor-pointer transition-colors flex items-center gap-1 ${
                                isLocked
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300'
                                  : 'bg-amber-600 text-white hover:bg-amber-700'
                              }`}
                            >
                              {isLocked ? (
                                <>
                                  <Unlock className="w-3 h-3" /> 解除强锁定
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" /> 设为总部强锁定
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic">
                            {isLocked ? '只读受保护 (总部强控)' : '允许车端改价'}
                          </div>
                        )}
                      </div>

                      {/* Locked Reason Note */}
                      {isLocked && policy && (
                        <p className="mt-2 text-[11px] text-amber-900 bg-amber-50/80 p-1.5 border border-amber-200">
                          <strong>锁定原因/品控备忘:</strong> {policy.lockedReason}
                          {policy.lastLockedAt && (
                            <span className="text-slate-400 ml-2 font-mono">
                              (最后生效: {policy.lastLockedAt} · {policy.lockedBy || 'HQ'})
                            </span>
                          )}
                        </p>
                      )}

                      {/* Inline Policy Edit Deck (HQ only) */}
                      {isEditingThis && policy && (
                        <div className="mt-3 p-3 bg-white border border-indigo-200 space-y-2">
                          <div className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                            总部价格与浮动限制调校 (实时全网生效)
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div>
                              <label className="block text-slate-500 mb-0.5">允许加盟商浮动下限 (元)</label>
                              <input
                                type="number"
                                step="0.5"
                                value={editMinPrice}
                                onChange={(e) => setEditMinPrice(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-500 mb-0.5">允许加盟商浮动上限 (元)</label>
                              <input
                                type="number"
                                step="0.5"
                                value={editMaxPrice}
                                onChange={(e) => setEditMaxPrice(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-500 mb-0.5">是否开放加盟商微调</label>
                              <select
                                value={editAllowOverride ? 'yes' : 'no'}
                                onChange={(e) => setEditAllowOverride(e.target.value === 'yes')}
                                className="w-full px-2 py-1 border border-slate-300 text-slate-900"
                              >
                                <option value="no">严格禁止改动 (统一定价)</option>
                                <option value="yes">允许在浮动区间内调整</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-500 mb-0.5">品控锁定说明</label>
                            <input
                              type="text"
                              value={editLockedReason}
                              onChange={(e) => setEditLockedReason(e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 text-slate-900 text-xs"
                              placeholder="说明全国统配原因、核心心智或冷链配方规范..."
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingPolicyDishId(null)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs cursor-pointer"
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSavePolicyEdit(dish.id)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
                            >
                              保存并全网同步
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Price Audit Logs */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  记录全网所有针对爆品改价、锁定与越权拦截日志（实时审计）
                </span>
                <button
                  type="button"
                  onClick={() => setAuditLogs(globalFranchiseEngine.getAuditLogs())}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> 刷新审计
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 border border-slate-200">
                  暂无改价违规与审计事件记录
                </div>
              ) : (
                <div className="border border-slate-300 divide-y divide-slate-200 text-xs">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2.5 flex items-start justify-between gap-2 ${
                        log.status === 'rejected' ? 'bg-rose-50/40' : 'bg-white'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 font-bold text-[10px] uppercase border ${
                              log.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {log.status === 'rejected' ? '越权拦截 (BLOCKED)' : '合规记录 (RECORDED)'}
                          </span>
                          <span className="font-bold text-slate-900">{log.dishName}</span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            ¥{log.beforePrice.toFixed(2)} → ¥{log.afterPrice.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{log.reason}</p>
                        <p className="text-slate-400 text-[10px] font-mono">
                          操作人: {log.operator} | 租户: {log.franchiseeId} | 餐车: {log.truckId} | {log.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BOM Leakage & Anti Fly-Order */}
          {activeTab === 'bom' && (
            <FranchiseBomTab context={context} showToast={showToast} />
          )}

          {/* TAB 5: Central Supply Mall */}
          {activeTab === 'supply' && (
            <FranchiseSupplyTab context={context} showToast={showToast} />
          )}

          {/* TAB 6: Geofence Compliance */}
          {activeTab === 'geofence' && (
            <FranchiseGeofenceTab context={context} showToast={showToast} />
          )}

          {/* TAB 7: Split Pay & Settlement */}
          {activeTab === 'split' && (
            <FranchiseSplitTab context={context} showToast={showToast} />
          )}

          {/* TAB 8: Store Audit & Deposit */}
          {activeTab === 'store_audit' && (
            <FranchiseAuditTab context={context} showToast={showToast} />
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            特许经营模式已启用 · 数据已在本地沙箱与云端严格隔离
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer transition-colors"
          >
            完成并返回
          </button>
        </div>
      </div>
    </div>
  );
};
