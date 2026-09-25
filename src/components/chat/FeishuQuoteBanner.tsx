import React from 'react';
import {
  CornerUpLeft,
  X,
  Camera,
  Volume2,
  MapPin,
  FileText,
  AlertTriangle,
  UtensilsCrossed,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { ChatMessageItem, ChatRole } from '../../utils/chatHub';

export interface FeishuQuoteBannerProps {
  quotedMessage: ChatMessageItem | null;
  onCancel: () => void;
}

// 获取角色专属微胶囊徽章样式
export function getRoleBadgeStyle(role?: ChatRole | string) {
  switch (role) {
    case 'merchant':
      return {
        label: '餐车档口',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dotClass: 'bg-emerald-500'
      };
    case 'rider':
      return {
        label: '专线骑手',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dotClass: 'bg-amber-500'
      };
    case 'platform':
      return {
        label: '调度基站',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
        dotClass: 'bg-purple-500'
      };
    case 'user':
    default:
      return {
        label: '顾客本人',
        badgeClass: 'bg-neutral-100 text-neutral-800 border-neutral-300/80',
        dotClass: 'bg-neutral-700'
      };
  }
}

// 识别被引用内容类型及微图标
export function getQuoteContentDetails(msg?: {
  text?: string;
  voiceTranscribed?: string;
  voiceDuration?: number;
  imageTitle?: string;
  statusChangeInfo?: any;
}) {
  const rawText = msg?.text || '';
  if (rawText.includes('[IMAGE]:') || msg?.imageTitle) {
    return {
      type: 'image',
      icon: Camera,
      typeLabel: '存证影像',
      snippet: msg?.imageTitle || '现场验真留样照'
    };
  }
  if (msg?.voiceDuration || rawText.includes('⚡ [车载对讲') || rawText.includes('⚡ [后厨对讲')) {
    return {
      type: 'voice',
      icon: Volume2,
      typeLabel: '对讲音频',
      snippet: msg?.voiceTranscribed || (msg?.voiceDuration ? `${msg.voiceDuration}″ 语音录音` : '车载语音对讲广播')
    };
  }
  if (rawText.startsWith('📍')) {
    return {
      type: 'location',
      icon: MapPin,
      typeLabel: '地理坐标',
      snippet: rawText.replace(/📍【.*?】/, '').trim().split('\n')[0] || '实时高精定位点'
    };
  }
  if (rawText.startsWith('🧾')) {
    return {
      type: 'invoice',
      icon: FileText,
      typeLabel: '核销账单',
      snippet: rawText.replace(/🧾【.*?】/, '').trim().split('\n')[0] || '订单核销明细'
    };
  }
  if (rawText.startsWith('🚨') || rawText.startsWith('📢')) {
    return {
      type: 'urgent',
      icon: AlertTriangle,
      typeLabel: '加急通报',
      snippet: rawText.replace(/[🚨📢]【.*?】/, '').trim().split('\n')[0] || '最高优先级加急'
    };
  }
  if (rawText.startsWith('🍲') || rawText.startsWith('🥢')) {
    return {
      type: 'dish',
      icon: UtensilsCrossed,
      typeLabel: '菜品工单',
      snippet: rawText.replace(/[🍲🥢]【.*?】/, '').trim().split('\n')[0] || '备料换餐/加单'
    };
  }

  const clean = rawText || msg?.voiceTranscribed || msg?.statusChangeInfo?.title || '协同消息';
  return {
    type: 'text',
    icon: CornerUpLeft,
    typeLabel: '文本消息',
    snippet: clean
  };
}

/**
 * 1. 输入框上方悬浮待发引用卡片胶囊 (Floating Capsule)
 */
export const FeishuQuoteBanner: React.FC<FeishuQuoteBannerProps> = ({
  quotedMessage,
  onCancel
}) => {
  if (!quotedMessage) return null;

  const roleStyle = getRoleBadgeStyle(quotedMessage.senderRole);
  const details = getQuoteContentDetails(quotedMessage);
  const Icon = details.icon;

  return (
    <div
      id="chat-active-quote-capsule"
      className="mx-2 mb-1.5 px-2.5 py-1.5 bg-white/95 backdrop-blur-md border border-neutral-200/90 rounded-xl shadow-2xs text-xs text-neutral-700 animate-in slide-in-from-bottom-2 fade-in duration-150 flex items-center justify-between gap-2 group/banner"
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {/* 微型回复图标与角色徽章 */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="w-5 h-5 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-600">
            <Icon className="w-3 h-3 stroke-[1.5]" />
          </span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] tabular-nums border ${roleStyle.badgeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${roleStyle.dotClass}`} />
            <span>{quotedMessage.senderName || roleStyle.label}</span>
          </span>
        </div>

        {/* 类型标签与引用文字预览 */}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span className="text-[10px] text-neutral-400 tabular-nums shrink-0">
            [{details.typeLabel}]
          </span>
          <span className="truncate text-neutral-700 font-sans text-xs">
            {details.snippet}
          </span>
        </div>
      </div>

      {/* 取消引用按钮 */}
      <button
        type="button"
        onClick={onCancel}
        className="w-5 h-5 rounded-md hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition cursor-pointer shrink-0"
        title="取消引用"
      >
        <X className="w-3.5 h-3.5 stroke-[1.5]" />
      </button>
    </div>
  );
};

export interface FeishuQuotedBubbleProps {
  quoteReply?: {
    id: string;
    senderName: string;
    senderRole: ChatRole;
    text: string;
  };
  isSelf?: boolean;
  onLocateMessage?: (targetId: string) => void;
}

/**
 * 2. 消息气泡内部渲染的交互式引用胶囊 (Click-to-Locate Interactive Capsule)
 */
export const FeishuQuotedBubble: React.FC<FeishuQuotedBubbleProps> = ({
  quoteReply,
  isSelf = false,
  onLocateMessage
}) => {
  if (!quoteReply) return null;

  const roleStyle = getRoleBadgeStyle(quoteReply.senderRole);
  const details = getQuoteContentDetails({ text: quoteReply.text });
  const Icon = details.icon;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLocateMessage && quoteReply.id) {
      onLocateMessage(quoteReply.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      title="点击定位并高亮原消息"
      className={`mb-2 px-2.5 py-1.5 rounded-xl border text-[11.5px] leading-snug transition-all duration-150 cursor-pointer select-none group/quote ${
        isSelf
          ? 'bg-white/10 hover:bg-white/18 border-white/15 text-neutral-100 border-l-[3px] border-l-amber-400 active:scale-[0.99]'
          : 'bg-neutral-100/90 hover:bg-neutral-200/80 border-neutral-200/90 text-neutral-800 border-l-[3px] border-l-neutral-800 active:scale-[0.99]'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 mb-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className={`w-3 h-3 shrink-0 ${isSelf ? 'text-amber-300' : 'text-neutral-600'}`} />
          <span className={`font-semibold truncate text-[11px] ${isSelf ? 'text-white' : 'text-neutral-900'}`}>
            @{quoteReply.senderName}
          </span>
          <span className={`text-[9.5px] tabular-nums px-1 py-0.2 rounded border ${
            isSelf ? 'bg-white/10 border-white/20 text-neutral-300' : roleStyle.badgeClass
          }`}>
            {roleStyle.label}
          </span>
        </div>

        {/* 定位回跳图标暗示 */}
        <span className={`inline-flex items-center gap-0.5 text-[10px] tabular-nums shrink-0 transition-opacity ${
          isSelf
            ? 'text-amber-300/80 group-hover/quote:text-amber-200'
            : 'text-neutral-500 group-hover/quote:text-neutral-800'
        }`}>
          <span>定位</span>
          <ArrowUpRight className="w-2.5 h-2.5 stroke-[2] group-hover/quote:translate-x-0.5 group-hover/quote:-translate-y-0.5 transition-transform" />
        </span>
      </div>

      <div className={`truncate text-xs font-sans ${isSelf ? 'text-neutral-200' : 'text-neutral-600'}`}>
        {details.snippet}
      </div>
    </div>
  );
};

