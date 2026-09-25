import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Zap,
  Copy
} from 'lucide-react';
import { CartItem, DishItem, BoundTableInfo } from '../types';
import { DiningMode } from './DiningModeSelector';
import { UserRole } from './RoleSwitcherDropdown';
import {
  DeliverySettings,
  getDeliverySettings,
  calculateDeliveryThreshold,
  DELIVERY_SETTINGS_EVENT
} from '../utils/deliverySettings';
import { getCurrentBoundTable } from '../utils/tableStorage';
import { TableBindModal } from './table/TableBindModal';
import { useToast } from './ui/ToastContext';
import {
  PaymentChannelId,
  PaymentVoucher,
  MerchantPaymentSettings,
  DEFAULT_MERCHANT_PAYMENT_SETTINGS
} from '../types/payment';
import {
  validatePaymentChannel,
  getChannelHealthDiagnostics
} from '../utils/paymentSecurityEngine';
import { safeGetStorage } from '../utils/safeStorage';
import { matchDishImageUrl } from '../utils/dishImageMatcher';
import { PaymentConfirmCashierModal } from './payment/PaymentConfirmCashierModal';
import { ElectronicPaymentVoucherModal } from './payment/ElectronicPaymentVoucherModal';
import { CartHeaderSection } from './cart/CartHeaderSection';
import { CartDeliveryCard } from './cart/CartDeliveryCard';
import { CartItemListSection } from './cart/CartItemListSection';
import { CartServiceCard } from './cart/CartServiceCard';
import { CartMinOrderBanner } from './cart/CartMinOrderBanner';
import { CartPriceBreakdownCard } from './cart/CartPriceBreakdownCard';
import { CartBottomCheckoutBar } from './cart/CartBottomCheckoutBar';
import { CartNoteModal, CartCouponModal, CartClearConfirmModal } from './cart/CartModals';
import { getSavedAddresses } from '../utils/truckLocationEngine';

export interface CartPageViewProps {
  items: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  onCheckout?: (orderNotes: string, couponCode?: string, paymentMethod?: string) => void;
  onCompleteCheckout?: (
    orderNotes: string,
    coupon: string,
    paymentMethod: string,
    paymentVoucher?: PaymentVoucher
  ) => string | void;
  onGoToMenu: () => void;
  onGoToTracking?: (orderId?: string) => void;
  deliveryAddress: string;
  onOpenAddress?: () => void;
  isVIPActive: boolean;
  diningMode: DiningMode;
  onDiningModeChange: (mode: DiningMode) => void;
  currentRole?: UserRole;
  onSelectRole?: (role: UserRole) => void;
  minDeliveryAmount?: number;
  deliverySettings?: DeliverySettings;
  dishes?: DishItem[];
  onAddToCart?: (dish: DishItem) => void;
  onGoToCategory?: (category: string, subCategory?: string) => void;
}

