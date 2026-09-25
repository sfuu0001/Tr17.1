import React, { useState } from 'react';
import {
  Flame,
  Award,
  ThumbsUp,
  FolderTree,
  ChevronRight,
  ChevronDown,
  Plus,
  Beef,
  Drumstick,
  Coffee,
  Utensils,
  CakeSlice,
  UtensilsCrossed,
  CookingPot,
  Target,
  LocateFixed,
  X
} from 'lucide-react';
import { DishItem } from '../types';
import { CategoryTreeNode, DishRankingItem } from '../types/filter';
import { buildDishTree, getDishRankings } from '../utils/dishTree';

const HOT_KEYWORD_TAGS = [
  { text: '和牛汉堡', icon: <Beef className="w-3.5 h-3.5 text-amber-700 shrink-0" /> },
  { text: '黑松露', icon: <CookingPot className="w-3.5 h-3.5 text-neutral-700 shrink-0" /> },
  { text: '五花肉', icon: <Drumstick className="w-3.5 h-3.5 text-rose-500 shrink-0" /> },
  { text: '冷萃咖啡', icon: <Coffee className="w-3.5 h-3.5 text-sky-600 shrink-0" /> },
  { text: '金黄脆薯', icon: <Utensils className="w-3.5 h-3.5 text-amber-500 shrink-0" /> },
  { text: '舒芙蕾', icon: <CakeSlice className="w-3.5 h-3.5 text-pink-500 shrink-0" /> }
];

const CATEGORY_ANCHORS = [
  { key: 'popular', name: '🔥 热销' },
  { key: 'skewers', name: '🍢 串烧' },
  { key: 'western', name: '🥩 西餐' },
  { key: 'mains', name: '🍲 主食' },
  { key: 'drinks', name: '☕ 特调' },
  { key: 'desserts', name: '🍰 甜品' },
  { key: 'snacks', name: '🍟 小食' }
];

const getTreeCategoryIcon = (catId: string) => {
  switch (catId) {
    case 'skewers':
      return <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600 shrink-0" />;
    case 'western':
      return <Beef className="w-3.5 h-3.5 text-amber-700 shrink-0" />;
    case 'mains':
      return <CookingPot className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    case 'drinks':
      return <Coffee className="w-3.5 h-3.5 text-sky-600 shrink-0" />;
    case 'desserts':
      return <CakeSlice className="w-3.5 h-3.5 text-pink-600 shrink-0" />;
    case 'yakitori':
      return <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    case 'baked':
      return <Utensils className="w-3.5 h-3.5 text-yellow-600 shrink-0" />;
    case 'popular':
      return <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" />;
    default:
      return <Utensils className="w-3.5 h-3.5 text-neutral-600 shrink-0" />;
  }
};

interface SearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSelectSearchQuery: (query: string) => void;
  allDishes: DishItem[];
  searchResults: DishItem[];
  onSelectDish: (dish: DishItem) => void;
  onQuickAdd: (dish: DishItem, e: React.MouseEvent) => void;
  onAnchorToDish?: (dish: DishItem) => void;
  onAnchorToCategory?: (categoryKey: string) => void;
  dishQuantitiesInCart?: Record<string, number>;
}

