import { Order, OrderItemRecord } from '../types';
import { matchDishImageUrl } from './dishImageMatcher';
import { saveChatMessageToCloud, fetchChatMessagesFromCloud, syncOrderChatsToCloud } from './cloudbase';
import { getCanonicalOrderNo, normalizeOrderKey } from './orderNormalizer';

export type ChatRole = 'user' | 'rider' | 'merchant' | 'platform' | 'system';

export interface ChatMessageItem {
  id: string;
  orderNo: string;
  senderRole: ChatRole;
  senderName: string;
  senderAvatar?: string;
  time: string;
  timeExact?: string; // 精确到秒 e.g. 13:28:45
  timestamp: number;
  type:
    | 'text'
    | 'voice'
    | 'image'
    | 'location'
    | 'order_card'
    | 'dish_quote'
    | 'status_change'
    | 'rush_alert'
    | 'gift_card'
    | 'platform_arbitration'
    | 'system_notice'
    | 'sla_supervision';
  text?: string;
  voiceDuration?: number; // 秒数
  voiceTranscribed?: string; // 语音转写文字
  voiceAudioUrl?: string; // Blob / Data URL
  voiceAudioBase64?: string; // Base64 音频存证
  voiceWaveform?: number[]; // 波形条采样 (0-100)
  imageUrl?: string;
  imageTitle?: string;
  locationName?: string;
  locationAddress?: string;
  distanceKm?: number;
  quotedDish?: {
    name: string;
    quantity: number;
    price: number;
    options?: string;
    imageUrl?: string;
  };
  statusChangeInfo?: {
    fromStatus: string;
    toStatus: string;
    title: string;
    description: string;
    actionOperator: string;
    operatorRole: ChatRole;
  };
  giftInfo?: {
    giftName: string;
    giftValue: number;
    giftNote: string;
  };
  quoteReply?: {
    id: string;
    senderName: string;
    senderRole: ChatRole;
    text: string;
  };
  reactions?: Record<string, string[]>; // e.g. { '👍': ['商家', '食客'], '⚡': ['骑手'] }
  isRead?: boolean;
  isListened?: boolean; // 语音消息是否已被收听回执
  listenedAt?: number;
  isRecalled?: boolean; // 消息是否已撤回
  recalledBy?: ChatRole;
  recalledAt?: number;
  originalTextBeforeRecall?: string;
  exceptionWorkflow?: {
    type: 'dish_replacement' | 'berth_relocation' | 'damage_compensation';
    status: 'pending' | 'accepted' | 'refund_requested' | 'completed';
    title?: string;
    description?: string;
    originalDish?: { name: string; price: number; imageUrl?: string };
    replacementDish?: { name: string; price: number; diffPrice: number; imageUrl?: string };
    berthInfo?: {
      fromLocation: string;
      toLocation: string;
      distanceDeltaMeters: number;
      lat: number;
      lng: number;
      note?: string;
    };
    handledAt?: number;
    handledByRole?: ChatRole;
    refundAmount?: number;
  };
  paymentStatus?: 'unpaid' | 'paid';
  paidAt?: number;
  paidByRole?: ChatRole;
  slaSupervision?: SLASupervisionInfo;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  readBy?: {
    user?: boolean;
    merchant?: boolean;
    rider?: boolean;
    platform?: boolean;
    userReadAt?: number;
    merchantReadAt?: number;
    riderReadAt?: number;
    platformReadAt?: number;
  };
  cloudSyncedAt?: string;
}

export interface SLALogItem {
  timestamp: number;
  timeStr: string;
  action: string;
  operatorRole: ChatRole;
  operatorName: string;
  note?: string;
}

export interface SLASupervisionInfo {
  ticketId: string;
  level: 'P0' | 'P1' | 'P2'; // P0-特急(15m红线), P1-紧急(时效督办), P2-常规
  category: 'overdue_reply' | 'merchant_delay' | 'rider_exception' | 'dish_issue' | 'customer_escalation';
  categoryLabel: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'overdue_resolved';
  slaTargetSeconds: number; // 目标处理时限，默认 180s
  triggeredAt: number; // 发起时间戳
  deadlineAt: number; // 承诺履约红线时间戳
  firstResponseAt?: number; // 首次响应时间戳
  firstResponseSeconds?: number; // 响应耗时秒数
  firstResponseByName?: string;
  firstResponseByRole?: ChatRole;
  resolvedAt?: number; // 最终解决时间戳
  resolvedByName?: string;
  resolvedByRole?: ChatRole;
  resolutionSeconds?: number; // 解决总耗时秒数
  isMetSLA?: boolean; // 是否在 SLA 时限内解决履约达标
  resolutionNote?: string; // 解决结论说明
  logs: SLALogItem[];
}

export interface RoleMemberReadInfo {
  role: ChatRole;
  roleLabel: string;
  roleBadgeColor: string;
  name: string;
  avatarIcon: 'user' | 'store' | 'bike' | 'shield';
  isRead: boolean;
  readAt?: number;
  readTimeStr?: string;
}

export interface MessageReadReceiptSummary {
  totalParticipants: number;
  readCount: number;
  unreadCount: number;
  isAllRead: boolean;
  readMembers: RoleMemberReadInfo[];
  unreadMembers: RoleMemberReadInfo[];
  summaryText: string;
  readRolesSummary: string; // e.g. "商家已读 · 客户端已读"
  unreadRolesSummary: string; // e.g. "骑手未读"
}

export interface ChatSLAResponse {
  isWaitingReply: boolean;
  waitingForRole?: ChatRole;
  waitingSeconds: number;
  targetSLALimitSeconds: number;
  isOverdue: boolean; // 超过SLA红线 (如 >180s)
  isWarning: boolean; // 即将超时预警 (如 >60s)
  formattedTimer: string; // e.g. "01:45"
  remainingSeconds: number;
  responseRatePercent: number; // e.g. 99.2%
  avgResponseSeconds: number; // e.g. 16s
  slaTier: 'S' | 'A' | 'B' | 'C' | 'D';
  slaAlertMessage: string;
  lastSenderName?: string;
  lastSenderRole?: ChatRole;
  lastMessageTime?: string;
  lastMessageTimeExact?: string;
}

const CHAT_STORAGE_PREFIX = 'obsidian_order_chat_';
const CHAT_EVENT_NAME = 'obsidian_chat_event';

let chatBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    chatBroadcastChannel = new BroadcastChannel('obsidian_chat_sync_bus');
    chatBroadcastChannel.onmessage = (event) => {
      if (event.data && event.data.orderNo && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CHAT_EVENT_NAME, { detail: { orderNo: event.data.orderNo, fromBroadcast: true } }));
      }
    };
  } catch {
    // safe fallback
  }
}

// Dispatch event across tabs / window
function notifyChatUpdate(orderNo: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_EVENT_NAME, { detail: { orderNo } }));
    if (chatBroadcastChannel) {
      try {
        chatBroadcastChannel.postMessage({ orderNo, timestamp: Date.now() });
      } catch {}
    }
  }
}

