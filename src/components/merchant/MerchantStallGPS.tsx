import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  MapPin,
  Radio,
  Search,
  Navigation,
  Check,
  KeyRound,
  Lock,
  Unlock,
  Store,
  Moon,
  Building2,
  Plus,
  Minus,
  RotateCcw,
  LocateFixed,
  Sliders,
  FileText,
  Activity,
  Image as ImageIcon
} from 'lucide-react';
import { TruckInfo } from '../../types';
import { TruckQuickConfigModal } from './TruckQuickConfigModal';
import {
  getAllTruckConfigs,
  saveTruckConfig,
  getActiveTruckConfig,
  setActiveTruckId,
  TruckLocationConfig,
  saveAmapWebKey,
  geocodeAddress,
  PlaceSuggestion,
  suggestPlaces,
  getTruckTheme,
  calculateGeodesicDistanceKm,
  recordStallRelocationAudit,
  requestBrowserGeolocation,
  DEFAULT_TRUCK_CONFIGS
} from '../../utils/truckLocationEngine';
import { TruckLocationMapPicker } from './TruckLocationMapPicker';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';
import { pushTruckLocationToCloud, syncSingleModuleToCloud } from '../../utils/cloudbase';

interface MerchantStallGPSProps {
  truck: TruckInfo;
  onUpdateLocation: (newLocation: string, radiusKm: number, coords?: [number, number]) => void;
  showToast: (msg: string) => void;
}

// 每个餐车独立的自动保存草稿 key
const draftKeyFor = (truckId: string) => `obsidian_gps_draft_${truckId}`;

interface GpsDraft {
  locationName: string;
  fenceRadius: number;
  pinLat: number;
  pinLng: number;
  stallStatus: 'open' | 'transit' | 'closed';
  savedAt: string;
}

// 常用快捷商圈图钉 (上海静安大悦城核心商圈周边 1~3km 连续性驻泊位，彻底消除跨省市坐标跳跃)
const QUICK_LANDMARKS = [
  { name: '大悦城南广场', locationName: '西藏北路曲阜路 · 大悦城南广场', lat: 31.2435, lng: 121.4690, radius: 3.0 },
  { name: '北座中庭连廊', locationName: '静安大悦城北座办公楼连廊', lat: 31.2450, lng: 121.4680, radius: 2.5 },
  { name: '曲阜路地铁口', locationName: '曲阜路地铁站 1/5 号出口接驳位', lat: 31.2428, lng: 121.4698, radius: 2.0 },
  { name: '万象天地西里', locationName: '苏河湾万象天地西里广场', lat: 31.2442, lng: 121.4725, radius: 3.0 },
  { name: '七浦路步行街', locationName: '七浦路时尚步行街连廊外摆位', lat: 31.2458, lng: 121.4752, radius: 3.5 }
];

