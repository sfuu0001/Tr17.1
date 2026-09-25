/**
 * Urban Radar 流动餐车 GPS 极速专送平台 - 全域动态运价与突发应急调度熔断器 (Surge Pricing & Emergency Kill-Switch)
 * 具备：商圈起送价/配送费杠杆调控、暴雨恶劣天气骑手加补、食品安全批次全网一键召回售罄、全域红线熔断开关
 */

import React, { useState } from 'react';
import {
  Zap,
  AlertOctagon,
  CloudRain,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Flame,
  Power,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';

interface SurgeZoneConfig {
  id: string;
  zoneName: string;
  currentSurgeFee: number; // 动态附加运费
  minOrderAmount: number;  // 起送门槛
  riderIncentiveBonus: number; // 骑手每单加补
  isRainActive: boolean;
  statusText: string;
}

const INITIAL_SURGE_ZONES: SurgeZoneConfig[] = [
  {
    id: 'zone-01',
    zoneName: '静安大悦城 · 核心 CBD 核心圈',
    currentSurgeFee: 3.0,
    minOrderAmount: 38,
    riderIncentiveBonus: 4.0,
    isRainActive: false,
    statusText: '午高峰轻度溢价'
  },
  {
    id: 'zone-02',
    zoneName: '陆家嘴金融城 · 环球金融中心圈',
    currentSurgeFee: 5.0,
    minOrderAmount: 50,
    riderIncentiveBonus: 6.0,
    isRainActive: true,
    statusText: '高密订单溢价 + 雨天补贴'
  },
  {
    id: 'zone-03',
    zoneName: '新天地南里 · 时尚商圈',
    currentSurgeFee: 0.0,
    minOrderAmount: 30,
    riderIncentiveBonus: 2.0,
    isRainActive: false,
    statusText: '平稳常态运营'
  }
];

interface SurgePricingAndKillSwitchProps {
  showToast: (msg: string) => void;
}

export const SurgePricingAndKillSwitch: React.FC<SurgePricingAndKillSwitchProps> = ({
  showToast
}) => {
  const [zones, setZones] = useState<SurgeZoneConfig[]>(INITIAL_SURGE_ZONES);
  const [isGlobalKillSwitchActive, setIsGlobalKillSwitchActive] = useState(false);
  const [isFoodRecallModalOpen, setIsFoodRecallModalOpen] = useState(false);
  const [recallBatchCode, setRecallBatchCode] = useState('LOT-202609-OYS');
  const [recallDishName, setRecallDishName] = useState('炭火现开极鲜生蚝 (6只)');

  // 调节商圈动态运费
  const handleUpdateZoneFee = (zoneId: string, delta: number) => {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id === zoneId) {
          const newFee = Math.max(0, Math.min(15, z.currentSurgeFee + delta));
          showToast(`已更新【${z.zoneName}】动态运价浮动为 ¥${newFee}`);
          return { ...z, currentSurgeFee: newFee };
        }
        return z;
      })
    );
  };

  // 触发一键暴雨补贴模式
  const handleToggleRainMode = (zoneId: string) => {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id === zoneId) {
          const nextState = !z.isRainActive;
          const nextBonus = nextState ? z.riderIncentiveBonus + 5.0 : Math.max(2, z.riderIncentiveBonus - 5.0);
          showToast(
            nextState
              ? `【极端天气预警生效】${z.zoneName} 已开启恶劣天气保护，骑手每单自动加补 ¥5.0`
              : `已解除 ${z.zoneName} 恶劣天气补贴模式`
          );
          return {
            ...z,
            isRainActive: nextState,
            riderIncentiveBonus: nextBonus
          };
        }
        return z;
      })
    );
  };

  // 一键全网召回下架特定批次菜品
  const handleExecuteRecall = () => {
    showToast(
      `【全网品控熔断召回】批次 [${recallBatchCode}] 涉及的「${recallDishName}」已在全城 5 辆餐车及前台点单端秒级强制下架置为售罄！`
    );
    setIsFoodRecallModalOpen(false);
  };

  // 全域一键避险熔断
  const handleToggleGlobalKillSwitch = () => {
    if (!isGlobalKillSwitchActive) {
      const confirmKill = window.confirm(
        '【最高级别紧急操作】确定要激活全域应急熔断器吗？\n激活后全城所有餐车线上进单将立即暂停，骑手池进入避险待命模式！'
      );
      if (confirmKill) {
        setIsGlobalKillSwitchActive(true);
        showToast('🚨【全域调度已紧急熔断】全城线上点单已暂停进单，正在执行排队订单平稳出餐与避险退单！');
      }
    } else {
      setIsGlobalKillSwitchActive(false);
      showToast('✅ 全域应急熔断已解除，全城餐车恢复常态化线上点单与专送调度。');
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部最高级别全域熔断警示条 */}
      <div
        className={`border rounded-xl p-4 transition-all shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isGlobalKillSwitchActive
            ? 'bg-red-50 border-red-300 text-red-900'
            : 'bg-white border-[#e3e2e0]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isGlobalKillSwitchActive
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-stone-100 text-stone-700'
            }`}
          >
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#1a1a17]">
                全域突发公共事件应急熔断中枢 (Kill-Switch)
              </h3>
              {isGlobalKillSwitchActive && (
                <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[11px] font-bold animate-ping">
                  熔断已生效
                </span>
              )}
            </div>
            <p className="text-xs text-[#787774] mt-0.5">
              适用于突发台风暴雨防汛、区域城管清场管制或重大公卫突发事件的一键关停与降级保活
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsFoodRecallModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Flame className="w-4 h-4" />
            <span>批次食材全网秒级召回</span>
          </button>

          <button
            type="button"
            onClick={handleToggleGlobalKillSwitch}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs ${
              isGlobalKillSwitchActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isGlobalKillSwitchActive ? '恢复全网正常营业' : '一键紧急全域熔断'}</span>
          </button>
        </div>
      </div>

      {/* 商圈动态运价与恶劣天气杠杆面板 */}
      <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-bold text-[#1a1a17]">核心商圈网格动态运价与暴雨天气调节</h3>
          </div>
          <span className="text-xs text-[#787774] font-mono">
            动态浮动范围: ¥0.0 ~ ¥15.0
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={`border rounded-xl p-3.5 space-y-3 ${
                zone.isRainActive ? 'border-blue-300 bg-blue-50/40' : 'border-[#e8e7e4] bg-[#fafafa]'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#1a1a17]">{zone.zoneName}</h4>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    zone.isRainActive ? 'bg-blue-200 text-blue-900' : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {zone.statusText}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-[#ebeae7]">
                  <span className="text-[11px] text-[#787774] block">附加溢价运费</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono font-bold text-orange-600">
                      +¥{zone.currentSurgeFee.toFixed(1)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateZoneFee(zone.id, -1)}
                        className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateZoneFee(zone.id, +1)}
                        className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-[#ebeae7]">
                  <span className="text-[11px] text-[#787774] block">骑手每单加补</span>
                  <div className="mt-1 font-mono font-bold text-emerald-600">
                    +¥{zone.riderIncentiveBonus.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#ebeae7] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleRainMode(zone.id)}
                  className={`w-full py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                    zone.isRainActive
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white border border-[#d3d1cb] text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <CloudRain className="w-3.5 h-3.5" />
                  <span>{zone.isRainActive ? '暴雨加价模式运行中' : '开启暴雨恶劣天气加补'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 食材批次全网秒级下架召回弹窗 */}
      {isFoodRecallModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-red-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1a1a17]">食品安全全网秒级下架召回</h3>
                <p className="text-xs text-[#787774]">一键同步全网所有餐车收银端与食客点单小程序</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5a5854] font-medium mb-1">受影响菜品名称</label>
                <input
                  type="text"
                  value={recallDishName}
                  onChange={(e) => setRecallDishName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#d3d1cb] bg-[#fbfbfa] text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[#5a5854] font-medium mb-1">供应链追溯批次号 (Batch Lot)</label>
                <input
                  type="text"
                  value={recallBatchCode}
                  onChange={(e) => setRecallBatchCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#d3d1cb] bg-[#fbfbfa] text-xs font-mono"
                />
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-red-800 text-[11px]">
                ⚠️ 确认后，全城流动餐车将立即禁用包含该批次原料的菜品下单，并在后厨 KDS 拦截出单！
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFoodRecallModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-[#d3d1cb] text-xs font-semibold text-[#37352f] hover:bg-[#f7f7f5] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecuteRecall}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                立即全网执行下架召回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
