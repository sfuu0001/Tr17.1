import React from 'react';
import { Star, ChevronRight, Utensils, Clock, QrCode } from 'lucide-react';
import { DiningMode } from '../DiningModeSelector';
import { BoundTableInfo } from '../../types';

interface CartDeliveryCardProps {
  diningMode: DiningMode;
  deliveryAddress: string;
  onOpenAddress?: () => void;
  isVIPActive: boolean;
  boundTable: BoundTableInfo | null;
  onOpenTableBindModal: () => void;
  truckName?: string;
  truckLocation?: string;
  distanceDesc?: string;
  recipientName?: string;
  recipientPhone?: string;
  houseNumber?: string;
  remarks?: string;
}

export const CartDeliveryCard: React.FC<CartDeliveryCardProps> = ({
  diningMode,
  deliveryAddress,
  onOpenAddress,
  isVIPActive,
  boundTable,
  onOpenTableBindModal,
  truckName = '黑曜石 01 号餐车',
  truckLocation = '静安大悦城北座 1F 中庭',
  distanceDesc = '直距 420m',
  recipientName = '张先生',
  recipientPhone = '138****8821',
  houseNumber,
  remarks
}) => {
  if (diningMode === 'delivery') {
    return (
      <section
        className="bg-white p-3.5 border border-[#e6e6e2] shadow-card rounded-none"
        data-purpose="location-info"
      >
        {/* Header: Route Header & VIP Priority Tag */}
        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-neutral-900">配送路径详情</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/90 px-1.5 py-0.5 rounded font-medium">
              专人直送 · 约 12-15min
            </span>
          </div>
          {isVIPActive && (
            <div className="shrink-0 flex items-center gap-1 bg-amber-50 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-200">
              <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
              <span>VIP优先制作</span>
            </div>
          )}
        </div>

        {/* Route Body: Origin to Destination with Connector */}
        <div className="pt-2.5 relative flex items-start gap-2.5">
          {/* Vertical Step Indicator Line */}
          <div className="flex flex-col items-center pt-1 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 ring-2 ring-neutral-200" />
            <span className="w-0.5 h-8 bg-neutral-200 my-0.5" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
          </div>

          {/* Route Text Details */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Origin */}
            <div className="flex items-center justify-between text-xs gap-2 min-w-0">
              <div className="truncate min-w-0 flex-1">
                <span className="inline-block text-[10px] text-neutral-500 bg-neutral-100 px-1 py-0.5 rounded mr-1 font-medium shrink-0">
                  起送点
                </span>
                <span className="font-medium text-neutral-700">{truckName}</span>
                <span className="text-neutral-400 text-[11px] ml-1">({truckLocation})</span>
              </div>
              <span className="text-[10px] text-neutral-400 shrink-0 tabular-nums">{distanceDesc}</span>
            </div>

            {/* Destination */}
            <div className="flex items-center justify-between text-xs gap-2 min-w-0">
              <div className="truncate min-w-0 flex-1">
                <span className="inline-block text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded mr-1 font-bold shrink-0">
                  收货点
                </span>
                <span className="font-bold text-neutral-900 truncate">{deliveryAddress}</span>
                <div className="text-neutral-500 text-[11px] mt-0.5 font-normal truncate">
                  {recipientName} · {recipientPhone}
                  {houseNumber ? ` · ${houseNumber}` : ''}
                </div>
                {remarks && (
                  <div className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5 inline-block border border-emerald-100 font-medium truncate max-w-full">
                    备注: {remarks}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onOpenAddress}
                className="shrink-0 text-xs text-neutral-600 hover:text-neutral-900 font-medium px-2 py-1 rounded border border-neutral-200 cursor-pointer active:scale-95 flex items-center gap-0.5 transition-colors bg-white shadow-2xs whitespace-nowrap"
              >
                <span>修改</span>
                <ChevronRight className="w-3 h-3 text-neutral-400" />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (diningMode === 'dine_in') {
    return (
      <section
        className="bg-white p-3.5 border border-[#e6e6e2] shadow-card rounded-none"
        data-purpose="dinein-info"
      >
        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-neutral-900">堂食餐位详情</span>
            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/90 px-1.5 py-0.5 rounded font-medium">
              即烤现切 · 传菜到桌
            </span>
          </div>
          {isVIPActive && (
            <div className="shrink-0 flex items-center gap-1 bg-amber-50 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-200">
              <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
              <span>VIP优先排单</span>
            </div>
          )}
        </div>

        <div className="pt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
              {boundTable ? boundTable.code : <Utensils className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-neutral-900">
                  {boundTable ? `就餐桌台: ${boundTable.code} 号桌` : '未选定堂食桌位'}
                </span>
                {boundTable && (
                  <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-medium">
                    {boundTable.zoneLabel} · {boundTable.guests}人
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                {boundTable
                  ? `服务员: ${boundTable.serverName} · 后厨将精准传菜至此桌`
                  : '请先扫码或选择桌台，以便餐车精准派餐'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenTableBindModal}
            className="shrink-0 text-xs text-amber-900 bg-amber-50 hover:bg-amber-100 font-semibold px-2.5 py-1.5 rounded border border-amber-300 cursor-pointer active:scale-95 flex items-center gap-1 transition-all"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{boundTable ? '换桌' : '选桌'}</span>
          </button>
        </div>
      </section>
    );
  }

  // Pickup Mode
  return (
    <section
      className="bg-white p-3.5 border border-[#e6e6e2] shadow-card rounded-none"
      data-purpose="pickup-info"
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-neutral-900">餐车自提详情</span>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/90 px-1.5 py-0.5 rounded font-medium">
            免排队 · 提货码秒取
          </span>
        </div>
        <div className="shrink-0 flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
          <Clock className="w-3 h-3 text-emerald-600" />
          <span>预计 8-10min 备齐</span>
        </div>
      </div>

      <div className="pt-2.5 flex items-center justify-between text-xs">
        <div className="min-w-0 pr-2">
          <div className="font-bold text-neutral-900 truncate">
            自提窗口: {truckName} ({truckLocation})
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            下单制作完成后将生成 4 位专属提货码，直接到车窗凭码取餐
          </p>
        </div>
        <span className="shrink-0 text-[10px] text-emerald-800 bg-emerald-100/80 px-2 py-1 rounded font-bold">
          免配送费
        </span>
      </div>
    </section>
  );
};
