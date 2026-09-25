import React, { useState } from 'react';
import { X, Check, Ticket, MessageSquare, AlertCircle } from 'lucide-react';

interface CartNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNote: string;
  onSaveNote: (note: string) => void;
}

export const CartNoteModal: React.FC<CartNoteModalProps> = ({
  isOpen,
  onClose,
  currentNote,
  onSaveNote
}) => {
  const [note, setNote] = useState(currentNote);

  if (!isOpen) return null;

  const quickTags = ['少辣', '多放黑松露酱', '免葱姜蒜', '咖啡去冰免糖', '现烤焦香', '保温密封'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-xl border border-neutral-200 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-1.5 font-bold text-sm text-neutral-900">
            <MessageSquare className="w-4 h-4 text-neutral-600" />
            <span>添加制作与口味备注</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="请输入口味与制作备注（例如：多放洋葱、不要黑胡椒等）"
          rows={3}
          className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-neutral-900 transition-colors"
        />

        <div className="space-y-1">
          <span className="text-[11px] text-neutral-400">常用标签:</span>
          <div className="flex flex-wrap gap-1.5">
            {quickTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setNote((prev) => (prev ? `${prev}，${tag}` : tag))}
                className="text-[11px] px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md border border-neutral-200 cursor-pointer transition-colors"
              >
                +{tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium rounded-lg border border-neutral-200 cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              onSaveNote(note.trim());
              onClose();
            }}
            className="px-4 py-1.5 text-xs bg-neutral-900 hover:bg-black text-white font-bold rounded-lg cursor-pointer"
          >
            保存备注
          </button>
        </div>
      </div>
    </div>
  );
};

interface CartCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  appliedCoupon: string | null;
  onApplyCoupon: (code: string | null) => void;
}

export const CartCouponModal: React.FC<CartCouponModalProps> = ({
  isOpen,
  onClose,
  appliedCoupon,
  onApplyCoupon
}) => {
  const [customCode, setCustomCode] = useState('');

  if (!isOpen) return null;

  const presetCoupons = [
    { code: 'UR-VIP5', label: 'VIP专属立减券', amount: 5 },
    { code: 'UR-RADAR10', label: '雷达首单尝鲜券', amount: 10 },
    { code: 'OB-EATNOW', label: '黑曜石夜市专享券', amount: 5 }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-xl border border-neutral-200 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-1.5 font-bold text-sm text-neutral-900">
            <Ticket className="w-4 h-4 text-emerald-600" />
            <span>选择或兑换优惠券</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value)}
            placeholder="输入兑换码"
            className="flex-1 px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-neutral-900"
          />
          <button
            type="button"
            onClick={() => {
              if (customCode.trim()) {
                onApplyCoupon(customCode.trim());
                onClose();
              }
            }}
            className="px-3 py-1.5 bg-neutral-900 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-black"
          >
            兑换
          </button>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] text-neutral-400">可用卡券:</span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {presetCoupons.map((c) => {
              const isSelected = appliedCoupon === c.code;
              return (
                <div
                  key={c.code}
                  onClick={() => {
                    onApplyCoupon(isSelected ? null : c.code);
                    onClose();
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-500 shadow-2xs'
                      : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-neutral-900">{c.label}</span>
                      <span className="text-[10px] text-neutral-500 tabular-nums">[{c.code}]</span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-bold">立减 ¥{c.amount}.00</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-neutral-300'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-neutral-100 flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              onApplyCoupon(null);
              onClose();
            }}
            className="text-xs text-neutral-500 hover:text-neutral-800 underline cursor-pointer"
          >
            不使用优惠券
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded-lg cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

interface CartClearConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClear: () => void;
}

export const CartClearConfirmModal: React.FC<CartClearConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmClear
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xs bg-white rounded-2xl p-4 shadow-xl border border-neutral-200 space-y-3 text-center">
        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h4 className="font-bold text-sm text-neutral-900">确认清空清单？</h4>
        <p className="text-xs text-neutral-500">清空后所有已选菜品和定制选项将被移除。</p>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmClear();
              onClose();
            }}
            className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer"
          >
            确认清空
          </button>
        </div>
      </div>
    </div>
  );
};
