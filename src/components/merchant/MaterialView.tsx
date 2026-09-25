import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  LayoutGrid,
  List,
  AlertTriangle,
  Truck,
  DollarSign,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Building2,
  ArrowRight,
  Filter,
  X,
  FileText,
  Save,
  Check,
  Edit2,
  Sliders,
  Sparkles,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  Thermometer,
  RotateCcw,
  Boxes,
  TrendingDown,
  TrendingUp,
  Trash2,
  Layers,
  PackageCheck,
  ArrowDownToLine,
  Download,
  Flame,
  Scale,
  ShoppingBag,
  Edit3,
  UserCheck
} from 'lucide-react';
import { MaterialItem, PurchaseRecord, DishItem } from '../../types';
import { INITIAL_MATERIALS, INITIAL_PURCHASE_RECORDS } from '../../data/mockEnhancedData';
import { INITIAL_DISHES } from '../../data/mockData';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { globalVersionEngine } from '../../utils/versionPointerEngine';
import {
  STANDARD_MATERIAL_TEMPLATES,
  MaterialTemplate,
  instantiateMaterialFromTemplate,
  exportMaterialTemplatesJson
} from '../../data/materialTemplates';
import { MaterialTemplateModal } from './material/MaterialTemplateModal';
import { MaterialStockInModal } from './material/MaterialStockInModal';
import { WeightSkewerCalculatorModal } from './material/WeightSkewerCalculatorModal';
import { SkewerProcessingModal } from './material/SkewerProcessingModal';
import { PurchaseDetailTraceModal } from './material/PurchaseDetailTraceModal';
import { AccountAuditDrawer } from './AccountAuditDrawer';
import { softDeleteToRecycleBin } from '../../utils/recycleBinEngine';

interface MaterialViewProps {
  showToast: (msg: string) => void;
}

const STORAGE_KEY = 'obsidian_truck_materials';
const PURCHASE_STORAGE_KEY = 'obsidian_truck_purchase_records';

