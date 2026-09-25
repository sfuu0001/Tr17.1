import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, X, Check, Calendar, DollarSign, Scale, Clock, Warehouse, UserCheck } from 'lucide-react';
import { SkuParamItem } from '../../../types';

interface SkuStockInModalProps {
  sku: SkuParamItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    quantity: number;
    purchasePrice: number;
    standardYieldRate: number;
    batchNo: string;
    shelfLifeDays: number;
    productionDate: string;
    storageLocation: string;
    operator: string;
    notes: string;
  }) => void;
}

export const SkuStockInModal: React.FC<SkuStockInModalProps> = ({
  sku,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [form, setForm] = useState({
    quantity: 15,
    purchasePrice: 50,
    standardYieldRate: 0.75,
    batchNo: '',
    shelfLifeDays: 5,
    productionDate: new Date().toISOString().slice(0, 10),
    storageLocation: '',
    operator: '李店长 (EMP-8001)',
    notes: '冷链到货，验收入库合格'
  });

  useEffect(() => {
    if (sku) {
      setForm({
        quantity: sku.reorderSuggestion || 15,
        purchasePrice: sku.purchasePrice || 50,
        standardYieldRate: sku.standardYieldRate || 0.75,
        batchNo: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`,
        shelfLifeDays: sku.shelfLifeDays || 5,
        productionDate: new Date().toISOString().slice(0, 10),
        storageLocation: sku.storageLocation || '冷库 A-01 (0-4℃)',
        operator: '张采购 (EMP-8003)',
        notes: '冷链专车送达，封签完好，温控合格'
      });
    }
  }, [sku]);

  if (!isOpen || !sku) return null;

  const computeExpiry = (pDate: string, days: number) => {
    try {
      const d = new Date(pDate);
      d.setDate(d.getDate() + Number(days));
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  const expiryDate = computeExpiry(form.productionDate, form.shelfLifeDays);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-lg rounded-[3px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs text-[#0f172a]">
        <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-emerald-200" />
            <div>
              <h3 className="font-bold text-sm">物资验收入库 · 转为在库现货</h3>
              <p className="text-[11px] text-emerald-100">{sku.name} ({sku.sku})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-200 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
          <div className="bg-emerald-50 p-2.5 rounded border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
            当前状态: <strong>{sku.stockStatus === 'pending_in' ? '待入库/冷链在途' : '未在库/缺货'}</strong>。
            入库验收将把物资转为「在库现货」，并记录本次进货单价、出肉率实测值与保质期。
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                本次入库数量 ({sku.unit}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                实际采购单价 (元/{sku.unit}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b]">¥</span>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] pl-6 pr-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                实测出肉率 (0.50 - 1.00) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.4"
                max="1.0"
                required
                value={form.standardYieldRate}
                onChange={(e) => setForm({ ...form, standardYieldRate: Number(e.target.value) })}
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#16a34a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#64748b] font-medium mb-1">保质期 (天)</label>
              <input
                type="number"
                value={form.shelfLifeDays}
                onChange={(e) => setForm({ ...form, shelfLifeDays: Number(e.target.value) })}
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#64748b] font-medium mb-1">生产批次编号</label>
              <input
                type="text"
                value={form.batchNo}
                onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#64748b] font-medium mb-1">生产/包装日期</label>
              <input
                type="date"
                value={form.productionDate}
                onChange={(e) => setForm({ ...form, productionDate: e.target.value })}
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2 py-1.5 text-xs text-[#0f172a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#64748b] font-medium mb-1">预计保质到期</label>
              <div className="bg-[#f1f5f9] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#475569]">
                {expiryDate}
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#64748b] font-medium mb-1">存放库位与温区</label>
              <input
                type="text"
                value={form.storageLocation}
                onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-[#64748b] font-medium mb-1">验收说明与冷链温控备注</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
              className="px-4 py-1.5 rounded-[2px] bg-emerald-600 text-white hover:bg-emerald-700 font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>确认验收入库</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
