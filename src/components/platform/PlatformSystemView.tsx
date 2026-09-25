import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Store,
  SlidersHorizontal,
  DollarSign,
  Percent,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Users,
  Search,
  Filter,
  Plus,
  Edit2,
  Save,
  RotateCcw,
  Bike,
  Smartphone,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Zap,
  Activity,
  Calculator,
  RefreshCw,
  Award,
  FileSpreadsheet,
  Layers,
  Phone,
  Lock,
  Unlock,
  AlertCircle,
  Timer,
  Radio,
  X,
  Check,
  Truck,
  ArrowRightLeft,
  MapPin,
  Workflow,
  Maximize2,
  Minimize2,
  Cloud,
  Menu,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { getAllUserDossiers } from '../../utils/userDossierEngine';

export type PlatformTabType =
  | 'digital_twin'
  | 'data_sandbox'
  | 'user_dossier'
  | 'cloud_pipeline'
  | 'permission_flow'
  | 'truck_matrix'
  | 'merchants'
  | 'commission'
  | 'compliance_radar'
  | 'surge_emergency'
  | 'sla_monitor'
  | 'finance'
  | 'arbitration';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { Order } from '../../types';
import { getAllTruckConfigs, TruckLocationConfig } from '../../utils/truckLocationEngine';
import {
  MerchantCommissionConfig,
  GlobalCommissionSettings,
  getGlobalCommissionSettings,
  saveGlobalCommissionSettings,
  getMerchantCommissionConfigs,
  saveMerchantCommissionConfig,
  updateMerchantRate,
  toggleMerchantStatus,
  calculateOrderCommissionSplit,
  calculateAllOrdersCommissionSummary,
  subscribeCommissionUpdates
} from '../../utils/commissionEngine';
import {
  getAllOrdersSLASummary,
  calculateChatSLAResponse,
  getOrderChatMessages,
  subscribeOrderChat,
  sendOrderChatMessage,
  formatExactTime,
  formatRelativeTime
} from '../../utils/chatHub';
import { OmniAggregatedChatHub } from '../chat/OmniAggregatedChatHub';
import { UnifiedOmniChatModal } from '../chat/UnifiedOmniChatModal';
import { DigitalTwinCommandCockpit } from './DigitalTwinCommandCockpit';
import { FranchiseComplianceRadar } from './FranchiseComplianceRadar';
import { SurgePricingAndKillSwitch } from './SurgePricingAndKillSwitch';
import { HeadquartersPermissionAndFlowMatrix } from './HeadquartersPermissionAndFlowMatrix';
import { UserDossierManager } from './dossier/UserDossierManager';
import { CloudServiceTieringPipeline } from './pipeline/CloudServiceTieringPipeline';
import { DataSandboxGovernancePanel } from './sandbox/DataSandboxGovernancePanel';
import { exportToCsv } from '../../utils/dataExportEngine';
import { fallbackToast } from '../../utils/fallbackToast';

export interface PlatformSystemViewProps {
  orders: Order[];
  onSelectRole?: (role: 'customer' | 'merchant' | 'rider' | 'platform') => void;
  showToast?: (msg: string) => void;
}

