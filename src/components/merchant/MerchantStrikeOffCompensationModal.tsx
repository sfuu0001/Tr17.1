import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  AlertTriangle,
  Gift,
  RefreshCw,
  CreditCard,
  Ticket,
  ShieldCheck,
  Undo2,
  Check,
  Flame,
  ChefHat,
  RotateCcw
} from 'lucide-react';
import { Order, OrderItemRecord } from '../../types';
import { merchantBackupEngine } from '../../utils/merchantBackupEngine';

export interface MerchantStrikeOffCompensationModalProps {
  isOpen: boolean;
  order: Order | null;
  targetItemIndex: number | null;
  onClose: () => void;
  onConfirmStrikeOff: (
    orderId: string,
    itemIndex: number,
    strikeOffInfo: {
      reason: string;
      compensationType: 'refund' | 'free_gift' | 'replace_dish' | 'coupon' | 'none';
      compensationDetail: string;
      compensationAmount: number;
      giftDishName?: string;
      replaceDishName?: string;
    }
  ) => void;
  onRollbackStrikeOff?: (orderId: string, itemIndex: number) => void;
  showToast?: (title: string, desc?: string) => void;
}

const PRESET_REASONS = [
  '后厨核心原料已沽清',
  '炭火火候失误烤糊重做耗时过长',
  '食客口头协商要求退换',
  '品控检验不合格，后厨主动下架',
  '超时未出餐，后厨主动划除致歉',
  '食客重复误点同一道菜'
];

const PRESET_GIFTS = [
  { name: '【暗夜极夜冷萃咖啡】', price: 28, category: '特调冷饮' },
  { name: '【黑曜石松露金黄脆薯】', price: 22, category: '招牌小食' },
  { name: '【现烤肉桂肉桂卷】', price: 18, category: '手作西点' },
  { name: '【茉莉香提特调冰茶】', price: 20, category: '时令冷饮' }
];

const PRESET_REPLACEMENTS = [
  { name: '【招牌安格斯黑椒牛肉堡】', diffPrice: 0, desc: '平价免差额升级换购' },
  { name: '【双层厚牛芝士堡】', diffPrice: 10, desc: '加价 ¥10 奢享升级' },
  { name: '【果木烟熏黑豚五花】', diffPrice: 0, desc: '平价免差额替换' }
];

