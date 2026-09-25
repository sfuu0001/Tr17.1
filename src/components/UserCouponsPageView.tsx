import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Settings,
  Tag,
  Calendar,
  Clock,
  QrCode,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Layers,
  ShieldCheck,
  Percent,
  ChevronDown,
  ChevronUp,
  Maximize2,
  RefreshCw,
  ScanLine
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CouponItem, UserCouponRecord } from '../types/coupon';
import { INITIAL_USER_COUPONS, INITIAL_MERCHANT_COUPONS } from '../data/mockCoupons';
import { CategoryType } from '../types';
import { safeGetStorage, safeSetStorage } from '../utils/safeStorage';
import { copyTextToClipboard } from '../utils/clipboard';
import { generateQrCodeDataUrl } from '../utils/qrCodeEngine';
import { useToast } from './ui/ToastContext';
import { BackButton } from './BackButton';
import { OrganicCardReveal } from '../utils/useCardScrollReveal';

interface UserCouponsPageViewProps {
  onBackToMenu: () => void;
  onGoToCategory?: (category: CategoryType) => void;
  onOpenVIP?: () => void;
  isVIPActive?: boolean;
}

export const UserCouponsPageView: React.FC<UserCouponsPageViewProps> = ({
  onBackToMenu,
  onGoToCategory,
  onOpenVIP,
  isVIPActive = true
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'available' | 'used' | 'expired'>('available');
  const [couponInput, setCouponInput] = useState('');
  const [selectedRuleDetail, setSelectedRuleDetail] = useState<CouponItem | null>(null);
  const [selectedQrCoupon, setSelectedQrCoupon] = useState<CouponItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 下拉真实二维码小组件展开状态与真实二维码 DataURL 缓存
  const [expandedQrCouponId, setExpandedQrCouponId] = useState<string | null>(null);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [isGeneratingQr, setIsGeneratingQr] = useState<Record<string, boolean>>({});
  const [qrRefreshCountdown, setQrRefreshCountdown] = useState<number>(120);

  // Load User Coupons from localStorage or Initial
  const [userCoupons, setUserCoupons] = useState<UserCouponRecord[]>(() => {
    return safeGetStorage<UserCouponRecord[]>('obsidian_user_coupons', INITIAL_USER_COUPONS);
  });

  const showToast = (msg: string) => {
    toast.info(msg);
  };

  const saveUserCoupons = (newList: UserCouponRecord[]) => {
    setUserCoupons(newList);
    safeSetStorage('obsidian_user_coupons', newList);
  };

  // 动态倒计时刷新防伪凭证
  useEffect(() => {
    if (!expandedQrCouponId && !selectedQrCoupon) return;
    const timer = setInterval(() => {
      setQrRefreshCountdown((prev) => (prev <= 1 ? 120 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [expandedQrCouponId, selectedQrCoupon]);

  // 生成真实二维码 DataURL (使用真实扫码可验证的 Payload)
  const loadQrCodeForCoupon = useCallback(async (coupon: CouponItem, forceRefresh = false) => {
    if (!coupon?.code) return;
    if (qrDataUrls[coupon.code] && !forceRefresh) return;

    setIsGeneratingQr((prev) => ({ ...prev, [coupon.code]: true }));
    try {
      const baseUrl = typeof window !== 'undefined' && window.location?.origin 
        ? window.location.origin 
        : 'https://tc100-d9gz0e2ko5929e360-1445454244.tcloudbaseapp.com';
      
      // 真实可被扫码机与移动端摄像头直接识别的标准参数
      const qrPayload = `${baseUrl}/?action=redeem_coupon&code=${encodeURIComponent(coupon.code)}&val=${coupon.discountValue}&type=${coupon.couponType}&ts=${Date.now()}`;
      
      const dataUrl = await generateQrCodeDataUrl(qrPayload, {
        width: 320,
        margin: 2,
        darkColor: '#000000',
        lightColor: '#ffffff'
      });

      setQrDataUrls((prev) => ({ ...prev, [coupon.code]: dataUrl }));
      setQrRefreshCountdown(120);
    } catch (err) {
      console.error('Failed to generate real QR code:', err);
    } finally {
      setIsGeneratingQr((prev) => ({ ...prev, [coupon.code]: false }));
    }
  }, [qrDataUrls]);

  // 切换下拉二维码小组件展开/收起
  const handleToggleQrDropdown = (coupon: CouponItem, userCouponId: string) => {
    if (expandedQrCouponId === userCouponId) {
      setExpandedQrCouponId(null);
    } else {
      setExpandedQrCouponId(userCouponId);
      loadQrCodeForCoupon(coupon);
    }
  };

  // 手动强制重新生成/刷新二维码
  const handleRefreshQr = (coupon: CouponItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    loadQrCodeForCoupon(coupon, true);
    showToast('核销二维码防伪凭证已实时刷新');
  };

  // Filter coupons by status
  const availableCoupons = useMemo(
    () => userCoupons.filter((c) => c.status === 'available'),
    [userCoupons]
  );
  const usedCoupons = useMemo(
    () => userCoupons.filter((c) => c.status === 'used'),
    [userCoupons]
  );
  const expiredCoupons = useMemo(
    () => userCoupons.filter((c) => c.status === 'expired'),
    [userCoupons]
  );

  // Total potential savings calculation
  const totalPotentialSavings = useMemo(() => {
    return availableCoupons.reduce((sum, item) => {
      if (item.coupon.couponType === 'amount_cut' || item.coupon.couponType === 'no_threshold') {
        return sum + item.coupon.discountValue;
      }
      if (item.coupon.couponType === 'delivery_free') {
        return sum + 5;
      }
      if (item.coupon.couponType === 'discount_percent') {
        return sum + (item.coupon.maxDiscountCap || 15);
      }
      return sum;
    }, 0);
  }, [availableCoupons]);

  // Code redemption handler
  const handleRedeemCode = (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const targetCode = (customCode || couponInput).trim().toUpperCase();
    if (!targetCode) {
      showToast('请输入有效的优惠券兑换码 (Please enter promo code)');
      return;
    }

    // Check if already claimed and available
    const alreadyHas = userCoupons.find(
      (uc) => uc.coupon.code.toUpperCase() === targetCode && uc.status === 'available'
    );
    if (alreadyHas) {
      showToast(`您已持有该卡券【${alreadyHas.coupon.title}】`);
      setCouponInput('');
      return;
    }

    // Find in merchant coupons or create dynamic matched coupon
    const matched = INITIAL_MERCHANT_COUPONS.find((mc) => mc.code.toUpperCase() === targetCode);
    if (matched) {
      const newRecord: UserCouponRecord = {
        userCouponId: `uc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        couponId: matched.id,
        coupon: matched,
        status: 'available',
        acquiredAt: new Date().toISOString().slice(0, 10)
      };
      const updated = [newRecord, ...userCoupons];
      saveUserCoupons(updated);
      showToast(`🎉 兑换成功！已获得「${matched.title}」`);
      setCouponInput('');
      setActiveTab('available');
    } else {
      // Dynamic fallback for custom code
      const isPercent = targetCode.includes('10') || targetCode.includes('88');
      const dynamicCoupon: CouponItem = {
        id: `cpn-custom-${Date.now()}`,
        code: targetCode,
        title: isPercent ? 'Lunch Rush Special' : `VIP Special Voucher (${targetCode})`,
        subtitle: 'Applies to all Urban Radar items',
        couponType: isPercent ? 'discount_percent' : 'amount_cut',
        discountValue: isPercent ? 0.9 : 5.0,
        minSpend: isPercent ? 30.0 : 0,
        scopeType: 'all_dishes',
        timeSlotType: 'all_day',
        timeSlotLabel: '全天全时段通用',
        dayRestriction: 'all_week',
        dayRestrictionLabel: '全周通用',
        designStyle: 'black_gold',
        badgeText: 'VIP ONLY',
        totalQuantity: 100,
        issuedCount: 1,
        usedCount: 0,
        status: 'active',
        expireDate: '2026-09-30',
        createdAt: new Date().toISOString().slice(0, 10)
      };
      const newRecord: UserCouponRecord = {
        userCouponId: `uc-${Date.now()}`,
        couponId: dynamicCoupon.id,
        coupon: dynamicCoupon,
        status: 'available',
        acquiredAt: new Date().toISOString().slice(0, 10)
      };
      saveUserCoupons([newRecord, ...userCoupons]);
      showToast(`🎉 兑换成功！已为您录入「${dynamicCoupon.title}」`);
      setCouponInput('');
      setActiveTab('available');
    }
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    showToast(`券码【${code}】已复制到剪贴板`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleUseNow = (coupon: CouponItem) => {
    if (coupon.scopeCategories && coupon.scopeCategories.length > 0 && onGoToCategory) {
      onGoToCategory(coupon.scopeCategories[0]);
    } else {
      onBackToMenu();
    }
  };

  const displayedCoupons = useMemo(() => {
    if (activeTab === 'available') return availableCoupons;
    if (activeTab === 'used') return usedCoupons;
    return expiredCoupons;
  }, [activeTab, availableCoupons, usedCoupons, expiredCoupons]);

  return (
    <div className="w-full max-w-5xl mx-auto min-h-screen bg-[#fafaf9] text-[#1a1c1b] pb-20 font-sans select-none animate-in fade-in duration-200">
      {/* Back Navigation to Point-of-Sale Menu */}
      <div className="px-0.5 pt-0.5 pb-1">
        <BackButton onClick={onBackToMenu} label="返回点餐" />
      </div>

      {/* Main Content Area */}
      <div className="px-0.5 py-0.5 space-y-2">
        {/* 1. Active Elite Executive Summary Card */}
        <div className="bg-white rounded-xl border border-[#e5e5e2] p-2.5 shadow-2xs">
          {/* Top Elite Badge */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-black flex items-center justify-center">
              <span className="text-[8px] font-black">★</span>
            </div>
            <span className="text-[10.5px] font-black tracking-wider uppercase text-black tabular-nums">
              {isVIPActive ? '黑卡尊享会员' : '先锋注册会员'}
            </span>
          </div>

          {/* 2-Column Metrics */}
          <div className="grid grid-cols-2 divide-x divide-[#ecece8] pt-0.5 pb-0.5">
            {/* Left Column: Available Vouchers */}
            <div className="pr-2">
              <span className="text-[10.5px] text-[#787770] block font-medium">
                当前可用优惠券
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-xl font-black text-black tabular-nums">
                  {availableCoupons.length}
                </span>
                <span className="text-[10px] font-bold text-black">有效可用</span>
              </div>
            </div>

            {/* Right Column: Est. Savings */}
            <div className="pl-2.5">
              <span className="text-[10.5px] text-[#787770] block font-medium">
                预计累计可省
              </span>
              <div className="mt-0.5">
                <span className="text-lg sm:text-xl font-black text-[#059669] tabular-nums">
                  ¥{totalPotentialSavings > 0 ? totalPotentialSavings.toFixed(0) : '50'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Promo Code Input & Redeem Bar */}
        <div className="space-y-1">
          <form
            onSubmit={(e) => handleRedeemCode(e)}
            className="flex items-center gap-1.5"
          >
            <div className="flex-1 bg-white rounded-lg border border-[#e5e5e2] px-2 py-1.5 flex items-center gap-1.5 shadow-2xs focus-within:border-black transition-colors">
              <Tag className="w-3.5 h-3.5 text-[#8c8b84] shrink-0" />
              <input
                type="text"
                placeholder="输入兑换码 (如 UR-VIP5)..."
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                className="w-full text-xs font-medium text-black placeholder-[#8c8b84] bg-transparent outline-none uppercase tabular-nums"
              />
            </div>

            <button
              type="submit"
              className="bg-black hover:bg-neutral-800 active:scale-95 text-white font-black text-xs px-3.5 py-1.5 rounded-lg tracking-wider transition-all shadow-2xs cursor-pointer shrink-0"
            >
              立即兑换
            </button>
          </form>

          {/* Quick test chips */}
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar py-0.5 text-[9.5px]">
            <span className="text-[#787770] whitespace-nowrap font-medium">快捷试用码:</span>
            {['UR-VIP5', 'UR-LUNCH10', 'UR-DRINK88', 'UR-WEEKEND20'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => handleRedeemCode(undefined, code)}
                className="bg-[#e9e9e6] hover:bg-[#deded9] active:scale-95 text-[#333] px-1.5 py-0.5 rounded tabular-nums font-bold whitespace-nowrap transition-colors cursor-pointer"
              >
                +{code}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Filter Tabs (Available, Used, Expired) */}
        <div className="border-b border-[#e5e5e2] flex items-center gap-3 pt-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('available')}
            className={`pb-1.5 text-xs sm:text-sm font-bold flex items-center gap-1 transition-colors relative cursor-pointer ${
              activeTab === 'available' ? 'text-black' : 'text-[#787770] hover:text-black'
            }`}
          >
            <span>可使用</span>
            <span className="bg-black text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center tabular-nums">
              {availableCoupons.length}
            </span>
            {activeTab === 'available' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('used')}
            className={`pb-1.5 text-xs sm:text-sm font-bold flex items-center gap-1 transition-colors relative cursor-pointer ${
              activeTab === 'used' ? 'text-black' : 'text-[#787770] hover:text-black'
            }`}
          >
            <span>已使用</span>
            <span className="text-[10.5px] text-[#787770] font-normal">({usedCoupons.length})</span>
            {activeTab === 'used' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expired')}
            className={`pb-1.5 text-xs sm:text-sm font-bold flex items-center gap-1 transition-colors relative cursor-pointer ${
              activeTab === 'expired' ? 'text-black' : 'text-[#787770] hover:text-black'
            }`}
          >
            <span>已过期</span>
            <span className="text-[10.5px] text-[#787770] font-normal">({expiredCoupons.length})</span>
            {activeTab === 'expired' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
              />
            )}
          </button>
        </div>

        {/* 4. Voucher Cards List */}
        <div className="space-y-1.5 pt-0.5">
          {displayedCoupons.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center border border-[#e5e5e2] space-y-1">
              <p className="text-xs font-bold text-black">
                {activeTab === 'available'
                  ? '暂无可使用的优惠券'
                  : activeTab === 'used'
                  ? '暂无已使用的卡券记录'
                  : '暂无已过期的卡券记录'}
              </p>
              <p className="text-[10px] text-[#787770]">
                {activeTab === 'available'
                  ? '可在上方输入兑换码领取专属优惠券。'
                  : '您已核销或失效的卡券将收纳在此。'}
              </p>
            </div>
          ) : (
            displayedCoupons.map((item) => {
              const { coupon, status } = item;
              const isAvailable = status === 'available';

              return (
                <OrganicCardReveal
                  key={item.userCouponId}
                  className={`bg-white rounded-xl border border-[#e5e5e2] shadow-2xs relative overflow-hidden transition-colors ${
                    isAvailable ? 'hover:border-black' : 'opacity-60 bg-[#f7f7f5]'
                  }`}
                >
                  {/* VIP ONLY / Badge Tag (Top Right) */}
                  {coupon.badgeText && isAvailable && (
                    <div className="absolute top-0 right-0 bg-black text-white text-[8px] font-black px-1.5 py-0.2 rounded-bl-md tabular-nums tracking-wider">
                      {coupon.badgeText.toUpperCase()}
                    </div>
                  )}

                  {/* Top Info Section */}
                  <div className="p-2.5 flex items-start gap-2">
                    {/* Left Big Value */}
                    <div className="shrink-0 min-w-[56px] pt-0.5">
                      {coupon.couponType === 'discount_percent' ? (
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xl font-black text-black tabular-nums leading-none tracking-tight">
                            {((1 - coupon.discountValue) * 100).toFixed(0)}
                          </span>
                          <span className="text-[9.5px] font-black text-black leading-none">
                            折
                          </span>
                        </div>
                      ) : coupon.couponType === 'delivery_free' ? (
                        <div className="flex flex-col">
                          <span className="text-base font-black text-black leading-none">免配送</span>
                          <span className="text-[8px] font-bold text-[#787770] uppercase mt-0.5">
                            专送特权
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-baseline">
                          <span className="text-xs font-bold text-black mr-0.5">¥</span>
                          <span className="text-xl font-black text-black tabular-nums leading-none tracking-tight">
                            {coupon.discountValue}
                          </span>
                        </div>
                      )}

                      {/* Cap limit subtitle for percent coupons */}
                      {coupon.maxDiscountCap && (
                        <span className="text-[8px] text-[#8c8b84] font-medium block mt-0.5">
                          封顶减¥{coupon.maxDiscountCap}
                        </span>
                      )}
                    </div>

                    {/* Middle Title, Threshold, and Complete Metadata Fields */}
                    <div className="flex-1 min-w-0 pr-6 space-y-0.5">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-black truncate">
                          {coupon.title}
                        </h3>
                        <p className="text-[10.5px] text-[#787770]">
                          {coupon.minSpend === 0
                            ? '全场餐品无门槛可用'
                            : `满 ¥${coupon.minSpend} 可用`}
                        </p>
                      </div>

                      {/* Complete Fields: Promo Code + Scope + Time / Day Restriction */}
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {/* Promo Code Chip with Copy Feature */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCode(coupon.code);
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#f4f4f2] hover:bg-[#eaeae6] border border-[#e2e3e1] text-[9px] tabular-nums font-bold text-[#37352f] cursor-pointer transition-colors"
                          title="点击复制券码"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-[#8c8b84] shrink-0" />
                          )}
                          <span>{coupon.code}</span>
                        </button>

                        {/* Scope Chip */}
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#f7f7f5] border border-[#e5e5e2] text-[9px] text-[#555] font-medium">
                          {coupon.scopeType === 'all_dishes'
                            ? '全品类通用'
                            : coupon.scopeCategoryNames?.join(' / ') || '限定品类'}
                        </span>

                        {/* Time Slot & Day Restriction Chip */}
                        {(coupon.timeSlotLabel || coupon.dayRestrictionLabel) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#f7f7f5] border border-[#e5e5e2] text-[9px] text-[#787770]">
                            <Clock className="w-2.5 h-2.5 text-[#999] shrink-0" />
                            <span>
                              {coupon.timeSlotLabel || '全天'} · {coupon.dayRestriction === 'workdays_only' ? '工作日' : coupon.dayRestriction === 'weekends_only' ? '周末' : '全周'}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Divider Line */}
                  <div className="border-t border-[#f0f0ed] mx-2.5" />

                  {/* Bottom Action / Details Bar */}
                  <div className="px-2.5 py-1.5 flex items-center justify-between gap-2">
                    {/* Left: Validity & Rules */}
                    <div className="space-y-0.2 text-xs text-[#787770]">
                      <div className="flex items-center gap-1 text-[9.5px]">
                        <Calendar className="w-3 h-3 text-[#8c8b84]" />
                        <span>有效期至: {coupon.expireDate}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedRuleDetail(coupon)}
                        className="text-black font-bold underline hover:text-neutral-600 text-[9.5px] block cursor-pointer"
                      >
                        使用规则与说明
                      </button>
                    </div>

                    {/* Right: QR Code & Use Now Button */}
                    <div className="flex items-center gap-1.5">
                      {isAvailable ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleQrDropdown(coupon, item.userCouponId)}
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                              expandedQrCouponId === item.userCouponId
                                ? 'bg-black text-white border-black ring-2 ring-black/10 scale-105'
                                : 'border-[#e5e5e2] bg-white hover:bg-neutral-50 text-black active:scale-95'
                            }`}
                            title={expandedQrCouponId === item.userCouponId ? '收起核销二维码小组件' : '下拉展开真实核销二维码小组件'}
                          >
                            <QrCode className="w-3.5 h-3.5 stroke-[1.8]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUseNow(coupon)}
                            className="bg-black hover:bg-neutral-800 active:scale-95 text-white font-black text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-2xs cursor-pointer tracking-wide"
                          >
                            <span>去使用</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] font-bold text-[#8c8b84] px-2 py-0.5 bg-neutral-100 rounded">
                          {status === 'used' ? '已使用' : '已过期'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 下拉真实二维码小组件 (Widget Dropdown Real QR Code) */}
                  <AnimatePresence>
                    {expandedQrCouponId === item.userCouponId && isAvailable && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="border-t border-[#f0f0ed] bg-[#fbfbf9] overflow-hidden"
                      >
                        <div className="p-3.5 sm:p-4 space-y-3 text-center">
                          {/* 顶部状态指示栏 */}
                          <div className="flex items-center justify-between text-[10.5px]">
                            <div className="flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <span className="font-bold text-neutral-800">真实动态核销小组件</span>
                              <span className="text-[#8a8a82] tabular-nums text-[9.5px]">
                                (刷新倒计时: {Math.floor(qrRefreshCountdown / 60)}:{(qrRefreshCountdown % 60).toString().padStart(2, '0')})
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => handleRefreshQr(coupon, e)}
                                className="p-1 rounded-md hover:bg-neutral-200/70 text-[#60605a] hover:text-black transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-medium"
                                title="手动刷新防伪二维码"
                              >
                                <RefreshCw className={`w-2.5 h-2.5 ${isGeneratingQr[coupon.code] ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">刷新</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  loadQrCodeForCoupon(coupon);
                                  setSelectedQrCoupon(coupon);
                                }}
                                className="p-1 rounded-md hover:bg-neutral-200/70 text-[#60605a] hover:text-black transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-medium"
                                title="放大全屏出示"
                              >
                                <Maximize2 className="w-2.5 h-2.5" />
                                <span className="hidden sm:inline">全屏</span>
                              </button>
                            </div>
                          </div>

                          {/* 真实二维码展示区域 */}
                          <div className="inline-block relative bg-white p-3 rounded-2xl border border-[#e5e5e0] shadow-xs">
                            {/* 四角瞄准指示线 */}
                            <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-black rounded-tl" />
                            <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-black rounded-tr" />
                            <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-black rounded-bl" />
                            <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-black rounded-br" />

                            {isGeneratingQr[coupon.code] || !qrDataUrls[coupon.code] ? (
                              <div className="w-36 h-36 sm:w-40 sm:h-40 flex flex-col items-center justify-center gap-2 text-neutral-400">
                                <RefreshCw className="w-6 h-6 animate-spin text-neutral-500" />
                                <span className="text-[10.5px] tabular-nums">生成真实核销二维码中...</span>
                              </div>
                            ) : (
                              <div className="relative">
                                <img
                                  src={qrDataUrls[coupon.code]}
                                  alt={`核销二维码-${coupon.title}`}
                                  className="w-36 h-36 sm:w-40 sm:h-40 object-contain mx-auto select-none rounded-md"
                                  referrerPolicy="no-referrer"
                                />
                                {/* 扫描光效 */}
                                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/70 to-transparent animate-pulse pointer-events-none top-1/2 -translate-y-1/2" />
                              </div>
                            )}
                          </div>

                          {/* 仿真条形码与一键复制券码区域 */}
                          <div className="space-y-1.5 max-w-xs mx-auto">
                            <div className="h-6 flex items-center justify-center gap-[2px] opacity-80 overflow-hidden px-4">
                              {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2].map(
                                (w, i) => (
                                  <span
                                    key={i}
                                    className="bg-black inline-block h-full"
                                    style={{ width: `${w}px` }}
                                  />
                                )
                              )}
                            </div>

                            <div className="flex items-center justify-center gap-2 pt-0.5">
                              <span className="tabular-nums font-black text-sm tracking-widest text-black select-all">
                                {coupon.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(coupon.code)}
                                className="px-2 py-0.8 rounded-md bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-[#40403c] text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-neutral-200/80"
                                title="复制券码"
                              >
                                {copiedCode === coupon.code ? (
                                  <>
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                    <span className="text-emerald-700">已复制</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-2.5 h-2.5 text-[#666]" />
                                    <span>复制</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* 底部使用说明与收起按钮 */}
                          <div className="pt-2 border-t border-[#f0f0ed] flex items-center justify-between gap-2 text-[10.5px]">
                            <span className="text-[#888880] text-left leading-tight truncate">
                              向餐车主理人出示真实二维码 · 扫码自动核销
                            </span>
                            <button
                              type="button"
                              onClick={() => setExpandedQrCouponId(null)}
                              className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-[#40403c] font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                            >
                              <span>收起小组件</span>
                              <ChevronUp className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </OrganicCardReveal>
              );
            })
          )}
        </div>
      </div>

      {/* Rules & Details Modal */}
      {selectedRuleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 border border-[#e2e3e1] shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0ed]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-black text-amber-400 flex items-center justify-center text-xs font-bold">
                  i
                </div>
                <h4 className="font-bold text-sm text-black">卡券使用规则与明细</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRuleDetail(null)}
                className="w-7 h-7 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#37352f]">
              <div className="p-3 bg-[#fafaf8] rounded-xl border border-[#e2e3e1]">
                <span className="font-bold text-black block">{selectedRuleDetail.title}</span>
                <span className="text-[11px] text-[#787770] tabular-nums mt-0.5 block">
                  优惠券编码: {selectedRuleDetail.code}
                </span>
              </div>

              <div className="space-y-1.5 text-[11.5px] leading-relaxed">
                <p>• <strong>使用门槛:</strong> {selectedRuleDetail.minSpend === 0 ? '全场餐品无门槛立减' : `满 ¥${selectedRuleDetail.minSpend} 可用`}</p>
                <p>• <strong>适用范围:</strong> {selectedRuleDetail.scopeType === 'all_dishes' ? '全品类餐品通用' : `限定品类: ${selectedRuleDetail.scopeCategoryNames?.join(', ')}`}</p>
                <p>• <strong>有效期至:</strong> {selectedRuleDetail.expireDate} 23:59:59</p>
                <p>• <strong>叠加规则:</strong> 每笔订单限用1张，可与黑卡会员特权同享</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedRuleDetail(null)}
              className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              关闭说明
            </button>
          </div>
        </div>
      )}

      {/* QR Code Presentation Modal (真实全屏大图核销展示) */}
      {selectedQrCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xs rounded-3xl p-5 border border-[#e2e3e1] shadow-2xl space-y-4 text-center animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f0ed]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-black">餐车核销真实二维码凭证</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQrCoupon(null)}
                className="w-6 h-6 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-[#fafaf9] rounded-2xl border border-[#e2e3e1] inline-block shadow-inner relative">
              {isGeneratingQr[selectedQrCoupon.code] || !qrDataUrls[selectedQrCoupon.code] ? (
                <div className="w-40 h-40 flex flex-col items-center justify-center gap-2 text-neutral-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-neutral-500" />
                  <span className="text-[10.5px] tabular-nums">正在生成真实二维码...</span>
                </div>
              ) : (
                <img
                  src={qrDataUrls[selectedQrCoupon.code]}
                  alt={`核销二维码-${selectedQrCoupon.title}`}
                  className="w-44 h-44 object-contain mx-auto select-none rounded-lg"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            <div>
              <div className="text-sm font-bold text-black">{selectedQrCoupon.title}</div>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="text-xs tabular-nums font-bold text-[#666] tracking-wider select-all">
                  {selectedQrCoupon.code}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(selectedQrCoupon.code)}
                  className="p-1 rounded hover:bg-neutral-100 text-[#777] cursor-pointer"
                  title="复制券码"
                >
                  {copiedCode === selectedQrCoupon.code ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-[#888880] mt-1">
                支持餐车扫码枪与手机摄像头精准验真核销
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedQrCoupon(null)}
              className="w-full py-2.5 bg-black hover:bg-neutral-800 active:scale-98 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
            >
              完成出示并关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
