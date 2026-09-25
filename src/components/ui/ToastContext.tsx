import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
  timestamp: number;
}

export type ToastInput = 
  | string 
  | (Omit<ToastMessage, 'id' | 'timestamp'> & { timestamp?: number });

interface ToastContextType {
  showToast: (toast: ToastInput) => void;
  success: (title: string, description?: string, action?: ToastAction) => void;
  error: (title: string, description?: string, action?: ToastAction) => void;
  warning: (title: string, description?: string, action?: ToastAction) => void;
  info: (title: string, description?: string, action?: ToastAction) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timerMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastToastRef = useRef<{ title: string; type: ToastType; timestamp: number } | null>(null);

  const clearTimer = useCallback((id: string) => {
    const timer = timerMapRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerMapRef.current.delete(id);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    clearTimer(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, [clearTimer]);

  const scheduleDismiss = useCallback((id: string, duration: number = 3200) => {
    clearTimer(id);
    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      timerMapRef.current.set(id, timer);
    }
  }, [clearTimer, removeToast]);

  const showToast = useCallback(
    (input: ToastInput) => {
      const normalized: Omit<ToastMessage, 'id' | 'timestamp'> = 
        typeof input === 'string'
          ? { title: input, type: 'info', duration: 3200 }
          : { ...input, type: input.type || 'info', duration: input.duration ?? 3200 };

      const now = Date.now();

      // 防抖去重：如果 1.2 秒内重复触发完全相同的 title 和 type，则刷新计时器，不重复叠加卡片
      if (
        lastToastRef.current &&
        lastToastRef.current.title === normalized.title &&
        lastToastRef.current.type === normalized.type &&
        now - lastToastRef.current.timestamp < 1200
      ) {
        lastToastRef.current.timestamp = now;
        // 找到当前匹配的最新 toast 刷新计时器
        setToasts((prev) => {
          const match = prev.find((t) => t.title === normalized.title && t.type === normalized.type);
          if (match) {
            scheduleDismiss(match.id, normalized.duration);
          }
          return prev;
        });
        return;
      }

      lastToastRef.current = { title: normalized.title, type: normalized.type, timestamp: now };

      const id = `toast-${now}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastMessage = {
        id,
        title: normalized.title,
        description: normalized.description,
        type: normalized.type,
        duration: normalized.duration,
        action: normalized.action,
        timestamp: now,
      };

      // 最多保留最新 3 条，避免刷屏
      setToasts((prev) => [...prev.slice(-2), newToast]);
      scheduleDismiss(id, newToast.duration);
    },
    [scheduleDismiss]
  );

  const pauseToast = useCallback((id: string) => {
    clearTimer(id);
  }, [clearTimer]);

  const resumeToast = useCallback((id: string, duration: number = 2000) => {
    scheduleDismiss(id, duration);
  }, [scheduleDismiss]);

  const dismissAll = useCallback(() => {
    timerMapRef.current.forEach((t) => clearTimeout(t));
    timerMapRef.current.clear();
    setToasts([]);
  }, []);

  const success = useCallback(
    (title: string, description?: string, action?: ToastAction) => 
      showToast({ title, description, type: 'success', action }),
    [showToast]
  );

  const error = useCallback(
    (title: string, description?: string, action?: ToastAction) => 
      showToast({ title, description, type: 'error', action, duration: 4200 }),
    [showToast]
  );

  const warning = useCallback(
    (title: string, description?: string, action?: ToastAction) => 
      showToast({ title, description, type: 'warning', action, duration: 3800 }),
    [showToast]
  );

  const info = useCallback(
    (title: string, description?: string, action?: ToastAction) => 
      showToast({ title, description, type: 'info', action }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, dismissAll }}>
      {children}
    </ToastContext.Provider>
  );
};
