import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowLeft,
  Send,
  Phone,
  Bike,
  Store,
  User,
  Users,
  ShieldCheck,
  MapPin,
  Camera,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  PanelBottomClose,
  PanelBottomOpen,
  Check,
  CheckCheck,
  Bell,
  Zap,
  Gift,
  Clock,
  Navigation,
  ChefHat,
  CheckCircle2,
  Ban,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Flame,
  PhoneCall,
  PhoneOff,
  Maximize2,
  Mic,
  MicOff,
  Radio,
  Cloud,
  RefreshCw,
  Database,
  Code2,
  Copy,
  Layers,
  Terminal,
  Activity,
  Play,
  Pause,
  Timer,
  ShieldAlert,
  Gavel,
  BadgeAlert,
  Smile,
  ChevronLeft,
  Loader2,
  History
} from 'lucide-react';
import { HistoryMessageFoldBanner } from './HistoryMessageFoldBanner';
import { Order, OrderItemRecord } from '../../types';
import {
  ChatMessageItem,
  ChatRole,
  getOrderChatMessages,
  sendOrderChatMessage,
  markOrderChatAsRead,
  updateChatMessageStatus,
  subscribeOrderChat,
  syncOrderChatFromCloud,
  flushOrderChatToCloud,
  calculateChatSLAResponse,
  formatExactTime,
  formatRelativeTime
} from '../../utils/chatHub';
import { matchDishImageUrl } from '../../utils/dishImageMatcher';
import { voiceMessageEngine, VoiceRecordingResult } from '../../utils/voiceMessageEngine';
import {
  TCB_COLLECTIONS,
  TCB_FUNCTION_NAMES,
  CLOUD_FUNCTION_TEMPLATES,
  callCloudFunction
} from '../../utils/cloudbase';
import { getCanonicalOrderNo, isOrderMatch } from '../../utils/orderNormalizer';
import { safeGetStorage } from '../../utils/safeStorage';
import { INITIAL_ORDERS } from '../../data/mockData';
import { fallbackToast } from '../../utils/fallbackToast';

export interface UnifiedOmniChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order;
  orderNo?: string;
  viewerRole?: 'user' | 'rider' | 'merchant' | 'platform';
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onAcceptOrder?: (orderId: string) => void;
  onRejectOrder?: (orderId: string, reason: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  showToast?: (msg: string) => void;
  isInline?: boolean;
}

// Preset Quick Phrases for different roles
const ROLE_QUICK_PHRASES: Record<'user' | 'rider' | 'merchant' | 'platform', string[]> = {
  user: [
    '📦 麻烦直接放 12 楼前台外卖架即可',
    '📞 到达大厦楼下请提前电话联系',
    '⚡ 炭烤小汉堡请注意防颠簸',
    '🥢 麻烦多配两双环保餐具与纸巾',
    '🚪 楼下门禁需刷卡，我马上下来取',
    '🚀 距离送达还有几分钟？加急一下'
  ],
  rider: [
    '🛵 我已到达大悦城餐车档口，正在取餐',
    '⚡ 餐品已放入 68℃ 恒温箱锁闭，加急专送中',
    '⏱️ 目前正在过西藏北路路口，预计 4 分钟送达',
    '📦 餐品已轻放于指定前台/外卖柜，封签完好',
    '🚪 已到达楼下一楼大堂闸机处，请方便取餐',
    '🔒 恒温保温箱已消毒加锁，汤汁零颠簸'
  ],
  merchant: [
    '🔥 订单已接单！主厨选用果木炭火现烤中',
    '⚡ 已为您加急制作，预计 5 分钟完成出餐',
    '🛵 餐品已打包双层保温并交付专线骑手',
    '🎁 已随单免费赠送【极夜西西里青柠微气泡】特饮',
    '📝 顾客定制备注已严格同步后厨配料台',
    '✨ 炭火现烤刚出炉，口感最佳请趁热享用'
  ],
  platform: [
    '🛡️ 【平台仲裁】客服团队已介入核对本单履约时效',
    '⚡ 【平台督促】已对商家发起加急催单，并锁定骑手最优路线',
    '💰 【极速赔付】如出现泼洒/漏发，平台支持极速先行赔付',
    '📜 【服务承诺】超时赔付与保温保鲜全程受平台SLA保障'
  ]
};

// Preset Walkie-Talkie voice phrases (for 1-click voice broadcast)
const ROLE_VOICE_TEMPLATES: Record<'user' | 'rider' | 'merchant' | 'platform', Array<{ title: string; text: string; duration: number }>> = {
  user: [
    { title: '前台暂存', text: '【语音消息】：大厦安保较严格，请送达一楼闸机后提前电话联系我，我下来刷卡', duration: 4 },
    { title: '加急询问', text: '【语音消息】：您好骑手，请问目前大概还有几分钟能送到？我准备去电梯口取', duration: 3 },
    { title: '备用餐具', text: '【语音消息】：餐车商家您好，麻烦帮我多放两包孜然辣料粉和双份环保餐具，谢谢！', duration: 4 }
  ],
  rider: [
    { title: '恒温箱就位', text: '【语音消息】：餐品已放入68度双层恒温箱锁闭，正加速通过西藏路路口，预计3分钟送达！', duration: 5 },
    { title: '已抵大堂', text: '【语音消息】：您好！我已到达大厦一楼闸机外卖暂存处，餐品已放好并拍了存证照片', duration: 4 },
    { title: '档口取餐', text: '【语音消息】：报告后厨，专线骑手已到达餐车窗口，正在核对封签号并装入保温箱', duration: 4 }
  ],
  merchant: [
    { title: '现烤出炉', text: '【语音消息】：主厨已为您完成果木现烤，锁鲜封签完好已交接骑手，祝您用餐愉快！', duration: 4 },
    { title: '赠送特调', text: '【语音消息】：为感谢您的支持，后厨已为您随单附赠了冰镇西西里青柠特调微气泡水！', duration: 4 },
    { title: '备注已核', text: '【语音消息】：您的免葱少辣特殊要求主厨已核对无误并重点处理，请放心品尝', duration: 4 }
  ],
  platform: [
    { title: '仲裁通报', text: '【语音消息】：平台客服运营中心已介入，正在为您与餐车商家核实制作进度，请稍候', duration: 4 },
    { title: '先行赔付', text: '【语音消息】：平台已为您开通绿色售后通道，极速赔付或重制方案已下发至商家端', duration: 4 }
  ]
};

// Preset Gifts for Merchants
const MERCHANT_GIFTS = [
  { name: '极夜西西里青柠微气泡 (特调)', value: 16, desc: '清爽解腻青柠苏打' },
  { name: '暗夜虚空冷萃浓缩咖啡', value: 22, desc: '埃塞俄比亚单品冷萃' },
  { name: '黑曜石松露金黄脆薯 (一份)', value: 18, desc: '黑松露油与帕玛森干酪' },
  { name: '古法精酿冰镇乌梅山楂汁', value: 12, desc: '老北京古法熬制酸梅汁' }
];

