/**
 * 高德地图 (AMap) 与数字孪生沙盘坐标投影转换及上海真实点位基准
 * 坐标系统：GCJ-02 (国家测绘局火星坐标系)
 * 基准区域：上海静安、黄浦、苏河湾、浦东核心商圈
 */

// 转换基准点 (上海市中心商圈矩形包围盒)
const BASE_LNG_MIN = 121.4350;
const BASE_LNG_MAX = 121.5650; // 跨度 ~0.13度 (约 13km)
const BASE_LAT_MIN = 31.1980;
const BASE_LAT_MAX = 31.2680; // 跨度 ~0.07度 (约 7.7km)
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

/**
 * 屏幕/沙盘坐标 (x, y) 转为 高德 GCJ-02 [经度 lng, 纬度 lat]
 */
export function canvasToLngLat(coords: { x: number; y: number }): [number, number] {
  const lng = BASE_LNG_MIN + (coords.x / CANVAS_WIDTH) * (BASE_LNG_MAX - BASE_LNG_MIN);
  const lat = BASE_LAT_MAX - (coords.y / CANVAS_HEIGHT) * (BASE_LAT_MAX - BASE_LAT_MIN);
  return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
}

/**
 * 高德 GCJ-02 [lng, lat] 转为 屏幕/沙盘坐标 (x, y)
 */
export function lngLatToCanvas(lngLat: [number, number]): { x: number; y: number } {
  const [lng, lat] = lngLat;
  const x = Math.round(((lng - BASE_LNG_MIN) / (BASE_LNG_MAX - BASE_LNG_MIN)) * CANVAS_WIDTH);
  const y = Math.round(((BASE_LAT_MAX - lat) / (BASE_LAT_MAX - BASE_LAT_MIN)) * CANVAS_HEIGHT);
  return { x, y };
}

/**
 * 网格多边形坐标字符串 "x1,y1 x2,y2 ..." 转换为高德 Polygon 经纬度数组
 */
export function polygonPointsToLngLats(pointsStr: string): [number, number][] {
  const pairs = pointsStr.trim().split(/\s+/);
  return pairs.map((p) => {
    const [xStr, yStr] = p.split(',');
    return canvasToLngLat({ x: parseFloat(xStr) || 0, y: parseFloat(yStr) || 0 });
  });
}

/**
 * 高德黑白极简纯白官方定制底图样式
 * 抑制刺眼色彩，强化路网、建筑轮廓与水系高对比黑白灰阶
 */
export const AMAP_MONOCHROME_WHITE_STYLE = 'amap://styles/whitesmoke';

/**
 * 统一空间比例尺常量 (米 / 像素)
 * 基准：1920px 跨度对应上海经度 0.13度 (约 12.5km)，即 12500m / 1920px ≈ 6.5 米/像素
 * 供沙盘测距工具、辐射圈半径绘制与高德经纬度投影统一调用
 */
export const M_PER_PX = 6.5;

// 高德备用演示 Key (默认留空以采用高帧率极速数字孪生矢量沙盘，用户可按需填入其高德开放平台合法Key)
export const DEFAULT_AMAP_KEY = '';
export const DEFAULT_AMAP_SECURITY = '';
