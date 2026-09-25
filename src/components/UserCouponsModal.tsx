import React, { useState, useMemo } from 'react';
import {
  Ticket,
  Clock,
  Calendar,
  Layers,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowRight,
  X,
  Sparkles,
  Search,
  Filter,
  PlusCircle,
  Flame,
  Info,
  Gift,
  HelpCircle,
  Check,
  Zap,
  Tag,
  Percent,
  DollarSign,
  Truck,
  QrCode,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CouponItem, UserCouponRecord } from '../types/coupon';
import { INITIAL_USER_COUPONS, INITIAL_MERCHANT_COUPONS } from '../data/mockCoupons';
import { safeGetStorage, safeSetStorage } from '../utils/safeStorage';

interface UserCouponsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCouponToUse?: (couponCode: string) => void;
  onGoToMenu?: () => void;
  isVIPActive?: boolean;
}

export const UserCouponsModal: React.FC<UserCouponsModalProps> = ({
  isOpen,
  onClose,
  onSelectCouponToUse,
  onGoToMenu,
  isVIPActive = true
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'market' | 'used' | 'expired'>('available');
  const [couponInput, setCouponInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedRuleDetail, setSelectedRuleDetail] = useState<CouponItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load User Coupons from safe storage
  const [userCoupons, setUserCoupons] = useState<UserCouponRecord[]>(() => {
    return safeGetStorage<UserCouponRecord[]>('obsidian_user_coupons', INITIAL_USER_COUPONS);
  });

  // Load Merchant Available Coupons from safe storage for Market tab
  const merchantCoupons: CouponItem[] = useMemo(() => {
    return safeGetStorage<CouponItem[]>('obsidian_merchant_coupons', INITIAL_MERCHANT_COUPONS);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const saveUserCoupons = (newList: UserCouponRecord[]) => {
    setUserCoupons(newList);
    safeSetStorage('obsidian_user_coupons', newList);
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

  // Market claimable coupons
  const marketCoupons = useMemo(() => {
    return merchantCoupons.filter((mc) => mc.status === 'active');
  }, [merchantCoupons]);

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
        return sum + (item.coupon.maxDiscountCap || 12);
      }
      return sum;
    }, 0);
  }, [availableCoupons]);

  if (!isOpen) return null;

  // Code redemption handler
  const handleRedeemCode = (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const targetCode = (customCode || couponInput).trim().toUpperCase();
    if (!targetCode) {
      showToast('请输入有效的优惠券兑换码');
      return;
    }

    const alreadyHas = userCoupons.find(
      (uc) => uc.coupon.code.toUpperCase() === targetCode && uc.status === 'available'
    );
    if (alreadyHas) {
      showToast(`您已持有该卡券【${alreadyHas.coupon.title}】`);
      setCouponInput('');
      return;
    }

    const matched = merchantCoupons.find((mc) => mc.code.toUpperCase() === targetCode);
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
      const dynamicCoupon: CouponItem = {
        id: `cpn-custom-${Date.now()}`,
        code: targetCode,
        title: `限时直减礼遇券 (${targetCode})`,
        subtitle: '官方兑换 · 黑曜石全品类现制可用',
        couponType: 'amount_cut',
        discountValue: 8.0,
        minSpend: 40.0,
        scopeType: 'all_dishes',
        timeSlotType: 'all_day',
        timeSlotLabel: '全天通用',
        dayRestriction: 'all_week',
        dayRestrictionLabel: '全周通用',
        designStyle: 'black_gold',
        badgeText: '特邀礼遇',
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
      showToast(`🎉 兑换成功！已录入「${dynamicCoupon.title}」`);
      setCouponInput('');
      setActiveTab('available');
    }
  };

  const handleClaimMarketCoupon = (coupon: CouponItem) => {
    const alreadyHas = userCoupons.find(
      (uc) => uc.couponId === coupon.id && uc.status === 'available'
    );
    if (alreadyHas) {
      showToast(`您已拥有「${coupon.title}」`);
      return;
    }
    const newRecord: UserCouponRecord = {
      userCouponId: `uc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      couponId: coupon.id,
      coupon,
      status: 'available',
      acquiredAt: new Date().toISOString().slice(0, 10)
    };
    saveUserCoupons([newRecord, ...userCoupons]);
    showToast(`🎁 领取成功！「${coupon.title}」已存入券包`);
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    showToast(`券码【${code}】已复制`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleUseCoupon = (coupon: CouponItem) => {
    if (onSelectCouponToUse) {
      onSelectCouponToUse(coupon.code);
      onClose();
    } else if (onGoToMenu) {
      onGoToMenu();
      onClose();
    } else {
      onClose();
    }
  };

  const currentList =
    activeTab === 'available'
      ? availableCoupons
      : activeTab === 'used'
      ? usedCoupons
      : expiredCoupons;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/75 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-[#f9f9f7] w-full max-w-2xl max-h-[90vh] rounded-2xl border border-[#e2e3e1] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0d0d0e] text-white text-xs px-3 py-1.5 rounded-full shadow-xl border border-neutral-700 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Header */}
        <div className="bg-[#0d0d0e] text-white p-3 sm:p-3.5 flex items-center justify-between border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shadow-sm shrink-0">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                  优惠券管理中心
                </h3>
                <span className="text-[9.5px] bg-amber-400 text-black px-1.5 py-0.2 rounded-full tabular-nums font-bold">
                  {availableCoupons.length} 张可用
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                累计最高可省 <span className="text-amber-400 font-bold">¥{totalPotentialSavings.toFixed(0)}</span>，自动匹配结算最优方案
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Promo Code Input Bar */}
        <div className="p-2.5 bg-white border-b border-[#e2e3e1] shrink-0">
          <form
            onSubmit={(e) => handleRedeemCode(e)}
            className="flex items-center gap-2 bg-[#f4f4f2] border border-[#e2e3e1] rounded-xl p-1"
          >
            <Tag className="w-3.5 h-3.5 text-amber-500 ml-1.5 shrink-0" />
            <input
              type="text"
              placeholder="输入优惠券兑换码 (如：UR-VIP5、UR-LUNCH10、UR-DRINK88)..."
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              className="flex-1 text-xs bg-transparent outline-none tabular-nums uppercase px-1.5 text-black placeholder:text-neutral-400"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              兑换
            </button>
          </form>
        </div>

        {/* Tabs Bar */}
        <div className="px-3 pt-2 pb-1.5 bg-[#f9f9f7] flex items-center gap-1.5 border-b border-[#e8e8e4] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('available')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'available'
                ? 'bg-black text-white'
                : 'text-[#5a5854] hover:text-black hover:bg-neutral-200/60'
            }`}
          >
            <span>可使用</span>
            <span className="text-[9.5px] tabular-nums opacity-80">{availableCoupons.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('market')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'market'
                ? 'bg-black text-white'
                : 'text-[#5a5854] hover:text-black hover:bg-neutral-200/60'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>领券中心</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('used')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'used'
                ? 'bg-black text-white'
                : 'text-[#5a5854] hover:text-black hover:bg-neutral-200/60'
            }`}
          >
            <span>已使用</span>
            <span className="text-[9.5px] tabular-nums opacity-80">{usedCoupons.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expired')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'expired'
                ? 'bg-black text-white'
                : 'text-[#5a5854] hover:text-black hover:bg-neutral-200/60'
            }`}
          >
            <span>已过期</span>
            <span className="text-[9.5px] tabular-nums opacity-80">{expiredCoupons.length}</span>
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {activeTab === 'market' ? (
            <div className="space-y-2.5">
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                <span className="font-bold">黑曜石餐车福利派发专区</span>
                <span className="text-[9.5px] text-amber-700">每位会员均可一键免费领取</span>
              </div>

              <div className="space-y-2">
                {marketCoupons.map((coupon) => {
                  const isClaimed = userCoupons.some(
                    (uc) => uc.couponId === coupon.id && uc.status === 'available'
                  );
                  return (
                    <div
                      key={coupon.id}
                      className="bg-white rounded-xl border border-[#e2e3e1] p-2.5 sm:p-3 flex items-center justify-between gap-2.5 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-12 h-12 rounded-lg bg-black text-white flex flex-col items-center justify-center shrink-0">
                          {coupon.couponType === 'discount_percent' ? (
                            <span className="text-sm font-black text-amber-400 tabular-nums">
                              {(coupon.discountValue * 10).toFixed(1)}折
                            </span>
                          ) : coupon.couponType === 'delivery_free' ? (
                            <span className="text-[11px] font-black text-sky-400">免运费</span>
                          ) : (
                            <span className="text-sm font-black text-amber-400 tabular-nums">
                              ¥{coupon.discountValue}
                            </span>
                          )}
                          <span className="text-[7.5px] text-neutral-400">
                            {coupon.minSpend === 0 ? '无门槛' : `满¥${coupon.minSpend}`}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-black">{coupon.title}</h4>
                            {coupon.badgeText && (
                              <span className="text-[8px] bg-black text-amber-300 px-1 py-0.2 rounded tabular-nums font-bold">
                                {coupon.badgeText}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#787770] mt-0.5">{coupon.subtitle}</p>
                          <div className="text-[9px] text-neutral-500 mt-0.5">
                            {coupon.timeSlotLabel} · {coupon.dayRestrictionLabel}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isClaimed}
                        onClick={() => handleClaimMarketCoupon(coupon)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all shrink-0 ${
                          isClaimed
                            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                            : 'bg-black hover:bg-neutral-800 text-white shadow-xs'
                        }`}
                      >
                        {isClaimed ? '已在券包' : '免费领取'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : currentList.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#787770] space-y-1.5">
              <Ticket className="w-7 h-7 text-neutral-300 mx-auto" />
              <p>暂无相关卡券记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentList.map((item) => {
                const { coupon, status } = item;
                const isAvailable = status === 'available';

                return (
                  <div
                    key={item.userCouponId}
                    className={`bg-white rounded-xl border p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs transition-all ${
                      isAvailable ? 'border-[#e2e3e1]' : 'border-neutral-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Value pill */}
                      <div
                        className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0 ${
                          isAvailable ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {coupon.couponType === 'discount_percent' ? (
                          <span className="text-sm font-black text-amber-400 tabular-nums">
                            {(coupon.discountValue * 10).toFixed(1)}折
                          </span>
                        ) : coupon.couponType === 'delivery_free' ? (
                          <span className="text-[11px] font-black text-sky-400">免运费</span>
                        ) : (
                          <span className="text-sm font-black text-amber-400 tabular-nums">
                            ¥{coupon.discountValue}
                          </span>
                        )}
                        <span className="text-[7.5px] opacity-70">
                          {coupon.minSpend === 0 ? '无门槛' : `满¥${coupon.minSpend}`}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-black">{coupon.title}</h4>
                          {coupon.badgeText && (
                            <span className="text-[8px] bg-black text-amber-300 px-1 py-0.2 rounded tabular-nums font-bold">
                              {coupon.badgeText}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#787770]">{coupon.subtitle}</p>
                        
                        {/* Complete tags */}
                        <div className="flex flex-wrap items-center gap-1 text-[9px]">
                          <span className="tabular-nums font-bold bg-[#f4f4f2] text-[#444] px-1 py-0.2 rounded border border-[#e2e3e1]">
                            {coupon.code}
                          </span>
                          <span className="text-neutral-500 bg-[#f7f7f5] px-1 py-0.2 rounded border border-[#e8e8e4]">
                            {coupon.scopeType === 'all_dishes' ? '全品类通用' : coupon.scopeCategoryNames?.join('/') || '限定品类'}
                          </span>
                          <span className="text-neutral-500">
                            至 {coupon.expireDate} 有效 · {coupon.timeSlotLabel || '全天'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5 shrink-0">
                      {isAvailable ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(coupon.code)}
                            className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
                            title="复制券码"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUseCoupon(coupon)}
                            className="px-3 py-1 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                          >
                            立即使用
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-medium text-neutral-400">
                          {status === 'used' ? '已核销' : '已过期'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-2.5 bg-[#f0f0ed] border-t border-[#e2e3e1] flex items-center justify-between text-xs text-[#787770] shrink-0">
          <span className="text-[11px]">黑曜石餐车网络 · 结算时自动推荐最佳抵扣券</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white border border-[#e2e3e1] hover:bg-neutral-100 text-black font-bold rounded-lg transition-colors cursor-pointer text-xs"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
