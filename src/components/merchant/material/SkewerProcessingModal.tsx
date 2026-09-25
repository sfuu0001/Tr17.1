import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Flame,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Layers,
  Sparkles,
  ShoppingBag,
  Scale,
  DollarSign,
  ArrowRight,
  Plus,
  Trash2,
  Clock,
  History,
  Info,
  Search,
  Check,
  RefreshCw,
  Wand2,
  Calculator,
  Eye,
  Utensils,
  Package,
  Boxes,
  Link,
  Unlink,
  Tag,
  ChevronRight,
  Sliders,
  TrendingUp,
  FileText,
  BadgeCheck
} from 'lucide-react';
import { MaterialItem, DishItem } from '../../../types';
import { INITIAL_DISHES } from '../../../data/mockData';
import { safeGetStorage, safeSetStorage } from '../../../utils/safeStorage';
import { WeightSkewerCalculatorModal } from './WeightSkewerCalculatorModal';

interface SkewerProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: MaterialItem[];
  selectedMaterial: MaterialItem | null;
  onConfirmProcessing: (params: {
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
  }) => void;
  showToast: (msg: string) => void;
  highlightField?: string | null;
}

// 常见餐车与后厨库位预设
const STORAGE_LOCATION_PRESETS = [
  '餐车车载急冻抽屉 B-02 (急冻-18℃)',
  '餐车主冷冻立柜 A-01 (冷冻-18℃)',
  '餐车生鲜保鲜冰槽 C-01 (微冻0℃)',
  '车载出餐保温展示柜 D-01 (恒温)',
  '中央后厨预制冷库 01 号架',
  '流动餐车后储藏保鲜抽屉 03',
  '常温干货通风备料架 02'
];

// 推荐菜品图片库 (丰富串串品类实拍与手绘)
const DEFAULT_SKEWER_IMAGES = [
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'
];

