import { DishItem } from '../../../types';

/* ============================================================================
 * 「菜品与多渠道沽清界面」控制台共享契约层
 * ----------------------------------------------------------------------------
 * 该文件是 Industrial Precision Console 令牌集在业务层的唯一映射入口：
 *   - 状态 → 语义色（status-olive / status-terracotta / slate-blue / accent-orange）
 *   - 遥测派生值（份数、毛利、SHU、SOP 负荷）的确定性计算
 *   - 三端视图模式的呈现元数据
 *
 * 约束：所有色值必须通过 Tailwind 令牌类名引用，禁止在此文件出现十六进制颜色。
 * ========================================================================== */

export type ConsoleViewMode = 'auto' | 'table' | 'card';
export type ConsoleChannelKey = 'dineIn' | 'delivery' | 'pickup';
export type ConsoleSkuStatus = 'active' | 'limited' | 'depleted';
export type ConsoleStatusFilter = 'all' | 'available' | 'unavailable';

export interface ConsoleChannelState {
  dineIn: boolean;
  delivery: boolean;
  pickup: boolean;
}

export const EMPTY_CHANNEL_STATE: ConsoleChannelState = {
  dineIn: false,
  delivery: false,
  pickup: false
};

export const CHANNEL_LABELS: Record<ConsoleChannelKey, string> = {
  dineIn: '堂食',
  delivery: '外卖',
  pickup: '自提'
};

export const CHANNEL_SHORT_LABELS: Record<ConsoleChannelKey, string> = {
  dineIn: '堂',
  delivery: '外',
  pickup: '取'
};

/* ---------------------------------------------------------------------------
 * 标签 / 徽标语义色板
 * 每个 tone 同时给出 surface / text / border 三元组，供 <ConsoleTag> 渲染。
 * ------------------------------------------------------------------------- */
export type ConsoleTone = 'navy' | 'orange' | 'terracotta' | 'blue' | 'neutral' | 'olive';

export const TONE_CLASS: Record<ConsoleTone, string> = {
  navy: 'bg-dark-container text-white border border-transparent',
  orange: 'bg-accent-orange text-white border border-transparent',
  terracotta: 'bg-status-terracotta text-white border border-transparent',
  blue: 'bg-slate-blue text-white border border-transparent',
  neutral: 'bg-page-bg text-text-secondary border border-border-main',
  olive: 'bg-status-olive-bg text-status-olive border border-status-olive-border'
};

/* ---------------------------------------------------------------------------
 * 确定性哈希：同一 SKU 在任意会话 / 任意端都渲染同一组遥测值，避免数值抖动。
 * ------------------------------------------------------------------------- */
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** 在 [min, max] 上取稳定伪随机整数（用于遥测占位读数） */
export function stableInt(seed: string, min: number, max: number): number {
  if (max <= min) return min;
  return min + (hashString(seed) % (max - min + 1));
}

/* ---------------------------------------------------------------------------
 * 单品状态判定
 * ------------------------------------------------------------------------- */
export function resolveChannelState(
  dish: DishItem,
  overrides?: Record<string, ConsoleChannelState>
): ConsoleChannelState {
  const override = overrides?.[dish.id];
  if (override) return override;

  const base = dish.available !== false;
  if (!base) return { dineIn: false, delivery: false, pickup: false };

  return {
    dineIn: dish.orderType !== 'delivery',
    delivery: dish.orderType !== 'dine_in',
    pickup: dish.orderType !== 'delivery'
  };
}

export function resolveSkuStatus(state: ConsoleChannelState): ConsoleSkuStatus {
  const activeCount = Number(state.dineIn) + Number(state.delivery) + Number(state.pickup);
  if (activeCount === 0) return 'depleted';
  if (activeCount === 3) return 'active';
  return 'limited';
}

export const SKU_STATUS_TONE: Record<ConsoleSkuStatus, 'olive' | 'orange' | 'terracotta'> = {
  active: 'olive',
  limited: 'orange',
  depleted: 'terracotta'
};

export const SKU_STATUS_DOT: Record<ConsoleSkuStatus, string> = {
  active: 'bg-status-olive',
  limited: 'bg-accent-orange',
  depleted: 'bg-status-terracotta'
};

export const SKU_STATUS_TEXT: Record<ConsoleSkuStatus, string> = {
  active: 'text-status-olive',
  limited: 'text-accent-orange',
  depleted: 'text-status-terracotta'
};

/** 剩余可供份数：售罄恒为 0，其余按 SKU 稳定派生（UI 遥测占位读数）。 */
export function getRemainingPortions(dish: DishItem, status: ConsoleSkuStatus): number {
  if (status === 'depleted') return 0;
  return stableInt(`portions:${dish.id}`, 12, 120);
}

