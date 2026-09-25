import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Store,
  Printer,
  Ban,
  CheckCircle2,
  Clock,
  MapPin,
  Bike,
  Volume2,
  VolumeX,
  Search,
  X,
  AlertTriangle,
  FileText,
  Lock,
  Unlock,
  MessageSquare,
  Check,
  ShieldAlert,
  Flame,
  ChefHat,
  KeyRound,
  Scan,
  Utensils,
  ShoppingBag,
  ArrowRightLeft,
  ChevronDown,
  List,
  LayoutGrid,
  Power,
  RotateCw,
  Package,
  Megaphone,
  Trash2,
  CalendarDays,
  Filter,
  Phone,
  AlertCircle,
  Terminal,
  XCircle
} from 'lucide-react';
import { BeautifiedDropdownMenu, BeautifiedDropdownItem } from '../common/BeautifiedDropdownMenu';
import { Order } from '../../types';
import { UnifiedOmniChatModal } from '../chat/UnifiedOmniChatModal';
import { MerchantPickupVerifyModal } from './MerchantPickupVerifyModal';
import { MerchantAuditConvertToDeliveryModal } from './MerchantAuditConvertToDeliveryModal';
import { getOrGeneratePickupCode, getPickupShelfCode, subscribePickupVerifiedEvent } from '../../utils/pickupCodeEngine';
import { resolveOrderChannelType } from '../../utils/orderNormalizer';
import { DateRangeFilter } from '../common/DateRangeFilter';
import { DateFilterState, resolveDateRange, isDayStringWithinRange } from '../../utils/dateFilter';
import { voiceAlerts, unlockAudioContext } from '../../utils/voiceAlertEngine';
import { AccountAuditDrawer } from './AccountAuditDrawer';
import { globalScannerEngine, playScannerBeep } from '../../utils/barcodeScannerEngine';
import { businessTransactionEngine } from '../../utils/businessTransactionEngine';
import { UiverseSonarBeacon, UiverseFlameTag } from './uiverse/UiverseDynamicComponents';
import { merchantBackupEngine } from '../../utils/merchantBackupEngine';
import { MerchantStrikeOffCompensationModal } from './MerchantStrikeOffCompensationModal';
import { MerchantOrderEditModal } from './MerchantOrderEditModal';
import { Edit3, RotateCcw } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { OrderMetaDrawerCard } from './OrderMetaDrawerCard';
import { OrdersColumnsPref, loadLocalPrefs, ordersColumnsClass } from '../../utils/workspacePreferences';
import { getUnifiedTruckName } from '../../utils/truckNaming';
import { AutoScrollButtonRow } from './AutoScrollButtonRow';
import { MerchantOrdersListView } from './MerchantOrdersListView';

const REJECT_REASON_OPTIONS: BeautifiedDropdownItem[] = [
  { value: '食材售罄，无法现制', label: '食材售罄，无法现制', description: '档口核心原料已沽清，无法继续现制', badge: '原料沽清', icon: XCircle },
  { value: '餐车爆单，出餐超时', label: '餐车爆单，出餐超时', description: '排单超负荷运转，预计超过出餐时限', badge: '负荷过载', icon: Flame },
  { value: '超出餐车配送辐射范围', label: '超出餐车配送辐射范围', description: '送餐地址超出当前驻车点最大配送半径', badge: '超范围', icon: Bike },
  { value: '恶劣天气暂停外送', label: '恶劣天气暂停外送', description: '暴雨或特殊天气，平台临时中止极速专送', badge: '天气预警', icon: ShieldAlert },
  { value: '食客电话联系退单', label: '食客电话联系退单', description: '食客主动通过电话联系档口协商取消', badge: '电话协商', icon: Phone },
];

const DELETE_REASON_OPTIONS: BeautifiedDropdownItem[] = [
  { value: '顾客误触/重复下单作废', label: '顾客误触 / 重复下单作废', description: '食客误触多点或网络波动重复提交的重复工单', badge: '误触重复', icon: AlertCircle },
  { value: '线下电话协商取消并作废', label: '线下电话协商取消并作废', description: '已与顾客电话取得一致，取消并释放产能', badge: '协商确认', icon: Phone },
  { value: '测试模拟仿真单作废', label: '测试模拟仿真单作废', description: '开发调试与系统联调产生的沙盒工单', badge: '开发仿真', icon: Terminal },
  { value: '顾客未付款或异常跑单', label: '顾客未付款或异常跑单', description: '顾客未履约支付或现场异常离店弃单', badge: '异常跑单', icon: ShieldAlert },
  { value: '档口食材售罄且顾客要求全单作废', label: '食材售罄顾客要求作废', description: '主要餐品沽清且食客不接受调换餐品', badge: '原料沽清', icon: XCircle },
  { value: 'other', label: '其他原因 (自定义填写)', description: '手工输入详细作废备忘说明', badge: '自定义', icon: Edit3 },
];

// Helper to extract exact YYYY-MM-DD from order
export function resolveOrderDay(order: Order): string {
  const anyOrder = order as any;
  if (anyOrder.createdAt && typeof anyOrder.createdAt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(anyOrder.createdAt)) {
    return anyOrder.createdAt.slice(0, 10);
  }
  if (order.createdTime && /^\d{4}-\d{2}-\d{2}/.test(order.createdTime)) {
    return order.createdTime.slice(0, 10);
  }
  if (anyOrder.timestamp && typeof anyOrder.timestamp === 'string' && /^\d{4}-\d{2}-\d{2}/.test(anyOrder.timestamp)) {
    return anyOrder.timestamp.slice(0, 10);
  }
  if (order.id?.includes('yesterday') || order.orderNo?.includes('7077') || order.orderNo?.includes('9820')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

interface MerchantOrdersProps {
  orders: Order[];
  onAcceptOrder?: (orderId: string) => void;
  onAdvanceOrderStatus: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onRejectOrder: (orderId: string, reason: string) => void;
  onDeleteOrder?: (orderId: string, reason?: string) => void;
  onAuditRefund?: (orderId: string, approved: boolean, rejectReason?: string) => void;
  onToggleNonRefundable?: (orderId: string, nonRefundable: boolean) => void;
  showToast: (msg: string) => void;
}

function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function safeSetStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore
  }
}

