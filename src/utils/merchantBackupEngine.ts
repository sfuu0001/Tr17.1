/**
 * 商家端全量操作数据备份、审计与兜底恢复引擎 (Merchant Backup & Fallback Engine)
 * 作用：
 * 1. 实时记录商家端的所有操作（修改、删除、调账、改价、沽清等）并提供详尽审计流水
 * 2. 支持敏感操作前自动生成快照备份，以及手动一键全量快照
 * 3. 提供一键兜底回滚（One-Click Rollback）能力，数据误删误改可秒级还原
 * 4. 支持导出与导入全量 JSON 容灾包
 */

import { Order, DishItem } from '../types';

export interface MerchantAuditLogItem {
  id: string;
  timestamp: number;
  timeStr: string;
  operator: string;
  module: '营收报表' | '菜品管理' | '台位订单' | '全渠道订单' | '后厨出餐' | '系统设置' | '风控审核' | '用户会话';
  actionType: 'create' | 'update' | 'delete' | 'adjust' | 'rollback' | 'backup';
  title: string;
  details: string;
  beforeSnapshot?: any;
  afterSnapshot?: any;
}

export interface MerchantBackupSnapshot {
  id: string;
  timestamp: number;
  timeStr: string;
  label: string;
  reason: string;
  operator: string;
  ordersCount: number;
  dishesCount: number;
  adjustmentsCount: number;
  data: {
    orders?: Order[];
    dishes?: DishItem[];
    customAdjustments?: any[];
    customOrderOverrides?: Record<string, Partial<Order>>;
    deletedOrderIds?: string[];
    localStorageDump?: Record<string, any>;
  };
}

const STORAGE_KEY_AUDIT_LOGS = 'obsidian_merchant_audit_logs_v1';
const STORAGE_KEY_SNAPSHOTS = 'obsidian_merchant_backup_snapshots_v1';
const STORAGE_KEY_CUSTOM_ADJUSTMENTS = 'obsidian_analytics_custom_adjustments_v1';
const STORAGE_KEY_ORDER_OVERRIDES = 'obsidian_analytics_order_overrides_v1';
const STORAGE_KEY_DELETED_ORDER_IDS = 'obsidian_analytics_deleted_order_ids_v1';

class MerchantBackupEngine {
  private listeners: Array<() => void> = [];

  constructor() {
    this.ensureInitialSnapshot();
  }

  /**
   * 记录商家端操作日志
   */
  public logAction(
    module: MerchantAuditLogItem['module'],
    actionType: MerchantAuditLogItem['actionType'],
    title: string,
    details: string,
    beforeSnapshot?: any,
    afterSnapshot?: any,
    operator: string = '主理人/店长 (当前在线)'
  ): MerchantAuditLogItem {
    const now = Date.now();
    const item: MerchantAuditLogItem = {
      id: `audit-${now}-${Math.floor(Math.random() * 1000)}`,
      timestamp: now,
      timeStr: this.formatTime(now),
      operator,
      module,
      actionType,
      title,
      details,
      beforeSnapshot,
      afterSnapshot
    };

    const logs = this.getAuditLogs();
    logs.unshift(item);
    // 保留最近 200 条操作审计记录
    const trimmed = logs.slice(0, 200);
    this.saveAuditLogs(trimmed);
    this.notifyListeners();
    return item;
  }

  /**
   * 获取所有操作审计日志
   */
  public getAuditLogs(): MerchantAuditLogItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveAuditLogs(logs: MerchantAuditLogItem[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.warn('Failed to save audit logs:', e);
    }
  }

