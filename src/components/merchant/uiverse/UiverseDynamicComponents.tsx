import React, { useState } from 'react';
import { Flame, Sparkles, Radio, Zap, Volume2, ShieldCheck, Check } from 'lucide-react';

/**
 * 1. UIverse Cyber Neon Laser Glow Button (@Gryffindor)
 */
export const UiverseLaserButton: React.FC<{
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'rose' | 'dark';
  className?: string;
}> = ({ label, onClick, icon, variant = 'amber', className = '' }) => {
  const glowMap = {
    emerald: 'shadow-[0_0_18px_rgba(16,185,129,0.45)] hover:shadow-[0_0_24px_rgba(16,185,129,0.7)] border-emerald-400 text-emerald-300',
    amber: 'shadow-[0_0_18px_rgba(245,158,11,0.45)] hover:shadow-[0_0_24px_rgba(245,158,11,0.7)] border-amber-400 text-amber-300',
    rose: 'shadow-[0_0_18px_rgba(244,63,94,0.5)] hover:shadow-[0_0_24px_rgba(244,63,94,0.8)] border-rose-400 text-rose-300',
    dark: 'shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] border-neutral-600 text-white'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative group overflow-hidden px-3.5 py-1.5 rounded-full font-sans text-xs font-bold border transition-all duration-300 cursor-pointer active:scale-95 flex items-center gap-1.5 max-w-full ${glowMap[variant]} ${className}`}
    >
      {/* Laser light beam sweep */}
      <span className="absolute top-0 left-0 w-[40px] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 -translate-x-[60px] group-hover:translate-x-[240px] transition-transform duration-700 pointer-events-none" />
      {icon || <Zap className="w-3.5 h-3.5 animate-pulse" />}
      <span className="relative z-10">{label}</span>
    </button>
  );
};

/**
 * 2. UIverse 3D Tactile Push Button (@Pradeeps99)
 */
export const UiverseTactile3DButton: React.FC<{
  label: string;
  onClick?: () => void;
  tone?: 'emerald' | 'amber' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}> = ({ label, onClick, tone = 'emerald', icon, className = '' }) => {
  const toneMap = {
    emerald: 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_4px_0_#064e3b] active:shadow-none text-white',
    amber: 'bg-amber-600 hover:bg-amber-500 shadow-[0_4px_0_#78350f] active:shadow-none text-white',
    neutral: 'bg-neutral-800 hover:bg-neutral-700 shadow-[0_4px_0_#171717] active:shadow-none text-neutral-100'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 font-bold text-xs rounded-xl transition-all duration-75 active:translate-y-1 cursor-pointer flex items-center gap-1.5 ${toneMap[tone]} ${className}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

/**
 * 3. UIverse Cosmic Light Trail Card (@Yaya12085)
 */
export const UiverseCosmicCard: React.FC<{
  children: React.ReactNode;
  urgency?: 'normal' | 'warn' | 'flame';
  className?: string;
}> = ({ children, urgency = 'normal', className = '' }) => {
  const gradientMap = {
    normal: 'from-emerald-500 via-teal-400 to-cyan-500',
    warn: 'from-amber-500 via-orange-400 to-amber-600',
    flame: 'from-rose-600 via-amber-500 to-rose-600'
  };

  return (
    <div className={`relative p-[1.5px] rounded-xl overflow-hidden bg-gradient-to-r ${gradientMap[urgency]} transition-all shadow-md group ${className}`}>
      {/* Rotating conic light sweep overlay */}
      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.4),transparent_40%)] animate-[spin_4s_linear_infinite] pointer-events-none opacity-60 group-hover:opacity-100" />
      <div className="relative rounded-[10px] bg-neutral-900 text-white p-3.5 z-10">
        {children}
      </div>
    </div>
  );
};

/**
 * 4. UIverse Holographic Tilt Glass Card (@satyamchaudharydev)
 */
export const UiverseHoloCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`relative rounded-2xl backdrop-blur-lg bg-white/85 border border-white/60 shadow-[0_12px_32px_rgba(0,0,0,0.06)] p-3.5 transition-all duration-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 overflow-hidden ${className}`}>
      {/* Iridescent gloss highlight */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-300/20 via-pink-300/15 to-transparent rounded-full pointer-events-none blur-xl" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

/**
 * 5. UIverse Sonar Radar Ping Beacon Tag (@RadarSense)
 */
export const UiverseSonarBeacon: React.FC<{
  label: string;
  tone?: 'emerald' | 'amber' | 'blue' | 'rose';
}> = ({ label, tone = 'emerald' }) => {
  const config = {
    emerald: { bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300', dot: 'bg-emerald-400', ping: 'bg-emerald-400' },
    amber: { bg: 'bg-amber-950/80 border-amber-500/50 text-amber-300', dot: 'bg-amber-400', ping: 'bg-amber-400' },
    blue: { bg: 'bg-blue-950/80 border-blue-500/50 text-blue-300', dot: 'bg-blue-400', ping: 'bg-blue-400' },
    rose: { bg: 'bg-rose-950/80 border-rose-500/50 text-rose-300', dot: 'bg-rose-400', ping: 'bg-rose-400' }
  }[tone];

  return (
    <span className={`relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold border max-w-full truncate ${config.bg} shadow-sm`}>
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.ping}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
};

/**
 * 6. UIverse Flame Sizzle Badge (@FireStorm)
 */
export const UiverseFlameTag: React.FC<{
  label: string;
  count?: number;
}> = ({ label, count }) => {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-rose-600 via-orange-600 to-amber-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse border border-rose-300/40 shrink-0 max-w-full">
      <Flame className="w-2.5 h-2.5 fill-amber-300 text-amber-300 animate-bounce shrink-0" />
      <span className="truncate">{label}</span>
      {count !== undefined && <span className="bg-black/30 px-1 rounded text-[9.5px] shrink-0">x{count}</span>}
    </span>
  );
};

/**
 * 7. UIverse Arcade Heavy Rocker Switch (@ViperGamer)
 */
export const UiverseArcadeToggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}> = ({ checked, onChange, label }) => {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none border ${
          checked
            ? 'bg-emerald-950 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
            : 'bg-neutral-900 border-neutral-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-300 ${
            checked
              ? 'translate-x-6 bg-emerald-400 shadow-[0_0_8px_#10b981]'
              : 'translate-x-1 bg-neutral-500'
          }`}
        />
      </button>
      {label && <span className="text-xs font-semibold text-neutral-300">{label}</span>}
    </label>
  );
};

