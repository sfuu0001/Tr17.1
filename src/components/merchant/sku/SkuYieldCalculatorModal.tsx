import React, { useState } from 'react';
import { Calculator, X, Scale, DollarSign, Sparkles, ArrowRight, Percent } from 'lucide-react';
import { SkuParamItem } from '../../../types';

interface SkuYieldCalculatorModalProps {
  skuList: SkuParamItem[];
  isOpen: boolean;
  onClose: () => void;
  onApplyToSku?: (skuId: string, updatedParams: Partial<SkuParamItem>) => void;
  showToast: (msg: string) => void;
}

export const SkuYieldCalculatorModal: React.FC<SkuYieldCalculatorModalProps> = ({
  skuList,
  isOpen,
  onClose,
  onApplyToSku,
  showToast
}) => {
  const [selectedSkuId, setSelectedSkuId] = useState<string>(skuList[0]?.id || '');
  const selectedSku = skuList.find((s) => s.id === selectedSkuId) || skuList[0];

  const [purchasePrice, setPurchasePrice] = useState<number>(selectedSku?.purchasePrice || 60);
  const [yieldRatePercent, setYieldRatePercent] = useState<number>(
    selectedSku ? selectedSku.standardYieldRate * 100 : 75
  );
  const [skewerGrams, setSkewerGrams] = useState<number>(25); // grams per skewer
  const [menuSellPrice, setMenuSellPrice] = useState<number>(12); // sell price per skewer

  const handleSelectSku = (id: string) => {
    setSelectedSkuId(id);
    const item = skuList.find((s) => s.id === id);
    if (item) {
      setPurchasePrice(item.purchasePrice);
      setYieldRatePercent(item.standardYieldRate * 100);
      if (item.skewersPerKg && item.skewersPerKg > 0) {
        setSkewerGrams(Math.round((item.standardYieldRate * 1000) / item.skewersPerKg));
      }
    }
  };

  if (!isOpen) return null;

  // Calculation math:
  // 1kg raw meat at purchasePrice -> effective clean meat = yieldRate (kg) = yieldRate * 1000 (g)
  // Real clean meat cost per kg = purchasePrice / (yieldRatePercent / 100)
  // Real clean meat cost per gram = realCleanCostPerKg / 1000
  // Single skewer raw cost = (skewerGrams / 1000) * realCleanCostPerKg = (skewerGrams * purchasePrice) / (yieldRatePercent * 10)
  const realCleanMeatCostPerKg = yieldRatePercent > 0 ? purchasePrice / (yieldRatePercent / 100) : 0;
  const singleSkewerCost = (skewerGrams / 1000) * realCleanMeatCostPerKg;
  const skewersPerKgRaw = (yieldRatePercent / 100) * (1000 / (skewerGrams || 1));
  const grossProfitMargin = menuSellPrice > 0 ? ((menuSellPrice - singleSkewerCost) / menuSellPrice) * 100 : 0;

  const handleApply = () => {
    if (!selectedSku || !onApplyToSku) return;
    onApplyToSku(selectedSku.id, {
      purchasePrice,
      standardYieldRate: yieldRatePercent / 100,
      skewersPerKg: Number(skewersPerKgRaw.toFixed(1)),
      meatYieldDesc: `实测出肉率${yieldRatePercent}%，单串${skewerGrams}g，理论每串原料成本¥${singleSkewerCost.toFixed(2)}`
    });
    showToast(`已将测算标准同步至 [${selectedSku.name}]`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-xl rounded-[3px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs text-[#0f172a]">
        <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[2px] bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">出肉率与理论单串成本智能测算工具</h3>
              <p className="text-[11px] text-slate-300">根据采购单价、实际出肉率与单串克重自动推导毛利模型</p>
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

        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Sku Selector */}
          <div>
            <label className="block text-[11px] text-[#64748b] font-medium mb-1">选择测算比对的 SKU 档案</label>
            <select
              value={selectedSkuId}
              onChange={(e) => handleSelectSku(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none"
            >
              {skuList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.sku}) · 单价¥{s.purchasePrice}/{s.unit} · 出肉{(s.standardYieldRate * 100).toFixed(0)}%
                </option>
              ))}
            </select>
          </div>

          {/* Sliders and Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#f8fafc] p-3.5 rounded-[3px] border border-[#e2e8f0]">
            <div>
              <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                采购单价 (元/kg)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b]">¥</span>
                <input
                  type="number"
                  step="0.5"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] pl-6 pr-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-[#166534] font-medium">实测出肉率 (%)</label>
                <span className="font-mono font-bold text-xs text-[#16a34a]">{yieldRatePercent}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                step="1"
                value={yieldRatePercent}
                onChange={(e) => setYieldRatePercent(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                单串成品肉净重 (克/串)
              </label>
              <input
                type="number"
                step="1"
                min="5"
                max="200"
                value={skewerGrams}
                onChange={(e) => setSkewerGrams(Number(e.target.value))}
                className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                前台菜单参考售价 (元/串)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b]">¥</span>
                <input
                  type="number"
                  step="0.5"
                  value={menuSellPrice}
                  onChange={(e) => setMenuSellPrice(Number(e.target.value))}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] pl-6 pr-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Results Summary Box */}
          <div className="bg-emerald-50/70 p-3.5 rounded-[3px] border border-emerald-200 space-y-2.5">
            <div className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>测算结果与毛利率模型</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-white p-2 rounded border border-emerald-100">
                <span className="text-[10px] text-[#64748b] block">净肉折算单价</span>
                <div className="font-mono font-bold text-xs text-[#0f172a] mt-0.5">
                  ¥{realCleanMeatCostPerKg.toFixed(2)}/kg
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-emerald-100">
                <span className="text-[10px] text-[#64748b] block">每公斤生料出串</span>
                <div className="font-mono font-bold text-xs text-blue-600 mt-0.5">
                  {skewersPerKgRaw.toFixed(1)} 串/kg
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-emerald-100">
                <span className="text-[10px] text-[#64748b] block">单串理论原料成本</span>
                <div className="font-mono font-bold text-xs text-red-600 mt-0.5">
                  ¥{singleSkewerCost.toFixed(2)}
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-emerald-100">
                <span className="text-[10px] text-[#64748b] block">预估原料毛利率</span>
                <div className={`font-mono font-bold text-xs mt-0.5 ${grossProfitMargin >= 65 ? 'text-[#16a34a]' : 'text-amber-600'}`}>
                  {grossProfitMargin.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="text-[11px] text-emerald-900 bg-white/70 p-2 rounded border border-emerald-200/60 leading-relaxed">
              💡 <strong>成本分析结论:</strong> 若采购 1kg 生料 (¥{purchasePrice})，按 {yieldRatePercent}% 出肉率剔除损耗后得到 {(yieldRatePercent * 10).toFixed(0)}g 净肉，按单串 {skewerGrams}g 可切出 <strong>{skewersPerKgRaw.toFixed(1)} 串</strong>。按售价 ¥{menuSellPrice}/串计算，单串毛利空间为 <strong>¥{(menuSellPrice - singleSkewerCost).toFixed(2)}</strong>。
            </div>
          </div>
        </div>

        <div className="bg-[#f8fafc] px-4 py-2.5 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
          >
            关闭
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            <span>应用测算指标到该 SKU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
