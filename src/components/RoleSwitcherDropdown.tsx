import React, { useState, useRef, useEffect } from 'react';
import {
  Smartphone,
  House,
  Bike,
  ChevronDown,
  ShieldCheck,
  Zap,
  Layers,
  SlidersHorizontal,
  Lock,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDevSimulation } from '../context/DevSimulationContext';
import {
  getMerchantSession,
  getRiderSession,
  maskPhoneNumber,
  EVENT_MERCHANT_AUTH_CHANGED,
  EVENT_RIDER_AUTH_CHANGED
} from '../utils/staffAndRiderAuthEngine';
import {
  getPlatformSession,
  EVENT_PLATFORM_AUTH_CHANGED
} from '../utils/platformAuthEngine';
import { useCascadeAuth } from '../context/CascadeAuthContext';
import { MeshTierLevel } from '../utils/cascadeMeshEngine';
import { CascadeAuthFullMatrixView } from './common/CascadeAuthFullMatrixView';

export type UserRole = 'customer' | 'merchant' | 'rider' | 'platform';

interface RoleSwitcherDropdownProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  pendingOrdersCount?: number;
  riderTasksCount?: number;
  onNavigateToPlatformMatrix?: () => void;
  onOpenAuthGate?: (role: 'merchant' | 'rider') => void;
}

const CARBON = '#1a1a17';

