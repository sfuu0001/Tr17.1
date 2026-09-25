import React, { useState, useEffect } from 'react';
import { ArrowUpFromLine, X, AlertTriangle, Check, Trash2 } from 'lucide-react';
import { SkuParamItem } from '../../../types';

interface SkuStockOutModalProps {
  sku: SkuParamItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    actionType: 'permanent_delete' | 'mark_out_of_stock' | 'kitchen_loss_stock_out';
    quantity: number;
    operator: string;
    reason: string;
  }) => void;
}

export const SkuStockOutModal: React.FC<SkuStockOutModalProps> = ({
  sku,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [actionType, setActionType] = useState<'permanent_delete' | 'mark_out_of_stock' | 'kitchen_loss_stock_out'>(
    'kitchen_loss_stock_out'
  );
  const [quantity, setQuantity] = useState<number>(0);
  const [operator, setOperator] = useState<string>('李店长 (EMP-8001)');
  const [reason, setReason] = useState<string>('后厨晚市串肉领料出库');

  useEffect(() => {
    if (sku) {
      if (sku.currentStock > 0) {
        setActionType('kitchen_loss_stock_out');
        setQuantity(sku.currentStock);
        setReason('后厨晚市串肉领料出库');
      } else {
        setActionType('permanent_delete');
        setQuantity(0);
        setReason('SKU档案淘汰或供方停产');
      }
    }
  }, [sku]);

  if (!isOpen || !sku) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      actionType,
      quantity,
      operator,
      reason
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-md rounded-[3px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs text-[#0f172a]">
        <div className="bg-red-800 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <div>
              <h3 className="font-bold text-sm">库存出库 / 状态变更 / 注销</h3>
              <p className="text-[11px] text-red-100">{sku.name} ({sku.sku})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-red-200 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div className="bg-[#f8fafc] p-2.5 rounded border border-[#e2e8f0] text-[11px] text-[#475569]">
            当前在库状态: <strong>{sku.stockStatus === 'in_stock' ? '在库现货' : sku.stockStatus === 'pending_in' ? '待入库在途' : '未在库/缺货'}</strong> · 当前存量: <strong className="">{sku.currentStock} {sku.unit}</strong> (参考价值 ¥{sku.stockValue.toFixed(1)})
          </div>

          <div>
            <label className="block text-[11px] text-[#64748b] font-medium mb-1.5">选择出库/核销操作类型</label>
            <div className="space-y-2">
              <label className={`block p-2.5 rounded border cursor-pointer transition-all ${
                actionType === 'kitchen_loss_stock_out'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 font-semibold'
                  : 'bg-white border-[#cbd5e1] text-[#64748b]'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="deleteActionType"
                    checked={actionType === 'kitchen_loss_stock_out'}
                    onChange={() => {
                      setActionType('kitchen_loss_stock_out');
                      setReason('后厨晚市串肉领料出库');
                    }}
                  />
                  <span>领料出库 / 烹饪损耗核销</span>
                </div>
                <div className="text-[10px] text-[#64748b] ml-5 mt-0.5">
                  扣减部分或全部在库存量，保留出肉率与采购单价记录留痕
                </div>
              </label>

              <label className={`block p-2.5 rounded border cursor-pointer transition-all ${
                actionType === 'mark_out_of_stock'
                  ? 'bg-red-50 border-red-500 text-red-900 font-semibold'
                  : 'bg-white border-[#cbd5e1] text-[#64748b]'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="deleteActionType"
                    checked={actionType === 'mark_out_of_stock'}
                    onChange={() => {
                      setActionType('mark_out_of_stock');
                      setReason('批次售尽清库下架');
                    }}
                  />
                  <span>清空库存并标为「未在库/售尽缺货」</span>
                </div>
                <div className="text-[10px] text-[#64748b] ml-5 mt-0.5">
                  将库存清零并标记为缺货，保留该 SKU 档案与历史出肉率标准
                </div>
              </label>

              <label className={`block p-2.5 rounded border cursor-pointer transition-all ${
                actionType === 'permanent_delete'
                  ? 'bg-red-50 border-red-700 text-red-900 font-semibold'
                  : 'bg-white border-[#cbd5e1] text-[#64748b]'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="deleteActionType"
                    checked={actionType === 'permanent_delete'}
                    onChange={() => {
                      setActionType('permanent_delete');
                      setReason('SKU档案淘汰或供方停产');
                    }}
                  />
                  <span>彻底注销该 SKU 档案 (永久移除)</span>
                </div>
                <div className="text-[10px] text-red-600 ml-5 mt-0.5">
                  从数字参数中台中彻底移除本原料 SKU
                </div>
              </label>
            </div>
          </div>

          {actionType === 'kitchen_loss_stock_out' && (
            <div>
              <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                本次出库数量 ({sku.unit}) (最大 {sku.currentStock}{sku.unit})
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max={sku.currentStock}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] text-[#64748b] font-medium mb-1">操作原因与出库留痕说明</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none"
            />
          </div>

          <div className="bg-[#f8fafc] -mx-4 -mb-4 px-4 py-3 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-[2px] bg-red-700 text-white hover:bg-red-800 font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>确认执行操作</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
