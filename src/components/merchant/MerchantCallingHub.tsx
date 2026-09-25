import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bluetooth, QrCode, Settings2, Timer, Trash2 } from 'lucide-react';
import { QueueTicket, QueueType, Order } from '../../types';
import { INITIAL_QUEUE_TICKETS } from '../../data/merchantExtendedMockData';
import { 
  voiceAlerts, 
  playChimeSound,
  getVoiceConfig,
  saveVoiceConfig,
  VOICE_PERSONAS,
  speakText,
  playPersonaAudition,
  VoicePersonaId,
  unlockAudioContext,
  diagnoseAndRepairVoiceEngine
} from '../../utils/voiceAlertEngine';
import { BluetoothSpeakerModal } from './BluetoothSpeakerModal';
import { globalBluetoothAudio } from '../../utils/bluetoothAudioEngine';
import { AccountAuditDrawer } from './AccountAuditDrawer';
import { merchantEventBus } from '../../utils/merchantEventBus';
// ---- M3 控制台表现层（前台叫号取餐与等位排队中枢）----
import { buildTvCalling, buildTvRoster, getSeriesLoad } from './calling-hub/callingTokens';
import { CallingTopRibbon } from './calling-hub/CallingTopRibbon';
import { CallingQueueMetrics } from './calling-hub/CallingQueueMetrics';
import { CallingVoiceConsole } from './calling-hub/CallingVoiceConsole';
import { CallingFilterDeck } from './calling-hub/CallingFilterDeck';
import { CallingTicketGrid } from './calling-hub/CallingTicketGrid';
import { CallingTvMirror } from './calling-hub/CallingTvMirror';

export interface TableWaitStrategy {
  smallTableMin: number; // 默认 15m
  mediumTableMin: number; // 默认 25m
  largeTableMin: number; // 默认 40m
  pickupMin: number; // 默认 8m
}

const DEFAULT_WAIT_STRATEGY: TableWaitStrategy = {
  smallTableMin: 15,
  mediumTableMin: 25,
  largeTableMin: 40,
  pickupMin: 8
};

interface MerchantCallingHubProps {
  orders?: Order[];
  showToast: (msg: string) => void;
}

