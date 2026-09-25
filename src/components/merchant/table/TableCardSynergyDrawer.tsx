/* ============================================================================
 * TableCardSynergyDrawer —— 台位卡片展开的单桌全景协同与行为探针抽屉
 * ----------------------------------------------------------------------------
 * 提供单桌维度深层下钻能力：
 * 1. 成员权限管理（设为协管/降为仅点餐、移出成员、桌主转移）
 * 2. 行为探针实时流时间线回放（L3 探针）
 * 3. 强制关桌/重置协同会话（商家仲裁保护）
 * ==========================================================================*/

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Users,
  Shield,
  ShieldAlert,
  Clock,
  Eye,
  ShoppingBag,
  Activity,
  UserMinus,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Crown
} from 'lucide-react';
import {
  TableSession,
  DiningParticipant,
  PresenceState,
  TableSessionProbe,
  ProbePhase
} from '../../../types/tableSession';
import {
  getSessionById,
  listParticipants,
  getProbesBySession,
  setParticipantAuthority,
  removeParticipant,
  transferOwnership,
  closeSession,
  resolvePresence
} from '../../../utils/tableSessionEngine';
import { reactiveSyncBus } from '../../../utils/reactiveSyncBus';
import { MERCHANT_GUARDIAN_ID } from './TableCardSynergyMonitor';

interface TableCardSynergyDrawerProps {
  sessionId?: string;
  tableCode?: string;
  session?: TableSession | null;
  isOpen?: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
}

const PHASE_ICONS: Record<ProbePhase, { icon: string; label: string }> = {
  scan: { icon: '📷', label: '扫码' },
  first_bind: { icon: '🪑', label: '首绑开台' },
  link_request: { icon: '🔗', label: '发起加入' },
  link_settled: { icon: '🤝', label: '授权裁决' },
  participant_removed: { icon: '👋', label: '移出成员' },
  authority_changed: { icon: '🛡️', label: '权限变更' },
  presence_changed: { icon: '📡', label: '在线心跳' },
  session_closed: { icon: '🏁', label: '会话结束' },
  anomaly: { icon: '⚠️', label: '异常探针' }
};

