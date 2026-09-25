import React from 'react';
import { ClipboardList, ArrowRight, UtensilsCrossed, Sparkles } from 'lucide-react';

interface OrdersEmptyStateProps {
  onGoToOrder: () => void;
}

export const OrdersEmptyState: React.FC<OrdersEmptyStateProps> = ({ onGoToOrder }) => {
  return (
    <div className="w-full max-w-2xl mx-auto py-12 px-4 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in-95 duration-200">
      {/* Visual illustration */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-[#f0f0ee] border border-[#e2e3e1] flex items-center justify-center shadow-xs">
          <ClipboardList className="w-11 h-11 text-[#787770]" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shadow-md">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Title & Description */}
      <h2 className="text-xl font-bold text-black mb-2 tracking-tight">暂无订单数据</h2>
      <p className="text-sm text-[#787770] max-w-sm mb-8 leading-relaxed">
        您当前还没有在途或已完成的餐车订单。现在前往菜单选购，体验即烤现送的现制和牛美食吧！
      </p>

      {/* CTA Button */}
      <button
        onClick={onGoToOrder}
        className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-neutral-800 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer"
      >
        <UtensilsCrossed className="w-4 h-4" />
        <span>前往选购点单</span>
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Subtle reassurance tips */}
      <div className="mt-12 grid grid-cols-2 gap-3 max-w-md w-full text-left">
        <div className="p-3 bg-white rounded-xl border border-[#e2e3e1] text-xs">
          <span className="font-bold text-black block mb-0.5">即烤现制</span>
          <span className="text-[#787770]">下单后流动餐车即刻现制</span>
        </div>
        <div className="p-3 bg-white rounded-xl border border-[#e2e3e1] text-xs">
          <span className="font-bold text-black block mb-0.5">专线直达</span>
          <span className="text-[#787770]">骑手专属保温箱准时交付</span>
        </div>
      </div>
    </div>
  );
};
