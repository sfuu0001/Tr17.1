import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UtensilsCrossed,
  Flame,
  Coffee,
  Beef,
  ChevronDown,
  ShoppingBag,
  Sparkles,
  Printer,
  X
} from 'lucide-react';
import { OrderItemRecord } from '../../types';

interface BeautifiedOrderDishesDropdownProps {
  items: OrderItemRecord[];
  totalAmount?: number;
  orderNo: string;
  channelType?: string;
  onPrintKitchenTicket?: () => void;
  className?: string;
  align?: 'left' | 'right' | 'center';
  variant?: 'inline' | 'popover' | 'auto';
}

/**
 * BeautifiedOrderDishesDropdown (订单菜品明细美化下拉彩单)
 * 严格遵循 AGENTS.md 第 7 条向下拉彩单小组件硬性美化规范：
 * - 语义化矢量图标 + 微光底槽
 * - 双层工控排版 (菜品名 + 规格说明)
 * - 胶囊微标 (数量 xN、已划菜、赠品等)
 * - 高阶毛玻璃容器 (backdrop-blur-xl bg-white/95 border shadow-2xl)
 * - 丝滑 AnimatePresence 微弹动效
 * - 支持 inline 内嵌展开模式，彻底杜绝移动端卡片被底部遮挡截断
 */
