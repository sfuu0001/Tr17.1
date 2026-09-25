import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface FlyingItem {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  imageUrl?: string;
}

interface FlyingCartContextType {
  triggerFlyToCart: (startElementOrCoords: HTMLElement | { x: number; y: number }, imageUrl?: string) => void;
  registerCartTarget: (element: HTMLElement | null) => void;
  badgeBounce: boolean;
}

const FlyingCartContext = createContext<FlyingCartContextType>({
  triggerFlyToCart: () => {},
  registerCartTarget: () => {},
  badgeBounce: false,
});

export const useFlyingCart = () => useContext(FlyingCartContext);

export const FlyingCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);
  const [badgeBounce, setBadgeBounce] = useState(false);
  const cartTargetRef = useRef<HTMLElement | null>(null);

  const registerCartTarget = useCallback((element: HTMLElement | null) => {
    cartTargetRef.current = element;
  }, []);

  const triggerFlyToCart = useCallback((startElementOrCoords: HTMLElement | { x: number; y: number }, imageUrl?: string) => {
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;

    if ('nodeType' in (startElementOrCoords as any) || (startElementOrCoords as HTMLElement).getBoundingClientRect) {
      const rect = (startElementOrCoords as HTMLElement).getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    } else if ('x' in startElementOrCoords && 'y' in startElementOrCoords) {
      startX = startElementOrCoords.x;
      startY = startElementOrCoords.y;
    }

    // Target cart position (fallback to bottom-right or bottom-center if not found)
    let targetX = window.innerWidth - 60;
    let targetY = window.innerHeight - 60;

    if (cartTargetRef.current) {
      const targetRect = cartTargetRef.current.getBoundingClientRect();
      targetX = targetRect.left + targetRect.width / 2;
      targetY = targetRect.top + targetRect.height / 2;
    } else {
      // Find cart icon in DOM if ref wasn't mounted yet
      const domTarget = document.getElementById('cart-target-btn') || document.querySelector('[data-cart-target="true"]');
      if (domTarget) {
        const rect = domTarget.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      }
    }

    const newItem: FlyingItem = {
      id: `fly-${Date.now()}-${Math.random()}`,
      startX,
      startY,
      targetX,
      targetY,
      imageUrl,
    };

    setFlyingItems((prev) => [...prev, newItem]);

    // Trigger bounce on cart badge on arrival (approx 600ms)
    setTimeout(() => {
      setBadgeBounce(true);
      setTimeout(() => setBadgeBounce(false), 400);
    }, 550);

    // Remove flying item after animation completes
    setTimeout(() => {
      setFlyingItems((prev) => prev.filter((item) => item.id !== newItem.id));
    }, 700);
  }, []);

  return (
    <FlyingCartContext.Provider value={{ triggerFlyToCart, registerCartTarget, badgeBounce }}>
      {children}

      {/* Global Flying Overlay Container */}
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
        <AnimatePresence>
          {flyingItems.map((item) => {
            const midX = (item.startX + item.targetX) / 2;
            const midY = Math.min(item.startY, item.targetY) - 80; // High arc parabola

            return (
              <motion.div
                key={item.id}
                initial={{
                  x: item.startX - 18,
                  y: item.startY - 18,
                  scale: 1,
                  opacity: 1,
                }}
                animate={{
                  x: [item.startX - 18, midX - 14, item.targetX - 10],
                  y: [item.startY - 18, midY, item.targetY - 10],
                  scale: [1, 1.15, 0.4],
                  opacity: [1, 0.95, 0],
                }}
                transition={{
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1], // Smooth custom ease
                }}
                className="absolute flex items-center justify-center rounded-full bg-black text-white shadow-xl border border-white/80 overflow-hidden"
                style={{ width: 36, height: 36 }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </FlyingCartContext.Provider>
  );
};
