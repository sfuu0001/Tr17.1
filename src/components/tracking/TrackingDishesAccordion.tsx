import React, { useState } from 'react';
import { Box, ChevronRight, Copy, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TrackingDishItem } from '../../types/tracking';

interface TrackingDishesAccordionProps {
  dishes?: TrackingDishItem[];
  packageFee?: number;
  deliveryFee?: number;
  discountFee?: number;
  totalAmount?: number;
  onCopyBill?: () => void;
}

export const TrackingDishesAccordion: React.FC<TrackingDishesAccordionProps> = ({
  dishes = [
    {
      name: '黑松露炭烤和牛双层堡',
      count: 2,
      spec: '七分熟 / 搭配自制松露酱 / 双倍芝士',
      price: 96.0
    },
    {
      name: '金牌香脆粗薯条 (大份)',
      count: 1,
      spec: '配蜂蜜芥末酱 + 蒜香蛋黄酱',
      price: 28.0
    },
    {
      name: '手作生椰冷萃冰拿铁',
      count: 1,
      spec: '标准冰 / 无额外加糖 / 大杯 500ml',
      price: 21.0
    }
  ],
  packageFee = 4.0,
  deliveryFee = 0.0,
  discountFee = 4.0,
  totalAmount = 145.0,
  onCopyBill
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalItemCount = dishes.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white px-4 py-3.5 border-b border-[#ededeb]">
      {/* Header Accordion Toggle matching screenshot */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity cursor-pointer group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Box className="w-5 h-5 text-black stroke-[1.8] shrink-0" />
          <span className="text-[14px] font-bold text-black truncate">
            餐品明细 (共 {totalItemCount} 件)
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[14px] font-bold text-black">
            ¥{totalAmount.toFixed(2)}
          </span>
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-4 h-4 text-[#888880]" />
          </motion.div>
        </div>
      </button>

      {/* Expanded Details List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="pt-3 mt-2 border-t border-[#f0f0ed] space-y-3 text-xs overflow-hidden"
          >
            {/* Dish Items */}
            {dishes.map((dish, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-black text-[13px]">{dish.name}</span>
                    <span className="text-[10px] bg-[#f0f0ee] text-[#666] px-1.5 py-0.2 rounded-none">
                      x{dish.count}
                    </span>
                  </div>
                  {dish.spec && <p className="text-[11px] text-[#888882]">{dish.spec}</p>}
                </div>
                <span className="font-bold text-black text-[13px]">
                  ¥{dish.price.toFixed(2)}
                </span>
              </div>
            ))}

            {/* Fee Calculations */}
            <div className="border-t border-[#f0f0ed] pt-2.5 space-y-1.5 text-[12px]">
              <div className="flex justify-between text-[#787770]">
                <span>环保餐具与保温袋包装费</span>
                <span className="text-black font-medium">¥{packageFee.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-[#787770]">
                <span>流动餐车 GPS 专送费</span>
                <div className="flex items-center gap-1.5">
                  <span className="line-through text-[#aaa] text-[11px]">¥5.00</span>
                  <span className="text-[#059669] font-bold text-[11px]">尊享免配送费</span>
                </div>
              </div>

              {discountFee > 0 && (
                <div className="flex justify-between text-[#787770]">
                  <span>餐车会员专享立减</span>
                  <span className="text-[#ea580c] font-bold">-¥{discountFee.toFixed(2)}</span>
                </div>
              )}

              {/* Total Row */}
              <div className="border-t border-[#f0f0ed] pt-2.5 flex items-center justify-between">
                <span className="text-[14px] font-black text-black">实付金额</span>
                <span className="text-[16px] font-black text-black">
                  ¥{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onCopyBill}
                className="px-3 py-1.5 bg-[#f4f4f1] hover:bg-[#eaeae6] active:scale-95 text-black text-[11.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer rounded-none"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>复制餐品清单</span>
              </button>

              <div className="flex items-center gap-1 text-[11px] text-[#787770]">
                <Receipt className="w-3.5 h-3.5" />
                <span>电子发票已自动开具</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
