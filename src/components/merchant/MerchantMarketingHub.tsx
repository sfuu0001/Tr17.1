import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Percent,
  ShieldCheck,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Flame,
  Sparkles,
  Sliders,
  DollarSign,
  ShieldAlert,
  Info,
  Ticket,
  Bike,
  HelpCircle,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  Layers,
  ArrowRight,
  Send,
  Zap,
  Shuffle,
  Users,
  Award,
  Scan
} from 'lucide-react';
import {
  PaymentDiscountRule,
  ActivityPromoRule,
  ActivityDiscountTier,
  AntiAbuseConfig,
  PromotionStackingSettings,
  DEFAULT_PAYMENT_RULES,
  DEFAULT_ACTIVITY_RULES,
  DEFAULT_ANTI_ABUSE_CONFIG,
  DEFAULT_STACKING_SETTINGS,
  getStoredStackingSettings,
  saveStoredStackingSettings,
  getStoredActivityRules,
  saveStoredActivityRules,
  calculateOrderDiscounts
} from '../../utils/promotionEngine';
import {
  DeliverySettings,
  DEFAULT_DELIVERY_SETTINGS,
  getDeliverySettings,
  saveDeliverySettings,
  DELIVERY_SETTINGS_EVENT
} from '../../utils/deliverySettings';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { mergeLocalPrefs, fetchPrefsFromCloud } from '../../utils/workspacePreferences';
import { MerchantCouponsView } from './MerchantCouponsView';
import { QrAndScannerDiagnosticView } from './QrAndScannerDiagnosticView';

interface MerchantMarketingHubProps {
  showToast: (msg: string) => void;
}

