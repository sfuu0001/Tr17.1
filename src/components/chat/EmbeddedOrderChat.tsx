import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  MessageSquareText,
  ExternalLink,
  ChevronUp,
  Phone,
  Bike,
  Store,
  User,
  ShieldCheck,
  Zap,
  Clock,
  FileText,
  Volume2,
  VolumeX,
  CheckCheck,
  RefreshCw,
  Gift,
  Flame,
  AlertCircle,
  Mic,
  MicOff
} from 'lucide-react';
import { Order } from '../../types';
import {
  ChatMessageItem,
  ChatRole,
  getOrderChatMessages,
  sendOrderChatMessage,
  subscribeOrderChat,
  formatExactTime,
  formatRelativeTime,
  calculateChatSLAResponse
} from '../../utils/chatHub';
import { voiceMessageEngine } from '../../utils/voiceMessageEngine';

export interface EmbeddedOrderChatProps {
  order: Order;
  viewerRole?: 'user' | 'rider' | 'merchant' | 'platform' | 'customer';
  onOpenFullScreen?: () => void;
  onClose?: () => void;
  showToast?: (title: string, desc?: string) => void;
  onAdvanceOrderStatus?: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onRejectOrder?: (orderId: string, reason: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
}

export const EmbeddedOrderChat: React.FC<EmbeddedOrderChatProps> = ({
  order,
  viewerRole = 'customer',
  onOpenFullScreen,
  onClose,
  showToast = () => {}
}) => {
  const cleanOrderNo = (order.orderNo || '').replace(/^#/, '');
  const [messages, setMessages] = useState<ChatMessageItem[]>(() =>
    getOrderChatMessages(cleanOrderNo, order)
  );
  const [inputText, setInputText] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'rider' | 'merchant' | 'platform'>('all');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const voicePlayerRef = useRef<{ stop: () => void } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [liveWaveform, setLiveWaveform] = useState<number[]>([20, 50, 80, 40, 70, 30]);
  const recordingTimerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      voicePlayerRef.current?.stop();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const normalizedRole: ChatRole =
    viewerRole === 'customer' || viewerRole === 'user'
      ? 'user'
      : viewerRole === 'rider'
      ? 'rider'
      : viewerRole === 'platform'
      ? 'platform'
      : 'merchant';

  const roleSenderName = useMemo(() => {
    switch (normalizedRole) {
      case 'user':
        return order.customerName || '顾客 (我)';
      case 'rider':
        return order.courierName || '陈志远 · 专线骑手 (我)';
      case 'merchant':
        return order.truckName || '黑曜石移动餐车 (我)';
      case 'platform':
        return '平台协同专员 (我)';
      default:
        return '在线用户';
    }
  }, [normalizedRole, order]);

  // SLA status
  const slaStatus = useMemo(() => {
    return calculateChatSLAResponse(cleanOrderNo, normalizedRole, order);
  }, [cleanOrderNo, normalizedRole, order, messages.length]);

  // Subscribe to real-time chat updates
  useEffect(() => {
    setMessages(getOrderChatMessages(cleanOrderNo, order));
    const unsub = subscribeOrderChat(cleanOrderNo, () => {
      setMessages(getOrderChatMessages(cleanOrderNo, order));
    });
    return () => unsub();
  }, [cleanOrderNo, order]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Handle Send message
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text) return;

    sendOrderChatMessage(cleanOrderNo, {
      senderRole: normalizedRole,
      senderName: roleSenderName,
      type: 'text',
      text
    });

    if (textToSend === undefined) {
      setInputText('');
    }
    showToast('消息已发送', text);
  };

  // Quick Preset Replies
  const quickReplies = useMemo(() => {
    if (normalizedRole === 'user') {
      return [
        '请放大厦前台或门卫处，谢谢！',
        '请尽快配送，正在开会等待就餐',
        '需要无接触配送，放门口即可',
        '请帮我多备一份环保餐具与纸巾'
      ];
    } else if (normalizedRole === 'rider') {
      return [
        '已到达餐车取餐点，正在取餐',
        '已取餐完毕，正在全速配送中',
        '预计 5 分钟后送达，请留意电话',
        '餐品已安全放置在大厦前台'
      ];
    } else if (normalizedRole === 'merchant') {
      return [
        '餐品现点现烤中，锁鲜烘烤需5分钟',
        '主厨已打包完成，正等待骑手取餐',
        '已为您加赠招牌黑曜石特调纸巾包',
        '若有特殊忌口请随时在线告知'
      ];
    }
    return [
      '系统已为您接入三方在线客服通道',
      '请保持在线，我们将竭诚为您协调'
    ];
  }, [normalizedRole]);

  // Filtered message list
  const filteredMessages = useMemo(() => {
    if (filterRole === 'all') return messages;
    if (filterRole === 'rider') return messages.filter((m) => m.senderRole === 'rider' || m.senderRole === 'system');
    if (filterRole === 'merchant') return messages.filter((m) => m.senderRole === 'merchant' || m.senderRole === 'system');
    if (filterRole === 'platform') return messages.filter((m) => m.senderRole === 'platform' || m.senderRole === 'system');
    return messages;
  }, [messages, filterRole]);

  // Play/Pause real voice
  const togglePlayVoice = (msg: ChatMessageItem) => {
    if (playingVoiceId === msg.id) {
      voicePlayerRef.current?.stop();
      voicePlayerRef.current = null;
      setPlayingVoiceId(null);
      return;
    }

    voicePlayerRef.current?.stop();
    setPlayingVoiceId(msg.id);

    voicePlayerRef.current = voiceMessageEngine.playVoice(
      msg.voiceAudioBase64 || msg.voiceAudioUrl,
      msg.voiceTranscribed || msg.text || '语音协同消息',
      msg.voiceDuration || 4,
      () => {
        setPlayingVoiceId(null);
        voicePlayerRef.current = null;
      }
    );
  };

  // Start real recording
  const handleStartRecording = async () => {
    if (isRecording) return;
    setRecordSeconds(0);
    setLiveTranscript('');
    setLiveWaveform([20, 50, 80, 40, 70, 30]);

    const res = await voiceMessageEngine.startRecording(
      (wave) => setLiveWaveform(wave),
      (transcript) => setLiveTranscript(transcript)
    );

    setIsRecording(true);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordSeconds((s) => {
        if (s >= 60) {
          handleStopAndSendVoice();
          return 60;
        }
        return s + 1;
      });
    }, 1000);

