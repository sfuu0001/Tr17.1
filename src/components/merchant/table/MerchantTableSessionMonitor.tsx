/* ============================================================================
 * MerchantTableSessionMonitor —— 会话监测台（T3-5）
 * ----------------------------------------------------------------------------
 * 三层下钻（SPEC §3.2）：
 *   L1 会话列表（listSessionOverviews + TABLE_SESSION_MUTATED 自动刷新）
 *   L2 会话详情（参与者卡片：当前浏览 / 上次点击 / 购物车 / 授权链）
 *   L3 行为时间线（getProbesBySession 探针流）
 * 兜底操作：代批授权 / 移出成员 / 结束会话（强确认）；
 * 字段级退回走既有 MerchantVersionTrackingView（table_session 过滤），不重复造。
 * ==========================================================================*/

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  TableSession,
  DiningParticipant,
  PresenceState,
  LinkRequest,
  ProbePhase
} from '../../../types/tableSession';
import {
  listSessionOverviews,
  getSessionById,
  listParticipants,
  listPendingRequests,
  getProbesBySession,
  expireStaleRequests,
  settleLinkRequest,
  removeParticipant,
  closeSession
} from '../../../utils/tableSessionEngine';
import { reactiveSyncBus } from '../../../utils/reactiveSyncBus';
import { useTableSessionUi } from '../../table/useTableSessionUi';

interface MerchantTableSessionMonitorProps {
  showToast: (msg: string) => void;
  /** 打开版本追踪台（字段级退回入口） */
  onOpenVersionTracking?: () => void;
}

const PRESENCE_DOT: Record<PresenceState, string> = {
  online: 'bg-status-olive',
  idle: 'bg-accent-orange',
  offline: 'bg-border-main'
};

const PHASE_META: Record<ProbePhase, { icon: string; label: string }> = {
  scan: { icon: '📷', label: '扫码' },
  first_bind: { icon: '🪑', label: '首绑开台' },
  link_request: { icon: '🔗', label: '发起加入' },
  link_settled: { icon: '🤝', label: '授权裁决' },
  participant_removed: { icon: '👋', label: '成员移出' },
  authority_changed: { icon: '🛡️', label: '权限变更' },
  presence_changed: { icon: '📡', label: '在线状态' },
  session_closed: { icon: '🏁', label: '会话结束' },
  anomaly: { icon: '⚠️', label: '异常' }
};

const MERCHANT_GUARDIAN_ID = 'merchant_session_guardian';

