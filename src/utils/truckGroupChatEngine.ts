/**
 * truckGroupChatEngine.ts
 * ============================================================================
 * 流动餐车群聊天与跨餐车协同调度数据隔离引擎 (Fleet & Community Chat Engine)
 *
 * 【数据接线与隔离架构说明 (Data Wiring & Isolation Architecture)】:
 * 1. 命名空间严格隔离 (Namespace Isolation):
 *    - 订单专线 (Order Chat):           obsidian_order_chat_${orderNo} (保持 100% 独立)
 *    - 餐车站台老饕社群 (Truck Fan Group): obsidian_truck_fan_chat_${truckId} (每辆餐车专属独立存储)
 *    - 全车队跨餐车调度群 (Fleet Dispatch): obsidian_fleet_dispatch_chat (车队长/主厨/调度互通)
 * 2. 跨标签/多端广播总线隔离 (Event Bus Isolation):
 *    - 订单专线走: obsidian_chat_sync_bus
 *    - 车队群聊走: obsidian_fleet_group_chat_bus，广播携带 { channelType, channelId }
 *    - 确保群聊消息绝不污染或串线到订单专线，反之亦然。
 * 3. 腾讯云端存储与云函数对接 (CloudBase Real-time / Hot Backup):
 *    - 直连云集合 `obsidian_order_chats` 或云函数 `chatMessages`，写入字段显式区分:
 *      { channelType: 'truck_community' | 'fleet_dispatch', channelId: string, ... }
 * ============================================================================
 */

import { safeGetStorage, safeSetStorage } from './safeStorage';
import { callCloudFunction, getCloudbaseApp, ensureCloudbaseAuth, TCB_COLLECTIONS, TCB_FUNCTION_NAMES } from './cloudbase';
import { getAllTruckConfigs, getActiveTruckConfig, TruckLocationConfig } from './truckLocationEngine';

export type GroupChannelType = 'truck_community' | 'fleet_dispatch';

export type GroupSenderRole = 'merchant' | 'chef' | 'rider' | 'customer' | 'dispatcher' | 'system';

export interface GroupChatMessage {
  id: string;
  channelType: GroupChannelType;
  channelId: string; // e.g. 'truck-01', 'truck-02', or 'fleet-command'
  senderId: string;
  senderRole: GroupSenderRole;
  senderName: string;
  senderAvatar?: string;
  senderTruckId?: string; // 标识属于哪辆餐车，如 'truck-01'
  senderTruckName?: string; // 如 '01号车·南广场总站'
  senderBadge?: string; // 如 '主理人', '驻点主厨', '黄金老饕', '区域车队长', '专线骑手'
  time: string; // e.g. "12:35"
  timeExact: string; // e.g. "12:35:18"
  timestamp: number;
  type:
    | 'text'
    | 'voice'
    | 'image'
    | 'flash_sale' // 现烤秒杀卡片 (单品特惠抢购)
    | 'limited_dish' // 限定尝鲜尝新
    | 'stock_transfer' // 跨车物料紧急调拨申请
    | 'berth_broadcast' // 泊位变更广播
    | 'weather_warning' // 恶劣天气/暴雨停靠通知
    | 'intercom_voice' // 车队对讲广播
    | 'system_notice'; // 系统通知
  text?: string;
  voiceDuration?: number; // 秒数
  voiceTranscribed?: string;
  voiceAudioBase64?: string;
  voiceWaveform?: number[];
  imageUrl?: string;
  imageTitle?: string;
  // 现烤秒杀卡片详情 (老饕群互动)
  flashSaleInfo?: {
    dishId: string;
    dishName: string;
    price: number;
    originalPrice: number;
    stockRemaining: number;
    totalStock: number;
    expiryTimeStr: string; // e.g. '12:30 截止'
    imageUrl?: string;
    claimedUsers?: string[]; // 已抢购用户列表
  };
  // 跨餐车原料调拨数据卡片 (车队调度群协同)
  stockTransferInfo?: {
    transferId: string;
    fromTruckId: string;
    fromTruckName: string;
    toTruckId: string;
    toTruckName: string;
    materialName: string;
    requestedQty: number;
    unit: string;
    status: 'pending' | 'accepted' | 'dispatched' | 'completed' | 'rejected';
    urgency: 'high' | 'normal';
    courierName?: string;
    transferNotes?: string;
    updatedAt?: number;
  };
  // 泊位变更数据 (车队联动)
  berthInfo?: {
    truckId: string;
    truckName: string;
    oldLocation: string;
    newLocation: string;
    reason: string;
    distanceDeltaMeters: number;
    lat: number;
    lng: number;
  };
  reactions?: Record<string, string[]>; // e.g. { '👍': ['食客小王', '主理人'], '🔥': ['李哥'] }
  readBy?: Record<string, boolean>; // userId/role -> true
}

