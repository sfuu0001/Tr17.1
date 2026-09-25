import React, { useState, useMemo } from 'react';
import {
  Ticket,
  Plus,
  Search,
  Filter,
  Check,
  Edit,
  Trash2,
  Copy,
  Send,
  Eye,
  Sparkles,
  Calendar,
  Clock,
  Layers,
  Image,
  Code,
  DollarSign,
  Percent,
  Truck,
  Flame,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  FileCode,
  Users,
  Award,
  Zap,
  QrCode,
  Share2,
  Gift,
  Scan,
  Radio,
  ExternalLink,
  Lock,
  Globe,
  Sliders
} from 'lucide-react';
import {
  CouponItem,
  CouponType,
  CouponScopeType,
  CouponDayRestriction,
  CouponDesignStyle,
  UserCouponRecord,
  CouponTruckScopeType
} from '../../types/coupon';
import { INITIAL_MERCHANT_COUPONS, INITIAL_USER_COUPONS } from '../../data/mockCoupons';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { DateRangeFilter } from '../common/DateRangeFilter';
import {
  DateFilterState,
  resolveDateRange,
  isDayStringWithinRange
} from '../../utils/dateFilter';
import {
  usePermissionGate,
  executeSensitiveAction
} from '../../utils/sensitiveAction';
import { copyTextToClipboard } from '../../utils/clipboard';
import { globalVersionEngine } from '../../utils/versionPointerEngine';
import { generateQrCodeSvg, buildCouponClaimQrUrl } from '../../utils/qrCodeEngine';
import { claimCouponByCode } from '../../utils/couponEngine';
import { playScannerBeep } from '../../utils/barcodeScannerEngine';
import { QrAndScannerDiagnosticView } from './QrAndScannerDiagnosticView';
import { DishItem, TableItem } from '../../types';
import { softDeleteToRecycleBin } from '../../utils/recycleBinEngine';

export const AVAILABLE_TRUCK_OPTIONS = [
  { id: 'truck-01', name: '01号·大悦城旗舰先锋车', shortName: '01号车 (静安/大悦城)' },
  { id: 'truck-02', name: '02号·科技园金融智选车', shortName: '02号车 (张江/科技园)' },
  { id: 'truck-03', name: '03号·滨江潮玩艺术车', shortName: '03号车 (徐汇/滨江)' },
  { id: 'truck-04', name: '04号·徐汇滨江漫游车', shortName: '04号车 (前滩/枢纽)' }
];

interface MerchantCouponsViewProps {
  showToast: (msg: string) => void;
  dishes?: DishItem[];
  tables?: TableItem[];
}

