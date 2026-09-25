import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Truck,
  ChevronDown,
  Power,
  UtensilsCrossed,
  Bike,
  ShoppingBag,
  Sliders,
  X,
  Layers,
  Lock,
  Star,
  Building2,
  Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BusinessStatusConfig,
  getTruckBusinessStatus,
  getAllTruckBusinessStatuses,
  toggleTruckOperating,
  toggleTruckChannelOperating
} from '../../utils/businessStatusEngine';
import { getUnifiedTruckName } from '../../utils/truckNaming';
import {
  globalFranchiseEngine,
  FRANCHISE_TENANT_EVENT,
  FRANCHISE_POLICY_EVENT
} from '../../utils/franchiseTenantEngine';
import { FranchiseTenantContext, FranchiseDishPolicy } from '../../types/franchise';
import { getSessions } from '../../utils/tableSessionEngine';
import { getAllTruckConfigs } from '../../utils/truckLocationEngine';

export interface TruckScopeItem {
  truckId: string;
  truckName: string;
  status?: string;
  [key: string]: any;
}

interface TruckBusinessScopeDropdownProps {
  selectedTruckId: string;
  onSelectTruck: (truckId: string) => void;
  merchantTruckConfigs: TruckScopeItem[];
  businessStatus: BusinessStatusConfig;
  onOpenDetailedModal: () => void;
  showToast: (msg: string) => void;
  onOpenHQModal?: () => void;
}

