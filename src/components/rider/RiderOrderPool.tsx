import React, { useState, useMemo } from 'react';
import {
  Zap,
  MapPin,
  Clock,
  Bike,
  Sparkles,
  Award,
  ArrowUpRight,
  TrendingUp,
  Filter,
  DollarSign,
  ShieldAlert,
  MessageSquare
} from 'lucide-react';
import { PoolDeliveryOrder } from '../../types';
import { RiderRejectionModal } from './RiderRejectionModal';
import { UnifiedOmniChatModal } from '../chat/UnifiedOmniChatModal';
import { useCascadeAuth } from '../../context/CascadeAuthContext';

interface RiderOrderPoolProps {
  orders: PoolDeliveryOrder[];
  onGrabOrder: (order: PoolDeliveryOrder) => void;
  onRejectFromPool?: (orderId: string, orderNo: string, reason: string, reasonCode: string) => void;
  showToast: (msg: string) => void;
}

export const RiderOrderPool: React.FC<RiderOrderPoolProps> = ({
  orders,
  onGrabOrder,
  onRejectFromPool,
  showToast
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'truckSpecial' | 'highReward'>('all');
  const [truckFilter, setTruckFilter] = useState<string>('all');
  const [rejectingOrder, setRejectingOrder] = useState<PoolDeliveryOrder | null>(null);
  const [activeChatOrder, setActiveChatOrder] = useState<PoolDeliveryOrder | null>(null);

  const { canExecute, promptPermissionBlocked } = useCascadeAuth();

  // Group orders by origin to detect same-truck batches
  const truckOrderCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      const key = o.truckId || (o.originName?.includes('01') ? 'truck-01' : o.originName?.includes('02') ? 'truck-02' : 'truck-03');
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [orders]);

  const filteredOrders = orders.filter((o) => {
    if (filterMode === 'truckSpecial' && !o.isTruckSpecial) return false;
    if (filterMode === 'highReward' && o.estimatedEarnings < 12.0) return false;
    
    if (truckFilter !== 'all') {
      const oTruck = o.truckId || (o.originName?.includes('01') ? 'truck-01' : o.originName?.includes('02') ? 'truck-02' : 'truck-03');
      if (oTruck !== truckFilter) return false;
    }
    return true;
  });

  return (
    <div className="space-y-3.5 text-xs">
      {/* Top Banner & Strategy Filters */}
      <div className="bg-white p-2.5 sm:p-3 rounded-[3px] border border-[#e6e6e4] space-y-2 shadow-2xs">
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto hide-scrollbar flex-nowrap shrink-0 py-0.5 max-w-full">
            {[
              { id: 'all', label: '全部待抢单', count: orders.length },
              { id: 'truckSpecial', label: '餐车专属补贴单', count: orders.filter(o => o.isTruckSpecial).length },
              { id: 'highReward', label: '高客单 & VIP 单', count: orders.filter(o => o.estimatedEarnings >= 12.0).length }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterMode(f.id as any)}
                className={`shrink-0 whitespace-nowrap px-2.5 sm:px-3 py-1 rounded-[3px] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === f.id
                    ? 'bg-[#37352f] text-white shadow-xs'
                    : 'bg-[#f1f1ef] text-[#5a5854] hover:bg-[#e8e8e6]'
                }`}
              >
                <span>{f.label}</span>
                <span className={`text-[10px] font-mono px-1 rounded-[2px] ${
                  filterMode === f.id ? 'bg-white/20 text-white' : 'bg-[#e6e6e4] text-[#787774]'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#787774] shrink-0 whitespace-nowrap">
            <span className="flex items-center gap-1 text-[#2b593f]">
              <span className="w-2 h-2 rounded-full bg-[#4dab63] animate-ping" />
              <span>5G 车机抢单专线已联通</span>
            </span>
          </div>
        </div>

        {/* Origin Truck Scoping Tabs */}
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-neutral-100 flex-wrap">
          <span className="text-[11px] font-bold text-neutral-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-neutral-400" />
            <span>来源餐车:</span>
          </span>
          {[
            { id: 'all', label: '全部餐车' },
            { id: 'truck-01', label: '01号·大悦城' },
            { id: 'truck-02', label: '02号·科技园' },
            { id: 'truck-03', label: '03号·新天地' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTruckFilter(t.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                truckFilter === t.id
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Pool Cards Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-[3px] p-12 text-center border border-[#e6e6e4] space-y-2">
          <Bike className="w-10 h-10 text-[#9b9a97] mx-auto" />
          <h4 className="font-bold text-sm text-[#37352f]">暂无更多可抢派送单</h4>
          <p className="text-xs text-[#787774]">餐车附近新增订单时将第一时间为您自动推送</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order, idx) => (
            <div
              key={`pool-ord-${order.id || order.orderNo || idx}-${idx}`}
              className="bg-white rounded-[3px] border border-[#e6e6e4] p-3.5 space-y-3 shadow-2xs hover:border-[#37352f] transition-all"
            >
              {/* Row 1: Header with Earnings and Tags */}
              <div className="flex items-center justify-between border-b border-[#efefed] pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-[#37352f] text-white px-2 py-0.5 rounded-[2px]">
                    {order.orderNo}
                  </span>
                  {order.userId && (
                    <span className="font-mono text-[10.5px] bg-[#f0f4f8] text-[#1c5598] border border-[#c4d6ec] px-1.5 py-0.2 rounded-[2px]">
                      UID: {order.userId.length > 12 ? `${order.userId.slice(0, 10)}...` : order.userId}
                    </span>
                  )}
                  {order.customerName && (
                    <span className="text-[10.5px] font-semibold text-[#5a5854]">
                      {order.customerName}
                    </span>
                  )}
                  {order.isTruckSpecial && (
                    <span className="text-[10.5px] font-bold bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8] px-1.5 py-0.2 rounded-[2px] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#d9730d]" />
                      <span>餐车近距专属</span>
                    </span>
                  )}
                  {order.urgentTag && (
                    <span className="text-[10.5px] font-bold bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] px-1.5 py-0.2 rounded-[2px]">
                      {order.urgentTag}
                    </span>
                  )}
                  {/* Same-Truck Batching Badge */}
                  {(() => {
                    const tKey = order.truckId || (order.originName?.includes('01') ? 'truck-01' : order.originName?.includes('02') ? 'truck-02' : 'truck-03');
                    const count = truckOrderCountMap[tKey] || 0;
                    if (count > 1) {
                      return (
                        <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded-[2px] flex items-center gap-0.5">
                          <span>同车顺路 · 推荐连抢 ({count}单)</span>
                        </span>
                      );
                    }
                    return null;
                  })()}
                  <span className="text-[11px] text-[#787774]">{order.publishedTimeAgo}</span>
                </div>

                {/* Earnings Breakdown */}
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] text-[#787774] block">配送预计收益:</span>
                    <span className="font-mono font-bold text-lg text-[#2b593f]">
                      ¥{order.estimatedEarnings.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Route Visual Distance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {/* Pick-up origin */}
                <div className="bg-[#fbfbfa] p-2.5 rounded-[3px] border border-[#e6e6e4] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#37352f] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#d9730d]" />
                      <span>取餐: {order.originName}</span>
                    </span>
                    <span className="font-mono text-[10px] text-[#787774]">
                      距您 {order.distanceToOriginMeters}m
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5a5854] truncate">{order.originAddress}</p>
                </div>

                {/* Drop-off destination */}
                <div className="bg-[#fbfbfa] p-2.5 rounded-[3px] border border-[#e6e6e4] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#37352f] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#2b593f]" />
                      <span>送达: {order.destinationName}</span>
                    </span>
                    <span className="font-mono text-[10px] text-[#787774]">
                      直线 {order.distanceKm}km
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5a5854] truncate">{order.destinationAddress}</p>
                </div>
              </div>

              {/* Row 3: Items and Delivery SLA */}
              <div className="flex items-center justify-between gap-3 text-[11px] text-[#787774] border-t border-[#efefed] pt-2 flex-wrap">
                <div className="space-y-0.5">
                  <span className="text-[#37352f] font-semibold">餐品概况: {order.itemsSummary}</span>
                  <span className="block text-[10px] text-[#787774]">
                    基础运费 ¥{order.baseFee.toFixed(1)} + 距离 ¥{order.distanceFee.toFixed(1)} + 餐车专属补贴 ¥{order.truckSubsidy.toFixed(1)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[#d9730d] font-bold">送达要求: {order.expectedDeliveryTime}</span>

                  <button
                    type="button"
                    onClick={() => setActiveChatOrder(order)}
                    className="p-1.5 bg-[#f7f7f5] hover:bg-[#eaeae7] text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    title="提前气泡联络商家/客户"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>气泡联络</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectingOrder(order)}
                    className="px-2.5 py-1.5 bg-[#fdf2f2] hover:bg-[#fbe4e4] text-[#c93b3b] border border-[#f0c3c3] rounded-[3px] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    title="无法承运/超出服务半径拒单"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>无法承运</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // 跨车溢出单分层授权校验 (4-Level Mesh Authorization)
                      if (order.isTruckSpecial || order.estimatedEarnings >= 12.0) {
                        const evalResult = canExecute('PERM_OVERFLOW_GRAB');
                        if (!evalResult.allowed) {
                          promptPermissionBlocked('PERM_OVERFLOW_GRAB', '跨车超载溢出抢单分层授权拦截');
                          return;
                        }
                      }
                      onGrabOrder(order);
                      showToast(`抢单成功！已为您锁定工单 ${order.orderNo}`);
                    }}
                    className="px-5 py-2 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                  >
                    <Zap className="w-4 h-4 text-[#fde047]" />
                    <span>立即抢单 (¥{order.estimatedEarnings.toFixed(2)})</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rider Rejection from Pool Modal */}
      {rejectingOrder && (
        <RiderRejectionModal
          isOpen={!!rejectingOrder}
          onClose={() => setRejectingOrder(null)}
          order={rejectingOrder}
          onConfirmReject={(orderId, orderNo, reason, reasonCode) => {
            if (onRejectFromPool) {
              onRejectFromPool(orderId, orderNo, reason, reasonCode);
            } else {
              showToast(`已拒接工单 #${orderNo}，触发自动重入抢单池与赏金加码。`);
            }
          }}
          showToast={showToast}
        />
      )}

      {/* Instant Omni Chat Modal from Order Pool */}
      {activeChatOrder && (
        <UnifiedOmniChatModal
          isOpen={!!activeChatOrder}
          onClose={() => setActiveChatOrder(null)}
          orderNo={activeChatOrder.orderNo}
          viewerRole="rider"
          showToast={showToast}
        />
      )}
    </div>
  );
};
