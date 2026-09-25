import React from 'react';
import { X, User, MapPin, CreditCard, Award, Shield, Phone, ChevronRight } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVIPActive: boolean;
  onOpenVIP: () => void;
  onOpenAddress: () => void;
  currentAddress: string;
  orderCount: number;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  isVIPActive,
  onOpenVIP,
  onOpenAddress,
  currentAddress,
  orderCount
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#e2e3e1] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-neutral-800 border-2 border-emerald-500 text-white flex items-center justify-center font-bold text-lg">
              <User className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Urban Foodie</h3>
                {isVIPActive && (
                  <span className="bg-[#FFF8E1] text-[#B78103] text-[10px] font-bold px-1.5 py-0.2 rounded border border-[#FFE082]">
                    VIP 会员
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 tabular-nums">138****9201 · 静安大悦城</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 p-3 bg-[#f9f9f7] border-b border-[#e2e3e1] text-center text-xs">
          <div className="p-2">
            <span className="font-extrabold text-base text-black block">{orderCount}</span>
            <span className="text-[11px] text-[#787770]">历史订单</span>
          </div>
          <div className="p-2 border-x border-[#e2e3e1]">
            <span className="font-extrabold text-base text-emerald-700 block">¥38.00</span>
            <span className="text-[11px] text-[#787770]">餐车券包</span>
          </div>
          <div className="p-2">
            <span className="font-extrabold text-base text-[#B78103] block">1,240</span>
            <span className="text-[11px] text-[#787770]">能量积分</span>
          </div>
        </div>

        {/* Menu list */}
        <div className="p-4 space-y-2 text-xs">
          <button
            onClick={() => {
              onClose();
              onOpenVIP();
            }}
            className="w-full p-3 rounded-xl bg-[#FFF8E1]/50 hover:bg-[#FFF8E1] border border-[#FFE082] flex items-center justify-between transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <Award className="w-4 h-4 text-[#B78103]" />
              <div>
                <span className="font-bold text-[#422006] block">黑曜石 VIP 特权中心</span>
                <span className="text-[10px] text-[#787770]">享极速优先出餐与立减权益</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#B78103]" />
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenAddress();
            }}
            className="w-full p-3 rounded-xl bg-white hover:bg-neutral-50 border border-[#e2e3e1] flex items-center justify-between transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-700" />
              <div>
                <span className="font-bold text-black block">常用配送地址</span>
                <span className="text-[10px] text-[#787770] truncate max-w-[220px] block">
                  {currentAddress}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#787770]" />
          </button>

          <div className="p-3 rounded-xl bg-white border border-[#e2e3e1] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-[#787770]" />
              <div>
                <span className="font-bold text-black block">食品安全与溯源</span>
                <span className="text-[10px] text-[#787770]">A5 和牛进出口检疫证与车厢消毒绿码</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              已核验
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#e2e3e1] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[#787770]" />
              <div>
                <span className="font-bold text-black block">流动餐车服务专线</span>
                <span className="text-[10px] text-[#787770]">400-820-9900 (工作时间 10:00-22:00)</span>
              </div>
            </div>
            <a
              href="tel:400-820-9900"
              className="text-[11px] font-bold text-black hover:underline"
            >
              拨打
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f9f9f7] border-t border-[#e2e3e1] text-center text-[11px] text-[#787770]">
          Urban Radar · Obsidian Mobile Food Truck v2.4.0
        </div>
      </div>
    </div>
  );
};
