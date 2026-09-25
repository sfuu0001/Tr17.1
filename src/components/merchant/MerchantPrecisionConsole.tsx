import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Truck,
  ChevronDown,
  Check,
  Radio,
  RefreshCw,
  SlidersHorizontal,
  Zap,
  Moon,
  AlertTriangle,
  LayoutList,
  Power,
  LayoutGrid,
  UtensilsCrossed,
  Bike,
  QrCode,
  ChevronRight,
  History,
  Trash2,
  BarChart3,
  Filter,
  Search,
  ChevronUp,
  Maximize2
} from 'lucide-react';
import {
  getAllTruckBusinessStatuses,
  setTruckBusinessStatus,
  DEFAULT_TRUCK_BUSINESS_STATUSES
} from '../../utils/businessStatusEngine';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';

export interface StationChannelState {
  master: boolean;
  dine: boolean;
  delivery: boolean;
  pickup: boolean;
}

export interface AuditLogEntry {
  id: string;
  time: string;
  msg: string;
  stateCode: string;
  colorClass: string;
}

export interface ToastItem {
  id: string;
  message: string;
  isSuccess: boolean;
}

const STATION_NAMES: Record<number, string> = {
  1: '01号·旗舰餐车',
  2: '02号·科技园先锋车',
  3: '03号·潮玩艺术车',
  4: '04号·外滩滨江车',
  5: '05号·后备机动车'
};

const CHANNEL_NAMES: Record<string, string> = {
  dine: '堂食',
  delivery: '外卖',
  pickup: '自提'
};

const INITIAL_STATIONS: Record<number, StationChannelState> = {
  1: { master: true, dine: true, delivery: true, pickup: true },
  2: { master: true, dine: false, delivery: true, pickup: true },
  3: { master: true, dine: true, delivery: false, pickup: true },
  4: { master: false, dine: false, delivery: false, pickup: false },
  5: { master: true, dine: false, delivery: true, pickup: true }
};

interface MerchantPrecisionConsoleProps {
  onStationSelect?: (stationId: number) => void;
  selectedTruckId?: string;
}

