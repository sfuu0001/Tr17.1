import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, DishItem } from '../../types';
import {
  sendOrderChatMessage,
  subscribeOrderChat,
  getOrderChatMessages,
  syncOrderChatFromCloud,
  markOrderChatAsRead,
  updateChatMessageStatus,
  toggleChatMessageReaction,
  dingRemindMember,
  getMessageReadReceiptSummary,
  recallChatMessage,
  markVoiceMessageListened,
  updateExceptionWorkflow,
  broadcastIntercomBusy,
  subscribeIntercomBusy,
  ChatMessageItem,
  updateChatMessagePaymentStatus,
  triggerSLASupervisionTicket,
  respondToSLASupervision,
  resolveSLASupervision,
  appendSLASupervisionLog
} from '../../utils/chatHub';
import { isMerchantLoggedIn, isRiderLoggedIn } from '../../utils/staffAndRiderAuthEngine';
import { getCanonicalOrderNo } from '../../utils/orderNormalizer';
import { safeGetStorage } from '../../utils/safeStorage';
import { INITIAL_ORDERS } from '../../data/mockData';
import { MaterialMessageBubble } from './MaterialMessageBubble';
import { HistoryMessageFoldBanner } from './HistoryMessageFoldBanner';
import { FeishuReadReceiptCapsule } from './FeishuReadReceiptCapsule';
import { FeishuReadReceiptModal } from './FeishuReadReceiptModal';
import { FeishuMessageActions, FeishuReactionsRow } from './FeishuMessageActions';
import { FeishuQuoteBanner } from './FeishuQuoteBanner';
import { ContextTimeInspectorDock } from './ContextTimeInspectorDock';
import { matchDishImageUrl } from '../../utils/dishImageMatcher';
import { uploadUserFileToCloud } from '../../utils/cloudFileStorage';
import { voiceMessageEngine } from '../../utils/voiceMessageEngine';
import { getAllTruckConfigs, getActiveTruckConfig } from '../../utils/truckLocationEngine';
import {
  ShieldCheck,
  Flame,
  Bike,
  Store,
  User,
  Users,
  Camera,
  Radio,
  MapPin,
  Zap,
  Copy,
  Check,
  CheckCheck,
  Loader2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  History,
  FileText,
  Award,
  AlertCircle,
  ShoppingBag,
  CornerDownLeft,
  Volume2,
  VolumeX,
  Clock,
  Mic,
  Send,
  Smile,
  SlidersHorizontal,
  Shield,
  AlertTriangle,
  Paperclip,
  Package,
  PackageCheck,
  UtensilsCrossed,
  Bell,
  BellRing,
  ExternalLink,
  ArrowLeft,
  Receipt,
  Phone,
  Plus,
  X,
  Lock,
  Truck
} from 'lucide-react';

const playWalkieTalkieBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // ignore
  }
};

const playChimeSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.08);
      osc.stop(ctx.currentTime + index * 0.08 + 0.26);
    });
  } catch {
    // ignore
  }
};

// 时间戳智能聚合工具：若相邻消息跨越 3 分钟以上阈值，则在中线聚合展示，杜绝每条重复标注破坏节律
const parseTimeToMinutes = (timeStr?: string, timestamp?: number): number => {
  if (timestamp && !isNaN(timestamp)) {
    return Math.floor(timestamp / 60000);
  }
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  return 0;
};

const shouldShowTimeDivider = (currentMsg: ChatMessageItem, prevMsg?: ChatMessageItem): boolean => {
  if (!prevMsg) return true;
  const currMin = parseTimeToMinutes(currentMsg.time, currentMsg.timestamp);
  const prevMin = parseTimeToMinutes(prevMsg.time, prevMsg.timestamp);
  return Math.abs(currMin - prevMin) >= 3;
};

export interface SynergyChatRoomViewProps {
  order?: Order;
  orderNo?: string;
  onBack?: () => void;
  onOpenStore?: () => void;
  showToast?: (title: string, desc?: string) => void;
  viewerRole?: 'user' | 'rider' | 'merchant' | 'platform';
  embedded?: boolean;
  hideHeader?: boolean;
  activeChannel?: 'all' | 'rider' | 'merchant';
  onChannelChange?: (channel: 'all' | 'rider' | 'merchant') => void;
  isCallActive?: boolean;
  onToggleCall?: () => void;
}