// Generate realistic initial chat messages for an order if empty
export function getInitialOrderMessages(orderNo: string, order?: Order): ChatMessageItem[] {
  const cleanOrderNo = orderNo.replace(/^#/, '');
  const now = Date.now();
  const time1 = new Date(now - 12 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const time2 = new Date(now - 8 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const time3 = new Date(now - 5 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const time4 = new Date(now - 2 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return [
    {
      id: `merchant-${cleanOrderNo}-1`,
      orderNo: cleanOrderNo,
      senderRole: 'merchant',
      senderName: order?.truckName || '黑曜石餐车 · 南广场总站',
      time: time1,
      timeExact: formatExactTime(now - 12 * 60 * 1000),
      timestamp: now - 12 * 60 * 1000,
      type: 'status_change',
      statusChangeInfo: {
        fromStatus: '待接单',
        toStatus: '已接单制作',
        title: '商家已接单并进入后厨现烤',
        description: '主厨已选用特选果木炭火烘烤，高温锁鲜，预计 6 分钟完成打包出餐。',
        actionOperator: '餐车主厨 · 列车长',
        operatorRole: 'merchant'
      },
      readBy: {
        merchant: true,
        merchantReadAt: now - 12 * 60 * 1000,
        user: true,
        userReadAt: now - 9 * 60 * 1000,
        rider: false, // 专线骑手未读，显式体现商家已读、客户端已读、骑手未读
        platform: true,
        platformReadAt: now - 11 * 60 * 1000
      }
    },
    {
      id: `sys-${cleanOrderNo}-1`,
      orderNo: cleanOrderNo,
      senderRole: 'system',
      senderName: '系统安防中心',
      time: time2,
      timeExact: formatExactTime(now - 10 * 60 * 1000),
      timestamp: now - 10 * 60 * 1000,
      type: 'system_notice',
      text: `🛡️ 订单 #${cleanOrderNo} 已建立三端加密会话。云函数 (chatMessages) 与云数据库 (obsidian_order_chats) 全程热备份。`,
      readBy: {
        merchant: true,
        merchantReadAt: now - 10 * 60 * 1000,
        user: true,
        userReadAt: now - 8 * 60 * 1000,
        rider: true,
        riderReadAt: now - 6 * 60 * 1000,
        platform: true,
        platformReadAt: now - 10 * 60 * 1000
      }
    },
    {
      id: `rider-${cleanOrderNo}-1`,
      orderNo: cleanOrderNo,
      senderRole: 'rider',
      senderName: order?.courierName || '陈志远 · 专线金牌骑手',
      time: time3,
      timeExact: formatExactTime(now - 5 * 60 * 1000),
      timestamp: now - 5 * 60 * 1000,
      type: 'text',
      text: '您好！我是本次为您配送的专线骑手。保温箱已预热完成，目前正在餐车档口前待命，出餐后会第一时间加急送往您的地址！',
      readBy: {
        rider: true,
        riderReadAt: now - 5 * 60 * 1000,
        merchant: true,
        merchantReadAt: now - 4 * 60 * 1000,
        user: true,
        userReadAt: now - 3 * 60 * 1000,
        platform: true,
        platformReadAt: now - 5 * 60 * 1000
      }
    },
    {
      id: `rider-${cleanOrderNo}-2`,
      orderNo: cleanOrderNo,
      senderRole: 'rider',
      senderName: order?.courierName || '陈志远 · 专线金牌骑手',
      time: time4,
      timeExact: formatExactTime(now - 2 * 60 * 1000),
      timestamp: now - 2 * 60 * 1000,
      type: 'voice',
      voiceDuration: 5,
      voiceWaveform: [30, 65, 90, 75, 80, 45, 95, 60, 40, 85, 70, 50],
      voiceTranscribed: '【语音已转文字】：大厦安保较严格，如需直接放 12 楼前台请在聊天中告知我一声～',
      readBy: {
        rider: true,
        riderReadAt: now - 2 * 60 * 1000,
        merchant: true,
        merchantReadAt: now - 1 * 60 * 1000,
        user: false, // 客户端食客未读
        platform: true,
        platformReadAt: now - 2 * 60 * 1000
      }
    },
    {
      id: `sla-${cleanOrderNo}-init`,
      orderNo: cleanOrderNo,
      senderRole: 'platform',
      senderName: 'SLA 智能调度督办中枢',
      time: time4,
      timeExact: formatExactTime(now - 1 * 60 * 1000),
      timestamp: now - 1 * 60 * 1000,
      type: 'sla_supervision',
      text: '【SLA 履约时效督办单】：已触发高峰出餐与极速专送时限保护，承诺响应时限 180s，全流程跟进解决时间与履约审计！',
      slaSupervision: {
        ticketId: `SLA-${cleanOrderNo}-902`,
        level: 'P1',
        category: 'merchant_delay',
        categoryLabel: '高峰履约保效督办',
        title: '餐车后厨出餐与骑手交接时效督办',
        description: '平台网格调度算法已挂载本单：餐车后厨需在 5 分钟内完成出餐打包，骑手在档口保温箱无缝交接，保障全链路极速履约。',
        status: 'in_progress',
        slaTargetSeconds: 180,
        triggeredAt: now - 1 * 60 * 1000,
        deadlineAt: now + 2 * 60 * 1000,
        firstResponseAt: now - 35 * 1000,
        firstResponseSeconds: 25,
        firstResponseByName: '主厨王师傅',
        firstResponseByRole: 'merchant',
        logs: [
          {
            timestamp: now - 1 * 60 * 1000,
            timeStr: formatExactTime(now - 1 * 60 * 1000),
            action: '督办发起',
            operatorRole: 'platform',
            operatorName: '平台智能调度管家',
            note: '系统自动探测出单节律，触发 P1 级履约时效兜底'
          },
          {
            timestamp: now - 35 * 1000,
            timeStr: formatExactTime(now - 35 * 1000),
            action: '商家响应',
            operatorRole: 'merchant',
            operatorName: '主厨王师傅',
            note: '收到！和牛堡与燕麦拿铁已在出餐打包位，预计 1 分钟内完成交接'
          }
        ]
      },
      readBy: {
        rider: true,
        merchant: true,
        user: true,
        platform: true
      }
    }
  ];
}

/**
 * 智能补全/归一化消息已读数据，确保三端多角色已读未读可精确感知
 */
function normalizeMessageReadBy(msg: ChatMessageItem, index: number): ChatMessageItem {
  if (msg.readBy && typeof msg.readBy.rider === 'boolean' && typeof msg.readBy.user === 'boolean' && typeof msg.readBy.merchant === 'boolean') {
    return msg;
  }
  const now = Date.now();
  const ts = msg.timestamp || now;
  // 首条消息：商家已读、客户端已读、骑手未读
  if (index === 0) {
    return {
      ...msg,
      readBy: {
        merchant: true,
        merchantReadAt: ts,
        user: true,
        userReadAt: ts + 120000,
        rider: false, // 骑手未读
        platform: true,
        platformReadAt: ts + 60000,
        ...(msg.readBy || {})
      }
    };
  }

  // 默认根据发送者赋予初始已读
  const defaultReadBy = {
    merchant: msg.senderRole === 'merchant' || Boolean(msg.readBy?.merchant),
    user: msg.senderRole === 'user' || Boolean(msg.readBy?.user),
    rider: msg.senderRole === 'rider' || Boolean(msg.readBy?.rider),
    platform: true,
    userReadAt: msg.readBy?.userReadAt || (msg.senderRole === 'user' ? ts : undefined),
    merchantReadAt: msg.readBy?.merchantReadAt || (msg.senderRole === 'merchant' ? ts : undefined),
    riderReadAt: msg.readBy?.riderReadAt || (msg.senderRole === 'rider' ? ts : undefined),
    platformReadAt: ts,
    ...(msg.readBy || {})
  };

  return {
    ...msg,
    readBy: defaultReadBy
  };
}

/**
 * 获取某个订单的所有聊天消息 (同步读取本地快速渲染)
 */
export function getOrderChatMessages(orderNo: string, order?: Order): ChatMessageItem[] {
  const canonicalNo = getCanonicalOrderNo(orderNo, order);
  const cleanOrderNo = (orderNo || order?.orderNo || canonicalNo).replace(/^#/, '');
  const canonicalKey = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
  const legacyKey = `${CHAT_STORAGE_PREFIX}${cleanOrderNo}`;

  try {
    const raw = localStorage.getItem(canonicalKey) || (legacyKey !== canonicalKey ? localStorage.getItem(legacyKey) : null);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed.map((m, idx) => normalizeMessageReadBy(m, idx));
        if (legacyKey !== canonicalKey && !localStorage.getItem(canonicalKey)) {
          localStorage.setItem(canonicalKey, JSON.stringify(normalized));
        }
        return normalized;
      }
    }
  } catch (e) {
    // ignore
  }

  // If no records, generate initial seed
  const initial = getInitialOrderMessages(canonicalNo, order);
  try {
    localStorage.setItem(canonicalKey, JSON.stringify(initial));
    if (legacyKey !== canonicalKey) {
      localStorage.setItem(legacyKey, JSON.stringify(initial));
    }
  } catch (e) {
    // ignore
  }
  return initial;
}

/**
 * 异步从云函数/云数据库同步拉取订单聊天记录并与本地融合
 */
export async function syncOrderChatFromCloud(
  orderNo: string,
  order?: Order
): Promise<ChatMessageItem[]> {
  const canonicalNo = getCanonicalOrderNo(orderNo, order);
  const cleanOrderNo = (orderNo || order?.orderNo || canonicalNo).replace(/^#/, '');
  const localList = getOrderChatMessages(canonicalNo, order);

  try {
    const cloudRes = await fetchChatMessagesFromCloud(canonicalNo);
    if (cloudRes.success && Array.isArray(cloudRes.messages) && cloudRes.messages.length > 0) {
      const map = new Map<string, ChatMessageItem>();
      // 先放入本地
      localList.forEach((m) => map.set(m.id, m));
      // 再以云端覆盖/补充
      cloudRes.messages.forEach((m) => {
        if (m.id) {
          map.set(m.id, { ...map.get(m.id), ...m, cloudSyncedAt: m.cloudSyncedAt || new Date().toISOString() });
        }
      });
      const merged = Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      const key = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
      localStorage.setItem(key, JSON.stringify(merged));
      if (cleanOrderNo !== canonicalNo) {
        localStorage.setItem(`${CHAT_STORAGE_PREFIX}${cleanOrderNo}`, JSON.stringify(merged));
      }
      notifyChatUpdate(canonicalNo);
      if (cleanOrderNo !== canonicalNo) {
        notifyChatUpdate(cleanOrderNo);
      }
      return merged;
    }
  } catch {
    // ignore
  }

  return localList;
}

/**
 * 格式化精确时间 (时:分:秒)
 */
export function formatExactTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * 格式化动态相对时间 (如: 刚刚, 15秒前, 2分钟前)
 */
export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 5000) return '刚刚';
  if (diffMs < 60000) return `${Math.max(1, Math.floor(diffMs / 1000))}秒前`;
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}分钟前`;
  const d = new Date(timestamp);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * 计算订单会话的超时回复率与响应 SLA 状态
 */
export function calculateChatSLAResponse(orderNo: string, currentRole: ChatRole = 'merchant', order?: Order): ChatSLAResponse {
  const cleanOrderNo = orderNo.replace(/^#/, '');
  const msgs = getOrderChatMessages(cleanOrderNo, order);
  const now = Date.now();

  const targetSLALimitSeconds = 180; // 3分钟SLA响应时限
  const warningThresholdSeconds = 60; // 1分钟提示预警

  if (!msgs || msgs.length === 0) {
    return {
      isWaitingReply: false,
      waitingSeconds: 0,
      targetSLALimitSeconds,
      isOverdue: false,
      isWarning: false,
      formattedTimer: '00:00',
      remainingSeconds: targetSLALimitSeconds,
      responseRatePercent: 100,
      avgResponseSeconds: 12,
      slaTier: 'S',
      slaAlertMessage: '三端联络响应时效极佳 (SLA 评级 S)'
    };
  }

  // 找到最新一条非系统消息
  const nonSysMsgs = msgs.filter((m) => m.senderRole !== 'system');
  const lastMsg = nonSysMsgs.length > 0 ? nonSysMsgs[nonSysMsgs.length - 1] : null;

  if (!lastMsg) {
    return {
      isWaitingReply: false,
      waitingSeconds: 0,
      targetSLALimitSeconds,
      isOverdue: false,
      isWarning: false,
      formattedTimer: '00:00',
      remainingSeconds: targetSLALimitSeconds,
      responseRatePercent: 99.4,
      avgResponseSeconds: 15,
      slaTier: 'S',
      slaAlertMessage: '会话正常'
    };
  }

  // 判断是否在等待当前视角角色回复（即最新消息来自对方）
  const isFromSelf = lastMsg.senderRole === currentRole;
  const waitingSeconds = isFromSelf ? 0 : Math.max(0, Math.floor((now - (lastMsg.timestamp || now)) / 1000));
  const isWaitingReply = !isFromSelf && waitingSeconds > 5;
  const isOverdue = isWaitingReply && waitingSeconds > targetSLALimitSeconds;
  const isWarning = isWaitingReply && waitingSeconds > warningThresholdSeconds && !isOverdue;
  const remainingSeconds = Math.max(0, targetSLALimitSeconds - waitingSeconds);

  const mm = Math.floor(waitingSeconds / 60).toString().padStart(2, '0');
  const ss = (waitingSeconds % 60).toString().padStart(2, '0');
  const formattedTimer = `${mm}:${ss}`;

  let slaTier: 'S' | 'A' | 'B' | 'C' | 'D' = 'S';
  let responseRatePercent = 99.5;
  let slaAlertMessage = '三端联络响应时效极佳';

  if (isOverdue) {
    slaTier = 'D';
    responseRatePercent = Math.max(68, 99.5 - Math.min(30, Math.floor((waitingSeconds - 180) / 10)));
    slaAlertMessage = `⚠️ 超时未回复预警！对方已等待 ${formattedTimer}，请立即响应以保障 SLA 履约率！`;
  } else if (isWarning) {
    slaTier = 'B';
    responseRatePercent = 94.2;
    slaAlertMessage = `⏱️ 响应倒计时预警：等待已达 ${formattedTimer}，建议在 ${remainingSeconds}s 内完成回复`;
  } else if (isWaitingReply) {
    slaTier = 'A';
    responseRatePercent = 98.8;
    slaAlertMessage = `💬 收到新消息，建议在 3 分钟内保持即时回复 (倒计时 ${remainingSeconds}s)`;
  }

  return {
    isWaitingReply,
    waitingForRole: isWaitingReply ? currentRole : undefined,
    waitingSeconds,
    targetSLALimitSeconds,
    isOverdue,
    isWarning,
    formattedTimer,
    remainingSeconds,
    responseRatePercent,
    avgResponseSeconds: isOverdue ? 142 : 18,
    slaTier,
    slaAlertMessage,
    lastSenderName: lastMsg.senderName,
    lastSenderRole: lastMsg.senderRole,
    lastMessageTime: lastMsg.time,
    lastMessageTimeExact: lastMsg.timeExact || formatExactTime(lastMsg.timestamp || now)
  };
}

/**
 * 汇总多笔订单的 SLA 响应数据指标
 */
export function getAllOrdersSLASummary(orderNos: string[]): {
  avgResponseTimeSec: number;
  complianceRatePercent: number;
  overdueCount: number;
  activeDialogCount: number;
  tierScore: string;
} {
  if (!orderNos || orderNos.length === 0) {
    return {
      avgResponseTimeSec: 16,
      complianceRatePercent: 99.4,
      overdueCount: 0,
      activeDialogCount: 0,
      tierScore: 'S'
    };
  }

  let totalWaiting = 0;
  let overdueCount = 0;
  let activeCount = 0;

  orderNos.forEach((no) => {
    const sla = calculateChatSLAResponse(no, 'merchant');
    if (sla.isWaitingReply) {
      activeCount++;
      totalWaiting += sla.waitingSeconds;
      if (sla.isOverdue) overdueCount++;
    }
  });

  const avgResponseTimeSec = activeCount > 0 ? Math.round(totalWaiting / activeCount) : 18;
  const complianceRatePercent =
    activeCount > 0 ? Math.max(70, Number(((1 - overdueCount / activeCount) * 100).toFixed(1))) : 99.2;

  const tierScore = complianceRatePercent >= 98 ? 'S' : complianceRatePercent >= 90 ? 'A' : complianceRatePercent >= 80 ? 'B' : 'C';

  return {
    avgResponseTimeSec,
    complianceRatePercent,
    overdueCount,
    activeDialogCount: activeCount,
    tierScore
  };
}

/**
 * 发送/保存新消息 (双轨持久化: 快速本地通知 + 异步推送到云函数/云数据库)
 */
export function sendOrderChatMessage(
  orderNo: string,
  message: Omit<ChatMessageItem, 'id' | 'orderNo' | 'time' | 'timestamp'> & {
    time?: string;
    timeExact?: string;
    timestamp?: number;
  }
): ChatMessageItem {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const cleanOrderNo = (orderNo || canonicalNo).replace(/^#/, '');
  const key = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
  const current = getOrderChatMessages(canonicalNo);

  const now = new Date();
  const timeStr = message.time || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const timeExactStr = message.timeExact || `${timeStr}:${now.getSeconds().toString().padStart(2, '0')}`;
  const timestamp = message.timestamp || Date.now();

  const newMsgItem: ChatMessageItem = {
    ...message,
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    orderNo: canonicalNo,
    time: timeStr,
    timeExact: timeExactStr,
    timestamp,
    deliveryStatus: message.deliveryStatus || 'sent',
    readBy: message.readBy || {
      user: message.senderRole === 'user',
      merchant: message.senderRole === 'merchant',
      rider: message.senderRole === 'rider',
      platform: true,
      userReadAt: message.senderRole === 'user' ? timestamp : undefined,
      merchantReadAt: message.senderRole === 'merchant' ? timestamp : undefined,
      riderReadAt: message.senderRole === 'rider' ? timestamp : undefined,
      platformReadAt: timestamp
    },
    cloudSyncedAt: new Date().toISOString()
  };

  const updated = [...current, newMsgItem];
  try {
    localStorage.setItem(key, JSON.stringify(updated));
    if (cleanOrderNo !== canonicalNo) {
      localStorage.setItem(`${CHAT_STORAGE_PREFIX}${cleanOrderNo}`, JSON.stringify(updated));
    }
  } catch (e) {
    // ignore
  }

  // 触发页面重绘与多 Tab 联动
  notifyChatUpdate(canonicalNo);
  if (cleanOrderNo !== canonicalNo) {
    notifyChatUpdate(cleanOrderNo);
  }

  // 异步上报至腾讯云开发云函数与云数据库
  saveChatMessageToCloud(canonicalNo, newMsgItem).catch((err) => {
    console.warn('[ChatHub] 聊天消息云端异步持久化提醒:', err);
  });

  return newMsgItem;
}

/**
 * 一键将当前订单所有消息全量同步至腾讯云函数/云数据库
 */
export async function flushOrderChatToCloud(orderNo: string): Promise<{ success: boolean; count: number }> {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const msgs = getOrderChatMessages(canonicalNo);
  const res = await syncOrderChatsToCloud(canonicalNo, msgs);
  return res;
}

/**
 * 获取订单的最新一条消息
 */
export function getLatestChatMessage(orderNo: string, order?: Order): ChatMessageItem | null {
  const msgs = getOrderChatMessages(orderNo, order);
  if (msgs && msgs.length > 0) {
    return msgs[msgs.length - 1];
  }
  return null;
}

/**
 * 在订单消息流上下文中发起 SLA 督办单
 */
export function triggerSLASupervisionTicket(
  orderNo: string,
  params: {
    level?: 'P0' | 'P1' | 'P2';
    category?: 'overdue_reply' | 'merchant_delay' | 'rider_exception' | 'dish_issue' | 'customer_escalation';
    categoryLabel?: string;
    title: string;
    description: string;
    slaTargetSeconds?: number;
    operatorRole?: ChatRole;
    operatorName?: string;
    note?: string;
  }
): ChatMessageItem {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const now = Date.now();
  const targetSec = params.slaTargetSeconds || 180;
  const ticketId = `SLA-${canonicalNo.replace(/[^A-Za-z0-9]/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

  const slaInfo: SLASupervisionInfo = {
    ticketId,
    level: params.level || 'P1',
    category: params.category || 'merchant_delay',
    categoryLabel: params.categoryLabel || '极速履约时效督办',
    title: params.title,
    description: params.description,
    status: 'pending',
    slaTargetSeconds: targetSec,
    triggeredAt: now,
    deadlineAt: now + targetSec * 1000,
    logs: [
      {
        timestamp: now,
        timeStr: formatExactTime(now),
        action: '发起督办',
        operatorRole: params.operatorRole || 'platform',
        operatorName: params.operatorName || 'SLA 智能管控中心',
        note: params.note || '在消息上下文中建立履约督办红线工单'
      }
    ]
  };

  return sendOrderChatMessage(canonicalNo, {
    senderRole: params.operatorRole || 'platform',
    senderName: params.operatorName || 'SLA 履约督办中枢',
    type: 'sla_supervision',
    text: `【SLA 督办工单 #${ticketId}】：${params.title}。要求 ${Math.round(targetSec / 60)} 分钟内全链协同处置！`,
    slaSupervision: slaInfo
  });
}

/**
 * 在消息上下文中响应 SLA 督办工单并记录响应耗时
 */
export function respondToSLASupervision(
  orderNo: string,
  messageId: string,
  operatorRole: ChatRole,
  operatorName: string,
  note?: string
): boolean {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const cleanOrderNo = orderNo.replace(/^#/, '');
  const key = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
  const msgs = getOrderChatMessages(canonicalNo);

  let updated = false;
  const now = Date.now();

  const nextMsgs = msgs.map((m) => {
    if (m.id === messageId && m.slaSupervision) {
      const s = m.slaSupervision;
      if (s.status === 'pending') {
        const firstResponseSeconds = Math.max(1, Math.round((now - s.triggeredAt) / 1000));
        updated = true;
        return {
          ...m,
          slaSupervision: {
            ...s,
            status: 'in_progress' as const,
            firstResponseAt: now,
            firstResponseSeconds,
            firstResponseByName: operatorName,
            firstResponseByRole: operatorRole,
            logs: [
              ...s.logs,
              {
                timestamp: now,
                timeStr: formatExactTime(now),
                action: '接单响应',
                operatorRole,
                operatorName,
                note: note || `已确认接单处理，首次响应耗时 ${firstResponseSeconds} 秒 (承诺时限 ${s.slaTargetSeconds}s)`
              }
            ]
          }
        };
      }
    }
    return m;
  });

  if (updated) {
    try {
      localStorage.setItem(key, JSON.stringify(nextMsgs));
      if (cleanOrderNo !== canonicalNo) {
        localStorage.setItem(`${CHAT_STORAGE_PREFIX}${cleanOrderNo}`, JSON.stringify(nextMsgs));
      }
    } catch {}
    notifyChatUpdate(canonicalNo);
    if (cleanOrderNo !== canonicalNo) {
      notifyChatUpdate(cleanOrderNo);
    }
  }
  return updated;
}

/**
 * 在消息上下文中为 SLA 督办工单追加跟进日志
 */
export function appendSLASupervisionLog(
  orderNo: string,
  messageId: string,
  operatorRole: ChatRole,
  operatorName: string,
  note: string
): boolean {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const cleanOrderNo = orderNo.replace(/^#/, '');
  const key = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
  const msgs = getOrderChatMessages(canonicalNo);

  let updated = false;
  const now = Date.now();

  const nextMsgs = msgs.map((m) => {
    if (m.id === messageId && m.slaSupervision) {
      const s = m.slaSupervision;
      updated = true;
      return {
        ...m,
        slaSupervision: {
          ...s,
          logs: [
            ...s.logs,
            {
              timestamp: now,
              timeStr: formatExactTime(now),
              action: '跟进处置',
              operatorRole,
              operatorName,
              note
            }
          ]
        }
      };
    }
    return m;
  });

  if (updated) {
    try {
      localStorage.setItem(key, JSON.stringify(nextMsgs));
      if (cleanOrderNo !== canonicalNo) {
        localStorage.setItem(`${CHAT_STORAGE_PREFIX}${cleanOrderNo}`, JSON.stringify(nextMsgs));
      }
    } catch {}
    notifyChatUpdate(canonicalNo);
    if (cleanOrderNo !== canonicalNo) {
      notifyChatUpdate(cleanOrderNo);
    }
  }
  return updated;
}

/**
 * 在消息上下文中将 SLA 督办工单标记已解决并记录与审计解决总耗时
 */
export function resolveSLASupervision(
  orderNo: string,
  messageId: string,
  operatorRole: ChatRole,
  operatorName: string,
  resolutionNote?: string
): { success: boolean; resolutionSeconds: number; isMetSLA: boolean } {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const cleanOrderNo = orderNo.replace(/^#/, '');
  const key = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
  const msgs = getOrderChatMessages(canonicalNo);

  let updated = false;
  let resolutionSeconds = 0;
  let isMetSLA = true;
  const now = Date.now();

  const nextMsgs = msgs.map((m) => {
    if (m.id === messageId && m.slaSupervision) {
      const s = m.slaSupervision;
      resolutionSeconds = Math.max(1, Math.round((now - s.triggeredAt) / 1000));
      isMetSLA = resolutionSeconds <= s.slaTargetSeconds;
      const finalStatus = isMetSLA ? ('resolved' as const) : ('overdue_resolved' as const);
      updated = true;

      const formattedDuration = `${Math.floor(resolutionSeconds / 60)}分${resolutionSeconds % 60}秒`;

      return {
        ...m,
        slaSupervision: {
          ...s,
          status: finalStatus,
          resolvedAt: now,
          resolvedByName: operatorName,
          resolvedByRole: operatorRole,
          resolutionSeconds,
          isMetSLA,
          resolutionNote: resolutionNote || (isMetSLA ? '已按 SLA 履约承诺准时解决' : '超时解决，已记入平台履约复盘'),
          logs: [
            ...s.logs,
            {
              timestamp: now,
              timeStr: formatExactTime(now),
              action: isMetSLA ? '办结销号(履约达标)' : '办结销号(超时办结)',
              operatorRole,
              operatorName,
              note: resolutionNote || `已完成督办处理，总解决耗时 ${formattedDuration} (${isMetSLA ? '符合 SLA' : '超出 SLA 时限'})`
            }
          ]
        }
      };
    }
    return m;
  });

  if (updated) {
    try {
      localStorage.setItem(key, JSON.stringify(nextMsgs));
      if (cleanOrderNo !== canonicalNo) {
        localStorage.setItem(`${CHAT_STORAGE_PREFIX}${cleanOrderNo}`, JSON.stringify(nextMsgs));
      }
    } catch {}
    notifyChatUpdate(canonicalNo);
    if (cleanOrderNo !== canonicalNo) {
      notifyChatUpdate(cleanOrderNo);
    }
  }

  return { success: updated, resolutionSeconds, isMetSLA };
}

/**
 * 获取某个角色在指定订单下的未读消息数
 */
export function getUnreadCountForRole(orderNo: string, role: 'merchant' | 'rider' | 'user' | 'platform'): number {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const cleanOrderNo = (orderNo || canonicalNo).replace(/^#/, '');
  const msgs = getOrderChatMessages(canonicalNo);
  const readKey = `obsidian_chat_last_read_${canonicalNo}_${role}`;
  const legacyReadKey = `obsidian_chat_last_read_${cleanOrderNo}_${role}`;
  const lastReadTimestamp = parseInt(localStorage.getItem(readKey) || localStorage.getItem(legacyReadKey) || '0', 10);

  // 计算比上次已读时间更晚且不是自己发送的消息
  return msgs.filter((m) => {
    if (m.senderRole === role) return false;
    return (m.timestamp || 0) > lastReadTimestamp;
  }).length;
}

/**
 * 标记指定角色的订单消息为已读 (支持客户端、商家端、骑手端与平台端全链路已读上报)
 */
export function markOrderChatAsRead(orderNo: string, role: 'merchant' | 'rider' | 'user' | 'platform'): void {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const cleanOrderNo = (orderNo || canonicalNo).replace(/^#/, '');
  const readKey = `obsidian_chat_last_read_${canonicalNo}_${role}`;
  const now = Date.now();
  const nowStr = now.toString();

  try {
    localStorage.setItem(readKey, nowStr);
    if (cleanOrderNo !== canonicalNo) {
      localStorage.setItem(`obsidian_chat_last_read_${cleanOrderNo}_${role}`, nowStr);
    }

    const msgs = getOrderChatMessages(canonicalNo);
    let changed = false;
    const updatedMsgs = msgs.map((m) => {
      // 只要该消息不是当前角色发送，且未被标记当前角色已读
      if (m.senderRole !== role) {
        const currentReadBy = m.readBy || {};
        if (!currentReadBy[role]) {
          changed = true;
          return {
            ...m,
            isRead: true,
            readBy: {
              ...currentReadBy,
              [role]: true,
              [`${role}ReadAt`]: now
            }
          };
        }
      }
      return m;
    });

    if (changed) {
      const key = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
      localStorage.setItem(key, JSON.stringify(updatedMsgs));
      if (cleanOrderNo !== canonicalNo) {
        localStorage.setItem(`${CHAT_STORAGE_PREFIX}${cleanOrderNo}`, JSON.stringify(updatedMsgs));
      }

      // ⛅️ 腾讯云开发云函数与云数据库接线：异步归档真实已读标记
      syncOrderChatsToCloud(canonicalNo, updatedMsgs).catch((err) => {
        console.warn('[ChatHub] 云端已读标记异步归档提示:', err);
      });
    }
  } catch {
    // ignore
  }
  notifyChatUpdate(canonicalNo);
  if (cleanOrderNo !== canonicalNo) {
    notifyChatUpdate(cleanOrderNo);
  }
}

/**
 * 更新指定订单中消息的支付状态 (未付款 / 已支付)，并自动完成云端数据归档
 */
export function updateChatMessagePaymentStatus(
  orderNo: string,
  messageIdOrOrderNo: string,
  status: 'unpaid' | 'paid',
  operatorRole: ChatRole = 'user'
): boolean {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const cleanOrderNo = (orderNo || canonicalNo).replace(/^#/, '');
  const msgs = getOrderChatMessages(canonicalNo);
  let changed = false;

  const updatedMsgs = msgs.map((m) => {
    // 匹配特定消息ID或账单卡片
    const isTarget =
      m.id === messageIdOrOrderNo ||
      m.text?.includes(`订单编号：#${canonicalNo}`) ||
      m.text?.includes(`订单编号：#${cleanOrderNo}`) ||
      (m.text?.startsWith('🧾【协同账单核销卡】') && (m.paymentStatus === 'unpaid' || !m.paymentStatus));

    if (isTarget) {
      changed = true;
      let newText = m.text || '';
      if (status === 'paid') {
        if (newText.includes('支付状态：')) {
          newText = newText.replace(/支付状态：(未付款|待付款|待支付)/g, '支付状态：已支付 (全额结清)');
        } else {
          newText += '\n支付状态：已支付 (全额结清)';
        }
      } else {
        if (newText.includes('支付状态：')) {
          newText = newText.replace(/支付状态：(已支付|已结清)/g, '支付状态：未付款 (待结清)');
        } else {
          newText += '\n支付状态：未付款 (待结清)';
        }
      }

      return {
        ...m,
        text: newText,
        paymentStatus: status,
        paidAt: status === 'paid' ? Date.now() : undefined,
        paidByRole: operatorRole,
        cloudSyncedAt: new Date().toISOString()
      };
    }
    return m;
  });

  if (changed) {
    const key = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
    try {
      localStorage.setItem(key, JSON.stringify(updatedMsgs));
      if (cleanOrderNo !== canonicalNo) {
        localStorage.setItem(`${CHAT_STORAGE_PREFIX}${cleanOrderNo}`, JSON.stringify(updatedMsgs));
      }
    } catch {
      // ignore
    }
    notifyChatUpdate(canonicalNo);
    if (cleanOrderNo !== canonicalNo) {
      notifyChatUpdate(cleanOrderNo);
    }
    // ⛅️ 异步向云端归档支付流水状态
    syncOrderChatsToCloud(canonicalNo, updatedMsgs).catch(() => {});
  }
  return changed;
}

/**
 * 获取一条消息在群内的已读未读明细（参考钉钉与飞书设计）
 */
export function getMessageReadReceiptSummary(
  msg: ChatMessageItem,
  order?: Order,
  _viewerRole?: ChatRole
): MessageReadReceiptSummary {
  const readBy = msg.readBy || {};
  const customerName = order?.customerName || '李明 (尾号 9281)';
  const truckName = order?.truckName || '黑曜石餐车 · 主厨';
  const courierName = order?.courierName || '陈志远 · 专线金牌骑手';

  // 协同参与者定义
  const allMembers: RoleMemberReadInfo[] = [
    {
      role: 'merchant',
      roleLabel: '餐车商家',
      roleBadgeColor: 'bg-amber-50 text-amber-800 border-amber-200/80',
      name: truckName,
      avatarIcon: 'store',
      isRead: Boolean(readBy.merchant),
      readAt: readBy.merchantReadAt,
      readTimeStr: readBy.merchantReadAt ? formatExactTime(readBy.merchantReadAt) : undefined
    },
    {
      role: 'user',
      roleLabel: '客户端食客',
      roleBadgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      name: customerName,
      avatarIcon: 'user',
      isRead: Boolean(readBy.user),
      readAt: readBy.userReadAt,
      readTimeStr: readBy.userReadAt ? formatExactTime(readBy.userReadAt) : undefined
    },
    {
      role: 'rider',
      roleLabel: '专线骑手',
      roleBadgeColor: 'bg-sky-50 text-sky-800 border-sky-200/80',
      name: courierName,
      avatarIcon: 'bike',
      isRead: Boolean(readBy.rider),
      readAt: readBy.riderReadAt,
      readTimeStr: readBy.riderReadAt ? formatExactTime(readBy.riderReadAt) : undefined
    }
  ];

  // 平台安防成员
  if (msg.senderRole === 'platform' || readBy.platform !== undefined) {
    allMembers.push({
      role: 'platform',
      roleLabel: '平台调度总控',
      roleBadgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
      name: '平台安防调度中枢',
      avatarIcon: 'shield',
      isRead: Boolean(readBy.platform ?? true),
      readAt: readBy.platformReadAt,
      readTimeStr: readBy.platformReadAt ? formatExactTime(readBy.platformReadAt) : undefined
    });
  }

  // 在钉钉与飞书中：对于发信方而言，统计的是“除发信人之外的其他所有成员”已读/未读状态；
  // 对于系统/状态变更消息，统计全员已读情况。
  const targetParticipants = msg.senderRole === 'system'
    ? allMembers.filter(m => m.role !== 'platform')
    : allMembers.filter(m => m.role !== msg.senderRole);

  const readMembers = targetParticipants.filter((m) => m.isRead);
  const unreadMembers = targetParticipants.filter((m) => !m.isRead);

  const totalParticipants = targetParticipants.length;
  const readCount = readMembers.length;
  const unreadCount = unreadMembers.length;
  const isAllRead = totalParticipants > 0 && unreadCount === 0;

  const readRoleNames = readMembers.map((m) => m.roleLabel.replace('端', '').replace('客户端', '食客')).join(' · ');
  const unreadRoleNames = unreadMembers.map((m) => m.roleLabel.replace('端', '').replace('客户端', '食客')).join(' · ');

  let summaryText = '';
  if (isAllRead) {
    summaryText = `全部已读 (${readCount}/${totalParticipants})`;
  } else if (readCount === 0) {
    summaryText = `${unreadCount}人未读`;
  } else {
    summaryText = `${readCount}人已读 · ${unreadRoleNames}未读`;
  }

  return {
    totalParticipants,
    readCount,
    unreadCount,
    isAllRead,
    readMembers,
    unreadMembers,
    summaryText,
    readRolesSummary: readRoleNames ? `${readRoleNames}已读` : '尚未已读',
    unreadRolesSummary: unreadRoleNames ? `${unreadRoleNames}未读` : '全员已读'
  };
}

/**
 * 类似钉钉的「一键DING催阅」/ 飞书强提醒功能
 */
export function dingRemindMember(
  orderNo: string,
  messageId: string,
  targetRole: ChatRole,
  senderRole: ChatRole = 'user'
): { success: boolean; message: string } {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const msgs = getOrderChatMessages(canonicalNo);
  const targetMsg = msgs.find((m) => m.id === messageId);
  if (!targetMsg) return { success: false, message: '消息不存在' };

  const roleNameMap: Record<string, string> = {
    rider: '专线骑手',
    merchant: '餐车档口主厨',
    user: '客户端食客',
    platform: '平台调度总控'
  };

  const senderTitle = roleNameMap[senderRole] || '协同成员';
  const targetTitle = roleNameMap[targetRole] || '协同成员';

  // 模拟发送极轻量的系统催阅 DING 提示
  sendOrderChatMessage(canonicalNo, {
    senderRole: 'system',
    senderName: '协同DING强提醒',
    type: 'system_notice',
    text: `⚡【协同 DING】${senderTitle} 催促【${targetTitle}】尽快查阅消息并同步状态。`
  });

  // 模拟对方在 3 秒后查看并完成已读
  setTimeout(() => {
    markOrderChatAsRead(canonicalNo, targetRole as any);
  }, 3200);

  return {
    success: true,
    message: `已向【${targetTitle}】发起强提醒 DING 催阅！`
  };
}

/**
 * 飞书/钉钉风格的表情表态切换 (Reaction)
 */
export function toggleChatMessageReaction(
  orderNo: string,
  messageId: string,
  emoji: string,
  senderRole: ChatRole
): void {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const msgs = getOrderChatMessages(canonicalNo);
  const updated = msgs.map((m) => {
    if (m.id !== messageId) return m;
    const reactions = { ...(m.reactions || {}) };
    const currentList = reactions[emoji] || [];
    const exists = currentList.includes(senderRole);
    if (exists) {
      reactions[emoji] = currentList.filter((r) => r !== senderRole);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...currentList, senderRole];
    }
    return { ...m, reactions };
  });

  const key = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
  localStorage.setItem(key, JSON.stringify(updated));
  notifyChatUpdate(canonicalNo);
}

/**
 * 局部更新单条消息的投递状态 (如: sending -> sent)
 */
export function updateChatMessageStatus(
  orderNo: string,
  messageId: string,
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
): void {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const cleanOrderNo = (orderNo || canonicalNo).replace(/^#/, '');
  const msgs = getOrderChatMessages(canonicalNo);
  let found = false;

  const updated = msgs.map((m) => {
    if (m.id === messageId) {
      found = true;
      return { ...m, deliveryStatus };
    }
    return m;
  });

  if (found) {
    try {
      const key = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
      localStorage.setItem(key, JSON.stringify(updated));
      if (cleanOrderNo !== canonicalNo) {
        localStorage.setItem(`${CHAT_STORAGE_PREFIX}${cleanOrderNo}`, JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
    notifyChatUpdate(canonicalNo);
  }
}

/**
 * 监听聊天消息变更
 */
export function subscribeOrderChat(orderNo?: string, callback?: (msgs: ChatMessageItem[]) => void): () => void {
  const cleanOrderNo = orderNo ? orderNo.replace(/^#/, '') : undefined;
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ orderNo: string }>;
    if (!cleanOrderNo || !custom.detail || custom.detail.orderNo === cleanOrderNo) {
      if (callback && cleanOrderNo) {
        callback(getOrderChatMessages(cleanOrderNo));
      } else if (callback) {
        callback([]);
      }
    }
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key && e.key.startsWith(CHAT_STORAGE_PREFIX)) {
      const storageOrderNo = e.key.replace(CHAT_STORAGE_PREFIX, '');
      if (!cleanOrderNo || storageOrderNo === cleanOrderNo) {
        if (callback && cleanOrderNo) {
          callback(getOrderChatMessages(cleanOrderNo));
        }
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(CHAT_EVENT_NAME, handler);
    window.addEventListener('storage', storageHandler);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(CHAT_EVENT_NAME, handler);
      window.removeEventListener('storage', storageHandler);
    }
  };
}

/**
 * 撤回消息 (2分钟内可撤回)
 */
export function recallChatMessage(
  orderNo: string,
  messageId: string,
  role: ChatRole
): { success: boolean; message: string; originalText?: string } {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const cleanOrderNo = (orderNo || canonicalNo).replace(/^#/, '');
  const msgs = getOrderChatMessages(canonicalNo);
  const target = msgs.find((m) => m.id === messageId);

  if (!target) {
    return { success: false, message: '消息不存在或已被清理' };
  }

  // 校验发送者是否为本人或平台管理员
  if (target.senderRole !== role && role !== 'platform') {
    return { success: false, message: '仅发送方可在规定时间内撤回消息' };
  }

  // 校验 2 分钟时效 (120 秒)
  const now = Date.now();
  const msgTs = target.timestamp || now;
  const deltaMs = now - msgTs;
  if (deltaMs > 2 * 60 * 1000 && role !== 'platform') {
    return { success: false, message: '发送时间已超过2分钟，无法撤回' };
  }

  const originalText = target.text || target.voiceTranscribed || '';

  const updated = msgs.map((m) => {
    if (m.id !== messageId) return m;
    return {
      ...m,
      isRecalled: true,
      recalledBy: role,
      recalledAt: now,
      originalTextBeforeRecall: originalText
    };
  });

  const key = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
  localStorage.setItem(key, JSON.stringify(updated));
  if (cleanOrderNo !== canonicalNo) {
    localStorage.setItem(`${CHAT_STORAGE_PREFIX}${cleanOrderNo}`, JSON.stringify(updated));
  }
  notifyChatUpdate(canonicalNo);
  if (cleanOrderNo !== canonicalNo) notifyChatUpdate(cleanOrderNo);

  return {
    success: true,
    message: '消息已成功撤回',
    originalText
  };
}

/**
 * 标记语音消息已被收听
 */
export function markVoiceMessageListened(orderNo: string, messageId: string): void {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const cleanOrderNo = (orderNo || canonicalNo).replace(/^#/, '');
  const msgs = getOrderChatMessages(canonicalNo);

  let updatedAny = false;
  const updated = msgs.map((m) => {
    if (m.id === messageId && !m.isListened) {
      updatedAny = true;
      return {
        ...m,
        isListened: true,
        listenedAt: Date.now()
      };
    }
    return m;
  });

  if (updatedAny) {
    const key = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
    localStorage.setItem(key, JSON.stringify(updated));
    if (cleanOrderNo !== canonicalNo) {
      localStorage.setItem(`${CHAT_STORAGE_PREFIX}${cleanOrderNo}`, JSON.stringify(updated));
    }
    notifyChatUpdate(canonicalNo);
    if (cleanOrderNo !== canonicalNo) notifyChatUpdate(cleanOrderNo);
  }
}

/**
 * 响应结构化异常工单卡片（换餐免差价补送、退还差价、查看泊位）
 */
export function updateExceptionWorkflow(
  orderNo: string,
  messageId: string,
  action: 'accept' | 'refund' | 'view_berth',
  role: ChatRole,
  payload?: any
): { success: boolean; message: string } {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const cleanOrderNo = (orderNo || canonicalNo).replace(/^#/, '');
  const msgs = getOrderChatMessages(canonicalNo);
  const target = msgs.find((m) => m.id === messageId);

  if (!target || !target.exceptionWorkflow) {
    return { success: false, message: '工单卡片不存在' };
  }

  const roleLabels: Record<string, string> = {
    user: '顾客食客',
    merchant: '餐车档口',
    rider: '配送骑手',
    platform: '平台总控'
  };

  let newStatus: 'accepted' | 'refund_requested' | 'completed' = 'completed';
  let noticeText = '';

  if (action === 'accept') {
    newStatus = 'accepted';
    const repName = target.exceptionWorkflow.replacementDish?.name || '替换菜品';
    noticeText = `🤝【异常工单协商闭环】${roleLabels[role] || '食客'}已确认同意更换为【${repName}】(免收差价)，后厨将加急现烤！`;
  } else if (action === 'refund') {
    newStatus = 'refund_requested';
    const refundAmt = target.exceptionWorkflow.refundAmount || target.exceptionWorkflow.originalDish?.price || 18;
    noticeText = `💰【退款申请达成】${roleLabels[role] || '食客'}申请原路退还差价 ¥${refundAmt.toFixed(2)}，财务中枢已自动受理即时原路退回！`;
  }

  const updated = msgs.map((m) => {
    if (m.id !== messageId) return m;
    return {
      ...m,
      exceptionWorkflow: {
        ...m.exceptionWorkflow!,
        status: newStatus,
        handledAt: Date.now(),
        handledByRole: role
      }
    };
  });

  const key = `${CHAT_STORAGE_PREFIX}${canonicalNo}`;
  localStorage.setItem(key, JSON.stringify(updated));
  if (cleanOrderNo !== canonicalNo) {
    localStorage.setItem(`${CHAT_STORAGE_PREFIX}${cleanOrderNo}`, JSON.stringify(updated));
  }
  notifyChatUpdate(canonicalNo);
  if (cleanOrderNo !== canonicalNo) notifyChatUpdate(cleanOrderNo);

  // 广播一条系统联动提示消息
  if (noticeText) {
    sendOrderChatMessage(canonicalNo, {
      senderRole: 'system',
      senderName: '工单履约中枢',
      type: 'system_notice',
      text: noticeText
    });
  }

  return { success: true, message: '工单状态已更新并同步全链路' };
}

// 对讲机双工占线指示事件
const INTERCOM_BUSY_EVENT = 'URBAN_RADAR_INTERCOM_BUSY_EVENT';

export function broadcastIntercomBusy(
  orderNo: string,
  role: ChatRole,
  isBusy: boolean,
  speakerName?: string
): void {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  if (typeof window !== 'undefined') {
    const ev = new CustomEvent(INTERCOM_BUSY_EVENT, {
      detail: {
        orderNo: canonicalNo,
        role,
        isBusy,
        speakerName: speakerName || (role === 'rider' ? '专线骑手' : role === 'merchant' ? '餐车主厨' : '食客')
      }
    });
    window.dispatchEvent(ev);
  }
}

export function subscribeIntercomBusy(
  orderNo: string,
  callback: (busyState: { isBusy: boolean; role?: ChatRole; speakerName?: string }) => void
): () => void {
  const canonicalNo = getCanonicalOrderNo(orderNo);
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ orderNo: string; role: ChatRole; isBusy: boolean; speakerName: string }>;
    if (custom.detail && custom.detail.orderNo === canonicalNo) {
      callback({
        isBusy: custom.detail.isBusy,
        role: custom.detail.role,
        speakerName: custom.detail.speakerName
      });
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(INTERCOM_BUSY_EVENT, handler);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(INTERCOM_BUSY_EVENT, handler);
    }
  };
}
