import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Search, LucideIcon } from 'lucide-react';

export interface BeautifiedDropdownItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  iconBgColor?: string;
  iconColor?: string;
  badge?: {
    text: string;
    variant?: 'emerald' | 'rose' | 'amber' | 'purple' | 'neutral' | 'blue';
    pulse?: boolean;
  };
  disabled?: boolean;
  group?: string;
  metadata?: Record<string, any>;
}

export interface BeautifiedDropdownGroup {
  name: string;
  items: BeautifiedDropdownItem[];
}

export interface BeautifiedDropdownMenuProps {
  items: BeautifiedDropdownItem[];
  value?: string;
  onChange: (id: string, item: BeautifiedDropdownItem) => void;
  triggerLabel?: string;
  triggerIcon?: LucideIcon | React.ComponentType<{ className?: string }>;
  triggerBadge?: string;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  headerTitle?: string;
  headerAction?: ReactNode;
  footerContent?: ReactNode;
  align?: 'left' | 'right' | 'center';
  minWidthClass?: string;
  customTrigger?: (isOpen: boolean, selectedItem?: BeautifiedDropdownItem) => ReactNode;
  themeColor?: 'emerald' | 'rose' | 'amber' | 'purple' | 'neutral' | 'blue';
  className?: string;
}

const BADGE_STYLES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
  purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
  blue: 'bg-blue-50 text-blue-700 border-blue-200/80',
  neutral: 'bg-neutral-100 text-neutral-700 border-neutral-200/80'
};

const THEME_ACTIVE_STYLES: Record<string, { container: string; check: string }> = {
  emerald: {
    container: 'bg-emerald-50/60 border-emerald-600/30 text-emerald-950 ring-1 ring-emerald-500/15',
    check: 'text-emerald-600'
  },
  rose: {
    container: 'bg-rose-50/60 border-rose-600/30 text-rose-950 ring-1 ring-rose-500/15',
    check: 'text-rose-600'
  },
  amber: {
    container: 'bg-amber-50/60 border-amber-600/30 text-amber-950 ring-1 ring-amber-500/15',
    check: 'text-amber-600'
  },
  purple: {
    container: 'bg-purple-50/60 border-purple-600/30 text-purple-950 ring-1 ring-purple-500/15',
    check: 'text-purple-600'
  },
  blue: {
    container: 'bg-blue-50/60 border-blue-600/30 text-blue-950 ring-1 ring-blue-500/15',
    check: 'text-blue-600'
  },
  neutral: {
    container: 'bg-neutral-100/80 border-neutral-900/30 text-neutral-950 ring-1 ring-neutral-900/10',
    check: 'text-neutral-900'
  }
};

/**
 * BeautifiedDropdownMenu
 * 满足 AGENTS.md 第 7 条规范的向下拉彩单/菜单小组件金标实现：
 * - 语义化矢量图标 + 微光底槽
 * - 双层工控排版（主标题 + 解释性副标题）
 * - 状态胶囊徽标与动态指示灯
 * - 半透明高阶毛玻璃面板 (backdrop-blur-xl)
 * - 16px 输入防缩放防御 (Zero Auto-Zoom)
 * - AnimatePresence 物理级微弹展启动效
 */
