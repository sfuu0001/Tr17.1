/**
 * Urban Radar 商家端 - 餐车车载能源与光伏补给控制台 (Food Truck Energy & Power Cockpit)
 * 监控：车载大容量动力锂电池组 SOC、车顶柔性光伏组件发电功率、外接市电/发电机状态、后厨高负荷设备电流监控
 */

import React, { useState } from 'react';
import {
  Zap,
  BatteryCharging,
  Sun,
  Power,
  Flame,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  PlugZap,
  Activity,
  Sparkles
} from 'lucide-react';
import { TruckInfo } from '../../types';

interface TruckEnergyCockpitProps {
  truck: TruckInfo;
  showToast?: (msg: string) => void;
}

interface ApplianceLoad {
  id: string;
  name: string;
  powerWatt: number;
  status: 'active' | 'standby' | 'off';
  category: 'cooking' | 'cold' | 'pos';
}

export const TruckEnergyCockpit: React.FC<TruckEnergyCockpitProps> = ({
  truck,
  showToast = console.log
}) => {
  const [gridConnected, setGridConnected] = useState(true); // 是否接入 220V 市电
  const [batterySoc, setBatterySoc] = useState(84); // 电池 84%
  const [solarWatt, setSolarWatt] = useState(620); // 光伏 620W 实时输入
  const [appliances, setAppliances] = useState<ApplianceLoad[]>([
    { id: '1', name: '智能双缸恒温电炸炉', powerWatt: 3200, status: 'active', category: 'cooking' },
    { id: '2', name: '炭火风道排烟净化一体机', powerWatt: 850, status: 'active', category: 'cooking' },
    { id: '3', name: '立式冷藏保鲜柜 (0~4℃)', powerWatt: 420, status: 'active', category: 'cold' },
    { id: '4', name: '台式恒温取餐保温箱 (65℃)', powerWatt: 600, status: 'active', category: 'cooking' },
    { id: '5', name: '车载双屏 POS + 5G CPE + KDS 屏', powerWatt: 180, status: 'active', category: 'pos' },
    { id: '6', name: '双头半自动意式咖啡机', powerWatt: 2200, status: 'standby', category: 'cooking' }
  ]);

  // 计算总负荷功率
  const totalLoadWatt = appliances
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => sum + a.powerWatt, 0);

  const toggleAppliance = (id: string) => {
    setAppliances((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const nextStatus = a.status === 'active' ? 'standby' : 'active';
          showToast(`已切换设备【${a.name}】状态为: ${nextStatus === 'active' ? '工作运行中' : '节能待机'}`);
          return { ...a, status: nextStatus };
        }
        return a;
      })
    );
  };

  const toggleGrid = () => {
    const next = !gridConnected;
    setGridConnected(next);
    showToast(next ? '⚡ 已接通外接 220V/32A 市电桩，动力锂电池组转入浮充保护！' : '⚠️ 已切断外接市电，餐车已无缝切换至车载动力电池独立供电模式！');
  };

  return (
    <div className="space-y-4">
      {/* 顶部电能核心矩阵 */}
      <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f1f1ef]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1a1a17]">
                {truck.name} · 车载移动能源与微电网中枢
              </h3>
              <p className="text-xs text-[#787774]">
                磷酸铁锂 48V 200Ah 储能系统 · 柔性车顶光伏阵列实时在线
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleGrid}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                gridConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              <PlugZap className={`w-3.5 h-3.5 ${gridConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span>{gridConnected ? '外接市电已连接 (220V/32A)' : '离网纯电运行中'}</span>
            </button>
          </div>
        </div>

        {/* 关键电气指标卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {/* 电池 SOC */}
          <div className="bg-[#fafaf8] p-3.5 rounded-xl border border-[#ecebe8] space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#787774]">
              <span className="flex items-center gap-1">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
                储能电池组 SOC
              </span>
              <span className="font-mono font-bold text-emerald-700">良好 (48.8V)</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#1a1a17]">
              {batterySoc}%
            </div>
            <div className="w-full bg-[#e8e7e4] h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${batterySoc}%` }}
                className="bg-emerald-600 h-full rounded-full"
              />
            </div>
            <div className="text-[10px] text-[#787774]">
              离网状态预计可持续烹饪出餐约 <span className="font-bold text-stone-800 font-mono">5.2 小时</span>
            </div>
          </div>

          {/* 实时光伏发电 */}
          <div className="bg-[#fafaf8] p-3.5 rounded-xl border border-[#ecebe8] space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#787774]">
              <span className="flex items-center gap-1 text-amber-700">
                <Sun className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '10s' }} />
                车顶光伏阵列
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                峰值发电
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-700">
              +{solarWatt} <span className="text-xs font-normal text-stone-500">W</span>
            </div>
            <div className="text-[11px] text-[#787774]">
              当日光伏绿电累计产生: <span className="font-mono font-bold text-stone-900">4.18 kWh</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-medium">
              🌱 相当于减少碳排放 3.2 kg
            </div>
          </div>

          {/* 实时后厨总负载 */}
          <div className="bg-[#fafaf8] p-3.5 rounded-xl border border-[#ecebe8] space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#787774]">
              <span className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-blue-600" />
                后厨实时功率总和
              </span>
              <span className="font-mono font-bold text-stone-800">最大容许 8000W</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#1a1a17]">
              {totalLoadWatt} <span className="text-xs font-normal text-stone-500">W</span>
            </div>
            <div className="w-full bg-[#e8e7e4] h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${(totalLoadWatt / 8000) * 100}%` }}
                className={`h-full rounded-full ${
                  totalLoadWatt > 6500 ? 'bg-red-500' : 'bg-blue-600'
                }`}
              />
            </div>
            <div className="text-[10px] text-[#787774]">
              负荷率: <span className="font-mono font-bold">{Math.round((totalLoadWatt / 8000) * 100)}%</span> (运行平稳)
            </div>
          </div>
        </div>
      </div>

      {/* 厨电大功率设备负荷清单与独立开关控制 */}
      <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-stone-800" />
            <h4 className="text-xs font-bold text-[#1a1a17]">
              车载后厨电气设备回路与负荷分控
            </h4>
          </div>
          <span className="text-[11px] text-[#787774]">
            点击可对闲置厨电进行一键节能待机
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {appliances.map((app) => (
            <div
              key={app.id}
              onClick={() => toggleAppliance(app.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                app.status === 'active'
                  ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/60'
                  : 'border-[#e8e7e4] bg-[#fafafa] opacity-60 hover:opacity-100'
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[#1a1a17]">{app.name}</div>
                <div className="text-[11px] text-[#787774] font-mono">
                  额定负荷: {app.powerWatt}W
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    app.status === 'active'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-300 text-stone-700'
                  }`}
                >
                  {app.status === 'active' ? '运行中' : '已待机'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
