import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Ticket,
  MapPin,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  Bike,
  Utensils,
  Smartphone,
  Store,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem, DishItem, BoundTableInfo } from '../types';
import { DiningMode } from './DiningModeSelector';
import { UserRole } from './RoleSwitcherDropdown';
import { TableBindModal } from './table/TableBindModal';
import { getCurrentBoundTable, setCurrentBoundTable } from '../utils/tableStorage';
import {
  DeliverySettings,
  getDeliverySettings,
  calculateDeliveryThreshold,
  DELIVERY_SETTINGS_EVENT
} from '../utils/deliverySettings';
import { useToast } from './ui/ToastContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onCheckout: (notes: string, couponCode: string) => void;
  onProceedToCheckout?: () => void;
  deliveryAddress: string;
  onOpenAddress?: () => void;
  isVIPActive: boolean;
  diningMode?: DiningMode;
  onDiningModeChange?: (mode: DiningMode) => void;
  currentRole?: UserRole;
  onSelectRole?: (role: UserRole) => void;
  pendingOrdersCount?: number;
  minDeliveryAmount?: number;
  deliverySettings?: DeliverySettings;
  dishes?: DishItem[];
  onAddToCart?: (dish: DishItem) => void;
  onGoToCategory?: (category: string, subCategory?: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onProceedToCheckout,
  deliveryAddress,
  onOpenAddress,
  isVIPActive,
  diningMode = 'delivery',
  onDiningModeChange,
  currentRole = 'customer',
  onSelectRole,
  pendingOrdersCount = 0,
  minDeliveryAmount: propMinDeliveryAmount,
  deliverySettings: propDeliverySettings,
  dishes = [],
  onAddToCart,
  onGoToCategory
}) => {
  const toast = useToast();
  const [orderNotes, setOrderNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>('UR-VIP5');
  const [packagingPreference, setPackagingPreference] = useState<'eco' | 'standard'>('eco');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Collapsible drawers/sections for checkout details (default collapsed)
  const [activeDrawer, setActiveDrawer] = useState<'coupon' | 'packaging' | 'notes' | null>(null);

  // 堂食桌台绑定状态
  const [boundTable, setBoundTable] = useState<BoundTableInfo | null>(() => getCurrentBoundTable());
  const [isTableBindModalOpen, setIsTableBindModalOpen] = useState(false);

  useEffect(() => {
    const handleBoundTableChange = (e: any) => {
      if (e.detail) {
        setBoundTable(e.detail);
      }
    };
    window.addEventListener('obsidian_bound_table_changed', handleBoundTableChange);
    return () => window.removeEventListener('obsidian_bound_table_changed', handleBoundTableChange);
  }, []);

  // Delivery settings reactive state
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(() => {
    return propDeliverySettings || getDeliverySettings();
  });

  useEffect(() => {
    const handleSettingsEvent = (e: Event) => {
      const customEvent = e as CustomEvent<DeliverySettings>;
      if (customEvent.detail) {
        setDeliverySettings(customEvent.detail);
      }
    };
    window.addEventListener(DELIVERY_SETTINGS_EVENT, handleSettingsEvent);
    return () => {
      window.removeEventListener(DELIVERY_SETTINGS_EVENT, handleSettingsEvent);
    };
  }, []);

  if (!isOpen) return null;

  const effectiveSettings: DeliverySettings = {
    ...deliverySettings,
    minDeliveryAmount: propMinDeliveryAmount !== undefined ? propMinDeliveryAmount : deliverySettings.minDeliveryAmount
  };

  const subtotal = items.reduce((sum, item) => sum + item.calculatedPrice, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const discount = (appliedCoupon || isVIPActive) ? 5 : 0;

  // Calculate threshold using unified helper with strict post-discount deduction
  const thresholdCalc = calculateDeliveryThreshold(subtotal, discount, diningMode, effectiveSettings);
  const {
    isEligible,
    amountNeeded,
    actualAmount,
    minDeliveryAmount,
    freeDeliveryThreshold,
    effectiveDeliveryFee,
    grandTotal
  } = thresholdCalc;

  const handleApplyCoupon = () => {
    if (couponCode.trim()) {
      setAppliedCoupon(couponCode.trim());
      toast.success('优惠券已使用', `已应用兑换码 [${couponCode.trim()}] 立减 ¥5.00`);
    }
  };

  const handlePay = () => {
    if (items.length === 0) {
      toast.info('餐车清单为空', '请先在菜单中挑选心仪餐品');
      return;
    }

    if (diningMode === 'dine_in' && !boundTable) {
      toast.warning('请先绑定就餐桌台', '堂食下单需关联餐车外摆或吧台桌号，方便后厨出餐与传菜');
      setIsTableBindModalOpen(true);
      return;
    }

    if (!isEligible && diningMode === 'delivery') {
      toast.error(
        '未达到外卖起送金额',
        `外卖起送需剔除优惠后实付满 ¥${minDeliveryAmount.toFixed(2)}，当前实付 ¥${actualAmount.toFixed(2)}，还差 ¥${amountNeeded.toFixed(2)} 起送`
      );
      return;
    }

    if (onProceedToCheckout) {
      onProceedToCheckout();
      onClose();
    } else {
      onCheckout(orderNotes, appliedCoupon || '');
      onClose();
    }
  };

  const toggleDrawer = (drawerName: 'coupon' | 'packaging' | 'notes') => {
    setActiveDrawer((prev) => (prev === drawerName ? null : drawerName));
  };

  const handleModeSelect = (mode: DiningMode) => {
    if (onDiningModeChange) {
      onDiningModeChange(mode);
    }
    if (mode === 'dine_in' && !boundTable) {
      setIsTableBindModalOpen(true);
    }
  };

  const roles = [
    { key: 'customer' as UserRole, label: '客户端', icon: Smartphone },
    { key: 'merchant' as UserRole, label: `商家端 (${pendingOrdersCount})`, icon: Store },
    { key: 'rider' as UserRole, label: '骑手端', icon: Bike },
    { key: 'platform' as UserRole, label: '平台端', icon: ShieldCheck }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-end sm:items-stretch sm:justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet Container: Square edges / no rounded corners on cart container */}
      <div className="relative w-full sm:w-[480px] md:w-[500px] max-h-[92vh] sm:max-h-full sm:h-full bg-[#fcfcfb] rounded-none shadow-2xl border-t sm:border-t-0 sm:border-l border-[#e2e3e1] flex flex-col z-10 animate-in slide-in-from-bottom-6 sm:slide-in-from-right duration-250">
        {/* Mobile Pull Handle Indicator */}
        <div className="sm:hidden w-full pt-3 pb-1 flex justify-center cursor-grab shrink-0">
          <div className="w-10 h-1 rounded-none bg-neutral-300" />
        </div>

        {/* Integrated Drawer Header: Title + Clear + Close */}
        <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-[#e2e3e1] bg-white shrink-0 space-y-2">
          {/* Top Row: Title + Status + Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-[#1a1c1b] truncate">餐车选购清单</h2>
                <span className="px-2 py-0.5 rounded-none bg-[#f4f4f2] border border-[#e2e3e1] text-[10.5px] font-bold text-[#1a1c1b] shrink-0">
                  {totalCount} 件餐品
                </span>
              </div>
              <p className="text-[10.5px] text-[#787770] truncate mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-none bg-emerald-500 shrink-0 inline-block"></span>
                黑曜石 01 号车 · 实时制作配送
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="text-xs font-semibold text-[#787770] hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  title="清空选购单"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-6.5 h-6.5 rounded-full bg-[#f4f4f2] hover:bg-[#e8e8e6] text-[#1a1c1b] flex items-center justify-center transition-colors cursor-pointer border border-[#e2e3e1]"
                title="关闭抽屉"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Integrated Capsule Bar inside Drawer: [外卖 | 堂食 | 自提] + [客户端 ⌄] */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#f0f0ed]">
            {/* Dining Mode Segmented Selector (外卖 / 堂食 / 自提) */}
            <div className="flex items-center bg-[#1a1c1b] p-0.5 rounded-none shadow-xs flex-1 max-w-[270px] gap-0.5">
              <button
                type="button"
                onClick={() => handleModeSelect('delivery')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs transition-all cursor-pointer select-none border-2 ${
                  diningMode === 'delivery'
                    ? 'bg-white text-sky-600 border-sky-500 font-black shadow-xs'
                    : 'text-neutral-300 hover:text-white border-transparent font-medium'
                }`}
              >
                <Bike className={`w-3.5 h-3.5 ${diningMode === 'delivery' ? 'text-sky-600' : ''}`} />
                <span>外卖</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeSelect('dine_in')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs transition-all cursor-pointer select-none border-2 ${
                  diningMode === 'dine_in'
                    ? 'bg-white text-amber-600 border-amber-500 font-black shadow-xs'
                    : 'text-neutral-300 hover:text-white border-transparent font-medium'
                }`}
              >
                <Utensils className={`w-3.5 h-3.5 ${diningMode === 'dine_in' ? 'text-amber-600' : ''}`} />
                <span>堂食</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeSelect('pickup')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs transition-all cursor-pointer select-none border-2 ${
                  diningMode === 'pickup'
                    ? 'bg-white text-emerald-600 border-emerald-500 font-black shadow-xs'
                    : 'text-neutral-300 hover:text-white border-transparent font-medium'
                }`}
              >
                <ShoppingBag className={`w-3.5 h-3.5 ${diningMode === 'pickup' ? 'text-emerald-600' : ''}`} />
                <span>自提</span>
              </button>
            </div>

            {/* Role Switcher Button integrated in drawer */}
            {onSelectRole && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#1a1c1b] text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer border border-neutral-700 shadow-xs"
                >
                  <Smartphone className="w-3 h-3 text-neutral-300" />
                  <span>{currentRole === 'merchant' ? '商家端' : currentRole === 'rider' ? '骑手端' : '客户端'}</span>
                  <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isRoleDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-36 bg-white rounded-none shadow-xl border border-[#e2e3e1] py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                    {roles.map((r) => {
                      const Icon = r.icon;
                      const isActive = currentRole === r.key;
                      return (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => {
                            onSelectRole(r.key);
                            setIsRoleDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1.5 text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                            isActive ? 'bg-black text-white font-bold' : 'text-[#1a1c1b] hover:bg-[#f4f4f2]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5" />
                            <span>{r.label}</span>
                          </div>
                          {isActive && <div className="w-1.5 h-1.5 rounded-none bg-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Clear Confirmation Modal Bar */}
        {showClearConfirm && (
          <div className="bg-red-50 border-b border-red-200 px-3.5 py-2 flex items-center justify-between text-xs text-red-900 animate-in fade-in duration-150 shrink-0">
            <span className="font-semibold">确定要清空全部餐品吗？</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-0.5 rounded bg-white border border-red-200 text-red-700 font-bold hover:bg-neutral-50 cursor-pointer text-[11px]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearCart();
                  setShowClearConfirm(false);
                }}
                className="px-2 py-0.5 rounded bg-red-600 text-white font-bold hover:bg-red-700 cursor-pointer shadow-2xs text-[11px]"
              >
                确定清空
              </button>
            </div>
          </div>
        )}

        {/* Delivery / Dine-in / Pickup Address Banner */}
        {items.length > 0 && (
          <div className="px-3.5 py-1.5 bg-[#f5fbf7] border-b border-[#d8eee1] flex items-center justify-between text-xs text-[#0f5132] shrink-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <MapPin className="w-3.5 h-3.5 text-[#006d36] shrink-0" />
              <span className="font-bold shrink-0">
                {diningMode === 'delivery'
                  ? '送至:'
                  : diningMode === 'dine_in'
                  ? '堂食桌台:'
                  : '自提点:'}
              </span>
              <span className="truncate font-medium">
                {diningMode === 'delivery'
                  ? deliveryAddress
                  : diningMode === 'dine_in'
                  ? boundTable
                    ? `${boundTable.zoneLabel} · ${boundTable.code} 号桌 (${boundTable.guests}人就餐)`
                    : '尚未绑定桌台（点击右侧选桌/扫码）'
                  : '黑曜石餐车 01 号（大悦城北座中庭 · 免运费即取）'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {diningMode === 'dine_in' && (
                <button
                  type="button"
                  onClick={() => setIsTableBindModalOpen(true)}
                  className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded text-[10.5px] font-bold cursor-pointer transition-colors"
                >
                  {boundTable ? `${boundTable.code}号桌 换桌` : '选座/扫码'}
                </button>
              )}

              {isVIPActive && (
                <span className="bg-[#FFF8E1] text-[#976000] border border-[#FFE082] px-2 py-0.5 rounded-none text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-[#B78103]" /> VIP优先制作
                </span>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Items Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-2.5 hide-scrollbar">
          {items.length === 0 ? (
            <div className="space-y-3">
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center p-4 text-[#787770]">
                <div className="w-12 h-12 rounded-none bg-white border border-[#e2e3e1] flex items-center justify-center mb-2 text-neutral-400 shadow-xs">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#1a1c1b] mb-0.5">餐车清单还是空的</p>
                <p className="text-xs max-w-[220px] mb-3 text-[#787770]">
                  快去探索黑曜石招牌炭烤汉堡、黑松露薯条或暗夜冷萃咖啡！
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                  探索餐车菜品
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#1a1c1b] px-0.5">
                <span>已点餐品明细</span>
                <span className="text-[10.5px] text-[#787770] font-normal">
                  共 {totalCount} 份
                </span>
              </div>

              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.div
                    key={item.cartItemId}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30, height: 0, overflow: 'hidden', padding: 0, marginBottom: 0 }}
                    transition={{ duration: 0.22 }}
                    className="p-2.5 bg-white rounded-none border border-[#e2e3e1] shadow-2xs flex items-start gap-2.5 transition-colors"
                  >
                    <img
                      src={item.selectedVariant?.imageUrl || item.dish.imageUrl}
                      alt={item.selectedVariant ? `${item.dish.name} - ${item.selectedVariant.name}` : item.dish.name}
                      className="w-14 h-14 rounded-none object-cover shrink-0 border border-[#e2e3e1]"
                    />
                    <div className="flex-grow min-w-0 flex flex-col justify-between self-stretch">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#1a1c1b] truncate">
                          {item.dish.name}
                        </h4>

                        {/* Variant Badge */}
                        {item.selectedVariant && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="inline-block text-[9.5px] font-bold text-purple-800 bg-purple-100 px-1.5 py-0.2 rounded-none border border-purple-200">
                              🍱 {item.selectedVariant.name}
                            </span>
                            {item.selectedVariant.imageUrl && (
                              <span className="text-[9px] text-purple-600 font-medium">专属图</span>
                            )}
                          </div>
                        )}

                        {/* Selected Options badges */}
                        {Object.entries(item.selectedOptions).length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {Object.entries(item.selectedOptions).map(([key, val]) => (
                              <span
                                key={key}
                                className="inline-block text-[9.5px] text-[#474741] bg-[#f4f4f2] px-1.5 py-0.2 rounded-none border border-[#e2e3e1]"
                              >
                                {val}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[9.5px] text-[#787770] line-clamp-1 mt-0.5">
                            {item.dish.enName}
                          </p>
                        )}

                        {/* 添加人信息 */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 text-[9.5px] text-neutral-600 bg-neutral-100 px-1.5 py-0.2 rounded border border-neutral-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>由 {item.participantName || (item.participantId === 'p-lin' ? '同桌食客·小林' : item.participantId === 'p-qiang' ? '同桌食客·阿强' : '桌主(你)')} 添加</span>
                          </span>
                        </div>
                      </div>

                      {/* Price and Action Controls Row */}
                      <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-[#f0f0ed]">
                        <div className="flex items-baseline gap-1 font-amount">
                          <span className="text-xs sm:text-sm font-black text-black">
                            ¥{item.calculatedPrice.toFixed(2)}
                          </span>
                          <span className="text-[9.5px] text-[#787770]">
                            (¥{item.dish.price.toFixed(2)}/份)
                          </span>
                        </div>

                        {/* Actions: Delete button + Quantity Stepper */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.cartItemId)}
                            className="w-5 h-5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="删除餐品"
                          >
                            <X className="w-3 h-3" />
                          </button>

                          <div className="flex items-center gap-1.5 bg-[#f4f4f2] rounded-none border border-[#e2e3e1] px-1 py-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
                              className="w-5 h-5 rounded bg-white border border-[#e2e3e1] text-neutral-700 hover:text-black flex items-center justify-center transition-colors active:scale-90 cursor-pointer shadow-2xs"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="text-xs font-black text-black min-w-[16px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                              className="w-5 h-5 rounded bg-white border border-[#e2e3e1] text-neutral-700 hover:text-black flex items-center justify-center transition-colors active:scale-90 cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer Checkout Summary Panel with Integrated Collapsible Options */}
        {items.length > 0 && (
          <div className="p-3.5 sm:p-4 bg-white border-t border-[#e2e3e1] shadow-[0px_-10px_25px_rgba(0,0,0,0.04)] space-y-2.5 shrink-0 rounded-none pb-safe">
            {/* Minimum Threshold notice for delivery */}
            {!isEligible && (
              <div className="bg-amber-50 text-amber-900 text-xs px-3 py-2 rounded-none border border-amber-200 flex justify-between items-center">
                <span>
                  外送还差 <strong className="font-black">¥{amountNeeded.toFixed(2)}</strong>{' '}
                  达到起送金额 (¥35)
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="font-bold underline cursor-pointer text-amber-950"
                >
                  去凑单
                </button>
              </div>
            )}

            {/* Integrated Accordion Controls: Coupons, Packaging, Order Notes (Default collapsed) */}
            <div className="space-y-1 bg-[#fafaf8] p-1.5 rounded-none border border-[#e2e3e1]">
              {/* 1. Coupon Accordion Trigger */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleDrawer('coupon')}
                  className="w-full flex items-center justify-between py-1 px-1.5 text-xs text-[#1a1c1b] hover:bg-[#f0f0ed] rounded-lg transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Ticket className="w-3.5 h-3.5 text-[#006d36]" />
                    <span>专属优惠券</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {appliedCoupon ? (
                      <span className="text-[#006d36] font-bold text-[10.5px]">
                        已立减 ¥5.00
                      </span>
                    ) : (
                      <span className="text-[10.5px] text-[#787770]">去兑换/选择</span>
                    )}
                    {activeDrawer === 'coupon' ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#787770]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#787770]" />
                    )}
                  </div>
                </button>
                {activeDrawer === 'coupon' && (
                  <div className="p-2 mt-1 bg-white rounded-none border border-[#e2e3e1] space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="输入券码 (如 UR-VIP5)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs rounded-none border border-[#e2e3e1] bg-[#f9f9f7] outline-none focus:border-black"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-2.5 py-1 bg-black text-white rounded-lg text-xs font-bold hover:bg-neutral-800 cursor-pointer"
                      >
                        兑换
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Packaging Preference Trigger */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleDrawer('packaging')}
                  className="w-full flex items-center justify-between py-1 px-1.5 text-xs text-[#1a1c1b] hover:bg-[#f0f0ed] rounded-lg transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>餐具与包装要求</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10.5px] text-[#006d36] font-medium">
                      {packagingPreference === 'eco' ? '环保：无需餐具' : '需要餐具'}
                    </span>
                    {activeDrawer === 'packaging' ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#787770]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#787770]" />
                    )}
                  </div>
                </button>
                {activeDrawer === 'packaging' && (
                  <div className="p-2 mt-1 bg-white rounded-none border border-[#e2e3e1] flex items-center justify-between animate-in fade-in duration-150">
                    <span className="text-[10.5px] text-[#787770]">
                      {packagingPreference === 'eco'
                        ? '支持环保：不消耗一次性餐具'
                        : '需要按用餐人数提供环保餐具'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPackagingPreference((prev) =>
                          prev === 'eco' ? 'standard' : 'eco'
                        )
                      }
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold border border-[#e2e3e1] bg-[#f4f4f2] text-black hover:bg-white cursor-pointer"
                    >
                      {packagingPreference === 'eco' ? '改为需要餐具' : '改为无需餐具'}
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Order Notes Trigger */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleDrawer('notes')}
                  className="w-full flex items-center justify-between py-1 px-1.5 text-xs text-[#1a1c1b] hover:bg-[#f0f0ed] rounded-lg transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <MessageSquare className="w-3.5 h-3.5 text-neutral-600" />
                    <span>订单备注</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10.5px] text-[#787770] truncate max-w-[120px]">
                      {orderNotes || '口味偏好 / 放置地点'}
                    </span>
                    {activeDrawer === 'notes' ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#787770]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#787770]" />
                    )}
                  </div>
                </button>
                {activeDrawer === 'notes' && (
                  <div className="p-2 mt-1 bg-white rounded-none border border-[#e2e3e1] animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="例如: 汉堡不要生洋葱，放12楼前台"
                      className="w-full px-2 py-1 text-xs rounded-none border border-[#e2e3e1] bg-[#f9f9f7] outline-none focus:border-black focus:bg-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Fee Breakdown Summary */}
            <div className="space-y-1 text-xs text-[#474741]">
              <div className="flex justify-between">
                <span>商品原价小计 ({totalCount}件)</span>
                <span className="font-bold text-black font-amount">¥{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  {diningMode === 'delivery'
                    ? '餐车专线配送费'
                    : diningMode === 'dine_in'
                    ? '现场堂食服务'
                    : '自提打包'}
                </span>
                <span>
                  {diningMode !== 'delivery' ? (
                    <span className="text-[#006d36] font-bold">免配送费</span>
                  ) : effectiveDeliveryFee === 0 ? (
                    <span className="text-[#006d36] font-bold font-amount">免费配送 (满 ¥{freeDeliveryThreshold})</span>
                  ) : (
                    <span className="font-amount">¥{effectiveDeliveryFee.toFixed(2)}</span>
                  )}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#006d36]">
                  <span>{appliedCoupon ? `专属优惠券 [${appliedCoupon}]` : 'VIP 专享减免'}</span>
                  <span className="font-bold font-amount">-¥{discount.toFixed(2)}</span>
                </div>
              )}
              {diningMode === 'delivery' && (
                <div className="flex justify-between text-[11px] text-[#787770]">
                  <span>剔除优惠后菜品实付</span>
                  <span className="font-bold text-neutral-800 font-amount">¥{actualAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1.5 border-t border-[#f0f0ed]">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-black">实付总计</span>
                  <span className="text-[9.5px] text-[#787770] bg-[#f4f4f2] px-1 py-0.2 rounded-none border border-[#e8e8e6]">
                    含环保包装与配送
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-black font-amount">
                    ¥{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Pay Button with active guidance */}
            <button
              type="button"
              onClick={handlePay}
              disabled={isSubmitting}
              className={`w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                isEligible
                  ? 'bg-black text-white hover:bg-neutral-800 active:scale-98 shadow-neutral-900/20'
                  : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
              }`}
            >
              {isSubmitting ? (
                <span>正在向黑曜石餐车发射订单...</span>
              ) : isEligible ? (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>立即支付下单 · <span className="font-amount font-bold">¥{grandTotal.toFixed(2)}</span></span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span>还差 <span className="font-amount font-bold">¥{amountNeeded.toFixed(2)}</span> 起送 (实付需满 <span className="font-amount font-bold">¥{minDeliveryAmount}</span>)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Table Bind Modal for Dine-in */}
      <TableBindModal
        isOpen={isTableBindModalOpen}
        onClose={() => setIsTableBindModalOpen(false)}
        currentBoundTable={boundTable}
        onConfirmBind={(table) => {
          setBoundTable(table);
          setCurrentBoundTable(table);
          toast.success(`已绑定 ${table.zoneLabel} · ${table.code} 号桌`, `就餐人数: ${table.guests} 人`);
        }}
      />
    </div>
  );
};
