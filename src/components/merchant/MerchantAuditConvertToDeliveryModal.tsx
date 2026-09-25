import React, { useState } from 'react';
import {
  ShieldAlert,
  X,
  Bike,
  CheckCircle2,
  Utensils,
  MapPin,
  Phone,
  User,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Order } from '../../types';
import { BeautifiedDropdownMenu, BeautifiedDropdownItem } from '../common/BeautifiedDropdownMenu';

const AUDIT_REASON_OPTIONS: BeautifiedDropdownItem[] = [
  {
    value: '食客现场有急事需离店，主动申请改由骑手专送至办公位',
    label: '食客急事离店专送',
    description: '食客现场有急事需离店，主动申请改由骑手专送至办公位',
    badge: '离店申请',
    icon: User
  },
  {
    value: '食客临时加开紧急会议，改由骑手送至会议室',
    label: '加开紧急会议改送',
    description: '食客临时加开紧急会议，改由骑手送至指定办公会议室',
    badge: '会议改送',
    icon: FileText
  },
  {
    value: '外摆区天气突变风雨较大，协助转送回顾客室内地址',
    label: '天气突变室内改送',
    description: '外摆区天气突变风雨较大，协助转送回顾客室内地址',
    badge: '天气应急',
    icon: AlertTriangle
  },
  {
    value: '顾客在店已打包完毕，现场委托呼叫专送骑手派送',
    label: '打包完毕代叫骑手',
    description: '顾客在店已打包完毕，现场委托档口呼叫专送骑手派送',
    badge: '代客叫送',
    icon: Bike
  },
];

interface MerchantAuditConvertToDeliveryModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmConvert: (
    order: Order,
    deliveryAddress: string,
    customerPhone: string,
    auditReason: string,
    extraDeliveryFee: number
  ) => void;
}