/**
 * 8. UIverse Live Audio Equalizer Wave (@SoundWave)
 */
export const UiverseAudioEqualizer: React.FC<{ active?: boolean }> = ({ active = true }) => {
  return (
    <div className="flex items-end gap-[3px] h-4 px-1" title={active ? '语音正在广播中' : '广播就绪'}>
      <span className={`w-1 bg-emerald-400 rounded-full transition-all duration-200 ${active ? 'animate-[pulse_0.6s_ease-in-out_infinite] h-4' : 'h-1 bg-neutral-500'}`} />
      <span className={`w-1 bg-emerald-400 rounded-full transition-all duration-300 ${active ? 'animate-[pulse_0.4s_ease-in-out_infinite_0.1s] h-2.5' : 'h-1 bg-neutral-500'}`} />
      <span className={`w-1 bg-emerald-400 rounded-full transition-all duration-250 ${active ? 'animate-[pulse_0.7s_ease-in-out_infinite_0.2s] h-3.5' : 'h-1 bg-neutral-500'}`} />
      <span className={`w-1 bg-emerald-400 rounded-full transition-all duration-350 ${active ? 'animate-[pulse_0.5s_ease-in-out_infinite_0.3s] h-2' : 'h-1 bg-neutral-500'}`} />
    </div>
  );
};

/**
 * 9. UIverse 360° Polar Radar Sonar Loader (@SonarLab)
 */
export const UiverseRadarSonar: React.FC<{ size?: number }> = ({ size = 64 }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className="relative rounded-full border border-emerald-500/40 bg-emerald-950/80 overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center shrink-0"
    >
      {/* Concentric grid circles */}
      <div className="absolute inset-1.5 rounded-full border border-emerald-500/25" />
      <div className="absolute inset-4 rounded-full border border-emerald-500/25" />
      <div className="absolute w-full h-[1px] bg-emerald-500/20" />
      <div className="absolute h-full w-[1px] bg-emerald-500/20" />

      {/* Sweeping radar cone */}
      <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(16,185,129,0.6)_360deg)] animate-[spin_2.5s_linear_infinite]" />

      {/* Target ping blip */}
      <span className="absolute top-2.5 right-3 w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
      <span className="absolute top-2.5 right-3 w-1.5 h-1.5 rounded-full bg-emerald-300" />
    </div>
  );
};
