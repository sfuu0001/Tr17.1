import React, { useState, useEffect, useRef } from 'react';
import {
  Share2,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  RefreshCw,
  UtensilsCrossed,
  Bike,
  Package,
  Plus,
  Maximize2,
  Lock,
  QrCode,
  Timer,
  Cloud,
  Terminal,
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Radio,
  SlidersHorizontal,
  Flame,
  PhoneCall,
  RotateCcw,
  FoldVertical,
  UnfoldVertical,
  Check,
  FileCode,
  Download,
  Copy
} from 'lucide-react';
import { operationsDeckTokens } from '../../design-tokens/operationsDeckTokens';
import { Order, TableItem } from '../../types';
import {
  getTruckBusinessStatus,
  setTruckBusinessStatus,
  getAllTruckBusinessStatuses
} from '../../utils/businessStatusEngine';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';

interface MerchantOperationsDeckProps {
  orders?: Order[];
  tables?: TableItem[];
  selectedTruckId?: string;
  onSelectTruckId?: (truckId: string) => void;
  showToast?: (msg: string, isSuccess?: boolean) => void;
}

interface CabinSlot {
  id: number;
  slotCode: string;
  orderCode: string;
  orderNo?: string;
  temp: number;
  status: 'occupied' | 'empty' | 'calling';
}

const INITIAL_CABIN_SLOTS: CabinSlot[] = [
  { id: 1, slotCode: '#01', orderCode: 'P02', orderNo: 'UR-DIN-9821', temp: 61.8, status: 'occupied' },
  { id: 2, slotCode: '#02', orderCode: '空', temp: 0, status: 'empty' },
  { id: 3, slotCode: '#03', orderCode: 'P05', orderNo: 'UR-PCK-1088', temp: 63.0, status: 'occupied' },
  { id: 4, slotCode: '#04', orderCode: 'P08', orderNo: 'UR-DIN-9821', temp: 62.4, status: 'calling' },
  { id: 5, slotCode: '#05', orderCode: 'P11', temp: 62.1, status: 'occupied' },
  { id: 6, slotCode: '#06', orderCode: '空', temp: 0, status: 'empty' },
  { id: 7, slotCode: '#07', orderCode: 'P14', temp: 60.9, status: 'occupied' },
  { id: 8, slotCode: '#08', orderCode: 'P16', temp: 62.5, status: 'occupied' },
  { id: 9, slotCode: '#09', orderCode: '空', temp: 0, status: 'empty' },
  { id: 10, slotCode: '#10', orderCode: '空', temp: 0, status: 'empty' },
  { id: 11, slotCode: '#11', orderCode: 'P19', temp: 62.4, status: 'occupied' },
  { id: 12, slotCode: '#12', orderCode: '空', temp: 0, status: 'empty' }
];

const TRUCKS_LIST = [
  { id: 'truck-01', ch: 'CH-01', name: '01号·旗舰车', loc: '陆家嘴旗舰车 (主控站)', batt: '94%' },
  { id: 'truck-02', ch: 'CH-02', name: '02号·科技园车', loc: '张江科技园车', batt: '88%' },
  { id: 'truck-03', ch: 'CH-03', name: '03号·潮玩站车', loc: '前滩潮玩站', batt: '79%' },
  { id: 'truck-04', ch: 'CH-04', name: '04号·商务区备勤', loc: '虹桥商务区备勤车', batt: '100%' },
  { id: 'truck-05', ch: 'CH-05', name: '05号·巡回维修整备车', loc: '巡回维修整备车', batt: '41%' }
];