const STORAGE_PREFIX_TRUCK_COMMUNITY = 'obsidian_truck_fan_chat_';
const STORAGE_KEY_FLEET_DISPATCH = 'obsidian_fleet_dispatch_chat';
const STORAGE_KEY_JOINED_TRUCKS = 'obsidian_joined_truck_groups';
const FLEET_GROUP_CHAT_EVENT = 'obsidian_fleet_group_chat_event';

// 独立的车队多群广播信道 (与订单专线完全物理隔离)
let fleetBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    fleetBroadcastChannel = new BroadcastChannel('obsidian_fleet_group_chat_bus');
    fleetBroadcastChannel.onmessage = (event) => {
      if (event.data && event.data.channelType && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(FLEET_GROUP_CHAT_EVENT, {
            detail: {
              channelType: event.data.channelType,
              channelId: event.data.channelId,
              fromBroadcast: true
            }
          })
        );
      }
    };
  } catch {
    // safe fallback
  }
}

function notifyFleetGroupUpdate(channelType: GroupChannelType, channelId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(FLEET_GROUP_CHAT_EVENT, {
        detail: { channelType, channelId }
      })
    );
    if (fleetBroadcastChannel) {
      try {
        fleetBroadcastChannel.postMessage({ channelType, channelId, timestamp: Date.now() });
      } catch {}
    }
  }
}

/**
 * 格式化精确时间
 */
export function formatTimeExact(ts: number = Date.now()): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function formatTimeShort(ts: number = Date.now()): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * 计算存储键 (绝对隔离)
 */
function getStorageKey(channelType: GroupChannelType, channelId: string): string {
  if (channelType === 'fleet_dispatch') {
    return STORAGE_KEY_FLEET_DISPATCH;
  }
  return `${STORAGE_PREFIX_TRUCK_COMMUNITY}${channelId || 'truck-01'}`;
}

/**
 * 默认初始社群消息生成 (针对每辆餐车的不同风格与站台特色)
 */
