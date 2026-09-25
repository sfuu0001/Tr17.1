import React, { useState } from 'react';
import {
  X,
  Scale,
  Calculator,
  ArrowRightLeft,
  Sparkles,
  Percent,
  DollarSign,
  Package,
  Layers,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';

interface WeightSkewerCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultKg?: number;
  defaultPricePerKg?: number;
  defaultMaterialName?: string;
  onApplyResult?: (result: {
    totalKg: number;
    skewerCount: number;
    avgGrams: number;
    costPerSkewer: number;
  }) => void;
}

export const WeightSkewerCalculatorModal: React.FC<WeightSkewerCalculatorModalProps> = ({
  isOpen,
  onClose,
  defaultKg = 5,
  defaultPricePerKg = 48,
  defaultMaterialName = '精选和牛肉块',
  onApplyResult
}) => {
  // 模式: 'weight_to_count' (已知总重和总串数算单串克重) | 'target_gram' (已知总重和单串克重算总串数)
  const [calcMode, setCalcMode] = useState<'weight_to_count' | 'target_gram'>('weight_to_count');

  // 输入参数
  const [totalKg, setTotalKg] = useState<number>(defaultKg);
  const [skewerCount, setSkewerCount] = useState<number>(200);
  const [targetGramPerSkewer, setTargetGramPerSkewer] = useState<number>(25);
  const [pricePerKg, setPricePerKg] = useState<number>(defaultPricePerKg);
  const [sellingPricePerSkewer, setSellingPricePerSkewer] = useState<number>(3.5);
  const [lossRatePercent, setLossRatePercent] = useState<number>(5); // 穿串修整损耗率 %
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // 计算逻辑
  const safeTotalKg = Math.max(0.001, Number(totalKg) || 0);
  const safeLossRate = Math.max(0, Math.min(90, Number(lossRatePercent) || 0));
  const effectiveKg = safeTotalKg * (1 - safeLossRate / 100); // 扣除损耗后的净肉重量 (kg)
  const effectiveGrams = effectiveKg * 1000; // 净克重 (g)

  let calculatedCount = 0;
  let calculatedGrams = 0;

  if (calcMode === 'weight_to_count') {
    calculatedCount = Math.max(1, Number(skewerCount) || 1);
    calculatedGrams = effectiveGrams / calculatedCount;
  } else {
    calculatedGrams = Math.max(1, Number(targetGramPerSkewer) || 1);
    calculatedCount = Math.floor(effectiveGrams / calculatedGrams);
  }

  // 成本与毛利测算
  const totalRawCost = safeTotalKg * (Number(pricePerKg) || 0);
  const costPerSkewer = calculatedCount > 0 ? totalRawCost / calculatedCount : 0;
  const safeSellingPrice = Number(sellingPricePerSkewer) || 0;
  const grossProfitPerSkewer = safeSellingPrice - costPerSkewer;
  const grossProfitMargin = safeSellingPrice > 0 ? (grossProfitPerSkewer / safeSellingPrice) * 100 : 0;

  const handleCopySummary = () => {
    const text = `【原料穿串重量与成本测算】
原料名称: ${defaultMaterialName}
原料总重: ${safeTotalKg.toFixed(2)} kg (损耗率: ${safeLossRate}%)
制成串数: ${calculatedCount} 串
平均净重: ${calculatedGrams.toFixed(1)} g/串
公斤单价: ¥${(Number(pricePerKg) || 0).toFixed(2)} /kg
单串成本: ¥${costPerSkewer.toFixed(2)} /串
建议售价: ¥${safeSellingPrice.toFixed(2)} /串
预期毛利率: ${grossProfitMargin.toFixed(1)}%`;

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApplyResult) {
      onApplyResult({
        totalKg: safeTotalKg,
        skewerCount: calculatedCount,
        avgGrams: Number(calculatedGrams.toFixed(1)),
        costPerSkewer: Number(costPerSkewer.toFixed(2))
      });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none border border-[#cbd5e1] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#e2e8f0] bg-[#0f172a] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-none bg-emerald-600/30 border border-emerald-500 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-wide">
                  原料重量与出串成本测算器
                </h2>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded-none">
                  精密除算模型
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                支持自定义公斤数除以数量，精准核算单串净肉克重、串成本及定价毛利率
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-none transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* 模式选择 */}
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
            <span className="font-bold text-neutral-700">测算运算模式</span>
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setCalcMode('weight_to_count')}
                className={`px-3 py-1 rounded-none border transition-colors cursor-pointer ${
                  calcMode === 'weight_to_count'
                    ? 'bg-black text-white border-black font-bold'
                    : 'bg-neutral-50 text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                已知公斤 ÷ 目标串数
              </button>
              <button
                type="button"
                onClick={() => setCalcMode('target_gram')}
                className={`px-3 py-1 rounded-none border transition-colors cursor-pointer ${
                  calcMode === 'target_gram'
                    ? 'bg-black text-white border-black font-bold'
                    : 'bg-neutral-50 text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                已知公斤 ÷ 单串标准克重
              </button>
            </div>
          </div>

          {/* 输入参数表单 */}
          <div className="bg-neutral-50 p-3.5 border border-neutral-200 rounded-none space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 总公斤数 */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-800 mb-1 flex items-center gap-1">
                  <span>自定义采购/投料公斤数 (kg) *</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={totalKg}
                    onChange={(e) => setTotalKg(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1.5 font-mono text-sm font-bold text-neutral-900 focus:outline-none focus:border-black"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">
                    kg
                  </span>
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  折合净重: {(safeTotalKg * 1000).toFixed(0)} 克 (g)
                </div>
              </div>

              {/* 模式参数：串数 或 单串克重 */}
              {calcMode === 'weight_to_count' ? (
                <div>
                  <label className="block text-[11px] font-bold text-neutral-800 mb-1">
                    计划制成总数量 (串数/份数) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={skewerCount}
                      onChange={(e) => setSkewerCount(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1.5 font-mono text-sm font-bold text-neutral-900 focus:outline-none focus:border-black"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">
                      串
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    运算公式: (总重量kg × 1000) ÷ 数量
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-neutral-800 mb-1">
                    单串目标克重 (g/串) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={targetGramPerSkewer}
                      onChange={(e) => setTargetGramPerSkewer(parseFloat(e.target.value) || 1)}
                      className="w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1.5 font-mono text-sm font-bold text-neutral-900 focus:outline-none focus:border-black"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">
                      g/串
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    运算公式: (总重量kg × 1000) ÷ 单串克重
                  </div>
                </div>
              )}
            </div>

            {/* 价格与损耗参数 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-neutral-200">
              <div>
                <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                  原料公斤单价 (元/kg)
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-xs">
                    ¥
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={pricePerKg}
                    onChange={(e) => setPricePerKg(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-neutral-300 rounded-none pl-6 pr-2 py-1 font-mono text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                  穿制切配损耗率 (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="80"
                    value={lossRatePercent}
                    onChange={(e) => setLossRatePercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-neutral-300 rounded-none px-2 py-1 font-mono text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                  建议出餐售价 (元/串)
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-xs">
                    ¥
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={sellingPricePerSkewer}
                    onChange={(e) => setSellingPricePerSkewer(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-neutral-300 rounded-none pl-6 pr-2 py-1 font-mono text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 测算核心结果展示看板 */}
          <div className="border border-neutral-300 bg-white p-4 rounded-none space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>精准测算结果面板</span>
              </span>
              <span className="text-[11px] font-mono text-neutral-500">
                参考原料: {defaultMaterialName}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-none text-center">
                <div className="text-[11px] text-neutral-500">制成总串数</div>
                <div className="text-xl font-mono font-bold text-black mt-1">
                  {calculatedCount} <span className="text-xs font-normal">串</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  {(calculatedCount / safeTotalKg).toFixed(1)} 串/kg
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-none text-center">
                <div className="text-[11px] text-emerald-800 font-medium">单串平均净肉</div>
                <div className="text-xl font-mono font-bold text-emerald-700 mt-1">
                  {calculatedGrams.toFixed(1)} <span className="text-xs font-normal">g/串</span>
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">扣除损耗后净肉</div>
              </div>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-none text-center">
                <div className="text-[11px] text-neutral-500">单串原料纯成本</div>
                <div className="text-xl font-mono font-bold text-neutral-900 mt-1">
                  ¥{costPerSkewer.toFixed(2)}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  总成本 ¥{totalRawCost.toFixed(1)}
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-none text-center">
                <div className="text-[11px] text-amber-800 font-medium">预计出餐毛利率</div>
                <div className="text-xl font-mono font-bold text-amber-700 mt-1">
                  {grossProfitMargin.toFixed(1)}%
                </div>
                <div className="text-[10px] text-amber-700/80 mt-0.5">
                  每串毛利 ¥{grossProfitPerSkewer.toFixed(2)}
                </div>
              </div>
            </div>

            {/* 测算文字小结与公式 */}
            <div className="p-2.5 bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-600 rounded-none font-mono flex items-center justify-between">
              <div>
                测算逻辑：{safeTotalKg}kg 原料 (扣除{safeLossRate}%损耗得{effectiveKg.toFixed(2)}kg) ÷ {calculatedCount}串 = <strong className="text-black">{calculatedGrams.toFixed(1)}g/串</strong>，单串成本 <strong className="text-black">¥{costPerSkewer.toFixed(2)}</strong>。
              </div>
              <button
                type="button"
                onClick={handleCopySummary}
                className="px-2 py-0.5 border border-neutral-300 hover:border-black text-neutral-700 hover:text-black rounded-none transition-colors cursor-pointer shrink-0 ml-2 flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? '已复制' : '复制结果'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-100 rounded-none text-xs font-semibold cursor-pointer"
          >
            关闭退出
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-none text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>应用此测算参数到加工记录</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
