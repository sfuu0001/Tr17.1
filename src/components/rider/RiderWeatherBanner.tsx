import React from 'react';
import {
  CloudRain,
  ShieldAlert,
  Zap,
  TrendingUp,
  AlertTriangle,
  Sun,
  Wind
} from 'lucide-react';

interface RiderWeatherBannerProps {
  isBadWeather: boolean;
  weatherType: 'rain' | 'heat' | 'normal';
  surgeBonusAmount: number;
  onToggleWeatherSim: () => void;
  showToast: (msg: string) => void;
}

export const RiderWeatherBanner: React.FC<RiderWeatherBannerProps> = ({
  isBadWeather,
  weatherType,
  surgeBonusAmount,
  onToggleWeatherSim,
  showToast
}) => {
  return (
    <div className={`p-2.5 rounded-[3px] border flex items-center justify-between gap-3 text-xs transition-all ${
      isBadWeather
        ? 'bg-[#fdf8f0] border-[#ecd9a8] text-[#8f6412]'
        : 'bg-[#f7f7f5] border-[#e6e6e4] text-[#5a5854]'
    }`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
          isBadWeather
            ? 'bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8]'
            : 'bg-[#e8e8e6] text-[#787774]'
        }`}>
          {isBadWeather ? <CloudRain className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-semibold ${isBadWeather ? 'text-[#8f6412]' : 'text-[#37352f]'}`}>
              {isBadWeather ? '恶劣气象动态加价生效中' : '当前区域天气良好'}
            </span>
            {isBadWeather && (
              <span className="font-mono text-[10px] font-semibold bg-[#fbf3db] text-[#8f6412] px-1.5 py-0.2 rounded border border-[#ecd9a8]">
                每单加津贴 +¥{surgeBonusAmount.toFixed(2)} · 超时全免考核
              </span>
            )}
          </div>
          <p className={`text-[10.5px] truncate ${isBadWeather ? 'text-[#8f6412]/80' : 'text-[#787774]'}`}>
            {isBadWeather
              ? '路面湿滑，请控制骑行时速 ≤20km/h，已自动开启保温箱密封'
              : '微风 24℃ · 骑行体感舒适，适合高频短距接单'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          onToggleWeatherSim();
          showToast(isBadWeather ? '已切回常规晴好天气' : '已开启暴雨天气动态加价');
        }}
        className={`px-2.5 py-1 rounded-[3px] text-[11px] font-semibold shrink-0 whitespace-nowrap cursor-pointer transition-colors border ${
          isBadWeather
            ? 'bg-white hover:bg-[#fbf3db] text-[#8f6412] border-[#ecd9a8]'
            : 'bg-white hover:bg-[#efefed] text-[#37352f] border-[#d3d1cb]'
        }`}
      >
        {isBadWeather ? '切回晴天' : '开启暴雨加价'}
      </button>
    </div>
  );
};
