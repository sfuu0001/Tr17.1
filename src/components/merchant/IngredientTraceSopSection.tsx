import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Copy,
  Camera,
  Barcode,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Tag,
  Snowflake,
  ShieldCheck,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ExternalLink,
  Info,
  Maximize2
} from 'lucide-react';
import { DishItem, DishIngredientItem } from '../../types';
import {
  FREEZER_LOCATION_PRESETS,
  INGREDIENT_BRAND_PRESETS,
  INGREDIENT_ORIGIN_PRESETS,
  SHELF_LIFE_PRESETS,
  generateIngredientBarcode,
  generateDefaultIngredientsForDish
} from '../../utils/ingredientTraceEngine';
import { softDeleteToRecycleBin } from '../../utils/recycleBinEngine';
import { IngredientPackageCameraModal } from './IngredientPackageCameraModal';

interface IngredientTraceSopSectionProps {
  dish: DishItem;
  ingredients: DishIngredientItem[];
  originSource: string;
  inspectionBatchNo: string;
  coldChainTemp: string;
  supplierName: string;
  sopCookingSteps?: Array<{
    stepNumber: number;
    title: string;
    description: string;
    targetTemp?: string;
    durationSeconds?: number;
    keyCheckPoint?: string;
  }>;
  onUpdateIngredients: (ingredients: DishIngredientItem[]) => void;
  onUpdateOriginSource: (val: string) => void;
  onUpdateInspectionBatchNo: (val: string) => void;
  onUpdateColdChainTemp: (val: string) => void;
  onUpdateSupplierName: (val: string) => void;
  onUpdateSopCookingSteps?: (steps: any[]) => void;
}