export const PlatformSystemView: React.FC<PlatformSystemViewProps> = ({
  orders,
  onSelectRole,
  showToast = (msg: string) => fallbackToast(msg)
}) => {
  // Navigation tabs (Following merchant token convention)
  const [activeTab, setActiveTab] = useState<PlatformTabType>('digital_twin');

  // 侧边菜单状态 (折叠、移动端抽屉、搜索)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [sidebarFilterQuery, setSidebarFilterQuery] = useState<string>('');

  // 全屏显示状态 (与本地存储及浏览器原生全屏同步)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof window !== 'undefined' && safeGetStorage<boolean>('obsidian_platform_fullscreen', false);
  });

  const handleToggleFullscreen = () => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    safeSetStorage('obsidian_platform_fullscreen', next);
    if (next) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
      showToast('已开启平台总控台全屏沉浸显示模式');
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      showToast('已退出全屏显示模式');
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
        safeSetStorage('obsidian_platform_fullscreen', false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        safeSetStorage('obsidian_platform_fullscreen', false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Commission configs
  const [globalSettings, setGlobalSettings] = useState<GlobalCommissionSettings>(getGlobalCommissionSettings());
  const [merchants, setMerchants] = useState<MerchantCommissionConfig[]>(getMerchantCommissionConfigs());
  const [commissionTick, setCommissionTick] = useState(0);

  // Edit Merchant Modal / Drawer state
  const [editingMerchant, setEditingMerchant] = useState<MerchantCommissionConfig | null>(null);
  const [isAddMerchantOpen, setIsAddMerchantOpen] = useState(false);
  const [merchantSearchQuery, setMerchantSearchQuery] = useState('');
  const [merchantCategoryFilter, setMerchantCategoryFilter] = useState('all');

  // Commission simulation state
  const [simulatedAmount, setSimulatedAmount] = useState<number>(88.0);
  const [simulatedSelectedTruckId, setSimulatedSelectedTruckId] = useState<string>('truck-01');

  // Cross-Truck Order Transfer & Dispatch Modal state
  const [transferOrder, setTransferOrder] = useState<Order | null>(null);
  const [targetTruckId, setTargetTruckId] = useState<string>('truck-02');
  const [transferReason, setTransferReason] = useState<string>('原餐车备餐超负荷，平台应急调拨至临近餐车协同出餐');

  // SLA Chat monitor modal
  const [chatModalOrderNo, setChatModalOrderNo] = useState<string | null>(null);
  const [slaTick, setSlaTick] = useState(0);

  // Handle cross-truck order transfer
  const handleExecuteTransfer = () => {
    if (!transferOrder) return;
    const allConfigs = getAllTruckConfigs();
    const targetConfig = allConfigs.find((t) => t.id === targetTruckId) || allConfigs[0];
    
    // Mutate the order object with new truck identity
    transferOrder.truckId = targetTruckId;
    transferOrder.truckName = targetConfig.name;

    showToast(`【平台应急调度】订单 ${transferOrder.orderNo} 已成功转派给 ${targetConfig.name}！KDS及骑手接单点已同步更新。`);
    setTransferOrder(null);
  };

  // New Merchant Form State
  const [newMerchantData, setNewMerchantData] = useState<Partial<MerchantCommissionConfig>>({
    truckName: '',
    category: '炭火现烤 & 汉堡轻食',
    platformRatePercent: 5.0,
    fixedServiceFee: 0.5,
    riderDeliverySharePercent: 80.0,
    status: 'active',
    settlementCycle: 'realtime',
    contactPerson: '',
    contactPhone: '',
    licenseNo: 'SH-FD-2026-',
    depositAmount: 5000
  });

  // Subscribe to commission updates
  useEffect(() => {
    const unsub = subscribeCommissionUpdates(() => {
      setGlobalSettings(getGlobalCommissionSettings());
      setMerchants(getMerchantCommissionConfigs());
      setCommissionTick((t) => t + 1);
    });
    return () => unsub();
  }, []);

  // Periodic SLA tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSlaTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filtered merchants
  const filteredMerchants = useMemo(() => {
    return merchants.filter((m) => {
      const matchSearch =
        m.truckName.toLowerCase().includes(merchantSearchQuery.toLowerCase()) ||
        m.contactPerson.toLowerCase().includes(merchantSearchQuery.toLowerCase()) ||
        m.truckId.toLowerCase().includes(merchantSearchQuery.toLowerCase());
      const matchCategory =
        merchantCategoryFilter === 'all' || m.category.includes(merchantCategoryFilter);
      return matchSearch && matchCategory;
    });
  }, [merchants, merchantSearchQuery, merchantCategoryFilter]);

  // Overall Commission & Financial Summary
  const financeSummary = useMemo(() => {
    return calculateAllOrdersCommissionSummary(orders);
  }, [orders, commissionTick]);

  // SLA summary across all active orders
  const slaSummary = useMemo(() => {
    return getAllOrdersSLASummary(orders.map((o) => o.orderNo));
  }, [orders, slaTick]);

  // 侧边菜单导航项元数据与分组定义
  interface NavItemDef {
    id: PlatformTabType;
    label: string;
    enLabel: string;
    description: string;
    icon: React.ElementType;
    badge?: {
      text: string;
      type: 'live' | 'count' | 'info' | 'alert';
    };
  }

  interface NavGroupDef {
    groupKey: string;
    groupTitle: string;
    items: NavItemDef[];
  }

  const allNavItems: NavItemDef[] = useMemo(() => [
    {
      id: 'digital_twin',
      label: '数字孪生大屏',
      enLabel: 'Digital Twin Cockpit',
      description: '全网微网格全息态势、驻点热力分布与瞬时吞吐流',
      icon: Activity,
      badge: { text: 'LIVE', type: 'live' }
    },
    {
      id: 'data_sandbox',
      label: '数据沙箱与链路',
      enLabel: 'Sandbox & Trace Pipeline',
      description: '五层传输拓扑实时探针、故障仿真与各笔客诉工笔级时空溯源',
      icon: Layers,
      badge: { text: '探针+溯源', type: 'info' }
    },
    {
      id: 'permission_flow',
      label: '分级权限分流',
      enLabel: 'L1-L5 RBAC Flow',
      description: 'HQ总控 / 战区 / 车长 / 现场单兵全权席位鉴权分流',
      icon: Workflow,
      badge: { text: 'L1-L5', type: 'info' }
    },
    {
      id: 'user_dossier',
      label: '统一档案分层',
      enLabel: 'Unified User Dossier',
      description: '全员四层数据模型：准入·网格·履约·云端存证',
      icon: Users,
      badge: { text: `${getAllUserDossiers().length}`, type: 'count' }
    },
    {
      id: 'cloud_pipeline',
      label: '云服务分层仓库',
      enLabel: '5-Tier Cloud Pipeline',
      description: '边缘防刷、10Hz实时流、ACID事务与COS冷存证归档',
      icon: Cloud,
      badge: { text: '5-Tier', type: 'info' }
    },
    {
      id: 'truck_matrix',
      label: '餐车全域矩阵',
      enLabel: 'Truck Fleet & Dispatch',
      description: '驻点负载监控、跨车转派调拨与蜂窝网格协同',
      icon: Truck,
      badge: { text: `${getAllTruckConfigs().length}`, type: 'count' }
    },
    {
      id: 'compliance_radar',
      label: '脱圈合规雷达',
      enLabel: 'Compliance Radar',
      description: 'GPS电子围栏脱圈报警、食品安全溯源与异常记分',
      icon: ShieldCheck
    },
    {
      id: 'surge_emergency',
      label: '动态运价熔断',
      enLabel: 'Surge & Kill Switch',
      description: '恶劣天气与高峰自适应溢价、紧急熔断停单控制',
      icon: Zap
    },
    {
      id: 'sla_monitor',
      label: '三端联络总成',
      enLabel: 'SLA Response & Omni-Hub',
      description: '食客·车长·骑手三方协同联络室与超限预警中枢',
      icon: Radio,
      badge: slaSummary.overdueCount > 0 ? { text: `${slaSummary.overdueCount}单预警`, type: 'alert' } : undefined
    },
    {
      id: 'merchants',
      label: '商户档案费率',
      enLabel: 'Merchant Tiered Rates',
      description: '加盟餐车独立合同、阶梯抽佣与状态冻结管控',
      icon: Store,
      badge: { text: `${merchants.length}`, type: 'count' }
    },
    {
      id: 'commission',
      label: '抽佣引擎仿真',
      enLabel: 'Commission Split Calc',
      description: '分账算法微调、边际效益测算与极速抽佣试算',
      icon: Percent
    },
    {
      id: 'finance',
      label: '财务对账分账',
      enLabel: 'Financial Ledger',
      description: '多端订单分账清算、流水对账与结算汇总明细',
      icon: DollarSign
    },
    {
      id: 'arbitration',
      label: '风控争议仲裁',
      enLabel: 'Risk & Arbitration',
      description: '超时扣罚申诉、餐品货损赔付与不可抗力调处',
      icon: AlertTriangle
    }
  ], [merchants.length, slaSummary.overdueCount]);

  const currentNavMeta = useMemo(() => {
    return allNavItems.find(item => item.id === activeTab) || allNavItems[0];
  }, [allNavItems, activeTab]);

  const groupedNavItems: NavGroupDef[] = useMemo(() => {
    const q = sidebarFilterQuery.trim().toLowerCase();
    const filterFn = (item: NavItemDef) => {
      if (!q) return true;
      return item.label.toLowerCase().includes(q) || item.enLabel.toLowerCase().includes(q);
    };

    const g1Items = allNavItems.filter(i => ['digital_twin', 'data_sandbox', 'permission_flow', 'user_dossier', 'cloud_pipeline'].includes(i.id)).filter(filterFn);
    const g2Items = allNavItems.filter(i => ['truck_matrix', 'compliance_radar', 'surge_emergency', 'sla_monitor'].includes(i.id)).filter(filterFn);
    const g3Items = allNavItems.filter(i => ['merchants', 'commission', 'finance', 'arbitration'].includes(i.id)).filter(filterFn);

    return [
      { groupKey: 'core', groupTitle: '核心指挥与架构', items: g1Items },
      { groupKey: 'fleet', groupTitle: '运力网格与调度', items: g2Items },
      { groupKey: 'commerce', groupTitle: '商户生态与财务', items: g3Items }
    ].filter(g => g.items.length > 0);
  }, [allNavItems, sidebarFilterQuery]);

  // Simulation calculation
  const simulationResult = useMemo(() => {
    const targetConfig = merchants.find((m) => m.truckId === simulatedSelectedTruckId) || merchants[0];
    const dummyOrder: Order = {
      id: 'sim-001',
      orderNo: 'SIM-8888',
      truckName: targetConfig.truckName,
      customerName: '模拟测试食客',
      status: 'delivering',
      statusText: '配送中',
      createdTime: '12:00:00',
      estimatedDeliveryTime: '约 10 分钟',
      etaMinutes: 10,
      deliveryAddress: '创新科技园 6号楼',
      progressPercent: 65,
      totalAmount: simulatedAmount,
      channelType: 'delivery',
      deliveryBounty: 0,
      items: []
    };
    return calculateOrderCommissionSplit(dummyOrder, targetConfig);
  }, [simulatedAmount, simulatedSelectedTruckId, merchants]);

  // Handle Global Settings Save
  const handleSaveGlobalSettings = () => {
    saveGlobalCommissionSettings(globalSettings);
    showToast('已更新全平台默认抽佣与结算规则！');
  };

  // FIX(审计P1): 财务分账对账表真实导出 CSV（替代"仅弹提示"假实现）
  const handleExportFinanceCsv = () => {
    const rows = orders.map((ord) => {
      const matchedMerchant = merchants.find((m) => m.truckName === ord.truckName) || merchants[0];
      const split = calculateOrderCommissionSplit(ord, matchedMerchant);
      return {
        订单号: ord.orderNo || ord.id,
        餐车商户: ord.truckName || matchedMerchant?.truckName || '-',
        实收金额: ord.totalAmount?.toFixed(2) ?? '0.00',
        商户净入: split.merchantNetPayout?.toFixed(2) ?? '0.00',
        骑手赏金: split.riderDeliveryFee?.toFixed(2) ?? '0.00',
        平台佣金: split.platformCommission?.toFixed(2) ?? '0.00',
        履约模式: ord.channelType || 'delivery',
        创建时间: ord.createdTime || '',
        状态: ord.statusText || ord.status || ''
      };
    });
    try {
      exportToCsv(
        `平台分账对账_${new Date().toISOString().slice(0, 10)}.csv`,
        (rows[0] ? Object.keys(rows[0]) : ['订单号', '餐车商户', '实收金额']).map((k) => ({ label: k, key: k })),
        rows
      );
      showToast(`已导出分账对账表，共 ${rows.length} 条结算记录`);
    } catch (e) {
      console.error('导出账单失败:', e);
      showToast('导出失败，请稍后重试');
    }
  };

  // Handle Save Single Merchant
  const handleSaveMerchantEdit = () => {
    if (!editingMerchant) return;
    saveMerchantCommissionConfig(editingMerchant);
    setEditingMerchant(null);
    showToast(`商户【${editingMerchant.truckName}】配置已成功保存`);
  };

  // Handle Create New Merchant
  const handleCreateNewMerchant = () => {
    if (!newMerchantData.truckName?.trim()) {
      showToast('请输入商户餐车全称！');
      return;
    }
    const newId = `truck-0${merchants.length + 1}`;
    const fullConfig: MerchantCommissionConfig = {
      truckId: newId,
      truckName: newMerchantData.truckName,
      category: newMerchantData.category || '特色餐车美馔',
      platformRatePercent: Number(newMerchantData.platformRatePercent) || 5.0,
      fixedServiceFee: Number(newMerchantData.fixedServiceFee) || 0.5,
      riderDeliverySharePercent: Number(newMerchantData.riderDeliverySharePercent) || 80.0,
      status: 'active',
      settlementCycle: (newMerchantData.settlementCycle as any) || 'realtime',
      contactPerson: newMerchantData.contactPerson || '餐车主理人',
      contactPhone: newMerchantData.contactPhone || '138-0000-0000',
      licenseNo: newMerchantData.licenseNo || `SH-FD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      depositAmount: Number(newMerchantData.depositAmount) || 5000,
      joinDate: new Date().toISOString().split('T')[0],
      totalOrdersCount: 0,
      totalGmvAmount: 0,
      healthScore: 100,
      avgResponseSeconds: 10
    };

    saveMerchantCommissionConfig(fullConfig);
    setIsAddMerchantOpen(false);
    showToast(`新商户【${fullConfig.truckName}】入驻成功，独立抽佣费率 ${fullConfig.platformRatePercent}% 已生效！`);
  };

  // Toggle Merchant Status
  const handleToggleStatus = (truckId: string) => {
    const target = merchants.find((m) => m.truckId === truckId);
    const nextStatus = target?.status === 'active' ? 'suspended' : 'active';
    toggleMerchantStatus(truckId, nextStatus);
    showToast(`商户已切换为: ${nextStatus === 'active' ? '正常营业' : '暂停服务/已冻结'}`);
  };

  // Quick Rate Adjust
  const handleQuickRateAdjust = (truckId: string, delta: number) => {
    const target = merchants.find((m) => m.truckId === truckId);
    if (!target) return;
    const newRate = Math.max(1, Math.min(25, Number((target.platformRatePercent + delta).toFixed(1))));
    updateMerchantRate(truckId, newRate);
    showToast(`商户【${target.truckName}】抽佣率调整为 ${newRate}%`);
  };

  // Format SLA duration nicely
  const formatSlaDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '18秒';
    if (seconds > 3600) return '< 60秒'; // Fallback if mock is abnormally high
    if (seconds < 60) return `${Math.round(seconds)}秒`;
    const mins = Math.floor(seconds / 60);
    const remainingSecs = Math.round(seconds % 60);
    return remainingSecs > 0 ? `${mins}分${remainingSecs}秒` : `${mins}分钟`;
  };

  return (
    <div
      className={`transition-all duration-300 text-[#37352f] ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#f9f9f7] overflow-y-auto p-2 sm:p-4 lg:p-5 pb-20'
          : 'w-full pb-16'
      }`}
    >
      {/* 移动端顶栏与抽屉唤起 (Mobile Header Bar) */}
      <div className="lg:hidden bg-white border border-[#e9e9e7] rounded-xl p-3 shadow-2xs mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-lg bg-[#f7f6f3] border border-[#e3e2de] text-neutral-800 hover:bg-neutral-200 cursor-pointer transition-colors"
            title="展开侧边导航菜单"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-xs text-[#201f1d] truncate">
                {currentNavMeta.label}
              </span>
              {currentNavMeta.badge && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                  {currentNavMeta.badge.text}
                </span>
              )}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">黑曜石平台总控 · 侧边中枢</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onSelectRole && (
            <button
              type="button"
              onClick={() => onSelectRole('customer')}
              className="px-2 py-1 bg-[#201f1d] hover:bg-black text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
              title="返回前台顾客点餐"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-white" />
              <span>切回前台</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 rounded-lg bg-[#f7f6f3] border border-[#e3e2de] text-neutral-700 hover:bg-neutral-200 cursor-pointer"
            title={isFullscreen ? '退出全屏' : '全屏显示'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 主布局两栏容器 (Two-Column Sidebar Layout) */}
      <div className="flex flex-col lg:flex-row gap-3.5 items-start">
        {/* 左侧侧边菜单 (Desktop Sidebar) */}
        <aside
          className={`hidden lg:flex flex-col bg-white border border-[#e9e9e7] rounded-xl shadow-2xs transition-all duration-300 shrink-0 sticky top-3 max-h-[calc(100vh-28px)] overflow-hidden ${
            isSidebarCollapsed ? 'w-16 p-2' : 'w-64 xl:w-72 p-3'
          }`}
        >
          {/* Sidebar Header */}
          <div className="pb-2.5 border-b border-[#f1f1ef] flex items-center justify-between gap-1.5">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#2b593f] text-white flex items-center justify-center font-black shrink-0 shadow-2xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h2 className="text-xs font-black text-[#201f1d] truncate">黑曜石总控</h2>
                    <span className="text-[8.5px] font-mono font-bold px-1 py-0.2 rounded bg-[#eef4f0] text-[#2b593f] border border-[#d2e4d7]">
                      HUB
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono truncate">
                    ap-shanghai · 调度台
                  </div>
                </div>
              </div>
            )}

            {isSidebarCollapsed && (
              <div className="w-8 h-8 mx-auto rounded-lg bg-[#2b593f] text-white flex items-center justify-center font-black shadow-2xs">
                <Building2 className="w-4 h-4" />
              </div>
            )}

            <div className="flex items-center gap-1 shrink-0">
              {onSelectRole && !isSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => onSelectRole('customer')}
                  className="px-2 py-1 bg-[#201f1d] hover:bg-black text-white rounded-[4px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                  title="返回前台顾客点餐"
                >
                  <ArrowLeft className="w-3 h-3 text-white" />
                  <span>切回前台</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-[#f7f6f3] border border-transparent hover:border-[#e3e2de] cursor-pointer transition-colors"
                title={isSidebarCollapsed ? '展开侧边菜单' : '折叠为极简图标侧边栏'}
              >
                {isSidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Search Filter (when expanded) */}
          {!isSidebarCollapsed && (
            <div className="pt-2 pb-1">
              <div className="relative">
                <Search className="w-3 h-3 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索功能模块..."
                  value={sidebarFilterQuery}
                  onChange={(e) => setSidebarFilterQuery(e.target.value)}
                  className="w-full pl-7 pr-7 py-1.5 text-[11px] bg-[#f7f6f3] border border-[#e3e2de] rounded-lg text-[#201f1d] focus:outline-none focus:border-black font-medium"
                />
                {sidebarFilterQuery && (
                  <button
                    type="button"
                    onClick={() => setSidebarFilterQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Navigation Items (Grouped Vertical List) */}
          <div className="flex-1 overflow-y-auto py-2 space-y-3 no-scrollbar">
            {groupedNavItems.map((group) => (
              <div key={group.groupKey} className="space-y-1">
                {!isSidebarCollapsed && (
                  <div className="px-2 pt-1 pb-0.5 text-[9.5px] font-bold font-mono tracking-wider text-neutral-400 uppercase">
                    {group.groupTitle}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center rounded-lg text-xs font-semibold transition-all cursor-pointer select-none ${
                          isSidebarCollapsed ? 'justify-center p-2.5' : 'px-2.5 py-2 justify-between gap-2'
                        } ${
                          isActive
                            ? 'bg-[#1a1a17] text-white shadow-2xs font-bold'
                            : 'text-[#5a5850] hover:bg-[#f7f6f3] hover:text-[#1a1a17]'
                        }`}
                        title={isSidebarCollapsed ? `${item.label} (${item.enLabel})` : undefined}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <IconComp
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-emerald-400' : 'text-neutral-500'
                            }`}
                          />
                          {!isSidebarCollapsed && (
                            <span className="truncate text-[11.5px] tracking-tight">{item.label}</span>
                          )}
                        </div>

                        {!isSidebarCollapsed && item.badge && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : item.badge.type === 'live'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.badge.type === 'alert'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-[#e8e7e3] text-neutral-700'
                            }`}
                          >
                            {item.badge.text}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer: Metrics & Status */}
          <div className="pt-2.5 border-t border-[#f1f1ef] space-y-2 shrink-0">
            {!isSidebarCollapsed && (
              <div className="bg-[#f7f6f3] p-2 rounded-lg border border-[#e3e2de] text-[10px] space-y-1">
                <div className="flex justify-between items-center text-neutral-500">
                  <span>在营餐车:</span>
                  <span className="font-mono font-bold text-neutral-800">{merchants.length} 辆</span>
                </div>
                <div className="flex justify-between items-center text-neutral-500">
                  <span>平台抽佣:</span>
                  <span className="font-mono font-bold text-[#2b593f]">¥{financeSummary.totalPlatformCommission.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-500">
                  <span>平均 SLA:</span>
                  <span className="font-mono font-bold text-neutral-800">{formatSlaDuration(slaSummary.avgResponseTimeSec)}</span>
                </div>
              </div>
            )}

            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} gap-1.5`}>
              <div className={`flex items-center gap-1.5 text-[10px] text-neutral-500 ${isSidebarCollapsed ? 'hidden' : 'flex'}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate">腾讯云上海节点 正常</span>
              </div>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  isFullscreen
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-white hover:bg-[#f7f6f3] text-neutral-700 border-[#d3d1cb]'
                }`}
                title={isFullscreen ? '退出全屏' : '全屏显示'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                {!isSidebarCollapsed && <span className="text-[11px]">{isFullscreen ? '退出' : '全屏'}</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* 移动端侧边菜单抽屉 (Mobile Drawer) */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileSidebarOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="absolute left-0 top-0 bottom-0 w-72 bg-white p-4 flex flex-col shadow-2xl z-10"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#f1f1ef]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#2b593f] text-white flex items-center justify-center font-black">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-neutral-900">黑曜石平台总控</h3>
                      <p className="text-[10px] text-neutral-400 font-mono">Platform Master Hub</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-[#f7f6f3]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-3 space-y-3">
                  {groupedNavItems.map((group) => (
                    <div key={group.groupKey} className="space-y-1">
                      <div className="text-[10px] font-bold font-mono text-neutral-400 uppercase px-2">
                        {group.groupTitle}
                      </div>
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const isActive = activeTab === item.id;
                          const IconComp = item.icon;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setActiveTab(item.id);
                                setMobileSidebarOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                isActive
                                  ? 'bg-[#1a1a17] text-white shadow-2xs font-bold'
                                  : 'text-neutral-700 hover:bg-[#f7f6f3]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <IconComp className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-neutral-500'}`} />
                                <span className="text-[12px]">{item.label}</span>
                              </div>
                              {item.badge && (
                                <span
                                  className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-700'
                                  }`}
                                >
                                  {item.badge.text}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#f1f1ef]">
                  <div className="text-[11px] text-neutral-500 flex justify-between items-center mb-2">
                    <span>全网在营餐车: {merchants.length} 辆</span>
                    <span className="text-emerald-700 font-bold">¥{financeSummary.totalPlatformCommission.toFixed(1)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleFullscreen();
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full py-2 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-bold text-center"
                  >
                    {isFullscreen ? '退出全屏模式' : '进入全屏大屏模式'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 右侧主工作区 (Right Content Area) */}
        <main className="flex-1 min-w-0 w-full space-y-3.5">
          {/* 顶部紧凑面包屑导航与状态指示条 */}
          <div className="bg-white border border-[#e9e9e7] rounded-xl px-3.5 py-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#f7f6f3] text-neutral-800 border border-[#e3e2de] flex items-center justify-center shrink-0">
                {React.createElement(currentNavMeta.icon, { className: 'w-4 h-4 text-emerald-700' })}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-[#201f1d]">{currentNavMeta.label}</span>
                  <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                    {currentNavMeta.enLabel}
                  </span>
                  {currentNavMeta.badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      {currentNavMeta.badge.text}
                    </span>
                  )}
                </div>
                <div className="text-[10.5px] text-neutral-500 line-clamp-1">
                  {currentNavMeta.description}
                </div>
              </div>
            </div>

            {/* Quick module stats */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <div className="text-[11px] text-neutral-500 font-mono hidden md:flex items-center gap-2 bg-[#f7f6f3] px-2.5 py-1 rounded-md border border-[#e3e2de]">
                <span>商户: <b className="text-neutral-900">{merchants.length}</b></span>
                <span className="text-neutral-300">|</span>
                <span>抽佣: <b className="text-[#2b593f]">¥{financeSummary.totalPlatformCommission.toFixed(0)}</b></span>
                <span className="text-neutral-300">|</span>
                <span>SLA: <b className="text-neutral-900">{formatSlaDuration(slaSummary.avgResponseTimeSec)}</b></span>
              </div>
            </div>
          </div>

      {/* Tab -1: 数字孪生指挥大屏 */}
      {activeTab === 'digital_twin' && (
        <DigitalTwinCommandCockpit
          orders={orders}
          showToast={showToast}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      {/* Tab: 数据沙箱分层治理与全链路时空溯源面板 */}
      {activeTab === 'data_sandbox' && (
        <DataSandboxGovernancePanel showToast={showToast} />
      )}

      {/* Tab: 总部分级权限、组件功能授权与状态分层分流中枢 */}
      {activeTab === 'permission_flow' && (
        <HeadquartersPermissionAndFlowMatrix showToast={showToast} />
      )}

      {/* Tab: 用户数据统一档案分层表单 */}
      {activeTab === 'user_dossier' && (
        <UserDossierManager showToast={showToast} />
      )}

      {/* Tab: 云服务数据分层仓库 */}
      {activeTab === 'cloud_pipeline' && (
        <CloudServiceTieringPipeline showToast={showToast} />
      )}

      {/* Tab -2: 加盟商违规脱圈与品控合规雷达 */}
      {activeTab === 'compliance_radar' && (
        <FranchiseComplianceRadar showToast={showToast} />
      )}

      {/* Tab -3: 全域动态运价与突发应急熔断器 */}
      {activeTab === 'surge_emergency' && (
        <SurgePricingAndKillSwitch showToast={showToast} />
      )}

      {/* Tab 0: 餐车全域矩阵与转单调度 */}
      {activeTab === 'truck_matrix' && (
        <div className="space-y-4">
          {/* Top Status & Metrics Grid for all Trucks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {getAllTruckConfigs().map((truckConfig) => {
              const truckOrders = orders.filter((o) => {
                if (o.truckId) return o.truckId === truckConfig.id;
                if (truckConfig.id === 'truck-01') return !o.truckName || o.truckName.includes('01') || o.truckName.includes('南广场');
                if (truckConfig.id === 'truck-02') return o.truckName?.includes('02') || o.truckName?.includes('科技园');
                if (truckConfig.id === 'truck-03') return o.truckName?.includes('03') || o.truckName?.includes('滨江');
                return false;
              });

              const cookingOrders = truckOrders.filter((o) => o.status === 'pending' || o.status === 'ready' || o.status === 'cooking');
              const deliveringOrders = truckOrders.filter((o) => o.status === 'delivering');
              const completedOrders = truckOrders.filter((o) => o.status === 'completed');
              const totalRevenue = truckOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
              
              // Load percentage
              const loadPercent = Math.min(100, Math.round((cookingOrders.length / 5) * 100));
              const loadColor = loadPercent > 70 ? 'text-rose-600 bg-rose-50 border-rose-200' : loadPercent > 40 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200';

              return (
                <div
                  key={truckConfig.id}
                  className="bg-white rounded-xl border border-[#e9e9e7] p-3.5 space-y-3 shadow-2xs hover:border-neutral-400 transition-all relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#006d36] flex items-center justify-center font-black">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm text-[#201f1d]">{truckConfig.name}</h3>
                        <span className="text-[10px] text-neutral-500 font-mono">ID: {truckConfig.id} · {truckConfig.locationName}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${loadColor}`}>
                      负载 {loadPercent}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 bg-[#fbfbfa] p-2 rounded-lg border border-neutral-100 text-center">
                    <div>
                      <span className="text-[10px] text-neutral-500 block">在烹/待做</span>
                      <span className="font-mono font-black text-sm text-neutral-900">{cookingOrders.length} 单</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block">配送中</span>
                      <span className="font-mono font-black text-sm text-blue-600">{deliveringOrders.length} 单</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block">今日营业额</span>
                      <span className="font-black text-sm text-[#006d36]">¥{totalRevenue.toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-neutral-600 flex items-center justify-between border-t border-neutral-100 pt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      <span>覆盖半径: {truckConfig.deliveryRadiusKm} km</span>
                    </span>
                    <span className="text-emerald-700 font-bold">
                      SLA达标率 99.2%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Orders Dispatch & Emergency Transfer Table */}
          <div className="bg-white rounded-xl border border-[#e9e9e7] p-3 sm:p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-black text-xs sm:text-sm text-[#201f1d] flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                  <span>跨餐车在单调度与应急调拨中心</span>
                </h3>
                <p className="text-[11px] text-neutral-500">
                  当某辆餐车后厨爆单超负荷或临时检修时，平台总控可一键将未完成订单改派至临近餐车协同备餐
                </p>
              </div>
              <span className="text-[11px] font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
                活跃待制/在单: {orders.filter((o) => o.status === 'pending' || o.status === 'ready' || o.status === 'delivering').length} 笔
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fbfbfa] border-b border-[#e9e9e7] text-[#787774] font-medium">
                    <th className="py-2.5 px-3">订单号 / 顾客</th>
                    <th className="py-2.5 px-3">当前所属餐车</th>
                    <th className="py-2.5 px-3">餐品内容</th>
                    <th className="py-2.5 px-3">金额</th>
                    <th className="py-2.5 px-3">当前状态</th>
                    <th className="py-2.5 px-3 text-right">跨车调度操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1ef]">
                  {orders.filter((o) => o.status === 'pending' || o.status === 'ready' || o.status === 'delivering').map((order, idx) => {
                    const currentTruckName = order.truckName || (order.truckId === 'truck-02' ? '02号·科技园分舵' : order.truckId === 'truck-03' ? '03号·滨江潮玩站' : '01号·大悦城旗舰车');
                    return (
                      <tr key={`dispatch-${order.id || order.orderNo || idx}-${idx}`} className="hover:bg-[#f7f6f3] transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-neutral-900">{order.orderNo}</div>
                          <div className="text-[10.5px] text-neutral-500">{order.customerName} ({order.userPhone || (order as any).customerPhone || '138****8899'})</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                            <Truck className="w-3 h-3 text-emerald-600" />
                            {currentTruckName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px] truncate text-neutral-700">
                          {order.items.map((i) => `${i.name}×${i.quantity}`).join(', ')}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">
                          ¥{(order.totalAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {order.status === 'pending' ? '待出餐' : order.status === 'ready' ? '已出餐待取' : order.status === 'delivering' ? '骑手配送中' : '处理中'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setTransferOrder(order);
                              const other = getAllTruckConfigs().find((t) => t.id !== order.truckId);
                              if (other) setTargetTruckId(other.id);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 hover:border-emerald-500 rounded text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>改派至其他餐车</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Truck Transfer Modal */}
      {transferOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 space-y-4 border border-[#e9e9e7] shadow-xl text-[#37352f]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f1ef]">
              <div className="flex items-center gap-1.5 font-bold text-sm text-[#201f1d]">
                <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                <span>跨餐车应急转单调度</span>
              </div>
              <button
                type="button"
                onClick={() => setTransferOrder(null)}
                className="p-1 rounded-md text-[#787774] hover:bg-[#f1f1ef] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                <div className="flex justify-between text-neutral-600">
                  <span>订单编号:</span>
                  <span className="font-mono font-bold text-neutral-900">{transferOrder.orderNo}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>当前归属餐车:</span>
                  <span className="font-bold text-rose-700">{transferOrder.truckName || '01号·大悦城旗舰车'}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>顾客送达地址:</span>
                  <span className="text-neutral-800 truncate max-w-[200px]">{transferOrder.deliveryAddress || (transferOrder as any).address || '上海市静安区西藏北路166号'}</span>
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">选择目标接单餐车:</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {getAllTruckConfigs().map((t) => {
                    const isSelected = targetTruckId === t.id;
                    const isCurrent = transferOrder.truckId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => !isCurrent && setTargetTruckId(t.id)}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                          isCurrent
                            ? 'bg-neutral-100 border-neutral-200 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                            : 'bg-white border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs">{t.name}</div>
                          <div className="text-[10px] text-neutral-500">{t.locationName}</div>
                        </div>
                        {isCurrent ? (
                          <span className="text-[10px] text-neutral-400">原出餐车</span>
                        ) : isSelected ? (
                          <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">选中</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-medium mb-1">调度调拨原因备注:</label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setTransferOrder(null)}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-lg cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleExecuteTransfer}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer shadow-xs"
                >
                  确认改派调拨
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: 商户档案与费率管理 */}
      {activeTab === 'merchants' && (
        <div className="space-y-3">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-[#e9e9e7] shadow-2xs">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#9b9a97] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索餐车名称、主理人、ID..."
                  value={merchantSearchQuery}
                  onChange={(e) => setMerchantSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#f7f6f3] border border-[#e3e2de] rounded-lg text-[#37352f] placeholder-[#9b9a97] focus:outline-none focus:border-[#2b593f]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddMerchantOpen(true)}
                className="w-full sm:w-auto px-3.5 py-1.5 bg-[#2b593f] text-white text-xs font-bold rounded-lg hover:bg-[#224732] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>录入新餐车商户</span>
              </button>
            </div>
          </div>

          {/* 1. Mobile Cards View (Hidden on md and up) */}
          <div className="block md:hidden space-y-2.5">
            {filteredMerchants.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-[#e9e9e7] text-center text-xs text-[#9b9a97]">
                暂无匹配的餐车商户档案
              </div>
            ) : (
              filteredMerchants.map((m) => (
                <div
                  key={m.truckId}
                  className="bg-white p-3.5 rounded-xl border border-[#e9e9e7] shadow-2xs space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs sm:text-sm text-[#201f1d]">{m.truckName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#f7f6f3] text-[#787774] border border-[#e3e2de]">
                          {m.truckId}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#787774] mt-0.5 flex items-center gap-1">
                        <span>{m.category}</span>
                        <span>·</span>
                        <span>{m.contactPerson} ({m.contactPhone})</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(m.truckId)}
                      className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border shrink-0 transition-all cursor-pointer ${
                        m.status === 'active'
                          ? 'bg-emerald-50/80 text-emerald-700 border-emerald-400'
                          : 'bg-rose-50/80 text-rose-700 border-rose-400'
                      }`}
                    >
                      {m.status === 'active' ? '正常营业' : '已暂停'}
                    </button>
                  </div>

                  {/* 3-Col Rate Metrics Matrix */}
                  <div className="grid grid-cols-3 gap-1.5 bg-[#f7f6f3] p-2 rounded-lg border border-[#e3e2de] text-center">
                    <div className="flex flex-col items-center justify-center p-1">
                      <div className="text-[9.5px] text-[#787774] font-medium">独立抽佣率</div>
                      <div className="font-mono font-black text-sm text-[#2b593f] mt-0.5">
                        {m.platformRatePercent.toFixed(1)}%
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => handleQuickRateAdjust(m.truckId, -0.5)}
                          className="w-5 h-5 rounded bg-white border border-[#e3e2de] text-[#37352f] flex items-center justify-center font-bold text-xs shadow-2xs active:scale-95"
                          title="下调 0.5%"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickRateAdjust(m.truckId, 0.5)}
                          className="w-5 h-5 rounded bg-white border border-[#e3e2de] text-[#37352f] flex items-center justify-center font-bold text-xs shadow-2xs active:scale-95"
                          title="上调 0.5%"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-1 border-x border-[#e3e2de]">
                      <div className="text-[9.5px] text-[#787774] font-medium">技术服务费</div>
                      <div className="font-mono font-bold text-xs sm:text-sm text-[#37352f] mt-0.5">
                        ¥{m.fixedServiceFee.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-[#787774] mt-1.5">每单固定</div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-1">
                      <div className="text-[9.5px] text-[#787774] font-medium">骑手配送分成</div>
                      <div className="font-mono font-bold text-xs sm:text-sm text-[#8f6b00] mt-0.5">
                        {m.riderDeliverySharePercent}%
                      </div>
                      <div className="text-[9px] text-[#787774] mt-1.5">
                        {m.settlementCycle === 'realtime' ? '即时结算' : '每日T+1'}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#f1f1ef]">
                    <button
                      type="button"
                      onClick={() => setEditingMerchant(m)}
                      className="px-3 py-1 rounded-md bg-[#f7f6f3] border border-[#e3e2de] text-[#37352f] hover:bg-[#f1f1ef] text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3 text-[#2b593f]" />
                      <span>编辑详细费率与结算周期</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 2. Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block bg-white border border-[#e9e9e7] rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fbfbfa] border-b border-[#e9e9e7] text-[#787774] font-medium">
                    <th className="py-2.5 px-3">餐车商户</th>
                    <th className="py-2.5 px-3">品类</th>
                    <th className="py-2.5 px-3">抽佣费率 (%)</th>
                    <th className="py-2.5 px-3">固定技术费</th>
                    <th className="py-2.5 px-3">骑手配送分成</th>
                    <th className="py-2.5 px-3">结算周期</th>
                    <th className="py-2.5 px-3">状态</th>
                    <th className="py-2.5 px-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1ef]">
                  {filteredMerchants.map((m) => (
                    <tr key={m.truckId} className="hover:bg-[#f7f6f3] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#201f1d]">{m.truckName}</div>
                        <div className="text-[11px] text-[#787774] font-mono">
                          ID: {m.truckId} · 联系人: {m.contactPerson} ({m.contactPhone})
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#787774]">{m.category}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-sm text-[#2b593f]">
                            {m.platformRatePercent.toFixed(1)}%
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleQuickRateAdjust(m.truckId, -0.5)}
                              className="w-5 h-5 rounded-[2px] bg-[#f1f1ef] hover:bg-[#e3e2de] text-[#37352f] flex items-center justify-center font-bold text-[10px] cursor-pointer"
                              title="下调 0.5%"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickRateAdjust(m.truckId, 0.5)}
                              className="w-5 h-5 rounded-[2px] bg-[#f1f1ef] hover:bg-[#e3e2de] text-[#37352f] flex items-center justify-center font-bold text-[10px] cursor-pointer"
                              title="上调 0.5%"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#37352f]">¥{m.fixedServiceFee.toFixed(2)} / 单</td>
                      <td className="py-2.5 px-3 font-mono text-[#8f6b00]">{m.riderDeliverySharePercent}%</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded-[2px] bg-[#f7f6f3] border border-[#e3e2de] text-[11px] text-[#787774]">
                          {m.settlementCycle === 'realtime' ? '即时结算' : m.settlementCycle === 'daily' ? '每日T+1' : '每周'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(m.truckId)}
                          className={`px-2 py-0.5 rounded-[2px] text-[11px] font-semibold border cursor-pointer ${
                            m.status === 'active'
                              ? 'bg-[#eef4f0] text-[#2b593f] border-[#d2e4d7]'
                              : 'bg-[#fbe4e4] text-[#9f2b2b] border-[#f5c6c6]'
                          }`}
                        >
                          {m.status === 'active' ? '正常营业' : '已暂停'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingMerchant(m)}
                          className="px-2.5 py-1 rounded-[3px] bg-[#f7f6f3] border border-[#e3e2de] text-[#37352f] hover:bg-[#f1f1ef] text-xs font-semibold cursor-pointer"
                        >
                          编辑费率
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 抽佣分账引擎与仿真测算 */}
      {activeTab === 'commission' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          {/* Global Commission Settings */}
          <div className="lg:col-span-1 bg-white p-3.5 sm:p-4 rounded-xl border border-[#e9e9e7] shadow-2xs space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-[#f1f1ef]">
              <Percent className="w-4 h-4 text-[#2b593f]" />
              <h3 className="text-xs sm:text-sm font-bold text-[#201f1d]">平台全局默认抽佣规则</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#787774] mb-1 font-medium">默认抽佣费率 (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="30"
                    value={globalSettings.defaultPlatformRatePercent}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, defaultPlatformRatePercent: Number(e.target.value) })}
                    className="flex-1 px-2.5 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] rounded-lg font-mono text-sm font-bold text-[#37352f]"
                  />
                  <span className="font-mono text-[#787774] font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">固定单笔技术服务费 (元)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={globalSettings.defaultFixedServiceFee}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, defaultFixedServiceFee: Number(e.target.value) })}
                    className="flex-1 px-2.5 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] rounded-lg font-mono text-sm font-bold text-[#37352f]"
                  />
                  <span className="font-mono text-[#787774]">元/单</span>
                </div>
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">骑手配送赏金分成占比 (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="50"
                    max="100"
                    value={globalSettings.defaultRiderSharePercent}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, defaultRiderSharePercent: Number(e.target.value) })}
                    className="flex-1 px-2.5 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] rounded-lg font-mono text-sm font-bold text-[#37352f]"
                  />
                  <span className="font-mono text-[#787774] font-bold">%</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveGlobalSettings}
                  className="w-full py-2 bg-[#2b593f] text-white text-xs font-bold rounded-lg hover:bg-[#224732] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>保存并应用全局费率</span>
                </button>
              </div>
            </div>
          </div>

          {/* Revenue Split Simulator */}
          <div className="lg:col-span-2 bg-white p-3.5 sm:p-4 rounded-xl border border-[#e9e9e7] shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f1ef]">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#d97706]" />
                <h3 className="text-xs sm:text-sm font-bold text-[#201f1d]">每单抽佣与分账实时仿真测算器</h3>
              </div>
              <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-[#fbf3db] text-[#8f6b00] border border-[#f5e6b3]">
                DYNAMIC SPLIT ENGINE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[#787774] mb-1 font-medium">选择测算餐车商户</label>
                <select
                  value={simulatedSelectedTruckId}
                  onChange={(e) => setSimulatedSelectedTruckId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] rounded-lg text-xs font-bold text-[#37352f]"
                >
                  {merchants.map((m) => (
                    <option key={m.truckId} value={m.truckId}>
                      {m.truckName} (抽佣率 {m.platformRatePercent}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">输入模拟订单实付金额 (元)</label>
                <input
                  type="number"
                  step="1"
                  min="10"
                  max="1000"
                  value={simulatedAmount}
                  onChange={(e) => setSimulatedAmount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] rounded-lg font-mono font-black text-sm text-[#201f1d]"
                />
              </div>
            </div>

            {/* Split Output Cards (Responsive Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-1">
              <div className="p-3 rounded-lg bg-[#eef4f0] border border-[#d2e4d7] text-center">
                <div className="text-[11px] text-[#2b593f] font-bold">商户实际应得货款</div>
                <div className="text-base sm:text-xl font-mono font-black text-[#2b593f] mt-1">
                  ¥{simulationResult.merchantNetPayout.toFixed(2)}
                </div>
                <div className="text-[10px] text-[#2b593f]/80 mt-0.5">占比 {((simulationResult.merchantNetPayout / (simulationResult.totalAmount || 1)) * 100).toFixed(1)}%</div>
              </div>

              <div className="p-3 rounded-lg bg-[#fbf3db] border border-[#f5e6b3] text-center">
                <div className="text-[11px] text-[#8f6b00] font-bold">骑手专送赏金酬劳</div>
                <div className="text-base sm:text-xl font-mono font-black text-[#8f6b00] mt-1">
                  ¥{simulationResult.riderDeliveryFee.toFixed(2)}
                </div>
                <div className="text-[10px] text-[#8f6b00]/80 mt-0.5">专送补贴已发放</div>
              </div>

              <div className="p-3 rounded-lg bg-[#f7f6f3] border border-[#e3e2de] text-center">
                <div className="text-[11px] text-[#787774] font-bold">平台净抽佣收入</div>
                <div className="text-base sm:text-xl font-mono font-black text-[#201f1d] mt-1">
                  ¥{simulationResult.platformCommission.toFixed(2)}
                </div>
                <div className="text-[10px] text-[#787774] mt-0.5">含服务费 ¥{simulationResult.fixedFeeUsed.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: 全网三端联络聚合总成与 SLA 监控 (Directly embeds OmniAggregatedChatHub) */}
      {activeTab === 'sla_monitor' && (
        <div className="space-y-3.5">
          <OmniAggregatedChatHub
            orders={orders}
            viewerRole="platform"
            showToast={showToast}
          />
        </div>
      )}

      {/* Tab 4: 财务分账与结算明细 */}
      {activeTab === 'finance' && (
        <div className="space-y-3">
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#e9e9e7] shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#f1f1ef]">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#201f1d]">每单分账对账与清算流转日志</h3>
                <p className="text-[11px] sm:text-xs text-[#787774] mt-0.5">实时记录每一笔订单的商户净入、骑手赏金与平台佣金划扣明细</p>
              </div>
              <button
                type="button"
                onClick={handleExportFinanceCsv}
                className="w-full sm:w-auto px-3 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] text-[#37352f] text-xs font-bold rounded-lg hover:bg-[#f1f1ef] flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#2b593f]" />
                <span>导出结算账单</span>
              </button>
            </div>

            {/* Mobile Finance Cards */}
            <div className="block md:hidden space-y-2.5 mt-3">
              {orders.map((ord, idx) => {
                const matchedMerchant = merchants.find((m) => m.truckName === ord.truckName) || merchants[0];
                const split = calculateOrderCommissionSplit(ord, matchedMerchant);

                return (
                  <div key={`fin-card-${ord.id || ord.orderNo || idx}-${idx}`} className="p-3 rounded-lg bg-[#fbfbfa] border border-[#e9e9e7] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-[#201f1d]">{ord.orderNo}</span>
                      <span className="px-1.5 py-0.2 rounded bg-[#eef4f0] text-[#2b593f] border border-[#d2e4d7] text-[10px] font-bold">
                        已自动清算
                      </span>
                    </div>

                    <div className="text-[11px] text-[#787774]">
                      餐车: <strong className="text-[#37352f]">{ord.truckName}</strong>
                    </div>

                    <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-[#f1f1ef] text-center text-[10px]">
                      <div>
                        <div className="text-[#787774]">食客实付</div>
                        <div className="font-bold text-[#201f1d] mt-0.5">¥{ord.totalAmount.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[#2b593f] font-medium">商户应结</div>
                        <div className="font-bold text-[#2b593f] mt-0.5">¥{split.merchantNetPayout.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[#8f6b00] font-medium">骑手酬劳</div>
                        <div className="font-bold text-[#8f6b00] mt-0.5">¥{split.riderDeliveryFee.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[#787774]">平台佣金</div>
                        <div className="font-bold text-[#201f1d] mt-0.5">¥{split.platformCommission.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Finance Table */}
            <div className="hidden md:block overflow-x-auto mt-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#fbfbfa] border-b border-[#e9e9e7] text-[#787774] font-medium">
                    <th className="py-2.5 px-3">订单号</th>
                    <th className="py-2.5 px-3">商户餐车</th>
                    <th className="py-2.5 px-3">食客实付</th>
                    <th className="py-2.5 px-3">商户应结</th>
                    <th className="py-2.5 px-3">骑手酬劳</th>
                    <th className="py-2.5 px-3">平台佣金</th>
                    <th className="py-2.5 px-3">结算状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1ef]">
                  {orders.map((ord, idx) => {
                    const matchedMerchant = merchants.find((m) => m.truckName === ord.truckName) || merchants[0];
                    const split = calculateOrderCommissionSplit(ord, matchedMerchant);

                    return (
                      <tr key={`fin-row-${ord.id || ord.orderNo || idx}-${idx}`} className="hover:bg-[#f7f6f3] transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#201f1d]">{ord.orderNo}</td>
                        <td className="py-2.5 px-3 text-[#37352f]">{ord.truckName}</td>
                        <td className="py-2.5 px-3 font-bold text-[#201f1d]">¥{ord.totalAmount.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#2b593f]">¥{split.merchantNetPayout.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#8f6b00]">¥{split.riderDeliveryFee.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#201f1d]">¥{split.platformCommission.toFixed(2)}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-[#eef4f0] text-[#2b593f] border border-[#d2e4d7] text-[11px]">
                            已自动清算
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: 风控异常与仲裁 */}
      {activeTab === 'arbitration' && (
        <div className="space-y-3">
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#e9e9e7] shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#f1f1ef]">
              <ShieldCheck className="w-4 h-4 text-[#2b593f]" />
              <h3 className="text-xs sm:text-sm font-bold text-[#201f1d]">争议仲裁与极速先行赔付中心</h3>
            </div>

            <p className="text-[11px] sm:text-xs text-[#787774]">
              对发生严重超时配送、出餐失误或退款分歧的订单，平台仲裁员可一键介入，核发极速关怀代金券或执行强制划扣仲裁。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {orders.slice(0, 4).map((ord, idx) => (
                <div key={`arbitration-${ord.id || ord.orderNo || idx}-${idx}`} className="p-3 rounded-lg bg-[#fbfbfa] border border-[#e9e9e7] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div>
                    <div className="font-mono font-bold text-[#201f1d]">{ord.orderNo} · {ord.truckName}</div>
                    <div className="text-[11px] text-[#787774] mt-0.5">食客: {ord.customerName} · 金额: ¥{ord.totalAmount.toFixed(2)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sendOrderChatMessage(ord.orderNo, {
                        senderRole: 'platform',
                        senderName: '平台客服仲裁员 (工号 9001)',
                        type: 'platform_arbitration',
                        text: '💰 【极速先行赔付凭证】经平台核验，已为食客发放 ¥15.00 无门槛餐车关怀代金券，即时充入账户。'
                      });
                      showToast(`已对订单 ${ord.orderNo} 执行极速先行赔付 ¥15.00`);
                    }}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-[#2b593f] text-white text-xs font-bold hover:bg-[#224732] cursor-pointer shadow-2xs transition-colors text-center"
                  >
                    先行赔付¥15
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
        </main>
      </div>

      {/* Edit Merchant Modal */}
      {editingMerchant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 space-y-4 border border-[#e9e9e7] shadow-xl text-[#37352f] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f1ef]">
              <h3 className="text-xs sm:text-sm font-bold text-[#201f1d]">编辑商户抽佣费率: {editingMerchant.truckName}</h3>
              <button
                type="button"
                onClick={() => setEditingMerchant(null)}
                className="p-1 rounded-md text-[#787774] hover:bg-[#f1f1ef] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#787774] mb-1 font-medium">独立抽佣费率 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingMerchant.platformRatePercent}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, platformRatePercent: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] rounded-lg font-mono text-sm font-bold text-[#201f1d]"
                />
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">固定单笔服务费 (元)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingMerchant.fixedServiceFee}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, fixedServiceFee: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] rounded-lg font-mono text-sm font-bold text-[#201f1d]"
                />
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">结算周期</label>
                <select
                  value={editingMerchant.settlementCycle}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, settlementCycle: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] rounded-lg text-xs font-bold text-[#201f1d]"
                >
                  <option value="realtime">实时分账即时到账</option>
                  <option value="daily">每日T+1自动结算</option>
                  <option value="weekly">每周一集中清算</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMerchant(null)}
                  className="px-3.5 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] text-[#787774] text-xs font-bold rounded-lg cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveMerchantEdit}
                  className="px-3.5 py-1.5 bg-[#2b593f] text-white text-xs font-bold rounded-lg hover:bg-[#224732] cursor-pointer shadow-2xs"
                >
                  保存费率配置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Merchant Modal */}
      {isAddMerchantOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 space-y-4 border border-[#e9e9e7] shadow-xl text-[#37352f] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f1ef]">
              <h3 className="text-xs sm:text-sm font-bold text-[#201f1d]">录入新餐车商户档案</h3>
              <button
                type="button"
                onClick={() => setIsAddMerchantOpen(false)}
                className="p-1 rounded-md text-[#787774] hover:bg-[#f1f1ef] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#787774] mb-1 font-medium">餐车商户全称</label>
                <input
                  type="text"
                  placeholder="例如: 黑曜石 04 号流动炭烤餐车"
                  value={newMerchantData.truckName}
                  onChange={(e) => setNewMerchantData({ ...newMerchantData, truckName: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] rounded-lg text-xs font-bold text-[#201f1d]"
                />
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">美食主营品类</label>
                <input
                  type="text"
                  placeholder="例如: 现烤和牛汉堡 & 鲜酿饮品"
                  value={newMerchantData.category}
                  onChange={(e) => setNewMerchantData({ ...newMerchantData, category: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] rounded-lg text-xs text-[#201f1d]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#787774] mb-1 font-medium">抽佣费率 (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMerchantData.platformRatePercent}
                    onChange={(e) => setNewMerchantData({ ...newMerchantData, platformRatePercent: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] rounded-lg font-mono text-xs font-bold text-[#201f1d]"
                  />
                </div>
                <div>
                  <label className="block text-[#787774] mb-1 font-medium">联系人</label>
                  <input
                    type="text"
                    placeholder="主理人姓名"
                    value={newMerchantData.contactPerson}
                    onChange={(e) => setNewMerchantData({ ...newMerchantData, contactPerson: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] rounded-lg text-xs text-[#201f1d]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMerchantOpen(false)}
                  className="px-3.5 py-1.5 bg-[#f7f6f3] border border-[#e3e2de] text-[#787774] text-xs font-bold rounded-lg cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewMerchant}
                  className="px-3.5 py-1.5 bg-[#2b593f] text-white text-xs font-bold rounded-lg hover:bg-[#224732] cursor-pointer shadow-2xs"
                >
                  确认入驻录入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 全屏状态悬浮退出按钮 */}
      {isFullscreen && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#201f1d]/90 backdrop-blur text-white px-3.5 py-2 rounded-full shadow-2xl border border-white/20 text-xs select-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium">平台总控台 · 全屏显示模式</span>
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="ml-2 px-2.5 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold cursor-pointer transition-colors"
          >
            退出全屏 (ESC)
          </button>
        </div>
      )}
    </div>
  );
};
