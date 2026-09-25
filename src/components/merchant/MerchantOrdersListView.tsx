import React from 'react';
import {
  Utensils,
  ShoppingBag,
  Bike,
  Clock,
  Megaphone,
  MessageSquare,
  Printer,
  Trash2,
  MapPin,
  Tag
} from 'lucide-react';
import { Order } from '../../types';
import { resolveOrderChannelType } from '../../utils/orderNormalizer';
import { getOrGeneratePickupCode } from '../../utils/pickupCodeEngine';
import { BeautifiedOrderDishesDropdown } from './BeautifiedOrderDishesDropdown';
import { BeautifiedOrderUserDropdown } from './BeautifiedOrderUserDropdown';
import { BeautifiedOrderStatusBadge } from './BeautifiedOrderStatusBadge';

interface MerchantOrdersListViewProps {
  orders: Order[];
  onAdvanceOrderStatus: (orderId: string, targetStatus?: Order['status'], extraDetails?: Partial<Order>) => void;
  onQuickBroadcastCall: (order: Order) => void;
  orderCallCounts: Record<string, number>;
  onOpenChat: (order: Order) => void;
  onOpenReceipt: (order: Order) => void;
  onDeleteOrder: (order: Order) => void;
  showToast: (msg: string) => void;
}

/**
 * MerchantOrdersListView (全渠道订单中心列表视图)
 * 彻底解决手机端与电脑端列表显示状态布局异常与溢出问题：
 * 1. 移动端 (Mobile): 全面化微格网卡片流，彻底杜绝横向滚动与列截断
 * 2. 电脑端 (Desktop): 严格按比例均分工控表格，100% 容器适配无溢出
 * 3. 冗长文字收拢: 菜品明细、用户 UID、状态流转统一采用美化版向下拉彩单小组件
 */