function generateInitialCommunityMessages(truckId: string): GroupChatMessage[] {
  const trucks = getAllTruckConfigs();
  const truck = trucks.find((t) => t.id === truckId) || getActiveTruckConfig();
  const now = Date.now();

  const t1 = now - 35 * 60 * 1000;
  const t2 = now - 22 * 60 * 1000;
  const t3 = now - 15 * 60 * 1000;
  const t4 = now - 8 * 60 * 1000;
  const t5 = now - 2 * 60 * 1000;

  return [
    {
      id: `${truckId}-comm-1`,
      channelType: 'truck_community',
      channelId: truckId,
      senderId: `chef-${truckId}`,
      senderRole: 'chef',
      senderName: `${truck.name} · 站台主厨王师傅`,
      senderAvatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=120&h=120&fit=crop&crop=faces',
      senderTruckId: truckId,
      senderTruckName: truck.name,
      senderBadge: '主厨兼站长',
      time: formatTimeShort(t1),
      timeExact: formatTimeExact(t1),
      timestamp: t1,
      type: 'system_notice',
      text: `🎉 欢迎加入【${truck.name} · 官方老饕粉丝群】！每日出摊现烤秒杀、限定尝鲜与专属加料券均在此处首发发放。`,
      reactions: { '🔥': ['食客阿杰', '张先生'], '❤️': ['琳达'] }
    },
    {
      id: `${truckId}-comm-2`,
      channelType: 'truck_community',
      channelId: truckId,
      senderId: `chef-${truckId}`,
      senderRole: 'chef',
      senderName: `${truck.name} · 站台主厨王师傅`,
      senderAvatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=120&h=120&fit=crop&crop=faces',
      senderTruckId: truckId,
      senderTruckName: truck.name,
      senderBadge: '主厨兼站长',
      time: formatTimeShort(t2),
      timeExact: formatTimeExact(t2),
      timestamp: t2,
      type: 'flash_sale',
      text: '【今日现烤秒杀】：刚刚出炉的特选果木炭烤和牛牛肉饼！肉汁饱满，仅限群内前 10 份专享 6 折尝鲜！',
      flashSaleInfo: {
        dishId: 'dish-flash-wagyu',
        dishName: '炭烤和牛小汉堡双重奏 (现烤特批)',
        price: 28.8,
        originalPrice: 48.0,
        stockRemaining: 4,
        totalStock: 10,
        expiryTimeStr: '今日 14:00 截止',
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
        claimedUsers: ['老饕刘先生', '陈女士', '小周', 'David', '食客阿强', '王婷婷']
      },
      reactions: { '⚡': ['小周', '老饕刘先生'], '👍': ['David', '陈女士'] }
    },
    {
      id: `${truckId}-comm-3`,
      channelType: 'truck_community',
      channelId: truckId,
      senderId: 'user-009',
      senderRole: 'customer',
      senderName: '老饕刘先生',
      senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=faces',
      senderBadge: '黄金老饕',
      time: formatTimeShort(t3),
      timeExact: formatTimeExact(t3),
      timestamp: t3,
      type: 'text',
      text: '刚抢到一份现烤和牛汉堡，肉饼外焦里嫩咬下去爆汁！主厨今天火候把控太棒了，强烈推荐配青柠气泡水解腻！',
      reactions: { '👏': ['站台主厨王师傅', '陈女士'], '😋': ['小周'] }
    },
    {
      id: `${truckId}-comm-4`,
      channelType: 'truck_community',
      channelId: truckId,
      senderId: 'rider-01',
      senderRole: 'rider',
      senderName: '陈志远 · 专线金牌骑手',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces',
      senderBadge: '专线极速骑手',
      time: formatTimeShort(t4),
      timeExact: formatTimeExact(t4),
      timestamp: t4,
      type: 'text',
      text: `报告大家，我正在 ${truck.locationName} 餐车档口前待命。保温箱恒温 65℃，商圈周围 3km 极速专送下单平均 8 分钟内送达写字楼前台！`,
      reactions: { '⚡': ['老饕刘先生', '站台主厨王师傅'] }
    },
    {
      id: `${truckId}-comm-5`,
      channelType: 'truck_community',
      channelId: truckId,
      senderId: `merchant-${truckId}`,
      senderRole: 'merchant',
      senderName: `${truck.name} · 营运调度员`,
      senderAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop&crop=faces',
      senderTruckId: truckId,
      senderTruckName: truck.name,
      senderBadge: '站台运营',
      time: formatTimeShort(t5),
      timeExact: formatTimeExact(t5),
      timestamp: t5,
      type: 'text',
      text: '各位食客朋友，餐车配备的智能恒温保温柜与无线对讲已上线。有任何加辣、免葱、或者桌台拼单需求随时在群内发消息～'
    }
  ];
}

/**
 * 默认初始车队指挥群消息 (01/02/03/04 车调度互通)
 */