/** 日配额（限定在售时以 n/m 形式呈现，与参考稿 "限定在售 (14/20)" 对齐） */
export function getDailyQuota(dish: DishItem): number {
  return stableInt(`quota:${dish.id}`, 20, 60);
}

/** 毛利率百分比（确定性派生，用于「基准售价与渠道立减」列） */
export function getMarginRate(dish: DishItem): number {
  const raw = stableInt(`margin:${dish.id}`, 540, 782);
  return raw / 10;
}

/** SOP 工艺负荷（0–100），驱动行内进度条 */
export function getSopLoad(dish: DishItem): number {
  return stableInt(`sop:${dish.id}`, 55, 100);
}

/** SOP 编号：优先取菜品自带工匠编号，其次由条码尾部派生 */
export function getSopCode(dish: DishItem): string {
  if (dish.artisanCode) return dish.artisanCode.replace(/^ARTISAN\s*/i, 'SOP-');
  if (dish.refCode) return dish.refCode.replace(/^REF:\s*/i, 'SOP-');
  if (dish.barcode && dish.barcode.length >= 4) {
    return `SOP-${dish.barcode.slice(-5)}`;
  }
  return `SOP-${dish.id.replace(/^dish-?/i, '').toUpperCase().slice(0, 5) || 'GEN'}`;
}

/** 商品条码展示值：无条码时回退为 SKU 派生码，保证矩阵列结构稳定 */
export function getBarcodeLabel(dish: DishItem): string {
  if (dish.barcode) return dish.barcode;
  const tail = String(stableInt(`barcode:${dish.id}`, 1000000, 9999999));
  return `697204918${tail.slice(0, 4)}`;
}

/** SKU 台面代号（用于批量操作 TARGETS 与卡片视图） */
export function getSkuCode(dish: DishItem): string {
  const prefix = (dish.category || 'gen').slice(0, 2).toUpperCase();
  const tail = dish.id.replace(/^dish-?/i, '').toUpperCase().slice(0, 4) || '001';
  return `SKU-${prefix}-${tail}`;
}

const SHU_BY_LEVEL: Array<{ match: RegExp; shu: number; label: string }> = [
  { match: /变态|魔鬼/, shu: 8000, label: '变态辣' },
  { match: /重辣|特辣/, shu: 5000, label: '重辣' },
  { match: /中辣/, shu: 2500, label: '中辣' },
  { match: /微辣/, shu: 800, label: '微辣' },
  { match: /不辣|无辣|原味/, shu: 0, label: '无辣' }
];

export interface SpicinessReading {
  shu: number;
  label: string;
  hot: boolean;
}

/** 辣度读数：从菜品辣度字段解析，未配置时按风味标签兜底 */
export function getSpicinessReading(dish: DishItem): SpicinessReading {
  const source = `${dish.spicinessLevel || ''} ${(dish.flavorTags || []).join(' ')} ${dish.flavor || ''}`;
  for (const entry of SHU_BY_LEVEL) {
    if (entry.match.test(source)) {
      return { shu: entry.shu, label: entry.label, hot: entry.shu > 0 };
    }
  }
  return { shu: 0, label: '原味', hot: false };
}

/** 价格显示：统一 ¥ 前缀 + 两位小数（保留小数点后零位对齐来自等宽字体） */
export function formatYuan(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  return `¥${value.toFixed(2)}`;
}

/* ---------------------------------------------------------------------------
 * 看板级聚合遥测
 * ------------------------------------------------------------------------- */
export interface CategoryDensitySegment {
  label: string;
  percent: number;
  /** Tailwind 背景类名，由令牌集派生 */
  className: string;
}

const DENSITY_CLASSES = [
  'bg-dark-container',
  'bg-slate-blue',
  'bg-accent-orange',
  'bg-status-olive'
];

/** 类目密度分布：取占比最高的 3 个类目，其余归入「其他」 */
export function getCategoryDensity(dishes: DishItem[]): CategoryDensitySegment[] {
  const total = dishes.length;
  if (total === 0) return [];

  const buckets = new Map<string, number>();
  dishes.forEach((dish) => {
    const name = dish.subCategoryName || dish.category || '其他';
    buckets.set(name, (buckets.get(name) || 0) + 1);
  });

  const ranked = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  const head = ranked.slice(0, 3);
  const tailCount = ranked.slice(3).reduce((sum, [, count]) => sum + count, 0);

  const segments: CategoryDensitySegment[] = head.map(([label, count], index) => ({
    label,
    percent: Math.round((count / total) * 100),
    className: DENSITY_CLASSES[index]
  }));

  if (tailCount > 0 || segments.length < 4) {
    segments.push({
      label: '其他',
      percent: Math.max(0, 100 - segments.reduce((sum, seg) => sum + seg.percent, 0)),
      className: DENSITY_CLASSES[3]
    });
  }

  return segments.slice(0, 4);
}

