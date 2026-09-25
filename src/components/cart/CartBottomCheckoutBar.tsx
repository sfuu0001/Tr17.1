import React from 'react';
import { ArrowRight, Zap, ShieldCheck } from 'lucide-react';

interface CartBottomCheckoutBarProps {
  grandTotal: number;
  itemCount: number;
  isEligible: boolean;
  onProceedToCheckout: () => void;
  onOpenCashierPayment?: () => void;
}

export const CartBottomCheckoutBar: React.FC<CartBottomCheckoutBarProps> = ({
  grandTotal,
  itemCount,
  isEligible,
  onProceedToCheckout,
  onOpenCashierPayment
}) => {
  const isDisabled = itemCount === 0 || !isEligible;

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center bg-white/95 backdrop-blur-md border-t border-neutral-200/80 shadow-bar pb-safe"
      data-purpose="checkout-bar"
    >
      <div className="w-full max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
        {/* Price Summary on the Left */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-neutral-900">实付总额</span>
            <span className="text-xl font-extrabold tracking-tight text-neutral-900 font-amount">
              ¥<span id="bottomTotalAmount">{grandTotal.toFixed(2)}</span>
            </span>
          </div>
          <span className="text-[10px] text-neutral-400">
            已含全部税费、包装费及配送费
          </span>
        </div>

        {/* Checkout Action Button on the Right */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenCashierPayment && (
            <button
              type="button"
              disabled={isDisabled}
              onClick={onOpenCashierPayment}
              className={`p-2.5 rounded-xl border border-neutral-300 text-neutral-800 hover:bg-neutral-100 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                isDisabled ? 'opacity-40 pointer-events-none' : ''
              }`}
              title="直通安全收银台"
            >
              <Zap className="w-4 h-4 text-amber-500" />
            </button>
          )}

          <button
            type="button"
            disabled={isDisabled}
            onClick={onProceedToCheckout}
            className={`bg-[#121312] hover:bg-neutral-800 active:scale-[0.98] text-white py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer ${
              isDisabled ? 'opacity-40 pointer-events-none' : ''
            }`}
            data-purpose="confirm-order-action"
            id="checkoutBtn"
          >
            <span className="truncate">前往结算</span>
            <span className="font-bold font-amount">
              ¥<span id="btnPriceAmount">{grandTotal.toFixed(2)}</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
          </button>
        </div>
      </div>
    </footer>
  );
};
