import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  Download,
  DollarSign,
  FileText,
  Building2,
  Truck,
  RotateCcw,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Scale,
  Award,
  BadgeAlert,
  ArrowRight
} from 'lucide-react';
import {
  globalFranchiseAuditEngine,
  FRANCHISE_AUDIT_EVENT,
  STANDARD_INSPECTION_CHECKLIST
} from '../../../utils/franchiseStoreAuditEngine';
import {
  StoreInspectionCard,
  StoreInspectionCategory,
  DepositTransactionRecord,
  FranchiseTenantContext,
  InspectionGrade
} from '../../../types/franchise';
import { exportToCsv } from '../../../utils/dataExportEngine';

interface FranchiseAuditTabProps {
  context: FranchiseTenantContext;
  showToast: (msg: string) => void;
}

export const FranchiseAuditTab: React.FC<FranchiseAuditTabProps> = ({ context, showToast }) => {
  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState<string>(
    context.isHqUser ? 'all' : context.currentFranchiseeId
  );
  const [cards, setCards] = useState<StoreInspectionCard[]>(() =>
    globalFranchiseAuditEngine.getInspectionCards(
      selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
    )
  );
  const [depositRecords, setDepositRecords] = useState<DepositTransactionRecord[]>(() =>
    globalFranchiseAuditEngine.getDepositRecords(
      selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
    )
  );

  const [activeSubTab, setActiveSubTab] = useState<'cards' | 'new_inspection' | 'deposit'>('cards');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Rectification modal
  const [rectifyModalCard, setRectifyModalCard] = useState<StoreInspectionCard | null>(null);
  const [rectifyNotesInput, setRectifyNotesInput] = useState(
    '已清理私采无标肉饼，重新自中央仓补货，保鲜柜温控已校准至 2.5℃。'
  );

  // Deposit Replenish Modal
  const [isReplenishModalOpen, setIsReplenishModalOpen] = useState(false);
  const [replenishAmount, setReplenishAmount] = useState('5000');

  // New Inspection Form State
  const [newTruckId, setNewTruckId] = useState<string>(context.currentTruckId || 'truck-01');
  const [newFranId, setNewFranId] = useState<string>('FRAN-SH-001');
  const [newInspector, setNewInspector] = useState<string>('张督导 (区域品控特派员)');
  const [newChecklist, setNewChecklist] = useState<StoreInspectionCategory[]>(() =>
    JSON.parse(JSON.stringify(STANDARD_INSPECTION_CHECKLIST))
  );
  const [findingsInput, setFindingsInput] = useState<string>('');
  const [penaltyInput, setPenaltyInput] = useState<string>('0');

  useEffect(() => {
    const handleUpdate = () => {
      setCards(
        globalFranchiseAuditEngine.getInspectionCards(
          selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
        )
      );
      setDepositRecords(
        globalFranchiseAuditEngine.getDepositRecords(
          selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
        )
      );
    };

    window.addEventListener(FRANCHISE_AUDIT_EVENT, handleUpdate);
    return () => window.removeEventListener(FRANCHISE_AUDIT_EVENT, handleUpdate);
  }, [selectedFranchiseeId]);

  const summary = useMemo(() => {
    return globalFranchiseAuditEngine.getAuditSummary(
      selectedFranchiseeId === 'all' ? undefined : selectedFranchiseeId
    );
  }, [cards, depositRecords, selectedFranchiseeId]);

  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (gradeFilter !== 'all' && c.grade !== gradeFilter) return false;
      return true;
    });
  }, [cards, gradeFilter]);

  // Compute calculated score for the new inspection in progress
  const calculatedScore = useMemo(() => {
    let score = 100;
    newChecklist.forEach((cat) => {
      cat.items.forEach((item) => {
        if (!item.passed) {
          score -= item.deduction;
        }
      });
    });
    return Math.max(0, score);
  }, [newChecklist]);

  const calculatedGrade: InspectionGrade = useMemo(() => {
    if (calculatedScore >= 90) return 'A';
    if (calculatedScore >= 80) return 'B';
    if (calculatedScore >= 70) return 'C';
    return 'D';
  }, [calculatedScore]);

  const handleToggleItemPassed = (catIdx: number, itemIdx: number) => {
    setNewChecklist((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[catIdx].items[itemIdx].passed = !copy[catIdx].items[itemIdx].passed;
      return copy;
    });
  };

  const handleSubmitNewInspection = (e: React.FormEvent) => {
    e.preventDefault();
    const franNames: Record<string, string> = {
      'FRAN-SH-001': '黑曜石流动餐车 · 静安卓越分部',
      'FRAN-SH-002': '黑曜石流动餐车 · 浦东潮玩特许部',
      'FRAN-SH-003': '黑曜石流动餐车 · 徐汇西岸艺术驿站'
    };

    const penalty = parseFloat(penaltyInput) || 0;
    const criticalFindings = findingsInput.trim()
      ? findingsInput.split('\n').filter(Boolean)
      : calculatedGrade === 'A'
      ? ['现场设备运转正常，各项卫生及配方达标']
      : ['发现部分规范执行不到位，已督促整改'];

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now
      .getDate()
      .toString()
      .padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    globalFranchiseAuditEngine.submitInspection(
      {
        inspectionNo: `INS-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now
          .getDate()
          .toString()
          .padStart(2, '0')}-${Math.floor(10 + Math.random() * 90)}`,
        franchiseeId: newFranId,
        franchiseeName: franNames[newFranId] || '特许加盟餐车',
        truckId: newTruckId,
        inspectorName: newInspector,
        inspectionDate: dateStr,
        score: calculatedScore,
        grade: calculatedGrade,
        categories: newChecklist,
        criticalFindings,
        rectificationRequired: calculatedGrade === 'C' || calculatedGrade === 'D' || penalty > 0,
        rectificationDeadline:
          calculatedGrade === 'C' || calculatedGrade === 'D'
            ? '2026-09-12 18:00'
            : undefined,
        rectificationStatus:
          calculatedGrade === 'C' || calculatedGrade === 'D'
            ? 'pending_rectification'
            : 'passed',
        penaltyAmount: penalty,
        penaltyPaid: penalty > 0
      },
      newInspector
    );

    setActiveSubTab('cards');
    showToast(
      `督导巡检评分卡已提交！综合得分: ${calculatedScore}分 (${calculatedGrade}级)${
        penalty > 0 ? `，已扣罚保证金 ¥${penalty.toFixed(2)}` : ''
      }`
    );
  };

  const handleConfirmRectification = (approved: boolean) => {
    if (!rectifyModalCard) return;
    const nextStatus = approved ? 'reinspected_passed' : 'rectification_overdue';
    globalFranchiseAuditEngine.updateRectificationStatus(
      rectifyModalCard.id,
      nextStatus,
      rectifyNotesInput
    );
    setRectifyModalCard(null);
    showToast(
      approved
        ? `整改复检已通过！${rectifyModalCard.franchiseeName} 已闭环整改单`
        : `整改已被督导驳回或已标记为超时超期！`
    );
  };

  const handleReplenishDeposit = () => {
    const amt = parseFloat(replenishAmount) || 0;
    if (amt <= 0) {
      showToast('请输入有效的充值补缴金额');
      return;
    }
    const targetFran =
      selectedFranchiseeId === 'all' ? 'FRAN-SH-002' : selectedFranchiseeId;
    globalFranchiseAuditEngine.replenishDeposit(
      targetFran,
      amt,
      context.isHqUser ? '总部财务代充' : '加盟商在线补缴'
    );
    setIsReplenishModalOpen(false);
    showToast(`履约保证金成功补缴充值 ¥${amt.toFixed(2)}！`);
  };

  const handleExportCards = () => {
    const data = filteredCards.map((c) => ({
      巡检单号: c.inspectionNo,
      受检加盟商: c.franchiseeName,
      餐车编号: c.truckId,
      巡检督导: c.inspectorName,
      巡检日期: c.inspectionDate,
      综合得分: c.score,
      评级等阶: c.grade,
      整改状态:
        c.rectificationStatus === 'passed'
          ? '合格'
          : c.rectificationStatus === 'pending_rectification'
          ? '待整改'
          : c.rectificationStatus === 'reinspected_passed'
          ? '复检合格'
          : '整改超时',
      扣除保证金: c.penaltyAmount.toFixed(2),
      主要隐患: c.criticalFindings.join('; ')
    }));
    const headers = Object.keys(data[0] || {}).map((k) => ({ label: k, key: k }));
    exportToCsv(`线下门店巡检报告_${Date.now()}`, headers, data);
    showToast('巡检报告已成功导出');
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Filter & Summary Ribbon */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 text-white p-3.5 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center font-bold">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold tracking-tight">门店督导巡检品质评估与履约保证金</h4>
              <span className="text-[10px] px-1.5 py-0.5 bg-indigo-400/20 text-indigo-300 font-mono">
                Store Audit & Escrow
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              五大质检维度 · 动态评级 (A/B/C/D) · 限期整改闭环 · 履约保证金奖惩扣罚
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
              <option value="all">全网加盟商 (全景透视)</option>
              <option value="FRAN-SH-001">静安卓越分部 (FRAN-SH-001)</option>
              <option value="FRAN-SH-002">浦东潮玩特许部 (FRAN-SH-002)</option>
              <option value="FRAN-SH-003">徐汇西岸艺术驿站 (FRAN-SH-003)</option>
            </select>
          )}

          {context.isHqUser && (
            <button
              type="button"
              onClick={() => setActiveSubTab('new_inspection')}
              className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>现场督导打分</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsReplenishModalOpen(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>补缴保证金</span>
          </button>

          <button
            type="button"
            onClick={handleExportCards}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出报告</span>
          </button>
        </div>
      </div>

      {/* 2. Statistical Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <div className="p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">综合巡检均分</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
            {summary.avgScore} <span className="text-xs font-normal">分</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">共 {summary.totalInspections} 次巡检</span>
        </div>

        <div className="p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-emerald-700 font-medium block">等阶分布 (A/B)</span>
          <div className="text-lg font-black text-emerald-600 font-mono mt-0.5">
            {summary.gradeA} / {summary.gradeB}
          </div>
          <span className="text-[10px] text-emerald-600/80 mt-1 block">A级优秀 / B级达标</span>
        </div>

        <div className="p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-amber-700 font-medium block">待限期整改 (C/D)</span>
          <div className="text-xl font-black text-amber-600 font-mono mt-0.5">
            {summary.pendingRectifications} <span className="text-xs font-normal">单</span>
          </div>
          <span className="text-[10px] text-amber-600/80 mt-1 block">需限期复查闭环</span>
        </div>

        <div className="p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-rose-700 font-medium block">累计违约罚金</span>
          <div className="text-base font-black text-rose-600 font-mono mt-0.5">
            ¥{summary.totalPenalties.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">从保证金账户扣除</span>
        </div>

        <div className="p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">履约保证金余额</span>
          <div className="text-base font-black text-indigo-700 font-mono mt-0.5">
            ¥{summary.depositBalance.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">应缴门槛: ¥{summary.depositRequired.toLocaleString()}</span>
        </div>

        <div className="p-3 bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">履约风控状态</span>
          <div className="mt-1">
            {summary.depositBalance >= summary.depositRequired ? (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold inline-block">
                保证金足额 · 正常
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold inline-block">
                保证金不足 · 需补足
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">履约金安全保障</span>
        </div>
      </div>

      {/* 3. Sub Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold bg-slate-50">
        <button
          type="button"
          onClick={() => setActiveSubTab('cards')}
          className={`py-2 px-4 border-b-2 cursor-pointer transition-colors ${
            activeSubTab === 'cards'
              ? 'border-indigo-600 bg-white text-indigo-900'
              : 'border-transparent text-slate-600 hover:bg-slate-100'
          }`}
        >
          历史巡检评分卡 ({cards.length})
        </button>
        {context.isHqUser && (
          <button
            type="button"
            onClick={() => setActiveSubTab('new_inspection')}
            className={`py-2 px-4 border-b-2 cursor-pointer transition-colors ${
              activeSubTab === 'new_inspection'
                ? 'border-indigo-600 bg-white text-indigo-900'
                : 'border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            现场督导打分录入
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveSubTab('deposit')}
          className={`py-2 px-4 border-b-2 cursor-pointer transition-colors ${
            activeSubTab === 'deposit'
              ? 'border-indigo-600 bg-white text-indigo-900'
              : 'border-transparent text-slate-600 hover:bg-slate-100'
          }`}
        >
          履约保证金扣罚与补缴明细 ({depositRecords.length})
        </button>
      </div>

      {/* SUBVIEW 1: Inspection Cards List */}
      {activeSubTab === 'cards' && (
        <div className="space-y-3">
          {/* Grade Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-500">等阶筛选:</span>
            {[
              { key: 'all', label: '全部等阶' },
              { key: 'A', label: 'A级 优秀 (90-100分)' },
              { key: 'B', label: 'B级 良好 (80-89分)' },
              { key: 'C', label: 'C级 需整改 (70-79分)' },
              { key: 'D', label: 'D级 停业 (<70分)' }
            ].map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGradeFilter(g.key)}
                className={`px-2 py-1 text-xs cursor-pointer border ${
                  gradeFilter === g.key
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredCards.map((card) => {
              const isExpanded = expandedCardId === card.id;
              return (
                <div
                  key={card.id}
                  className="bg-white border border-slate-200 p-4 space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 flex flex-col items-center justify-center font-black text-lg border ${
                          card.grade === 'A'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : card.grade === 'B'
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : card.grade === 'C'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-rose-50 text-rose-700 border-rose-300'
                        }`}
                      >
                        <span>{card.grade}</span>
                        <span className="text-[9px] font-normal">{card.score}分</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{card.franchiseeName}</h4>
                          <span className="font-mono text-xs px-1.5 py-0.5 bg-slate-100 text-indigo-700 border border-slate-200 font-semibold">
                            {card.truckId}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>巡检单号: <strong className="font-mono text-slate-800">{card.inspectionNo}</strong></span>
                          <span>|</span>
                          <span>督导: {card.inspectorName}</span>
                          <span>|</span>
                          <span>日期: {card.inspectionDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {card.rectificationStatus === 'passed' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          巡检达标合格
                        </span>
                      )}
                      {card.rectificationStatus === 'pending_rectification' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          限期整改中 (至 {card.rectificationDeadline})
                        </span>
                      )}
                      {card.rectificationStatus === 'reinspected_passed' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          复检合格通过
                        </span>
                      )}

                      {card.penaltyAmount > 0 && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-xs font-bold">
                          扣除保证金 ¥{card.penaltyAmount}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Critical Findings */}
                  <div className="text-xs text-slate-700 bg-slate-50 p-2.5 space-y-1">
                    <strong className="text-slate-900 block">现场督导诊断结论:</strong>
                    {card.criticalFindings.map((f, i) => (
                      <p key={i} className="text-slate-600 flex items-start gap-1">
                        <span className="text-slate-400">•</span>
                        <span>{f}</span>
                      </p>
                    ))}
                    {card.reinspectionNotes && (
                      <p className="text-blue-700 mt-1 font-medium">
                        复检备忘: {card.reinspectionNotes}
                      </p>
                    )}
                  </div>

                  {/* Actions for Pending Rectification */}
                  {card.rectificationStatus === 'pending_rectification' && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-amber-800">
                        需在 {card.rectificationDeadline} 前完成闭环整改并上传证据
                      </span>
                      <button
                        type="button"
                        onClick={() => setRectifyModalCard(card)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>{context.isHqUser ? '督导现场复核验收' : '提交整改证据与说明'}</span>
                      </button>
                    </div>
                  )}

                  {/* Expandable 5 Dimensions Checklist Detail */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                      <h5 className="text-xs font-bold text-slate-800">五大质检维度评分细则:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {card.categories.map((cat) => (
                          <div
                            key={cat.categoryKey}
                            className="bg-slate-50/70 border border-slate-200 p-2.5 text-xs space-y-2"
                          >
                            <div className="flex items-center justify-between font-bold text-slate-900">
                              <span>{cat.categoryName}</span>
                              <span className="font-mono text-indigo-700">
                                {cat.currentScore} / {cat.maxScore}分
                              </span>
                            </div>
                            <div className="space-y-1">
                              {cat.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-start justify-between gap-2 p-1.5 bg-white border border-slate-100"
                                >
                                  <div>
                                    <span className="font-medium text-slate-800">{item.title}</span>
                                    <p className="text-[10px] text-slate-500">{item.standard}</p>
                                    {item.note && (
                                      <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                                        现场抽检记录: {item.note}
                                      </p>
                                    )}
                                  </div>
                                  <span
                                    className={`shrink-0 text-[10px] px-1.5 py-0.5 font-bold ${
                                      item.passed
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-rose-50 text-rose-700'
                                    }`}
                                  >
                                    {item.passed ? '达标' : `扣${item.deduction}分`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBVIEW 2: New Inspection Form */}
      {activeSubTab === 'new_inspection' && context.isHqUser && (
        <form onSubmit={handleSubmitNewInspection} className="bg-white border border-slate-200 p-4 space-y-4">
          <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900">录入线下门店实地督导巡检评分卡</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">实时计算总分:</span>
              <span className="text-lg font-black font-mono text-indigo-700">{calculatedScore}分</span>
              <span
                className={`px-2 py-0.5 text-xs font-black border ${
                  calculatedGrade === 'A'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : calculatedGrade === 'B'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : calculatedGrade === 'C'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                {calculatedGrade} 级
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-600 font-medium block">受检特许加盟商:</label>
              <select
                value={newFranId}
                onChange={(e) => setNewFranId(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 rounded-none cursor-pointer"
              >
                <option value="FRAN-SH-001">静安卓越分部 (FRAN-SH-001)</option>
                <option value="FRAN-SH-002">浦东潮玩特许部 (FRAN-SH-002)</option>
                <option value="FRAN-SH-003">徐汇西岸艺术驿站 (FRAN-SH-003)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 font-medium block">受检流动餐车编号:</label>
              <input
                type="text"
                value={newTruckId}
                onChange={(e) => setNewTruckId(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 font-mono text-xs focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium block">巡检督导姓名 / 职务:</label>
              <input
                type="text"
                value={newInspector}
                onChange={(e) => setNewInspector(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 text-xs focus:outline-hidden"
              />
            </div>
          </div>

          {/* Checklist interactive evaluation */}
          <div className="space-y-3 pt-2">
            <h5 className="text-xs font-bold text-slate-800">巡检指标勾选 (未达标项自动核扣对应分值):</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {newChecklist.map((cat, catIdx) => (
                <div key={cat.categoryKey} className="border border-slate-200 p-3 bg-slate-50 space-y-2">
                  <div className="font-bold text-xs text-slate-900 border-b border-slate-200 pb-1 flex justify-between">
                    <span>{cat.categoryName}</span>
                    <span className="font-mono text-slate-500">上限 {cat.maxScore}分</span>
                  </div>

                  <div className="space-y-2">
                    {cat.items.map((item, itemIdx) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleItemPassed(catIdx, itemIdx)}
                        className={`p-2 border text-xs cursor-pointer transition-colors flex items-start gap-2 ${
                          item.passed
                            ? 'bg-white border-slate-200 hover:bg-slate-100/70'
                            : 'bg-rose-50 border-rose-300'
                        }`}
                      >
                        <div className="mt-0.5">
                          {item.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <strong className={item.passed ? 'text-slate-900' : 'text-rose-900'}>
                              {item.title}
                            </strong>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 ${
                                item.passed ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {item.passed ? '符合达标' : `未达标 (-${item.deduction}分)`}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.standard}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-600 font-medium block">主要隐患与整改建议 (按行分隔):</label>
              <textarea
                rows={3}
                value={findingsInput}
                onChange={(e) => setFindingsInput(e.target.value)}
                placeholder="例如: 抽查发现未赋码食材；车载灭火器指针偏临界值，责令3日内整改。"
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 text-xs focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium block">
                违约扣罚履约保证金金额 (元，严重违约或私采时适用):
              </label>
              <input
                type="number"
                value={penaltyInput}
                onChange={(e) => setPenaltyInput(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 font-mono font-bold text-rose-700 text-xs focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                若输入扣罚金额，系统将在提交后自动在加盟商履约保证金账本中扣减对应款项并记录留痕。
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubTab('cards')}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs"
            >
              确认发布巡检评分卡
            </button>
          </div>
        </form>
      )}

      {/* SUBVIEW 3: Deposit Transaction Records */}
      {activeSubTab === 'deposit' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">流水记录号</th>
                  <th className="py-2.5 px-3">加盟商分舵</th>
                  <th className="py-2.5 px-3">业务变动类型</th>
                  <th className="py-2.5 px-3 text-right">变动金额</th>
                  <th className="py-2.5 px-3 text-right">变动后可用余额</th>
                  <th className="py-2.5 px-3">业务事由与说明</th>
                  <th className="py-2.5 px-3">操作人</th>
                  <th className="py-2.5 px-3">记录时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {depositRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{rec.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{rec.franchiseeName}</td>
                    <td className="py-2.5 px-3">
                      {rec.type === 'initial_deposit' && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold">
                          初始签约缴纳
                        </span>
                      )}
                      {rec.type === 'penalty_deduction' && (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold">
                          巡检违规扣款
                        </span>
                      )}
                      {rec.type === 'replenishment' && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          加盟商自主补缴
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        rec.type === 'penalty_deduction' ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {rec.type === 'penalty_deduction' ? '-' : '+'}¥{rec.amount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-700">
                      ¥{rec.balanceAfter.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{rec.reason}</td>
                    <td className="py-2.5 px-3 text-slate-500">{rec.operator}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{rec.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rectification Modal */}
      {rectifyModalCard && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-amber-300 w-full max-w-md p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>限期整改单闭环复核</span>
              </div>
              <button
                type="button"
                onClick={() => setRectifyModalCard(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              巡检单号: <strong className="font-mono">{rectifyModalCard.inspectionNo}</strong> ·{' '}
              {rectifyModalCard.franchiseeName}
            </p>

            <div>
              <label className="text-xs text-slate-700 font-medium block">
                {context.isHqUser ? '督导复检核验说明:' : '加盟商整改措施与附件说明:'}
              </label>
              <textarea
                rows={3}
                value={rectifyNotesInput}
                onChange={(e) => setRectifyNotesInput(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 text-xs focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleConfirmRectification(false)}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs cursor-pointer"
              >
                驳回或标记超时
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRectification(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                复检通过并闭环
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Replenish Modal */}
      {isReplenishModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-300 w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>补缴充值履约保证金</span>
              </div>
              <button
                type="button"
                onClick={() => setIsReplenishModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-600 block">充值加盟分舵:</label>
              <span className="font-bold text-xs text-slate-900 mt-1 block">
                {selectedFranchiseeId === 'all'
                  ? '浦东潮玩特许部 (FRAN-SH-002)'
                  : selectedFranchiseeId}
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-600 block">补缴金额 (元):</label>
              <input
                type="number"
                value={replenishAmount}
                onChange={(e) => setReplenishAmount(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 font-mono font-bold text-base text-emerald-700"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReplenishModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleReplenishDeposit}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
              >
                确认充值款项
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