export const MerchantCallingHub: React.FC<MerchantCallingHubProps> = ({ orders = [], showToast }) => {
  const [tickets, setTickets] = useState<QueueTicket[]>(() => {
    const raw = localStorage.getItem('obsidian_queue_tickets');
    return raw ? JSON.parse(raw) : INITIAL_QUEUE_TICKETS;
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'waiting' | 'called' | 'finished' | 'temp_void' | 'perm_void'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'pickup' | 'table'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // 等待进度聚焦筛选（对齐参考稿 WAIT STATUS 选择器：全部进度 / 超时预警监控 / 队头就绪）
  const [waitFocus, setWaitFocus] = useState<'all' | 'overdue' | 'ready'>('all');
  const [repeatCalls, setRepeatCalls] = useState<1 | 2>(1);

  // 商家自定义每桌等位时间配置
  const [waitStrategy, setWaitStrategy] = useState<TableWaitStrategy>(() => {
    try {
      const raw = localStorage.getItem('obsidian_table_wait_strategy');
      return raw ? JSON.parse(raw) : DEFAULT_WAIT_STRATEGY;
    } catch {
      return DEFAULT_WAIT_STRATEGY;
    }
  });
  const [isWaitStrategyModalOpen, setIsWaitStrategyModalOpen] = useState<boolean>(false);

  // 作废确认弹窗状态 (支持临时作废与完全作废)
  const [voidModalTarget, setVoidModalTarget] = useState<QueueTicket | null>(null);
  const [voidModalAction, setVoidModalAction] = useState<'temp_void' | 'perm_void'>('temp_void');
  const [voidReason, setVoidReason] = useState<string>('顾客放弃等位');

  // 单票自定义等位时长编辑状态
  const [editingCustomWaitTicket, setEditingCustomWaitTicket] = useState<QueueTicket | null>(null);
  const [customWaitMinutesInput, setCustomWaitMinutesInput] = useState<number>(20);

  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [verifyInputCode, setVerifyInputCode] = useState<string>('');

  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const [voiceConfig, setVoiceConfigState] = useState(getVoiceConfig());
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [btConfig, setBtConfig] = useState(() => globalBluetoothAudio.getConfig());
  const [activeBtDevice, setActiveBtDevice] = useState(() => globalBluetoothAudio.getActiveDevice());

  // 监听全局音色变动，保持叫号中心与控制台实时同步
  useEffect(() => {
    const handleSync = () => {
      setVoiceConfigState(getVoiceConfig());
    };
    const handleBtSync = () => {
      setBtConfig(globalBluetoothAudio.getConfig());
      setActiveBtDevice(globalBluetoothAudio.getActiveDevice());
    };
    window.addEventListener('voiceConfigChanged', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('obsidian_bluetooth_speaker_changed', handleBtSync);

    // 跨组件联动总线监听
    const unsubKds = merchantEventBus.on('merchant:kds_dish_completed', (payload) => {
      if (payload.isAllCompleted && (payload.channelType === 'pickup' || payload.channelType === 'delivery')) {
        const shortCode = payload.ticketNo.replace(/^#/, '').slice(-4);
        setTickets((prev) => {
          const existing = prev.find((t) => t.queueNo.includes(shortCode));
          if (existing) {
            return prev.map((t) => (t.id === existing.id ? { ...t, status: 'called', calledCount: t.calledCount + 1 } : t));
          }
          const newTk: QueueTicket = {
            id: `pk-${Date.now()}`,
            queueNo: `P${shortCode}`,
            guestName: '在线自提客',
            phone: '尾号' + shortCode,
            partySize: 1,
            queueType: 'pickup',
            status: 'called',
            waitTimeMin: 0,
            createdAt: new Date().toISOString(),
            takeTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            calledCount: 1,
            calledAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          };
          return [newTk, ...prev];
        });
      }
    });

    return () => {
      window.removeEventListener('voiceConfigChanged', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('obsidian_bluetooth_speaker_changed', handleBtSync);
      unsubKds();
    };
  }, []);

  // 快捷即时喊号
  const [manualCallNumber, setManualCallNumber] = useState<string>('');
  const [manualPartySize, setManualPartySize] = useState<number>(2);

  // 现场取号状态
  const [newGuestName, setNewGuestName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newPartySize, setNewPartySize] = useState<number>(2);
  const [newType, setNewType] = useState<QueueType>('small');
  const [newNote, setNewNote] = useState<string>('');

  const saveTickets = (updated: QueueTicket[]) => {
    setTickets(updated);
    localStorage.setItem('obsidian_queue_tickets', JSON.stringify(updated));
  };

  // 叫号呼叫逻辑 (支持连叫 1 或 2 遍)
  const handleCallTicket = (ticket: QueueTicket) => {
    const updated = tickets.map(t => {
      if (t.id === ticket.id) {
        return {
          ...t,
          status: 'called' as const,
          calledCount: t.calledCount + 1,
          calledAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        };
      }
      return t;
    });

    saveTickets(updated);

    const executeCall = async () => {
      await unlockAudioContext();
      if (ticket.queueType === 'pickup') {
        voiceAlerts.callingGuest(ticket.queueNo, '餐车取餐窗口', repeatCalls);
      } else {
        voiceAlerts.callingWaitTable(ticket.queueNo, ticket.partySize, '堂食就餐区', repeatCalls);
      }
    };

    executeCall();
    if (repeatCalls === 2) {
      showToast(`已真人双重连叫【${ticket.queueNo} 号】（广播队列连续播报 2 次）！`);
    } else {
      showToast(`已真人语音呼叫【${ticket.queueNo} 号】！`);
    }
  };

  const handleRemindTicket = async (ticket: QueueTicket) => {
    await unlockAudioContext();
    const waitingSameType = tickets.filter(t => t.queueType === ticket.queueType && t.status === 'waiting');
    const idx = waitingSameType.findIndex(t => t.id === ticket.id);
    const ahead = Math.max(1, idx);
    voiceAlerts.waitingQueueReminder(ticket.queueNo, ahead);
    showToast(`已向【${ticket.queueNo}】播报等位候餐提醒（前方约 ${ahead} 桌）`);
  };

  const handleSeatTicket = (ticketId: string) => {
    const target = tickets.find(t => t.id === ticketId);
    const updated = tickets.map(t => (t.id === ticketId ? { ...t, status: 'seated' as const } : t));
    saveTickets(updated);
    playChimeSound('bell');
    showToast(`已确认【${target?.queueNo || ''}】入座/取餐核销完成！`);
  };

  const handlePassTicket = async (ticketId: string) => {
    const target = tickets.find(t => t.id === ticketId);
    const updated = tickets.map(t => (t.id === ticketId ? { ...t, status: 'passed' as const } : t));
    saveTickets(updated);
    if (target) {
      await unlockAudioContext();
      voiceAlerts.passedTicketNotice(target.queueNo);
    }
    showToast(`已将【${target?.queueNo || ''}】标记为过号，并播报顺延通知！`);
  };

  // 临时作废与完全作废标记处理
  const handleOpenVoidModal = (ticket: QueueTicket, action: 'temp_void' | 'perm_void') => {
    setVoidModalTarget(ticket);
    setVoidModalAction(action);
    setVoidReason(action === 'temp_void' ? '过号暂挂，保留号位' : '顾客弃号离场，完全作废');
  };

  const handleConfirmVoid = () => {
    if (!voidModalTarget) return;
    const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const updated = tickets.map(t => {
      if (t.id === voidModalTarget.id) {
        return {
          ...t,
          status: voidModalAction,
          voidAt: timeStr,
          voidReason: voidReason
        };
      }
      return t;
    });
    saveTickets(updated);
    if (voidModalAction === 'temp_void') {
      showToast(`【临时作废】已将【${voidModalTarget.queueNo}】置为临时作废暂挂，可随时一键恢复叫号！`);
    } else {
      showToast(`【完全作废】已将【${voidModalTarget.queueNo}】彻底作废标记（原因：${voidReason}）`);
    }
    setVoidModalTarget(null);
  };

  // 恢复作废的号牌（支持临时作废恢复，或完全作废紧急救济）
  const handleRestoreVoid = (ticketId: string) => {
    const target = tickets.find(t => t.id === ticketId);
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: 'waiting' as const,
          voidAt: undefined,
          voidReason: undefined
        };
      }
      return t;
    });
    saveTickets(updated);
    showToast(`已成功恢复【${target?.queueNo || ''}】到正常等位呼叫队列！`);
  };

  // 保存商家自定义桌台等位耗时设置
  const handleSaveWaitStrategy = (newStrategy: TableWaitStrategy) => {
    setWaitStrategy(newStrategy);
    localStorage.setItem('obsidian_table_wait_strategy', JSON.stringify(newStrategy));
    setIsWaitStrategyModalOpen(false);
    showToast('已更新商家自定义每桌等位时间设置，系统已自动重算各桌剩余等待时长！');
  };

  // 单票自定义等位时长保存
  const handleSaveSingleCustomWait = (ticketId: string, customMin: number) => {
    const updated = tickets.map(t => (t.id === ticketId ? { ...t, customWaitMin: customMin } : t));
    saveTickets(updated);
    setEditingCustomWaitTicket(null);
    showToast(`已更新此单专属等位基准为 ${customMin} 分钟，系统已自动重算！`);
  };

  // 系统自动计算等位时间指标：包含已等耗时、商家自定义每桌等位标准、前方等待桌数与系统计算还需等待多久
  const calculateWaitMetrics = (ticket: QueueTicket) => {
    // 商家针对该桌自定义设置，或全局针对该桌型设置
    const standardMin = ticket.customWaitMin || (
      ticket.queueType === 'small' ? waitStrategy.smallTableMin :
      ticket.queueType === 'medium' ? waitStrategy.mediumTableMin :
      ticket.queueType === 'large' ? waitStrategy.largeTableMin : waitStrategy.pickupMin
    );

    // 统计前面同类型等待组数
    const waitingSameQueue = tickets.filter(t => 
      t.queueType === ticket.queueType && 
      (t.status === 'waiting' || t.status === 'called')
    );
    const myIndex = waitingSameQueue.findIndex(t => t.id === ticket.id);
    const aheadCount = myIndex >= 0 ? myIndex : 0;

    // 系统自动计算还需多久 (分钟)
    let remainingMinutes = 0;
    if (ticket.status === 'waiting') {
      if (aheadCount === 0) {
        // 已经到队头，结合已等时间推算还需时间
        remainingMinutes = Math.max(1, standardMin - ticket.waitTimeMin);
      } else {
        // 前方桌数 * 商家设置的单桌翻台耗时
        const rawTime = aheadCount * standardMin;
        remainingMinutes = Math.max(3, rawTime - Math.floor(ticket.waitTimeMin * 0.15));
      }
    } else if (ticket.status === 'called') {
      remainingMinutes = 0;
    }

    const isOverdue = ticket.waitTimeMin > standardMin;

    return {
      standardMin,
      aheadCount,
      remainingMinutes,
      isOverdue
    };
  };

  // 过号重排 / 重新激活呼叫
  const handleRequeueTicket = async (ticketId: string, action: 'requeue' | 'recall') => {
    const target = tickets.find(t => t.id === ticketId);
    if (!target) return;

    if (action === 'requeue') {
      const updated = tickets.map(t => (t.id === ticketId ? { ...t, status: 'waiting' as const, calledCount: 0 } : t));
      saveTickets(updated);
      showToast(`已为【${target.queueNo}】恢复等待队列，顺延排号！`);
    } else {
      const updated = tickets.map(t => (t.id === ticketId ? { ...t, status: 'called' as const, calledCount: t.calledCount + 1 } : t));
      saveTickets(updated);
      await unlockAudioContext();
      if (target.queueType === 'pickup') {
        voiceAlerts.callingGuest(target.queueNo, '餐车取餐窗口', repeatCalls);
      } else {
        voiceAlerts.callingWaitTable(target.queueNo, target.partySize, '堂食就餐区', repeatCalls);
      }
      showToast(`已重新激活并语音呼叫【${target.queueNo}】！`);
    }
  };

  // 快速核销取餐码 (例如输入 8806 或 A01)
  const handleVerifyCodeSubmit = (codeToVerify: string) => {
    const clean = codeToVerify.trim().toUpperCase();
    if (!clean) {
      showToast('请输入 4 位自提校验码或排队号进行核销');
      return;
    }

    // 先在现有票据中查找
    const matched = tickets.find(t => 
      t.queueNo.toUpperCase() === clean || 
      t.id.endsWith(clean) || 
      t.queueNo.endsWith(clean)
    );

    if (matched) {
      const updated = tickets.map(t => (t.id === matched.id ? { ...t, status: 'seated' as const } : t));
      saveTickets(updated);
      speakText(`${matched.queueNo} 号取餐核销成功，祝您用餐愉快！`, { chimeType: 'order' });
      showToast(`【核销成功】${matched.queueNo} 号已完成取餐核销并归档！`);
      setVerifyInputCode('');
      setIsVerifyModalOpen(false);
      return;
    }

    // 若未在 tickets 中匹配，支持作为通用自提码核销
    speakText(`取餐码 ${clean} 核销成功，祝您用餐愉快！`, { chimeType: 'order' });
    showToast(`【核销成功】自提码 #${clean} 核销出库完成！`);
    setVerifyInputCode('');
    setIsVerifyModalOpen(false);
  };

  // 一键同步待自提订单到叫号列表
  const handleSyncPickupOrders = () => {
    const pickupOrders = orders.filter(o => 
      (o.channelType === 'pickup' || o.channel === 'pickup' || (o as any).diningType === 'pickup') &&
      o.status !== 'completed' &&
      o.status !== 'cancelled'
    );

    if (pickupOrders.length === 0) {
      // 若当前没有，注入模拟示例订单
      const sampleCode = `P${String(tickets.filter(t => t.queueType === 'pickup').length + 1).padStart(2, '0')}`;
      const newTicket: QueueTicket = {
        id: `q-sync-${Date.now()}`,
        queueNo: sampleCode,
        queueType: 'pickup',
        guestName: '自提食客',
        phone: '139****8806',
        partySize: 1,
        waitTimeMin: 2,
        status: 'waiting',
        calledCount: 0,
        createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        note: '线上点单自提 (双层锁鲜环保餐盒)'
      };
      saveTickets([newTicket, ...tickets]);
      showToast(`已同步 1 笔线上自提订单【${sampleCode}】至叫号队列！`);
      return;
    }

    let addedCount = 0;
    const newItems: QueueTicket[] = [];
    pickupOrders.forEach(o => {
      const qNo = o.pickupCode ? `P${o.pickupCode.slice(-2)}` : `P${String(tickets.length + addedCount + 1).padStart(2, '0')}`;
      const exists = tickets.some(t => t.queueNo === qNo);
      if (!exists) {
        addedCount++;
        newItems.push({
          id: `q-${o.id || Date.now()}-${addedCount}`,
          queueNo: qNo,
          queueType: 'pickup',
          guestName: o.customerName || '自提贵宾',
          phone: o.userPhone || '138****0000',
          partySize: 1,
          waitTimeMin: 0,
          status: 'waiting',
          calledCount: 0,
          createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          note: `线上自提单: ${o.orderNo || ''}`
        });
      }
    });

    if (newItems.length > 0) {
      saveTickets([...newItems, ...tickets]);
      showToast(`已成功将 ${newItems.length} 笔自提订单同步至前台叫号列表！`);
    } else {
      showToast('所有待自提订单已在排队叫号列表中！');
    }
  };

  // 即时快速喊号广播
  const handleManualBroadcast = async (actionType: 'pickup' | 'table') => {
    const num = manualCallNumber.trim().toUpperCase();
    if (!num) {
      showToast('请输入呼叫的排队/取餐单号（例如 A01 或 8821）');
      return;
    }
    await unlockAudioContext();
    if (actionType === 'pickup') {
      voiceAlerts.callingGuest(num, '餐车取餐窗口', repeatCalls);
      showToast(`已广播：呼叫【${num} 号】到餐车前台取餐${repeatCalls === 2 ? '（双重连叫）' : ''}`);
    } else {
      voiceAlerts.callingWaitTable(num, manualPartySize, '堂食就餐区', repeatCalls);
      showToast(`已广播：呼叫【${num} 号】(${manualPartySize}人)等位入座${repeatCalls === 2 ? '（双重连叫）' : ''}`);
    }
  };

  // 现场取号
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = newType === 'small' ? 'A' : newType === 'medium' ? 'B' : newType === 'large' ? 'C' : 'P';
    const sameTypeCount = tickets.filter(t => t.queueType === newType).length + 1;
    const queueNo = `${prefix}${String(sameTypeCount).padStart(2, '0')}`;

    const newTicket: QueueTicket = {
      id: `q-${Date.now()}`,
      queueNo,
      queueType: newType,
      guestName: newGuestName || '贵宾顾客',
      phone: newPhone || '138****0000',
      partySize: newPartySize,
      waitTimeMin: 0,
      status: 'waiting',
      calledCount: 0,
      createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      note: newNote
    };

    const updated = [newTicket, ...tickets];
    saveTickets(updated);
    setIsNewModalOpen(false);
    setNewGuestName('');
    setNewPhone('');
    setNewNote('');
    playChimeSound('order');
    showToast(`成功取号【${queueNo}】，前面还有 ${tickets.filter(t => t.queueType === newType && t.status === 'waiting').length} 桌在等候`);
  };

  // 全屏大屏切换
  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullScreen(false);
    }
  };

  // 综合筛选逻辑 (状态 + 渠道 + 搜索词 + 等待进度聚焦)
  const filteredTickets = tickets.filter(t => {
    // 1. 状态筛选
    if (activeFilter === 'waiting' && t.status !== 'waiting') return false;
    if (activeFilter === 'called' && t.status !== 'called') return false;
    if (activeFilter === 'temp_void' && t.status !== 'temp_void') return false;
    if (activeFilter === 'perm_void' && t.status !== 'perm_void') return false;
    if (activeFilter === 'finished' && (t.status !== 'seated' && t.status !== 'passed')) return false;

    // 2. 渠道类型筛选
    if (channelFilter === 'pickup' && t.queueType !== 'pickup') return false;
    if (channelFilter === 'table' && t.queueType === 'pickup') return false;

    // 3. 等待进度聚焦筛选（仅对呼叫/超时/队头三种信号生效）
    if (waitFocus !== 'all') {
      if (t.status !== 'waiting' && t.status !== 'called') return false;
      const m = calculateWaitMetrics(t);
      if (waitFocus === 'overdue' && !(t.status === 'waiting' && m.isOverdue)) return false;
      if (waitFocus === 'ready' && !(m.aheadCount === 0)) return false;
    }

    // 4. 搜索关键词
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      const matchNo = t.queueNo.toUpperCase().includes(q);
      const matchName = t.guestName?.toUpperCase().includes(q);
      const matchPhone = t.phone?.includes(q);
      if (!matchNo && !matchName && !matchPhone) return false;
    }

    return true;
  });

  const waitingCount = tickets.filter(t => t.status === 'waiting').length;
  const calledTickets = tickets.filter(t => t.status === 'called');
  const tempVoidCount = tickets.filter(t => t.status === 'temp_void').length;
  const permVoidCount = tickets.filter(t => t.status === 'perm_void').length;

  /* ---- 控制台看板遥测（供 CallingTopRibbon / FilterDeck / Metrics 使用）---- */
  const pickupWaitingCount = tickets.filter(t => t.queueType === 'pickup' && t.status === 'waiting').length;
  const finishedCount = tickets.filter(t => t.status === 'seated' || t.status === 'passed').length;
  const overdueCount = tickets.filter(t => t.status === 'waiting' && calculateWaitMetrics(t).isOverdue).length;
  const readyCount = tickets.filter(t => t.status === 'waiting' && calculateWaitMetrics(t).aheadCount === 0).length;
  /** 智能恒温柜占用：以自提单数映射到 12 个柜位 */
  const LOCKER_TOTAL = 12;
  const lockerOccupied = Math.min(LOCKER_TOTAL, pickupWaitingCount + calledTickets.filter(t => t.queueType === 'pickup').length);

  const queueLoads = getSeriesLoad(tickets, waitStrategy);

  /* ---- 真人母带广播台派生读数 ---- */
  const activePersona = VOICE_PERSONAS.find(p => p.id === voiceConfig.persona) || VOICE_PERSONAS[0];
  const btConnected = Boolean(activeBtDevice && activeBtDevice.status === 'connected');
  const btLabel = btConnected
    ? `蓝牙音箱: ${activeBtDevice!.name.slice(0, 12)} (${btConfig.routingMode === 'voice_only' ? '仅系统语音' : '统一混合'})`
    : '未连接蓝牙音箱';

  /* ---- 音色循环切换 ---- */
  const handleCyclePersona = () => {
    const currentIndex = VOICE_PERSONAS.findIndex(p => p.id === voiceConfig.persona);
    const nextPersona = VOICE_PERSONAS[(currentIndex + 1) % VOICE_PERSONAS.length];
    const updated = { 
      ...voiceConfig, 
      persona: nextPersona.id,
      selectedVoiceName: undefined, // 关键：解除上个角色的音源绑定，让新角色使用自己的音源和真人母带
      rate: nextPersona.defaultRate,
      pitch: nextPersona.defaultPitch
    };
    setVoiceConfigState(updated);
    saveVoiceConfig(updated);
    window.dispatchEvent(new CustomEvent('voiceConfigChanged', { detail: updated }));
    showToast(`已切换音色为【${nextPersona.name}】(${nextPersona.genderLabel})`);
    playPersonaAudition(nextPersona.id, updated.volume);
  };

  const handleTestPickup = async () => {
    await unlockAudioContext();
    speakText('请——P08 号顾客，到餐车取餐窗口取餐。您的餐品已新鲜制作完成，祝您用餐愉快！', {
      chimeType: 'call',
      persona: voiceConfig.persona,
      volume: voiceConfig.volume,
      interrupt: true
    });
    showToast(`正在播报【${activePersona.name}】前台取餐叫号...`);
  };

  const handleTestQueue = async () => {
    await unlockAudioContext();
    speakText('请——B02 号顾客，3 位贵宾，桌位已准备就绪，请移步堂食就餐区就座用餐。', {
      chimeType: 'call',
      persona: voiceConfig.persona,
      volume: voiceConfig.volume,
      interrupt: true
    });
    showToast(`正在播报【${activePersona.name}】等位到号入座...`);
  };

  const handleSelfCheck = async () => {
    await unlockAudioContext();
    const res = await diagnoseAndRepairVoiceEngine();
    showToast(res.repaired ? '已完成声学自检并成功修复挂起通道！' : '声学通道正常，已解除拦截就绪！');
  };

  /** 打开单票自定义等位时长弹窗（参考稿每卡「自定义时长」入口） */
  const handleOpenCustomWait = (ticket: QueueTicket) => {
    setEditingCustomWaitTicket(ticket);
    setCustomWaitMinutesInput(
      ticket.customWaitMin ||
        (ticket.queueType === 'small' ? waitStrategy.smallTableMin :
         ticket.queueType === 'medium' ? waitStrategy.mediumTableMin :
         ticket.queueType === 'large' ? waitStrategy.largeTableMin : waitStrategy.pickupMin)
    );
  };

  /** 重置全部筛选（空状态与选择器复位共用） */
  const handleResetQueueFilters = () => {
    setActiveFilter('all');
    setChannelFilter('all');
    setWaitFocus('all');
    setSearchQuery('');
  };

  /* ---- 大屏镜像数据 ---- */
  const tvRoster = buildTvRoster(tickets, calculateWaitMetrics);

  return (
    <div className="bg-rad-paper text-rad-text-main min-h-screen antialiased pr-7 xl:pr-9">

      {/* ① 顶层全局状态与动作缎带 */}
      <CallingTopRibbon
        waitingCount={waitingCount}
        pickupWaitingCount={pickupWaitingCount}
        calledCount={calledTickets.length}
        tempVoidCount={tempVoidCount}
        isTvMode={isTvMode}
        onOpenStrategy={() => setIsWaitStrategyModalOpen(true)}
        onOpenVerify={() => setIsVerifyModalOpen(true)}
        onSyncPickup={handleSyncPickupOrders}
        onToggleTv={() => setIsTvMode(!isTvMode)}
        onOpenNewTicket={() => setIsNewModalOpen(true)}
      />

      {/* ② 四列队列指标甲板（A/B/C 桌型 + 智能恒温柜） */}
      <CallingQueueMetrics
        loads={queueLoads}
        lockerOccupied={lockerOccupied}
        lockerTotal={LOCKER_TOTAL}
      />

      {/* ③ 真人母带原声叫号广播台与声学音色路由 */}
      <CallingVoiceConsole
        personaName={activePersona.name}
        personaGenderLabel={activePersona.genderLabel}
        personaAvatar={activePersona.avatarIcon}
        speedLabel={`${voiceConfig.rate.toFixed(1)}x`}
        toneLabel={
          voiceConfig.pitch === 1
            ? '标准音调'
            : voiceConfig.pitch > 1
            ? '明亮高亢'
            : '沉稳低音'
        }
        btConnected={btConnected}
        btLabel={btLabel}
        repeatCalls={repeatCalls}
        setRepeatCalls={setRepeatCalls}
        manualCallNumber={manualCallNumber}
        setManualCallNumber={setManualCallNumber}
        manualPartySize={manualPartySize}
        setManualPartySize={setManualPartySize}
        onCyclePersona={handleCyclePersona}
        onTestPickup={handleTestPickup}
        onTestQueue={handleTestQueue}
        onSelfCheck={handleSelfCheck}
        onManualBroadcast={handleManualBroadcast}
        onOpenBluetooth={() => setIsBluetoothModalOpen(true)}
      />

      {/* ④ 票据筛选与双行工业选择器 */}
      <CallingFilterDeck
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        channelFilter={channelFilter}
        setChannelFilter={setChannelFilter}
        waitFocus={waitFocus}
        setWaitFocus={setWaitFocus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        counts={{
          all: tickets.length,
          waiting: waitingCount,
          called: calledTickets.length,
          tempVoid: tempVoidCount,
          permVoid: permVoidCount,
          finished: finishedCount,
          overdue: overdueCount,
          ready: readyCount
        }}
      />

      {/* ⑤ 工业级排队票据网格（六种真实状态） */}
      <CallingTicketGrid
        tickets={filteredTickets}
        metricsOf={calculateWaitMetrics}
        onCall={handleCallTicket}
        onRemind={handleRemindTicket}
        onSeat={handleSeatTicket}
        onVerifyOut={(ticket) => {
          setVerifyInputCode(ticket.queueNo.replace(/\D/g, '').slice(-4).padStart(4, '0'));
          setIsVerifyModalOpen(true);
        }}
        onPass={handlePassTicket}
        onVoid={handleOpenVoidModal}
        onRequeue={handleRequeueTicket}
        onCustomWait={handleOpenCustomWait}
        onResetFilters={handleResetQueueFilters}
      />

      {/* ⑥ 内嵌实时 TV 双屏镜像（排队大屏开启时呈现） */}
      {isTvMode && (
        <CallingTvMirror
          calling={buildTvCalling(tickets)}
          roster={tvRoster}
          waitingCount={waitingCount}
          lockerTotal={LOCKER_TOTAL}
          personaName={activePersona.name}
          volumeLabel="85dB NORMALIZED"
          isFullScreen={isFullScreen}
          onToggleFullScreen={handleToggleFullScreen}
        />
      )}

      {/* 扫码/输入 4 位自提码快速核销弹窗 */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-[#d3d1cb] shadow-2xl w-full max-w-sm p-5 text-[#37352f]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e3e2e0] mb-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-sm">核销前台取餐码</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="text-[#787774] hover:text-[#37352f] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#787774]">
                请让顾客出示手机端自提凭据，输入取餐校验码（例如 8806 或 P01）即可一键核销出库：
              </p>

              <input
                type="text"
                autoFocus
                placeholder="请输入 4 位取餐码 (如: 8806)"
                value={verifyInputCode}
                onChange={(e) => setVerifyInputCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerifyCodeSubmit(verifyInputCode);
                }}
                className="w-full px-3 py-2 text-base font-mono text-center font-bold tracking-widest border-2 border-emerald-600 rounded focus:outline-none bg-emerald-50/30"
              />

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleVerifyCodeSubmit('8806')}
                  className="py-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-center text-[11px] cursor-pointer"
                >
                  填入演示码 #8806
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyCodeSubmit('P01')}
                  className="py-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-center text-[11px] cursor-pointer"
                >
                  填入自提码 P01
                </button>
              </div>

              <div className="pt-3 border-t border-[#e3e2e0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-3 py-1.5 text-[#787774] hover:text-[#37352f] rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyCodeSubmit(verifyInputCode)}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold cursor-pointer shadow-xs active:scale-95"
                >
                  确认核销出库
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 现场排队取号弹窗 */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-[#d3d1cb] shadow-2xl w-full max-w-md p-4 sm:p-5 text-[#37352f] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e3e2e0] mb-4">
              <h3 className="font-bold text-base">现场顾客排队取号</h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-[#787774] hover:text-[#37352f] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#787774] mb-1 font-medium">桌型类别 / 用餐方式</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'small', label: '小桌 (1-2人)' },
                    { id: 'medium', label: '中桌 (3-4人)' },
                    { id: 'large', label: '大桌 (5-8人)' },
                    { id: 'pickup', label: '自提取餐' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewType(t.id as QueueType)}
                      className={`p-2 rounded text-center border cursor-pointer font-medium ${
                        newType === t.id
                          ? 'bg-[#37352f] text-white border-[#37352f]'
                          : 'bg-[#f7f7f5] text-[#37352f] border-[#d3d1cb] hover:bg-[#e3e2e0]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#787774] mb-1 font-medium">就餐人数</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newPartySize}
                    onChange={(e) => setNewPartySize(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#787774] mb-1 font-medium">联系电话 (选填)</label>
                  <input
                    type="text"
                    placeholder="如: 13800000000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">顾客称呼 (选填)</label>
                <input
                  type="text"
                  placeholder="如: 张先生"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[#787774] mb-1 font-medium">特殊偏好备注 (选填)</label>
                <input
                  type="text"
                  placeholder="如: 需靠窗位置 / 宝宝椅 / 稍后到达"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#d3d1cb] rounded focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-[#e3e2e0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 text-[#787774] hover:text-[#37352f] rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold cursor-pointer shadow-xs"
                >
                  确认出号打印
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 作废确认与原因弹窗 (临时作废 vs 完全作废) */}
      {voidModalTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-300 shadow-2xl w-full max-w-md p-5 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                {voidModalAction === 'temp_void' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                ) : (
                  <Trash2 className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="font-bold text-base">
                  {voidModalAction === 'temp_void' ? '设置号牌为【临时作废(暂挂)】' : '设置号牌为【完全作废】'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVoidModalTarget(null)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 border border-slate-200 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg font-mono text-slate-900">{voidModalTarget.queueNo}</span>
                  <span className="text-slate-600 font-medium">
                    {voidModalTarget.guestName} · {voidModalTarget.phone}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex justify-between font-mono">
                  <span>取号时间: {voidModalTarget.createdAt}</span>
                  <span>已等待: {voidModalTarget.waitTimeMin} 分钟</span>
                </div>
              </div>

              {/* 作废类型切换 */}
              <div>
                <label className="block text-slate-600 font-medium mb-1">选择作废类型</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVoidModalAction('temp_void');
                      setVoidReason('过号暂挂，保留号位');
                    }}
                    className={`p-2 rounded border text-left cursor-pointer transition-all ${
                      voidModalAction === 'temp_void'
                        ? 'border-amber-500 bg-amber-50/70 text-amber-900 font-bold ring-1 ring-amber-400'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>临时作废 (暂挂)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal mt-0.5">过号未到暂保留，随时可一键恢复排号</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVoidModalAction('perm_void');
                      setVoidReason('顾客弃号离场，完全作废');
                    }}
                    className={`p-2 rounded border text-left cursor-pointer transition-all ${
                      voidModalAction === 'perm_void'
                        ? 'border-rose-500 bg-rose-50/70 text-rose-900 font-bold ring-1 ring-rose-400'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>完全作废 (永久)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal mt-0.5">顾客彻底放弃或离场，结案永久作废</p>
                  </button>
                </div>
              </div>

              {/* 作废原因快捷选择与输入 */}
              <div>
                <label className="block text-slate-600 font-medium mb-1">作废说明 / 原因备注</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    '过号3次未到暂挂',
                    '顾客主动放弃等位',
                    '改换为线上外卖自提',
                    '现场重复排号/误取号',
                    '顾客离场无法取得联系'
                  ].map(reason => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setVoidReason(reason)}
                      className={`px-2 py-0.5 rounded text-[11px] border cursor-pointer ${
                        voidReason === reason
                          ? 'bg-slate-800 text-white border-slate-800 font-medium'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="请输入具体作废原因..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVoidModalTarget(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVoid}
                  className={`px-4 py-1.5 text-white rounded font-bold cursor-pointer shadow-xs active:scale-95 ${
                    voidModalAction === 'temp_void' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {voidModalAction === 'temp_void' ? '确认临时作废(暂挂)' : '确认完全作废'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 商家自定义桌台等位时间策略设置弹窗 (全局标准) */}
      {isWaitStrategyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-300 shadow-2xl w-full max-w-md p-5 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base">商家自定义每桌等位时间标准设置</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWaitStrategyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                系统将基于您自定义设置的每桌单次翻台耗时，乘以排队队列前方等待桌数，并结合顾客已等待时长，<b>自动实时计算并展示“还需等待多久”</b>：
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <div>
                    <span className="font-bold text-slate-800 block">小桌 (1-2人)</span>
                    <span className="text-[11px] text-slate-500">快餐/轻食快速翻台</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={waitStrategy.smallTableMin}
                      onChange={(e) => setWaitStrategy(s => ({ ...s, smallTableMin: Math.max(5, Number(e.target.value)) }))}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-bold text-sm bg-white"
                    />
                    <span className="text-slate-600 font-medium">分钟/桌</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <div>
                    <span className="font-bold text-slate-800 block">中桌 (3-4人)</span>
                    <span className="text-[11px] text-slate-500">常规好友/家庭用餐</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={waitStrategy.mediumTableMin}
                      onChange={(e) => setWaitStrategy(s => ({ ...s, mediumTableMin: Math.max(5, Number(e.target.value)) }))}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-bold text-sm bg-white"
                    />
                    <span className="text-slate-600 font-medium">分钟/桌</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <div>
                    <span className="font-bold text-slate-800 block">大桌 (5人及以上)</span>
                    <span className="text-[11px] text-slate-500">聚餐/多菜品长时就餐</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={10}
                      max={180}
                      value={waitStrategy.largeTableMin}
                      onChange={(e) => setWaitStrategy(s => ({ ...s, largeTableMin: Math.max(10, Number(e.target.value)) }))}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-bold text-sm bg-white"
                    />
                    <span className="text-slate-600 font-medium">分钟/桌</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <div>
                    <span className="font-bold text-slate-800 block">到店自提 (打包单)</span>
                    <span className="text-[11px] text-slate-500">后厨出餐入柜打包</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={2}
                      max={60}
                      value={waitStrategy.pickupMin}
                      onChange={(e) => setWaitStrategy(s => ({ ...s, pickupMin: Math.max(2, Number(e.target.value)) }))}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-bold text-sm bg-white"
                    />
                    <span className="text-slate-600 font-medium">分钟/单</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setWaitStrategy(DEFAULT_WAIT_STRATEGY)}
                  className="text-slate-500 hover:text-slate-800 text-[11px] underline cursor-pointer"
                >
                  恢复系统默认推荐值
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWaitStrategyModalOpen(false)}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveWaitStrategy(waitStrategy)}
                    className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded font-bold cursor-pointer shadow-xs active:scale-95"
                  >
                    保存并立即生效
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 单桌自定义等位耗时修改弹窗 */}
      {editingCustomWaitTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-300 shadow-2xl w-full max-w-sm p-5 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm">自定义单桌等位基准时间</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomWaitTicket(null)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                正在为号牌 <b className="font-mono text-indigo-700">{editingCustomWaitTicket.queueNo}</b> ({editingCustomWaitTicket.guestName}) 设置专属等位标准时长：
              </p>

              <div>
                <label className="block text-slate-600 font-medium mb-1">自定义基准等位时长 (分钟)</label>
                <input
                  type="number"
                  min={3}
                  max={180}
                  value={customWaitMinutesInput}
                  onChange={(e) => setCustomWaitMinutesInput(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-bold font-mono text-center text-lg focus:outline-none focus:border-indigo-600 bg-indigo-50/30"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[10, 15, 20, 30].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCustomWaitMinutesInput(m)}
                    className="py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-mono cursor-pointer"
                  >
                    {m}m
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomWaitTicket(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSingleCustomWait(editingCustomWaitTicket.id, customWaitMinutesInput)}
                  className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded font-bold cursor-pointer shadow-xs active:scale-95"
                >
                  确认设定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bluetooth Speaker Modal */}
      <BluetoothSpeakerModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
        showToast={showToast}
      />

      {/* 右侧折叠内嵌式账号操作对比与数据兜底组件 */}
      <AccountAuditDrawer
        currentModule="calling_queue"
        title="前台排队叫号操作审计与版本恢复"
        showToast={showToast}
      />
    </div>
  );
};
