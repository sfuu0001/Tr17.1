import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GroupChatMessage,
  GroupChannelType,
  getGroupChatMessages,
  sendGroupChatMessage,
  subscribeGroupChat,
  toggleGroupMessageReaction,
  updateStockTransferStatus,
  claimFlashSaleDish,
  markGroupChatAsRead
} from '../../utils/truckGroupChatEngine';
import { getAllTruckConfigs, getActiveTruckConfig, TruckLocationConfig } from '../../utils/truckLocationEngine';
import { safeVibrate } from '../../utils/haptics';
import {
  Send,
  Mic,
  MicOff,
  Flame,
  Zap,
  Radio,
  MapPin,
  Clock,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Check,
  CheckCheck,
  Truck,
  Plus,
  Smile,
  X,
  AlertTriangle,
  RotateCw,
  Share2,
  Users,
  Compass,
  ArrowUpDown,
  Volume2
} from 'lucide-react';

export interface FleetGroupChatRoomViewProps {
  channelType: GroupChannelType;
  channelId: string; // e.g. 'truck-01' or 'fleet-command'
  currentTruck?: TruckLocationConfig;
  viewerRole?: string;
  showToast?: (title: string, desc?: string) => void;
  onOpenDishDetail?: (dishName: string) => void;
  onSwitchTruck?: (truckId: string) => void;
}

