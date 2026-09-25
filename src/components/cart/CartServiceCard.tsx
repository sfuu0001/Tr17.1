import React from 'react';
import { Ticket, Leaf, MessageSquare, ChevronRight } from 'lucide-react';

interface CartServiceCardProps {
  appliedCoupon: string | null;
  discountAmount: number;
  onOpenCouponModal: () => void;
  packagingPreference: 'eco' | 'standard';
  onPackagingChange: (pref: 'eco' | 'standard') => void;
  orderNotes: string;
  onOpenNotesModal: () => void;
}

export const CartServiceCard: React.FC<CartServiceCardProps> = ({
  appliedCoupon,
  discountAmount,
  onOpenCouponModal,
  packagingPreference,
  onPackagingChange,
  orderNotes,
  onOpenNotesModal
}) => {
  return (
    <section
      className="bg-white p-4 border border-[#e6e6e2] shadow-card rounded-none space-y-3.5"
      data-purpose="service-options"
    >
      {/* Row 1: Voucher & Discount */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Ticket className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-semibold text-neutral-800">优惠抵扣</span>
        </div>
        <div className="flex items-center gap-2">
          {discountAmount > 0 ? (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
              {appliedCoupon ? `券码 [${appliedCoupon}] 立减 ¥${discountAmount.toFixed(2)}` : `VIP 专属立减 ¥${discountAmount.toFixed(2)}`}
            </span>
          ) : (
            <span className="text-xs text-neutral-400">暂无优惠</span>
          )}
          <button
            type="button"
            onClick={onOpenCouponModal}
            className="text-xs text-neutral-500 hover:text-neutral-900 font-medium px-2 py-0.5 rounded border border-neutral-200 cursor-pointer active:scale-95 transition-colors bg-white shadow-2xs"
            id="editVoucherBtn"
          >
            {discountAmount > 0 ? '修改' : '选券'}
          </button>
        </div>
      </div>

      {/* Row 2: Eco & Packaging */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center">
            <Leaf className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-semibold text-neutral-800">环保与包装</span>
        </div>
        <div className="flex items-center gap-1.5" id="packageOptionsContainer">
          {/* Eco tag */}
          <button
            type="button"
            aria-label="环保甘蔗降解"
            title="环保甘蔗降解 (减碳+25g)"
            onClick={() => onPackagingChange('eco')}
            className={`pkg-tag flex items-center justify-center w-8 h-8 rounded-md transition-all cursor-pointer active:scale-95 ${
              packagingPreference === 'eco'
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-400 shadow-2xs'
                : 'text-neutral-600 bg-neutral-50 border border-neutral-200'
            }`}
          >
            <span className="text-base select-none">🌿</span>
          </button>
          {/* Standard tag */}
          <button
            type="button"
            aria-label="标准保温装"
            title="标准保温装 (锁温30分钟)"
            onClick={() => onPackagingChange('standard')}
            className={`pkg-tag flex items-center justify-center w-8 h-8 rounded-md transition-all cursor-pointer active:scale-95 ${
              packagingPreference === 'standard'
                ? 'text-neutral-900 bg-neutral-100 border border-neutral-800 shadow-2xs font-bold'
                : 'text-neutral-600 bg-neutral-50 border border-neutral-200'
            }`}
          >
            <span className="text-base select-none">📦</span>
          </button>
        </div>
      </div>

      {/* Row 3: Remarks */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-neutral-100 text-neutral-600 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-semibold text-neutral-800">制作与口味备注</span>
        </div>
        <button
          type="button"
          onClick={onOpenNotesModal}
          className="flex items-center gap-0.5 text-xs text-neutral-500 hover:text-neutral-800 font-medium cursor-pointer active:scale-95 transition-colors"
          id="addNoteBtn"
        >
          <span
            id="noteText"
            className={`max-w-[140px] truncate ${orderNotes.trim() ? 'text-neutral-800 font-semibold' : 'text-neutral-400'}`}
          >
            {orderNotes.trim() ? orderNotes : '添加备注'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        </button>
      </div>
    </section>
  );
};
