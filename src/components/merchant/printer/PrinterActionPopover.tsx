import React, { useEffect, useRef } from 'react';
import { 
  Check, 
  Sliders, 
  Play, 
  Trash2, 
  Power,
  Printer
} from 'lucide-react';

export interface PrinterActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isDefault?: boolean;
  isConnected?: boolean;
  onSetDefault: () => void;
  onOpenConfig: () => void;
  onTestPrint: () => void;
  onToggleConnect?: () => void;
  onDelete?: () => void;
  anchorPosition?: { top: number; right: number };
}

export const PrinterActionPopover: React.FC<PrinterActionMenuProps> = ({
  isOpen,
  onClose,
  isDefault = false,
  isConnected = true,
  onSetDefault,
  onOpenConfig,
  onTestPrint,
  onToggleConnect,
  onDelete
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute right-3 top-10 w-36 rounded-xl backdrop-blur-xl bg-white/95 border border-neutral-200/90 shadow-xl shadow-neutral-950/10 p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="space-y-0.5">
        {/* 设为默认 */}
        <button
          type="button"
          onClick={() => {
            onSetDefault();
            onClose();
          }}
          disabled={isDefault}
          className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
            isDefault
              ? 'text-neutral-400 bg-neutral-50 cursor-default'
              : 'text-neutral-800 hover:bg-neutral-100 hover:text-neutral-950'
          }`}
        >
          <span className="font-medium">设为默认</span>
          {isDefault && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
        </button>

        {/* 配置 */}
        <button
          type="button"
          onClick={() => {
            onOpenConfig();
            onClose();
          }}
          className="w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between text-neutral-800 hover:bg-neutral-100 hover:text-neutral-950 transition-colors cursor-pointer"
        >
          <span className="font-medium">配置</span>
          <Sliders className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        </button>

        {/* 测试打印 */}
        <button
          type="button"
          onClick={() => {
            onTestPrint();
            onClose();
          }}
          className="w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between text-neutral-800 hover:bg-neutral-100 hover:text-neutral-950 transition-colors cursor-pointer"
        >
          <span className="font-medium">测试打印</span>
          <Play className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        </button>

        {/* 连接/断开 */}
        {onToggleConnect && (
          <button
            type="button"
            onClick={() => {
              onToggleConnect();
              onClose();
            }}
            className="w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between text-neutral-800 hover:bg-neutral-100 hover:text-neutral-950 transition-colors cursor-pointer"
          >
            <span className="font-medium">{isConnected ? '断开连接' : '重新连接'}</span>
            <Power className={`w-3.5 h-3.5 ${isConnected ? 'text-amber-500' : 'text-emerald-500'} shrink-0`} />
          </button>
        )}

        {/* 分割线与删除 */}
        {onDelete && (
          <>
            <div className="my-1 border-t border-neutral-100" />
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <span className="font-medium">删除</span>
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
