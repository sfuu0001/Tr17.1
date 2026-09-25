import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingDown, Percent, Bike, Utensils } from 'lucide-react';
import { DishItem, DiningMode } from '../types';

interface DishDiscountBannerProps {
  dish: DishItem;
  diningMode?: DiningMode;
  cartQuantity?: number;
  className?: string;
}

/**
 * 菜品图片区域智能折扣/降价自动渐显淡出提示组件
 * 
 * 布局重构说明（Anti-Collision Layout）：
 * - 移至图片【右上角】悬浮，彻底与底部的【即时出餐 / 现制现售】与【制作时长】解耦，实现四角清晰分工。
 * - 具备购物车计数气泡自适应避让能力。
 * - 采用磨砂黑曜石半透明微光质感（Glassmorphism），柔和连贯的呼吸式渐显与淡出（Fade In & Out）。
 */
export const DishDiscountBanner: React.FC<DishDiscountBannerProps> = ({
  dish,
  diningMode = 'delivery',
  cartQuantity = 0,
  className = ''
}) => {
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);

  // 1. 自动判断规则
  const hasOriginalPrice = typeof dish.originalPrice === 'number' && dish.originalPrice > dish.price;
  const originalSavings = hasOriginalPrice ? Number((dish.originalPrice! - dish.price).toFixed(1)) : 0;
  
  const hasPriceDrop = typeof dish.prevPrice === 'number' && dish.price < dish.prevPrice;
  const priceDropAmount = hasPriceDrop ? Number((dish.prevPrice! - dish.price).toFixed(1)) : 0;

  const hasDeliveryDiscount = Boolean(dish.deliveryDiscount && dish.deliveryDiscount > 0);
  const hasDineInDiscount = Boolean(dish.dineInDiscount && dish.dineInDiscount > 0);
  const customTag = dish.discountTag;

  // 聚合当前菜品的所有优惠提示文本列表
  const messages: { icon: 'sparkle' | 'drop' | 'delivery' | 'dinein' | 'percent'; text: string; highlight: string }[] = [];

  if (hasPriceDrop) {
    messages.push({
      icon: 'drop',
      text: '环比降价',
      highlight: `直降¥${priceDropAmount}`
    });
  }

  if (hasOriginalPrice) {
    const rate = ((dish.price / dish.originalPrice!) * 10).toFixed(1).replace(/\.0$/, '');
    messages.push({
      icon: 'percent',
      text: `限时${rate}折`,
      highlight: `省¥${originalSavings}`
    });
  }

  if (diningMode === 'delivery' && hasDeliveryDiscount) {
    messages.push({
      icon: 'delivery',
      text: '外卖专享',
      highlight: `立减¥${dish.deliveryDiscount}`
    });
  } else if (diningMode === 'dine_in' && hasDineInDiscount) {
    messages.push({
      icon: 'dinein',
      text: '堂食专享',
      highlight: `立减¥${dish.dineInDiscount}`
    });
  } else if (customTag) {
    messages.push({
      icon: 'sparkle',
      text: '特惠活动',
      highlight: customTag
    });
  }

  // 周期性轮播提示文本（如有多个优惠）
  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [messages.length]);

  // 如果非折扣/降价商品，则不渲染
  if (messages.length === 0) {
    return null;
  }

  const currentMsg = messages[activeMessageIndex % messages.length];

  return (
    <div
      className={`absolute top-1.5 right-1.5 z-10 pointer-events-none flex items-center justify-end max-w-[58%] sm:max-w-[65%] ${
        cartQuantity > 0 ? 'pr-5' : ''
      } ${className}`}
    >
      <div
        key={`${dish.id}-${activeMessageIndex}`}
        className="max-w-full inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-black/80 backdrop-blur-md border border-amber-400/50 text-amber-200 text-[8px] sm:text-[9px] font-bold shadow-md animate-pulse-soft transition-all duration-700 ease-in-out whitespace-nowrap overflow-hidden"
        style={{
          animation: 'dishBannerFadeInOut 3.8s ease-in-out infinite'
        }}
      >
        {currentMsg.icon === 'drop' ? (
          <TrendingDown className="w-2.5 h-2.5 text-amber-400 shrink-0" />
        ) : currentMsg.icon === 'delivery' ? (
          <Bike className="w-2.5 h-2.5 text-sky-400 shrink-0" />
        ) : currentMsg.icon === 'dinein' ? (
          <Utensils className="w-2.5 h-2.5 text-amber-400 shrink-0" />
        ) : currentMsg.icon === 'percent' ? (
          <Percent className="w-2.5 h-2.5 text-amber-400 shrink-0" />
        ) : (
          <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
        )}

        <span className="text-white/85 font-medium truncate">{currentMsg.text}</span>
        <span className="text-amber-300 font-extrabold shrink-0">{currentMsg.highlight}</span>
      </div>
    </div>
  );
};
