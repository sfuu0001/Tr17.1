/**
 * 店铺/餐车信息（truck）本地持久化
 * ----------------------------------------------------------------
 * 问题背景：商家在商家端修改餐车停靠点 / 店铺信息（truck）时，truck state
 * 初始化来自常量 INITIAL_TRUCK_INFO，且全文从未写回 localStorage，于是
 * 任何修改刷新后即还原（"假修改"）。
 *
 * 方案：用独立键 obsidian_truck_info 承载商家本地修改；App 初始化从本地
 * 读取，每次变更写回，使修改在刷新后保留。
 */
import { safeGetStorage, safeSetStorage } from './safeStorage';
import { TruckInfo } from '../types';
import { INITIAL_TRUCK_INFO } from '../data/mockData';

const TRUCK_INFO_KEY = 'obsidian_truck_info';

export function getTruckInfo(): TruckInfo {
  const info = safeGetStorage<TruckInfo>(TRUCK_INFO_KEY, INITIAL_TRUCK_INFO);
  if (!info.latitude || !info.longitude) {
    info.latitude = INITIAL_TRUCK_INFO.latitude ?? 31.2435;
    info.longitude = INITIAL_TRUCK_INFO.longitude ?? 121.4690;
  }
  return info;
}

export function saveTruckInfo(truck: TruckInfo): void {
  if (!truck) return;
  safeSetStorage(TRUCK_INFO_KEY, truck);
}
