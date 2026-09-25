import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Clock,
  Zap,
  Maximize2,
  Minimize2,
  Navigation,
  Compass,
  Target,
  Play,
  RotateCcw,
  CheckCircle2,
  MapPin,
  Radio,
  ExternalLink,
  Layers,
  Settings2,
  Share2,
  ShieldCheck,
  Bike
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDevSimulation } from '../../context/DevSimulationContext';
import { SimulationProbe } from '../dev/SimulationProbe';
import {
  getAmapWebKey,
  saveAmapWebKey,
  isUsingBuiltinAmapKey,
  planAmapRidingRoute,
  getAmapNavigationUrls,
  AmapRouteResult,
  DeliveryRouteOption,
  calculateHaversineDistance,
  AMAP_KEY_EVENT
} from '../../utils/truckLocationEngine';
import { TruckInfo, Order } from '../../types';

declare global {
  interface Window {
    L: any;
  }
}

// 高德与高可靠矢量/卫星/暗夜底图图层源 (GCJ-02 精确对齐)
const AMAP_TILE_VECTOR = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}';
const AMAP_TILE_SATELLITE = 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}';
const AMAP_TILE_ROADNET = 'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}';
const CARTO_DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const CARTO_VOYAGER_TILE = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const OSM_FALLBACK_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ESRI_SATELLITE_TILE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export interface TrackingRadarMapProps {
  initialSpeed?: number;
  initialDistanceMeters?: number;
  destinationLabel?: string;
  truckName?: string;
  onSimulate?: () => void;
  isSimulating?: boolean;
  truck?: TruckInfo;
  order?: Order;
  deliveryAddress?: string;
  originCoords?: { lat: number; lng: number };
  destCoords?: { lat: number; lng: number };
}

