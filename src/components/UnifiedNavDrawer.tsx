import React from 'react';
import {
  X,
  Bike,
  Utensils,
  ShoppingBag,
  ClipboardList,
  User,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Store,
  ChevronRight,
  CheckCircle2,
  Ticket,
  Cloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DiningMode } from './DiningModeSelector';
import { UserRole } from './RoleSwitcherDropdown';
import { Order } from '../types';

interface UnifiedNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // Scene Selection
  diningMode: DiningMode;
  onDiningModeChange: (mode: DiningMode) => void;
  // Cart
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  // Orders
  orders: Order[];
  onOpenOrders: () => void;
  // Profile & VIP
  isVIPActive: boolean;
  onOpenVIP: () => void;
  deliveryAddress: string;
  onChangeAddress: () => void;
  onOpenCoupons?: () => void;
  onOpenCloudbase?: () => void;
  // Roles
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  pendingOrdersCount?: number;
  // Navigation
  onNavigateHome: () => void;
}

export const UnifiedNavDrawer: React.FC<UnifiedNavDrawerProps> = ({
  isOpen,
  onClose,
  diningMode,
  onDiningModeChange,
  cartCount,
  cartTotal,
  onOpenCart,
  orders,
  onOpenOrders,
  isVIPActive,
  onOpenVIP,
  deliveryAddress,
  onChangeAddress,
  onOpenCoupons,
  onOpenCloudbase,
  currentRole,
  onSelectRole,
  pendingOrdersCount = 3,
  onNavigateHome
}) => {
  const activeOrder = orders.find((o) => o.status === 'cooking' || o.status === 'delivering');

  const diningModesConfig = [
    {
      key: 'delivery' as DiningMode,
      name: '外卖专送',
      icon: Bike,
      badge: '直达工位',
      desc: '餐车周边 1.5km 极速配送 · 约 20-25 分',
      tagColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      key: 'dine_in' as DiningMode,
      name: '现场堂食',
      icon: Utensils,
      badge: '免打包费',
      desc: '黑曜石餐车吧台 03 号位 · 现烤热享',
      tagColor: 'bg-amber-100 text-amber-800'
    },
    {
      key: 'pickup' as DiningMode,
      name: '到车自提',
      icon: ShoppingBag,
      badge: '免排队',
      desc: '提前约 10 分钟备好 · 凭取餐码直接提货',
      tagColor: 'bg-sky-100 text-sky-800'
    }
  ];

  const rolesConfig = [
    {
      key: 'customer' as UserRole,
      title: '客户端',
      subtitle: '选餐点单 · 实时配送',
      icon: Smartphone
    },
    {
      key: 'merchant' as UserRole,
      title: '商家后厨端',
      subtitle: `${pendingOrdersCount} 单待制作 · 菜品上架`,
      icon: Store
    },
    {
      key: 'rider' as UserRole,
      title: '骑手专送端',
      subtitle: '接单取餐 · 极速派送',
      icon: Bike
    },
    {
      key: 'platform' as UserRole,
      title: '平台总控端',
      subtitle: '商家管控 · 抽成清算 · SLA',
      icon: ShieldCheck
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-end sm:items-stretch sm:justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={onClose}
          />

          {/* Sheet Container: Mobile Bottom-Sheet (rounded-t-3xl) / Desktop Right Drawer (rounded-none border-l) */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full sm:w-[460px] md:w-[480px] max-h-[92vh] sm:max-h-full sm:h-full bg-[#f9f9f7] rounded-t-3xl sm:rounded-none shadow-2xl border-t sm:border-t-0 sm:border-l border-[#e2e3e1] flex flex-col z-10"
          >
            {/* Mobile Pull Handle */}
            <div className="sm:hidden w-full pt-3 pb-1 flex justify-center cursor-grab shrink-0">
              <div className="w-10 h-1 rounded-full bg-neutral-300" />
            </div>

            {/* Drawer Header */}
            <div className="px-3.5 py-2.5 border-b border-[#e2e3e1] bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-black text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  01
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#1a1c1b] leading-tight">黑曜石综合服务抽屉</h2>
                  <p className="text-[10px] text-[#787770]">点单场景 · 购物车 · 订单 · 会员与多端切换</p>
                </div>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-[#f4f4f2] hover:bg-[#e8e8e6] text-[#1a1c1b] flex items-center justify-center transition-colors cursor-pointer border border-[#e2e3e1]"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </div>

            {/* Scrollable Integrated Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-2.5 hide-scrollbar">
              {/* Section 1: Dining Scene Mode Selector (点单场景切换) */}
              <div className="bg-white rounded-2xl border border-[#e2e3e1] p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-black" />
                    <h3 className="text-xs font-black text-[#1a1c1b]">点单场景选择</h3>
                  </div>
                  <span className="text-[10.5px] text-[#787770]">当前：{diningMode === 'delivery' ? '外卖专送' : diningMode === 'dine_in' ? '现场堂食' : '到车自提'}</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {diningModesConfig.map((item) => {
                    const Icon = item.icon;
                    const isSelected = diningMode === item.key;
                    const modeStyles = {
                      delivery: {
                        selected: 'bg-sky-50/70 text-sky-600 border-2 border-sky-500 shadow-2xs font-bold',
                        icon: 'text-sky-600',
                        badge: 'bg-sky-500 text-white'
                      },
                      dine_in: {
                        selected: 'bg-amber-50/70 text-amber-600 border-2 border-amber-500 shadow-2xs font-bold',
                        icon: 'text-amber-600',
                        badge: 'bg-amber-500 text-white'
                      },
                      pickup: {
                        selected: 'bg-emerald-50/70 text-emerald-600 border-2 border-emerald-500 shadow-2xs font-bold',
                        icon: 'text-emerald-600',
                        badge: 'bg-emerald-500 text-white'
                      }
                    }[item.key];

                    return (
                      <motion.button
                        key={item.key}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => onDiningModeChange(item.key)}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-colors cursor-pointer select-none ${
                          isSelected
                            ? modeStyles.selected
                            : 'bg-[#fafaf8] border-[#e2e3e1] text-[#474741] hover:bg-neutral-100 hover:text-black font-medium'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 mb-0.5 ${isSelected ? modeStyles.icon : ''}`} />
                        <span className="text-xs">{item.name}</span>
                        <span
                          className={`text-[8.5px] px-1 py-0.2 rounded mt-0.5 ${
                            isSelected ? modeStyles.badge : item.tagColor
                          }`}
                        >
                          {item.badge}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Address / Location Row under Scene */}
                <div className="pt-1.5 border-t border-[#f0f0ed] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#474741] min-w-0 flex-1">
                    <MapPin className="w-3.5 h-3.5 text-[#006d36] shrink-0" />
                    <span className="truncate font-medium text-[11px]">
                      {diningMode === 'delivery'
                        ? deliveryAddress
                        : diningMode === 'dine_in'
                        ? '黑曜石流动餐车 01 号（现场吧台 03 号位）'
                        : '大悦城北座中庭黑曜石流动餐车（免运费）'}
                    </span>
                  </div>
                  {diningMode === 'delivery' && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        onChangeAddress();
                        onClose();
                      }}
                      className="text-[11px] font-bold text-[#006d36] hover:underline shrink-0 ml-1.5 cursor-pointer"
                    >
                      修改地址
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Section 2: Shopping Cart Summary (选购餐车清单) */}
              <div className="bg-white rounded-2xl border border-[#e2e3e1] p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-black" />
                    <h3 className="text-xs font-black text-[#1a1c1b]">餐车选购清单</h3>
                  </div>
                  <span className="text-[10.5px] font-bold text-[#006d36]">
                    {cartCount > 0 ? `已选 ${cartCount} 件` : '暂无选购'}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-[#fafaf8] p-2.5 rounded-xl border border-[#e2e3e1]">
                  <div className="space-y-0.5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-[#787770]">合计金额:</span>
                      <span className="text-base font-black text-black">¥{cartTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-[9.5px] text-[#787770]">
                      {cartCount > 0 ? '支持一键快速结账或修改餐品要求' : '探索黑炭汉堡、松露手工玉棋与特调冷萃'}
                    </p>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      onClose();
                      onOpenCart();
                    }}
                    className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-0.5 cursor-pointer shadow-xs"
                  >
                    <span>{cartCount > 0 ? '去结算' : '打开购物车'}</span>
                    <ChevronRight className="w-3 h-3" />
                  </motion.button>
                </div>
              </div>

              {/* Section 3: Active Orders Tracking (实时订单动态) */}
              <div className="bg-white rounded-2xl border border-[#e2e3e1] p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-black" />
                    <h3 className="text-xs font-black text-[#1a1c1b]">订单中心与进度</h3>
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      onClose();
                      onOpenOrders();
                    }}
                    className="text-[11px] font-bold text-[#787770] hover:text-black flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>查看全部 ({orders.length})</span>
                    <ChevronRight className="w-3 h-3" />
                  </motion.button>
                </div>

                {activeOrder ? (
                  <div className="bg-[#f5fbf7] border border-[#d8eee1] p-2.5 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                        <span className="text-xs font-bold text-[#006d36]">
                          {activeOrder.status === 'cooking' ? '黑曜石餐车现烤制作中' : '骑手极速专送中'}
                        </span>
                      </div>
                      <span className="text-[10.5px] font-bold text-[#006d36]">
                        预计 {activeOrder.etaMinutes} 分钟
                      </span>
                    </div>

                    <p className="text-[11px] text-[#1a1c1b] truncate">
                      单号: {activeOrder.orderNo} · {activeOrder.items.map((i) => `${i.name}x${i.quantity}`).join(', ')}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-emerald-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#006d36] transition-all duration-500 rounded-full"
                        style={{ width: `${activeOrder.progressPercent}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-2 px-2.5 bg-[#fafaf8] rounded-xl border border-[#e2e3e1] flex items-center justify-between text-xs text-[#787770]">
                    <span>暂无进行中的订单</span>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        onClose();
                        onOpenOrders();
                      }}
                      className="font-bold text-black underline cursor-pointer text-xs"
                    >
                      历史订单
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Section 4: VIP & Profile Privileges (会员与特权) */}
              <div className="bg-white rounded-2xl border border-[#e2e3e1] p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-black" />
                    <h3 className="text-xs font-black text-[#1a1c1b]">个人与黑曜石 VIP 特权</h3>
                  </div>
                  {isVIPActive ? (
                    <span className="bg-[#FFF8E1] text-[#976000] border border-[#FFE082] px-1.5 py-0.2 rounded-full text-[9.5px] font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#B78103]" /> VIP 会员生效中
                    </span>
                  ) : (
                    <span className="text-[10.5px] text-[#787770]">普通黑曜石会员</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      onClose();
                      if (onOpenCoupons) onOpenCoupons();
                    }}
                    className="p-2 rounded-xl bg-[#fafaf8] border border-[#e2e3e1] hover:border-black flex flex-col items-start gap-1 text-left transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                      <Ticket className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-black truncate">优惠卡券</p>
                      <p className="text-[9px] text-[#787770] truncate">领券与抵扣</p>
                    </div>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      onClose();
                      onOpenVIP();
                    }}
                    className="p-2 rounded-xl bg-[#fafaf8] border border-[#e2e3e1] hover:border-black flex flex-col items-start gap-1 text-left transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#FFF8E1] text-[#976000] flex items-center justify-center shrink-0">
                      <Sparkles className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-black truncate">VIP 特权</p>
                      <p className="text-[9px] text-[#787770] truncate">专属福利</p>
                    </div>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      onClose();
                      onChangeAddress();
                    }}
                    className="p-2 rounded-xl bg-[#fafaf8] border border-[#e2e3e1] hover:border-black flex flex-col items-start gap-1 text-left transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <MapPin className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-black truncate">收货地址</p>
                      <p className="text-[9px] text-[#787770] truncate">切换地址</p>
                    </div>
                  </motion.button>
                </div>
              </div>

              {/* Section 5: Multi-Role System Switcher (端角色切换) */}
              <div className="bg-white rounded-2xl border border-[#e2e3e1] p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-black" />
                    <h3 className="text-xs font-black text-[#1a1c1b]">切换多端工作台</h3>
                  </div>
                  <span className="text-[10.5px] text-[#787770]">当前：{currentRole === 'merchant' ? '商家端' : currentRole === 'rider' ? '骑手端' : '客户端'}</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {rolesConfig.map((r) => {
                    const Icon = r.icon;
                    const isActive = currentRole === r.key;
                    return (
                      <motion.button
                        key={r.key}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          onSelectRole(r.key);
                          onClose();
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-colors cursor-pointer select-none ${
                          isActive
                            ? 'bg-black text-white border-black shadow-xs font-bold'
                            : 'bg-[#fafaf8] border-[#e2e3e1] text-[#474741] hover:bg-neutral-100 hover:text-black font-medium'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 mb-0.5" />
                        <span className="text-xs">{r.title}</span>
                        <span className="text-[8.5px] text-[#787770] mt-0.5 line-clamp-1">
                          {r.subtitle}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Section 6: Tencent CloudBase (腾讯云开发) Status & Sync */}
              {onOpenCloudbase && (
                <div className="bg-white rounded-2xl border border-[#e2e3e1] p-3 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-sky-600" />
                      <h3 className="text-xs font-black text-[#1a1c1b]">腾讯云开发 (TCB)</h3>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9.5px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> tc100-d9gz0e2ko5929e360
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-[#f0f9ff] p-2.5 rounded-xl border border-sky-100 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-sky-950">云数据库与实时订单监听</p>
                      <p className="text-[9.5px] text-sky-700">支持一键同步菜单与三端实时同步测试</p>
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        onClose();
                        onOpenCloudbase();
                      }}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0"
                    >
                      后台管理
                    </motion.button>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-2.5 sm:p-3 bg-white border-t border-[#e2e3e1] flex items-center gap-2 shrink-0">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onNavigateHome();
                  onClose();
                }}
                className="flex-1 py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                返回菜单点单
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onClose();
                  onOpenCart();
                }}
                className="flex-1 py-2 px-3 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>选购清单 ({cartCount})</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
