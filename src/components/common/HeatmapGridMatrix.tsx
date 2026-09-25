import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Keyboard
} from 'lucide-react';
import { audioHaptics } from '../../utils/audioHaptics';

export type HeatmapColorTheme = 'emerald' | 'risk_red' | 'amber' | 'blue';

export interface HeatmapDataPoint {
  date: string; // 'YYYY-MM-DD'
  value: number;
  level?: 0 | 1 | 2 | 3 | 4; // optional explicit level, otherwise auto-computed from value
  title?: string;
  subtitle?: string;
  metrics?: Array<{ label: string; value: string | number; highlight?: boolean }>;
  status?: 'normal' | 'warning' | 'alert' | 'success';
  tags?: string[];
  extraNote?: string;
}

export interface HeatmapGridMatrixProps {
  id?: string;
  title: string;
  subtitle?: string;
  theme?: HeatmapColorTheme;
  daysCount?: number; // default 30 or 60
  data: HeatmapDataPoint[];
  selectedDate?: string | null;
  onSelectDate?: (date: string, point?: HeatmapDataPoint) => void;
  defaultExpanded?: boolean;
  metricUnit?: string;
  legendLabels?: [string, string, string, string, string];
  customEmptyText?: string;
  compactBannerMode?: boolean;
  className?: string;
}

