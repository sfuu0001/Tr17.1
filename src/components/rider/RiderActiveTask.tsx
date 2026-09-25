import React, { useState } from 'react';
import {
  Bike,
  MapPin,
  Clock,
  Phone,
  MessageSquare,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Camera,
  ShieldCheck,
  Compass,
  ArrowRight,
  Flame,
  FileCheck,
  Play,
  Sparkles,
  Zap,
  Info,
  ShieldAlert,
  Thermometer,
  Mic,
  History,
  Award,
  Bell,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Barcode,
  QrCode
} from 'lucide-react';
import { ActiveDeliveryOrder } from '../../types';
import { DeliveryWaypoint, KdsPrepStatus, ThermalBoxState, RiderLevelInfo, RiderQuest, HistoricalDelivery } from '../../types/rider';
import { RiderNavHUDModal } from './RiderNavHUDModal';
import { RiderContactModal } from './RiderContactModal';
import { RiderExceptionModal } from './RiderExceptionModal';
import { RiderCameraModal } from './RiderCameraModal';
import { RiderSettlementModal } from './RiderSettlementModal';
import { RiderMultiTaskHeader } from './RiderMultiTaskHeader';
import { RiderIoTDashboardModal } from './RiderIoTDashboardModal';
import { RiderVoiceAssistantModal } from './RiderVoiceAssistantModal';
import { RiderHistoryReplayModal } from './RiderHistoryReplayModal';
import { RiderLevelQuestModal } from './RiderLevelQuestModal';
import { RiderWeatherBanner } from './RiderWeatherBanner';
import { RiderRejectionModal } from './RiderRejectionModal';
import { RiderPickupCodeModal } from './RiderPickupCodeModal';
import { getOrGeneratePickupCode, getPickupShelfCode, subscribePickupVerifiedEvent } from '../../utils/pickupCodeEngine';
import { useCascadeAuth } from '../../context/CascadeAuthContext';

interface RiderActiveTaskProps {
  activeOrders: ActiveDeliveryOrder[];
  selectedOrderId: string;
  onSelectOrder: (orderId: string) => void;
  onAdvancePhase: (orderId: string) => void;
  onRejectOrder?: (orderId: string, orderNo: string, reason: string, reasonCode: string) => void;
  onUploadDeliveryPhoto: (orderId: string) => void;
  onToggleItemCheck: (orderId: string, itemIndex: number) => void;
  waypoints: DeliveryWaypoint[];
  kdsStatuses: Record<string, KdsPrepStatus>;
  iotState: ThermalBoxState;
  onAdjustTemp: (zone: 'hot' | 'cold', target: number) => void;
  onToggleLid: () => void;
  onReserveBatterySwap: (stationName: string) => void;
  levelInfo: RiderLevelInfo;
  quests: RiderQuest[];
  onClaimQuest: (questId: string) => void;
  historyList: HistoricalDelivery[];
  isBadWeather: boolean;
  onToggleWeather: () => void;
  surgeBonusAmount: number;
  truckRelocationWarning?: {
    isRelocating: boolean;
    offsetMeters: number;
    newAddress: string;
  };
  onQuickGrabMore: () => void;
  showToast: (msg: string) => void;
  onJumpToTab?: (tab: 'pool' | 'radar' | 'earnings') => void;
}

