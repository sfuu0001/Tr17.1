import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  Flame,
  Bike,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Utensils,
  ChevronDown,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { Order } from '../../types';
import { resolveOrderChannelType } from '../../utils/orderNormalizer';

interface BeautifiedOrderStatusBadgeProps {
  order: Order;
  onAdvanceStatus?: (targetStatus: Order['status'], details?: Partial<Order>) => void;
  interactive?: boolean;
  className?: string;
  align?: 'left' | 'right';
}

/**
 * BeautifiedOrderStatusBadge (全要素订单状态微标与向下拉彩单组件)
 * 严格遵循 AGENTS.md 第 7 条规范：
 * - 鲜明工控色标与呼吸指示灯 (LED Pulse)
 * - 绝对不换行 (whitespace-nowrap)
 * - 支持点击展开状态流转向下拉彩单 (Beautified Status Flow Popover)
 */
// Helper to normalize and condense raw status text for capsule badges
// Prevents lengthy strings like "堂食后厨现制中 (0/3已上桌)" from expanding and breaking mobile viewports
export function getCompactStatusBadgeLabel(
  rawText: string | undefined,
  status: Order['status'],
  channel: string
): string {
  if (rawText) {
    // Check for serving progress like "(0/3已上桌)" or "(2/3已上桌)"
    const progressMatch = rawText.match(/\((\d+\/\d+)(?:已上桌)?\)/);
    if (progressMatch) {
      const progress = progressMatch[1];
      if (rawText.includes('上桌') || rawText.includes('出餐')) {
        return `上桌中 (${progress})`;
      }
      return `现制中 (${progress})`;
    }

    if (rawText.includes('现制') || rawText.includes('后厨') || rawText.includes('制作')) {
      return '后厨现制';
    }
    if (rawText.includes('待接单') || rawText.includes('待配料')) {
      return '待接单';
    }
    if (rawText.includes('待取餐') || rawText.includes('保温')) {
      return '待取餐';
    }
    if (rawText.includes('配送') || rawText.includes('送餐')) {
      return '送餐中';
    }
    if (rawText.includes('完成') || rawText.includes('归档')) {
      return '已完成';
    }
    if (rawText.includes('退款')) {
      return '已退款';
    }
    if (rawText.includes('取消') || rawText.includes('作废')) {
      return '已取消';
    }

    if (rawText.length <= 7) {
      return rawText;
    }
  }

  // Concise standard fallbacks
  switch (status) {
    case 'pending':
      return '待接单';
    case 'cooking':
      return '后厨现制';
    case 'waiting_pickup':
      return '待取餐';
    case 'delivering':
      return channel === 'dine_in' ? '出餐就位' : '配送中';
    case 'completed':
      return '已完成';
    case 'refunded':
      return '已退款';
    case 'cancelled':
      return '已取消';
    default:
      return '处理中';
  }
}

