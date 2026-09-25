import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  X,
  Volume2,
  ShoppingBag,
  Bike,
  Utensils,
  Send,
  RotateCcw,
  MessageSquare,
  Bluetooth,
  Clock,
  CheckCircle2,
  ChevronRight,
  Flame,
  Radio,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order } from '../../types';
import { voiceAlerts, speakText, getVoiceConfig, VOICE_PERSONAS } from '../../utils/voiceAlertEngine';
import { globalBluetoothAudio } from '../../utils/bluetoothAudioEngine';
import { getOrGeneratePickupCode } from '../../utils/pickupCodeEngine';
import { resolveOrderChannelType } from '../../utils/orderNormalizer';
import { SmoothScrollContainer } from './SmoothScrollContainer';

interface GlobalQuickCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders?: Order[];
  showToast: (msg: string) => void;
}

interface CallHistoryItem {
  id: string;
  time: string;
  type: 'pickup' | 'rider' | 'dine_in' | 'custom';
  title: string;
  content: string;
  targetNo?: string;
}

const QUICK_BROADCAST_TEMPLATES = [
  { label: '现烤出炉趁热取', text: '尊敬的顾客，您的菜品已现烤出炉，趁热品尝风味最佳，请前往餐车前台取餐！' },
  { label: '截单打烊前催取', text: '流动餐车即将打烊截单，请已下单自提的顾客尽快出示提货码，前往取餐窗口取餐！' },
  { label: '催促外卖骑手到车', text: '请外卖专送骑手注意，打包台餐品已全齐备好，请尽快到餐车取餐配送！' },
  { label: '传菜员翻台配合', text: '外摆就餐区菜品已备好，请传菜员注意分单上菜，并及时整理空桌翻台！' },
  { label: '雨天骑行安全关怀', text: '雨天路滑，请各位自提食客与骑手师傅注意脚下安全，减速慢行！' },
  { label: '备餐客多稍等致歉', text: '当前点单客流较多，后厨师傅正在全速现制，美味值得等待，感谢您的耐心包容！' }
];

