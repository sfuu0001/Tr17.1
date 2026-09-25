import React from 'react';
import { Users, AlertTriangle } from 'lucide-react';
import { useTableSynergyBadge } from './useTableSynergyBadge';

interface TableSynergyHeaderPillProps {
  tableCode: string;
}

export function TableSynergyHeaderPill({ tableCode }: TableSynergyHeaderPillProps) {
  const { hasSession, participantCount, pendingCount, isAllOffline } = useTableSynergyBadge(tableCode);

  if (pendingCount > 0) {
    return (
      <span
        className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-[2px] font-bold shrink-0 whitespace-nowrap leading-none flex items-center gap-0.5 animate-pulse shadow-2xs"
        title={`本桌有 ${pendingCount} 位顾客等待扫码授权加入`}
      >
        <AlertTriangle className="w-2.5 h-2.5" />
        <span>{pendingCount}人待批</span>
      </span>
    );
  }

  if (hasSession && participantCount > 1) {
    return (
      <span
        className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-[2px] font-bold shrink-0 whitespace-nowrap leading-none flex items-center gap-0.5"
        title={`本桌正在进行多人协同点餐 (${participantCount}人)`}
      >
        <Users className="w-2.5 h-2.5" />
        <span>{participantCount}人协同</span>
      </span>
    );
  }

  return null;
}