// 自动检测当前终端登录身份 (优先读取本地存储与员工/骑手引擎认证状态，杜绝越权)
export function resolveCurrentTerminalRole(viewerRoleProp?: 'user' | 'rider' | 'merchant' | 'platform'): 'user' | 'rider' | 'merchant' | 'platform' {
  try {
    const rawRole = safeGetStorage<string>('obsidian_user_role', '');
    const cleanRole = (rawRole || '').replace(/^["']|["']$/g, '').toLowerCase().trim();

    if (cleanRole === 'merchant' || isMerchantLoggedIn()) {
      return 'merchant';
    }
    if (cleanRole === 'rider' || isRiderLoggedIn()) {
      return 'rider';
    }
    if (cleanRole === 'platform') {
      return 'platform';
    }
    if (cleanRole === 'customer' || cleanRole === 'user') {
      return 'user';
    }
  } catch {
    // ignore
  }

  if (viewerRoleProp === 'merchant') return 'merchant';
  if (viewerRoleProp === 'rider') return 'rider';
  if (viewerRoleProp === 'platform') return 'platform';
  return 'user';
}

export const SynergyChatRoomView: React.FC<SynergyChatRoomViewProps> = ({
  order,
  orderNo = 'UR-9821',
  onBack,
  onOpenStore,
  showToast = () => {},
  viewerRole = 'user',
  embedded = false,
  hideHeader = false,
  activeChannel: activeChannelProp,
  onChannelChange,
  isCallActive: isCallActiveProp,
  onToggleCall
}) => {
  const currentOrderNo = getCanonicalOrderNo(order?.orderNo || orderNo);

  // 严格区分当前使用端口与角色（食客端 / 骑手端 / 商家端 / 平台端），自动检测登录态并隔离越权操作
  const [activeRole, setActiveRole] = useState<'user' | 'rider' | 'merchant' | 'platform'>(() =>
    resolveCurrentTerminalRole(viewerRole)
  );

  useEffect(() => {
    const detected = resolveCurrentTerminalRole(viewerRole);
    setActiveRole(detected);
  }, [viewerRole]);

  useEffect(() => {
    const handleStorageRoleSync = () => {
      const detected = resolveCurrentTerminalRole(viewerRole);
      setActiveRole(detected);
    };
    window.addEventListener('storage', handleStorageRoleSync);
    return () => window.removeEventListener('storage', handleStorageRoleSync);
  }, [viewerRole]);

  // 状态与筛选 (支持外部受控 activeChannelProp)
  const [internalChannel, setInternalChannel] = useState<'all' | 'rider' | 'merchant'>('all');
  const activeChannel = activeChannelProp !== undefined ? activeChannelProp : internalChannel;
  const setActiveChannel = (ch: 'all' | 'rider' | 'merchant') => {
    setInternalChannel(ch);
    if (onChannelChange) onChannelChange(ch);
  };

  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isOrderBannerExpanded, setIsOrderBannerExpanded] = useState(false);
  const [slaVisible, setSlaVisible] = useState(true);
  const [isUrged, setIsUrged] = useState(false);
  const [urgeToastVisible, setUrgeToastVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // 底部输入框 3 个核心按钮的展开状态与素材库交互
  const [isEmojiLibraryOpen, setIsEmojiLibraryOpen] = useState(false);
  const [isTacticalTrayOpen, setIsTacticalTrayOpen] = useState(false);
  const [isMaterialToolsOpen, setIsMaterialToolsOpen] = useState(false);

  // 素材库子标签
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<'emojis' | 'status' | 'custom'>('emojis');
  const [activeTacticalTab, setActiveTacticalTab] = useState<'actions' | 'phrases' | 'evidence' | 'tools'>('actions');
  const [activePhraseCategory, setActivePhraseCategory] = useState<'dispatch' | 'food' | 'address' | 'rush' | 'aftersales'>('dispatch');
  const [activeToolsTab, setActiveToolsTab] = useState<'invoice' | 'dishes' | 'workorder' | 'audio'>('invoice');

  // 根据当前自动检测到的登录角色（骑手端 / 商家端 / 食客端 / 平台端）精准隔离快捷面板可用 Tab
  // 严格权限：存证（evidence）为骑手端与平台端独占功能，食客端和商家端彻底隐藏与阻断
  const availableTacticalTabs = useMemo(() => {
    if (activeRole === 'rider') {
      return [
        { id: 'actions' as const, label: '动作', icon: Zap, color: 'text-amber-500' },
        { id: 'phrases' as const, label: '话术', icon: Flame, color: 'text-rose-500' },
        { id: 'evidence' as const, label: '存证', icon: Camera, color: 'text-sky-500' },
        { id: 'tools' as const, label: '工具', icon: FileText, color: 'text-emerald-600' }
      ];
    }
    if (activeRole === 'merchant') {
      return [
        { id: 'actions' as const, label: '动作', icon: Zap, color: 'text-amber-500' },
        { id: 'phrases' as const, label: '话术', icon: Flame, color: 'text-rose-500' },
        { id: 'tools' as const, label: '工具', icon: FileText, color: 'text-emerald-600' }
      ];
    }
    if (activeRole === 'platform') {
      return [
        { id: 'actions' as const, label: '动作', icon: Zap, color: 'text-amber-500' },
        { id: 'phrases' as const, label: '话术', icon: Flame, color: 'text-rose-500' },
        { id: 'evidence' as const, label: '存证', icon: Camera, color: 'text-sky-500' },
        { id: 'tools' as const, label: '工具', icon: FileText, color: 'text-emerald-600' }
      ];
    }
    // 食客端 (user) 严格隔离，无法看到骑手专属的"存证"选项卡
    return [
      { id: 'actions' as const, label: '动作', icon: Zap, color: 'text-amber-500' },
      { id: 'phrases' as const, label: '话术', icon: Flame, color: 'text-rose-500' },
      { id: 'tools' as const, label: '工具', icon: FileText, color: 'text-emerald-600' }
    ];
  }, [activeRole]);

  // 当切换角色导致当前 Tab 不在可用列表中时，自动回退到 'actions'
  useEffect(() => {
    if (!availableTacticalTabs.some((t) => t.id === activeTacticalTab)) {
      setActiveTacticalTab('actions');
    }
  }, [availableTacticalTabs, activeTacticalTab]);

  // 通话仿真
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // 文件上传 Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 消息列表与订阅
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 真实麦克风语音录制引擎状态
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceRecordDuration, setVoiceRecordDuration] = useState(0);
  const [voiceLiveTranscript, setVoiceLiveTranscript] = useState('');
  const [voiceLiveWaveform, setVoiceLiveWaveform] = useState<number[]>([15, 30, 60, 40, 80, 50, 70, 35, 20]);
  const [voiceMicMode, setVoiceMicMode] = useState<'real_mic' | 'simulated'>('real_mic');
  const voiceTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, []);

  // 视口滚动与气泡视差渐变状态
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessagesLengthRef = useRef(0);

  // 飞书/钉钉风格协同交互状态 (悬停工具栏、引用回复、已读明细Modal)
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [quotedMessage, setQuotedMessage] = useState<ChatMessageItem | null>(null);
  const [selectedReceiptMessage, setSelectedReceiptMessage] = useState<ChatMessageItem | null>(null);

  // 对讲机占线状态指示
  const [intercomBusy, setIntercomBusy] = useState<{ isBusy: boolean; role?: any; speakerName?: string }>({ isBusy: false });

  // 历史旧消息折叠与交互展开状态 (优化视觉效果与交互体验)
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [autoFoldEnabled, setAutoFoldEnabled] = useState(true);

  // 引用消息精准定位高亮标定状态
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  // 快捷协同抽屉拖拽手势状态
  const [dragDisplacementY, setDragDisplacementY] = useState(0);
  const [isDraggingTray, setIsDraggingTray] = useState(false);
  const trayTouchStartYRef = useRef(0);
  const trayTouchStartXRef = useRef(0);

  // 弱网与离线队列仿真状态
  const [isOfflineSim, setIsOfflineSim] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<string[]>([]);

  // 点击引用跳转并高亮原消息 (智能穿透旧消息折叠)
  const handleLocateMessage = (targetId: string) => {
    if (!targetId) return;

    // 1. 若目标属于被折叠的历史消息，先自动平滑展开历史
    const isTargetInOlder = olderMessages.some((m) => m.id === targetId);
    if (isTargetInOlder && !isHistoryExpanded) {
      setIsHistoryExpanded(true);
    }

    // 2. 延迟等待 DOM 展开渲染后平滑居中滚动并高亮
    setTimeout(() => {
      const el = document.getElementById(`chat-msg-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMsgId(targetId);
        playChimeSound();
        showToast('已定位至原消息', '上下文关联已通过金色光晕标出');
        setTimeout(() => {
          setHighlightedMsgId((curr) => (curr === targetId ? null : curr));
        }, 2200);
      } else {
        showToast('原消息未在当前流中', '可能属于被撤回或过期记录');
      }
    }, 150);
  };

  // 监听对讲机占线事件
  useEffect(() => {
    const unsubBusy = subscribeIntercomBusy(currentOrderNo, (state) => {
      setIntercomBusy(state);
    });
    return () => unsubBusy();
  }, [currentOrderNo]);

  // 撤回消息处理
  const handleRecallMessage = (msg: ChatMessageItem) => {
    const res = recallChatMessage(currentOrderNo, msg.id, activeRole);
    if (res.success) {
      showToast('消息已撤回', res.message);
      playChimeSound();
    } else {
      showToast('无法撤回', res.message);
    }
  };

  // 异常工单处理响应
  const handleWorkflowAction = (msgId: string, action: 'accept' | 'refund' | 'view_berth', payload?: any) => {
    const res = updateExceptionWorkflow(currentOrderNo, msgId, action, activeRole, payload);
    if (res.success) {
      showToast('工单操作已同步', res.message);
      playChimeSound();
    }
  };

  // 发起备料售罄换餐协商卡
  const handleSendDishReplacementProposal = () => {
    dispatchChatMessage({
      senderRole: 'merchant',
      senderName: '黑曜石餐车主厨 · 王师傅',
      type: 'text',
      text: '⚠️【备料告罄换餐协商】黑松露牛排售罄，为您推荐免差价升级为炭烤和牛汉堡套餐！',
      exceptionWorkflow: {
        type: 'dish_replacement',
        status: 'pending',
        title: '备料告罄换餐协商',
        description: '原订餐品备料已告罄，为保障用餐时效，餐车为您免差价升级为【炭烤和牛汉堡套餐】，并优先插单现烤！',
        originalDish: { name: '黑松露芝士焗牛排', price: 68 },
        replacementDish: { name: '炭烤和牛汉堡套餐', price: 78, diffPrice: 0 },
        refundAmount: 68
      }
    });
    showToast('换餐工单已发起', '已向顾客端推送换餐免差价确认卡片');
    setIsTacticalTrayOpen(false);
  };

  // 发送餐车即时泊位微调卡
  const handleSendBerthRelocationNotice = () => {
    dispatchChatMessage({
      senderRole: 'merchant',
      senderName: '黑曜石餐车档口',
      type: 'text',
      text: '📍【餐车泊位微移指引】现场动线微调，餐车已向东北微移 65米至喷泉旁。',
      exceptionWorkflow: {
        type: 'berth_relocation',
        status: 'pending',
        title: '餐车雷达即时泊位微调',
        berthInfo: {
          fromLocation: '创智天地中央广场中央 01 泊位',
          toLocation: '创智天地2号门喷泉旁 (东北微移65m)',
          distanceDeltaMeters: 65,
          lat: 31.2312,
          lng: 121.4745,
          note: '因地段巡检微移，骑手取餐交接窗与自提动线请按新位指引'
        }
      }
    });
    showToast('泊位通知已广播', '已向全员下发新泊位雷达指引');
    setIsTacticalTrayOpen(false);
  };

  // 切换表情表态 (Reaction)
  const handleToggleReaction = (msgId: string, emoji: string) => {
    toggleChatMessageReaction(currentOrderNo, msgId, emoji, activeRole);
  };

  // 订单数据整合
  const fullOrder = React.useMemo(() => {
    const rawOrder = order as any;
    if (rawOrder && rawOrder.items && rawOrder.items.length > 0) {
      return rawOrder;
    }
    const allOrders = safeGetStorage<Order[]>('obsidian_truck_orders', INITIAL_ORDERS);
    const matched = allOrders.find((o) => o.orderNo === currentOrderNo || o.id === currentOrderNo);
    return matched || rawOrder || {
      orderNo: 'UR-9821',
      totalAmount: 186.0,
      status: 'cooking',
      deliveryAddress: '科技园区 A 座北塔 1204 室',
      etaMinutes: 4,
      items: [
        { id: '1', name: '碳烤和牛小汉堡双重奏', price: 48, quantity: 1 },
        { id: '2', name: '极夜西西里青柠微气泡', price: 16, quantity: 2 },
        { id: '3', name: '黑曜石松露金黄脆薯', price: 18, quantity: 1 }
      ]
    };
  }, [order, currentOrderNo]);

  // 加载初始消息并监听新消息
  useEffect(() => {
    const msgs = getOrderChatMessages(currentOrderNo, fullOrder);
    setMessages(msgs);

    syncOrderChatFromCloud(currentOrderNo, fullOrder).then((cloudMsgs) => {
      if (cloudMsgs && cloudMsgs.length > 0) {
        setMessages(cloudMsgs);
      }
    });

    const unsubscribe = subscribeOrderChat(currentOrderNo, (newMsgs) => {
      setMessages(newMsgs);
    });
    return () => unsubscribe();
  }, [currentOrderNo, fullOrder]);

  // 当客户端、商家端或骑手端查阅协同联络室时，将已读上报至全链路
  useEffect(() => {
    if (activeRole === 'user' || activeRole === 'merchant' || activeRole === 'rider') {
      markOrderChatAsRead(currentOrderNo, activeRole);
    }
  }, [currentOrderNo, activeRole, messages.length]);

  // 视口平滑滚动监听与上下遮罩动态计算
  const handleViewportScroll = React.useCallback((e: React.UIEvent<HTMLElement>) => {
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

  // 滚动至最新 (带视口精确定位与底部对齐)
  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior });
    }
    const viewport = viewportRef.current || document.getElementById('synergy-message-viewport');
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    }
    setIsNearBottom(true);
    setUnreadCount(0);
    setShowBottomFade(false);
  }, []);

  // 智能跟手滚动：仅在接近底部或自身发信时自动吸底，若用户向上翻阅历史则不强行打断
  useEffect(() => {
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
  }, [messages, viewerRole, isNearBottom, scrollToBottom]);

  // 当用户展开战术托盘/工具栏时，若处于底部则平滑跟随
  useEffect(() => {
    if (isNearBottom) {
      const timer = setTimeout(() => {
        scrollToBottom('smooth');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isTacticalTrayOpen, isEmojiLibraryOpen, isMaterialToolsOpen, urgeToastVisible, isNearBottom, scrollToBottom]);

  // 通话计时
  useEffect(() => {
    let interval: any = null;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  // 播放对讲音频
  const togglePlayRiderAudio = () => {
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      return;
    }
    try {
      playWalkieTalkieBeep();
    } catch {
      // ignore
    }
    setIsPlayingAudio(true);
    setAudioProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 1;
      setAudioProgress(progress);
      if (progress >= 5) {
        clearInterval(interval);
        setIsPlayingAudio(false);
      }
    }, 1000);
  };

  // 核心消息分发中枢：统一注入 'sending' 交付态动效与音效反馈，并驱动客户端/商家端已读流转
  const dispatchChatMessage = (
    msgData: Omit<ChatMessageItem, 'id' | 'orderNo' | 'time' | 'timestamp' | 'deliveryStatus'>,
    options?: {
      sound?: 'beep' | 'chime';
      autoReadDelay?: number;
    }
  ) => {
    // 1. 发送消息，初始为 'sending' 状态以呈现物理投递与发送中交货动画
    const newMsg = sendOrderChatMessage(currentOrderNo, {
      ...msgData,
      deliveryStatus: 'sending'
    });

    scrollToBottom('smooth');

    // 2. 若当前为弱网/离线测试状态，挂起在待发队列中
    if (isOfflineSim) {
      setPendingQueue((prev) => [...prev, newMsg.id]);
      showToast('弱网离线暂存', '当前处于弱网环境，消息已在本地发件箱挂起');
      return newMsg;
    }

    // 模拟正常网络交付过程 (380ms) 切换为 'sent'，触发弹性和音效
    setTimeout(() => {
      updateChatMessageStatus(currentOrderNo, newMsg.id, 'sent');
      if (options?.sound === 'beep') {
        playWalkieTalkieBeep();
      } else {
        playChimeSound();
      }
    }, 380);

    // 3. 商家端与客户端的已读/未读状态拟真流转 (平台端不介入)
    const delay = options?.autoReadDelay || (activeRole === 'user' ? 2400 : 2800);
    if (activeRole === 'user') {
      setTimeout(() => {
        const currentMsgs = getOrderChatMessages(currentOrderNo);
        const target = currentMsgs.find((m) => m.id === newMsg.id);
        if (target && (!target.readBy || !target.readBy.merchant)) {
          markOrderChatAsRead(currentOrderNo, 'merchant');
        }
      }, delay);
    } else if (activeRole === 'merchant') {
      setTimeout(() => {
        const currentMsgs = getOrderChatMessages(currentOrderNo);
        const target = currentMsgs.find((m) => m.id === newMsg.id);
        if (target && (!target.readBy || !target.readBy.user)) {
          markOrderChatAsRead(currentOrderNo, 'user');
        }
      }, delay);
    }

    return newMsg;
  };

  // 离线队列补发刷新
  const flushOfflineQueue = () => {
    if (pendingQueue.length === 0) return;
    pendingQueue.forEach((msgId, idx) => {
      setTimeout(() => {
        updateChatMessageStatus(currentOrderNo, msgId, 'sent');
        playChimeSound();
      }, idx * 250);
    });
    showToast('网络已恢复重连', `已自动补发 ${pendingQueue.length} 条离线挂起消息`);
    setPendingQueue([]);
  };

  // 发送文字消息
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const senderName = activeRole === 'rider'
      ? '陈志远 · 专线骑手'
      : activeRole === 'merchant'
      ? '黑曜石餐车主厨'
      : activeRole === 'platform'
      ? '平台调度中枢'
      : '顾客本人';

    const quoteReplyPayload = quotedMessage
      ? {
          id: quotedMessage.id,
          senderName: quotedMessage.senderName || '协同成员',
          senderRole: quotedMessage.senderRole,
          text:
            quotedMessage.text ||
            quotedMessage.voiceTranscribed ||
            quotedMessage.statusChangeInfo?.title ||
            quotedMessage.imageTitle ||
            '协同消息'
        }
      : undefined;

    dispatchChatMessage({
      senderRole: activeRole,
      senderName,
      type: 'text',
      text,
      quoteReply: quoteReplyPayload
    });

    setQuotedMessage(null);
    setInputText('');
    showToast('已发送至全员协同室', `以【${activeRole === 'user' ? '食客端' : activeRole === 'rider' ? '骑手端' : activeRole === 'merchant' ? '商家端' : '平台端'}】身份同步全链路`);
  };

  // 引用单品
  const handleQuoteDish = (dish: { name: string; price: number; quantity: number }) => {
    setInputText(`关于【${dish.name}】(x${dish.quantity})：`);
    inputRef.current?.focus();
    showToast('已引用单品', `关于 ${dish.name} 的咨询内容已填入输入框`);
  };

  // 发送定位 (按端口分工)
  const handleSendLocation = (customAddr?: string) => {
    const locText = customAddr || fullOrder.deliveryAddress || '科技园区 A 座北塔 1204 室';
    if (activeRole === 'user') {
      dispatchChatMessage({
        senderRole: 'user',
        senderName: '顾客本人',
        type: 'text',
        text: `📍【送达位置坐标存证】\n目标收餐地址：${locText}\n高精GPS：31.2431°N, 121.4682°E\n定位精度：±0.8m · 室内蓝牙信标辅助已就位\n状态：路线已直连骑手端导航中枢`
      });
      showToast('收餐高精定位已同步', '骑手端车载导航已自动导入坐标点');
    } else if (activeRole === 'rider') {
      dispatchChatMessage({
        senderRole: 'rider',
        senderName: '陈志远 · 专线骑手',
        type: 'text',
        text: `📍【车载实时GPS巡航坐标】\n当前坐标：31.2435°N, 121.4688°E (距目的地约 280m)\n行进时速：26 km/h\n状态：车载导航正引导前往写字楼南门外卖通道`
      });
      showToast('骑手GPS坐标已同步', '已向顾客与餐车通报骑行实时轨迹');
    } else if (activeRole === 'merchant') {
      dispatchChatMessage({
        senderRole: 'merchant',
        senderName: '黑曜石餐车档口',
        type: 'text',
        text: `📍【餐车停泊取餐口坐标】\n餐车位置：创智天地广场中央步道 01 泊位\n坐标：31.2425°N, 121.4675°E\n取餐窗口：后厨 2 号外摆专送交接窗`
      });
      showToast('餐车泊位已发送', '已告知各方当前档口取餐交接点');
    } else {
      dispatchChatMessage({
        senderRole: 'platform',
        senderName: '平台调度基站',
        type: 'text',
        text: `📍【平台基准地理信标】\n标定园区：创智天地核心商务区\n基准网格：UR-GRID-09821\n定位质量：差分厘米级`
      });
      showToast('平台信标已标定', '全网时空基准已广播');
    }
    setIsTacticalTrayOpen(false);
  };

  // 对讲短语 (权限拦截：食客端不允许跨角色使用车载无线电)
  const handleSendIntercomPhrase = (customPhrase?: string) => {
    if (activeRole === 'user') {
      showToast('跨角色操作拦截', '当前为【食客端】，无车载无线电对讲发射权限！该功能仅限骑手车载端或档口端使用。');
      return;
    }

    playWalkieTalkieBeep();
    if (activeRole === 'rider') {
      const phrase = customPhrase || '⚡ [车载对讲播报] 保温箱已密闭锁温，正全速通过西藏北路，预计 3 分钟内抵达！';
      dispatchChatMessage({
        senderRole: 'rider',
        senderName: '陈志远 · 专线金牌骑手',
        type: 'text',
        text: phrase
      }, { sound: 'beep' });
      showToast('对讲短语已广播', '车载对讲音频已同步通报全员');
    } else if (activeRole === 'merchant') {
      const phrase = customPhrase || '⚡ [后厨对讲播报] 炭烤和牛汉堡已出炉装袋，骑手到达即可在2号窗提餐！';
      dispatchChatMessage({
        senderRole: 'merchant',
        senderName: '餐车后厨 · 王师傅',
        type: 'text',
        text: phrase
      }, { sound: 'beep' });
      showToast('后厨对讲已广播', '已通报骑手取餐口就位');
    } else {
      const phrase = customPhrase || '⚡ [平台调度广播] 监测到园区电梯高峰，请各方注意配送安全！';
      dispatchChatMessage({
        senderRole: 'platform',
        senderName: '调度中枢 · 广播员',
        type: 'text',
        text: phrase
      }, { sound: 'beep' });
      showToast('调度广播已发送', '全频段通报已下发');
    }
    setIsTacticalTrayOpen(false);
  };

  // 拍照存证 (按端口区分存证主体，支持标准化文字包与云端留样)
  const handleSendProofPhoto = (imgUrl?: string, title?: string, detailMeta?: string) => {
    const finalUrl = imgUrl || 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=600&auto=format&fit=crop&q=80';
    const noteLine = detailMeta ? `\n核验说明：${detailMeta}` : '';
    
    if (activeRole === 'user') {
      const finalTitle = title || '顾客收餐开箱验真存证';
      dispatchChatMessage({
        senderRole: 'user',
        senderName: '顾客本人 · 验真存证',
        type: 'text',
        text: `📷【顾客收餐验真留样】\n存证类目：${finalTitle}${noteLine}\n核验时间：${new Date().toLocaleTimeString()}\n状态：顾客端收餐取证已存档\n[IMAGE]:${finalUrl}`
      });
      showToast('验真存证已上传', '顾客收餐验样记录已存入云端');
    } else if (activeRole === 'rider') {
      const finalTitle = title || '外卖架妥投拍照存证';
      dispatchChatMessage({
        senderRole: 'rider',
        senderName: '陈志远 · 专线骑手',
        type: 'text',
        text: `📷【外卖架妥投存证留样】\n存证类目：${finalTitle}${noteLine}\n妥投时间：${new Date().toLocaleTimeString()}\n状态：外卖架/大堂妥投影像已上链\n[IMAGE]:${finalUrl}`
      });
      showToast('妥投存证已上传', '骑手交付照片已留底');
    } else if (activeRole === 'merchant') {
      const finalTitle = title || '保温袋封签完整无拆封';
      dispatchChatMessage({
        senderRole: 'merchant',
        senderName: '餐车后厨 · 质检员',
        type: 'text',
        text: `📷【现场出餐存证留存】\n存证类目：${finalTitle}${noteLine}\n核验时间：${new Date().toLocaleTimeString()}\n云端状态：哈希已写入腾讯云COS安全存证库\n[IMAGE]:${finalUrl}`
      });
      showToast('后厨存证已上传', '双层保温封签留样已存入云存储审计库');
    } else {
      const finalTitle = title || '平台监管稽核留存';
      dispatchChatMessage({
        senderRole: 'platform',
        senderName: '平台稽核中枢',
        type: 'text',
        text: `📷【平台审计调阅留存】\n类目：${finalTitle}${noteLine}\n核验时间：${new Date().toLocaleTimeString()}\n状态：官方安全审计库记录完毕\n[IMAGE]:${finalUrl}`
      });
      showToast('审计存证已记录', '平台监管凭证已归档');
    }
    setIsTacticalTrayOpen(false);
  };

  // 处理本地照片上传存证 (直传云端对象存储，杜绝本地大体积 Base64 堆积)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploadRes = await uploadUserFileToCloud(file, {
        folder: 'order-chat-proofs',
        fileName: file.name
      });
      if (uploadRes.success && uploadRes.url) {
        handleSendProofPhoto(
          uploadRes.url,
          activeRole === 'user' ? '顾客收餐拍摄' : activeRole === 'rider' ? '骑手妥投拍摄' : '餐车出餐拍摄'
        );
      }
    } catch (err) {
      console.warn('[Chat] 存证照片上传失败:', err);
    }
  };

  // 发送订单核销账单卡 (权限控制：仅商家/平台可签发账单；食客可申请对账开票；骑手拦截)
  const handleSendInvoiceCard = () => {
    const total = Number(fullOrder.totalAmount || 186).toFixed(2);
    const dishSummary = fullOrder.items?.map((i: any) => `${i.name} x${i.quantity}`).join('、') || '炭烤和牛汉堡双重奏等';

    if (activeRole === 'user') {
      dispatchChatMessage({
        senderRole: 'user',
        senderName: '顾客本人',
        type: 'text',
        text: `🧾【顾客申请对账与开票】\n订单编号：#${currentOrderNo}\n核对金额：¥${total}\n商品明细：${dishSummary}\n申请事项：请商家核销台核对并开具电子普通发票`
      });
      showToast('对账申请已提交', '已通知餐车档口核对并生成发票凭证');
      setIsMaterialToolsOpen(false);
      return;
    }

    if (activeRole === 'rider') {
      showToast('无核销开票权限', '骑手端无权签发商家核销账单，该功能仅限餐车档口或平台端操作！');
      return;
    }

    const isPending = fullOrder.status === 'pending';
    dispatchChatMessage({
      senderRole: 'merchant',
      senderName: '黑曜石餐车核销台',
      type: 'text',
      text: `🧾【协同账单核销卡】\n订单编号：#${currentOrderNo}\n实付总额：¥${total}\n商品明细：${dishSummary}\n分单核销码：#${currentOrderNo.slice(-4) || '8829'}\n送达地址：${fullOrder.deliveryAddress || '科技园区 A 座 1204 室'}\n支付状态：${isPending ? '未付款 (待结清)' : '已支付 (全额结清)'}\n开票状态：官方电子普通发票已开具`,
      paymentStatus: isPending ? 'unpaid' : 'paid'
    });
    setIsMaterialToolsOpen(false);
    showToast('核销账单卡已发送', '协同各方已同步接收订单结算与凭证数据');
  };

  // 真实账单在线支付结清 (食客端调用)
  const handlePayBillCard = (amount: number, billOrderNo: string) => {
    updateChatMessagePaymentStatus(currentOrderNo, billOrderNo, 'paid', activeRole);
    playChimeSound();
    dispatchChatMessage({
      senderRole: 'system',
      senderName: '收银系统对账中枢',
      type: 'system_notice',
      text: `✅【账单全额结清】顾客已完成订单 #${billOrderNo} 结算金额 ¥${amount.toFixed(2)} 的线上全额付款，资金已入账并归档至云端数据凭据库。`
    });
    showToast('支付结清成功', `订单 #${billOrderNo} 账单已结清，已实时同步档口与骑手`);
  };

  // 催请顾客付款 (商家端/平台端调用)
  const handleRemindPayment = (billOrderNo: string) => {
    playWalkieTalkieBeep();
    dispatchChatMessage({
      senderRole: 'merchant',
      senderName: fullOrder?.truckName || '黑曜石餐车核销台',
      type: 'rush_alert',
      text: `🔔【催缴账单提醒】订单 #${billOrderNo} 尚在待结清状态，请食客及时完成账单付款，餐车后厨即将现烤装箱！`
    });
    showToast('催款提醒已发出', '已通知顾客尽快完成核销账单支付');
  };

  // 线下核销确认收款 (商家端调用)
  const handleConfirmPaymentReceived = (billOrderNo: string) => {
    updateChatMessagePaymentStatus(currentOrderNo, billOrderNo, 'paid', 'merchant');
    playChimeSound();
    dispatchChatMessage({
      senderRole: 'system',
      senderName: '餐车档口收银台',
      type: 'system_notice',
      text: `🧾【到账核销】餐车档口主理人已手动确认收到订单 #${billOrderNo} 的核销款项，账单状态更新为【已支付】。`
    });
    showToast('已确认到账核销', '订单账单状态已同步更新至全端');
  };

  // 发送菜品推荐/加点卡 (食客端咨询加点；商家端主厨推销；骑手端禁止)
  const handleSendDishCard = (dishName: string, price: number, desc?: string) => {
    if (activeRole === 'user') {
      dispatchChatMessage({
        senderRole: 'user',
        senderName: '顾客本人',
        type: 'text',
        text: `🍲【顾客加单咨询】\n咨询单品：${dishName}\n单品特惠：¥${price.toFixed(2)}\n顾客留言：请问后厨现在还来得及现做加单吗？如来得及请合并烘烤！`
      });
      showToast('加单咨询已发送', `已向餐车主厨咨询【${dishName}】加单可行性`);
      setIsMaterialToolsOpen(false);
      return;
    }

    if (activeRole === 'rider') {
      showToast('无推销菜品权限', '骑手端不支持发送菜品推销卡，该功能属于商家档口端。');
      return;
    }

    dispatchChatMessage({
      senderRole: 'merchant',
      senderName: '餐车现烤主厨推荐',
      type: 'text',
      text: `🍲【主厨推荐加单】\n单品品名：${dishName}\n加单特惠：¥${price.toFixed(2)}\n主厨寄语：${desc || '秘制香气浓郁，与当前订单合并烘烤，无须等待极速出单！'}\n如需添加可直接在协同室中回复确认。`
    });
    setIsMaterialToolsOpen(false);
    showToast('加购推荐卡已发送', `已向顾客推荐【${dishName}】`);
  };

  // 发起协同工单
  const handleSendWorkOrder = (type: string, desc: string) => {
    dispatchChatMessage({
      senderRole: activeRole,
      senderName: activeRole === 'rider' ? '骑手履约报备' : activeRole === 'merchant' ? '餐车后厨工单' : '食客服务中心',
      type: 'text',
      text: `📑【协同售后工单】\n发起端口：${activeRole === 'user' ? '食客端' : activeRole === 'rider' ? '骑手车载端' : '商家档口端'}\n工单类型：${type}\n问题描述：${desc}\n响应等级：P1 加急 · 督导热线与餐车车载端已强制联动介入`
    });
    setIsMaterialToolsOpen(false);
    showToast('工单已生成', '平台客诉协同专线已受理并加急处理');
  };

  // 加急催单 / 路况进度通报 (按角色职能分工)
  const triggerExpediteUrge = () => {
    if (activeRole === 'rider') {
      dispatchChatMessage({
        senderRole: 'rider',
        senderName: '专线骑手路况报备',
        type: 'text',
        text: '🚦【专线骑手路况报备】\n骑手当前正遇写字楼电梯高峰/进出登记，预计延迟 1-2 分钟送达，车载保温箱已持续锁温中！'
      });
      showToast('路况已报备', '已向食客与餐车通报实时骑行路况');
      return;
    }

    if (activeRole === 'merchant') {
      dispatchChatMessage({
        senderRole: 'merchant',
        senderName: '餐车后厨进度通报',
        type: 'text',
        text: '🔥【现烤出炉进度通报】\n汉堡正在扒炉高温现烤，肉汁锁温中，预计 90 秒后双封签装袋交付骑手！'
      });
      showToast('出餐进度已通报', '已通报出炉倒计时');
      return;
    }

    if (activeRole === 'platform') {
      playChimeSound();
      triggerSLASupervisionTicket(
        currentOrderNo,
        'P1',
        'merchant_delay',
        '平台实时时效协同督办',
        '调度中枢监测到该订单处于出餐与交付关键时段，已嵌入 P1 级时效督办工单。请餐车与骑手协同提速，并在 3 分钟内响应跟进。',
        180
      );
      showToast('SLA 督办工单已生成', '已嵌入消息上下文，实时跟进响应与解决耗时');
      return;
    }

    playChimeSound();
    setIsUrged(true);
    setUrgeToastVisible(true);
    dispatchChatMessage({
      senderRole: 'user',
      senderName: '顾客加急指令',
      type: 'text',
      text: '🚨【最高优先级加急催单】\n食客已发起最高优先级协同催单，餐车后厨与骑手车载专线已联动高频蜂鸣与加权震动！'
    });

    setTimeout(() => {
      setUrgeToastVisible(false);
    }, 3800);

    setTimeout(() => {
      setIsUrged(false);
    }, 30000);
  };

  // 开启真实语音录制引擎
  const handleStartVoiceRecording = async () => {
    if (isVoiceRecording) return;
    setVoiceRecordDuration(0);
    setVoiceLiveTranscript('');
    setVoiceLiveWaveform([15, 30, 60, 40, 80, 50, 70, 35, 20]);

    const res = await voiceMessageEngine.startRecording(
      (wave) => setVoiceLiveWaveform(wave),
      (transcript) => setVoiceLiveTranscript(transcript)
    );

    setVoiceMicMode(res.mode);
    setIsVoiceRecording(true);

    const speakerName =
      activeRole === 'merchant'
        ? fullOrder?.truckName || '餐车主理人'
        : activeRole === 'rider'
        ? fullOrder?.courierName || '专送骑手'
        : activeRole === 'platform'
        ? '调度中心'
        : '食客本人';
    broadcastIntercomBusy(currentOrderNo, activeRole, true, speakerName);

    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    voiceTimerRef.current = setInterval(() => {
      setVoiceRecordDuration((prev) => {
        if (prev >= 60) {
          handleStopAndSendVoice();
          return 60;
        }
        return prev + 1;
      });
    }, 1000);

    showToast(
      res.mode === 'real_mic' ? '🎙️ 已启动真实麦克风录音' : '🎙️ 已启动对讲录音引擎',
      '请对麦克风说话，完成后点击“发送语音”'
    );
  };

  // 取消并丢弃语音录制
  const handleCancelVoiceRecording = async () => {
    if (!isVoiceRecording) return;
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    setIsVoiceRecording(false);
    broadcastIntercomBusy(currentOrderNo, activeRole, false);
    await voiceMessageEngine.stopRecording();
    showToast('已取消录音', '当前语音已丢弃');
  };

  // 停止并发送真实语音消息
  const handleStopAndSendVoice = async () => {
    if (!isVoiceRecording) return;
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    setIsVoiceRecording(false);
    broadcastIntercomBusy(currentOrderNo, activeRole, false);

    const voiceData = await voiceMessageEngine.stopRecording();
    if (voiceData) {
      const activeRole = viewerRole;
      const senderName =
        activeRole === 'merchant'
          ? fullOrder?.truckName || '流动餐车主理人'
          : activeRole === 'rider'
          ? fullOrder?.courierName || '极速专送骑手'
          : activeRole === 'platform'
          ? '调度监管中心'
          : '食客本人';

      const finalTranscribed =
        voiceData.transcribedText || voiceLiveTranscript || '【语音消息已送达】';

      dispatchChatMessage({
        senderRole: activeRole,
        senderName,
        type: 'voice',
        voiceDuration: Math.max(1, voiceData.duration),
        voiceAudioUrl: voiceData.audioUrl,
        voiceAudioBase64: voiceData.audioBase64,
        voiceTranscribed: finalTranscribed,
        voiceWaveform:
          voiceData.waveform && voiceData.waveform.length > 0
            ? voiceData.waveform
            : [20, 50, 80, 40, 70, 30],
        text: finalTranscribed
      });

      showToast(`🎙️ ${Math.max(1, voiceData.duration)}秒 语音消息已送达`, '三端协同成员可点击气泡原声播放');
      scrollToBottom('smooth');
    }
  };

  // 语音转文字填入输入框
  const handleTranscribeToInput = async () => {
    if (!isVoiceRecording) return;
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    setIsVoiceRecording(false);
    broadcastIntercomBusy(currentOrderNo, activeRole, false);

    const voiceData = await voiceMessageEngine.stopRecording();
    const text = voiceData?.transcribedText || voiceLiveTranscript || '';
    if (text) {
      setInputText((prev) => (prev ? `${prev} ${text}` : text));
      showToast('语音已智能转文字', '已填入输入框，可编辑后发送');
    } else {
      showToast('未检测到有效语句', '已保留录音，您可以直接发送语音消息');
    }
    inputRef.current?.focus();
  };

  // 常用表情与符号库
  const EMOJI_LIST = [
    '😊', '👍', '🤝', '🙏', '🛵', '🍔', '📦', '🚨',
    '📍', '💨', '⏳', '💯', '🔥', '🚪', '🏢', '📞',
    '⚠️', '🕒', '🍜', '🍱', '🥤', '🥩', '🍳', '🚲',
    '💬', '🥢', '🧊', '🧅', '🌶️', '✨', '🛎️', '🥪'
  ];

  // 常用态势短语库
  const STATUS_PHRASES = [
    '【已取餐】正在全速送往指定地址',
    '【请稍候】正在乘梯下楼，请稍等 1 分钟',
    '【已放门口】餐品已轻放于门边地垫上',
    '【已放外卖架】已置于前台指定外卖架第 2 层',
    '【辛苦师傅】大雨路滑，感谢骑手师傅！',
    '【包装完好】保温封签完好，已验真',
    '【请提前电话】到达大堂时请提前致电',
    '【收到立刻】收到通知，现在就去取餐'
  ];

  // 口味与加料素材库
  const CUSTOM_TASTE_PHRASES = [
    '🌶️ 麻烦多放辣椒香料',
    '🧅 不要葱花香菜蒜蓉',
    '🧊 冷萃饮品请尽量少冰',
    '🥢 请多配一份一次性餐具',
    '📦 炭烤汉堡请加防颠簸气垫',
    '⚡ 正在开紧急会议，请务必尽快送达'
  ];

  // 战术话术库 (5大实用文字包方案)
  const TACTICAL_PHRASES = {
    dispatch: [
      '📦 麻烦直接放 12 楼前台外卖架即可，已拍照留存',
      '📞 到达大楼前请提前电话联系，我及时下楼取餐',
      '🌧️ 大雨路滑视线受阻，骑手师傅请注意骑行安全',
      '🏢 电梯需要刷工卡权限，到达请在前台稍等片刻',
      '🛎️ 餐品已送达门口，敲门后请无接触配送'
    ],
    food: [
      '🍔 炭烤汉堡肉汁饱满，已加防颠气垫与锁温袋',
      '🥤 冷萃咖啡饮品已加冰锁鲜，请尽快饮用',
      '🔥 现烤出炉即刻装箱，双封签恒温锁温中',
      '🥢 麻烦随单多配两副一次性环保餐具与湿纸巾',
      '⚖️ 主副餐及特调酱汁调料包已全量核验齐全'
    ],
    address: [
      '📍 科技园区A座北塔大堂西侧门快速进入',
      '🚪 目标房门号为 1204 室，门禁按键 #1204',
      '📦 请放置于门外指定快递外卖架，无需敲门',
      '🧭 餐车停泊于园区中庭喷泉西侧，欢迎随时自提',
      '🛎️ 到达请按门铃，已在门口等待签收'
    ],
    rush: [
      '⚡ 紧急会议即将开始，麻烦协调优先出餐派送',
      '🕒 还有 10 分钟午休结束，请骑手协助尽快送达',
      '🚨 订单已达时效预警线，系统已协调就近专线',
      '🤝 路上若遇红绿灯或堵车，请在协同室同步最新时间'
    ],
    aftersales: [
      '🥣 如有汤汁微溢或外包装挤压，请即刻在协同室沟通补发',
      '🔄 如遇菜品遗漏或规格不符，后厨极速重新出餐',
      '📞 平台专属客服已接入协同室，全程保障您的用餐权益',
      '🧾 电子发票与纸质核销小票已开具，可随时下载备查'
    ]
  };

  // 预设存证图片库与标准化文字包方案
  const PRESET_EVIDENCE = [
    {
      id: 'seal',
      category: '双封签完好',
      title: '保温袋封签完整无拆封',
      desc: '原装双封条无破损 · 锁温防尘',
      url: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=600&auto=format&fit=crop&q=80',
      actionText: '发送封签存证',
      detailMeta: '原装双层安全封签完好未拆封，锁温锁鲜防尘已验真'
    },
    {
      id: 'shelf',
      category: '外卖架妥投',
      title: '前台外卖架妥投拍照',
      desc: '指定外卖自提架 · 凭单号取件',
      url: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=600&auto=format&fit=crop&q=80',
      actionText: '发送妥投存证',
      detailMeta: '餐品已稳妥送达12楼前台指定外卖架，包装规整拍照留样'
    },
    {
      id: 'kitchen',
      category: '现烤温控',
      title: '后厨炭烤现制温控出餐',
      desc: '新鲜出炉即装箱 · 恒温保温密封',
      url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
      actionText: '发送出餐存证',
      detailMeta: '炭烤和牛汉堡出炉立即装入密封恒温袋，温控质检完毕'
    },
    {
      id: 'receipt',
      category: '小票验真',
      title: '收银小票与餐品核对存证',
      desc: '单品条码齐全 · 双向留底防漏',
      url: 'https://images.unsplash.com/photo-1554415707-9e49fe832807?w=600&auto=format&fit=crop&q=80',
      actionText: '发送小票存证',
      detailMeta: '小票商品清单与实物逐项核验一致，随单环保餐具齐全'
    }
  ];

  // 推荐加购菜品素材
  const RECOMMENDED_DISHES = [
    { name: '经典黑椒炭烤和牛小汉堡', price: 48.0, desc: '澳洲和牛炭火慢烤，肉汁充盈' },
    { name: '极夜西西里青柠微气泡', price: 16.0, desc: '鲜榨青柠爽口微气泡，冰镇锁鲜' },
    { name: '黑曜石松露金黄脆薯', price: 18.0, desc: '黑松露风味慢炸，酥脆扑鼻' },
    { name: '厚切极上炙烤牛舌', price: 58.0, desc: '深海盐调味，弹牙多汁香气浓' }
  ];

  // 筛选消息
  const filteredMessages = messages.filter((msg) => {
    if (activeChannel === 'all') return true;
    if (activeChannel === 'rider') return msg.senderRole === 'rider' || msg.senderRole === 'user';
    if (activeChannel === 'merchant') return msg.senderRole === 'merchant' || msg.senderRole === 'user';
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

  // 计算我方最新一条发送的消息ID (用于行内已读微标降噪：仅最新消息展开长胶囊，历史消息极简微标化)
  const latestSelfMessageId = React.useMemo(() => {
    const rev = [...filteredMessages].reverse();
    const found = rev.find((m) => m.senderRole === viewerRole);
    return found?.id;
  }, [filteredMessages, viewerRole]);

  // 计算消息流中最新的上下文时间锚点消息 ID (供内嵌式自动化上下文时间与双胶囊督察调度组件挂载)
  const activeTimeDividerMsgId = React.useMemo(() => {
    // 优先从 recentMessages 逆序查找最后一个触发 showTimeDivider 的消息
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i];
      const prevMsg = i > 0
        ? recentMessages[i - 1]
        : olderMessages.length > 0
        ? olderMessages[olderMessages.length - 1]
        : undefined;
      if (shouldShowTimeDivider(msg, prevMsg)) {
        return msg.id;
      }
    }
    // 若 recentMessages 中未触发，则向 olderMessages 逆序查找
    for (let i = olderMessages.length - 1; i >= 0; i--) {
      const msg = olderMessages[i];
      const prevMsg = i > 0 ? olderMessages[i - 1] : undefined;
      if (shouldShowTimeDivider(msg, prevMsg)) {
        return msg.id;
      }
    }
    return recentMessages[0]?.id || filteredMessages[0]?.id;
  }, [recentMessages, olderMessages, filteredMessages]);

  // 渲染上下文中嵌入式时间分割线及自动化双胶囊督察组件
  const renderContextTimeDivider = (time?: string, msgId?: string) => {
    const isAnchor = msgId === activeTimeDividerMsgId || (!msgId && filteredMessages.length === 0);
    if (isAnchor) {
      return (
        <ContextTimeInspectorDock
          order={fullOrder}
          orderNo={currentOrderNo}
          messages={filteredMessages}
          activeRole={activeRole}
          time={time}
          onScrollToBottom={() => scrollToBottom('smooth')}
          onSLAAction={handleSLAAction}
          onQuoteDish={handleQuoteDish}
          showToast={showToast}
        />
      );
    }
    return (
      <div className="flex justify-center my-2 select-none">
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500 text-[10.5px] tabular-nums font-medium border border-neutral-200/60 shadow-3xs">
          <Clock className="w-2.5 h-2.5 text-neutral-400 stroke-[1.5]" />
          <span>{time}</span>
        </div>
      </div>
    );
  };

  // 处理 SLA 履约督办工单的响应、跟进记录与办结闭环
  const handleSLAAction = (messageId: string, action: 'respond' | 'resolve' | 'log', payload?: any) => {
    const operatorName = activeRole === 'merchant'
      ? '餐车掌勺主厨'
      : activeRole === 'rider'
      ? '专线骑手'
      : activeRole === 'platform'
      ? '调度总控'
      : '食客本人';

    if (action === 'respond') {
      const ok = respondToSLASupervision(currentOrderNo, messageId, operatorName, activeRole, payload?.note);
      if (ok) {
        showToast('已确认接单响应', '已记录首次响应时间并排入加急处置通道');
        playChimeSound();
      }
    } else if (action === 'log') {
      const ok = appendSLASupervisionLog(currentOrderNo, messageId, '跟进处置', operatorName, activeRole, payload?.note);
      if (ok) {
        showToast('跟进记录已追加', payload?.note || '已记录现场处置进展');
      }
    } else if (action === 'resolve') {
      const ok = resolveSLASupervision(currentOrderNo, messageId, operatorName, activeRole, payload?.note);
      if (ok) {
        showToast('SLA 督办已闭环办结', '工单指标已归档，记录解决时间与合规评定');
        playChimeSound();
      }
    }
  };

  // 渲染消息气泡内容（调用高定制的 MaterialMessageBubble 组件）
  const renderMessageContent = (
    text: string,
    isSelf: boolean,
    msgItem?: ChatMessageItem
  ) => {
    return (
      <MaterialMessageBubble
        text={text}
        isSelf={isSelf}
        senderRole={msgItem?.senderRole || (isSelf ? viewerRole : 'user')}
        senderName={msgItem?.senderName}
        time={msgItem?.time}
        type={msgItem?.type}
        voiceDuration={msgItem?.voiceDuration}
        voiceTranscribed={msgItem?.voiceTranscribed}
        voiceAudioUrl={msgItem?.voiceAudioUrl}
        voiceAudioBase64={msgItem?.voiceAudioBase64}
        voiceWaveform={msgItem?.voiceWaveform}
        statusChangeInfo={msgItem?.statusChangeInfo}
        quoteReply={msgItem?.quoteReply}
        onLocateMessage={handleLocateMessage}
        showToast={showToast}
        playWalkieTalkieBeep={playWalkieTalkieBeep}
        playChimeSound={playChimeSound}
        messageId={msgItem?.id}
        slaSupervision={msgItem?.slaSupervision}
        onSLAAction={(action, payload) => {
          if (msgItem?.id) handleSLAAction(msgItem.id, action, payload);
        }}
        onQuickAction={(actionType, payload) => {
          if (actionType === 'confirm_dish' && payload) {
            handleSendMessage(`已确认加单：【${payload.name}】(¥${payload.price})，请后厨安排合并现烤！`);
          }
        }}
      />
    );
  };

  // 气泡专属头像组件 (按食客、骑手、商家、平台四大身份精确匹配)
  const renderMessageAvatar = (msgSenderRole: any, msgSenderName?: string, isSelfMsg?: boolean) => {
    const role = msgSenderRole || 'user';

    if (role === 'rider') {
      return (
        <div
          className="relative w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-xs ring-1 ring-sky-300/60 shrink-0"
          title={`${msgSenderName || '专线骑手'} (骑手端)`}
        >
          <Bike className="w-4 h-4 stroke-[1.75]" />
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-sky-600 border border-white text-[8px] font-bold text-white flex items-center justify-center shadow-3xs">
            骑
          </span>
        </div>
      );
    }

    if (role === 'merchant') {
      const allTruckConfigs = getAllTruckConfigs();
      const currentTruck = allTruckConfigs.find((t) => t.id === fullOrder.truckId) || getActiveTruckConfig();
      const truckLogo = currentTruck?.logo || currentTruck?.image;

      return (
        <div
          className="relative w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-xs ring-1 ring-amber-300/60 shrink-0 overflow-hidden"
          title={`${msgSenderName || currentTruck?.name || '餐车主厨'} (商家端)`}
        >
          {truckLogo ? (
            <img
              src={truckLogo}
              alt="Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Store className="w-4 h-4 stroke-[1.75]" />
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-600 border border-white text-[8px] font-bold text-white flex items-center justify-center shadow-3xs z-10">
            商
          </span>
        </div>
      );
    }

    if (role === 'platform') {
      return (
        <div
          className="relative w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs ring-1 ring-indigo-300/60 shrink-0"
          title={`${msgSenderName || '平台调度'} (监管端)`}
        >
          <ShieldCheck className="w-4 h-4 stroke-[1.75]" />
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-600 border border-white text-[8px] font-bold text-white flex items-center justify-center shadow-3xs">
            控
          </span>
        </div>
      );
    }

    // 顾客 / 食客
    return (
      <div
        className="relative w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs ring-1 ring-emerald-300/60 shrink-0"
        title={`${msgSenderName || '食客顾客'} (客户端)`}
      >
        <User className="w-4 h-4 stroke-[1.75]" />
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-600 border border-white text-[8px] font-bold text-white flex items-center justify-center shadow-3xs">
          客
        </span>
      </div>
    );
  };

  const getSenderRoleBadge = (role: any) => {
    if (role === 'rider') {
      return <span className="text-[9.5px] font-medium font-sans px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200">专送骑手</span>;
    }
    if (role === 'merchant') {
      return <span className="text-[9.5px] font-medium font-sans px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">餐车主理人</span>;
    }
    if (role === 'platform') {
      return <span className="text-[9.5px] font-medium font-sans px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">平台总控</span>;
    }
    return <span className="text-[9.5px] font-medium font-sans px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">食客本人</span>;
  };

  return (
    <div className={`w-full antialiased bg-radar-bg selection:bg-radar-dark selection:text-white flex flex-col ${embedded ? 'h-full flex-1 min-h-0 overflow-hidden' : 'min-h-screen h-screen'}`}>
      {/* 隐藏的文件上传 Input 供拍照存证调用 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* 现代极简弹性视口容器，确保消息在内部平滑滚动，底栏永远贴底不遮挡 */}
      <div className={`w-full flex-1 bg-[#FBFBFA] flex flex-col min-h-0 ${embedded ? 'h-full' : 'h-full max-h-screen'} overflow-hidden relative font-sans`}>
        
        {/* BEGIN: TopHeader */}
        {!hideHeader && (
        <header className={embedded ? "shrink-0 z-20 bg-white text-neutral-800 px-3 sm:px-4 py-2 border-b border-neutral-200/80 shadow-2xs" : "shrink-0 z-20 bg-white/95 backdrop-blur-md text-neutral-800 pt-2.5 px-3.5 sm:px-6 shadow-xs border-b border-neutral-200/80"}>
          {!embedded && (
            /* Top Utility Nav Row (Standalone Mode Only) */
            <div className="flex items-center justify-between gap-2 mb-2.5">
              {/* Room ID & Live Status Indicator */}
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="返回上级"
                  className="w-8 h-8 rounded-lg bg-radar-bg border border-radar-border flex items-center justify-center hover:bg-gray-200/70 transition-colors shrink-0 shadow-xs cursor-pointer"
                  title="返回"
                >
                  <svg className="w-4 h-4 text-radar-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                  </svg>
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[14px] font-bold tracking-tight text-radar-dark truncate">
                      #{currentOrderNo.startsWith('UR-') ? currentOrderNo : `UR-${currentOrderNo}`}
                    </span>
                    <span className="text-[12px] font-bold text-neutral-800 hidden xs:inline">
                      {activeRole === 'rider' ? '骑手专送战术室' : activeRole === 'merchant' ? '餐车档口核销室' : activeRole === 'platform' ? '平台调度监控室' : '食客协同联络室'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border shadow-3xs ${
                        activeRole === 'rider'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : activeRole === 'merchant'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : activeRole === 'platform'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        activeRole === 'rider'
                          ? 'bg-blue-500'
                          : activeRole === 'merchant'
                          ? 'bg-amber-500'
                          : activeRole === 'platform'
                          ? 'bg-purple-500'
                          : 'bg-emerald-500'
                      }`} />
                      <span>{activeRole === 'rider' ? '骑手端' : activeRole === 'merchant' ? '商家端' : activeRole === 'platform' ? '平台端' : '食客端'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Standalone Emergency Audio Calling, Store Jump & Dropdown Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsCallActive(!isCallActive);
                    showToast(isCallActive ? '通话已结束' : '正在呼叫专线金牌骑手 陈志远');
                  }}
                  className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors shadow-xs cursor-pointer ${
                    isCallActive
                      ? 'bg-red-100 border-red-300 text-red-700 animate-pulse'
                      : 'bg-emerald-50 border-emerald-200/80 hover:bg-emerald-100 text-emerald-700'
                  }`}
                  title={isCallActive ? '挂断电话' : '紧急拨号'}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.28-.28.36-.67.25-1.02A11.36 11.36 0 018.59 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.59c0-.58-.45-1.03-1.03-1.03z" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenStore) {
                      onOpenStore();
                    } else {
                      showToast('已跳转门店', '正在进入餐车档口实时菜单');
                    }
                  }}
                  className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-300/80 hover:bg-amber-100 text-amber-800 flex items-center justify-center transition-colors shadow-xs group cursor-pointer"
                  title="进店查看"
                >
                  <svg className="w-4 h-4 text-amber-700 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 22V12h6v10" />
                  </svg>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    id="header-more-menu-btn"
                    onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                    className="h-8 px-2.5 rounded-[4px] bg-radar-bg hover:bg-gray-200/70 border border-radar-border flex items-center gap-1 text-[12px] font-medium text-radar-dark transition-colors shadow-xs cursor-pointer"
                  >
                    <span className="text-[11.5px]">操作</span>
                    <svg className="w-3 h-3 text-radar-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isHeaderMenuOpen && (
                    <div id="header-dropdown-menu" className="absolute right-0 mt-1.5 w-44 bg-radar-surface border border-radar-border rounded-lg shadow-xl py-1 z-50 text-[12px]">
                      <div className="px-3 py-1 text-[10px] text-radar-muted font-semibold bg-gray-50 border-b border-radar-border/60">
                        切换端口 (严格角色隔离)
                      </div>
                      <div className="p-1 space-y-0.5 border-b border-radar-border/60">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('user');
                            showToast('已切换至【食客终端】', '仅开放食客权限，禁止伪造骑手对讲与商家账单');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'user' ? 'bg-sky-100 font-bold text-sky-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>👤 食客端</span>
                          {activeRole === 'user' && <span className="text-sky-600 font-mono text-[10px]">当前</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('rider');
                            showToast('已切换至【骑手车载端】', '已激活专线对讲与妥投存证权限');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'rider' ? 'bg-amber-100 font-bold text-amber-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>🛵 骑手车载端</span>
                          {activeRole === 'rider' && <span className="text-amber-600 font-mono text-[10px]">当前</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('merchant');
                            showToast('已切换至【商家档口端】', '已激活出餐质检与账单核销开具权限');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'merchant' ? 'bg-rose-100 font-bold text-rose-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>🍳 商家档口端</span>
                          {activeRole === 'merchant' && <span className="text-rose-600 font-mono text-[10px]">当前</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('platform');
                            showToast('已切换至【平台调度端】', '拥有全网基准时空广播与督办仲裁权限');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'platform' ? 'bg-purple-100 font-bold text-purple-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>🖥️ 平台调度端</span>
                          {activeRole === 'platform' && <span className="text-purple-600 font-mono text-[10px]">当前</span>}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          if (onOpenStore) onOpenStore();
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-radar-dark hover:bg-gray-100 transition-colors cursor-pointer mt-0.5 text-xs font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-radar-muted stroke-[1.5]" />
                        <span>进入档口餐车</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          showToast('已屏蔽该协同会话', '三端静默免打扰已生效');
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-radar-dark hover:bg-gray-100 transition-colors cursor-pointer text-xs font-medium"
                      >
                        <VolumeX className="w-3.5 h-3.5 text-radar-muted stroke-[1.5]" />
                        <span className="font-medium">屏蔽会话</span>
                      </button>
                      <div className="border-t border-radar-border/60 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          if (onBack) onBack();
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-radar-muted hover:bg-gray-100 hover:text-radar-dark transition-colors cursor-pointer text-xs font-medium"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
                        <span>返回动态</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scope Filter Tabs & Embedded Quick Actions */}
          <div className={`flex items-center justify-between gap-1 w-full ${embedded ? 'py-0.5' : ''}`}>
            {embedded ? (
              /* 嵌入模式：简化文字（全员 / 骑手 / 后厨）配合微胶囊，彻底修复移动端截断与溢出 */
              <nav className="inline-flex p-0.5 rounded-lg bg-neutral-100/90 border border-neutral-200/70 text-[11px] font-medium shrink-0" data-purpose="synergy-scope-selector">
                <button
                  type="button"
                  onClick={() => setActiveChannel('all')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap select-none ${
                    activeChannel === 'all'
                      ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                  title="三方全员协同"
                >
                  <Users className={`w-3 h-3 ${activeChannel === 'all' ? 'text-emerald-700' : 'text-neutral-400'}`} />
                  <span>全员</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChannel('rider')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap select-none ${
                    activeChannel === 'rider'
                      ? 'bg-white text-amber-800 font-bold shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                  title="专送骑手频道"
                >
                  <Bike className={`w-3 h-3 ${activeChannel === 'rider' ? 'text-amber-600' : 'text-neutral-400'}`} />
                  <span>骑手</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChannel('merchant')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap select-none ${
                    activeChannel === 'merchant'
                      ? 'bg-white text-rose-800 font-bold shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                  title="餐车后厨频道"
                >
                  <Flame className={`w-3 h-3 ${activeChannel === 'merchant' ? 'text-rose-600' : 'text-neutral-400'}`} />
                  <span>后厨</span>
                </button>
              </nav>
            ) : (
              /* 独立全屏模式：经典下划线切换栏 */
              <nav className="flex items-center gap-4 sm:gap-6 border-radar-border text-[12px] font-medium pt-1 px-1" data-purpose="synergy-scope-selector">
                <button
                  type="button"
                  onClick={() => setActiveChannel('all')}
                  className={`flex items-center justify-center gap-1.5 pb-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${
                    activeChannel === 'all'
                      ? 'border-radar-emerald text-emerald-800 font-bold'
                      : 'border-transparent text-radar-muted hover:text-radar-dark'
                  }`}
                >
                  <Users className={`w-3.5 h-3.5 ${activeChannel === 'all' ? 'text-emerald-700' : 'text-radar-muted'}`} />
                  <span>三方协同 (全员)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChannel('rider')}
                  className={`flex items-center justify-center gap-1.5 pb-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${
                    activeChannel === 'rider'
                      ? 'border-amber-500 text-amber-800 font-bold'
                      : 'border-transparent text-radar-muted hover:text-radar-dark'
                  }`}
                >
                  <Bike className={`w-3.5 h-3.5 ${activeChannel === 'rider' ? 'text-amber-600' : 'text-radar-muted'}`} />
                  <span>专送骑手</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChannel('merchant')}
                  className={`flex items-center justify-center gap-1.5 pb-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${
                    activeChannel === 'merchant'
                      ? 'border-rose-500 text-rose-800 font-bold'
                      : 'border-transparent text-radar-muted hover:text-radar-dark'
                  }`}
                >
                  <Flame className={`w-3.5 h-3.5 ${activeChannel === 'merchant' ? 'text-rose-600' : 'text-radar-muted'}`} />
                  <span>餐车后厨</span>
                </button>
              </nav>
            )}

            {/* Embedded Action Row */}
            {embedded && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsCallActive(!isCallActive);
                    showToast(isCallActive ? '通话已结束' : '正在呼叫专线金牌骑手 陈志远');
                  }}
                  className={`h-7 px-2 rounded-lg border flex items-center gap-1 text-[11px] font-medium transition-colors shadow-2xs cursor-pointer ${
                    isCallActive
                      ? 'bg-red-100 border-red-300 text-red-700 animate-pulse'
                      : 'bg-emerald-50 border-emerald-200/80 hover:bg-emerald-100 text-emerald-700'
                  }`}
                  title={isCallActive ? '挂断电话' : '紧急拨号'}
                >
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.28-.28.36-.67.25-1.02A11.36 11.36 0 018.59 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.59c0-.58-.45-1.03-1.03-1.03z" />
                  </svg>
                  <span className="inline">呼叫</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenStore) {
                      onOpenStore();
                    } else {
                      showToast('已跳转门店', '正在进入餐车档口实时菜单');
                    }
                  }}
                  className="h-7 px-2 rounded-lg bg-amber-50 border border-amber-300/80 hover:bg-amber-100 text-amber-800 flex items-center gap-1 text-[11px] font-medium transition-colors shadow-2xs group cursor-pointer"
                  title="进店查看"
                >
                  <svg className="w-3 h-3 text-amber-700 shrink-0 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 22V12h6v10" />
                  </svg>
                  <span className="inline">进店</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    id="embedded-more-menu-btn"
                    onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                    className="h-7 px-1.5 sm:px-2 rounded-lg bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200/80 flex items-center gap-0.5 sm:gap-1 text-[11px] font-medium text-neutral-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>操作</span>
                    <svg className="w-2.5 h-2.5 text-neutral-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isHeaderMenuOpen && (
                    <div id="embedded-dropdown-menu" className="absolute right-0 mt-1.5 w-44 bg-radar-surface border border-radar-border rounded-lg shadow-xl py-1 z-50 text-[12px]">
                      <div className="px-3 py-1 text-[10px] text-radar-muted font-semibold bg-gray-50 border-b border-radar-border/60">
                        切换端口 (严格角色隔离)
                      </div>
                      <div className="p-1 space-y-0.5 border-b border-radar-border/60">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('user');
                            showToast('已切换至【食客终端】', '仅开放食客权限，禁止伪造骑手对讲与商家账单');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'user' ? 'bg-sky-100 font-bold text-sky-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>👤 食客端</span>
                          {activeRole === 'user' && <span className="text-sky-600 font-mono text-[10px]">当前</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('rider');
                            showToast('已切换至【骑手车载端】', '已激活专线对讲与妥投存证权限');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'rider' ? 'bg-amber-100 font-bold text-amber-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>🛵 骑手车载端</span>
                          {activeRole === 'rider' && <span className="text-amber-600 font-mono text-[10px]">当前</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('merchant');
                            showToast('已切换至【商家档口端】', '已激活出餐质检与账单核销开具权限');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'merchant' ? 'bg-rose-100 font-bold text-rose-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>🍳 商家档口端</span>
                          {activeRole === 'merchant' && <span className="text-rose-600 font-mono text-[10px]">当前</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRole('platform');
                            showToast('已切换至【平台调度端】', '拥有全网基准时空广播与督办仲裁权限');
                            setIsHeaderMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            activeRole === 'platform' ? 'bg-purple-100 font-bold text-purple-900' : 'hover:bg-gray-100 text-radar-dark'
                          }`}
                        >
                          <span>🖥️ 平台调度端</span>
                          {activeRole === 'platform' && <span className="text-purple-600 font-mono text-[10px]">当前</span>}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          if (onOpenStore) onOpenStore();
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-radar-dark hover:bg-gray-100 transition-colors cursor-pointer mt-0.5 text-xs font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-radar-muted stroke-[1.5]" />
                        <span>进入档口餐车</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          showToast('已屏蔽该协同会话', '三端静默免打扰已生效');
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-radar-dark hover:bg-gray-100 transition-colors cursor-pointer text-xs font-medium"
                      >
                        <VolumeX className="w-3.5 h-3.5 text-radar-muted stroke-[1.5]" />
                        <span className="font-medium">屏蔽会话</span>
                      </button>
                      <div className="border-t border-radar-border/60 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          if (onBack) onBack();
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-radar-muted hover:bg-gray-100 hover:text-radar-dark transition-colors cursor-pointer text-xs font-medium"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
                        <span>返回动态</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        )}
        {/* END: TopHeader */}

        {/* BEGIN: MainContent (Scrollable with Momentum, Soft Gradient Masks, and Spring Entrance) */}
        <div className="relative flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-neutral-50/40">
          {/* Top subtle soft ambient edge when scrolled */}
          <div
            className={`absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/[0.04] to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
              showTopFade ? 'opacity-100' : 'opacity-0'
            }`}
          />

          <main
            ref={(node) => {
              viewportRef.current = node;
            }}
            onScroll={handleViewportScroll}
            className="flex-1 min-h-0 w-full p-3 sm:p-4 overflow-y-auto overscroll-y-contain scroll-smooth touch-pan-y space-y-3.5 no-scrollbar"
            id="synergy-message-viewport"
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
          
          {/* Secure Encryption Banner */}
          <div className="flex items-center justify-center py-0.5" data-purpose="security-encryption-banner">
            <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 select-none">
              <ShieldCheck className="w-3 h-3 text-emerald-600/70 shrink-0" />
              <span>会话已受云端隐私加密保护</span>
            </span>
          </div>

          {/* 对讲双工冲突与占线指示条 (方案 5) */}
          {intercomBusy.isBusy && intercomBusy.role !== activeRole && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/95 px-3 py-2 text-xs text-emerald-900 flex items-center justify-between shadow-2xs animate-pulse font-sans">
              <div className="flex items-center gap-2 min-w-0">
                <Radio className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                <span className="font-semibold truncate">
                  【{intercomBusy.speakerName || '协同成员'}】正在无线电对讲通话中...
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800 shrink-0 font-bold border border-emerald-300">
                信道占用
              </span>
            </div>
          )}

          {/* 弱网离线发信队列与韧性重发指示条 (方案 4) */}
          {isOfflineSim && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/95 px-3 py-2 text-xs text-amber-900 flex items-center justify-between shadow-2xs font-sans">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium truncate">
                  弱网离线仿真激活 · {pendingQueue.length > 0 ? `${pendingQueue.length} 条消息在本地发件箱挂起待重试` : '新发消息将挂起进入离线队列'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOfflineSim(false);
                  flushOfflineQueue();
                }}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-amber-700 text-white hover:bg-amber-800 cursor-pointer transition shrink-0 ml-2"
              >
                恢复联机重试
              </button>
            </div>
          )}

          {/* Messages Feed */}
          <div className="space-y-3" data-purpose="synergy-message-thread">
            {filteredMessages.length === 0 && renderContextTimeDivider(undefined, 'empty-initial')}
            {/* 智能旧消息折叠与展开状态条 */}
            {shouldFoldHistory && (
              <HistoryMessageFoldBanner
                foldedCount={foldedHistoryCount}
                totalCount={filteredMessages.length}
                isExpanded={isHistoryExpanded}
                onToggleExpand={() => {
                  setIsHistoryExpanded((prev) => !prev);
                  playChimeSound();
                }}
                foldedMessages={olderMessages}
                autoFoldEnabled={autoFoldEnabled}
                onToggleAutoFold={() => {
                  const next = !autoFoldEnabled;
                  setAutoFoldEnabled(next);
                  showToast(next ? '已开启旧消息智能折叠' : '已切换为全量展示模式', next ? '默认收纳早前历史对话' : '所有历史消息将全部展现');
                }}
              />
            )}

            {/* 展开的早前历史记录流 (平滑展开/收起过渡动效) */}
            {shouldFoldHistory && (
              <AnimatePresence initial={false}>
                {isHistoryExpanded && (
                  <motion.div
                    key="history-older-messages-stream"
                    initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    animate={{ opacity: 1, height: 'auto', transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.2, ease: [0.7, 0, 0.84, 0] } }}
                    className="space-y-3 pt-1"
                  >
                    {olderMessages.map((msg, index) => {
                      const isSelf = msg.senderRole === viewerRole;
                      const isSystem = msg.type === 'system_notice' || msg.senderRole === 'system';
                      const prevMsg = index > 0 ? olderMessages[index - 1] : undefined;
                      const showTimeDivider = shouldShowTimeDivider(msg, prevMsg);

                      if (isSystem) {
                        const cleanNotice = msg.text
                          .replace(/云函数\s*\(chatMessages\)\s*与云数据库\s*\(obsidian_order_chats\)\s*全程热备份。?/, '全程加密云端同步')
                          .replace(/已建立三端加密会话。?/, '已接入安全协同专线');

                        return (
                          <React.Fragment key={msg.id}>
                            {showTimeDivider && renderContextTimeDivider(msg.time, msg.id)}
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                              className="flex justify-center my-1.5"
                            >
                              <div className="inline-flex items-center gap-1.5 bg-neutral-100/90 text-neutral-600 text-[11px] px-3 py-1 rounded-full text-center max-w-[90%] shadow-2xs font-medium">
                                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{cleanNotice}</span>
                              </div>
                            </motion.div>
                          </React.Fragment>
                        );
                      }

                      const isCardBubble =
                        msg.type === 'voice' ||
                        msg.type === 'status_change' ||
                        msg.type === 'sla_supervision' ||
                        Boolean(msg.slaSupervision) ||
                        msg.text.startsWith('【餐车交互·') ||
                        msg.text.includes('来自食客桌台协同消息') ||
                        msg.text.includes('[IMAGE]:') ||
                        msg.text.startsWith('🧾') ||
                        msg.text.startsWith('🍲') ||
                        msg.text.startsWith('📑') ||
                        msg.text.startsWith('📍') ||
                        msg.text.startsWith('⚡') ||
                        msg.text.startsWith('🚨') ||
                        msg.text.startsWith('📢') ||
                        msg.text.startsWith('🚦') ||
                        msg.text.startsWith('🔥') ||
                        msg.text.startsWith('🌶️') ||
                        msg.text.startsWith('🧅') ||
                        msg.text.startsWith('🧊') ||
                        msg.text.startsWith('🥢') ||
                        msg.text.startsWith('📦');

                      const isPureEmoji =
                        !isCardBubble &&
                        /^(\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]|\s)+$/u.test(msg.text.trim()) &&
                        msg.text.trim().length <= 16;

                      const isSending = msg.deliveryStatus === 'sending';
                      const isFirstMessage = msg.id === filteredMessages[0]?.id;

                          const isHighlighted = highlightedMsgId === msg.id;

                          return (
                            <React.Fragment key={msg.id}>
                              {showTimeDivider && renderContextTimeDivider(msg.time, msg.id)}
                              <motion.div
                                id={`chat-msg-${msg.id}`}
                                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.5 }}
                                onMouseEnter={() => setHoveredMsgId(msg.id)}
                                onMouseLeave={() => setHoveredMsgId(null)}
                                className={`relative group flex items-start gap-2 max-w-full ${isSelf ? 'flex-row-reverse' : 'flex-row'} transition-all duration-300 ${
                                  isHighlighted ? 'z-10' : ''
                                }`}
                              >
                                {/* 专属角色头像 */}
                                <div className="shrink-0 mt-0.5 select-none" data-purpose="chat-avatar">
                                  {renderMessageAvatar(msg.senderRole, msg.senderName, isSelf)}
                                </div>

                                <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-[calc(100%-2.6rem)] min-w-0`}>
                                  {hoveredMsgId === msg.id && (
                                    <div className={`absolute -top-7.5 ${isSelf ? 'right-9' : 'left-9'} z-20`}>
                                      <FeishuMessageActions
                                        message={msg}
                                        activeRole={activeRole}
                                        isSelf={isSelf}
                                        onQuoteReply={(m) => {
                                          setQuotedMessage(m);
                                          inputRef.current?.focus();
                                        }}
                                        onOpenReadReceipt={(m) => setSelectedReceiptMessage(m)}
                                        onToggleReaction={handleToggleReaction}
                                        onRecallMessage={handleRecallMessage}
                                        showToast={showToast}
                                      />
                                    </div>
                                  )}

                                  {!isSelf && (
                                    <div className="flex items-center gap-1.5 text-[11px] font-mono select-none pl-1 text-neutral-500 mb-0.5">
                                      <span className="font-semibold text-neutral-700">{msg.senderName}</span>
                                      {getSenderRoleBadge(msg.senderRole)}
                                    </div>
                                  )}

                                <motion.div
                                  animate={isSending ? { scale: [0.99, 1, 0.99] } : { scale: 1 }}
                                  transition={isSending ? { repeat: Infinity, duration: 1.2 } : { duration: 0.2 }}
                                  className={`relative transition-all duration-300 ${
                                    isHighlighted
                                      ? 'ring-4 ring-amber-400/90 ring-offset-2 ring-offset-neutral-50 shadow-lg scale-[1.01]'
                                      : ''
                                  } ${
                                    isSending ? 'opacity-85 ring-1 ring-neutral-400/40' : ''
                                  } ${
                                    isPureEmoji
                                      ? 'bg-transparent shadow-none p-0'
                                      : isCardBubble
                                      ? 'p-0 shadow-sm rounded-2xl overflow-hidden active:scale-[0.99] transition-transform duration-150'
                                      : isSelf
                                      ? 'bg-neutral-900 text-white rounded-2xl rounded-br-xs px-3.5 py-2 shadow-sm text-[13px] leading-relaxed max-w-[92%] sm:max-w-[85%] break-words active:scale-[0.99] transition-transform duration-150 font-normal'
                                      : 'bg-white/95 backdrop-blur-md text-neutral-800 rounded-2xl rounded-bl-xs px-3.5 py-2 shadow-sm border border-neutral-200/90 text-[13px] leading-relaxed max-w-[92%] sm:max-w-[85%] break-words active:scale-[0.99] transition-transform duration-150 font-normal'
                                  }`}
                                >
                                  <MaterialMessageBubble
                                    text={msg.text}
                                    isSelf={isSelf}
                                    senderRole={msg.senderRole}
                                    senderName={msg.senderName}
                                    time={msg.time}
                                    type={msg.type}
                                    voiceDuration={msg.voiceDuration}
                                    voiceTranscribed={msg.voiceTranscribed}
                                    voiceAudioUrl={msg.voiceAudioUrl}
                                    voiceAudioBase64={msg.voiceAudioBase64}
                                    voiceWaveform={msg.voiceWaveform}
                                    isListened={msg.isListened}
                                    onVoiceListened={() => markVoiceMessageListened(currentOrderNo, msg.id)}
                                    isRecalled={msg.isRecalled}
                                    recalledBy={msg.recalledBy}
                                    originalTextBeforeRecall={msg.originalTextBeforeRecall}
                                    onReEditRecall={(orig) => {
                                      setInputText(orig);
                                      inputRef.current?.focus();
                                      showToast('已载入撤回内容', '可重新编辑后发出');
                                    }}
                                    exceptionWorkflow={msg.exceptionWorkflow}
                                    onWorkflowAction={(action, payload) => handleWorkflowAction(msg.id, action, payload)}
                                    orderNo={currentOrderNo}
                                    messageId={msg.id}
                                    slaSupervision={msg.slaSupervision}
                                    onSLAAction={(action, payload) => handleSLAAction(msg.id, action, payload)}
                                    statusChangeInfo={msg.statusChangeInfo}
                                    quoteReply={msg.quoteReply}
                                    onLocateMessage={handleLocateMessage}
                                    showToast={showToast}
                                    playWalkieTalkieBeep={playWalkieTalkieBeep}
                                    playChimeSound={playChimeSound}
                                    paymentStatus={msg.paymentStatus}
                                    viewerRole={activeRole}
                                    onPayBill={handlePayBillCard}
                                    onRemindPayment={handleRemindPayment}
                                    onConfirmPaymentReceived={handleConfirmPaymentReceived}
                                    onQuickAction={(actionType, payload) => {
                                      if (actionType === 'confirm_dish' && payload) {
                                        handleSendMessage(`已确认加单：【${payload.name}】(¥${payload.price})，请后厨安排合并现烤！`);
                                      }
                                    }}
                                  />
                                </motion.div>

                                <FeishuReactionsRow
                                  reactions={msg.reactions}
                                  activeRole={activeRole}
                                  onToggleReaction={(emoji) => handleToggleReaction(msg.id, emoji)}
                                />

                                {isFirstMessage ? (
                                  <div className="w-full mt-1.5 mb-1">
                                    <FeishuReadReceiptCapsule
                                      message={msg}
                                      order={fullOrder}
                                      activeRole={activeRole}
                                      isFirstMessage={true}
                                      isSelf={isSelf}
                                      showToast={showToast}
                                      playChimeSound={playChimeSound}
                                      onOpenModal={() => setSelectedReceiptMessage(msg)}
                                    />
                                  </div>
                                ) : (
                                  activeRole !== 'platform' &&
                                  msg.senderRole !== 'system' && (
                                    <div className={`flex items-center gap-1.5 mt-0.5 select-none font-mono ${isSelf ? 'pr-1 justify-end' : 'pl-1 justify-start'}`}>
                                      {isSelf && isSending ? (
                                        <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                                          <Loader2 className="w-2.5 h-2.5 animate-spin text-neutral-400" />
                                          <span>发送中...</span>
                                        </div>
                                      ) : (
                                        <FeishuReadReceiptCapsule
                                          message={msg}
                                          order={fullOrder}
                                          activeRole={activeRole}
                                          isFirstMessage={false}
                                          isSelf={isSelf}
                                          compact={true}
                                          showToast={showToast}
                                          playChimeSound={playChimeSound}
                                          onOpenModal={() => setSelectedReceiptMessage(msg)}
                                        />
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </motion.div>
                      </React.Fragment>
                    );
                  })}

                    {/* 历史消息与实况动态之间的视觉停靠指示器 */}
                    <div className="flex items-center justify-center py-2 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          setIsHistoryExpanded(false);
                          playChimeSound();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600 text-[11px] font-medium border border-neutral-200/80 shadow-2xs transition active:scale-[0.98] cursor-pointer"
                        title="点击快速收起早前记录，聚焦最新消息"
                      >
                        <span>早前记录已全部呈现 · 点击快速收起</span>
                        <ChevronUp className="w-3 h-3 text-neutral-500" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* 最新动态消息列表 */}
            {recentMessages.map((msg, index) => {
              const isSelf = msg.senderRole === viewerRole;
              const isSystem = msg.type === 'system_notice' || msg.senderRole === 'system';
              const prevMsg = index > 0
                ? recentMessages[index - 1]
                : olderMessages.length > 0
                ? olderMessages[olderMessages.length - 1]
                : undefined;
              const showTimeDivider = shouldShowTimeDivider(msg, prevMsg);

              if (isSystem) {
                // 极简系统提示：移除冗长底层代码表名字样
                const cleanNotice = msg.text
                  .replace(/云函数\s*\(chatMessages\)\s*与云数据库\s*\(obsidian_order_chats\)\s*全程热备份。?/, '全程加密云端同步')
                  .replace(/已建立三端加密会话。?/, '已接入安全协同专线');

                return (
                  <React.Fragment key={msg.id}>
                    {showTimeDivider && renderContextTimeDivider(msg.time, msg.id)}
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                      className="flex justify-center my-1.5"
                    >
                      <div className="inline-flex items-center gap-1.5 bg-neutral-100/90 text-neutral-600 text-[11px] px-3 py-1 rounded-full text-center max-w-[90%] shadow-2xs font-medium">
                        <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{cleanNotice}</span>
                      </div>
                    </motion.div>
                  </React.Fragment>
                );
              }

              // 判断是否为独立卡片/特殊素材 (拥有自包含的卡片样式，无需外层厚重底色包裹)
              const isCardBubble =
                msg.type === 'voice' ||
                msg.type === 'status_change' ||
                msg.type === 'sla_supervision' ||
                Boolean(msg.slaSupervision) ||
                msg.text.startsWith('【餐车交互·') ||
                msg.text.includes('来自食客桌台协同消息') ||
                msg.text.includes('[IMAGE]:') ||
                msg.text.startsWith('🧾') ||
                msg.text.startsWith('🍲') ||
                msg.text.startsWith('📑') ||
                msg.text.startsWith('📍') ||
                msg.text.startsWith('⚡') ||
                msg.text.startsWith('🚨') ||
                msg.text.startsWith('📢') ||
                msg.text.startsWith('🚦') ||
                msg.text.startsWith('🔥') ||
                msg.text.startsWith('🌶️') ||
                msg.text.startsWith('🧅') ||
                msg.text.startsWith('🧊') ||
                msg.text.startsWith('🥢') ||
                msg.text.startsWith('📦');

              const isPureEmoji =
                !isCardBubble &&
                /^(\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]|\s)+$/u.test(msg.text.trim()) &&
                msg.text.trim().length <= 16;

              const isSending = msg.deliveryStatus === 'sending';
              const isFirstMessage = msg.id === filteredMessages[0]?.id;

              const isHighlighted = highlightedMsgId === msg.id;

              return (
                <React.Fragment key={msg.id}>
                  {showTimeDivider && renderContextTimeDivider(msg.time, msg.id)}
                  <motion.div
                    id={`chat-msg-${msg.id}`}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 28,
                      mass: 0.5
                    }}
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}
                    className={`relative group flex items-start gap-2 max-w-full ${isSelf ? 'flex-row-reverse' : 'flex-row'} transition-all duration-300 ${
                      isHighlighted ? 'z-10' : ''
                    }`}
                  >
                    {/* 专属角色头像 */}
                    <div className="shrink-0 mt-0.5 select-none" data-purpose="chat-avatar">
                      {renderMessageAvatar(msg.senderRole, msg.senderName, isSelf)}
                    </div>

                    <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-[calc(100%-2.6rem)] min-w-0`}>
                      {hoveredMsgId === msg.id && (
                        <div className={`absolute -top-7.5 ${isSelf ? 'right-9' : 'left-9'} z-20`}>
                          <FeishuMessageActions
                            message={msg}
                            activeRole={activeRole}
                            isSelf={isSelf}
                            onQuoteReply={(m) => {
                              setQuotedMessage(m);
                              inputRef.current?.focus();
                            }}
                            onOpenReadReceipt={(m) => setSelectedReceiptMessage(m)}
                            onToggleReaction={handleToggleReaction}
                            onRecallMessage={handleRecallMessage}
                            showToast={showToast}
                          />
                        </div>
                      )}

                      {!isSelf && (
                        <div className="flex items-center gap-1.5 text-[11px] font-mono select-none pl-1 text-neutral-500 mb-0.5">
                          <span className="font-semibold text-neutral-700">{msg.senderName}</span>
                          {getSenderRoleBadge(msg.senderRole)}
                        </div>
                      )}

                    <motion.div
                      animate={isSending ? { scale: [0.99, 1, 0.99] } : { scale: 1 }}
                      transition={isSending ? { repeat: Infinity, duration: 1.2 } : { duration: 0.2 }}
                      className={`relative transition-all duration-300 ${
                        isHighlighted
                          ? 'ring-4 ring-amber-400/90 ring-offset-2 ring-offset-neutral-50 shadow-lg scale-[1.01]'
                          : ''
                      } ${
                        isSending ? 'opacity-85 ring-1 ring-neutral-400/40' : ''
                      } ${
                        isPureEmoji
                          ? 'bg-transparent shadow-none p-0'
                          : isCardBubble
                          ? 'p-0 shadow-sm rounded-2xl overflow-hidden active:scale-[0.99] transition-transform duration-150'
                          : isSelf
                          ? 'bg-neutral-900 text-white rounded-2xl rounded-br-xs px-3.5 py-2 shadow-sm text-[13px] leading-relaxed max-w-[92%] sm:max-w-[85%] break-words active:scale-[0.99] transition-transform duration-150 font-normal'
                          : 'bg-white/95 backdrop-blur-md text-neutral-800 rounded-2xl rounded-bl-xs px-3.5 py-2 shadow-sm border border-neutral-200/90 text-[13px] leading-relaxed max-w-[92%] sm:max-w-[85%] break-words active:scale-[0.99] transition-transform duration-150 font-normal'
                      }`}
                    >
                      <MaterialMessageBubble
                        text={msg.text}
                        isSelf={isSelf}
                        senderRole={msg.senderRole}
                        senderName={msg.senderName}
                        time={msg.time}
                        type={msg.type}
                        voiceDuration={msg.voiceDuration}
                        voiceTranscribed={msg.voiceTranscribed}
                        voiceAudioUrl={msg.voiceAudioUrl}
                        voiceAudioBase64={msg.voiceAudioBase64}
                        voiceWaveform={msg.voiceWaveform}
                        isListened={msg.isListened}
                        onVoiceListened={() => markVoiceMessageListened(currentOrderNo, msg.id)}
                        isRecalled={msg.isRecalled}
                        recalledBy={msg.recalledBy}
                        originalTextBeforeRecall={msg.originalTextBeforeRecall}
                        onReEditRecall={(orig) => {
                          setInputText(orig);
                          inputRef.current?.focus();
                          showToast('已载入撤回内容', '可重新编辑后发出');
                        }}
                        exceptionWorkflow={msg.exceptionWorkflow}
                        onWorkflowAction={(action, payload) => handleWorkflowAction(msg.id, action, payload)}
                        orderNo={currentOrderNo}
                        messageId={msg.id}
                        slaSupervision={msg.slaSupervision}
                        onSLAAction={(action, payload) => handleSLAAction(msg.id, action, payload)}
                        statusChangeInfo={msg.statusChangeInfo}
                        quoteReply={msg.quoteReply}
                        onLocateMessage={handleLocateMessage}
                        showToast={showToast}
                        playWalkieTalkieBeep={playWalkieTalkieBeep}
                        playChimeSound={playChimeSound}
                        paymentStatus={msg.paymentStatus}
                        viewerRole={activeRole}
                        onPayBill={handlePayBillCard}
                        onRemindPayment={handleRemindPayment}
                        onConfirmPaymentReceived={handleConfirmPaymentReceived}
                        onQuickAction={(actionType, payload) => {
                          if (actionType === 'confirm_dish' && payload) {
                            handleSendMessage(`已确认加单：【${payload.name}】(¥${payload.price})，请后厨安排合并现烤！`);
                          }
                        }}
                      />
                    </motion.div>

                  {/* 飞书/Slack风格表情表态徽章列表 */}
                  <FeishuReactionsRow
                    reactions={msg.reactions}
                    activeRole={activeRole}
                    onToggleReaction={(emoji) => handleToggleReaction(msg.id, emoji)}
                  />

                  {/* 钉钉/飞书风格已读未读胶囊与首条消息全链路已读看板 */}
                  {isFirstMessage ? (
                    <div className="w-full mt-1.5 mb-1">
                      <FeishuReadReceiptCapsule
                        message={msg}
                        order={fullOrder}
                        activeRole={activeRole}
                        isFirstMessage={true}
                        isSelf={isSelf}
                        showToast={showToast}
                        playChimeSound={playChimeSound}
                        onOpenModal={() => setSelectedReceiptMessage(msg)}
                      />
                    </div>
                  ) : (
                    activeRole !== 'platform' &&
                    msg.senderRole !== 'system' && (
                      <div className={`flex items-center gap-1.5 mt-0.5 select-none font-mono ${isSelf ? 'pr-1 justify-end' : 'pl-1 justify-start'}`}>
                        {isSelf && isSending ? (
                          <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-neutral-400" />
                            <span>发送中...</span>
                          </div>
                        ) : (
                          <FeishuReadReceiptCapsule
                            message={msg}
                            order={fullOrder}
                            activeRole={activeRole}
                            isFirstMessage={false}
                            isSelf={isSelf}
                            compact={!isSelf || msg.id !== latestSelfMessageId}
                            showToast={showToast}
                            playChimeSound={playChimeSound}
                            onOpenModal={() => setSelectedReceiptMessage(msg)}
                          />
                        )}
                      </div>
                    )
                  )}
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })}

            <div ref={chatBottomRef} />
          </div>
        </main>

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
      {/* END: MainContent */}

        {/* BEGIN: BottomInteractiveDock */}
        <footer className="shrink-0 w-full bg-white/95 backdrop-blur-md border-t border-neutral-200/80 pt-1.5 pb-2.5 sm:pb-3 px-2 sm:px-3 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          
          {/* Quick Speech / Auto-Response Button Sliders (Role-Aware & Unified Capsule Aesthetic) */}
          <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 relative touch-pan-x" data-purpose="quick-replies-tray">
            {activeRole === 'rider' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSendIntercomPhrase()}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200/90 text-emerald-900 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <Radio className="w-3.5 h-3.5 text-emerald-600 stroke-[1.5]" />
                  <span>车载无线电</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('🛵 保温箱已密闭锁温，正在全速派送途中！')}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300 text-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Bike className="w-3.5 h-3.5 text-neutral-500 stroke-[1.5]" />
                  <span>全速派送中</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('🚪 餐品已妥善放至自提点/外卖架，请查收！')}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300 text-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <PackageCheck className="w-3.5 h-3.5 text-neutral-500 stroke-[1.5]" />
                  <span>已放外卖架</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendLocation()}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300 text-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 stroke-[1.5]" />
                  <span>广播车载GPS</span>
                </button>
              </>
            ) : activeRole === 'merchant' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSendMessage('🔥 现烤出炉装箱，双封签保温锁温中！')}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-amber-50 hover:bg-amber-100/90 border border-amber-200/90 text-amber-900 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-600 stroke-[1.5]" />
                  <span>已出炉保温装箱</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendInvoiceCard()}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300 text-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Receipt className="w-3.5 h-3.5 text-neutral-500 stroke-[1.5]" />
                  <span>签发核销账单</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('🥢 主副餐及特调酱汁调料包已全量核验齐全！')}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300 text-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-neutral-500 stroke-[1.5]" />
                  <span>配料齐全验真</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300 text-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Camera className="w-3.5 h-3.5 text-neutral-500 stroke-[1.5]" />
                  <span>后厨质检拍照</span>
                </button>
              </>
            ) : activeRole === 'platform' ? (
              <>
                <button
                  type="button"
                  onClick={() => triggerExpediteUrge()}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-amber-50 hover:bg-amber-100/90 border border-amber-200/90 text-amber-900 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <BellRing className="w-3.5 h-3.5 text-amber-600 stroke-[1.5]" />
                  <span>平台督办督促</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendLocation()}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300 text-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <MapPin className="w-3.5 h-3.5 text-neutral-500 stroke-[1.5]" />
                  <span>广播基准坐标</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('⚖️ 协同各方网络与坐标基准已校准，专线运转良好。')}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300 text-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-500 stroke-[1.5]" />
                  <span>链路状态校准</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSendMessage('⚡ 麻烦主厨与骑手协助加急，请问大概还需要多久？')}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-amber-50 hover:bg-amber-100/90 border border-amber-200/90 text-amber-900 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600 stroke-[1.5]" />
                  <span>催单加急</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('📦 麻烦送达后直接放外卖架，非常感谢！')}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300 text-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Package className="w-3.5 h-3.5 text-neutral-500 stroke-[1.5]" />
                  <span>放外卖架</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('📞 到达大楼前请提前电话联系，我及时下楼取餐。')}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300 text-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Phone className="w-3.5 h-3.5 text-neutral-500 stroke-[1.5]" />
                  <span>提前电联</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('🍔 炭烤汉堡肉汁饱满，路上辛苦注意防颠簸！')}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300 text-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-neutral-500 stroke-[1.5]" />
                  <span>注意防颠</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('🥢 麻烦后厨随单多配一副餐具与餐巾纸。')}
                  className="shrink-0 h-7 px-2.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300 text-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-neutral-500 stroke-[1.5]" />
                  <span>多配餐具</span>
                </button>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {/* Live Voice Recording Status & Waveform Bar in Synergy Room */}
            <AnimatePresence>
              {isVoiceRecording && (
                <motion.div
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: 10, height: 0 }}
                  className="mb-2 bg-gradient-to-r from-sky-50 via-white to-sky-50 border border-sky-200/90 rounded-xl p-2.5 shadow-sm space-y-2 overflow-hidden"
                >
                  <div className="flex items-center justify-between text-xs text-sky-950 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      <span className="font-bold text-neutral-900">
                        正在录音 ({voiceRecordDuration}s / 60s)
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-mono">
                        {voiceMicMode === 'real_mic' ? '真实麦克风' : '对讲电台'}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500">再次点击麦克风或点击右侧发送</span>
                  </div>

                  {/* 实时动态声波 */}
                  <div className="flex items-center justify-center gap-1 h-7 bg-sky-900/5 rounded-lg px-2">
                    {voiceLiveWaveform.map((h, i) => (
                      <span
                        key={i}
                        style={{ height: `${Math.max(15, h)}%` }}
                        className="w-1 bg-sky-600 rounded-full transition-all duration-75"
                      />
                    ))}
                  </div>

                  {/* 实时转写文字预览 */}
                  <div className="text-[11px] text-neutral-800 bg-white p-2 rounded-lg border border-neutral-200 flex items-start gap-1.5 shadow-2xs">
                    <FileText className="w-3.5 h-3.5 text-neutral-600 stroke-[1.5] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-neutral-900 mr-1">实时转写：</span>
                      <span className="text-neutral-700">{voiceLiveTranscript || '正在聆听麦克风语音输入...'}</span>
                    </div>
                  </div>

                  {/* 操作快捷按钮组 */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-sky-100/80">
                    <button
                      type="button"
                      onClick={handleCancelVoiceRecording}
                      className="px-2.5 py-1 text-xs text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer font-medium"
                    >
                      取消录制
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleTranscribeToInput}
                        className="px-2.5 py-1 text-xs bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-md transition cursor-pointer font-medium shadow-2xs"
                      >
                        转文字输入
                      </button>
                      <button
                        type="button"
                        onClick={handleStopAndSendVoice}
                        className="px-3 py-1 text-xs bg-neutral-900 hover:bg-black text-white rounded-md transition cursor-pointer font-bold shadow-2xs flex items-center gap-1"
                      >
                        <Send className="w-3 h-3 text-sky-400" />
                        发送语音
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 飞书风格引用回复浮条 */}
            <FeishuQuoteBanner
              quotedMessage={quotedMessage}
              onCancel={() => setQuotedMessage(null)}
            />

            {/* Input Bar Row (输入框祖元素置于上方) */}
            <div className="relative w-full rounded-lg shrink-0 z-30" data-purpose="chat-input-bar">
              <div className="flex items-center gap-1.5 transition-all duration-200">
                {/* 真实麦克风语音对讲录制按键 */}
                <button
                  type="button"
                  id="chat-mic-voice-btn"
                  onClick={() => {
                    if (isVoiceRecording) {
                      handleStopAndSendVoice();
                    } else {
                      handleStartVoiceRecording();
                    }
                  }}
                  className={`w-8 sm:w-9 h-8 sm:h-9 rounded-xl border transition-all shrink-0 flex items-center justify-center shadow-sm cursor-pointer active:scale-95 ${
                    isVoiceRecording
                      ? 'bg-rose-600 text-white border-rose-700 animate-pulse shadow-md'
                      : 'bg-white/90 hover:bg-neutral-100 backdrop-blur-md border-neutral-200/90 text-neutral-700'
                  }`}
                  title={isVoiceRecording ? '点击立即发送真实录音' : '点击开启真实麦克风录音'}
                >
                  <Mic className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${isVoiceRecording ? 'text-white' : 'text-neutral-700'}`} />
                </button>

                {/* 文本输入框与素材扩展按钮组 */}
                <div
                  className="flex-1 min-w-0 flex items-center bg-neutral-50/90 hover:bg-white focus-within:bg-white border border-neutral-200/90 focus-within:border-neutral-900 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl transition-all shadow-sm focus-within:ring-1 focus-within:ring-neutral-900/10"
                >
                  <input
                    ref={inputRef}
                    id="chat-message-input"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onFocus={() => {
                      if (isTacticalTrayOpen) {
                        setIsTacticalTrayOpen(false);
                        setDragDisplacementY(0);
                      }
                      if (isEmojiLibraryOpen) {
                        setIsEmojiLibraryOpen(false);
                      }
                      if (isMaterialToolsOpen) {
                        setIsMaterialToolsOpen(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 min-w-0 bg-transparent border-0 p-0 text-base sm:text-xs text-neutral-900 placeholder-neutral-400 font-medium focus:ring-0 focus:outline-none"
                    placeholder={
                      activeRole === 'rider'
                        ? '【骑手车载专线】输入配送协同指令或对讲...'
                        : activeRole === 'merchant'
                        ? '【餐车档口中枢】输入现烤出餐或核销通告...'
                        : activeRole === 'platform'
                        ? '【平台调度总控】输入监管督办或调度广播...'
                        : '【食客端】输入协同消息或向骑手/档口提问...'
                    }
                    type="text"
                  />
                  <div className="flex items-center gap-1 text-neutral-400 shrink-0 ml-1.5 border-l border-neutral-200/90 pl-1.5">
                    {/* Button 1: Emoji & Reaction Library */}
                    <button
                      type="button"
                      id="toggle-emoji-library-trigger"
                      onClick={() => {
                        setIsEmojiLibraryOpen((prev) => !prev);
                        setIsTacticalTrayOpen(false);
                        setDragDisplacementY(0);
                        setIsMaterialToolsOpen(false);
                      }}
                      className={`transition p-1 sm:p-1.5 rounded-lg cursor-pointer flex items-center justify-center shrink-0 ${
                        isEmojiLibraryOpen
                          ? 'text-emerald-700 bg-emerald-100/70 shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                      }`}
                      title="表情与速发素材库"
                    >
                      <Smile className="w-4 h-4 stroke-[1.75]" />
                    </button>

                    {/* Consolidated Button 2: Tactical & Extended Tools Panel */}
                    <button
                      type="button"
                      id="toggle-actions-trigger"
                      onClick={() => {
                        setIsTacticalTrayOpen((prev) => {
                          const next = !prev;
                          if (next) {
                            inputRef.current?.blur();
                            setDragDisplacementY(0);
                          }
                          return next;
                        });
                        setIsEmojiLibraryOpen(false);
                        setIsMaterialToolsOpen(false);
                      }}
                      className={`transition p-1 sm:p-1.5 rounded-lg focus:outline-none cursor-pointer flex items-center justify-center shrink-0 ${
                        isTacticalTrayOpen
                          ? 'text-neutral-950 bg-neutral-200 shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                      }`}
                      title="协同动作、话术与工具箱"
                    >
                      <Plus className={`w-4 h-4 stroke-[2] transition-transform duration-200 ${isTacticalTrayOpen ? 'rotate-45 text-neutral-900' : ''}`} />
                    </button>

                    {/* Hidden/accessible compatibility button for tests/specs expecting toggle-material-tools-trigger */}
                    <button
                      type="button"
                      id="toggle-material-tools-trigger"
                      aria-label="更多选项与扩展素材库"
                      onClick={() => {
                        setActiveTacticalTab('tools');
                        setIsTacticalTrayOpen(true);
                        setIsEmojiLibraryOpen(false);
                        setIsMaterialToolsOpen(false);
                      }}
                      className="sr-only"
                    >
                      更多选项与素材
                    </button>
                  </div>
                </div>

                {/* 消息发送按钮 */}
                <button
                  type="button"
                  id="chat-send-message-btn"
                  onClick={() => handleSendMessage()}
                  aria-label="发送消息"
                  className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl bg-neutral-900 hover:bg-black active:bg-neutral-800 text-white flex items-center justify-center gap-1 active:scale-95 transition-all shrink-0 shadow-sm cursor-pointer font-bold text-xs tracking-tight"
                >
                  <Send className="w-3.5 h-3.5 -translate-y-px" />
                  <span className="hidden sm:inline">发送</span>
                </button>
              </div>
            </div>

            {/* 1. Emoji & Expressive Material Library Drawer (Button 1) - 置于输入框之下 */}
            {isEmojiLibraryOpen && (
              <div className="bg-white/95 backdrop-blur-md border border-radar-border rounded-xl p-3 shadow-craft animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-3 max-h-[42vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-radar-border/70 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-radar-dark flex items-center gap-1">
                      <span>😊</span>
                      <span>表情与速发素材库</span>
                    </span>
                    <div className="flex items-center gap-1 bg-radar-bg p-0.5 rounded-lg text-[10.5px]">
                      <button
                        type="button"
                        onClick={() => setActiveEmojiCategory('emojis')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeEmojiCategory === 'emojis'
                            ? 'bg-white font-bold text-radar-dark shadow-2xs'
                            : 'text-radar-muted hover:text-radar-dark'
                        }`}
                      >
                        常用表情 ({EMOJI_LIST.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveEmojiCategory('status')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeEmojiCategory === 'status'
                            ? 'bg-white font-bold text-radar-dark shadow-2xs'
                            : 'text-radar-muted hover:text-radar-dark'
                        }`}
                      >
                        履约态势短语
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveEmojiCategory('custom')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeEmojiCategory === 'custom'
                            ? 'bg-white font-bold text-radar-dark shadow-2xs'
                            : 'text-radar-muted hover:text-radar-dark'
                        }`}
                      >
                        口味与加料
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEmojiLibraryOpen(false)}
                    className="text-radar-muted hover:text-radar-dark p-1 rounded-md hover:bg-black/5 cursor-pointer text-xs"
                    title="关闭素材库"
                  >
                    ✕
                  </button>
                </div>

                {/* Sub Tab: Emojis Grid */}
                {activeEmojiCategory === 'emojis' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-radar-muted px-1">
                      <span>点击直接填入输入框，双击可直接全员速发：</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                        全平台原生适配
                      </span>
                    </div>
                    <div className="grid grid-cols-8 gap-2 max-h-44 overflow-y-auto p-1 bg-radar-bg/40 rounded-lg border border-radar-border/40">
                      {EMOJI_LIST.map((emo, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setInputText((prev) => prev + emo);
                            inputRef.current?.focus();
                          }}
                          onDoubleClick={() => {
                            handleSendMessage(emo);
                            setIsEmojiLibraryOpen(false);
                          }}
                          className="text-xl p-2 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-radar-border/60 rounded-xl transition active:scale-95 cursor-pointer flex items-center justify-center shadow-2xs hover:shadow-xs group"
                          title={`${emo} (单击填入，双击速发)`}
                        >
                          <span className="group-hover:scale-125 transition-transform">{emo}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub Tab: Status Phrases */}
                {activeEmojiCategory === 'status' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {STATUS_PHRASES.map((phrase, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-radar-bg/60 hover:bg-emerald-50/70 border border-radar-border hover:border-emerald-300/80 transition flex items-center justify-between gap-2 group"
                      >
                        <span className="text-xs text-radar-dark truncate font-medium flex-1">
                          {phrase}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setInputText(phrase);
                              inputRef.current?.focus();
                            }}
                            className="px-1.5 py-0.5 text-[10.5px] text-radar-muted hover:text-radar-dark hover:bg-white rounded border border-transparent hover:border-radar-border cursor-pointer transition"
                            title="填入输入框"
                          >
                            填入
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleSendMessage(phrase);
                              setIsEmojiLibraryOpen(false);
                            }}
                            className="px-2 py-0.5 text-[10.5px] bg-[#1a1a17] hover:bg-black text-white rounded font-medium cursor-pointer transition active:scale-95 shadow-2xs"
                            title="立即发送到会话"
                          >
                            发送
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sub Tab: Taste / Packing Phrases */}
                {activeEmojiCategory === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {CUSTOM_TASTE_PHRASES.map((phrase, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-radar-bg/60 hover:bg-rose-50/70 border border-radar-border hover:border-rose-300/80 transition flex items-center justify-between gap-2 group"
                      >
                        <span className="text-xs text-radar-dark truncate font-medium flex-1">
                          {phrase}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setInputText(phrase);
                              inputRef.current?.focus();
                            }}
                            className="px-1.5 py-0.5 text-[10.5px] text-radar-muted hover:text-radar-dark hover:bg-white rounded border border-transparent hover:border-radar-border cursor-pointer transition"
                            title="填入输入框"
                          >
                            填入
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleSendMessage(phrase);
                              setIsEmojiLibraryOpen(false);
                            }}
                            className="px-2 py-0.5 text-[10.5px] bg-rose-700 hover:bg-rose-800 text-white rounded font-medium cursor-pointer transition active:scale-95 shadow-2xs"
                            title="立即发送到会话"
                          >
                            发送
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. Tactical Actions & Operational Phrases Library Drawer (Button 2) */}
            {isTacticalTrayOpen && (
              <>
                {/* 遮罩背景：轻触背景即可快速收起快捷协同面板 */}
                <div
                  className="fixed inset-0 z-20 bg-black/15 backdrop-blur-[0.5px] transition-opacity cursor-pointer"
                  onClick={() => {
                    setIsTacticalTrayOpen(false);
                    setDragDisplacementY(0);
                  }}
                />

                <div
                  id="tactical-actions-tray"
                  onTouchStart={(e) => {
                    trayTouchStartXRef.current = e.touches[0].clientX;
                    trayTouchStartYRef.current = e.touches[0].clientY;
                  }}
                  onTouchEnd={(e) => {
                    const dx = e.changedTouches[0].clientX - trayTouchStartXRef.current;
                    const dy = e.changedTouches[0].clientY - trayTouchStartYRef.current;
                    // 仅在明确水平为主导的滑动手势时切换 Tab，避免干扰内容上下正常滚动
                    if (Math.abs(dx) > 48 && Math.abs(dx) > 1.35 * Math.abs(dy)) {
                      const tabs = availableTacticalTabs;
                      const idx = tabs.findIndex((t) => t.id === activeTacticalTab);
                      if (dx < 0 && idx < tabs.length - 1) {
                        setActiveTacticalTab(tabs[idx + 1].id);
                        playChimeSound();
                        showToast(`已切换至【${tabs[idx + 1].label}】`, '滑动手势快速切页');
                      } else if (dx > 0 && idx > 0) {
                        setActiveTacticalTab(tabs[idx - 1].id);
                        playChimeSound();
                        showToast(`已切换至【${tabs[idx - 1].label}】`, '滑动手势快速切页');
                      }
                    }
                  }}
                  style={{
                    transform: dragDisplacementY > 0 ? `translateY(${dragDisplacementY}px)` : undefined,
                    transition: isDraggingTray ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  className="relative z-30 p-3 pt-1.5 bg-white/98 backdrop-blur-md border border-neutral-200/90 rounded-2xl shadow-xl space-y-2.5 max-h-[58vh] overflow-y-auto"
                >
                  {/* 下拉手势抓手条 (Gesture Handle) */}
                  <div
                    className="flex flex-col items-center pt-0.5 pb-1 cursor-grab active:cursor-grabbing touch-none select-none group/grip"
                    onTouchStart={(e) => {
                      trayTouchStartYRef.current = e.touches[0].clientY;
                      setIsDraggingTray(true);
                    }}
                    onTouchMove={(e) => {
                      const dy = e.touches[0].clientY - trayTouchStartYRef.current;
                      if (dy > 0) {
                        setDragDisplacementY(dy * 0.72);
                      }
                    }}
                    onTouchEnd={() => {
                      setIsDraggingTray(false);
                      if (dragDisplacementY > 55) {
                        setIsTacticalTrayOpen(false);
                        setDragDisplacementY(0);
                        playChimeSound();
                        showToast('已手势收起', '下滑收纳快捷面板');
                      } else {
                        setDragDisplacementY(0);
                      }
                    }}
                  >
                    <div className="w-10 h-1.5 rounded-full bg-neutral-300 group-hover/grip:bg-neutral-400 group-active/grip:bg-neutral-500 transition-colors" />
                    <div className="flex items-center gap-1.5 mt-1 text-[9.5px] font-sans text-neutral-400 select-none">
                      <span className="flex items-center gap-0.5">
                        <ChevronDown className="w-2.5 h-2.5" />
                        <span>下滑收起</span>
                      </span>
                      <span>•</span>
                      <span>左右滑动切页</span>
                    </div>
                  </div>

                  {/* 权限身份核验状态栏：展示当前自动检测的终端身份及开放权限 */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-neutral-100/90 border border-neutral-200/80 text-[11px] select-none">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        activeRole === 'rider' ? 'bg-sky-500 animate-pulse' :
                        activeRole === 'merchant' ? 'bg-amber-500 animate-pulse' :
                        activeRole === 'platform' ? 'bg-purple-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
                      }`} />
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-bold text-neutral-800 shrink-0">
                          {activeRole === 'rider' ? '【骑手端专送战术台】' :
                           activeRole === 'merchant' ? '【商家餐车核销台】' :
                           activeRole === 'platform' ? '【平台调度监控总台】' : '【食客端协同中心】'}
                        </span>
                        <span className="text-[10.5px] text-neutral-500 truncate hidden xs:inline">
                          {activeRole === 'rider' ? '已激活现场拍照存证、GPS巡航与双封签取餐' :
                           activeRole === 'merchant' ? '已激活备料换餐工单、泊位微调与核销开票' :
                           activeRole === 'platform' ? '全网时空基准广播、异常督办与仲裁权限' : '点餐咨询、加急催单与对账核验权限'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-white text-neutral-600 border border-neutral-200 shrink-0 font-medium">
                      已自动检测
                    </span>
                  </div>

                  {/* 抽屉顶部导航栏：文本类型 Tab 显示 */}
                  <div className="flex items-center justify-between border-b border-neutral-200/80 pb-0 gap-2">
                    <nav className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none -mb-px" aria-label="协同动作分类导航">
                      {availableTacticalTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isTabActive = activeTacticalTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              setActiveTacticalTab(tab.id);
                              playChimeSound();
                            }}
                            className={`h-8 px-1 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap border-b-2 -mb-px transition-all select-none ${
                              isTabActive
                                ? 'border-neutral-900 text-neutral-950 font-bold'
                                : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 font-medium'
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${isTabActive ? tab.color : 'text-neutral-400'}`} />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTacticalTrayOpen(false);
                        setDragDisplacementY(0);
                      }}
                      className="w-7 h-7 mb-1 flex items-center justify-center text-neutral-400 hover:text-neutral-800 rounded-lg hover:bg-neutral-100 cursor-pointer shrink-0 transition"
                      title="关闭快捷面板"
                    >
                      <X className="w-4 h-4 stroke-[1.75]" />
                    </button>
                  </div>

                {/* Sub Tab 1: 动作 (快捷动作) - 一排4个按钮，简化文本，溢出左右滚动显示 */}
                {activeTacticalTab === 'actions' && (
                  <div className="grid grid-cols-4 gap-2 py-1">
                    {/* 1. 定位 */}
                    <button
                      type="button"
                      onClick={() => handleSendLocation()}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50/70 hover:bg-emerald-50/60 active:bg-neutral-100 border border-neutral-200/80 hover:border-emerald-300 transition active:scale-95 cursor-pointer group select-none min-w-0"
                      title={activeRole === 'rider' ? '巡航实时坐标' : activeRole === 'merchant' ? '餐车停靠位置' : activeRole === 'platform' ? '基准时空信标' : '发送当前收餐位置'}
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-emerald-100/80 text-emerald-800 mb-1 transition-transform group-hover:scale-105 shrink-0 shadow-3xs">
                        <MapPin className="w-5 h-5 stroke-[1.75]" />
                      </div>
                      <div className="w-full overflow-x-auto scrollbar-none text-center px-0.5 touch-pan-x">
                        <span className="text-[11px] font-medium text-neutral-800 whitespace-nowrap inline-block leading-tight">
                          {activeRole === 'rider' ? '车载GPS' : activeRole === 'merchant' ? '餐车泊位' : activeRole === 'platform' ? '时空信标' : '发送位置'}
                        </span>
                      </div>
                    </button>

                    {/* 2. 对讲 */}
                    <button
                      type="button"
                      onClick={() => handleSendIntercomPhrase()}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50/70 hover:bg-amber-50/60 active:bg-neutral-100 border border-neutral-200/80 hover:border-amber-300 transition active:scale-95 cursor-pointer group select-none min-w-0"
                      title={activeRole === 'rider' ? '车队与顾客通话' : activeRole === 'merchant' ? '现烤进度广播' : activeRole === 'platform' ? '全频调度广播' : '顾客语音呼叫'}
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-amber-100/80 text-amber-900 mb-1 transition-transform group-hover:scale-105 shrink-0 shadow-3xs">
                        <Radio className="w-5 h-5 stroke-[1.75]" />
                      </div>
                      <div className="w-full overflow-x-auto scrollbar-none text-center px-0.5 touch-pan-x">
                        <span className="text-[11px] font-medium text-neutral-800 whitespace-nowrap inline-block leading-tight">
                          {activeRole === 'rider' ? '车载对讲' : activeRole === 'merchant' ? '出餐对讲' : activeRole === 'platform' ? '全频对讲' : '语音呼叫'}
                        </span>
                      </div>
                    </button>

                    {/* 3. 拍照 */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50/70 hover:bg-sky-50/60 active:bg-neutral-100 border border-neutral-200/80 hover:border-sky-300 transition active:scale-95 cursor-pointer group select-none min-w-0"
                      title={activeRole === 'rider' ? '拍摄送达交接' : activeRole === 'merchant' ? '现烤出餐拍照' : activeRole === 'platform' ? '监管抽查存证' : '开箱验货拍照'}
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-sky-100/80 text-sky-800 mb-1 transition-transform group-hover:scale-105 shrink-0 shadow-3xs">
                        <Camera className="w-5 h-5 stroke-[1.75]" />
                      </div>
                      <div className="w-full overflow-x-auto scrollbar-none text-center px-0.5 touch-pan-x">
                        <span className="text-[11px] font-medium text-neutral-800 whitespace-nowrap inline-block leading-tight">
                          {activeRole === 'rider' ? '现场拍照' : activeRole === 'merchant' ? '出餐验真' : activeRole === 'platform' ? '监管存证' : '验视拍照'}
                        </span>
                      </div>
                    </button>

                    {/* 4. 督办 */}
                    <button
                      type="button"
                      onClick={() => {
                        if (activeRole === 'rider') {
                          handleSendMessage('⚡ [骑手到店催单] 专送骑手已到达餐车档口，请后厨优先出单，双封签已就位！');
                          playWalkieTalkieBeep();
                          showToast('已催促后厨出单', '骑手专线提醒已发出');
                        } else if (activeRole === 'merchant') {
                          handleSendMessage('📢 [餐车出餐通知] 现烤餐品已完成封签装箱，保温达标，请专送骑手尽快提餐！');
                          playChimeSound();
                          showToast('已呼叫骑手提餐', '档口出单通知已发出');
                        } else if (activeRole === 'platform') {
                          triggerSLASupervisionTicket(
                            currentOrderNo,
                            'P0',
                            'delivery_delay',
                            '调度大盘 P0 级特急督办工单',
                            '调度监测大盘判定当前履约节点存在超时风险，已启动全链路 P0 级时效督办。开启响应倒计时与解决时间记录。',
                            180
                          );
                          playWalkieTalkieBeep();
                          showToast('P0 督办工单已下发', '已嵌入消息上下文，启动时限跟进与闭环审计');
                        } else {
                          triggerExpediteUrge();
                        }
                        setIsTacticalTrayOpen(false);
                      }}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50/70 hover:bg-rose-50/60 active:bg-neutral-100 border border-neutral-200/80 hover:border-rose-300 transition active:scale-95 cursor-pointer group select-none min-w-0"
                      title={activeRole === 'rider' ? '骑手已到档口' : activeRole === 'merchant' ? '出餐通知骑手' : activeRole === 'platform' ? '超时督办工单' : '三方联动督办'}
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-rose-100/80 text-rose-800 mb-1 transition-transform group-hover:scale-105 shrink-0 shadow-3xs">
                        <AlertTriangle className="w-5 h-5 stroke-[1.75]" />
                      </div>
                      <div className="w-full overflow-x-auto scrollbar-none text-center px-0.5 touch-pan-x">
                        <span className="text-[11px] font-medium text-neutral-800 whitespace-nowrap inline-block leading-tight">
                          {activeRole === 'rider' ? '催促出单' : activeRole === 'merchant' ? '呼叫骑手' : activeRole === 'platform' ? '超时督办' : '加急催单'}
                        </span>
                      </div>
                    </button>

                    {/* 5. 角色隔离工单功能：商家/平台显示换餐工单，骑手显示异常报备，食客显示加单咨询 */}
                    {activeRole === 'merchant' || activeRole === 'platform' ? (
                      <button
                        type="button"
                        onClick={handleSendDishReplacementProposal}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50/70 hover:bg-emerald-50/60 active:bg-neutral-100 border border-neutral-200/80 hover:border-emerald-300 transition active:scale-95 cursor-pointer group select-none min-w-0"
                        title="发起备料告罄换餐协商卡"
                      >
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-emerald-100/80 text-emerald-800 mb-1 transition-transform group-hover:scale-105 shrink-0 shadow-3xs">
                          <UtensilsCrossed className="w-5 h-5 stroke-[1.75]" />
                        </div>
                        <div className="w-full overflow-x-auto scrollbar-none text-center px-0.5 touch-pan-x">
                          <span className="text-[11px] font-medium text-neutral-800 whitespace-nowrap inline-block leading-tight">
                            换餐工单
                          </span>
                        </div>
                      </button>
                    ) : activeRole === 'rider' ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleSendMessage('⚠️ [骑手路况报备] 沿途动线拥堵，专车正在穿行中，保温箱温控稳定，预计延迟约 3 分钟，请稍候！');
                          setIsTacticalTrayOpen(false);
                          playWalkieTalkieBeep();
                          showToast('已发起路况报备', '同步至食客与餐车档口');
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50/70 hover:bg-amber-50/60 active:bg-neutral-100 border border-neutral-200/80 hover:border-amber-300 transition active:scale-95 cursor-pointer group select-none min-w-0"
                        title="发起配送异常与路况报备"
                      >
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-amber-100/80 text-amber-800 mb-1 transition-transform group-hover:scale-105 shrink-0 shadow-3xs">
                          <Clock className="w-5 h-5 stroke-[1.75]" />
                        </div>
                        <div className="w-full overflow-x-auto scrollbar-none text-center px-0.5 touch-pan-x">
                          <span className="text-[11px] font-medium text-neutral-800 whitespace-nowrap inline-block leading-tight">
                            路况报备
                          </span>
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTacticalTab('tools');
                          setActiveToolsTab('dishes');
                          showToast('已打开加单推荐', '可选择菜品直接向后厨咨询加烤');
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50/70 hover:bg-emerald-50/60 active:bg-neutral-100 border border-neutral-200/80 hover:border-emerald-300 transition active:scale-95 cursor-pointer group select-none min-w-0"
                        title="查看热销加单并咨询后厨"
                      >
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-emerald-100/80 text-emerald-800 mb-1 transition-transform group-hover:scale-105 shrink-0 shadow-3xs">
                          <UtensilsCrossed className="w-5 h-5 stroke-[1.75]" />
                        </div>
                        <div className="w-full overflow-x-auto scrollbar-none text-center px-0.5 touch-pan-x">
                          <span className="text-[11px] font-medium text-neutral-800 whitespace-nowrap inline-block leading-tight">
                            加单咨询
                          </span>
                        </div>
                      </button>
                    )}

                    {/* 6. 动线与交付指引：商家/平台显示泊位微调，骑手显示驻车指引，食客显示门禁自提指示 */}
                    {activeRole === 'merchant' || activeRole === 'platform' ? (
                      <button
                        type="button"
                        onClick={handleSendBerthRelocationNotice}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50/70 hover:bg-blue-50/60 active:bg-neutral-100 border border-neutral-200/80 hover:border-blue-300 transition active:scale-95 cursor-pointer group select-none min-w-0"
                        title="广播餐车即时泊位微调通知"
                      >
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-blue-100/80 text-blue-800 mb-1 transition-transform group-hover:scale-105 shrink-0 shadow-3xs">
                          <MapPin className="w-5 h-5 stroke-[1.75]" />
                        </div>
                        <div className="w-full overflow-x-auto scrollbar-none text-center px-0.5 touch-pan-x">
                          <span className="text-[11px] font-medium text-neutral-800 whitespace-nowrap inline-block leading-tight">
                            泊位微调
                          </span>
                        </div>
                      </button>
                    ) : activeRole === 'rider' ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleSendMessage('📍 [骑手驻车交付通知] 专车已到达楼下临时泊位（打双闪），正在乘梯交付或在楼下大堂等候，请准备交接！');
                          setIsTacticalTrayOpen(false);
                          playWalkieTalkieBeep();
                          showToast('已发送驻车交付通知', '提醒食客准备交接');
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50/70 hover:bg-sky-50/60 active:bg-neutral-100 border border-neutral-200/80 hover:border-sky-300 transition active:scale-95 cursor-pointer group select-none min-w-0"
                        title="广播骑手驻车与楼下交接通知"
                      >
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-sky-100/80 text-sky-800 mb-1 transition-transform group-hover:scale-105 shrink-0 shadow-3xs">
                          <MapPin className="w-5 h-5 stroke-[1.75]" />
                        </div>
                        <div className="w-full overflow-x-auto scrollbar-none text-center px-0.5 touch-pan-x">
                          <span className="text-[11px] font-medium text-neutral-800 whitespace-nowrap inline-block leading-tight">
                            驻车交付
                          </span>
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleSendMessage('🏢 [食客收餐指引] 若单元门禁需密码或外人无法上楼，请放在一楼前台外卖专柜，辛苦骑手小哥！');
                          setIsTacticalTrayOpen(false);
                          showToast('已发送收餐指引', '指引骑手放置于自提区');
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50/70 hover:bg-indigo-50/60 active:bg-neutral-100 border border-neutral-200/80 hover:border-indigo-300 transition active:scale-95 cursor-pointer group select-none min-w-0"
                        title="发送门禁与外卖柜指引"
                      >
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-indigo-100/80 text-indigo-800 mb-1 transition-transform group-hover:scale-105 shrink-0 shadow-3xs">
                          <MapPin className="w-5 h-5 stroke-[1.75]" />
                        </div>
                        <div className="w-full overflow-x-auto scrollbar-none text-center px-0.5 touch-pan-x">
                          <span className="text-[11px] font-medium text-neutral-800 whitespace-nowrap inline-block leading-tight">
                            门禁指引
                          </span>
                        </div>
                      </button>
                    )}

                    {/* 7. 弱网离线发信与队列重试模拟 (方案 4: 离线与韧性) */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isOfflineSim;
                        setIsOfflineSim(next);
                        if (!next) {
                          flushOfflineQueue();
                        } else {
                          showToast('弱网离线模拟已开启', '新发送的消息将进入本地发件箱挂起');
                        }
                      }}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50/70 hover:bg-amber-50/60 active:bg-neutral-100 border border-neutral-200/80 hover:border-amber-300 transition active:scale-95 cursor-pointer group select-none min-w-0"
                      title="切换弱网断网离线队列模拟"
                    >
                      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-1 transition-transform group-hover:scale-105 shrink-0 shadow-3xs ${
                        isOfflineSim ? 'bg-amber-200 text-amber-900' : 'bg-neutral-200/80 text-neutral-700'
                      }`}>
                        <Clock className="w-5 h-5 stroke-[1.75]" />
                      </div>
                      <div className="w-full overflow-x-auto scrollbar-none text-center px-0.5 touch-pan-x">
                        <span className="text-[11px] font-medium text-neutral-800 whitespace-nowrap inline-block leading-tight">
                          {isOfflineSim ? '弱网离线中' : '弱网离线'}
                        </span>
                      </div>
                    </button>

                    {/* 8. 旧消息智能折叠策略控制 */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !autoFoldEnabled;
                        setAutoFoldEnabled(next);
                        if (!next) {
                          setIsHistoryExpanded(true);
                          showToast('已切换为全量展示模式', '所有历史协同消息已全部展开');
                        } else {
                          setIsHistoryExpanded(false);
                          showToast('已开启旧消息智能折叠', '保持最新动态置顶，早前对话已收纳');
                        }
                      }}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50/70 hover:bg-neutral-100 active:bg-neutral-100 border border-neutral-200/80 hover:border-neutral-300 transition active:scale-95 cursor-pointer group select-none min-w-0"
                      title="切换旧消息智能折叠策略"
                    >
                      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-1 transition-transform group-hover:scale-105 shrink-0 shadow-3xs ${
                        autoFoldEnabled ? 'bg-neutral-200/80 text-neutral-700' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        <History className="w-5 h-5 stroke-[1.75]" />
                      </div>
                      <div className="w-full overflow-x-auto scrollbar-none text-center px-0.5 touch-pan-x">
                        <span className="text-[11px] font-medium text-neutral-800 whitespace-nowrap inline-block leading-tight">
                          {autoFoldEnabled ? '折叠旧消息' : '展开全部'}
                        </span>
                      </div>
                    </button>
                  </div>
                )}

                {/* Sub Tab 2: 话术 (常用话术文字包方案) - 按角色需求智能排序，支持填入编辑与一键速发 */}
                {activeTacticalTab === 'phrases' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 no-scrollbar">
                      {(activeRole === 'rider'
                        ? [
                            { id: 'dispatch', label: '🛵 配送沟通' },
                            { id: 'address', label: '📍 地址指引' },
                            { id: 'rush', label: '⚡ 加急催单' },
                            { id: 'food', label: '🍳 餐品状态' },
                            { id: 'aftersales', label: '🛡️ 售后保障' }
                          ]
                        : activeRole === 'merchant'
                        ? [
                            { id: 'food', label: '🍳 餐品状态' },
                            { id: 'dispatch', label: '🛵 配送协同' },
                            { id: 'aftersales', label: '🛡️ 售后保障' },
                            { id: 'address', label: '📍 泊位指引' },
                            { id: 'rush', label: '⚡ 出单催告' }
                          ]
                        : [
                            { id: 'rush', label: '⚡ 加急催单' },
                            { id: 'address', label: '📍 地址指引' },
                            { id: 'food', label: '🍳 餐品状态' },
                            { id: 'dispatch', label: '🛵 配送沟通' },
                            { id: 'aftersales', label: '🛡️ 售后保障' }
                          ]
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActivePhraseCategory(tab.id as any)}
                          className={`px-2.5 py-1 rounded-lg shrink-0 transition text-xs font-medium cursor-pointer ${
                            activePhraseCategory === tab.id
                              ? 'bg-neutral-900 text-white shadow-2xs font-bold'
                              : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                      {(TACTICAL_PHRASES[activePhraseCategory] || []).map((ph, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-neutral-50/80 hover:bg-white border border-neutral-200/80 hover:border-neutral-400 transition flex items-center justify-between gap-2 group shadow-3xs"
                        >
                          <span
                            onClick={() => {
                              setInputText(ph);
                              inputRef.current?.focus();
                              showToast('话术已填入', '可在输入框微调后发送');
                            }}
                            className="text-xs text-neutral-800 font-medium flex-1 cursor-pointer hover:text-neutral-950 line-clamp-2 leading-relaxed"
                            title="轻触填入输入框微调"
                          >
                            {ph}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setInputText(ph);
                                inputRef.current?.focus();
                                showToast('已填入输入框', '可直接追加文字');
                              }}
                              className="px-1.5 py-1 text-[10.5px] bg-white hover:bg-neutral-100 text-neutral-600 rounded-md font-medium border border-neutral-200 cursor-pointer transition active:scale-95"
                              title="填入输入框"
                            >
                              填入
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleSendMessage(ph);
                                setIsTacticalTrayOpen(false);
                              }}
                              className="px-2 py-1 text-[10.5px] bg-neutral-900 hover:bg-black text-white rounded-md font-medium cursor-pointer transition active:scale-95 shadow-2xs flex items-center gap-0.5"
                              title="立即发送"
                            >
                              <Send className="w-2.5 h-2.5" />
                              <span>发送</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub Tab 3: 存证 (专送骑手专属业务存证工具，食客/商家端严格阻断) */}
                {activeTacticalTab === 'evidence' && (
                  activeRole !== 'rider' && activeRole !== 'platform' ? (
                    <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-center space-y-2 select-none">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                        <Lock className="w-5 h-5 stroke-[1.75]" />
                      </div>
                      <div className="text-xs font-bold text-amber-950">
                        存证归档为【专送骑手】专属权限
                      </div>
                      <div className="text-[11px] text-amber-800 leading-relaxed max-w-sm mx-auto">
                        系统自动检测当前终端为【{activeRole === 'merchant' ? '商家档口端' : '食客端'}】。现场配送双封签检验与妥投存证仅限骑手操作，已依法依规实施物理隔离。
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-bold text-neutral-900">现场存证文字包</span>
                          <span className="text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200 font-mono">
                            骑手专属妥投存证
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 bg-neutral-900 hover:bg-black text-white text-xs rounded-lg font-medium cursor-pointer shadow-2xs active:scale-95 transition flex items-center gap-1.5 shrink-0"
                        >
                          <Camera className="w-3.5 h-3.5 stroke-[1.5]" />
                          <span>拍照或自选存证</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PRESET_EVIDENCE.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSendProofPhoto(item.url, item.title, item.detailMeta)}
                            className="group border border-neutral-200/90 hover:border-neutral-900 rounded-xl overflow-hidden bg-neutral-50/70 hover:bg-white p-2 cursor-pointer transition-all shadow-3xs hover:shadow-xs flex flex-col justify-between"
                          >
                            <div>
                              <div className="relative rounded-lg overflow-hidden mb-1.5 aspect-[16/10] sm:aspect-video bg-neutral-100">
                                <img
                                  src={item.url}
                                  alt={item.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                {/* 分类标签徽章 */}
                                <div className="absolute top-1 left-1 bg-black/65 backdrop-blur-xs text-white text-[9.5px] font-medium px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${item.id === 'seal' ? 'bg-emerald-400' : item.id === 'shelf' ? 'bg-sky-400' : item.id === 'kitchen' ? 'bg-amber-400' : 'bg-purple-400'}`} />
                                  <span>{item.category}</span>
                                </div>
                                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8.5px] px-1 py-0.2 rounded font-mono">
                                  存证
                                </div>
                              </div>
                              <span className="text-xs font-bold text-neutral-900 line-clamp-1 group-hover:text-black">
                                {item.title}
                              </span>
                              <span className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                                {item.desc}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="mt-2 w-full py-1 bg-white group-hover:bg-neutral-900 text-neutral-800 group-hover:text-white rounded-lg text-[11px] font-medium border border-neutral-200 group-hover:border-neutral-900 transition flex items-center justify-center gap-1 active:scale-95 shadow-3xs"
                            >
                              <Send className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                              <span>{item.actionText}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}

                {/* Tab: Tools & Material Library (按角色个性化定制) */}
                {activeTacticalTab === 'tools' && (
                  <div className="space-y-2.5">
                    {/* Sub Tab Buttons */}
                    <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg text-[10.5px]">
                      <button
                        type="button"
                        onClick={() => setActiveToolsTab('invoice')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeToolsTab === 'invoice'
                            ? 'bg-white font-bold text-neutral-900 shadow-2xs'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        {activeRole === 'merchant' ? '核销账单' : activeRole === 'rider' ? '装箱运单' : '订单账单'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveToolsTab('dishes')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeToolsTab === 'dishes'
                            ? 'bg-white font-bold text-neutral-900 shadow-2xs'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        {activeRole === 'rider' ? '箱温巡检' : activeRole === 'merchant' ? '菜品推荐' : '加烤咨询'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveToolsTab('workorder')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeToolsTab === 'workorder'
                            ? 'bg-white font-bold text-neutral-900 shadow-2xs'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        {activeRole === 'rider' ? '配送报备' : activeRole === 'merchant' ? '出餐报备' : '服务工单'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveToolsTab('audio')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeToolsTab === 'audio'
                            ? 'bg-white font-bold text-neutral-900 shadow-2xs'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        设备调试
                      </button>
                    </div>

                    {/* Sub Tab Contents 1: 订单/账单 */}
                    {activeToolsTab === 'invoice' && (
                      <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-2.5 shadow-2xs">
                        <div className="flex justify-between items-center text-xs text-amber-950 font-bold border-b border-amber-200/70 pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="p-1 bg-amber-200/80 rounded text-amber-900">🧾</span>
                            <span>
                              {activeRole === 'merchant' ? '餐车档口核销总账单（主理人签发）' : activeRole === 'rider' ? '骑手专送运单装箱明细（交接查验）' : '食客订单核销明细（对账查看）'}
                            </span>
                          </div>
                          <span className="font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-[3px] text-[10.5px] border border-amber-200">
                            #{fullOrder.id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-xs">
                          {fullOrder.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-neutral-700">
                              <span>{item.name} ×{item.quantity}</span>
                              <span className="font-medium">¥{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs font-bold text-amber-950">
                          <span>实收结算总计</span>
                          <span className="text-sm text-rose-700 font-mono">¥{fullOrder.totalAmount.toFixed(2)}</span>
                        </div>

                        {activeRole === 'merchant' || activeRole === 'platform' ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleSendInvoiceCard();
                              setIsTacticalTrayOpen(false);
                            }}
                            className="w-full py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
                          >
                            <Receipt className="w-3.5 h-3.5 stroke-[1.5]" />
                            <span>一键签发核销账单卡片到群聊</span>
                          </button>
                        ) : activeRole === 'user' ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleSendMessage('🧾 [食客申请对账] 请餐车档口主理人核验本次点餐明细并签发正式核销账单！');
                              setIsTacticalTrayOpen(false);
                              showToast('已申请对账', '已提示商家档口签发对账单');
                            }}
                            className="w-full py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
                          >
                            <Receipt className="w-3.5 h-3.5 stroke-[1.5]" />
                            <span>向商家申请开具正式对账单</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              handleSendMessage(`🛵 [骑手装箱核验] 专送骑手已核对餐品数量无误（共 ${fullOrder.items.length} 样餐品），已锁入恒温箱极速配送！`);
                              setIsTacticalTrayOpen(false);
                              playWalkieTalkieBeep();
                              showToast('已完成装箱核验', '已同步至食客与档口');
                            }}
                            className="w-full py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
                          >
                            <PackageCheck className="w-3.5 h-3.5 stroke-[1.5]" />
                            <span>发送骑手提餐核验确认单</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Sub Tab Contents 2: 菜品推荐 / 加烤咨询 / 保温箱巡检 */}
                    {activeToolsTab === 'dishes' && (
                      activeRole === 'rider' ? (
                        <div className="p-3 bg-sky-50/80 rounded-xl border border-sky-200/90 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-sky-950 font-bold">
                            <span className="flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-sky-700" />
                              <span>车载智能保温箱实时温控巡检</span>
                            </span>
                            <span className="text-[10.5px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              达标 62.8°C
                            </span>
                          </div>
                          <p className="text-[11px] text-sky-800 leading-relaxed">
                            恒温热链仓保持 60°C 以上稳定锁鲜，冷热独立仓密封隔断，双封签无破损。
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              handleSendMessage('🌡️ [车载箱温巡检] 专送保温箱实时监测：62.8°C 恒温锁鲜达标，双封签锁闭良好，品质完好！');
                              setIsTacticalTrayOpen(false);
                              playWalkieTalkieBeep();
                              showToast('已同步温控通告', '食客与档口可查验');
                            }}
                            className="w-full py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <span>同步保温箱温控达标报告</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                          {RECOMMENDED_DISHES.map((dish) => (
                            <div
                              key={dish.id}
                              className="p-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg flex flex-col justify-between transition group"
                            >
                              <div>
                                <div className="flex justify-between items-start">
                                  <span className="font-bold text-xs text-neutral-900">{dish.name}</span>
                                  <span className="text-rose-700 font-mono text-xs font-bold">¥{dish.price}</span>
                                </div>
                                <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-1">{dish.desc}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (activeRole === 'user') {
                                    handleSendMessage(`🍢 [食客加烤咨询] 请问【${dish.name}】还能现烤加做一份一起配送吗？`);
                                    showToast('已发送加烤咨询', '已向后厨询问加烤');
                                  } else {
                                    handleSendDishCard(dish);
                                  }
                                  setIsTacticalTrayOpen(false);
                                }}
                                className="mt-2 w-full py-1 bg-white hover:bg-neutral-900 text-neutral-800 hover:text-white rounded text-[11px] font-medium border border-neutral-200 transition cursor-pointer"
                              >
                                {activeRole === 'user' ? '向后厨咨询加烤' : '推荐此菜品'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {/* Sub Tab Contents 3: 异常工单 */}
                    {activeToolsTab === 'workorder' && (
                      <div className="space-y-2 p-2 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
                        <div className="flex items-center justify-between text-neutral-700 font-medium">
                          <span>
                            {activeRole === 'rider' ? '骑手现场快速报备' : activeRole === 'merchant' ? '档口异常通告' : '食客服务工单'}
                          </span>
                          <span className="text-[10px] text-neutral-500">平台客服专线直连</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {activeRole === 'rider' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSendMessage('🚪 [骑手现场报备] 单元门禁锁闭需密码，已在大堂前台等候，请食客协助开门或电联！');
                                  setIsTacticalTrayOpen(false);
                                  playWalkieTalkieBeep();
                                }}
                                className="p-2 text-left rounded-lg bg-white border border-neutral-200 hover:border-neutral-900 text-neutral-800 transition cursor-pointer"
                              >
                                <span className="font-bold block">门禁无法通行</span>
                                <span className="text-[10.5px] text-neutral-500">提示食客协助开门</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSendMessage('📞 [骑手现场报备] 到达交付点多次呼叫食客暂未接听，已在楼下安全停靠等候！');
                                  setIsTacticalTrayOpen(false);
                                  playWalkieTalkieBeep();
                                }}
                                className="p-2 text-left rounded-lg bg-white border border-neutral-200 hover:border-neutral-900 text-neutral-800 transition cursor-pointer"
                              >
                                <span className="font-bold block">电话无人接听</span>
                                <span className="text-[10.5px] text-neutral-500">已留存拨打凭据</span>
                              </button>
                            </>
                          ) : activeRole === 'merchant' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSendMessage('🔥 [后厨备料通告] 现烤高峰炭火升温中，此单需额外多烘烤 2 分钟以锁住肉汁，请稍候！');
                                  setIsTacticalTrayOpen(false);
                                  playChimeSound();
                                }}
                                className="p-2 text-left rounded-lg bg-white border border-neutral-200 hover:border-neutral-900 text-neutral-800 transition cursor-pointer"
                              >
                                <span className="font-bold block">现烤慢功锁鲜</span>
                                <span className="text-[10.5px] text-neutral-500">通告稍延 2 分钟</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSendMessage('📢 [出餐温控通告] 餐品现烤完毕，双封签已加锁，保温达标，请专送小哥提餐！');
                                  setIsTacticalTrayOpen(false);
                                  playChimeSound();
                                }}
                                className="p-2 text-left rounded-lg bg-white border border-neutral-200 hover:border-neutral-900 text-neutral-800 transition cursor-pointer"
                              >
                                <span className="font-bold block">出餐封签加锁</span>
                                <span className="text-[10.5px] text-neutral-500">通知骑手提餐</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSendMessage('🚨 [食客工单申请] 食客反馈送达定位有微调，请骑手按最新电话指示交付！');
                                  setIsTacticalTrayOpen(false);
                                }}
                                className="p-2 text-left rounded-lg bg-white border border-neutral-200 hover:border-neutral-900 text-neutral-800 transition cursor-pointer"
                              >
                                <span className="font-bold block">地址微调纠偏</span>
                                <span className="text-[10.5px] text-neutral-500">提示骑手电联确认</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerExpediteUrge();
                                  setIsTacticalTrayOpen(false);
                                }}
                                className="p-2 text-left rounded-lg bg-white border border-neutral-200 hover:border-neutral-900 text-neutral-800 transition cursor-pointer"
                              >
                                <span className="font-bold block">加急催促交付</span>
                                <span className="text-[10.5px] text-neutral-500">三端督办加速</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {activeToolsTab === 'audio' && (
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-neutral-700 font-medium">
                          <span>音效与硬件喇叭试音</span>
                          <span className="text-[10px] text-emerald-700 font-mono">WebAudio Engine OK</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playWalkieTalkieBeep()}
                            className="flex-1 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-medium rounded-lg cursor-pointer transition active:scale-95 shadow-2xs flex items-center justify-center gap-1"
                          >
                            <Radio className="w-3.5 h-3.5 stroke-[1.5]" />
                            <span>对讲哔声测试</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => playChimeSound()}
                            className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg cursor-pointer transition active:scale-95 shadow-2xs flex items-center justify-center gap-1"
                          >
                            <BellRing className="w-3.5 h-3.5 stroke-[1.5]" />
                            <span>三音门铃测试</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {urgeToastVisible && (
                  <div id="urge-feedback-toast" className="mt-2 p-2 bg-rose-600 text-white rounded-lg shadow-sm flex items-center justify-between text-[11px] font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>加急催单提醒已发送！餐车与骑手端联动提示</span>
                    </div>
                    <span className="font-mono font-bold text-[10px] bg-black/30 px-1.5 py-0.5 rounded">已加急</span>
                  </div>
                )}
              </div>
            </>
          )}

            {/* 3. Extended Tools & Material Library Drawer (Button 3) */}
            {isMaterialToolsOpen && (
              <div className="bg-white/95 backdrop-blur-md border border-radar-border rounded-xl p-3 shadow-craft animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-3 max-h-[42vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-radar-border/70 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-radar-dark flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-neutral-600 stroke-[1.5]" />
                      <span>订单凭证与菜品素材库</span>
                    </span>
                    <div className="flex items-center gap-1 bg-radar-bg p-0.5 rounded-lg text-[10.5px]">
                      <button
                        type="button"
                        onClick={() => setActiveToolsTab('invoice')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeToolsTab === 'invoice'
                            ? 'bg-white font-bold text-radar-dark shadow-2xs'
                            : 'text-radar-muted hover:text-radar-dark'
                        }`}
                      >
                        订单账单
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveToolsTab('dishes')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeToolsTab === 'dishes'
                            ? 'bg-white font-bold text-radar-dark shadow-2xs'
                            : 'text-radar-muted hover:text-radar-dark'
                        }`}
                      >
                        推荐加单
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveToolsTab('workorder')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeToolsTab === 'workorder'
                            ? 'bg-white font-bold text-radar-dark shadow-2xs'
                            : 'text-radar-muted hover:text-radar-dark'
                        }`}
                      >
                        售后工单
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveToolsTab('audio')}
                        className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                          activeToolsTab === 'audio'
                            ? 'bg-white font-bold text-radar-dark shadow-2xs'
                            : 'text-radar-muted hover:text-radar-dark'
                        }`}
                      >
                        设备调试
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMaterialToolsOpen(false)}
                    className="text-radar-muted hover:text-radar-dark p-1 rounded-md hover:bg-black/5 cursor-pointer"
                    title="关闭素材库"
                  >
                    <X className="w-3.5 h-3.5 stroke-[1.5]" />
                  </button>
                </div>

                {/* Sub Tab: Invoice Card (Role-Gated) */}
                {activeToolsTab === 'invoice' && (
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-2.5 shadow-2xs">
                    <div className="flex justify-between items-center text-xs text-amber-950 font-bold border-b border-amber-200/70 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 bg-amber-200/80 rounded text-amber-900">🧾</span>
                        <span>协同订单核销总账单</span>
                      </div>
                      <span className="font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-[3px] text-[10.5px] border border-amber-200">
                        #{currentOrderNo}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-amber-900/90 py-1 font-mono">
                      <div className="p-2 bg-white/70 rounded-lg border border-amber-200/50">
                        <div className="text-[10px] text-amber-800/70 font-sans">商品核销总额</div>
                        <div className="text-base font-bold text-amber-950 mt-0.5">
                          ¥{Number(fullOrder.totalAmount || 186).toFixed(2)}
                        </div>
                      </div>
                      <div className="p-2 bg-white/70 rounded-lg border border-amber-200/50">
                        <div className="text-[10px] text-amber-800/70 font-sans">自提/核销验证码</div>
                        <div className="text-base font-bold text-emerald-800 mt-0.5">
                          #{currentOrderNo.slice(-4) || '8829'}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11.5px] text-amber-900/80 space-y-1 bg-white/50 p-2 rounded-lg border border-amber-200/40">
                      <div className="flex justify-between">
                        <span className="text-amber-800/70">配送交接：</span>
                        <span className="truncate max-w-[220px] font-medium text-amber-950">
                          {fullOrder.deliveryAddress || '科技园区 A 座 1204 室'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-800/70">履约状态：</span>
                        <span className="text-emerald-700 font-medium">商家现烤已就绪 · 保温箱 65℃ 锁温</span>
                      </div>
                    </div>

                    {activeRole === 'rider' ? (
                      <div className="p-2 rounded-lg bg-amber-100/70 border border-amber-300/80 text-[11px] text-amber-950 flex items-center gap-1.5">
                        <span className="text-amber-800">⚠️</span>
                        <span>【骑手端口受限】专线骑手不可签发或篡改商家核销账单，请由餐车档口签发。</span>
                      </div>
                    ) : activeRole === 'user' ? (
                      <button
                        type="button"
                        onClick={handleSendInvoiceCard}
                        className="w-full py-2 bg-sky-800 hover:bg-sky-900 text-white rounded-lg text-xs font-bold transition active:scale-98 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <span>🧾</span>
                        <span>向商家档口发起对账与开票申请</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendInvoiceCard}
                        className="w-full py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition active:scale-98 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <span>🧾</span>
                        <span>{activeRole === 'platform' ? '平台出具官方协同核销凭单' : '发送订单核销账单卡到协同室'}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Sub Tab: Dishes Recommendation (Role-Gated) */}
                {activeToolsTab === 'dishes' && (
                  <div className="space-y-2">
                    {activeRole === 'rider' ? (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11.5px] text-rose-900">
                        <span>⚠️【骑手端口受限】为保障配送安全与食品卫生责任追溯，骑手终端不可代客点单或改单。</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1">
                        {RECOMMENDED_DISHES.map((dish, idx) => {
                          const dishImg = matchDishImageUrl(dish.name);
                          return (
                            <div
                              key={idx}
                              className="p-2 bg-radar-bg hover:bg-rose-50/60 border border-radar-border hover:border-rose-300 rounded-xl flex items-center gap-2.5 transition group"
                            >
                              <img
                                src={dishImg}
                                alt={dish.name}
                                className="w-14 h-14 rounded-lg object-cover border border-black/10 shrink-0 group-hover:scale-105 transition-transform"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-radar-dark truncate">{dish.name}</span>
                                </div>
                                <div className="text-[10px] text-radar-muted truncate mt-0.5">{dish.desc}</div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs font-mono font-bold text-rose-700">
                                    ¥{dish.price.toFixed(2)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleSendDishCard(dish.name, dish.price, dish.desc)}
                                    className="px-2 py-0.5 bg-[#1a1a17] hover:bg-black text-white rounded text-[10.5px] font-semibold shrink-0 cursor-pointer shadow-2xs active:scale-95 transition"
                                  >
                                    {activeRole === 'user' ? '咨询加单' : '发推荐卡'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub Tab: Workorder */}
                {activeToolsTab === 'workorder' && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-radar-muted px-1">
                      发起多端联动售后工单，由平台调度中枢介入全员广播：
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSendWorkOrder('少餐漏餐补发', '核对发现在餐车分包环节少配极夜西西里气泡水1份，需快速补发')}
                        className="p-2.5 rounded-xl bg-radar-bg hover:bg-amber-50 border border-radar-border hover:border-amber-300 text-left cursor-pointer transition group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="p-1 bg-amber-100 rounded text-amber-900 text-xs">⚠️</span>
                          <span className="text-[9.5px] font-mono text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded font-bold">
                            P1 加急
                          </span>
                        </div>
                        <span className="text-xs font-bold text-radar-dark block">少餐漏送补发</span>
                        <span className="text-[10px] text-radar-muted block mt-0.5">即刻核查后厨出单台</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendWorkOrder('餐品翻洒拍照协调', '送达开袋发现炭烤汉堡有些许倾覆，已拍照留存并申请质保退赔')}
                        className="p-2.5 rounded-xl bg-radar-bg hover:bg-rose-50 border border-radar-border hover:border-rose-300 text-left cursor-pointer transition group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="p-1 bg-rose-100 rounded text-rose-900 text-xs">🛡️</span>
                          <span className="text-[9.5px] font-mono text-rose-800 bg-rose-100/70 px-1.5 py-0.5 rounded font-bold">
                            先行包赔
                          </span>
                        </div>
                        <span className="text-xs font-bold text-radar-dark block">餐品翻洒协调</span>
                        <span className="text-[10px] text-radar-muted block mt-0.5">拍照留存极速包赔</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendWorkOrder('发票与开票开具', '需开具企业数电增值税电子发票，抬头为科技园区先锋创新中心')}
                        className="p-2.5 rounded-xl bg-radar-bg hover:bg-sky-50 border border-radar-border hover:border-sky-300 text-left cursor-pointer transition group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="p-1 bg-sky-100 rounded text-sky-900 text-xs">📑</span>
                          <span className="text-[9.5px] font-mono text-sky-800 bg-sky-100/70 px-1.5 py-0.5 rounded font-bold">
                            数电发票
                          </span>
                        </div>
                        <span className="text-xs font-bold text-radar-dark block">企业电子开票</span>
                        <span className="text-[10px] text-radar-muted block mt-0.5">自动同步至财务中心</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub Tab: Audio Test */}
                {activeToolsTab === 'audio' && (
                  <div className="p-3 rounded-xl bg-radar-bg border border-radar-border flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-radar-dark block flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>对讲与警报音效调试中心</span>
                      </span>
                      <span className="text-[10.5px] text-radar-muted block mt-0.5">测试车载对讲哔哔声与高频加急门铃音</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => playWalkieTalkieBeep()}
                        className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-radar-border text-xs font-medium rounded-lg cursor-pointer transition active:scale-95 shadow-2xs"
                      >
                        📻 对讲哔声
                      </button>
                      <button
                        type="button"
                        onClick={() => playChimeSound()}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg cursor-pointer transition active:scale-95 shadow-2xs"
                      >
                        🔔 加急三音琴
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </footer>
        {/* END: BottomInteractiveDock */}

        {/* 飞书/钉钉风格已读未读明细与 DING 催办弹窗 */}
        <FeishuReadReceiptModal
          isOpen={Boolean(selectedReceiptMessage)}
          onClose={() => setSelectedReceiptMessage(null)}
          message={selectedReceiptMessage}
          summary={
            selectedReceiptMessage
              ? getMessageReadReceiptSummary(selectedReceiptMessage, fullOrder, activeRole)
              : null
          }
          order={fullOrder}
          activeRole={activeRole}
          showToast={showToast}
          playChimeSound={playChimeSound}
        />
      </div>
    </div>
  );
};

export default SynergyChatRoomView;
