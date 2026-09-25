import React, { useState } from 'react';
import { Plus, X, Tag, DollarSign, Warehouse, CheckCircle2 } from 'lucide-react';
import { SkuParamItem, SkuHistoryLog } from '../../../types';

interface SkuCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (item: SkuParamItem) => void;
  categories: string[];
  totalExistingCount: number;
}

export const SkuCreateModal: React.FC<SkuCreateModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  categories,
  totalExistingCount
}) => {
  const [formData, setFormData] = useState<Partial<SkuParamItem>>({
    name: '',
    sku: `SKU-RM-${String(totalExistingCount + 1).padStart(3, '0')}`,
    category: '肉类原料',
    purchasePrice: 45.0,
    standardYieldRate: 0.75,
    skewersPerKg: 30.0,
    shelfLifeDays: 5,
    stockStatus: 'out_of_stock',
    isInStock: false,
    currentStock: 0,
    unit: 'kg',
    safetyStock: 10.0,
    reorderSuggestion: 20.0,
    storageLocation: '冷库 A-02 (0-4℃)',
    batchNo: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`,
    spec: '20kg/箱 (冷鲜真空)',
    supplier: '中粮安达直供冷链',
    productionDate: new Date().toISOString().slice(0, 10),
    meatYieldDesc: '去筋膜修边后标准出肉率75%'
  });

  if (!isOpen) return null;

  const computeExpiryDate = (prodDate?: string, days?: number) => {
    if (!prodDate || !days) return '';
    try {
      const d = new Date(prodDate);
      d.setDate(d.getDate() + Number(days));
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) return;

    const pPrice = Number(formData.purchasePrice) || 0;
    const yRate = Number(formData.standardYieldRate) || 0.75;
    const sLife = Number(formData.shelfLifeDays) || 7;
    const initStock = formData.stockStatus === 'in_stock' ? (Number(formData.currentStock) || 0) : 0;
    const isActuallyInStock = formData.stockStatus === 'in_stock' && initStock > 0;
    const expDate = computeExpiryDate(formData.productionDate, sLife);
    const nowStr = new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16);

    const initialLog: SkuHistoryLog = {
      timestamp: nowStr,
      field: '初始建档与参数录入',
      before: '系统无档案',
      after: `初始建档: ${formData.stockStatus === 'in_stock' ? `在库 ${initStock}${formData.unit}` : formData.stockStatus === 'pending_in' ? '待入库/在途' : '未在库/仅建档'} | 采购单价 ¥${pPrice}/${formData.unit} | 标杆出肉率 ${(yRate * 100).toFixed(0)}% | 保质期 ${sLife}天 | 批次 ${formData.batchNo || '未定'}`,
      operator: '李店长 (EMP-8001)'
    };

    const newItem: SkuParamItem = {
      id: `sku-p-${Date.now()}`,
      sku: formData.sku.toUpperCase(),
      name: formData.name,
      category: (formData.category as any) || '肉类原料',
      purchasePrice: pPrice,
      safetyStock: Number(formData.safetyStock) || 10,
      reorderSuggestion: Number(formData.reorderSuggestion) || 20,
      shelfLifeDays: sLife,
      currentStock: initStock,
      unit: formData.unit || 'kg',
      standardYieldRate: yRate,
      skewersPerKg: Number(formData.skewersPerKg) || 30.0,
      storageLocation: formData.storageLocation || '冷库 A-01 (0-4℃)',
      stockValue: initStock * pPrice,
      stockStatus: formData.stockStatus || (isActuallyInStock ? 'in_stock' : 'out_of_stock'),
      isInStock: isActuallyInStock,
      batchNo: formData.batchNo || `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`,
      spec: formData.spec || '标准包装',
      supplier: formData.supplier || '精选供应商',
      productionDate: formData.productionDate || new Date().toISOString().slice(0, 10),
      expiryDate: expDate,
      meatYieldDesc: formData.meatYieldDesc || `标准出肉率${(yRate * 100).toFixed(0)}%`,
      sparklineHistory: [yRate * 100 - 2, yRate * 100 - 1, yRate * 100, yRate * 100 + 1, yRate * 100],
      historyLogs: [initialLog]
    };

    onCreate(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-2xl rounded-[3px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs text-[#0f172a]">
        {/* Header */}
        <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[2px] bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">新增原材料 SKU & 库存数字参数档案</h3>
              <p className="text-[11px] text-slate-300">区分在库/未在库状态 · 精确录入采购单价、标杆出肉率与保质期天数</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Section 1: 基础属性与在库状态 */}
          <div className="bg-[#f8fafc] p-3 rounded-[3px] border border-[#e2e8f0] space-y-3">
            <div className="font-bold text-xs text-[#0f172a] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              <span>① 物品基础信息与在库状态区分</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                  物品名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 鲜切羊排肉"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                  SKU 编码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">所属品类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2 py-1.5 text-xs text-[#0f172a] focus:outline-none"
                >
                  {categories.filter((c) => c !== '全部').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stock Status Selector */}
            <div>
              <label className="block text-[11px] text-[#64748b] font-medium mb-1.5">
                初始在库状态 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className={`p-2 rounded border text-center cursor-pointer transition-all ${
                  formData.stockStatus === 'in_stock'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                    : 'bg-white border-[#cbd5e1] text-[#64748b]'
                }`}>
                  <input
                    type="radio"
                    name="stockStatus"
                    className="sr-only"
                    checked={formData.stockStatus === 'in_stock'}
                    onChange={() => setFormData({ ...formData, stockStatus: 'in_stock', isInStock: true, currentStock: formData.currentStock || 10 })}
                  />
                  <div className="text-xs">🟢 在库现货</div>
                  <div className="text-[10px] text-[#64748b] font-normal mt-0.5">有实物库存直接可用</div>
                </label>

                <label className={`p-2 rounded border text-center cursor-pointer transition-all ${
                  formData.stockStatus === 'pending_in'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 font-bold'
                    : 'bg-white border-[#cbd5e1] text-[#64748b]'
                }`}>
                  <input
                    type="radio"
                    name="stockStatus"
                    className="sr-only"
                    checked={formData.stockStatus === 'pending_in'}
                    onChange={() => setFormData({ ...formData, stockStatus: 'pending_in', isInStock: false, currentStock: 0 })}
                  />
                  <div className="text-xs">🟡 待入库 / 在途</div>
                  <div className="text-[10px] text-[#64748b] font-normal mt-0.5">采购已下发在途冷链</div>
                </label>

                <label className={`p-2 rounded border text-center cursor-pointer transition-all ${
                  formData.stockStatus === 'out_of_stock'
                    ? 'bg-red-50 border-red-500 text-red-800 font-bold'
                    : 'bg-white border-[#cbd5e1] text-[#64748b]'
                }`}>
                  <input
                    type="radio"
                    name="stockStatus"
                    className="sr-only"
                    checked={formData.stockStatus === 'out_of_stock'}
                    onChange={() => setFormData({ ...formData, stockStatus: 'out_of_stock', isInStock: false, currentStock: 0 })}
                  />
                  <div className="text-xs">🔴 未在库 / 仅建档</div>
                  <div className="text-[10px] text-[#64748b] font-normal mt-0.5">建立参数标准待采购</div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                  初始存量 {formData.stockStatus !== 'in_stock' && '(未在库默认为0)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  disabled={formData.stockStatus !== 'in_stock'}
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                  className="w-full bg-white disabled:bg-slate-100 border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">计量单位</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2 py-1.5 text-xs text-[#0f172a] focus:outline-none"
                >
                  <option value="kg">kg (千克)</option>
                  <option value="只">只 (个/头)</option>
                  <option value="瓶">瓶 (听/盒)</option>
                  <option value="个">个 (包材/签)</option>
                  <option value="箱">箱 (原件)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">包装规格</label>
                <input
                  type="text"
                  placeholder="例: 20kg/箱 (冷鲜真空包装)"
                  value={formData.spec}
                  onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: 采购单价、出肉率与保质期天数 */}
          <div className="bg-[#f0fdf4]/50 p-3 rounded-[3px] border border-[#bbf7d0] space-y-3">
            <div className="font-bold text-xs text-[#166534] flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>② 核心数字指标 (采购单价 · 标杆出肉率 · 保质期天数)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#166534] font-medium mb-1">
                  💰 采购单价 (元/{formData.unit || 'kg'}) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b]">¥</span>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                    className="w-full bg-white border border-[#86efac] rounded-[2px] pl-6 pr-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#166534] font-medium mb-1">
                  🥩 标杆出肉率 (0.50 - 1.00) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.4"
                    max="1.0"
                    required
                    value={formData.standardYieldRate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData({
                        ...formData,
                        standardYieldRate: val,
                        skewersPerKg: Number((val * 40).toFixed(1))
                      });
                    }}
                    className="w-full bg-white border border-[#86efac] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#16a34a] focus:outline-none"
                  />
                  <span className="font-mono text-xs font-bold text-[#166534] whitespace-nowrap">
                    {((formData.standardYieldRate || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#166534] font-medium mb-1">
                  ⏳ 保质期天数 (天) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.shelfLifeDays}
                  onChange={(e) => setFormData({ ...formData, shelfLifeDays: Number(e.target.value) })}
                  className="w-full bg-white border border-[#86efac] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#bbf7d0]/60">
              <div>
                <label className="block text-[11px] text-[#166534] font-medium mb-1">
                  🍢 标杆每公斤出串数 (串/kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.skewersPerKg}
                  onChange={(e) => setFormData({ ...formData, skewersPerKg: Number(e.target.value) })}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#166534] font-medium mb-1">
                  出肉属性与刀工备注
                </label>
                <input
                  type="text"
                  placeholder="例: 去筋膜修边后标准出肉率75%，单串25g"
                  value={formData.meatYieldDesc}
                  onChange={(e) => setFormData({ ...formData, meatYieldDesc: e.target.value })}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: 批次、仓储与安全预警 */}
          <div className="bg-[#f8fafc] p-3 rounded-[3px] border border-[#e2e8f0] space-y-3">
            <div className="font-bold text-xs text-[#0f172a] flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5 text-slate-700" />
              <span>③ 批次溯源、存放温区与警戒线</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">生产批次号</label>
                <input
                  type="text"
                  value={formData.batchNo}
                  onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">生产/入库日期</label>
                <input
                  type="date"
                  value={formData.productionDate}
                  onChange={(e) => setFormData({ ...formData, productionDate: e.target.value })}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">预估到期日期</label>
                <div className="bg-[#f1f5f9] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#475569]">
                  {computeExpiryDate(formData.productionDate, formData.shelfLifeDays) || '自动计算'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">预设存放温区与库位</label>
                <input
                  type="text"
                  value={formData.storageLocation}
                  onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">安全库存警戒线 ({formData.unit})</label>
                <input
                  type="number"
                  value={formData.safetyStock}
                  onChange={(e) => setFormData({ ...formData, safetyStock: Number(e.target.value) })}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-red-600 font-bold text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">建议补货量 ({formData.unit})</label>
                <input
                  type="number"
                  value={formData.reorderSuggestion}
                  onChange={(e) => setFormData({ ...formData, reorderSuggestion: Number(e.target.value) })}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#64748b] font-medium mb-1">直通供货商</label>
              <input
                type="text"
                placeholder="例: 中粮安达直供冷链"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Button */}
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
              className="px-4 py-1.5 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>确认建档并生成在库标准</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
