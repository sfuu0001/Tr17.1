import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Copy,
  Check,
  Lock,
  Unlock,
  Utensils,
  ShoppingBag,
  Bike,
  Clock,
  User,
  Store,
  MapPin,
  ShieldCheck,
  FileText,
  Pin,
  PinOff
} from 'lucide-react';
import { Order } from '../../types';
import { getUnifiedTruckName } from '../../utils/truckNaming';
import { getOrGeneratePickupCode, getPickupShelfCode } from '../../utils/pickupCodeEngine';
import { resolveOrderChannelType } from '../../utils/orderNormalizer';
import { resolveOrderDay } from './MerchantOrders';

interface OrderMetaDrawerCardProps {
  order: Order;
  isPinned: boolean;
  onTogglePin: () => void;
  onClose: () => void;
  onToggleLock: (order: Order) => void;
  showToast?: (msg: string) => void;
  className?: string;
}

export const OrderMetaDrawerCard: React.FC<OrderMetaDrawerCardProps> = ({
  order,
  isPinned,
  onTogglePin,
  onClose,
  onToggleLock,
  showToast,
  className = ''
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const orderChannel = resolveOrderChannelType(order);
  const isDineIn = orderChannel === 'dine_in';
  const isPickup = orderChannel === 'pickup';
  const isDelivery = orderChannel === 'delivery';

  const pickupCode = getOrGeneratePickupCode(order.orderNo, order.pickupCode);
  const shelfCode = getPickupShelfCode(order.id || order.orderNo, order.pickupShelfCode);
  const fullDate = `${resolveOrderDay(order)} ${order.createdTime || '12:36:20'}`;
  const fullTruckName = getUnifiedTruckName(order.truckId || order.truckName, 'full');
  const fullUid = order.userId || 'tcb_u_guest_unregistered';

  const handleCopy = (text: string, label: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
      showToast?.(`已复制${label}: ${text}`);
    } catch {
      showToast?.('复制失败，请手动选择复制');
    }
  };

  const handleCopyFullArchive = () => {
    const archiveText = `【工单完整档案】\n单号: ${order.orderNo}\n渠道: ${
      isDineIn ? '堂食就餐' : isPickup ? '到店自提' : '外卖专送'
    }\n下单时间: ${fullDate}\n顾客UID: ${fullUid}\n餐车档口: ${fullTruckName}\n${
      isDineIn
        ? `桌位: ${order.tableZone || '餐车外摆区'} · ${order.tableCode ? `${order.tableCode}号桌` : 'A2号桌'}\n服务员: ${
            order.serverName || '阿豪 (No.02)'
          }`
        : isPickup
        ? `自提码: #${pickupCode}\n取餐柜格: ${shelfCode}`
        : `骑手: ${order.courierName || '陈志远 (专线 R-8821)'}\n送达地址: ${
            order.deliveryAddress || '西藏北路 166 号大悦城商务座 1204 室'
          }`
    }\n退单权限: ${order.nonRefundable ? '已锁定不可退单' : '允许自主退单'}`;

    handleCopy(archiveText, '全单完整档案');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`absolute left-2 right-2 top-14 z-40 bg-white/98 backdrop-blur-md rounded-xl border border-neutral-300 shadow-xl p-3.5 text-xs text-neutral-800 space-y-3 max-h-[88%] overflow-y-auto ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 抽屉头部 */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-neutral-900 text-xs">
            <FileText className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
            <span className="whitespace-nowrap">工单履约与系统完整档案</span>
          </div>

          <div className="flex items-center gap-1">
            {isDineIn ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-800 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                <Utensils className="w-3 h-3 text-neutral-600 shrink-0" />
                <span>堂食</span>
              </span>
            ) : isPickup ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                <ShoppingBag className="w-3 h-3 text-amber-700 shrink-0" />
                <span>自提</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                <Bike className="w-3 h-3 text-emerald-700 shrink-0" />
                <span>专送</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onTogglePin}
            className={`p-1 rounded transition-colors cursor-pointer text-xs flex items-center gap-1 px-1.5 py-0.5 border ${
              isPinned
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-500 hover:text-neutral-900 border-neutral-200 hover:bg-neutral-100'
            }`}
            title={isPinned ? '点击取消固定抽屉（恢复鼠标悬停触发）' : '点击常驻固定抽屉卡片'}
          >
            {isPinned ? <PinOff className="w-3 h-3 shrink-0" /> : <Pin className="w-3 h-3 shrink-0" />}
            <span className="text-[10px] whitespace-nowrap">{isPinned ? '已固定' : '固定'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition-colors cursor-pointer"
            title="关闭抽屉卡片"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 模块1：桌台与履约详细信息 */}
      <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 space-y-1.5">
        <div className="text-[11px] font-bold text-neutral-700 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-neutral-500" />
            <span>交付与就餐履约档案</span>
          </span>
          <span className="text-neutral-400 font-normal text-[10px]">
            {isDineIn ? '堂食桌台服务' : isPickup ? '智能保温柜自提' : '极速专送直达'}
          </span>
        </div>

        {isDineIn ? (
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-white p-2 rounded border border-neutral-200">
              <span className="text-neutral-500 text-[10px] block">桌台区域与编号</span>
              <strong className="text-neutral-900 font-bold block truncate">
                {order.tableZone || '餐车外摆区'} · {order.tableCode ? `${order.tableCode} 号桌` : 'A2 号桌'}
              </strong>
            </div>
            <div className="bg-white p-2 rounded border border-neutral-200">
              <span className="text-neutral-500 text-[10px] block">跟台服务员与工号</span>
              <strong className="text-neutral-900 font-bold block truncate">
                {order.serverName || '阿豪 (No.02)'}
              </strong>
            </div>
          </div>
        ) : isPickup ? (
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-white p-2 rounded border border-neutral-200">
              <span className="text-neutral-500 text-[10px] block">顾客自提核销码</span>
              <strong className="text-amber-900 font-bold text-sm block">
                #{pickupCode}
              </strong>
            </div>
            <div className="bg-white p-2 rounded border border-neutral-200">
              <span className="text-neutral-500 text-[10px] block">智能保温柜格位</span>
              <strong className="text-neutral-900 font-bold block">
                {shelfCode}
              </strong>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2 rounded border border-neutral-200">
                <span className="text-neutral-500 text-[10px] block">接单专送骑手</span>
                <strong className="text-neutral-900 font-bold block truncate">
                  {order.courierName || '陈志远 (专线 R-8821)'}
                </strong>
              </div>
              <div className="bg-white p-2 rounded border border-neutral-200">
                <span className="text-neutral-500 text-[10px] block">存餐格位 / 预计耗时</span>
                <strong className="text-neutral-900 font-bold block">
                  格位 {shelfCode} · 约 {order.etaMinutes || 6} 分钟
                </strong>
              </div>
            </div>
            <div className="bg-white p-2 rounded border border-neutral-200">
              <span className="text-neutral-500 text-[10px] block">送达地址全称</span>
              <span className="text-neutral-900 font-medium block break-words">
                {order.deliveryAddress || '西藏北路 166 号大悦城商务座 1204 室'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 模块2：完整用户识别码与身份 */}
      <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 space-y-1.5">
        <div className="text-[11px] font-bold text-neutral-700 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3 text-neutral-500" />
            <span>顾客身份与系统溯源</span>
          </span>
          <button
            type="button"
            onClick={() => handleCopy(fullUid, '用户UID')}
            className="text-[10px] text-neutral-600 hover:text-neutral-900 flex items-center gap-1 cursor-pointer bg-white px-1.5 py-0.5 rounded border border-neutral-200 transition-colors"
          >
            {copiedField === '用户UID' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copiedField === '用户UID' ? '已复制' : '复制完整UID'}</span>
          </button>
        </div>

        <div className="bg-white p-2 rounded border border-neutral-200 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-neutral-500 text-[10px] shrink-0">完整 UID:</span>
            <span className="text-neutral-900 font-medium break-all select-all text-[11px] text-right">
              {fullUid}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-[11px]">
            <span className="text-neutral-500 text-[10px]">下单完整时间:</span>
            <span className="font-medium text-neutral-800 flex items-center gap-1">
              <Clock className="w-3 h-3 text-neutral-400" />
              <span>{fullDate}</span>
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-[11px]">
            <span className="text-neutral-500 text-[10px]">归属餐车档口:</span>
            <span className="font-medium text-neutral-800 flex items-center gap-1">
              <Store className="w-3 h-3 text-neutral-400" />
              <span>{fullTruckName}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 模块3：退款政策与工单管控 */}
      <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-neutral-700 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-neutral-500" />
            <span>退款权限与工单控制</span>
          </span>

          <button
            type="button"
            onClick={() => onToggleLock(order)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer border ${
              order.nonRefundable
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            {order.nonRefundable ? (
              <>
                <Lock className="w-3 h-3 text-rose-600 shrink-0" />
                <span>不可退单 (点击解锁)</span>
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3 text-neutral-400 shrink-0" />
                <span>允许退单 (点击锁定)</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[10px] text-neutral-500 leading-tight">
          {order.nonRefundable
            ? '当前工单已开启防撤单保护。食客端申请退款将提示需商家线下沟通，不可自主撤回。'
            : '当前工单处于开放退单模式。在后厨划菜出餐前，食客可发起全额撤单退款。'}
        </p>
      </div>

      {/* 底部全单档案快捷复制 */}
      <div className="pt-1 flex items-center justify-between gap-2 border-t border-neutral-200 text-xs">
        <button
          type="button"
          onClick={handleCopyFullArchive}
          className="flex-1 py-1.5 px-3 bg-neutral-900 hover:bg-black text-white rounded-md font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs leading-none"
        >
          {copiedField === '全单完整档案' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>复制全单履约文本</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="py-1.5 px-3 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-md font-medium text-xs cursor-pointer transition-colors leading-none"
        >
          收起抽屉
        </button>
      </div>
    </motion.div>
  );
};
