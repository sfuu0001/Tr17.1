import React from 'react';
import {
  CheckCircle2,
  Wallet,
  Sparkles,
  Zap,
  Award,
  ArrowRight,
  TrendingUp,
  Star,
  X
} from 'lucide-react';
import { ActiveDeliveryOrder } from '../../types';

interface RiderSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ActiveDeliveryOrder;
  onJumpToPool: () => void;
  onJumpToEarnings: () => void;
}

export const RiderSettlementModal: React.FC<RiderSettlementModalProps> = ({
  isOpen,
  onClose,
  order,
  onJumpToPool,
  onJumpToEarnings
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-[#37352f] w-full max-w-md rounded-[6px] border border-[#d3d1cb] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top celebratory header */}
        <div className="p-5 bg-gradient-to-b from-[#edf3ec] to-white border-b border-[#efefed] text-center space-y-2">
          <div className="w-12 h-12 bg-[#2b593f] text-white rounded-full mx-auto flex items-center justify-center shadow-lg animate-bounce">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#2b593f] uppercase tracking-wider block">
              DELIVERY COMPLETED · 妥投成功
            </span>
            <h3 className="text-lg font-black text-[#37352f]">专送工单已圆满履约</h3>
            <p className="font-mono text-xs text-[#787774]">{order.orderNo}</p>
          </div>
        </div>

        {/* Earnings Card */}
        <div className="p-4 space-y-3.5 flex-1 overflow-y-auto">
          <div className="p-4 bg-[#fbfbfa] rounded-[4px] border border-[#e6e6e4] text-center space-y-1">
            <span className="text-xs text-[#787774]">本次专送结算总收入</span>
            <div className="font-mono font-black text-3xl text-[#2b593f]">
              +¥{order.courierEarnings.toFixed(2)}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4dab63] bg-[#edf3ec] border border-[#c4dcbc] px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              <span>已全额实时结算至骑手钱包</span>
            </span>
          </div>

          {/* Breakdown Items */}
          <div className="space-y-1.5 text-xs">
            <span className="text-[11px] font-bold text-[#787774] block">收入明细拆解:</span>
            <div className="p-3 bg-white rounded-[4px] border border-[#efefed] space-y-2">
              <div className="flex items-center justify-between text-[#5a5854]">
                <span>基础专送骑行费 (0.52km)</span>
                <span className="font-mono font-bold text-[#37352f]">¥5.50</span>
              </div>
              <div className="flex items-center justify-between text-[#d9730d]">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>流动餐车近距专属驻点补贴</span>
                </span>
                <span className="font-bold">+¥2.00</span>
              </div>
              <div className="flex items-center justify-between text-[#2b593f]">
                <span>高精温控保鲜及极速履约奖</span>
                <span className="font-bold">+¥1.00</span>
              </div>
            </div>
          </div>

          {/* Customer Feedback */}
          <div className="p-3 bg-[#edf3ec] rounded-[4px] border border-[#c4dcbc] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#2b593f] flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>顾客极速好评</span>
              </span>
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-current" />
                ))}
              </div>
            </div>
            <p className="text-[11px] text-[#2b593f]/90 leading-tight">
              “汉堡到手还是烫的，冷萃咖啡冰块完全没化，包装非常专业，送达速度超快！”
            </p>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onJumpToPool();
            }}
            className="w-full py-2.5 bg-[#2b593f] hover:bg-[#204430] active:scale-98 text-white rounded-[4px] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
          >
            <Zap className="w-4 h-4 text-[#fde047]" />
            <span>立即前往抢单大厅 · 接下一单</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onJumpToEarnings();
              }}
              className="flex-1 py-1.5 bg-white border border-[#d3d1cb] hover:bg-[#efefed] text-[#37352f] rounded-[3px] font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Wallet className="w-3.5 h-3.5 text-[#2b593f]" />
              <span>查看收益钱包</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#f1f1ef] hover:bg-[#e8e8e6] text-[#787774] hover:text-[#37352f] rounded-[3px] font-semibold text-xs cursor-pointer transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
