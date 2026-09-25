import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Check,
  Sliders,
  MapPin,
  Fingerprint,
  Wallet,
  Receipt,
  Edit2,
  Trash2,
  Plus,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Radio,
  Building,
  Building2,
  Home,
  GraduationCap,
  KeyRound,
  Copy,
  CheckCircle2,
  Clock,
  Leaf,
  BellOff,
  CreditCard,
  ArrowUpRight,
  User,
  Smartphone,
  Calendar,
  Flame,
  Tag,
  ChevronRight,
  Info,
  Lock,
  Settings2,
  Award,
  Search,
  Navigation,
  Compass,
  Crosshair,
  Share2,
  Send,
  X
} from 'lucide-react';
import { UserProfile, UserAddress, UserPreferences } from '../../types';
import { syncUserProfileToCloud } from '../../utils/cloudbase';
import { useToast } from '../ui/ToastContext';
import { saveAddresses, DeliveryAddressItem } from '../../utils/truckLocationEngine';

export interface UserProfileEditViewProps {
  userProfile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onBack?: () => void;
  initialTab?: 'profile' | 'addresses' | 'preferences' | 'wallet' | 'security' | 'finance';
  onOpenCloudMonitor?: () => void;
  onOpenCloudCode?: () => void;
}

type TabType = 'tab-profile' | 'tab-preference' | 'tab-address' | 'tab-security' | 'tab-finance';

// High-frequency landmark presets in Shanghai
const PRESET_DISTRICT_ADDRESSES: {
  tag: '公司' | '家' | '学校' | '其他';
  address: string;
  detail: string;
  houseNumber: string;
  remarks: string;
  lat: number;
  lng: number;
}[] = [
  {
    tag: '公司',
    address: '静安大悦城南座办公楼',
    detail: '西藏北路166号南座801室',
    houseNumber: '801室',
    remarks: '放置前台或门口智能蜂巢柜',
    lat: 31.2435,
    lng: 121.469
  },
  {
    tag: '家',
    address: '静安国际中心公寓区',
    detail: '汉中路光复路口1号楼',
    houseNumber: '1202室',
    remarks: '到达后电话联系，请轻声叩门',
    lat: 31.241,
    lng: 121.462
  },
  {
    tag: '学校',
    address: '同济大学四平路校区',
    detail: '四平路1239号学苑综合楼',
    houseNumber: '学苑餐厅西门外送专席',
    remarks: '下课高峰期请放外卖自提保温柜',
    lat: 31.2828,
    lng: 121.5011
  },
  {
    tag: '公司',
    address: '张江高科微电子港',
    detail: '碧波路888号畅星大厦6号楼',
    houseNumber: '6号楼1楼大厅',
    remarks: '放公司前台专属餐盒保洁区',
    lat: 31.201,
    lng: 121.587
  },
  {
    tag: '其他',
    address: '汉中路地铁站枢纽',
    detail: '12号线/13号线6号出入口地面广场',
    houseNumber: '地面公共绿地南侧长椅',
    remarks: '临时驻点就餐，当面交接',
    lat: 31.2405,
    lng: 121.459
  }
];

