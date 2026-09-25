import React, { useEffect, useRef, useState, useCallback } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import {
  canvasToLngLat,
  lngLatToCanvas,
  polygonPointsToLngLats,
  AMAP_MONOCHROME_WHITE_STYLE
} from './geoUtils';
import {
  ZoneMesh,
  StoreEntity,
  TruckEntity,
  RiderEntity,
  UserEntity
} from './cockpitData';
import { CompetitorRecord } from '../DigitalTwinCommandCockpit';
import { AlertCircle, RefreshCw, Key, ShieldCheck, MapPin, Navigation, Crosshair, Layers, Radio, PenTool } from 'lucide-react';

// 初始化全局安全密钥挂载点，确保 AMapLoader 加载时立即可用
if (typeof window !== 'undefined') {
  const defaultSec = (import.meta.env.VITE_AMAP_SECURITY_CODE as string) || '';
  if (defaultSec) {
    (window as any)._AMapSecurityConfig = {
      securityJsCode: defaultSec
    };
  }
}

interface LayerVisibilityConfig {
  mesh: boolean;
  store: boolean;
  storeRadius?: boolean;
  truck: boolean;
  truckRadius?: boolean;
  rider: boolean;
  userPoints?: boolean;
  demandHeat?: boolean;
  realtimeTraffic?: boolean;
}

interface AMapEngineViewProps {
  zones: ZoneMesh[];
  stores: StoreEntity[];
  trucks: TruckEntity[];
  riders: RiderEntity[];
  users: UserEntity[];
  competitors: CompetitorRecord[];
  layerVisibility: LayerVisibilityConfig;
  showCompetitorRadar: boolean;
  selectedRiderId?: string | null;
  showAllRiderRoutes?: boolean;
  viewPerspective?: '2d' | '3d';
  mapHierarchy?: 'country' | 'city' | 'district' | 'grid';
  viewActionTrigger?: { type: 'zoomIn' | 'zoomOut' | 'reset' | 'perspective'; timestamp: number } | null;
  activeTool?: 'none' | 'measure' | 'select' | 'draw_polygon';
  drawingPoints?: { x: number; y: number }[];
  onAddDrawingPoint?: (pt: { x: number; y: number }) => void;
  onSelectEntity: (entity: { type: string; id: string; screenPos?: { x: number; y: number } }) => void;
  onSelectRider?: (riderId: string) => void;
  onSelectCompetitor?: (name: string, comp?: CompetitorRecord, screenPos?: { x: number; y: number }) => void;
  onMapClickCoords?: (coords: { lng: number; lat: number }) => void;
  onSwitchToSandbox: () => void;
  onTogglePerspective?: () => void;
  showToast: (msg: string) => void;
}

