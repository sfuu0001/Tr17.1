/**
 * 商家端跨组件业务联动事件总线 (Merchant Cross-Component Event Bus)
 * 为商家端 7 大核心协同联动场景提供轻量、强类型、响应式的事件发布与订阅机制
 */

export interface KdsDishCompletedPayload {
  ticketId: string;
  ticketNo: string;
  dishName?: string;
  isAllCompleted: boolean;
  channelType?: string;
  tableCode?: string;
  orderNo?: string;
}

export interface TableOrderUrgedPayload {
  tableId: string;
  tableCode: string;
  orderNo?: string;
  dishName?: string;
  urgeCount: number;
  timestamp: number;
}

export interface TableCleanedPayload {
  tableId: string;
  tableCode: string;
  capacity: number;
}

export interface WaitingTimeoutCompensatePayload {
  queueId: string;
  queueCode: string;
  customerName: string;
  phone?: string;
  waitedMinutes: number;
  couponTitle: string;
  discountAmount: number;
}

export interface DishSoldOutPayload {
  dishId: string;
  dishName: string;
  materialId?: string;
  isSoldOut: boolean;
  timestamp: number;
  affectedOrders?: { orderId: string; orderNo: string; customerName: string }[];
}

export interface ScannerRoutedPayload {
  code: string;
  type: 'pickup' | 'member' | 'table' | 'dish' | 'coupon' | 'custom';
  targetId?: string;
  summary: string;
  autoActionTaken: boolean;
}

export interface StallRelocatedPayload {
  stallId: string;
  stallName: string;
  locationText: string;
  maxTables: number;
  recommendedMenuTag: string;
  deliveryRadiusKm: number;
}

export interface ShiftClosingCheckPayload {
  cashierName: string;
  heldOrdersCount: number;
  pendingRefundCount: number;
  canProceed: boolean;
}

export interface MerchantEventMap {
  'merchant:kds_dish_completed': KdsDishCompletedPayload;
  'merchant:table_urged': TableOrderUrgedPayload;
  'merchant:table_cleaned': TableCleanedPayload;
  'merchant:waiting_compensate': WaitingTimeoutCompensatePayload;
  'merchant:dish_sold_out': DishSoldOutPayload;
  'merchant:scanner_routed': ScannerRoutedPayload;
  'merchant:stall_relocated': StallRelocatedPayload;
  'merchant:shift_closing_check': ShiftClosingCheckPayload;
  'merchant:navigate_tab': { tab: string; subEntityId?: string };
}

type EventCallback<T> = (payload: T) => void;

class MerchantEventBus {
  private listeners: { [K in keyof MerchantEventMap]?: EventCallback<any>[] } = {};

  public on<K extends keyof MerchantEventMap>(event: K, callback: EventCallback<MerchantEventMap[K]>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);

    // 返回解绑函数
    return () => this.off(event, callback);
  }

  public off<K extends keyof MerchantEventMap>(event: K, callback: EventCallback<MerchantEventMap[K]>): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter((cb) => cb !== callback);
  }

  public emit<K extends keyof MerchantEventMap>(event: K, payload: MerchantEventMap[K]): void {
    const handlers = this.listeners[event];
    if (handlers && handlers.length > 0) {
      handlers.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`[MerchantEventBus] Error in listener for event "${event}":`, e);
        }
      });
    }

    // 同时向 window dispatch CustomEvent 兼容外部未通过 bus 订阅的组件
    try {
      window.dispatchEvent(
        new CustomEvent(`obsidian_bus_${event}`, {
          detail: payload
        })
      );
    } catch {
      // ignore
    }
  }

  public clearAll(): void {
    this.listeners = {};
  }
}

export const merchantEventBus = new MerchantEventBus();
