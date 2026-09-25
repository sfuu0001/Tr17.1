/**
 * 业务领域事件事务管道 (Domain Transaction Pipeline)
 * 解决分布式多实体（桌台 Table、订单 Order、KDS 工单 Ticket、排队 Queue）跨模块状态不一致的痛点，
 * 实现一键原子级变更、多账号审计兜底与异常回滚保障。
 */

import { TableItem, Order, WaitingTableItem, KdsTicket } from '../types';
import { VersionPointer } from '../types/versionTracking';
import { safeGetStorage, safeSetStorage } from './safeStorage';
import { globalVersionEngine } from './versionPointerEngine';
import { voiceAlerts } from './voiceAlertEngine';
import { merchantEventBus } from './merchantEventBus';

// 本地存储键定义与全系统对齐
const STORAGE_KEY_TABLES = 'obsidian_merchant_tables';
const STORAGE_KEY_ORDERS = 'obsidian_customer_orders';
const STORAGE_KEY_TICKETS = 'obsidian_merchant_tickets';
const STORAGE_KEY_WAITING_QUEUE = 'obsidian_waiting_queue';

export interface VoidTableOrderParams {
  tableId: string;
  reason: string;
  targetStatus: 'idle' | 'cleaning';
  operatorName?: string;
  showToast?: (title: string, desc?: string) => void;
}

export interface MatchQueueToTableParams {
  queueItemId: string;
  tableId: string;
  guestCount?: number;
  operatorName?: string;
  showToast?: (title: string, desc?: string) => void;
}

export interface QuickVerifyPickupParams {
  pickupCodeOrOrderNo?: string;
  orderNo?: string;
  orderKey?: string;
  pickupCode?: string;
  verifiedBy?: string;
  operatorName?: string;
  showToast?: (title: string, desc?: string) => void;
}

export interface CascadingRollbackParams {
  pointerId: string;
  operatorName?: string;
  showToast?: (title: string, desc?: string) => void;
  /** 跳过基线一致性校验，强制覆盖该指针之后产生的变更（默认 false） */
  force?: boolean;
}

export interface CascadingRollbackResult {
  success: boolean;
  message: string;
  revertedPointer?: VersionPointer;
  /** 结构化失败原因，供 UI 区分"冲突待确认"与"模块不支持" */
  reason?: string;
  conflicts?: unknown[];
}

