import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  MapPin,
  Crosshair,
  LocateFixed,
  Loader2,
  Lock,
  Unlock,
  Plus,
  Minus,
  Navigation,
  Maximize2,
  Radio,
  Sparkles
} from 'lucide-react';
import {
  requestBrowserGeolocation,
  reverseGeocodeCoordinate,
  TruckLocationConfig,
  getTruckTheme,
  calculateFleetBounds,
  calculateRadarCoverage,
  TruckThemeConfig
} from '../../utils/truckLocationEngine';

declare global {
  interface Window {
    L: any;
  }
}

const TILE_AMAP = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}';
const TILE_FALLBACK = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * 档位半径快捷映射
 */
function getNearestTier(radius: number): number {
  if (radius <= 1.8) return 1;
  if (radius <= 4.0) return 3;
  if (radius <= 6.5) return 5;
  return 8;
}

/**
 * 生成高精无偏移雷达标记与锚点图标
 * 关键架构：iconSize: [0, 0], iconAnchor: [0, 0]
 * 保证 (0, 0) 精确对应经纬度坐标，所有同心圆、雷达扫波、准星中心以绝对定位居中，彻底消除任何位移与视口偏移！
 */
function buildDynamicRadarMarkerIcon(
  L: any,
  truck: TruckLocationConfig,
  isCurrent: boolean,
  isLocked: boolean
) {
  // 当主控餐车处于未锁定（编辑定点）状态时，地图上的图钉完全隐匿，由屏幕中心的绝对动态准星接管，防止双重重影或位移分叉
  if (isCurrent && !isLocked) {
    return L.divIcon({
      className: 'dynamic-radar-leaflet-node-hidden',
      html: '<div style="display:none;"></div>',
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
  }

  const theme = getTruckTheme(truck.id);
  const displayName = truck.name.replace(/黑曜石\s*/, '').replace(/流动餐车/, '');

  const html = `
    <div style="position: absolute; left: 0; top: 0; pointer-events: auto; user-select: none;" data-truck-id="${truck.id}">
      <!-- 1. 同心雷达声呐扩散波 (以 0,0 为绝对中心) -->
      ${
        isCurrent
          ? `
        <div class="radar-sonar-wave-1" style="position: absolute; left: 0; top: 0; width: 96px; height: 96px; border-radius: 50%; border: 1.5px solid ${theme.color}; pointer-events: none;"></div>
        <div class="radar-sonar-wave-2" style="position: absolute; left: 0; top: 0; width: 96px; height: 96px; border-radius: 50%; border: 1.5px solid ${theme.color}; pointer-events: none;"></div>
        <div class="radar-sonar-wave-3" style="position: absolute; left: 0; top: 0; width: 96px; height: 96px; border-radius: 50%; border: 1.5px solid ${theme.color}; pointer-events: none;"></div>
      `
          : `
        <div class="radar-sonar-wave-1" style="position: absolute; left: 0; top: 0; width: 68px; height: 68px; border-radius: 50%; border: 1.2px solid ${theme.color}; opacity: 0.65; pointer-events: none;"></div>
      `
      }

      <!-- 2. 360° 连续旋转雷达扫描光束 (以 0,0 为绝对旋转轴心) -->
      ${
        isCurrent
          ? `
        <div class="radar-sweep-beam" style="position: absolute; left: 0; top: 0; width: 110px; height: 110px; margin-left: -55px; margin-top: -55px; border-radius: 50%; background: ${theme.radarSweepGradient}; pointer-events: none; border: 1px dashed ${theme.color}45;">
          <div style="position: absolute; top: 50%; left: 50%; width: 55px; height: 1.5px; background: linear-gradient(to right, ${theme.color}, transparent); transform-origin: left center;"></div>
        </div>
      `
          : ''
      }

      <!-- 3. 正北/东西十字极坐标基准准星刻度 -->
      <div style="position: absolute; left: -14px; top: 0; width: 28px; height: 1px; background: ${theme.color}70; pointer-events: none;"></div>
      <div style="position: absolute; left: 0; top: -14px; width: 1px; height: 28px; background: ${theme.color}70; pointer-events: none;"></div>

      <!-- 4. 中心发光 RTK 定位锚点核心 (严格以 0,0 居中) -->
      <div style="position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); cursor: pointer;">
        <div class="radar-core-ping" style="width: 24px; height: 24px; border-radius: 50%; background: #0f172a; border: 2.5px solid #ffffff; box-shadow: 0 0 16px ${theme.glowColor}; display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${theme.color};"></div>
        </div>
      </div>

      <!-- 5. 车辆身份铭牌标签 (严格向上悬浮，永不干扰 0,0 几何中心) -->
      <div style="position: absolute; left: 0; top: -20px; transform: translate(-50%, -100%); pointer-events: auto; white-space: nowrap; cursor: pointer;">
        <div style="padding: 2.5px 8px; border-radius: 8px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(6px); border: 1.5px solid ${isCurrent ? theme.color : 'rgba(255,255,255,0.2)'}; box-shadow: 0 4px 14px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 5px;">
          <span style="display: inline-block; width: 6.5px; height: 6.5px; border-radius: 50%; background: ${theme.color}; box-shadow: 0 0 8px ${theme.color};"></span>
          <span style="font-size: 10.5px; font-weight: 800; color: #ffffff; font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.02em;">${theme.num}号车</span>
          <span style="font-size: 9.5px; color: ${theme.color}; font-weight: 700;">${displayName}</span>
          ${isCurrent ? `<span style="font-size: 9px; padding: 0.5px 4px; border-radius: 4px; background: ${theme.color}25; color: ${theme.color}; font-weight: 700;">主控</span>` : ''}
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'dynamic-radar-leaflet-node',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
}

interface TruckLocationMapPickerProps {
  truckId?: string;
  initialLat: number;
  initialLng: number;
  radiusKm: number;
  locked?: boolean;
  truckName?: string;
  allTrucks?: TruckLocationConfig[];
  onPositionChange: (lat: number, lng: number) => void;
  onAddressChange?: (name: string, detail?: string) => void;
  onRadiusChange?: (km: number) => void;
  onToggleLock?: () => void;
  onSelectTruck?: (truckId: string) => void;
  flyToTarget?: { lat: number; lng: number; seq: number };
}

export const TruckLocationMapPicker: React.FC<TruckLocationMapPickerProps> = ({
  truckId = 'truck-01',
  initialLat,
  initialLng,
  radiusKm,
  locked = true,
  truckName = '黑曜石 01号流动餐车',
  allTrucks = [],
  onPositionChange,
  onAddressChange,
  onRadiusChange,
  onToggleLock,
  onSelectTruck,
  flyToTarget
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const radiusRef = useRef<any>(null);
  const truckMarkerRef = useRef<any>(null);
  const fleetMarkersGroupRef = useRef<any>(null);
  const fleetCirclesGroupRef = useRef<any>(null);
  const reverseTimer = useRef<number | null>(null);
  const reverseSeq = useRef(0);

  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const onPosRef = useRef(onPositionChange);
  const onAddrRef = useRef(onAddressChange);
  const onSelectTruckRef = useRef(onSelectTruck);
  onPosRef.current = onPositionChange;
  onAddrRef.current = onAddressChange;
  onSelectTruckRef.current = onSelectTruck;

  const [status, setStatus] = useState<'loading' | 'ready' | 'fail'>('loading');
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [isFleetOverviewActive, setIsFleetOverviewActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentTheme = getTruckTheme(truckId);
  const nearestTier = getNearestTier(radiusKm);
  const coverageMetrics = calculateRadarCoverage(radiusKm);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // 逆地理编码防抖
  const reverseCenter = useCallback((la: number, ln: number, writeback = true) => {
    const seq = ++reverseSeq.current;
    if (reverseTimer.current) window.clearTimeout(reverseTimer.current);
    reverseTimer.current = window.setTimeout(async () => {
      const res = await reverseGeocodeCoordinate(la, ln);
      if (reverseSeq.current !== seq) return;
      if (res && writeback) {
        onAddrRef.current?.(res.locationName, res.addressDetail);
      }
    }, 250);
  }, []);

  // 同步候选坐标
  const syncCandidate = useCallback(
    (la: number, ln: number, opts?: { reverse?: boolean }) => {
      setLat(la);
      setLng(ln);
      onPosRef.current(la, ln);
      if (radiusRef.current) {
        radiusRef.current.setLatLng([la, ln]);
      }
      if (truckMarkerRef.current) {
        truckMarkerRef.current.setLatLng([la, ln]);
      }
      if (opts?.reverse !== false) {
        reverseCenter(la, ln);
      }
    },
    [reverseCenter]
  );

  // 刷新车队所有图层与标记（车队全览模式或餐车配置变动时触发）
  const refreshFleetLayers = useCallback(
    (activeOverview: boolean) => {
      if (!mapRef.current || !window.L) return;
      const L = window.L;
      const markersGroup = fleetMarkersGroupRef.current;
      const circlesGroup = fleetCirclesGroupRef.current;
      if (!markersGroup || !circlesGroup) return;

      markersGroup.clearLayers();
      circlesGroup.clearLayers();

      if (!activeOverview || allTrucks.length === 0) return;

      allTrucks.forEach((t) => {
        const isCur = t.id === truckId;
        const theme = getTruckTheme(t.id);
        const pt = L.latLng(t.latitude, t.longitude);

        // 1. 各餐车专属色彩独立雷达围栏圈
        const c = L.circle(pt, {
          radius: (t.deliveryRadiusKm || 3.0) * 1000,
          color: theme.radarBorder,
          weight: isCur ? 2.2 : 1.4,
          dashArray: isCur ? '5 5' : '4 4',
          fillColor: theme.radarFill,
          fillOpacity: isCur ? 0.16 : 0.08
        });
        circlesGroup.addLayer(c);

        // 2. 各餐车专属色彩动态雷达标记与锚点
        const m = L.marker(pt, {
          icon: buildDynamicRadarMarkerIcon(L, t, isCur, lockedRef.current),
          interactive: true
        });

        m.on('click', () => {
          onSelectTruckRef.current?.(t.id);
          triggerToast(`已切换至【${theme.themeTitle}】`);
        });

        markersGroup.addLayer(m);
      });
    },
    [allTrucks, truckId]
  );

  // 初始化地图
  useEffect(() => {
    let cancelled = false;
    const deadline = Date.now() + 8000;

    const start = () => {
      if (cancelled) return;
      if (!window.L || !containerRef.current) {
        if (Date.now() > deadline) {
          setStatus('fail');
          return;
        }
        setTimeout(start, 150);
        return;
      }
      if (mapRef.current) return;

      const L = window.L;
      const map = L.map(containerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true
      });
      mapRef.current = map;

      // 高德中文瓦片 (极简平铺渲染，去除2D/3D杂乱建筑模型)
      const amap = L.tileLayer(TILE_AMAP, {
        maxZoom: 18,
        subdomains: '1234',
        className: 'minimal-flat-map-tile'
      }).addTo(map);

      (amap as any).on('tileerror', () => {
        if (!(map as any)._tileSwapped) {
          (map as any)._tileSwapped = true;
          map.removeLayer(amap);
          L.tileLayer(TILE_FALLBACK, { maxZoom: 19, subdomains: 'abc', className: 'minimal-flat-map-tile' }).addTo(map);
        }
      });

      // 全车队围栏圈层与标记层
      fleetCirclesGroupRef.current = L.layerGroup().addTo(map);
      fleetMarkersGroupRef.current = L.layerGroup().addTo(map);

      // 当前主控餐车配送雷达圈 (L.circle 严格同轴居中)
      radiusRef.current = L.circle([initialLat, initialLng], {
        radius: radiusKm * 1000,
        color: currentTheme.radarBorder,
        weight: 2,
        dashArray: '6 6',
        fillColor: currentTheme.radarFill,
        fillOpacity: 0.14
      }).addTo(map);

      // 当前主控餐车雷达动态锚点标记 (iconAnchor [0, 0] 绝对同轴对齐)
      const currentTruckMock: TruckLocationConfig = {
        id: truckId,
        name: truckName,
        code: 'OBSIDIAN-ALPHA',
        locationName: '',
        latitude: initialLat,
        longitude: initialLng,
        deliveryRadiusKm: radiusKm,
        status: 'open'
      };

      truckMarkerRef.current = L.marker([initialLat, initialLng], {
        icon: buildDynamicRadarMarkerIcon(L, currentTruckMock, true, lockedRef.current),
        interactive: false
      }).addTo(map);

      // 地图拖动监听 (编辑模式同步候选坐标与雷达圈实时跟随)
      let settleTimer: number | null = null;
      map.on('move', () => {
        if (lockedRef.current) return;
        const c = map.getCenter();
        if (radiusRef.current) {
          radiusRef.current.setLatLng(c);
        }
      });
      map.on('moveend', () => {
        const c = map.getCenter();
        if (lockedRef.current) return;
        if (settleTimer) window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
          syncCandidate(c.lat, c.lng);
        }, 120);
      });

      map.on('click', (e: any) => {
        if (lockedRef.current) {
          triggerToast('🔒 当前位置已锁定（防误触保护），请点击右上角挂锁解锁后拖动或选点');
          return;
        }
        map.panTo(e.latlng, { animate: true, duration: 0.35 });
      });

      setStatus('ready');
      setTimeout(() => map.invalidateSize(), 200);

      // 初始反查
      reverseCenter(initialLat, initialLng, !lockedRef.current);
    };

    start();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
      }
      truckMarkerRef.current = null;
      radiusRef.current = null;
      fleetCirclesGroupRef.current = null;
      fleetMarkersGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当外部餐车 ID 或主题配色更新时，动态重构主控锚点与雷达圈
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    // 更新雷达圈色彩
    if (radiusRef.current) {
      try {
        radiusRef.current.setRadius(radiusKm * 1000);
        radiusRef.current.setStyle({
          color: currentTheme.radarBorder,
          fillColor: currentTheme.radarFill
        });
      } catch {}
    }

    // 更新当前标记
    if (truckMarkerRef.current && (truckMarkerRef.current as any)._map && truckMarkerRef.current.getElement()) {
      try {
        const activeTruck = allTrucks.find((t) => t.id === truckId) || {
          id: truckId,
          name: truckName,
          code: 'OBSIDIAN',
          locationName: '',
          latitude: lat,
          longitude: lng,
          deliveryRadiusKm: radiusKm,
          status: 'open' as const
        };
        truckMarkerRef.current.setIcon(
          buildDynamicRadarMarkerIcon(L, activeTruck, true, locked)
        );
      } catch {}
    }

    // 若车队全览开启，同步刷新车队层
    if (isFleetOverviewActive) {
      refreshFleetLayers(true);
    }
  }, [truckId, radiusKm, currentTheme, truckName, locked, lat, lng, isFleetOverviewActive, allTrucks, refreshFleetLayers]);

  // 600ms 平滑缓动过渡标记点 (Cubic-Bezier 缓动插值)
  const animateMarkerTransition = (toLat: number, toLng: number, duration = 600) => {
    if (!truckMarkerRef.current) return;
    const currentLatLng = truckMarkerRef.current.getLatLng();
    const fromLat = currentLatLng ? currentLatLng.lat : lat;
    const fromLng = currentLatLng ? currentLatLng.lng : lng;

    if (Math.abs(fromLat - toLat) < 0.00001 && Math.abs(fromLng - toLng) < 0.00001) {
      truckMarkerRef.current.setLatLng([toLat, toLng]);
      if (radiusRef.current) radiusRef.current.setLatLng([toLat, toLng]);
      return;
    }

    const startTime = performance.now();
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeInOutCubic 曲线
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const curLat = fromLat + (toLat - fromLat) * ease;
      const curLng = fromLng + (toLng - fromLng) * ease;

      try {
        if (truckMarkerRef.current) {
          truckMarkerRef.current.setLatLng([curLat, curLng]);
        }
        if (radiusRef.current) {
          radiusRef.current.setLatLng([curLat, curLng]);
        }
      } catch {}

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };

  // 外部目标平滑飞达 (如切换餐车、搜索或选择快捷商圈)
  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return;
    if (!flyToTarget.lat || !flyToTarget.lng) return;

    try {
      mapRef.current.flyTo([flyToTarget.lat, flyToTarget.lng], 16, {
        animate: true,
        duration: 0.6
      });
    } catch {}

    animateMarkerTransition(flyToTarget.lat, flyToTarget.lng, 600);

    if (!lockedRef.current) {
      syncCandidate(flyToTarget.lat, flyToTarget.lng);
    } else {
      setLat(flyToTarget.lat);
      setLng(flyToTarget.lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToTarget?.seq]);

  // 锁定模式切换时标记显示与准星接管
  useEffect(() => {
    if (!truckMarkerRef.current || !mapRef.current) return;
    if (locked) {
      truckMarkerRef.current.setLatLng([lat, lng]);
      truckMarkerRef.current.setOpacity(1);
    } else {
      // 编辑模式下中心准星由屏幕中心绝对层无偏移接管
      truckMarkerRef.current.setOpacity(0);
    }
  }, [locked, lat, lng]);

  /**
   * 全城车队视野切换（利用高精度外包围盒计算引擎 calculateFleetBounds）
   * 彻底根除视觉效果偏移：利用计算中心与对称内边距，使锚点和雷达中心在视口内保持完美同轴居中！
   */
  const toggleFleetOverview = () => {
    if (!mapRef.current || !window.L) return;
    const nextState = !isFleetOverviewActive;
    setIsFleetOverviewActive(nextState);

    const map = mapRef.current;

    if (nextState && allTrucks.length > 0) {
      refreshFleetLayers(true);

      // 调用计算引擎获取精确外包围盒与中心
      const fleetBoundsResult = calculateFleetBounds(allTrucks);

      // 使用计算好的全局包围盒平滑缩放，预留均匀四周 Padding
      map.fitBounds(fleetBoundsResult.bounds, {
        padding: [64, 64],
        animate: true,
        duration: 0.85
      });

      triggerToast(`已启用车队全景雷达（全城 ${allTrucks.length} 辆餐车覆盖跨度约 ${fleetBoundsResult.spanKm}km）`);
    } else {
      refreshFleetLayers(false);
      // 平滑切回聚焦当前主控餐车
      map.flyTo([lat, lng], 16, { animate: true, duration: 0.65 });
      triggerToast(`已聚焦【${currentTheme.themeTitle}】主机位`);
    }
  };

  // 地图缩放与居中定位
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const handleLocateCurrent = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([lat, lng], 16, { animate: true, duration: 0.6 });
    triggerToast(`视角已重置回【${currentTheme.themeTitle}】锚点中心 (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  };

  const handleBrowserGps = async () => {
    if (lockedRef.current) {
      triggerToast('当前为查看模式，如需使用 GPS 定位请先解锁编辑');
      return;
    }
    triggerToast('正在请求高精车载 RTK / 浏览器定位...');
    const res = await requestBrowserGeolocation();
    if (res.success && res.latitude && mapRef.current) {
      mapRef.current.flyTo([res.latitude, res.longitude], 17, { animate: true, duration: 0.8 });
      syncCandidate(res.latitude, res.longitude);
      triggerToast(`已同步定位到当前位置，精度 ±${Math.round(res.accuracy || 20)}m`);
    } else {
      triggerToast(res.error || '定位失败，请使用搜索框输入地址定位');
    }
  };

  return (
    <div className="relative w-full h-full min-h-[520px] bg-slate-100 overflow-hidden select-none">
      {/* 1. 地图渲染容器 */}
      <div ref={containerRef} className="w-full h-full absolute inset-0 z-0" />

      {/* 2. 地图加载状态遮罩 */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-xs z-[500]">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
            <span className="text-xs font-bold text-slate-800">正在加载高德卫星图层与雷达计算引擎…</span>
          </div>
        </div>
      )}

      {/* 3. 左上方当前餐车专属雷达胶囊 (包含独立主题色彩指示) */}
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5 flex-wrap pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm rounded-full px-2.5 py-1 flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full animate-pulse shadow-xs"
            style={{ backgroundColor: currentTheme.color }}
          />
          <span className="font-bold text-[11px] text-slate-900 tracking-tight">
            {currentTheme.num}号车
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-[10.5px] font-mono text-slate-700 font-semibold tracking-tight">
            {lat.toFixed(4)}°, {lng.toFixed(4)}°
          </span>
          <span className="text-slate-300">|</span>
          {locked ? (
            <Lock className="w-3 h-3 text-amber-600" />
          ) : (
            <Unlock className="w-3 h-3 text-emerald-600" />
          )}
        </div>

        {/* 雷达辐射面积遥测微标 */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-full px-2 py-1 text-[10px] text-slate-600 flex items-center gap-1">
          <Radio className="w-3 h-3 text-slate-500" />
          <span>{radiusKm.toFixed(1)}km 雷达</span>
          <span className="text-slate-400">({coverageMetrics.areaKm2}km²)</span>
        </div>

        {/* GPS 卫星/基准收敛微标 */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-full px-2 py-1 text-[10px] text-slate-700 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>静安大悦城基准 (±15m)</span>
        </div>
      </div>

      {/* 4. 右上方缩放与全览操作栏 (纯图标按钮) */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-float flex flex-col overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 border-b border-slate-100 transition-colors cursor-pointer"
            title="放大"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 border-b border-slate-100 transition-colors cursor-pointer"
            title="缩小"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleLocateCurrent}
            className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 active:bg-slate-200 border-b border-slate-100 transition-colors cursor-pointer"
            title={`聚焦 ${currentTheme.themeTitle}`}
          >
            <Navigation className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleFleetOverview}
            className={`w-8 h-8 flex items-center justify-center transition-all cursor-pointer ${
              isFleetOverviewActive
                ? 'bg-slate-900 text-emerald-400 hover:bg-slate-800'
                : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/70'
            }`}
            title={isFleetOverviewActive ? '退出车队全览' : '全城车队全览'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {!locked && (
          <button
            type="button"
            onClick={handleBrowserGps}
            className="w-8 h-8 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-float flex items-center justify-center text-emerald-700 hover:bg-emerald-50 active:bg-slate-200 transition-all cursor-pointer"
            title="GPS 实时定位"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ============================================================
       * 5. 编辑模式绝对同轴居中准星与悬浮控制岛 (Zero Visual Offset)
       * 关键点：绝对锚定于 top-1/2 left-1/2 (0, 0)，准星中心与 map.getCenter()
       * 保持 100.00% 像素级吻合，控制浮岛置于其上方，绝不产生高度偏移！
       * ============================================================ */}
      {!locked && (
        <div className="absolute top-1/2 left-1/2 pointer-events-none z-[450]">
          {/* 准星中心同轴动态雷达扫波与声呐圈 (以 0,0 为绝对原点，所有层级绝对同轴居中) */}
          <div className="absolute top-0 left-0 pointer-events-none">
            {/* 360° 雷达扫光 */}
            <div
              className="radar-sweep-beam absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{
                width: '120px',
                height: '120px',
                background: currentTheme.radarSweepGradient,
                border: `1px dashed ${currentTheme.color}60`
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '60px',
                  height: '1.5px',
                  background: `linear-gradient(to right, ${currentTheme.color}, transparent)`,
                  transformOrigin: 'left center'
                }}
              />
            </div>

            {/* 声呐扩散波 */}
            <div
              className="radar-sonar-wave-1 absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{ width: '90px', height: '90px', border: `1.5px solid ${currentTheme.color}` }}
            />
            <div
              className="radar-sonar-wave-2 absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{ width: '90px', height: '90px', border: `1.5px solid ${currentTheme.color}` }}
            />

            {/* 中心极坐标刻度线 */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-[1.5px] pointer-events-none"
              style={{ backgroundColor: `${currentTheme.color}` }}
            />
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 h-8 w-[1.5px] pointer-events-none"
              style={{ backgroundColor: `${currentTheme.color}` }}
            />

            {/* 物理中心精准水滴准星核心 */}
            <div
              className="radar-core-ping absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shadow-2xl border-2 pointer-events-none"
              style={{ borderColor: currentTheme.color, boxShadow: `0 0 16px ${currentTheme.glowColor}` }}
            >
              <Crosshair className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* 悬浮控制浮岛：严格向上浮动 bottom-8，绝对不挤占中心点位置 */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto select-none">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl p-1.5 flex flex-col gap-1 min-w-[130px]">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10.5px] font-bold">
                  <span
                    className="w-2 h-2 rounded-full animate-pulse shadow-xs"
                    style={{ backgroundColor: currentTheme.color }}
                  />
                  <span>{currentTheme.num}号车 · 准星定点</span>
                </div>
                {onToggleLock && (
                  <button
                    type="button"
                    onClick={onToggleLock}
                    className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 cursor-pointer"
                    title="完成锁定"
                  >
                    <Unlock className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* 快捷档位纯数字按钮 */}
              {onRadiusChange && (
                <div className="flex items-center justify-between gap-1 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/60">
                  {[1, 3, 5, 8].map((tier) => {
                    const isCur = nearestTier === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => onRadiusChange(tier)}
                        className={`flex-1 h-6 rounded-md flex items-center justify-center text-[10px] font-bold font-mono transition-all cursor-pointer ${
                          isCur
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-white hover:text-slate-900'
                        }`}
                        style={isCur ? { color: currentTheme.color, boxShadow: `0 0 6px ${currentTheme.glowColor}` } : {}}
                        title={`切换为 ${tier}.0 km 雷达半径`}
                      >
                        {tier}k
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. 锁定模式悬浮保护徽标 */}
      {locked && (
        <div className="absolute bottom-3 left-3 z-[400] pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-amber-300 text-[10.5px] px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 font-medium">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>位置锁定保护中 · 轻触右上角挂锁解锁微调</span>
          </div>
        </div>
      )}

      {/* 7. 操作提示 Toast 浮层 */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[500] pointer-events-none transition-all duration-300">
          <div className="px-3.5 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[11px] font-bold rounded-full shadow-float border border-slate-700/80 flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: currentTheme.color }}
            />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
