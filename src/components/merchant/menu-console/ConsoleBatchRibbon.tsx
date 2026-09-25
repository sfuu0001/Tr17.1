import React from 'react';
import { BadgePercent, Power, ShoppingCart, X } from 'lucide-react';
import { DishItem } from '../../../types';
import { getSkuCode } from './consoleTokens';

/* ============================================================================
 * ④ FLOATING BATCH ACTION RIBBON — 批量操作战术 HUD 浮层
 * ----------------------------------------------------------------------------
 * 结构（与参考稿 section 4 对齐）：
 *   左：脉冲状态点 + 「已选中 N 个菜品规格矩阵」+ SKU 锁定策略胶囊 + FAST BATCH EDIT
 *       + TARGETS 等宽目标清单
 *   右：批量改价 / 一键全通售 / 全渠道沽清 + 分隔线 + 取消选择
 * 三端：desktop/tablet 为 sticky bottom 悬浮卡（左右留边距，max-w 居中）；
 *       mobile 吸附屏幕底部通栏，动作按钮带文字标签保证触控可读性。
 * ========================================================================== */

export interface ConsoleBatchRibbonProps {
  selectedDishes: DishItem[];
  onOpenQuickPriceModal: () => void;
  onBulkAllInStock: () => void;
  onBulkAllSoldOut: () => void;
  onClearSelection: () => void;
}

interface RibbonActionProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  className: string;
}

const RibbonAction: React.FC<RibbonActionProps> = ({ icon: Icon, label, onClick, className }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className={`flex items-center justify-center gap-1.5 h-8 px-2 sm:w-8 sm:px-0 border rounded-console transition-all cursor-pointer shrink-0 ${className}`}
  >
    <Icon className="w-4 h-4" strokeWidth={1.9} />
    <span className="font-label-micro sm:hidden whitespace-nowrap">{label}</span>
  </button>
);

export const ConsoleBatchRibbon: React.FC<ConsoleBatchRibbonProps> = ({
  selectedDishes,
  onOpenQuickPriceModal,
  onBulkAllInStock,
  onBulkAllSoldOut,
  onClearSelection
}) => {
  if (selectedDishes.length === 0) return null;

  const targets = selectedDishes
    .slice(0, 6)
    .map((dish) => `[${getSkuCode(dish)} // ${dish.name}]`)
    .join(', ');
  const overflow = selectedDishes.length > 6 ? ` +${selectedDishes.length - 6}` : '';

  return (
    <div className="sticky bottom-11 z-30 px-space-sm sm:px-space-md lg:px-space-lg pb-space-sm sm:pb-0">
      <div className="bg-card-bg text-text-prominent p-space-sm border border-border-main shadow-console-hud rounded-console flex flex-wrap items-center justify-between gap-space-sm sm:gap-space-md">
        <div className="flex items-center gap-space-sm sm:gap-space-md min-w-0">
          <div className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0 bg-signal-live" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-label-md font-bold text-text-prominent">
                已选中 {selectedDishes.length} 个菜品规格矩阵
              </span>
              <span className="font-label-micro px-1.5 py-0.2 border rounded-console font-semibold bg-signal-amber-bg border-signal-amber text-signal-amber-strong">
                SKU 锁定策略生效
              </span>
              <span className="font-label-micro text-text-light-mono uppercase hidden sm:inline">
                // FAST BATCH EDIT
              </span>
            </div>
            <span className="font-code-sm text-text-muted mt-0.5 truncate">
              TARGETS: {targets}
              {overflow}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <RibbonAction
            icon={BadgePercent}
            label="批量改价"
            onClick={onOpenQuickPriceModal}
            className="bg-slate-blue-bg border-border-main text-text-secondary hover:bg-slate-blue hover:text-white"
          />
          <RibbonAction
            icon={Power}
            label="一键全通售"
            onClick={onBulkAllInStock}
            className="bg-signal-live-surface border-signal-live-border text-signal-live-strong hover:bg-status-olive hover:text-white"
          />
          <RibbonAction
            icon={ShoppingCart}
            label="全渠道沽清"
            onClick={onBulkAllSoldOut}
            className="bg-signal-critical-surface border-signal-critical-border-soft text-signal-critical-strong hover:bg-status-terracotta hover:text-white"
          />
          <div className="h-6 w-px bg-border-main hidden sm:block" />
          <RibbonAction
            icon={X}
            label="取消选择"
            onClick={onClearSelection}
            className="bg-transparent border-transparent text-text-muted hover:border-border-main hover:text-text-prominent"
          />
        </div>
      </div>
    </div>
  );
};

export default ConsoleBatchRibbon;
