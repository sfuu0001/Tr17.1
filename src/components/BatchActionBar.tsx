import React from 'react';
import { CheckSquare, Square, ShoppingBag, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BatchActionBarProps {
  isMultiSelectMode: boolean;
  selectedCount: number;
  totalSelectedAmount: number;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onBatchAddToCart: () => void;
  onExitMultiSelect: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  isMultiSelectMode,
  selectedCount,
  totalSelectedAmount,
  isAllSelected,
  onToggleSelectAll,
  onClearSelection,
  onBatchAddToCart,
  onExitMultiSelect
}) => {
  return (
    <AnimatePresence>
      {isMultiSelectMode && (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl"
        >
          <div className="bg-white text-[#1a1c1b] px-4 sm:px-6 py-3.5 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-[#e2e3e1] flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left Stats & Select All */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start flex-wrap">
              <motion.button
                type="button"
                id="batch-bar-select-all-btn"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.92 }}
                onClick={onToggleSelectAll}
                className="flex items-center gap-2 text-xs font-bold text-[#1a1c1b] hover:bg-[#eaeae7] transition-colors cursor-pointer bg-[#f4f4f2] px-3 py-1.5 rounded-lg border border-[#e2e3e1]"
                title={isAllSelected ? '取消全选所有菜品卡片' : '一键全选所有在售菜品卡片'}
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-black" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-400" />
                )}
                <span>{isAllSelected ? '取消全选' : '全选菜品'}</span>
              </motion.button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#474741]">
                  已选 <strong className="text-black text-sm font-black">{selectedCount}</strong> 款
                </span>
                <span className="text-[#e2e3e1]">|</span>
                <span className="text-xs text-[#474741]">
                  合计 <strong className="text-black text-sm font-black">¥{totalSelectedAmount.toFixed(2)}</strong>
                </span>
              </div>

              {selectedCount > 0 && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={onClearSelection}
                  className="text-[11px] text-[#787770] hover:text-black underline transition-colors cursor-pointer"
                >
                  清空
                </motion.button>
              )}
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.92 }}
                onClick={onExitMultiSelect}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-[#f4f4f2] hover:bg-[#eaeae7] text-[#474741] hover:text-black border border-[#e2e3e1] transition-colors cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>退出多选</span>
              </motion.button>

              <motion.button
                type="button"
                disabled={selectedCount === 0}
                whileHover={selectedCount > 0 ? { scale: 1.03 } : {}}
                whileTap={selectedCount > 0 ? { scale: 0.92 } : {}}
                onClick={onBatchAddToCart}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedCount > 0
                    ? 'bg-black text-white hover:bg-neutral-800 shadow-md'
                    : 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>批量加入购物车 ({selectedCount})</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
