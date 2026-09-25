import React, { useState, useEffect } from 'react';
import {
  Power,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  Info,
  Calendar,
  Store,
  Bell,
  UtensilsCrossed,
  Bike,
  ShoppingBag
} from 'lucide-react';
import {
  BusinessStatusConfig,
  getTruckBusinessStatus,
  setTruckBusinessStatus,
  DEFAULT_TRUCK_BUSINESS_STATUSES
} from '../../utils/businessStatusEngine';
import { useToast } from '../ui/ToastContext';
import { getUnifiedTruckName } from '../../utils/truckNaming';
import { SmoothScrollContainer } from './SmoothScrollContainer';

interface BusinessStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  truckId?: string;
  truckName?: string;
  allTrucks?: Array<{ truckId: string; truckName: string; [key: string]: any }>;
  onStatusChanged?: (status: BusinessStatusConfig) => void;
}

export const BusinessStatusModal: React.FC<BusinessStatusModalProps> = ({
  isOpen,
  onClose,
  truckId = 'truck-01',
  truckName = '01 号·旗舰车',
  allTrucks = [],
  onStatusChanged
}) => {
  const toast = useToast();
  const [selectedTid, setSelectedTid] = useState<string>(truckId);

  // Sync selectedTid when truckId prop changes
  useEffect(() => {
    setSelectedTid(truckId);
  }, [truckId]);

  const [currentConfig, setCurrentConfig] = useState<BusinessStatusConfig>(() => getTruckBusinessStatus(selectedTid));
  const [targetIsOpen, setTargetIsOpen] = useState<boolean>(currentConfig.isOpen);
  const [targetDineIn, setTargetDineIn] = useState<boolean>(currentConfig.dineInOpen !== false);
  const [targetDelivery, setTargetDelivery] = useState<boolean>(currentConfig.deliveryOpen !== false);
  const [targetPickup, setTargetPickup] = useState<boolean>(currentConfig.pickupOpen !== false);
  const [reasonInput, setReasonInput] = useState<string>(currentConfig.closeReason);
  const [reopenTimeInput, setReopenTimeInput] = useState<string>(currentConfig.reopenTime);
  const [autoAcceptOrders, setAutoAcceptOrders] = useState<boolean>(currentConfig.autoAcceptOrders);

  // Reload fields when switching truck inside modal
  const handleSelectTruckInModal = (tid: string) => {
    setSelectedTid(tid);
    const cfg = getTruckBusinessStatus(tid);
    setCurrentConfig(cfg);
    setTargetIsOpen(cfg.isOpen);
    setTargetDineIn(cfg.dineInOpen !== false);
    setTargetDelivery(cfg.deliveryOpen !== false);
    setTargetPickup(cfg.pickupOpen !== false);
    setReasonInput(cfg.closeReason);
    setReopenTimeInput(cfg.reopenTime);
    setAutoAcceptOrders(cfg.autoAcceptOrders);
  };

  if (!isOpen) return null;

  const currentTruckName = getUnifiedTruckName(selectedTid, 'standard');

  const quickPresets = [
    {
      label: '晚市正常打烊',
      reason: '今日晚市已打烊，食材盘点中，明日 11:00 起恢复接单',
      reopen: '明日 11:00'
    },
    {
      label: '高峰备料中 (15分钟)',
      reason: '客流高峰食材紧急补给中，暂停接单 15 分钟',
      reopen: '15 分钟后'
    },
    {
      label: '餐车转场移位 (30分钟)',
      reason: '餐车正在前往新商圈指定停靠点，转场中暂停接单',
      reopen: '30 分钟后'
    },
    {
      label: '恶劣暴雨天气避险',
      reason: '受突发暴雨雷电影响，为保障安全临时歇业暂停接单',
      reopen: '视天气情况恢复'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = setTruckBusinessStatus(
      selectedTid,
      {
        isOpen: targetIsOpen,
        statusLabel: targetIsOpen ? '营业中' : '已打烊 · 暂停接单',
        closeReason: targetIsOpen ? `${currentTruckName}站台正常营运，主理人炭火现烤接单中` : reasonInput,
        reopenTime: targetIsOpen ? '正常接单中' : reopenTimeInput,
        autoAcceptOrders,
        dineInOpen: targetDineIn,
        deliveryOpen: targetDelivery,
        pickupOpen: targetPickup
      },
      '餐车主理人'
    );

    setCurrentConfig(updated);
    onStatusChanged?.(updated);

    if (targetIsOpen) {
      toast.success(`【${currentTruckName}】已恢复全网接单！`, '堂食/外卖/自提渠道设置已生效，食客端点单已更新。');
    } else {
      toast.info(`【${currentTruckName}】已设为【已打烊/暂停接单】`, `前台已同步提示打烊：${reasonInput}`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-[6px] shadow-2xl border border-[#e6e6e4] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#e6e6e4] bg-white">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-normal border shadow-2xs ${
                targetIsOpen
                  ? 'bg-white border-emerald-600 text-emerald-700'
                  : 'bg-white border-rose-500 text-rose-600'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-normal text-[#201f1d] tracking-tight">流动餐车营业状态总控中心</h3>
                <span
                  className={`text-[10px] font-normal px-1.5 py-0.2 rounded-full border ${
                    targetIsOpen
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {targetIsOpen ? '营业接单中' : '已打烊歇业'}
                </span>
              </div>
              <p className="text-[11px] text-[#787774] mt-0.5 font-normal">当前配置餐车: {currentTruckName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#787774] hover:text-[#201f1d] hover:bg-[#f1f1ef] rounded-full cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Truck Selector Tabs if multiple trucks */}
        <div className="px-4 py-2 bg-[#fbfbfa] border-b border-[#e6e6e4] flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] font-normal text-neutral-500 shrink-0">选择管理餐车:</span>
          {(allTrucks.length > 0 ? allTrucks : [
            { truckId: 'truck-01', truckName: getUnifiedTruckName('truck-01', 'short') },
            { truckId: 'truck-02', truckName: getUnifiedTruckName('truck-02', 'short') },
            { truckId: 'truck-03', truckName: getUnifiedTruckName('truck-03', 'short') },
            { truckId: 'truck-04', truckName: getUnifiedTruckName('truck-04', 'short') },
            { truckId: 'truck-05', truckName: getUnifiedTruckName('truck-05', 'short') }
          ]).map((t) => {
            const isTabActive = t.truckId === selectedTid;
            const truckSt = getTruckBusinessStatus(t.truckId);
            return (
              <button
                key={t.truckId}
                type="button"
                onClick={() => handleSelectTruckInModal(t.truckId)}
                className={`px-2.5 py-1 rounded-full text-xs font-normal shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isTabActive
                    ? 'border border-[#1a1918] bg-white text-[#1a1918] shadow-2xs'
                    : 'border border-transparent text-[#6a6864] hover:border-[#d3d1cb] hover:bg-[#efefed]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    truckSt.isOpen ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span>{getUnifiedTruckName(t.truckId, 'standard')}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col text-xs">
          <SmoothScrollContainer className="p-4 sm:p-5 space-y-4" maxHeight="calc(85vh - 140px)">
            {/* Toggle Switch Selector */}
          <div className="p-3 bg-[#f7f7f5] rounded-[4px] border border-[#e6e6e4] space-y-2">
            <label className="font-bold text-[#37352f] block">选择当前营业接单模式:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetIsOpen(true);
                  setReopenTimeInput('正常接单中');
                }}
                className={`p-3 rounded-[3px] border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  targetIsOpen
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-2xs ring-1 ring-emerald-600'
                    : 'bg-white border-[#d3d1cb] text-[#787774] hover:bg-[#fafaf8]'
                }`}
              >
                <span className="text-lg">🟢</span>
                <span className="font-bold text-xs">营业中 (恢复接单)</span>
                <span className="text-[10px] text-[#787774]">食客可自由下单并在线结账</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetIsOpen(false);
                  if (reopenTimeInput === '正常接单中') {
                    setReopenTimeInput('明日 11:00');
                  }
                }}
                className={`p-3 rounded-[3px] border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  !targetIsOpen
                    ? 'bg-rose-50 border-rose-600 text-rose-900 shadow-2xs ring-1 ring-rose-600'
                    : 'bg-white border-[#d3d1cb] text-[#787774] hover:bg-[#fafaf8]'
                }`}
              >
                <span className="text-lg">🔴</span>
                <span className="font-bold text-xs">已打烊 (暂停接单)</span>
                <span className="text-[10px] text-[#787774]">前台禁用结算，提示打烊</span>
              </button>
            </div>
          </div>

          {/* 3 Channels Operating Switches: 堂食 = 外卖 = 自提 */}
          <div className="p-3 bg-[#f7f7f5] rounded-[4px] border border-[#e6e6e4] space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#37352f] block">三大就餐渠道独立营业开关:</label>
              <span className="text-[10px] text-[#787774]">独立控制各渠道是否接单</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {/* 堂食 */}
              <button
                type="button"
                onClick={() => setTargetDineIn((prev) => !prev)}
                className={`p-2.5 rounded-[3px] border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  targetDineIn
                    ? 'bg-white border-emerald-500 shadow-2xs text-emerald-950 ring-1 ring-emerald-500/20'
                    : 'bg-[#fafaf9] border-[#d3d1cb] text-[#787774] opacity-75'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    targetDineIn ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-500'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                </div>
                <div className="text-center">
                  <span className="font-bold text-xs block text-[#201f1d]">堂食营业</span>
                  <span
                    className={`inline-block mt-0.5 text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                      targetDineIn ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {targetDineIn ? '开启接单' : '暂停堂食'}
                  </span>
                </div>
              </button>

              {/* 外卖 */}
              <button
                type="button"
                onClick={() => setTargetDelivery((prev) => !prev)}
                className={`p-2.5 rounded-[3px] border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  targetDelivery
                    ? 'bg-white border-blue-500 shadow-2xs text-blue-950 ring-1 ring-blue-500/20'
                    : 'bg-[#fafaf9] border-[#d3d1cb] text-[#787774] opacity-75'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    targetDelivery ? 'bg-blue-100 text-blue-800' : 'bg-neutral-200 text-neutral-500'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                </div>
                <div className="text-center">
                  <span className="font-bold text-xs block text-[#201f1d]">外卖营业</span>
                  <span
                    className={`inline-block mt-0.5 text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                      targetDelivery ? 'bg-blue-100 text-blue-800' : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {targetDelivery ? '开启接单' : '暂停外卖'}
                  </span>
                </div>
              </button>

              {/* 自提 */}
              <button
                type="button"
                onClick={() => setTargetPickup((prev) => !prev)}
                className={`p-2.5 rounded-[3px] border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  targetPickup
                    ? 'bg-white border-amber-500 shadow-2xs text-amber-950 ring-1 ring-amber-500/20'
                    : 'bg-[#fafaf9] border-[#d3d1cb] text-[#787774] opacity-75'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    targetPickup ? 'bg-amber-100 text-amber-800' : 'bg-neutral-200 text-neutral-500'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
                <div className="text-center">
                  <span className="font-bold text-xs block text-[#201f1d]">自提营业</span>
                  <span
                    className={`inline-block mt-0.5 text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                      targetPickup ? 'bg-amber-100 text-amber-800' : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {targetPickup ? '开启接单' : '暂停自提'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* If Closed, Configure Reason and Reopen Time */}
          {!targetIsOpen && (
            <div className="space-y-3 p-3 bg-amber-50/70 border border-amber-200 rounded-[4px] animate-in fade-in">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>歇业打烊配置 (将实时同步至食客前台)</span>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1">
                <span className="text-[11px] text-[#787774]">常用快速模版:</span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setReasonInput(preset.reason);
                        setReopenTimeInput(preset.reopen);
                      }}
                      className="px-2 py-1 bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 text-[10.5px] rounded-[2px] cursor-pointer transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Input */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-[#37352f]">
                  前台公示打烊说明 *
                </label>
                <input
                  type="text"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="如: 今日已打烊，明日 11:00 起恢复出餐"
                  className="w-full px-2.5 py-1.5 rounded-[3px] bg-white border border-[#d3d1cb] text-xs focus:border-[#37352f] outline-none"
                  required
                />
              </div>

              {/* Reopen Time Input */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-[#37352f]">
                  预计重新开门/出餐时间 *
                </label>
                <input
                  type="text"
                  value={reopenTimeInput}
                  onChange={(e) => setReopenTimeInput(e.target.value)}
                  placeholder="如: 明日 11:00 / 20分钟后"
                  className="w-full px-2.5 py-1.5 rounded-[3px] bg-white border border-[#d3d1cb] text-xs focus:border-[#37352f] outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* Auto-accept Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-[#fbfbfa] border border-[#e6e6e4] rounded-[3px]">
            <div className="space-y-0.5">
              <span className="font-bold text-[#37352f] block">新订单自动确认入后厨 KDS</span>
              <span className="text-[10.5px] text-[#787774]">
                开启后，食客下单即自动推入后厨烤架，无需店长逐笔点击“接单”
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoAcceptOrders}
              onChange={(e) => setAutoAcceptOrders(e.target.checked)}
              className="w-4 h-4 accent-[#2b593f] cursor-pointer"
            />
          </div>
        </SmoothScrollContainer>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 p-3 bg-neutral-50 border-t border-[#e6e6e4] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-[#d3d1cb] hover:bg-[#efefed] text-[#37352f] rounded-full font-normal text-xs cursor-pointer transition-colors shadow-2xs"
            >
              取消
            </button>
            <button
              type="submit"
              className={`px-4 py-1.5 rounded-full text-white font-normal text-xs transition-all shadow-2xs cursor-pointer ${
                targetIsOpen
                  ? 'bg-[#1a1918] hover:bg-black'
                  : 'bg-[#d44333] hover:bg-[#b03022]'
              }`}
            >
              确认并同步状态
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
