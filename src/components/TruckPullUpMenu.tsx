import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Compass,
  Flame,
  Tag,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Ticket,
  Percent,
  ArrowRight,
  Check,
  Gift,
  Clock,
  Zap,
  X,
  Navigation,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Award,
  Plus,
  ShoppingBag,
  PhoneCall,
  Calendar,
  Layers,
  Thermometer,
  BatteryCharging,
  ChefHat
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TruckInfo, DishItem } from '../types';
import { DiningMode } from './DiningModeSelector';

interface TruckPullUpMenuProps {
  isOpen: boolean;
  onClose: () => void;
  truck: TruckInfo;
  orderCount?: number;
  deliveryAddress?: string;
  diningMode?: DiningMode;
  dishes?: DishItem[];
  onSelectDish?: (dish: DishItem) => void;
  onQuickAdd?: (dish: DishItem, e: React.MouseEvent) => void;
  onOpenOrders?: () => void;
  onOpenRadar?: () => void;
  onOpenVIP?: () => void;
  onChangeAddress?: () => void;
  onScrollToMenu?: () => void;
  onOpenCart?: () => void;
}

// 热门活动轮播数据（每2秒滚动切换）
const HOT_PROMO_TICKER = [
  {
    id: 'p1',
    tag: '限时秒杀',
    tagBg: 'bg-rose-50 text-rose-600 border-rose-200',
    icon: Flame,
    title: '黑松露和牛汉堡 2件享8折',
    subText: '现烤直送 · 今日已抢280份',
    discount: '8.0折',
    targetTab: 'hotness' as const
  },
  {
    id: 'p2',
    tag: '大额满减',
    tagBg: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Zap,
    title: '全场满¥35立减¥5，新客首单免配送费',
    subText: '全品类通用 · 自动抵扣',
    discount: '立减¥5',
    targetTab: 'coupons' as const
  },
  {
    id: 'p3',
    tag: '买一赠一',
    tagBg: 'bg-purple-50 text-purple-600 border-purple-200',
    icon: Gift,
    title: '暗夜冷萃生椰拿铁 领券买一送一',
    subText: '限量200杯 · 现萃特调',
    discount: '买1赠1',
    targetTab: 'hotness' as const
  },
  {
    id: 'p4',
    tag: '爆款尝鲜',
    tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Flame,
    title: '果木烟熏脆皮烤五花肉 现点现切',
    subText: '热度TOP1 · 主厨特制酱',
    discount: '立省¥8',
    targetTab: 'dishes' as const
  },
  {
    id: 'p5',
    tag: '双人狂欢',
    tagBg: 'bg-blue-50 text-blue-600 border-blue-200',
    icon: Tag,
    title: '周末炭烤双人野餐套餐 享75折',
    subText: '赠特调饮品2杯 · 送野餐垫',
    discount: '7.5折',
    targetTab: 'hotness' as const
  }
];

// 最新活动热度排行榜
const HOTNESS_RANKING = [
  {
    rank: 1,
    id: 'dish-1',
    title: '碳烤和牛小汉堡双重奏',
    category: '主食招牌',
    hotnessScore: '99.8w',
    trend: '+42% 飙升',
    price: '¥63.0',
    originalPrice: '¥68.0',
    tag: '炭火现烤',
    highlight: '黑松露蛋黄酱 + A5和牛饼',
    salesCount: '日销 380+ 份',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80'
  },
  {
    rank: 2,
    id: 'dish-2',
    title: '煮松露墨汁土豆玉棋',
    category: '黑珍珠融合',
    hotnessScore: '96.4w',
    trend: '+35% 增长',
    price: '¥88.0',
    originalPrice: null,
    tag: '现熬浓汁',
    highlight: '黑冬松露 + 墨鱼汁甘薯玉棋',
    salesCount: '日销 210+ 份',
    imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&auto=format&fit=crop&q=80'
  },
  {
    rank: 3,
    id: 'dish-3',
    title: '果木烟熏脆皮烤五花肉',
    category: '炭烤特惠',
    hotnessScore: '93.1w',
    trend: '+28% 热门',
    price: '¥55.0',
    originalPrice: '¥58.0',
    tag: '外卖立减¥5',
    highlight: '苹果木低温慢熏12小时',
    salesCount: '日销 290+ 份',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80'
  },
  {
    rank: 4,
    id: 'dish-4',
    title: '暗夜冷萃生椰咖啡',
    category: '特调冷萃',
    hotnessScore: '88.5w',
    trend: '+19% 稳定',
    price: '¥28.0',
    originalPrice: '¥32.0',
    tag: '买一赠一券',
    highlight: '耶加雪菲冷萃 + 纯天然生椰乳',
    salesCount: '日销 450+ 杯',
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&auto=format&fit=crop&q=80'
  }
];

