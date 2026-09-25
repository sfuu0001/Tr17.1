import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Tag, Check } from 'lucide-react';
import { DishItem, DiningMode } from '../types';
import { useFlyingCart } from '../utils/FlyingCartContext';
import { useDevSimulation } from '../context/DevSimulationContext';
import { DishDiscountBanner } from './DishDiscountBanner';
import { CompanionDishBadge, CompanionDishInteraction } from './table/CompanionDishBadge';
import { DishArtisanCapsuleToggle, DishArtisanDropdownCard } from './DishArtisanCapsuleCard';
import { useCardScrollReveal, organicCardScrollVariants } from '../utils/useCardScrollReveal';

interface DishListRowProps {
  dish: DishItem;
  diningMode?: DiningMode;
  cartQuantity?: number;
  onSelect: (dish: DishItem) => void;
  onQuickAdd: (dish: DishItem, e: React.MouseEvent) => void;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (dish: DishItem, e: React.MouseEvent) => void;
  isOutOfRange?: boolean;
  deliveryRadiusKm?: number;
  currentDistanceKm?: number;
  onOutOfRangeClick?: () => void;
  companionInteraction?: CompanionDishInteraction;
  onCompanionBadgeClick?: (message: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DishListRow: React.FC<DishListRowProps> = ({
  dish,
  diningMode = 'delivery',
  cartQuantity = 0,
  onSelect,
  onQuickAdd,
  isMultiSelectMode = false,
  isSelected = false,
  onToggleSelect,
  isOutOfRange = false,
  onOutOfRangeClick,
  companionInteraction,
  onCompanionBadgeClick,
  className,
  style
}) => {
  const { elementRef, currentVariant } = useCardScrollReveal();
  const { simulatedOutOfStockDishIds } = useDevSimulation();
  const isSimulatedStockOut = simulatedOutOfStockDishIds.includes(dish.id);
  const isAvailable = dish.available && !isOutOfRange && !isSimulatedStockOut;
  const { triggerFlyToCart } = useFlyingCart();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isArtisanOpen, setIsArtisanOpen] = useState(false);

  // 1. Artisan Code & Ref Code
  const hash = dish.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const artisanLabel = dish.artisanCode || `ARTISAN #${String((hash % 20) + 1).padStart(2, '0')}`;
  const refCodeRaw = dish.refCode ? dish.refCode.replace(/^·\s*/, '').replace(/^REF:\s*/, '') : `SK-${1000 + (hash % 1500)}`;

  // 2. Status Highlight
  const getStatusHighlight = () => {
    if (isOutOfRange) {
      return <span className="text-xs font-semibold text-[#FF9900]">超送达范围</span>;
    }
    if (dish.badgeText?.includes('招牌') || dish.isChefSpecial || dish.badgeText === '已入选招牌') {
      return <span className="text-xs font-semibold text-[#04A777]">已入选招牌</span>;
    }
    if (dish.deliveryDiscount && dish.deliveryDiscount > 0) {
      return <span className="text-xs font-medium text-gray-700">外卖特惠</span>;
    }
    return <span className="text-xs font-medium text-gray-700">堂食人气</span>;
  };

  // 3. Spec / Ratio Label (e.g. 16G, 150G, 3串入)
  const getSpecRatioLabel = () => {
    if (dish.specRatio) return dish.specRatio;
    const name = dish.name.toLowerCase();
    if (name.includes('玉棋') || name.includes('意面')) return '16G';
    if (name.includes('汉堡') || name.includes('slider')) return '150G';
    if (name.includes('m9') || name.includes('和牛')) return 'M9 WAGYU';
    if (name.includes('串') || name.includes('烧鸟') || dish.category === 'skewers') return '3串入';
    return '1份';
  };

  // 4. Discounts & Pricing
  const hasOriginalPrice = typeof dish.originalPrice === 'number' && dish.originalPrice > dish.price;
  const deliveryDiscount = dish.deliveryDiscount || 0;
  const discountAmount = hasOriginalPrice
    ? Number((dish.originalPrice! - dish.price).toFixed(2))
    : deliveryDiscount > 0
    ? deliveryDiscount
    : 0;

  const handleClick = (e: React.MouseEvent) => {
    if (isOutOfRange) {
      if (onOutOfRangeClick) onOutOfRangeClick();
      else onSelect(dish);
      return;
    }

    if (isMultiSelectMode) {
      if (isAvailable && onToggleSelect) onToggleSelect(dish, e);
    } else {
      onSelect(dish);
    }
  };

  const handleQuickAddClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (isMultiSelectMode) {
      handleClick(e);
      return;
    }
    triggerFlyToCart(e.currentTarget, dish.imageUrl);
    onQuickAdd(dish, e);
  };

  const hasOptions = Boolean(dish.optionGroups && dish.optionGroups.length > 0) || Boolean(dish.variants && dish.variants.length > 0);