export const MerchantStallGPS: React.FC<MerchantStallGPSProps> = ({
  truck,
  onUpdateLocation,
  showToast
}) => {
  const [allTrucks, setAllTrucks] = useState<TruckLocationConfig[]>(() => getAllTruckConfigs());
  const [selectedTruckId, setSelectedTruckId] = useState<string>(() => getActiveTruckConfig().id);
  const currentTruckConfig = allTrucks.find((t) => t.id === selectedTruckId) || allTrucks[0];

  const [stallStatus, setStallStatus] = useState<'open' | 'transit' | 'closed'>('open');
  const [locationName, setLocationName] = useState(currentTruckConfig.locationName);
  const [locationDetail, setLocationDetail] = useState('');
  const [fenceRadius, setFenceRadius] = useState<number>(currentTruckConfig.deliveryRadiusKm);
  const [pinLat, setPinLat] = useState<number>(currentTruckConfig.latitude);
  const [pinLng, setPinLng] = useState<number>(currentTruckConfig.longitude);

  // 候选坐标 Ref: 广播时直接取 ref 保证无闭包滞后
  const pinRef = useRef<{ lat: number; lng: number }>({ lat: pinLat, lng: pinLng });
  pinRef.current = { lat: pinLat, lng: pinLng };

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  // 位置锁定开关: 默认「查看模式」
  const [locationLocked, setLocationLocked] = useState<boolean>(true);
  const locationLockedRef = useRef(true);
  locationLockedRef.current = locationLocked;

  // 地图飞行目标 (seq 变化触发)
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; seq: number } | undefined>(undefined);

  // 自动保存草稿
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const autosaveTimer = useRef<number | null>(null);
  const skipAutosaveRef = useRef(true);

  // 搜索与智能联想
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  // 主厨通告、驻点真实数据与车载硬件工况配置模态框
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // 高德 Key 配置展开
  const [amapKeyOpen, setAmapKeyOpen] = useState(false);
  const [amapKeyText, setAmapKeyText] = useState<string>('');
  const [customKeyActive, setCustomKeyActive] = useState<boolean>(() => {
    try {
      return !!(localStorage.getItem('obsidian_amap_web_key') || '').trim();
    } catch {
      return false;
    }
  });

  // 辅助信息面板展开
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);

  // 从草稿恢复单个餐车
  const loadDraftFor = (truckId: string, target: TruckLocationConfig) => {
    try {
      const raw = localStorage.getItem(draftKeyFor(truckId));
      if (!raw) return;
      const draft = JSON.parse(raw) as GpsDraft;
      if (!draft || typeof draft.pinLat !== 'number') return;
      setLocationName(draft.locationName ?? target.locationName);
      setFenceRadius(draft.fenceRadius ?? target.deliveryRadiusKm);
      setPinLat(draft.pinLat);
      setPinLng(draft.pinLng);
      setStallStatus(draft.stallStatus ?? target.status ?? 'open');
      setHasDraft(true);
      setLastAutoSave(draft.savedAt || null);
    } catch {
      /* ignore */
    }
  };

  // 切换餐车
  useEffect(() => {
    const config =
      getAllTruckConfigs().find((t) => t.id === selectedTruckId) ||
      allTrucks.find((t) => t.id === selectedTruckId);
    if (!config) return;
    skipAutosaveRef.current = true;
    setLocationName(config.locationName);
    setFenceRadius(config.deliveryRadiusKm);
    setPinLat(config.latitude);
    setPinLng(config.longitude);
    setStallStatus(config.status || 'open');
    setHasDraft(false);
    setLastAutoSave(null);
    setFlyTo({ lat: config.latitude, lng: config.longitude, seq: Date.now() });

    if (!locationLockedRef.current) {
      loadDraftFor(selectedTruckId, config);
    }

    requestAnimationFrame(() => {
      skipAutosaveRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTruckId]);

  // 解锁编辑
  const handleUnlock = () => {
    setLocationLocked(false);
    const config =
      getAllTruckConfigs().find((t) => t.id === selectedTruckId) ||
      allTrucks.find((t) => t.id === selectedTruckId);
    if (config) {
      loadDraftFor(selectedTruckId, config);
    }
    showToast('已解锁编辑模式：您可拖动地图中心准星、搜索或选择快捷商圈，修改后点下方「保存并广播」生效');
  };

  // 完成锁定
  const handleLock = () => {
    setLocationLocked(true);
    const config =
      getAllTruckConfigs().find((t) => t.id === selectedTruckId) ||
      allTrucks.find((t) => t.id === selectedTruckId);
    if (config) {
      skipAutosaveRef.current = true;
      setLocationName(config.locationName);
      setFenceRadius(config.deliveryRadiusKm);
      setPinLat(config.latitude);
      setPinLng(config.longitude);
      setStallStatus(config.status || 'open');
      setFlyTo({ lat: config.latitude, lng: config.longitude, seq: Date.now() });
      requestAnimationFrame(() => {
        skipAutosaveRef.current = false;
      });
    }
    clearDraft(selectedTruckId);
    showToast('已锁定查看模式：餐车停靠点不会被误触修改，草稿已重置为实际停靠点');
  };

  // 自动保存草稿
  useEffect(() => {
    if (locationLockedRef.current || skipAutosaveRef.current) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      const draft: GpsDraft = {
        locationName,
        fenceRadius,
        pinLat,
        pinLng,
        stallStatus,
        savedAt: now
      };
      try {
        localStorage.setItem(draftKeyFor(selectedTruckId), JSON.stringify(draft));
      } catch {
        /* ignore */
      }
      setLastAutoSave(now);
      setHasDraft(true);
    }, 600);
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [locationLocked, locationName, fenceRadius, pinLat, pinLng, stallStatus, selectedTruckId]);

  const clearDraft = (truckId: string) => {
    try {
      localStorage.removeItem(draftKeyFor(truckId));
    } catch {
      /* ignore */
    }
    setHasDraft(false);
    setLastAutoSave(null);
  };

  const handleTruckChange = (id: string) => {
    setSelectedTruckId(id);
    setActiveTruckId(id);
  };

  // 地址输入搜索联想
  const handleSearchChange = async (v: string) => {
    setSearchInput(v);
    const q = v.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    const items = await suggestPlaces(q);
    if (items.length) {
      setSuggestions(items);
      setSuggestOpen(true);
    } else {
      setSuggestions([]);
      setSuggestOpen(false);
    }
  };

  // 选定联想项
  const handleSelectSuggestion = (s: PlaceSuggestion) => {
    if (locationLocked) {
      showToast('🔒 当前为查看模式，请先解锁编辑');
      return;
    }
    setLocationName(s.title);
    setLocationDetail(s.detail);
    setPinLat(s.latitude);
    setPinLng(s.longitude);
    setSearchInput('');
    setSuggestions([]);
    setSuggestOpen(false);
    setFlyTo({ lat: s.latitude, lng: s.longitude, seq: Date.now() });
    showToast(`已选定候选基点：${s.title}`);
  };

  // 回车搜索地址
  const handleSearchSubmit = async () => {
    if (locationLocked) {
      showToast('🔒 当前为查看模式，请先解锁编辑');
      return;
    }
    const q = searchInput.trim();
    if (!q || isSearching) return;
    setIsSearching(true);
    const res = await geocodeAddress(q);
    setIsSearching(false);
    if (res) {
      setLocationName(q);
      setLocationDetail('已通过高德逆地理结构化解析定位');
      setPinLat(res.latitude);
      setPinLng(res.longitude);
      setSearchInput('');
      setSuggestions([]);
      setSuggestOpen(false);
      setFlyTo({ lat: res.latitude, lng: res.longitude, seq: Date.now() });
      showToast(`已定位到：${q}`);
    } else {
      showToast('未检索到该地址，请尝试更详细的商圈名称或道路');
    }
  };

  // 载入预设商圈切点
  const handlePresetLoad = (loc: (typeof QUICK_LANDMARKS)[number]) => {
    if (locationLocked) {
      showToast('已锁定查看模式，请先点击解锁');
      return;
    }
    setLocationName(loc.locationName);
    setFenceRadius(loc.radius);
    setPinLat(loc.lat);
    setPinLng(loc.lng);
    setFlyTo({ lat: loc.lat, lng: loc.lng, seq: Date.now() });
    showToast(`已定位到: ${loc.name}`);
  };

  // 半径微调与快速档位
  const handleRadiusStep = (delta: number) => {
    if (locationLocked) return;
    setFenceRadius((prev) => Math.max(0.5, Math.min(15.0, Math.round((prev + delta) * 10) / 10)));
  };

  const handleSelectTier = (km: number) => {
    if (locationLocked) return;
    setFenceRadius(km);
  };

  // 一键复位官方默认驻泊车位
  const handleResetOfficialPreset = () => {
    if (locationLocked) {
      showToast('🔒 当前为查看模式，请先点击右上角挂锁解锁');
      return;
    }
    const def = DEFAULT_TRUCK_CONFIGS.find((t) => t.id === selectedTruckId) || DEFAULT_TRUCK_CONFIGS[0];
    setLocationName(def.locationName);
    setFenceRadius(def.deliveryRadiusKm);
    setPinLat(def.latitude);
    setPinLng(def.longitude);
    setFlyTo({ lat: def.latitude, lng: def.longitude, seq: Date.now() });
    showToast(`已复位至商圈官方划定车位：${def.locationName}`);
  };

  // 设备真实 GPS 高精定位
  const [isLocatingDeviceGps, setIsLocatingDeviceGps] = useState(false);
  const handleFetchActualGps = async () => {
    if (locationLocked) {
      showToast('🔒 当前为查看模式，请先点击右上角挂锁解锁');
      return;
    }
    setIsLocatingDeviceGps(true);
    showToast('正在请求当前物理设备真实 GPS 信号...');
    const res = await requestBrowserGeolocation();
    setIsLocatingDeviceGps(false);
    if (res.success && res.latitude) {
      setPinLat(res.latitude);
      setPinLng(res.longitude);
      setFlyTo({ lat: res.latitude, lng: res.longitude, seq: Date.now() });
      showToast(`已成功捕获设备真实 GPS 坐标 (±${res.accuracy || 20}m)`);
    } else {
      showToast(res.error || '无法获取设备真实 GPS，已保持当前基准点');
    }
  };

  // 保存并广播
  const handleBroadcast = () => {
    if (locationLocked) {
      showToast('已锁定，请先解锁后再广播');
      return;
    }
    setIsBroadcasting(true);
    setTimeout(() => {
      setIsBroadcasting(false);
      const updatedConfig: TruckLocationConfig = {
        ...currentTruckConfig,
        locationName,
        deliveryRadiusKm: fenceRadius,
        status: stallStatus,
        latitude: pinRef.current.lat,
        longitude: pinRef.current.lng,
        updatedAt: new Date().toISOString()
      };

      // 记录站台移动审计链
      const distDeltaKm = calculateGeodesicDistanceKm(
        currentTruckConfig.latitude,
        currentTruckConfig.longitude,
        pinRef.current.lat,
        pinRef.current.lng
      );
      const distDeltaMeters = Math.round(distDeltaKm * 1000);
      recordStallRelocationAudit({
        truckId: selectedTruckId,
        truckName: currentTruckConfig.name,
        prevLat: currentTruckConfig.latitude,
        prevLng: currentTruckConfig.longitude,
        prevLocationName: currentTruckConfig.locationName,
        newLat: pinRef.current.lat,
        newLng: pinRef.current.lng,
        newLocationName: locationName,
        distanceDeltaMeters: distDeltaMeters,
        newRadiusKm: fenceRadius,
        reason: distDeltaMeters > 0 ? `站台位移 ${distDeltaMeters} 米并更新电子围栏` : '更新站台参数与电子围栏半径'
      });

      saveTruckConfig(updatedConfig);
      setAllTrucks(getAllTruckConfigs());
      clearDraft(selectedTruckId);
      const coords: [number, number] = [pinRef.current.lng, pinRef.current.lat];
      onUpdateLocation(locationName, fenceRadius, coords);

      // 云端静默直推：确保实时同步腾讯云集合与多端设备
      void pushTruckLocationToCloud(updatedConfig);
      void syncSingleModuleToCloud('truck_locations');
      void syncSingleModuleToCloud('contingency_audits');

      // 跨组件联动事务：餐车停靠点广播 -> 触发外摆桌台联动 & 语音通知
      businessTransactionEngine.executeStallRelocationCascade({
        stallId: selectedTruckId,
        stallName: currentTruckConfig.name,
        locationText: locationName,
        maxTables: selectedTruckId === 'truck-02' ? 12 : selectedTruckId === 'truck-03' ? 8 : 16,
        recommendedMenuTag: selectedTruckId === 'truck-02' ? '夜市小吃' : '炭火炙烤',
        deliveryRadiusKm: fenceRadius,
        showToast
      });

      showToast(distDeltaMeters > 0 ? `停靠点已广播全网 (位移 ${distDeltaMeters}m · 围栏 ${fenceRadius}km)` : `站台参数已全网广播同步 (围栏 ${fenceRadius}km)`);
    }, 600);
  };

  const handleSaveAmapKey = () => {
    const key = amapKeyText.trim();
    saveAmapWebKey(key);
    setCustomKeyActive(!!key);
    setAmapKeyText('');
    setAmapKeyOpen(false);
    showToast(key ? '已启用自定义高德 Key' : '已恢复默认高德 Key');
  };

  return (
    <div className="space-y-2.5 text-xs">
      {/* ============================================================
       * 1. 顶层紧凑控制条 (纯图标按钮与微型状态)
       * ============================================================ */}
      <div className="bg-white p-2.5 rounded-[2px] border border-[#e6e6e4] flex items-center justify-between gap-2 flex-wrap">
        {/* 左侧：餐车当前编号、Logo 与 5G 指示灯 */}
        <div className="flex items-center gap-2">
          {currentTruckConfig.logo || currentTruckConfig.image ? (
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="w-7 h-7 rounded-md overflow-hidden border border-emerald-500/60 shadow-2xs hover:scale-105 transition-transform cursor-pointer relative group shrink-0"
              title="点击配置/上传餐车品牌 Logo"
            >
              <img
                src={currentTruckConfig.logo || currentTruckConfig.image}
                alt="Logo"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <ImageIcon className="w-3 h-3 text-white" />
              </div>
            </button>
          ) : (
            <div className="w-6 h-6 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-medium">
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          )}
          <span className="font-medium text-xs text-[#0f172a] tracking-tight">
            {currentTruckConfig.name.replace(/黑曜石\s*/, '').replace(/流动餐车/, '')}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="5G 在线" />
        </div>

        {/* 中间：车队纯图标/编号切换按钮 */}
        <div className="flex items-center gap-1 bg-[#fbfbfa] p-1 rounded-[2px] border border-[#e6e6e4]">
          {allTrucks.map((t, idx) => {
            const isCur = t.id === selectedTruckId;
            const theme = getTruckTheme(t.id);
            const num = String(idx + 1).padStart(2, '0');
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTruckChange(t.id)}
                className={`relative w-6 h-6 rounded-[2px] flex items-center justify-center font-mono font-medium text-xs transition-all cursor-pointer ${
                  isCur
                    ? 'bg-[#0f172a] text-white'
                    : 'text-[#787774] hover:bg-white hover:text-[#0f172a]'
                }`}
                style={
                  isCur
                    ? {
                        color: theme.color,
                        boxShadow: `0 0 6px ${theme.glowColor}`,
                        border: `1px solid ${theme.color}`
                      }
                    : {
                        border: `1px solid transparent`
                      }
                }
                title={`${t.name} (${t.deliveryRadiusKm}km · ${theme.themeTitle})`}
              >
                <span
                  className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full"
                  style={{ backgroundColor: theme.color }}
                />
                {num}
              </button>
            );
          })}
        </div>

        {/* 右侧：营运状态纯图标按钮 + 锁定/解锁 + Key设置 */}
        <div className="flex items-center gap-1.5">
          {/* 状态纯图标按钮 */}
          <div className="flex items-center gap-0.5 bg-[#fbfbfa] p-0.5 rounded-[2px] border border-[#e6e6e4]">
            <button
              type="button"
              onClick={() => {
                setStallStatus('open');
                showToast('营业中');
              }}
              className={`w-6 h-6 rounded-[2px] flex items-center justify-center transition-all cursor-pointer ${
                stallStatus === 'open'
                  ? 'bg-emerald-600 text-white'
                  : 'text-[#787774] hover:text-[#0f172a]'
              }`}
              title="营业中"
            >
              <Store className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setStallStatus('transit');
                showToast('巡游中');
              }}
              className={`w-6 h-6 rounded-[2px] flex items-center justify-center transition-all cursor-pointer ${
                stallStatus === 'transit'
                  ? 'bg-amber-500 text-white'
                  : 'text-[#787774] hover:text-[#0f172a]'
              }`}
              title="巡游中"
            >
              <Truck className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setStallStatus('closed');
                showToast('打烊');
              }}
              className={`w-6 h-6 rounded-[2px] flex items-center justify-center transition-all cursor-pointer ${
                stallStatus === 'closed'
                  ? 'bg-slate-700 text-white'
                  : 'text-[#787774] hover:text-[#0f172a]'
              }`}
              title="打烊"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 锁定 / 解锁纯图标按钮 */}
          {locationLocked ? (
            <button
              type="button"
              onClick={handleUnlock}
              className="w-6 h-6 rounded-[2px] bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center transition-all cursor-pointer"
              title="已锁定（防误触），点击解锁编辑"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLock}
              className="w-6 h-6 rounded-[2px] bg-[#0f172a] hover:bg-slate-800 text-emerald-400 flex items-center justify-center transition-all cursor-pointer border border-emerald-500"
              title="编辑中，点击完成锁定"
            >
              <Unlock className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 主厨通告与硬件工况热配置按钮 */}
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="h-6 px-2 rounded-[2px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center gap-1 font-bold text-[11px] cursor-pointer transition-all shadow-2xs"
            title="主厨通告、驻点细则与硬件工况实时配置"
          >
            <Sliders className="w-3 h-3 text-emerald-600" />
            <span className="hidden sm:inline">通告·工况·福利热配置</span>
            <span className="sm:hidden">热配置</span>
          </button>

          {/* 高德 Key 设置纯图标按钮 */}
          <button
            type="button"
            onClick={() => setAmapKeyOpen(!amapKeyOpen)}
            className={`w-6 h-6 rounded-[2px] flex items-center justify-center transition-all cursor-pointer border ${
              amapKeyOpen || customKeyActive
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-[#e6e6e4] text-[#787774] hover:bg-[#fbfbfa]'
            }`}
            title="高德 Web 服务 Key 设置"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 高德 Key 展开内嵌行 */}
      {amapKeyOpen && (
        <div className="p-2 bg-white border border-[#e6e6e4] rounded-[2px] flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-[#787774] shrink-0" />
          <input
            type="text"
            value={amapKeyText}
            onChange={(e) => setAmapKeyText(e.target.value)}
            placeholder="高德 Web 服务 Key (留空保存则恢复默认)"
            className="flex-1 bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] px-2.5 py-1 text-xs font-mono outline-none focus:border-[#0f172a] focus:bg-white text-[#0f172a]"
          />
          <button
            type="button"
            onClick={handleSaveAmapKey}
            className="w-6 h-6 bg-[#0f172a] hover:bg-slate-800 text-white rounded-[2px] flex items-center justify-center cursor-pointer shrink-0"
            title="保存 Key"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================
       * 2. 核心布局：左侧紧凑操作控制台，右侧大地图
       * ============================================================ */}
      <div className="flex flex-col lg:flex-row gap-2.5 items-stretch">
        {/* ------------------------------------------------------------
         * 左边: 极简参数控制台 (Left Modification Console)
         * ------------------------------------------------------------ */}
        <div className="w-full lg:w-[320px] xl:w-[340px] shrink-0 bg-white border border-[#e6e6e4] rounded-[2px] flex flex-col overflow-hidden">
          {/* 微型坐标与半径状态条 */}
          <div className="px-3 py-1.5 bg-[#fbfbfa] border-b border-[#f1f1ef] flex items-center justify-between font-mono text-[11px] text-[#787774]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              {pinLat.toFixed(4)}, {pinLng.toFixed(4)}
            </span>
            <span className="font-medium text-[#0f172a] bg-white px-1.5 py-0.5 rounded-[2px] border border-[#e6e6e4]">
              {fenceRadius.toFixed(1)} km
            </span>
          </div>

          <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[480px] lg:max-h-[calc(100vh-250px)]">
            {/* 搜索框与纯图标按钮 */}
            <div className="relative">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[#787774] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchInput}
                    disabled={locationLocked}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                    placeholder={locationLocked ? '已锁定当前位置' : '搜索地址或商圈'}
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] focus:outline-none focus:border-[#0f172a] focus:bg-white text-[#0f172a] disabled:opacity-50"
                  />
                </div>
                <button
                  type="button"
                  disabled={locationLocked || isSearching}
                  onClick={handleSearchSubmit}
                  className="w-7 h-7 bg-[#0f172a] hover:bg-slate-800 text-white rounded-[2px] flex items-center justify-center cursor-pointer disabled:opacity-40 shrink-0"
                  title="搜索"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 联想建议下拉 */}
              {suggestOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e6e6e4] rounded-[2px] shadow-sm z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full px-2.5 py-1.5 text-left hover:bg-[#fbfbfa] border-b border-[#f1f1ef] last:border-0 transition-colors flex items-center justify-between gap-1"
                    >
                      <span className="font-medium text-[#0f172a] text-xs truncate">{s.title}</span>
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 停靠点名称直接编辑 */}
            <div className="relative">
              <Navigation className="w-3.5 h-3.5 text-[#787774] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={locationName}
                disabled={locationLocked}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="停靠点名称"
                className="w-full pl-8 pr-2.5 py-1.5 font-medium text-xs text-[#0f172a] bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] focus:border-[#0f172a] focus:bg-white outline-none disabled:bg-[#f1f1ef] disabled:text-[#787774]"
              />
            </div>

            {/* 快捷商圈图钉与官方基准按钮组 */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                disabled={locationLocked}
                onClick={handleResetOfficialPreset}
                className="px-2 py-0.5 rounded-[2px] border border-amber-200 hover:border-amber-400 bg-amber-50/70 hover:bg-amber-100/70 text-[11px] text-amber-900 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                title="一键复位至官方划定规范停靠车位"
              >
                <RotateCcw className="w-3 h-3 text-amber-700" />
                <span>官方泊位</span>
              </button>

              <button
                type="button"
                disabled={locationLocked || isLocatingDeviceGps}
                onClick={handleFetchActualGps}
                className="px-2 py-0.5 rounded-[2px] border border-emerald-200 hover:border-emerald-400 bg-emerald-50/70 hover:bg-emerald-100/70 text-[11px] text-emerald-900 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                title="请求设备真实 GPS 传感器定位"
              >
                <LocateFixed className={`w-3 h-3 text-emerald-700 ${isLocatingDeviceGps ? 'animate-spin' : ''}`} />
                <span>设备GPS</span>
              </button>

              {QUICK_LANDMARKS.map((loc, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={locationLocked}
                  onClick={() => handlePresetLoad(loc)}
                  className="px-2 py-0.5 rounded-[2px] border border-[#e6e6e4] hover:border-emerald-500 bg-[#fbfbfa] hover:bg-emerald-50/50 text-[11px] text-[#787774] hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                  title={`${loc.locationName} (${loc.radius}km)`}
                >
                  <Building2 className="w-3 h-3 text-[#787774]" />
                  <span>{loc.name}</span>
                </button>
              ))}
            </div>

            {/* 站台主厨通告与车载物联网遥测快捷信息栏 */}
            <div className="p-2 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-[#0f172a] flex items-center gap-1">
                  <FileText className="w-3 h-3 text-emerald-600" />
                  <span>主厨通告 & 车载工况</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="px-1.5 py-0.5 rounded-[2px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  <Sliders className="w-3 h-3" />
                  <span>热配置</span>
                </button>
              </div>
              <div className="text-[10.5px] text-[#787774] line-clamp-2 leading-snug">
                {currentTruckConfig.chefAnnouncement || '暂未发布今日主厨通告，点击热配置即可实时发布并向全网广播。'}
              </div>
              <div className="grid grid-cols-2 gap-1 pt-1 border-t border-[#f1f1ef] text-[10px] text-[#0f172a]">
                <div className="flex items-center gap-1">
                  <span className="text-[#787774]">保温箱:</span>
                  <span className="font-semibold text-rose-600">{currentTruckConfig.hardwareStatus?.holdingCabinetTemp ?? 70}℃</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[#787774]">冷藏保鲜:</span>
                  <span className="font-semibold text-cyan-600">{currentTruckConfig.hardwareStatus?.coldStorageTemp ?? 4}℃</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[#787774]">动力电池:</span>
                  <span className="font-semibold text-emerald-600">{currentTruckConfig.hardwareStatus?.batteryLevel ?? 92}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[#787774]">排队单数:</span>
                  <span className="font-semibold text-amber-600">{currentTruckConfig.hardwareStatus?.queueOrders ?? 1}单</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[#f1f1ef]" />

            {/* 外卖半径档位：纯数字/图标按钮 */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-4 gap-1">
                {[1, 3, 5, 8].map((tier) => {
                  const isCur = Math.abs(fenceRadius - tier) < 0.2;
                  return (
                    <button
                      key={tier}
                      type="button"
                      disabled={locationLocked}
                      onClick={() => handleSelectTier(tier)}
                      className={`py-1 rounded-[2px] font-mono font-medium text-xs border text-center transition-all cursor-pointer disabled:opacity-40 ${
                        isCur
                          ? 'bg-[#0f172a] text-emerald-400 border-[#0f172a]'
                          : 'bg-[#fbfbfa] text-[#787774] border-[#e6e6e4] hover:bg-white'
                      }`}
                      title={`${tier}.0 km`}
                    >
                      {tier}k
                    </button>
                  );
                })}
              </div>

              {/* 滑块与步进纯图标按钮 */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[#fbfbfa] rounded-[2px] border border-[#e6e6e4]">
                <button
                  type="button"
                  disabled={locationLocked || fenceRadius <= 0.5}
                  onClick={() => handleRadiusStep(-0.5)}
                  className="w-5 h-5 bg-white border border-[#e6e6e4] rounded-[2px] flex items-center justify-center text-[#787774] hover:bg-[#f1f1ef] disabled:opacity-40 cursor-pointer"
                  title="减小 0.5km"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="15.0"
                  step="0.1"
                  value={fenceRadius}
                  disabled={locationLocked}
                  onChange={(e) => setFenceRadius(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 rounded-none appearance-none cursor-pointer accent-[#0f172a] disabled:opacity-40"
                />
                <button
                  type="button"
                  disabled={locationLocked || fenceRadius >= 15.0}
                  onClick={() => handleRadiusStep(0.5)}
                  className="w-5 h-5 bg-white border border-[#e6e6e4] rounded-[2px] flex items-center justify-center text-[#787774] hover:bg-[#f1f1ef] disabled:opacity-40 cursor-pointer"
                  title="增加 0.5km"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* 底部操作条 (聚焦图标按钮 + 广播按钮) */}
          <div className="p-2 bg-white border-t border-[#f1f1ef] shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const config = allTrucks.find((t) => t.id === selectedTruckId);
                if (config) {
                  setFlyTo({ lat: config.latitude, lng: config.longitude, seq: Date.now() });
                }
              }}
              className="w-8 h-8 rounded-[2px] border border-[#e6e6e4] text-[#787774] hover:bg-[#fbfbfa] flex items-center justify-center cursor-pointer shrink-0"
              title="聚焦当前餐车"
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleBroadcast}
              disabled={locationLocked || isBroadcasting}
              className="flex-1 h-8 bg-[#0f172a] hover:bg-slate-800 text-white rounded-[2px] font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="保存并全网广播"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isBroadcasting ? '广播中…' : `广播同步 (${fenceRadius.toFixed(1)}k)`}</span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------
         * 右边: 沉浸式地图视口 (Right Map Viewport)
         * ------------------------------------------------------------ */}
        <div className="flex-1 min-h-[420px] lg:min-h-0 h-[500px] lg:h-[calc(100vh-210px)] relative rounded-[2px] border border-[#e6e6e4] overflow-hidden bg-[#f1f1ef]">
          <TruckLocationMapPicker
            truckId={selectedTruckId}
            initialLat={pinLat}
            initialLng={pinLng}
            radiusKm={fenceRadius}
            locked={locationLocked}
            truckName={currentTruckConfig.name}
            allTrucks={allTrucks}
            flyToTarget={flyTo}
            onSelectTruck={handleTruckChange}
            onPositionChange={(la, ln) => {
              setPinLat(la);
              setPinLng(ln);
            }}
            onAddressChange={(name, detail) => {
              setLocationName(name);
              if (detail) setLocationDetail(detail);
            }}
            onRadiusChange={(km) => setFenceRadius(km)}
            onToggleLock={() => {
              if (locationLocked) {
                handleUnlock();
              } else {
                handleLock();
              }
            }}
          />
        </div>
      </div>

      {/* 主厨通告、驻点营运数据与硬件工况热配置模态框 */}
      <TruckQuickConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => {
          setIsConfigModalOpen(false);
          setAllTrucks(getAllTruckConfigs());
        }}
        truckId={selectedTruckId}
        onSaved={() => {
          setAllTrucks(getAllTruckConfigs());
          showToast('餐车通告与工况已热更新广播同步！');
        }}
      />
    </div>
  );
};
