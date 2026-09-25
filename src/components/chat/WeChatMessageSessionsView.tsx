import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Truck,
  Search,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  CheckCheck,
  Check,
  Zap,
  Users,
  Radio,
  Clock,
  ShieldCheck,
  Thermometer,
  Navigation,
  MessageSquare,
  Phone,
  Sparkles,
  MapPin,
  Flame,
  AlertCircle,
  ExternalLink,
  UtensilsCrossed,
  X,
  FolderTree,
  Folder,
  FolderOpen,
  Filter,
  RotateCcw,
  Bike,
  FileText
} from 'lucide-react';
import { Order, OrderItemRecord, DishItem } from '../../types';
import { TruckLocationConfig } from '../../utils/truckLocationEngine';
import { matchDishImageUrl } from '../../utils/dishImageMatcher';
import {
  getOrderChatMessages,
  getUnreadCountForRole,
  sendOrderChatMessage,
  ChatMessageItem
} from '../../utils/chatHub';
import { getGroupChatUnreadCount } from '../../utils/truckGroupChatEngine';
import { safeVibrate } from '../../utils/haptics';

export interface WeChatMessageSessionsViewProps {
  orders: Order[];
  allTrucks: TruckLocationConfig[];
  activeTruck: TruckLocationConfig;
  viewerRole?: string;
  onOpenOrderChat: (orderNo: string) => void;
  onOpenCommunityChat: (truckId: string) => void;
  onOpenFleetChat: () => void;
  onTrackOrder?: (orderId: string) => void;
  onBackToMenu?: () => void;
  showToast?: (title: string, desc?: string) => void;
}

export type SessionCategoryTab = 'all' | 'orders' | 'community' | 'fleet';

/** 树状筛选器节点定义 */
export interface TreeFilterSelection {
  category: 'all' | 'truck' | 'status' | 'channel';
  value: string;
  label: string;
}

/**
 * 针对长文本自动调整字号防溢出的计算函数
 * 确保在各种移动端和窄视口下文本自动缩放，不溢出容器
 */
const getAdaptiveTitleSize = (text: string) => {
  const len = text ? text.length : 0;
  if (len > 24) return 'text-[11px] leading-tight';
  if (len > 16) return 'text-xs leading-snug';
  if (len > 10) return 'text-[13px] leading-snug';
  return 'text-[13.5px] sm:text-sm leading-normal';
};

const getAdaptiveSubSize = (text: string) => {
  const len = text ? text.length : 0;
  if (len > 20) return 'text-[9.5px] leading-none';
  if (len > 13) return 'text-[10px] leading-none';
  return 'text-[11px] leading-tight';
};

const getAdaptiveSnippetSize = (text: string) => {
  const len = text ? text.length : 0;
  if (len > 35) return 'text-[10.5px] leading-tight';
  return 'text-xs leading-tight';
};

/**
 * 履约状态语义化图标与样式映射
 * 为橙色制作中、配送中、待取餐等状态配置专属动态图标与高辨识度徽标
 */
export const getOrderStatusBadgeMeta = (status?: string, statusText?: string) => {
  const text = statusText || '';
  const st = status || '';

  if (st === 'cooking' || text.includes('制作') || text.includes('现制') || text.includes('备餐') || text.includes('后厨')) {
    return {
      icon: Flame,
      label: statusText || '餐品制作中',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300/90 ring-1 ring-amber-400/20 shadow-2xs',
      iconClass: 'text-amber-600 animate-pulse'
    };
  }
  if (st === 'delivering' || text.includes('专送') || text.includes('配送') || text.includes('骑手')) {
    return {
      icon: Bike,
      label: statusText || '专送骑手配送中',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-300/90 ring-1 ring-blue-400/20 shadow-2xs',
      iconClass: 'text-blue-600 animate-pulse'
    };
  }
  if (st === 'ready' || st === 'waiting_pickup' || text.includes('待自提') || text.includes('就餐') || text.includes('待取')) {
    return {
      icon: Clock,
      label: statusText || '待自提/就餐',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300/90 ring-1 ring-emerald-400/20 shadow-2xs',
      iconClass: 'text-emerald-600'
    };
  }
  if (st === 'completed' || text.includes('完成') || text.includes('已送达') || text.includes('履约')) {
    return {
      icon: ShieldCheck,
      label: statusText || '订单已送达',
      badgeClass: 'bg-neutral-100 text-neutral-700 border-neutral-200/90 shadow-2xs',
      iconClass: 'text-neutral-500'
    };
  }
  if (st === 'refunding' || text.includes('退款') || text.includes('退单')) {
    return {
      icon: RotateCcw,
      label: statusText || '退款处理中',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-300/90 ring-1 ring-rose-400/20 shadow-2xs',
      iconClass: 'text-rose-600'
    };
  }
  return {
    icon: Flame,
    label: statusText || '餐品制作中',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300/90 ring-1 ring-amber-400/20 shadow-2xs',
    iconClass: 'text-amber-600 animate-pulse'
  };
};

/**
 * WeChatMessageSessionsView
 * 类似微信聊天的消息会话中枢
 * 恢复标准工业圆角系统规范（承载容器 rounded-xl、胶囊按钮与微标 rounded-full、操作单元 rounded-lg）
 * 保持严格网格排版、各分段依次左对齐、自适应字号防溢出与下拉树状筛选器
 */