export const RoleSwitcherDropdown: React.FC<RoleSwitcherDropdownProps> = ({
  currentRole,
  onSelectRole,
  pendingOrdersCount = 6,
  riderTasksCount = 2,
  onNavigateToPlatformMatrix,
  onOpenAuthGate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHudOpen, setIsHudOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAdminDeveloper, openDevAuthModal, openDevControlCenter } = useDevSimulation();

  const [merchantSession, setMerchantSession] = useState(getMerchantSession());
  const [riderSession, setRiderSession] = useState(getRiderSession());
  const [platformSession, setPlatformSession] = useState(getPlatformSession());

  useEffect(() => {
    const handleMerchantChange = () => setMerchantSession(getMerchantSession());
    const handleRiderChange = () => setRiderSession(getRiderSession());
    const handlePlatformChange = () => setPlatformSession(getPlatformSession());

    window.addEventListener(EVENT_MERCHANT_AUTH_CHANGED, handleMerchantChange);
    window.addEventListener(EVENT_RIDER_AUTH_CHANGED, handleRiderChange);
    window.addEventListener(EVENT_PLATFORM_AUTH_CHANGED, handlePlatformChange);

    return () => {
      window.removeEventListener(EVENT_MERCHANT_AUTH_CHANGED, handleMerchantChange);
      window.removeEventListener(EVENT_RIDER_AUTH_CHANGED, handleRiderChange);
      window.removeEventListener(EVENT_PLATFORM_AUTH_CHANGED, handlePlatformChange);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { activeIdentity, switchTier, permissions } = useCascadeAuth();
  const activePermissionsCount = permissions.filter((p) => p.enabled).length;

  // 4-Level Mesh Topology 分层授权体系标准角色映射
  const rolesConfig: {
    key: UserRole;
    meshTier: MeshTierLevel;
    title: string;
    levelTag: string;
    badge: string;
    desc: string;
    icon: any;
    iconBox: string;
    badgeStyle: string;
  }[] = [
    {
      key: 'customer' as UserRole,
      meshTier: 'CUSTOMER',
      title: '客户端',
      levelTag: 'CUSTOMER · 食客端',
      badge: '免密安全通行',
      desc: '智能餐车发现、选购点餐与实时配送追踪 (GPS/哈希核验)',
      icon: Smartphone,
      iconBox: 'bg-[#1a1a17] text-white',
      badgeStyle: 'bg-[#1a1a17] text-white'
    },
    {
      key: 'merchant' as UserRole,
      meshTier: 'L3',
      title: '商家端',
      levelTag: 'L3 · 站点移动餐车',
      badge: merchantSession ? `${merchantSession.name} (${maskPhoneNumber(merchantSession.phone)})` : '未登录 · 点击准入',
      desc: merchantSession
        ? `${merchantSession.roleTitle} · 03号车长/站台控制权`
        : '黑曜石01/03号餐车工作台 · 菜品估清、后厨出餐与车载温控',
      icon: House,
      iconBox: 'bg-[#faf4ec] text-[#b86200] border border-[#f0dfc8]',
      badgeStyle: merchantSession
        ? 'bg-amber-50 text-amber-900 border border-amber-300 font-semibold'
        : 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold'
    },
    {
      key: 'rider' as UserRole,
      meshTier: 'L4',
      title: '骑手端',
      levelTag: 'L4 · 基层现场单兵',
      badge: riderSession ? `${riderSession.name} (${maskPhoneNumber(riderSession.phone)})` : '未登录 · 点击准入',
      desc: riderSession
        ? `${riderSession.levelTitle || '金牌先锋'} · RTK 亚米级骑手`
        : '闪送先锋骑士配送台 · 双向对讲、送达存证与跨车溢出抢单',
      icon: Bike,
      iconBox: 'bg-[#edf7f1] text-[#1b7a47] border border-[#cbe9d7]',
      badgeStyle: riderSession
        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold'
        : 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold'
    },
    {
      key: 'platform' as UserRole,
      meshTier: 'L1',
      title: '平台总控端',
      levelTag: 'L1/L0 · 商圈主控与HQ',
      badge: platformSession ? `${platformSession.name.slice(0, 3)} (门禁已准入)` : '需安全门禁PIN',
      desc: platformSession
        ? `${platformSession.roleTitle} · 4-Level Mesh 全域级联穿透`
        : '全域拓扑矩阵与商圈主控席 · 根证书、钢笔透视与加价熔断签批',
      icon: ShieldCheck,
      iconBox: 'bg-[#f1f1fe] text-[#4d47eb] border border-[#dadafd]',
      badgeStyle: platformSession
        ? 'bg-indigo-50 text-indigo-800 border border-indigo-200/60 font-semibold'
        : 'bg-amber-50 text-amber-800 border border-amber-200/60 font-medium'
    }
  ];

  const roleTagsMap: Record<UserRole, string[]> = {
    customer: ['免密扫码点餐', 'GPS实时雷达', '同桌协同'],
    merchant: ['菜品沽清下架', '后厨出单核销', '车载温控预警'],
    rider: ['跨车抢单调度', '送达相片存证', 'RTK亚米级定位'],
    platform: ['全域熔断签批', '多车路网调度', '数字孪生驾驶舱']
  };

  const currentRoleConfig = rolesConfig.find((r) => r.key === currentRole) || rolesConfig[0];
  const CurrentIcon = currentRoleConfig.icon;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* 单图标样式：精致高辨识度角色与全域中枢快捷入口 */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-7 h-7 flex items-center justify-center rounded border transition-all cursor-pointer select-none group shrink-0 shadow-xs ${
          isOpen
            ? 'bg-black text-white border-black ring-2 ring-neutral-400/30'
            : 'bg-[#1a1a17] hover:bg-black text-white border-white/10'
        }`}
        title={`全域工作台与角色切换 (当前: ${currentRoleConfig.title} · ${activeIdentity.tier} ${activeIdentity.name})`}
        aria-label={`切换工作台角色，当前为${currentRoleConfig.title}`}
      >
        <CurrentIcon className="w-3.5 h-3.5 stroke-current transition-transform duration-150 group-hover:scale-110" />

        {/* 待处理提醒微标 / 状态角标 */}
        {currentRole === 'merchant' && pendingOrdersCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-1.5 ring-white animate-pulse" />
        ) : currentRole === 'rider' && riderTasksCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1.5 ring-white animate-pulse" />
        ) : (
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-[#1a1a17]" />
        )}
      </motion.button>

      {/* 渐进式多维工作台浮层 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-[calc(100vw-24px)] xs:w-[350px] max-w-[350px] bg-white rounded-xl border border-neutral-300 shadow-[0_20px_40px_-12px_rgba(26,26,23,0.14),0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden z-50 origin-top-right"
          >
            {/* 顶栏：工作台与授权中枢 */}
            <header className="px-3 py-2 sm:px-3.5 sm:py-2.5 border-b border-neutral-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-neutral-900 text-white flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-xs font-bold tracking-tight text-neutral-900">
                    全域工作台与授权中枢
                  </h1>
                  <p className="text-[9.5px] text-neutral-400">4-Level Mesh 拓扑多端联动</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-[9.5px] tabular-nums font-medium text-emerald-700 tracking-tight">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                级联生效中
              </span>
            </header>

            {/* 角色卡片列表：高频快速切端 */}
            <section className="p-2 sm:p-2.5 space-y-1.5 bg-[#fbfbf9]/60 max-h-[250px] overflow-y-auto">
              {rolesConfig.map((roleItem) => {
                const isSelected = roleItem.key === currentRole;
                const RoleIcon = roleItem.icon;

                return (
                  <motion.article
                    key={roleItem.key}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => {
                      onSelectRole(roleItem.key);
                      // 级联拓扑矩阵全域身份同步
                      switchTier(roleItem.meshTier);
                      setIsOpen(false);
                    }}
                    className={`touch-interactive relative flex items-start gap-2.5 p-2 sm:p-2.5 rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'border-2 border-[#1a1a17] bg-white shadow-[0_1px_3px_rgba(26,26,23,0.06)]'
                        : 'border border-neutral-200/90 bg-white hover:border-neutral-400 hover:bg-neutral-50/60'
                    }`}
                  >
                    {/* 图标 */}
                    <div
                      className={`w-7.5 h-7.5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${roleItem.iconBox}`}
                    >
                      <RoleIcon
                        className="w-3.5 h-3.5"
                        strokeWidth={1.75}
                      />
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0 pr-0.5">
                      <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                        <h2
                          className={`text-[11.5px] tracking-tight text-[#1a1a17] ${
                            isSelected ? 'font-bold' : 'font-semibold'
                          }`}
                        >
                          {roleItem.title}
                        </h2>
                        <span className="text-[8.5px] tabular-nums px-1 py-0.2 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                          {roleItem.levelTag}
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] tracking-tight shrink-0 ${
                            isSelected
                              ? 'font-medium bg-[#1a1a17] text-white'
                              : 'tabular-nums font-medium ' + roleItem.badgeStyle
                          }`}
                        >
                          {roleItem.badge}
                        </span>
                        {/* 换登快捷入口 */}
                        {((roleItem.key === 'merchant' && merchantSession) ||
                          (roleItem.key === 'rider' && riderSession)) && onOpenAuthGate && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsOpen(false);
                              onOpenAuthGate(roleItem.key as 'merchant' | 'rider');
                            }}
                            className="text-[8.5px] tabular-nums font-semibold px-1 py-0.2 rounded border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors cursor-pointer"
                            title="更换在岗账号或重新核验"
                          >
                            换登
                          </button>
                        )}
                      </div>
                      <p
                        className={`text-[10px] leading-snug ${
                          isSelected ? 'text-neutral-600 font-normal line-clamp-1' : 'text-neutral-500 line-clamp-1'
                        }`}
                      >
                        {roleItem.desc}
                      </p>
                    </div>

                    {/* 选中指示器 */}
                    <div className="flex-shrink-0 self-center pl-0.5">
                      {isSelected ? (
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.14 }}
                          className="text-[#1a1a17]"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                            />
                          </svg>
                        </motion.div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-neutral-300 group-hover:border-neutral-400 bg-white transition-colors" />
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </section>

            {/* 当前视界分层权限透视与一键穿透入口 */}
            <section className="p-2.5 bg-[#f8f8f6] border-t border-b border-neutral-200/70">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-[11px] font-bold text-neutral-800">
                    当前席位权限视界
                  </span>
                </div>
                <span className="text-[9px] tabular-nums px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200 font-semibold">
                  放行中 {activePermissionsCount}/15 项
                </span>
              </div>

              {/* 席位卡片与快捷标签 */}
              <div className="bg-white rounded-lg p-2 border border-neutral-200/90 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-1">
                    <span className="font-bold text-neutral-900 truncate block text-xs">
                      [{activeIdentity.tier}] {activeIdentity.name}
                    </span>
                    <span className="text-[10px] text-neutral-500 truncate block mt-0.5">
                      {activeIdentity.roleTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    <span className="tabular-nums text-[9px] text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded border border-neutral-200/60">
                      {activeIdentity.scopeLabel}
                    </span>
                    {onOpenAuthGate && (activeIdentity.tier === 'L3' || activeIdentity.tier === 'L4') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          onOpenAuthGate(activeIdentity.tier === 'L3' ? 'merchant' : 'rider');
                        }}
                        className="text-[9px] text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.2 rounded border border-blue-200 font-semibold cursor-pointer transition-colors"
                        title="进入统一登录门重新核验或换登"
                      >
                        核验/换登
                      </button>
                    )}
                    {(activeIdentity.tier !== 'CUSTOMER' || currentRole !== 'customer') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRole('customer');
                          switchTier('CUSTOMER');
                          setIsOpen(false);
                        }}
                        className="text-[9px] text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 font-bold cursor-pointer transition-colors"
                        title="切回普通顾客点餐视角"
                      >
                        切回食客
                      </button>
                    )}
                  </div>
                </div>

                {/* 核心权限能力标签 */}
                <div className="flex items-center gap-1 flex-wrap">
                  {(roleTagsMap[currentRole] || []).map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700 border border-neutral-200/60 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* 打开全域穿透控制台 HUD 主按钮 */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsHudOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md bg-neutral-900 hover:bg-black text-white text-[11px] font-semibold transition active:scale-[0.98] cursor-pointer shadow-2xs group"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400 group-hover:rotate-12 transition-transform" />
                  <span>打开全域级联穿透中枢 (HUD)</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400 group-hover:text-white" />
                </button>
              </div>
            </section>

            {/* 底部信息与调试入口 */}
            <footer className="px-3 py-2 bg-white flex items-center justify-between text-xs text-neutral-500 select-none">
              <div className="flex items-center gap-1.5 text-neutral-600 font-medium">
                <Zap className="w-3 h-3 text-amber-500 shrink-0" fill="currentColor" strokeWidth={0} />
                <span className="text-[10px] tracking-tight">多端数据双向实时联通</span>
              </div>
              {isAdminDeveloper ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openDevControlCenter();
                  }}
                  className="flex items-center gap-1 text-[10px] text-amber-700 hover:text-amber-800 font-medium bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300/60 cursor-pointer transition-colors"
                  title="已授权：打开开发者模拟调试中枢"
                >
                  <SlidersHorizontal className="w-3 h-3 text-amber-500" />
                  <span>调试中枢</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openDevAuthModal();
                  }}
                  className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-[#1a1a17] transition-colors cursor-pointer px-1 py-0.5 group"
                  title="登录开发者账号以解锁悬浮调试入口"
                >
                  <Lock className="w-3 h-3 text-neutral-400 group-hover:text-[#1a1a17] transition-colors" strokeWidth={2} />
                  <span className="font-normal">开发者登录</span>
                </button>
              )}
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 全域级联穿透分层授权中枢全屏 HUD 弹窗 */}
      <CascadeAuthFullMatrixView
        isOpen={isHudOpen}
        onClose={() => setIsHudOpen(false)}
        onNavigateToPlatformMatrix={onNavigateToPlatformMatrix}
      />
    </div>
  );
};
