import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Compass,
  Bell,
  Truck,
  CookingPot,
  CheckCircle2,
  Zap,
  Phone,
  MapPin,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  Check
} from 'lucide-react';
import { Order } from '../types';

interface OrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onRefreshOrders?: () => void;
  onOpenRadar?: () => void;
  onOpenVIP?: () => void;
}

type TabType = 'in_progress' | 'recently_delivered' | 'history';

export const OrdersModal: React.FC<OrdersModalProps> = ({
  isOpen,
  onClose,
  orders,
  onRefreshOrders,
  onOpenRadar,
  onOpenVIP
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('in_progress');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // 跟踪最近发生状态变更的订单（保留15秒脉冲指示器）
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<Record<string, number>>({});
  const prevStatusMapRef = useRef<Record<string, string>>({});
  const isOrdersInitRef = useRef(true);

  useEffect(() => {
    if (!orders || orders.length === 0) return;
    if (isOrdersInitRef.current) {
      isOrdersInitRef.current = false;
      const map: Record<string, string> = {};
      orders.forEach((o) => {
        map[String(o.id || o.orderNo)] = `${o.status}_${o.stepIndex}`;
      });
      prevStatusMapRef.current = map;
      return;
    }
    const changed: string[] = [];
    orders.forEach((o) => {
      const key = String(o.id || o.orderNo);
      const sig = `${o.status}_${o.stepIndex}`;
      if (prevStatusMapRef.current[key] && prevStatusMapRef.current[key] !== sig) {
        changed.push(key);
      }
      prevStatusMapRef.current[key] = sig;
    });
    if (changed.length > 0) {
      const now = Date.now();
      setRecentlyUpdatedIds((prev) => {
        const next = { ...prev };
        changed.forEach((k) => { next[k] = now; });
        return next;
      });
    }
  }, [orders]);

  if (!isOpen) return null;

  // Default mock cards matching screenshot exactly
  const defaultInProgressOrders = [
    {
      id: 'ord-ur-9821',
      title: '黑曜石 01 号流动餐车',
      orderNo: 'UR-9821',
      status: 'EN ROUTE',
      statusType: 'en_route',
      estArrival: '12:55:00',
      distance: '1.2 mi',
      itemsCount: 2,
      itemsSummary: '极夜燕麦拿铁 x 1, 现烤肉桂卷 x 1',
      totalAmount: 91.0,
      hasTopAccent: true,
      stepIndex: 3, // 0: 下单, 1: 商家接单, 2: 骑手取件, 3: 配送, 4: 送达
      courierName: '张专员 (专线急速车 01)',
      courierPhone: '138-0012-9821',
      deliveryAddress: '北京市朝阳区大悦城商务座 1204 室'
    },
    {
      id: 'ord-ur-9804',
      title: '黑曜石 01 号流动餐车',
      orderNo: 'UR-9804',
      status: 'PREPARING',
      statusType: 'preparing',
      estArrival: '12 分钟',
      distance: '1.2 mi',
      itemsCount: 1,
      itemsSummary: '黑曜石炭烤双层和牛堡 x 1',
      totalAmount: 87.0,
      hasTopAccent: false,
      stepIndex: 1, // 商家接单
      courierName: '餐车吧台主理人',
      courierPhone: '139-8822-9804',
      deliveryAddress: '黑曜石餐车 01 号现场吧台'
    }
  ];

  // Dynamic active orders from app state
  const dynamicInProgress = orders
    .filter((o) => o.status === 'cooking' || o.status === 'delivering')
    .map((o) => {
      const isDelivering = o.status === 'delivering';
      const isJustUpdated = Boolean(
        (recentlyUpdatedIds[String(o.id)] && Date.now() - recentlyUpdatedIds[String(o.id)] < 15000) ||
        (recentlyUpdatedIds[String(o.orderNo)] && Date.now() - recentlyUpdatedIds[String(o.orderNo)] < 15000) ||
        o.isRecentlyUpdated ||
        (o as any)._justUpdated
      );
      return {
        id: o.id,
        title: o.truckName || '黑曜石 01 号流动餐车',
        orderNo: o.orderNo,
        status: isDelivering ? 'EN ROUTE' : 'PREPARING',
        statusType: isDelivering ? 'en_route' : 'preparing',
        estArrival: o.estimatedDeliveryTime?.replace('约', '')?.replace('后', '')?.trim() || (isDelivering ? '12:55:00' : '12 分钟'),
        distance: '1.2 mi',
        itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
        itemsSummary: o.items
          .map((i) => `${i.name} x ${i.quantity}${i.isStruckOff ? ' [已划菜作废]' : i.isCompensatoryGift ? ' [致歉赠品]' : ''}`)
          .join(', '),
        totalAmount: o.totalAmount,
        hasTopAccent: isDelivering,
        stepIndex: isDelivering ? 3 : 1,
        isRecentlyUpdated: isJustUpdated,
        courierName: o.courierName || (isDelivering ? '张专员 (专线急速车 01)' : '餐车吧台主理人'),
        courierPhone: o.courierPhone || '138-0012-9821',
        deliveryAddress: o.deliveryAddress
      };
    });

  const dynamicDelivered = orders
    .filter((o) => o.status === 'completed')
    .map((o) => {
      const isJustUpdated = Boolean(
        (recentlyUpdatedIds[String(o.id)] && Date.now() - recentlyUpdatedIds[String(o.id)] < 15000) ||
        (recentlyUpdatedIds[String(o.orderNo)] && Date.now() - recentlyUpdatedIds[String(o.orderNo)] < 15000) ||
        o.isRecentlyUpdated ||
        (o as any)._justUpdated
      );
      return {
        id: o.id,
        title: o.truckName || '黑曜石 01 号流动餐车',
        orderNo: o.orderNo,
        status: 'DELIVERED',
        statusType: 'delivered',
        estArrival: o.createdTime || '已送达',
        distance: '1.2 mi',
        itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
        itemsSummary: o.items.map((i) => `${i.name} x ${i.quantity}`).join(', '),
        totalAmount: o.totalAmount,
        hasTopAccent: false,
        stepIndex: 4,
        isRecentlyUpdated: isJustUpdated,
        courierName: o.courierName,
        courierPhone: o.courierPhone,
        deliveryAddress: o.deliveryAddress
      };
    });

  const inProgressList = dynamicInProgress.length > 0 ? dynamicInProgress : defaultInProgressOrders;
  const recentlyDeliveredList =
    dynamicDelivered.length > 0
      ? dynamicDelivered
      : [
          {
            id: 'ord-ur-4890',
            title: '黑曜石 01 号流动餐车',
            orderNo: 'UR-4890',
            status: 'DELIVERED',
            statusType: 'delivered',
            estArrival: '11:20 AM',
            distance: '0.8 mi',
            itemsCount: 4,
            itemsSummary: '炭烤伊比利亚猪排, 温泉蛋牛油果沙拉',
            totalAmount: 186.0,
            hasTopAccent: false,
            stepIndex: 4,
            courierName: '王专员',
            courierPhone: '136-1234-5678',
            deliveryAddress: '大悦城南座'
          }
        ];

  const currentDisplayList =
    activeTab === 'in_progress'
      ? inProgressList
      : activeTab === 'recently_delivered'
      ? recentlyDeliveredList
      : recentlyDeliveredList;

  // Horizontal Step Nodes Flow Component with 5 states
  const renderHorizontalSteps = (stepIndex: number) => {
    const steps = [
      { key: 'placed', label: '下单' },
      { key: 'accepted', label: '商家接单' },
      { key: 'pickup', label: '骑手取件' },
      { key: 'delivering', label: '配送' },
      { key: 'delivered', label: '送达' }
    ];

    const maxIdx = steps.length - 1;
    const progressWidth = `${(Math.min(stepIndex, maxIdx) / maxIdx) * 85}%`;

    return (
      <div className="pt-2 pb-1 px-1">
        <div className="relative flex items-center justify-between">
          <div className="absolute top-2.5 left-4 right-4 h-[2px] bg-[#e5e5e0] z-0" />
          <div
            className="absolute top-2.5 left-4 h-[2px] bg-[#15803d] z-0 transition-all duration-300"
            style={{ width: progressWidth }}
          />

          {steps.map((s, idx) => {
            const isCompleted = idx < stepIndex;
            const isCurrent = idx === stepIndex;
            return (
              <div key={s.key} className="relative z-10 flex flex-col items-center group">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                    isCompleted
                      ? 'bg-[#15803d] text-white shadow-xs'
                      : isCurrent
                      ? 'bg-black text-white ring-2 ring-emerald-500 ring-offset-1 scale-110 shadow-xs'
                      : 'bg-[#eeeee9] text-[#888880]'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : isCurrent ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#aaa9a0]" />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1.5 font-bold tracking-tight whitespace-nowrap ${
                    isCurrent
                      ? 'text-black font-black'
                      : isCompleted
                      ? 'text-[#15803d]'
                      : 'text-[#888880]'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-[#f9f9f7] w-full max-w-md max-h-[92vh] rounded-3xl shadow-2xl border border-[#e2e3e1] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header matching Urban Radar replica */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0 bg-[#f9f9f7]">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenRadar) onOpenRadar();
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-black hover:bg-black/5 transition-colors cursor-pointer"
            title="打开雷达定位"
          >
            <Compass className="w-6 h-6 stroke-[1.8]" />
          </button>

          <h2 className="text-xl font-black tracking-tight text-black text-center flex-1">
            Urban Radar
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#e2e3e1] hover:bg-neutral-100 text-black flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Horizontal Tabs */}
        <div className="px-5 flex items-center gap-2 py-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('in_progress')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'in_progress'
                ? 'bg-black text-white shadow-xs'
                : 'bg-[#eeeee9] text-[#55544e] hover:bg-[#e4e4df]'
            }`}
          >
            In Progress
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recently_delivered')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'recently_delivered'
                ? 'bg-black text-white shadow-xs'
                : 'bg-[#eeeee9] text-[#55544e] hover:bg-[#e4e4df]'
            }`}
          >
            Recently Delivered
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-black text-white shadow-xs'
                : 'bg-[#eeeee9] text-[#55544e] hover:bg-[#e4e4df]'
            }`}
          >
            History
          </button>
        </div>

        {/* Section Heading */}
        <div className="px-5 pt-4 pb-2 shrink-0">
          <h3 className="text-base font-bold text-black tracking-tight">
            {activeTab === 'in_progress'
              ? 'Active Orders'
              : activeTab === 'recently_delivered'
              ? 'Recently Delivered'
              : 'Order History'}
          </h3>
        </div>

        {/* Scrollable Cards Area */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4 hide-scrollbar">
          {currentDisplayList.map((order, idx) => (
            <div
              key={`orders-modal-${order.id || order.orderNo || idx}-${idx}`}
              className="bg-white rounded-2xl border border-[#e2e3e1] shadow-[0px_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden transition-all duration-200 hover:shadow-md"
            >
              {/* Top green accent border if en route */}
              {order.hasTopAccent && (
                <div className="h-1 bg-[#15803d] w-full absolute top-0 left-0 right-0" />
              )}

              <div className="p-4 sm:p-5 space-y-3.5">
                {/* Header Row: Title & Subtitle + Status Badge */}
                <div className="flex items-start justify-between gap-2 mb-[3px]">
                  <div className="min-w-0">
                    <h4 className="text-base sm:text-[17px] font-black text-[#1a1c1b] leading-tight truncate">
                      {order.title}
                    </h4>
                    <p className="text-xs text-[#787770] font-medium mt-0.5">
                      Order #{order.orderNo}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {order.statusType === 'en_route' ? (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#e6f4ea] text-[#15803d] text-[11px] font-black tracking-wider uppercase transition-all duration-300 ${order.isRecentlyUpdated ? 'ring-2 ring-emerald-400/50 shadow-xs' : ''}`}>
                        {order.isRecentlyUpdated ? (
                          <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 animate-pulse-dot" />
                          </span>
                        ) : (
                          <Truck className="w-3.5 h-3.5 fill-current" />
                        )}
                        <span>EN ROUTE</span>
                        {order.isRecentlyUpdated && (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/90 px-1 py-0.2 rounded-full leading-none normal-case animate-pulse">
                            刚刚更新
                          </span>
                        )}
                      </span>
                    ) : order.statusType === 'preparing' ? (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#f0f0ed] text-[#4b5563] text-[11px] font-black tracking-wider uppercase transition-all duration-300 ${order.isRecentlyUpdated ? 'ring-2 ring-amber-400/50 shadow-xs' : ''}`}>
                        {order.isRecentlyUpdated ? (
                          <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500 animate-pulse-dot" />
                          </span>
                        ) : (
                          <CookingPot className="w-3.5 h-3.5" />
                        )}
                        <span>PREPARING</span>
                        {order.isRecentlyUpdated && (
                          <span className="text-[9px] font-black text-amber-700 bg-amber-100/90 px-1 py-0.2 rounded-full leading-none normal-case animate-pulse">
                            刚刚更新
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#e6f4ea] text-[#15803d] text-[11px] font-black tracking-wider uppercase transition-all duration-300 ${order.isRecentlyUpdated ? 'ring-2 ring-emerald-400/50 shadow-xs' : ''}`}>
                        {order.isRecentlyUpdated ? (
                          <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 animate-pulse-dot" />
                          </span>
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>DELIVERED</span>
                        {order.isRecentlyUpdated && (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/90 px-1 py-0.2 rounded-full leading-none normal-case animate-pulse">
                            刚刚更新
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Total Order Amount Only (只显示订单总金额) */}
                <div className="flex items-center justify-between px-3.5 py-1 mb-[10px] bg-[#f9f9f7] rounded-xl border border-[#ecece8]">
                  <span className="text-xs text-[#787770] font-medium">
                    订单总金额:
                  </span>
                  <span className="text-base font-black text-black tracking-tight">
                    ¥{Number(order.totalAmount || 0).toFixed(2)}
                  </span>
                </div>

                {/* Horizontal Step Flow Diagram (流转状态节点示意图: 下单, 商家接单, 骑手取件, 配送, 送达) */}
                <div className="pt-1 pb-1">
                  {renderHorizontalSteps(order.stepIndex ?? (order.statusType === 'en_route' ? 3 : order.statusType === 'delivered' ? 4 : 1))}
                </div>

                {/* Subtle Divider */}
                <div className="border-t border-[#f0f0ed] pt-0 mb-0">
                  {/* 3-Column Metrics Grid */}
                  <div className="grid grid-cols-3 text-center sm:text-left gap-1 pt-2.5">
                    <div>
                      <span className="block text-[10px] tracking-wider text-[#787770] font-bold uppercase mb-0.5">
                        EST. ARRIVAL
                      </span>
                      <span className="text-sm font-black text-[#1a1c1b]">
                        {order.estArrival}
                      </span>
                    </div>

                    <div className="border-x sm:border-x-0 border-[#f0f0ed] px-1 sm:px-0">
                      <span className="block text-[10px] tracking-wider text-[#787770] font-bold uppercase mb-0.5">
                        DISTANCE
                      </span>
                      <span className="text-sm font-black text-[#1a1c1b]">
                        {order.distance}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] tracking-wider text-[#787770] font-bold uppercase mb-0.5">
                        ITEMS
                      </span>
                      <span className="text-sm font-black text-[#1a1c1b]">
                        {order.itemsCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-1">
                  {order.statusType === 'en_route' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenRadar) onOpenRadar();
                      }}
                      className="w-full pt-[7px] pb-[6px] px-4 bg-black text-white text-xs sm:text-sm font-black rounded-xl hover:bg-neutral-800 active:scale-[0.99] transition-all shadow-xs flex items-center justify-center cursor-pointer"
                    >
                      Track Radar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="w-full pt-[7px] pb-[6px] px-4 bg-[#e8e8e6] text-[#1a1c1b] text-xs sm:text-sm font-black rounded-xl hover:bg-[#dededc] active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Bottom Promo Banner: Need it faster? */}
          <div
            onClick={() => {
              onClose();
              if (onOpenVIP) onOpenVIP();
            }}
            className="bg-black text-white rounded-2xl p-4 sm:p-5 shadow-lg flex items-center justify-between cursor-pointer hover:bg-neutral-900 transition-colors mt-2"
          >
            <div className="space-y-0.5 pr-2">
              <h4 className="text-sm sm:text-base font-black text-white tracking-tight">
                Need it faster?
              </h4>
              <p className="text-[11px] sm:text-xs text-neutral-400 font-medium">
                Upgrade to priority routing on your next order.
              </p>
            </div>

            <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-[#22c55e] fill-[#22c55e]" />
            </div>
          </div>
        </div>

        {/* Selected Order Detail Modal */}
        {selectedOrder && (
          <div className="absolute inset-0 bg-[#f9f9f7] z-20 p-5 flex flex-col animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-[#e2e3e1] pb-3 mb-4">
              <div>
                <h4 className="text-base font-bold text-black">{selectedOrder.title}</h4>
                <p className="text-xs text-[#787770]">订单编号 #{selectedOrder.orderNo}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-white border border-[#e2e3e1] flex items-center justify-center text-black hover:bg-neutral-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Horizontal Step Flow inside Detail Modal */}
            <div className="py-2 bg-white rounded-xl px-2 border border-[#ecece8] mb-3">
              {renderHorizontalSteps(selectedOrder.stepIndex ?? 1)}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-[#e2e3e1] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#787770]">订单状态</span>
                  <span className="font-bold text-emerald-700">{selectedOrder.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#787770]">预计送达</span>
                  <span className="font-bold text-black">{selectedOrder.estArrival}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#787770]">订单总金额</span>
                  <span className="font-black text-black text-sm">¥{Number(selectedOrder.totalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#787770]">餐品详情</span>
                  <span className="font-medium text-black max-w-[200px] text-right truncate">
                    {selectedOrder.itemsSummary}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#e2e3e1] flex items-center justify-between">
                <div>
                  <span className="font-bold text-black block">{selectedOrder.courierName}</span>
                  <span className="text-[10px] text-[#787770]">{selectedOrder.courierPhone}</span>
                </div>
                <a
                  href={`tel:${selectedOrder.courierPhone}`}
                  className="px-3 py-1 bg-black text-white rounded-lg text-xs font-bold"
                >
                  致电
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedOrder(null);
                onClose();
                if (onOpenRadar) onOpenRadar();
              }}
              className="w-full py-3 bg-black text-white text-xs font-bold rounded-xl mt-3 cursor-pointer"
            >
              在雷达中追踪
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
