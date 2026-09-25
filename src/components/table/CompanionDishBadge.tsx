import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, ShoppingBag } from 'lucide-react';

export interface CompanionDishViewer {
  participantId: string;
  displayName: string;
  avatar: string;
  at?: string;
}

export interface CompanionDishCartAdder {
  participantId: string;
  displayName: string;
  avatar: string;
  quantity: number;
}

export interface CompanionDishInteraction {
  viewers: CompanionDishViewer[];
  cartAdders: CompanionDishCartAdder[];
}

interface CompanionDishBadgeProps {
  interaction?: CompanionDishInteraction;
  variant?: 'card' | 'row' | 'detail';
  dishName?: string;
  onBadgeClick?: (e: React.MouseEvent, message: string) => void;
  className?: string;
}

export const CompanionDishBadge: React.FC<CompanionDishBadgeProps> = ({
  interaction,
  variant = 'card',
  dishName,
  onBadgeClick,
  className = ''
}) => {
  if (!interaction) return null;

  const { viewers = [], cartAdders = [] } = interaction;
  const hasCart = cartAdders.length > 0;
  const hasViewers = viewers.length > 0;

  if (!hasCart && !hasViewers) return null;

  // 优先展示已加购状态（防撞单、协同聚合决策），其次展示正在挑选/查看状态
  const isCartState = hasCart;
  const people = isCartState ? cartAdders : viewers;
  const primaryPerson = people[0];
  const totalCount = people.length;

  const cleanName = (name: string) => {
    return name.replace(/^同桌食客\s*[·•-]\s*/, '').trim() || '同桌好友';
  };

  const displayName = cleanName(primaryPerson.displayName);

  let label = '';
  let fullMessage = '';

  if (isCartState) {
    const totalQty = cartAdders.reduce((sum, item) => sum + item.quantity, 0);
    if (totalCount === 1) {
      label = `${displayName} 已选 ${cartAdders[0].quantity}份`;
      fullMessage = `同桌 ${displayName} 已加购 ${cartAdders[0].quantity} 份「${dishName || '此菜品'}」`;
    } else {
      label = `${totalCount}人已选 ${totalQty}份`;
      fullMessage = `同桌共有 ${totalCount} 人已选购「${dishName || '此菜品'}」(合计 ${totalQty} 份)`;
    }
  } else {
    if (totalCount === 1) {
      label = `${displayName} 正在看`;
      fullMessage = `同桌 ${displayName} 刚刚正在查看挑选「${dishName || '此菜品'}」`;
    } else {
      label = `${totalCount}人正在看`;
      fullMessage = `同桌有 ${totalCount} 位好友正在同时关注挑选「${dishName || '此菜品'}」`;
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBadgeClick) {
      onBadgeClick(e, fullMessage);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: -2 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={handleClick}
        title={fullMessage}
        className={`pointer-events-auto select-none cursor-pointer flex items-center shadow-xs transition-transform active:scale-95 ${
          variant === 'row'
            ? 'px-1.5 py-0.5 rounded-md gap-1 text-[10.5px]'
            : variant === 'detail'
            ? 'px-2 py-1 rounded-lg gap-1.5 text-xs'
            : 'px-1.5 py-0.5 rounded-full gap-1 text-[9.5px]'
        } ${
          isCartState
            ? 'bg-amber-600/90 hover:bg-amber-600 text-white backdrop-blur-xs border border-amber-400/40 shadow-amber-900/10'
            : 'bg-neutral-900/85 hover:bg-neutral-900 text-white backdrop-blur-xs border border-white/20 shadow-black/20'
        } ${className}`}
      >
        {/* 头像堆叠 Avatar Stack */}
        <div className="flex -space-x-1.5 items-center shrink-0">
          {people.slice(0, 2).map((person, idx) => (
            <div key={person.participantId + idx} className="relative">
              <img
                src={person.avatar}
                alt={person.displayName}
                className="w-4 h-4 rounded-full object-cover border border-white shrink-0 shadow-2xs"
              />
              {!isCartState && idx === 0 && (
                <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-black animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* 状态图标 */}
        {isCartState ? (
          <ShoppingBag className="w-2.5 h-2.5 text-amber-200 shrink-0" />
        ) : (
          <Eye className="w-2.5 h-2.5 text-emerald-300 shrink-0" />
        )}

        {/* 状态文案 */}
        <span className="font-semibold tracking-tight whitespace-nowrap truncate max-w-[85px] sm:max-w-[110px]">
          {label}
        </span>
      </motion.div>
    </AnimatePresence>
  );
};
