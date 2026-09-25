import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Truck,
  FileText,
  MapPin,
  Activity,
  Ticket,
  Save,
  Radio,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Sliders,
  Battery,
  Thermometer,
  Zap,
  Plus,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Eye,
  Camera
} from 'lucide-react';
import {
  TruckLocationConfig,
  saveTruckConfig,
  getAllTruckConfigs,
  TruckHardwareStatus
} from '../../utils/truckLocationEngine';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { CouponItem } from '../../types/coupon';
import { INITIAL_MERCHANT_COUPONS } from '../../data/mockCoupons';

interface TruckQuickConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  truckId: string;
  onSaved?: (updatedConfig: TruckLocationConfig) => void;
}

export const TruckQuickConfigModal: React.FC<TruckQuickConfigModalProps> = ({
  isOpen,
  onClose,
  truckId,
  onSaved
}) => {
  const [activeTab, setActiveTab] = useState<'brand_logo' | 'announcement' | 'station' | 'telemetry' | 'coupons'>('brand_logo');
  const [currentTruck, setCurrentTruck] = useState<TruckLocationConfig | null>(null);

  // Logo & Brand states
  const [logoUrl, setLogoUrl] = useState('');
  const [logoInputText, setLogoInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [chefAnnouncement, setChefAnnouncement] = useState('');
  const [locationName, setLocationName] = useState('');
  const [parkingSpotDetail, setParkingSpotDetail] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [minDeliveryAmount, setMinDeliveryAmount] = useState(35);
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(5);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(3.0);
  const [stationNotice, setStationNotice] = useState('');

  // Hardware states
  const [holdingCabinetTemp, setHoldingCabinetTemp] = useState(70);
  const [coldStorageTemp, setColdStorageTemp] = useState(4);
  const [batteryLevel, setBatteryLevel] = useState(92);
  const [gpsSatellites, setGpsSatellites] = useState(18);
  const [queueOrders, setQueueOrders] = useState(2);
  const [powerStatus, setPowerStatus] = useState<'normal' | 'charging' | 'low'>('normal');
  const [sanitationLevel, setSanitationLevel] = useState('A级 · 今日已封签消杀');

  // Coupon states
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [newCouponTitle, setNewCouponTitle] = useState('');
  const [newCouponAmount, setNewCouponAmount] = useState(10);
  const [newCouponMinSpend, setNewCouponMinSpend] = useState(50);

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 官方预设徽标候选
  const PRESET_LOGOS = [
    {
      name: '黑曜石·极简炭烤',
      url: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=300&h=300&fit=crop'
    },
    {
      name: '冷萃咖啡·商务专享',
      url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&h=300&fit=crop'
    },
    {
      name: '水岸夜市·气泡特饮',
      url: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=300&h=300&fit=crop'
    },
    {
      name: '24H专送·和牛汉堡',
      url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300&h=300&fit=crop'
    },
    {
      name: '日式居酒·极速出餐',
      url: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=300&h=300&fit=crop'
    },
    {
      name: '精酿特饮·露营先锋',
      url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=300&h=300&fit=crop'
    }
  ];

  useEffect(() => {
    if (!isOpen) return;
    const all = getAllTruckConfigs();
    const target = all.find((t) => t.id === truckId) || all[0];
    if (target) {
      setCurrentTruck(target);
      const activeLogo = target.logo || target.image || PRESET_LOGOS[0].url;
      setLogoUrl(activeLogo);
      setLogoInputText(activeLogo);
      setChefAnnouncement(target.chefAnnouncement || '');
      setLocationName(target.locationName || '');
      setParkingSpotDetail(target.parkingSpotDetail || '');
      setBusinessHours(target.businessHours || '10:30 - 22:30');
      setMinDeliveryAmount(target.minDeliveryAmount ?? 35);
      setBaseDeliveryFee(target.baseDeliveryFee ?? 5);
      setDeliveryRadiusKm(target.deliveryRadiusKm ?? 3.0);
      setStationNotice(target.stationNotice || '');

      const hw = target.hardwareStatus || {
        holdingCabinetTemp: 70,
        coldStorageTemp: 4,
        batteryLevel: 92,
        gpsSatellites: 18,
        queueOrders: 2,
        powerStatus: 'normal',
        sanitationLevel: 'A级 · 今日已封签消杀'
      };
      setHoldingCabinetTemp(hw.holdingCabinetTemp);
      setColdStorageTemp(hw.coldStorageTemp);
      setBatteryLevel(hw.batteryLevel);
      setGpsSatellites(hw.gpsSatellites);
      setQueueOrders(hw.queueOrders);
      setPowerStatus(hw.powerStatus || 'normal');
      setSanitationLevel(hw.sanitationLevel || 'A级 · 今日已封签消杀');
    }

    // Load coupons
    const merchantCoupons = safeGetStorage<CouponItem[]>('obsidian_merchant_coupons', INITIAL_MERCHANT_COUPONS);
    setCoupons(merchantCoupons);
  }, [isOpen, truckId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 本地文件上传与压缩为 Data URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('⚠️ 请上传图片文件 (JPG / PNG / WEBP / SVG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new window.Image();
      img.onload = () => {
        // 创建 Canvas 进行智能等比缩放
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400; // 400x400 超清规格
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setLogoUrl(compressedDataUrl);
          setLogoInputText(compressedDataUrl.slice(0, 48) + '... (本地上传图像已压缩)');
          showToast('✅ 图片已成功导入并压缩，点击下方保存即可全网生效！');
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const handleSaveAndBroadcast = () => {
    if (!currentTruck) return;
    setIsSaving(true);

    const updatedHardware: TruckHardwareStatus = {
      holdingCabinetTemp: Number(holdingCabinetTemp) || 70,
      coldStorageTemp: Number(coldStorageTemp) || 4,
      batteryLevel: Math.min(100, Math.max(0, Number(batteryLevel) || 90)),
      gpsSatellites: Math.max(0, Number(gpsSatellites) || 16),
      queueOrders: Math.max(0, Number(queueOrders) || 0),
      powerStatus,
      sanitationLevel,
      voltage: 220
    };

    const finalLogo = logoUrl.trim() || currentTruck.logo || currentTruck.image || PRESET_LOGOS[0].url;

    const updatedConfig: Partial<TruckLocationConfig> & { id: string } = {
      id: currentTruck.id,
      logo: finalLogo,
      image: finalLogo,
      chefAnnouncement: chefAnnouncement.trim(),
      locationName: locationName.trim() || currentTruck.locationName,
      parkingSpotDetail: parkingSpotDetail.trim(),
      businessHours: businessHours.trim(),
      minDeliveryAmount: Number(minDeliveryAmount) || 35,
      baseDeliveryFee: Number(baseDeliveryFee) || 0,
      deliveryRadiusKm: Number(deliveryRadiusKm) || 3.0,
      stationNotice: stationNotice.trim(),
      hardwareStatus: updatedHardware,
      updatedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    saveTruckConfig(updatedConfig);
    setIsSaving(false);
    showToast('✨ 品牌Logo、通告与工况已全网热更新生效！');

    const fresh = getAllTruckConfigs().find((t) => t.id === currentTruck.id);
    if (fresh) {
      setCurrentTruck(fresh);
      if (onSaved) onSaved(fresh);
    }

    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleApplyPresetNotice = (text: string) => {
    setChefAnnouncement(text);
  };

  const handleAddCustomCoupon = () => {
    if (!newCouponTitle.trim()) return;
    const newCoupon: CouponItem = {
      id: `cpn-custom-${Date.now()}`,
      code: `UR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      title: newCouponTitle.trim(),
      subtitle: `${currentTruck?.name || '流动餐车'} 专属特惠立减券`,
      couponType: 'no_threshold',
      discountValue: newCouponAmount,
      minSpend: newCouponMinSpend,
      truckScopeType: 'specific_trucks',
      applicableTruckIds: [currentTruck?.id || 'truck-01'],
      applicableTruckNames: [currentTruck?.name || '指定餐车'],
      antiBrushEnabled: true,
      maxUniversalBurnLimit: 200,
      scopeType: 'all_dishes',
      timeSlotType: 'all_day',
      timeSlotLabel: '全天通用',
      dayRestriction: 'all_week',
      dayRestrictionLabel: '全周有效',
      designStyle: 'minimal_silver',
      badgeText: '专属特惠',
      themeColor: '#059669',
      totalQuantity: 500,
      issuedCount: 120,
      usedCount: 45,
      status: 'active',
      expireDate: '2026-10-31',
      createdAt: new Date().toISOString().slice(0, 10)
    };

    const updated = [newCoupon, ...coupons];
    safeSetStorage('obsidian_merchant_coupons', updated);
    setCoupons(updated);
    setShowAddCoupon(false);
    setNewCouponTitle('');
    showToast('已新增并绑定当前餐车专属优惠券！');
  };

  if (!isOpen || !currentTruck) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="p-3.5 sm:px-4 sm:py-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                  商家端实时控制台 · {currentTruck.name}
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-neutral-100 text-neutral-700 rounded border border-neutral-200 shrink-0">
                  {currentTruck.id}
                </span>
              </div>
              <p className="text-[10px] text-neutral-500 truncate">
                修改后一键全网热更新，食客端及协同联络室实时同步
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 极简白底分段控制器 (统一遵循 AGENTS.md 规范) */}
        <div className="p-2 sm:px-4 bg-neutral-50/30 border-b border-neutral-100">
          <div className="flex items-center justify-start gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {[
              { id: 'brand_logo', label: '品牌与Logo', icon: ImageIcon },
              { id: 'announcement', label: '主厨通告热更新', icon: FileText },
              { id: 'station', label: '真实驻点营运', icon: MapPin },
              { id: 'telemetry', label: '车载硬件工况', icon: Activity },
              { id: 'coupons', label: '专属福利卡券', icon: Ticket }
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`h-8 px-3 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-white text-emerald-700 border-emerald-600 ring-1.5 ring-emerald-600/15 shadow-xs font-bold'
                      : 'bg-white text-neutral-600 border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-700' : 'text-neutral-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 模态框主体内容 */}
        <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 space-y-3.5 text-xs">
          {/* TAB 0: 品牌与Logo 自定义上传 */}
          {activeTab === 'brand_logo' && (
            <div className="space-y-4">
              {/* 隐藏的本地文件 input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {/* 顶层主视口：当前生效 Logo 与 多重拟真效果预览 */}
              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-3 shrink-0">
                  {/* 1. 圆形拟态头像 (消息列表与聊天室气泡) */}
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-600/40 p-0.5 shadow-sm bg-white relative group">
                      <img
                        src={logoUrl}
                        alt="Logo Preview"
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PRESET_LOGOS[0].url;
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[9px] font-bold"
                      >
                        <Camera className="w-3.5 h-3.5 mb-0.5" />
                        <span>更换</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-medium block mt-1">联络室头像</span>
                  </div>

                  {/* 2. 圆角矩形卡片 (消息会话列表与餐车条) */}
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-neutral-300 p-0.5 shadow-2xs bg-white relative group">
                      <img
                        src={logoUrl}
                        alt="Logo Preview Box"
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PRESET_LOGOS[0].url;
                        }}
                      />
                      <span className="absolute bottom-0 right-0 bg-emerald-700 text-white text-[8px] font-bold px-1 rounded-tl">
                        当前
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-medium block mt-1">消息入口</span>
                  </div>
                </div>

                {/* 描述与核心操作 */}
                <div className="flex-1 min-w-0 space-y-2 text-left">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>{currentTruck.name} · 专属品牌徽标</span>
                      <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                        实时全网接线
                      </span>
                    </h4>
                    <p className="text-[10.5px] text-neutral-500 mt-0.5">
                      支持本地文件快速压缩上传，全网同步至食客端餐车Banner、消息入口会话列表及实时联络室。
                    </p>
                  </div>

                  {/* 上传与重置双按钮 */}
                  <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>从本地选取图片上传</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const fallback = PRESET_LOGOS[0].url;
                        setLogoUrl(fallback);
                        setLogoInputText(fallback);
                        showToast('已重置为官方默认黑曜石徽标');
                      }}
                      className="h-8 px-3 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-600 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    >
                      <RefreshCw className="w-3 h-3 text-neutral-400" />
                      <span>恢复默认</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 手动输入网络图片链接 */}
              <div>
                <label className="block text-[11.5px] font-bold text-neutral-800 mb-1">
                  或直接填入图床/网络图片 URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={logoInputText}
                    onChange={(e) => {
                      setLogoInputText(e.target.value);
                      if (e.target.value.trim().startsWith('http') || e.target.value.trim().startsWith('data:')) {
                        setLogoUrl(e.target.value.trim());
                      }
                    }}
                    placeholder="https://... 或直接点击上方上传本地图片"
                    className="flex-1 h-8 px-3 rounded-lg border border-neutral-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 text-xs text-neutral-900 outline-none bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (logoInputText.trim()) {
                        setLogoUrl(logoInputText.trim());
                        showToast('已更新预览图');
                      }
                    }}
                    className="h-8 px-3 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-[11px] font-bold shrink-0 cursor-pointer shadow-2xs"
                  >
                    应用
                  </button>
                </div>
              </div>

              {/* 官方精选餐车品牌徽标一键选用 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11.5px] font-bold text-neutral-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>官方精选工控极简徽标 (点击一键换用)</span>
                  </span>
                  <span className="text-[10px] text-neutral-400">免上传即点即用</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_LOGOS.map((item, idx) => {
                    const isPicked = logoUrl === item.url;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setLogoUrl(item.url);
                          setLogoInputText(item.url);
                          showToast(`已套用【${item.name}】徽标`);
                        }}
                        className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all bg-white ${
                          isPicked
                            ? 'border-emerald-600 ring-1.5 ring-emerald-600/20 shadow-xs'
                            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-8 h-8 rounded-lg object-cover shrink-0 border border-neutral-200"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-neutral-900 truncate">{item.name}</div>
                          <div className="text-[9.5px] text-neutral-400 truncate">
                            {isPicked ? '✓ 当前已选中' : '点击选用'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: 主厨通告 */}
          {activeTab === 'announcement' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11.5px] font-bold text-neutral-800 mb-1">
                  主厨通告与站台公告文本 (实时热广播)
                </label>
                <textarea
                  value={chefAnnouncement}
                  onChange={(e) => setChefAnnouncement(e.target.value)}
                  rows={4}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 text-xs text-neutral-900 transition-all outline-none resize-none"
                  placeholder="请输入今日餐车主厨的通告、今日特惠或上新通知..."
                />
                <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1">
                  <span>支持表情与福利公告格式</span>
                  <span>{chefAnnouncement.length} 字</span>
                </div>
              </div>

              <div>
                <span className="block text-[10.5px] font-semibold text-neutral-500 mb-1.5">
                  常用快捷通告模板（点击一键套用）：
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[
                    {
                      label: '午市快抢立减',
                      text: `【午市福利】${currentTruck.name}今日特惠立减！现磨冷萃与热狗套餐凭券满 50 减 10，无需排队极速出餐。`
                    },
                    {
                      label: '老饕社群集结',
                      text: `【主厨寄语】${currentTruck.name}老饕群已全面开启，入群每日限量抢炭火和牛包与专属折扣，欢迎加入！`
                    },
                    {
                      label: '夜市狂欢派对',
                      text: `【水岸夜市集结令】常驻苏河湾滨水木栈道，凭任意餐车订单可至水岸服务台免费核销特调冰爽特饮一杯！`
                    },
                    {
                      label: '24H 恒温专送',
                      text: `【24H 专送保障】配备 70℃ 车载恒温舱巡航与骑手无缝接驳，深夜热食 15 分钟极速直达！`
                    }
                  ].map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => handleApplyPresetNotice(tpl.text)}
                      className="p-2 rounded-lg border border-neutral-200 hover:border-emerald-500 hover:bg-emerald-50/30 text-left transition-all cursor-pointer group"
                    >
                      <div className="text-[11px] font-bold text-neutral-800 group-hover:text-emerald-700 flex items-center justify-between">
                        <span>{tpl.label}</span>
                        <Sparkles className="w-3 h-3 text-neutral-400 group-hover:text-emerald-600" />
                      </div>
                      <div className="text-[9.5px] text-neutral-500 line-clamp-1 mt-0.5">{tpl.text}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 真实驻点营运数据 */}
          {activeTab === 'station' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">驻点商圈与主路口</label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-neutral-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 text-xs text-neutral-900 outline-none"
                    placeholder="如：西藏北路曲阜路交叉口"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">精准车位 / 停靠泊位</label>
                  <input
                    type="text"
                    value={parkingSpotDetail}
                    onChange={(e) => setParkingSpotDetail(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-neutral-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 text-xs text-neutral-900 outline-none"
                    placeholder="如：大悦城南广场 01 号流动餐车专用泊位"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">营业驻点时段</label>
                  <input
                    type="text"
                    value={businessHours}
                    onChange={(e) => setBusinessHours(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-neutral-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 text-xs text-neutral-900 outline-none"
                    placeholder="如：10:30 - 22:30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">起送金额门槛 (元)</label>
                  <input
                    type="number"
                    value={minDeliveryAmount}
                    onChange={(e) => setMinDeliveryAmount(Number(e.target.value))}
                    className="w-full h-8 px-2.5 rounded-lg border border-neutral-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 text-xs text-neutral-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">配送范围半径 (公里)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={deliveryRadiusKm}
                    onChange={(e) => setDeliveryRadiusKm(Number(e.target.value))}
                    className="w-full h-8 px-2.5 rounded-lg border border-neutral-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 text-xs text-neutral-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  驻点交规、准入凭证与消杀说明
                </label>
                <input
                  type="text"
                  value={stationNotice}
                  onChange={(e) => setStationNotice(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-neutral-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 text-xs text-neutral-900 outline-none"
                  placeholder="如：市政特许移动餐饮备案 SH-JA-20260901 · 严禁占道经营"
                />
              </div>
            </div>
          )}

          {/* TAB 3: 车载硬件工况遥测 */}
          {activeTab === 'telemetry' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl border border-neutral-200/90 bg-neutral-50/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-neutral-800 flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-rose-600" />
                      车载 70℃ 恒温箱温度
                    </span>
                    <span className="text-xs font-bold text-rose-700">{holdingCabinetTemp} ℃</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="85"
                    value={holdingCabinetTemp}
                    onChange={(e) => setHoldingCabinetTemp(Number(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-neutral-400 mt-1">
                    <span>50℃ 预热</span>
                    <span className="text-emerald-600 font-semibold">70℃ 标准巡航</span>
                    <span>85℃ 极限保温</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-neutral-200/90 bg-neutral-50/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-neutral-800 flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-cyan-600" />
                      车载冷藏保鲜箱温度
                    </span>
                    <span className="text-xs font-bold text-cyan-700">{coldStorageTemp} ℃</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={coldStorageTemp}
                    onChange={(e) => setColdStorageTemp(Number(e.target.value))}
                    className="w-full accent-cyan-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-neutral-400 mt-1">
                    <span>0℃ 强效冷鲜</span>
                    <span className="text-emerald-600 font-semibold">4℃ 黄金保鲜</span>
                    <span>10℃ 预警</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-white">
                  <span className="text-[10.5px] font-bold text-neutral-600 flex items-center gap-1 mb-1">
                    <Battery className="w-3.5 h-3.5 text-emerald-600" />
                    车载电池电量 (%)
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={batteryLevel}
                    onChange={(e) => setBatteryLevel(Number(e.target.value))}
                    className="w-full h-8 px-2 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-900 outline-none"
                  />
                </div>

                <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-white">
                  <span className="text-[10.5px] font-bold text-neutral-600 flex items-center gap-1 mb-1">
                    <Radio className="w-3.5 h-3.5 text-purple-600" />
                    北斗/GPS 卫星数
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="32"
                    value={gpsSatellites}
                    onChange={(e) => setGpsSatellites(Number(e.target.value))}
                    className="w-full h-8 px-2 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-900 outline-none"
                  />
                </div>

                <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-white">
                  <span className="text-[10.5px] font-bold text-neutral-600 flex items-center gap-1 mb-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    排队待出餐单数
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={queueOrders}
                    onChange={(e) => setQueueOrders(Number(e.target.value))}
                    className="w-full h-8 px-2 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">车载供电状态</label>
                  <select
                    value={powerStatus}
                    onChange={(e) => setPowerStatus(e.target.value as typeof powerStatus)}
                    className="w-full h-8 px-2.5 rounded-lg border border-neutral-200 text-xs text-neutral-900 outline-none bg-white"
                  >
                    <option value="normal">市政绿电直供 (正常运行)</option>
                    <option value="charging">充电桩补能充能中</option>
                    <option value="low">蓄电池储能模式 (低电预警)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">食品安全消杀评级</label>
                  <input
                    type="text"
                    value={sanitationLevel}
                    onChange={(e) => setSanitationLevel(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-neutral-200 text-xs text-neutral-900 outline-none"
                    placeholder="如：A级 · 今日已封签消杀"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 专属福利卡券 */}
          {activeTab === 'coupons' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[11.5px] font-bold text-neutral-800">当前餐车专属优惠券与进群券</h4>
                  <p className="text-[10px] text-neutral-500">食客在展开细则时可直接领取并抵扣</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCoupon(!showAddCoupon)}
                  className="h-8 px-3 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>新增专属券</span>
                </button>
              </div>

              {showAddCoupon && (
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2.5">
                  <div className="text-[11px] font-bold text-emerald-900">为 {currentTruck.name} 发行专属券</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-neutral-600 mb-0.5">优惠券名称</label>
                      <input
                        type="text"
                        value={newCouponTitle}
                        onChange={(e) => setNewCouponTitle(e.target.value)}
                        placeholder="如：冷萃咖啡立减券"
                        className="w-full h-7 px-2 rounded border border-neutral-300 text-xs bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-neutral-600 mb-0.5">立减金额 (¥)</label>
                      <input
                        type="number"
                        value={newCouponAmount}
                        onChange={(e) => setNewCouponAmount(Number(e.target.value))}
                        className="w-full h-7 px-2 rounded border border-neutral-300 text-xs bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-neutral-600 mb-0.5">使用门槛 (满¥)</label>
                      <input
                        type="number"
                        value={newCouponMinSpend}
                        onChange={(e) => setNewCouponMinSpend(Number(e.target.value))}
                        className="w-full h-7 px-2 rounded border border-neutral-300 text-xs bg-white outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowAddCoupon(false)}
                      className="h-7 px-2.5 rounded text-[10.5px] border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-600 cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomCoupon}
                      className="h-7 px-3 rounded text-[10.5px] font-bold bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer shadow-2xs"
                    >
                      确定发行
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {coupons
                  .filter(
                    (c) =>
                      c.truckScopeType === 'all_trucks' ||
                      c.applicableTruckIds?.includes(currentTruck.id)
                  )
                  .map((cpn) => (
                    <div
                      key={cpn.id}
                      className="p-2.5 rounded-xl border border-neutral-200/90 bg-white flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/80 font-bold text-xs flex items-center justify-center shrink-0">
                          ¥{cpn.discountValue}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11.5px] font-bold text-neutral-900 truncate">{cpn.title}</div>
                          <div className="text-[10px] text-neutral-500 truncate">
                            门槛：满 ¥{cpn.minSpend} 抵扣 · {cpn.truckScopeType === 'all_trucks' ? '全车通用' : '当前车专属'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                        生效中
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作与广播状态条 */}
        <div className="p-3 sm:px-4 border-t border-neutral-100 flex items-center justify-between gap-2 bg-neutral-50/50">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 min-w-0">
            {toastMessage ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1 truncate">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {toastMessage}
              </span>
            ) : (
              <span className="text-neutral-400 truncate">
                保存后立即向全网广播并更新 URL Hash
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
            >
              取消
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAndBroadcast}
              className="h-8 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? '正在广播...' : '保存并全网热更新'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
