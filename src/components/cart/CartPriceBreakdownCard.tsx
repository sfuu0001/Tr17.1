import React, { useState } from 'react';
import { Calculator, ChevronDown } from 'lucide-react';
import { DiningMode } from '../DiningModeSelector';

interface CartPriceBreakdownCardProps {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  netFood: number;
  diningMode: DiningMode;
  appliedCoupon: string | null;
  freeDeliveryThreshold?: number;
}

export const CartPriceBreakdownCard: React.FC<CartPriceBreakdownCardProps> = ({
  subtotal,
  deliveryFee,
  discount,
  netFood,
  diningMode,
  appliedCoupon,
  freeDeliveryThreshold = 50
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const deliveryLabel =
    diningMode === 'delivery'
      ? '餐车专送服务'
      : diningMode === 'dine_in'
      ? '堂食餐位及服务（免）'
      : '到车自提（免配送）';

  return (
    <section
      className="bg-white border border-[#e6e6e2] shadow-card rounded-none text-xs overflow-hidden"
      data-purpose="cost-breakdown"
      id="costBreakdownSection"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full p-4 flex items-center justify-between text-neutral-800 font-semibold hover:bg-neutral-50/70 transition-colors cursor-pointer active:bg-neutral-100"
      >
        <span className="flex items-center gap-1.5 text-xs text-neutral-900 font-bold">
          <Calculator className="w-3.5 h-3.5 text-neutral-500" />
          <span>费用明细</span>
        </span>
        <div className="flex items-center gap-1.5 text-neutral-500 text-[11px] font-normal">
          <span>{isOpen ? '收起明细' : '查看明细'}</span>
          <ChevronDown
            id="breakdownArrow"
            className={`w-3.5 h-3.5 transform transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div
          id="breakdownDetails"
          className="px-4 pb-4 space-y-2.5 pt-1 border-t border-neutral-100 animate-in fade-in duration-150"
        >
          {/* Raw item subtotal */}
          <div className="flex items-center justify-between text-neutral-600">
            <span>餐品原价小计</span>
            <span className="font-medium text-neutral-900 font-amount">
              ¥<span id="breakdownSubtotal">{subtotal.toFixed(2)}</span>
            </span>
          </div>

          {/* Delivery Fee */}
          <div className="flex items-center justify-between text-neutral-600">
            <span id="deliveryLabel" className="flex items-center gap-1.5">
              <span>{deliveryLabel}</span>
              {diningMode === 'delivery' && subtotal >= freeDeliveryThreshold && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-medium border border-emerald-200 font-amount">
                  满 ¥{freeDeliveryThreshold} 免配
                </span>
              )}
            </span>
            <span className="font-medium text-neutral-900 font-amount">
              ¥<span id="breakdownDeliveryFee">{deliveryFee.toFixed(2)}</span>
            </span>
          </div>

          {/* Voucher Deduction */}
          {discount > 0 && (
            <div className="flex items-center justify-between text-emerald-700">
              <span className="flex items-center gap-1">
                优惠券抵扣 [{appliedCoupon || 'UR-VIP5'}]
              </span>
              <span className="font-semibold font-amount">
                -¥<span id="breakdownDiscount">{discount.toFixed(2)}</span>
              </span>
            </div>
          )}

          {/* Real Food Subtotal */}
          <div className="flex items-center justify-between text-neutral-500 pt-2 border-t border-neutral-100 text-[11px]">
            <span>剔除优惠后菜品实付</span>
            <span className="text-neutral-700 font-medium font-amount">
              ¥<span id="breakdownNetFood">{netFood.toFixed(2)}</span>
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