export const MaterialView: React.FC<MaterialViewProps> = ({ showToast }) => {
  // 1. Persistent state for materials & purchase records
  const [materials, setMaterials] = useState<MaterialItem[]>(() => {
    return safeGetStorage<MaterialItem[]>(STORAGE_KEY, INITIAL_MATERIALS);
  });

  // Listen to external data restoration from Version Tracking Engine
  useEffect(() => {
    const handleDataRestored = (e: Event) => {
      const customEvt = e as CustomEvent<{ module: string }>;
      if (!customEvt.detail || customEvt.detail.module === 'materials') {
        const fresh = safeGetStorage<MaterialItem[]>(STORAGE_KEY, INITIAL_MATERIALS);
        setMaterials(fresh);
      }
    };
    window.addEventListener('obsidian_data_restored', handleDataRestored);
    return () => window.removeEventListener('obsidian_data_restored', handleDataRestored);
  }, []);

  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>(() => {
    return safeGetStorage<PurchaseRecord[]>(PURCHASE_STORAGE_KEY, INITIAL_PURCHASE_RECORDS);
  });

  // Save to storage
  const saveMaterials = (newMaterials: MaterialItem[]) => {
    setMaterials(newMaterials);
    safeSetStorage(STORAGE_KEY, newMaterials);
  };

  const savePurchaseRecords = (newRecords: PurchaseRecord[]) => {
    setPurchaseRecords(newRecords);
    safeSetStorage(PURCHASE_STORAGE_KEY, newRecords);
  };

  // Filters & Views
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedStatus, setSelectedStatus] = useState<string>('全部');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editHighlightField, setEditHighlightField] = useState<string | null>(null);

  // 编辑弹窗内各个字段容器与输入框 Refs
  const editFieldRefs = {
    brand: useRef<HTMLDivElement>(null),
    specPackaging: useRef<HTMLDivElement>(null),
    pricePerKg: useRef<HTMLDivElement>(null),
    platformName: useRef<HTMLDivElement>(null),
    name: useRef<HTMLDivElement>(null),
    currentStock: useRef<HTMLDivElement>(null),
    purchasePrice: useRef<HTMLDivElement>(null),
    supplier: useRef<HTMLDivElement>(null),
    supplierContact: useRef<HTMLDivElement>(null),
    storageLocation: useRef<HTMLDivElement>(null),
    storageTempZone: useRef<HTMLDivElement>(null),
    shelfLife: useRef<HTMLDivElement>(null)
  };

  // 自动滚动与聚焦定位处理
  useEffect(() => {
    if (isEditModalOpen && editHighlightField) {
      const timer = setTimeout(() => {
        const targetRef = editFieldRefs[editHighlightField as keyof typeof editFieldRefs];
        if (targetRef && targetRef.current) {
          targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const input = targetRef.current.querySelector('input, select');
          if (input) {
            (input as HTMLElement).focus();
            if ('select' in input && typeof (input as HTMLInputElement).select === 'function') {
              (input as HTMLInputElement).select();
            }
          }
        }
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [isEditModalOpen, editHighlightField]);

  // Material Template Modal & Stock-In Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [stockInTargetMaterial, setStockInTargetMaterial] = useState<MaterialItem | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<MaterialItem>>({
    sku: '',
    name: '',
    category: '肉类原料',
    currentStock: 0, // 遵从要求：默认在库设为0，待商家手动上架
    safetyStock: 10,
    reorderSuggestion: 20,
    unit: 'kg',
    purchasePrice: 45.0,
    storageLocation: '冷库 A-01',
    storageTempZone: '冷藏 0-4℃',
    supplier: '中粮安达直供冷链',
    supplierContact: '张经理',
    supplierPhone: '13812345678',
    supplierLeadDays: 1,
    supplierRating: 5,
    shelfLifeDays: 7,
    batchNo: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`,
    standardYieldRate: 0.85,
    spec: '标准真空袋装'
  });

  const [adjustModalItem, setAdjustModalItem] = useState<MaterialItem | null>(null);
  const [adjustTargetStock, setAdjustTargetStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('日常实盘校准');

  const [restockModalItem, setRestockModalItem] = useState<MaterialItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(20);
  const [restockPrice, setRestockPrice] = useState<number>(0);
  const [restockSupplier, setRestockSupplier] = useState<string>('');
  const [restockNote, setRestockNote] = useState<string>('');

  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState<boolean>(false);
  const [newOrderForm, setNewOrderForm] = useState({
    sku: 'SKU-RM-001',
    itemName: '澳洲和牛肋条肉 (冷藏真空)',
    category: '肉类原料',
    supplier: '中粮安达直供冷链',
    quantity: 15,
    unit: 'kg',
    unitPrice: 128.0,
    buyer: '张采购 (EMP-8003)',
    notes: '急采晚市高峰预备货源',
    // 采购商品与规格扩展字段
    platformName: '美菜网 (企业餐饮供应链平台)',
    procurementMethod: '平台采购',
    brand: '恒阳食品 / 双汇',
    specGramsPerPack: 500,
    specPacksPerBox: 20,
    specBoxes: 2,
    pricePerKg: 128.0,
    destinationLocation: '餐车·车载冷冻立柜 A-01',
    standardCode: 'GB/T 20575-2020 / GB 2707',
    flavor: '原味',
    productForm: '原切冷冻生肉块',
    storageMethod: '冷冻 -18℃以下'
  });

  // 重量除算与成本测算器弹窗状态
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [calcModalDefaultKg, setCalcModalDefaultKg] = useState<number>(5);
  const [calcModalDefaultPrice, setCalcModalDefaultPrice] = useState<number>(48);
  const [calcModalDefaultName, setCalcModalDefaultName] = useState<string>('指定原料');

  // 原料穿串加工转化与成品在售管理弹窗状态
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState<boolean>(false);
  const [processingTargetMaterial, setProcessingTargetMaterial] = useState<MaterialItem | null>(null);
  const [processingHighlightField, setProcessingHighlightField] = useState<string | null>(null);

  // 采购商品全量履约与溯源资质档案弹窗状态
  const [selectedTraceRecord, setSelectedTraceRecord] = useState<PurchaseRecord | null>(null);
  const [isTraceModalOpen, setIsTraceModalOpen] = useState<boolean>(false);

  // Calculate KPI metrics
  const lowStockCount = materials.filter((m) => m.currentStock <= m.safetyStock).length;
  const totalSpend = purchaseRecords.reduce((sum, r) => sum + r.totalAmount, 0);
  const inTransitCount = purchaseRecords.filter((r) => r.status === 'in_transit').length;
  const pendingCount = purchaseRecords.filter((r) => r.status === 'pending_approval').length;
  const allSuppliers = useMemo(() => {
    return Array.from(new Set(materials.map((m) => m.supplier).filter(Boolean)));
  }, [materials]);

  const categories = ['全部', '肉类原料', '海鲜水产', '蔬菜品类', '豆制品类', '饮品辅料', '消耗包材', '主食面点'];

  // Filtered materials
  const filteredMaterials = materials.filter((m) => {
    const matchCat = selectedCategory === '全部' || m.category === selectedCategory;
    const matchStatus =
      selectedStatus === '全部' ||
      (selectedStatus === '预警补充' && m.currentStock <= m.safetyStock) ||
      (selectedStatus === '采购在途' && m.status === 'in_transit') ||
      (selectedStatus === '库存充裕' && m.currentStock > m.safetyStock);
    const matchSupplier = selectedSupplierFilter === '全部' || m.supplier === selectedSupplierFilter;
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.supplier && m.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.storageLocation && m.storageLocation.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchStatus && matchSupplier && matchSearch;
  });

  // Edit Material Action
  const handleOpenEdit = (item: MaterialItem, fieldToHighlight?: string) => {
    setEditingMaterial({ ...item });
    setEditHighlightField(fieldToHighlight || null);
    setIsEditModalOpen(true);
  };

  const handleJumpToEditField = (fieldKey: string) => {
    setEditHighlightField(fieldKey);
    const targetRef = editFieldRefs[fieldKey as keyof typeof editFieldRefs];
    if (targetRef && targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = targetRef.current.querySelector('input, select');
      if (input) {
        (input as HTMLElement).focus();
        if ('select' in input && typeof (input as HTMLInputElement).select === 'function') {
          (input as HTMLInputElement).select();
        }
      }
    }
  };

  const handleSaveEditMaterial = () => {
    if (!editingMaterial) return;
    const oldMaterial = materials.find((m) => m.id === editingMaterial.id);
    const updatedItem = { ...editingMaterial, updatedAt: new Date().toISOString() };
    const updatedList = materials.map((m) => (m.id === editingMaterial.id ? updatedItem : m));
    
    if (oldMaterial) {
      globalVersionEngine.recordDataMutation({
        module: 'materials',
        entityId: editingMaterial.id,
        entityName: editingMaterial.name,
        actionType: 'update',
        beforeData: oldMaterial,
        afterData: updatedItem
      });
    }

    saveMaterials(updatedList);
    setIsEditModalOpen(false);
    setEditingMaterial(null);
    showToast(`原料档案 [${editingMaterial.name}] 信息修改已保存生效！`);
  };

  // Quick Stock Adjustment Action
  const handleOpenAdjust = (item: MaterialItem) => {
    setAdjustModalItem(item);
    setAdjustTargetStock(item.currentStock);
    setAdjustReason('日常实盘校对修正');
  };

  const handleConfirmAdjust = () => {
    if (!adjustModalItem) return;
    const variance = adjustTargetStock - adjustModalItem.currentStock;
    const updatedItem = {
      ...adjustModalItem,
      currentStock: adjustTargetStock,
      status: (adjustTargetStock <= adjustModalItem.safetyStock ? 'warning' : 'normal') as 'warning' | 'normal',
      updatedAt: new Date().toISOString(),
      remark: `${new Date().toLocaleDateString()}: ${adjustReason} (${variance >= 0 ? '+' : ''}${variance.toFixed(1)}${adjustModalItem.unit})`
    };
    const updatedList = materials.map((m) =>
      m.id === adjustModalItem.id ? updatedItem : m
    );

    globalVersionEngine.recordDataMutation({
      module: 'materials',
      entityId: adjustModalItem.id,
      entityName: adjustModalItem.name,
      actionType: 'update',
      beforeData: adjustModalItem,
      afterData: updatedItem,
      customSummary: `库存实盘校准：${adjustModalItem.currentStock} -> ${adjustTargetStock} ${adjustModalItem.unit} (${adjustReason})`
    });

    saveMaterials(updatedList);
    setAdjustModalItem(null);
    showToast(`库存校准完成！[${adjustModalItem.name}] 库存量更新为 ${adjustTargetStock} ${adjustModalItem.unit}`);
  };

  // Quick Inline Stock Inc/Dec
  const handleInlineStockChange = (id: string, delta: number) => {
    const target = materials.find((m) => m.id === id);
    if (!target) return;
    const nextStock = Math.max(0, parseFloat((target.currentStock + delta).toFixed(1)));
    const updatedItem = {
      ...target,
      currentStock: nextStock,
      status: (nextStock <= target.safetyStock ? 'warning' : 'normal') as 'warning' | 'normal',
      updatedAt: new Date().toISOString()
    };
    const updatedList = materials.map((m) =>
      m.id === id ? updatedItem : m
    );

    globalVersionEngine.recordDataMutation({
      module: 'materials',
      entityId: target.id,
      entityName: target.name,
      actionType: 'update',
      beforeData: target,
      afterData: updatedItem,
      customSummary: `快捷修改库存：${target.currentStock} -> ${nextStock} ${target.unit}`
    });

    saveMaterials(updatedList);
    showToast(`[${target.name}] 库存已调整为 ${nextStock} ${target.unit}`);
  };

  // Manual Stock-In (On-Shelf) Action
  const handleOpenStockIn = (item: MaterialItem) => {
    setStockInTargetMaterial(item);
    setIsStockInModalOpen(true);
  };

  const handleConfirmStockIn = (params: {
    materialId: string;
    arrivalQty: number;
    batchNo: string;
    unitPrice: number;
    supplier: string;
    storageLocation: string;
    expiryDate: string;
    notes: string;
  }) => {
    const target = materials.find((m) => m.id === params.materialId);
    if (!target) return;

    const newStock = parseFloat((target.currentStock + params.arrivalQty).toFixed(1));
    const updatedItem: MaterialItem = {
      ...target,
      currentStock: newStock,
      status: (newStock <= target.safetyStock ? 'warning' : 'normal') as 'warning' | 'normal',
      stockStatus: 'in_stock',
      isInStock: true,
      batchNo: params.batchNo || target.batchNo,
      storageLocation: params.storageLocation || target.storageLocation,
      supplier: params.supplier || target.supplier,
      purchasePrice: params.unitPrice || target.purchasePrice,
      lastPurchased: new Date().toISOString().slice(0, 10),
      purchaseCount: (target.purchaseCount || 0) + 1,
      updatedAt: new Date().toISOString(),
      remark: `${new Date().toLocaleDateString()}: 手动验收入库 +${params.arrivalQty}${target.unit} (${params.notes})`
    };

    const updatedList = materials.map((m) => (m.id === params.materialId ? updatedItem : m));
    saveMaterials(updatedList);

    // Auto-record purchase receipt
    const newRecord: PurchaseRecord = {
      id: `po-${Date.now()}`,
      purchaseNo: `RCV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16),
      itemName: target.name,
      category: target.category,
      supplier: params.supplier || target.supplier,
      quantity: params.arrivalQty,
      unit: target.unit,
      unitPrice: params.unitPrice || target.purchasePrice,
      totalAmount: params.arrivalQty * (params.unitPrice || target.purchasePrice),
      status: 'completed',
      buyer: '商家现地验收 (手动上架)',
      notes: `手动验收入库上架 - 批次:${params.batchNo} (${params.notes})`
    };
    savePurchaseRecords([newRecord, ...purchaseRecords]);

    globalVersionEngine.recordDataMutation({
      module: 'materials',
      entityId: target.id,
      entityName: target.name,
      actionType: 'update',
      beforeData: target,
      afterData: updatedItem,
      customSummary: `手动入库上架：${target.currentStock} -> ${newStock} ${target.unit} (批次: ${params.batchNo})`
    });

    showToast(`原料【${target.name}】已成功验收入库上架 ${params.arrivalQty} ${target.unit}！在库状态已转为在售。`);
  };

  // Template Actions
  const handleApplyTemplate = (template: MaterialTemplate) => {
    const existingIndex = materials.findIndex((m) => m.name.trim() === template.name.trim());
    if (existingIndex >= 0) {
      const existing = materials[existingIndex];
      const updated: MaterialItem = {
        ...existing,
        currentStock: 0, // 严格遵从要求：在库设为0
        safetyStock: template.safetyStock,
        reorderSuggestion: template.reorderSuggestion,
        unit: template.unit,
        purchasePrice: template.purchasePrice,
        storageLocation: template.storageLocation,
        storageTempZone: template.storageTempZone,
        supplier: template.supplier,
        supplierContact: template.supplierContact,
        supplierPhone: template.supplierPhone,
        supplierLeadDays: template.supplierLeadDays,
        supplierRating: template.supplierRating,
        shelfLifeDays: template.shelfLifeDays,
        standardYieldRate: template.standardYieldRate,
        spec: template.spec,
        status: 'warning',
        stockStatus: 'out_of_stock',
        isInStock: false,
        updatedAt: new Date().toISOString()
      };
      const updatedList = [...materials];
      updatedList[existingIndex] = updated;
      saveMaterials(updatedList);
      globalVersionEngine.recordDataMutation({
        module: 'materials',
        entityId: existing.id,
        entityName: existing.name,
        actionType: 'update',
        beforeData: existing,
        afterData: updated,
        customSummary: `从模板刷新原料档案【${template.name}】(在库已置0待上架)`
      });
      showToast(`已从标准模板刷新【${template.name}】，实际在库已设为 0 (待手动上架)！`);
    } else {
      const newMat = instantiateMaterialFromTemplate(template);
      saveMaterials([newMat, ...materials]);
      globalVersionEngine.recordDataMutation({
        module: 'materials',
        entityId: newMat.id,
        entityName: newMat.name,
        actionType: 'create',
        beforeData: null,
        afterData: newMat,
        customSummary: `从模板库载入原料档案【${template.name}】(在库已置0待上架)`
      });
      showToast(`已从标准模板载入原料【${template.name}】，实际在库为 0 (待手动上架)！`);
    }
  };

  const handleBatchApplyTemplates = (templates: MaterialTemplate[]) => {
    const currentList = [...materials];
    let addedCount = 0;
    let updatedCount = 0;

    templates.forEach((tpl) => {
      const idx = currentList.findIndex((m) => m.name.trim() === tpl.name.trim());
      if (idx >= 0) {
        currentList[idx] = {
          ...currentList[idx],
          currentStock: 0, // 遵从要求：在库统一设为0
          safetyStock: tpl.safetyStock,
          reorderSuggestion: tpl.reorderSuggestion,
          unit: tpl.unit,
          purchasePrice: tpl.purchasePrice,
          storageLocation: tpl.storageLocation,
          storageTempZone: tpl.storageTempZone,
          supplier: tpl.supplier,
          shelfLifeDays: tpl.shelfLifeDays,
          standardYieldRate: tpl.standardYieldRate,
          spec: tpl.spec,
          status: 'warning',
          stockStatus: 'out_of_stock',
          isInStock: false,
          updatedAt: new Date().toISOString()
        };
        updatedCount++;
      } else {
        currentList.unshift(instantiateMaterialFromTemplate(tpl));
        addedCount++;
      }
    });

    saveMaterials(currentList);
    showToast(`已批量调用 ${templates.length} 项标准原料模板！(新增 ${addedCount} 种，更新 ${updatedCount} 种，实际在库统一置为 0)`);
  };

  // Apply Single Template and Immediately Open Stock-In Modal
  const handleApplyAndStockIn = (template: MaterialTemplate) => {
    let targetItem: MaterialItem;
    const existingIndex = materials.findIndex((m) => m.name.trim() === template.name.trim());
    if (existingIndex >= 0) {
      const existing = materials[existingIndex];
      targetItem = {
        ...existing,
        currentStock: 0, // 遵从要求：在库初始设为0
        safetyStock: template.safetyStock,
        reorderSuggestion: template.reorderSuggestion,
        unit: template.unit,
        purchasePrice: template.purchasePrice,
        storageLocation: template.storageLocation,
        storageTempZone: template.storageTempZone,
        supplier: template.supplier,
        supplierContact: template.supplierContact,
        supplierPhone: template.supplierPhone,
        supplierLeadDays: template.supplierLeadDays,
        supplierRating: template.supplierRating,
        shelfLifeDays: template.shelfLifeDays,
        standardYieldRate: template.standardYieldRate,
        spec: template.spec,
        status: 'warning',
        stockStatus: 'out_of_stock',
        isInStock: false,
        updatedAt: new Date().toISOString()
      };
      const updatedList = [...materials];
      updatedList[existingIndex] = targetItem;
      saveMaterials(updatedList);
    } else {
      targetItem = instantiateMaterialFromTemplate(template);
      saveMaterials([targetItem, ...materials]);
    }

    setStockInTargetMaterial(targetItem);
    setIsStockInModalOpen(true);
    showToast(`已调用【${template.name}】标准模板！当前在库已设为 0，请录入实际到货数量与批次完成上架。`);
  };

  // Quick Download Standard Template Library JSON
  const handleDownloadTemplateJson = () => {
    try {
      const jsonText = exportMaterialTemplatesJson(STANDARD_MATERIAL_TEMPLATES);
      const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `material_safety_stock_templates_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`已成功导出包含 ${STANDARD_MATERIAL_TEMPLATES.length} 项原料安全库存标准模板文件 (JSON)！`);
    } catch (err: any) {
      showToast(`导出失败: ${err.message || '未知错误'}`);
    }
  };

  // Reset All Stock to Zero
  const handleResetAllStockToZero = () => {
    if (!confirm('确认将所有原料的实际在库库存统一归零 (设为0) 吗？\n操作后需要商家根据实际到货手动验收入库上架。')) {
      return;
    }
    const updated = materials.map((m) => ({
      ...m,
      currentStock: 0,
      status: 'warning' as const,
      stockStatus: 'out_of_stock' as const,
      isInStock: false,
      updatedAt: new Date().toISOString()
    }));
    saveMaterials(updated);
    globalVersionEngine.recordDataMutation({
      module: 'materials',
      entityId: 'all',
      entityName: '全量原物料',
      actionType: 'update',
      beforeData: materials,
      afterData: updated,
      customSummary: '执行原料在库库存一键归零 (待商家手动入库上架)'
    });
    showToast('全量原料在库库存已重置归零！请点击【手动入库上架】录入实物。');
  };

  // --- 穿串加工转化与在售状态管理 ---
  const handleOpenProcessingForMaterial = (item?: MaterialItem, fieldToHighlight?: string) => {
    setProcessingTargetMaterial(item || materials[0] || null);
    setProcessingHighlightField(fieldToHighlight || null);
    setIsProcessingModalOpen(true);
  };

  const handleConfirmProcessing = (params: {
    materialId: string;
    isFinishedSkewer: boolean;
    yieldSkewerCount: number;
    skewerLocation: string;
    isOnSale: boolean;
    linkedDishName: string;
    linkedDishId?: string;
    isUsed: boolean;
    usedQuantity: number;
    operator: string;
    notes: string;
    matchingSuppliesSummary?: string;
    brand?: string;
    spec?: string;
    specGramsPerPack?: number;
    specPacksPerBox?: number;
    pricePerKg?: number;
  }) => {
    const target = materials.find((m) => m.id === params.materialId);
    if (!target) return;

    // 扣除投料使用的原料数量
    const safeUsed = params.isUsed ? Math.min(target.currentStock, params.usedQuantity) : 0;
    const newStock = parseFloat(Math.max(0, target.currentStock - safeUsed).toFixed(2));

    const updatedItem: MaterialItem = {
      ...target,
      brand: params.brand !== undefined ? params.brand : target.brand,
      spec: params.spec !== undefined ? params.spec : target.spec,
      specGramsPerPack: params.specGramsPerPack !== undefined ? params.specGramsPerPack : target.specGramsPerPack,
      specPacksPerBox: params.specPacksPerBox !== undefined ? params.specPacksPerBox : target.specPacksPerBox,
      pricePerKg: params.pricePerKg !== undefined ? params.pricePerKg : target.pricePerKg,
      currentStock: newStock,
      remainingStock: newStock,
      isFinishedSkewer: params.isFinishedSkewer,
      yieldSkewerCount: params.yieldSkewerCount,
      skewerLocation: params.skewerLocation,
      isOnSale: params.isOnSale,
      linkedDishName: params.linkedDishName,
      linkedDishId: params.linkedDishId,
      isUsed: params.isUsed,
      usedQuantity: (target.usedQuantity || 0) + safeUsed,
      status: (newStock <= target.safetyStock ? 'warning' : 'normal') as 'warning' | 'normal',
      updatedAt: new Date().toISOString(),
      remark: `${new Date().toLocaleDateString()}: 穿串加工制成 ${params.yieldSkewerCount} 串，放置于【${params.skewerLocation}】，${params.isOnSale ? '已联动上架在售' : '未上架'}，消耗用料 ${safeUsed}${target.unit} (${params.notes})${params.matchingSuppliesSummary ? ` [${params.matchingSuppliesSummary}]` : ''}`
    };

    const updatedList = materials.map((m) => (m.id === params.materialId ? updatedItem : m));
    saveMaterials(updatedList);

    // 同步更新关联菜品的在售状态与前台打通
    if (params.linkedDishId || params.linkedDishName) {
      const storedDishes = safeGetStorage<DishItem[]>('obsidian_truck_dishes', INITIAL_DISHES);
      let dishUpdated = false;
      const updatedDishes = storedDishes.map((dish) => {
        if ((params.linkedDishId && dish.id === params.linkedDishId) || (!params.linkedDishId && dish.name === params.linkedDishName)) {
          dishUpdated = true;
          return {
            ...dish,
            available: params.isOnSale,
            craftStandardNote: dish.craftStandardNote || `由原料【${target.name}】穿串加工产出，存放在【${params.skewerLocation}】`
          };
        }
        return dish;
      });
      if (dishUpdated) {
        safeSetStorage('obsidian_truck_dishes', updatedDishes);
        window.dispatchEvent(new CustomEvent('obsidian_dishes_updated', { detail: updatedDishes }));
      }
    }

    window.dispatchEvent(new CustomEvent('obsidian_materials_updated', { detail: updatedList }));
    window.dispatchEvent(new CustomEvent('obsidian_data_restored'));

    globalVersionEngine.recordDataMutation({
      module: 'materials',
      entityId: target.id,
      entityName: target.name,
      actionType: 'update',
      beforeData: target,
      afterData: updatedItem,
      customSummary: `原料出串加工：制成 ${params.yieldSkewerCount}串，库位: ${params.skewerLocation}，消耗原料 ${safeUsed}${target.unit}${params.matchingSuppliesSummary ? `，${params.matchingSuppliesSummary}` : ''}`
    });

    showToast(
      `原料【${target.name}】穿串加工台账已入账！成功制成 ${params.yieldSkewerCount} 串，放置在 ${params.skewerLocation}，${params.isOnSale ? '已联动上架在售' : '已入库备料'}。`
    );
  };

  // 快速切换在售/下架状态并同步菜品
  const handleToggleOnSale = (item: MaterialItem) => {
    const nextState = !item.isOnSale;
    const updated: MaterialItem = {
      ...item,
      isOnSale: nextState,
      updatedAt: new Date().toISOString()
    };
    const updatedList = materials.map((m) => (m.id === item.id ? updated : m));
    saveMaterials(updatedList);

    // 同步关联菜品前台供售
    if (item.linkedDishId || item.linkedDishName) {
      const storedDishes = safeGetStorage<DishItem[]>('obsidian_truck_dishes', INITIAL_DISHES);
      const updatedDishes = storedDishes.map((dish) => {
        if ((item.linkedDishId && dish.id === item.linkedDishId) || (!item.linkedDishId && dish.name === item.linkedDishName)) {
          return {
            ...dish,
            available: nextState
          };
        }
        return dish;
      });
      safeSetStorage('obsidian_truck_dishes', updatedDishes);
      window.dispatchEvent(new CustomEvent('obsidian_dishes_updated', { detail: updatedDishes }));
    }

    window.dispatchEvent(new CustomEvent('obsidian_materials_updated', { detail: updatedList }));
    showToast(`菜品【${item.linkedDishName || item.name}】已${nextState ? '上架在售！前台食客可实时点单' : '暂停在售 (设为下架待命)'}`);
  };

  // 唤出重量出串测算器
  const handleOpenCalculatorForMaterial = (item?: MaterialItem) => {
    const mat = item || materials[0];
    if (mat) {
      setCalcModalDefaultKg(mat.currentStock > 0 ? mat.currentStock : 5);
      setCalcModalDefaultPrice(mat.pricePerKg || mat.purchasePrice || 48);
      setCalcModalDefaultName(mat.name);
    }
    setIsCalculatorOpen(true);
  };

  // 采购单全量资质溯源档案
  const handleOpenTraceRecord = (rec: PurchaseRecord) => {
    setSelectedTraceRecord(rec);
    setIsTraceModalOpen(true);
  };

  const handleUpdateTraceRecord = (updated: PurchaseRecord) => {
    const updatedList = purchaseRecords.map((r) => (r.id === updated.id ? updated : r));
    savePurchaseRecords(updatedList);
    setSelectedTraceRecord(updated);
  };

  // Create New Material
  const handleOpenCreateModal = () => {
    const nextSku = `SKU-RM-${String(materials.length + 1).padStart(3, '0')}`;
    setCreateForm({
      sku: nextSku,
      name: '',
      category: '肉类原料',
      currentStock: 0, // 遵从要求：默认在库设为0
      safetyStock: 10,
      reorderSuggestion: 20,
      unit: 'kg',
      purchasePrice: 45.0,
      storageLocation: '冷库 A-01',
      storageTempZone: '冷藏 0-4℃',
      supplier: '中粮安达直供冷链',
      supplierContact: '张经理',
      supplierPhone: '13812345678',
      supplierLeadDays: 1,
      supplierRating: 5,
      shelfLifeDays: 7,
      batchNo: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`,
      standardYieldRate: 0.85,
      spec: '标准真空袋装'
    });
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreateMaterial = () => {
    if (!createForm.name?.trim()) {
      showToast('请输入原料品名');
      return;
    }
    const newMat: MaterialItem = {
      id: `mat-${Date.now()}`,
      sku: createForm.sku || `SKU-RM-${Date.now().toString().slice(-4)}`,
      name: createForm.name.trim(),
      category: (createForm.category as any) || '肉类原料',
      currentStock: Number(createForm.currentStock) || 0,
      safetyStock: Number(createForm.safetyStock) || 5,
      reorderSuggestion: Number(createForm.reorderSuggestion) || 10,
      unit: createForm.unit || 'kg',
      purchasePrice: Number(createForm.purchasePrice) || 0,
      storageLocation: createForm.storageLocation || '冷库 A-01',
      storageTempZone: createForm.storageTempZone || '冷藏 0-4℃',
      supplier: createForm.supplier || '自采渠道',
      supplierContact: createForm.supplierContact || '',
      supplierPhone: createForm.supplierPhone || '',
      supplierLeadDays: Number(createForm.supplierLeadDays) || 1,
      supplierRating: Number(createForm.supplierRating) || 5,
      purchaseCount: 1,
      lastPurchased: new Date().toISOString().slice(0, 10),
      status: (Number(createForm.currentStock) || 0) <= (Number(createForm.safetyStock) || 5) ? 'warning' : 'normal',
      shelfLifeDays: Number(createForm.shelfLifeDays) || 7,
      batchNo: createForm.batchNo || `LOT-${Date.now().toString().slice(-6)}`,
      standardYieldRate: Number(createForm.standardYieldRate) || 0.85,
      spec: createForm.spec || '',
      updatedAt: new Date().toISOString()
    };

    saveMaterials([newMat, ...materials]);
    globalVersionEngine.recordDataMutation({
      module: 'materials',
      entityId: newMat.id,
      entityName: newMat.name,
      actionType: 'create',
      beforeData: null,
      afterData: newMat,
      customSummary: `新增原物料档案【${newMat.name}】(${newMat.sku})`
    });
    setIsCreateModalOpen(false);
    showToast(`新原料档案 [${newMat.name}] 创建成功并已入库！`);
  };

  // Delete Material
  const handleDeleteMaterial = (id: string, name: string) => {
    const target = materials.find((m) => m.id === id);
    if (confirm(`确认删除原料档案 [${name}] 吗？`)) {
      const updated = materials.filter((m) => m.id !== id);
      if (target) {
        globalVersionEngine.recordDataMutation({
          module: 'materials',
          entityId: id,
          entityName: name,
          actionType: 'delete',
          beforeData: target,
          afterData: null,
          customSummary: `删除原物料档案【${name}】`
        });
        // 统一回收站：软删除入站（30 天保留，可恢复）
        softDeleteToRecycleBin({
          type: 'material',
          typeLabel: '原料档案',
          refId: id,
          label: name,
          snapshot: target,
          storageKey: 'obsidian_truck_materials',
          container: 'array',
          idField: 'id'
        });
      }
      saveMaterials(updated);
      showToast(`原料档案 [${name}] 已删除`);
    }
  };

  // Restock PO Actions
  const handleOpenRestock = (item: MaterialItem) => {
    setRestockModalItem(item);
    setRestockQty(item.reorderSuggestion || 20);
    setRestockPrice(item.purchasePrice || 0);
    setRestockSupplier(item.supplier || '');
    setRestockNote('按建议补货量下单');
  };

  const handleConfirmRestock = () => {
    if (!restockModalItem) return;

    const newRecord: PurchaseRecord = {
      id: `po-${Date.now()}`,
      purchaseNo: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16),
      itemName: restockModalItem.name,
      category: restockModalItem.category,
      supplier: restockSupplier,
      quantity: restockQty,
      unit: restockModalItem.unit,
      unitPrice: restockPrice,
      totalAmount: restockQty * restockPrice,
      status: 'completed',
      buyer: '李店长 (EMP-8001)',
      notes: restockNote || '快捷补货直入库'
    };

    const updatedMaterials = materials.map((m) =>
      m.id === restockModalItem.id
        ? {
            ...m,
            currentStock: m.currentStock + restockQty,
            lastPurchased: new Date().toISOString().slice(0, 10),
            status: m.currentStock + restockQty <= m.safetyStock ? ('warning' as const) : ('normal' as const),
            purchaseCount: m.purchaseCount + 1,
            purchasePrice: restockPrice,
            supplier: restockSupplier
          }
        : m
    );

    saveMaterials(updatedMaterials);
    savePurchaseRecords([newRecord, ...purchaseRecords]);
    setRestockModalItem(null);
    showToast(`补货成功！已入库 ${restockModalItem.name} +${restockQty}${restockModalItem.unit}，并生成采购单据`);
  };

  const handleCreateNewOrder = () => {
    const newRecord: PurchaseRecord = {
      id: `po-${Date.now()}`,
      purchaseNo: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16),
      itemName: newOrderForm.itemName,
      category: newOrderForm.category,
      supplier: newOrderForm.supplier,
      quantity: newOrderForm.quantity,
      unit: newOrderForm.unit,
      unitPrice: newOrderForm.unitPrice,
      totalAmount: newOrderForm.quantity * newOrderForm.unitPrice,
      status: 'in_transit',
      buyer: newOrderForm.buyer,
      notes: newOrderForm.notes,
      platformName: newOrderForm.platformName,
      procurementMethod: newOrderForm.procurementMethod,
      brand: newOrderForm.brand,
      specGramsPerPack: newOrderForm.specGramsPerPack,
      specPacksPerBox: newOrderForm.specPacksPerBox,
      specBoxes: newOrderForm.specBoxes,
      pricePerKg: newOrderForm.pricePerKg,
      destinationLocation: newOrderForm.destinationLocation,
      orderTime: new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16),
      deliveryTime: new Date(Date.now() + 4 * 3600 * 1000).toLocaleString('zh-CN', { hour12: false }).slice(0, 16),
      standardCode: newOrderForm.standardCode,
      productionDate: new Date().toISOString().slice(0, 10),
      flavor: newOrderForm.flavor,
      productForm: newOrderForm.productForm,
      storageMethod: newOrderForm.storageMethod
    };

    savePurchaseRecords([newRecord, ...purchaseRecords]);
    setIsNewOrderModalOpen(false);
    showToast(`采购订单已下发至平台/合作商 [${newOrderForm.platformName || newOrderForm.supplier}]，状态：在途冷链配送`);
  };

  return (
    <div id="material-view" className="space-y-3.5 text-xs text-[#0f172a]">
      {/* 1. Header */}
      <div className="pr-7 xl:pr-9 bg-white p-3.5 sm:p-4 rounded-[3px] border border-[#e6e6e4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-semibold text-[#0f172a]">原料档案与安全库存管理</h1>
            <span className="px-2 py-0.5 rounded-[2px] bg-[#f0fdf4] text-emerald-800 border border-[#bbf7d0] text-[11px] font-normal flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>动态库存 & 合作商直管</span>
            </span>
          </div>
          <p className="text-[11.5px] sm:text-[12px] text-[#787774] mt-1 leading-relaxed font-normal">
            支持动态修改库存量、安全库存警戒线、参考价格、供应商档案与快捷补货盘点
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            id="btn-open-material-templates"
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-2.5 py-1.5 rounded-[2px] bg-white border border-[#e6e6e4] text-[#37352f] hover:bg-[#fbfbfa] font-normal flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors active:scale-95 text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>原料模板库 ({STANDARD_MATERIAL_TEMPLATES.length})</span>
          </button>
          <button
            id="btn-download-material-templates"
            type="button"
            onClick={handleDownloadTemplateJson}
            className="px-2.5 py-1.5 rounded-[2px] bg-white border border-[#e6e6e4] text-[#787774] hover:bg-[#fbfbfa] font-normal flex items-center justify-center gap-1 cursor-pointer shadow-2xs transition-colors active:scale-95 text-xs"
            title="一键下载包含全部原料与安全库存参数的标准模板 JSON 文件"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>下载模板</span>
          </button>
          <button
            id="btn-reset-stock-zero"
            type="button"
            onClick={handleResetAllStockToZero}
            className="px-2 py-1.5 rounded-[2px] bg-white border border-[#e6e6e4] text-[#787774] hover:bg-[#fbfbfa] font-normal flex items-center justify-center gap-1 cursor-pointer shadow-2xs transition-colors active:scale-95 text-xs"
            title="将所有原料在库库存归零，等待商家手动验收入库上架"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>在库归零</span>
          </button>
          <button
            id="btn-open-skewer-processing"
            type="button"
            onClick={() => handleOpenProcessingForMaterial()}
            className="px-2.5 py-1.5 rounded-[2px] bg-white border border-[#e6e6e4] text-[#37352f] hover:bg-[#fbfbfa] font-normal flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors active:scale-95 text-xs"
          >
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            <span>穿串在售台账</span>
          </button>
          <button
            id="btn-open-weight-calculator"
            type="button"
            onClick={() => handleOpenCalculatorForMaterial()}
            className="px-2.5 py-1.5 rounded-[2px] bg-white border border-[#e6e6e4] text-[#37352f] hover:bg-[#fbfbfa] font-normal flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors active:scale-95 text-xs"
          >
            <Scale className="w-3.5 h-3.5 text-emerald-600" />
            <span>除算测算器</span>
          </button>
          <button
            id="btn-create-new-material-archive"
            type="button"
            onClick={handleOpenCreateModal}
            className="px-2.5 py-1.5 rounded-[2px] bg-white border border-[#e6e6e4] text-[#37352f] hover:bg-[#fbfbfa] font-normal flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors active:scale-95 text-xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>新建原料</span>
          </button>
          <button
            id="btn-create-new-purchase-order"
            type="button"
            onClick={() => setIsNewOrderModalOpen(true)}
            className="px-3 py-1.5 rounded-[2px] bg-[#0f172a] text-white hover:bg-[#1e293b] font-normal flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors active:scale-95 text-xs"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
            <span>下发新采购单</span>
          </button>
        </div>
      </div>

      {/* 1.5 Template & Zero-Stock Status Notice */}
      <div className="bg-[#fbfbfa] border border-[#e6e6e4] rounded-[3px] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-7 h-7 rounded-[2px] bg-white border border-[#e6e6e4] text-amber-700 flex items-center justify-center shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-xs text-[#0f172a]">标准原料模板化与零在库模式已启用</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-normal bg-amber-50 text-amber-800 border border-amber-200">
                实际在库设为0 · 待商家手动上架
              </span>
            </div>
            <p className="text-[11px] text-[#787774] mt-0.5 font-normal">
              所有原料档案及安全库存参数已抽象为标准化模板。当前在库实际库存已归零，请点击【原料模板库】调配档案，或点击卡片上的【手动入库上架】录入实物到货。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-2.5 py-1 bg-white border border-[#e6e6e4] hover:bg-[#fbfbfa] text-[#37352f] rounded-[2px] text-xs font-normal flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>打开原料模板库</span>
          </button>
          <button
            type="button"
            onClick={handleResetAllStockToZero}
            className="px-2.5 py-1 bg-white border border-[#e6e6e4] hover:bg-[#fbfbfa] text-[#787774] rounded-[2px] text-xs font-normal flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-amber-700" />
            <span>一键归零</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Strip (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        <div className="bg-white p-2.5 sm:p-3 rounded-[3px] border border-[#e6e6e4] border-l-2 border-l-red-500 shadow-2xs">
          <div className="text-[10.5px] text-[#787774] font-normal flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
            <span>低库存预警</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-red-600 mt-1">
            {lowStockCount} <span className="text-xs font-normal text-[#787774]">项告急</span>
          </div>
          <div className="text-[10px] text-[#787774] mt-0.5 font-normal">低于安全警戒线</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-[3px] border border-[#e6e6e4] shadow-2xs">
          <div className="text-[10.5px] text-[#787774] font-normal flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>累计采购支出</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-[#0f172a] mt-1 truncate">
            ¥{totalSpend.toFixed(0)}
          </div>
          <div className="text-[10px] text-[#787774] mt-0.5 font-normal">全量采购单累计</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-[3px] border border-[#e6e6e4] shadow-2xs">
          <div className="text-[10.5px] text-[#787774] font-normal flex items-center gap-1">
            <Boxes className="w-3 h-3 text-blue-600 shrink-0" />
            <span>原料档案总数</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-[#0f172a] mt-1">
            {materials.length} <span className="text-xs font-normal text-[#787774]">种物料</span>
          </div>
          <div className="text-[10px] text-[#787774] mt-0.5 font-normal">覆盖7大核心品类</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-[3px] border border-[#e6e6e4] border-l-2 border-l-blue-600 shadow-2xs">
          <div className="text-[10.5px] text-[#787774] font-normal flex items-center gap-1">
            <Truck className="w-3 h-3 text-blue-600 shrink-0" />
            <span>在途配送订单</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-blue-600 mt-1">
            {inTransitCount} <span className="text-xs font-normal text-[#787774]">单冷链</span>
          </div>
          <div className="text-[10px] text-[#787774] mt-0.5 font-normal">预计今日内到店</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-[3px] border border-[#e6e6e4] border-l-2 border-l-amber-500 shadow-2xs">
          <div className="text-[10.5px] text-[#787774] font-normal flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
            <span>采购历史单据</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-amber-700 mt-1">
            {purchaseRecords.length} <span className="text-xs font-normal text-[#787774]">笔</span>
          </div>
          <div className="text-[10px] text-[#787774] mt-0.5 font-normal">全量留存履约单据</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-[3px] border border-[#e6e6e4] shadow-2xs">
          <div className="text-[10.5px] text-[#787774] font-normal flex items-center gap-1">
            <Building2 className="w-3 h-3 text-purple-600 shrink-0" />
            <span>合作供应商数</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-[#0f172a] mt-1">
            {allSuppliers.length} <span className="text-xs font-normal text-[#787774]">家直供</span>
          </div>
          <div className="text-[10px] text-[#787774] mt-0.5 font-normal">支持快捷筛选对接</div>
        </div>
      </div>

      {/* 3. Toolbar (Filter + Supplier Quick Bar + View Toggle + Search) */}
      <div className="bg-white p-2.5 sm:p-3 rounded-[3px] border border-[#e6e6e4] space-y-2 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Categories Horizontal Scroll */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar w-full sm:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-[2px] text-[11px] font-normal transition-colors cursor-pointer shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#0f172a] text-white'
                      : 'bg-[#fbfbfa] text-[#787774] border border-[#e6e6e4] hover:bg-[#f1f1ef]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 hide-scrollbar">
              {['全部', '预警补充', '采购在途', '库存充裕'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatus(st)}
                  className={`px-2 py-0.5 rounded-[2px] text-[10.5px] font-normal transition-colors cursor-pointer shrink-0 ${
                    selectedStatus === st
                      ? 'bg-[#fbfbfa] text-[#0f172a] font-medium border border-[#37352f]'
                      : 'bg-[#fbfbfa] text-[#787774] border border-[#e6e6e4] hover:bg-[#f1f1ef]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#787774] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索品名/编码/合作商/库位..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#fbfbfa] border border-[#e6e6e4] rounded-[2px] pl-8 pr-2.5 py-1 text-xs text-[#37352f] placeholder-[#9b9a97] focus:outline-none focus:border-[#37352f] font-normal"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-[#e6e6e4] rounded-[2px] overflow-hidden bg-white shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 cursor-pointer transition-colors ${
                  viewMode === 'grid' ? 'bg-[#0f172a] text-white' : 'text-[#787774] hover:bg-[#fbfbfa]'
                }`}
                title="卡片平铺网格"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 cursor-pointer transition-colors ${
                  viewMode === 'table' ? 'bg-[#0f172a] text-white' : 'text-[#787774] hover:bg-[#fbfbfa]'
                }`}
                title="采购流水表格"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Supplier Filter Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-[#f1f1ef] text-[11px] hide-scrollbar">
          <span className="text-[#787774] shrink-0 font-normal flex items-center gap-1">
            <Building2 className="w-3 h-3 text-purple-600" />
            <span>合作供应商：</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedSupplierFilter('全部')}
            className={`px-2 py-0.5 rounded-[2px] transition-colors shrink-0 ${
              selectedSupplierFilter === '全部'
                ? 'bg-purple-50 text-purple-800 font-medium border border-purple-200'
                : 'text-[#787774] hover:bg-[#fbfbfa]'
            }`}
          >
            全部合作商 ({allSuppliers.length})
          </button>
          {allSuppliers.map((sup) => (
            <button
              key={sup}
              type="button"
              onClick={() => setSelectedSupplierFilter(sup)}
              className={`px-2 py-0.5 rounded-[2px] transition-colors shrink-0 ${
                selectedSupplierFilter === sup
                  ? 'bg-purple-50 text-purple-800 font-medium border border-purple-200'
                  : 'text-[#787774] bg-[#fbfbfa] border border-[#e6e6e4] hover:bg-[#f1f1ef]'
              }`}
            >
              {sup}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Main Content */}
      {viewMode === 'grid' ? (
        /* Mode A: Material Cards Grid with Full Editing & Quick Actions */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMaterials.map((mat) => {
            const isLow = mat.currentStock <= mat.safetyStock;
            return (
              <div
                key={mat.id}
                className={`bg-white rounded-[3px] border shadow-2xs flex flex-col justify-between overflow-hidden transition-colors ${
                  isLow ? 'border-red-300' : 'border-[#e6e6e4] hover:border-[#b4b4b0]'
                }`}
              >
                <div className="p-3 space-y-2.5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] text-[#787774] bg-[#fbfbfa] border border-[#e6e6e4] px-1.5 py-0.2 rounded-[2px]">
                          {mat.sku}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-[2px] bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-normal">
                          {mat.category}
                        </span>
                        {mat.storageTempZone && (
                          <span className="px-1.5 py-0.2 rounded-[2px] bg-slate-50 text-slate-600 border border-slate-200 text-[10px] flex items-center gap-0.5 font-normal">
                            <Thermometer className="w-2.5 h-2.5" />
                            <span>{mat.storageTempZone}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-xs text-[#0f172a] mt-1 flex items-center gap-1.5">
                        <span>{mat.name}</span>
                        {mat.spec && <span className="text-[11px] font-normal text-[#787774]">({mat.spec})</span>}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      {isLow ? (
                        <span className="px-1.5 py-0.5 rounded-[2px] bg-red-50 text-red-700 border border-red-200 text-[10px] font-normal flex items-center gap-0.5 shrink-0">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <span>缺料告急</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-[2px] bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-normal shrink-0">
                          库存充裕
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(mat)}
                        className="p-1 rounded-[2px] text-[#787774] hover:text-[#0f172a] hover:bg-[#fbfbfa] border border-transparent hover:border-[#e6e6e4] transition-colors cursor-pointer"
                        title="修改原料与安全库存信息"
                      >
                        <Edit2 className="w-3 h-3 text-blue-600" />
                      </button>
                    </div>
                  </div>

                  {/* Stock Gauge & Quick +/- Adjuster */}
                  <div className="bg-[#fbfbfa] p-2 rounded-[3px] border border-[#e6e6e4] space-y-2">
                    {/* Zero Stock Manual On-Shelf Prompt */}
                    {mat.currentStock === 0 && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-[2px] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-amber-900 text-[11px] font-normal">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>在库为 0 (待手动上架)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenStockIn(mat)}
                          className="px-2 py-0.5 bg-amber-700 hover:bg-amber-800 text-white font-normal rounded-[2px] text-[10.5px] flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                        >
                          <PackageCheck className="w-3 h-3" />
                          <span>手动上架</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-[#787774] text-[11px] font-normal">当前在库存量：</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleInlineStockChange(mat.id, -1)}
                          className="w-5 h-5 rounded-[2px] bg-white border border-[#e6e6e4] text-[#787774] hover:bg-[#f1f1ef] flex items-center justify-center font-mono font-medium cursor-pointer transition-colors active:scale-95"
                          title="快速扣减 1 单位"
                        >
                          -
                        </button>
                        <span className={`font-mono font-semibold text-xs ${mat.currentStock === 0 ? 'text-amber-700' : isLow ? 'text-red-600' : 'text-[#0f172a]'}`}>
                          {mat.currentStock} {mat.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleInlineStockChange(mat.id, 1)}
                          className="w-5 h-5 rounded-[2px] bg-white border border-[#e6e6e4] text-[#787774] hover:bg-[#f1f1ef] flex items-center justify-center font-mono font-medium cursor-pointer transition-colors active:scale-95"
                          title="快速增加 1 单位"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAdjust(mat)}
                          className="ml-1 text-[10px] text-blue-600 hover:underline cursor-pointer font-normal"
                        >
                          盘点校准
                        </button>
                      </div>
                    </div>

                    <div className="w-full bg-[#e6e6e4] h-1 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${isLow ? 'bg-red-500' : 'bg-emerald-600'}`}
                        style={{
                          width: `${Math.min(100, (mat.currentStock / Math.max(1, mat.safetyStock * 2)) * 100)}%`
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] text-[#787774] font-normal">
                      <span className="flex items-center gap-0.5">
                        <span>安全线:</span>
                        <strong className="text-red-600 font-mono font-medium">{mat.safetyStock} {mat.unit}</strong>
                      </span>
                      <span>建议补货: +{mat.reorderSuggestion} {mat.unit}</span>
                    </div>
                  </div>

                  {/* Skewer Processing & On-Sale Status Strip */}
                  <div className="p-2 rounded-[3px] bg-[#fbfbfa] border border-[#e6e6e4] space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <div 
                        onClick={() => handleOpenProcessingForMaterial(mat, 'isFinishedSkewer')}
                        className="flex items-center gap-1 font-medium text-amber-900 hover:text-amber-950 cursor-pointer group"
                        title="点击修改原料形态定义 (免穿制成品或手工穿制)"
                      >
                        <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="group-hover:underline text-[11px]">串串成品 & 菜品状态：</span>
                        <span className="text-[9.5px] bg-amber-50 text-amber-800 border border-amber-200 px-1 py-0.2 rounded-[2px] font-normal">
                          {mat.isFinishedSkewer ? '成品串' : '手工鲜穿'}
                        </span>
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-amber-700 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleOnSale(mat)}
                          className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-normal cursor-pointer transition-all active:scale-95 flex items-center gap-1 ${
                            mat.isOnSale
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : 'bg-white text-[#787774] border border-[#e6e6e4] hover:bg-[#f1f1ef]'
                          }`}
                          title="点击快速切换菜品前台在售/下架状态"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${mat.isOnSale ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                          <span>{mat.isOnSale ? '在售上架' : '待命下架'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenProcessingForMaterial(mat, 'isOnSale')}
                          className="text-[9.5px] text-[#787774] hover:text-[#0f172a] underline cursor-pointer p-0.5 font-normal"
                          title="在弹窗中修改在售上架与前台联动参数"
                        >
                          详设
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                      <div 
                        onClick={() => handleOpenProcessingForMaterial(mat, 'yieldSkewerCount')}
                        className="bg-white hover:bg-[#fbfbfa] border border-[#e6e6e4] px-1.5 py-1 rounded-[2px] flex items-center justify-between cursor-pointer transition-colors group"
                        title="点击修改制成串数并高亮定位"
                      >
                        <span className="text-[#787774] group-hover:text-[#0f172a] flex items-center gap-0.5 font-normal">
                          <span>制成串数:</span>
                          <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#787774] transition-opacity" />
                        </span>
                        <strong className="font-mono text-[#0f172a] group-hover:underline font-semibold">{mat.yieldSkewerCount || 0} 串</strong>
                      </div>
                      <div 
                        onClick={() => handleOpenProcessingForMaterial(mat, 'skewerLocation')}
                        className="bg-white hover:bg-[#fbfbfa] border border-[#e6e6e4] px-1.5 py-1 rounded-[2px] flex items-center justify-between cursor-pointer transition-colors group"
                        title="点击修改摆放库位与温区"
                      >
                        <span className="text-[#787774] group-hover:text-[#0f172a] flex items-center gap-0.5 font-normal">
                          <span>摆放位置:</span>
                          <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#787774] transition-opacity" />
                        </span>
                        <span className="text-[#37352f] font-normal truncate max-w-[85px] group-hover:underline" title={mat.skewerLocation || mat.storageLocation}>
                          {mat.skewerLocation || mat.storageLocation || '冷库 A-01'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#787774] pt-0.5 font-normal">
                      <div 
                        onClick={() => handleOpenProcessingForMaterial(mat, 'usedQuantity')}
                        className="flex items-center gap-1 hover:bg-white px-1 py-0.5 rounded-[2px] cursor-pointer transition-colors group"
                        title="点击修改原料投料用量及扣料设置"
                      >
                        <span className="group-hover:text-[#0f172a]">投料情况:</span>
                        <strong className="group-hover:underline text-[#37352f] font-medium">
                          {mat.isUsed ? `已投用 ${(mat.usedQuantity || 0)} ${mat.unit}` : '未投料制作'}
                        </strong>
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#787774] transition-opacity" />
                      </div>
                      <div 
                        onClick={() => handleOpenProcessingForMaterial(mat, 'linkedDishName')}
                        className="text-blue-700 bg-white hover:bg-blue-50/60 border border-[#e6e6e4] hover:border-blue-300 px-1.5 py-0.5 rounded-[2px] truncate max-w-[125px] cursor-pointer transition-colors flex items-center gap-1 group"
                        title={`点击切换或新增联动商品 (当前: ${mat.linkedDishName || '尚未绑定'})`}
                      >
                        <span className="truncate group-hover:underline">
                          联动: {mat.linkedDishName || '点击绑定商品'}
                        </span>
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-blue-600 shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Procurement Specs & kg Calculation Strip */}
                  <div className="p-2 rounded-[3px] bg-[#fbfbfa] border border-[#e6e6e4] text-[10.5px] space-y-1">
                    <div 
                      onClick={() => handleOpenEdit(mat, 'brand')}
                      className="flex items-center justify-between text-[#787774] hover:bg-white px-1.5 py-0.5 rounded-[2px] cursor-pointer transition-colors group"
                      title="点击修改品牌规格并高亮定位"
                    >
                      <span className="flex items-center gap-1 font-normal group-hover:text-[#0f172a]">
                        <ShoppingBag className="w-3 h-3 text-[#787774]" />
                        <span>品牌规格:</span>
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#787774] transition-opacity" />
                      </span>
                      <span className="font-medium text-[#0f172a] group-hover:underline">
                        {mat.brand || '自选优选'}
                      </span>
                    </div>

                    <div 
                      onClick={() => handleOpenEdit(mat, 'specPackaging')}
                      className="text-[#37352f] font-mono bg-white hover:bg-[#fbfbfa] p-1 rounded-[2px] border border-[#e6e6e4] flex items-center justify-between cursor-pointer transition-colors group"
                      title="点击修改克重、每箱包数与采购件数并高亮定位"
                    >
                      <span className="group-hover:text-[#0f172a] flex items-center gap-1 font-normal text-[#787774]">
                        <span>{mat.specGramsPerPack || 500}g × {mat.specPacksPerBox || 20}包 × {mat.specBoxes || 2}件</span>
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#787774] transition-opacity" />
                      </span>
                      <span className="text-emerald-700 font-semibold group-hover:underline">
                        ≈ {(mat.specCalculatedKg || mat.currentStock || 0)}kg
                      </span>
                    </div>

                    <div 
                      onClick={() => handleOpenEdit(mat, 'pricePerKg')}
                      className="flex items-center justify-between pt-0.5 hover:bg-white px-1.5 py-0.5 rounded-[2px] cursor-pointer transition-colors group"
                      title="点击修改折合公斤单价并高亮定位"
                    >
                      <span className="text-[#787774] group-hover:text-[#0f172a] flex items-center gap-0.5 font-normal">
                        <span>折合公斤价:</span>
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#787774] transition-opacity" />
                      </span>
                      <span className="font-mono font-semibold text-emerald-700 text-xs group-hover:underline">
                        ¥{(mat.pricePerKg || mat.purchasePrice).toFixed(2)} <span className="text-[10px] text-[#787774] font-normal">/kg</span>
                      </span>
                    </div>

                    <div 
                      onClick={() => handleOpenEdit(mat, 'platformName')}
                      className="flex items-center justify-between text-[10px] text-[#787774] pt-0.5 border-t border-[#f1f1ef] hover:bg-white px-1.5 py-0.5 rounded-[2px] cursor-pointer transition-colors group font-normal"
                      title="点击修改采购渠道平台与执行标准号并高亮定位"
                    >
                      <span className="truncate max-w-[120px] group-hover:text-[#0f172a] group-hover:underline flex items-center gap-0.5">
                        <span>{mat.platformName || '美菜网'} ({mat.procurementMethod || '平台采购'})</span>
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#787774] transition-opacity" />
                      </span>
                      <span className="font-mono text-[#787774] group-hover:text-[#0f172a] group-hover:underline">{mat.standardCode || 'GB/T 20575'}</span>
                    </div>
                  </div>

                  {/* Supplier & Price Details */}
                  <div className="space-y-0.5 text-[11px] text-[#787774] bg-white pt-0.5 font-normal">
                    <div 
                      onClick={() => handleOpenEdit(mat, 'supplier')}
                      className="flex items-center justify-between hover:bg-[#fbfbfa] px-1.5 py-0.5 rounded-[2px] cursor-pointer transition-colors group"
                      title="点击修改合作供应商名称并高亮定位"
                    >
                      <span className="text-[#787774] group-hover:text-[#0f172a] flex items-center gap-1">
                        <span>合作供应商:</span>
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#787774] transition-opacity" />
                      </span>
                      <span className="text-[#37352f] font-normal truncate max-w-[150px] flex items-center gap-1 group-hover:text-[#0f172a] group-hover:underline" title={mat.supplier}>
                        <Building2 className="w-3 h-3 text-purple-600 shrink-0" />
                        <span className="truncate">{mat.supplier || '自选优选直供'}</span>
                      </span>
                    </div>

                    <div 
                      onClick={() => handleOpenEdit(mat, 'supplierContact')}
                      className="flex items-center justify-between text-[10.5px] hover:bg-[#fbfbfa] px-1.5 py-0.5 rounded-[2px] cursor-pointer transition-colors group"
                      title="点击修改对接联系人与电话并高亮定位"
                    >
                      <span className="text-[#787774] group-hover:text-[#0f172a] flex items-center gap-1">
                        <span>对接联系人:</span>
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#787774] transition-opacity" />
                      </span>
                      <span className="text-[#37352f] flex items-center gap-1 group-hover:text-[#0f172a] group-hover:underline">
                        <span>{mat.supplierContact || '点击设置联系人'}</span>
                        {mat.supplierPhone ? (
                          <span className="font-mono text-[10px] text-[#787774]">({mat.supplierPhone})</span>
                        ) : null}
                      </span>
                    </div>

                    <div 
                      onClick={() => handleOpenEdit(mat, 'storageTempZone')}
                      className="flex items-center justify-between text-[10.5px] hover:bg-[#fbfbfa] px-1.5 py-0.5 rounded-[2px] cursor-pointer transition-colors group"
                      title="点击修改存储温区并高亮定位"
                    >
                      <span className="text-[#787774] group-hover:text-[#0f172a] flex items-center gap-1">
                        <span>存储温区:</span>
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#787774] transition-opacity" />
                      </span>
                      <span className="text-[#37352f] truncate max-w-[140px] group-hover:text-[#0f172a] group-hover:underline">
                        {mat.storageTempZone || '冷藏 0-4℃'}
                      </span>
                    </div>

                    <div 
                      onClick={() => handleOpenEdit(mat, 'shelfLife')}
                      className="flex items-center justify-between text-[10.5px] hover:bg-[#fbfbfa] px-1.5 py-0.5 rounded-[2px] cursor-pointer transition-colors group"
                      title="点击修改保质期与入库批号并高亮定位"
                    >
                      <span className="text-[#787774] group-hover:text-[#0f172a] flex items-center gap-1">
                        <span>保质期 / 批号:</span>
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#787774] transition-opacity" />
                      </span>
                      <span className="font-mono text-[#37352f] group-hover:text-[#0f172a] group-hover:underline">
                        {mat.shelfLifeDays ? `${mat.shelfLifeDays}天` : '7天'} · {mat.batchNo || 'LOT-最新'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="bg-[#fbfbfa] px-3 py-2 border-t border-[#e6e6e4] flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenProcessingForMaterial(mat)}
                      className="px-2 py-0.5 rounded-[2px] bg-white border border-[#e6e6e4] text-[#37352f] hover:bg-[#f1f1ef] text-[10.5px] font-normal flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                      title="原料穿串加工转化、记录制成串数、存放位置与在售状态"
                    >
                      <Flame className="w-3 h-3 text-amber-600" />
                      <span>穿串在售</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenCalculatorForMaterial(mat)}
                      className="px-2 py-0.5 rounded-[2px] bg-white border border-[#e6e6e4] text-[#37352f] hover:bg-[#f1f1ef] text-[10.5px] font-normal flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                      title="自定义公斤除以数量出串测算器"
                    >
                      <Scale className="w-3 h-3 text-emerald-600" />
                      <span>出串测算</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(mat)}
                      className="p-1 rounded-[2px] bg-white border border-[#e6e6e4] text-[#787774] hover:bg-[#f1f1ef] text-[11px] cursor-pointer"
                      title="修改参数"
                    >
                      <Sliders className="w-3 h-3 text-blue-600" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenRestock(mat)}
                      className="px-2.5 py-0.5 rounded-[2px] bg-[#0f172a] text-white hover:bg-[#1e293b] font-normal flex items-center gap-1 cursor-pointer transition-colors text-[10.5px]"
                    >
                      <ShoppingCart className="w-3 h-3 text-emerald-400" />
                      <span>快捷补货</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Mode B: Full 10-Column Purchase Flow Table with Mobile Cards */
        <div className="bg-white rounded-[3px] border border-[#e6e6e4] shadow-2xs overflow-hidden">
          {/* Mobile Card Layout (< md) */}
          <div className="md:hidden divide-y divide-[#e6e6e4]">
            {purchaseRecords.map((rec) => (
              <div
                key={rec.id}
                onClick={() => handleOpenTraceRecord(rec)}
                className="p-3 space-y-2 hover:bg-[#fbfbfa] transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] text-[#787774] bg-[#fbfbfa] border border-[#e6e6e4] px-1.5 py-0.2 rounded-[2px]">
                        {rec.purchaseNo}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-[2px] bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-normal">
                        {rec.category}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-[2px] bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-normal">
                        {rec.platformName || '美菜网'} ({rec.procurementMethod || '平台采购'})
                      </span>
                    </div>
                    <h4 className="font-medium text-xs text-[#0f172a] mt-1 flex items-center gap-1.5">
                      <span>{rec.itemName}</span>
                      {rec.brand && <span className="text-[10.5px] font-normal text-[#787774]">[{rec.brand}]</span>}
                    </h4>
                  </div>
                  <div>
                    {rec.status === 'completed' && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[2px] text-[10px] font-normal">
                        已入库
                      </span>
                    )}
                    {rec.status === 'in_transit' && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-[2px] text-[10px] font-normal flex items-center gap-1">
                        <Truck className="w-2.5 h-2.5" />
                        <span>在途冷链</span>
                      </span>
                    )}
                    {rec.status === 'pending_approval' && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-[2px] text-[10px] font-normal">
                        待审核
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-[#fbfbfa] p-2 rounded-[2px] border border-[#e6e6e4] text-[11px]">
                  <div>
                    <span className="text-[#787774] font-normal">采购数量: </span>
                    <strong className="font-mono text-[#0f172a] font-semibold">{rec.quantity} {rec.unit}</strong>
                    <span className="text-[#787774] text-[10px] block font-normal">
                      单价: ¥{rec.unitPrice.toFixed(2)} {rec.pricePerKg ? `(¥${rec.pricePerKg}/kg)` : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#787774] font-normal">订单总额: </span>
                    <div className="font-mono font-semibold text-xs text-[#0f172a]">
                      ¥{rec.totalAmount.toFixed(2)}
                    </div>
                    {rec.specGramsPerPack && (
                      <span className="text-[10px] text-[#787774] block font-normal">
                        {rec.specGramsPerPack}g×{rec.specPacksPerBox || 20}包×{rec.specBoxes || 1}件
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#787774] pt-0.5 font-normal">
                  <div className="truncate max-w-[170px]">送至: {rec.destinationLocation || '车载冷柜'}</div>
                  <div className="text-blue-600 font-normal flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>查看资质溯源档案 &gt;</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Mobile Footer Total */}
            <div className="p-3 bg-[#fbfbfa] border-t border-[#e6e6e4] flex items-center justify-between text-xs font-normal text-[#0f172a]">
              <span>全量共 {purchaseRecords.length} 笔订单</span>
              <div className="text-right">
                <span className="text-[11px] text-[#787774] font-normal mr-1.5">总采购支出:</span>
                <span className="font-mono text-sm font-semibold text-[#0f172a]">¥{totalSpend.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fbfbfa] text-[#787774] border-b border-[#e6e6e4] font-normal">
                <tr>
                  <th className="p-2.5 font-normal">采购单号</th>
                  <th className="p-2.5 font-normal">平台与采购方式</th>
                  <th className="p-2.5 font-normal">原料品名 / 品牌</th>
                  <th className="p-2.5 font-normal">规格换算 (克×包×件)</th>
                  <th className="p-2.5 text-right font-normal">数量与单价</th>
                  <th className="p-2.5 text-right font-normal">折合公斤价</th>
                  <th className="p-2.5 text-right font-normal">订单总额</th>
                  <th className="p-2.5 font-normal">履约配送时间 / 地点</th>
                  <th className="p-2.5 text-center font-normal">状态</th>
                  <th className="p-2.5 text-center font-normal">全量资质溯源</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f1ef]">
                {purchaseRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#fbfbfa] transition-colors">
                    <td className="p-2.5 font-mono text-[#0f172a]">
                      <div className="font-medium">{rec.purchaseNo}</div>
                      <div className="text-[10.5px] text-[#787774] font-normal">{rec.timestamp}</div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-normal text-[#0f172a]">{rec.platformName || '美菜网供应链'}</div>
                      <div className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.2 rounded-[2px] inline-block mt-0.5 font-normal">
                        {rec.procurementMethod || '平台直采'}
                      </div>
                    </td>
                    <td className="p-2.5 font-medium text-[#0f172a]">
                      <div>{rec.itemName}</div>
                      <div className="text-[10px] text-[#787774] font-normal flex items-center gap-1">
                        <span>品牌: {rec.brand || '自选优选'}</span>
                        <span>·</span>
                        <span>{rec.category}</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-[#37352f] font-mono text-[11px] font-normal">
                      <div>{rec.specGramsPerPack || 500}g × {rec.specPacksPerBox || 20}包 × {rec.specBoxes || 1}件</div>
                      <div className="text-[10px] text-emerald-700 font-sans font-normal">
                        标准号: {rec.standardCode || 'GB/T 20575'}
                      </div>
                    </td>
                    <td className="p-2.5 text-right font-mono text-[#0f172a]">
                      <div className="font-medium">{rec.quantity} {rec.unit}</div>
                      <div className="text-[10.5px] text-[#787774] font-normal">¥{rec.unitPrice.toFixed(2)}/{rec.unit}</div>
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-700 font-medium">
                      ¥{(rec.pricePerKg || rec.unitPrice).toFixed(2)}/kg
                    </td>
                    <td className="p-2.5 text-right font-mono font-semibold text-[#0f172a]">
                      ¥{rec.totalAmount.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-[#37352f] text-[11px] font-normal">
                      <div className="truncate max-w-[130px]" title={rec.destinationLocation || '餐车指定冷库'}>
                        📍 {rec.destinationLocation || '餐车指定冷柜'}
                      </div>
                      <div className="text-[10px] text-[#787774]">
                        {rec.deliveryTime ? `送达: ${rec.deliveryTime}` : `下单: ${rec.orderTime || rec.timestamp}`}
                      </div>
                    </td>
                    <td className="p-2.5 text-center">
                      {rec.status === 'completed' && (
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-[2px] text-[10px] font-normal">
                          已入库
                        </span>
                      )}
                      {rec.status === 'in_transit' && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-[2px] text-[10px] font-normal flex items-center justify-center gap-1">
                          <Truck className="w-2.5 h-2.5" />
                          <span>在途冷链</span>
                        </span>
                      )}
                      {rec.status === 'pending_approval' && (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-[2px] text-[10px] font-normal">
                          待审核
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenTraceRecord(rec)}
                        className="px-2 py-0.5 rounded-[2px] bg-white border border-[#e6e6e4] hover:bg-[#fbfbfa] text-[#37352f] font-normal text-[10.5px] flex items-center justify-center gap-1 cursor-pointer transition-colors mx-auto"
                        title="查看产品标准号、生产日期、资质证明与完整履约信息"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>溯源档案</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#fbfbfa] font-normal text-[#0f172a] border-t border-[#e6e6e4]">
                <tr>
                  <td colSpan={4} className="p-2.5 text-[#787774]">
                    全量合计：{purchaseRecords.length} 笔订单
                  </td>
                  <td colSpan={2} className="p-2.5 text-right text-[#787774]">总采购支出金额：</td>
                  <td className="p-2.5 text-right font-mono text-xs font-semibold text-[#0f172a]">
                    ¥{totalSpend.toFixed(2)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Edit Material & Safety Stock Parameters (编辑原料档案与安全库存) */}
      {isEditModalOpen && editingMaterial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[4px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs my-6">
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-bold">
                  <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0f172a]">编辑原料档案与安全库存参数</h3>
                  <p className="text-[11px] text-[#64748b]">修改当前在库量、警戒阈值、参考价格及合作商信息</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Field Jump Navigation Bar (快速跳转聚焦栏) */}
            <div className="bg-slate-100/90 border-b border-[#cbd5e1] px-3.5 py-1.5 flex items-center gap-1.5 overflow-x-auto text-[11px] shadow-2xs">
              <span className="text-slate-800 font-bold shrink-0 flex items-center gap-1 mr-1 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>字段快速跳转:</span>
              </span>
              {[
                { key: 'brand', label: '① 品牌名称' },
                { key: 'specPackaging', label: '② 包装换算' },
                { key: 'pricePerKg', label: '③ 折合公斤价' },
                { key: 'platformName', label: '④ 渠道标准' },
                { key: 'name', label: '⑤ 基础品名' },
                { key: 'currentStock', label: '⑥ 在库预警' },
                { key: 'purchasePrice', label: '⑦ 采购单价' },
                { key: 'supplier', label: '⑧ 合作供应商' },
                { key: 'supplierContact', label: '⑨ 对接联系人' },
                { key: 'storageTempZone', label: '⑩ 存储温区' },
                { key: 'shelfLife', label: '⑪ 保质期/批号' },
                { key: 'storageLocation', label: '⑫ 存放库位' }
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => handleJumpToEditField(f.key)}
                  className={`px-2 py-0.5 rounded-[2px] cursor-pointer whitespace-nowrap text-[10.5px] transition-all flex items-center gap-1 ${
                    editHighlightField === f.key
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-300'
                  }`}
                >
                  <span>{f.label}</span>
                  {editHighlightField === f.key && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {/* 1. Basic Info */}
              <div 
                ref={editFieldRefs.name}
                className={`space-y-2 p-2.5 rounded-[3px] border transition-all ${
                  editHighlightField === 'name' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/70 shadow-xs' : 'border-transparent'
                }`}
              >
                <h4 className="font-bold text-[#0f172a] text-xs flex items-center justify-between pb-1 border-b border-[#f1f5f9]">
                  <span className="flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-blue-600" />
                    <span>1. 基础物料信息</span>
                  </span>
                  {editHighlightField === 'name' && (
                    <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-xs shadow-xs animate-bounce">
                      🎯 当前修改项
                    </span>
                  )}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">原料品名 *</label>
                    <input
                      type="text"
                      value={editingMaterial.name}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-bold focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">SKU 编码</label>
                    <input
                      type="text"
                      value={editingMaterial.sku}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, sku: e.target.value })}
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs font-mono text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">所属品类</label>
                    <select
                      value={editingMaterial.category}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, category: e.target.value as any })}
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    >
                      {categories.filter((c) => c !== '全部').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">计量单位</label>
                    <input
                      type="text"
                      value={editingMaterial.unit}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, unit: e.target.value })}
                      placeholder="kg, 份, 箱, 瓶..."
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">规格包装描述</label>
                    <input
                      type="text"
                      value={editingMaterial.spec || ''}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, spec: e.target.value })}
                      placeholder="如 1kg/袋, 25kg/箱"
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Brand, Spec & Procurement Package Conversion (品牌规格与包件换算) */}
              <div className="space-y-3 p-3 rounded-[3px] border border-blue-200 bg-blue-50/30">
                <h4 className="font-bold text-[#0f172a] text-xs flex items-center justify-between pb-1 border-b border-blue-200/80">
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                    <span>2. 品牌规格与包件换算 (采购入库标准)</span>
                  </span>
                  {(editHighlightField === 'brand' || editHighlightField === 'specPackaging' || editHighlightField === 'pricePerKg' || editHighlightField === 'platformName') && (
                    <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-xs shadow-xs animate-bounce">
                      🎯 当前修改项
                    </span>
                  )}
                </h4>

                {/* 品牌字段 */}
                <div 
                  ref={editFieldRefs.brand}
                  className={`p-2 rounded-[2px] transition-all ${
                    editHighlightField === 'brand' ? 'ring-2 ring-blue-500 bg-blue-100/70 border border-blue-400' : 'bg-white/80 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-neutral-800">
                      品牌名称 (Brand) *
                    </label>
                    {editHighlightField === 'brand' && (
                      <span className="text-[10px] text-blue-700 font-bold">正在修改品牌</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editingMaterial.brand || ''}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, brand: e.target.value })}
                    placeholder="如：恒阳、双汇、正大、蜀海、安井..."
                    className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-bold focus:outline-none focus:border-blue-600"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['恒阳牛羊', '双汇冷鲜', '正大食品', '蜀海供应链', '安井食品', '大红门', '雨润冷鲜', '自选优选'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setEditingMaterial({ ...editingMaterial, brand: b })}
                        className={`px-1.5 py-0.5 text-[9.5px] border rounded-[2px] cursor-pointer transition-colors ${
                          editingMaterial.brand === b
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 包件规格换算 */}
                <div 
                  ref={editFieldRefs.specPackaging}
                  className={`p-2 rounded-[2px] transition-all ${
                    editHighlightField === 'specPackaging' ? 'ring-2 ring-blue-500 bg-blue-100/70 border border-blue-400' : 'bg-white/80 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-neutral-800">
                      包装规格换算参数 (单包克重 × 箱包数 × 件数)
                    </label>
                    {editHighlightField === 'specPackaging' && (
                      <span className="text-[10px] text-blue-700 font-bold">正在修改包装换算</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-[#64748b] block mb-0.5">单包克重 (g)</span>
                      <input
                        type="number"
                        step="10"
                        value={editingMaterial.specGramsPerPack || 500}
                        onChange={(e) => {
                          const grams = Number(e.target.value) || 0;
                          const packs = editingMaterial.specPacksPerBox || 20;
                          const boxes = editingMaterial.specBoxes || 1;
                          const calculatedKg = parseFloat(((grams * packs * boxes) / 1000).toFixed(2));
                          setEditingMaterial({
                            ...editingMaterial,
                            specGramsPerPack: grams,
                            specCalculatedKg: calculatedKg
                          });
                        }}
                        className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2 py-1 font-mono text-xs font-bold text-[#0f172a]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#64748b] block mb-0.5">每箱包数 (包)</span>
                      <input
                        type="number"
                        step="1"
                        value={editingMaterial.specPacksPerBox || 20}
                        onChange={(e) => {
                          const packs = Number(e.target.value) || 0;
                          const grams = editingMaterial.specGramsPerPack || 500;
                          const boxes = editingMaterial.specBoxes || 1;
                          const calculatedKg = parseFloat(((grams * packs * boxes) / 1000).toFixed(2));
                          setEditingMaterial({
                            ...editingMaterial,
                            specPacksPerBox: packs,
                            specCalculatedKg: calculatedKg
                          });
                        }}
                        className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2 py-1 font-mono text-xs font-bold text-[#0f172a]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#64748b] block mb-0.5">采购件数 (件/箱)</span>
                      <input
                        type="number"
                        step="1"
                        value={editingMaterial.specBoxes || 1}
                        onChange={(e) => {
                          const boxes = Number(e.target.value) || 0;
                          const grams = editingMaterial.specGramsPerPack || 500;
                          const packs = editingMaterial.specPacksPerBox || 20;
                          const calculatedKg = parseFloat(((grams * packs * boxes) / 1000).toFixed(2));
                          setEditingMaterial({
                            ...editingMaterial,
                            specBoxes: boxes,
                            specCalculatedKg: calculatedKg
                          });
                        }}
                        className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2 py-1 font-mono text-xs font-bold text-[#0f172a]"
                      />
                    </div>
                  </div>
                  <div className="text-[10.5px] text-emerald-700 bg-emerald-50 px-2 py-1 mt-1.5 rounded-[2px] border border-emerald-200 flex items-center justify-between font-mono font-medium">
                    <span>
                      换算总重: {editingMaterial.specGramsPerPack || 500}g × {editingMaterial.specPacksPerBox || 20}包 × {editingMaterial.specBoxes || 1}件
                    </span>
                    <strong className="text-emerald-800">
                      ≈ {editingMaterial.specCalculatedKg || (((editingMaterial.specGramsPerPack || 500) * (editingMaterial.specPacksPerBox || 20) * (editingMaterial.specBoxes || 1)) / 1000).toFixed(2)} kg
                    </strong>
                  </div>
                </div>

                {/* 折合公斤单价 & 采购平台标准号 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div 
                    ref={editFieldRefs.pricePerKg}
                    className={`p-2 rounded-[2px] transition-all ${
                      editHighlightField === 'pricePerKg' ? 'ring-2 ring-blue-500 bg-blue-100/70 border border-blue-400' : 'bg-white/80 border border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-neutral-800">
                        折合公斤单价 (元/kg) *
                      </label>
                      {editHighlightField === 'pricePerKg' && (
                        <span className="text-[10px] text-blue-700 font-bold">正在修改公斤单价</span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[#64748b]">¥</span>
                      <input
                        type="number"
                        step="0.1"
                        value={editingMaterial.pricePerKg || editingMaterial.purchasePrice}
                        onChange={(e) => setEditingMaterial({ ...editingMaterial, pricePerKg: Number(e.target.value) })}
                        className="w-full bg-white border border-[#cbd5e1] rounded-[2px] pl-5 pr-2 py-1 font-mono font-bold text-xs text-emerald-700 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <span className="text-[10px] text-[#64748b] block mt-0.5">用于精确计算单串用料成本</span>
                  </div>

                  <div 
                    ref={editFieldRefs.platformName}
                    className={`p-2 rounded-[2px] transition-all ${
                      editHighlightField === 'platformName' ? 'ring-2 ring-blue-500 bg-blue-100/70 border border-blue-400' : 'bg-white/80 border border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-neutral-800">
                        采购平台渠道 / 标准号
                      </label>
                      {editHighlightField === 'platformName' && (
                        <span className="text-[10px] text-blue-700 font-bold">正在修改渠道标准</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={editingMaterial.platformName || '美菜网'}
                        onChange={(e) => setEditingMaterial({ ...editingMaterial, platformName: e.target.value })}
                        placeholder="采购平台/渠道"
                        className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2 py-1 text-xs text-[#0f172a] focus:outline-none focus:border-blue-600"
                      />
                      <input
                        type="text"
                        value={editingMaterial.standardCode || 'GB/T 20575'}
                        onChange={(e) => setEditingMaterial({ ...editingMaterial, standardCode: e.target.value })}
                        placeholder="执行标准号"
                        className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2 py-1 font-mono text-xs text-[#0f172a] focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <span className="text-[10px] text-[#64748b] block mt-0.5">溯源存证标准号</span>
                  </div>
                </div>
              </div>

              {/* 3. Stock & Threshold Parameters */}
              <div 
                ref={editFieldRefs.currentStock}
                className={`space-y-2 pt-1 p-2.5 rounded-[3px] border transition-all ${
                  editHighlightField === 'currentStock' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/70 shadow-xs' : 'border-transparent'
                }`}
              >
                <h4 className="font-bold text-[#0f172a] text-xs flex items-center justify-between pb-1 border-b border-[#f1f5f9]">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>3. 库存与安全预警参数</span>
                  </span>
                  {editHighlightField === 'currentStock' && (
                    <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-xs shadow-xs animate-bounce">
                      🎯 当前修改项
                    </span>
                  )}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#f8fafc] p-3 rounded-[3px] border border-[#e2e8f0]">
                  <div>
                    <label className="block text-[11px] text-[#0f172a] font-bold mb-1">
                      当前在库存量 ({editingMaterial.unit}) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingMaterial.currentStock}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, currentStock: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-sm text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                    <span className="text-[10px] text-[#64748b]">实时系统记账存量</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-red-600 font-bold mb-1">
                      安全库存警戒线 ({editingMaterial.unit}) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingMaterial.safetyStock}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, safetyStock: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-red-300 rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-sm text-red-600 focus:outline-none focus:border-red-600"
                    />
                    <span className="text-[10px] text-red-500">低于此值触发红色报警</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                      建议补货量 ({editingMaterial.unit})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingMaterial.reorderSuggestion}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, reorderSuggestion: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                    <span className="text-[10px] text-[#64748b]">一键补货默认填充</span>
                  </div>
                </div>
              </div>

              {/* 4. Price & Supplier Partner Details */}
              <div className="space-y-2.5 pt-1 p-2.5 rounded-[3px] border border-slate-200 bg-slate-50/50">
                <h4 className="font-bold text-[#0f172a] text-xs flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>4. 参考价格与合作供应商档案 (采购对接标准)</span>
                  </span>
                  {(editHighlightField === 'purchasePrice' || editHighlightField === 'supplier' || editHighlightField === 'supplierContact') && (
                    <span className="text-[10px] bg-purple-600 text-white font-bold px-1.5 py-0.2 rounded-xs shadow-xs animate-bounce">
                      🎯 当前修改项
                    </span>
                  )}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 参考采购价格 */}
                  <div 
                    ref={editFieldRefs.purchasePrice}
                    className={`p-2.5 rounded-[3px] border transition-all ${
                      editHighlightField === 'purchasePrice' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-100/70 shadow-xs' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] text-[#0f172a] font-bold">
                        参考采购价格 (元/{editingMaterial.unit}) *
                      </label>
                      {editHighlightField === 'purchasePrice' && (
                        <span className="text-[10px] text-blue-700 font-bold">正在修改采购参考价</span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#64748b]">¥</span>
                      <input
                        type="number"
                        step="0.1"
                        value={editingMaterial.purchasePrice}
                        onChange={(e) =>
                          setEditingMaterial({ ...editingMaterial, purchasePrice: Number(e.target.value) })
                        }
                        className="w-full bg-white border border-[#cbd5e1] rounded-[2px] pl-6 pr-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <span className="text-[10px] text-[#64748b] block mt-1">进货入库时默认以此价格计入流水</span>
                  </div>

                  {/* 合作供应商名称 */}
                  <div 
                    ref={editFieldRefs.supplier}
                    className={`p-2.5 rounded-[3px] border transition-all ${
                      editHighlightField === 'supplier' ? 'ring-2 ring-purple-500 border-purple-500 bg-purple-100/70 shadow-xs' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] text-[#0f172a] font-bold flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-purple-600" />
                        <span>合作供应商名称 (Supplier) *</span>
                      </label>
                      {editHighlightField === 'supplier' && (
                        <span className="text-[10px] text-purple-700 font-bold">正在修改合作供应商</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={editingMaterial.supplier}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, supplier: e.target.value })}
                      placeholder="如 中粮安达直供冷链、蜀海供应链..."
                      className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-bold focus:outline-none focus:border-purple-600"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['中粮安达直供冷链', '蜀海北京总仓', '恒阳冷链配送中心', '华东牛羊批发基地', '大红门屠宰直供', '自选优选直供'].map((sup) => (
                        <button
                          key={sup}
                          type="button"
                          onClick={() => setEditingMaterial({ ...editingMaterial, supplier: sup })}
                          className={`px-1.5 py-0.5 text-[9.5px] border rounded-[2px] cursor-pointer transition-colors ${
                            editingMaterial.supplier === sup
                              ? 'bg-purple-600 text-white border-purple-600 font-bold'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {sup}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 对接联系人与通讯 */}
                <div 
                  ref={editFieldRefs.supplierContact}
                  className={`p-2.5 rounded-[3px] border transition-all ${
                    editHighlightField === 'supplierContact' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-100/70 shadow-xs' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] text-[#0f172a] font-bold flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>对接联系人与联络通讯</span>
                    </label>
                    {editHighlightField === 'supplierContact' && (
                      <span className="text-[10px] text-blue-700 font-bold">正在修改对接联系人</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10.5px] text-[#64748b] font-medium mb-1">对接联系人姓名</label>
                      <input
                        type="text"
                        value={editingMaterial.supplierContact || ''}
                        onChange={(e) =>
                          setEditingMaterial({ ...editingMaterial, supplierContact: e.target.value })
                        }
                        placeholder="如 张经理 / 李厂长"
                        className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-medium focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] text-[#64748b] font-medium mb-1">联系电话 / 微信</label>
                      <input
                        type="text"
                        value={editingMaterial.supplierPhone || ''}
                        onChange={(e) =>
                          setEditingMaterial({ ...editingMaterial, supplierPhone: e.target.value })
                        }
                        placeholder="如 138-0000-0000"
                        className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] text-[#64748b] font-medium mb-1">供货周期 (天)</label>
                      <input
                        type="number"
                        value={editingMaterial.supplierLeadDays || 1}
                        onChange={(e) =>
                          setEditingMaterial({ ...editingMaterial, supplierLeadDays: Number(e.target.value) })
                        }
                        className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Storage & Temperature */}
              <div className="space-y-2.5 pt-1 p-2.5 rounded-[3px] border border-slate-200 bg-slate-50/50">
                <h4 className="font-bold text-[#0f172a] text-xs flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-sky-600" />
                    <span>5. 存放库位、温区控制与保质期档案</span>
                  </span>
                  {(editHighlightField === 'storageTempZone' || editHighlightField === 'shelfLife' || editHighlightField === 'storageLocation') && (
                    <span className="text-[10px] bg-sky-600 text-white font-bold px-1.5 py-0.2 rounded-xs shadow-xs animate-bounce">
                      🎯 当前修改项
                    </span>
                  )}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 存储温区 */}
                  <div 
                    ref={editFieldRefs.storageTempZone}
                    className={`p-2.5 rounded-[3px] border transition-all ${
                      editHighlightField === 'storageTempZone' ? 'ring-2 ring-sky-500 border-sky-500 bg-sky-100/70 shadow-xs' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] text-[#0f172a] font-bold flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-sky-600" />
                        <span>存储温区 (Temperature Zone) *</span>
                      </label>
                      {editHighlightField === 'storageTempZone' && (
                        <span className="text-[10px] text-sky-700 font-bold">正在修改存储温区</span>
                      )}
                    </div>
                    <select
                      value={editingMaterial.storageTempZone || '冷藏 0-4℃'}
                      onChange={(e) =>
                        setEditingMaterial({ ...editingMaterial, storageTempZone: e.target.value })
                      }
                      className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-bold focus:outline-none focus:border-sky-600"
                    >
                      <option value="冷冻 -18℃">冷冻 -18℃</option>
                      <option value="冷藏 0-4℃">冷藏 0-4℃</option>
                      <option value="微冻 -2~0℃">微冻 -2~0℃</option>
                      <option value="恒温 12-15℃">恒温 12-15℃</option>
                      <option value="常温阴凉通风">常温阴凉通风</option>
                    </select>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['冷冻 -18℃', '冷藏 0-4℃', '微冻 -2~0℃', '恒温 12-15℃', '常温阴凉通风'].map((temp) => (
                        <button
                          key={temp}
                          type="button"
                          onClick={() => setEditingMaterial({ ...editingMaterial, storageTempZone: temp })}
                          className={`px-1.5 py-0.5 text-[9.5px] border rounded-[2px] cursor-pointer transition-colors ${
                            editingMaterial.storageTempZone === temp
                              ? 'bg-sky-600 text-white border-sky-600 font-bold'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {temp}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 保质期与批号 */}
                  <div 
                    ref={editFieldRefs.shelfLife}
                    className={`p-2.5 rounded-[3px] border transition-all ${
                      editHighlightField === 'shelfLife' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-100/70 shadow-xs' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] text-[#0f172a] font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>保质期天数与批号 *</span>
                      </label>
                      {editHighlightField === 'shelfLife' && (
                        <span className="text-[10px] text-emerald-700 font-bold">正在修改保质期与批号</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-[#64748b] block mb-0.5">保质期 (天)</span>
                        <input
                          type="number"
                          value={editingMaterial.shelfLifeDays || 7}
                          onChange={(e) =>
                            setEditingMaterial({ ...editingMaterial, shelfLifeDays: Number(e.target.value) })
                          }
                          className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2 py-1.5 text-xs text-[#0f172a] font-mono font-bold focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#64748b] block mb-0.5">生产批号 (LOT)</span>
                        <input
                          type="text"
                          value={editingMaterial.batchNo || ''}
                          onChange={(e) =>
                            setEditingMaterial({ ...editingMaterial, batchNo: e.target.value })
                          }
                          placeholder="LOT-20260907"
                          className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 存放库位 */}
                <div 
                  ref={editFieldRefs.storageLocation}
                  className={`p-2.5 rounded-[3px] border transition-all ${
                    editHighlightField === 'storageLocation' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-100/70 shadow-xs' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] text-[#0f172a] font-bold flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>存放库位 (Storage Location)</span>
                    </label>
                    {editHighlightField === 'storageLocation' && (
                      <span className="text-[10px] text-blue-700 font-bold">正在修改存放库位</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editingMaterial.storageLocation}
                    onChange={(e) =>
                      setEditingMaterial({ ...editingMaterial, storageLocation: e.target.value })
                    }
                    placeholder="如 餐车急冻抽屉 B-02 / 冷库 A-03"
                    className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-blue-600"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['冷库 A-01', '冷库 A-02', '冷库 B-03', '餐车急冻抽屉 B-02', '中央仓保鲜区 C-01'].map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setEditingMaterial({ ...editingMaterial, storageLocation: loc })}
                        className={`px-1.5 py-0.5 text-[9.5px] border rounded-[2px] cursor-pointer transition-colors ${
                          editingMaterial.storageLocation === loc
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#f8fafc] px-4 py-3 border-t border-[#e2e8f0] flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteMaterial(editingMaterial.id, editingMaterial.name)}
                className="text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer text-xs font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>删除档案</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditMaterial}
                  className="px-4 py-1.5 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>保存修改并生效</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Create New Raw Material (新建原料档案) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[4px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs my-6">
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-bold">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0f172a]">新建原料档案与库存基准</h3>
                  <p className="text-[11px] text-[#64748b]">录入新食材或消耗物料，设定安全库存与直通供应商</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">原料品名 *</label>
                  <input
                    type="text"
                    placeholder="如：内蒙古锡盟羔羊后腿肉"
                    value={createForm.name || ''}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-bold focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">SKU 编码</label>
                  <input
                    type="text"
                    value={createForm.sku || ''}
                    onChange={(e) => setCreateForm({ ...createForm, sku: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs font-mono text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">品类划分</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as any })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  >
                    {categories.filter((c) => c !== '全部').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">计量单位</label>
                  <input
                    type="text"
                    placeholder="kg, 份, 箱, 串..."
                    value={createForm.unit || 'kg'}
                    onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">规格包装</label>
                  <input
                    type="text"
                    placeholder="如 1kg/袋, 25kg/箱"
                    value={createForm.spec || ''}
                    onChange={(e) => setCreateForm({ ...createForm, spec: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>

              {/* Stock & Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#f8fafc] p-3 rounded-[3px] border border-[#e2e8f0]">
                <div>
                  <label className="block text-[11px] text-[#0f172a] font-bold mb-1">期初库存量 *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={createForm.currentStock}
                    onChange={(e) => setCreateForm({ ...createForm, currentStock: Number(e.target.value) })}
                    className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-red-600 font-bold mb-1">安全库存警戒线 *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={createForm.safetyStock}
                    onChange={(e) => setCreateForm({ ...createForm, safetyStock: Number(e.target.value) })}
                    className="w-full bg-white border border-red-300 rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-red-600 focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">建议补货量</label>
                  <input
                    type="number"
                    step="0.1"
                    value={createForm.reorderSuggestion}
                    onChange={(e) => setCreateForm({ ...createForm, reorderSuggestion: Number(e.target.value) })}
                    className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>

              {/* Price & Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#0f172a] font-bold mb-1">参考采购价格 (元/单位) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={createForm.purchasePrice}
                    onChange={(e) => setCreateForm({ ...createForm, purchasePrice: Number(e.target.value) })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">合作商名称 *</label>
                  <input
                    type="text"
                    placeholder="如 威海乳山直供海产"
                    value={createForm.supplier || ''}
                    onChange={(e) => setCreateForm({ ...createForm, supplier: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-semibold focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">存放库位</label>
                  <input
                    type="text"
                    value={createForm.storageLocation || '冷库 A-01'}
                    onChange={(e) => setCreateForm({ ...createForm, storageLocation: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">温区控制</label>
                  <select
                    value={createForm.storageTempZone || '冷藏 0-4℃'}
                    onChange={(e) => setCreateForm({ ...createForm, storageTempZone: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  >
                    <option value="冷冻 -18℃">冷冻 -18℃</option>
                    <option value="冷藏 0-4℃">冷藏 0-4℃</option>
                    <option value="恒温 12-15℃">恒温 12-15℃</option>
                    <option value="常温阴凉通风">常温阴凉通风</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">保质期 (天)</label>
                  <input
                    type="number"
                    value={createForm.shelfLifeDays || 7}
                    onChange={(e) => setCreateForm({ ...createForm, shelfLifeDays: Number(e.target.value) })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#f8fafc] px-4 py-3 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3 py-1.5 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateMaterial}
                className="px-4 py-1.5 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>完成录入并归档</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Quick Stock Adjustment (盘点校准弹窗) */}
      {adjustModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-[4px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-sm text-[#0f172a]">实盘校准与快速库存调整</h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalItem(null)}
                className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-[#f8fafc] p-3 rounded-[3px] border border-[#e2e8f0] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#0f172a]">{adjustModalItem.name}</span>
                  <span className="font-mono text-xs text-[#64748b]">{adjustModalItem.sku}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#64748b]">
                  <span>系统账面结存:</span>
                  <span className="font-mono font-bold text-[#0f172a]">
                    {adjustModalItem.currentStock} {adjustModalItem.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#0f172a] font-bold mb-1">
                  实盘修正后在库量 ({adjustModalItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={adjustTargetStock}
                  onChange={(e) => setAdjustTargetStock(Number(e.target.value))}
                  className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-3 py-2 font-mono font-bold text-base text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">调整原因与备注</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                >
                  <option value="日常实盘校对修正">日常实盘校对修正</option>
                  <option value="备料损耗与切配余量">备料损耗与切配余量</option>
                  <option value="早市验货误差盘点">早市验货误差盘点</option>
                  <option value="打烊封账清点实物">打烊封账清点实物</option>
                </select>
              </div>

              {/* Variance display */}
              <div className="p-2.5 rounded-[2px] bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-[#64748b]">差额波动：</span>
                <span
                  className={`font-mono font-bold ${
                    adjustTargetStock - adjustModalItem.currentStock >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {adjustTargetStock - adjustModalItem.currentStock >= 0 ? '+' : ''}
                  {(adjustTargetStock - adjustModalItem.currentStock).toFixed(1)} {adjustModalItem.unit}
                </span>
              </div>
            </div>

            <div className="bg-[#f8fafc] px-4 py-2.5 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdjustModalItem(null)}
                className="px-3 py-1 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjust}
                className="px-3.5 py-1 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>确认校准并保存</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Quick Restock Modal (采购详情与快捷补货弹窗) */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-lg rounded-[3px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-bold">
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h3 className="font-bold text-sm text-[#0f172a]">原料档案与快捷补货入库</h3>
              </div>
              <button
                type="button"
                onClick={() => setRestockModalItem(null)}
                className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              {/* Material Info Card */}
              <div className="bg-[#f8fafc] p-3 rounded-[3px] border border-[#e2e8f0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#0f172a]">{restockModalItem.name}</span>
                  <span className="font-mono text-xs text-[#64748b]">{restockModalItem.sku}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#64748b]">当前库存:</span>
                    <div className="font-mono font-bold text-[#0f172a]">
                      {restockModalItem.currentStock} {restockModalItem.unit}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748b]">安全警戒线:</span>
                    <div className="font-mono text-red-600 font-bold">
                      {restockModalItem.safetyStock} {restockModalItem.unit}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748b]">库位:</span>
                    <div className="text-[#0f172a]">{restockModalItem.storageLocation}</div>
                  </div>
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                    合作供应商 (带建议直供标)
                  </label>
                  <select
                    value={restockSupplier}
                    onChange={(e) => setRestockSupplier(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  >
                    <option value={restockModalItem.supplier}>
                      {restockModalItem.supplier} {restockModalItem.supplierSuggest ? '⭐ [官方推荐直供]' : ''}
                    </option>
                    {allSuppliers.map((sup) => (
                      <option key={sup} value={sup}>{sup}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                      进货单价 (元/{restockModalItem.unit})
                    </label>
                    <input
                      type="number"
                      value={restockPrice}
                      onChange={(e) => setRestockPrice(Number(e.target.value))}
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748b] font-medium mb-1">
                      补货数量 ({restockModalItem.unit})
                    </label>
                    <input
                      type="number"
                      value={restockQty}
                      onChange={(e) => setRestockQty(Number(e.target.value))}
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">入库备注</label>
                  <input
                    type="text"
                    placeholder="如：早市清晨冷链验货合格"
                    value={restockNote}
                    onChange={(e) => setRestockNote(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>

                {/* Calculation Summary */}
                <div className="bg-[#f0fdf4] p-2.5 rounded-[2px] border border-[#bbf7d0] flex items-center justify-between text-xs">
                  <span className="text-[#166534] font-medium">本次补货总支出：</span>
                  <span className="font-mono font-bold text-[#16a34a] text-sm">
                    ¥{(restockQty * restockPrice).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#f8fafc] px-4 py-2.5 border-t border-[#e2e8f0] flex items-center justify-between">
              <span className="text-[11px] text-[#64748b]">提交后系统将自动累加理论库存并记录流水</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="px-3 py-1 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestock}
                  className="px-3.5 py-1 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>立刻进货入库</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: New Purchase Order Modal */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-lg rounded-[3px] border border-[#e2e8f0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] bg-[#0f172a] text-white flex items-center justify-center font-bold">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h3 className="font-bold text-sm text-[#0f172a]">下发新采购订单 (PO Generation)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">采购原料品名</label>
                <select
                  value={newOrderForm.sku}
                  onChange={(e) => {
                    const found = materials.find((m) => m.sku === e.target.value);
                    if (found) {
                      setNewOrderForm({
                        ...newOrderForm,
                        sku: found.sku,
                        itemName: found.name,
                        category: found.category,
                        supplier: found.supplier,
                        unit: found.unit,
                        unitPrice: found.purchasePrice
                      });
                    }
                  }}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                >
                  {materials.map((m) => (
                    <option key={m.sku} value={m.sku}>
                      {m.name} ({m.sku}) - 存量 {m.currentStock}{m.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">采购渠道平台</label>
                  <select
                    value={newOrderForm.platformName}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, platformName: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  >
                    <option value="美菜网 (企业餐饮供应链平台)">美菜网 (企业餐饮供应链平台)</option>
                    <option value="快驴进货 (美团餐饮供应链)">快驴进货 (美团餐饮供应链)</option>
                    <option value="冻品在线 (华东冷链集配)">冻品在线 (华东冷链集配)</option>
                    <option value="江桥批发大市场 (线下大宗档口)">江桥批发大市场 (线下大宗档口)</option>
                    <option value="农副产品批发市场小程序直订">农副产品批发市场小程序直订</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">采购方式</label>
                  <select
                    value={newOrderForm.procurementMethod}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, procurementMethod: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  >
                    <option value="平台采购">平台采购 (在线下单+冷链配送)</option>
                    <option value="批发市场自提">批发市场自提 (清晨现金/货到付款)</option>
                    <option value="批发市场小程序直订">批发市场小程序直订 (档口现称现发)</option>
                    <option value="基地源头直发">基地源头直发 (冷链专车)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">合作供应商 / 档口</label>
                  <input
                    type="text"
                    value={newOrderForm.supplier}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, supplier: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">品牌名称</label>
                  <input
                    type="text"
                    placeholder="如：双汇 / 恒阳食品 / 泰森"
                    value={newOrderForm.brand}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, brand: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>

              {/* 采购规格换算：克重 × 包数 × 件数 ≈ 公斤 */}
              <div className="bg-amber-50/70 p-2.5 rounded-[2px] border border-amber-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-amber-900 font-bold">
                  <span>采购规格包装换算 (克重 × 包数 × 件数)</span>
                  <span className="font-mono text-emerald-700">
                    折算总重 ≈ {((newOrderForm.specGramsPerPack * newOrderForm.specPacksPerBox * newOrderForm.specBoxes) / 1000).toFixed(2)} kg
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-0.5">单包克重 (g)</label>
                    <input
                      type="number"
                      value={newOrderForm.specGramsPerPack}
                      onChange={(e) => {
                        const grams = Number(e.target.value);
                        const totalKg = (grams * newOrderForm.specPacksPerBox * newOrderForm.specBoxes) / 1000;
                        setNewOrderForm({ ...newOrderForm, specGramsPerPack: grams, quantity: totalKg });
                      }}
                      className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2 py-1 font-mono text-xs text-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-0.5">每箱包数 (包)</label>
                    <input
                      type="number"
                      value={newOrderForm.specPacksPerBox}
                      onChange={(e) => {
                        const packs = Number(e.target.value);
                        const totalKg = (newOrderForm.specGramsPerPack * packs * newOrderForm.specBoxes) / 1000;
                        setNewOrderForm({ ...newOrderForm, specPacksPerBox: packs, quantity: totalKg });
                      }}
                      className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2 py-1 font-mono text-xs text-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-0.5">采购件数 (件/箱)</label>
                    <input
                      type="number"
                      value={newOrderForm.specBoxes}
                      onChange={(e) => {
                        const boxes = Number(e.target.value);
                        const totalKg = (newOrderForm.specGramsPerPack * newOrderForm.specPacksPerBox * boxes) / 1000;
                        setNewOrderForm({ ...newOrderForm, specBoxes: boxes, quantity: totalKg });
                      }}
                      className="w-full bg-white border border-[#cbd5e1] rounded-[2px] px-2 py-1 font-mono text-xs text-[#0f172a]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">采购总量 ({newOrderForm.unit})</label>
                  <input
                    type="number"
                    value={newOrderForm.quantity}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, quantity: Number(e.target.value) })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono font-bold text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">每公斤单价 (元/kg)</label>
                  <input
                    type="number"
                    value={newOrderForm.unitPrice}
                    onChange={(e) => {
                      const p = Number(e.target.value);
                      setNewOrderForm({ ...newOrderForm, unitPrice: p, pricePerKg: p });
                    }}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 font-mono text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">配送送达指定地点</label>
                  <input
                    type="text"
                    value={newOrderForm.destinationLocation}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, destinationLocation: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748b] font-medium mb-1">产品标准号</label>
                  <input
                    type="text"
                    value={newOrderForm.standardCode}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, standardCode: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#64748b] font-medium mb-1">订单要求与发货说明</label>
                <input
                  type="text"
                  value={newOrderForm.notes}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[2px] px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
                />
              </div>

              <div className="bg-[#eff6ff] p-2.5 rounded-[2px] border border-[#bfdbfe] flex items-center justify-between text-xs">
                <span className="text-[#1e40af] font-medium">预计订单总额：</span>
                <span className="font-mono font-bold text-[#2563eb] text-sm">
                  ¥{(newOrderForm.quantity * newOrderForm.unitPrice).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="bg-[#f8fafc] px-4 py-2.5 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="px-3 py-1 rounded-[2px] bg-white text-[#64748b] border border-[#cbd5e1] hover:bg-[#f1f5f9] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateNewOrder}
                className="px-3.5 py-1 rounded-[2px] bg-[#0f172a] text-white hover:bg-black font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-sky-400" />
                <span>下发采购单</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Material Template Library Modal (原料档案与安全库存模板调用中心) */}
      <MaterialTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        existingMaterials={materials}
        onApplyTemplate={handleApplyTemplate}
        onApplyAndStockIn={handleApplyAndStockIn}
        onBatchApplyTemplates={handleBatchApplyTemplates}
        showToast={showToast}
      />

      {/* MODAL 6: Material Manual Stock-In (On-Shelf) Modal (商家手动验收入库上架) */}
      <MaterialStockInModal
        isOpen={isStockInModalOpen}
        onClose={() => {
          setIsStockInModalOpen(false);
          setStockInTargetMaterial(null);
        }}
        material={stockInTargetMaterial}
        onConfirmStockIn={handleConfirmStockIn}
      />

      {/* MODAL 7: Weight & Skewer Yield Calculator (重量除以数量测算器) */}
      <WeightSkewerCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        defaultKg={calcModalDefaultKg}
        defaultPricePerKg={calcModalDefaultPrice}
        defaultMaterialName={calcModalDefaultName}
      />

      {/* MODAL 8: Raw Material Skewer Processing & On-Sale Ledger (原料穿串与在售台账) */}
      <SkewerProcessingModal
        isOpen={isProcessingModalOpen}
        onClose={() => {
          setIsProcessingModalOpen(false);
          setProcessingTargetMaterial(null);
          setProcessingHighlightField(null);
        }}
        materials={materials}
        selectedMaterial={processingTargetMaterial}
        onConfirmProcessing={handleConfirmProcessing}
        showToast={showToast}
        highlightField={processingHighlightField}
      />

      {/* MODAL 9: Full Purchase Detail & Traceability Archive (全量采购商品资质溯源档案) */}
      <PurchaseDetailTraceModal
        isOpen={isTraceModalOpen}
        onClose={() => {
          setIsTraceModalOpen(false);
          setSelectedTraceRecord(null);
        }}
        record={selectedTraceRecord}
        onUpdateRecord={handleUpdateTraceRecord}
        showToast={showToast}
      />

      {/* 右侧折叠内嵌式多账号物料操作对比与版本恢复审计抽屉 */}
      <AccountAuditDrawer
        currentModule="materials"
        title="原料耗材操作审计与版本恢复"
        showToast={showToast}
        onRestoreSuccess={() => {
          showToast('原料数据已恢复至历史版本！');
        }}
      />
    </div>
  );
};
