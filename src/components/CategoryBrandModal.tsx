import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Flame,
  UtensilsCrossed,
  Award,
  Tag,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Percent,
  ChefHat,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CategoryBrandModalConfig } from '../utils/categoryBrandSettings';

interface CategoryBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CategoryBrandModalConfig | null;
  onConfirmStartShopping?: () => void;
  onNeverShowAgain?: (categoryId: string) => void;
}

export const CategoryBrandModal: React.FC<CategoryBrandModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfirmStartShopping,
  onNeverShowAgain
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState(false);

  useEffect(() => {
    if (isOpen && config) {
      setImageLoaded(false);
      if (config.autoCloseSeconds && config.autoCloseSeconds > 0) {
        setCountdown(config.autoCloseSeconds);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              onClose();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(timer);
      } else {
        setCountdown(0);
      }
    }
  }, [isOpen, config, onClose]);

  if (!isOpen || !config) return null;

  const handleStartShopping = () => {
    if (dontShowAgainChecked && onNeverShowAgain && config) {
      onNeverShowAgain(config.categoryId);
    }
    if (onConfirmStartShopping) {
      onConfirmStartShopping();
    }
    onClose();
  };

  const getAccentStyles = (accent: CategoryBrandModalConfig['accentColor']) => {
    switch (accent) {
      case 'orange':
        return {
          badge: 'bg-orange-500 text-white shadow-orange-500/20',
          gradient: 'from-orange-500/15 via-orange-500/5 to-transparent',
          border: 'border-orange-500/30',
          iconColor: 'text-orange-500',
          pillBg: 'bg-orange-50 text-orange-950 border-orange-200',
          btnBg: 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-orange-600/30',
          couponBg: 'bg-orange-50/80 border-orange-200/80 text-orange-950'
        };
      case 'amber':
        return {
          badge: 'bg-amber-500 text-black shadow-amber-500/20',
          gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
          border: 'border-amber-500/30',
          iconColor: 'text-amber-500',
          pillBg: 'bg-amber-50 text-amber-950 border-amber-200',
          btnBg: 'bg-gradient-to-r from-stone-900 to-amber-950 hover:from-black hover:to-stone-900 text-amber-300 border border-amber-500/40 shadow-stone-900/40',
          couponBg: 'bg-amber-50/80 border-amber-200/80 text-amber-950'
        };
      case 'yellow':
        return {
          badge: 'bg-yellow-500 text-yellow-950 shadow-yellow-500/20',
          gradient: 'from-yellow-500/15 via-yellow-500/5 to-transparent',
          border: 'border-yellow-500/30',
          iconColor: 'text-yellow-600',
          pillBg: 'bg-yellow-50 text-yellow-950 border-yellow-200',
          btnBg: 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white shadow-yellow-600/30',
          couponBg: 'bg-yellow-50/80 border-yellow-200/80 text-yellow-950'
        };
      case 'rose':
        return {
          badge: 'bg-rose-500 text-white shadow-rose-500/20',
          gradient: 'from-rose-500/15 via-rose-500/5 to-transparent',
          border: 'border-rose-500/30',
          iconColor: 'text-rose-500',
          pillBg: 'bg-rose-50 text-rose-950 border-rose-200',
          btnBg: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-rose-600/30',
          couponBg: 'bg-rose-50/80 border-rose-200/80 text-rose-950'
        };
      case 'emerald':
        return {
          badge: 'bg-emerald-600 text-white shadow-emerald-600/20',
          gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
          border: 'border-emerald-500/30',
          iconColor: 'text-emerald-600',
          pillBg: 'bg-emerald-50 text-emerald-950 border-emerald-200',
          btnBg: 'bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white shadow-emerald-700/30',
          couponBg: 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950'
        };
      default:
        return {
          badge: 'bg-neutral-900 text-white shadow-black/20',
          gradient: 'from-neutral-500/10 via-neutral-500/5 to-transparent',
          border: 'border-neutral-200',
          iconColor: 'text-neutral-900',
          pillBg: 'bg-neutral-100 text-neutral-900 border-neutral-200',
          btnBg: 'bg-neutral-900 hover:bg-black text-white shadow-neutral-900/30',
          couponBg: 'bg-neutral-50 border-neutral-200 text-neutral-900'
        };
    }
  };

  const theme = getAccentStyles(config.accentColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Dim Backdrop with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden z-10 flex flex-col my-auto"
      >
        {/* Top Cover Image Hero with Gradient Overlay */}
        <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-neutral-900 shrink-0">
          {/* Skeleton Shimmer while loading */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-neutral-800 animate-pulse flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-neutral-400">
                <ChefHat className="w-8 h-8 animate-bounce text-amber-400/70" />
                <span className="text-[11px] font-medium tracking-wide">精选风味载入中...</span>
              </div>
            </div>
          )}

          <img
            src={config.coverImageUrl}
            alt={config.brandTitle}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-700 ${
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            }`}
            referrerPolicy="no-referrer"
            loading="eager"
          />

          {/* Dark scrim gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          {/* Top Row: Floating Badge & Close Button */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-black shadow-md flex items-center gap-1 backdrop-blur-xs ${theme.badge}`}
              >
                <span>{config.badgeText || '✨ 招牌推荐'}</span>
              </span>
              {countdown > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10.5px] tabular-nums text-white/90 border border-white/20 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{countdown}s后自动关闭</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white/90 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/20 shadow-md active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Title on Hero */}
          <div className="absolute bottom-3 left-4 right-4 text-white z-10 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">{config.categoryIcon || '✨'}</span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white drop-shadow-md">
                {config.brandTitle}
              </h2>
            </div>
            <p className="text-xs text-white/80 font-medium line-clamp-1 drop-shadow-sm">
              {config.brandSubtitle}
            </p>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto max-h-[58vh]">
          {/* Craft Highlights Badges Matrix */}
          {config.craftHighlights && config.craftHighlights.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>工匠标准与甄选特色</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {config.craftHighlights.map((highlight, idx) => (
                  <div
                    key={idx}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-2xs ${theme.pillBg}`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${theme.iconColor}`} />
                    <span className="truncate">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Story / Craftsmanship Description */}
          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
            <div className="flex items-center gap-1 text-xs font-bold text-neutral-900">
              <UtensilsCrossed className="w-3.5 h-3.5 text-neutral-700" />
              <span>品类风味故事</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed text-justify font-normal">
              {config.storyDescription}
            </p>
          </div>

          {/* Featured Dishes List (if available) */}
          {config.featuredDishNames && config.featuredDishNames.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3 text-red-500" />
                <span>必点招牌佳肴</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {config.featuredDishNames.map((dishName, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.8 rounded-lg bg-neutral-100 text-neutral-800 text-[11px] font-bold border border-neutral-200/80"
                  >
                    {dishName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Special Coupon / Privilege Banner */}
          {config.couponText && (
            <div className={`p-2.5 rounded-2xl border flex items-center gap-2.5 ${theme.couponBg}`}>
              <div className="w-8 h-8 rounded-xl bg-white text-neutral-900 flex items-center justify-center font-black shadow-xs shrink-0 border border-neutral-200">
                <Percent className="w-4 h-4 text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase text-red-600 tracking-wider">
                  限时品类礼遇
                </div>
                <div className="text-xs font-bold truncate text-neutral-900">
                  {config.couponText}
                </div>
              </div>
            </div>
          )}

          {/* Don't show again preference option */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="dontShowCategoryBrandAgain"
              type="checkbox"
              checked={dontShowAgainChecked}
              onChange={(e) => setDontShowAgainChecked(e.target.checked)}
              className="w-3.5 h-3.5 accent-neutral-900 rounded cursor-pointer"
            />
            <label
              htmlFor="dontShowCategoryBrandAgain"
              className="text-[11px] text-neutral-500 cursor-pointer select-none"
            >
              下次切换到此分类不再自动提示
            </label>
          </div>
        </div>

        {/* Footer Action CTA */}
        <div className="p-3.5 sm:p-4 bg-neutral-50 border-t border-neutral-200/80 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-all cursor-pointer"
          >
            暂不选购
          </button>
          <button
            type="button"
            onClick={handleStartShopping}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer ${theme.btnBg}`}
          >
            <span>{config.buttonText || `开始选购 ${config.categoryName}`}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
