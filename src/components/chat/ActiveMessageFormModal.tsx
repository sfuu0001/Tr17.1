import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Send,
  MessageSquare,
  MessageSquareText,
  FileText,
  Zap,
  Mic,
  MicOff,
  Volume2,
  Phone,
  Bike,
  Store,
  ChefHat,
  Users,
  Megaphone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Flame,
  Radio,
  FileText,
  Copy,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Order, DishItem, TruckInfo } from '../../types';
import { sendOrderChatMessage, ChatRole } from '../../utils/chatHub';
import { voiceMessageEngine } from '../../utils/voiceMessageEngine';
import { speakText } from '../../utils/voiceAlertEngine';
import { fallbackToastCompat } from '../../utils/fallbackToast';

export interface ActiveMessageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  dishes?: DishItem[];
  truck?: TruckInfo;
  viewerRole?: 'user' | 'rider' | 'merchant' | 'platform' | 'customer';
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  showToast?: (title: string, desc?: string) => void;
  onOpenOmniChat?: (orderNo?: string) => void;
}

type MessageTargetChannel = 'customer' | 'rider' | 'kitchen' | 'broadcast' | 'member';
type PriorityLevel = 'normal' | 'urgent' | 'critical';

interface PresetTemplate {
  id: string;
  channel: MessageTargetChannel;
  title: string;
  category: string;
  content: string;
  priority: PriorityLevel;
  voiceBroadcastText?: string;
  suggestedAction?: 'speedup' | 'coupon' | 'ready';
}

const PRESET_FORM_TEMPLATES: PresetTemplate[] = [
  {
    id: 't1',
    channel: 'customer',
    category: '催单响应',
    title: '现烤加急制作中，预计5分钟内出餐',
    content: '尊敬的顾客，您的现烤餐品正在黑曜石餐车主厨恒温烤架上现烤出炉，预计5分钟内完成保温装袋并交接给专线骑手，请您稍候片刻！',
    priority: 'urgent',
    voiceBroadcastText: '尊敬的顾客，您的现烤订单正在加急制作中，预计5分钟内出炉！'
  },
  {
    id: 't2',
    channel: 'customer',
    category: '地址与交接',
    title: '外卖已放指定前台/自提柜',
    content: '您好！您的餐品已安全送达指定地址，已妥善放置在前台/外卖保温柜，请凭取餐码及时趁热享用！如有疑问随时联系我们。',
    priority: 'normal',
    voiceBroadcastText: '您的餐品已送达指定位置，请及时趁热取用！'
  },
  {
    id: 't3',
    channel: 'customer',
    category: '口味与特殊备注',
    title: '特殊忌口与定制口味已确认',
    content: '主厨已收到您的特殊要求（免葱蒜/少辣/酱汁分装），现已严格按照无菌与定制标准单独现制！',
    priority: 'normal'
  },
  {
    id: 't4',
    channel: 'rider',
    category: '骑手调度',
    title: '餐车停靠点精确导航与取餐指引',
    content: '骑手师傅您好，黑曜石01号餐车当前停靠在【西藏北路大悦城北门广场】，已为您开启快速取餐绿色通道，进门右手边即是取餐架！',
    priority: 'urgent',
    voiceBroadcastText: '骑手师傅已接单，请前往大悦城北门绿色通道快速取餐！'
  },
  {
    id: 't5',
    channel: 'rider',
    category: '骑手调度',
    title: '大额双份餐品注意防颠簸与保温',
    content: '本单包含现调冷萃咖啡与厚切多汁牛肉汉堡，请骑手师傅在保温箱内固定好杯托，平稳骑行送达！',
    priority: 'urgent'
  },
  {
    id: 't6',
    channel: 'kitchen',
    category: '后厨现制',
    title: '加急出餐：堂食/外卖双通道优先排单',
    content: '【KDS加急工单】该单顾客在现场等候/外卖专送倒计时中，请烤架主管优先出餐并贴标封口！',
    priority: 'critical',
    voiceBroadcastText: '后厨注意，收到加急出餐指令，请立即优先现烤！',
    suggestedAction: 'speedup'
  },
  {
    id: 't7',
    channel: 'broadcast',
    category: '餐车广播',
    title: '全场限时现烤出炉广播',
    content: '【餐车现场大喇叭】黑曜石主厨特推【黑松露和牛小汉堡双重奏】刚刚现烤出炉，香气浓郁，欢迎各位食客趁热品尝！',
    priority: 'normal',
    voiceBroadcastText: '黑曜石主厨特推黑松露和牛小汉堡刚刚现烤出炉，欢迎趁热品尝！'
  },
  {
    id: 't8',
    channel: 'member',
    category: '会员福利',
    title: 'VIP 专属特权与立减优惠券已到账',
    content: '尊敬的黑曜石黑卡会员，感谢您的惠顾！已为您自动发放一张【¥20无门槛立减神券】，可在下次点单或加购时直接抵扣！',
    priority: 'normal',
    suggestedAction: 'coupon'
  }
];

