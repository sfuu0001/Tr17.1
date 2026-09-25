/* ============================================================================
 * DateRangeFilter —— 通用时间区间筛选胶囊条 (2026-09-16)
 * ----------------------------------------------------------------------------
 * 预设档（今日/昨日/近7天/近30天/本月）+ 自定义起止（datetime-local，精确到分钟）。
 * 视觉与 019 子头胶囊体系统一（rounded-full / 黑底激活 / 白底描边未激活）。
 * 受控组件：value = DateFilterState，onChange 回传完整状态。
 * ============================================================================*/
import React from 'react';
import { CalendarDays, X } from 'lucide-react';
import {
  DateFilterState,
  DATE_RANGE_PRESETS,
  DateRangePreset
} from '../../utils/dateFilter';

interface DateRangeFilterProps {
  value: DateFilterState;
  onChange: (next: DateFilterState) => void;
  /** 紧凑模式（嵌在小标题行时使用） */
  compact?: boolean;
  className?: string;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  compact = false,
  className = ''
}) => {
  const selectPreset = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      // 切到自定义时若无数值，预填今日零点 ~ 现在，减少空白态
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      onChange({
        preset: 'custom',
        customStart: value.customStart || `${today}T00:00`,
        customEnd: value.customEnd || `${today}T${pad(now.getHours())}:${pad(now.getMinutes())}`
      });
      return;
    }
    onChange({ ...value, preset });
  };

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      <span
        className={`flex items-center gap-1 text-[#787774] shrink-0 ${compact ? 'text-[10px]' : 'text-[11px]'} font-bold`}
        title="按日期/时间段筛选"
      >
        <CalendarDays className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">时间</span>
      </span>
      {DATE_RANGE_PRESETS.map((p) => {
        const isSelected = value.preset === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => selectPreset(p.value)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
              isSelected
                ? 'bg-[#201f1d] text-white border-[#201f1d] shadow-xs'
                : 'bg-white text-[#5a5854] border-[#e6e6e4] hover:border-[#d3d1cb] hover:text-[#201f1d]'
            }`}
          >
            {p.label}
          </button>
        );
      })}
      {value.preset === 'custom' && (
        <span className="flex items-center gap-1 shrink-0">
          <input
            type="datetime-local"
            value={value.customStart || ''}
            onChange={(e) => onChange({ ...value, customStart: e.target.value })}
            className="px-1.5 py-1 rounded-full border border-[#e6e6e4] bg-white text-[10.5px] font-mono text-[#37352f] cursor-pointer"
            title="起始时间"
          />
          <span className="text-[#d3d1cb] text-[10px]">至</span>
          <input
            type="datetime-local"
            value={value.customEnd || ''}
            onChange={(e) => onChange({ ...value, customEnd: e.target.value })}
            className="px-1.5 py-1 rounded-full border border-[#e6e6e4] bg-white text-[10.5px] font-mono text-[#37352f] cursor-pointer"
            title="结束时间"
          />
          {(value.customStart || value.customEnd) && (
            <button
              type="button"
              onClick={() => onChange({ preset: 'all', customStart: undefined, customEnd: undefined })}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[#787774] hover:text-[#201f1d] hover:bg-[#efefed] cursor-pointer shrink-0"
              title="清空自定义时间"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      )}
    </div>
  );
};
