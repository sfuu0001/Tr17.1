import React from 'react';
import { useDevSimulation } from '../../context/DevSimulationContext';
import { SIMULATION_POINTS_REGISTRY, SimulationPoint } from '../../utils/simulationRegistry';
import { Search, Lock, Unlock, SlidersHorizontal } from 'lucide-react';

interface SimulationProbeProps {
  pointId: string;
  className?: string;
  children?: React.ReactNode;
}

export const SimulationProbe: React.FC<SimulationProbeProps> = ({
  pointId,
  className = '',
  children
}) => {
  const { inspectorMode, isSimulationAllowed, openDevControlCenter } = useDevSimulation();

  const point: SimulationPoint | undefined = SIMULATION_POINTS_REGISTRY.find(
    (p) => p.id === pointId
  );

  if (!inspectorMode) {
    return <>{children}</>;
  }

  return (
    <div className={`relative group/probe ring-2 ring-amber-400/80 rounded-xl transition-all ${className}`}>
      {/* Visual glowing highlight badge */}
      <div className="absolute -top-3 right-2 z-30 flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#121314] text-amber-300 border border-amber-400 text-[10px] font-mono font-bold shadow-lg cursor-pointer animate-pulse hover:animate-none">
        <Search className="w-2.5 h-2.5 text-amber-400" />
        <span>[探测点] {point?.name || pointId}</span>
        {isSimulationAllowed ? (
          <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 bg-emerald-950/80 px-1 rounded">
            <Unlock className="w-2 h-2" /> 解锁
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-[9px] text-rose-400 bg-rose-950/80 px-1 rounded">
            <Lock className="w-2 h-2" /> 锁定
          </span>
        )}
      </div>

      {/* Popover tooltip on hover */}
      <div className="absolute left-2 -bottom-9 z-40 hidden group-hover/probe:flex items-center gap-1.5 px-2 py-1 bg-black/90 text-white rounded-lg text-[10px] border border-neutral-700 shadow-xl pointer-events-none whitespace-nowrap">
        <SlidersHorizontal className="w-3 h-3 text-amber-400" />
        <span>{point?.description || '功能模拟调试点位'}</span>
      </div>

      {children}
    </div>
  );
};