export const UserProfileEditView: React.FC<UserProfileEditViewProps> = ({
  userProfile,
  onProfileUpdated,
  onBack,
  initialTab = 'profile',
  onOpenCloudMonitor
}) => {
  const toast = useToast();

  // Map incoming initialTab to local TabType
  const resolvedInitialTab: TabType = useMemo(() => {
    switch (initialTab) {
      case 'addresses':
        return 'tab-address';
      case 'preferences':
        return 'tab-preference';
      case 'security':
        return 'tab-security';
      case 'wallet':
      case 'finance':
        return 'tab-finance';
      case 'profile':
      default:
        return 'tab-profile';
    }
  }, [initialTab]);

  const [activeTab, setActiveTab] = useState<TabType>(resolvedInitialTab);

  // Form State
  const [nickname, setNickname] = useState(userProfile.nickname || '张伟 (店长)');
  const [phone] = useState(userProfile.phone || '13800138000');
  const [avatar, setAvatar] = useState(userProfile.avatar || '🧑‍💻');
  const [bio, setBio] = useState(userProfile.bio || '店长 / 运营总管 · 设备硬件指纹绑定中');
  const [gender, setGender] = useState<'secret' | 'male' | 'female'>(userProfile.gender || 'secret');
  const [birthday, setBirthday] = useState(userProfile.birthday || '1990/01/01');

  // Preferences State
  const [spiciness, setSpiciness] = useState<'none' | 'mild' | 'medium' | 'hot'>(
    userProfile.preferences?.spiciness || 'mild'
  );
  const [ecoMode, setEcoMode] = useState<boolean>(
    userProfile.preferences?.cutlery === 'eco' || userProfile.preferences?.cutlery === 'not_needed'
  );
  const [silentCall, setSilentCall] = useState<boolean>(
    !userProfile.preferences?.radarTracking || false
  );
  const [autoCoupons, setAutoCoupons] = useState<boolean>(
    userProfile.preferences?.autoApplyCoupons !== false
  );
  const [dietaryNotes, setDietaryNotes] = useState<string>(
    userProfile.preferences?.dietaryNote || '无特殊过敏原'
  );

  // Addresses State
  const [addresses, setAddresses] = useState<UserAddress[]>(() => {
    if (userProfile.addresses && userProfile.addresses.length > 0) {
      return userProfile.addresses;
    }
    return [
      {
        id: 'addr-default-1',
        name: userProfile.nickname || '张伟',
        phone: userProfile.phone || '13800138000',
        tag: '公司',
        address: '静安大悦城南座办公楼',
        detail: '西藏北路166号南座801室',
        houseNumber: '801室',
        remarks: '放置前台或门口蜂巢柜',
        isDefault: true,
        latitude: 31.2435,
        longitude: 121.469,
        createdAt: '2024-01-15 09:20:11'
      },
      {
        id: 'addr-sub-2',
        name: userProfile.nickname || '张伟',
        phone: userProfile.phone || '13800138000',
        tag: '家',
        address: '静安国际中心公寓区',
        detail: '汉中路光复路口1号楼',
        houseNumber: '1202室',
        remarks: '到达后电话联系，请轻声叩门',
        isDefault: false,
        latitude: 31.241,
        longitude: 121.462,
        createdAt: '2024-02-18 14:15:30'
      }
    ];
  });

  // Address Search & Tag Filter
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [addressTagFilter, setAddressTagFilter] = useState<'all' | '公司' | '家' | '学校' | '其他'>('all');

  // Inline Address Add/Edit State
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrTag, setAddrTag] = useState<'公司' | '家' | '学校' | '其他'>('公司');
  const [addrLocation, setAddrLocation] = useState('');
  const [addrHouseNumber, setAddrHouseNumber] = useState('');
  const [addrDetail, setAddrDetail] = useState('');
  const [addrRemarks, setAddrRemarks] = useState('');
  const [addrLat, setAddrLat] = useState<number | undefined>(undefined);
  const [addrLng, setAddrLng] = useState<number | undefined>(undefined);

  // Security Token & Sync States
  const [hwToken, setHwToken] = useState('fp_sec_99a8x00138000#pos');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('刚刚已同步');
  const [balance] = useState(userProfile.balance ?? 158.5);
  const [points] = useState(userProfile.points ?? 1280);
  const [financeFilter, setFinanceFilter] = useState<'all' | 'recharge' | 'expense' | 'points'>('all');

  // Sync to truckLocationEngine whenever address changes
  const syncToTruckEngine = (list: UserAddress[]) => {
    try {
      const converted: DeliveryAddressItem[] = list.map((a, idx) => ({
        id: a.id || `addr-${idx}`,
        title: a.address,
        detail: a.houseNumber ? `${a.detail} ${a.houseNumber}`.trim() : a.detail,
        houseNumber: a.houseNumber || '',
        receiverName: a.name,
        receiverPhone: a.phone,
        tag: a.tag,
        remarks: a.remarks || '',
        isDefault: !!a.isDefault,
        latitude: a.latitude || 31.2435,
        longitude: a.longitude || 121.469,
        createdAt: a.createdAt || new Date().toLocaleString()
      }));
      saveAddresses(converted);
    } catch (err) {
      console.error('Failed to sync addresses to truckLocationEngine', err);
    }
  };

  // Cloud Sync Function
  const handleSaveAndSync = async () => {
    setIsSyncing(true);

    const updatedPref: UserPreferences = {
      spiciness,
      cutlery: ecoMode ? 'eco' : 'needed',
      autoApplyCoupons: autoCoupons,
      radarTracking: !silentCall,
      smsNotification: silentCall,
      dietaryNote: dietaryNotes
    };

    const updatedProfile: UserProfile = {
      ...userProfile,
      nickname: nickname.trim() || '张伟 (店长)',
      avatar,
      bio: bio.trim(),
      gender,
      birthday,
      balance,
      points,
      addresses,
      preferences: updatedPref,
      cloudSyncedAt: new Date().toISOString()
    };

    try {
      const res = await syncUserProfileToCloud(updatedProfile);
      onProfileUpdated(res.profile);
      syncToTruckEngine(addresses);
      setLastSyncTime(new Date().toLocaleTimeString());
      toast.success('配置同步完成', '会员资料与参数设置已成功下发并同步至 POS 终端与云端');
    } catch {
      setLastSyncTime(new Date().toLocaleTimeString());
      toast.info('本地更新成功', '参数已成功持久化更新并在离线缓存中生效');
      onProfileUpdated(updatedProfile);
      syncToTruckEngine(addresses);
    } finally {
      setIsSyncing(false);
    }
  };

  // Reissue Key Handler
  const handleReissueKey = () => {
    const newToken = 'fp_sec_' + Math.random().toString(36).substring(2, 8) + '#pos';
    setHwToken(newToken);
    toast.success('安全凭据重签成功', `硬件指纹密钥已更新为：${newToken}`);
  };

  // Save Address from Inline Form
  const handleSaveAddress = () => {
    if (!addrLocation.trim()) {
      toast.warning('请输入地址', '小区/写字楼或地址位置不能为空');
      return;
    }

    if (editingAddress) {
      const updated = addresses.map((a) =>
        a.id === editingAddress.id
          ? {
              ...a,
              name: addrName.trim() || nickname,
              phone: addrPhone.trim() || phone,
              tag: addrTag,
              address: addrLocation.trim(),
              houseNumber: addrHouseNumber.trim(),
              detail: addrDetail.trim() || addrLocation.trim(),
              remarks: addrRemarks.trim(),
              latitude: addrLat || a.latitude || 31.2435,
              longitude: addrLng || a.longitude || 121.469
            }
          : a
      );
      setAddresses(updated);
      syncToTruckEngine(updated);
      toast.success('地址更新成功', '常用收货地址已完成保存');
    } else {
      const newAddr: UserAddress = {
        id: `addr-${Date.now()}`,
        name: addrName.trim() || nickname,
        phone: addrPhone.trim() || phone,
        tag: addrTag,
        address: addrLocation.trim(),
        houseNumber: addrHouseNumber.trim(),
        detail: addrDetail.trim() || addrLocation.trim(),
        remarks: addrRemarks.trim(),
        isDefault: addresses.length === 0,
        latitude: addrLat || 31.2435,
        longitude: addrLng || 121.469,
        createdAt: new Date().toLocaleString()
      };
      const updated = [newAddr, ...addresses];
      setAddresses(updated);
      syncToTruckEngine(updated);
      toast.success('新增地址成功', '已成功添加至常用收货地址簿');
    }

    // Reset inline form
    setIsAddingAddress(false);
    setEditingAddress(null);
    setAddrName('');
    setAddrPhone('');
    setAddrLocation('');
    setAddrHouseNumber('');
    setAddrDetail('');
    setAddrRemarks('');
    setAddrLat(undefined);
    setAddrLng(undefined);
  };

  // Delete Address
  const handleDeleteAddress = (id: string) => {
    const nextList = addresses.filter((a) => a.id !== id);
    if (nextList.length > 0 && !nextList.some((a) => a.isDefault)) {
      nextList[0].isDefault = true;
    }
    setAddresses(nextList);
    syncToTruckEngine(nextList);
    toast.info('地址已移除', '该收货地址已从常用列表中删除');
  };

  // Set Default Address
  const handleSetDefaultAddress = (id: string) => {
    const nextList = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id
    }));
    setAddresses(nextList);
    syncToTruckEngine(nextList);
    toast.success('默认地址已切换', '下次点单将优先选中此送达地址');
  };

  // Simulate GPS Geolocation Auto-Detection
  const handleSimulateGpsAutofill = () => {
    const mockLat = 31.2435 + (Math.random() - 0.5) * 0.008;
    const mockLng = 121.469 + (Math.random() - 0.5) * 0.008;
    setAddrLat(Number(mockLat.toFixed(5)));
    setAddrLng(Number(mockLng.toFixed(5)));
    setAddrLocation('上海静安大悦城 · GPS定位点');
    setAddrDetail('静安区西藏北路166号北座');
    setAddrHouseNumber('3楼天台极速交接站');
    toast.info('GPS 定位解析就绪', `已捕获卫星坐标：${mockLat.toFixed(4)}°N, ${mockLng.toFixed(4)}°E`);
  };

  // Radar Distance Check Simulation
  const handleSimulateRadarCheck = (addr: UserAddress) => {
    const distMeters = Math.floor(450 + Math.random() * 600);
    const etaMinutes = Math.max(3, Math.ceil(distMeters / 180));
    toast.info(
      '雷达测距计算就绪',
      `距离当前餐车约 ${distMeters} 米 · 车载 GPS 直线预估送达 ${etaMinutes} 分钟`
    );
  };

  // Copy Address Payload
  const handleCopyAddressInfo = (addr: UserAddress) => {
    const payload = `【收货人】${addr.name} (${addr.phone})\n【送达地址】${addr.address} ${addr.detail} ${addr.houseNumber || ''}\n【备注】${addr.remarks || '无'}`;
    navigator.clipboard.writeText(payload);
    toast.success('地址信息已复制', '收件人姓名、电话与完整地址已复制至剪贴板');
  };

  // Load Preset Landmark
  const handleApplyPreset = (preset: typeof PRESET_DISTRICT_ADDRESSES[0]) => {
    setAddrName(nickname);
    setAddrPhone(phone);
    setAddrTag(preset.tag);
    setAddrLocation(preset.address);
    setAddrDetail(preset.detail);
    setAddrHouseNumber(preset.houseNumber);
    setAddrRemarks(preset.remarks);
    setAddrLat(preset.lat);
    setAddrLng(preset.lng);
    setIsAddingAddress(true);
    setEditingAddress(null);
    toast.info('已导入商圈预设', `已自动载入 ${preset.address}，点击「保存」即可入库`);
  };

  // Reset to initial settings
  const handleResetToInitial = () => {
    if (window.confirm('是否确认将全部参数重置回初始设定？')) {
      setNickname('张伟 (店长)');
      setBirthday('1990/01/01');
      setBio('店长 / 运营总管 · 设备硬件指纹绑定中');
      setGender('secret');
      setSpiciness('mild');
      setEcoMode(true);
      setSilentCall(false);
      setAutoCoupons(true);
      setDietaryNotes('无特殊过敏原');
      toast.info('参数已重置', '全部表单已恢复至默认初始参数');
    }
  };

  // Quick Dietary Tag Pills
  const dietaryPresets = [
    '免香菜',
    '不要葱蒜',
    '少油少盐',
    '不要生洋葱',
    '花生过敏',
    '海鲜慎选',
    '分装打包',
    '需备温水'
  ];

  const handleToggleDietaryTag = (tag: string) => {
    if (dietaryNotes.includes(tag)) {
      const next = dietaryNotes
        .split('，')
        .map((s) => s.trim())
        .filter((s) => s && s !== tag)
        .join('，');
      setDietaryNotes(next || '无特殊过敏原');
    } else {
      if (dietaryNotes === '无特殊过敏原' || !dietaryNotes.trim()) {
        setDietaryNotes(tag);
      } else {
        setDietaryNotes(`${dietaryNotes}，${tag}`);
      }
    }
  };

  // Filtered Addresses for Compact Grid
  const filteredAddresses = useMemo(() => {
    return addresses.filter((a) => {
      // Tag filter
      if (addressTagFilter !== 'all' && a.tag !== addressTagFilter) {
        return false;
      }
      // Search query filter
      if (addressSearchQuery.trim()) {
        const query = addressSearchQuery.trim().toLowerCase();
        const fullStr = `${a.name} ${a.phone} ${a.address} ${a.detail} ${a.houseNumber || ''} ${a.remarks || ''}`.toLowerCase();
        return fullStr.includes(query);
      }
      return true;
    });
  }, [addresses, addressTagFilter, addressSearchQuery]);

  // Preset avatar emoji options
  const avatarPresets = ['🧑‍💻', '👨‍💼', '🧔‍♂️', '👩‍🍳', '🧑‍🎨', '😎', '⚡', '☕'];

  // Tab definitions
  const tabsList = [
    {
      id: 'tab-profile' as const,
      label: '基本资料',
      enLabel: 'PROFILE',
      icon: User,
      badge: '档案完善',
      badgeColor: 'bg-success-soft text-success border border-success/30'
    },
    {
      id: 'tab-preference' as const,
      label: '就餐偏好',
      enLabel: 'PREFERENCE',
      icon: Sliders,
      badge: '厨房联动',
      badgeColor: 'bg-warning-soft text-warning border border-warning/30'
    },
    {
      id: 'tab-address' as const,
      label: '常用地址',
      enLabel: 'ADDRESS',
      icon: MapPin,
      badge: `${addresses.length}处·网格`,
      badgeColor: 'bg-canvas-gray text-ink border border-hairline'
    },
    {
      id: 'tab-security' as const,
      label: '安全凭据',
      enLabel: 'SECURITY',
      icon: ShieldCheck,
      badge: '99.8%',
      badgeColor: 'bg-canvas-gray text-ink-secondary border border-hairline'
    },
    {
      id: 'tab-finance' as const,
      label: '财务对账',
      enLabel: 'FINANCE',
      icon: Wallet,
      badge: '实时流水',
      badgeColor: 'bg-canvas-gray text-ink-secondary border border-hairline'
    }
  ];

  // Simulated recent financial transactions
  const financialRecords = [
    {
      id: 'tx-101',
      title: '微信在线储值充值',
      sub: '充值成功 · 自动获得 50 赠送积分',
      time: '今日 14:20',
      amount: '+¥100.00',
      type: 'recharge',
      status: '已到账'
    },
    {
      id: 'tx-102',
      title: '黑曜石餐车外送订单支付',
      sub: '静安大悦城站台 · 外送单号 #8821',
      time: '昨日 18:45',
      amount: '-¥38.50',
      type: 'expense',
      status: '交易完成'
    },
    {
      id: 'tx-103',
      title: '每日低碳点单奖励积分',
      sub: '践行无一次性餐具环保就餐',
      time: '昨日 18:45',
      amount: '+15 积分',
      type: 'points',
      status: '已核发'
    },
    {
      id: 'tx-104',
      title: '黑金会员日专享立减金冲抵',
      sub: '系统自动满减券优惠核销',
      time: '09-10 12:30',
      amount: '-¥10.00',
      type: 'expense',
      status: '卡券冲抵'
    }
  ];

  const filteredFinancialRecords = financialRecords.filter((rec) => {
    if (financeFilter === 'all') return true;
    return rec.type === financeFilter;
  });

  return (
    <div className="bg-canvas-gray/40 text-ink font-sans antialiased min-h-screen selection:bg-ink selection:text-on-ink flex flex-col">
      {/* 1. TOP NAVIGATION HEADER (Industrial Precision Order System) */}
      <header className="bg-canvas/95 backdrop-blur-md border-b border-hairline sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-14 flex items-center justify-between">
          {/* Left Back & Title Breadcrumb */}
          <div className="flex items-center space-x-3">
            {onBack && (
              <button
                onClick={onBack}
                type="button"
                id="back-to-member-center-btn"
                className="group flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink bg-canvas hover:bg-canvas-gray border border-hairline px-3 py-1.5 rounded-ds transition-all cursor-pointer shadow-console-1 active:scale-97"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-icon-muted group-hover:-translate-x-0.5 transition-transform" />
                <span>返回中心</span>
              </button>
            )}
            <div className="h-4 w-px bg-hairline" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-sans tracking-wider text-ink-tertiary uppercase">URBAN RADAR /</span>
                <h1 className="text-xs sm:text-sm font-bold tracking-tight text-ink uppercase">
                  会员资料与参数控制台
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-sans bg-ink text-on-ink px-1.5 py-0.2 rounded-ds-sm font-bold">
                  PRECISION v2
                </span>
              </div>
              <span className="text-[9.5px] font-sans text-ink-tertiary hidden md:inline-block">
                CENTRAL PARAMETER CONSOLE · COMPACT ADAPTIVE GRID
              </span>
            </div>
          </div>

          {/* Right Action & Cloud Status */}
          <div className="flex items-center space-x-2.5">
            {/* Real-time Cloud Indicator */}
            <div className="hidden md:flex items-center gap-2 text-xs font-sans bg-success-soft text-success px-3 py-1 rounded-ds border border-success/30">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-[11px] font-bold tracking-tight">车载雷达全域联通</span>
            </div>

            {/* Quick Open Cloud Monitor */}
            {onOpenCloudMonitor && (
              <button
                type="button"
                onClick={onOpenCloudMonitor}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary bg-canvas hover:bg-canvas-gray border border-hairline px-3 py-1.5 rounded-ds transition-colors cursor-pointer shadow-console-1"
              >
                <Radio className="w-3.5 h-3.5 text-success animate-pulse" />
                <span>云监控</span>
              </button>
            )}

            {/* Save & Sync Button */}
            <button
              onClick={handleSaveAndSync}
              disabled={isSyncing}
              className="inline-flex items-center text-xs font-bold text-on-ink bg-ink hover:bg-ink-hover active:scale-97 border border-ink px-3.5 py-1.5 transition-all shadow-console-1 rounded-ds cursor-pointer disabled:opacity-70"
              id="top-sync-btn"
              type="button"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? '同步中...' : '保存并下发'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 w-full flex-1 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-start gap-4 sm:gap-6">
          
          {/* LEFT SIDEBAR: Digital Member Card & Tab Navigator */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
            
            {/* VIP Digital Membership Card (Industrial Obsidian Precision) */}
            <div className="relative overflow-hidden rounded-ds-xl bg-[#111111] text-white p-4.5 shadow-console-2 border border-[#222222]">
              {/* Card Top Tier & Status */}
              <div className="flex items-center justify-between mb-3.5 relative z-10">
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-select" />
                  <span className="text-[10px] font-sans font-black tracking-widest uppercase text-select bg-select-soft/10 border border-select-border/30 px-2 py-0.5 rounded-ds-sm">
                    {userProfile.membershipTier === 'vip_black_elite'
                      ? 'BLACK ELITE'
                      : userProfile.membershipTier === 'vip_silver'
                      ? 'SILVER ELITE'
                      : 'BLACK ELITE 先锋'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-sans text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded-ds-sm border border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>实时联通</span>
                </div>
              </div>

              {/* User Avatar & Info */}
              <div className="flex items-center space-x-3 mb-4 relative z-10">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-ds-lg bg-[#1c1c1c] border border-[#333333] flex items-center justify-center text-2xl shadow-inner">
                    {avatar}
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-success text-white rounded-full p-0.5 border-2 border-[#111111]">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold text-white truncate">
                      {nickname || '张伟 (店长)'}
                    </h2>
                    <span className="text-[9px] font-sans bg-[#222222] text-neutral-300 px-1 py-0.2 rounded-ds-sm border border-[#333333]">
                      {gender === 'male' ? '男' : gender === 'female' ? '女' : '保密'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-sans mt-0.5">{phone}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5 truncate">{bio}</p>
                </div>
              </div>

              {/* Card Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 border-t border-[#242424] pt-3 relative z-10 font-sans">
                <div className="bg-[#181818] border border-[#282828] p-2.5 rounded-ds">
                  <span className="text-[9.5px] text-neutral-400 block uppercase mb-0.5">储值账户余额</span>
                  <span className="text-base font-black text-white leading-none font-amount">¥{balance.toFixed(2)}</span>
                </div>
                <div className="bg-[#181818] border border-[#282828] p-2.5 rounded-ds">
                  <span className="text-[9.5px] text-neutral-400 block uppercase mb-0.5">活跃尊享积分</span>
                  <span className="text-base font-black text-select leading-none font-amount">{points}</span>
                </div>
              </div>
            </div>

            {/* Industrial Precision Navigation Tabs Menu */}
            <nav className="bg-canvas border border-hairline shadow-console-1 rounded-ds-xl p-2.5 sm:p-3">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-hairline px-1">
                <div className="text-[10.5px] font-sans uppercase tracking-wider text-ink-tertiary flex items-center gap-1.5 font-bold">
                  <Sliders className="w-3.5 h-3.5 text-icon-default" />
                  <span>控制台分类导航</span>
                </div>
                <span className="text-[9px] font-sans text-ink-secondary bg-canvas-gray px-2 py-0.5 border border-hairline rounded-ds-sm font-bold">
                  5 项参数模块
                </span>
              </div>

              {/* Vertical Tab Buttons */}
              <div className="space-y-1">
                {tabsList.map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      data-tab={t.id}
                      id={`tab-nav-${t.id}`}
                      onClick={() => setActiveTab(t.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-ds transition-all text-left cursor-pointer group ${
                        isActive
                          ? 'bg-ink text-on-ink shadow-console-1 font-bold'
                          : 'bg-transparent text-ink-secondary hover:bg-canvas-gray hover:text-ink'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-ds flex items-center justify-center transition-colors ${
                            isActive
                              ? 'bg-ink-hover text-on-ink'
                              : 'bg-canvas-gray text-icon-default group-hover:bg-hairline'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs block leading-tight truncate font-semibold">
                            {t.label}
                          </span>
                          <span
                            className={`text-[9px] font-sans block ${
                              isActive ? 'text-neutral-400' : 'text-ink-tertiary'
                            }`}
                          >
                            {t.enLabel}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[9.5px] font-sans px-2 py-0.5 rounded-ds-sm border leading-none font-semibold ${
                          isActive
                            ? 'bg-ink-hover text-white border-neutral-700'
                            : t.badgeColor
                        }`}
                      >
                        {t.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Quick Terminal & Cloud Diagnostics Note */}
            <div className="p-3.5 bg-canvas border border-hairline rounded-ds-xl text-[11px] font-sans text-ink-secondary space-y-1.5 shadow-console-1">
              <div className="text-ink font-bold flex items-center justify-between uppercase text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span>终端协同诊断</span>
                </div>
                <span className="text-[9px] text-ink-tertiary font-normal">TCP/IP 联通</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-hairline">
                <span className="text-ink-tertiary">终端序列号：</span>
                <span className="text-ink font-bold">POS-RADAR-001</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-tertiary">雷达测距握手：</span>
                <span className="text-success font-bold">18ms (精准)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-tertiary">设计系统规范：</span>
                <span className="text-ink-secondary">PRECISION-ORDER-v2</span>
              </div>
            </div>
          </aside>

          {/* RIGHT MAIN WORKSPACE: Form Setting Panels */}
          <section className="lg:col-span-8 xl:col-span-9 space-y-4">
            
            {/* TAB 1: 基本资料与身份 */}
            {activeTab === 'tab-profile' && (
              <div className="tab-panel space-y-4 animate-in fade-in duration-200" id="tab-panel-profile">
                <div className="bg-canvas border border-hairline shadow-console-1 rounded-ds-xl p-4 sm:p-5 space-y-5">
                  
                  {/* Panel Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-hairline gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-ink" />
                        <h3 className="text-sm font-bold text-ink uppercase tracking-tight">
                          基本资料与数字身份
                        </h3>
                        <span className="text-[10px] font-sans text-success bg-success-soft px-2 py-0.5 rounded-ds-sm border border-success/30 font-bold">
                          实时广播
                        </span>
                      </div>
                      <p className="text-xs text-ink-secondary mt-1">
                        用于餐车站台身份识别、外送配送呼叫与电子小票出票人称呼。
                      </p>
                    </div>
                    <div className="text-[10.5px] font-sans text-ink-tertiary">
                      上次同步：{lastSyncTime}
                    </div>
                  </div>

                  {/* Avatar Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <label className="text-xs font-bold text-ink uppercase flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-warning" />
                        <span>数字头像设定</span>
                      </label>
                      <span className="text-[11px] text-ink-tertiary font-sans">点击图标一键切换</span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5" id="avatar-container">
                      {avatarPresets.map((icon, idx) => {
                        const isSelected = avatar === icon;
                        return (
                          <button
                            key={icon}
                            type="button"
                            data-avatar-id={idx + 1}
                            onClick={() => setAvatar(icon)}
                            className={`group relative h-12 flex items-center justify-center transition-all rounded-ds cursor-pointer ${
                              isSelected
                                ? 'border-2 border-ink bg-canvas-gray shadow-console-1 scale-102'
                                : 'border border-hairline hover:border-ink/50 bg-canvas hover:bg-canvas-gray'
                            }`}
                          >
                            <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
                            {isSelected && (
                              <span className="absolute -top-1 -right-1 bg-ink text-on-ink w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow-console-1">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Form Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* 昵称 */}
                    <div>
                      <label className="block text-xs font-bold text-ink uppercase mb-1.5" htmlFor="nickname">
                        食客公开昵称 / 操作员名称
                      </label>
                      <div className="relative">
                        <input
                          id="nickname"
                          type="text"
                          value={nickname}
                          maxLength={20}
                          onChange={(e) => setNickname(e.target.value)}
                          placeholder="输入您的称呼"
                          className="w-full text-xs font-semibold px-3 py-2 border border-hairline bg-canvas-gray/40 focus:bg-canvas text-ink focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink rounded-ds transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-sans text-ink-tertiary">
                          {nickname.length}/20
                        </span>
                      </div>
                    </div>

                    {/* 手机号 */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-ink uppercase" htmlFor="phone">
                          绑定手机号 (核心账户凭证)
                        </label>
                        <span className="text-[10px] font-sans text-success font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          已实名核验
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          id="phone"
                          type="text"
                          value={phone}
                          readOnly
                          className="w-full text-xs font-sans px-3 py-2 border border-hairline bg-canvas-gray text-ink-secondary focus:outline-none cursor-not-allowed rounded-ds"
                        />
                        <Lock className="w-3.5 h-3.5 text-icon-muted absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    {/* 性别选择 */}
                    <div>
                      <label className="block text-xs font-bold text-ink uppercase mb-1.5">
                        性别偏好 (称谓使用)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { val: 'secret', label: '保密' },
                          { val: 'male', label: '先生' },
                          { val: 'female', label: '女士' }
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setGender(item.val as any)}
                            className={`py-2 text-xs font-bold border rounded-ds cursor-pointer transition-all ${
                              gender === item.val
                                ? 'bg-ink border-ink text-on-ink shadow-console-1'
                                : 'bg-canvas border-hairline text-ink-secondary hover:border-ink/40'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 生日 */}
                    <div>
                      <label className="block text-xs font-bold text-ink uppercase mb-1.5" htmlFor="birthday">
                        生日 (享会员日专属双倍积分)
                      </label>
                      <div className="relative">
                        <input
                          id="birthday"
                          type="text"
                          value={birthday}
                          onChange={(e) => setBirthday(e.target.value)}
                          placeholder="YYYY/MM/DD (例如 1990/01/01)"
                          className="w-full text-xs font-sans px-3 py-2 border border-hairline bg-canvas-gray/40 focus:bg-canvas text-ink focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink rounded-ds transition-all"
                        />
                        <Calendar className="w-3.5 h-3.5 text-icon-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* 个性签名 / 业务身份 */}
                  <div>
                    <label className="block text-xs font-bold text-ink uppercase mb-1.5" htmlFor="bio">
                      个性签名 / 站台运营职务备注
                    </label>
                    <textarea
                      id="bio"
                      rows={2}
                      value={bio}
                      maxLength={60}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="写下您的点单偏好或业务备注..."
                      className="w-full text-xs px-3 py-2 border border-hairline bg-canvas-gray/40 focus:bg-canvas text-ink focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink rounded-ds transition-all resize-none"
                    />
                    <div className="flex justify-between items-center text-[10px] text-ink-tertiary mt-1 font-sans">
                      <span>此内容将在站台呼叫屏与订单流水日志中作为备用字段呈现</span>
                      <span>{bio.length}/60</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 就餐偏好与策略 */}
            {activeTab === 'tab-preference' && (
              <div className="tab-panel space-y-4 animate-in fade-in duration-200" id="tab-panel-preference">
                <div className="bg-canvas border border-hairline shadow-console-1 rounded-ds-xl p-4 sm:p-5 space-y-5">
                  
                  {/* Panel Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-hairline gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                        <h3 className="text-sm font-bold text-ink uppercase tracking-tight">
                          就餐偏好与出餐策略联动
                        </h3>
                        <span className="text-[10px] font-sans text-warning bg-warning-soft px-2 py-0.5 rounded-ds-sm border border-warning/30 font-bold">
                          后厨联动
                        </span>
                      </div>
                      <p className="text-xs text-ink-secondary mt-1">
                        设置您的辣度基准、环保餐具与自动抵扣规则，下单时无需重复叮嘱。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetToInitial}
                      className="text-xs font-sans text-ink-tertiary hover:text-ink border border-hairline px-2.5 py-1 rounded-ds hover:bg-canvas-gray transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      恢复默认偏好
                    </button>
                  </div>

                  {/* 辣度档位 */}
                  <div>
                    <label className="block text-xs font-bold text-ink uppercase mb-2 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-warning" />
                      <span>默认风味辣度基准 (后厨出餐统一参考)</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: 'none', label: '免辣', desc: '纯鲜原味，不加椒粉' },
                        { id: 'mild', label: '微辣', desc: '少许香辣，提鲜不燥' },
                        { id: 'medium', label: '中辣', desc: '经典川味，过瘾香麻' },
                        { id: 'hot', label: '重辣', desc: '地道川湘，嗜辣专享' }
                      ].map((item) => {
                        const isSelected = spiciness === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSpiciness(item.id as any)}
                            className={`p-3 text-left border rounded-ds cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-ink border-ink text-on-ink shadow-console-1'
                                : 'bg-canvas border-hairline hover:border-ink/40 text-ink'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{item.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-on-ink" />}
                            </div>
                            <span
                              className={`text-[10px] block mt-1 ${
                                isSelected ? 'text-neutral-300' : 'text-ink-tertiary'
                              }`}
                            >
                              {item.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 环保与抵扣策略 Toggles */}
                  <div className="space-y-3 pt-1">
                    {/* 一次性餐具 */}
                    <div className="p-3.5 border border-hairline rounded-ds bg-canvas-gray/30 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Leaf className="w-4 h-4 text-success mt-0.5 shrink-0" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-ink">践行低碳就餐 (免一次性餐具)</span>
                            <span className="text-[9.5px] font-sans text-success bg-success-soft px-1.5 py-0.2 rounded-ds-sm border border-success/30 font-bold">
                              每次点单 +5 积分
                            </span>
                          </div>
                          <p className="text-[11px] text-ink-secondary mt-0.5">
                            开启后外送将默认不配送一次性筷子与勺子，助力减少碳足迹。
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEcoMode(!ecoMode)}
                        className={`w-11 h-6 rounded-ds-pill p-0.5 transition-colors cursor-pointer shrink-0 border ${
                          ecoMode ? 'bg-ink border-ink' : 'bg-hairline border-hairline'
                        }`}
                      >
                        <div
                          className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                            ecoMode ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* 自动满减抵扣 */}
                    <div className="p-3.5 border border-hairline rounded-ds bg-canvas-gray/30 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Tag className="w-4 h-4 text-select mt-0.5 shrink-0" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-ink">自动选用最优满减券与折扣方案</span>
                            <span className="text-[9.5px] font-sans text-select bg-select-soft px-1.5 py-0.2 rounded-ds-sm border border-select-border font-bold">
                              省心立减
                            </span>
                          </div>
                          <p className="text-[11px] text-ink-secondary mt-0.5">
                            结算时由系统算法自动比对优惠券与储值立减，始终应用最大优惠。
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoCoupons(!autoCoupons)}
                        className={`w-11 h-6 rounded-ds-pill p-0.5 transition-colors cursor-pointer shrink-0 border ${
                          autoCoupons ? 'bg-ink border-ink' : 'bg-hairline border-hairline'
                        }`}
                      >
                        <div
                          className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                            autoCoupons ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* 雷达与静音呼叫 */}
                    <div className="p-3.5 border border-hairline rounded-ds bg-canvas-gray/30 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <BellOff className="w-4 h-4 text-icon-default mt-0.5 shrink-0" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-ink">免电话打扰 (仅限短信或雷达提醒)</span>
                          </div>
                          <p className="text-[11px] text-ink-secondary mt-0.5">
                            出餐或送达时仅通过车载雷达推送与短信通知，骑手不主动拨打电话。
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSilentCall(!silentCall)}
                        className={`w-11 h-6 rounded-ds-pill p-0.5 transition-colors cursor-pointer shrink-0 border ${
                          silentCall ? 'bg-ink border-ink' : 'bg-hairline border-hairline'
                        }`}
                      >
                        <div
                          className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                            silentCall ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 常用忌口与特殊要求 */}
                  <div>
                    <label className="block text-xs font-bold text-ink uppercase mb-1.5" htmlFor="dietary-notes">
                      常规忌口标签与叮嘱 (点击快速添加)
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {dietaryPresets.map((tag) => {
                        const isIncluded = dietaryNotes.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleToggleDietaryTag(tag)}
                            className={`text-xs font-sans px-2.5 py-1 rounded-ds-sm border transition-all cursor-pointer ${
                              isIncluded
                                ? 'bg-ink border-ink text-on-ink font-bold shadow-console-1'
                                : 'bg-canvas border-hairline text-ink-secondary hover:border-ink/50'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      id="dietary-notes"
                      type="text"
                      value={dietaryNotes}
                      onChange={(e) => setDietaryNotes(e.target.value)}
                      placeholder="输入其他过敏原或打包注意事项..."
                      className="w-full text-xs px-3 py-2 border border-hairline bg-canvas-gray/40 focus:bg-canvas text-ink focus:outline-none focus:border-ink rounded-ds transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: 常用收货地址簿与调度站台 (全新样式: 会员资料与参数控制台 · 紧凑网格全端自适应版) */}
            {activeTab === 'tab-address' && (
              <div className="tab-panel space-y-4 animate-in fade-in duration-200" id="tab-panel-address">
                <div className="bg-canvas border border-hairline shadow-console-1 rounded-ds-xl p-4 sm:p-5 space-y-4">
                  
                  {/* Panel Header & Console Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-hairline gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-ink" />
                        <h3 className="text-sm font-bold text-ink uppercase tracking-tight">
                          常用送达地址簿与调度站台
                        </h3>
                        <span className="text-[10px] font-sans text-on-ink bg-ink px-2 py-0.5 rounded-ds-sm font-bold">
                          COMPACT GRID · 全端自适应网格
                        </span>
                      </div>
                      <p className="text-xs text-ink-secondary mt-1">
                        双向同步至流动餐车车载 GPS 与骑手专送调度台。支持全端自适应卡片网格。
                      </p>
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <span className="text-xs font-sans text-ink-tertiary bg-canvas-gray px-2.5 py-1 rounded-ds border border-hairline">
                        共 <strong className="text-ink font-amount">{addresses.length}</strong> 处点位
                      </span>
                      <button
                        type="button"
                        id="btn-add-address"
                        onClick={() => {
                          setIsAddingAddress(true);
                          setEditingAddress(null);
                          setAddrName(nickname);
                          setAddrPhone(phone);
                          setAddrLocation('');
                          setAddrHouseNumber('');
                          setAddrDetail('');
                          setAddrRemarks('');
                          setAddrLat(31.2435);
                          setAddrLng(121.469);
                        }}
                        className="px-3.5 py-1.5 bg-ink hover:bg-ink-hover text-on-ink text-xs font-bold transition-all flex items-center shadow-console-1 rounded-ds cursor-pointer active:scale-97"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span>新增地址</span>
                      </button>
                    </div>
                  </div>

                  {/* District Fast Fill Presets Bar (商圈驻点极速载入) */}
                  <div className="bg-canvas-gray/50 border border-hairline rounded-ds p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-ink shrink-0">
                      <Compass className="w-3.5 h-3.5 text-icon-default" />
                      <span>商圈常用点位快速录入：</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5">
                      {PRESET_DISTRICT_ADDRESSES.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className="text-[11px] font-sans bg-canvas hover:bg-canvas-gray text-ink-secondary hover:text-ink border border-hairline px-2 py-0.5 rounded-ds transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="点击快速以此模板载入"
                        >
                          <span className="font-bold text-ink">[{preset.tag}]</span>
                          <span className="truncate max-w-[130px]">{preset.address}</span>
                          <span className="text-ink-tertiary text-[10px]">+导入</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search and Category Filter Toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                    {/* Tag Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                      {(
                        [
                          { key: 'all', label: '全部点位', count: addresses.length },
                          { key: '公司', label: '写字楼', count: addresses.filter((a) => a.tag === '公司').length },
                          { key: '家', label: '住宅公寓', count: addresses.filter((a) => a.tag === '家').length },
                          { key: '学校', label: '高校校区', count: addresses.filter((a) => a.tag === '学校').length },
                          { key: '其他', label: '临时驻点', count: addresses.filter((a) => a.tag === '其他').length }
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setAddressTagFilter(item.key as any)}
                          className={`text-xs font-sans px-2.5 py-1 rounded-ds border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                            addressTagFilter === item.key
                              ? 'bg-ink border-ink text-on-ink font-bold shadow-console-1'
                              : 'bg-canvas border-hairline text-ink-secondary hover:text-ink hover:bg-canvas-gray'
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className="opacity-70 text-[10px]">({item.count})</span>
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-64 shrink-0">
                      <Search className="w-3.5 h-3.5 text-icon-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={addressSearchQuery}
                        onChange={(e) => setAddressSearchQuery(e.target.value)}
                        placeholder="搜索写字楼 / 房间 / 备注..."
                        className="w-full h-8 pl-8 pr-7 text-xs font-sans bg-canvas border border-hairline rounded-ds text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-ink"
                      />
                      {addressSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAddressSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Add / Edit Address Form Modal/Card (Industrial Precision Redesign) */}
                  {(isAddingAddress || editingAddress) && (
                    <div className="p-4 bg-canvas border-2 border-ink rounded-ds-xl space-y-3.5 animate-in fade-in duration-150 shadow-console-2">
                      <div className="flex items-center justify-between text-xs font-bold text-ink border-b border-hairline pb-2.5">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-select" />
                          <span className="text-sm font-bold tracking-tight">
                            {editingAddress ? '编辑送达地址与调度参数' : '录入新常用送达地址与驻点'}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSimulateGpsAutofill}
                            className="text-[11px] font-sans bg-canvas-gray hover:bg-hairline text-ink border border-hairline px-2.5 py-1 rounded-ds cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Crosshair className="w-3 h-3 text-icon-default" />
                            <span>读取当前 GPS 坐标</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingAddress(false);
                              setEditingAddress(null);
                            }}
                            className="text-ink-tertiary hover:text-ink cursor-pointer text-xs p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Recipient info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-ink-secondary mb-1">
                            收件联系人姓名
                          </label>
                          <input
                            type="text"
                            value={addrName}
                            onChange={(e) => setAddrName(e.target.value)}
                            placeholder="收货人姓名"
                            className="w-full h-9 px-3 bg-canvas-gray/40 border border-hairline text-xs font-semibold focus:outline-none focus:bg-canvas focus:border-ink rounded-ds font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-ink-secondary mb-1">
                            联系手机号码
                          </label>
                          <input
                            type="text"
                            value={addrPhone}
                            onChange={(e) => setAddrPhone(e.target.value)}
                            placeholder="联系电话"
                            className="w-full h-9 px-3 bg-canvas-gray/40 border border-hairline text-xs font-sans focus:outline-none focus:bg-canvas focus:border-ink rounded-ds"
                          />
                        </div>
                      </div>

                      {/* Tag selector */}
                      <div>
                        <label className="block text-[11px] font-bold text-ink-secondary mb-1">
                          地址类别标签
                        </label>
                        <div className="flex items-center gap-2">
                          {(['公司', '家', '学校', '其他'] as const).map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setAddrTag(tag)}
                              className={`px-3 py-1 text-xs font-sans font-bold border rounded-ds cursor-pointer transition-all ${
                                addrTag === tag
                                  ? 'bg-ink border-ink text-on-ink shadow-console-1'
                                  : 'bg-canvas border-hairline text-ink-secondary hover:border-ink/50'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Location & House Number */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-ink-secondary mb-1">
                            建筑物 / 园区 / 商圈名称
                          </label>
                          <input
                            type="text"
                            value={addrLocation}
                            onChange={(e) => setAddrLocation(e.target.value)}
                            placeholder="例: 静安大悦城南座办公楼"
                            className="w-full h-9 px-3 bg-canvas-gray/40 border border-hairline text-xs font-semibold focus:outline-none focus:bg-canvas focus:border-ink rounded-ds font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-ink-secondary mb-1">
                            门牌号 / 楼层 / 室号
                          </label>
                          <input
                            type="text"
                            value={addrHouseNumber}
                            onChange={(e) => setAddrHouseNumber(e.target.value)}
                            placeholder="例: 南座8楼801室"
                            className="w-full h-9 px-3 bg-canvas-gray/40 border border-hairline text-xs font-semibold focus:outline-none focus:bg-canvas focus:border-ink rounded-ds font-sans"
                          />
                        </div>
                      </div>

                      {/* Street Detail & Remarks */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-ink-secondary mb-1">
                            详细街道位置
                          </label>
                          <input
                            type="text"
                            value={addrDetail}
                            onChange={(e) => setAddrDetail(e.target.value)}
                            placeholder="例: 西藏北路166号"
                            className="w-full h-9 px-3 bg-canvas-gray/40 border border-hairline text-xs font-sans focus:outline-none focus:bg-canvas focus:border-ink rounded-ds"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-ink-secondary mb-1">
                            外送嘱咐与交接备注
                          </label>
                          <input
                            type="text"
                            value={addrRemarks}
                            onChange={(e) => setAddrRemarks(e.target.value)}
                            placeholder="例: 放前台外卖架 / 到楼下电联"
                            className="w-full h-9 px-3 bg-canvas-gray/40 border border-hairline text-xs font-sans focus:outline-none focus:bg-canvas focus:border-ink rounded-ds"
                          />
                        </div>
                      </div>

                      {/* Coordinates Readout */}
                      {addrLat && addrLng && (
                        <div className="flex items-center gap-2 text-[11px] font-sans text-ink-secondary bg-canvas-gray/60 p-2 rounded-ds border border-hairline">
                          <Navigation className="w-3.5 h-3.5 text-select shrink-0" />
                          <span>绑定的 GPS 空间坐标：{addrLat.toFixed(4)}°N, {addrLng.toFixed(4)}°E (已校准)</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-hairline">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingAddress(false);
                            setEditingAddress(null);
                          }}
                          className="px-3.5 py-1.5 bg-canvas border border-hairline hover:bg-canvas-gray text-ink-secondary text-xs font-bold rounded-ds cursor-pointer"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          id="btn-confirm-save-addr"
                          onClick={handleSaveAddress}
                          className="px-4 py-1.5 bg-ink hover:bg-ink-hover text-on-ink text-xs font-bold rounded-ds cursor-pointer shadow-console-1 active:scale-97"
                        >
                          保存常用地址
                        </button>
                      </div>
                    </div>
                  )}

                  {/* COMPACT GRID: 会员资料与参数控制台 · 紧凑网格全端自适应版 */}
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 items-stretch"
                    id="address-list-container"
                  >
                    {filteredAddresses.map((addr, idx) => {
                      const isDef = !!addr.isDefault;
                      return (
                        <div
                          key={addr.id}
                          id={`address-card-${addr.id}`}
                          className={`rounded-ds-lg p-3.5 transition-all flex flex-col justify-between relative group ${
                            isDef
                              ? 'bg-canvas border-2 border-ink shadow-console-2'
                              : 'bg-canvas border border-hairline hover:border-ink/50 hover:shadow-console-1'
                          }`}
                        >
                          {/* Top Tag & Header Strip */}
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded-ds-sm text-[10px] font-sans font-bold ${
                                    addr.tag === '公司'
                                      ? 'bg-ink text-on-ink'
                                      : addr.tag === '家'
                                      ? 'bg-canvas-gray text-ink border border-hairline'
                                      : addr.tag === '学校'
                                      ? 'bg-select-soft text-select border border-select-border'
                                      : 'bg-canvas-gray text-ink-secondary border border-hairline'
                                  }`}
                                >
                                  {addr.tag}
                                </span>
                                {isDef ? (
                                  <span className="text-[10px] font-sans font-bold bg-ink text-on-ink px-2 py-0.5 rounded-ds-sm flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    默认送达
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-sans text-ink-tertiary">
                                    LOC-{String(idx + 1).padStart(2, '0')}
                                  </span>
                                )}
                              </div>

                              {/* Telemetry coordinate badge */}
                              <div className="text-[10px] font-sans text-ink-tertiary flex items-center gap-1">
                                <Navigation className="w-2.5 h-2.5 text-icon-muted" />
                                <span>{addr.latitude ? `${addr.latitude.toFixed(2)}°N` : '31.24°N'}</span>
                              </div>
                            </div>

                            {/* Address Main Name */}
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-4 h-4 text-icon-default shrink-0 mt-0.5" />
                              <h4 className="text-xs sm:text-sm font-bold text-ink leading-snug break-words">
                                {addr.address}
                              </h4>
                            </div>

                            {/* Detail Street & House Number */}
                            <p className="text-xs font-sans text-ink-secondary mt-1 pl-5.5 leading-relaxed">
                              {addr.detail} {addr.houseNumber ? `· ${addr.houseNumber}` : ''}
                            </p>

                            {/* Contact Person & Phone */}
                            <div className="mt-2.5 pt-2 border-t border-hairline/80 flex items-center justify-between text-xs font-sans text-ink-secondary">
                              <div className="flex items-center gap-1.5 truncate">
                                <User className="w-3 h-3 text-icon-muted shrink-0" />
                                <span className="font-bold text-ink">{addr.name}</span>
                                <span className="text-ink-tertiary">({addr.phone})</span>
                              </div>
                            </div>

                            {/* Remarks Pill */}
                            {addr.remarks && (
                              <div className="mt-2 text-[11px] font-sans text-ink-secondary bg-canvas-gray/80 px-2 py-1 rounded-ds border border-hairline/60 flex items-center gap-1.5 truncate">
                                <span className="text-[9.5px] text-ink-tertiary uppercase font-bold shrink-0">嘱咐:</span>
                                <span className="truncate">{addr.remarks}</span>
                              </div>
                            )}
                          </div>

                          {/* Card Footer Action Toolbar */}
                          <div className="mt-3 pt-2.5 border-t border-hairline flex items-center justify-between gap-1 text-xs font-sans">
                            <div>
                              {!isDef ? (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAddress(addr.id)}
                                  className="text-[10px] font-sans text-ink-secondary hover:text-ink border border-hairline px-2 py-0.5 rounded-ds cursor-pointer bg-canvas hover:bg-canvas-gray transition-colors"
                                >
                                  设为默认
                                </button>
                              ) : (
                                <span className="text-[10px] font-sans text-success font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  极速派送优先
                                </span>
                              )}
                            </div>

                            {/* Right Compact Actions */}
                            <div className="flex items-center space-x-1">
                              {/* Radar Range Test */}
                              <button
                                type="button"
                                onClick={() => handleSimulateRadarCheck(addr)}
                                className="p-1.5 text-icon-default hover:text-ink hover:bg-canvas-gray rounded-ds border border-hairline transition-colors cursor-pointer"
                                title="雷达测距与送达模拟"
                              >
                                <Crosshair className="w-3.5 h-3.5" />
                              </button>

                              {/* Copy Info */}
                              <button
                                type="button"
                                onClick={() => handleCopyAddressInfo(addr)}
                                className="p-1.5 text-icon-default hover:text-ink hover:bg-canvas-gray rounded-ds border border-hairline transition-colors cursor-pointer"
                                title="复制完整联系地址"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAddress(addr);
                                  setIsAddingAddress(false);
                                  setAddrName(addr.name);
                                  setAddrPhone(addr.phone);
                                  setAddrTag(addr.tag);
                                  setAddrLocation(addr.address);
                                  setAddrHouseNumber(addr.houseNumber || '');
                                  setAddrDetail(addr.detail);
                                  setAddrRemarks(addr.remarks || '');
                                  setAddrLat(addr.latitude);
                                  setAddrLng(addr.longitude);
                                }}
                                className="p-1.5 text-icon-default hover:text-ink hover:bg-canvas-gray rounded-ds border border-hairline transition-colors cursor-pointer"
                                title="编辑此地址"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`确定移除常用地址【${addr.address}】？`)) {
                                    handleDeleteAddress(addr.id);
                                  }
                                }}
                                className="p-1.5 text-icon-muted hover:text-danger hover:bg-danger-soft rounded-ds border border-hairline transition-colors cursor-pointer"
                                title="删除地址"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* In-Grid Quick Add Card (Dashed Slot) */}
                    <div
                      onClick={() => {
                        setIsAddingAddress(true);
                        setEditingAddress(null);
                        setAddrName(nickname);
                        setAddrPhone(phone);
                        setAddrLocation('');
                        setAddrHouseNumber('');
                        setAddrDetail('');
                        setAddrRemarks('');
                        setAddrLat(31.2435);
                        setAddrLng(121.469);
                      }}
                      className="border-2 border-dashed border-hairline hover:border-ink/60 bg-canvas-gray/20 hover:bg-canvas transition-all flex flex-col items-center justify-center p-6 rounded-ds-lg cursor-pointer min-h-[170px] group text-center"
                    >
                      <div className="w-9 h-9 rounded-ds bg-canvas border border-hairline flex items-center justify-center text-icon-default group-hover:bg-ink group-hover:text-on-ink group-hover:border-ink transition-colors shadow-2xs mb-2">
                        <Plus className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-ink">新增送达地址点位</span>
                      <span className="text-[10px] font-sans text-ink-tertiary mt-0.5">
                        点击录入写字楼、园区或住宅
                      </span>
                    </div>
                  </div>

                  {/* Empty state when filtering */}
                  {filteredAddresses.length === 0 && (
                    <div
                      id="address-empty-state"
                      className="flex flex-col items-center justify-center py-10 px-4 bg-canvas-gray/30 border border-dashed border-hairline rounded-ds-lg text-center"
                    >
                      <MapPin className="w-7 h-7 text-icon-muted mb-2" />
                      <span className="text-xs text-ink font-bold">未匹配到符合条件的常用地址</span>
                      <span className="text-[11px] text-ink-tertiary mt-0.5">
                        请尝试清除搜索关键词或切换分类标签
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressSearchQuery('');
                          setAddressTagFilter('all');
                        }}
                        className="mt-3 text-xs font-sans text-ink bg-canvas border border-hairline px-3 py-1 rounded-ds hover:bg-canvas-gray cursor-pointer"
                      >
                        重置所有筛选
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: 安全凭据与硬件指纹 */}
            {activeTab === 'tab-security' && (
              <div className="tab-panel space-y-4 animate-in fade-in duration-200" id="tab-panel-security">
                <div className="bg-canvas border border-hairline shadow-console-1 rounded-ds-xl p-4 sm:p-5 space-y-4">
                  
                  {/* Panel Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-hairline gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-ink" />
                        <h3 className="text-sm font-bold text-ink uppercase tracking-tight">
                          云端安全凭据与硬件芯片级指纹
                        </h3>
                        <span className="text-[10px] font-sans text-ink-secondary bg-canvas-gray px-2 py-0.5 rounded-ds-sm border border-hairline font-bold">
                          99.8% 匹配率
                        </span>
                      </div>
                      <p className="text-xs text-ink-secondary mt-1">
                        基于 SHA-256 HMAC 与设备芯片生成的唯一密钥，防止账号盗用与刷单行为。
                      </p>
                    </div>
                    <span className="text-xs font-sans text-success bg-success-soft border border-success/30 px-2.5 py-1 rounded-ds self-start sm:self-auto font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-success" />
                      安全防御生效中
                    </span>
                  </div>

                  {/* Key Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 font-sans">
                    <div className="p-3.5 bg-canvas-gray/50 border border-hairline rounded-ds">
                      <div className="flex justify-between items-center text-ink-tertiary text-[10px] uppercase mb-1">
                        <span>云端用户权威唯一 UID</span>
                        <span className="text-success font-bold">ACTIVE 在线</span>
                      </div>
                      <div className="text-xs text-ink truncate font-bold">
                        merchant_{phone}
                      </div>
                      <div className="text-[10px] text-ink-tertiary mt-1.5">
                        绑定生效时间: {userProfile.createdAt || '2024-01-15 09:20:11 UTC+8'}
                      </div>
                    </div>

                    <div className="p-3.5 bg-canvas-gray/50 border border-hairline rounded-ds">
                      <div className="flex justify-between items-center text-ink-tertiary text-[10px] uppercase mb-1">
                        <span>POS 硬件芯片签名令牌 (HW TOKEN)</span>
                        <span className="text-ink font-bold">ENCRYPTED</span>
                      </div>
                      <div className="text-xs text-ink truncate font-bold flex items-center justify-between">
                        <span>{hwToken}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(hwToken);
                            toast.info('复制成功', '硬件 Token 已复制到剪贴板');
                          }}
                          className="p-1 text-icon-muted hover:text-ink cursor-pointer"
                          title="复制硬件 Token"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[10px] text-ink-tertiary mt-1.5">
                        芯片级防重放攻击 / 双向鉴权校验
                      </div>
                    </div>
                  </div>

                  {/* Reissue Key Box */}
                  <div className="border border-hairline rounded-ds p-3.5 bg-canvas-gray/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-ink-secondary">
                      <KeyRound className="w-4 h-4 text-warning shrink-0" />
                      <div>
                        <span className="font-bold text-ink">更换设备或重装系统：</span>
                        <span className="text-ink-secondary">若检测到硬件指纹变更，需重新签发安全凭证。</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      id="reissue-key-btn"
                      onClick={handleReissueKey}
                      className="w-full sm:w-auto px-3.5 py-1.5 bg-canvas border border-hairline hover:border-ink text-xs font-bold text-ink transition-all rounded-ds cursor-pointer shadow-console-1 active:scale-97 shrink-0"
                    >
                      重新签发密钥
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: 财务账户与流水快照 */}
            {activeTab === 'tab-finance' && (
              <div className="tab-panel space-y-4 animate-in fade-in duration-200" id="tab-panel-finance">
                <div className="bg-canvas border border-hairline shadow-console-1 rounded-ds-xl p-4 sm:p-5 space-y-4">
                  
                  {/* Panel Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-hairline gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-ink" />
                        <h3 className="text-sm font-bold text-ink uppercase tracking-tight">
                          财务账户与流水快照
                        </h3>
                        <span className="text-[10px] font-sans text-ink-secondary bg-canvas-gray px-2 py-0.5 rounded-ds-sm border border-hairline font-bold">
                          实时结算对账
                        </span>
                      </div>
                      <p className="text-xs text-ink-secondary mt-1">
                        查看账户可用储值额度、会员积分变动流水及最近对账明细。
                      </p>
                    </div>
                    <span className="text-xs font-sans text-ink-tertiary">近 30 天结算流水</span>
                  </div>

                  {/* Finance Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
                    <div className="p-3.5 bg-canvas-gray/40 border border-hairline rounded-ds">
                      <span className="text-[10px] text-ink-secondary block uppercase mb-1 font-bold">储值账户可用额度</span>
                      <span className="text-2xl font-black text-ink block leading-tight font-amount">¥{balance.toFixed(2)}</span>
                      <span className="text-[10px] text-ink-tertiary block mt-1">支持全额立减冲抵</span>
                    </div>
                    <div className="p-3.5 bg-canvas-gray/40 border border-hairline rounded-ds">
                      <span className="text-[10px] text-ink-secondary block uppercase mb-1 font-bold">活跃忠诚度积分</span>
                      <span className="text-2xl font-black text-ink block leading-tight font-amount">{points}</span>
                      <span className="text-[10px] text-ink-tertiary block mt-1">100 积分抵扣 ¥1.00</span>
                    </div>
                    <div className="p-3.5 bg-success-soft/30 border border-success/30 rounded-ds">
                      <span className="text-[10px] text-success block uppercase mb-1 font-bold">挂账与待清算款项</span>
                      <span className="text-2xl font-black text-success block leading-tight font-amount">¥0.00</span>
                      <span className="text-[10px] text-success/80 block mt-1">✓ 当前无挂账款项</span>
                    </div>
                  </div>

                  {/* Transaction Filter Tabs */}
                  <div className="flex items-center gap-1.5 border-b border-hairline pb-2 pt-1 font-sans text-xs">
                    {[
                      { key: 'all', label: '全部流水' },
                      { key: 'recharge', label: '在线充值' },
                      { key: 'expense', label: '外送扣款' },
                      { key: 'points', label: '积分奖励' }
                    ].map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFinanceFilter(f.key as any)}
                        className={`px-3 py-1 rounded-ds cursor-pointer transition-all ${
                          financeFilter === f.key
                            ? 'bg-ink text-on-ink font-bold shadow-console-1'
                            : 'text-ink-secondary hover:bg-canvas-gray'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Transaction Rows */}
                  <div className="space-y-2">
                    {filteredFinancialRecords.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-canvas-gray/30 border border-hairline rounded-ds flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-ds flex items-center justify-center shrink-0 ${
                              item.type === 'recharge'
                                ? 'bg-success-soft text-success'
                                : item.type === 'points'
                                ? 'bg-select-soft text-select'
                                : 'bg-canvas-gray text-icon-default'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-ink flex items-center gap-1.5">
                              <span>{item.title}</span>
                              <span className="text-[10px] font-sans text-ink-tertiary bg-canvas px-1.5 py-0.2 rounded-ds-sm border border-hairline">
                                {item.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-ink-tertiary font-sans mt-0.5">
                              {item.sub} · {item.time}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-sans shrink-0">
                          <span
                            className={`text-sm font-bold font-amount ${
                              item.amount.startsWith('+') ? 'text-success' : 'text-ink'
                            }`}
                          >
                            {item.amount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
