import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem } from '../types';

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToCart?: () => void;
  items: CartItem[];
  deliveryAddress: string;
  onEditAddress?: () => void;
  isVIPActive?: boolean;
  onCompletePayment: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  isOpen,
  onClose,
  onBackToCart,
  items,
  deliveryAddress,
  onEditAddress,
  isVIPActive = true,
  onCompletePayment
}) => {
  const [selectedPayment, setSelectedPayment] = useState<'card' | 'wechat' | 'alipay'>('card');
  const [isChangingPayment, setIsChangingPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);

  if (!isOpen) return null;

  // Use actual cart items if available, otherwise default to the exact screenshot items
  const displayItems =
    items && items.length > 0
      ? items.map((item) => ({
          name: item.dish.name,
          quantity: item.quantity,
          price: item.calculatedPrice
        }))
      : [
          {
            name: 'Artisan Espresso Blend',
            quantity: 2,
            price: 9.0
          },
          {
            name: 'Avocado Sourdough Toast',
            quantity: 1,
            price: 12.0
          }
        ];

  const subtotal = displayItems.reduce((sum, item) => sum + item.price, 0);
  const tax = Number((subtotal * 0.085).toFixed(2));
  const deliveryFee = 4.5;
  const discount = isVIPActive ? 2.0 : 0;
  const grandTotal = Math.max(0, subtotal + tax + deliveryFee - discount);

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsPaidSuccess(true);
      setTimeout(() => {
        onCompletePayment();
        onClose();
        setIsPaidSuccess(false);
      }, 1400);
    }, 850);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Success Celebration Overlay with SVG Draw Path */}
      <AnimatePresence>
        {isPaidSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white text-center"
          >
            {/* Confetti Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => {
                const angle = (i / 20) * 360;
                const distance = 80 + Math.random() * 120;
                const rad = (angle * Math.PI) / 180;
                const tx = Math.cos(rad) * distance;
                const ty = Math.sin(rad) * distance;
                const colors = ['#2b593f', '#10b981', '#34d399', '#fbf3db', '#d97706', '#ffffff'];
                const color = colors[i % colors.length];

                return (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                    animate={{
                      x: tx,
                      y: ty,
                      scale: [0, 1.2, 0.8],
                      opacity: [1, 1, 0],
                      rotate: Math.random() * 360,
                    }}
                    transition={{ duration: 1.1, ease: 'easeOut' }}
                    className="absolute top-1/2 left-1/2 rounded-full"
                    style={{
                      width: 6 + Math.random() * 6,
                      height: 6 + Math.random() * 6,
                      backgroundColor: color,
                    }}
                  />
                );
              })}
            </div>

            {/* SVG Checkmark Path Drawing Animation */}
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <svg className="w-10 h-10 text-emerald-400" viewBox="0 0 24 24" fill="none">
                <motion.circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
                <motion.path
                  d="M7 12.5L10.5 16L17 8.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
                />
              </svg>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-1"
            >
              <h3 className="text-xl font-black text-white">支付成功！</h3>
              <p className="text-xs text-neutral-300">订单已发送至厨房后厨实时接单制作</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="w-full sm:max-w-[400px] min-h-screen sm:min-h-0 bg-[#fbfbfa] sm:rounded-2xl shadow-2xl border-0 sm:border border-[#e6e6e2] flex flex-col justify-between overflow-hidden select-none animate-in zoom-in-95 duration-150">
        {/* Top Header */}
        <header className="px-5 py-3.5 border-b border-[#ebebe8] flex items-center justify-between bg-[#fbfbfa] shrink-0">
          <button
            type="button"
            onClick={onBackToCart || onClose}
            className="w-8 h-8 -ml-1 flex items-center justify-center text-[#1c1c1c] hover:bg-black/5 active:scale-95 transition-all cursor-pointer rounded-full"
            title="返回"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </button>

          <h2 className="text-[16px] font-bold text-[#1c1c1c] tracking-tight text-center flex-1 pr-7">
            确认订单与支付
          </h2>
        </header>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Section 1: DELIVERY ADDRESS */}
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#73736c] font-bold block mb-1.5">
              配送收货地址
            </span>

            <div className="text-[15px] font-bold text-[#1c1c1c] leading-[1.35]">
              <p>{deliveryAddress || '123 Market Street, Apt 4B'}</p>
              <p>
                {deliveryAddress && (deliveryAddress.includes('上海') || deliveryAddress.includes('中庭'))
                  ? '上海市静安区 200040'
                  : 'San Francisco, CA 94105'}
              </p>
            </div>

            <div className="mt-1.5">
              <button
                type="button"
                onClick={onEditAddress}
                className="text-[13px] font-semibold text-[#1c1c1c] underline underline-offset-2 hover:opacity-75 transition-opacity cursor-pointer"
              >
                修改收货地址
              </button>
            </div>
          </div>

          <div className="border-b border-[#ebebe8] pt-1" />

          {/* Section 2: ORDER ITEMS */}
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#73736c] font-bold block mb-2.5">
              已选餐品明细
            </span>

            <div className="space-y-3">
              {displayItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-[15px]"
                >
                  <span className="font-bold text-[#1c1c1c] truncate max-w-[200px]">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-6 shrink-0">
                    <span className="text-[#73736c] font-medium text-[13px]">
                      {item.quantity}x
                    </span>
                    <span className="font-bold text-[#1c1c1c] min-w-[54px] text-right">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-[#ebebe8] pt-1" />

          {/* Section 3: Cost Breakdown */}
          <div className="space-y-2 text-[14px]">
            <div className="flex justify-between text-[#73736c] font-medium">
              <span>餐品小计</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-[#73736c] font-medium">
              <span>税费 (8.5%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-[#73736c] font-medium">
              <span>极速专送配送费</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-[#73736c] font-medium">
                <span>黑卡尊享立减折扣</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="border-b border-[#ebebe8] pt-1" />

          {/* Section 4: Total & Payment Method Card */}
          <div className="space-y-3.5 pt-1">
            {/* Total Row */}
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-bold text-[#1c1c1c]">
                合计应付
              </span>
              <span className="text-[16px] font-bold text-[#1c1c1c]">
                ${grandTotal.toFixed(2)}
              </span>
            </div>

            {/* Payment Method Container (Matching screenshot rounded box) */}
            <div className="px-4 py-3 bg-[#f2f2ef] rounded-xl border border-[#e8e8e4] flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Clean Credit Card Icon */}
                <div className="w-[22px] h-[16px] rounded-[3px] border-[1.8px] border-[#1c1c1c] flex flex-col justify-between p-[1.5px] bg-[#fbfbfa] shrink-0">
                  <div className="w-full h-[2px] bg-[#1c1c1c] rounded-xs" />
                  <div className="w-1.5 h-[1.5px] bg-[#1c1c1c] rounded-xs" />
                </div>

                <span className="text-[14px] font-bold text-[#1c1c1c] tracking-wide">
                  {selectedPayment === 'card'
                    ? '•••• 4242'
                    : selectedPayment === 'wechat'
                    ? '微信支付 (WeChat Pay)'
                    : '支付宝 (Alipay)'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsChangingPayment((prev) => !prev)}
                className="text-[13px] font-semibold text-[#1c1c1c] underline underline-offset-2 hover:opacity-75 cursor-pointer"
              >
                切换方式
              </button>
            </div>

            {/* Payment Dropdown/Picker if user clicks Change */}
            {isChangingPayment && (
              <div className="p-2 bg-white rounded-xl border border-[#e5e5e1] space-y-1 shadow-md animate-in fade-in duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPayment('card');
                    setIsChangingPayment(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer ${
                    selectedPayment === 'card' ? 'bg-[#18181b] text-white' : 'hover:bg-neutral-100 text-[#1c1c1c]'
                  }`}
                >
                  <span>•••• 4242 (Visa / 银联信用卡)</span>
                  {selectedPayment === 'card' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPayment('wechat');
                    setIsChangingPayment(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer ${
                    selectedPayment === 'wechat' ? 'bg-[#18181b] text-white' : 'hover:bg-neutral-100 text-[#1c1c1c]'
                  }`}
                >
                  <span>微信支付 (免密 / 快捷支付)</span>
                  {selectedPayment === 'wechat' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPayment('alipay');
                    setIsChangingPayment(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer ${
                    selectedPayment === 'alipay' ? 'bg-[#18181b] text-white' : 'hover:bg-neutral-100 text-[#1c1c1c]'
                  }`}
                >
                  <span>支付宝 (花呗 / 快捷支付)</span>
                  {selectedPayment === 'alipay' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Section 5: Complete Payment Button */}
          <div className="pt-2 pb-1">
            <button
              type="button"
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 bg-[#18181b] hover:bg-black active:scale-[0.99] text-white text-[14px] sm:text-[15px] font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>正在安全处理支付...</span>
                </span>
              ) : (
                <span>立即确认支付</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