export const MerchantOperationsDeck: React.FC<MerchantOperationsDeckProps> = ({
  orders = [],
  tables = [],
  selectedTruckId = 'truck-01',
  onSelectTruckId,
  showToast: externalShowToast
}) => {
  // 1. Truck & Global Business Status
  const [currentTruckId, setCurrentTruckId] = useState<string>(selectedTruckId);
  const [isTruckMenuOpen, setIsTruckMenuOpen] = useState<boolean>(false);
  const truckMenuRef = useRef<HTMLDivElement>(null);

  const [businessStatus, setBusinessStatus] = useState(() => getTruckBusinessStatus(currentTruckId));
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);

  // Sync with prop
  useEffect(() => {
    if (selectedTruckId && selectedTruckId !== currentTruckId) {
      setCurrentTruckId(selectedTruckId);
      setBusinessStatus(getTruckBusinessStatus(selectedTruckId));
    }
  }, [selectedTruckId]);

  // Sync with global businessStatusEngine events
  useEffect(() => {
    const handleStatusChange = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.allStatuses) {
        const cfg = custom.detail.allStatuses[currentTruckId];
        if (cfg) {
          setBusinessStatus(cfg);
        }
      } else {
        setBusinessStatus(getTruckBusinessStatus(currentTruckId));
      }
    };
    window.addEventListener('obsidian_business_status_changed', handleStatusChange);
    return () => window.removeEventListener('obsidian_business_status_changed', handleStatusChange);
  }, [currentTruckId]);

  // Listen to outside click for truck menu
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (truckMenuRef.current && !truckMenuRef.current.contains(e.target as Node)) {
        setIsTruckMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, []);

  // 2. Toast System
  const [localToasts, setLocalToasts] = useState<{ id: string; msg: string; isSuccess: boolean }[]>([]);
  const showLocalToast = (msg: string, isSuccess: boolean = true) => {
    if (externalShowToast) {
      externalShowToast(msg, isSuccess);
    }
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setLocalToasts((prev) => [...prev, { id, msg, isSuccess }]);
    setTimeout(() => {
      setLocalToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  };

  // 3. Card Folding State (电脑端、手机端折叠控制)
  // Global fold switch: true means all collapsible cards are folded
  const [allFolded, setAllFolded] = useState<boolean>(false);

  // Column level folding (Deck level)
  const [foldedColumns, setFoldedColumns] = useState<Record<string, boolean>>({
    orders: false,
    cabin: false,
    tables: false,
    dispatch: false
  });

  // Card level folding (Individual cards)
  const [foldedCards, setFoldedCards] = useState<Record<string, boolean>>({});

  const isCardFolded = (cardId: string): boolean => {
    return foldedCards[cardId] !== undefined ? foldedCards[cardId] : allFolded;
  };

  const toggleCardFold = (cardId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFoldedCards((prev) => {
      const current = prev[cardId] !== undefined ? prev[cardId] : allFolded;
      return { ...prev, [cardId]: !current };
    });
  };

  const toggleColumnFold = (colId: string) => {
    setFoldedColumns((prev) => ({ ...prev, [colId]: !prev[colId] }));
  };

  const toggleAllFold = () => {
    const nextState = !allFolded;
    setAllFolded(nextState);
    setFoldedCards({});
    showLocalToast(nextState ? '已一键折叠全部卡片' : '已一键展开全部卡片');
  };

  // 4. Cabin Slots State
  const [cabinSlots, setCabinSlots] = useState<CabinSlot[]>(INITIAL_CABIN_SLOTS);
  const [pickupCodeInput, setPickupCodeInput] = useState<string>('');

  // 5. Drawer & Audit Trail State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [isAuditPanelOpen, setIsAuditPanelOpen] = useState<boolean>(false);

  // 6. Modal Detail State
  const [activeModalId, setActiveModalId] = useState<string | null>(null);

  // Master Switch Toggle
  const handleToggleMaster = () => {
    const nextState = !businessStatus.isOpen;
    setTruckBusinessStatus(
      currentTruckId,
      {
        isOpen: nextState,
        statusLabel: nextState ? '营业中' : '已熔断熔停',
        closeReason: nextState ? '总控看板恢复在线接单' : '总机熔断切断'
      },
      '运营总控看板'
    );
    setBusinessStatus(getTruckBusinessStatus(currentTruckId));
    showLocalToast(nextState ? '总机营运已恢复上线' : '警告：总机营运已被熔断暂停！', nextState);
  };

  // Channel Toggle
  const handleToggleChannel = (channel: 'dineInOpen' | 'deliveryOpen' | 'pickupOpen', label: string) => {
    const current = businessStatus[channel] !== false;
    const next = !current;
    setTruckBusinessStatus(
      currentTruckId,
      {
        [channel]: next
      },
      '运营总控看板'
    );
    setBusinessStatus(getTruckBusinessStatus(currentTruckId));
    showLocalToast(`${label}通道已${next ? '启用接单' : '暂停关闭'}`);
  };

  // Verify Pickup Code
  const handleVerifyPickupCode = () => {
    const val = pickupCodeInput.trim();
    if (!val) {
      showLocalToast('请输入4位自提验证码', false);
      return;
    }
    setCabinSlots((prev) =>
      prev.map((s) => (s.id === 4 ? { ...s, status: 'occupied' } : s))
    );
    showLocalToast(`验证码 [${val}] 核销成功！#04号智能保温柜门已自动弹开`, true);
    setPickupCodeInput('');
  };

  // Switch truck
  const handleSwitchTruck = (truckId: string) => {
    setCurrentTruckId(truckId);
    safeSetStorage('obsidian_merchant_selected_truck', truckId);
    safeSetStorage('obsidian_active_truck_id', truckId);
    setBusinessStatus(getTruckBusinessStatus(truckId));
    onSelectTruckId?.(truckId);
    setIsTruckMenuOpen(false);
    const target = TRUCKS_LIST.find((t) => t.id === truckId);
    showLocalToast(`已切换网点至: ${target?.name || truckId}`);
  };

  // Current active truck item
  const currentTruck = TRUCKS_LIST.find((t) => t.id === currentTruckId) || TRUCKS_LIST[0];

  return (
    <div className="w-full min-h-full bg-white text-[#111110] font-sans antialiased pb-10">
      {/* Toast Overlay */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none space-y-2 max-w-sm">
        {localToasts.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded-[3px] border text-xs font-mono font-medium flex items-center gap-2 shadow-lg transition-all pointer-events-auto bg-white ${
              t.isSuccess ? 'border-[#111110] text-[#111110]' : 'border-[#dc2626] text-[#dc2626]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                t.isSuccess ? 'bg-[#15803d]' : 'bg-[#dc2626]'
              }`}
            />
            <span className="truncate">{t.msg}</span>
          </div>
        ))}
      </div>

      {/* 1. Top Global Precision Navigation Bar (White Minimal Industrial Style) */}
      <header className="w-full bg-white border-b border-[#e5e5e0] sticky top-0 z-30 px-3 sm:px-5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="max-w-[1780px] mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Brand + Truck Selector + Global Master Switch */}
          <div className="flex items-center justify-between md:justify-start gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[3px] border border-[#e5e5e0] bg-white flex items-center justify-center text-[#111110] shadow-[0_1px_1px_rgba(0,0,0,0.02)]">
                <Share2 className="w-4 h-4 text-[#111110]" />
              </div>
              <div className="leading-tight">
                <span className="font-heading font-bold text-[14px] sm:text-[15px] tracking-tight text-[#111110] block">
                  OPERATIONS_DECK
                </span>
                <span className="font-mono text-[10px] text-[#767670] tracking-wider uppercase">
                  V4.8 MESH DISPATCH
                </span>
              </div>
            </div>

            <div className="h-4 w-[1px] bg-[#e5e5e0] hidden sm:block" />

            {/* Truck Selector Dropdown */}
            <div className="relative inline-block text-left" ref={truckMenuRef}>
              <button
                type="button"
                onClick={() => setIsTruckMenuOpen((prev) => !prev)}
                className="h-8 px-2.5 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#1a1c1b] rounded-[3px] text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${businessStatus.isOpen ? 'bg-[#15803d]' : 'bg-[#dc2626]'}`} />
                <span className="font-semibold truncate max-w-[130px] sm:max-w-[160px]">
                  {currentTruck.name}
                </span>
                <span className="px-1 py-0.5 border border-[#d3d1cb] rounded-[2px] text-[10px] bg-[#fafaf8]">
                  {currentTruck.ch}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#767670] transition-transform ${isTruckMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isTruckMenuOpen && (
                <div className="absolute left-0 mt-1 w-64 bg-white border border-[#e5e5e0] rounded-[3px] shadow-lg z-50 p-1 divide-y divide-[#f0f0eb]">
                  <div className="p-1.5 space-y-1">
                    {TRUCKS_LIST.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSwitchTruck(t.id)}
                        className={`w-full text-left px-2 py-1.5 rounded-[2px] flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          currentTruckId === t.id ? 'bg-[#f5f5f2] font-semibold text-[#111110]' : 'hover:bg-[#f5f5f2] text-[#333330]'
                        }`}
                      >
                        <span className="truncate">{t.name}</span>
                        <span className="font-mono text-[11px] text-[#15803d] shrink-0 ml-2">
                          {t.batt} · 在网
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Master Power Button (White Industrial Outline) */}
            <button
              type="button"
              onClick={handleToggleMaster}
              className="h-8 px-2.5 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#111110] rounded-[3px] text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  businessStatus.isOpen ? 'bg-[#15803d] animate-pulse' : 'bg-[#dc2626]'
                }`}
              />
              <span>
                {businessStatus.isOpen ? '总机: 营运接单中' : '总机: 已熔断熔停'}
              </span>
            </button>
          </div>

          {/* Channel Gates, Fold Switch & Actions */}
          <div className="flex items-center justify-between md:justify-end gap-2 flex-wrap">
            {/* 3 Channel Toggles (Strictly White bg + 1px border) */}
            <div className="flex items-center gap-1.5 bg-[#fbfbf9] p-0.5 border border-[#e5e5e0] rounded-[3px]">
              <span className="font-mono text-[10px] text-[#767670] px-1 hidden lg:inline whitespace-nowrap">
                GATE:
              </span>
              <button
                type="button"
                onClick={() => handleToggleChannel('dineInOpen', '堂食')}
                className={`h-7 px-2 sm:px-2.5 bg-white border text-xs font-medium rounded-[2px] flex items-center gap-1 transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer ${
                  businessStatus.dineInOpen !== false
                    ? 'border-[#e5e5e0] hover:border-[#d3d1cb] text-[#111110]'
                    : 'border-[#e5e5e0] text-[#767670] opacity-50'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">堂食</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    businessStatus.dineInOpen !== false ? 'bg-[#15803d]' : 'bg-[#d3d1cb]'
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => handleToggleChannel('deliveryOpen', '外卖')}
                className={`h-7 px-2 sm:px-2.5 bg-white border text-xs font-medium rounded-[2px] flex items-center gap-1 transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer ${
                  businessStatus.deliveryOpen !== false
                    ? 'border-[#e5e5e0] hover:border-[#d3d1cb] text-[#111110]'
                    : 'border-[#e5e5e0] text-[#767670] opacity-50'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">外卖</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    businessStatus.deliveryOpen !== false ? 'bg-[#2563eb]' : 'bg-[#d3d1cb]'
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => handleToggleChannel('pickupOpen', '自提')}
                className={`h-7 px-2 sm:px-2.5 bg-white border text-xs font-medium rounded-[2px] flex items-center gap-1 transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer ${
                  businessStatus.pickupOpen !== false
                    ? 'border-[#e5e5e0] hover:border-[#d3d1cb] text-[#111110]'
                    : 'border-[#e5e5e0] text-[#767670] opacity-50'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">自提</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    businessStatus.pickupOpen !== false ? 'bg-[#15803d]' : 'bg-[#d3d1cb]'
                  }`}
                />
              </button>
            </div>

            {/* PC/Mobile Universal Fold All Switch Button (电脑端、手机端要求卡片折叠显示) */}
            <button
              type="button"
              onClick={toggleAllFold}
              className={`h-7 px-2 sm:px-2.5 border rounded-[3px] flex items-center gap-1.5 font-mono text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_1px_rgba(0,0,0,0.02)] ${
                allFolded
                  ? 'bg-[#111110] text-white border-[#111110]'
                  : 'bg-white hover:bg-[#f7f7f5] text-[#111110] border-[#e5e5e0]'
              }`}
              title={allFolded ? '展开全部卡片' : '折叠全部卡片'}
            >
              {allFolded ? (
                <UnfoldVertical className="w-3.5 h-3.5 text-white" />
              ) : (
                <FoldVertical className="w-3.5 h-3.5 text-[#111110]" />
              )}
              <span className="whitespace-nowrap">
                {allFolded ? '一键展开' : '一键折叠'}
              </span>
            </button>

            {/* TTS Broadcast status & refresh */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTtsEnabled((prev) => !prev);
                  showLocalToast(`TTS播报已${!ttsEnabled ? '开启' : '关闭'}`);
                }}
                className="h-7 px-2 border border-[#e5e5e0] bg-white hover:bg-[#f7f7f5] rounded-[3px] flex items-center gap-1 font-mono text-[11px] text-[#767670] cursor-pointer"
              >
                {ttsEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-[#111110]" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-[#dc2626]" />
                )}
                <span className="text-[#111110] font-semibold whitespace-nowrap hidden sm:inline">
                  TTS播报
                </span>
                <span className={ttsEnabled ? 'text-[#15803d]' : 'text-[#dc2626]'}>
                  {ttsEnabled ? '开' : '关'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBusinessStatus(getTruckBusinessStatus(currentTruckId));
                  showLocalToast('运营看板数据已刷新');
                }}
                className="h-7 w-7 border border-[#e5e5e0] hover:border-[#d3d1cb] bg-white hover:bg-[#f7f7f5] text-[#111110] rounded-[3px] flex items-center justify-center transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer"
                title="刷新数据"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setActiveModalId('design-tokens')}
                className="h-7 px-2 border border-[#e5e5e0] hover:border-[#111110] bg-white hover:bg-[#f7f7f5] text-[#111110] rounded-[3px] flex items-center gap-1 font-mono text-[11px] font-semibold transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer"
                title="导出工业级设计令牌规范 (DTCG Tokens)"
              >
                <FileCode className="w-3.5 h-3.5 text-[#2563eb]" />
                <span className="hidden sm:inline">设计令牌</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Content */}
      <main className="max-w-[1780px] mx-auto p-3 sm:p-5 space-y-4">
        {/* 2. 5大核心遥测平铺表单栏 (Flat Form Telemetry Bar) */}
        <section className="bg-white border border-[#e5e5e0] rounded-[3px] p-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-2.5 border-b border-[#f0f0eb] gap-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[#15803d] shrink-0" />
              <span className="font-heading font-bold text-[13px] text-[#111110]">餐车运营遥测大盘</span>
              <span className="text-[10px] text-[#767670] font-mono">OPERATIONS TELEMETRY</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#767670]">
              <span className="text-[10px] bg-[#f9f9f7] px-2 py-0.5 rounded-[2px] border border-[#e5e5e0] font-mono">
                5 台全编组在线巡航
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* Field 1: Stations Network */}
            <div className="bg-[#fafaf8] border border-[#e5e5e0] rounded-[2px] p-2.5 flex flex-col justify-between hover:border-[#111110] transition-colors">
              <div className="flex items-center justify-between text-[#767670] pb-1 border-b border-[#f0f0eb]">
                <span className="text-[11px] font-medium text-[#111110]">网点在编</span>
                <Share2 className="w-3.5 h-3.5 text-[#2563eb]" />
              </div>
              <div className="my-1.5 flex items-baseline gap-1">
                <span style={{ fontFamily: '"Space Grotesk", sans-serif' }} className="text-xl sm:text-2xl font-bold text-[#111110]">
                  05
                </span>
                <span className="text-[10px] text-[#767670]">台巡测</span>
              </div>
              <div className="pt-1 border-t border-[#f0f0eb] flex items-center justify-between text-[10px] text-[#767670]">
                <span>4营运 / 1备</span>
                <span className="font-bold text-[#15803d]">MESH 100%</span>
              </div>
            </div>

            {/* Field 2: Prep Intake */}
            <div className="bg-[#fafaf8] border border-[#e5e5e0] rounded-[2px] p-2.5 flex flex-col justify-between hover:border-[#111110] transition-colors">
              <div className="flex items-center justify-between text-[#767670] pb-1 border-b border-[#f0f0eb]">
                <span className="text-[11px] font-medium text-[#111110]">进单吞吐</span>
                <Zap className="w-3.5 h-3.5 text-[#d97706]" />
              </div>
              <div className="my-1.5 flex items-baseline gap-1">
                <span style={{ fontFamily: '"Space Grotesk", sans-serif' }} className="text-xl sm:text-2xl font-bold text-[#111110]">
                  142
                </span>
                <span className="text-[10px] text-[#767670]">单 / 小时</span>
              </div>
              <div className="pt-1 border-t border-[#f0f0eb] flex items-center justify-between text-[10px] text-[#767670]">
                <span>均出餐耗时</span>
                <span className="font-medium text-[#111110]">04m 12s</span>
              </div>
            </div>

            {/* Field 3: Pickup Cabin */}
            <div className="bg-[#fafaf8] border border-[#e5e5e0] rounded-[2px] p-2.5 flex flex-col justify-between hover:border-[#111110] transition-colors">
              <div className="flex items-center justify-between text-[#767670] pb-1 border-b border-[#f0f0eb]">
                <span className="text-[11px] font-medium text-[#111110]">保温柜负荷</span>
                <Lock className="w-3.5 h-3.5 text-[#15803d]" />
              </div>
              <div className="my-1.5 flex items-baseline gap-1">
                <span style={{ fontFamily: '"Space Grotesk", sans-serif' }} className="text-xl sm:text-2xl font-bold text-[#111110]">
                  14
                </span>
                <span className="text-[10px] text-[#767670]">格待取 (58%)</span>
              </div>
              <div className="pt-1 border-t border-[#f0f0eb] flex items-center justify-between text-[10px] text-[#767670]">
                <span>主舱温控</span>
                <span className="font-medium text-[#15803d]">62.4°C 恒定</span>
              </div>
            </div>

            {/* Field 4: Dine-In Occupancy */}
            <div className="bg-[#fafaf8] border border-[#e5e5e0] rounded-[2px] p-2.5 flex flex-col justify-between hover:border-[#111110] transition-colors">
              <div className="flex items-center justify-between text-[#767670] pb-1 border-b border-[#f0f0eb]">
                <span className="text-[11px] font-medium text-[#111110]">堂食翻台</span>
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#2563eb]" />
              </div>
              <div className="my-1.5 flex items-baseline gap-1">
                <span style={{ fontFamily: '"Space Grotesk", sans-serif' }} className="text-xl sm:text-2xl font-bold text-[#111110]">
                  92.4%
                </span>
                <span className="text-[10px] text-[#767670]">3.4次/日</span>
              </div>
              <div className="pt-1 border-t border-[#f0f0eb] flex items-center justify-between text-[10px] text-[#767670]">
                <span>7在席</span>
                <span className="font-medium text-rose-600">等位3组</span>
              </div>
            </div>

            {/* Field 5: Delivery SLA */}
            <div className="col-span-2 sm:col-span-1 bg-[#fafaf8] border border-[#e5e5e0] rounded-[2px] p-2.5 flex flex-col justify-between hover:border-[#111110] transition-colors">
              <div className="flex items-center justify-between text-[#767670] pb-1 border-b border-[#f0f0eb]">
                <span className="text-[11px] font-medium text-[#111110]">外卖履约</span>
                <Bike className="w-3.5 h-3.5 text-[#2563eb]" />
              </div>
              <div className="my-1.5 flex items-baseline gap-1">
                <span style={{ fontFamily: '"Space Grotesk", sans-serif' }} className="text-xl sm:text-2xl font-bold text-[#111110]">
                  16.8
                </span>
                <span className="text-[10px] text-[#767670]">min 均时</span>
              </div>
              <div className="pt-1 border-t border-[#f0f0eb] flex items-center justify-between text-[10px] text-[#767670]">
                <span>双平台直连</span>
                <span className="font-medium text-[#2563eb]">12单全速中</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. 4 Core Business Operation Columns Matrix */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
          {/* ==============================================
                 COLUMN 1: 点餐受理矩阵 (Ordering Deck)
            ============================================== */}
          <div className="bg-white border border-[#e5e5e0] rounded-[3px] shadow-sm flex flex-col overflow-hidden">
            {/* Header with Column-level fold toggle */}
            <div className="bg-white border-b border-[#e5e5e0] px-3 py-2.5 flex items-center justify-between">
              <div
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => toggleColumnFold('orders')}
              >
                <span className="w-2 h-2 rounded-full bg-[#15803d]" />
                <div>
                  <h2 className="font-heading font-bold text-[14px] text-[#111110] leading-tight flex items-center gap-1.5">
                    <span>点餐受理矩阵</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#767670] transition-transform ${
                        foldedColumns['orders'] ? '-rotate-90' : ''
                      }`}
                    />
                  </h2>
                  <span className="font-mono text-[10px] text-[#767670] uppercase tracking-wider">
                    INTAKE // 6 制作中
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalId('ord-new')}
                className="h-7 px-2.5 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#111110] rounded-[3px] font-mono text-xs font-semibold flex items-center gap-1 transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">补单录入</span>
              </button>
            </div>

            {/* Column Body (Collapsible on PC & Mobile) */}
            {!foldedColumns['orders'] && (
              <div className="p-2.5 space-y-2 max-h-[640px] overflow-y-auto">
                {/* Order Card 1: 制作中 (平铺表单样式 + 零药丸设计) */}
                <div
                  className="group bg-white border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] p-2.5 transition-all shadow-2xs cursor-pointer"
                  onClick={() => setActiveModalId('ord-9821')}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#f0f0eb]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#15803d]" />
                      <span className="font-bold text-xs text-[#111110]">
                        #UR-DIN-9821
                      </span>
                      <span className="text-[11px] text-[#2563eb] font-medium">
                        堂食 · A2桌
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className="text-[11px] text-[#767670] font-mono">03m 14s</span>
                      <button
                        type="button"
                        onClick={(e) => toggleCardFold('ord-9821', e)}
                        className="w-5 h-5 border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110]"
                        title={isCardFolded('ord-9821') ? '展开卡片详情' : '折叠卡片'}
                      >
                        {isCardFolded('ord-9821') ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalId('ord-9821');
                        }}
                        className="w-5 h-5 border border-transparent group-hover:border-[#d3d1cb] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110]"
                        title="放大查看拓扑"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Folded Compact Line vs Expanded Body */}
                  {isCardFolded('ord-9821') ? (
                    <div className="text-[11px] text-[#767670] flex items-center justify-between pt-1.5">
                      <span className="truncate">黑松露和牛汉堡 x1、提灯串 x2</span>
                      <span className="text-[#15803d] font-medium shrink-0 ml-1">制作中</span>
                    </div>
                  ) : (
                    <div className="pt-2 space-y-1.5">
                      <div className="space-y-1 text-xs bg-[#fafaf8] p-2 rounded-[2px] border border-[#f0f0eb]">
                        <div className="flex justify-between items-center text-[#111110]">
                          <span className="font-medium truncate pr-2">黑松露和牛汉堡堡排</span>
                          <span className="font-bold text-[#111110]">x1</span>
                        </div>
                        <p className="text-[10px] text-[#767670] truncate">7分熟 / 减盐 / 手工洋葱圈</p>
                        <div className="flex justify-between items-center text-[#111110] pt-1 border-t border-[#f0f0eb]">
                          <span className="font-medium truncate pr-2">炭烤提灯提浆串</span>
                          <span className="font-bold text-[#111110]">x2</span>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#15803d]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#15803d] animate-ping" />
                          铁板炉台制作中
                        </span>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => showLocalToast('已发送后厨催单提醒')}
                            className="h-6 px-2 bg-white border border-[#e5e5e0] hover:border-[#111110] text-[#111110] text-[11px] font-medium rounded-[2px] transition-all cursor-pointer whitespace-nowrap"
                          >
                            催单
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveModalId('ord-9821')}
                            className="h-6 px-2 bg-neutral-900 hover:bg-black text-white text-[11px] font-medium rounded-[2px] transition-all cursor-pointer whitespace-nowrap"
                          >
                            呼叫传菜
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Card 2: 待移入保温柜 (平铺表单样式 + 零药丸设计) */}
                <div
                  className="group bg-white border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] p-2.5 transition-all shadow-2xs cursor-pointer"
                  onClick={() => setActiveModalId('ord-4029')}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#f0f0eb]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
                      <span className="font-bold text-xs text-[#111110]">
                        #UR-DEL-4029
                      </span>
                      <span className="text-[11px] text-[#d97706] font-medium">
                        美团专送
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className="text-[11px] font-medium text-[#2563eb]">01m 02s</span>
                      <button
                        type="button"
                        onClick={(e) => toggleCardFold('ord-4029', e)}
                        className="w-5 h-5 border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110]"
                        title={isCardFolded('ord-4029') ? '展开卡片详情' : '折叠卡片'}
                      >
                        {isCardFolded('ord-4029') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalId('ord-4029');
                        }}
                        className="w-5 h-5 border border-transparent group-hover:border-[#d3d1cb] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110]"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isCardFolded('ord-4029') ? (
                    <div className="text-[11px] text-[#767670] flex items-center justify-between pt-1.5">
                      <span className="truncate">照烧鸡肉便当 x2、特调柑橘冰萃 x1</span>
                      <span className="text-[#2563eb] font-medium shrink-0 ml-1">已封签</span>
                    </div>
                  ) : (
                    <div className="pt-2 space-y-1.5">
                      <div className="space-y-1 text-xs bg-[#fafaf8] p-2 rounded-[2px] border border-[#f0f0eb]">
                        <div className="flex justify-between items-center text-[#111110]">
                          <span className="font-medium truncate pr-2">日式极上照烧鸡肉便当</span>
                          <span className="font-bold text-[#111110]">x2</span>
                        </div>
                        <div className="flex justify-between items-center text-[#111110] pt-1 border-t border-[#f0f0eb]">
                          <span className="font-medium truncate pr-2">特调柑橘气泡冰萃</span>
                          <span className="font-bold text-[#111110]">x1</span>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#2563eb]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
                          打包封签完毕
                        </span>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => showLocalToast('已分配并开启 #04 号智能保温柜')}
                            className="h-6 px-2 bg-neutral-900 hover:bg-black text-white text-[11px] font-medium rounded-[2px] transition-all cursor-pointer whitespace-nowrap"
                          >
                            移入保温柜
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Card 3: 刚进单待排产 (平铺表单样式 + 零药丸设计) */}
                <div
                  className="group bg-white border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] p-2.5 transition-all shadow-2xs cursor-pointer"
                  onClick={() => setActiveModalId('ord-1088')}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#f0f0eb]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                      <span className="font-bold text-xs text-[#111110]">
                        #UR-PCK-1088
                      </span>
                      <span className="text-[11px] text-[#767670] font-medium">
                        自提待产
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className="text-[11px] text-[#767670] font-mono">00m 18s</span>
                      <button
                        type="button"
                        onClick={(e) => toggleCardFold('ord-1088', e)}
                        className="w-5 h-5 border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110]"
                        title={isCardFolded('ord-1088') ? '展开卡片详情' : '折叠卡片'}
                      >
                        {isCardFolded('ord-1088') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalId('ord-1088');
                        }}
                        className="w-5 h-5 border border-transparent group-hover:border-[#d3d1cb] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110]"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isCardFolded('ord-1088') ? (
                    <div className="text-[11px] text-[#767670] flex items-center justify-between pt-1.5">
                      <span className="truncate">招牌手打柠檬茶 (加浓) x1</span>
                      <span className="text-[#767670] font-medium shrink-0 ml-1">待产</span>
                    </div>
                  ) : (
                    <div className="pt-2 space-y-1.5">
                      <div className="text-xs bg-[#fafaf8] p-2 rounded-[2px] border border-[#f0f0eb]">
                        <div className="flex justify-between items-center text-[#111110]">
                          <span className="font-medium truncate pr-2">招牌手打柠檬茶 (加浓)</span>
                          <span className="font-bold text-[#111110]">x1</span>
                        </div>
                        <p className="text-[10px] text-[#767670] mt-0.5">少冰 / 标准糖 / 取餐码待生成</p>
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[11px] text-[#767670] whitespace-nowrap">
                          票据已自动打印
                        </span>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => showLocalToast('订单已接入产线排期')}
                            className="h-6 px-2 bg-neutral-900 hover:bg-black text-white text-[11px] font-medium rounded-[2px] transition-all cursor-pointer whitespace-nowrap"
                          >
                            接单排产
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ==============================================
                 COLUMN 2: 到店取餐与智能保温柜 (Pickup Cabin Hub)
            ============================================== */}
          <div className="bg-white border border-[#e5e5e0] rounded-[3px] shadow-sm flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-[#e5e5e0] px-3 py-2.5 flex items-center justify-between">
              <div
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => toggleColumnFold('cabin')}
              >
                <span className="w-2 h-2 rounded-full bg-[#15803d]" />
                <div>
                  <h2 className="font-heading font-bold text-[14px] text-[#111110] leading-tight flex items-center gap-1.5">
                    <span>智能保温取餐柜</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#767670] transition-transform ${
                        foldedColumns['cabin'] ? '-rotate-90' : ''
                      }`}
                    />
                  </h2>
                  <span className="font-mono text-[10px] text-[#767670] uppercase tracking-wider">
                    CABIN // 12格位闭环
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-[#15803d] border border-[#15803d]/40 bg-[#15803d]/5 px-2 py-0.5 rounded-[3px] whitespace-nowrap">
                62.4°C 恒温
              </span>
            </div>

            {!foldedColumns['cabin'] && (
              <div className="p-2.5 space-y-2.5 max-h-[640px] overflow-y-auto">
                {/* Voice Caller Box */}
                <div className="border border-[#e5e5e0] rounded-[3px] p-2 bg-[#fafaf8]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-semibold text-[#767670] uppercase">
                      实时语音呼叫队列
                    </span>
                    <Volume2 className="w-3.5 h-3.5 text-[#15803d] animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] p-2 rounded-[2px] transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xl font-bold text-[#111110] tracking-tight shrink-0">
                        P08
                      </span>
                      <div className="leading-tight truncate">
                        <span className="text-xs font-bold text-[#111110] block truncate">
                          请尾号 9821 顾客取餐
                        </span>
                        <span className="font-mono text-[10px] text-[#767670]">
                          柜格 #04 · 播报第 2 次
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => showLocalToast('已触发柜前大喇叭语音重播')}
                      className="h-6 px-2 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#111110] text-[11px] font-medium rounded-[2px] transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer shrink-0 ml-1 whitespace-nowrap"
                    >
                      重呼
                    </button>
                  </div>
                </div>

                {/* 12-Slot Cabin Physical Topology Matrix (4x3 Grid, Foldable on Mobile/PC) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#767670]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold uppercase">格位电控与测温</span>
                      <button
                        type="button"
                        onClick={(e) => toggleCardFold('cabin-grid', e)}
                        className="text-[10px] font-mono underline hover:text-[#111110]"
                      >
                        {isCardFolded('cabin-grid') ? '[展开格位网格]' : '[收起网格]'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#15803d]" />在柜
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d3d1cb]" />空闲
                      </span>
                    </div>
                  </div>

                  {isCardFolded('cabin-grid') ? (
                    <div className="p-2 border border-[#e5e5e0] rounded-[3px] bg-[#fafaf8] font-mono text-xs flex items-center justify-between">
                      <span>已占 8格 / 空闲 4格</span>
                      <span className="font-bold text-[#15803d]">主舱 62.4°C</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5 bg-[#fbfbf9] p-1.5 border border-[#e5e5e0] rounded-[3px]">
                      {cabinSlots.map((slot) => {
                        const isCalling = slot.status === 'calling';
                        const isEmpty = slot.status === 'empty';
                        return (
                          <div
                            key={slot.id}
                            onClick={() => {
                              if (isEmpty) {
                                showLocalToast(`${slot.slotCode} 格位空闲，随时可存餐`);
                              } else {
                                setActiveModalId(`slot-${slot.id}`);
                              }
                            }}
                            className={`p-1.5 rounded-[2px] flex flex-col justify-between h-16 cursor-pointer transition-all ${
                              isEmpty
                                ? 'bg-[#fafaf8] border border-dashed border-[#d3d1cb] hover:border-[#1a1c1b]'
                                : isCalling
                                ? 'bg-white border border-[#15803d]/60 shadow-sm'
                                : 'bg-white border border-[#d3d1cb] hover:border-[#1a1c1b] shadow-[0_1px_1px_rgba(0,0,0,0.02)]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-mono text-[10px] font-bold ${isEmpty ? 'text-[#a0a09a]' : 'text-[#767670]'}`}>
                                {slot.slotCode}
                              </span>
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isCalling ? 'bg-[#15803d] animate-ping' : isEmpty ? 'bg-[#d3d1cb]' : 'bg-[#15803d]'
                                }`}
                              />
                            </div>
                            <span className={`font-mono font-bold text-xs ${isEmpty ? 'text-[#a0a09a]' : 'text-[#111110]'}`}>
                              {slot.orderCode}
                            </span>
                            <span className={`font-mono text-[9px] ${isEmpty ? 'text-[#a0a09a]' : isCalling ? 'font-bold text-[#15803d]' : 'text-[#767670]'}`}>
                              {isCalling ? '呼叫中' : isEmpty ? '待命' : `${slot.temp}°`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick QR & Manual Input Panel */}
                <div className="border border-[#e5e5e0] rounded-[3px] p-2.5 bg-white space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#111110]">自提柜格快验通道</span>
                    <span className="font-mono text-[#15803d] flex items-center gap-0.5 text-[10px]">
                      <QrCode className="w-3.5 h-3.5" /> 扫描探头 在线
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={4}
                      value={pickupCodeInput}
                      onChange={(e) => setPickupCodeInput(e.target.value)}
                      placeholder="输入4位校验码 (如 9821)"
                      className="flex-1 h-8 px-2.5 border border-[#e5e5e0] hover:border-[#d3d1cb] focus:border-[#1a1c1b] rounded-[3px] font-mono text-xs text-[#111110] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyPickupCode}
                      className="h-8 px-3 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#111110] text-xs font-semibold rounded-[3px] transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer whitespace-nowrap"
                    >
                      核销弹开
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ==============================================
                 COLUMN 3: 堂食台位与出餐矩阵 (Dine-in Matrix)
            ============================================== */}
          <div className="bg-white border border-[#e5e5e0] rounded-[3px] shadow-sm flex flex-col overflow-hidden">
            <div className="bg-white border-b border-[#e5e5e0] px-3 py-2.5 flex items-center justify-between">
              <div
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => toggleColumnFold('tables')}
              >
                <span className="w-2 h-2 rounded-full bg-[#15803d]" />
                <div>
                  <h2 className="font-heading font-bold text-[14px] text-[#111110] leading-tight flex items-center gap-1.5">
                    <span>堂食台位矩阵</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#767670] transition-transform ${
                        foldedColumns['tables'] ? '-rotate-90' : ''
                      }`}
                    />
                  </h2>
                  <span className="font-mono text-[10px] text-[#767670] uppercase tracking-wider">
                    TABLES // 7 在席 · 1 空闲
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalId('tbl-new')}
                className="h-7 px-2.5 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#111110] rounded-[3px] font-mono text-xs font-semibold flex items-center gap-1 transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>开台登记</span>
              </button>
            </div>

            {!foldedColumns['tables'] && (
              <div className="p-2.5 space-y-2 max-h-[640px] overflow-y-auto">
                {/* Table A1: 空台待客 (平铺表单样式 + 零药丸) */}
                <div
                  className="group bg-white border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] p-2.5 transition-all shadow-2xs cursor-pointer"
                  onClick={() => setActiveModalId('tbl-a1')}
                >
                  <div className="flex items-center justify-between pb-1 border-b border-[#f0f0eb]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#111110]">A1</span>
                      <span className="text-[11px] text-[#767670] font-medium">
                        外摆 · 2人
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#15803d]" />
                      <span className="text-[11px] text-[#15803d] font-medium">
                        空台就绪
                      </span>
                      <button
                        type="button"
                        onClick={(e) => toggleCardFold('tbl-a1', e)}
                        className="w-5 h-5 border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110] ml-1"
                      >
                        {isCardFolded('tbl-a1') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {!isCardFolded('tbl-a1') && (
                    <div className="pt-2">
                      <p className="text-[11px] text-[#767670] truncate mb-2">已消毒整备，可接纳下一位顾客</p>
                      <div className="pt-1.5 border-t border-[#f0f0eb] flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => showLocalToast('A1 台位已激活并分发点餐码')}
                          className="h-6 px-2.5 bg-neutral-900 hover:bg-black text-white text-[11px] font-medium rounded-[2px] transition-all cursor-pointer whitespace-nowrap"
                        >
                          一键开台
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Table A2: 就餐中 (平铺表单样式 + 零药丸) */}
                <div
                  className="group bg-white border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] p-2.5 transition-all shadow-2xs cursor-pointer"
                  onClick={() => setActiveModalId('tbl-a2')}
                >
                  <div className="flex items-center justify-between pb-1 border-b border-[#f0f0eb]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#111110]">A2</span>
                      <span className="text-[11px] text-[#2563eb] font-medium">
                        外摆 · 4人
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#767670]">
                      <Timer className="w-3 h-3 text-[#2563eb]" />
                      <span>28m</span>
                      <button
                        type="button"
                        onClick={(e) => toggleCardFold('tbl-a2', e)}
                        className="w-5 h-5 border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110]"
                      >
                        {isCardFolded('tbl-a2') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalId('tbl-a2');
                        }}
                        className="w-5 h-5 border border-transparent group-hover:border-[#d3d1cb] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110]"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isCardFolded('tbl-a2') ? (
                    <div className="text-[11px] text-[#767670] flex items-center justify-between pt-1.5">
                      <span>上菜 4/7 (57%) · 3人就座</span>
                      <span style={{ fontFamily: '"Space Grotesk", sans-serif' }} className="text-[#2563eb] font-bold">¥198.00</span>
                    </div>
                  ) : (
                    <div className="pt-2">
                      <div className="space-y-1 mb-2 bg-[#fafaf8] p-2 rounded-[2px] border border-[#f0f0eb]">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#767670]">上菜进度: 4/7 样</span>
                          <span className="font-bold text-[#111110]">57%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#f0f0eb] rounded-[1px] overflow-hidden">
                          <div className="bg-[#2563eb] h-full w-[57%]" />
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-[#f0f0eb] flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-[#767670] truncate max-w-[90px]">
                          #UR-DIN-9821
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span style={{ fontFamily: '"Space Grotesk", sans-serif' }} className="text-xs font-bold text-[#111110] mr-1">¥198.00</span>
                          <button
                            type="button"
                            onClick={() => showLocalToast('加菜二维码已推送至顾客桌台')}
                            className="h-6 px-2 bg-white border border-[#e5e5e0] hover:border-[#111110] text-[#111110] text-[11px] font-medium rounded-[2px] transition-all cursor-pointer whitespace-nowrap"
                          >
                            加单
                          </button>
                          <button
                            type="button"
                            onClick={() => showLocalToast('A2 正在打印结账小票')}
                            className="h-6 px-2 bg-neutral-900 hover:bg-black text-white text-[11px] font-medium rounded-[2px] transition-all cursor-pointer whitespace-nowrap"
                          >
                            结账翻台
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Table B1: 散客吧台 */}
                <div
                  className="group bg-white border border-[#e5e5e0] hover:border-[#1a1c1b] rounded-[3px] p-2.5 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer"
                  onClick={() => setActiveModalId('tbl-b1')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-base text-[#111110]">B1</span>
                      <span className="text-[11px] text-[#767670] bg-[#fafaf8] border border-[#e5e5e0] px-1.5 py-0.5 rounded-[2px] whitespace-nowrap">
                        室内 · 散客吧台
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-[#767670]">
                      <Timer className="w-3 h-3" />
                      <span>14m</span>
                      <button
                        type="button"
                        onClick={(e) => toggleCardFold('tbl-b1', e)}
                        className="w-5 h-5 border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110]"
                      >
                        {isCardFolded('tbl-b1') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {!isCardFolded('tbl-b1') && (
                    <>
                      <div className="space-y-1 mb-2">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#767670]">上菜进度: 2/2 全齐</span>
                          <span className="font-mono font-bold text-[#15803d]">100%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#f0f0eb] rounded-[1px] overflow-hidden">
                          <div className="bg-[#15803d] h-full w-full" />
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-[#f0f0eb] flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => showLocalToast('已触发换台向导')}
                          className="h-6 px-2 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#111110] text-[11px] rounded-[2px] transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer whitespace-nowrap"
                        >
                          换台
                        </button>
                        <button
                          type="button"
                          onClick={() => showLocalToast('B1 离席清扫完毕')}
                          className="h-6 px-2 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#111110] text-[11px] font-semibold rounded-[2px] transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer whitespace-nowrap"
                        >
                          翻台离桌
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Table C1: 6人卡座 */}
                <div
                  className="group bg-white border border-[#e5e5e0] hover:border-[#1a1c1b] rounded-[3px] p-2.5 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer"
                  onClick={() => setActiveModalId('tbl-c1')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-base text-[#111110]">C1</span>
                      <span className="text-[11px] text-[#767670] bg-[#fafaf8] border border-[#e5e5e0] px-1.5 py-0.5 rounded-[2px] whitespace-nowrap">
                        内侧 · 6人卡座
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-[#767670]">
                      <Timer className="w-3 h-3" />
                      <span>52m</span>
                      <button
                        type="button"
                        onClick={(e) => toggleCardFold('tbl-c1', e)}
                        className="w-5 h-5 border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110]"
                      >
                        {isCardFolded('tbl-c1') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {!isCardFolded('tbl-c1') && (
                    <>
                      <div className="space-y-1 mb-2">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#767670]">出餐全备: 畅享中</span>
                          <span className="font-mono font-bold text-[#15803d]">¥486.00</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#15803d] rounded-[1px]" />
                      </div>
                      <div className="pt-1.5 border-t border-[#f0f0eb] flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => showLocalToast('已发送后厨预结账单')}
                          className="h-6 px-2 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#111110] text-[11px] font-semibold rounded-[2px] transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer whitespace-nowrap"
                        >
                          预打印流水
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ==============================================
                 COLUMN 4: 外卖专送调度 (Delivery Dispatch)
            ============================================== */}
          <div className="bg-white border border-[#e5e5e0] rounded-[3px] shadow-sm flex flex-col overflow-hidden">
            <div className="bg-white border-b border-[#e5e5e0] px-3 py-2.5 flex items-center justify-between">
              <div
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => toggleColumnFold('dispatch')}
              >
                <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
                <div>
                  <h2 className="font-heading font-bold text-[14px] text-[#111110] leading-tight flex items-center gap-1.5">
                    <span>外卖专送调度</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#767670] transition-transform ${
                        foldedColumns['dispatch'] ? '-rotate-90' : ''
                      }`}
                    />
                  </h2>
                  <span className="font-mono text-[10px] text-[#767670] uppercase tracking-wider">
                    DISPATCH // 双网直通
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803d]" />
                <span className="font-mono text-[10px] font-bold text-[#15803d] whitespace-nowrap">
                  SYNC 100%
                </span>
              </div>
            </div>

            {!foldedColumns['dispatch'] && (
              <div className="p-2.5 space-y-2.5 max-h-[640px] overflow-y-auto">
                {/* Rider Card 1: 美团专送 */}
                <div
                  className="group bg-white border border-[#e5e5e0] hover:border-[#1a1c1b] rounded-[3px] p-2.5 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer"
                  onClick={() => setActiveModalId('rdr-4029')}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-xs text-[#111110] bg-[#fafaf8] border border-[#d3d1cb] px-1.5 py-0.5 rounded-[2px] whitespace-nowrap">
                      美团专送 · #4029
                    </span>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <span className="font-mono text-[11px] font-bold text-[#2563eb]">3m 后到车</span>
                      <button
                        type="button"
                        onClick={(e) => toggleCardFold('rdr-4029', e)}
                        className="w-5 h-5 border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110]"
                      >
                        {isCardFolded('rdr-4029') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalId('rdr-4029');
                        }}
                        className="w-5 h-5 border border-transparent group-hover:border-[#d3d1cb] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110]"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isCardFolded('rdr-4029') ? (
                    <div className="text-[11px] font-mono text-[#767670] flex items-center justify-between pt-1 border-t border-[#f0f0eb]">
                      <span>骑手: 陈志远 (距 420m)</span>
                      <span className="font-bold text-[#111110]">PIN: 8812</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 py-1">
                        <div className="w-8 h-8 rounded-[3px] border border-[#e5e5e0] bg-white flex items-center justify-center font-mono font-bold text-xs text-[#111110]">
                          陈
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#111110] truncate">骑手: 陈志远</span>
                            <span className="font-mono text-[11px] text-[#767670]">138****0921</span>
                          </div>
                          <p className="text-[11px] text-[#767670] truncate">距餐车 420m · 世纪大道辅路</p>
                        </div>
                      </div>

                      <div className="mt-1.5 py-1 px-1.5 bg-[#fafaf8] border border-[#f0f0eb] rounded-[2px] flex items-center justify-between text-[11px]">
                        <span className="text-[#767670]">保温箱安全锁</span>
                        <span className="font-mono font-bold text-[#111110]">PIN: 8812</span>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-[#f0f0eb] flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => showLocalToast('已发送催促到达提醒')}
                          className="h-6 px-2 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#111110] text-[11px] rounded-[2px] transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer whitespace-nowrap"
                        >
                          催车
                        </button>
                        <button
                          type="button"
                          onClick={() => showLocalToast('已提前通知出柜并打印附单')}
                          className="h-6 px-2 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#111110] text-[11px] font-semibold rounded-[2px] transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer whitespace-nowrap"
                        >
                          提前交接
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Rider Card 2: 饿了么专送 */}
                <div
                  className="group bg-white border border-[#e5e5e0] hover:border-[#1a1c1b] rounded-[3px] p-2.5 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer"
                  onClick={() => setActiveModalId('rdr-3980')}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-xs text-[#111110] bg-[#fafaf8] border border-[#d3d1cb] px-1.5 py-0.5 rounded-[2px] whitespace-nowrap">
                      饿了么 · #3980
                    </span>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <span className="font-mono text-[11px] text-[#767670]">赶往中</span>
                      <button
                        type="button"
                        onClick={(e) => toggleCardFold('rdr-3980', e)}
                        className="w-5 h-5 border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110]"
                      >
                        {isCardFolded('rdr-3980') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalId('rdr-3980');
                        }}
                        className="w-5 h-5 border border-transparent group-hover:border-[#d3d1cb] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110]"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {!isCardFolded('rdr-3980') && (
                    <>
                      <div className="flex items-center gap-2 py-1">
                        <div className="w-8 h-8 rounded-[3px] border border-[#e5e5e0] bg-white flex items-center justify-center font-mono font-bold text-xs text-[#111110]">
                          张
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#111110] truncate">骑手: 张明峰</span>
                            <span className="font-mono text-[11px] text-[#767670]">159****4412</span>
                          </div>
                          <p className="text-[11px] text-[#767670] truncate">距餐车 1.2km · 预计 7m</p>
                        </div>
                      </div>

                      <div className="mt-1.5 py-1 px-1.5 bg-[#fafaf8] border border-[#f0f0eb] rounded-[2px] flex items-center justify-between text-[11px]">
                        <span className="text-[#767670]">履约余量</span>
                        <span className="font-mono font-bold text-[#15803d]">富余 +11m</span>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-[#f0f0eb] flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setActiveModalId('rdr-3980')}
                          className="h-6 px-2 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#111110] text-[11px] font-semibold rounded-[2px] transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer whitespace-nowrap"
                        >
                          路线监控
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Dynamic Weather & Radius Adjuster (Foldable) */}
                <div className="border border-[#e5e5e0] rounded-[3px] p-2.5 bg-white space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#111110] flex items-center gap-1">
                      <Cloud className="w-3.5 h-3.5 text-[#2563eb]" />
                      天气与运力半圈
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[#15803d] font-bold text-[10px]">晴微风 · 运力充裕</span>
                      <button
                        type="button"
                        onClick={() => toggleCardFold('weather-box')}
                        className="w-4 h-4 text-[#767670] hover:text-[#111110]"
                      >
                        {isCardFolded('weather-box') ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {!isCardFolded('weather-box') && (
                    <>
                      <p className="text-[11px] text-[#767670] leading-relaxed">
                        核心商圈 3km 辐射圈运力达成率 99.1%，无需限流。
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => showLocalToast('已追加高峰流控缓冲 +10min')}
                          className="h-7 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#111110] text-[11px] font-mono rounded-[3px] transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer whitespace-nowrap"
                        >
                          限流延时 +10m
                        </button>
                        <button
                          type="button"
                          onClick={() => showLocalToast('已扩增配送半径至 4.5km')}
                          className="h-7 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#111110] text-[11px] font-mono font-semibold rounded-[3px] transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] cursor-pointer whitespace-nowrap"
                        >
                          扩大服务半圈
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 4. Bottom Collapsible Morphing Telemetry Drawer */}
        <section className="bg-white border border-[#e5e5e0] rounded-[3px] shadow-sm overflow-hidden">
          {/* Drawer Header Bar */}
          <div
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            className="px-3.5 py-2.5 bg-white border-b border-[#e5e5e0] flex items-center justify-between cursor-pointer hover:bg-[#fcfcfb] transition-colors select-none"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Terminal className="w-4 h-4 text-[#111110]" />
              <span className="font-heading font-bold text-xs sm:text-sm text-[#111110]">
                全域联动设备状态与实时流水审计 (MORPHING TELEMETRY DRAWER)
              </span>
              <span className="font-mono text-[10px] text-[#15803d] border border-[#15803d]/30 bg-[#15803d]/5 px-1.5 py-0.5 rounded-[2px] font-bold">
                CAN_BUS: OK
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-[#767670] hidden sm:inline">
                5车联动 · 0异常告警
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#111110] transition-transform ${
                  isDrawerOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>

          {/* Drawer Body Content */}
          {isDrawerOpen && (
            <div className="p-3 sm:p-4 space-y-3">
              {/* 5 Trucks Control Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {TRUCKS_LIST.map((trk) => {
                  const isCurrent = currentTruckId === trk.id;
                  const isMaintenance = trk.id === 'truck-05';
                  return (
                    <div
                      key={trk.id}
                      className={`border rounded-[3px] p-2 bg-white space-y-1 sm:p-2.5 sm:space-y-1.5 transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] ${
                        isCurrent
                          ? 'border-[#15803d]/60 ring-1 ring-[#15803d]/30'
                          : isMaintenance
                          ? 'border-[#e5e5e0] opacity-70'
                          : 'border-[#e5e5e0] hover:border-[#1a1c1b]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#111110]">
                          STATION {trk.ch}
                        </span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isMaintenance ? 'bg-[#d3d1cb]' : 'bg-[#15803d]'
                          }`}
                        />
                      </div>
                      <div className="text-[11px] sm:text-xs text-[#767670] truncate">
                        {trk.loc}
                      </div>
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono pt-1">
                        <span className="text-[#767670]">电池 {trk.batt}</span>
                        <span className={`font-bold ${isMaintenance ? 'text-[#767670]' : 'text-[#15803d]'}`}>
                          {isMaintenance ? '维保离线' : '营运中'}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isMaintenance}
                        onClick={() => {
                          showLocalToast(`${trk.ch} 紧急熔断断开指令已发送`);
                        }}
                        className={`w-full h-6 sm:h-7 mt-1 font-mono text-[10px] sm:text-[11px] rounded-[2px] transition-all cursor-pointer ${
                          isMaintenance
                            ? 'bg-[#fafaf8] border border-[#d3d1cb] text-[#a0a09a] cursor-not-allowed'
                            : isCurrent
                            ? 'bg-white border border-[#dc2626] hover:bg-[#dc2626]/5 text-[#dc2626] font-bold'
                            : 'bg-white border border-[#e5e5e0] hover:border-[#dc2626] hover:text-[#dc2626] text-[#111110] font-medium'
                        }`}
                      >
                        {isMaintenance ? '离线待修' : `${trk.ch} 熔断断开`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Realtime CAN-BUS Event Audit Trail */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAuditPanelOpen((prev) => !prev)}
                      className={`h-7 w-7 border rounded-[3px] flex items-center justify-center transition-all shadow-[0_1px_1px_rgba(0,0,0,0.02)] relative cursor-pointer ${
                        isAuditPanelOpen
                          ? 'border-[#1a1c1b] bg-[#f7f7f5]'
                          : 'border-[#e5e5e0] hover:border-[#1a1c1b] bg-white'
                      }`}
                      title="展开/折叠审计流水日志"
                    >
                      <Terminal className="w-3.5 h-3.5 text-[#111110]" />
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#15803d]" />
                    </button>
                    <span className="font-mono text-[10px] text-[#767670] uppercase">
                      SYS_AUDIT_TRAIL (点击左侧终端按钮切换显示)
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#a0a09a]">100HZ_POLL</span>
                </div>

                {isAuditPanelOpen && (
                  <div className="border border-[#e5e5e0] rounded-[3px] overflow-hidden bg-white">
                    <div className="bg-[#fafaf8] px-3 py-1.5 border-b border-[#e5e5e0] flex items-center justify-between font-mono text-[11px] text-[#767670]">
                      <span className="font-semibold uppercase text-[#111110]">
                        REALTIME_BUS_STREAM (SYS_AUDIT_TRAIL)
                      </span>
                      <span>100HZ_POLL // LATENCY &lt; 4MS</span>
                    </div>
                    <div className="p-2 font-mono text-xs divide-y divide-[#f0f0eb] text-[#333330]">
                      <div className="py-1 flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[#767670]">[12:44:08.412]</span>
                          <span className="font-bold text-[#111110]">PREP_GATEWAY</span>
                          <span>#UR-DIN-9821 DISPATCHED TO KITCHEN DISPLAY BAY_02</span>
                        </div>
                        <span className="text-[#15803d] font-bold text-[11px]">ACK_OK</span>
                      </div>
                      <div className="py-1 flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[#767670]">[12:44:06.182]</span>
                          <span className="font-bold text-[#111110]">CABIN_LOCKER</span>
                          <span>CELL_04 TEMP REGULATION: 62.4°C STABLE (PWM 12%)</span>
                        </div>
                        <span className="text-[#15803d] font-bold text-[11px]">HOLDING_62C</span>
                      </div>
                      <div className="py-1 flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[#767670]">[12:44:02.940]</span>
                          <span className="font-bold text-[#111110]">RIDER_BEACON</span>
                          <span>RIDER CHEN ZHIYUAN GEO-FENCE TRIGGERED (&lt;500M PERIMETER)</span>
                        </div>
                        <span className="text-[#2563eb] font-bold text-[11px]">APPROACHING</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 5. Morphing Detailed Modal (High-density inspection & Lifecycle triggers) */}
      {activeModalId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/30 backdrop-blur-xs"
          onClick={() => setActiveModalId(null)}
        >
          <div
            className="w-full max-w-2xl bg-white border border-[#e5e5e0] rounded-[4px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-white border-b border-[#e5e5e0] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" />
                <div>
                  <h3 className="font-heading font-bold text-base text-[#111110] leading-none">
                    {activeModalId.startsWith('ord')
                      ? '订单全生命周期工单明细 · #UR-DIN-9821'
                      : activeModalId.startsWith('tbl')
                      ? '堂食台位实时状态与加菜管控'
                      : activeModalId.startsWith('rdr')
                      ? '外卖专送骑手履约与路线监控'
                      : '智能保温柜单元拓扑展开'}
                  </h3>
                  <span className="font-mono text-[10px] text-[#767670] uppercase">
                    MORPHING_EXPANDED_VIEW // {activeModalId}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalId(null)}
                className="w-7 h-7 bg-white border border-[#e5e5e0] hover:border-[#d3d1cb] hover:bg-[#f7f7f5] text-[#111110] rounded-[3px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 max-h-[75vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#fafaf8] border border-[#e5e5e0] p-3 rounded-[3px]">
                <div>
                  <span className="text-[#767670] text-[11px] block">作用域点位</span>
                  <span className="font-mono font-bold text-sm text-[#111110]">
                    {currentTruck.name}
                  </span>
                </div>
                <div>
                  <span className="text-[#767670] text-[11px] block">流转耗时</span>
                  <span className="font-mono text-sm text-[#111110]">03m 14s (稳态)</span>
                </div>
                <div>
                  <span className="text-[#767670] text-[11px] block">结算现计</span>
                  <span className="font-mono font-bold text-sm text-[#111110]">
                    ¥ 198.00 (已付款)
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-[#111110] uppercase tracking-wider block">
                  后厨烹饪与配料工单明细
                </span>
                <div className="border border-[#e5e5e0] rounded-[3px] divide-y divide-[#f0f0eb] bg-white text-xs">
                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#111110]">1. 黑松露和牛汉堡堡排</span>
                      <p className="text-[#767670] text-[11px]">熟度: 7分熟 | 减盐 | 配手工洋葱圈</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-[#111110]">x1 · ¥98.00</span>
                      <span className="block text-[#15803d] text-[10px] font-mono">铁板台制作中</span>
                    </div>
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#111110]">2. 炭烤提灯提浆串</span>
                      <p className="text-[#767670] text-[11px]">现烤慢烧 | 微辣撒粉</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-[#111110]">x2 · ¥56.00</span>
                      <span className="block text-[#15803d] text-[10px] font-mono">烤台翻面中</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-[#111110] block">产线流转节点</span>
                <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-mono">
                  <div className="p-1.5 border border-[#15803d] bg-[#15803d]/5 text-[#15803d] rounded-[2px] font-bold">
                    1. 收理下单 √
                  </div>
                  <div className="p-1.5 border border-[#15803d] bg-[#15803d]/5 text-[#15803d] rounded-[2px] font-bold">
                    2. 铁板精制 ⟳
                  </div>
                  <div className="p-1.5 border border-[#e5e5e0] text-[#767670] rounded-[2px]">
                    3. 质检验单
                  </div>
                  <div className="p-1.5 border border-[#e5e5e0] text-[#767670] rounded-[2px]">
                    4. 传菜上桌
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-[#fafaf8] border-t border-[#e5e5e0] px-4 py-3 flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  showLocalToast('已发送加急通知至后厨屏幕');
                  setActiveModalId(null);
                }}
                className="h-8 px-3 bg-white border border-[#111110] hover:bg-[#f7f7f5] text-[#111110] text-xs font-medium rounded-[3px] cursor-pointer"
              >
                加急催后厨
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => showLocalToast('已补打小票分单')}
                  className="h-8 px-3 bg-white border border-[#e5e5e0] hover:border-[#111110] text-[#111110] text-xs rounded-[3px] cursor-pointer"
                >
                  补打分单
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showLocalToast('全部菜品烹制完成，已呼叫传菜员');
                    setActiveModalId(null);
                  }}
                  className="h-8 px-3 bg-[#111110] text-white hover:bg-black text-xs font-bold rounded-[3px] cursor-pointer"
                >
                  一键全部出餐
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Design Tokens Inspection & Export Modal (DTCG Standard) */}
      {activeModalId === 'design-tokens' && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          onClick={() => setActiveModalId(null)}
        >
          <div
            className="bg-white border border-[#111110] rounded-[4px] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-[0_20px_25px_-5px_rgba(0,0,0,0.2)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#fafaf8] border-b border-[#e5e5e0] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#2563eb]" />
                <div>
                  <h3 className="font-heading font-bold text-sm text-[#111110]">
                    工业级设计令牌规范 (OPERATIONS_DECK DTCG TOKENS)
                  </h3>
                  <span className="font-mono text-[10px] text-[#767670]">
                    VERSION 4.8.0 // STANDARDS COMPLIANT W3C DTCG
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalId(null)}
                className="w-7 h-7 border border-[#e5e5e0] hover:border-[#111110] rounded-[2px] flex items-center justify-center text-[#767670] hover:text-[#111110] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Quick Summary Pill */}
              <div className="bg-[#fbfbf9] border border-[#e5e5e0] p-3 rounded-[3px] space-y-1.5">
                <p className="text-[#333330] leading-relaxed">
                  本设计令牌系统规范了移动餐车全域运营甲板的视觉原子体系：包含白底黑字高对比工业色阶（Neutral 50–950）、全链路微倒角约束（3px 控制件 / 2px 徽章 / 4px 浮层）、Space Grotesk 现代无衬线排版与 5 种 SLA 业务状态色。
                </p>
                <div className="flex items-center gap-2 pt-1 border-t border-[#f0f0eb] font-mono text-[11px] text-[#767670]">
                  <span>已注入至: operationsDeckTokens.json</span>
                  <span>·</span>
                  <span>operationsDeckTokens.ts</span>
                  <span>·</span>
                  <span>operationsDeckTokens.css</span>
                </div>
              </div>

              {/* Visual Token Swatches */}
              <div className="space-y-2">
                <span className="font-bold text-[#111110] font-mono uppercase tracking-wider block">
                  1. 工业灰阶与业务状态令牌 (Color Tokens)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  <div className="p-2 border border-[#e5e5e0] rounded-[2px] bg-[#fbfbf9]">
                    <div className="w-full h-4 bg-[#fbfbf9] border border-[#e5e5e0] rounded-[1px] mb-1" />
                    <span className="font-bold text-[#111110] block">Neutral-50</span>
                    <span className="text-[#767670]">#fbfbf9 (画布底色)</span>
                  </div>
                  <div className="p-2 border border-[#e5e5e0] rounded-[2px] bg-[#fafaf8]">
                    <div className="w-full h-4 bg-[#fafaf8] border border-[#d3d1cb] rounded-[1px] mb-1" />
                    <span className="font-bold text-[#111110] block">Neutral-100</span>
                    <span className="text-[#767670]">#fafaf8 (二级容器)</span>
                  </div>
                  <div className="p-2 border border-[#e5e5e0] rounded-[2px] bg-white">
                    <div className="w-full h-4 bg-[#e5e5e0] rounded-[1px] mb-1" />
                    <span className="font-bold text-[#111110] block">Neutral-400</span>
                    <span className="text-[#767670]">#e5e5e0 (主分割线)</span>
                  </div>
                  <div className="p-2 border border-[#e5e5e0] rounded-[2px] bg-white">
                    <div className="w-full h-4 bg-[#111110] rounded-[1px] mb-1" />
                    <span className="font-bold text-[#111110] block">Neutral-950</span>
                    <span className="text-[#767670]">#111110 (高对比正文)</span>
                  </div>
                  <div className="p-2 border border-[#15803d]/30 bg-[#f0fdf4] rounded-[2px]">
                    <span className="font-bold text-[#15803d] block">Status: Success</span>
                    <span className="text-[#15803d]/80">#15803d (稳态/在线)</span>
                  </div>
                  <div className="p-2 border border-[#2563eb]/30 bg-[#eff6ff] rounded-[2px]">
                    <span className="font-bold text-[#2563eb] block">Status: Info</span>
                    <span className="text-[#2563eb]/80">#2563eb (外卖/调度)</span>
                  </div>
                  <div className="p-2 border border-[#d97706]/30 bg-[#fffbeb] rounded-[2px]">
                    <span className="font-bold text-[#d97706] block">Status: Warning</span>
                    <span className="text-[#d97706]/80">#d97706 (预警/拥堵)</span>
                  </div>
                  <div className="p-2 border border-[#dc2626]/30 bg-[#fef2f2] rounded-[2px]">
                    <span className="font-bold text-[#dc2626] block">Status: Danger</span>
                    <span className="text-[#dc2626]/80">#dc2626 (熔断/缺料)</span>
                  </div>
                </div>
              </div>

              {/* Code Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#111110] font-mono uppercase tracking-wider">
                    2. DTCG JSON 规范代码预览
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(JSON.stringify(operationsDeckTokens, null, 2));
                      showLocalToast('设计令牌 JSON 已复制到剪贴板');
                    }}
                    className="h-6 px-2 border border-[#e5e5e0] hover:border-[#111110] bg-white rounded-[2px] font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-[#767670]" />
                    <span>复制 JSON</span>
                  </button>
                </div>
                <div className="bg-[#111110] text-[#fbfbf9] p-3 rounded-[3px] font-mono text-[11px] max-h-48 overflow-y-auto leading-relaxed border border-[#333330]">
                  <pre className="whitespace-pre">{JSON.stringify(operationsDeckTokens, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-[#fafaf8] border-t border-[#e5e5e0] px-4 py-3 flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-mono text-[#767670]">
                支持导出：JSON (DTCG) / TypeScript (TS) / CSS Variables
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(operationsDeckTokens, null, 2)], {
                      type: 'application/json'
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'operationsDeckTokens.json';
                    a.click();
                    URL.revokeObjectURL(url);
                    showLocalToast('operationsDeckTokens.json 下载已就绪');
                  }}
                  className="h-8 px-3 bg-white border border-[#e5e5e0] hover:border-[#111110] text-[#111110] text-xs font-semibold rounded-[3px] flex items-center gap-1.5 cursor-pointer shadow-[0_1px_1px_rgba(0,0,0,0.02)]"
                >
                  <Download className="w-3.5 h-3.5 text-[#2563eb]" />
                  <span>下载 tokens.json</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cssContent = `:root {
  --deck-color-white: #ffffff;
  --deck-color-black: #000000;
  --deck-neutral-50: #fbfbf9;
  --deck-neutral-100: #fafaf8;
  --deck-neutral-200: #f5f5f2;
  --deck-neutral-300: #f0f0eb;
  --deck-neutral-400: #e5e5e0;
  --deck-neutral-500: #d3d1cb;
  --deck-neutral-600: #a0a09a;
  --deck-neutral-700: #767670;
  --deck-neutral-800: #333330;
  --deck-neutral-900: #1a1c1b;
  --deck-neutral-950: #111110;
  --deck-status-success: #15803d;
  --deck-status-info: #2563eb;
  --deck-status-warning: #d97706;
  --deck-status-danger: #dc2626;
  --deck-radius-control: 3px;
}`;
                    const blob = new Blob([cssContent], { type: 'text/css' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'operationsDeckTokens.css';
                    a.click();
                    URL.revokeObjectURL(url);
                    showLocalToast('operationsDeckTokens.css 下载已就绪');
                  }}
                  className="h-8 px-3 bg-[#111110] hover:bg-black text-white text-xs font-semibold rounded-[3px] flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>下载 tokens.css</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
