import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCascadeAuth } from '../../context/CascadeAuthContext';
import { CascadeAuthFullMatrixView } from './CascadeAuthFullMatrixView';

interface CascadeAuthIdentityBadgeProps {
  onNavigateToPlatformMatrix?: () => void;
}

export const CascadeAuthIdentityBadge: React.FC<CascadeAuthIdentityBadgeProps> = ({
  onNavigateToPlatformMatrix
}) => {
  const { activeIdentity } = useCascadeAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mini badge button in top bar */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1a1a17] hover:bg-black text-white text-[11px] font-mono tracking-tight shadow-2xs border border-white/10 transition-all cursor-pointer group shrink-0"
        title="点击展开全域级联穿透 (4-Level Mesh) 分层授权控制台"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-bold">{activeIdentity.tier}</span>
        <span className="opacity-70 max-w-[80px] sm:max-w-[110px] truncate">
          {activeIdentity.name}
        </span>
        <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-white transition-transform" />
      </button>

      {/* Full-Screen Cascade Auth HUD Command Center */}
      <CascadeAuthFullMatrixView
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onNavigateToPlatformMatrix={onNavigateToPlatformMatrix}
      />
    </>
  );
};

export default CascadeAuthIdentityBadge;
