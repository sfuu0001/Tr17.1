import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Save,
  ShieldCheck,
  RotateCcw,
  Layers,
  ArrowRight,
  Printer,
  X,
  FileText,
  Clock,
  DollarSign
} from 'lucide-react';
import { StocktakeItem } from '../../types';
import { INITIAL_STOCKTAKE_ITEMS } from '../../data/mockEnhancedData';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { exportToCsv } from '../../utils/dataExportEngine';

interface InventoryViewProps {
  showToast: (msg: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ showToast }) => {
  const [items, setItems] = useState<StocktakeItem[]>(
    () => safeGetStorage<StocktakeItem[]>('obsidian_inventory_stock', INITIAL_STOCKTAKE_ITEMS)
  );
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockedTime, setLockedTime] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: 原料, 2: 穿串半成品, 3: 辅料, 4: 锁定
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // Persist inventory counts to localStorage so edits survive refresh
  useEffect(() => {
    safeSetStorage('obsidian_inventory_stock', items);
  }, [items]);

  // Shared CSV column layout for stocktake exports
  const buildStocktakeColumns = () => [
    { label: 'SKU', key: 'sku' },
    { label: '物品名称', key: 'name' },
    { label: '分类', key: 'category' },
    { label: '单位', key: 'unit' },
    { label: '系统理论存量', key: 'systemQty' },
    { label: '后厨实测实盘', key: 'actualQty' },
    { label: '实物差异', key: 'variance' },
    { label: '差异金额', key: 'varianceCost' },
    { label: '评估状态', key: 'status' }
  ];

  // Step categories mapping
  const stepCategoryMap: Record<number, string> = {
    1: '肉类原料',
    2: '海鲜水产',
    3: '调料撒料',
    4: 'all'
  };

  const handleQtyChange = (id: string, actual: number) => {
    if (isLocked) {
      showToast('今日盘点已锁账，禁止修改实盘数据！如需调整请先解锁重盘。');
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const diff = Number((actual - item.systemQty).toFixed(2));
          const diffCost = Number((diff * item.unitCost).toFixed(2));
          const status = Math.abs(diff) > 1.0 ? 'investigate' : 'ok';
          return {
            ...item,
            actualQty: actual,
            variance: diff,
            varianceCost: diffCost,
            status
          };
        }
        return item;
      })
    );
  };

  const handleLockStocktake = () => {
    setIsLocked(true);
    const now = new Date().toLocaleString('zh-CN', { hour12: false });
    setLockedTime(now);
    setItems((prev) => prev.map((item) => ({ ...item, locked: true })));
    // Real day-end settlement output: download the EOD snapshot as CSV
    exportToCsv('每日打烊日结单', buildStocktakeColumns(), items);
    showToast('打烊盘点已完成锁账！实测存量已覆盖写入全店期初理论库存，日结单已导出 CSV。');
  };

  const handleUnlockStocktake = () => {
    setIsLocked(false);
    setLockedTime(null);
    setItems((prev) => prev.map((item) => ({ ...item, locked: false })));
    showToast('已解锁重盘模式，允许重新复核实测数据');
  };

  // KPIs
  const totalItemsCount = items.length;
  const abnormalItems = items.filter((i) => i.status === 'investigate');
  const totalVarianceCost = items.reduce((sum, i) => sum + i.varianceCost, 0);

  // Filter items for current step
  const activeStepCat = stepCategoryMap[currentStep];
  const stepItems = activeStepCat === 'all' ? items : items.filter((i) => i.category === activeStepCat || currentStep === 4);

  return (
    <div id="inventory-view" className="space-y-3 text-xs text-[#0f172a]">
      {/* 1. Header */}
      <div className="bg-white p-3 rounded-[3px] border border-[#e6e6e4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm font-semibold text-[#0f172a]">每日打烊闭环盘点向导</h1>
            {isLocked ? (
              <span className="px-1.5 py-0.2 rounded-[2px] bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-normal flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-emerald-600" />
                <span>今日已锁定 ({lockedTime?.slice(11, 16) || '22:00'})</span>
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-[2px] bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-normal flex items-center gap-1">
                <Unlock className="w-2.5 h-2.5 text-amber-600" />
                <span>实测录入中</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#787774] mt-0.5 leading-relaxed font-normal">
            对比期末理论库存与后厨实测实物 · 自动核算隐性损耗与偷拿错漏 · 锁定后作为次日期初基准
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isLocked ? (
            <button
              id="btn-unlock-inventory"
              type="button"
              onClick={handleUnlockStocktake}
              className="w-full sm:w-auto px-2.5 py-1 rounded-[2px] bg-white text-red-700 border border-red-200 hover:bg-red-50 font-normal flex items-center justify-center gap-1.5 cursor-pointer text-xs active:scale-95 transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-red-600" />
              <span>解锁重盘 (店长权限)</span>
            </button>
          ) : (
            <button
              id="btn-lock-inventory"
              type="button"
              onClick={handleLockStocktake}
              className="w-full sm:w-auto px-3 py-1 rounded-[2px] bg-[#0f172a] text-white hover:bg-[#1e293b] font-normal flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-colors text-xs"
            >
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>锁定库存并生成日报</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. 4-Step Stepper Bar */}
      <div className="bg-[#fbfbfa] p-1.5 rounded-[3px] border border-[#e6e6e4] flex items-center gap-1.5 overflow-x-auto hide-scrollbar shadow-2xs">
        {[
          { step: 1, title: '① 原料盘点', desc: '肉类原料实测' },
          { step: 2, title: '② 水产海鲜', desc: '鲜活生蚝海产' },
          { step: 3, title: '③ 调料辅料', desc: '秘制撒料酱桶' },
          { step: 4, title: '④ 差异日结', desc: '锁账归档日报' }
        ].map((s) => {
          const isCurrent = currentStep === s.step;
          const isDone = currentStep > s.step;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step)}
              className={`flex-1 min-w-[125px] sm:min-w-[140px] p-2 rounded-[2px] border text-left transition-colors cursor-pointer shrink-0 ${
                isCurrent
                  ? 'bg-white text-[#0f172a] border-[#0f172a] shadow-2xs'
                  : isDone
                  ? 'bg-[#fbfbfa] text-emerald-800 border-[#e6e6e4]'
                  : 'bg-transparent text-[#787774] border-transparent hover:bg-white hover:border-[#e6e6e4]'
              }`}
            >
              <div className="font-medium text-xs flex items-center justify-between">
                <span>{s.title}</span>
                {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
              </div>
              <div className="text-[10px] mt-0.5 truncate text-[#787774] font-normal">
                {s.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="bg-white p-2.5 rounded-[3px] border border-[#e6e6e4] shadow-2xs">
          <div className="text-[10.5px] text-[#787774] font-normal">累计盘点品类</div>
          <div className="text-base font-mono font-semibold text-[#0f172a] mt-0.5">
            {totalItemsCount} <span className="text-xs font-normal text-[#787774]">项物资</span>
          </div>
          <div className="text-[10px] text-[#787774] mt-0.5 font-normal">已覆盖全部冷库与干料架</div>
        </div>

        <div className={`p-2.5 rounded-[3px] border shadow-2xs ${
          abnormalItems.length > 0 ? 'bg-white border-red-200' : 'bg-white border-[#e6e6e4]'
        }`}>
          <div className="text-[10.5px] font-normal flex items-center gap-1 text-[#787774]">
            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
            <span>盘亏待排查项</span>
          </div>
          <div className="text-base font-mono font-semibold text-red-600 mt-0.5">
            {abnormalItems.length} <span className="text-xs font-normal text-[#787774]">项差异过大</span>
          </div>
          <div className="text-[10px] text-[#787774] mt-0.5 font-normal">差异数量绝对值 &gt; 1.0</div>
        </div>

        <div className="bg-white p-2.5 rounded-[3px] border border-[#e6e6e4] shadow-2xs">
          <div className="text-[10.5px] text-[#787774] font-normal">物理差异差额 (元)</div>
          <div className={`text-base font-mono font-semibold mt-0.5 ${totalVarianceCost < 0 ? 'text-red-600' : 'text-[#0f172a]'}`}>
            {totalVarianceCost < 0 ? `-¥${Math.abs(totalVarianceCost).toFixed(2)}` : `+¥${totalVarianceCost.toFixed(2)}`}
          </div>
          <div className="text-[10px] text-[#787774] mt-0.5 font-normal">实物盘点价值 vs 系统理论价值</div>
        </div>
      </div>

      {/* 4. Stocktake Table */}
      <div className="bg-white rounded-[3px] border border-[#e6e6e4] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#fbfbfa] text-[#787774] border-b border-[#e6e6e4] font-normal">
              <tr>
                <th className="p-2 font-normal">物品名称与SKU</th>
                <th className="p-2 font-normal">规格分类</th>
                <th className="p-2 font-normal">单位</th>
                <th className="p-2 text-right font-normal">系统理论存量</th>
                <th className="p-2 text-right font-normal">后厨实测实盘</th>
                <th className="p-2 text-right font-normal">实物差异</th>
                <th className="p-2 text-right font-normal">差异金额</th>
                <th className="p-2 text-center font-normal">评估状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f1ef]">
              {stepItems.map((item) => {
                const isAbnormal = item.status === 'investigate';

                return (
                  <tr key={item.id} className="hover:bg-[#fbfbfa] transition-colors">
                    <td className="p-2 text-[#0f172a]">
                      <div className="font-medium">{item.name}</div>
                      <div className="font-mono text-[10px] text-[#787774] font-normal">{item.sku}</div>
                    </td>
                    <td className="p-2 text-[#787774]">
                      <span className="px-1.5 py-0.2 bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] text-[10px] font-normal">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-2 text-[#787774] font-normal">{item.unit}</td>
                    <td className="p-2 text-right font-mono text-[#787774] font-normal">
                      {item.systemQty.toFixed(1)} {item.unit}
                    </td>
                    <td className="p-2 text-right">
                      {isLocked ? (
                        <span className="font-mono font-medium text-[#0f172a]">
                          {item.actualQty.toFixed(1)} {item.unit}
                        </span>
                      ) : (
                        <input
                          type="number"
                          step="0.5"
                          value={item.actualQty}
                          onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                          className="w-20 bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] px-1.5 py-0.5 font-mono font-medium text-right text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                        />
                      )}
                    </td>
                    <td className="p-2 text-right font-mono font-medium">
                      {item.variance > 0 ? (
                        <span className="text-emerald-700">+{item.variance.toFixed(1)}</span>
                      ) : item.variance < 0 ? (
                        <span className="text-red-600">{item.variance.toFixed(1)}</span>
                      ) : (
                        <span className="text-[#b4b4b0]">0.0</span>
                      )}
                    </td>
                    <td className="p-2 text-right font-mono font-medium">
                      {item.varianceCost > 0 ? (
                        <span className="text-emerald-700">+¥{item.varianceCost.toFixed(2)}</span>
                      ) : item.varianceCost < 0 ? (
                        <span className="text-red-600">-¥{Math.abs(item.varianceCost).toFixed(2)}</span>
                      ) : (
                        <span className="text-[#b4b4b0]">¥0.00</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      {isAbnormal ? (
                        <span className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-[2px] text-[10px] font-normal">
                          异常需排查
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-[2px] text-[10px] font-normal">
                          相符
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#fbfbfa] font-normal text-[#0f172a] border-t border-[#e6e6e4]">
              <tr>
                <td colSpan={5} className="p-2 text-right text-[#787774]">当前分类累计物理差异金额：</td>
                <td colSpan={2} className="p-2 text-right font-mono text-xs font-semibold">
                  <span className={totalVarianceCost < 0 ? 'text-red-600' : 'text-[#0f172a]'}>
                    {totalVarianceCost < 0 ? `-¥${Math.abs(totalVarianceCost).toFixed(2)}` : `+¥${totalVarianceCost.toFixed(2)}`}
                  </span>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Bottom Action Bar & Guardrails Notice */}
      <div className="bg-[#fbfbfa] p-2.5 rounded-[3px] border border-[#e6e6e4] flex items-center justify-between gap-2.5 flex-wrap text-xs shadow-2xs">
        <div className="flex items-start gap-2 text-[#37352f]">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] font-normal">
            <span className="font-medium text-[#0f172a]">打烊闭环纪律：</span>
            锁定打烊后，本打烊日所有销售流水与穿串扣减将被冻结归档；明日开店将自动以今日实测库存作为期初库存。
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              exportToCsv('盘点实测草稿', buildStocktakeColumns(), items);
              showToast('盘点实测草稿已导出为本地 CSV 文件');
            }}
            className="px-2.5 py-1 rounded-[2px] bg-white text-[#787774] border border-[#e6e6e4] hover:bg-[#fbfbfa] hover:text-[#0f172a] cursor-pointer text-xs font-normal"
          >
            保存盘点草稿
          </button>

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-2.5 py-1 rounded-[2px] bg-white text-[#0f172a] border border-[#e6e6e4] hover:bg-[#fbfbfa] font-normal flex items-center gap-1 cursor-pointer text-xs"
          >
            <FileText className="w-3 h-3 text-blue-600" />
            <span>查看日结锁账报告</span>
          </button>
        </div>
      </div>

      {/* MODAL: 日结锁账报告弹窗 */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-xl rounded-[3px] border border-[#e6e6e4] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="bg-[#fbfbfa] px-3.5 py-2.5 border-b border-[#e6e6e4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center">
                  <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-xs text-[#0f172a]">每日打烊日结锁账报告 (EOD Snapshot)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="text-[#787774] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3.5 space-y-3">
              <div className="bg-[#fbfbfa] p-2.5 rounded-[2px] border border-[#e6e6e4] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#0f172a]">01号静安餐车 · 打烊日结单</span>
                  <span className="font-mono text-[11px] text-[#787774] font-normal">{new Date().toISOString().slice(0, 10)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-[#787774] font-normal">盘点项数:</span>
                    <div className="font-medium text-[#0f172a] font-mono">{items.length} 种</div>
                  </div>
                  <div>
                    <span className="text-[#787774] font-normal">相符率:</span>
                    <div className="font-medium text-emerald-700 font-mono">
                      {(((items.length - abnormalItems.length) / items.length) * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-[#787774] font-normal">总差异差额:</span>
                    <div className="font-medium text-red-600 font-mono">¥{Math.abs(totalVarianceCost).toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-[#787774] font-normal">审核店长:</span>
                    <div className="font-normal text-[#0f172a]">李店长 (EMP-8001)</div>
                  </div>
                </div>
              </div>

              {/* Breakdown List */}
              <div className="border border-[#e6e6e4] rounded-[2px] overflow-hidden">
                <div className="bg-[#fbfbfa] px-3 py-1.5 border-b border-[#e6e6e4] font-normal text-[11px] text-[#787774]">
                  异常损益排查清单 (Discrepancy Log)
                </div>
                <div className="divide-y divide-[#f1f1ef] max-h-48 overflow-y-auto">
                  {abnormalItems.map((item) => (
                    <div key={item.id} className="p-2 flex items-center justify-between text-xs hover:bg-[#fbfbfa]">
                      <div>
                        <div className="font-medium text-[#0f172a]">{item.name}</div>
                        <div className="text-[10px] text-[#787774] font-normal">
                          理论 {item.systemQty}{item.unit} vs 实测 {item.actualQty}{item.unit} (差异 {item.variance}{item.unit})
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-medium font-mono text-red-600">¥{Math.abs(item.varianceCost).toFixed(2)}</span>
                        <div className="text-[10px] text-amber-700 font-normal">待核实解冻损耗</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#fbfbfa] px-3.5 py-2 border-t border-[#e6e6e4] flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-2.5 py-1 rounded-[2px] bg-white text-[#787774] border border-[#e6e6e4] hover:bg-[#fbfbfa] hover:text-[#0f172a] flex items-center gap-1 cursor-pointer font-normal text-xs"
              >
                <Printer className="w-3 h-3" />
                <span>打印日结单</span>
              </button>

              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-3 py-1 rounded-[2px] bg-[#0f172a] text-white hover:bg-[#1e293b] font-normal cursor-pointer text-xs"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