export const RiderActiveTask: React.FC<RiderActiveTaskProps> = ({
  activeOrders,
  selectedOrderId,
  onSelectOrder,
  onAdvancePhase,
  onRejectOrder,
  onUploadDeliveryPhoto,
  onToggleItemCheck,
  waypoints,
  kdsStatuses,
  iotState,
  onAdjustTemp,
  onToggleLid,
  onReserveBatterySwap,
  levelInfo,
  quests,
  onClaimQuest,
  historyList,
  isBadWeather,
  onToggleWeather,
  surgeBonusAmount,
  truckRelocationWarning,
  onQuickGrabMore,
  showToast,
  onJumpToTab
}) => {
  // Modal states
  const [navTarget, setNavTarget] = useState<{
    orderId: string;
    targetName: string;
    targetAddress: string;
    targetType: 'truck' | 'customer';
    distanceMeters: number;
  } | null>(null);

  const [contactTarget, setContactTarget] = useState<{
    targetName: string;
    targetPhone: string;
    targetRole: 'truck' | 'customer';
  } | null>(null);

  const [isExceptionOpen, setIsExceptionOpen] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState<boolean>(false);
  const [isRejectionOpen, setIsRejectionOpen] = useState<boolean>(false);
  const [settlementCompletedOrder, setSettlementCompletedOrder] = useState<ActiveDeliveryOrder | null>(null);

  // New tool modals
  const [isIoTOpen, setIsIoTOpen] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isQuestOpen, setIsQuestOpen] = useState<boolean>(false);
  const [isPickupCodeModalOpen, setIsPickupCodeModalOpen] = useState<boolean>(false);

  // Local state extensions
  const [photoInfo, setPhotoInfo] = useState<{ locationTag: string; timestamp: string } | null>(null);
  const [activeExceptionNotes, setActiveExceptionNotes] = useState<Record<string, string>>({});
  const [isClosedLoopOpen, setIsClosedLoopOpen] = useState(false);

  const { canExecute, promptPermissionBlocked } = useCascadeAuth();

  const activeOrder = activeOrders.find((o) => o.id === selectedOrderId) || activeOrders[0];

  // Subscribe to pickup verification from merchant scanner / KDS
  React.useEffect(() => {
    const unsubscribe = subscribePickupVerifiedEvent((record) => {
      if (activeOrder && (record.orderId === activeOrder.id || record.orderNo === activeOrder.orderNo)) {
        if (activeOrder.phase === 'pickup') {
          showToast(`【餐车已核销】取件码 ${record.pickupCode} 验证通过（${record.verifiedBy}），已自动为您开启专送阶段！`);
          onAdvancePhase(activeOrder.id);
        }
      }
    });
    return () => unsubscribe();
  }, [activeOrder, onAdvancePhase, showToast]);

  if (!activeOrder) {
    return (
      <div className="space-y-3.5 text-xs">
        {/* Weather banner even when idle */}
        <RiderWeatherBanner
          isBadWeather={isBadWeather}
          weatherType={isBadWeather ? 'rain' : 'normal'}
          surgeBonusAmount={surgeBonusAmount}
          onToggleWeatherSim={onToggleWeather}
          showToast={showToast}
        />

        <div className="bg-white rounded-[3px] p-8 sm:p-12 text-center border border-[#e6e6e4] space-y-4 shadow-2xs">
          <div className="w-14 h-14 bg-[#edf3ec] rounded-full flex items-center justify-center mx-auto text-[#2b593f]">
            <Bike className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-base text-[#37352f]">暂无进行中的专送任务</h4>
            <p className="text-xs text-[#787774]">
              流动餐车站台周围有高额补贴订单等待接单，点击下方按钮立即开始顺路接单
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onJumpToTab?.('pool')}
              className="px-5 py-2.5 bg-[#37352f] hover:bg-[#201f1d] active:scale-98 text-white rounded-[3px] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <Zap className="w-4 h-4 text-[#fde047]" />
              <span>进入极速抢单大厅</span>
            </button>
            <button
              type="button"
              onClick={() => onJumpToTab?.('radar')}
              className="px-4 py-2.5 bg-white border border-[#d3d1cb] hover:bg-[#efefed] text-[#37352f] rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Compass className="w-4 h-4 text-[#2b593f]" />
              <span>开启动态雷达</span>
            </button>
          </div>
        </div>

        {/* Quick Toolbar for Idle Courier */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setIsIoTOpen(true)}
            className="p-3 bg-white hover:bg-[#fbfbfa] border border-[#e6e6e4] rounded-[3px] flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs font-bold text-[#37352f]"
          >
            <Thermometer className="w-4 h-4 text-orange-500" />
            <span>智能温控箱 ({iotState.hotZoneTemp}℃)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsVoiceOpen(true)}
            className="p-3 bg-white hover:bg-[#fbfbfa] border border-[#e6e6e4] rounded-[3px] flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs font-bold text-[#37352f]"
          >
            <Mic className="w-4 h-4 text-emerald-600" />
            <span>免提语音助手</span>
          </button>
          <button
            type="button"
            onClick={() => setIsQuestOpen(true)}
            className="p-3 bg-white hover:bg-[#fbfbfa] border border-[#e6e6e4] rounded-[3px] flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs font-bold text-[#37352f]"
          >
            <Award className="w-4 h-4 text-yellow-500" />
            <span>骑士荣誉 (LV.{levelInfo.levelGrade})</span>
          </button>
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="p-3 bg-white hover:bg-[#fbfbfa] border border-[#e6e6e4] rounded-[3px] flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs font-bold text-[#37352f]"
          >
            <History className="w-4 h-4 text-cyan-600" />
            <span>今日战绩 ({historyList.length}单)</span>
          </button>
        </div>

        {/* Settlement modal if just completed */}
        {settlementCompletedOrder && (
          <RiderSettlementModal
            isOpen={isSettlementOpen}
            onClose={() => setIsSettlementOpen(false)}
            order={settlementCompletedOrder}
            onJumpToPool={() => onJumpToTab?.('pool')}
            onJumpToEarnings={() => onJumpToTab?.('earnings')}
          />
        )}
      </div>
    );
  }

  const isPickupPhase = activeOrder.phase === 'pickup';
  const allItemsChecked = activeOrder.items.every((it) => it.checked);
  const activeExceptionNote = activeExceptionNotes[activeOrder.id];
  const currentKds = kdsStatuses[activeOrder.id];

  const handleReportException = (reason: string, addMinutes: number) => {
    setActiveExceptionNotes((prev) => ({
      ...prev,
      [activeOrder.id]: reason
    }));
  };

  const handleFinishDelivery = () => {
    setSettlementCompletedOrder(activeOrder);
    setIsSettlementOpen(true);
    onAdvancePhase(activeOrder.id);
  };

  const handleVoiceCommand = (cmd: 'call_customer' | 'arrive_pickup' | 'arrive_dropoff' | 'nav_next') => {
    if (cmd === 'call_customer') {
      setContactTarget({
        targetName: activeOrder.customerName,
        targetPhone: activeOrder.customerPhone,
        targetRole: 'customer'
      });
    } else if (cmd === 'arrive_pickup') {
      if (activeOrder.phase === 'pickup') {
        showToast('已确认到达流动餐车！请前往 03 号保温架核对并取餐。');
      }
    } else if (cmd === 'arrive_dropoff') {
      setIsCameraOpen(true);
    } else if (cmd === 'nav_next') {
      const nextWp = waypoints.find((w) => !w.isCompleted);
      if (nextWp) {
        setNavTarget({
          orderId: nextWp.orderId,
          targetName: nextWp.title,
          targetAddress: nextWp.address,
          targetType: nextWp.type === 'pickup' ? 'truck' : 'customer',
          distanceMeters: 400
        });
      }
    }
  };

  return (
    <div className="space-y-3 text-xs pb-32 sm:pb-36">
      {/* 0. Weather Banner (if active) */}
      <RiderWeatherBanner
        isBadWeather={isBadWeather}
        weatherType={isBadWeather ? 'rain' : 'normal'}
        surgeBonusAmount={surgeBonusAmount}
        onToggleWeatherSim={onToggleWeather}
        showToast={showToast}
      />

      {/* 1. Multi-Order Batching Header */}
      <RiderMultiTaskHeader
        activeOrders={activeOrders}
        selectedOrderId={selectedOrderId}
        onSelectOrder={onSelectOrder}
        waypoints={waypoints}
        kdsStatuses={kdsStatuses}
        onNavigateToWaypoint={(wp) => {
          setNavTarget({
            orderId: wp.orderId,
            targetName: wp.title,
            targetAddress: wp.address,
            targetType: wp.type === 'pickup' ? 'truck' : 'customer',
            distanceMeters: 350
          });
        }}
        onQuickGrabMore={onQuickGrabMore}
        showToast={showToast}
      />

      {/* 2. Urgent Alerts: Truck Relocation / Exception Status */}
      {truckRelocationWarning?.isRelocating && (
        <div className="p-2.5 bg-[#fdf8f0] border border-[#f3e5ce] rounded-[3px] flex items-center justify-between gap-2 text-xs text-[#8f6412]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#d9730d] shrink-0 animate-ping" />
            <div className="min-w-0">
              <span className="font-bold text-[#8f6412] whitespace-nowrap">
                餐车移位广播 (西移 {truckRelocationWarning.offsetMeters}m):
              </span>
              <span className="text-[11px] text-[#8f6412]/90 ml-1 truncate">
                {truckRelocationWarning.newAddress}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              // FIX(审计P1): "校准路线"真实化——基于餐车移位广播地址重建导航目标并唤起导航 HUD（取代"仅提示已矫正"假实现）
              const target = activeOrders.find((o) => o.id === selectedOrderId) || activeOrders[0] || activeOrder;
              if (target) {
                const newAddress = truckRelocationWarning?.newAddress || target.truckAddress;
                setNavTarget({
                  orderId: target.id,
                  targetName: target.truckName || '黑曜石流动餐车',
                  targetAddress: newAddress,
                  targetType: 'truck',
                  distanceMeters: truckRelocationWarning ? Math.max(0, truckRelocationWarning.offsetMeters) : target.truckDistanceMeters
                });
                showToast(`已按最新餐车坐标重新规划取餐路线：${newAddress}`);
              } else {
                showToast('当前无在途任务，无需校准路线');
              }
            }}
            className="px-2 py-0.5 bg-white hover:bg-[#fbf3db] border border-[#ecd9a8] text-[#8f6412] rounded-[2px] font-semibold text-[10.5px] shrink-0 cursor-pointer transition-colors whitespace-nowrap"
          >
            校准路线
          </button>
        </div>
      )}

      {activeExceptionNote && (
        <div className="p-2.5 bg-[#fdf8f0] border border-[#f3e5ce] rounded-[3px] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#d9730d] shrink-0" />
            <span className="font-bold text-[#8f6412] shrink-0 whitespace-nowrap">报备已生效:</span>
            <span className="text-[#8f6412] truncate">{activeExceptionNote}</span>
          </div>
          <span className="text-[10.5px] font-mono bg-[#fbf3db] text-[#8f6412] px-2 py-0.5 rounded border border-[#ecd9a8] shrink-0 font-medium whitespace-nowrap">
            免责顺延中
          </span>
        </div>
      )}

      {/* 3. Streamlined Auxiliary Tools Bar */}
      <div className="bg-white p-2 rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-2 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 取件码快捷入口 */}
          {isPickupPhase && (
            <button
              type="button"
              onClick={() => setIsPickupCodeModalOpen(true)}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-[2px] flex items-center gap-1.5 cursor-pointer text-amber-900 transition-colors whitespace-nowrap shrink-0 shadow-xs font-bold"
              title="向餐车主厨出示取件核销码"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-[11px]">取件码</span>
              <span className="font-mono text-[11px] bg-amber-200/80 px-1.5 py-0.2 rounded text-amber-950 font-black">
                {getOrGeneratePickupCode(activeOrder.orderNo, activeOrder.pickupCode)}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsIoTOpen(true)}
            className="px-2.5 py-1 bg-[#fafafa] hover:bg-[#f1f1ef] border border-[#e6e6e4] rounded-[2px] flex items-center gap-1.5 cursor-pointer text-[#37352f] transition-colors whitespace-nowrap shrink-0"
            title="查看智能恒温箱"
          >
            <Thermometer className="w-3.5 h-3.5 text-[#d9730d] shrink-0" />
            <span className="font-medium text-[11px]">温控箱</span>
            <span className="font-mono font-bold text-[11px] text-[#8f6412]">{iotState.hotZoneTemp}℃</span>
          </button>

          <button
            type="button"
            onClick={() => setIsVoiceOpen(true)}
            className="px-2.5 py-1 bg-[#fafafa] hover:bg-[#f1f1ef] border border-[#e6e6e4] rounded-[2px] flex items-center gap-1.5 cursor-pointer text-[#37352f] transition-colors whitespace-nowrap shrink-0"
            title="免提语音指令"
          >
            <Mic className="w-3.5 h-3.5 text-[#2b593f] shrink-0" />
            <span className="font-medium text-[11px]">语音助手</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExceptionOpen(true)}
            className="px-2.5 py-1 bg-[#fafafa] hover:bg-[#fdf8f0] hover:border-[#f3e5ce] border border-[#e6e6e4] rounded-[2px] flex items-center gap-1.5 cursor-pointer text-[#8f6412] transition-colors whitespace-nowrap shrink-0"
            title="异常申诉与延时报备"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#d9730d] shrink-0" />
            <span className="font-medium text-[11px]">异常报备</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRejectionOpen(true)}
            className="px-2.5 py-1 bg-[#fdf2f2] hover:bg-[#fbe4e4] border border-[#f0c3c3] rounded-[2px] flex items-center gap-1.5 cursor-pointer text-[#c93b3b] transition-colors whitespace-nowrap shrink-0"
            title="拒接此单并触发二次转派机制"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#c93b3b] shrink-0" />
            <span className="font-medium text-[11px]">拒单/释放</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsQuestOpen(true)}
            className="px-2 py-1 text-[11px] text-[#787774] hover:text-[#37352f] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Award className="w-3.5 h-3.5 text-[#8f6412] shrink-0" />
            <span>LV.{levelInfo.levelGrade}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="px-2 py-1 text-[11px] text-[#787774] hover:text-[#37352f] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <History className="w-3.5 h-3.5 text-[#2383e2] shrink-0" />
            <span>今日 {historyList.length} 单</span>
          </button>
        </div>
      </div>

      {/* 4. Integrated Fulfillment Closed-Loop Bottom Navigation Dock (精简高集成专送履约闭环底部栏) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-[#d3d1cb] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto">
          {/* Collapsible Full Closed-Loop Drawer Panel */}
          {isClosedLoopOpen && (
            <div className="p-3 sm:p-3.5 bg-[#fafafa] border-b border-[#e6e6e4] max-h-[65vh] overflow-y-auto space-y-2.5 animate-in slide-in-from-bottom duration-200">
              {/* Header with Step Flow Indicator */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#e6e6e4]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs text-[#37352f] bg-[#efefed] px-2 py-0.5 rounded-[2px]">
                    {activeOrder.orderNo}
                  </span>
                  <span className="font-bold text-xs text-[#37352f]">专送履约闭环三步流</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    isPickupPhase
                      ? 'bg-[#fbf3db] text-[#8f6412] border-[#ecd9a8]'
                      : 'bg-[#edf3ec] text-[#2b593f] border-[#c4dcbc]'
                  }`}>
                    {isPickupPhase ? '当前: 环节 1 取餐' : '当前: 环节 2 配送'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClosedLoopOpen(false)}
                  className="px-2 py-1 hover:bg-[#e6e6e4] rounded-[2px] text-[#787774] hover:text-[#37352f] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                >
                  <span>收起</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 3 Connected Steps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {/* 环节 1: 餐车取餐 */}
                <div className={`p-2.5 rounded-[3px] border transition-all flex flex-col justify-between ${
                  isPickupPhase
                    ? 'bg-white border-[#2b593f] ring-1 ring-[#2b593f]/20 shadow-xs'
                    : 'bg-[#fcfcfc] border-[#e6e6e4] opacity-85'
                }`}>
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isPickupPhase ? 'bg-[#2b593f] text-white' : 'bg-[#e0deda] text-[#5a5854]'
                      }`}>
                        1. 餐车取餐
                      </span>
                      <span className="text-[10.5px] font-mono text-[#787774]">距您 {activeOrder.truckDistanceMeters}m</span>
                    </div>
                    <div className="font-bold text-xs text-[#37352f] truncate">{activeOrder.truckName}</div>
                    <div className="text-[11px] text-[#5a5854] truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#eb5757] shrink-0" />
                      <span className="truncate">{activeOrder.truckAddress}</span>
                    </div>
                    {/* 取件码与取餐格 */}
                    <div className="mt-1.5 p-1.5 bg-amber-50/80 border border-amber-200/80 rounded-[2px] flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="text-[10px] text-amber-800 font-medium">取件码:</span>
                        <span className="font-mono font-bold text-xs text-amber-950">
                          {getOrGeneratePickupCode(activeOrder.orderNo, activeOrder.pickupCode)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-900 bg-amber-200/60 px-1 py-0.2 rounded">
                        {getPickupShelfCode(activeOrder.id || activeOrder.orderNo, activeOrder.pickupShelfCode)}
                      </span>
                    </div>

                    {currentKds && (
                      <div className="mt-1 text-[10px] bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8] px-1.5 py-0.5 rounded font-mono font-medium truncate">
                        {currentKds.pickupShelfCode} · {currentKds.statusText}
                      </div>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[#f1f1ef] flex items-center gap-1.5">
                    {isPickupPhase && (
                      <button
                        type="button"
                        onClick={() => setIsPickupCodeModalOpen(true)}
                        className="py-1 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-[2px] font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0 shadow-xs"
                      >
                        <Barcode className="w-3 h-3 shrink-0" />
                        <span>出示取件码</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setNavTarget({
                          orderId: activeOrder.id,
                          targetName: activeOrder.truckName,
                          targetAddress: activeOrder.truckAddress,
                          targetType: 'truck',
                          distanceMeters: activeOrder.truckDistanceMeters
                        });
                      }}
                      className="flex-1 py-1 px-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[2px] font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all whitespace-nowrap"
                    >
                      <Navigation className="w-3 h-3 text-[#fde047] shrink-0" />
                      <span>导航至餐车</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setContactTarget({
                          targetName: '黑曜石餐车主厨/列车长',
                          targetPhone: '021-8899-0110',
                          targetRole: 'truck'
                        });
                      }}
                      className="py-1 px-2 bg-white border border-[#d3d1cb] hover:bg-[#efefed] text-[#37352f] rounded-[2px] font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                    >
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>联系</span>
                    </button>
                  </div>
                </div>

                {/* 环节 2: 配送与餐品核验 */}
                <div className={`p-2.5 rounded-[3px] border transition-all flex flex-col justify-between ${
                  !isPickupPhase
                    ? 'bg-white border-[#2b593f] ring-1 ring-[#2b593f]/20 shadow-xs'
                    : 'bg-[#fcfcfc] border-[#e6e6e4]'
                }`}>
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        !isPickupPhase ? 'bg-[#2b593f] text-white' : 'bg-[#e0deda] text-[#5a5854]'
                      }`}>
                        2. 配送核验
                      </span>
                      <span className="text-[10.5px] text-[#787774]">
                        已核 <strong className="text-[#2b593f]">{activeOrder.items.filter((it) => it.checked).length}</strong>/{activeOrder.items.length}
                      </span>
                    </div>

                    <div className="space-y-1 my-1 max-h-24 overflow-y-auto pr-0.5">
                      {activeOrder.items.map((it, idx) => (
                        <div
                          key={idx}
                          onClick={() => onToggleItemCheck(activeOrder.id, idx)}
                          className={`p-1 px-1.5 rounded-[2px] flex items-center justify-between cursor-pointer border text-[11px] transition-colors ${
                            it.checked ? 'bg-[#f7fbf8] border-[#c4dcbc]' : 'bg-[#fafafa] border-[#e6e6e4] hover:border-[#b4b3ae]'
                          }`}
                        >
                          <span className={`truncate ${it.checked ? 'font-bold text-[#2b593f]' : 'text-[#37352f]'}`}>
                            {it.checked ? '✓ ' : '○ '}{it.name}
                          </span>
                          <span className="font-mono font-bold text-[#37352f] shrink-0 pl-1">x{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-[#f1f1ef] flex items-center justify-between text-[10.5px]">
                    <span className="text-[#8f6412] flex items-center gap-1 font-mono font-semibold">
                      <Thermometer className="w-3 h-3 text-[#d9730d]" />
                      <span>{iotState.hotZoneTemp}℃ 恒温</span>
                    </span>
                    {!allItemsChecked && (
                      <button
                        type="button"
                        onClick={() => {
                          activeOrder.items.forEach((it, idx) => {
                            if (!it.checked) onToggleItemCheck(activeOrder.id, idx);
                          });
                          showToast('已一键核验全部餐品');
                        }}
                        className="px-2 py-0.5 bg-[#edf3ec] hover:bg-[#dfeade] text-[#2b593f] border border-[#c4dcbc] rounded font-semibold text-[10.5px] cursor-pointer transition-colors"
                      >
                        一键全核验
                      </button>
                    )}
                  </div>
                </div>

                {/* 环节 3: 送达妥投 */}
                <div className={`p-2.5 rounded-[3px] border transition-all flex flex-col justify-between ${
                  !isPickupPhase
                    ? 'bg-white border-[#2b593f] ring-1 ring-[#2b593f]/20 shadow-xs'
                    : 'bg-[#fcfcfc] border-[#e6e6e4] opacity-85'
                }`}>
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        !isPickupPhase ? 'bg-[#2b593f] text-white' : 'bg-[#e0deda] text-[#5a5854]'
                      }`}>
                        3. 妥投送达
                      </span>
                      <span className="text-[10.5px] font-mono text-[#2b593f] font-semibold">{activeOrder.addressDistanceKm}km</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-[#37352f] truncate">{activeOrder.customerName}</span>
                      {activeOrder.userId && (
                        <span className="font-mono text-[10px] bg-[#f0f4f8] text-[#1c5598] border border-[#c4d6ec] px-1 py-0.2 rounded-[2px]">
                          UID: {activeOrder.userId.length > 12 ? `${activeOrder.userId.slice(0, 10)}...` : activeOrder.userId}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#5a5854] truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#2b593f] shrink-0" />
                      <span className="truncate">{activeOrder.deliveryAddress}</span>
                    </div>
                    {activeOrder.customerNote && (
                      <div className="mt-1.5 text-[10px] text-[#8f6412] bg-[#fdf8f0] px-1.5 py-0.5 rounded border border-[#f3e5ce] truncate">
                        备注: {activeOrder.customerNote}
                      </div>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[#f1f1ef] flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setNavTarget({
                          orderId: activeOrder.id,
                          targetName: `${activeOrder.customerName} (${activeOrder.deliveryAddress})`,
                          targetAddress: activeOrder.deliveryAddress,
                          targetType: 'customer',
                          distanceMeters: Math.round(activeOrder.addressDistanceKm * 1000)
                        });
                      }}
                      className="flex-1 py-1 px-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[2px] font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all whitespace-nowrap"
                    >
                      <Navigation className="w-3 h-3 shrink-0" />
                      <span>导航目的地</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const evalRes = canExecute('PERM_PROOF_HASH');
                        if (!evalRes.allowed) {
                          promptPermissionBlocked('PERM_PROOF_HASH', '拍照存证分层授权拦截');
                          return;
                        }
                        setIsCameraOpen(true);
                      }}
                      className={`py-1 px-1.5 rounded-[2px] font-semibold text-[11px] flex items-center gap-1 cursor-pointer border transition-all whitespace-nowrap shrink-0 ${
                        photoInfo ? 'bg-[#edf3ec] text-[#2b593f] border-[#c4dcbc]' : 'bg-white text-[#37352f] border-[#d3d1cb] hover:bg-[#efefed]'
                      }`}
                    >
                      <Camera className="w-3 h-3 shrink-0" />
                      <span>{photoInfo ? '已拍' : '拍照'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const evalRes = canExecute('PERM_VOIP_CALL');
                        if (!evalRes.allowed) {
                          promptPermissionBlocked('PERM_VOIP_CALL', '隐私虚拟小号直拨分层授权拦截');
                          return;
                        }
                        setContactTarget({
                          targetName: activeOrder.customerName,
                          targetPhone: activeOrder.customerPhone,
                          targetRole: 'customer'
                        });
                      }}
                      className="py-1 px-1.5 bg-white border border-[#d3d1cb] hover:bg-[#efefed] text-[#37352f] rounded-[2px] font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                    >
                      <Phone className="w-3 h-3 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Streamlined Compact Bottom Bar (手机端与桌面端自适应高集成常驻条) */}
          <div className="pt-0 pl-1 pr-0 pb-0 sm:py-2.5 sm:px-4 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
            {/* Context & Quick Actions Bar (Mobile: Row 1 / Desktop: Left & Middle) */}
            <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
              {/* Left: Key Order Context */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono font-bold text-xs bg-[#37352f] text-white px-2 py-0.5 rounded-[2px] shrink-0">
                  {activeOrder.orderNo}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                  isPickupPhase
                    ? 'bg-[#fbf3db] text-[#8f6412] border-[#ecd9a8]'
                    : 'bg-[#edf3ec] text-[#2b593f] border-[#c4dcbc]'
                }`}>
                  {isPickupPhase ? '待取餐' : '专送中'}
                </span>

                {/* Target & Distance */}
                <div className="flex items-center gap-1 text-[11px] text-[#5a5854] truncate">
                  <MapPin className={`w-3 h-3 shrink-0 ${isPickupPhase ? 'text-[#eb5757]' : 'text-[#2b593f]'}`} />
                  <span className="truncate font-medium max-w-[100px] sm:max-w-[180px]">
                    {isPickupPhase ? activeOrder.truckName : activeOrder.deliveryAddress}
                  </span>
                  <span className="text-[#787774] font-mono text-[10.5px] shrink-0">
                    ({isPickupPhase ? `${activeOrder.truckDistanceMeters}m` : `${activeOrder.addressDistanceKm}km`})
                  </span>
                </div>

                {/* Earnings */}
                <div className="hidden xs:flex sm:flex items-center gap-0.5 text-[11px] text-[#787774] pl-1 shrink-0">
                  <span className="font-mono font-bold text-xs text-[#2b593f]">
                    ¥{(activeOrder.courierEarnings + (isBadWeather ? surgeBonusAmount : 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Right of Row 1: Quick Action Toolset */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Toggle Closed-Loop Drawer */}
                <button
                  type="button"
                  onClick={() => setIsClosedLoopOpen(!isClosedLoopOpen)}
                  className={`px-2 py-1 sm:py-1.5 rounded-[2px] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap border ${
                    isClosedLoopOpen
                      ? 'bg-[#37352f] text-white border-[#37352f]'
                      : 'bg-[#fafafa] hover:bg-[#efefed] text-[#37352f] border-[#d3d1cb]'
                  }`}
                  title="展开/收起履约流程闭环"
                >
                  <span>闭环</span>
                  {isClosedLoopOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>

                {/* Quick Chat Bubble Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isPickupPhase) {
                      const evalRes = canExecute('PERM_INTERCOM_VOICE');
                      if (!evalRes.allowed) {
                        promptPermissionBlocked('PERM_INTERCOM_VOICE', '餐车双向语音直连分层授权拦截');
                        return;
                      }
                      setContactTarget({
                        targetName: '黑曜石餐车主厨/列车长',
                        targetPhone: '021-8899-0110',
                        targetRole: 'truck'
                      });
                    } else {
                      setContactTarget({
                        targetName: activeOrder.customerName,
                        targetPhone: activeOrder.customerPhone,
                        targetRole: 'customer'
                      });
                    }
                  }}
                  className="p-1.5 bg-[#181816] text-white hover:bg-black rounded-[2px] cursor-pointer transition-colors shrink-0 shadow-xs flex items-center gap-1 text-[11px]"
                  title="打开三端即时气泡聊天室"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-white" />
                  <span className="hidden sm:inline">气泡联络</span>
                </button>

                {/* Quick Contact Phone Button */}
                <button
                  type="button"
                  onClick={() => {
                    const evalRes = canExecute('PERM_VOIP_CALL');
                    if (!evalRes.allowed) {
                      promptPermissionBlocked('PERM_VOIP_CALL', '隐私虚拟号直拨分层授权拦截');
                      return;
                    }
                    if (isPickupPhase) {
                      setContactTarget({
                        targetName: '黑曜石餐车主厨/列车长',
                        targetPhone: '021-8899-0110',
                        targetRole: 'truck'
                      });
                    } else {
                      setContactTarget({
                        targetName: activeOrder.customerName,
                        targetPhone: activeOrder.customerPhone,
                        targetRole: 'customer'
                      });
                    }
                  }}
                  className="p-1.5 bg-white border border-[#d3d1cb] hover:bg-[#efefed] text-[#37352f] rounded-[2px] cursor-pointer transition-colors shrink-0"
                  title={isPickupPhase ? '联系餐车' : '联系顾客'}
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>

                {/* Quick Navigation Icon Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isPickupPhase) {
                      setNavTarget({
                        orderId: activeOrder.id,
                        targetName: activeOrder.truckName,
                        targetAddress: activeOrder.truckAddress,
                        targetType: 'truck',
                        distanceMeters: activeOrder.truckDistanceMeters
                      });
                    } else {
                      setNavTarget({
                        orderId: activeOrder.id,
                        targetName: `${activeOrder.customerName} (${activeOrder.deliveryAddress})`,
                        targetAddress: activeOrder.deliveryAddress,
                        targetType: 'customer',
                        distanceMeters: Math.round(activeOrder.addressDistanceKm * 1000)
                      });
                    }
                  }}
                  className="p-1.5 bg-[#fafafa] border border-[#d3d1cb] hover:bg-[#efefed] text-[#2b593f] rounded-[2px] cursor-pointer transition-colors shrink-0"
                  title="一键开启导航"
                >
                  <Navigation className="w-3.5 h-3.5" />
                </button>

                {/* Photo Button (Delivery Phase) */}
                {!isPickupPhase && (
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className={`p-1.5 rounded-[2px] cursor-pointer border transition-all shrink-0 ${
                      photoInfo
                        ? 'bg-[#edf3ec] text-[#2b593f] border-[#c4dcbc]'
                        : 'bg-white text-[#787774] hover:text-[#37352f] border-[#d3d1cb] hover:bg-[#efefed]'
                    }`}
                    title={photoInfo ? '已拍照存证' : '拍照存证'}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Main Action Button (Mobile: Full Width Row 2 / Desktop: Right Inline CTA) */}
            <div className="shrink-0 flex items-center gap-1.5 w-full sm:w-auto">
              {isPickupPhase ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsPickupCodeModalOpen(true)}
                    className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white rounded-[2px] font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-2xs transition-all whitespace-nowrap"
                    title="出示取件条码与口令给商家核销"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>出示取件码 ({getOrGeneratePickupCode(activeOrder.orderNo, activeOrder.pickupCode)})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!allItemsChecked) {
                        activeOrder.items.forEach((it, idx) => {
                          if (!it.checked) onToggleItemCheck(activeOrder.id, idx);
                        });
                      }
                      onAdvancePhase(activeOrder.id);
                      showToast(`取餐成功！订单 ${activeOrder.orderNo} 已进入专送阶段。`);
                    }}
                    className="flex-1 sm:flex-none px-3.5 py-2 sm:py-1.5 rounded-[2px] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs bg-[#37352f] hover:bg-[#201f1d] text-white cursor-pointer active:scale-98 whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4dab63] shrink-0" />
                    <span>已取餐 · 开始专送</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishDelivery}
                  className="w-full sm:w-auto px-4 py-2 sm:py-1.5 bg-[#2b593f] hover:bg-[#204430] active:scale-98 text-white rounded-[2px] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>确认送达 · 结算报酬 (¥{(activeOrder.courierEarnings + (isBadWeather ? surgeBonusAmount : 0)).toFixed(2)})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation HUD Dialog */}
      {navTarget && (
        <RiderNavHUDModal
          isOpen={!!navTarget}
          onClose={() => setNavTarget(null)}
          targetName={navTarget.targetName}
          targetAddress={navTarget.targetAddress}
          targetType={navTarget.targetType}
          initialDistanceMeters={navTarget.distanceMeters}
          onArrived={() => {
            const targetOrder = activeOrders.find((o) => o.id === navTarget.orderId) || activeOrder;
            if (navTarget.targetType === 'truck' || targetOrder.phase === 'pickup') {
              // Mark all items checked
              targetOrder.items.forEach((it, idx) => {
                if (!it.checked) {
                  onToggleItemCheck(targetOrder.id, idx);
                }
              });
              onAdvancePhase(targetOrder.id);
              showToast(`已成功抵达【${navTarget.targetName}】！餐品核验通过，订单 ${targetOrder.orderNo} 状态已同步更新为【专送中】。`);
            } else {
              // Customer arrived
              setSettlementCompletedOrder(targetOrder);
              setIsSettlementOpen(true);
              onAdvancePhase(targetOrder.id);
              showToast(`已成功抵达送达点【${navTarget.targetName}】！订单 ${targetOrder.orderNo} 已确认送达并完成结算。`);
            }
          }}
          showToast={showToast}
        />
      )}

      {/* Privacy Phone & SMS Dialog */}
      {contactTarget && (
        <RiderContactModal
          isOpen={!!contactTarget}
          onClose={() => setContactTarget(null)}
          targetName={contactTarget.targetName}
          targetPhone={contactTarget.targetPhone}
          targetRole={contactTarget.targetRole}
          orderNo={activeOrder.orderNo}
          order={activeOrder as any}
          showToast={showToast}
        />
      )}

      {/* Exception Reporting Dialog */}
      <RiderExceptionModal
        isOpen={isExceptionOpen}
        onClose={() => setIsExceptionOpen(false)}
        orderNo={activeOrder.orderNo}
        onReportException={handleReportException}
        showToast={showToast}
      />

      {/* Photo Evidence Dialog */}
      <RiderCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        orderNo={activeOrder.orderNo}
        deliveryAddress={activeOrder.deliveryAddress}
        onPhotoConfirmed={(info) => {
          setPhotoInfo(info);
          onUploadDeliveryPhoto(activeOrder.id);
        }}
        showToast={showToast}
      />

      {/* Delivery Settlement Dialog */}
      {settlementCompletedOrder && (
        <RiderSettlementModal
          isOpen={isSettlementOpen}
          onClose={() => setIsSettlementOpen(false)}
          order={settlementCompletedOrder}
          onJumpToPool={() => onJumpToTab?.('pool')}
          onJumpToEarnings={() => onJumpToTab?.('earnings')}
        />
      )}

      {/* IoT Thermal Box & Battery Dialog */}
      <RiderIoTDashboardModal
        isOpen={isIoTOpen}
        onClose={() => setIsIoTOpen(false)}
        iotState={iotState}
        onAdjustTemp={onAdjustTemp}
        onToggleLid={onToggleLid}
        onReserveBatterySwap={onReserveBatterySwap}
        showToast={showToast}
      />

      {/* Voice Hands-Free Assistant Dialog */}
      <RiderVoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onVoiceCommand={handleVoiceCommand}
        showToast={showToast}
      />

      {/* Gamified Quests & Honor Dialog */}
      <RiderLevelQuestModal
        isOpen={isQuestOpen}
        onClose={() => setIsQuestOpen(false)}
        levelInfo={levelInfo}
        quests={quests}
        onClaimQuest={onClaimQuest}
        showToast={showToast}
      />

      {/* History & Route Replay Dialog */}
      <RiderHistoryReplayModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyList={historyList}
        showToast={showToast}
      />

      {/* Rider Rejection and Boundary Control Modal */}
      <RiderRejectionModal
        isOpen={isRejectionOpen}
        onClose={() => setIsRejectionOpen(false)}
        order={activeOrder}
        onConfirmReject={(orderId, orderNo, reason, reasonCode) => {
          if (onRejectOrder) {
            onRejectOrder(orderId, orderNo, reason, reasonCode);
          } else {
            showToast(`已拒接工单 #${orderNo}，触发自动重入抢单池与赏金加码。`);
          }
        }}
        showToast={showToast}
      />

      {/* Rider Pickup Code Verification Modal */}
      {isPickupPhase && (
        <RiderPickupCodeModal
          isOpen={isPickupCodeModalOpen}
          onClose={() => setIsPickupCodeModalOpen(false)}
          order={activeOrder}
          onConfirmPickup={() => {
            if (!allItemsChecked) {
              activeOrder.items.forEach((it, idx) => {
                if (!it.checked) onToggleItemCheck(activeOrder.id, idx);
              });
            }
            onAdvancePhase(activeOrder.id);
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};
