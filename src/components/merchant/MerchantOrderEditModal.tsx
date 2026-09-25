import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Check,
  Edit3,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Order, OrderItemRecord } from '../../types';
import { merchantBackupEngine } from '../../utils/merchantBackupEngine';
import { SmoothScrollContainer } from './SmoothScrollContainer';

export interface MerchantOrderEditModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSaveOrderEdit: (updatedOrder: Order, editReason: string) => void;
  showToast?: (title: string, desc?: string) => void;
}

export const MerchantOrderEditModal: React.FC<MerchantOrderEditModalProps> = ({
  isOpen,
  order,
  onClose,
  onSaveOrderEdit,
  showToast
}) => {
  if (!isOpen || !order) return null;

  const [items, setItems] = useState<OrderItemRecord[]>(() =>
    order.items.map((it) => ({ ...it }))
  );
  const [editReason, setEditReason] = useState<string>('顾客现场口头要求调整份数与菜品');
  const [newDishName, setNewDishName] = useState<string>('');
  const [newDishPrice, setNewDishPrice] = useState<number>(25);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [enableSnapshot, setEnableSnapshot] = useState<boolean>(true);

  // 数量步进
  const handleQuantityChange = (idx: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((it, i) => {
          if (i !== idx) return it;
          const nextQty = (it.quantity || 1) + delta;
          return nextQty > 0 ? { ...it, quantity: nextQty } : it;
        })
        .filter((it) => (it.quantity || 1) > 0)
    );
  };

  // 删除某一项
  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // 添加新临时菜品
  const handleAddNewDish = () => {
    if (!newDishName.trim()) return;
    const newItem: OrderItemRecord = {
      name: newDishName.trim(),
      quantity: 1,
      price: Number(newDishPrice) || 0,
      options: '商家前台现场增补',
      serveStatus: 'cooking'
    };
    setItems((prev) => [...prev, newItem]);
    setNewDishName('');
    setIsAddingNew(false);
  };

  // 计算调整后的总金额
  const calculatedTotal = items.reduce((sum, it) => {
    if (it.isStruckOff) return sum;
    return sum + (it.price || 0) * (it.quantity || 1);
  }, 0);

  const handleSubmit = () => {
    if (items.length === 0) {
      showToast?.('订单不可为空', '若要废弃整单，请使用强制作废删除功能');
      return;
    }

    // 兜底备份
    if (enableSnapshot) {
      merchantBackupEngine.createSnapshot(
        `修改订单内容前备份: #${(order.orderNo || '').replace(/^#/, '')}`,
        `修改原因: ${editReason}, 调整后菜品总数: ${items.length}`,
        [order]
      );
      merchantBackupEngine.logAction(
        '全渠道订单',
        'update',
        `订单内容调整: #${(order.orderNo || '').replace(/^#/, '')}`,
        `菜品件数由 ${order.items.length} 调整为 ${items.length}, 新总额: ¥${calculatedTotal.toFixed(2)}, 原因: ${editReason}`
      );
    }

    const updated: Order = {
      ...order,
      items,
      totalAmount: calculatedTotal,
      remark: order.remark
        ? `${order.remark} | [商家修改: ${editReason}]`
        : `[商家修改: ${editReason}]`
    };

    onSaveOrderEdit(updated, editReason);
    showToast?.(
      `订单 #${(order.orderNo || '').replace(/^#/, '')} 内容已修改`,
      `总额更新为 ¥${calculatedTotal.toFixed(2)}，已生成安全回滚快照`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-neutral-200 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-white border-b border-[#e6e6e4] text-[#201f1d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-white border border-[#1a1918] text-[#1a1918] flex items-center justify-center shrink-0 shadow-2xs">
              <Edit3 className="w-3.5 h-3.5 text-[#1a1918]" />
            </div>
            <div>
              <h3 className="font-normal text-sm text-[#201f1d] tracking-tight">商家修改订单内容中枢</h3>
              <p className="text-[11px] font-mono text-[#787774]">
                订单 #{order.orderNo?.replace(/^#/, '')} · 桌台 {order.tableCode || 'A1'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#787774] hover:text-[#201f1d] hover:bg-neutral-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <SmoothScrollContainer className="p-4 space-y-4 text-xs" maxHeight="calc(90vh - 130px)">
          {/* 餐品列表及增减编辑 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-neutral-800">订单餐品明细修改</span>
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>现场加菜</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                    it.isStruckOff
                      ? 'bg-red-50/50 border-red-200 opacity-60'
                      : 'bg-neutral-50/80 border-neutral-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold text-neutral-900 ${it.isStruckOff ? 'line-through' : ''}`}>
                        {it.name}
                      </span>
                      {it.isStruckOff && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-red-100 text-red-700 font-bold">
                          已划菜
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      单价 ¥{(it.price || 0).toFixed(2)}
                      {it.options && ` · ${it.options}`}
                    </div>
                  </div>

                  {/* 数量调整 Stepper */}
                  {!it.isStruckOff && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(idx, -1)}
                        className="w-6 h-6 rounded-md bg-white hover:bg-neutral-200 border border-neutral-300 flex items-center justify-center transition cursor-pointer"
                      >
                        <Minus className="w-3 h-3 text-neutral-700" />
                      </button>
                      <span className="font-mono font-bold w-5 text-center text-xs">
                        {it.quantity || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(idx, 1)}
                        className="w-6 h-6 rounded-md bg-white hover:bg-neutral-200 border border-neutral-300 flex items-center justify-center transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-neutral-700" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="w-6 h-6 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition ml-1 cursor-pointer"
                        title="移除该菜品"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 新增菜品输入面板 */}
            {isAddingNew && (
              <div className="mt-2 p-2.5 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/50 space-y-2">
                <span className="font-bold text-emerald-900 block text-[11px]">增添菜品</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="菜品名称 (如：加烤牛舌 x1)"
                    value={newDishName}
                    onChange={(e) => setNewDishName(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs bg-white"
                  />
                  <div className="w-24 relative">
                    <span className="absolute left-2 top-1.5 text-neutral-400 text-xs">¥</span>
                    <input
                      type="number"
                      value={newDishPrice}
                      onChange={(e) => setNewDishPrice(Number(e.target.value))}
                      className="w-full pl-5 pr-2 py-1.5 border border-neutral-200 rounded-lg text-xs bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-2.5 py-1 text-neutral-500 text-[11px]"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewDish}
                    className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[11px]"
                  >
                    确认增加入单
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 修改原因 */}
          <div>
            <label className="block font-bold text-neutral-800 mb-1">
              修改原因说明 (将写入订单操作履历)
            </label>
            <input
              type="text"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-hidden"
              placeholder="如：顾客现场换菜 / 增补主厨特选"
            />
          </div>

          {/* 金额对比汇总 */}
          <div className="p-3 bg-neutral-100/90 rounded-xl border border-neutral-200 flex items-center justify-between">
            <div>
              <span className="text-neutral-500 text-[11px]">调整后订单实收总额</span>
              <div className="text-[10px] text-neutral-400 font-mono">
                原单金额 ¥{order.totalAmount.toFixed(2)}
              </div>
            </div>
            <div className="font-mono font-black text-lg text-neutral-900">
              ¥{calculatedTotal.toFixed(2)}
            </div>
          </div>

          {/* 兜底快照 */}
          <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-neutral-800 text-[11px]">自动创建版本快照兜底</p>
                <p className="text-[10px] text-neutral-500">
                  支持从商家端容灾中心一键回滚恢复本次修改前的订单
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enableSnapshot}
              onChange={(e) => setEnableSnapshot(e.target.checked)}
              className="w-4 h-4 accent-neutral-900 rounded cursor-pointer"
            />
          </div>
        </SmoothScrollContainer>

        {/* Footer */}
        <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-full text-xs font-normal text-neutral-600 hover:bg-neutral-200 transition cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-full text-xs font-normal text-white bg-[#1a1918] hover:bg-black flex items-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>保存修改并同步全渠道</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