function generateInitialFleetDispatchMessages(): GroupChatMessage[] {
  const now = Date.now();
  const t1 = now - 45 * 60 * 1000;
  const t2 = now - 28 * 60 * 1000;
  const t3 = now - 18 * 60 * 1000;
  const t4 = now - 10 * 60 * 1000;
  const t5 = now - 3 * 60 * 1000;

  return [
    {
      id: 'fleet-init-1',
      channelType: 'fleet_dispatch',
      channelId: 'fleet-command',
      senderId: 'dispatcher-hq',
      senderRole: 'dispatcher',
      senderName: '战区调度长 · 老张',
      senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=faces',
      senderBadge: '战区车队长',
      time: formatTimeShort(t1),
      timeExact: formatTimeExact(t1),
      timestamp: t1,
      type: 'system_notice',
      text: '🛡️ 【全车队调度中枢已启动】01号南广场、02号静安大悦城、03号张江高科、04号陆家嘴滨江已完成全网 GPS 联调。各车长保持对讲信道通畅。',
      reactions: { '🫡': ['01号车·主厨', '02号车·车长', '03号车·张江站'] }
    },
    {
      id: 'fleet-init-2',
      channelType: 'fleet_dispatch',
      channelId: 'fleet-command',
      senderId: 'chef-truck-01',
      senderRole: 'chef',
      senderName: '01号车 · 主厨王师傅',
      senderAvatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=120&h=120&fit=crop&crop=faces',
      senderTruckId: 'truck-01',
      senderTruckName: '01号流动餐车 (南广场总站)',
      senderBadge: '01车主厨',
      time: formatTimeShort(t2),
      timeExact: formatTimeExact(t2),
      timestamp: t2,
      type: 'stock_transfer',
      text: '【跨车物料支援紧急申请】：01号车午市客流暴增，冷鲜和牛饼仅剩 3 份！特向 02号静安大悦城车申请调拨 15 份，请就近专线骑手接单转运！',
      stockTransferInfo: {
        transferId: 'TF-202609-001',
        fromTruckId: 'truck-02',
        fromTruckName: '02号流动餐车 (静安大悦城)',
        toTruckId: 'truck-01',
        toTruckName: '01号流动餐车 (南广场总站)',
        materialName: '特选冷鲜和牛牛肉饼 (标准冷链封装)',
        requestedQty: 15,
        unit: '份',
        status: 'dispatched',
        urgency: 'high',
        courierName: '陈志远 (骑手工单调配中)',
        transferNotes: '温控保温箱加急直送，预估耗时 6 分钟完成档口交接',
        updatedAt: t3
      },
      reactions: { '⚡': ['02号车·车长', '战区车队长'] }
    },
    {
      id: 'fleet-init-3',
      channelType: 'fleet_dispatch',
      channelId: 'fleet-command',
      senderId: 'merchant-truck-02',
      senderRole: 'merchant',
      senderName: '02号车 · 李车长',
      senderAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&h=120&fit=crop&crop=faces',
      senderTruckId: 'truck-02',
      senderTruckName: '02号流动餐车 (静安大悦城)',
      senderBadge: '02车车长',
      time: formatTimeShort(t3),
      timeExact: formatTimeExact(t3),
      timestamp: t3,
      type: 'text',
      text: '02号车冷库储备充裕，已为01号车出库 15 份冷鲜肉饼！骑手陈志远已核验封签出车，预计 5 分钟内抵达01号车南广场后仓！',
      reactions: { '🤝': ['01号车·主厨王师傅', '战区车队长'] }
    },
    {
      id: 'fleet-init-4',
      channelType: 'fleet_dispatch',
      channelId: 'fleet-command',
      senderId: 'merchant-truck-03',
      senderRole: 'merchant',
      senderName: '03号车 · 张工',
      senderAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&fit=crop&crop=faces',
      senderTruckId: 'truck-03',
      senderTruckName: '03号流动餐车 (张江高科)',
      senderBadge: '03车驻点',
      time: formatTimeShort(t4),
      timeExact: formatTimeExact(t4),
      timestamp: t4,
      type: 'berth_broadcast',
      text: '【泊位联动播报】：张江高科园区南门绿化带临时管线施工，03号车已安全移泊至东门 2 号连廊，距原位 45 米，食客自提引流标牌已竖立完毕！',
      berthInfo: {
        truckId: 'truck-03',
        truckName: '03号流动餐车 (张江高科)',
        oldLocation: '张江园区南门广场 A 区',
        newLocation: '张江园区东门 2 号科技连廊',
        reason: '园区绿化管线维护微调',
        distanceDeltaMeters: 45,
        lat: 31.2052,
        lng: 121.5982
      },
      reactions: { '📍': ['战区调度长', '01号车·主厨'] }
    },
    {
      id: 'fleet-init-5',
      channelType: 'fleet_dispatch',
      channelId: 'fleet-command',
      senderId: 'dispatcher-hq',
      senderRole: 'dispatcher',
      senderName: '战区调度长 · 老张',
      senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=faces',
      senderBadge: '战区车队长',
      time: formatTimeShort(t5),
      timeExact: formatTimeExact(t5),
      timestamp: t5,
      type: 'text',
      text: '各车注意：今日午高峰履约率达 99.1%，调拨响应时间缩短至 4 分钟！各车长请巡检发电机油量与冷藏柜温控，准备迎接 17:30 晚高峰。'
    }
  ];
}

/**
 * 同步获取指定群聊消息列表 (本地优先渲染，严格隔离存储)
 */
