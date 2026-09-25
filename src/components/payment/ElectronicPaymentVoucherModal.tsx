import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Printer,
  Download,
  X,
  CreditCard,
  Building,
  QrCode,
  Clock,
  FileText,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { PaymentVoucher } from '../../types/payment';

interface ElectronicPaymentVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: PaymentVoucher | null;
  onGoToOrderTracking?: (orderNo: string) => void;
  onReprintPrintReceipt?: () => void;
}

export const ElectronicPaymentVoucherModal: React.FC<ElectronicPaymentVoucherModalProps> = ({
  isOpen,
  onClose,
  voucher,
  onGoToOrderTracking,
  onReprintPrintReceipt
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !voucher) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    onReprintPrintReceipt?.();
    window.print();
  };

  return (
    <div
      id="electronic-payment-voucher-modal"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-[5px] border border-[#e2e2dc] shadow-2xl max-w-md w-full overflow-hidden text-neutral-900 relative"
      >
        {/* Top Dark Header */}
        <div className="bg-[#1a1a17] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[5px] bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wide">
                电子支付凭据 · 资金清算回执
              </h3>
              <p className="text-[10px] text-neutral-400 font-mono">
                防伪凭证号：{voucher.voucherNo}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-[5px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Official Ticket Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto bg-[#fafaf8]">
          {/* Main Clearing Stamp Card */}
          <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-2xs text-center space-y-2 relative overflow-hidden">
            {/* Watermark badge */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full border-4 border-emerald-500/10 pointer-events-none flex items-center justify-center -rotate-12">
              <span className="text-[10px] font-black text-emerald-600/30 uppercase tracking-widest">
                VERIFIED
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10.5px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>资金结算清算成功 · 双轨存证承保</span>
            </div>

            <div className="text-3xl font-black text-neutral-950 font-mono">
              <span className="text-xl mr-0.5">¥</span>
              {voucher.paidAmount.toFixed(2)}
            </div>

            <p className="text-xs text-neutral-600 font-medium">
              付款渠道：<span className="font-bold text-neutral-900">{voucher.channelName}</span>
            </p>

            {/* Escrow Status Pill */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-center gap-2">
              {voucher.escrowStatus === 'verified_synced' && (
                <span className="text-[10px] px-2 py-0.5 bg-emerald-100/70 text-emerald-800 rounded font-bold">
                  ● 云端实时对账完成 (同源入账)
                </span>
              )}
              {voucher.escrowStatus === 'local_fallback_escrowed' && (
                <span className="text-[10px] px-2 py-0.5 bg-amber-100/80 text-amber-800 rounded font-bold">
                  ● 离线兜底承保中 (先行制作出单)
                </span>
              )}
              {voucher.escrowStatus === 'reconciled' && (
                <span className="text-[10px] px-2 py-0.5 bg-blue-100/80 text-blue-800 rounded font-bold">
                  ● 异步补偿对账已归档
                </span>
              )}
            </div>
          </div>

          {/* Detailed Verification Information */}
          <div className="p-3.5 rounded-xl bg-white border border-neutral-200 text-xs space-y-2.5">
            <div className="text-[11px] font-black text-neutral-800 uppercase tracking-wider pb-1 border-b border-neutral-100 flex items-center justify-between">
              <span>清算与对账审计详情</span>
              <span className="font-mono text-[9px] text-neutral-400">AUDIT PASS</span>
            </div>

            <div className="grid grid-cols-2 gap-y-2 text-[11px]">
              <div>
                <span className="text-neutral-500 block text-[10px]">关联订单单号</span>
                <span className="font-mono font-bold text-neutral-800 flex items-center gap-1">
                  {voucher.orderNo}
                  <button
                    type="button"
                    onClick={() => copyToClipboard(voucher.orderNo, 'orderNo')}
                    className="text-neutral-400 hover:text-black cursor-pointer"
                  >
                    {copiedField === 'orderNo' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </span>
              </div>

              <div>
                <span className="text-neutral-500 block text-[10px]">清算商户号 / 终端</span>
                <span className="font-mono font-bold text-neutral-800">
                  {voucher.mchId}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-neutral-500 block text-[10px]">第三方网联流水号</span>
                <span className="font-mono font-bold text-neutral-800 break-all flex items-center justify-between gap-1">
                  <span className="text-[10px]">{voucher.transactionId}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(voucher.transactionId, 'transactionId')}
                    className="text-neutral-400 hover:text-black cursor-pointer shrink-0"
                  >
                    {copiedField === 'transactionId' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </span>
              </div>

              <div>
                <span className="text-neutral-500 block text-[10px]">支付完成时间</span>
                <span className="font-mono text-neutral-800 text-[10px]">
                  {voucher.paidTimeFormatted}
                </span>
              </div>

              <div>
                <span className="text-neutral-500 block text-[10px]">就餐方式</span>
                <span className="font-bold text-neutral-800 text-[10px]">
                  {voucher.diningMode}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-neutral-500 block text-[10px]">国密/SHA256 防篡改指纹</span>
                <span className="font-mono text-[9px] text-neutral-600 break-all bg-neutral-50 p-1.5 rounded border border-neutral-200 block">
                  {voucher.securityHash}
                </span>
              </div>
            </div>
          </div>

          {/* Barcode & Offline Anti-counterfeit representation */}
          <div className="p-3.5 rounded-xl bg-white border border-dashed border-neutral-300 text-center space-y-2">
            <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">
              OFFLINE VERIFICATION BARCODE
            </div>

            {/* Visual Simulated Barcode Strip */}
            <div className="h-10 w-full flex items-center justify-center gap-0.5 overflow-hidden px-4">
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-full ${
                    i % 2 === 0
                      ? 'bg-neutral-900'
                      : i % 3 === 0
                      ? 'bg-neutral-700'
                      : 'bg-transparent'
                  }`}
                  style={{ width: `${(i % 4) + 1.5}px` }}
                />
              ))}
            </div>

            <div className="font-mono text-xs font-black tracking-widest text-neutral-800">
              {voucher.offlineRecoveryCode}
            </div>
            <p className="text-[9.5px] text-neutral-500">
              如遇户外离线网络中断，向餐车店员出示此凭据享 100% 优先出餐与赔付保障
            </p>
          </div>

          {/* Ordered Dish Snapshot */}
          {voucher.itemsSnapshot && voucher.itemsSnapshot.length > 0 && (
            <div className="p-3 bg-white rounded-[5px] border border-[#e2e2dc] text-xs space-y-1.5">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">
                餐品明细快照 ({voucher.itemsSnapshot.length} 款)
              </span>
              <div className="space-y-1">
                {voucher.itemsSnapshot.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[11px] text-neutral-700"
                  >
                    <span className="truncate max-w-[200px]">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-mono font-bold text-neutral-900">
                      ¥{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-[#e2e2dc] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 rounded-[5px] border border-[#e2e2dc] hover:bg-[#f4f4f2] text-neutral-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>打印小票</span>
          </button>

          {onGoToOrderTracking && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToOrderTracking(voucher.orderNo);
              }}
              className="flex-1 py-2.5 rounded-[5px] bg-[#1a1a17] hover:bg-black text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>实时雷达配送追踪</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
