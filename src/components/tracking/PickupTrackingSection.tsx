import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PackageCheck,
  QrCode,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronRight,
  Flame,
  Layers,
  ShieldCheck,
  Maximize2,
  X,
  Navigation,
  Lock,
  Unlock,
  ThermometerSnowflake,
  Volume2,
  Share2,
  Radio,
  RefreshCw,
  Sun,
  Eye,
  Check,
  Smartphone,
  CheckCheck
} from 'lucide-react';
import { Order, TableDishItem } from '../../types';
import { voiceAlerts, speakText, playChimeSound, unlockAudioContext } from '../../utils/voiceAlertEngine';
import { getAmapNavigationUrls } from '../../utils/truckLocationEngine';
import { safeVibrate } from '../../utils/haptics';

interface PickupTrackingSectionProps {
  order: Order;
  onBackToMenu?: () => void;
  showToast: (msg: string) => void;
}

export const PickupTrackingSection: React.FC<PickupTrackingSectionProps> = ({
  order,
  onBackToMenu,
  showToast
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isUrging, setIsUrging] = useState(false);
  const [isBroadcastingVoice, setIsBroadcastingVoice] = useState(false);
  const [brightnessMode, setBrightnessMode] = useState(false);

  // 动态防伪时间戳 (精确到毫秒，动态跳动防截图)
  const [currentTime, setCurrentTime] = useState({
    dateStr: '',
    timeStr: '',
    msStr: '00'
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
      const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const msStr = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
      setCurrentTime({ dateStr, timeStr, msStr });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // 真实履约状态与模拟开柜取餐闭环
  const initialStatus = useMemo(() => {
    const raw = order.status || order.statusType || 'waiting_pickup';
    if (raw === 'completed' || raw === 'finished') return 'completed';
    if (raw === 'ready' || raw === 'waiting_pickup' || raw === 'cooked') return 'ready';
    return 'cooking';
  }, [order.status, order.statusType]);

  const [currentStepState, setCurrentStepState] = useState<'cooking' | 'ready' | 'completed'>(initialStatus);
  const [lockerDoorState, setLockerDoorState] = useState<'locked' | 'unlocking' | 'open' | 'collected'>('locked');
  const [doorCountDown, setDoorCountDown] = useState(45);

  const isReady = currentStepState === 'ready';
  const isCompleted = currentStepState === 'completed';
  const isCooking = currentStepState === 'cooking';

  // 门弹开后的倒计时处理
  useEffect(() => {
    if (lockerDoorState !== 'open') return;
    const interval = setInterval(() => {
      setDoorCountDown((prev) => {
        if (prev <= 1) {
          setLockerDoorState('collected');
          setCurrentStepState('completed');
          showToast('取餐时间到，智能保温柜门已自动闭锁，取餐核销完成！');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockerDoorState, showToast]);

  // Fallback dishes
  const pickupDishes = order.items && order.items.length > 0
    ? order.items
    : [
        {
          name: '果木烟熏黑豚炙烤五花',
          quantity: 1,
          price: 55.0,
          options: '果木微熏香甜',
          serveStatus: 'ready_to_serve',
          prepProgress: 100,
          station: '已装盒贴封签'
        },
        {
          name: '黑曜石松露金黄脆薯',
          quantity: 1,
          price: 32.0,
          options: '黑松露美乃滋',
          serveStatus: 'ready_to_serve',
          prepProgress: 100,
          station: '01号智能保温格'
        }
      ];

  const pickupCode = order.pickupCode || '8806';
  const lockerShelf = order.pickupShelfCode || '01 号智能保温取餐柜 (65℃恒温)';
  const truckName = order.truckName || '黑曜石 01 号流动餐车';
  const truckLocation = order.deliveryAddress || '西藏北路 166 号大悦城南广场外摆站台';

  // 复制取餐码
  const handleCopyCode = () => {
    try {
      navigator.clipboard.writeText(pickupCode);
      setCopiedCode(true);
      showToast(`已复制取餐码: ${pickupCode}`);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast(`取餐码: ${pickupCode}`);
    }
  };

  // 播报我的取餐号 (真人语音叫号广播 + 震动)
  const handleBroadcastMyCode = async () => {
    setIsBroadcastingVoice(true);
    await unlockAudioContext();
    safeVibrate([120, 60, 120]);
    voiceAlerts.callingGuest(pickupCode, lockerShelf);
    showToast(`正在播放餐车前台叫号：请 ${pickupCode} 号顾客到 ${lockerShelf} 取餐`);
    setTimeout(() => setIsBroadcastingVoice(false), 3000);
  };

  // 一键催单加急
  const handleUrgePickup = async () => {
    setIsUrging(true);
    await unlockAudioContext();
    speakText(`取餐码 ${pickupCode} 顾客已到店催取`, { chimeType: 'bell' });
    showToast('已向餐车吧台发送【到店催取】提醒，主理人正在优先为您装袋！');
    setTimeout(() => setIsUrging(false), 3000);
  };

  // 高德步行导航
  const handleNavigateToTruck = () => {
    const lat = 31.2425;
    const lng = 121.4678;
    const urls = getAmapNavigationUrls(lat, lng, truckLocation);
    if (typeof window !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = urls.amapUri;
        setTimeout(() => window.open(urls.webNavUrl, '_blank'), 1200);
      } else {
        window.open(urls.webNavUrl, '_blank');
      }
    }
    showToast(`已开启高德步行导航至：${truckLocation}（距您约 280 米）`);
  };

  // 致电餐车站台
  const handleCallTruck = () => {
    showToast(`正在呼叫餐车吧台热线：139-8822-9804`);
  };

  // 一键无接触远程蓝牙/网络开柜
  const handleRemoteUnlockLocker = () => {
    if (isCompleted) {
      showToast('该单已取餐核销完毕，如有疑问请联系前台服务人员');
      return;
    }
    if (lockerDoorState === 'open') {
      showToast('柜门当前已弹开，请尽快取出餐品');
      return;
    }

    setLockerDoorState('unlocking');
    showToast('正在向餐车智能保温柜下发蓝牙无接触开锁指令…');

    setTimeout(() => {
      setLockerDoorState('open');
      setDoorCountDown(45);
      playChimeSound('order');
      // FIX(控制台 intervention): 定时器回调内无用户手势，振动会被策略阻断
      safeVibrate([200, 100, 200]);
      showToast('【开柜成功】01 号柜门已弹开，指示灯常亮绿灯，请取餐！');
    }, 1000);
  };

  // 确认已取出餐品
  const handleConfirmCollected = () => {
    setLockerDoorState('collected');
    setCurrentStepState('completed');
    playChimeSound('bell');
    showToast('【取餐成功】智能保温柜门已闭锁，全流程履约圆满完成，祝您用餐愉快！');
  };

  // 复制好友代取卡片信息
  const handleCopyShareText = () => {
    const shareText = `【黑曜石流动餐车 · 好友代取凭证】\n` +
      `🔥 取餐校验码：#${pickupCode}\n` +
      `📦 取餐窗口/柜位：${lockerShelf}\n` +
      `📍 餐车站台位置：${truckLocation}\n` +
      `🍔 餐品数量：共 ${pickupDishes.length} 份\n` +
      `⏰ 取餐时效：现烤保温中，请对准取餐口出示大字条码即可直接开柜！`;
    
    try {
      navigator.clipboard.writeText(shareText);
      showToast('已复制完整好友代取凭证信息，可直接微信/钉钉粘贴发送！');
    } catch {
      showToast(`取餐码: #${pickupCode}，请转发好友代取`);
    }
    setIsShareModalOpen(false);
  };

  // 步骤条数据与状态计算
  const flowSteps = [
    { key: 'placed', title: '提交订单支付', desc: '订单支付成功，已同步至流动餐车中枢', defaultTime: '12:30', operator: '食客本人' },
    { key: 'accepted', title: '餐车主理人接单', desc: '餐车排单确认，食材备料准备制作', defaultTime: '12:31', operator: '主理人阿豪' },
    { key: 'cooking_packing', title: '炭火现制与封签', desc: '现烤出炉，采用耐高温双层锁鲜环保餐盒与保鲜贴签', defaultTime: '12:36', operator: '炭烤与封装岗' },
    { key: 'ready_pickup', title: '放入恒温取餐柜', desc: `放入 ${lockerShelf}，生成取餐校验码`, defaultTime: '12:40', operator: '取餐中枢' },
    { key: 'picked_up', title: '到店扫码取餐', desc: '凭取餐码扫码或一键开柜，全流程履约圆满完成', defaultTime: '刚刚', operator: '核销系统' }
  ];

  const currentStepIndex = isCompleted ? 4 : isReady ? 3 : 2;

  return (
    <div className="space-y-3 p-3 sm:p-4 bg-white select-none">
      {/* 1. 核心取餐凭证卡片 (防伪流动光栅 + 动态防伪时间戳) */}
      <div className="bg-gradient-to-br from-[#1c1c1a] via-[#242421] to-[#2c2c28] text-white p-4 sm:p-5 shadow-lg border border-neutral-800 space-y-3 relative overflow-hidden">
        {/* 彩色防伪流动光栅条纹 */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-teal-400 opacity-90 animate-pulse" />

        {/* 动态防伪水印光圈 */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        {/* 顶部标题、防伪毫秒时钟与当前状态徽章 */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase font-bold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">官方防伪取餐凭据</span>
              <span className="text-neutral-500">|</span>
              <span className="font-sans text-neutral-300 shrink-0">
                {currentTime.timeStr}:{currentTime.msStr}
              </span>
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-neutral-200 mt-0.5 truncate">
              到店自提 · 凭码核销取餐
            </h2>
          </div>

          <div className="shrink-0">
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 whitespace-nowrap shadow-2xs ${
                isCompleted
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : isReady
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
              <span>
                {isCompleted ? '已取餐完成' : isReady ? '出餐就绪 · 随时可取' : '炭火现烤制作中'}
              </span>
            </span>
          </div>
        </div>

        {/* 大字取餐码展示区 (左右卡片式网格架构，坚决避免文字纵向被挤压变形) */}
        <div className="bg-black/60 border border-white/15 p-3.5 sm:p-4 rounded-lg backdrop-blur-md relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            {/* 左侧：专属叫号码与水平操作胶囊组 */}
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] text-neutral-400 font-medium">您的专属自提叫号码</span>
                <span className="text-[9.5px] px-1.5 py-0.2 bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 rounded-xs font-sans whitespace-nowrap">
                  ● 65℃恒温锁鲜
                </span>
              </div>

              {/* 大字取餐码 (单行大号突出) */}
              <div className="font-sans text-3xl sm:text-4xl font-black tracking-widest text-emerald-400 drop-shadow-md select-all leading-none py-0.5">
                #{pickupCode}
              </div>

              {/* 独立操作按钮行：保证水平横排，绝对不换行不挤压 */}
              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                <button
                  type="button"
                  id="pickup-copy-code-btn"
                  onClick={handleCopyCode}
                  className="text-[11px] text-neutral-300 hover:text-white flex items-center gap-1.5 py-1.5 px-3 rounded-md bg-white/10 hover:bg-white/15 transition-all cursor-pointer border border-white/15 active:scale-95 whitespace-nowrap shadow-2xs"
                >
                  {copiedCode ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  )}
                  <span className="font-medium">{copiedCode ? '已复制' : '复制号码'}</span>
                </button>

                <button
                  type="button"
                  id="pickup-voice-broadcast-btn"
                  onClick={handleBroadcastMyCode}
                  className="text-[11px] text-amber-300 hover:text-amber-200 flex items-center gap-1.5 py-1.5 px-3 rounded-md bg-amber-500/20 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/35 active:scale-95 whitespace-nowrap shadow-2xs font-bold"
                  title="模拟餐车广播叫号"
                >
                  <Volume2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isBroadcastingVoice ? 'animate-bounce text-amber-400' : 'text-amber-300'
                    }`}
                  />
                  <span>{isBroadcastingVoice ? '广播呼叫中…' : '播报叫号'}</span>
                </button>
              </div>
            </div>

            {/* 右侧：核销条形码快捷触控卡片 (一体化按钮，防误触设计) */}
            <div className="shrink-0 flex items-stretch">
              <button
                type="button"
                id="pickup-show-barcode-btn"
                onClick={() => setIsQrModalOpen(true)}
                className="w-full sm:w-auto flex sm:flex-col items-center justify-center gap-2 px-4 py-3 bg-white/8 hover:bg-white/15 border border-white/20 hover:border-emerald-500/50 rounded-lg text-white transition-all cursor-pointer group active:scale-95 shadow-sm"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="text-left sm:text-center min-w-0">
                  <span className="block text-xs font-bold leading-tight group-hover:text-emerald-300 transition-colors whitespace-nowrap">
                    出示核销码
                  </span>
                  <span className="text-[10px] text-neutral-400 block font-normal mt-0.5 whitespace-nowrap">
                    对准柜机扫描口
                  </span>
                </div>
                <Maximize2 className="w-3.5 h-3.5 text-neutral-400 ml-auto sm:ml-0 sm:mt-0.5 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* 智能保温格位与无接触开柜操作栏 (分层清晰，杜绝文字截断与空间逼仄) */}
        <div className="bg-white/5 border border-white/10 p-3 rounded-lg space-y-2.5 text-xs">
          {/* 第 1 层：完整展示格位名称与恒温状态，彻底防止省略号截断 */}
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/10">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 bg-amber-400/20 rounded-md flex items-center justify-center shrink-0">
                <ThermometerSnowflake className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-neutral-400 block leading-tight">取餐窗口 / 保温格位</span>
                <span className="font-bold text-white text-xs truncate block mt-0.5">
                  {lockerShelf}
                </span>
              </div>
            </div>

            <span className="text-[10px] font-sans text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>恒温锁鲜中</span>
            </span>
          </div>

          {/* 第 2 层：开柜与好友代取按钮组 (触控热区高、防误触) */}
          <div className="flex items-center gap-2">
            {lockerDoorState === 'open' ? (
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-xs text-emerald-400 font-sans font-bold flex items-center gap-1.5 animate-pulse">
                  <Unlock className="w-4 h-4" />
                  <span>柜门已弹开 ({doorCountDown}s)</span>
                </span>
                <button
                  type="button"
                  id="pickup-confirm-collected-btn"
                  onClick={handleConfirmCollected}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 shadow-md"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>取出餐品完成</span>
                </button>
              </div>
            ) : isCompleted ? (
              <div className="w-full py-1.5 text-center text-xs text-neutral-400 font-medium flex items-center justify-center gap-1.5 bg-white/5 rounded-md border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>该单已核销提货完成</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  id="pickup-remote-unlock-btn"
                  onClick={handleRemoteUnlockLocker}
                  disabled={lockerDoorState === 'unlocking'}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold py-2 px-3 rounded-md cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-60"
                >
                  {lockerDoorState === 'unlocking' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>{lockerDoorState === 'unlocking' ? '指令下发中…' : '一键无接触开柜'}</span>
                </button>

                <button
                  type="button"
                  id="pickup-share-voucher-btn"
                  onClick={() => setIsShareModalOpen(true)}
                  className="bg-white/10 hover:bg-white/20 text-neutral-200 text-xs font-semibold py-2 px-3 rounded-md cursor-pointer transition-all flex items-center justify-center gap-1.5 border border-white/15 active:scale-[0.98] shrink-0"
                  title="生成好友代取凭证"
                >
                  <Share2 className="w-3.5 h-3.5 text-neutral-300" />
                  <span>好友代取</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. 出餐打包与制作明细矩阵 */}
      <div className="bg-white border border-[#e2e3e1] p-3 sm:p-3.5 shadow-2xs space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#1a1c1b] flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <span>自提出餐打包与制作进展</span>
            </span>
            <span className="font-sans font-bold text-xs text-emerald-700">
              {isCompleted ? '已全部提取 (100%)' : isReady ? '出餐就绪 (100%)' : '炭火备料制作中 (60%)'}
            </span>
          </div>

          <div className="h-2 w-full bg-[#f0f0ed] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500"
              style={{ width: isCompleted ? '100%' : isReady ? '100%' : '60%' }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#787774] pt-0.5">
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <CheckCircle2 className="w-3 h-3" />
              <span>{isCompleted ? '已完成核销取餐' : `保温柜存储: ${pickupDishes.length} 份`}</span>
            </span>
            <span>恒温箱技术：<strong>65℃</strong> 恒温锁鲜微循环</span>
          </div>
        </div>

        {/* 菜品明细清单 */}
        <div className="space-y-2">
          {pickupDishes.map((dish, idx) => (
            <div
              key={idx}
              className="p-2.5 bg-[#fbfcfb] border border-[#ddead8] flex items-start justify-between gap-2"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 bg-[#edf3ec] text-[#2b593f] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-[13px] font-bold text-[#1a1c1b] leading-tight">
                    {dish.name}
                  </h4>
                  {dish.options && (
                    <p className="text-[10px] text-[#787774] mt-0.5">
                      规格: {dish.options}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-sans text-[#787774]">
                    <span>单价 ¥{dish.price.toFixed(2)}</span>
                    <span>·</span>
                    <span className="font-bold text-[#1a1c1b]">x{dish.quantity} 份</span>
                    <span>·</span>
                    <span className="font-bold text-emerald-800">
                      小计 ¥{(dish.price * dish.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 space-y-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{isCompleted ? '已提取' : '已入柜保温'}</span>
                </span>
                <p className="text-[9px] font-sans text-neutral-400">{dish.station || '01号智能格'}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 快捷动作按钮组 (催单加急 / 高德步行导航 / 致电吧台) */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#f0f0ed]">
          <button
            type="button"
            onClick={handleUrgePickup}
            disabled={isUrging || isCompleted}
            className="py-2 px-2 text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95 disabled:opacity-50"
            title="通知餐车吧台加急处理"
          >
            <AlertCircle className={`w-3.5 h-3.5 ${isUrging ? 'animate-spin' : ''}`} />
            <span>{isUrging ? '已通知...' : '催单加急'}</span>
          </button>

          <button
            type="button"
            onClick={handleNavigateToTruck}
            className="py-2 px-2 text-xs font-bold bg-[#f4f4f2] hover:bg-[#ebebe7] text-[#1a1c1b] border border-[#deded8] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
            title="高德步行导航至餐车自提点"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            <span>高德步行导航</span>
          </button>

          <button
            type="button"
            onClick={handleCallTruck}
            className="py-2 px-2 text-xs font-bold bg-[#edf3ec] hover:bg-[#ddead8] text-[#2b593f] border border-[#c4dcbc] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
            title="直接致电餐车主理人"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>致电吧台</span>
          </button>
        </div>
      </div>

      {/* 3. 自提状态流转 5 步全流程可溯 */}
      <div className="bg-white border border-[#e2e3e1] p-3 sm:p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#1a1c1b] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-700" />
            <span>到店自提状态流转节点</span>
          </span>
          <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 font-medium">
            5步全流程可溯
          </span>
        </div>

        <div className="space-y-2 relative before:absolute before:top-3 before:bottom-3 before:left-3.5 before:w-0.5 before:bg-[#e6e6e1] before:z-0">
          {flowSteps.map((step, idx) => {
            const isStepCompleted = idx < currentStepIndex || (idx === currentStepIndex && isCompleted);
            const isCurrent = idx === currentStepIndex && !isCompleted;

            return (
              <div key={step.key} className="relative z-1 flex items-start gap-2.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                    isStepCompleted
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : isCurrent
                      ? 'bg-white text-emerald-700 border-2 border-emerald-700 ring-2 ring-emerald-100 scale-105'
                      : 'bg-[#f4f4f2] text-[#8c8b84] border-[#d8d8d3]'
                  }`}
                >
                  {isStepCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <span className="font-sans text-xs font-bold">{idx + 1}</span>
                  )}
                </div>

                <div
                  className={`flex-1 p-2 border transition-all ${
                    isCurrent
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : isStepCompleted
                      ? 'bg-neutral-50/60 border-neutral-200/80'
                      : 'bg-white border-[#ecece8]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${isCurrent ? 'text-emerald-800' : 'text-[#1a1c1b]'}`}>
                      {step.title}
                    </span>
                    <span className="text-[10px] font-sans text-[#787774]">
                      {step.defaultTime}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#787774] mt-0.5 leading-relaxed">{step.desc}</p>
                  <div className="flex items-center justify-between text-[9.5px] text-neutral-400 mt-1 pt-1 border-t border-neutral-100">
                    <span>处理主体: {step.operator}</span>
                    <span className={`font-bold ${isStepCompleted ? 'text-emerald-700' : isCurrent ? 'text-amber-600' : 'text-neutral-400'}`}>
                      {isStepCompleted ? '● 已达成' : isCurrent ? '● 进行中' : '○ 待核销'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 自提餐车站台位置与高德测距 */}
      <div className="p-3 bg-[#f8f9fa] border border-[#e5e7eb] text-xs space-y-1.5">
        <div className="flex items-center justify-between text-[#787774] font-medium">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>自提餐车站台位置</span>
          </span>
          <button
            type="button"
            onClick={handleNavigateToTruck}
            className="font-sans text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 underline cursor-pointer"
          >
            <span>高德测距约 280m (步行 3 分钟)</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <p className="text-xs font-bold text-[#1a1c1b]">{truckName}</p>
        <p className="text-[11px] text-[#4b5563]">{truckLocation}</p>
      </div>

      {/* 全屏条形码 & 开柜扫码弹窗 */}
      <AnimatePresence>
        {isQrModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${
              brightnessMode ? 'bg-white' : 'bg-black/85'
            }`}
            onClick={() => setIsQrModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-none p-6 text-center space-y-4 shadow-2xl relative ${
                brightnessMode ? 'bg-white text-black border border-neutral-300' : 'bg-white text-black'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* 调亮扫码防反光切换 */}
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setBrightnessMode(!brightnessMode)}
                  className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>{brightnessMode ? '恢复正常亮度' : '高亮防反光扫码'}</span>
                </button>
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                  智能保温柜扫码核销凭据
                </span>
                <h3 className="text-lg font-black text-black mt-0.5">请对准取餐柜扫码口</h3>
              </div>

              {/* 大字取餐码 */}
              <div className="py-2">
                <span className="font-sans text-5xl font-black text-black tracking-widest">
                  #{pickupCode}
                </span>
                <p className="text-xs text-neutral-500 font-medium mt-1">
                  格位：{lockerShelf}
                </p>
              </div>

              {/* 动态条形码 (根据真实 pickupCode 映射生成) */}
              <div className="bg-neutral-50 p-4 border border-neutral-200 flex flex-col items-center justify-center">
                <div className="h-16 w-64 flex items-center justify-between px-2">
                  {pickupCode.split('').concat(['P', 'I', 'C', 'K']).map((char, charIdx) => {
                    const codeVal = char.charCodeAt(0);
                    return (
                      <React.Fragment key={charIdx}>
                        <div className="h-full bg-black" style={{ width: `${(codeVal % 3) + 2}px` }} />
                        <div className="h-full bg-transparent" style={{ width: `${(codeVal % 2) + 2}px` }} />
                        <div className="h-full bg-black" style={{ width: `${(codeVal % 4) + 1}px` }} />
                      </React.Fragment>
                    );
                  })}
                </div>
                <span className="font-sans text-xs text-neutral-700 font-bold tracking-widest mt-2">
                  * {pickupCode} - SMART - LOCKER *
                </span>
              </div>

              {/* 开柜按钮 */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsQrModalOpen(false);
                    handleRemoteUnlockLocker();
                  }}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>无需扫码，直接一键蓝牙弹开柜门</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold cursor-pointer"
                >
                  返回自提追踪页
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 好友代取卡片弹窗 */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white p-5 space-y-4 shadow-2xl relative border border-neutral-300"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-neutral-900">好友代取凭证</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="text-neutral-500 hover:text-black font-sans text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="bg-neutral-50 p-3.5 border border-neutral-200 space-y-2 text-xs">
                <div className="flex items-baseline justify-between border-b border-neutral-200 pb-2">
                  <span className="text-neutral-500">取餐校验码</span>
                  <span className="font-sans text-2xl font-black text-emerald-700">#{pickupCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">保温格位:</span>
                  <span className="font-bold text-neutral-800">{lockerShelf}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">餐车站台:</span>
                  <span className="font-medium text-neutral-800 text-right truncate max-w-[200px]">{truckLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">餐品数量:</span>
                  <span className="font-sans font-bold text-neutral-800">{pickupDishes.length} 份</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyShareText}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>一键复制代取信息发给好友</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
