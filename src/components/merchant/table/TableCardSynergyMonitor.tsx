/* ============================================================================
 * TableCardSynergyMonitor —— 台位卡片内嵌「协同双向监管组件」
 * ----------------------------------------------------------------------------
 * 核心设计遵循 INDUSTRIAL PRECISION CONSOLE 工业设计规范：
 * 1. 待处理授权申请即时浮现（橙色预警条 + 一键代批/拒绝）
 * 2. 同桌多成员实时足迹与心跳感知（🟢在线/🟡闲置/⚪离线、看菜/点击菜品/加购总额）
 * 3. 授权人全离线预警与商家兜底仲裁
 * 4. 零外部入侵：与台位卡片紧密排版，支持点击唤起深层管理抽屉
 * ==========================================================================*/

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  UserX,
  Clock,
  Eye,
  ShoppingBag,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  X,
  Crown,
  Sparkles
} from 'lucide-react';
import {
  TableSession,
  DiningParticipant,
  PresenceState,
  LinkRequest
} from '../../../types/tableSession';
import {
  getOpenSessionByTableCode,
  activeParticipants,
  resolvePresence,
  settleLinkRequest,
  removeParticipant,
  setParticipantAuthority,
  getLinkRequests
} from '../../../utils/tableSessionEngine';
import { reactiveSyncBus } from '../../../utils/reactiveSyncBus';

export const MERCHANT_GUARDIAN_ID = 'merchant_session_guardian';

interface TableCardSynergyMonitorProps {
  tableCode: string;
  tableId: string;
  isDining: boolean;
  showToast: (msg: string) => void;
  onOpenSynergyDrawer?: (session: TableSession) => void;
}

const PRESENCE_DOT_MAP: Record<PresenceState, { dot: string; label: string }> = {
  online: { dot: 'bg-emerald-500 ring-2 ring-emerald-200', label: '在线' },
  idle: { dot: 'bg-amber-400 ring-2 ring-amber-100', label: '离开' },
  offline: { dot: 'bg-neutral-300 ring-2 ring-neutral-100', label: '离线' }
};

