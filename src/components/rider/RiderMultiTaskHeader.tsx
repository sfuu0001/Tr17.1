import React from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Navigation,
  Clock,
  ArrowRight,
  Package,
  Layers,
  Flame,
  AlertCircle,
  KeyRound
} from 'lucide-react';
import { ActiveDeliveryOrder } from '../../types';
import { DeliveryWaypoint, KdsPrepStatus } from '../../types/rider';
import { getOrGeneratePickupCode } from '../../utils/pickupCodeEngine';

interface RiderMultiTaskHeaderProps {
  activeOrders: ActiveDeliveryOrder[];
  selectedOrderId: string;
  onSelectOrder: (orderId: string) => void;
  waypoints: DeliveryWaypoint[];
  kdsStatuses: Record<string, KdsPrepStatus>;
  onNavigateToWaypoint: (wp: DeliveryWaypoint) => void;
  onQuickGrabMore: () => void;
  showToast: (msg: string) => void;
  children?: React.ReactNode;
}

export const RiderMultiTaskHeader: React.FC<RiderMultiTaskHeaderProps> = ({
  activeOrders,
  selectedOrderId,
  onSelectOrder,
  waypoints,
  kdsStatuses,
  onNavigateToWaypoint,
  onQuickGrabMore,
  showToast,
  children
}) => {
  const currentOrder = activeOrders.find((o) => o.id === selectedOrderId) || activeOrders[0];
  const nextPendingWaypoint = waypoints.find((w) => !w.isCompleted);

  return (
    <div className="space-y-2.5">
      {/* 1. Multi-Order Switching Tabs & Embedded Journey Card (1号卡片与嵌入的2号详情折叠卡片) */}
      <div className="bg-white p-2.5 sm:p-3 rounded-[3px] border border-[#e6e6e4] shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-[#2b593f] animate-pulse shrink-0" />
            <span className="font-bold text-xs text-[#37352f] flex items-center gap-1 whitespace-nowrap">
              <Layers className="w-3.5 h-3.5 text-[#2b593f] shrink-0" />
              <span>当前并行专送工单 ({activeOrders.length}/3单)</span>
            </span>
            <span className="text-[10px] font-mono bg-[#edf3ec] text-[#2b593f] px-1.5 py-0.2 rounded border border-[#c4dcbc] whitespace-nowrap shrink-0">
              顺路拼单模式生效中
            </span>
          </div>

          {activeOrders.length < 3 && (
            <button
              type="button"
              onClick={onQuickGrabMore}
              className="text-[11px] font-bold text-[#2b593f] hover:text-[#1e3e2c] bg-[#edf3ec] hover:bg-[#dfeade] px-2 py-0.5 rounded-[2px] border border-[#c4dcbc] flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Zap className="w-3 h-3 text-[#d9730d] shrink-0" />
              <span>顺路抢单 (+1)</span>
            </button>
          )}
        </div>

        {/* Horizontal Order Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {activeOrders.map((order, idx) => {
            const isSelected = order.id === selectedOrderId;
            const kds = kdsStatuses[order.id];
            return (
              <div
                key={`rider-active-${order.id || order.orderNo || idx}-${idx}`}
                onClick={() => onSelectOrder(order.id)}
                className={`p-2.5 rounded-[3px] border transition-all cursor-pointer relative text-left ${
                  isSelected
                    ? 'bg-[#f7fbf8] border-[#2b593f] ring-1 ring-[#2b593f]/20 shadow-2xs'
                    : 'bg-[#fafafa] border-[#e6e6e4] hover:border-[#b4b3ae]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1">
                    <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                      isSelected ? 'bg-[#2b593f] text-white' : 'bg-[#e0deda] text-[#5a5854]'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-mono font-bold text-xs text-[#37352f]">{order.orderNo}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {order.phase === 'pickup' && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5">
                        <KeyRound className="w-2.5 h-2.5 text-amber-600" />
                        <span>{getOrGeneratePickupCode(order.orderNo, order.pickupCode)}</span>
                      </span>
                    )}
                    <span className={`text-[10.5px] font-bold px-1.5 py-0.2 rounded ${
                      order.phase === 'pickup'
                        ? 'bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8]'
                        : 'bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc]'
                    }`}>
                      {order.phase === 'pickup' ? '待取' : '专送中'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#5a5854] truncate">
                  {order.phase === 'pickup' ? order.truckName : order.deliveryAddress}
                </p>

                {/* Micro KDS Bar / Earnings */}
                <div className="mt-1.5 flex items-center justify-between text-[10px] pt-1 border-t border-[#efefed]">
                  <span className="font-mono text-[#2b593f] font-bold">
                    +¥{order.courierEarnings.toFixed(2)}
                  </span>
                  {kds ? (
                    <span className="text-[#d9730d] font-semibold flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5" />
                      <span>{kds.statusText} ({kds.remainingSeconds > 0 ? `${Math.ceil(kds.remainingSeconds / 60)}m` : '就绪'})</span>
                    </span>
                  ) : (
                    <span className="text-[#787774]">{order.etaMinutes}m 内达</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 2号卡片嵌入折叠区域 (Embedded Folded Details Card for Active Order) */}
        {children && (
          <div className="pt-2 border-t border-[#f1f1ef]">
            {children}
          </div>
        )}
      </div>

      {/* 2. Intelligent Sequential Waypoint Path Ribbon */}
      <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-[#2b593f]" />
            <span className="text-xs font-bold text-[#37352f]">
              最优顺路路线规划
            </span>
            <span className="text-[10.5px] text-[#787774] font-mono">
              (预计全程 {waypoints.filter(w => !w.isCompleted).reduce((acc, cur) => acc + cur.estimatedMinutes, 0)} 分钟)
            </span>
          </div>

          {nextPendingWaypoint && (
            <button
              type="button"
              onClick={() => {
                onNavigateToWaypoint(nextPendingWaypoint);
                showToast(`已规划并引导前往下一个途经点: ${nextPendingWaypoint.title}`);
              }}
              className="text-[11px] font-bold text-white bg-[#2b593f] hover:bg-[#204430] px-2.5 py-1 rounded-[3px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs whitespace-nowrap shrink-0"
            >
              <span>导航至下一站 ({nextPendingWaypoint.type === 'pickup' ? '取餐' : '送达'})</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
            </button>
          )}
        </div>

        {/* Mobile View: Single-column vertical flow (手机端单行垂直显示) */}
        <div className="sm:hidden space-y-1.5">
          {waypoints.map((wp, index) => {
            const isNext = nextPendingWaypoint?.id === wp.id;
            return (
              <div
                key={wp.id}
                onClick={() => onNavigateToWaypoint(wp)}
                className={`w-full p-2.5 rounded-[3px] border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  wp.isCompleted
                    ? 'bg-[#f7f7f5] border-[#efefed] text-[#9b9a97] opacity-70'
                    : isNext
                    ? 'bg-[#edf3ec] border-[#c4dcbc] text-[#2b593f] font-semibold ring-1 ring-[#2b593f]/20 shadow-2xs'
                    : 'bg-[#fafafa] border-[#e6e6e4] text-[#37352f] hover:bg-[#f1f1ef]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-5 h-5 rounded-full text-[10.5px] font-bold flex items-center justify-center shrink-0 ${
                    wp.isCompleted
                      ? 'bg-[#e6e6e4] text-[#787774]'
                      : isNext
                      ? 'bg-[#2b593f] text-white'
                      : wp.type === 'pickup'
                      ? 'bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8]'
                      : 'bg-[#e8e8e6] text-[#37352f]'
                  }`}>
                    {wp.isCompleted ? '✓' : index + 1}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold whitespace-nowrap shrink-0 ${
                        wp.type === 'pickup'
                          ? 'bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8]'
                          : 'bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc]'
                      }`}>
                        {wp.type === 'pickup' ? '取餐' : '送达'}
                      </span>
                      <span className="font-bold text-xs truncate text-[#37352f]">
                        {wp.title}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[#787774] truncate font-mono mt-0.5">
                      {wp.distanceDesc} · 约 {wp.estimatedMinutes} 分钟
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isNext && (
                    <span className="text-[10px] font-bold bg-[#2b593f] text-white px-1.5 py-0.5 rounded-[2px] whitespace-nowrap">
                      下一站
                    </span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-[#787774]" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop / Tablet View: Horizontal Ribbon */}
        <div className="hidden sm:flex sm:items-center sm:gap-2 sm:overflow-x-auto sm:pb-1 text-[11px] font-sans scrollbar-thin">
          {waypoints.map((wp, index) => {
            const isNext = nextPendingWaypoint?.id === wp.id;
            return (
              <React.Fragment key={wp.id}>
                <div
                  onClick={() => onNavigateToWaypoint(wp)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-[3px] border transition-all cursor-pointer flex items-center gap-2 ${
                    wp.isCompleted
                      ? 'bg-[#f7f7f5] border-[#efefed] text-[#9b9a97] opacity-70'
                      : isNext
                      ? 'bg-[#edf3ec] border-[#c4dcbc] text-[#2b593f] font-semibold ring-1 ring-[#2b593f]/20'
                      : 'bg-[#fafafa] border-[#e6e6e4] text-[#37352f] hover:bg-[#f1f1ef]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    wp.isCompleted
                      ? 'bg-[#e6e6e4] text-[#787774]'
                      : isNext
                      ? 'bg-[#2b593f] text-white'
                      : wp.type === 'pickup'
                      ? 'bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8]'
                      : 'bg-[#e8e8e6] text-[#37352f]'
                  }`}>
                    {wp.isCompleted ? '✓' : index + 1}
                  </span>

                  <div className="leading-tight">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs">
                        {wp.type === 'pickup' ? '取' : '送'} · {wp.title}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#787774] truncate max-w-[150px] font-mono">
                      {wp.distanceDesc} · 约{wp.estimatedMinutes}m
                    </p>
                  </div>
                </div>

                {index < waypoints.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-[#d3d1cb] shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
