import React, { useState } from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TrackingTimelineLog } from '../../types/tracking';

interface TrackingTimelineLogsProps {
  logs?: TrackingTimelineLog[];
  currentStatusText?: string;
}

export const TrackingTimelineLogs: React.FC<TrackingTimelineLogsProps> = ({
  logs = [
    { time: '19:05:22', title: '骑手已取餐', desc: '专送骑手李峰已完成餐品核验并放入恒温保温箱' },
    { time: '19:01:10', title: '餐车出餐完毕', desc: '黑曜石 01 号流动餐车完成现制现烤与封装' },
    { time: '18:55:40', title: '骑手已接单', desc: '系统算法调度附近最优专线骑手李峰接单' },
    { time: '18:54:12', title: '餐车已接单', desc: '流动餐车主理人已确认订单并开始制作' },
    { time: '18:53:50', title: '支付成功', desc: '微信支付 / 微信商户号扣款完成 ¥145.00' },
    { time: '18:53:30', title: '用户提交订单', desc: '订单创建成功，分配专属单号 #DEL-9912' }
  ],
  currentStatusText = '骑手已取餐·配送中'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white px-4 py-3.5 border-b border-[#ededeb]">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity cursor-pointer group"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="w-4.5 h-4.5 text-black stroke-[1.8] shrink-0" />
          <span className="text-[13.5px] font-bold text-black truncate">
            流转节点状态: <span className="font-normal text-[#555]">{currentStatusText}</span>
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 ml-1">
          <span className="text-[12px] text-[#787770]">展开详情 ({logs.length}条)</span>
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-4 h-4 text-[#888880]" />
          </motion.div>
        </div>
      </button>

      {/* Expanded Timeline Logs */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-[#f0f0ed] space-y-3 text-xs overflow-hidden"
          >
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <span className="font-sans text-[10px] text-[#888] pt-0.5 shrink-0">{log.time}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-black truncate">{log.title}</p>
                  <p className="text-[11px] text-[#666] mt-0.5 break-words">{log.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
