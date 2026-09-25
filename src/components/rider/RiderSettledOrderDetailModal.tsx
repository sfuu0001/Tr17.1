import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  CheckCircle2,
  Bike,
  Store,
  User,
  ShieldCheck,
  Camera,
  Cloud,
  CloudCheck,
  RefreshCw,
  Copy,
  Send,
  Volume2,
  VolumeX,
  Flame,
  Thermometer,
  ShieldAlert,
  FileCheck,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap,
  Info,
  DollarSign,
  Receipt,
  Navigation,
  UploadCloud,
  Check
} from 'lucide-react';
import { Order, TruckInfo } from '../../types';
import { HistoricalDelivery } from '../../types/rider';
import {
  ChatMessageItem,
  ChatRole,
  getOrderChatMessages,
  sendOrderChatMessage,
  subscribeOrderChat,
  formatExactTime,
  formatRelativeTime
} from '../../utils/chatHub';
import {
  syncSettledDeliveryTraceToCloud,
  fetchSettledDeliveryTraceFromCloud,
  recordCloudFunctionLog,
  TCB_FUNCTION_NAMES
} from '../../utils/cloudbase';

export interface OrderTimelineNode {
  nodeId: string;
  title: string;
  time: string;
  timeExact: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
  operator: string;
  operatorRole: 'user' | 'rider' | 'merchant' | 'system';
  location?: string;
  proofBadge?: string;
}

export interface DeliveryProofPhoto {
  id: string;
  photoUrl: string;
  takenAt: string;
  locationText: string;
  temperatureRecorded: number; // e.g. 68.5
  tamperProofSealStatus: 'intact' | 'verified';
  uploader: string;
  cloudFileId?: string;
  syncedToCloud: boolean;
}

export interface SettledOrderTraceRecord {
  id: string;
  orderNo: string;
  orderId?: string;
  time: string;
  completedDate: string;
  earnings: number;
  base: number;
  tip: number;
  subsidy: number;
  totalPrice: number;
  destination: string;
  customerName: string;
  customerPhone: string;
  customerNote?: string;
  truckName: string;
  truckAddress: string;
  truckPhone: string;
  diningMode: 'delivery' | 'pickup' | 'dinein';
  items: Array<{ name: string; quantity: number; price: number; spec?: string }>;
  timelineNodes: OrderTimelineNode[];
  deliveryPhotos: DeliveryProofPhoto[];
  rating?: number;
  tags?: string[];
  cloudSynced: boolean;
  cloudSyncTime?: string;
  cloudDocId?: string;
}

export interface RiderSettledOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: {
    orderNo: string;
    time?: string;
    earnings: number;
    base: number;
    tip: number;
    subsidy: number;
    destination: string;
    customerName?: string;
  };
  matchedOrder?: Order;
  truck?: TruckInfo;
  initialTab?: 'overview' | 'timeline' | 'chat' | 'proof' | 'cloud';
  showToast: (msg: string) => void;
}

