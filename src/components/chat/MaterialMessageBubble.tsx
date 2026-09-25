import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Camera,
  FileText,
  Radio,
  Zap,
  Flame,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Volume2,
  Bike,
  Store,
  User,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  ChevronRight,
  Maximize2,
  Check,
  Award,
  AlertCircle,
  CreditCard,
  Play,
  Pause,
  ShieldAlert,
  Timer,
  CheckCheck,
  Sparkles,
  MessageSquare,
  History,
  Activity
} from 'lucide-react';
import { matchDishImageUrl } from '../../utils/dishImageMatcher';
import { voiceMessageEngine } from '../../utils/voiceMessageEngine';
import { SLASupervisionInfo } from '../../utils/chatHub';
import { FeishuQuotedBubble } from './FeishuQuoteBanner';
import { MediaEvidenceLightbox } from './MediaEvidenceLightbox';
import { ExceptionWorkflowCard } from './ExceptionWorkflowCard';

export interface MaterialMessageBubbleProps {
  text: string;
  isSelf: boolean;
  senderRole?: 'user' | 'rider' | 'merchant' | 'platform' | 'system';
  senderName?: string;
  time?: string;
  type?: string;
  voiceDuration?: number;
  voiceTranscribed?: string;
  voiceAudioUrl?: string;
  voiceAudioBase64?: string;
  voiceWaveform?: number[];
  isListened?: boolean;
  onVoiceListened?: () => void;
  isRecalled?: boolean;
  recalledBy?: string;
  originalTextBeforeRecall?: string;
  onReEditRecall?: (text: string) => void;
  exceptionWorkflow?: any;
  onWorkflowAction?: (action: 'accept' | 'refund' | 'view_berth', payload?: any) => void;
  orderNo?: string;
  messageId?: string;
  slaSupervision?: SLASupervisionInfo;
  onSLAAction?: (action: 'respond' | 'resolve' | 'log', payload?: any) => void;
  statusChangeInfo?: {
    fromStatus?: string;
    toStatus?: string;
    title?: string;
    description?: string;
    actionOperator?: string;
    operatorRole?: string;
  };
  quoteReply?: {
    id: string;
    senderName: string;
    senderRole: any;
    text: string;
  };
  onLocateMessage?: (targetId: string) => void;
  onQuickAction?: (actionType: string, payload?: any) => void;
  showToast?: (title: string, desc?: string) => void;
  playWalkieTalkieBeep?: () => void;
  playChimeSound?: () => void;
  paymentStatus?: 'unpaid' | 'paid';
  onPayBill?: (amount: number, orderNo: string) => void;
  onRemindPayment?: (orderNo: string) => void;
  onConfirmPaymentReceived?: (orderNo: string) => void;
  viewerRole?: 'user' | 'rider' | 'merchant' | 'platform';
}

// 检查是否为纯 Emoji 消息 (1 到 4 个常用 Emoji)
function isPureEmojiMessage(str: string): boolean {
  const trimmed = str.trim();
  if (!trimmed || trimmed.length > 16) return false;
  // 正则匹配常见 Emoji 与相关符号
  const emojiRegex = /^(\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]|\s)+$/u;
  return emojiRegex.test(trimmed) && !trimmed.includes('【') && !trimmed.includes(':');
}

