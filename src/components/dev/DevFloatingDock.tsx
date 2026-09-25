import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Eye, EyeOff, ShieldCheck, Lock, SlidersHorizontal } from 'lucide-react';
import { useDevSimulation } from '../../context/DevSimulationContext';

export const DevFloatingDock: React.FC = () => {
  const {
    isAdminDeveloper,
    previewAsConsumer,
    openDevControlCenter,
    togglePreviewAsConsumer,
    inspectorMode,
    toggleInspectorMode
  } = useDevSimulation();

  // 严格要求：未登录开发者账号时完全不显示浮动调试入口
  // 仅在开发者或管理员账号登录成功后才展现入口
  if (!isAdminDeveloper) {
    return null;
  }

  return (
    <div className="fixed bottom-20 sm:bottom-24 right-3 z-40 flex flex-col items-end gap-1.5 pointer-events-auto select-none font-sans">
      <AnimatePresence>
        {previewAsConsumer ? (
          /* Notice banner when previewing as consumer */
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/95 text-amber-300 border border-amber-500/50 shadow-xl backdrop-blur-md text-[11px] font-bold"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>普通食客纯净视角中 (模拟已锁定)</span>
            <button
              type="button"
              onClick={togglePreviewAsConsumer}
              className="px-2 py-0.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black cursor-pointer transition-colors"
            >
              恢复开发
            </button>
          </motion.div>
        ) : (
          /* Normal developer dock trigger */
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 bg-[#111213]/90 backdrop-blur-md p-1 pl-2.5 rounded-2xl border border-neutral-700/80 shadow-2xl text-white group"
          >
            <div className="flex items-center gap-2 cursor-pointer" onClick={openDevControlCenter}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black tracking-tight text-white">
                    模拟调试控制台
                  </span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                    DEV
                  </span>
                </div>
                <span className="text-[9px] text-neutral-400">
                  Ctrl+Shift+D 唤出
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-neutral-800 mx-1" />

            <button
              type="button"
              onClick={openDevControlCenter}
              className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors cursor-pointer"
              title="打开状态流转与功能性实验调试中枢"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={togglePreviewAsConsumer}
              className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors cursor-pointer"
              title="立即切换为普通食客纯净视角"
            >
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