export const BeautifiedOrderStatusBadge: React.FC<BeautifiedOrderStatusBadgeProps> = ({
  order,
  onAdvanceStatus,
  interactive = true,
  className = '',
  align = 'right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const channel = resolveOrderChannelType(order);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const status = order.status;

  // Resolve status theme styling
  let badgeStyle = 'bg-neutral-100 text-neutral-800 border-neutral-200';
  let dotColor = 'bg-neutral-500';
  let StatusIcon = Clock;
  let label = order.statusText || status;

  if (status === 'pending') {
    badgeStyle = 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/20';
    dotColor = 'bg-amber-500';
    StatusIcon = Clock;
    label = '待接单 · 待配料';
  } else if (status === 'cooking') {
    badgeStyle = 'bg-orange-50 text-orange-950 border-orange-300 ring-1 ring-orange-400/20';
    dotColor = 'bg-orange-500';
    StatusIcon = Flame;
    label = '制作中 · 炭火炙烤';
  } else if (status === 'waiting_pickup' || (status === 'delivering' && channel === 'pickup')) {
    badgeStyle = 'bg-blue-50 text-blue-900 border-blue-300 ring-1 ring-blue-400/20';
    dotColor = 'bg-blue-500';
    StatusIcon = ShoppingBag;
    label = '待取餐 · 柜内保温';
  } else if (status === 'delivering') {
    badgeStyle = 'bg-sky-50 text-sky-900 border-sky-300 ring-1 ring-sky-400/20';
    dotColor = 'bg-sky-500';
    StatusIcon = Bike;
    label = channel === 'dine_in' ? '传菜就位 · 待翻台' : '骑手送餐中';
  } else if (status === 'completed') {
    badgeStyle = 'bg-emerald-50 text-emerald-950 border-emerald-300 ring-1 ring-emerald-500/20';
    dotColor = 'bg-emerald-500';
    StatusIcon = CheckCircle2;
    label = '已完成 · 工单归档';
  } else if (status === 'refunded' || status === 'cancelled') {
    badgeStyle = 'bg-rose-50 text-rose-900 border-rose-200';
    dotColor = 'bg-rose-500';
    StatusIcon = XCircle;
    label = status === 'refunded' ? '已全单退款' : '已作废取消';
  }

  const compactLabel = getCompactStatusBadgeLabel(order.statusText, status, channel);
  const fullTooltip = order.statusText || label;
  const alignClass = align === 'right' ? 'right-0' : 'left-0';

  const canAdvance = Boolean(
    onAdvanceStatus &&
    interactive &&
    status !== 'completed' &&
    status !== 'refunded' &&
    status !== 'cancelled'
  );

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={!canAdvance}
        onClick={(e) => {
          e.stopPropagation();
          if (canAdvance) setIsOpen((prev) => !prev);
        }}
        style={{ touchAction: 'manipulation' }}
        className={`h-6.5 sm:h-7 px-2 sm:px-2.5 rounded-full border text-[10.5px] sm:text-[11px] font-bold flex items-center gap-1 sm:gap-1.5 transition-all shadow-2xs max-w-[125px] sm:max-w-[160px] ${badgeStyle} ${
          canAdvance ? 'cursor-pointer hover:shadow-xs active:scale-95' : 'cursor-default'
        }`}
        title={canAdvance ? `点击快速切换工单状态 (当前: ${fullTooltip})` : `当前工况: ${fullTooltip}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse shrink-0`} />
        <StatusIcon className="w-3 h-3 shrink-0" />
        <span className="truncate min-w-0">{compactLabel}</span>
        {canAdvance && (
          <ChevronDown
            className={`w-3 h-3 shrink-0 transition-transform duration-200 opacity-60 ${
              isOpen ? 'rotate-180 opacity-100' : ''
            }`}
          />
        )}
      </button>

      {/* Beautified Status Transition Popover */}
      <AnimatePresence>
        {isOpen && canAdvance && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`absolute top-full mt-1.5 ${alignClass} w-64 rounded-xl backdrop-blur-xl bg-white/95 border border-neutral-200/90 shadow-2xl p-2 z-50 overflow-hidden`}
          >
            <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 mb-1.5 flex items-center justify-between">
              <span>状态流转中枢</span>
              <span className="font-mono text-neutral-500">#{order.orderNo.replace(/^#/, '')}</span>
            </div>

            <div className="space-y-1">
              {status === 'pending' && (
                <button
                  type="button"
                  onClick={() => {
                    onAdvanceStatus?.('cooking', { status: 'cooking', statusText: '制作中 · 炭火炙烤' });
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-orange-50/60 hover:bg-orange-100/80 text-orange-950 text-xs font-bold border border-orange-200/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-600" />
                    <span>接单制作 (进入后厨)</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-orange-600" />
                </button>
              )}

              {(status === 'pending' || status === 'cooking') && (
                <button
                  type="button"
                  onClick={() => {
                    onAdvanceStatus?.('delivering', {
                      status: 'delivering',
                      statusText: channel === 'pickup' ? '待自提 · 柜内保温' : channel === 'dine_in' ? '已传菜 · 待翻台' : '骑手送餐中'
                    });
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-sky-50/60 hover:bg-sky-100/80 text-sky-950 text-xs font-bold border border-sky-200/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bike className="w-4 h-4 text-sky-600" />
                    <span>制作齐备 (通知{channel === 'pickup' ? '自提' : channel === 'dine_in' ? '传菜' : '配送'})</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-sky-600" />
                </button>
              )}

              {status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => {
                    onAdvanceStatus?.('completed', { status: 'completed', statusText: '工单完成已归档' });
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-950 text-xs font-bold border border-emerald-200/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>核销结单 · 归档</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
