import { safeGetStorage, safeSetStorage } from './safeStorage';

/**
 * 商家端「沽清 / 上架」及各渠道（外卖 / 堂食 / 自提）持久化覆盖层。
 *
 * 菜品 `available` 字段既可能被云端数据覆盖（每次挂载都会从云拉取菜单），
 * 也会被本地版本回滚引擎重写本地 `obsidian_truck_dishes`。
 * 因此把商家对「在售 / 沽清 / 渠道通售」的修改单独存进本地安全存储：
 * - `obsidian_dish_availability_overrides`: 全局在售开关映射
 * - `obsidian_dish_channel_overrides`: 外卖/堂食/自提渠道独立供售状态
 * 并在每一次从云端 / 本地读取菜品时强制套用，确保刷新页面后不被云端数据冲掉。
 */

const OVERRIDE_KEY = 'obsidian_dish_availability_overrides';
const CHANNEL_OVERRIDE_KEY = 'obsidian_dish_channel_overrides';

export type AvailabilityOverrideMap = Record<string, boolean>;

export interface DishChannelStatus {
  delivery: boolean;
  dineIn: boolean;
  pickup: boolean;
}

export const DEFAULT_CHANNEL_OVERRIDES: Record<string, DishChannelStatus> = {
  'dish-1': { dineIn: true, delivery: true, pickup: true },
  'dish-2': { dineIn: true, delivery: false, pickup: false },
  'dish-3': { dineIn: true, delivery: true, pickup: true },
  'dish-4': { dineIn: true, delivery: true, pickup: true },
  'dish-5': { dineIn: true, delivery: true, pickup: true },
  'dish-6': { dineIn: true, delivery: true, pickup: true },
  'dish-7': { dineIn: true, delivery: true, pickup: true },
  'dish-8': { dineIn: true, delivery: true, pickup: true },
  'dish-pos-1': { dineIn: true, delivery: true, pickup: true },
  'dish-pos-2': { dineIn: true, delivery: true, pickup: true },
  'dish-pos-3': { dineIn: true, delivery: true, pickup: true },
  'dish-pos-4': { dineIn: true, delivery: true, pickup: true }
};

export function getAvailabilityOverrides(): AvailabilityOverrideMap {
  return safeGetStorage<AvailabilityOverrideMap>(OVERRIDE_KEY, {});
}

export function setAvailabilityOverride(dishId: string, available: boolean): void {
  if (!dishId) return;
  const map = getAvailabilityOverrides();
  map[dishId] = available;
  safeSetStorage(OVERRIDE_KEY, map);
}

export function getChannelOverrides(): Record<string, DishChannelStatus> {
  return safeGetStorage<Record<string, DishChannelStatus>>(CHANNEL_OVERRIDE_KEY, DEFAULT_CHANNEL_OVERRIDES);
}

export function setChannelOverride(dishId: string, status: DishChannelStatus): void {
  if (!dishId) return;
  const map = getChannelOverrides();
  map[dishId] = status;
  safeSetStorage(CHANNEL_OVERRIDE_KEY, map);

  // 保持全局 available 同步：只要任意渠道开启即为全局在售
  const isAnyActive = status.delivery || status.dineIn || status.pickup;
  setAvailabilityOverride(dishId, isAnyActive);
}

export function setChannelOverridesBulk(overrides: Record<string, DishChannelStatus>): void {
  const map = getChannelOverrides();
  const availMap = getAvailabilityOverrides();
  for (const [id, status] of Object.entries(overrides)) {
    map[id] = status;
    availMap[id] = status.delivery || status.dineIn || status.pickup;
  }
  safeSetStorage(CHANNEL_OVERRIDE_KEY, map);
  safeSetStorage(OVERRIDE_KEY, availMap);
}

/**
 * 校验指定菜品在目标渠道（外卖 / 堂食 / 自提）是否处于在售状态
 */
export function isDishAvailableInChannel(
  dish: { id: string; available?: boolean; orderType?: string },
  channel?: 'delivery' | 'dine_in' | 'pickup' | 'all' | string
): boolean {
  if (!dish) return false;
  const channelMap = getChannelOverrides();
  const override = channelMap[dish.id];

  if (override) {
    if (channel === 'delivery') return Boolean(override.delivery);
    if (channel === 'dine_in') return Boolean(override.dineIn);
    if (channel === 'pickup') return Boolean(override.pickup);
    return Boolean(override.delivery || override.dineIn || override.pickup);
  }

  // 若无渠道覆盖，按 dish 自身属性回退
  if (dish.available === false) return false;
  if (channel === 'delivery' && dish.orderType === 'dine_in') return false;
  if (channel === 'dine_in' && dish.orderType === 'delivery') return false;
  return true;
}

/** 把本地「沽清 / 上架」及渠道覆盖套用到菜品列表上（本地修改优先于云端）。 */
export function applyAvailabilityOverrides<T extends { id: string; available?: boolean }>(
  dishes: T[]
): T[] {
  if (!dishes || dishes.length === 0) return dishes;
  const map = getAvailabilityOverrides();
  const channelMap = getChannelOverrides();

  let changed = false;
  const next = dishes.map((d) => {
    let targetAvail = d.available;
    if (channelMap[d.id]) {
      const ch = channelMap[d.id];
      targetAvail = ch.delivery || ch.dineIn || ch.pickup;
    } else if (Object.prototype.hasOwnProperty.call(map, d.id)) {
      targetAvail = map[d.id];
    } else if (['dish-1', 'dish-2', 'dish-3', 'dish-4', 'dish-5', 'dish-6', 'dish-7', 'dish-8', 'dish-pos-1', 'dish-pos-2', 'dish-pos-3', 'dish-pos-4'].includes(d.id)) {
      // 默认核心招牌菜品未被手动沽清时默认为在售
      targetAvail = true;
    }

    if (targetAvail !== d.available) {
      changed = true;
      return { ...d, available: targetAvail };
    }
    return d;
  });
  return changed ? next : dishes;
}