export const FleetGroupChatRoomView: React.FC<FleetGroupChatRoomViewProps> = ({
  channelType,
  channelId,
  currentTruck,
  viewerRole = 'user',
  showToast = () => {},
  onOpenDishDetail,
  onSwitchTruck
}) => {
  const [messages, setMessages] = useState<GroupChatMessage[]>(() =>
    getGroupChatMessages(channelType, channelId)
  );
  const [inputText, setInputText] = useState('');
  const [isEmojiTrayOpen, setIsEmojiTrayOpen] = useState(false);
  const [isActionTrayOpen, setIsActionTrayOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [showTruckSwitchDropdown, setShowTruckSwitchDropdown] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);

  // 跨车调拨发起表单
  const [transferMaterial, setTransferMaterial] = useState('特选冷鲜和牛牛肉饼');
  const [transferTargetTruck, setTransferTargetTruck] = useState('truck-02');
  const [transferQty, setTransferQty] = useState('10');
  const [transferUrgency, setTransferUrgency] = useState<'high' | 'normal'>('high');

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recordIntervalRef = useRef<any>(null);

  const trucks = useMemo(() => getAllTruckConfigs(), []);
  const activeTruck = useMemo(() => {
    if (currentTruck) return currentTruck;
    return trucks.find((t) => t.id === channelId) || getActiveTruckConfig();
  }, [currentTruck, trucks, channelId]);

  // 订阅当前群聊信道消息
  useEffect(() => {
    setMessages(getGroupChatMessages(channelType, channelId));
    markGroupChatAsRead(channelType, channelId);

    const unsubscribe = subscribeGroupChat(channelType, channelId, (newMsgs) => {
      setMessages(newMsgs);
      markGroupChatAsRead(channelType, channelId);
    });

    return () => unsubscribe();
  }, [channelType, channelId]);

  // 自动吸底滚动
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // 发送普通文本消息
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;

    safeVibrate(15);
    sendGroupChatMessage(channelType, channelId, {
      senderId: 'user-current',
      senderRole: viewerRole === 'merchant' ? 'merchant' : viewerRole === 'rider' ? 'rider' : 'customer',
      senderName: viewerRole === 'merchant' ? `${activeTruck.name} · 车长` : viewerRole === 'rider' ? '专送骑手' : '食客（你）',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
      senderBadge: viewerRole === 'merchant' ? '车长' : viewerRole === 'rider' ? '专送' : '老饕',
      senderTruckId: activeTruck.id,
      senderTruckName: activeTruck.name,
      type: 'text',
      text: clean
    });

    setInputText('');
    setIsEmojiTrayOpen(false);
    setIsActionTrayOpen(false);
  };

  // 抢购现烤特惠卡片
  const handleClaimFlashSale = (msgId: string) => {
    safeVibrate(25);
    const success = claimFlashSaleDish(channelId, msgId, '食客（你）');
    if (success) {
      showToast('🎉 现烤秒杀锁定成功！', '优惠已录入当前餐车点单通道，前往点单自动满减核销');
    } else {
      showToast('手慢了，该轮现烤已抢空', '下一炉预计 15 分钟后出炉，请关注主厨广播');
    }
  };

  // 表情表态
  const handleReaction = (msgId: string, emoji: string) => {
    safeVibrate(10);
    toggleGroupMessageReaction(channelType, channelId, msgId, emoji, '食客（你）');
  };

  // 推进调拨单流转状态 (车队指挥群专属)
  const handleAdvanceTransfer = (msgId: string, currentStatus: string) => {
    safeVibrate(20);
    if (currentStatus === 'pending') {
      updateStockTransferStatus(channelId, msgId, 'accepted');
      showToast('已接单备料', '02号车后仓已生成出库工单');
    } else if (currentStatus === 'accepted') {
      updateStockTransferStatus(channelId, msgId, 'dispatched', '陈志远 (加急专线)');
      showToast('骑手已取货加急转运', '专线骑手陈志远已封装温控箱出发');
    } else if (currentStatus === 'dispatched') {
      updateStockTransferStatus(channelId, msgId, 'completed');
      showToast('已确认送达入库', '物料已安全送抵01号车档口，库存已同步更新');
    }
  };

  // 快捷发送预设指令/话术
  const handleSendQuickPhrase = (text: string) => {
    safeVibrate(15);
    sendGroupChatMessage(channelType, channelId, {
      senderId: 'user-current',
      senderRole: viewerRole === 'merchant' ? 'merchant' : 'customer',
      senderName: viewerRole === 'merchant' ? `${activeTruck.name} · 车长` : '食客（你）',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
      senderBadge: viewerRole === 'merchant' ? '车长' : '老饕',
      type: 'text',
      text
    });
    setIsActionTrayOpen(false);
  };

  // 发起跨餐车物料调拨单
  const handleSubmitTransfer = () => {
    const target = trucks.find((t) => t.id === transferTargetTruck) || trucks[1];
    const qty = parseInt(transferQty, 10) || 10;
    const now = Date.now();

    safeVibrate(30);
    sendGroupChatMessage('fleet_dispatch', 'fleet-command', {
      senderId: 'user-chef',
      senderRole: 'chef',
      senderName: `${activeTruck.name} · 主厨`,
      senderAvatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=120&h=120&fit=crop&crop=faces',
      senderTruckId: activeTruck.id,
      senderTruckName: activeTruck.name,
      senderBadge: '档口主厨',
      type: 'stock_transfer',
      text: `【跨车物料支援紧急申请】：${activeTruck.name} 档口【${transferMaterial}】库存告急，申请向【${target.name}】调拨 ${qty} 份，请就近调度！`,
      stockTransferInfo: {
        transferId: `TF-${Date.now().toString().slice(-6)}`,
        fromTruckId: target.id,
        fromTruckName: target.name,
        toTruckId: activeTruck.id,
        toTruckName: activeTruck.name,
        materialName: transferMaterial,
        requestedQty: qty,
        unit: '份',
        status: 'pending',
        urgency: transferUrgency,
        transferNotes: '温控保温箱转运，请优先调配'
      }
    });

    setIsTransferModalOpen(false);
    showToast('调拨申请已派发全车队', `已向【${target.name}】发出物料调度广播`);
  };

  // 模拟对讲录音发送
  const toggleRecording = () => {
    if (isRecording) {
      clearInterval(recordIntervalRef.current);
      setIsRecording(false);
      safeVibrate(25);

      const duration = Math.max(2, recordTimer);
      sendGroupChatMessage(channelType, channelId, {
        senderId: 'user-current',
        senderRole: viewerRole === 'merchant' ? 'merchant' : viewerRole === 'rider' ? 'rider' : 'customer',
        senderName: viewerRole === 'merchant' ? `${activeTruck.name} · 车长` : viewerRole === 'rider' ? '专送骑手' : '食客（你）',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
        senderBadge: viewerRole === 'merchant' ? '车长' : viewerRole === 'rider' ? '专送' : '老饕',
        type: 'voice',
        voiceDuration: duration,
        voiceWaveform: [30, 60, 90, 75, 80, 50, 95, 70, 45, 85, 60, 40],
        voiceTranscribed:
          channelType === 'fleet_dispatch'
            ? '【对讲文字转写】：车队收到，档口已做好出餐准备，请骑手按指引停靠。'
            : '【语音已转文字】：请问今天炭烤和牛牛肉饼什么时候出新一炉？'
      });
      setRecordTimer(0);
      showToast('语音对讲已发送', `录音时长 ${duration} 秒`);
    } else {
      safeVibrate(20);
      setIsRecording(true);
      setRecordTimer(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordTimer((t) => t + 1);
      }, 1000);
    }
  };

  const isFleetMode = channelType === 'fleet_dispatch';

  return (
    <div className="w-full h-full flex flex-col bg-[#F7F7F6] overflow-hidden select-none">
      {/* =========================================================================
          群聊专属信息横幅 (Group Banner)：
          展示当前群属性、在线节点与实时状态胶囊
          ========================================================================= */}
      <div className="shrink-0 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-3 py-2 flex items-center justify-between z-10 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              isFleetMode
                ? 'bg-amber-500/10 border-amber-300 text-amber-700'
                : 'bg-emerald-500/10 border-emerald-300 text-emerald-700'
            }`}
          >
            {isFleetMode ? <Radio className="w-4 h-4" /> : <Users className="w-4 h-4" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                {isFleetMode ? '全车队跨餐车调度指挥群' : `${activeTruck.name} · 老饕粉丝群`}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold tracking-tight border shrink-0 ${
                  isFleetMode
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                }`}
              >
                {isFleetMode ? '4车全网协同' : '384位老饕'}
              </span>
            </div>

            <div className="text-[10.5px] text-neutral-500 truncate flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {isFleetMode
                  ? '南广场 / 静安 / 张江 / 陆家嘴 实时互联 · 物料智能跨车调拨中'
                  : `驻点：${activeTruck.locationName} · 主厨现烤秒杀首发站`}
              </span>
            </div>
          </div>
        </div>

        {/* 右侧快捷动作 */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          {isFleetMode ? (
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition"
            >
              <ArrowUpDown className="w-3 h-3 text-amber-400" />
              <span>申请调拨</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md hidden xs:inline">
                主厨在线
              </span>
              {onSwitchTruck && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTruckSwitchDropdown(!showTruckSwitchDropdown)}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-neutral-100 active:bg-neutral-200 border border-neutral-200 text-neutral-800 text-[11px] font-bold flex items-center gap-1 shadow-3xs cursor-pointer transition"
                    title="切换不同餐车站台老饕群"
                  >
                    <Truck className="w-3 h-3 text-emerald-600" />
                    <span>换站台</span>
                    <ChevronRight className={`w-3 h-3 text-neutral-400 transition-transform ${showTruckSwitchDropdown ? 'rotate-90' : ''}`} />
                  </button>
                  {showTruckSwitchDropdown && (
                    <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl border border-neutral-200 shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 text-xs">
                      <div className="px-3 py-1 text-[10px] font-bold text-neutral-400">切换餐车站台老饕群：</div>
                      {trucks.map((trk) => {
                        const isCurrent = trk.id === activeTruck.id;
                        return (
                          <button
                            key={trk.id}
                            type="button"
                            onClick={() => {
                              setShowTruckSwitchDropdown(false);
                              onSwitchTruck(trk.id);
                              safeVibrate(15);
                            }}
                            className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer transition ${
                              isCurrent ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-neutral-50 text-neutral-700'
                            }`}
                          >
                            <div className="truncate pr-1">
                              <div className="text-xs">{trk.name}</div>
                              <div className="text-[10px] text-neutral-400 truncate">{trk.locationName}</div>
                            </div>
                            {isCurrent && <span className="text-[10px] text-emerald-600 font-bold shrink-0">当前</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          消息主视口 (Message Viewport)
          ========================================================================= */}
      <div
        ref={viewportRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-3.5 overscroll-contain"
      >
        {/* 顶部安全加密与数据隔离提示 */}
        <div className="flex justify-center my-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-200/60 border border-neutral-300/40 text-[10px] text-neutral-600 font-medium">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>
              {isFleetMode
                ? '车队内部加密信道 · 数据与食客专线严格物理隔离'
                : '餐车专属老饕频道 · 独立存储空间，畅聊美食福利'}
            </span>
          </div>
        </div>

        {messages.map((msg) => {
          const isSelf = msg.senderId === 'user-current' || msg.senderRole === viewerRole;
          const reactions = msg.reactions || {};

          return (
            <div key={msg.id} className="space-y-1">
              {/* 系统公告通知 */}
              {msg.type === 'system_notice' && (
                <div className="flex justify-center my-2">
                  <div className="max-w-[92%] sm:max-w-[80%] px-3 py-1.5 rounded-xl bg-neutral-100/90 border border-neutral-200/70 text-center shadow-3xs">
                    <p className="text-[11.5px] text-neutral-700 leading-relaxed font-medium">{msg.text}</p>
                    <span className="text-[9.5px] text-neutral-400 mt-0.5 block">{msg.time}</span>
                  </div>
                </div>
              )}

              {/* 现烤秒杀卡片 (老饕群专属) */}
              {msg.type === 'flash_sale' && msg.flashSaleInfo && (
                <div className="flex justify-center my-2">
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-amber-500/10 via-white to-orange-500/5 border border-amber-300/80 p-3.5 shadow-xs relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg shadow-2xs flex items-center gap-1">
                      <Flame className="w-3 h-3 animate-pulse" />
                      <span>现烤秒杀</span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 text-xs font-bold">
                        厨
                      </div>
                      <div className="text-[11px] font-bold text-neutral-900">{msg.senderName}</div>
                      <span className="text-[10px] text-neutral-400">{msg.time}</span>
                    </div>

                    <p className="text-xs text-neutral-800 font-medium mb-2.5 leading-snug">{msg.text}</p>

                    <div className="flex gap-2.5 bg-white/90 rounded-xl p-2.5 border border-amber-200/70 shadow-2xs">
                      {msg.flashSaleInfo.imageUrl && (
                        <img
                          src={msg.flashSaleInfo.imageUrl}
                          alt={msg.flashSaleInfo.dishName}
                          className="w-18 h-18 rounded-lg object-cover border border-neutral-100 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="font-bold text-xs text-neutral-900 truncate">
                            {msg.flashSaleInfo.dishName}
                          </div>
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-sm font-bold text-orange-600">
                              ¥{msg.flashSaleInfo.price.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-neutral-400 line-through">
                              ¥{msg.flashSaleInfo.originalPrice.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] font-semibold text-neutral-500">
                            仅剩 <span className="text-orange-600 font-bold">{msg.flashSaleInfo.stockRemaining}</span>/
                            {msg.flashSaleInfo.totalStock} 份
                          </span>

                          <button
                            type="button"
                            onClick={() => handleClaimFlashSale(msg.id)}
                            disabled={msg.flashSaleInfo.stockRemaining <= 0}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer ${
                              msg.flashSaleInfo.stockRemaining > 0
                                ? 'bg-orange-500 hover:bg-orange-600 active:scale-95 text-white'
                                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{msg.flashSaleInfo.stockRemaining > 0 ? '一键尝鲜抢订' : '已抢空'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 已抢名单头像掠影 */}
                    {msg.flashSaleInfo.claimedUsers && msg.flashSaleInfo.claimedUsers.length > 0 && (
                      <div className="mt-2 text-[10px] text-neutral-500 flex items-center gap-1">
                        <CheckCheck className="w-3 h-3 text-emerald-600" />
                        <span className="truncate">
                          老饕手速达人：{msg.flashSaleInfo.claimedUsers.slice(-3).join('、')} 等已锁定
                        </span>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}

              {/* 跨车物料紧急调拨卡片 (车队指挥群专属) */}
              {msg.type === 'stock_transfer' && msg.stockTransferInfo && (
                <div className="flex justify-center my-2">
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-sm rounded-2xl bg-white border border-amber-300 p-3.5 shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-300 text-amber-900 text-[10px] font-bold">
                          {msg.stockTransferInfo.transferId}
                        </span>
                        <span className="text-[11px] font-bold text-neutral-900">
                          跨餐车物料支援调拨
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          msg.stockTransferInfo.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : msg.stockTransferInfo.status === 'dispatched'
                            ? 'bg-blue-100 text-blue-800 animate-pulse'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {msg.stockTransferInfo.status === 'completed'
                          ? '已送达入库'
                          : msg.stockTransferInfo.status === 'dispatched'
                          ? '骑手转运中'
                          : msg.stockTransferInfo.status === 'accepted'
                          ? '已接单出库'
                          : '待接单调拨'}
                      </span>
                    </div>

                    {/* 调拨路径示意 */}
                    <div className="bg-neutral-50 rounded-xl p-2.5 border border-neutral-200/80 mb-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
                        <div className="truncate max-w-[120px] text-amber-900">
                          {msg.stockTransferInfo.fromTruckName}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0 mx-1.5" />
                        <div className="truncate max-w-[120px] text-emerald-900">
                          {msg.stockTransferInfo.toTruckName}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-neutral-200/60 flex items-center justify-between">
                        <div className="text-[11px] text-neutral-600 font-medium truncate">
                          物料：<span className="font-bold text-neutral-900">{msg.stockTransferInfo.materialName}</span>
                        </div>
                        <div className="text-xs font-bold text-orange-600">
                          {msg.stockTransferInfo.requestedQty} {msg.stockTransferInfo.unit}
                        </div>
                      </div>

                      {msg.stockTransferInfo.courierName && (
                        <div className="mt-1.5 text-[10.5px] text-blue-700 flex items-center gap-1 font-medium">
                          <Truck className="w-3 h-3" />
                          <span>调度专员：{msg.stockTransferInfo.courierName}</span>
                        </div>
                      )}
                    </div>

                    {/* 调拨工单流转动作按钮 */}
                    {msg.stockTransferInfo.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleAdvanceTransfer(msg.id, msg.stockTransferInfo!.status)}
                        className="w-full py-1.5 rounded-lg bg-neutral-900 hover:bg-black active:scale-[0.98] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {msg.stockTransferInfo.status === 'pending'
                            ? '02号车接单 · 立即出库备料'
                            : msg.stockTransferInfo.status === 'accepted'
                            ? '指派专线骑手加急起送'
                            : '01号车档口核验 · 确认送达入库'}
                        </span>
                      </button>
                    )}
                  </motion.div>
                </div>
              )}

              {/* 泊位联动广播卡片 (车队指挥群专属) */}
              {msg.type === 'berth_broadcast' && msg.berthInfo && (
                <div className="flex justify-center my-2">
                  <div className="w-full max-w-sm rounded-2xl bg-white border border-blue-200/90 p-3 shadow-xs">
                    <div className="flex items-center gap-1.5 text-blue-700 text-xs font-bold mb-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{msg.berthInfo.truckName} · 泊位联动公告</span>
                    </div>
                    <p className="text-[11.5px] text-neutral-800 leading-snug mb-2 font-medium">
                      {msg.text}
                    </p>
                    <div className="bg-blue-50/70 rounded-lg p-2 border border-blue-100 flex items-center justify-between text-[10.5px]">
                      <span className="text-neutral-600 truncate">微移位移：约 {msg.berthInfo.distanceDeltaMeters} 米</span>
                      <span className="text-blue-700 font-bold">自提坐标已同步刷新</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 普通文本与语音消息气泡 */}
              {(msg.type === 'text' || msg.type === 'voice') && (
                <div className={`flex gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'} group`}>
                  {/* 头像 */}
                  <img
                    src={
                      msg.senderAvatar ||
                      (isSelf
                        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces'
                        : 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=120&h=120&fit=crop&crop=faces')
                    }
                    alt={msg.senderName}
                    className="w-7 h-7 rounded-full object-cover border border-neutral-200 shadow-3xs shrink-0 mt-0.5"
                  />

                  {/* 气泡与发信人信息 */}
                  <div className={`max-w-[78%] sm:max-w-[65%] flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1 mb-0.5 px-0.5">
                      <span className="text-[10px] font-bold text-neutral-700 truncate max-w-[120px]">
                        {msg.senderName}
                      </span>
                      {msg.senderBadge && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-200/70 text-neutral-600 font-semibold tracking-tight">
                          {msg.senderBadge}
                        </span>
                      )}
                      <span className="text-[9.5px] text-neutral-400">{msg.time}</span>
                    </div>

                    <div
                      className={`rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-3xs transition ${
                        isSelf
                          ? 'bg-neutral-900 text-white rounded-tr-xs'
                          : 'bg-white text-neutral-800 border border-neutral-200/80 rounded-tl-xs'
                      }`}
                    >
                      {msg.type === 'voice' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 cursor-pointer py-0.5">
                            <Volume2 className={`w-4 h-4 ${isSelf ? 'text-amber-400' : 'text-neutral-700'}`} />
                            <span className="font-bold">{msg.voiceDuration || 3}" 语音对讲</span>
                          </div>
                          {msg.voiceTranscribed && (
                            <p className="text-[10.5px] opacity-80 border-t border-white/10 pt-1">
                              {msg.voiceTranscribed}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap select-text">{msg.text}</p>
                      )}
                    </div>

                    {/* 表态小胶囊 (Reactions) */}
                    {Object.keys(reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-white border border-neutral-200 text-[10px] text-neutral-700 shadow-3xs cursor-pointer hover:bg-neutral-50"
                          >
                            <span>{emoji}</span>
                            <span className="font-bold text-[9px] text-neutral-500">{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>

      {/* =========================================================================
          快捷战术话术抽屉 (Tactical Quick Phrases)
          ========================================================================= */}
      <AnimatePresence>
        {isActionTrayOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-neutral-200 bg-white/95 px-3 py-2 shrink-0 overflow-hidden shadow-sm"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600 mb-1.5">
              <span>{isFleetMode ? '车队调度快捷指令' : '老饕专属快捷话术'}</span>
              <button
                type="button"
                onClick={() => setIsActionTrayOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {isFleetMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSendQuickPhrase('【车队互通】：01号车炭火已升温完毕，出餐峰值 45单/小时正常。')}
                    className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-medium border border-neutral-200/80 cursor-pointer"
                  >
                    🔥 报备后厨产能正常
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendQuickPhrase('【泊位协同】：南广场城管巡检完毕，周边人流通畅，可继续稳定接单。')}
                    className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-medium border border-neutral-200/80 cursor-pointer"
                  >
                    📍 巡检正常通报
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendQuickPhrase('【紧急求援】：静安商圈订单暴增，请张江分队准备跨区调配备料！')}
                    className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-medium border border-amber-200 cursor-pointer"
                  >
                    🚨 爆单求援预警
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleSendQuickPhrase('主厨您好！请问下一炉炭烤和牛牛肉饼还要多久出锅？')}
                    className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-medium border border-neutral-200/80 cursor-pointer"
                  >
                    🕒 问出炉时间
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendQuickPhrase('刚下的订单请主厨帮我多放秘制黑椒汁，感谢！')}
                    className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-medium border border-neutral-200/80 cursor-pointer"
                  >
                    🌶️ 申请免葱加辣
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendQuickPhrase('老饕前来打卡！今日份和牛堡配冰萃太绝了～')}
                    className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-medium border border-neutral-200/80 cursor-pointer"
                  >
                    👍 美食打卡点赞
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          底部操作与发信控制栏 (Bottom Control Bar)
          ========================================================================= */}
      <footer className="shrink-0 bg-white border-t border-neutral-200/90 px-2.5 sm:px-4 py-2 z-20 shadow-sm">
        <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
          {/* 对讲/录音按键 */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 shadow-2xs ${
              isRecording
                ? 'bg-rose-500 border-rose-600 text-white animate-pulse'
                : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-700'
            }`}
            title={isRecording ? '点击结束对讲并发送' : '点击开始对讲录音'}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* 战术快捷话术抽屉切换键 */}
          <button
            type="button"
            onClick={() => setIsActionTrayOpen(!isActionTrayOpen)}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 shadow-2xs ${
              isActionTrayOpen
                ? 'bg-neutral-900 border-neutral-900 text-white'
                : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-700'
            }`}
            title="快捷话术"
          >
            <Zap className="w-4 h-4" />
          </button>

          {/* 输入框 */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isRecording
                ? `正在录制对讲 (${recordTimer}s)... 再次轻触结束`
                : isFleetMode
                ? '发送车队调度广播或物料协同消息...'
                : '与餐车主厨及老饕食客互动聊美食...'
            }
            className="flex-1 min-w-0 h-8 px-2.5 rounded-lg bg-neutral-100 border border-neutral-200 focus:bg-white focus:border-neutral-400 focus:outline-none text-xs text-neutral-900 placeholder:text-neutral-400 tracking-tight transition font-sans"
          />

          {/* 发送键 */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`h-8 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer ${
              inputText.trim()
                ? 'bg-neutral-900 hover:bg-black text-white active:scale-95'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">发送</span>
          </button>
        </form>
      </footer>

      {/* =========================================================================
          弹窗：跨餐车物料紧急调拨申请单 (Cross-Truck Transfer Modal)
          ========================================================================= */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-white border border-neutral-200 p-4 shadow-xl relative"
            >
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-300 text-amber-800 flex items-center justify-center font-bold">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">发起跨餐车原料调拨</h3>
                  <p className="text-[10.5px] text-neutral-500">向邻近流动餐车申请急缺物料支援</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">急缺物料品名</label>
                  <select
                    value={transferMaterial}
                    onChange={(e) => setTransferMaterial(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 font-medium"
                  >
                    <option value="特选冷鲜和牛牛肉饼">特选冷鲜和牛牛肉饼</option>
                    <option value="黑曜石黑松露酱 (原装冷链罐)">黑曜石黑松露酱 (原装冷链罐)</option>
                    <option value="意大利手工土豆疙瘩面坯">意大利手工土豆疙瘩面坯</option>
                    <option value="炭火直烤精选鸡腿肉串">炭火直烤精选鸡腿肉串</option>
                    <option value="深烘冷萃咖啡浓缩原液">深烘冷萃咖啡浓缩原液</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-neutral-600 font-semibold mb-1">支援餐车</label>
                    <select
                      value={transferTargetTruck}
                      onChange={(e) => setTransferTargetTruck(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 font-medium"
                    >
                      {trucks
                        .filter((t) => t.id !== activeTruck.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-600 font-semibold mb-1">调拨数量 (份)</label>
                    <input
                      type="number"
                      value={transferQty}
                      onChange={(e) => setTransferQty(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">时效等级</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTransferUrgency('high')}
                      className={`py-1.5 rounded-lg border text-center font-bold text-xs cursor-pointer ${
                        transferUrgency === 'high'
                          ? 'bg-rose-50 border-rose-300 text-rose-800'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                      }`}
                    >
                      🚨 紧急加急 (6分钟达)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferUrgency('normal')}
                      className={`py-1.5 rounded-lg border text-center font-bold text-xs cursor-pointer ${
                        transferUrgency === 'normal'
                          ? 'bg-neutral-900 border-neutral-900 text-white'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                      }`}
                    >
                      常规补货
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(false)}
                    className="flex-1 py-2 rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-700 font-bold hover:bg-neutral-200 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitTransfer}
                    className="flex-1 py-2 rounded-lg bg-neutral-900 hover:bg-black text-white font-bold transition shadow-xs cursor-pointer"
                  >
                    确认广播申请
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FleetGroupChatRoomView;