export const MerchantAuditConvertToDeliveryModal: React.FC<MerchantAuditConvertToDeliveryModalProps> = ({
  order,
  isOpen,
  onClose,
  onConfirmConvert
}) => {
  if (!isOpen || !order) return null;

  const defaultAddress = order.deliveryAddress?.includes('号桌')
    ? '西藏北路 166 号静安大悦城商务楼 1208 室'
    : order.deliveryAddress || '西藏北路 166 号静安大悦城商务楼 1208 室';

  const [deliveryAddress, setDeliveryAddress] = useState<string>(defaultAddress);
  const [customerPhone, setCustomerPhone] = useState<string>(order.userPhone || '138-8888-9201');
  const [auditReason, setAuditReason] = useState<string>('食客现场有急事需离店，主动申请改由骑手专送至办公位');
  const [extraDeliveryFee, setExtraDeliveryFee] = useState<number>(0);
  const [reviewerName, setReviewerName] = useState<string>('店长阿豪 (主理人审核)');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) {
      alert('请填写准确的外卖配送地址');
      return;
    }
    if (!customerPhone.trim()) {
      alert('请填写收件人联系电话');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onConfirmConvert(order, deliveryAddress.trim(), customerPhone.trim(), auditReason, extraDeliveryFee);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-[3px] border border-[#d3d1cb] shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 bg-[#2f343b] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[2px] bg-amber-400 text-black flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>堂食转外卖专送 · 商家人工审核</span>
                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-[2px] bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  安全分流管控
                </span>
              </h3>
              <p className="text-[10.5px] text-neutral-300">
                规范要求：堂食订单默认不进入骑手端，仅限商家核实后转为骑手外送
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Policy Box */}
        <div className="p-3 bg-[#fffbe6] border-b border-[#ffe58f] flex items-start gap-2.5 text-xs text-[#874d00] shrink-0">
          <AlertTriangle className="w-4 h-4 text-[#faad14] shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>业务隔离规范说明：</strong> 为保障现场堂食出餐效率与骑手配送运力，堂食订单禁止自动同步至骑手抢单池。若食客提出转送需求，需在此审核确认收货地址与联系电话。审核通过后，该订单将正式变更为外卖订单并推送到骑手端抢单池。
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
          {/* Order Summary Card */}
          <div className="p-3 bg-[#f7f7f5] rounded-[3px] border border-[#e6e6e4] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs bg-[#37352f] text-white px-2 py-0.5 rounded-[2px]">
                  #{order.orderNo.replace(/^#/, '')}
                </span>
                <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-[2px] flex items-center gap-1">
                  <Utensils className="w-3 h-3 text-amber-700" />
                  <span>当前渠道: 现场堂食</span>
                </span>
              </div>
              <span className="font-bold text-sm text-black font-amount">
                ¥{order.totalAmount.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#787774] pt-1 border-t border-[#e6e6e4]">
              <div>
                <span>原就餐桌台: </span>
                <strong className="text-[#37352f]">{order.tableCode ? `${order.tableCode} 号桌` : '外摆 A1/A2 桌'}</strong>
              </div>
              <div>
                <span>食客姓名: </span>
                <span className="text-[#37352f]">{order.customerName || '先锋食客'}</span>
              </div>
              <div className="col-span-2">
                <span>包含餐品: </span>
                <span className="text-[#37352f]">{order.items.map(i => `${i.name} x${i.quantity}`).join('、')}</span>
              </div>
            </div>
          </div>

          {/* Flow Visual Step */}
          <div className="p-2.5 bg-[#f0f7f2] border border-[#c6e5d2] rounded-[3px] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold">
              <Utensils className="w-3.5 h-3.5" />
              <span>现场堂食就餐</span>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-600" />
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <Bike className="w-3.5 h-3.5" />
              <span>骑手急送专送</span>
            </div>
          </div>

          {/* Input 1: Delivery Address */}
          <div>
            <label className="block text-xs font-bold text-[#37352f] mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>骑手配送目的地详细地址 <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              required
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="例如：静安大悦城商务楼 1208 室"
              className="w-full px-3 py-1.5 bg-white border border-[#d3d1cb] rounded-[2px] text-xs font-medium focus:outline-hidden focus:border-[#37352f]"
            />
            <div className="flex gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => setDeliveryAddress('西藏北路 166 号静安大悦城商务座 1208 室')}
                className="text-[10px] text-neutral-500 bg-neutral-100 hover:bg-neutral-200 px-1.5 py-0.5 rounded-[2px] cursor-pointer"
              >
                填入: 大悦城商务座 1208 室
              </button>
              <button
                type="button"
                onClick={() => setDeliveryAddress('曲阜路 180 号河滨花园 3 幢 602')}
                className="text-[10px] text-neutral-500 bg-neutral-100 hover:bg-neutral-200 px-1.5 py-0.5 rounded-[2px] cursor-pointer"
              >
                填入: 河滨花园 3 幢
              </button>
            </div>
          </div>

          {/* Input 2: Customer Phone */}
          <div>
            <label className="block text-xs font-bold text-[#37352f] mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-sky-600" />
              <span>收件人联系电话 <span className="text-red-500">*</span></span>
            </label>
            <input
              type="tel"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="例如：138-8888-9201"
              className="w-full px-3 py-1.5 bg-white border border-[#d3d1cb] rounded-[2px] text-xs focus:outline-hidden focus:border-[#37352f]"
            />
          </div>

          {/* Input 3: Audit Reason */}
          <div>
            <label className="block text-xs font-bold text-[#37352f] mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-neutral-600" />
              <span>转外卖审核原因与处置说明</span>
            </label>
            <BeautifiedDropdownMenu
              items={AUDIT_REASON_OPTIONS}
              value={auditReason}
              onChange={(val) => setAuditReason(val)}
              groupTitle="审核改派处置理由"
              className="w-full mb-1.5"
            />
          </div>

          {/* Extra Delivery Fee Option */}
          <div className="p-2.5 bg-[#f7f7f5] rounded-[2px] border border-[#e6e6e4] flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-[#37352f]">加收打包外送费</span>
              <p className="text-[10px] text-[#787774]">按餐车标准配送服务费核算</p>
            </div>
            <div className="flex items-center gap-2">
              {[0, 5].map((fee) => (
                <button
                  key={fee}
                  type="button"
                  onClick={() => setExtraDeliveryFee(fee)}
                  className={`px-2.5 py-1 rounded-[2px] font-bold text-xs cursor-pointer border ${
                    extraDeliveryFee === fee
                      ? 'bg-[#37352f] text-white border-[#37352f]'
                      : 'bg-white text-neutral-700 border-[#d3d1cb]'
                  }`}
                >
                  {fee === 0 ? '免收外送费 (¥0)' : '+¥5.00 专送费'}
                </button>
              ))}
            </div>
          </div>

          {/* Audit Signer */}
          <div className="flex items-center justify-between text-[11px] text-[#787774] pt-1">
            <span>审核执行人: <strong className="text-black">{reviewerName}</strong></span>
            <span className="text-emerald-700 font-medium">SOP安全风控已就绪</span>
          </div>

          {/* Footer Actions inside Form */}
          <div className="pt-3 border-t border-[#e6e6e4] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white hover:bg-[#f7f7f5] text-[#37352f] border border-[#d3d1cb] rounded-[2px] font-semibold text-xs cursor-pointer transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[2px] font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-98 disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isSubmitting ? '正在分流转单...' : '审核通过 · 转为骑手专送'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
