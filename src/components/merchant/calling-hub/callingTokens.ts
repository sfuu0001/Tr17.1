import { QueueTicket, QueueType } from '../../../types';

/* ============================================================================
 * 「前台叫号取餐与等位排队中枢」共享契约层
 * ----------------------------------------------------------------------------
 * 单一职责：把 QueueTicket 领域模型翻译成 M3 语义角色（surface / on-surface /
 * secondary / tertiary / error / outline）与展示元数据，绝缘业务组件的样式判断。
 *
 * 约束：只允许引用 M3 角色令牌类名（见 index.css「M3 ROLE LAYER」），
 *       禁止出现十六进制色值。
 * ========================================================================== */

export type QueueStatus = QueueTicket['status'];
export type QueueCategoryFilter = 'all' | 'waiting' | 'called' | 'temp_void' | 'perm_void' | 'finished';
export type ChannelFilter = 'all' | 'pickup' | 'table';
export type WaitFocusFilter = 'all' | 'overdue' | 'ready';

/** 与 MerchantCallingHub.calculateWaitMetrics 的返回结构保持一致 */
export interface WaitMetrics {
  standardMin: number;
  aheadCount: number;
  remainingMinutes: number;
  isOverdue: boolean;
}

export interface QueueSeriesMeta {
  /** 序号系列前缀，如 A/B/C/P */
  series: string;
  /** 卡片顶部角色标签，如 TABLE CAT-A // 1-2人 */
  catLabel: string;
  /** 顾客可读的桌型名，如 小桌 (1-2人) */
  typeName: string;
  /** 该系列在卡片左侧的角色色条 */
  accentBar: string;
  /** 系列徽章配色 */
  seriesBadge: string;
  /** 默认翻台节拍（分钟） */
  defaultPaceMin: number;
}

export const QUEUE_SERIES: Record<QueueType, QueueSeriesMeta> = {
  small: {
    series: 'A系列',
    catLabel: 'TABLE CAT-A // 1-2人',
    typeName: '小桌 (1-2人)',
    accentBar: 'bg-rad-blue',
    seriesBadge: 'bg-rad-blue-subtle text-rad-blue border border-rad-blue/20',
    defaultPaceMin: 15
  },
  medium: {
    series: 'B系列',
    catLabel: 'TABLE CAT-B // 3-4人',
    typeName: '中桌 (3-4人)',
    accentBar: 'bg-rad-amber',
    seriesBadge: 'bg-rad-amber-subtle text-rad-amber border border-rad-amber/30',
    defaultPaceMin: 25
  },
  large: {
    series: 'C系列',
    catLabel: 'TABLE CAT-C // 5人及以上',
    typeName: '大桌 (5人及以上)',
    accentBar: 'bg-rad-orange',
    seriesBadge: 'bg-rad-orange-subtle text-rad-orange border border-rad-orange/30',
    defaultPaceMin: 40
  },
  pickup: {
    series: 'P系列',
    catLabel: 'LOCKER PICKUP // 智能恒温柜',
    typeName: '到店自提取餐',
    accentBar: 'bg-rad-green',
    seriesBadge: 'bg-rad-green-subtle text-rad-green border border-rad-green/30',
    defaultPaceMin: 8
  }
};

export interface TicketStatusMeta {
  label: string;
  badge: string;
  /** 大号排队号的着色（含作废态的删除线） */
  number: string;
  dot?: string;
}

export const TICKET_STATUS_META: Record<QueueStatus, TicketStatusMeta> = {
  waiting: {
    label: '等待中',
    badge: 'bg-rad-blue-subtle text-rad-blue border border-rad-blue/20',
    number: 'text-rad-text-main'
  },
  called: {
    label: '呼叫中',
    badge: 'bg-rad-orange-subtle text-rad-orange border border-rad-orange/30',
    number: 'text-rad-orange',
    dot: 'bg-rad-orange animate-ping'
  },
  seated: {
    label: '已入座',
    badge: 'bg-rad-green-subtle text-rad-green border border-rad-green/30',
    number: 'text-rad-green'
  },
  passed: {
    label: '已过号',
    badge: 'bg-rad-subtle text-rad-text-muted border border-rad-line',
    number: 'text-rad-text-muted'
  },
  completed: {
    label: '已完成',
    badge: 'bg-rad-green-subtle text-rad-green border border-rad-green/30',
    number: 'text-rad-green'
  },
  temp_void: {
    label: '临时作废',
    badge: 'bg-rad-amber-subtle text-rad-amber border border-rad-amber/30',
    number: 'text-rad-amber'
  },
  perm_void: {
    label: '完全作废',
    badge: 'bg-rad-subtle text-rad-text-muted border border-rad-line',
    number: 'text-rad-text-muted line-through'
  }
};

