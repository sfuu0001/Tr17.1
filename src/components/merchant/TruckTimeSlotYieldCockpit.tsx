/**
 * Urban Radar 商家端 - 分时点位营收与坪效预测看板 (Time-Slot Location Revenue & Yield Cockpit)
 * 深度解析：早市 (地铁口通勤提速)、午市 (CBD写字楼白领简餐)、夜市 (步行街/精酿啤酒小吃) 坪效与点位流转策略
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  Clock,
  MapPin,
  DollarSign,
  Users,
  Compass,
  Sparkles,
  ArrowUpRight,
  PieChart,
  Calendar
} from 'lucide-react';
import { TruckInfo } from '../../types';

interface TimeSlotAnalysis {
  slotKey: 'morning' | 'lunch' | 'night';
  title: string;
  timeRange: string;
  anchorLocation: string;
  targetAudience: string;
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
  profitMarginPercent: number;
  yieldPerSqmPerHour: number; // 坪效 (元/㎡/小时)
  isPeakBest: boolean;
}

const TIME_SLOT_DATA: TimeSlotAnalysis[] = [
  {
    slotKey: 'morning',
    title: '早市通勤能量档',
    timeRange: '07:30 ~ 09:30',
    anchorLocation: '曲阜路地铁 3 号口便民广场',
    targetAudience: '早八换乘通勤白领、晨练市民',
    revenue: 1680,
    orderCount: 88,
    avgOrderValue: 19.1,
    profitMarginPercent: 62.5,
    yieldPerSqmPerHour: 70.0, // 餐车按12㎡计算
    isPeakBest: false
  },
  {
    slotKey: 'lunch',
    title: '午市 CBD 极速专送档',
    timeRange: '11:15 ~ 13:45',
    anchorLocation: '静安大悦城 · 商务南广场绿化带',
    targetAudience: '商务楼宇白领、科技园工程师工作餐',
    revenue: 4890,
    orderCount: 126,
    avgOrderValue: 38.8,
    profitMarginPercent: 68.2,
    yieldPerSqmPerHour: 163.0,
    isPeakBest: true
  },
  {
    slotKey: 'night',
    title: '夜市微醺烟火档',
    timeRange: '18:00 ~ 22:30',
    anchorLocation: '海宁路沿街步行街外摆专区',
    targetAudience: '下班夜宵、聚会社交、精酿烧烤客群',
    revenue: 3450,
    orderCount: 54,
    avgOrderValue: 63.9,
    profitMarginPercent: 71.0,
    yieldPerSqmPerHour: 63.8,
    isPeakBest: false
  }
];

interface TruckTimeSlotYieldCockpitProps {
  truck: TruckInfo;
  showToast?: (msg: string) => void;
}

export const TruckTimeSlotYieldCockpit: React.FC<TruckTimeSlotYieldCockpitProps> = ({
  truck,
  showToast = console.log
}) => {
  const [selectedSlot, setSelectedSlot] = useState<'morning' | 'lunch' | 'night'>('lunch');

  const totalDayRevenue = TIME_SLOT_DATA.reduce((sum, s) => sum + s.revenue, 0);
  const totalDayOrders = TIME_SLOT_DATA.reduce((sum, s) => sum + s.orderCount, 0);
  const avgDayMargin = Math.round(
    TIME_SLOT_DATA.reduce((sum, s) => sum + s.profitMarginPercent, 0) / TIME_SLOT_DATA.length
  );

  const activeSlot = TIME_SLOT_DATA.find((s) => s.slotKey === selectedSlot) || TIME_SLOT_DATA[1];

  const handleApplyStrategy = (slot: TimeSlotAnalysis) => {
    showToast(`📍【点位调度策略已采纳】餐车已锁定 [${slot.timeRange}] 准时迁徙至【${slot.anchorLocation}】！`);
  };

  return (
    <div className="space-y-4">
      {/* 顶部总体坪效与收益宏观概览 */}
      <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#f1f1ef]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-[#1a1a17]">
              {truck.name} · 全天分时坪效与点位营收模型 (Yield Cockpit)
            </h3>
          </div>
          <span className="text-xs text-[#787774] font-mono">
            餐车操作展开面积: 12 ㎡ · 移动点位效益放大 3.4 倍
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="bg-[#fafaf8] p-3 rounded-xl border border-[#ecebe8]">
            <div className="text-[11px] text-[#787774] flex items-center justify-between">
              <span>全天营业额预估</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-bold font-mono text-[#1a1a17] mt-1">
              ¥{totalDayRevenue.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5">
              比固定商铺坪效高 +140%
            </div>
          </div>

          <div className="bg-[#fafaf8] p-3 rounded-xl border border-[#ecebe8]">
            <div className="text-[11px] text-[#787774] flex items-center justify-between">
              <span>出餐总单量</span>
              <Users className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-bold font-mono text-[#1a1a17] mt-1">
              {totalDayOrders} <span className="text-xs font-normal text-stone-500">单</span>
            </div>
            <div className="text-[10px] text-[#787774] mt-0.5">
              翻台/流转率极高
            </div>
          </div>

          <div className="bg-[#fafaf8] p-3 rounded-xl border border-[#ecebe8]">
            <div className="text-[11px] text-[#787774] flex items-center justify-between">
              <span>平均毛利率</span>
              <PieChart className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-700 mt-1">
              {avgDayMargin}%
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">
              剔除平台抽佣后净利率 ≈ 48%
            </div>
          </div>

          <div className="bg-[#fafaf8] p-3 rounded-xl border border-[#ecebe8]">
            <div className="text-[11px] text-[#787774] flex items-center justify-between">
              <span>黄金午高峰坪效</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-xl font-bold font-mono text-purple-700 mt-1">
              ¥163 <span className="text-[10px] text-stone-500 font-normal">/㎡/h</span>
            </div>
            <div className="text-[10px] text-purple-600 font-bold mt-0.5">
              超越顶级购物中心标准
            </div>
          </div>
        </div>
      </div>

      {/* 三大黄金分时时段切换与对比 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TIME_SLOT_DATA.map((slot) => {
          const isSelected = selectedSlot === slot.slotKey;
          return (
            <div
              key={slot.slotKey}
              onClick={() => setSelectedSlot(slot.slotKey)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                  : 'border-[#e8e7e4] bg-white hover:bg-[#fafaf8]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1a1a17]">
                    {slot.title}
                  </span>
                  {slot.isPeakBest && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                      最高坪效
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-[#787774] font-mono mt-1">
                  <Clock className="w-3 h-3 text-stone-500" />
                  <span>{slot.timeRange}</span>
                </div>

                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#787774]">时段营收:</span>
                    <span className="font-mono font-bold text-[#1a1a17]">
                      ¥{slot.revenue}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#787774]">出餐单量 / 客单价:</span>
                    <span className="font-mono text-stone-800">
                      {slot.orderCount} 单 (均 ¥{slot.avgOrderValue})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#787774]">每小时每平米坪效:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      ¥{slot.yieldPerSqmPerHour}/㎡/h
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[#f0efec] flex items-center justify-between text-xs">
                <span className="text-[10px] text-[#787774] truncate max-w-[140px]">
                  📍 {slot.anchorLocation}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold flex items-center">
                  查看点位策略 <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 选中时段的详细策略深度解析与一键调度 */}
      <div className="bg-white border border-[#e3e2e0] rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#f1f1ef]">
          <div>
            <h4 className="text-xs font-bold text-[#1a1a17]">
              【{activeSlot.title}】({activeSlot.timeRange}) 运营与选址流转建议
            </h4>
            <p className="text-[11px] text-[#787774]">
              客群洞察：{activeSlot.targetAudience}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleApplyStrategy(activeSlot)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>采纳并预约该时段驻车点位</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-[#fcfbfa] p-3 rounded-lg border border-[#ecebe8]">
            <div className="font-bold text-stone-900 mb-1">🎯 菜单商品推荐组合</div>
            <p className="text-[#5a5854] leading-relaxed">
              {activeSlot.slotKey === 'morning'
                ? '以热压吐司、黑咖组合、现磨豆浆为主打，提倡“30秒极速自提”，提前在保温箱预制 20 份标准套餐，大幅减少早高峰排队损失。'
                : activeSlot.slotKey === 'lunch'
                ? '主打能量热餐（低卡烤鸡胸糙米饭、炭火现烤牛排卷），利用双层炸炉与自动翻炒锅批量烹制，承接 CBD 写字楼并单专送，客单价拉升至 38 元以上。'
                : '以炭烤串烧、精酿原浆啤酒、炸鸡软饮拼盘为核心，开放餐车遮阳棚外摆氛围灯，主攻 2~4 人聚会微醺拼单，利润率高达 71%。'}
            </p>
          </div>

          <div className="bg-[#fcfbfa] p-3 rounded-lg border border-[#ecebe8]">
            <div className="font-bold text-stone-900 mb-1">📍 停车合规与外卖骑手接驳建议</div>
            <p className="text-[#5a5854] leading-relaxed">
              {activeSlot.slotKey === 'morning'
                ? '必须停靠在地铁 3 号口非机动车缓冲区外，距离进站闸机步行仅 45 秒，避免占用盲道。'
                : activeSlot.slotKey === 'lunch'
                ? '停靠在大悦城商务座绿化退界带，距离 1 号和 2 号外卖取餐柜仅 60 米，专送骑手可在 90 秒内完成取件并直冲电梯。'
                : '入驻步行街临时外摆夜市集市，接驳 220V/32A 市电桩以降低发电机噪音，提升堂食外摆体验。'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