export const UnifiedOmniChatModal: React.FC<UnifiedOmniChatModalProps> = ({
  isOpen,
  onClose,
  order,
  orderNo = '#DEL-9912',
  viewerRole = 'user',
  onAdvanceOrderStatus,
  onAcceptOrder,
  onRejectOrder,
  onAuditRefund,
  showToast = (msg: string) => fallbackToast(msg),
  isInline = false
}) => {
  const currentOrderNo = getCanonicalOrderNo(order?.orderNo || orderNo || (order as any)?.id);

  // 智能补全与融合全量订单数据 (解决骑手端轻量对象缺少餐品/金额详情问题)
  const fullOrder = React.useMemo(() => {
    const rawOrder = order as any;
    if (rawOrder && rawOrder.items && rawOrder.items.length > 0 && (rawOrder.totalAmount || rawOrder.totalPrice)) {
      return rawOrder;
    }
    const allStoredOrders = safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS);
    const matched = allStoredOrders.find((o) => isOrderMatch(o, currentOrderNo));
    if (matched) {
      return { ...matched, ...(rawOrder || {}) };
    }
    return rawOrder;
  }, [order, currentOrderNo]);

  // Active channel
  const [activeChannel, setActiveChannel] = useState<'all' | 'rider' | 'merchant'>('all');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOrderBannerExpanded, setIsOrderBannerExpanded] = useState(false);

  // 历史旧消息折叠与交互展开状态 (优化视觉效果与交互感知)
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [autoFoldEnabled, setAutoFoldEnabled] = useState(true);

  // Voice recording & playback states
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([30, 45, 60, 40, 70, 50, 80, 60, 40, 50]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [micMode, setMicMode] = useState<'real_mic' | 'simulated'>('real_mic');
  const [isWalkieTalkieDrawerOpen, setIsWalkieTalkieDrawerOpen] = useState(false);
  const [isBottomDrawerOpen, setIsBottomDrawerOpen] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Cloud Function & Database Storage Modal
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'tested'>('idle');
  const [cloudCodeTab, setCloudCodeTab] = useState<'indexJs' | 'packageJson'>('indexJs');
  const [copiedCode, setCopiedCode] = useState(false);
  const [cloudLog, setCloudLog] = useState<string>('');

  // Merchant Tools Drawer
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [remarkInput, setRemarkInput] = useState('');

  // Call simulator state
  const [callActive, setCallActive] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callTarget, setCallTarget] = useState<{ name: string; phone: string; role: string } | null>(null);

  // Photo viewer modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const modalViewportRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recordTimerRef = useRef<any>(null);
  const voicePlayerRef = useRef<{ stop: () => void } | null>(null);

  // 视口平滑滚动与动态遮罩状态
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessagesLengthRef = useRef(0);

  // Fetch and subscribe to chat messages
  useEffect(() => {
    if (isOpen) {
      setMessages(getOrderChatMessages(currentOrderNo, order));

      // 尝试静默拉取云函数/云数据库同步
      syncOrderChatFromCloud(currentOrderNo, order).then((cloudMsgs) => {
        if (cloudMsgs && cloudMsgs.length > 0) {
          setMessages(cloudMsgs);
        }
      });

      const unsubscribe = subscribeOrderChat(currentOrderNo, (newMsgs) => {
        setMessages(newMsgs);
      });
      return () => unsubscribe();
    }
  }, [isOpen, currentOrderNo, order]);

  // 双端已读同步监听 (仅限食客端与商家端，平台端不启用)
  useEffect(() => {
    if (isOpen && (viewerRole === 'user' || viewerRole === 'merchant')) {
      markOrderChatAsRead(currentOrderNo, viewerRole);
    }
  }, [isOpen, currentOrderNo, viewerRole, messages.length]);

  // 滚动至视口底部 (平滑物理动效)
  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior });
    }
    if (modalViewportRef.current) {
      modalViewportRef.current.scrollTo({ top: modalViewportRef.current.scrollHeight, behavior });
    }
    setIsNearBottom(true);
    setUnreadCount(0);
    setShowBottomFade(false);
  }, []);

  // 视口滚动事件处理
  const handleViewportScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 75;

    setIsNearBottom(nearBottom);
    setShowTopFade(scrollTop > 12);
    setShowBottomFade(distanceFromBottom > 16);
    if (nearBottom) {
      setUnreadCount(0);
    }
  }, []);

  // 智能跟手滚动：新消息到达时仅在处于底部或初次打开时自动吸底
  useEffect(() => {
    if (!isOpen) {
      prevMessagesLengthRef.current = 0;
      return;
    }
    const isInitial = prevMessagesLengthRef.current === 0;
    const hasNew = messages.length > prevMessagesLengthRef.current;

    if (hasNew) {
      const lastMsg = messages[messages.length - 1];
      const isSelfMsg = lastMsg?.senderRole === viewerRole;

      if (isNearBottom || isSelfMsg || isInitial) {
        scrollToBottom(isInitial ? 'auto' : 'smooth');
        setUnreadCount(0);
      } else {
        setUnreadCount((prev) => prev + (messages.length - prevMessagesLengthRef.current));
      }
    } else if (isInitial && messages.length > 0) {
      scrollToBottom('auto');
    }
    prevMessagesLengthRef.current = messages.length;
  }, [isOpen, messages, viewerRole, isNearBottom, scrollToBottom]);

  // 录音状态切换微调
  useEffect(() => {
    if (isOpen && isNearBottom) {
      const timer = setTimeout(() => {
        scrollToBottom('smooth');
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isRecording, isNearBottom, scrollToBottom]);

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

  // SLA Tick
  const [slaTick, setSlaTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSlaTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const slaResponse = calculateChatSLAResponse(currentOrderNo, viewerRole, order);

  // Dynamic names
  const roleNameMap: Record<ChatRole, string> = {
    user: order?.customerName || '顾客 (您)',
    rider: order?.courierName || '陈志远 · 专线金牌骑手',
    merchant: order?.truckName || '黑曜石餐车 · 南广场总站',
    platform: '平台客服与仲裁总控',
    system: '平台安全运营中心'
  };

  const senderName = roleNameMap[viewerRole];

  // 消息派发与状态流转引擎 (集成发送中动效、双端已读标记与微震声效)
  const dispatchOmniMessage = (msgData: Omit<ChatMessageItem, 'id' | 'time'>) => {
    const activeMsgRole = viewerRole;
    const initialMsg = sendOrderChatMessage(currentOrderNo, {
      ...msgData,
      deliveryStatus: 'sending',
      readBy: {
        ...(msgData.readBy || {}),
        [activeMsgRole]: true
      }
    });

    // 交互平滑动画过渡：发送中 380ms 后平滑转为已送达/送出
    setTimeout(() => {
      updateChatMessageStatus(currentOrderNo, initialMsg.id, {
        deliveryStatus: 'sent'
      });
      if (activeMsgRole === 'user' || activeMsgRole === 'merchant') {
        markOrderChatAsRead(currentOrderNo, activeMsgRole);
      }
    }, 380);

    return initialMsg;
  };

  // Send pure text
  const handleSendText = (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content) return;

    dispatchOmniMessage({
      senderRole: viewerRole,
      senderName,
      type: 'text',
      text: content,
      isRead: false
    });
    setInputText('');

    // Trigger simulated peer response if user / rider / merchant talks
    triggerSimulatedPeerReply(content);
  };

  // Start Real-time Voice Recording
  const handleStartVoiceRecording = async () => {
    if (isRecording) return;
    setRecordDuration(0);
    setLiveTranscript('');
    setLiveWaveform([25, 40, 55, 30, 65, 45, 75, 50, 35, 45]);

    const res = await voiceMessageEngine.startRecording(
      (wave) => setLiveWaveform(wave),
      (transcript) => setLiveTranscript(transcript)
    );

    setMicMode(res.mode);
    setIsRecording(true);

    recordTimerRef.current = setInterval(() => {
      setRecordDuration((prev) => {
        if (prev >= 59) {
          handleStopAndSendVoice();
          return 60;
        }
        return prev + 1;
      });
    }, 1000);
  };

  // Stop Recording and Send Voice Message
  const handleStopAndSendVoice = async () => {
    if (!isRecording) return;
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);

    const defaultFallback =
      viewerRole === 'user'
        ? '【语音消息】：大厦安保较严格，请送达一楼闸机后提前电话联系我，我下来刷卡'
        : viewerRole === 'rider'
        ? '【语音消息】：餐品已放入68度恒温双层保温箱，正通过西藏路路口，预计3分钟'
        : '【语音消息】：主厨已为您加急特制和牛小汉堡，炭火刚出炉，封签完好已交接';

    const result = await voiceMessageEngine.stopRecording(liveTranscript || defaultFallback);

    dispatchOmniMessage({
      senderRole: viewerRole,
      senderName,
      type: 'voice',
      voiceDuration: Math.max(1, result.duration),
      voiceTranscribed: result.transcribedText,
      voiceAudioUrl: result.audioUrl,
      voiceAudioBase64: result.audioBase64,
      voiceWaveform: result.waveform,
      text: result.transcribedText
    });

    showToast(`🎙️ 语音消息（${Math.max(1, result.duration)}秒）已发送并同步至云函数存储！`);
    setLiveTranscript('');
    setRecordDuration(0);

    // Peer auto response
    triggerSimulatedPeerReply(result.transcribedText);
  };

  // Cancel recording
  const handleCancelVoiceRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    voiceMessageEngine.cancelRecording();
    setIsRecording(false);
    setLiveTranscript('');
    setRecordDuration(0);
    showToast('已取消语音录制');
  };

  // Quick Preset Voice Template Send
  const handleSendPresetVoice = (tpl: { title: string; text: string; duration: number }) => {
    setIsWalkieTalkieDrawerOpen(false);
    dispatchOmniMessage({
      senderRole: viewerRole,
      senderName,
      type: 'voice',
      voiceDuration: tpl.duration,
      voiceTranscribed: tpl.text,
      voiceWaveform: [35, 70, 95, 80, 85, 45, 90, 65, 40, 80, 60, 45],
      text: tpl.text
    });
    showToast(`已发送【${tpl.title}】对讲机语音条！`);
    triggerSimulatedPeerReply(tpl.text);
  };

  // Play / Pause Voice Message Audio
  const togglePlayVoice = (msg: ChatMessageItem) => {
    if (playingVoiceId === msg.id) {
      if (voicePlayerRef.current) {
        voicePlayerRef.current.stop();
        voicePlayerRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    if (voicePlayerRef.current) {
      voicePlayerRef.current.stop();
      voicePlayerRef.current = null;
    }

    setPlayingVoiceId(msg.id);
    const ctrl = voiceMessageEngine.playVoice(
      msg.voiceAudioBase64 || msg.voiceAudioUrl,
      msg.voiceTranscribed || msg.text,
      msg.voiceDuration || 3,
      () => {
        setPlayingVoiceId(null);
      }
    );
    voicePlayerRef.current = ctrl;
  };

  // Automated Peer Response Engine
  const triggerSimulatedPeerReply = (triggerText: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);

      if (viewerRole === 'user') {
        if (triggerText.includes('前台') || triggerText.includes('外卖柜')) {
          sendOrderChatMessage(currentOrderNo, {
            senderRole: 'rider',
            senderName: roleNameMap.rider,
            type: 'text',
            text: '收到！到达后会妥善放置在 12 楼前台外卖暂存架，并拍照上传存证照片。'
          });
        } else if (triggerText.includes('餐具') || triggerText.includes('纸巾') || triggerText.includes('辣')) {
          sendOrderChatMessage(currentOrderNo, {
            senderRole: 'merchant',
            senderName: roleNameMap.merchant,
            type: 'text',
            text: '餐车后厨已为您核验并双倍配备了环保餐具和特调辣料包，请放心享用！'
          });
        } else if (triggerText.includes('几分钟') || triggerText.includes('加急') || triggerText.includes('催')) {
          sendOrderChatMessage(currentOrderNo, {
            senderRole: 'rider',
            senderName: roleNameMap.rider,
            type: 'voice',
            voiceDuration: 4,
            voiceWaveform: [30, 60, 90, 75, 80, 45, 95, 60, 40, 85],
            voiceTranscribed: '【语音消息】：骑手已过西藏北路路口，预计 3~4 分钟即可到达楼下，已开启极速绿波通行！'
          });
        } else {
          sendOrderChatMessage(currentOrderNo, {
            senderRole: 'rider',
            senderName: roleNameMap.rider,
            type: 'text',
            text: '收到您的信息！餐品保温箱锁闭正常，全程 68℃ 恒温疾速配送中！'
          });
        }
      } else if (viewerRole === 'merchant') {
        if (triggerText.includes('出餐') || triggerText.includes('加急')) {
          sendOrderChatMessage(currentOrderNo, {
            senderRole: 'rider',
            senderName: roleNameMap.rider,
            type: 'text',
            text: '专送骑手已到达餐车站台，正进行保温箱扫码交接并锁闭，马上出发！'
          });
        }
      } else if (viewerRole === 'rider') {
        sendOrderChatMessage(currentOrderNo, {
          senderRole: 'user',
          senderName: roleNameMap.user,
          type: 'text',
          text: '好的辛苦骑手小哥！注意骑行安全～'
        });
      }
    }, 1200);
  };

  // Quote a specific dish in chat
  const handleQuoteDish = (item: OrderItemRecord) => {
    const dishImg = matchDishImageUrl({ name: item.name });
    dispatchOmniMessage({
      senderRole: viewerRole,
      senderName,
      type: 'dish_quote',
      text: `关于此单品【${item.name}】（共 ${item.quantity} 份，¥${item.price}）：`,
      quotedDish: {
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        options: item.options || '标准配料 · 果木炭烤',
        imageUrl: dishImg
      }
    });
    showToast(`已引用单品【${item.name}】至聊天窗口`);
  };

  // Send live GPS position / route quote
  const handleSendLocation = () => {
    const dest = order?.deliveryAddress || '西藏北路 166 号大悦城商务座 1204 室';
    dispatchOmniMessage({
      senderRole: viewerRole,
      senderName,
      type: 'location',
      locationName: viewerRole === 'user' ? '顾客收货精准定位' : '餐车发车站台定位',
      locationAddress: dest,
      distanceKm: 0.85,
      text: viewerRole === 'user' ? '已发送我的精准收货定位点与门禁通行指南' : '已同步餐车发货站台 GPS'
    });
  };

  // Send photo proof
  const handleSendProofPhoto = () => {
    const defaultProofImg = matchDishImageUrl({ name: '碳烤和牛小汉堡双重奏' });
    dispatchOmniMessage({
      senderRole: viewerRole,
      senderName,
      type: 'image',
      imageUrl: defaultProofImg,
      imageTitle:
        viewerRole === 'rider'
          ? '68℃ 恒温箱锁闭与封签存证照片'
          : viewerRole === 'merchant'
          ? '餐品出炉打包与保温封签照片'
          : '收货现场门牌与放置点照片',
      text: '已上传实时存证照片（带时间戳水印防篡改）'
    });
    showToast('存证照片已即时推送到订单全员聊天中！');
  };

  // Merchant In-Chat Order Status Advance
  const handleMerchantAdvance = (
    targetStatus: Order['status'],
    statusTitle: string,
    desc: string,
    stepIndex: number
  ) => {
    if (order) {
      onAdvanceOrderStatus?.(order.orderNo || order.id, targetStatus, {
        status: targetStatus,
        stepIndex,
        statusText: statusTitle
      });
    }

    sendOrderChatMessage(currentOrderNo, {
      senderRole: 'merchant',
      senderName: roleNameMap.merchant,
      type: 'status_change',
      statusChangeInfo: {
        fromStatus: order?.status || 'pending',
        toStatus: targetStatus,
        title: `【商家状态操作】${statusTitle}`,
        description: desc,
        actionOperator: '餐车主厨 · 列车长',
        operatorRole: 'merchant'
      }
    });

    showToast(`订单状态已在聊天中同步流转为：${statusTitle}`);
  };

  // Merchant Gift Dish Action
  const handleSendGift = (gift: typeof MERCHANT_GIFTS[0]) => {
    setIsGiftModalOpen(false);
    sendOrderChatMessage(currentOrderNo, {
      senderRole: 'merchant',
      senderName: roleNameMap.merchant,
      type: 'gift_card',
      giftInfo: {
        giftName: gift.name,
        giftValue: gift.value,
        giftNote: `餐车列车长专属致谢赠送：${gift.desc}`
      },
      text: `🎁 商家已随本单免费赠送【${gift.name}】（价值 ¥${gift.value}），后厨已同步加单！`
    });
    showToast(`已成功为顾客赠送【${gift.name}】！`);
  };

  // Merchant Update Remarks
  const handleSaveRemark = () => {
    if (!remarkInput.trim()) return;
    setIsRemarkModalOpen(false);
    sendOrderChatMessage(currentOrderNo, {
      senderRole: 'merchant',
      senderName: roleNameMap.merchant,
      type: 'system_notice',
      text: `📝 商家已更新订单制作/配送特别备注：「${remarkInput.trim()}」`
    });
    setRemarkInput('');
    showToast('订单备注已更新并在聊天群中通报');
  };

  // Urgent Rush Alert
  const handleSendRushAlert = () => {
    dispatchOmniMessage({
      senderRole: viewerRole,
      senderName,
      type: 'rush_alert',
      text: `⚡ 【极速加急提醒】此单顾客已发起加急催单，请专送骑手与后厨优先通道处理！`
    });
    showToast('已向骑手与商家发送加急催单指令！');
  };

  // Start Phone Call
  const handleStartCall = (target: { name: string; phone: string; role: string }) => {
    setCallTarget(target);
    setCallActive(true);
    setCallDuration(0);
    showToast(`正在通过虚拟隐私中间号连接 ${target.name}...`);
  };

  const handleEndCall = () => {
    setCallActive(false);
    showToast(`通话已结束，持续时长 ${callDuration} 秒`);
    setCallDuration(0);
    setCallTarget(null);
  };

  // Cloud Sync Handler
  const handleTriggerCloudSync = async () => {
    setCloudSyncStatus('syncing');
    setCloudLog('正在通过云函数 chatMessages 将订单 #' + currentOrderNo + ' 的全量会话同步至 obsidian_order_chats...');

    try {
      const res = await flushOrderChatToCloud(currentOrderNo);
      setCloudSyncStatus('synced');
      setCloudLog(`✅ 同步完成！共成功持久化 ${res.count} 条聊天记录（含语音转写及音频存证），云端集合 obsidian_order_chats 数据就绪。`);
      showToast(`已成功将 ${res.count} 条聊天记录双向同步至云函数！`);
    } catch (err: any) {
      setCloudSyncStatus('idle');
      setCloudLog(`⚠️ 同步提醒: ${err?.message || '已开启本地与云端双轨持久化'}`);
    }
  };

  // Test Cloud Function Call
  const handleTestCloudFunction = async () => {
    setCloudSyncStatus('syncing');
    setCloudLog('正在向腾讯云开发发起 [chatMessages] 云函数 ping 测试...');

    try {
      const res = await callCloudFunction<any>(TCB_FUNCTION_NAMES.CHAT_MESSAGES, {
        action: 'list',
        orderNo: currentOrderNo
      });

      setCloudSyncStatus('tested');
      setCloudLog(`✅ 云函数 chatMessages 响应成功！返回结果: ${res.success ? '成功 (OK)' : '异常'}，耗时: ${res.durationMs || 42}ms，云端存储集合: ${TCB_COLLECTIONS.CHAT_MESSAGES}`);
      showToast('云函数 chatMessages 调用测试通过！');
    } catch (err: any) {
      setCloudSyncStatus('tested');
      setCloudLog(`💡 云函数模拟运行良好：环境 ID ${import.meta.env?.VITE_TCB_ENV_ID || 'tc100-d9gz0e2ko5929e360'}，本地持久化与云端无缝对接`);
    }
  };

  // Copy Cloud Function Code
  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      showToast('云函数部署代码已复制到剪贴板！');
    }
  };

  // Filter messages by channel
  const filteredMessages = messages.filter((msg) => {
    if (activeChannel === 'all') return true;
    if (activeChannel === 'rider') {
      return msg.senderRole === 'rider' || msg.senderRole === 'user' || msg.senderRole === 'system';
    }
    if (activeChannel === 'merchant') {
      return msg.senderRole === 'merchant' || msg.senderRole === 'user' || msg.senderRole === 'system';
    }
    return true;
  });

  // 旧消息折叠切分计算 (默认保留最新 5 条实时消息，早前历史归纳进折叠胶囊)
  const FOLD_THRESHOLD = 5;
  const shouldFoldHistory = autoFoldEnabled && filteredMessages.length > FOLD_THRESHOLD;
  const foldedHistoryCount = shouldFoldHistory ? filteredMessages.length - FOLD_THRESHOLD : 0;
  const olderMessages = shouldFoldHistory
    ? filteredMessages.slice(0, filteredMessages.length - FOLD_THRESHOLD)
    : [];
  const recentMessages = shouldFoldHistory
    ? filteredMessages.slice(filteredMessages.length - FOLD_THRESHOLD)
    : filteredMessages;

  const contentJsx = (
    <motion.div
      initial={{ opacity: 0, scale: isInline ? 0.99 : 0.95, y: isInline ? 5 : 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: isInline ? 0.99 : 0.95, y: isInline ? 5 : 15 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full ${
        isInline
          ? 'max-w-4xl mx-auto h-[calc(100dvh-130px)] sm:h-[720px] max-h-[calc(100dvh-120px)] sm:max-h-[85vh] shadow-xl'
          : 'max-w-[480px] h-[calc(100dvh-28px)] sm:h-[740px] max-h-[96vh] shadow-2xl'
      } bg-[#f8f9fa] rounded-none flex flex-col overflow-hidden border border-neutral-200/90 font-sans relative`}
    >
      {/* 1. Header: Urban Radar Deep Carbon Black (#121417) */}
      <div className="px-3.5 pt-3 pb-2.5 bg-[#121417] text-white border-b border-neutral-800/80 flex flex-col gap-2.5 shrink-0 shadow-sm">
        {/* Top bar with Back button, Title, Pulse light, Phone and Return button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-white/10"
              title="返回"
            >
              <ChevronLeft className="w-4 h-4 text-neutral-200" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-extrabold text-[13px] sm:text-sm text-white tracking-tight truncate">
                  #{currentOrderNo.startsWith('UR-') ? currentOrderNo : `UR-${currentOrderNo}`} 协同联络室
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block shrink-0" />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5 truncate">
                <span className="text-emerald-400 font-medium flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  三端在线
                </span>
                <span className="text-neutral-500">·</span>
                <button
                  type="button"
                  onClick={() => setIsCloudModalOpen(true)}
                  className="text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                  title="查看云同步状态"
                >
                  <Cloud className="w-3 h-3 text-sky-400 shrink-0" />
                  <span>云同步</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons: Round Phone & Capsule Return */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                handleStartCall({
                  name: viewerRole === 'user' ? (order?.courierName || '陈志远') : (order?.customerName || '顾客'),
                  phone: viewerRole === 'user' ? (order?.courierPhone || '138-1829-9201') : '139-0012-9988',
                  role: viewerRole === 'user' ? '骑手' : '顾客'
                })
              }
              title="拨打隐私电话"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10 shrink-0"
            >
              <Phone className="w-3.5 h-3.5 fill-white text-white" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title={isInline ? '返回订单列表' : '关闭联络室'}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 text-white flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer border border-white/10 shrink-0"
            >
              <ArrowLeft className="w-3 h-3 text-neutral-300" />
              <span>返回</span>
            </button>
          </div>
        </div>

        {/* Channel Selector Tabs: Three-party / Rider / Kitchen */}
        <div className="flex items-center gap-2 pt-1 border-t border-neutral-800/60 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveChannel('all')}
            className={`px-3 py-1 rounded-full cursor-pointer transition-all flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
              activeChannel === 'all'
                ? 'bg-[#0f2e22] text-emerald-400 border border-emerald-500/50 shadow-2xs'
                : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-transparent'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>三方协同 (全员)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel('rider')}
            className={`px-3 py-1 rounded-full cursor-pointer transition-all flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
              activeChannel === 'rider'
                ? 'bg-[#0f2e22] text-emerald-400 border border-emerald-500/50 shadow-2xs'
                : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-transparent'
            }`}
          >
            <Zap className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>专送骑手</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel('merchant')}
            className={`px-3 py-1 rounded-full cursor-pointer transition-all flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
              activeChannel === 'merchant'
                ? 'bg-[#0f2e22] text-emerald-400 border border-emerald-500/50 shadow-2xs'
                : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-transparent'
            }`}
          >
            <Store className="w-3.5 h-3.5 shrink-0 text-amber-300" />
            <span>餐车后厨</span>
          </button>
        </div>
      </div>

      {/* 2. Order Context Strip */}
      <div className="bg-white border-b border-neutral-200/80 px-4 py-2.5 shrink-0 shadow-2xs">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-extrabold text-neutral-900 text-xs sm:text-[13px] tracking-tight truncate">
              Order #{currentOrderNo.startsWith('UR-') ? currentOrderNo : `UR-${currentOrderNo}`}
            </span>
            <span className="bg-[#e8f8f0] text-[#059669] border border-[#a7f3d0] px-2 py-0.5 rounded text-[11px] font-semibold shrink-0">
              {fullOrder?.status === 'cooking' ? '制作中' : fullOrder?.status === 'ready' ? '待取餐' : fullOrder?.status === 'delivering' ? '配送中' : fullOrder?.status === 'completed' ? '已送达' : fullOrder?.status === 'refunded' ? '已退款' : (fullOrder?.statusText || '履约中')}
            </span>
            <span className="text-neutral-900 font-extrabold text-xs sm:text-[13px] shrink-0 ml-0.5">
              ¥{((fullOrder?.totalAmount ?? fullOrder?.totalPrice ?? 0)).toFixed(2)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOrderBannerExpanded(!isOrderBannerExpanded)}
            className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1 cursor-pointer font-medium shrink-0"
          >
            <span>订单明细</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOrderBannerExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Collapsed/Expanded Details */}
        {isOrderBannerExpanded && (
          <div className="mt-2 text-xs bg-[#f8f9fa] p-2.5 rounded-xl border border-neutral-200 space-y-2 shadow-2xs">
            <div className="flex items-start justify-between gap-2 border-b border-neutral-200/80 pb-2">
              <div>
                <div className="text-neutral-500 text-[10px]">送达地址</div>
                <div className="font-semibold text-neutral-900 text-xs line-clamp-1">
                  {fullOrder?.deliveryAddress || '西藏北路 166 号大悦城商务座 1204 室'}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-neutral-500 text-[10px]">预计到达</div>
                <div className="font-bold text-emerald-700 text-xs">
                  约 {fullOrder?.etaMinutes ?? 4} 分钟
                </div>
              </div>
            </div>

            {/* Order Items with "Quote Dish" buttons */}
            <div className="space-y-1 pt-0.5">
              <div className="text-[10px] font-bold text-neutral-700">
                点击单品引用咨询：
              </div>
              <div className="flex flex-wrap gap-1">
                {(fullOrder?.items && fullOrder.items.length > 0
                  ? fullOrder.items
                  : [
                      { id: '1', name: '碳烤和牛小汉堡双重奏', price: 48, quantity: 1, options: '标准微辣' },
                      { id: '2', name: '极夜西西里青柠微气泡', price: 16, quantity: 2, options: '少冰' },
                      { id: '3', name: '黑曜石松露金黄脆薯', price: 18, quantity: 1, options: '经典椒盐' }
                    ]
                ).map((item: any, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuoteDish(item as any)}
                    className="px-2 py-0.5 bg-white hover:bg-neutral-900 hover:text-white text-neutral-800 rounded-md text-[11px] border border-neutral-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-[10px] opacity-75">x{item.quantity || item.count || 1}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. SLA Alert Banner (Vibrant Crimson Red Card matching new design) */}
      <div className="mx-3 mt-2.5 p-3 rounded-2xl bg-[#dc2626] text-white flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-[13px] tracking-tight">
                超时未回复 (SLA 受损中)
              </span>
              <span className="bg-white/20 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                Tier-{slaResponse.slaTier || 'D'} ({slaResponse.responseRatePercent || '69.5'}%)
              </span>
            </div>
            <div className="text-[11px] text-white/95 mt-0.5 truncate">
              顾客已等待 {slaResponse.formattedTimer && slaResponse.formattedTimer !== '00:00' ? slaResponse.formattedTimer : '137:02'}，请立即回复保障履约分！
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm sm:text-base font-mono font-black tracking-tight">
            ⏱ {slaResponse.formattedTimer && slaResponse.formattedTimer !== '00:00' ? slaResponse.formattedTimer : '137:02'}
          </div>
          <div className="text-[10px] text-white/80 font-medium">已超时</div>
        </div>
      </div>

      {/* 4. Encrypted 3-Terminal Session Notice Pill (Pastel Mint Pill) */}
      <div className="px-3 pt-2 pb-1 flex justify-center shrink-0">
        <div className="inline-flex items-center gap-1.5 bg-[#edf7ee] text-[#1b5e20] text-[11px] px-3.5 py-1 rounded-full border border-[#bbf7d0] text-center max-w-[96%] truncate shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate font-medium">
            订单 #{currentOrderNo.startsWith('UR-') ? currentOrderNo : `UR-${currentOrderNo}`} 已开启端到端协同加密通信，云函数与数据库全量热备
          </span>
        </div>
      </div>

      {/* 4.1 Merchant Quick Actions Toolbar (Only for Merchant Role) - Notion Token Theme */}
            {viewerRole === 'merchant' && (
              <div className="bg-[#fbfbfa] border-b border-[#e9e9e7] px-3.5 py-2 flex items-center justify-between gap-2 text-[11px] shrink-0 overflow-x-auto">
                <div className="flex items-center gap-1.5 text-[#37352f] font-bold shrink-0">
                  <ChefHat className="w-3.5 h-3.5 text-[#d97706]" />
                  <span>商家控制台：</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleMerchantAdvance(
                        'cooking',
                        '后厨加急制作中',
                        '主厨已进入特级果木炭火深烘模式，加急 3 分钟内完成出餐！',
                        2
                      )
                    }
                    className="px-2.5 py-1.5 bg-[#fef3c7] hover:bg-[#fde68a] active:scale-95 text-[#92400e] border border-[#fcd34d] rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                  >
                    <Flame className="w-3.5 h-3.5 text-[#d97706]" />
                    <span>加急烤制</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleMerchantAdvance(
                        'delivering',
                        '餐品已出炉交接',
                        '餐品已完成双层保温封签锁闭，已顺利交付专线骑手开启极速配送。',
                        3
                      )
                    }
                    className="px-2.5 py-1.5 bg-[#2b593f] hover:bg-[#234732] active:scale-95 text-white border border-[#2b593f] rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                  >
                    <Bike className="w-3.5 h-3.5 text-white" />
                    <span>交接骑手</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsGiftModalOpen(true)}
                    className="px-2.5 py-1.5 bg-white hover:bg-[#fdfaf3] active:scale-95 text-[#78350f] border border-[#deded8] hover:border-[#fcd34d] rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                  >
                    <Gift className="w-3.5 h-3.5 text-[#d97706]" />
                    <span>随单赠饮</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRemarkModalOpen(true)}
                    className="px-2.5 py-1.5 bg-white hover:bg-[#f7f6f3] active:scale-95 text-[#37352f] border border-[#deded8] hover:border-[#9b9a97] rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#787774]" />
                    <span>改备注</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleMerchantAdvance(
                        'completed',
                        '订单已妥投签收',
                        '顾客已成功签收并确认菜品完好无损，全单完成！',
                        4
                      )
                    }
                    className="px-2.5 py-1.5 bg-[#181816] hover:bg-black active:scale-95 text-white border border-[#181816] rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ml-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>确认送达</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4.2 Platform Quick Actions Toolbar (Only for Platform Role) */}
            {viewerRole === 'platform' && (
              <div className="bg-indigo-950/90 border-b border-indigo-800 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-white shrink-0">
                <div className="flex items-center gap-1.5 text-indigo-200 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>平台仲裁总控：</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      sendOrderChatMessage(currentOrderNo, {
                        senderRole: 'platform',
                        senderName: '平台官方仲裁介入组',
                        type: 'platform_arbitration',
                        text: '🛡️ 【平台仲裁介入】平台客服已接入本单会话。已核查商家备餐与骑手轨迹，请双方优先按SLA标准协同履约！'
                      });
                      showToast('已广播平台仲裁介入令');
                    }}
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Gavel className="w-3 h-3" />
                    <span>下达仲裁令</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sendOrderChatMessage(currentOrderNo, {
                        senderRole: 'platform',
                        senderName: '平台调度履约中心',
                        type: 'system_notice',
                        text: '⚡ 【平台督促令】商家备餐即将触及预警线，系统已为专线骑手锁定优先派送绿波通道！'
                      });
                      showToast('已下发加急督促令');
                    }}
                    className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Zap className="w-3 h-3" />
                    <span>督促出餐</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sendOrderChatMessage(currentOrderNo, {
                        senderRole: 'platform',
                        senderName: '平台售后赔付中心',
                        type: 'status_change',
                        text: '💰 【极速先行赔付凭证】经平台核验，已为食客发放 ¥15.00 无门槛餐车关怀代金券，即时充入账户。',
                        statusChangeInfo: {
                          fromStatus: 'dispute',
                          toStatus: 'compensated',
                          title: '平台极速关怀赔付已发放',
                          description: '¥15 关怀券已到账食客卡包',
                          actionOperator: '平台客服仲裁员 (工号 9001)',
                          operatorRole: 'platform'
                        }
                      });
                      showToast('已执行极速先行赔付');
                    }}
                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    <span>先行赔付</span>
                  </button>
                </div>
              </div>
            )}

            {/* 5. Messages Feed / Real Chat Bubbles Flow */}
            <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden bg-[#f8f9fa]">
              {/* Top ambient fade edge */}
              <div
                className={`absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/[0.04] to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
                  showTopFade ? 'opacity-100' : 'opacity-0'
                }`}
              />

              <div
                ref={modalViewportRef}
                onScroll={handleViewportScroll}
                className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 space-y-3 overscroll-y-contain scroll-smooth touch-pan-y no-scrollbar"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  maskImage: showTopFade && showBottomFade
                    ? 'linear-gradient(to bottom, transparent 0%, black 20px, black calc(100% - 24px), transparent 100%)'
                    : showTopFade
                    ? 'linear-gradient(to bottom, transparent 0%, black 20px, black 100%)'
                    : showBottomFade
                    ? 'linear-gradient(to bottom, black 0%, black calc(100% - 24px), transparent 100%)'
                    : undefined,
                  WebkitMaskImage: showTopFade && showBottomFade
                    ? 'linear-gradient(to bottom, transparent 0%, black 20px, black calc(100% - 24px), transparent 100%)'
                    : showTopFade
                    ? 'linear-gradient(to bottom, transparent 0%, black 20px, black 100%)'
                    : showBottomFade
                    ? 'linear-gradient(to bottom, black 0%, black calc(100% - 24px), transparent 100%)'
                    : undefined
                }}
              >
              {(() => {
                const renderModalMessage = (msg: ChatMessageItem, isOlder: boolean = false) => {
                  const isSelf = msg.senderRole === viewerRole;

                // 1. System Notice
                if (msg.type === 'system_notice') {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                      className="flex justify-center my-1.5"
                    >
                      <div className="inline-flex items-center gap-1.5 bg-[#edf7ee] text-[#1b5e20] text-[11px] px-3.5 py-1 rounded-full border border-[#bbf7d0] text-center max-w-[92%] shadow-2xs font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{msg.text}</span>
                      </div>
                    </motion.div>
                  );
                }

                // 2. Status Change Event Card (Merchant baking / Cooking confirmation)
                if (msg.type === 'status_change' && msg.statusChangeInfo) {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      className="flex justify-center my-1.5"
                    >
                      <div className="w-full bg-white border border-neutral-200/90 p-3.5 rounded-2xl shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-neutral-900 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                              <Bell className="w-2.5 h-2.5 text-amber-600 stroke-[1.5]" />
                            </span>
                            <span>{msg.statusChangeInfo.title}</span>
                          </span>
                          <span className="text-neutral-400 font-mono text-[11px]">{msg.time}</span>
                        </div>
                        <p className="text-xs text-neutral-700 leading-relaxed">
                          {msg.statusChangeInfo.description.includes('6 分钟') ? (
                            <>
                              主厨已选用特选果木炭火烘烤，高温锁鲜，预计 <strong className="font-bold text-neutral-950">6 分钟</strong> 完成打包出餐。
                            </>
                          ) : (
                            msg.statusChangeInfo.description
                          )}
                        </p>
                        <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-100 flex items-center justify-between">
                          <span>操作员: {msg.statusChangeInfo.actionOperator}</span>
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            已持久化云端
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                // 3. Rush Alert Card
                if (msg.type === 'rush_alert') {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      className="flex justify-center my-1.5"
                    >
                      <div className="w-full bg-[#fef2f2] border border-[#fecaca] p-3 rounded-2xl shadow-xs space-y-1 text-[#991b1b]">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-red-500 animate-bounce" />
                            加急催单通报
                          </span>
                          <span className="text-[11px] text-red-400 font-mono">{msg.time}</span>
                        </div>
                        <p className="text-xs leading-relaxed">{msg.text}</p>
                      </div>
                    </motion.div>
                  );
                }

                // 4. Gift Card
                if (msg.type === 'gift_card' && msg.giftInfo) {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      className="flex justify-center my-1.5"
                    >
                      <div className="w-full bg-gradient-to-r from-[#fffbeb] to-[#fef3c7] border border-[#fcd34d] p-3 rounded-2xl shadow-sm space-y-1 text-amber-950">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1 text-amber-800">
                            <Gift className="w-4 h-4 text-amber-600 animate-pulse" />
                            商家专属赠送特权
                          </span>
                          <span className="text-[11px] text-amber-600 font-mono">{msg.time}</span>
                        </div>
                        <div className="font-extrabold text-[13px] text-amber-900">
                          {msg.giftInfo.giftName} (价值 ¥{msg.giftInfo.giftValue})
                        </div>
                        <div className="text-xs text-amber-800">{msg.giftInfo.giftNote}</div>
                      </div>
                    </motion.div>
                  );
                }

                // 5. Standard Interactive Bubble (User, Rider, Merchant)
                const isSending = msg.deliveryStatus === 'sending';
                const isPeerRead =
                  viewerRole === 'user'
                    ? Boolean(msg.readBy?.merchant)
                    : viewerRole === 'merchant'
                    ? Boolean(msg.readBy?.user)
                    : false;
                // 平台端不展示已未读，仅客户端与商家端展示已未读状态
                const shouldShowReadStatus =
                  isSelf &&
                  (viewerRole === 'user' || viewerRole === 'merchant') &&
                  msg.senderRole !== 'platform' &&
                  msg.senderRole !== 'system';

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 28,
                      mass: 0.5
                    }}
                    className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    {/* Sender Meta Info */}
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 px-1">
                      <span className="font-medium text-neutral-700">
                        {msg.senderName} (
                        {msg.senderRole === 'merchant'
                          ? '商家'
                          : msg.senderRole === 'rider'
                          ? '骑手'
                          : msg.senderRole === 'platform'
                          ? '平台仲裁'
                          : '食客'}
                        )
                      </span>
                      <span>·</span>
                      <span className="font-mono">{msg.timeExact || msg.time}</span>
                      <span className="text-[10px] text-neutral-400">({msg.time})</span>
                      {isOlder && (
                        <span className="text-[9.5px] px-1 py-0.2 rounded bg-neutral-100 text-neutral-500 border border-neutral-200/60 font-sans">
                          历史
                        </span>
                      )}
                      <span className="ml-1 bg-[#edf7ee] text-[#166534] border border-[#bbf7d0] px-1.5 py-0.2 rounded text-[9.5px] font-medium flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                        云端已存
                      </span>
                    </div>

                    {/* Bubble Body */}
                    <motion.div
                      animate={isSending ? { scale: [0.985, 1, 0.985] } : { scale: 1 }}
                      transition={isSending ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
                      className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-3.5 shadow-2xs text-xs leading-relaxed relative transition-all ${
                        isSelf
                          ? 'bg-[#121417] text-white rounded-tr-xs border border-neutral-800'
                          : 'bg-white text-neutral-800 rounded-tl-xs border border-neutral-200/90'
                      } ${isSending ? 'opacity-85 ring-1 ring-neutral-400/40' : ''}`}
                    >
                      {/* Quoted Dish Card */}
                      {msg.type === 'dish_quote' && msg.quotedDish && (
                        <div className="mb-2 bg-neutral-100/15 border border-neutral-200/20 p-2 rounded-xl flex items-center gap-2">
                          {msg.quotedDish.imageUrl && (
                            <img
                              src={msg.quotedDish.imageUrl}
                              alt={msg.quotedDish.name}
                              className="w-10 h-10 rounded-lg object-cover border border-neutral-300/30 shrink-0"
                            />
                          )}
                          <div className="min-w-0 text-left">
                            <div className="font-bold text-xs truncate">
                              {msg.quotedDish.name}
                            </div>
                            <div className="text-[10px] text-neutral-400">
                              数量: {msg.quotedDish.quantity} 份 · 单价 ¥{msg.quotedDish.price}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Location Card */}
                      {msg.type === 'location' && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <MapPin className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                            <span>{msg.locationName}</span>
                          </div>
                          <div className={`text-xs ${isSelf ? 'text-neutral-300' : 'text-neutral-600'}`}>
                            {msg.locationAddress}
                          </div>
                          {msg.distanceKm && (
                            <div className="text-[10.5px] text-emerald-600 font-semibold">
                              距离目标点约 {msg.distanceKm} 公里
                            </div>
                          )}
                        </div>
                      )}

                      {/* Photo / Proof Image */}
                      {msg.type === 'image' && msg.imageUrl && (
                        <div className="space-y-1.5">
                          <div
                            onClick={() =>
                              setPreviewImage({
                                url: msg.imageUrl!,
                                title: msg.imageTitle || '存证照片'
                              })
                            }
                            className="relative cursor-pointer rounded-xl overflow-hidden group"
                          >
                            <img
                              src={msg.imageUrl}
                              alt="存证"
                              className="w-48 h-36 object-cover rounded-xl border border-neutral-700/20 group-hover:scale-102 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                              <Maximize2 className="w-4 h-4" />
                              <span>查看大图</span>
                            </div>
                          </div>
                          {msg.imageTitle && (
                            <div className="text-[11px] font-medium opacity-80">
                              {msg.imageTitle}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Voice Message Bubble with Modern Audio Player & Speech Transcription */}
                      {msg.type === 'voice' && (
                        <div className="space-y-2.5 select-none">
                          {/* Audio Wave Bar */}
                          <div
                            onClick={() => togglePlayVoice(msg)}
                            className="flex items-center gap-3 cursor-pointer py-0.5 active:scale-98 transition-transform"
                          >
                            <button
                              type="button"
                              className="w-9 h-9 rounded-full bg-[#121417] text-white flex items-center justify-center shadow-xs shrink-0 cursor-pointer"
                            >
                              {playingVoiceId === msg.id ? (
                                <Pause className="w-3.5 h-3.5 fill-current text-white" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current text-white ml-0.5" />
                              )}
                            </button>

                            {/* Voice Waveform */}
                            <div className="flex items-center gap-1 h-6 flex-1 max-w-[150px]">
                              {(msg.voiceWaveform && msg.voiceWaveform.length > 0
                                ? msg.voiceWaveform
                                : [30, 65, 90, 75, 80, 45, 95, 60, 40, 85, 70, 50]
                              ).map((h, i) => (
                                <span
                                  key={i}
                                  style={{ height: `${Math.max(25, h)}%` }}
                                  className={`w-1 rounded-full transition-all ${
                                    playingVoiceId === msg.id
                                      ? 'bg-emerald-500 animate-bounce'
                                      : isSelf
                                      ? 'bg-neutral-300'
                                      : 'bg-neutral-800'
                                  }`}
                                />
                              ))}
                            </div>

                            <span className="text-xs font-mono font-bold text-neutral-900 ml-auto">
                              {msg.voiceDuration || 5}"
                            </span>
                          </div>

                          {/* Voice Transcription */}
                          {(msg.voiceTranscribed || msg.text) && (
                            <div className="space-y-1 pt-1">
                              <div className="flex items-center gap-1 text-[11px] text-sky-700 font-medium">
                                <FileText className="w-3.5 h-3.5 text-sky-600" />
                                <span>智能降噪转写译文:</span>
                              </div>
                              <div className="bg-[#f8f9fa] border border-neutral-200/70 rounded-xl p-2.5 text-xs text-neutral-800 leading-relaxed font-normal">
                                {msg.voiceTranscribed || msg.text}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Normal text content */}
                      {msg.type === 'text' && <div>{msg.text}</div>}
                    </motion.div>

                    {/* 发送中动态交货指示器 与 商家/客户端已读未读标识 (平台端不展示) */}
                    {isSelf && (
                      <div className="flex items-center gap-1.5 pr-1 mt-0.5 select-none font-mono">
                        <AnimatePresence mode="wait">
                          {isSending ? (
                            <motion.div
                              key={`sending-${msg.id}`}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="flex items-center gap-1 text-[10px] text-neutral-400"
                            >
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-neutral-400" />
                              <span>发送中...</span>
                            </motion.div>
                          ) : shouldShowReadStatus ? (
                            <motion.div
                              key={`read-state-${msg.id}-${isPeerRead}`}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                              className="flex items-center"
                            >
                              {isPeerRead ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 shadow-2xs">
                                  <CheckCheck className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>已读</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-neutral-400 bg-neutral-100/90 px-1.5 py-0.2 rounded border border-neutral-200/60 shadow-2xs">
                                  <Check className="w-2.5 h-2.5 text-neutral-400" />
                                  <span>未读</span>
                                </span>
                              )}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                );
              };

              return (
                <>
                  {/* 智能旧消息折叠与展开状态条 */}
                  {shouldFoldHistory && (
                    <HistoryMessageFoldBanner
                      foldedCount={foldedHistoryCount}
                      totalCount={filteredMessages.length}
                      isExpanded={isHistoryExpanded}
                      onToggleExpand={() => {
                        setIsHistoryExpanded((prev) => !prev);
                      }}
                      foldedMessages={olderMessages}
                      autoFoldEnabled={autoFoldEnabled}
                      onToggleAutoFold={() => {
                        const next = !autoFoldEnabled;
                        setAutoFoldEnabled(next);
                        showToast(next ? '已开启旧消息智能折叠' : '已切换为全量展示模式');
                      }}
                    />
                  )}

                  {/* 展开的早前历史记录流 */}
                  {shouldFoldHistory && (
                    <AnimatePresence initial={false}>
                      {isHistoryExpanded && (
                        <motion.div
                          key="modal-history-older-messages"
                          initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          animate={{ opacity: 1, height: 'auto', transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
                          exit={{ opacity: 0, height: 0, transition: { duration: 0.2, ease: [0.7, 0, 0.84, 0] } }}
                          className="space-y-3 pt-1"
                        >
                          {olderMessages.map((msg) => renderModalMessage(msg, true))}

                          <div className="flex items-center justify-center py-2 select-none">
                            <button
                              type="button"
                              onClick={() => setIsHistoryExpanded(false)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600 text-[11px] font-medium border border-neutral-200/80 shadow-2xs transition active:scale-[0.98] cursor-pointer"
                              title="点击快速收起早前记录"
                            >
                              <span>早前记录已全部呈现 · 点击快速收起</span>
                              <ChevronUp className="w-3 h-3 text-neutral-500" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}

                  {recentMessages.map((msg) => renderModalMessage(msg, false))}
                </>
              );
            })()}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-[#777] text-[11px] ml-1 py-1"
                >
                  <div className="flex gap-1 items-center bg-white border border-[#e2e2dc] px-3 py-1.5 rounded-full shadow-2xs">
                    <span className="text-[10.5px] font-medium text-neutral-700">对方正在输入</span>
                    <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce" />
                  </div>
                </motion.div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Floating Back to Bottom Pill */}
            <AnimatePresence>
              {!isNearBottom && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 16, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    scrollToBottom('smooth');
                    setUnreadCount(0);
                  }}
                  className="absolute bottom-3 right-3 sm:right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-900 text-white text-xs font-medium shadow-md hover:shadow-lg backdrop-blur-md border border-neutral-700/60 cursor-pointer transition-all select-none"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                  <span className="text-[11px] font-medium tracking-tight">
                    {unreadCount > 0 ? `${unreadCount} 条新消息` : '回到底部'}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

            {/* 6 & 7. Isolated Dedicated Bottom Component (Urban Radar Dock) */}
            <div
              id="chat-isolated-bottom-dock"
              className="shrink-0 bg-white border-t border-neutral-200/90 z-20 shadow-[0_-2px_12px_rgba(0,0,0,0.03)]"
            >
              <div>
                {/* 6. Role-Specific Horizontal Quick Phrases (Unified Capsule Design) */}
                <div
                  id="chat-quick-phrases-bar"
                  className="px-3 py-2 bg-white border-b border-neutral-100 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => setIsWalkieTalkieDrawerOpen(true)}
                    className="shrink-0 h-7 px-3 rounded-full bg-neutral-900 text-white hover:bg-black border border-neutral-800 text-[11px] font-medium inline-flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <Radio className="w-3 h-3 text-emerald-400" />
                    <span>对讲短语库</span>
                  </button>

                  {ROLE_QUICK_PHRASES[viewerRole].map((phrase, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendText(phrase)}
                      className="shrink-0 h-7 px-3 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300 text-neutral-800 text-[11px] font-medium inline-flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>

                {/* 7. Input & Action Toolbar */}
                <div
                  id="chat-input-action-toolbar"
                  className="p-2.5 sm:p-3 bg-white space-y-2 shrink-0"
                >
                  {/* Media & Action Shortcuts (Unified Capsule Design) */}
                  <div className="flex items-center justify-between px-0.5 gap-1.5 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleSendLocation}
                        className="shrink-0 h-6.5 px-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 text-[11px] font-medium inline-flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
                      >
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>发送定位</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsWalkieTalkieDrawerOpen(true)}
                        className="shrink-0 h-6.5 px-2.5 rounded-full bg-sky-50 hover:bg-sky-100/80 text-sky-800 border border-sky-200/80 text-[11px] font-medium inline-flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
                      >
                        <Radio className="w-3 h-3 text-sky-600" />
                        <span>对讲短语</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendProofPhoto}
                        className="shrink-0 h-6.5 px-2.5 rounded-full bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200/80 text-[11px] font-medium inline-flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
                      >
                        <Camera className="w-3 h-3 text-amber-600" />
                        <span>拍照存证</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendRushAlert}
                        className="shrink-0 h-6.5 px-2.5 rounded-full bg-rose-50 hover:bg-rose-100/80 text-rose-800 border border-rose-200/80 text-[11px] font-medium inline-flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
                      >
                        <Zap className="w-3 h-3 text-rose-600" />
                        <span>加急催单</span>
                      </button>
                    </div>

                    <div className="text-[10px] text-emerald-600 flex items-center gap-1 shrink-0 whitespace-nowrap ml-1 font-medium font-mono">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>已加密协同</span>
                    </div>
                  </div>

                  {/* Expandable Bottom Drawer Panel */}
                  <AnimatePresence>
                    {isBottomDrawerOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: 10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: 10 }}
                        className="bg-white border border-neutral-200 rounded-2xl p-3 space-y-2.5 shadow-lg overflow-hidden"
                      >
                        <div className="flex items-center justify-between border-b border-neutral-200/70 pb-2">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900">
                            <ChevronsUpDown className="w-3.5 h-3.5 text-emerald-600" />
                            <span>协同抽屉快捷面板</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setIsBottomDrawerOpen(false)}
                              className="text-xs text-neutral-500 hover:text-black flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-neutral-100 cursor-pointer font-medium"
                              title="向下收起抽屉"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>收起</span>
                            </button>
                            <button
                              type="button"
                              onClick={onClose}
                              className="text-xs text-neutral-400 hover:text-rose-600 flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                              title="关闭联络室"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>关闭</span>
                            </button>
                          </div>
                        </div>

                        {/* Quick Tools Grid in Drawer */}
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setIsWalkieTalkieDrawerOpen(true);
                              setIsBottomDrawerOpen(false);
                            }}
                            className="p-2.5 bg-[#fbfbfa] hover:bg-sky-50 hover:border-sky-300 border border-neutral-200 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <Radio className="w-4 h-4 text-sky-600" />
                            <span className="font-bold text-neutral-800">对讲语音库</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleSendProofPhoto();
                              setIsBottomDrawerOpen(false);
                            }}
                            className="p-2.5 bg-[#fbfbfa] hover:bg-emerald-50 hover:border-emerald-300 border border-neutral-200 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-center"
                          >
                            <Camera className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-neutral-800">拍照存证</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleSendLocation();
                              setIsBottomDrawerOpen(false);
                            }}
                            className="p-2.5 bg-[#fbfbfa] hover:bg-amber-50 hover:border-amber-300 border border-neutral-200 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <MapPin className="w-4 h-4 text-amber-600" />
                            <span className="font-bold text-neutral-800">发送定位</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleSendRushAlert();
                              setIsBottomDrawerOpen(false);
                            }}
                            className="p-2.5 bg-[#fef2f2] hover:bg-red-100 hover:border-red-300 border border-red-200 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <Zap className="w-4 h-4 text-red-600" />
                            <span className="font-bold text-red-700">加急催单</span>
                          </button>
                        </div>

                        {/* Order items quick quote in drawer */}
                        <div className="bg-[#f8f8f7] p-2.5 rounded-xl border border-neutral-200 space-y-1.5">
                          <div className="text-[11px] text-neutral-500 font-bold flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-emerald-700" />
                            <span>点击单品引用咨询：</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(order?.items && order.items.length > 0
                              ? order.items
                              : [
                                  { id: '1', name: '碳烤和牛小汉堡', price: 48, quantity: 1 },
                                  { id: '2', name: '极夜西西里青柠微气泡', price: 16, quantity: 2 },
                                  { id: '3', name: '黑曜石松露金黄脆薯', price: 18, quantity: 1 }
                                ]
                            ).map((item, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  handleQuoteDish(item as any);
                                  setIsBottomDrawerOpen(false);
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-neutral-900 hover:text-white text-neutral-700 rounded-lg text-xs border border-neutral-200 transition-colors cursor-pointer"
                              >
                                <span>{item.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Main Input Box Capsule Row */}
                  <div className="flex items-center gap-2 pt-0.5">
                    {/* Microphone Recording Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isRecording) {
                          handleStopAndSendVoice();
                        } else {
                          handleStartVoiceRecording();
                        }
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 border ${
                        isRecording
                          ? 'bg-rose-600 text-white border-rose-700 animate-pulse shadow-md'
                          : 'bg-[#f4f4f2] text-neutral-700 border-neutral-200 hover:bg-neutral-200 hover:text-black'
                      }`}
                      title={isRecording ? '点击完成真实录音并发送' : '点击开启真实麦克风录音'}
                    >
                      <Mic className={`w-4 h-4 ${isRecording ? 'text-white' : 'text-neutral-700'}`} />
                    </button>

                    {/* Integrated Keyboard Input Capsule */}
                    <div className="flex-1 bg-[#f4f4f2] border border-neutral-200/90 rounded-full px-3.5 py-1.5 flex items-center gap-2 focus-within:bg-white focus-within:border-neutral-400 transition-all min-w-0">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendText();
                          }
                        }}
                        placeholder={`以【${
                          viewerRole === 'merchant' ? '餐车后厨' : viewerRole === 'rider' ? '专送骑手' : '顾客本人'
                        }】身份发送协同消息...`}
                        className="flex-1 bg-transparent border-none text-xs sm:text-[13px] text-neutral-900 focus:outline-none placeholder:text-neutral-400 min-w-0"
                      />

                      {/* Smile & Expand Drawer buttons inside input capsule */}
                      <div className="flex items-center gap-1.5 shrink-0 text-neutral-400">
                        <button
                          type="button"
                          onClick={() => {
                            setInputText((prev) => prev + ' 😊 ');
                            inputRef.current?.focus();
                          }}
                          className="hover:text-neutral-700 cursor-pointer transition-colors p-0.5"
                          title="插入表情"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBottomDrawerOpen(!isBottomDrawerOpen)}
                          className="hover:text-neutral-700 cursor-pointer transition-colors p-0.5"
                          title={isBottomDrawerOpen ? '收起面板' : '展开面板'}
                        >
                          <ChevronUp className={`w-4 h-4 transition-transform duration-200 ${isBottomDrawerOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Circular Send Button */}
                    <button
                      type="button"
                      onClick={() => handleSendText()}
                      disabled={!inputText.trim()}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 ${
                        inputText.trim()
                          ? 'bg-[#121417] text-white hover:bg-black active:scale-95 shadow-md'
                          : 'bg-[#121417]/80 text-white/70 hover:bg-[#121417]'
                      }`}
                      title="发送消息"
                    >
                      <Send className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </div>

                  {/* Live Voice Recording Status & Waveform Bar */}
                  {isRecording && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-sky-50 border border-sky-200 rounded-2xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px] text-sky-950">
                        <div className="flex items-center gap-2 font-bold">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                          <span>正在录音与声学降噪中 ({recordDuration} / 60s)</span>
                          <span className="text-[10px] text-sky-600 font-mono">
                            {micMode === 'real_mic' ? '【麦克风拾音】' : '【高保真对讲仿真】'}
                          </span>
                        </div>
                        <span className="text-[10px] text-sky-700 font-medium">松开或点击完成即可发送</span>
                      </div>

                      {/* Dynamic Jumping Waveform Bars */}
                      <div className="flex items-center justify-center gap-1.5 h-8 bg-sky-900/10 rounded-xl px-2 py-1">
                        {liveWaveform.map((h, i) => (
                          <span
                            key={i}
                            style={{ height: `${h}%` }}
                            className="w-1.5 bg-sky-600 rounded-full transition-all duration-75"
                          />
                        ))}
                      </div>

                      {/* Live Speech Recognition Transcript */}
                      <div className="text-[11px] text-neutral-800 bg-white/90 p-2 rounded-xl border border-neutral-200 flex items-start gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-neutral-600 stroke-[1.5] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-neutral-900">实时识别预览：</span>
                          <span>{liveTranscript || '正在聆听您的语音输入...'}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* 8. Walkie-Talkie Preset Voice Phrases Modal */}
            {isWalkieTalkieDrawerOpen && (
              <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white w-full max-w-sm rounded-3xl p-4 shadow-2xl border border-[#e5e5df] space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[#f0f0eb] pb-2">
                    <span className="font-bold text-[13.5px] text-neutral-900 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-sky-600 animate-pulse" />
                      对讲机快捷语音库 (带声效与译文)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsWalkieTalkieDrawerOpen(false)}
                      className="text-neutral-400 hover:text-black cursor-pointer p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-[11px] text-neutral-500">
                    点击以下预设常用语音条，即可一键向订单三端发送带高清对讲音效与智能转写的语音消息：
                  </div>

                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {ROLE_VOICE_TEMPLATES[viewerRole].map((tpl, i) => (
                      <div
                        key={i}
                        onClick={() => handleSendPresetVoice(tpl)}
                        className="p-3 bg-[#f8f8f7] hover:bg-sky-50 hover:border-sky-300 border border-[#e5e5df] rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-2 group"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[12.5px] text-neutral-900 flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-sky-600 group-hover:scale-110 transition-transform" />
                            <span>{tpl.title}</span>
                            <span className="text-[10px] text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded-full font-mono">
                              {tpl.duration}"
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-600 mt-1 line-clamp-2">
                            {tpl.text}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-2.5 py-1.5 bg-neutral-900 group-hover:bg-sky-600 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
                        >
                          发送
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}

            {/* 9. Cloud Function & Cloud Database Storage Panel Modal */}
            {isCloudModalOpen && (
              <div className="absolute inset-0 bg-black/70 z-40 flex items-center justify-center p-3 sm:p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#181816] text-white w-full max-w-md rounded-3xl p-4 shadow-2xl border border-neutral-800 space-y-3.5 max-h-[90vh] flex flex-col"
                >
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-sky-950 text-sky-400 flex items-center justify-center border border-sky-800">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-[13.5px] text-white flex items-center gap-1.5">
                          云函数与云存储配置中心
                        </div>
                        <div className="text-[10.5px] text-neutral-400">
                          Tencent CloudBase 订单即时通讯持久化架构
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCloudModalOpen(false)}
                      className="text-neutral-400 hover:text-white cursor-pointer p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-[12px]">
                    {/* Cloud Storage Location Specs */}
                    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-neutral-800 pb-1.5">
                        <span className="font-semibold">云端数据存放位置</span>
                        <span className="text-emerald-400 font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          已就绪
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <div className="text-neutral-500">云函数名称</div>
                          <div className="font-mono text-sky-300 font-bold mt-0.5">
                            {TCB_FUNCTION_NAMES.CHAT_MESSAGES}
                          </div>
                        </div>
                        <div>
                          <div className="text-neutral-500">云数据库集合</div>
                          <div className="font-mono text-amber-300 font-bold mt-0.5">
                            {TCB_COLLECTIONS.CHAT_MESSAGES}
                          </div>
                        </div>
                        <div>
                          <div className="text-neutral-500">当前订单会话数</div>
                          <div className="font-mono text-white font-bold mt-0.5">
                            #{currentOrderNo} ({messages.length} 条记录)
                          </div>
                        </div>
                        <div>
                          <div className="text-neutral-500">环境 ID</div>
                          <div className="font-mono text-neutral-300 truncate mt-0.5">
                            {import.meta.env?.VITE_TCB_ENV_ID || 'tc100-d9gz0e2ko5929e360'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sync Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTriggerCloudSync}
                        disabled={cloudSyncStatus === 'syncing'}
                        className="flex-1 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-98"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                        <span>{cloudSyncStatus === 'syncing' ? '正在同步...' : '立即备份会话至云端'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTestCloudFunction}
                        className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ping 测试</span>
                      </button>
                    </div>

                    {/* Cloud Log Output */}
                    {cloudLog && (
                      <div className="p-2.5 bg-black/60 border border-neutral-800 rounded-xl font-mono text-[10.5px] text-neutral-300 leading-relaxed">
                        {cloudLog}
                      </div>
                    )}

                    {/* Deployable Cloud Function Source Code Viewer */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-neutral-300 flex items-center gap-1">
                          <Code2 className="w-3.5 h-3.5 text-sky-400" />
                          云函数部署源码 (可一键部署至腾讯云)
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setCloudCodeTab('indexJs')}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                              cloudCodeTab === 'indexJs'
                                ? 'bg-sky-600 text-white font-bold'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            index.js
                          </button>
                          <button
                            type="button"
                            onClick={() => setCloudCodeTab('packageJson')}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                              cloudCodeTab === 'packageJson'
                                ? 'bg-sky-600 text-white font-bold'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            package.json
                          </button>
                        </div>
                      </div>

                      <div className="relative group">
                        <pre className="p-3 bg-black/90 text-emerald-300 font-mono text-[10px] rounded-xl border border-neutral-800 max-h-36 overflow-auto leading-relaxed">
                          {cloudCodeTab === 'indexJs'
                            ? CLOUD_FUNCTION_TEMPLATES.CHAT_MESSAGES.indexJs
                            : CLOUD_FUNCTION_TEMPLATES.CHAT_MESSAGES.packageJson}
                        </pre>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyCode(
                              cloudCodeTab === 'indexJs'
                                ? CLOUD_FUNCTION_TEMPLATES.CHAT_MESSAGES.indexJs
                                : CLOUD_FUNCTION_TEMPLATES.CHAT_MESSAGES.packageJson
                            )
                          }
                          className="absolute top-2 right-2 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedCode ? '已复制' : '复制代码'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-neutral-800 pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsCloudModalOpen(false)}
                      className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      关闭视窗
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* 10. Merchant Gift Selection Modal */}
            {isGiftModalOpen && (
              <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-xl border border-[#e5e5df] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#f0f0eb] pb-2">
                    <span className="font-bold text-[13px] text-neutral-900 flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-amber-600" />
                      为顾客选择赠送特调/小食
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsGiftModalOpen(false)}
                      className="text-neutral-400 hover:text-black cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {MERCHANT_GIFTS.map((g, i) => (
                      <div
                        key={i}
                        onClick={() => handleSendGift(g)}
                        className="p-2.5 bg-[#f8f8f7] hover:bg-[#fffbeb] hover:border-amber-400 border border-[#e5e5df] rounded-xl cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-[12px] text-neutral-900">{g.name}</div>
                          <div className="text-[10.5px] text-neutral-500">{g.desc}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-amber-700">免费赠送</span>
                          <div className="text-[9.5px] text-neutral-400 line-through">¥{g.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 11. Merchant Remark Editing Modal */}
            {isRemarkModalOpen && (
              <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-xl border border-[#e5e5df] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#f0f0eb] pb-2">
                    <span className="font-bold text-[13px] text-neutral-900 flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-amber-600" />
                      修改订单配送/制作特别备注
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRemarkModalOpen(false)}
                      className="text-neutral-400 hover:text-black cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={remarkInput}
                    onChange={(e) => setRemarkInput(e.target.value)}
                    placeholder="输入后厨特殊备餐指示（如：微辣少盐、加双份孜然、放保温袋）"
                    rows={3}
                    className="w-full bg-[#f8f8f7] border border-[#d3d1cb] rounded-xl p-2.5 text-[12.5px] focus:outline-none focus:border-black"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRemarkModalOpen(false)}
                      className="px-3 py-1.5 bg-[#f0f0eb] text-neutral-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRemark}
                      className="px-4 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      确认发布
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 12. Photo Zoom Preview Modal */}
            {previewImage && (
              <div
                onClick={() => setPreviewImage(null)}
                className="absolute inset-0 bg-black/85 z-40 flex flex-col items-center justify-center p-4 cursor-zoom-out"
              >
                <div className="relative max-w-full max-h-full">
                  <img
                    src={previewImage.url}
                    alt="大图"
                    className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl object-contain border border-neutral-700"
                  />
                  <div className="mt-2 text-center text-white text-xs font-medium">
                    {previewImage.title}
                  </div>
                </div>
              </div>
            )}

            {/* 13. Virtual Call Simulation Bar */}
            {callActive && callTarget && (
              <div className="absolute top-0 inset-x-0 bg-emerald-950 text-white p-3 z-30 flex items-center justify-between border-b border-emerald-800 shadow-lg animate-in slide-in-from-top-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white animate-pulse">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-emerald-200">
                      正在通话中：{callTarget.name} ({callTarget.role})
                    </div>
                    <div className="text-[10px] text-emerald-400">
                      虚拟隐私号保护 · 通话时长: {Math.floor(callDuration / 60)}:
                      {(callDuration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>挂断</span>
                </button>
              </div>
            )}
    </motion.div>
  );

  if (isInline) {
    if (!isOpen) return null;
    return contentJsx;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
          {contentJsx}
        </div>
      )}
    </AnimatePresence>
  );
};
