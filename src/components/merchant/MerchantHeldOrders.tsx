import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  Send,
  Package,
  Trash2,
  Receipt,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { HeldOrder } from '../../types';

interface MerchantHeldOrdersProps {
  heldOrders: HeldOrder[];
  onResumeCheckout: (heldOrder: HeldOrder) => void;
  onSendReminder: (orderId: string) => void;
  onConvertToTakeaway: (orderId: string) => void;
  onVoidOrder: (orderId: string) => void;
  showToast: (msg: string) => void;
}

export const MerchantHeldOrders: React.FC<MerchantHeldOrdersProps> = ({
  heldOrders,
  onResumeCheckout,
  onSendReminder,
  onConvertToTakeaway,
  onVoidOrder,
  showToast
}) => {
  const totalHeldAmount = heldOrders.reduce((sum, h) => sum + h.totalAmount, 0);
  const highRiskCount = heldOrders.filter((h) => h.isHighRisk).length;

  return (
    <div className="space-y-3.5 text-xs font-sans">
      {/* Risk Metrics Banner */}
      <div className="bg-white p-3.5 rounded-[4px] border border-[#e6e6e4] flex items-center justify-between gap-3 flex-wrap shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[4px] bg-[#fbe4e4] text-[#eb5757] flex items-center justify-center font-semibold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm text-[#37352f]">未结算账单与逃单风控中心</h4>
              {highRiskCount > 0 && (
                <span className="text-[10px] font-medium bg-[#eb5757] text-white px-2 py-0.2 rounded-[2px] animate-pulse">
                  {highRiskCount} 单高危超时
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#787774] font-normal mt-0.5">
              监控超过 30 分钟未结算账单，45 分钟自动锁桌防逃单
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-[#787774] font-normal block">挂账资金池风险总额:</span>
          <span className="text-lg font-mono font-semibold text-[#2b593f]">
            ¥{totalHeldAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Held Orders List */}
      {heldOrders.length === 0 ? (
        <div className="bg-white rounded-[4px] p-12 text-center border border-[#e6e6e4] space-y-2">
          <ShieldAlert className="w-10 h-10 text-[#4dab63] mx-auto" />
          <h4 className="font-semibold text-sm text-[#37352f]">当前无挂账风险单</h4>
          <p className="text-xs text-[#787774] font-normal">所有堂食桌位与账单均已按时清算收银</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {heldOrders.map((order, idx) => {
            return (
              <div
                key={`held-ord-${order.id || order.orderNo || idx}-${idx}`}
                className={`bg-white rounded-[4px] border p-3.5 space-y-3 shadow-2xs flex flex-col justify-between ${
                  order.isHighRisk
                    ? 'border-[#eb5757] bg-[#fbe4e4]/20'
                    : 'border-[#e6e6e4]'
                }`}
              >
                <div>
                  {/* Top Meta */}
                  <div className="flex items-center justify-between border-b border-[#efefed] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-xs bg-[#37352f] text-white px-1.5 py-0.2 rounded-[2px]">
                        {order.orderNo}
                      </span>
                      <span className="font-medium text-xs text-[#37352f]">
                        {order.tableName} ({order.tableCode})
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-[2px] flex items-center gap-1 ${
                        order.isHighRisk
                          ? 'bg-[#eb5757] text-white'
                          : 'bg-[#fbf3db] text-[#8f6412] border border-[#ecd9a8]'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{order.isHighRisk ? `⚠️ 高危超时 ${order.heldMinutes}m` : `挂单 ${order.heldMinutes}m`}</span>
                    </span>
                  </div>

                  {/* Details */}
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#787774] font-normal">
                      <span>开台值班: {order.serverName}</span>
                      <span>起挂时间: {order.startTime}</span>
                    </div>

                    {/* Mini Item List */}
                    <div className="bg-[#fbfbfa] p-2 rounded-[4px] border border-[#e6e6e4] space-y-1">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span className="text-[#37352f] font-normal">{it.name}</span>
                          <span className="font-mono text-[#787774] font-normal">x{it.quantity}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-[#787774] font-normal">未结账应收总额:</span>
                      <span className="font-mono font-semibold text-base text-[#2b593f]">
                        ¥{order.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-[#efefed] grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onResumeCheckout(order);
                      showToast(`已恢复工单 ${order.orderNo} 结算通道！`);
                    }}
                    className="py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-[2px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
                  >
                    <Receipt className="w-3 h-3" />
                    <span>恢复收银</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSendReminder(order.id);
                      showToast(`已向顾客手机发送催付账单通知！`);
                    }}
                    className="py-1.5 bg-[#fbf3db] hover:bg-[#f3e6c0] text-[#8f6412] border border-[#ecd9a8] rounded-[2px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>短信催付</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onConvertToTakeaway(order.id);
                      showToast(`已将挂单转为外带保温打包！`);
                    }}
                    className="py-1.5 bg-[#f1f1ef] hover:bg-[#e8e8e6] text-[#37352f] rounded-[2px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Package className="w-3 h-3" />
                    <span>转外带打包</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onVoidOrder(order.id);
                      showToast(`已作废挂单并冲正库存！`);
                    }}
                    className="py-1.5 bg-white hover:bg-[#fbe4e4] text-[#eb5757] border border-[#f0c3c3] rounded-[2px] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>作废冲正</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
