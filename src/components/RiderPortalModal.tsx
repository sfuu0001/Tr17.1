import React, { useState } from 'react';
import {
  Bike,
  X,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Clock,
  Zap,
  Store,
  DollarSign,
  Award,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  Check,
  ExternalLink
} from 'lucide-react';
import { Order } from '../types';

interface RiderPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onAdvanceOrderStatus: (orderId: string) => void;
  onSwitchToMerchant: () => void;
}

export const RiderPortalModal: React.FC<RiderPortalModalProps> = ({
  isOpen,
  onClose,
  orders,
  onAdvanceOrderStatus,
  onSwitchToMerchant
}) => {
  const [activeTab, setActiveTab] = useState<'delivering' | 'available' | 'earnings'>('delivering');
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  const [isCashoutSuccess, setIsCashoutSuccess] = useState(false);

  if (!isOpen) return null;

  const showRiderToast = (msg: string) => {
    setActiveNotification(msg);
    setTimeout(() => {
      setActiveNotification((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const deliveringOrders = orders.filter((o) => o.status === 'delivering');
  const cookingOrders = orders.filter((o) => o.status === 'cooking');
  const completedOrders = orders.filter((o) => o.status === 'completed');

  const handleFinishDelivery = (orderId: string) => {
    setJustCompletedId(orderId);
    showRiderToast('订单已确认送达，配送佣金已打入您的骑士账户！');
    setTimeout(() => {
      onAdvanceOrderStatus(orderId);
      setJustCompletedId(null);
    }, 400);
  };

  const handleCallCustomer = (address: string) => {
    showRiderToast(`已启动虚拟隐私号拨打：正在呼叫目的地【${address}】顾客...`);
  };

  const handleStartNav = (address: string) => {
    showRiderToast(`已开启高精车道级骑行导航：已锁定【${address}】，距离约 450 米`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-2 sm:p-3">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Main Rider Console */}
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#f9f9f7] rounded-2xl sm:rounded-3xl shadow-2xl border border-[#e2e3e1] flex flex-col z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-950 text-white px-3.5 sm:px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-400 text-black flex items-center justify-center font-black shadow-sm">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black tracking-tight">
                  闪送骑士工作台 · 专线专送
                </h2>
                <span className="text-[9.5px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping"></span>
                  接单中 (接单范围 3.0km)
                </span>
              </div>
              <p className="text-[11px] text-emerald-300/80">
                骑士: 王师傅 (工号 R-8802) · 智能热度巡航指引
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSwitchToMerchant}
              className="hidden sm:flex items-center gap-1 text-xs font-bold bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-700 transition-colors cursor-pointer"
              title="切换到餐车店长端"
            >
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span>切换商家端</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-emerald-900 hover:bg-emerald-800 text-emerald-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Rider KPI Strip */}
        <div className="bg-[#112218] text-emerald-200 px-3.5 sm:px-4 py-1.5 flex items-center justify-between text-xs border-b border-emerald-900/50 flex-wrap gap-1.5 shrink-0">
          <div className="flex items-center gap-3 flex-wrap text-[11px]">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-amber-400" />
              今日预计收益: <strong className="text-white text-xs sm:text-sm">¥198.50</strong>
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              今日送达: <strong className="text-white">{completedOrders.length + 18}</strong> 单
            </span>
            <span className="flex items-center gap-1">
              <Award className="w-3 h-3 text-yellow-400" />
              准时交付率: <strong className="text-white">100%</strong>
            </span>
          </div>

          <div className="text-[10.5px] text-emerald-300">
            保温箱恒温: 65℃ (高温锁鲜)
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-3 sm:px-4 py-2 bg-white border-b border-[#e2e3e1] flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex bg-[#f0f0ed] p-0.5 rounded-xl border border-[#e2e3e1]">
            <button
              type="button"
              onClick={() => setActiveTab('delivering')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'delivering'
                  ? 'bg-emerald-950 text-white shadow-xs'
                  : 'text-[#474741] hover:text-black'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>当前配送任务</span>
              <span className="bg-emerald-400 text-black text-[9.5px] font-bold px-1.5 py-0.2 rounded-full">
                {deliveringOrders.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('available')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'available'
                  ? 'bg-emerald-950 text-white shadow-xs'
                  : 'text-[#474741] hover:text-black'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>待取餐工单</span>
              <span className="bg-amber-400 text-black text-[9.5px] font-bold px-1.5 py-0.2 rounded-full">
                {cookingOrders.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('earnings')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'earnings'
                  ? 'bg-emerald-950 text-white shadow-xs'
                  : 'text-[#474741] hover:text-black'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>今日结算明细</span>
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 hide-scrollbar">
          {/* TAB 1: DELIVERING ORDERS */}
          {activeTab === 'delivering' && (
            <div className="space-y-2">
              {deliveringOrders.length === 0 ? (
                <div className="text-center py-8 text-[#787770]">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-1.5" />
                  <p className="font-bold text-xs sm:text-sm text-[#1a1c1b]">当前无配送中订单</p>
                  <p className="text-[11px] text-[#787770] mt-0.5">
                    点击上方「待取餐工单」可快速抢单或前往黑曜石餐车站台取餐。
                  </p>
                </div>
              ) : (
                deliveringOrders.map((order, idx) => (
                  <div
                    key={`rider-delivering-${order.id || order.orderNo || idx}-${idx}`}
                    className="bg-white rounded-xl p-3 sm:p-3.5 border-2 border-emerald-600/30 shadow-md space-y-2 transition-all hover:border-emerald-600"
                  >
                    {/* Header line */}
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs tabular-nums font-black bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-200">
                          {order.orderNo}
                        </span>
                        <span className="text-[11px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Bike className="w-3 h-3" />
                          配送中 · 剩余 {order.etaMinutes} 分钟
                        </span>
                      </div>
                      <span className="text-xs font-black text-[#006d36]">
                        配送费收益: ¥7.50 (含VIP准时奖励)
                      </span>
                    </div>

                    {/* Route Step visual */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-[#f8faf8] p-2.5 rounded-xl border border-emerald-100">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-xs font-bold text-neutral-800">
                          <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>取餐点: {order.truckName}</span>
                        </div>
                        <p className="text-[10.5px] text-[#787770] pl-4.5">
                          大悦城北座中庭停靠点 (已取餐入保温箱)
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-950">
                          <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>送达目标: {order.deliveryAddress}</span>
                        </div>
                        <p className="text-[10.5px] text-[#787770] pl-4.5">
                          预计 5 分钟内骑行到达楼宇
                        </p>
                      </div>
                    </div>

                    {/* Item list */}
                    <div className="flex items-center justify-between text-xs text-[#474741] pt-0.5">
                      <div className="flex flex-wrap gap-1">
                        {order.items.map((it, i) => (
                          <span
                            key={i}
                            className="bg-[#f0f0ed] px-1.5 py-0.2 rounded text-[10.5px] font-medium"
                          >
                            {it.name} × {it.quantity}
                          </span>
                        ))}
                      </div>
                      <span className="text-[11px] text-neutral-500">
                        顾客实付: ¥{order.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-[#e2e3e1] flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCallCustomer(order.deliveryAddress)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#f4f4f2] hover:bg-[#e8e8e6] active:scale-95 text-[#1a1c1b] border border-[#e2e3e1] cursor-pointer transition-all"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>联系顾客</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartNav(order.deliveryAddress)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#f4f4f2] hover:bg-[#e8e8e6] active:scale-95 text-[#1a1c1b] border border-[#e2e3e1] cursor-pointer transition-all"
                        >
                          <Navigation className="w-3 h-3 text-sky-600" />
                          <span>开启导航</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleFinishDelivery(order.id)}
                        className="bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>已妥投 · 确认送达</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: AVAILABLE / PENDING COOKING */}
          {activeTab === 'available' && (
            <div className="space-y-2">
              {cookingOrders.length === 0 ? (
                <div className="text-center py-8 text-[#787770]">
                  <CheckCircle2 className="w-10 h-10 text-neutral-400 mx-auto mb-1.5" />
                  <p className="font-bold text-xs sm:text-sm text-[#1a1c1b]">暂无待取餐订单</p>
                  <p className="text-[11px] text-[#787770] mt-0.5">餐车后厨正在加紧制作中...</p>
                </div>
              ) : (
                cookingOrders.map((order, idx) => (
                  <div
                    key={`rider-cooking-${order.id || order.orderNo || idx}-${idx}`}
                    className="bg-white rounded-xl p-3 border border-[#e2e3e1] shadow-2xs flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs tabular-nums font-bold bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.2 rounded">
                          {order.orderNo}
                        </span>
                        <span className="text-[11px] font-bold text-[#474741]">
                          餐车制作中 · 预计 5 分钟出餐
                        </span>
                      </div>
                      <p className="text-xs text-black font-semibold truncate">
                        送往: {order.deliveryAddress}
                      </p>
                      <p className="text-[10px] text-[#787770]">
                        餐品: {order.items.map((i) => i.name).join('、')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onAdvanceOrderStatus(order.id);
                        showRiderToast(`工单 ${order.orderNo} 已由您抢单锁定，正在前往流动餐车取餐！`);
                      }}
                      className="bg-black hover:bg-neutral-800 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer shadow-xs"
                    >
                      提前锁定抢单
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: EARNINGS */}
          {activeTab === 'earnings' && (
            <div className="space-y-2.5">
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#e2e3e1] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#787770] font-bold block">
                    今日配送收益结算明细
                  </span>
                  <span className="text-[10.5px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                    5G 实时秒结专线
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 bg-[#f9f9f7] rounded-xl border border-[#e2e3e1]">
                    <span className="text-[10.5px] text-[#787770] block">基础配送费</span>
                    <strong className="text-sm sm:text-base text-black">¥142.50</strong>
                  </div>
                  <div className="p-2.5 bg-[#f9f9f7] rounded-xl border border-[#e2e3e1]">
                    <span className="text-[10.5px] text-[#787770] block">VIP 准时奖励</span>
                    <strong className="text-sm sm:text-base text-emerald-700">+¥36.00</strong>
                  </div>
                  <div className="p-2.5 bg-[#f9f9f7] rounded-xl border border-[#e2e3e1]">
                    <span className="text-[10.5px] text-[#787770] block">高峰期冲单补贴</span>
                    <strong className="text-sm sm:text-base text-amber-700">+¥20.00</strong>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10.5px] text-emerald-900 block font-bold">
                      今日可提现总额
                    </span>
                    <strong className="text-base sm:text-lg text-emerald-900 font-black">¥198.50</strong>
                  </div>
                </div>

                <div className="pt-1.5 flex items-center justify-between border-t border-[#e2e3e1] flex-wrap gap-2">
                  <span className="text-[11px] text-[#787770]">提现方式：微信零钱钱包 (0 手续费)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCashoutSuccess(true);
                      showRiderToast('提现申请已受理！¥198.50 已通过微信商户专线秒级转入零钱钱包。');
                      setTimeout(() => setIsCashoutSuccess(false), 3000);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs ${
                      isCashoutSuccess
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-900 hover:bg-emerald-800 text-white active:scale-95'
                    }`}
                  >
                    {isCashoutSuccess ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>已打款入账</span>
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-3 h-3" />
                        <span>一键全额闪电提现</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic In-Modal Notification Banner */}
        {activeNotification && (
          <div className="mx-3 sm:mx-4 mb-1.5 px-3 py-2 bg-[#181816] text-white rounded-xl shadow-lg border border-emerald-500/30 flex items-center justify-between gap-2 text-xs animate-in slide-in-from-bottom-2 duration-200 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-[11px]">{activeNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveNotification(null)}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="px-3.5 sm:px-4 py-2 bg-white border-t border-[#e2e3e1] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#787770]">
            黑曜石闪送雷达网络 · GPS已锁定大悦城商圈
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-emerald-900 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            返回客户端
          </button>
        </div>
      </div>
    </div>
  );
};