    showToast?.(
      res.mode === 'real_mic' ? '🎙️ 已启动麦克风录音' : '🎙️ 已启动对讲录音',
      '请对麦克风说话，完成后点击停止发送'
    );
  };

  // Stop and send real voice message
  const handleStopAndSendVoice = async () => {
    if (!isRecording) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);

    const voiceData = await voiceMessageEngine.stopRecording();
    if (voiceData) {
      const finalTranscribed =
        voiceData.transcribedText || liveTranscript || '【语音协同消息】';

      sendOrderChatMessage(cleanOrderNo, {
        senderRole: normalizedRole,
        senderName: roleSenderName,
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

      showToast?.(`🎙️ ${Math.max(1, voiceData.duration)}秒 语音已送达`, '点击气泡可原声回放');
    }
  };

  return (
    <div
      className="mt-2.5 bg-[#fcfcfb] rounded-xl border border-neutral-300/80 overflow-hidden shadow-xs flex flex-col text-xs animate-in fade-in zoom-in-98 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Embedded Header Bar */}
      <div className="bg-neutral-900 text-white px-3 py-2 flex items-center justify-between gap-2 border-b border-neutral-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-bold text-[11px] sm:text-xs text-neutral-100 truncate">
            在线协同通讯 · 订单 #{cleanOrderNo}
          </span>
          <span className="hidden xs:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] tabular-nums border border-emerald-400/30 shrink-0">
            <ShieldCheck className="w-2.5 h-2.5" />
            三端加密
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenFullScreen && (
            <button
              type="button"
              onClick={onOpenFullScreen}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="切换至全屏大窗模式"
            >
              <ExternalLink className="w-3 h-3 text-emerald-300" />
              <span className="hidden sm:inline">全屏模式</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="收起嵌入式在线消息"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Channel Filter & SLA Bar */}
      <div className="bg-white px-3 py-1.5 border-b border-neutral-200 flex items-center justify-between gap-2 flex-wrap text-[11px]">
        <div className="flex items-center gap-1">
          <span className="text-neutral-600 font-bold text-[10.5px] mr-1">频道:</span>
          {[
            { id: 'all', label: '全部' },
            { id: 'rider', label: '骑手' },
            { id: 'merchant', label: '餐车' },
            { id: 'platform', label: '平台' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterRole(tab.id as any)}
              className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold transition-colors cursor-pointer ${
                filterRole === tab.id
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-neutral-600">
          <Clock className="w-3 h-3 text-neutral-600" />
          <span>响应评级:</span>
          <span className="font-bold tabular-nums text-emerald-800 bg-emerald-100 px-1 rounded">
            {slaStatus.slaTier}级 ({slaStatus.responseRatePercent}%)
          </span>
        </div>
      </div>

      {/* 3. Messages Stream */}
      <div className="p-3 space-y-2.5 max-h-[260px] sm:max-h-[300px] overflow-y-auto bg-[#fafaf8]">
        {filteredMessages.length === 0 ? (
          <div className="py-6 text-center text-neutral-600">
            <MessageSquareText className="w-6 h-6 mx-auto mb-1 text-neutral-500" />
            <p className="text-[11px]">该频道暂无消息记录</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderRole === normalizedRole;
            const isSystem = msg.senderRole === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1">
                  <div className="bg-neutral-200/80 text-neutral-700 px-2.5 py-1 rounded-full text-[10px] flex items-center gap-1 border border-neutral-300/50 max-w-[95%] text-center">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            if (msg.type === 'status_change' && msg.statusChangeInfo) {
              return (
                <div key={msg.id} className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">
                        <Flame className="w-3 h-3" />
                      </div>
                      <span className="font-bold text-[11px] text-amber-950">
                        {msg.statusChangeInfo.title}
                      </span>
                    </div>
                    <span className="text-[9.5px] tabular-nums text-amber-700">
                      {msg.time}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-amber-900 leading-relaxed">
                    {msg.statusChangeInfo.description}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs ${
                    msg.senderRole === 'rider'
                      ? 'bg-sky-600 text-white'
                      : msg.senderRole === 'merchant'
                      ? 'bg-neutral-800 text-white'
                      : msg.senderRole === 'platform'
                      ? 'bg-purple-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                  title={msg.senderName}
                >
                  {msg.senderRole === 'rider' ? (
                    <Bike className="w-3.5 h-3.5" />
                  ) : msg.senderRole === 'merchant' ? (
                    <Store className="w-3.5 h-3.5" />
                  ) : msg.senderRole === 'platform' ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-0.5 px-0.5">
                    <span className="text-[10px] text-neutral-600 font-medium">
                      {msg.senderName}
                    </span>
                    <span className="text-[9px] text-neutral-600 tabular-nums">
                      {msg.time}
                    </span>
                  </div>

                  {msg.type === 'voice' ? (
                    <button
                      type="button"
                      onClick={() => togglePlayVoice(msg)}
                      className={`p-2.5 rounded-2xl flex items-center gap-2 cursor-pointer transition-all ${
                        isMe
                          ? 'bg-neutral-900 text-white rounded-tr-xs'
                          : 'bg-white text-neutral-900 border border-neutral-200 shadow-2xs rounded-tl-xs'
                      }`}
                    >
                      {playingVoiceId === msg.id ? (
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      ) : (
                        <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                      <div className="flex items-center gap-0.5 h-3">
                        {(msg.voiceWaveform || [20, 60, 90, 40, 80, 50, 70]).map((h, i) => (
                          <div
                            key={i}
                            className={`w-0.5 rounded-full ${
                              playingVoiceId === msg.id
                                ? 'bg-emerald-400 animate-bounce'
                                : isMe
                                ? 'bg-neutral-400'
                                : 'bg-neutral-300'
                            }`}
                            style={{
                              height: `${Math.max(4, (h / 100) * 12)}px`,
                              animationDelay: `${i * 0.1}s`
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] tabular-nums">{msg.voiceDuration || 5}"</span>
                    </button>
                  ) : (
                    <div
                      className={`px-3 py-2 rounded-2xl text-[11px] sm:text-xs leading-relaxed shadow-2xs ${
                        isMe
                          ? 'bg-neutral-900 text-white rounded-tr-xs'
                          : 'bg-white text-neutral-900 border border-neutral-200 rounded-tl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}

                  {msg.voiceTranscribed && (
                    <div className="text-[9.5px] text-neutral-600 mt-0.5 italic px-1">
                      {msg.voiceTranscribed}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Preset Replies Horizontal Scroller */}
      <div className="px-2.5 py-1.5 bg-neutral-100/90 border-t border-neutral-200 flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
        <span className="text-[10px] text-neutral-600 font-bold shrink-0 flex items-center gap-0.5">
          <Zap className="w-2.5 h-2.5 text-amber-600" />
          快捷:
        </span>
        {quickReplies.map((reply, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(reply)}
            className="px-2 py-0.5 rounded-full bg-white hover:bg-neutral-200 border border-neutral-300 text-neutral-700 hover:text-neutral-900 text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs shrink-0"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Voice Recording Status Dock */}
      {isRecording && (
        <div className="px-3 py-2 bg-rose-50 border-t border-rose-200 flex flex-col gap-1.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] text-rose-900 font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>录音中 ({recordSeconds}s / 60s)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
                setIsRecording(false);
                voiceMessageEngine.stopRecording();
              }}
              className="text-rose-600 hover:text-rose-800 text-[10px] cursor-pointer"
            >
              取消
            </button>
          </div>
          <div className="flex items-center gap-1 h-3">
            {liveWaveform.map((h, i) => (
              <div
                key={i}
                className="w-1 bg-rose-500 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(4, h / 5)}px` }}
              />
            ))}
          </div>
          <div className="text-[10.5px] text-neutral-700 bg-white/90 p-1.5 rounded-lg border border-neutral-200 flex items-center gap-1">
            <FileText className="w-3 h-3 text-neutral-600 stroke-[1.5] shrink-0" />
            <span className="truncate">{liveTranscript || '正在采集您的语音输入...'}</span>
          </div>
        </div>
      )}

      {/* 5. Message Input Bar */}
      <div className="p-2 bg-white border-t border-neutral-200 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (isRecording) {
              handleStopAndSendVoice();
            } else {
              handleStartRecording();
            }
          }}
          className={`p-1.5 sm:px-2 sm:py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
            isRecording
              ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'
          }`}
          title={isRecording ? '点击停止并发送语音' : '点击录制语音消息'}
        >
          {isRecording ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5" />}
          {isRecording && <span className="text-[10px] font-bold">停止并发送</span>}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="输入实时消息 / 催单 / 备注..."
          className="flex-1 px-3 py-1.5 rounded-xl border border-neutral-300 focus:border-neutral-900 focus:outline-none text-[11px] sm:text-xs text-neutral-900 bg-neutral-50/50"
        />

        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim()}
          className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[11px] flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
        >
          <Send className="w-3 h-3 text-emerald-400" />
          <span>发送</span>
        </button>
      </div>
    </div>
  );
};
