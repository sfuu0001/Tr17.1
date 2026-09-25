import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface BottomCartBarProps {
  cartCount: number;
  cartTotal: number;
  cartSavings?: number;
  onOpenCart: () => void;
  onProceedToCheckout?: () => void;
  cartTargetRef?: React.RefObject<HTMLDivElement | null>;
}

export const BottomCartBar: React.FC<BottomCartBarProps> = ({
  cartCount,
  cartTotal,
  onOpenCart,
  onProceedToCheckout,
  cartTargetRef
}) => {
  const hasItems = cartCount > 0;

  const handleCheckoutClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasItems) return;
    if (onProceedToCheckout) {
      onProceedToCheckout();
    } else {
      onOpenCart();
    }
  };

  return (
    <aside className="w-full px-2.5 py-1.5 bg-[#F9F9F8] border-b border-[#E5E7EB] select-none shrink-0 z-30">
      <div className="flex items-center justify-between border border-[#D5D8DC] bg-white p-1.5 shadow-2xs">
        {/* Left: Cart Icon & Subtotal */}
        <div
          ref={cartTargetRef}
          data-cart-target="true"
          onClick={onOpenCart}
          className="flex items-center space-x-1.5 sm:space-x-2 pl-0.5 sm:pl-1 cursor-pointer group min-w-0 flex-1 mr-2"
          title="查看购物车选购清单"
        >
          <div className="relative w-8 h-8 bg-[#181818] flex items-center justify-center text-white shrink-0 rounded-xs">
            <ShoppingBag className="w-4 h-4 stroke-current" />
            {hasItems && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#FF3B30] text-white tabular-nums text-[9px] font-bold px-1 rounded-full border border-white leading-tight">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[8.5px] sm:text-[9px] tabular-nums text-gray-400 leading-tight truncate">
              小计<span className="hidden sm:inline"> SUB-TOTAL</span>
            </span>
            <span className="text-xs sm:text-sm font-bold font-amount text-black leading-tight truncate">
              ¥{hasItems ? cartTotal.toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* Right: Free delivery badge + Checkout button */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
          <span className="text-[8.5px] sm:text-[9px] tabular-nums text-[#00A86B] bg-[#E8F8F0] px-1 py-0.5 border border-[#C2EDD8] rounded-xs shrink-0 whitespace-nowrap">
            免配送费
          </span>
          {hasItems ? (
            <button
              type="button"
              onClick={handleCheckoutClick}
              className="bg-[#181818] hover:bg-black text-white text-xs font-semibold px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center space-x-1 transition-colors cursor-pointer rounded-xs shadow-xs active:scale-98 shrink-0 whitespace-nowrap"
            >
              <span>去结算<span className="hidden sm:inline"> CHECKOUT</span></span>
              <ArrowRight className="w-3.5 h-3.5 stroke-current" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="bg-[#E9EBEF] text-[#8C93A0] text-xs font-semibold px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center space-x-1 cursor-not-allowed rounded-xs shrink-0 whitespace-nowrap"
            >
              <span>去结算<span className="hidden sm:inline"> CHECKOUT</span></span>
              <ArrowRight className="w-3.5 h-3.5 opacity-50" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
