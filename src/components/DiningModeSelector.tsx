import React, { useState, useRef, useEffect } from 'react';
import {
  Bike,
  Utensils,
  ShoppingBag,
  ChevronDown,
  MapPin,
  Clock,
  Check,
  Sparkles,
  Info,
  AlertTriangle,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeliveryRangeEvaluation } from '../utils/truckLocationEngine';
import { getTruckBusinessStatus, BusinessStatusConfig } from '../utils/businessStatusEngine';
import { safeGetStorage } from '../utils/safeStorage';

export type DiningMode = 'delivery' | 'dine_in' | 'pickup';

interface DiningModeSelectorProps {
  currentMode: DiningMode;
  onModeChange: (mode: DiningMode) => void;
  deliveryAddress: string;
  onChangeAddress: () => void;
  evaluation?: DeliveryRangeEvaluation;
  onOpenRangeDetails?: () => void;
}

export const DiningModeSelector: React.FC<DiningModeSelectorProps> = ({
  currentMode,
  onModeChange,
  deliveryAddress,
  onChangeAddress,
  evaluation,
  onOpenRangeDetails
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 实时响应业务营业状态总线
  const [businessStatus, setBusinessStatus] = useState<BusinessStatusConfig>(() => {
    const activeTid = safeGetStorage('obsidian_active_truck_id', 'truck-01');
    return getTruckBusinessStatus(activeTid);
  });

  useEffect(() => {
    const handleStatusChanged = (e: Event) => {
      const activeTid = safeGetStorage('obsidian_active_truck_id', 'truck-01');
      setBusinessStatus(getTruckBusinessStatus(activeTid));
    };
    window.addEventListener('obsidian_business_status_changed', handleStatusChanged);
    window.addEventListener('obsidian_truck_config_changed', handleStatusChanged);
    return () => {
      window.removeEventListener('obsidian_business_status_changed', handleStatusChanged);
      window.removeEventListener('obsidian_truck_config_changed', handleStatusChanged);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDineHalted = !businessStatus.isOpen || businessStatus.dineInOpen === false;
  const isDeliveryHalted = !businessStatus.isOpen || businessStatus.deliveryOpen === false;
  const isPickupHalted = !businessStatus.isOpen || businessStatus.pickupOpen === false;

  const modesConfig = [
    {
      key: 'delivery' as DiningMode,
      label: '外卖',
      isHalted: isDeliveryHalted,
      haltText: '外卖暂停',
      enLabel: 'Delivery',
      etaText: isDeliveryHalted ? '暂停接单' : '约20-25分送达',
      detailTitle: '专线极速外送',
      detailSub: deliveryAddress,
      badge: isDeliveryHalted ? '暂停接单中' : '起送¥35·满80包邮',
      colorClass: 'text-[#0092D6]',
      activeText: 'text-[#0092D6] font-bold',
      activeBorder: 'border-[#0092D6]',
      activeBg: 'bg-white',
      activeDropCard: 'bg-sky-50/60 border-sky-500 shadow-2xs',
      activeBadgeBg: 'bg-sky-500 text-white',
      icon: (isActive: boolean) => (
        <span className="relative inline-flex items-center justify-center">
          <Bike
            className={`w-4 h-4 transition-transform duration-300 ${
              isActive ? 'text-[#0092D6] animate-bounce' : 'text-[#787770] group-hover:scale-110'
            }`}
          />
          {isActive && (
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#0092D6] animate-ping" />
          )}
        </span>
      )
    },
    {
      key: 'dine_in' as DiningMode,
      label: '堂食',
      isHalted: isDineHalted,
      haltText: '堂食暂停',
      enLabel: 'Dine-in',
      etaText: isDineHalted ? '暂停接单' : '现场即点即烤',
      detailTitle: '餐车吧台就餐',
      detailSub: '黑曜石01号现场 · 03号吧台桌',
      badge: isDineHalted ? '暂停接单中' : '免包装费·热气现食',
      colorClass: 'text-amber-600',
      activeText: 'text-amber-600 font-black',
      activeBorder: 'border-amber-500',
      activeBg: 'bg-amber-50/60',
      activeDropCard: 'bg-amber-50/60 border-amber-500 shadow-2xs',
      activeBadgeBg: 'bg-amber-500 text-white',
      icon: (isActive: boolean) => (
        <span className="relative inline-flex items-center justify-center">
          <Utensils
            className={`w-4 h-4 transition-transform duration-300 ${
              isActive ? 'text-amber-600 rotate-12 scale-110' : 'text-[#787770] group-hover:rotate-45'
            }`}
          />
          {isActive && (
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          )}
        </span>
      )
    },
    {
      key: 'pickup' as DiningMode,
      label: '自提',
      isHalted: isPickupHalted,
      haltText: '自提暂停',
      enLabel: 'Pickup',
      etaText: isPickupHalted ? '暂停接单' : '约10分出餐',
      detailTitle: '到车极速自提',
      detailSub: '大悦城北座中庭黑曜石01号车',
      badge: isPickupHalted ? '暂停接单中' : '免运费·即拿即走',
      colorClass: 'text-emerald-600',
      activeText: 'text-emerald-600 font-black',
      activeBorder: 'border-emerald-500',
      activeBg: 'bg-emerald-50/60',
      activeDropCard: 'bg-emerald-50/60 border-emerald-500 shadow-2xs',
      activeBadgeBg: 'bg-emerald-500 text-white',
      icon: (isActive: boolean) => (
        <span className="relative inline-flex items-center justify-center">
          <ShoppingBag
            className={`w-4 h-4 transition-transform duration-300 ${
              isActive ? 'text-emerald-600 animate-pulse' : 'text-[#787770] group-hover:-translate-y-0.5'
            }`}
          />
          {isActive && (
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          )}
        </span>
      )
    }
  ];

  const activeModeItem = modesConfig.find((m) => m.key === currentMode) || modesConfig[0];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Segmented Desktop / Mobile Trigger Bar with Clean White Background */}
      <div className="flex items-center bg-gray-100/90 p-0.5 rounded-full border border-gray-200 shadow-sm">
        {modesConfig.map((item) => {
          const isSelected = item.key === currentMode;
          return (
            <motion.button
              key={item.key}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                onModeChange(item.key);
              }}
              className={`relative group flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs transition-all cursor-pointer select-none whitespace-nowrap ${
                isSelected
                  ? `${item.activeText}`
                  : 'text-[#686760] hover:text-black hover:bg-neutral-50 font-medium'
              }`}
              title={`${item.label} (${item.etaText})`}
            >
              {isSelected && (
                <motion.div
                  layoutId="active-dining-mode-bg"
                  className={`absolute inset-0 ${item.activeBg} rounded-full border ${item.activeBorder} shadow-2xs -z-0 pointer-events-none`}
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1 sm:gap-1.5">
                {item.icon(isSelected)}
                <span>{item.label}</span>
                {item.isHalted && (
                  <span className="text-[9px] px-1 py-0.2 bg-stone-200/90 text-stone-600 rounded font-normal leading-none">
                    暂停
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}

        {/* Dropdown Expansion Arrow Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.88 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`ml-0.5 p-1 rounded-md transition-colors cursor-pointer ${
            currentMode === 'delivery'
              ? 'text-[#0092D6] hover:bg-sky-50'
              : currentMode === 'dine_in'
              ? 'text-amber-600 hover:bg-amber-50'
              : 'text-emerald-600 hover:bg-emerald-50'
          }`}
          title="展开就餐模式配置"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </motion.button>
      </div>

      {/* Dynamic Dropdown Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 w-[310px] sm:w-[340px] bg-white rounded-2xl shadow-2xl border border-[#e2e3e1] p-3.5 z-50 origin-top"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-[#e2e3e1]">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span className="text-xs font-black text-[#1a1c1b]">就餐服务方式选择</span>
              </div>
              <span className="text-[10px] text-[#787770] font-medium">流动餐车就餐服务</span>
            </div>

            {/* Mode Selection Cards */}
            <div className="space-y-2 mt-3">
              {modesConfig.map((item) => {
                const isSelected = item.key === currentMode;
                return (
                  <motion.div
                    key={item.key}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onModeChange(item.key);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                      isSelected
                        ? item.activeDropCard
                        : 'bg-white border-[#e2e3e1] hover:bg-[#fafaf8] hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? `${item.activeBadgeBg} shadow-xs` : 'bg-[#eaeae7] text-[#1a1c1b]'
                        }`}
                      >
                        {isSelected ? (
                          <span className="text-white">
                            {item.key === 'delivery' && <Bike className="w-4 h-4 text-white" />}
                            {item.key === 'dine_in' && <Utensils className="w-4 h-4 text-white" />}
                            {item.key === 'pickup' && <ShoppingBag className="w-4 h-4 text-white" />}
                          </span>
                        ) : (
                          item.icon(false)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${isSelected ? item.colorClass : 'text-[#1a1c1b]'}`}>
                            {item.label}
                          </span>
                          <span className="text-[10px] text-[#787770] tabular-nums">({item.enLabel})</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium shrink-0 ${
                            isSelected ? 'bg-white/80 border border-current font-bold' : 'bg-neutral-100 text-[#474741]'
                          }`}>
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#474741] truncate mt-0.5">
                          {item.detailSub}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-neutral-600 font-semibold mt-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{item.etaText}</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="shrink-0 pt-1">
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`w-5 h-5 rounded-full ${item.activeBadgeBg} flex items-center justify-center shadow-xs`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Dynamic Action Footer */}
            {currentMode === 'delivery' && (
              <div className="mt-3 pt-2.5 border-t border-[#e2e3e1] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#787770] flex items-center gap-1 truncate max-w-[200px]">
                    <MapPin className="w-3 h-3 shrink-0 text-emerald-600" />
                    {deliveryAddress}
                  </span>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      setIsOpen(false);
                      onChangeAddress();
                    }}
                    className="text-[11px] font-bold text-black hover:underline shrink-0 cursor-pointer"
                  >
                    修改地址
                  </motion.button>
                </div>

                {evaluation && (
                  <div
                    onClick={() => {
                      if (onOpenRangeDetails) {
                        setIsOpen(false);
                        onOpenRangeDetails();
                      }
                    }}
                    className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      evaluation.isOutOfRange
                        ? 'bg-amber-50/90 border-amber-300 text-amber-950 hover:bg-amber-100/90'
                        : 'bg-emerald-50/70 border-emerald-200 text-emerald-950 hover:bg-emerald-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {evaluation.isOutOfRange ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      ) : (
                        <Compass className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold truncate">
                          {evaluation.isOutOfRange
                            ? `超出范围 · 相距 ${evaluation.distanceKm.toFixed(2)}km (限${evaluation.radiusKm.toFixed(1)}km)`
                            : `支持配送 · 相距 ${evaluation.distanceKm.toFixed(2)}km (限${evaluation.radiusKm.toFixed(1)}km)`}
                        </p>
                        <p className="text-[10px] text-[#787770] truncate">
                          {evaluation.isOutOfRange
                            ? '不支持配送范围以外的距离，点击诊断'
                            : '处于专送服务圈内，点击查看雷达测距'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 border border-current shrink-0">
                      雷达
                    </span>
                  </div>
                )}
              </div>
            )}

            {currentMode === 'dine_in' && (
              <div className="mt-3 pt-2.5 border-t border-[#e2e3e1] flex items-center justify-between text-xs text-[#474741]">
                <span className="text-[11px] flex items-center gap-1">
                  <Info className="w-3 h-3 text-amber-600 shrink-0" />
                  入座餐车吧台后即可扫码出餐
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  免外卖打包费
                </span>
              </div>
            )}

            {currentMode === 'pickup' && (
              <div className="mt-3 pt-2.5 border-t border-[#e2e3e1] flex items-center justify-between text-xs text-[#474741]">
                <span className="text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-600 shrink-0" />
                  出餐将发送取餐码至手机
                </span>
                <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                  即到即拿
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
