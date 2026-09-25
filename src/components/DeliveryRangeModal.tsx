import React, { useState } from 'react';
import {
  X,
  MapPin,
  Truck,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Building2,
  Navigation
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  DeliveryRangeEvaluation,
  TruckLocationConfig,
  getAllTruckConfigs,
  setActiveTruckId,
  saveUserLocationState,
  getTruckTheme,
  calculateGeodesicDistanceKm,
  resolveAddressCoordinates
} from '../utils/truckLocationEngine';

interface DeliveryRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: DeliveryRangeEvaluation;
  activeTruck: TruckLocationConfig;
  onSwitchToPickup: () => void;
  onChangeAddress: () => void;
  onSelectTruck?: (truckId: string) => void;
  onRefreshGPS?: () => void;
  isLocatingGPS?: boolean;
  deliveryAddress?: string;
  cartItemCount?: number;
}

export const DeliveryRangeModal: React.FC<DeliveryRangeModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  activeTruck,
  onSwitchToPickup,
  onChangeAddress,
  onSelectTruck,
  onRefreshGPS,
  isLocatingGPS = false,
  deliveryAddress,
  cartItemCount = 0
}) => {
  const [allTrucks, setAllTrucks] = useState<TruckLocationConfig[]>(() => getAllTruckConfigs());

  if (!isOpen) return null;

  const isOutOfRange = evaluation.isOutOfRange;
  const activeTheme = getTruckTheme(activeTruck.id);
  const targetCoords = resolveAddressCoordinates(deliveryAddress || '');

  // 评估车队其它餐车到用户地址的实际距离与覆盖范围
  const candidateTrucks = allTrucks.map((t) => {
    const dist = calculateGeodesicDistanceKm(
      t.latitude,
      t.longitude,
      targetCoords.latitude,
      targetCoords.longitude
    );
    return {
      truck: t,
      distanceKm: dist,
      isInRange: dist <= t.deliveryRadiusKm,
      theme: getTruckTheme(t.id)
    };
  });

  // 检索是否有就近能送达的同车队餐车（作为首选智能接盘方案）
  const betterAlternative = isOutOfRange
    ? candidateTrucks.find((c) => c.truck.id !== activeTruck.id && c.isInRange)
    : null;

  const handleSelectAnotherTruck = (truckId: string) => {
    setActiveTruckId(truckId);
    if (onSelectTruck) onSelectTruck(truckId);
    setAllTrucks(getAllTruckConfigs());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#e2e3e1] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#e2e3e1] bg-[#f9f9f7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: isOutOfRange ? '#f59e0b' : activeTheme.color }}
            >
              {isOutOfRange ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-black">餐车地理位置与配送范围诊断</h3>
                <span
                  className="text-[9.5px] px-1.5 py-0.2 rounded tabular-nums font-bold"
                  style={{
                    backgroundColor: `${activeTheme.color}20`,
                    color: activeTheme.color
                  }}
                >
                  {activeTheme.num}号车 · {activeTheme.themeTitle}
                </span>
              </div>
              <p className="text-[11px] text-[#787770]">基于高精 GPS 经纬度与商家设定电子围栏</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white border border-[#e2e3e1] hover:bg-neutral-100 text-black flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto hide-scrollbar text-xs">
          {/* 🌟 智能辅助决策首选方案：若发现邻近车队餐车在送达范围内，提供一键接盘转移购物车 */}
          {betterAlternative && (
            <div className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-sm space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-bold text-xs text-emerald-900">✨ 智能调度推荐：邻近餐车接盘</span>
                </div>
                <span className="text-[10px] tabular-nums font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-300">
                  送达距 {betterAlternative.distanceKm.toFixed(2)}km (限额 {betterAlternative.truck.deliveryRadiusKm}km)
                </span>
              </div>
              <p className="text-[11.5px] text-emerald-800 leading-relaxed">
                同车队【{betterAlternative.truck.name}】（位于 {betterAlternative.truck.locationName}）在您收货地址的极速专送圈内。
                {cartItemCount > 0 ? `当前购物车内 ${cartItemCount} 件菜品将自动无缝平移，无需重新挑选！` : '可直接切换并享受专送服务！'}
              </p>
              <button
                type="button"
                onClick={() => {
                  handleSelectAnotherTruck(betterAlternative.truck.id);
                  onClose();
                }}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <span>一键无缝切换至 {betterAlternative.theme.num}号车专送（购物车平移）</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 1. Interactive Visual Radar Distance SVG */}
          <div className="bg-[#1e201f] text-white rounded-xl p-3.5 relative overflow-hidden shadow-inner border border-neutral-800">
            {/* SVG Radar Scheme */}
            <div className="relative h-44 w-full flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg">
                {/* Radar Grid Circles */}
                <circle cx="180" cy="90" r="80" fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="3,3" />
                <circle cx="180" cy="90" r="55" fill="none" stroke="rgba(255,255,255,0.12)" />
                <circle cx="180" cy="90" r="30" fill="none" stroke="rgba(255,255,255,0.15)" />

                {/* Delivery Fence Radius Circle (Cyan/Emerald/Amber) */}
                <circle
                  cx="180"
                  cy="90"
                  r={Math.min(75, Math.max(35, (evaluation.radiusKm / 5) * 60))}
                  fill={isOutOfRange ? "rgba(245, 158, 11, 0.08)" : `${activeTheme.color}20`}
                  stroke={isOutOfRange ? "#f59e0b" : activeTheme.color}
                  strokeWidth="1.8"
                  strokeDasharray={isOutOfRange ? "4,4" : "none"}
                />

                {/* Center Truck Coordinate */}
                <g transform="translate(180, 90)">
                  <circle r="13" fill="#0f172a" stroke={activeTheme.color} strokeWidth="2.5" />
                  <circle r="20" fill="none" stroke={activeTheme.color} strokeWidth="0.8" opacity="0.4" className="animate-ping" />
                  <text y="4" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">🚚</text>
                </g>

                {/* Distance Connector Line */}
                <line
                  x1="180"
                  y1="90"
                  x2={isOutOfRange ? "295" : "240"}
                  y2={isOutOfRange ? "40" : "65"}
                  stroke={isOutOfRange ? "#ef4444" : "#10b981"}
                  strokeWidth="2"
                  strokeDasharray={isOutOfRange ? "3,3" : "none"}
                />

                {/* Target Address Node */}
                <g transform={isOutOfRange ? "translate(295, 40)" : "translate(240, 65)"}>
                  <circle r="10" fill={isOutOfRange ? "#ef4444" : "#10b981"} stroke="#ffffff" strokeWidth="1.5" />
                  <text y="3" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">📍</text>
                </g>
              </svg>

              {/* Float telemetry tags */}
              <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs px-2 py-1 rounded border border-white/10 text-[10px] space-y-0.5">
                <p className="text-neutral-400">餐车停靠点: <span className="font-semibold" style={{ color: activeTheme.color }}>{activeTruck.locationName}</span></p>
                <p className="text-neutral-400">商家设定围栏: <span className="text-white font-bold">{evaluation.radiusKm.toFixed(1)} km</span></p>
              </div>

              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs px-2 py-1 rounded border border-white/10 text-[10px] text-right space-y-0.5">
                <p className="text-neutral-400">送达目标距离: <span className={`tabular-nums font-bold ${isOutOfRange ? 'text-rose-400' : 'text-emerald-400'}`}>{evaluation.distanceKm.toFixed(2)} km</span></p>
                <p className={isOutOfRange ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                  {isOutOfRange ? `⚠️ 超出 ${evaluation.exceededKm.toFixed(2)} km` : "✓ 专送范围内"}
                </p>
              </div>
            </div>
          </div>

          {/* 800m 浮动微距专送提示 (超限 ≤ 0.8km 时的轻量指引) */}
          {isOutOfRange && evaluation.exceededKm <= 0.8 && (
            <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-950 text-xs flex items-start gap-2">
              <Compass className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-[11.5px]">微距加急专送通道（仅超出 {evaluation.exceededKm.toFixed(2)}km）</div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  送达点处于 800 米浮动专送加急区；若选择「到车自提」还可立享 8.8 折并开启高德步行导航直接取餐。
                </p>
              </div>
            </div>
          )}

          {/* 2. Detailed Diagnostic Text */}
          <div className={`p-3 rounded-xl border ${
            isOutOfRange
              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          }`}>
            <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
              {isOutOfRange ? <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
              <span>{isOutOfRange ? '配送距离超限诊断报告' : '配送距离状态合格'}</span>
            </div>
            <p className="leading-relaxed text-[11.5px]">
              {evaluation.reason}
            </p>
          </div>

          {/* 3. Recommended Actions Guide */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-black flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-700" />
              <span>智能引导建议与操作：</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Option A: Switch to Pickup */}
              <button
                type="button"
                onClick={() => {
                  onSwitchToPickup();
                  onClose();
                }}
                className="p-3 rounded-xl border border-[#e2e3e1] bg-[#f9f9f7] hover:bg-black hover:text-white transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold flex items-center gap-1 text-xs">
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 group-hover:text-emerald-400" />
                    <span>改用【到车自提】</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 group-hover:bg-emerald-900 group-hover:text-emerald-200 font-semibold">
                    免运费 · 享折扣
                  </span>
                </div>
                <p className="text-[10px] text-[#787770] group-hover:text-neutral-300">
                  无需受外卖配送距离限制，现场炭火现烤即拿即走
                </p>
              </button>

              {/* Option B: Change Delivery Address */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onChangeAddress();
                }}
                className="p-3 rounded-xl border border-[#e2e3e1] bg-[#f9f9f7] hover:bg-neutral-100 transition-all text-left cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold flex items-center gap-1 text-xs text-black">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>选择【范围内常用地址】</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-800 font-semibold">
                    快捷切换
                  </span>
                </div>
                <p className="text-[10px] text-[#787770]">
                  如大悦城商务座(0.65km)、曲阜路接驳位等
                </p>
              </button>
            </div>
          </div>

          {/* 4. Switch to Another Nearby Food Truck */}
          <div className="space-y-2 pt-2 border-t border-[#f0f0ee]">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-black flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-black" />
                <span>车队其他流动餐车实时距离：</span>
              </h4>
              <span className="text-[10px] text-[#787770]">共 {candidateTrucks.length} 辆巡游中</span>
            </div>

            <div className="divide-y divide-neutral-200 border border-neutral-200 rounded bg-white overflow-hidden">
              {candidateTrucks.map(({ truck: t, distanceKm, isInRange, theme }) => {
                const isCurrent = t.id === activeTruck.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectAnotherTruck(t.id)}
                    className={`p-2.5 transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isCurrent
                        ? 'bg-neutral-100/70 border-l-4 border-l-neutral-900 font-bold'
                        : isInRange
                        ? 'hover:bg-emerald-50/50'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: theme.color }}
                        />
                        <span className="font-bold text-neutral-900 truncate">{t.name}</span>
                        {isCurrent ? (
                          <span className="text-[9px] bg-neutral-900 text-white px-1.5 py-0.2 rounded font-semibold">
                            当前点单中
                          </span>
                        ) : isInRange ? (
                          <span className="text-[9px] bg-emerald-700 text-white px-1.5 py-0.2 rounded font-semibold">
                            专送可达
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[10.5px] text-neutral-500 truncate mt-0.5">
                        {t.locationName} · 起送 ¥{t.minDeliveryAmount} · 半径 {t.deliveryRadiusKm}km
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border block ${
                        isInRange
                          ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                          : 'text-neutral-500 bg-neutral-100 border-neutral-200'
                      }`}>
                        距送达点 {distanceKm.toFixed(2)} km
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#f9f9f7] border-t border-[#e2e3e1] flex items-center justify-between">
          {onRefreshGPS && (
            <button
              type="button"
              onClick={onRefreshGPS}
              disabled={isLocatingGPS}
              className="px-3 py-1.5 rounded-lg border border-[#d3d1cb] bg-white hover:bg-neutral-100 text-xs font-semibold text-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLocatingGPS ? 'animate-spin' : ''}`} />
              <span>重新 GPS 定位</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-4 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
