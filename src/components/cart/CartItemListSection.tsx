import React, { useState, useMemo } from 'react';
import {
  Trash2,
  Plus,
  Minus,
  Image as ImageIcon,
  AlignLeft,
  Users,
  User,
  ShoppingBag,
  Clock,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { CartItem } from '../../types';
import { matchDishImageUrl } from '../../utils/dishImageMatcher';
import { OrganicCardReveal } from '../../utils/useCardScrollReveal';

export interface CartItemListSectionProps {
  items: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  diningMode?: string;
  currentTable?: string;
}

interface ParticipantCartGroup {
  id: string;
  name: string;
  cartId: string;
  isOwner: boolean;
  avatar: string;
  status: string;
  items: CartItem[];
  totalQty: number;
  subtotal: number;
}

export const CartItemListSection: React.FC<CartItemListSectionProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  diningMode = 'delivery',
  currentTable = 'A1'
}) => {
  const [viewMode, setViewMode] = useState<'rich' | 'compact'>('rich');
  const isDineIn = diningMode === 'dine_in';
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // 在堂食多人点餐模式下，按点餐人与购物车 ID 自动分层归集
  const groupedCarts: ParticipantCartGroup[] = useMemo(() => {
    if (!isDineIn || items.length === 0) return [];

    // 默认提供桌主 (你)
    const ownerGroup: ParticipantCartGroup = {
      id: 'owner',
      name: '桌主（你）',
      cartId: `#CART-${currentTable}-01`,
      isOwner: true,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces',
      status: '实时编辑中',
      items: [],
      totalQty: 0,
      subtotal: 0
    };

    // 同桌成员分组
    const linGroup: ParticipantCartGroup = {
      id: 'p-lin',
      name: '同桌食客 · 小林',
      cartId: `#CART-${currentTable}-02`,
      isOwner: false,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces',
      status: '已选好 · 待合并提交',
      items: [],
      totalQty: 0,
      subtotal: 0
    };

    const qiangGroup: ParticipantCartGroup = {
      id: 'p-qiang',
      name: '同桌食客 · 阿强',
      cartId: `#CART-${currentTable}-03`,
      isOwner: false,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces',
      status: '加购中',
      items: [],
      totalQty: 0,
      subtotal: 0
    };

    items.forEach((item, index) => {
      // 若已有指定 participantId 则归类，否则按自然顺序智能分配合理示例
      if (item.participantId === 'p-lin') {
        linGroup.items.push(item);
      } else if (item.participantId === 'p-qiang') {
        qiangGroup.items.push(item);
      } else if (items.length > 2 && index === 1) {
        // 多于2样时将第2样划为小林加购展示多人协同
        linGroup.items.push(item);
      } else if (items.length > 3 && index === 2) {
        qiangGroup.items.push(item);
      } else {
        ownerGroup.items.push(item);
      }
    });

    // 计算各组汇总
    const allGroups = [ownerGroup, linGroup, qiangGroup].filter((g) => g.items.length > 0);
    allGroups.forEach((g) => {
      g.totalQty = g.items.reduce((s, i) => s + i.quantity, 0);
      g.subtotal = g.items.reduce((s, i) => s + i.calculatedPrice, 0);
    });

    return allGroups;
  }, [isDineIn, items, currentTable]);

  const renderItemRow = (item: CartItem, isOwner: boolean = true) => {
    const dishImage = matchDishImageUrl(item.dish);
    const unitPrice = item.calculatedPrice / item.quantity;
    const optionsList = Object.values(item.selectedOptions || {});

    return (
      <OrganicCardReveal
        key={item.cartItemId}
        className="pt-3 pb-3 flex gap-3 items-start transition-colors"
      >
        {/* Dish Image (Shown only in 'rich' mode) */}
        {viewMode === 'rich' && (
          <div
            className="w-[68px] h-[68px] shrink-0 overflow-hidden bg-neutral-900 relative shadow-xs border border-neutral-100 rounded-lg"
            id="dishImageWrapper"
          >
            <img
              alt={item.dish.name}
              src={dishImage}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            {item.dish.isPopular && (
              <span className="absolute top-0 left-0 bg-amber-500 text-white text-[9px] font-bold px-1 py-0.2 rounded-br">
                招牌
              </span>
            )}
          </div>
        )}

        {/* Dish Content & Specs */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-bold text-sm text-neutral-900 leading-snug truncate">
              {item.dish.name}
            </h3>
          </div>

          {/* Tags / Modifiers Pills */}
          {optionsList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {optionsList.map((opt, idx) => (
                <span
                  key={idx}
                  className="inline-block text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 font-normal rounded"
                >
                  {opt}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-neutral-400 mt-0.5">现制现烧 · 堂食直传后厨</p>
          )}

          {/* 添加人信息展示 (方便协同点餐确认是谁点的) */}
          {(() => {
            const adderName =
              item.participantName ||
              (isDineIn
                ? item.participantId === 'p-lin'
                  ? '同桌食客 · 小林'
                  : item.participantId === 'p-qiang'
                  ? '同桌食客 · 阿强'
                  : '桌主（你）'
                : '点餐人 · 我');
            const adderAvatar =
              item.participantAvatar ||
              (adderName.includes('小林')
                ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces'
                : adderName.includes('阿强')
                ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces'
                : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces');

            return (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] text-neutral-700 bg-neutral-100/90 px-1.5 py-0.5 rounded-full border border-neutral-200/80 shrink-0">
                  <img
                    src={adderAvatar}
                    alt={adderName}
                    className="w-3.5 h-3.5 rounded-full object-cover shrink-0 border border-neutral-300"
                  />
                  <span>由 <span className="font-semibold text-neutral-900">{adderName}</span> 添加</span>
                </span>
                {isDineIn && (
                  <span className="text-[9px] text-neutral-400 tabular-nums px-1 py-0.2 rounded bg-neutral-50 border border-neutral-200/50">
                    {item.cartId || `#CART-${currentTable}-01`}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Price and Stepper Controller */}
          <div className="flex items-baseline justify-between mt-2.5 pt-0.5">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-neutral-900 tracking-tight font-amount">
                ¥<span className="text-base">{item.calculatedPrice.toFixed(2)}</span>
              </span>
              <span className="text-[11px] text-neutral-400 font-normal font-amount">
                (¥{unitPrice.toFixed(2)}/份)
              </span>
            </div>

            {/* Stepper with Tactile Action */}
            <div
              className="flex items-center gap-1.5 bg-neutral-50 rounded-lg p-0.5 border border-neutral-200"
              data-purpose="stepper"
            >
              <button
                type="button"
                onClick={() => onRemoveItem(item.cartItemId)}
                className="text-neutral-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer active:scale-95"
                title="移除商品"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                aria-label="减少数量"
                onClick={() => {
                  if (item.quantity <= 1) {
                    onRemoveItem(item.cartItemId);
                  } else {
                    onUpdateQuantity(item.cartItemId, item.quantity - 1);
                  }
                }}
                className="w-6 h-6 flex items-center justify-center rounded bg-white text-neutral-700 shadow-xs border border-neutral-200 cursor-pointer active:scale-95 transition-all hover:bg-neutral-50"
              >
                <Minus className="w-3 h-3" />
              </button>

              <span className="w-6 text-center text-xs font-bold text-neutral-900 select-none tabular-nums">
                {item.quantity}
              </span>

              <button
                type="button"
                aria-label="增加数量"
                onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                className="w-6 h-6 flex items-center justify-center rounded bg-neutral-900 text-white shadow-xs cursor-pointer active:scale-95 transition-all hover:bg-black"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </OrganicCardReveal>
    );
  };

  return (
    <section
      className="bg-white p-4 border border-[#e6e6e2] shadow-card rounded-xl space-y-3"
      data-purpose="ordered-dish-list"
    >
      {/* Header with Title & View Mode Switcher */}
      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center gap-1.5">
            {isDineIn ? (
              <>
                <Users className="w-4 h-4 text-orange-600" />
                <span>堂食同桌加购明细</span>
                <span className="px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold">
                  {currentTable}号桌
                </span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4 text-neutral-800" />
                <span>已点餐品明细</span>
              </>
            )}
          </h2>
          <span className="text-xs text-neutral-400 font-medium" id="orderItemCountSummary">
            共 {totalCount} 份
          </span>
        </div>

        {/* View Mode Switcher: 图文 vs 纯文字 */}
        <div
          className="inline-flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs"
          role="group"
          aria-label="餐品展示模式切换"
        >
          <button
            type="button"
            onClick={() => setViewMode('rich')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-all duration-200 cursor-pointer ${
              viewMode === 'rich'
                ? 'bg-white text-neutral-900 font-semibold shadow-xs'
                : 'text-neutral-500 font-medium hover:text-neutral-800'
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            <span>图文</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('compact')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-all duration-200 cursor-pointer ${
              viewMode === 'compact'
                ? 'bg-white text-neutral-900 font-semibold shadow-xs'
                : 'text-neutral-500 font-medium hover:text-neutral-800'
            }`}
          >
            <AlignLeft className="w-3 h-3" />
            <span>纯文字</span>
          </button>
        </div>
      </div>

      {/* 堂食多人分层归集卡片模式 */}
      {isDineIn && groupedCarts.length > 0 ? (
        <div className="space-y-4">
          {groupedCarts.map((group) => (
            <div
              key={group.id}
              className={`rounded-xl border p-3 transition-all ${
                group.isOwner
                  ? 'border-neutral-300 bg-white shadow-xs'
                  : 'border-neutral-200/80 bg-neutral-50/70'
              }`}
            >
              {/* 分组顶部标题栏 */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60 mb-1">
                <div className="flex items-center space-x-2 min-w-0">
                  <img
                    src={group.avatar}
                    alt={group.name}
                    className="w-6 h-6 rounded-full object-cover border border-neutral-200 shrink-0"
                  />
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span className="text-xs font-bold text-neutral-900 truncate">{group.name}</span>
                    <span className="text-[10px] tabular-nums px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                      {group.cartId}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 text-[10.5px]">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${
                      group.isOwner
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    {group.status}
                  </span>
                </div>
              </div>

              {/* 该点餐人所点的菜品列表 */}
              <div className="divide-y divide-neutral-100">
                {group.items.map((item) => renderItemRow(item, group.isOwner))}
              </div>

              {/* 该点餐人独立汇总小计 */}
              <div className="mt-2 pt-2 border-t border-dashed border-neutral-200/80 flex items-center justify-between text-xs font-medium text-neutral-600">
                <span className="text-[11px] text-neutral-500">
                  {group.name} 已点 <strong className="text-neutral-800 tabular-nums">{group.totalQty}</strong> 份
                </span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-[11px] text-neutral-400">分单小计：</span>
                  <span className="text-sm font-bold text-neutral-900 font-amount">
                    ¥{group.subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 标准单人列表模式 */
        <div className="divide-y divide-neutral-100">
          {items.map((item) => renderItemRow(item, true))}
        </div>
      )}
    </section>
  );
};

export default CartItemListSection;

