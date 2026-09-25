import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Search,
  Check,
  Building2,
  Navigation,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  LocateFixed,
  Loader2,
  Edit3,
  Trash2,
  Plus,
  Phone,
  User,
  Tag,
  FileText,
  ChevronRight,
  ArrowLeft,
  Home,
  Briefcase,
  GraduationCap,
  Star,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getActiveTruckConfig,
  getSavedAddresses,
  saveAddresses,
  getUserLocationState,
  saveUserLocationState,
  requestBrowserGeolocation,
  evaluateDeliveryRange,
  suggestPlaces,
  PlaceSuggestion,
  reverseGeocodeCoordinate,
  isEmbeddedFrame,
  DeliveryAddressItem
} from '../utils/truckLocationEngine';
import { CenterAnchorMap } from './CenterAnchorMap';
import { UserProfile } from '../types/user';
import { safeGetStorage, safeSetStorage } from '../utils/safeStorage';
import { INITIAL_USER_PROFILE } from '../data/mockUser';

interface AddressSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  onSelectAddress: (address: string) => void;
}

/** 地址编辑/补充表单状态 */
interface AddressFormState {
  id?: string;
  title: string; // POI / 小区名 / 写字楼
  detail: string; // 基础街道或逆地理地址
  houseNumber: string; // 小区几幢几楼几室 (核心表单项)
  receiverName: string; // 联系人姓名
  receiverPhone: string; // 联系人电话
  tag: string; // 标签: 家 | 公司 | 学校 | 其他
  remarks: string; // 配送备注 (如: 放门口、敲门等)
  isDefault: boolean;
  latitude: number;
  longitude: number;
  source: 'gps' | 'search' | 'map' | 'manual';
  accuracy?: number;
}

const QUICK_REMARK_TAGS = ['放门口即可', '放前台转交', '送上楼敲门', '放自提柜', '到楼下电话联系', '请勿按门铃'];
const QUICK_DOOR_EXAMPLES = ['3幢2单元1204室', '商务座12楼1204室', '北座8楼前台', '1号楼501室', '沿街商铺 02 号'];

