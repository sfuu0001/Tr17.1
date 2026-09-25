/**
 * Business Status Engine (餐车营业状态总开关与歇业调度中枢)
 * 
 * 管理流动餐车营业接单总控开关：
 * - 营业中 (接单中) vs 已打烊 (歇业/暂停接单)
 * - 联动前台食客端「已打烊」横幅展示、禁用结算或转为预定
 * - 联动出餐预计等待时长 (打烊时提示暂停出餐)
 * - 跨多标签页与多端 (食客/商家/骑手) 实时广播
 */

import { safeGetStorage, safeSetStorage } from './safeStorage';

export interface BusinessStatusConfig {
  truckId: string; // 所属餐车 ID (如 'truck-01', 'truck-02', 'truck-03')
  isOpen: boolean; // 总开关 (true = 营业中, false = 已打烊/暂停接单)
  statusLabel: string; // 营业中 / 已打烊 / 紧急备料中 / 包场歇业
  closeReason: string; // 歇业原因说明
  reopenTime: string; // 预计恢复营业时间 (如 "明日 11:00" 或 "15分钟后")
  autoAcceptOrders: boolean; // 是否开启自动接单
  allowPreorderWhenClosed: boolean; // 打烊期间是否允许顾客加购预览
  lastToggledAt: string; // 上次状态切换时间
  toggledBy: string; // 操作人员
  dineInOpen: boolean; // 堂食营业开关 (true: 营业接单, false: 暂停堂食)
  deliveryOpen: boolean; // 外卖营业开关 (true: 营业接单, false: 暂停外卖)
  pickupOpen: boolean; // 自提营业开关 (true: 营业接单, false: 暂停自提)
}

export const DEFAULT_TRUCK_BUSINESS_STATUSES: Record<string, BusinessStatusConfig> = {
  'truck-01': {
    truckId: 'truck-01',
    isOpen: true,
    statusLabel: '营业中',
    closeReason: '01号旗舰餐车站台正常营运，主理人炭火现烤现制接单中',
    reopenTime: '正常接单中',
    autoAcceptOrders: true,
    allowPreorderWhenClosed: true,
    lastToggledAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    toggledBy: '01号店长',
    dineInOpen: true,
    deliveryOpen: true,
    pickupOpen: true
  },
  'truck-02': {
    truckId: 'truck-02',
    isOpen: true,
    statusLabel: '营业中',
    closeReason: '02号科技园餐车站台正常营运，专线极速接单中',
    reopenTime: '正常接单中',
    autoAcceptOrders: true,
    allowPreorderWhenClosed: true,
    lastToggledAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    toggledBy: '02号店长',
    dineInOpen: true,
    deliveryOpen: true,
    pickupOpen: true
  },
  'truck-03': {
    truckId: 'truck-03',
    isOpen: true,
    statusLabel: '营业中',
    closeReason: '03号潮玩站餐车站台正常营运，现烤现制接单中',
    reopenTime: '正常接单中',
    autoAcceptOrders: true,
    allowPreorderWhenClosed: true,
    lastToggledAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    toggledBy: '03号店长',
    dineInOpen: true,
    deliveryOpen: true,
    pickupOpen: true
  },
  'truck-04': {
    truckId: 'truck-04',
    isOpen: false,
    statusLabel: '全线打烊',
    closeReason: '04号外滩滨江餐车设备维护保养中',
    reopenTime: '明日 11:00',
    autoAcceptOrders: false,
    allowPreorderWhenClosed: true,
    lastToggledAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    toggledBy: '04号店长',
    dineInOpen: false,
    deliveryOpen: false,
    pickupOpen: false
  },
  'truck-05': {
    truckId: 'truck-05',
    isOpen: true,
    statusLabel: '部分营业',
    closeReason: '05号中央总厨应急机动基地',
    reopenTime: '正常接单中',
    autoAcceptOrders: true,
    allowPreorderWhenClosed: true,
    lastToggledAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    toggledBy: '05号店长',
    dineInOpen: false,
    deliveryOpen: true,
    pickupOpen: true
  }
};

