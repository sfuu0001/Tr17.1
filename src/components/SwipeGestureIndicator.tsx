import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';
import { SwipeFeedbackState } from '../hooks/useMobileSwipeNav';

interface SwipeGestureIndicatorProps {
  feedback: SwipeFeedbackState | null;
}

/**
 * 手机端滑动手势交互反馈 HUD
 * 当用户左右划屏切换导航按钮时，在顶部呈现灵动胶囊指示器，提升原生手势掌控感
 */
export const SwipeGestureIndicator: React.FC<SwipeGestureIndicatorProps> = ({ feedback }) => {
  return (
    <AnimatePresence>
      {feedback && feedback.visible && (
        <motion.div
          key="swipe-nav-hud"
          initial={{ opacity: 0, y: -20, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 420,
            damping: 26
          }}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-[60] pointer-events-none select-none max-w-[85vw]"
        >
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl shadow-2xl border transition-colors ${
              feedback.isBoundary
                ? 'bg-neutral-900/90 border-amber-500/40 text-neutral-200'
                : 'bg-neutral-950/92 border-blue-500/40 text-white'
            }`}
          >
            {feedback.direction === 'right' ? (
              <ChevronLeft className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
            ) : null}

            {feedback.isBoundary ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}

            <span className="text-xs font-semibold tracking-wide whitespace-nowrap">
              {feedback.label}
            </span>

            {feedback.direction === 'left' ? (
              <ChevronRight className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