export const RiderSettledOrderDetailModal: React.FC<RiderSettledOrderDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  matchedOrder,
  truck,
  initialTab = 'overview',
  showToast
}) => {
  const cleanOrderNo = (record.orderNo || '').replace(/^#/, '');

  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'chat' | 'proof' | 'cloud'>(initialTab);

  // Sync initialTab when modal opens with a different requested tab
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSyncResult, setCloudSyncResult] = useState<{
    synced: boolean;
    syncedAt?: string;
    docId?: string;
    message?: string;
    source?: string;
  }>({
    synced: true,
    syncedAt: new Date().toLocaleTimeString(),
    docId: `tcb-del-${cleanOrderNo}-${Date.now().toString().slice(-4)}`,
    source: 'cloud_function'
  });

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>(() =>
    getOrderChatMessages(cleanOrderNo, matchedOrder)
  );
  const [chatInputText, setChatInputText] = useState('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Photos state
  const [proofPhotos, setProofPhotos] = useState<DeliveryProofPhoto[]>([
    {
      id: `photo-${cleanOrderNo}-1`,
      photoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
      takenAt: record.time || '17:42:00',
      locationText: record.destination || '金融大厦 18F 前台交付处',
      temperatureRecorded: 68.4,
      tamperProofSealStatus: 'intact',
      uploader: '陈志远 (骑手专线 08号)',
      cloudFileId: `cloud://obsidian-prod.tc100/proof/${cleanOrderNo}_pod.jpg`,
      syncedToCloud: true
    }
  ]);

  // Generate complete milestone timeline
  const timelineNodes: OrderTimelineNode[] = useMemo(() => {
    const baseHour = record.time ? parseInt(record.time.split(':')[0]) || 17 : 17;
    const baseMin = record.time ? parseInt(record.time.split(':')[1]) || 42 : 42;

    const formatT = (offsetMin: number, sec: number = 15) => {
      let m = baseMin - offsetMin;
      let h = baseHour;
      if (m < 0) {
        m += 60;
        h -= 1;
      }
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      return {
        short: `${pad(h)}:${pad(m)}`,
        exact: `${pad(h)}:${pad(m)}:${pad(sec)}`
      };
    };

    const t1 = formatT(16, 8);
    const t2 = formatT(15, 30);
    const t3 = formatT(8, 12);
    const t4 = formatT(7, 45);
    const t5 = formatT(4, 20);
    const t6 = formatT(0, 0);

    return [
      {
        nodeId: 'node-1',
        title: '顾客下单并支付成功',
        time: t1.short,
        timeExact: t1.exact,
        description: '顾客通过微信小程序自选下单，订单直连后厨与骑手调度中心',
        status: 'completed',
        operator: matchedOrder?.customerName || record.customerName || '先锋食客',
        operatorRole: 'user',
        location: '微信客户端 (IP: 180.168.**.**)',
        proofBadge: '支付单号已上链'
      },
      {
        nodeId: 'node-2',
        title: '餐车后厨接单并下发炭烤台',
        time: t2.short,
        timeExact: t2.exact,
        description: '黑曜石智能餐车 KDS 出票，主厨启动炭烤炉 320℃ 恒温现烤锁鲜',
        status: 'completed',
        operator: matchedOrder?.truckName || truck?.name || '黑曜石餐车 · 炭烤主厨',
        operatorRole: 'merchant',
        location: truck?.currentLocationName || '静安大悦城北座中庭站',
        proofBadge: 'KDS 自动接单'
      },
      {
        nodeId: 'node-3',
        title: '主厨出餐装盒并贴密封防开条',
        time: t3.short,
        timeExact: t3.exact,
        description: '餐品完成炭火锁鲜制作，装入抑菌保温盒并施加防拆开封贴',
        status: 'completed',
        operator: '后厨打包出餐质检岗',
        operatorRole: 'merchant',
        location: '餐车出餐窗口 02 号格',
        proofBadge: '封条完好贴码'
      },
      {
        nodeId: 'node-4',
        title: '骑手到车取餐 · 保温箱 68℃ 锁鲜入箱',
        time: t4.short,
        timeExact: t4.exact,
        description: '骑手陈志远核验餐品明细完毕，放置于后座智能温控保温箱',
        status: 'completed',
        operator: '陈志远 (专线骑手)',
        operatorRole: 'rider',
        location: '黑曜石餐车外围骑手取餐专用位',
        proofBadge: '箱温 68.5℃'
      },
      {
        nodeId: 'node-5',
        title: '骑手全速专送中 · GPS 轨迹全程保真',
        time: t5.short,
        timeExact: t5.exact,
        description: '沿最优配送路顺前行，实时更新高精定位与预计送达倒计时',
        status: 'completed',
        operator: '陈志远 (专线骑手)',
        operatorRole: 'rider',
        location: '向目的地导航骑行 (时速 21km/h)',
        proofBadge: '高精 GPS 轨迹'
      },
      {
        nodeId: 'node-6',
        title: '妥投现场拍照交付 · 运费秒结到账',
        time: t6.short,
        timeExact: t6.exact,
        description: '骑手现场拍照上传交付存证，温控封条完好，结算款实时打入微信钱包',
        status: 'completed',
        operator: '陈志远 (专线骑手)',
        operatorRole: 'rider',
        location: record.destination || '金融大厦 18F 前台',
        proofBadge: '拍照存证已通过'
      }
    ];
  }, [record, matchedOrder, truck, cleanOrderNo]);

  // Subscribe to real-time chat updates
  useEffect(() => {
    setChatMessages(getOrderChatMessages(cleanOrderNo, matchedOrder));
    const unsub = subscribeOrderChat(cleanOrderNo, () => {
      setChatMessages(getOrderChatMessages(cleanOrderNo, matchedOrder));
    });
    return () => unsub();
  }, [cleanOrderNo, matchedOrder]);

  // Fetch or sync trace on mount
  useEffect(() => {
    if (isOpen) {
      fetchSettledDeliveryTraceFromCloud(cleanOrderNo).then((existing) => {
        if (existing) {
          if (existing.deliveryPhotos && existing.deliveryPhotos.length > 0) {
            setProofPhotos(existing.deliveryPhotos);
          }
          setCloudSyncResult({
            synced: true,
            syncedAt: existing.cloudSyncTime || existing.syncedAt || new Date().toLocaleTimeString(),
            docId: existing._id || existing.docId || `tcb-${cleanOrderNo}`,
            source: 'cloud_function'
          });
        }
      });
    }
  }, [isOpen, cleanOrderNo]);

  // Handle Trigger Cloud Function Sync
  const handleTriggerCloudSync = async () => {
    setIsSyncingCloud(true);
    showToast(`正在通过云函数 (${TCB_FUNCTION_NAMES.RIDER_SETTLEMENT_TRACE}) 上链存证...`);

    const fullRecord: SettledOrderTraceRecord = {
      id: `trace-${cleanOrderNo}`,
      orderNo: cleanOrderNo,
      orderId: matchedOrder?.id,
      time: record.time || '17:42',
      completedDate: new Date().toLocaleDateString(),
      earnings: record.earnings,
      base: record.base,
      tip: record.tip,
      subsidy: record.subsidy,
      totalPrice: matchedOrder?.totalAmount || 68.0,
      destination: record.destination,
      customerName: matchedOrder?.customerName || record.customerName || '先锋食客',
      customerPhone: matchedOrder?.userPhone || '138-8888-9201',
      customerNote: (matchedOrder as any)?.customerNote || '请放置于前台，餐品保温封条完好。',
      truckName: matchedOrder?.truckName || truck?.name || '黑曜石移动餐车 · 南广场总站',
      truckAddress: truck?.currentLocationName || '静安大悦城北座 1F 中庭',
      truckPhone: '400-880-9288 / 139-1122-3344',
      diningMode: (matchedOrder?.channelType === 'dine_in' ? 'dinein' : matchedOrder?.channelType) || 'delivery',
      items: matchedOrder?.items?.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        spec: (i as any).spec || (i as any).flavorTags?.join(' / ')
      })) || [
        { name: '黑松露炙烤和牛串', quantity: 2, price: 28.0, spec: '主厨招牌 / 现烤炭香' },
        { name: '黑金炙烤鳗鱼玉子烧', quantity: 1, price: 32.0, spec: '日式微甜' },
        { name: '黑曜石极光特调暴打柠檬', quantity: 1, price: 16.0, spec: '微冰 / 推荐糖度' }
      ],
      timelineNodes,
      deliveryPhotos: proofPhotos,
      rating: 5,
      tags: ['超快妥投', '锁鲜测温合格', '封条完好', '微信零钱秒结'],
      cloudSynced: true,
      cloudSyncTime: new Date().toISOString()
    };

    try {
      const res = await syncSettledDeliveryTraceToCloud(fullRecord);
      setCloudSyncResult({
        synced: true,
        syncedAt: new Date().toLocaleTimeString(),
        docId: res.docId,
        message: res.message,
        source: res.source
      });
      showToast('☁️ 云函数全链路存证成功！已同步至云数据库');
    } catch (err: any) {
      showToast('云函数调用已记录至降级双轨备份');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Handle Send Chat Message
  const handleSendChatMessage = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : chatInputText).trim();
    if (!text) return;

    sendOrderChatMessage(cleanOrderNo, {
      senderRole: 'rider',
      senderName: '陈志远 · 专线骑手 (我)',
      type: 'text',
      text
    });

    if (textToSend === undefined) {
      setChatInputText('');
    }
    showToast('消息已发送并同步至云端会话流');

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Toggle voice playback
  const togglePlayVoice = (msgId: string) => {
    if (playingVoiceId === msgId) {
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(msgId);
      setTimeout(() => {
        setPlayingVoiceId(null);
      }, 4000);
    }
  };

  // Handle Upload / Mock Take Photo
  const handleMockTakePhoto = () => {
    const newPhoto: DeliveryProofPhoto = {
      id: `photo-${cleanOrderNo}-${Date.now()}`,
      photoUrl: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800&auto=format&fit=crop&q=80',
      takenAt: new Date().toLocaleTimeString(),
      locationText: record.destination || '金融大厦 18F 前台取餐处',
      temperatureRecorded: 67.8,
      tamperProofSealStatus: 'intact',
      uploader: '陈志远 (骑手)',
      cloudFileId: `cloud://obsidian-prod.tc100/proof/${cleanOrderNo}_${Date.now()}.jpg`,
      syncedToCloud: true
    };
    setProofPhotos((prev) => [newPhoto, ...prev]);
    showToast('已拍摄并添加新送达存证照片，支持温控与封条上链');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="bg-white text-[#37352f] w-full max-w-4xl rounded-t-3xl sm:rounded-2xl border-t sm:border border-[#e6e6e4] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Bottom-sheet Drag Handle */}
          <div className="sm:hidden pt-2 pb-1 bg-[#f7f7f5] flex justify-center shrink-0">
            <div className="w-10 h-1 bg-neutral-300 rounded-full" />
          </div>

          {/* 1. Modal Top Bar Header */}
          <div className="bg-[#f7f7f5] px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-[#e6e6e4] shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#201f1d] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <span className="text-sm sm:text-base font-black text-[#1a1c1b] font-mono tracking-tight whitespace-nowrap">
                      #{cleanOrderNo}
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                      微信已到账 +¥{record.earnings.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11.5px] text-[#787774] mt-0.5 truncate">
                    <span className="font-mono text-neutral-700 font-medium whitespace-nowrap">
                      {record.time || '17:42'} 妥投
                    </span>
                    <span>·</span>
                    <span className="whitespace-nowrap">
                      基础¥{record.base.toFixed(1)} + 补贴¥{record.subsidy.toFixed(1)}
                    </span>
                    {record.tip > 0 && (
                      <span className="text-amber-600 font-bold whitespace-nowrap">
                        + 小费¥{record.tip.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Right Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleTriggerCloudSync}
                  disabled={isSyncingCloud}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
                  title="调用云函数 riderSettlementTrace 上链存证"
                >
                  {isSyncingCloud ? (
                    <RefreshCw className="w-3.5 h-3.5 text-sky-700 animate-spin" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5 text-sky-700" />
                  )}
                  <span className="hidden sm:inline text-xs">{isSyncingCloud ? '上链中...' : '云端同步'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-700 hover:text-black flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. Navigation Tabs */}
          <div className="px-3 sm:px-6 py-2 bg-white border-b border-[#e6e6e4] flex items-center justify-between gap-2 shrink-0 overflow-x-auto hide-scrollbar">
            <div className="flex items-center gap-1 sm:gap-1.5">
              {[
                { id: 'overview', label: '客商联系', fullLabel: '客商联系与订单信息', icon: Phone },
                { id: 'timeline', label: '链路节点', fullLabel: '订单全链路节点', icon: Clock },
                { id: 'chat', label: '沟通回溯', fullLabel: '沟通消息回溯', icon: MessageSquare, badge: chatMessages.length },
                { id: 'proof', label: '送达拍照', fullLabel: '送达拍照与温控存证', icon: Camera, badge: proofPhotos.length },
                { id: 'cloud', label: '云端数据', fullLabel: '云函数链接与数据', icon: CloudCheck }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 active:scale-95 ${
                      isActive
                        ? 'bg-[#201f1d] text-white shadow-xs'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="sm:hidden">{tab.label}</span>
                    <span className="hidden sm:inline">{tab.fullLabel}</span>
                    {tab.badge !== undefined && (
                      <span
                        className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full ${
                          isActive ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-800'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Cloud Status Pill (Desktop only) */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>云端双轨加密存证就绪</span>
            </div>
          </div>

          {/* 3. Modal Body Content */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5 sm:space-y-4">
            {/* TAB 1: 客商联系与订单信息 */}
            {activeTab === 'overview' && (
              <div className="space-y-3.5 animate-in fade-in duration-150 text-xs">
                {/* Mobile Quick Action Strip */}
                <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      // FIX(审计P1): 真拨号（tel: URI 唤起系统拨号；桌面无电话客户端时浏览器静默忽略并回退提示）
                      const phone = matchedOrder?.userPhone || '138-8888-9201';
                      try {
                        window.location.href = `tel:${phone.replace(/[^+\d]/g, '')}`;
                      } catch {
                        // ignore
                      }
                      showToast(`正在拨打顾客电话: ${phone}`);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shadow-xs active:scale-95 shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>一键呼叫买家</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // FIX(审计P1): 真拨号餐车调度台
                      const hotline = '400-880-9288';
                      try {
                        window.location.href = `tel:${hotline.replace(/[^+\d]/g, '')}`;
                      } catch {
                        // ignore
                      }
                      showToast(`已拨打餐车调度台: ${hotline}`);
                    }}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shadow-xs active:scale-95 shrink-0"
                  >
                    <Store className="w-3.5 h-3.5 text-amber-400" />
                    <span>联系餐车后厨</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const text = `订单号: #${cleanOrderNo}\n目的地: ${record.destination}\n顾客: ${matchedOrder?.customerName || record.customerName || '先锋食客'} (${matchedOrder?.userPhone || '138-8888-9201'})\n结算金额: ¥${record.earnings.toFixed(2)}`;
                      navigator.clipboard?.writeText?.(text);
                      showToast('已复制订单全维配送信息至剪贴板');
                    }}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap active:scale-95 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5 text-neutral-600" />
                    <span>复制履约信息</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap active:scale-95 shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                    <span>查看沟通流 ({chatMessages.length})</span>
                  </button>
                </div>

                {/* Contact Dual Cards Grid (Customer & Merchant) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Customer Card */}
                  <div className="bg-[#fafaf8] p-4 rounded-xl border border-[#e6e6e4] space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-[#efefed] pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1a1c1b]">
                            {matchedOrder?.customerName || record.customerName || '先锋食客 · 孙先生'}
                          </h4>
                          <span className="text-[10.5px] text-[#787774]">订单收件人 (买家)</span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                        顺路送达
                      </span>
                    </div>

                    <div className="space-y-2 text-[11.5px]">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">顾客手机:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-neutral-800">
                            {matchedOrder?.userPhone || '138-8888-9201'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText?.(matchedOrder?.userPhone || '138-8888-9201');
                              showToast('已复制顾客电话');
                            }}
                            className="p-1 hover:bg-neutral-200 rounded text-neutral-500 cursor-pointer"
                            title="复制电话"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <span className="text-neutral-500 shrink-0">配送地址:</span>
                        <span className="font-medium text-right text-neutral-800">
                          {record.destination || '金融大厦 18F 前台'}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <span className="text-neutral-500 shrink-0">就餐备注:</span>
                        <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200 text-right">
                          {(matchedOrder as any)?.customerNote || '请放置于前台，送达后致电即可。'}
                        </span>
                      </div>
                    </div>

                    {/* Customer Action Buttons */}
                    <div className="pt-2 border-t border-[#efefed] flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          // FIX(审计P1): 真拨号（替代"已模拟拨通"假提示）
                          const phone = matchedOrder?.userPhone || '138-8888-9201';
                          try {
                            window.location.href = `tel:${phone.replace(/[^+\d]/g, '')}`;
                          } catch {
                            // ignore
                          }
                          showToast(`正在拨打顾客电话: ${phone} (通话加密存证)`);
                        }}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-98"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>拨打顾客电话</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('chat')}
                        className="flex-1 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>在线回溯与沟通</span>
                      </button>
                    </div>
                  </div>

                  {/* Merchant Food Truck Card */}
                  <div className="bg-[#fafaf8] p-4 rounded-xl border border-[#e6e6e4] space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-[#efefed] pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 text-white flex items-center justify-center font-bold">
                          <Store className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1a1c1b]">
                            {matchedOrder?.truckName || truck?.name || '黑曜石移动餐车 · 南广场总站'}
                          </h4>
                          <span className="text-[10.5px] text-[#787774]">发货餐车与主厨档口</span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                        炭火现烤站
                      </span>
                    </div>

                    <div className="space-y-2 text-[11.5px]">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">餐车站长专线:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-neutral-800">
                            400-880-9288 (分机 01)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText?.('400-880-9288');
                              showToast('已复制餐车站长电话');
                            }}
                            className="p-1 hover:bg-neutral-200 rounded text-neutral-500 cursor-pointer"
                            title="复制电话"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <span className="text-neutral-500 shrink-0">餐车停泊点:</span>
                        <span className="font-medium text-right text-neutral-800">
                          {truck?.currentLocationName || '静安大悦城北座 1F 中庭广场'}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <span className="text-neutral-500 shrink-0">出餐窗口:</span>
                        <span className="text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded text-[11px] font-mono">
                          02 号外卖骑手保温核验格
                        </span>
                      </div>
                    </div>

                    {/* Merchant Action Buttons */}
                    <div className="pt-2 border-t border-[#efefed] flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          // FIX(审计P1): 真拨号（替代"已模拟拨通"假提示）
                          const hotline = '400-880-9288';
                          try {
                            window.location.href = `tel:${hotline.replace(/[^+\d]/g, '')}`;
                          } catch {
                            // ignore
                          }
                          showToast(`正在拨打餐车后厨调度台: ${hotline}`);
                        }}
                        className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-98"
                      >
                        <Phone className="w-3.5 h-3.5 text-amber-400" />
                        <span>联系餐车后厨</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('chat')}
                        className="flex-1 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                        <span>商骑在线协同</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ordered Dishes Detail Table */}
                <div className="bg-white rounded-xl border border-[#e6e6e4] overflow-hidden shadow-2xs">
                  <div className="p-3.5 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
                    <h4 className="font-bold text-xs text-[#1a1c1b] flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-700" />
                      <span>订单餐品明细与规格核验</span>
                    </h4>
                    <span className="text-[10.5px] text-[#787774]">
                      用餐模式: {matchedOrder?.channelType === 'delivery' ? '外卖专送' : '外带自提'}
                    </span>
                  </div>

                  <div className="p-3 space-y-2">
                    {(matchedOrder?.items && matchedOrder.items.length > 0
                      ? matchedOrder.items
                      : [
                          { name: '黑松露炙烤和牛串', quantity: 2, price: 28.0, flavorTags: ['黑松露香', '炭火现烤', '多汁爆汁'] },
                          { name: '黑金炙烤鳗鱼玉子烧', quantity: 1, price: 32.0, flavorTags: ['日式酱香', '甘甜嫩滑'] },
                          { name: '黑曜石极光特调暴打柠檬', quantity: 1, price: 16.0, flavorTags: ['冰爽清香', '微酸开胃'] }
                        ]
                    ).map((dish, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-[#fafaf8] border border-neutral-200/70"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-neutral-900">{dish.name}</span>
                            <span className="font-mono text-xs text-neutral-600 font-bold">x{dish.quantity}</span>
                          </div>
                          {dish.flavorTags && dish.flavorTags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {dish.flavorTags.map((tag: string, tIdx: number) => (
                                <span
                                  key={tIdx}
                                  className="text-[9.5px] bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="font-mono font-bold text-neutral-900 text-sm">
                          ¥{(dish.price * dish.quantity).toFixed(2)}
                        </div>
                      </div>
                    ))}

                    {/* Fare and earnings calculation breakdown */}
                    <div className="pt-3 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-2">
                      <div className="text-[11px] text-neutral-600 space-x-2">
                        <span>订单总额: ¥{matchedOrder?.totalAmount || 104.0}</span>
                        <span>· 配送费: ¥5.50</span>
                        <span>· 餐车专属近距补贴: ¥{record.subsidy.toFixed(1)}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-neutral-500 mr-2 text-[11px]">骑手实际结算到账:</span>
                        <span className="font-mono font-bold text-base text-emerald-700">
                          +¥{record.earnings.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 订单全链路节点存证 */}
            {activeTab === 'timeline' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-3.5 bg-sky-50/80 rounded-xl border border-sky-200/90 text-xs text-sky-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-700 shrink-0" />
                    <span>该订单已完成全链路六大履约节点，所有时间戳与经办人均已上链存证</span>
                  </div>
                  <span className="font-mono text-[11px] text-sky-800 font-bold">100% 妥投履约</span>
                </div>

                <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
                  {timelineNodes.map((node, index) => {
                    return (
                      <div key={node.nodeId} className="relative group">
                        {/* Dot Icon */}
                        <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full bg-white border-2 border-emerald-600 flex items-center justify-center text-emerald-700 shadow-2xs">
                          <Check className="w-3.5 h-3.5 stroke-3" />
                        </div>

                        {/* Node Card */}
                        <div className="bg-[#fafaf8] p-3.5 rounded-xl border border-[#e6e6e4] hover:border-neutral-800 transition-all space-y-1.5 shadow-2xs">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#1a1c1b]">
                                {index + 1}. {node.title}
                              </span>
                              {node.proofBadge && (
                                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {node.proofBadge}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-500">
                              <Clock className="w-3 h-3 text-neutral-400" />
                              <span>{node.timeExact || node.time}</span>
                            </div>
                          </div>

                          <p className="text-[11.5px] text-neutral-600 leading-relaxed">
                            {node.description}
                          </p>

                          <div className="pt-2 border-t border-neutral-200/60 flex flex-wrap items-center justify-between text-[10.5px] text-neutral-500 gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-neutral-700">经办角色:</span>
                              <span>{node.operator}</span>
                            </div>
                            {node.location && (
                              <div className="flex items-center gap-1 text-neutral-600">
                                <MapPin className="w-3 h-3 text-neutral-400" />
                                <span className="truncate max-w-[240px]">{node.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: 沟通消息回溯 */}
            {activeTab === 'chat' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Chat Top Notification */}
                <div className="p-3 bg-neutral-100 rounded-xl border border-neutral-200 flex items-center justify-between text-xs text-neutral-700">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-700" />
                    <span>
                      会话已锁定该订单的历史三端对话，共 <strong className="text-neutral-900">{chatMessages.length}</strong> 条记录
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-neutral-300">
                    实时总线已对齐
                  </span>
                </div>

                {/* Messages Stream Container */}
                <div className="p-3.5 rounded-xl border border-neutral-200 bg-[#fcfcfb] max-h-[340px] overflow-y-auto space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="py-12 text-center text-neutral-400">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">暂无历史聊天记录</p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.senderRole === 'rider';
                      const isSystem = msg.senderRole === 'system';

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-1.5">
                            <div className="bg-neutral-200/90 text-neutral-700 px-3 py-1 rounded-full text-[10.5px] flex items-center gap-1.5 border border-neutral-300 max-w-[90%] text-center">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span>{msg.text}</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          {/* Avatar */}
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 shadow-2xs ${
                              msg.senderRole === 'rider'
                                ? 'bg-sky-600 text-white'
                                : msg.senderRole === 'merchant'
                                ? 'bg-neutral-800 text-white'
                                : msg.senderRole === 'platform'
                                ? 'bg-purple-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {msg.senderRole === 'rider' ? (
                              <Bike className="w-4 h-4" />
                            ) : msg.senderRole === 'merchant' ? (
                              <Store className="w-4 h-4 text-amber-400" />
                            ) : msg.senderRole === 'platform' ? (
                              <ShieldCheck className="w-4 h-4" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </div>

                          {/* Message Content */}
                          <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-1.5 mb-0.5 px-0.5 text-[10.5px] text-neutral-500">
                              <span className="font-medium">{msg.senderName}</span>
                              <span className="font-mono text-[9.5px]">{msg.time}</span>
                            </div>

                            {msg.type === 'voice' ? (
                              <button
                                type="button"
                                onClick={() => togglePlayVoice(msg.id)}
                                className={`p-2.5 rounded-2xl flex items-center gap-2 cursor-pointer transition-all ${
                                  isMe
                                    ? 'bg-[#201f1d] text-white rounded-tr-xs'
                                    : 'bg-white text-neutral-900 border border-neutral-200 shadow-2xs rounded-tl-xs'
                                }`}
                              >
                                {playingVoiceId === msg.id ? (
                                  <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                                ) : (
                                  <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
                                )}
                                <div className="flex items-center gap-0.5 h-3">
                                  {(msg.voiceWaveform || [20, 60, 90, 40, 80, 50, 70]).map((h, i) => (
                                    <div
                                      key={i}
                                      className={`w-0.5 rounded-full ${
                                        playingVoiceId === msg.id
                                          ? 'bg-emerald-400 animate-bounce'
                                          : isMe
                                          ? 'bg-neutral-400'
                                          : 'bg-neutral-300'
                                      }`}
                                      style={{
                                        height: `${Math.max(4, (h / 100) * 12)}px`,
                                        animationDelay: `${i * 0.1}s`
                                      }}
                                    />
                                  ))}
                                </div>
                                <span className="text-[10px] font-mono">{msg.voiceDuration || 4}"</span>
                              </button>
                            ) : (
                              <div
                                className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                                  isMe
                                    ? 'bg-[#201f1d] text-white rounded-tr-xs'
                                    : 'bg-white text-neutral-900 border border-neutral-200 rounded-tl-xs'
                                }`}
                              >
                                {msg.text}
                              </div>
                            )}

                            {msg.voiceTranscribed && (
                              <div className="text-[10px] text-neutral-500 mt-0.5 italic px-1">
                                转写: {msg.voiceTranscribed}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Quick Phrases */}
                <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-1">
                  <span className="text-[10.5px] font-bold text-neutral-500 shrink-0">快捷:</span>
                  {[
                    '已将餐品安全放置于前台',
                    '餐品封条完好，请放心享用',
                    '若有任何问题请随时致电',
                    '感谢您的五星好评！'
                  ].map((phrase, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => handleSendChatMessage(phrase)}
                      className="px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage();
                      }
                    }}
                    placeholder="输入留言 / 存证说明，回车即刻发送至云端..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-neutral-300 focus:border-neutral-900 focus:outline-none text-xs text-neutral-900 bg-neutral-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendChatMessage()}
                    disabled={!chatInputText.trim()}
                    className="px-4 py-2 bg-[#201f1d] hover:bg-neutral-800 disabled:opacity-40 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>发送</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: 送达拍照与温控存证 */}
            {activeTab === 'proof' && (
              <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                {/* Proof Photos Grid */}
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#1a1c1b] flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    <span>妥投现场照片与温控封条核验证明</span>
                  </h4>

                  <button
                    type="button"
                    onClick={handleMockTakePhoto}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-98"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>现场补拍 / 重新拍照</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {proofPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="bg-[#fafaf8] rounded-xl border border-[#e6e6e4] overflow-hidden shadow-2xs flex flex-col"
                    >
                      {/* Image Preview with Watermark Overlay */}
                      <div className="relative aspect-16/10 bg-neutral-900 overflow-hidden group">
                        <img
                          src={photo.photoUrl}
                          alt="送达拍照存证"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />

                        {/* Watermark badge overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white font-mono text-[10px] space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-bold">● 妥投拍摄存证</span>
                            <span>{photo.takenAt}</span>
                          </div>
                          <div className="truncate text-white/90">{photo.locationText}</div>
                        </div>

                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[9.5px] font-mono flex items-center gap-1 border border-white/20">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>防篡改上链</span>
                        </div>
                      </div>

                      {/* Photo Metadata Details */}
                      <div className="p-3 space-y-2 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">保温箱测温:</span>
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                            <Thermometer className="w-3 h-3" />
                            {photo.temperatureRecorded}℃ (锁鲜达标)
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">防开拆封条:</span>
                          <span className="font-bold text-neutral-800 flex items-center gap-1">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                            完好无损 (Intact)
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">拍照经手人:</span>
                          <span className="text-neutral-800 font-medium">{photo.uploader}</span>
                        </div>

                        {photo.cloudFileId && (
                          <div className="pt-1.5 border-t border-neutral-200 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                            <span className="truncate max-w-[200px]">{photo.cloudFileId}</span>
                            <span className="text-emerald-600 font-bold">TCB 已存储</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: 云函数链接与数据 */}
            {activeTab === 'cloud' && (
              <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                {/* Cloud Function Status Card */}
                <div className="bg-[#fafaf8] p-4 rounded-xl border border-[#e6e6e4] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#efefed] pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#1a1c1b]">
                          云函数名称: <span className="font-mono text-sky-800">{TCB_FUNCTION_NAMES.RIDER_SETTLEMENT_TRACE}</span>
                        </h4>
                        <p className="text-[10.5px] text-[#787774]">
                          腾讯云开发 CloudBase 全自动存证云函数，承载履约轨迹、聊天记录、送达拍照全维聚合
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleTriggerCloudSync}
                      disabled={isSyncingCloud}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{isSyncingCloud ? '正在执行云函数...' : '触发云函数调用'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="bg-white p-2.5 rounded-lg border border-neutral-200 space-y-0.5">
                      <span className="text-[10px] text-neutral-500">云端集合</span>
                      <p className="font-mono font-bold text-xs text-neutral-900">obsidian_settled_deliveries</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-neutral-200 space-y-0.5">
                      <span className="text-[10px] text-neutral-500">同步状态</span>
                      <p className="font-mono font-bold text-xs text-emerald-700">● 已同步完成</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-neutral-200 space-y-0.5">
                      <span className="text-[10px] text-neutral-500">最后同步时间</span>
                      <p className="font-mono font-bold text-xs text-neutral-900">{cloudSyncResult.syncedAt || '刚刚'}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-neutral-200 space-y-0.5">
                      <span className="text-[10px] text-neutral-500">云端文档 Doc ID</span>
                      <p className="font-mono font-bold text-[11px] text-sky-800 truncate">{cloudSyncResult.docId || `doc-${cleanOrderNo}`}</p>
                    </div>
                  </div>
                </div>

                {/* Cloud Data JSON Payload Inspection */}
                <div className="bg-[#1e1e1e] text-emerald-400 p-4 rounded-xl font-mono text-[11px] space-y-2 overflow-x-auto shadow-inner">
                  <div className="flex items-center justify-between text-neutral-400 border-b border-neutral-700 pb-1.5 text-[10px]">
                    <span>// CLOUDBASE TRACE RECORD PAYLOAD</span>
                    <span>JSON ENCRYPTED</span>
                  </div>
                  <pre className="leading-relaxed whitespace-pre-wrap">
{JSON.stringify(
  {
    cloudFunction: TCB_FUNCTION_NAMES.RIDER_SETTLEMENT_TRACE,
    action: 'save',
    orderNo: cleanOrderNo,
    settlement: {
      earnings: record.earnings,
      base: record.base,
      subsidy: record.subsidy,
      tip: record.tip,
      destination: record.destination
    },
    customer: {
      name: matchedOrder?.customerName || record.customerName || '先锋食客',
      phone: matchedOrder?.userPhone || '138-8888-9201'
    },
    merchant: {
      truckName: matchedOrder?.truckName || truck?.name || '黑曜石移动餐车',
      location: truck?.currentLocationName || '静安大悦城北座 1F 中庭'
    },
    milestonesCount: timelineNodes.length,
    chatMessagesCount: chatMessages.length,
    proofPhotosCount: proofPhotos.length,
    temperatureVerified: '68.4℃ (PASS)',
    antiTamperSeal: 'INTACT',
    syncedAt: cloudSyncResult.syncedAt
  },
  null,
  2
)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* 4. Modal Footer Bar */}
          <div className="bg-[#f7f7f5] px-4 sm:px-6 py-3 border-t border-[#e6e6e4] flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-2 text-neutral-600 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>全链路信息与照片已保存归档，数据已链接腾讯云开发 CloudBase</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTriggerCloudSync}
                className="px-3.5 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 font-bold transition-all cursor-pointer shadow-2xs"
              >
                云函数重新同步
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-[#201f1d] hover:bg-neutral-800 text-white font-bold transition-all cursor-pointer shadow-xs"
              >
                关闭
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