export interface ChannelTelemetry {
  total: number;
  active: number;
  depleted: number;
  activePercent: string;
  limited: number;
  dineInCount: number;
  deliveryCount: number;
  pickupCount: number;
  /** 三端通道整体健康度（0–100） */
  channelCapacity: number;
}

/** 全渠道遥测聚合：驱动顶部状态胶囊与三张指标卡 */
export function getChannelTelemetry(
  dishes: DishItem[],
  overrides?: Record<string, ConsoleChannelState>
): ChannelTelemetry {
  const total = dishes.length;
  let active = 0;
  let limited = 0;
  let dineInCount = 0;
  let deliveryCount = 0;
  let pickupCount = 0;

  dishes.forEach((dish) => {
    const state = resolveChannelState(dish, overrides);
    const status = resolveSkuStatus(state);
    if (status !== 'depleted') active += 1;
    if (status === 'limited') limited += 1;
    if (state.dineIn) dineInCount += 1;
    if (state.delivery) deliveryCount += 1;
    if (state.pickup) pickupCount += 1;
  });

  return {
    total,
    active,
    depleted: total - active,
    activePercent: total > 0 ? ((active / total) * 100).toFixed(1) : '0.0',
    limited,
    dineInCount,
    deliveryCount,
    pickupCount,
    channelCapacity: total > 0 ? Math.round(((dineInCount + deliveryCount + pickupCount) / (total * 3)) * 100) : 0
  };
}

export interface DepletionBreakdown {
  count: number;
  topCategories: string;
  heatRatio: number;
}

/** 沽清告警聚合：缺口品类归因 + 热力比（用于第三张指标卡） */
export function getDepletionBreakdown(
  dishes: DishItem[],
  overrides?: Record<string, ConsoleChannelState>
): DepletionBreakdown {
  const depleted = dishes.filter(
    (dish) => resolveSkuStatus(resolveChannelState(dish, overrides)) === 'depleted'
  );

  const buckets = new Map<string, number>();
  depleted.forEach((dish) => {
    const name = dish.subCategoryName || dish.category || '其他';
    buckets.set(name, (buckets.get(name) || 0) + 1);
  });

  const ranked = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  return {
    count: depleted.length,
    topCategories: ranked.map(([name, count]) => `${name}(${count})`).join('，') || '暂无缺口',
    heatRatio: dishes.length > 0 ? Math.round((depleted.length / dishes.length) * 1000) / 10 : 0
  };
}

/* ---------------------------------------------------------------------------
 * 三端视图模式元数据（驱动矩阵 Meta Deck 的标题 / Schema / Mode 徽标）
 * ------------------------------------------------------------------------- */
export interface ViewModeMeta {
  sectionTitle: string;
  schemaBadge: string;
  modeBadge: string;
}

export function getViewModeMeta(mode: ConsoleViewMode, nodeCount: number): ViewModeMeta {
  if (mode === 'table') {
    return {
      sectionTitle: 'DISH MATRIX // HIGH DENSITY DATA DECK',
      schemaBadge: 'DENSITY: HIGH-SPEC 7-COLUMNS',
      modeBadge: 'MODE: 表格视图 (TABLE GRID)'
    };
  }
  if (mode === 'card') {
    return {
      sectionTitle: 'DISH TOPOLOGY // SENSORY CRAFT CARDS',
      schemaBadge: `CLUSTER: ${nodeCount} NODES ONLINE`,
      modeBadge: 'MODE: 卡片拓扑 (CARD TOPOLOGY)'
    };
  }
  return {
    sectionTitle: 'DISH TOPOLOGY // LIVE INVENTORY RECORD MATRIX',
    schemaBadge: 'SCHEMA: CRAFT-SOP-V4',
    modeBadge: 'MODE: 自适应响应 (AUTO)'
  };
}

/** 自适应模式断点：≥1024px 走高密度表格，<1024px 回落卡片拓扑 */
export const CONSOLE_TABLE_BREAKPOINT = 1024;

/** 在自适应模式下按容器宽度选择有效视图 */
export function resolveEffectiveView(
  mode: ConsoleViewMode,
  viewportWidth: number
): 'table' | 'card' {
  if (mode === 'table') return 'table';
  if (mode === 'card') return 'card';
  return viewportWidth >= CONSOLE_TABLE_BREAKPOINT ? 'table' : 'card';
}
