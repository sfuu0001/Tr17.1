import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Compass,
  Flame,
  Sparkles,
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
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TruckInfo } from '../types';
import { DiningMode } from './DiningModeSelector';
import { TruckLocationConfig, getAllTruckConfigs, calculateGeodesicDistanceKm, resolveAddressCoordinates } from '../utils/truckLocationEngine';
import { BusinessStatusConfig, getTruckBusinessStatus, getAllTruckBusinessStatuses } from '../utils/businessStatusEngine';

interface TruckBannerProps {
  truck: TruckInfo;
  orderCount?: number;
  deliveryAddress?: string;
  diningMode?: DiningMode;
  onOpenOrders?: () => void;
  onOpenRadar?: () => void;
  onOpenVIP?: () => void;
  onChangeAddress?: () => void;
  onScrollToMenu?: () => void;
  allTrucks?: TruckLocationConfig[];
  onSelectTruck?: (truckId: string) => void;
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
    discount: '8.0折'
  },
  {
    id: 'p2',
    tag: '大额满减',
    tagBg: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Zap,
    title: '全场满¥35立减¥5，新客首单免配送费',
    subText: '全品类通用 · 自动抵扣',
    discount: '立减¥5'
  },
  {
    id: 'p3',
    tag: '买一赠一',
    tagBg: 'bg-purple-50 text-purple-600 border-purple-200',
    icon: Gift,
    title: '暗夜冷萃生椰拿铁 领券买一送一',
    subText: '限量200杯 · 现萃特调',
    discount: '买1赠1'
  },
  {
    id: 'p4',
    tag: '爆款尝鲜',
    tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Sparkles,
    title: '果木烟熏脆皮烤五花肉 现点现切',
    subText: '热度TOP1 · 主厨特制酱',
    discount: '立省¥8'
  },
  {
    id: 'p5',
    tag: '双人狂欢',
    tagBg: 'bg-blue-50 text-blue-600 border-blue-200',
    icon: Tag,
    title: '周末炭烤双人野餐套餐 享75折',
    subText: '赠特调饮品2杯 · 送野餐垫',
    discount: '7.5折'
  }
];

