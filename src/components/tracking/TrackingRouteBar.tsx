import React from 'react';
import { Store, MapPin, Navigation } from 'lucide-react';
import { getAmapNavigationUrls } from '../../utils/truckLocationEngine';

interface TrackingRouteBarProps {
  truckName?: string;
  distanceKm?: number;
  destinationAddress?: string;
  destLat?: number;
  destLng?: number;
}

export const TrackingRouteBar: React.FC<TrackingRouteBarProps> = ({
  truckName = '黑曜石 01 号流动餐车',
  distanceKm = 0.85,
  destinationAddress = '西藏北路 166 号大悦城商务座 1204 室',
  destLat = 31.2468,
  destLng = 121.4725
}) => {
  const handleOpenNav = () => {
    const urls = getAmapNavigationUrls(destLat, destLng, destinationAddress);
    if (typeof window !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = urls.amapUri;
        setTimeout(() => window.open(urls.webNavUrl, '_blank'), 1200);
      } else {
        window.open(urls.webNavUrl, '_blank');
      }
    }
  };

  return (
    <div className="px-4 py-3 bg-white border-b border-[#ededeb] flex items-center justify-between gap-2 text-xs">
      {/* Left: Food Truck */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Store className="w-4 h-4 text-black shrink-0" />
        <div className="font-bold text-black text-[12.5px] truncate">
          {truckName}
        </div>
      </div>

      {/* Middle Badge: AMap Distance */}
      <button
        type="button"
        onClick={handleOpenNav}
        className="bg-[#f0f0ee] hover:bg-[#e6e6e2] active:scale-95 text-[#333] text-[11px] font-bold px-2.5 py-1 flex items-center gap-1 font-sans shrink-0 rounded-full cursor-pointer border border-[#e0e0dc] transition-all"
        title="点击打开高德地图专线路径"
      >
        <Navigation className="w-3 h-3 text-emerald-600 fill-emerald-600" />
        <span>高德测距 {distanceKm} km</span>
      </button>

      {/* Right: Destination Address */}
      <div 
        onClick={handleOpenNav}
        className="flex items-center gap-1 min-w-0 flex-1 justify-end text-right cursor-pointer group"
        title="点击在高德地图中查看配送点"
      >
        <MapPin className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0 group-hover:scale-110 transition-transform" />
        <div className="font-medium text-[#222] text-[12px] truncate text-right group-hover:text-blue-600 group-hover:underline">
          {destinationAddress}
        </div>
      </div>
    </div>
  );
};

