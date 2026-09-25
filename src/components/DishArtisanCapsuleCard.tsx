import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  X,
  Sparkles,
  Thermometer,
  Clock,
  Scale,
  Flame,
  ShieldCheck,
  Compass,
  ArrowUpRight
} from 'lucide-react';
import { DishItem } from '../types';

// ==========================================
// 1. 胶囊型菜品信息收纳开关 (Capsule Switch)
// ==========================================
export interface DishArtisanCapsuleToggleProps {
  dish: DishItem;
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
  compact?: boolean;
  className?: string;
}

export const DishArtisanCapsuleToggle: React.FC<DishArtisanCapsuleToggleProps> = ({
  dish,
  isOpen,
  onToggle,
  compact = false,
  className = ''
}) => {
  const hash = dish.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const artisanLabel = dish.artisanCode || `ARTISAN #${String((hash % 20) + 1).padStart(2, '0')}`;
  const refCodeRaw = dish.refCode
    ? dish.refCode.replace(/^·\s*/, '').replace(/^REF:\s*/, '')
    : `SK-${1000 + (hash % 1500)}`;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(e);
      }}
      title={isOpen ? '收起工匠规格卡片' : '展开工匠出餐规格与配比小卡片'}
      className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full border transition-all duration-200 cursor-pointer select-none group shadow-2xs max-w-full truncate ${
        isOpen
          ? 'bg-white border-neutral-900 ring-2 ring-black/10 shadow-xs'
          : 'bg-neutral-100/90 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-200/80 active:scale-[0.98]'
      } ${className}`}
    >
      {/* 黑色工匠编号徽标 (ARTISAN #04) */}
      <span
        className={`bg-black text-white px-1.5 py-0.5 rounded-[3px] font-sans font-bold tracking-wider leading-none shadow-xs shrink-0 group-hover:bg-neutral-800 transition-colors ${
          compact ? 'text-[7.5px] max-w-[58px] truncate' : 'text-[8.5px] sm:text-[9px]'
        }`}
      >
        {artisanLabel}
      </span>

      {/* 分隔圆点 · */}
      <span className="text-neutral-400 text-[10px] font-bold shrink-0">·</span>

      {/* 规格料号代码 (SK-2048) */}
      <span
        className={`font-sans text-neutral-600 font-semibold tracking-tight group-hover:text-black transition-colors truncate ${
          compact ? 'text-[8.5px] max-w-[62px]' : 'text-[9.5px] sm:text-[10px]'
        }`}
      >
        {refCodeRaw}
      </span>

      {/* 下拉收纳指示器 Chevron */}
      <div
        className={`flex items-center justify-center rounded-full transition-transform duration-200 shrink-0 ml-0.5 ${
          isOpen ? 'rotate-180 text-black bg-neutral-100' : 'text-neutral-400 group-hover:text-black'
        } ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`}
      >
        <ChevronDown className={compact ? 'w-2 h-2 stroke-[2.5]' : 'w-2.5 h-2.5 stroke-[2.5]'} />
      </div>
    </button>
  );
};

// ==========================================
// 2. 下拉小卡片菜品信息卡 (Dropdown Mini Card)
// ==========================================
export interface DishArtisanDropdownCardProps {
  dish: DishItem;
  isOpen: boolean;
  onClose: (e?: React.MouseEvent) => void;
  onViewBlueprint?: (dish: DishItem) => void;
  compact?: boolean;
  className?: string;
}

export const DishArtisanDropdownCard: React.FC<DishArtisanDropdownCardProps> = ({
  dish,
  isOpen,
  onClose,
  onViewBlueprint,
  compact = false,
  className = ''
}) => {
  // 获取规格份量
  const getSpecRatioLabel = () => {
    if (dish.specRatio) return dish.specRatio;
    const name = dish.name.toLowerCase();
    if (name.includes('玉棋') || name.includes('意面')) return '16G / 份';
    if (name.includes('汉堡') || name.includes('slider')) return '150G DUAL';
    if (name.includes('m9') || name.includes('和牛')) return 'M9 WAGYU';
    if (name.includes('串') || name.includes('烧鸟') || dish.category === 'skewers') return '3串入 / 黄金比';
    return '标准 1份';
  };

  // 默认风味指标
  const displayFlavorMetrics = dish.flavorMetrics && dish.flavorMetrics.length > 0
    ? dish.flavorMetrics
    : [
        { label: '炙烤焦香', score: 4, maxScore: 5 },
        { label: '鲜嫩多汁', score: 5, maxScore: 5 },
        { label: '风味层次', score: 4, maxScore: 5 }
      ];

  const hasSpecComponents = dish.specComponents && dish.specComponents.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, height: 'auto', y: 0, scale: 1 }}
          exit={{ opacity: 0, height: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className={`overflow-hidden relative z-30 my-2 ${className}`}
        >
          {/* 美化信息卡本体 (Glassmorphism + Backdrop Blur + Subtle Ambient Glow) */}
          <div
            className={`w-full rounded-xl border border-neutral-200/90 bg-white/95 backdrop-blur-md shadow-xl shadow-black/8 relative ${
              compact ? 'p-2 sm:p-2.5' : 'p-3 sm:p-3.5'
            }`}
          >
            {/* 聚焦模糊光晕背景 (Ambient Focus Glow) */}
            <div className="absolute -inset-1 bg-gradient-to-b from-neutral-900/5 via-neutral-900/3 to-transparent rounded-2xl blur-md -z-10 pointer-events-none" />

            {/* 卡片顶栏：标题、SOP认证徽标与关闭按钮 */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100/90 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                  <Flame className="w-3 h-3 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-neutral-900 tracking-tight">
                      工匠出餐规格标准
                    </span>
                    <span className="font-sans text-[8px] text-neutral-600 bg-neutral-100 px-1 py-0.2 rounded font-semibold border border-neutral-200/60">
                      SOP-SPEC
                    </span>
                  </div>
                  <p className="text-[8px] font-sans text-neutral-400 uppercase tracking-wider truncate">
                    {dish.enName || 'ARTISAN CRAFT & SPECIFICATION'}
                  </p>
                </div>
              </div>

              {/* 右侧：关闭收起按钮 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(e);
                }}
                className="w-5 h-5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="收起小卡片"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* 核心规格参数四宫格 (2x2 Micro Spec Grid) */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 my-2 sm:my-2.5">
              {/* 1. 核心温控 */}
              <div className="bg-neutral-50/80 rounded-lg p-2 border border-neutral-150/70 flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-500 text-[9px] mb-0.5">
                  <span className="flex items-center gap-1">
                    <Thermometer className="w-2.5 h-2.5 text-red-500" />
                    温控标准
                  </span>
                  <span className="text-[8px] font-sans font-medium text-neutral-400">CORE</span>
                </div>
                <div className="font-sans text-[11px] sm:text-xs font-bold text-neutral-900 leading-tight">
                  {dish.coreTemp || 'TEMP 56°C'}
                </div>
                <div className="text-[8.5px] text-neutral-500 mt-0.5 truncate">
                  {dish.cookingStyle || '果木炭炙 · 精准锁鲜'}
                </div>
              </div>

              {/* 2. 出餐配比与净重 */}
              <div className="bg-neutral-50/80 rounded-lg p-2 border border-neutral-150/70 flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-500 text-[9px] mb-0.5">
                  <span className="flex items-center gap-1">
                    <Scale className="w-2.5 h-2.5 text-amber-600" />
                    份量比例
                  </span>
                  <span className="text-[8px] font-sans font-medium text-neutral-400">RATIO</span>
                </div>
                <div className="font-sans text-[11px] sm:text-xs font-bold text-neutral-900 leading-tight">
                  {getSpecRatioLabel()}
                </div>
                <div className="text-[8.5px] text-neutral-500 mt-0.5 truncate">
                  {dish.spicinessLevel ? `口味: ${dish.spicinessLevel}` : '工匠标准份量'}
                </div>
              </div>

              {/* 3. 最佳赏味期与配送温控 */}
              <div className="bg-neutral-50/80 rounded-lg p-2 border border-neutral-150/70 flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-500 text-[9px] mb-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-blue-500" />
                    最佳赏味
                  </span>
                  <span className="text-[8px] font-sans font-medium text-neutral-400">WINDOW</span>
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-neutral-900 leading-tight">
                  15 分钟内
                </div>
                <div className="text-[8.5px] text-neutral-500 mt-0.5 truncate">
                  {dish.coldChainTemp || '保温箱 ≥65℃ 恒温专送'}
                </div>
              </div>

              {/* 4. 原料溯源与产地 */}
              <div className="bg-neutral-50/80 rounded-lg p-2 border border-neutral-150/70 flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-500 text-[9px] mb-0.5">
                  <span className="flex items-center gap-1">
                    <Compass className="w-2.5 h-2.5 text-emerald-600" />
                    产地溯源
                  </span>
                  <span className="text-[8px] font-sans font-medium text-neutral-400">ORIGIN</span>
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-neutral-900 leading-tight truncate">
                  {dish.originSource || '原切优选食材'}
                </div>
                <div className="text-[8.5px] text-neutral-500 mt-0.5 truncate">
                  冷链直达 · 每日现烤
                </div>
              </div>
            </div>

            {/* 核心组分配比清单 (Spec Components) */}
            {hasSpecComponents && (
              <div className="mb-2.5 bg-neutral-900 text-white rounded-lg p-2 sm:p-2.5 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9.5px] font-bold tracking-tight text-neutral-200 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    核心组分分解清单 (COMPONENTS)
                  </span>
                  <span className="text-[8px] font-sans font-medium text-neutral-400">SOP #CHECK</span>
                </div>
                <div className="space-y-1">
                  {dish.specComponents!.map((comp, idx) => (
                    <div
                      key={idx}
                      className="flex items-baseline justify-between text-[9px] sm:text-[10px] bg-neutral-800/80 px-2 py-1 rounded border border-neutral-700/50"
                    >
                      <span className="font-sans text-amber-300 font-bold shrink-0 mr-1.5">
                        {comp.role || comp.label}
                      </span>
                      <span className="text-neutral-200 text-right truncate">
                        {comp.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 风味量化方块刻度 (Flavor Profile) */}
            <div className="bg-neutral-50/70 rounded-lg p-2 border border-neutral-200/60 mb-2">
              <div className="flex items-center justify-between mb-1 text-[9px] font-semibold text-neutral-700">
                <span>风味刻度量化 (FLAVOR PROFILE)</span>
                <span className="font-sans text-[8px] text-neutral-400">5-PT SCALE</span>
              </div>
              <div className="space-y-1.5">
                {displayFlavorMetrics.map((metric, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[9px]">
                    <span className="text-neutral-600 shrink-0 w-16 truncate">{metric.label}</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: metric.maxScore || 5 }).map((_, dotIdx) => {
                        const isFilled = dotIdx < metric.score;
                        return (
                          <span
                            key={dotIdx}
                            className={`w-2 h-2 rounded-[2px] transition-colors ${
                              isFilled ? 'bg-neutral-900' : 'bg-neutral-200'
                            }`}
                          />
                        );
                      })}
                      <span className="font-sans text-[8px] text-neutral-400 ml-1">
                        {metric.score}/{metric.maxScore || 5}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 食材品质保障与操作底栏 */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[9px] gap-2">
              <div className="flex items-center gap-1 text-emerald-700 font-medium truncate">
                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">0添加防腐剂 · 明档手作现炙</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onViewBlueprint && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewBlueprint(dish);
                    }}
                    className="px-2 py-0.5 bg-neutral-900 hover:bg-black text-white text-[9px] font-semibold rounded-full flex items-center gap-0.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <span>工匠手稿</span>
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(e);
                  }}
                  className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[9px] font-medium rounded-full cursor-pointer transition-colors"
                >
                  收起
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ==========================================
// 3. 一体化封装组件 (Combo Component)
// ==========================================
export interface DishArtisanCapsuleCardProps {
  dish: DishItem;
  compact?: boolean;
  onViewBlueprint?: (dish: DishItem) => void;
  onToggleExpand?: (isExpanded: boolean) => void;
  className?: string;
}

export const DishArtisanCapsuleCard: React.FC<DishArtisanCapsuleCardProps> = ({
  dish,
  compact = false,
  onViewBlueprint,
  onToggleExpand,
  className = ''
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isOpen;
    setIsOpen(next);
    if (onToggleExpand) onToggleExpand(next);
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsOpen(false);
    if (onToggleExpand) onToggleExpand(false);
  };

  return (
    <div className={`relative ${className}`}>
      <DishArtisanCapsuleToggle
        dish={dish}
        isOpen={isOpen}
        onToggle={handleToggle}
        compact={compact}
      />
      <DishArtisanDropdownCard
        dish={dish}
        isOpen={isOpen}
        onClose={handleClose}
        onViewBlueprint={onViewBlueprint}
        compact={compact}
      />
    </div>
  );
};
