import React, { useEffect, useState } from 'react';
import { DishItem } from '../../types';
import {
  CONSOLE_TABLE_BREAKPOINT,
  ConsoleChannelKey,
  ConsoleChannelState,
  ConsoleViewMode,
  resolveEffectiveView
} from './menu-console/consoleTokens';
import { ConsoleMatrix } from './menu-console/ConsoleMatrix';

/* ============================================================================
 * MerchantDishListView — 菜品拓扑矩阵宿主
 * ----------------------------------------------------------------------------
 * 三端适配策略（与参考稿 applyView('adaptive') 行为一致）：
 *   · auto   : 视口 ≥1024px → 高密度 7 列表格；<1024px → 卡片拓扑
 *   · table  : 强制表格视图（平板横屏 / 桌面运维位）
 *   · card   : 强制卡片拓扑（移动端 / 平板竖屏）
 * 本组件不自带外框，由 MerchantMenuChannel 统一包裹边框容器，
 * 使矩阵主体与页脚遥测条 / 分页器形成一体化硬边界。
 * ========================================================================== */

interface MerchantDishListViewProps {
  pagedDishes: DishItem[];
  filteredDishesCount: number;
  viewMode: ConsoleViewMode;
  selectedDishIds: Set<string>;
  channelOverrides: Record<string, ConsoleChannelState>;
  moreActionDishId: string | null;
  onToggleSelectDish: (dishId: string) => void;
  onToggleSelectAll: () => void;
  onToggleChannel: (dishId: string, channel: ConsoleChannelKey) => void;
  onSetSingleDishAllChannels: (dish: DishItem, status: boolean) => void;
  onPrintLabel: (dish: DishItem) => void;
  onOpenEditModal: (dish: DishItem, tab?: unknown) => void;
  onOpenDrawer: (dish: DishItem) => void;
  onOpenUploadModal: (dish: DishItem) => void;
  onPreviewZoom: (dish: DishItem) => void;
  onQuickPrice: (dish: DishItem) => void;
  onCloneDish: (dish: DishItem) => void;
  setMoreActionDishId: (id: string | null) => void;
  onResetFilters: () => void;
  onOpenQrCode?: (dish: DishItem) => void;
}

export const MerchantDishListView: React.FC<MerchantDishListViewProps> = ({
  pagedDishes,
  filteredDishesCount,
  viewMode,
  selectedDishIds,
  channelOverrides,
  onToggleSelectDish,
  onToggleSelectAll,
  onToggleChannel,
  onSetSingleDishAllChannels,
  onPrintLabel,
  onOpenEditModal,
  onOpenDrawer,
  onOpenUploadModal,
  onPreviewZoom,
  onQuickPrice,
  onCloneDish,
  onResetFilters,
  onOpenQrCode
}) => {
  // 自适应视图：仅在 auto 模式下监听视口宽度以切换表格 / 卡片拓扑
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window === 'undefined' ? CONSOLE_TABLE_BREAKPOINT : window.innerWidth
  );

  useEffect(() => {
    if (viewMode !== 'auto') return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const effectiveView = resolveEffectiveView(viewMode, viewportWidth);

  return (
    <ConsoleMatrix
      dishes={pagedDishes}
      viewMode={viewMode}
      effectiveView={effectiveView}
      totalFiltered={filteredDishesCount}
      selectedDishIds={selectedDishIds}
      channelOverrides={channelOverrides}
      onToggleSelectDish={onToggleSelectDish}
      onToggleSelectAll={onToggleSelectAll}
      onToggleChannel={onToggleChannel}
      onSetSingleDishAllChannels={onSetSingleDishAllChannels}
      onPrintLabel={onPrintLabel}
      onOpenEditModal={onOpenEditModal}
      onOpenDrawer={onOpenDrawer}
      onOpenUploadModal={onOpenUploadModal}
      onPreviewZoom={onPreviewZoom}
      onQuickPrice={onQuickPrice}
      onCloneDish={onCloneDish}
      onResetFilters={onResetFilters}
      onOpenQrCode={onOpenQrCode}
    />
  );
};

export default MerchantDishListView;
