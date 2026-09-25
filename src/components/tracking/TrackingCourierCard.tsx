import React from 'react';
import { Bike, Check, MessageSquare, Phone } from 'lucide-react';
import { CourierInfo } from '../../types/tracking';

interface TrackingCourierCardProps {
  courier?: CourierInfo;
  onContactOnline?: () => void;
  onCallPhone?: () => void;
}

export const TrackingCourierCard: React.FC<TrackingCourierCardProps> = ({
  courier = {
    id: 'c-1',
    name: 'Li Feng',
    enName: 'Li Feng',
    title: '李峰 · 金牌专送',
    phone: '138-0012-9912',
    rating: 4.98,
    completedOrders: 1420,
    isInsulatedBoxSanitized: true
  },
  onContactOnline,
  onCallPhone
}) => {
  return (
    <div className="p-3.5 bg-white border-b border-[#ededeb] flex items-center justify-between gap-2">
      <div className="flex items-center gap-3 min-w-0">
        {/* Rider Avatar with Circle & Shield Check Badge */}
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full bg-[#f0f0ee] border border-[#e4e4df] flex items-center justify-center text-neutral-800">
            <Bike className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-[#10b981] text-white flex items-center justify-center text-[9px] border-2 border-white rounded-full shadow-2xs">
            <Check className="w-2.5 h-2.5 stroke-[3.5]" />
          </div>
        </div>

        {/* Rider Text Details */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[14px] font-bold text-black flex-wrap">
            <span className="font-extrabold">{courier.name}</span>
            <span className="text-[12px] text-[#73736c] font-normal">
              ({courier.title})
            </span>
            <span className="inline-flex items-center gap-0.5 bg-[#fffbeb] text-[#d97706] text-[10.5px] font-bold px-1.5 py-0.2 border border-[#fef3c7] rounded-none shrink-0">
              ★ {courier.rating.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#787770] font-normal mt-0.5 truncate">
            <span>已安全完成 {courier.completedOrders} 单 ·</span>
            {courier.isInsulatedBoxSanitized && (
              <span className="text-[#059669] font-medium bg-[#ecfdf5] border border-[#d1fae5] px-1.5 py-0.2 text-[10px] rounded-none">
                保温箱已消毒
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Rounded Action Buttons */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onContactOnline}
          className="relative px-3.5 py-1.5 bg-[#181816] hover:bg-black active:scale-95 text-white text-[11.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs rounded-full group"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <MessageSquare className="w-3.5 h-3.5 fill-white text-white" />
          <span>在线联系</span>
        </button>
        <button
          type="button"
          onClick={onCallPhone}
          className="px-3.5 py-1.5 bg-[#f2f2ef] hover:bg-[#eaeae5] active:scale-95 text-black text-[11.5px] font-bold border border-[#e5e5df] flex items-center justify-center gap-1.5 cursor-pointer transition-all rounded-full"
        >
          <Phone className="w-3.5 h-3.5 fill-black text-black" />
          <span>电话联系</span>
        </button>
      </div>
    </div>
  );
};
