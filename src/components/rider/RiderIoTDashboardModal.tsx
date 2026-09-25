import React, { useState } from 'react';
import {
  Thermometer,
  BatteryCharging,
  Flame,
  Snowflake,
  ShieldCheck,
  AlertTriangle,
  Zap,
  MapPin,
  RefreshCw,
  X,
  Sparkles
} from 'lucide-react';
import { ThermalBoxState } from '../../types/rider';

interface RiderIoTDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  iotState: ThermalBoxState;
  onAdjustTemp: (zone: 'hot' | 'cold', target: number) => void;
  onToggleLid: () => void;
  onReserveBatterySwap: (stationName: string) => void;
  showToast: (msg: string) => void;
}

export const RiderIoTDashboardModal: React.FC<RiderIoTDashboardModalProps> = ({
  isOpen,
  onClose,
  iotState,
  onAdjustTemp,
  onToggleLid,
  onReserveBatterySwap,
  showToast
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-[#37352f] w-full max-w-lg rounded-[4px] border border-[#e6e6e4] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[3px] bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8] flex items-center justify-center">
              <Thermometer className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-xs text-[#37352f] block">
                车载恒温箱 & 电池健康控制
              </span>
              <span className="text-[10px] text-[#787774] font-mono">
                IoT 传感器实时连接中
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[3px] hover:bg-[#efefed] text-[#787774] hover:text-[#37352f] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
          {/* Thermal Box Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#37352f] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2b593f]" />
                <span>双温区黑松露锁鲜温控箱</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onToggleLid();
                  showToast(iotState.lidClosed ? '箱盖已打开（请尽快取放餐品）' : '箱盖已锁紧密封');
                }}
                className={`text-[10.5px] px-2 py-0.5 rounded-[3px] font-mono font-medium cursor-pointer transition-colors border ${
                  iotState.lidClosed
                    ? 'bg-[#edf3ec] border-[#c4dcbc] text-[#2b593f]'
                    : 'bg-[#fdf2f2] border-[#f8b4b4] text-[#eb5757]'
                }`}
              >
                {iotState.lidClosed ? '箱盖: 严密锁合' : '⚠️ 箱盖: 未盖严'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Hot Zone */}
              <div className="p-3 bg-[#fafafa] rounded-[3px] border border-[#ecd9a8] space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between text-[#8f6412]">
                  <span className="font-bold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-[#d9730d]" />
                    <span>热食保温舱</span>
                  </span>
                  <span className="text-[10px] font-mono bg-[#fbf3db] px-1.5 py-0.2 rounded border border-[#ecd9a8]">
                    65~75℃ 锁汁
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold font-mono text-[#d9730d]">
                      {iotState.hotZoneTemp}℃
                    </span>
                    <span className="text-[10px] text-[#787774] ml-1">
                      (设定 {iotState.hotZoneTarget}℃)
                    </span>
                  </div>
                  <span className="text-[10px] text-[#2b593f] font-medium">PTC加热中</span>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onAdjustTemp('hot', iotState.hotZoneTarget - 2);
                      showToast('热食舱目标温度调低至 ' + (iotState.hotZoneTarget - 2) + '℃');
                    }}
                    className="flex-1 py-1 bg-white hover:bg-[#f1f1ef] border border-[#d3d1cb] text-[#37352f] rounded-[3px] text-[11px] font-mono cursor-pointer"
                  >
                    -2℃
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAdjustTemp('hot', iotState.hotZoneTarget + 2);
                      showToast('热食舱目标温度调高至 ' + (iotState.hotZoneTarget + 2) + '℃');
                    }}
                    className="flex-1 py-1 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[3px] text-[11px] font-mono font-medium cursor-pointer"
                  >
                    +2℃
                  </button>
                </div>
              </div>

              {/* Cold Zone */}
              <div className="p-3 bg-[#fafafa] rounded-[3px] border border-[#c4dcbc] space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between text-[#2b593f]">
                  <span className="font-bold flex items-center gap-1">
                    <Snowflake className="w-3.5 h-3.5 text-[#2383e2]" />
                    <span>冷饮保鲜舱</span>
                  </span>
                  <span className="text-[10px] font-mono bg-[#edf3ec] px-1.5 py-0.2 rounded border border-[#c4dcbc]">
                    0~4℃ 冰块锁鲜
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold font-mono text-[#2383e2]">
                      {iotState.coldZoneTemp}℃
                    </span>
                    <span className="text-[10px] text-[#787774] ml-1">
                      (设定 {iotState.coldZoneTarget}℃)
                    </span>
                  </div>
                  <span className="text-[10px] text-[#2383e2] font-medium">制冷中</span>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onAdjustTemp('cold', Math.max(0, iotState.coldZoneTarget - 1));
                      showToast('冷饮舱目标温度调低至 ' + Math.max(0, iotState.coldZoneTarget - 1) + '℃');
                    }}
                    className="flex-1 py-1 bg-white hover:bg-[#f1f1ef] border border-[#d3d1cb] text-[#37352f] rounded-[3px] text-[11px] font-mono cursor-pointer"
                  >
                    -1℃
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAdjustTemp('cold', iotState.coldZoneTarget + 1);
                      showToast('冷饮舱目标温度调高至 ' + (iotState.coldZoneTarget + 1) + '℃');
                    }}
                    className="flex-1 py-1 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] text-[11px] font-mono font-medium cursor-pointer"
                  >
                    +1℃
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Electric Scooter Battery & Swap Network */}
          <div className="p-3 bg-[#fafafa] rounded-[3px] border border-[#e6e6e4] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#37352f] flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-[#2b593f]" />
                <span>电动车动力电池</span>
              </span>
              <span className="text-[#2b593f] font-mono font-bold text-xs">
                {iotState.batterySoc}% (预估剩余 {iotState.batteryRangeKm} km)
              </span>
            </div>

            <div className="w-full bg-[#e6e6e4] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#2b593f] h-full transition-all duration-300"
                style={{ width: `${iotState.batterySoc}%` }}
              />
            </div>

            {/* Swap Station List */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-[#787774] block">
                附近换电站:
              </span>
              <div className="space-y-1.5">
                {iotState.nearbySwapStations.map((station) => (
                  <div
                    key={station.name}
                    className="p-2 bg-white rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[#37352f] truncate text-xs">{station.name}</p>
                      <p className="text-[10px] text-[#787774] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#eb5757]" />
                        <span>距您 {station.distanceMeters}m · 可用电池: </span>
                        <span className="text-[#2b593f] font-bold font-mono">{station.availableBatteries} 个</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onReserveBatterySwap(station.name);
                        showToast(`已成功为您锁定【${station.name}】03号满电电池仓！`);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-[#edf3ec] border border-[#c4dcbc] text-[#2b593f] rounded-[3px] text-[10.5px] font-medium shrink-0 cursor-pointer transition-all"
                    >
                      预约换电
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-between">
          <span className="text-[10.5px] text-[#787774] font-mono">
            传感器诊断: 正常无故障码
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white hover:bg-[#efefed] border border-[#d3d1cb] text-[#37352f] rounded-[3px] font-medium text-xs cursor-pointer transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
