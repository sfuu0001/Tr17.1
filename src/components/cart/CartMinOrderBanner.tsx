import React from 'react';
import { Check, AlertCircle, ArrowRight, Info } from 'lucide-react';
import { DiningMode } from '../DiningModeSelector';

interface CartMinOrderBannerProps {
  diningMode: DiningMode;
  isEligible: boolean;
  minDeliveryAmount: number;
  discountAmount: number;
  netFood: number;
  amountNeeded: number;
  onGoToMenu?: () => void;
}

export const CartMinOrderBanner: React.FC<CartMinOrderBannerProps> = ({
  diningMode,
  isEligible,
  minDeliveryAmount,
  discountAmount,
  netFood,
  amountNeeded,
  onGoToMenu
}) => {
  if (diningMode === 'delivery') {
    if (isEligible) {
      return (
        <section
          className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-950 transition-all duration-300"
          data-purpose="minimum-order-threshold-status"
          id="minOrderBanner"
        >
          <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="font-bold text-emerald-900" id="minBannerTitle">
              已满足外卖起送结算标准
            </p>
            <p className="text-[11px] text-emerald-800 leading-normal" id="minBannerDesc">
              商家设定外卖起送线为实付满 ¥{minDeliveryAmount.toFixed(2)}
              {discountAmount > 0 ? `（已剔除优惠 ¥${discountAmount.toFixed(2)}，当前菜品实付 ¥${netFood.toFixed(2)}）` : `（当前菜品实付 ¥${netFood.toFixed(2)}）`}。
            </p>
          </div>
        </section>
      );
    }

    return (
      <section
        className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start justify-between gap-2.5 text-xs text-amber-950 transition-all duration-300"
        data-purpose="minimum-order-threshold-status"
        id="minOrderBanner"
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-2.5 h-2.5 stroke-[3]" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="font-bold text-amber-900" id="minBannerTitle">
              未达到起送标准
            </p>
            <p className="text-[11px] text-amber-800 leading-normal" id="minBannerDesc">
              外卖起送门槛实付满 ¥{minDeliveryAmount.toFixed(2)}，还差{' '}
              <span className="font-bold text-amber-900 font-amount">
                ¥{amountNeeded.toFixed(2)}
              </span>
              ，快去加购吧！
            </p>
          </div>
        </div>

        {onGoToMenu && (
          <button
            type="button"
            onClick={onGoToMenu}
            className="shrink-0 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
          >
            <span>凑单</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </section>
    );
  }

  return (
    <section
      className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-950 transition-all duration-300"
      data-purpose="minimum-order-threshold-status"
      id="minOrderBanner"
    >
      <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
        <Info className="w-2.5 h-2.5 stroke-[3]" />
      </div>
      <div className="space-y-0.5">
        <p className="font-bold text-blue-900" id="minBannerTitle">
          {diningMode === 'dine_in' ? '当前为堂食点单' : '当前为到车站自提'}
        </p>
        <p className="text-[11px] text-blue-800 leading-normal" id="minBannerDesc">
          无配送起送门槛，即点即享车内现烤制作。
        </p>
      </div>
    </section>
  );
};
