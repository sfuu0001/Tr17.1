import React, { useState } from 'react';
import {
  History,
  MapPin,
  Clock,
  CheckCircle2,
  TrendingUp,
  Star,
  Sparkles,
  ArrowRight,
  X,
  Play,
  RotateCcw,
  Bike
} from 'lucide-react';
import { HistoricalDelivery } from '../../types/rider';

interface RiderHistoryReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyList: HistoricalDelivery[];
  showToast: (msg: string) => void;
}

export const RiderHistoryReplayModal: React.FC<RiderHistoryReplayModalProps> = ({
  isOpen,
  onClose,
  historyList,
  showToast
}) => {
  const [selectedOrder, setSelectedOrder] = useState<HistoricalDelivery>(historyList[0]);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [replayProgress, setReplayProgress] = useState<number>(100);

  if (!isOpen) return null;

  const totalEarningsToday = historyList.reduce((sum, item) => sum + item.earnings, 0);
  const avgMinutes = Math.round(
    historyList.reduce((sum, item) => sum + item.durationMinutes, 0) / historyList.length
  );

  const startReplay = () => {
    setIsReplaying(true);
    setReplayProgress(0);
    showToast(`正在回放订单 ${selectedOrder.orderNo} 配送实况轨迹...`);

    let cur = 0;
    const timer = setInterval(() => {
      cur += 10;
      if (cur > 100) {
        clearInterval(timer);
        setIsReplaying(false);
        setReplayProgress(100);
        showToast('轨迹回放完毕：全程 0 违章、0 超速、温度锁鲜达标！');
      } else {
        setReplayProgress(cur);
      }
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-[#37352f] w-full max-w-2xl rounded-[4px] border border-[#e6e6e4] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[3px] bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] flex items-center justify-center">
              <History className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-xs text-[#37352f] block">
                今日战绩与履约轨迹回放
              </span>
              <span className="text-[10px] text-[#787774] font-mono">
                DISPATCH METRICS & GPS REPLAY
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
          {/* Summary Stat Tiles */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-[#fafafa] rounded-[3px] border border-[#e6e6e4] text-center">
              <span className="text-[10.5px] text-[#787774] block">今日妥投总单量</span>
              <div className="text-xl font-bold font-mono text-[#2b593f]">
                {historyList.length} <span className="text-xs font-normal">单</span>
              </div>
            </div>
            <div className="p-3 bg-[#fafafa] rounded-[3px] border border-[#e6e6e4] text-center">
              <span className="text-[10.5px] text-[#787774] block">今日履约总收入</span>
              <div className="text-xl font-bold font-mono text-[#d9730d]">
                ¥{totalEarningsToday.toFixed(2)}
              </div>
            </div>
            <div className="p-3 bg-[#fafafa] rounded-[3px] border border-[#e6e6e4] text-center">
              <span className="text-[10.5px] text-[#787774] block">平均每单用时</span>
              <div className="text-xl font-bold font-mono text-[#2383e2]">
                {avgMinutes} <span className="text-xs font-normal">分钟</span>
              </div>
            </div>
          </div>

          {/* GPS Route Replay Visualizer */}
          <div className="p-3.5 bg-[#fafafa] rounded-[3px] border border-[#e6e6e4] space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-[#2b593f]" />
                <span className="font-semibold text-[#37352f]">
                  选中工单实况轨迹: <span className="font-mono text-[#8f6412]">{selectedOrder.orderNo}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={startReplay}
                disabled={isReplaying}
                className="px-3 py-1 bg-[#2b593f] hover:bg-[#204430] disabled:opacity-50 text-white rounded-[3px] text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
              >
                {isReplaying ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isReplaying ? '回放中...' : '回放轨迹'}</span>
              </button>
            </div>

            {/* Simulated Animated Road */}
            <div className="relative w-full h-14 bg-white rounded-[3px] border border-[#e6e6e4] overflow-hidden flex items-center px-4">
              {/* Road line */}
              <div className="absolute inset-x-0 h-1 bg-[#efefed] top-1/2 -translate-y-1/2" />
              <div
                className="absolute left-0 h-1 bg-[#2b593f] top-1/2 -translate-y-1/2 transition-all duration-200"
                style={{ width: `${replayProgress}%` }}
              />

              {/* Waypoints */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-[#8f6412] font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d9730d]" />
                <span>餐车</span>
              </div>

              {/* Courier Marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-200 text-[#2b593f]"
                style={{ left: `calc(16px + (100% - 48px) * ${replayProgress / 100})` }}
              >
                <div className="w-6 h-6 rounded-full bg-[#edf3ec] border border-[#2b593f] flex items-center justify-center shadow-xs">
                  <Bike className="w-3.5 h-3.5 text-[#2b593f]" />
                </div>
              </div>

              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-[#2383e2] font-mono">
                <span>{selectedOrder.customerName}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#2383e2]" />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10.5px] text-[#787774] font-mono pt-0.5">
              <span>骑行里程: {selectedOrder.distanceKm} km</span>
              <span>耗时: {selectedOrder.durationMinutes} 分钟</span>
              <span className="text-[#2b593f]">准时率: 100% (提前妥投)</span>
            </div>
          </div>

          {/* History Order List */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[#37352f] block">今日妥投记录详情:</span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {historyList.map((item) => {
                const isSelected = item.id === selectedOrder.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedOrder(item)}
                    className={`p-2.5 rounded-[3px] border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#edf3ec] border-[#c4dcbc] text-[#2b593f]'
                        : 'bg-white border-[#e6e6e4] text-[#37352f] hover:bg-[#f7f7f5]'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs">{item.orderNo}</span>
                        <span className="text-[10px] text-[#787774] font-mono">{item.completedTime}</span>
                        <span className="text-[10px] bg-[#edf3ec] text-[#2b593f] px-1 py-0.2 rounded border border-[#c4dcbc]">
                          五星好评
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5a5854] truncate">{item.deliveryAddress}</p>
                      <p className="text-[10px] text-[#787774] truncate">{item.itemsSummary}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-[#2b593f] text-sm">
                        +¥{item.earnings.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-[#787774]">{item.durationMinutes}m 完成</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-between text-[11px]">
          <span className="text-[#787774]">所有专送轨迹均已上链存证</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white hover:bg-[#efefed] border border-[#d3d1cb] text-[#37352f] rounded-[3px] font-medium cursor-pointer transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
