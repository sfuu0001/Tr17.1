import React, { useState } from 'react';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  Scale,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  globalFranchiseBomEngine,
  INITIAL_DISH_BOM_RECIPES
} from '../../../utils/franchiseBomLeakageEngine';
import {
  DishBomRecipe,
  AntiLeakageAudit,
  FranchiseTenantContext
} from '../../../types/franchise';

interface FranchiseBomTabProps {
  context: FranchiseTenantContext;
  showToast: (msg: string) => void;
}

export const FranchiseBomTab: React.FC<FranchiseBomTabProps> = ({ context, showToast }) => {
  const [recipes] = useState<DishBomRecipe[]>(() => globalFranchiseBomEngine.getRecipes());
  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState<string>(
    context.isHqUser ? 'FRAN-SH-002' : context.currentFranchiseeId
  );
  const [expandedDishId, setExpandedDishId] = useState<string | null>('dish-01');

  // Compute Anti-Leakage Audits for the active franchisee & truck
  const audits: AntiLeakageAudit[] = React.useMemo(() => {
    const truckId = selectedFranchiseeId === 'FRAN-SH-001' ? 'truck-01' : 'truck-03';
    return globalFranchiseBomEngine.runAntiLeakageAudit(selectedFranchiseeId, truckId);
  }, [selectedFranchiseeId]);

  const highRiskCount = audits.filter(a => a.riskLevel === 'high_risk_private_sourcing').length;
  const unrecordedCount = audits.filter(a => a.riskLevel === 'unrecorded_sales').length;
  const totalLeakageAmount = audits.reduce((sum, a) => sum + a.estimatedLossOrLeakage, 0);

  return (
    <div className="space-y-6">
      {/* 1. Header Overview & Risk Alert Banner */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300 p-4 rounded-none flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-500 text-slate-950 rounded-none shrink-0 shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-base text-slate-900">
                中央冷链原料 BOM 强核销与防飞单/私采溯源矩阵
              </h4>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-amber-200 text-amber-950 font-bold border border-amber-400">
                BOM 耗用 vs. 采购进料强对账
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed">
              核心爆品与中央供应链统配原料（A5和牛肉饼、黑松露粉料、布里欧胚）实行单份耗用绑定。系统智能比对
              POS 线上线下实销出单量与总部进货台账，自动侦测<strong>「非标原料私采」</strong>与<strong>「线下私收飞单」</strong>。
            </p>
          </div>
        </div>

        {/* Tenant Filter (HQ can switch franchisee) */}
        {context.isHqUser && (
          <div className="flex items-center gap-2 shrink-0 bg-white/80 p-2 border border-amber-300 shadow-2xs">
            <span className="text-xs font-bold text-slate-800">目标分舵:</span>
            <select
              value={selectedFranchiseeId}
              onChange={(e) => {
                setSelectedFranchiseeId(e.target.value);
                showToast(`已载入 ${e.target.value} 供应链与防飞单审计数据`);
              }}
              className="text-xs font-bold font-mono bg-white border border-slate-300 px-2 py-1 outline-none text-slate-900 cursor-pointer"
            >
              <option value="FRAN-SH-001">静安卓越分部 (合规标杆)</option>
              <option value="FRAN-SH-002">浦东潮玩分部 (⚠️高危私采排查)</option>
            </select>
          </div>
        )}
      </div>

      {/* 2. Key Diagnostic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className={`p-4 border ${highRiskCount > 0 ? 'bg-red-50/70 border-red-300' : 'bg-emerald-50/70 border-emerald-300'} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">私采外购替代风险单</span>
            <AlertTriangle className={`w-4 h-4 ${highRiskCount > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-black font-mono ${highRiskCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {highRiskCount} <span className="text-xs font-normal">项品类异常</span>
            </span>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {highRiskCount > 0 ? '实销出单量显著超出总部供料上限' : '全量菜品中央供料与销售相符'}
            </p>
          </div>
        </div>

        <div className={`p-4 border ${unrecordedCount > 0 ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-300'} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">私藏收现飞单嫌疑</span>
            <TrendingDown className={`w-4 h-4 ${unrecordedCount > 0 ? 'text-amber-600' : 'text-slate-500'}`} />
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-black font-mono ${unrecordedCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
              {unrecordedCount} <span className="text-xs font-normal">项原料亏空</span>
            </span>
            <p className="text-[11px] text-slate-600 mt-0.5">
              进料耗尽但 POS 未入账，疑似绕开平台收现
            </p>
          </div>
        </div>

        <div className="p-4 border bg-white border-slate-300 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">违规涉案/品牌分成潜在流失</span>
            <Scale className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-slate-950">
              ¥{totalLeakageAmount.toLocaleString()}
            </span>
            <p className="text-[11px] text-slate-600 mt-0.5">
              依据合同第 12.3 条将从履约保证金扣除 3 倍罚金
            </p>
          </div>
        </div>
      </div>

      {/* 3. Anti-Leakage Audit Inspection Matrix */}
      <div className="border border-slate-300 bg-white">
        <div className="px-4 py-3 bg-slate-100 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-700" />
            <h5 className="font-bold text-sm text-slate-900">
              本月出餐核销 vs. 中央供应链进料智能比对台账
            </h5>
          </div>
          <span className="text-xs font-mono text-slate-500">
            巡检时间: 2026-09-08 实时自动化流
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {audits.map((audit) => {
            const isHighRisk = audit.riskLevel === 'high_risk_private_sourcing';
            const isUnrecorded = audit.riskLevel === 'unrecorded_sales';
            const isSafe = audit.riskLevel === 'safe';

            return (
              <div
                key={audit.dishId}
                className={`p-4 transition-colors ${
                  isHighRisk ? 'bg-red-50/50' : isUnrecorded ? 'bg-amber-50/40' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h6 className="font-bold text-base text-slate-950">{audit.dishName}</h6>
                      {isHighRisk && (
                        <span className="px-2 py-0.5 text-[11px] font-black bg-red-600 text-white font-mono animate-pulse">
                          🚨 严重私采预警
                        </span>
                      )}
                      {isUnrecorded && (
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-500 text-slate-950 font-mono">
                          ⚠️ 疑似飞单逃税
                        </span>
                      )}
                      {isSafe && (
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 账实吻合
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-mono">{audit.period}</span>
                    </div>

                    <p className={`text-xs mt-2 font-medium leading-relaxed ${isHighRisk ? 'text-red-800' : 'text-slate-700'}`}>
                      {audit.inspectionNote}
                    </p>
                  </div>

                  {/* Quantitative Data Stats */}
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0 font-mono text-xs border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 block">POS 实销出单</span>
                      <span className="font-bold text-slate-900 text-sm">{audit.actualSalesQuantity} 份</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 block">理论耗料需求</span>
                      <span className="font-bold text-slate-900 text-sm">{audit.theoreticalMaterialRequired}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 block">总部实配进料</span>
                      <span className={`font-bold text-sm ${isHighRisk ? 'text-red-700' : 'text-emerald-700'}`}>
                        {audit.hqProcuredQuantity}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 block">供需偏差率</span>
                      <span className={`font-black text-sm ${audit.variancePercent > 10 ? 'text-red-700' : 'text-slate-800'}`}>
                        {audit.variancePercent > 0 ? `+${audit.variancePercent}%` : `${audit.variancePercent}%`}
                      </span>
                    </div>

                    {audit.estimatedLossOrLeakage > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          showToast(`已向督导组上报【${audit.dishName}】私采核查立案，通知单号: CASE-2026-0908`)
                        }
                        className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95"
                      >
                        下发违约调查令
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Core Dish Standard BOM Specifications (Accordion / Detail) */}
      <div className="border border-slate-300 bg-white">
        <div className="px-4 py-3 bg-slate-100 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-700" />
            <h5 className="font-bold text-sm text-slate-900">
              品牌中央冷链标准 BOM 耗料与成菜标准成本一览
            </h5>
          </div>
          <span className="text-xs text-slate-500">
            严禁加盟商自采或更改统配料包装
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {recipes.map((recipe) => {
            const isExpanded = expandedDishId === recipe.dishId;
            return (
              <div key={recipe.dishId} className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setExpandedDishId(isExpanded ? null : recipe.dishId)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-slate-950">{recipe.dishName}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300">
                      理论料本: ¥{recipe.theoreticalCost.toFixed(2)}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700">
                      标准出品率: {(recipe.standardYieldRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <span>{recipe.ingredients.length} 项核心统配件</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 overflow-x-auto border border-slate-200 bg-slate-50 p-3">
                    <table className="w-full text-left text-xs font-sans">
                      <thead>
                        <tr className="text-slate-500 font-mono border-b border-slate-200">
                          <th className="pb-1.5 font-bold">统配物料名称</th>
                          <th className="pb-1.5 font-bold">SKU 编码</th>
                          <th className="pb-1.5 font-bold">单份标准耗用</th>
                          <th className="pb-1.5 font-bold">总部直供底价</th>
                          <th className="pb-1.5 font-bold">品控属性</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 font-mono">
                        {recipe.ingredients.map((ing) => (
                          <tr key={ing.materialId} className="hover:bg-white/60">
                            <td className="py-2 font-sans font-medium text-slate-900">{ing.materialName}</td>
                            <td className="py-2 text-slate-600">{ing.skuCode}</td>
                            <td className="py-2 font-bold text-slate-900">
                              {ing.quantityPerServing} {ing.unit}
                            </td>
                            <td className="py-2 text-slate-800">¥{ing.costPerUnit.toFixed(2)} / {ing.unit}</td>
                            <td className="py-2">
                              {ing.isHqMandatory ? (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                                  👑 总部统配红线
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px]">
                                  允许合规辅料
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
