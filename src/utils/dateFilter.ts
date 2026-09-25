/**
 * 通用日期/时间段筛选工具 (Date Filter Utils) — 2026-09-16
 * ----------------------------------------------------------------------------
 * 收敛全库散落的日期筛选实现（orders / analytics / 平台端三份内联），
 * 提供「预设档 + 自定义起止(datetime-local，精确到分钟)」的统一区间推导。
 * 区间为闭开 [startTs, endTs)，'all' 返回 null 表示不过滤。
 */

export type DateRangePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | '7days'
  | '30days'
  | 'month'
  | 'custom';

export interface DateRange {
  startTs: number;
  /** 闭开区间上界 */
  endTs: number;
  /** 展示文案（如「今日」「09-01 10:00 ~ 09-16 12:00」） */
  label: string;
}

/** 筛选器状态（组件受控值） */
export interface DateFilterState {
  preset: DateRangePreset;
  /** datetime-local 值，如 2026-09-16T10:00 */
  customStart?: string;
  customEnd?: string;
}

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: '7days', label: '近7天' },
  { value: '30days', label: '近30天' },
  { value: 'month', label: '本月' },
  { value: 'custom', label: '自定义' }
];

const DAY_MS = 86400000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function fmt(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 档位 → 毫秒区间。custom 缺省起止时智能回落：
 *  - 只填 start → start ~ 现在；
 *  - 只填 end → 30 天前 ~ end；
 *  - 都没填 → null（等同全部）。
 */
export function resolveDateRange(state: DateFilterState, now: number = Date.now()): DateRange | null {
  const { preset, customStart, customEnd } = state;
  const todayStart = startOfDay(new Date(now));

  switch (preset) {
    case 'all':
      return null;
    case 'today': {
      const startTs = todayStart;
      return { startTs, endTs: startTs + DAY_MS, label: '今日' };
    }
    case 'yesterday': {
      const startTs = todayStart - DAY_MS;
      return { startTs, endTs: todayStart, label: '昨日' };
    }
    case '7days': {
      const startTs = todayStart - 7 * DAY_MS;
      return { startTs, endTs: startTs + 8 * DAY_MS, label: '近7天' };
    }
    case '30days': {
      const startTs = todayStart - 30 * DAY_MS;
      return { startTs, endTs: startTs + 31 * DAY_MS, label: '近30天' };
    }
    case 'month': {
      const d = new Date(now);
      const startTs = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const endTs = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      return { startTs, endTs, label: '本月' };
    }
    case 'custom': {
      const startTs = customStart ? new Date(customStart).getTime() : NaN;
      const endTsRaw = customEnd ? new Date(customEnd).getTime() : NaN;
      if (Number.isNaN(startTs) && Number.isNaN(endTsRaw)) return null;
      const s = Number.isNaN(startTs) ? now - 30 * DAY_MS : startTs;
      // 仅选了日期（00:00）时，结束默认含当天全天
      const e = Number.isNaN(endTsRaw) ? now : endTsRaw + (endTsRaw % DAY_MS === 0 ? DAY_MS : 0);
      const realEnd = Math.max(e, s);
      return { startTs: s, endTs: realEnd, label: `${fmt(s)} ~ ${fmt(realEnd)}` };
    }
    default:
      return null;
  }
}

/** 时间戳是否落在区间内（range 为 null 表示不过滤，恒真） */
export function isWithinRange(ts: number, range: DateRange | null): boolean {
  if (!range) return true;
  const t = typeof ts === 'number' ? ts : new Date(ts).getTime();
  if (Number.isNaN(t)) return false;
  return t >= range.startTs && t < range.endTs;
}

/** ISO 日期字符串(YYYY-MM-DD) 是否落在区间内（按天边界判定） */
export function isDayStringWithinRange(dayStr: string, range: DateRange | null): boolean {
  if (!range) return true;
  if (!dayStr) return false;
  const dayStart = startOfDay(new Date(`${dayStr}T00:00:00`));
  return isWithinRange(dayStart, range);
}
