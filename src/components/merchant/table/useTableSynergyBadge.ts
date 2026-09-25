import { useState, useEffect } from 'react';
import { getOpenSessionByTableCode, getLinkRequests, activeParticipants } from '../../../utils/tableSessionEngine';
import { reactiveSyncBus } from '../../../utils/reactiveSyncBus';

export interface TableSynergyHeaderBadgeInfo {
  hasSession: boolean;
  participantCount: number;
  pendingCount: number;
  isAllOffline: boolean;
}

export function useTableSynergyBadge(tableCode: string): TableSynergyHeaderBadgeInfo {
  const [, setTick] = useState(0);

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
      })
    ];
    const timer = setInterval(() => setTick((n) => n + 1), 15000);
    return () => {
      unsubs.forEach((fn) => fn());
      clearInterval(timer);
    };
  }, [tableCode]);

  const session = getOpenSessionByTableCode(tableCode);
  const pendingRequests = session
    ? (session.pendingRequests || []).filter((r) => r.status === 'pending')
    : getLinkRequests().filter(
        (r) => r.tableCode.toUpperCase() === tableCode.toUpperCase() && r.status === 'pending'
      );

  const participants = session ? activeParticipants(session) : [];
  const onlineCount = participants.filter((p) => p.presence === 'online').length;
  const isAllOffline = pendingRequests.length > 0 && participants.length > 0 && onlineCount === 0;

  return {
    hasSession: !!session,
    participantCount: participants.length,
    pendingCount: pendingRequests.length,
    isAllOffline
  };
}