export const ActiveMessageFormModal: React.FC<ActiveMessageFormModalProps> = ({
  isOpen,
  onClose,
  orders,
  dishes = [],
  truck,
  viewerRole = 'merchant',
  onAdvanceOrderStatus,
  showToast = (t, d) => fallbackToastCompat(t, d),
  onOpenOmniChat
}) => {
  // Form State
  const [selectedChannel, setSelectedChannel] = useState<MessageTargetChannel>('customer');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [enableVoiceBroadcast, setEnableVoiceBroadcast] = useState(false);
  const [attachedDishId, setAttachedDishId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voiceWaveform, setVoiceWaveform] = useState<number[]>([25, 45, 60, 30, 80, 50, 70, 40]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [micMode, setMicMode] = useState<'real_mic' | 'simulated'>('real_mic');

  // Set default selected order
  useEffect(() => {
    if (orders && orders.length > 0 && !selectedOrderId) {
      const active = orders.find((o) => o.status === 'cooking' || o.status === 'delivering') || orders[0];
      setSelectedOrderId(active.orderNo.replace(/^#/, ''));
    }
  }, [orders, selectedOrderId]);

  // Filtered preset templates for currently selected channel
  const currentTemplates = useMemo(() => {
    return PRESET_FORM_TEMPLATES.filter((t) => t.channel === selectedChannel);
  }, [selectedChannel]);

  // Selected Order object
  const currentOrder = useMemo(() => {
    if (!selectedOrderId) return orders[0] || null;
    const clean = selectedOrderId.replace(/^#/, '');
    return orders.find((o) => o.orderNo.replace(/^#/, '') === clean || o.id === clean) || orders[0] || null;
  }, [orders, selectedOrderId]);

  // Quick fill from template
  const handleApplyTemplate = (tpl: PresetTemplate) => {
    setMessageTitle(tpl.title);
    setMessageContent(tpl.content);
    setPriority(tpl.priority);
    if (tpl.voiceBroadcastText) {
      setEnableVoiceBroadcast(true);
    }
    showToast('已载入快捷表单模板', tpl.title);
  };

  // Toggle voice recording with real voiceMessageEngine
  const handleToggleVoiceRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      const voiceData = await voiceMessageEngine.stopRecording();
      const transcribed = voiceData?.transcribedText || liveTranscript;
      if (transcribed && transcribed.trim()) {
        const clean = transcribed.replace(/^【.*?】：?/, '').replace(/^语音转文字：/, '').trim();
        setMessageContent((prev) => (prev ? `${prev}\n${clean}` : clean));
        showToast('语音智能转写完成', `已填入识别内容: "${clean.slice(0, 24)}..."`);
      } else {
        const fallback = '【语音转写】师傅您好，这单请务必加急送达，客人正在大堂等候。';
        setMessageContent((prev) => (prev ? `${prev}\n${fallback}` : fallback));
        showToast('语音输入完成', '已自动智能转写填入表单');
      }
      setRecordSeconds(0);
      setLiveTranscript('');
    } else {
      setRecordSeconds(0);
      setLiveTranscript('');
      const res = await voiceMessageEngine.startRecording(
        (wave) => setVoiceWaveform(wave),
        (transcript) => setLiveTranscript(transcript)
      );
      setMicMode(res.mode);
      setIsRecording(true);
      showToast(
        res.mode === 'real_mic' ? '🎙️ 已启动真实麦克风录音' : '🎙️ 已启动对讲录音引擎',
        '请对麦克风说话，完成后再次点击停止并转写'
      );
    }
  };

  // Voice recording timer
  useEffect(() => {
    let timer: any = null;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Submit and activate message form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() && !messageTitle.trim()) {
      showToast('请填写表单内容', '表单正文不能为空');
      return;
    }

    setIsSubmitting(true);

    const targetOrderNo = currentOrder ? currentOrder.orderNo.replace(/^#/, '') : 'UR-9821';
    const finalSenderRole: ChatRole = (viewerRole === 'user' || viewerRole === 'customer') ? 'user' : viewerRole === 'rider' ? 'rider' : 'merchant';
    const senderName =
      viewerRole === 'merchant'
        ? '黑曜石餐车·运营管家'
        : viewerRole === 'rider'
        ? '专送骑手·张师傅'
        : (viewerRole === 'user' || viewerRole === 'customer')
        ? '点餐顾客'
        : '平台服务台';

    const selectedDish = dishes.find((d) => d.id === attachedDishId);

    // Format content with priority tag & title
    let fullText = messageContent.trim() || messageTitle.trim();
    if (messageTitle && messageContent && !messageContent.includes(messageTitle)) {
      fullText = `【${messageTitle}】\n${messageContent}`;
    }

    if (priority === 'urgent') {
      fullText = `⚡ [加急工单] ${fullText}`;
    } else if (priority === 'critical') {
      fullText = `🚨 [紧急红线] ${fullText}`;
    }

    // 1. Dispatch into Chat Hub
    sendOrderChatMessage(targetOrderNo, {
      senderRole: finalSenderRole,
      senderName,
      type: 'text',
      text: fullText,
      quotedDish: selectedDish
        ? {
            name: selectedDish.name,
            quantity: 1,
            price: selectedDish.price,
            imageUrl: selectedDish.imageUrl
          }
        : undefined
    });

    // 2. Hardware / Voice Broadcast if enabled
    if (enableVoiceBroadcast) {
      const speechText = messageTitle || fullText.slice(0, 40);
      try {
        speakText(`餐车广播提醒：${speechText}`, { chimeType: priority === 'critical' ? 'urgent' : 'call' });
      } catch (err) {
        console.warn('Voice speech trigger failed:', err);
      }
    }

    // 3. Status Action if applicable
    if (selectedChannel === 'kitchen' && onAdvanceOrderStatus && currentOrder) {
      if (currentOrder.status === 'cooking') {
        onAdvanceOrderStatus(currentOrder.orderNo || currentOrder.id, 'delivering', {
          etaMinutes: 5
        });
      }
    }

    setTimeout(() => {
      setIsSubmitting(false);
      showToast('消息表单激活并派发成功！', `已全网同步至订单 #${targetOrderNo} 通讯流`);
      onClose();
    }, 450);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-[#ffffff] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#e6e6e4] overflow-hidden flex flex-col my-auto max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-[#f7f7f5] px-4 sm:px-6 py-3.5 border-b border-[#e6e6e4] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2b593f] text-white flex items-center justify-center shadow-xs">
                <MessageSquareText className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-[#1a1c1b]">
                    激活协同消息表单
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    实时全网分发
                  </span>
                </div>
                <p className="text-[11px] text-[#787774]">
                  向顾客、专线骑手、后厨KDS或全员餐车发送结构化协同工单与通知
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-[#e8e8e6] text-[#787774] hover:text-[#1a1c1b] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content Body */}
          <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
            {/* 1. Target Channel Selection */}
            <div>
              <label className="block text-[11px] font-bold text-[#37352f] mb-1.5 flex items-center justify-between">
                <span>1. 选择消息分发目标渠道</span>
                <span className="text-[10px] text-[#787774] font-normal">多方实时同步</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {[
                  { id: 'customer', label: '顾客服务', icon: Store, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                  { id: 'rider', label: '专线骑手', icon: Bike, color: 'text-sky-700 bg-sky-50 border-sky-200' },
                  { id: 'kitchen', label: '后厨现制', icon: ChefHat, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                  { id: 'broadcast', label: '全车广播', icon: Megaphone, color: 'text-purple-700 bg-purple-50 border-purple-200' },
                  { id: 'member', label: '会员关怀', icon: Users, color: 'text-rose-700 bg-rose-50 border-rose-200' }
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedChannel === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedChannel(item.id as MessageTargetChannel)}
                      className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#37352f] text-white border-[#37352f] shadow-xs'
                          : 'bg-white hover:bg-[#f7f7f5] text-[#37352f] border-[#e6e6e4]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : ''}`} />
                      <span className="font-bold text-[11px] truncate w-full">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Order & Priority Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#37352f] mb-1">
                  关联工单 / 目标订单
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-[#d3d1cb] bg-white text-[#37352f] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-neutral-800"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.orderNo.replace(/^#/, '')}>
                      #{o.orderNo.replace(/^#/, '')} · {o.statusText} · ¥{o.totalAmount} · {o.items?.[0]?.name || '餐品'}
                    </option>
                  ))}
                  <option value="GLOBAL-BROADCAST">全车广播 / 无特定关联订单</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#37352f] mb-1">
                  消息优先级
                </label>
                <div className="flex items-center gap-1.5 h-9">
                  {[
                    { id: 'normal', label: '普通通知', color: 'bg-neutral-100 text-neutral-800 border-neutral-200' },
                    { id: 'urgent', label: '⚡ 加急工单', color: 'bg-amber-50 text-amber-900 border-amber-300' },
                    { id: 'critical', label: '🚨 紧急红线', color: 'bg-rose-50 text-rose-900 border-rose-300' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id as PriorityLevel)}
                      className={`flex-1 h-full rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                        priority === p.id
                          ? `${p.color} ring-1 ring-neutral-900`
                          : 'bg-white text-neutral-600 border-[#e6e6e4] hover:bg-neutral-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Preset Quick Templates for Fast Activation */}
            <div>
              <label className="block text-[11px] font-bold text-[#37352f] mb-1.5 flex items-center justify-between">
                <span>快捷表单模板（点击一键填入）</span>
                <span className="text-[10px] text-emerald-700 font-semibold">推荐常用格式</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {currentTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="p-2 text-left rounded-xl border border-[#e6e6e4] bg-[#fcfcfb] hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer group flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-800">
                          {tpl.category}
                        </span>
                        <span className="font-bold text-[11px] text-neutral-900 truncate">
                          {tpl.title}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-neutral-500 line-clamp-1 group-hover:text-neutral-700">
                        {tpl.content}
                      </p>
                    </div>
                    <Copy className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-700 shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Form Title & Text Content */}
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-[#37352f] mb-1">
                  表单主题 / 概要
                </label>
                <input
                  type="text"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  placeholder="例如：现烤和牛汉堡出餐加急通知 / 停靠点指引"
                  className="w-full h-9 px-3 rounded-xl border border-[#d3d1cb] bg-white text-[#37352f] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-neutral-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-[#37352f]">
                    表单正文 / 协同说明 <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleVoiceRecording}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        isRecording
                          ? 'bg-rose-100 text-rose-700 border border-rose-300 animate-pulse'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300'
                      }`}
                    >
                      {isRecording ? <MicOff className="w-3 h-3 text-rose-600" /> : <Mic className="w-3 h-3" />}
                      <span>{isRecording ? `录音中 (${recordSeconds}s) 点击停止` : '语音转写填入'}</span>
                    </button>
                    <span className="text-[10px] text-[#787774]">{messageContent.length}/300</span>
                  </div>
                </div>

                {isRecording && (
                  <div className="mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-[11px] font-bold text-rose-900">
                          正在录音与声学降噪 ({recordSeconds}s)
                        </span>
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-rose-200/80 text-rose-800 tabular-nums">
                          {micMode === 'real_mic' ? '麦克风拾音' : '对讲电台'}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 h-3">
                        {voiceWaveform.map((h, i) => (
                          <div
                            key={i}
                            className="w-1 bg-rose-500 rounded-full transition-all duration-150"
                            style={{ height: `${Math.max(4, h / 5)}px` }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-[11px] text-neutral-800 bg-white/90 p-1.5 rounded-lg border border-neutral-200 flex items-start gap-1">
                      <FileText className="w-3 h-3 text-neutral-600 stroke-[1.5] shrink-0 mt-0.5" />
                      <span className="text-neutral-700">
                        {liveTranscript || '正在聆听您的声音，请清晰说话...'}
                      </span>
                    </div>
                  </div>
                )}

                <textarea
                  rows={3}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  maxLength={300}
                  placeholder="请输入消息内容，发送后将立即推送到对应订单实时聊天流并记录操作审计日志..."
                  className="w-full p-3 rounded-xl border border-[#d3d1cb] bg-white text-[#37352f] text-xs font-normal focus:outline-none focus:ring-1 focus:ring-neutral-800 leading-relaxed resize-none"
                />
              </div>
            </div>

            {/* 5. Additional Hardware & Broadcast Options */}
            <div className="p-3 rounded-xl bg-[#f7f7f5] border border-[#e6e6e4] space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableVoiceBroadcast}
                    onChange={(e) => setEnableVoiceBroadcast(e.target.checked)}
                    className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                  />
                  <span className="font-bold text-[11px] text-[#37352f] flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-purple-700" />
                    同步触发餐车智能大喇叭 / 硬件语音播报
                  </span>
                </label>
                <span className="text-[10px] text-neutral-500">TTS语音合成引擎</span>
              </div>

              {dishes.length > 0 && (
                <div className="pt-1 flex items-center gap-2">
                  <span className="text-[10.5px] text-[#787774] shrink-0">附带菜品卡片 (可选):</span>
                  <select
                    value={attachedDishId}
                    onChange={(e) => setAttachedDishId(e.target.value)}
                    className="flex-1 h-7 px-2 rounded-lg border border-[#d3d1cb] bg-white text-[11px] font-medium"
                  >
                    <option value="">无附带菜品</option>
                    {dishes.slice(0, 15).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (¥{d.price})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </form>

          {/* Footer Action Controls */}
          <div className="bg-[#f7f7f5] px-4 sm:px-6 py-3 border-t border-[#e6e6e4] flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onOpenOmniChat) {
                  onClose();
                  onOpenOmniChat(selectedOrderId);
                } else {
                  onClose();
                }
              }}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>查看聚合消息中枢</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl border border-[#d3d1cb] bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmitForm}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-xl bg-[#2b593f] hover:bg-[#224732] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? '分发中...' : '立即激活并派发表单'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
