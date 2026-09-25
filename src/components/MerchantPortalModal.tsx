import React, { useState, useEffect } from 'react';
import {
  Store,
  X,
  Flame,
  Clock,
  CheckCircle2,
  Bell,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  BatteryCharging,
  Thermometer,
  DollarSign,
  TrendingUp,
  PackageCheck,
  Bike,
  Layers,
  Truck,
  Sliders,
  Utensils,
  ShoppingBag
} from 'lucide-react';
import { DishItem, Order } from '../types';
import {
  getTruckExpandConfig,
  saveTruckExpandConfig,
  TruckExpandConfig,
  openTruckExpandSettings
} from '../utils/truckExpandSettings';
import { resolveOrderChannelType } from '../utils/orderNormalizer';

interface MerchantPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  dishes: DishItem[];
  orders: Order[];
  onToggleDishAvailability: (dishId: string) => void;
  onAdvanceOrderStatus: (orderId: string) => void;
  onSwitchToRider: () => void;
}

export const MerchantPortalModal: React.FC<MerchantPortalModalProps> = ({
  isOpen,
  onClose,
  dishes,
  orders,
  onToggleDishAvailability,
  onAdvanceOrderStatus,
  onSwitchToRider
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'metrics' | 'bubbles'>('orders');
  const [orderFilter, setOrderFilter] = useState<'cooking' | 'delivering' | 'all'>('cooking');
  const [truckConfig, setTruckConfig] = useState<TruckExpandConfig>(getTruckExpandConfig());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTruckConfig(getTruckExpandConfig());
    }
  }, [isOpen]);

  const handleUpdateBubbleSetting = (key: 'showPullUpMenuPill' | 'showActiveOrderBubble' | 'showGearCategoryDial', val: boolean) => {
    const updated = {
      ...truckConfig,
      [key]: val,
      updatedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    setTruckConfig(updated);
    saveTruckExpandConfig(updated);
    const label = key === 'showGearCategoryDial' ? '2级齿轮选择器' : '浮动气泡';
    setToastMessage(`已${val ? '开启' : '关闭'}${label}渲染`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleUpdateMode = (mode: 'countdown' | 'immediate' | 'disabled') => {
    const updated = {
      ...truckConfig,
      mode,
      updatedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    setTruckConfig(updated);
    saveTruckExpandConfig(updated);
    setToastMessage(`已切换展开模式为: ${mode === 'countdown' ? '倒计时' : mode === 'immediate' ? '直接展开' : '纯手动'}`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  if (!isOpen) return null;

  const cookingOrders = orders.filter((o) => o.status === 'cooking');
  const deliveringOrders = orders.filter((o) => o.status === 'delivering');
  const completedOrders = orders.filter((o) => o.status === 'completed');

  const displayedOrders =
    orderFilter === 'cooking'
      ? cookingOrders
      : orderFilter === 'delivering'
      ? deliveringOrders
      : orders;

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0) + 3820;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-2 sm:p-3">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Main Console Modal */}
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#f9f9f7] rounded-2xl sm:rounded-3xl shadow-2xl border border-[#e2e3e1] flex flex-col z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-black text-white px-3.5 sm:px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shadow-sm">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black tracking-tight">
                  黑曜石 01 号车 · 店长出餐中枢
                </h2>
                <span className="text-[9.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  营业中 (大悦城北座)
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                实时接单、自动化出餐呼叫骑手与实时菜单库存调度
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSwitchToRider}
              className="hidden sm:flex items-center gap-1 text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-2.5 py-1 rounded-lg border border-neutral-700 transition-colors cursor-pointer"
              title="切换到闪送骑手端"
            >
              <Bike className="w-3.5 h-3.5 text-emerald-400" />
              <span>切换骑手端</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Telemetry Status Bar */}
        <div className="bg-[#1a1c1b] text-neutral-300 px-3.5 sm:px-4 py-1.5 flex items-center justify-between text-xs border-b border-neutral-800 flex-wrap gap-1.5 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
              <Thermometer className="w-3 h-3" />
              冷链库温: -18.2℃ (正常)
            </span>
            <span className="flex items-center gap-1 text-amber-400 text-[11px]">
              <Flame className="w-3 h-3" />
              主烤炉温: 280℃ (炙烤状态)
            </span>
            <span className="flex items-center gap-1 text-sky-400 text-[11px]">
              <BatteryCharging className="w-3 h-3" />
              车载储能: 88% (续航 6.5h)
            </span>
          </div>

          <div className="text-[10.5px] text-neutral-400">
            今日接单: <strong className="text-white">{orders.length + 42}</strong> 单
          </div>
        </div>

        {/* Tab Switcher Navigation */}
        <div className="px-3 sm:px-4 py-2 bg-white border-b border-[#e2e3e1] flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex bg-[#f0f0ed] p-0.5 rounded-xl border border-[#e2e3e1]">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-[#474741] hover:text-black'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>实时出餐工单</span>
              <span className="bg-amber-400 text-black text-[9.5px] font-bold px-1.5 py-0.2 rounded-full">
                {cookingOrders.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-[#474741] hover:text-black'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>菜品库存与售罄</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'metrics'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-[#474741] hover:text-black'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>今日营收与效率</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bubbles')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'bubbles'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-[#474741] hover:text-black'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>底栏气泡与展开</span>
            </button>
          </div>

          {activeTab === 'orders' && (
            <div className="flex items-center gap-0.5 bg-[#f4f4f2] p-0.5 rounded-lg border border-[#e2e3e1]">
              <button
                type="button"
                onClick={() => setOrderFilter('cooking')}
                className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                  orderFilter === 'cooking'
                    ? 'bg-white text-black shadow-2xs'
                    : 'text-[#787770] hover:text-black'
                }`}
              >
                待制作 ({cookingOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setOrderFilter('delivering')}
                className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                  orderFilter === 'delivering'
                    ? 'bg-white text-black shadow-2xs'
                    : 'text-[#787770] hover:text-black'
                }`}
              >
                配送中 ({deliveringOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setOrderFilter('all')}
                className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                  orderFilter === 'all'
                    ? 'bg-white text-black shadow-2xs'
                    : 'text-[#787770] hover:text-black'
                }`}
              >
                全部工单 ({orders.length})
              </button>
            </div>
          )}
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 hide-scrollbar">
          {/* TAB 1: ORDERS LIST */}
          {activeTab === 'orders' && (
            <div className="space-y-2">
              {displayedOrders.length === 0 ? (
                <div className="text-center py-8 text-[#787770]">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-1.5" />
                  <p className="font-bold text-xs sm:text-sm text-[#1a1c1b]">当前分类下暂无等待工单</p>
                  <p className="text-[11px] text-[#787770] mt-0.5">
                    所有餐品均已完成制作或配送，实时待命接单中。
                  </p>
                </div>
              ) : (
                displayedOrders.map((order, idx) => {
                  const isCooking = order.status === 'cooking';
                  const isDelivering = order.status === 'delivering';
                  const channel = resolveOrderChannelType(order);
                  const isDineIn = channel === 'dine_in';
                  const isPickup = channel === 'pickup';
                  const isDelivery = channel === 'delivery';

                  return (
                    <div
                      key={`portal-ord-${order.id || order.orderNo || idx}-${idx}`}
                      className="bg-white rounded-xl p-3 border border-[#e2e3e1] shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-all hover:border-neutral-400"
                    >
                      {/* Left Order Info */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs tabular-nums font-bold bg-[#f4f4f2] text-black px-1.5 py-0.2 rounded border border-[#e2e3e1]">
                            {order.orderNo}
                          </span>
                          
                          {/* Channel Badge */}
                          {isDineIn && (
                            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <Utensils className="w-3 h-3 text-amber-700" />
                              <span>堂食就餐 · {order.tableCode ? `${order.tableCode} 号桌` : '外摆台位'}</span>
                            </span>
                          )}
                          {isPickup && (
                            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3 text-sky-700" />
                              <span>到店自提</span>
                            </span>
                          )}
                          {isDelivery && (
                            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                              <Bike className="w-3 h-3 text-emerald-700" />
                              <span>外卖专送</span>
                            </span>
                          )}

                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              isCooking
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                : isDelivering
                                ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {isCooking && <Flame className="w-3 h-3 text-amber-600" />}
                            {isDelivering && <Clock className="w-3 h-3 text-sky-600" />}
                            {order.statusText}
                          </span>
                          <span className="text-[10px] text-[#787770]">
                            下单时间: {order.createdTime}
                          </span>
                        </div>

                        {/* Order Item Pills */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {order.items.map((it, i) => (
                            <div
                              key={i}
                              className="text-[11px] bg-[#f9f9f7] border border-[#e2e3e1] px-2 py-0.5 rounded-lg text-[#1a1c1b] font-medium"
                            >
                              <strong>{it.name}</strong> × {it.quantity} 份
                              {it.options && (
                                <span className="text-[9.5px] text-[#787770] ml-1">
                                  ({it.options})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Customer / Table Info */}
                        <div className="text-[11px] text-[#474741] flex items-center gap-1.5 pt-0.5 flex-wrap">
                          {isDineIn ? (
                            <>
                              <span>就餐台位: <strong className="text-black">{order.tableZone || '餐车外摆区'} · {order.tableCode || 'A2'}号桌</strong></span>
                              <span>|</span>
                              <span>服务人员: <strong className="text-black">阿豪 (No.02) · 堂食免配送</strong></span>
                            </>
                          ) : isPickup ? (
                            <>
                              <span>取餐窗口: <strong className="text-black">餐车右侧保温取件柜</strong></span>
                              <span>|</span>
                              <span>自提凭证: <strong className="text-black">{order.pickupCode || '801'}</strong></span>
                            </>
                          ) : (
                            <>
                              <span>送达地址: <strong className="text-black">{order.deliveryAddress}</strong></span>
                              <span>|</span>
                              <span>骑士: <strong className="text-black">{order.courierName || '智能调度闪送中'}</strong></span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right Action Block */}
                      <div className="flex items-center gap-2.5 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-[#f0f0ed]">
                        <div className="text-right">
                          <span className="text-[10px] text-[#787770] block">实收金额</span>
                          <span className="text-sm sm:text-base font-black text-black">
                            ¥{order.totalAmount.toFixed(2)}
                          </span>
                        </div>

                        {/* Actions for Cooking Stage */}
                        {isCooking && (
                          <>
                            {isDineIn ? (
                              <button
                                type="button"
                                onClick={() => onAdvanceOrderStatus(order.id)}
                                className="bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                              >
                                <Utensils className="w-3 h-3 text-white" />
                                <span>制作完成 · 传菜上桌</span>
                              </button>
                            ) : isPickup ? (
                              <button
                                type="button"
                                onClick={() => onAdvanceOrderStatus(order.id)}
                                className="bg-sky-600 text-white hover:bg-sky-700 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                              >
                                <ShoppingBag className="w-3 h-3 text-white" />
                                <span>制作完成 · 入保温柜</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onAdvanceOrderStatus(order.id)}
                                className="bg-black text-white hover:bg-neutral-800 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                              >
                                <Bell className="w-3 h-3 text-amber-400" />
                                <span>制作完成 · 呼叫骑手</span>
                              </button>
                            )}
                          </>
                        )}

                        {/* Actions for Delivering Stage */}
                        {isDelivering && (
                          <button
                            type="button"
                            onClick={() => onAdvanceOrderStatus(order.id)}
                            className="bg-[#e8e8e6] hover:bg-[#e0e0dc] text-black text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isDineIn ? '餐品齐备 · 结账翻台' : isPickup ? '顾客核销自提' : '确认送达'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: INVENTORY & STOCK MANAGEMENT */}
          {activeTab === 'inventory' && (
            <div className="space-y-2.5">
              <div className="bg-white p-2.5 rounded-xl border border-[#e2e3e1] flex items-center justify-between text-xs text-[#474741]">
                <span>点击开关可即时控制客户端菜品的可售与售罄状态：</span>
                <span className="text-xs font-bold text-emerald-700">
                  当前可售 {dishes.filter((d) => d.available).length} 款 / 售罄 {dishes.filter((d) => !d.available).length} 款
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="bg-white p-2.5 rounded-xl border border-[#e2e3e1] flex items-center justify-between gap-2.5 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={dish.imageUrl}
                        alt={dish.name}
                        className="w-10 h-10 rounded-lg object-cover bg-neutral-100 shrink-0 border border-[#e2e3e1]"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-black truncate">{dish.name}</h4>
                        <p className="text-[10px] text-[#787770]">
                          ¥{dish.price.toFixed(2)} · {dish.typeTag} · {dish.prepTime}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleDishAvailability(dish.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                        dish.available
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-neutral-100 text-neutral-500 border border-neutral-300 hover:bg-neutral-200'
                      }`}
                    >
                      {dish.available ? (
                        <>
                          <ToggleRight className="w-3.5 h-3.5 text-emerald-600" />
                          <span>供应中</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-3.5 h-3.5 text-neutral-400" />
                          <span>已售罄</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: REVENUE & EFFICIENCY */}
          {activeTab === 'metrics' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="bg-white p-3 rounded-2xl border border-[#e2e3e1] shadow-2xs">
                  <span className="text-[11px] text-[#787770] font-medium block mb-0.5">
                    今日营收流水 (实时)
                  </span>
                  <div className="text-xl font-black text-black">
                    ¥{totalRevenue.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 inline-block">
                    ↑ 较昨日同期增长 18.4%
                  </span>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-[#e2e3e1] shadow-2xs">
                  <span className="text-[11px] text-[#787770] font-medium block mb-0.5">
                    平均出餐耗时
                  </span>
                  <div className="text-xl font-black text-black">6.8 分钟</div>
                  <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 inline-block">
                    ✓ 高于系统基准效率 (8.5分)
                  </span>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-[#e2e3e1] shadow-2xs">
                  <span className="text-[11px] text-[#787770] font-medium block mb-0.5">
                    好评满意率
                  </span>
                  <div className="text-xl font-black text-black">99.2%</div>
                  <span className="text-[10px] text-amber-600 font-semibold mt-0.5 inline-block">
                    ★ 黑曜石金牌主厨流动站
                  </span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-[#e2e3e1] space-y-1.5">
                <h4 className="text-xs font-bold text-black">热销榜单排行动向</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span>1. 碳烤和牛小汉堡双重奏</span>
                    <strong className="text-black">128 份 · 贡献 ¥8,064</strong>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="w-[85%] h-full bg-black rounded-full" />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span>2. 黑松露墨汁手工玉棋</span>
                    <strong className="text-black">96 份 · 贡献 ¥8,448</strong>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="w-[65%] h-full bg-amber-400 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BOTTOM BUBBLES & EXPAND SWITCHES */}
          {activeTab === 'bubbles' && (
            <div className="space-y-3">
              {toastMessage && (
                <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-md flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{toastMessage}</span>
                </div>
              )}

              {/* Section: 2 Floating Bubble Switches */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#e2e3e1] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    <span>前台底栏浮动气泡渲染控制开关</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                    即时生效
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Switch 1: 左侧展开餐车气泡 */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    truckConfig.showPullUpMenuPill !== false
                      ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-500/10'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        truckConfig.showPullUpMenuPill !== false ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-500'
                      }`}>
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-neutral-900">
                            【展开餐车】浮动气泡按钮
                          </span>
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full ${
                            truckConfig.showPullUpMenuPill !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-neutral-200 text-neutral-600'
                          }`}>
                            {truckConfig.showPullUpMenuPill !== false ? '已开启渲染' : '已关闭隐藏'}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          对应前台点单上方的“X秒后展开餐车 / 展开餐车”胶囊气泡
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateBubbleSetting('showPullUpMenuPill', truckConfig.showPullUpMenuPill === false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                        truckConfig.showPullUpMenuPill !== false
                          ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                          : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                      }`}
                    >
                      {truckConfig.showPullUpMenuPill !== false ? '点击关闭' : '点击开启'}
                    </button>
                  </div>

                  {/* Switch 2: 右侧订单状态气泡 */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    truckConfig.showActiveOrderBubble !== false
                      ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-500/10'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        truckConfig.showActiveOrderBubble !== false ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-500'
                      }`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-neutral-900">
                            【订单履约状态】实时浮动气泡
                          </span>
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full ${
                            truckConfig.showActiveOrderBubble !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-neutral-200 text-neutral-600'
                          }`}>
                            {truckConfig.showActiveOrderBubble !== false ? '已开启渲染' : '已关闭隐藏'}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          对应前台订单上方的“配送中 / 制作中”动态进度浮窗
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateBubbleSetting('showActiveOrderBubble', truckConfig.showActiveOrderBubble === false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                        truckConfig.showActiveOrderBubble !== false
                          ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                          : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                      }`}
                    >
                      {truckConfig.showActiveOrderBubble !== false ? '点击关闭' : '点击开启'}
                    </button>
                  </div>

                  {/* Switch 3: 2级齿轮选择器 */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    truckConfig.showGearCategoryDial !== false
                      ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-500/10'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        truckConfig.showGearCategoryDial !== false ? 'bg-amber-500 text-black font-bold' : 'bg-neutral-200 text-neutral-500'
                      }`}>
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-neutral-900">
                            【2级齿轮选择器】双栏分类机
                          </span>
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full ${
                            truckConfig.showGearCategoryDial !== false
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-neutral-200 text-neutral-600'
                          }`}>
                            {truckConfig.showGearCategoryDial !== false ? '双栏模式 (已开启)' : '单栏模式 (已隐藏)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          控制客户端点单页左侧的2级齿轮分类滚轮组件是否渲染
                        </p>

                        {truckConfig.showGearCategoryDial !== false && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-amber-900">配色:</span>
                            <div className="inline-flex rounded-md bg-white border border-amber-300 p-0.5 text-[10px]">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...truckConfig, gearDialTheme: 'white' as const };
                                  setTruckConfig(updated);
                                  saveTruckExpandConfig(updated);
                                  setToastMessage('齿轮选择器已切换为【白色高亮】');
                                  setTimeout(() => setToastMessage(null), 2000);
                                }}
                                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                  (truckConfig.gearDialTheme || 'white') === 'white'
                                    ? 'bg-amber-500 text-black shadow-xs'
                                    : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                              >
                                白色明亮
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...truckConfig, gearDialTheme: 'dark' as const };
                                  setTruckConfig(updated);
                                  saveTruckExpandConfig(updated);
                                  setToastMessage('齿轮选择器已切换为【纯黑机械】');
                                  setTimeout(() => setToastMessage(null), 2000);
                                }}
                                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                  truckConfig.gearDialTheme === 'dark'
                                    ? 'bg-neutral-900 text-white shadow-xs'
                                    : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                              >
                                纯黑机械
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateBubbleSetting('showGearCategoryDial', truckConfig.showGearCategoryDial === false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                        truckConfig.showGearCategoryDial !== false
                          ? 'bg-amber-600 text-white hover:bg-amber-700'
                          : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                      }`}
                    >
                      {truckConfig.showGearCategoryDial !== false ? '点击关闭' : '点击开启'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Strategy Mode Selector */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#e2e3e1] shadow-2xs space-y-2.5">
                <h4 className="text-xs sm:text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-neutral-700" />
                  <span>餐车展开策略快捷设定</span>
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateMode('countdown')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      truckConfig.mode === 'countdown'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <div className="text-xs">倒计时展开</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5 font-normal">
                      {truckConfig.delaySeconds}秒倒计时后自动展开
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateMode('immediate')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      truckConfig.mode === 'immediate'
                        ? 'border-rose-600 bg-rose-50 text-rose-950 font-bold'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <div className="text-xs">直接展开</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5 font-normal">
                      进入即刻展开无等待
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateMode('disabled')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      truckConfig.mode === 'disabled'
                        ? 'border-neutral-800 bg-neutral-100 text-neutral-950 font-bold'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <div className="text-xs">纯手动触发</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5 font-normal">
                      不自动弹出，顾客点按展开
                    </div>
                  </button>
                </div>

                {/* Direct Jump to Advanced Console */}
                <div className="pt-2 border-t border-dashed border-neutral-200 flex items-center justify-between">
                  <div className="text-[11px] text-neutral-500">
                    需要高精时间轴微调、前台即时仿真器或腾讯云备份？
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openTruckExpandSettings();
                    }}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>进入高级控制台</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3.5 sm:px-4 py-2 bg-white border-t border-[#e2e3e1] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#787770]">
            已与黑曜石流动餐车车控车载系统保持双向毫秒同步
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            返回客户端
          </button>
        </div>
      </div>
    </div>
  );
};