  return (
    <article
      ref={elementRef as any}
      data-reveal="hidden-down"
      onClick={handleClick}
      id={`dish-item-${dish.id}`}
      data-dish-id={dish.id}
      className={`organic-card-reveal bg-white p-2.5 sm:p-3 border-b border-black cursor-pointer select-none transition-colors duration-150 hover:bg-neutral-50/70 relative min-w-0 ${
        isSelected ? 'bg-neutral-100/70 ring-1 ring-black' : ''
      } ${!isAvailable ? 'opacity-70' : ''} ${className || ''}`}
      style={style}
    >
      {/* Multi-Select Checkbox overlay */}
      {!isOutOfRange && (isMultiSelectMode || isSelected) && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (isAvailable && onToggleSelect) onToggleSelect(dish, e);
          }}
          className="absolute top-2.5 right-2.5 z-30 cursor-pointer"
        >
          {isSelected ? (
            <div className="w-5 h-5 rounded-[2px] bg-black text-white flex items-center justify-center">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-[2px] bg-white border border-gray-300" />
          )}
        </div>
      )}

      {/* Top Metadata Strip with Capsule Switch */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-gray-100 min-w-0 gap-1">
        <DishArtisanCapsuleToggle
          dish={dish}
          isOpen={isArtisanOpen}
          onToggle={() => setIsArtisanOpen(!isArtisanOpen)}
        />
        <div className="shrink-0">{getStatusHighlight()}</div>
      </div>

      {/* Dropdown Mini Card */}
      <DishArtisanDropdownCard
        dish={dish}
        isOpen={isArtisanOpen}
        onClose={() => setIsArtisanOpen(false)}
        onViewBlueprint={() => onSelect(dish)}
      />

      {/* Main Body (with Focus Blur when mini card is open) */}
      <div
        onClick={isArtisanOpen ? (e) => { e.stopPropagation(); setIsArtisanOpen(false); } : undefined}
        className={`flex gap-2 sm:gap-3 min-w-0 transition-all duration-300 relative ${
          isArtisanOpen
            ? 'filter blur-[1.5px] opacity-50 scale-[0.99] select-none cursor-pointer'
            : ''
        }`}
      >
        {/* Left Image */}
        <div className="w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] relative bg-black shrink-0 border border-gray-200 overflow-hidden">
          <img
            alt={dish.name}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            src={dish.imageUrl}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          {companionInteraction ? (
            <div className="absolute top-1 left-1 z-20">
              <CompanionDishBadge
                interaction={companionInteraction}
                variant="card"
                dishName={dish.name}
                onBadgeClick={(_, msg) => onCompanionBadgeClick?.(msg)}
              />
            </div>
          ) : (
            <span className="absolute top-1 left-1 bg-black/60 text-white p-0.5 rounded-[1px] text-[9px] flex items-center justify-center">
              <Tag className="w-2.5 h-2.5" />
            </span>
          )}
          <span className="absolute bottom-0 right-0 bg-black/80 text-gray-200 font-sans text-[8.5px] sm:text-[9px] px-1 font-semibold leading-tight">
            {getSpecRatioLabel()}
          </span>

          {/* 集成到图片中新位置：右上角智能折扣/降价自动渐显淡出提示组件 */}
          <DishDiscountBanner
            dish={dish}
            diningMode={diningMode}
            cartQuantity={cartQuantity}
          />
        </div>

        {/* Right Information */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-black tracking-tight truncate leading-snug">
              {dish.name}
            </h2>
            <p className="text-[8.5px] sm:text-[9px] font-sans text-gray-400 uppercase tracking-wider mt-0.5 truncate">
              {dish.enName.toUpperCase()}
            </p>
            <p className="text-[10.5px] sm:text-[11px] text-gray-500 line-clamp-1 mt-0.5 font-light">
              {dish.description}
            </p>
          </div>

          <div className="flex items-end justify-between pt-1 gap-1 min-w-0">
            <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5 font-amount min-w-0">
              <span className="text-xs sm:text-sm font-bold text-black leading-none">
                ¥{dish.price.toFixed(2)}
              </span>
              {hasOriginalPrice && (
                <span className="text-[9.5px] sm:text-[10px] text-gray-400 line-through font-amount leading-none">
                  ¥{dish.originalPrice!.toFixed(2)}
                </span>
              )}
              {discountAmount > 0 && (
                <span className="text-[8.5px] sm:text-[9px] text-[#00A86B] border border-[#00A86B]/40 px-1 py-0.2 rounded-[1px] font-medium font-amount leading-none whitespace-nowrap">
                  立减¥{discountAmount.toFixed(0)}
                </span>
              )}
            </div>

            {/* Action button */}
            <div className="shrink-0">
              {isOutOfRange ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOutOfRangeClick) onOutOfRangeClick();
                    else onSelect(dish);
                  }}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 border border-[#FF9900]/60 hover:border-[#FF9900] bg-[#FF9900]/5 text-[#FF9900] rounded text-[11px] sm:text-xs font-medium tracking-tight cursor-pointer whitespace-nowrap"
                >
                  改自提
                </button>
              ) : hasOptions && !isMultiSelectMode ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(dish);
                  }}
                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#121212] hover:bg-black text-white text-[11px] sm:text-xs font-medium rounded-[3px] shadow-xs transition-colors flex items-center space-x-1 cursor-pointer select-none whitespace-nowrap"
                >
                  <span>选规格</span>
                  <ChevronDown className="w-2.5 h-2.5 text-gray-300" />
                  {cartQuantity > 0 && (
                    <span className="ml-0.5 bg-[#FF3B30] text-white text-[8px] font-sans font-bold px-1 rounded-full leading-tight">
                      {cartQuantity}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleQuickAddClick}
                  className="w-6 h-6 sm:w-7 sm:h-7 bg-[#121212] hover:bg-black text-white flex items-center justify-center rounded-[3px] text-sm sm:text-base font-bold shadow-xs transition-colors relative cursor-pointer select-none"
                >
                  +
                  {cartQuantity > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#FF3B30] text-white font-sans text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none">
                      {cartQuantity}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
