import React from 'react';
import { DishItem } from '../../types';
import {
  ConsoleChannelState,
  ConsoleStatusFilter,
  ConsoleViewMode,
  getCategoryDensity,
  getChannelTelemetry,
  getDepletionBreakdown
} from './menu-console/consoleTokens';
import { ConsoleTopDeck } from './menu-console/ConsoleTopDeck';
import { ConsoleMetricsDeck } from './menu-console/ConsoleMetricsDeck';
import { ConsoleFilterDeck } from './menu-console/ConsoleFilterDeck';

/* ============================================================================
 * MerchantMenuHeaderDeck — 控制台甲板编排层
 * ----------------------------------------------------------------------------
 * 「菜品与多渠道沽清界面」的 Top Deck / Metrics Deck / Filter Deck /
 * Batch Ribbon 四段由本组件统一编排，对外保持既有 props 契约不变。
 * 呈现层已全部迁移至 Industrial Precision Console 令牌集，不再引用旧令牌。
 * ========================================================================== */

interface MerchantMenuHeaderDeckProps {
  dishes: DishItem[];
  viewMode: ConsoleViewMode;
  setViewMode: (mode: ConsoleViewMode) => void;
  isSyncingCloud: boolean;
  onSyncAllDishesToCloud: () => void;
  onRematchImages?: () => void;
  selectedDishIds: Set<string>;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onOpenAddModal: () => void;
  categories: Array<{ id: string; name: string; count: number }>;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: ConsoleStatusFilter;
  setStatusFilter: (s: ConsoleStatusFilter) => void;
  cookingStyleFilter: string;
  setCookingStyleFilter: (s: string) => void;
  cookingStyles: string[];
  isAdvancedFilterOpen: boolean;
  setIsAdvancedFilterOpen: (open: boolean) => void;
  advPriceMin: string;
  setAdvPriceMin: (p: string) => void;
  advPriceMax: string;
  setAdvPriceMax: (p: string) => void;
  advHasVariants: boolean;
  setAdvHasVariants: (v: boolean) => void;
  advHasBarcode: boolean;
  setAdvHasBarcode: (b: boolean) => void;
  advHasDiscount: boolean;
  setAdvHasDiscount: (d: boolean) => void;
  onResetAllFilters: () => void;
  onOpenQuickPriceModal: () => void;
  onBulkAllInStock: () => void;
  onBulkAllSoldOut: () => void;
  onOpenBatchModal: () => void;
  onOpenComboQrModal?: () => void;
  /** 多渠道覆盖状态（驱动遥测与指标卡；缺省时按 orderType 回退推导） */
  channelOverrides?: Record<string, ConsoleChannelState>;
}

export const MerchantMenuHeaderDeck: React.FC<MerchantMenuHeaderDeckProps> = ({
  dishes,
  viewMode,
  setViewMode,
  isSyncingCloud,
  onSyncAllDishesToCloud,
  onRematchImages,
  selectedDishIds,
  onClearSelection,
  onOpenAddModal,
  onOpenComboQrModal,
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  cookingStyleFilter,
  setCookingStyleFilter,
  cookingStyles,
  isAdvancedFilterOpen,
  setIsAdvancedFilterOpen,
  advPriceMin,
  setAdvPriceMin,
  advPriceMax,
  setAdvPriceMax,
  advHasVariants,
  setAdvHasVariants,
  advHasBarcode,
  setAdvHasBarcode,
  advHasDiscount,
  setAdvHasDiscount,
  onResetAllFilters,
  onOpenQuickPriceModal,
  onBulkAllInStock,
  onBulkAllSoldOut,
  onOpenBatchModal,
  channelOverrides
}) => {
  const telemetry = getChannelTelemetry(dishes, channelOverrides);
  const density = getCategoryDensity(dishes);
  const depletion = getDepletionBreakdown(dishes, channelOverrides);
  const categoryTotal = new Set(dishes.map((dish) => dish.category)).size;

  return (
    <div className="w-full bg-page-bg font-body-md text-text-prominent">
      {/* ① 顶层运营甲板 */}
      <ConsoleTopDeck
        telemetry={telemetry}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isSyncingCloud={isSyncingCloud}
        onSyncAllDishesToCloud={onSyncAllDishesToCloud}
        onRematchImages={onRematchImages || onSyncAllDishesToCloud}
        onBulkAllInStock={onBulkAllInStock}
        onBulkAllSoldOut={onBulkAllSoldOut}
        onOpenBatchModal={onOpenBatchModal}
        onOpenAddModal={onOpenAddModal}
        onOpenComboQrModal={onOpenComboQrModal}
      />

      {/* ②③④ 工作区主体（指标卡 → 筛选甲板 → 批量 HUD） */}
      <div className="p-space-sm sm:p-space-md lg:p-space-lg space-y-space-md sm:space-y-space-lg">
        <ConsoleMetricsDeck
          telemetry={telemetry}
          density={density}
          depletion={depletion}
          categoryTotal={categoryTotal}
        />

        <ConsoleFilterDeck
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          cookingStyleFilter={cookingStyleFilter}
          setCookingStyleFilter={setCookingStyleFilter}
          cookingStyles={cookingStyles}
          activeCount={telemetry.active}
          depletedCount={telemetry.depleted}
          isAdvancedFilterOpen={isAdvancedFilterOpen}
          setIsAdvancedFilterOpen={setIsAdvancedFilterOpen}
          advPriceMin={advPriceMin}
          setAdvPriceMin={setAdvPriceMin}
          advPriceMax={advPriceMax}
          setAdvPriceMax={setAdvPriceMax}
          advHasVariants={advHasVariants}
          setAdvHasVariants={setAdvHasVariants}
          advHasBarcode={advHasBarcode}
          setAdvHasBarcode={setAdvHasBarcode}
          advHasDiscount={advHasDiscount}
          setAdvHasDiscount={setAdvHasDiscount}
          onResetAllFilters={onResetAllFilters}
        />
      </div>
    </div>
  );
};

export default MerchantMenuHeaderDeck;