export function getGroupChatMessages(channelType: GroupChannelType, channelId: string): GroupChatMessage[] {
  const key = getStorageKey(channelType, channelId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // 种子初始数据
  const initial =
    channelType === 'fleet_dispatch'
      ? generateInitialFleetDispatchMessages()
      : generateInitialCommunityMessages(channelId || 'truck-01');

  try {
    localStorage.setItem(key, JSON.stringify(initial));
  } catch {}

  return initial;
}

/**
 * 发送群聊消息 (本地乐观更新 + 广播信道派发 + 腾讯云端异步同步)
 */
export function sendGroupChatMessage(
  channelType: GroupChannelType,
  channelId: string,
  msgInput: Partial<GroupChatMessage>
): GroupChatMessage {
  const key = getStorageKey(channelType, channelId);
  const now = Date.now();

  const newMsg: GroupChatMessage = {
    id: msgInput.id || `grp-${channelType}-${channelId}-${now}-${Math.random().toString(36).substring(2, 7)}`,
    channelType,
    channelId,
    senderId: msgInput.senderId || 'user-me',
    senderRole: msgInput.senderRole || 'customer',
    senderName: msgInput.senderName || '我',
    senderAvatar: msgInput.senderAvatar,
    senderTruckId: msgInput.senderTruckId,
    senderTruckName: msgInput.senderTruckName,
    senderBadge: msgInput.senderBadge,
    time: formatTimeShort(now),
    timeExact: formatTimeExact(now),
    timestamp: now,
    type: msgInput.type || 'text',
    text: msgInput.text || '',
    voiceDuration: msgInput.voiceDuration,
    voiceTranscribed: msgInput.voiceTranscribed,
    voiceAudioBase64: msgInput.voiceAudioBase64,
    voiceWaveform: msgInput.voiceWaveform,
    imageUrl: msgInput.imageUrl,
    imageTitle: msgInput.imageTitle,
    flashSaleInfo: msgInput.flashSaleInfo,
    stockTransferInfo: msgInput.stockTransferInfo,
    berthInfo: msgInput.berthInfo,
    reactions: msgInput.reactions || {},
    readBy: { [msgInput.senderId || 'user-me']: true }
  };

  const list = getGroupChatMessages(channelType, channelId);
  const updated = [...list, newMsg];

  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}

  // 跨标签广播与本地事件派发
  notifyFleetGroupUpdate(channelType, channelId);

  // 异步上报至腾讯云函数/数据库
  syncGroupMessageToCloud(newMsg).catch(() => {});

  return newMsg;
}

/**
 * 订阅指定群聊的消息更新
 */
export function subscribeGroupChat(
  channelType: GroupChannelType,
  channelId: string,
  callback: (messages: GroupChatMessage[]) => void
): () => void {
  const handler = (event: Event) => {
    const custom = event as CustomEvent;
    if (custom.detail) {
      if (custom.detail.channelType === channelType && custom.detail.channelId === channelId) {
        callback(getGroupChatMessages(channelType, channelId));
      }
    } else {
      callback(getGroupChatMessages(channelType, channelId));
    }
  };

  window.addEventListener(FLEET_GROUP_CHAT_EVENT, handler);
  return () => {
    window.removeEventListener(FLEET_GROUP_CHAT_EVENT, handler);
  };
}

/**
 * 表情反应切换 (Reaction)
 */
export function toggleGroupMessageReaction(
  channelType: GroupChannelType,
  channelId: string,
  msgId: string,
  emoji: string,
  userName: string
) {
  const key = getStorageKey(channelType, channelId);
  const list = getGroupChatMessages(channelType, channelId);
  const target = list.find((m) => m.id === msgId);
  if (!target) return;

  const reactions = { ...(target.reactions || {}) };
  const currentUsers = reactions[emoji] || [];

  if (currentUsers.includes(userName)) {
    reactions[emoji] = currentUsers.filter((u) => u !== userName);
    if (reactions[emoji].length === 0) {
      delete reactions[emoji];
    }
  } else {
    reactions[emoji] = [...currentUsers, userName];
  }

  target.reactions = reactions;

  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
  notifyFleetGroupUpdate(channelType, channelId);
}

/**
 * 跨餐车调拨单状态流转
 */