export const GlobalQuickCallModal: React.FC<GlobalQuickCallModalProps> = ({
  isOpen,
  onClose,
  orders = [],
  showToast
}) => {
  const [activeCategory, setActiveCategory] = useState<'pickup' | 'rider' | 'dine_in' | 'custom'>('pickup');
  
  // 自提取餐状态
  const [pickupCodeInput, setPickupCodeInput] = useState<string>('');
  const [pickupLocation, setPickupLocation] = useState<string>('餐车前台取餐窗口');
  
  // 呼叫骑手状态
  const [riderOrderInput, setRiderOrderInput] = useState<string>('');
  const [riderCarrier, setRiderCarrier] = useState<string>('专线/美团骑手');
  
  // 堂食/传菜状态
  const [tableCodeInput, setTableCodeInput] = useState<string>('A2');
  const [partySize, setPartySize] = useState<number>(2);

  // 自由喊话状态
  const [customText, setCustomText] = useState<string>('');

  // 播报历史记录
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>(() => {
    try {
      const cached = localStorage.getItem('obsidian_quick_call_history');
      return cached ? JSON.parse(cached) : [
        {
          id: 'hist-1',
          time: '12:35',
          type: 'pickup',
          title: '自提取餐叫号',
          content: '请 8802 号顾客，到餐车前台取餐，您的餐品已新鲜现制出炉！',
          targetNo: '8802'
        },
        {
          id: 'hist-2',
          time: '12:38',
          type: 'rider',
          title: '外放呼叫骑手',
          content: '请专线骑手注意，订单 8801 已打包出餐，请尽快到流动餐车站台取餐配送！',
          targetNo: '8801'
        }
      ];
    } catch {
      return [];
    }
  });

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const voiceCfg = getVoiceConfig();
  const currentPersona = VOICE_PERSONAS.find((p) => p.id === voiceCfg.persona) || VOICE_PERSONAS[0];
  const activeBtDevice = globalBluetoothAudio.getActiveDevice();

  const addHistory = (type: CallHistoryItem['type'], title: string, content: string, targetNo?: string) => {
    const item: CallHistoryItem = {
      id: `call-${Date.now()}`,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      title,
      content,
      targetNo
    };
    setCallHistory((prev) => {
      const next = [item, ...prev.slice(0, 7)];
      try {
        localStorage.setItem('obsidian_quick_call_history', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const triggerVoiceWithFeedback = (text: string, onDone?: () => void) => {
    setIsSpeaking(true);
    speakText(text, {
      chimeType: 'call',
      onEnd: () => {
        setIsSpeaking(false);
        onDone?.();
      }
    });
    // Fallback timer to reset speaking animation
    setTimeout(() => {
      setIsSpeaking(false);
    }, 4500);
  };

  // 1. 广播自提取餐
  const handleBroadcastPickup = (targetCode?: string) => {
    const code = (targetCode || pickupCodeInput || '').trim();
    if (!code) {
      showToast('请输入或选择需要呼叫的自提单号/取件码！');
      return;
    }
    const cleanNo = code.replace(/^#/, '');
    const broadcastText = `请——${cleanNo} 号顾客，到 ${pickupLocation} 取餐。您的餐品已新鲜制作完成，祝您用餐愉快！`;
    triggerVoiceWithFeedback(broadcastText);
    addHistory('pickup', `自提叫号 #${cleanNo}`, broadcastText, cleanNo);
    showToast(`已向外放广播呼叫自提顾客: #${cleanNo}！`);
  };

  // 2. 广播呼叫骑手
  const handleBroadcastRider = (targetNo?: string) => {
    const ordNo = (targetNo || riderOrderInput || '').trim();
    if (!ordNo) {
      showToast('请输入或选择需要呼叫的外卖单号！');
      return;
    }
    const cleanNo = ordNo.replace(/^#/, '');
    const broadcastText = `请${riderCarrier}注意，订单 ${cleanNo} 已打包出餐，请尽快到流动餐车站台取餐配送！`;
    triggerVoiceWithFeedback(broadcastText);
    addHistory('rider', `呼叫骑手 #${cleanNo}`, broadcastText, cleanNo);
    showToast(`已向站台外放呼叫骑手: 订单 #${cleanNo} 取餐！`);
  };

  // 3. 广播堂食/传菜
  const handleBroadcastDineIn = (action: 'call_table' | 'call_runner') => {
    const tbl = (tableCodeInput || 'A2').trim();
    if (action === 'call_table') {
      const broadcastText = `请——${tbl} 号顾客，${partySize} 人桌位已准备就绪，请移步堂食就餐区就餐！`;
      triggerVoiceWithFeedback(broadcastText);
      addHistory('dine_in', `堂食领位 ${tbl}号`, broadcastText, tbl);
      showToast(`已广播堂食领位: ${tbl} 号桌入座！`);
    } else {
      const broadcastText = `叮咚！${tbl} 桌菜品已备齐出餐，请传菜员及时上菜！`;
      triggerVoiceWithFeedback(broadcastText);
      addHistory('dine_in', `传菜通知 ${tbl}号`, broadcastText, tbl);
      showToast(`已广播通知传菜员: ${tbl} 号桌菜品出餐！`);
    }
  };

  // 4. 广播自定义文本
  const handleBroadcastCustom = (textToSend?: string) => {
    const text = (textToSend || customText || '').trim();
    if (!text) {
      showToast('请输入需要即时广播的外放语音文本！');
      return;
    }
    triggerVoiceWithFeedback(text);
    addHistory('custom', '自定义广播', text);
    showToast('广播已发送至外放音响！');
  };

  // 提取当前进行中的真实订单（按自提/外卖归类）
  const activePickupOrders = orders.filter(
    (o) => resolveOrderChannelType(o) === 'pickup' && !['completed', 'refunded', 'cancelled'].includes(o.status)
  );

  const activeDeliveryOrders = orders.filter(
    (o) => resolveOrderChannelType(o) === 'delivery' && !['completed', 'refunded', 'cancelled'].includes(o.status)
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="bg-[#ffffff] w-full max-w-xl rounded-[4px] border border-[#d3d1cb] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[#1a1c1b]"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-white text-[#201f1d] border-b border-[#e6e6e4] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white border border-[#1a1918] text-[#1a1918] flex items-center justify-center font-normal shadow-2xs">
                <Megaphone className="w-3.5 h-3.5 text-[#1a1918]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-normal text-sm leading-tight text-[#201f1d]">全局即时喊号广播小窗</h3>
                  <span className="text-[10px] font-mono bg-neutral-100 text-[#201f1d] border border-neutral-300 px-1.5 py-0.2 rounded-full font-normal">
                    全域快捷
                  </span>
                </div>
                <p className="text-[11px] text-[#787774]">流动餐车外放喇叭 · 蓝牙音箱立体声联动</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Soundwave animation */}
              {isSpeaking && (
                <div className="flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 border border-emerald-300 rounded-full text-emerald-800 text-[10px] font-mono">
                  <span className="w-1 h-3 bg-emerald-500 animate-pulse" />
                  <span className="w-1 h-4 bg-emerald-500 animate-pulse delay-75" />
                  <span className="w-1 h-2 bg-emerald-500 animate-pulse delay-150" />
                  <span className="ml-1 font-normal">播报中...</span>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[#787774] hover:text-[#201f1d] hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                title="关闭浮窗 (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Audio Output Status Strip */}
          <div className="px-4 py-2 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-[#37352f] font-medium bg-white px-2 py-0.5 rounded border border-[#e6e6e4]">
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>播报音色: <strong>{currentPersona.name}</strong></span>
              </span>

              <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border ${
                activeBtDevice && activeBtDevice.status === 'connected'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-neutral-100 text-neutral-600 border-neutral-200'
              }`}>
                <Bluetooth className="w-3 h-3 text-blue-600" />
                <span>{activeBtDevice?.status === 'connected' ? `已连: ${activeBtDevice.name}` : '本地扬声器输出'}</span>
              </span>
            </div>

            <span className="text-[10px] text-[#787774] font-mono">快捷键: Alt+C</span>
          </div>

          {/* Category Tabs */}
          <div className="flex border-b border-[#e6e6e4] bg-[#fafafa] px-3 pt-2 gap-1 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveCategory('pickup')}
              className={`px-3 py-1.5 text-xs font-bold rounded-t-[3px] border-t border-x transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'pickup'
                  ? 'bg-white text-blue-900 border-[#d3d1cb] border-b-transparent -mb-[1px] shadow-2xs'
                  : 'bg-transparent text-[#787774] border-transparent hover:text-[#37352f]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
              <span>自提叫号</span>
              {activePickupOrders.length > 0 && (
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1 py-0.2 rounded-full">
                  {activePickupOrders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('rider')}
              className={`px-3 py-1.5 text-xs font-bold rounded-t-[3px] border-t border-x transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'rider'
                  ? 'bg-white text-amber-900 border-[#d3d1cb] border-b-transparent -mb-[1px] shadow-2xs'
                  : 'bg-transparent text-[#787774] border-transparent hover:text-[#37352f]'
              }`}
            >
              <Bike className="w-3.5 h-3.5 text-amber-600" />
              <span>呼叫骑手</span>
              {activeDeliveryOrders.length > 0 && (
                <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-1 py-0.2 rounded-full">
                  {activeDeliveryOrders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('dine_in')}
              className={`px-3 py-1.5 text-xs font-bold rounded-t-[3px] border-t border-x transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'dine_in'
                  ? 'bg-white text-emerald-900 border-[#d3d1cb] border-b-transparent -mb-[1px] shadow-2xs'
                  : 'bg-transparent text-[#787774] border-transparent hover:text-[#37352f]'
              }`}
            >
              <Utensils className="w-3.5 h-3.5 text-emerald-600" />
              <span>堂食传菜</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('custom')}
              className={`px-3 py-1.5 text-xs font-bold rounded-t-[3px] border-t border-x transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'custom'
                  ? 'bg-white text-purple-900 border-[#d3d1cb] border-b-transparent -mb-[1px] shadow-2xs'
                  : 'bg-transparent text-[#787774] border-transparent hover:text-[#37352f]'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-purple-600" />
              <span>自由广播</span>
            </button>
          </div>

          {/* Tab Contents */}
          <SmoothScrollContainer className="p-4 space-y-4" maxHeight="calc(85vh - 160px)">
            {/* 1. 自提叫号 */}
            {activeCategory === 'pickup' && (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#37352f] flex items-center justify-between">
                    <span>输入顾客自提单号 / 取餐码:</span>
                    <span className="text-[11px] font-normal text-[#787774]">支持如: 8802、A-12、6889</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pickupCodeInput}
                      onChange={(e) => setPickupCodeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleBroadcastPickup()}
                      placeholder="例如: 8802"
                      className="flex-1 px-3 py-2 bg-white border border-[#d3d1cb] rounded-[3px] text-sm font-mono font-bold focus:outline-none focus:border-[#2b593f]"
                    />
                    <button
                      type="button"
                      onClick={() => handleBroadcastPickup()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-[3px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>呼叫取餐</span>
                    </button>
                  </div>
                </div>

                {/* 取餐引导位置微调 */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#787774] shrink-0">指引位置:</span>
                  {['餐车前台取餐窗口', '01号智能保温柜', '侧面自提点'].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setPickupLocation(loc)}
                      className={`px-2 py-0.5 text-[11px] rounded-[2px] border cursor-pointer transition-colors ${
                        pickupLocation === loc
                          ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold'
                          : 'bg-white text-[#787774] border-[#e6e6e4] hover:border-[#37352f]'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>

                {/* 当前待自提活跃订单一键直呼 */}
                {activePickupOrders.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-dashed border-[#e6e6e4]">
                    <span className="text-[11px] font-bold text-[#787774] block">进行中自提订单 (点击一键广播):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activePickupOrders.map((ord) => {
                        const code = getOrGeneratePickupCode(ord.orderNo, ord.pickupCode);
                        return (
                          <button
                            key={ord.id || ord.orderNo}
                            type="button"
                            onClick={() => {
                              setPickupCodeInput(code);
                              handleBroadcastPickup(code);
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-[3px] font-mono text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="点击直接广播喊号"
                          >
                            <span>#{code}</span>
                            <span className="text-[10px] text-blue-600 font-normal">
                              ({ord.items[0]?.name?.slice(0, 4)}...)
                            </span>
                            <Megaphone className="w-2.5 h-2.5 text-blue-700 ml-0.5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. 呼叫骑手 */}
            {activeCategory === 'rider' && (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#37352f] flex items-center justify-between">
                    <span>输入外卖专送单号:</span>
                    <span className="text-[11px] font-normal text-[#787774]">支持工单尾号或完整单号</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={riderOrderInput}
                      onChange={(e) => setRiderOrderInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleBroadcastRider()}
                      placeholder="例如: 8803"
                      className="flex-1 px-3 py-2 bg-white border border-[#d3d1cb] rounded-[3px] text-sm font-mono font-bold focus:outline-none focus:border-[#2b593f]"
                    />
                    <button
                      type="button"
                      onClick={() => handleBroadcastRider()}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-[3px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform"
                    >
                      <Bike className="w-3.5 h-3.5" />
                      <span>呼叫骑手</span>
                    </button>
                  </div>
                </div>

                {/* 配送方/渠道 */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#787774] shrink-0">指派骑手:</span>
                  {['专线/美团骑手', '顺丰同城专送', '黑曜石自营专线', '蜂鸟/饿了么骑手'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setRiderCarrier(c)}
                      className={`px-2 py-0.5 text-[11px] rounded-[2px] border cursor-pointer transition-colors ${
                        riderCarrier === c
                          ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                          : 'bg-white text-[#787774] border-[#e6e6e4] hover:border-[#37352f]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {/* 进行中外卖订单一键快捷呼叫 */}
                {activeDeliveryOrders.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-dashed border-[#e6e6e4]">
                    <span className="text-[11px] font-bold text-[#787774] block">待取外卖订单 (点击一键呼叫骑手):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeDeliveryOrders.map((ord) => {
                        const cleanNo = ord.orderNo.replace(/^#/, '');
                        return (
                          <button
                            key={ord.id || ord.orderNo}
                            type="button"
                            onClick={() => {
                              setRiderOrderInput(cleanNo);
                              handleBroadcastRider(cleanNo);
                            }}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-[3px] font-mono text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="点击呼叫该单骑手"
                          >
                            <span>#{cleanNo}</span>
                            <span className="text-[10px] text-amber-700 font-normal">
                              ({ord.courierName ? ord.courierName.split(' ')[0] : '待接单'})
                            </span>
                            <Bike className="w-2.5 h-2.5 text-amber-700 ml-0.5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. 堂食/传菜 */}
            {activeCategory === 'dine_in' && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#37352f]">桌台编号 / 排队号:</label>
                    <input
                      type="text"
                      value={tableCodeInput}
                      onChange={(e) => setTableCodeInput(e.target.value)}
                      placeholder="例如: A2、B05"
                      className="w-full px-3 py-1.5 bg-white border border-[#d3d1cb] rounded-[3px] text-sm font-bold font-mono focus:outline-none focus:border-[#2b593f]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#37352f]">就餐人数:</label>
                    <div className="flex gap-1">
                      {[1, 2, 4, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setPartySize(num)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-[3px] border cursor-pointer ${
                            partySize === num
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-white text-[#787774] border-[#d3d1cb] hover:bg-neutral-50'
                          }`}
                        >
                          {num}人
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleBroadcastDineIn('call_table')}
                    className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-[3px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    <span>呼叫顾客入座</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBroadcastDineIn('call_runner')}
                    className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-[3px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>通知传菜员上菜</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. 自由喊话 */}
            {activeCategory === 'custom' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#37352f] flex items-center justify-between">
                    <span>输入自由喊话语音文本:</span>
                    <span className="text-[10px] text-[#787774]">真人体感 · 自然和弦前奏</span>
                  </label>
                  <textarea
                    rows={2}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="输入需要餐车外放广播的任何内容，例如：夜市烤串已现烤出炉，欢迎品尝！"
                    className="w-full px-3 py-2 bg-white border border-[#d3d1cb] rounded-[3px] text-xs focus:outline-none focus:border-[#2b593f] resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleBroadcastCustom()}
                      className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-[3px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>立即广播发送</span>
                    </button>
                  </div>
                </div>

                {/* 常用预设快捷模板 */}
                <div className="space-y-1.5 pt-1 border-t border-dashed border-[#e6e6e4]">
                  <span className="text-[11px] font-bold text-[#787774]">常用场景一键喊话:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {QUICK_BROADCAST_TEMPLATES.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setCustomText(tpl.text);
                          handleBroadcastCustom(tpl.text);
                        }}
                        className="p-2 text-left bg-[#fbfbfa] hover:bg-[#f1f1ef] border border-[#e6e6e4] hover:border-[#37352f] rounded-[3px] transition-colors cursor-pointer group"
                      >
                        <div className="font-bold text-xs text-[#37352f] group-hover:text-[#2b593f] flex items-center justify-between">
                          <span>{tpl.label}</span>
                          <Megaphone className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 text-[#2b593f]" />
                        </div>
                        <p className="text-[10px] text-[#787774] line-clamp-1 mt-0.5">{tpl.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 最近广播历史 (支持一键重播) */}
            {callHistory.length > 0 && (
              <div className="pt-3 border-t border-[#e6e6e4] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#37352f] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#787774]" />
                    <span>最近播报记录 (点击一键重播)</span>
                  </span>
                  <span className="text-[10px] text-[#787774]">共保留 {callHistory.length} 条</span>
                </div>

                <div className="space-y-1">
                  {callHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 bg-[#fbfbfa] border border-[#e6e6e4] rounded-[3px] flex items-center justify-between gap-2 text-xs hover:border-[#37352f] transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-[#787774]">{item.time}</span>
                          <span className="font-bold text-xs text-[#37352f]">{item.title}</span>
                          {item.targetNo && (
                            <span className="font-mono font-bold text-[10px] bg-neutral-200 text-neutral-800 px-1 py-0.2 rounded">
                              #{item.targetNo}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#787774] truncate">{item.content}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          triggerVoiceWithFeedback(item.content);
                          showToast(`重播广播: ${item.title}`);
                        }}
                        className="px-2 py-1 bg-white hover:bg-neutral-100 text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                        title="再次广播当前内容"
                      >
                        <RotateCcw className="w-3 h-3 text-[#2b593f]" />
                        <span>重播</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SmoothScrollContainer>

          {/* Modal Footer */}
          <div className="p-3 bg-[#fafafa] border-t border-[#e6e6e4] flex items-center justify-between text-xs shrink-0">
            <span className="text-[#787774] text-[11px]">
              提示: 广播将自动优先走已连接的蓝牙外放大喇叭或设备高清声学通道
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white border border-[#d3d1cb] hover:bg-neutral-100 text-neutral-800 font-normal rounded-full cursor-pointer transition-colors shadow-2xs"
            >
              关闭
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
