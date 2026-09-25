import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Check,
  Users,
  Star,
  X,
  Search,
  MessageSquare,
  QrCode,
  Navigation,
  MapPin,
  Truck,
  Flame,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  LayoutList,
  SlidersHorizontal,
  ArrowUpDown,
  MoreHorizontal,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Ticket,
  Radio,
  FileText,
  PhoneCall,
  Bell,
  Activity,
  Battery,
  Thermometer,
  Zap,
  Plus,
  Gift
} from 'lucide-react';
import { Order, DishItem } from '../../types';
import { OrganicCardReveal } from '../../utils/useCardScrollReveal';
import { AddressSelectorModal } from '../AddressSelectorModal';
import { copyTextToClipboard } from '../../utils/clipboard';
import { CouponItem, UserCouponRecord } from '../../types/coupon';
import { INITIAL_MERCHANT_COUPONS, INITIAL_USER_COUPONS } from '../../data/mockCoupons';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';

// Image assets
import skewersImg from '../../assets/images/lowkey_skewers_1788031604251.jpg';
import coldbrewImg from '../../assets/images/lowkey_coldbrew_1788031656934.jpg';
import sodaImg from '../../assets/images/lowkey_soda_1788032037702.jpg';
import burgerImg from '../../assets/images/lowkey_burger_1788031618331.jpg';

// Engine & configs
import {
  getAllTruckConfigs,
  getActiveTruckConfig,
  setActiveTruckId,
  getUserLocationState,
  saveUserLocationState,
  requestBrowserGeolocation,
  calculateGeodesicDistanceKm,
  getTruckTheme,
  TruckLocationConfig,
  UserLocationState,
  TRUCK_LOCATION_EVENT,
  USER_LOCATION_EVENT,
  PRESET_DELIVERY_ADDRESSES
} from '../../utils/truckLocationEngine';
import {
  joinTruckCommunityGroup,
  isTruckCommunityMember
} from '../../utils/truckGroupChatEngine';

