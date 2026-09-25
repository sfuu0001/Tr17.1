/**
 * Urban Radar 骑手端 - 换电站网络与电瓶续航/热力补能地图 (Battery Swap & Range Matrix)
 * 包含：电瓶 SOC 剩余电量测算、1km 范围合作换电柜 (中国铁塔/哈啰换电)、空仓数与满电电池数、一键顺路换电
 */

import React, { useState } from 'react';
import {
  BatteryCharging,
  BatteryMedium,
  BatteryWarning,
  Zap,
  MapPin,
  Navigation,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sparkles
} from 'lucide-react';

interface BatteryCabinet {
  id: string;
  brand: '中国铁塔换电' | '哈啰换电' | '小哈能量站';
  name: string;
  address: string;
  distanceMeters: number;
  availableBatteries: number; // 可用满电电池 (>=95%)
  emptySlots: number;          // 空仓位可还
  totalSlots: number;
  voltage: string;             // 48V / 60V
  isRecommendedWay: boolean;   // 顺路推荐
}

const MOCK_CABINETS: BatteryCabinet[] = [
  {
    id: 'cab-01',
    brand: '中国铁塔换电',
    name: '大悦城北广场 02 号智能换电柜',
    address: '西藏北路 198 号大悦城北侧停车场入口处',
    distanceMeters: 280,
    availableBatteries: 6,
    emptySlots: 4,
    totalSlots: 12,
    voltage: '48V/60V 通用',
    isRecommendedWay: true
  },
  {
    id: 'cab-02',
    brand: '哈啰换电',
    name: '曲阜路地铁 3 号口便民换电驿站',
    address: '曲阜路 80 号人行道旁',
    distanceMeters: 450,
    availableBatteries: 8,
    emptySlots: 2,
    totalSlots: 10,
    voltage: '48V 锂电专享',
    isRecommendedWay: false
  },
  {
    id: 'cab-03',
    brand: '小哈能量站',
    name: '海宁路绿地广场 01 柜',
    address: '海宁路 1122 号沿街',
    distanceMeters: 820,
    availableBatteries: 3,
    emptySlots: 5,
    totalSlots: 8,
    voltage: '60V 远航版',
    isRecommendedWay: false
  }
];

interface RiderBatterySwapMapProps {
  showToast: (msg: string) => void;
}

export const RiderBatterySwapMap: React.FC<RiderBatterySwapMapProps> = ({
  showToast
}) => {
  const [batterySoc, setBatterySoc] = useState(38); // 当前 38%
  const [batteryVoltage] = useState(58.4); // 58.4V
  const [cabinets, setCabinets] = useState<BatteryCabinet[]>(MOCK_CABINETS);
  const [selectedCabinetId, setSelectedCabinetId] = useState<string>('cab-01');

  // 计算预估剩余里程
  const estimatedKm = Math.round((batterySoc / 100) * 45); // 满电约 45km
  const isLowBattery = batterySoc <= 25;

  const handleInsertWaySwap = (cabinet: BatteryCabinet) => {
    showToast(`【智能路线重算】已将【${cabinet.name}】作为途径补能节点插入派送路线，预计增加行程仅 120 米！`);
  };

  const handleSimulateSwap = () => {
    setBatterySoc(98);
    showToast('🔋【换电成功】已在换电柜完成弹仓换电！电池 SOC 已恢复至 98%，续航充盈！');
  };

  return (
    <div className="space-y-4">
      {/* 顶部电瓶续航健康看板 */}
      <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isLowBattery
                  ? 'bg-red-100 text-red-600'
                  : batterySoc <= 40
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <BatteryCharging className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#1a1a17]">
                  智能锂电续航与补能中枢
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isLowBattery
                      ? 'bg-red-500 text-white'
                      : batterySoc <= 40
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isLowBattery ? '低电告警' : batterySoc <= 40 ? '建议补能' : '电量充沛'}
                </span>
              </div>
              <p className="text-xs text-[#787774] mt-0.5">
                当前电压 {batteryVoltage}V · 磷酸铁锂智能 BMS 实时在线
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-[#1a1a17]">
                {batterySoc}%
              </div>
              <div className="text-xs text-[#787774]">
                预计可骑行 ≈ <span className="font-bold text-emerald-700 font-mono">{estimatedKm} km</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSimulateSwap}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>快速模拟换电</span>
            </button>
          </div>
        </div>

        {/* 电池电量条 */}
        <div className="mt-3">
          <div className="w-full h-2.5 bg-[#f0efec] rounded-full overflow-hidden">
            <div
              style={{ width: `${batterySoc}%` }}
              className={`h-full rounded-full transition-all duration-500 ${
                isLowBattery
                  ? 'bg-red-500'
                  : batterySoc <= 40
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* 周边 1km 合作换电站网络 */}
      <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-[#1a1a17]">
              周边 1km 合作换电柜 (铁塔 / 哈啰)
            </h3>
          </div>
          <span className="text-xs text-[#787774] font-mono">
            免押金直连网点
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {cabinets.map((cab) => {
            const isSelected = selectedCabinetId === cab.id;
            return (
              <div
                key={cab.id}
                onClick={() => setSelectedCabinetId(cab.id)}
                className={`border rounded-xl p-3.5 space-y-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                    : 'border-[#e8e7e4] bg-[#fafafa] hover:bg-[#f5f4f0]'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-800">
                      {cab.brand}
                    </span>
                    <h4 className="text-xs font-bold text-[#1a1a17] mt-1">
                      {cab.name}
                    </h4>
                  </div>
                  {cab.isRecommendedWay && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> 顺路推荐
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-[#787774] truncate">
                  📍 {cab.address}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2 rounded-lg border border-[#ecebe8]">
                  <div>
                    <span className="text-[10px] text-[#787774] block">满电电池可用</span>
                    <span className="font-mono font-bold text-emerald-600 text-sm">
                      {cab.availableBatteries} <span className="text-[10px] font-normal text-stone-400">/ {cab.totalSlots}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#787774] block">空仓位可还</span>
                    <span className="font-mono font-bold text-blue-600 text-sm">
                      {cab.emptySlots} 仓
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#ebeae7] flex items-center justify-between text-xs">
                  <span className="font-mono text-[#787774] text-[11px]">
                    距离 {cab.distanceMeters} 米
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInsertWaySwap(cab);
                    }}
                    className="px-2.5 py-1 rounded bg-stone-900 hover:bg-black text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className="w-3 h-3 text-emerald-400" />
                    <span>顺路一键导航</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
