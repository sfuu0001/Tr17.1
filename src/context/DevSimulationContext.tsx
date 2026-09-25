import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { safeGetStorage, safeSetStorage } from '../utils/safeStorage';

export interface AdminDeveloperUser {
  username: string;
  name: string;
  role: 'admin_developer';
  department: string;
  token: string;
  loginTime: string;
}

export interface DevSimulationContextType {
  isAdminDeveloper: boolean;
  adminUser: AdminDeveloperUser | null;
  previewAsConsumer: boolean;
  isSimulationAllowed: boolean;
  inspectorMode: boolean;
  
  // Functional Experiment Parameters
  networkDelayMs: number;
  simulateOffline: boolean;
  simulatedOutOfStockDishIds: string[];
  simulatePaymentOutcome: 'normal' | 'success' | 'timeout' | 'fail';
  radarSpeedMultiplier: number;
  
  // Modal visibility
  isDevControlCenterOpen: boolean;
  isDevAuthModalOpen: boolean;
  
  // Actions
  loginAdmin: (account: string, pass: string) => { success: boolean; message: string };
  logoutAdmin: () => void;
  togglePreviewAsConsumer: () => void;
  toggleInspectorMode: () => void;
  setNetworkDelayMs: (ms: number) => void;
  setSimulateOffline: (offline: boolean) => void;
  toggleDishOutOfStock: (dishId: string) => void;
  setSimulatePaymentOutcome: (outcome: 'normal' | 'success' | 'timeout' | 'fail') => void;
  setRadarSpeedMultiplier: (multiplier: number) => void;
  clearAllSimulations: () => void;
  openDevControlCenter: () => void;
  closeDevControlCenter: () => void;
  openDevAuthModal: () => void;
  closeDevAuthModal: () => void;
}

// Hardcoded Designated Admin Credentials for Developer Testing
export const DESIGNATED_ADMIN_ACCOUNTS = ['admin', 'dev@obsidian.com', 'admin@obsidian.com', 'developer'];
export const DESIGNATED_ADMIN_PASSWORD = 'admin888';
export const DESIGNATED_DEV_FALLBACK_PASS = 'dev2026!';

const STORAGE_KEY_DEV_AUTH = 'obsidian_dev_auth_session';

const DevSimulationContext = createContext<DevSimulationContextType | null>(null);

