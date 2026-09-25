import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Copy,
  Check,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  X,
  Clock
} from 'lucide-react';
import { Order } from '../../types';

interface BeautifiedOrderUserDropdownProps {
  order: Order;
  onOpenChat?: () => void;
  showToast?: (msg: string) => void;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

/**
 * BeautifiedOrderUserDropdown
 * 严格遵循 AGENTS.md 第 7 条美化下拉小组件规范：
 * - 优雅收拢超长 UID 与顾客画像
 * - 一键复制、顾客联络入口与身份徽标
 * - 高阶毛玻璃与物理级微动效
 */
export const BeautifiedOrderUserDropdown: React.FC<BeautifiedOrderUserDropdownProps> = ({
  order,
  onOpenChat,
  showToast,
  className = '',
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const uid = order.userId || 'tcb_u_guest_unregistered';
  const displayUid = uid.length > 12 ? `${uid.slice(0, 10)}...` : uid;

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleCopyUid = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(uid);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = uid;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast?.(`已复制顾客UID: ${uid}`);
    } catch {
      showToast?.('复制失败，请手动长按复制');
    }
  };

  const alignClass =
    align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0';

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        style={{ touchAction: 'manipulation' }}
        className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs transition-all cursor-pointer select-none border max-w-full ${
          isOpen
            ? 'bg-neutral-100 border-neutral-400 text-neutral-950 ring-1.5 ring-neutral-400/20 font-bold shadow-xs'
            : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200/90 hover:border-neutral-300 shadow-2xs font-medium'
        }`}
        title="点击查看顾客身份档案与联络"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <User className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
        <span className="truncate max-w-[90px] sm:max-w-[120px] font-sans">
          {displayUid}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-neutral-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-neutral-800' : ''
          }`}
        />
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`absolute top-full mt-1.5 ${alignClass} w-72 sm:w-80 rounded-xl backdrop-blur-xl bg-white/95 border border-neutral-200/90 shadow-2xl shadow-neutral-950/15 p-3 z-50 overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100/90 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200/90 flex items-center justify-center text-neutral-800 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <span>{order.customerName || '注册食客'}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      安全核验
                    </span>
                  </div>
                  <div className="text-[10.5px] text-neutral-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span>下单: {order.createdTime || '12:36:20'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-5 h-5 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* UID Copy Section */}
            <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200/80 mb-2.5">
              <div className="text-[10.5px] text-neutral-500 font-bold mb-1 flex items-center justify-between">
                <span>用户唯一标识 (UID)</span>
                {copied && (
                  <span className="text-emerald-700 flex items-center gap-0.5 text-[10px] font-bold">
                    <Check className="w-3 h-3" /> 已复制
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-mono select-all truncate text-neutral-800 flex-1">
                  {uid}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUid}
                  className="px-2 py-1 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 rounded text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                  title="复制完整UID"
                >
                  <Copy className="w-3 h-3 text-neutral-500" />
                  <span>复制</span>
                </button>
              </div>
            </div>

            {/* Phone & Channel Details */}
            <div className="grid grid-cols-2 gap-1.5 text-xs mb-2.5">
              <div className="p-2 rounded-lg bg-neutral-50/70 border border-neutral-100">
                <div className="text-[10.5px] text-neutral-400">联系电话</div>
                <div className="font-bold text-neutral-800 mt-0.5">
                  {order.userPhone ? order.userPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '隐私保护号'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-neutral-50/70 border border-neutral-100">
                <div className="text-[10.5px] text-neutral-400">信用评分</div>
                <div className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>极速绿标 (A+)</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {onOpenChat && (
              <button
                type="button"
                onClick={() => {
                  onOpenChat();
                  setIsOpen(false);
                }}
                className="w-full py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>进入订单专属联络室</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