export function MerchantTableSessionMonitor({
  showToast,
  onOpenVersionTracking
}: MerchantTableSessionMonitorProps) {
  // 借用全局 Hook 的事件绑定（模块级单例，不影响顾客端状态）
  useTableSessionUi();
  const [, force] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [probeTarget, setProbeTarget] = useState<{ sessionId: string; participantId: string } | null>(null);
  const [confirmClose, setConfirmClose] = useState<TableSession | null>(null);
  const [closeConfirmText, setCloseConfirmText] = useState('');
  const [now, setNow] = useState(() => Date.now());

  // 事件驱动刷新 + 30s 时钟（时长/超时列需要滴答）
  useEffect(() => {
    const unsubs = [
      reactiveSyncBus.subscribe('TABLE_SESSION_MUTATED', () => force((n) => n + 1)),
      reactiveSyncBus.subscribe('TABLE_LINK_SETTLED', () => force((n) => n + 1))
    ];
    const clock = setInterval(() => {
      setNow(Date.now());
    }, 30_000);
    return () => {
      unsubs.forEach((fn) => fn());
      clearInterval(clock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => listSessionOverviews(), [now, expandedId]);
  const pendingAll = useMemo(() => listPendingRequests(), [now, expandedId]);

  // 到期请求批量过期（商家端兜底；返回过期数>0 时刷新）
  useEffect(() => {
    const expired = expireStaleRequests();
    if (expired > 0) force((n) => n + 1);
  }, [now]);

  const expanded = expandedId ? getSessionById(expandedId) : null;
  const probeTimeline = probeTarget ? getProbesBySession(probeTarget.sessionId) : [];

  /* ---- 兜底操作 ---- */
  const handleMerchantSettle = (req: LinkRequest, decision: 'granted' | 'denied') => {
    const res = settleLinkRequest({
      requestId: req.requestId,
      decision,
      actorId: MERCHANT_GUARDIAN_ID
    });
    showToast(res.message);
    force((n) => n + 1);
  };

  const handleRemove = (sessionId: string, p: DiningParticipant) => {
    const res = removeParticipant({
      sessionId,
      targetId: p.participantId,
      actorId: MERCHANT_GUARDIAN_ID,
      reason: '商家监测台移出'
    });
    showToast(res.message);
    force((n) => n + 1);
  };

  const handleCloseSession = () => {
    if (!confirmClose) return;
    const res = closeSession({
      sessionId: confirmClose.sessionId,
      closedBy: 'merchant',
      actorId: MERCHANT_GUARDIAN_ID
    });
    showToast(res.message);
    setConfirmClose(null);
    setCloseConfirmText('');
    setExpandedId(null);
    force((n) => n + 1);
  };

  const formatRel = (iso?: string) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return '刚刚';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
    return `${Math.floor(diff / 3_600_000)} 小时前`;
  };

  /* ---- 渲染 ---- */
  return (
    <div className="bg-card-bg border border-border-main rounded-console-xl overflow-hidden mt-4">
      <div className="bg-dark-container px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">桌台会话监测台</p>
          <p className="text-xs text-text-muted mt-0.5">
            {rows.length} 个会话 · {pendingAll.filter((r) => r.status === 'pending').length} 个待处理请求
          </p>
        </div>
        {onOpenVersionTracking && (
          <button
            onClick={onOpenVersionTracking}
            className="h-8 px-3 rounded-console bg-card-bg/10 border border-white/20 text-xs text-white"
          >
            版本退回
          </button>
        )}
      </div>

      {/* L1 会话列表 */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-text-muted border-b border-border-main">
              <th className="text-left px-4 py-2.5 font-normal">桌号</th>
              <th className="text-left px-4 py-2.5 font-normal">状态</th>
              <th className="text-left px-4 py-2.5 font-normal">时长</th>
              <th className="text-left px-4 py-2.5 font-normal">在线/总数</th>
              <th className="text-left px-4 py-2.5 font-normal">待处理</th>
              <th className="text-right px-4 py-2.5 font-normal">消费</th>
              <th className="text-left px-4 py-2.5 font-normal">风险</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                  暂无进行中的桌台会话
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const allOffline =
                row.pendingRequestCount > 0 &&
                row.participants
                  .filter((p) => !p.removedAt)
                  .every((p) => p.presence === 'offline');
              return (
                <React.Fragment key={row.sessionId}>
                  <tr
                    onClick={() => setExpandedId(expandedId === row.sessionId ? null : row.sessionId)}
                    className={`border-b border-border-main cursor-pointer hover:bg-page-bg ${
                      expandedId === row.sessionId ? 'bg-page-bg' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-text-prominent whitespace-nowrap">
                      {row.tableCode}
                      <span className="text-text-muted font-normal ml-1">· 第{row.occupancySeq}轮</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          row.status === 'open'
                            ? 'bg-status-olive/10 text-status-olive'
                            : row.status === 'locked'
                            ? 'bg-accent-orange/10 text-accent-orange'
                            : 'bg-status-terracotta/10 text-status-terracotta'
                        }`}
                      >
                        {row.status === 'open' ? '就餐中' : row.status === 'locked' ? '开台中' : '收台中'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 tabular-nums ${row.durationMinutes > 120 ? 'text-status-terracotta' : 'text-text-secondary'}`}>
                      {row.durationMinutes} 分钟
                    </td>
                    <td className="px-4 py-3 text-text-secondary tabular-nums">
                      {row.activeParticipantCount}/{row.participantCount}
                    </td>
                    <td className="px-4 py-3">
                      {row.pendingRequestCount > 0 ? (
                        allOffline ? (
                          <span className="px-1.5 py-0.5 rounded bg-accent-orange/15 text-accent-orange text-[10px]">
                            {row.pendingRequestCount} 待商家处理
                          </span>
                        ) : (
                          <span className="inline-block w-4 h-4 rounded-full bg-status-terracotta text-white text-[10px] text-center leading-4">
                            {row.pendingRequestCount}
                          </span>
                        )
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-text-prominent tabular-nums">
                      ¥{row.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {row.riskFlags.length > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-status-terracotta/10 text-status-terracotta text-[10px]">
                          {row.riskFlags.length} 项
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>

                  {/* L2 会话详情 */}
                  {expandedId === row.sessionId && expanded && (
                    <tr className="bg-page-bg">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-3">
                          {listParticipants(expanded.sessionId).map((p) => (
                            <div
                              key={p.participantId}
                              className={`bg-card-bg border border-border-main rounded-console p-3 ${
                                p.presence === 'offline' ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`w-2 h-2 rounded-full ${PRESENCE_DOT[p.presence]}`} />
                                <span className="font-mono text-xs font-medium text-text-prominent">
                                  {p.maskedId}
                                </span>
                                {p.role === 'owner' && (
                                  <span className="text-[10px] px-1 rounded bg-accent-orange text-white">桌主</span>
                                )}
                                <span className="text-[10px] text-text-muted">
                                  {p.authority === 'manage' ? '管理' : '仅点餐'}
                                </span>
                                <button
                                  onClick={() =>
                                    setProbeTarget(
                                      probeTarget?.participantId === p.participantId
                                        ? null
                                        : { sessionId: expanded.sessionId, participantId: p.participantId }
                                    )
                                  }
                                  className="ml-auto text-[10px] text-slate-blue underline underline-offset-2"
                                >
                                  行为时间线
                                </button>
                              </div>
                              {/* 行为读数：空数据态显示"暂无行为数据"，禁止 0/— 冒充 */}
                              <p className="text-[11px] text-text-secondary">
                                {p.lastNode.categoryName
                                  ? `正在看：${p.lastNode.categoryName}`
                                  : '暂无浏览行为'}
                              </p>
                              <p className="text-[11px] text-text-secondary">
                                {p.lastNode.lastClickedDishName
                                  ? `上次点击：${p.lastNode.lastClickedDishName}（${formatRel(p.lastNode.at)}）`
                                  : '暂无菜品点击'}
                              </p>
                              <p className="text-[11px] text-text-secondary">
                                购物车 {p.cartSummary.itemCount} 件 · ¥{p.cartSummary.totalAmount.toFixed(2)}
                              </p>
                              <p className="text-[10px] text-text-muted mt-1">
                                {p.grantSource === 'self_bind'
                                  ? '首绑入座'
                                  : `由 ${p.grantedByMasked ?? '—'} 授权加入`}
                              </p>
                              <div className="flex gap-1.5 mt-2">
                                <button
                                  onClick={() => handleRemove(expanded.sessionId, p)}
                                  className="h-6 px-2 rounded bg-status-terracotta/10 border border-status-terracotta text-[10px] text-status-terracotta"
                                >
                                  移出
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* 待处理请求（商家兜底队列） */}
                          {pendingAll
                            .filter((r) => r.status === 'pending' && r.sessionId === expanded.sessionId)
                            .map((r) => (
                              <div
                                key={r.requestId}
                                className="bg-card-bg border border-accent-orange rounded-console p-3"
                              >
                                <p className="text-xs font-medium text-text-prominent mb-2">
                                  🔗 {r.requesterMaskedId} 申请加入
                                  <span className="text-status-terracotta ml-2 text-[10px]">
                                    {allOffline ? '授权人全部离线' : '等待响应'}
                                  </span>
                                </p>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleMerchantSettle(r, 'granted')}
                                    className="h-7 px-3 rounded bg-accent-orange text-white text-[11px]"
                                  >
                                    代批授权
                                  </button>
                                  <button
                                    onClick={() => handleMerchantSettle(r, 'denied')}
                                    className="h-7 px-3 rounded border border-border-main text-text-secondary text-[11px]"
                                  >
                                    拒绝
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>

                        {/* L3 探针时间线 */}
                        {probeTarget && probeTarget.sessionId === expanded.sessionId && (
                          <div className="mt-3 bg-card-bg border border-border-main rounded-console p-3 max-h-56 overflow-y-auto">
                            <p className="text-[10px] text-text-muted mb-2">
                              行为探针时间线 · {probeTimeline.length} 条
                            </p>
                            {probeTimeline.length === 0 && (
                              <p className="text-[11px] text-text-muted">暂无探针数据</p>
                            )}
                            {probeTimeline.map((probe) => {
                              const meta = PHASE_META[probe.phase];
                              return (
                                <div
                                  key={probe.probeId}
                                  className="flex items-start gap-2 py-1.5 border-b border-border-main last:border-0"
                                >
                                  <span className="text-xs shrink-0">{meta.icon}</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] text-text-prominent">{meta.label}</p>
                                    <p className="text-[10px] font-mono text-text-muted truncate">
                                      {new Date(probe.at).toLocaleTimeString('zh-CN')} ·{' '}
                                      {JSON.stringify(probe.payload).slice(0, 80)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 商家兜底操作区 */}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              setConfirmClose(expanded);
                              setCloseConfirmText('');
                            }}
                            className="h-8 px-3 rounded-console bg-status-terracotta text-white text-xs font-medium"
                          >
                            结束本桌会话
                          </button>
                          <span className="text-[10px] text-text-muted self-center">
                            字段级数据退回请使用右上角「版本退回」入口
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 结束会话强确认：必须输入桌号 */}
      <AnimatePresence>
        {confirmClose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-dark-container/60 flex items-center justify-center p-6"
          >
            <div className="w-full max-w-sm bg-card-bg rounded-console-xl p-6">
              <p className="text-sm font-bold text-text-prominent mb-2">
                确认结束 {confirmClose.tableCode} 号桌会话？
              </p>
              <p className="text-xs text-status-terracotta mb-4">
                会话内全部成员将失去下单权限，进行中订单不受影响
              </p>
              <input
                value={closeConfirmText}
                onChange={(e) => setCloseConfirmText(e.target.value)}
                placeholder={`输入桌号 ${confirmClose.tableCode} 以确认`}
                className="w-full h-10 px-3 rounded-console bg-page-bg border border-border-main text-sm text-text-prominent font-mono mb-4 focus:outline-none focus:border-status-terracotta"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmClose(null)}
                  className="flex-1 h-10 rounded-console border border-border-main text-sm text-text-secondary"
                >
                  取消
                </button>
                <button
                  onClick={handleCloseSession}
                  disabled={closeConfirmText.trim().toUpperCase() !== confirmClose.tableCode.toUpperCase()}
                  className="flex-1 h-10 rounded-console bg-status-terracotta text-white text-sm font-medium disabled:opacity-40"
                >
                  确认结束
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