export function updateStockTransferStatus(
  channelId: string,
  msgId: string,
  newStatus: 'pending' | 'accepted' | 'dispatched' | 'completed' | 'rejected',
  courierName?: string
) {
  const channelType: GroupChannelType = 'fleet_dispatch';
  const key = getStorageKey(channelType, channelId);
  const list = getGroupChatMessages(channelType, channelId);
  const target = list.find((m) => m.id === msgId);
  if (!target || !target.stockTransferInfo) return;

  target.stockTransferInfo.status = newStatus;
  target.stockTransferInfo.updatedAt = Date.now();
  if (courierName) {
    target.stockTransferInfo.courierName = courierName;
  }

  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
  notifyFleetGroupUpdate(channelType, channelId);
}

/**
 * 抢购现烤秒杀单品
 */
export function claimFlashSaleDish(channelId: string, msgId: string, userName: string): boolean {
  const channelType: GroupChannelType = 'truck_community';
  const key = getStorageKey(channelType, channelId);
  const list = getGroupChatMessages(channelType, channelId);
  const target = list.find((m) => m.id === msgId);
  if (!target || !target.flashSaleInfo) return false;

  const info = target.flashSaleInfo;
  if (info.stockRemaining <= 0) return false;
  if (info.claimedUsers?.includes(userName)) return false;

  info.stockRemaining = Math.max(0, info.stockRemaining - 1);
  info.claimedUsers = [...(info.claimedUsers || []), userName];

  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
  notifyFleetGroupUpdate(channelType, channelId);
  return true;
}

/**
 * 标记群聊已读
 */
export function markGroupChatAsRead(channelType: GroupChannelType, channelId: string, readerId: string = 'me') {
  const readKey = `obsidian_group_read_${channelType}_${channelId}_${readerId}`;
  safeSetStorage(readKey, Date.now());
}

/**
 * 获取群聊未读条数
 */
export function getGroupChatUnreadCount(channelType: GroupChannelType, channelId: string, readerId: string = 'me'): number {
  const readKey = `obsidian_group_read_${channelType}_${channelId}_${readerId}`;
  const lastReadTs = safeGetStorage<number>(readKey, 0);
  const list = getGroupChatMessages(channelType, channelId);
  return list.filter((m) => m.timestamp > lastReadTs).length;
}

/**
 * 餐车老饕群成员状态持久化 (用户加入/退出)
 */
export function getJoinedTruckGroupIds(): string[] {
  return safeGetStorage<string[]>(STORAGE_KEY_JOINED_TRUCKS, ['truck-01']); // 默认已加入01号车群
}

export function isTruckCommunityMember(truckId: string): boolean {
  const ids = getJoinedTruckGroupIds();
  return ids.includes(truckId);
}

export function joinTruckCommunityGroup(truckId: string): string[] {
  const ids = getJoinedTruckGroupIds();
  if (!ids.includes(truckId)) {
    const next = [...ids, truckId];
    safeSetStorage(STORAGE_KEY_JOINED_TRUCKS, next);
    // 自动在群内发送一条系统加入提醒
    sendGroupChatMessage('truck_community', truckId, {
      senderId: 'system',
      senderRole: 'system',
      senderName: '老饕社群管家',
      type: 'system_notice',
      text: `🎉 新老饕食客刚刚扫码加入了本餐车粉丝群！欢迎大家交流美味心得～`
    });
    return next;
  }
  return ids;
}

/**
 * 腾讯云同步实现 (异步尽力投递)
 */
async function syncGroupMessageToCloud(msg: GroupChatMessage): Promise<void> {
  try {
    const cloudPayload = {
      ...msg,
      channelScope: 'fleet_synergy_group',
      serverReceivedAt: new Date().toISOString()
    };

    // 1. 调用云函数
    const fnRes = await callCloudFunction(TCB_FUNCTION_NAMES.CHAT_MESSAGES, {
      action: 'saveGroupMessage',
      groupMessage: cloudPayload
    });
    if (fnRes && fnRes.success) return;
  } catch {
    // 降级尝试直连云数据库
  }

  try {
    await ensureCloudbaseAuth();
    const { db: tcbDb } = getCloudbaseApp();
    if (tcbDb) {
      await tcbDb.collection(TCB_COLLECTIONS.CHAT_MESSAGES).add({
        ...msg,
        channelScope: 'fleet_synergy_group',
        cloudSyncedAt: new Date().toISOString()
      });
    }
  } catch {
    // 本地已落盘，云端网络失败静默兜底
  }
}