export const SkewerProcessingModal: React.FC<SkewerProcessingModalProps> = ({
  isOpen,
  onClose,
  materials,
  selectedMaterial,
  onConfirmProcessing,
  showToast,
  highlightField
}) => {
  const [activeMatId, setActiveMatId] = useState<string>('');
  const [isFinishedSkewer, setIsFinishedSkewer] = useState<boolean>(false);
  const [yieldSkewerCount, setYieldSkewerCount] = useState<number>(100);
  const [skewerLocation, setSkewerLocation] = useState<string>(STORAGE_LOCATION_PRESETS[0]);
  const [isOnSale, setIsOnSale] = useState<boolean>(true);
  const [linkedDishName, setLinkedDishName] = useState<string>('');
  const [linkedDishId, setLinkedDishId] = useState<string>('');
  
  // 原料使用与消耗
  const [isUsed, setIsUsed] = useState<boolean>(true);
  const [usedQuantity, setUsedQuantity] = useState<number>(2.5);
  const [operator, setOperator] = useState<string>('张主厨 (串烤工位)');
  const [notes, setNotes] = useState<string>('按标准工艺切丁腌制后手工穿串');

  // 当前高亮字段 (支持外部点击传入与内部快速导航切换)
  const [activeHighlightField, setActiveHighlightField] = useState<string | null>(highlightField || null);

  // 商品联动与新增状态
  const [dishes, setDishes] = useState<DishItem[]>(() => {
    return safeGetStorage<DishItem[]>('obsidian_truck_dishes', INITIAL_DISHES);
  });
  const [dishSearchKeyword, setDishSearchKeyword] = useState<string>('');
  const [dishCategoryFilter, setDishCategoryFilter] = useState<string>('all');
  const [dishMode, setDishMode] = useState<'select' | 'create'>('select');
  const [isDishDropdownOpen, setIsDishDropdownOpen] = useState(false);

  // 新增菜品表单
  const [newDishName, setNewDishName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState(4.0);
  const [newDishCategory, setNewDishCategory] = useState<'skewers' | 'yakitori' | 'mains'>('skewers');
  const [newDishDesc, setNewDishDesc] = useState('');
  const [newDishImage, setNewDishImage] = useState(DEFAULT_SKEWER_IMAGES[0]);
  const [customImageUrl, setCustomImageUrl] = useState('');

  // 自动化组件辅助状态
  const [autoFlavor, setAutoFlavor] = useState('新疆孜然');
  const [autoTargetMargin, setAutoTargetMargin] = useState(65); // 目标毛利率 65%
  const [targetGramPerSkewer, setTargetGramPerSkewer] = useState<number>(25); // 单串目标克重 (g)

  // 原料配套与辅助耗材清单核算选项
  const [includeBOMSupplies, setIncludeBOMSupplies] = useState<boolean>(true);

  // 品牌与包装规格
  const [brand, setBrand] = useState<string>('自选优选');
  const [spec, setSpec] = useState<string>('');
  const [specGramsPerPack, setSpecGramsPerPack] = useState<number>(500);
  const [specPacksPerBox, setSpecPacksPerBox] = useState<number>(20);
  const [pricePerKg, setPricePerKg] = useState<number>(48);

  // 打开重量测算器
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  // 元素高亮定位 Refs
  const fieldRefs = {
    isFinishedSkewer: useRef<HTMLDivElement>(null),
    usedQuantity: useRef<HTMLDivElement>(null),
    yieldSkewerCount: useRef<HTMLDivElement>(null),
    skewerLocation: useRef<HTMLDivElement>(null),
    isOnSale: useRef<HTMLDivElement>(null),
    linkedDishName: useRef<HTMLDivElement>(null),
    matchingSupplies: useRef<HTMLDivElement>(null),
    brandSpec: useRef<HTMLDivElement>(null)
  };

  // 刷新全量菜品
  const refreshDishes = () => {
    const latest = safeGetStorage<DishItem[]>('obsidian_truck_dishes', INITIAL_DISHES);
    setDishes(latest);
  };

  useEffect(() => {
    if (isOpen) {
      refreshDishes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (highlightField) {
      setActiveHighlightField(highlightField);
    }
  }, [highlightField]);

  useEffect(() => {
    if (selectedMaterial) {
      setActiveMatId(selectedMaterial.id);
      setIsFinishedSkewer(selectedMaterial.isFinishedSkewer || false);
      setYieldSkewerCount(selectedMaterial.yieldSkewerCount || (selectedMaterial.unit === '串' ? selectedMaterial.currentStock : 100));
      setSkewerLocation(selectedMaterial.skewerLocation || selectedMaterial.storageLocation || STORAGE_LOCATION_PRESETS[0]);
      setIsOnSale(selectedMaterial.isOnSale !== undefined ? selectedMaterial.isOnSale : true);
      setLinkedDishName(selectedMaterial.linkedDishName || selectedMaterial.name);
      setLinkedDishId(selectedMaterial.linkedDishId || '');
      setIsUsed(selectedMaterial.isUsed !== undefined ? selectedMaterial.isUsed : true);
      setUsedQuantity(selectedMaterial.usedQuantity || Math.min(selectedMaterial.currentStock || 5, 2.5));

      setBrand(selectedMaterial.brand || '自选优选');
      setSpec(selectedMaterial.spec || '');
      setSpecGramsPerPack(selectedMaterial.specGramsPerPack || 500);
      setSpecPacksPerBox(selectedMaterial.specPacksPerBox || 20);
      setPricePerKg(selectedMaterial.pricePerKg || selectedMaterial.purchasePrice || 48);

      // 默认新菜品预填
      setNewDishName(`秘制${selectedMaterial.name.replace(/原料|生鲜|鲜品|原切/g, '')}串`);
      setNewDishDesc(`精选优质${selectedMaterial.name}，匠心现切穿制，火候锁鲜炙烤。`);
    } else if (materials.length > 0 && !activeMatId) {
      setActiveMatId(materials[0].id);
      setLinkedDishName(materials[0].name);
      setNewDishName(`秘制${materials[0].name}串`);
      setBrand(materials[0].brand || '自选优选');
      setSpec(materials[0].spec || '');
      setSpecGramsPerPack(materials[0].specGramsPerPack || 500);
      setSpecPacksPerBox(materials[0].specPacksPerBox || 20);
      setPricePerKg(materials[0].pricePerKg || materials[0].purchasePrice || 48);
    }
  }, [selectedMaterial, materials, activeMatId]);

  // 高亮定位滚动与聚焦
  useEffect(() => {
    if (isOpen && activeHighlightField) {
      const targetKey = (activeHighlightField === 'brand' || activeHighlightField === 'brandSpecs') 
        ? 'brandSpec' 
        : activeHighlightField;
      const targetElem = fieldRefs[targetKey as keyof typeof fieldRefs]?.current;
      if (targetElem) {
        const timer = setTimeout(() => {
          targetElem.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          const input = targetElem.querySelector('input, select');
          if (input) {
            (input as HTMLElement).focus();
            if ('select' in input && typeof (input as HTMLInputElement).select === 'function') {
              (input as HTMLInputElement).select();
            }
          }
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, activeHighlightField]);

  if (!isOpen) return null;

  const currentMat = materials.find((m) => m.id === activeMatId) || selectedMaterial || materials[0];

  const handleMatSelectChange = (id: string) => {
    setActiveMatId(id);
    const target = materials.find((m) => m.id === id);
    if (target) {
      setIsFinishedSkewer(target.isFinishedSkewer || false);
      setYieldSkewerCount(target.yieldSkewerCount || 100);
      setSkewerLocation(target.skewerLocation || target.storageLocation || STORAGE_LOCATION_PRESETS[0]);
      setIsOnSale(target.isOnSale !== undefined ? target.isOnSale : true);
      setLinkedDishName(target.linkedDishName || target.name);
      setLinkedDishId(target.linkedDishId || '');
      setUsedQuantity(target.usedQuantity || Math.min(target.currentStock || 5, 2.5));
      setNewDishName(`秘制${target.name.replace(/原料|生鲜|鲜品|原切/g, '')}串`);
      setNewDishDesc(`精选新鲜${target.name}，手工切配穿制，炙烤多汁。`);
    }
  };

  // 测算单串平均克重与成本
  const safeUsedQty = Math.max(0.01, Number(usedQuantity) || 0);
  const safeYieldCount = Math.max(1, Number(yieldSkewerCount) || 1);
  const calculatedAvgGrams = ((safeUsedQty * 1000) / safeYieldCount).toFixed(1);
  const calculatedCostPerSkewer = currentMat ? ((safeUsedQty * currentMat.purchasePrice) / safeYieldCount) : 0;
  const displayCostPerSkewer = calculatedCostPerSkewer.toFixed(2);

  // 原料配套与辅助耗材 BOM 测算
  // 1. 竹签: 1 串 / 根, 参考单价 ¥0.02/根
  const bambooSkewersCount = safeYieldCount;
  const bambooSkewersCost = bambooSkewersCount * 0.02;

  // 2. 调味撒料: 2.5g / 串, 参考单价 ¥32/kg
  const seasoningKg = Number(((safeYieldCount * 2.5) / 1000).toFixed(3));
  const seasoningCost = seasoningKg * 32.0;

  // 3. 保温防油外卖袋: 5 串 / 袋, 参考单价 ¥0.25/个
  const packagingBagsCount = Math.ceil(safeYieldCount / 5);
  const packagingCost = packagingBagsCount * 0.25;

  // 配套耗材总额与单串辅料折合
  const totalAuxiliaryCost = bambooSkewersCost + seasoningCost + packagingCost;
  const auxiliaryCostPerSkewer = totalAuxiliaryCost / safeYieldCount;
  const totalUnitCost = (calculatedCostPerSkewer + auxiliaryCostPerSkewer).toFixed(2);

  // 自动化：智能推荐售价 (基于综合全套单串成本与目标毛利率)
  const recommendedPrice = Number(totalUnitCost) > 0
    ? (Number(totalUnitCost) / (1 - autoTargetMargin / 100)).toFixed(1)
    : '4.5';

  // 自动化：根据风味与出串一键生成商品名与描述
  const handleAutoGenerateDishName = () => {
    if (!currentMat) return;
    const baseName = currentMat.name.replace(/原料|生切|鲜冻|冷冻|批发|优选/g, '').trim();
    const generated = `${autoFlavor}现烤${baseName}串 (约${calculatedAvgGrams}g)`;
    setNewDishName(generated);
    setNewDishPrice(Number(recommendedPrice));
    setNewDishDesc(`主厨特调制法，选用新鲜${baseName}，单串保真净肉约${calculatedAvgGrams}克，${autoFlavor}，外焦里嫩。`);
    showToast(`自动化组件已生成菜品信息与建议售价 ¥${recommendedPrice}`);
  };

  // 自动化：按目标单串克重反向推算总串数
  const handleAutoCalcCountFromGrams = () => {
    const gram = Math.max(1, Number(targetGramPerSkewer) || 25);
    const count = Math.floor((safeUsedQty * 1000) / gram);
    if (count > 0) {
      setYieldSkewerCount(count);
      showToast(`已按单串约 ${gram}g 反向推算制成串数: ${count} 串`);
    }
  };

  // 筛选已有菜品
  const filteredDishes = dishes.filter((dish) => {
    const matchKw = !dishSearchKeyword ||
      dish.name.toLowerCase().includes(dishSearchKeyword.toLowerCase()) ||
      dish.category.toLowerCase().includes(dishSearchKeyword.toLowerCase());
    const matchCat = dishCategoryFilter === 'all' || dish.category === dishCategoryFilter;
    return matchKw && matchCat;
  });

  // 选中已有菜品进行联动
  const handleSelectDish = (dish: DishItem) => {
    setLinkedDishName(dish.name);
    setLinkedDishId(dish.id);
    setIsDishDropdownOpen(false);
    showToast(`已成功切换并联动菜品【${dish.name}】(售价: ¥${dish.price.toFixed(2)})`);
  };

  // 解除绑定
  const handleUnlinkDish = () => {
    setLinkedDishName('');
    setLinkedDishId('');
    showToast('已解除关联菜品');
  };

  // 快速创建新菜品并立即联动
  const handleCreateAndLinkDish = () => {
    if (!newDishName.trim()) {
      alert('请填写新菜品名称！');
      return;
    }
    const finalPrice = Math.max(0.1, Number(newDishPrice) || 4.0);
    const finalImage = customImageUrl.trim() || newDishImage || DEFAULT_SKEWER_IMAGES[0];
    const newDishId = `dish-skewer-${Date.now()}`;
    const newDish: DishItem = {
      id: newDishId,
      name: newDishName.trim(),
      enName: `Grilled ${newDishName.trim()}`,
      category: newDishCategory,
      price: finalPrice,
      description: newDishDesc.trim() || `精选${currentMat?.name || '新鲜原料'}制作，单串保真重约${calculatedAvgGrams}g`,
      imageUrl: finalImage,
      orderType: 'both',
      typeTag: '现烤外卖',
      prepTime: '约6m',
      available: isOnSale,
      flavor: autoFlavor,
      customTags: [autoFlavor, '流动现烤', '手工穿制'],
      craftStandardNote: `由原料【${currentMat?.name}】穿串产出，摆放于【${skewerLocation}】`
    };

    const updatedDishes = [newDish, ...dishes];
    setDishes(updatedDishes);
    safeSetStorage('obsidian_truck_dishes', updatedDishes);
    window.dispatchEvent(new CustomEvent('obsidian_dishes_updated', { detail: updatedDishes }));

    setLinkedDishName(newDish.name);
    setLinkedDishId(newDish.id);
    setDishMode('select');
    showToast(`新菜品【${newDish.name}】已成功创建并联动！实时进入前台供售体系。`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMat) return;

    if (yieldSkewerCount <= 0) {
      alert('穿串制成数量必须大于 0！');
      return;
    }

    const matchingSuppliesSummary = includeBOMSupplies
      ? `配套竹签${bambooSkewersCount}根、秘制撒料${seasoningKg}kg、保温外卖袋${packagingBagsCount}个`
      : undefined;

    onConfirmProcessing({
      materialId: currentMat.id,
      isFinishedSkewer,
      yieldSkewerCount: Number(yieldSkewerCount),
      skewerLocation,
      isOnSale,
      linkedDishName: linkedDishName || currentMat.name,
      linkedDishId: linkedDishId || undefined,
      isUsed,
      usedQuantity: Number(usedQuantity),
      operator,
      notes,
      matchingSuppliesSummary,
      brand,
      spec,
      specGramsPerPack: Number(specGramsPerPack),
      specPacksPerBox: Number(specPacksPerBox),
      pricePerKg: Number(pricePerKg)
    });

    onClose();
  };

  const handleJumpToField = (fieldKey: string) => {
    setActiveHighlightField(fieldKey);
    const targetKey = (fieldKey === 'brand' || fieldKey === 'brandSpecs') ? 'brandSpec' : fieldKey;
    const targetRef = fieldRefs[targetKey as keyof typeof fieldRefs];
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

  // 高亮样式判定
  const getHighlightClass = (fieldName: string) => {
    if (activeHighlightField === fieldName) {
      return 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/90 shadow-md transition-all duration-300';
    }
    return 'border-neutral-200 hover:border-neutral-300 transition-colors';
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-none border border-[#cbd5e1] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-[#e2e8f0] bg-[#0f172a] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-none bg-amber-600/30 border border-amber-500 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white">原料穿串加工 · 联动商品全流程中枢</h2>
                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    SOP v4.2
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  统一原料消耗、串数转化、存放库位、品牌规格、原料配套耗材与前台菜品实时上下架联动
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 快捷字段定位导航中枢 (Quick Field Switcher Ribbon) */}
          <div className="bg-amber-50/90 border-b border-amber-200 px-3.5 py-1.5 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
            <span className="text-[#78350f] font-bold shrink-0 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>快捷跳转修改:</span>
            </span>
            {[
              { key: 'isFinishedSkewer', label: '① 成品形态' },
              { key: 'usedQuantity', label: '② 投料用量' },
              { key: 'yieldSkewerCount', label: '③ 制成串数' },
              { key: 'skewerLocation', label: '④ 存放库位' },
              { key: 'isOnSale', label: '⑤ 在售状态' },
              { key: 'linkedDishName', label: '⑥ 联动商品' },
              { key: 'matchingSupplies', label: '⑦ 原料配套辅料' },
              { key: 'brandSpec', label: '⑧ 品牌规格' }
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => handleJumpToField(f.key)}
                className={`px-2 py-0.5 rounded-none cursor-pointer whitespace-nowrap text-[10.5px] transition-all flex items-center gap-1 ${
                  (activeHighlightField === f.key || (f.key === 'brandSpec' && (activeHighlightField === 'brand' || activeHighlightField === 'brandSpecs')))
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-amber-100/80 border border-amber-200'
                }`}
              >
                <span>{f.label}</span>
                {(activeHighlightField === f.key || (f.key === 'brandSpec' && (activeHighlightField === 'brand' || activeHighlightField === 'brandSpecs'))) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            ))}
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* 1. 原料属性与是否免穿制成品串 */}
            <div 
              ref={fieldRefs.isFinishedSkewer}
              className={`p-3 border rounded-none space-y-3 ${getHighlightClass('isFinishedSkewer')}`}
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>1. 原料选择与成品形态定义</span>
                  {activeHighlightField === 'isFinishedSkewer' && (
                    <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.2 rounded-xs shadow-xs animate-bounce">
                      🎯 当前修改项
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-neutral-700">
                    <input
                      type="checkbox"
                      checked={isFinishedSkewer}
                      onChange={(e) => setIsFinishedSkewer(e.target.checked)}
                      className="rounded-none text-black focus:ring-0 cursor-pointer"
                    />
                    <span className="font-bold">该原料采购本身已是成品串串 (免手工穿制)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-800 mb-1">
                    对应原料资产 *
                  </label>
                  <select
                    value={activeMatId}
                    onChange={(e) => handleMatSelectChange(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.sku}) · 在库: {m.currentStock} {m.unit} · ¥{m.purchasePrice}/{m.unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-white p-2 border border-neutral-200 rounded-none flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-neutral-500">当前在库库存</div>
                    <div className="text-sm font-mono font-bold text-neutral-900 mt-0.5">
                      {currentMat?.currentStock ?? 0} {currentMat?.unit ?? 'kg'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-neutral-500">采购指导单价</div>
                    <div className="text-sm font-mono font-bold text-emerald-700 mt-0.5">
                      ¥{currentMat?.purchasePrice?.toFixed(2) ?? '0.00'}/{currentMat?.unit ?? 'kg'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 投料与消耗记录 */}
            <div 
              ref={fieldRefs.usedQuantity}
              className={`p-3.5 border rounded-none space-y-3 ${getHighlightClass('usedQuantity')}`}
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-blue-600" />
                  <span>2. 投料用量与原料消耗</span>
                  {activeHighlightField === 'usedQuantity' && (
                    <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.2 rounded-xs shadow-xs animate-bounce">
                      🎯 当前修改项
                    </span>
                  )}
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUsed}
                    onChange={(e) => setIsUsed(e.target.checked)}
                    className="rounded-none text-black focus:ring-0 cursor-pointer"
                  />
                  <span className="font-bold text-neutral-800 text-[11px]">
                    {isUsed ? '已投料 · 实扣原料库存' : '尚未投料 (纯预制配置)'}
                  </span>
                </label>
              </div>

              {isUsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-100">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-800 mb-1">
                      本次使用了多少原料 ({currentMat?.unit || 'kg'}) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.05"
                        min="0.01"
                        value={usedQuantity}
                        onChange={(e) => setUsedQuantity(parseFloat(e.target.value) || 0)}
                        className={`w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1.5 font-mono text-sm font-bold text-neutral-900 focus:outline-none focus:border-black ${
                          activeHighlightField === 'usedQuantity' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-100/50' : ''
                        }`}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">
                        {currentMat?.unit || 'kg'}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">
                      扣除后预计在库剩余: {Math.max(0, (currentMat?.currentStock || 0) - safeUsedQty).toFixed(2)} {currentMat?.unit || 'kg'}
                    </div>
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={() => setIsCalcOpen(true)}
                      className="px-3 py-2 bg-white border border-neutral-300 hover:border-black text-neutral-800 rounded-none font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>开启重量除以数量测算器</span>
                    </button>
                    <div className="text-[10px] text-neutral-400 mt-1 text-center">
                      可按自定义公斤与除算串数直接一键导入结果
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. 制成串数与存放位置 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 串数 */}
              <div 
                ref={fieldRefs.yieldSkewerCount}
                className={`p-3 border rounded-none space-y-2 ${getHighlightClass('yieldSkewerCount')}`}
              >
                <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
                  <span className="font-bold text-neutral-900 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    <span>3. 制成串数 (成品出串) *</span>
                  </span>
                  {activeHighlightField === 'yieldSkewerCount' && (
                    <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.2 rounded-xs shadow-xs animate-bounce">
                      🎯 正在编辑
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={yieldSkewerCount}
                    onChange={(e) => setYieldSkewerCount(parseInt(e.target.value, 10) || 1)}
                    className={`w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1.5 font-mono text-sm font-bold text-neutral-900 focus:outline-none focus:border-black ${
                      activeHighlightField === 'yieldSkewerCount' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-100/50' : ''
                    }`}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">
                    串
                  </span>
                </div>
                <div className="text-[10px] text-neutral-500 mt-1 flex items-center justify-between">
                  <span>平均单串净肉: <strong className="text-neutral-900">{calculatedAvgGrams} g/串</strong></span>
                  <span>纯肉单串成本: <strong className="text-emerald-700">¥{displayCostPerSkewer}</strong></span>
                </div>

                {/* 自动化反向推算工具条 */}
                <div className="pt-1.5 border-t border-neutral-200/80 flex items-center justify-between text-[10px]">
                  <span className="text-neutral-500">按标准单串 {targetGramPerSkewer}g 反推:</span>
                  <button
                    type="button"
                    onClick={handleAutoCalcCountFromGrams}
                    className="text-amber-700 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>自动推算</span>
                  </button>
                </div>
              </div>

              {/* 存放库位 */}
              <div 
                ref={fieldRefs.skewerLocation}
                className={`p-3 border rounded-none space-y-2 ${getHighlightClass('skewerLocation')}`}
              >
                <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
                  <span className="font-bold text-neutral-900 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    <span>4. 存放库位与温区 *</span>
                  </span>
                  {activeHighlightField === 'skewerLocation' && (
                    <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.2 rounded-xs shadow-xs animate-bounce">
                      🎯 正在编辑
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={skewerLocation}
                  onChange={(e) => setSkewerLocation(e.target.value)}
                  placeholder="输入存放库位"
                  className={`w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black ${
                    activeHighlightField === 'skewerLocation' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-100/50' : ''
                  }`}
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {STORAGE_LOCATION_PRESETS.slice(0, 3).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setSkewerLocation(loc)}
                      className="px-1.5 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-none text-[9.5px] cursor-pointer"
                    >
                      {loc.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. 在售上架状态设定 */}
            <div 
              ref={fieldRefs.isOnSale}
              className={`p-3 border rounded-none space-y-2.5 ${getHighlightClass('isOnSale')}`}
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span>5. 前台供售与在售状态同步</span>
                  {activeHighlightField === 'isOnSale' && (
                    <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.2 rounded-xs shadow-xs animate-bounce">
                      🎯 正在编辑
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOnSale(true)}
                    className={`px-3 py-1 rounded-none text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                      isOnSale
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnSale ? 'bg-white animate-pulse' : 'bg-neutral-400'}`} />
                    <span>🟢 设为前台在售</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOnSale(false)}
                    className={`px-3 py-1 rounded-none text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                      !isOnSale
                        ? 'bg-neutral-800 text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    <span>⚪ 设为待命未上架</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-neutral-600 flex items-center justify-between bg-white p-2 border border-neutral-200">
                <span>设为在售状态后，绑定的前台菜品将自动置为「可点单供售」，并在雷达外送端开放展示。</span>
                <span className="font-mono text-emerald-700 font-bold shrink-0">
                  {isOnSale ? '前台可见 · 实时扣减' : '后厨封存备料'}
                </span>
              </div>
            </div>

            {/* 5. 联动商品管理 (支持已有切换与快速新增操作) */}
            <div 
              ref={fieldRefs.linkedDishName}
              className={`p-3.5 border rounded-none space-y-3 ${getHighlightClass('linkedDishName')}`}
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-purple-600" />
                  <span className="font-bold text-neutral-900">6. 联动前端商品 (支持切换已有与新增)</span>
                  {activeHighlightField === 'linkedDishName' && (
                    <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.2 rounded-xs shadow-xs animate-bounce">
                      🎯 正在编辑
                    </span>
                  )}
                </div>

                {/* 模式切换 Tabs */}
                <div className="flex items-center bg-neutral-100 p-0.5 border border-neutral-300">
                  <button
                    type="button"
                    onClick={() => setDishMode('select')}
                    className={`px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                      dishMode === 'select' ? 'bg-white text-black shadow-xs' : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    切换关联已有商品
                  </button>
                  <button
                    type="button"
                    onClick={() => setDishMode('create')}
                    className={`px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      dishMode === 'create' ? 'bg-amber-600 text-white shadow-xs' : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>新增商品并联动</span>
                  </button>
                </div>
              </div>

              {/* 当前绑定状态卡片 */}
              {linkedDishName && (
                <div className="bg-emerald-50/80 border border-emerald-300 p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-none bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Link className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-950 text-xs">{linkedDishName}</span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1 py-0.2 font-mono">已绑定</span>
                      </div>
                      <div className="text-[10.5px] text-emerald-800">
                        {linkedDishId ? `商品ID: ${linkedDishId}` : '自定义联动名称'} · 状态: {isOnSale ? '前台在售供单' : '待命下架'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUnlinkDish}
                      className="text-neutral-500 hover:text-red-600 text-[11px] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Unlink className="w-3 h-3" />
                      <span>解绑</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 模式 A: 切换已有商品 */}
              {dishMode === 'select' && (
                <div className="space-y-2.5 bg-neutral-50 p-3 border border-neutral-200">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* 搜索框 */}
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={dishSearchKeyword}
                        onChange={(e) => setDishSearchKeyword(e.target.value)}
                        placeholder="搜索已有菜品名称或分类..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-300 text-xs focus:outline-none focus:border-black font-medium"
                      />
                      {dishSearchKeyword && (
                        <button
                          type="button"
                          onClick={() => setDishSearchKeyword('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* 分类快捷筛选 */}
                    <div className="flex items-center gap-1 text-[10.5px] shrink-0">
                      {[
                        { key: 'all', label: '全部' },
                        { key: 'skewers', label: '🍢 串串' },
                        { key: 'yakitori', label: '🍗 烧鸟' },
                        { key: 'mains', label: '🍱 主食' }
                      ].map((cat) => (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setDishCategoryFilter(cat.key)}
                          className={`px-2 py-1 border text-xs cursor-pointer ${
                            dishCategoryFilter === cat.key
                              ? 'bg-neutral-900 text-white border-neutral-900 font-bold'
                              : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 菜品快速选择网格 */}
                  <div className="max-h-44 overflow-y-auto divide-y divide-neutral-200 bg-white border border-neutral-200">
                    {filteredDishes.length === 0 ? (
                      <div className="p-4 text-center text-neutral-400 text-xs">
                        未搜索到匹配菜品，可切换至「新增商品并联动」即刻录入新菜品
                      </div>
                    ) : (
                      filteredDishes.map((dish) => {
                        const isSelected = dish.id === linkedDishId || dish.name === linkedDishName;
                        return (
                          <div
                            key={dish.id}
                            onClick={() => handleSelectDish(dish)}
                            className={`p-2 flex items-center justify-between gap-2 cursor-pointer transition-colors text-xs ${
                              isSelected ? 'bg-amber-50/90 font-bold' : 'hover:bg-neutral-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={dish.imageUrl}
                                alt={dish.name}
                                className="w-8 h-8 object-cover rounded-none shrink-0 bg-neutral-100 border border-neutral-200"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-neutral-900 truncate flex items-center gap-1.5">
                                  <span>{dish.name}</span>
                                  <span className="text-[10px] text-neutral-500 font-normal">[{dish.category}]</span>
                                  {isSelected && (
                                    <span className="text-[9.5px] bg-emerald-600 text-white px-1 py-0.2 font-mono">
                                      当前绑定
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-neutral-500 truncate max-w-md">
                                  {dish.description}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono font-bold text-sm text-neutral-900">
                                ¥{dish.price.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-neutral-400">
                                {dish.available ? '● 在售中' : '○ 已下架'}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* 联动名称微调与操作员 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">
                        绑定在售商品名称 (支持实时自定义)
                      </label>
                      <input
                        type="text"
                        value={linkedDishName}
                        onChange={(e) => setLinkedDishName(e.target.value)}
                        placeholder="如：原汁现烤羊肉串"
                        className="w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">
                        工位经办操作员
                      </label>
                      <input
                        type="text"
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        placeholder="操作人姓名"
                        className="w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 模式 B: 新增商品并立即联动 */}
              {dishMode === 'create' && (
                <div className="bg-neutral-50 p-3.5 border border-neutral-200 space-y-3 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
                    <span className="font-bold text-neutral-900 text-xs flex items-center gap-1">
                      <Utensils className="w-3.5 h-3.5 text-amber-600" />
                      <span>快速创建新菜品并同步写入点餐库</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoGenerateDishName}
                      className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Wand2 className="w-3 h-3 text-amber-700" />
                      <span>一键智能生成菜品与定价</span>
                    </button>
                  </div>

                  {/* 智能辅助选项 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-2 border border-neutral-200 text-[11px]">
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5">主打风味标签</label>
                      <select
                        value={autoFlavor}
                        onChange={(e) => setAutoFlavor(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-300 px-1.5 py-1 text-xs font-bold"
                      >
                        <option value="新疆孜然">新疆孜然</option>
                        <option value="川味麻辣">川味麻辣</option>
                        <option value="经典奥尔良">经典奥尔良</option>
                        <option value="秘制黑椒">秘制黑椒</option>
                        <option value="原汁椒盐">原汁椒盐</option>
                        <option value="日式照烧">日式照烧</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5">目标毛利率 (%)</label>
                      <select
                        value={autoTargetMargin}
                        onChange={(e) => setAutoTargetMargin(Number(e.target.value))}
                        className="w-full bg-neutral-50 border border-neutral-300 px-1.5 py-1 text-xs font-bold"
                      >
                        <option value={50}>50% 毛利</option>
                        <option value={55}>55% 毛利</option>
                        <option value={60}>60% 毛利</option>
                        <option value={65}>65% 推荐标准</option>
                        <option value={70}>70% 毛利</option>
                        <option value={75}>75% 优质毛利</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1 flex flex-col justify-end">
                      <div className="text-[10px] text-neutral-500">建议零售售价</div>
                      <div className="text-sm font-mono font-bold text-amber-700">
                        ¥{recommendedPrice} /串
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[10.5px] font-bold text-neutral-700 mb-0.5">
                        菜品商品名称 *
                      </label>
                      <input
                        type="text"
                        value={newDishName}
                        onChange={(e) => setNewDishName(e.target.value)}
                        placeholder="如：新疆孜然现烤原切羊肉串"
                        className="w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-bold text-neutral-700 mb-0.5">
                        零售单价 (¥/串) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={newDishPrice}
                        onChange={(e) => setNewDishPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1.5 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10.5px] font-medium text-neutral-700 mb-0.5">
                        所属分类
                      </label>
                      <select
                        value={newDishCategory}
                        onChange={(e) => setNewDishCategory(e.target.value as any)}
                        className="w-full bg-white border border-neutral-300 rounded-none px-2 py-1.5 text-xs text-neutral-900 focus:outline-none"
                      >
                        <option value="skewers">🍢 串串烧烤 (skewers)</option>
                        <option value="yakitori">🍗 日式烧鸟 (yakitori)</option>
                        <option value="mains">🍱 经典主食 (mains)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-medium text-neutral-700 mb-0.5">
                        快捷挑选实拍图 (8+专属串串图池)
                      </label>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {DEFAULT_SKEWER_IMAGES.map((imgUrl, idx) => (
                          <img
                            key={idx}
                            src={imgUrl}
                            alt="thumb"
                            onClick={() => {
                              setNewDishImage(imgUrl);
                              setCustomImageUrl('');
                            }}
                            className={`w-7 h-7 object-cover cursor-pointer border shrink-0 ${
                              newDishImage === imgUrl && !customImageUrl
                                ? 'border-amber-600 ring-2 ring-amber-400'
                                : 'border-neutral-300 opacity-60 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-medium text-neutral-700 mb-0.5">
                      菜品工艺卖点与描述
                    </label>
                    <input
                      type="text"
                      value={newDishDesc}
                      onChange={(e) => setNewDishDesc(e.target.value)}
                      placeholder="如：现切鲜肉，果木炭烤，汁水丰盈"
                      className="w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1 text-xs text-neutral-800 focus:outline-none focus:border-black"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={() => setDishMode('select')}
                      className="px-3 py-1 bg-white border border-neutral-300 text-neutral-700 text-xs font-medium cursor-pointer"
                    >
                      返回选择已有
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateAndLinkDish}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>立即创建新菜品并完成绑定</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 6. 原料配套与辅助耗材清单 (BOM) */}
            <div 
              ref={fieldRefs.matchingSupplies}
              className={`p-3.5 border rounded-none space-y-3 ${getHighlightClass('matchingSupplies')}`}
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-cyan-700" />
                  <span>7. 原料配套与辅助耗材清单 (BOM 核算)</span>
                  {activeHighlightField === 'matchingSupplies' && (
                    <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.2 rounded-xs shadow-xs animate-bounce">
                      🎯 当前修改项
                    </span>
                  )}
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-neutral-700">
                  <input
                    type="checkbox"
                    checked={includeBOMSupplies}
                    onChange={(e) => setIncludeBOMSupplies(e.target.checked)}
                    className="rounded-none text-black focus:ring-0 cursor-pointer"
                  />
                  <span>将配套辅料明细同步计入出库台账</span>
                </label>
              </div>

              <div className="bg-white border border-neutral-200 overflow-hidden">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
                    <tr>
                      <th className="p-2">耗材品名</th>
                      <th className="p-2">配比系数</th>
                      <th className="p-2">预计消耗量</th>
                      <th className="p-2">参考单价</th>
                      <th className="p-2 text-right">配套小计</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="p-2 font-medium text-neutral-900">
                        30cm 加厚圆竹签 (特级耐烤)
                      </td>
                      <td className="p-2 text-neutral-500 font-mono">1 串 / 根</td>
                      <td className="p-2 font-mono font-bold text-neutral-900">{bambooSkewersCount} 根</td>
                      <td className="p-2 text-neutral-500 font-mono">¥0.02 / 根</td>
                      <td className="p-2 text-right font-mono font-bold text-neutral-900">¥{bambooSkewersCost.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium text-neutral-900">
                        {autoFlavor}秘制复合烧烤撒料
                      </td>
                      <td className="p-2 text-neutral-500 font-mono">2.5g / 串</td>
                      <td className="p-2 font-mono font-bold text-neutral-900">{seasoningKg} kg</td>
                      <td className="p-2 text-neutral-500 font-mono">¥32.00 / kg</td>
                      <td className="p-2 text-right font-mono font-bold text-neutral-900">¥{seasoningCost.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium text-neutral-900">
                        防油加厚外卖铝箔保温袋 (5串装)
                      </td>
                      <td className="p-2 text-neutral-500 font-mono">1 个 / 5串</td>
                      <td className="p-2 font-mono font-bold text-neutral-900">{packagingBagsCount} 个</td>
                      <td className="p-2 text-neutral-500 font-mono">¥0.25 / 个</td>
                      <td className="p-2 text-right font-mono font-bold text-neutral-900">¥{packagingCost.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 成本汇总条 */}
              <div className="bg-neutral-50 p-2.5 border border-neutral-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-3 text-neutral-600">
                  <span>纯原料肉: <strong className="font-mono text-neutral-900">¥{displayCostPerSkewer}</strong>/串</span>
                  <span>+</span>
                  <span>配套辅料: <strong className="font-mono text-neutral-900">¥{auxiliaryCostPerSkewer.toFixed(2)}</strong>/串</span>
                  <span>=</span>
                  <span className="text-emerald-800 font-bold">综合全套单串成本: <strong className="font-mono text-sm">¥{totalUnitCost}</strong></span>
                </div>
                <div className="text-[10.5px] text-neutral-500 text-right">
                  建议售价 ¥{recommendedPrice}，预估单串毛利 ¥{(Number(recommendedPrice) - Number(totalUnitCost)).toFixed(2)} ({autoTargetMargin}%)
                </div>
              </div>
            </div>

            {/* 8. 品牌规格与包装参数 (采购标准与折合公斤价) */}
            <div 
              ref={fieldRefs.brandSpec}
              className={`p-3.5 border rounded-none space-y-3 ${
                activeHighlightField === 'brandSpec' || activeHighlightField === 'brand' || activeHighlightField === 'brandSpecs'
                  ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/90 shadow-md transition-all duration-300'
                  : 'border-neutral-200 hover:border-neutral-300 transition-colors'
              }`}
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  <span>8. 品牌规格与包装参数 (采购溯源与折合单价)</span>
                  {(activeHighlightField === 'brandSpec' || activeHighlightField === 'brand' || activeHighlightField === 'brandSpecs') && (
                    <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.2 rounded-xs shadow-xs animate-bounce">
                      🎯 当前修改项
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-neutral-500">
                  同步更新原料品牌名称与入库换算参数
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-800 mb-1">
                    品牌名称 (Brand) *
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="如：恒阳牛羊、双汇冷鲜、正大食品..."
                    className="w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1.5 text-xs text-neutral-800 font-bold focus:outline-none focus:border-black"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['恒阳牛羊', '双汇冷鲜', '正大食品', '蜀海供应链', '安井食品', '大红门', '雨润冷鲜', '自选优选'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBrand(b)}
                        className={`px-1.5 py-0.5 text-[9.5px] border rounded-none cursor-pointer transition-colors ${
                          brand === b ? 'bg-amber-600 text-white border-amber-600 font-bold' : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-800 mb-1">
                    包装规格描述
                  </label>
                  <input
                    type="text"
                    value={spec}
                    onChange={(e) => setSpec(e.target.value)}
                    placeholder="如：500g/包 × 20包/件"
                    className="w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-black"
                  />
                  <span className="text-[10px] text-neutral-500 block mt-1">
                    用于外包装标贴与冷柜入库标记
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-neutral-50 p-2.5 border border-neutral-200">
                <div>
                  <label className="block text-[10.5px] text-neutral-600 mb-0.5">单包克重 (g)</label>
                  <input
                    type="number"
                    step="10"
                    value={specGramsPerPack}
                    onChange={(e) => setSpecGramsPerPack(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-neutral-300 rounded-none px-2 py-1 font-mono text-xs font-bold text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] text-neutral-600 mb-0.5">每箱包数 (包)</label>
                  <input
                    type="number"
                    step="1"
                    value={specPacksPerBox}
                    onChange={(e) => setSpecPacksPerBox(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-neutral-300 rounded-none px-2 py-1 font-mono text-xs font-bold text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] text-neutral-600 mb-0.5">折合公斤单价 (元/kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={pricePerKg}
                    onChange={(e) => setPricePerKg(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-neutral-300 rounded-none px-2 py-1 font-mono text-xs font-bold text-emerald-700"
                  />
                </div>
              </div>
            </div>

            {/* 9. 补充备注说明 */}
            <div className="bg-neutral-50 p-3 border border-neutral-200 space-y-1.5">
              <label className="block text-[11px] font-bold text-neutral-700">
                穿制批次备注与工艺台账要点
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="填写切配规格、穿串标准、损耗情况等备注"
                className="w-full bg-white border border-neutral-300 rounded-none px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-black"
              />
            </div>
          </form>

          {/* Footer Actions */}
          <div className="p-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-100 rounded-none text-xs font-semibold cursor-pointer"
            >
              取消
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                className="px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-none text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-transform"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>确认入账 · 保存穿制与联动在售</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 嵌套唤醒重量除算测算器 */}
      <WeightSkewerCalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        defaultKg={usedQuantity}
        defaultPricePerKg={currentMat?.purchasePrice || 48}
        defaultMaterialName={currentMat?.name || '指定原料'}
        onApplyResult={(result) => {
          setUsedQuantity(result.totalKg);
          setYieldSkewerCount(result.skewerCount);
          showToast(`已成功导入测算数据: ${result.totalKg}kg 产出 ${result.skewerCount}串 (单串约 ${result.avgGrams}g，单串成本 ¥${result.costPerSkewer})`);
        }}
      />
    </>
  );
};
