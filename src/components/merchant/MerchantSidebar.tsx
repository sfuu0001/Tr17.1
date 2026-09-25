import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  ChevronDown,
  LayoutGrid,
  Truck,
  PanelLeftClose,
  PanelLeft,
  Lock,
  ChevronUp,
  ChevronsUpDown,
  MoveVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MerchantTab } from './MerchantSystemView';
import { canAccessMerchantTab } from '../../utils/rbacEngine';
import { MerchantSession } from '../../utils/staffAndRiderAuthEngine';

export interface TabItemConfig {
  id: MerchantTab;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeAlert?: boolean;
}

interface MerchantSidebarProps {
  activeTab: MerchantTab;
  onSelectTab: (tab: MerchantTab) => void;
  tabsConfig: TabItemConfig[];
  categories: string[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  truckName?: string;
  merchantSession?: MerchantSession | null;
}

const CATEGORY_STYLES: Record<string, { dot: string; text: string; bg: string; badge: string }> = {
  '核心运营': { dot: 'bg-emerald-500', text: 'text-emerald-800', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800' },
  '菜品与库存': { dot: 'bg-amber-500', text: 'text-amber-800', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800' },
  '财务与数据': { dot: 'bg-blue-500', text: 'text-blue-800', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800' },
  '营销会员': { dot: 'bg-purple-500', text: 'text-purple-800', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-800' },
  '门店与位置': { dot: 'bg-orange-500', text: 'text-orange-800', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-800' },
  '系统团队与硬件': { dot: 'bg-slate-500', text: 'text-slate-800', bg: 'bg-slate-50', badge: 'bg-slate-100 text-slate-800' },
};

export const MerchantSidebar: React.FC<MerchantSidebarProps> = ({
  activeTab,
  onSelectTab,
  tabsConfig,
  categories,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
  truckName,
  merchantSession
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Scroll Container Ref and Active Item Ref for automatic smooth scroll into view
  const listContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  // Scroll interaction & animation states (mouse + touch gestures)
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isScrollingActive, setIsScrollingActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollPercentage, setScrollPercentage] = useState(0);

  // Drag-to-scroll tracking refs
  const dragStartYRef = useRef(0);
  const dragStartScrollTopRef = useRef(0);
  const dragMovedRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inertiaAnimationRef = useRef<number | null>(null);
  const lastClientYRef = useRef(0);
  const velocityYRef = useRef(0);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return tabsConfig;
    const q = searchQuery.toLowerCase().trim();
    return tabsConfig.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
    );
  }, [tabsConfig, searchQuery]);

  // Flattened visible tabs in current layout order (for calculating distance-based diffusion opacity)
  const visibleFlatTabs = useMemo(() => {
    const list: string[] = [];
    categories.forEach((cat) => {
      const isCatCollapsed = !searchQuery && Boolean(collapsedCategories[cat]);
      if (!isCatCollapsed) {
        const catTabs = filteredTabs.filter((t) => t.category === cat);
        catTabs.forEach((tab) => list.push(tab.id));
      }
    });
    return list;
  }, [categories, collapsedCategories, filteredTabs, searchQuery]);

  const activeIndex = useMemo(() => {
    return visibleFlatTabs.indexOf(activeTab);
  }, [visibleFlatTabs, activeTab]);

  // Stepped diffusion opacity spreading upwards & downwards from the active highlight item
  const getItemOpacity = useCallback((tabId: string): number => {
    if (tabId === activeTab) return 1.0;
    if (activeIndex === -1) return 0.85;
    const itemIndex = visibleFlatTabs.indexOf(tabId);
    if (itemIndex === -1) return 0.70;
    const dist = Math.abs(itemIndex - activeIndex);
    switch (dist) {
      case 1:
        return 0.88;
      case 2:
        return 0.72;
      case 3:
        return 0.56;
      case 4:
        return 0.42;
      default:
        return 0.30;
    }
  }, [activeTab, activeIndex, visibleFlatTabs]);

  const activeTabConfig = useMemo(() => {
    return tabsConfig.find((t) => t.id === activeTab) || tabsConfig[0];
  }, [tabsConfig, activeTab]);

  const totalUrgentBadges = useMemo(() => {
    return tabsConfig
      .filter((t) => t.badgeAlert && t.badge && t.badge > 0)
      .reduce((sum, t) => sum + (t.badge || 0), 0);
  }, [tabsConfig]);

  // Update scroll boundaries & indicators
  const updateScrollState = useCallback(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanScrollUp(scrollTop > 4);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 6);
    const maxScroll = scrollHeight - clientHeight;
    setScrollPercentage(maxScroll > 0 ? Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100)) : 0);
  }, []);

  // Handle Scroll Event (Both Mousewheel and Touch)
  const handleScroll = useCallback(() => {
    updateScrollState();
    setIsScrollingActive(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrollingActive(false);
    }, 600);
  }, [updateScrollState]);

  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => {
      window.removeEventListener('resize', updateScrollState);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (inertiaAnimationRef.current) cancelAnimationFrame(inertiaAnimationRef.current);
    };
  }, [updateScrollState, filteredTabs, collapsedCategories]);

  // Smooth scroll active capsule into view on tab change
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeTab]);

  // Mouse Drag-to-Scroll Handlers with Inertia Kinetic Animation
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary left click
    const el = listContainerRef.current;
    if (!el) return;

    // Check if clicking on an input
    const target = e.target as HTMLElement;
    if (target.closest('input') || target.closest('select')) return;

    if (inertiaAnimationRef.current) {
      cancelAnimationFrame(inertiaAnimationRef.current);
      inertiaAnimationRef.current = null;
    }

    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartScrollTopRef.current = el.scrollTop;
    lastClientYRef.current = e.clientY;
    velocityYRef.current = 0;
    dragMovedRef.current = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - dragStartYRef.current;
      if (Math.abs(delta) > 4) {
        dragMovedRef.current = true;
      }
      velocityYRef.current = moveEvent.clientY - lastClientYRef.current;
      lastClientYRef.current = moveEvent.clientY;

      if (listContainerRef.current) {
        listContainerRef.current.scrollTop = dragStartScrollTopRef.current - delta;
      }
      setIsScrollingActive(true);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      // Inertia Glide Kinetic Animation
      if (Math.abs(velocityYRef.current) > 1.5 && listContainerRef.current) {
        let currentVelocity = velocityYRef.current * 1.5;
        const glide = () => {
          if (!listContainerRef.current || Math.abs(currentVelocity) < 0.3) {
            inertiaAnimationRef.current = null;
            setIsScrollingActive(false);
            return;
          }
          listContainerRef.current.scrollTop -= currentVelocity;
          currentVelocity *= 0.92; // Damping decay
          inertiaAnimationRef.current = requestAnimationFrame(glide);
        };
        inertiaAnimationRef.current = requestAnimationFrame(glide);
      } else {
        setTimeout(() => {
          dragMovedRef.current = false;
          setIsScrollingActive(false);
        }, 80);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Quick Smooth Scroll Buttons
  const scrollSmoothBy = (direction: 'up' | 'down') => {
    if (!listContainerRef.current) return;
    const delta = direction === 'up' ? -180 : 180;
    listContainerRef.current.scrollBy({ top: delta, behavior: 'smooth' });
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#ffffff] text-[#37352f] select-none font-sans overflow-hidden relative">
      {/* 1. Sidebar Header / Title bar */}
      <div className="p-2.5 sm:p-3 border-b border-[#e6e6e4] flex items-center justify-between bg-[#fafaf9] gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-[4px] bg-[#201f1d] text-white flex items-center justify-center text-xs shrink-0 shadow-2xs">
            <LayoutGrid className="w-4 h-4 text-emerald-400" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-normal text-xs text-[#201f1d] tracking-tight">功能导航</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#efefed] text-[#5a5854] rounded-full font-normal">
                  {tabsConfig.length}模块
                </span>
              </div>
              {truckName && (
                <div className="text-[10px] text-[#787774] truncate flex items-center gap-1 mt-0.5 font-light" title={truckName}>
                  <Truck className="w-3 h-3 text-[#2b593f] shrink-0" />
                  <span className="truncate max-w-[88px] xl:max-w-[100px] font-light">{truckName}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Collapse Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 hover:bg-[#efefed] rounded-[2px] text-[#787774] hover:text-[#201f1d] transition-all cursor-pointer items-center justify-center border border-transparent hover:border-[#e6e6e4]"
          title={isCollapsed ? '展开完整侧边栏' : '收起为精简图标栏'}
        >
          {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden p-1.5 hover:bg-[#efefed] rounded-[2px] text-[#787774] hover:text-[#201f1d] transition-all cursor-pointer items-center justify-center"
          title="关闭导航栏"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Search & Filter Bar (Only when expanded) */}
      {!isCollapsed && (
        <div className="p-2 border-b border-[#efefed] bg-[#ffffff] shrink-0">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#9b9a97] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索功能模块..."
              className="w-full pl-7.5 pr-6 py-1 bg-[#f7f7f5] hover:bg-[#efefed] focus:bg-[#ffffff] border border-[#e6e6e4] focus:border-[#201f1d] rounded-[2px] text-xs font-normal text-[#201f1d] placeholder:text-[#9b9a97] placeholder:font-light outline-none transition-all"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-[#9b9a97] hover:text-[#201f1d] p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="absolute right-2 text-[10px] font-mono text-[#b0afa9] bg-[#efefed] px-1 py-0.2 rounded-[2px] border border-[#e0dfdb] pointer-events-none font-light">
                /
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Navigation List Container with Interactive Drag & Touch Scroll Physics + Animations */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {/* Top Fade Edge with Micro Scroll-Up Animated Arrow */}
        <AnimatePresence>
          {canScrollUp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => scrollSmoothBy('up')}
              className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white via-white/80 to-transparent z-20 flex items-center justify-center cursor-pointer pointer-events-auto hover:h-7 transition-all group"
              title="点击平滑上滚"
            >
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="w-5 h-3.5 rounded-full bg-neutral-100/90 border border-neutral-300/80 shadow-2xs flex items-center justify-center group-hover:bg-white"
              >
                <ChevronUp className="w-3 h-3 text-neutral-600" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Items Container */}
        <div
          ref={listContainerRef}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          className={`h-full overflow-y-auto overflow-x-hidden p-1.5 space-y-2.5 custom-scrollbar touch-pan-y transition-colors ${
            isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
          }`}
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth'
          }}
        >
          {categories.map((cat) => {
            const catTabs = filteredTabs.filter((t) => t.category === cat);
            if (catTabs.length === 0) return null;
            const isCatCollapsed = !searchQuery && Boolean(collapsedCategories[cat]);
            const catStyle = CATEGORY_STYLES[cat] || { dot: 'bg-neutral-400', text: 'text-neutral-700', bg: 'bg-neutral-100', badge: 'bg-neutral-100 text-neutral-700' };

            return (
              <div key={cat} className="space-y-0.5">
                {/* Category Header */}
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`w-full px-2 py-1 flex items-center justify-between text-[11px] font-normal ${catStyle.text} rounded-[4px] transition-all cursor-pointer group tracking-tight hover:bg-neutral-100/60`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                      <span className="font-normal">{cat}</span>
                      <span className="text-[10px] font-mono font-light opacity-70">({catTabs.length})</span>
                    </div>
                    <ChevronDown
                      className={`w-3 h-3 text-[#9b9a97] group-hover:text-[#201f1d] transition-transform duration-150 ${
                        isCatCollapsed ? '-rotate-90' : ''
                      }`}
                    />
                  </button>
                ) : (
                  <div className="w-full border-t border-[#e6e6e4] my-2 pt-1 flex flex-col items-center">
                    <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot} mb-0.5`} />
                    <span className="text-[9px] text-[#9b9a97] text-center font-normal truncate">
                      {cat.slice(0, 2)}
                    </span>
                  </div>
                )}

                {/* Category Tab Items */}
                {!isCatCollapsed && (
                  <div className="space-y-0.5">
                    {catTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isSelected = activeTab === tab.id;
                      const itemOpacity = getItemOpacity(tab.id);

                      if (isCollapsed) {
                        // Compact Icon-only mode: Capsule outline with thin black line & diffusion opacity
                        return (
                          <div
                            key={tab.id}
                            className="w-full flex items-center justify-center py-0.5 transition-opacity duration-200 ease-out hover:!opacity-100"
                            style={{ opacity: isSelected ? 1 : itemOpacity }}
                          >
                            <button
                              ref={isSelected ? activeItemRef : null}
                              type="button"
                              onClick={() => {
                                if (dragMovedRef.current) return;
                                onSelectTab(tab.id);
                                onCloseMobile();
                              }}
                              title={`${tab.label} · ${tab.category}`}
                              className={`w-9 h-9 rounded-full flex items-center justify-center relative transition-all cursor-pointer select-none ${
                                isSelected
                                  ? 'border border-[#1a1918] bg-white text-[#1a1918] shadow-2xs'
                                  : 'border border-transparent text-[#6a6864] hover:border-[#e6e6e4] hover:bg-[#efefed] hover:text-[#1a1918]'
                              }`}
                            >
                              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#1a1918]' : 'text-[#6a6864]'}`} />
                              {isSelected && (
                                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-emerald-500" />
                              )}
                              {tab.badge !== undefined && tab.badge > 0 && (
                                <span
                                  className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                                    tab.badgeAlert ? 'bg-rose-500 animate-pulse' : 'bg-emerald-600'
                                  }`}
                                />
                              )}
                            </button>
                          </div>
                        );
                      }

                      // Full Mode: Non-full-width capsule outline button wrapping text, black thin border & diffusion opacity
                      const accessCheck = canAccessMerchantTab(tab.id, merchantSession);
                      const isRestricted = !accessCheck.allowed;

                      return (
                        <div
                          key={tab.id}
                          className="w-full flex items-center justify-between py-0.5 px-0.5 group transition-opacity duration-200 ease-out hover:!opacity-100"
                          style={{ opacity: isSelected ? 1 : itemOpacity }}
                        >
                          {/* Snug Capsule Pill Button: Wraps Icon & Text, black thin border when selected */}
                          <button
                            ref={isSelected ? activeItemRef : null}
                            type="button"
                            onClick={() => {
                              if (dragMovedRef.current) return;
                              onSelectTab(tab.id);
                              onCloseMobile();
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-150 cursor-pointer select-none max-w-[calc(100%-24px)] text-left ${
                              isSelected
                                ? 'border border-neutral-900 bg-white text-neutral-900 font-bold shadow-xs'
                                : isRestricted
                                ? 'border border-transparent text-neutral-400 hover:border-neutral-200 hover:bg-neutral-100/60 hover:text-neutral-600 font-normal'
                                : 'border border-transparent text-neutral-600 hover:border-neutral-200 hover:bg-neutral-100/80 hover:text-neutral-900 font-medium'
                            }`}
                            title={`${tab.label} · ${tab.category}`}
                          >
                            <Icon
                              className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                                isSelected
                                  ? 'text-neutral-900'
                                  : isRestricted
                                  ? 'text-neutral-400'
                                  : 'text-neutral-500'
                              }`}
                            />
                            <span className="truncate tracking-tight">
                              {tab.label}
                            </span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                            )}
                          </button>

                          {/* Right Badges & Indicators */}
                          <div className="flex items-center gap-1 shrink-0 pl-1">
                            {isRestricted && (
                              <span
                                title="岗位受限: 需更高权限或店长临时放行"
                                className="p-0.5 rounded-full text-amber-600 bg-amber-50 border border-amber-200/60 shrink-0"
                              >
                                <Lock className="w-2.5 h-2.5" />
                              </span>
                            )}
                            {tab.badge !== undefined && tab.badge > 0 && (
                              <span
                                className={`text-[9.5px] font-mono font-normal px-1.5 py-0.2 rounded-full border shrink-0 ${
                                  isSelected
                                    ? 'bg-neutral-100 text-[#1a1918] border-neutral-300'
                                    : tab.badgeAlert
                                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                                    : 'bg-[#f1f1ef] text-[#5c5a54] border-transparent'
                                }`}
                              >
                                {tab.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredTabs.length === 0 && (
            <div className="p-4 text-center text-xs font-light text-[#9b9a97]">
              未找到匹配「{searchQuery}」的功能模块
            </div>
          )}
        </div>

        {/* Bottom Fade Edge with Micro Scroll-Down Animated Arrow */}
        <AnimatePresence>
          {canScrollDown && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => scrollSmoothBy('down')}
              className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white via-white/80 to-transparent z-20 flex items-center justify-center cursor-pointer pointer-events-auto hover:h-7 transition-all group"
              title="点击平滑下滚"
            >
              <motion.div
                animate={{ y: [0, 2, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="w-5 h-3.5 rounded-full bg-neutral-100/90 border border-neutral-300/80 shadow-2xs flex items-center justify-center group-hover:bg-white"
              >
                <ChevronDown className="w-3 h-3 text-neutral-600" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Animated Scroll Progress Pill on Right Edge */}
        <AnimatePresence>
          {(isScrollingActive || isDragging) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="absolute right-1 top-2 bottom-2 w-1 bg-neutral-100 rounded-full overflow-hidden pointer-events-none z-30"
            >
              <motion.div
                className="w-full bg-[#1a1918] rounded-full transition-all duration-75"
                style={{
                  height: '24%',
                  transform: `translateY(${(scrollPercentage / 100) * (100 - 24)}%)`
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Sidebar Footer - Current Active State Summary & Collapse trigger */}
      <div className="p-2.5 border-t border-[#e6e6e4] bg-[#fafaf9] shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-[11px] text-[#787774]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate font-normal text-[#201f1d]">
                {activeTabConfig.label}
              </span>
            </div>
            {totalUrgentBadges > 0 && (
              <span className="bg-rose-50 text-rose-600 border border-rose-200 font-normal text-[10px] px-1.5 py-0.2 rounded-[2px] font-mono shrink-0">
                {totalUrgentBadges} 待处理
              </span>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1 hover:bg-[#efefed] rounded-[2px] text-[#787774] hover:text-[#201f1d] cursor-pointer"
              title="展开完整侧边栏"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Full-height column) */}
      <aside
        className={`hidden md:flex flex-col shrink-0 h-full z-30 transition-all duration-200 border-r border-[#e6e6e4] bg-white ${
          isCollapsed ? 'w-16' : 'w-[216px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          {/* Slide-out Drawer */}
          <div className="relative w-[216px] max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200 bg-white">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
