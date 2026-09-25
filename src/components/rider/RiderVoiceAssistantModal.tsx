import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Phone,
  CheckCircle2,
  Navigation,
  X,
  AlertTriangle,
  Radio
} from 'lucide-react';

interface RiderVoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceCommand: (cmd: 'call_customer' | 'arrive_pickup' | 'arrive_dropoff' | 'nav_next') => void;
  showToast: (msg: string) => void;
}

export const RiderVoiceAssistantModal: React.FC<RiderVoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onVoiceCommand,
  showToast
}) => {
  const [isListening, setIsListening] = useState<boolean>(true);
  const [detectedText, setDetectedText] = useState<string>('正在倾听您的语音口令...');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsListening(true);
      setDetectedText('正在倾听您的语音口令 (请说出下方快捷指令)...');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerVoiceCommand = (cmd: 'call_customer' | 'arrive_pickup' | 'arrive_dropoff' | 'nav_next', phrase: string) => {
    setIsProcessing(true);
    setDetectedText(`“${phrase}”`);
    setTimeout(() => {
      onVoiceCommand(cmd);
      setIsProcessing(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-[#37352f] w-full max-w-md rounded-[4px] border border-[#e6e6e4] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#edf3ec] text-[#2b593f] border border-[#c4dcbc] flex items-center justify-center">
              <Radio className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-xs text-[#37352f] block">
                免提语音助手
              </span>
              <span className="text-[10px] text-[#787774] font-mono">
                安全骑行免手操作
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[3px] hover:bg-[#efefed] text-[#787774] hover:text-[#37352f] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Center Mic Visualizer */}
        <div className="p-6 text-center space-y-4">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            {isListening && (
              <div className="absolute inset-0 rounded-full bg-[#edf3ec] animate-ping" />
            )}

            <button
              type="button"
              onClick={() => {
                setIsListening(!isListening);
                showToast(isListening ? '已暂停语音监听' : '已恢复语音监听');
              }}
              className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                isListening
                  ? 'bg-[#2b593f] text-white hover:bg-[#204430]'
                  : 'bg-[#f1f1ef] text-[#787774] hover:bg-[#e6e6e4]'
              }`}
            >
              {isListening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#2b593f] min-h-[20px]">
              {isProcessing ? '正在执行指令...' : detectedText}
            </p>
            <p className="text-[11px] text-[#787774]">
              支持头盔蓝牙与外放收音，可点击或口述快捷指令
            </p>
          </div>

          {/* Quick Voice Phrases Buttons */}
          <div className="space-y-2 pt-2 text-left">
            <span className="text-[11px] font-medium text-[#787774] block text-center">
              快捷语音口令指令:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => triggerVoiceCommand('call_customer', '呼叫顾客电话')}
                className="p-2.5 bg-[#fafafa] hover:bg-[#f1f1ef] border border-[#e6e6e4] rounded-[3px] text-xs font-medium text-[#37352f] flex items-center gap-2 cursor-pointer transition-all"
              >
                <Phone className="w-4 h-4 text-[#2b593f] shrink-0" />
                <span>“呼叫顾客”</span>
              </button>

              <button
                type="button"
                onClick={() => triggerVoiceCommand('arrive_pickup', '我已到达餐车')}
                className="p-2.5 bg-[#fafafa] hover:bg-[#f1f1ef] border border-[#e6e6e4] rounded-[3px] text-xs font-medium text-[#37352f] flex items-center gap-2 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-[#d9730d] shrink-0" />
                <span>“到达餐车”</span>
              </button>

              <button
                type="button"
                onClick={() => triggerVoiceCommand('nav_next', '导航到下一个送达点')}
                className="p-2.5 bg-[#fafafa] hover:bg-[#f1f1ef] border border-[#e6e6e4] rounded-[3px] text-xs font-medium text-[#37352f] flex items-center gap-2 cursor-pointer transition-all"
              >
                <Navigation className="w-4 h-4 text-[#2383e2] shrink-0" />
                <span>“导航下一站”</span>
              </button>

              <button
                type="button"
                onClick={() => triggerVoiceCommand('arrive_dropoff', '确认送达并拍照')}
                className="p-2.5 bg-[#fafafa] hover:bg-[#f1f1ef] border border-[#e6e6e4] rounded-[3px] text-xs font-medium text-[#37352f] flex items-center gap-2 cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4 text-[#8f6412] shrink-0" />
                <span>“确认已妥投”</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-between text-[11px] text-[#787774]">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-[#2b593f]" />
            <span>智能降噪拾音已开启</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white hover:bg-[#efefed] border border-[#d3d1cb] text-[#37352f] rounded-[3px] cursor-pointer text-xs font-medium"
          >
            退出
          </button>
        </div>
      </div>
    </div>
  );
};