/** 超时预警覆盖态（优先级高于基础状态徽章） */
export const OVERDUE_META: TicketStatusMeta = {
  label: '超时预警',
  badge: 'bg-rad-red-subtle text-rad-red border border-rad-red/30',
  number: 'text-rad-red'
};

/** 队头就绪态（等待中且前方 0 桌） */
export const READY_META = {
  label: '队头就绪',
  text: 'text-rad-blue',
  hint: '系统自动预估还需'
};

/* ---------------------------------------------------------------------------
 * 展示辅助
 * ------------------------------------------------------------------------- */

/** 把 12:08 / ISO / 空值统一格式化为 HH:MM */
export function formatClock(value?: string): string {
  if (!value) return '--:--';
  const direct = value.match(/^(\d{1,2}:\d{2})/);
  if (direct) return direct[1];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
}

/** 手机号脱敏（保留后四位） */
export function maskPhone(phone?: string): string {
  if (!phone) return '未登记';
  if (phone.includes('*')) return phone;
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

/**
 * 等位耗时进度：以「已等 / 标准」为主刻度，呼叫中按 100% 处理。
 * 返回 0-100 的整数百分比（超时封顶 100）。
 */
export function getWaitProgress(ticket: QueueTicket, metrics: WaitMetrics): number {
  if (ticket.status === 'called') return 100;
  if (ticket.status === 'seated' || ticket.status === 'completed') return 100;
  if (ticket.status === 'perm_void') return 0;
  const standard = Math.max(1, metrics.standardMin);
  return Math.min(100, Math.round((ticket.waitTimeMin / standard) * 100));
}

/** 进度条着色：超时 → red，呼叫中 → orange，常规 → 按系列信号色 */
export function getProgressBarClass(ticket: QueueTicket, metrics: WaitMetrics): string {
  if (ticket.status === 'perm_void') return 'bg-rad-track';
  if (metrics.isOverdue) return 'bg-rad-red';
  if (ticket.status === 'called') return 'bg-rad-orange';
  if (ticket.status === 'seated' || ticket.status === 'completed') return 'bg-rad-green';
  return QUEUE_SERIES[ticket.queueType].accentBar;
}

/** 桌型文案：自提单显示柜号，堂食显示桌型 */
export function getTicketTypeLabel(ticket: QueueTicket): string {
  if (ticket.queueType === 'pickup') return '到店自提取餐';
  return QUEUE_SERIES[ticket.queueType].typeName;
}

/** 卡片副标题：自提单显示保温柜，堂食显示排号属性 */
export function getTicketSubLabel(ticket: QueueTicket, metrics: WaitMetrics): string {
  if (ticket.queueType === 'pickup') return `${String(ticket.partySize).padStart(2, '0')} 号智能保温恒温柜`;
  if (metrics.isOverdue) return '⚠️ 已超出预设等待时限';
  if (metrics.aheadCount === 0) return '堂食排号 // 队头位置';
  return '堂食排号 // 等位中';
}

/** 大屏镜像所需的「正在请进 / 请取餐」条目 */
export interface TvCallingEntry {
  id: string;
  queueNo: string;
  title: string;
  target: string;
  codeLabel: string;
  codeValue: string;
  hint: string;
  tone: 'primary' | 'tertiary';
}

/** 大屏镜像所需的候餐队列格子 */
export interface TvRosterEntry {
  id: string;
  queueNo: string;
  numberClass: string;
  positionLabel: string;
  positionClass: string;
  typeLabel: string;
  etaLabel: string;
  etaClass: string;
}

/** 构建大屏候餐队列：堂食按延后顺序，自提单列在后 */
export function buildTvRoster(tickets: QueueTicket[], metricsOf: (t: QueueTicket) => WaitMetrics): TvRosterEntry[] {
  const waiting = tickets.filter((t) => t.status === 'waiting');
  const tableQueue = waiting.filter((t) => t.queueType !== 'pickup');
  const pickupQueue = waiting.filter((t) => t.queueType === 'pickup');

  const build = (list: QueueTicket[], isPickup: boolean): TvRosterEntry[] =>
    list.map((ticket, index) => {
      const metrics = metricsOf(ticket);
      const position = index + 1;
      let positionLabel = `排第${position}`;
      let positionClass = 'bg-rad-subtle text-rad-text-muted';
      let etaClass = 'text-rad-blue';

      if (!isPickup && position === 1) {
        positionLabel = '队头';
        positionClass = 'bg-rad-blue text-white';
      } else if (!isPickup && metrics.isOverdue) {
        positionClass = 'bg-rad-red text-white';
        etaClass = 'text-rad-red';
      } else if (isPickup && index === 0) {
        positionLabel = '备餐中';
        positionClass = 'bg-rad-green text-white';
        etaClass = 'text-rad-green';
      }

      return {
        id: ticket.id,
        queueNo: ticket.queueNo,
        numberClass: metrics.isOverdue
          ? 'text-rad-red'
          : isPickup
          ? 'text-rad-green'
          : 'text-rad-blue',
        positionLabel,
        positionClass,
        typeLabel: isPickup ? '自提单' : QUEUE_SERIES[ticket.queueType].typeName.split(' ')[0],
        etaLabel: isPickup ? `约${metrics.remainingMinutes}m出柜` : `约${metrics.remainingMinutes}m`,
        etaClass
      };
    });

  return [...build(tableQueue, false), ...build(pickupQueue, true)];
}

/** 构建大屏「正在请进 / 请取餐」条目（最多 2 条，与参考稿一致） */
export function buildTvCalling(tickets: QueueTicket[]): TvCallingEntry[] {
  return tickets
    .filter((t) => t.status === 'called')
    .slice(0, 2)
    .map((ticket) => {
      const isPickup = ticket.queueType === 'pickup';
      return {
        id: ticket.id,
        queueNo: ticket.queueNo,
        title: isPickup ? '到店自提' : QUEUE_SERIES[ticket.queueType].typeName,
        target: isPickup
          ? `请至 ${String(ticket.partySize).padStart(2, '0')}号智能恒温柜`
          : `请前往 ${ticket.queueNo.replace(/\D/g, '') || '指定'}号餐桌入座`,
        codeLabel: isPickup ? '提货码' : '桌号',
        codeValue: `#${ticket.queueNo.replace(/\D/g, '') || '00'}`,
        hint: isPickup
          ? `语音已连呼 ${ticket.calledCount || 1} 遍`
          : '请至收银台核验',
        tone: isPickup ? ('primary' as const) : ('tertiary' as const)
      };
    });
}

/** 队头就绪（等待中且前方 0 桌）数量 */
export function countReady(tickets: QueueTicket[], metricsOf: (t: QueueTicket) => WaitMetrics): number {
  return tickets.filter((t) => t.status === 'waiting' && metricsOf(t).aheadCount === 0).length;
}

/** 超时预警数量 */
export function countOverdue(tickets: QueueTicket[], metricsOf: (t: QueueTicket) => WaitMetrics): number {
  return tickets.filter((t) => t.status === 'waiting' && metricsOf(t).isOverdue).length;
}

/** 各桌型等待组数 + 预估最长等待（驱动 4 张 HUD 指标卡） */
export interface SeriesLoad {
  key: QueueType;
  meta: QueueSeriesMeta;
  waitingCount: number;
  paceMin: number;
  longestWaitMin: number;
  /** 负荷评语 + 着色（M3 角色） */
  loadLabel: string;
  loadClass: string;
  waitClass: string;
}

export function getSeriesLoad(
  tickets: QueueTicket[],
  strategy: { smallTableMin: number; mediumTableMin: number; largeTableMin: number; pickupMin: number }
): SeriesLoad[] {
  const paceOf: Record<QueueType, number> = {
    small: strategy.smallTableMin,
    medium: strategy.mediumTableMin,
    large: strategy.largeTableMin,
    pickup: strategy.pickupMin
  };

  return (['small', 'medium', 'large', 'pickup'] as QueueType[]).map((key) => {
    const meta = QUEUE_SERIES[key];
    const matching = tickets.filter((t) => t.queueType === key && t.status === 'waiting');
    const paceMin = paceOf[key];
    // 预估最长等待 = 队列长度 × 节拍（至少为节拍本身）
    const longestWaitMin = Math.max(paceMin, matching.length * paceMin);

    let loadLabel: string;
    let loadClass: string;
    let waitClass: string;
    const ratio = paceMin > 0 ? longestWaitMin / (paceMin * 4) : 0;

    if (key === 'pickup') {
      loadLabel = '柜温 62°C 恒定';
      loadClass = 'text-rad-green font-semibold';
      waitClass = 'text-rad-text-main';
    } else if (ratio < 0.6) {
      loadLabel = '流转平稳';
      loadClass = 'text-rad-green font-semibold';
      waitClass = 'text-rad-blue';
    } else if (ratio < 1) {
      loadLabel = '翻台略缓';
      loadClass = 'text-rad-amber font-semibold';
      waitClass = 'text-rad-amber';
    } else {
      loadLabel = '高峰负荷';
      loadClass = 'text-rad-orange font-semibold';
      waitClass = 'text-rad-orange';
    }

    return {
      key,
      meta,
      waitingCount: matching.length,
      paceMin,
      longestWaitMin,
      loadLabel,
      loadClass,
      waitClass
    };
  });
}
