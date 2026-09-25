import React, { useState, useEffect, useRef } from 'react';
import { 
  Command, 
  Search, 
  ArrowRight, 
  CornerDownLeft, 
  Sparkles, 
  BarChart3, 
  CreditCard, 
  RotateCcw, 
  Shield, 
  UtensilsCrossed, 
  MapPin, 
  Cloud, 
  Sliders,
  CheckCircle2,
  X
} from 'lucide-react';
import { audioHaptics } from '../../utils/audioHaptics';

export interface CommandItem {
  id: string;
  title: string;
  category: '商户中枢' | '快捷操作' | '系统设置';
  shortcut?: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

interface GlobalTacticalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string) => void;
  showToast?: (msg: string) => void;
}

export const GlobalTacticalCommandPalette: React.FC<GlobalTacticalCommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  showToast
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const COMMANDS: CommandItem[] = [
    {
      id: 'analytics',
      title: '营业营收与客流打卡大屏 (Analytics & Heatmap)',
      category: '商户中枢',
      shortcut: 'yys',
      keywords: ['营收', '业绩', '营业额', '客流', '热力', 'gmv', 'analytics'],
      icon: BarChart3,
      action: () => {
        onNavigateTab('analytics');
        showToast?.('已跳转至营业分析大屏');
      }
    },
    {
      id: 'payment',
      title: '全渠道资金归集与聚合收款 (Payment Channels)',
      category: '商户中枢',
      shortcut: 'pos',
      keywords: ['支付', '微信', '支付宝', '通道', 'pos', '对账', '收款'],
      icon: CreditCard,
      action: () => {
        onNavigateTab('payment');
        showToast?.('已跳转至支付渠道与对账');
      }
    },
    {
      id: 'shift_refund',
      title: '收银交接班与钱箱退款中心 (Shift & Cash Drawer)',
      category: '商户中枢',
      shortcut: 'jjb',
      keywords: ['交接班', '收银', '钱箱', '平账', '退款', '长短款', 'shift'],
      icon: RotateCcw,
      action: () => {
        onNavigateTab('shift_refund');
        showToast?.('已跳转至交接班与退款中心');
      }
    },
    {
      id: 'audit',
      title: '关键操作风控审计与离线队列 (Audit Logs & Outbox)',
      category: '商户中枢',
      shortcut: 'audit',
      keywords: ['审计', '风控', '删单', '改价', '离线', 'outbox', '日志'],
      icon: Shield,
      action: () => {
        onNavigateTab('audit');
        showToast?.('已跳转至核心审计日志');
      }
    },
    {
      id: 'menu',
      title: '菜品物料与渠道上架管理 (Menu & Ingredients)',
      category: '商户中枢',
      shortcut: 'menu',
      keywords: ['菜品', '菜单', '羊肉串', '物料', '估清', 'sku'],
      icon: UtensilsCrossed,
      action: () => {
        onNavigateTab('menu');
        showToast?.('已跳转至菜品管理');
      }
    },
    {
      id: 'stall_gps',
      title: '车载 GPS 轨迹与营运摊位报备 (Stall & Truck GPS)',
      category: '商户中枢',
      shortcut: 'gps',
      keywords: ['定位', 'gps', '摊位', '餐车', '雷达', '报备'],
      icon: MapPin,
      action: () => {
        onNavigateTab('stall_gps');
        showToast?.('已跳转至餐车雷达定位');
      }
    },
    {
      id: 'cloud_sync',
      title: '腾讯云 CloudBase 同步与灾备 (CloudBase Sync & Export)',
      category: '系统设置',
      shortcut: 'cloud',
      keywords: ['云端', '同步', '导出', 'tcb', '备份', 'cos'],
      icon: Cloud,
      action: () => {
        onNavigateTab('cloud_sync');
        showToast?.('已跳转至云端同步与灾备');
      }
    }
  ];

  const filtered = COMMANDS.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q)) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      audioHaptics.playMicroClick();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      audioHaptics.playMicroClick();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
      audioHaptics.playMicroClick();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        audioHaptics.playMechanicalLatch();
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-fade-in select-none">
      <div 
        className="w-full max-w-xl bg-white rounded-lg border border-[#e6e6e4] shadow-2xl overflow-hidden text-[#37352f] flex flex-col font-sans"
        onKeyDown={handleKeyDown}
      >
        {/* 顶部搜索框 */}
        <div className="p-3.5 border-b border-[#efefed] flex items-center gap-3 bg-[#fafaf9]">
          <Search className="w-4 h-4 text-[#787774] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入拼音首字母(yys/jjb/pos)或功能关键字穿梭..."
            className="w-full bg-transparent text-sm outline-hidden placeholder-[#9b9a97] font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[#9b9a97] hover:text-[#37352f] p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] font-mono text-[#787774] bg-[#f1f1ef] px-1.5 py-0.5 rounded border border-[#e6e6e4] shrink-0">
            ESC 退出
          </span>
        </div>

        {/* 结果列表 */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 divide-y divide-[#f7f7f5]">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#9b9a97] space-y-1">
              <Command className="w-6 h-6 mx-auto text-[#d4d4d0] stroke-[1.5]" />
              <p>未找到匹配的功能命令</p>
              <p className="text-[10.5px]">尝试输入: 营收 / 支付 / 交班 / 审计 / 菜品</p>
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    audioHaptics.playMechanicalLatch();
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => {
                    setSelectedIndex(idx);
                    audioHaptics.playMicroClick();
                  }}
                  className={`px-3 py-2.5 rounded-[4px] flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#edf6f1] text-[#2b593f] font-semibold'
                      : 'hover:bg-[#f7f7f5] text-[#37352f]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-[3px] flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#2b593f] text-white shadow-2xs' : 'bg-[#f1f1ef] text-[#787774]'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="block truncate">{cmd.title}</span>
                      <span className="text-[10px] text-[#787774] font-normal font-mono">
                        分类: {cmd.category} · 快捷码: {cmd.shortcut}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {cmd.shortcut && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#f1f1ef] text-[#787774] border border-[#e6e6e4]">
                        {cmd.shortcut}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-[#2b593f] ml-1" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部按键提示栏 */}
        <div className="p-2.5 bg-[#f7f7f5] border-t border-[#efefed] flex items-center justify-between text-[11px] text-[#787774] font-mono px-3">
          <div className="flex items-center gap-3">
            <span>↑↓ 切换选择</span>
            <span>↵ 确认跳转</span>
          </div>
          <span className="text-[10.5px]">Urban Radar 机电指令控制台 · 键盘流</span>
        </div>
      </div>
    </div>
  );
};