export function TableCardSynergyMonitor({
  tableCode,
  tableId,
  isDining,
  showToast,
  onOpenSynergyDrawer
}: TableCardSynergyMonitorProps) {
  // ⚠️ tick 必须参与 useMemo 依赖，否则会话/成员/待批数据会被缓存冻结（"实时"失效）
  const [tick, setTick] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // 监听全桌台会话与联动事件驱动刷新
  useEffect(() => {
    const unsubs = [
      reactiveSyncBus.subscribe('TABLE_SESSION_MUTATED', (payload) => {
        if (!payload?.tableCode || payload.tableCode.toUpperCase() === tableCode.toUpperCase()) {
          setTick((n) => n + 1);
        }
      }),
      reactiveSyncBus.subscribe('TABLE_LINK_REQUEST', (payload) => {
        if (!payload?.tableCode || payload.tableCode.toUpperCase() === tableCode.toUpperCase()) {
          setTick((n) => n + 1);
        }
      }),
      reactiveSyncBus.subscribe('TABLE_LINK_SETTLED', (payload) => {
        if (!payload?.tableCode || payload.tableCode.toUpperCase() === tableCode.toUpperCase()) {
          setTick((n) => n + 1);
        }
      }),
      reactiveSyncBus.subscribe('PARTICIPANT_NODE_CHANGED', (payload) => {
        if (!payload?.tableCode || payload.tableCode.toUpperCase() === tableCode.toUpperCase()) {
          setTick((n) => n + 1);
        }
      })
    ];

    // 每 15 秒时钟轻量校准一次在线与时长
    const timer = setInterval(() => setTick((n) => n + 1), 15000);

    return () => {
      unsubs.forEach((fn) => fn());
      clearInterval(timer);
    };
  }, [tableCode]);

  const session = useMemo(() => {
    return getOpenSessionByTableCode(tableCode);
  }, [tableCode, tick]);

  // 获取本桌当前 pending 请求（包含内存与持久化池匹配）
  const pendingRequests = useMemo(() => {
    if (!session) {
      // 容灾：如果尚未开台但有发给本桌的待决请求
      const allRequests = getLinkRequests();
      return allRequests.filter(
        (r) => r.tableCode.toUpperCase() === tableCode.toUpperCase() && r.status === 'pending'
      );
    }
    const fromSession = (session.pendingRequests || []).filter((r) => r.status === 'pending');
    if (fromSession.length > 0) return fromSession;
    const allRequests = getLinkRequests();
    return allRequests.filter(
      (r) => r.sessionId === session.sessionId && r.status === 'pending'
    );
  }, [session, tableCode, tick]);

  // 活跃成员列表
  const participants = useMemo(() => {
    if (!session) return [];
    const now = new Date();
    return activeParticipants(session).map((p) => ({
      ...p,
      presence: resolvePresence(p.lastSeenAt, now)
    }));
  }, [session, tick]);

  // 商家代批处理
  const handleSettle = (e: React.MouseEvent, req: LinkRequest, decision: 'granted' | 'denied') => {
    e.stopPropagation();
    const res = settleLinkRequest({
      requestId: req.requestId,
      decision,
      actorId: MERCHANT_GUARDIAN_ID
    });
    showToast(res.message);
    setTick((n) => n + 1);
  };

  // 快捷移除某个恶意或误扫成员
  const handleQuickRemove = (e: React.MouseEvent, p: DiningParticipant) => {
    e.stopPropagation();
    if (!session) return;
    const res = removeParticipant({
      sessionId: session.sessionId,
      targetId: p.participantId,
      actorId: MERCHANT_GUARDIAN_ID,
      reason: '商家台位卡片监管快速移出'
    });
    showToast(res.message);
    setTick((n) => n + 1);
  };

  // 如果桌台既没有打开的会话，也没有等待授权的请求，且处于非就餐状态，则不占卡片高度
  if (!session && pendingRequests.length === 0) {
    return null;
  }

  const onlineCount = participants.filter((p) => p.presence === 'online').length;
  const isAllOffline = pendingRequests.length > 0 && participants.length > 0 && onlineCount === 0;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-neutral-50 border border-neutral-200 rounded-md p-2 space-y-2 text-[11px] select-none transition-all hover:border-neutral-300"
    >
      {/* 1. 待处理授权请求专区（最高优先级高亮提醒） */}
      {pendingRequests.length > 0 && (
        <div className="space-y-1.5">
          {pendingRequests.map((req) => (
            <div
              key={req.requestId}
              className="bg-amber-50/95 border border-amber-300 rounded-md p-2 space-y-1.5 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="font-bold text-amber-900 truncate">
                    扫码申请加入: <strong className="font-mono">{req.requesterMaskedId}</strong>
                  </span>
                </div>
                <span className="text-[9px] px-1 py-0.2 bg-amber-200 text-amber-800 font-bold rounded shrink-0">
                  {isAllOffline ? '桌主离线' : '待桌主同意'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-amber-800 pt-0.5">
                <span>{isAllOffline ? '同桌无人在线，建议前台一键代批' : '支持前台服务人员直接代批免卡单'}</span>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={(e) => handleSettle(e, req, 'granted')}
                  className="flex-1 py-1 px-2 bg-neutral-900 hover:bg-black text-white font-bold rounded text-[10.5px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                >
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>代批同意</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSettle(e, req, 'denied')}
                  className="py-1 px-2 bg-white hover:bg-rose-50 text-rose-700 border border-neutral-200 hover:border-rose-300 font-medium rounded text-[10.5px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                >
                  <X className="w-3 h-3 text-rose-500" />
                  <span>拒绝</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. 协同感知摘要条（常态呈现：协同人数、在线心跳、展开明细） */}
      {session && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1 text-[11px] text-neutral-600">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className="w-2 h-2 rounded-full bg-neutral-900 animate-pulse shrink-0" />
              <span className="font-bold text-neutral-900 truncate flex items-center gap-1">
                <span>点餐协同监管</span>
                <span className="font-mono text-neutral-500 font-normal">
                  ({onlineCount}/{participants.length}在线)
                </span>
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onOpenSynergyDrawer && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSynergyDrawer(session);
                  }}
                  className="text-[10px] text-neutral-900 hover:underline font-bold flex items-center gap-0.5"
                  title="打开本桌完整行为探针与权限控制抽屉"
                >
                  <span>全景</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-0.5 hover:bg-neutral-200 rounded text-neutral-600 transition-colors"
                title={isExpanded ? '收起同桌轨迹' : '展开同桌轨迹'}
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 折叠态摘要：展示第一条有行为轨迹的顾客状态 */}
          {!isExpanded && participants.length > 0 && (
            <div className="bg-white rounded px-2 py-1 border border-neutral-200 text-[10px] text-neutral-600 flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
                <span className={`w-1.5 h-1.5 rounded-full ${PRESENCE_DOT_MAP[participants[0].presence].dot} shrink-0`} />
                <span className="font-mono font-bold text-neutral-900 shrink-0">
                  {participants[0].maskedId}
                </span>
                <span className="text-neutral-500 truncate">
                  {participants[0].lastNode?.lastClickedDishName
                    ? `刚选了「${participants[0].lastNode.lastClickedDishName}」`
                    : participants[0].lastNode?.categoryName
                    ? `在看「${participants[0].lastNode.categoryName}」`
                    : '已就位正在选餐'}
                </span>
              </div>
              <span className="font-mono text-neutral-900 font-bold shrink-0">
                加购¥{(participants[0].cartSummary?.totalAmount || 0).toFixed(0)}
              </span>
            </div>
          )}

          {/* 展开态：显示同桌每个人的实时足迹与快捷控制 */}
          {isExpanded && (
            <div className="space-y-1 pt-1 border-t border-neutral-200 max-h-48 overflow-y-auto pr-0.5 custom-scrollbar">
              {participants.map((p) => {
                const presenceMeta = PRESENCE_DOT_MAP[p.presence];
                const hasCart = (p.cartSummary?.itemCount || 0) > 0;
                return (
                  <div
                    key={p.participantId}
                    className="bg-white rounded border border-neutral-200 p-1.5 space-y-1 transition-colors hover:border-neutral-300"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${presenceMeta.dot} shrink-0`} title={presenceMeta.label} />
                        <span className="font-mono font-bold text-neutral-900 truncate text-[10.5px]">
                          {p.maskedId}
                        </span>
                        {p.role === 'owner' ? (
                          <span className="text-[9px] px-1 py-0.2 bg-neutral-900 text-white font-bold rounded flex items-center gap-0.5 shrink-0">
                            <Crown className="w-2.5 h-2.5 fill-current" />
                            <span>桌主</span>
                          </span>
                        ) : (
                          <span className="text-[9px] px-1 py-0.2 bg-neutral-100 text-neutral-700 rounded font-medium shrink-0">
                            {p.authority === 'manage' ? '协管' : '点餐'}
                          </span>
                        )}
                      </div>

                      {p.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={(e) => handleQuickRemove(e, p)}
                          className="text-[9.5px] px-1.5 py-0.2 text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-colors shrink-0"
                          title="从本桌协同名单移出此顾客"
                        >
                          移出
                        </button>
                      )}
                    </div>

                    {/* 实时行为感知行 */}
                    <div className="text-[10px] text-neutral-600 space-y-0.5 bg-neutral-50 p-1 rounded">
                      <div className="flex items-center gap-1 truncate">
                        <Eye className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
                        <span className="truncate">
                          {p.lastNode?.categoryName ? (
                            <span>正在看 <strong className="text-neutral-900">{p.lastNode.categoryName}</strong></span>
                          ) : (
                            <span className="text-neutral-400">暂未浏览分类</span>
                          )}
                          {p.lastNode?.lastClickedDishName && (
                            <span className="ml-1 text-neutral-900 font-medium">· 选「{p.lastNode.lastClickedDishName}」</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-600">
                        <span className="flex items-center gap-1">
                          <ShoppingBag className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
                          <span>已选 {p.cartSummary?.itemCount || 0} 件</span>
                        </span>
                        <span className="font-mono font-black text-neutral-900">
                          ¥{(p.cartSummary?.totalAmount || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