export const AMapEngineView: React.FC<AMapEngineViewProps> = ({
  zones,
  stores,
  trucks,
  riders,
  users,
  competitors,
  layerVisibility,
  showCompetitorRadar,
  selectedRiderId,
  showAllRiderRoutes = false,
  viewPerspective = '2d',
  mapHierarchy = 'district',
  viewActionTrigger,
  activeTool = 'none',
  drawingPoints = [],
  onAddDrawingPoint,
  onSelectEntity,
  onSelectRider,
  onSelectCompetitor,
  onMapClickCoords,
  onSwitchToSandbox,
  onTogglePerspective,
  showToast
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const amapRef = useRef<any>(null);
  const overlaysRef = useRef<{
    polygons: any[];
    stores: any[];
    storeRadii: any[];
    trucks: any[];
    truckRadii: any[];
    riders: any[];
    users: any[];
    competitors: any[];
    routes: any[];
    trafficLayer: any | null;
    heatMap: any | null;
  }>({
    polygons: [],
    stores: [],
    storeRadii: [],
    trucks: [],
    truckRadii: [],
    riders: [],
    users: [],
    competitors: [],
    routes: [],
    trafficLayer: null,
    heatMap: null
  });

  const [mapStatus, setMapStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentAmapKey, setCurrentAmapKey] = useState(() => {
    return (
      (import.meta.env.VITE_AMAP_KEY as string) ||
      localStorage.getItem('URBAN_RADAR_AMAP_KEY') ||
      ''
    );
  });
  const [currentSecurityCode, setCurrentSecurityCode] = useState(() => {
    return (
      (import.meta.env.VITE_AMAP_SECURITY_CODE as string) ||
      localStorage.getItem('URBAN_RADAR_AMAP_SEC') ||
      ''
    );
  });
  const [showKeyConfigModal, setShowKeyConfigModal] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [inputSec, setInputSec] = useState('');

  // 1. 初始化高德地图
  useEffect(() => {
    let isMounted = true;
    setMapStatus('loading');
    setErrorMessage('');

    // 配置安全密钥 (高德 JSAPI 2.0 强制安全策略)
    if (typeof window !== 'undefined') {
      const secCode = currentSecurityCode || (import.meta.env.VITE_AMAP_SECURITY_CODE as string) || '';
      (window as any)._AMapSecurityConfig = {
        securityJsCode: secCode
      };
    }

    const loadKey =
      currentAmapKey ||
      (import.meta.env.VITE_AMAP_KEY as string) ||
      '';

    if (!loadKey || loadKey.trim().length < 10) {
      setMapStatus('error');
      setErrorMessage(
        '未检测到有效的高德地图 Web 端 JS API Key。请在控制面板中配置您的合法 Key，或直接使用内置高帧率极速数字孪生矢量沙盘。'
      );
      return;
    }

    try {
      AMapLoader.load({
        key: loadKey.trim(),
        version: '2.0',
        plugins: [
          'AMap.Scale',
          'AMap.ToolBar',
          'AMap.ControlBar',
          'AMap.Riding',
          'AMap.HeatMap',
          'AMap.GeoJSON'
        ]
      })
        .then((AMap) => {
          if (!isMounted || !mapContainerRef.current) return;
          amapRef.current = AMap;

          // 创建高德地图实例 (黑白极简纯白底图样式，中心点设在静安与苏河湾居中位置，支持 3D 模式与平滑俯仰倾角)
          const map = new AMap.Map(mapContainerRef.current, {
            center: [121.4985, 31.2355],
            zoom: mapHierarchy === 'city' ? 11.8 : mapHierarchy === 'grid' ? 15.5 : 13.0,
            viewMode: '3D',
            pitch: viewPerspective === '3d' ? 52 : 0,
            rotation: viewPerspective === '3d' ? 18 : 0,
            mapStyle: AMAP_MONOCHROME_WHITE_STYLE,
            features: ['bg', 'road', 'building', 'point'],
            showLabel: true,
            defaultCursor: activeTool === 'draw_polygon' ? 'crosshair' : 'default'
          });

          // 添加高德官方比例尺控件
          map.addControl(new AMap.Scale({ position: 'LB' }));

          map.on('click', (e: any) => {
            const lng = e.lnglat.getLng();
            const lat = e.lnglat.getLat();
            if (onMapClickCoords) {
              onMapClickCoords({ lng, lat });
            }
            if (activeTool === 'draw_polygon' && onAddDrawingPoint) {
              const canvasPt = lngLatToCanvas([lng, lat]);
              onAddDrawingPoint(canvasPt);
            }
          });

          mapInstanceRef.current = map;
          setMapStatus('success');
        })
        .catch((err) => {
          if (!isMounted) return;
          console.warn('AMap Load error:', err);
          setMapStatus('error');
          setErrorMessage(
            err?.message || '高德地图 SDK 加载失败，可能是因为未配置有效的 API 开发者 Key 或网络限制。'
          );
        });
    } catch (err: any) {
      if (!isMounted) return;
      setMapStatus('error');
      setErrorMessage(err?.message || '高德地图初始化异常');
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch (e) {
          // ignore cleanup errors
        }
        mapInstanceRef.current = null;
      }
    };
  }, [currentAmapKey, currentSecurityCode]);

  // 视角全域自适应居中
  const handleFitAllViews = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || mapStatus !== 'success') return;
    try {
      map.setFitView();
      showToast('已自适应全域核心网格与运力点位视角');
    } catch (e) {
      map.setZoomAndCenter(13.0, [121.4985, 31.2355]);
    }
  }, [mapStatus, showToast]);

  // 视角联动：2D 俯视与 3D 鸟瞰平滑切换
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapStatus !== 'success') return;
    try {
      if (viewPerspective === '3d') {
        map.setPitch(52);
        map.setRotation(18);
      } else {
        map.setPitch(0);
        map.setRotation(0);
      }
    } catch (e) {
      console.warn('Perspective switch error:', e);
    }
  }, [viewPerspective, mapStatus]);

  // 层级联动：城市 (全域) / 城区 (静安-苏河湾) / 网格 (高密微格)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapStatus !== 'success') return;
    try {
      if (mapHierarchy === 'country') {
        map.setZoom(8.5);
      } else if (mapHierarchy === 'city') {
        map.setZoom(11.8);
      } else if (mapHierarchy === 'district') {
        map.setZoom(13.5);
      } else if (mapHierarchy === 'grid') {
        map.setZoom(15.5);
      }
    } catch (e) {
      console.warn('Hierarchy zoom error:', e);
    }
  }, [mapHierarchy, mapStatus]);

  // 外部视口操作指令驱动 (放大、缩小、复位、切换视角)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapStatus !== 'success' || !viewActionTrigger) return;
    try {
      if (viewActionTrigger.type === 'zoomIn') {
        map.zoomIn();
      } else if (viewActionTrigger.type === 'zoomOut') {
        map.zoomOut();
      } else if (viewActionTrigger.type === 'reset') {
        map.setZoomAndCenter(13.0, [121.4985, 31.2355]);
        map.setPitch(0);
        map.setRotation(0);
        showToast('地图已复位至默认 2D 俯视视角');
      } else if (viewActionTrigger.type === 'perspective') {
        const currentPitch = map.getPitch?.() || 0;
        if (currentPitch > 10) {
          map.setPitch(0);
          map.setRotation(0);
        } else {
          map.setPitch(52);
          map.setRotation(18);
        }
      }
    } catch (e) {
      console.warn('View action trigger error:', e);
    }
  }, [viewActionTrigger, mapStatus, showToast]);

  // 钢笔绘制状态光标联动
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapStatus !== 'success') return;
    try {
      map.setDefaultCursor(activeTool === 'draw_polygon' ? 'crosshair' : 'default');
    } catch (e) {
      // ignore
    }
  }, [activeTool, mapStatus]);

  // 2. 渲染/更新地图所有业务图层 (网格、门店、餐车、骑手、竞品、路况、热力)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const AMap = amapRef.current;
    if (!map || !AMap || mapStatus !== 'success') return;

    // 清理旧图层 (防御式安全清理)
    const clearAllOverlays = () => {
      try {
        if (overlaysRef.current.trafficLayer) {
          overlaysRef.current.trafficLayer.setMap(null);
          overlaysRef.current.trafficLayer = null;
        }
        if (overlaysRef.current.heatMap) {
          overlaysRef.current.heatMap.setMap(null);
          overlaysRef.current.heatMap = null;
        }
        const flatList = [
          ...overlaysRef.current.polygons,
          ...overlaysRef.current.stores,
          ...overlaysRef.current.storeRadii,
          ...overlaysRef.current.trucks,
          ...overlaysRef.current.truckRadii,
          ...overlaysRef.current.riders,
          ...overlaysRef.current.users,
          ...overlaysRef.current.competitors,
          ...overlaysRef.current.routes
        ];
        if (flatList.length > 0) {
          map.remove(flatList);
        }
      } catch (e) {
        console.warn('Error clearing AMap overlays:', e);
      }
      overlaysRef.current = {
        polygons: [],
        stores: [],
        storeRadii: [],
        trucks: [],
        truckRadii: [],
        riders: [],
        users: [],
        competitors: [],
        routes: [],
        trafficLayer: null,
        heatMap: null
      };
    };

    clearAllOverlays();

    // 2.1 实时路况图层 (如果开启)
    if (layerVisibility.realtimeTraffic && AMap.TileLayer?.Traffic) {
      try {
        const traffic = new AMap.TileLayer.Traffic({
          zIndex: 10,
          autoRefresh: true,
          interval: 60
        });
        traffic.setMap(map);
        overlaysRef.current.trafficLayer = traffic;
      } catch (e) {
        console.warn('Traffic layer error:', e);
      }
    }

    // 2.2 渲染区经理网格 (Polygon + Centroid Marker)
    if (layerVisibility.mesh) {
      zones.forEach((zone) => {
        const path = polygonPointsToLngLats(zone.polygonPoints);
        const polygon = new AMap.Polygon({
          path,
          strokeColor: '#1a1c1b',
          strokeWeight: 1.5,
          strokeOpacity: 0.85,
          strokeStyle: 'dashed',
          strokeDasharray: [6, 4],
          fillColor: '#f4f4f2',
          fillOpacity: 0.28,
          zIndex: 12,
          cursor: 'pointer'
        });

        polygon.on('click', () => {
          onSelectEntity({ type: 'zone', id: zone.id });
          showToast(`已选中网格：${zone.name} (${zone.code})`);
        });

        // 网格名称居中文字标牌
        const centerLngLat = canvasToLngLat(zone.centerCoords);
        const textMarker = new AMap.Text({
          text: `${zone.name}\n[${zone.code}] 责任人: ${zone.managerName}`,
          position: centerLngLat,
          anchor: 'center',
          style: {
            'padding': '4px 10px',
            'border-radius': '6px',
            'background-color': 'rgba(255, 255, 255, 0.94)',
            'border': '1px solid #1a1c1b',
            'font-size': '10px',
            'font-weight': 'bold',
            'color': '#1a1c1b',
            'box-shadow': '0 2px 8px rgba(0,0,0,0.08)',
            'text-align': 'center',
            'cursor': 'pointer'
          },
          zIndex: 14
        });
        textMarker.on('click', () => {
          onSelectEntity({ type: 'zone', id: zone.id });
        });

        map.add([polygon, textMarker]);
        overlaysRef.current.polygons.push(polygon, textMarker);
      });
    }

    // 2.3 渲染固定门店点位 (Concentric Target DOM Marker + Service Radius)
    if (layerVisibility.store) {
      stores.forEach((store) => {
        const lngLat = canvasToLngLat(store.coords);

        // 服务辐射圈 (高精多阶雷达波扫描范围可视化)
        if (layerVisibility.storeRadius) {
          const maxRadius = store.serviceRadiusMeters || 800;
          // 外层 800m 雷达边界圈
          const outerRadiusCircle = new AMap.Circle({
            center: lngLat,
            radius: maxRadius,
            strokeColor: '#d97706',
            strokeWeight: 1.8,
            strokeOpacity: 0.85,
            strokeStyle: 'dashed',
            strokeDasharray: [6, 4],
            fillColor: '#d97706',
            fillOpacity: 0.08,
            zIndex: 15
          });
          // 中阶 500m 极速送达圈
          const midRadiusCircle = new AMap.Circle({
            center: lngLat,
            radius: Math.round(maxRadius * 0.625),
            strokeColor: '#d97706',
            strokeWeight: 1.2,
            strokeOpacity: 0.6,
            strokeStyle: 'dashed',
            strokeDasharray: [4, 4],
            fillColor: '#d97706',
            fillOpacity: 0.04,
            zIndex: 14
          });
          // 内阶 250m 堂食与即配核心圈
          const innerRadiusCircle = new AMap.Circle({
            center: lngLat,
            radius: Math.round(maxRadius * 0.312),
            strokeColor: '#d97706',
            strokeWeight: 1,
            strokeOpacity: 0.45,
            strokeStyle: 'solid',
            fillColor: '#d97706',
            fillOpacity: 0.03,
            zIndex: 13
          });
          map.add([outerRadiusCircle, midRadiusCircle, innerRadiusCircle]);
          overlaysRef.current.storeRadii.push(outerRadiusCircle, midRadiusCircle, innerRadiusCircle);
        }

        // 黑曜石琥珀金靶环高精 DOM 锚点 + 店铺营业情况小组件
        const content = document.createElement('div');
        content.className = 'cursor-pointer select-none';
        content.style.transition = 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
        content.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <!-- 琥珀金店铺靶环锚点 -->
            <div style="position: relative; width: 30px; height: 30px; border-radius: 50%; background: #ffffff; border: 2.5px solid #d97706; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35); flex-shrink: 0;">
              <div style="position: absolute; inset: -3px; border-radius: 50%; border: 1.5px solid #d97706; opacity: 0.45;"></div>
              <div style="width: 11px; height: 11px; border-radius: 50%; background: #d97706;"></div>
            </div>
            <!-- 店铺营业情况小组件 (紧凑胶囊) -->
            <div style="padding: 4px 8px; border-radius: 8px; background: rgba(255, 255, 255, 0.98); border: 1.5px solid #d97706; box-shadow: 0 4px 14px rgba(0,0,0,0.12); display: flex; flex-direction: column; gap: 2px; white-space: nowrap;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                <span style="font-size: 11px; font-weight: 800; color: #1a1c1b;">${store.name}</span>
                <span style="font-size: 8.5px; font-weight: 700; padding: 1px 4px; border-radius: 4px; background: #eaf7ee; color: #006d36;">
                  ● ${store.status === 'open' ? '营业中' : store.status === 'paused' ? '暂停' : '异常'}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 5px; font-size: 9px; color: #474741; font-family: 'Space Grotesk', sans-serif;">
                <span style="color: #006d36; font-weight: 700;">¥${store.revenue.toLocaleString()}</span>
                <span style="color: #d5d5d0;">|</span>
                <span>${store.todayOrders}单</span>
                <span style="color: #d5d5d0;">|</span>
                <span>${store.stationedRiders}骑手</span>
              </div>
            </div>
          </div>
        `;

        content.onmouseenter = () => {
          content.style.transform = 'scale(1.08)';
        };
        content.onmouseleave = () => {
          content.style.transform = 'scale(1)';
        };

        const marker = new AMap.Marker({
          position: lngLat,
          content,
          offset: new AMap.Pixel(-15, -15),
          zIndex: 35
        });

        marker.on('click', () => {
          // 获取锚点在屏幕视窗中的像素位置，以严格在锚点右侧弹窗显示
          let screenX = 400;
          let screenY = 200;
          if (mapInstanceRef.current && mapContainerRef.current) {
            const pixel = mapInstanceRef.current.lngLatToContainer(lngLat);
            const rect = mapContainerRef.current.getBoundingClientRect();
            screenX = rect.left + pixel.getX();
            screenY = rect.top + pixel.getY();
          }
          onSelectEntity({ type: 'store', id: store.id, screenPos: { x: screenX, y: screenY } });
        });

        map.add(marker);
        overlaysRef.current.stores.push(marker);
      });
    }

    // 2.4 渲染流动餐车站桩 (Truck DOM Marker + Coverage Radius)
    if (layerVisibility.truck) {
      trucks.forEach((truck) => {
        const lngLat = canvasToLngLat(truck.coords);
        const isOpen = truck.status === 'open';
        const isFault = truck.status === 'fault' || truck.pendingQueue > 10;

        // 餐车覆盖辐射圈
        if (layerVisibility.truckRadius) {
          const truckRadiusCircle = new AMap.Circle({
            center: lngLat,
            radius: truck.coverageRadiusMeters || 350,
            strokeColor: isFault ? '#ba1a1a' : '#006d36',
            strokeWeight: 1.2,
            strokeOpacity: 0.65,
            strokeStyle: 'dashed',
            strokeDasharray: [4, 3],
            fillColor: isFault ? '#ba1a1a' : '#006d36',
            fillOpacity: 0.05,
            zIndex: 16
          });
          map.add(truckRadiusCircle);
          overlaysRef.current.truckRadii.push(truckRadiusCircle);
        }

        const content = document.createElement('div');
        content.className = 'cursor-pointer select-none';
        content.style.transition = 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
        content.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="position: relative; width: 32px; height: 32px; border-radius: 9px; background: ${isFault ? '#ba1a1a' : '#1a1c1b'}; border: 2px solid ${isOpen ? '#006d36' : '#787770'}; color: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.28);">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              ${isOpen ? `<span style="position: absolute; top: -3px; right: -3px; width: 9px; height: 9px; border-radius: 50%; background: #006d36; border: 2px solid #ffffff; box-shadow: 0 0 6px #006d36;"></span>` : ''}
            </div>
            <div style="margin-top: 3px; padding: 2px 7px; border-radius: 5px; background: rgba(255, 255, 255, 0.96); border: 1px solid ${isFault ? '#ba1a1a' : '#006d36'}; font-size: 9px; font-weight: 700; color: #1a1c1b; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: flex; align-items: center; gap: 4px;">
              <span style="color: ${isOpen ? '#006d36' : '#787770'};">●</span>
              <span>${truck.name}</span>
              <span style="font-size: 8px; padding: 0.5px 3px; border-radius: 3px; background: ${isFault ? '#ffebee' : '#f0fdf4'}; color: ${isFault ? '#ba1a1a' : '#006d36'}; font-family: 'Space Grotesk', sans-serif;">
                ${truck.pendingQueue > 0 ? `${truck.pendingQueue}单排队` : '在岗出餐'}
              </span>
            </div>
          </div>
        `;

        content.onmouseenter = () => {
          content.style.transform = 'scale(1.12)';
        };
        content.onmouseleave = () => {
          content.style.transform = 'scale(1)';
        };

        const marker = new AMap.Marker({
          position: lngLat,
          content,
          offset: new AMap.Pixel(-16, -16),
          zIndex: 42
        });

        marker.on('click', () => {
          onSelectEntity({ type: 'truck', id: truck.id });
          map.panTo(lngLat);
        });

        map.add(marker);
        overlaysRef.current.trucks.push(marker);
      });
    }

    // 2.5 渲染配送骑手在途轨迹与位置 (Rider DOM Marker)
    if (layerVisibility.rider) {
      riders.forEach((rider) => {
        const lngLat = canvasToLngLat(rider.coords);
        const hasOrders = rider.activeOrders && rider.activeOrders.length > 0;
        const isSelected = selectedRiderId === rider.id;
        const shouldDrawRoute = isSelected || showAllRiderRoutes;

        const content = document.createElement('div');
        content.className = 'cursor-pointer select-none';
        content.style.transition = 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
        content.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; position: relative;">
            ${isSelected ? `
              <div style="position: absolute; top: -7px; left: -7px; width: 40px; height: 40px; border-radius: 50%; border: 2px dashed #d97706; animation: spin 4s linear infinite; pointer-events: none;"></div>
            ` : ''}
            <div style="position: relative; width: ${isSelected ? '28px' : '26px'}; height: ${isSelected ? '28px' : '26px'}; border-radius: 50%; background: ${isSelected ? '#d97706' : '#1a1c1b'}; border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: ${isSelected ? '0 0 16px rgba(217, 119, 6, 0.6)' : '0 4px 12px rgba(0,0,0,0.22)'};">
              <span style="font-family: 'Space Grotesk', sans-serif; font-size: 9px; font-weight: 800; color: #ffffff;">${rider.code.replace('RD-', '')}</span>
              ${hasOrders ? `<span style="position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; border-radius: 50%; background: #006d36; border: 1.5px solid #ffffff;"></span>` : ''}
            </div>
            <div style="margin-top: 2px; padding: 1px 6px; border-radius: 4px; background: ${isSelected ? '#d97706' : '#1a1c1b'}; color: #ffffff; font-size: 8.5px; font-family: 'Space Grotesk', sans-serif; font-weight: 700; white-space: nowrap; display: flex; align-items: center; gap: 3px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
              <span>${rider.name}</span>
              <span style="color: ${isSelected ? '#fef3c7' : '#4ade80'};">${rider.speedKmh}km/h</span>
              ${isSelected ? `<span style="background: #ffffff; color: #d97706; font-size: 7.5px; padding: 0 3px; border-radius: 2px;">追踪中</span>` : ''}
            </div>
          </div>
        `;

        content.onmouseenter = () => {
          content.style.transform = 'scale(1.15)';
        };
        content.onmouseleave = () => {
          content.style.transform = 'scale(1)';
        };

        const marker = new AMap.Marker({
          position: lngLat,
          content,
          offset: new AMap.Pixel(-14, -14),
          zIndex: isSelected ? 50 : 38
        });

        marker.on('click', () => {
          onSelectEntity({ type: 'rider', id: rider.id });
          onSelectRider?.(rider.id);
          map.panTo(lngLat);
        });

        map.add(marker);
        overlaysRef.current.riders.push(marker);

        // 如果骑手有在途订单，且满足筛选条件时，绘制配送折线与落点
        if (hasOrders && shouldDrawRoute) {
          rider.activeOrders.forEach((order) => {
            if (!order.pickupCoords || !order.dropoffCoords) return;
            const path = order.path && order.path.length > 0
              ? order.path.map((pt) => canvasToLngLat(pt))
              : [
                  canvasToLngLat(order.pickupCoords),
                  lngLat,
                  canvasToLngLat(order.dropoffCoords)
                ];
            const polyline = new AMap.Polyline({
              path,
              strokeColor: isSelected ? '#d97706' : '#1a1c1b',
              strokeWeight: isSelected ? 3.5 : 2,
              strokeOpacity: isSelected ? 0.95 : 0.65,
              strokeStyle: 'dashed',
              strokeDasharray: isSelected ? [6, 4] : [5, 4],
              zIndex: isSelected ? 32 : 26
            });
            map.add(polyline);
            overlaysRef.current.routes.push(polyline);

            // 如果当前正在追踪此骑手，在落点绘制专用送达 Pin 锚点
            if (isSelected) {
              const dropoffLngLat = canvasToLngLat(order.dropoffCoords);
              const dropoffContent = document.createElement('div');
              dropoffContent.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center;">
                  <div style="width: 14px; height: 14px; border-radius: 50%; background: #ba1a1a; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(186, 26, 26, 0.6);"></div>
                  <div style="font-size: 8px; background: rgba(26,28,27,0.9); color: #fff; padding: 1px 4px; border-radius: 3px; white-space: nowrap; margin-top: 2px;">
                    ${order.orderNo.slice(-6)} 交付点
                  </div>
                </div>
              `;
              const dropoffMarker = new AMap.Marker({
                position: dropoffLngLat,
                content: dropoffContent,
                offset: new AMap.Pixel(-7, -7),
                zIndex: 35
              });
              map.add(dropoffMarker);
              overlaysRef.current.routes.push(dropoffMarker);
            }
          });
        }
      });
    }

    // 2.6 渲染终端用户散点/高密度客群聚类 (受 layerVisibility.userPoints 控制)
    if (layerVisibility.userPoints !== false) {
      users.forEach((u) => {
        const lngLat = canvasToLngLat(u.coords);
        if (u.isCluster) {
          const content = document.createElement('div');
          content.className = 'cursor-pointer select-none';
          content.style.whiteSpace = 'nowrap';
          content.style.width = 'max-content';
          content.innerHTML = `
            <div style="white-space: nowrap !important; width: max-content !important; min-width: max-content; padding: 2.5px 8px; border-radius: 12px; background: rgba(37, 99, 235, 0.95); border: 1.5px solid #ffffff; font-size: 8.5px; font-weight: 700; color: #ffffff; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 10px rgba(37, 99, 235, 0.35);">
              <span style="width: 5px; height: 5px; border-radius: 50%; background: #ffffff; flex-shrink: 0;"></span>
              <span style="white-space: nowrap !important; display: inline-block;">${u.clusterCount}人客群</span>
            </div>
          `;
          const marker = new AMap.Marker({
            position: lngLat,
            content,
            offset: new AMap.Pixel(-30, -12),
            zIndex: 24
          });
          marker.on('click', () => {
            showToast(`定位至高密客群聚类：${u.zoneName} (${u.clusterCount}人在线)`);
          });
          map.add(marker);
          overlaysRef.current.users.push(marker);
        } else {
          const circle = new AMap.CircleMarker({
            center: lngLat,
            radius: 3.5,
            fillColor: '#2563eb',
            fillOpacity: 0.65,
            strokeColor: '#ffffff',
            strokeWeight: 1.2,
            zIndex: 20,
            cursor: 'pointer'
          });
          circle.on('click', () => {
            showToast(`定位至在线食客 ${u.phoneMask} (${u.zoneName})`);
          });
          map.add(circle);
          overlaysRef.current.users.push(circle);
        }
      });
    }

    // 2.7 渲染客流需求热力图 (受 layerVisibility.demandHeat 控制)
    if (layerVisibility.demandHeat && AMap.HeatMap) {
      try {
        const heatmapData = users.map((u) => {
          const [lng, lat] = canvasToLngLat(u.coords);
          return {
            lng,
            lat,
            count: u.isCluster ? (u.clusterCount || 12) : 1
          };
        });
        const heatMap = new AMap.HeatMap(map, {
          radius: 38,
          opacity: [0, 0.72],
          gradient: {
            0.4: '#3b82f6',
            0.65: '#10b981',
            0.85: '#f59e0b',
            1.0: '#ba1a1a'
          },
          zIndex: 18
        });
        heatMap.setDataSet({
          data: heatmapData,
          max: 20
        });
        overlaysRef.current.heatMap = heatMap;
      } catch (e) {
        console.warn('Heatmap layer error:', e);
      }
    }

    // 2.8 渲染竞争对手情报点位 (黑白高对比带 X 菱形雷达点)
    if (showCompetitorRadar) {
      competitors.forEach((c) => {
        const lngLat = canvasToLngLat(c.coords);
        const isHigh = c.threatLevel === 'high';

        const content = document.createElement('div');
        content.className = 'cursor-pointer select-none';
        content.style.transition = 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
        content.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="position: relative; width: 24px; height: 24px; transform: rotate(45deg); background: #1a1c1b; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.35);">
              <span style="transform: rotate(-45deg); color: #ffffff; font-size: 11px; font-weight: 900; line-height: 1;">✕</span>
            </div>
            <div style="margin-top: 5px; padding: 2px 7px; border-radius: 4px; background: rgba(255, 255, 255, 0.96); border: 1px solid #1a1c1b; font-size: 9px; font-weight: 800; color: #1a1c1b; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 4px;">
              <span>${c.name}</span>
              <span style="font-size: 7.5px; padding: 0.5px 3px; border-radius: 2px; ${isHigh ? 'background: #ba1a1a; color: #ffffff;' : 'background: #f4f4f2; color: #474741;'}">
                ${isHigh ? '高威胁' : '中威胁'}
              </span>
            </div>
          </div>
        `;

        content.onmouseenter = () => {
          content.style.transform = 'scale(1.15)';
        };
        content.onmouseleave = () => {
          content.style.transform = 'scale(1)';
        };

        const marker = new AMap.Marker({
          position: lngLat,
          content,
          offset: new AMap.Pixel(-12, -12),
          zIndex: 50
        });

        marker.on('click', () => {
          let screenX = 500;
          let screenY = 250;
          if (mapInstanceRef.current && mapContainerRef.current) {
            const pixel = mapInstanceRef.current.lngLatToContainer(lngLat);
            const rect = mapContainerRef.current.getBoundingClientRect();
            screenX = rect.left + pixel.getX();
            screenY = rect.top + pixel.getY();
          }
          if (onSelectCompetitor) {
            onSelectCompetitor(c.name, c, { x: screenX, y: screenY });
          }
          showToast(`已选定竞品：${c.name} (${c.category} · ${isHigh ? '高威胁' : '中威胁'})`);
          map.panTo(lngLat);
        });

        map.add(marker);
        overlaysRef.current.competitors.push(marker);
      });
    }

    // 2.9 钢笔工具绘制区经理多边形网格层实时预览 (AMap)
    if (activeTool === 'draw_polygon' && drawingPoints && drawingPoints.length > 0) {
      const drawLngLats = drawingPoints.map((pt) => canvasToLngLat(pt));
      if (drawLngLats.length >= 2) {
        const drawPolyline = new AMap.Polyline({
          path: drawLngLats,
          strokeColor: '#006d36',
          strokeWeight: 2.5,
          strokeOpacity: 0.9,
          strokeStyle: 'dashed',
          strokeDasharray: [5, 4],
          zIndex: 55
        });
        map.add(drawPolyline);
        overlaysRef.current.routes.push(drawPolyline);
      }

      // 每个锚点节点绘制高精圆环
      drawingPoints.forEach((pt, idx) => {
        const ptContent = document.createElement('div');
        ptContent.innerHTML = `
          <div style="width: 14px; height: 14px; border-radius: 50%; background: #006d36; border: 2.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 7.5px; font-weight: 800;">
            ${idx + 1}
          </div>
        `;
        const ptMarker = new AMap.Marker({
          position: canvasToLngLat(pt),
          content: ptContent,
          offset: new AMap.Pixel(-7, -7),
          zIndex: 60
        });
        map.add(ptMarker);
        overlaysRef.current.routes.push(ptMarker);
      });
    }
  }, [
    zones,
    stores,
    trucks,
    riders,
    users,
    competitors,
    layerVisibility,
    showCompetitorRadar,
    activeTool,
    drawingPoints,
    mapStatus,
    onSelectEntity,
    onSelectCompetitor,
    showToast
  ]);

  // 处理输入并保存 Key
  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      showToast('请输入有效的高德 Web端/JSAPI Key');
      return;
    }
    localStorage.setItem('URBAN_RADAR_AMAP_KEY', inputKey.trim());
    if (inputSec.trim()) {
      localStorage.setItem('URBAN_RADAR_AMAP_SEC', inputSec.trim());
      if (typeof window !== 'undefined') {
        (window as any)._AMapSecurityConfig = {
          securityJsCode: inputSec.trim()
        };
      }
    } else {
      localStorage.removeItem('URBAN_RADAR_AMAP_SEC');
    }

    try {
      (AMapLoader as any).reset?.();
    } catch (e) {
      // ignore reset warning
    }

    setCurrentAmapKey(inputKey.trim());
    setCurrentSecurityCode(inputSec.trim());
    setShowKeyConfigModal(false);
    showToast('已更新高德地图 Key 与安全密钥，正在重新加载底图引擎...');
  };

  return (
    <div className="relative w-full h-full bg-white select-none">
      {/* 高德地图挂载容器 */}
      <div ref={mapContainerRef} className="w-full h-full z-0" style={{ background: '#ffffff' }} />

      {/* 顶部微态势控制条 (高德引擎激活) */}
      <div className="absolute top-3 left-16 z-30 flex items-center gap-2 pointer-events-auto">
        <div className="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur border border-[#e4e2dc] shadow-sm flex items-center gap-2 text-[#1a1c1b] text-xs">
          <span className="w-2 h-2 rounded-full bg-[#006d36] animate-pulse" />
          <span className="font-bold">高德地图 2.0 (AMap Web API)</span>
          <span className="text-[10px] text-[#787770] font-mono">GCJ-02 · 白模路网</span>
          <button
            type="button"
            onClick={() => {
              setInputKey(currentAmapKey);
              setInputSec(currentSecurityCode);
              setShowKeyConfigModal(true);
            }}
            className="ml-1 p-1 hover:bg-[#f4f4f2] rounded-md text-[#787770] hover:text-[#1a1c1b] transition-colors cursor-pointer"
            title="配置/更新高德 API Key 与安全密钥"
          >
            <Key className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 视角切换中枢：2D 俯视 / 3D 鸟瞰 */}
        <button
          type="button"
          onClick={() => {
            if (onTogglePerspective) {
              onTogglePerspective();
            } else {
              const map = mapInstanceRef.current;
              if (map) {
                const pitch = map.getPitch?.() || 0;
                map.setPitch(pitch > 10 ? 0 : 52);
                map.setRotation(pitch > 10 ? 0 : 18);
              }
            }
          }}
          className={`px-2.5 py-1.5 rounded-xl border shadow-sm text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
            viewPerspective === '3d'
              ? 'bg-[#1a1c1b] text-white border-[#1a1c1b]'
              : 'bg-white/95 backdrop-blur border-[#e4e2dc] text-[#1a1c1b] hover:bg-[#f4f4f2]'
          }`}
          title="切换 2D 垂直俯视 / 3D 倾角鸟瞰视角"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{viewPerspective === '3d' ? '3D 鸟瞰倾角' : '2D 垂直俯视'}</span>
        </button>

        <button
          type="button"
          onClick={handleFitAllViews}
          className="px-2.5 py-1.5 rounded-xl bg-white/95 backdrop-blur border border-[#e4e2dc] shadow-sm text-xs font-medium text-[#1a1c1b] hover:bg-[#f4f4f2] cursor-pointer transition-colors flex items-center gap-1.5"
          title="全域自适应居中视角"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>全域居中</span>
        </button>

        <button
          type="button"
          onClick={onSwitchToSandbox}
          className="px-2.5 py-1.5 rounded-xl bg-white/95 backdrop-blur border border-[#e4e2dc] shadow-sm text-xs font-medium text-[#1a1c1b] hover:bg-[#f4f4f2] cursor-pointer transition-colors"
          title="切回高帧率数字孪生仿真沙盘"
        >
          切回仿真沙盘
        </button>

        {activeTool === 'draw_polygon' && (
          <div className="px-2.5 py-1.5 rounded-xl bg-[#006d36] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 animate-pulse">
            <PenTool className="w-3.5 h-3.5" />
            <span>网格钢笔绘制中: 已落点 {drawingPoints.length} 处</span>
          </div>
        )}
      </div>

      {/* 加载状态指示 */}
      {mapStatus === 'loading' && (
        <div className="absolute inset-0 z-20 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#1a1c1b] animate-spin" />
          <div className="text-sm font-bold text-[#1a1c1b]">正在加载高德地图 2.0 矢量底图引擎...</div>
          <p className="text-xs text-[#787770]">正在载入上海静安·苏河湾全域 GCJ-02 路网与网格坐标系</p>
        </div>
      )}

      {/* 异常提示与一键降级面板 */}
      {mapStatus === 'error' && (
        <div className="absolute inset-0 z-20 bg-white/95 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#f4f4f2] border border-[#e4e2dc] flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 text-[#1a1c1b]" />
          </div>
          <h3 className="text-base font-bold text-[#1a1c1b] mb-1">高德地图服务初始化提示</h3>
          <p className="text-xs text-[#787770] max-w-md mb-4 leading-relaxed">
            {errorMessage || '当前环境尚未配置高德 JS API 开发者 Key，或密钥权限限制访问。'}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setInputKey(currentAmapKey);
                setInputSec(currentSecurityCode);
                setShowKeyConfigModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#1a1c1b] hover:bg-black text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              配置高德 Key / 安全密钥
            </button>
            <button
              type="button"
              onClick={onSwitchToSandbox}
              className="px-4 py-2 rounded-xl bg-white border border-[#e4e2dc] hover:bg-[#f4f4f2] text-[#1a1c1b] text-xs font-bold shadow-xs cursor-pointer"
            >
              立即使用内置数字孪生沙盘
            </button>
          </div>
        </div>
      )}

      {/* 高德 Key 配置弹窗 */}
      {showKeyConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#e4e2dc] shadow-2xl w-full max-w-md p-5 text-[#1a1c1b] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#e4e2dc]">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#1a1c1b]" />
                <h3 className="font-bold text-sm text-[#1a1c1b]">高德开放平台凭证配置</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyConfigModal(false)}
                className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-[#f4f4f2] text-[#787770] hover:text-[#1a1c1b] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKeys} className="pt-4 flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block text-[#474741] font-medium mb-1">
                  高德 Web 端 (JS API) Key:
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：68a183... (高德开放平台控制台申请)"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e4e2dc] text-[#1a1c1b] focus:outline-none focus:border-[#1a1c1b]"
                />
              </div>

              <div>
                <label className="block text-[#474741] font-medium mb-1">
                  高德安全密钥 (Security Code):
                </label>
                <input
                  type="text"
                  placeholder="2021年12月后新申请Key必填对应安全密钥"
                  value={inputSec}
                  onChange={(e) => setInputSec(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e4e2dc] text-[#1a1c1b] focus:outline-none focus:border-[#1a1c1b]"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-[#f9f9f7] border border-[#e4e2dc] text-[11px] text-[#787770] leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1a1c1b] shrink-0 mt-0.5" />
                <span>
                  本系统支持将密钥保存在本地浏览器环境并即时生效。您也可以在项目根目录 <code className="font-mono text-[#1a1c1b]">.env</code> 中配置 <code className="font-mono text-[#1a1c1b]">VITE_AMAP_KEY</code> 与 <code className="font-mono text-[#1a1c1b]">VITE_AMAP_SECURITY_CODE</code>。
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e4e2dc]">
                <button
                  type="button"
                  onClick={() => setShowKeyConfigModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#e4e2dc] hover:bg-[#f4f4f2] text-[#474741] font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#1a1c1b] hover:bg-black text-white font-bold cursor-pointer shadow-xs"
                >
                  保存并加载引擎
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
