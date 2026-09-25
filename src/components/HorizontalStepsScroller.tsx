import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  ShoppingBag,
  ChefHat,
  CookingPot,
  Flame,
  Package,
  UtensilsCrossed,
  PackageCheck,
  Bike,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { useToast } from './ui/ToastContext';

export interface HorizontalStepsScrollerProps {
  order: any;
  stepIndex: number;
}

export const HorizontalStepsScroller: React.FC<HorizontalStepsScrollerProps> = ({
  order,
  stepIndex
}) => {
  const toast = useToast();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<any | null>(null);
  const countdownIntervalRef = useRef<any | null>(null);

  // 10s 倒计时状态
  const [countdown, setCountdown] = useState<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

  const channel =
    order?.channelType ||
    order?.channel ||
    (order?.tableCode ? 'dine_in' : order?.pickupCode ? 'pickup' : 'delivery');
  const isDineIn = channel === 'dine_in';
  const isPickup = channel === 'pickup';

  const steps = isDineIn
    ? [
        { key: 'placed', label: '开台下单', desc: '微信扫码开台支付成功' },
        { key: 'accepted', label: '后厨接单', desc: '炭火档与冷饮档同步排产' },
        { key: 'cooking', label: '炭火现制', desc: '高温炭火慢烘炙烤' },
        { key: 'serving', label: '陆续上菜', desc: '传菜专员核验出餐上桌' },
        { key: 'all_served', label: '餐品齐备', desc: '全单菜品上齐，客享盛宴' }
      ]
    : isPickup
    ? [
        { key: 'placed', label: '提交订单', desc: '支付成功已入库' },
        { key: 'accepted', label: '餐车接单', desc: '餐车主理人排产确认' },
        { key: 'cooking', label: '现制包装', desc: '炭火现制与双层锁鲜封签' },
        { key: 'ready', label: '出餐待取', desc: '放入恒温取餐柜生成取餐码' },
        { key: 'completed', label: '到店已取', desc: '顾客核销取餐履约完成' }
      ]
    : [
        { key: 'placed', label: '下单支付', desc: '已提交微信支付' },
        { key: 'accepted', label: '商家接单', desc: '餐车后厨备料制作' },
        { key: 'cooking', label: '现制出餐', desc: '出餐完毕待骑手核验' },
        { key: 'delivering', label: '极速专送', desc: '恒温箱极速配送' },
        { key: 'delivered', label: '妥投送达', desc: '餐品妥投存证' }
      ];

  const isDelivered =
    order?.statusType === 'delivered' ||
    order?.status === 'DELIVERED' ||
    order?.status === 'completed' ||
    stepIndex >= 4;

  const safeStep = isDelivered ? 4 : Math.max(0, Math.min(stepIndex, 4));

  const stepTimestamps = isDineIn
    ? [order.createdTime || '12:20', order.acceptedTime || '12:21', '预计12:23', '预计12:26', '预计12:30']
    : isPickup
    ? [order.createdTime || '12:20', order.acceptedTime || '12:22', '预计12:28', '已入恒温柜', '预计已取']
    : [order.createdTime || '12:20', order.acceptedTime || '12:25', '预计12:35', '预计12:45', order.estArrival || '预计12:55'];

  // 将当前焦点节点居中显示在可视窗口中
  const centerActiveNode = useCallback(
    (smooth = true) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const nodeElements = container.querySelectorAll('[data-step-item]');
      const activeEl = nodeElements[safeStep] as HTMLElement;
      if (activeEl) {
        const containerWidth = container.clientWidth;
        const elLeft = activeEl.offsetLeft;
        const elWidth = activeEl.offsetWidth;
        const targetScroll = elLeft - containerWidth / 2 + elWidth / 2;

        container.scrollTo({
          left: Math.max(0, targetScroll),
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    },
    [safeStep]
  );

  // 检查滚动条边界
  const updateScrollBounds = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  // 首次加载自动居中当前节点
  useEffect(() => {
    // 短暂延迟确保 DOM 布局已完成
    const timer = setTimeout(() => {
      centerActiveNode(false);
      updateScrollBounds();
    }, 60);

    return () => clearTimeout(timer);
  }, [centerActiveNode, updateScrollBounds]);

  // 处理用户手动滚动事件：启动 10 秒恢复定时器
  const handleScroll = () => {
    updateScrollBounds();

    // 清理之前的计时器
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setCountdown(10);

    // 每秒递减倒计时显示
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 10秒后平滑回正到当前节点
    timerRef.current = setTimeout(() => {
      centerActiveNode(true);
      setCountdown(0);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }, 10000);
  };

  // 清理所有定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // 渲染当前节点的放大动效图标
  const renderCurrentStepIcon = (idx: number) => {
    switch (idx) {
      case 0:
        return (
          <motion.div
            animate={{ scale: [1, 1.15, 1], rotate: [0, -3, 3, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="flex items-center justify-center"
          >
            <ShoppingBag className="w-5 h-5 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.9)]" />
          </motion.div>
        );
      case 1:
        return (
          <motion.div
            animate={{ rotate: [0, -10, 10, -5, 0], y: [0, -2, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="flex items-center justify-center"
          >
            {isDineIn || isPickup ? (
              <ChefHat className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
            ) : (
              <CookingPot className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
            )}
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            animate={{ y: [0, -3, 0], scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            className="flex items-center justify-center"
          >
            {isDineIn || isPickup ? (
              <Flame className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.95)]" />
            ) : (
              <Package className="w-5 h-5 text-sky-300 drop-shadow-[0_0_8px_rgba(125,211,252,0.95)]" />
            )}
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            animate={{ x: [0, 3, -2, 0], y: [0, -1.5, 0] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            className="flex items-center justify-center"
          >
            {isDineIn ? (
              <UtensilsCrossed className="w-5 h-5 text-emerald-300 drop-shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
            ) : isPickup ? (
              <PackageCheck className="w-5 h-5 text-emerald-300 drop-shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
            ) : (
              <Bike className="w-5 h-5 text-emerald-300 drop-shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
            )}
          </motion.div>
        );
      case 4:
        return (
          <motion.div
            animate={{ scale: [1, 1.25, 1], rotate: [0, 8, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="flex items-center justify-center"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-300 drop-shadow-[0_0_10px_rgba(110,231,183,1)]" />
          </motion.div>
        );
      default:
        return <Check className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="relative w-full py-2.5 my-0.5 select-none" data-purpose="horizontal-flow-stepper">
      {/* 左右滑动探索微型状态指示胶囊 (含 10s 自动回位指示) */}
      <div className="flex items-center justify-between px-1 mb-2 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[#059669] font-black tracking-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            <span>履约时序流转</span>
          </span>
          <span className="text-[#888880] text-[9.5px]">（支持左右横滑 · 视口聚焦3节点）</span>
        </div>

        {countdown > 0 ? (
          <button
            type="button"
            onClick={() => {
              centerActiveNode(true);
              setCountdown(0);
              if (timerRef.current) clearTimeout(timerRef.current);
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            }}
            className="inline-flex items-center gap-1 bg-[#fff7ed] border border-[#fed7aa] text-[#c2410c] px-2 py-0.5 rounded-full tabular-nums text-[9.5px] font-bold active:scale-95 transition-transform cursor-pointer shadow-2xs"
            title="点击立即回正到当前执行状态"
          >
            <RotateCcw className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '4s' }} />
            <span>{countdown}s 后自动回正</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => centerActiveNode(true)}
            className="text-[9.5px] text-[#787770] hover:text-black font-medium flex items-center gap-0.5 transition-colors cursor-pointer"
          >
            <span>聚焦当前</span>
            <ChevronRight className="w-3 h-3 text-[#9c9b94]" />
          </button>
        )}
      </div>

      {/* 外层可视窗口与滑动边缘阴影 */}
      <div className="relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#fcfcfb] to-[#f7f7f4] border border-[#ecece8] py-3.5 shadow-2xs">
        {/* 左侧向左滑动的淡隐遮罩 */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#fcfcfb] to-transparent z-20 pointer-events-none flex items-center justify-start pl-1">
            <ChevronLeft className="w-3.5 h-3.5 text-[#888882] animate-pulse" />
          </div>
        )}

        {/* 右侧向右滑动的淡隐遮罩 */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#f7f7f4] to-transparent z-20 pointer-events-none flex items-center justify-end pr-1">
            <ChevronRight className="w-3.5 h-3.5 text-[#888882] animate-pulse" />
          </div>
        )}

        {/* 核心横向水平滚动容器 (手机可视范围最多显示3个节点，w-1/3 min-w-[33.333%]) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="relative flex items-center overflow-x-auto scroll-smooth no-scrollbar w-full"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* 贯穿5节点的连接轨道背景线 */}
          <div
            className="absolute top-[48px] h-[2px] bg-[#e6e6e0] rounded-full z-0 pointer-events-none"
            style={{
              left: '16.666%',
              right: '16.666%',
              width: 'calc(100% * 4 / 3)'
            }}
          />

          {/* 动态点亮的翡翠色流转进度线 */}
          <motion.div
            className="absolute top-[48px] h-[2.5px] bg-gradient-to-r from-[#059669] to-[#10b981] rounded-full z-0 pointer-events-none shadow-[0_0_6px_rgba(16,185,129,0.5)]"
            style={{
              left: '16.666%'
            }}
            initial={false}
            animate={{
              width: `${(safeStep / 4) * (100 * 4 / 3)}%`
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          />

          {/* 5个流转节点迭代渲染 */}
          {steps.map((s, idx) => {
            const isCompleted = isDelivered ? true : idx < safeStep;
            const isCurrent = isDelivered ? idx === 4 : idx === safeStep;
            const timeText = stepTimestamps[idx] || (idx === safeStep ? '进行中' : `节点${idx + 1}`);

            return (
              <div
                key={s.key}
                data-step-item
                data-step-index={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  toast.info(
                    '🔒 官方履约存证',
                    `阶段:「${s.label}」- ${s.desc}。订单状态流转仅由餐车主理人与接单骑手授权推进，客户端实时防篡改存证`
                  );
                }}
                className="w-1/3 min-w-[33.333%] max-w-[33.333%] shrink-0 flex flex-col items-center justify-center text-center px-1 relative z-10 cursor-pointer group"
                title={`阶段:「${s.label}」- ${s.desc} (客户端只读)`}
              >
                {/* 顶部时间戳胶囊 */}
                <div className="h-5 flex items-center justify-center mb-1">
                  {isCurrent ? (
                    <span className="text-[10px] tabular-nums font-black text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 rounded-full shadow-2xs whitespace-nowrap">
                      {timeText}
                    </span>
                  ) : isCompleted ? (
                    <span className="text-[8.5px] tabular-nums font-bold text-[#059669]/80 whitespace-nowrap">
                      {timeText}
                    </span>
                  ) : (
                    <span className="text-[8.5px] tabular-nums text-[#a0a098] whitespace-nowrap">
                      {timeText}
                    </span>
                  )}
                </div>

                {/* 节点图标容器：当前节点极致放大突出；非当前节点缩小收敛 */}
                <div className="h-12 flex items-center justify-center relative">
                  {isCurrent ? (
                    <div className="relative flex items-center justify-center">
                      {/* 外层优雅的脉冲发光光圈 */}
                      <span className="absolute -inset-1.5 rounded-full bg-[#10b981]/25 animate-ping pointer-events-none" />
                      <div className="relative w-11 h-11 rounded-full bg-gradient-to-b from-[#1c1c1a] to-[#0c0c0b] text-white flex items-center justify-center ring-2 ring-[#059669] ring-offset-2 ring-offset-white shadow-md border border-white/15">
                        {renderCurrentStepIcon(idx)}
                      </div>
                    </div>
                  ) : isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-[#059669] text-white flex items-center justify-center shadow-2xs border border-[#047857] transition-transform group-hover:scale-110">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  ) : (
                    <div className="w-5.5 h-5.5 rounded-full bg-[#f4f4f2] border border-[#d6d6ce] text-[#9c9a92] flex items-center justify-center text-[9px] tabular-nums font-bold transition-all group-hover:bg-[#ebebe7] group-hover:text-black">
                      {idx + 1}
                    </div>
                  )}
                </div>

                {/* 底部阶段名称：当前节点文字增大加黑；非当前节点缩小 */}
                <div className="mt-1 flex flex-col items-center">
                  <span
                    className={`whitespace-nowrap transition-all ${
                      isCurrent
                        ? 'text-[12.5px] font-black text-obsidian tracking-tight'
                        : isCompleted
                        ? 'text-[10px] font-bold text-[#059669]'
                        : 'text-[10px] font-medium text-[#7c7c75] group-hover:text-black'
                    }`}
                  >
                    {s.label}
                  </span>

                  {/* 当前节点专属微标签 */}
                  {isCurrent && (
                    <span className="text-[9px] font-bold text-[#ea580c] bg-[#fff7ed] border border-[#fed7aa] px-1.5 py-0.2 rounded-full mt-0.5 whitespace-nowrap shadow-2xs">
                      当前阶段
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
