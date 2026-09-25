import React from 'react';
import { Layers, Warehouse, Truck, AlertTriangle, Scale, DollarSign } from 'lucide-react';
import { SkuParamItem } from '../../../types';

interface SkuMetricsStripProps {
  skuList: SkuParamItem[];
}

export const SkuMetricsStrip: React.FC<SkuMetricsStripProps> = ({ skuList }) => {
  const totalSkuCount = skuList.length;
  const inStockList = skuList.filter(
    (s) => s.stockStatus === 'in_stock' || (s.currentStock > 0 && s.stockStatus !== 'out_of_stock' && s.stockStatus !== 'pending_in')
  );
  const pendingInList = skuList.filter((s) => s.stockStatus === 'pending_in');
  const outOfStockList = skuList.filter(
    (s) => s.stockStatus === 'out_of_stock' || (s.currentStock <= 0 && s.stockStatus !== 'pending_in')
  );

  const inStockCount = inStockList.length;
  const pendingInCount = pendingInList.length;
  const outOfStockCount = outOfStockList.length;

  const avgYield =
    (skuList.reduce((sum, s) => sum + (s.standardYieldRate || 0.8), 0) / (skuList.length || 1)) * 100;
  const totalStockAssetValue = inStockList.reduce(
    (sum, s) => sum + (s.currentStock * s.purchasePrice),
    0
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div className="bg-white p-2.5 rounded-[3px] border border-[#e6e6e4] shadow-2xs">
        <div className="text-[10.5px] text-[#787774] font-normal flex items-center justify-between">
          <span>维护档案总数</span>
          <Layers className="w-3.5 h-3.5 text-[#787774]" />
        </div>
        <div className="text-base font-mono font-semibold text-[#0f172a] mt-0.5">
          {totalSkuCount} <span className="text-xs font-normal text-[#787774]">个 SKU</span>
        </div>
        <div className="text-[10px] text-[#787774] mt-0.5 font-normal">覆盖 8 大标准原料品类</div>
      </div>

      <div className="bg-white p-2.5 rounded-[3px] border border-[#e6e6e4] shadow-2xs">
        <div className="text-[10.5px] text-[#787774] font-normal flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>在库现货品类</span>
          </span>
          <Warehouse className="w-3.5 h-3.5 text-[#787774]" />
        </div>
        <div className="text-base font-mono font-semibold text-emerald-700 mt-0.5">
          {inStockCount} <span className="text-xs font-normal text-[#787774]">种在库</span>
        </div>
        <div className="text-[10px] text-[#787774] mt-0.5 font-normal">
          理论在库资产: ¥{totalStockAssetValue.toFixed(1)}
        </div>
      </div>

      <div className="bg-white p-2.5 rounded-[3px] border border-[#e6e6e4] shadow-2xs">
        <div className="text-[10.5px] text-[#787774] font-normal flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>待入库 / 在途</span>
          </span>
          <Truck className="w-3.5 h-3.5 text-[#787774]" />
        </div>
        <div className="text-base font-mono font-semibold text-[#0f172a] mt-0.5">
          {pendingInCount} <span className="text-xs font-normal text-[#787774]">批次在途</span>
        </div>
        <div className="text-[10px] text-[#787774] mt-0.5 font-normal">冷链陆运配送中</div>
      </div>

      <div className={`p-2.5 rounded-[3px] border shadow-2xs ${
        outOfStockCount > 0 ? 'bg-white border-red-200' : 'bg-white border-[#e6e6e4]'
      }`}>
        <div className="text-[10.5px] text-[#787774] font-normal flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>未在库 / 缺货告急</span>
          </span>
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
        </div>
        <div className="text-base font-mono font-semibold text-red-600 mt-0.5">
          {outOfStockCount} <span className="text-xs font-normal text-[#787774]">种缺货</span>
        </div>
        <div className="text-[10px] text-[#787774] mt-0.5 font-normal">均值出肉率: {avgYield.toFixed(1)}%</div>
      </div>
    </div>
  );
};