export const MerchantOrders: React.FC<MerchantOrdersProps> = ({
  orders,
  onAcceptOrder,
  onAdvanceOrderStatus,
  onRejectOrder,
  onDeleteOrder,
  onAuditRefund,
  onToggleNonRefundable,
  showToast
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'pending' | 'cooking' | 'delivering' | 'completed' | 'refund'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'delivery' | 'dine_in' | 'pickup'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [activeMobileDropdown, setActiveMobileDropdown] = useState<'status' | 'channel' | 'actions' | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  
  // 监听页面滚动与窗口尺寸变化，自动收起移动端悬浮菜单
  useEffect(() => {
    if (!activeMobileDropdown) return;
    const handleDismiss = () => setActiveMobileDropdown(null);
    window.addEventListener('scroll', handleDismiss, { passive: true });
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [activeMobileDropdown]);
  
  // Date filtering state（批次4：换用共享 DateRangeFilter，预设档+自定义起止精确到分钟；归日粒度行为不变）
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const dateRange = useMemo(() => resolveDateRange(dateFilter), [dateFilter]);
  
  // Automations - Default FALSE (Merchant must explicitly enable auto-accept)
  const [isAutoAccept, setIsAutoAccept] = useState<boolean>(() => {
    return safeGetStorage<boolean>('obsidian_merchant_auto_accept', false);
  });
  const [isVoiceBroadcast, setIsVoiceBroadcast] = useState<boolean>(() => {
    return safeGetStorage<boolean>('obsidian_merchant_voice_broadcast', true);
  });

  useEffect(() => {
    safeSetStorage('obsidian_merchant_auto_accept', isAutoAccept);
  }, [isAutoAccept]);

  useEffect(() => {
    safeSetStorage('obsidian_merchant_voice_broadcast', isVoiceBroadcast);
  }, [isVoiceBroadcast]);

  // 自动接单：开启后，待接单状态的订单自动流入后厨制作
  useEffect(() => {
    if (!isAutoAccept) return;
    orders.forEach((o) => {
      if (o.status === 'pending') {
        handleAcceptSingleOrder(o);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoAccept, orders]);

  // Modals
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [chatOrder, setChatOrder] = useState<Order | null>(null);
  const [verifyTargetOrder, setVerifyTargetOrder] = useState<Order | null>(null);
  const [auditConvertTargetOrder, setAuditConvertTargetOrder] = useState<Order | null>(null);
  const [rejectOrderTarget, setRejectOrderTarget] = useState<Order | null>(null);

  // 划菜与客诉补偿弹窗状态
  const [strikeOffModalState, setStrikeOffModalState] = useState<{
    isOpen: boolean;
    order: Order | null;
    itemIndex: number | null;
  }>({ isOpen: false, order: null, itemIndex: null });

  // 商家直接修改订单内容弹窗状态
  const [orderEditModalState, setOrderEditModalState] = useState<{
    isOpen: boolean;
    order: Order | null;
  }>({ isOpen: false, order: null });

  // 悬停抽屉信息卡状态（支持鼠标悬停与点击常驻固定）
  const [hoveredDrawerOrderNo, setHoveredDrawerOrderNo] = useState<string | null>(null);
  const [pinnedDrawerOrderNo, setPinnedDrawerOrderNo] = useState<string | null>(null);
  const drawerTimerRef = React.useRef<any>(null);

  const handleMetaMouseEnter = (orderNo: string) => {
    if (drawerTimerRef.current) clearTimeout(drawerTimerRef.current);
    setHoveredDrawerOrderNo(orderNo);
  };

  const handleMetaMouseLeave = () => {
    if (drawerTimerRef.current) clearTimeout(drawerTimerRef.current);
    drawerTimerRef.current = setTimeout(() => {
      setHoveredDrawerOrderNo(null);
    }, 220);
  };

  const handleDrawerMouseEnter = () => {
    if (drawerTimerRef.current) clearTimeout(drawerTimerRef.current);
  };

  const handleTogglePinDrawer = (orderNo: string) => {
    setPinnedDrawerOrderNo((prev) => (prev === orderNo ? null : orderNo));
  };

  // 划菜操作处理函数
  const handleConfirmStrikeOff = (
    orderId: string,
    itemIndex: number,
    info: {
      reason: string;
      compensationType: 'refund' | 'free_gift' | 'replace_dish' | 'coupon' | 'none';
      compensationDetail: string;
      compensationAmount: number;
      giftDishName?: string;
      replaceDishName?: string;
    }
  ) => {
    const target = orders.find((o) => o.orderNo === orderId || o.id === orderId);
    if (!target) return;

    const nowStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const updatedItems = target.items.map((it, idx) => {
      if (idx !== itemIndex) return it;
      return {
        ...it,
        isStruckOff: true,
        struckOffReason: info.reason,
        struckOffAt: nowStr,
        compensationType: info.compensationType,
        compensationDetail: info.compensationDetail,
        compensationAmount: info.compensationAmount
      };
    });

    // 如果补偿类型是免费赠送，自动向订单中追加标记为致歉赠品的菜品
    if (info.compensationType === 'free_gift' && info.giftDishName) {
      updatedItems.push({
        name: `${info.giftDishName} (致歉赠送)`,
        quantity: 1,
        price: 0,
        options: '商家划菜致歉赠送 · 随单出餐',
        isCompensatoryGift: true,
        serveStatus: 'cooking'
      });
    }

    // 重新计算订单金额 (划除的菜品若执行退款，则在总额中扣减)
    const struckPrice = (target.items[itemIndex]?.price || 0) * (target.items[itemIndex]?.quantity || 1);
    const updatedTotal = Math.max(
      0,
      target.totalAmount - (info.compensationType === 'refund' || info.compensationType === 'none' ? struckPrice : 0)
    );

    onAdvanceOrderStatus(target.orderNo || target.id, target.status, {
      items: updatedItems,
      totalAmount: updatedTotal,
      remark: target.remark
        ? `${target.remark} | [划菜: ${target.items[itemIndex]?.name} - ${info.reason}]`
        : `[划菜: ${target.items[itemIndex]?.name} - ${info.reason}]`
    });
  };

  // 撤销划菜回滚恢复处理函数
  const handleRollbackStrikeOff = (orderId: string, itemIndex: number) => {
    const target = orders.find((o) => o.orderNo === orderId || o.id === orderId);
    if (!target) return;

    // 记录撤销快照
    merchantBackupEngine.createSnapshot(
      `撤销划菜恢复原单: #${(target.orderNo || '').replace(/^#/, '')}`,
      `撤销划菜并恢复菜品: ${target.items[itemIndex]?.name}`,
      [target]
    );

    const targetItem = target.items[itemIndex];
    const restoredPrice = (targetItem?.price || 0) * (targetItem?.quantity || 1);
    const updatedItems = target.items
      .map((it, idx) => {
        if (idx !== itemIndex) return it;
        const copy = { ...it };
        delete copy.isStruckOff;
        delete copy.struckOffReason;
        delete copy.struckOffAt;
        delete copy.compensationType;
        delete copy.compensationDetail;
        delete copy.compensationAmount;
        return copy;
      })
      .filter((it) => !it.isCompensatoryGift);

    const updatedTotal = target.totalAmount + restoredPrice;

    onAdvanceOrderStatus(target.orderNo || target.id, target.status, {
      items: updatedItems,
      totalAmount: updatedTotal
    });
  };

  // 保存订单修改
  const handleSaveOrderEdit = (updatedOrder: Order, reason: string) => {
    onAdvanceOrderStatus(updatedOrder.orderNo || updatedOrder.id, updatedOrder.status, {
      items: updatedOrder.items,
      totalAmount: updatedOrder.totalAmount,
      remark: updatedOrder.remark
    });
  };
  const [rejectReason, setRejectReason] = useState('食材售罄，无法现制');

  // 扫码枪与极速核销面板状态
  const [isScannerBarOpen, setIsScannerBarOpen] = useState(false);
  const [quickScanInput, setQuickScanInput] = useState('');

  // FIX(审计P1): "刷新同步"真实化——从本地权威键重读订单，若有变化派发事件让全端刷新（取代"仅提示已同步"假实现）
  const handleRefreshSync = () => {
    try {
      const fresh = safeGetStorage<Order[]>('obsidian_truck_orders', orders);
      const deduped = Array.from(new Map((fresh.length ? fresh : orders).map((o) => [o.orderNo || o.id, o])).values());
      const hasChanges =
        deduped.length !== orders.length ||
        deduped.some((o, i) => {
          const cur = orders[i];
          return !cur || cur.status !== o.status || cur.progressPercent !== o.progressPercent;
        });
      if (hasChanges && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('obsidian_orders_updated', { detail: deduped }));
      }
      showToast(hasChanges ? '已从本地权威存储刷新订单队列，发现并同步最新状态' : '订单队列已是最新，与云端无差异');
    } catch (e) {
      console.error('刷新订单队列失败:', e);
      showToast('刷新失败，请稍后重试');
    }
  };

  // 挂载全局硬件扫码枪 / 软扫码引擎
  useEffect(() => {
    const handleScanResult = (res: { code: string }) => {
      const clean = (res?.code || '').trim();
      if (!clean) return;

      // 智能匹配订单：比对订单号、取件码、或系统ID
      const cleanUpper = clean.toUpperCase().replace(/^#/, '');
      const matched = orders.find((o) => {
        const oNo = (o.orderNo || '').toUpperCase().replace(/^#/, '');
        const pCode = (o.pickupCode || getOrGeneratePickupCode(o.orderNo)).toUpperCase().replace(/^PK-/, '');
        const inputCode = cleanUpper.replace(/^PK-/, '');
        return oNo === cleanUpper || oNo.endsWith(cleanUpper) || pCode === inputCode || o.id === clean;
      });

      if (matched) {
        playScannerBeep('beep_success');
        setVerifyTargetOrder(matched);
        setSearchQuery(matched.orderNo.replace(/^#/, ''));
        showToast(`⚡ 扫码成功：已自动定位订单 #${matched.orderNo.replace(/^#/, '')}，打开核销确认！`);
      } else {
        playScannerBeep('beep_error');
        showToast(`⚠️ 扫码提示：未匹配到条码 [${clean}] 对应的有效自提/专送订单`);
      }
    };

    const unsubscribe = globalScannerEngine.subscribe(handleScanResult);
    return () => unsubscribe();
  }, [orders, showToast]);

  // 手工回车快速核销提交
  const handleQuickManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickScanInput.trim();
    if (!clean) return;

    const cleanUpper = clean.toUpperCase().replace(/^#/, '');
    const matched = orders.find((o) => {
      const oNo = (o.orderNo || '').toUpperCase().replace(/^#/, '');
      const pCode = (o.pickupCode || getOrGeneratePickupCode(o.orderNo)).toUpperCase().replace(/^PK-/, '');
      const inputCode = cleanUpper.replace(/^PK-/, '');
      return oNo === cleanUpper || oNo.endsWith(cleanUpper) || pCode === inputCode || o.id === clean;
    });

    if (matched) {
      playScannerBeep('beep_success');
      setVerifyTargetOrder(matched);
      setSearchQuery(matched.orderNo.replace(/^#/, ''));
      setQuickScanInput('');
    } else {
      playScannerBeep('beep_error');
      showToast(`未找到单号或提餐码为 [${clean}] 的有效订单`);
    }
  };

  // Refund reject modal
  const [refundRejectTarget, setRefundRejectTarget] = useState<Order | null>(null);
  const [refundRejectReason, setRefundRejectReason] = useState('餐品已下锅高温炙烤，无法中途取消');

  // Delete / Discard order modal
  const [deleteTargetOrder, setDeleteTargetOrder] = useState<Order | null>(null);
  const [deleteReason, setDeleteReason] = useState('顾客误触/重复下单作废');
  const [customDeleteReason, setCustomDeleteReason] = useState('');
  const [createSafetySnapshot, setCreateSafetySnapshot] = useState(true);

  const handleConfirmDeleteOrder = () => {
    if (!deleteTargetOrder) return;
    const finalReason = deleteReason === 'other' ? (customDeleteReason.trim() || '其他原因作废') : deleteReason;
    
    if (createSafetySnapshot) {
      merchantBackupEngine.createSnapshot(
        `作废删除订单安全备份: #${(deleteTargetOrder.orderNo || '').replace(/^#/, '')}`,
        `商家强制作废整单，原因: ${finalReason}`,
        [deleteTargetOrder]
      );
      merchantBackupEngine.logAction(
        '全渠道订单',
        'delete',
        `强制作废删除订单 #${deleteTargetOrder.orderNo}`,
        `原因: ${finalReason}, 金额: ¥${deleteTargetOrder.totalAmount}`
      );
    }

    if (onDeleteOrder) {
      onDeleteOrder(deleteTargetOrder.orderNo || deleteTargetOrder.id, finalReason);
    }
    showToast(`订单 #${deleteTargetOrder.orderNo.replace(/^#/, '')} 已从全渠道订单中心作废删除（已保存安全快照）！`);
    setDeleteTargetOrder(null);
    setCustomDeleteReason('');
  };

  // 方案 B：订单看板自提催取/呼叫骑手 叫号频次状态管理
  const [orderCallCounts, setOrderCallCounts] = useState<Record<string, number>>({});

  const handleQuickBroadcastCall = async (order: Order) => {
    const oChannel = resolveOrderChannelType(order);
    const cleanNo = (order.orderNo || '').replace(/^#/, '');
    const pCode = getOrGeneratePickupCode(order.orderNo, order.pickupCode);

    setOrderCallCounts((prev) => ({
      ...prev,
      [order.orderNo]: (prev[order.orderNo] || 0) + 1
    }));

    await unlockAudioContext();

    if (oChannel === 'pickup') {
      voiceAlerts.callingGuest(pCode || cleanNo, '餐车前台自提处');
      showToast(`已向外放广播呼叫: 请自提顾客 #${pCode || cleanNo} 到餐车取餐！`);
    } else if (oChannel === 'delivery') {
      voiceAlerts.callRiderForOrder(order.orderNo, order.courierName || '专线/美团骑手');
      showToast(`已外放呼叫骑手: 外卖订单 #${cleanNo} 已备齐，请尽快到流动车站台取餐！`);
    } else {
      voiceAlerts.kdsReadyAndCall(order.orderNo, 'dine_in', order.tableCode ? `${order.tableCode} 号桌` : '外摆区');
      showToast(`已广播通知传菜: 桌台 ${order.tableCode || 'A1'} 菜品出餐！`);
    }
  };

  // Handle manual audit to convert dine-in order to rider delivery
  const handleConfirmConvertToDelivery = (
    order: Order,
    deliveryAddress: string,
    customerPhone: string,
    auditReason: string,
    extraDeliveryFee: number
  ) => {
    const updatedTotal = order.totalAmount + extraDeliveryFee;
    onAdvanceOrderStatus(order.orderNo || order.id, 'cooking', {
      channelType: 'delivery',
      channel: 'delivery',
      deliveryAddress,
      userPhone: customerPhone,
      totalAmount: updatedTotal,
      isConvertedFromDineIn: true,
      convertAuditReason: auditReason,
      statusText: '堂食已转外卖专送 · 待呼叫骑手',
      auditLogs: [
        ...(order.auditLogs || []),
        {
          time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          operator: '主理人阿豪',
          role: 'merchant',
          action: '堂食转外卖专送审核通过',
          note: `转送地址: ${deliveryAddress} | 审核原因: ${auditReason} | 运费加收: ¥${extraDeliveryFee}`
        }
      ]
    });
    showToast(`订单 #${order.orderNo.replace(/^#/, '')} 审核通过！已由堂食成功转为外卖专送，已同步至骑手端抢单池！`);
  };

  // Listen to pickup verification events from scanner or rider
  useEffect(() => {
    const unsubscribe = subscribePickupVerifiedEvent((record) => {
      const target = orders.find((o) => o.id === record.orderId || o.orderNo === record.orderNo);
      if (target && target.status !== 'delivering' && target.status !== 'completed') {
        onAdvanceOrderStatus(target.orderNo || target.id, 'delivering', {
          status: 'delivering',
          stepIndex: 3,
          statusText: '专线骑手配送中',
          pickupVerifiedAt: record.verifiedAt,
          pickupVerifiedBy: record.verifiedBy
        });
      }
    });
    return () => unsubscribe();
  }, [orders, onAdvanceOrderStatus]);

  // Status-based counts
  const pendingOrders = orders.filter((o) => o.status === 'pending' || (o.stepIndex === 0 && !o.merchantAccepted));
  const cookingOrders = orders.filter((o) => o.status === 'cooking' || (o.stepIndex === 1 && o.status !== 'refund_pending'));
  const deliveringOrders = orders.filter((o) => o.status === 'delivering' || o.status === 'ready' || o.stepIndex === 2 || o.stepIndex === 3);
  const completedOrders = orders.filter((o) => o.status === 'completed' || o.status === 'refunded' || o.status === 'cancelled');
  const refundApplicationOrders = orders.filter((o) => o.refundStatus === 'pending' || o.status === 'refund_pending');

  // Channel-based counts
  const dineInCount = orders.filter((o) => resolveOrderChannelType(o) === 'dine_in').length;
  const deliveryCount = orders.filter((o) => resolveOrderChannelType(o) === 'delivery').length;
  const pickupCount = orders.filter((o) => resolveOrderChannelType(o) === 'pickup').length;

  // Filtered orders list
    // 方向: 订单网格列数来自工作台显示偏好（本地+云端同步，变更即热更新）
  const [ordersCols, setOrdersCols] = useState<OrdersColumnsPref>(
    () => loadLocalPrefs()?.ordersColumns ?? 'auto'
  );
  useEffect(() => {
    const handler = () => setOrdersCols(loadLocalPrefs()?.ordersColumns ?? 'auto');
    window.addEventListener('obsidian_workspace_prefs_changed', handler);
    return () => window.removeEventListener('obsidian_workspace_prefs_changed', handler);
  }, []);
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (activeStatusTab === 'pending' && !(o.status === 'pending' || (o.stepIndex === 0 && !o.merchantAccepted))) return false;
      if (activeStatusTab === 'cooking' && !(o.status === 'cooking' || (o.stepIndex === 1 && o.status !== 'refund_pending'))) return false;
      if (activeStatusTab === 'delivering' && !(o.status === 'delivering' || o.status === 'ready' || o.stepIndex === 2 || o.stepIndex === 3)) return false;
      if (activeStatusTab === 'completed' && !(o.status === 'completed' || o.status === 'refunded' || o.status === 'cancelled')) return false;
      if (activeStatusTab === 'refund' && !(o.refundStatus === 'pending' || o.status === 'refund_pending')) return false;

      // Channel Filtering
      const oChannel = resolveOrderChannelType(o);
      if (channelFilter === 'dine_in' && oChannel !== 'dine_in') return false;
      if (channelFilter === 'delivery' && oChannel !== 'delivery') return false;
      if (channelFilter === 'pickup' && oChannel !== 'pickup') return false;

      // Date Filtering (批次4：共享 dateFilter 区间推导；resolveOrderDay 归日粒度与旧实现等价)
      if (!isDayStringWithinRange(resolveOrderDay(o), dateRange)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          o.orderNo.toLowerCase().includes(q) ||
          (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(q)) ||
          (o.userId && o.userId.toLowerCase().includes(q)) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.tableCode && o.tableCode.toLowerCase().includes(q)) ||
          (o.pickupCode && o.pickupCode.toLowerCase().includes(q)) ||
          (o.userPhone && o.userPhone.includes(q)) ||
          (o.courierName && o.courierName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [orders, activeStatusTab, channelFilter, searchQuery, dateRange]);

  // Statistics for currently filtered view
  const filteredTotalAmount = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [filteredOrders]);

  const handleToggleLock = (order: Order) => {
    const nextState = !order.nonRefundable;
    if (onToggleNonRefundable) {
      onToggleNonRefundable(order.id, nextState);
    } else {
      onAdvanceOrderStatus(order.orderNo || order.id, order.status, { nonRefundable: nextState });
    }
    showToast(nextState ? `订单 #${order.orderNo} 已锁定为【不可退单】` : `订单 #${order.orderNo} 已恢复【允许申请退单】`);
  };

  const handleAcceptSingleOrder = (order: Order) => {
    onAdvanceOrderStatus(order.orderNo || order.id, 'cooking', {
      merchantAccepted: true,
      stepIndex: 1,
      status: 'cooking',
      statusText: '餐车后厨备餐现制中',
      progressPercent: 35
    });
    if (onAcceptOrder) onAcceptOrder(order.id);
    showToast(`已接单 #${order.orderNo}，工单已下发至 KDS 后厨现制！`);
  };

  const handleApproveRefund = (order: Order) => {
    if (onAuditRefund) {
      onAuditRefund(order.id, true);
    } else {
      onAdvanceOrderStatus(order.orderNo || order.id, 'refunded', {
        status: 'refunded',
        refundStatus: 'approved',
        statusText: '已退款',
        progressPercent: -1
      });
    }
    showToast(`已同意订单 #${order.orderNo} 退单申请，款项已原路退回顾客账户！`);
  };

  const handleRejectRefundSubmit = () => {
    if (!refundRejectTarget) return;
    if (onAuditRefund) {
      onAuditRefund(refundRejectTarget.id, false, refundRejectReason);
    } else {
      const prevStep = refundRejectTarget.refundPassedStep ?? 1;
      const restoredStatus = prevStep >= 3 ? 'delivering' : prevStep >= 1 ? 'cooking' : 'pending';
      onAdvanceOrderStatus(refundRejectTarget.orderNo || refundRejectTarget.id, restoredStatus, {
        status: restoredStatus,
        refundStatus: 'rejected',
        refundRejectReason: refundRejectReason,
        statusText: restoredStatus === 'delivering' ? '专线配送中' : restoredStatus === 'cooking' ? '后厨现制中' : '待商家接单'
      });
    }
    showToast(`已驳回订单 #${refundRejectTarget.orderNo} 退款申请并恢复订单流程`);
    setRefundRejectTarget(null);
  };

  const handleBatchPrint = () => {
    showToast(`正在批量向热敏打印机发送 ${filteredOrders.length} 张备餐小票...`);
  };

  // Calculate daily turnover total
  const todayRevenue = orders
    .filter(o => o.status !== 'refunded' && o.status !== 'cancelled')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const statusOptions = useMemo(() => [
    { key: 'all' as const, label: '全部订单', count: orders.length, dotColor: 'bg-neutral-900' },
    { key: 'pending' as const, label: '待接单确认', count: pendingOrders.length, dotColor: 'bg-amber-500' },
    { key: 'cooking' as const, label: '制作中 (KDS)', count: cookingOrders.length, dotColor: 'bg-orange-500' },
    { key: 'delivering' as const, label: '待取/专送中', count: deliveringOrders.length, dotColor: 'bg-sky-500' },
    { key: 'refund' as const, label: '退单申请审核', count: refundApplicationOrders.length, dotColor: 'bg-rose-500' },
    { key: 'completed' as const, label: '已完成/已退款', count: completedOrders.length, dotColor: 'bg-emerald-500' },
  ], [orders.length, pendingOrders.length, cookingOrders.length, deliveringOrders.length, refundApplicationOrders.length, completedOrders.length]);

  const channelOptions = useMemo(() => [
    { key: 'all' as const, label: '全渠道总控', count: orders.length },
    { key: 'dine_in' as const, label: '堂食外摆', count: dineInCount },
    { key: 'delivery' as const, label: '外卖专送', count: deliveryCount },
    { key: 'pickup' as const, label: '到车自提', count: pickupCount },
  ], [orders.length, dineInCount, deliveryCount, pickupCount]);

  const currentStatusOpt = statusOptions.find(o => o.key === activeStatusTab) || statusOptions[0];
  const currentChannelOpt = channelOptions.find(o => o.key === channelFilter) || channelOptions[0];

  return (
    <div className="w-full flex flex-col font-sans selection:bg-emerald-800 selection:text-white pb-6 rounded-none">
      {/* 嵌入纯直角脉冲动画样式 */}
      <style>{`
        .led-pulse {
          animation: kdsPulseGreen 1.8s infinite ease-in-out;
        }
        @keyframes kdsPulseGreen {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.92); }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* BEGIN: ControlAndFilterBar (纯直角硬朗工业控制栏)                           */}
      {/* ========================================================================= */}
      <section className="bg-white border-b border-[#e6e6e4] px-3 sm:px-4 shrink-0 py-2.5 rounded-none shadow-2xs" data-purpose="order-filter-panel">
        {/* ========================================================================= */}
        {/* 手机端单排极简控制中枢 (Mobile Unified Single-Row Bar: Strictly Single Row, No Wrap) */}
        {/* ========================================================================= */}
        <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap shrink-0 py-1 w-full border-b border-neutral-100 pb-2 mb-1">
          {/* 1. 美化订单状态下拉菜单 (Custom Beautiful Status Popover) */}
          <div className="shrink-0">
            <button
              type="button"
              id="mobile-status-dropdown-trigger"
              onClick={(e) => {
                if (activeMobileDropdown === 'status') {
                  setActiveMobileDropdown(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDropdownCoords({
                    top: rect.bottom + 6,
                    left: Math.max(8, Math.min(rect.left, window.innerWidth - 240)),
                  });
                  setActiveMobileDropdown('status');
                }
              }}
              className="h-8 px-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <span>{currentStatusOpt.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-medium">
                {currentStatusOpt.count}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-white/70 transition-transform ${activeMobileDropdown === 'status' ? 'rotate-180 text-white' : ''}`} />
            </button>
          </div>

          {/* 2. 美化分流渠道下拉菜单 (Custom Beautiful Channel Popover) */}
          <div className="shrink-0">
            <button
              type="button"
              id="mobile-channel-dropdown-trigger"
              onClick={(e) => {
                if (activeMobileDropdown === 'channel') {
                  setActiveMobileDropdown(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDropdownCoords({
                    top: rect.bottom + 6,
                    left: Math.max(8, Math.min(rect.left, window.innerWidth - 210)),
                  });
                  setActiveMobileDropdown('channel');
                }
              }}
              className="h-8 px-2.5 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200 hover:border-neutral-900 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-neutral-500 font-normal">渠道:</span>
              <span>{currentChannelOpt.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-100 text-neutral-700 font-medium">
                {currentChannelOpt.count}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${activeMobileDropdown === 'channel' ? 'rotate-180 text-neutral-900' : ''}`} />
            </button>
          </div>

          {/* 3. 搜索展开胶囊 (Search Pill) */}
          <div className="shrink-0">
            {isMobileSearchActive || searchQuery ? (
              <div className="flex items-center h-8 bg-white border border-neutral-900 rounded-full px-2.5 shrink-0 shadow-xs">
                <Search className="w-3.5 h-3.5 text-neutral-400 mr-1.5 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索单号/手机..."
                  className="w-24 text-xs outline-none bg-transparent font-normal text-neutral-900 placeholder:text-neutral-400"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-neutral-400 hover:text-neutral-900 ml-1 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsMobileSearchActive(false)}
                    className="text-neutral-400 hover:text-neutral-900 ml-1 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsMobileSearchActive(true)}
                className="h-8 px-2.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-full text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap shadow-2xs cursor-pointer"
                title="搜索订单"
              >
                <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span className="whitespace-nowrap">搜索</span>
              </button>
            )}
          </div>

          {/* 4. 接单开关胶囊 */}
          <button
            type="button"
            onClick={() => {
              const next = !isAutoAccept;
              setIsAutoAccept(next);
              showToast(next ? '已开启极速自动接单（新单自动流入后厨制作）' : '已关闭自动接单（新订单将进入待接单列表）');
            }}
            className={`h-8 px-2.5 text-xs font-bold flex items-center gap-1 transition-colors border rounded-full cursor-pointer whitespace-nowrap shrink-0 shadow-2xs ${
              isAutoAccept
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
            }`}
            title={isAutoAccept ? '自动接单运行中，点击关闭' : '自动接单已关闭，点击开启'}
          >
            <Power className={`w-3.5 h-3.5 ${isAutoAccept ? 'text-emerald-600' : 'text-rose-600'} shrink-0`} />
            <span className="whitespace-nowrap">接单: {isAutoAccept ? '开' : '关'}</span>
          </button>

          {/* 5. 更多操作下拉菜单 (Mobile Actions Popover) */}
          <div className="shrink-0">
            <button
              type="button"
              id="mobile-order-actions-trigger"
              onClick={(e) => {
                if (activeMobileDropdown === 'actions') {
                  setActiveMobileDropdown(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDropdownCoords({
                    top: rect.bottom + 6,
                    right: Math.max(8, window.innerWidth - rect.right),
                  });
                  setActiveMobileDropdown('actions');
                }
              }}
              className="h-8 px-2.5 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200 text-xs font-bold rounded-full flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs active:scale-95 transition-all"
              aria-label="订单更多操作菜单"
              aria-expanded={activeMobileDropdown === 'actions'}
            >
              <span className="whitespace-nowrap">操作</span>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${activeMobileDropdown === 'actions' ? 'rotate-180 text-neutral-900' : ''}`} />
            </button>
          </div>

          {/* 6. 视图切换 */}
          <button
            type="button"
            onClick={() => setViewMode((v) => (v === 'card' ? 'list' : 'card'))}
            className="h-8 px-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-full flex items-center justify-center shrink-0 shadow-2xs cursor-pointer"
            title="切换卡片/列表"
          >
            {viewMode === 'card' ? <List className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 手机端全局悬浮菜单 (使用 Portal 挂载到 body，彻底规避 overflow-x-auto 剪裁遮挡) */}
        {typeof document !== 'undefined' && activeMobileDropdown && createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-black/25 backdrop-blur-[0.5px]"
              onClick={() => setActiveMobileDropdown(null)}
            />

            {activeMobileDropdown === 'status' && (
              <div
                className="fixed z-[9999] w-56 bg-white border border-neutral-200 rounded-xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150 space-y-0.5 max-h-[80vh] overflow-y-auto"
                style={{
                  top: `${dropdownCoords.top}px`,
                  left: `${dropdownCoords.left}px`,
                }}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 mb-1">
                  筛选订单状态
                </div>
                {statusOptions.map((opt) => {
                  const isSelected = activeStatusTab === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setActiveStatusTab(opt.key);
                        setActiveMobileDropdown(null);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between transition-colors cursor-pointer text-left ${
                        isSelected ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                        <span className="whitespace-nowrap">{opt.label}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                          {opt.count}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {activeMobileDropdown === 'channel' && (
              <div
                className="fixed z-[9999] w-48 bg-white border border-neutral-200 rounded-xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150 space-y-0.5 max-h-[80vh] overflow-y-auto"
                style={{
                  top: `${dropdownCoords.top}px`,
                  left: `${dropdownCoords.left}px`,
                }}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 mb-1">
                  选择分流渠道
                </div>
                {channelOptions.map((opt) => {
                  const isSelected = channelFilter === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setChannelFilter(opt.key);
                        setActiveMobileDropdown(null);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between transition-colors cursor-pointer text-left ${
                        isSelected ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <span className="whitespace-nowrap">{opt.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                          {opt.count}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {activeMobileDropdown === 'actions' && (
              <div
                className="fixed z-[9999] w-52 bg-white border border-neutral-200 rounded-xl shadow-2xl p-1.5 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150 max-h-[80vh] overflow-y-auto"
                style={{
                  top: `${dropdownCoords.top}px`,
                  right: `${dropdownCoords.right}px`,
                }}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 mb-0.5">
                  快捷操作工具
                </div>
                {/* 语音播报开关 */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMobileDropdown(null);
                    setIsVoiceBroadcast((v) => !v);
                    showToast(isVoiceBroadcast ? '已关闭语音播报' : '已开启新订单语音播报');
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-left hover:bg-neutral-100 text-neutral-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {isVoiceBroadcast ? <Volume2 className="w-3.5 h-3.5 text-amber-600 shrink-0" /> : <VolumeX className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                    <span className="font-bold">语音播报</span>
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${isVoiceBroadcast ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'}`}>
                    {isVoiceBroadcast ? '开启' : '静音'}
                  </span>
                </button>

                {/* 扫码核销中枢 */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMobileDropdown(null);
                    setIsScannerBarOpen((v) => !v);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-left hover:bg-neutral-100 text-neutral-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Scan className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="font-bold">扫码核销快捷条</span>
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${isScannerBarOpen ? 'bg-indigo-100 text-indigo-800' : 'bg-neutral-100 text-neutral-600'}`}>
                    {isScannerBarOpen ? '开' : '关'}
                  </span>
                </button>

                {/* 批量打印 */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMobileDropdown(null);
                    handleBatchPrint();
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-left hover:bg-neutral-100 text-neutral-800 flex items-center gap-2 cursor-pointer font-bold"
                >
                  <Printer className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                  <span>批量打印小票</span>
                </button>
              </div>
            )}
          </>,
          document.body
        )}

        {/* Row 1: Status Badges & Search & Automation Switches (Desktop) */}
        <div className="hidden sm:flex flex-wrap items-center justify-between gap-2.5 mb-2">
          {/* 桌面端/平板端状态标签组 (Desktop Status Buttons) */}
          <div className="flex items-center gap-1.5 overflow-x-auto select-none pb-1 sm:pb-0 scrollbar-none">
            {/* 全部订单 */}
            <button
              type="button"
              onClick={() => setActiveStatusTab('all')}
              className={`px-2.5 py-1 text-xs border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer rounded-full bg-white ${
                activeStatusTab === 'all'
                  ? 'text-zinc-900 border-zinc-900 font-medium shadow-2xs'
                  : 'hover:bg-slate-50 text-[#787774] border-[#e6e6e4] font-normal'
              }`}
            >
              <span className="whitespace-nowrap">全部订单</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full shrink-0 font-medium ${
                activeStatusTab === 'all' ? 'bg-zinc-900 text-white' : 'bg-[#f7f7f5] text-[#787774] border border-[#e6e6e4]'
              }`}>
                {orders.length}
              </span>
            </button>

            {/* 待接单确认 */}
            <button
              type="button"
              onClick={() => setActiveStatusTab('pending')}
              className={`px-2.5 py-1 text-xs border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer rounded-full bg-white ${
                activeStatusTab === 'pending'
                  ? 'text-[#b45309] border-[#f59e0b] font-medium shadow-2xs'
                  : 'hover:bg-slate-50 text-[#787774] border-[#e6e6e4] font-normal'
              }`}
            >
              <span className="w-1.5 h-1.5 bg-amber-500 inline-block rounded-full shrink-0"></span>
              <span className="whitespace-nowrap">待接单确认</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full shrink-0 font-medium ${
                activeStatusTab === 'pending' ? 'bg-amber-100 text-[#b45309] border border-amber-200' : 'bg-[#f7f7f5] text-[#787774] border border-[#e6e6e4]'
              }`}>
                {pendingOrders.length}
              </span>
            </button>

            {/* 制作中 (KDS) */}
            <button
              type="button"
              onClick={() => setActiveStatusTab('cooking')}
              className={`px-2.5 py-1 text-xs border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer rounded-full bg-white ${
                activeStatusTab === 'cooking'
                  ? 'text-[#c2410c] border-[#ea580c] font-medium shadow-2xs'
                  : 'hover:bg-slate-50 text-[#787774] border-[#e6e6e4] font-normal'
              }`}
            >
              <span className="w-1.5 h-1.5 bg-amber-600 inline-block rounded-full shrink-0"></span>
              <span className="whitespace-nowrap">制作中 (KDS)</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full shrink-0 font-medium ${
                activeStatusTab === 'cooking' ? 'bg-orange-100 text-[#c2410c] border border-orange-200' : 'bg-[#f7f7f5] text-[#787774] border border-[#e6e6e4]'
              }`}>
                {cookingOrders.length}
              </span>
            </button>

            {/* 待取/专送中 */}
            <button
              type="button"
              onClick={() => setActiveStatusTab('delivering')}
              className={`px-2.5 py-1 text-xs border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer rounded-full bg-white ${
                activeStatusTab === 'delivering'
                  ? 'text-[#0369a1] border-[#0284c7] font-medium shadow-2xs'
                  : 'hover:bg-slate-50 text-[#787774] border-[#e6e6e4] font-normal'
              }`}
            >
              <span className="w-1.5 h-1.5 bg-sky-600 inline-block rounded-full shrink-0"></span>
              <span className="whitespace-nowrap">待取/专送中</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full shrink-0 font-medium ${
                activeStatusTab === 'delivering' ? 'bg-sky-100 text-[#0369a1] border border-sky-200' : 'bg-[#f7f7f5] text-[#787774] border border-[#e6e6e4]'
              }`}>
                {deliveringOrders.length}
              </span>
            </button>

            {/* 退单申请审核 */}
            <button
              type="button"
              onClick={() => setActiveStatusTab('refund')}
              className={`px-2.5 py-1 text-xs border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer rounded-full bg-white ${
                activeStatusTab === 'refund'
                  ? 'text-rose-700 border-rose-400 font-medium shadow-2xs'
                  : 'hover:bg-rose-50/50 text-[#787774] border-[#e6e6e4] font-normal'
              }`}
            >
              <span className="w-1.5 h-1.5 bg-rose-500 inline-block rounded-full shrink-0"></span>
              <span className="whitespace-nowrap">退单申请审核</span>
              <span className={`px-1.5 py-0.2 text-[10px] border rounded-full shrink-0 font-medium ${
                activeStatusTab === 'refund' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
                {refundApplicationOrders.length}
              </span>
            </button>

            {/* 已完成/已退款 */}
            <button
              type="button"
              onClick={() => setActiveStatusTab('completed')}
              className={`px-2.5 py-1 text-xs border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer rounded-full bg-white ${
                activeStatusTab === 'completed'
                  ? 'text-[#047857] border-[#059669] font-medium shadow-2xs'
                  : 'hover:bg-slate-50 text-[#787774] border-[#e6e6e4] font-normal'
              }`}
            >
              <span className="w-1.5 h-1.5 bg-emerald-600 inline-block rounded-full shrink-0"></span>
              <span className="whitespace-nowrap">已完成/已退款</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full shrink-0 font-medium ${
                activeStatusTab === 'completed' ? 'bg-emerald-100 text-[#047857] border border-emerald-200' : 'bg-[#f7f7f5] text-[#787774] border border-[#e6e6e4]'
              }`}>
                {completedOrders.length}
              </span>
            </button>
          </div>

          {/* Search and Action Group (Desktop) */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-1 justify-end">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="w-3.5 h-3.5 text-[#9b9a97]" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索单号 / 手机尾号 / 提餐码..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-[#fbfbfa] border border-[#e6e6e4] text-[#0f172a] placeholder:text-[#9b9a97] focus:bg-white focus:border-[#37352f] transition-colors rounded-[3px] outline-none font-normal"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 桌面端平铺操作工具栏 */}
            <div className="flex items-center space-x-1 shrink-0">
              {/* 自动接单开关 */}
              <button
                type="button"
                onClick={() => {
                  const next = !isAutoAccept;
                  setIsAutoAccept(next);
                  showToast(next ? '已开启极速自动接单（新单自动流入后厨制作）' : '已关闭自动接单（新订单将进入待接单列表）');
                }}
                className={`px-2 py-1 text-xs font-normal flex items-center gap-1 transition-colors border rounded-[3px] cursor-pointer whitespace-nowrap ${
                  isAutoAccept
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                }`}
                title={isAutoAccept ? '自动接单运行中，点击关闭' : '自动接单已关闭，点击开启'}
              >
                <Power className={`w-3 h-3 ${isAutoAccept ? 'text-emerald-600' : 'text-rose-600'} shrink-0`} />
                <span className="whitespace-nowrap">接单: {isAutoAccept ? '开' : '关'}</span>
              </button>

              {/* 语音播报开关 */}
              <button
                type="button"
                onClick={() => {
                  setIsVoiceBroadcast((v) => !v);
                  showToast(isVoiceBroadcast ? '已关闭语音播报' : '已开启新订单语音播报');
                }}
                className={`px-2 py-1 text-xs font-normal flex items-center gap-1 transition-colors border rounded-[3px] cursor-pointer whitespace-nowrap ${
                  isVoiceBroadcast
                    ? 'bg-[#fffbeb] hover:bg-amber-100 text-amber-800 border-[#fde68a]'
                    : 'bg-white hover:bg-slate-50 text-[#787774] border-[#e6e6e4]'
                }`}
                title={isVoiceBroadcast ? '语音播报已开启' : '语音播报已静音'}
              >
                {isVoiceBroadcast ? <Volume2 className="w-3 h-3 text-amber-600 shrink-0" /> : <VolumeX className="w-3 h-3 text-slate-400 shrink-0" />}
                <span className="hidden sm:inline whitespace-nowrap">语音</span>
              </button>

              {/* 扫码核销中枢 */}
              <button
                type="button"
                onClick={() => setIsScannerBarOpen((v) => !v)}
                className={`px-2 py-1 text-xs font-normal flex items-center gap-1 transition-colors border rounded-[3px] cursor-pointer whitespace-nowrap ${
                  isScannerBarOpen
                    ? 'bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]'
                    : 'bg-white hover:bg-slate-50 text-[#787774] border-[#e6e6e4]'
                }`}
                title="开启/关闭扫码核销快捷条（已实时接入条码扫码枪）"
              >
                <Scan className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="whitespace-nowrap">扫码核销</span>
              </button>

              {/* 批量打印 */}
              <button
                type="button"
                onClick={handleBatchPrint}
                className="bg-white hover:bg-slate-50 text-[#787774] border border-[#e6e6e4] px-2 py-1 text-xs font-normal flex items-center gap-1 transition-colors rounded-[3px] cursor-pointer whitespace-nowrap"
                title="批量打印当前筛选列表的制作小票"
              >
                <Printer className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="whitespace-nowrap">批量打印</span>
              </button>
            </div>
          </div>
        </div>

        {/* Embedded Scanner Active Strip */}
        {isScannerBarOpen && (
          <div className="bg-[#fbfbfa] text-[#0f172a] p-2.5 rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-3 flex-wrap animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-900 bg-indigo-50 px-2 py-0.5 border border-indigo-200 rounded-[2px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>扫码枪硬/软中枢就绪</span>
              </span>
              <span className="text-[11px] text-[#787774] font-normal">
                支持条码扫码枪即扫即核，或在右侧输入单号/自提码（如 PK-7078）后按回车：
              </span>
            </div>

            <form onSubmit={handleQuickManualVerify} className="flex items-center gap-2">
              <input
                type="text"
                value={quickScanInput}
                onChange={(e) => setQuickScanInput(e.target.value)}
                placeholder="输入自提码/订单号并回车..."
                className="px-2.5 py-1 text-xs bg-white border border-[#d3d1cb] text-[#0f172a] placeholder:text-[#9b9a97] focus:outline-none focus:border-[#37352f] w-52 rounded-[3px]"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1 bg-slate-900 hover:bg-black text-white font-medium text-xs rounded-[3px] cursor-pointer transition-colors"
              >
                立即核销
              </button>
            </form>
          </div>
        )}

        {/* Row 2: Channel Segmentation & View Toggle (Desktop) */}
        <div className="hidden sm:flex flex-wrap items-center justify-between text-xs pt-2 border-t border-neutral-200 gap-2">
          {/* 桌面端分流渠道平铺标签 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-neutral-500 text-xs font-medium mr-0.5 whitespace-nowrap shrink-0">分流渠道:</span>
            
            <div className="inline-flex p-1 bg-neutral-100 rounded-lg border border-neutral-200 gap-1 shrink-0">
              {/* All Channels */}
              <button
                type="button"
                onClick={() => setChannelFilter('all')}
                className={`px-3 py-1.5 text-xs transition-all rounded-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  channelFilter === 'all'
                    ? 'bg-white text-neutral-900 font-bold shadow-xs border border-neutral-200/80'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium border border-transparent'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <span className="whitespace-nowrap">全渠道总控</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                  channelFilter === 'all' ? 'bg-neutral-900 text-white' : 'bg-neutral-200/70 text-neutral-600'
                }`}>
                  {orders.length}
                </span>
              </button>

              {/* Dine-In */}
              <button
                type="button"
                onClick={() => setChannelFilter('dine_in')}
                className={`px-3 py-1.5 text-xs transition-all rounded-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  channelFilter === 'dine_in'
                    ? 'bg-white text-neutral-900 font-bold shadow-xs border border-neutral-200/80'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium border border-transparent'
                }`}
              >
                <Utensils className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <span className="whitespace-nowrap">堂食外摆</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                  channelFilter === 'dine_in' ? 'bg-neutral-900 text-white' : 'bg-neutral-200/70 text-neutral-600'
                }`}>
                  {dineInCount}
                </span>
              </button>

              {/* Delivery */}
              <button
                type="button"
                onClick={() => setChannelFilter('delivery')}
                className={`px-3 py-1.5 text-xs transition-all rounded-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  channelFilter === 'delivery'
                    ? 'bg-white text-neutral-900 font-bold shadow-xs border border-neutral-200/80'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium border border-transparent'
                }`}
              >
                <Bike className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <span className="whitespace-nowrap">外卖专送</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                  channelFilter === 'delivery' ? 'bg-neutral-900 text-white' : 'bg-neutral-200/70 text-neutral-600'
                }`}>
                  {deliveryCount}
                </span>
              </button>

              {/* Pickup */}
              <button
                type="button"
                onClick={() => setChannelFilter('pickup')}
                className={`px-3 py-1.5 text-xs transition-all rounded-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  channelFilter === 'pickup'
                    ? 'bg-white text-neutral-900 font-bold shadow-xs border border-neutral-200/80'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium border border-transparent'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <span className="whitespace-nowrap">到车自提</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                  channelFilter === 'pickup' ? 'bg-neutral-900 text-white' : 'bg-neutral-200/70 text-neutral-600'
                }`}>
                  {pickupCount}
                </span>
              </button>
            </div>
          </div>

          {/* Right Tools: View Mode Toggle & Prompt Notice */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode(v => v === 'card' ? 'list' : 'card')}
              className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 flex items-center gap-1.5 shadow-2xs transition-colors rounded-md cursor-pointer"
              title="切换卡片网格与紧凑列表视图"
            >
              {viewMode === 'card' ? (
                <>
                  <List className="w-3.5 h-3.5 text-neutral-600" />
                  <span>列表视图</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="w-3.5 h-3.5 text-neutral-600" />
                  <span>卡片视图</span>
                </>
              )}
            </button>

            <div className="hidden md:flex items-center space-x-1.5 text-neutral-500 font-normal text-xs">
              <span className="w-1.5 h-1.5 bg-neutral-400 inline-block rounded-full"></span>
              <span>堂食订单默认不入骑手池，需转送请点击卡片【审核转外卖专送】</span>
            </div>
          </div>
        </div>

        {/* Row 3: Date Filter (批次4：共享 DateRangeFilter 胶囊条，预设档+自定义起止精确到分钟) */}
        <div className="flex items-center justify-between text-xs text-slate-700 pt-1.5 mt-1 border-t border-dashed border-[#e6e6e4] gap-2 bg-[#fbfbfa] -mx-3 sm:-mx-4 px-3 sm:px-4 py-1 overflow-x-auto scrollbar-none flex-nowrap shrink-0">
          <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-1 font-normal text-[#787774] shrink-0">
              <CalendarDays className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-[11px] whitespace-nowrap">日期筛选:</span>
            </div>
            <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
          </div>

          {/* Date Filter Status / Summary */}
          <div className="flex items-center gap-2 text-[11px] shrink-0 whitespace-nowrap">
            <span className="text-[#9b9a97] font-normal whitespace-nowrap">
              {dateRange ? (
                <>已筛选: <span className="font-medium text-slate-800">{dateRange.label}</span></>
              ) : (
                '全历史订单池'
              )}
            </span>
            <span className="text-[#e6e6e4]">|</span>
            <span className="text-slate-600 font-normal whitespace-nowrap">
              筛选出 <span className="text-slate-900 font-semibold">{filteredOrders.length}</span> 笔
            </span>
            <span className="text-[#e6e6e4]">|</span>
            <span className="text-slate-600 font-normal whitespace-nowrap">
              流水 <span className="font-amount font-bold text-slate-900">¥{filteredTotalAmount.toFixed(2)}</span>
            </span>
          </div>
        </div>
      </section>
      {/* END: ControlAndFilterBar */}

      {/* ========================================================================= */}
      {/* BEGIN: MainOrderCardsContainer (桌面端流式工业多列卡片架构)                */}
      {/* ========================================================================= */}
      <main className="flex-1 p-3 sm:p-4 max-w-[1920px] w-full mx-auto" data-purpose="kds-order-list">
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-300 p-12 text-center space-y-2.5 rounded-none shadow-xs">
            <Store className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="font-bold text-sm text-slate-800">暂无匹配的订单</h4>
            <p className="text-xs text-slate-500">当前筛选条件下没有待处理的订单，餐车待命就绪中。</p>
          </div>
        ) : viewMode === 'card' ? (
          <div className={`grid gap-3.5 ${ordersColumnsClass(ordersCols)}`}>
            {filteredOrders.map((order, idx) => {
              const isPending = order.status === 'pending' || (order.stepIndex === 0 && !order.merchantAccepted);
              const isCooking = order.status === 'cooking' || (order.stepIndex === 1 && order.status !== 'refund_pending');
              const isDelivering = order.status === 'delivering' || order.status === 'ready' || order.stepIndex === 2 || order.stepIndex === 3;
              const isCompleted = order.status === 'completed';
              const isRefundPending = order.refundStatus === 'pending' || order.status === 'refund_pending';
              const isRefunded = order.status === 'refunded' || order.status === 'cancelled';

              const orderChannel = resolveOrderChannelType(order);
              const isDineIn = orderChannel === 'dine_in';
              const isPickup = orderChannel === 'pickup';
              const isDelivery = orderChannel === 'delivery';

              const totalQty = order.items.reduce((acc, it) => acc + (it.quantity || 1), 0);
              const itemCount = order.items.length;

              // Pickup and shelf code
              const pickupCode = getOrGeneratePickupCode(order.orderNo, order.pickupCode);
              const shelfCode = getPickupShelfCode(order.id || order.orderNo, order.pickupShelfCode);

              // Net payout calculation
              const netPayout = order.merchantNetPayout !== undefined
                ? order.merchantNetPayout
                : order.totalAmount - (isDelivery ? 10.5 : 0);

              const riderFee = order.riderDeliveryFee !== undefined
                ? order.riderDeliveryFee
                : (isDelivery ? 6.0 : 0);

              const platformFee = order.platformCommission !== undefined
                ? order.platformCommission
                : (isDelivery ? 4.5 : 0);

              // Location text
              const destinationText = isDineIn
                ? `餐车外摆区 · ${order.tableCode ? `${order.tableCode} 号桌` : 'A2 号桌'} (${order.dinerCount || 3}人就餐)`
                : isPickup
                ? `${getUnifiedTruckName(order.truckId || 'truck-01', 'short')}自提点 (${order.truckLocation || '大悦城北广场侧面'})`
                : (order.deliveryAddress || '西藏北路 166 号大悦城商务座 1204 室');

              const isDrawerOpen = pinnedDrawerOrderNo === order.orderNo || hoveredDrawerOrderNo === order.orderNo;

              return (
                <article
                  key={`ord-card-${order.id || order.orderNo || idx}`}
                  className={`bg-white border transition-all flex flex-col h-full justify-between rounded-lg overflow-hidden shadow-2xs relative ${
                    isDrawerOpen
                      ? 'z-30 border-neutral-400 shadow-md ring-1 ring-neutral-300'
                      : 'z-10 border-neutral-200 hover:border-neutral-400 hover:shadow-xs'
                  }`}
                  data-purpose={`order-card-${order.orderNo}`}
                >
                  {/* 头部：单号、渠道与流转状态一体化收拢 */}
                  <div className="px-3.5 py-2.5 border-b border-neutral-200 bg-neutral-50/80 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                      <span className="font-black text-neutral-900 text-xs bg-neutral-200/80 px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                        #{order.orderNo.replace(/^#/, '')}
                      </span>

                      {isDineIn ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-neutral-800 bg-white border border-neutral-200 px-2 py-0.5 rounded shadow-2xs whitespace-nowrap shrink-0">
                          <Utensils className="w-3 h-3 text-neutral-600 shrink-0" />
                          <span className="whitespace-nowrap">堂食 · {order.tableCode ? `${order.tableCode}桌` : 'A2桌'}</span>
                        </span>
                      ) : isPickup ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shadow-2xs whitespace-nowrap shrink-0">
                          <ShoppingBag className="w-3 h-3 text-amber-700 shrink-0" />
                          <span className="whitespace-nowrap">自提 · #{pickupCode}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-2xs whitespace-nowrap shrink-0">
                          <Bike className="w-3 h-3 text-emerald-700 shrink-0" />
                          <span className="whitespace-nowrap">专送 · GPS</span>
                        </span>
                      )}
                    </div>

                    {/* 头部右侧：当前状态流转标签 */}
                    <div className="flex items-center gap-1.5 text-xs shrink-0 whitespace-nowrap">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 whitespace-nowrap shrink-0">
                          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="whitespace-nowrap">待商家接单</span>
                        </span>
                      ) : isCooking && !isRefundPending ? (
                        <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-50/70 px-2 py-0.5 rounded border border-amber-200 whitespace-nowrap shrink-0">
                          <Flame className="w-3 h-3 text-amber-600 animate-pulse shrink-0" />
                          <span className="whitespace-nowrap">后厨现制中</span>
                        </span>
                      ) : isDelivering && !isRefundPending ? (
                        <span className="inline-flex items-center gap-1 text-neutral-800 font-bold bg-white px-2 py-0.5 rounded border border-neutral-200 shadow-2xs whitespace-nowrap shrink-0">
                          {isDelivery ? (
                            <>
                              <Bike className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="whitespace-nowrap">专送中 (约{order.etaMinutes || 6}m)</span>
                            </>
                          ) : isPickup ? (
                            <>
                              <ShoppingBag className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="whitespace-nowrap">保温柜待自提</span>
                            </>
                          ) : (
                            <>
                              <Utensils className="w-3 h-3 text-neutral-700 shrink-0" />
                              <span className="whitespace-nowrap">传菜上桌中</span>
                            </>
                          )}
                        </span>
                      ) : isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 whitespace-nowrap shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="whitespace-nowrap">已妥投交付</span>
                        </span>
                      ) : isRefundPending ? (
                        <span className="inline-flex items-center gap-1 text-rose-800 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 animate-pulse whitespace-nowrap shrink-0">
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span className="whitespace-nowrap">退单待审核</span>
                        </span>
                      ) : isRefunded ? (
                        <span className="inline-flex items-center gap-1 text-neutral-500 font-medium bg-neutral-100 px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                          <Ban className="w-3 h-3 text-neutral-400 shrink-0" />
                          <span className="whitespace-nowrap">已退款作废</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* 属性元数据栏：支持悬停与点击触发展开完整信息抽屉卡片 */}
                  <div
                    className={`px-3.5 py-2.5 text-xs text-neutral-700 space-y-1.5 border-b border-neutral-200 transition-colors cursor-pointer select-none group/meta ${
                      isDrawerOpen ? 'bg-neutral-100/90' : 'bg-white hover:bg-neutral-50/90'
                    }`}
                    onMouseEnter={() => handleMetaMouseEnter(order.orderNo)}
                    onMouseLeave={handleMetaMouseLeave}
                    onClick={() => handleTogglePinDrawer(order.orderNo)}
                    title={isDrawerOpen ? '点击收起或取消常驻固定' : '悬停或点击展开完整履约与档案抽屉卡片'}
                  >
                    {/* 核心交付位置与履约人 */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      {isDineIn ? (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-neutral-500 text-xs whitespace-nowrap shrink-0">桌台区域:</span>
                            <span className="font-bold text-neutral-900 truncate">
                              {order.tableZone || '餐车外摆区'} · {order.tableCode ? `${order.tableCode}号` : 'A2号'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-neutral-500 text-[11px] whitespace-nowrap">
                              服务员: <strong className="text-neutral-800 font-normal">{order.serverName || '阿豪 (No.02)'}</strong>
                            </span>
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                isDrawerOpen
                                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                                  : 'bg-neutral-100 text-neutral-600 border-neutral-200 group-hover/meta:bg-neutral-200 group-hover/meta:text-neutral-900'
                              }`}
                            >
                              <span>{isDrawerOpen ? '收起' : '详情'}</span>
                              <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${isDrawerOpen ? 'rotate-180' : ''}`} />
                            </span>
                          </div>
                        </>
                      ) : isPickup ? (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-neutral-500 text-xs whitespace-nowrap shrink-0">存餐柜位:</span>
                            <span className="font-bold text-neutral-900 truncate">{shelfCode}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-amber-800 text-[11px] shrink-0 font-bold whitespace-nowrap">
                              自提码: #{pickupCode}
                            </span>
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                isDrawerOpen
                                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                                  : 'bg-neutral-100 text-neutral-600 border-neutral-200 group-hover/meta:bg-neutral-200 group-hover/meta:text-neutral-900'
                              }`}
                            >
                              <span>{isDrawerOpen ? '收起' : '详情'}</span>
                              <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${isDrawerOpen ? 'rotate-180' : ''}`} />
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-neutral-500 text-xs whitespace-nowrap shrink-0">配送履约:</span>
                            <span className="font-bold text-neutral-900 truncate">
                              骑手 {order.courierName || '陈志远 (专线 R-8821)'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-neutral-500 text-[11px] shrink-0 whitespace-nowrap">
                              柜格: {shelfCode}
                            </span>
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                isDrawerOpen
                                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                                  : 'bg-neutral-100 text-neutral-600 border-neutral-200 group-hover/meta:bg-neutral-200 group-hover/meta:text-neutral-900'
                              }`}
                            >
                              <span>{isDrawerOpen ? '收起' : '详情'}</span>
                              <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${isDrawerOpen ? 'rotate-180' : ''}`} />
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 次级元数据收拢：下单时间 · UID · 退单权限设置（纯净中性，不占用主要注意力） */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100 text-[11px] text-neutral-500">
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <span className="whitespace-nowrap shrink-0">下单 {order.createdTime || '12:36:20'}</span>
                        <span className="text-neutral-300 shrink-0">·</span>
                        <span className="truncate" title={`完整UID: ${order.userId || 'guest'} (点击展开完整信息)`}>
                          UID: {order.userId ? `${order.userId.slice(0, 10)}...` : 'guest...'}
                        </span>
                        <span className="text-neutral-300 shrink-0">·</span>
                        <span className="whitespace-nowrap shrink-0">{getUnifiedTruckName(order.truckId || order.truckName, 'short')}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLock(order);
                        }}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                          order.nonRefundable
                            ? 'text-rose-700 hover:bg-rose-50'
                            : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                        }`}
                        title={order.nonRefundable ? '已锁定退单，点击解锁允许退单' : '点击锁定退单'}
                      >
                        {order.nonRefundable ? (
                          <>
                            <Lock className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                            <span className="whitespace-nowrap">不可退单</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
                            <span className="whitespace-nowrap">允许退单</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 悬停抽屉信息卡：展示完整无截断的履约、身份、时间与策略档案 */}
                  <AnimatePresence>
                    {isDrawerOpen && (
                      <div
                        onMouseEnter={handleDrawerMouseEnter}
                        onMouseLeave={handleMetaMouseLeave}
                      >
                        <OrderMetaDrawerCard
                          order={order}
                          isPinned={pinnedDrawerOrderNo === order.orderNo}
                          onTogglePin={() => handleTogglePinDrawer(order.orderNo)}
                          onClose={() => {
                            setPinnedDrawerOrderNo(null);
                            setHoveredDrawerOrderNo(null);
                          }}
                          onToggleLock={handleToggleLock}
                          showToast={showToast}
                        />
                      </div>
                    )}
                  </AnimatePresence>

                  {/* 售后退款审核横幅 (若食客申请退款) */}
                  {isRefundPending && (
                    <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold text-rose-700">
                        <span className="flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4" />
                          <span>食客提交售后退单申请 (需审核)</span>
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          阶段: {order.refundPassedStep === 0 ? '待接单' : order.refundPassedStep === 1 ? '后厨制作中' : '配送中'}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 border border-rose-200 rounded-md text-[11px] space-y-1">
                        <div>
                          <span className="text-neutral-500">退单原因: </span>
                          <strong className="text-neutral-800">{order.refundReason || '食客点单信息变更'}</strong>
                        </div>
                        {order.refundFeedback && (
                          <div>
                            <span className="text-neutral-500">食客说明: </span>
                            <span className="italic text-neutral-700">"{order.refundFeedback}"</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setRefundRejectTarget(order)}
                          className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold rounded-md cursor-pointer"
                        >
                          驳回申请
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveRefund(order)}
                          className="px-3.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-md cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3 h-3" />
                          <span>同意退单并原路退款</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 菜品明细清单 (折叠抽屉) */}
                  <div className="p-3 text-xs flex-1 bg-white flex flex-col justify-between border-t border-neutral-100">
                    <details className="group w-full select-none" open>
                      <summary className="font-medium text-neutral-700 text-[11px] pb-2 border-b border-neutral-200 flex items-center justify-between cursor-pointer list-none">
                        <span className="flex items-center gap-1.5 text-neutral-900 font-bold">
                          {isDineIn ? (
                            <Utensils className="w-3.5 h-3.5 text-neutral-600" />
                          ) : (
                            <Package className="w-3.5 h-3.5 text-neutral-600" />
                          )}
                          <span>菜品清单 (共{itemCount}品{totalQty}件)</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isDineIn ? (
                            <span className="text-[10px] text-neutral-800 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 font-medium rounded">
                              现制明细
                            </span>
                          ) : isPickup ? (
                            <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 font-medium rounded">
                              自提取餐
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 font-medium rounded">
                              专送配送
                            </span>
                          )}
                          <span className="p-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border border-neutral-200 inline-flex items-center justify-center text-xs transition-transform group-open:rotate-180 rounded">
                            <ChevronDown className="w-3 h-3 leading-none" />
                          </span>
                        </div>
                      </summary>

                      <div className="space-y-1.5 pt-2">
                        {order.items.map((it, itemIdx) => {
                          const isStruck = it.isStruckOff === true;
                          return (
                            <div
                              key={itemIdx}
                              className={`p-2.5 border transition-all text-xs rounded-md ${
                                isStruck
                                  ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                                  : it.isCompensatoryGift
                                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                                  : 'bg-neutral-50/80 border-neutral-200 text-neutral-900'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`font-bold ${isStruck ? 'line-through text-neutral-400 font-normal' : 'text-neutral-900'}`}>
                                      {it.name}
                                    </span>
                                    {isStruck && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-600 text-white rounded">
                                        已划菜作废
                                      </span>
                                    )}
                                    {it.isCompensatoryGift && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-500 text-white rounded">
                                        致歉赠送 · ¥0
                                      </span>
                                    )}
                                    {it.addedBy && (
                                      <span className="text-[10px] text-neutral-600 bg-white px-1.5 py-0.2 border border-neutral-200 rounded">
                                        由 {it.addedBy} 点选
                                      </span>
                                    )}
                                  </div>

                                  {it.options && (
                                    <div className="text-[11px] text-neutral-500 mt-0.5 font-normal">[{it.options}]</div>
                                  )}

                                  {/* 划菜原因与客诉补偿方案展示 */}
                                  {isStruck && (
                                    <div className="mt-1 text-[11px] space-y-0.5 bg-white/90 p-1.5 border border-rose-200 rounded">
                                      <div className="text-rose-700 font-normal">
                                        <span className="font-bold">划菜原因：</span>
                                        {it.struckOffReason || '后厨原料已沽清'}
                                      </div>
                                      {it.compensationDetail && (
                                        <div className="text-emerald-700 font-normal">
                                          <span className="font-bold">补偿方案：</span>
                                          {it.compensationDetail}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* 右侧数量与划菜/撤销操作 */}
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className="text-neutral-900 font-black text-xs">x{it.quantity}</span>
                                  {isStruck ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRollbackStrikeOff(order.orderNo || order.id, itemIdx)}
                                      className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-0.5 cursor-pointer rounded"
                                      title="一键撤销划菜并恢复原单"
                                    >
                                      <RotateCcw className="w-2.5 h-2.5" />
                                      <span>撤销恢复</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setStrikeOffModalState({
                                          isOpen: true,
                                          order,
                                          itemIndex: itemIdx
                                        })
                                      }
                                      className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-rose-50 text-rose-600 border border-neutral-200 hover:border-rose-200 cursor-pointer rounded shadow-2xs"
                                      title="划除该菜品并执行客诉补偿"
                                    >
                                      划菜补偿
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>

                    {/* 配送 / 就餐地理位置 */}
                    <div className="flex items-center gap-1.5 text-xs text-neutral-700 pt-2.5 border-t border-neutral-200 mt-2.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span className="font-medium truncate">{destinationText}</span>
                    </div>
                  </div>

                  {/* 金额结算明细 */}
                  <div className="bg-neutral-50 px-3.5 py-2.5 border-t border-neutral-200 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-neutral-500 leading-tight font-normal">
                      <div>在线微信支付已清算</div>
                      <div className="font-amount text-neutral-400 mt-0.5">
                        骑手 ¥{riderFee.toFixed(1)} · 佣金 ¥{platformFee.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-emerald-700 font-bold font-amount">
                        餐车净得: <span>¥{netPayout.toFixed(2)}</span>
                      </div>
                      <div className="text-xl font-black text-neutral-900 font-amount tracking-tight">
                        ¥{order.totalAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* 底部动作按钮组：分层布局 + 容器内左右滚动遮罩 */}
                  <div className="p-2 sm:p-2.5 bg-white border-t border-neutral-200 space-y-2 rounded-b-lg">
                    {/* 上排通用工具组 */}
                    <AutoScrollButtonRow>
                      {/* 气泡联络室 */}
                      <button
                        type="button"
                        onClick={() => setChatOrder(order)}
                        className="relative shrink-0 p-2 bg-neutral-900 hover:bg-black text-white border border-neutral-900 flex items-center justify-center transition-colors rounded-md cursor-pointer shadow-2xs"
                        title="气泡联络室 (三端互通)"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 led-pulse rounded-full"></span>
                      </button>

                      {/* 小票打印 */}
                      <button
                        type="button"
                        onClick={() => setReceiptOrder(order)}
                        className="shrink-0 p-2 bg-white hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 border border-neutral-200 flex items-center justify-center transition-colors rounded-md cursor-pointer shadow-2xs"
                        title="小票预览打印"
                      >
                        <Printer className="w-3.5 h-3.5 shrink-0" />
                      </button>

                      {/* 商家主动退单 */}
                      <button
                        type="button"
                        onClick={() => setRejectOrderTarget(order)}
                        className="shrink-0 p-2 bg-white hover:bg-rose-50 text-rose-600 border border-neutral-200 hover:border-rose-200 flex items-center justify-center transition-colors rounded-md cursor-pointer shadow-2xs"
                        title="商家主动退单与拒单"
                      >
                        <Ban className="w-3.5 h-3.5 shrink-0" />
                      </button>

                      {/* 审核转为外卖专送 (仅限堂食显示) */}
                      {isDineIn && (
                        <button
                          type="button"
                          onClick={() => setAuditConvertTargetOrder(order)}
                          className="shrink-0 p-2 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 flex items-center justify-center transition-colors rounded-md cursor-pointer shadow-2xs"
                          title="审核转为外卖专送"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      )}

                      {/* 商家直接修改订单内容 */}
                      <button
                        type="button"
                        onClick={() => setOrderEditModalState({ isOpen: true, order })}
                        className="shrink-0 p-2 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 flex items-center justify-center transition-colors rounded-md cursor-pointer shadow-2xs"
                        title="修改订单菜品与数量 (支持增减与加菜)"
                      >
                        <Edit3 className="w-3.5 h-3.5 shrink-0" />
                      </button>

                      {/* 商家作废/删除订单 */}
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTargetOrder(order);
                          setDeleteReason('顾客误触/重复下单作废');
                        }}
                        className="shrink-0 p-2 bg-white hover:bg-rose-50 text-neutral-400 hover:text-rose-600 border border-neutral-200 hover:border-rose-200 flex items-center justify-center transition-colors rounded-md cursor-pointer shadow-2xs"
                        title="作废并删除此订单"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </AutoScrollButtonRow>

                    {/* 下排流转核心动作 */}
                    <AutoScrollButtonRow>
                      {isPending ? (
                        <button
                          type="button"
                          onClick={() => handleAcceptSingleOrder(order)}
                          className="flex-1 shrink-0 whitespace-nowrap min-w-[120px] py-2 px-3 bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors rounded-md cursor-pointer shadow-xs leading-none"
                        >
                          <ChefHat className="w-3.5 h-3.5 shrink-0" />
                          <span>接单制作 (进入后厨)</span>
                        </button>
                      ) : isCooking && !isRefundPending ? (
                        isDineIn ? (
                          <button
                            type="button"
                            onClick={() => {
                              onAdvanceOrderStatus(order.orderNo || order.id, 'delivering', {
                                status: 'delivering',
                                stepIndex: 3,
                                statusText: '堂食陆续出餐上桌中'
                              });
                              showToast(`堂食订单 #${order.orderNo.replace(/^#/, '')} 已制作完成，已通知传菜员送至 ${order.tableCode ? `${order.tableCode} 号桌` : '外摆区'}！`);
                            }}
                            className="flex-1 shrink-0 whitespace-nowrap min-w-[120px] py-2 px-3 bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors rounded-md cursor-pointer shadow-xs leading-none"
                          >
                            <Utensils className="w-3.5 h-3.5 shrink-0" />
                            <span>制作完成 · 传菜上桌</span>
                          </button>
                        ) : isPickup ? (
                          <>
                            {/* 订单看板快捷叫号取餐广播 */}
                            <button
                              type="button"
                              onClick={() => handleQuickBroadcastCall(order)}
                              className="shrink-0 whitespace-nowrap py-2 px-2.5 bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-[11px] flex items-center justify-center gap-1 border border-neutral-200 transition-all rounded-md cursor-pointer leading-none shadow-2xs"
                              title="外放语音呼叫自提顾客到前台取餐"
                            >
                              <Megaphone className="w-3 h-3 text-neutral-700 shrink-0" />
                              <span>叫号取餐{orderCallCounts[order.orderNo] ? ` (${orderCallCounts[order.orderNo]}次)` : ''}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setVerifyTargetOrder(order)}
                              className="flex-1 shrink-0 whitespace-nowrap min-w-[70px] py-2 px-2.5 bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors rounded-md cursor-pointer shadow-xs leading-none"
                            >
                              <Scan className="w-3 h-3 shrink-0" />
                              <span>自提核销</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onAdvanceOrderStatus(order.orderNo || order.id, 'delivering', {
                                  status: 'delivering',
                                  stepIndex: 2,
                                  statusText: '餐品已入保温柜待取'
                                });
                                voiceAlerts.smartLockerPickupGuidance(pickupCode, shelfCode || '03号保温格口');
                                showToast(`自提订单 #${order.orderNo.replace(/^#/, '')} 制作完毕，已放入保温柜并触发语音取餐引导！`);
                              }}
                              className="flex-1 shrink-0 whitespace-nowrap min-w-[70px] py-2 px-2.5 bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-xs flex items-center justify-center gap-1 border border-neutral-200 transition-colors rounded-md cursor-pointer shadow-2xs leading-none"
                            >
                              <ShoppingBag className="w-3 h-3 shrink-0" />
                              <span>出餐入柜</span>
                            </button>
                          </>
                        ) : (
                          <>
                            {/* 订单看板快捷呼叫骑手广播 */}
                            <button
                              type="button"
                              onClick={() => handleQuickBroadcastCall(order)}
                              className="shrink-0 whitespace-nowrap py-2 px-2.5 bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-[11px] flex items-center justify-center gap-1 border border-neutral-200 transition-all rounded-md cursor-pointer leading-none shadow-2xs"
                              title="外放语音呼叫外卖专送骑手到餐车站台取餐"
                            >
                              <Megaphone className="w-3 h-3 text-neutral-700 shrink-0" />
                              <span>呼叫骑手{orderCallCounts[order.orderNo] ? ` (${orderCallCounts[order.orderNo]}次)` : ''}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setVerifyTargetOrder(order)}
                              className="flex-1 shrink-0 whitespace-nowrap min-w-[70px] py-2 px-2.5 bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors rounded-md cursor-pointer shadow-xs leading-none"
                            >
                              <KeyRound className="w-3 h-3 shrink-0" />
                              <span>骑手核销</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onAdvanceOrderStatus(order.orderNo || order.id, 'delivering', {
                                  status: 'delivering',
                                  stepIndex: 3,
                                  statusText: '专线骑手配送中'
                                });
                                voiceAlerts.callRiderForOrder(order.orderNo);
                                showToast(`外卖订单 #${order.orderNo.replace(/^#/, '')} 制作完成，已调度专线骑手并语音呼叫！`);
                              }}
                              className="flex-1 shrink-0 whitespace-nowrap min-w-[70px] py-2 px-2.5 bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors rounded-md cursor-pointer shadow-xs leading-none"
                            >
                              <Bike className="w-3 h-3 shrink-0" />
                              <span>调度骑手</span>
                            </button>
                          </>
                        )
                      ) : isDelivering && !isRefundPending ? (
                        isDineIn ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickBroadcastCall(order)}
                              className="shrink-0 whitespace-nowrap py-2 px-2.5 bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-[11px] flex items-center justify-center gap-1 border border-neutral-200 transition-all rounded-md cursor-pointer leading-none shadow-2xs"
                              title="外放广播通知传菜"
                            >
                              <Megaphone className="w-3 h-3 text-neutral-700 shrink-0" />
                              <span>呼叫传菜{orderCallCounts[order.orderNo] ? ` (${orderCallCounts[order.orderNo]}次)` : ''}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onAdvanceOrderStatus(order.orderNo || order.id, 'completed', {
                                  status: 'completed',
                                  stepIndex: 4,
                                  statusText: '餐品全齐·就餐完毕'
                                });
                                showToast(`堂食桌台 ${order.tableCode || 'A1'} 宾客就餐完毕，桌台已重置翻台！`);
                              }}
                              className="flex-1 shrink-0 whitespace-nowrap min-w-[120px] py-2 px-3 bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors rounded-md cursor-pointer shadow-xs leading-none"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>餐品齐备 · 结账翻台</span>
                            </button>
                          </>
                        ) : isPickup ? (
                          <>
                            {/* 待取催取喇叭 */}
                            <button
                              type="button"
                              onClick={() => handleQuickBroadcastCall(order)}
                              className="shrink-0 whitespace-nowrap py-2 px-2.5 bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-[11px] flex items-center justify-center gap-1 border border-neutral-200 transition-all rounded-md cursor-pointer leading-none shadow-2xs"
                              title="外放广播催促自提顾客尽快取餐"
                            >
                              <Megaphone className="w-3 h-3 text-neutral-700 shrink-0" />
                              <span>催客取餐{orderCallCounts[order.orderNo] ? ` (${orderCallCounts[order.orderNo]}次)` : ''}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onAdvanceOrderStatus(order.orderNo || order.id, 'completed', {
                                  status: 'completed',
                                  stepIndex: 4,
                                  statusText: '顾客已自提离店'
                                });
                                showToast(`自提订单 #${order.orderNo.replace(/^#/, '')} 顾客已提货，流程已结单！`);
                              }}
                              className="flex-1 shrink-0 whitespace-nowrap min-w-[120px] py-2 px-3 bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors rounded-md cursor-pointer shadow-xs leading-none"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>核销完成 · 顾客已自提</span>
                            </button>
                          </>
                        ) : (
                          <>
                            {/* 催骑手尽快送达 */}
                            <button
                              type="button"
                              onClick={() => handleQuickBroadcastCall(order)}
                              className="shrink-0 whitespace-nowrap py-2 px-2.5 bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-[11px] flex items-center justify-center gap-1 border border-neutral-200 transition-all rounded-md cursor-pointer leading-none shadow-2xs"
                              title="外放催骑手加速取送"
                            >
                              <Megaphone className="w-3 h-3 text-neutral-700 shrink-0" />
                              <span>呼叫骑手{orderCallCounts[order.orderNo] ? ` (${orderCallCounts[order.orderNo]}次)` : ''}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onAdvanceOrderStatus(order.orderNo || order.id, 'completed', {
                                  status: 'completed',
                                  stepIndex: 4,
                                  statusText: '已送达妥投'
                                });
                                showToast(`外卖订单 #${order.orderNo.replace(/^#/, '')} 骑手已妥投送达！`);
                              }}
                              className="flex-1 shrink-0 whitespace-nowrap min-w-[100px] py-2 px-3 bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors rounded-md cursor-pointer shadow-xs leading-none"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>送达妥投</span>
                            </button>
                          </>
                        )
                      ) : isCompleted ? (
                        <span className="text-emerald-700 text-xs font-bold px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md shrink-0 whitespace-nowrap">
                          工单已归档结清
                        </span>
                      ) : isRefunded ? (
                        <span className="text-neutral-500 text-xs font-medium px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded-md shrink-0 whitespace-nowrap">
                          已退款全单取消
                        </span>
                      ) : null}
                    </AutoScrollButtonRow>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* List View Mode (Dual-Port Comprehensive Grid & Table Layout) */
          <MerchantOrdersListView
            orders={filteredOrders}
            onAdvanceOrderStatus={onAdvanceOrderStatus}
            onQuickBroadcastCall={handleQuickBroadcastCall}
            orderCallCounts={orderCallCounts}
            onOpenChat={(order) => setChatOrder(order)}
            onOpenReceipt={(order) => setReceiptOrder(order)}
            onDeleteOrder={(order) => {
              setDeleteTargetOrder(order);
              setDeleteReason('顾客误触/重复下单作废');
            }}
            showToast={showToast}
          />
        )}
      </main>
      {/* END: MainOrderCardsContainer */}

      {/* ========================================================================= */}
      {/* BEGIN: BottomStatusBar (工业级底栏状态与当日交班营收结算条)              */}
      {/* ========================================================================= */}
      <footer className="mt-auto px-4 py-2 bg-white border-t border-[#e6e6e4] flex items-center justify-between text-xs text-[#787774] shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full led-pulse"></span>
          <span className="font-medium text-[#0f172a]">工作中</span>
          <span className="text-[#e6e6e4]">|</span>
          <span className="font-normal">待办工单: <span className="text-[#b45309] font-medium">{cookingOrders.length + pendingOrders.length} 单</span></span>
          <span className="text-[#e6e6e4]">|</span>
          <span className="font-normal">今日已结营业额: <span className="font-amount text-[#047857] font-medium">¥{todayRevenue.toFixed(2)}</span></span>
        </div>

        <button
          type="button"
          onClick={handleRefreshSync}
          className="p-1 text-[#787774] hover:text-[#0f172a] flex items-center gap-1 border border-transparent hover:border-[#e6e6e4] rounded-[2px] cursor-pointer text-[11px] font-normal"
          title="刷新最新订单队列"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">刷新同步</span>
        </button>
      </footer>
      {/* END: BottomStatusBar */}

      {/* ========================================================================= */}
      {/* MODALS & DIALOGS                                                          */}
      {/* ========================================================================= */}

      {/* 1. Modal: 热敏小票云打印预览 (58mm 纯直角工业标准) */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-[4px] border border-[#e6e6e4] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-white text-[#201f1d] border-b border-[#e6e6e4] flex items-center justify-between">
              <span className="font-medium text-xs flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>{getUnifiedTruckName(receiptOrder.truckId || receiptOrder.truckName, 'standard')} · 热敏小票打印预览 (58mm)</span>
              </span>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="text-[#787774] hover:text-[#201f1d] p-1 rounded hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Simulation Body */}
            <div className="p-4 bg-[#fbfbfa] text-xs space-y-3 max-h-[70vh] overflow-y-auto border-y border-[#e6e6e4]">
              <div className="text-center space-y-1">
                <p className="font-medium text-sm text-[#0f172a]">{getUnifiedTruckName(receiptOrder.truckId || receiptOrder.truckName, 'standard')}</p>
                <p className="text-[11px] text-[#787774]">-- 结账备餐制作单 --</p>
              </div>

              <div className="border-t border-dashed border-[#e6e6e4] pt-2 space-y-1 text-[11px] text-[#37352f]">
                <p>工单号: <span className="font-semibold text-[#0f172a]">#{receiptOrder.orderNo.replace(/^#/, '')}</span></p>
                <p>下单时间: {receiptOrder.createdTime}</p>
                <p>分流渠道: {resolveOrderChannelType(receiptOrder) === 'dine_in' ? '现场堂食' : resolveOrderChannelType(receiptOrder) === 'pickup' ? '到店自提' : '外卖专送'}</p>
                <p>退单控制: {receiptOrder.nonRefundable ? '已锁定 (不可退单)' : '正常允许'}</p>
              </div>

              {/* Items */}
              <div className="border-t border-dashed border-[#e6e6e4] pt-2 space-y-1.5">
                <div className="flex justify-between font-medium text-[11px] text-[#787774]">
                  <span>品名</span>
                  <span>数量</span>
                  <span>单价</span>
                </div>
                {receiptOrder.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-[11px] text-[#0f172a]">
                    <div className="truncate max-w-[140px]">
                      <div>{it.name}</div>
                      {it.options && <div className="text-[10px] text-[#9b9a97]">[{it.options}]</div>}
                    </div>
                    <span className="text-[#787774]">x{it.quantity}</span>
                    <span className="font-medium font-amount">¥{(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-[#e6e6e4] pt-2 space-y-1 text-right">
                <p className="font-semibold text-sm text-[#047857] pt-1 font-amount">
                  实付总额: ¥{receiptOrder.totalAmount.toFixed(2)}
                </p>
              </div>

              <div className="border-t border-dashed border-[#e6e6e4] pt-2 text-[11px] space-y-1">
                <p className="font-medium text-[#787774]">送达/就餐位:</p>
                <p className="text-[#0f172a]">
                  {resolveOrderChannelType(receiptOrder) === 'dine_in'
                    ? `桌台: ${receiptOrder.tableCode || 'A2'} · ${receiptOrder.tableZone || '外摆区'}`
                    : receiptOrder.deliveryAddress}
                </p>
              </div>

              <div className="border-t border-dashed border-[#e6e6e4] pt-2 text-center text-[10px] text-[#9b9a97]">
                -- 感谢惠顾 · 期待再次光临 --
              </div>
            </div>

            <div className="p-3 bg-white flex items-center justify-end gap-2 border-t border-[#e6e6e4]">
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="px-3 py-1.5 bg-[#fbfbfa] hover:bg-slate-100 text-[#787774] border border-[#e6e6e4] rounded-[2px] font-normal cursor-pointer text-xs"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={() => {
                  setReceiptOrder(null);
                  showToast(`已向热敏云打印机发送【${receiptOrder.orderNo}】出票指令！`);
                }}
                className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-[2px] font-normal cursor-pointer flex items-center gap-1 text-xs"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>立即出票</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: 拒单 / 主动退款 */}
      {rejectOrderTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-[4px] border border-rose-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-rose-50/60 border-b border-rose-200 flex items-center justify-between text-rose-700">
              <span className="font-medium text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>拒单与原路退款</span>
              </span>
              <button
                type="button"
                onClick={() => setRejectOrderTarget(null)}
                className="text-rose-500 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-[#787774]">
                正在对工单 <span className="text-[#0f172a] font-medium">#{rejectOrderTarget.orderNo.replace(/^#/, '')}</span> 进行拒单操作，退款将全额原路退还至顾客支付账户。
              </p>

              <div className="space-y-1.5">
                <label className="font-bold text-neutral-800 block text-xs">选择拒单原因 (向下拉彩单):</label>
                <BeautifiedDropdownMenu
                  items={REJECT_REASON_OPTIONS}
                  value={rejectReason}
                  onChange={(val) => setRejectReason(val)}
                  groupTitle="选择拒单核销分类"
                  className="w-full"
                />
              </div>
            </div>

            <div className="p-3 bg-[#fbfbfa] border-t border-[#e6e6e4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectOrderTarget(null)}
                className="px-3 py-1.5 bg-white text-[#787774] border border-[#e6e6e4] rounded-[2px] font-normal cursor-pointer text-xs"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onRejectOrder(rejectOrderTarget.id, rejectReason);
                  setRejectOrderTarget(null);
                  showToast(`已驳回工单 #${rejectOrderTarget.orderNo} 并原路发起退款`);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-[2px] font-normal cursor-pointer text-xs"
              >
                确认拒单退款
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: 驳回食客退单申请 */}
      {refundRejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-[4px] border border-[#e6e6e4] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-[#fbfbfa] border-b border-[#e6e6e4] flex items-center justify-between text-[#0f172a]">
              <span className="font-medium text-xs flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span>驳回食客退单申请</span>
              </span>
              <button
                type="button"
                onClick={() => setRefundRejectTarget(null)}
                className="text-[#787774] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-[#787774]">
                正在驳回工单 <span className="text-[#0f172a] font-medium">#{refundRejectTarget.orderNo.replace(/^#/, '')}</span> 的退款申请。驳回后工单将恢复出餐/配送流程。
              </p>

              <div className="space-y-1">
                <label className="font-medium text-[#0f172a] block">填写驳回原因说明:</label>
                <textarea
                  rows={3}
                  value={refundRejectReason}
                  onChange={(e) => setRefundRejectReason(e.target.value)}
                  placeholder="例如：餐品已下锅高温炙烤，无法中途取消..."
                  className="w-full p-2 bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] focus:outline-none text-xs text-[#0f172a]"
                />
              </div>
            </div>

            <div className="p-3 bg-[#fbfbfa] border-t border-[#e6e6e4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundRejectTarget(null)}
                className="px-3 py-1.5 bg-white text-[#787774] border border-[#e6e6e4] rounded-[2px] font-normal cursor-pointer text-xs"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRejectRefundSubmit}
                className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-[2px] font-normal cursor-pointer text-xs"
              >
                确认驳回申请
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: 订单三端即时气泡联络室 (商家控制台视窗) */}
      {chatOrder && (
        <UnifiedOmniChatModal
          isOpen={!!chatOrder}
          onClose={() => setChatOrder(null)}
          order={chatOrder}
          orderNo={chatOrder.orderNo}
          viewerRole="merchant"
          onAdvanceOrderStatus={onAdvanceOrderStatus}
          onAcceptOrder={onAcceptOrder}
          onRejectOrder={onRejectOrder}
          onAuditRefund={onAuditRefund}
          showToast={showToast}
        />
      )}

      {/* 5. Modal: 骑手取件核销弹窗 */}
      {verifyTargetOrder && (
        <MerchantPickupVerifyModal
          isOpen={!!verifyTargetOrder}
          onClose={() => setVerifyTargetOrder(null)}
          order={verifyTargetOrder}
          onVerifySuccess={(orderId, pickupCodeVal) => {
            businessTransactionEngine.executeVerifyPickup({
              orderNo: verifyTargetOrder.orderNo || orderId,
              pickupCode: pickupCodeVal,
              operatorName: '订单中心扫码中枢',
              showToast
            });
            onAdvanceOrderStatus(verifyTargetOrder.orderNo || orderId, 'delivering', {
              status: 'delivering',
              stepIndex: 3,
              statusText: '专线骑手配送中',
              pickupVerifiedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
              pickupVerifiedBy: '餐车扫码核销'
            });
            setVerifyTargetOrder(null);
          }}
          showToast={showToast}
        />
      )}

      {/* 6. Modal: 堂食转外卖专送人工审核弹窗 */}
      {auditConvertTargetOrder && (
        <MerchantAuditConvertToDeliveryModal
          order={auditConvertTargetOrder}
          isOpen={Boolean(auditConvertTargetOrder)}
          onClose={() => setAuditConvertTargetOrder(null)}
          onConfirmConvert={handleConfirmConvertToDelivery}
        />
      )}

      {/* 7. Modal: 商家删除/作废订单弹窗 */}
      {deleteTargetOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-[4px] border border-[#e6e6e4] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3 bg-white border-b border-[#e6e6e4] text-[#0f172a] flex items-center justify-between">
              <span className="font-medium text-xs flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>全渠道订单中心 · 作废并删除订单</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetOrder(null);
                  setCustomDeleteReason('');
                }}
                className="text-[#787774] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3.5 text-xs">
              {/* Alert Warning Box */}
              <div className="p-3 bg-rose-50/70 border border-rose-200 text-rose-800 space-y-1 rounded-[2px]">
                <div className="flex items-center gap-1.5 font-medium text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>高风险敏感操作警告</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed font-normal">
                  删除后该订单将从全渠道工作台、后厨KDS排产与实时队列中物理剔除。系统将自动记录审计流水并创建安全快照。
                </p>
              </div>

              {/* Order Info Card */}
              <div className="bg-[#fbfbfa] p-3 border border-[#e6e6e4] rounded-[2px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#0f172a] text-sm">
                    #{deleteTargetOrder.orderNo.replace(/^#/, '')}
                  </span>
                  <span className="text-[11px] font-normal text-[#787774]">
                    {deleteTargetOrder.createdTime}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#787774] pt-1 border-t border-dashed border-[#e6e6e4]">
                  <span>
                    渠道:{' '}
                    <span className="text-[#0f172a] font-medium">
                      {resolveOrderChannelType(deleteTargetOrder) === 'dine_in'
                        ? '堂食就餐'
                        : resolveOrderChannelType(deleteTargetOrder) === 'pickup'
                        ? '到店自提'
                        : '外卖专送'}
                    </span>
                    {deleteTargetOrder.tableCode ? ` (桌台: ${deleteTargetOrder.tableCode})` : ''}
                  </span>
                  <span>
                    实付:{' '}
                    <span className="font-amount text-[#047857] font-semibold text-sm">
                      ¥{deleteTargetOrder.totalAmount.toFixed(2)}
                    </span>
                  </span>
                </div>

                <div className="text-[11px] text-[#787774] truncate">
                  菜品:{' '}
                  {deleteTargetOrder.items.map((i) => `${i.name} x${i.quantity}`).join('，')}
                </div>
              </div>

              {/* Reason Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-neutral-800 block text-xs">选择作废/删除原因 (向下拉彩单):</label>
                <BeautifiedDropdownMenu
                  items={DELETE_REASON_OPTIONS}
                  value={deleteReason}
                  onChange={(val) => setDeleteReason(val)}
                  groupTitle="选择作废/删除归类"
                  className="w-full"
                />

                {deleteReason === 'other' && (
                  <input
                    type="text"
                    value={customDeleteReason}
                    onChange={(e) => setCustomDeleteReason(e.target.value)}
                    placeholder="请输入具体的作废删除原因说明..."
                    className="w-full p-2 mt-1.5 bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] focus:outline-none text-xs"
                    autoFocus
                  />
                )}
              </div>

              {/* Snapshot Info */}
              <label className="flex items-center gap-2 text-[#787774] cursor-pointer select-none text-[11px] pt-1">
                <input
                  type="checkbox"
                  checked={createSafetySnapshot}
                  onChange={(e) => setCreateSafetySnapshot(e.target.checked)}
                  className="rounded-[2px] text-emerald-600 focus:ring-0"
                />
                <span className="font-normal">自动保存版本快照与操作日志（可在总控台随时回滚恢复）</span>
              </label>
            </div>

            {/* Footer */}
            <div className="p-3 bg-[#fbfbfa] border-t border-[#e6e6e4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetOrder(null);
                  setCustomDeleteReason('');
                }}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-[#787774] border border-[#e6e6e4] rounded-[2px] font-normal cursor-pointer text-xs"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-[2px] font-normal cursor-pointer text-xs flex items-center gap-1.5 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>确认作废并删除</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 右侧折叠内嵌式账号操作对比与数据兜底组件 */}
      <AccountAuditDrawer
        currentModule="orders"
        title="全渠道订单操作审计与版本恢复"
        showToast={showToast}
      />

      {/* 划菜退菜与客诉补偿决策台 */}
      <MerchantStrikeOffCompensationModal
        isOpen={strikeOffModalState.isOpen}
        order={strikeOffModalState.order}
        targetItemIndex={strikeOffModalState.itemIndex}
        onClose={() => setStrikeOffModalState({ isOpen: false, order: null, itemIndex: null })}
        onConfirmStrikeOff={handleConfirmStrikeOff}
        onRollbackStrikeOff={handleRollbackStrikeOff}
        showToast={showToast}
      />

      {/* 商家直接修改订单内容中枢 */}
      <MerchantOrderEditModal
        isOpen={orderEditModalState.isOpen}
        order={orderEditModalState.order}
        onClose={() => setOrderEditModalState({ isOpen: false, order: null })}
        onSaveOrderEdit={handleSaveOrderEdit}
        showToast={showToast}
      />
    </div>
  );
};