export const MerchantCouponsView: React.FC<MerchantCouponsViewProps> = ({
  showToast,
  dishes = [],
  tables = []
}) => {
  // Coupons List
  const [coupons, setCoupons] = useState<CouponItem[]>(() => {
    return safeGetStorage<CouponItem[]>('obsidian_merchant_coupons', INITIAL_MERCHANT_COUPONS);
  });

  // Listen to external data restoration from Version Tracking Engine
  React.useEffect(() => {
    const handleDataRestored = (e: Event) => {
      const customEvt = e as CustomEvent<{ module: string }>;
      if (!customEvt.detail || customEvt.detail.module === 'coupons') {
        const fresh = safeGetStorage<CouponItem[]>('obsidian_merchant_coupons', INITIAL_MERCHANT_COUPONS);
        setCoupons(fresh);
      }
    };
    window.addEventListener('obsidian_data_restored', handleDataRestored);
    return () => window.removeEventListener('obsidian_data_restored', handleDataRestored);
  }, []);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTruckScope, setFilterTruckScope] = useState<string>('all');
  // 时间区间筛选（按券创建日期 createdAt 归日判定；统计卡与列表统一生效）
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const dateRange = useMemo(() => resolveDateRange(dateFilter), [dateFilter]);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [couponType, setCouponType] = useState<CouponType>('amount_cut');
  const [discountValue, setDiscountValue] = useState('10');
  const [minSpend, setMinSpend] = useState('50');
  const [maxDiscountCap, setMaxDiscountCap] = useState('20');

  // Multi-truck isolation & universal scope state
  const [truckScopeType, setTruckScopeType] = useState<CouponTruckScopeType>('all_trucks');
  const [applicableTruckIds, setApplicableTruckIds] = useState<string[]>(['truck-01', 'truck-02', 'truck-03', 'truck-04']);
  const [truckIsolationStrict, setTruckIsolationStrict] = useState<boolean>(false);
  const [antiBrushEnabled, setAntiBrushEnabled] = useState<boolean>(true);
  const [maxUniversalBurnLimit, setMaxUniversalBurnLimit] = useState<string>('500');
  const [perUserLimit, setPerUserLimit] = useState<string>('3');

  // Diagnostic modal open
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [shareQrSvg, setShareQrSvg] = useState<string>('');
  const [shareQrUrl, setShareQrUrl] = useState<string>('');

  // Stacking & Exclusivity fields
  const [allowStackWithActivity, setAllowStackWithActivity] = useState<boolean>(true);
  const [allowStackWithVIP, setAllowStackWithVIP] = useState<boolean>(true);
  const [isExclusive, setIsExclusive] = useState<boolean>(false);

  // Scope
  const [scopeType, setScopeType] = useState<CouponScopeType>('all_dishes');
  const [selectedCategories, setSelectedCategories] = useState<('mains' | 'drinks' | 'desserts' | 'snacks')[]>(['mains']);

  // Time and Day
  const [timeSlotType, setTimeSlotType] = useState<'all_day' | 'lunch_only' | 'dinner_night' | 'custom'>('all_day');
  const [customTimeStart, setCustomTimeStart] = useState('11:00');
  const [customTimeEnd, setCustomTimeEnd] = useState('14:00');
  const [dayRestriction, setDayRestriction] = useState<CouponDayRestriction>('all_week');

  // Design and Custom Code / Image
  const [designStyle, setDesignStyle] = useState<CouponDesignStyle>('black_gold');
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [customHtmlCode, setCustomHtmlCode] = useState('');
  const [themeColor, setThemeColor] = useState('#d4af37');

  // Inventory and Expiry
  const [totalQuantity, setTotalQuantity] = useState('1000');
  const [expireDate, setExpireDate] = useState('2026-09-30');
  const [status, setStatus] = useState<'active' | 'paused' | 'ended'>('active');

  // Targeted Batch Dispatch Modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchCoupon, setDispatchCoupon] = useState<CouponItem | null>(null);
  const [dispatchTarget, setDispatchTarget] = useState<'all' | 'new_customers' | 'vip' | 'dormant'>('all');
  const [dispatchQuantityPerUser, setDispatchQuantityPerUser] = useState<number>(1);
  const [dispatchCustomMsg, setDispatchCustomMsg] = useState('黑曜石流动餐车主厨为您送上专属赏味礼券！');

  // Marketing Automation Campaign Switches
  const [autoNewUserCoupon, setAutoNewUserCoupon] = useState<boolean>(() =>
    safeGetStorage<boolean>('obsidian_marketing_auto_new_user_coupon', true)
  );
  const [autoFissionShareCoupon, setAutoFissionShareCoupon] = useState<boolean>(() =>
    safeGetStorage<boolean>('obsidian_marketing_fission_share_coupon', true)
  );

  // QR Code share preview
  const [shareQrModalOpen, setShareQrModalOpen] = useState(false);
  const [shareQrCoupon, setShareQrCoupon] = useState<CouponItem | null>(null);

  const saveCoupons = (newList: CouponItem[]) => {
    setCoupons(newList);
    safeSetStorage('obsidian_merchant_coupons', newList);
  };

  // Stats calculation（按时间区间过滤后的券集合聚合）
  const rangedCoupons = useMemo(
    () => coupons.filter((c) => isDayStringWithinRange(c.createdAt || '', dateRange)),
    [coupons, dateRange]
  );

  const stats = useMemo(() => {
    const totalIssued = rangedCoupons.reduce((sum, c) => sum + c.issuedCount, 0);
    const totalUsed = rangedCoupons.reduce((sum, c) => sum + c.usedCount, 0);
    const activeCount = rangedCoupons.filter((c) => c.status === 'active').length;
    const redemptionRate = totalIssued > 0 ? ((totalUsed / totalIssued) * 100).toFixed(1) : '0.0';
    const estimatedGmv = (totalUsed * 48.5).toFixed(0);

    return { totalIssued, totalUsed, activeCount, redemptionRate, estimatedGmv };
  }, [rangedCoupons]);

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    return rangedCoupons.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchCode = c.code.toLowerCase().includes(q);
        if (!matchTitle && !matchCode) return false;
      }
      if (filterType !== 'all' && c.couponType !== filterType) return false;
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterTruckScope !== 'all') {
        const scope = c.truckScopeType || 'all_trucks';
        if (scope !== filterTruckScope) return false;
      }
      return true;
    });
  }, [rangedCoupons, searchQuery, filterType, filterStatus, filterTruckScope]);

  // Open Share Poster Modal with vector QR SVG
  const openSharePoster = async (c: CouponItem) => {
    setShareQrCoupon(c);
    const primaryTruck = c.applicableTruckIds && c.applicableTruckIds.length > 0 ? c.applicableTruckIds[0] : 'truck-01';
    const url = buildCouponClaimQrUrl(c.code, primaryTruck);
    setShareQrUrl(url);
    try {
      const svg = await generateQrCodeSvg(url, { width: 160, margin: 1 });
      setShareQrSvg(svg);
    } catch (err) {
      console.error(err);
    }
    setShareQrModalOpen(true);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setTitle('');
    setCode(`UR-${Math.floor(1000 + Math.random() * 9000)}`);
    setSubtitle('黑曜石流动餐车现烤餐品通用');
    setBadgeText('超值特惠');
    setCouponType('amount_cut');
    setDiscountValue('10');
    setMinSpend('50');
    setMaxDiscountCap('20');
    setAllowStackWithActivity(true);
    setAllowStackWithVIP(true);
    setIsExclusive(false);
    setScopeType('all_dishes');
    setSelectedCategories(['mains']);
    setTimeSlotType('all_day');
    setCustomTimeStart('11:00');
    setCustomTimeEnd('14:00');
    setDayRestriction('all_week');
    setDesignStyle('black_gold');
    setBgImageUrl('');
    setCustomHtmlCode('');
    setThemeColor('#d4af37');
    setTotalQuantity('1000');
    setExpireDate('2026-09-30');
    setStatus('active');
    // Multi-truck isolation & risk defaults
    setTruckScopeType('all_trucks');
    setApplicableTruckIds(['truck-01', 'truck-02', 'truck-03', 'truck-04']);
    setTruckIsolationStrict(false);
    setAntiBrushEnabled(true);
    setMaxUniversalBurnLimit('500');
    setPerUserLimit('3');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (c: CouponItem) => {
    setEditingCoupon(c);
    setTitle(c.title);
    setCode(c.code);
    setSubtitle(c.subtitle || '');
    setBadgeText(c.badgeText || '');
    setCouponType(c.couponType);
    setDiscountValue(c.couponType === 'discount_percent' ? (c.discountValue * 10).toString() : c.discountValue.toString());
    setMinSpend(c.minSpend.toString());
    setMaxDiscountCap(c.maxDiscountCap ? c.maxDiscountCap.toString() : '20');
    setAllowStackWithActivity(c.allowStackWithActivity !== false);
    setAllowStackWithVIP(c.allowStackWithVIP !== false);
    setIsExclusive(c.isExclusive === true);
    setScopeType(c.scopeType);
    setSelectedCategories(c.scopeCategories || ['mains']);
    setTimeSlotType(c.timeSlotType);
    setCustomTimeStart(c.customTimeStart || '11:00');
    setCustomTimeEnd(c.customTimeEnd || '14:00');
    setDayRestriction(c.dayRestriction);
    setDesignStyle(c.designStyle);
    setBgImageUrl(c.bgImageUrl || '');
    setCustomHtmlCode(c.customHtmlCode || '');
    setThemeColor(c.themeColor || '#d4af37');
    setTotalQuantity(c.totalQuantity.toString());
    setExpireDate(c.expireDate);
    setStatus(c.status);
    // Multi-truck isolation & risk fields
    setTruckScopeType(c.truckScopeType || 'all_trucks');
    setApplicableTruckIds(
      c.applicableTruckIds && c.applicableTruckIds.length > 0
        ? c.applicableTruckIds
        : ['truck-01', 'truck-02', 'truck-03', 'truck-04']
    );
    setTruckIsolationStrict(c.truckIsolationStrict ?? false);
    setAntiBrushEnabled(c.antiBrushEnabled ?? true);
    setMaxUniversalBurnLimit(c.maxUniversalBurnLimit ? c.maxUniversalBurnLimit.toString() : '500');
    setPerUserLimit(c.perUserLimit ? c.perUserLimit.toString() : '3');
    setIsModalOpen(true);
  };

  // Toggle status
  const handleToggleStatus = (id: string) => {
    const target = coupons.find((c) => c.id === id);
    const updated = coupons.map((c) => {
      if (c.id === id) {
        const nextStatus = c.status === 'active' ? 'paused' : 'active';
        return { ...c, status: nextStatus as 'active' | 'paused' };
      }
      return c;
    });
    if (target) {
      const nextStatus = target.status === 'active' ? 'paused' : 'active';
      globalVersionEngine.recordDataMutation({
        module: 'coupons',
        entityId: id,
        entityName: target.title,
        actionType: 'update',
        beforeData: target,
        afterData: { ...target, status: nextStatus },
        customSummary: `优惠券【${target.title}】状态切换为：${nextStatus === 'active' ? '上线发放中' : '暂停发放'}`
      });
    }
    saveCoupons(updated);
    showToast('优惠券发放状态已更新！');
  };

  // Delete coupon
  const handleDeleteCoupon = (id: string) => {
    const target = coupons.find((c) => c.id === id);
    const updated = coupons.filter((c) => c.id !== id);
    if (target) {
      globalVersionEngine.recordDataMutation({
        module: 'coupons',
        entityId: id,
        entityName: target.title,
        actionType: 'delete',
        beforeData: target,
        afterData: null,
        customSummary: `删除/下架优惠券【${target.title}】`
      });
      // 统一回收站：软删除入站（30 天保留，可恢复）
      softDeleteToRecycleBin({
        type: 'coupon',
        typeLabel: '优惠券',
        refId: id,
        label: target.title,
        snapshot: target,
        storageKey: 'obsidian_merchant_coupons',
        container: 'array',
        idField: 'id'
      });
    }
    saveCoupons(updated);
    showToast('优惠券已成功下架删除！');
  };

  // ===== 数据治理：发行/核销计数校准（店长专属，留痕审计） =====
  const dataGate = usePermissionGate('marketing:data_correct');
  const [calibratingCoupon, setCalibratingCoupon] = useState<CouponItem | null>(null);
  const [calIssued, setCalIssued] = useState<string>('0');
  const [calUsed, setCalUsed] = useState<string>('0');
  const [calNote, setCalNote] = useState<string>('');

  const handleOpenCalibrate = (c: CouponItem) => {
    setCalibratingCoupon(c);
    setCalIssued(String(c.issuedCount));
    setCalUsed(String(c.usedCount));
    setCalNote('');
  };

  const handleConfirmCalibrate = () => {
    if (!calibratingCoupon) return;
    const newIssued = parseInt(calIssued, 10);
    const newUsed = parseInt(calUsed, 10);
    if (Number.isNaN(newIssued) || Number.isNaN(newUsed) || newIssued < 0 || newUsed < 0 || newUsed > newIssued) {
      showToast('校准失败：请输入非负整数，且核销数不可大于发行数');
      return;
    }
    const res = executeSensitiveAction('marketing:data_correct', {
      module: 'marketing',
      actionLabel: '优惠券计数校准',
      entityName: `【${calibratingCoupon.title}】(${calibratingCoupon.code})`,
      detail: `发行 ${calibratingCoupon.issuedCount}→${newIssued}，核销 ${calibratingCoupon.usedCount}→${newUsed}${calNote ? `；原因：${calNote}` : ''}`
    }, () => {
      const updated = coupons.map((c) =>
        c.id === calibratingCoupon.id
          ? { ...c, issuedCount: newIssued, usedCount: newUsed }
          : c
      );
      saveCoupons(updated);
      return true;
    });
    showToast(res.message);
    if (res.ok) setCalibratingCoupon(null);
  };

  // Open targeted dispatch modal
  const handleOpenDispatchModal = (c: CouponItem) => {
    setDispatchCoupon(c);
    setDispatchTarget('all');
    setDispatchQuantityPerUser(1);
    setDispatchCustomMsg(`黑曜石餐车送您【${c.title}】，快去选购心仪现烤炙品吧！`);
    setDispatchModalOpen(true);
  };

  // Confirm targeted batch dispatch
  const handleExecuteDispatch = () => {
    if (!dispatchCoupon) return;

    let userList = safeGetStorage<UserCouponRecord[]>('obsidian_user_coupons', INITIAL_USER_COUPONS);

    const targetLabelMap = {
      all: '全部会员客户 (共 1,280 人)',
      new_customers: '近7天新注册进店客 (共 142 人)',
      vip: '黑金 VIP 尊享会员 (共 68 人)',
      dormant: '超30天未消费沉睡客户 (共 215 人)'
    };

    const countMap = {
      all: 1280,
      new_customers: 142,
      vip: 68,
      dormant: 215
    };

    const targetCount = countMap[dispatchTarget];

    // Create user coupon records
    const newRecords: UserCouponRecord[] = [];
    for (let i = 0; i < dispatchQuantityPerUser; i++) {
      newRecords.push({
        userCouponId: `uc-dispatch-${Date.now()}-${i}`,
        couponId: dispatchCoupon.id,
        coupon: {
          ...dispatchCoupon,
          dispatchMessage: dispatchCustomMsg
        },
        status: 'available',
        acquiredAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      });
    }

    userList = [...newRecords, ...userList];
    safeSetStorage('obsidian_user_coupons', userList);

    // Update merchant issued count
    const updatedCoupons = coupons.map((c) =>
      c.id === dispatchCoupon.id
        ? { ...c, issuedCount: c.issuedCount + targetCount * dispatchQuantityPerUser }
        : c
    );
    saveCoupons(updatedCoupons);

    setDispatchModalOpen(false);
    showToast(`🚀 批量营销派发成功！已向【${targetLabelMap[dispatchTarget]}】派送【${dispatchCoupon.title}】共 ${targetCount * dispatchQuantityPerUser} 张！`);
  };

  // Save Modal Form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) {
      showToast('请填写优惠券标题和券码');
      return;
    }

    const numVal = parseFloat(discountValue) || 0;
    const finalVal = couponType === 'discount_percent' ? numVal / 10 : numVal;
    const numMinSpend = parseFloat(minSpend) || 0;
    const numMaxCap = parseFloat(maxDiscountCap) || 20;
    const numTotalQty = parseInt(totalQuantity, 10) || 0;

    const catNameMap: Record<string, string> = {
      mains: '炙烤主餐',
      drinks: '精酿饮品',
      desserts: '时令甜品',
      snacks: '特色小吃'
    };
    const scopeCategoryNames = selectedCategories.map((cat) => catNameMap[cat] || cat);

    let timeSlotLabel = '全天全时段通用';
    if (timeSlotType === 'lunch_only') timeSlotLabel = '午市专享 11:00 - 14:00';
    else if (timeSlotType === 'dinner_night') timeSlotLabel = '晚市夜宵 17:00 - 23:00';
    else if (timeSlotType === 'custom') timeSlotLabel = `限时 ${customTimeStart} - ${customTimeEnd}`;

    let dayRestrictionLabel = '全周通用 (周一至周日)';
    if (dayRestriction === 'workdays_only') dayRestrictionLabel = '仅限工作日 (周一至周五)';
    else if (dayRestriction === 'weekends_only') dayRestrictionLabel = '仅限周末 (周六/周日)';

    const newCoupon: CouponItem = {
      id: editingCoupon ? editingCoupon.id : `cpn-${Date.now()}`,
      code: code.trim().toUpperCase(),
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      couponType,
      discountValue: finalVal,
      minSpend: numMinSpend,
      maxDiscountCap: couponType === 'discount_percent' ? numMaxCap : undefined,
      allowStackWithActivity,
      allowStackWithVIP,
      isExclusive,
      scopeType,
      scopeCategories: scopeType === 'category' ? selectedCategories : undefined,
      scopeCategoryNames: scopeType === 'category' ? scopeCategoryNames : undefined,
      timeSlotType,
      customTimeStart: timeSlotType === 'custom' ? customTimeStart : undefined,
      customTimeEnd: timeSlotType === 'custom' ? customTimeEnd : undefined,
      timeSlotLabel,
      dayRestriction,
      dayRestrictionLabel,
      designStyle,
      bgImageUrl: bgImageUrl.trim() || undefined,
      badgeText: badgeText.trim() || undefined,
      themeColor,
      customHtmlCode: customHtmlCode.trim() || undefined,
      totalQuantity: numTotalQty,
      issuedCount: editingCoupon ? editingCoupon.issuedCount : 0,
      usedCount: editingCoupon ? editingCoupon.usedCount : 0,
      status,
      expireDate,
      createdAt: editingCoupon ? editingCoupon.createdAt : new Date().toISOString().substring(0, 10),
      // Multi-truck isolation and risk control
      truckScopeType,
      applicableTruckIds:
        truckScopeType === 'specific_trucks'
          ? applicableTruckIds
          : ['truck-01', 'truck-02', 'truck-03', 'truck-04'],
      applicableTruckNames:
        truckScopeType === 'specific_trucks'
          ? applicableTruckIds.map(
              (id) => AVAILABLE_TRUCK_OPTIONS.find((t) => t.id === id)?.name || id
            )
          : ['全车队通用 (01/02/03/04号车)'],
      truckIsolationStrict: truckScopeType === 'specific_trucks' ? truckIsolationStrict : false,
      antiBrushEnabled,
      maxUniversalBurnLimit:
        truckScopeType === 'all_trucks' ? parseFloat(maxUniversalBurnLimit) || 500 : undefined,
      perUserLimit: parseInt(perUserLimit, 10) || 3
    };

    let updated: CouponItem[];
    if (editingCoupon) {
      updated = coupons.map((c) => (c.id === editingCoupon.id ? newCoupon : c));
      globalVersionEngine.recordDataMutation({
        module: 'coupons',
        entityId: newCoupon.id,
        entityName: newCoupon.title,
        actionType: 'update',
        beforeData: editingCoupon,
        afterData: newCoupon,
        customSummary: `修改优惠券配置【${newCoupon.title}】(${newCoupon.code})`
      });
      showToast(`优惠券【${newCoupon.title}】修改已保存并生效！`);
    } else {
      updated = [newCoupon, ...coupons];
      globalVersionEngine.recordDataMutation({
        module: 'coupons',
        entityId: newCoupon.id,
        entityName: newCoupon.title,
        actionType: 'create',
        beforeData: null,
        afterData: newCoupon,
        customSummary: `新增发行优惠券【${newCoupon.title}】(${newCoupon.code})`
      });
      showToast(`🎉 成功创建并上线优惠券【${newCoupon.title}】！`);
    }

    saveCoupons(updated);
    setIsModalOpen(false);
  };

  // Image Upload Helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBgImageUrl(event.target.result as string);
          setDesignStyle('custom_image');
          showToast('封面设计图片已上传成功！');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Fill default template snippet
  const handleInsertHtmlTemplate = () => {
    const template = `<div class="p-3 bg-gradient-to-r from-neutral-900 via-amber-950 to-neutral-950 text-white rounded-xl border border-amber-500/40 flex items-center justify-between shadow-inner">
  <div class="flex items-center gap-2">
    <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">VIP</div>
    <div>
      <div class="text-xs font-black tracking-wider text-amber-300">主厨特选 · 专属特惠</div>
      <div class="text-[10px] text-neutral-300">黑曜石主厨定制专属金质勋章</div>
    </div>
  </div>
  <span class="text-xs font-mono font-bold text-amber-300 bg-black/60 px-2 py-0.5 rounded border border-amber-400/30">官方认证</span>
</div>`;
    setCustomHtmlCode(template);
    setDesignStyle('custom_html');
    showToast('已载入自定义卡券设计 HTML 源码模版');
  };

  return (
    <div className="space-y-3 max-w-6xl mx-auto pb-10 text-xs text-[#0f172a]">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-[3px] border border-[#e6e6e4] p-3.5 sm:p-4 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f1f1ef]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-medium text-xs shrink-0">
              <Ticket className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-medium text-[#0f172a]">
                  优惠券全生命周期运营与营销中枢
                </h3>
                <span className="text-[10px] bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] px-1.5 py-0.2 rounded-[2px] font-mono font-medium">
                  {stats.activeCount} 款发放中
                </span>
              </div>
              <p className="text-[11px] text-[#787774] mt-0.5">
                支持优惠叠加/互斥控制、新老客定向派发、全场/分类时段限制及跨餐车核销隔离风控。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setIsDiagnosticModalOpen(true)}
              className="px-2.5 py-1.5 bg-[#fbfbfa] hover:bg-[#f1f1ef] text-[#0f172a] rounded-[2px] font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-[#e6e6e4] active:scale-[0.99]"
              title="一键检测二维码跳转、桌号、绑定、优惠、扫码枪全链路完整性"
            >
              <Scan className="w-3.5 h-3.5 text-blue-600" />
              <span>二维码与扫码枪检测</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-3 py-1.5 bg-[#0f172a] hover:bg-neutral-800 text-white rounded-[2px] font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-[0.99]"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>新建营销优惠券</span>
            </button>
          </div>
        </div>

        {/* 时间区间筛选（统计卡与列表统一按券创建日期过滤） */}
        <div className="pt-2.5 flex items-center justify-between gap-2 flex-wrap">
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} compact />
          <span className="text-[10.5px] text-[#787774]">
            统计口径：{dateRange ? dateRange.label : '全部时间'} · {rangedCoupons.length}/{coupons.length} 张券
          </span>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5">
          <div className="p-2.5 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4]">
            <span className="text-[10.5px] text-[#787774] font-normal block">累计发行与领取</span>
            <span className="text-base font-medium text-[#0f172a] font-mono mt-0.5 block">
              {stats.totalIssued} <span className="text-xs text-[#787774] font-normal">张</span>
            </span>
          </div>

          <div className="p-2.5 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4]">
            <span className="text-[10.5px] text-[#787774] font-normal block">累计核销使用</span>
            <span className="text-base font-medium text-[#16a34a] font-mono mt-0.5 block">
              {stats.totalUsed} <span className="text-xs text-[#787774] font-normal">张</span>
            </span>
          </div>

          <div className="p-2.5 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4]">
            <span className="text-[10.5px] text-[#787774] font-normal block">核销转化率</span>
            <span className="text-base font-medium text-amber-600 font-mono mt-0.5 block">
              {stats.redemptionRate}%
            </span>
          </div>

          <div className="p-2.5 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4]">
            <span className="text-[10.5px] text-[#787774] font-normal block">撬动点餐 GMV 估值</span>
            <span className="text-base font-medium text-[#0f172a] font-mono mt-0.5 block">
              ¥{stats.estimatedGmv}
            </span>
          </div>
        </div>

        {/* Marketing Automation Campaign Triggers */}
        <div className="mt-2.5 pt-2.5 border-t border-[#f1f1ef] grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="p-2 rounded-[2px] bg-[#fbfbfa] border border-[#e6e6e4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-medium text-xs text-[#0f172a] block">新客进店自动送「新人立减券」</span>
                <span className="text-[10.5px] text-[#787774]">首次扫码/注册顾客自动到账无门槛券，提升首单转化</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !autoNewUserCoupon;
                setAutoNewUserCoupon(next);
                safeSetStorage('obsidian_marketing_auto_new_user_coupon', next);
                showToast(next ? '已开启新人进店自动送券！' : '已暂停新人进店自动送券');
              }}
              className={`px-2 py-0.5 rounded-[2px] text-[10.5px] font-medium cursor-pointer transition-colors border ${
                autoNewUserCoupon
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-neutral-100 text-[#787774] border-[#e6e6e4]'
              }`}
            >
              {autoNewUserCoupon ? '✓ 自动派券中' : '已暂停'}
            </button>
          </div>

          <div className="p-2 rounded-[2px] bg-[#fbfbfa] border border-[#e6e6e4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-medium text-xs text-[#0f172a] block">满¥80订单完成自动赠「裂变返券」</span>
                <span className="text-[10.5px] text-[#787774]">支付后引导分享至同事群，拉动老带新复购</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !autoFissionShareCoupon;
                setAutoFissionShareCoupon(next);
                safeSetStorage('obsidian_marketing_fission_share_coupon', next);
                showToast(next ? '已开启满80裂变返券！' : '已暂停裂变返券');
              }}
              className={`px-2 py-0.5 rounded-[2px] text-[10.5px] font-medium cursor-pointer transition-colors border ${
                autoFissionShareCoupon
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-neutral-100 text-[#787774] border-[#e6e6e4]'
              }`}
            >
              {autoFissionShareCoupon ? '✓ 自动裂变中' : '已暂停'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-[3px] border border-[#e6e6e4] p-2.5 shadow-none flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#787774] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索优惠券名称、券码 (如 UR-VIP5)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-[#e6e6e4] hover:border-[#d3d1cb] focus:border-[#0f172a] rounded-[2px] outline-none text-[#0f172a]"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1 bg-white border border-[#e6e6e4] hover:border-[#d3d1cb] rounded-[2px] text-xs font-medium text-[#0f172a] outline-none cursor-pointer"
          >
            <option value="all">全部券类型</option>
            <option value="amount_cut">满额立减券</option>
            <option value="no_threshold">无门槛立减券</option>
            <option value="discount_percent">折扣券 (打折)</option>
            <option value="delivery_free">免配送费券</option>
          </select>

          <select
            value={filterTruckScope}
            onChange={(e) => setFilterTruckScope(e.target.value)}
            className="px-2.5 py-1 bg-white border border-[#e6e6e4] hover:border-[#d3d1cb] rounded-[2px] text-xs font-medium text-[#0f172a] outline-none cursor-pointer"
          >
            <option value="all">全部餐车适用范围</option>
            <option value="all_trucks">🌐 全部餐车通用券</option>
            <option value="specific_trucks">🔒 多餐车专属隔离券</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 bg-white border border-[#e6e6e4] hover:border-[#d3d1cb] rounded-[2px] text-xs font-medium text-[#0f172a] outline-none cursor-pointer"
          >
            <option value="all">全部状态</option>
            <option value="active">发放中 (在售)</option>
            <option value="paused">已暂停</option>
            <option value="ended">已下架</option>
          </select>
        </div>

        <span className="text-[11px] text-[#787774] self-end sm:self-center">
          共找到 <strong className="text-[#0f172a] font-medium font-mono">{filteredCoupons.length}</strong> 张优惠券
        </span>
      </div>

      {/* Coupons Table / Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {filteredCoupons.map((coupon) => {
          return (
            <div
              key={coupon.id}
              className={`bg-white rounded-[3px] border p-3 shadow-none flex flex-col justify-between gap-2.5 transition-colors relative overflow-hidden ${
                coupon.status === 'active'
                  ? 'border-[#e6e6e4] hover:border-[#d3d1cb]'
                  : 'border-[#e6e6e4] opacity-60 bg-[#fbfbfa]'
              }`}
            >
              {/* Top Row: Title, Code, Value */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-13 h-13 rounded-[2px] bg-[#fbfbfa] border border-[#e6e6e4] text-[#0f172a] flex flex-col items-center justify-center p-1 shrink-0">
                    {coupon.couponType === 'discount_percent' ? (
                      <>
                        <span className="text-sm font-medium text-amber-700 font-mono leading-none">
                          {(coupon.discountValue * 10).toFixed(1)}
                        </span>
                        <span className="text-[9px] text-[#787774] font-medium mt-0.5">折</span>
                      </>
                    ) : coupon.couponType === 'delivery_free' ? (
                      <>
                        <span className="text-xs font-medium text-sky-700 leading-none">免</span>
                        <span className="text-[8.5px] text-[#787774] font-normal mt-0.5">配送费</span>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline">
                          <span className="text-[10px] font-normal text-[#787774] mr-0.5">¥</span>
                          <span className="text-base font-medium text-[#0f172a] font-mono leading-none">
                            {coupon.discountValue}
                          </span>
                        </div>
                      </>
                    )}
                    <span className="text-[8px] text-[#787774] truncate mt-1">
                      {coupon.minSpend === 0 ? '无门槛' : `满¥${coupon.minSpend}`}
                    </span>
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-medium text-[#0f172a] truncate">
                        {coupon.title}
                      </h4>
                      {coupon.badgeText && (
                        <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1 py-0.2 rounded-[2px] font-normal shrink-0">
                          {coupon.badgeText}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-[#787774]">
                      <span className="font-mono font-medium text-[#0f172a] bg-[#fbfbfa] border border-[#e6e6e4] px-1.5 py-0.2 rounded-[2px]">
                        {coupon.code}
                      </span>
                      <span>至 {coupon.expireDate} 到期</span>
                    </div>

                    <p className="text-[10.5px] text-[#787774] truncate">
                      {coupon.subtitle || '全场餐品通用'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleStatus(coupon.id)}
                  className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-medium cursor-pointer transition-colors shrink-0 border ${
                    coupon.status === 'active'
                      ? 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]'
                      : 'bg-neutral-100 text-[#787774] border-[#e6e6e4]'
                  }`}
                >
                  {coupon.status === 'active' ? '● 发放中' : '○ 已暂停'}
                </button>
              </div>

              {/* Middle Row: Restrictions Badges & Stacking Tags */}
              <div className="p-2 bg-[#fbfbfa] rounded-[2px] border border-[#f1f1ef] space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Multi-truck Scope & Isolation Indicator */}
                  {coupon.truckScopeType === 'specific_trucks' ? (
                    <span className="text-[9.5px] bg-amber-50 border border-amber-200 text-amber-900 px-1.5 py-0.5 rounded-[2px] font-medium flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                      <span>限定餐车:</span>
                      <span className="truncate max-w-[130px] font-medium">
                        {coupon.applicableTruckNames?.join('/') || coupon.applicableTruckIds?.join('/') || '专属餐车'}
                      </span>
                      {coupon.truckIsolationStrict && (
                        <span className="text-[8px] bg-red-100 text-red-700 px-1 py-0.2 rounded-[2px] font-medium">强隔离</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[9.5px] bg-sky-50 border border-sky-200 text-sky-800 px-1.5 py-0.5 rounded-[2px] font-medium flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                      <span>全车队通用</span>
                      {coupon.maxUniversalBurnLimit && (
                        <span className="text-[8px] text-sky-600 font-mono">日限¥{coupon.maxUniversalBurnLimit}</span>
                      )}
                    </span>
                  )}

                  {coupon.antiBrushEnabled && (
                    <span className="text-[9.5px] bg-neutral-100 border border-[#e6e6e4] text-[#787774] px-1.5 py-0.5 rounded-[2px] font-mono">
                      🛡️ 限{coupon.perUserLimit || 1}张
                    </span>
                  )}

                  <span className="text-[9.5px] bg-white border border-[#e6e6e4] text-[#0f172a] px-1.5 py-0.5 rounded-[2px] font-normal">
                    {coupon.scopeType === 'all_dishes'
                      ? '🍽️ 全部菜品'
                      : `🥗 分类: ${coupon.scopeCategoryNames?.join('/')}`}
                  </span>
                  <span className="text-[9.5px] bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded-[2px] font-normal">
                    ⏰ {coupon.timeSlotLabel}
                  </span>
                  <span className="text-[9.5px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-[2px] font-normal">
                    📅 {coupon.dayRestrictionLabel}
                  </span>
                  <span
                    className={`text-[9.5px] px-1.5 py-0.5 rounded-[2px] font-normal border ${
                      coupon.allowStackWithActivity !== false
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {coupon.allowStackWithActivity !== false ? '✓ 叠满减' : '✕ 互斥不叠满减'}
                  </span>
                  {coupon.isExclusive && (
                    <span className="text-[9.5px] bg-purple-50 border border-purple-200 text-purple-800 px-1.5 py-0.5 rounded-[2px] font-normal">
                      👑 独享券
                    </span>
                  )}
                </div>

                {coupon.designStyle === 'custom_html' && coupon.customHtmlCode && (
                  <div
                    className="pt-1 pointer-events-none"
                    dangerouslySetInnerHTML={{ __html: coupon.customHtmlCode }}
                  />
                )}
              </div>

              {/* Bottom Row: Issuance Progress & Action Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-[#f1f1ef] gap-2 flex-wrap">
                <div className="text-[10px] text-[#787774]">
                  已领 <strong className="text-[#0f172a] font-mono font-medium">{coupon.issuedCount}</strong> / 核销{' '}
                  <strong className="text-[#16a34a] font-mono font-medium">{coupon.usedCount}</strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenDispatchModal(coupon)}
                    className="px-2 py-1 bg-[#0f172a] hover:bg-neutral-800 text-white rounded-[2px] text-[10.5px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    title="精准定向发券 / 批量推送券包"
                  >
                    <Send className="w-3 h-3 text-emerald-400" />
                    <span>定向派券</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openSharePoster(coupon)}
                    className="p-1 text-[#787774] hover:text-[#0f172a] hover:bg-[#fbfbfa] rounded-[2px] border border-transparent hover:border-[#e6e6e4] cursor-pointer"
                    title="生成扫码领券海报与二维码"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(coupon)}
                    className="p-1 text-[#787774] hover:text-[#0f172a] hover:bg-[#fbfbfa] rounded-[2px] border border-transparent hover:border-[#e6e6e4] cursor-pointer"
                    title="编辑属性"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={!dataGate.allowed}
                    onClick={() => handleOpenCalibrate(coupon)}
                    className={`p-1 rounded-[2px] border border-transparent transition-colors ${
                      dataGate.allowed
                        ? 'text-[#787774] hover:text-amber-700 hover:bg-amber-50 cursor-pointer'
                        : 'text-[#d3d1cb] cursor-not-allowed'
                    }`}
                    title={dataGate.allowed ? '校准发行/核销计数（店长权限，留痕审计）' : dataGate.reason || '需店长权限'}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={!dataGate.allowed}
                    onClick={() => {
                      if (!dataGate.allowed) {
                        showToast(dataGate.reason || '删除优惠券需要店长权限');
                        return;
                      }
                      handleDeleteCoupon(coupon.id);
                    }}
                    className={`p-1 rounded-[2px] transition-colors ${
                      dataGate.allowed
                        ? 'text-[#787774] hover:text-red-600 hover:bg-red-50 cursor-pointer'
                        : 'text-[#d3d1cb] cursor-not-allowed'
                    }`}
                    title={dataGate.allowed ? '删除（入回收站 30 天可恢复，店长权限）' : dataGate.reason || '需店长权限'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Targeted Batch Dispatch Modal */}
      {dispatchModalOpen && dispatchCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3px] border border-[#e6e6e4] shadow-xl overflow-hidden text-[#0f172a] animate-in zoom-in-95">
            <div className="bg-[#fbfbfa] px-4 py-2.5 border-b border-[#e6e6e4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-medium">
                  <Send className="w-3 h-3 text-emerald-400" />
                </div>
                <h3 className="text-xs font-medium text-[#0f172a]">
                  定向精准批量派发优惠券
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalOpen(false)}
                className="p-1 rounded-[2px] text-[#787774] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              {/* Selected Coupon Card */}
              <div className="p-2.5 bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#0f172a]">{dispatchCoupon.title}</div>
                  <div className="text-[10.5px] text-[#787774]">
                    券码: <span className="font-mono">{dispatchCoupon.code}</span> · 面额:{' '}
                    {dispatchCoupon.couponType === 'discount_percent'
                      ? `${(dispatchCoupon.discountValue * 10).toFixed(1)}折`
                      : `¥${dispatchCoupon.discountValue}`}
                  </div>
                </div>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded-[2px] border border-[#e6e6e4] font-medium text-[#0f172a]">
                  待派发
                </span>
              </div>

              {/* Target Segment */}
              <div>
                <label className="block text-[11px] font-medium text-[#0f172a] mb-1.5">
                  选择受众客群分层 (Target Segment)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: '全部会员客户', desc: '全店 1,280 位注册会员', icon: Users },
                    { id: 'new_customers', label: '新客进店客群', desc: '近7天新注册 142 人', icon: Sparkles },
                    { id: 'vip', label: '黑金 VIP 尊享', desc: '高客单 68 位贵宾会员', icon: Award },
                    { id: 'dormant', label: '唤醒沉睡客户', desc: '超30天未消费 215 人', icon: RefreshCw }
                  ].map((seg) => {
                    const IconComp = seg.icon;
                    const isSelected = dispatchTarget === seg.id;
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => setDispatchTarget(seg.id as any)}
                        className={`p-2 rounded-[2px] border text-left cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#0f172a] text-white border-[#0f172a]'
                            : 'bg-white border-[#e6e6e4] hover:bg-[#fbfbfa]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-medium text-xs">
                          <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-[#787774]'}`} />
                          <span>{seg.label}</span>
                        </div>
                        <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-[#787774]'}`}>
                          {seg.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Per User */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-[#0f172a] mb-1">每人派发张数</label>
                  <select
                    value={dispatchQuantityPerUser}
                    onChange={(e) => setDispatchQuantityPerUser(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-1.5 bg-white border border-[#e6e6e4] rounded-[2px] font-medium text-xs outline-none"
                  >
                    <option value={1}>每人 1 张</option>
                    <option value={2}>每人 2 张 (双倍惊喜)</option>
                    <option value={3}>每人 3 张 (全周聚餐券)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#0f172a] mb-1">通知渠道</label>
                  <div className="p-1.5 bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] text-[10.5px] text-[#787774]">
                    ✓ 服务号模版消息 + 券包弹窗
                  </div>
                </div>
              </div>

              {/* Custom Marketing Greeting Msg */}
              <div>
                <label className="block text-[11px] font-medium text-[#0f172a] mb-1">
                  推送赠言与营销话术
                </label>
                <input
                  type="text"
                  value={dispatchCustomMsg}
                  onChange={(e) => setDispatchCustomMsg(e.target.value)}
                  className="w-full p-1.5 bg-white border border-[#e6e6e4] rounded-[2px] text-xs outline-none focus:border-[#0f172a]"
                />
              </div>
            </div>

            <div className="bg-[#fbfbfa] px-4 py-2.5 border-t border-[#e6e6e4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDispatchModalOpen(false)}
                className="px-3 py-1 bg-white border border-[#e6e6e4] rounded-[2px] text-xs font-medium text-[#787774] hover:bg-[#f1f1ef] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecuteDispatch}
                className="px-3.5 py-1 bg-[#0f172a] hover:bg-neutral-800 text-white rounded-[2px] font-medium text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3 h-3 text-emerald-400" />
                <span>立即批量派发</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: QR Code Poster Modal */}
      {shareQrModalOpen && shareQrCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3px] border border-[#e6e6e4] shadow-xl overflow-hidden text-center p-4 space-y-3 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-[#f1f1ef]">
              <div className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-blue-600" />
                <h3 className="font-medium text-xs text-[#0f172a]">扫码领券海报与二维码</h3>
              </div>
              <button
                type="button"
                onClick={() => setShareQrModalOpen(false)}
                className="text-[#787774] hover:text-[#0f172a] cursor-pointer text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4] space-y-2">
              <div className="text-[10px] font-medium text-[#787774] tracking-wider uppercase font-mono">URBAN RADAR FOOD TRUCK</div>
              <div className="text-sm font-medium text-[#0f172a]">{shareQrCoupon.title}</div>
              
              {/* Truck Scope Pill */}
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-normal bg-white border border-[#e6e6e4] text-[#787774]">
                {shareQrCoupon.truckScopeType === 'specific_trucks' ? (
                  <>
                    <Lock className="w-2.5 h-2.5 text-amber-600" />
                    <span>指定餐车: {shareQrCoupon.applicableTruckNames?.join(' / ') || '专属隔离车'}</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-2.5 h-2.5 text-sky-600" />
                    <span>全部餐车通用 (全车队通兑)</span>
                  </>
                )}
              </div>

              {/* Vector SVG QR Code Container */}
              <div className="w-40 h-40 mx-auto bg-white rounded-[2px] border border-[#e6e6e4] p-2 flex items-center justify-center overflow-hidden">
                {shareQrSvg ? (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: shareQrSvg }}
                  />
                ) : (
                  <QrCode className="w-32 h-32 text-neutral-400 animate-pulse" />
                )}
              </div>

              <div className="text-[11px] text-[#787774] font-mono">
                兑换码: <span className="text-[#0f172a] font-medium tracking-wider">{shareQrCoupon.code}</span>
              </div>
            </div>

            {/* Jump URL preview and copy */}
            <div className="bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] p-2 text-left space-y-1 text-[11px]">
              <div className="text-[#787774] font-normal flex items-center justify-between text-[10.5px]">
                <span>🔗 二维码直达链接:</span>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyTextToClipboard(shareQrUrl);
                    showToast(ok ? '已复制跳转链接！' : '复制链接失败');
                  }}
                  className="text-blue-600 hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <Copy className="w-2.5 h-2.5" /> 复制
                </button>
              </div>
              <div className="font-mono text-[10px] text-[#0f172a] break-all select-all bg-white p-1 rounded-[2px] border border-[#e6e6e4]">
                {shareQrUrl || `${window.location.origin}/#coupon=${shareQrCoupon.code}`}
              </div>
            </div>

            {/* Quick Test Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const res = claimCouponByCode(shareQrCoupon.code);
                  playScannerBeep('beep_order');
                  showToast(res.message);
                }}
                className="py-1.5 px-2 bg-white hover:bg-[#fbfbfa] text-[#0f172a] border border-[#e6e6e4] rounded-[2px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                title="模拟扫码枪直接读取并领券入包"
              >
                <Scan className="w-3.5 h-3.5 text-amber-600" />
                <span>模拟扫码枪认领</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (shareQrCoupon) {
                    const shareText = [
                      `【黑石餐车 · 优惠领券】${shareQrCoupon.title}`,
                      `兑换码：${shareQrCoupon.code}`,
                      `适用车位：${shareQrCoupon.applicableTruckNames?.join(' / ') || '全车队通用'}`,
                      `扫码领券直达：${shareQrUrl}`
                    ].join('\n');
                    const ok = await copyTextToClipboard(shareText);
                    showToast(ok ? '已复制领券海报图文与兑换码到剪贴板！' : '复制失败，请手动长按选择复制');
                  }
                  setShareQrModalOpen(false);
                }}
                className="py-1.5 px-2 bg-[#0f172a] hover:bg-neutral-800 text-white rounded-[2px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>复制海报图文</span>
              </button>
            </div>

            {/* Link to full diagnostic view */}
            <div className="pt-1.5 border-t border-[#f1f1ef]">
              <button
                type="button"
                onClick={() => {
                  setShareQrModalOpen(false);
                  setIsDiagnosticModalOpen(true);
                }}
                className="w-full py-1 text-blue-600 hover:text-blue-800 text-[10.5px] font-normal flex items-center justify-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3 h-3" />
                <span>前往「二维码与扫码枪完整性检测中心」</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT COUPON MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-[3px] border border-[#e6e6e4] shadow-xl flex flex-col overflow-hidden text-[#0f172a] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-[#fbfbfa] px-4 py-2.5 border-b border-[#e6e6e4] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center">
                  <Ticket className="w-3 h-3 text-emerald-400" />
                </div>
                <h3 className="text-xs font-medium text-[#0f172a]">
                  {editingCoupon ? '编辑优惠券属性与规则' : '新建营销优惠券'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-[2px] hover:bg-[#f1f1ef] text-[#787774] hover:text-[#0f172a] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {/* Section 1: Basic Info */}
              <div className="space-y-2">
                <span className="text-[11px] font-medium text-[#0f172a] flex items-center gap-1.5 border-b border-[#f1f1ef] pb-1">
                  <span>1. 基础信息与券码</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10.5px] font-normal text-[#787774] block mb-1">优惠券名称 *</label>
                    <input
                      type="text"
                      required
                      placeholder="如：午市炙烤专享满减券"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-[#e6e6e4] rounded-[2px] outline-none focus:border-[#0f172a] font-medium text-[#0f172a]"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-normal text-[#787774] block mb-1">兑换券码 (Code) *</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        placeholder="如：UR-LUNCH10"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        className="flex-1 px-2.5 py-1 text-xs bg-white border border-[#e6e6e4] rounded-[2px] outline-none uppercase font-mono font-medium text-[#0f172a] focus:border-[#0f172a]"
                      />
                      <button
                        type="button"
                        onClick={() => setCode(`UR-${Math.floor(1000 + Math.random() * 9000)}`)}
                        className="px-2 py-1 bg-[#fbfbfa] hover:bg-[#f1f1ef] border border-[#e6e6e4] rounded-[2px] text-[10.5px] font-normal text-[#0f172a] cursor-pointer"
                      >
                        随机生成
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10.5px] font-normal text-[#787774] block mb-1">副标题/宣传语</label>
                    <input
                      type="text"
                      placeholder="如：写字楼工位午间专送"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-[#e6e6e4] rounded-[2px] outline-none focus:border-[#0f172a] text-[#0f172a]"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-normal text-[#787774] block mb-1">右上角标</label>
                    <input
                      type="text"
                      placeholder="如：午市特惠 / VIP专享 / 限量"
                      value={badgeText}
                      onChange={(e) => setBadgeText(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-[#e6e6e4] rounded-[2px] outline-none focus:border-[#0f172a] text-[#0f172a]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Type and Discount Value */}
              <div className="space-y-2 pt-2 border-t border-[#f1f1ef]">
                <span className="text-[11px] font-medium text-[#0f172a] flex items-center gap-1.5 border-b border-[#f1f1ef] pb-1">
                  2. 优惠方式与使用门槛
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setCouponType('amount_cut')}
                    className={`p-2 rounded-[2px] border text-center cursor-pointer transition-colors ${
                      couponType === 'amount_cut'
                        ? 'bg-[#0f172a] text-white border-[#0f172a] font-medium'
                        : 'bg-white border-[#e6e6e4] text-[#0f172a] hover:bg-[#fbfbfa]'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5 mx-auto mb-1" />
                    <span>满额立减券</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCouponType('no_threshold');
                      setMinSpend('0');
                    }}
                    className={`p-2 rounded-[2px] border text-center cursor-pointer transition-colors ${
                      couponType === 'no_threshold'
                        ? 'bg-[#0f172a] text-white border-[#0f172a] font-medium'
                        : 'bg-white border-[#e6e6e4] text-[#0f172a] hover:bg-[#fbfbfa]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 mx-auto mb-1" />
                    <span>无门槛立减券</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCouponType('discount_percent')}
                    className={`p-2 rounded-[2px] border text-center cursor-pointer transition-colors ${
                      couponType === 'discount_percent'
                        ? 'bg-[#0f172a] text-white border-[#0f172a] font-medium'
                        : 'bg-white border-[#e6e6e4] text-[#0f172a] hover:bg-[#fbfbfa]'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5 mx-auto mb-1" />
                    <span>折扣券 (打折)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCouponType('delivery_free');
                      setDiscountValue('5');
                    }}
                    className={`p-2 rounded-[2px] border text-center cursor-pointer transition-colors ${
                      couponType === 'delivery_free'
                        ? 'bg-[#0f172a] text-white border-[#0f172a] font-medium'
                        : 'bg-white border-[#e6e6e4] text-[#0f172a] hover:bg-[#fbfbfa]'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 mx-auto mb-1" />
                    <span>免配送费券</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10.5px] font-normal text-[#787774] block mb-1">
                      {couponType === 'discount_percent' ? '折扣比例 (如 8.5 表示8.5折)' : '立减金额 (¥) *'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-[#e6e6e4] rounded-[2px] outline-none focus:border-[#0f172a] font-mono font-medium text-[#0f172a]"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-normal text-[#787774] block mb-1">
                      最低消费门槛 (0为无门槛)
                    </label>
                    <input
                      type="number"
                      value={minSpend}
                      onChange={(e) => setMinSpend(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-[#e6e6e4] rounded-[2px] outline-none focus:border-[#0f172a] font-mono font-medium text-[#0f172a]"
                    />
                  </div>

                  {couponType === 'discount_percent' && (
                    <div>
                      <label className="text-[10.5px] font-normal text-[#787774] block mb-1">
                        最高优惠封顶上限 (¥)
                      </label>
                      <input
                        type="number"
                        value={maxDiscountCap}
                        onChange={(e) => setMaxDiscountCap(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-white border border-[#e6e6e4] rounded-[2px] outline-none focus:border-[#0f172a] font-mono font-medium text-[#0f172a]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Stacking & Exclusivity Rules */}
              <div className="space-y-2 pt-2 border-t border-[#f1f1ef]">
                <span className="text-[11px] font-medium text-[#0f172a] flex items-center gap-1.5 border-b border-[#f1f1ef] pb-1">
                  3. 优惠叠加与互斥规则
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="p-2 rounded-[2px] border border-[#e6e6e4] bg-[#fbfbfa] flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-medium text-xs text-[#0f172a]">允许与满减活动同享</div>
                      <div className="text-[10px] text-[#787774]">可与全场阶梯满减叠加</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowStackWithActivity}
                      onChange={(e) => setAllowStackWithActivity(e.target.checked)}
                      className="w-3.5 h-3.5 cursor-pointer accent-[#0f172a]"
                    />
                  </label>

                  <label className="p-2 rounded-[2px] border border-[#e6e6e4] bg-[#fbfbfa] flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-medium text-xs text-[#0f172a]">允许与VIP会员立减同享</div>
                      <div className="text-[10px] text-[#787774]">会员尊享额外立减</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowStackWithVIP}
                      onChange={(e) => setAllowStackWithVIP(e.target.checked)}
                      className="w-3.5 h-3.5 cursor-pointer accent-[#0f172a]"
                    />
                  </label>

                  <label className="p-2 rounded-[2px] border border-[#e6e6e4] bg-[#fbfbfa] flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-medium text-xs text-[#0f172a]">设为专属独享券</div>
                      <div className="text-[10px] text-[#787774]">不可与其他任何优惠同享</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isExclusive}
                      onChange={(e) => setIsExclusive(e.target.checked)}
                      className="w-3.5 h-3.5 cursor-pointer accent-[#0f172a]"
                    />
                  </label>
                </div>
              </div>

              {/* Section 4: Scope and Classification */}
              <div className="space-y-2 pt-2 border-t border-[#f1f1ef]">
                <span className="text-[11px] font-medium text-[#0f172a] flex items-center gap-1.5 border-b border-[#f1f1ef] pb-1">
                  4. 适用菜品范围
                </span>

                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="scopeType"
                      checked={scopeType === 'all_dishes'}
                      onChange={() => setScopeType('all_dishes')}
                      className="accent-[#0f172a]"
                    />
                    <span className="text-xs font-normal text-[#0f172a]">全场全部菜品通用</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="scopeType"
                      checked={scopeType === 'category'}
                      onChange={() => setScopeType('category')}
                      className="accent-[#0f172a]"
                    />
                    <span className="text-xs font-normal text-[#0f172a]">限定指定分类菜品</span>
                  </label>
                </div>

                {scopeType === 'category' && (
                  <div className="p-2 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4] space-y-1.5">
                    <span className="text-[10.5px] font-normal text-[#787774] block">勾选适用的菜品大类：</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'mains', label: '炙烤主餐' },
                        { id: 'drinks', label: '精酿饮品' },
                        { id: 'desserts', label: '时令甜品' },
                        { id: 'snacks', label: '特色小吃' }
                      ].map((cat) => {
                        const isChecked = selectedCategories.includes(cat.id as any);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                if (selectedCategories.length > 1) {
                                  setSelectedCategories(selectedCategories.filter((c) => c !== cat.id));
                                }
                              } else {
                                setSelectedCategories([...selectedCategories, cat.id as any]);
                              }
                            }}
                            className={`px-2 py-0.5 rounded-[2px] border text-xs font-medium transition-colors cursor-pointer ${
                              isChecked
                                ? 'bg-[#0f172a] text-white border-[#0f172a]'
                                : 'bg-white text-[#0f172a] border-[#e6e6e4] hover:bg-[#fbfbfa]'
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4.1: Multi-truck Scope and Isolation */}
              <div className="space-y-2 pt-2 border-t border-[#f1f1ef]">
                <div className="flex items-center justify-between border-b border-[#f1f1ef] pb-1">
                  <span className="text-[11px] font-medium text-[#0f172a] flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    4.1 餐车运营范围与分车隔离机制
                  </span>
                  <span className="text-[10px] text-[#787774]">多餐车独立核算 / 全车队引流通兑</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    onClick={() => {
                      setTruckScopeType('all_trucks');
                      setTruckIsolationStrict(false);
                    }}
                    className={`p-2.5 rounded-[2px] border cursor-pointer transition-colors flex items-start gap-2 ${
                      truckScopeType === 'all_trucks'
                        ? 'bg-sky-50/50 border-sky-300 text-sky-950'
                        : 'bg-white border-[#e6e6e4] text-[#0f172a] hover:bg-[#fbfbfa]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="truckScopeType"
                      checked={truckScopeType === 'all_trucks'}
                      onChange={() => {
                        setTruckScopeType('all_trucks');
                        setTruckIsolationStrict(false);
                      }}
                      className="accent-sky-600 mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium flex items-center gap-1">
                        <Globe className="w-3 h-3 text-sky-600" />
                        <span>全部餐车通用券 (全队通兑)</span>
                      </div>
                      <p className="text-[10.5px] text-[#787774] leading-relaxed">
                        适用于品牌促销。顾客在各号餐车均可核销，系统自动跨车分摊。
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setTruckScopeType('specific_trucks')}
                    className={`p-2.5 rounded-[2px] border cursor-pointer transition-colors flex items-start gap-2 ${
                      truckScopeType === 'specific_trucks'
                        ? 'bg-amber-50/50 border-amber-300 text-amber-950'
                        : 'bg-white border-[#e6e6e4] text-[#0f172a] hover:bg-[#fbfbfa]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="truckScopeType"
                      checked={truckScopeType === 'specific_trucks'}
                      onChange={() => setTruckScopeType('specific_trucks')}
                      className="accent-amber-600 mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>多餐车专属隔离券 (指定餐车核销)</span>
                      </div>
                      <p className="text-[10.5px] text-[#787774] leading-relaxed">
                        适用于单一站点商圈引流，其他餐车站台将严格阻断核销与盗刷。
                      </p>
                    </div>
                  </label>
                </div>

                {truckScopeType === 'specific_trucks' && (
                  <div className="p-2.5 bg-[#fbfbfa] rounded-[2px] border border-amber-200/80 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-medium text-[#0f172a]">
                        勾选允许核销的餐车站点（至少选1辆）：
                      </span>
                      <span className="text-[10px] text-amber-800 font-normal">已选 {applicableTruckIds.length} 辆车</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {AVAILABLE_TRUCK_OPTIONS.map((truck) => {
                        const isChecked = applicableTruckIds.includes(truck.id);
                        return (
                          <button
                            key={truck.id}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                if (applicableTruckIds.length > 1) {
                                  setApplicableTruckIds(applicableTruckIds.filter((id) => id !== truck.id));
                                } else {
                                  showToast('多餐车隔离模式下，至少需保留 1 辆适用餐车');
                                }
                              } else {
                                setApplicableTruckIds([...applicableTruckIds, truck.id]);
                              }
                            }}
                            className={`p-1.5 rounded-[2px] border text-left flex items-center justify-between transition-colors cursor-pointer ${
                              isChecked
                                ? 'bg-amber-50 border-amber-400 text-[#0f172a] font-medium'
                                : 'bg-white border-[#e6e6e4] text-[#787774] hover:bg-[#fbfbfa]'
                            }`}
                          >
                            <span className="text-xs">{truck.name}</span>
                            <span
                              className={`text-[9.5px] px-1 py-0.2 rounded-[2px] font-mono ${
                                isChecked ? 'bg-amber-600 text-white font-medium' : 'bg-neutral-100 text-[#787774]'
                              }`}
                            >
                              {isChecked ? '✓ 允许' : '隔离'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1.5 border-t border-amber-200/50 flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={truckIsolationStrict}
                          onChange={(e) => setTruckIsolationStrict(e.target.checked)}
                          className="accent-red-600"
                        />
                        <span className="text-xs font-normal text-red-700">
                          启用物理风控强隔离 (非绑定餐车结算时，严禁选用防止跨店盗刷)
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4.2: Marketing Risk Control & Budget Limits */}
              <div className="space-y-2 pt-2 border-t border-[#f1f1ef]">
                <div className="flex items-center justify-between border-b border-[#f1f1ef] pb-1">
                  <span className="text-[11px] font-medium text-[#0f172a] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    4.2 营销风控与核销熔断控制
                  </span>
                  <span className="text-[10px] text-emerald-700 font-normal">防刷单 / 资损熔断兜底</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10.5px] font-normal text-[#787774] block mb-1">
                      单用户限领/限核销上限
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={perUserLimit}
                        onChange={(e) => setPerUserLimit(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white border border-[#e6e6e4] rounded-[2px] text-[#0f172a] font-mono"
                      />
                      <span className="text-xs text-[#787774]">张/人</span>
                    </div>
                  </div>

                  {truckScopeType === 'all_trucks' && (
                    <div>
                      <label className="text-[10.5px] font-normal text-[#787774] block mb-1">
                        全车队单日补贴熔断限额
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[#787774]">¥</span>
                        <input
                          type="number"
                          min="50"
                          step="50"
                          value={maxUniversalBurnLimit}
                          onChange={(e) => setMaxUniversalBurnLimit(e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white border border-[#e6e6e4] rounded-[2px] text-[#0f172a] font-mono"
                        />
                        <span className="text-xs text-[#787774]">元/日</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center pt-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={antiBrushEnabled}
                        onChange={(e) => setAntiBrushEnabled(e.target.checked)}
                        className="accent-emerald-600"
                      />
                      <span className="text-xs font-normal text-[#0f172a]">
                        开启高频风控防御
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 5: Time Slot & Workday Restrictions */}
              <div className="space-y-2 pt-2 border-t border-[#f1f1ef]">
                <span className="text-[11px] font-medium text-[#0f172a] flex items-center gap-1.5 border-b border-[#f1f1ef] pb-1">
                  5. 使用时段与工作日限制
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10.5px] font-normal text-[#787774] block mb-1">
                      适用时段
                    </label>
                    <select
                      value={timeSlotType}
                      onChange={(e) => setTimeSlotType(e.target.value as any)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-[#e6e6e4] rounded-[2px] outline-none font-medium text-[#0f172a] cursor-pointer"
                    >
                      <option value="all_day">全天全时段通用 (00:00 - 23:59)</option>
                      <option value="lunch_only">午市专享 (11:00 - 14:00)</option>
                      <option value="dinner_night">晚市夜宵专享 (17:00 - 23:00)</option>
                      <option value="custom">自定义指定时段</option>
                    </select>

                    {timeSlotType === 'custom' && (
                      <div className="flex items-center gap-1.5 pt-1.5">
                        <input
                          type="time"
                          value={customTimeStart}
                          onChange={(e) => setCustomTimeStart(e.target.value)}
                          className="px-2 py-0.5 bg-white border border-[#e6e6e4] rounded-[2px] text-xs text-[#0f172a]"
                        />
                        <span className="text-[#787774]">至</span>
                        <input
                          type="time"
                          value={customTimeEnd}
                          onChange={(e) => setCustomTimeEnd(e.target.value)}
                          className="px-2 py-0.5 bg-white border border-[#e6e6e4] rounded-[2px] text-xs text-[#0f172a]"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10.5px] font-normal text-[#787774] block mb-1">
                      工作日/周末适用限制
                    </label>
                    <select
                      value={dayRestriction}
                      onChange={(e) => setDayRestriction(e.target.value as any)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-[#e6e6e4] rounded-[2px] outline-none font-medium text-[#0f172a] cursor-pointer"
                    >
                      <option value="all_week">全周通用 (周一至周日)</option>
                      <option value="workdays_only">仅限工作日 (周一至周五)</option>
                      <option value="weekends_only">仅限周末/节假日 (周六/周日)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 6: Expiry & Issuance */}
              <div className="space-y-2 pt-2 border-t border-[#f1f1ef]">
                <span className="text-[11px] font-medium text-[#0f172a] flex items-center gap-1.5 border-b border-[#f1f1ef] pb-1">
                  6. 发放总量与有效期
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10.5px] font-normal text-[#787774] block mb-1">
                      发行总量 (0为不限量)
                    </label>
                    <input
                      type="number"
                      value={totalQuantity}
                      onChange={(e) => setTotalQuantity(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-[#e6e6e4] rounded-[2px] outline-none focus:border-[#0f172a] font-mono font-medium text-[#0f172a]"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-normal text-[#787774] block mb-1">截止日期 *</label>
                    <input
                      type="date"
                      required
                      value={expireDate}
                      onChange={(e) => setExpireDate(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-[#e6e6e4] rounded-[2px] outline-none focus:border-[#0f172a] font-mono font-medium text-[#0f172a]"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-normal text-[#787774] block mb-1">上线状态</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-[#e6e6e4] rounded-[2px] outline-none font-medium text-[#0f172a] cursor-pointer"
                    >
                      <option value="active">立即上线发放</option>
                      <option value="paused">暂时暂停</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-2.5 border-t border-[#e6e6e4] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1 bg-white hover:bg-[#fbfbfa] text-[#787774] font-medium text-xs rounded-[2px] border border-[#e6e6e4] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 bg-[#0f172a] hover:bg-neutral-800 text-white font-medium text-xs rounded-[2px] cursor-pointer"
                >
                  {editingCoupon ? '保存修改' : '立即创建并发布'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    {/* DIAGNOSTIC MODAL */}
    {isDiagnosticModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in overflow-y-auto">
        <div className="bg-white w-full max-w-5xl rounded-[3px] border border-[#e6e6e4] shadow-2xl flex flex-col overflow-hidden max-h-[95vh] my-auto">
          <div className="bg-[#0f172a] text-white px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-xs">全系统二维码与扫码枪完整性风控检测中枢</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDiagnosticModalOpen(false)}
              className="text-neutral-400 hover:text-white cursor-pointer text-xs p-1"
            >
              ✕ 关闭检测
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#fbfbfa]">
            <QrAndScannerDiagnosticView
              showToast={showToast}
              dishes={dishes}
              tables={tables}
            />
          </div>
        </div>
      </div>
    )}

    {/* MODAL: 优惠券计数校准（店长专属，留痕审计） */}
    {calibratingCoupon && (
      <div className="fixed inset-0 z-[76] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs" onClick={() => setCalibratingCoupon(null)} />
        <div className="relative w-full max-w-sm bg-white rounded-[3px] border border-[#e6e6e4] shadow-xl p-4 space-y-3 text-[#0f172a]">
          <div className="flex items-center gap-1.5 border-b border-[#f1f1ef] pb-2">
            <Sliders className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium">校准优惠券计数（店长权限）</span>
          </div>
          <div className="text-[11px] text-[#787774] font-mono">
            【{calibratingCoupon.title}】券码 {calibratingCoupon.code}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-normal text-[#787774] mb-1">发行/领取数</label>
              <input
                type="number"
                min="0"
                value={calIssued}
                onChange={(e) => setCalIssued(e.target.value)}
                className="w-full px-2.5 py-1 border border-[#e6e6e4] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#0f172a]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-normal text-[#787774] mb-1">核销使用数</label>
              <input
                type="number"
                min="0"
                value={calUsed}
                onChange={(e) => setCalUsed(e.target.value)}
                className="w-full px-2.5 py-1 border border-[#e6e6e4] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#0f172a]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-normal text-[#787774] mb-1">校准原因 / 备注</label>
            <input
              type="text"
              value={calNote}
              onChange={(e) => setCalNote(e.target.value)}
              placeholder="如：测试数据更正 / 误发冲正"
              className="w-full px-2.5 py-1 border border-[#e6e6e4] rounded-[2px] text-xs focus:outline-none focus:border-[#0f172a]"
            />
          </div>
          <p className="text-[10px] text-[#787774]">
            校准后核销转化率与 GMV 估值自动重算；操作记录店长级审计，核销数不可大于发行数。
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCalibratingCoupon(null)}
              className="px-2.5 py-1 text-xs text-[#787774] hover:text-[#0f172a] rounded-[2px] cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmCalibrate}
              className="px-3 py-1 rounded-[2px] bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium cursor-pointer"
            >
              确认校准
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};