export function TableCardSynergyDrawer({
  sessionId: propsSessionId,
  tableCode: propsTableCode,
  session: propsSession,
  isOpen = true,
  onClose,
  showToast
}: TableCardSynergyDrawerProps) {
  const [, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<'members' | 'probes'>('members');
  const [confirmCloseModal, setConfirmCloseModal] = useState(false);
  const [closeCodeInput, setCloseCodeInput] = useState('');

  const targetSessionId = propsSession?.sessionId || propsSessionId || '';
  const targetTableCode = propsSession?.tableCode || propsTableCode || '';

  // 实时订阅
  useEffect(() => {
    if (!isOpen) return;
    const unsubs = [
      reactiveSyncBus.subscribe('TABLE_SESSION_MUTATED', () => setTick((n) => n + 1)),
      reactiveSyncBus.subscribe('TABLE_LINK_SETTLED', () => setTick((n) => n + 1)),
      reactiveSyncBus.subscribe('PARTICIPANT_NODE_CHANGED', () => setTick((n) => n + 1))
    ];
    const timer = setInterval(() => setTick((n) => n + 1), 15000);
    return () => {
      unsubs.forEach((fn) => fn());
      clearInterval(timer);
    };
  }, [isOpen]);

  const session = useMemo(() => {
    if (!targetSessionId) return propsSession || null;
    return getSessionById(targetSessionId) || propsSession || null;
  }, [targetSessionId, propsSession, setTick]);

  const participants = useMemo(() => {
    if (!session) return [];
    const now = new Date();
    return listParticipants(session.sessionId, now);
  }, [session, setTick]);

  const probes = useMemo(() => {
    if (!session) return [];
    return getProbesBySession(session.sessionId);
  }, [session, setTick]);

  if (!isOpen || !session) return null;

  // 调整权限
  const handleToggleAuthority = (p: DiningParticipant) => {
    const nextAuth = p.authority === 'manage' ? 'order_only' : 'manage';
    const res = setParticipantAuthority({
      sessionId: session.sessionId,
      targetId: p.participantId,
      authority: nextAuth,
      actorId: MERCHANT_GUARDIAN_ID
    });
    showToast(res.message);
    setTick((n) => n + 1);
  };

  // 移出
  const handleRemove = (p: DiningParticipant) => {
    const res = removeParticipant({
      sessionId: session.sessionId,
      targetId: p.participantId,
      actorId: MERCHANT_GUARDIAN_ID,
      reason: '商家协同抽屉监管移出'
    });
    showToast(res.message);
    setTick((n) => n + 1);
  };

  // 强制关会话
  const effectiveTableCode = session.tableCode || targetTableCode || '台位';

  const handleConfirmClose = () => {
    if (closeCodeInput.trim().toUpperCase() !== effectiveTableCode.toUpperCase()) {
      showToast('请输入正确的桌号以确认');
      return;
    }
    const res = closeSession({
      sessionId: session.sessionId,
      closedBy: 'merchant',
      actorId: MERCHANT_GUARDIAN_ID
    });
    showToast(res.message);
    setConfirmCloseModal(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-4 py-3 bg-[#111111] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm bg-white/20 px-2 py-0.5 rounded">
              {effectiveTableCode}
            </span>
            <div>
              <h3 className="text-sm font-bold leading-tight">桌台点餐协同全景监管</h3>
              <p className="text-[11px] text-neutral-400">第 {session.occupancySeq} 轮 · 会话 ID: {session.sessionId.slice(-6)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded text-neutral-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-4 pt-3 pb-2 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'members'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>同桌成员 ({participants.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('probes')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'probes'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>探针时间线 ({probes.length})</span>
            </button>
          </div>

          <button
            onClick={() => setConfirmCloseModal(true)}
            className="px-2 py-1 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center gap-1"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            <span>结束会话</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'members' && (
            <div className="space-y-3">
              {participants.length === 0 && (
                <div className="py-12 text-center text-neutral-400 text-xs">
                  暂无活跃成员
                </div>
              )}
              {participants.map((p) => {
                const isOnline = p.presence === 'online';
                const isOwner = p.role === 'owner';
                return (
                  <div
                    key={p.participantId}
                    className="p-3 bg-neutral-50 border border-neutral-200 rounded-[4px] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOnline ? 'bg-emerald-500' : p.presence === 'idle' ? 'bg-amber-400' : 'bg-neutral-300'
                          }`}
                        />
                        <span className="font-mono font-bold text-sm text-neutral-900">
                          {p.maskedId}
                        </span>
                        {isOwner ? (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-500 text-white font-bold rounded flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5 fill-current" />
                            <span>桌主(首绑)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 bg-neutral-200 text-neutral-700 rounded font-medium">
                            由 {p.grantedByMasked || '系统'} 授权
                          </span>
                        )}
                      </div>

                      {!isOwner && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleAuthority(p)}
                            className="px-2 py-0.5 text-[11px] bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 rounded font-medium"
                          >
                            {p.authority === 'manage' ? '降为仅点餐' : '升为管理'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(p)}
                            className="px-2 py-0.5 text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-medium"
                          >
                            移出
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Detailed reads */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2 rounded border border-neutral-200">
                      <div>
                        <span className="text-neutral-500 block text-[10px]">当前浏览分类</span>
                        <span className="font-medium text-neutral-800">
                          {p.lastNode?.categoryName || '未在浏览'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">上次点击单品</span>
                        <span className="font-medium text-neutral-800 truncate block">
                          {p.lastNode?.lastClickedDishName || '无'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">购物车加购</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {p.cartSummary?.itemCount || 0} 件 · ¥{(p.cartSummary?.totalAmount || 0).toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">最后活跃时间</span>
                        <span className="text-neutral-600 text-[11px]">
                          {p.lastSeenAt ? new Date(p.lastSeenAt).toLocaleTimeString('zh-CN') : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'probes' && (
            <div className="space-y-2">
              {probes.length === 0 && (
                <div className="py-12 text-center text-neutral-400 text-xs">
                  暂无行为探针记录
                </div>
              )}
              {probes.map((probe) => {
                const meta = PHASE_ICONS[probe.phase] || { icon: '📌', label: probe.phase };
                return (
                  <div
                    key={probe.probeId}
                    className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-[3px] flex items-start gap-2.5 text-xs"
                  >
                    <span className="text-sm shrink-0">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900">{meta.label}</span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {new Date(probe.at).toLocaleTimeString('zh-CN')}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-0.5 truncate font-mono">
                        {JSON.stringify(probe.payload)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-100 border-t border-neutral-200 text-[11px] text-neutral-500 text-center">
          所有操作具备分布式 CAS 状态机幂等保护，并已自动同步至顾客端
        </div>
      </div>

      {/* 强确认结束会话弹窗 */}
      {confirmCloseModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-white rounded-lg p-5 space-y-4 shadow-xl">
            <h4 className="font-bold text-sm text-neutral-900">
              确认结束 {effectiveTableCode} 桌协同会话？
            </h4>
            <p className="text-xs text-rose-600">
              结束后所有成员将失去本桌点餐权限，二维码需重新扫描开台。
            </p>
            <input
              type="text"
              value={closeCodeInput}
              onChange={(e) => setCloseCodeInput(e.target.value)}
              placeholder={`输入桌号 ${effectiveTableCode} 确认`}
              className="w-full h-9 px-2.5 border border-neutral-300 rounded text-sm font-mono uppercase focus:outline-none focus:border-neutral-900"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmCloseModal(false)}
                className="flex-1 py-1.5 border border-neutral-300 rounded text-xs text-neutral-700 font-medium hover:bg-neutral-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirmClose}
                disabled={closeCodeInput.trim().toUpperCase() !== effectiveTableCode.toUpperCase()}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded text-xs font-bold"
              >
                确认结束
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