// 颜色样式映射
const THEME_STYLES: Record<HeatmapColorTheme, {
  levelColors: [string, string, string, string, string];
  selectedRing: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  activeAccent: string;
}> = {
  emerald: {
    levelColors: [
      'bg-[#f0f2ef] hover:bg-[#e4e7e2] border-[#e2e6e0]', // Level 0: 无营运/无数据
      'bg-[#d1e7dd] hover:bg-[#c2ded3] border-[#b5d6c8]', // Level 1: 起步/少量
      'bg-[#95cdb2] hover:bg-[#80bfa1] border-[#72b595]', // Level 2: 稳健/常规
      'bg-[#4ba27d] hover:bg-[#3d916e] border-[#368463]', // Level 3: 良好/达标
      'bg-[#1f6f4a] hover:bg-[#185d3e] border-[#165538]'  // Level 4: 爆棚/销冠
    ],
    selectedRing: 'ring-2 ring-[#1f6f4a] ring-offset-1',
    badgeBg: 'bg-[#edf6f1]',
    badgeText: 'text-[#2b593f]',
    badgeBorder: 'border-[#cbe4d7]',
    activeAccent: '#2b593f'
  },
  risk_red: {
    levelColors: [
      'bg-[#f3f4f6] hover:bg-[#e5e7eb] border-[#e5e7eb]', // Level 0: 零审计异常
      'bg-[#fee2e2] hover:bg-[#fecaca] border-[#fca5a5]', // Level 1: 偶发轻微调整
      'bg-[#fca5a5] hover:bg-[#f87171] border-[#ef4444]', // Level 2: 中频关注 (4-8次)
      'bg-[#ef4444] hover:bg-[#dc2626] border-[#b91c1c]', // Level 3: 密集风控 (>8次)
      'bg-[#991b1b] hover:bg-[#7f1d1d] border-[#450a0a]'  // Level 4: 重特大风险/强行锁单
    ],
    selectedRing: 'ring-2 ring-red-600 ring-offset-1',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-700',
    badgeBorder: 'border-red-200',
    activeAccent: '#dc2626'
  },
  amber: {
    levelColors: [
      'bg-[#f5f5f4] hover:bg-[#e7e5e4] border-[#e7e5e4]', // Level 0: 平账/正常
      'bg-[#fef3c7] hover:bg-[#fde68a] border-[#fcd34d]', // Level 1: 轻度微调
      'bg-[#fcd34d] hover:bg-[#fbbf24] border-[#f59e0b]', // Level 2: 明显变动
      'bg-[#f59e0b] hover:bg-[#d97706] border-[#b45309]', // Level 3: 较大长短款/频繁交接
      'bg-[#b45309] hover:bg-[#92400e] border-[#78350f]'  // Level 4: 严重差异/超时漏打卡
    ],
    selectedRing: 'ring-2 ring-amber-600 ring-offset-1',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    activeAccent: '#d97706'
  },
  blue: {
    levelColors: [
      'bg-[#f0f4f8] hover:bg-[#e2e8f0] border-[#cbd5e1]', // Level 0: 队列为空
      'bg-[#dbeafe] hover:bg-[#bfdbfe] border-[#93c5fd]', // Level 1: 偶发离线缓存
      'bg-[#93c5fd] hover:bg-[#60a5fa] border-[#3b82f6]', // Level 2: 持续同步中
      'bg-[#3b82f6] hover:bg-[#2563eb] border-[#1d4ed8]', // Level 3: 峰值缓存外发
      'bg-[#1e40af] hover:bg-[#1e3a8a] border-[#172554]'  // Level 4: 重试或大批量重放
    ],
    selectedRing: 'ring-2 ring-blue-600 ring-offset-1',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    activeAccent: '#2563eb'
  }
};

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export const HeatmapGridMatrix: React.FC<HeatmapGridMatrixProps> = ({
  id,
  title,
  subtitle,
  theme = 'emerald',
  daysCount = 42, // 默认 6 周 (42天) 保证正好填满完整周
  data,
  selectedDate,
  onSelectDate,
  defaultExpanded = true,
  metricUnit = '',
  legendLabels = ['无', '轻量', '常规', '良好', '峰值'],
  compactBannerMode = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [hoveredPoint, setHoveredPoint] = useState<HeatmapDataPoint | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 切换音效
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioHaptics.setSoundEnabled(next);
    if (next) {
      audioHaptics.playMicroClick();
    }
  };

  const themeStyle = THEME_STYLES[theme] || THEME_STYLES.emerald;

  // 1. 构建日期序列与数据索引
  const { gridWeeks, totalMetricSum, maxMetricValue, activeDaysCount } = useMemo(() => {
    const map = new Map<string, HeatmapDataPoint>();
    let sum = 0;
    let max = 0;
    let countActive = 0;

    data.forEach((p) => {
      map.set(p.date, p);
      sum += p.value || 0;
      if (p.value > max) max = p.value;
      if (p.value > 0) countActive++;
    });

    // 计算终止日 (今日) 与起始日
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 调整到当前周周日结束，往前推 daysCount 天
    const currentDayOfWeek = (today.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - currentDayOfWeek)); // 本周日

    const weeks = [];
    const totalWeeks = Math.ceil(daysCount / 7);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (totalWeeks * 7 - 1));

    let iter = new Date(startDate);

    for (let w = 0; w < totalWeeks; w++) {
      const daysInWeek = [];
      let weekMonthLabel = '';

      for (let d = 0; d < 7; d++) {
        const dateStr = iter.toISOString().slice(0, 10);
        const isFuture = iter > today;
        const matched = map.get(dateStr);

        let computedLevel: 0 | 1 | 2 | 3 | 4 = 0;
        if (!isFuture && matched) {
          if (typeof matched.level === 'number') {
            computedLevel = matched.level;
          } else if (max > 0) {
            const ratio = matched.value / max;
            if (ratio === 0) computedLevel = 0;
            else if (ratio < 0.25) computedLevel = 1;
            else if (ratio < 0.55) computedLevel = 2;
            else if (ratio < 0.85) computedLevel = 3;
            else computedLevel = 4;
          }
        }

        if (d === 0 || iter.getDate() === 1) {
          weekMonthLabel = `${iter.getMonth() + 1}月`;
        }

        daysInWeek.push({
          date: dateStr,
          dayNumber: iter.getDate(),
          isFuture,
          isToday: dateStr === today.toISOString().slice(0, 10),
          level: isFuture ? 0 : computedLevel,
          dataPoint: matched || {
            date: dateStr,
            value: 0,
            level: 0,
            title: dateStr,
            subtitle: isFuture ? '未来日期' : '无数据记录'
          }
        });

        iter.setDate(iter.getDate() + 1);
      }

      weeks.push({
        weekIndex: w,
        monthLabel: weekMonthLabel,
        days: daysInWeek
      });
    }

    return {
      gridWeeks: weeks,
      totalMetricSum: sum,
      maxMetricValue: max,
      activeDaysCount: countActive
    };
  }, [data, daysCount]);

  const handleCellClick = (point: HeatmapDataPoint, isFuture: boolean) => {
    if (isFuture) return;
    audioHaptics.playMechanicalLatch();
    if (onSelectDate) {
      onSelectDate(point.date, point);
    }
  };

  return (
    <div 
      id={id} 
      className={`bg-white rounded-[4px] border border-[#e6e6e4] shadow-2xs transition-all overflow-hidden ${className}`}
    >
      {/* 头部标题与折叠切换栏 */}
      <div className="p-3 sm:px-4 bg-[#fafaf9] border-b border-[#efefed] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeStyle.activeAccent }} />
            <h4 className="font-semibold text-xs text-[#37352f] flex items-center gap-1">
              <span>{title}</span>
              <span className={`px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono font-medium ${themeStyle.badgeBg} ${themeStyle.badgeText} border ${themeStyle.badgeBorder}`}>
                近 {daysCount} 天热力打卡
              </span>
            </h4>
          </div>
          {subtitle && (
            <span className="text-[11px] text-[#787774] hidden md:inline border-l border-[#e6e6e4] pl-2">
              {subtitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* 活跃打卡天数统计 */}
          <div className="hidden sm:flex items-center gap-2 text-[10.5px] text-[#787774] font-mono">
            <span>有效活跃: <strong className="text-[#37352f] font-semibold">{activeDaysCount}</strong> 天</span>
            <span>·</span>
            <span>峰值: <strong className="text-[#37352f] font-semibold">{maxMetricValue}{metricUnit}</strong></span>
          </div>

          {/* 声触开关 */}
          <button
            type="button"
            onClick={toggleSound}
            title={soundEnabled ? '声触反馈已开启（点击静音）' : '声触反馈已静音（点击开启）'}
            className={`p-1 rounded-[3px] text-xs transition-colors cursor-pointer ${
              soundEnabled
                ? 'text-[#2b593f] bg-[#edf6f1] hover:bg-[#dff0e7]'
                : 'text-[#9b9a97] hover:bg-[#efefed]'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] text-[#5a5854] hover:text-[#201f1d] flex items-center gap-1 font-medium transition-colors cursor-pointer py-0.5 px-1.5 rounded hover:bg-[#efefed]"
          >
            <span>{isExpanded ? '收起矩阵' : '展开打卡热力'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 主体热力栅格区域 */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-3">
          {/* 热力格子矩阵容器 (自适应横向滚动) */}
          <div className="overflow-x-auto pb-1.5 pt-1">
            <div className="min-w-max flex flex-col gap-1 select-none">
              
              {/* 月份标记行 */}
              <div className="flex gap-1 pl-6 text-[10px] text-[#9b9a97] font-mono">
                {gridWeeks.map((week, idx) => (
                  <div key={idx} className="w-[14px] text-center shrink-0">
                    {week.monthLabel && (
                      <span className="whitespace-nowrap font-medium text-[#787774]">{week.monthLabel}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* 7 行 (周一至周日) 对应多个周 */}
              <div className="flex gap-2">
                {/* 星期标签列 */}
                <div className="flex flex-col gap-1 pr-1 text-[9px] text-[#9b9a97] font-mono justify-between py-0.5 shrink-0">
                  {DAY_LABELS.map((day, idx) => (
                    <span key={idx} className="h-[12px] leading-[12px] w-3 text-center">
                      {idx % 2 === 0 ? day : ''}
                    </span>
                  ))}
                </div>

                {/* 核心周列 */}
                <div className="flex gap-1 shrink-0">
                  {gridWeeks.map((week) => (
                    <div key={week.weekIndex} className="flex flex-col gap-1 shrink-0">
                      {week.days.map((day) => {
                        const isSelected = selectedDate === day.date;
                        const cellColor = day.isFuture
                          ? 'bg-[#fafafa] border-transparent opacity-40 cursor-not-allowed'
                          : themeStyle.levelColors[day.level];

                        return (
                          <button
                            key={day.date}
                            type="button"
                            disabled={day.isFuture}
                            onClick={() => handleCellClick(day.dataPoint, day.isFuture)}
                            onMouseEnter={() => {
                              if (!day.isFuture) {
                                setHoveredPoint(day.dataPoint);
                                audioHaptics.playMicroClick();
                              }
                            }}
                            onMouseLeave={() => setHoveredPoint(null)}
                            title={`${day.date}: ${day.dataPoint.value} ${metricUnit}`}
                            className={`w-[12px] h-[12px] rounded-[2px] border transition-all duration-150 relative cursor-pointer active:scale-90 hover:scale-135 hover:z-20 hover:shadow-xs ${cellColor} ${
                              isSelected ? `${themeStyle.selectedRing} scale-125 z-10 font-bold shadow-xs` : ''
                            } ${day.isToday ? 'outline-1 outline-dashed outline-[#37352f]' : ''}`}
                            aria-label={`日期 ${day.date}`}
                          >
                            {isSelected && (
                              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-white animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 底部信息条：图例指示器 + 悬浮/选中卡片信息 */}
          <div className="pt-2 border-t border-[#f0f0ee] flex items-center justify-between gap-3 flex-wrap text-[11px]">
            {/* 动态悬浮/选中日期即时提示 */}
            <div className="flex items-center gap-2 min-w-0">
              {hoveredPoint || selectedDate ? (
                <div className="flex items-center gap-2 flex-wrap animate-fade-in text-[#37352f]">
                  <span className="font-mono font-semibold px-1.5 py-0.5 bg-[#f1f1ef] rounded-[2px] text-[10px] text-[#201f1d]">
                    {(hoveredPoint || data.find(d => d.date === selectedDate))?.date || selectedDate}
                  </span>
                  <span className="font-medium text-[11px] truncate">
                    {(hoveredPoint || data.find(d => d.date === selectedDate))?.title || '已选定日期'}
                  </span>
                  <span className="font-mono font-bold" style={{ color: themeStyle.activeAccent }}>
                    {(hoveredPoint || data.find(d => d.date === selectedDate))?.value || 0} {metricUnit}
                  </span>
                  {(hoveredPoint || data.find(d => d.date === selectedDate))?.extraNote && (
                    <span className="text-[#787774] text-[10.5px]">
                      ({(hoveredPoint || data.find(d => d.date === selectedDate))?.extraNote})
                    </span>
                  )}
                  {onSelectDate && (
                    <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1 py-0.2 rounded">
                      点击即可联动下方报表
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[#9b9a97]">
                  <Info className="w-3 h-3" />
                  <span>点击任意日期方格可直接下钻并联动下方报表；虚线边框为今日</span>
                </div>
              )}
            </div>

            {/* 5 级色阶图例 (Legend) */}
            <div className="flex items-center gap-1.5 text-[10px] text-[#787774] shrink-0 font-mono">
              <span>{legendLabels[0]}</span>
              <div className="flex items-center gap-0.5">
                {themeStyle.levelColors.map((colorClass, idx) => (
                  <span 
                    key={idx} 
                    className={`w-2.5 h-2.5 rounded-[1.5px] border ${colorClass.split(' ')[0]} ${colorClass.split(' ')[2]}`} 
                    title={`${legendLabels[idx] || `Level ${idx}`}`}
                  />
                ))}
              </div>
              <span>{legendLabels[4]}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
