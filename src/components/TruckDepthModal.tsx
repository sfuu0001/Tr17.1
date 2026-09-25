import React, { useState } from 'react';
import {
  X,
  MapPin,
  Compass,
  Navigation,
  Clock,
  Flame,
  ShieldCheck,
  Zap,
  Thermometer,
  BatteryCharging,
  ChefHat,
  Star,
  PhoneCall,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Info,
  Radio
} from 'lucide-react';
import { TruckInfo } from '../types';
import { getAmapNavigationUrls } from '../utils/truckLocationEngine';

interface TruckDepthModalProps {
  isOpen: boolean;
  onClose: () => void;
  truck: TruckInfo;
}

type DepthTab = 'radar' | 'schedule' | 'kitchen' | 'chef';

export const TruckDepthModal: React.FC<TruckDepthModalProps> = ({
  isOpen,
  onClose,
  truck
}) => {
  const [activeTab, setActiveTab] = useState<DepthTab>('radar');
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNavigate = () => {
    const lat = truck.latitude || 31.2425;
    const lng = truck.longitude || 121.4678;
    const urls = getAmapNavigationUrls(lat, lng, truck.name || '流动餐车停靠点');
    if (typeof window !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = urls.amapUri;
        setTimeout(() => window.open(urls.webNavUrl, '_blank'), 1200);
      } else {
        window.open(urls.webNavUrl, '_blank');
      }
    }
    setCopiedToast(`已启动高德地图导航至：${truck.name}`);
    setTimeout(() => setCopiedToast(null), 2500);
  };

  const handleCall = () => {
    setCopiedToast('正在接通餐车现场服务台 (400-882-9018)');
    setTimeout(() => setCopiedToast(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Light Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Main Container - Pure White & Crisp Minimalist Aesthetic */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#e2e3e1] overflow-hidden flex flex-col z-10 max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Floating Toast Notification */}
        {copiedToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-black text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{copiedToast}</span>
          </div>
        )}

        {/* 1. Header Banner & Cover (Pure White Background with Crisp Details) */}
        <div className="relative bg-[#fbfbf9] border-b border-[#e2e3e1] shrink-0">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#1a1c1b] border border-[#e2e3e1] shadow-xs flex items-center justify-center transition-all cursor-pointer"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-4 sm:p-5">
            {/* Top Badges */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 bg-black text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                {truck.code}
              </span>
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#006d36] border border-emerald-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                {truck.statusText}
              </span>
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 text-amber-600" />
                食安A级示范
              </span>
            </div>

            {/* Truck Title & Rating */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#1a1c1b] tracking-tight">
                  {truck.name}
                </h1>
                <p className="text-xs text-[#5c5b56] mt-0.5">
                  移动黑曜石先锋料理厨房 · 现制炭烤与星级融合料理
                </p>
              </div>

              {/* Rating Box */}
              <div className="bg-white border border-[#e2e3e1] rounded-xl px-2.5 py-1.5 text-center shadow-2xs shrink-0">
                <div className="flex items-center justify-center gap-1 text-amber-500 font-black text-sm">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{truck.rating || 4.95}</span>
                </div>
                <span className="text-[10px] text-[#787770] font-medium block mt-0.5">
                  {truck.reviewCount || 382}条评价
                </span>
              </div>
            </div>

            {/* Key Quick Stats Bar (White Cards) */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-white border border-[#e2e3e1] rounded-xl p-2 text-center shadow-2xs">
                <span className="text-[10px] font-medium text-[#787770] block">直线距离</span>
                <span className="text-sm font-bold text-black">{truck.distanceKm} km</span>
              </div>
              <div className="bg-white border border-[#e2e3e1] rounded-xl p-2 text-center shadow-2xs">
                <span className="text-[10px] font-medium text-[#787770] block">步行约耗时</span>
                <span className="text-sm font-bold text-black">{truck.walkingTimeMin || 8} 分钟</span>
              </div>
              <div className="bg-white border border-[#e2e3e1] rounded-xl p-2 text-center shadow-2xs">
                <span className="text-[10px] font-medium text-[#787770] block">今日已出餐</span>
                <span className="text-sm font-bold text-[#006d36]">{truck.totalOrdersToday} 份</span>
              </div>
            </div>
          </div>

          {/* 2. Sub Navigation Tabs */}
          <div className="flex items-center px-4 border-t border-[#e2e3e1] bg-white overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab('radar')}
              className={`py-2.5 px-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'radar'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#787770] hover:text-black'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>实时遥测与方位</span>
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`py-2.5 px-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'schedule'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#787770] hover:text-black'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>今日巡游时刻表</span>
            </button>
            <button
              onClick={() => setActiveTab('kitchen')}
              className={`py-2.5 px-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'kitchen'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#787770] hover:text-black'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>后厨设备与食安</span>
            </button>
            <button
              onClick={() => setActiveTab('chef')}
              className={`py-2.5 px-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'chef'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#787770] hover:text-black'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>主厨与品牌理念</span>
            </button>
          </div>
        </div>

        {/* 3. Tab Content Area (White & Crisp) */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-grow space-y-4 hide-scrollbar bg-white">
          {/* TAB 1: RADAR & TELEMETRY */}
          {activeTab === 'radar' && (
            <div className="space-y-4">
              {/* Radar Map Visual Card */}
              <div className="bg-[#fcfcfb] border border-[#e2e3e1] rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="relative w-36 h-36 flex items-center justify-center my-1">
                  <div className="absolute inset-0 rounded-full border border-neutral-300"></div>
                  <div className="absolute inset-3 rounded-full border border-neutral-200"></div>
                  <div className="absolute inset-6 rounded-full border border-emerald-400/40 animate-ping opacity-30"></div>

                  <div className="relative z-10 w-16 h-16 bg-white rounded-2xl border border-[#e2e3e1] shadow-xs flex flex-col items-center justify-center">
                    <Navigation className="w-6 h-6 text-black transform rotate-45 stroke-[2.5]" />
                    <span className="text-[9px] font-bold text-[#1a1c1b] mt-0.5">GPS 锁定</span>
                  </div>
                </div>

                <div className="w-full text-center mt-2">
                  <div className="text-xs font-bold text-[#1a1c1b]">
                    当前停靠点：{truck.currentLocationName}
                  </div>
                  <div className="text-[11px] text-[#787770] mt-0.5">
                    下一站：{truck.nextStopName} ({truck.nextStopEta})
                  </div>
                </div>
              </div>

              {/* Live Vehicle & Kitchen Telemetry Grid */}
              <div>
                <h3 className="text-xs font-bold text-[#1a1c1b] mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-black" />
                  <span>移动餐车实时遥测数据 (IoT 5G 联网)</span>
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white border border-[#e2e3e1] rounded-xl p-3 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-[#787770] mb-1">
                      <span className="flex items-center gap-1">
                        <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
                        动力电池电量
                      </span>
                      <span className="font-bold text-black">{truck.batteryPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${truck.batteryPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#e2e3e1] rounded-xl p-3 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-[#787770] mb-1">
                      <span className="flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5 text-blue-600" />
                        后厨冷链温控
                      </span>
                      <span className="font-bold text-black">2.8 °C</span>
                    </div>
                    <span className="text-[10px] text-[#006d36] font-medium block">
                      恒温冷鲜保鲜中
                    </span>
                  </div>

                  <div className="bg-white border border-[#e2e3e1] rounded-xl p-3 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-[#787770] mb-1">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-orange-600" />
                        炭烤炙台温度
                      </span>
                      <span className="font-bold text-black">380 °C</span>
                    </div>
                    <span className="text-[10px] text-[#787770] font-medium block">
                      果木高温锁汁
                    </span>
                  </div>

                  <div className="bg-white border border-[#e2e3e1] rounded-xl p-3 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-[#787770] mb-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-black" />
                        巡游车速 / 进度
                      </span>
                      <span className="font-bold text-black">{truck.speedKmh} km/h</span>
                    </div>
                    <span className="text-[10px] text-[#787770] font-medium block">
                      今日路线进度 {truck.routeProgress}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#1a1c1b] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-black" />
                  <span>今日巡游停靠时刻表 (静安·苏河湾线)</span>
                </h3>
                <span className="text-[10px] text-[#006d36] font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  按时运行中
                </span>
              </div>

              <div className="space-y-2.5">
                {truck.schedule &&
                  truck.schedule.map((stop, index) => {
                    const isCurrent = stop.status === 'current';
                    const isPassed = stop.status === 'passed';
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                            : isPassed
                            ? 'bg-neutral-50/70 border-[#e2e3e1] opacity-75'
                            : 'bg-white border-[#e2e3e1]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isCurrent
                                  ? 'bg-black text-white'
                                  : isPassed
                                  ? 'bg-neutral-200 text-neutral-600'
                                  : 'bg-neutral-100 text-neutral-700'
                              }`}
                            >
                              {stop.time}
                            </span>
                            <span className="text-xs font-bold text-[#1a1c1b]">
                              {stop.location}
                            </span>
                          </div>

                          {isCurrent && (
                            <span className="text-[10px] text-[#006d36] font-bold inline-flex items-center gap-1 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                              实时停靠中
                            </span>
                          )}
                          {isPassed && (
                            <span className="text-[10px] text-[#787770] font-medium shrink-0">
                              已离站
                            </span>
                          )}
                          {!isCurrent && !isPassed && (
                            <span className="text-[10px] text-amber-700 font-medium shrink-0">
                              即将到达
                            </span>
                          )}
                        </div>

                        {stop.note && (
                          <p className="text-[11px] text-[#5c5b56] mt-1.5 pl-0.5">
                            {stop.note}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 3: KITCHEN SPECS & SAFETY */}
          {activeTab === 'kitchen' && (
            <div className="space-y-3.5">
              {/* Hygiene Certificate Card */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    A级示范级移动厨房 · 食品安全全流程把控
                  </h4>
                  <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                    持有上海市市场监管局特许移动餐车经营许可。每日食材全冷链恒温直供，明厨亮灶实时可溯源。
                  </p>
                </div>
              </div>

              {/* Hardware Specs */}
              <div>
                <h4 className="text-xs font-bold text-[#1a1c1b] mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-black" />
                  <span>专业级移动后厨设备配置</span>
                </h4>
                <div className="space-y-2">
                  {truck.equipmentSpecs &&
                    truck.equipmentSpecs.map((spec, i) => (
                      <div
                        key={i}
                        className="bg-white border border-[#e2e3e1] rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-[#1a1c1b] shadow-2xs"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-medium">{spec}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CHEF & PHILOSOPHY */}
          {activeTab === 'chef' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-[#fbfbf9] border border-[#e2e3e1] flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shrink-0 font-bold text-base shadow-xs">
                  <ChefHat className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#1a1c1b]">{truck.chefName}</h4>
                    <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full font-bold">
                      主理人
                    </span>
                  </div>
                  <p className="text-xs text-[#006d36] font-medium mt-0.5">
                    {truck.chefTitle}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#e2e3e1] bg-white space-y-2 shadow-2xs">
                <h5 className="text-xs font-bold text-[#1a1c1b] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>主厨料理哲学 · 街头先锋美学</span>
                </h5>
                <p className="text-xs text-[#5c5b56] leading-relaxed">
                  "{truck.chefBio}"
                </p>
                <p className="text-xs text-[#5c5b56] leading-relaxed pt-1">
                  黑曜石流动餐车致力于将传统星级餐厅中繁琐昂贵的就餐仪式，解构为快速、灵动、充满都市烟火气的高品质手作美食。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 4. Footer Actions (White & Crisp) */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-[#e2e3e1] flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleCall}
            className="flex-1 bg-white hover:bg-neutral-50 text-[#1a1c1b] border border-[#e2e3e1] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-98"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#787770]" />
            <span>拨打餐车前台</span>
          </button>

          <button
            onClick={handleNavigate}
            className="flex-1 bg-black text-white hover:bg-neutral-800 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>高德导航前往</span>
          </button>
        </div>
      </div>
    </div>
  );
};