// 优惠券折扣力度排行榜
const COUPON_DISCOUNT_RANKING = [
  {
    rank: 1,
    code: 'UR-50OFF',
    name: '5折无门槛狂欢半价神券',
    discountType: '5.0折',
    discountStrength: 98,
    maxDeduct: '最高立减 ¥30',
    condition: '无门槛立减 · 全品类',
    validPeriod: '今日有效 (剩余 38 张)',
    claimed: false
  },
  {
    rank: 2,
    code: 'UR-BIG30',
    name: '满¥100立减¥30 大额专享券',
    discountType: '立减¥30',
    discountStrength: 88,
    maxDeduct: '直减 ¥30.00',
    condition: '满 ¥100 可用 · 炭烤套餐专享',
    validPeriod: '本周通用 (剩余 120 张)',
    claimed: false
  },
  {
    rank: 3,
    code: 'UR-LUNCH15',
    name: '午间能量满¥50立减¥15券',
    discountType: '立减¥15',
    discountStrength: 76,
    maxDeduct: '直减 ¥15.00',
    condition: '满 ¥50 可用 · 11:00-14:00',
    validPeriod: '午市限时 (剩余 260 张)',
    claimed: true
  },
  {
    rank: 4,
    code: 'UR-VIP5',
    name: 'VIP 会员满¥35立减¥5立减券',
    discountType: '立减¥5',
    discountStrength: 65,
    maxDeduct: '直减 ¥5.00',
    condition: '满 ¥35 可用 · 全品类通用',
    validPeriod: '长期有效 · 自动抵扣',
    claimed: true
  },
  {
    rank: 5,
    code: 'UR-FREEDEL',
    name: '餐车专送 0 元免费配送券',
    discountType: '免运费',
    discountStrength: 60,
    maxDeduct: '抵扣 ¥5 配送费',
    condition: '外卖专享 · 0元起送',
    validPeriod: '今日全天 (剩余 88 张)',
    claimed: false
  }
];

// 今日巡游路线日程
const CRUISE_STATIONS = [
  {
    stationName: '大悦城北座地面广场',
    timeSlot: '11:00 - 14:00',
    status: 'current',
    statusText: '当前停靠制作中',
    address: '静安区西藏北路166号大悦城北座中庭',
    distance: '0.8 km',
    isCurrent: true
  },
  {
    stationName: '世纪大都会下沉广场',
    timeSlot: '14:30 - 17:30',
    status: 'upcoming',
    statusText: '下一站预热中',
    address: '浦东新区世纪大道1500号',
    distance: '3.2 km',
    isCurrent: false
  },
  {
    stationName: '滨江星光夜市美食街',
    timeSlot: '18:00 - 22:30',
    status: 'upcoming',
    statusText: '晚市热门夜宵场',
    address: '徐汇区龙腾大道东安路口',
    distance: '5.8 km',
    isCurrent: false
  }
];

