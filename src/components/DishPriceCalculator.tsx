import React from 'react';
import { TrendingDown, TrendingUp, Bike, Utensils, Sparkles } from 'lucide-react';
import { DishItem, DiningMode } from '../types';

interface DishPriceCalculatorProps {
  dish: DishItem;
  diningMode?: DiningMode;
  layout?: 'vertical' | 'horizontal';
  className?: string;
  showAllRules?: boolean;
}

export const DishPriceCalculator: React.FC<DishPriceCalculatorProps> = ({
  dish,
  diningMode = 'delivery',
  layout = 'horizontal',
  className = '',
  showAllRules = false
}) => {
  // 1. 优惠折扣与立省金额计算
  const hasOriginalPrice = typeof dish.originalPrice === 'number' && dish.originalPrice > dish.price;
  const discountAmount = hasOriginalPrice ? Number((dish.originalPrice! - dish.price).toFixed(2)) : 0;
  const discountRate = hasOriginalPrice
    ? ((dish.price / dish.originalPrice!) * 10).toFixed(1).replace(/\.0$/, '') + '折'
    : null;

  // 2. 环比变动 (MoM Price Difference)
  const baselinePrice =
    typeof dish.prevPrice === 'number'
      ? dish.prevPrice
      : typeof dish.originalPrice === 'number'
      ? dish.originalPrice
      : dish.price;

  const momDiff = Number((dish.price - baselinePrice).toFixed(2));
  const isMomDrop = momDiff < -0.01;
  const isMomRise = momDiff > 0.01;

  // 3. 区分外卖立减 vs 堂食立减规则
  const deliveryDiscountVal = dish.deliveryDiscount || (dish.discountTag?.includes('外卖') && hasOriginalPrice ? discountAmount : 0);
  const dineInDiscountVal = dish.dineInDiscount || 0;

  const deliveryTag = dish.deliveryDiscountTag || (deliveryDiscountVal > 0 ? `外卖立减¥${deliveryDiscountVal.toFixed(0)}` : dish.discountTag);
  const dineInTag = dish.dineInDiscountTag || (dineInDiscountVal > 0 ? `堂食立减¥${dineInDiscountVal.toFixed(0)}` : null);

  // 场景化选取的立减规则标签
  const isDineInMode = diningMode === 'dine_in';
  const currentRuleTag = isDineInMode ? (dineInTag || deliveryTag) : (deliveryTag || dineInTag);
  const currentRuleIsDineIn = isDineInMode && Boolean(dineInTag);

  // 如果无任何折扣/环比/立减信息，则不渲染
  if (!hasOriginalPrice && !isMomDrop && !isMomRise && !deliveryTag && !dineInTag) {
    return null;
  }

  // 构建价格趋势与折扣标签
  let trendNode: React.ReactNode = null;
  if (isMomDrop) {
    trendNode = (
      <span className="inline-flex items-center gap-0.5 text-[8.5px] sm:text-[9px] font-bold text-indigo-700 bg-indigo-50/90 border border-indigo-200/80 px-1.5 py-0.5 rounded-none leading-none shrink-0 whitespace-nowrap">
        <TrendingDown className="w-2.5 h-2.5 shrink-0 text-indigo-600 stroke-[2.5]" />
        <span>
          环比-¥{Math.abs(momDiff).toFixed(0)}
          {discountRate ? ` (${discountRate})` : ''}
        </span>
      </span>
    );
  } else if (isMomRise) {
    trendNode = (
      <span className="inline-flex items-center gap-0.5 text-[8.5px] sm:text-[9px] font-bold text-rose-700 bg-rose-50/90 border border-rose-200/80 px-1.5 py-0.5 rounded-none leading-none shrink-0 whitespace-nowrap">
        <TrendingUp className="w-2.5 h-2.5 shrink-0 text-rose-600 stroke-[2.5]" />
        <span>环比+¥{momDiff.toFixed(0)}</span>
      </span>
    );
  } else if (hasOriginalPrice) {
    trendNode = (
      <span className="inline-flex items-center gap-0.5 text-[8.5px] sm:text-[9px] font-bold text-amber-900 bg-amber-50/90 border border-amber-200/80 px-1.5 py-0.5 rounded-none leading-none shrink-0 whitespace-nowrap">
        <Sparkles className="w-2.5 h-2.5 text-amber-600 shrink-0" />
        <span>{discountRate} · 立省¥{discountAmount.toFixed(0)}</span>
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 max-w-full ${
        layout === 'vertical'
          ? 'flex-col items-start gap-1'
          : 'flex-nowrap overflow-x-auto no-scrollbar py-0.5'
      } ${className}`}
    >
      {trendNode}

      {/* 规则标签 */}
      {currentRuleTag && (
        <span
          className={`inline-flex items-center gap-0.5 text-[8.5px] sm:text-[9px] font-semibold px-1.5 py-0.5 rounded-none leading-none shrink-0 whitespace-nowrap ${
            currentRuleIsDineIn
              ? 'text-amber-900 bg-amber-50/90 border border-amber-200/80'
              : 'text-sky-900 bg-sky-50/90 border border-sky-200/80'
          }`}
        >
          {currentRuleIsDineIn ? (
            <Utensils className="w-2.5 h-2.5 text-amber-700 shrink-0" />
          ) : (
            <Bike className="w-2.5 h-2.5 text-sky-600 shrink-0" />
          )}
          <span>{currentRuleTag}</span>
        </span>
      )}
    </div>
  );
};

