/**
 * 统一流动餐车文字版标准命名与站点规范引擎 (Truck Naming Standard Engine)
 * 解决全系统各端（顶部控制下拉、特许加盟沙箱栏、侧边栏、系统弹窗）餐车名称不一致问题
 */

export interface StandardTruckInfo {
  truckId: string;
  shortLabel: string;     // 简版：01号·旗舰车
  stationName: string;    // 站点名：大悦城南广场
  standardLabel: string;  // 标准版：01号·旗舰车 (大悦城南广场)
  fullLabel: string;      // 完整版：01号·旗舰车 (大悦城南广场 · truck-01)
}

export const CANONICAL_TRUCK_REGISTRY: Record<string, StandardTruckInfo> = {
  'truck-01': {
    truckId: 'truck-01',
    shortLabel: '01号·旗舰车',
    stationName: '大悦城南广场',
    standardLabel: '01号·旗舰车 (大悦城南广场)',
    fullLabel: '01号·旗舰车 (大悦城南广场 · truck-01)'
  },
  'truck-02': {
    truckId: 'truck-02',
    shortLabel: '02号·科技园车',
    stationName: '市北高新站',
    standardLabel: '02号·科技园车 (市北高新站)',
    fullLabel: '02号·科技园车 (市北高新站 · truck-02)'
  },
  'truck-03': {
    truckId: 'truck-03',
    shortLabel: '03号·潮玩站车',
    stationName: '静安摩天轮站',
    standardLabel: '03号·潮玩站车 (静安摩天轮站)',
    fullLabel: '03号·潮玩站车 (静安摩天轮站 · truck-03)'
  },
  'truck-04': {
    truckId: 'truck-04',
    shortLabel: '04号·外滩滨江车',
    stationName: '黄浦滨江观景区',
    standardLabel: '04号·外滩滨江车 (黄浦滨江观景区)',
    fullLabel: '04号·外滩滨江车 (黄浦滨江观景区 · truck-04)'
  },
  'truck-05': {
    truckId: 'truck-05',
    shortLabel: '05号·后备机动车',
    stationName: '中央总厨机动基地',
    standardLabel: '05号·后备机动车 (中央总厨机动基地)',
    fullLabel: '05号·后备机动车 (中央总厨机动基地 · truck-05)'
  }
};

/**
 * 格式化餐车名称文字版方案
 * @param target 可传入餐车 ID 字符串，或含有 truckId/id/truckName 的对象
 * @param format 'short' (01号·旗舰车) | 'standard' (01号·旗舰车 (大悦城南广场)) | 'full' (带truckId)
 */
export function getUnifiedTruckName(
  target: string | { truckId?: string; id?: string; truckName?: string; name?: string } | null | undefined,
  format: 'short' | 'standard' | 'full' = 'standard'
): string {
  if (!target) return '01号·旗舰车 (大悦城南广场)';

  let truckId = '';
  let fallbackName = '';

  if (typeof target === 'string') {
    truckId = target;
  } else {
    truckId = target.truckId || target.id || '';
    fallbackName = target.truckName || target.name || '';
  }

  // 1. 命中官方标准注册表
  if (truckId && CANONICAL_TRUCK_REGISTRY[truckId]) {
    const info = CANONICAL_TRUCK_REGISTRY[truckId];
    if (format === 'short') return info.shortLabel;
    if (format === 'full') return info.fullLabel;
    return info.standardLabel;
  }

  // 2. 处理可能从历史数据中传入的旧格式名称
  if (fallbackName) {
    // 若含有 "01" 或 "01号" 或 "旗舰"
    if (fallbackName.includes('01') || fallbackName.includes('旗舰')) {
      const info = CANONICAL_TRUCK_REGISTRY['truck-01'];
      return format === 'short' ? info.shortLabel : format === 'full' ? info.fullLabel : info.standardLabel;
    }
    if (fallbackName.includes('02') || fallbackName.includes('科技园')) {
      const info = CANONICAL_TRUCK_REGISTRY['truck-02'];
      return format === 'short' ? info.shortLabel : format === 'full' ? info.fullLabel : info.standardLabel;
    }
    if (fallbackName.includes('03') || fallbackName.includes('潮玩')) {
      const info = CANONICAL_TRUCK_REGISTRY['truck-03'];
      return format === 'short' ? info.shortLabel : format === 'full' ? info.fullLabel : info.standardLabel;
    }
    if (fallbackName.includes('04') || fallbackName.includes('外滩') || fallbackName.includes('滨江')) {
      const info = CANONICAL_TRUCK_REGISTRY['truck-04'];
      return format === 'short' ? info.shortLabel : format === 'full' ? info.fullLabel : info.standardLabel;
    }
    if (fallbackName.includes('05') || fallbackName.includes('后备') || fallbackName.includes('机动') || fallbackName.includes('总厨')) {
      const info = CANONICAL_TRUCK_REGISTRY['truck-05'];
      return format === 'short' ? info.shortLabel : format === 'full' ? info.fullLabel : info.standardLabel;
    }

    if (format === 'short') {
      return fallbackName.split(' ')[0] || fallbackName;
    }
    return truckId ? `${fallbackName} (${truckId})` : fallbackName;
  }

  return truckId || '01号·旗舰车';
}
