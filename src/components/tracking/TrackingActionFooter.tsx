import React from 'react';
import { HelpCircle, Share2, Ban } from 'lucide-react';

interface TrackingActionFooterProps {
  onUrgeOrder?: () => void;
  onShareTracking?: () => void;
  onRequestCancel?: () => void;
  canCancel?: boolean;
}

export const TrackingActionFooter: React.FC<TrackingActionFooterProps> = ({
  onUrgeOrder,
  onShareTracking,
  onRequestCancel,
  canCancel = true
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-[12px] text-[#787770] border-t border-[#f0f0ee] bg-white">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onUrgeOrder}
          className="flex items-center gap-1.5 hover:text-black transition-colors cursor-pointer active:scale-95"
        >
          <HelpCircle className="w-3.5 h-3.5 stroke-[2]" />
          <span>催单服务</span>
        </button>

        {canCancel && onRequestCancel && (
          <button
            type="button"
            onClick={onRequestCancel}
            className="flex items-center gap-1.5 text-rose-600 hover:text-rose-800 transition-colors cursor-pointer active:scale-95 font-medium"
          >
            <Ban className="w-3.5 h-3.5 stroke-[2]" />
            <span>申请终止订单</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onShareTracking}
        className="flex items-center gap-1.5 hover:text-black transition-colors cursor-pointer active:scale-95"
      >
        <Share2 className="w-3.5 h-3.5 stroke-[2]" />
        <span>分享轨迹</span>
      </button>
    </div>
  );
};