export const AddressSelectorModal: React.FC<AddressSelectorModalProps> = ({
  isOpen,
  onClose,
  currentAddress,
  onSelectAddress
}) => {
  const [truckConfig, setTruckConfig] = useState(() => getActiveTruckConfig());
  const [addresses, setAddresses] = useState<DeliveryAddressItem[]>(() => getSavedAddresses());
  const [userLocation, setUserLocation] = useState(() => getUserLocationState());
  const [isLocating, setIsLocating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [geoText, setGeoText] = useState('');
  const [geoing, setGeoing] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  // 管理模式 (批量修改/删除/设为默认)
  const [isManageMode, setIsManageMode] = useState(false);

  // 表单打开状态 (用于 GPS定位后补充表单、新增或修改地址)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<AddressFormState>({
    title: '',
    detail: '',
    houseNumber: '',
    receiverName: '',
    receiverPhone: '',
    tag: '家',
    remarks: '',
    isDefault: false,
    latitude: 31.2435,
    longitude: 121.469,
    source: 'manual'
  });

  // 删除确认 ID
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 地图状态
  const [mapFly, setMapFly] = useState<{ lat: number; lng: number; seq: number } | undefined>(undefined);
  const [mapOpen, setMapOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // 地图初始居中坐标
  const [mapInitial, setMapInitial] = useState<{ lat: number; lng: number }>(() => {
    const ul = getUserLocationState();
    if (ul.source === 'gps' && ul.latitude && !ul.isFallback) return { lat: ul.latitude, lng: ul.longitude };
    const t = getActiveTruckConfig();
    return { lat: t.latitude, lng: t.longitude };
  });
  const [mapKey] = useState(() => `addr-center-map-${Date.now()}`);

  const embed = isEmbeddedFrame();

  // 同步保存到系统 Profile
  const syncToUserProfile = (list: DeliveryAddressItem[]) => {
    try {
      const profile = safeGetStorage<UserProfile>('obsidian_user_profile', INITIAL_USER_PROFILE);
      if (profile) {
        const syncedUserAddresses = list.map((item, idx) => ({
          id: item.id || `addr-${idx}`,
          name: item.receiverName || profile.nickname || '先锋食客',
          phone: item.receiverPhone || profile.phone || '138-8888-9201',
          tag: (['公司', '家', '学校', '其他'].includes(item.tag) ? item.tag : '其他') as any,
          address: item.title || item.detail,
          detail: item.houseNumber ? `${item.detail} ${item.houseNumber}` : item.detail,
          isDefault: !!item.isDefault,
          remarks: item.remarks,
          createdAt: item.createdAt || new Date().toLocaleString(),
          latitude: item.latitude,
          longitude: item.longitude
        }));
        safeSetStorage('obsidian_user_profile', { ...profile, addresses: syncedUserAddresses });
      }
    } catch (e) {
      console.error('Failed to sync addresses to user profile', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const saved = getSavedAddresses();
      setTruckConfig(getActiveTruckConfig());
      setAddresses(saved);
      setUserLocation(getUserLocationState());
      setGeoText('');
      setIsFormOpen(false);
      setIsManageMode(false);
      setDeletingId(null);
      setMapOpen(false);
      setMapFly(undefined);

      const ul = getUserLocationState();
      if (ul.source === 'gps' && ul.latitude && !ul.isFallback) {
        setMapInitial({ lat: ul.latitude, lng: ul.longitude });
      } else {
        const t = getActiveTruckConfig();
        setMapInitial({ lat: t.latitude, lng: t.longitude });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  /** 获取当前用户的预设联系人信息 */
  const getDefaultContact = () => {
    const profile = safeGetStorage<UserProfile>('obsidian_user_profile', INITIAL_USER_PROFILE);
    return {
      name: profile.nickname || '先锋食客',
      phone: profile.phone || '138-8888-9201'
    };
  };

  /** 触发 GPS 定位并直接带出补充表单 (解决用户核心痛点: GPS 定位后补充几幢几楼几室、电话、姓名、备注) */
  const handleTriggerGPS = async () => {
    setIsLocating(true);
    const result = await requestBrowserGeolocation();
    setIsLocating(false);
    setUserLocation(getUserLocationState());

    if (result.success && result.latitude) {
      const contact = getDefaultContact();
      const poiTitle = userLocation.locationName || '我的 GPS 实时位置';
      const roadDetail = userLocation.addressDetail || '当前高精度定位点';

      // 开启详细补充表单
      setIsFormOpen(true);
      setFormState({
        title: poiTitle,
        detail: roadDetail,
        houseNumber: '', // 留空提示用户填写几幢几楼几室
        receiverName: contact.name,
        receiverPhone: contact.phone,
        tag: '家',
        remarks: '',
        isDefault: false,
        latitude: result.latitude,
        longitude: result.longitude,
        source: 'gps',
        accuracy: result.accuracy
      });

      setMapFly({ lat: result.latitude, lng: result.longitude, seq: Date.now() });
      showToast(`已获取 GPS 定位，请补充门牌号与联系方式`);
    } else {
      const reason = (result as any).blockReason;
      if (reason === 'iframe-policy') {
        showToast('预览内嵌页拦截定位授权。请在下方搜索输入地址，或在新标签页打开');
      } else if (reason === 'denied') {
        showToast('定位权限被拒绝，请允许定位后重试');
      } else {
        showToast(`GPS 定位失败(${result.error || '未知错误'})，请使用搜索或地图选点`);
      }
    }
  };

  /** 打开新增地址表单 */
  const handleOpenAddForm = () => {
    const contact = getDefaultContact();
    const ul = getUserLocationState();
    setIsFormOpen(true);
    setFormState({
      title: ul.locationName || '上海市静安区大悦城',
      detail: ul.addressDetail || '西藏北路 166 号',
      houseNumber: '',
      receiverName: contact.name,
      receiverPhone: contact.phone,
      tag: '家',
      remarks: '',
      isDefault: addresses.length === 0,
      latitude: ul.latitude || truckConfig.latitude,
      longitude: ul.longitude || truckConfig.longitude,
      source: 'manual'
    });
  };

  /** 打开编辑已有地址表单 */
  const handleOpenEditForm = (addr: DeliveryAddressItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const contact = getDefaultContact();
    setIsFormOpen(true);
    setFormState({
      id: addr.id,
      title: addr.title,
      detail: addr.detail,
      houseNumber: addr.houseNumber || '',
      receiverName: addr.receiverName || contact.name,
      receiverPhone: addr.receiverPhone || contact.phone,
      tag: addr.tag || '家',
      remarks: addr.remarks || '',
      isDefault: !!addr.isDefault,
      latitude: addr.latitude,
      longitude: addr.longitude,
      source: 'manual'
    });
  };

  /** 删除已有地址 */
  const handleDeleteAddress = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (addresses.length <= 1) {
      showToast('至少保留一个常用地址');
      return;
    }
    const updated = addresses.filter((a) => a.id !== id);
    setAddresses(updated);
    saveAddresses(updated);
    syncToUserProfile(updated);
    setDeletingId(null);
    showToast('地址已从地址簿删除');
  };

  /** 设为默认地址 */
  const handleSetDefault = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id
    }));
    setAddresses(updated);
    saveAddresses(updated);
    syncToUserProfile(updated);
    showToast('已设为默认地址');
  };

  /** 搜索联想处理 */
  const handleSearchInput = async (v: string) => {
    setGeoText(v);
    const q = v.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    setGeoing(true);
    const items = await suggestPlaces(q);
    setGeoing(false);
    if (items.length) {
      setSuggestions(items);
      setSuggestOpen(true);
    } else {
      setSuggestions([]);
      setSuggestOpen(false);
    }
  };

  /** 选中搜索推荐结果 -> 自动填充并打开详细补充表单 */
  const pickSuggestion = (s: PlaceSuggestion) => {
    const contact = getDefaultContact();
    setSuggestions([]);
    setSuggestOpen(false);
    setGeoText('');
    setIsFormOpen(true);
    setFormState((prev) => ({
      ...prev,
      title: s.title,
      detail: s.detail,
      latitude: s.latitude,
      longitude: s.longitude,
      receiverName: prev.receiverName || contact.name,
      receiverPhone: prev.receiverPhone || contact.phone,
      source: 'search'
    }));
    setMapFly({ lat: s.latitude, lng: s.longitude, seq: Date.now() });
    showToast('已选定位置，请补充门牌号与联系方式');
  };

  /** 地图中心十字准星移动回填 */
  const handleMapResolve = (name: string, detail: string, lat: number, lng: number) => {
    if (isFormOpen) {
      setFormState((prev) => ({
        ...prev,
        title: name || prev.title || '地图选点',
        detail: detail || prev.detail || '',
        latitude: lat,
        longitude: lng
      }));
    }
  };

  /** 保存表单 (可选: 保存并立即作为本单送达地址，或仅存入地址簿) */
  const handleSaveForm = async (commitToOrder: boolean = true) => {
    if (saving) return;

    if (!formState.title.trim() && !formState.detail.trim()) {
      showToast('请选择或输入位置定位点');
      return;
    }
    if (!formState.receiverPhone.trim()) {
      showToast('请填写联系人手机号');
      return;
    }

    setSaving(true);

    // 格式化合成完整送达地址字串 (包含小区、门牌号)
    const compositeDetail = formState.houseNumber.trim()
      ? `${formState.title} ${formState.houseNumber.trim()}`
      : formState.detail.trim() || formState.title.trim();

    const isEdit = !!formState.id;
    const targetId = formState.id || `addr-${Date.now()}`;

    const newRecord: DeliveryAddressItem = {
      id: targetId,
      title: formState.title.trim() || '自定送达点',
      detail: compositeDetail,
      latitude: formState.latitude,
      longitude: formState.longitude,
      tag: formState.tag,
      isDefault: formState.isDefault,
      receiverName: formState.receiverName.trim() || '先锋食客',
      receiverPhone: formState.receiverPhone.trim(),
      houseNumber: formState.houseNumber.trim(),
      remarks: formState.remarks.trim(),
      createdAt: new Date().toLocaleString()
    };

    let updatedList: DeliveryAddressItem[];
    if (isEdit) {
      updatedList = addresses.map((a) => {
        if (a.id === targetId) {
          return newRecord;
        }
        return formState.isDefault ? { ...a, isDefault: false } : a;
      });
    } else {
      const rest = formState.isDefault ? addresses.map((a) => ({ ...a, isDefault: false })) : addresses;
      updatedList = [newRecord, ...rest];
    }

    setAddresses(updatedList);
    saveAddresses(updatedList);
    syncToUserProfile(updatedList);

    // 记住用户定位状态
    saveUserLocationState({
      latitude: formState.latitude,
      longitude: formState.longitude,
      locationName: formState.title,
      addressDetail: compositeDetail,
      source: formState.source === 'gps' ? 'gps' : 'manual',
      accuracy: formState.accuracy,
      isFallback: false
    });
    setUserLocation(getUserLocationState());

    setSaving(false);

    if (commitToOrder) {
      onSelectAddress(compositeDetail);
      showToast('配送地址已保存并切换');
      onClose();
    } else {
      setIsFormOpen(false);
      showToast('地址已成功存入地址簿');
    }
  };

  /** 直接点击已有地址选用 */
  const handleSelectExisting = (item: DeliveryAddressItem) => {
    if (isManageMode) return;
    onSelectAddress(item.detail);
    onClose();
  };

  // 当前表单位置与餐车的距离核算
  const formEvaluation = evaluateDeliveryRange(
    truckConfig,
    { latitude: formState.latitude, longitude: formState.longitude },
    'delivery'
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#f9f9f7] w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-150">
      {/* 全屏平铺页面容器 - 取消弹窗设计与黑色遮罩 */}
      <div className="relative bg-[#f9f9f7] w-full h-full flex-1 flex flex-col overflow-hidden rounded-none border-0 shadow-none">
        {/* Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-[70] bg-black text-white text-xs px-3.5 py-1.5 rounded-full shadow-lg border border-white/20 whitespace-nowrap"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header - 全屏通栏导航栏 */}
        <div className="p-3.5 sm:p-4 border-b border-[#e2e3e1] bg-white flex items-center justify-between shrink-0 shadow-xs sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={isFormOpen ? () => setIsFormOpen(false) : onClose}
              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-black cursor-pointer transition-colors shrink-0"
              title="返回"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-black truncate">
                {isFormOpen
                  ? formState.id
                    ? '编辑送达地址与门牌号'
                    : '补充收货门牌与联系方式'
                  : '送达地址选择与管理'}
              </h3>
              <p className="text-[11px] text-[#787770] truncate">
                【{truckConfig.name}】专送半径{' '}
                <span className="font-bold text-emerald-700 tabular-nums">
                  {truckConfig.deliveryRadiusKm.toFixed(1)} km
                </span>{' '}
                · 共 {addresses.length} 个地址
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isFormOpen && (
              <>
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增地址</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsManageMode((v) => !v)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
                    isManageMode
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{isManageMode ? '完成' : '管理'}</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="关闭平铺页"
            >
              <span>退出</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Switch between Form View and List View */}
        <div className="overflow-y-auto hide-scrollbar flex-1">
          {isFormOpen ? (
            /* ========================================================= */
            /* 1. 详细表单视图：补充小区几幢几楼几室、电话姓名、配送备注 */
            /* ========================================================= */
            <div className="p-3.5 sm:p-4 space-y-3.5 animate-in fade-in duration-150">
              {/* 定位锚点与配送范围 */}
              <div className="p-3 rounded-xl border border-neutral-200 bg-[#f9f9f7] space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <LocateFixed className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-black">{formState.title || '定位锚点'}</span>
                        {formState.source === 'gps' && (
                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-1 py-0.2 rounded tabular-nums">
                            GPS ±{formState.accuracy ? Math.round(formState.accuracy) : 10}m
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6b6a65] mt-0.5 truncate">
                        {formState.detail || '经纬度定位位置'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleTriggerGPS}
                      disabled={isLocating}
                      className="px-2 py-1 rounded bg-white hover:bg-neutral-100 border border-neutral-200 text-[10.5px] font-bold text-neutral-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isLocating ? 'animate-spin' : ''}`} />
                      <span>重定</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapOpen((v) => !v)}
                      className={`px-2 py-1 rounded text-[10.5px] font-bold flex items-center gap-1 cursor-pointer border ${
                        mapOpen
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      <Navigation className="w-2.5 h-2.5" />
                      <span>{mapOpen ? '收起地图' : '微调地图'}</span>
                    </button>
                  </div>
                </div>

                {/* 配送范围判定 */}
                <div className="pt-1 flex items-center gap-2 border-t border-neutral-200/60 text-[10px]">
                  {formEvaluation.isOutOfRange ? (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded">
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                      距餐车 {formEvaluation.distanceKm.toFixed(2)}km · 超出 {formEvaluation.exceededKm.toFixed(2)}km
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-1.5 py-0.5 rounded">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      距餐车 {formEvaluation.distanceKm.toFixed(2)}km · 专送覆盖中
                    </span>
                  )}
                  <span className="text-[#9a937f] tabular-nums text-[9px] truncate">
                    {formState.latitude.toFixed(4)}, {formState.longitude.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* 微调地图组件 */}
              {mapOpen && (
                <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-inner">
                  <CenterAnchorMap
                    key={mapKey}
                    initialLat={formState.latitude}
                    initialLng={formState.longitude}
                    height={190}
                    flyTo={mapFly}
                    onResolve={handleMapResolve}
                  />
                  <div className="p-1.5 bg-[#f5f5f2] text-[9.5px] text-[#787770] flex items-center justify-between">
                    <span>拖动中心锚点微调实际楼栋位置</span>
                    <button
                      type="button"
                      onClick={() => setMapOpen(false)}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      收起
                    </button>
                  </div>
                </div>
              )}

              {/* 核心表单区域 */}
              <div className="space-y-3 pt-1">
                {/* 1. 几幢几楼几室 (重点补充项) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-black flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>小区 / 几幢几楼几室 / 门牌号</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <span className="text-[10px] text-[#8e8d87]">骑手配送必看</span>
                  </div>
                  <input
                    type="text"
                    value={formState.houseNumber}
                    onChange={(e) => setFormState({ ...formState, houseNumber: e.target.value })}
                    placeholder="例：3号楼2单元1204室 / 商务座12楼前台"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none font-medium"
                  />
                  {/* 快捷推荐门牌补全 */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <span className="text-[9.5px] text-[#9a937f]">快捷预设:</span>
                    {QUICK_DOOR_EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => setFormState({ ...formState, houseNumber: ex })}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 tabular-nums transition-colors cursor-pointer"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. 联系人姓名与称谓 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-black flex items-center gap-1 mb-1">
                      <User className="w-3.5 h-3.5 text-emerald-700" />
                      <span>联系人姓名</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={formState.receiverName}
                        onChange={(e) => setFormState({ ...formState, receiverName: e.target.value })}
                        placeholder="例：张先生"
                        className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none font-medium"
                      />
                      <div className="flex rounded-lg border border-neutral-200 overflow-hidden shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const base = formState.receiverName.replace(/先生|女士/g, '').trim();
                            setFormState({ ...formState, receiverName: `${base} 先生`.trim() });
                          }}
                          className="px-2 py-1.5 text-[10px] font-bold bg-neutral-50 hover:bg-neutral-100 border-r border-neutral-200 cursor-pointer"
                        >
                          先生
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const base = formState.receiverName.replace(/先生|女士/g, '').trim();
                            setFormState({ ...formState, receiverName: `${base} 女士`.trim() });
                          }}
                          className="px-2 py-1.5 text-[10px] font-bold bg-neutral-50 hover:bg-neutral-100 cursor-pointer"
                        >
                          女士
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. 联系电话 */}
                  <div>
                    <label className="text-xs font-bold text-black flex items-center gap-1 mb-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-700" />
                      <span>联系电话</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formState.receiverPhone}
                      onChange={(e) => setFormState({ ...formState, receiverPhone: e.target.value })}
                      placeholder="例：138-8888-9201"
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none font-medium tabular-nums"
                    />
                  </div>
                </div>

                {/* 4. 地址标签 */}
                <div>
                  <label className="text-xs font-bold text-black flex items-center gap-1 mb-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-700" />
                    <span>地址标签</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {[
                      { key: '家', icon: Home },
                      { key: '公司', icon: Briefcase },
                      { key: '学校', icon: GraduationCap },
                      { key: '其他', icon: Tag }
                    ].map(({ key, icon: IconComp }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormState({ ...formState, tag: key })}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          formState.tag === key
                            ? 'bg-black text-white border-black shadow-xs'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        <IconComp className="w-3 h-3" />
                        <span>{key}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. 配送备注 (骑手交代) */}
                <div>
                  <label className="text-xs font-bold text-black flex items-center gap-1 mb-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    <span>配送备注与交接偏好</span>
                  </label>
                  <input
                    type="text"
                    value={formState.remarks}
                    onChange={(e) => setFormState({ ...formState, remarks: e.target.value })}
                    placeholder="例：放门口即可 / 到楼下请电话联系"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none font-medium"
                  />
                  {/* 快捷备注标签 */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {QUICK_REMARK_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setFormState({ ...formState, remarks: tag })}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-medium transition-colors cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. 设为默认地址开关 */}
                <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
                  <span className="text-xs font-bold text-black flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    <span>设为默认收货地址</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={formState.isDefault}
                    onChange={(e) => setFormState({ ...formState, isDefault: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* 表单底部提交按键 */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveForm(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-black cursor-pointer transition-colors"
                >
                  存入常用地址簿
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveForm(true)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>保存并选用</span>
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* 2. 地址列表视图：选择、修改管理、GPS 快速定位与搜索入口 */
            /* ========================================================= */
            <div>
              {/* GPS 极速识别 Bar */}
              <div className="px-3.5 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-2 text-xs shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Navigation className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="text-[11.5px] text-emerald-950 truncate">
                    定位: <span className="font-semibold">{userLocation.locationName}</span>
                  </span>
                  {userLocation.source === 'gps' && !userLocation.isFallback && userLocation.accuracy ? (
                    <span className="shrink-0 text-[9.5px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-1 py-0.5 rounded">
                      ±{Math.round(userLocation.accuracy)}m
                    </span>
                  ) : null}
                </div>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleTriggerGPS}
                  disabled={isLocating}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? '定位中...' : '重新定位GPS'}</span>
                </motion.button>
              </div>

              {/* 搜索框 (联想下拉) */}
              <div className="px-3.5 pt-3 pb-1 space-y-1.5">
                <div className="relative">
                  <div className="flex items-center gap-2 bg-[#fbfbfa] border border-[#d3d1cb] rounded-xl px-2.5 focus-within:border-emerald-700 transition-colors">
                    <Search className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <input
                      type="text"
                      value={geoText}
                      onChange={(e) => handleSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && suggestions[0]) pickSuggestion(suggestions[0]);
                      }}
                      placeholder="搜索小区 / 道路 / 商圈 (如: 大悦城、三宝郡庭)"
                      className="flex-1 min-w-0 py-2 bg-transparent outline-none text-xs font-medium"
                    />
                    {geoing && <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400 shrink-0" />}
                  </div>

                  {suggestOpen && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e2e3e1] rounded-xl shadow-lg z-[80] max-h-52 overflow-y-auto hide-scrollbar">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-[#9a937f] flex items-center gap-1 border-b border-[#f2f2ef]">
                        <Sparkles className="w-3 h-3 text-[#d9730d]" />
                        <span>搜索结果 — 点击选定并补充门牌号</span>
                      </div>
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => pickSuggestion(s)}
                          className="w-full text-left px-3 py-2 hover:bg-[#f5f5f2] border-b border-[#f2f2ef] last:border-0 flex items-start gap-2 cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                          <span className="min-w-0">
                            <span className="block text-xs font-bold text-[#37352f] truncate">{s.title}</span>
                            <span className="block text-[10.5px] text-[#787774] truncate">{s.detail}</span>
                          </span>
                          <span className="ml-auto shrink-0 text-[9px] tabular-nums px-1 py-0.5 rounded bg-neutral-100 text-neutral-500 self-center">
                            {s.source === 'amap' ? '高德' : 'OSM'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 常用地址卡片列表 */}
              <div className="px-3.5 pt-2 pb-1.5 flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-[#9a937f] flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {isManageMode ? '地址管理模式 (可修改、删除、设为默认)' : '已保存地址簿 — 点击直接选用'}
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>添加新地址</span>
                </button>
              </div>

              <div className="px-3.5 pb-3.5 space-y-2.5">
                {addresses.map((item) => {
                  const isSelected =
                    currentAddress === item.detail ||
                    currentAddress.includes(item.title) ||
                    (item.houseNumber && currentAddress.includes(item.houseNumber));

                  const evalResult = evaluateDeliveryRange(
                    truckConfig,
                    {
                      latitude: item.latitude,
                      longitude: item.longitude
                    },
                    'delivery'
                  );
                  const isOutOfRange = evalResult.isOutOfRange;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectExisting(item)}
                      className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-2.5 relative group ${
                        isSelected && !isManageMode
                          ? 'border-2 border-emerald-600 bg-emerald-50/70 shadow-xs'
                          : isOutOfRange
                          ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
                          : 'border-[#e2e3e1] bg-white hover:bg-[#f9f9f7]'
                      } ${!isManageMode ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected && !isManageMode
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : isOutOfRange
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span
                              className={`text-xs font-bold truncate ${
                                isSelected && !isManageMode ? 'text-emerald-800 font-black' : 'text-black'
                              }`}
                            >
                              {item.title}
                            </span>
                            <span
                              className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold border ${
                                item.tag === '家'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : item.tag === '公司'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : item.tag === '学校'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-[#eeeeec] text-[#474741] border-neutral-200'
                              }`}
                            >
                              {item.tag}
                            </span>
                            {item.isDefault && (
                              <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold border border-emerald-200">
                                默认
                              </span>
                            )}
                          </div>

                          {/* 门牌号与完整地址 */}
                          <p
                            className={`text-[11.5px] leading-snug line-clamp-2 ${
                              isSelected && !isManageMode ? 'text-emerald-900 font-medium' : 'text-[#37352f]'
                            }`}
                          >
                            {item.detail}
                          </p>

                          {/* 联系人姓名与电话 */}
                          <div className="mt-1 flex items-center gap-2 text-[10.5px] text-[#787770]">
                            <span className="font-semibold text-neutral-800">
                              {item.receiverName || '先锋食客'}
                            </span>
                            <span>{item.receiverPhone || '138-8888-9201'}</span>
                            {item.remarks && (
                              <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1 py-0.2 rounded">
                                备注: {item.remarks}
                              </span>
                            )}
                          </div>

                          {/* 配送范围评估 */}
                          <div className="mt-1.5 flex items-center gap-2">
                            {isOutOfRange ? (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.2 rounded">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                                距餐车 {evalResult.distanceKm.toFixed(2)}km · 超出 {evalResult.exceededKm.toFixed(2)}km
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                距餐车 {evalResult.distanceKm.toFixed(2)}km · 专送覆盖中
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 卡片右侧操作区域 */}
                      <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                        {/* 常用模式下的编辑入口 */}
                        <button
                          type="button"
                          title="修改此地址"
                          onClick={(e) => handleOpenEditForm(item, e)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* 管理模式下的扩展功能 */}
                        {isManageMode ? (
                          <div className="flex items-center gap-1">
                            {!item.isDefault && (
                              <button
                                type="button"
                                title="设为默认地址"
                                onClick={(e) => handleSetDefault(item.id, e)}
                                className="px-1.5 py-1 text-[10px] font-bold rounded text-neutral-600 hover:bg-neutral-100 border border-neutral-200 cursor-pointer"
                              >
                                设默认
                              </button>
                            )}

                            {deletingId === item.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteAddress(item.id, e)}
                                  className="px-1.5 py-1 text-[10px] font-bold rounded bg-rose-600 text-white cursor-pointer"
                                >
                                  确认删
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingId(null);
                                  }}
                                  className="px-1 py-1 text-[10px] text-neutral-500 cursor-pointer"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                title="删除此地址"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(item.id);
                                }}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-neutral-300 bg-white group-hover:border-neutral-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#f9f9f7] border-t border-[#e2e3e1] flex items-center justify-between text-xs text-[#787770] shrink-0">
          <span className="truncate pr-2">餐车停靠: {truckConfig.locationName}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs shrink-0"
          >
            {isFormOpen ? '关闭' : '完成'}
          </button>
        </div>
      </div>
    </div>
  );
};
