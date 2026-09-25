import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  Clock,
  CheckCircle2,
  X,
  UserPlus,
  Eye,
  Radio,
  MapPin,
  Crown,
  UserMinus,
  Lock,
  Unlock,
  QrCode,
  Copy,
  Check,
  AlertCircle,
  Shuffle
} from 'lucide-react';
import { useTableSessionUi } from './useTableSessionUi';
import { TableQuickSwitchWidget } from './TableQuickSwitchWidget';
import { reactiveSyncBus } from '../../utils/reactiveSyncBus';
import {
  TableSession,
  DiningParticipant,
  LinkRequest
} from '../../types/tableSession';
import {
  ParticipantSeed,
  getOpenSessionByTableCode,
  acquireFirstBind,
  finalizeFirstBind,
  requestLink,
  settleLinkRequest,
  removeParticipant,
  transferOwnership,
  setParticipantAuthority,
  updateParticipantCart,
  updateParticipantNode,
  getLinkRequests,
  closeSession
} from '../../utils/tableSessionEngine';
import { generateShortCode } from '../../utils/tableQrEngine';
import { generateQrCodeDataUrl } from '../../utils/qrCodeEngine';
import { getMemberAvatar } from '../../utils/tableAvatarHelper';

export interface DynamicTableMorphWidgetProps {
  currentTable?: string;
  onSwitchTable?: () => void;
  onSelectQuickTable?: (tableCode: string) => void;
  showToast?: (title: string, desc?: string) => void;
  diningMode?: string;
  isMerchantView?: boolean; // 商家端专属注入视角
}

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return '刚刚';
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 20000) return '刚刚';
  if (diff < 60000) return '半分钟前';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  return `${hours}小时前`;
}

const PRESET_TABLES = [
  { code: 'A1', label: 'A1 窗景席', guests: 2, zone: '外场窗边' },
  { code: 'A2', label: 'A2 双人座', guests: 2, zone: '外场中庭' },
  { code: 'A3', label: 'A3 四人桌', guests: 4, zone: '大厅中央' },
  { code: 'B1', label: 'B1 吧台席', guests: 1, zone: '餐车前吧' },
  { code: 'B2', label: 'B2 露天席', guests: 4, zone: '户外花园' },
  { code: 'C1', label: 'C1 聚会座', guests: 6, zone: '聚会卡座' }
];

