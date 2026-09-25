import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useSmoothInertiaScroll, UseSmoothInertiaScrollOptions } from '../../hooks/useSmoothInertiaScroll';

export interface SmoothScrollContainerProps extends UseSmoothInertiaScrollOptions {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string | number;
  showArrows?: boolean;
  fadeMaskHeight?: number;
  fadeMaskColor?: string; // e.g. 'from-white via-white/80 to-transparent'
}

export const SmoothScrollContainer: React.FC<SmoothScrollContainerProps> = ({
  children,
  className = '',
  maxHeight = '70vh',
  showArrows = true,
  fadeMaskHeight = 24,
  fadeMaskColor = 'from-white via-white/85 to-transparent',
  threshold = 4,
  friction = 0.92,
  velocityMultiplier = 1.4,
  stopThreshold = 0.2,
  scrollStep = 160
}) => {
  const {
    scrollContainerRef,
    canScrollUp,
    canScrollDown,
    isDragging,
    isScrollingActive,
    handleScroll,
    handleMouseDown,
    scrollSmoothBy
  } = useSmoothInertiaScroll({
    threshold,
    friction,
    velocityMultiplier,
    stopThreshold,
    scrollStep
  });

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">
      {/* Top Fade Edge with Micro Up Arrow */}
      <AnimatePresence>
        {canScrollUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => scrollSmoothBy('up')}
            className={`absolute top-0 left-0 right-0 bg-gradient-to-b ${fadeMaskColor} z-20 flex items-center justify-center cursor-pointer pointer-events-auto group`}
            style={{ height: `${fadeMaskHeight}px` }}
            title="向上滚动"
          >
            {showArrows && (
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="w-5 h-3.5 rounded-full bg-white/95 border border-neutral-200 shadow-2xs flex items-center justify-center group-hover:border-neutral-400 transition-colors"
              >
                <ChevronUp className="w-3 h-3 text-neutral-600" />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Drag-to-Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        className={`overflow-y-auto custom-scrollbar touch-pan-y ${
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        } ${className}`}
        style={{
          maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}
      >
        {children}
      </div>

      {/* Bottom Fade Edge with Micro Down Arrow */}
      <AnimatePresence>
        {canScrollDown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => scrollSmoothBy('down')}
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${fadeMaskColor} z-20 flex items-center justify-center cursor-pointer pointer-events-auto group`}
            style={{ height: `${fadeMaskHeight}px` }}
            title="向下滚动"
          >
            {showArrows && (
              <motion.div
                animate={{ y: [0, 2, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="w-5 h-3.5 rounded-full bg-white/95 border border-neutral-200 shadow-2xs flex items-center justify-center group-hover:border-neutral-400 transition-colors"
              >
                <ChevronDown className="w-3 h-3 text-neutral-600" />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