  /**
   * 创建全量备份快照 (Backup Snapshot)
   */
  public createSnapshot(
    label: string,
    reason: string,
    orders?: Order[],
    dishes?: DishItem[],
    operator: string = '系统/主理人'
  ): MerchantBackupSnapshot {
    const now = Date.now();
    const adjustments = this.getCustomAdjustments();
    const overrides = this.getOrderOverrides();
    const deletedIds = this.getDeletedOrderIds();

    // 抓取核心持久化数据字典
    const storageDump: Record<string, any> = {};
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('obsidian_')) {
          try {
            storageDump[key] = JSON.parse(localStorage.getItem(key) || '');
          } catch {
            storageDump[key] = localStorage.getItem(key);
          }
        }
      }
    }

    const snapshot: MerchantBackupSnapshot = {
      id: `SNAP-${now}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: now,
      timeStr: this.formatTime(now),
      label,
      reason,
      operator,
      ordersCount: orders ? orders.length : 0,
      dishesCount: dishes ? dishes.length : 0,
      adjustmentsCount: adjustments.length,
      data: {
        orders,
        dishes,
        customAdjustments: adjustments,
        customOrderOverrides: overrides,
        deletedOrderIds: deletedIds,
        localStorageDump: storageDump
      }
    };

    const snapshots = this.getSnapshots();
    snapshots.unshift(snapshot);
    // 保留最近 20 个快照版本
    const trimmed = snapshots.slice(0, 20);
    this.saveSnapshots(trimmed);

    this.logAction(
      '系统设置',
      'backup',
      `创建全量数据备份快照：${label}`,
      `备份原因: ${reason}，包含 ${snapshot.ordersCount} 笔订单与 ${snapshot.dishesCount} 道菜品数据`,
      null,
      { snapshotId: snapshot.id }
    );

    this.notifyListeners();
    return snapshot;
  }

  /**
   * 获取所有备份快照列表
   */
  public getSnapshots(): MerchantBackupSnapshot[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveSnapshots(snapshots: MerchantBackupSnapshot[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(snapshots));
    } catch (e) {
      console.warn('Failed to save backup snapshots:', e);
    }
  }

  /**
   * 一键兜底回滚还原 (Rollback to Snapshot)
   */
  public rollbackToSnapshot(snapshotId: string): { success: boolean; message: string; restoredData?: any } {
    const snapshots = this.getSnapshots();
    const target = snapshots.find((s) => s.id === snapshotId);
    if (!target) {
      return { success: false, message: '未找到该备份快照版本，可能已被清除' };
    }

    // 回滚前先自动生成一个“回滚前安全兜底快照”以防悔棋
    this.createSnapshot(
      `回滚前应急安全快照 (自动创建)`,
      `在还原至快照 [${target.label}] 前自动保存当前状态`
    );

    try {
      if (target.data.customAdjustments) {
        localStorage.setItem(STORAGE_KEY_CUSTOM_ADJUSTMENTS, JSON.stringify(target.data.customAdjustments));
      }
      if (target.data.customOrderOverrides) {
        localStorage.setItem(STORAGE_KEY_ORDER_OVERRIDES, JSON.stringify(target.data.customOrderOverrides));
      }
      if (target.data.deletedOrderIds) {
        localStorage.setItem(STORAGE_KEY_DELETED_ORDER_IDS, JSON.stringify(target.data.deletedOrderIds));
      }

      if (target.data.localStorageDump) {
        Object.entries(target.data.localStorageDump).forEach(([k, v]) => {
          if (k !== STORAGE_KEY_AUDIT_LOGS && k !== STORAGE_KEY_SNAPSHOTS) {
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          }
        });
      }

      // 派发全局数据还原事件
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('obsidian_data_restored', { detail: { snapshotId } }));
      }

      this.logAction(
        '系统设置',
        'rollback',
        `执行系统数据兜底回滚：${target.label}`,
        `已将系统全盘数据还原至 [${target.timeStr}] 生成的快照版本，订单数: ${target.ordersCount}`,
        null,
        { restoredSnapshotId: target.id }
      );

      this.notifyListeners();
      return { success: true, message: `已成功兜底还原至快照【${target.label}】！数据已恢复。`, restoredData: target.data };
    } catch (err: any) {
      return { success: false, message: `还原失败：${err.message}` };
    }
  }

  /**
   * 删除某个快照版本
   */
  public deleteSnapshot(snapshotId: string) {
    const snapshots = this.getSnapshots().filter((s) => s.id !== snapshotId);
    this.saveSnapshots(snapshots);
    this.notifyListeners();
  }

  /**
   * 报表自定义调整与修改项接口
   */
  public getCustomAdjustments(): Array<{
    id: string;
    dateStr: string; // YYYY-MM-DD
    title: string;
    amount: number; // 正数为增加营收，负数为折让减扣
    category: '活动补贴' | '线上平台差额' | '线下手工补录' | '现金账目修正' | '食材物料损耗扣减';
    remark: string;
    createdAt: number;
  }> {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_ADJUSTMENTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveCustomAdjustments(adjustments: any[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_CUSTOM_ADJUSTMENTS, JSON.stringify(adjustments));
    this.notifyListeners();
  }

  public getOrderOverrides(): Record<string, Partial<Order>> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ORDER_OVERRIDES);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  public saveOrderOverrides(overrides: Record<string, Partial<Order>>) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_ORDER_OVERRIDES, JSON.stringify(overrides));
    this.notifyListeners();
  }

  public getDeletedOrderIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DELETED_ORDER_IDS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveDeletedOrderIds(ids: string[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_DELETED_ORDER_IDS, JSON.stringify(ids));
    this.notifyListeners();
  }

  public resetAllAnalyticsCustomizations() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY_CUSTOM_ADJUSTMENTS);
    localStorage.removeItem(STORAGE_KEY_ORDER_OVERRIDES);
    localStorage.removeItem(STORAGE_KEY_DELETED_ORDER_IDS);
    this.logAction('营收报表', 'rollback', '重置并清空所有自定义报表修改与删除', '所有订单与报表已恢复原始出单状态');
    this.notifyListeners();
  }

  /**
   * 首次启动自动建立一个初始化安全快照
   */
  private ensureInitialSnapshot() {
    if (typeof window === 'undefined') return;
    const snapshots = this.getSnapshots();
    if (snapshots.length === 0) {
      this.createSnapshot(
        '系统初始化基准快照 (Baseline)',
        '系统启动时自动建立的原始基准版本，作为最底层的防失联安全兜底'
      );
    }
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb());
  }

  private formatTime(ts: number): string {
    const d = new Date(ts);
    const date = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    return `${date} ${time}`;
  }
}

export const merchantBackupEngine = new MerchantBackupEngine();
