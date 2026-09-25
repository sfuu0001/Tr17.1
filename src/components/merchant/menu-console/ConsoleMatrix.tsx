import React, { useState } from 'react';
import {
  Flame,
  Leaf,
  Cookie,
  Utensils,
  Network,
  Printer,
  Sliders,
  Copy,
  ImagePlus,
  Maximize2,
  Pencil,
  PackagePlus,
  Ruler,
  QrCode
} from 'lucide-react';
import { DishItem } from '../../../types';
import {
  ConsoleChannelState,
  ConsoleViewMode,
  CHANNEL_LABELS,
  CHANNEL_SHORT_LABELS,
  ConsoleChannelKey,
  SKU_STATUS_DOT,
  SKU_STATUS_TEXT,
  TONE_CLASS,
  ConsoleTone,
  formatYuan,
  getBarcodeLabel,
  getDailyQuota,
  getMarginRate,
  getRemainingPortions,
  getSkuCode,
  getSopCode,
  getSopLoad,
  getSpicinessReading,
  getViewModeMeta,
  resolveChannelState,
  resolveSkuStatus
} from './consoleTokens';

/* ============================================================================
 * ⑤ DISH TOPOLOGY MATRIX — 菜品拓扑与实时库存记录矩阵
 * ----------------------------------------------------------------------------
 * 结构（与参考稿 section 3 对齐）：
 *   a. Grid Meta Deck Bar：段标题 + Schema 徽标 / PARALLEL SYNC + MODE 徽标
 *   b. 高密度 7 列表格视图（table / adaptive ≥1024px）
 *   c. 卡片拓扑视图（card / adaptive <1024px），3 端自适应列数
 * 说明：本组件不自带外框，由宿主 MerchantMenuChannel 统一提供边框容器，
 *       以便页脚遥测条与分页器无缝衔接。
 * ========================================================================== */

const CATEGORY_LABEL: Record<string, string> = {
  yakitori: '日式烧鸟',
  skewers: '炭烤串串',
  baked: '芝士焗类',
  western: '精致西餐',
  mains: '主食简餐',
  drinks: '特调冷萃',
  desserts: '手作甜品',
  snacks: '风味小吃'
};

const CATEGORY_TONE: Record<string, ConsoleTone> = {
  yakitori: 'navy',
  skewers: 'terracotta',
  baked: 'orange',
  western: 'navy',
  mains: 'blue',
  drinks: 'blue',
  desserts: 'orange',
  snacks: 'neutral'
};