export const DEFAULT_BUSINESS_STATUS: BusinessStatusConfig = DEFAULT_TRUCK_BUSINESS_STATUSES['truck-01'];

const STORAGE_KEY_TRUCK_STATUSES = 'obsidian_truck_business_statuses';
const STORAGE_KEY_BUSINESS_STATUS = 'obsidian_business_status';

/**
 * 获取当前全局或活动餐车 ID
 */
export function getActiveTruckId(): string {
  if (typeof window !== 'undefined') {
    const merchantTruck = safeGetStorage<string>('obsidian_merchant_selected_truck', '');
    if (merchantTruck) return merchantTruck;
    const activeTruck = safeGetStorage<string>('obsidian_active_truck_id', '');
    if (activeTruck) return activeTruck;
  }
  return 'truck-01';
}

/**
 * 获取所有餐车的营业状态字典 (以 truckId 为键)
 */
export function getAllTruckBusinessStatuses(): Record<string, BusinessStatusConfig> {
  const loaded = safeGetStorage<Record<string, Partial<BusinessStatusConfig>>>(STORAGE_KEY_TRUCK_STATUSES, {});
  const legacyGlobal = safeGetStorage<Partial<BusinessStatusConfig>>(STORAGE_KEY_BUSINESS_STATUS, {});

  const result: Record<string, BusinessStatusConfig> = {};
  const allTruckIds = Array.from(new Set([...Object.keys(DEFAULT_TRUCK_BUSINESS_STATUSES), ...Object.keys(loaded)]));

  for (const tid of allTruckIds) {
    const defaultVal: BusinessStatusConfig = DEFAULT_TRUCK_BUSINESS_STATUSES[tid] || {
      truckId: tid,
      isOpen: true,
      statusLabel: '营业中',
      closeReason: `${tid} 餐车站台正常营运中`,
      reopenTime: '正常接单中',
      autoAcceptOrders: true,
      allowPreorderWhenClosed: true,
      lastToggledAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      toggledBy: '餐车店长',
      dineInOpen: true,
      deliveryOpen: true,
      pickupOpen: true
    };

    const truckSaved = loaded[tid] || (tid === 'truck-01' ? legacyGlobal : {});

    result[tid] = {
      ...defaultVal,
      ...truckSaved,
      truckId: tid,
      isOpen: truckSaved.isOpen !== undefined ? Boolean(truckSaved.isOpen) : defaultVal.isOpen,
      dineInOpen: truckSaved.dineInOpen !== undefined ? Boolean(truckSaved.dineInOpen) : defaultVal.dineInOpen,
      deliveryOpen: truckSaved.deliveryOpen !== undefined ? Boolean(truckSaved.deliveryOpen) : defaultVal.deliveryOpen,
      pickupOpen: truckSaved.pickupOpen !== undefined ? Boolean(truckSaved.pickupOpen) : defaultVal.pickupOpen
    };
  }

  return result;
}

/**
 * 获取指定餐车的营业状态 (若未传入 truckId 则返回当前活跃餐车状态)
 */
export function getTruckBusinessStatus(truckId?: string): BusinessStatusConfig {
  const targetId = truckId || getActiveTruckId();
  const all = getAllTruckBusinessStatuses();
  if (all[targetId]) {
    return all[targetId];
  }
  return {
    truckId: targetId,
    isOpen: true,
    statusLabel: '营业中',
    closeReason: '餐车站台正常营运，主理人炭火现烤现制接单中',
    reopenTime: '正常接单中',
    autoAcceptOrders: true,
    allowPreorderWhenClosed: true,
    lastToggledAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    toggledBy: '餐车店长',
    dineInOpen: true,
    deliveryOpen: true,
    pickupOpen: true
  };
}

/**
 * 兼容旧接口：获取当前餐车营业状态
 */