export const MerchantMarketingHub: React.FC<MerchantMarketingHubProps> = ({ showToast }) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'coupons' | 'activity' | 'stacking_matrix' | 'payment' | 'delivery_threshold' | 'anti_abuse' | 'qr_diagnostics'
  >(() => {
    return safeGetStorage('obsidian_merchant_marketing_subtab', 'coupons');
  });

  const handleSelectSubTab = (tab: typeof activeSubTab) => {
    setActiveSubTab(tab);
    safeSetStorage('obsidian_merchant_marketing_subtab', tab);
    // v3 偏好云端绑定：子页签记忆双写
    try { mergeLocalPrefs({ marketingSubTab: tab }); } catch { /* 云同步失败不影响本地 */ }
  };

  // v3 自愈：本地子页签键缺失而云端有值时回写
  useEffect(() => {
    try {
      if (localStorage.getItem('obsidian_merchant_marketing_subtab')) return;
      fetchPrefsFromCloud().then((cloud) => {
        if (cloud?.marketingSubTab) {
          safeSetStorage('obsidian_merchant_marketing_subtab', cloud.marketingSubTab);
          setActiveSubTab(cloud.marketingSubTab as typeof activeSubTab);
        }
      });
    } catch { /* 自愈失败静默降级 */ }
  }, []);

  // 1. Payment Rules State
  const [paymentRules, setPaymentRules] = useState<PaymentDiscountRule[]>(() => {
    return safeGetStorage<PaymentDiscountRule[]>('obsidian_payment_rules', DEFAULT_PAYMENT_RULES);
  });

  // 2. Activity Rules State
  const [activityRules, setActivityRules] = useState<ActivityPromoRule[]>(() => {
    return getStoredActivityRules();
  });

  // 3. Stacking Settings State
  const [stackingSettings, setStackingSettings] = useState<PromotionStackingSettings>(() => {
    return getStoredStackingSettings();
  });

  // 4. Anti Abuse Rules State
  const [antiAbuseConfig, setAntiAbuseConfig] = useState<AntiAbuseConfig>(() => {
    return safeGetStorage<AntiAbuseConfig>('obsidian_anti_abuse', DEFAULT_ANTI_ABUSE_CONFIG);
  });

  // 5. Delivery Threshold & Settle Rules State
  const [deliverySettings, setDeliverySettingsState] = useState<DeliverySettings>(() => {
    return getDeliverySettings();
  });

  // Sandbox Simulation State
  const [simSpendSubtotal, setSimSpendSubtotal] = useState<number>(118);
  const [simDiningMode, setSimDiningMode] = useState<'delivery' | 'dine_in' | 'pickup'>('delivery');
  const [simCouponCode, setSimCouponCode] = useState<string>('UR-LUNCH10');
  const [simIsVIP, setSimIsVIP] = useState<boolean>(true);
  const [simPaymentMethod, setSimPaymentMethod] = useState<'wechat' | 'alipay' | 'card' | 'enterprise'>('wechat');

  useEffect(() => {
    const handleSettingsEvent = (e: Event) => {
      const customEvent = e as CustomEvent<DeliverySettings>;
      if (customEvent.detail) {
        setDeliverySettingsState(customEvent.detail);
      }
    };
    window.addEventListener(DELIVERY_SETTINGS_EVENT, handleSettingsEvent);
    return () => {
      window.removeEventListener(DELIVERY_SETTINGS_EVENT, handleSettingsEvent);
    };
  }, []);

  // New Activity Modal State
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [newActType, setNewActType] = useState<
    'tiered_threshold' | 'threshold_cut' | 'every_threshold' | 'percent_discount'
  >('tiered_threshold');
  const [newActName, setNewActName] = useState('晚市阶梯自动满减特惠');
  const [newActThreshold, setNewActThreshold] = useState('50');
  const [newActCut, setNewActCut] = useState('6');
  const [newActEveryStep, setNewActEveryStep] = useState('50');
  const [newActEveryCut, setNewActEveryCut] = useState('5');
  const [newActDiscountRate, setNewActDiscountRate] = useState('0.88');
  const [newActAllowCoupon, setNewActAllowCoupon] = useState(true);
  const [newActAllowVIP, setNewActAllowVIP] = useState(true);
  const [newActDescription, setNewActDescription] = useState('全场自动计算最优梯度立减');

  // Multi-tier editor state
  const [newActTiers, setNewActTiers] = useState<ActivityDiscountTier[]>([
    { threshold: 50, cutAmount: 6, label: '满50减6' },
    { threshold: 100, cutAmount: 15, label: '满100减15' },
    { threshold: 180, cutAmount: 32, label: '满180减32' }
  ]);

  // Save changes to localStorage and broadcast
  const savePaymentRules = (updated: PaymentDiscountRule[]) => {
    setPaymentRules(updated);
    safeSetStorage('obsidian_payment_rules', updated);
    showToast('支付渠道立减规则已更新并全网生效！');
  };

  const handleSaveActivityRules = (updated: ActivityPromoRule[]) => {
    setActivityRules(updated);
    saveStoredActivityRules(updated);
    showToast('满减促销活动已更新并全网实时同步！');
  };

  const handleUpdateStackingSettings = (patch: Partial<PromotionStackingSettings>) => {
    const updated = { ...stackingSettings, ...patch };
    setStackingSettings(updated);
    saveStoredStackingSettings(updated);
    showToast('优惠同享与互斥规则矩阵已更新！');
  };

  const saveAntiAbuseConfig = (updated: AntiAbuseConfig) => {
    setAntiAbuseConfig(updated);
    safeSetStorage('obsidian_anti_abuse', updated);
    showToast('防恶意叠加与薅羊毛风控策略已更新！');
  };

  const handleUpdateDeliverySetting = (patch: Partial<DeliverySettings>, message?: string) => {
    const updated = saveDeliverySettings(patch);
    setDeliverySettingsState(updated);
    showToast(message || `外卖起送结算金额已更新为 ¥${updated.minDeliveryAmount}（已广播至客户端）`);
  };

  const handleTogglePaymentRule = (id: string) => {
    const updated = paymentRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    savePaymentRules(updated);
  };

  const handleUpdatePaymentValue = (id: string, field: 'discountValue' | 'minThreshold' | 'maxDiscountCap', val: number) => {
    const updated = paymentRules.map((r) => (r.id === id ? { ...r, [field]: val } : r));
    savePaymentRules(updated);
  };

  const handleToggleActivityRule = (id: string) => {
    const updated = activityRules.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a));
    handleSaveActivityRules(updated);
  };

  const handleToggleActivityCouponStack = (id: string) => {
    const updated = activityRules.map((a) =>
      a.id === id ? { ...a, allowStackWithCoupon: !a.allowStackWithCoupon } : a
    );
    handleSaveActivityRules(updated);
    showToast('活动与优惠券同享/互斥状态已切换！');
  };

  const handleDeleteActivityRule = (id: string) => {
    const updated = activityRules.filter((a) => a.id !== id);
    handleSaveActivityRules(updated);
  };

  const handleAddActivity = () => {
    if (!newActName.trim()) {
      showToast('请输入活动名称');
      return;
    }

    const newRule: ActivityPromoRule = {
      id: `act-${Date.now()}`,
      name: newActName.trim(),
      type: newActType,
      threshold: parseFloat(newActThreshold) || 50,
      cutAmount: parseFloat(newActCut) || 6,
      discountRate: parseFloat(newActDiscountRate) || 0.88,
      tiers: newActType === 'tiered_threshold' ? newActTiers : undefined,
      everyStep: newActType === 'every_threshold' ? parseFloat(newActEveryStep) || 50 : undefined,
      everyCut: newActType === 'every_threshold' ? parseFloat(newActEveryCut) || 5 : undefined,
      allowStackWithCoupon: newActAllowCoupon,
      allowStackWithVIP: newActAllowVIP,
      allowStackWithPayment: true,
      allowStackWithDishDiscount: true,
      applicableChannels: ['delivery', 'dine_in', 'pickup'],
      enabled: true,
      description: newActDescription
    };

    const updated = [newRule, ...activityRules];
    handleSaveActivityRules(updated);
    setIsAddActivityOpen(false);
    showToast(`活动【${newRule.name}】已成功发布并支持前台自动计算！`);
  };

  // Run calculation sandbox
  const simResult = calculateOrderDiscounts({
    subtotal: simSpendSubtotal,
    diningMode: simDiningMode,
    paymentMethod: simPaymentMethod,
    couponCode: simCouponCode || null,
    isVIPActive: simIsVIP,
    activityRules,
    paymentRules,
    stackingSettings,
    antiAbuse: antiAbuseConfig
  });

  return (
    <div id="merchant-marketing-hub" className="space-y-3.5 text-xs text-[#0f172a]">
      {/* 1. Header with Subtabs */}
      <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-3.5 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[3px] bg-[#0f172a] text-white flex items-center justify-center font-bold text-xs shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-[#0f172a] flex items-center gap-2">
              <span>营销中心与智能促销优惠引擎</span>
              <span className="text-[10px] bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] px-1.5 py-0.2 rounded-[2px] font-mono font-bold">
                优惠同享/互斥 · 满减自动算
              </span>
            </div>
            <p className="text-[11px] text-[#64748b] mt-0.5">
              支持多阶梯自动满减、优惠券同享互斥矩阵配置、全员与精准定向发券、支付立减与风控保护。
            </p>
          </div>
        </div>

        {/* Subtabs */}
        <div className="flex bg-[#f8fafc] p-1 rounded-full border border-[#e2e8f0] overflow-x-auto gap-1.5 hide-scrollbar">
          <button
            type="button"
            onClick={() => handleSelectSubTab('coupons')}
            className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap bg-white border ${
              activeSubTab === 'coupons'
                ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                : 'border-[#e2e8f0] text-[#64748b] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50 font-normal'
            }`}
          >
            <Ticket className="w-3.5 h-3.5 text-emerald-500" />
            <span>优惠券发放与设计</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectSubTab('activity')}
            className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap bg-white border ${
              activeSubTab === 'activity'
                ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                : 'border-[#e2e8f0] text-[#64748b] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50 font-normal'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>自动满减阶梯活动</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectSubTab('stacking_matrix')}
            className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap bg-white border ${
              activeSubTab === 'stacking_matrix'
                ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                : 'border-[#e2e8f0] text-[#64748b] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50 font-normal'
            }`}
          >
            <Shuffle className="w-3.5 h-3.5 text-blue-500" />
            <span>优惠叠加与互斥矩阵</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectSubTab('payment')}
            className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap bg-white border ${
              activeSubTab === 'payment'
                ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                : 'border-[#e2e8f0] text-[#64748b] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50 font-normal'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-600" />
            <span>支付渠道立减</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectSubTab('delivery_threshold')}
            className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap bg-white border ${
              activeSubTab === 'delivery_threshold'
                ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                : 'border-[#e2e8f0] text-[#64748b] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50 font-normal'
            }`}
          >
            <Bike className="w-3.5 h-3.5 text-sky-500" />
            <span>外卖起送门槛</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectSubTab('anti_abuse')}
            className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap bg-white border ${
              activeSubTab === 'anti_abuse'
                ? 'border-zinc-900 text-zinc-900 font-semibold shadow-2xs'
                : 'border-[#e2e8f0] text-[#64748b] hover:text-zinc-900 hover:border-zinc-300 hover:bg-slate-50 font-normal'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span>防叠加风控</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectSubTab('qr_diagnostics')}
            className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap bg-white border ${
              activeSubTab === 'qr_diagnostics'
                ? 'border-blue-600 text-blue-700 font-semibold shadow-2xs'
                : 'border-blue-200 text-blue-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50/50 font-normal'
            }`}
          >
            <Scan className="w-3.5 h-3.5 text-blue-500" />
            <span>二维码/桌号/扫码枪检测</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: 优惠券管理与精准定向发放 (MerchantCouponsView) */}
      {activeSubTab === 'coupons' && <MerchantCouponsView showToast={showToast} />}

      {/* SUBTAB 2: 全场阶梯自动满减活动管理 */}
      {activeSubTab === 'activity' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-sm text-[#0f172a] flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span>自动满减与阶梯折扣活动</span>
                </h3>
                <p className="text-[11px] text-[#64748b] mt-0.5">
                  顾客加购达到指定门槛时系统自动触发对应阶梯立减，无需手动领券；可自定义是否与优惠券同享。
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddActivityOpen(true)}
                className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-black text-white rounded-[3px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>新建自动满减/折扣活动</span>
              </button>
            </div>

            {/* List of Activities */}
            <div className="space-y-3">
              {activityRules.map((act) => (
                <div
                  key={act.id}
                  className={`p-3.5 rounded-[4px] border transition-all ${
                    act.enabled ? 'bg-[#f8fafc] border-[#cbd5e1]' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-[4px] bg-amber-50 text-amber-900 border border-amber-200 flex flex-col items-center justify-center font-bold shrink-0">
                        <span className="text-[10px] text-amber-700">满减</span>
                        <span className="font-mono text-sm leading-tight text-amber-900">
                          {act.type === 'tiered_threshold' ? '阶梯' : `¥${act.cutAmount}`}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-[#0f172a]">{act.name}</span>
                          {act.type === 'tiered_threshold' && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-[2px] text-[10px] font-bold">
                              多阶梯自动匹配
                            </span>
                          )}
                          {act.type === 'every_threshold' && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-[2px] text-[10px] font-bold">
                              每满减
                            </span>
                          )}
                          <span className="text-[10.5px] font-mono text-[#64748b]">ID: {act.id}</span>
                        </div>

                        {/* Tiers display */}
                        {act.type === 'tiered_threshold' && act.tiers && act.tiers.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-[#64748b]">阶梯档位：</span>
                            {act.tiers.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-white border border-amber-200 text-amber-900 rounded-[2px] font-mono font-bold text-[11px]"
                              >
                                {t.label || `满¥${t.threshold}减¥${t.cutAmount}`}
                              </span>
                            ))}
                          </div>
                        ) : act.type === 'every_threshold' ? (
                          <div className="text-[11px] text-[#334155]">
                            每满 <strong className="font-mono text-blue-600">¥{act.everyStep || 50}</strong> 立减{' '}
                            <strong className="font-mono text-blue-600">¥{act.everyCut || 5}</strong>
                            {act.everyMaxCap && <span> (最高封顶立减 ¥{act.everyMaxCap})</span>}
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#334155]">
                            满 <strong className="font-mono text-amber-700">¥{act.threshold}</strong> 立减{' '}
                            <strong className="font-mono text-amber-700">¥{act.cutAmount}</strong>
                          </div>
                        )}

                        <p className="text-[11px] text-[#64748b]">{act.description}</p>

                        {/* Stacking tags */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap text-[10.5px]">
                          <button
                            type="button"
                            onClick={() => handleToggleActivityCouponStack(act.id)}
                            className={`px-2 py-0.5 rounded-[2px] border font-semibold cursor-pointer transition-colors ${
                              act.allowStackWithCoupon
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                            title="点击切换是否与优惠券同享"
                          >
                            {act.allowStackWithCoupon ? '✓ 可与优惠券同享 (点击切换)' : '✕ 与优惠券互斥 (独享最优)'}
                          </button>

                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-[2px]">
                            {act.allowStackWithVIP ? '支持VIP会员叠加' : '不叠VIP'}
                          </span>

                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-[2px]">
                            渠道: {act.applicableChannels.map((c) => (c === 'delivery' ? '外卖' : c === 'dine_in' ? '堂食' : '自提')).join('/')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActivityRule(act.id)}
                        className={`px-3 py-1 rounded-[2px] text-xs font-bold transition-all cursor-pointer border ${
                          act.enabled
                            ? 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]'
                            : 'bg-[#fef2f2] text-red-600 border-[#fecaca]'
                        }`}
                      >
                        {act.enabled ? '活动进行中' : '已暂停'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteActivityRule(act.id)}
                        className="p-1.5 text-[#94a3b8] hover:text-red-600 hover:bg-red-50 rounded-[2px] cursor-pointer transition-colors"
                        title="删除活动"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: 优惠叠加与互斥规则矩阵 (Discount Stacking Matrix) */}
      {activeSubTab === 'stacking_matrix' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-4 shadow-xs space-y-4">
            <div className="border-b border-[#f1f5f9] pb-3">
              <h3 className="font-bold text-sm text-[#0f172a] flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-blue-600" />
                <span>全域优惠同享与互斥策略矩阵</span>
              </h3>
              <p className="text-[11px] text-[#64748b] mt-0.5">
                精细化配置「满减活动」、「优惠券」、「VIP会员折扣」和「支付立减」之间的同享与互斥规则，防止利润倒挂。
              </p>
            </div>

            {/* Matrix Rule Switches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Card 1: 满减 ⟷ 优惠券 */}
              <div className="p-3.5 rounded-[4px] border border-[#cbd5e1] bg-[#f8fafc] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-[2px] bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#0f172a]">满减活动 与 优惠券 同享开关</div>
                      <div className="text-[10.5px] text-[#64748b]">控制活动满减能否与领取的优惠券同时抵扣</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateStackingSettings({
                        allowActivityStackCoupon: !stackingSettings.allowActivityStackCoupon
                      })
                    }
                    className={`px-2.5 py-1 rounded-[2px] text-xs font-bold transition-all cursor-pointer border ${
                      stackingSettings.allowActivityStackCoupon
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {stackingSettings.allowActivityStackCoupon ? '✓ 允许同享' : '✕ 互斥(仅择一)'}
                  </button>
                </div>
                <p className="text-[10.5px] text-[#64748b] bg-white p-2 rounded border border-[#e2e8f0]">
                  {stackingSettings.allowActivityStackCoupon
                    ? '已开启：顾客可同时享受阶梯满减与优惠券立减，刺激大单消费。'
                    : '已互斥：系统将在结算时自动比对满减与卡券，自动选择优惠金额最大的一项。'}
                </p>
              </div>

              {/* Card 2: 满减 ⟷ VIP会员权益 */}
              <div className="p-3.5 rounded-[4px] border border-[#cbd5e1] bg-[#f8fafc] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-[2px] bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#0f172a]">满减活动 与 VIP会员权益 同享</div>
                      <div className="text-[10.5px] text-[#64748b]">控制黑金/银卡VIP专享折扣是否叠满减</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateStackingSettings({
                        allowActivityStackVIP: !stackingSettings.allowActivityStackVIP
                      })
                    }
                    className={`px-2.5 py-1 rounded-[2px] text-xs font-bold transition-all cursor-pointer border ${
                      stackingSettings.allowActivityStackVIP
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {stackingSettings.allowActivityStackVIP ? '✓ 允许同享' : '✕ 互斥'}
                  </button>
                </div>
                <p className="text-[10.5px] text-[#64748b] bg-white p-2 rounded border border-[#e2e8f0]">
                  {stackingSettings.allowActivityStackVIP
                    ? '已开启：VIP会员享受专属尊享立减的同时仍可享受餐车阶梯满减。'
                    : '已互斥：VIP会员权益不可与大额满减同享。'}
                </p>
              </div>

              {/* Card 3: 优惠券 ⟷ VIP会员权益 */}
              <div className="p-3.5 rounded-[4px] border border-[#cbd5e1] bg-[#f8fafc] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-[2px] bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#0f172a]">优惠券 与 VIP会员权益 同享</div>
                      <div className="text-[10.5px] text-[#64748b]">控制会员在使用卡券时能否额外享受尊享减免</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateStackingSettings({
                        allowCouponStackVIP: !stackingSettings.allowCouponStackVIP
                      })
                    }
                    className={`px-2.5 py-1 rounded-[2px] text-xs font-bold transition-all cursor-pointer border ${
                      stackingSettings.allowCouponStackVIP
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {stackingSettings.allowCouponStackVIP ? '✓ 允许同享' : '✕ 互斥'}
                  </button>
                </div>
                <p className="text-[10.5px] text-[#64748b] bg-white p-2 rounded border border-[#e2e8f0]">
                  {stackingSettings.allowCouponStackVIP
                    ? '已开启：VIP会员可用券且享有VIP专享减免。'
                    : '已互斥：用券订单不享受VIP会员折扣。'}
                </p>
              </div>

              {/* Card 4: 支付立减 ⟷ 全域叠加 */}
              <div className="p-3.5 rounded-[4px] border border-[#cbd5e1] bg-[#f8fafc] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-[2px] bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      4
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#0f172a]">支付渠道立减 全额叠加</div>
                      <div className="text-[10.5px] text-[#64748b]">微信/支付宝/银行卡立减是否为最终收银兜底叠减</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateStackingSettings({
                        allowPaymentStackAll: !stackingSettings.allowPaymentStackAll
                      })
                    }
                    className={`px-2.5 py-1 rounded-[2px] text-xs font-bold transition-all cursor-pointer border ${
                      stackingSettings.allowPaymentStackAll
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {stackingSettings.allowPaymentStackAll ? '✓ 全额叠加' : '✕ 条件互斥'}
                  </button>
                </div>
                <p className="text-[10.5px] text-[#64748b] bg-white p-2 rounded border border-[#e2e8f0]">
                  已开启：在完成所有营销减免后，顾客在支付阶段仍可享受银行或支付机构渠道立减（如-¥3.00）。
                </p>
              </div>
            </div>

            {/* Auto Pick Best Combo Switch */}
            <div className="p-3.5 rounded-[4px] bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <span className="font-bold text-xs text-[#1e40af] block">
                    互斥时智能推荐与最优算价方案 (Auto-Pick Best Option)
                  </span>
                  <span className="text-[11px] text-[#1e40af]/80">
                    当用户选中的活动与优惠券互斥时，系统智能模拟多套组合，自动选择帮顾客省钱最多的最优组合并向顾客提示。
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleUpdateStackingSettings({
                    autoPickBestCombo: !stackingSettings.autoPickBestCombo
                  })
                }
                className={`px-3 py-1 rounded-[2px] text-xs font-bold cursor-pointer transition-all border ${
                  stackingSettings.autoPickBestCombo
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-blue-700 border-blue-300'
                }`}
              >
                {stackingSettings.autoPickBestCombo ? '✓ 智能最优解 (已启用)' : '手动选择'}
              </button>
            </div>
          </div>

          {/* Interactive Simulation Sandbox */}
          <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-sm text-[#0f172a]">优惠叠加与算价沙盘测试 (Live Sandbox)</span>
              </div>
              <span className="text-[11px] text-[#64748b]">实时查看同享/互斥配置对前台结算的影响</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">测试订单金额 (元)</label>
                <input
                  type="number"
                  value={simSpendSubtotal}
                  onChange={(e) => setSimSpendSubtotal(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">用餐场景</label>
                <select
                  value={simDiningMode}
                  onChange={(e) => setSimDiningMode(e.target.value as any)}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a]"
                >
                  <option value="delivery">外卖专送</option>
                  <option value="dine_in">餐车堂食</option>
                  <option value="pickup">到店自提</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">测试优惠券</label>
                <input
                  type="text"
                  value={simCouponCode}
                  onChange={(e) => setSimCouponCode(e.target.value)}
                  placeholder="如 UR-LUNCH10"
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">VIP会员身份</label>
                <select
                  value={simIsVIP ? 'true' : 'false'}
                  onChange={(e) => setSimIsVIP(e.target.value === 'true')}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a]"
                >
                  <option value="true">👑 黑金 VIP 会员</option>
                  <option value="false">普通注册顾客</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">支付渠道</label>
                <select
                  value={simPaymentMethod}
                  onChange={(e) => setSimPaymentMethod(e.target.value as any)}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a]"
                >
                  <option value="wechat">微信支付 (立减¥3)</option>
                  <option value="alipay">支付宝 (立减¥2.5)</option>
                  <option value="card">银联/信用卡</option>
                  <option value="enterprise">企业餐补</option>
                </select>
              </div>
            </div>

            {/* Sandbox Output Banner */}
            <div className="bg-[#f8fafc] p-3.5 rounded-[4px] border border-[#cbd5e1] space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#0f172a]">沙盘计算结果：</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-[2px] text-[11px] font-bold">
                    {simResult.stackingExplanation}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#64748b]">原价: ¥{simResult.subtotal.toFixed(2)}</span>
                  <span className="text-xs text-red-600 font-bold">总优惠: -¥{simResult.cappedDiscount.toFixed(2)}</span>
                  <span className="text-sm font-mono font-bold text-[#0f172a]">
                    实付: ¥{simResult.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-white p-2 rounded border border-[#e2e8f0]">
                  <span className="text-[#64748b]">自动满减：</span>
                  <span className="font-mono font-bold text-amber-600 ml-1">
                    {simResult.activityDiscount > 0 ? `-¥${simResult.activityDiscount.toFixed(2)}` : '未触发'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-[#e2e8f0]">
                  <span className="text-[#64748b]">优惠券抵扣：</span>
                  <span className="font-mono font-bold text-blue-600 ml-1">
                    {simResult.couponDiscount > 0 ? `-¥${simResult.couponDiscount.toFixed(2)}` : '未使用'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-[#e2e8f0]">
                  <span className="text-[#64748b]">VIP专享立减：</span>
                  <span className="font-mono font-bold text-purple-600 ml-1">
                    {simResult.vipDiscount > 0 ? `-¥${simResult.vipDiscount.toFixed(2)}` : '无'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-[#e2e8f0]">
                  <span className="text-[#64748b]">支付渠道立减：</span>
                  <span className="font-mono font-bold text-emerald-600 ml-1">
                    {simResult.paymentDiscount > 0 ? `-¥${simResult.paymentDiscount.toFixed(2)}` : '无'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: 支付渠道立减配置 */}
      {activeSubTab === 'payment' && (
        <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#0f172a] flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>支付渠道立减补贴设置</span>
              </h3>
              <p className="text-[11px] text-[#64748b] mt-0.5">
                针对微信、支付宝、银行卡及企业签单等不同渠道，设置满额自动立减金额与封顶上限。
              </p>
            </div>
            <span className="text-[10px] text-[#64748b] font-mono bg-[#f1f5f9] px-2 py-0.5 rounded">
              前台结算页实时同步
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {paymentRules.map((rule) => (
              <div
                key={rule.id}
                className={`p-3.5 rounded-[4px] border transition-all space-y-3 ${
                  rule.enabled ? 'bg-[#f8fafc] border-[#cbd5e1]' : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{rule.icon}</span>
                    <div>
                      <div className="font-bold text-xs text-[#0f172a] flex items-center gap-1.5">
                        <span>{rule.name}</span>
                        <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">
                          {rule.tag}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-[#64748b]">{rule.description}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTogglePaymentRule(rule.id)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer border ${
                      rule.enabled
                        ? 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]'
                        : 'bg-[#fef2f2] text-red-600 border-[#fecaca]'
                    }`}
                  >
                    {rule.enabled ? '已启用立减' : '已暂停'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#e2e8f0] font-mono text-[11px]">
                  <div>
                    <label className="text-[10px] text-[#64748b] font-sans block mb-0.5">满额门槛 (¥):</label>
                    <input
                      type="number"
                      value={rule.minThreshold}
                      disabled={!rule.enabled}
                      onChange={(e) => handleUpdatePaymentValue(rule.id, 'minThreshold', parseFloat(e.target.value) || 0)}
                      className="w-full p-1 bg-white border border-[#cbd5e1] rounded focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#64748b] font-sans block mb-0.5">立减优惠 (¥):</label>
                    <input
                      type="number"
                      value={rule.discountValue}
                      disabled={!rule.enabled}
                      onChange={(e) => handleUpdatePaymentValue(rule.id, 'discountValue', parseFloat(e.target.value) || 0)}
                      className="w-full p-1 bg-white border border-[#cbd5e1] rounded focus:outline-none font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#64748b] font-sans block mb-0.5">封顶上限 (¥):</label>
                    <input
                      type="number"
                      value={rule.maxDiscountCap}
                      disabled={!rule.enabled}
                      onChange={(e) => handleUpdatePaymentValue(rule.id, 'maxDiscountCap', parseFloat(e.target.value) || 0)}
                      className="w-full p-1 bg-white border border-[#cbd5e1] rounded focus:outline-none font-bold"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: 外卖起送门槛与剔除优惠结算规则配置 */}
      {activeSubTab === 'delivery_threshold' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-sm text-[#0f172a] flex items-center gap-2">
                  <Bike className="w-4 h-4 text-sky-600" />
                  <span>客户端外卖起送门槛与结算规则</span>
                </h3>
                <p className="text-[11px] text-[#64748b] mt-0.5">
                  设置客户端外卖专送最低起送金额，支持开启「严格剔除优惠实付满额才可起送」风控校验。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] px-2 py-0.5 rounded-[2px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>已全网广播</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateDeliverySetting(DEFAULT_DELIVERY_SETTINGS, '已恢复系统默认外卖起送与结算规则');
                  }}
                  className="px-2 py-0.5 rounded-[3px] border border-[#cbd5e1] text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>重置默认</span>
                </button>
              </div>
            </div>

            {/* Core Threshold Input Block */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-[#f8fafc] border-2 border-emerald-600/30 rounded-[4px] space-y-3 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-[3px] bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                      ¥
                    </div>
                    <div>
                      <span className="font-bold text-sm text-[#0f172a] block">外卖专送起送结算金额</span>
                      <span className="text-[11px] text-[#64748b]">
                        低于此金额将禁止购物车结算并引导凑单
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-emerald-700">
                      ¥{deliverySettings.minDeliveryAmount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-[#64748b] block">起送标准</span>
                  </div>
                </div>

                {/* Presets */}
                <div>
                  <label className="text-[11px] font-bold text-[#64748b] mb-1.5 block">
                    快捷推荐预设档位:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '0元无门槛', val: 0 },
                      { label: '¥20 基础起送', val: 20 },
                      { label: '¥30 市区标准', val: 30 },
                      { label: '¥35 推荐标准', val: 35 },
                      { label: '¥48 双人起送', val: 48 },
                      { label: '¥58 豪华专送', val: 58 },
                      { label: '¥88 远距起送', val: 88 }
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => handleUpdateDeliverySetting({ minDeliveryAmount: preset.val })}
                        className={`px-2.5 py-1 rounded-[3px] text-xs font-semibold transition-all cursor-pointer border ${
                          deliverySettings.minDeliveryAmount === preset.val
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs font-bold'
                            : 'bg-white text-[#0f172a] border-[#cbd5e1] hover:bg-[#f1f5f9]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Box 2: 配送费与包邮门槛 */}
              <div className="p-4 bg-[#f8fafc] border border-[#cbd5e1] rounded-[4px] space-y-3 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-xs text-[#0f172a] block">配送服务费与满额包邮</span>
                  <p className="text-[10.5px] text-[#64748b] mt-0.5">
                    设置基础配送运费及满额免配送费阶梯
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#0f172a]">基础配送费:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-neutral-400">¥</span>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={deliverySettings.deliveryFee}
                        onChange={(e) =>
                          handleUpdateDeliverySetting({ deliveryFee: parseFloat(e.target.value) || 0 })
                        }
                        className="w-16 p-1 bg-white border border-[#cbd5e1] rounded font-mono font-bold text-xs text-center"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#0f172a]">满额免配送费:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-neutral-400">¥</span>
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={deliverySettings.freeDeliveryThreshold}
                        onChange={(e) =>
                          handleUpdateDeliverySetting({ freeDeliveryThreshold: parseFloat(e.target.value) || 0 })
                        }
                        className="w-16 p-1 bg-white border border-[#cbd5e1] rounded font-mono font-bold text-xs text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 6: 防叠加风控保护 */}
      {activeSubTab === 'anti_abuse' && (
        <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#0f172a] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span>防过度叠加与薅羊毛风控引擎</span>
              </h3>
              <p className="text-[11px] text-[#64748b] mt-0.5">
                设置整单最大折扣比例截断、最低实付兜底保护等风控规则，保障餐车经营利润安全。
              </p>
            </div>
            <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded font-bold">
              自动实时截断
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-[4px] border border-[#cbd5e1] bg-[#f8fafc] space-y-2">
              <label className="block text-xs font-bold text-[#0f172a]">整单最大折扣比例截断 (%)</label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="0.9"
                value={antiAbuseConfig.maxDiscountRatio}
                onChange={(e) =>
                  saveAntiAbuseConfig({ ...antiAbuseConfig, maxDiscountRatio: parseFloat(e.target.value) || 0.65 })
                }
                className="w-full p-2 bg-white border border-[#cbd5e1] rounded font-mono font-bold text-sm text-[#0f172a]"
              />
              <p className="text-[10.5px] text-[#64748b]">
                例如 0.65 表示无论如何多重叠加，优惠总额不得超过订单金额的 65%，确保实付至少保留 35%。
              </p>
            </div>

            <div className="p-3.5 rounded-[4px] border border-[#cbd5e1] bg-[#f8fafc] space-y-2">
              <label className="block text-xs font-bold text-[#0f172a]">特惠单最低实付兜底金额 (¥)</label>
              <input
                type="number"
                step="0.5"
                min="0.01"
                value={antiAbuseConfig.minPayAmount}
                onChange={(e) =>
                  saveAntiAbuseConfig({ ...antiAbuseConfig, minPayAmount: parseFloat(e.target.value) || 1.0 })
                }
                className="w-full p-2 bg-white border border-[#cbd5e1] rounded font-mono font-bold text-sm text-emerald-700"
              />
              <p className="text-[10.5px] text-[#64748b]">
                严禁 0 元免单或负数订单，即使优惠券面额超出，实付也必须保留此兜底金额。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 7: 全系统二维码与扫码枪完整性检测中心 */}
      {activeSubTab === 'qr_diagnostics' && (
        <div className="bg-white rounded-[4px] border border-[#e2e8f0] p-3 sm:p-4 shadow-xs">
          <QrAndScannerDiagnosticView showToast={showToast} />
        </div>
      )}

      {/* MODAL: Create New Activity */}
      {isAddActivityOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[4px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs my-6">
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <h3 className="font-bold text-sm text-[#0f172a]">新建自动满减与营销活动</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddActivityOpen(false)}
                className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">活动名称 *</label>
                <input
                  type="text"
                  value={newActName}
                  onChange={(e) => setNewActName(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">活动优惠模式</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewActType('tiered_threshold')}
                    className={`p-2 rounded-[2px] border text-left cursor-pointer transition-all ${
                      newActType === 'tiered_threshold'
                        ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold'
                        : 'bg-[#f8fafc] border-[#cbd5e1] text-[#64748b]'
                    }`}
                  >
                    <div className="text-xs">多阶梯满减 (推荐)</div>
                    <div className="text-[10px] font-normal mt-0.5">满50减6, 满100减15...</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewActType('every_threshold')}
                    className={`p-2 rounded-[2px] border text-left cursor-pointer transition-all ${
                      newActType === 'every_threshold'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                        : 'bg-[#f8fafc] border-[#cbd5e1] text-[#64748b]'
                    }`}
                  >
                    <div className="text-xs">每满减 (聚餐狂欢)</div>
                    <div className="text-[10px] font-normal mt-0.5">每满50减5，上不封顶</div>
                  </button>
                </div>
              </div>

              {/* Tiers configuration */}
              {newActType === 'tiered_threshold' && (
                <div className="space-y-2 bg-[#f8fafc] p-3 rounded-[3px] border border-[#e2e8f0]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#0f172a]">阶梯档位配置：</span>
                    <button
                      type="button"
                      onClick={() =>
                        setNewActTiers([
                          ...newActTiers,
                          { threshold: 250, cutAmount: 45, label: '满250减45' }
                        ])
                      }
                      className="text-[10.5px] text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      + 增加阶梯
                    </button>
                  </div>

                  {newActTiers.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] text-[#64748b] w-12">第{idx + 1}档:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px]">满</span>
                        <input
                          type="number"
                          value={t.threshold}
                          onChange={(e) => {
                            const updated = [...newActTiers];
                            updated[idx].threshold = Number(e.target.value);
                            updated[idx].label = `满${updated[idx].threshold}减${updated[idx].cutAmount}`;
                            setNewActTiers(updated);
                          }}
                          className="w-16 p-1 bg-white border border-[#cbd5e1] rounded font-mono text-xs font-bold text-center"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px]">减</span>
                        <input
                          type="number"
                          value={t.cutAmount}
                          onChange={(e) => {
                            const updated = [...newActTiers];
                            updated[idx].cutAmount = Number(e.target.value);
                            updated[idx].label = `满${updated[idx].threshold}减${updated[idx].cutAmount}`;
                            setNewActTiers(updated);
                          }}
                          className="w-16 p-1 bg-white border border-[#cbd5e1] rounded font-mono text-xs font-bold text-red-600 text-center"
                        />
                      </div>
                      {newActTiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewActTiers(newActTiers.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Stacking settings */}
              <div className="space-y-2 pt-1 border-t border-[#f1f5f9]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#0f172a]">是否允许与优惠券同享</span>
                  <input
                    type="checkbox"
                    checked={newActAllowCoupon}
                    onChange={(e) => setNewActAllowCoupon(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#0f172a]">是否允许与VIP会员立减同享</span>
                  <input
                    type="checkbox"
                    checked={newActAllowVIP}
                    onChange={(e) => setNewActAllowVIP(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">活动说明与标语</label>
                <input
                  type="text"
                  value={newActDescription}
                  onChange={(e) => setNewActDescription(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a]"
                />
              </div>
            </div>

            <div className="bg-[#f8fafc] px-4 py-2.5 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddActivityOpen(false)}
                className="px-3 py-1 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddActivity}
                className="px-4 py-1 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>立即发布活动</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