/** 缩略图：加载失败时回落为类目字形块，避免矩阵出现破图 */
const DishThumb: React.FC<{ dish: DishItem; size: 'row' | 'card'; muted?: boolean }> = ({
  dish,
  size,
  muted
}) => {
  const [failed, setFailed] = useState(false);
  const box = size === 'row' ? 'w-14 h-14' : 'w-20 h-20';
  const isUrl = Boolean(dish.imageUrl) && dish.imageUrl !== 'none';

  if (!isUrl || failed) {
    return (
      <div
        className={`${box} shrink-0 bg-page-bg border border-border-main rounded-[2px] flex items-center justify-center text-text-muted font-label-micro ${muted ? 'opacity-70' : ''}`}
      >
        {dish.category.toUpperCase().slice(0, 4)}
      </div>
    );
  }

  return (
    <img
      src={dish.imageUrl}
      alt={dish.name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${box} object-cover rounded-[2px] border border-border-main bg-page-bg shrink-0 ${
        muted ? 'grayscale opacity-90' : ''
      }`}
    />
  );
};

const SpicinessIcon: React.FC<{ hot: boolean; severe?: boolean }> = ({ hot, severe }) => {
  if (!hot) return <Leaf className="w-[13px] h-[13px] text-text-muted" strokeWidth={2} />;
  if (severe) return <Flame className="w-[13px] h-[13px] text-status-terracotta" strokeWidth={2} />;
  return <Flame className="w-[13px] h-[13px] text-accent-orange" strokeWidth={2} />;
};

const FlavorIcon: React.FC<{ dish: DishItem }> = ({ dish }) => {
  if (dish.category === 'baked' || dish.category === 'desserts') {
    return <Cookie className="w-[13px] h-[13px] text-text-muted" strokeWidth={2} />;
  }
  if (dish.category === 'snacks' || dish.category === 'mains') {
    return <Utensils className="w-[13px] h-[13px] text-text-muted" strokeWidth={2} />;
  }
  return <Leaf className="w-[13px] h-[13px] text-text-muted" strokeWidth={2} />;
};

interface ChannelChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}

const ChannelChip: React.FC<ChannelChipProps> = ({ label, active, onClick, compact }) => (
  <button
    type="button"
    onClick={onClick}
    title={`切换「${label}」渠道供售状态`}
    className={`text-[11px] font-medium rounded-[2px] border transition-colors cursor-pointer ${
      compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5'
    } ${
      active
        ? 'bg-status-olive-bg border-status-olive-border text-status-olive'
        : 'bg-page-bg border-border-main text-text-muted'
    }`}
  >
    {compact ? label : `${label} ${active ? 'ON' : 'OFF'}`}
  </button>
);

interface MiniActionProps {
  icon: React.ElementType;
  title: string;
  onClick: () => void;
}

const MiniAction: React.FC<MiniActionProps> = ({ icon: Icon, title, onClick }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    className="flex items-center justify-center w-5 h-5 rounded-[2px] border border-transparent text-text-light-mono hover:text-text-prominent hover:border-border-main hover:bg-page-bg transition-colors cursor-pointer"
  >
    <Icon className="w-3 h-3" strokeWidth={2} />
  </button>
);

export interface ConsoleMatrixProps {
  dishes: DishItem[];
  viewMode: ConsoleViewMode;
  effectiveView: 'table' | 'card';
  totalFiltered: number;
  selectedDishIds: Set<string>;
  channelOverrides: Record<string, ConsoleChannelState>;
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
  onResetFilters: () => void;
  onOpenQrCode?: (dish: DishItem) => void;
}

export const ConsoleMatrix: React.FC<ConsoleMatrixProps> = ({
  dishes,
  viewMode,
  effectiveView,
  totalFiltered,
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
  const meta = getViewModeMeta(viewMode, dishes.length);
  const isAllSelected = dishes.length > 0 && dishes.every((dish) => selectedDishIds.has(dish.id));
  const showTable = effectiveView === 'table';
  const showCards = effectiveView === 'card';

  return (
    <>
      {/* a. Grid Meta Deck Bar */}
      <div className="px-space-md py-space-sm bg-page-bg border-b border-border-main flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0">
          <span className="font-label-micro text-text-prominent font-bold uppercase tracking-wider truncate">
            {meta.sectionTitle}
          </span>
          <span className="font-label-micro px-1.5 py-0.2 bg-card-bg border border-border-main text-text-secondary rounded-console shrink-0">
            {meta.schemaBadge}
          </span>
        </div>
        <div className="flex items-center gap-space-md">
          <span className="font-label-micro text-text-muted uppercase">
            PARALLEL SYNC: <span className="text-status-olive font-bold">100% OK</span>
          </span>
          <span className="font-label-micro text-text-light-mono uppercase hidden sm:inline">
            {meta.modeBadge}
          </span>
        </div>
      </div>

      {/* 空状态 */}
      {dishes.length === 0 && (
        <div className="p-space-xl text-center flex flex-col items-center gap-space-sm">
          <div className="w-10 h-10 rounded-[2px] border border-border-main bg-page-bg flex items-center justify-center">
            <Ruler className="w-5 h-5 text-text-muted" strokeWidth={1.6} />
          </div>
          <h3 className="font-headline-sm text-text-prominent font-semibold">未检索到符合条件的菜品记录</h3>
          <p className="font-label-sm text-text-muted">
            当前筛选条件命中 0 条记录（全库 {totalFiltered} 项候选）· 建议调整关键词或重置参数漏斗
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-1 px-space-md py-1.5 bg-dark-container text-white rounded-[2px] font-label-micro uppercase font-medium hover:bg-dark-container-hover transition-colors cursor-pointer"
          >
            重置全部筛选条件
          </button>
        </div>
      )}

      {/* b. 高密度 7 列表格视图 */}
      {dishes.length > 0 && showTable && (
        <div className="overflow-x-auto console-view-fade-in">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-page-bg border-b border-border-main text-xs font-semibold text-[#787774] uppercase tracking-wide sticky top-0 z-20">
                <th className="p-space-md w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onToggleSelectAll}
                    aria-label="全选当前页菜品"
                    className="w-3.5 h-3.5 accent-dark-container rounded-[2px] cursor-pointer"
                  />
                </th>
                <th className="p-space-md min-w-[260px]">菜品与条码代号 (SKU METADATA)</th>
                <th className="p-space-md min-w-[190px]">基准售价与渠道立减</th>
                <th className="p-space-md min-w-[230px]">制作风格与工艺 SOP</th>
                <th className="p-space-md min-w-[200px]">辣度与主理人风味</th>
                <th className="p-space-md min-w-[170px]">全渠道供餐通道</th>
                <th className="p-space-md min-w-[190px] text-right">在售状态与操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main font-body-md text-text-prominent">
              {dishes.map((dish) => {
                const channelState = resolveChannelState(dish, channelOverrides);
                const status = resolveSkuStatus(channelState);
                const isSelected = selectedDishIds.has(dish.id);
                const isDepleted = status === 'depleted';
                const isLimited = status === 'limited';
                const portions = getRemainingPortions(dish, status);
                const quota = getDailyQuota(dish);
                const margin = getMarginRate(dish);
                const spice = getSpicinessReading(dish);
                const categoryTag = dish.subCategoryName || CATEGORY_LABEL[dish.category] || '全部';
                const categoryTone = CATEGORY_TONE[dish.category] || 'neutral';
                const promoTag = dish.typeTag || '在售';
                const promoLabel = isDepleted ? '缺料预警' : isLimited ? '限定供应' : categoryTag;
                const promoLabelTone: ConsoleTone = isDepleted
                  ? 'terracotta'
                  : isLimited
                  ? 'orange'
                  : categoryTone;

                return (
                  <tr
                    key={`matrix-row-${dish.id}`}
                    className={`bg-card-bg hover:bg-page-bg transition-colors group ${
                      isSelected ? 'bg-page-bg' : ''
                    }`}
                  >
                    {/* 选择 */}
                    <td className="p-space-md text-center align-top">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectDish(dish.id)}
                        aria-label={`选择 ${dish.name}`}
                        className="row-checkbox w-3.5 h-3.5 accent-dark-container rounded-[2px] cursor-pointer"
                      />
                    </td>

                    {/* 菜品与条码代号 */}
                    <td className="p-space-md align-top">
                      <div className={`flex items-start gap-space-sm ${isDepleted ? 'opacity-90' : ''}`}>
                        <button
                          type="button"
                          onClick={() => onPreviewZoom(dish)}
                          title="放大查看主图"
                          className="shrink-0 cursor-pointer"
                        >
                          <DishThumb dish={dish} size="row" muted={isDepleted} />
                        </button>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-headline-sm text-text-prominent font-semibold leading-tight">
                              {dish.name}
                            </span>
                            <span
                              className={`font-label-micro px-1 py-0.2 rounded-[2px] ${TONE_CLASS[promoLabelTone]}`}
                            >
                              {isDepleted || isLimited ? promoLabel : promoTag}
                            </span>
                          </div>
                          <span className="font-label-micro text-text-light-mono uppercase mt-0.5 tracking-tight truncate">
                            {dish.enName || CATEGORY_LABEL[dish.category]}
                          </span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="font-label-micro text-text-muted bg-page-bg border border-border-main px-1 py-0.2 rounded-[2px]">
                              BARCODE: {getBarcodeLabel(dish)}
                            </span>
                            <span className="font-label-micro text-text-light-mono uppercase">
                              {getSkuCode(dish)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 基准售价与渠道立减 */}
                    <td className="p-space-md align-top">
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`font-headline-sm font-semibold text-[17px] ${
                              isDepleted ? 'text-text-prominent' : 'text-status-olive'
                            }`}
                          >
                            {formatYuan(dish.price)}
                          </span>
                          {dish.originalPrice && dish.originalPrice > dish.price && (
                            <span className="font-label-micro text-text-light-mono line-through">
                              {formatYuan(dish.originalPrice)}
                            </span>
                          )}
                        </div>
                        {dish.deliveryDiscount ? (
                          <span className="font-label-micro text-status-olive font-medium mt-0.5">
                            外卖立减 {formatYuan(dish.deliveryDiscount)}
                          </span>
                        ) : dish.dineInDiscount ? (
                          <span className="font-label-micro text-status-olive font-medium mt-0.5">
                            堂食立减 {formatYuan(dish.dineInDiscount)}
                          </span>
                        ) : (
                          <span className="font-label-micro text-text-body mt-0.5">
                            {dish.orderType === 'dine_in' ? '仅限堂食 / 堂食独享' : '原价直售'}
                          </span>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <span className="font-label-micro text-text-body">毛利率 {margin}%</span>
                          <span className="w-1 h-1 rounded-full bg-border-main" />
                          <span
                            className={`font-label-micro font-medium ${
                              margin >= 70 ? 'text-status-olive' : 'text-text-muted'
                            }`}
                          >
                            {margin >= 70 ? 'HIGH-YIELD' : 'STANDARD'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 制作风格与工艺 SOP */}
                    <td className="p-space-md align-top">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-label-micro px-1.5 py-0.5 bg-page-bg border border-border-main text-text-prominent font-medium rounded-[2px]">
                            {getSopCode(dish)}
                          </span>
                          <span className="font-label-sm font-medium text-text-prominent truncate">
                            {dish.cookingStyle || '标准工艺'}
                          </span>
                        </div>
                        <span className="font-label-micro text-text-body mt-0.5">
                          {dish.craftStandardNote || dish.coreTemp || '温控与静置参数待补充'}
                        </span>
                        <div className="w-full bg-page-bg border border-border-main h-1.5 rounded-[2px] mt-1 overflow-hidden">
                          <div
                            className={`h-full ${
                              isDepleted ? 'bg-status-terracotta' : isLimited ? 'bg-accent-orange' : 'bg-dark-container'
                            }`}
                            style={{ width: `${getSopLoad(dish)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* 辣度与主理人风味 */}
                    <td className="p-space-md align-top">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <SpicinessIcon hot={spice.hot} severe={spice.shu >= 2500} />
                          <span className="font-label-sm font-semibold text-text-prominent">
                            {spice.label} ({spice.shu} SHU)
                          </span>
                        </div>
                        <span className="font-body-sm text-text-body mt-0.5 truncate">
                          {dish.flavor || '主理人推荐风味'}
                        </span>
                        <span className="font-label-micro text-text-light-mono truncate">
                          风味特征: {(dish.flavorTags || []).slice(0, 3).join(' + ') || '待补充'}
                        </span>
                      </div>
                    </td>

                    {/* 全渠道供餐通道 */}
                    <td className="p-space-md align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(['dineIn', 'delivery', 'pickup'] as ConsoleChannelKey[]).map((key) => (
                            <ChannelChip
                              key={key}
                              label={CHANNEL_LABELS[key]}
                              active={channelState[key]}
                              onClick={() => onToggleChannel(dish.id, key)}
                            />
                          ))}
                        </div>
                        <span
                          className={`font-label-micro ${
                            isDepleted
                              ? 'text-status-terracotta font-medium'
                              : 'text-text-body'
                          }`}
                        >
                          {isDepleted
                            ? '全通道系统强锁中'
                            : channelState.pickup
                            ? '车边自取: READY (通道1)'
                            : '车边自取: 未开放'}
                        </span>
                      </div>
                    </td>

                    {/* 在售状态与操作 */}
                    <td className="p-space-md align-top text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${SKU_STATUS_DOT[status]}`} />
                          <span className={`font-label-sm font-medium ${SKU_STATUS_TEXT[status]}`}>
                            {isDepleted
                              ? '已沽清 (0 份)'
                              : isLimited
                              ? `限定在售 (${portions}/${quota})`
                              : `在售 (${portions}份)`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1">
                          {isDepleted ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onSetSingleDishAllChannels(dish, true)}
                                className="px-2.5 py-1 rounded-[2px] bg-dark-container text-white text-xs font-medium hover:bg-dark-container-hover transition-colors cursor-pointer"
                              >
                                补库上架
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenDrawer(dish)}
                                className="px-2.5 py-1 rounded-[2px] bg-card-bg border border-border-main hover:bg-page-bg text-xs font-medium text-slate-blue transition-colors cursor-pointer"
                              >
                                参数
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenEditModal(dish)}
                                className="px-2.5 py-1 rounded-[2px] bg-card-bg border border-border-main hover:bg-page-bg text-xs font-medium text-slate-blue transition-colors cursor-pointer"
                              >
                                编辑
                              </button>
                              <button
                                type="button"
                                onClick={() => onSetSingleDishAllChannels(dish, false)}
                                className="px-2.5 py-1 rounded-[2px] bg-status-terracotta-bg border border-status-terracotta-border hover:bg-status-terracotta hover:text-white text-xs font-medium text-status-terracotta transition-colors cursor-pointer"
                              >
                                沽清
                              </button>
                            </>
                          )}
                        </div>

                        {/* 保留能力：标签打印 / 菜品二维码 / 参数抽屉 / 主图替换 / 快速复制 / 改价 */}
                        <div className="flex items-center gap-0.5 mt-0.5 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          {onOpenQrCode && (
                            <MiniAction
                              icon={QrCode}
                              title="生成专属二维码 (扫码单点/直付/规格专属码)"
                              onClick={() => onOpenQrCode(dish)}
                            />
                          )}
                          <MiniAction icon={Printer} title="打印热敏标签" onClick={() => onPrintLabel(dish)} />
                          <MiniAction
                            icon={Sliders}
                            title="交互式参数抽屉"
                            onClick={() => onOpenDrawer(dish)}
                          />
                          <MiniAction
                            icon={ImagePlus}
                            title="更换主图素材"
                            onClick={() => onOpenUploadModal(dish)}
                          />
                          <MiniAction
                            icon={Maximize2}
                            title="全屏预览"
                            onClick={() => onPreviewZoom(dish)}
                          />
                          <MiniAction icon={Copy} title="快速复制新建" onClick={() => onCloneDish(dish)} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* c. 卡片拓扑视图 */}
      {dishes.length > 0 && showCards && (
        <div className="p-space-md grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-space-md console-view-fade-in">
          {dishes.map((dish) => {
            const channelState = resolveChannelState(dish, channelOverrides);
            const status = resolveSkuStatus(channelState);
            const isSelected = selectedDishIds.has(dish.id);
            const isDepleted = status === 'depleted';
            const isLimited = status === 'limited';
            const portions = getRemainingPortions(dish, status);
            const quota = getDailyQuota(dish);
            const margin = getMarginRate(dish);
            const spice = getSpicinessReading(dish);
            const categoryTag = dish.subCategoryName || CATEGORY_LABEL[dish.category] || '全部';
            const categoryTone = CATEGORY_TONE[dish.category] || 'neutral';
            const displayTone: ConsoleTone = isDepleted ? 'terracotta' : isLimited ? 'orange' : categoryTone;

            return (
              <div
                key={`matrix-card-${dish.id}`}
                className={`bg-card-bg border rounded-[4px] shadow-2xs p-space-md flex flex-col justify-between hover:border-slate-blue transition-all ${
                  isSelected ? 'border-slate-blue ring-1 ring-slate-blue-border' : 'border-border-main'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-space-sm mb-space-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectDish(dish.id)}
                        aria-label={`选择 ${dish.name}`}
                        className="w-3.5 h-3.5 accent-dark-container rounded-[2px] cursor-pointer shrink-0"
                      />
                      <span
                        className={`font-label-micro px-1.5 py-0.5 rounded-[2px] uppercase font-medium truncate ${TONE_CLASS[displayTone]}`}
                      >
                        {isDepleted ? '缺料预警' : isLimited ? '限定供应' : categoryTag}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isDepleted ? SKU_STATUS_DOT.depleted : `animate-pulse ${SKU_STATUS_DOT[status]}`
                        }`}
                      />
                      <span className={`font-label-micro font-medium ${SKU_STATUS_TEXT[status]}`}>
                        {isDepleted
                          ? '已沽清 (0 份)'
                          : isLimited
                          ? `限定 (${portions}/${quota})`
                          : `在售 (${portions}份)`}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-space-sm mb-space-sm">
                    <button
                      type="button"
                      onClick={() => onPreviewZoom(dish)}
                      title="放大查看主图"
                      className="shrink-0 cursor-pointer"
                    >
                      <DishThumb dish={dish} size="card" muted={isDepleted} />
                    </button>
                    <div className="flex flex-col justify-between flex-1 min-w-0">
                      <div>
                        <h3 className="font-headline-sm text-text-prominent font-semibold truncate">
                          {dish.name}
                        </h3>
                        <span className="font-label-micro text-text-light-mono uppercase tracking-tight block truncate">
                          {dish.enName || CATEGORY_LABEL[dish.category]}
                        </span>
                        <span className="font-label-micro text-text-muted bg-page-bg border border-border-main px-1 py-0.2 rounded-[2px] mt-1 inline-block">
                          {getSkuCode(dish)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span
                          className={`font-headline-sm font-semibold text-[18px] ${
                            isDepleted ? 'text-text-prominent' : 'text-status-olive'
                          }`}
                        >
                          {formatYuan(dish.price)}
                        </span>
                        {dish.originalPrice && dish.originalPrice > dish.price ? (
                          <span className="font-label-micro text-text-light-mono line-through">
                            {formatYuan(dish.originalPrice)}
                          </span>
                        ) : (
                          <span className="font-label-micro text-text-light-mono">标准品</span>
                        )}
                        {dish.deliveryDiscount ? (
                          <span className="font-label-micro text-status-olive font-medium ml-auto">
                            立减 {formatYuan(dish.deliveryDiscount)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* SOP 与风味规格内嵌块 */}
                  <div className="bg-page-bg p-space-xs rounded-[2px] border border-border-main space-y-1 mb-space-sm">
                    <div className="flex items-center justify-between font-label-micro gap-2">
                      <span className="font-medium text-text-prominent flex items-center gap-1 shrink-0">
                        <Network className="w-[13px] h-[13px] text-slate-blue" strokeWidth={2} />
                        {getSopCode(dish)}
                      </span>
                      <span className="text-text-muted truncate">
                        {dish.cookingStyle || '标准工艺'} · {dish.prepTime || '待定'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-label-micro pt-0.5 border-t border-border-subtle gap-2">
                      <span className="text-text-body flex items-center gap-1 shrink-0">
                        <FlavorIcon dish={dish} />
                        {spice.label} ({spice.shu} SHU)
                      </span>
                      <span className="text-status-olive font-medium shrink-0">毛利率 {margin}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-space-xs border-t border-border-main mt-1">
                  <div className="flex items-center gap-1">
                    {(['dineIn', 'delivery', 'pickup'] as ConsoleChannelKey[]).map((key) => (
                      <ChannelChip
                        key={key}
                        label={CHANNEL_SHORT_LABELS[key]}
                        active={channelState[key]}
                        onClick={() => onToggleChannel(dish.id, key)}
                        compact
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenEditModal(dish)}
                      className="px-2 py-0.5 rounded-[2px] bg-card-bg border border-border-main hover:bg-page-bg font-label-micro text-slate-blue transition-colors cursor-pointer"
                    >
                      编辑参数
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetSingleDishAllChannels(dish, isDepleted)}
                      className={`px-2 py-0.5 rounded-[2px] font-label-micro transition-colors cursor-pointer ${
                        isDepleted
                          ? 'bg-dark-container text-white hover:bg-dark-container-hover'
                          : 'bg-status-terracotta-bg border border-status-terracotta-border hover:bg-status-terracotta hover:text-white text-status-terracotta'
                      }`}
                    >
                      {isDepleted ? '补库上架' : '沽清'}
                    </button>
                    <MiniAction icon={Pencil} title="快速改价" onClick={() => onQuickPrice(dish)} />
                    {onOpenQrCode && (
                      <MiniAction
                        icon={QrCode}
                        title="生成专属二维码 (扫码单点/直付/规格码)"
                        onClick={() => onOpenQrCode(dish)}
                      />
                    )}
                    {isDepleted && (
                      <MiniAction icon={PackagePlus} title="打印补库标签" onClick={() => onPrintLabel(dish)} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default ConsoleMatrix;