export interface DynamicFeedsPageViewProps {
  orders?: Order[];
  dishes?: DishItem[];
  viewerRole?: string;
  onBackToMenu?: () => void;
  onTrackOrder?: (orderId: string) => void;
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onRejectOrder?: (orderId: string, reason: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  showToast?: (title: string, desc?: string) => void;
  embedded?: boolean;
  onOpenGroupChat?: (channelType: 'truck_community' | 'fleet_dispatch', truckId?: string) => void;
}

export type FeedType = 'coupon' | 'community' | 'delivery' | 'expired' | 'all';
export type SortOption = 'distance' | 'min_order' | 'prep_time' | 'welfare';
export type DetailTabType = 'station' | 'welfare' | 'announcement' | 'telemetry';

export interface TruckFeedItem {
  id: string;
  truckId: string;
  truck: TruckLocationConfig;
  distanceKm: number;
  isEstimatedDistance: boolean;
  isActiveTruck: boolean;
  brandName: string;
  branchTag: string;
  branchTagType: 'location' | 'open' | 'secret' | 'coffee' | 'custom';
  avatarUrl: string;
  cornerBadge?: {
    type: 'dot' | 'voucher' | '24h' | 'custom';
    color?: string;
    text?: string;
    title?: string;
  };
  date: string;
  prepMinutes: number;
  typeTag: string;
  typeTagClass: string;
  category: 'coupon' | 'community' | 'delivery' | 'expired';
  summary: string;
  detailedAnnouncement?: string;
  isStrikethrough?: boolean;
  actionRowType: 'community_count' | 'voucher_card' | 'delivery_review' | 'night_delivery';
  actionData?: {
    orderNo?: string;
    countText?: string;
    actionBtnText?: string;
    voucherAmount?: string;
    voucherTitle?: string;
    voucherExpiry?: string;
    statusText?: string;
    footerText?: string;
  };
  unread: boolean;
}

export const DynamicFeedsPageView: React.FC<DynamicFeedsPageViewProps> = ({
  onBackToMenu,
  onTrackOrder,
  showToast = () => {},
  embedded = false,
  onOpenGroupChat
}) => {
  // 真实附近餐车列表、选定餐车与当前用户位置状态
  const [trucks, setTrucks] = useState<TruckLocationConfig[]>(() => getAllTruckConfigs());
  const [activeTruck, setActiveTruck] = useState<TruckLocationConfig>(() => getActiveTruckConfig());
  const [userLocation, setUserLocation] = useState<UserLocationState>(() => getUserLocationState());

  // 交互筛选、排序与状态
  const [activeCategory, setActiveCategory] = useState<FeedType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [readItemIds, setReadItemIds] = useState<Set<string>>(new Set());

  // 视觉布局控制：单卡折叠、卡片内部表单切换、全局紧凑模式 (默认平铺表单)
  const [isCompactMode, setIsCompactMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('urban_radar_feeds_view_mode');
      if (saved) return saved === 'compact';
    } catch {}
    return false; // 默认平铺表单视图
  });
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());
  const [cardDetailTab, setCardDetailTab] = useState<Record<string, DetailTabType>>({});
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [isBenchmarkMenuOpen, setIsBenchmarkMenuOpen] = useState<boolean>(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState<boolean>(false);

  // 切换紧凑/平铺模式并持久化
  const handleToggleViewMode = (compact: boolean) => {
    setIsCompactMode(compact);
    try {
      localStorage.setItem('urban_radar_feeds_view_mode', compact ? 'compact' : 'card');
    } catch {}
  };

  // 定位基准交互
  const [isLocating, setIsLocating] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // 弹窗状态与当前选中餐车
  const [selectedTruckForModal, setSelectedTruckForModal] = useState<TruckLocationConfig | null>(null);
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['包装私密严实', '配送极速', '保温完好']);

  // 专属福利与优惠券实时状态
  const [merchantCoupons, setMerchantCoupons] = useState<CouponItem[]>(() =>
    safeGetStorage<CouponItem[]>('obsidian_merchant_coupons', INITIAL_MERCHANT_COUPONS)
  );
  const [userCoupons, setUserCoupons] = useState<UserCouponRecord[]>(() =>
    safeGetStorage<UserCouponRecord[]>('obsidian_user_coupons', INITIAL_USER_COUPONS)
  );

  // 食客端极速领券并前往点单抵扣
  const handleClaimCoupon = (coupon: CouponItem, truck: TruckLocationConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    const existing = userCoupons.find((uc) => uc.couponId === coupon.id || uc.code === coupon.code);
    if (existing) {
      showToastNotification(`您已拥有「${coupon.title}」，正为您前往点单！`);
      handleOrderFromTruck(truck, e);
      return;
    }
    const newRecord: UserCouponRecord = {
      id: `usr-cpn-${Date.now()}`,
      userId: 'u_obsidian_guest_01',
      couponId: coupon.id,
      code: coupon.code,
      title: coupon.title,
      subtitle: coupon.subtitle,
      couponType: coupon.couponType,
      discountValue: coupon.discountValue,
      minSpend: coupon.minSpend,
      applicableTruckIds: coupon.applicableTruckIds,
      applicableTruckNames: coupon.applicableTruckNames,
      antiBrushEnabled: coupon.antiBrushEnabled,
      maxUniversalBurnLimit: coupon.maxUniversalBurnLimit,
      scopeType: coupon.scopeType,
      badgeText: coupon.badgeText,
      themeColor: coupon.themeColor,
      status: 'available',
      receivedAt: new Date().toISOString(),
      expireAt: coupon.expireDate ? `${coupon.expireDate} 23:59:59` : '2026-12-31 23:59:59'
    };
    const nextUserCoupons = [newRecord, ...userCoupons];
    setUserCoupons(nextUserCoupons);
    safeSetStorage('obsidian_user_coupons', nextUserCoupons);
    showToastNotification(`🎉 已成功领取「${coupon.title}」专属优惠券！`);
  };

  // 全局点击遮罩关闭所有弹出式菜单 (测距基准、智能排序、更多动作)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-action-menu-container]')) {
        setActiveActionMenuId(null);
      }
      if (!target.closest('[data-benchmark-menu-container]')) {
        setIsBenchmarkMenuOpen(false);
      }
      if (!target.closest('[data-sort-menu-container]')) {
        setIsSortMenuOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // 监听全局餐车位置变更、用户位置变化广播与优惠券持久化存储变更
  useEffect(() => {
    const handleSync = () => {
      setTrucks(getAllTruckConfigs());
      setActiveTruck(getActiveTruckConfig());
      setUserLocation(getUserLocationState());
      setMerchantCoupons(safeGetStorage<CouponItem[]>('obsidian_merchant_coupons', INITIAL_MERCHANT_COUPONS));
      setUserCoupons(safeGetStorage<UserCouponRecord[]>('obsidian_user_coupons', INITIAL_USER_COUPONS));
    };

    window.addEventListener(TRUCK_LOCATION_EVENT, handleSync);
    window.addEventListener(USER_LOCATION_EVENT, handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener(TRUCK_LOCATION_EVENT, handleSync);
      window.removeEventListener(USER_LOCATION_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // 核心：基于附近餐车与用户当前定位智能生成动态条目并校准测距
  const dynamicTruckItems = useMemo<TruckFeedItem[]>(() => {
    const DEFAULT_BENCHMARK_LAT = 31.2435;
    const DEFAULT_BENCHMARK_LNG = 121.4690;

    const isLocationUnset =
      !userLocation.latitude ||
      userLocation.latitude === 0 ||
      userLocation.isFallback;

    return trucks.map((truck, idx) => {
      const rawDistance = isLocationUnset
        ? calculateGeodesicDistanceKm(DEFAULT_BENCHMARK_LAT, DEFAULT_BENCHMARK_LNG, truck.latitude, truck.longitude)
        : calculateGeodesicDistanceKm(userLocation.latitude, userLocation.longitude, truck.latitude, truck.longitude);

      const isEstimated = isLocationUnset || rawDistance > 3000;
      const distanceKm = isEstimated
        ? calculateGeodesicDistanceKm(DEFAULT_BENCHMARK_LAT, DEFAULT_BENCHMARK_LNG, truck.latitude, truck.longitude)
        : rawDistance;
      const isActiveTruck = truck.id === activeTruck.id;

      let avatarUrl = skewersImg;
      let category: 'coupon' | 'community' | 'delivery' | 'expired' = 'community';
      let branchTagType: 'location' | 'open' | 'secret' | 'coffee' | 'custom' = 'location';
      let typeTag = '社群互动';
      let typeTagClass = 'bg-amber-50 text-amber-800 border-amber-200/80 font-semibold';
      let summary = `${truck.locationName} 站台主厨已建立老饕粉丝群，每日限量抢炭火和牛鲜包与独家黑椒串。`;
      let detailedAnnouncement = `【站台主厨通告】${truck.name}老饕群已建立，入群可享每日 11:30 独家和牛鲜包抢购资格、驻点到店立减等专属福利。欢迎各位食客加入！`;
      let actionRowType: 'community_count' | 'voucher_card' | 'delivery_review' | 'night_delivery' = 'community_count';
      const isMember = isTruckCommunityMember(truck.id);
      let actionData: TruckFeedItem['actionData'] = {
        countText: isMember ? '已入群 · 站台主厨王师傅在线' : '群成员已超 480 人 · 每日老饕福利',
        actionBtnText: isMember ? '进入老饕群 →' : '加入老饕群 →'
      };
      let cornerBadge: TruckFeedItem['cornerBadge'] = {
        type: 'dot',
        color: 'bg-emerald-500',
        title: '营业中'
      };
      let date = '约 6-8 分';
      let prepMinutes = 7;

      if (truck.id === 'truck-02' || idx === 1) {
        avatarUrl = coldbrewImg;
        category = 'coupon';
        branchTagType = 'open';
        typeTag = '满50减10';
        typeTagClass = 'bg-rose-50 text-rose-700 border-rose-200/80 font-semibold';
        summary = `北座办公区特邀专享：满 50 减 10 限定冷萃咖啡与热狗立减券已发放，午市直达！`;
        detailedAnnouncement = `【午市福利】凭此券在 ${truck.name} 点单满 50 元立减 10 元，适用于精选冷萃咖啡、黑椒烤肠等热门热食，领券后点单自动抵扣。`;
        actionRowType = 'voucher_card';
        actionData = {
          voucherAmount: '¥10',
          voucherTitle: `${truck.name.slice(0, 5)}专享冷萃立减券`,
          voucherExpiry: '有效期至本周日 24:00',
          actionBtnText: '去使用'
        };
        cornerBadge = { type: 'voucher', text: 'VOUCHER' };
        date = '排队仅 1 份';
        prepMinutes = 8;
      } else if (truck.id === 'truck-03' || idx === 2) {
        avatarUrl = sodaImg;
        category = 'community';
        branchTagType = 'custom';
        typeTag = '车友社群';
        typeTagClass = 'bg-cyan-50 text-cyan-800 border-cyan-200/80 font-semibold';
        summary = `苏河湾水岸夜市车友集结中，凭任意餐车订单可至西里广场服务台核销特饮一杯。`;
        detailedAnnouncement = `【水岸夜市集结令】苏河湾滨水车友俱乐部火热开启，点单满 ¥38 并加入车友社群，即可获赠夜市定制气泡特饮一杯。`;
        actionRowType = 'community_count';
        actionData = {
          countText: '车友会已超 350 人 · 专属水岸福利',
          actionBtnText: '入群领特饮 →'
        };
        cornerBadge = { type: 'dot', color: 'bg-cyan-500', title: '水岸俱乐部' };
        date = '现制现调';
        prepMinutes = 10;
      } else if (truck.id === 'truck-04' || idx === 3) {
        avatarUrl = burgerImg;
        category = 'delivery';
        branchTagType = 'coffee';
        typeTag = '极速专送';
        typeTagClass = 'bg-purple-50 text-purple-700 border-purple-200/80 font-semibold';
        summary = `静安国际中心 24H 夜间热食保温专送通道在线，全程 GPS 动态温控直达。`;
        detailedAnnouncement = `【24H 专送服务】04 号餐车常驻汉中路光复路口，配备车载 70℃ 恒温箱与极速骑手接力，全天候 24 小时极速履约保障，履约好评率 100%。`;
        actionRowType = 'delivery_review';
        actionData = {
          statusText: '已确认妥投 · 满意度评价 (履约率 100%)',
          actionBtnText: '去评价 >'
        };
        cornerBadge = { type: '24h', text: '24H' };
        date = '24H 专送';
        prepMinutes = 5;
      }

      // 实时同步后台热更新的主厨通告与硬件工况
      if (truck.chefAnnouncement) {
        summary = truck.chefAnnouncement;
        detailedAnnouncement = truck.chefAnnouncement;
      }
      if (truck.hardwareStatus?.queueOrders !== undefined) {
        prepMinutes = Math.max(3, (truck.hardwareStatus.queueOrders + 1) * 3);
        date = truck.hardwareStatus.queueOrders > 0 ? `排队 ${truck.hardwareStatus.queueOrders} 单` : '免排队·即刻出餐';
      }
      if (truck.status === 'transit') {
        cornerBadge = { type: 'dot', color: 'bg-amber-500', title: '巡游中' };
      } else if (truck.status === 'closed') {
        cornerBadge = { type: 'dot', color: 'bg-neutral-400', title: '打烊中' };
      }

      const branchTag = truck.locationName.includes('·')
        ? truck.locationName.split('·')[1].trim()
        : truck.locationName.slice(0, 8);

      return {
        id: `feed-${truck.id}`,
        truckId: truck.id,
        truck,
        distanceKm,
        isEstimatedDistance: isEstimated,
        isActiveTruck,
        brandName: truck.name,
        branchTag,
        branchTagType,
        avatarUrl: truck.logo || truck.image || avatarUrl,
        cornerBadge,
        date,
        prepMinutes,
        typeTag,
        typeTagClass,
        category,
        summary,
        detailedAnnouncement,
        actionRowType,
        actionData,
        unread: !readItemIds.has(`feed-${truck.id}`)
      };
    });
  }, [trucks, activeTruck, userLocation, readItemIds]);

  // 未读数计算
  const unreadCount = useMemo(
    () => dynamicTruckItems.filter((i) => i.unread).length,
    [dynamicTruckItems]
  );

  // 分类、搜索与多维排序
  const filteredItems = useMemo(() => {
    let list = dynamicTruckItems.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchName = item.brandName.toLowerCase().includes(q);
        const matchBranch = item.branchTag.toLowerCase().includes(q);
        const matchLocation = item.truck.locationName.toLowerCase().includes(q);
        const matchSummary = item.summary.toLowerCase().includes(q);
        const matchPlate = (item.truck.code || '').toLowerCase().includes(q);
        const matchType = item.typeTag.toLowerCase().includes(q);
        return matchName || matchBranch || matchLocation || matchSummary || matchPlate || matchType;
      }
      return true;
    });

    // 多维排序逻辑 (当前服务餐车永远置顶第 1 位，确保服务不乱)
    return list.sort((a, b) => {
      if (a.isActiveTruck && !b.isActiveTruck) return -1;
      if (!a.isActiveTruck && b.isActiveTruck) return 1;

      if (sortBy === 'min_order') {
        return a.truck.minDeliveryAmount - b.truck.minDeliveryAmount;
      }
      if (sortBy === 'prep_time') {
        return a.prepMinutes - b.prepMinutes;
      }
      if (sortBy === 'welfare') {
        const aHasVoucher = a.category === 'coupon' ? 1 : 0;
        const bHasVoucher = b.category === 'coupon' ? 1 : 0;
        if (aHasVoucher !== bHasVoucher) return bHasVoucher - aHasVoucher;
      }
      return a.distanceKm - b.distanceKm;
    });
  }, [dynamicTruckItems, activeCategory, searchKeyword, sortBy]);

  // 展开/收起单个卡片表单明细
  const toggleCardExpand = (id: string, defaultTab?: DetailTabType) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (defaultTab) {
          setCardDetailTab((t) => ({ ...t, [id]: defaultTab }));
        }
      }
      return next;
    });
  };

  // 设置卡片当前选中的细则分签
  const handleSelectCardTab = (id: string, tab: DetailTabType) => {
    setCardDetailTab((prev) => ({ ...prev, [id]: tab }));
    if (!expandedCardIds.has(id)) {
      setExpandedCardIds((prev) => new Set([...prev, id]));
    }
  };

  // 复制餐车驻点地址
  const handleCopyTruckAddress = async (item: TruckFeedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveActionMenuId(null);
    const fullText = `${item.brandName} 驻点：${item.truck.locationName}（配送半径 ${item.truck.deliveryRadiusKm}km，起送 ¥${item.truck.minDeliveryAmount}）`;
    const ok = await copyTextToClipboard(fullText);
    if (ok) {
      showToast('驻点地址已复制', '已复制至剪贴板，可粘贴至地图或聊天窗口发送好友');
    } else {
      showToast('复制失败', '请手动选中地址进行复制');
    }
  };

  // 一键获取 GPS 设备定位基准
  const handleRequestGps = async () => {
    setIsLocating(true);
    showToast('正在校准 GPS 高精定位...', '正在请求设备真实坐标以重新测距附近餐车');
    try {
      const res = await requestBrowserGeolocation();
      if (res.success && res.latitude && res.longitude) {
        showToast('GPS 定位基准更新成功', `已对齐您当前位置，测距精度 ±${Math.round(res.accuracy || 15)}m`);
      } else {
        saveUserLocationState({
          latitude: 31.2435,
          longitude: 121.4690,
          locationName: '静安大悦城商圈（推荐基准）',
          addressDetail: '西藏北路 166 号',
          source: 'preset',
          isFallback: false
        });
        showToast('已对齐商圈推荐基准', '未获取到 GPS 权限，已为您自动对齐「静安大悦城」核心商圈基准');
      }
    } catch {
      showToast('定位已重置为核心商圈', '已将基准切换至静安核心商圈');
    } finally {
      setIsLocating(false);
    }
  };

  // 快速切换商圈基准弹出菜单选项
  const handleSelectBenchmarkOption = (val: string) => {
    setIsBenchmarkMenuOpen(false);
    if (val === 'gps') {
      handleRequestGps();
      return;
    }
    if (val === 'custom_modal') {
      setIsAddressModalOpen(true);
      return;
    }

    const preset = PRESET_DELIVERY_ADDRESSES.find((p) => p.id === val);
    if (preset) {
      saveUserLocationState({
        latitude: preset.latitude,
        longitude: preset.longitude,
        locationName: preset.title,
        addressDetail: preset.address,
        source: 'preset',
        isFallback: false
      });
      showToast('定位基准已调整', `已将测距基准设定为：${preset.title}`);
    }
  };

  // 快速切换智能排序选项
  const handleSelectSortOption = (val: SortOption) => {
    setIsSortMenuOpen(false);
    setSortBy(val);
    const labels: Record<SortOption, string> = {
      distance: '按距离最近优先排序',
      min_order: '按起送价最低优先排序',
      prep_time: '按极速出餐时间优先排序',
      welfare: '按专属福利优惠优先排序'
    };
    showToast('排序规则已更新', labels[val] || '已更新排序规则');
  };

  // 兼容原生事件
  const handleBenchmarkSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleSelectBenchmarkOption(e.target.value);
  };

  // 选择预设商圈/地址回调
  const handleSelectAddress = (addressTitle: string) => {
    setIsAddressModalOpen(false);
    showToast('定位基准已切换', `已将附近餐车测距基准调整为：${addressTitle}`);
  };

  // 全部标记已读
  const handleMarkAllRead = () => {
    setReadItemIds(new Set(dynamicTruckItems.map((i) => i.id)));
    showToast('全部已设为已读', '附近餐车最新通知与动态已标记为已读');
  };

  // 单条标记已读
  const handleMarkItemRead = (id: string) => {
    setReadItemIds((prev) => new Set([...prev, id]));
  };

  // 切换餐车绑定 (被选中的餐车将自动高亮并置顶至第一张卡片)
  const handleSwitchTruck = (truck: TruckLocationConfig, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveActionMenuId(null);
    setActiveTruckId(truck.id);
    setActiveTruck(truck);
    showToast('已切换至目标餐车并置顶', `当前服务餐车已变更为 ${truck.name}，已自动置顶`);
  };

  // 进店点单
  const handleOrderFromTruck = (truck: TruckLocationConfig, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveActionMenuId(null);
    setActiveTruckId(truck.id);
    setActiveTruck(truck);
    showToast('正在前往点单', `已连接 ${truck.name}，起送价 ¥${truck.minDeliveryAmount}`);
    if (onBackToMenu) {
      onBackToMenu();
    }
  };

  // 点击卡片条目动作
  const handleItemAction = (item: TruckFeedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    handleMarkItemRead(item.id);
    setSelectedTruckForModal(item.truck);

    if (item.category === 'community') {
      if (isTruckCommunityMember(item.truck.id) && onOpenGroupChat) {
        onOpenGroupChat('truck_community', item.truck.id);
      } else {
        setIsCommunityModalOpen(true);
      }
    } else if (item.category === 'coupon') {
      setActiveTruckId(item.truck.id);
      setActiveTruck(item.truck);
      showToast('优惠券已领入账户', `${item.brandName} 满 50 减 10 专享券已生效，点单自动抵扣！`);
      if (onBackToMenu) {
        setTimeout(() => {
          onBackToMenu();
        }, 600);
      }
    } else if (item.category === 'delivery') {
      setIsRatingModalOpen(true);
    } else {
      handleOrderFromTruck(item.truck);
    }
  };

  // 提交履约评价
  const handleSubmitRating = () => {
    setIsRatingModalOpen(false);
    showToast('评价提交成功', `感谢对 ${selectedTruckForModal?.name || '流动餐车'} 的评价！极速履约评分 +5 分`);
  };

  // 确认加入社群
  const handleJoinGroup = () => {
    setIsCommunityModalOpen(false);
    if (selectedTruckForModal) {
      joinTruckCommunityGroup(selectedTruckForModal.id);
      showToast('加入社群成功', `已成为 ${selectedTruckForModal.name} 粉丝群老饕成员！`);
      if (onOpenGroupChat) {
        setTimeout(() => {
          onOpenGroupChat('truck_community', selectedTruckForModal.id);
        }, 300);
      }
    }
  };

  // 当前定位基准显示文本
  const currentBenchmarkId = useMemo(() => {
    const match = PRESET_DELIVERY_ADDRESSES.find(
      (p) => Math.abs(p.latitude - userLocation.latitude) < 0.002 && Math.abs(p.longitude - userLocation.longitude) < 0.002
    );
    return match ? match.id : 'custom';
  }, [userLocation]);

  // 当前定位基准显示文本 (极致美学单排展示)
  const currentBenchmarkDisplay = useMemo(() => {
    if (currentBenchmarkId === 'p1') return '静安大悦城';
    if (currentBenchmarkId === 'p2') return '苏河湾万象天地';
    if (currentBenchmarkId === 'p3') return '静安国际中心';
    if (currentBenchmarkId === 'p4') return '人民广场核心';
    if (userLocation?.locationName) {
      const clean = userLocation.locationName.replace(/（.*）|\(.*\)|\s*商圈/g, '').trim();
      return clean.slice(0, 7) || '当前基准';
    }
    return '当前定位';
  }, [currentBenchmarkId, userLocation]);

  // 当前排序显示文本
  const currentSortDisplay = useMemo(() => {
    switch (sortBy) {
      case 'distance': return '距离最近';
      case 'min_order': return '起送最低';
      case 'prep_time': return '出餐最快';
      case 'welfare': return '优惠优先';
      default: return '智能排序';
    }
  }, [sortBy]);

  return (
    <div className="min-h-full w-full bg-[#f4f4f2] text-[#111111] font-sans antialiased p-0 m-0 flex justify-center selection:bg-neutral-900 selection:text-white pb-28">
      <div className="w-full max-w-4xl bg-[#f4f4f2] flex flex-col">
        
        {/* ========================================================
            表单顶栏 1：极简工业控制台头部
            ======================================================== */}
        {!embedded && (
          <header className="bg-white px-3 sm:px-4 py-2.5 border-b border-neutral-200/90 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
            <div className="flex items-center gap-2">
              {onBackToMenu && (
                <button
                  type="button"
                  id="mobile-container-back-btn"
                  onClick={onBackToMenu}
                  className="h-8 w-8 rounded-lg border border-neutral-200/90 bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center text-neutral-800 active:scale-95 transition-all cursor-pointer shadow-2xs"
                  title="返回点单菜单"
                  aria-label="返回菜单"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
                <h1 className="text-xs sm:text-sm font-bold tracking-tight text-neutral-900">
                  附近流动餐车雷达
                </h1>
                <span className="text-[10px] text-neutral-500 font-medium hidden sm:inline">
                  · 车队协同调度中枢
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* 视图模式平铺/紧凑切换 */}
              <div className="flex items-center border border-neutral-200/90 rounded-lg overflow-hidden bg-neutral-100/90 p-0.5 h-8 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleToggleViewMode(false)}
                  className={`h-full px-2.5 text-[10.5px] font-semibold flex items-center gap-1 transition-all cursor-pointer rounded-md ${
                    !isCompactMode ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                  title="平铺表单样式"
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>平铺表单</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleViewMode(true)}
                  className={`h-full px-2.5 text-[10.5px] font-semibold flex items-center gap-1 transition-all cursor-pointer rounded-md ${
                    isCompactMode ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                  title="紧凑清单样式"
                >
                  <LayoutList className="w-3 h-3" />
                  <span>紧凑</span>
                </button>
              </div>

              {/* 未读动态微标 */}
              {unreadCount > 0 && (
                <div className="h-8 px-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10.5px] font-bold flex items-center select-none shadow-2xs">
                  {unreadCount}条新
                </div>
              )}

              {/* 一键全部已读 */}
              <button
                type="button"
                id="mark-all-read-btn"
                onClick={handleMarkAllRead}
                className="h-8 w-8 rounded-lg border border-neutral-200/90 bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center text-neutral-600 hover:text-neutral-900 active:scale-95 transition-all cursor-pointer shadow-2xs"
                title="全部设为已读"
                aria-label="设为全部已读"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>
        )}

        {/* ========================================================
            表单顶栏 2：极致美学 · 单排一体化调度中枢 (Single-Row Minimalist Popover Toolbar)
            严格单排 flex-nowrap，所有选择器统一为极简半透明毛玻璃弹出式菜单
            优化触控点击区域，统一 h-8 工业标尺，动画顺滑无缝
            ======================================================== */}
        <div className="px-2.5 sm:px-4 py-2 bg-white border-b border-neutral-200/90 flex items-center justify-between gap-1.5 sm:gap-2 w-full flex-nowrap relative z-20 text-xs">
          {/* 1. 测距基准选择器 (极简弹出式菜单 + 半透明毛玻璃背景) */}
          <div className="relative flex-1 min-w-[115px] sm:min-w-[155px] max-w-[215px] shrink-0" data-benchmark-menu-container>
            <button
              type="button"
              id="benchmark-popover-trigger"
              onClick={() => {
                setIsBenchmarkMenuOpen((prev) => !prev);
                setIsSortMenuOpen(false);
                setActiveActionMenuId(null);
              }}
              className={`w-full h-8 rounded-lg border text-left flex items-center px-2 sm:px-2.5 gap-1.5 shadow-2xs transition-all duration-150 cursor-pointer select-none group ${
                isBenchmarkMenuOpen
                  ? 'border-neutral-900 bg-neutral-100 ring-2 ring-neutral-900/10'
                  : 'border-neutral-200/90 bg-neutral-50/80 hover:bg-neutral-100/90 hover:border-neutral-300'
              }`}
              title="点击切换附近餐车测距基准"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 transition-transform group-hover:scale-110" />
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <span className="text-[10px] text-neutral-400 font-medium shrink-0 hidden xs:inline">基准</span>
                <span className="text-[11.5px] font-bold text-neutral-900 truncate tracking-tight">
                  {currentBenchmarkDisplay}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                  isBenchmarkMenuOpen ? 'rotate-180 text-neutral-900' : 'text-neutral-400 group-hover:text-neutral-700'
                }`}
              />
            </button>

            {/* 极简弹出式菜单 (半透明毛玻璃背景 + 优化点击热区) */}
            <AnimatePresence>
              {isBenchmarkMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 3, scale: 0.98 }}
                  transition={{ duration: 0.14, ease: 'easeOut' }}
                  className="absolute left-0 top-full mt-1.5 w-72 max-w-[calc(100vw-24px)] rounded-xl backdrop-blur-xl bg-white/92 border border-neutral-200/90 shadow-xl shadow-neutral-950/10 p-1.5 z-50 text-xs"
                >
                  <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between border-b border-neutral-100/90 pb-1 mb-1">
                    <span>测距参考基准</span>
                    <span className="text-[9.5px] text-emerald-600 font-semibold">就近调度</span>
                  </div>

                  <div className="space-y-0.5">
                    {PRESET_DELIVERY_ADDRESSES.map((preset) => {
                      const isSelected = currentBenchmarkId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectBenchmarkOption(preset.id)}
                          className={`w-full px-2.5 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-neutral-900/[0.07] text-neutral-950 font-bold'
                              : 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-900/[0.04] active:bg-neutral-900/[0.08]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-700' : 'text-neutral-400'}`} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[11.5px] leading-tight">{preset.title}</div>
                              <div className="text-[9.5px] text-neutral-400 font-normal truncate mt-0.5">{preset.address}</div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="my-1 border-t border-neutral-200/60" />

                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => handleSelectBenchmarkOption('gps')}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-neutral-700 hover:text-emerald-800 hover:bg-emerald-50/70 active:bg-emerald-100/60 transition-all flex items-center justify-between gap-2 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <div>
                          <div className="text-[11.5px] font-semibold text-neutral-900">获取真实 GPS 坐标</div>
                          <div className="text-[9.5px] text-neutral-400">调用设备浏览器高精传感器</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-1.5 py-0.5 rounded">实时</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectBenchmarkOption('custom_modal')}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-neutral-700 hover:text-neutral-950 hover:bg-neutral-900/[0.04] active:bg-neutral-900/[0.08] transition-all flex items-center justify-between gap-2 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Navigation className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <div>
                          <div className="text-[11.5px] font-semibold text-neutral-900">自定义其它收货地址...</div>
                          <div className="text-[9.5px] text-neutral-400">手动选择静安核心或外区地址</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. 智能排序选择器 (极简弹出式菜单 + 半透明毛玻璃背景) */}
          <div className="relative shrink-0" data-sort-menu-container>
            <button
              type="button"
              id="sort-popover-trigger"
              onClick={() => {
                setIsSortMenuOpen((prev) => !prev);
                setIsBenchmarkMenuOpen(false);
                setActiveActionMenuId(null);
              }}
              className={`h-8 rounded-lg border text-left flex items-center px-2 sm:px-2.5 gap-1.5 shadow-2xs transition-all duration-150 cursor-pointer select-none group ${
                isSortMenuOpen
                  ? 'border-neutral-900 bg-neutral-100 ring-2 ring-neutral-900/10'
                  : 'border-neutral-200/90 bg-neutral-50/80 hover:bg-neutral-100/90 hover:border-neutral-300'
              }`}
              title="点击切换智能排序方式"
            >
              <ArrowUpDown className="w-3 h-3 text-neutral-500 shrink-0 transition-transform group-hover:scale-110" />
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-neutral-400 font-medium shrink-0 hidden md:inline">排序</span>
                <span className="text-[11.5px] font-semibold text-neutral-800 tracking-tight whitespace-nowrap">
                  {currentSortDisplay}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                  isSortMenuOpen ? 'rotate-180 text-neutral-900' : 'text-neutral-400 group-hover:text-neutral-700'
                }`}
              />
            </button>

            {/* 极简弹出式菜单 (半透明毛玻璃背景 + 优化点击热区) */}
            <AnimatePresence>
              {isSortMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 3, scale: 0.98 }}
                  transition={{ duration: 0.14, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-1.5 w-60 max-w-[calc(100vw-24px)] rounded-xl backdrop-blur-xl bg-white/92 border border-neutral-200/90 shadow-xl shadow-neutral-950/10 p-1.5 z-50 text-xs"
                >
                  <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between border-b border-neutral-100/90 pb-1 mb-1">
                    <span>排序规则</span>
                    <span className="text-[9.5px] text-emerald-600 font-semibold">智能计算</span>
                  </div>

                  <div className="space-y-0.5">
                    {[
                      { key: 'distance', title: '距离最近', desc: '按与测距基准由近及远', badge: '默认' },
                      { key: 'min_order', title: '起送最低', desc: '按餐车起送门槛由低到高' },
                      { key: 'prep_time', title: '出餐最快', desc: '按平均备餐出餐时间由短到长' },
                      { key: 'welfare', title: '优惠优先', desc: '专属卡券与社群特惠餐车优先' }
                    ].map((opt) => {
                      const isSelected = sortBy === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectSortOption(opt.key as SortOption)}
                          className={`w-full px-2.5 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-neutral-900/[0.07] text-neutral-950 font-bold'
                              : 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-900/[0.04] active:bg-neutral-900/[0.08]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11.5px] leading-tight">{opt.title}</span>
                              {opt.badge && (
                                <span className="text-[9px] font-bold px-1 py-0.2 bg-emerald-100 text-emerald-700 rounded leading-none">
                                  {opt.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-[9.5px] text-neutral-400 font-normal truncate mt-0.5">{opt.desc}</div>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. GPS 重新校准 (统一 h-8 w-8) */}
          <button
            type="button"
            onClick={handleRequestGps}
            disabled={isLocating}
            className="h-8 w-8 shrink-0 rounded-lg border border-neutral-200/90 bg-neutral-50/80 hover:bg-neutral-100/90 hover:border-neutral-300 text-neutral-600 hover:text-emerald-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs disabled:opacity-50"
            title="重新校准真实设备 GPS 坐标"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* 4. 在线餐车总数徽记 (统一 h-8 极致美学微拟态) */}
          <div className="h-8 px-2 sm:px-2.5 rounded-lg border border-emerald-200/80 bg-emerald-50/80 text-emerald-800 text-[11px] font-bold shrink-0 flex items-center gap-1.5 select-none shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
            <span className="whitespace-nowrap">
              <span className="hidden xs:inline">{dynamicTruckItems.length}辆在线</span>
              <span className="xs:hidden">{dynamicTruckItems.length}辆</span>
            </span>
          </div>

          {/* 5. 搜索切换开关 (统一 h-8 w-8 白色极简涉及) */}
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className={`h-8 w-8 shrink-0 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 ${
              isSearchOpen || searchKeyword
                ? 'bg-white text-neutral-950 border-neutral-900 ring-2 ring-neutral-900/10 shadow-xs font-bold'
                : 'border-neutral-200/90 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-600'
            }`}
            title="搜索餐车"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ========================================================
            表单顶栏 3：白色极简统一分类筛选条 + 嵌入式搜索框
            全员白底极简：配置专属语义图标 (Truck, Ticket, Users, ShieldCheck)
            高亮态保持纯白底，边框、图标、文本高度统一色彩 (Emerald, Rose, Amber, Purple)
            统一 h-8 高度与 rounded-lg 倒角
            ======================================================== */}
        <div className="px-3 sm:px-4 py-2 bg-white border-b border-neutral-200/90 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none py-0.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {/* 全部餐车 (极简胶囊按钮) */}
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`h-8 px-3.5 rounded-full text-[11.5px] font-semibold transition-all duration-150 cursor-pointer shrink-0 border flex items-center justify-center gap-1.5 select-none active:scale-[0.98] ${
                  activeCategory === 'all'
                    ? 'bg-white text-emerald-700 border-emerald-600 ring-1.5 ring-emerald-600/15 shadow-xs font-bold'
                    : 'bg-white text-neutral-600 border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 shadow-2xs'
                }`}
              >
                <Truck className={`w-3.5 h-3.5 shrink-0 transition-colors ${activeCategory === 'all' ? 'text-emerald-700' : 'text-emerald-600/70'}`} />
                <span>全部餐车</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold border transition-colors ${
                    activeCategory === 'all'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-200/70'
                  }`}
                >
                  {dynamicTruckItems.length}
                </span>
              </button>

              {/* 卡券特惠 (极简胶囊按钮) */}
              <button
                type="button"
                onClick={() => setActiveCategory('coupon')}
                className={`h-8 px-3.5 rounded-full text-[11.5px] font-semibold transition-all duration-150 cursor-pointer shrink-0 border flex items-center justify-center gap-1.5 select-none active:scale-[0.98] ${
                  activeCategory === 'coupon'
                    ? 'bg-white text-rose-600 border-rose-500 ring-1.5 ring-rose-500/15 shadow-xs font-bold'
                    : 'bg-white text-neutral-600 border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 shadow-2xs'
                }`}
              >
                <Ticket className={`w-3.5 h-3.5 shrink-0 transition-colors ${activeCategory === 'coupon' ? 'text-rose-600' : 'text-rose-500'}`} />
                <span>卡券特惠</span>
              </button>

              {/* 社群车友 (极简胶囊按钮) */}
              <button
                type="button"
                onClick={() => setActiveCategory('community')}
                className={`h-8 px-3.5 rounded-full text-[11.5px] font-semibold transition-all duration-150 cursor-pointer shrink-0 border flex items-center justify-center gap-1.5 select-none active:scale-[0.98] ${
                  activeCategory === 'community'
                    ? 'bg-white text-amber-600 border-amber-500 ring-1.5 ring-amber-500/15 shadow-xs font-bold'
                    : 'bg-white text-neutral-600 border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 shadow-2xs'
                }`}
              >
                <Users className={`w-3.5 h-3.5 shrink-0 transition-colors ${activeCategory === 'community' ? 'text-amber-600' : 'text-amber-500'}`} />
                <span>社群车友</span>
              </button>

              {/* 专送履约 (极简胶囊按钮) */}
              <button
                type="button"
                onClick={() => setActiveCategory('delivery')}
                className={`h-8 px-3.5 rounded-full text-[11.5px] font-semibold transition-all duration-150 cursor-pointer shrink-0 border flex items-center justify-center gap-1.5 select-none active:scale-[0.98] ${
                  activeCategory === 'delivery'
                    ? 'bg-white text-purple-600 border-purple-500 ring-1.5 ring-purple-500/15 shadow-xs font-bold'
                    : 'bg-white text-neutral-600 border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 shadow-2xs'
                }`}
              >
                <ShieldCheck className={`w-3.5 h-3.5 shrink-0 transition-colors ${activeCategory === 'delivery' ? 'text-purple-600' : 'text-purple-500'}`} />
                <span>专送履约</span>
              </button>
            </div>

            <span className="text-[10px] text-neutral-400 font-medium shrink-0 hidden md:inline">
              极简统一 · 无突兀感设计
            </span>
          </div>

          {/* 实时搜索展开输入框 (极简工控圆角与微透聚焦层) */}
          <AnimatePresence>
            {(isSearchOpen || searchKeyword) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="relative flex items-center overflow-hidden pt-0.5 pb-0.5"
              >
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="检索餐车名称、分站商圈、车牌或特色..."
                  className="w-full h-8.5 bg-neutral-100/80 hover:bg-neutral-100 focus:bg-white border border-neutral-200/90 focus:border-neutral-900 rounded-xl pl-9 pr-8 text-xs text-neutral-900 placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/10 transition-all font-sans shadow-2xs"
                  autoFocus
                />
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={() => setSearchKeyword('')}
                    className="w-5 h-5 rounded-full bg-neutral-200/80 hover:bg-neutral-300 active:scale-90 text-neutral-600 flex items-center justify-center absolute right-2.5 transition-all cursor-pointer"
                    title="清空搜索词"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ========================================================
            表单主体列表：严格网格排版平铺表单 (Flat Tiled Form Style)
            ======================================================== */}
        <main className="p-3 sm:p-4 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-12 px-4 text-center bg-white rounded border border-neutral-200 shadow-2xs">
              <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-neutral-700">未找到匹配的流动餐车站台</p>
              <p className="text-[10px] text-neutral-400 mt-1">请尝试切换分类标签或重置搜索词</p>
            </div>
          ) : isCompactMode ? (
            /* -----------------------------------------------------
               视图模式 A：极速紧凑清单 (High-Density Form Rows)
               ----------------------------------------------------- */
            <div className="bg-white rounded border border-neutral-200 shadow-2xs divide-y divide-neutral-100 overflow-hidden">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  id={`truck-compact-row-${item.truck.id}`}
                  onClick={() => handleMarkItemRead(item.id)}
                  className={`p-2.5 flex items-center justify-between gap-2.5 transition-colors ${
                    item.isActiveTruck ? 'bg-emerald-50/20' : 'hover:bg-neutral-50'
                  }`}
                >
                  {/* 左侧：车标与名称 */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="relative shrink-0 w-9 h-9 rounded border border-neutral-200 overflow-hidden bg-neutral-100">
                      <img alt={item.brandName} className="w-full h-full object-cover" src={item.avatarUrl} />
                      <span className="absolute bottom-0 right-0 bg-white/95 text-neutral-900 text-[7.5px] font-bold px-1 py-0.2 rounded-tl border-t border-l border-neutral-200 shadow-2xs">
                        {item.truck.id.replace('truck-', '#')}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-neutral-900 truncate">
                          {item.brandName}
                        </span>
                        <span className="text-[9.5px] font-medium text-neutral-500 truncate">
                          {item.branchTag}
                        </span>
                        {item.isActiveTruck && (
                          <span className="text-[8.5px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-300 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-600 animate-pulse" />
                            当前服务
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-0.5 truncate">
                        <span className="text-emerald-700 font-bold">
                          {item.isEstimatedDistance ? '~' : ''}{item.distanceKm < 0.1 ? '<0.1' : item.distanceKm.toFixed(1)}km
                        </span>
                        <span>·</span>
                        <span>起送 ¥{item.truck.minDeliveryAmount}</span>
                        <span>·</span>
                        <span>半径 {item.truck.deliveryRadiusKm}km</span>
                        <span>·</span>
                        <span>{item.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* 右侧：动作按钮 (统一 h-8 高度工业标尺) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!item.isActiveTruck && (
                      <button
                        type="button"
                        onClick={(e) => handleSwitchTruck(item.truck, e)}
                        className="h-8 px-2.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-[11px] font-semibold hover:bg-neutral-100 active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
                      >
                        切换
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleOrderFromTruck(item.truck, e)}
                      className={`h-8 px-3 rounded-lg text-[11px] font-bold active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                        item.isActiveTruck
                          ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                          : 'bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400'
                      }`}
                    >
                      <span>{item.isActiveTruck ? '进入点单' : '去点单'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* -----------------------------------------------------
               视图模式 B：平铺表单样式模块 (Standard Tiled Form Deck)
               每张卡片彻底重构成平铺表单，合理区分重要与非重要字段
               ----------------------------------------------------- */
            filteredItems.map((item) => {
              const isCardExpanded = expandedCardIds.has(item.id);
              const activeTab = cardDetailTab[item.id] || 'station';
              const isActionMenuOpen = activeActionMenuId === item.id;

              return (
                <OrganicCardReveal
                  key={item.id}
                  id={`truck-form-deck-${item.truck.id}`}
                  onClick={() => handleMarkItemRead(item.id)}
                  className={`bg-white rounded-xl border transition-all duration-150 shadow-2xs ${
                    isActionMenuOpen ? 'relative z-50 overflow-visible' : 'relative overflow-hidden'
                  } ${
                    item.isActiveTruck
                      ? 'border-neutral-900 ring-1 ring-neutral-900/15 border-l-4 border-l-emerald-600'
                      : 'border-neutral-200/90 hover:border-neutral-300'
                  }`}
                >
                  {/* ====================================================
                      平铺表单层 1：核心状态与中枢网格 (Primary Key Fields)
                      车号、车名、状态灯、测距、主行动键一屏对齐
                      ==================================================== */}
                  <div className="p-3 sm:p-3.5">
                    <div className="flex items-start justify-between gap-2.5">
                      {/* 头像 + 车号徽记 */}
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded border border-neutral-200 overflow-hidden bg-neutral-100 flex items-center justify-center">
                          <img
                            alt={item.brandName}
                            className="w-full h-full object-cover"
                            src={item.avatarUrl}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-white text-neutral-900 text-[8px] font-bold rounded border border-neutral-300 shadow-2xs">
                          {item.truck.id.replace('truck-', '#')}
                        </span>
                        {item.cornerBadge && item.unread && (
                          <span
                            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse ring-2 ring-white"
                            title="新动态"
                          />
                        )}
                      </div>

                      {/* 表单核心信息区 (严格左对齐与网格化) */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            <h2 className="text-xs sm:text-[13px] font-bold text-neutral-900 truncate">
                              {item.brandName}
                            </h2>
                            <span className="text-[9.5px] font-medium text-neutral-600 bg-neutral-100 px-1.5 py-0.2 rounded border border-neutral-200 truncate">
                              {item.branchTag}
                            </span>
                            {item.isActiveTruck ? (
                              <span className="text-[8.5px] font-bold bg-emerald-700 text-white px-1.5 py-0.2 rounded flex items-center gap-1 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                                正在服务中
                              </span>
                            ) : (
                              <span className="text-[8.5px] font-medium text-neutral-500 bg-neutral-50 px-1.5 py-0.2 rounded border border-neutral-200">
                                空闲就绪
                              </span>
                            )}
                          </div>

                          {/* 测距高亮显示 */}
                          <div
                            className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 cursor-pointer select-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestGps();
                            }}
                            title="点击重新校准定位"
                          >
                            <Navigation className="w-2.5 h-2.5 text-emerald-600" />
                            <span>
                              {item.isEstimatedDistance ? '~' : ''}
                              {item.distanceKm < 0.1 ? '<0.1' : item.distanceKm.toFixed(1)}km
                            </span>
                            {item.isEstimatedDistance && (
                              <span className="text-[8px] font-normal text-emerald-700 opacity-80">基准</span>
                            )}
                          </div>
                        </div>

                        {/* 单行摘要预览 */}
                        <p className="text-[11px] text-neutral-500 truncate leading-tight">
                          {item.summary}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ====================================================
                      平铺表单层 2：核心工况参数网格 (4-Column Strict Grid)
                      起送门槛、配送半径、出餐时效、服务模式统一排版无溢出
                      ==================================================== */}
                  <div className="grid grid-cols-4 divide-x divide-neutral-200/70 bg-neutral-50/70 border-y border-neutral-200/70 text-[11px] py-1.5 px-0.5 text-center">
                    <div className="px-1 min-w-0">
                      <span className="text-neutral-400 block text-[9.5px] font-medium">起送门槛</span>
                      <span className="font-bold text-neutral-800 truncate block">¥{item.truck.minDeliveryAmount}</span>
                    </div>
                    <div className="px-1 min-w-0">
                      <span className="text-neutral-400 block text-[9.5px] font-medium">专送半径</span>
                      <span className="font-bold text-neutral-800 truncate block">{item.truck.deliveryRadiusKm}km</span>
                    </div>
                    <div className="px-1 min-w-0">
                      <span className="text-neutral-400 block text-[9.5px] font-medium">出餐时效</span>
                      <span className="font-bold text-neutral-800 truncate block">{item.date}</span>
                    </div>
                    <div className="px-1 min-w-0">
                      <span className="text-neutral-400 block text-[9.5px] font-medium">服务类别</span>
                      <span className={`font-bold text-[11px] truncate block ${item.typeTagClass}`}>
                        {item.typeTag}
                      </span>
                    </div>
                  </div>

                  {/* ====================================================
                      平铺表单层 3：表单操作条 + 优雅内容折叠控制器
                      按钮高度统一为 h-8 (32px)，rounded-lg 极简工业标尺
                      ==================================================== */}
                  <div className="p-2 sm:px-3 sm:py-2.5 bg-white flex items-center justify-between gap-1 sm:gap-2 border-t border-neutral-100/90 relative z-10">
                    {/* 左侧：非必要细则选择器 (统一 h-8 高度，高阶极简胶囊，强制防折行与自适应适读字号) */}
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                      <button
                        type="button"
                        id={`form-toggle-btn-${item.truck.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCardExpand(item.id);
                        }}
                        className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 px-2.5 sm:px-3 rounded-full text-xs font-semibold transition-all duration-150 border cursor-pointer select-none shadow-2xs active:scale-[0.98] whitespace-nowrap shrink-0 max-w-full ${
                          isCardExpanded
                            ? 'bg-white text-neutral-950 border-neutral-900 ring-1.5 ring-neutral-900/15 shadow-xs font-bold hover:bg-neutral-50'
                            : 'bg-white text-neutral-700 border-neutral-200/90 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-900'
                        }`}
                        title={isCardExpanded ? '收起表单细则' : '展开表单细则'}
                      >
                        <FileText className={`w-3.5 h-3.5 shrink-0 ${isCardExpanded ? 'text-emerald-700' : 'text-neutral-400'}`} />
                        <span className="text-[11px] sm:text-[11.5px] tracking-tight whitespace-nowrap shrink-0">
                          {isCardExpanded ? '收起细则' : '驻点细则与福利'}
                        </span>

                        {/* 专属福利提示微标签 (字体调优至标准适读 10.5px，紧凑胶囊，绝不折行或溢出) */}
                        {!isCardExpanded && item.actionRowType === 'voucher_card' && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-bold bg-rose-50 text-rose-600 border border-rose-200/80 leading-none shrink-0 whitespace-nowrap shadow-2xs">
                            {item.typeTag || '满50减10'}
                          </span>
                        )}
                        {!isCardExpanded && item.actionRowType === 'community_count' && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 leading-none shrink-0 whitespace-nowrap shadow-2xs">
                            老饕群
                          </span>
                        )}
                        {!isCardExpanded && item.actionRowType === 'delivery_review' && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 leading-none shrink-0 whitespace-nowrap shadow-2xs">
                            极速专送
                          </span>
                        )}

                        <ChevronDown
                          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                            isCardExpanded ? 'rotate-180 text-neutral-900' : 'text-neutral-400'
                          }`}
                        />
                      </button>
                    </div>

                    {/* 右侧：主行动按钮 + 快捷动作下拉菜单 (统一 h-8 高度) */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" data-action-menu-container>
                      {/* 设为当前餐车按钮 (统一 h-8 工业标尺) */}
                      {!item.isActiveTruck && (
                        <button
                          type="button"
                          id={`switch-truck-btn-${item.truck.id}`}
                          onClick={(e) => handleSwitchTruck(item.truck, e)}
                          className="h-8 px-2 sm:px-2.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 active:scale-95 transition-all text-[10.5px] sm:text-[11px] font-semibold flex items-center justify-center cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
                        >
                          设为当前
                        </button>
                      )}

                      {/* 主行动按键 (统一 h-8 工业标尺白色极简设计) */}
                      <button
                        type="button"
                        id={`order-truck-btn-${item.truck.id}`}
                        onClick={(e) => handleOrderFromTruck(item.truck, e)}
                        className={`h-8 px-2.5 sm:px-3 rounded-lg text-[11px] font-bold active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs shrink-0 whitespace-nowrap ${
                          item.isActiveTruck
                            ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                            : 'bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400'
                        }`}
                      >
                        <span>{item.isActiveTruck ? '进入点单' : '去点单'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {/* 更多动作下拉菜单触发器 (统一 h-8 w-8 工业标尺白色极简) */}
                      <div className="relative">
                        <button
                          type="button"
                          id={`action-dropdown-btn-${item.truck.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMenuId(isActionMenuOpen ? null : item.id);
                            setIsBenchmarkMenuOpen(false);
                            setIsSortMenuOpen(false);
                          }}
                          className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                            isActionMenuOpen
                              ? 'bg-white text-neutral-950 border-neutral-900 ring-2 ring-neutral-900/10 shadow-xs'
                              : 'border-neutral-200/90 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-500 hover:text-neutral-900'
                          }`}
                          title="更多餐车操作"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {/* 点击外部透明遮罩，彻底杜绝下拉菜单被遮挡或无法关闭 */}
                        {isActionMenuOpen && (
                          <div
                            className="fixed inset-0 z-40 bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionMenuId(null);
                            }}
                          />
                        )}

                        {/* 下拉弹出菜单 Popover (极简风格 + 半透明高阶毛玻璃背景) */}
                        <AnimatePresence>
                          {isActionMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.96, y: 4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.96, y: 4 }}
                              transition={{ duration: 0.14, ease: 'easeOut' }}
                              className="absolute right-0 bottom-full mb-2 w-64 rounded-xl backdrop-blur-xl bg-white/98 border border-neutral-200/90 shadow-2xl shadow-neutral-950/20 p-1.5 z-50 text-xs"
                            >
                              <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100/90 pb-1 mb-1">
                                餐车操作与中枢
                              </div>

                              <div className="space-y-0.5">
                                {!item.isActiveTruck && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      setActiveActionMenuId(null);
                                      handleSwitchTruck(item.truck, e);
                                    }}
                                    className="w-full px-2.5 py-2 text-left text-neutral-800 hover:text-neutral-950 hover:bg-neutral-900/[0.04] active:bg-neutral-900/[0.08] font-medium rounded-lg flex items-center gap-2 transition-all cursor-pointer select-none"
                                  >
                                    <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span className="truncate">设为当前服务餐车</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    setActiveActionMenuId(null);
                                    handleCopyTruckAddress(item, e);
                                  }}
                                  className="w-full px-2.5 py-2 text-left text-neutral-800 hover:text-neutral-950 hover:bg-neutral-900/[0.04] active:bg-neutral-900/[0.08] font-medium rounded-lg flex items-center gap-2 transition-all cursor-pointer select-none"
                                >
                                  <Copy className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                                  <span className="truncate">复制驻点详细地址</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionMenuId(null);
                                    setIsAddressModalOpen(true);
                                  }}
                                  className="w-full px-2.5 py-2 text-left text-neutral-800 hover:text-neutral-950 hover:bg-neutral-900/[0.04] active:bg-neutral-900/[0.08] font-medium rounded-lg flex items-center gap-2 transition-all cursor-pointer select-none"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                                  <span className="truncate">查看商圈位置地图</span>
                                </button>
                              </div>

                              <div className="my-1 border-t border-neutral-200/60" />

                              <div className="space-y-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionMenuId(null);
                                    handleItemAction(item, e);
                                  }}
                                  className="w-full px-2.5 py-2 text-left text-amber-900 hover:text-amber-950 hover:bg-amber-50/70 active:bg-amber-100/60 font-medium rounded-lg flex items-center gap-2 transition-all cursor-pointer select-none"
                                >
                                  <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span className="truncate">老饕社群与专属福利</span>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* ====================================================
                      平铺表单层 4：展开后的平铺键值表单抽屉 (Flat Key-Value Form Table)
                      分段式胶囊控制器重塑为 Apple/Linear 式高质感 Segmented Control
                      消除硬冷边框与尖锐倒角，键值表单升级为极简双列工控卡片
                      ==================================================== */}
                  <AnimatePresence initial={false}>
                    {isCardExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden border-t border-neutral-200/90 bg-white"
                      >
                        <div className="p-3 sm:p-3.5 space-y-2.5 text-xs">
                          {/* 极简白底分段式控制器 (取消水平均分，自适应内容宽度，全部左对齐，背景极简纯白) */}
                          <div className="flex items-center justify-start p-1 bg-white rounded-xl border border-neutral-200/90 overflow-x-auto scrollbar-none gap-1.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleSelectCardTab(item.id, 'station')}
                              className={`w-auto shrink-0 h-8 px-3 rounded-lg text-[11.5px] transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                                activeTab === 'station'
                                  ? 'bg-white text-neutral-950 shadow-xs font-bold border border-neutral-900 ring-1.5 ring-neutral-900/10'
                                  : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 font-medium border border-transparent'
                              }`}
                            >
                              <MapPin className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'station' ? 'text-emerald-700' : 'text-neutral-400'}`} />
                              <span>驻点细则</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectCardTab(item.id, 'welfare')}
                              className={`w-auto shrink-0 h-8 px-3 rounded-lg text-[11.5px] transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                                activeTab === 'welfare'
                                  ? 'bg-white text-rose-600 shadow-xs font-bold border border-rose-500 ring-1.5 ring-rose-500/15'
                                  : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 font-medium border border-transparent'
                              }`}
                            >
                              <Ticket className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'welfare' ? 'text-rose-600' : 'text-neutral-400'}`} />
                              <span>专属福利</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectCardTab(item.id, 'announcement')}
                              className={`w-auto shrink-0 h-8 px-3 rounded-lg text-[11.5px] transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                                activeTab === 'announcement'
                                  ? 'bg-white text-amber-600 shadow-xs font-bold border border-amber-500 ring-1.5 ring-amber-500/15'
                                  : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 font-medium border border-transparent'
                              }`}
                            >
                              <Bell className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'announcement' ? 'text-amber-600' : 'text-neutral-400'}`} />
                              <span>主厨通告</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectCardTab(item.id, 'telemetry')}
                              className={`w-auto shrink-0 h-8 px-3 rounded-lg text-[11.5px] transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                                activeTab === 'telemetry'
                                  ? 'bg-white text-purple-600 shadow-xs font-bold border border-purple-500 ring-1.5 ring-purple-500/15'
                                  : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 font-medium border border-transparent'
                              }`}
                            >
                              <Activity className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'telemetry' ? 'text-purple-600' : 'text-neutral-400'}`} />
                              <span>硬件工况</span>
                            </button>
                          </div>

                          {/* 细则分项内容 A：驻点与起送细则 (对接后台真实数据) */}
                          {activeTab === 'station' && (
                            <div className="bg-white rounded-xl border border-neutral-200/90 divide-y divide-neutral-100/90 overflow-hidden shadow-2xs">
                              <div className="px-3.5 py-2.5 flex items-start gap-3 hover:bg-neutral-50/50 transition-colors">
                                <span className="w-16 sm:w-20 shrink-0 text-neutral-400 font-semibold text-[11px] tracking-tight pt-0.5">
                                  详细驻点
                                </span>
                                <div className="flex-1 min-w-0 text-[11.5px] text-neutral-800 flex items-center justify-between gap-2 leading-snug font-medium">
                                  <span className="truncate">{item.truck.locationName}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyTruckAddress(item, e)}
                                    className="h-6 px-2 rounded-md bg-neutral-100 hover:bg-neutral-200/80 active:scale-95 text-emerald-700 text-[10.5px] font-bold flex items-center gap-1 border border-neutral-200/60 shadow-2xs cursor-pointer shrink-0 transition-all"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>复制</span>
                                  </button>
                                </div>
                              </div>

                              <div className="px-3.5 py-2.5 flex items-start gap-3 hover:bg-neutral-50/50 transition-colors">
                                <span className="w-16 sm:w-20 shrink-0 text-neutral-400 font-semibold text-[11px] tracking-tight pt-0.5">
                                  具体泊位
                                </span>
                                <div className="flex-1 min-w-0 text-[11.5px] text-neutral-800 leading-snug font-medium">
                                  {item.truck.parkingSpotDetail || '沿街指定绿色市政临时外摆泊位 (支持外摆及就近取餐)'}
                                </div>
                              </div>

                              <div className="px-3.5 py-2.5 flex items-start gap-3 hover:bg-neutral-50/50 transition-colors">
                                <span className="w-16 sm:w-20 shrink-0 text-neutral-400 font-semibold text-[11px] tracking-tight pt-0.5">
                                  营业时段
                                </span>
                                <div className="flex-1 min-w-0 text-[11.5px] text-neutral-800 leading-snug font-medium flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>{item.truck.businessHours || '10:00 - 22:30 (全天候轮值)'}</span>
                                </div>
                              </div>

                              <div className="px-3.5 py-2.5 flex items-start gap-3 hover:bg-neutral-50/50 transition-colors">
                                <span className="w-16 sm:w-20 shrink-0 text-neutral-400 font-semibold text-[11px] tracking-tight pt-0.5">
                                  配送履约
                                </span>
                                <div className="flex-1 min-w-0 text-[11.5px] text-neutral-800 leading-snug font-medium">
                                  半径 <span className="font-bold text-neutral-900">{item.truck.deliveryRadiusKm}km</span> 极速专送 · 达到 <span className="font-bold text-neutral-900">¥{item.truck.minDeliveryAmount}</span> 起送门槛免配送费 (基础运费 ¥{item.truck.baseDeliveryFee ?? 3})
                                </div>
                              </div>

                              <div className="px-3.5 py-2.5 flex items-start gap-3 hover:bg-neutral-50/50 transition-colors">
                                <span className="w-16 sm:w-20 shrink-0 text-neutral-400 font-semibold text-[11px] tracking-tight pt-0.5">
                                  交付保障
                                </span>
                                <div className="flex-1 min-w-0 text-[11.5px] text-neutral-800 leading-snug font-medium">
                                  配备专用车载 <span className="font-bold text-emerald-800">{item.truck.hardwareStatus?.holdingCabinetTemp ?? 70}℃ 恒温箱</span>，支持无接触交接与站点直接提货
                                </div>
                              </div>

                              {item.truck.stationNotice && (
                                <div className="px-3.5 py-2.5 flex items-start gap-3 hover:bg-neutral-50/50 transition-colors bg-neutral-50/40">
                                  <span className="w-16 sm:w-20 shrink-0 text-amber-600 font-semibold text-[11px] tracking-tight pt-0.5">
                                    驻点须知
                                  </span>
                                  <div className="flex-1 min-w-0 text-[11px] text-neutral-700 leading-relaxed font-medium">
                                    {item.truck.stationNotice}
                                  </div>
                                </div>
                              )}

                              <div className="px-3.5 py-2 bg-neutral-50/60 flex items-center justify-between text-[10px] text-neutral-500 font-medium">
                                <span className="flex items-center gap-1.5 text-emerald-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>市政备案绿色临时泊位 · 合规出摊</span>
                                </span>
                                <span>实时准点履约保障</span>
                              </div>
                            </div>
                          )}

                          {/* 细则分项内容 B：专属福利与真实优惠券同步 */}
                          {activeTab === 'welfare' && (
                            <div className="bg-white rounded-xl border border-neutral-200/90 p-3 space-y-2.5 shadow-2xs">
                              {/* 实时匹配当前餐车可用的专属优惠券列表 */}
                              {(() => {
                                const applicableCoupons = merchantCoupons.filter(
                                  (c) =>
                                    c.status === 'active' &&
                                    (c.scopeType === 'all_trucks' ||
                                      c.applicableTruckIds?.includes(item.truck.id) ||
                                      c.applicableTruckNames?.includes(item.truck.name))
                                );

                                return applicableCoupons.length > 0 ? (
                                  <div className="space-y-2">
                                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                      当前餐车专属福利卡券 ({applicableCoupons.length} 张可用)
                                    </div>
                                    {applicableCoupons.map((coupon) => {
                                      const isClaimed = userCoupons.some(
                                        (uc) => uc.couponId === coupon.id || uc.code === coupon.code
                                      );

                                      return (
                                        <div
                                          key={coupon.id}
                                          className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200/90 flex items-center justify-between gap-2.5 transition-all"
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-9 h-9 rounded-lg bg-rose-600 text-white font-bold text-xs flex flex-col items-center justify-center shrink-0 shadow-2xs leading-none">
                                              <span>¥{coupon.discountValue}</span>
                                              <span className="text-[8px] font-normal opacity-80 mt-0.5">立减</span>
                                            </div>
                                            <div className="min-w-0">
                                              <div className="text-[11.5px] font-bold text-rose-900 truncate flex items-center gap-1.5">
                                                <span>{coupon.title}</span>
                                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-semibold border border-rose-200/80 shrink-0">
                                                  {coupon.badgeText || (coupon.minSpend > 0 ? `满¥${coupon.minSpend}可用` : '无门槛')}
                                                </span>
                                              </div>
                                              <div className="text-[10px] text-rose-700/80 truncate mt-0.5">
                                                {coupon.subtitle || `有效期至 ${coupon.expireDate || '本周日 24:00'}`}
                                              </div>
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) =>
                                              isClaimed
                                                ? handleOrderFromTruck(item.truck, e)
                                                : handleClaimCoupon(coupon, item.truck, e)
                                            }
                                            className={`h-8 px-3 rounded-lg text-[11px] font-bold active:scale-95 transition-all cursor-pointer shrink-0 flex items-center justify-center shadow-2xs whitespace-nowrap ${
                                              isClaimed
                                                ? 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-100'
                                                : 'bg-rose-600 text-white hover:bg-rose-700'
                                            }`}
                                          >
                                            {isClaimed ? '已领·去使用' : '极速领券'}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="p-2.5 rounded-lg bg-neutral-50 text-[11px] text-neutral-500 text-center">
                                    当前餐车暂无限定通用券，进群可享主厨每日限定立减！
                                  </div>
                                );
                              })()}

                              {/* 老饕粉丝群 / 车友社群进群福利 */}
                              <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/90 flex items-center justify-between gap-2.5">
                                <div className="text-[11.5px] text-amber-900 font-medium flex items-center gap-2 min-w-0">
                                  <Users className="w-4 h-4 text-amber-700 shrink-0" />
                                  <span className="truncate">
                                    {isTruckCommunityMember(item.truck.id)
                                      ? '已入老饕粉丝群 · 站台主厨王师傅在线'
                                      : '入老饕粉丝群 · 享每日限量和牛包抢购'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleItemAction(item, e)}
                                  className="h-8 px-3.5 rounded-lg text-[11px] font-bold bg-amber-700 text-white hover:bg-amber-800 active:scale-95 transition-all cursor-pointer shrink-0 flex items-center justify-center shadow-2xs whitespace-nowrap"
                                >
                                  {isTruckCommunityMember(item.truck.id) ? '进入群聊 →' : '入群享福利 →'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 细则分项内容 C：主厨通告 (支持商家端实时修改和热更新) */}
                          {activeTab === 'announcement' && (
                            <div className="bg-white rounded-xl border border-neutral-200/90 p-3.5 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                  <span className="text-[11px] font-bold text-neutral-900">
                                    {item.truck.name} · 主厨实时通告
                                  </span>
                                </div>
                                <span className="text-[10px] text-neutral-400">
                                  刚刚更新 · 站台广播
                                </span>
                              </div>

                              <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-100 text-[11.5px] text-neutral-800 leading-relaxed font-medium">
                                {item.truck.chefAnnouncement || item.detailedAnnouncement || item.summary}
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-neutral-100/90 text-[10.5px] text-neutral-500 font-medium">
                                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>站台主厨当日实名认证签发</span>
                                </span>
                                <span className="text-[10px] text-neutral-400">全网实时广播同步</span>
                              </div>
                            </div>
                          )}

                          {/* 细则分项内容 D：硬件工况与监控 (对接后台真实硬件遥测数据) */}
                          {activeTab === 'telemetry' && (
                            <div className="bg-white rounded-xl border border-neutral-200/90 divide-y divide-neutral-100/90 overflow-hidden shadow-2xs">
                              <div className="px-3.5 py-2.5 flex items-center justify-between text-[11.5px]">
                                <span className="text-neutral-500 font-medium">车辆协同牌照</span>
                                <span className="font-semibold text-neutral-900">{item.truck.code || '沪A·TRK01'}</span>
                              </div>
                              <div className="px-3.5 py-2.5 flex items-center justify-between text-[11.5px]">
                                <span className="text-neutral-500 font-medium">车载恒温舱温控</span>
                                <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  {item.truck.hardwareStatus?.holdingCabinetTemp ?? 70}℃ 恒温巡航中 (正常)
                                </span>
                              </div>
                              <div className="px-3.5 py-2.5 flex items-center justify-between text-[11.5px]">
                                <span className="text-neutral-500 font-medium">4℃ 恒温冷藏保鲜舱</span>
                                <span className="font-semibold text-cyan-700 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                  {item.truck.hardwareStatus?.coldStorageTemp ?? 4}℃ 持续保鲜
                                </span>
                              </div>
                              <div className="px-3.5 py-2.5 flex items-center justify-between text-[11.5px]">
                                <span className="text-neutral-500 font-medium">车载动力电池余量</span>
                                <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  {item.truck.hardwareStatus?.batteryLevel ?? 92}% (供电平稳)
                                </span>
                              </div>
                              <div className="px-3.5 py-2.5 flex items-center justify-between text-[11.5px]">
                                <span className="text-neutral-500 font-medium">GPS 卫星锁定状态</span>
                                <span className="font-semibold text-neutral-800">
                                  {item.truck.hardwareStatus?.gpsSatellites ?? 12} 颗 (RTK 厘米级定位)
                                </span>
                              </div>
                              <div className="px-3.5 py-2.5 flex items-center justify-between text-[11.5px]">
                                <span className="text-neutral-500 font-medium">当前后厨排队单量</span>
                                <span className="font-semibold text-neutral-900">
                                  {item.truck.hardwareStatus?.queueOrders ?? 0} 笔排队中
                                </span>
                              </div>
                              <div className="px-3.5 py-2.5 flex items-center justify-between text-[11.5px]">
                                <span className="text-neutral-500 font-medium">车体食品安全检测</span>
                                <span className="font-semibold text-emerald-700">
                                  {item.truck.hardwareStatus?.sanitationLevel ?? 'A级'} · 已消毒 · 今日已封签
                                </span>
                              </div>
                              <div className="px-3.5 py-2 bg-neutral-50/60 flex items-center justify-between text-[10px] text-neutral-500 font-medium">
                                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>车载 IoT 传感器与温控遥测中枢已接入</span>
                                </span>
                                <span>数据 3 秒/次 微秒级自动更新</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </OrganicCardReveal>
              );
            })
          )}
        </main>

        {/* 底部系统状态说明 */}
        <footer className="p-4 bg-[#f4f4f2] border-t border-neutral-200 flex flex-col items-center justify-center gap-1 text-center">
          <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">
            URBAN RADAR FLEET FORM DISPATCH
          </span>
          <span className="text-[9.5px] text-neutral-400">
            全部流动餐车站台均支持高精 GPS 定位、实时温控监控与即时点单
          </span>
        </footer>
      </div>

      {/* 弹窗 A: 定位基准 / 商圈快速选择弹窗 */}
      <AddressSelectorModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        currentAddress={userLocation.locationName || '西藏北路 166 号 · 大悦城'}
        onSelectAddress={handleSelectAddress}
      />

      {/* 弹窗 B: 社群邀请互动弹窗 */}
      <AnimatePresence>
        {isCommunityModalOpen && selectedTruckForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-neutral-200 rounded-lg max-w-sm w-full p-5 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setIsCommunityModalOpen(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex items-center justify-center border border-neutral-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded border border-neutral-200 overflow-hidden">
                  <img alt={selectedTruckForModal.name} className="w-full h-full object-cover" src={skewersImg} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{selectedTruckForModal.name}</h3>
                  <p className="text-[11px] text-neutral-500">{selectedTruckForModal.locationName}</p>
                </div>
              </div>

              <div className="bg-neutral-50 rounded p-3 border border-neutral-200 space-y-2 mb-4 text-xs">
                <div className="flex justify-between items-center text-neutral-500">
                  <span>社群成员总数</span>
                  <span className="font-bold text-neutral-900">482 / 500 人</span>
                </div>
                <div className="flex justify-between items-center text-neutral-500">
                  <span>入群特权</span>
                  <span className="text-amber-700 font-medium">每日 11:30 抢限量和牛鲜包券</span>
                </div>
                <div className="flex justify-between items-center text-neutral-500">
                  <span>主厨驻点</span>
                  <span className="text-neutral-900 font-medium">{selectedTruckForModal.locationName}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-500">
                  <span>车牌协同</span>
                  <span className="text-neutral-900 font-medium">{selectedTruckForModal.code || '沪A·TRK01'}</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center py-3 bg-white rounded border border-dashed border-neutral-300 mb-4">
                <QrCode className="w-28 h-28 text-neutral-900" />
                <span className="text-[10px] text-neutral-400 mt-1">
                  扫码或点击下方按钮直接加入老饕粉丝群
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCommunityModalOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer transition-all"
                >
                  暂不加入
                </button>
                <button
                  type="button"
                  onClick={handleJoinGroup}
                  className="flex-1 py-2 rounded-lg bg-white border border-neutral-300 hover:border-neutral-900 text-neutral-900 text-xs font-bold hover:bg-neutral-50 shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>确认加入并进入群聊</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 弹窗 C: 订单履约妥投评价弹窗 */}
      <AnimatePresence>
        {isRatingModalOpen && selectedTruckForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-neutral-200 rounded-lg max-w-sm w-full p-5 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setIsRatingModalOpen(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex items-center justify-center border border-neutral-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded bg-purple-50 flex items-center justify-center text-purple-700 font-bold text-sm border border-purple-200">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{selectedTruckForModal.name}</h3>
                  <p className="text-[10px] text-neutral-500">
                    {selectedTruckForModal.locationName} · 满意度履约评价
                  </p>
                </div>
              </div>

              {/* Star Rating */}
              <div className="flex items-center justify-center gap-2 py-3 bg-neutral-50 rounded border border-neutral-200 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRatingStars(s)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        s <= ratingStars
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-neutral-300 fill-transparent'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Tag Chips */}
              <div className="space-y-1.5 mb-3">
                <div className="text-[11px] text-neutral-500">评价标签：</div>
                <div className="flex flex-wrap gap-1.5">
                  {['包装私密严实', '配送极速', '骑手礼貌', '保温完好', '无接触妥投'].map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags((t) => t.filter((item) => item !== tag));
                          } else {
                            setSelectedTags((t) => [...t, tag]);
                          }
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold'
                            : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:text-neutral-900'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feedback Input */}
              <textarea
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                placeholder="说说这次服务的体验（选填，帮助我们提升专送品质）..."
                rows={3}
                className="w-full bg-neutral-50 border border-neutral-200 rounded p-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:bg-white focus:border-neutral-900 mb-4"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRatingModalOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer transition-all"
                >
                  稍后再评
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRating}
                  className="flex-1 py-2 rounded-lg bg-white border border-neutral-300 hover:border-neutral-900 text-neutral-900 text-xs font-bold hover:bg-neutral-50 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  提交评价
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DynamicFeedsPageView;
