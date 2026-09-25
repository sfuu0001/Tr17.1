import React from 'react';
import {
  AlertTriangle,
  MapPin,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  Compass,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeliveryRangeEvaluation, TruckLocationConfig } from '../utils/truckLocationEngine';

interface DeliveryRangeGuideBannerProps {
  evaluation: DeliveryRangeEvaluation;
  onSwitchToPickup: () => void;
  onChangeAddress: () => void;
  onOpenDiagnosticModal?: () => void;
  onOpenRangeDetails?: () => void;
  onRefreshGPS?: () => void;
  isLocatingGPS?: boolean;
}

export const DeliveryRangeGuideBanner: React.FC<DeliveryRangeGuideBannerProps> = ({
  evaluation,
  onSwitchToPickup,
  onChangeAddress,
  onOpenDiagnosticModal,
  onOpenRangeDetails,
  onRefreshGPS,
  isLocatingGPS = false
}) => {
  const handleOpenDetails = onOpenRangeDetails || onOpenDiagnosticModal;

  // If not out of range, do not show warning banner
  if (!evaluation.isOutOfRange) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="w-full mb-1 rounded-xl overflow-hidden border border-amber-300/80 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 shadow-xs p-2 sm:p-2.5 relative"
    >
      {/* Background Decorative Radar Grid */}
      <div className="absolute right-0 top-0 bottom-0 w-24 opacity-10 pointer-events-none overflow-hidden">
        <div className="w-32 h-32 rounded-full border-2 border-amber-600 absolute -right-6 -top-6 animate-ping" style={{ animationDuration: '4s' }} />
        <div className="w-20 h-20 rounded-full border border-amber-800 absolute right-0 top-0" />
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: Warning Title & Distance Breakdown */}
        <div className="flex items-start gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <AlertTriangle className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1">
                <span>超出餐车外卖配送范围</span>
                <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-amber-200/90 text-amber-900 tabular-nums font-bold">
                  超出 {evaluation.exceededKm.toFixed(2)} km
                </span>
              </span>
            </div>

            <p className="text-[11px] text-amber-900/90 mt-0.5 leading-tight">
              当前送达地址「
              <span className="font-semibold text-black underline decoration-amber-400">
                {evaluation.targetAddress}
              </span>
              」距【{evaluation.truckName}】
              <span className="font-bold text-amber-950 tabular-nums">
                {evaluation.distanceKm.toFixed(2)} km
              </span>
              ，仅支持{' '}
              <span className="font-bold text-black bg-amber-200/60 px-1 py-0.2 rounded tabular-nums">
                {evaluation.radiusKm.toFixed(1)} km
              </span>{' '}
              内专送。
            </p>
          </div>
        </div>

        {/* Right: Quick Action Buttons Guide System */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap pt-1 sm:pt-0 border-t sm:border-t-0 border-amber-200/60">
          {/* Action 1: 1-Click Switch to Pickup */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSwitchToPickup}
            className="flex-1 sm:flex-initial px-2.5 py-1 rounded-lg bg-black hover:bg-neutral-800 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-colors"
            title="一键切换为自提模式，免配送费且不受外卖范围限制"
          >
            <ShoppingBag className="w-3 h-3 text-emerald-400" />
            <span>切换为到车自提</span>
          </motion.button>

          {/* Action 2: Change Address within Range */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={onChangeAddress}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-50 text-amber-950 border border-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-700" />
            <span>修改送达地址</span>
          </motion.button>

          {/* Action 3: Open Radar / Diagnostic Details */}
          {handleOpenDetails && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenDetails}
              className="p-1.5 rounded-xl bg-amber-100/80 hover:bg-amber-200 text-amber-900 border border-amber-300/80 transition-colors cursor-pointer"
              title="查看餐车站台与配送范围雷达图"
            >
              <Compass className="w-4 h-4 text-amber-800" />
            </motion.button>
          )}

          {/* Action 4: Refresh GPS */}
          {onRefreshGPS && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRefreshGPS}
              disabled={isLocatingGPS}
              className="p-1.5 rounded-xl bg-white hover:bg-neutral-50 text-amber-800 border border-amber-300 transition-colors cursor-pointer disabled:opacity-50"
              title="重新获取当前高精度 GPS 定位"
            >
              <RefreshCw className={`w-4 h-4 ${isLocatingGPS ? 'animate-spin text-amber-600' : ''}`} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