export const IngredientTraceSopSection: React.FC<IngredientTraceSopSectionProps> = ({
  dish,
  ingredients,
  originSource,
  inspectionBatchNo,
  coldChainTemp,
  supplierName,
  sopCookingSteps = [],
  onUpdateIngredients,
  onUpdateOriginSource,
  onUpdateInspectionBatchNo,
  onUpdateColdChainTemp,
  onUpdateSupplierName,
  onUpdateSopCookingSteps
}) => {
  // Camera Modal state
  const [cameraModalIngredient, setCameraModalIngredient] = useState<DishIngredientItem | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Compute total dosage grams
  const totalGrams = ingredients.reduce((sum, item) => {
    const val = typeof item.dosageGrams === 'number' ? item.dosageGrams : parseFloat(String(item.dosageGrams)) || 0;
    return sum + val;
  }, 0);

  const photosCount = ingredients.filter((ing) => Boolean(ing.packagingPhotoUrl)).length;

  // Add new blank ingredient
  const handleAddIngredient = () => {
    const newId = `ing-${dish.id}-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const newIng: DishIngredientItem = {
      id: newId,
      name: '',
      dosageGrams: 50,
      brand: INGREDIENT_BRAND_PRESETS[0],
      origin: INGREDIENT_ORIGIN_PRESETS[0],
      productionDate: today,
      shelfLife: '90天 (-18℃深冷速冻)',
      freezerLocation: FREEZER_LOCATION_PRESETS[0],
      barcode: generateIngredientBarcode(),
      storageTemp: '≤ -18℃ 冻藏'
    };
    onUpdateIngredients([...ingredients, newIng]);
  };

  // Import standard preset recipe
  const handleImportPresetRecipe = () => {
    const presets = generateDefaultIngredientsForDish(dish);
    onUpdateIngredients(presets);
  };

  // Update specific ingredient field
  const handleFieldChange = (id: string, field: keyof DishIngredientItem, value: any) => {
    const next = ingredients.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    onUpdateIngredients(next);
  };

  // Duplicate ingredient
  const handleDuplicate = (ing: DishIngredientItem) => {
    const cloned: DishIngredientItem = {
      ...ing,
      id: `ing-${dish.id}-${Date.now()}`,
      name: `${ing.name} (副本)`,
      barcode: generateIngredientBarcode()
    };
    onUpdateIngredients([...ingredients, cloned]);
  };

  // Delete ingredient（统一回收站：软删除入站，30 天内可恢复到该菜品配方）
  const handleDelete = (ing: DishIngredientItem) => {
    softDeleteToRecycleBin({
      type: 'ingredient_trace',
      typeLabel: '食材溯源配方',
      refId: ing.id,
      label: `${ing.name || '未命名原料'}（${dish.name}）`,
      snapshot: ing,
      // 配方明细持久化形态：obsidian_dish_ingredients_map_v1 = Record<dishId, Ingredient[]>
      storageKey: 'obsidian_dish_ingredients_map_v1',
      container: 'nested-array',
      ownerId: dish.id,
      idField: 'id'
    });
    onUpdateIngredients(ingredients.filter((item) => item.id !== ing.id));
  };

  // Move up/down
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= ingredients.length) return;
    const next = [...ingredients];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    onUpdateIngredients(next);
  };

  // Open camera modal for an ingredient
  const handleOpenCamera = (ing: DishIngredientItem) => {
    setCameraModalIngredient(ing);
  };

  // Receive confirmed photo from camera modal
  const handlePhotoConfirmed = (photoUrl: string) => {
    if (!cameraModalIngredient) return;
    handleFieldChange(cameraModalIngredient.id, 'packagingPhotoUrl', photoUrl);
    // Also add to packagingPhotos array
    const currentList = cameraModalIngredient.packagingPhotos || [];
    if (!currentList.includes(photoUrl)) {
      handleFieldChange(cameraModalIngredient.id, 'packagingPhotos', [...currentList, photoUrl]);
    }
  };

  return (
    <div className="space-y-space-md">
      {/* 1. TOP HEADER & METRIC SUMMARY CARD */}
      <div className="bg-surface-container border border-border-hairline p-space-md space-y-space-sm shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 bg-status-live text-on-primary flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface tracking-tight flex items-center gap-2">
                <span>食材产地溯源与商品配方 SOP (Recipe & Sourcing)</span>
                <span className="font-label-micro text-label-micro bg-status-live-surface text-status-live border border-status-live-border px-1.5 py-0.5 font-bold font-mono">
                  公开透明公示
                </span>
              </h4>
              <p className="font-body-sm text-body-sm text-text-muted">
                设置原料配比用量(g)、品牌、原产地基地、生产日期、冷库储位及条码，拍照包装存根。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-space-xs shrink-0">
            <button
              type="button"
              onClick={handleImportPresetRecipe}
              className="px-space-md py-1.5 bg-surface-canvas hover:bg-surface-muted text-on-surface border border-border-control font-label-sm text-label-sm font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="根据菜品名称自动载入高规格示范配方"
            >
              <Sparkles className="w-3.5 h-3.5 text-status-locked" />
              <span>智能载入标准配方</span>
            </button>

            <button
              type="button"
              onClick={handleAddIngredient}
              className="px-space-md py-1.5 bg-primary hover:bg-neutral-800 text-on-primary font-label-sm text-label-sm font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加食材原料</span>
            </button>
          </div>
        </div>

        {/* 4 Stats Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs pt-space-xs border-t border-border-hairline font-mono font-label-sm text-label-sm">
          <div className="bg-surface-canvas p-space-sm border border-border-hairline">
            <span className="font-label-micro text-label-micro text-text-muted block">配方原料种类</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">{ingredients.length} 种</span>
          </div>
          <div className="bg-surface-canvas p-space-sm border border-border-hairline">
            <span className="font-label-micro text-label-micro text-text-muted block">单份成调用料克重</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">约 {totalGrams} g</span>
          </div>
          <div className="bg-surface-canvas p-space-sm border border-border-hairline">
            <span className="font-label-micro text-label-micro text-text-muted block">实物包装拍照存根</span>
            <span className="font-headline-sm text-headline-sm text-status-live">
              {photosCount} / {ingredients.length} 项已存根
            </span>
          </div>
          <div className="bg-surface-canvas p-space-sm border border-border-hairline">
            <span className="font-label-micro text-label-micro text-text-muted block">冷链温控标准</span>
            <span className="font-headline-sm text-headline-sm text-on-surface truncate block mt-0.5">
              {coldChainTemp || '≤ -18℃ 全程深冷'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. OVERALL TRACEABILITY & REGULATORY META */}
      <div className="bg-surface-container border border-border-hairline p-space-md space-y-space-sm shadow-sm">
        <h5 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-status-live" />
          <span>菜品产地总述与冷链检疫资质规范 (前台直观展示)</span>
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm font-body-sm text-body-sm">
          <div className="sm:col-span-2">
            <label className="font-label-sm text-label-sm text-text-secondary block mb-1 font-bold">
              食材原产地溯源总述 (食客端详情卡片首行)：
            </label>
            <input
              type="text"
              value={originSource}
              onChange={(e) => onUpdateOriginSource(e.target.value)}
              placeholder="例如: 澳大利亚昆士兰州达令草场直供M5和牛，纯净谷饲，全程4℃冷链直抵餐车"
              className="w-full p-2 bg-surface-canvas border border-border-control focus:border-primary outline-none text-on-surface font-body-sm text-body-sm shadow-inner"
            />
          </div>

          <div>
            <label className="font-label-sm text-label-sm text-text-secondary block mb-1 font-bold">
              食品安全检验检疫批号 / 溯源凭单编号：
            </label>
            <input
              type="text"
              value={inspectionBatchNo}
              onChange={(e) => onUpdateInspectionBatchNo(e.target.value)}
              placeholder="例如: 入境货物检验检疫证明 NO.沪关检2026-0302-09"
              className="w-full p-2 bg-surface-canvas border border-border-control focus:border-primary outline-none font-mono text-on-surface font-label-sm text-label-sm shadow-inner"
            />
          </div>

          <div>
            <label className="font-label-sm text-label-sm text-text-secondary block mb-1 font-bold">
              冷链储运温区标准要求：
            </label>
            <div className="flex gap-space-xs">
              <input
                type="text"
                value={coldChainTemp}
                onChange={(e) => onUpdateColdChainTemp(e.target.value)}
                placeholder="例如: 全程 ≤ -18℃ 恒温深冷速冻"
                className="flex-1 p-2 bg-surface-canvas border border-border-control focus:border-primary outline-none font-mono text-on-surface font-label-sm text-label-sm shadow-inner"
              />
              <button
                type="button"
                onClick={() => onUpdateColdChainTemp('全程 ≤ -18℃ 恒温深冷速冻')}
                className="px-2 py-1 bg-surface-muted hover:bg-surface-variant border border-border-control font-label-micro text-label-micro font-mono shrink-0 cursor-pointer"
              >
                填-18℃
              </button>
              <button
                type="button"
                onClick={() => onUpdateColdChainTemp('0-4℃ 恒温急鲜气调保鲜')}
                className="px-2 py-1 bg-surface-muted hover:bg-surface-variant border border-border-control font-label-micro text-label-micro font-mono shrink-0 cursor-pointer"
              >
                填4℃
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. INGREDIENTS LIST (BOM & TRACEABILITY CARDS) */}
      <div className="space-y-space-sm">
        <div className="flex items-center justify-between">
          <h5 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-text-muted" />
            <span>原料配方明细清单 ({ingredients.length} 项食材原料)</span>
          </h5>
          <span className="font-label-micro text-label-micro text-text-muted font-mono">
            支持相机实拍存根 · 备注冷冻冰库位置
          </span>
        </div>

        {ingredients.length === 0 ? (
          <div className="p-space-xl text-center bg-surface-container border border-dashed border-border-control space-y-space-sm">
            <p className="font-body-sm text-body-sm text-text-muted">
              当前暂未添加原料配方，点击下方按钮添加或一键载入标准配方。
            </p>
            <div className="flex justify-center gap-space-xs">
              <button
                type="button"
                onClick={handleImportPresetRecipe}
                className="px-space-md py-2 bg-surface-canvas hover:bg-surface-muted border border-border-control font-label-sm text-label-sm font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-status-locked" />
                <span>一键导入推荐标准配方</span>
              </button>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="px-space-md py-2 bg-primary text-on-primary font-label-sm text-label-sm font-bold flex items-center gap-1.5 cursor-pointer hover:bg-neutral-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>手动新增食材</span>
              </button>
            </div>
          </div>
        ) : (
          ingredients.map((ing, idx) => (
            <div
              key={ing.id}
              className="bg-surface-container border border-border-hairline p-space-md space-y-space-sm transition-colors hover:border-border-control shadow-sm"
            >
              {/* Top row: Order, Name, Dosage, Actions */}
              <div className="flex flex-wrap items-center justify-between gap-space-xs pb-space-xs border-b border-border-hairline">
                <div className="flex items-center gap-space-xs">
                  <span className="w-5 h-5 bg-primary text-on-primary font-label-micro text-label-micro font-mono font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    食材原料 #{idx + 1}
                  </span>
                  {ing.packagingPhotoUrl && (
                    <span className="font-label-micro text-label-micro bg-status-live-surface text-status-live border border-status-live-border px-1.5 py-0.5 font-bold flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      已拍照存根
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-text-muted hover:text-on-surface disabled:opacity-30 cursor-pointer"
                    title="上移"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === ingredients.length - 1}
                    className="p-1 text-text-muted hover:text-on-surface disabled:opacity-30 cursor-pointer"
                    title="下移"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(ing)}
                    className="p-1 text-text-muted hover:text-on-surface cursor-pointer"
                    title="复制此原料"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(ing)}
                    className="p-1 text-text-muted hover:text-status-alert cursor-pointer"
                    title="删除原料（进入统一回收站，30 天可恢复）"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid 1: Basic ingredient identification */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-space-sm font-body-sm text-body-sm">
                {/* 1. 材料名称 */}
                <div className="sm:col-span-2">
                  <label className="font-label-sm text-label-sm text-text-secondary block mb-1 font-bold">
                    材料名称 <span className="text-status-alert">*</span>:
                  </label>
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => handleFieldChange(ing.id, 'name', e.target.value)}
                    placeholder="如: 澳洲M5谷饲和牛肉条 / 鲜鸡翅中"
                    className="w-full p-2 bg-surface-canvas border border-border-control focus:border-primary outline-none font-bold text-on-surface font-body-sm text-body-sm shadow-inner"
                  />
                </div>

                {/* 2. 用量克重 */}
                <div>
                  <label className="font-label-sm text-label-sm text-text-secondary block mb-1 font-bold">
                    用量克重/规格 <span className="text-status-alert">*</span>:
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={ing.dosageGrams}
                      onChange={(e) => handleFieldChange(ing.id, 'dosageGrams', e.target.value)}
                      placeholder="120"
                      className="w-full p-2 bg-surface-canvas border border-border-control focus:border-primary outline-none font-mono font-bold text-on-surface font-label-sm text-label-sm shadow-inner"
                    />
                    <span className="bg-surface-muted border-y border-r border-border-control px-2.5 flex items-center font-mono font-label-sm text-label-sm text-text-muted">
                      g
                    </span>
                  </div>
                </div>

                {/* 3. 食材品牌 */}
                <div>
                  <label className="font-label-sm text-label-sm text-text-secondary block mb-1 font-bold">
                    食材品牌 <span className="text-status-alert">*</span>:
                  </label>
                  <input
                    type="text"
                    value={ing.brand}
                    onChange={(e) => handleFieldChange(ing.id, 'brand', e.target.value)}
                    placeholder="如: 澳大利亚AACO"
                    className="w-full p-2 bg-surface-canvas border border-border-control focus:border-primary outline-none text-on-surface font-body-sm text-body-sm shadow-inner"
                    list={`brand-list-${ing.id}`}
                  />
                  <datalist id={`brand-list-${ing.id}`}>
                    {INGREDIENT_BRAND_PRESETS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Grid 2: Traceability origin & Shelf life */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-space-sm font-body-sm text-body-sm">
                {/* 4. 原产地 / 种植养殖基地 */}
                <div className="sm:col-span-2">
                  <label className="font-label-sm text-label-sm text-text-secondary block mb-1 font-bold">
                    原产地 / 种植养殖基地:
                  </label>
                  <input
                    type="text"
                    value={ing.origin}
                    onChange={(e) => handleFieldChange(ing.id, 'origin', e.target.value)}
                    placeholder="如: 澳大利亚昆士兰州达令草场"
                    className="w-full p-2 bg-surface-canvas border border-border-control focus:border-primary outline-none text-on-surface font-body-sm text-body-sm shadow-inner"
                    list={`origin-list-${ing.id}`}
                  />
                  <datalist id={`origin-list-${ing.id}`}>
                    {INGREDIENT_ORIGIN_PRESETS.map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                </div>

                {/* 5. 生产日期 */}
                <div>
                  <label className="font-label-sm text-label-sm text-text-secondary block mb-1 font-bold">
                    食材生产日期:
                  </label>
                  <input
                    type="date"
                    value={ing.productionDate}
                    onChange={(e) => handleFieldChange(ing.id, 'productionDate', e.target.value)}
                    className="w-full p-2 bg-surface-canvas border border-border-control focus:border-primary outline-none font-mono text-on-surface font-label-sm text-label-sm shadow-inner"
                  />
                </div>

                {/* 6. 保质期 */}
                <div>
                  <label className="font-label-sm text-label-sm text-text-secondary block mb-1 font-bold">
                    保质期 / 到期日:
                  </label>
                  <input
                    type="text"
                    value={ing.shelfLife}
                    onChange={(e) => handleFieldChange(ing.id, 'shelfLife', e.target.value)}
                    placeholder="如: 180天 (至2026-08-31)"
                    className="w-full p-2 bg-surface-canvas border border-border-control focus:border-primary outline-none text-on-surface font-body-sm text-body-sm shadow-inner"
                    list={`shelf-list-${ing.id}`}
                  />
                  <datalist id={`shelf-list-${ing.id}`}>
                    {SHELF_LIFE_PRESETS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Grid 3: Freezer location & Barcode & Camera Packaging Stub */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-space-sm font-body-sm text-body-sm pt-space-xs border-t border-border-hairline">
                {/* 7. 备注冷冻冰库位置 */}
                <div className="sm:col-span-2">
                  <label className="font-label-sm text-label-sm text-text-secondary block mb-1 flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1">
                      <Snowflake className="w-3.5 h-3.5 text-blue-600" />
                      备注冷冻冰库位置:
                    </span>
                    <span className="font-label-micro text-label-micro text-text-muted font-mono">
                      指引出库理货
                    </span>
                  </label>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={ing.freezerLocation}
                      onChange={(e) => handleFieldChange(ing.id, 'freezerLocation', e.target.value)}
                      placeholder="如: 车载深冷冰库A-02层 (-18℃)"
                      className="w-full p-2 bg-surface-canvas border border-border-control focus:border-primary outline-none font-mono text-on-surface font-label-sm text-label-sm shadow-inner"
                      list={`freezer-list-${ing.id}`}
                    />
                    <datalist id={`freezer-list-${ing.id}`}>
                      {FREEZER_LOCATION_PRESETS.map((f) => (
                        <option key={f} value={f} />
                      ))}
                    </datalist>

                    {/* Quick location tag bubbles */}
                    <div className="flex flex-wrap gap-1">
                      {['深冷A-01', '深冷A-02', '急鲜C-01', '水吧0℃', '常温E-03'].map((locShort) => {
                        const matched = FREEZER_LOCATION_PRESETS.find((p) => p.includes(locShort));
                        if (!matched) return null;
                        return (
                          <button
                            key={locShort}
                            type="button"
                            onClick={() => handleFieldChange(ing.id, 'freezerLocation', matched)}
                            className="px-1.5 py-0.5 bg-surface-muted hover:bg-surface-variant font-label-micro text-label-micro text-text-secondary font-mono border border-border-control cursor-pointer"
                          >
                            {locShort}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 8. 原料条码 */}
                <div>
                  <label className="font-label-sm text-label-sm text-text-secondary block mb-1 flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1">
                      <Barcode className="w-3.5 h-3.5 text-text-muted" />
                      原料条形码:
                    </span>
                  </label>
                  <div className="space-y-1">
                    <div className="flex">
                      <input
                        type="text"
                        value={ing.barcode}
                        onChange={(e) => handleFieldChange(ing.id, 'barcode', e.target.value)}
                        placeholder="6970123456789"
                        className="w-full p-2 bg-surface-canvas border border-border-control focus:border-primary outline-none font-mono font-label-sm text-label-sm shadow-inner text-on-surface"
                      />
                      <button
                        type="button"
                        onClick={() => handleFieldChange(ing.id, 'barcode', generateIngredientBarcode())}
                        className="px-2 bg-surface-muted hover:bg-surface-variant border-y border-r border-border-control font-label-micro text-label-micro font-mono shrink-0 cursor-pointer"
                        title="生成新69条码"
                      >
                        随机
                      </button>
                    </div>
                  </div>
                </div>

                {/* 9. 食材包装实物拍照存根 (CAMERA PHOTO) */}
                <div>
                  <label className="font-label-sm text-label-sm text-text-secondary block mb-1 flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-status-live" />
                      包装拍照存根:
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    {ing.packagingPhotoUrl ? (
                      <div className="relative group w-14 h-14 bg-black border border-border-control shrink-0 overflow-hidden cursor-pointer shadow-sm">
                        <img
                          src={ing.packagingPhotoUrl}
                          alt="Packaging Stub"
                          className="w-full h-full object-cover"
                          onClick={() => setLightboxImageUrl(ing.packagingPhotoUrl || null)}
                        />
                        <button
                          type="button"
                          onClick={() => setLightboxImageUrl(ing.packagingPhotoUrl || null)}
                          className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-surface-muted border border-dashed border-border-control flex flex-col items-center justify-center text-text-muted shrink-0">
                        <ImageIcon className="w-4 h-4" />
                        <span className="font-label-micro text-label-micro mt-0.5">未拍照</span>
                      </div>
                    )}

                    <div className="space-y-1 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleOpenCamera(ing)}
                        className="w-full px-2 py-1.5 bg-status-live hover:brightness-110 text-on-primary font-label-micro text-label-micro font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{ing.packagingPhotoUrl ? '重拍/更换' : '相机拍照'}</span>
                      </button>

                      {ing.packagingPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => handleFieldChange(ing.id, 'packagingPhotoUrl', undefined)}
                          className="w-full text-center font-label-micro text-label-micro text-text-muted hover:text-status-alert cursor-pointer block"
                        >
                          移除照片
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. SOP COOKING PROCESS STEPS (制作工艺与烹饪要点工序) */}
      <div className="bg-surface-container border border-border-hairline p-space-md space-y-space-sm shadow-sm">
        <div className="flex items-center justify-between">
          <h5 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-text-muted" />
            <span>菜品标准化制作工艺与烤制 SOP 流程 (出餐核验)</span>
          </h5>
          <span className="font-label-micro text-label-micro text-text-muted font-mono">
            后厨看板 & 扫码验出餐
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-xs font-body-sm text-body-sm">
          <div className="p-space-sm bg-surface-canvas border border-border-hairline space-y-1">
            <div className="flex items-center justify-between font-bold text-on-surface">
              <span>① 解冻排酸与穿签规范</span>
              <span className="font-label-micro text-label-micro text-text-muted font-mono">0-4℃ 48h</span>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary">
              原切肉质于4℃解冻柜缓慢化冻，按标准克重穿签，严禁二次冷冻。
            </p>
          </div>

          <div className="p-space-sm bg-surface-canvas border border-border-hairline space-y-1">
            <div className="flex items-center justify-between font-bold text-on-surface">
              <span>② 炭火炙烤与翻面频次</span>
              <span className="font-label-micro text-label-micro text-text-muted font-mono">800℃ 果木炭</span>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary">
              红外温控探针监测核心温度达56-62℃，两侧焦香锁汁，双面翻烤4-6次。
            </p>
          </div>

          <div className="p-space-sm bg-surface-canvas border border-border-hairline space-y-1">
            <div className="flex items-center justify-between font-bold text-on-surface">
              <span>③ 秘制刷酱与保温出餐</span>
              <span className="font-label-micro text-label-micro text-text-muted font-mono">≥ 65℃ 出单</span>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary">
              临出餐前均匀刷涂秘酱，撒以海盐与黑胡椒粒，即刻封入保温袋/递送餐桌。
            </p>
          </div>
        </div>
      </div>

      {/* CAMERA POPUP MODAL */}
      {cameraModalIngredient && (
        <IngredientPackageCameraModal
          isOpen={Boolean(cameraModalIngredient)}
          ingredient={cameraModalIngredient}
          dishName={dish.name}
          onClose={() => setCameraModalIngredient(null)}
          onConfirmPhoto={handlePhotoConfirmed}
        />
      )}

      {/* LIGHTBOX FOR FULL IMAGE PREVIEW */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-surface-container border border-border-control p-2 overflow-hidden shadow-2xl">
            <img
              src={lightboxImageUrl}
              alt="Full packaging stub preview"
              className="w-full h-full object-contain"
            />
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              className="absolute top-4 right-4 px-3 py-1.5 bg-primary text-on-primary font-label-micro text-label-micro font-bold cursor-pointer hover:bg-neutral-800"
            >
              关闭大图
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
