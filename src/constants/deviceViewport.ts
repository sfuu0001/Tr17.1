/* =========================================================================
 * ⛔ 分辨率与机型基准 —— 两层语义守卫（RESOLUTION LOCK v2）
 * =========================================================================
 * 【第一层 · 默认基准档锁定 —— ⛔ 禁止修改 / DO NOT MODIFY】
 *   客食端（顾客点餐前台）在电脑端的默认显示基准锁定为：
 *     Apple iPhone 15 Pro Max · 逻辑分辨率 430 × 932（CSS px）
 *   即 DEFAULT_DEVICE_ID = 'iphone-15-pro-max' 及 DEVICE_PRESETS 中
 *   该档位的 width/height 数值 —— 任何 AI/开发者修复其他问题时一律不得
 *   改动；确需变更必须获得产品负责人明确授权（2026-09-16 指定）。
 *
 * 【第二层 · 运行时切换是产品特性，不构成对基准的修改】
 *   预览壳容器列支持切换机型 / 自定义分辨率 / 横竖旋转（见 DEVICE_PRESETS
 *   与 CUSTOM_DIM_*），属于产品功能；使用这些能力无需授权。
 *   物理分辨率参考：iPhone 15 Pro Max = 1290 × 2796（@3x，460 ppi）。
 * ========================================================================= */

export interface DevicePreset {
  id: string;
  label: string;
  /** 逻辑宽度（CSS px）—— 竖屏基准 */
  width: number;
  /** 逻辑高度（CSS px）—— 竖屏基准 */
  height: number;
  dpr: number;
}

/** 内置机型档位（逻辑分辨率，竖屏基准） */
export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'iphone-15-pro-max', label: 'iPhone 15 Pro Max', width: 430, height: 932, dpr: 3 }, // ⛔ 默认基准档
  { id: 'iphone-15-pro', label: 'iPhone 15 Pro', width: 402, height: 874, dpr: 3 },
  { id: 'iphone-15', label: 'iPhone 15 / 14', width: 393, height: 852, dpr: 3 },
  { id: 'iphone-se-3', label: 'iPhone SE (3rd)', width: 375, height: 667, dpr: 2 },
  { id: 'pixel-8', label: 'Pixel 8', width: 412, height: 915, dpr: 2.625 },
  { id: 'galaxy-s24', label: 'Galaxy S24', width: 360, height: 780, dpr: 3 }
];

export const DEFAULT_DEVICE_ID = 'iphone-15-pro-max'; // ⛔ 基准档，禁止改动指向
export const CUSTOM_DEVICE_ID = 'custom';

/** 自定义分辨率钳制区间（产品确认：280–1024px） */
export const CUSTOM_DIM_MIN = 280;
export const CUSTOM_DIM_MAX = 1024;

export function clampCustomDim(n: number): number {
  if (isNaN(n)) return CUSTOM_DIM_MIN;
  return Math.min(CUSTOM_DIM_MAX, Math.max(CUSTOM_DIM_MIN, Math.round(n)));
}

export function getDeviceById(id: string): DevicePreset | null {
  return DEVICE_PRESETS.find((d) => d.id === id) ?? null;
}

/** 解析当前预览视口（机型 / 自定义 + 旋转） */
export function resolvePreviewDimensions(
  deviceId: string,
  custom: { width: number; height: number },
  rotated: boolean
): { width: number; height: number; label: string } {
  if (deviceId === CUSTOM_DEVICE_ID) {
    const w = clampCustomDim(custom.width);
    const h = clampCustomDim(custom.height);
    return rotated ? { width: h, height: w, label: `自定义 ${w}×${h}` } : { width: w, height: h, label: `自定义 ${w}×${h}` };
  }
  const preset = getDeviceById(deviceId) ?? getDeviceById(DEFAULT_DEVICE_ID)!;
  return rotated
    ? { width: preset.height, height: preset.width, label: `${preset.label}（横屏）` }
    : { width: preset.width, height: preset.height, label: preset.label };
}

/** 独立访问客食端时的桌面壳判定（≥1024px 出壳） */
export const PHONE_FRAME_MEDIA_QUERY = '(min-width: 1024px)';

/** 电脑端前置判定（排除手机 / 平板触屏设备）—— 预览壳容器仅电脑端生效 */
export const DESKTOP_MEDIA_QUERY = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';

/** 壳容器列宽（含内边距） */
export const PREVIEW_COLUMN_WIDTH = 470;
/** 小视口保护：低于该宽度右栏强制收起并提示 */
export const PREVIEW_MIN_VIEWPORT = 1536;
