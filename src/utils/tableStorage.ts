import { BoundTableInfo, TableItem, TableDishItem, WaitingTableItem } from '../types';
import { safeGetStorage, safeSetStorage } from './safeStorage';
import { INITIAL_TABLES } from '../data/posMockData';

const STORAGE_KEY_BOUND_TABLE = 'obsidian_current_bound_table';
const STORAGE_KEY_MERCHANT_TABLES = 'obsidian_merchant_tables';
const STORAGE_KEY_WAITING_QUEUE = 'obsidian_waiting_queue';
const STORAGE_KEY_AUTO_TRANSFER = 'obsidian_auto_transfer_on_clean';

/**
 * 初始等位候补队列示例
 */
export const INITIAL_WAITING_QUEUE: WaitingTableItem[] = [
  {
    id: 'wait-01',
    code: 'W01',
    name: '等位候补 01 号',
    guests: 2,
    phone: '138****6621',
    guestName: '林女士 (2人)',
    orderNo: 'UR-WAIT-901',
    orderTime: '18:25',
    totalAmount: 116.0,
    preferredZone: '餐车外摆区',
    createdAt: '18:25',
    elapsedMinutes: 14,
    status: 'waiting',
    orderItems: [
      {
        id: 'w-item-1',
        name: '碳烤和牛小汉堡双重奏',
        quantity: 1,
        price: 58.0,
        serveStatus: 'cooking',
        prepProgress: 45,
        station: '炭火炙烤档',
        options: '等位先制·少洋葱'
      },
      {
        id: 'w-item-2',
        name: '日式极味炭烤鳗鱼饭',
        quantity: 1,
        price: 58.0,
        serveStatus: 'preparing',
        prepProgress: 20,
        station: '主食料理档',
        options: '堂食候补'
      }
    ]
  },
  {
    id: 'wait-02',
    code: 'W02',
    name: '等位候补 02 号',
    guests: 4,
    phone: '139****8819',
    guestName: '陈先生 (4人)',
    preferredZone: '室内散座 / 卡座',
    createdAt: '18:32',
    elapsedMinutes: 7,
    status: 'waiting',
    totalAmount: 0,
    orderItems: []
  }
];

/**
 * 默认桌台：未绑定时如果需要回退推荐的默认桌台
 */
export const DEFAULT_FALLBACK_TABLE: BoundTableInfo = {
  id: 'tbl-2',
  code: 'A2',
  zone: 'patio',
  zoneLabel: '餐车外摆休闲区',
  capacity: 4,
  guests: 2,
  serverName: '阿豪 (No.02)'
};

/**
 * 获取当前客户端食客绑定的桌台信息 (未绑定时返回 null，强制触发表单前置桌台绑定流程)
 */
export function getCurrentBoundTable(): BoundTableInfo | null {
  return safeGetStorage<BoundTableInfo | null>(STORAGE_KEY_BOUND_TABLE, null);
}

/**
 * 设置当前食客绑定的桌台
 */
export function setCurrentBoundTable(table: BoundTableInfo | null): void {
  safeSetStorage(STORAGE_KEY_BOUND_TABLE, table);
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('obsidian_bound_table_changed', { detail: table }));
    });
  }
}

/**
 * 获取商家端全量堂食桌台状态
 */
export function getMerchantTables(): TableItem[] {
  return safeGetStorage<TableItem[]>(STORAGE_KEY_MERCHANT_TABLES, INITIAL_TABLES);
}

/**
 * 保存商家端全量堂食桌台状态
 */
export function saveMerchantTables(tables: TableItem[]): void {
  safeSetStorage(STORAGE_KEY_MERCHANT_TABLES, tables);
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('obsidian_tables_updated', { detail: tables }));
    });
  }
}

/**
 * 获取清理后是否自动纳入转移配置 (默认 true)
 */
export function getAutoTransferConfig(): boolean {
  return safeGetStorage<boolean>(STORAGE_KEY_AUTO_TRANSFER, true);
}

/**
 * 设置清理后是否自动纳入转移配置
 */
export function setAutoTransferConfig(enabled: boolean): void {
  safeSetStorage(STORAGE_KEY_AUTO_TRANSFER, enabled);
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('obsidian_auto_transfer_config_changed', { detail: enabled }));
    });
  }
}

