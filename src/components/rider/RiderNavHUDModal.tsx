import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Compass,
  Volume2,
  VolumeX,
  X,
  MapPin,
  Play,
  Pause,
  ArrowRight,
  CheckCircle2,
  Radio,
  Sparkles,
  Zap,
  LocateFixed
} from 'lucide-react';

interface RiderNavHUDModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetAddress: string;
  targetType: 'truck' | 'customer';
  initialDistanceMeters: number;
  onArrived: () => void;
  showToast: (msg: string) => void;
}

export const RiderNavHUDModal: React.FC<RiderNavHUDModalProps> = ({
  isOpen,
  onClose,
  targetName,
  targetAddress,
  targetType,
  initialDistanceMeters,
  onArrived,
  showToast
}) => {
  const [distanceRemaining, setDistanceRemaining] = useState<number>(initialDistanceMeters);
  const [speed, setSpeed] = useState<number>(22);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const [isAutoCruising, setIsAutoCruising] = useState<boolean>(false);
  const [navStepIndex, setNavStepIndex] = useState<number>(0);
  const cruiseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Turn-by-turn guidance steps
  const navSteps = targetType === 'truck' ? [
    { instruction: '直行西藏北路 120 米', landmark: '前方红绿灯路口', distance: 120 },
    { instruction: '在曲阜路口右转进入大悦城南广场', landmark: '靠右侧非机动车道', distance: 80 },
    { instruction: '已到达黑曜石 01 号餐车站台前', landmark: '出餐台位于餐车右侧取餐窗口', distance: 20 }
  ] : [
    { instruction: '沿西藏北路直行 200 米', landmark: '经过大悦城天桥', distance: 200 },
    { instruction: '左转进入北座写字楼外卖暂存通道', landmark: '专用非机动车临时停靠区', distance: 180 },
    { instruction: '乘低区客梯直达 12F 极客实验室前台', landmark: '前台取餐架 3 号格', distance: 50 }
  ];

  useEffect(() => {
    if (isOpen) {
      setDistanceRemaining(initialDistanceMeters);
      setNavStepIndex(0);
      setIsAutoCruising(false);
      setSpeed(23);
    } else {
      if (cruiseTimerRef.current) {
        clearInterval(cruiseTimerRef.current);
        cruiseTimerRef.current = null;
      }
    }
    return () => {
      if (cruiseTimerRef.current) {
        clearInterval(cruiseTimerRef.current);
      }
    };
  }, [isOpen, initialDistanceMeters]);

  // Real forward navigation handler (Single Step Forward)
  const handleStepForward = () => {
    if (distanceRemaining <= 20 || navStepIndex >= navSteps.length - 1) {
      handleArrivalConfirm();
      return;
    }

    const nextStep = navStepIndex + 1;
    setNavStepIndex(nextStep);
    const newRemaining = Math.max(15, Math.floor(distanceRemaining - (navSteps[navStepIndex]?.distance || 80)));
    setDistanceRemaining(newRemaining);
    const newSpeed = Math.floor(21 + Math.random() * 6);
    setSpeed(newSpeed);

    if (isVoiceEnabled) {
      showToast(`导航播报：${navSteps[nextStep].instruction}`);
    } else {
      showToast(`已前行至：${navSteps[nextStep].instruction}`);
    }
  };

  // Continuous Auto-Cruise Forward Tick
  useEffect(() => {
    if (isAutoCruising && isOpen) {
      cruiseTimerRef.current = setInterval(() => {
        setDistanceRemaining((prev) => {
          if (prev <= 25) {
            setIsAutoCruising(false);
            if (cruiseTimerRef.current) clearInterval(cruiseTimerRef.current);
            showToast(`已抵达【${targetName}】！`);
            onArrived();
            onClose();
            return 0;
          }
          const delta = Math.floor(25 + Math.random() * 15);
          const nextVal = Math.max(0, prev - delta);

          // Update step index based on remaining distance ratio
          const progress = 1 - nextVal / initialDistanceMeters;
          if (progress > 0.66) {
            setNavStepIndex(2);
          } else if (progress > 0.33) {
            setNavStepIndex(1);
          } else {
            setNavStepIndex(0);
          }
          setSpeed(Math.floor(20 + Math.random() * 7));
          return nextVal;
        });
      }, 1200);
    } else {
      if (cruiseTimerRef.current) {
        clearInterval(cruiseTimerRef.current);
        cruiseTimerRef.current = null;
      }
    }
    return () => {
      if (cruiseTimerRef.current) {
        clearInterval(cruiseTimerRef.current);
      }
    };
  }, [isAutoCruising, isOpen, initialDistanceMeters, targetName, onArrived, onClose, showToast]);

  const handleArrivalConfirm = () => {
    setDistanceRemaining(0);
    setIsAutoCruising(false);
    showToast(`已成功确认抵达【${targetName}】！`);
    onArrived();
    onClose();
  };

  const handleToggleAutoCruise = () => {
    const nextState = !isAutoCruising;
    setIsAutoCruising(nextState);
    if (nextState) {
      showToast('已开启实时巡航前行');
    } else {
      showToast('已暂停巡航');
    }
  };

  if (!isOpen) return null;

  const currentStep = navSteps[Math.min(navStepIndex, navSteps.length - 1)];
  const isArrived = distanceRemaining <= 20 || navStepIndex >= navSteps.length - 1;
  const progressPercent = Math.max(
    8,
    Math.min(100, Math.round(((initialDistanceMeters - distanceRemaining) / initialDistanceMeters) * 100))
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#181816] text-white w-full max-w-lg rounded-[6px] border border-neutral-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HUD Top Bar */}
        <div className="px-4 py-3 bg-[#201f1d] border-b border-neutral-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-xs text-neutral-200 flex items-center gap-1.5">
              <span>5G 车道级高精骑行导航 (HUD)</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-mono font-normal">
                GPS 信号极佳
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsVoiceEnabled(!isVoiceEnabled);
                showToast(isVoiceEnabled ? '已静音导航语音' : '已开启车道级语音播报');
              }}
              className="p-1.5 rounded-[3px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-colors cursor-pointer"
              title={isVoiceEnabled ? '静音' : '开启语音'}
            >
              {isVoiceEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[3px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* HUD Visual Route Header */}
        <div className="p-4 bg-[#111110] border-b border-neutral-800 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Navigation className="w-5 h-5 text-emerald-400 -rotate-45 shrink-0" />
                <span className="font-extrabold text-sm sm:text-base text-white truncate">
                  {currentStep.instruction}
                </span>
              </div>
              <p className="text-xs text-neutral-400 pl-6.5">
                {currentStep.landmark}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-neutral-400 block font-mono">剩余距离</span>
              <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400">
                {distanceRemaining > 1000 ? `${(distanceRemaining / 1000).toFixed(2)}km` : `${distanceRemaining}m`}
              </span>
            </div>
          </div>

          {/* Speed & Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="font-mono flex items-center gap-1">
                <span>实时时速:</span>
                <strong className="text-white">{isAutoCruising ? speed : 22} km/h</strong>
                {isAutoCruising && (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-1 rounded animate-pulse">
                    巡航中
                  </span>
                )}
              </span>
              <span>导航完成度: <strong className="text-emerald-400">{progressPercent}%</strong></span>
            </div>
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full bg-emerald-500 transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Destination Card */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          <div className="p-3 bg-[#242320] rounded-[4px] border border-neutral-700 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">当前目标:</span>
              <span className="text-[10.5px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                {targetType === 'truck' ? '餐车出餐站点' : '顾客送达地'}
              </span>
            </div>
            <p className="font-bold text-xs text-white">{targetName}</p>
            <p className="text-[11px] text-neutral-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{targetAddress}</span>
            </p>
          </div>

          {/* Step Timeline */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400">完整路线规划指引:</span>
              <span className="text-[10.5px] text-neutral-500 font-mono">
                第 {Math.min(navStepIndex + 1, navSteps.length)} / {navSteps.length} 段
              </span>
            </div>
            <div className="space-y-1.5">
              {navSteps.map((s, idx) => {
                const isPassed = idx < navStepIndex;
                const isCurrent = idx === navStepIndex;
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-[3px] text-xs flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-neutral-800 border border-emerald-500/50 text-white font-semibold shadow-2xs'
                        : isPassed
                        ? 'bg-neutral-900/60 text-neutral-500'
                        : 'bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isCurrent
                          ? 'bg-emerald-500 text-black'
                          : isPassed
                          ? 'bg-neutral-700 text-neutral-300'
                          : 'bg-neutral-800 text-neutral-500'
                      }`}>
                        {isPassed ? '✓' : idx + 1}
                      </span>
                      <span className="truncate">{s.instruction}</span>
                    </div>
                    <span className="font-mono text-[11px] shrink-0">
                      {isPassed ? '已通过' : `${s.distance}m`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* HUD Bottom Actions: Real Navigation Forward & Arrival Controls */}
        <div className="p-3 bg-[#201f1d] border-t border-neutral-700 flex items-center justify-between gap-2.5">
          {/* Continuous Auto-Cruise Toggle */}
          {!isArrived && (
            <button
              type="button"
              onClick={handleToggleAutoCruise}
              className={`px-3.5 py-2.5 rounded-[4px] font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                isAutoCruising
                  ? 'bg-amber-600/90 hover:bg-amber-500 text-white border-amber-500'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
              }`}
              title={isAutoCruising ? '暂停持续巡航' : '开启持续自动巡航'}
            >
              {isAutoCruising ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-yellow-200" />
                  <span>暂停巡航</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>自动巡航</span>
                </>
              )}
            </button>
          )}

          {/* Primary Forward / Arrive Action */}
          {isArrived ? (
            <button
              type="button"
              onClick={handleArrivalConfirm}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-[4px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>已到达目的地 · 确认完成导航</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStepForward}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-[4px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Navigation className="w-3.5 h-3.5 -rotate-45" />
              <span>继续前行 (进入下一路段)</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-[4px] font-semibold text-xs transition-all cursor-pointer shrink-0"
          >
            退出
          </button>
        </div>
      </div>
    </div>
  );
};

