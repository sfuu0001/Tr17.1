import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Crosshair, Loader2, LocateFixed, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  reverseGeocodeCoordinate,
  requestBrowserGeolocation,
  isEmbeddedFrame,
  GeoBlockReason
} from '../utils/truckLocationEngine';

/* ============================================================
 * 迷你中心准星地图 (顾客端选点用, 美团/京东收货地址同款)
 * - 中心黑色锚固定, 拖动地图 = 移动选点
 * - 松手自动逆地理回填 onResolve(locationName, addressDetail)
 * - 支持 GPS: 点按钮收敛定位并飞达
 * - 高德中文瓦片 (GCJ-02 对齐)
 * ============================================================ */

declare global {
  interface Window {
    L: any;
  }
}

const TILE_AMAP = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}';
const TILE_FALLBACK = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

interface CenterAnchorMapProps {
  initialLat: number;
  initialLng: number;
  height?: number;
  onResolve?: (name: string, detail: string, lat: number, lng: number) => void;
  /** 外部飞行目标 */
  flyTo?: { lat: number; lng: number; seq: number } | undefined;
  autoGpsOnMount?: boolean;
}

export const CenterAnchorMap: React.FC<CenterAnchorMapProps> = ({
  initialLat,
  initialLng,
  height = 220,
  onResolve,
  flyTo,
  autoGpsOnMount = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const accRef = useRef<any>(null);
  const reverseSeq = useRef(0);
  const timerRef = useRef<number | null>(null);

  const onResolveRef = useRef(onResolve);
  onResolveRef.current = onResolve;

  const [status, setStatus] = useState<'loading' | 'ready' | 'fail'>('loading');
  const [gpsState, setGpsState] = useState<'idle' | 'locating'>('idle');
  const [resolving, setResolving] = useState(false);
  const [resolvedName, setResolvedName] = useState('');
  const [gpsAcc, setGpsAcc] = useState<number | undefined>(undefined);
  const [warn, setWarn] = useState<string | null>(null);

  const embed = isEmbeddedFrame();

  const reverseCenter = useCallback((la: number, ln: number) => {
    const seq = ++reverseSeq.current;
    setResolving(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      const res = await reverseGeocodeCoordinate(la, ln);
      if (reverseSeq.current !== seq) return;
      setResolving(false);
      if (res) {
        setResolvedName(res.locationName);
        onResolveRef.current?.(res.locationName, res.addressDetail, la, ln);
      } else {
        setResolvedName('');
        onResolveRef.current?.('', `LAT ${la.toFixed(6)}, LNG ${ln.toFixed(6)}`, la, ln);
      }
    }, 200);
  }, []);

  // init
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
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const amap = L.tileLayer(TILE_AMAP, {
        maxZoom: 18,
        subdomains: '1234',
        attribution: '© 高德地图',
        className: 'minimal-flat-map-tile'
      }).addTo(map);
      (amap as any).on('tileerror', () => {
        if (!(map as any)._tileSwapped) {
          (map as any)._tileSwapped = true;
          map.removeLayer(amap);
          L.tileLayer(TILE_FALLBACK, { maxZoom: 19, subdomains: 'abc', className: 'minimal-flat-map-tile' }).addTo(map);
        }
      });

      let settleTimer: number | null = null;
      map.on('moveend', () => {
        const c = map.getCenter();
        if (settleTimer) window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => reverseCenter(c.lat, c.lng), 80);
      });
      map.on('click', (e: any) => map.panTo(e.latlng, { animate: true, duration: 0.3 }));

      setStatus('ready');
      setTimeout(() => map.invalidateSize(), 150);
      reverseCenter(initialLat, initialLng);
      if (autoGpsOnMount) handleGps();
    };

    const handleGps = async () => {
      if (!mapRef.current || gpsState === 'locating') return;
      setGpsState('locating');
      setWarn(null);
      const res = await requestBrowserGeolocation();
      setGpsState('idle');
      if (res.success && res.latitude) {
        mapRef.current.setView([res.latitude, res.longitude], 17, { animate: true });
        if (accRef.current) mapRef.current.removeLayer(accRef.current);
        accRef.current = window.L.circle([res.latitude, res.longitude], {
          radius: Math.max(res.accuracy, 20),
          color: '#1a1c1b',
          weight: 1.2,
          fillColor: '#1a1c1b',
          fillOpacity: 0.1
        }).addTo(mapRef.current);
        setGpsAcc(res.accuracy);
        reverseCenter(res.latitude, res.longitude);
        setWarn(null);
      } else {
        const reason: GeoBlockReason | undefined = (res as any).blockReason;
        if (reason === 'iframe-policy') {
          setWarn('预览内嵌页拦截定位授权。可在新标签页打开后授权定位, 或用上方搜索输入地址。');
        } else if (reason === 'denied') {
          setWarn('定位权限被拒绝, 请在浏览器允许定位后重试。');
        } else {
          setWarn((res.error || '定位失败') + '。可拖动地图或用搜索选点。');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        accRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // external fly
  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    mapRef.current.flyTo([flyTo.lat, flyTo.lng], 17, { animate: true, duration: 0.6 });
    reverseCenter(flyTo.lat, flyTo.lng);
    setWarn(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTo?.seq]);

  const handleGpsBtn = async () => {
    if (!mapRef.current || gpsState === 'locating') return;
    setGpsState('locating');
    setWarn(null);
    const res = await requestBrowserGeolocation();
    setGpsState('idle');
    if (res.success && res.latitude) {
      mapRef.current.setView([res.latitude, res.longitude], 17, { animate: true });
      if (accRef.current) mapRef.current.removeLayer(accRef.current);
      accRef.current = window.L.circle([res.latitude, res.longitude], {
        radius: Math.max(res.accuracy, 20),
        color: '#1a1c1b',
        weight: 1.2,
        fillColor: '#1a1c1b',
        fillOpacity: 0.1
      }).addTo(mapRef.current);
      setGpsAcc(res.accuracy);
      reverseCenter(res.latitude, res.longitude);
    } else {
      const reason: GeoBlockReason | undefined = (res as any).blockReason;
      if (reason === 'iframe-policy') {
        setWarn('预览内嵌页拦截定位授权。可先用上方搜索输入地址, 或在新标签页打开授权。');
      } else if (reason === 'denied') {
        setWarn('定位权限被拒绝, 请在浏览器允许定位后重试。');
      } else {
        setWarn((res.error || '定位失败') + '。可拖动地图或用搜索选点。');
      }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#e6e6e4]" style={{ height }}>
      <div ref={containerRef} className="w-full h-full z-0 bg-[#eef0f2]" />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-[500]">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
          <span className="ml-2 text-xs text-[#5a5854]">地图加载中…</span>
        </div>
      )}
      {status === 'fail' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#fbfbfa] z-[500] p-3 text-center text-[11px] text-[#787774]">
          地图加载失败(网络受限), 仍可用搜索选点保存。
        </div>
      )}

      {/* 中心准星 */}
      {status === 'ready' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[400]">
          <div className="relative flex flex-col items-center">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-neutral-800/10 animate-ping pointer-events-none" />
            <svg width="30" height="42" viewBox="0 0 38 52" xmlns="http://www.w3.org/2000/svg" className="drop-shadow">
              <path
                d="M19 2 C8.5 2 4 11 4 20.5 C4 31 15 40 19 50 C23 40 34 31 34 20.5 C34 11 29.5 2 19 2 Z"
                fill="#1A1C1B"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <circle cx="19" cy="19" r="7" fill="#ffffff" stroke="#1A1C1B" strokeWidth="2" />
            </svg>
            <div className="-mt-1 w-0.5 h-4 bg-neutral-800/70" />
          </div>
        </div>
      )}

      {/* 逆地理状态 */}
      {status === 'ready' && resolving && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] font-bold rounded-full px-2.5 py-1 flex items-center gap-1.5 z-[500] shadow pointer-events-none whitespace-nowrap">
          <Loader2 className="w-3 h-3 animate-spin text-emerald-300" />
          识别中…
        </div>
      )}
      {status === 'ready' && !resolving && resolvedName && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 max-w-[78%] bg-white/95 border border-[#e6e6e4] rounded-full px-3 py-1 flex items-center gap-1.5 z-[500] shadow pointer-events-none">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          <span className="text-[10px] font-bold text-[#37352f] truncate">{resolvedName}</span>
        </div>
      )}

      {/* GPS 按钮 */}
      {status === 'ready' && (
        <button
          type="button"
          onClick={handleGpsBtn}
          disabled={gpsState === 'locating'}
          className="absolute bottom-2 right-2 bg-white/95 hover:bg-white border border-[#e6e6e4] rounded-lg px-2 py-1.5 text-[10px] font-bold text-[#37352f] flex items-center gap-1 shadow cursor-pointer disabled:opacity-50 z-[500]"
        >
          <LocateFixed className={`w-3 h-3 text-emerald-700 ${gpsState === 'locating' ? 'animate-spin' : ''}`} />
          {gpsState === 'locating' ? '定位中…' : '定位到我'}
        </button>
      )}
      {gpsAcc !== undefined && status === 'ready' && (
        <div className="absolute bottom-2 left-2 bg-emerald-700/90 text-white rounded-md px-2 py-0.5 text-[9px] font-bold z-[500] flex items-center gap-1 shadow">
          <LocateFixed className="w-2.5 h-2.5" /> ±{Math.round(gpsAcc)}m
        </div>
      )}
      {status === 'ready' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white rounded-md px-2 py-0.5 text-[9px] z-[500] flex items-center gap-1 pointer-events-none shadow whitespace-nowrap">
          <Crosshair className="w-2.5 h-2.5 text-emerald-300" />
          拖动地图选点
        </div>
      )}

      {/* 警告 */}
      {warn && (
        <div className="absolute inset-x-0 bottom-0 bg-[#fdf3e7] border-t border-[#f0d6b0] p-2 flex items-start gap-1.5 z-[600]">
          <AlertTriangle className="w-3 h-3 text-[#d9730d] shrink-0 mt-0.5" />
          <span className="text-[10px] text-[#9a5a12] leading-snug">{warn}</span>
        </div>
      )}
    </div>
  );
};
