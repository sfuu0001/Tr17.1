import React from 'react';
import { Users } from 'lucide-react';
import { TableSession } from '../../../types/tableSession';
import { useTableSynergyBadge } from './useTableSynergyBadge';
import { getOpenSessionByTableCode } from '../../../utils/tableSessionEngine';

interface TableCardSynergyFooterActionProps {
  tableCode: string;
  onOpenSynergyDrawer: (session: TableSession) => void;
}

export function TableCardSynergyFooterAction({
  tableCode,
  onOpenSynergyDrawer
}: TableCardSynergyFooterActionProps) {
  const { hasSession, participantCount, pendingCount } = useTableSynergyBadge(tableCode);

  if (!hasSession) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        const sess = getOpenSessionByTableCode(tableCode);
        if (sess) onOpenSynergyDrawer(sess);
      }}
      className={`shrink-0 py-1 px-1.5 sm:px-2 rounded-[3px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
        pendingCount > 0
          ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 animate-pulse'
          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
      }`}
      title={`协同监管：当前 ${participantCount} 人在线/在座${pendingCount > 0 ? `，${pendingCount}人待审批` : ''}`}
    >
      <Users className="w-3 h-3 text-emerald-700 shrink-0" />
      <span>协同{participantCount > 0 ? `(${participantCount})` : ''}</span>
    </button>
  );
}
