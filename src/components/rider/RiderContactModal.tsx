import React, { useState, useEffect } from 'react';
import {
  Phone,
  MessageSquare,
  Send,
  X,
  ShieldCheck,
  PhoneCall,
  PhoneOff,
  User,
  Clock,
  Sparkles,
  Check,
  Bike
} from 'lucide-react';
import { UnifiedOmniChatModal } from '../chat/UnifiedOmniChatModal';
import { Order } from '../../types';

interface RiderContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetPhone: string;
  targetRole: 'truck' | 'customer';
  orderNo: string;
  order?: Order;
  showToast: (msg: string) => void;
}

export const RiderContactModal: React.FC<RiderContactModalProps> = ({
  isOpen,
  onClose,
  targetName,
  targetPhone,
  targetRole,
  orderNo,
  order,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'call' | 'sms'>('chat');
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [customMsg, setCustomMsg] = useState<string>('');
  const [sentMessages, setSentMessages] = useState<string[]>([]);

  // Default quick SMS presets based on target
  const presets =
    targetRole === 'customer'
      ? [
          '您好！黑曜石餐车专送骑手已出发，预计 4 分钟送达，请保持电话畅通。',
          '您好！餐品已放置在 12F 前台外卖暂存架上，祝您用餐愉快！',
          '您好！由于大楼门禁管制，我已到达楼下大堂，请问是否方便下楼取餐？',
          '餐品温度极高，已放入专用双层 68℃ 保温箱中，已为您加急配送中。'
        ]
      : [
          '列车长您好，我是本单骑手，已到大悦城南广场餐车站台前，请问几号窗口取餐？',
          '列车长您好，本单碳烤和牛小汉堡双重奏是否已出炉打包完成？',
          '已到餐车，待出餐后请直接呼叫我。'
        ];

  // Call timer effect
  useEffect(() => {
    let timer: any = null;
    if (callState === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  useEffect(() => {
    if (isOpen) {
      setCallState('idle');
      setCallDuration(0);
      setCustomMsg('');
    }
  }, [isOpen]);

  const handleStartCall = () => {
    setCallState('calling');
    showToast(`正在通过虚拟隐私中间号呼叫【${targetName}】...`);
    setTimeout(() => {
      setCallState('connected');
      setCallDuration(1);
    }, 2000);
  };

  const handleEndCall = () => {
    setCallState('ended');
    showToast(`通话已结束，时长 ${callDuration} 秒`);
    setTimeout(() => {
      setCallState('idle');
    }, 1500);
  };

  const handleSendPreset = (text: string) => {
    setSentMessages((prev) => [...prev, text]);
    showToast(`短信已即时推送至【${targetName}】手机终端！`);
  };

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    setSentMessages((prev) => [...prev, customMsg.trim()]);
    showToast(`消息已发送: ${customMsg.trim()}`);
    setCustomMsg('');
  };

  if (!isOpen) return null;

  // If chat tab is selected, render the UnifiedOmniChatModal with rider perspective
  if (activeTab === 'chat') {
    return (
      <UnifiedOmniChatModal
        isOpen={isOpen}
        onClose={onClose}
        order={order}
        orderNo={orderNo}
        viewerRole="rider"
        showToast={showToast}
      />
    );
  }

  const formatSeconds = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-[#37352f] w-full max-w-md rounded-3xl border border-[#d3d1cb] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-[#181816] text-white border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-neutral-800 text-emerald-400 flex items-center justify-center border border-neutral-700">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-white block">
                {targetRole === 'customer' ? `联系顾客 · ${targetName}` : `联系餐车站 · ${targetName}`}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">关联订单: {orderNo}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#e6e6e4] bg-[#fbfbfa] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 border-transparent text-[#787774] hover:text-black cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>三端气泡聊天</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('call')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'call'
                ? 'border-[#2b593f] text-[#2b593f] bg-white'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>隐私号直拨</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sms')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'sms'
                ? 'border-[#2b593f] text-[#2b593f] bg-white'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>快捷短信</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3.5">
          {activeTab === 'call' && (
            <div className="space-y-4 text-center py-3">
              {callState === 'idle' && (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#edf3ec] border border-[#c4dcbc] mx-auto flex items-center justify-center shadow-inner">
                    <Phone className="w-7 h-7 text-[#2b593f]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-[#37352f]">{targetName}</h4>
                    <p className="font-mono text-xs text-[#787774]">{targetPhone}</p>
                    <p className="text-[11px] text-[#9b9a97]">双向号码隐藏 · 通话全程录音保障配送服务质量</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartCall}
                    className="w-full py-2.5 bg-[#2b593f] hover:bg-[#204430] active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>立即一键拨打</span>
                  </button>
                </div>
              )}

              {callState === 'calling' && (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#fbf3db] border border-[#ecd9a8] mx-auto flex items-center justify-center animate-bounce">
                    <PhoneCall className="w-7 h-7 text-[#d9730d]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-[#37352f]">{targetName}</h4>
                    <p className="text-xs text-[#d9730d] font-semibold flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#d9730d] animate-ping" />
                      <span>正在接通虚拟总机，请稍候...</span>
                    </p>
                  </div>
                </div>
              )}

              {callState === 'connected' && (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#edf3ec] border border-[#4dab63] mx-auto flex items-center justify-center animate-pulse">
                    <Phone className="w-7 h-7 text-[#2b593f]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-[#37352f]">{targetName} (通话中)</h4>
                    <p className="font-mono font-bold text-base text-[#2b593f]">
                      {formatSeconds(callDuration)}
                    </p>
                    <p className="text-[10.5px] text-[#4dab63]">HD 高清数字降噪通话</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleEndCall}
                    className="w-full py-2.5 bg-[#eb5757] hover:bg-[#cf3f3f] active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>挂断通话</span>
                  </button>
                </div>
              )}

              {callState === 'ended' && (
                <div className="space-y-2 py-4">
                  <div className="w-12 h-12 rounded-full bg-[#f1f1ef] mx-auto flex items-center justify-center">
                    <PhoneOff className="w-6 h-6 text-[#787774]" />
                  </div>
                  <p className="text-xs font-bold text-[#787774]">通话已结束</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sms' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[#787774] block">常用极速模版 (点击即发):</span>
                <div className="space-y-1.5">
                  {presets.map((msg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendPreset(msg)}
                      className="w-full text-left p-2.5 rounded-xl border border-[#e6e6e4] hover:border-[#2b593f] hover:bg-[#edf3ec] text-xs text-[#37352f] transition-all cursor-pointer flex items-start gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#2b593f] shrink-0 mt-0.5" />
                      <span className="flex-1 leading-snug">{msg}</span>
                    </button>
                  ))}
                </div>
              </div>

              {sentMessages.length > 0 && (
                <div className="pt-2 border-t border-[#efefed] space-y-1.5">
                  <span className="text-[11px] font-bold text-[#787774] block">本次任务已发短信:</span>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {sentMessages.map((m, i) => (
                      <div key={i} className="p-2 bg-[#f1f1ef] rounded-lg text-[11px] text-[#5a5854] flex items-center justify-between">
                        <span className="truncate pr-2">{m}</span>
                        <span className="text-[10px] text-[#4dab63] font-semibold shrink-0">✓ 已送达</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSendCustom} className="pt-2 border-t border-[#efefed] flex gap-2">
                <input
                  type="text"
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="输入自定义短信发送给对方..."
                  className="flex-1 px-3 py-1.5 bg-[#f7f7f5] border border-[#d3d1cb] rounded-xl text-xs focus:outline-none focus:border-[#2b593f]"
                />
                <button
                  type="submit"
                  disabled={!customMsg.trim()}
                  className="px-3 py-1.5 bg-[#2b593f] hover:bg-[#204430] disabled:opacity-40 text-white rounded-xl font-semibold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>发送</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
