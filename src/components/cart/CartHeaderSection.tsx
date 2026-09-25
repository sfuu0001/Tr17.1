import React from 'react';
import { Trash2, Bike, Utensils, ShoppingBag } from 'lucide-react';
import { DiningMode } from '../DiningModeSelector';

interface CartHeaderSectionProps {
  itemCount: number;
  diningMode: DiningMode;
  onDiningModeChange: (mode: DiningMode) => void;
  onClearClick: () => void;
  truckName?: string;
}

export const CartHeaderSection: React.FC<CartHeaderSectionProps> = ({
  itemCount,
  diningMode,
  onDiningModeChange,
  onClearClick,
  truckName = '黑曜石 01 号车'
}) => {
  return (
    <header className="sticky top-0 z-30 pt-2 pb-1" data-purpose="top-navigation">
      <div className="bg-white p-4 shadow-card border border-[#e6e6e2] rounded-none">
        {/* Title, count and clear action */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-neutral-900">餐车选购清单</h1>
            <span
              id="headerItemCountBadge"
              className="bg-neutral-100 text-neutral-600 text-xs px-2 py-0.5 rounded-full font-medium border border-neutral-200"
            >
              {itemCount} 件餐品
            </span>
          </div>
          <button
            type="button"
            onClick={onClearClick}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 px-2 py-1 rounded-md border border-neutral-200 transition-all cursor-pointer active:scale-95"
            data-purpose="clear-button"
            id="clearCartBtn"
          >
            <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
            <span>清空</span>
          </button>
        </div>

        {/* Food Truck Live Status & Fulfillment Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Status indicator */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate max-w-[150px] sm:max-w-none">
              {truckName} · 实时制作配送
            </span>
          </div>

          {/* Segmented Control Fulfillment Toggle */}
          <nav
            aria-label="履约模式选择"
            className="inline-flex bg-neutral-100 p-1 rounded-full border border-neutral-200"
            data-purpose="fulfillment-mode"
          >
            <button
              type="button"
              id="modeDelivery"
              onClick={() => onDiningModeChange('delivery')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                diningMode === 'delivery'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Bike className={`w-3 h-3 ${diningMode === 'delivery' ? 'text-sky-500' : ''}`} />
              <span>外卖</span>
            </button>

            <button
              type="button"
              id="modeDineIn"
              onClick={() => onDiningModeChange('dine_in')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                diningMode === 'dine_in'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Utensils className={`w-3 h-3 ${diningMode === 'dine_in' ? 'text-amber-500' : ''}`} />
              <span>堂食</span>
            </button>

            <button
              type="button"
              id="modePickup"
              onClick={() => onDiningModeChange('pickup')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                diningMode === 'pickup'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <ShoppingBag className={`w-3 h-3 ${diningMode === 'pickup' ? 'text-emerald-500' : ''}`} />
              <span>自提</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
