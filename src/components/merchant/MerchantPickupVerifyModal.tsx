import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  KeyRound,
  CheckCircle2,
  X,
  Bike,
  Store,
  ShieldCheck,
  AlertCircle,
  Clock,
  Volume2,
  Scan,
  PackageCheck
} from 'lucide-react';
import { Order } from '../../types';
import { getOrGeneratePickupCode, getPickupShelfCode, dispatchPickupVerifiedEvent } from '../../utils/pickupCodeEngine';

interface MerchantPickupVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onVerifySuccess: (orderId: string, pickupCode: string) => void;
  showToast: (msg: string) => void;
}

export const MerchantPickupVerifyModal: React.FC<MerchantPickupVerifyModalProps> = ({
  isOpen,
  onClose,
  order,
  onVerifySuccess,
  showToast
}) => {
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !order) return null;

  const expectedPickupCode = getOrGeneratePickupCode(order.orderNo, order.pickupCode);
  const shelfCode = getPickupShelfCode(order.id || order.orderNo, order.pickupShelfCode);
  const cleanOrderNo = (order.orderNo || '').replace(/^#/, '');

  const handleVerify = () => {
    const trimmed = inputCode.trim().toUpperCase().replace(/^(PICKUP:|PK-|#)/i, '');
    if (!trimmed) {
      setErrorMsg('请输入骑手出示的取件码');
      return;
    }

    if (trimmed === expectedPickupCode || trimmed === cleanOrderNo || cleanOrderNo.slice(-4) === trimmed) {
      setErrorMsg('');
      // 广播并通知
      dispatchPickupVerifiedEvent({
        orderId: order.id,
        orderNo: order.orderNo,
        pickupCode: expectedPickupCode,
        pickupShelfCode: shelfCode,
        verifiedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        verifiedBy: '流动餐车扫码核销台',
        channel: order.channelType || 'delivery'
      });

      showToast(`[核销成功] 取件码 ${expectedPickupCode} 校验通过！餐品已移交骑手 ${order.courierName || '专送骑手'}`);
      onVerifySuccess(order.id, expectedPickupCode);
      onClose();
    } else {
      setErrorMsg(`取件码核验失败！当前订单正确取件码为 ${expectedPickupCode}`);
    }
  };

  const handleDirectPass = () => {
    dispatchPickupVerifiedEvent({
      orderId: order.id,
      orderNo: order.orderNo,
      pickupCode: expectedPickupCode,
      pickupShelfCode: shelfCode,
      verifiedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      verifiedBy: '后厨主厨一键放行',
      channel: order.channelType || 'delivery'
    });
    showToast(`[免密放行] 订单 #${cleanOrderNo} 骑手已取餐从 ${shelfCode} 提走`);
    onVerifySuccess(order.id, expectedPickupCode);
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
          <div className="bg-[#201f1d] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Scan className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>骑手取件核销台</span>
                  <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    餐车交接
                  </span>
                </h3>
                <p className="text-[11px] text-neutral-400">核对骑手出示的口令或条码，防错拿漏拿</p>
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

          {/* Body */}
          <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto">
            {/* Order Card Info */}
            <div className="bg-[#fafafa] p-3.5 rounded-xl border border-[#e6e6e4] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded">
                  #{cleanOrderNo}
                </span>
                <span className="text-[11px] font-bold text-[#2b593f] bg-[#edf3ec] border border-[#c4dcbc] px-2 py-0.5 rounded">
                  {shelfCode}
                </span>
              </div>

              <div className="flex items-center justify-between text-neutral-600 text-[11px]">
                <span className="flex items-center gap-1">
                  <Bike className="w-3.5 h-3.5 text-sky-600" />
                  <span>对接骑手: <strong>{order.courierName || '黑曜石极速专送'}</strong></span>
                </span>
                <span className="font-semibold">
                  {order.courierPhone || '138-****-9201'}
                </span>
              </div>

              {/* Items Summary */}
              <div className="pt-2 border-t border-[#efefed] space-y-1">
                <div className="text-[10.5px] text-neutral-400 font-medium">待取餐品:</div>
                <div className="space-y-0.5 max-h-24 overflow-y-auto pr-1">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-800 font-medium truncate">{it.name}</span>
                      <span className="font-bold text-neutral-700">x{it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Expected Code Hint & Direct Paste */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10.5px] text-amber-700 font-bold block">本单系统取件码</span>
                <span className="text-2xl font-black tracking-wider text-amber-950">
                  {expectedPickupCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInputCode(expectedPickupCode)}
                className="px-3 py-1.5 bg-amber-200/80 hover:bg-amber-300 text-amber-950 rounded-lg font-bold text-xs cursor-pointer transition-colors"
              >
                填入该码
              </button>
            </div>

            {/* Input Verification */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-800 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span>输入骑手出示的 4 位取件码 / 扫描枪扫码:</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    setErrorMsg('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerify();
                  }}
                  placeholder={`例如: ${expectedPickupCode}`}
                  className="flex-1 px-3 py-2.5 bg-white border border-neutral-300 rounded-xl font-bold text-base text-neutral-900 focus:outline-none focus:border-neutral-900"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleVerify}
                  className="px-5 py-2.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-xs shrink-0"
                >
                  确认核销
                </button>
              </div>

              {errorMsg && (
                <div className="text-[11px] text-rose-600 flex items-center gap-1 font-medium pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-700 rounded-xl border border-neutral-300 font-bold text-xs cursor-pointer transition-colors"
            >
              取消
            </button>

            <button
              type="button"
              onClick={handleDirectPass}
              className="px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <PackageCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>现场已核对 · 一键放行取餐</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