export const TruckPullUpMenu: React.FC<TruckPullUpMenuProps> = ({
  isOpen,
  onClose,
  truck,
  onOpenRadar,
  onOpenVIP,
  onChangeAddress,
  onScrollToMenu,
  onOpenCart,
  dishes = [],
  onSelectDish,
  onQuickAdd,
  deliveryAddress = '西藏北路 166 号大悦城商务座 1204 室',
  diningMode = 'delivery'
}) => {
  const [tickerIndex, setTickerIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'hotness' | 'dishes' | 'coupons' | 'cruise'>('hotness');
  const [claimedCoupons, setClaimedCoupons] = useState<Record<string, boolean>>({
    'UR-LUNCH15': true,
    'UR-VIP5': true
  });
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 每2秒上下滚动切换热门活动
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % HOT_PROMO_TICKER.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const currentPromo = HOT_PROMO_TICKER[tickerIndex];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const handleClaimCoupon = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setClaimedCoupons((prev) => ({ ...prev, [code]: true }));
    setCopyFeedback(code);
    showToast('优惠券领取成功，结算时自动抵扣！');
    setTimeout(() => {
      setCopyFeedback(null);
    }, 2000);
  };

  // 挑选推荐菜品
  const signatureDishes = dishes.length > 0 ? dishes.slice(0, 6) : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end pointer-events-auto pb-[60px] sm:pb-[68px] px-2 sm:px-3">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs cursor-pointer z-0"
          />

          {/* Pull-Up Sheet Container */}
          <motion.div
            id="truck-pull-up-menu-sheet"
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative z-10 w-full max-w-lg mx-auto bg-white rounded-2xl sm:rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.32)] border border-[#e2e3e1] flex flex-col max-h-[74vh] overflow-hidden"
          >
            {/* Toast Feedback */}
            {toastMsg && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{toastMsg}</span>
              </div>
            )}

            {/* 1. Pull Indicator Bar / Drag Handle */}
            <div className="pt-2 pb-1 flex flex-col items-center justify-center cursor-pointer select-none" onClick={onClose}>
              <div className="w-9 h-1 rounded-full bg-neutral-300 hover:bg-neutral-400 transition-colors" />
              <span className="text-[9px] text-neutral-400 font-medium mt-0.5">下拉或点击空白收起餐车菜单</span>
            </div>

            {/* 2. Top Header with Truck Status & GPS Telemetry */}
            <div className="px-3 sm:px-4 pt-0.5 pb-2 border-b border-neutral-100 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm sm:text-base font-black text-[#1a1c1b] tracking-tight truncate">
                    {truck.name}
                  </h2>
                  <span className="text-[10px] text-[#006d36] font-bold inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    {truck.statusText || '营业中'}
                  </span>
                </div>
                <p className="text-[10.5px] text-neutral-500 truncate mt-0.5">
                  {truck.currentLocationName || '静安区大悦城北座地面广场 · 炭烤现制'}
                </p>
              </div>

              {/* Right: GPS Distance, Radar Icon & Close */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenRadar) onOpenRadar();
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-xl transition-colors cursor-pointer"
                  title="查看实时雷达路线"
                >
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  <span>{truck.distanceKm} km</span>
                  <Compass className="w-2.5 h-2.5 text-emerald-600 ml-0.5" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer"
                  title="关闭餐车菜单"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3. 2-Second Rolling Hot Activity Ticker Bar */}
            <div 
              onClick={() => setActiveTab(currentPromo.targetTab || 'hotness')}
              className="px-3 sm:px-4 py-1.5 bg-gradient-to-r from-neutral-50 to-neutral-100/70 border-b border-neutral-100 cursor-pointer"
              title="点击查看此热门活动详情"
            >
              <div className="h-7 overflow-hidden relative rounded-xl bg-white border border-[#e5e5df] px-2.5 flex items-center justify-between shadow-2xs hover:border-black/30 transition-colors">
                <div className="flex-1 min-w-0 h-full flex items-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentPromo.id}
                      initial={{ y: 14, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -14, opacity: 0 }}
                      transition={{ duration: 0.28, ease: 'easeInOut' }}
                      className="flex items-center gap-1.5 w-full min-w-0"
                    >
                      <span className={`text-[9.5px] font-black px-1.5 py-0.2 rounded border shrink-0 ${currentPromo.tagBg}`}>
                        {currentPromo.tag}
                      </span>
                      <span className="text-[11.5px] font-bold text-[#1a1c1b] truncate">
                        {currentPromo.title}
                      </span>
                      <span className="hidden sm:inline text-[10.5px] text-neutral-400 truncate">
                        {currentPromo.subText}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-1 shrink-0 pl-1.5">
                  <span className="text-[9.5px] tabular-nums font-black text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-100">
                    {currentPromo.discount}
                  </span>
                  <ChevronRight className="w-3 h-3 text-neutral-400" />
                </div>
              </div>
            </div>

            {/* 4. Tab Navigation Header */}
            <div className="px-3 sm:px-4 pt-1.5 pb-1.5 bg-white border-b border-neutral-100">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth w-full py-0.5">
                {/* Tab 1: 热门活动排行 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('hotness')}
                  className={`py-1 px-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer select-none border ${
                    activeTab === 'hotness'
                      ? 'bg-rose-50/70 text-rose-600 border-2 border-rose-500 shadow-2xs'
                      : 'bg-white text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                  }`}
                >
                  <Flame className={`w-3 h-3 shrink-0 ${activeTab === 'hotness' ? 'text-rose-600' : 'text-rose-500'}`} />
                  <span>热门活动排行</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded-full font-bold leading-tight ${
                      activeTab === 'hotness' ? 'bg-rose-500 text-white' : 'bg-neutral-100 text-[#787770]'
                    }`}
                  >
                    4
                  </span>
                </button>

                {/* Tab 2: 招牌现烤菜单 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('dishes')}
                  className={`py-1 px-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer select-none border ${
                    activeTab === 'dishes'
                      ? 'bg-amber-50/70 text-amber-600 border-2 border-amber-500 shadow-2xs'
                      : 'bg-white text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                  }`}
                >
                  <ChefHat className={`w-3 h-3 shrink-0 ${activeTab === 'dishes' ? 'text-amber-600' : 'text-amber-600'}`} />
                  <span>招牌现烤菜单</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded-full font-bold leading-tight ${
                      activeTab === 'dishes' ? 'bg-amber-500 text-white' : 'bg-neutral-100 text-[#787770]'
                    }`}
                  >
                    {signatureDishes.length > 0 ? signatureDishes.length : '推荐'}
                  </span>
                </button>

                {/* Tab 3: 优惠券力度榜 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('coupons')}
                  className={`py-1 px-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer select-none border ${
                    activeTab === 'coupons'
                      ? 'bg-sky-50/70 text-sky-600 border-2 border-sky-500 shadow-2xs'
                      : 'bg-white text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                  }`}
                >
                  <Ticket className={`w-3 h-3 shrink-0 ${activeTab === 'coupons' ? 'text-sky-600' : 'text-sky-600'}`} />
                  <span>优惠券力度榜</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded-full font-bold leading-tight ${
                      activeTab === 'coupons' ? 'bg-sky-500 text-white' : 'bg-neutral-100 text-[#787770]'
                    }`}
                  >
                    5张
                  </span>
                </button>

                {/* Tab 4: 巡游与停靠 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('cruise')}
                  className={`py-1 px-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer select-none border ${
                    activeTab === 'cruise'
                      ? 'bg-emerald-50/70 text-emerald-600 border-2 border-emerald-500 shadow-2xs'
                      : 'bg-white text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                  }`}
                >
                  <Radio className={`w-3 h-3 shrink-0 ${activeTab === 'cruise' ? 'text-emerald-600' : 'text-emerald-600'}`} />
                  <span>巡游路线</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded-full font-bold leading-tight ${
                      activeTab === 'cruise' ? 'bg-emerald-500 text-white' : 'bg-neutral-100 text-[#787770]'
                    }`}
                  >
                    实时
                  </span>
                </button>
              </div>
            </div>

            {/* 5. Scrollable Tab Content Body */}
            <div className="p-3 sm:p-3.5 overflow-y-auto max-h-[46vh] space-y-2.5">
              {/* TAB 1: 热门活动排行榜 */}
              {activeTab === 'hotness' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-500 font-medium px-1">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                      全城食客实时抢购热度指数
                    </span>
                    <span className="text-[10px] text-neutral-400">实时更新</span>
                  </div>

                  {HOTNESS_RANKING.map((item) => (
                    <div
                      key={item.rank}
                      className="p-2.5 bg-neutral-50 hover:bg-neutral-100/80 rounded-xl border border-neutral-200/80 transition-colors flex items-center justify-between gap-2.5 group"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Rank Badge */}
                        <div
                          className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                            item.rank === 1
                              ? 'bg-amber-400 text-black shadow-xs'
                              : item.rank === 2
                              ? 'bg-neutral-300 text-black'
                              : item.rank === 3
                              ? 'bg-amber-700 text-white'
                              : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          {item.rank}
                        </div>

                        {/* Image Thumbnail */}
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover border border-neutral-200 shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <h4 className="text-xs font-bold text-[#1a1c1b] truncate group-hover:text-black">
                              {item.title}
                            </h4>
                            <span className="text-[8.5px] font-bold px-1 py-0.2 rounded bg-rose-100 text-rose-700 shrink-0">
                              {item.tag}
                            </span>
                          </div>
                          <p className="text-[9.5px] text-neutral-400 truncate mt-0.5">
                            {item.highlight} · {item.salesCount}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <div className="text-xs font-black text-rose-600 tabular-nums">
                          {item.price}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const matchedDish = dishes.find((d) => d.name === item.title || d.id === item.id);
                            if (matchedDish && onQuickAdd) {
                              onQuickAdd(matchedDish, e);
                              showToast(`已加购: ${matchedDish.name}`);
                            } else {
                              onClose();
                              if (onScrollToMenu) onScrollToMenu();
                            }
                          }}
                          className="px-2 py-0.5 bg-black hover:bg-neutral-800 text-white rounded-md text-[10px] font-bold flex items-center gap-0.5 cursor-pointer shadow-2xs transition-transform active:scale-95"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>加购</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: 招牌现烤菜单 */}
              {activeTab === 'dishes' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-500 font-medium px-1">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      流动餐车现场炭烤现制精选
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onScrollToMenu) onScrollToMenu();
                      }}
                      className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      查看全部菜单 →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {signatureDishes.map((dish) => (
                      <div
                        key={dish.id}
                        onClick={() => {
                          if (onSelectDish) onSelectDish(dish);
                        }}
                        className="p-2 bg-neutral-50 hover:bg-neutral-100/90 rounded-xl border border-neutral-200/80 transition-all flex items-center justify-between gap-2 group cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <img
                            src={dish.imageUrl}
                            alt={dish.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-lg object-cover border border-neutral-200 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-[#1a1c1b] truncate group-hover:text-black">
                              {dish.name}
                            </h4>
                            <p className="text-[9.5px] text-neutral-400 truncate mt-0.5">
                              {dish.badgeText || dish.typeTag} · {dish.prepTime}
                            </p>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-xs font-black text-rose-600 tabular-nums">
                                ¥{dish.price.toFixed(1)}
                              </span>
                              {dish.originalPrice && (
                                <span className="text-[9px] text-neutral-400 line-through tabular-nums">
                                  ¥{dish.originalPrice.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onQuickAdd) {
                              onQuickAdd(dish, e);
                              showToast(`已加购: ${dish.name}`);
                            }
                          }}
                          className="w-6 h-6 rounded-lg bg-black hover:bg-neutral-800 text-white flex items-center justify-center cursor-pointer shadow-2xs shrink-0 transition-transform active:scale-90"
                          title="加入购物车"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: 优惠券折扣力度排行榜 */}
              {activeTab === 'coupons' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-500 font-medium px-1">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-amber-500" />
                      当前可领满减与折扣券
                    </span>
                    <span className="text-[10px] text-neutral-400">点单自动核销抵扣</span>
                  </div>

                  {COUPON_DISCOUNT_RANKING.map((coupon) => {
                    const isClaimed = claimedCoupons[coupon.code];
                    return (
                      <div
                        key={coupon.code}
                        className="p-2.5 bg-gradient-to-r from-amber-50/40 via-white to-amber-50/20 rounded-xl border border-amber-200/70 flex items-center justify-between gap-2.5 shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10.5px] font-black text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-200 tabular-nums">
                              {coupon.discountType}
                            </span>
                            <h4 className="text-xs font-bold text-[#1a1c1b] truncate">
                              {coupon.name}
                            </h4>
                          </div>
                          <p className="text-[9.5px] text-neutral-500 mt-0.5">
                            {coupon.condition} · {coupon.validPeriod}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleClaimCoupon(coupon.code, e)}
                          disabled={isClaimed}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                            isClaimed
                              ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-default'
                              : 'bg-amber-500 hover:bg-amber-600 text-black shadow-xs active:scale-95'
                          }`}
                        >
                          {isClaimed ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>已领</span>
                            </>
                          ) : (
                            <span>领券</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 4: 巡游与停靠 */}
              {activeTab === 'cruise' && (
                <div className="space-y-2.5">
                  {/* Current Station Badge */}
                  <div className="p-3 bg-neutral-900 text-white rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        当前停靠站点
                      </span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        驻点制作中
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold">
                      {deliveryAddress}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800">
                      <span>预计停留至 14:00</span>
                      <span>直线距离约 {truck.distanceKm} km</span>
                    </div>
                  </div>

                  {/* Station Timeline */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-neutral-600 px-1">
                      今日巡游路线安排
                    </div>
                    {CRUISE_STATIONS.map((st, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                          st.isCurrent
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">{st.stationName}</span>
                            <span className={`text-[9px] px-1 py-0.2 rounded font-medium ${
                              st.isCurrent ? 'bg-emerald-200 text-emerald-900' : 'bg-neutral-200 text-neutral-600'
                            }`}>
                              {st.timeSlot}
                            </span>
                          </div>
                          <p className="text-[9.5px] text-neutral-500 truncate mt-0.5">
                            {st.address}
                          </p>
                        </div>

                        <span className="text-[10px] tabular-nums text-neutral-400 shrink-0">
                          {st.distance}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Telemetry Data Grid */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs pt-1">
                    <div className="p-1.5 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="text-neutral-400 text-[9.5px]">炭火工作站</div>
                      <div className="font-bold text-neutral-800 text-[11px] mt-0.5">380°C 恒温</div>
                    </div>
                    <div className="p-1.5 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="text-neutral-400 text-[9.5px]">当前出餐</div>
                      <div className="font-bold text-emerald-700 text-[11px] mt-0.5">平均 6 分钟</div>
                    </div>
                    <div className="p-1.5 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="text-neutral-400 text-[9.5px]">今日出餐量</div>
                      <div className="font-bold text-neutral-800 text-[11px] mt-0.5">148 份</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Bottom Sticky Quick Action Footer */}
            <div className="p-2.5 bg-neutral-50 border-t border-neutral-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenRadar) onOpenRadar();
                }}
                className="flex-1 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>进入餐车雷达全景 ({truck.distanceKm} km)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenCart) onOpenCart();
                  else if (onScrollToMenu) onScrollToMenu();
                }}
                className="py-2 px-3 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-neutral-600" />
                <span>购物车</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2 px-3 bg-neutral-200/80 hover:bg-neutral-300 text-neutral-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                收起
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
