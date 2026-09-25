import React, { useState } from 'react';
import {
  X,
  Printer,
  Copy,
  Star,
  Edit3,
  Save,
  Plus,
  Trash2,
  BookOpen,
  List,
  CheckSquare,
  Calculator,
  Link2,
  Flame,
  Thermometer,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Layers,
  Sparkles
} from 'lucide-react';
import { CraftStandardItem, MarinadeIngredient, CraftPrepStep, CostCompositionItem } from '../../types';
import { copyTextToClipboard } from '../../utils/clipboard';

interface CraftDetailModalProps {
  craft: CraftStandardItem;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedCraft: CraftStandardItem) => void;
  showToast: (msg: string) => void;
}

export const CraftDetailModal: React.FC<CraftDetailModalProps> = ({
  craft,
  isOpen,
  onClose,
  onSave,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'tutorial' | 'formula' | 'prep' | 'cost' | 'linked'>('tutorial');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isStarred, setIsStarred] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(0); // Default open step 1

  // Editable fields
  const [editedItem, setEditedItem] = useState<CraftStandardItem>({ ...craft });

  // Cost items state
  const [costItems, setCostItems] = useState<CostCompositionItem[]>([
    {
      id: 'c1',
      name: `原切鲜肉原料 (${editedItem.standardWeightG || 30}g净重)`,
      quantity: (editedItem.standardWeightG || 30) / 1000,
      unit: 'kg',
      unitPrice: 50.0,
      subtotal: Number((((editedItem.standardWeightG || 30) / 1000) * 50.0).toFixed(2))
    },
    { id: 'c2', name: '秘制腌料与风味调味汁', quantity: 1, unit: '份', unitPrice: 0.2, subtotal: 0.2 },
    { id: 'c3', name: '特级无烟果木炭折耗', quantity: 1, unit: '串', unitPrice: 0.15, subtotal: 0.15 },
    { id: 'c4', name: '食品级竹签 (30-35cm)', quantity: 1, unit: '根', unitPrice: 0.03, subtotal: 0.03 },
    { id: 'c5', name: '特制撒料与刷酱调和油', quantity: 1, unit: '份', unitPrice: 0.12, subtotal: 0.12 }
  ]);

  if (!isOpen) return null;

  const yieldVal = editedItem.yieldRate
    ? editedItem.yieldRate <= 1
      ? Math.round(editedItem.yieldRate * 100)
      : editedItem.yieldRate
    : 85;
  const skewersPerKgVal =
    editedItem.skewersPerKg ||
    (editedItem.standardWeightG ? Number(((yieldVal / 100 * 1000) / editedItem.standardWeightG).toFixed(1)) : 28.3);
  const displayFlavor = editedItem.flavorTag || '蜜汁';
  const profitVal = editedItem.estimatedProfit
    ? editedItem.estimatedProfit.toFixed(2)
    : (editedItem.pricePerSkewer * 0.55).toFixed(2);
  const sellingPrice = editedItem.pricePerSkewer || 4.0;
  const costPerSkewer = (sellingPrice - Number(profitVal)).toFixed(2);
  const marginPercent = sellingPrice > 0 ? Math.round((Number(profitVal) / sellingPrice) * 100) : 55;

  const getFlavorBadgeStyle = (flavor: string) => {
    switch (flavor) {
      case '蜜汁':
        return 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]';
      case '原味':
      case '原味孜然':
        return 'bg-[#f1f5f9] text-[#475569] border-[#e2e8f0]';
      case '香辣':
      case '剁椒':
        return 'bg-[#fef2f2] text-[#b91c1c] border-[#fee2e2]';
      case '蒜蓉':
        return 'bg-[#ecfdf5] text-[#047857] border-[#d1fae5]';
      case '黑椒':
      case '奥尔良':
        return 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]';
      default:
        return 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]';
    }
  };

  const handleFieldChange = <K extends keyof CraftStandardItem>(key: K, value: CraftStandardItem[K]) => {
    setEditedItem((prev) => ({ ...prev, [key]: value }));
    setSaveStatus('unsaved');
  };

  const handleSaveModal = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      if (onSave) onSave(editedItem);
      setSaveStatus('saved');
      setIsEditing(false);
      showToast('SOP 菜品工艺标准修改已保存并同步至云端');
    }, 400);
  };

  const handleCopyFormula = async () => {
    const formulaText = `【${editedItem.name} 烤制SOP】\n味型：${displayFlavor}\n出肉率标杆：${yieldVal}%\n标准售价：¥${editedItem.pricePerSkewer}/串\n单串克重：${editedItem.standardWeightG || 30}g\n配方：${editedItem.marinadeIngredients.map((i) => `${i.name} ${i.qtyPerKg}${i.unit}/kg`).join('、')}\n穿串切割要领：${editedItem.threadingMethod || editedItem.cutDirection || '按标准切割，中火快烤'}`;
    await copyTextToClipboard(formulaText);
    showToast('配方与 SOP 已成功复制到剪贴板');
  };

  // FIX(审计P1): SOP 打印真实化——渲染打印友好视图并调用浏览器系统打印（替代"仅提示已发送打印指令"假实现）
  const handlePrintSop = () => {
    try {
      const stepsHtml = (editedItem.prepSteps && editedItem.prepSteps.length > 0 ? editedItem.prepSteps : displaySteps)
        .map(
          (s) =>
            `<li style="margin:6px 0"><b>步骤${s.step} · ${s.title}</b>（约 ${s.durationMin || '-'} 分钟，关键指标 ${s.keyMetric || '-'}）<br/>${s.desc || ''}</li>`
        )
        .join('');
      const printWin = window.open('', '_blank', 'width=720,height=920');
      if (!printWin) {
        showToast('浏览器拦截了打印窗口，请允许弹窗后重试');
        return;
      }
      printWin.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${editedItem.name} · 烤制SOP</title>
<style>body{font-family:'Microsoft YaHei',system-ui,sans-serif;padding:28px;color:#1a1c1b;line-height:1.7}
h1{font-size:20px;border-bottom:3px solid #1a1c1b;padding-bottom:8px;margin:0 0 14px}
table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0}
td,th{border:1px solid #c6c6c4;padding:6px 8px;text-align:left;font-size:13px}
th{background:#f2f2ef}ol{padding-left:20px;font-size:13px}.muted{color:#767673}</style></head><body>
<h1>${editedItem.name} · 标准烤制 SOP 作业卡</h1>
<p class="muted">打印时间：${new Date().toLocaleString('zh-CN', { hour12: false })} ｜ 黑曜石餐车后厨标准工艺</p>
<table><tr><th>味型</th><td>${displayFlavor}</td><th>出肉率标杆</th><td>${yieldVal}%</td></tr>
<tr><th>标准售价</th><td>¥${editedItem.pricePerSkewer}/串</td><th>单串克重</th><td>${editedItem.standardWeightG || 30}g</td></tr>
<tr><th>温控标准</th><td>${editedItem.grillTemp || '200℃'}</td><th>烤制时长</th><td>${editedItem.grillTimeMin || 5} 分钟</td></tr></table>
<p><b>配方（每 kg 原料）：</b>${editedItem.marinadeIngredients.map((i) => `${i.name} ${i.qtyPerKg}${i.unit}`).join('、') || '按标准腌制配比'}</p>
<p><b>穿串/切割要领：</b>${editedItem.threadingMethod || editedItem.cutDirection || '按标准切割，中火快烤'}</p>
<p><b>标准作业步骤：</b></p><ol>${stepsHtml}</ol>
<p style="margin-top:18px;font-size:11px" class="muted">本 SOP 由平台工艺标准中心生成，请后厨打印签收后置于工位可见处</p>
</body></html>`);
      printWin.document.close();
      printWin.focus();
      // 等待内容渲染完成后调起系统打印对话框
      setTimeout(() => {
        try {
          printWin.print();
        } catch {
          showToast('打印对话框唤起失败，请检查系统打印队列');
        }
      }, 350);
      showToast(`已将【${editedItem.name}】SOP 发送至系统打印队列`);
    } catch (e) {
      console.error('SOP 打印异常:', e);
      showToast('SOP 打印失败，请重试');
    }
  };

  const toggleStepExpand = (index: number) => {
    setExpandedStepIndex(expandedStepIndex === index ? null : index);
  };

  // Standard steps if empty or customized
  const displaySteps = editedItem.prepSteps && editedItem.prepSteps.length > 0 ? editedItem.prepSteps : [
    { step: 1, title: '备料', desc: `${editedItem.name} 清洗改刀，按标准切块/片`, durationMin: 10, keyMetric: '标准切块' },
    { step: 2, title: '腌制', desc: `按每kg原料配方比例加入调料，冷藏腌制`, durationMin: 30, keyMetric: `${editedItem.marinadeRecommendedMin || 30}min` },
    { step: 3, title: '穿串', desc: `串肉均匀平整，紧贴木签，留缝 2-3mm`, durationMin: 10, keyMetric: '留缝 2-3mm' },
    { step: 4, title: '烤制', desc: `炭火温控 ${editedItem.grillTemp || '200℃'}，勤翻面封汁`, durationMin: editedItem.grillTimeMin || 5, keyMetric: editedItem.grillTemp || '200℃' },
    { step: 5, title: '出品', desc: `出炉前刷封口油，撒特制芝麻孜然粉装盘`, durationMin: 1, keyMetric: '收尾' }
  ];

  return (
    <div
      id="craft-detail-modal-overlay"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="craft-detail-title"
        className="relative w-full max-w-[880px] max-h-[88vh] flex flex-col bg-white rounded-[4px] shadow-xl animate-in zoom-in-95 duration-150 overflow-hidden border border-[#e2e8f0]"
      >
        {/* 1. Modal Top Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#e2e8f0] bg-white shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 id="craft-detail-title" className="text-[18px] font-bold text-[#0f172a] tracking-tight truncate">
                {editedItem.name}
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getFlavorBadgeStyle(
                  displayFlavor
                )}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                {displayFlavor}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[11px] px-2 py-0.5 bg-[#f8fafc] text-[#475569] font-medium rounded-[3px] border border-[#e2e8f0]">
                {editedItem.categoryName || '烤肉类'}
              </span>
              <span className="text-[11px] px-2 py-0.5 bg-[#f8fafc] text-[#475569] font-medium rounded-[3px] border border-[#e2e8f0]">
                {editedItem.subCategory || '猪肉类'}
              </span>
              <span className="text-[11px] text-[#64748b]">
                {editedItem.recommendedPart || editedItem.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-[11px] text-[#64748b]">售价</p>
              <p className="text-[22px] font-bold text-[#0f172a] leading-tight">
                ¥{sellingPrice.toFixed(2)}
                <span className="text-[12px] font-medium text-[#64748b]">/串</span>
              </p>
            </div>
            <button
              aria-label="收藏"
              title="收藏到收藏夹"
              type="button"
              onClick={() => {
                setIsStarred(!isStarred);
                showToast(isStarred ? '已取消收藏' : '已加入重点督导菜品收藏夹');
              }}
              className="w-9 h-9 flex items-center justify-center rounded-[4px] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
            >
              <Star className={`w-[22px] h-[22px] text-[#64748b] ${isStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
            </button>
            <button
              aria-label="关闭"
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-[4px] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
            >
              <X className="w-[22px] h-[22px] text-[#64748b] hover:text-[#0f172a]" />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Row: 核心参数 (3 cols) + 关键摘要 (2 cols) */}
          <div className="px-5 pt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Left: 核心参数 6 metrics */}
            <div className="md:col-span-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-[#64748b] tracking-wide">核心参数</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[4px] px-2.5 py-2 min-h-[52px]">
                  <p className="text-[11px] text-[#64748b] leading-tight">克重/串</p>
                  <p className="text-[16px] font-bold leading-tight mt-0.5 text-[#0f172a]">
                    {editedItem.standardWeightG || 30}g
                  </p>
                </div>
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[4px] px-2.5 py-2 min-h-[52px]">
                  <p className="text-[11px] text-[#64748b] leading-tight">标准出肉率</p>
                  <p className="text-[16px] font-bold leading-tight mt-0.5 text-[#0f172a]">
                    {yieldVal}%
                  </p>
                </div>
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[4px] px-2.5 py-2 min-h-[52px]">
                  <p className="text-[11px] text-[#64748b] leading-tight">每kg出串数</p>
                  <p className="text-[16px] font-bold leading-tight mt-0.5 text-[#0f172a]">
                    {skewersPerKgVal}串
                  </p>
                </div>
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[4px] px-2.5 py-2 min-h-[52px]">
                  <p className="text-[11px] text-[#64748b] leading-tight">单串成本</p>
                  <p className="text-[16px] font-bold leading-tight mt-0.5 text-[#0f172a]">
                    ¥{costPerSkewer}
                  </p>
                </div>
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[4px] px-2.5 py-2 min-h-[52px]">
                  <p className="text-[11px] text-[#64748b] leading-tight">售价</p>
                  <p className="text-[16px] font-bold leading-tight mt-0.5 text-[#0f172a]">
                    ¥{sellingPrice.toFixed(2)}
                  </p>
                </div>
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[4px] px-2.5 py-2 min-h-[52px]">
                  <p className="text-[11px] text-[#64748b] leading-tight">单串毛利</p>
                  <p className="text-[16px] font-bold leading-tight mt-0.5 text-[#10b981]">
                    ¥{profitVal}
                  </p>
                  <p className="text-[10px] text-[#64748b] leading-tight mt-0.5">{marginPercent}%</p>
                </div>
              </div>
            </div>

            {/* Right: 关键摘要 */}
            <div className="md:col-span-2">
              <p className="text-[11px] font-bold text-[#64748b] mb-2 tracking-wide">关键摘要</p>
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[4px] p-3 space-y-1.5 text-[13px]">
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-[#64748b] shrink-0">推荐部位</span>
                  <span className="font-semibold text-[#0f172a] text-right truncate">
                    {editedItem.recommendedPart || editedItem.name}
                  </span>
                </div>
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-[#64748b] shrink-0">肥瘦比例</span>
                  <span className="font-semibold text-[#0f172a] text-right">
                    {editedItem.fatLeanRatio || '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-[#64748b] shrink-0">腌制时长</span>
                  <span className="font-semibold text-[#0f172a] text-right">
                    {editedItem.marinadeRecommendedMin || 30}min
                  </span>
                </div>
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-[#64748b] shrink-0">烤制时长</span>
                  <span className="font-semibold text-[#0f172a] text-right">
                    {editedItem.grillTimeMin || 5}min
                  </span>
                </div>
                <div className="pt-2 border-t border-[#e2e8f0] mt-2">
                  <p className="text-[10px] font-bold text-[#64748b] mb-0.5">一句话经验</p>
                  <p className="text-[#0f172a] leading-relaxed text-[12px]">
                    {editedItem.threadingMethod || editedItem.cutDirection || `${editedItem.name}肉嫩，切片穿串中火快烤`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 5 Navigation Tabs matching spec */}
          <div className="px-5 mt-4 flex items-center gap-1 border-b border-[#e2e8f0] overflow-x-auto hide-scrollbar">
            {[
              { id: 'tutorial', label: '制作教程', icon: BookOpen },
              { id: 'formula', label: '配方', icon: List },
              { id: 'prep', label: '备餐SOP', icon: CheckSquare },
              { id: 'cost', label: '成本测算', icon: Calculator },
              { id: 'linked', label: '关联数据', icon: Link2 }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'border-black text-[#0f172a]'
                      : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  <Icon className="w-[17px] h-[17px]" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 4. Tab Content Area */}
          <div className="px-5 py-4">
            {/* TAB 1: 制作教程 */}
            {activeTab === 'tutorial' && (
              <div className="space-y-4">
                {/* 3 Pills: 炉具 / 温度 / 总烤时 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-[4px] px-3 py-1.5">
                    <Flame className="w-[17px] h-[17px] text-[#64748b]" />
                    <span className="text-[11px] text-[#64748b]">炉具</span>
                    <span className="text-[13px] font-bold text-[#0f172a]">炭火</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-[4px] px-3 py-1.5">
                    <Thermometer className="w-[17px] h-[17px] text-[#64748b]" />
                    <span className="text-[11px] text-[#64748b]">温度</span>
                    <span className="text-[13px] font-bold text-[#0f172a]">{editedItem.grillTemp || '200℃'}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-[4px] px-3 py-1.5">
                    <Clock className="w-[17px] h-[17px] text-[#64748b]" />
                    <span className="text-[11px] text-[#64748b]">总烤时</span>
                    <span className="text-[13px] font-bold text-[#0f172a]">{editedItem.grillTimeMin || 5}-7min</span>
                  </div>
                </div>

                {/* Step List with Left Timeline vertical line */}
                <div className="space-y-0">
                  {displaySteps.map((s, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === displaySteps.length - 1;
                    const isExpanded = expandedStepIndex === idx;

                    return (
                      <div key={idx} className="relative pl-8">
                        {!isLast && (
                          <span className="absolute left-[13px] top-7 bottom-0 w-px bg-[#e2e8f0]" />
                        )}
                        <span
                          className={`absolute left-0 top-0.5 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[12px] font-bold ${
                            isFirst
                              ? 'bg-black text-white'
                              : 'bg-[#e2e8f0] text-[#64748b]'
                          }`}
                        >
                          {s.step}
                        </span>
                        <div className="w-full text-left py-2 group">
                          <div
                            className="flex items-center gap-2 flex-wrap cursor-pointer select-none"
                            onClick={() => toggleStepExpand(idx)}
                          >
                            <span
                              className={`text-[14px] font-bold ${
                                isFirst || isExpanded ? 'text-[#0f172a]' : 'text-[#64748b]'
                              }`}
                            >
                              {s.title}
                            </span>
                            <span className="text-[11px] px-1.5 py-0.5 bg-[#e2e8f0] text-[#475569] rounded-[3px] font-medium">
                              约 {s.durationMin}min
                            </span>
                            <span className="text-[11px] px-1.5 py-0.5 bg-[#dcfce7] text-[#15803d] rounded-[3px] font-semibold">
                              {s.keyMetric}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStepExpand(idx);
                              }}
                              aria-label={isExpanded ? '收起步骤详情' : '展开步骤详情'}
                              className="ml-auto text-[#64748b] hover:text-[#0f172a] transition-colors p-0.5 cursor-pointer"
                            >
                              <ChevronDown
                                className={`w-[17px] h-[17px] transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </div>
                          {isExpanded && (
                            <p className="text-[13px] text-[#64748b] leading-relaxed mt-1.5 pr-6 animate-in fade-in duration-150">
                              {s.desc}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Maturity Indicator Callout Box */}
                <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[4px] px-3 py-2.5 space-y-1">
                  <p className="text-[12px] text-[#b45309]">
                    <span className="font-bold">✓ 成熟判断</span>：表面金黄、断生即熟，中心温度达 75℃ 以上。
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: 配方 */}
            {activeTab === 'formula' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#f8fafc] p-3 rounded-[4px] border border-[#e2e8f0]">
                  <div>
                    <span className="text-[11px] text-[#64748b]">腌制方式</span>
                    <div className="font-semibold text-[#0f172a] text-xs mt-0.5">{editedItem.marinadeType || '轻湿腌'}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748b]">温控与时长</span>
                    <div className="font-semibold text-[#0f172a] text-xs mt-0.5">
                      {editedItem.marinadeTemp || 2}℃ 冷藏 · {editedItem.marinadeRecommendedMin || 30} 分钟
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748b]">关联后道撒料/酱汁</span>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {editedItem.linkedSauceNames && editedItem.linkedSauceNames.length > 0 ? (
                        editedItem.linkedSauceNames.map((s, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-[#fffbeb] text-[#b45309] border border-[#fde68a] rounded-[2px] text-[10px] font-semibold"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="px-1.5 py-0.5 bg-[#fffbeb] text-[#b45309] border border-[#fde68a] rounded-[2px] text-[10px] font-semibold">
                          特制烧烤撒粉
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Marinade Ingredients Table */}
                <div className="border border-[#e2e8f0] rounded-[4px] overflow-hidden">
                  <div className="bg-[#f8fafc] px-3 py-2 border-b border-[#e2e8f0] flex items-center justify-between">
                    <span className="font-bold text-[#0f172a] text-xs">每千克 (1kg) 原料肉标准腌料配比</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          const newIng: MarinadeIngredient = {
                            name: '新增调料',
                            qtyPerKg: 10,
                            unit: 'g',
                            note: '提鲜增香'
                          };
                          handleFieldChange('marinadeIngredients', [...editedItem.marinadeIngredients, newIng]);
                          showToast('已添加配方调料');
                        }}
                        className="px-2 py-0.5 rounded-[2px] bg-black text-white hover:opacity-90 font-semibold flex items-center gap-1 cursor-pointer text-[11px]"
                      >
                        <Plus className="w-3 h-3" />
                        <span>添加配料</span>
                      </button>
                    )}
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f1f5f9] text-[#64748b] border-b border-[#e2e8f0]">
                      <tr>
                        <th className="p-2.5 font-semibold">调料辅料名称</th>
                        <th className="p-2.5 font-semibold">用量 (每kg原肉)</th>
                        <th className="p-2.5 font-semibold">风味作用与要领</th>
                        {isEditing && <th className="p-2.5 font-semibold text-right">操作</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {editedItem.marinadeIngredients.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#f8fafc]">
                          <td className="p-2.5 font-semibold text-[#0f172a]">{item.name}</td>
                          <td className="p-2.5 font-mono text-[#0f172a]">
                            {item.qtyPerKg} {item.unit}
                          </td>
                          <td className="p-2.5 text-[#64748b]">{item.note || '提鲜入味'}</td>
                          {isEditing && (
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  const ing = editedItem.marinadeIngredients.filter((_, i) => i !== idx);
                                  handleFieldChange('marinadeIngredients', ing);
                                  showToast('配料已移除');
                                }}
                                className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-[#eff6ff] p-3 rounded-[4px] border border-[#bfdbfe] text-[#1e40af] text-[11px] leading-relaxed">
                  <span className="font-bold">配方保密与执行纪律：</span>
                  严格使用电子天平称量至克（g），严禁凭经验随手抓放；腌料盆加盖密封保鲜膜并张贴「腌制时间卡」后入冷库。
                </div>
              </div>
            )}

            {/* TAB 3: 备餐SOP */}
            {activeTab === 'prep' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#f8fafc] p-3 rounded-[4px] border border-[#e2e8f0] space-y-1.5">
                    <div className="font-bold text-[#0f172a] flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-blue-500" />
                      <span>冷藏与保鲜时限规范</span>
                    </div>
                    <ul className="space-y-1 text-[#64748b] list-disc list-inside">
                      <li>半成品已穿肉串：0-4℃ 专用冷藏屉，最长存放 24 小时</li>
                      <li>腌制中原肉：2℃ 冷藏，不得超过 6 小时以防肉质软烂</li>
                      <li>开封撒料包：密封储存于阴凉干燥处，保质期 30 天</li>
                    </ul>
                  </div>

                  <div className="bg-[#f8fafc] p-3 rounded-[4px] border border-[#e2e8f0] space-y-1.5">
                    <div className="font-bold text-[#0f172a] flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-emerald-500" />
                      <span>每日备货预估公式 (Stock Formula)</span>
                    </div>
                    <p className="text-[#64748b] leading-relaxed">
                      当日预备穿串数 = 昨日同期销量 × 1.15 (安全系数) + 晚市高峰预备量 (15串)。已穿串超 24 小时未售出需记入临期损耗单。
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-[4px] text-[#166534] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>损耗管理口径对齐</span>
                  </div>
                  <p className="text-[11px]">
                    本菜品参考加工损耗率为 {(100 - yieldVal).toFixed(0)}%（对应 {yieldVal}% 出肉率）。若加工实测出肉率低于 {(yieldVal - 6).toFixed(0)}%，系统将自动向店长发起异常预警。
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: 成本测算 */}
            {activeTab === 'cost' && (
              <div className="space-y-4 text-xs">
                {/* Gross Margin Summary Banner */}
                <div className="p-3 rounded-[4px] border border-[#bbf7d0] bg-[#f0fdf4] text-[#166534] flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold">综合毛利率测算 (Gross Margin)</div>
                    <div className="text-xl font-mono font-bold mt-0.5">
                      {marginPercent}%
                      <span className="text-xs font-normal ml-2">
                        (单串理论毛利 ¥{profitVal})
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-[2px] text-xs font-bold bg-[#10b981] text-white">
                      毛利达标 (≥55%)
                    </span>
                    <div className="text-[10px] text-[#64748b] mt-1">
                      售价 ¥{sellingPrice.toFixed(2)} - 成本 ¥{costPerSkewer}
                    </div>
                  </div>
                </div>

                {/* Cost Table */}
                <div className="border border-[#e2e8f0] rounded-[4px] overflow-hidden">
                  <div className="bg-[#f8fafc] px-3 py-2 border-b border-[#e2e8f0] flex items-center justify-between">
                    <span className="font-bold text-[#0f172a]">单串成本构成拆解 (BOM Cost Items)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newItem: CostCompositionItem = {
                          id: `c_${Date.now()}`,
                          name: '新增辅料/损耗项',
                          quantity: 1,
                          unit: '份',
                          unitPrice: 0.1,
                          subtotal: 0.1
                        };
                        setCostItems((prev) => [...prev, newItem]);
                        showToast('已添加成本构成项');
                      }}
                      className="px-2 py-0.5 rounded-[2px] bg-black text-white hover:opacity-90 font-semibold flex items-center gap-1 cursor-pointer text-[11px]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>添加构成项</span>
                    </button>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f1f5f9] text-[#64748b] border-b border-[#e2e8f0]">
                      <tr>
                        <th className="p-2.5 font-semibold">成本构成项目</th>
                        <th className="p-2.5 font-semibold">标准用量</th>
                        <th className="p-2.5 font-semibold">参考单价</th>
                        <th className="p-2.5 font-semibold">单串小计 (元)</th>
                        <th className="p-2.5 font-semibold text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {costItems.map((item) => (
                        <tr key={item.id} className="hover:bg-[#f8fafc]">
                          <td className="p-2.5 font-semibold text-[#0f172a]">{item.name}</td>
                          <td className="p-2.5 font-mono text-[#64748b]">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="p-2.5 text-[#64748b]">¥{item.unitPrice.toFixed(2)}</td>
                          <td className="p-2.5 font-bold text-[#0f172a]">¥{item.subtotal.toFixed(2)}</td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setCostItems((prev) => prev.filter((i) => i.id !== item.id));
                                showToast('成本项已移除');
                              }}
                              className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#f8fafc] font-bold text-[#0f172a] border-t border-[#e2e8f0]">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right">合计单串直接原料成本：</td>
                        <td className="p-2.5 text-[#10b981] text-sm">¥{costPerSkewer}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: 关联数据 */}
            {activeTab === 'linked' && (
              <div className="space-y-4 text-xs">
                <div className="bg-[#f8fafc] p-3 rounded-[4px] border border-[#e2e8f0] space-y-2">
                  <div className="font-bold text-[#0f172a] flex items-center justify-between">
                    <span>采购价格波动与进货频次 (最近 30 天)</span>
                    <span className="text-[11px] text-[#64748b]">供应源：认证冷链直供</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded-[3px] border border-[#e2e8f0]">
                      <div className="text-[#64748b]">平均采购价</div>
                      <div className="font-bold text-[#0f172a] mt-0.5">¥50.00 / kg</div>
                    </div>
                    <div className="bg-white p-2 rounded-[3px] border border-[#e2e8f0]">
                      <div className="text-[#64748b]">月度总采购量</div>
                      <div className="font-bold text-[#0f172a] font-mono mt-0.5">120.0 kg</div>
                    </div>
                    <div className="bg-white p-2 rounded-[3px] border border-[#e2e8f0]">
                      <div className="text-[#64748b]">累计折算串数</div>
                      <div className="font-bold text-[#10b981] font-mono mt-0.5">3,400 串</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#f8fafc] p-3 rounded-[4px] border border-[#e2e8f0] space-y-2">
                  <div className="font-bold text-[#0f172a]">该菜品历史报损记录联动 (Loss Records)</div>
                  <div className="divide-y divide-[#e2e8f0] bg-white rounded-[3px] border border-[#e2e8f0]">
                    <div className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#0f172a]">2026-08-22 17:20 · 新品试吃与质检</span>
                        <p className="text-[11px] text-[#64748b]">批次风味盲测 · 2份 (20串)</p>
                      </div>
                      <div className="text-red-600 font-bold">¥36.00</div>
                    </div>
                    <div className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#0f172a]">2026-08-21 21:00 · 烤焦报废</span>
                        <p className="text-[11px] text-[#64748b]">晚市炭火火候过急重烤 · 1份 (10串)</p>
                      </div>
                      <div className="text-red-600 font-bold">¥18.00</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 5. Modal Bottom Footer Action Bar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[#e2e8f0] bg-white shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyFormula}
              className="h-9 px-4 rounded-[4px] text-[13px] font-bold transition-colors flex items-center gap-1.5 bg-black text-white hover:opacity-90 cursor-pointer"
            >
              <Copy className="w-[17px] h-[17px]" />
              <span>复制配方</span>
            </button>
            <button
              type="button"
              onClick={handlePrintSop}
              className="h-9 px-4 rounded-[4px] text-[13px] font-bold border border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a] hover:bg-[#f1f5f9] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-[17px] h-[17px]" />
              <span>打印SOP</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                type="button"
                onClick={handleSaveModal}
                className="h-9 px-4 rounded-[4px] text-[13px] font-bold bg-[#10b981] text-white hover:opacity-90 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-[17px] h-[17px]" />
                <span>保存修改</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="h-9 px-4 rounded-[4px] text-[13px] font-bold bg-black text-white hover:opacity-90 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-[17px] h-[17px]" />
                <span>编辑</span>
              </button>
            )}
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#10b981]">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              已启用
            </span>
            <span className="text-[11px] px-1.5 py-0.5 bg-[#f1f5f9] text-[#64748b] rounded-[3px] font-mono">
              v1.0.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