export const MaterialMessageBubble: React.FC<MaterialMessageBubbleProps> = ({
  text,
  isSelf,
  senderRole = 'user',
  senderName = '',
  time = '',
  type = 'text',
  voiceDuration = 5,
  voiceTranscribed = '',
  voiceAudioUrl,
  voiceAudioBase64,
  voiceWaveform = [16, 24, 32, 20, 28, 40, 36, 18, 26, 30, 22, 14, 28],
  isListened = false,
  onVoiceListened,
  isRecalled = false,
  recalledBy,
  originalTextBeforeRecall,
  onReEditRecall,
  exceptionWorkflow,
  onWorkflowAction,
  orderNo = 'UR-9821',
  messageId,
  slaSupervision,
  onSLAAction,
  statusChangeInfo,
  quoteReply,
  onLocateMessage,
  onQuickAction,
  showToast = () => {},
  playWalkieTalkieBeep = () => {},
  playChimeSound = () => {},
  paymentStatus,
  onPayBill,
  onRemindPayment,
  onConfirmPaymentReceived,
  viewerRole = 'user'
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState<number>(0);
  const [playbackTotalDuration, setPlaybackTotalDuration] = useState<number>(voiceDuration || 5);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('影像留存');
  const [isAddingSLALog, setIsAddingSLALog] = useState(false);
  const [slaLogInput, setSlaLogInput] = useState('');
  const [isResolvingSLA, setIsResolvingSLA] = useState(false);
  const [slaResolveInput, setSlaResolveInput] = useState('');
  const [showAllSLALogs, setShowAllSLALogs] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());
  const voicePlayerRef = useRef<{ stop: () => void } | null>(null);

  const hasSLACard = type === 'sla_supervision' || Boolean(slaSupervision);
  const isSLAResolved =
    slaSupervision?.status === 'resolved' || slaSupervision?.status === 'overdue_resolved';

  // 定时器用于实时刷新 SLA 倒计时和等待耗时 (仅在未解决的工单上启动)
  useEffect(() => {
    if (hasSLACard && !isSLAResolved) {
      const timer = setInterval(() => {
        setNowTimestamp(Date.now());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [hasSLACard, isSLAResolved]);

  useEffect(() => {
    return () => {
      if (voicePlayerRef.current) {
        voicePlayerRef.current.stop();
        voicePlayerRef.current = null;
      }
    };
  }, []);

  const copyToClipboard = (content: string, label: string) => {
    try {
      navigator.clipboard.writeText(content);
      setCopiedKey(label);
      showToast('已复制到剪贴板', `${label}: ${content}`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      showToast('复制失败', '请手动选中复制');
    }
  };

  // 消息已撤回渲染
  if (isRecalled) {
    const roleNameMap: Record<string, string> = {
      merchant: '餐车商家',
      rider: '专线骑手',
      user: '顾客',
      platform: '调度总控'
    };
    const who = isSelf ? '您' : roleNameMap[recalledBy || senderRole] || '对方';
    return (
      <div className="py-1 px-3 text-center text-xs text-neutral-400 font-sans italic flex items-center justify-center gap-2 select-none">
        <span>{who}撤回了一条消息</span>
        {isSelf && originalTextBeforeRecall && onReEditRecall && (
          <button
            type="button"
            onClick={() => onReEditRecall(originalTextBeforeRecall)}
            className="not-italic text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2 cursor-pointer text-xs"
          >
            重新编辑
          </button>
        )}
      </div>
    );
  }

  // 结构化异常工单卡片渲染
  if (exceptionWorkflow) {
    return (
      <ExceptionWorkflowCard
        message={
          {
            id: 'temp-wf',
            orderNo,
            senderRole,
            senderName,
            time,
            text,
            exceptionWorkflow
          } as any
        }
        activeRole={senderRole as any}
        isSelf={isSelf}
        onAction={onWorkflowAction}
        showToast={showToast}
        playChimeSound={playChimeSound}
      />
    );
  }

  // 0. 语音消息渲染 (type === 'voice')
  if (type === 'voice') {
    const cleanTranscription = (voiceTranscribed || text || '')
      .replace(/^【语音消息】：?/, '')
      .replace(/^【语音已转文字】：?/, '')
      .replace(/^语音转文字：/, '')
      .trim();

    const waveBase =
      voiceWaveform && voiceWaveform.length > 0
        ? voiceWaveform
        : [25, 45, 75, 90, 80, 50, 95, 70, 40, 85, 60, 45, 30];
    const playedBarsCount = Math.floor(playbackProgress * waveBase.length);
    const charsList = cleanTranscription.split('');
    const totalChars = charsList.length;
    const activeCharIndex = isAudioPlaying && totalChars > 0 ? Math.min(totalChars - 1, Math.floor(playbackProgress * totalChars)) : -1;

    const toggleVoice = () => {
      if (isAudioPlaying) {
        if (voicePlayerRef.current) {
          voicePlayerRef.current.stop();
          voicePlayerRef.current = null;
        }
        setIsAudioPlaying(false);
        setPlaybackProgress(0);
        setPlaybackCurrentTime(0);
        return;
      }

      playWalkieTalkieBeep();
      setIsAudioPlaying(true);
      setPlaybackProgress(0);
      setPlaybackCurrentTime(0);

      const ctrl = voiceMessageEngine.playVoice(
        voiceAudioBase64 || voiceAudioUrl,
        cleanTranscription,
        voiceDuration || 5,
        () => {
          setIsAudioPlaying(false);
          setPlaybackProgress(1.0);
          voicePlayerRef.current = null;
          if (onVoiceListened) {
            onVoiceListened();
          }
          setTimeout(() => {
            setPlaybackProgress(0);
            setPlaybackCurrentTime(0);
          }, 800);
        },
        playbackRate,
        (prog, cur, total) => {
          setPlaybackProgress(prog);
          setPlaybackCurrentTime(cur);
          if (total) setPlaybackTotalDuration(total);
        }
      );
      voicePlayerRef.current = ctrl;
    };

    const formatSec = (sec: number) => {
      const s = Math.floor(sec);
      const mins = Math.floor(s / 60);
      const rem = s % 60;
      return `${mins}:${String(rem).padStart(2, '0')}`;
    };

    return (
      <div className={`w-[260px] sm:w-[310px] p-3.5 rounded-2xl font-sans space-y-3 border shadow-sm backdrop-blur-sm transition-all duration-200 ${
        isSelf 
          ? 'bg-neutral-900 text-white border-neutral-800 rounded-tr-xs' 
          : 'bg-white/98 text-neutral-900 border-neutral-200/90 rounded-tl-xs shadow-md/5'
      }`}>
        {/* 声学控制与声波脉冲主控条 */}
        <div className="flex items-center justify-between gap-2.5">
          {/* 拟态真实对讲播放按键 (带有声学脉冲外环动画) */}
          <button
            type="button"
            onClick={toggleVoice}
            className={`relative group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all active:scale-95 shrink-0 select-none ${
              isSelf
                ? 'bg-white text-neutral-950 hover:bg-neutral-100 shadow-sm'
                : 'bg-neutral-900 text-white hover:bg-black shadow-sm'
            }`}
          >
            {isAudioPlaying && (
              <span className="absolute -inset-1 rounded-full bg-emerald-500/25 animate-ping pointer-events-none" />
            )}
            {isAudioPlaying ? (
              <Pause className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600 shrink-0" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="tabular-nums tracking-tight">
              {isAudioPlaying
                ? `${formatSec(playbackCurrentTime)}`
                : `${voiceDuration || 5}" 语音`}
            </span>
          </button>

          {/* 拟态高保真多频段声波波形 (播放中拟真频段上下跃动 + 播放进度流光着色) */}
          <div
            className="flex items-center gap-0.5 flex-1 justify-center h-6 px-1 cursor-pointer select-none"
            onClick={toggleVoice}
            title={isAudioPlaying ? '点击暂停' : '点击收听'}
          >
            {waveBase.map((baseH, i) => {
              const isPlayed = isAudioPlaying && i <= playedBarsCount;
              const animDuration = (0.38 + (i % 5) * 0.1).toFixed(2);
              const animDelay = ((i * 0.06) % 0.35).toFixed(2);
              return (
                <span
                  key={i}
                  className={`w-1 rounded-full transition-all duration-100 origin-bottom ${
                    isPlayed
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.85)]'
                      : isAudioPlaying
                      ? isSelf
                        ? 'bg-emerald-300/40'
                        : 'bg-emerald-600/35'
                      : isSelf
                      ? 'bg-neutral-600'
                      : 'bg-neutral-300'
                  }`}
                  style={{
                    height: `${Math.max(20, (baseH || 30) * 0.65)}%`,
                    animation: isAudioPlaying
                      ? `sound-wave ${animDuration}s ease-in-out ${animDelay}s infinite alternate`
                      : 'none'
                  }}
                />
              );
            })}
          </div>

          {/* 右侧：倍速切换微标签 (1.0x / 1.5x / 2.0x) 与 已听回执 */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const nextRate = playbackRate === 1.0 ? 1.5 : playbackRate === 1.5 ? 2.0 : 1.0;
                setPlaybackRate(nextRate);
                showToast('已切换语音倍速', `当前播放速率: ${nextRate}x`);
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums border cursor-pointer transition shadow-3xs ${
                isSelf
                  ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
                  : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
              }`}
              title="切换播放倍速"
            >
              {playbackRate}x
            </button>

            {isListened && (
              <span
                className={`text-[9px] tabular-nums px-1.5 py-0.2 rounded border font-medium ${
                  isSelf
                    ? 'text-emerald-300 border-emerald-500/40 bg-emerald-950/60'
                    : 'text-emerald-700 border-emerald-300 bg-emerald-50'
                }`}
              >
                已听
              </span>
            )}
          </div>
        </div>

        {/* 底部转文字卡片：逐字声学同步高亮 + 声效头光标跟随 */}
        {cleanTranscription && (
          <div className={`pt-2.5 border-t space-y-2 transition-all duration-150 ${
            isSelf ? 'border-neutral-800' : 'border-neutral-100'
          }`}>
            <div className="flex items-center justify-between text-[11px] select-none">
              <div className="flex items-center gap-1.5">
                <span className={`relative flex h-2 w-2`}>
                  {isAudioPlaying ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 animate-pulse-dot" />
                    </>
                  ) : (
                    <span className={`h-2 w-2 rounded-full ${isSelf ? 'bg-neutral-600' : 'bg-neutral-300'}`} />
                  )}
                </span>
                <span className={`font-medium ${isSelf ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {isAudioPlaying ? '实时声学同传 · 逐字同步中' : '语音已转文字'}
                </span>
              </div>

              <div className="tabular-nums text-[10px] text-neutral-400">
                {isAudioPlaying ? (
                  <span className="text-emerald-600 font-bold">
                    {formatSec(playbackCurrentTime)} / {formatSec(playbackTotalDuration)}
                  </span>
                ) : (
                  <span>共 {totalChars} 字</span>
                )}
              </div>
            </div>

            {/* 逐字跟随文本容器 (逐字变色与当前高亮音标定位) */}
            <div
              onClick={toggleVoice}
              className={`p-2.5 rounded-xl text-[12.5px] leading-relaxed break-words font-normal tracking-wide transition-all select-text cursor-pointer ${
                isSelf
                  ? 'bg-neutral-950/70 text-neutral-100 border border-neutral-800/80 hover:border-neutral-700'
                  : 'bg-neutral-50 text-neutral-800 border border-neutral-200/70 hover:border-neutral-300'
              }`}
            >
              {charsList.map((char, cIdx) => {
                const isSpoken = isAudioPlaying && cIdx < activeCharIndex;
                const isCurrent = isAudioPlaying && cIdx === activeCharIndex;

                if (isCurrent) {
                  return (
                    <span
                      key={cIdx}
                      className="relative inline-block px-1 -mx-0.5 rounded font-bold text-white bg-emerald-600 shadow-sm ring-2 ring-emerald-400/60 scale-110 z-10 transition-transform duration-75"
                    >
                      {char}
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                    </span>
                  );
                }

                if (isSpoken) {
                  return (
                    <span
                      key={cIdx}
                      className={`font-semibold transition-colors duration-100 ${
                        isSelf
                          ? 'text-emerald-300 bg-emerald-950/40 rounded-xs'
                          : 'text-emerald-700 bg-emerald-100/70 rounded-xs'
                      }`}
                    >
                      {char}
                    </span>
                  );
                }

                return (
                  <span
                    key={cIdx}
                    className={`transition-colors duration-150 ${
                      isAudioPlaying ? (isSelf ? 'text-neutral-500' : 'text-neutral-400') : ''
                    }`}
                  >
                    {char}
                  </span>
                );
              })}
            </div>

            {/* 逐字同步微型进度条 */}
            {isAudioPlaying && (
              <div className="h-1 w-full bg-neutral-200/80 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.max(0, Math.round(playbackProgress * 100)))}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 0.05 SLA 督办工单卡片嵌入 (type === 'sla_supervision' || slaSupervision)
  if (type === 'sla_supervision' || slaSupervision) {
    const s = slaSupervision || {
      ticketId: `SLA-${orderNo}-902`,
      level: 'P1',
      category: 'merchant_delay',
      categoryLabel: '高峰履约保效督办',
      title: '时效协同督办',
      description: text || '平台智能调度算法已挂载本单时效督办。',
      status: 'in_progress',
      slaTargetSeconds: 180,
      triggeredAt: Date.now() - 60000,
      deadlineAt: Date.now() + 120000,
      logs: []
    };

    const isResolved = s.status === 'resolved' || s.status === 'overdue_resolved';
    const isPending = s.status === 'pending';
    const isInProgress = s.status === 'in_progress';

    // 计算倒计时或已耗时
    const elapsedSinceTrigger = Math.max(0, Math.round((nowTimestamp - s.triggeredAt) / 1000));
    const remainingSeconds = Math.max(0, Math.round((s.deadlineAt - nowTimestamp) / 1000));
    const isOverdue = nowTimestamp > s.deadlineAt && !isResolved;

    const formatDuration = (totalSec: number) => {
      const mins = Math.floor(totalSec / 60);
      const rem = totalSec % 60;
      return `${mins}分${String(rem).padStart(2, '0')}秒`;
    };

    const levelBadge = {
      P0: { label: 'P0 特急督办 · 15m 红线', bg: 'bg-rose-500 text-white shadow-rose-200' },
      P1: { label: 'P1 紧急协同 · 3m 履约时限', bg: 'bg-amber-500 text-white shadow-amber-200' },
      P2: { label: 'P2 日常巡检督办', bg: 'bg-sky-500 text-white shadow-sky-200' }
    }[s.level || 'P1'] || { label: 'P1 紧急协同 · 3m 履约时限', bg: 'bg-amber-500 text-white shadow-amber-200' };

    return (
      <div className="w-[300px] sm:w-[340px] bg-white border border-neutral-200/90 rounded-2xl shadow-md font-sans overflow-hidden text-neutral-800 transition-all">
        {/* 顶部标题栏与级别 */}
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold text-xs tracking-tight truncate">SLA 履约督办工单</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs ${levelBadge.bg}`}>
            {s.level || 'P1'}
          </span>
        </div>

        {/* 工单主体内容 */}
        <div className="p-3.5 space-y-3">
          {/* 状态与单号 */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 tabular-nums text-[11px] text-neutral-500">
              <span>单号:</span>
              <span className="font-semibold text-neutral-800">{s.ticketId}</span>
            </div>
            <div>
              {isResolved ? (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                  s.isMetSLA
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {s.isMetSLA ? '履约达标办结' : '超时解决办结'}
                </span>
              ) : isPending ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                  <Clock className="w-3 h-3 text-amber-600" />
                  待接单响应
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  <Activity className="w-3 h-3 text-sky-600 animate-spin" />
                  督办处置中
                </span>
              )}
            </div>
          </div>

          {/* 督办事项标题与说明 */}
          <div className="bg-neutral-50 rounded-xl p-2.5 border border-neutral-200/70 space-y-1">
            <div className="text-xs font-bold text-neutral-900 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{s.title}</span>
            </div>
            <p className="text-[11.5px] text-neutral-600 leading-relaxed font-normal">
              {s.description}
            </p>
          </div>

          {/* 关键 SLA 时间与指标跟进看板 (跟进与记录解决时间) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* 首次响应指标 */}
            <div className="p-2 rounded-lg bg-neutral-50/80 border border-neutral-200/60">
              <div className="text-[10px] text-neutral-400 font-medium">首次响应</div>
              <div className="tabular-nums font-bold text-neutral-800 mt-0.5">
                {s.firstResponseSeconds
                  ? `${s.firstResponseSeconds}秒 · 已响应`
                  : `等待中 (${elapsedSinceTrigger}s)`}
              </div>
              <div className="text-[9.5px] text-neutral-400 mt-0.5 truncate">
                {s.firstResponseByName ? `${s.firstResponseByName}` : '等待协同方确认'}
              </div>
            </div>

            {/* 解决时效指标 (已解决显示解决耗时，未解决显示倒计时) */}
            <div className={`p-2 rounded-lg border ${
              isResolved
                ? s.isMetSLA
                  ? 'bg-emerald-50/70 border-emerald-200/80'
                  : 'bg-amber-50/70 border-amber-200/80'
                : isOverdue
                ? 'bg-rose-50/80 border-rose-200/80'
                : 'bg-neutral-50/80 border-neutral-200/60'
            }`}>
              <div className="text-[10px] font-medium text-neutral-500 flex items-center justify-between">
                <span>{isResolved ? '解决总耗时' : '承诺履约倒计时'}</span>
                {isOverdue && <span className="text-rose-600 font-bold">已超时</span>}
              </div>
              <div className={`tabular-nums font-bold mt-0.5 ${
                isResolved
                  ? s.isMetSLA
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                  : isOverdue
                  ? 'text-rose-600'
                  : 'text-neutral-900'
              }`}>
                {isResolved
                  ? formatDuration(s.resolutionSeconds || elapsedSinceTrigger)
                  : isOverdue
                  ? `超时 +${formatDuration(elapsedSinceTrigger - s.slaTargetSeconds)}`
                  : `剩 ${formatDuration(remainingSeconds)}`}
              </div>
              <div className="text-[9.5px] text-neutral-400 mt-0.5 truncate">
                目标时限: {s.slaTargetSeconds}s ({Math.round(s.slaTargetSeconds / 60)}分钟)
              </div>
            </div>
          </div>

          {/* 解决结论说明 */}
          {s.resolutionNote && (
            <div className={`p-2 rounded-lg text-xs leading-relaxed border ${
              s.isMetSLA
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
              <div className="font-bold flex items-center gap-1 text-[11px] mb-0.5">
                <CheckCheck className="w-3.5 h-3.5" />
                <span>办结审计结论 (解决人: {s.resolvedByName || '协同中枢'}):</span>
              </div>
              <p className="text-[11px]">{s.resolutionNote}</p>
            </div>
          )}

          {/* 督办全流程日志流 (可展开/折叠) */}
          {s.logs && s.logs.length > 0 && (
            <div className="pt-2 border-t border-neutral-100 space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="font-semibold text-neutral-600 flex items-center gap-1">
                  <History className="w-3 h-3 text-neutral-400" />
                  <span>协同跟进轨迹 ({s.logs.length}条)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllSLALogs(!showAllSLALogs)}
                  className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  {showAllSLALogs ? '收起' : '查看明细'}
                </button>
              </div>

              {(showAllSLALogs ? s.logs : s.logs.slice(-2)).map((log, idx) => (
                <div key={idx} className="text-[10.5px] bg-neutral-50/70 p-1.5 rounded border border-neutral-100 flex items-start gap-1.5">
                  <span className="tabular-nums text-neutral-400 shrink-0 mt-0.5">{log.timeStr}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-neutral-700">[{log.action}]</span>
                      <span className="text-neutral-500 font-medium">{log.operatorName}:</span>
                    </div>
                    {log.note && <div className="text-neutral-600 mt-0.5 break-words">{log.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 交互操作区 (嵌入在消息上下文中，支持接单响应、跟进记录、标记解决) */}
          {!isResolved && (
            <div className="pt-2.5 border-t border-neutral-100 space-y-2">
              {isPending && (
                <button
                  type="button"
                  onClick={() => {
                    if (onSLAAction) {
                      onSLAAction('respond', { note: '已确认接单，已排入即时加急处置通道' });
                    }
                  }}
                  className="w-full py-1.5 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>立刻确认接单响应</span>
                </button>
              )}

              {isInProgress && (
                <>
                  {isAddingSLALog ? (
                    <div className="space-y-1.5 bg-neutral-50 p-2 rounded-xl border border-neutral-200">
                      <input
                        type="text"
                        placeholder="输入现场进展说明 (如: 和牛堡已完成煎烤装盒)"
                        value={slaLogInput}
                        onChange={(e) => setSlaLogInput(e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded border border-neutral-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-800"
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingSLALog(false);
                            setSlaLogInput('');
                          }}
                          className="px-2 py-0.5 text-xs text-neutral-500 hover:text-neutral-700 cursor-pointer"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!slaLogInput.trim()) return;
                            if (onSLAAction) {
                              onSLAAction('log', { note: slaLogInput.trim() });
                            }
                            setIsAddingSLALog(false);
                            setSlaLogInput('');
                          }}
                          className="px-2.5 py-0.5 bg-neutral-900 text-white rounded text-xs font-bold cursor-pointer hover:bg-black"
                        >
                          提交跟进
                        </button>
                      </div>
                    </div>
                  ) : isResolvingSLA ? (
                    <div className="space-y-1.5 bg-neutral-50 p-2 rounded-xl border border-emerald-200">
                      <input
                        type="text"
                        placeholder="填写解决结论 (如: 骑手已现场装箱取餐，开始专线疾送)"
                        value={slaResolveInput}
                        onChange={(e) => setSlaResolveInput(e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded border border-neutral-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsResolvingSLA(false);
                            setSlaResolveInput('');
                          }}
                          className="px-2 py-0.5 text-xs text-neutral-500 hover:text-neutral-700 cursor-pointer"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onSLAAction) {
                              onSLAAction('resolve', {
                                note: slaResolveInput.trim() || '已现场完成出餐装箱与交接，督办闭环'
                              });
                            }
                            setIsResolvingSLA(false);
                            setSlaResolveInput('');
                          }}
                          className="px-2.5 py-0.5 bg-emerald-600 text-white rounded text-xs font-bold cursor-pointer hover:bg-emerald-700 shadow-xs"
                        >
                          确认办结销号
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingSLALog(true)}
                        className="py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1 cursor-pointer border border-neutral-200/80 active:scale-98"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-neutral-600" />
                        <span>追加跟进记录</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsResolvingSLA(true)}
                        className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-98"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>标记办结解决</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 已办结状态底栏 */}
          {isResolved && (
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
              <span className="tabular-nums text-[10px]">闭环时间: {s.resolvedAt ? new Date(s.resolvedAt).toLocaleTimeString() : time}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(`【SLA督办凭证】单号: ${s.ticketId}，总解决耗时: ${formatDuration(s.resolutionSeconds || 0)}，履约结果: ${s.isMetSLA ? '达标' : '超时'}`, 'SLA 督办工单')}
                className="text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>复制工单凭证</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 0.1 状态变更卡片 (type === 'status_change')
  if (type === 'status_change' && statusChangeInfo) {
    return (
      <div className="w-[260px] sm:w-[290px] bg-white/95 backdrop-blur-md border border-neutral-200/90 rounded-2xl p-3 shadow-sm font-sans space-y-2 text-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-neutral-900 text-xs tracking-tight">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>{statusChangeInfo.title || '状态流转变更'}</span>
          </div>
          <span className="text-[10px] tabular-nums text-neutral-400 font-medium">系统流转</span>
        </div>
        <p className="text-neutral-600 text-xs leading-relaxed font-normal">
          {statusChangeInfo.description || text}
        </p>
        <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
          <span className="font-medium text-neutral-500">{statusChangeInfo.actionOperator || '主厨王师傅'}</span>
          <span className="tabular-nums text-[10px]">{time}</span>
        </div>
      </div>
    );
  }

  // 0.2 餐车桌台协同互动卡片 (text.startsWith('【餐车交互·') || text.includes('来自食客桌台协同消息'))
  if (text.startsWith('【餐车交互·') || text.includes('来自食客桌台协同消息')) {
    const actionMatch = text.match(/【餐车交互·([^】]+)】/);
    const actionTag = actionMatch ? actionMatch[1] : '桌台互动';
    const truckMatch = text.match(/当前绑定餐车：([^，\n]+)/);
    const truckName = truckMatch ? truckMatch[1] : '流动餐车';
    
    // 清理正文内容
    let cleanText = text
      .replace(/【餐车交互·[^】]+】/, '')
      .replace(/来自食客桌台协同消息：/, '')
      .replace(/，当前绑定餐车：.*$/, '')
      .trim();
    if (!cleanText) cleanText = actionTag;

    const isUrgent = actionTag.includes('催单') || actionTag.includes('急');

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden shadow-sm border border-neutral-200/90 bg-white/95 backdrop-blur-md text-neutral-900">
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 tracking-tight">
            <Users className={`w-3.5 h-3.5 stroke-[1.5] ${isUrgent ? 'text-amber-600' : 'text-emerald-600'}`} />
            <span>食客桌台协同</span>
          </div>
          <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
            isUrgent ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
          }`}>
            {actionTag}
          </span>
        </div>

        <div className="p-3 space-y-2">
          <p className="text-xs font-normal leading-relaxed text-neutral-800">
            {cleanText}
          </p>
          <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400 tabular-nums">
            <span className="truncate max-w-[170px] font-sans">{truckName}</span>
            <span>{time}</span>
          </div>
        </div>
      </div>
    );
  }

  // 1. 纯 Emoji 消息渲染 (去边框的大表情视觉)
  if (isPureEmojiMessage(text)) {
    return (
      <div className="py-1 px-2 select-none">
        <div className="text-3xl sm:text-4xl tracking-wider filter drop-shadow-xs hover:scale-110 transition-transform duration-200 cursor-default animate-in zoom-in-90">
          {text}
        </div>
      </div>
    );
  }

  // 2. 拍照存证留存图片气泡 (含 [IMAGE]:)
  if (text.includes('[IMAGE]:')) {
    const [descPart, imgUrl] = text.split('[IMAGE]:');
    const cleanImgUrl = imgUrl?.trim() || '';
    const lines = descPart.trim().split('\n');
    const titleLine = lines[0]?.replace(/^📷【?/, '').replace(/】?$/, '') || '现场存证凭据';
    const otherLines = lines.slice(1);

    return (
      <div className="space-y-2 max-w-[270px] sm:max-w-[300px] font-sans bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-neutral-200/90 shadow-sm">
        {/* 存证信息头 */}
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-neutral-100">
          <div className="flex items-center gap-1.5 min-w-0">
            <Camera className="w-3.5 h-3.5 text-sky-600 shrink-0 stroke-[1.5]" />
            <span className="text-xs font-bold text-neutral-900 tracking-tight truncate">
              {titleLine}
            </span>
          </div>
          <span className="text-[10px] tabular-nums text-neutral-400 font-medium shrink-0">
            {time}
          </span>
        </div>

        {/* 详细文字说明 */}
        {otherLines.length > 0 && (
          <div className="text-[11px] leading-relaxed text-neutral-600 space-y-0.5 bg-neutral-50/80 p-1.5 rounded-xl border border-neutral-100">
            {otherLines.map((line, idx) => (
              <div key={idx} className="truncate font-normal">
                {line}
              </div>
            ))}
          </div>
        )}

        {/* 存证主图卡片 */}
        {cleanImgUrl && (
          <div className="relative rounded-xl overflow-hidden border border-neutral-200/90 bg-neutral-900 group shadow-xs">
            <img
              src={cleanImgUrl}
              alt="存证留存"
              className="w-full h-36 sm:h-40 object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
              onClick={() => {
                setPreviewTitle(titleLine);
                setPreviewImage(cleanImgUrl);
              }}
            />
            <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-md text-white text-[9px] px-1.5 py-0.5 rounded-md tabular-nums">
              点击微距检视
            </div>
          </div>
        )}

        {/* 全屏微距防伪时空存证灯箱 */}
        <MediaEvidenceLightbox
          isOpen={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage || ''}
          title={previewTitle || titleLine}
          timeStr={time}
          orderNo={orderNo}
          operatorName={senderName || '协同操作员'}
          operatorRole={senderRole}
        />
      </div>
    );
  }

  // 3. 订单账单核销卡与电子发票申请凭证
  if (text.startsWith('🧾【协同账单核销卡】') || text.startsWith('🧾【顾客申请对账与开票】')) {
    const isCustomerRequest = text.startsWith('🧾【顾客申请对账与开票】');
    
    // 提取字段
    const orderNoMatch = text.match(/订单编号：#?([A-Za-z0-9-]+)/);
    const amountMatch = text.match(/(实付总额|核对金额|应付金额)：¥?([0-9.]+)/);
    const codeMatch = text.match(/分单核销码：#?([0-9]+)/);
    const addressMatch = text.match(/送达地址：(.+)/);
    const summaryMatch = text.match(/商品明细：(.+)/);

    const billOrderNo = orderNoMatch ? orderNoMatch[1] : (orderNo || 'UR-9821');
    const amount = amountMatch ? amountMatch[2] : '186.00';
    const verifyCode = codeMatch ? codeMatch[1] : billOrderNo.slice(-4) || '8829';
    const address = addressMatch ? addressMatch[1] : '科技园区 A 座北塔 1204 室';
    const summary = summaryMatch ? summaryMatch[1] : '碳烤和牛小汉堡双重奏等';

    const isUnpaid = text.includes('未付款') || text.includes('待付款') || text.includes('待支付') || paymentStatus === 'unpaid';
    const isPaid = !isUnpaid && !isCustomerRequest;

    return (
      <div className={`w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden border bg-white/95 backdrop-blur-md shadow-sm text-neutral-900 transition-all ${
        isUnpaid ? 'border-amber-300/90 ring-1 ring-amber-400/25' : 'border-neutral-200/90'
      }`}>
        {/* 凭证顶部 */}
        <div className={`px-3 py-2 flex items-center justify-between border-b ${
          isUnpaid ? 'bg-amber-50/90 border-amber-200/80' : 'bg-neutral-50/80 border-neutral-100'
        }`}>
          <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900 tracking-tight">
            <FileText className={`w-3.5 h-3.5 stroke-[1.5] ${isUnpaid ? 'text-amber-600' : 'text-emerald-600'}`} />
            <span>{isCustomerRequest ? '对账与开票申请' : '协同核销账单'}</span>
          </div>
          
          {/* 真实支付状态胶囊 */}
          {!isCustomerRequest ? (
            isUnpaid ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse shadow-3xs">
                <AlertCircle className="w-2.5 h-2.5 text-amber-700" />
                <span>待付款 · 未结清</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shadow-3xs">
                <Check className="w-2.5 h-2.5 text-emerald-700" />
                <span>已付款 · 已结清</span>
              </span>
            )
          ) : (
            <span className="text-[10px] tabular-nums font-medium text-neutral-500">
              #{billOrderNo}
            </span>
          )}
        </div>

        {/* 核心金额与核销码 */}
        <div className="p-3 space-y-2.5">
          <div className="flex items-baseline justify-between bg-neutral-50/80 p-2.5 rounded-xl border border-neutral-150">
            <div>
              <span className="text-[10px] text-neutral-500 font-medium block">
                {isCustomerRequest ? '结算金额' : isUnpaid ? '应付待结总额' : '实付入账总额'}
              </span>
              <div className="flex items-baseline gap-0.5 text-neutral-900 tabular-nums font-bold text-lg">
                <span className="text-xs">¥</span>
                <span>{amount}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-neutral-500 font-medium block">核销码</span>
              <div className="flex items-center justify-end gap-1">
                <span className="tabular-nums text-base font-bold text-neutral-900">
                  #{verifyCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(verifyCode, '核销码')}
                  className="p-1 text-neutral-400 hover:text-neutral-900 rounded cursor-pointer transition"
                  title="复制核销码"
                >
                  {copiedKey === '核销码' ? <Check className="w-3 h-3 text-emerald-600 stroke-[2]" /> : <Copy className="w-3 h-3 stroke-[1.5]" />}
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] space-y-1 text-neutral-600">
            <div className="flex items-start justify-between gap-1">
              <span className="text-neutral-400 font-medium shrink-0">商品:</span>
              <span className="font-medium text-neutral-800 text-right truncate max-w-[190px]">{summary}</span>
            </div>
            <div className="flex items-start justify-between gap-1">
              <span className="text-neutral-400 font-medium shrink-0">地址:</span>
              <span className="text-neutral-600 text-right truncate max-w-[190px] font-normal">{address}</span>
            </div>
          </div>

          {/* 角色隔离与真实未付操作通道 */}
          {!isCustomerRequest && (
            <div className="pt-1.5 border-t border-neutral-100">
              {isUnpaid ? (
                viewerRole === 'user' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onPayBill) {
                        onPayBill(Number(amount), billOrderNo);
                      } else {
                        showToast('正在调起支付', `已进入订单 #${billOrderNo} 收银台`);
                      }
                    }}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold transition active:scale-98 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5 stroke-[2]" />
                    <span>立即结清付款 ¥{amount}</span>
                  </button>
                ) : viewerRole === 'merchant' ? (
                  <div className="space-y-1.5">
                    <div className="text-[10.5px] text-amber-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 flex items-center justify-between">
                      <span>⚠️ 状态：顾客待结清</span>
                      <span className="tabular-nums font-bold">¥{amount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onRemindPayment && onRemindPayment(billOrderNo)}
                        className="flex-1 py-1 bg-white hover:bg-neutral-100 text-neutral-700 rounded-lg text-xs font-medium border border-neutral-200 cursor-pointer active:scale-98 transition shadow-3xs"
                      >
                        🔔 催请付款
                      </button>
                      <button
                        type="button"
                        onClick={() => onConfirmPaymentReceived && onConfirmPaymentReceived(billOrderNo)}
                        className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer active:scale-98 transition shadow-3xs"
                      >
                        ✅ 确认核销
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[10.5px] text-amber-900 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>【骑手提示】顾客尚未付款，请妥投交接前核对收据</span>
                  </div>
                )
              ) : (
                <div className="p-1.5 rounded-xl bg-emerald-50/90 border border-emerald-200/90 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1 text-emerald-800 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>云端资金已对账结清 · 凭证生效</span>
                  </div>
                  <span className="text-[10px] tabular-nums font-bold text-emerald-700">已入账</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. 菜品素材气泡 (主厨推荐加单 / 顾客加单咨询)
  if (text.startsWith('🍲【主厨推荐加单】') || text.startsWith('🍲【顾客加单咨询】')) {
    const isCustomerInquiry = text.startsWith('🍲【顾客加单咨询】');

    const nameMatch = text.match(/(单品品名|咨询单品)：(.+)/);
    const priceMatch = text.match(/(加单特惠|单品特惠)：¥?([0-9.]+)/);
    const noteMatch = text.match(/(主厨寄语|顾客留言)：(.+)/);

    const dishName = nameMatch ? nameMatch[2].trim() : '经典黑椒炭烤和牛小汉堡';
    const price = priceMatch ? priceMatch[2].trim() : '48.00';
    const note = noteMatch
      ? noteMatch[2].trim()
      : isCustomerInquiry
      ? '请问后厨现在还来得及现做加单吗？如来得及请合并烘烤！'
      : '秘制香气浓郁，与当前订单合并烘烤，无须等待极速出单！';

    const dishImgUrl = matchDishImageUrl({ name: dishName });

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden border border-neutral-200/90 bg-white/95 backdrop-blur-md shadow-sm text-neutral-900">
        <div className="relative h-24 w-full bg-neutral-900 overflow-hidden">
          <img
            src={dishImgUrl}
            alt={dishName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-black/50 backdrop-blur-md shadow-2xs">
              {isCustomerInquiry ? '💡 加单咨询' : '🔥 主厨推荐'}
            </span>
          </div>
          <div className="absolute bottom-2 left-2 right-2 flex items-baseline justify-between text-white">
            <span className="font-bold text-xs truncate max-w-[180px] drop-shadow-xs">{dishName}</span>
            <div className="tabular-nums font-bold text-sm text-amber-300 drop-shadow-xs">
              ¥{price}
            </div>
          </div>
        </div>

        <div className="p-2.5 space-y-2">
          <p className="text-[11px] leading-relaxed text-neutral-600 bg-neutral-50/80 p-2 rounded-xl border border-neutral-100">
            {note}
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
            <span className="text-[10px] text-neutral-400 font-medium">合单烘烤 · 同批送达</span>
            <button
              type="button"
              onClick={() => {
                if (onQuickAction) {
                  onQuickAction('confirm_dish', { name: dishName, price });
                } else {
                  showToast('加单意向已记录', `已通知档口主厨跟进【${dishName}】的制作`);
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-black text-white font-bold text-xs cursor-pointer active:scale-95 transition shadow-xs"
            >
              {isCustomerInquiry ? '确认制作' : '确认加点'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. 协同售后工单气泡
  if (text.startsWith('📑【协同售后工单】')) {
    const lines = text.split('\n');
    const portLine = lines.find((l) => l.includes('发起端口：'))?.replace('发起端口：', '') || '食客端';
    const typeLine = lines.find((l) => l.includes('工单类型：'))?.replace('工单类型：', '') || '少餐漏送补发';
    const descLine = lines.find((l) => l.includes('问题描述：'))?.replace('问题描述：', '') || '餐品需核对补发';

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden border border-rose-200/90 bg-white/95 backdrop-blur-md shadow-sm text-neutral-900">
        <div className="bg-rose-50/80 border-b border-rose-100 px-3 py-1.5 flex items-center justify-between text-rose-900">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-tight">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 stroke-[1.5]" />
            <span>售后工单</span>
          </div>
          <span className="text-[10px] tabular-nums font-medium text-rose-600">
            {portLine}
          </span>
        </div>

        <div className="p-2.5 space-y-2">
          <div className="text-xs font-bold text-neutral-900">
            事项：{typeLine}
          </div>
          <div className="text-[11px] text-neutral-600 bg-neutral-50/80 p-2 rounded-xl leading-relaxed border border-neutral-100">
            {descLine}
          </div>
        </div>
      </div>
    );
  }

  // 6. 地理坐标与 GPS 信标存证气泡
  if (
    text.startsWith('📍【送达位置坐标存证】') ||
    text.startsWith('📍【车载实时GPS巡航坐标】') ||
    text.startsWith('📍【餐车停泊取餐口坐标】') ||
    text.startsWith('📍【平台基准地理信标】')
  ) {
    const isRiderGPS = text.startsWith('📍【车载实时GPS巡航坐标】');
    const isMerchantStation = text.startsWith('📍【餐车停泊取餐口坐标】');
    const isUserDestination = text.startsWith('📍【送达位置坐标存证】');

    const lines = text.split('\n');
    const cleanLines = lines.slice(1);

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden border border-neutral-200/90 bg-white/95 backdrop-blur-md shadow-sm text-neutral-900">
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 tracking-tight">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 stroke-[1.5]" />
            <span>
              {isUserDestination
                ? '送达坐标存证'
                : isRiderGPS
                ? '骑手实时GPS'
                : isMerchantStation
                ? '餐车泊位坐标'
                : '地理基准信标'}
            </span>
          </div>
          <span className="text-[10px] tabular-nums text-neutral-400 font-medium">{time}</span>
        </div>

        <div className="p-2.5 space-y-2">
          <div className="p-2 bg-neutral-50/80 rounded-xl text-[11px] space-y-1 tabular-nums text-neutral-800 border border-neutral-100">
            {cleanLines.map((line, idx) => (
              <div key={idx} className="truncate leading-snug">
                {line}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end pt-0.5">
            <button
              type="button"
              onClick={() => {
                showToast('坐标已定位', '雷达地图已自动聚焦并高亮该位置');
              }}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition active:scale-95 shadow-xs"
            >
              地图居中
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 7. 车载无线电对讲短语广播 (⚡)
  if (text.startsWith('⚡ [车载对讲播报]') || text.startsWith('⚡ [后厨对讲播报]') || text.startsWith('⚡ [平台调度广播]')) {
    const isRider = text.includes('车载对讲');
    const isKitchen = text.includes('后厨对讲');
    const speechContent = text.replace(/^⚡ \[[^\]]+\] /, '');

    const togglePlay = () => {
      playWalkieTalkieBeep();
      setIsAudioPlaying(true);
      setTimeout(() => setIsAudioPlaying(false), 3000);
    };

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden border border-neutral-200/90 bg-white/95 backdrop-blur-md shadow-sm text-neutral-900">
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 tracking-tight">
            <Radio className="w-3.5 h-3.5 text-amber-500 stroke-[1.5]" />
            <span>{isRider ? '车载对讲广播' : isKitchen ? '后厨出单对讲' : '调度中枢广播'}</span>
          </div>
          <span className="text-[10px] tabular-nums text-neutral-400 font-medium">{time}</span>
        </div>

        <div className="p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2 bg-neutral-50/80 p-2 rounded-xl border border-neutral-100">
            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition active:scale-95 shrink-0 shadow-xs"
            >
              <Volume2 className={`w-3.5 h-3.5 ${isAudioPlaying ? 'animate-bounce' : ''}`} />
              <span>{isAudioPlaying ? '播放中' : '播放对讲'}</span>
            </button>

            <div className="flex items-center gap-0.5 flex-1 justify-end h-4">
              {[18, 32, 45, 24, 60, 48, 20, 36, 52, 28, 14].map((h, i) => (
                <span
                  key={i}
                  className={`w-0.5 rounded-full transition-all duration-200 ${
                    isAudioPlaying ? 'bg-amber-600 animate-pulse' : 'bg-neutral-300'
                  }`}
                  style={{ height: isAudioPlaying ? `${Math.min(100, h * 1.6)}%` : `${h * 0.4}%` }}
                />
              ))}
            </div>
          </div>

          <div className="text-xs leading-relaxed text-neutral-800 italic px-1 font-normal">
            "{speechContent}"
          </div>
        </div>
      </div>
    );
  }

  // 8. 最高优先级催单与监管通报 (🚨 / 📢)
  if (text.startsWith('🚨【最高优先级加急催单】') || text.startsWith('📢【平台监管督促履约】')) {
    const isCustomerUrge = text.startsWith('🚨');

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden border border-rose-200/90 bg-rose-50/80 backdrop-blur-md text-neutral-900 shadow-sm">
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-rose-100 bg-rose-100/70 text-rose-900">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-tight">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            <span>{isCustomerUrge ? '加急催单提醒' : '平台监管督办'}</span>
          </div>
          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-rose-600 text-white tabular-nums shadow-3xs">
            加急
          </span>
        </div>

        <div className="p-2.5 space-y-1.5">
          <div className="text-xs leading-relaxed font-semibold text-rose-950">
            {text.replace(/^🚨【[^】]+】\s*/, '').replace(/^📢【[^】]+】\s*/, '') || text}
          </div>
          <div className="text-[10px] text-rose-700/80 tabular-nums text-right font-medium">
            {time}
          </div>
        </div>
      </div>
    );
  }

  // 9. 路况与出炉通报 (🚦 / 🔥)
  if (text.startsWith('🚦【专线骑手路况报备】') || text.startsWith('🔥【现烤出炉进度通报】')) {
    const isTraffic = text.startsWith('🚦');

    return (
      <div className="w-[260px] sm:w-[290px] font-sans rounded-2xl overflow-hidden border border-neutral-200/90 bg-white/95 backdrop-blur-md shadow-sm text-neutral-900">
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 tracking-tight">
            {isTraffic ? <Bike className="w-3.5 h-3.5 text-amber-600 stroke-[1.5]" /> : <Flame className="w-3.5 h-3.5 text-rose-600 stroke-[1.5]" />}
            <span>{isTraffic ? '骑手路况报备' : '现烤出炉通报'}</span>
          </div>
          <span className="text-[10px] tabular-nums text-neutral-400 font-medium">{time}</span>
        </div>

        <div className="p-2.5">
          <div className="text-xs leading-relaxed text-neutral-800 font-normal">
            {text.replace(/^🚦【[^】]+】\s*/, '').replace(/^🔥【[^】]+】\s*/, '') || text}
          </div>
        </div>
      </div>
    );
  }

  // 10. 履约态势短语 (提取【...】标签徽章化)
  const bracketMatch = text.match(/^【([^】]+)】(.*)/);
  if (bracketMatch) {
    const tag = bracketMatch[1];
    const rest = bracketMatch[2];

    return (
      <div className="font-sans space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-200">
            {tag}
          </span>
        </div>
        <div className="text-[12.5px] leading-relaxed pt-0.5">{rest || text}</div>
      </div>
    );
  }

  // 11. 口味加料与特殊需求便签气泡 (🌶️, 🧅, 🧊, 🥢, 📦 等)
  if (
    text.startsWith('🌶️') ||
    text.startsWith('🧅') ||
    text.startsWith('🧊') ||
    text.startsWith('🥢') ||
    text.startsWith('📦')
  ) {
    const symbol = text.slice(0, 2);
    const content = text.slice(2).trim();

    return (
      <div className="font-sans max-w-[260px] sm:max-w-[290px] rounded-2xl border border-amber-200/90 bg-amber-50/80 backdrop-blur-md p-2.5 shadow-sm space-y-1 text-neutral-800">
        <div className="flex items-center justify-between border-b border-amber-200/60 pb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{symbol}</span>
            <span className="text-xs font-bold text-amber-950 tracking-tight">口味与打包备注</span>
          </div>
          <span className="text-[9.5px] tabular-nums font-medium text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded shadow-3xs">后厨注意</span>
        </div>
        <div className="text-xs font-normal text-neutral-900 leading-relaxed pt-0.5">
          {content}
        </div>
      </div>
    );
  }

  // 11.5 纯 Emoji 符号 (如 ⏳ 等单/少数字符) 优雅弹性悬浮气泡，充足呼吸感与纵向对齐
  const isPureEmoji =
    /^(\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]|\s)+$/u.test(text.trim()) &&
    text.trim().length <= 16;
  if (isPureEmoji) {
    return (
      <div className={`inline-flex items-center justify-center select-none py-2 px-3.5 rounded-2xl border transition-all ${
        isSelf
          ? 'bg-neutral-100 hover:bg-neutral-200/80 border-neutral-200/90 shadow-3xs rounded-br-xs'
          : 'bg-white hover:bg-neutral-50 border-neutral-200/90 shadow-3xs rounded-bl-xs'
      }`}>
        <span className="text-2xl sm:text-3xl leading-none tracking-wide filter drop-shadow-xs py-0.5">
          {text.trim()}
        </span>
      </div>
    );
  }

  // 12. 默认普通气泡 (自然换行与文字)
  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed font-sans">
      {quoteReply && (
        <FeishuQuotedBubble
          quoteReply={quoteReply}
          isSelf={isSelf}
          onLocateMessage={onLocateMessage}
        />
      )}
      <div>{text}</div>
    </div>
  );
};

export default MaterialMessageBubble;
