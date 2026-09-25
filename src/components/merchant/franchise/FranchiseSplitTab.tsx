import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Download,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sliders,
  FileText,
  AlertCircle,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  CreditCard,
  Building2,
  ChevronDown
} from 'lucide-react';
import {
  globalFranchiseSplitEngine,
  FRANCHISE_SPLIT_EVENT
} from '../../../utils/franchiseSplitPayEngine';
import {
  TransactionSplitDetail,
  FranchiseeSettlementBill,
  FranchiseSplitConfig,
  FranchiseTenantContext,
  SplitSettlementStatus
} from '../../../types/franchise';
import { exportToCsv } from '../../../utils/dataExportEngine';

interface FranchiseSplitTabProps {
  context: FranchiseTenantContext;
  showToast: (msg: string) => void;
}

export const FranchiseSplitTab: React.FC<FranchiseSplitTabProps> = ({ context, showToast }) => {
  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState<string>(
    context.isHqUser ? 'all' : context.currentFranchiseeId
  );
  const [splits, setSplits] = useState<TransactionSplitDetail[]>(() =>
    globalFranchiseSplitEngine.getSplitDetails(
      selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
    )
  );
  const [bills, setBills] = useState<FranchiseeSettlementBill[]>(() =>
    globalFranchiseSplitEngine.getSettlementBills(
      selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
    )
  );
  const [configs, setConfigs] = useState<Record<string, FranchiseSplitConfig>>(() =>
    globalFranchiseSplitEngine.getSplitConfigs()
  );

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubView, setActiveSubView] = useState<'splits' | 'bills' | 'configs'>('splits');

  // Freeze Modal State
  const [freezeModalSplit, setFreezeModalSplit] = useState<TransactionSplitDetail | null>(null);
  const [freezeReasonInput, setFreezeReasonInput] = useState('涉嫌食材配料BOM耗量异常，暂停结算打款');

  // Config Editing
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [royaltyInput, setRoyaltyInput] = useState('5.0');
  const [marketingInput, setMarketingInput] = useState('2.0');

  useEffect(() => {
    const handleUpdate = () => {
      setSplits(
        globalFranchiseSplitEngine.getSplitDetails(
          selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
        )
      );
      setBills(
        globalFranchiseSplitEngine.getSettlementBills(
          selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
        )
      );
      setConfigs(globalFranchiseSplitEngine.getSplitConfigs());
    };

    window.addEventListener(FRANCHISE_SPLIT_EVENT, handleUpdate);
    return () => window.removeEventListener(FRANCHISE_SPLIT_EVENT, handleUpdate);
  }, [selectedFranchiseeId]);

  const summary = useMemo(() => {
    return globalFranchiseSplitEngine.getSplitSummary(
      selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
    );
  }, [splits, selectedFranchiseeId]);

  const filteredSplits = useMemo(() => {
    return splits.filter((s) => {
      if (statusFilter !== 'all' && s.settlementStatus !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.orderNo.toLowerCase().includes(q) ||
          s.franchiseeName.toLowerCase().includes(q) ||
          s.truckId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [splits, statusFilter, searchQuery]);

  const handleExecuteSettlement = () => {
    const targetId = selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId;
    const res = globalFranchiseSplitEngine.executeBatchSettlement(targetId);
    if (res.settledCount === 0) {
      showToast('当前暂无待结算(D+1)的合规订单');
      return;
    }
    setSplits(globalFranchiseSplitEngine.getSplitDetails(targetId));
    setBills(globalFranchiseSplitEngine.getSettlementBills(targetId));
    showToast(
      `D+1 批量对账清算成功！共结算 ${res.settledCount} 笔订单，划付净收益 ¥${res.totalAmount.toFixed(2)}`
    );
  };

  const handleExportCsv = () => {
    if (activeSubView === 'splits') {
      const data = filteredSplits.map((s) => ({
        分账流水号: s.id,
        关联订单号: s.orderNo,
        加盟商分舵: s.franchiseeName,
        餐车编号: s.truckId,
        订单金额GMV: s.orderAmount.toFixed(2),
        平台技术费: s.platformTechFee.toFixed(2),
        总部特许权益金: s.hqRoyaltyFee.toFixed(2),
        全国营销基金: s.marketingFundFee.toFixed(2),
        加盟商净结算额: s.franchiseeSettlementAmount.toFixed(2),
        结算周期: s.settlementCycle,
        结算状态:
          s.settlementStatus === 'settled'
            ? '已结算'
            : s.settlementStatus === 'pending_clearance'
            ? '待清算'
            : s.settlementStatus === 'frozen_for_investigation'
            ? '风控冻结'
            : '退款追回',
        创建时间: s.createdAt,
        结算时间: s.settledAt || '-'
      }));
      const headers = Object.keys(data[0] || {}).map((k) => ({ label: k, key: k }));
      exportToCsv(`加盟分账清算流水_${Date.now()}`, headers, data);
      showToast('分账流水报表已导出');
    } else {
      const data = bills.map((b) => ({
        对账单号: b.billNo,
        加盟分舵: b.franchiseeName,
        对账日期: b.settlementDate,
        订单总数: b.totalOrdersCount,
        营业毛额GMV: b.totalGrossRevenue.toFixed(2),
        总部特许费: b.totalHqRoyalty.toFixed(2),
        营销基金: b.totalMarketingFund.toFixed(2),
        通道费: b.totalTechFee.toFixed(2),
        实际划付净额: b.totalNetPayout.toFixed(2),
        状态: b.status === 'paid' ? '已划付打款' : '对账中',
        生成时间: b.generatedAt
      }));
      const headers = Object.keys(data[0] || {}).map((k) => ({ label: k, key: k }));
      exportToCsv(`加盟商对账结算单_${Date.now()}`, headers, data);
      showToast('结算对账单报表已导出');
    }
  };

  const handleConfirmFreeze = () => {
    if (!freezeModalSplit) return;
    globalFranchiseSplitEngine.freezeSplit(freezeModalSplit.id, freezeReasonInput);
    setSplits(
      globalFranchiseSplitEngine.getSplitDetails(
        selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
      )
    );
    setFreezeModalSplit(null);
    showToast(`已对订单 ${freezeModalSplit.orderNo} 实施结算款风控冻结`);
  };

  const handleUnfreeze = (splitId: string) => {
    globalFranchiseSplitEngine.unfreezeSplit(splitId);
    setSplits(
      globalFranchiseSplitEngine.getSplitDetails(
        selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
      )
    );
    showToast('已解除风控冻结，款项回归正常待结算池');
  };

  const handleSaveConfig = (franchiseeId: string) => {
    const current = configs[franchiseeId];
    if (!current) return;
    const r = parseFloat(royaltyInput) || current.royaltyRatePercent;
    const m = parseFloat(marketingInput) || current.marketingRatePercent;
    globalFranchiseSplitEngine.updateSplitConfig({
      ...current,
      royaltyRatePercent: r,
      marketingRatePercent: m
    });
    setEditingConfigId(null);
    showToast('分账比例配置已更新');
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Filter Bar & Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 text-white p-3.5 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center font-bold">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold tracking-tight">特许经营分账清算与 D+1 财务对账</h4>
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-400/20 text-amber-300 font-mono">
                D+1 Split Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              全自动多级收益切片 · 总部特许提成 (5%) · 营销基金 (2%) · 风控拦截冲账
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {context.isHqUser && (
            <select
              value={selectedFranchiseeId}
              onChange={(e) => setSelectedFranchiseeId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-xs text-white rounded-none cursor-pointer"
            >
              <option value="all">全网加盟商 (透视全盘)</option>
              <option value="FRAN-SH-001">静安卓越分部 (FRAN-SH-001)</option>
              <option value="FRAN-SH-002">浦东潮玩特许部 (FRAN-SH-002)</option>
              <option value="FRAN-SH-003">徐汇西岸艺术驿站 (FRAN-SH-003)</option>
            </select>
          )}

          {context.isHqUser && (
            <button
              type="button"
              onClick={handleExecuteSettlement}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>D+1 批量结算打款</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出报表</span>
          </button>
        </div>
      </div>

      {/* 2. Statistical Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <div className="p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">累计总流水 (GMV)</span>
          <div className="text-base font-black text-slate-900 font-mono mt-0.5">
            ¥{summary.totalGMV.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">实付含自营/加盟</span>
        </div>

        <div className="p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-emerald-700 font-medium block">加盟商净结算 (Net)</span>
          <div className="text-base font-black text-emerald-600 font-mono mt-0.5">
            ¥{summary.totalNetSettlement.toFixed(2)}
          </div>
          <span className="text-[10px] text-emerald-600/80 mt-1 block">扣除特许与营销费</span>
        </div>

        <div className="p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-indigo-700 font-medium block">总部品牌权益金 (5%)</span>
          <div className="text-base font-black text-indigo-600 font-mono mt-0.5">
            ¥{summary.totalHqRoyalty.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">按协议比例自动留存</span>
        </div>

        <div className="p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-amber-700 font-medium block">统筹营销基金 (2%)</span>
          <div className="text-base font-black text-amber-600 font-mono mt-0.5">
            ¥{summary.totalMarketingFund.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">品牌联合营销专项</span>
        </div>

        <div className="p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">待结算待清流水 (D+1)</span>
          <div className="text-base font-black text-blue-600 font-mono mt-0.5">
            ¥{summary.pendingAmount.toFixed(2)}
          </div>
          <span className="text-[10px] text-blue-600/80 mt-1 block">共 {summary.pendingCount} 笔等待零点划付</span>
        </div>

        <div className="p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-rose-700 font-medium block">风控冻结/冲抵</span>
          <div className="text-base font-black text-rose-600 font-mono mt-0.5">
            {summary.frozenCount + summary.clawbackCount} <span className="text-xs font-normal">笔</span>
          </div>
          <span className="text-[10px] text-rose-500 mt-1 block">
            {summary.frozenCount} 笔冻结 / {summary.clawbackCount} 笔冲账
          </span>
        </div>
      </div>

      {/* 3. Sub-views Switcher */}
      <div className="flex border-b border-slate-200 text-xs font-semibold bg-slate-50">
        <button
          type="button"
          onClick={() => setActiveSubView('splits')}
          className={`py-2 px-4 border-b-2 cursor-pointer transition-colors ${
            activeSubView === 'splits'
              ? 'border-indigo-600 bg-white text-indigo-900'
              : 'border-transparent text-slate-600 hover:bg-slate-100'
          }`}
        >
          分账实时流水细账 ({splits.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubView('bills')}
          className={`py-2 px-4 border-b-2 cursor-pointer transition-colors ${
            activeSubView === 'bills'
              ? 'border-indigo-600 bg-white text-indigo-900'
              : 'border-transparent text-slate-600 hover:bg-slate-100'
          }`}
        >
          已结算对账汇总单 ({bills.length})
        </button>
        {context.isHqUser && (
          <button
            type="button"
            onClick={() => setActiveSubView('configs')}
            className={`py-2 px-4 border-b-2 cursor-pointer transition-colors ${
              activeSubView === 'configs'
                ? 'border-indigo-600 bg-white text-indigo-900'
                : 'border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            各加盟商分账费率规则 ({Object.keys(configs).length})
          </button>
        )}
      </div>

      {/* SUBVIEW 1: Real-time Split Records */}
      {activeSubView === 'splits' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500">状态筛选:</span>
              {[
                { key: 'all', label: '全部状态' },
                { key: 'pending_clearance', label: '待清算 (D+1)' },
                { key: 'settled', label: '已结算' },
                { key: 'frozen_for_investigation', label: '风控冻结' },
                { key: 'refund_clawback', label: '退款追回' }
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatusFilter(st.key)}
                  className={`px-2 py-1 text-xs cursor-pointer border ${
                    statusFilter === st.key
                      ? 'bg-slate-900 text-white border-slate-900 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索单号/餐车/加盟商..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-white border border-slate-200 text-xs w-56 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Records Table */}
          <div className="border border-slate-200 overflow-x-auto bg-white">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">订单/分账号</th>
                  <th className="py-2.5 px-3">特许加盟分舵 / 餐车</th>
                  <th className="py-2.5 px-3 text-right">订单GMV</th>
                  <th className="py-2.5 px-3 text-right">特许权益金 (5%)</th>
                  <th className="py-2.5 px-3 text-right">营销基金 (2%)</th>
                  <th className="py-2.5 px-3 text-right">加盟商净额</th>
                  <th className="py-2.5 px-3 text-center">结算状态</th>
                  <th className="py-2.5 px-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSplits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      未查询到符合条件的分账流水
                    </td>
                  </tr>
                ) : (
                  filteredSplits.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-slate-900">{s.orderNo}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.id}</div>
                        <div className="text-[10px] text-slate-400">{s.createdAt}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{s.franchiseeName}</div>
                        <div className="text-[10px] font-mono text-indigo-700">{s.truckId}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ¥{s.orderAmount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-indigo-700">
                        -¥{s.hqRoyaltyFee.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                        -¥{s.marketingFundFee.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        ¥{s.franchiseeSettlementAmount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {s.settlementStatus === 'settled' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> 已结算 ({s.settlementCycle})
                          </span>
                        )}
                        {s.settlementStatus === 'pending_clearance' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                            <Clock className="w-3 h-3" /> 待结算 ({s.settlementCycle})
                          </span>
                        )}
                        {s.settlementStatus === 'frozen_for_investigation' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                            <ShieldAlert className="w-3 h-3" /> 风控冻结
                          </span>
                        )}
                        {s.settlementStatus === 'refund_clawback' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                            <RotateCcw className="w-3 h-3" /> 退款追回冲账
                          </span>
                        )}
                        {s.freezeReason && (
                          <p className="text-[10px] text-rose-500 max-w-xs truncate mx-auto mt-0.5">
                            {s.freezeReason}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {context.isHqUser && (
                          <div className="flex items-center justify-center gap-1">
                            {s.settlementStatus === 'pending_clearance' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFreezeModalSplit(s);
                                  setFreezeReasonInput('风控巡检拦截：怀疑该单食材未走中央仓');
                                }}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] cursor-pointer"
                              >
                                冻结
                              </button>
                            )}
                            {s.settlementStatus === 'frozen_for_investigation' && (
                              <button
                                type="button"
                                onClick={() => handleUnfreeze(s.id)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] cursor-pointer"
                              >
                                解冻
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW 2: Consolidated Settlement Bills */}
      {activeSubView === 'bills' && (
        <div className="space-y-3">
          <div className="border border-slate-200 bg-white">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">对账单号</th>
                  <th className="py-2.5 px-3">对账日期</th>
                  <th className="py-2.5 px-3">归属加盟商</th>
                  <th className="py-2.5 px-3 text-right">有效订单数</th>
                  <th className="py-2.5 px-3 text-right">毛额 GMV</th>
                  <th className="py-2.5 px-3 text-right">总部权益金</th>
                  <th className="py-2.5 px-3 text-right">实际划付净额</th>
                  <th className="py-2.5 px-3 text-center">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{b.billNo}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{b.settlementDate}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{b.franchiseeName}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                      {b.totalOrdersCount} 单
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      ¥{b.totalGrossRevenue.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-indigo-700">
                      ¥{b.totalHqRoyalty.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                      ¥{b.totalNetPayout.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 已划付专户
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW 3: Split Rate Configurations (HQ Mode) */}
      {activeSubView === 'configs' && context.isHqUser && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
            <Sliders className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>总部特许费率控制台</strong>：各特许加盟商的权益金比例严格受签约合同约定。系统在订单完结时按毫秒级原子切片自动沉淀账目，每日零点执行
              D+1 自动归集与代扣。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.values(configs).map((cfg) => {
              const isEditing = editingConfigId === cfg.franchiseeId;
              return (
                <div key={cfg.franchiseeId} className="bg-white border border-slate-200 p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-slate-900">{cfg.franchiseeId}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 font-mono text-slate-700">
                      {cfg.settlementCycle} 自动划付
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-[11px] text-slate-500 block">品牌权益金比率 (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={royaltyInput}
                          onChange={(e) => setRoyaltyInput(e.target.value)}
                          className="w-full mt-1 px-2 py-1 bg-slate-50 border border-slate-300 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block">营销基金比率 (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={marketingInput}
                          onChange={(e) => setMarketingInput(e.target.value)}
                          className="w-full mt-1 px-2 py-1 bg-slate-50 border border-slate-300 font-mono font-bold"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleSaveConfig(cfg.franchiseeId)}
                          className="flex-1 py-1 bg-slate-900 text-white font-bold text-xs cursor-pointer"
                        >
                          保存变更
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingConfigId(null)}
                          className="py-1 px-2.5 bg-slate-100 text-slate-700 text-xs cursor-pointer"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">品牌特许权益金:</span>
                        <span className="font-mono font-bold text-indigo-700">
                          {cfg.royaltyRatePercent}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">全国统筹营销基金:</span>
                        <span className="font-mono font-bold text-amber-700">
                          {cfg.marketingRatePercent}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">通道技术通道费:</span>
                        <span className="font-mono font-semibold text-slate-600">
                          {cfg.techFeeRatePercent}%
                        </span>
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingConfigId(cfg.franchiseeId);
                            setRoyaltyInput(cfg.royaltyRatePercent.toString());
                            setMarketingInput(cfg.marketingRatePercent.toString());
                          }}
                          className="w-full py-1 text-center bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                        >
                          微调分账比例
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Freeze Confirmation Modal */}
      {freezeModalSplit && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-rose-300 w-full max-w-md p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>下发分账风控冻结令</span>
              </div>
              <button
                type="button"
                onClick={() => setFreezeModalSplit(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              您将对订单 <strong className="font-mono">{freezeModalSplit.orderNo}</strong> (结算净额 ¥
              {freezeModalSplit.franchiseeSettlementAmount.toFixed(2)}) 实施风控拦截，款项将暂停 D+1
              自动划付。
            </p>

            <div>
              <label className="text-xs text-slate-700 font-medium block">风控冻结原因说明:</label>
              <textarea
                rows={2}
                value={freezeReasonInput}
                onChange={(e) => setFreezeReasonInput(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 text-xs focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFreezeModalSplit(null)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmFreeze}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
              >
                确认冻结款项
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
