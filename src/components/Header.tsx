import React, { useState, useEffect, useMemo } from 'react';
import {
  Bike,
  Utensils,
  ChevronDown,
  MessageSquare,
  Search,
  LayoutGrid,
  List,
  Star,
  SlidersHorizontal,
  ShoppingBag,
  Ticket,
  ClipboardList,
  User,
  Compass,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { DiningMode } from './DiningModeSelector';
import { RoleSwitcherDropdown, UserRole } from './RoleSwitcherDropdown';
import { DeliveryRangeEvaluation } from '../utils/truckLocationEngine';
import { ViewMode, DishItem } from '../types';
import { SearchDropdown } from './SearchDropdown';

export interface HeaderRouteConfig {
  title: string;
  badge?: string;
  backText?: string;
  statusText?: string;
  statusDotColor?: string;
  icon?: React.ReactNode;
}

export const getRouteConfig = (tab?: string, previousTab?: string, isVIP?: boolean): HeaderRouteConfig | null => {
  if (!tab || tab === 'home') return null;

  const getBackLabel = () => {
    if (previousTab === 'cart') return '返回选购清单';
    if (previousTab === 'orders') return '返回订单记录';
    if (previousTab === 'profile') return '返回会员中心';
    if (previousTab === 'tracking') return '返回配送轨迹';
    if (previousTab === 'coupons') return '返回优惠券包';
    if (previousTab === 'checkout') return '返回结算确认';
    return '返回点餐';
  };

  const dynamicBackText = getBackLabel();

  switch (tab) {
    case 'cart':
      return {
        title: '餐车选购清单',
        badge: 'CART',
        backText: dynamicBackText,
        statusText: '黑曜石 01 号车 · 实时制作',
        statusDotColor: 'bg-black',
        icon: <ShoppingBag className="w-3.5 h-3.5 text-neutral-800" />
      };
    case 'coupons':
      return {
        title: '我的优惠券包',
        badge: 'VOUCHERS',
        backText: previousTab === 'profile' ? '返回会员中心' : dynamicBackText,
        statusText: '智能自动抵扣已开启',
        statusDotColor: 'bg-black',
        icon: <Ticket className="w-3.5 h-3.5 text-amber-500" />
      };
    case 'checkout':
      return {
        title: '确认结算下单',
        badge: 'CHECKOUT',
        backText: previousTab === 'cart' ? '返回选购清单' : dynamicBackText,
        statusText: '黑曜石 01 号餐车 · 现制直达',
        statusDotColor: 'bg-black',
        icon: <ShoppingBag className="w-3.5 h-3.5 text-neutral-800" />
      };
    case 'orders':
      return {
        title: '全渠道订单记录',
        badge: 'ORDERS',
        backText: dynamicBackText,
        statusText: '实时订单自动同步',
        statusDotColor: 'bg-black',
        icon: <ClipboardList className="w-3.5 h-3.5 text-black" />
      };
    case 'profile':
      return {
        title: '个人与会员中心',
        badge: isVIP ? 'VIP ELITE' : 'MEMBER',
        backText: dynamicBackText,
        statusText: isVIP ? '黑曜石尊享特权生效中' : '尊享会员权益',
        statusDotColor: isVIP ? 'bg-amber-400' : 'bg-neutral-400',
        icon: <User className="w-3.5 h-3.5 text-amber-500" />
      };
    case 'tracking':
      return {
        title: '实时配送轨迹追踪',
        badge: 'GPS RADAR',
        backText: previousTab === 'orders' ? '返回订单记录' : dynamicBackText,
        statusText: 'GPS 专送实时定位中',
        statusDotColor: 'bg-sky-500',
        icon: <Compass className="w-3.5 h-3.5 text-sky-500" />
      };
    default:
      return {
        title: '详情页面',
        backText: '返回点餐'
      };
  }
};

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenRadar: () => void;
  onOpenVIP: () => void;
  isVIPActive: boolean;
  diningMode: DiningMode;
  onDiningModeChange: (mode: DiningMode) => void;
  deliveryAddress: string;
  onChangeAddress: () => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  pendingOrdersCount?: number;
  activeNavTab?: string;
  previousNavTab?: string;
  onBackToMenu?: () => void;
  customRouteConfig?: HeaderRouteConfig;
  onOpenCloudbaseModal?: () => void;
  onOpenMessageForm?: () => void;
  isCloudbaseConnected?: boolean;
  deliveryEvaluation?: DeliveryRangeEvaluation;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  currentTable?: string;
  onSwitchTable?: () => void;
  activeOrderNo?: string;
  onOpenFilterModal?: () => void;
  onlyDiscountFilter?: boolean;
  onToggleDiscountFilter?: () => void;
  onNavigateToPlatformMatrix?: () => void;
  onOpenAuthGate?: (role: 'merchant' | 'rider') => void;
  truckSpotName?: string;
  onOpenPickupDetail?: () => void;
  allDishes?: DishItem[];
  dishQuantitiesInCart?: Record<string, number>;
  onSelectDish?: (dish: DishItem) => void;
  onQuickAdd?: (dish: DishItem, e: React.MouseEvent) => void;
  onAnchorToDish?: (dish: DishItem) => void;
  onAnchorToCategory?: (categoryKey: string) => void;
  activeFilterCount?: number;
  unreadMessagesCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  onOpenCart,
  onOpenRadar,
  onOpenVIP,
  isVIPActive,
  diningMode,
  onDiningModeChange,
  deliveryAddress,
  onChangeAddress,
  currentRole,
  onSelectRole,
  pendingOrdersCount = 3,
  activeNavTab = 'home',
  onOpenMessageForm,
  unreadMessagesCount,
  searchQuery,
  onSearchChange,
  viewMode = 'list',
  onViewModeChange,
  currentTable,
  onSwitchTable,
  activeOrderNo,
  onOpenFilterModal,
  onlyDiscountFilter,
  onToggleDiscountFilter,
  onNavigateToPlatformMatrix,
  onOpenAuthGate,
  deliveryEvaluation,
  truckSpotName = '黑曜石01车 · 北座中庭',
  onOpenPickupDetail,
  allDishes = [],
  dishQuantitiesInCart = {},
  onSelectDish,
  onQuickAdd,
  onAnchorToDish,
  onAnchorToCategory,
  activeFilterCount = 0
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredDishes = useMemo(() => {
    if (!allDishes || allDishes.length === 0) return [];
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return allDishes;
    return allDishes.filter((dish) => {
      const matchName = dish.name.toLowerCase().includes(q);
      const matchDesc = dish.description?.toLowerCase().includes(q);
      const matchTag = dish.badgeText?.toLowerCase().includes(q) || dish.typeTag?.toLowerCase().includes(q);
      const matchSub = dish.subCategory?.toLowerCase().includes(q);
      const matchIngredients = dish.ingredients?.some((ing) => ing.toLowerCase().includes(q));
      return matchName || matchDesc || matchTag || matchSub || matchIngredients;
    });
  }, [allDishes, searchQuery]);

  const [isFullscreen, setIsFullscreen] = useState(() => {
    if (typeof document !== 'undefined') {
      return !!document.fullscreenElement;
    }
    return false;
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch {}
  };

  const displayAddress =
    diningMode === 'delivery'
      ? `外送 · ${deliveryAddress || '静安大悦城商务座 1204室'}`
      : diningMode === 'dine_in'
      ? (currentTable ? `堂食 · ${currentTable}` : '堂食 · 请选座开台')
      : `自提 · ${truckSpotName || '黑曜石01车 · 北座中庭'}`;

  const handleTopAddressClick = () => {
    if (diningMode === 'delivery') {
      onChangeAddress();
    } else if (diningMode === 'dine_in') {
      if (onSwitchTable) onSwitchTable();
      else onChangeAddress();
    } else {
      if (onOpenPickupDetail) onOpenPickupDetail();
      else if (onSwitchTable) onSwitchTable();
      else onChangeAddress();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E4E8] select-none w-full">
      {/* Row 1: Consolidated Status & Service Mode Line (Ultra-compact 40px) */}
      <div className="px-2 sm:px-3 py-1.5 flex items-center justify-between gap-1.5 flex-nowrap min-w-0 bg-white">
        {/* Left: Mode Selector + Compact Address Pill */}
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
          {/* Dining Mode Segmented Selector */}
          <div className="flex items-center border border-[#D0D3D8] rounded p-[2px] bg-white shrink-0 gap-0.5 shadow-3xs">
            <button
              type="button"
              onClick={() => onDiningModeChange('delivery')}
              className={`px-1.5 sm:px-2 py-0.5 rounded font-medium flex items-center space-x-1 cursor-pointer transition-all ${
                diningMode === 'delivery'
                  ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                  : 'text-[#4B5563] hover:text-black hover:bg-neutral-100'
              }`}
              title="外卖专送 · 极速直送"
            >
              <Bike className="w-3 h-3 stroke-current shrink-0" />
              <span className="text-[10.5px] whitespace-nowrap">外卖</span>
            </button>
            <button
              type="button"
              onClick={() => onDiningModeChange('dine_in')}
              className={`px-1.5 sm:px-2 py-0.5 rounded font-medium flex items-center space-x-1 cursor-pointer transition-all ${
                diningMode === 'dine_in'
                  ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                  : 'text-[#4B5563] hover:text-black hover:bg-neutral-100'
              }`}
              title="堂食就餐 · 扫码入座"
            >
              <Utensils className="w-3 h-3 stroke-current shrink-0" />
              <span className="text-[10.5px] whitespace-nowrap">堂食</span>
            </button>
            <button
              type="button"
              onClick={() => onDiningModeChange('pickup')}
              className={`px-1.5 sm:px-2 py-0.5 rounded font-medium flex items-center space-x-1 cursor-pointer transition-all ${
                diningMode === 'pickup'
                  ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                  : 'text-[#4B5563] hover:text-black hover:bg-neutral-100'
              }`}
              title="餐车自提 · 免配送费"
            >
              <ShoppingBag className="w-3 h-3 stroke-current shrink-0" />
              <span className="text-[10.5px] whitespace-nowrap">自提</span>
            </button>
          </div>

          {/* Integrated Address / Table Chip */}
          <button
            type="button"
            onClick={handleTopAddressClick}
            className="flex items-center space-x-1 px-1.5 sm:px-2 py-1 border border-[#D0D3D8] hover:border-neutral-400 rounded bg-neutral-50/70 hover:bg-neutral-100/90 active:scale-[0.98] text-[10.5px] sm:text-[11px] font-semibold text-[#111] max-w-[120px] xs:max-w-[160px] sm:max-w-[210px] truncate cursor-pointer transition-all shadow-3xs group min-w-0"
            title={
              diningMode === 'delivery'
                ? `配送地址: ${deliveryAddress || '静安大悦城'}${deliveryEvaluation?.isOutOfRange ? ' (超出配送范围)' : ''}`
                : diningMode === 'dine_in'
                ? `堂食桌号: ${currentTable || '点击选桌/扫码开台'}`
                : `餐车自提点: ${truckSpotName || '静安大悦城北座中庭餐车'}`
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                diningMode === 'delivery'
                  ? deliveryEvaluation?.isOutOfRange ? 'bg-[#EF4444]' : 'bg-[#0092D6]'
                  : diningMode === 'dine_in'
                  ? currentTable ? 'bg-[#10B981]' : 'bg-[#F59E0B] animate-pulse'
                  : 'bg-[#10B981]'
              }`}
            />
            <span className="truncate">
              {diningMode === 'delivery'
                ? deliveryAddress ? (deliveryAddress.length > 7 ? deliveryAddress.slice(0, 7) + '...' : deliveryAddress) : '静安大悦城...'
                : diningMode === 'dine_in'
                ? currentTable ? `${currentTable}号桌` : '选座开台'
                : truckSpotName ? (truckSpotName.length > 7 ? truckSpotName.slice(0, 7) + '...' : truckSpotName) : '01车自提点'}
            </span>
            <ChevronDown className="w-2.5 h-2.5 text-gray-400 group-hover:text-black shrink-0 transition-colors" />
          </button>
        </div>

        {/* Right: Status + Fullscreen + Message + Role Switcher */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
          {/* #LIVE Pill Status */}
          <div className="hidden md:flex items-center space-x-1 text-[10.5px] tabular-nums font-semibold px-1 py-0.5 text-[#121212]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse shrink-0" />
            <span>#LIVE</span>
          </div>

          {/* 全屏显示切换按钮 */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="w-7 h-7 flex items-center justify-center border border-[#D5D7DA] bg-white text-[#121212] hover:bg-gray-100 rounded transition-colors shadow-3xs cursor-pointer"
            title={isFullscreen ? '退出全屏' : '全屏显示'}
            aria-label={isFullscreen ? '退出全屏' : '全屏显示'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 stroke-current" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 stroke-current" />
            )}
          </button>

          {/* Message Icon */}
          {onOpenMessageForm && (
            <button
              type="button"
              onClick={onOpenMessageForm}
              className={`w-7 h-7 flex items-center justify-center border rounded transition-colors shadow-3xs cursor-pointer relative ${
                activeNavTab === 'order_messages'
                  ? 'border-black bg-black text-white'
                  : 'border-[#D5D7DA] bg-white text-[#121212] hover:bg-gray-100'
              }`}
              title="消息"
            >
              <MessageSquare className="w-3.5 h-3.5 stroke-current" />
              {Boolean(unreadMessagesCount && unreadMessagesCount > 0 && activeNavTab !== 'order_messages') && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#FF3B30] ring-1.5 ring-white" />
              )}
            </button>
          )}

          {/* 方案 A 融合版：全域工作台与分层授权中枢单点入口 */}
          <RoleSwitcherDropdown
            currentRole={currentRole}
            onSelectRole={onSelectRole}
            pendingOrdersCount={pendingOrdersCount}
            onNavigateToPlatformMatrix={onNavigateToPlatformMatrix}
            onOpenAuthGate={onOpenAuthGate}
          />
        </div>
      </div>

      {/* Row 3: Search & Layout Controls Bar (when on home tab) */}
      {activeNavTab === 'home' && (
        <div className="px-2.5 sm:px-3 py-1.5 flex items-center space-x-1.5 sm:space-x-2 border-t border-[#F0F1F3] bg-white min-w-0">
          {/* View Toggle (Grid / List) */}
          {onViewModeChange && (
            <div className="flex items-center border border-[#D0D3D8] rounded overflow-hidden bg-white shrink-0">
              <button
                type="button"
                onClick={() => onViewModeChange('grid2')}
                className={`w-7 h-7 flex items-center justify-center cursor-pointer transition-colors ${
                  viewMode === 'grid2'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'text-gray-400 hover:text-black'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`w-7 h-7 flex items-center justify-center cursor-pointer transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'text-gray-400 hover:text-black'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Search Input Bar with Embedded Penetration & Fast Add Dropdown */}
          <div className="relative flex-1 min-w-0 flex items-center border border-[#D0D3D8] rounded bg-white px-2 h-7 focus-within:border-black transition-all">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-1.5 shrink-0" />
            <input
              type="text"
              value={searchQuery || ''}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                if (onSearchChange) onSearchChange(e.target.value);
                setIsSearchOpen(true);
              }}
              className="w-full min-w-0 bg-transparent text-[11px] placeholder:text-gray-400 focus:outline-none border-none p-0 text-[#111] truncate"
              placeholder="搜索菜品、食材、炭烤..."
            />
            {/* Clear button if search query exists */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  if (onSearchChange) onSearchChange('');
                }}
                className="text-gray-400 hover:text-black p-0.5 mr-1 cursor-pointer shrink-0 transition-colors"
                title="清空搜索"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Favorite & Filter Icons inside search */}
            <div className="flex items-center space-x-1.5 pl-1 border-l border-gray-100 ml-1 text-gray-400 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen((prev) => !prev);
                  if (onToggleDiscountFilter && !isSearchOpen) {
                    onToggleDiscountFilter();
                  }
                }}
                title="风向榜单与特惠"
                className="cursor-pointer flex items-center justify-center p-0.5"
              >
                <Star
                  className={`w-3.5 h-3.5 transition-colors ${
                    isSearchOpen || onlyDiscountFilter
                      ? 'fill-[#FF9900] text-[#FF9900]'
                      : 'text-gray-300 hover:text-[#FF9900]'
                  }`}
                />
              </button>
              <span className="text-gray-200">|</span>
              <button
                type="button"
                onClick={onOpenFilterModal}
                title="高级筛选"
                className="cursor-pointer flex items-center justify-center text-gray-500 hover:text-black transition-colors relative p-0.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 ring-1 ring-white" />
                )}
              </button>
            </div>

            {/* Embedded Search & Penetration Anchor Dropdown */}
            <SearchDropdown
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              searchQuery={searchQuery || ''}
              onSelectSearchQuery={(query) => {
                if (onSearchChange) onSearchChange(query);
              }}
              allDishes={allDishes}
              searchResults={filteredDishes}
              onSelectDish={(dish) => {
                if (onSelectDish) onSelectDish(dish);
                setIsSearchOpen(false);
              }}
              onQuickAdd={(dish, e) => {
                if (onQuickAdd) onQuickAdd(dish, e);
              }}
              onAnchorToDish={(dish) => {
                if (onAnchorToDish) onAnchorToDish(dish);
                setIsSearchOpen(false);
              }}
              onAnchorToCategory={(catKey) => {
                if (onAnchorToCategory) onAnchorToCategory(catKey);
                setIsSearchOpen(false);
              }}
              dishQuantitiesInCart={dishQuantitiesInCart}
            />
          </div>
        </div>
      )}
    </header>
  );
};