export const SearchDropdown: React.FC<SearchDropdownProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSelectSearchQuery,
  allDishes,
  searchResults,
  onSelectDish,
  onQuickAdd,
  onAnchorToDish,
  onAnchorToCategory,
  dishQuantitiesInCart = {}
}) => {
  const [activeRankTab, setActiveRankTab] = useState<'hot' | 'chef' | 'praise'>('hot');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const safeAllDishes = Array.isArray(allDishes) ? allDishes : [];
  const safeSearchResults = Array.isArray(searchResults) ? searchResults : [];

  const { hotRankings, chefRankings, praiseRankings } = getDishRankings(safeAllDishes);
  const currentRankings: DishRankingItem[] =
    activeRankTab === 'hot'
      ? hotRankings
      : activeRankTab === 'chef'
      ? chefRankings
      : praiseRankings;

  const dishTree: CategoryTreeNode[] = buildDishTree(safeSearchResults);

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const isSearching = (searchQuery || '').trim().length > 0;

  return (
    <>
      {/* Click-away backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/15 backdrop-blur-[0.5px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Compact iOS-Style Widget Panel (小组件嵌入式样式) */}
      <div className="absolute top-full left-0 right-0 sm:left-auto sm:right-0 mt-1.5 w-full sm:w-[440px] max-w-[96vw] bg-white rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-[#D3D1CB] z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Category Fast Penetration Anchors Bar */}
        {onAnchorToCategory && (
          <div className="px-3 py-1.5 bg-[#f8f8f7] border-b border-[#ecece8] flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none text-[11px] shrink-0">
            <span className="text-[10px] font-bold text-neutral-600 shrink-0 flex items-center gap-1">
              <LocateFixed className="w-3 h-3 text-amber-600 shrink-0" />
              直达分类:
            </span>
            {CATEGORY_ANCHORS.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  onAnchorToCategory(cat.key);
                  onClose();
                }}
                className="px-2 py-0.5 rounded-md bg-white border border-neutral-200/90 text-neutral-700 hover:border-black hover:bg-black hover:text-white transition-all whitespace-nowrap text-[10px] font-semibold cursor-pointer shadow-2xs active:scale-95"
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {!isSearching ? (
          <div className="flex flex-col">
            {/* Widget Header (单行嵌入式表头) */}
            <div className="px-3.5 py-2.5 bg-white border-b border-[#f0f0ed] flex items-center justify-between gap-1.5 shrink-0 select-none">
              <div className="flex items-center gap-1.5 shrink-0">
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-[#1a1c1b] whitespace-nowrap tracking-tight">
                  菜品风向榜
                </span>
              </div>

              {/* Segmented Ranking Tabs */}
              <div className="flex items-center bg-[#f4f4f5] p-0.5 rounded-md border border-[#e4e4e7] shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveRankTab('hot')}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                    activeRankTab === 'hot'
                      ? 'bg-white text-black shadow-xs font-black'
                      : 'text-[#71717a] hover:text-black'
                  }`}
                >
                  <Flame className="w-3 h-3 text-red-500 shrink-0 fill-red-500/20" />
                  <span>热销榜</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRankTab('chef')}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                    activeRankTab === 'chef'
                      ? 'bg-white text-black shadow-xs font-black'
                      : 'text-[#71717a] hover:text-black'
                  }`}
                >
                  <Award className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>主厨榜</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRankTab('praise')}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                    activeRankTab === 'praise'
                      ? 'bg-white text-black shadow-xs font-black'
                      : 'text-[#71717a] hover:text-black'
                  }`}
                >
                  <ThumbsUp className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>好评榜</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-[#71717a] hover:text-black font-bold shrink-0 whitespace-nowrap cursor-pointer p-1"
                title="关闭排行榜"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Compact Ranking List */}
            <div className="px-3 py-1 divide-y divide-[#f4f4f5] max-h-[300px] overflow-y-auto overscroll-contain no-scrollbar">
              {currentRankings.map((item) => {
                const isAvailable = item.dish.available !== false;
                const statusTag = !isAvailable
                  ? '待上架'
                  : item.dish.typeTag || '堂食';
                const inCartQty = dishQuantitiesInCart[item.dish.id] || 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectDish(item.dish);
                      onClose();
                    }}
                    className="py-2 flex items-center justify-between gap-2 hover:bg-[#fafaf9] rounded-md transition-colors cursor-pointer group px-1"
                  >
                    {/* Left: Rank Badge + Dish Thumbnail + Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black shrink-0 ${
                          item.rank === 1
                            ? 'bg-[#ef4444] text-white shadow-2xs'
                            : item.rank === 2
                            ? 'bg-[#f97316] text-white shadow-2xs'
                            : item.rank === 3
                            ? 'bg-[#f59e0b] text-white shadow-2xs'
                            : 'bg-[#f4f4f5] text-[#71717a]'
                        }`}
                      >
                        {item.rank}
                      </span>

                      <img
                        src={item.dish.imageUrl || 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80'}
                        alt={item.dish.name || 'Dish'}
                        className="w-10 h-10 rounded-md object-cover bg-neutral-900 shrink-0 border border-[#e4e4e7]"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />

                      {/* Title & Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#1a1c1b] group-hover:text-black truncate whitespace-nowrap">
                            {item.dish.name || '菜品'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f4f4f5] text-[#71717a] font-medium shrink-0 whitespace-nowrap">
                            {item.tag || '推荐'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#71717a] truncate whitespace-nowrap mt-0.5">
                          <span className="font-bold text-black tabular-nums">¥{(item.dish.price || 0).toFixed(2)}</span>
                          <span>·</span>
                          <span>{statusTag}</span>
                          {inCartQty > 0 && (
                            <span className="ml-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                              已加 {inCartQty}份
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Dual Actions (Penetration Anchor + Quick Add) */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* 菜品穿透锚点按钮 */}
                      {onAnchorToDish && (
                        <button
                          type="button"
                          onClick={() => {
                            onAnchorToDish(item.dish);
                            onClose();
                          }}
                          className="h-7 px-2 rounded-md border border-neutral-200 bg-white hover:bg-black hover:text-white hover:border-black active:scale-95 flex items-center gap-1 text-[11px] font-medium text-neutral-700 transition-all cursor-pointer group/anchor shadow-2xs"
                          title="穿透锚点：直达该菜品在点单主页列表的位置并高亮"
                        >
                          <Target className="w-3.5 h-3.5 text-amber-600 group-hover/anchor:text-amber-400 group-hover/anchor:scale-110 transition-transform" />
                          <span className="hidden sm:inline">直达锚点</span>
                        </button>
                      )}

                      {/* 加购操作按钮 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          onQuickAdd(item.dish, e);
                        }}
                        className={`h-7 px-2.5 rounded-md border text-[11px] font-bold active:scale-95 flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                          inCartQty > 0
                            ? 'bg-black text-white border-black hover:bg-neutral-800'
                            : 'bg-white text-neutral-900 border-[#e4e4e7] hover:border-black hover:bg-neutral-50'
                        }`}
                        title={inCartQty > 0 ? `已选购 ${inCartQty} 份，点击继续加购` : '快速加购'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{inCartQty > 0 ? `已选 ${inCartQty}` : '加购'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Recommendation Pills */}
            <div className="p-3 bg-[#fafaf9] border-t border-[#f0f0ed] shrink-0">
              <span className="text-xs font-bold text-[#71717a] block mb-2 whitespace-nowrap">
                热门搜索推荐:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {HOT_KEYWORD_TAGS.map((item) => (
                  <button
                    key={item.text}
                    type="button"
                    onClick={() => {
                      onSelectSearchQuery(item.text);
                    }}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-[#e4e4e7] text-[#27272a] hover:border-black hover:bg-black hover:text-white transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 group/tag active:scale-95 shadow-2xs"
                  >
                    {item.icon}
                    <span>{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Search Tree View */
          <div className="flex flex-col h-full min-h-0 overflow-hidden">
            <div className="px-3.5 py-2.5 bg-[#fafaf9] border-b border-[#f0f0ed] flex items-center justify-between gap-2 shrink-0 select-none">
              <div className="flex items-center gap-1.5 min-w-0">
                <FolderTree className="w-4 h-4 text-black shrink-0" />
                <span className="text-xs font-bold text-[#1a1c1b] truncate whitespace-nowrap">
                  搜索匹配结构树 (共 {searchResults.length} 款)
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 hover:text-black active:scale-95 transition-all cursor-pointer shrink-0"
                title="关闭搜索结果"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto flex-1 max-h-[360px] space-y-2.5 no-scrollbar overscroll-contain">
              {searchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#71717a] space-y-2">
                  <p>未检索到与「{searchQuery}」匹配的菜品</p>
                  <p className="text-[11px] text-neutral-400">试试搜索：和牛、牛排、烧烤、咖啡、意面</p>
                </div>
              ) : (
                dishTree.map((catNode) => {
                  const isCollapsed = !collapsedCategories[catNode.id];
                  return (
                    <div
                      key={catNode.id}
                      className="border border-[#D3D1CB] rounded-md overflow-hidden bg-white shadow-2xs"
                    >
                      <div
                        onClick={() => toggleCategory(catNode.id)}
                        className="px-3 py-2 bg-[#f4f4f5] flex items-center justify-between cursor-pointer hover:bg-[#ecece9] transition-colors select-none"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-black shrink-0" />
                          )}
                          {getTreeCategoryIcon(catNode.id)}
                          <span className="text-xs font-bold text-black truncate whitespace-nowrap">{catNode.name}</span>
                          <span className="text-[10px] text-[#71717a] hidden sm:inline truncate whitespace-nowrap">
                            ({catNode.enName})
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-black border border-[#e4e4e7] shrink-0 whitespace-nowrap">
                          {catNode.count} 款
                        </span>
                      </div>

                      {!isCollapsed && (
                        <div className="p-2 space-y-2 bg-white">
                          {catNode.subcategories.map((subNode) => (
                            <div key={subNode.id} className="pl-3 border-l-2 border-neutral-300 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#474741]">
                                <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0"></span>
                                <span className="truncate whitespace-nowrap">{subNode.name}</span>
                                <span className="text-[10px] text-[#71717a] shrink-0 whitespace-nowrap">({subNode.dishes.length})</span>
                              </div>

                              <div className="space-y-1 pl-1.5">
                                {subNode.dishes.map((dish) => {
                                  const inCartQty = dishQuantitiesInCart[dish.id] || 0;
                                  return (
                                    <div
                                      key={dish.id}
                                      onClick={() => {
                                        onSelectDish(dish);
                                        onClose();
                                      }}
                                      className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-[#fafaf9] transition-colors cursor-pointer group border border-transparent hover:border-[#e4e4e7]"
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <img
                                          src={dish.imageUrl || 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80'}
                                          alt={dish.name || 'Dish'}
                                          className="w-9 h-9 rounded-md object-cover bg-neutral-900 shrink-0 border border-[#e4e4e7]"
                                          onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                          }}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs font-bold text-[#1a1c1b] group-hover:text-black truncate whitespace-nowrap">
                                              {dish.name || '菜品'}
                                            </span>
                                            {dish.badgeText && (
                                              <span className="text-[9px] px-1 py-0.2 rounded bg-black text-white font-medium shrink-0 whitespace-nowrap">
                                                {dish.badgeText}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1.5 text-[10px] text-[#71717a] truncate whitespace-nowrap">
                                            <span className="font-bold text-black tabular-nums">¥{(dish.price || 0).toFixed(2)}</span>
                                            {inCartQty > 0 && (
                                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                                                已选 {inCartQty}份
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right: Dual Actions (Penetration Anchor + Quick Add) */}
                                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {onAnchorToDish && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              onAnchorToDish(dish);
                                              onClose();
                                            }}
                                            className="h-6 px-1.5 rounded border border-neutral-200 bg-white hover:bg-black hover:text-white hover:border-black active:scale-95 flex items-center gap-1 text-[10px] font-medium text-neutral-700 transition-all cursor-pointer group/anchor shadow-2xs"
                                            title="穿透锚点：直达主列表对应菜品位置"
                                          >
                                            <Target className="w-3 h-3 text-amber-600 group-hover/anchor:text-amber-400" />
                                            <span className="hidden sm:inline">直达</span>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            onQuickAdd(dish, e);
                                          }}
                                          className={`h-6 px-2 rounded border text-[10px] font-bold active:scale-95 flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                                            inCartQty > 0
                                              ? 'bg-black text-white border-black'
                                              : 'bg-white text-black border-[#e4e4e7] hover:border-black'
                                          }`}
                                          title={inCartQty > 0 ? `已选 ${inCartQty} 份，点击继续加购` : '快速加购'}
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>{inCartQty > 0 ? `${inCartQty}` : '加购'}</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