export const BeautifiedDropdownMenu: React.FC<BeautifiedDropdownMenuProps> = ({
  items,
  value,
  onChange,
  triggerLabel,
  triggerIcon: TriggerIcon,
  triggerBadge,
  placeholder = '请选择选项',
  searchable = false,
  searchPlaceholder = '搜索内容...',
  headerTitle,
  headerAction,
  footerContent,
  align = 'left',
  minWidthClass = 'w-72 sm:w-80',
  customTrigger,
  themeColor = 'emerald',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedItem = items.find((i) => i.id === value);

  // Close when clicked outside
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus search input when open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus({ preventScroll: true });
    }
  }, [isOpen, searchable]);

  // Filter items
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      (item.sublabel && item.sublabel.toLowerCase().includes(q)) ||
      (item.badge && item.badge.text.toLowerCase().includes(q))
    );
  });

  // Group items if any group is specified
  const groupedItems = filteredItems.reduce<Record<string, BeautifiedDropdownItem[]>>((acc, item) => {
    const group = item.group || 'default';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  const hasGroups = Object.keys(groupedItems).some((g) => g !== 'default');
  const activeTheme = THEME_ACTIVE_STYLES[themeColor] || THEME_ACTIVE_STYLES.emerald;

  const handleSelectItem = (item: BeautifiedDropdownItem) => {
    if (item.disabled) return;
    onChange(item.id, item);
    setIsOpen(false);
    setSearchQuery('');
  };

  const alignClass =
    align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0';

  return (
    <div ref={menuRef} className={`relative inline-block text-left ${className}`}>
      {/* 1. Trigger Controller */}
      {customTrigger ? (
        customTrigger(isOpen, selectedItem)
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          style={{ touchAction: 'manipulation' }}
          className={`h-8 px-3.5 rounded-full flex items-center gap-2 text-[11.5px] font-bold transition-all cursor-pointer select-none border shadow-2xs whitespace-nowrap ${
            isOpen || selectedItem
              ? 'bg-white text-neutral-900 border-neutral-900/40 ring-1.5 ring-neutral-900/10'
              : 'bg-white text-neutral-600 border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {TriggerIcon ? (
            <TriggerIcon className="w-3.5 h-3.5 shrink-0 text-neutral-700" />
          ) : selectedItem?.icon ? (
            <selectedItem.icon className="w-3.5 h-3.5 shrink-0 text-neutral-700" />
          ) : null}

          <span className="truncate max-w-[140px] sm:max-w-[180px]">
            {triggerLabel || selectedItem?.label || placeholder}
          </span>

          {(triggerBadge || selectedItem?.badge?.text) && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border leading-none shrink-0 ${
                BADGE_STYLES[selectedItem?.badge?.variant || 'emerald']
              }`}
            >
              {triggerBadge || selectedItem?.badge?.text}
            </span>
          )}

          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 text-neutral-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-neutral-800' : ''
            }`}
          />
        </button>
      )}

      {/* 2. Beautified Dropdown Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className={`absolute top-full mt-1.5 ${alignClass} ${minWidthClass} max-h-[380px] flex flex-col rounded-xl backdrop-blur-xl bg-white/95 border border-neutral-200/90 shadow-2xl shadow-neutral-950/12 p-1.5 z-50 overflow-hidden`}
            role="listbox"
          >
            {/* Optional Header */}
            {(headerTitle || headerAction) && (
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-neutral-100/90 mb-1">
                {headerTitle && (
                  <span className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-wider">
                    {headerTitle}
                  </span>
                )}
                {headerAction}
              </div>
            )}

            {/* Optional Search Bar with 16px font defense */}
            {searchable && (
              <div className="px-1.5 pb-1.5 border-b border-neutral-100/90 mb-1">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-neutral-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    style={{ fontSize: '16px', touchAction: 'manipulation' }}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-neutral-50/80 border border-neutral-200/80 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 md:text-xs"
                  />
                </div>
              </div>
            )}

            {/* Item List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
              {filteredItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-400">
                  暂无匹配的选项内容
                </div>
              ) : hasGroups ? (
                Object.entries(groupedItems).map(([groupName, groupList]) => (
                  <div key={groupName} className="space-y-1">
                    {groupName !== 'default' && (
                      <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        {groupName}
                      </div>
                    )}
                    {groupList.map((item) => renderItemRow(item))}
                  </div>
                ))
              ) : (
                filteredItems.map((item) => renderItemRow(item))
              )}
            </div>

            {/* Optional Footer */}
            {footerContent && (
              <div className="pt-1.5 mt-1 border-t border-neutral-100/90 px-1">
                {footerContent}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  function renderItemRow(item: BeautifiedDropdownItem) {
    const isSelected = item.id === value;
    const ItemIcon = item.icon;
    const badgeVariant = item.badge?.variant || 'emerald';

    return (
      <button
        key={item.id}
        type="button"
        disabled={item.disabled}
        onClick={() => handleSelectItem(item)}
        style={{ touchAction: 'manipulation' }}
        className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer border ${
          item.disabled
            ? 'opacity-40 cursor-not-allowed bg-transparent border-transparent'
            : isSelected
            ? `${activeTheme.container}`
            : 'bg-transparent border-transparent hover:bg-neutral-50/90 hover:border-neutral-200/60'
        }`}
        role="option"
        aria-selected={isSelected}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Icon in Light Emitting Capsule Slot */}
          {ItemIcon && (
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                item.iconBgColor
                  ? item.iconBgColor
                  : isSelected
                  ? 'bg-white shadow-2xs text-neutral-900'
                  : 'bg-neutral-100/80 text-neutral-600'
              }`}
            >
              <ItemIcon className={`w-4 h-4 ${item.iconColor || ''}`} />
            </div>
          )}

          {/* Two-Tier Typography */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs truncate ${
                  isSelected ? 'font-black text-neutral-950' : 'font-bold text-neutral-800'
                }`}
              >
                {item.label}
              </span>

              {/* Dynamic Badge */}
              {item.badge && (
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 text-[9.5px] font-bold rounded-full border leading-none shrink-0 ${
                    BADGE_STYLES[badgeVariant]
                  }`}
                >
                  {item.badge.pulse && (
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  )}
                  {item.badge.text}
                </span>
              )}
            </div>

            {/* Explanatory Subtitle / Working Condition */}
            {item.sublabel && (
              <p
                className={`text-[10.5px] truncate mt-0.5 leading-tight ${
                  isSelected ? 'text-neutral-600' : 'text-neutral-400'
                }`}
              >
                {item.sublabel}
              </p>
            )}
          </div>
        </div>

        {/* Selected Checkmark Indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="shrink-0 pl-1"
          >
            <Check className={`w-4 h-4 ${activeTheme.check}`} />
          </motion.div>
        )}
      </button>
    );
  }
};
