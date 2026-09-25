import React from 'react';
import { User, Sparkles, ArrowRight, ShieldCheck, CreditCard, UtensilsCrossed } from 'lucide-react';

interface ProfileEmptyStateProps {
  onGoToOrder: () => void;
}

export const ProfileEmptyState: React.FC<ProfileEmptyStateProps> = ({ onGoToOrder }) => {
  return (
    <div className="w-full max-w-2xl mx-auto py-12 px-4 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in-95 duration-200">
      {/* Visual Avatar Placeholder */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-[#f0f0ee] border-2 border-dashed border-[#c8c7be] flex items-center justify-center shadow-xs">
          <User className="w-11 h-11 text-[#a3a29b]" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-md">
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Title & Description */}
      <h2 className="text-xl font-bold text-black mb-2 tracking-tight">暂无个人中心资料</h2>
      <p className="text-sm text-[#787770] max-w-sm mb-8 leading-relaxed">
        您尚未登录或创建会员档案。完成首笔点单后将自动为您建立专属和牛美食档案并激活会员积分！
      </p>

      {/* CTA Button */}
      <button
        onClick={onGoToOrder}
        className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-neutral-800 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer"
      >
        <UtensilsCrossed className="w-4 h-4" />
        <span>立即体验点单</span>
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Membership perks placeholder preview */}
      <div className="mt-10 max-w-md w-full text-left bg-white rounded-2xl p-4 border border-[#e2e3e1] shadow-xs">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#f0f0ee]">
          <Sparkles className="w-4 h-4 text-[#b78103]" />
          <span className="text-xs font-bold text-black">黑曜石尊享会员权益</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 text-xs text-[#474741]">
          <div className="flex items-center gap-2 p-2 bg-[#f9f9f7] rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>立享满减与免配送费</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-[#f9f9f7] rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>优先制作与急速出餐</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-[#f9f9f7] rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>能量积分兑换限量和牛</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-[#f9f9f7] rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>流动餐车最新停靠提醒</span>
          </div>
        </div>
      </div>
    </div>
  );
};