export const TruckBusinessScopeDropdown: React.FC<TruckBusinessScopeDropdownProps> = ({
  selectedTruckId,
  onSelectTruck,
  merchantTruckConfigs,
  businessStatus,
  onOpenDetailedModal,
  showToast,
  onOpenHQModal
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Multi-tenant franchise context & policy states
  const [franchiseContext, setFranchiseContext] = useState<FranchiseTenantContext>(() =>
    globalFranchiseEngine.getContext()
  );
  const [policies, setPolicies] = useState<FranchiseDishPolicy[]>(() =>
    globalFranchiseEngine.getPolicies()
  );

  // Maintain reactive dictionary of all trucks' business configs
  const [allStatuses, setAllStatuses] = useState<Record<string, BusinessStatusConfig>>(() =>
    getAllTruckBusinessStatuses()
  );

  // Live in-session dining tables count
  const [activeTableCount, setActiveTableCount] = useState<number>(() => {
    try {
      const sessions = getSessions();
      const count = sessions.filter((s) => s.status === 'open').length;
      return count > 0 ? count : 7;
    } catch {
      return 7;
    }
  });

  useEffect(() => {
    const handleTenant = (e: Event) => {
      const custom = e as CustomEvent<FranchiseTenantContext>;
      if (custom.detail) setFranchiseContext(custom.detail);
      else setFranchiseContext(globalFranchiseEngine.getContext());
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

  // Update open tables count when opened or periodically
  useEffect(() => {
    if (!isOpen) return;
    try {
      const sessions = getSessions();
      const count = sessions.filter((s) => s.status === 'open').length;
      setActiveTableCount(count > 0 ? count : 7);
    } catch {
      // fallback
    }
  }, [isOpen]);

  // Keep allStatuses reactive to external updates
  useEffect(() => {
    const handleStatusSync = () => {
      setAllStatuses(getAllTruckBusinessStatuses());
    };
    window.addEventListener('business-status-change', handleStatusSync);
    window.addEventListener('storage', handleStatusSync);
    return () => {
      window.removeEventListener('business-status-change', handleStatusSync);
      window.removeEventListener('storage', handleStatusSync);
    };
  }, []);

  // Keyboard escape handler & body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const lockedCount = policies.filter((p) => p.isHqLocked).length;

  const activeTruckStatus =
    allStatuses[selectedTruckId] || businessStatus || getTruckBusinessStatus(selectedTruckId);

  const currentTruck = merchantTruckConfigs.find((t) => t.truckId === selectedTruckId) || {
    truckId: selectedTruckId,
    truckName: getUnifiedTruckName(selectedTruckId, 'short'),
    status: 'active'
  };

  const getTruckLabel = (
    t: { truckId?: string; truckName?: string; id?: string; name?: string } | string,
    format: 'short' | 'standard' | 'full' = 'standard'
  ) => {
    return getUnifiedTruckName(t, format);
  };

  // --- Real Functional Handlers for any specific truck ---

  // 1. Toggle master switch for a given truck
  const handleToggleTruckMaster = (truckId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isAccessible =
      franchiseContext.isHqUser || franchiseContext.accessibleTruckIds.includes(truckId);
    const label = getTruckLabel({ truckId, truckName: '' }, 'short');

    if (!isAccessible) {
      showToast(`🔒【沙箱保护】您属于加盟商沙箱，无权管控非管辖餐车【${label}】`);
      return;
    }

    const targetStatus = allStatuses[truckId] || getTruckBusinessStatus(truckId);
    const nextIsOpen = !targetStatus.isOpen;

    const updated = toggleTruckOperating(truckId, nextIsOpen);
    setAllStatuses((prev) => ({ ...prev, [truckId]: updated }));

    if (nextIsOpen) {
      showToast(`🟢 【${label}】营业总开关已开启：该餐车全网恢复接单！`);
    } else {
      showToast(`🔴 【${label}】营业总开关已关闭：该餐车已暂停接单`);
    }
  };

  // 2, 3, 4. Toggle specific channel for a given truck
  const handleToggleTruckChannel = (
    truckId: string,
    channel: 'dine_in' | 'delivery' | 'pickup',
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    const isAccessible =
      franchiseContext.isHqUser || franchiseContext.accessibleTruckIds.includes(truckId);
    const label = getTruckLabel({ truckId, truckName: '' }, 'short');

    if (!isAccessible) {
      showToast(`🔒【沙箱保护】您属于加盟商沙箱，无权修改非管辖餐车【${label}】渠道`);
      return;
    }

    const targetStatus = allStatuses[truckId] || getTruckBusinessStatus(truckId);
    const currentVal =
      channel === 'dine_in'
        ? targetStatus.dineInOpen !== false
        : channel === 'delivery'
        ? targetStatus.deliveryOpen !== false
        : targetStatus.pickupOpen !== false;
    const nextVal = !currentVal;

    const updated = toggleTruckChannelOperating(truckId, channel, nextVal);
    setAllStatuses((prev) => ({ ...prev, [truckId]: updated }));

    const channelNames = {
      dine_in: '堂食',
      delivery: '外卖',
      pickup: '自提'
    };
    const icon = channel === 'dine_in' ? '🍽️' : channel === 'delivery' ? '🛵' : '🛍️';

    showToast(
      nextVal
        ? `${icon} 【${label}】${channelNames[channel]}渠道已开启：正常接单中`
        : `${icon} 【${label}】${channelNames[channel]}渠道已暂停：停止该渠道接单`
    );
  };

  const isDineInActive = activeTruckStatus.dineInOpen !== false;
  const isDeliveryActive = activeTruckStatus.deliveryOpen !== false;
  const isPickupActive = activeTruckStatus.pickupOpen !== false;

  const truckList =
    merchantTruckConfigs && merchantTruckConfigs.length > 0
      ? merchantTruckConfigs
      : [
          { truckId: 'truck-01', truckName: '01号·旗舰车', status: 'active' },
          { truckId: 'truck-02', truckName: '02号·科技园', status: 'active' },
          { truckId: 'truck-03', truckName: '03号·潮玩站', status: 'active' }
        ];

  return (
    <div
      ref={containerRef}
      id="truck-business-scope-dropdown-container"
      className="relative shrink-0 flex items-center"
    >
      {/* 手机端：单图标按钮 (Mobile: Single Icon Button) */}
      <button
        type="button"
        id="truck-business-scope-dropdown-trigger-mobile"
        onClick={() => setIsOpen(true)}
        className="sm:hidden relative p-1.5 bg-white hover:bg-[#f7f7f5] active:scale-95 text-[#1a1918] rounded-[2px] transition-all cursor-pointer border border-[#e6e6e4] hover:border-[#37352f] flex items-center justify-center shrink-0 shadow-2xs"
        title={`餐车站台与渠道调度 (${getTruckLabel(currentTruck as any, 'short')}) · ${activeTruckStatus.isOpen ? '营业中' : '已暂停'}`}
        aria-label="打开餐车站台与渠道调度中枢"
        aria-expanded={isOpen}
      >
        <Truck className="w-4 h-4 text-[#2b593f]" />
        {/* Master status indicator dot in top right */}
        <span
          className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white shrink-0 ${
            activeTruckStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
          }`}
          title={activeTruckStatus.isOpen ? '营业中' : '已暂停'}
        />
      </button>

      {/* 桌面与平板端：复合胶囊详细展示 (Tablet & Desktop: Composite capsule) */}
      <div
        style={{ backgroundColor: '#ffffff' }}
        className="hidden sm:flex items-center bg-white border border-[#e6e6e4] hover:border-[#37352f] rounded-[2px] px-2 py-0.5 shrink-0 transition-colors shadow-2xs"
      >
        <button
          type="button"
          id="truck-business-scope-dropdown-trigger"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 cursor-pointer text-left outline-none py-0.5"
          title="点击打开多餐车站台营业与渠道调度中枢"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          {/* Tenant Role Pill */}
          <div
            className={`flex items-center gap-1 px-1.5 py-0.2 rounded-[2px] border text-[10px] font-medium shrink-0 ${
              franchiseContext.isHqUser
                ? 'bg-amber-50 text-amber-900 border-amber-300/80'
                : 'bg-emerald-50 text-emerald-900 border-emerald-300/80'
            }`}
            title={`当前身份: ${franchiseContext.isHqUser ? '品牌总部 HQ (Super Admin)' : '特许加盟商沙箱'} · 操作员: ${franchiseContext.operatorName}`}
          >
            {franchiseContext.isHqUser ? (
              <Crown className="w-3 h-3 text-amber-700 shrink-0" />
            ) : (
              <Building2 className="w-3 h-3 text-emerald-700 shrink-0" />
            )}
            <span>
              {franchiseContext.isHqUser ? 'HQ总部' : '加盟沙箱'}
            </span>
          </div>

          <div className="h-3 w-[1px] bg-[#e6e6e4] shrink-0" />

          {(() => {
            const allConfigs = getAllTruckConfigs();
            const trkConfig = allConfigs.find((cfg) => cfg.id === selectedTruckId);
            const logo = trkConfig?.logo || trkConfig?.image;
            return logo ? (
              <div className="w-4 h-4 rounded-xs overflow-hidden border border-emerald-500/50 shrink-0">
                <img src={logo} alt="Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <Truck className="w-3.5 h-3.5 text-[#2b593f] shrink-0" />
            );
          })()}
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs font-medium text-[#201f1d] truncate max-w-[150px] md:max-w-[180px] tracking-tight">
              {getTruckLabel(currentTruck as any, 'standard')}
            </span>
            {/* Master status indicator dot for active truck */}
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                activeTruckStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
              title={activeTruckStatus.isOpen ? '当前餐车总开关: 营业中' : '当前餐车总开关: 已暂停'}
            />
          </div>

          {/* Channel quick indicator pills for active truck */}
          <div className="hidden md:flex items-center gap-0.5 text-[9px] font-mono text-[#787774] pl-0.5">
            <span
              className={`px-1 py-0.2 rounded-[2px] font-normal ${
                isDineInActive && activeTruckStatus.isOpen
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-neutral-100 text-neutral-400 line-through'
              }`}
              title={`堂食: ${isDineInActive ? '开启' : '关闭'}`}
            >
              堂
            </span>
            <span
              className={`px-1 py-0.2 rounded-[2px] font-normal ${
                isDeliveryActive && activeTruckStatus.isOpen
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-neutral-100 text-neutral-400 line-through'
              }`}
              title={`外卖: ${isDeliveryActive ? '开启' : '关闭'}`}
            >
              外
            </span>
            <span
              className={`px-1 py-0.2 rounded-[2px] font-normal ${
                isPickupActive && activeTruckStatus.isOpen
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-neutral-100 text-neutral-400 line-through'
              }`}
              title={`自提: ${isPickupActive ? '开启' : '关闭'}`}
            >
              提
            </span>
          </div>

          <ChevronDown
            className={`w-3.5 h-3.5 text-[#787774] shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-black' : ''
            }`}
          />
        </button>
      </div>

      {/* Modern Centered Modal Overlay (适配三端：Mobile / Tablet / Desktop) */}
      <AnimatePresence>
        {isOpen && (
          <div
            id="truck-business-scope-modal-backdrop"
            className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto select-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              id="truck-business-scope-modal-card"
              data-purpose="dispatch-modal-card"
              className="w-full max-w-[560px] bg-white border border-[#e2e3e1] rounded-[3px] shadow-2xl flex flex-col overflow-hidden text-[13px] leading-snug my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* BEGIN: HeaderSection */}
              <header className="px-4 py-3.5 border-b border-[#e2e3e1] bg-white flex items-start justify-between shrink-0">
                {/* Title Group */}
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-7 h-7 rounded-[3px] bg-[#eaf8f1] border border-[#0ea45e]/30 text-[#0ea45e] flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4 text-[#0ea45e]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-sm font-semibold tracking-tight text-[#151716]">
                        多餐车站台营业与渠道调度中枢
                      </h1>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-[3px]">
                        v2.8-PROD
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5a5e5a] mt-0.5 tracking-tight">
                      每辆餐车独立总开关 + 堂食 / 外卖 / 自提 3 大渠道独立调度
                    </p>
                  </div>
                </div>

                {/* Close Window Button */}
                <button
                  aria-label="关闭控制台"
                  className="text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 p-1 rounded-[3px] transition-colors duration-150 cursor-pointer"
                  type="button"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </header>
              {/* END: HeaderSection */}

              {/* BEGIN: GovernanceBar */}
              <section className="px-4 py-2 bg-[#fafbf9] border-b border-[#e2e3e1] flex items-center justify-between text-[11px] shrink-0 gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                  {/* HQ Label Badge */}
                  <span
                    className={`inline-flex items-center gap-1 font-mono font-medium px-1.5 py-0.5 rounded-[3px] text-[10px] shrink-0 ${
                      franchiseContext.isHqUser
                        ? 'bg-amber-50 text-amber-900 border border-amber-300'
                        : 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {franchiseContext.isHqUser ? (
                      <Crown className="w-3 h-3 text-amber-700" />
                    ) : (
                      <Building2 className="w-3 h-3 text-emerald-700" />
                    )}
                    {franchiseContext.isHqUser ? '品牌总部(HQ)' : '特许加盟商沙箱'}
                  </span>

                  {/* Operator & Fleet Scope Identification */}
                  <span className="text-zinc-400">|</span>
                  <span className="text-[#5a5e5a] truncate font-medium">
                    {franchiseContext.operatorName || '黑曜石品控中心'}
                  </span>
                  <span className="font-mono text-zinc-400 text-[10px] shrink-0">#0924</span>
                  <span className="text-zinc-400 hidden xs:inline">|</span>
                  <span className="text-zinc-500 font-mono text-[10px] truncate hidden xs:inline">
                    管辖:{' '}
                    <span className="text-zinc-800 font-medium">
                      {franchiseContext.accessibleTruckIds && franchiseContext.accessibleTruckIds.length > 0
                        ? franchiseContext.accessibleTruckIds.join(' ~ ')
                        : 'truck-01 ~ 03'}
                    </span>
                  </span>
                </div>

                {/* Super Admin Locked Core SKUs Action */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenHQModal) {
                      setIsOpen(false);
                      onOpenHQModal();
                    } else {
                      showToast(`已锁定 ${lockedCount} 款核心爆品`);
                    }
                  }}
                  className="inline-flex items-center gap-1 font-medium text-[11px] px-2 py-1 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300 rounded-[3px] shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  <Lock className="w-3 h-3 text-amber-600" />
                  <span>
                    爆品锁定: <strong className="font-mono text-zinc-900">{lockedCount}款</strong>
                  </span>
                  <span className="font-mono text-[9px] px-1 bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-[3px]">
                    HQ中枢
                  </span>
                </button>
              </section>
              {/* END: GovernanceBar */}

              {/* Scrollable Content Zone */}
              <main className="custom-scrollbar overflow-y-auto max-h-[calc(86vh-130px)] p-3.5 sm:p-4 space-y-3.5 sm:space-y-4">
                {/* BEGIN: FocusedVehicleSection */}
                <section className="border border-[#e2e3e1] rounded-[3px] bg-white p-3.5 shadow-xs space-y-3.5">
                  {/* Status Bar Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs text-[#8b918b] font-mono shrink-0">当前重点管控:</span>
                      <span className="text-xs font-semibold text-[#151716] truncate">
                        {getTruckLabel(currentTruck as any, 'standard')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleToggleTruckMaster(selectedTruckId, e)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[11px] font-medium rounded-[3px] shadow-xs transition-colors cursor-pointer shrink-0 ${
                        activeTruckStatus.isOpen
                          ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-[#0ea45e]'
                          : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-[#d9383a]'
                      }`}
                      title="点击切换整车营业状态"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full pulse-indicator ${
                          activeTruckStatus.isOpen ? 'bg-[#0ea45e]' : 'bg-[#d9383a]'
                        }`}
                      />
                      <span className="font-mono font-semibold">
                        {activeTruckStatus.isOpen ? '营业接单中' : '已暂停营业'}
                      </span>
                      <Power className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>

                  {/* Master Power Control Big Card */}
                  <div className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-[3px] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-[3px] flex items-center justify-center shrink-0 ${
                          activeTruckStatus.isOpen
                            ? 'bg-emerald-100 text-[#0ea45e]'
                            : 'bg-rose-100 text-[#d9383a]'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                      </div>
                      <span className="font-medium text-xs text-zinc-900 shrink-0">营业总开关</span>
                      <span
                        className={`font-mono text-[10px] border px-1.5 py-0.2 rounded-[3px] shrink-0 ${
                          activeTruckStatus.isOpen
                            ? 'text-emerald-800 bg-emerald-100/90 border-emerald-300'
                            : 'text-rose-800 bg-rose-100/90 border-rose-300'
                        }`}
                      >
                        {activeTruckStatus.isOpen ? '正常接单' : '已暂停接单'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleToggleTruckMaster(selectedTruckId, e)}
                      className={`px-2.5 py-1 bg-white border font-medium text-xs rounded-[3px] flex items-center gap-1.5 shadow-xs active:scale-[0.99] transition-all shrink-0 cursor-pointer ${
                        activeTruckStatus.isOpen
                          ? 'border-zinc-300 hover:border-rose-300 hover:bg-rose-50 text-zinc-700 hover:text-[#d9383a]'
                          : 'border-zinc-300 hover:border-emerald-300 hover:bg-emerald-50 text-zinc-700 hover:text-[#0ea45e]'
                      }`}
                      title={activeTruckStatus.isOpen ? '暂停接单' : '恢复接单'}
                    >
                      <Power
                        className={`w-3 h-3 shrink-0 ${
                          activeTruckStatus.isOpen ? 'text-[#d9383a]' : 'text-[#0ea45e]'
                        }`}
                      />
                      <span>{activeTruckStatus.isOpen ? '暂停接单' : '开启接单'}</span>
                    </button>
                  </div>

                  {/* 3 Independent Order Channels Grid */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-[#5a5e5a] px-0.5">
                      <span>当前餐车 3 大渠道独立接单控制:</span>
                      <span className="text-zinc-400 font-mono text-[10px]">独立控制接单渠道</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {/* Channel 1: Dine-in */}
                      <div
                        onClick={(e) => handleToggleTruckChannel(selectedTruckId, 'dine_in', e)}
                        className={`border bg-white p-2.5 rounded-[3px] flex flex-col items-center justify-center text-center transition-all cursor-pointer group shadow-xs ${
                          isDineInActive
                            ? 'border-emerald-300 hover:border-emerald-400'
                            : 'border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 opacity-80'
                        }`}
                        title="点击切换堂食渠道接单状态"
                      >
                        <div
                          className={`w-8 h-8 flex items-center justify-center mb-1.5 border group-hover:scale-105 transition-transform rounded-[3px] ${
                            isDineInActive
                              ? 'bg-emerald-50 text-[#0ea45e] border-emerald-200'
                              : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                          }`}
                        >
                          <UtensilsCrossed className="w-4 h-4" />
                        </div>
                        <div className="text-xs font-semibold text-zinc-900 mb-1">堂食开关</div>
                        <span
                          className={`inline-block font-mono text-[11px] font-medium px-2 py-0.5 rounded-[3px] border ${
                            isDineInActive
                              ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                              : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                          }`}
                        >
                          {isDineInActive ? '已开启' : '已暂停'}
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-1 font-mono">
                          {isDineInActive ? `${activeTableCount}桌在席` : '暂停堂食'}
                        </span>
                      </div>

                      {/* Channel 2: Takeout Delivery */}
                      <div
                        onClick={(e) => handleToggleTruckChannel(selectedTruckId, 'delivery', e)}
                        className={`border bg-white p-2.5 rounded-[3px] flex flex-col items-center justify-center text-center transition-all cursor-pointer group shadow-xs ${
                          isDeliveryActive
                            ? 'border-blue-300 hover:border-blue-400'
                            : 'border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 opacity-80'
                        }`}
                        title="点击切换外卖渠道接单状态"
                      >
                        <div
                          className={`w-8 h-8 flex items-center justify-center mb-1.5 border group-hover:scale-105 transition-transform rounded-[3px] ${
                            isDeliveryActive
                              ? 'bg-blue-50 text-[#0969da] border-blue-200'
                              : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                          }`}
                        >
                          <Bike className="w-4 h-4" />
                        </div>
                        <div className="text-xs font-semibold text-zinc-900 mb-1">外卖开关</div>
                        <span
                          className={`inline-block font-mono text-[11px] font-medium px-2 py-0.5 rounded-[3px] border ${
                            isDeliveryActive
                              ? 'bg-blue-100/90 text-blue-800 border-blue-300'
                              : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                          }`}
                        >
                          {isDeliveryActive ? '已开启' : '已暂停'}
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-1 font-mono">美团 / 饿了么</span>
                      </div>

                      {/* Channel 3: Self Pickup */}
                      <div
                        onClick={(e) => handleToggleTruckChannel(selectedTruckId, 'pickup', e)}
                        className={`border bg-white p-2.5 rounded-[3px] flex flex-col items-center justify-center text-center transition-all cursor-pointer group shadow-xs ${
                          isPickupActive
                            ? 'border-amber-300 hover:border-amber-400'
                            : 'border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 opacity-80'
                        }`}
                        title="点击切换自提渠道接单状态"
                      >
                        <div
                          className={`w-8 h-8 flex items-center justify-center mb-1.5 border group-hover:scale-105 transition-transform rounded-[3px] ${
                            isPickupActive
                              ? 'bg-amber-50 text-[#c9780a] border-amber-200'
                              : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                          }`}
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div className="text-xs font-semibold text-zinc-900 mb-1">自提开关</div>
                        <span
                          className={`inline-block font-mono text-[11px] font-medium px-2 py-0.5 rounded-[3px] border ${
                            isPickupActive
                              ? 'bg-amber-100/90 text-amber-800 border-amber-300'
                              : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                          }`}
                        >
                          {isPickupActive ? '已开启' : '已暂停'}
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-1 font-mono">恒温提餐柜</span>
                      </div>
                    </div>
                  </div>
                </section>
                {/* END: FocusedVehicleSection */}

                {/* BEGIN: FleetOverviewList */}
                <section className="space-y-2.5">
                  {/* List Header */}
                  <div className="flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-1.5 font-medium text-xs text-zinc-800">
                      <Layers className="w-3.5 h-3.5 text-zinc-600" />
                      <span>各餐车站台独立管控列表 (分别 4 开关)</span>
                    </div>
                    <span className="font-mono text-[11px] text-zinc-500">
                      共 {truckList.length} 辆餐车
                    </span>
                  </div>

                  {/* Column Header Bar */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-100/90 border border-zinc-200 text-[10px] font-mono text-zinc-500 rounded-[3px] mb-1.5">
                    <div className="flex-1 min-w-0 flex items-center gap-1">
                      <span className="text-zinc-700 font-medium">餐车站号 / 实体点位</span>
                      <span className="text-zinc-400">· STATIONS</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 shrink-0 text-center">
                      <div
                        className="w-7 text-center font-medium text-zinc-700 truncate"
                        title="整车营业总控开关 (MASTER KILLSWITCH)"
                      >
                        总控
                      </div>
                      <div
                        className="w-7 text-center font-medium text-zinc-700 truncate"
                        title="堂食独立渠道"
                      >
                        堂食
                      </div>
                      <div
                        className="w-7 text-center font-medium text-zinc-700 truncate"
                        title="外卖独立渠道"
                      >
                        外卖
                      </div>
                      <div
                        className="w-7 text-center font-medium text-zinc-700 truncate"
                        title="自提独立渠道"
                      >
                        自提
                      </div>
                    </div>
                  </div>

                  {/* Vehicles Stack */}
                  <div className="space-y-2">
                    {truckList.map((t) => {
                      const isSelected = t.truckId === selectedTruckId;
                      const isAccessible =
                        franchiseContext.isHqUser ||
                        franchiseContext.accessibleTruckIds.includes(t.truckId);
                      const tStatus = allStatuses[t.truckId] || getTruckBusinessStatus(t.truckId);
                      const tDineIn = tStatus.dineInOpen !== false;
                      const tDelivery = tStatus.deliveryOpen !== false;
                      const tPickup = tStatus.pickupOpen !== false;

                      return (
                        <article
                          key={t.truckId}
                          className={`px-2.5 py-2 rounded-[3px] border transition-all flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'border-zinc-900 bg-white ring-1 ring-zinc-900/10 shadow-xs'
                              : 'border-[#e2e3e1] bg-white hover:border-zinc-300 shadow-xs'
                          }`}
                        >
                          {/* Station label & selection trigger */}
                          <div
                            onClick={() => {
                              onSelectTruck(t.truckId);
                              globalFranchiseEngine.switchTruck(t.truckId);
                              showToast(
                                `已切换当前重点管控餐车至: 【${getTruckLabel(t as any, 'standard')}】${
                                  !isAccessible ? ' (非管辖·只读沙箱)' : ''
                                }`
                              );
                            }}
                            className="flex items-center gap-1.5 min-w-0 flex-1 truncate cursor-pointer group"
                            title={
                              isAccessible
                                ? '点击切换为此餐车为当前重点管控'
                                : '非管辖餐车（只读沙箱）'
                            }
                          >
                            {(() => {
                              const allConfigs = getAllTruckConfigs();
                              const trkConfig = allConfigs.find((cfg) => cfg.id === t.truckId);
                              const logo = trkConfig?.logo || trkConfig?.image;
                              return logo ? (
                                <div className="w-5 h-5 rounded-xs overflow-hidden border border-emerald-500/50 shrink-0">
                                  <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <Truck
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isSelected ? 'text-zinc-900' : 'text-zinc-400'
                                  }`}
                                />
                              );
                            })()}
                            <span
                              className={`text-xs font-mono truncate ${
                                isSelected
                                  ? 'font-semibold text-zinc-900'
                                  : 'font-medium text-zinc-800'
                              }`}
                            >
                              {getTruckLabel(t as any, 'standard')}
                            </span>
                            {isSelected && (
                              <span className="font-mono text-[9px] px-1 py-0.2 bg-zinc-900 text-white rounded-[3px] shrink-0">
                                当前选中
                              </span>
                            )}
                            {!isAccessible && (
                              <span className="font-mono text-[9px] px-1 py-0.2 bg-zinc-100 text-zinc-500 border border-zinc-200 rounded-[3px] shrink-0">
                                只读沙箱
                              </span>
                            )}
                          </div>

                          {/* 4 Precision Switch Buttons */}
                          <div className="grid grid-cols-4 gap-1.5 shrink-0 font-mono text-[11px]">
                            {/* Switch 1: 总控 */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleTruckMaster(t.truckId, e)}
                              className={`w-7 h-7 rounded-[3px] border flex items-center justify-center transition-colors relative cursor-pointer active:scale-95 ${
                                !isAccessible
                                  ? 'border-zinc-200 bg-zinc-100 text-zinc-300 cursor-not-allowed'
                                  : tStatus.isOpen
                                  ? 'border-emerald-300 bg-emerald-50 text-[#0ea45e] hover:bg-emerald-100'
                                  : 'border-rose-300 bg-rose-50 text-[#d9383a] hover:bg-rose-100'
                              }`}
                              title={
                                isAccessible
                                  ? `总控开关: ${tStatus.isOpen ? '营业中 (点击打烊)' : '已暂停 (点击营业)'}`
                                  : '受沙箱保护无权修改'
                              }
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span
                                className={`w-1.5 h-1.5 rounded-full absolute top-1 right-1 ${
                                  tStatus.isOpen ? 'bg-[#0ea45e]' : 'bg-[#d9383a]'
                                }`}
                              />
                            </button>

                            {/* Switch 2: 堂食 */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleTruckChannel(t.truckId, 'dine_in', e)}
                              className={`w-7 h-7 rounded-[3px] border flex items-center justify-center transition-colors relative cursor-pointer active:scale-95 ${
                                !isAccessible
                                  ? 'border-zinc-200 bg-zinc-100 text-zinc-300 cursor-not-allowed'
                                  : tDineIn
                                  ? 'border-emerald-300 bg-emerald-50 text-[#0ea45e] hover:bg-emerald-100'
                                  : 'border-zinc-200 bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                              }`}
                              title={
                                isAccessible
                                  ? `堂食渠道: ${tDineIn ? '开启中' : '已暂停接单'}`
                                  : '受沙箱保护无权修改'
                              }
                            >
                              <UtensilsCrossed className="w-3.5 h-3.5" />
                              <span
                                className={`w-1.5 h-1.5 rounded-full absolute top-1 right-1 ${
                                  tDineIn ? 'bg-[#0ea45e]' : 'bg-zinc-400'
                                }`}
                              />
                            </button>

                            {/* Switch 3: 外卖 */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleTruckChannel(t.truckId, 'delivery', e)}
                              className={`w-7 h-7 rounded-[3px] border flex items-center justify-center transition-colors relative cursor-pointer active:scale-95 ${
                                !isAccessible
                                  ? 'border-zinc-200 bg-zinc-100 text-zinc-300 cursor-not-allowed'
                                  : tDelivery
                                  ? 'border-blue-300 bg-blue-50 text-[#0969da] hover:bg-blue-100'
                                  : 'border-zinc-200 bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                              }`}
                              title={
                                isAccessible
                                  ? `外卖渠道: ${tDelivery ? '开启中' : '已暂停接单'}`
                                  : '受沙箱保护无权修改'
                              }
                            >
                              <Bike className="w-3.5 h-3.5" />
                              <span
                                className={`w-1.5 h-1.5 rounded-full absolute top-1 right-1 ${
                                  tDelivery ? 'bg-[#0969da]' : 'bg-zinc-400'
                                }`}
                              />
                            </button>

                            {/* Switch 4: 自提 */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleTruckChannel(t.truckId, 'pickup', e)}
                              className={`w-7 h-7 rounded-[3px] border flex items-center justify-center transition-colors relative cursor-pointer active:scale-95 ${
                                !isAccessible
                                  ? 'border-zinc-200 bg-zinc-100 text-zinc-300 cursor-not-allowed'
                                  : tPickup
                                  ? 'border-amber-300 bg-amber-50 text-[#c9780a] hover:bg-amber-100'
                                  : 'border-zinc-200 bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                              }`}
                              title={
                                isAccessible
                                  ? `自提渠道: ${tPickup ? '开启中' : '已暂停接单'}`
                                  : '受沙箱保护无权修改'
                              }
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span
                                className={`w-1.5 h-1.5 rounded-full absolute top-1 right-1 ${
                                  tPickup ? 'bg-[#c9780a]' : 'bg-zinc-400'
                                }`}
                              />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {/* Subtle Expand Indicator */}
                  <div className="flex justify-center pt-1">
                    <div className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono px-2 py-0.5 bg-zinc-100 rounded-[3px]">
                      <span>已加载全部站台</span>
                      <ChevronDown className="w-3 h-3 text-zinc-400" />
                    </div>
                  </div>
                </section>
                {/* END: FleetOverviewList */}
              </main>

              {/* BEGIN: FooterSection */}
              <footer className="px-4 py-3 bg-zinc-50 border-t border-[#e2e3e1] flex items-center justify-between shrink-0">
                {/* Advanced Setting Link Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenDetailedModal();
                  }}
                  className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="underline underline-offset-2">
                    设置打烊原因、恢复时间与预定配置...
                  </span>
                </button>

                {/* Complete / Confirm Action */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-8 px-5 bg-zinc-900 hover:bg-black text-white font-medium text-xs rounded-[3px] shadow-xs active:translate-y-px transition-all font-mono tracking-wide cursor-pointer"
                >
                  完成
                </button>
              </footer>
              {/* END: FooterSection */}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