// 最新活动热度排行榜
const HOTNESS_RANKING = [
  {
    rank: 1,
    title: '碳烤和牛小汉堡双重奏',
    category: '主食招牌',
    hotnessScore: '99.8w',
    trend: '+42% 飙升',
    price: '¥63.0',
    originalPrice: '¥68.0',
    tag: '炭火现烤',
    highlight: '黑松露蛋黄酱 + A5和牛饼',
    salesCount: '日销 380+ 份'
  },
  {
    rank: 2,
    title: '煮松露墨汁土豆玉棋',
    category: '黑珍珠融合',
    hotnessScore: '96.4w',
    trend: '+35% 增长',
    price: '¥88.0',
    originalPrice: null,
    tag: '现熬浓汁',
    highlight: '黑冬松露 + 墨鱼汁甘薯玉棋',
    salesCount: '日销 210+ 份'
  },
  {
    rank: 3,
    title: '果木烟熏脆皮烤五花肉',
    category: '炭烤特惠',
    hotnessScore: '93.1w',
    trend: '+28% 热门',
    price: '¥55.0',
    originalPrice: '¥58.0',
    tag: '外卖立减¥5',
    highlight: '苹果木低温慢熏12小时',
    salesCount: '日销 290+ 份'
  },
  {
    rank: 4,
    title: '暗夜冷萃生椰咖啡',
    category: '特调冷萃',
    hotnessScore: '88.5w',
    trend: '+19% 稳定',
    price: '¥28.0',
    originalPrice: '¥32.0',
    tag: '买一赠一券',
    highlight: '耶加雪菲冷萃 + 纯天然生椰乳',
    salesCount: '日销 450+ 杯'
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

export const TruckBanner: React.FC<TruckBannerProps> = ({
  truck,
  deliveryAddress,
  onOpenRadar,
  onScrollToMenu,
  allTrucks,
  onSelectTruck
}) => {
  const [tickerIndex, setTickerIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruckPickerOpen, setIsTruckPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'hotness' | 'coupons'>('hotness');
  const [claimedCoupons, setClaimedCoupons] = useState<Record<string, boolean>>({
    'UR-LUNCH15': true,
    'UR-VIP5': true
  });
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Real multi-truck business statuses
  const [allStatuses, setAllStatuses] = useState<Record<string, BusinessStatusConfig>>(() =>
    getAllTruckBusinessStatuses()
  );

  useEffect(() => {
    const handleStatusChange = (e: Event) => {
      const custom = e as CustomEvent<{
        truckId?: string;
        status?: BusinessStatusConfig;
        allStatuses?: Record<string, BusinessStatusConfig>;
      }>;
      if (custom.detail?.allStatuses) {
        setAllStatuses(custom.detail.allStatuses);
      } else {
        setAllStatuses(getAllTruckBusinessStatuses());
      }
    };
    window.addEventListener('obsidian_business_status_changed', handleStatusChange);
    return () => window.removeEventListener('obsidian_business_status_changed', handleStatusChange);
  }, []);

  const currentTruckStatus = allStatuses[truck.id || 'truck-01'] || getTruckBusinessStatus(truck.id || 'truck-01');

  const truckList = allTrucks && allTrucks.length > 0 ? allTrucks : getAllTruckConfigs();

  // 每2秒上下滚动切换热门活动
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % HOT_PROMO_TICKER.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const currentPromo = HOT_PROMO_TICKER[tickerIndex];

  const handleClaimCoupon = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setClaimedCoupons((prev) => ({ ...prev, [code]: true }));
    setCopyFeedback(code);
    setTimeout(() => {
      setCopyFeedback(null);
    }, 2000);
  };

  const userCoord = deliveryAddress ? resolveAddressCoordinates(deliveryAddress) : { latitude: 31.2435, longitude: 121.4690 };

  return (
    <section
      id="truck-banner-beacon-container"
      className="bg-white rounded-none mb-2.5 shadow-xs border border-[#D3D1CB] transition-all overflow-hidden relative"
    >
      {/* 1. Top Compact Header & 2-Second Rolling Hot Activity Ticker */}
      <div className="pt-2 pb-2 px-3 sm:px-4">
        {/* Main Status & Distance Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Truck Icon, Name & Status Badge */}
          <div className="flex items-center gap-2 flex-1 min-w-0 select-none">
            <div
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-[#006d36] shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              <Truck className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap sm:flex-nowrap">
              <h2
                onClick={() => setIsTruckPickerOpen((prev) => !prev)}
                className="text-xs sm:text-sm font-black text-[#1a1c1b] hover:text-emerald-800 tracking-tight transition-colors truncate cursor-pointer flex items-center gap-1 max-w-[140px] xs:max-w-[180px] sm:max-w-none"
                title="点击切换当前选购餐车"
              >
                <span className="truncate">{truck.name}</span>
                <span className="text-[10px] text-neutral-500 font-normal bg-neutral-100 px-1 py-0.2 rounded hover:bg-neutral-200 shrink-0">
                  [换车]
                </span>
              </h2>
              <div className="flex items-center gap-1">
                <span
                  className={`text-[10px] font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full border shrink-0 ${
                    currentTruckStatus.isOpen
                      ? 'text-[#006d36] bg-emerald-50 border-emerald-200'
                      : 'text-rose-700 bg-rose-50 border-rose-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentTruckStatus.isOpen ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'
                    }`}
                  />
                  {currentTruckStatus.isOpen ? '营业中' : '已打烊'}
                </span>

                {/* 3 Channels Pill Indicators */}
                {currentTruckStatus.isOpen && (
                  <div className="hidden xs:flex items-center gap-0.5 text-[9px] font-bold">
                    <span
                      className={`px-1 py-0.2 rounded-[2px] ${
                        currentTruckStatus.dineInOpen !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-neutral-100 text-neutral-400 line-through'
                      }`}
                      title={currentTruckStatus.dineInOpen !== false ? '堂食正常' : '堂食暂停'}
                    >
                      堂
                    </span>
                    <span
                      className={`px-1 py-0.2 rounded-[2px] ${
                        currentTruckStatus.deliveryOpen !== false
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-neutral-100 text-neutral-400 line-through'
                      }`}
                      title={currentTruckStatus.deliveryOpen !== false ? '外卖正常' : '外卖暂停'}
                    >
                      外
                    </span>
                    <span
                      className={`px-1 py-0.2 rounded-[2px] ${
                        currentTruckStatus.pickupOpen !== false
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-neutral-100 text-neutral-400 line-through'
                      }`}
                      title={currentTruckStatus.pickupOpen !== false ? '自提正常' : '自提暂停'}
                    >
                      提
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Distance & Expand Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenRadar}
              className="flex items-center gap-1 text-[#474741] text-xs hover:text-black transition-colors px-2 py-1 rounded-lg hover:bg-neutral-100 cursor-pointer shrink-0"
              title="查看餐车雷达距离与停靠路线"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="font-extrabold text-black">{truck.distanceKm} km</span>
              <Compass className="w-3 h-3 text-[#787770] ml-0.5 shrink-0" />
            </button>

            {/* Expand / Collapse Button */}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-black transition-all cursor-pointer shadow-2xs flex items-center justify-center"
              title={isExpanded ? '收起榜单' : '展开热门活动与优惠券排行'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Multi-Truck Picker Popover Bar */}
        {isTruckPickerOpen && (
          <div className="mt-2 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700">
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                <span>选择附近服务餐车（按距离排序）</span>
              </span>
              <button
                onClick={() => setIsTruckPickerOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer text-xs"
              >
                关闭
              </button>
            </div>
            <div className="divide-y divide-neutral-200 border border-neutral-200 rounded bg-white overflow-hidden">
              {truckList.map((t) => {
                const dist = calculateGeodesicDistanceKm(userCoord.latitude, userCoord.longitude, t.latitude, t.longitude);
                const isCurrent = t.name === truck.name || (truck.code && t.code === truck.code);
                const inRange = dist <= t.deliveryRadiusKm;
                const tStatus = allStatuses[t.id] || getTruckBusinessStatus(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (onSelectTruck) {
                        onSelectTruck(t.id);
                      }
                      setIsTruckPickerOpen(false);
                    }}
                    className={`p-2 sm:px-3 text-left cursor-pointer transition-colors flex items-center justify-between gap-2.5 ${
                      isCurrent
                        ? 'bg-emerald-50/50 border-l-4 border-l-emerald-600 font-bold'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-bold text-neutral-900 truncate">{t.name}</span>
                        {isCurrent && (
                          <span className="text-[9px] bg-emerald-700 text-white px-1.5 py-0.2 rounded font-semibold">
                            当前服务
                          </span>
                        )}
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            tStatus.isOpen
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {tStatus.isOpen ? '营业中' : '打烊'}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-neutral-500 truncate mt-0.5">
                        {t.locationName} · 起送 ¥{t.minDeliveryAmount} · 半径 {t.deliveryRadiusKm}km
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div className="text-xs font-bold text-neutral-900">
                          {dist.toFixed(1)} km
                        </div>
                        <span className={`text-[9px] px-1 py-0.2 rounded font-semibold block mt-0.5 ${
                          inRange ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                        }`}>
                          {inRange ? '可极速达' : '超出范围'}
                        </span>
                      </div>
                      {!isCurrent && (
                        <button
                          type="button"
                          className="text-[10px] px-2 py-1 rounded bg-neutral-900 text-white font-semibold hover:bg-black transition-colors"
                        >
                          切换
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Closed Announcement Banner if master switch is turned OFF for active truck */}
        {!currentTruckStatus.isOpen && (
          <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold truncate">
                该餐车已打烊：{currentTruckStatus.closeReason || '暂停接单中'}
              </span>
            </div>
            <span className="text-[10px] tabular-nums text-rose-600 shrink-0 bg-white px-1.5 py-0.5 rounded border border-rose-200">
              预计恢复: {currentTruckStatus.reopenTime}
            </span>
          </div>
        )}

        {/* 2-Second Up/Down Rolling Hot Activity Ticker Bar */}
        <div
          onClick={() => setIsExpanded((prev) => !prev)}
          className="mt-1.5 h-7.5 overflow-hidden relative rounded-none bg-[#10243E] border border-[#10243E] px-2.5 flex items-center justify-between cursor-pointer transition-all group shadow-2xs"
          title="点击查看完整活动排行与折扣力度"
        >
          <div className="flex-1 min-w-0 h-full flex items-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPromo.id}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.28, ease: 'easeInOut' }}
                className="flex items-center gap-2 w-full min-w-0"
              >
                {/* Tag */}
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[10px] font-black border shadow-2xs shrink-0 bg-[#0092D6] text-white border-[#0092D6]`}
                >
                  {React.createElement(currentPromo.icon, {
                    className: 'w-2.5 h-2.5 shrink-0 animate-pulse'
                  })}
                  <span>{currentPromo.tag}</span>
                </span>

                {/* Title */}
                <span className="text-xs text-white font-bold truncate min-w-0 flex-1">
                  {currentPromo.title}
                </span>

                {/* Discount Badge Bubble */}
                <span className="text-[10px] text-amber-300 tabular-nums font-bold shrink-0 bg-transparent px-2 py-0.5 rounded-none border border-amber-400/60 shadow-2xs flex items-center gap-0.5">
                  <span>{currentPromo.discount}</span>
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Prompt to Click & Expand */}
          <div className="flex items-center gap-1 text-[10px] text-gray-300 group-hover:text-white shrink-0 ml-2 font-semibold">
            <span className="hidden sm:inline">排行详情</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isExpanded ? 'rotate-180 text-white' : 'text-gray-400 group-hover:text-white'
              }`}
            />
          </div>
        </div>
      </div>

      {/* 2. Expanded Dynamic Ranking Panel (Height increases downwards smoothly) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="border-t border-[#e8e8e4] bg-[#fafaf8] overflow-hidden"
          >
            <div className="p-3 sm:p-4 space-y-3">
              {/* Tabs Switcher: 最新活动热度排行 VS 优惠券折扣力度排名 */}
              <div className="flex items-center justify-between gap-2 border-b border-[#e5e5e0] pb-2">
                <div className="flex items-center gap-1 bg-white p-1 rounded-none border border-[#D3D1CB] shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('hotness')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer select-none ${
                      activeTab === 'hotness'
                        ? 'bg-black text-white shadow-xs'
                        : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>最新活动热度排行</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('coupons')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer select-none ${
                      activeTab === 'coupons'
                        ? 'bg-black text-white shadow-xs'
                        : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5 text-rose-400" />
                    <span>优惠券折扣力度排名</span>
                  </button>
                </div>

                <span className="text-[10px] text-[#787770] tabular-nums shrink-0 hidden sm:inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-neutral-400" />
                  实时榜单每5分钟刷新
                </span>
              </div>

              {/* Tab Content 1: 最新活动与爆款热度榜 */}
              {activeTab === 'hotness' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {HOTNESS_RANKING.map((item) => (
                      <div
                        key={item.rank}
                        className="bg-white rounded-xl p-2.5 border border-[#e5e5e0] hover:border-black/30 transition-all shadow-2xs flex items-start gap-2.5 group"
                      >
                        {/* Rank Badge */}
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            item.rank === 1
                              ? 'bg-amber-400 text-black shadow-xs ring-2 ring-amber-200'
                              : item.rank === 2
                              ? 'bg-neutral-300 text-black shadow-xs ring-1 ring-neutral-200'
                              : item.rank === 3
                              ? 'bg-amber-700 text-white shadow-xs'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {item.rank}
                        </div>

                        {/* Info Body */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-black text-[#1a1c1b] truncate group-hover:text-black">
                              {item.title}
                            </h4>
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded shrink-0">
                              {item.trend}
                            </span>
                          </div>

                          <p className="text-[10px] text-[#787770] truncate mt-0.5">
                            {item.highlight}
                          </p>

                          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-[#f0f0ec]">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs font-black text-black tabular-nums">
                                {item.price}
                              </span>
                              {item.originalPrice && (
                                <span className="text-[10px] text-[#999] line-through tabular-nums">
                                  {item.originalPrice}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-[#787770] tabular-nums flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5 text-rose-500" />
                                {item.hotnessScore}
                              </span>
                              <button
                                type="button"
                                onClick={onScrollToMenu}
                                className="px-2 py-0.5 rounded-md bg-black text-white text-[10px] font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
                              >
                                去点单
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab Content 2: 优惠券折扣力度排名榜 */}
              {activeTab === 'coupons' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    {COUPON_DISCOUNT_RANKING.map((cp) => {
                      const isClaimed = claimedCoupons[cp.code] || cp.claimed;
                      const isJustCopied = copyFeedback === cp.code;

                      return (
                        <div
                          key={cp.rank}
                          className="bg-white rounded-xl p-2.5 border border-[#e5e5e0] hover:border-black/30 transition-all shadow-2xs flex items-center justify-between gap-3"
                        >
                          {/* Rank + Value */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                cp.rank === 1
                                  ? 'bg-rose-500 text-white shadow-xs ring-2 ring-rose-200'
                                  : cp.rank === 2
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : cp.rank === 3
                                  ? 'bg-purple-500 text-white shadow-xs'
                                  : 'bg-neutral-100 text-neutral-700'
                              }`}
                            >
                              {cp.rank}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-rose-600 tabular-nums">
                                  {cp.discountType}
                                </span>
                                <h4 className="text-xs font-black text-[#1a1c1b] truncate">
                                  {cp.name}
                                </h4>
                              </div>

                              <div className="flex items-center gap-2 text-[10px] text-[#787770] mt-0.5 flex-wrap">
                                <span className="text-[#006d36] font-bold">{cp.condition}</span>
                                <span>·</span>
                                <span>{cp.maxDeduct}</span>
                                <span>·</span>
                                <span className="tabular-nums text-[#8c8b84]">{cp.validPeriod}</span>
                              </div>
                            </div>
                          </div>

                          {/* Discount Strength Bar & Action Button */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right hidden xs:block">
                              <div className="text-[10px] font-bold text-neutral-500">
                                折扣力度
                              </div>
                              <div className="w-14 h-1.5 bg-neutral-100 rounded-full overflow-hidden mt-0.5 border border-neutral-200">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                                  style={{ width: `${cp.discountStrength}%` }}
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleClaimCoupon(cp.code, e)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                                isJustCopied
                                  ? 'bg-emerald-600 text-white'
                                  : isClaimed
                                  ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                  : 'bg-black text-white hover:bg-neutral-800 active:scale-95'
                              }`}
                            >
                              {isJustCopied ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>已领/已用</span>
                                </>
                              ) : isClaimed ? (
                                <span>已领取</span>
                              ) : (
                                <span>领券</span>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Quick Jump Action */}
              <div className="flex items-center justify-between pt-2 border-t border-[#e5e5e0] text-xs">
                <span className="text-[11px] text-[#787770]">
                  🔥 专属优惠抵扣在选购清单中自动生效
                </span>
                <button
                  type="button"
                  onClick={onScrollToMenu}
                  className="font-bold text-black hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>立即去选购点餐</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