export const MerchantStrikeOffCompensationModal: React.FC<MerchantStrikeOffCompensationModalProps> = ({
  isOpen,
  order,
  targetItemIndex,
  onClose,
  onConfirmStrikeOff,
  onRollbackStrikeOff,
  showToast
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [compensationType, setCompensationType] = useState<
    'refund' | 'free_gift' | 'replace_dish' | 'coupon' | 'none'
  >('refund');

  const [selectedGift, setSelectedGift] = useState<string>(PRESET_GIFTS[0].name);
  const [selectedReplacement, setSelectedReplacement] = useState<typeof PRESET_REPLACEMENTS[0]>(
    PRESET_REPLACEMENTS[0]
  );
  const [couponAmount, setCouponAmount] = useState<number>(20);
  const [enableSafetySnapshot, setEnableSafetySnapshot] = useState<boolean>(true);

  if (!isOpen || !order || targetItemIndex === null) return null;

  const targetItem: OrderItemRecord | undefined = order.items[targetItemIndex];
  if (!targetItem) return null;

  const isAlreadyStruck = targetItem.isStruckOff === true;
  const itemPrice = (targetItem.price || 0) * (targetItem.quantity || 1);

  const handleSubmit = () => {
    const finalReason = customReason.trim() || selectedReason;
    let detail = '';
    let compAmount = 0;

    if (compensationType === 'refund') {
      compAmount = itemPrice;
      detail = `全额退款 ¥${itemPrice.toFixed(2)} 原路返还食客账户`;
    } else if (compensationType === 'free_gift') {
      detail = `免费补偿赠送${selectedGift}（价值约 ¥28）随单送出`;
      compAmount = 0;
    } else if (compensationType === 'replace_dish') {
      detail = `协商换购为${selectedReplacement.name} (${selectedReplacement.desc})`;
      compAmount = selectedReplacement.diffPrice;
    } else if (compensationType === 'coupon') {
      compAmount = couponAmount;
      detail = `补偿发放【¥${couponAmount} 堂食无门槛歉意代金券】至顾客账户`;
    } else {
      detail = `仅划菜作废，扣减该餐品 ¥${itemPrice.toFixed(2)}`;
      compAmount = itemPrice;
    }

    // 执行快照兜底（支持误操作一键回滚）
    if (enableSafetySnapshot) {
      merchantBackupEngine.createSnapshot(
        `划菜退单兜底备份: #${(order.orderNo || '').replace(/^#/, '')} - ${targetItem.name}`,
        `商家划菜: ${targetItem.name} x${targetItem.quantity}, 原因: ${finalReason}, 补偿方案: ${detail}`,
        [order]
      );
      merchantBackupEngine.logAction(
        '全渠道订单',
        'update',
        `划菜作废: #${(order.orderNo || '').replace(/^#/, '')} - ${targetItem.name}`,
        `原因: ${finalReason}, 补偿方案: ${detail}`
      );
    }

    onConfirmStrikeOff(order.orderNo || order.id, targetItemIndex, {
      reason: finalReason,
      compensationType,
      compensationDetail: detail,
      compensationAmount: compAmount,
      giftDishName: compensationType === 'free_gift' ? selectedGift : undefined,
      replaceDishName: compensationType === 'replace_dish' ? selectedReplacement.name : undefined
    });

    showToast?.(
      `已划除菜品【${targetItem.name}】`,
      `补偿方案【${detail}】已同步客户端视觉效果，已自动保存回滚兜底快照！`
    );
    onClose();
  };

  const handleRollback = () => {
    if (onRollbackStrikeOff) {
      onRollbackStrikeOff(order.orderNo || order.id, targetItemIndex);
      showToast?.(`已成功撤销划菜并恢复【${targetItem.name}】`, '订单餐品状态已恢复原样，客户端已实时消除划线效果');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-neutral-200 flex flex-col max-h-[92vh]"
      >
        {/* 顶部标题栏 */}
        <div className="px-4 py-3.5 bg-neutral-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/90 flex items-center justify-center text-white shrink-0">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">
                {isAlreadyStruck ? '菜品已划菜 · 补偿状态管理与恢复' : '商家划菜退菜与客诉补偿决策台'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                订单 #{order.orderNo?.replace(/^#/, '')} · 桌台 {order.tableCode || 'A1'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 滚动内容区 */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* 目标菜品信息 */}
          <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-neutral-900 text-sm">{targetItem.name}</span>
                <span className="font-mono font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded text-[10px]">
                  x{targetItem.quantity}
                </span>
                {targetItem.addedBy && (
                  <span className="text-[10px] text-neutral-600 bg-white px-1.5 py-0.2 rounded border border-neutral-200">
                    由 {targetItem.addedBy} 点餐
                  </span>
                )}
              </div>
              {targetItem.options && (
                <p className="text-[11px] text-neutral-500 mt-0.5">规格：{targetItem.options}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-neutral-400 text-[10px]">菜品单价</div>
              <div className="font-mono font-bold text-base text-neutral-900">
                ¥{itemPrice.toFixed(2)}
              </div>
            </div>
          </div>

          {/* 如果已经划菜，显示已划菜信息及一键撤销回滚按钮 */}
          {isAlreadyStruck && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  该菜品当前处于【已划菜作废】状态
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  {targetItem.struckOffAt || '已生效'}
                </span>
              </div>
              <p className="text-neutral-700 text-[11px]">
                划菜原因备注：<span className="font-medium text-neutral-900">{targetItem.struckOffReason || '后厨沽清'}</span>
              </p>
              <p className="text-neutral-700 text-[11px]">
                执行补偿方案：<span className="font-semibold text-emerald-700">{targetItem.compensationDetail || '已退款'}</span>
              </p>
              <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                <span className="text-[11px] text-amber-900">若属于后厨误触，可立即恢复原单：</span>
                <button
                  type="button"
                  onClick={handleRollback}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>一键撤销划菜并恢复</span>
                </button>
              </div>
            </div>
          )}

          {/* 划菜原因选择 */}
          <div>
            <label className="block font-bold text-neutral-800 mb-1.5 flex items-center gap-1">
              <span>1. 划菜作废原因 (将展示在食客端视觉删除线下)</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
              {PRESET_REASONS.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedReason(r);
                    setCustomReason('');
                  }}
                  className={`text-left p-2 rounded-lg border text-[11px] transition cursor-pointer ${
                    selectedReason === r && !customReason
                      ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                      : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="或输入自定义划菜原因备注（如：主厨协商将换作时令特调...）"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-hidden"
            />
          </div>

          {/* 补偿方案选择 */}
          <div>
            <label className="block font-bold text-neutral-800 mb-1.5 flex items-center gap-1">
              <span>2. 菜品客诉补偿方案 (保障食客体验与留存)</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2.5">
              <button
                type="button"
                onClick={() => setCompensationType('refund')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                  compensationType === 'refund'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-bold shadow-2xs'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>全额退款</span>
                <span className="text-[10px] text-emerald-700 font-mono">¥{itemPrice.toFixed(2)}</span>
              </button>

              <button
                type="button"
                onClick={() => setCompensationType('free_gift')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                  compensationType === 'free_gift'
                    ? 'border-orange-600 bg-orange-50/80 text-orange-900 font-bold shadow-2xs'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                }`}
              >
                <Gift className="w-4 h-4 text-orange-600" />
                <span>免费赠送</span>
                <span className="text-[10px] text-orange-700">招牌现货小食</span>
              </button>

              <button
                type="button"
                onClick={() => setCompensationType('replace_dish')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                  compensationType === 'replace_dish'
                    ? 'border-purple-600 bg-purple-50/80 text-purple-900 font-bold shadow-2xs'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                }`}
              >
                <RefreshCw className="w-4 h-4 text-purple-600" />
                <span>加价/平价换购</span>
                <span className="text-[10px] text-purple-700">升级新菜品</span>
              </button>

              <button
                type="button"
                onClick={() => setCompensationType('coupon')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                  compensationType === 'coupon'
                    ? 'border-amber-600 bg-amber-50/80 text-amber-900 font-bold shadow-2xs'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                }`}
              >
                <Ticket className="w-4 h-4 text-amber-600" />
                <span>致歉代金券</span>
                <span className="text-[10px] text-amber-700 font-mono">¥{couponAmount}券</span>
              </button>
            </div>

            {/* 补偿二级明细配置 */}
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
              {compensationType === 'refund' && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">应退金额 (原路返还食客微信/钱包)：</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    ¥{itemPrice.toFixed(2)}
                  </span>
                </div>
              )}

              {compensationType === 'free_gift' && (
                <div className="space-y-1.5">
                  <span className="text-neutral-600 block text-[11px]">选择本次随单免费赠送的现货餐品：</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {PRESET_GIFTS.map((g, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedGift(g.name)}
                        className={`p-1.5 rounded-lg border text-left text-[11px] flex items-center justify-between transition cursor-pointer ${
                          selectedGift === g.name
                            ? 'border-orange-600 bg-orange-100 text-orange-950 font-bold'
                            : 'border-neutral-200 bg-white text-neutral-700'
                        }`}
                      >
                        <span>{g.name}</span>
                        <span className="font-mono text-orange-700">¥0 (原¥{g.price})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {compensationType === 'replace_dish' && (
                <div className="space-y-1.5">
                  <span className="text-neutral-600 block text-[11px]">选择换购目标菜品与差价策略：</span>
                  <div className="space-y-1.5">
                    {PRESET_REPLACEMENTS.map((rep, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedReplacement(rep)}
                        className={`w-full p-2 rounded-lg border text-left text-[11px] flex items-center justify-between transition cursor-pointer ${
                          selectedReplacement.name === rep.name
                            ? 'border-purple-600 bg-purple-100 text-purple-950 font-bold'
                            : 'border-neutral-200 bg-white text-neutral-700'
                        }`}
                      >
                        <div>
                          <div>{rep.name}</div>
                          <div className="text-[10px] text-neutral-500 font-normal">{rep.desc}</div>
                        </div>
                        <span className="font-mono font-bold text-purple-800">
                          {rep.diffPrice === 0 ? '免差额' : `+¥${rep.diffPrice}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {compensationType === 'coupon' && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">发放致歉立减券面额：</span>
                  <div className="flex items-center gap-1.5">
                    {[10, 20, 30].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCouponAmount(amt)}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                          couponAmount === amt
                            ? 'bg-amber-600 text-white'
                            : 'bg-white border border-neutral-200 text-neutral-700'
                        }`}
                      >
                        ¥{amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 数据回滚与容灾兜底开关 */}
          <div className="p-2.5 bg-neutral-100/90 rounded-xl border border-neutral-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-neutral-800 text-[11px]">
                  启用版本快照兜底（支持一键回滚撤销误操作）
                </p>
                <p className="text-[10px] text-neutral-500">
                  自动记录修改前原单，若属手滑或后厨误触可毫秒级恢复
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enableSafetySnapshot}
              onChange={(e) => setEnableSafetySnapshot(e.target.checked)}
              className="w-4 h-4 accent-neutral-900 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-200 transition cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>确认划菜并执行补偿方案</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
