import React, { useState, useEffect } from 'react';
import {
  X,
  PackageCheck,
  Calendar,
  Building2,
  DollarSign,
  AlertTriangle,
  FileText,
  Check,
  Truck,
  Hash,
  MapPin,
  Clock
} from 'lucide-react';
import { MaterialItem, PurchaseRecord } from '../../../types';

interface MaterialStockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: MaterialItem | null;
  onConfirmStockIn: (params: {
    materialId: string;
    arrivalQty: number;
    batchNo: string;
    unitPrice: number;
    supplier: string;
    storageLocation: string;
    expiryDate: string;
    notes: string;
  }) => void;
}

export const MaterialStockInModal: React.FC<MaterialStockInModalProps> = ({
  isOpen,
  onClose,
  material,
  onConfirmStockIn
}) => {
  const [arrivalQty, setArrivalQty] = useState<number>(10);
  const [batchNo, setBatchNo] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [supplier, setSupplier] = useState<string>('');
  const [storageLocation, setStorageLocation] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('首批实物到店验收合格上架');

  useEffect(() => {
    if (material) {
      setArrivalQty(material.reorderSuggestion || 10);
      setUnitPrice(material.purchasePrice || 0);
      setSupplier(material.supplier || '直供冷链渠道');
      setStorageLocation(material.storageLocation || '冷库 A-01');
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      setBatchNo(`LOT-${todayStr}-${Math.floor(100 + Math.random() * 900)}`);
      
      const exp = new Date();
      exp.setDate(exp.getDate() + (material.shelfLifeDays || 7));
      setExpiryDate(exp.toISOString().slice(0, 10));
    }
  }, [material]);

  if (!isOpen || !material) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (arrivalQty <= 0) {
      alert('入库数量必须大于 0！');
      return;
    }
    onConfirmStockIn({
      materialId: material.id,
      arrivalQty: Number(arrivalQty),
      batchNo,
      unitPrice: Number(unitPrice),
      supplier,
      storageLocation,
      expiryDate,
      notes
    });
    onClose();
  };

  const calculatedTotal = (Number(arrivalQty) * Number(unitPrice)).toFixed(2);
  const projectedStock = (material.currentStock + Number(arrivalQty)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-lg border border-[#cbd5e1] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#e2e8f0] bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm sm:text-base font-bold">手动入库上架 · 实物验收录入</h2>
              <p className="text-[11px] text-slate-400">
                将实际到货原材料录入在库库存，自动校准安全库存并生成履约单据
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Info Summary */}
        <div className="p-3.5 bg-slate-50 border-b border-[#e2e8f0] flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-[#0f172a] text-sm">{material.name}</div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              编码: {material.sku} | 规格: {material.spec || '标准装'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">当前在库库存</div>
            <div className={`font-mono font-bold text-sm ${material.currentStock === 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {material.currentStock} {material.unit}
            </div>
            {material.currentStock === 0 && (
              <span className="text-[10px] text-amber-700 bg-amber-100 px-1 py-0.2 rounded font-medium">
                待手动上架
              </span>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            {/* Arrival Quantity */}
            <div>
              <label className="block text-[#475569] font-medium mb-1">
                实际到货入库量 ({material.unit}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={arrivalQty}
                  onChange={(e) => setArrivalQty(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[3px] px-3 py-1.5 font-mono text-sm font-bold text-[#0f172a] focus:outline-none focus:border-slate-800"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                安全警戒线: {material.safetyStock} {material.unit}
              </span>
            </div>

            {/* Unit Price */}
            <div>
              <label className="block text-[#475569] font-medium mb-1">
                到货采购单价 (¥/{material.unit})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[3px] px-3 py-1.5 font-mono text-sm text-[#0f172a] focus:outline-none focus:border-slate-800"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                采购小计: ¥{calculatedTotal}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Batch Number */}
            <div>
              <label className="block text-[#475569] font-medium mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-400" />
                <span>实物批次号 (Batch)</span>
              </label>
              <input
                type="text"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                placeholder="LOT-2026xxxx-xx"
                className="w-full bg-white border border-[#cbd5e1] rounded-[3px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none focus:border-slate-800"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-[#475569] font-medium mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>保质到期日</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-white border border-[#cbd5e1] rounded-[3px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Storage Location */}
            <div>
              <label className="block text-[#475569] font-medium mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>入库储藏仓位</span>
              </label>
              <input
                type="text"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                placeholder="例如: 冷库 A-01 (0-4℃)"
                className="w-full bg-white border border-[#cbd5e1] rounded-[3px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-slate-800"
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-[#475569] font-medium mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>供应渠道商</span>
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="供应商名称"
                className="w-full bg-white border border-[#cbd5e1] rounded-[3px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[#475569] font-medium mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-slate-400" />
              <span>入库验收与上架备注</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="外观新鲜、温控符合标准、无异味..."
              className="w-full bg-white border border-[#cbd5e1] rounded-[3px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-slate-800"
            />
          </div>

          {/* Stock Projection Notice */}
          <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between">
            <div>
              入库确认后，实际在库量将变更为：
              <strong className="font-mono ml-1 text-sm">{projectedStock} {material.unit}</strong>
            </div>
            <span className="font-medium text-emerald-700">状态：正常在售</span>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-white border border-[#cbd5e1] hover:bg-slate-50 text-slate-700 rounded-[3px] font-medium text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-[3px] text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>确认验收入库上架</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
