import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Truck,
  Trash2,
  ArrowRight,
  ShoppingBag,
  X,
  Sparkles
} from 'lucide-react';
import { DishItem } from '../types';

export interface CrossTruckCartModalProps {
  isOpen: boolean;
  currentTruckName: string;
  currentCartItemCount: number;
  currentCartTotal: number;
  newTruckName: string;
  newDishItem?: DishItem | null;
  onConfirmSwitchAndClear: () => void;
  onCancelKeepExisting: () => void;
}

export const CrossTruckCartModal: React.FC<CrossTruckCartModalProps> = ({
  isOpen,
  currentTruckName,
  currentCartItemCount,
  currentCartTotal,
  newTruckName,
  newDishItem,
  onConfirmSwitchAndClear,
  onCancelKeepExisting
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancelKeepExisting}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e2e3e1] overflow-hidden z-10"
        >
          {/* Header Bar */}
          <div className="bg-amber-50/80 border-b border-amber-200/80 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#1a1c1b] tracking-tight">
                  跨餐车点餐冲突拦截
                </h3>
                <p className="text-[11px] text-amber-800 font-medium">
                  每笔外卖/堂食仅支持从单一餐车站台发货
                </p>
              </div>
            </div>
            <button
              onClick={onCancelKeepExisting}
              className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-4 text-xs text-[#37352f]">
            {/* Visual Contrast Cards */}
            <div className="grid grid-cols-1 gap-2.5">
              {/* Current Cart */}
              <div className="p-3 bg-[#fafaf8] rounded-xl border border-[#e8e8e4] flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                    当前购物车归属
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-[#1a1c1b]">
                    <Truck className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                    <span>{currentTruckName}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-neutral-500 block">共 {currentCartItemCount} 件餐品</span>
                  <span className="tabular-nums font-bold text-xs text-neutral-800">
                    ¥{currentCartTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Arrow Divider */}
              <div className="flex items-center justify-center text-neutral-400">
                <ArrowRight className="w-4 h-4 rotate-90 sm:rotate-0" />
              </div>

              {/* Target Truck */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    新选餐品餐车归属
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-[#006d36]">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{newTruckName}</span>
                  </div>
                </div>
                {newDishItem && (
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-800 font-bold block">{newDishItem.name}</span>
                    <span className="tabular-nums font-bold text-xs text-emerald-700">
                      ¥{newDishItem.price.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Explanation Note */}
            <div className="bg-[#f7f7f5] p-3 rounded-xl border border-[#ecece9] text-[11.5px] leading-relaxed text-[#5a5854]">
              💡 <strong>系统说明</strong>：黑曜石流动餐车分布在上海不同重点商圈，烹饪出餐与骑手取货路径完全独立。若切换至【{newTruckName}】，系统将为您清空原选购单并开启新餐车下单流程。
            </div>
          </div>

          {/* Action Footer */}
          <div className="bg-[#fafaf8] border-t border-[#e8e8e4] px-5 py-3.5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancelKeepExisting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-700 bg-white border border-[#d3d1cb] hover:bg-neutral-50 transition-colors shadow-2xs cursor-pointer"
            >
              保留原购物车
            </button>
            <button
              type="button"
              onClick={onConfirmSwitchAndClear}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空原车并切换点餐</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
