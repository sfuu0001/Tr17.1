import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Sparkles,
  Download,
  Upload,
  Search,
  CheckSquare,
  Square,
  ShieldCheck,
  Thermometer,
  Calendar,
  Building2,
  Package,
  PackageCheck,
  Plus,
  ArrowDownToLine,
  RotateCcw,
  CheckCircle2,
  Tag,
  Info
} from 'lucide-react';
import {
  STANDARD_MATERIAL_TEMPLATES,
  MaterialTemplate,
  MATERIAL_TEMPLATE_CATEGORIES,
  exportMaterialTemplatesJson,
  parseMaterialTemplatesJson,
  instantiateMaterialFromTemplate
} from '../../../data/materialTemplates';
import { MaterialItem } from '../../../types';

interface MaterialTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingMaterials: MaterialItem[];
  onApplyTemplate: (template: MaterialTemplate) => void;
  onApplyAndStockIn?: (template: MaterialTemplate) => void;
  onBatchApplyTemplates: (templates: MaterialTemplate[]) => void;
  showToast: (msg: string) => void;
}

export const MaterialTemplateModal: React.FC<MaterialTemplateModalProps> = ({
  isOpen,
  onClose,
  existingMaterials,
  onApplyTemplate,
  onApplyAndStockIn,
  onBatchApplyTemplates,
  showToast
}) => {
  const [templateList, setTemplateList] = useState<MaterialTemplate[]>(STANDARD_MATERIAL_TEMPLATES);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templateList.filter((tpl) => {
      const matchCat = selectedCategory === '全部' || tpl.category === selectedCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.templateCode.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.supplier.toLowerCase().includes(q) ||
        tpl.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [templateList, selectedCategory, searchQuery]);

  // Existing names set for quick indicator
  const existingNamesSet = useMemo(() => {
    return new Set(existingMaterials.map((m) => m.name.trim()));
  }, [existingMaterials]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTemplateIds.size === filteredTemplates.length) {
      setSelectedTemplateIds(new Set());
    } else {
      setSelectedTemplateIds(new Set(filteredTemplates.map((t) => t.templateId)));
    }
  };

  // Export JSON file
  const handleExportTemplates = () => {
    try {
      const jsonContent = exportMaterialTemplatesJson(templateList);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `material-archive-templates-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`已成功导出 ${templateList.length} 项原料标准模板为 JSON 文件！`);
    } catch (err: any) {
      showToast(`导出失败: ${err.message || '未知错误'}`);
    }
  };

  // Import JSON file
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const res = parseMaterialTemplatesJson(text);
        if (res.success && res.templates) {
          // Merge imported templates
          const newMap = new Map<string, MaterialTemplate>();
          templateList.forEach((t) => newMap.set(t.name, t));
          res.templates.forEach((t) => newMap.set(t.name, t));
          const merged = Array.from(newMap.values());
          setTemplateList(merged);
          showToast(`成功解析并导入 ${res.templates.length} 项原料模板！现有模板总数：${merged.length}`);
        } else {
          showToast(`模板导入失败: ${res.error || '文件规范不符'}`);
        }
      } catch (err: any) {
        showToast(`读取失败: ${err.message || '格式错误'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Batch apply selected
  const handleConfirmBatchApply = () => {
    if (selectedTemplateIds.size === 0) {
      showToast('请先勾选需要调用的原料模板！');
      return;
    }
    const selected = templateList.filter((t) => selectedTemplateIds.has(t.templateId));
    onBatchApplyTemplates(selected);
    setSelectedTemplateIds(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-lg border border-[#cbd5e1] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#e2e8f0] bg-linear-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <h2 className="text-base sm:text-lg font-bold">原料档案与安全库存 · 标准模板库</h2>
              <span className="px-2 py-0.5 rounded-[3px] bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-mono">
                标准模版 ({templateList.length}项)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              提供标准的安全库存、储藏温区、起订量、保质期与出品率参数。调用后实际在库默认为 0，由商家手动上架入库。
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar (Category pills + Search + Import/Export) */}
        <div className="p-3.5 sm:p-4 bg-[#f8fafc] border-b border-[#e2e8f0] space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Category scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
              {MATERIAL_TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-[3px] text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#0f172a] text-white shadow-xs'
                      : 'bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Action buttons (Export / Import) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportTemplates}
                className="px-2.5 py-1.5 bg-white border border-[#cbd5e1] hover:bg-[#f1f5f9] text-[#334155] rounded-[3px] text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                title="将当前模板全量导出为JSON文件"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>导出模板文件</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-white border border-[#cbd5e1] hover:bg-[#f1f5f9] text-[#334155] rounded-[3px] text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                title="导入外部JSON格式原料模板"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>导入模板</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Search bar & Selection status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索模板名称 / 编码 / 标签 / 推荐直供商..."
                className="w-full bg-white border border-[#cbd5e1] rounded-[3px] pl-8 pr-3 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 bg-white border border-[#cbd5e1] text-[#475569] rounded-[3px] text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                {selectedTemplateIds.size === filteredTemplates.length && filteredTemplates.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>全选当前 ({filteredTemplates.length})</span>
              </button>

              {selectedTemplateIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmBatchApply}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-[3px] text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>一键调用已选 ({selectedTemplateIds.size}) 项</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Templates List (Cards Grid) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#f1f5f9] space-y-3">
          {filteredTemplates.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-lg border border-dashed border-[#cbd5e1]">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-[#334155]">暂无匹配的原料标准模板</div>
              <div className="text-xs text-slate-400 mt-1">
                可尝试调整搜索关键词、分类，或通过上方【导入模板】添加自定义原料
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredTemplates.map((tpl) => {
                const isSelected = selectedTemplateIds.has(tpl.templateId);
                const isAlreadyInActive = existingNamesSet.has(tpl.name.trim());

                return (
                  <div
                    key={tpl.templateId}
                    className={`bg-white rounded-lg border transition-all p-3.5 flex flex-col justify-between shadow-xs ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-500/20'
                        : isAlreadyInActive
                        ? 'border-emerald-200 hover:border-emerald-400'
                        : 'border-[#cbd5e1] hover:border-slate-400'
                    }`}
                  >
                    {/* Top Row: Checkbox, Code, Category, In-Archive Badge */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(tpl.templateId)}
                            className="text-slate-400 hover:text-blue-600 cursor-pointer shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-[2px]">
                            {tpl.templateCode}
                          </span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-[2px] bg-slate-100 text-slate-700">
                            {tpl.category}
                          </span>
                        </div>

                        {isAlreadyInActive ? (
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>在档中</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium shrink-0">
                            在库: 0 (待上架)
                          </span>
                        )}
                      </div>

                      {/* Name & Spec */}
                      <div className="mt-2">
                        <h3 className="text-sm font-bold text-[#0f172a] leading-snug">{tpl.name}</h3>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{tpl.spec}</div>
                      </div>

                      {/* Parameter Matrix (Safety Stock, Shelf Life, Yield, Temp Zone) */}
                      <div className="grid grid-cols-2 gap-2 mt-3 p-2 bg-[#f8fafc] rounded-md border border-[#e2e8f0] text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">推荐安全库存:</span>
                          <span className="font-bold text-slate-800 font-mono">
                            {tpl.safetyStock} {tpl.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">建议补货起订:</span>
                          <span className="font-bold text-blue-700 font-mono">
                            {tpl.reorderSuggestion} {tpl.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">储藏温区:</span>
                          <span className="font-medium text-slate-700 flex items-center gap-0.5">
                            <Thermometer className="w-3 h-3 text-blue-500" />
                            <span>{tpl.storageTempZone}</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">标准出品率:</span>
                          <span className="font-bold text-emerald-700 font-mono">
                            {(tpl.standardYieldRate * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Description / Acceptance */}
                      <p className="text-[11px] text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                        {tpl.description}
                      </p>

                      {/* Supplier & Price */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-dashed border-[#e2e8f0]">
                        <div className="flex items-center gap-1 truncate max-w-[150px]">
                          <Building2 className="w-3 h-3 text-purple-500 shrink-0" />
                          <span className="truncate">{tpl.supplier}</span>
                        </div>
                        <div className="font-mono text-slate-800 shrink-0">
                          指导价: <span className="font-bold text-[#0f172a]">¥{tpl.purchasePrice}</span>/{tpl.unit}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="mt-3 pt-2.5 border-t border-[#f1f5f9] flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-[2px] font-medium">
                        在库归零 · 需手动上架
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onApplyTemplate(tpl);
                            showToast(`已调用模板【${tpl.name}】建立原料档案，当前在库量为 0！`);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[#0f172a] rounded-[2px] text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors active:scale-95 border border-[#cbd5e1]"
                          title="导入档案，当前库存置为 0，等待后续手动上架"
                        >
                          <Plus className="w-3 h-3 text-slate-600" />
                          <span>仅调用档案 (0库存)</span>
                        </button>

                        {onApplyAndStockIn && (
                          <button
                            type="button"
                            onClick={() => {
                              onApplyAndStockIn(tpl);
                              onClose();
                            }}
                            className="px-2.5 py-1 bg-[#0f172a] hover:bg-black text-white rounded-[2px] text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors active:scale-95 shadow-xs"
                            title="导入档案并将库存置为 0，同时立即开启实物验收入库上架窗口"
                          >
                            <PackageCheck className="w-3 h-3 text-amber-400" />
                            <span>调用并立即上架</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              已选择 <strong className="text-slate-800 font-mono">{selectedTemplateIds.size}</strong> 项原料模板
              {existingMaterials.length > 0 && ` · 当前在档原料 ${existingMaterials.length} 种`}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-[#cbd5e1] hover:bg-slate-50 text-slate-700 font-medium rounded-[3px] text-xs cursor-pointer transition-colors"
            >
              关闭
            </button>
            <button
              type="button"
              onClick={handleConfirmBatchApply}
              disabled={selectedTemplateIds.size === 0}
              className={`px-4 py-2 rounded-[3px] text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors ${
                selectedTemplateIds.size > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>导入已选模板 (在库统一置0)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