export const CartPageView: React.FC<CartPageViewProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  onCheckout,
  onCompleteCheckout,
  onGoToMenu,
  onGoToTracking,
  deliveryAddress,
  onOpenAddress,
  isVIPActive,
  diningMode,
  onDiningModeChange,
  minDeliveryAmount: propMinDeliveryAmount,
  deliverySettings: propDeliverySettings,
  dishes = [],
  onAddToCart
}) => {
  const toast = useToast();

  // Internal preferences & interactive modal states
  const [orderNotes, setOrderNotes] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(isVIPActive ? 'UR-VIP5' : null);
  const [packagingPreference, setPackagingPreference] = useState<'eco' | 'standard'>('eco');
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannelId>('wechat');

  // Modals state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Table Binding state for Dine-in
  const [boundTable, setBoundTable] = useState<BoundTableInfo | null>(() => getCurrentBoundTable());
  const [isTableBindModalOpen, setIsTableBindModalOpen] = useState(false);

  // Cashier & Voucher Modal states
  const [isCashierOpen, setIsCashierOpen] = useState(false);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [completedVoucher, setCompletedVoucher] = useState<PaymentVoucher | null>(null);
  const [generatedOrderNo, setGeneratedOrderNo] = useState('');

  // Listen to table changes
  useEffect(() => {
    const handleBoundTableChanged = (e: Event) => {
      const customEvent = e as CustomEvent<BoundTableInfo | null>;
      setBoundTable(customEvent.detail ?? getCurrentBoundTable());
    };
    window.addEventListener('obsidian_bound_table_changed', handleBoundTableChanged);
    return () => window.removeEventListener('obsidian_bound_table_changed', handleBoundTableChanged);
  }, []);

  // Dynamic delivery threshold settings
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

  const effectiveSettings: DeliverySettings = {
    ...deliverySettings,
    minDeliveryAmount: propMinDeliveryAmount !== undefined ? propMinDeliveryAmount : deliverySettings.minDeliveryAmount
  };

  const subtotal = items.reduce((sum, item) => sum + item.calculatedPrice, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const discount = (appliedCoupon || isVIPActive) ? 5 : 0;

  // Delivery threshold calculation with strict post-discount deduction
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

  // Retrieve matched address with details (name, phone, houseNumber, remarks)
  const matchedAddr = useMemo(() => {
    const list = getSavedAddresses();
    return list.find(a => 
      deliveryAddress.includes(a.title) || 
      a.title.includes(deliveryAddress) ||
      deliveryAddress.includes(a.detail)
    ) || list.find(a => a.isDefault) || list[0];
  }, [deliveryAddress]);

  // Quick add-on recommendations for quick cart upsell
  const upsellDishes = useMemo(() => {
    const cartDishIds = new Set(items.map((i) => i.dish.id));
    return dishes
      .filter((d) => !cartDishIds.has(d.id))
      .slice(0, 6);
  }, [dishes, items]);

  // Merchant payment settings
  const merchantSettings: MerchantPaymentSettings = useMemo(() => {
    return safeGetStorage<MerchantPaymentSettings>(
      'obsidian_merchant_payment_channels',
      DEFAULT_MERCHANT_PAYMENT_SETTINGS
    );
  }, []);

  // Real-time channel verification result
  const channelValidation = useMemo(() => {
    return validatePaymentChannel({
      channelId: selectedChannel,
      payAmount: grandTotal,
      subtotal,
      discountAmount: discount,
      deliveryFee: effectiveDeliveryFee,
      merchantSettings
    });
  }, [selectedChannel, grandTotal, subtotal, discount, effectiveDeliveryFee, merchantSettings]);

  // Copy cart summary
  const handleCopyCartSummary = () => {
    const listText = items
      .map((i, idx) => `${idx + 1}. ${i.dish.name} ×${i.quantity} (¥${i.calculatedPrice.toFixed(2)})`)
      .join('\n');
    const fullText = `【黑曜石流动餐车 01 号 · 选购清单】\n就餐方式: ${
      diningMode === 'delivery' ? '外卖专送' : diningMode === 'dine_in' ? '堂食现点' : '餐车自提'
    }\n${listText}\n实付总额: ¥${grandTotal.toFixed(2)}`;
    navigator.clipboard?.writeText(fullText);
    toast.success('清单已复制到剪贴板', '可直接发送给好友或拼单群');
  };

  // Direct confirmation payment cashier trigger
  const handleOpenCashierPayment = () => {
    if (items.length === 0) {
      toast.info('选购清单暂无餐品', '请先返回菜单挑选黑曜石现烤餐品');
      onGoToMenu();
      return;
    }

    if (diningMode === 'dine_in' && !boundTable) {
      toast.warning('请先绑定堂食桌台', '堂食下单需先关联桌号，以便餐车后厨精准传菜');
      setIsTableBindModalOpen(true);
      return;
    }

    if (diningMode === 'delivery' && !isEligible) {
      toast.error(
        '未达到外卖起送门槛',
        `外卖专送需实付满 ¥${minDeliveryAmount.toFixed(2)}，当前实付 ¥${actualAmount.toFixed(2)}，还差 ¥${amountNeeded.toFixed(2)} 起送`
      );
      return;
    }

    if (!channelValidation.valid) {
      toast.error('支付渠道校验未通过', channelValidation.message);
      if (channelValidation.recommendedFallbackChannel) {
        setSelectedChannel(channelValidation.recommendedFallbackChannel);
      }
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const modePrefix = diningMode === 'dine_in' ? 'UR-DIN' : diningMode === 'pickup' ? 'UR-PK' : 'UR';
    const tempOrderNo = `${modePrefix}-${randomSuffix}`;
    setGeneratedOrderNo(tempOrderNo);
    setIsCashierOpen(true);
  };

  // Navigation to full checkout page view
  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      toast.info('选购单暂无餐品', '请先挑选餐品后结算');
      onGoToMenu();
      return;
    }

    if (diningMode === 'dine_in' && !boundTable) {
      toast.warning('请先绑定堂食桌台', '堂食下单需先关联桌号');
      setIsTableBindModalOpen(true);
      return;
    }

    if (diningMode === 'delivery' && !isEligible) {
      toast.error(
        '未达到外卖起送标准',
        `还差 ¥${amountNeeded.toFixed(2)} 即可起送，快去挑选招牌餐品吧！`
      );
      return;
    }

    if (onProceedToCheckout) {
      onProceedToCheckout();
    } else if (onCheckout) {
      onCheckout(orderNotes, appliedCoupon || '', selectedChannel);
    }
  };

  // Payment success callback
  const handleCashierPaymentSuccess = (voucher: PaymentVoucher, channel: PaymentChannelId) => {
    setCompletedVoucher(voucher);
    setSelectedChannel(channel);
    setIsCashierOpen(false);

    if (onCompleteCheckout) {
      onCompleteCheckout(orderNotes, appliedCoupon || '', channel, voucher);
    } else if (onCheckout) {
      onCheckout(orderNotes, appliedCoupon || '', channel);
    }

    toast.success('支付成功 · 存证已生成', `凭证号: ${voucher.voucherNo}`);
    setIsVoucherOpen(true);
  };

  // 1. Empty Cart State
  if (items.length === 0) {
    return (
      <div className="w-full min-h-[80vh] flex items-center justify-center py-10 px-4 bg-[#f4f4f1]">
        <div className="w-full max-w-md bg-white rounded-xl border border-[#e6e6e2] p-8 shadow-card text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
            <Radio className="w-8 h-8 text-neutral-500 animate-pulse" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-neutral-900">餐车选购清单暂无餐品</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              黑曜石 01 号流动餐车距您 180 米，现烤炭火已热，快去选购心仪美味吧！
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onGoToMenu}
              className="w-full py-3 bg-[#121312] hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-98 inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回挑选餐品</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Full Brand New Cart View
  return (
    <div className="text-neutral-800 min-h-screen pb-32 flex flex-col bg-[#f4f4f1] font-sans">
      {/* Viewport Container */}
      <main className="w-full max-w-5xl mx-auto min-h-screen bg-[#f7f7f5] flex flex-col relative shadow-sm overflow-x-hidden">
        {/* Top Header Section with Title, Count Badge, Clear Button & Fulfillment Mode Selector */}
        <CartHeaderSection
          itemCount={totalCount}
          diningMode={diningMode}
          onDiningModeChange={onDiningModeChange}
          onClearClick={() => setIsClearModalOpen(true)}
          truckName="黑曜石 01 号车"
        />

        <div className="px-4 space-y-3.5 flex-1 pt-2">
          {/* Delivery & Route Details Card */}
          <CartDeliveryCard
            diningMode={diningMode}
            deliveryAddress={deliveryAddress}
            onOpenAddress={onOpenAddress}
            isVIPActive={isVIPActive}
            boundTable={boundTable}
            onOpenTableBindModal={() => setIsTableBindModalOpen(true)}
            truckName="黑曜石 01 号餐车"
            truckLocation="静安大悦城北座 1F 中庭"
            distanceDesc="直距 420m"
            recipientName={matchedAddr?.receiverName || '张先生'}
            recipientPhone={matchedAddr?.receiverPhone || '138****8821'}
            houseNumber={matchedAddr?.houseNumber}
            remarks={matchedAddr?.remarks}
          />

          {/* Ordered Dish List with Rich/Compact View Switcher, Modifiers, and Stepper Controls */}
          <CartItemListSection
            items={items}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
            diningMode={diningMode}
            currentTable={boundTable?.code || 'A1'}
          />

          {/* Service Preference Card: Voucher & Discount, Eco Packaging, and Chef Notes */}
          <CartServiceCard
            appliedCoupon={appliedCoupon}
            discountAmount={discount}
            onOpenCouponModal={() => setIsCouponModalOpen(true)}
            packagingPreference={packagingPreference}
            onPackagingChange={(pref) => {
              setPackagingPreference(pref);
              toast.success(
                pref === 'eco' ? '已选择甘蔗降解环保盒' : '已选择标准保温铝箔袋',
                pref === 'eco' ? '本次点单减少碳排放 25g' : '锁温 30 分钟'
              );
            }}
            orderNotes={orderNotes}
            onOpenNotesModal={() => setIsNoteModalOpen(true)}
          />

          {/* Minimum Order Threshold Status Banner */}
          <CartMinOrderBanner
            diningMode={diningMode}
            isEligible={isEligible}
            minDeliveryAmount={minDeliveryAmount}
            discountAmount={discount}
            netFood={actualAmount}
            amountNeeded={amountNeeded}
            onGoToMenu={onGoToMenu}
          />

          {/* Collapsible Price Breakdown Card */}
          <CartPriceBreakdownCard
            subtotal={subtotal}
            deliveryFee={effectiveDeliveryFee}
            discount={discount}
            netFood={actualAmount}
            diningMode={diningMode}
            appliedCoupon={appliedCoupon}
            freeDeliveryThreshold={freeDeliveryThreshold}
          />

          {/* Quick Upsell Add-ons Rail */}
          {upsellDishes.length > 0 && (
            <section className="bg-white p-3.5 border border-[#e6e6e2] shadow-card rounded-none space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>加份招牌 · 凑单神器</span>
                </div>
                <span className="text-[10px] text-neutral-400">
                  {!isEligible && diningMode === 'delivery'
                    ? `差 ¥${amountNeeded.toFixed(2)} 起送`
                    : '先锋食客最爱搭档'}
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {upsellDishes.map((dish) => {
                  const imgUrl = matchDishImageUrl(dish);
                  return (
                    <div
                      key={`upsell-${dish.id}`}
                      className="w-32 shrink-0 bg-[#fafaf8] border border-neutral-200 rounded-none p-2 flex flex-col justify-between space-y-1.5 hover:border-neutral-400 transition-colors"
                    >
                      <div className="w-full h-16 bg-neutral-100 overflow-hidden relative">
                        <img
                          src={imgUrl}
                          alt={dish.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-neutral-900 truncate text-[11px]">{dish.name}</h5>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60">
                        <span className="tabular-nums font-bold text-neutral-900 text-xs">
                          ¥{dish.price.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onAddToCart?.(dish);
                            toast.success(`已添加【${dish.name}】至清单`);
                          }}
                          className="px-2 py-0.5 bg-neutral-900 hover:bg-black text-white rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          + 加入
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Bottom Security / Sync Assurance Strip */}
          <div className="flex items-center justify-between px-2 pt-1 text-[10.5px] text-neutral-400">
            <button
              type="button"
              onClick={handleCopyCartSummary}
              className="inline-flex items-center gap-1 hover:text-neutral-700 cursor-pointer transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span>复制清单</span>
            </button>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>全链路加密校验 · 4G云音箱实时联通</span>
            </div>
          </div>
        </div>

        {/* Floating Bottom Checkout Bar */}
        <CartBottomCheckoutBar
          grandTotal={grandTotal}
          itemCount={totalCount}
          isEligible={isEligible || diningMode !== 'delivery'}
          onProceedToCheckout={handleProceedToCheckout}
          onOpenCashierPayment={handleOpenCashierPayment}
        />
      </main>

      {/* Note Editing Modal */}
      <CartNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        currentNote={orderNotes}
        onSaveNote={(note) => {
          setOrderNotes(note);
          toast.success('制作备注已保存');
        }}
      />

      {/* Coupon Choosing Modal */}
      <CartCouponModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={(code) => {
          setAppliedCoupon(code);
          if (code) {
            toast.success(`优惠券 [${code}] 已生效`);
          } else {
            toast.info('已取消使用优惠券');
          }
        }}
      />

      {/* Clear Cart Confirmation Modal */}
      <CartClearConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirmClear={() => {
          onClearCart();
          toast.info('选购清单已清空');
        }}
      />

      {/* Table Bind Modal for Dine-in */}
      <TableBindModal
        isOpen={isTableBindModalOpen}
        onClose={() => setIsTableBindModalOpen(false)}
        currentBoundTable={boundTable}
        onConfirmBind={(table) => {
          setBoundTable(table);
          setIsTableBindModalOpen(false);
          toast.success('桌台绑定成功', `已关联【${table.code} 号桌】，后厨将直传该桌`);
        }}
      />

      {/* Payment Confirmation Cashier Modal (安全收银台直通闭环) */}
      <PaymentConfirmCashierModal
        isOpen={isCashierOpen}
        onClose={() => setIsCashierOpen(false)}
        orderNo={generatedOrderNo}
        items={items}
        subtotal={subtotal}
        discountAmount={discount}
        deliveryFee={effectiveDeliveryFee}
        finalAmount={grandTotal}
        diningMode={diningMode}
        deliveryAddress={deliveryAddress}
        tableCode={boundTable?.code}
        initialChannel={selectedChannel}
        onPaymentSuccess={handleCashierPaymentSuccess}
        onViewVoucherRequest={(voucher) => {
          setCompletedVoucher(voucher);
          setIsCashierOpen(false);
          setIsVoucherOpen(true);
        }}
      />

      {/* Electronic Payment Voucher Modal (官方电子支付凭证) */}
      <ElectronicPaymentVoucherModal
        isOpen={isVoucherOpen}
        onClose={() => setIsVoucherOpen(false)}
        voucher={completedVoucher}
        onGoToOrderTracking={() => {
          setIsVoucherOpen(false);
          if (onGoToTracking) {
            onGoToTracking(completedVoucher?.orderNo);
          }
        }}
      />
    </div>
  );
};
