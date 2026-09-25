import React from 'react';
import { ArrowLeft, Bell, Zap, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface TrackingHeaderProps {
  orderId: string;
  orderTime?: string;
  title?: string;
  etaTime?: string;
  remainingMinutes?: number;
  onBack?: () => void;
  onToggleNotification?: () => void;
}

export const TrackingHeader: React.FC<TrackingHeaderProps> = ({
  orderId,
  orderTime = '12:38:12',
  title = '骑手已取餐 · 极速专送中',
  etaTime = '12:55:00',
  remainingMinutes = 7,
  onBack,
  onToggleNotification
}) => {
  return (
    <header className="relative z-10 bg-white border-b border-[#e6e6e4] px-3.5 py-2.5 space-y-2 shadow-2xs">
      {/* 1. Top row: Back button, Order Tag, Timestamp, GPS tag & Notification Bell */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 text-xs">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-7 h-7 rounded-full bg-[#f2f2ef] hover:bg-[#eaeae5] text-[#333] flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
              title="返回"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          )}
          <span className="bg-[#f0f0ee] text-[#2c2d2a] font-bold px-2 py-0.5 text-[11.5px] font-sans rounded-none border border-[#e5e5df] shrink-0">
            {orderId}
          </span>
          <span className="text-[#888880] text-[11px] shrink-0">{orderTime}</span>
          <span className="text-[#d3d1cb] hidden sm:inline">·</span>
          <span className="text-[#66665f] text-[11px] font-medium hidden sm:inline-flex items-center gap-1">
            <span>🚗</span>
            <span>流动餐车 GPS 专送</span>
          </span>
        </div>

        {/* Right side: Mobile GPS Pill & Notification Control */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[#66665f] text-[10.5px] font-medium sm:hidden flex items-center gap-0.5 bg-[#f7f7f5] px-1.5 py-0.5 rounded-none border border-[#e8e8e4]">
            <span>🚗</span>
            <span>GPS 专送</span>
          </span>
          <button
            type="button"
            onClick={onToggleNotification}
            className="w-7 h-7 rounded-full bg-[#f2f2ef] hover:bg-[#eaeae5] text-[#333] flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
            title="提醒设置"
          >
            <Bell className="w-3.5 h-3.5 stroke-[1.8]" />
          </button>
        </div>
      </div>

      {/* 2. Main Title with Soft Orange Beacon (Compact) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-[17px] sm:text-[18px] font-black text-[#1c1d1b] tracking-tight leading-none truncate">
            {title}
          </h1>
          <div className="relative flex items-center justify-center shrink-0">
            <motion.span
              animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="absolute w-3.5 h-3.5 rounded-full bg-[#f97316]/40"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] relative z-10" />
          </div>
        </div>
      </div>

      {/* 3. Streamlined Dark ETA Banner (Est. mins, 极速达, 准时达, 超时赔付) */}
      <div className="bg-[#181816] text-white px-3 py-2 rounded-none flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-none bg-[#2b271b] text-[#facc15] flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 fill-[#facc15] text-[#facc15]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[13.5px] font-bold tracking-tight text-white">
                Est. {remainingMinutes + 3} mins
              </span>
              <span className="bg-[#059669]/30 text-[#34d399] text-[10px] font-bold px-1.5 py-0.2 border border-[#059669]/40 rounded-full shrink-0">
                极速达
              </span>
            </div>
            <div className="text-[10.5px] text-[#999994] font-normal truncate mt-0.5">
              {etaTime} (剩余约 {remainingMinutes} 分钟) 准时达
            </div>
          </div>
        </div>

        {/* Timeout Compensation */}
        <div className="text-right shrink-0 pl-2">
          <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-[#10b981]">
            <Sparkles className="w-3 h-3 fill-[#10b981]" />
            <span>超时赔付</span>
          </div>
          <div className="text-[9.5px] text-[#73736c]">
            全额保障
          </div>
        </div>
      </div>
    </header>
  );
};