export const WeChatMessageSessionsView: React.FC<WeChatMessageSessionsViewProps> = ({
  orders,
  allTrucks,
  activeTruck,
  viewerRole = 'user',
  onOpenOrderChat,
  onOpenCommunityChat,
  onOpenFleetChat,
  onTrackOrder,
  onBackToMenu,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<SessionCategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [quickConsultBusy, setQuickConsultBusy] = useState<string | null>(null);

  // 餐车名称下拉隐藏收纳弹窗组件状态 (保存当前打开弹窗的订单号)
  const [openTruckPopoverOrderNo, setOpenTruckPopoverOrderNo] = useState<string | null>(null);

  // 下拉式小型树状筛选器状态
  const [showTreeDropdown, setShowTreeDropdown] = useState<boolean>(false);
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<Record<string, boolean>>({
    'tree-trucks': true,
    'tree-status': true,
    'tree-channels': false
  });
  const [selectedTreeNode, setSelectedTreeNode] = useState<TreeFilterSelection>({
    category: 'all',
    value: 'all',
    label: '全部维度'
  });

  const treeDropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部收起树状下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (treeDropdownRef.current && !treeDropdownRef.current.contains(event.target as Node)) {
        setShowTreeDropdown(false);
      }
    };
    if (showTreeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTreeDropdown]);

  // 监听刷新
  const handleRefresh = () => {
    safeVibrate(15);
    setRefreshKey((prev) => prev + 1);
    if (showToast) {
      showToast('会话列表已刷新', '已同步最新订单状态与协同消息');
    }
  };

  // 切换展开/折叠订单状况与已购菜品下拉组件
  const handleToggleExpand = (orderKey: string) => {
    safeVibrate(12);
    setExpandedOrders((prev) => ({
      ...prev,
      [orderKey]: !prev[orderKey]
    }));
  };

  // 标记全部已读
  const handleMarkAllRead = () => {
    safeVibrate(15);
    if (showToast) {
      showToast('全部已标为已读', '已清空当前所有未读消息提示');
    }
  };

  // 切换树状节点展开状态
  const handleToggleTreeNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    safeVibrate(8);
    setExpandedTreeNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // 选择树状筛选叶子节点
  const handleSelectTreeNode = (selection: TreeFilterSelection) => {
    safeVibrate(12);
    setSelectedTreeNode(selection);
    setShowTreeDropdown(false);
    if (showToast) {
      showToast('已应用树状筛选', selection.label);
    }
  };

  // 重置树状筛选
  const handleResetTreeFilter = () => {
    safeVibrate(12);
    setSelectedTreeNode({
      category: 'all',
      value: 'all',
      label: '全部维度'
    });
    setShowTreeDropdown(false);
    if (showToast) {
      showToast('已重置树状筛选', '展示全部餐车站台与状态会话');
    }
  };

  // 快速针对当前订单向餐车后厨发消息
  const handleQuickConsult = (orderNo: string, truckName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickConsultBusy(orderNo);
    safeVibrate(15);
    try {
      sendOrderChatMessage(orderNo, {
        type: 'text',
        senderRole: viewerRole === 'merchant' ? 'merchant' : viewerRole === 'rider' ? 'rider' : 'user',
        senderName: viewerRole === 'merchant' ? '流动餐车·主理人' : viewerRole === 'rider' ? '专送骑手' : '食客（你）',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
        text: `【进度咨询】您好，请问单号 #${orderNo.replace(/^#/, '')} 的餐品目前出餐进度如何？`
      });
      if (showToast) {
        showToast('已向餐车发送催单咨询', `单号 #${orderNo.replace(/^#/, '')}`);
      }
      setRefreshKey((k) => k + 1);
    } catch {}
    setTimeout(() => setQuickConsultBusy(null), 600);
  };

  // 整理订单数据并获取最新一条聊天记录
  const orderSessions = useMemo(() => {
    const roleKey = viewerRole === 'merchant' ? 'merchant' : viewerRole === 'rider' ? 'rider' : 'user';
    return orders.map((ord) => {
      const cleanNo = (ord.orderNo || ord.id || 'UR-9821').replace(/^#/, '');
      const matchedTruck = allTrucks.find((t) => t.id === ord.truckId) || activeTruck;
      const msgs = getOrderChatMessages(cleanNo, ord);
      const lastMsg: ChatMessageItem | undefined = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : undefined;

      let lastMsgSnippet = '暂无新留言，点击进入协同联络室';
      let lastMsgTime = ord.createdTime || '刚刚';

      if (lastMsg) {
        lastMsgTime = lastMsg.time || '刚刚';
        const senderPrefix =
          lastMsg.senderRole === 'rider'
            ? '【骑手】'
            : lastMsg.senderRole === 'merchant'
            ? '【餐车】'
            : lastMsg.senderRole === 'platform'
            ? '【调度】'
            : '【食客】';

        if (lastMsg.type === 'voice') {
          lastMsgSnippet = `${senderPrefix} ${lastMsg.voiceTranscribed || '[语音对讲消息]'}`;
        } else if (lastMsg.type === 'status_change') {
          lastMsgSnippet = `${senderPrefix} ${lastMsg.statusChangeInfo?.title || '[状态流转通知]'}`;
        } else if (lastMsg.type === 'sla_supervision') {
          lastMsgSnippet = `【SLA督办】${lastMsg.text || '已开启高峰极速专送时限履约督办'}`;
        } else {
          lastMsgSnippet = `${senderPrefix} ${lastMsg.text || '[协同互动消息]'}`;
        }
      }

      const unread = getUnreadCountForRole(cleanNo, roleKey);
      const totalAmount = Number(ord.totalAmount || 0);

      return {
        order: ord,
        cleanNo,
        truck: matchedTruck,
        lastMsgSnippet,
        lastMsgTime,
        unread,
        totalAmount
      };
    });
  }, [orders, allTrucks, activeTruck, viewerRole, refreshKey]);

  // 社群与车队群数据
  const communitySessions = useMemo(() => {
    return allTrucks.slice(0, 3).map((trk) => {
      const unread = getGroupChatUnreadCount('truck_community', trk.id);
      return {
        type: 'community' as const,
        id: trk.id,
        name: `${trk.name.replace('流动餐车', '')} · 老饕粉丝群`,
        truck: trk,
        subtitle: `驻点：${trk.locationName} · 384位车友在群`,
        lastMsgSnippet: `【主厨】今晚 ${trk.locationName} 驻点现烤特选和牛汉堡，欢迎老饕尝鲜互动！`,
        lastMsgTime: '12:49',
        unread
      };
    });
  }, [allTrucks, refreshKey]);

  const fleetSession = useMemo(() => {
    const unread = getGroupChatUnreadCount('fleet_dispatch', 'fleet-command');
    return {
      type: 'fleet' as const,
      id: 'fleet-command',
      name: '黑曜石车队 · 调度指挥总群',
      subtitle: '4辆餐车跨车原料调拨 · 泊位联动',
      lastMsgSnippet: '【调度中心】02号车目前和牛原料充沛，各泊位餐车如有缺料可快速协同转交',
      lastMsgTime: '11:15',
      unread
    };
  }, [refreshKey]);

  // 计算总未读数
  const totalUnread = useMemo(() => {
    const orderUnread = orderSessions.reduce((acc, cur) => acc + cur.unread, 0);
    const commUnread = communitySessions.reduce((acc, cur) => acc + cur.unread, 0);
    return orderUnread + commUnread + fleetSession.unread;
  }, [orderSessions, communitySessions, fleetSession]);

  // 结合 Tab、树状层级筛选器与搜索词进行过滤
  const filteredOrderSessions = useMemo(() => {
    if (activeTab === 'community' || activeTab === 'fleet') return [];

    let list = orderSessions;

    // 1. 树状筛选器分类过滤
    if (selectedTreeNode.category === 'truck' && selectedTreeNode.value !== 'all') {
      list = list.filter((s) => s.truck.id === selectedTreeNode.value || s.order.truckId === selectedTreeNode.value);
    } else if (selectedTreeNode.category === 'status' && selectedTreeNode.value !== 'all') {
      list = list.filter((s) => {
        if (selectedTreeNode.value === 'cooking') return s.order.status === 'cooking' || !s.order.status;
        if (selectedTreeNode.value === 'delivering') return s.order.status === 'delivering';
        if (selectedTreeNode.value === 'ready') return s.order.status === 'ready' || s.order.status === 'waiting_pickup';
        if (selectedTreeNode.value === 'completed') return s.order.status === 'completed';
        return true;
      });
    } else if (selectedTreeNode.category === 'channel') {
      if (selectedTreeNode.value === 'community' || selectedTreeNode.value === 'fleet') {
        return [];
      }
    }

    // 2. 搜索关键词过滤
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        return (
          s.cleanNo.toLowerCase().includes(q) ||
          s.truck.name.toLowerCase().includes(q) ||
          s.truck.locationName.toLowerCase().includes(q) ||
          s.lastMsgSnippet.toLowerCase().includes(q) ||
          s.order.items.some((i) => i.name.toLowerCase().includes(q))
        );
      });
    }
    return list;
  }, [orderSessions, activeTab, selectedTreeNode, searchQuery]);

  // 树状筛选判断是否展现社群与车队
  const showCommunity = useMemo(() => {
    if (activeTab === 'orders' || activeTab === 'fleet') return false;
    if (selectedTreeNode.category === 'status') return false;
    if (selectedTreeNode.category === 'channel' && selectedTreeNode.value !== 'all' && selectedTreeNode.value !== 'community') return false;
    if (selectedTreeNode.category === 'truck' && selectedTreeNode.value !== 'all') {
      return communitySessions.some((c) => c.truck.id === selectedTreeNode.value);
    }
    return true;
  }, [activeTab, selectedTreeNode, communitySessions]);

  const showFleet = useMemo(() => {
    if (activeTab === 'orders' || activeTab === 'community') return false;
    if (selectedTreeNode.category === 'status') return false;
    if (selectedTreeNode.category === 'truck' && selectedTreeNode.value !== 'all') return false;
    if (selectedTreeNode.category === 'channel' && selectedTreeNode.value !== 'all' && selectedTreeNode.value !== 'fleet') return false;
    return true;
  }, [activeTab, selectedTreeNode]);

  return (
    <div className="w-full h-full min-h-0 bg-[#F7F7F6] flex flex-col select-none overflow-hidden font-sans">
      {/* =========================================================================
          1. 顶栏 (Minimalist Industrial Single-Row Toolbar)
          ========================================================================= */}
      <header className="shrink-0 h-12 bg-white/95 backdrop-blur-xl border-b border-neutral-200/90 px-3 sm:px-4 flex items-center justify-between z-30 shadow-xs">
        {/* 左侧：返回与主标题 */}
        <div className="flex items-center space-x-2.5 min-w-0">
          {onBackToMenu && (
            <button
              type="button"
              onClick={onBackToMenu}
              className="w-8 h-8 rounded-lg hover:bg-neutral-100 active:bg-neutral-200 text-neutral-700 flex items-center justify-center transition cursor-pointer shrink-0 shadow-2xs border border-neutral-200/70"
              title="返回点单菜单"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight flex items-center gap-1.5">
              <span>消息</span>
              {totalUnread > 0 && (
                <span className="inline-flex items-center justify-center text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white leading-none shrink-0 shadow-2xs">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </h1>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full leading-none shrink-0 hidden xs:inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>专送GPS直连</span>
            </span>
          </div>
        </div>

        {/* 右侧：单排操作快捷键 (刷新与标记已读) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            className="h-8 px-2.5 rounded-lg border border-neutral-200/90 bg-white hover:bg-neutral-50 text-neutral-600 text-xs font-medium flex items-center gap-1 shadow-2xs transition cursor-pointer"
            title="刷新会话动态"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">刷新</span>
          </button>
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="h-8 px-2.5 rounded-lg border border-neutral-200/90 bg-white hover:bg-neutral-50 text-neutral-600 text-xs font-medium flex items-center gap-1 shadow-2xs transition cursor-pointer"
            title="全部标为已读"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">已读</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. 美化搜索输入框 + 下拉式小型树状筛选器 (Search & Tree Filter Row)
          ========================================================================= */}
      <div className="shrink-0 px-3 sm:px-4 py-2.5 bg-white/95 backdrop-blur-md border-b border-neutral-200/90 flex items-center gap-2.5 relative z-40 shadow-xs">
        {/* 高度美化的搜索输入框：纯白底质、细腻微渐变边框、微拟态软阴影、高质感墨绿聚焦环 */}
        <div className="relative flex-1 flex items-center h-8.5 px-3 bg-neutral-50/90 hover:bg-neutral-50 focus-within:bg-white border border-neutral-200/90 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/15 transition-all duration-200 rounded-lg group shadow-2xs min-w-0">
          <Search className="w-3.5 h-3.5 text-neutral-400 group-focus-within:text-emerald-600 transition-colors mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索餐车名、单号、菜品或聊天内容..."
            className="w-full bg-transparent border-none outline-hidden text-neutral-900 placeholder:text-neutral-400 text-xs font-sans font-medium min-w-0"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition cursor-pointer shrink-0"
              title="清空搜索"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <span className="hidden sm:inline-flex text-[10px] font-semibold text-neutral-400 bg-neutral-200/60 border border-neutral-200/80 px-1.5 py-0.5 rounded-md leading-none shrink-0 shadow-3xs">
              ⌘K
            </span>
          )}
        </div>

        {/* 下拉式小型树状筛选器 (Dropdown Small Tree Filter) */}
        <div className="relative shrink-0" ref={treeDropdownRef}>
          <button
            type="button"
            onClick={() => {
              safeVibrate(12);
              setShowTreeDropdown(!showTreeDropdown);
            }}
            className={`h-8.5 px-3 flex items-center gap-1.5 text-xs font-bold transition-all duration-150 cursor-pointer border rounded-lg shadow-2xs ${
              selectedTreeNode.category !== 'all'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-500 ring-1.5 ring-emerald-500/15'
                : 'bg-white text-neutral-700 border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
            title="点击展开下拉式树状筛选器"
          >
            <FolderTree className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span className="max-w-[70px] xs:max-w-[95px] sm:max-w-[130px] truncate text-left">
              {selectedTreeNode.label}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 shrink-0 ${
                showTreeDropdown ? 'rotate-180 text-emerald-600' : ''
              }`}
            />
          </button>

          {/* 树状筛选弹出面板 (Tree Filter Popover - 采用规范圆角 rounded-xl) */}
          {showTreeDropdown && (
            <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white/98 backdrop-blur-xl border border-neutral-200/90 shadow-xl shadow-neutral-950/10 z-50 p-2 text-xs rounded-xl animate-in fade-in slide-in-from-top-1 duration-150">
              {/* 树状筛选器顶栏 */}
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-100 text-neutral-700">
                <div className="font-bold flex items-center gap-1 text-[11.5px]">
                  <FolderTree className="w-3.5 h-3.5 text-emerald-600" />
                  <span>层级树状筛选器</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetTreeFilter}
                  className="flex items-center gap-1 text-[10.5px] font-medium text-neutral-500 hover:text-emerald-700 hover:bg-neutral-50 px-2 py-0.5 rounded-lg transition cursor-pointer"
                  title="重置为全部维度"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重置全部</span>
                </button>
              </div>

              {/* 树状层级容器 */}
              <div className="space-y-1.5 max-h-[290px] overflow-y-auto pr-0.5 select-none text-[11px]">
                {/* 根节点 0: 全部维度 */}
                <div
                  onClick={() =>
                    handleSelectTreeNode({
                      category: 'all',
                      value: 'all',
                      label: '全部维度'
                    })
                  }
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition border border-transparent ${
                    selectedTreeNode.category === 'all'
                      ? 'bg-emerald-50 text-emerald-800 font-bold border-emerald-300/80'
                      : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-neutral-500" />
                    <span>全部餐车与订单会话 (All)</span>
                  </div>
                  {selectedTreeNode.category === 'all' && (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>

                {/* 根节点 1：流动餐车站台 (按驻点过滤) */}
                <div className="space-y-0.5">
                  <div
                    onClick={(e) => handleToggleTreeNode('tree-trucks', e)}
                    className="flex items-center justify-between px-2.5 py-1 bg-neutral-50/80 text-neutral-800 font-bold cursor-pointer hover:bg-neutral-100 transition rounded-lg"
                  >
                    <div className="flex items-center gap-1.5">
                      {expandedTreeNodes['tree-trucks'] ? (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                      {expandedTreeNodes['tree-trucks'] ? (
                        <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      <span>驻点流动餐车 (按餐车)</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-normal">
                      {allTrucks.length}辆
                    </span>
                  </div>

                  {expandedTreeNodes['tree-trucks'] && (
                    <div className="ml-3 pl-2.5 border-l-2 border-neutral-200/80 space-y-0.5 py-0.5">
                      {allTrucks.map((trk) => {
                        const isSelected =
                          selectedTreeNode.category === 'truck' &&
                          selectedTreeNode.value === trk.id;
                        return (
                          <div
                            key={trk.id}
                            onClick={() =>
                              handleSelectTreeNode({
                                category: 'truck',
                                value: trk.id,
                                label: `${trk.name.replace('黑曜石', '')}·${trk.locationName}`
                              })
                            }
                            className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer transition border border-transparent ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-800 font-bold border-emerald-300/80'
                                : 'hover:bg-neutral-50 text-neutral-600'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Truck className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span className="truncate">{trk.name} · {trk.locationName}</span>
                            </div>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 根节点 2：履约工况状态 (按状态过滤) */}
                <div className="space-y-0.5">
                  <div
                    onClick={(e) => handleToggleTreeNode('tree-status', e)}
                    className="flex items-center justify-between px-2.5 py-1 bg-neutral-50/80 text-neutral-800 font-bold cursor-pointer hover:bg-neutral-100 transition rounded-lg"
                  >
                    <div className="flex items-center gap-1.5">
                      {expandedTreeNodes['tree-status'] ? (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                      {expandedTreeNodes['tree-status'] ? (
                        <FolderOpen className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      <span>履约工况状态 (按状态)</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-normal">
                      4类
                    </span>
                  </div>

                  {expandedTreeNodes['tree-status'] && (
                    <div className="ml-3 pl-2.5 border-l-2 border-neutral-200/80 space-y-0.5 py-0.5">
                      {[
                        { value: 'cooking', label: '现烤制作中 (Preparing)', icon: Flame },
                        { value: 'delivering', label: '专送骑手配送中 (Delivering)', icon: Zap },
                        { value: 'ready', label: '待自提/就餐 (Ready)', icon: Clock },
                        { value: 'completed', label: '订单已履约送达 (Completed)', icon: ShieldCheck }
                      ].map((st) => {
                        const isSelected =
                          selectedTreeNode.category === 'status' &&
                          selectedTreeNode.value === st.value;
                        const Icon = st.icon;
                        return (
                          <div
                            key={st.value}
                            onClick={() =>
                              handleSelectTreeNode({
                                category: 'status',
                                value: st.value,
                                label: st.label.split(' ')[0]
                              })
                            }
                            className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer transition border border-transparent ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-800 font-bold border-emerald-300/80'
                                : 'hover:bg-neutral-50 text-neutral-600'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Icon className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span className="truncate">{st.label}</span>
                            </div>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 根节点 3：协同通信通道 (按业务信道过滤) */}
                <div className="space-y-0.5">
                  <div
                    onClick={(e) => handleToggleTreeNode('tree-channels', e)}
                    className="flex items-center justify-between px-2.5 py-1 bg-neutral-50/80 text-neutral-800 font-bold cursor-pointer hover:bg-neutral-100 transition rounded-lg"
                  >
                    <div className="flex items-center gap-1.5">
                      {expandedTreeNodes['tree-channels'] ? (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                      {expandedTreeNodes['tree-channels'] ? (
                        <FolderOpen className="w-3.5 h-3.5 text-purple-500" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-purple-500" />
                      )}
                      <span>协同业务信道 (按信道)</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-normal">
                      3种
                    </span>
                  </div>

                  {expandedTreeNodes['tree-channels'] && (
                    <div className="ml-3 pl-2.5 border-l-2 border-neutral-200/80 space-y-0.5 py-0.5">
                      {[
                        { value: 'orders', label: '订单专线联络室', icon: Zap },
                        { value: 'community', label: '餐车老饕车友群', icon: Users },
                        { value: 'fleet', label: '车队指挥调度大群', icon: Radio }
                      ].map((ch) => {
                        const isSelected =
                          selectedTreeNode.category === 'channel' &&
                          selectedTreeNode.value === ch.value;
                        const Icon = ch.icon;
                        return (
                          <div
                            key={ch.value}
                            onClick={() =>
                              handleSelectTreeNode({
                                category: 'channel',
                                value: ch.value,
                                label: ch.label
                              })
                            }
                            className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer transition border border-transparent ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-800 font-bold border-emerald-300/80'
                                : 'hover:bg-neutral-50 text-neutral-600'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Icon className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span className="truncate">{ch.label}</span>
                            </div>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 若当前树状筛选器激活，展示轻量提示微标 */}
      {selectedTreeNode.category !== 'all' && (
        <div className="shrink-0 px-3 sm:px-4 py-1 bg-emerald-50/70 border-b border-emerald-200/60 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-1.5 truncate">
            <FolderTree className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold truncate">
              当前树状筛选：<span className="font-bold underline">{selectedTreeNode.label}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetTreeFilter}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-950 flex items-center gap-0.5 cursor-pointer shrink-0 ml-2"
          >
            <span>清除</span>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* =========================================================================
          3. 极简分类筛选条 (Capsule Pills - 宽高严格根据内容自适应自伸缩)
          ========================================================================= */}
      <div className="shrink-0 px-3 sm:px-4 py-2 bg-white/95 backdrop-blur-sm border-b border-neutral-200/70 overflow-x-auto scrollbar-none flex items-center gap-2">
        {/* 全部消息 */}
        <button
          type="button"
          onClick={() => {
            safeVibrate(10);
            setActiveTab('all');
          }}
          className={`w-auto shrink-0 h-auto min-h-[32px] py-1 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer shadow-2xs border ${
            activeTab === 'all'
              ? 'bg-white border-emerald-600 text-emerald-700 ring-1.5 ring-emerald-600/15'
              : 'bg-white text-neutral-600 border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900'
          }`}
        >
          <Truck className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'all' ? 'text-emerald-700' : 'text-neutral-400'}`} />
          <span>全部消息</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 leading-none shrink-0">
            {orderSessions.length + 4}
          </span>
        </button>

        {/* 订单专线 */}
        <button
          type="button"
          onClick={() => {
            safeVibrate(10);
            setActiveTab('orders');
          }}
          className={`w-auto shrink-0 h-auto min-h-[32px] py-1 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer shadow-2xs border ${
            activeTab === 'orders'
              ? 'bg-white border-amber-500 text-amber-600 ring-1.5 ring-amber-500/15'
              : 'bg-white text-neutral-600 border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'orders' ? 'text-amber-600' : 'text-neutral-400'}`} />
          <span>订单专线</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 leading-none shrink-0">
            {orderSessions.length}
          </span>
        </button>

        {/* 餐车社群 */}
        <button
          type="button"
          onClick={() => {
            safeVibrate(10);
            setActiveTab('community');
          }}
          className={`w-auto shrink-0 h-auto min-h-[32px] py-1 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer shadow-2xs border ${
            activeTab === 'community'
              ? 'bg-white border-rose-500 text-rose-600 ring-1.5 ring-rose-500/15'
              : 'bg-white text-neutral-600 border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900'
          }`}
        >
          <Users className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'community' ? 'text-rose-600' : 'text-neutral-400'}`} />
          <span>餐车老饕群</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200/60 leading-none shrink-0">
            3
          </span>
        </button>

        {/* 车队调度 */}
        <button
          type="button"
          onClick={() => {
            safeVibrate(10);
            setActiveTab('fleet');
          }}
          className={`w-auto shrink-0 h-auto min-h-[32px] py-1 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer shadow-2xs border ${
            activeTab === 'fleet'
              ? 'bg-white border-purple-500 text-purple-600 ring-1.5 ring-purple-500/15'
              : 'bg-white text-neutral-600 border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'fleet' ? 'text-purple-600' : 'text-neutral-400'}`} />
          <span>车队调度</span>
        </button>
      </div>

      {/* =========================================================================
          4. 消息会话表单流 (Form-Based Session List)
          - 卡片最外边框取消圆角间距 (rounded-none, 紧密连续排布)
          - 大卡片之间使用线条分线隔开 (border-b / divide-y 分隔线)
          - 第三段：金额与状况按钮严格设置为右对齐 (items-end text-right)
          - 内部保留头像与徽标微圆角与自适应字号防溢出
          ========================================================================= */}
      <main className="flex-1 min-h-0 overflow-y-auto max-w-4xl mx-auto w-full bg-white divide-y divide-neutral-200/80 border-b border-neutral-200/80">
        {/* 4.1 订单专线卡片流 */}
        {filteredOrderSessions.map((session) => {
          const { order, cleanNo, truck, lastMsgSnippet, lastMsgTime, unread, totalAmount } = session;
          const isExpanded = !!expandedOrders[cleanNo];
          const avatarUrl =
            truck.logo ||
            truck.image ||
            'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=200&h=200&fit=crop';

          // 状态标签语义化配色与图标映射
          const statusMeta = getOrderStatusBadgeMeta(order.status, order.statusText);
          const StatusIcon = statusMeta.icon;

          const totalDishCount = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);

          return (
            <div
              key={cleanNo}
              className={`bg-white rounded-none hover:bg-neutral-50/70 transition-colors px-3 sm:px-4 py-3 space-y-2.5 w-full min-w-0 relative ${
                openTruckPopoverOrderNo === cleanNo ? 'z-40' : 'z-10'
              }`}
            >
              {/* ================= 核心三段式主网格行 ================= */}
              <div
                className="grid grid-cols-[48px_minmax(0,1fr)_auto] sm:grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-2.5 sm:gap-3.5 cursor-pointer group w-full min-w-0"
                onClick={() => {
                  safeVibrate(15);
                  onOpenOrderChat(cleanNo);
                }}
              >
                {/* ─────────────────────────────────────────────────────────────
                    【段落 1】左侧第一位：餐车专属头像 (Avatar)
                    ───────────────────────────────────────────────────────────── */}
                <div className="justify-self-start relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 overflow-hidden rounded-xl border border-neutral-200/90 bg-neutral-100 shadow-2xs">
                  <img
                    src={avatarUrl}
                    alt={truck.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=200&h=200&fit=crop';
                    }}
                  />

                  {/* 微信样式未读小红标 */}
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ring-1.5 ring-white leading-none shadow-xs">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}

                  {/* 在线指示灯 */}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full animate-pulse" />
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    【段落 2】中间主容器：依次严格左对齐 (Sequential Left-Aligned)，
                    各行元素严格网格约束，文本自适应缩放防溢出
                    - 上部：餐车名称与下拉隐藏收纳弹窗微组件
                    - 下部：订单号与状态徽标
                    - 最底部：最后一条消息记录与时间
                    ───────────────────────────────────────────────────────────── */}
                <div className="justify-self-stretch min-w-0 w-full overflow-visible flex flex-col items-start justify-center gap-1 text-left">
                  {/* 上部：餐车名称与下拉隐藏收纳弹窗微组件 (仅展示餐车名称，地址与就餐桌位收纳至下拉弹窗，杜绝长地址挤压截断) */}
                  <div className="w-full min-w-0 flex items-center justify-start gap-1 text-left relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        safeVibrate(12);
                        setOpenTruckPopoverOrderNo(prev => prev === cleanNo ? null : cleanNo);
                      }}
                      className="group/truck inline-flex items-center gap-1.5 text-left cursor-pointer select-none rounded-lg hover:bg-neutral-100/80 px-1 -ml-1 py-0.5 transition max-w-full"
                      title="点击展开收纳的餐车驻点、就餐桌位与订单详情"
                    >
                      <span
                        className={`font-bold text-neutral-900 group-hover/truck:text-emerald-700 transition-colors truncate block text-left ${getAdaptiveTitleSize(
                          truck.name || order.truckName || ''
                        )}`}
                      >
                        {truck.name || order.truckName || '黑曜石流动餐车'}
                      </span>
                      <span className="w-4 h-4 rounded-full bg-neutral-100 group-hover/truck:bg-emerald-100 text-neutral-500 group-hover/truck:text-emerald-700 flex items-center justify-center shrink-0 transition-colors">
                        <ChevronDown
                          className={`w-3 h-3 transition-transform duration-200 ${
                            openTruckPopoverOrderNo === cleanNo ? 'rotate-180 text-emerald-700' : ''
                          }`}
                        />
                      </span>
                    </button>

                    {/* 下拉弹窗收纳小组件 (收纳餐车地址、餐桌名称、并提供跳转订单过渡按钮) */}
                    <AnimatePresence>
                      {openTruckPopoverOrderNo === cleanNo && (
                        <>
                          {/* 全局透明遮罩拦截外部点击 */}
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenTruckPopoverOrderNo(null);
                            }}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 top-full mt-1.5 z-50 w-[280px] sm:w-[320px] rounded-xl backdrop-blur-xl bg-white/95 border border-neutral-200/90 shadow-xl shadow-neutral-950/10 p-3 space-y-2.5 text-left select-none"
                          >
                            {/* 顶栏：餐车名称与在线状态 */}
                            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-150">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {truck.logo ? (
                                  <div className="w-4 h-4 rounded-xs overflow-hidden border border-emerald-500/60 shrink-0">
                                    <img src={truck.logo} alt="Logo" className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                )}
                                <span className="font-bold text-xs text-neutral-900 truncate">
                                  {truck.name || order.truckName || '流动餐车'}
                                </span>
                              </div>
                              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0 leading-none">
                                营业履约中
                              </span>
                            </div>

                            {/* 收纳信息卡片：餐车地址 + 就餐餐桌名称 */}
                            <div className="bg-neutral-50/90 rounded-lg p-2.5 border border-neutral-100 space-y-2">
                              {/* 餐车停靠站台地址 */}
                              <div className="flex items-start gap-2 text-[11px] text-neutral-600">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-semibold text-neutral-400">餐车站台驻点 / 配送发货地</div>
                                  <div className="font-medium text-neutral-800 break-all leading-snug">
                                    {truck.locationName || order.truckAddress || '西藏北路曲阜路交叉口 · 大悦城南广场'}
                                  </div>
                                </div>
                              </div>

                              {/* 就餐餐桌 / 配送目的地 (把餐桌名称收纳在此) */}
                              <div className="flex items-start gap-2 text-[11px] text-neutral-600 pt-1.5 border-t border-neutral-200/60">
                                <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-semibold text-neutral-400">就餐桌位 / 配送地址</div>
                                  <div className="font-bold text-neutral-900 flex items-center gap-1.5 flex-wrap">
                                    <span>
                                      {order.diningMode === 'dine_in' || (order as any).tableCode
                                        ? `堂食桌位：${(order as any).tableCode || 'A1 号桌 (中庭就餐区)'}`
                                        : (order.deliveryAddress || '自提外带站台')}
                                    </span>
                                    {order.diningMode === 'dine_in' && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80">
                                        同桌多人点餐
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 跳转订单的过渡按钮 (A transition button to jump to order) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                safeVibrate(15);
                                setOpenTruckPopoverOrderNo(null);
                                if (onTrackOrder) {
                                  onTrackOrder(cleanNo);
                                }
                              }}
                              className="w-full h-8.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold flex items-center justify-between shadow-xs transition-all cursor-pointer"
                            >
                              <span className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                <span>查看该订单详情与履约工况</span>
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 opacity-90 shrink-0" />
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 下部：订单号与履约状态 (配置专属状态图标，点击直接下拉展开详情) */}
                  <div className="w-full min-w-0 flex items-center justify-start gap-1.5 overflow-hidden text-left flex-wrap">
                    <span
                      className={`font-semibold text-neutral-600 shrink-0 text-left ${getAdaptiveSubSize(
                        cleanNo
                      )}`}
                    >
                      单号 #{cleanNo}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleExpand(cleanNo);
                      }}
                      className={`font-bold px-2.5 py-0.5 rounded-full leading-none shrink-0 border text-left cursor-pointer transition hover:opacity-85 whitespace-nowrap shadow-2xs ${statusMeta.badgeClass} text-[11px] inline-flex items-center gap-1`}
                      title={isExpanded ? '点击收起详情' : '点击下拉展开详情'}
                    >
                      <StatusIcon className={`w-3 h-3 shrink-0 ${statusMeta.iconClass}`} />
                      <span>{statusMeta.label}</span>
                    </button>
                  </div>

                  {/* 最底部：最后一条消息记录 (Sequential Left-Aligned, 自适应字号防溢出) */}
                  <div className="w-full min-w-0 flex items-center justify-start gap-1 overflow-hidden text-left text-neutral-500">
                    <span
                      className={`min-w-0 max-w-full truncate flex-1 text-left leading-tight text-neutral-500 ${getAdaptiveSnippetSize(
                        lastMsgSnippet
                      )}`}
                      title={lastMsgSnippet}
                    >
                      {lastMsgSnippet}
                    </span>
                    <span className="text-[10px] text-neutral-400 shrink-0 ml-1 text-left whitespace-nowrap">
                      {lastMsgTime}
                    </span>
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    【段落 3】再右侧：金额与下拉展开详情按钮 (严格右对齐)
                    - 订单金额：右对齐
                    - 下拉折叠展开按钮：明确标注文案“展开详情”与“收起详情”，严格右对齐
                    ───────────────────────────────────────────────────────────── */}
                <div className="justify-self-end flex flex-col items-end justify-center gap-1.5 pl-2 min-w-[76px] sm:min-w-[96px] text-right">
                  {/* 订单金额 (Space Grotesk, 严格右对齐) */}
                  <span
                    className={`font-bold text-neutral-950 tracking-tight leading-none text-right block truncate max-w-full ${
                      totalAmount >= 1000 ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                    }`}
                  >
                    ¥{totalAmount.toFixed(1)}
                  </span>

                  {/* 点击折叠展开下拉组件按钮 (明确显示“展开详情”与“收起详情”) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleExpand(cleanNo);
                    }}
                    className={`h-6 px-2.5 border text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-all cursor-pointer rounded-full shrink-0 ${
                      isExpanded
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1.5 ring-emerald-500/15 font-bold'
                        : 'border-neutral-200/90 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900'
                    }`}
                    title={isExpanded ? '收起订单状况与已购菜品' : '下拉展开查看订单状况与已购菜品'}
                  >
                    <span className="whitespace-nowrap">{isExpanded ? '收起详情' : '展开详情'}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                        isExpanded ? 'rotate-180 text-emerald-600' : 'text-neutral-400'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* =========================================================================
                  【下拉展开组件】工控网格美学设计
                  显示当前聊天的页面的订单状况与所购菜品明细，网格约束杜绝溢出
                  ========================================================================= */}
              {isExpanded && (
                <div className="mt-2 pt-2.5 border-t border-neutral-150 space-y-2.5 animate-in fade-in duration-150">
                  {/* 1. 实时订单状况工控面板 (3列网格化，纯左对齐，rounded-xl) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-neutral-50/90 p-2.5 border border-neutral-200/90 rounded-xl text-xs shadow-2xs">
                    <div className="flex flex-col items-start justify-center gap-0.5 min-w-0 overflow-hidden text-left">
                      <span className="text-neutral-400 text-[10.5px]">履约状况</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span className="font-bold text-neutral-900 truncate">
                          {order.statusText || '后厨现制中'}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                          65℃
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start justify-center gap-0.5 min-w-0 overflow-hidden text-left">
                      <span className="text-neutral-400 text-[10.5px]">就餐/专送目的地</span>
                      <span className="font-medium text-neutral-800 truncate max-w-full text-left">
                        {order.deliveryAddress || `${truck.locationName} · 自提`}
                      </span>
                    </div>

                    <div className="flex flex-col items-start justify-center gap-0.5 min-w-0 overflow-hidden text-left">
                      <span className="text-neutral-400 text-[10.5px]">服务与时效</span>
                      <span className="font-medium text-neutral-700 truncate max-w-full text-left">
                        {order.courierName ? `骑手：${order.courierName}` : '餐车主厨直供'} · 约 {order.etaMinutes || 8} 分钟
                      </span>
                    </div>
                  </div>

                  {/* 2. 当前所购买的订单菜品清单 (展示后厨现制、出餐上桌进度) */}
                  <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs p-2.5 space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100 text-xs">
                      <span className="font-bold text-neutral-900 flex items-center gap-1">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-neutral-500" />
                        <span>已购菜品明细与制作工况</span>
                      </span>
                      <span className="text-[10.5px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                        共 {totalDishCount} 件
                      </span>
                    </div>

                    {/* 菜品明细行：包含后厨现制与已上桌状态标签 */}
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                      {order.items.map((item, idx) => {
                        const dishImg =
                          item.imageUrl ||
                          matchDishImageUrl(item.name) ||
                          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=120&h=120&fit=crop';
                        const itemSubtotal = Number(item.price || 0) * Number(item.quantity || 1);
                        const isServed = item.serveStatus === 'served';

                        return (
                          <div
                            key={`${item.name}-${idx}`}
                            className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 p-1.5 rounded-lg hover:bg-neutral-50/90 transition border-b border-neutral-100 last:border-b-0 min-w-0 overflow-hidden"
                          >
                            <img
                              src={dishImg}
                              alt={item.name}
                              className="w-10 h-10 rounded-lg object-cover border border-neutral-200 shrink-0 bg-neutral-100"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=120&h=120&fit=crop';
                              }}
                            />
                            <div className="min-w-0 overflow-hidden flex flex-col items-start justify-center text-left gap-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`font-bold text-neutral-900 truncate text-left ${getAdaptiveTitleSize(
                                    item.name
                                  )}`}
                                >
                                  {item.name}
                                </span>
                                {/* 后厨现制 / 堂食出餐上桌状态徽标 (配置专属图标与语义化微标) */}
                                {isServed ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 whitespace-nowrap inline-flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                                    <span>已上桌</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0 whitespace-nowrap inline-flex items-center gap-1">
                                    <Flame className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                                    <span>餐品制作中</span>
                                  </span>
                                )}
                                {item.station && (
                                  <span className="text-[9.5px] font-medium px-1.5 py-0.2 rounded-md bg-neutral-100 text-neutral-600 border border-neutral-200/60 shrink-0 whitespace-nowrap">
                                    {item.station}
                                  </span>
                                )}
                              </div>
                              {item.options && (
                                <div className="text-[10px] text-neutral-500 truncate max-w-full text-left">
                                  {item.options}
                                </div>
                              )}
                            </div>
                            <div className="shrink-0 text-right flex flex-col items-end justify-center">
                              <div className="text-xs font-bold text-neutral-900 whitespace-nowrap">
                                ¥{itemSubtotal.toFixed(1)}
                              </div>
                              <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded-md leading-none">
                                x{item.quantity}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 费用小计行 */}
                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs font-medium text-neutral-600">
                      <span>恒温打包与专送服务</span>
                      <span className="font-bold text-neutral-900">
                        实付：<span className="text-emerald-700 text-sm">¥{totalAmount.toFixed(1)}</span>
                      </span>
                    </div>
                  </div>

                  {/* 3. 快捷联动操作条 (恢复 rounded-full 胶囊按钮) */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {onTrackOrder && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          safeVibrate(12);
                          onTrackOrder(cleanNo);
                        }}
                        className="h-8 px-3 rounded-full border border-emerald-300/90 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>GPS轨迹</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={quickConsultBusy === cleanNo}
                      onClick={(e) => handleQuickConsult(cleanNo, truck.name, e)}
                      className="h-8 px-3 rounded-full border border-amber-300/90 bg-white hover:bg-amber-50 text-amber-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{quickConsultBusy === cleanNo ? '已催单...' : '催单对讲'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        safeVibrate(15);
                        onOpenOrderChat(cleanNo);
                      }}
                      className="h-8 px-3.5 rounded-full bg-white hover:bg-neutral-50 text-emerald-700 border border-emerald-600 ring-1.5 ring-emerald-600/15 text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>进入联络室</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 4.2 餐车老饕群入口 (使用线条分线隔开，右侧右对齐) */}
        {showCommunity && (
          <div className="bg-white">
            <div className="px-3 sm:px-4 py-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider text-left bg-neutral-50/80 border-y border-neutral-100">
              餐车老饕车友群
            </div>
            {communitySessions.map((comm) => (
              <div
                key={comm.id}
                onClick={() => {
                  safeVibrate(15);
                  onOpenCommunityChat(comm.id);
                }}
                className="bg-white rounded-none border-b border-neutral-200/80 hover:bg-neutral-50/70 transition-colors px-3 sm:px-4 py-3 grid grid-cols-[48px_minmax(0,1fr)_auto] sm:grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-2.5 sm:gap-3.5 cursor-pointer group w-full min-w-0"
              >
                {/* 左段：社群头像 (rounded-xl) */}
                <div className="justify-self-start relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 overflow-hidden rounded-xl border border-neutral-200/90 bg-neutral-100 shadow-2xs">
                  <img
                    src={comm.truck.logo || comm.truck.image}
                    alt={comm.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=200&h=200&fit=crop';
                    }}
                  />
                  {comm.unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ring-1.5 ring-white leading-none shadow-xs">
                      {comm.unread}
                    </span>
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-teal-500 border border-white rounded-full animate-pulse" />
                </div>

                {/* 中段：群名称、副标题与最新发言 (依次左对齐) */}
                <div className="justify-self-stretch min-w-0 w-full overflow-hidden flex flex-col items-start justify-center gap-1 text-left">
                  <div className="w-full min-w-0 flex items-center justify-start gap-1.5 overflow-hidden text-left">
                    <span
                      className={`font-bold text-neutral-900 group-hover:text-rose-600 transition-colors truncate max-w-full text-left ${getAdaptiveTitleSize(
                        comm.name
                      )}`}
                    >
                      {comm.name}
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full shrink-0 leading-none">
                      老饕专属
                    </span>
                  </div>
                  <div className="w-full min-w-0 text-xs text-neutral-500 truncate text-left">
                    {comm.subtitle}
                  </div>
                  <div className="w-full min-w-0 flex items-center justify-start gap-1 text-xs text-neutral-500 overflow-hidden text-left">
                    <span
                      className={`min-w-0 max-w-full truncate flex-1 text-left ${getAdaptiveSnippetSize(
                        comm.lastMsgSnippet
                      )}`}
                    >
                      {comm.lastMsgSnippet}
                    </span>
                    <span className="text-[10px] text-neutral-400 shrink-0 ml-1 text-left whitespace-nowrap">
                      {comm.lastMsgTime}
                    </span>
                  </div>
                </div>

                {/* 右段：进入群聊按钮 (严格右对齐) */}
                <div className="justify-self-end flex flex-col items-end justify-center pl-2 min-w-[76px] sm:min-w-[96px] text-right">
                  <button
                    type="button"
                    className="h-7 px-3 rounded-full border border-neutral-200/90 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold shadow-2xs transition"
                  >
                    进入群聊
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4.3 车队调度指挥大群入口 (使用线条分线隔开，右侧右对齐) */}
        {showFleet && (
          <div className="bg-white">
            <div className="px-3 sm:px-4 py-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider text-left bg-neutral-50/80 border-y border-neutral-100">
              车队调度指挥专网
            </div>
            <div
              onClick={() => {
                safeVibrate(15);
                onOpenFleetChat();
              }}
              className="bg-white rounded-none border-b border-neutral-200/80 hover:bg-neutral-50/70 transition-colors px-3 sm:px-4 py-3 grid grid-cols-[48px_minmax(0,1fr)_auto] sm:grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-2.5 sm:gap-3.5 cursor-pointer group w-full min-w-0"
            >
              <div className="justify-self-start relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-purple-50 border border-purple-200/80 shadow-2xs flex items-center justify-center text-purple-700 group-hover:scale-105 transition-transform">
                <Radio className="w-6 h-6 stroke-[2]" />
                {fleetSession.unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ring-1.5 ring-white leading-none shadow-xs">
                    {fleetSession.unread}
                  </span>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-purple-500 border border-white rounded-full animate-pulse" />
              </div>

              <div className="justify-self-stretch min-w-0 w-full overflow-hidden flex flex-col items-start justify-center gap-1 text-left">
                <div className="w-full min-w-0 flex items-center justify-start gap-1.5 overflow-hidden text-left">
                  <span
                    className={`font-bold text-neutral-900 group-hover:text-purple-600 transition-colors truncate max-w-full text-left ${getAdaptiveTitleSize(
                      fleetSession.name
                    )}`}
                  >
                    {fleetSession.name}
                  </span>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full shrink-0 leading-none">
                    车队对讲
                  </span>
                </div>
                <div className="w-full min-w-0 text-xs text-neutral-500 truncate text-left">
                  {fleetSession.subtitle}
                </div>
                <div className="w-full min-w-0 flex items-center justify-start gap-1 text-xs text-neutral-500 overflow-hidden text-left">
                  <span
                    className={`min-w-0 max-w-full truncate flex-1 text-left ${getAdaptiveSnippetSize(
                      fleetSession.lastMsgSnippet
                    )}`}
                  >
                    {fleetSession.lastMsgSnippet}
                  </span>
                  <span className="text-[10.5px] text-neutral-400 shrink-0 ml-1 text-left whitespace-nowrap">
                    {fleetSession.lastMsgTime}
                  </span>
                </div>
              </div>

              <div className="justify-self-end flex flex-col items-end justify-center pl-2 min-w-[76px] sm:min-w-[96px] text-right">
                <button
                  type="button"
                  className="h-7 px-3 rounded-full border border-neutral-200/90 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold shadow-2xs transition"
                >
                  进入对讲
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4.4 空状态 */}
        {filteredOrderSessions.length === 0 && !showCommunity && !showFleet && (
          <div className="py-12 text-center text-neutral-400 text-xs space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-neutral-300 stroke-[1.5]" />
            <div>未检索到匹配的协同会话</div>
            {selectedTreeNode.category !== 'all' && (
              <button
                type="button"
                onClick={handleResetTreeFilter}
                className="inline-block mt-2 px-3.5 py-1.5 bg-white border border-neutral-200 text-neutral-700 font-bold hover:bg-neutral-50 rounded-full shadow-2xs"
              >
                清除当前树状筛选
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default WeChatMessageSessionsView;