export const DynamicTableMorphWidget: React.FC<DynamicTableMorphWidgetProps> = ({
  currentTable = 'A1',
  onSwitchTable,
  onSelectQuickTable,
  showToast,
  diningMode = 'dine_in',
  isMerchantView = false
}) => {
  const activeTableCode = (currentTable || 'A1').toUpperCase();
  const [isExpanded, setIsExpanded] = useState<boolean>(isMerchantView);
  const [embeddedTab, setEmbeddedTab] = useState<'status_flow' | 'auth_management'>('status_flow');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [inlineFeedback, setInlineFeedback] = useState<string | null>(null);

  // 下拉菜单收拢控制
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState<boolean>(false);
  const [actionsDropdownCoords, setActionsDropdownCoords] = useState<{ top: number; left: number } | null>(null);
  const actionsButtonRef = useRef<HTMLButtonElement | null>(null);

  const toggleActionsDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActionsDropdownOpen) {
      setIsActionsDropdownOpen(false);
    } else {
      if (actionsButtonRef.current) {
        const rect = actionsButtonRef.current.getBoundingClientRect();
        const menuWidth = 240;
        const left = Math.max(10, Math.min(rect.left, window.innerWidth - menuWidth - 10));
        setActionsDropdownCoords({
          top: rect.bottom + 6,
          left
        });
      }
      setIsActionsDropdownOpen(true);
    }
  };

  useEffect(() => {
    if (!isActionsDropdownOpen) return;
    const handleDismiss = () => setIsActionsDropdownOpen(false);
    window.addEventListener('scroll', handleDismiss, { passive: true });
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [isActionsDropdownOpen]);

  // 挂载真实 TableSessionUi 状态体系
  const { actions, myParticipant, identity, activeSession } = useTableSessionUi();

  // 本地同步维护当前桌号的真实 Session
  const [session, setSession] = useState<TableSession | null>(() => {
    if (activeSession && activeSession.tableCode.toUpperCase() === activeTableCode) {
      return activeSession;
    }
    return getOpenSessionByTableCode(activeTableCode) || null;
  });

  // 刷新当前桌台的真实 Session
  const refreshCurrentSession = useCallback(() => {
    const found = getOpenSessionByTableCode(activeTableCode);
    setSession(found || null);
  }, [activeTableCode]);

  // 自动开台保障：若当前处于堂食就餐模式且该桌尚未开台，真实开立有效会话
  useEffect(() => {
    if (diningMode === 'dine_in' && identity && !session) {
      const existing = getOpenSessionByTableCode(activeTableCode);
      if (!existing) {
        const acquired = acquireFirstBind({
          tableId: `tbl-${activeTableCode.toLowerCase()}`,
          tableCode: activeTableCode,
          seed: {
            participantId: identity.participantId,
            displayName: myParticipant?.displayName || '桌主 (顾客)',
            deviceFingerprint: identity.deviceFingerprint
          }
        });
        if (acquired.ok && acquired.value) {
          finalizeFirstBind(acquired.value.sessionId, 2, identity.participantId);
          refreshCurrentSession();
          actions.init();
        }
      } else {
        setSession(existing);
      }
    }
  }, [activeTableCode, diningMode, identity, session, myParticipant, actions, refreshCurrentSession]);

  // 监听全系统级真实 Session 突变与授权流转
  useEffect(() => {
    refreshCurrentSession();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'obsidian_table_sessions' || e.key === 'obsidian_table_link_requests') {
        refreshCurrentSession();
      }
    };

    const unsub1 = reactiveSyncBus.subscribe('TABLE_SESSION_MUTATED', () => refreshCurrentSession());
    const unsub2 = reactiveSyncBus.subscribe('TABLE_LINK_SETTLED', () => refreshCurrentSession());
    const unsub3 = reactiveSyncBus.subscribe('TABLE_LINK_REQUEST', () => refreshCurrentSession());
    const unsub4 = reactiveSyncBus.subscribe('PARTICIPANT_NODE_CHANGED', () => refreshCurrentSession());

    window.addEventListener('storage', handleStorage);
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      window.removeEventListener('storage', handleStorage);
    };
  }, [activeTableCode, refreshCurrentSession]);

  // 当外部 activeSession 变更时联动更新
  useEffect(() => {
    if (activeSession && activeSession.tableCode.toUpperCase() === activeTableCode) {
      setSession(activeSession);
    }
  }, [activeSession, activeTableCode]);

  // 获取当前桌台有效活跃参与者（真实数据）
  const activeParticipants = useMemo<DiningParticipant[]>(() => {
    if (!session || !session.participants) return [];
    return session.participants.filter((p) => !p.removedAt);
  }, [session]);

  // 真实计算整桌协同加购总览
  const tableTotalCartItems = useMemo(() => {
    return activeParticipants.reduce((sum, p) => sum + (p.cartSummary?.itemCount || 0), 0);
  }, [activeParticipants]);

  const tableTotalCartAmount = useMemo(() => {
    return activeParticipants.reduce((sum, p) => sum + (p.cartSummary?.totalAmount || 0), 0);
  }, [activeParticipants]);

  // 真实获取当前桌等待桌主审核的申请列表
  const pendingRequests = useMemo<LinkRequest[]>(() => {
    if (!session) return [];
    const all = getLinkRequests();
    return all.filter((r) => r.sessionId === session.sessionId && r.status === 'pending');
  }, [session]);

  // 判断当前用户是否拥有本桌管理权限（桌主或协管）
  const hasManageAuth = useMemo(() => {
    if (isMerchantView) return true;
    if (!session || !identity) return false;
    const me = session.participants.find(
      (p) => p.participantId === identity.participantId && !p.removedAt
    );
    return me?.role === 'owner' || me?.authority === 'manage';
  }, [isMerchantView, session, identity]);

  // 生成真实短码与二维码
  const shortCode = useMemo(() => {
    return generateShortCode(activeTableCode);
  }, [activeTableCode]);

  const handleOpenQrCode = async () => {
    const url = `${window.location.origin}/#table=${activeTableCode}&token=${session?.qrToken || 'active'}`;
    try {
      const dataUrl = await generateQrCodeDataUrl(url, { width: 260 });
      setQrDataUrl(dataUrl);
      setShowQrModal(true);
    } catch (e) {
      // ignore
    }
  };

  const handleCopyInviteText = () => {
    const text = `【Urban Radar 流动餐车】邀请您同桌就餐！桌号：${activeTableCode}，点餐口令：${shortCode}。扫码或输入口令即可实时协同加购。`;
    navigator.clipboard?.writeText(text);
    setCopiedCode(true);
    setInlineFeedback(`已复制 ${activeTableCode} 号桌同桌点餐邀请口令`);
    setTimeout(() => {
      setCopiedCode(false);
      setInlineFeedback(null);
    }, 2500);
  };

  // 真实审批通过申请人
  const handleApproveRequest = (req: LinkRequest) => {
    if (!session) return;
    const actorId = identity?.participantId || session.ownerParticipantId;
    const outcome = settleLinkRequest({
      requestId: req.requestId,
      decision: 'granted',
      actorId
    });

    if (outcome.ok) {
      reactiveSyncBus.publish('TABLE_LINK_SETTLED', {
        requestId: req.requestId,
        sessionId: session.sessionId,
        tableCode: activeTableCode,
        status: 'granted',
        at: new Date().toISOString()
      });
      reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
        sessionId: session.sessionId,
        tableCode: activeTableCode,
        change: 'participant_joined',
        actorId,
        participantId: req.requesterId,
        at: new Date().toISOString()
      });
      refreshCurrentSession();
      setInlineFeedback(`已批准 ${req.requesterName || '新食客'} 加入同桌点餐`);
      setTimeout(() => setInlineFeedback(null), 3000);
    }
  };

  // 真实拒绝申请人
  const handleRejectRequest = (req: LinkRequest) => {
    if (!session) return;
    const actorId = identity?.participantId || session.ownerParticipantId;
    const outcome = settleLinkRequest({
      requestId: req.requestId,
      decision: 'denied',
      actorId,
      reason: '桌主拒绝入座'
    });

    if (outcome.ok) {
      reactiveSyncBus.publish('TABLE_LINK_SETTLED', {
        requestId: req.requestId,
        sessionId: session.sessionId,
        tableCode: activeTableCode,
        status: 'denied',
        at: new Date().toISOString()
      });
      refreshCurrentSession();
      setInlineFeedback(`已拒绝该入座申请`);
      setTimeout(() => setInlineFeedback(null), 2500);
    }
  };

  // 真实快捷添加同桌食客加入（写入真实 tableSessionEngine）
  const handleAddRealCompanion = (guestName: string) => {
    if (!session) return;
    const guestSeed: ParticipantSeed = {
      participantId: `guest_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`,
      displayName: guestName,
      deviceFingerprint: `dev_fingerprint_${Math.floor(Math.random() * 10000)}`
    };

    const reqRes = requestLink({
      tableCode: activeTableCode,
      seed: guestSeed
    });

    if (reqRes.ok && reqRes.value) {
      const actorId = identity?.participantId || session.ownerParticipantId;
      settleLinkRequest({
        requestId: reqRes.value.requestId,
        decision: 'granted',
        actorId
      });
      reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
        sessionId: session.sessionId,
        tableCode: activeTableCode,
        change: 'participant_joined',
        actorId,
        participantId: guestSeed.participantId,
        at: new Date().toISOString()
      });
      refreshCurrentSession();
      setInlineFeedback(`同桌食客 ${guestName} 已成功入座并开启协同`);
      setTimeout(() => setInlineFeedback(null), 3000);
    }
  };

  // 真实测试协同加购：为指定成员写入真实的加购记录与状态节点
  const handleSimulateMemberCart = (participantId: string, memberName: string) => {
    if (!session) return;
    const dishes = [
      { id: 'dish-1', name: '炭烤和牛小汉堡双重奏', price: 63, cat: '主食' },
      { id: 'dish-2', name: '黑松露墨汁手工玉棋', price: 58, cat: '招牌热食' },
      { id: 'dish-3', name: '果木烟熏黑豚炙烤五花', price: 55, cat: '特色烧鸟' },
      { id: 'dish-4', name: '暗夜虚空冷萃浓缩咖啡', price: 32, cat: '特调饮品' },
      { id: 'dish-5', name: '黑曜石松露金黄脆薯', price: 28, cat: '小吃' },
      { id: 'dish-6', name: '火山熔岩黑芝麻舒芙蕾', price: 38, cat: '甜品' },
      { id: 'dish-7', name: '极夜西西里青柠微气泡', price: 26, cat: '特调饮品' },
      { id: 'dish-8', name: '炙烧极上黑椒牛舌饭', price: 52, cat: '主食' }
    ];
    const chosen = dishes[Math.floor(Math.random() * dishes.length)];
    const existing = session.participants.find((p) => p.participantId === participantId);
    const prevCount = existing?.cartSummary?.itemCount || 0;
    const prevAmount = existing?.cartSummary?.totalAmount || 0;

    const nextCount = prevCount + 1;
    const nextAmount = prevAmount + chosen.price;

    const prevItems = existing?.cartSummary?.items || [];
    const itemIndex = prevItems.findIndex((it) => it.dishId === chosen.id);
    let nextItems;
    if (itemIndex >= 0) {
      nextItems = prevItems.map((it, idx) =>
        idx === itemIndex ? { ...it, quantity: it.quantity + 1 } : it
      );
    } else {
      nextItems = [...prevItems, { dishId: chosen.id, dishName: chosen.name, quantity: 1, price: chosen.price }];
    }

    updateParticipantCart({
      sessionId: session.sessionId,
      participantId,
      cart: {
        itemCount: nextCount,
        totalAmount: nextAmount,
        updatedAt: new Date().toISOString(),
        items: nextItems
      }
    });

    updateParticipantNode({
      sessionId: session.sessionId,
      participantId,
      node: {
        categoryName: chosen.cat,
        lastClickedDishId: chosen.id,
        lastClickedDishName: chosen.name,
        at: new Date().toISOString()
      }
    });

    reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
      sessionId: session.sessionId,
      tableCode: activeTableCode,
      change: 'cart_updated',
      participantId,
      at: new Date().toISOString()
    });
    refreshCurrentSession();
    setInlineFeedback(`${memberName} 加购了「${chosen.name}」(¥${chosen.price})`);
    setTimeout(() => setInlineFeedback(null), 3000);
  };

  // 真实测试协同挑菜浏览：模拟该成员正在浏览某道菜品
  const handleSimulateMemberBrowsing = (participantId: string, memberName: string) => {
    if (!session) return;
    const dishes = [
      { id: 'dish-1', name: '炭烤和牛小汉堡双重奏', price: 63, cat: '主食' },
      { id: 'dish-2', name: '黑松露墨汁手工玉棋', price: 58, cat: '招牌热食' },
      { id: 'dish-3', name: '果木烟熏黑豚炙烤五花', price: 55, cat: '特色烧鸟' },
      { id: 'dish-4', name: '暗夜虚空冷萃浓缩咖啡', price: 32, cat: '特调饮品' },
      { id: 'dish-5', name: '黑曜石松露金黄脆薯', price: 28, cat: '小吃' },
      { id: 'dish-6', name: '火山熔岩黑芝麻舒芙蕾', price: 38, cat: '甜品' },
      { id: 'dish-7', name: '极夜西西里青柠微气泡', price: 26, cat: '特调饮品' },
      { id: 'dish-8', name: '炙烧极上黑椒牛舌饭', price: 52, cat: '主食' }
    ];
    const chosen = dishes[Math.floor(Math.random() * dishes.length)];

    updateParticipantNode({
      sessionId: session.sessionId,
      participantId,
      node: {
        categoryName: chosen.cat,
        lastClickedDishId: chosen.id,
        lastClickedDishName: chosen.name,
        at: new Date().toISOString()
      }
    });

    refreshCurrentSession();
    setInlineFeedback(`${memberName} 正在浏览挑选「${chosen.name}」`);
    setTimeout(() => setInlineFeedback(null), 3000);
  };

  // 真实移交桌主
  const handleTransferOwnership = (toParticipantId: string, targetName: string) => {
    if (!session || !identity) return;
    const outcome = transferOwnership({
      sessionId: session.sessionId,
      actorId: identity.participantId,
      toParticipantId
    });

    if (outcome.ok) {
      reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
        sessionId: session.sessionId,
        tableCode: activeTableCode,
        change: 'owner_transferred',
        actorId: identity.participantId,
        participantId: toParticipantId,
        at: new Date().toISOString()
      });
      refreshCurrentSession();
      setInlineFeedback(`已将 ${activeTableCode} 号桌桌主席位移交给 ${targetName}`);
      setTimeout(() => setInlineFeedback(null), 3000);
    }
  };

  // 真实权限变更
  const handleToggleAuthority = (targetId: string, currentAuth: string) => {
    if (!session || !identity) return;
    const nextAuth = currentAuth === 'manage' ? 'order_only' : 'manage';
    const outcome = setParticipantAuthority({
      sessionId: session.sessionId,
      actorId: identity.participantId,
      targetId,
      authority: nextAuth
    });

    if (outcome.ok) {
      reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
        sessionId: session.sessionId,
        tableCode: activeTableCode,
        change: 'authority_changed',
        actorId: identity.participantId,
        participantId: targetId,
        at: new Date().toISOString()
      });
      refreshCurrentSession();
      setInlineFeedback(`已变更就餐人点餐管理权限为：${nextAuth === 'manage' ? '协同管理' : '仅点单'}`);
      setTimeout(() => setInlineFeedback(null), 3000);
    }
  };

  // 真实移出成员
  const handleRemoveMember = (targetId: string, targetName: string) => {
    if (!session || !identity) return;
    const outcome = removeParticipant({
      sessionId: session.sessionId,
      actorId: identity.participantId,
      targetId,
      reason: '桌主移出同桌'
    });

    if (outcome.ok) {
      reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
        sessionId: session.sessionId,
        tableCode: activeTableCode,
        change: 'participant_removed',
        actorId: identity.participantId,
        participantId: targetId,
        at: new Date().toISOString()
      });
      refreshCurrentSession();
      setInlineFeedback(`已将 ${targetName} 从同桌点餐中解绑`);
      setTimeout(() => setInlineFeedback(null), 3000);
    }
  };

  // 商家重置本桌清台
  const handleMerchantResetSession = () => {
    if (!session) return;
    closeSession({
      sessionId: session.sessionId,
      closedBy: 'merchant'
    });
    reactiveSyncBus.publish('TABLE_SESSION_MUTATED', {
      sessionId: session.sessionId,
      tableCode: activeTableCode,
      change: 'closed',
      at: new Date().toISOString()
    });
    refreshCurrentSession();
    setInlineFeedback(`商家端已将 ${activeTableCode} 号桌完成清台`);
    setTimeout(() => setInlineFeedback(null), 3000);
  };

  // 仅在堂食模式下渲染
  if (diningMode !== 'dine_in') return null;

  return (
    <div className={`w-full max-w-4xl mx-auto ${isMerchantView ? 'px-0 my-3' : 'px-3.5 my-2'}`}>
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className={`relative rounded-2xl border transition-all ${
          isMerchantView
            ? 'border-emerald-300 bg-linear-to-r from-emerald-50/70 via-white to-neutral-50 shadow-xs'
            : 'border-neutral-200/90 bg-white/95 backdrop-blur-md shadow-xs'
        } ${isExpanded ? 'overflow-visible' : 'overflow-hidden'}`}
      >
        {/* 顶部标题条 */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50/80 transition-colors select-none"
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            {/* 呼吸绿点徽标 */}
            <div className="relative flex items-center justify-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="absolute w-4 h-4 rounded-full bg-emerald-400/40 animate-ping" />
            </div>

            {/* 桌号与同桌人数 */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0 flex-nowrap">
              {isMerchantView && (
                <span className="text-[9.5px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white shrink-0">
                  商家端·双向监管
                </span>
              )}
              <span className="font-extrabold text-xs sm:text-sm text-neutral-900 tracking-tight font-mono shrink-0">
                {activeTableCode} 号桌
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-300 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold text-orange-700 bg-orange-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-orange-200 flex items-center gap-1 shrink-0 whitespace-nowrap">
                <Users className="w-3 h-3" />
                {activeParticipants.length}人
              </span>
              <span className="hidden sm:inline-block text-xs text-neutral-500 truncate">
                {tableTotalCartItems > 0
                  ? `已选 ${tableTotalCartItems} 件 · ¥${tableTotalCartAmount.toFixed(2)}`
                  : '多人协同中'}
              </span>
            </div>
          </div>

          {/* 右侧同桌食客头像群 + 展开手柄 */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex -space-x-1.5 items-center">
              {activeParticipants.slice(0, 4).map((m, idx) => (
                <img
                  key={m.participantId}
                  src={getMemberAvatar(m.participantId, idx)}
                  alt={m.displayName}
                  className="w-5 h-5 rounded-full object-cover border-2 border-white shadow-2xs"
                  title={m.displayName}
                />
              ))}
            </div>
            <button
              type="button"
              className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-transform cursor-pointer"
              title={isExpanded ? '收起' : '展开同桌点餐面板'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 内置轻量反馈条（非弹窗形式，就地提示） */}
        <AnimatePresence>
          {inlineFeedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-50 border-t border-emerald-200 px-3.5 py-1.5 text-xs text-emerald-800 font-medium flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{inlineFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setInlineFeedback(null)}
                className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

          {/* 展开态面板 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="border-t border-neutral-100 px-3 pt-2 pb-2.5 space-y-2"
            >
              {/* 顶部控制栏：自动补齐中段空白、两端紧凑收拢 */}
              <div className="flex items-center pb-1.5 border-b border-neutral-100 flex-nowrap gap-1.5 w-full">
                {/* 左侧：收拢所有操作的下拉菜单按钮 */}
                <button
                  ref={actionsButtonRef}
                  type="button"
                  onClick={toggleActionsDropdown}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-neutral-50 hover:bg-neutral-100 active:scale-95 text-neutral-800 border border-neutral-200 transition flex items-center space-x-1 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                  title="桌台操作与换桌"
                >
                  <Shuffle className="w-3 h-3 text-orange-600 shrink-0" />
                  <span className="whitespace-nowrap font-mono">桌台操作</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  <ChevronDown
                    className={`w-3 h-3 text-neutral-400 transition-transform duration-200 shrink-0 ${
                      isActionsDropdownOpen ? 'rotate-180 text-orange-600' : ''
                    }`}
                  />
                </button>

                {/* 中间：自动补齐填满空白区域的整桌加购状态条 */}
                <div className="flex-1 min-w-0 px-2 py-1 rounded-xl text-xs font-mono font-extrabold bg-orange-50/90 border border-orange-200 text-orange-800 flex items-center justify-center space-x-1 whitespace-nowrap shadow-2xs">
                  <ShoppingBag className="w-3 h-3 text-orange-600 shrink-0" />
                  <span className="truncate">加购: {tableTotalCartItems}件 · ¥{tableTotalCartAmount.toFixed(2)}</span>
                </div>

                {/* 右侧：显式收拢关闭按钮 */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="px-2 py-1 rounded-xl text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 border border-neutral-200/80 transition flex items-center space-x-0.5 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                  title="收拢关闭面板"
                >
                  <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">收起</span>
                </button>
              </div>

              {/* 标签切换栏：紧凑填充、绝不换行 */}
              <div className="flex items-center space-x-1 p-0.5 bg-neutral-100/80 rounded-xl text-xs font-medium w-full flex-nowrap">
                <button
                  type="button"
                  onClick={() => setEmbeddedTab('status_flow')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer whitespace-nowrap shrink-0 ${
                    embeddedTab === 'status_flow'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Radio className="w-3 h-3 text-emerald-600 animate-pulse shrink-0" />
                  <span className="whitespace-nowrap">协同状态 ({activeParticipants.length}人)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEmbeddedTab('auth_management')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer whitespace-nowrap shrink-0 ${
                    embeddedTab === 'auth_management'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="whitespace-nowrap">桌主授权</span>
                  {pendingRequests.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-mono shrink-0 ml-1">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              </div>

              {/* 内容区域 1：真实协同点餐状态流 */}
              {embeddedTab === 'status_flow' && (
                <div className="space-y-1.5">
                  {/* 整桌协同加购汇聚横幅：紧凑收拢间距，横向自适应补齐 */}
                  <div className="py-1.5 px-2.5 rounded-xl bg-linear-to-r from-orange-50/70 via-amber-50/50 to-white border border-orange-200/80 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                      <Sparkles className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <div className="min-w-0 flex-1 flex items-center">
                        <span className="font-bold text-neutral-900 whitespace-nowrap shrink-0">同桌协同池：</span>
                        <span className="text-neutral-600 text-[11px] truncate block flex-1">
                          {activeParticipants.length > 1
                            ? `各就餐人加购实时汇总，桌主或食客统一核对`
                            : `扫桌码或点餐口令即可并入本桌协同`}
                        </span>
                      </div>
                    </div>
                    <div className="font-mono font-extrabold text-orange-700 shrink-0 text-sm whitespace-nowrap">
                      ¥{tableTotalCartAmount.toFixed(2)}
                    </div>
                  </div>

                  {/* 真实成员状态流列表 */}
                  {activeParticipants.map((p, idx) => {
                    const isMe = identity?.participantId === p.participantId;
                    const cartCount = p.cartSummary?.itemCount || 0;
                    const cartTotal = p.cartSummary?.totalAmount || 0;
                    const lastDish = p.lastNode?.lastClickedDishName;
                    const lastCat = p.lastNode?.categoryName;
                    const spend = p.spendAttribution || 0;

                    // 计算真实状态与文案
                    let statusBadge: 'submitted' | 'adding' | 'browsing' | 'idle' = 'idle';
                    let statusLabel = '已入座，正在浏览餐单';

                    if (spend > 0 && cartCount === 0) {
                      statusBadge = 'submitted';
                      statusLabel = `已提交餐单 · 累计消费 ¥${spend.toFixed(2)}`;
                    } else if (cartCount > 0) {
                      statusBadge = 'adding';
                      statusLabel = `已选购 ${cartCount} 件餐品 · ¥${cartTotal.toFixed(2)}`;
                    } else if (lastDish) {
                      statusBadge = 'browsing';
                      statusLabel = `正在挑选：${lastDish}`;
                    } else if (lastCat) {
                      statusBadge = 'browsing';
                      statusLabel = `正在浏览：${lastCat} 分类`;
                    }

                    return (
                      <div
                        key={p.participantId}
                        className="py-2 px-2.5 rounded-xl border border-neutral-100 bg-neutral-50/70 hover:bg-neutral-100/70 transition-all flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={getMemberAvatar(p.participantId, idx)}
                              alt={p.displayName}
                              className="w-8 h-8 rounded-full object-cover border border-neutral-200"
                            />
                            {p.role === 'owner' ? (
                              <span
                                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold shadow-2xs"
                                title="桌主"
                              >
                                ★
                              </span>
                            ) : (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="text-xs font-bold text-neutral-900 truncate">
                                {p.displayName} {isMe && <span className="text-orange-600 font-extrabold">(我)</span>}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-neutral-600 border border-neutral-200">
                                #CART-{activeTableCode}-{p.participantId.slice(-4).toUpperCase()}
                              </span>
                            </div>

                            <p className="text-[11px] text-neutral-600 mt-0.5 truncate flex items-center gap-1">
                              {statusBadge === 'adding' && <ShoppingBag className="w-3 h-3 text-orange-600 shrink-0" />}
                              {statusBadge === 'browsing' && <Eye className="w-3 h-3 text-blue-500 shrink-0" />}
                              {statusBadge === 'submitted' && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                              {statusBadge === 'idle' && <Clock className="w-3 h-3 text-neutral-400 shrink-0" />}
                              <span>{statusLabel}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          {/* 针对同桌协作者的挑菜与加购联动模拟 */}
                          {!isMe && (
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleSimulateMemberBrowsing(p.participantId, p.displayName)}
                                className="px-1.5 py-0.8 rounded-lg text-[10.5px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 transition cursor-pointer flex items-center gap-0.5"
                                title="模拟该同桌好友正在浏览某道菜品"
                              >
                                <Eye className="w-2.8 h-2.8 text-neutral-500" />
                                <span>看菜品</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSimulateMemberCart(p.participantId, p.displayName)}
                                className="px-2 py-0.8 rounded-lg text-[10.5px] font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition cursor-pointer"
                                title="模拟该同桌好友加购一件餐品"
                              >
                                + 加购
                              </button>
                            </div>
                          )}

                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 block font-mono">
                              {formatRelativeTime(p.lastSeenAt || p.joinedAt)}
                            </span>
                            <span
                              className={`inline-block mt-0.5 text-[9.5px] px-1.5 py-0.2 rounded font-medium ${
                                p.role === 'owner'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {p.role === 'owner' ? '桌主席位' : '已授权就座'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 内容区域 2：真实桌主授权管理面板 */}
              {embeddedTab === 'auth_management' && (
                <div className="space-y-3 bg-neutral-50/70 p-3 rounded-2xl border border-neutral-200/80">
                  {/* 待审批的新食客入座卡片 */}
                  {pendingRequests.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>待桌主审批的入座申请 ({pendingRequests.length})</span>
                      </div>
                      {pendingRequests.map((req) => (
                        <div
                          key={req.requestId}
                          className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <img
                              src={getMemberAvatar(req.requesterId, 0)}
                              alt={req.requesterName}
                              className="w-8 h-8 rounded-full object-cover border border-amber-300"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-amber-900 truncate">
                                {req.requesterName || '新食客'} 申请加入
                              </div>
                              <div className="text-[10.5px] text-amber-700">
                                正在扫描 {activeTableCode} 号桌申请协同点单
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleApproveRequest(req)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition cursor-pointer"
                            >
                              同意
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectRequest(req)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-200 bg-white border border-neutral-200 transition cursor-pointer"
                            >
                              拒绝
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 真实成员名单管理 */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-neutral-600 px-1 flex items-center justify-between">
                      <span>同桌已授权成员名单 ({activeParticipants.length} 人)</span>
                      <span className="text-neutral-400 font-normal text-[10px]">
                        {hasManageAuth ? '您拥有桌台管理权限' : '仅桌主可变更席位权限'}
                      </span>
                    </div>

                    {activeParticipants.map((m, idx) => {
                      const isMe = identity?.participantId === m.participantId;
                      return (
                        <div
                          key={m.participantId}
                          className="p-2 rounded-xl bg-white border border-neutral-200 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <img
                              src={getMemberAvatar(m.participantId, idx)}
                              alt={m.displayName}
                              className="w-7 h-7 rounded-full object-cover border border-neutral-200"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-neutral-900 truncate flex items-center gap-1">
                                <span>{m.displayName}</span>
                                {isMe && <span className="text-orange-600 text-[10.5px] font-bold">(我)</span>}
                                {m.role === 'owner' && (
                                  <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                                    桌主
                                  </span>
                                )}
                                {m.authority === 'manage' && m.role !== 'owner' && (
                                  <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-medium">
                                    协管
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-neutral-400 font-mono">
                                #CART-{activeTableCode}-{m.participantId.slice(-4).toUpperCase()}
                              </div>
                            </div>
                          </div>

                          {/* 权限管理操作 */}
                          {hasManageAuth && !isMe && (
                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleTransferOwnership(m.participantId, m.displayName)}
                                className="px-2 py-0.8 rounded-lg text-[10.5px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                                title="将桌主身份移交给该成员"
                              >
                                设为桌主
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleAuthority(m.participantId, m.authority)}
                                className="px-2 py-0.8 rounded-lg text-[10.5px] font-medium text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 transition cursor-pointer"
                                title="切换协管与普通权限"
                              >
                                {m.authority === 'manage' ? '降为点单' : '设为协管'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.participantId, m.displayName)}
                                className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                title="移出同桌点餐"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {isMe && (
                            <span className="text-[10.5px] text-neutral-400 px-2 py-0.5 font-medium">
                              当前设备席位
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 底部真实接入同桌就餐人快捷操作栏：自动补齐横向空白 */}
              <div className="pt-1.5 border-t border-neutral-100 flex items-center text-xs flex-nowrap gap-1.5 w-full">
                <span className="text-neutral-500 text-[11px] whitespace-nowrap shrink-0">
                  快捷入座:
                </span>
                <div className="flex-1 flex items-center gap-1.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleAddRealCompanion('同桌食客 · 小林')}
                    className="flex-1 min-w-0 py-1 px-1 rounded-lg text-xs font-semibold text-neutral-700 hover:text-black bg-white hover:bg-neutral-100 border border-neutral-200 shadow-2xs flex items-center justify-center space-x-1 transition cursor-pointer whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span className="truncate">+ 小林</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddRealCompanion('同桌食客 · 阿强')}
                    className="flex-1 min-w-0 py-1 px-1 rounded-lg text-xs font-semibold text-neutral-700 hover:text-black bg-white hover:bg-neutral-100 border border-neutral-200 shadow-2xs flex items-center justify-center space-x-1 transition cursor-pointer whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">+ 阿强</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddRealCompanion('同桌食客 · 小雅')}
                    className="flex-1 min-w-0 py-1 px-1 rounded-lg text-xs font-semibold text-neutral-700 hover:text-black bg-white hover:bg-neutral-100 border border-neutral-200 shadow-2xs flex items-center justify-center space-x-1 transition cursor-pointer whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">+ 小雅</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 真实二维码弹层 */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-neutral-200 text-center relative"
            >
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
                <QrCode className="w-5 h-5" />
              </div>

              <h3 className="text-base font-extrabold text-neutral-900">
                {activeTableCode} 号桌专属点餐码
              </h3>
              <p className="text-xs text-neutral-500 mt-1 mb-4">
                好友扫码或凭借点餐口令，即可实时同桌协同选购餐品
              </p>

              {qrDataUrl ? (
                <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200 inline-block mb-4">
                  <img src={qrDataUrl} alt="桌台二维码" className="w-48 h-48 rounded-lg mx-auto" />
                </div>
              ) : (
                <div className="w-48 h-48 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xs text-neutral-400">
                  生成二维码中...
                </div>
              )}

              <div className="bg-neutral-100 px-3 py-2 rounded-xl flex items-center justify-between text-xs font-mono font-bold text-neutral-800 mb-4">
                <span>点餐口令: {shortCode}</span>
                <button
                  type="button"
                  onClick={handleCopyInviteText}
                  className="text-orange-600 hover:text-orange-700 cursor-pointer text-xs"
                >
                  {copiedCode ? '已复制' : '复制'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition cursor-pointer"
              >
                关闭窗口
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 真实脱离溢出流的桌台功能下拉菜单 (Portal) */}
      {isActionsDropdownOpen && actionsDropdownCoords && typeof document !== 'undefined' && createPortal(
        <>
          {/* 背景轻触遮罩 */}
          <div
            className="fixed inset-0 z-[120]"
            onClick={() => setIsActionsDropdownOpen(false)}
          />

          {/* 下拉菜单面板 */}
          <div
            style={{
              top: `${actionsDropdownCoords.top}px`,
              left: `${actionsDropdownCoords.left}px`
            }}
            className="fixed z-[121] w-64 bg-white/98 backdrop-blur-md rounded-2xl shadow-xl border border-neutral-200 p-2.5 space-y-2 text-xs select-none animate-in fade-in zoom-in-95 duration-150"
          >
            {/* 当前桌号状态条 */}
            <div className="flex items-center justify-between px-1 pb-1.5 border-b border-neutral-100">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-extrabold text-neutral-900 font-mono">{activeTableCode} 号桌</span>
              </div>
              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                堂食协同
              </span>
            </div>

            {/* 快速换桌 */}
            <div>
              <div className="text-[10px] font-bold text-neutral-500 px-1 mb-1.5 flex items-center justify-between">
                <span>快速换桌</span>
                {onSwitchTable && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionsDropdownOpen(false);
                      onSwitchTable();
                    }}
                    className="text-orange-600 hover:text-orange-700 font-bold cursor-pointer text-[10px]"
                  >
                    全部桌位 &gt;
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {PRESET_TABLES.map((t) => {
                  const isCurr = t.code === activeTableCode;
                  return (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => {
                        if (!isCurr) {
                          onSelectQuickTable?.(t.code);
                          showToast?.(`已极速换桌至 ${t.code} 号桌`, '堂食点单与传菜目标已即时切换');
                        }
                        setIsActionsDropdownOpen(false);
                      }}
                      className={`py-1.5 px-1 rounded-xl text-center font-mono font-bold text-xs transition cursor-pointer ${
                        isCurr
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border border-neutral-200/70'
                      }`}
                    >
                      {t.code}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 快捷功能列表 */}
            <div className="pt-1.5 border-t border-neutral-100 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsActionsDropdownOpen(false);
                  handleOpenQrCode();
                }}
                className="w-full px-2 py-1.5 rounded-xl hover:bg-neutral-50 flex items-center justify-between text-neutral-700 hover:text-neutral-900 transition cursor-pointer text-left"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-xs">出示桌台二维码</span>
                </div>
                <ChevronRight className="w-3 h-3 text-neutral-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsActionsDropdownOpen(false);
                  handleCopyInviteText();
                }}
                className="w-full px-2 py-1.5 rounded-xl hover:bg-neutral-50 flex items-center justify-between text-neutral-700 hover:text-neutral-900 transition cursor-pointer text-left"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </div>
                  <span className="font-semibold text-xs">复制同桌邀请口令</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono font-bold bg-neutral-100 px-1.5 py-0.5 rounded">
                  {shortCode}
                </span>
              </button>

              {isMerchantView && (
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsDropdownOpen(false);
                    handleMerchantResetSession();
                  }}
                  className="w-full px-2 py-1.5 rounded-xl hover:bg-red-50 text-red-700 transition cursor-pointer flex items-center space-x-2 text-left"
                >
                  <div className="w-6 h-6 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-xs">商家清台重置</span>
                </button>
              )}

              {/* 收拢关闭面板 */}
              <button
                type="button"
                onClick={() => {
                  setIsActionsDropdownOpen(false);
                  setIsExpanded(false);
                }}
                className="w-full px-2 py-1.5 rounded-xl hover:bg-neutral-100 text-neutral-600 transition cursor-pointer flex items-center justify-between text-left"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-xs">收拢关闭面板</span>
                </div>
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default DynamicTableMorphWidget;