/**
 * 获取当前等位队列
 */
export function getWaitingQueue(): WaitingTableItem[] {
  return safeGetStorage<WaitingTableItem[]>(STORAGE_KEY_WAITING_QUEUE, INITIAL_WAITING_QUEUE);
}

/**
 * 保存等位队列
 */
export function saveWaitingQueue(queue: WaitingTableItem[]): void {
  safeSetStorage(STORAGE_KEY_WAITING_QUEUE, queue);
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('obsidian_waiting_queue_updated', { detail: queue }));
    });
  }
}

/**
 * 添加新的等位桌号 (如 W03, W04)
 */
export function addWaitingTable(params: {
  guests: number;
  phone?: string;
  guestName?: string;
  preferredZone?: string;
  orderNo?: string;
  items?: Array<{ name: string; quantity: number; price?: number }>;
  totalAmount?: number;
}): WaitingTableItem {
  const currentQueue = getWaitingQueue();
  
  // 计算下一个等位编号 W0x
  let maxSeq = 0;
  currentQueue.forEach(item => {
    const match = item.code.match(/^W(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  });
  const nextSeq = maxSeq + 1;
  const code = `W${nextSeq.toString().padStart(2, '0')}`;
  
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const orderItems: TableDishItem[] = (params.items || []).map((it, idx) => ({
    id: `w-dish-${Date.now()}-${idx}`,
    name: it.name,
    quantity: it.quantity,
    price: it.price || 28,
    serveStatus: 'cooking',
    prepProgress: 20,
    station: '前置备餐档',
    options: '等位候补·提前备餐'
  }));

  const newItem: WaitingTableItem = {
    id: `wait-${Date.now()}`,
    code,
    name: `等位候补 ${code} 号`,
    guests: params.guests || 2,
    phone: params.phone || '到店食客',
    guestName: params.guestName || `等位客人 (${params.guests || 2}人)`,
    preferredZone: params.preferredZone || '餐车外摆区',
    createdAt: timeStr,
    elapsedMinutes: 1,
    status: 'waiting',
    orderNo: params.orderNo,
    orderTime: params.orderNo ? timeStr : undefined,
    totalAmount: params.totalAmount || (orderItems.reduce((s, it) => s + it.price * it.quantity, 0)),
    orderItems
  };

  const updated = [...currentQueue, newItem];
  saveWaitingQueue(updated);
  return newItem;
}

/**
 * 取消等位
 */
export function cancelWaitingTable(waitingId: string): void {
  const currentQueue = getWaitingQueue();
  const updated = currentQueue.map(item => 
    item.id === waitingId || item.code === waitingId
      ? { ...item, status: 'cancelled' as const }
      : item
  );
  saveWaitingQueue(updated);
}

/**
 * 将等位桌号【纳入转移】到目标正式桌台（手动或自动）
 */
export function transferWaitingToTable(
  waitingIdOrCode: string,
  targetTableIdOrCode: string
): { success: boolean; transferredWaiting?: WaitingTableItem; updatedTable?: TableItem; message: string } {
  const currentQueue = getWaitingQueue();
  const currentTables = getMerchantTables();

  const waitingItem = currentQueue.find(
    (w) => (w.id === waitingIdOrCode || w.code.toUpperCase() === waitingIdOrCode.toUpperCase()) && w.status === 'waiting'
  );
  if (!waitingItem) {
    return { success: false, message: '未找到待转移的有效等位记录' };
  }

  const targetTable = currentTables.find(
    (t) => t.id === targetTableIdOrCode || t.code.toUpperCase() === targetTableIdOrCode.toUpperCase()
  );
  if (!targetTable) {
    return { success: false, message: '未找到目标转移桌台' };
  }

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // 1. 更新目标桌台为 dining 状态，纳入等位单号和菜品
  const assignedOrderNo = waitingItem.orderNo || `UR-DIN-${targetTable.code}-${Math.floor(1000 + Math.random() * 9000)}`;
  const mergedItems = waitingItem.orderItems && waitingItem.orderItems.length > 0
    ? waitingItem.orderItems
    : targetTable.orderItems;

  const updatedTargetTable: TableItem = {
    ...targetTable,
    status: 'dining',
    tablePhase: 'cooking',
    orderNo: assignedOrderNo,
    orderTime: waitingItem.orderTime || timeStr,
    elapsedMinutes: 1,
    currentGuests: waitingItem.guests || targetTable.capacity,
    totalAmount: waitingItem.totalAmount && waitingItem.totalAmount > 0 ? waitingItem.totalAmount : (targetTable.totalAmount || 128),
    orderItems: mergedItems,
    serverName: targetTable.serverName || '小林 (No.04)'
  };

  const updatedTables = currentTables.map((t) => (t.id === targetTable.id ? updatedTargetTable : t));
  saveMerchantTables(updatedTables);

  // 2. 更新等位单为 transferred 状态
  const updatedQueue = currentQueue.map((w) =>
    w.id === waitingItem.id
      ? {
          ...w,
          status: 'transferred' as const,
          transferredToTableCode: targetTable.code,
          transferredAt: timeStr
        }
      : w
  );
  saveWaitingQueue(updatedQueue);

  // 3. 食客端联动：如果当前客户端正绑定该等位号，自动无缝同步切换至目标桌号！
  const bound = getCurrentBoundTable();
  if (bound && (bound.code.toUpperCase() === waitingItem.code.toUpperCase() || bound.waitingCode?.toUpperCase() === waitingItem.code.toUpperCase())) {
    setCurrentBoundTable({
      id: targetTable.id,
      code: targetTable.code,
      name: targetTable.name,
      zone: targetTable.zone,
      zoneLabel: targetTable.zoneLabel,
      capacity: targetTable.capacity,
      guests: waitingItem.guests || bound.guests,
      serverName: targetTable.serverName || '小林 (No.04)',
      tableStatus: 'dining',
      isWaiting: false
    });
  }

  // 4. 派发转移完成自定义通知
  window.dispatchEvent(
    new CustomEvent('obsidian_waiting_transferred', {
      detail: {
        waitingItem,
        targetTable: updatedTargetTable
      }
    })
  );

  return {
    success: true,
    transferredWaiting: waitingItem,
    updatedTable: updatedTargetTable,
    message: `成功将等位桌号 ${waitingItem.code} (${waitingItem.guests}人) 纳入转移至 ${targetTable.code} 号桌！`
  };
}

/**
 * 桌台清理完成后的核心转移钩子：
 * 当桌台保洁完成（变为空闲）时调用。
 * 如果配置了自动转移，且等位队列有候补，则自动纳入转移；
 * 否则返回可供手动转移的候选等位项。
 */
export function onTableCleanedRelease(
  cleanedTableId: string
): {
  transferred: boolean;
  waitingItem?: WaitingTableItem;
  updatedTable?: TableItem;
  eligibleCandidates: WaitingTableItem[];
  cleanedTable: TableItem | null;
} {
  const currentTables = getMerchantTables();
  const targetTable = currentTables.find((t) => t.id === cleanedTableId);
  if (!targetTable) {
    return { transferred: false, eligibleCandidates: [], cleanedTable: null };
  }

  // 桌台首先恢复为空闲（已清理）
  const idleTable: TableItem = {
    ...targetTable,
    status: 'idle',
    elapsedMinutes: 0,
    orderItems: [],
    tablePhase: undefined,
    orderNo: undefined,
    orderTime: undefined,
    totalAmount: undefined,
    currentGuests: undefined
  };

  const isAuto = getAutoTransferConfig();
  const queue = getWaitingQueue();
  const waitingList = queue.filter((w) => w.status === 'waiting');

  if (waitingList.length === 0) {
    // 无等位客人，正常保洁空闲
    const updatedTables = currentTables.map((t) => (t.id === targetTable.id ? idleTable : t));
    saveMerchantTables(updatedTables);
    return { transferred: false, eligibleCandidates: [], cleanedTable: idleTable };
  }

  // 寻找合适匹配人数的等位客人 (人数 <= 容量)，若均大于则取最早一个
  let candidate = waitingList.find((w) => w.guests <= (targetTable.capacity || 4)) || waitingList[0];

  if (isAuto && candidate) {
    // 自动纳入转移！
    const result = transferWaitingToTable(candidate.id, targetTable.id);
    return {
      transferred: true,
      waitingItem: candidate,
      updatedTable: result.updatedTable,
      eligibleCandidates: waitingList,
      cleanedTable: result.updatedTable || idleTable
    };
  } else {
    // 未开启自动转移，桌台保洁为空闲，但提供等位候选名单供手动转移
    const updatedTables = currentTables.map((t) => (t.id === targetTable.id ? idleTable : t));
    saveMerchantTables(updatedTables);
    return {
      transferred: false,
      eligibleCandidates: waitingList,
      cleanedTable: idleTable
    };
  }
}

/**
 * 将堂食订单与商家端对应桌台深度绑定（翻至用餐占用状态，并注入订单号与菜品）
 */
export function bindOrderToMerchantTable(
  tableCode: string,
  orderNo: string,
  items: Array<{ name: string; quantity: number; price?: number }>,
  totalAmount: number,
  guestsCount: number = 2
): void {
  const currentTables = getMerchantTables();
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  const cleanOrderNo = orderNo.startsWith('#') ? orderNo : `#${orderNo.replace(/^#/, '')}`;

  // 如果是等位桌号 (如以 W 开头)，则同步绑定到等位队列中
  if (tableCode.toUpperCase().startsWith('W')) {
    const queue = getWaitingQueue();
    const existing = queue.find(q => q.code.toUpperCase() === tableCode.toUpperCase());
    if (existing) {
      const updatedQueue = queue.map(q => q.id === existing.id ? {
        ...q,
        orderNo: cleanOrderNo,
        orderTime: timeStr,
        totalAmount: totalAmount || q.totalAmount,
        orderItems: items.map((it, idx) => ({
          id: `w-ord-${idx}-${Date.now()}`,
          name: it.name,
          quantity: it.quantity,
          price: it.price || 28,
          serveStatus: 'cooking' as const,
          prepProgress: 25,
          station: '等位备餐档',
          options: '等位提前下单'
        }))
      } : q);
      saveWaitingQueue(updatedQueue);
    } else {
      addWaitingTable({
        guests: guestsCount,
        orderNo: cleanOrderNo,
        items,
        totalAmount
      });
    }
    return;
  }

  const updatedTables = currentTables.map((tbl) => {
    if (tbl.code.toUpperCase() === tableCode.toUpperCase()) {
      const orderItems: TableDishItem[] = items.map((it, idx) => ({
        id: `td-new-${idx}-${Date.now()}`,
        name: it.name,
        quantity: it.quantity,
        price: it.price || 28,
        serveStatus: 'cooking' as const,
        prepProgress: 20,
        station: '炭火炙烤档',
        options: '堂食现制'
      }));

      return {
        ...tbl,
        status: 'dining' as const,
        tablePhase: 'cooking' as const,
        orderNo: cleanOrderNo,
        orderTime: timeStr,
        elapsedMinutes: 1,
        totalAmount: totalAmount || tbl.totalAmount,
        currentGuests: guestsCount || tbl.currentGuests,
        orderItems: orderItems.length > 0 ? orderItems : tbl.orderItems
      };
    }
    return tbl;
  });

  saveMerchantTables(updatedTables);
}

/**
 * 食客端催菜联动：将绑定订单的桌台菜品标记为「催单加急」(serveStatus='urged')，
 * 使商家端台位矩阵同步收到催菜信号。未上桌菜品均标记，已上桌保留 served。
 */
export function urgeMerchantTableDishes(orderNo: string): void {
  const currentTables = getMerchantTables();
  const cleanTarget = (orderNo || '').replace(/^#/, '');
  let changed = false;
  const updatedTables = currentTables.map((tbl) => {
    const tblNo = (tbl.orderNo || '').replace(/^#/, '');
    if (tblNo !== cleanTarget) return tbl;
    if (!tbl.orderItems || tbl.orderItems.length === 0) return tbl;
    changed = true;
    return {
      ...tbl,
      orderItems: tbl.orderItems.map((d) =>
        d.serveStatus === 'served'
          ? d
          : {
              ...d,
              serveStatus: 'urged' as const,
              prepProgress: d.prepProgress && d.prepProgress > 0 ? d.prepProgress : 30
            }
      )
    };
  });

  if (!changed) return;
  saveMerchantTables(updatedTables);
}