export const DevSimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize admin user from persistent session
  const [adminUser, setAdminUser] = useState<AdminDeveloperUser | null>(() => {
    return safeGetStorage<AdminDeveloperUser | null>(STORAGE_KEY_DEV_AUTH, null);
  });

  const [previewAsConsumer, setPreviewAsConsumer] = useState<boolean>(false);
  const [inspectorMode, setInspectorMode] = useState<boolean>(false);

  // Functional Experiment State
  const [networkDelayMs, setNetworkDelayMs] = useState<number>(0);
  const [simulateOffline, setSimulateOffline] = useState<boolean>(false);
  const [simulatedOutOfStockDishIds, setSimulatedOutOfStockDishIds] = useState<string[]>([]);
  const [simulatePaymentOutcome, setSimulatePaymentOutcome] = useState<'normal' | 'success' | 'timeout' | 'fail'>('normal');
  const [radarSpeedMultiplier, setRadarSpeedMultiplier] = useState<number>(1);

  // Modals
  const [isDevControlCenterOpen, setIsDevControlCenterOpen] = useState<boolean>(false);
  const [isDevAuthModalOpen, setIsDevAuthModalOpen] = useState<boolean>(false);

  const isAdminDeveloper = Boolean(adminUser && adminUser.token);
  // Simulation is strictly locked if not admin, or if developer enabled "preview as consumer"
  const isSimulationAllowed = isAdminDeveloper && !previewAsConsumer;

  // Global Keyboard Shortcut: Ctrl+Shift+D or Cmd+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        if (isAdminDeveloper) {
          setIsDevControlCenterOpen((prev) => !prev);
        } else {
          setIsDevAuthModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminDeveloper]);

  // Login handler
  const loginAdmin = useCallback((account: string, pass: string) => {
    const trimmedAccount = account.trim().toLowerCase();
    const trimmedPass = pass.trim();

    const isAccountValid = DESIGNATED_ADMIN_ACCOUNTS.includes(trimmedAccount);
    const isPassValid = trimmedPass === DESIGNATED_ADMIN_PASSWORD || trimmedPass === DESIGNATED_DEV_FALLBACK_PASS;

    if (isAccountValid && isPassValid) {
      const user: AdminDeveloperUser = {
        username: trimmedAccount,
        name: '系统核心架构师 / 开发者',
        role: 'admin_developer',
        department: '研发工程中枢 · 前端调试组',
        token: `dev_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        loginTime: new Date().toLocaleTimeString('zh-CN', { hour12: false })
      };
      setAdminUser(user);
      safeSetStorage(STORAGE_KEY_DEV_AUTH, user);
      setPreviewAsConsumer(false);
      setIsDevAuthModalOpen(false);
      setIsDevControlCenterOpen(true);
      return { success: true, message: '管理员身份核验通过！前端调试与全状态流转模拟系统已解锁。' };
    }

    return {
      success: false,
      message: '认证失败：账号或密码错误。此前端调试模拟系统仅对授权管理员与开发工程师开放。'
    };
  }, []);

  // Logout handler
  const logoutAdmin = useCallback(() => {
    setAdminUser(null);
    safeSetStorage(STORAGE_KEY_DEV_AUTH, null);
    setPreviewAsConsumer(false);
    setInspectorMode(false);
    setIsDevControlCenterOpen(false);
    // Reset all ongoing experiments
    setNetworkDelayMs(0);
    setSimulateOffline(false);
    setSimulatedOutOfStockDishIds([]);
    setSimulatePaymentOutcome('normal');
    setRadarSpeedMultiplier(1);
  }, []);

  const togglePreviewAsConsumer = useCallback(() => {
    setPreviewAsConsumer((prev) => !prev);
  }, []);

  const toggleInspectorMode = useCallback(() => {
    setInspectorMode((prev) => !prev);
  }, []);

  const toggleDishOutOfStock = useCallback((dishId: string) => {
    setSimulatedOutOfStockDishIds((prev) =>
      prev.includes(dishId) ? prev.filter((id) => id !== dishId) : [...prev, dishId]
    );
  }, []);

  const clearAllSimulations = useCallback(() => {
    setNetworkDelayMs(0);
    setSimulateOffline(false);
    setSimulatedOutOfStockDishIds([]);
    setSimulatePaymentOutcome('normal');
    setRadarSpeedMultiplier(1);
  }, []);

  const openDevControlCenter = useCallback(() => {
    if (isAdminDeveloper) {
      setIsDevControlCenterOpen(true);
    } else {
      setIsDevAuthModalOpen(true);
    }
  }, [isAdminDeveloper]);

  const closeDevControlCenter = useCallback(() => {
    setIsDevControlCenterOpen(false);
  }, []);

  const openDevAuthModal = useCallback(() => {
    setIsDevAuthModalOpen(true);
  }, []);

  const closeDevAuthModal = useCallback(() => {
    setIsDevAuthModalOpen(false);
  }, []);

  return (
    <DevSimulationContext.Provider
      value={{
        isAdminDeveloper,
        adminUser,
        previewAsConsumer,
        isSimulationAllowed,
        inspectorMode,
        networkDelayMs,
        simulateOffline,
        simulatedOutOfStockDishIds,
        simulatePaymentOutcome,
        radarSpeedMultiplier,
        isDevControlCenterOpen,
        isDevAuthModalOpen,
        loginAdmin,
        logoutAdmin,
        togglePreviewAsConsumer,
        toggleInspectorMode,
        setNetworkDelayMs,
        setSimulateOffline,
        toggleDishOutOfStock,
        setSimulatePaymentOutcome,
        setRadarSpeedMultiplier,
        clearAllSimulations,
        openDevControlCenter,
        closeDevControlCenter,
        openDevAuthModal,
        closeDevAuthModal
      }}
    >
      {children}
    </DevSimulationContext.Provider>
  );
};

export const useDevSimulation = () => {
  const context = useContext(DevSimulationContext);
  if (!context) {
    throw new Error('useDevSimulation must be used within a DevSimulationProvider');
  }
  return context;
};
