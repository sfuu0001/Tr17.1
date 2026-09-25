import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

/**
 * Urban Radar 风格返回按钮：直立边框 (rounded-none)、碳黑描边、悬停反色。
 * 用于替代原先 Header 中的全局子路由返回工具条，将返回能力下沉到各子页面自身。
 */
export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label = '返回点餐',
  className = ''
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`group inline-flex items-center gap-1.5 px-2.5 py-1 border border-[#1a1a17] bg-white text-[11px] font-bold tracking-wide text-[#1a1a17] transition-colors cursor-pointer rounded-none hover:bg-[#1a1a17] hover:text-white ${className}`}
    >
      <ArrowLeft className="w-3.5 h-3.5 stroke-[2.2] transition-transform group-hover:-translate-x-0.5" />
      <span>{label}</span>
    </button>
  );
};