export const MerchantOrdersListView: React.FC<MerchantOrdersListViewProps> = ({
  orders,
  onAdvanceOrderStatus,
  onQuickBroadcastCall,
  orderCallCounts,
  onOpenChat,
  onOpenReceipt,
  onDeleteOrder,
  showToast
}) => {
  return (
    <div className="w-full max-w-full space-y-3">
      {/* ========================================================================= */}
      {/* 1. 移动端全面化网格列表布局 (Mobile Responsive Grid Flow: block md:hidden) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-2.5 w-full">
        {orders.map((order) => {
          const channel = resolveOrderChannelType(order);
          const isDineIn = channel === 'dine_in';
          const isPickup = channel === 'pickup';
          const pickupCode = getOrGeneratePickupCode(order.orderNo, order.pickupCode);

          return (
            <article
              key={`mob-ord-${order.orderNo || order.id}`}
              className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs p-3 space-y-2.5 w-full transition-all relative"
            >
              {/* Tier 1: 顶栏单号、渠道微标与状态指示中枢 */}
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                  <span className="font-black text-neutral-900 text-xs tracking-tight whitespace-nowrap shrink-0">
                    #{order.orderNo.replace(/^#/, '')}
                  </span>

                  {isDineIn ? (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-neutral-800 bg-neutral-100 border border-neutral-200/90 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                      <Utensils className="w-3 h-3 text-neutral-600 shrink-0" />
                      <span>堂食 · {order.tableCode ? `${order.tableCode}桌` : 'A2桌'}</span>
                    </span>
                  ) : isPickup ? (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                      <ShoppingBag className="w-3 h-3 text-amber-700 shrink-0" />
                      <span>自提 · #{pickupCode}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                      <Bike className="w-3 h-3 text-emerald-700 shrink-0" />
                      <span>外卖专送</span>
                    </span>
                  )}
                </div>

                {/* 当前进度状态徽标：位于手机右上角，恒定精简显示不溢出 */}
                <div className="shrink-0 flex items-center">
                  <BeautifiedOrderStatusBadge
                    order={order}
                    onAdvanceStatus={(targetStatus, extra) => {
                      onAdvanceOrderStatus(order.orderNo || order.id, targetStatus, extra);
                      showToast(`订单 #${order.orderNo.replace(/^#/, '')} 状态已流转至: ${extra?.statusText || targetStatus}`);
                    }}
                    align="right"
                  />
                </div>
              </div>

              {/* Tier 2: 核心工况双列网格 (时间、履约地点、金额净得、用户档案) */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50/70 p-2 rounded-lg border border-neutral-100">
                {/* Col A: 时间与履约地 */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1 text-neutral-500 text-[11px]">
                    <Clock className="w-3 h-3 shrink-0 text-neutral-400" />
                    <span className="truncate">{order.createdTime || '12:36:20'}</span>
                  </div>

                  <div className="flex items-center gap-1 text-neutral-700 text-[11.5px] font-bold truncate">
                    {isDineIn ? (
                      <span className="truncate">桌位: {order.tableCode ? `${order.tableCode}号桌` : 'A2号桌'}</span>
                    ) : isPickup ? (
                      <span className="truncate text-amber-800">取餐码: #{pickupCode}</span>
                    ) : (
                      <span className="truncate text-neutral-800" title={order.deliveryAddress}>
                        📍 {order.deliveryAddress || '西藏北路大悦城'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Col B: 实付净得与用户档案彩单 */}
                <div className="space-y-1 text-right flex flex-col items-end">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="font-black text-neutral-900 font-amount text-sm">
                      ¥{order.totalAmount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold font-amount">
                      (净得¥{(order.merchantNetPayout || order.totalAmount).toFixed(2)})
                    </span>
                  </div>

                  <div>
                    <BeautifiedOrderUserDropdown
                      order={order}
                      onOpenChat={() => onOpenChat(order)}
                      showToast={showToast}
                      align="right"
                    />
                  </div>
                </div>
              </div>

              {/* Tier 3: 菜品清单明细 -> 美化版内嵌展开彩单 (向下推移排版，100%防遮挡) */}
              <div className="pt-0.5">
                <BeautifiedOrderDishesDropdown
                  items={order.items}
                  totalAmount={order.totalAmount}
                  orderNo={order.orderNo}
                  channelType={channel}
                  onPrintKitchenTicket={() => onOpenReceipt(order)}
                  align="left"
                  variant="inline"
                  className="w-full"
                />
              </div>

              {/* Tier 4: 操作控制台单排布局 */}
              <div className="flex items-center justify-between gap-1 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => onQuickBroadcastCall(order)}
                  className="h-7 px-2 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200/90 rounded-md text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="外放叫号/呼叫"
                >
                  <Megaphone className="w-3 h-3 text-neutral-600 shrink-0" />
                  <span>
                    {isPickup ? '叫号' : isDineIn ? '传菜' : '呼叫'}
                    {orderCallCounts[order.orderNo] ? ` (${orderCallCounts[order.orderNo]})` : ''}
                  </span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenChat(order)}
                    className="h-7 px-2 bg-neutral-900 hover:bg-black text-white rounded-md text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="联络室"
                  >
                    <MessageSquare className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>联络</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenReceipt(order)}
                    className="h-7 px-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200/90 rounded-md text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="打印小票"
                  >
                    <Printer className="w-3 h-3 text-neutral-600 shrink-0" />
                    <span>小票</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteOrder(order)}
                    className="h-7 w-7 bg-white hover:bg-rose-50 text-neutral-400 hover:text-rose-600 border border-neutral-200/90 hover:border-rose-200 rounded-md flex items-center justify-center cursor-pointer shadow-2xs"
                    title="作废删除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 2. 电脑端全景工控表格布局 (Desktop Structured Table/Grid: hidden md:block) */}
      {/* ========================================================================= */}
      <div className="hidden md:block bg-white border border-neutral-200/90 rounded-xl shadow-2xs w-full">
        <table className="w-full text-left text-xs border-collapse table-fixed">
          <thead>
            <tr className="bg-neutral-50/90 border-b border-neutral-200/90 text-neutral-700 font-bold">
              <th className="p-3 w-[15%]">单号 / 渠道</th>
              <th className="p-3 w-[16%]">UID / 下单时间</th>
              <th className="p-3 w-[25%]">菜品明细 (彩单)</th>
              <th className="p-3 w-[16%]">桌位 / 履约地点</th>
              <th className="p-3 w-[11%]">实付 / 净得</th>
              <th className="p-3 w-[10%]">当前进度状态</th>
              <th className="p-3 w-[7%] text-right">调度操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {orders.map((order) => {
              const channel = resolveOrderChannelType(order);
              const isDineIn = channel === 'dine_in';
              const isPickup = channel === 'pickup';
              const pickupCode = getOrGeneratePickupCode(order.orderNo, order.pickupCode);

              return (
                <tr key={order.orderNo} className="hover:bg-neutral-50/70 transition-colors">
                  {/* 1. 单号 / 渠道 */}
                  <td className="p-3 align-middle">
                    <div className="font-bold text-neutral-900 text-xs whitespace-nowrap">
                      #{order.orderNo.replace(/^#/, '')}
                    </div>
                    <div className="mt-1">
                      {isDineIn ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-neutral-700 bg-neutral-100 border border-neutral-200/80 px-2 py-0.5 rounded-full whitespace-nowrap">
                          <Utensils className="w-3 h-3 text-neutral-500" />
                          <span>堂食就餐</span>
                        </span>
                      ) : isPickup ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                          <ShoppingBag className="w-3 h-3 text-amber-600" />
                          <span>到店自提</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                          <Bike className="w-3 h-3 text-emerald-600" />
                          <span>外卖专送</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 2. UID / 下单时间 */}
                  <td className="p-3 align-middle">
                    <div>
                      <BeautifiedOrderUserDropdown
                        order={order}
                        onOpenChat={() => onOpenChat(order)}
                        showToast={showToast}
                        align="left"
                      />
                    </div>
                    <div className="text-neutral-400 text-[11px] mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>{order.createdTime || '12:36:20'}</span>
                    </div>
                  </td>

                  {/* 3. 菜品明细 (使用美化向下拉彩单) */}
                  <td className="p-3 align-middle">
                    <BeautifiedOrderDishesDropdown
                      items={order.items}
                      totalAmount={order.totalAmount}
                      orderNo={order.orderNo}
                      channelType={channel}
                      onPrintKitchenTicket={() => onOpenReceipt(order)}
                      align="left"
                      variant="popover"
                    />
                  </td>

                  {/* 4. 桌位 / 履约地点 */}
                  <td className="p-3 align-middle text-neutral-700">
                    {isDineIn ? (
                      <span className="font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md text-[11px] border border-neutral-200 whitespace-nowrap">
                        桌台: {order.tableCode || 'A2'}
                      </span>
                    ) : isPickup ? (
                      <span className="text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded-md text-[11px] border border-amber-200 whitespace-nowrap">
                        自提码: #{pickupCode}
                      </span>
                    ) : (
                      <span className="truncate block max-w-[180px] text-neutral-800 text-xs" title={order.deliveryAddress}>
                        📍 {order.deliveryAddress || '西藏北路大悦城'}
                      </span>
                    )}
                  </td>

                  {/* 5. 实付 / 净得 */}
                  <td className="p-3 align-middle">
                    <div className="font-black text-neutral-900 font-amount text-xs whitespace-nowrap">
                      ¥{order.totalAmount.toFixed(2)}
                    </div>
                    <div className="text-[10.5px] text-emerald-700 font-bold mt-0.5 font-amount whitespace-nowrap">
                      净得 ¥{(order.merchantNetPayout || order.totalAmount).toFixed(2)}
                    </div>
                  </td>

                  {/* 6. 当前进度状态 (恒定显式不溢出) */}
                  <td className="p-3 align-middle">
                    <BeautifiedOrderStatusBadge
                      order={order}
                      onAdvanceStatus={(targetStatus, extra) => {
                        onAdvanceOrderStatus(order.orderNo || order.id, targetStatus, extra);
                        showToast(`订单 #${order.orderNo.replace(/^#/, '')} 状态已流转至: ${extra?.statusText || targetStatus}`);
                      }}
                      align="left"
                    />
                  </td>

                  {/* 7. 调度操作 */}
                  <td className="p-3 align-middle text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onQuickBroadcastCall(order)}
                        className="p-1.5 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200/90 rounded-md cursor-pointer flex items-center gap-1 shadow-2xs font-bold text-[11px]"
                        title={`外放语音广播: ${isPickup ? '叫号取餐' : isDineIn ? '呼叫传菜' : '呼叫骑手'}`}
                      >
                        <Megaphone className="w-3.5 h-3.5 text-neutral-700" />
                        <span>
                          {isPickup ? '叫号' : isDineIn ? '传菜' : '呼叫'}
                          {orderCallCounts[order.orderNo] ? ` (${orderCallCounts[order.orderNo]})` : ''}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenChat(order)}
                        className="p-1.5 bg-neutral-900 hover:bg-black text-white border border-neutral-900 rounded-md cursor-pointer shadow-2xs"
                        title="联络室"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenReceipt(order)}
                        className="p-1.5 bg-white hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 border border-neutral-200/90 rounded-md cursor-pointer shadow-2xs"
                        title="打印小票"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteOrder(order)}
                        className="p-1.5 bg-white hover:bg-rose-50 text-neutral-400 hover:text-rose-600 border border-neutral-200/90 hover:border-rose-200 rounded-md cursor-pointer shadow-2xs"
                        title="作废删除此订单"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
