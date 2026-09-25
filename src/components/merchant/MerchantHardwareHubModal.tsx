import React from 'react';
import {
  Bluetooth,
  Barcode,
  MessageSquareText,
  Cloud,
  Bike,
  Smartphone,
  Fingerprint,
  LogOut,
  Sliders,
  Volume2,
  CheckCircle2,
  X,
  RefreshCw,
  Megaphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MerchantSession } from '../../utils/staffAndRiderAuthEngine';
import { BluetoothAudioConfig } from '../../utils/bluetoothAudioEngine';
import { MerchantVoiceControls } from './MerchantVoiceControls';

interface MerchantHardwareHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBtDevice?: { name: string; status: string } | null;
  btConfig: BluetoothAudioConfig;
  onOpenBluetoothModal: () => void;
  onOpenScanner: () => void;
  onOpenMessageForm: () => void;
  onOpenCloudbaseModal: () => void;
  onOpenQuickCall?: () => void;
  onSwitchToRider: () => void;
  merchantSession?: MerchantSession | null;
  onOpenPhoneAuth?: () => void;
  onLogoutMerchant?: () => void;
  showToast: (title: string, desc?: string) => void;
  maskPhoneNumber: (phone: string) => string;
}

export const MerchantHardwareHubModal: React.FC<MerchantHardwareHubModalProps> = ({
  isOpen,
  onClose,
  activeBtDevice,
  btConfig,
  onOpenBluetoothModal,
  onOpenScanner,
  onOpenMessageForm,
  onOpenCloudbaseModal,
  onOpenQuickCall,
  onSwitchToRider,
  merchantSession,
  onOpenPhoneAuth,
  onLogoutMerchant,
  showToast,
  maskPhoneNumber
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#fafaf8] border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#2b593f] text-white flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">硬件与多端协同中枢</h3>
                <p className="text-[11px] text-neutral-500">蓝牙音箱 · 扫码枪 · 云同步 · 员工保活</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto space-y-3.5">
            {/* 1. 员工指纹与安全账号状态 */}
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>当前在岗账号</span>
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300/60 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-0.5">
                  <Fingerprint className="w-3 h-3 text-emerald-700" />
                  <span>指纹保活</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <div>
                  <span className="font-bold text-neutral-900">{merchantSession?.name || '张伟 (店长)'}</span>
                  <span className="text-neutral-500 font-mono ml-2">
                    {merchantSession?.phone ? maskPhoneNumber(merchantSession.phone) : '138****8000'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {onOpenPhoneAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenPhoneAuth();
                      }}
                      className="text-xs text-blue-700 hover:text-blue-900 font-semibold cursor-pointer underline"
                    >
                      切换账号
                    </button>
                  )}
                  {onLogoutMerchant && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onLogoutMerchant();
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer underline flex items-center gap-0.5"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>退出</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. 硬件与网络状态矩阵 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 方案 C：即时叫号广播小窗 */}
              {onOpenQuickCall && (
                <div
                  onClick={() => {
                    onClose();
                    onOpenQuickCall();
                  }}
                  className="sm:col-span-2 p-3 bg-amber-50 hover:bg-amber-100/90 rounded-lg border border-amber-300 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Megaphone className="w-4 h-4 text-amber-700 animate-pulse shrink-0" />
                      <span className="text-xs font-bold text-amber-950">即时叫号广播小窗 (快捷键: Alt+C)</span>
                    </div>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded shrink-0">
                      全域外放
                    </span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-amber-900 flex items-center justify-between">
                    <span>自提取件 · 呼叫骑手 · 堂食传菜 · 促销自定义喊客</span>
                    <span className="font-bold text-amber-800 group-hover:underline flex items-center gap-0.5 shrink-0 ml-2">
                      <span>立即弹出</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Bluetooth Audio Hub */}
              <div
                onClick={() => {
                  onClose();
                  onOpenBluetoothModal();
                }}
                className="p-3 bg-white hover:bg-neutral-50 rounded-lg border border-neutral-200 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Bluetooth className={`w-4 h-4 ${
                      activeBtDevice?.status === 'connected' ? 'text-blue-600' : 'text-neutral-500'
                    }`} />
                    <span className="text-xs font-bold text-neutral-900">蓝牙音箱控制</span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${
                    activeBtDevice?.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300'
                  }`} />
                </div>
                <div className="mt-2 text-[11px] text-neutral-600">
                  <div className="truncate">设备: {activeBtDevice?.status === 'connected' ? activeBtDevice.name : '未连接'}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    路由: {btConfig.routingMode === 'voice_only' ? '仅系统语音播报' : '统一混合播报'}
                  </div>
                </div>
                <div className="mt-2.5 text-[11px] font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                  <span>管理音频配对</span>
                  <span>→</span>
                </div>
              </div>

              {/* Barcode Scanner Hub */}
              <div
                onClick={() => {
                  onClose();
                  onOpenScanner();
                }}
                className="p-3 bg-white hover:bg-neutral-50 rounded-lg border border-neutral-200 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Barcode className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-neutral-900">智能扫码枪控制台</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="mt-2 text-[11px] text-neutral-600">
                  <div>USB / 无线扫码协议已就绪</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">支持 13 位标准条码与自编码校验</div>
                </div>
                <div className="mt-2.5 text-[11px] font-bold text-emerald-700 group-hover:underline flex items-center gap-1">
                  <span>打开扫码工作台</span>
                  <span>→</span>
                </div>
              </div>

              {/* Cloudbase Sync */}
              <div
                onClick={() => {
                  onClose();
                  onOpenCloudbaseModal();
                }}
                className="p-3 bg-white hover:bg-neutral-50 rounded-lg border border-neutral-200 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-sky-600" />
                    <span className="text-xs font-bold text-neutral-900">腾讯云数据同步</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="mt-2 text-[11px] text-neutral-600">
                  <div>环境: tc100-d9gz0e2ko5929e360</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">COS 与云端数据库双向热同步</div>
                </div>
                <div className="mt-2.5 text-[11px] font-bold text-sky-700 group-hover:underline flex items-center gap-1">
                  <span>查看同步配置</span>
                  <span>→</span>
                </div>
              </div>

              {/* Order Messages History */}
              <div
                onClick={() => {
                  onClose();
                  onOpenMessageForm();
                }}
                className="p-3 bg-white hover:bg-neutral-50 rounded-lg border border-neutral-200 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MessageSquareText className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-neutral-900">历史订单在线消息</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="mt-2 text-[11px] text-neutral-600">
                  <div>查看食客与骑手实时双向沟通</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">支持异常单据极速客服介入</div>
                </div>
                <div className="mt-2.5 text-[11px] font-bold text-emerald-700 group-hover:underline flex items-center gap-1">
                  <span>打开消息表单</span>
                  <span>→</span>
                </div>
              </div>
            </div>

            {/* 3. 语音广播控制 */}
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-neutral-700" />
                  <span>语音播报与音量设置</span>
                </span>
                <span className="text-[10px] text-neutral-500">双语 TTS 语音库</span>
              </div>
              <MerchantVoiceControls showToast={showToast} />
            </div>

            {/* 4. 切换骑手端入口 */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onSwitchToRider();
              }}
              className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <Bike className="w-4 h-4" />
              <span>切换至专送骑手端配送界面</span>
            </button>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-200 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              完成并收起
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