export const MerchantPrecisionConsole: React.FC<MerchantPrecisionConsoleProps> = ({
  onStationSelect,
  selectedTruckId
}) => {
  // 0. 数据接线：从业务状态调度引擎初始化全站台通道状态
  const loadStationsFromBusinessEngine = useCallback((): Record<number, StationChannelState> => {
    try {
      const all = getAllTruckBusinessStatuses();
      const res: Record<number, StationChannelState> = {};
      for (let i = 1; i <= 5; i++) {
        const tid = `truck-0${i}`;
        const cfg = all[tid] || DEFAULT_TRUCK_BUSINESS_STATUSES[tid];
        if (cfg) {
          res[i] = {
            master: cfg.isOpen,
            dine: cfg.dineInOpen !== false,
            delivery: cfg.deliveryOpen !== false,
            pickup: cfg.pickupOpen !== false
          };
        } else {
          res[i] = INITIAL_STATIONS[i] || { master: true, dine: true, delivery: true, pickup: true };
        }
      }
      return res;
    } catch {
      return INITIAL_STATIONS;
    }
  }, []);

  // 1. Stations State (双向实时绑定 businessStatusEngine)
  const [stations, setStations] = useState<Record<number, StationChannelState>>(loadStationsFromBusinessEngine);

  // 监听全局业务状态总线变更，保持与其他组件（如弹窗/导航栏/顾客端）强同步
  useEffect(() => {
    const handleStatusChange = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.allStatuses) {
        const all = custom.detail.allStatuses;
        setStations((prev) => {
          const next = { ...prev };
          for (let i = 1; i <= 5; i++) {
            const tid = `truck-0${i}`;
            const cfg = all[tid];
            if (cfg) {
              next[i] = {
                master: cfg.isOpen,
                dine: cfg.dineInOpen !== false,
                delivery: cfg.deliveryOpen !== false,
                pickup: cfg.pickupOpen !== false
              };
            }
          }
          return next;
        });
      } else {
        setStations(loadStationsFromBusinessEngine());
      }
    };

    window.addEventListener('obsidian_business_status_changed', handleStatusChange);
    return () => window.removeEventListener('obsidian_business_status_changed', handleStatusChange);
  }, [loadStationsFromBusinessEngine]);

  // 2. Unit Selector Dropdown State
  const [selectedStationId, setSelectedStationId] = useState<number>(() => {
    if (selectedTruckId) {
      const parsed = parseInt(selectedTruckId.replace('truck-0', ''), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) return parsed;
    }
    const saved = safeGetStorage('obsidian_merchant_selected_truck', 'truck-01');
    const parsedSaved = parseInt(saved.replace('truck-0', ''), 10);
    return !isNaN(parsedSaved) && parsedSaved >= 1 && parsedSaved <= 5 ? parsedSaved : 1;
  });

  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 响应外部传入的 selectedTruckId
  useEffect(() => {
    if (selectedTruckId) {
      const parsed = parseInt(selectedTruckId.replace('truck-0', ''), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5 && parsed !== selectedStationId) {
        setSelectedStationId(parsed);
      }
    }
  }, [selectedTruckId, selectedStationId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUnitDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // 3. KPI Expand State & Filter/Search
  const [expandedKpis, setExpandedKpis] = useState<Record<string, boolean>>({});
  const toggleKpi = (kpiKey: string) => {
    setExpandedKpis((prev) => ({ ...prev, [kpiKey]: !prev[kpiKey] }));
  };

  // 表单平铺视图过滤与检索状态
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'throttled' | 'halted'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedStationDetails, setExpandedStationDetails] = useState<Record<number, boolean>>({});
  const toggleStationDetail = (stId: number) => {
    setExpandedStationDetails((prev) => ({ ...prev, [stId]: !prev[stId] }));
  };

  // 4. Bottom Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // 5. Toast System
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = useCallback((message: string, isSuccess: boolean = true) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, isSuccess }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  // 6. Audit Log System
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'init',
      time: new Date().toTimeString().split(' ')[0],
      msg: '控制中枢完成启动，5个餐车站点遥测握手成功',
      stateCode: 'READY',
      colorClass: 'text-console-primary'
    }
  ]);

  const appendAuditLog = useCallback((msg: string, stateCode: string, colorClass: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time,
      msg,
      stateCode,
      colorClass
    };
    setAuditLogs((prev) => [newEntry, ...prev.slice(0, 7)]);
  }, []);

  const clearLogs = () => {
    setAuditLogs([]);
    appendAuditLog('审计缓冲区已清空', 'BUFFER_CLEARED', 'text-console-muted');
    showToast('审计日志展示缓冲区已清空', true);
  };

  // 7. Toggle Channel (数据接线：同步至 businessStatusEngine)
  const toggleChannel = (stationId: number, channelKey: 'dine' | 'delivery' | 'pickup', silent: boolean = false) => {
    const current = stations[stationId] || INITIAL_STATIONS[stationId];
    const nextActive = !current[channelKey];
    const nextStation: StationChannelState = {
      ...current,
      [channelKey]: nextActive
    };

    // Recalculate master
    const anyActive = nextStation.dine || nextStation.delivery || nextStation.pickup;
    nextStation.master = anyActive;

    setStations((prev) => ({
      ...prev,
      [stationId]: nextStation
    }));

    // 数据接线：实时同步至业务状态引擎
    const truckId = `truck-0${stationId}`;
    setTruckBusinessStatus(
      truckId,
      {
        isOpen: nextStation.master,
        dineInOpen: nextStation.dine,
        deliveryOpen: nextStation.delivery,
        pickupOpen: nextStation.pickup
      },
      '主控矩阵'
    );

    if (!silent) {
      const sName = STATION_NAMES[stationId];
      const cName = CHANNEL_NAMES[channelKey];
      const statusZh = nextActive ? '已开启接单' : '已暂停打样';
      showToast(`【${sName}】${cName}渠道${statusZh}`, nextActive);
      appendAuditLog(
        `${sName}: ${cName} -> ${nextActive ? '开启接单' : '打烊休市'}`,
        nextActive ? 'ACTIVE' : 'HALTED',
        nextActive ? 'text-console-primary' : 'text-console-muted'
      );
    }
  };

  // 8. Toggle Master Switch for Station (数据接线：同步至 businessStatusEngine)
  const toggleMasterSwitch = (stationId: number) => {
    const current = stations[stationId] || INITIAL_STATIONS[stationId];
    const targetState = !current.master;

    const nextStation: StationChannelState = {
      master: targetState,
      dine: targetState,
      delivery: targetState,
      pickup: targetState
    };

    setStations((prev) => ({
      ...prev,
      [stationId]: nextStation
    }));

    // 数据接线：实时同步至业务状态引擎
    const truckId = `truck-0${stationId}`;
    setTruckBusinessStatus(
      truckId,
      {
        isOpen: targetState,
        statusLabel: targetState ? '营业中' : '全线打烊',
        closeReason: targetState ? `${STATION_NAMES[stationId]} 恢复全渠道在线接单` : `${STATION_NAMES[stationId]} 主控开关切断打烊`,
        reopenTime: targetState ? '正常接单中' : '待指令恢复',
        dineInOpen: targetState,
        deliveryOpen: targetState,
        pickupOpen: targetState
      },
      '主控矩阵'
    );

    const sName = STATION_NAMES[stationId];
    const msg = targetState ? `【${sName}】总开关：一键全渠道开启` : `【${sName}】总开关：全线休市打样`;
    showToast(msg, targetState);
    appendAuditLog(
      `${sName}: 总开关操作 -> ${targetState ? '全渠道激活' : '全线打烊'}`,
      targetState ? 'ONLINE_ALL' : 'HALTED_ALL',
      targetState ? 'text-console-primary' : 'text-console-danger'
    );
  };

  // 9. Batch Global Operations (数据接线：批量广播 5 大餐车站台)
  const batchSetAll = (openState: boolean) => {
    const updated: Record<number, StationChannelState> = {};
    for (let i = 1; i <= 5; i++) {
      updated[i] = {
        master: openState,
        dine: openState,
        delivery: openState,
        pickup: openState
      };
      // 数据接线：广播每个站台状态
      setTruckBusinessStatus(
        `truck-0${i}`,
        {
          isOpen: openState,
          statusLabel: openState ? '营业中' : '全线打烊',
          closeReason: openState ? '全网餐车站台集中恢复营业' : '晚市全网集中打烊休市',
          reopenTime: openState ? '正常接单中' : '明日 11:00',
          dineInOpen: openState,
          deliveryOpen: openState,
          pickupOpen: openState
        },
        '批处理总线'
      );
    }
    setStations(updated);

    const title = openState ? '一键全网接单' : '晚市全线打样';
    showToast(`批处理完成: ${title}`, openState);
    appendAuditLog(
      `批处理指令: 全网5大餐车站点 ${openState ? '全渠道激活上线' : '统一休市打样'}`,
      openState ? 'BATCH_ON' : 'BATCH_OFF',
      openState ? 'text-console-primary' : 'text-console-muted'
    );
  };

  const emergencyShutdown = () => {
    const updated: Record<number, StationChannelState> = {};
    for (let i = 1; i <= 5; i++) {
      updated[i] = {
        master: false,
        dine: false,
        delivery: false,
        pickup: false
      };
      // 数据接线：气象熔断广播
      setTruckBusinessStatus(
        `truck-0${i}`,
        {
          isOpen: false,
          statusLabel: '气象熔断',
          closeReason: '突发极端气象预警，全网切断供售避险',
          reopenTime: '待气象警报解除',
          dineInOpen: false,
          deliveryOpen: false,
          pickupOpen: false
        },
        '气象熔断总控'
      );
    }
    setStations(updated);

    showToast('⚠️ 气象熔断：全站点已切断供售', false);
    appendAuditLog('极端气象熔断: 已强制关闭所有站点渠道供售', 'EMERGENCY_SHUTDOWN', 'text-console-danger');
  };

  // Station metadata descriptors
  const stationMetadata: Record<
    number,
    {
      title: string;
      location: string;
      descDine: string;
      descDelivery: string;
      descPickup: string;
      prepLabel: string;
      prepCode: string;
    }
  > = {
    1: {
      title: '01号·旗舰餐车',
      location: '前海天幕集市广场 A区-01 // 客流: 142人/h',
      descDine: '7桌就餐',
      descDelivery: '双平台正常',
      descPickup: '柜体待取就绪',
      prepLabel: '全渠道营业',
      prepCode: 'ONLINE 0x01'
    },
    2: {
      title: '02号·科技园先锋车',
      location: '高新南十道站 腾讯双子塔东 // 堂食排队过长',
      descDine: '满座限流',
      descDelivery: '外送接单中',
      descPickup: '5格就绪待取',
      prepLabel: '部分限流',
      prepCode: 'THROTTLED'
    },
    3: {
      title: '03号·潮玩艺术车',
      location: 'OCT创意艺术港 潮玩主入口 // 运力拥堵暂缓',
      descDine: '开放现场排号',
      descDelivery: '骑手运力超载',
      descPickup: '小程序立取',
      prepLabel: '晚市备料',
      prepCode: 'PREP // 0x03'
    },
    4: {
      title: '04号·外滩滨江车',
      location: '黄浦滨江流动观景区 // 设备维护保养中',
      descDine: '不接客',
      descDelivery: '外送闭店',
      descPickup: '自检锁定',
      prepLabel: '全线打烊',
      prepCode: 'HALTED 0x00'
    },
    5: {
      title: '05号·后备机动车',
      location: '中央总厨应急机动基地 // 随时响应突发客流',
      descDine: '无外摆席位',
      descDelivery: '溢流应急承接',
      descPickup: '内购专用取餐',
      prepLabel: '部分营业',
      prepCode: 'ONLINE 0x05'
    }
  };

  // Calculate active station count for KPI 1
  const activeStationCount = Object.values(stations).filter((s) => s.master).length;
  const activeStationRatio = Math.round((activeStationCount / 5) * 100);

  return (
    <div
      style={{
        backgroundColor: '#F4F4F2',
        color: '#111827',
        fontFamily: '"Hanken Grotesk", sans-serif'
      }}
      className="min-h-full w-full text-[13px] leading-normal selection:bg-console-primary selection:text-white p-2.5 sm:p-4 lg:p-6 relative antialiased"
    >
      {/* Precision HUD Notification Toast Container */}
      <div id="console-toast-container" className="fixed top-4 right-4 left-4 sm:left-auto sm:right-6 max-w-[420px] ml-auto z-9999 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`console-toast toast-show flex items-center gap-2.5 px-3 py-2 rounded-c border font-mono text-[11px] sm:text-[12px] shadow-lg ${
              toast.isSuccess
                ? 'bg-white border-console-primary/30 text-console-text shadow-cyan-900/10'
                : 'bg-[#FCFCFB] border-console-borderDark text-console-muted shadow-black/5'
            }`}
          >
            <div className="flex items-center gap-1.5 shrink-0">
              {toast.isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-console-primary shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-console-danger shrink-0" />
              )}
              {toast.isSuccess ? (
                <span className="w-1.5 h-1.5 rounded-full bg-console-accent animate-ping mr-1" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-console-danger mr-1" />
              )}
            </div>
            <span className="font-medium truncate tracking-tight">{toast.message}</span>
          </div>
        ))}
      </div>

      <div className="max-w-[1560px] mx-auto flex flex-col gap-3 sm:gap-4">
        {/* 1. 顶部控制总线与高级遥测选择器 */}
        <header className="bg-console-card border border-console-borderDark/70 rounded-c shadow-sm p-3 sm:px-4 sm:py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          {/* Left Section: Unit Selector & Hardware Telemetry Link */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 lg:gap-6 w-full lg:w-auto">
            {/* Unit Selector Dropdown Trigger */}
            <div className="flex flex-col w-full sm:w-auto" ref={dropdownRef}>
              <div className="flex items-center gap-1.5 text-console-muted font-mono text-[10px] uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-console-primary animate-ping" />
                <span className="font-bold text-console-text">UNIT SELECTOR // 站点实时切换</span>
              </div>
              <div className="relative group w-full" id="unit-dropdown-wrapper">
                <button
                  id="unit-dropdown-btn"
                  type="button"
                  onClick={() => setIsUnitDropdownOpen((prev) => !prev)}
                  className="w-full sm:w-auto flex items-center justify-between gap-2.5 px-3 py-2 sm:py-1.5 bg-[#F9F9F8] hover:bg-[#F0F0EE] border border-console-borderDark/80 rounded-c text-console-text font-mono text-[12px] font-semibold transition-all active:scale-[0.98] min-w-full sm:min-w-[280px] cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Truck className="w-4 h-4 text-console-primary shrink-0" />
                    <span className="tracking-tight truncate" id="current-station-text">
                      {STATION_NAMES[selectedStationId]} ({stations[selectedStationId]?.master ? '营业中' : '已打样'})
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-console-muted group-hover:text-console-text transition-transform duration-200 ${
                      isUnitDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isUnitDropdownOpen && (
                  <div
                    id="unit-dropdown-menu"
                    className="absolute top-full left-0 mt-1 w-full bg-console-card border border-console-borderDark shadow-xl z-50 flex flex-col py-1 rounded-c transition-all"
                  >
                    {[1, 2, 3, 4, 5].map((uId) => {
                      const isCur = selectedStationId === uId;
                      const sName = STATION_NAMES[uId];
                      const stState = stations[uId];
                      let note = stState?.master ? '营业中' : '已打样';
                      let noteClass = stState?.master ? 'text-console-primary font-semibold' : 'text-console-muted font-semibold';
                      if (stState?.master && (!stState.dine || !stState.delivery || !stState.pickup)) {
                        note = '部分开放';
                        noteClass = 'text-console-warning font-semibold';
                      }

                      return (
                        <div
                          key={uId}
                          onClick={() => {
                            setSelectedStationId(uId);
                            setIsUnitDropdownOpen(false);
                            onStationSelect?.(uId);
                            const truckId = `truck-0${uId}`;
                            safeSetStorage('obsidian_merchant_selected_truck', truckId);
                            safeSetStorage('obsidian_active_truck_id', truckId);
                            window.dispatchEvent(new CustomEvent('obsidian_merchant_truck_changed', { detail: { truckId } }));
                            showToast(`终端焦点已定位: ${sName}`, true);
                            appendAuditLog(`定向关注站点: ${sName}`, 'FOCUS_SWITCH', 'text-console-primary');
                          }}
                          className={`px-3 py-2 font-mono text-[11px] flex items-center justify-between cursor-pointer transition-colors ${
                            isCur
                              ? 'bg-console-primary text-white font-semibold'
                              : 'hover:bg-[#F3F4F6] text-console-text'
                          }`}
                        >
                          <span className="truncate">{sName}</span>
                          {isCur ? (
                            <Check className="w-4 h-4 shrink-0 ml-2" />
                          ) : (
                            <span className={`shrink-0 ml-2 ${noteClass}`}>{note}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Hardware Telemetry Link Badges */}
            <div className="flex items-center gap-4 sm:pl-4 sm:border-l border-console-border py-1 sm:py-0.5 justify-between sm:justify-start">
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-console-primary animate-pulse" />
                  <span className="font-mono text-[10px] text-console-muted font-semibold uppercase">HARDWARE RTK-5G</span>
                </div>
                <span className="font-mono text-[12px] text-console-primary font-bold">99.98% LOCKED</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-console-muted" />
                  <span className="font-mono text-[10px] text-console-muted font-semibold uppercase">POS / CLOUD</span>
                </div>
                <span className="font-mono text-[12px] text-console-text font-bold">4ms // ENCRYPTED</span>
              </div>
            </div>
          </div>

          {/* Right Section: Batch Operations Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t lg:border-t-0 border-console-border w-full lg:w-auto">
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-[#F1F1EF] border border-console-borderDark/50 rounded-c font-mono text-[11px] text-console-muted">
              <SlidersHorizontal className="w-3.5 h-3.5 text-console-text" />
              <span className="font-semibold text-console-text">批处理总线:</span>
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => batchSetAll(true)}
                title="全网接单：开启全网所有餐车各渠道"
                className="h-7 w-7 sm:h-8 sm:w-8 bg-neutral-900 hover:bg-black text-emerald-400 rounded-c border border-neutral-900 flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => batchSetAll(false)}
                title="全线打烊：关闭全网所有餐车站台渠道"
                className="h-7 w-7 sm:h-8 sm:w-8 bg-white hover:bg-neutral-100 text-neutral-600 rounded-c border border-neutral-300 transition-all duration-150 active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={emergencyShutdown}
                title="气象熔断：紧急关停所有餐车供售通道"
                className="h-7 w-7 sm:h-8 sm:w-8 bg-rose-600 hover:bg-rose-700 text-white rounded-c border border-rose-700 transition-all duration-150 active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* 2. 平铺表单式遥测数据总览栏 (Flat Form Telemetry Bar) */}
        <section className="bg-white border border-console-borderDark/70 rounded-c shadow-sm p-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 mb-2.5 border-b border-console-border gap-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3 bg-console-primary shrink-0" />
              <span className="font-bold text-[12px] sm:text-[13px] text-console-text">实时运营遥测指标</span>
              <span className="font-mono text-[10px] text-console-muted">TELEMETRY GRID</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-console-muted">
              <span className="text-[10px] bg-[#f4f4f2] px-2 py-0.5 rounded-c border border-console-border font-mono">
                {activeStationRatio}% 站点全网活跃
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Field 1: Stations Network */}
            <div className="flex flex-col justify-between p-2 rounded-c bg-[#fafaf9] border border-console-border/70 hover:border-console-primary/50 transition-colors">
              <div className="flex items-center justify-between text-console-muted text-[11px] pb-1 border-b border-console-border/50">
                <span className="font-medium text-console-text flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-console-dark shrink-0" />
                  <span>餐车站网</span>
                </span>
                <span className="font-mono text-[10px] text-console-primary font-bold">
                  {activeStationRatio}% 活跃
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <div className="flex items-baseline gap-1">
                  <span style={{ fontFamily: '"Space Grotesk", sans-serif' }} className="text-xl sm:text-2xl font-bold tracking-tight text-console-text">
                    {activeStationCount}
                  </span>
                  <span className="text-[11px] text-console-muted">/5台在线</span>
                </div>
                <div className="flex items-center gap-0.5 w-12">
                  {[1, 2, 3, 4, 5].map((id) => (
                    <div
                      key={id}
                      className={`h-1 flex-1 transition-colors duration-300 ${
                        stations[id]?.master ? 'bg-console-primary' : 'bg-console-borderDark/40'
                      }`}
                      title={`0${id}号 ${stations[id]?.master ? '在线' : '停运'}`}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-console-border/40 flex items-center justify-between text-[10px] text-console-muted">
                <span>网压: 380V 常态</span>
                <span className="text-console-text font-medium">信噪比 42dB</span>
              </div>
            </div>

            {/* Field 2: Dine-in Occupancy */}
            <div className="flex flex-col justify-between p-2 rounded-c bg-[#fafaf9] border border-console-border/70 hover:border-console-primary/50 transition-colors">
              <div className="flex items-center justify-between text-console-muted text-[11px] pb-1 border-b border-console-border/50">
                <span className="font-medium text-console-text flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-console-primary shrink-0" />
                  <span>堂食在席</span>
                </span>
                <span className="font-mono text-[10px] text-console-primary font-bold">
                  翻台 4.2次/日
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <div className="flex items-baseline gap-1">
                  <span style={{ fontFamily: '"Space Grotesk", sans-serif' }} className="text-xl sm:text-2xl font-bold tracking-tight text-console-primary">
                    92.4%
                  </span>
                  <span className="text-[11px] text-console-muted">周转率</span>
                </div>
                <div className="w-12 bg-[#EAEAE8] h-1 overflow-hidden">
                  <div className="bg-console-primary h-full" style={{ width: '92.4%' }} />
                </div>
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-console-border/40 flex items-center justify-between text-[10px] text-console-muted">
                <span>在席等待: 18位</span>
                <span className="text-console-text font-medium">驻留 23.5m</span>
              </div>
            </div>

            {/* Field 3: Delivery SLA */}
            <div className="flex flex-col justify-between p-2 rounded-c bg-[#fafaf9] border border-console-border/70 hover:border-console-primary/50 transition-colors">
              <div className="flex items-center justify-between text-console-muted text-[11px] pb-1 border-b border-console-border/50">
                <span className="font-medium text-console-text flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-console-dark shrink-0" />
                  <span>外卖履约</span>
                </span>
                <span className="font-mono text-[10px] text-console-primary font-bold">
                  ▲ 2.1m 加速
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <div className="flex items-baseline gap-1">
                  <span style={{ fontFamily: '"Space Grotesk", sans-serif' }} className="text-xl sm:text-2xl font-bold tracking-tight text-console-text">
                    16.8
                  </span>
                  <span className="text-[11px] text-console-muted">min 均时</span>
                </div>
                <div className="w-12 bg-[#EAEAE8] h-1 overflow-hidden">
                  <div className="bg-console-dark h-full" style={{ width: '82%' }} />
                </div>
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-console-border/40 flex items-center justify-between text-[10px] text-console-muted">
                <span>骑手响应: 1.4m</span>
                <span className="text-console-text font-medium">延误预警: 0件</span>
              </div>
            </div>

            {/* Field 4: Pickup Cabin */}
            <div className="flex flex-col justify-between p-2 rounded-c bg-[#fafaf9] border border-console-border/70 hover:border-console-warning/50 transition-colors">
              <div className="flex items-center justify-between text-console-muted text-[11px] pb-1 border-b border-console-border/50">
                <span className="font-medium text-console-text flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-console-warning shrink-0" />
                  <span>智能保温柜</span>
                </span>
                <span className="font-mono text-[10px] text-console-warning font-bold">
                  10格待命
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <div className="flex items-baseline gap-1">
                  <span style={{ fontFamily: '"Space Grotesk", sans-serif' }} className="text-xl sm:text-2xl font-bold tracking-tight text-console-warning">
                    14
                  </span>
                  <span className="text-[11px] text-console-muted">格在柜 (58%)</span>
                </div>
                <div className="w-12 bg-[#EAEAE8] h-1 overflow-hidden">
                  <div className="bg-console-warning h-full" style={{ width: '58%' }} />
                </div>
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-console-border/40 flex items-center justify-between text-[10px] text-console-muted">
                <span>主舱: 62.4°C</span>
                <span className="text-console-text font-medium">滞留超期: 0件</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. 核心控制矩阵表 (MATRIX // 平铺表单工整架构 + 状态过滤 + 搜索收拢) */}
        <section className="bg-white border border-console-borderDark/70 rounded-c shadow-sm overflow-hidden">
          {/* Form Toolbar Header */}
          <div className="px-3 sm:px-4 py-2.5 bg-[#fbfbf9] border-b border-console-border flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3 bg-console-primary shrink-0" />
              <h2
                style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                className="text-[13px] sm:text-[14px] font-bold tracking-tight text-console-text"
              >
                流动餐车供售渠道平铺矩阵
              </h2>
              <span className="font-mono text-[10px] text-console-muted px-1.5 py-0.5 bg-[#F0F0EE] border border-console-borderDark/40 rounded-c">
                5 站点实体
              </span>
            </div>

            {/* Filter and Search Form Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search input */}
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-console-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索餐车/点位/关键词..."
                  className="h-7 pl-7 pr-2.5 bg-white border border-console-border hover:border-console-borderDark focus:border-console-primary rounded-c text-[11px] font-sans text-console-text outline-none transition-all w-36 sm:w-48"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-console-muted hover:text-console-text text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Status Select Filter */}
              <div className="flex items-center gap-1 bg-white border border-console-border rounded-c px-1.5 py-0.5">
                <Filter className="w-3 h-3 text-console-muted shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-transparent text-[11px] text-console-text outline-none cursor-pointer pr-1"
                >
                  <option value="all">全部状态</option>
                  <option value="online">全渠道营业</option>
                  <option value="throttled">部分限流/备料</option>
                  <option value="halted">全线打烊</option>
                </select>
              </div>

              {/* Status Legend indicators */}
              <div className="hidden xl:flex items-center gap-2.5 text-[10px] text-console-muted pl-2 border-l border-console-border">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>营业中</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>部分受限</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-neutral-300" />
                  <span>已打烊</span>
                </span>
              </div>
            </div>
          </div>

          {/* Form Table Header (Desktop Only) */}
          <div className="hidden lg:grid bg-[#f6f6f4] px-4 py-2 border-b border-console-border grid-cols-12 gap-3 text-[11px] font-medium text-console-muted uppercase tracking-wider items-center">
            <div className="col-span-4 flex items-center gap-1.5 text-console-text">
              <LayoutList className="w-3.5 h-3.5" />
              <span>站点与点位遥测</span>
            </div>
            <div className="col-span-3 flex items-center gap-1.5 text-console-text">
              <Power className="w-3.5 h-3.5" />
              <span>主控开关</span>
            </div>
            <div className="col-span-5 flex items-center justify-between text-console-text">
              <div className="flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>供售渠道 (堂食 / 外卖 / 自提)</span>
              </div>
              <span className="text-[10px] text-console-muted font-normal lowercase">一键启闭</span>
            </div>
          </div>

          {/* Form Rows Container */}
          <div className="divide-y divide-console-border/70">
            {[1, 2, 3, 4, 5]
              .filter((stationId) => {
                const s = stations[stationId] || INITIAL_STATIONS[stationId];
                const meta = stationMetadata[stationId];
                const allActive = s.dine && s.delivery && s.pickup;
                const anyActive = s.dine || s.delivery || s.pickup;

                // Status Filter
                if (statusFilter === 'online' && !allActive) return false;
                if (statusFilter === 'throttled' && (!anyActive || allActive)) return false;
                if (statusFilter === 'halted' && anyActive) return false;

                // Search Filter
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase();
                  const matchName = meta.title.toLowerCase().includes(q);
                  const matchLoc = meta.location.toLowerCase().includes(q);
                  const matchCode = `0${stationId}`.includes(q);
                  if (!matchName && !matchLoc && !matchCode) return false;
                }
                return true;
              })
              .map((stationId) => {
                const s = stations[stationId] || INITIAL_STATIONS[stationId];
                const meta = stationMetadata[stationId];
                const allActive = s.dine && s.delivery && s.pickup;
                const anyActive = s.dine || s.delivery || s.pickup;
                const isExpanded = !!expandedStationDetails[stationId];

                let masterLabel = '全渠道营业';
                let masterCode = `ONLINE 0x0${stationId}`;
                let statusTag = '全渠道在线';
                let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                let dotColor = 'bg-emerald-500';

                if (allActive) {
                  masterLabel = stationId === 1 ? '全渠道营业' : stationId === 5 ? '全渠道备餐' : '全渠道在线';
                  masterCode = `ONLINE 0x0${stationId}`;
                  statusTag = '全渠道营业';
                  statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                  dotColor = 'bg-emerald-500';
                } else if (anyActive) {
                  masterLabel = stationId === 2 ? '部分限流' : stationId === 3 ? '晚市备料' : '部分营业';
                  masterCode = stationId === 3 ? 'PREP // 0x03' : 'THROTTLED';
                  statusTag = stationId === 2 ? '部分限流' : stationId === 3 ? '备料打单' : '部分营业';
                  statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
                  dotColor = 'bg-amber-500';
                } else {
                  masterLabel = '全线休市打样';
                  masterCode = 'HALTED 0x00';
                  statusTag = '全线休市';
                  statusColor = 'text-neutral-500 bg-neutral-100 border-neutral-200';
                  dotColor = 'bg-neutral-400';
                }

                return (
                  <div
                    key={stationId}
                    className={`p-3 sm:px-4 sm:py-3 transition-colors ${
                      selectedStationId === stationId ? 'bg-amber-50/20' : 'hover:bg-[#fafaf8]'
                    }`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-3 items-center">
                      {/* Col 1: Station Identification & Toggle Detail */}
                      <div className="lg:col-span-4 flex flex-col justify-center min-w-0">
                        <div className="flex items-center justify-between lg:justify-start gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                            <span className="font-mono text-[11px] font-bold text-console-muted shrink-0">
                              0{stationId}#
                            </span>
                            <h3 className="font-bold text-[13px] text-console-text truncate">
                              {meta.title}
                            </h3>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-c border font-medium shrink-0 ${statusColor}`}>
                              {statusTag}
                            </span>
                          </div>

                          {/* Quick Fold / Dropdown Detail for non-essential location telemetry */}
                          <button
                            type="button"
                            onClick={() => toggleStationDetail(stationId)}
                            className="text-[10px] text-console-muted hover:text-console-text flex items-center gap-0.5 ml-auto lg:ml-1 shrink-0 cursor-pointer"
                            title="展开/隐藏详细位置遥测"
                          >
                            <span>{isExpanded ? '收起' : '详情'}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>

                        {/* Collapsed Secondary Field (Shown on demand or concise by default) */}
                        {isExpanded ? (
                          <div className="mt-1.5 pl-4 py-1 border-l-2 border-console-border text-[11px] text-console-muted bg-[#fafaf8] rounded-r-c">
                            <p className="truncate text-console-text font-medium">{meta.location}</p>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-console-muted">
                              <span>堂食态: {meta.descDine}</span>
                              <span>外卖态: {meta.descDelivery}</span>
                              <span>取餐柜: {meta.descPickup}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-0.5 text-[11px] text-console-muted pl-4 truncate">
                            {meta.location}
                          </div>
                        )}
                      </div>

                      {/* Col 2: Master Switch Form Field */}
                      <div className="lg:col-span-3 flex items-center">
                        <button
                          type="button"
                          onClick={() => toggleMasterSwitch(stationId)}
                          className={`w-full py-1.5 px-3 border rounded-c text-[11px] flex items-center justify-between transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                            s.master
                              ? 'bg-neutral-900 text-white hover:bg-black border-neutral-900'
                              : 'bg-white text-neutral-600 hover:bg-neutral-50 border-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Power className={`w-3.5 h-3.5 shrink-0 ${s.master ? 'text-emerald-400' : 'text-neutral-400'}`} />
                            <div className="flex flex-col text-left truncate">
                              <span className="font-semibold text-[11px] truncate leading-tight">
                                {masterLabel}
                              </span>
                              <span className="text-[9px] opacity-70 tracking-wider font-mono truncate">
                                {masterCode}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <span className="text-[10px] font-mono font-bold">
                              {s.master ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        </button>
                      </div>

                      {/* Col 3: 3 Independent Channel Form Controls (Pure icon horizontal display) */}
                      <div className="lg:col-span-5 flex items-center justify-between sm:justify-start gap-2">
                        {/* Dine Channel Control - Pure Icon */}
                        <button
                          type="button"
                          onClick={() => toggleChannel(stationId, 'dine')}
                          title={`堂食渠道: ${s.dine ? '开启中 (点击打烊)' : '已打烊 (点击开启)'} - ${meta.descDine}`}
                          className={`flex-1 sm:flex-initial h-8 px-3 sm:px-4 border rounded-c transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                            s.dine
                              ? 'bg-neutral-900 border-neutral-900 text-white shadow-2xs'
                              : 'bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300 hover:text-neutral-600'
                          }`}
                        >
                          <UtensilsCrossed className="w-3.5 h-3.5" />
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dine ? 'bg-emerald-400' : 'bg-neutral-300'}`} />
                        </button>

                        {/* Delivery Channel Control - Pure Icon */}
                        <button
                          type="button"
                          onClick={() => toggleChannel(stationId, 'delivery')}
                          title={`外卖渠道: ${s.delivery ? '开启中 (点击打烊)' : '已打烊 (点击开启)'} - ${meta.descDelivery}`}
                          className={`flex-1 sm:flex-initial h-8 px-3 sm:px-4 border rounded-c transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                            s.delivery
                              ? 'bg-neutral-900 border-neutral-900 text-white shadow-2xs'
                              : 'bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300 hover:text-neutral-600'
                          }`}
                        >
                          <Bike className="w-3.5 h-3.5" />
                          <span className={`w-1.5 h-1.5 rounded-full ${s.delivery ? 'bg-emerald-400' : 'bg-neutral-300'}`} />
                        </button>

                        {/* Pickup Channel Control - Pure Icon */}
                        <button
                          type="button"
                          onClick={() => toggleChannel(stationId, 'pickup')}
                          title={`自提渠道: ${s.pickup ? '开启中 (点击打烊)' : '已打烊 (点击开启)'} - ${meta.descPickup}`}
                          className={`flex-1 sm:flex-initial h-8 px-3 sm:px-4 border rounded-c transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                            s.pickup
                              ? 'bg-neutral-900 border-neutral-900 text-white shadow-2xs'
                              : 'bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300 hover:text-neutral-600'
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span className={`w-1.5 h-1.5 rounded-full ${s.pickup ? 'bg-emerald-400' : 'bg-neutral-300'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* 4. 底部变形折叠抽屉容器 */}
        <footer className="bg-console-card border border-console-borderDark/60 rounded-c shadow-sm overflow-hidden transition-all duration-300">
          {/* Collapsible Bar Header */}
          <div
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            className="px-3 sm:px-4 py-2.5 bg-[#F6F6F4] hover:bg-[#EEEEEC] cursor-pointer flex items-center justify-between transition-colors select-none"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <ChevronRight
                className={`w-4 h-4 text-console-primary transition-transform duration-300 shrink-0 ${
                  isDrawerOpen ? 'rotate-90' : ''
                }`}
              />
              <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                <span
                  style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                  className="font-bold text-[12px] sm:text-[13px] text-console-text tracking-tight truncate"
                >
                  底座遥测总线与通道负荷
                </span>
                <span className="px-1.5 py-0.5 bg-[#EAEAE8] text-console-muted font-mono text-[9px] sm:text-[10px] font-semibold rounded-c shrink-0">
                  DRAWER
                </span>
              </div>
              {/* Collapsed Real-time Summary Badge */}
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-console-borderDark text-console-muted font-mono text-[11px] truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-console-primary animate-pulse shrink-0" />
                <span className="truncate">
                  最新审计: {auditLogs[0] ? `[${auditLogs[0].time}] ${auditLogs[0].msg}` : '系统控制总线就绪'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="font-mono text-[10px] sm:text-[11px] text-console-muted hidden md:inline">
                {isDrawerOpen ? '点击折叠收起遥测面板' : '点击展开审计与负载图谱'}
              </span>
              <div className={`w-6 h-6 flex items-center justify-center bg-console-card border border-console-borderDark/60 rounded-c transition-transform duration-300 ${isDrawerOpen ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-4 h-4 text-console-text" />
              </div>
            </div>
          </div>

          {/* Morphing Drawer Content */}
          {isDrawerOpen && (
            <div className="border-t border-console-border px-3 sm:px-4 py-4 bg-console-card animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                {/* Audit Log List (8 cols) */}
                <div className="lg:col-span-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-console-border pb-4 lg:pb-0 lg:pr-5">
                  <div className="flex items-center justify-between border-b border-console-border pb-2">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-console-primary" />
                      <span
                        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                        className="font-bold text-[12px] sm:text-[13px] text-console-text uppercase"
                      >
                        全渠道开关动作日志 (REALTIME AUDIT)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-console-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-console-primary animate-ping" />
                      <span className="hidden sm:inline">REALTIME KERNEL</span>
                    </div>
                  </div>

                  {/* Log Entries */}
                  <div className="flex flex-col gap-1.5 mt-2.5 font-mono text-[10px] sm:text-[11px]">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between py-1.5 px-2.5 bg-[#F8F8F7] border border-console-border rounded-c transition-all"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`font-bold ${log.colorClass} shrink-0`}>[{log.time}]</span>
                          <span className="text-console-text truncate">{log.msg}</span>
                        </div>
                        <span className={`${log.colorClass} font-bold text-[10px] shrink-0 ml-2`}>
                          {log.stateCode}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 border-t border-console-border flex items-center justify-between font-mono text-[10px] sm:text-[11px] text-console-muted">
                    <span className="truncate">路径: /sys/urban/bus/event.log</span>
                    <button
                      type="button"
                      onClick={clearLogs}
                      className="text-console-primary hover:underline font-bold flex items-center gap-1 active:scale-95 shrink-0 ml-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 清空展示
                    </button>
                  </div>
                </div>

                {/* Channel Pressure Distribution (4 cols) */}
                <div className="lg:col-span-4 flex flex-col justify-between pt-1 lg:pt-0">
                  <div className="flex items-center justify-between border-b border-console-border pb-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-console-text" />
                      <span
                        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                        className="font-bold text-[12px] sm:text-[13px] text-console-text"
                      >
                        通道负载压力分布
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 bg-[#EAEAE8] text-console-text font-mono text-[10px] font-bold rounded-c">
                      PEAK HOURS
                    </span>
                  </div>

                  {/* Progress Bars */}
                  <div className="flex flex-col gap-2.5 mt-3 font-mono text-[11px]">
                    {/* Dine */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                        <span className="text-console-muted">堂食: 28席 / 32总座</span>
                        <span className="text-console-primary font-bold">87.5%</span>
                      </div>
                      <div className="w-full bg-[#EAEAE8] h-1.5 rounded-none overflow-hidden">
                        <div className="bg-console-primary h-full transition-all duration-500" style={{ width: '87.5%' }} />
                      </div>
                    </div>

                    {/* Delivery */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                        <span className="text-console-muted">外卖: 64单 / 80单承载</span>
                        <span className="text-console-warning font-bold">80.0%</span>
                      </div>
                      <div className="w-full bg-[#EAEAE8] h-1.5 rounded-none overflow-hidden">
                        <div className="bg-console-warning h-full transition-all duration-500" style={{ width: '80%' }} />
                      </div>
                    </div>

                    {/* Pickup */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                        <span className="text-console-muted">自提: 14格 / 24总格</span>
                        <span className="text-console-accent font-bold">58.3%</span>
                      </div>
                      <div className="w-full bg-[#EAEAE8] h-1.5 rounded-none overflow-hidden">
                        <div className="bg-console-accent h-full transition-all duration-500" style={{ width: '58.3%' }} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-console-border mt-3 flex items-center justify-between font-mono text-[10px] sm:text-[11px]">
                    <span className="text-console-muted">算力: 184件/小时</span>
                    <span className="text-console-primary font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-console-primary animate-pulse" /> 稳健运转
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};