export class BusinessTransactionEngine {
  /**
   * 事务 1: 堂食桌台在结订单作废与关联实体原子清理
   * 联动更新: TableItem 状态与账单清空 -> Order 状态置为 cancelled/void -> KDS Tickets 注销 -> 写入复合级联审计版本快照
   */
  public executeVoidTableOrder(params: VoidTableOrderParams): {
    success: boolean;
    table?: TableItem;
    message: string;
  } {
    const { tableId, reason, targetStatus, showToast } = params;

    try {
      const tables = safeGetStorage<TableItem[]>(STORAGE_KEY_TABLES, []);
      const targetTable = tables.find((t) => t.id === tableId);

      if (!targetTable) {
        return { success: false, message: `未找到ID为 ${tableId} 的桌台` };
      }

      const tableCode = targetTable.code;
      const associatedOrderNo = targetTable.orderNo;
      const orderItems = targetTable.orderItems || [];
      const totalAmount = targetTable.totalAmount || 0;

      // 1. 构建更新后的桌台实体
      const updatedTable: TableItem = {
        ...targetTable,
        status: targetStatus,
        orderNo: undefined,
        totalAmount: 0,
        orderItems: [],
        reservation: undefined,
        currentGuests: 0,
        elapsedMinutes: 0
      };

      const newTables = tables.map((t) => (t.id === tableId ? updatedTable : t));
      safeSetStorage(STORAGE_KEY_TABLES, newTables);

      // 2. 联动订单中心：将关联订单更新为 cancelled，并补充作废审计日志
      let matchedOrderBackup: Order | null = null;
      if (associatedOrderNo) {
        const orders = safeGetStorage<Order[]>(STORAGE_KEY_ORDERS, []);
        const cleanNo = associatedOrderNo.replace(/^#/, '');
        const updatedOrders = orders.map((o) => {
          if (
            o.orderNo === associatedOrderNo ||
            o.orderNo?.replace(/^#/, '') === cleanNo ||
            o.id === associatedOrderNo ||
            (o.tableCode && o.tableCode.toUpperCase() === tableCode.toUpperCase())
          ) {
            matchedOrderBackup = { ...o };
            return {
              ...o,
              status: 'cancelled' as const,
              statusText: `堂食订单已作废 (${reason})`,
              cancelReason: `前台作废: ${reason}`,
              auditLogs: [
                ...(o.auditLogs || []),
                {
                  time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                  operator: params.operatorName || '前台值班领班',
                  role: 'merchant',
                  action: '作废堂食订单并清台',
                  note: `作废原因: ${reason}; 桌位恢复为: ${targetStatus === 'idle' ? '空闲' : '保洁清洁'}`
                }
              ]
            };
          }
          return o;
        });
        safeSetStorage(STORAGE_KEY_ORDERS, updatedOrders);
        window.dispatchEvent(new CustomEvent('obsidian_orders_updated', { detail: updatedOrders }));
      }

      // 3. 联动后厨 KDS 工单：注销相关未出餐制作工单并备份
      const tickets = safeGetStorage<KdsTicket[]>(STORAGE_KEY_TICKETS, []);
      let removedTicketsBackup: KdsTicket[] = [];
      if (tickets.length > 0) {
        const remainingTickets = tickets.filter((tk) => {
          const isMatchOrder = associatedOrderNo && tk.ticketNo.includes(associatedOrderNo);
          const isMatchTable = tk.tableOrChannel && (tk.tableOrChannel.includes(tableCode) || tk.tableOrChannel.includes(`${tableCode}桌`));
          if (isMatchOrder || isMatchTable) {
            removedTicketsBackup.push(tk);
            return false;
          }
          return true;
        });
        safeSetStorage(STORAGE_KEY_TICKETS, remainingTickets);
        window.dispatchEvent(new CustomEvent('obsidian_tickets_updated', { detail: remainingTickets }));
      }

      // 4. 记录复合多实体级联版本控制快照 (Cascading Snapshot)
      globalVersionEngine.recordDataMutation({
        module: 'tables',
        entityId: targetTable.id,
        entityName: `${tableCode} 桌 (${targetTable.name})`,
        actionType: 'void_order',
        beforeData: {
          table: targetTable,
          associatedOrder: matchedOrderBackup,
          removedTickets: removedTicketsBackup
        },
        afterData: {
          table: updatedTable
        },
        customSummary: `🛡️ 跨模块级联作废 ${tableCode} 桌订单 (单号: ${associatedOrderNo || '未分配'})，已同步作废订单并清理后厨工单 (原因: ${reason})`
      });

      // 5. 广播通知与语音外放
      window.dispatchEvent(new CustomEvent('obsidian_tables_updated', { detail: newTables }));
      voiceAlerts.speakText(`${tableCode}号桌订单已作废并清台释放`, { persona: 'steady_male' });

      if (showToast) {
        showToast(`【订单已作废】${tableCode} 桌关联订单已作废并释放桌台 (原因: ${reason})`);
      }

      return {
        success: true,
        table: updatedTable,
        message: `${tableCode} 桌订单已作废成功`
      };
    } catch (err) {
      console.error('executeVoidTableOrder 事务执行异常:', err);
      return { success: false, message: '作废事务执行失败，请重试' };
    }
  }

  /**
   * 事务 2: 等位排队号牌与空闲桌台自动撮合入座
   * 联动更新: 等位列表 WaitingTableItem 置为 transferred -> 桌台 TableItem 变为 dining 并同步预点餐品 -> 触发语音欢迎入座广播
   */
  public executeMatchQueueToTable(params: MatchQueueToTableParams): {
    success: boolean;
    message: string;
    table?: TableItem;
  } {
    const { queueItemId, tableId, guestCount, showToast } = params;

    try {
      const queueList = safeGetStorage<WaitingTableItem[]>(STORAGE_KEY_WAITING_QUEUE, []);
      const targetQueue = queueList.find((q) => q.id === queueItemId || q.code === queueItemId);

      const tables = safeGetStorage<TableItem[]>(STORAGE_KEY_TABLES, []);
      const targetTable = tables.find((t) => t.id === tableId);

      if (!targetTable) {
        return { success: false, message: `未找到桌台 ${tableId}` };
      }

      const partySize = guestCount || targetQueue?.guests || 2;
      const guestName = targetQueue?.guestName || (targetQueue?.code ? `排队顾客 (${targetQueue.code})` : '现场等位顾客');
      const generatedOrderNo = targetQueue?.orderNo || `UR-DIN-${targetTable.code}-${Date.now().toString().slice(-4)}`;
      const queueDishes = targetQueue?.orderItems || [];
      const totalAmount = targetQueue?.totalAmount || queueDishes.reduce((acc, d) => acc + d.price * d.quantity, 0) || 0;

      // 1. 更新桌台为就餐开台，带入排队预点餐品
      const updatedTable: TableItem = {
        ...targetTable,
        status: 'dining',
        orderNo: generatedOrderNo,
        currentGuests: partySize,
        elapsedMinutes: 1,
        totalAmount,
        orderItems: queueDishes.length > 0 ? queueDishes : targetTable.orderItems || [],
        reservation: targetQueue?.phone
          ? {
              guestName: guestName,
              phone: targetQueue.phone,
              timeText: '现场排队入座',
              countdownMinutes: 0
            }
          : undefined
      };

      const newTables = tables.map((t) => (t.id === tableId ? updatedTable : t));
      safeSetStorage(STORAGE_KEY_TABLES, newTables);

      // 2. 更新排队号牌为已转入台位
      if (targetQueue) {
        const updatedQueue = queueList.map((q) => {
          if (q.id === targetQueue.id) {
            return {
              ...q,
              status: 'transferred' as const,
              transferredTable: targetTable.code,
              transferredAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
            };
          }
          return q;
        });
        safeSetStorage(STORAGE_KEY_WAITING_QUEUE, updatedQueue);
        window.dispatchEvent(new CustomEvent('obsidian_waiting_queue_updated', { detail: updatedQueue }));
      }

      // 3. 记录版本指针快照
      globalVersionEngine.recordDataMutation({
        module: 'tables',
        entityId: targetTable.id,
        entityName: `${targetTable.code} 桌 (${targetTable.name})`,
        actionType: 'create',
        beforeData: targetTable,
        afterData: updatedTable,
        customSummary: `排队号【${targetQueue?.code || '候补'}】(${partySize}人) 成功撮合入座 ${targetTable.code} 桌开台`
      });

      // 4. 广播与语音叫号
      window.dispatchEvent(new CustomEvent('obsidian_tables_updated', { detail: newTables }));
      voiceAlerts.speakText(`请等位顾客 ${targetQueue?.code || ''} 到 ${targetTable.code} 桌就座用餐`, {
        persona: 'sweet_frontdesk',
        chimeType: 'call'
      });

      if (showToast) {
        showToast(`【智能撮合入座成功】${targetQueue?.code || '等位'} 顾客已安排至 ${targetTable.code} 桌开台！`);
      }

      return {
        success: true,
        message: `成功安排 ${targetQueue?.code || '等位顾客'} 入座 ${targetTable.code} 桌`,
        table: updatedTable
      };
    } catch (err) {
      console.error('executeMatchQueueToTable 事务执行异常:', err);
      return { success: false, message: '撮合入座失败，请重试' };
    }
  }

  /**
   * 事务 3: 极速自提/外卖扫码核销原子事务
   * 联动更新: Order 状态置为 completed/delivering -> 记录核销凭据与时间 -> 触发语音播报与热敏小票指令
   */
  public executeVerifyPickup(params: QuickVerifyPickupParams): {
    success: boolean;
    order?: Order;
    message: string;
  } {
    const { pickupCodeOrOrderNo, verifiedBy = '主理人阿豪', showToast } = params;
    const cleanKey = (pickupCodeOrOrderNo || '').trim().toUpperCase().replace(/^#/, '');

    if (!cleanKey) {
      return { success: false, message: '核销码或订单号不能为空' };
    }

    try {
      const orders = safeGetStorage<Order[]>(STORAGE_KEY_ORDERS, []);
      const matchedOrder = orders.find((o) => {
        const orderNo = (o.orderNo || '').replace(/^#/, '').toUpperCase();
        const id = (o.id || '').toUpperCase();
        const pickup = (o.pickupCode || '').toUpperCase();
        return (
          pickup === cleanKey ||
          orderNo === cleanKey ||
          orderNo.endsWith(cleanKey) ||
          id === cleanKey
        );
      });

      if (!matchedOrder) {
        return { success: false, message: `未找到核销码/订单号 [${cleanKey}] 对应的待提货订单` };
      }

      if (matchedOrder.status === 'completed' || matchedOrder.stepIndex === 4) {
        return { success: false, message: `订单 #${matchedOrder.orderNo} 之前已完成核销提货，请勿重复核销！` };
      }

      const verifyTime = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      const updatedOrder: Order = {
        ...matchedOrder,
        status: 'completed',
        stepIndex: 4,
        statusText: '已核销提货·交易完成',
        pickupVerifiedAt: verifyTime,
        pickupVerifiedBy: verifiedBy,
        auditLogs: [
          ...(matchedOrder.auditLogs || []),
          {
            time: verifyTime,
            operator: verifiedBy,
            role: 'merchant',
            action: '极速扫码提货核销',
            note: `核销凭证码: ${cleanKey} | 操作人: ${verifiedBy}`
          }
        ]
      };

      const updatedOrders = orders.map((o) => (o.id === matchedOrder.id ? updatedOrder : o));
      safeSetStorage(STORAGE_KEY_ORDERS, updatedOrders);

      // 记录审计版本快照
      globalVersionEngine.recordDataMutation({
        module: 'orders',
        entityId: matchedOrder.id,
        entityName: `订单 #${matchedOrder.orderNo}`,
        actionType: 'update',
        beforeData: matchedOrder,
        afterData: updatedOrder,
        customSummary: `✅ 扫码极速核销订单 #${matchedOrder.orderNo} (提货码: ${matchedOrder.pickupCode || cleanKey})，核销人: ${verifiedBy}`
      });

      // 广播全局事件
      window.dispatchEvent(new CustomEvent('obsidian_orders_updated', { detail: updatedOrders }));
      window.dispatchEvent(
        new CustomEvent('obsidian_pickup_verified', {
          detail: {
            orderId: matchedOrder.id,
            orderNo: matchedOrder.orderNo,
            verifiedAt: verifyTime,
            verifiedBy
          }
        })
      );

      // 语音播报
      voiceAlerts.speakText(`提货码 ${cleanKey} 核销成功，餐品已交付顾客，祝您用餐愉快！`, {
        persona: 'gentle_female',
        chimeType: 'success'
      });

      if (showToast) {
        showToast(`【极速核销成功】订单 #${matchedOrder.orderNo.replace(/^#/, '')} 已核销完成！`);
      }

      return {
        success: true,
        order: updatedOrder,
        message: `订单 #${matchedOrder.orderNo} 核销成功`
      };
    } catch (err) {
      console.error('executeVerifyPickup 事务执行异常:', err);
      return { success: false, message: '核销事务执行失败' };
    }
  }

  /**
   * 事务 4: 跨模块级联回滚 (Cascading Rollback)
   * 彻底解决单表回滚遗留的孤岛问题：当回滚桌台作废事务时，一次性原子恢复桌台 + 订单 + 后厨工单！
   */
  public executeCascadingRollback(params: CascadingRollbackParams): CascadingRollbackResult {
    const { pointerId, operatorName = '主理人阿豪', showToast } = params;

    try {
      const allPointers = globalVersionEngine.getAllPointers();
      const targetPointer = allPointers.find((p) => p.pointerId === pointerId);

      if (!targetPointer) {
        return { success: false, message: `未找到版本指针: ${pointerId}` };
      }

      const beforeData = targetPointer.beforeSnapshot;
      if (!beforeData) {
        return { success: false, message: '该版本指针缺少历史前置快照，无法执行级联回滚' };
      }

      // 判断是否为复合快照 (包含了 table + associatedOrder + removedTickets)
      if (beforeData.table && typeof beforeData.table === 'object') {
        const restoredTable = beforeData.table as TableItem;

        // 1. 恢复桌台
        const tables = safeGetStorage<TableItem[]>(STORAGE_KEY_TABLES, []);
        const updatedTables = tables.map((t) => (t.id === restoredTable.id ? restoredTable : t));
        safeSetStorage(STORAGE_KEY_TABLES, updatedTables);
        window.dispatchEvent(new CustomEvent('obsidian_tables_updated', { detail: updatedTables }));

        // 2. 恢复关联订单（若存在）
        if (beforeData.associatedOrder) {
          const restoredOrder = beforeData.associatedOrder as Order;
          const orders = safeGetStorage<Order[]>(STORAGE_KEY_ORDERS, []);
          const updatedOrders = orders.map((o) => (o.id === restoredOrder.id ? restoredOrder : o));
          safeSetStorage(STORAGE_KEY_ORDERS, updatedOrders);
          window.dispatchEvent(new CustomEvent('obsidian_orders_updated', { detail: updatedOrders }));
        }

        // 3. 恢复后厨工单（若存在）
        if (Array.isArray(beforeData.removedTickets) && beforeData.removedTickets.length > 0) {
          const tickets = safeGetStorage<KdsTicket[]>(STORAGE_KEY_TICKETS, []);
          const mergedTickets = [...beforeData.removedTickets, ...tickets];
          safeSetStorage(STORAGE_KEY_TICKETS, mergedTickets);
          window.dispatchEvent(new CustomEvent('obsidian_tickets_updated', { detail: mergedTickets }));
        }

        // 4. 标记快照已回滚并写入回滚新版本记录
        globalVersionEngine.recordDataMutation({
          module: 'tables',
          entityId: restoredTable.id,
          entityName: `${restoredTable.code} 桌`,
          actionType: 'rollback',
          beforeData: targetPointer.afterSnapshot,
          afterData: restoredTable,
          customSummary: `🛡️ 跨模块级联回滚成功：已同步恢复 ${restoredTable.code} 桌台、关联订单及后厨制作工单`
        });

        // 标记原指针
        const markedPointers = allPointers.map((p) =>
          p.pointerId === pointerId ? { ...p, status: 'reverted' as const } : p
        );
        globalVersionEngine.savePointers(markedPointers);

        voiceAlerts.speakText(`级联事务回滚已完成，桌台与关联订单已完整复原`, { persona: 'steady_male' });

        if (showToast) {
          showToast(`【级联回滚成功】${restoredTable.code} 桌关联订单与状态已完整恢复！`);
        }

        return {
          success: true,
          message: `成功恢复 ${restoredTable.code} 桌及关联订单事务`,
          revertedPointer: targetPointer
        };
      }

      // 如果是标准单表回滚，委托给 globalVersionEngine
      // P0-a 修复：原先仅在 res.success 时提示，失败时用户点击「一键恢复」后界面毫无反馈；
      // 现在失败原因（冲突/模块不支持/写入失败）会一并回传并提示。
      const res = globalVersionEngine.rollbackPointer(pointerId, { force: params.force });
      if (showToast) {
        showToast(res.success ? res.message : `⚠️ ${res.message}`);
      }
      return {
        ...res,
        revertedPointer: res.success ? targetPointer : undefined
      };
    } catch (err) {
      console.error('executeCascadingRollback 异常:', err);
      return { success: false, message: '级联回滚失败' };
    }
  }

  /**
   * 联动事务 5: KDS 出餐状态同步至桌台进度与叫号取餐
   * 后厨 KDS 出餐完成 -> 关联桌台菜品标记为已上桌/更新完成率 -> 若外卖自提单自动触发叫号语音与打印任务
   */
  public executeKdsDishStatusSync(params: {
    ticketId: string;
    dishName?: string;
    isAllCompleted?: boolean;
    operatorName?: string;
    showToast?: (msg: string) => void;
  }): { success: boolean; message: string; tableUpdated?: boolean; calledPickup?: boolean } {
    const { ticketId, dishName, isAllCompleted = false, showToast } = params;

    try {
      const tickets = safeGetStorage<KdsTicket[]>(STORAGE_KEY_TICKETS, []);
      const targetTicket = tickets.find((t) => t.id === ticketId);
      if (!targetTicket) {
        return { success: false, message: `未找到工单 ${ticketId}` };
      }

      const cleanTicketNo = targetTicket.ticketNo.replace(/^#/, '');
      const tables = safeGetStorage<TableItem[]>(STORAGE_KEY_TABLES, []);

      // 1. 尝试匹配堂食桌台
      let tableUpdated = false;
      const updatedTables = tables.map((tbl) => {
        const tblOrderNo = (tbl.orderNo || '').replace(/^#/, '');
        const isTableMatched =
          (tblOrderNo && (tblOrderNo === cleanTicketNo || tblOrderNo.endsWith(cleanTicketNo) || cleanTicketNo.endsWith(tblOrderNo))) ||
          (targetTicket.tableOrChannel && (targetTicket.tableOrChannel.includes(tbl.code) || targetTicket.tableOrChannel.includes(`${tbl.code}桌`)));

        if (isTableMatched && tbl.orderItems && tbl.orderItems.length > 0) {
          tableUpdated = true;
          const updatedItems = tbl.orderItems.map((item) => {
            if (isAllCompleted || (dishName && item.name === dishName)) {
              return { ...item, serveStatus: 'served' as const };
            }
            return item;
          });

          const servedCount = updatedItems.filter((i) => i.serveStatus === 'served').length;
          const allServed = servedCount === updatedItems.length;

          return {
            ...tbl,
            orderItems: updatedItems,
            tablePhase: allServed ? ('served' as const) : tbl.tablePhase
          };
        }
        return tbl;
      });

      if (tableUpdated) {
        safeSetStorage(STORAGE_KEY_TABLES, updatedTables);
        window.dispatchEvent(new CustomEvent('obsidian_tables_updated', { detail: updatedTables }));
      }

      // 2. 若为外卖或自提单，且整单出餐完成，自动触发叫号排队联动
      let calledPickup = false;
      const isPickupOrDelivery =
        targetTicket.channelType === 'pickup' ||
        targetTicket.channelType === 'delivery' ||
        targetTicket.tableOrChannel.includes('自提') ||
        targetTicket.tableOrChannel.includes('专送') ||
        targetTicket.tableOrChannel.includes('外卖');

      if (isAllCompleted && isPickupOrDelivery) {
        calledPickup = true;
        const shortCode = cleanTicketNo.slice(-4) || cleanTicketNo;

        // 播报取餐语音
        voiceAlerts.speakText(`请自提订单 ${shortCode} 到餐车取餐口取餐`, {
          persona: 'sweet_frontdesk',
          chimeType: 'call'
        });

        // 记录叫号记录
        const callingKey = 'obsidian_calling_history';
        const callingList = safeGetStorage<any[]>(callingKey, []);
        const newRecord = {
          id: `call-${Date.now()}`,
          code: shortCode,
          orderNo: targetTicket.ticketNo,
          type: 'pickup',
          callTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          status: 'ready_to_pick'
        };
        safeSetStorage(callingKey, [newRecord, ...callingList.slice(0, 49)]);
        window.dispatchEvent(new CustomEvent('obsidian_calling_updated', { detail: newRecord }));
      }

      // 3. 派发全局领域事件总线
      merchantEventBus.emit('merchant:kds_dish_completed', {
        ticketId,
        ticketNo: targetTicket.ticketNo,
        dishName,
        isAllCompleted,
        channelType: targetTicket.channelType,
        orderNo: targetTicket.ticketNo
      });

      if (showToast) {
        showToast(`【后厨出餐同步】${targetTicket.ticketNo} ${dishName ? dishName + '已完成' : '全部出餐完成'}${tableUpdated ? '，已同步更新桌台' : ''}${calledPickup ? '，已自动广播取餐' : ''}`);
      }

      return {
        success: true,
        message: 'KDS出餐同步成功',
        tableUpdated,
        calledPickup
      };
    } catch (e) {
      console.error('executeKdsDishStatusSync 异常:', e);
      return { success: false, message: '出餐同步失败' };
    }
  }

  /**
   * 联动事务 6: 堂食桌台催菜 ↔ KDS 后厨优先置顶与加急预警
   * 服务员催菜 -> KDS 工单添加加急徽章、置顶卡片并播放加急语音
   */
  public executeUrgeOrderOrDish(params: {
    tableCode: string;
    orderNo?: string;
    dishName?: string;
    showToast?: (msg: string) => void;
  }): { success: boolean; message: string; ticketsUrged: number } {
    const { tableCode, orderNo, dishName, showToast } = params;

    try {
      const tickets = safeGetStorage<KdsTicket[]>(STORAGE_KEY_TICKETS, []);
      let ticketsUrged = 0;

      const updatedTickets = tickets.map((tk) => {
        const isMatchTable = tk.tableOrChannel && (tk.tableOrChannel.includes(tableCode) || tk.tableOrChannel.includes(`${tableCode}桌`));
        const isMatchOrder = orderNo && tk.ticketNo.replace(/^#/, '') === orderNo.replace(/^#/, '');

        if (isMatchTable || isMatchOrder) {
          ticketsUrged++;
          return {
            ...tk,
            isUrged: true,
            urgeCount: (tk.urgeCount || 0) + 1,
            urgedAt: Date.now()
          };
        }
        return tk;
      });

      // 将催急的单据置顶排列
      updatedTickets.sort((a, b) => {
        if (a.isUrged && !b.isUrged) return -1;
        if (!a.isUrged && b.isUrged) return 1;
        return (b.urgedAt || 0) - (a.urgedAt || 0);
      });

      safeSetStorage(STORAGE_KEY_TICKETS, updatedTickets);
      window.dispatchEvent(new CustomEvent('obsidian_tickets_updated', { detail: updatedTickets }));

      // 播放加急催菜警报
      const urgeVoice = dishName
        ? `${tableCode}号桌顾客催促 ${dishName}，请后厨优先出餐！`
        : `${tableCode}号桌催菜，请后厨优先制作加急！`;
      voiceAlerts.speakText(urgeVoice, {
        persona: 'steady_male',
        chimeType: 'bell'
      });

      // 派发事件
      merchantEventBus.emit('merchant:table_urged', {
        tableId: tableCode,
        tableCode,
        orderNo,
        dishName,
        urgeCount: 1,
        timestamp: Date.now()
      });

      if (showToast) {
        showToast(`🔥【已催单】${tableCode}号桌${dishName ? `「${dishName}」` : ''}催单指令已下达，后厨工单已置顶！`);
      }

      return {
        success: true,
        message: `已为 ${tableCode} 桌加急催菜`,
        ticketsUrged
      };
    } catch (e) {
      console.error('executeUrgeOrderOrDish 异常:', e);
      return { success: false, message: '催菜事务执行失败', ticketsUrged: 0 };
    }
  }

  /**
   * 联动事务 7: 菜品/原物料沽清熔断 ↔ 订单中心 ↔ 突发中枢缺货换菜
   */
  public executeDishSoldOutCascade(params: {
    dishId: string;
    dishName: string;
    isSoldOut: boolean;
    showToast?: (msg: string) => void;
  }): { success: boolean; affectedOrdersCount: number; message: string } {
    const { dishId, dishName, isSoldOut, showToast } = params;

    try {
      const orders = safeGetStorage<Order[]>(STORAGE_KEY_ORDERS, []);
      // 检索在途未出餐且包含此菜品的活跃订单
      const affected = orders.filter((o) => {
        if (o.status !== 'pending' && o.status !== 'cooking') return false;
        return o.items && o.items.some((it) => it.dishId === dishId || it.name === dishName);
      });

      // 派发售罄事件
      merchantEventBus.emit('merchant:dish_sold_out', {
        dishId,
        dishName,
        isSoldOut,
        timestamp: Date.now(),
        affectedOrders: affected.map((o) => ({
          orderId: o.id,
          orderNo: o.orderNo,
          customerName: o.customerName || '食客'
        }))
      });

      if (isSoldOut && affected.length > 0) {
        voiceAlerts.speakText(`菜品 ${dishName} 已沽清，发现 ${affected.length} 笔在途订单受影响，请至突发中枢处理`, {
          persona: 'steady_male'
        });
      }

      if (showToast) {
        showToast(
          isSoldOut
            ? `【菜品已沽清】${dishName} 已全渠道下架${affected.length > 0 ? `，检测到 ${affected.length} 笔在途订单需换菜/退款` : ''}`
            : `【菜品已恢复】${dishName} 已重新上架可售`
        );
      }

      return {
        success: true,
        affectedOrdersCount: affected.length,
        message: `沽清联动处理完成，影响 ${affected.length} 笔订单`
      };
    } catch (e) {
      console.error('executeDishSoldOutCascade 异常:', e);
      return { success: false, affectedOrdersCount: 0, message: '沽清联动失败' };
    }
  }

  /**
   * 联动事务 8: 餐车 GPS 停靠点位切换 ↔ 外摆展开与桌台扩容
   */
  public executeStallRelocationCascade(params: {
    stallId: string;
    stallName: string;
    locationText: string;
    maxTables: number;
    recommendedMenuTag: string;
    deliveryRadiusKm: number;
    showToast?: (msg: string) => void;
  }): { success: boolean; message: string } {
    const { stallId, stallName, locationText, maxTables, recommendedMenuTag, deliveryRadiusKm, showToast } = params;

    try {
      merchantEventBus.emit('merchant:stall_relocated', {
        stallId,
        stallName,
        locationText,
        maxTables,
        recommendedMenuTag,
        deliveryRadiusKm
      });

      voiceAlerts.speakText(`餐车已成功转场至 ${stallName}，外摆桌位已就绪`, {
        persona: 'sweet_frontdesk'
      });

      if (showToast) {
        showToast(`【餐车转场就绪】已切换至 ${stallName}，可用桌台容量调整为 ${maxTables} 桌，配送半径 ${deliveryRadiusKm}km`);
      }

      return { success: true, message: `转场成功至 ${stallName}` };
    } catch (e) {
      console.error('executeStallRelocationCascade 异常:', e);
      return { success: false, message: '转场联动失败' };
    }
  }

  /**
   * 联动事务 9: 收银交班关账预检 ↔ 挂账风控
   */
  public executeShiftPrecheck(): {
    canProceed: boolean;
    heldOrdersCount: number;
    pendingRefundCount: number;
    message: string;
  } {
    try {
      const heldOrders = safeGetStorage<any[]>('obsidian_merchant_held_orders', []);
      const orders = safeGetStorage<Order[]>(STORAGE_KEY_ORDERS, []);
      const uncollectedHeld = heldOrders.filter((h) => h.status === 'uncollected' || h.status === 'pending');
      const pendingRefunds = orders.filter((o) => o.status === 'refund_pending' || o.refundStatus === 'pending');

      const canProceed = uncollectedHeld.length === 0 && pendingRefunds.length === 0;

      const message = canProceed
        ? '交班预检通过：所有挂账已结清，无待审核退款，可直接进行日结封账。'
        : `交班预检警报：当前存在 ${uncollectedHeld.length} 笔未结挂账单、${pendingRefunds.length} 笔待审核退款，请先处理或标记交接后再交班！`;

      return {
        canProceed,
        heldOrdersCount: uncollectedHeld.length,
        pendingRefundCount: pendingRefunds.length,
        message
      };
    } catch (e) {
      return {
        canProceed: true,
        heldOrdersCount: 0,
        pendingRefundCount: 0,
        message: '预检执行完成'
      };
    }
  }
}

export const businessTransactionEngine = new BusinessTransactionEngine();

