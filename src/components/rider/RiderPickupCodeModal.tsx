import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  Barcode,
  Copy,
  CheckCircle2,
  X,
  Store,
  MapPin,
  ShieldCheck,
  Volume2,
  KeyRound,
  Sparkles,
  AlertCircle,
  Clock,
  Layers,
  Thermometer
} from 'lucide-react';
import { ActiveDeliveryOrder } from '../../types';
import { getOrGeneratePickupCode, getPickupShelfCode, dispatchPickupVerifiedEvent } from '../../utils/pickupCodeEngine';

interface RiderPickupCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ActiveDeliveryOrder;
  onConfirmPickup: () => void;
  showToast: (msg: string) => void;
}

export const RiderPickupCodeModal: React.FC<RiderPickupCodeModalProps> = ({
  isOpen,
  onClose,
  order,
  onConfirmPickup,
  showToast
}) => {
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const pickupCode = getOrGeneratePickupCode(order.orderNo, order.pickupCode);
  const shelfCode = getPickupShelfCode(order.id || order.orderNo, order.pickupShelfCode);
  const cleanOrderNo = (order.orderNo || '').replace(/^#/, '');

  const handleCopyCode = () => {
    navigator.clipboard?.writeText?.(pickupCode);
    setCopied(true);
    showToast(`取件码 ${pickupCode} 已复制`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualVerify = () => {
    const trimmed = manualCodeInput.trim().toUpperCase();
    if (!trimmed) {
      setInputError('请输入 4 位取件核销码');
      return;
    }

    if (trimmed === pickupCode || trimmed === `PK-${pickupCode}` || trimmed === cleanOrderNo) {
      setInputError('');
      // 广播核销
      dispatchPickupVerifiedEvent({
        orderId: order.id,
        orderNo: order.orderNo,
        pickupCode,
        pickupShelfCode: shelfCode,
        verifiedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        verifiedBy: '骑手手动核验',
        channel: 'delivery'
      });
      showToast(`取件码 ${pickupCode} 核销成功！餐品已成功交接。`);
      onConfirmPickup();
      onClose();
    } else {
      setInputError(`取件码不匹配，该订单正确核销码为 ${pickupCode}`);
    }
  };

  const handleDirectConfirm = () => {
    dispatchPickupVerifiedEvent({
      orderId: order.id,
      orderNo: order.orderNo,
      pickupCode,
      pickupShelfCode: shelfCode,
      verifiedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      verifiedBy: '骑手现场交接',
      channel: 'delivery'
    });
    showToast(`已确认凭取件码 ${pickupCode} 从 ${shelfCode} 提货！`);
    onConfirmPickup();
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white text-[#37352f] w-full max-w-md rounded-2xl border border-[#e6e6e4] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-[#1e1e1c] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-1.5 font-mono">
                  <span>餐车取件核销码</span>
                  <span className="text-[10.5px] font-sans font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    专送提货凭证
                  </span>
                </h3>
                <p className="text-[11px] text-neutral-400">出示给餐车主厨扫码核销，或核对后取餐</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
            {/* 1. Large Code Card with High Contrast */}
            <div className="bg-gradient-to-b from-[#fbfbfa] to-[#f4f4f2] p-4 rounded-2xl border border-[#e6e6e4] text-center space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-[#787774] border-b border-[#e6e6e4] pb-2">
                <span className="flex items-center gap-1 font-medium">
                  <Store className="w-3.5 h-3.5 text-amber-600" />
                  <span>{order.truckName}</span>
                </span>
                <span className="font-mono font-bold text-neutral-800 bg-neutral-200/80 px-2 py-0.5 rounded">
                  #{cleanOrderNo}
                </span>
              </div>

              {/* Big Digit Code */}
              <div className="py-2">
                <div className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider mb-1">
                  骑手提货专属口令
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-[#1a1c1b] select-all bg-white px-5 py-2 rounded-xl border-2 border-[#201f1d] shadow-sm">
                    {pickupCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl border border-neutral-300 transition-colors cursor-pointer"
                    title="复制取件码"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Shelf & Hotbox Location */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 flex items-center justify-between text-amber-900">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                    格
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-xs block">{shelfCode}</span>
                    <span className="text-[10px] text-amber-700">恒温 68℃ 密封保温存放</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-200/60 text-amber-900 border border-amber-300">
                  待取餐
                </span>
              </div>

              {/* Barcode & QR code visual representation */}
              <div className="bg-white p-3 rounded-xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-neutral-400 text-[10.5px]">
                  <Barcode className="w-3.5 h-3.5" />
                  <span>餐车扫码枪扫描条码</span>
                </div>

                {/* Simulated High-Res Barcode */}
                <div className="flex justify-center items-center py-1">
                  <div className="flex items-end gap-[2px] h-10 px-4">
                    {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2, 3, 1].map((w, i) => (
                      <div
                        key={i}
                        className={`h-full bg-neutral-900 ${w === 1 ? 'w-[1.5px]' : w === 2 ? 'w-[3px]' : w === 3 ? 'w-[4px]' : 'w-[5px]'}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="font-mono text-center text-[11px] font-bold tracking-widest text-neutral-600">
                  PICKUP-{pickupCode}
                </div>
              </div>
            </div>

            {/* 2. Order Items Checklist Preview */}
            <div className="bg-white p-3 rounded-xl border border-[#e6e6e4] space-y-2">
              <div className="flex items-center justify-between text-neutral-700 font-bold">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>核对取餐餐品 ({order.items.length} 件)</span>
                </span>
                <span className="text-[10.5px] text-neutral-500 font-mono">
                  总计 ¥{order.totalPrice.toFixed(1)}
                </span>
              </div>

              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {order.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-neutral-50 border border-neutral-200/60 text-[11px]"
                  >
                    <span className="font-medium text-neutral-800 truncate">{it.name}</span>
                    <span className="font-mono font-bold text-neutral-700 shrink-0 ml-2">x{it.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Manual Verify Code Input */}
            <div className="bg-[#fafafa] p-3 rounded-xl border border-[#e6e6e4] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-neutral-700">
                  手动核验取件（输入出餐小票码）:
                </label>
                <button
                  type="button"
                  onClick={() => setManualCodeInput(pickupCode)}
                  className="text-[10.5px] text-sky-700 hover:text-sky-900 font-semibold cursor-pointer underline"
                >
                  一键填入匹配码
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualCodeInput}
                  onChange={(e) => {
                    setManualCodeInput(e.target.value);
                    setInputError('');
                  }}
                  placeholder="输入 4 位取件码，如 8821"
                  className="flex-1 px-3 py-2 bg-white border border-neutral-300 rounded-xl font-mono font-bold text-sm text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
                <button
                  type="button"
                  onClick={handleManualVerify}
                  className="px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-xs shrink-0"
                >
                  核销
                </button>
              </div>

              {inputError && (
                <div className="text-[10.5px] text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>{inputError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="p-4 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-700 rounded-xl border border-neutral-300 font-bold text-xs cursor-pointer transition-colors"
            >
              稍后出示
            </button>

            <button
              type="button"
              onClick={handleDirectConfirm}
              className="flex-1 px-4 py-2.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 shadow-xs transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>已出示取件码 · 确认取餐并开始配送</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