export function getBusinessStatus(truckId?: string): BusinessStatusConfig {
  return getTruckBusinessStatus(truckId);
}

/**
 * 更新指定餐车的营业状态并全网广播
 */
export function setTruckBusinessStatus(
  truckId: string,
  status: Partial<BusinessStatusConfig>,
  operatorName: string = '餐车店长'
): BusinessStatusConfig {
  const all = getAllTruckBusinessStatuses();
  const current = all[truckId] || getTruckBusinessStatus(truckId);

  const updated: BusinessStatusConfig = {
    ...current,
    ...status,
    truckId,
    lastToggledAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    toggledBy: operatorName
  };

  all[truckId] = updated;
  safeSetStorage(STORAGE_KEY_TRUCK_STATUSES, all);

  // 若更新的是当前活跃餐车，同步写入单例兼容键
  if (truckId === getActiveTruckId() || truckId === 'truck-01') {
    safeSetStorage(STORAGE_KEY_BUSINESS_STATUS, updated);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('obsidian_business_status_changed', {
        detail: {
          truckId,
          status: updated,
          allStatuses: all
        }
      })
    );

    // 触发云端异步镜像同步
    import('./cloudbase').then(({ syncBusinessStatusesToCloud }) => {
      syncBusinessStatusesToCloud(all).catch(() => {});
    }).catch(() => {});
  }

  return updated;
}

/**
 * 兼容旧接口：更新当前活跃餐车营业状态
 */
export function setBusinessStatus(
  status: Partial<BusinessStatusConfig>,
  operatorName: string = '餐车店长'
): BusinessStatusConfig {
  const activeId = getActiveTruckId();
  return setTruckBusinessStatus(activeId, status, operatorName);
}

/**
 * 切换指定餐车营业/打烊总开关
 */
export function toggleTruckOperating(
  truckId: string,
  isOpen: boolean,
  reason?: string,
  reopenTime?: string,
  operatorName: string = '餐车店长'
): BusinessStatusConfig {
  return setTruckBusinessStatus(
    truckId,
    {
      isOpen,
      statusLabel: isOpen ? '营业中' : '已打烊 · 暂停接单',
      closeReason: reason || (isOpen ? '已恢复营业，开始全速接单出餐' : '今日已打烊，明日11:00起恢复接单'),
      reopenTime: reopenTime || (isOpen ? '正常营业接单中' : '明日 11:00')
    },
    operatorName
  );
}

/**
 * 兼容旧接口：切换活跃餐车营业/打烊总开关
 */
export function toggleBusinessOperating(
  isOpen: boolean,
  reason?: string,
  reopenTime?: string,
  operatorName: string = '餐车店长'
): BusinessStatusConfig {
  return toggleTruckOperating(getActiveTruckId(), isOpen, reason, reopenTime, operatorName);
}

/**
 * 切换指定餐车 堂食 / 外卖 / 自提 独立渠道营业开关
 */
export function toggleTruckChannelOperating(
  truckId: string,
  channel: 'dine_in' | 'delivery' | 'pickup',
  enabled: boolean,
  operatorName: string = '餐车店长'
): BusinessStatusConfig {
  const patch: Partial<BusinessStatusConfig> = {};
  if (channel === 'dine_in') patch.dineInOpen = enabled;
  if (channel === 'delivery') patch.deliveryOpen = enabled;
  if (channel === 'pickup') patch.pickupOpen = enabled;
  return setTruckBusinessStatus(truckId, patch, operatorName);
}

/**
 * 兼容旧接口：切换当前活跃餐车 堂食 / 外卖 / 自提 独立渠道营业开关
 */
export function toggleChannelOperating(
  channel: 'dine_in' | 'delivery' | 'pickup',
  enabled: boolean,
  operatorName: string = '餐车店长'
): BusinessStatusConfig {
  return toggleTruckChannelOperating(getActiveTruckId(), channel, enabled, operatorName);
}