export const BeautifiedOrderDishesDropdown: React.FC<BeautifiedOrderDishesDropdownProps> = ({
  items = [],
  totalAmount,
  orderNo,
  channelType,
  onPrintKitchenTicket,
  className = '',
  align = 'left',
  variant = 'auto'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalQty = items.reduce((sum, it) => sum + (it.quantity || 1), 0);
  const itemCount = items.length;

  const isInline = variant === 'inline';

  // Close on click outside (only for popover mode)
  useEffect(() => {
    if (isInline) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isInline]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // First dish preview label
  const firstDishName = items[0]?.name || '餐品明细';
  const displaySummary = itemCount <= 1
    ? `${firstDishName} x${items[0]?.quantity || 1}`
    : `${firstDishName} 等 ${itemCount}品`;

  const alignClass =
    align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0';

  // Helper to pick dish icon
  const getDishIcon = (name: string) => {
    if (name.includes('牛') || name.includes('肉') || name.includes('排')) return Beef;
    if (name.includes('烤') || name.includes('串') || name.includes('炙')) return Flame;
    if (name.includes('饮') || name.includes('咖') || name.includes('茶') || name.includes('水')) return Coffee;
    return UtensilsCrossed;
  };

  return (
    <div
      ref={containerRef}
      className={`text-left max-w-full ${isInline ? 'w-full block' : 'relative inline-block'} ${className}`}
    >
      {/* 1. Trigger Controller (美化胶囊触发器) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        style={{ touchAction: 'manipulation' }}
        className={`h-8 px-2.5 sm:px-3 rounded-lg flex items-center justify-between gap-1.5 text-xs transition-all cursor-pointer select-none border max-w-full ${
          isInline ? 'w-full' : ''
        } ${
          isOpen
            ? 'bg-emerald-50/80 border-emerald-600/40 text-emerald-950 ring-1.5 ring-emerald-500/15 font-bold shadow-xs'
            : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200/90 hover:border-neutral-300 shadow-2xs font-medium'
        }`}
        title={isOpen ? '点击收起菜品明细彩单' : '点击展开全要素菜品明细彩单'}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <UtensilsCrossed
            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
              isOpen ? 'text-emerald-700' : 'text-neutral-500'
            }`}
          />

          <span className="truncate max-w-[130px] sm:max-w-[180px] md:max-w-[220px]">
            {displaySummary}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border leading-none shrink-0 tabular-nums ${
              isOpen
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-neutral-100 text-neutral-700 border-neutral-200'
            }`}
          >
            {itemCount}品/{totalQty}件
          </span>

          <ChevronDown
            className={`w-3 h-3 shrink-0 text-neutral-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-700' : ''
            }`}
          />
        </div>
      </button>

      {/* 2. Beautified Dropdown Popover (全要素向下拉彩单) OR Inline View */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={isInline ? { opacity: 0, height: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={isInline ? { opacity: 1, height: 'auto' } : { opacity: 1, y: 0, scale: 1 }}
            exit={isInline ? { opacity: 0, height: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={
              isInline
                ? 'overflow-hidden mt-2 w-full flex flex-col rounded-xl bg-neutral-50/90 border border-neutral-200/90 shadow-2xs p-2.5 z-20 space-y-2'
                : `absolute top-full mt-1.5 ${alignClass} w-76 sm:w-84 max-h-[380px] flex flex-col rounded-xl backdrop-blur-xl bg-white/95 border border-neutral-200/90 shadow-2xl shadow-neutral-950/15 p-2 z-50 overflow-hidden`
            }
          >
            {/* Header: 档口彩单小标 */}
            <div className="flex items-center justify-between px-1 pb-1.5 border-b border-neutral-100/90 mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
                  <Sparkles className="w-3 h-3" />
                </div>
                <span className="text-[11.5px] font-black text-neutral-900">
                  菜品清单明细 · 出品彩单
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-neutral-700 border border-neutral-200/80">
                  #{orderNo.replace(/^#/, '')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-5 h-5 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                  title="收起"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dish List Stream */}
            <div className={`overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin ${isInline ? 'max-h-[260px]' : 'flex-1 max-h-[240px]'}`}>
              {items.map((item, idx) => {
                const ItemIcon = getDishIcon(item.name);
                const isStruck = item.isStruckOff === true;
                const isGift = item.isCompensatoryGift === true;
                const itemTotal = (item.price || 0) * (item.quantity || 1);

                return (
                  <div
                    key={idx}
                    className={`flex items-start justify-between gap-2 p-2 rounded-lg border transition-all ${
                      isStruck
                        ? 'bg-rose-50/50 border-rose-200/80 text-rose-950'
                        : isGift
                        ? 'bg-amber-50/50 border-amber-200/80 text-amber-950'
                        : 'bg-neutral-50/70 border-neutral-100 hover:bg-neutral-50 hover:border-neutral-200'
                    }`}
                  >
                    {/* Icon Slot */}
                    <div
                      className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                        isStruck
                          ? 'bg-rose-100 border-rose-200 text-rose-700'
                          : isGift
                          ? 'bg-amber-100 border-amber-200 text-amber-700'
                          : 'bg-white border-neutral-200/90 text-emerald-700 shadow-2xs'
                      }`}
                    >
                      <ItemIcon className="w-3.5 h-3.5" />
                    </div>

                    {/* Dish Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs ${
                            isStruck
                              ? 'line-through text-neutral-400 font-normal'
                              : 'font-bold text-neutral-900'
                          }`}
                        >
                          {item.name}
                        </span>

                        {isStruck && (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-rose-600 text-white leading-none">
                            已划菜作废
                          </span>
                        )}

                        {isGift && (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-white leading-none">
                            补偿赠品
                          </span>
                        )}
                      </div>

                      {/* Specs / Options */}
                      <p className="text-[10.5px] text-neutral-500 truncate mt-0.5">
                        {item.options || item.variantName || '标准匠心工艺出品'}
                        {item.station ? ` · [${item.station}]` : ''}
                      </p>
                    </div>

                    {/* Quantity & Price */}
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <span className="text-[11px] font-black text-neutral-900 px-1.5 py-0.5 rounded bg-white border border-neutral-200/90 shadow-2xs leading-none tabular-nums">
                        x{item.quantity || 1}
                      </span>
                      <span
                        className={`text-xs font-amount font-bold mt-1 ${
                          isStruck ? 'line-through text-neutral-400' : 'text-neutral-900'
                        }`}
                      >
                        ¥{itemTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Summary & Quick Action */}
            <div className="pt-2 mt-1.5 border-t border-neutral-100/90 flex items-center justify-between px-1">
              <div className="text-xs">
                <span className="text-neutral-500 font-medium">总计: </span>
                <span className="font-black text-neutral-900 font-amount text-sm ml-1">
                  ¥{totalAmount !== undefined ? totalAmount.toFixed(2) : items.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-neutral-400 ml-1.5">
                  ({itemCount}品 / {totalQty}件)
                </span>
              </div>

              {onPrintKitchenTicket && (
                <button
                  type="button"
                  onClick={() => {
                    onPrintKitchenTicket();
                    setIsOpen(false);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200/90 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer hover:border-neutral-300 transition-all"
                  title="打印档口小票"
                >
                  <Printer className="w-3 h-3 text-neutral-600" />
                  <span>打单小票</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
