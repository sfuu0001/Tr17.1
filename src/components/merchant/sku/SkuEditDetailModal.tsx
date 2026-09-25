import React, { useState, useEffect } from 'react';
import { Tag, X, Save, History, Download, QrCode, Barcode, Calendar, DollarSign, Scale, Clock, Warehouse } from 'lucide-react';
import { SkuParamItem, SkuHistoryLog } from '../../../types';

interface SkuEditDetailModalProps {
  sku: SkuParamItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: SkuParamItem) => void;
  showToast: (msg: string) => void;
}

export const SkuEditDetailModal: React.FC<SkuEditDetailModalProps> = ({
  sku,
  isOpen,
  onClose,
  onSave,
  showToast
}) => {
  const [formData, setFormData] = useState<SkuParamItem | null>(null);

  useEffect(() => {
    if (sku) {
      setFormData({ ...sku });
    }
  }, [sku]);

  if (!isOpen || !sku || !formData) return null;

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

  const renderBarcodeSvg = (skuCode: string) => {
    const bars = [2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2];
    return (
      <div className="flex flex-col items-center p-2 bg-white rounded border border-[#e2e8f0]">
        <svg width="130" height="34" viewBox="0 0 130 34">
          {bars.map((w, idx) => {
            const x = idx * 7 + 4;
            return <rect key={idx} x={x} y="2" width={w} height="30" fill="#0f172a" />;
          })}
        </svg>
        <span className="font-mono text-[9px] font-bold text-[#0f172a] tracking-widest mt-0.5">
          {skuCode}
        </span>
      </div>
    );
  };

  const handleSave = () => {
    const nowStr = new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16);
    const changes: string[] = [];

    if (formData.purchasePrice !== sku.purchasePrice) {
      changes.push(`单价 ¥${sku.purchasePrice} → ¥${formData.purchasePrice}`);
    }
    if (formData.standardYieldRate !== sku.standardYieldRate) {
      changes.push(
        `出肉率 ${(sku.standardYieldRate * 100).toFixed(0)}% → ${(formData.standardYieldRate * 100).toFixed(0)}%`
      );
    }
    if (formData.shelfLifeDays !== sku.shelfLifeDays) {
      changes.push(`保质期 ${sku.shelfLifeDays}天 → ${formData.shelfLifeDays}天`);
    }
    if (formData.stockStatus !== sku.stockStatus) {
      const statusMap = { in_stock: '在库现货', pending_in: '待入库/在途', out_of_stock: '未在库/缺货' };
      changes.push(
        `在库状态 ${statusMap[sku.stockStatus || 'in_stock']} → ${statusMap[formData.stockStatus || 'in_stock']}`
      );
    }
    if (formData.currentStock !== sku.currentStock) {
      changes.push(`库存 ${sku.currentStock} → ${formData.currentStock}${formData.unit}`);
    }

    const changeSummary = changes.length > 0 ? changes.join(' | ') : '核心参数微调与校验';

    const newLogs: SkuHistoryLog[] = [
      {
        timestamp: nowStr,
        field: '数字参数维护与调优',
        before: `原配置: ¥${sku.purchasePrice}/单价, ${(sku.standardYieldRate * 100).toFixed(0)}%出肉, ${sku.shelfLifeDays}天保质期`,
        after: changeSummary,
        operator: '李店长 (EMP-8001)'
      },
      ...(sku.historyLogs || [])
    ];

    const isNowInStock = formData.stockStatus === 'in_stock';
    const updatedItem: SkuParamItem = {
      ...formData,
      isInStock: isNowInStock,
      expiryDate: computeExpiryDate(formData.productionDate, formData.shelfLifeDays),
      historyLogs: newLogs,
      stockValue: formData.currentStock * formData.purchasePrice
    };

    onSave(updatedItem);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-2xl rounded-[3px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs text-[#0f172a]">
        {/* Header */}
        <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-bold">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0f172a]">{formData.name}</h3>
              <p className="text-[11px] text-[#64748b]">
                {formData.sku} · {formData.category}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 1: Barcode & QR Label Section */}
          <div className="bg-[#f8fafc] p-3 rounded-[3px] border border-[#e2e8f0] space-y-2">
            <div className="font-bold text-xs text-[#0f172a] flex items-center justify-between">
              <span>① 条码与二维码标贴</span>
              <button
                type="button"
                onClick={() => {
                  const bars = [2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2];
                  const rects = bars
                    .map((w, idx) => `<rect x="${idx * 7 + 4}" y="2" width="${w}" height="30" fill="#0f172a" />`)
                    .join('');
                  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="34" viewBox="0 0 130 34"><rect width="130" height="34" fill="#ffffff"/>${rects}<text x="65" y="32" font-family="'Space Grotesk', sans-serif" font-size="9" font-weight="bold" fill="#0f172a" text-anchor="middle" letter-spacing="2">${formData.sku}</text></svg>`;
                  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `barcode_${formData.sku}.svg`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
                className="text-[11px] text-[#2563eb] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>下载SVG</span>
              </button>
            </div>

            <div className="flex items-center justify-around bg-white p-2.5 rounded border border-[#e2e8f0]">
              {renderBarcodeSvg(formData.sku)}
              <div className="flex flex-col items-center">
                <QrCode className="w-11 h-11 text-[#0f172a]" />
                <span className="font-mono text-[9px] text-[#64748b] mt-0.5">{formData.sku}</span>
              </div>
            </div>
          </div>

          {/* 2: Status & Digital Fields Form */}
          <div className="space-y-3">
            <div className="font-bold text-xs text-[#0f172a]">② 在库状态与核心数字参数设定</div>

            {/* Status selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, stockStatus: 'in_stock', isInStock: true })}
                className={`p-2 rounded border text-center cursor-pointer transition-all ${
                  formData.stockStatus === 'in_stock'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                    : 'bg-white border-[#cbd5e1] text-[#64748b]'
                }`}
              >
                🟢 在库现货
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, stockStatus: 'pending_in', isInStock: false })}
                className={`p-2 rounded border text-center cursor-pointer transition-all ${
                  formData.stockStatus === 'pending_in'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 font-bold'
                    : 'bg-white border-[#cbd5e1] text-[#64748b]'
                }`}
              >
                🟡 待入库 / 在途
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, stockStatus: 'out_of_stock', isInStock: false })}
                className={`p-2 rounded border text-center cursor-pointer transition-all ${
                  formData.stockStatus === 'out_of_stock'
                    ? 'bg-red-50 border-red-500 text-red-800 font-bold'
                    : 'bg-white border-[#cbd5e1] text-[#64748b]'
                }`}
              >
                🔴 未在库 / 缺货
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                  采购单价 (元/{formData.unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                  标准出肉率 (0.0 - 1.0)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.4"
                  max="1.0"
                  value={formData.standardYieldRate}
                  onChange={(e) => setFormData({ ...formData, standardYieldRate: Number(e.target.value) })}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#16a34a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">保质期 (天)</label>
                <input
                  type="number"
                  value={formData.shelfLifeDays}
                  onChange={(e) => setFormData({ ...formData, shelfLifeDays: Number(e.target.value) })}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">当前库存量 ({formData.unit})</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">安全库存警戒线 ({formData.unit})</label>
                <input
                  type="number"
                  value={formData.safetyStock}
                  onChange={(e) => setFormData({ ...formData, safetyStock: Number(e.target.value) })}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-red-600 font-bold text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">建议补货量 ({formData.unit})</label>
                <input
                  type="number"
                  value={formData.reorderSuggestion}
                  onChange={(e) => setFormData({ ...formData, reorderSuggestion: Number(e.target.value) })}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">生产批次编号</label>
                <input
                  type="text"
                  value={formData.batchNo || ''}
                  onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">预设存放库位与温区</label>
                <input
                  type="text"
                  value={formData.storageLocation}
                  onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3: Revision History Logs */}
          <div className="space-y-2 pt-1 border-t border-[#e2e8f0]">
            <div className="font-bold text-xs text-[#0f172a] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-blue-500" />
              <span>③ 参数修订与调参审计履历</span>
            </div>
            <div className="divide-y divide-[#e2e8f0] bg-[#f8fafc] rounded border border-[#e2e8f0] max-h-48 overflow-y-auto">
              {(formData.historyLogs || []).length > 0 ? (
                formData.historyLogs?.map((log, idx) => (
                  <div key={idx} className="p-2.5 text-xs flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-[#0f172a]">{log.field}: </span>
                      <span className="text-[#64748b] mr-1">{log.before}</span>
                      <span className="font-mono text-[#16a34a] font-bold">→ {log.after}</span>
                    </div>
                    <div className="text-[10px] text-[#64748b] whitespace-nowrap">
                      {log.operator} · {log.timestamp}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-2.5 text-center text-[#94a3b8] text-[11px]">暂无历史调参记录</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f8fafc] px-4 py-2.5 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3.5 py-1 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>保存参数变更</span>
          </button>
        </div>
      </div>
    </div>
  );
};