export const TrackingRadarMap: React.FC<TrackingRadarMapProps> = ({
  initialSpeed = 24,
  initialDistanceMeters = 420,
  destinationLabel = '静安大悦城商务座',
  truckName = '流动餐车',
  onSimulate,
  isSimulating = false,
  truck,
  order,
  deliveryAddress,
  originCoords,
  destCoords
}) => {
  const { isSimulationAllowed } = useDevSimulation();

  // 坐标计算：优先使用订单/餐车实际经纬度，若无则使用标准演示经纬度 (上海/杭州核心商圈)
  const defaultOrigin = useMemo(() => {
    if (originCoords) return originCoords;
    if ((truck as any)?.location?.latitude && (truck as any)?.location?.longitude) {
      return { lat: (truck as any).location.latitude, lng: (truck as any).location.longitude };
    }
    if (truck?.latitude && truck?.longitude) {
      return { lat: truck.latitude, lng: truck.longitude };
    }
    // 默认餐车站台 (上海市静安区曲阜路/西藏北路商圈)
    return { lat: 31.2425, lng: 121.4678 };
  }, [originCoords, truck]);

  const defaultDest = useMemo(() => {
    if (destCoords) return destCoords;
    // 默认配送收货地址 (静安大悦城商务座，距餐车约 600 米)
    return { lat: 31.2468, lng: 121.4725 };
  }, [destCoords]);

  const [speed, setSpeed] = useState(initialSpeed);
  const [distanceMeters, setDistanceMeters] = useState(initialDistanceMeters);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [routeProgress, setRouteProgress] = useState(65); // 默认进度 65%
  const [autoTour, setAutoTour] = useState(false);
  const [mapStyle, setMapStyle] = useState<'standard' | 'dark' | 'satellite'>('standard');
  const [isAmapModalOpen, setIsAmapModalOpen] = useState(false);
  const [amapKeyInput, setAmapKeyInput] = useState('');
  const [currentAmapKey, setCurrentAmapKey] = useState(getAmapWebKey());
  const [isBuiltinKey, setIsBuiltinKey] = useState(isUsingBuiltinAmapKey());

  // 高德 API 路径规划状态
  const [routeData, setRouteData] = useState<AmapRouteResult | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-1');
  const [isRouteLoading, setIsRouteLoading] = useState(true);
  const [routeSource, setRouteSource] = useState<'amap' | 'fallback_simulated'>('amap');
  const [toastTip, setToastTip] = useState<string | null>(null);

  // 地图 DOM 与图层引用
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const activeTileLayersRef = useRef<any[]>([]);
  const inactivePolylinesRef = useRef<any[]>([]);
  const polylineLayerRef = useRef<any>(null);
  const polylineGlowRef = useRef<any>(null);
  const polylineCasingRef = useRef<any>(null);
  const polylineFlowRef = useRef<any>(null);
  const radarCircle100Ref = useRef<any>(null);
  const radarCircle300Ref = useRef<any>(null);
  const truckMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const currentTileStyleRef = useRef<string>('');

  const showInternalToast = (msg: string) => {
    setToastTip(msg);
    setTimeout(() => setToastTip(null), 2500);
  };

  // 监听高德 Key 变动
  useEffect(() => {
    const handleKeyChange = () => {
      setCurrentAmapKey(getAmapWebKey());
      setIsBuiltinKey(isUsingBuiltinAmapKey());
    };
    window.addEventListener(AMAP_KEY_EVENT, handleKeyChange);
    return () => window.removeEventListener(AMAP_KEY_EVENT, handleKeyChange);
  }, []);

  // 计算多条候选配送路线
  const allRoutes: DeliveryRouteOption[] = useMemo(() => {
    if (routeData?.routes && routeData.routes.length > 0) {
      return routeData.routes;
    }
    if (routeData && routeData.points && routeData.points.length >= 2) {
      return [
        {
          id: 'route-1',
          name: '路线 1 · 极速绿波',
          tag: '最快推荐',
          color: '#00B96B',
          glowColor: 'rgba(0, 185, 107, 0.35)',
          distanceMeters: routeData.distanceMeters,
          durationMinutes: routeData.durationMinutes,
          durationSeconds: routeData.durationSeconds,
          points: routeData.points,
          steps: routeData.steps,
          description: '高德绿波专线 · 直达优先'
        }
      ];
    }
    return [];
  }, [routeData]);

  // 当前选中的激活路线
  const activeRoute = useMemo(() => {
    return allRoutes.find((r) => r.id === selectedRouteId) || allRoutes[0] || null;
  }, [allRoutes, selectedRouteId]);

  // 切换路线并同步遥测数据
  const handleSelectRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    const target = allRoutes.find((r) => r.id === routeId);
    if (target) {
      setDistanceMeters(Math.max(5, Math.round(target.distanceMeters * (1 - routeProgress / 100))));
      showInternalToast(`已切换至【${target.name}】(${target.distanceMeters}米 · 预估${target.durationMinutes}分钟)`);
      if (mapInstanceRef.current && target.points.length >= 2) {
        try {
          const bounds = window.L.latLngBounds(target.points);
          mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], animate: true });
        } catch {}
      }
    }
  };

  // 1. 调用高德开放平台 Direction API 进行骑行路径规划
  useEffect(() => {
    let cancelled = false;
    async function fetchRoute() {
      setIsRouteLoading(true);
      try {
        const res = await planAmapRidingRoute(
          defaultOrigin.lat,
          defaultOrigin.lng,
          defaultDest.lat,
          defaultDest.lng
        );
        if (cancelled) return;
        setRouteData(res);
        setRouteSource(res.source);
        if (res.routes && res.routes.length > 0) {
          const currentOpt = res.routes.find((r) => r.id === selectedRouteId) || res.routes[0];
          setDistanceMeters(Math.round(currentOpt.distanceMeters * (1 - routeProgress / 100)));
        } else {
          setDistanceMeters(Math.round(res.distanceMeters * (1 - routeProgress / 100)));
        }
      } catch (err) {
        console.error('高德路径规划调用异常:', err);
      } finally {
        if (!cancelled) setIsRouteLoading(false);
      }
    }
    fetchRoute();
    return () => {
      cancelled = true;
    };
  }, [defaultOrigin.lat, defaultOrigin.lng, defaultDest.lat, defaultDest.lng, currentAmapKey]);

  // 2. 实时 GPS 遥测速度与微波动
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeed((prev) => {
        if (routeProgress >= 100) return 0;
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(16, Math.min(32, prev + delta));
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [routeProgress]);

  // 3. 自动路线巡航演练
  useEffect(() => {
    if (!autoTour) return;
    const tourInterval = setInterval(() => {
      setRouteProgress((prev) => {
        if (prev >= 100) {
          setAutoTour(false);
          setSpeed(0);
          setDistanceMeters(0);
          return 100;
        }
        const next = prev + 1.5;
        const currentDist = activeRoute?.distanceMeters || routeData?.distanceMeters;
        if (currentDist) {
          setDistanceMeters(Math.max(0, Math.round(currentDist * (1 - next / 100))));
        }
        return next;
      });
    }, 300);
    return () => clearInterval(tourInterval);
  }, [autoTour, activeRoute, routeData]);

  // 4. 根据当前进度在折线上插值计算骑手真实经纬度
  const currentRiderCoord = useMemo<[number, number]>(() => {
    const pts = activeRoute?.points || routeData?.points;
    if (!pts || pts.length === 0) {
      return [defaultOrigin.lat, defaultOrigin.lng];
    }
    if (routeProgress <= 0) return pts[0];
    if (routeProgress >= 100) return pts[pts.length - 1];

    const targetIndex = Math.min(
      pts.length - 1,
      Math.max(0, Math.floor((pts.length - 1) * (routeProgress / 100)))
    );
    return pts[targetIndex];
  }, [activeRoute, routeData, routeProgress, defaultOrigin]);

  // 切换或初始化底图瓦片层 (彻底修复底图空白/失效 Bug)
  const applyTileLayers = (map: any, style: 'standard' | 'dark' | 'satellite') => {
    const L = window.L;
    if (!L || !map) return;

    // 清理现有全部旧瓦片层
    if (activeTileLayersRef.current.length > 0) {
      activeTileLayersRef.current.forEach((layer) => {
        try {
          map.removeLayer(layer);
        } catch {}
      });
      activeTileLayersRef.current = [];
    }

    if (style === 'standard') {
      const tile = L.tileLayer(AMAP_TILE_VECTOR, {
        maxZoom: 18,
        minZoom: 11,
        subdomains: '1234',
        attribution: '© 高德地图 AMap',
        className: 'minimal-flat-map-tile'
      });
      tile.on('tileerror', () => {
        if (!(tile as any)._hasFallback) {
          (tile as any)._hasFallback = true;
          try {
            map.removeLayer(tile);
          } catch {}
          const fallback = L.tileLayer(CARTO_VOYAGER_TILE, {
            maxZoom: 18,
            subdomains: 'abcd',
            className: 'minimal-flat-map-tile'
          }).addTo(map);
          activeTileLayersRef.current = [fallback];
        }
      });
      tile.addTo(map);
      activeTileLayersRef.current = [tile];
    } else if (style === 'satellite') {
      const sat = L.tileLayer(AMAP_TILE_SATELLITE, {
        maxZoom: 18,
        minZoom: 11,
        subdomains: '1234'
      });
      const road = L.tileLayer(AMAP_TILE_ROADNET, {
        maxZoom: 18,
        minZoom: 11,
        subdomains: '1234'
      });
      sat.on('tileerror', () => {
        if (!(sat as any)._hasFallback) {
          (sat as any)._hasFallback = true;
          try {
            map.removeLayer(sat);
          } catch {}
          const esri = L.tileLayer(ESRI_SATELLITE_TILE, { maxZoom: 18 }).addTo(map);
          activeTileLayersRef.current = [esri, road];
        }
      });
      sat.addTo(map);
      road.addTo(map);
      activeTileLayersRef.current = [sat, road];
    } else if (style === 'dark') {
      const darkTile = L.tileLayer(CARTO_DARK_TILE, {
        maxZoom: 18,
        minZoom: 11,
        subdomains: 'abcd',
        attribution: '© CartoDB Dark Matter'
      });
      darkTile.on('tileerror', () => {
        if (!(darkTile as any)._hasFallback) {
          (darkTile as any)._hasFallback = true;
          try {
            map.removeLayer(darkTile);
          } catch {}
          const amapDark = L.tileLayer(
            'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
            { maxZoom: 18, subdomains: '1234' }
          ).addTo(map);
          activeTileLayersRef.current = [amapDark];
        }
      });
      darkTile.addTo(map);
      activeTileLayersRef.current = [darkTile];
    }

    currentTileStyleRef.current = style;
    setTimeout(() => {
      map.invalidateSize();
    }, 50);
  };

  // 组件卸载清理
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
      truckMarkerRef.current = null;
      destMarkerRef.current = null;
      riderMarkerRef.current = null;
      radarCircle100Ref.current = null;
      radarCircle300Ref.current = null;
      polylineGlowRef.current = null;
      polylineCasingRef.current = null;
      polylineLayerRef.current = null;
      polylineFlowRef.current = null;
      inactivePolylinesRef.current = [];
      activeTileLayersRef.current = [];
    };
  }, []);

  // 5. 初始化与维护 Leaflet 真实高德地图图层
  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;
    const L = window.L;

    if (!mapInstanceRef.current) {
      if ((mapContainerRef.current as any)._leaflet_id) {
        try {
          delete (mapContainerRef.current as any)._leaflet_id;
        } catch {}
      }
      truckMarkerRef.current = null;
      destMarkerRef.current = null;
      riderMarkerRef.current = null;
      radarCircle100Ref.current = null;
      radarCircle300Ref.current = null;
      polylineGlowRef.current = null;
      polylineCasingRef.current = null;
      polylineLayerRef.current = null;
      polylineFlowRef.current = null;
      inactivePolylinesRef.current = [];
      activeTileLayersRef.current = [];

      const map = L.map(mapContainerRef.current, {
        center: [defaultOrigin.lat, defaultOrigin.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true
      });
      mapInstanceRef.current = map;
      applyTileLayers(map, mapStyle);
    } else {
      // 检查底图风格是否发生变化
      if (currentTileStyleRef.current !== mapStyle) {
        applyTileLayers(mapInstanceRef.current, mapStyle);
      }
    }

    const map = mapInstanceRef.current;

    // 绘制以流动餐车为基点的极速雷达覆盖同心圆 (120m 即烹圈, 320m 极速圈)
    if (radarCircle100Ref.current) map.removeLayer(radarCircle100Ref.current);
    if (radarCircle300Ref.current) map.removeLayer(radarCircle300Ref.current);

    radarCircle100Ref.current = L.circle([defaultOrigin.lat, defaultOrigin.lng], {
      radius: 120,
      color: mapStyle === 'dark' ? '#3B82F6' : '#1a1c1b',
      weight: 1.2,
      dashArray: '4, 8',
      opacity: 0.35,
      fillColor: mapStyle === 'dark' ? '#3B82F6' : '#1a1c1b',
      fillOpacity: 0.04
    }).addTo(map);

    radarCircle300Ref.current = L.circle([defaultOrigin.lat, defaultOrigin.lng], {
      radius: 320,
      color: mapStyle === 'dark' ? '#3B82F6' : '#1a1c1b',
      weight: 1,
      dashArray: '6, 12',
      opacity: 0.2,
      fillColor: mapStyle === 'dark' ? '#3B82F6' : '#1a1c1b',
      fillOpacity: 0.02
    }).addTo(map);

    // 清理非激活候选路线的旧折线
    if (inactivePolylinesRef.current.length > 0) {
      inactivePolylinesRef.current.forEach((layer) => {
        try {
          map.removeLayer(layer);
        } catch {}
      });
      inactivePolylinesRef.current = [];
    }

    // 清理当前激活路线的旧折线
    if (polylineGlowRef.current) {
      map.removeLayer(polylineGlowRef.current);
      polylineGlowRef.current = null;
    }
    if (polylineCasingRef.current) {
      map.removeLayer(polylineCasingRef.current);
      polylineCasingRef.current = null;
    }
    if (polylineLayerRef.current) {
      map.removeLayer(polylineLayerRef.current);
      polylineLayerRef.current = null;
    }
    if (polylineFlowRef.current) {
      map.removeLayer(polylineFlowRef.current);
      polylineFlowRef.current = null;
    }

    // 绘制所有备选路线 (未激活的路线以半透明微弧虚线呈现，带专属识别色，点击即可直接切换)
    allRoutes.forEach((route) => {
      if (route.id === activeRoute?.id) return;
      if (!route.points || route.points.length < 2) return;

      const casing = L.polyline(route.points, {
        color: mapStyle === 'dark' ? '#1E293B' : '#FFFFFF',
        weight: 5,
        opacity: 0.75,
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 1.0
      }).addTo(map);

      const altLine = L.polyline(route.points, {
        color: route.color,
        weight: 3.2,
        opacity: 0.45,
        dashArray: '6, 8',
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 1.0
      }).addTo(map);

      // 可点击交互热区
      const hitArea = L.polyline(route.points, {
        color: 'transparent',
        weight: 18,
        opacity: 0.01,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'cursor-pointer'
      }).addTo(map);

      hitArea.on('click', () => {
        handleSelectRoute(route.id);
      });

      altLine.on('click', () => {
        handleSelectRoute(route.id);
      });

      inactivePolylinesRef.current.push(casing, altLine, hitArea);
    });

    // 绘制当前激活路线：4 阶微弧转弯专送光轨 (重新上色，活力明亮高辨识度)
    if (activeRoute && activeRoute.points && activeRoute.points.length >= 2) {
      const activeColor = activeRoute.color || '#00B96B';
      const activeGlow = activeRoute.glowColor || 'rgba(0, 185, 107, 0.35)';

      // 第 1 阶：外层弥散呼吸底光 (路线专属明亮光晕)
      polylineGlowRef.current = L.polyline(activeRoute.points, {
        color: activeColor,
        weight: 12,
        opacity: 0.28,
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 1.0
      }).addTo(map);

      // 第 2 阶：纯白隔离套边 (使微弧光轨在各类平铺路面上分明凸显)
      polylineCasingRef.current = L.polyline(activeRoute.points, {
        color: '#FFFFFF',
        weight: 6,
        opacity: 0.98,
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 1.0
      }).addTo(map);

      // 第 3 阶：主干活力专送实体线 (翡翠绿 / 高德蓝 / 珊瑚橙)
      polylineLayerRef.current = L.polyline(activeRoute.points, {
        color: activeColor,
        weight: 3.8,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 1.0
      }).addTo(map);

      // 第 4 阶：顶层定向流向微弧虚线流动动画 (纯白高光动态粒子流)
      polylineFlowRef.current = L.polyline(activeRoute.points, {
        color: '#FFFFFF',
        weight: 1.8,
        opacity: 0.95,
        dashArray: '6, 10',
        className: 'leaflet-microarc-flow',
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 1.0
      }).addTo(map);

      try {
        const bounds = L.latLngBounds(activeRoute.points);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17, animate: true });
      } catch {}
    }

    // 起点 Marker：流动餐车站台
    const truckNeedsCreate = !truckMarkerRef.current || !(truckMarkerRef.current as any)._map || !truckMarkerRef.current.getElement();
    if (truckNeedsCreate) {
      if (truckMarkerRef.current) {
        try { map.removeLayer(truckMarkerRef.current); } catch {}
      }
      const truckIcon = L.divIcon({
        className: 'custom-truck-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none pointer-events-auto cursor-pointer group">
            <div class="absolute w-14 h-14 rounded-full border border-emerald-500/30 map-radar-pulse-ring"></div>
            <div class="absolute w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 animate-pulse"></div>
            <div class="w-7.5 h-7.5 rounded-full bg-[#1A1A17] border-2 border-white shadow-xl flex items-center justify-center text-white relative z-10 transition-transform group-hover:scale-110">
              <span class="w-2.5 h-2.5 rounded-full bg-white border border-[#1A1A17]"></span>
            </div>
            <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/95 backdrop-blur-xs text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-gray-200/90 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-black"></span>
              <span>${truckName || '流动餐车'} · 驻点</span>
            </div>
          </div>
        `,
        iconSize: [30, 30]
      });
      truckMarkerRef.current = L.marker([defaultOrigin.lat, defaultOrigin.lng], { icon: truckIcon }).addTo(map);
    } else {
      try {
        truckMarkerRef.current.setLatLng([defaultOrigin.lat, defaultOrigin.lng]);
      } catch {
        // Safe fallback
      }
    }

    // 终点 Marker：收货目标地址
    const destNeedsCreate = !destMarkerRef.current || !(destMarkerRef.current as any)._map || !destMarkerRef.current.getElement();
    if (destNeedsCreate) {
      if (destMarkerRef.current) {
        try { map.removeLayer(destMarkerRef.current); } catch {}
      }
      const destIcon = L.divIcon({
        className: 'custom-dest-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none pointer-events-auto cursor-pointer group">
            <div class="absolute w-9 h-9 rounded-full bg-red-500/20 animate-pulse"></div>
            <div class="w-7 h-7 rounded-full bg-red-500 border-2 border-white shadow-xl flex items-center justify-center text-white relative z-10 transition-transform group-hover:scale-110">
              <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <circle cx="12" cy="11" r="2.5" stroke-width="2"></circle>
              </svg>
            </div>
            <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/95 backdrop-blur-xs text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-gray-200/90 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              <span>${destinationLabel}</span>
            </div>
          </div>
        `,
        iconSize: [26, 26]
      });
      destMarkerRef.current = L.marker([defaultDest.lat, defaultDest.lng], { icon: destIcon }).addTo(map);
    } else {
      try {
        destMarkerRef.current.setLatLng([defaultDest.lat, defaultDest.lng]);
      } catch {
        // Safe fallback
      }
    }

    // 骑手 Marker：动态跟随坐标平滑移动，搭载时速与专属路线色系浮标
    const activeRiderColor = activeRoute?.color || '#00B96B';
    const riderHtml = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none pointer-events-auto cursor-pointer group">
        <div class="absolute w-12 h-12 rounded-full animate-ping opacity-60" style="background-color: ${activeRiderColor}; animation-duration: 2s;"></div>
        <div class="w-8 h-8 rounded-full border-2 border-white shadow-2xl flex items-center justify-center text-white relative z-10 transition-transform group-hover:scale-110" style="background-color: ${activeRiderColor}">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        <div class="absolute -top-6.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#1A1A17] text-white text-[9.5px] font-sans font-bold px-2 py-0.5 rounded-full shadow-lg border border-white/20 flex items-center gap-1">
          <span style="color: ${activeRiderColor}">⚡ ${speed}km/h</span>
          <span class="text-white/30">|</span>
          <span class="text-neutral-200">${activeRoute?.name?.split('·')?.[0]?.trim() || '专送'} ${Math.round(routeProgress)}%</span>
        </div>
      </div>
    `;

    const riderNeedsCreate = !riderMarkerRef.current || !(riderMarkerRef.current as any)._map || !riderMarkerRef.current.getElement();
    if (riderNeedsCreate) {
      if (riderMarkerRef.current) {
        try { map.removeLayer(riderMarkerRef.current); } catch {}
      }
      const riderIcon = L.divIcon({
        className: 'custom-rider-pin',
        html: riderHtml,
        iconSize: [32, 32]
      });
      riderMarkerRef.current = L.marker(currentRiderCoord, { icon: riderIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      try {
        const riderIcon = L.divIcon({
          className: 'custom-rider-pin',
          html: riderHtml,
          iconSize: [32, 32]
        });
        riderMarkerRef.current.setIcon(riderIcon);
        riderMarkerRef.current.setLatLng(currentRiderCoord);
      } catch {
        // Safe fallback
      }
    }

    // 触发尺寸重算
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [defaultOrigin, defaultDest, routeData, activeRoute, allRoutes, currentRiderCoord, mapStyle, destinationLabel, truckName, routeProgress]);

  // 地图容器尺寸变动时触发 invalidateSize
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 350);
    }
  }, [isMapExpanded]);

  // 模拟推进按钮事件
  const handleStepSimulation = () => {
    if (onSimulate) onSimulate();
    setRouteProgress((prev) => {
      const next = prev >= 100 ? 15 : Math.min(100, prev + 15);
      if (routeData) {
        setDistanceMeters(Math.max(5, Math.round(routeData.distanceMeters * (1 - next / 100))));
      }
      return next;
    });
    showInternalToast('模拟专送骑手推进 +15% 路线');
  };

  // 重置巡航演示
  const handleResetRoute = () => {
    setRouteProgress(10);
    if (routeData) {
      setDistanceMeters(routeData.distanceMeters);
    }
    setAutoTour(true);
    showInternalToast('已开启高德全路网自动巡航演示');
  };

  // 高德官方导航唤起与网页打开
  const amapNavUrls = useMemo(() => {
    return getAmapNavigationUrls(
      defaultDest.lat,
      defaultDest.lng,
      destinationLabel,
      defaultOrigin.lat,
      defaultOrigin.lng,
      truckName
    );
  }, [defaultDest, defaultOrigin, destinationLabel, truckName]);

  const handleOpenAmapNavigation = () => {
    // 优先尝试唤起高德地图 App 协议，并延迟兜底打开高德网页版导航
    if (typeof window !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = amapNavUrls.amapUri;
        setTimeout(() => {
          window.open(amapNavUrls.webNavUrl, '_blank');
        }, 1500);
      } else {
        window.open(amapNavUrls.webNavUrl, '_blank');
      }
      showInternalToast('正在打开高德地图官方骑行专送导航…');
    }
  };

  // 保存自定义高德 Key
  const handleSaveAmapKey = (e: React.FormEvent) => {
    e.preventDefault();
    saveAmapWebKey(amapKeyInput);
    setCurrentAmapKey(getAmapWebKey());
    setIsBuiltinKey(isUsingBuiltinAmapKey());
    setIsAmapModalOpen(false);
    showInternalToast(amapKeyInput ? '已保存自定义高德 Key 并重新规划' : '已恢复系统内置高德企业 Key');
  };

  return (
    <div className="overflow-hidden bg-[#FAFAF8] border-b border-gray-200 relative select-none font-sans">
      {/* 内部 Toast 提示 */}
      <AnimatePresence>
        {toastTip && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-[#181816]/95 text-white text-[10.5px] font-semibold px-3 py-1 rounded-full shadow-lg border border-white/15 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{toastTip}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ height: isMapExpanded ? 400 : 256 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="w-full relative overflow-hidden bg-[#FAFAF8]"
      >
        {/* Leaflet 真实高德地图容器 (极简平铺渲染引擎，支持标准/卫星/黑曜暗夜原生图层) */}
        <div
          ref={mapContainerRef}
          className="w-full h-full amap-clean-white-container"
          style={{ zIndex: 1 }}
        />

        {/* 顶部遥测与高德对接状态浮动栏 */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-20">
          {/* 左侧：高德 API 对接标识与预估到达时间 */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsAmapModalOpen(true)}
              className="bg-[#1A1A17]/90 hover:bg-[#1A1A17] backdrop-blur-md text-white text-[10.5px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md cursor-pointer border border-white/15 transition-all"
              title="点击查看/配置高德开放平台 API 对接详情"
            >
              <Compass className="w-3 h-3 text-emerald-400 animate-spin-slow" />
              <span className="text-emerald-400 font-sans">AMap</span>
              <span className="text-neutral-200">
                {activeRoute?.name?.split('·')?.[1]?.trim() || (routeSource === 'amap' ? '极速绿波' : '网格对齐')}
              </span>
            </button>

            <div className="bg-white/95 backdrop-blur-md text-gray-900 text-[10.5px] font-bold px-2.5 py-1 rounded-full border border-gray-200/90 shadow-sm flex items-center gap-1">
              <Clock className="w-3 h-3 text-neutral-800" />
              <span>
                {routeProgress >= 100
                  ? '已顺利送达'
                  : activeRoute?.durationMinutes
                  ? `高德预估 ${Math.max(1, Math.ceil(activeRoute.durationMinutes * (1 - routeProgress / 100)))} 分钟`
                  : routeData?.durationMinutes
                  ? `高德预估 ${Math.max(1, Math.ceil(routeData.durationMinutes * (1 - routeProgress / 100)))} 分钟`
                  : '约 5-8 分钟'}
              </span>
            </div>
          </div>

          {/* 右侧：距离、状态与官方高德导航入口 */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={handleOpenAmapNavigation}
              className="bg-[#1677FF] hover:bg-blue-600 text-white text-[10.5px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              title="一键拉起高德地图官方 App / 网页版骑行导航"
            >
              <Navigation className="w-3 h-3 fill-white" />
              <span>高德导航</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-80" />
            </button>

            <div className="bg-[#1A1A17]/95 backdrop-blur-md text-white text-[10.5px] font-sans font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-white/15">
              <motion.span
                animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: activeRoute?.color || '#00B96B' }}
              />
              <span>{routeProgress >= 100 ? '0m' : `${distanceMeters}m`}</span>
            </div>
          </div>
        </div>

        {/* 备选专送路径智能切换胶囊栏 (路线 1 极速绿波 / 路线 2 宽道直达 / 路线 3 园区穿行) */}
        {allRoutes.length > 0 && (
          <div className="absolute top-11 left-2.5 z-20 flex items-center gap-1 pointer-events-auto bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-gray-200/90 max-w-[calc(100%-80px)] overflow-x-auto no-scrollbar">
            {allRoutes.map((r) => {
              const isCurrent = r.id === (activeRoute?.id || 'route-1');
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectRoute(r.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isCurrent
                      ? 'bg-[#181816] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:scale-95'
                  }`}
                  title={`${r.name} - ${r.description} (${r.distanceMeters}米 · ${r.durationMinutes}分钟)`}
                >
                  <span
                    className="w-2 h-2 rounded-full ring-1 ring-white/60"
                    style={{ backgroundColor: r.color }}
                  />
                  <span>{r.name.split('·')[0].trim()}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-sans ${
                      isCurrent ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {r.durationMinutes}分
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] text-emerald-400 font-normal">
                      · {r.tag}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 右侧浮动小工具栏：图层切换 & 视角复位 */}
        <div className="absolute right-2.5 top-11 flex flex-col gap-1.5 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              const next = mapStyle === 'standard' ? 'satellite' : mapStyle === 'satellite' ? 'dark' : 'standard';
              setMapStyle(next);
              showInternalToast(
                next === 'standard'
                  ? '已切换至高德极简平铺白底'
                  : next === 'satellite'
                  ? '已切换至高分卫星与路网'
                  : '已切换至黑曜石深色夜景'
              );
            }}
            className={`w-7.5 h-7.5 rounded-lg border shadow-sm flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
              mapStyle === 'dark'
                ? 'bg-neutral-900 text-white border-neutral-700'
                : 'bg-white/95 hover:bg-white text-gray-800 border-gray-200/90'
            }`}
            title={`当前底图: ${mapStyle === 'standard' ? '极简白底' : mapStyle === 'satellite' ? '高分卫星' : '黑曜深色'} (点击切换)`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              const pts = activeRoute?.points || routeData?.points;
              if (mapInstanceRef.current && pts && pts.length >= 2) {
                mapInstanceRef.current.fitBounds(window.L.latLngBounds(pts), {
                  padding: [40, 40],
                  animate: true
                });
                showInternalToast(`已居中【${activeRoute?.name || '专线'}】全览`);
              }
            }}
            className="w-7.5 h-7.5 rounded-lg bg-white/95 hover:bg-white text-gray-800 border border-gray-200/90 shadow-sm flex items-center justify-center cursor-pointer active:scale-95 transition-all"
            title="居中重绘专送全线"
          >
            <Target className="w-3.5 h-3.5 text-gray-700" />
          </button>
        </div>

        {/* 底部左侧：时速、高德路况、模拟操纵台 */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 z-20 flex-wrap pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md text-gray-900 text-[11px] font-bold px-2 py-0.5 rounded-md border border-gray-200/90 shadow-sm flex items-center gap-1">
            <Zap className="w-3 h-3 text-neutral-900 fill-neutral-900" />
            <span className="font-sans">{speed} km/h</span>
          </div>

          <div className="bg-white/95 backdrop-blur-md text-gray-800 text-[10.5px] font-medium px-2 py-0.5 rounded-md border border-gray-200/90 shadow-sm flex items-center gap-1">
            <Bike className="w-3.5 h-3.5 text-[#00B96B]" />
            <span>实时进度 {Math.round(routeProgress)}%</span>
          </div>

          {/* 管理员开发调试操纵台 */}
          {isSimulationAllowed && (
            <SimulationProbe pointId="SIM_RADAR_CRUISE_TRACK" className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleStepSimulation}
                className="bg-white/95 hover:bg-white active:scale-95 text-gray-800 text-[10.5px] font-bold px-2 py-0.5 rounded-md border border-gray-200/90 shadow-sm cursor-pointer transition-all flex items-center gap-1"
              >
                <Play className="w-3 h-3 text-blue-600 fill-blue-600" />
                <span>{isSimulating ? '模拟中...' : '推进 (+15%)'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetRoute}
                className="bg-white/95 hover:bg-white active:scale-95 text-gray-700 text-[10.5px] font-semibold px-2 py-0.5 rounded-md border border-gray-200/90 shadow-sm cursor-pointer transition-all flex items-center gap-0.5"
                title="高德道路全线自动巡航演示"
              >
                <RotateCcw className="w-3 h-3" />
                <span>全线巡航</span>
              </button>
            </SimulationProbe>
          )}
        </div>

        {/* 底部右侧：全屏展开切换 */}
        <button
          type="button"
          onClick={() => setIsMapExpanded((v) => !v)}
          className="absolute bottom-2.5 right-3 w-7.5 h-7.5 bg-white/95 hover:bg-white text-gray-800 border border-gray-200/90 shadow-sm rounded-lg flex items-center justify-center cursor-pointer active:scale-95 transition-all z-20 pointer-events-auto"
          title={isMapExpanded ? '收起地图' : '展开高德全景大图'}
        >
          {isMapExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </motion.div>

      {/* 高德 API 配置与连通状态弹窗 */}
      <AnimatePresence>
        {isAmapModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white border border-neutral-300 shadow-2xl p-4.5 space-y-3.5 text-xs text-neutral-800"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-neutral-900">高德开放平台 (AMap API) 对接中枢</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAmapModalOpen(false)}
                  className="text-neutral-500 hover:text-black font-sans text-base px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* 状态总览 */}
              <div className="space-y-2 bg-neutral-50 p-3 border border-neutral-200">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">接口对接模式:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>高德 Web 服务 API + 矢量瓦片双引擎</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">坐标基准体系:</span>
                  <span className="font-sans font-bold text-blue-700">GCJ-02 (火星加密精确对齐)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">专送路径规划引擎:</span>
                  <span className="font-medium text-neutral-800">
                    {routeSource === 'amap' ? '高德 Bicycling v4 骑行绿波算法' : '城市路网智能网格平滑算法'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">轨迹节点解析:</span>
                  <span className="font-sans text-neutral-800 font-bold">
                    {routeData?.points.length || 0} 个真实路网拐点
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">当前 Key 授权源:</span>
                  <span className={`font-medium ${isBuiltinKey ? 'text-purple-700' : 'text-blue-700'}`}>
                    {isBuiltinKey ? '企业默认开发者 Key' : '自定义 Web 服务 Key'}
                  </span>
                </div>
              </div>

              {/* 官方导航外链 */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-none space-y-1.5">
                <div className="font-bold text-blue-950 flex items-center justify-between">
                  <span>高德官方导航通道</span>
                  <span className="text-[10px] text-blue-600 font-sans">amapuri://</span>
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  专送支持一键直达高德地图客户端或高德网页版，实时路况同步查看。
                </p>
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={handleOpenAmapNavigation}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 flex items-center justify-center gap-1 shadow-xs cursor-pointer text-xs"
                  >
                    <Navigation className="w-3.5 h-3.5 fill-white" />
                    <span>立即在外部高德打开导航</span>
                  </button>
                </div>
              </div>

              {/* 自定义 Key 配置表单 */}
              <form onSubmit={handleSaveAmapKey} className="space-y-2 pt-1 border-t border-neutral-200">
                <label className="block text-[11px] font-bold text-neutral-700">
                  自定义高德 Web 服务 Key (可选配置)
                </label>
                <input
                  type="text"
                  value={amapKeyInput}
                  onChange={(e) => setAmapKeyInput(e.target.value)}
                  placeholder={currentAmapKey ? `当前 Key: ${currentAmapKey.slice(0, 8)}**** (留空保存恢复默认)` : '输入高德 Web 服务 Key'}
                  className="w-full bg-neutral-50 border border-neutral-300 px-2.5 py-1.5 text-xs font-sans text-neutral-900 focus:outline-none focus:border-black"
                />
                <div className="flex items-center justify-between text-[10px] text-neutral-500">
                  <span>支持高德开放平台申请的「Web 服务」类型 Key</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAmapKeyInput('');
                        saveAmapWebKey('');
                        setCurrentAmapKey(getAmapWebKey());
                        setIsBuiltinKey(isUsingBuiltinAmapKey());
                        showInternalToast('已恢复系统内置高德 Key');
                      }}
                      className="text-neutral-600 hover:text-black underline cursor-pointer"
                    >
                      恢复默认
                    </button>
                    <button
                      type="submit"
                      className="bg-[#181816] hover:bg-black text-white font-bold px-3 py-1 cursor-pointer"
                    >
                      保存配置
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
