import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shuffle, Check, ChevronRight, Sparkles, MapPin } from 'lucide-react';
import { BoundTableInfo } from '../../types';

interface TableQuickSwitchWidgetProps {
  currentTable: string;
  onSelectTable: (tableCode: string) => void;
  onOpenFullMatrix?: () => void;
  showToast?: (title: string, desc?: string) => void;
}

const PRESET_TABLES = [
  { code: 'A1', label: 'A1 窗景席', guests: 2, zone: '外场窗边' },
  { code: 'A2', label: 'A2 双人座', guests: 2, zone: '外场中庭' },
  { code: 'A3', label: 'A3 四人桌', guests: 4, zone: '大厅中央' },
  { code: 'B1', label: 'B1 吧台席', guests: 1, zone: '餐车前吧' },
  { code: 'B2', label: 'B2 露天席', guests: 4, zone: '户外花园' },
  { code: 'C1', label: 'C1 聚会座', guests: 6, zone: '聚会卡座' }
];

export const TableQuickSwitchWidget: React.FC<TableQuickSwitchWidgetProps> = ({
  currentTable = 'A1',
  onSelectTable,
  onOpenFullMatrix,
  showToast
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleQuickSwitch = (targetCode: string) => {
    if (targetCode === currentTable) return;
    onSelectTable(targetCode);
    showToast?.(`已极速换桌至 ${targetCode} 号桌`, '堂食点单与传菜目标已即时切换');
    setIsExpanded(false);
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Capsule trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white hover:bg-neutral-50 active:scale-95 text-neutral-800 border border-neutral-200 shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
        title="换桌小组件"
      >
        <Shuffle className="w-3 h-3 text-orange-600" />
        <span className="font-mono">换桌</span>
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
      </button>

      {/* Expanded Quick Switch Panel */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setIsExpanded(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ duration: 0.16 }}
              className="absolute top-full left-0 mt-1.5 z-[70] w-64 max-w-[calc(100vw-2.5rem)] p-3 bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200 shadow-xl origin-top-left"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
                <span className="text-[11px] font-bold text-neutral-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-orange-500" />
                  极速换桌小组件
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  当前: {currentTable}号桌
                </span>
              </div>

              {/* Quick Table Grid */}
              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                {PRESET_TABLES.map((table) => {
                  const isCurrent = table.code === currentTable;
                  return (
                    <button
                      key={table.code}
                      type="button"
                      onClick={() => handleQuickSwitch(table.code)}
                      className={`p-1.5 rounded-xl border text-center transition cursor-pointer ${
                        isCurrent
                          ? 'border-orange-500 bg-orange-50/90 text-orange-800 font-bold shadow-2xs'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-medium'
                      }`}
                    >
                      <div className="text-xs font-mono font-bold leading-none">
                        {table.code}
                      </div>
                      <div className="text-[9.5px] text-neutral-500 mt-0.5 truncate">
                        {table.guests}人席
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Full Matrix Entry */}
              {onOpenFullMatrix && (
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onOpenFullMatrix();
                  }}
                  className="w-full py-1.5 px-2 rounded-xl text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center space-x-1 transition cursor-pointer"
                >
                  <span>打开全景桌台选座矩阵</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TableQuickSwitchWidget;
