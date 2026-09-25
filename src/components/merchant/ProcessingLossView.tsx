import React, { useState } from 'react';
import {
  Scale,
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Filter,
  DollarSign,
  Layers,
  Search,
  X,
  RotateCcw,
  ChefHat,
  Info,
  Check,
  ChevronRight
} from 'lucide-react';
import { ProcessingLossRecord } from '../../types';
import { INITIAL_PROCESSING_RECORDS } from '../../data/mockEnhancedData';

interface ProcessingLossViewProps {
  showToast: (msg: string) => void;
}

export const ProcessingLossView: React.FC<ProcessingLossViewProps> = ({ showToast }) => {
  const [records, setRecords] = useState<ProcessingLossRecord[]>(INITIAL_PROCESSING_RECORDS);
  const [selectedStore, setSelectedStore] = useState<string>('01号静安餐车 (Truck-01)');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026年08月');

  // Filters
  const [filterMaterial, setFilterMaterial] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOperator, setFilterOperator] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Hover point on SVG trend chart
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // New Calculation Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addForm, setAddForm] = useState({
    materialName: '原切鲜羊后腿肉 (Lamb Leg)',
    category: '肉类原料',
    grossWeight: 10.0,
    netWeight: 7.4,
    unitPrice: 76.0,
    standardRate: 0.74,
    operator: '王厨师长',
    lossReason: '剔除多余白脂与筋膜',
    notes: '标准去骨修整',
    keepAdding: false
  });

  // Calculate KPIs
  const totalBatches = records.length;
  const totalGrossKg = records.reduce((sum, r) => sum + r.grossWeight, 0);
  const totalNetKg = records.reduce((sum, r) => sum + r.netWeight, 0);
  const avgYieldRate = totalGrossKg > 0 ? totalNetKg / totalGrossKg : 0.74;
  const totalLossCost = records.reduce((sum, r) => sum + r.lossAmount, 0);
  const abnormalCount = records.filter((r) => r.status === 'critical' || r.status === 'warning').length;

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchMat = filterMaterial === 'all' || r.materialName.includes(filterMaterial);
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchOp = filterOperator === 'all' || r.operator === filterOperator;
    const matchSearch =
      r.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.lossReason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.operator.toLowerCase().includes(searchQuery.toLowerCase());
    return matchMat && matchStatus && matchOp && matchSearch;
  });

  // Trend Chart Data (Mocking daily sequence)
  const trendData = [
    { day: '08-16', yieldPct: 73.5, benchmark: 74, grossKg: 20 },
    { day: '08-17', yieldPct: 74.2, benchmark: 74, grossKg: 18 },
    { day: '08-18', yieldPct: 71.0, benchmark: 74, grossKg: 15 },
    { day: '08-19', yieldPct: 75.0, benchmark: 74, grossKg: 22 },
    { day: '08-20', yieldPct: 69.5, benchmark: 74, grossKg: 14 },
    { day: '08-21', yieldPct: 74.0, benchmark: 74, grossKg: 25 },
    { day: '08-22', yieldPct: 72.8, benchmark: 74, grossKg: 30 }
  ];

  // SVG dimensions
  const svgWidth = 360;
  const svgHeight = 170;
  const padX = 35;
  const padY = 25;
  const plotWidth = svgWidth - padX * 2;
  const plotHeight = svgHeight - padY * 2;

  // Min and Max yield range (60% to 80%)
  const minYield = 60;
  const maxYield = 80;

  const getSvgY = (pct: number) => {
    return padY + plotHeight - ((pct - minYield) / (maxYield - minYield)) * plotHeight;
  };

  const getSvgX = (index: number) => {
    return padX + (index / (trendData.length - 1)) * plotWidth;
  };

  const polylinePoints = trendData
    .map((d, i) => `${getSvgX(i)},${getSvgY(d.yieldPct)}`)
    .join(' ');

  const benchmarkY = getSvgY(74);

  // Modal instant calculation
  const modalGross = Math.max(0.1, addForm.grossWeight);
  const modalNet = Math.max(0, addForm.netWeight);
  const modalYieldRate = modalNet / modalGross;
  const modalLossKg = Math.max(0, modalGross - modalNet);
  const modalLossAmount = modalLossKg * addForm.unitPrice;
  
  let modalStatus: 'normal' | 'warning' | 'critical' = 'normal';
  if (modalYieldRate < addForm.standardRate - 0.08) {
    modalStatus = 'critical';
  } else if (modalYieldRate < addForm.standardRate - 0.03) {
    modalStatus = 'warning';
  }

  const handleSaveAddRecord = () => {
    const newRec: ProcessingLossRecord = {
      id: `prc-${Date.now()}`,
      date: new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16),
      materialName: addForm.materialName,
      category: addForm.category,
      grossWeight: modalGross,
      netWeight: modalNet,
      yieldRate: Number(modalYieldRate.toFixed(2)),
      standardRate: addForm.standardRate,
      lossRate: Number((1 - modalYieldRate).toFixed(2)),
      operator: addForm.operator,
      lossKg: Number(modalLossKg.toFixed(2)),
      unitPrice: addForm.unitPrice,
      lossAmount: Number(modalLossAmount.toFixed(2)),
      lossReason: addForm.lossReason,
      notes: addForm.notes || '现场实测登记',
      status: modalStatus
    };

    setRecords((prev) => [newRec, ...prev]);
    showToast(`加工测算单已生成！出肉率 ${(modalYieldRate * 100).toFixed(1)}%`);

    if (addForm.keepAdding) {
      setAddForm((prev) => ({ ...prev, grossWeight: 10.0, netWeight: 7.4 }));
    } else {
      setIsAddModalOpen(false);
    }
  };

  return (
    <div id="processing-loss-view" className="space-y-3.5 text-xs text-[#0f172a]">
      {/* 1. Header */}
      <div className="bg-white p-3.5 sm:p-4 rounded-[4px] border border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold text-[#0f172a]">后厨加工与穿串出肉率核算</h1>
            <span className="px-2 py-0.5 rounded-[2px] bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] text-[11px] font-semibold">
              出肉率核算中心
            </span>
          </div>
          <p className="text-[11.5px] sm:text-[12px] text-[#64748b] mt-1 leading-relaxed">
            监控解冻·去骨·去脂与打刀修剪损耗 · 建立标准化出肉率标杆 · 落实责任厨师与损耗归因
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="flex-1 sm:flex-none bg-[#f8fafc] border border-[#cbd5e1] rounded-[3px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none"
          >
            <option value="01号静安餐车 (Truck-01)">01号静安餐车 (Truck-01)</option>
            <option value="02号黄浦餐车 (Truck-02)">02号黄浦餐车 (Truck-02)</option>
            <option value="中央厨房冷库 (HQ-01)">中央厨房冷库 (HQ-01)</option>
          </select>

          <button
            id="btn-add-processing-loss"
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-[3px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors active:scale-95 text-xs flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>新增加工测算</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Strip (4 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        <div className="bg-white p-2.5 sm:p-3 rounded-[3px] border border-[#e6e6e4] shadow-2xs">
          <div className="text-[10.5px] text-[#787774] font-normal">本月加工批次</div>
          <div className="text-lg sm:text-xl font-mono font-bold text-[#0f172a] mt-1">
            {totalBatches} <span className="text-xs font-normal text-[#787774]">批次</span>
          </div>
          <div className="text-[10px] text-[#787774] mt-0.5 font-normal">累计毛料 {totalGrossKg.toFixed(1)} kg</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-[3px] border border-[#e6e6e4] border-l-2 border-l-emerald-600 shadow-2xs">
          <div className="text-[10.5px] text-[#787774] font-normal">平均综合出肉率</div>
          <div className="text-lg sm:text-xl font-mono font-bold text-emerald-700 mt-1">
            {(avgYieldRate * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#787774] mt-0.5 font-normal">行业标杆基准: 74.0%</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-[3px] border border-[#e6e6e4] shadow-2xs">
          <div className="text-[10.5px] text-[#787774] font-normal">初加工损耗金额</div>
          <div className="text-lg sm:text-xl font-mono font-bold text-[#0f172a] mt-1">
            ¥{totalLossCost.toFixed(0)}
          </div>
          <div className="text-[10px] text-[#787774] mt-0.5 font-normal">骨脂皮膜剔除成本</div>
        </div>

        <div className={`p-2.5 sm:p-3 rounded-[3px] border border-[#e6e6e4] shadow-2xs ${
          abnormalCount > 0 ? 'border-l-2 border-l-red-500 bg-white' : 'bg-white'
        }`}>
          <div className="text-[10.5px] font-normal text-[#787774] flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
            <span>异常批次预警</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-red-600 mt-1">
            {abnormalCount} <span className="text-xs font-normal text-[#787774]">批次超标</span>
          </div>
          <div className="text-[10px] text-[#787774] mt-0.5 font-normal">出肉率偏离基准 &gt;5%</div>
        </div>
      </div>

      {/* 3. Main Split (Left 46% Trend Chart, Right 54% Records Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left: SVG Trend Chart */}
        <div className="lg:col-span-5 bg-white p-4 rounded-[3px] border border-[#e2e8f0] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-sm text-[#0f172a]">逐日出肉率走势与标杆对标</span>
            </div>
            <span className="text-[11px] text-[#64748b]">近 7 日批次加权</span>
          </div>

          {/* SVG Interactive Container */}
          <div className="relative bg-[#f8fafc] p-2 rounded-[3px] border border-[#e2e8f0] flex flex-col items-center">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto select-none"
            >
              {/* Grid Lines */}
              {[60, 65, 70, 75, 80].map((val) => {
                const y = getSvgY(val);
                return (
                  <g key={val}>
                    <line
                      x1={padX}
                      y1={y}
                      x2={svgWidth - padX}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="2,2"
                    />
                    <text
                      x={padX - 6}
                      y={y + 3}
                      fontSize="9"
                      fill="#94a3b8"
                      textAnchor="end"
                      fontFamily="'Space Grotesk', sans-serif"
                    >
                      {val}%
                    </text>
                  </g>
                );
              })}

              {/* Benchmark Line (74%) */}
              <line
                x1={padX}
                y1={benchmarkY}
                x2={svgWidth - padX}
                y2={benchmarkY}
                stroke="#16a34a"
                strokeWidth="1.5"
                strokeDasharray="4,3"
              />
              <text
                x={svgWidth - padX}
                y={benchmarkY - 4}
                fontSize="9"
                fill="#16a34a"
                fontWeight="bold"
                textAnchor="end"
              >
                标杆 74%
              </text>

              {/* Actual Yield Line */}
              <polyline
                fill="none"
                stroke="#0f172a"
                strokeWidth="2"
                points={polylinePoints}
              />

              {/* Data points */}
              {trendData.map((d, i) => {
                const cx = getSvgX(i);
                const cy = getSvgY(d.yieldPct);
                const isHovered = hoveredPointIndex === i;
                const isUnder = d.yieldPct < d.benchmark - 2;

                return (
                  <g
                    key={i}
                    onMouseEnter={() => setHoveredPointIndex(i)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 5 : 3.5}
                      fill={isUnder ? '#dc2626' : '#0f172a'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    {/* X-axis label */}
                    <text
                      x={cx}
                      y={svgHeight - 8}
                      fontSize="9"
                      fill="#64748b"
                      textAnchor="middle"
                    >
                      {d.day}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPointIndex !== null && (
              <div className="absolute top-4 right-4 bg-[#0f172a] text-white p-2 rounded-[2px] shadow-lg text-[11px] space-y-0.5 animate-in fade-in duration-100">
                <div className="font-bold text-amber-400">日期: {trendData[hoveredPointIndex].day}</div>
                <div>实际出肉率: <span className="font-mono font-bold text-emerald-400">{trendData[hoveredPointIndex].yieldPct}%</span></div>
                <div>加工毛重: <span className="font-mono">{trendData[hoveredPointIndex].grossKg} kg</span></div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#64748b] px-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-[#0f172a] rounded-full"></span>
                <span>实测出肉率</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-[#16a34a] border border-dashed border-[#16a34a]"></span>
                <span>标准出肉率 (74%)</span>
              </div>
            </div>
            <span className="text-red-600">红点表示超标损耗</span>
          </div>

          <div className="bg-[#eff6ff] p-2.5 rounded-[3px] border border-[#bfdbfe] text-[11px] text-[#1e40af] leading-relaxed">
            <strong>智能归因洞察：</strong>08-20 与 08-18 出肉率偏低主要系精选牛腩批次筋膜较厚且刀工修整过量导致，已指派王厨师长进行刀工规范复训。
          </div>
        </div>

        {/* Right: Records Table & Filters (54%) */}
        <div className="lg:col-span-7 bg-white rounded-[3px] border border-[#e6e6e4] shadow-2xs overflow-hidden space-y-3 p-3.5 sm:p-4">
          {/* Filters row */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-[#e6e6e4]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] px-2 py-1 text-xs text-[#37352f] focus:outline-none font-normal"
              >
                <option value="all">全部状态</option>
                <option value="normal">符合标杆 (绿)</option>
                <option value="warning">偏低需关注 (黄)</option>
                <option value="critical">超标预警 (红)</option>
              </select>

              <select
                value={filterOperator}
                onChange={(e) => setFilterOperator(e.target.value)}
                className="bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] px-2 py-1 text-xs text-[#37352f] focus:outline-none font-normal"
              >
                <option value="all">全部责任厨师</option>
                <option value="王厨师长">王厨师长</option>
                <option value="张配菜">张配菜</option>
                <option value="刘烤师">刘烤师</option>
              </select>
            </div>

            <div className="relative min-w-[150px]">
              <Search className="w-3.5 h-3.5 text-[#787774] absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索原料/原因/厨师..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] pl-6 pr-2 py-1 text-xs text-[#37352f] placeholder-[#9b9a97] focus:outline-none font-normal"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fbfbfa] text-[#787774] border-b border-[#e6e6e4]">
                <tr>
                  <th className="p-2 font-normal">日期时间</th>
                  <th className="p-2 font-normal">加工原料品名</th>
                  <th className="p-2 font-normal text-right">毛重 / 净重</th>
                  <th className="p-2 font-normal text-right">实际出肉率</th>
                  <th className="p-2 font-normal text-right">损耗金额</th>
                  <th className="p-2 font-normal text-center">评估</th>
                  <th className="p-2 font-normal">责任人与归因</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f1ef]">
                {filteredRecords.map((rec) => {
                  return (
                    <tr key={rec.id} className="hover:bg-[#fbfbfa] transition-colors">
                      <td className="p-2 text-[#787774] text-[11px] font-normal whitespace-nowrap">{rec.date}</td>
                      <td className="p-2 font-medium text-[#0f172a]">
                        <div>{rec.materialName}</div>
                        <div className="text-[10px] text-[#787774] font-normal">{rec.category}</div>
                      </td>
                      <td className="p-2 text-right font-mono text-[#37352f] text-xs font-normal">
                        <div>{rec.grossWeight}kg / <span className="font-medium text-[#0f172a]">{rec.netWeight}kg</span></div>
                        <div className="text-[10px] text-[#787774] font-normal">损耗 {rec.lossKg}kg</div>
                      </td>
                      <td className="p-2 text-right font-mono font-semibold">
                        <span className={
                          rec.status === 'critical' ? 'text-red-600' : (rec.status === 'warning' ? 'text-amber-600' : 'text-emerald-700')
                        }>
                          {(rec.yieldRate * 100).toFixed(0)}%
                        </span>
                        <div className="text-[10px] text-[#787774] font-normal">标杆 {(rec.standardRate * 100).toFixed(0)}%</div>
                      </td>
                      <td className="p-2 text-right font-mono text-xs font-normal text-red-600">
                        ¥{rec.lossAmount.toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        {rec.status === 'normal' && (
                          <span className="px-1.5 py-0.5 bg-[#f0fdf4] text-emerald-800 border border-[#bbf7d0] rounded-[2px] text-[10px] font-normal">
                            符合标杆
                          </span>
                        )}
                        {rec.status === 'warning' && (
                          <span className="px-1.5 py-0.5 bg-[#fffbeb] text-amber-800 border border-[#fde68a] rounded-[2px] text-[10px] font-normal">
                            偏低
                          </span>
                        )}
                        {rec.status === 'critical' && (
                          <span className="px-1.5 py-0.5 bg-[#fef2f2] text-red-800 border border-[#fecaca] rounded-[2px] text-[10px] font-normal">
                            超标预警
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-[#5a5853] text-[11px] font-normal">
                        <div className="font-medium text-[#37352f]">{rec.operator}</div>
                        <div className="text-[10px] text-[#787774] truncate max-w-[120px]">{rec.lossReason}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[#fbfbfa] text-[#0f172a] border-t border-[#e6e6e4]">
                <tr>
                  <td colSpan={2} className="p-2 font-normal text-[#787774]">合计：{filteredRecords.length} 批次</td>
                  <td className="p-2 text-right font-mono font-normal text-[#37352f]">
                    {filteredRecords.reduce((s, r) => s + r.grossWeight, 0).toFixed(1)}kg / {filteredRecords.reduce((s, r) => s + r.netWeight, 0).toFixed(1)}kg
                  </td>
                  <td className="p-2 text-right font-mono font-semibold text-emerald-700">
                    {(avgYieldRate * 100).toFixed(1)}%
                  </td>
                  <td className="p-2 text-right font-mono font-normal text-red-600">
                    ¥{filteredRecords.reduce((s, r) => s + r.lossAmount, 0).toFixed(2)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* 4. MODAL: 新增加工测算弹窗 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-lg rounded-[3px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-bold">
                  <Scale className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h3 className="font-bold text-sm text-[#0f172a]">新增加工出肉率测算</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">选择加工原料品名</label>
                <select
                  value={addForm.materialName}
                  onChange={(e) => {
                    const name = e.target.value;
                    let price = 76.0;
                    let standard = 0.74;
                    let cat = '肉类原料';
                    if (name.includes('牛眼肉')) { price = 110.0; standard = 0.76; }
                    if (name.includes('牛腩')) { price = 80.0; standard = 0.68; }
                    if (name.includes('生蚝')) { price = 28.0; standard = 0.94; cat = '海鲜水产'; }
                    setAddForm({ ...addForm, materialName: name, unitPrice: price, standardRate: standard, category: cat });
                  }}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none"
                >
                  <option value="原切鲜羊后腿肉 (Lamb Leg)">原切鲜羊后腿肉 (标杆 74%, ¥76/kg)</option>
                  <option value="原切牛眼肉块 (Ribeye)">原切牛眼肉块 (标杆 76%, ¥110/kg)</option>
                  <option value="精选牛腩肉 (Brisket)">精选牛腩肉 (标杆 68%, ¥80/kg)</option>
                  <option value="乳山鲜活大生蚝 (Oysters)">乳山鲜活大生蚝 (标杆 94%, ¥28/kg)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">采购原料毛重 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={addForm.grossWeight}
                    onChange={(e) => setAddForm({ ...addForm, grossWeight: Number(e.target.value) })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">加工后净肉重 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={addForm.netWeight}
                    onChange={(e) => setAddForm({ ...addForm, netWeight: Number(e.target.value) })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none"
                  />
                </div>
              </div>

              {/* Instant Calculation Output */}
              <div className="bg-[#f8fafc] p-3 rounded-[3px] border border-[#e2e8f0] grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-[#64748b]">实测出肉率</span>
                  <div className={`font-mono font-bold text-sm mt-0.5 ${
                    modalStatus === 'critical' ? 'text-red-600' : (modalStatus === 'warning' ? 'text-amber-600' : 'text-[#16a34a]')
                  }`}>
                    {(modalYieldRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748b]">损耗重量</span>
                  <div className="font-mono font-bold text-[#0f172a] text-sm mt-0.5">
                    {modalLossKg.toFixed(2)} kg
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748b]">损耗金额</span>
                  <div className="font-mono font-bold text-red-600 text-sm mt-0.5">
                    ¥{modalLossAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">责任厨师 / 加工人</label>
                  <select
                    value={addForm.operator}
                    onChange={(e) => setAddForm({ ...addForm, operator: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none"
                  >
                    <option value="王厨师长">王厨师长 (主厨)</option>
                    <option value="张配菜">张配菜 (切配)</option>
                    <option value="刘烤师">刘烤师 (烤台)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">损耗归因枚举</label>
                  <select
                    value={addForm.lossReason}
                    onChange={(e) => setAddForm({ ...addForm, lossReason: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none"
                  >
                    <option value="剔除多余白脂与筋膜">剔除多余白脂与筋膜</option>
                    <option value="去骨修除骨头偏大">去骨修除骨头偏大</option>
                    <option value="打刀修剪与边角损耗">打刀修剪与边角损耗</option>
                    <option value="解冻失水与血水析出">解冻失水与血水析出</option>
                    <option value="挑出死蚝外壳泥沙">挑出死蚝外壳泥沙</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">备注说明</label>
                <input
                  type="text"
                  placeholder="批次修整备注..."
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="keepAddingCheck"
                  checked={addForm.keepAdding}
                  onChange={(e) => setAddForm({ ...addForm, keepAdding: e.target.checked })}
                  className="rounded text-[#0f172a] focus:ring-0"
                />
                <label htmlFor="keepAddingCheck" className="text-[11px] text-[#64748b] cursor-pointer">
                  保存后连录下一批加工原料
                </label>
              </div>
            </div>

            <div className="bg-[#f8fafc] px-4 py-2.5 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveAddRecord}
                className="px-3.5 py-1 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>保存测算单</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
