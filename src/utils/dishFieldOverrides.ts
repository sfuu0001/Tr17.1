/**
 * 菜品「字段级」本地覆盖层
 * ----------------------------------------------------------------
 * 与 src/utils/dishAvailability.ts (仅 available) 同构。
 *
 * 问题背景：商家在商家端修改菜品字段（名称/价格/描述/图片/分类/规格/排序等）
 * 时，dishes 虽会写入 localStorage(obsidian_truck_dishes)，但每次挂载
 * fetchDishesFromCloud() 在 fromCloud 时会用云端数据整体覆盖本地，而商家
 * 的字段修改从未自动回写云端，于是刷新后改动被还原（"假修改"）。
 *
 * 方案：用一个独立的覆盖层键，记录每道菜被商家改过的字段；在每一次读取
 * 菜品（初始化 / 云端拉取 / 同步总线 / 版本回滚 / cloudbase 落盘前）时，
 * 强制把本地字段合并回去，使商家修改始终优先于云端。
 */
import { safeGetStorage, safeSetStorage } from './safeStorage';
import { DishItem } from '../types';

const OVERRIDE_KEY = 'obsidian_dish_field_overrides';

export type DishFieldOverride = Partial<DishItem>;

export function getDishFieldOverrides(): Record<string, DishFieldOverride> {
  return safeGetStorage<Record<string, DishFieldOverride>>(OVERRIDE_KEY, {});
}

/** 记录某道菜被商家改过的字段（增量合并，available 由 dishAvailability 独占，这里剥离） */
export function setDishFieldOverride(dishId: string, fields: Partial<DishItem>): void {
  if (!dishId) return;
  const map = getDishFieldOverrides();
  const { id: _ignoreId, available: _ignoreAvail, ...rest } = fields as any;
  const prev = map[dishId] || {};
  map[dishId] = { ...prev, ...rest };
  safeSetStorage(OVERRIDE_KEY, map);
}

export function clearDishFieldOverride(dishId: string): void {
  const map = getDishFieldOverrides();
  if (map[dishId]) {
    delete map[dishId];
    safeSetStorage(OVERRIDE_KEY, map);
  }
}

/** 在菜品读取时套用本地字段覆盖（本地商家修改始终优先于云端） */
export function applyDishFieldOverrides(dishes: DishItem[]): DishItem[] {
  if (!dishes || dishes.length === 0) return dishes;
  const map = getDishFieldOverrides();
  if (!map || Object.keys(map).length === 0) return dishes;
  return dishes.map((d) => {
    const ov = map[d.id];
    if (!ov) return d;
    // available 由 dishAvailability 覆盖层负责，这里不参与，避免双重来源
    const { available: _ignore, ...rest } = ov as any;
    return { ...d, ...rest };
  });
}
