import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Bike,
  Store,
  User,
  ShieldCheck,
  Search,
  Filter,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Phone,
  Clock,
  Timer,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Zap,
  MapPin,
  ChevronRight,
  RefreshCw,
  Gift,
  Flame,
  Thermometer,
  Layers,
  ArrowRight,
  Radio,
  FileSpreadsheet,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Camera,
  Zap,
  FileText
} from 'lucide-react';
import { Order, DishItem } from '../../types';
import {
  ChatMessageItem,
  ChatRole,
  getOrderChatMessages,
  getLatestChatMessage,
  getUnreadCountForRole,
  markOrderChatAsRead,
  subscribeOrderChat,
  sendOrderChatMessage,
  calculateChatSLAResponse,
  getAllOrdersSLASummary,
  formatExactTime,
  formatRelativeTime
} from '../../utils/chatHub';
import { voiceMessageEngine } from '../../utils/voiceMessageEngine';
import { fallbackToast } from '../../utils/fallbackToast';

export interface OmniAggregatedChatHubProps {
  orders: Order[];
  viewerRole: 'platform' | 'merchant' | 'rider' | 'user';
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onRejectOrder?: (orderId: string, reason: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  showToast?: (msg: string) => void;
  onClose?: () => void;
  isModalMode?: boolean;
}

export const OmniAggregatedChatHub: React.FC<OmniAggregatedChatHubProps> = ({
  orders,
  viewerRole,
  onAdvanceOrderStatus,
  onRejectOrder,
  onAuditRefund,
  showToast = (msg: string) => fallbackToast(msg),
  onClose,
  isModalMode = false
}) => {
  const [selectedOrderNo, setSelectedOrderNo] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'warning' | 'rider_user' | 'merchant_user' | 'arbitration'>('all');
  const [inputText, setInputText] = useState('');
  const [chatTick, setChatTick] = useState(0);

  // Voice recording & playback states
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [liveWaveform, setLiveWaveform] = useState<number[]>([20, 40, 60, 30, 70, 50, 80, 45, 35, 55]);
  const [micMode, setMicMode] = useState<'real_mic' | 'simulated'>('real_mic');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Phone Call Simulation
  const [callActive, setCallActive] = useState<boolean>(false);
  const [callTarget, setCallTarget] = useState<{ name: string; phone: string; role: string } | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordTimerRef = useRef<any>(null);
  const voicePlayerRef = useRef<{ stop: () => void } | null>(null);

  // Auto tick
  useEffect(() => {
    const timer = setInterval(() => {
      setChatTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Call timer
  useEffect(() => {
    let interval: any = null;
    if (callActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callActive]);

  // Subscribe to all chat changes
  useEffect(() => {
    const unsub = subscribeOrderChat(undefined, () => {
      setChatTick((t) => t + 1);
    });
    return () => unsub();
  }, []);

  // Ensure default selected order
  useEffect(() => {
    if (orders.length > 0 && !selectedOrderNo) {
      const active = orders.find((o) => o.status !== 'cancelled') || orders[0];
      setSelectedOrderNo(active.orderNo.replace(/^#/, ''));
    }
  }, [orders, selectedOrderNo]);

  // Active current order
  const currentOrder = useMemo(() => {
    if (!selectedOrderNo) return orders[0];
    return orders.find((o) => o.orderNo.replace(/^#/, '') === selectedOrderNo) || orders[0];
  }, [orders, selectedOrderNo]);

  const activeCleanNo = (currentOrder?.orderNo || 'DEL-9912').replace(/^#/, '');

  // Messages of current active order
  const activeMessages = useMemo(() => {
    return getOrderChatMessages(activeCleanNo, currentOrder);
  }, [activeCleanNo, currentOrder, chatTick]);

  // SLA Summary across all orders
  const globalSLASummary = useMemo(() => {
    return getAllOrdersSLASummary(orders.map((o) => o.orderNo));
  }, [orders, chatTick]);

  // Current SLA status
  const currentSLA = useMemo(() => {
    return calculateChatSLAResponse(activeCleanNo, viewerRole, currentOrder);
  }, [activeCleanNo, viewerRole, currentOrder, chatTick]);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const cleanNo = ord.orderNo.replace(/^#/, '');
      const matchSearch =
        cleanNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (ord.customerName && ord.customerName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
        (ord.truckName && ord.truckName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
        (ord.courierName && ord.courierName.toLowerCase().includes(searchKeyword.toLowerCase()));

      if (!matchSearch) return false;

      if (channelFilter === 'all') return true;

      const sla = calculateChatSLAResponse(cleanNo, viewerRole, ord);
      if (channelFilter === 'warning') {
        return sla.isWarning || sla.isOverdue || sla.isWaitingReply;
      }
      if (channelFilter === 'arbitration') {
        return ord.status === 'refunded' || ord.status === 'refund_pending' || sla.isOverdue;
      }
      if (channelFilter === 'rider_user') {
        return !!ord.courierName;
      }
      if (channelFilter === 'merchant_user') {
        return true;
      }
      return true;
    });
  }, [orders, searchKeyword, channelFilter, viewerRole, chatTick]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  }, [activeCleanNo, activeMessages.length, isRecording]);

  // Mark as read on switch
  const handleSelectOrder = (ordNo: string) => {
    const clean = ordNo.replace(/^#/, '');
    setSelectedOrderNo(clean);
    markOrderChatAsRead(clean, viewerRole);
  };

  // Send message
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const senderName =
      viewerRole === 'merchant'
        ? currentOrder?.truckName || '黑曜石餐车 · 南广场总站'
        : viewerRole === 'rider'
        ? currentOrder?.courierName || '陈志远 · 专线金牌骑手'
        : viewerRole === 'platform'
        ? '平台客服与仲裁总控 (工号 8001)'
        : currentOrder?.customerName || '食客';

    sendOrderChatMessage(activeCleanNo, {
      senderRole: viewerRole,
      senderName,
      type: 'text',
      text
    });

    setInputText('');
    showToast(`[全聚联络] 消息已实时广播给三方 (#${activeCleanNo})`);
  };

  // Voice recording
  const handleStartVoice = async () => {
    if (isRecording) return;
    setRecordDuration(0);
    setLiveTranscript('');
    setLiveWaveform([25, 45, 65, 35, 75, 55, 85, 50, 40, 50]);

    const res = await voiceMessageEngine.startRecording(
      (wave) => setLiveWaveform(wave),
      (transcript) => setLiveTranscript(transcript)
    );

    setMicMode(res.mode);
    setIsRecording(true);

    recordTimerRef.current = setInterval(() => {
      setRecordDuration((prev) => prev + 1);
    }, 1000);
  };

  const handleStopVoice = async (send: boolean) => {
    if (!isRecording) return;
    clearInterval(recordTimerRef.current);
    setIsRecording(false);

    const voiceData = await voiceMessageEngine.stopRecording();

    if (send && voiceData) {
      const senderName =
        viewerRole === 'merchant'
          ? currentOrder?.truckName || '餐车主理人'
          : viewerRole === 'rider'
          ? currentOrder?.courierName || '专线骑手'
          : viewerRole === 'platform'
          ? '平台仲裁客服'
          : '食客';

      sendOrderChatMessage(activeCleanNo, {
        senderRole: viewerRole,
        senderName,
        type: 'voice',
        voiceDuration: voiceData.duration,
        voiceAudioUrl: voiceData.audioUrl,
        voiceAudioBase64: voiceData.audioBase64,
        voiceTranscribed: voiceData.transcribedText || liveTranscript || '【语音消息已送达】',
        voiceWaveform: voiceData.waveform
      });

      showToast(`[语音对讲] ${voiceData.duration}s 语音已广播至订单三端`);
    }
  };

  const handlePlayVoice = (msg: ChatMessageItem) => {
    if (playingVoiceId === msg.id) {
      voicePlayerRef.current?.stop();
      setPlayingVoiceId(null);
      return;
    }
    voicePlayerRef.current?.stop();
    setPlayingVoiceId(msg.id);

    const player = voiceMessageEngine.playVoice(
      msg.voiceAudioBase64 || msg.voiceAudioUrl,
      msg.voiceTranscribed || msg.text,
      msg.voiceDuration || 3,
      () => {
        setPlayingVoiceId(null);
      }
    );
    voicePlayerRef.current = player;
  };

  // Quick Preset Actions
  const rolePresets = useMemo(() => {
    if (viewerRole === 'merchant') {
      return [
        { label: '🔥 刚出炉，现已装入保温袋', text: '您好，您的餐品刚刚炭火炙烤出炉，已封入恒温双层铝箔袋，专线骑手已在餐车前等候取餐。' },
        { label: '🥤 赠送一份冰镇乌梅汁', text: '感谢您的耐心等待！餐车主理人特为您随单赠送一份古法熬制冰镇乌梅汁，祝您用餐愉快！' },
        { label: '⚠️ 特殊备注已处理', text: '主厨已看到您的特殊忌口/加料备注，已为您特别定制处理，请放心品尝。' }
      ];
    }
    if (viewerRole === 'rider') {
      return [
        { label: '🛵 已取餐，锁入70℃恒温箱', text: '师傅/食客您好！餐品已从餐车取餐柜取出，已锁入智能70℃恒温箱，即刻加速配送！' },
        { label: '📍 距离您还有 300 米', text: '已到达您所在的园区大门/楼下，马上为您送上楼，请留意电话或门口。' },
        { label: '🚪 已放置外卖指定货架', text: '餐品已妥善放置在前台/指定外卖格，包装完好保温中，请尽快享用。' }
      ];
    }
    if (viewerRole === 'platform') {
      return [
        { label: '🛡️ 平台SLA超时督促通知', text: '【平台督导】监测到会话等待时间已接近SLA阈值，请商家与骑手确认出餐与配送进度。' },
        { label: '💰 发放 ¥15 先行关怀代金券', text: '【平台先行赔付】经客服核验，已为食客发放 ¥15 无门槛餐车关怀代金券，即时充入账户。' },
        { label: '📞 协助发起三方隐私电话通话', text: '【平台智能调度】已为骑手、商家与食客开启三方隐私号码一键转接通道。' }
      ];
    }
    return [
      { label: '🛵 师傅到哪了？请保温', text: '师傅您好，请问大概还需要几分钟送达？请帮我注意保温谢谢！' },
      { label: '🌶️ 请老板多放一份秘制辣椒粉', text: '老板您好，如果还没封口请帮我多放一份秘制干碟辣椒粉，非常感谢！' },
      { label: '🚪 放在门口/前台即可', text: '送到后直接放在门口货架/前台即可，敲一下门即可无需等待。' }
    ];
  }, [viewerRole]);

  // Format SLA display safely
  const formatSlaSafe = (sec: number) => {
    if (!sec || sec <= 0) return '18秒';
    if (sec > 3600) return '< 60秒';
    if (sec < 60) return `${Math.round(sec)}秒`;
    const mins = Math.floor(sec / 60);
    const rem = Math.round(sec % 60);
    return rem > 0 ? `${mins}分${rem}秒` : `${mins}分钟`;
  };

  return (
    <div className={`flex flex-col bg-[#fbfbfa] text-[#37352f] ${isModalMode ? 'h-full max-h-[88vh]' : 'min-h-[600px] md:min-h-[720px] rounded-xl border border-[#e9e9e7] shadow-2xs overflow-hidden'}`}>
      {/* 1. Header Bar: Notion Token Style */}
      <div className="px-3 sm:px-4 py-2.5 bg-white border-b border-[#e9e9e7] flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#2b593f] text-white flex items-center justify-center font-black shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black tracking-tight text-[#201f1d] truncate">
                全网三端即时联络聚合总成 (Omni Tri-Party Hub)
              </h2>
              <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#eef4f0] text-[#2b593f] border border-[#d2e4d7]">
                LIVE 4-WAY SYNC
              </span>
            </div>
            <p className="text-[11px] text-[#787774] hidden sm:block">
              骑手 (Rider) · 商家 (Merchant) · 客户 (Customer) · 平台仲裁 (Platform) 全流聚合
            </p>
          </div>
        </div>

        {/* Live SLA Badge & Global Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2 bg-[#f7f6f3] px-2.5 py-1 rounded-lg border border-[#e3e2de] text-xs">
            <div className="flex items-center gap-1 text-[#787774]">
              <span>平均SLA:</span>
              <strong className="font-mono text-[#2b593f]">{formatSlaSafe(globalSLASummary.avgResponseTimeSec)}</strong>
            </div>
            <div className="w-px h-3 bg-[#e3e2de]" />
            <div className="flex items-center gap-1 text-[#787774]">
              <span>达标率:</span>
              <strong className="font-mono text-[#2b593f]">{globalSLASummary.complianceRatePercent}%</strong>
            </div>
            {globalSLASummary.overdueCount > 0 && (
              <>
                <div className="w-px h-3 bg-[#e3e2de]" />
                <span className="text-[10px] bg-[#fbe4e4] text-[#9f2b2b] border border-[#f5c6c6] font-bold px-1.5 py-0.2 rounded-[2px] animate-pulse">
                  {globalSLASummary.overdueCount} 单预警
                </span>
              </>
            )}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[#787774] hover:bg-[#f1f1ef] hover:text-[#37352f] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Body: Split View (Left: Orders Directory / Right: Unified Dialogue Stream) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[480px]">
        {/* Left Sidebar: All Orders & Filter */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[#e9e9e7] bg-white flex flex-col flex-shrink-0 max-h-48 md:max-h-none">
          {/* Search & Filter */}
          <div className="p-2.5 border-b border-[#f1f1ef] space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9b9a97] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索单号/食客/骑手/餐车..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#f7f6f3] border border-[#e3e2de] rounded-[3px] text-[#37352f] placeholder-[#9b9a97] focus:outline-none focus:border-[#2b593f]"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px]">
              {[
                { id: 'all', label: '全部' },
                { id: 'warning', label: '⚠️ SLA预警' },
                { id: 'rider_user', label: '骑手↔食客' },
                { id: 'merchant_user', label: '商家↔食客' },
                { id: 'arbitration', label: '争议仲裁' }
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setChannelFilter(pill.id as any)}
                  className={`px-2 py-0.5 rounded-[2px] whitespace-nowrap transition-colors cursor-pointer ${
                    channelFilter === pill.id
                      ? 'bg-[#2b593f] text-white font-bold'
                      : 'text-[#787774] hover:bg-[#f1f1ef] hover:text-[#37352f]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#f1f1ef]">
            {filteredOrders.length === 0 ? (
              <div className="p-6 text-center text-[#9b9a97] text-xs">
                暂无符合筛选条件的三端联络会话
              </div>
            ) : (
              filteredOrders.map((ord) => {
                const cNo = ord.orderNo.replace(/^#/, '');
                const isSelected = cNo === activeCleanNo;
                const unread = getUnreadCountForRole(cNo, viewerRole);
                const sla = calculateChatSLAResponse(cNo, viewerRole, ord);
                const msgs = getOrderChatMessages(cNo, ord);
                const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
                const lastMsgText = lastMsg?.text || (lastMsg?.voiceDuration ? '【语音消息】' : '【暂无消息】');
                const lastMsgTime = lastMsg?.timeExact || lastMsg?.time || '刚刚';

                return (
                  <div
                    key={ord.id}
                    onClick={() => handleSelectOrder(cNo)}
                    className={`p-2.5 transition-colors cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-[#eef4f0] border-l-2 border-[#2b593f]'
                        : 'hover:bg-[#f7f6f3]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#201f1d]">#{cNo}</span>
                        <span className="text-[10px] px-1 py-0.2 rounded-[2px] bg-[#f1f1ef] text-[#787774]">
                          {ord.status === 'delivering' ? '配送中' : ord.status === 'cooking' ? '制作中' : '待履约'}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#9b9a97] font-mono">{lastMsgTime}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#787774] mb-1">
                      <span className="truncate max-w-[140px] font-medium text-[#37352f]">
                        {ord.customerName || '食客'} · {ord.truckName || '餐车'}
                      </span>
                      {unread > 0 && (
                        <span className="bg-[#9f2b2b] text-white font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                          {unread}
                        </span>
                      )}
                    </div>

                    {/* Last message preview */}
                    <div className="text-[11px] text-[#787774] truncate flex items-center justify-between">
                      <span className="truncate pr-2">{lastMsgText}</span>
                      {sla.isOverdue ? (
                        <span className="text-[9px] bg-[#fbe4e4] text-[#9f2b2b] px-1 rounded-[2px] font-bold font-mono">
                          超时
                        </span>
                      ) : sla.isWarning ? (
                        <span className="text-[9px] bg-[#fbf3db] text-[#8f6b00] px-1 rounded-[2px] font-bold font-mono">
                          {sla.remainingSeconds}s
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Area: Active Tri-Party Conversation Stream */}
        <div className="flex-1 flex flex-col bg-[#fbfbfa] overflow-hidden">
          {/* Order Header Detail Banner */}
          {currentOrder && (
            <div className="px-4 py-2.5 bg-white border-b border-[#e9e9e7] flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-[#201f1d]">
                      #{activeCleanNo}
                    </span>
                    <span className="text-[11px] font-semibold text-[#2b593f] bg-[#eef4f0] px-2 py-0.5 rounded-[2px] border border-[#d2e4d7]">
                      {currentOrder.truckName}
                    </span>
                    <span className="text-xs text-[#787774]">
                      食客: <strong className="text-[#37352f]">{currentOrder.customerName}</strong>
                    </span>
                    {currentOrder.courierName && (
                      <span className="text-xs text-[#787774] flex items-center gap-1">
                        <Bike className="w-3 h-3 text-[#d97706]" />
                        <strong className="text-[#37352f]">{currentOrder.courierName}</strong>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#787774] mt-0.5 flex items-center gap-3">
                    <span>总额: <strong className="text-[#201f1d]">¥{currentOrder.totalAmount.toFixed(2)}</strong></span>
                    <span>地址: {currentOrder.deliveryAddress}</span>
                    <span>预计耗时: {currentOrder.estimatedDeliveryTime || '约 10 分钟'}</span>
                  </div>
                </div>
              </div>

              {/* Actions & SLA Timer */}
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[10px] text-[#787774]">当前会话 SLA 响应</div>
                  <div className={`text-xs font-mono font-bold ${currentSLA.isOverdue ? 'text-[#9f2b2b]' : currentSLA.isWarning ? 'text-[#8f6b00]' : 'text-[#2b593f]'}`}>
                    {currentSLA.isOverdue ? '⚠️ 严重超时' : `倒计时 ${currentSLA.formattedTimer}`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCallTarget({
                      name: currentOrder.customerName || '食客',
                      phone: '138-0000-8888',
                      role: '食客'
                    });
                    setCallActive(true);
                    setCallDuration(0);
                  }}
                  className="px-2.5 py-1 text-xs rounded-[3px] bg-[#f7f6f3] border border-[#e3e2de] text-[#37352f] hover:bg-[#f1f1ef] flex items-center gap-1 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-[#2b593f]" />
                  <span>拨号联络</span>
                </button>
              </div>
            </div>
          )}

          {/* Messages Stream Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {activeMessages.map((msg) => {
              const isMe = msg.senderRole === viewerRole;

              // Distinct role styling badge
              const roleConfig = {
                merchant: { label: '餐车商家', color: 'bg-[#eef4f0] text-[#2b593f] border-[#d2e4d7]', icon: Store },
                rider: { label: '专线骑手', color: 'bg-[#fbf3db] text-[#8f6b00] border-[#f5e6b3]', icon: Bike },
                user: { label: '下单食客', color: 'bg-[#edf3fc] text-[#285eaf] border-[#d0e1f9]', icon: User },
                platform: { label: '平台总控', color: 'bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]', icon: ShieldCheck },
                system: { label: '系统通知', color: 'bg-[#f1f1ef] text-[#787774] border-[#e3e2de]', icon: Bell }
              }[msg.senderRole] || { label: '成员', color: 'bg-white text-[#37352f] border-[#e3e2de]', icon: User };

              const RoleIcon = roleConfig.icon;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender Name & Role & Exact Timestamp */}
                  <div className={`flex items-center gap-1.5 text-[11px] mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-[2px] border flex items-center gap-1 ${roleConfig.color}`}>
                      <RoleIcon className="w-2.5 h-2.5" />
                      <span>{roleConfig.label}</span>
                    </span>
                    <span className="font-semibold text-[#37352f]">{msg.senderName}</span>
                    <span className="text-[#9b9a97] font-mono text-[10px]">
                      {msg.timeExact || msg.time}
                    </span>
                  </div>

                  {/* Message Bubble Content */}
                  <div
                    className={`max-w-lg rounded-[4px] px-3.5 py-2 text-xs leading-relaxed shadow-2xs border ${
                      isMe
                        ? 'bg-[#2b593f] text-white border-[#2b593f]'
                        : 'bg-white text-[#37352f] border-[#e9e9e7]'
                    }`}
                  >
                    {/* Plain Text */}
                    {msg.type === 'text' && <div>{msg.text}</div>}

                    {/* Voice Message Bubble */}
                    {msg.type === 'voice' && (
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => handlePlayVoice(msg)}
                          className={`flex items-center gap-2 px-2 py-1 rounded-[2px] cursor-pointer ${
                            isMe ? 'bg-white/20 text-white' : 'bg-[#f7f6f3] text-[#2b593f]'
                          }`}
                        >
                          {playingVoiceId === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                          <span className="font-mono font-bold text-xs">{msg.voiceDuration || 3}″</span>
                          <span className="text-[10px] opacity-80">点击播放语音</span>
                        </button>
                        {msg.voiceTranscribed && (
                          <div className={`text-[11px] italic mt-1 pt-1 border-t ${isMe ? 'border-white/20 text-white/90' : 'border-[#e9e9e7] text-[#787774]'}`}>
                            转写: “{msg.voiceTranscribed}”
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status Change Card */}
                    {msg.type === 'status_change' && msg.statusChangeInfo && (
                      <div className="space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{msg.statusChangeInfo.title}</span>
                        </div>
                        <div className={`text-[11px] ${isMe ? 'text-white/80' : 'text-[#787774]'}`}>
                          {msg.statusChangeInfo.description}
                        </div>
                        <div className={`text-[10px] font-mono ${isMe ? 'text-white/60' : 'text-[#9b9a97]'}`}>
                          操作员: {msg.statusChangeInfo.actionOperator}
                        </div>
                      </div>
                    )}

                    {/* Platform Arbitration / Compensation */}
                    {msg.type === 'platform_arbitration' && (
                      <div className="space-y-1 text-emerald-800 bg-emerald-50 p-2 rounded-[3px] border border-emerald-200">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>极速先行赔付凭证已生效</span>
                        </div>
                        <div className="text-[11px] text-emerald-700">{msg.text}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Presets Bar */}
          <div className="px-4 py-1.5 bg-[#f7f6f3] border-t border-[#e9e9e7] flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] text-[#787774] font-medium whitespace-nowrap flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#d97706] stroke-[1.5]" /> 快捷响应:
            </span>
            {rolePresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(preset.text)}
                className="px-2 py-0.5 text-[11px] rounded-[2px] bg-white border border-[#e3e2de] text-[#37352f] hover:bg-[#eef4f0] hover:text-[#2b593f] hover:border-[#d2e4d7] transition-all whitespace-nowrap cursor-pointer shadow-2xs"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Expandable Drawer Panel (向上展开抽屉) */}
          <AnimatePresence>
            {isDrawerOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#f7f6f3] border-t border-[#e9e9e7] p-2.5 space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-[#37352f]">
                  <span className="font-bold flex items-center gap-1">
                    <ChevronsUpDown className="w-3.5 h-3.5 text-[#2b593f]" />
                    <span>协同抽屉快捷面板 (向上展开)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="text-[11px] text-[#787774] hover:text-black flex items-center gap-0.5 cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>向下收起</span>
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      handleSendMessage('【对讲广播】：各位同仁请注意，正在进行多方协同调度！');
                      setIsDrawerOpen(false);
                    }}
                    className="p-1.5 bg-white border border-[#e3e2de] rounded-[3px] text-center hover:bg-[#eef4f0] hover:text-[#2b593f] cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 mx-auto text-sky-600 mb-0.5" />
                    <span>对讲广播</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSendMessage('【拍照存证】：餐品状态完好，已完成双层保温封签。');
                      setIsDrawerOpen(false);
                    }}
                    className="p-1.5 bg-white border border-[#e3e2de] rounded-[3px] text-center hover:bg-[#eef4f0] hover:text-[#2b593f] cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 mx-auto text-emerald-600 mb-0.5" />
                    <span>拍照存证</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSendMessage('【当前定位】：骑手已到达西藏北路大悦城北门（东经 121.47, 北纬 31.24）。');
                      setIsDrawerOpen(false);
                    }}
                    className="p-1.5 bg-white border border-[#e3e2de] rounded-[3px] text-center hover:bg-[#eef4f0] hover:text-[#2b593f] cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 mx-auto text-amber-600 mb-0.5" />
                    <span>发送定位</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSendMessage('【加急催单】：客户在催问进度，后厨与骑手请优先保障！');
                      setIsDrawerOpen(false);
                    }}
                    className="p-1.5 bg-[#fef2f2] border border-red-200 rounded-[3px] text-center hover:bg-red-100 text-red-700 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 mx-auto text-red-600 mb-0.5" />
                    <span>加急催单</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input & Voice Controls */}
          <div className="p-3 bg-white border-t border-[#e9e9e7] flex items-center gap-2">
            {/* Real Voice Mic Button (转为真实录音) */}
            <button
              type="button"
              onClick={() => {
                if (isRecording) {
                  handleStopVoice(true);
                } else {
                  handleStartVoice();
                }
              }}
              className={`p-2 rounded-[3px] transition-colors cursor-pointer flex items-center justify-center ${
                isRecording
                  ? 'bg-[#9f2b2b] text-white animate-pulse'
                  : 'bg-[#f7f6f3] border border-[#e3e2de] text-[#37352f] hover:bg-[#f1f1ef] hover:text-[#2b593f]'
              }`}
              title={isRecording ? '点击结束并发送真实录音' : '点击开启真实麦克风录音 (智能降噪与实时转写)'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#2b593f]" />}
            </button>

            {isRecording ? (
              <div className="flex-1 px-3 py-1.5 rounded-[3px] bg-[#fbe4e4] border border-[#f5c6c6] flex items-center justify-between text-xs text-[#9f2b2b]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#9f2b2b] animate-ping" />
                  <span className="font-bold">真实麦克风录音中 ({recordDuration}s)...</span>
                  {liveTranscript && <span className="italic text-[11px] opacity-80">“{liveTranscript}”</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStopVoice(false)}
                    className="px-2 py-0.5 text-[10px] rounded-[2px] bg-white text-[#787774] border border-[#e3e2de] cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStopVoice(true)}
                    className="px-2 py-0.5 text-[10px] rounded-[2px] bg-[#9f2b2b] text-white font-bold cursor-pointer"
                  >
                    发送
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`作为【${viewerRole === 'merchant' ? '餐车商家' : viewerRole === 'rider' ? '专线骑手' : viewerRole === 'platform' ? '平台总控' : '食客'}】发送实时消息...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs bg-[#f7f6f3] border border-[#e3e2de] rounded-[3px] text-[#37352f] placeholder-[#9b9a97] focus:outline-none focus:border-[#2b593f]"
                />

                {/* Drawer Trigger Button (添加一个向下关闭，向上展开抽屉触发按钮) */}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  className={`p-1.5 rounded-[3px] border transition-colors cursor-pointer flex items-center justify-center ${
                    isDrawerOpen
                      ? 'bg-[#2b593f] text-white border-[#2b593f]'
                      : 'bg-[#f7f6f3] border-[#e3e2de] text-[#787774] hover:text-black hover:bg-[#f1f1ef]'
                  }`}
                  title={isDrawerOpen ? '向下收起功能抽屉' : '向上展开协同抽屉面板'}
                >
                  {isDrawerOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="px-3.5 py-1.5 bg-[#2b593f] text-white text-xs font-bold rounded-[3px] hover:bg-[#224732] transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>发送</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulated Phone Call Overlay */}
      {callActive && callTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#201f1d] text-white rounded-[6px] p-6 max-w-sm w-full text-center space-y-4 border border-white/10 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-[#2b593f] text-white mx-auto flex items-center justify-center animate-pulse">
              <Phone className="w-8 h-8" />
            </div>
            <div>
              <div className="text-lg font-black">{callTarget.name}</div>
              <div className="text-xs text-neutral-400 mt-0.5">三方加密虚拟号通话 · {callTarget.phone}</div>
              <div className="text-xl font-mono text-emerald-400 mt-2">
                {Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}
              </div>
            </div>
            <div className="flex justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setCallActive(false)}
                className="px-6 py-2 rounded-full bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 cursor-pointer shadow-lg"
              >
                挂断通话
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
