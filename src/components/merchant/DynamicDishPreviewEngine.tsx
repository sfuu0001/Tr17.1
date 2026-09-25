import React, { useState, useMemo } from 'react';
import {
  Flame,
  ChefHat,
  Tag,
  SlidersHorizontal,
  Layers,
  Camera,
  Sparkles,
  Check,
  CheckCircle2,
  Clock,
  Zap,
  ShoppingBag,
  Minus,
  Plus,
  ZoomIn,
  MousePointerClick,
  Crosshair,
  FileSpreadsheet,
  Bike,
  Utensils,
  Video,
  Play,
  ShieldCheck,
  QrCode,
  X
} from 'lucide-react';
import type { DishItem, DishVariant, DishOptionGroup, FieldSelectorMediaItem } from '../../types';
import { resolveVariantBlueprint } from '../../utils/autoBlueprintEngine';

// ============================================================================
// 1. SOFT-CODED DYNAMIC SCHEMA & TYPE DEFINITIONS (软编码动态插槽与类型体系)
// ============================================================================

export type DynamicSlotType =
  | 'hero_media'
  | 'title_badge'
  | 'spiciness_taste'
  | 'flavor_options'
  | 'flavor_tags'
  | 'craft_sop'
  | 'video_trace_sop'
  | 'ingredient_trace_sop'
  | 'price_benchmark'
  | 'channel_discounts'
  | 'variant_selector'
  | 'option_groups'
  | 'order_stepper'
  | 'cad_blueprint';

export type DynamicSlotCategory =
  | 'media_cad'
  | 'flavor_taste'
  | 'sop_trace'
  | 'pricing'
  | 'spec_variant';

export interface DynamicSlotDefinition {
  id: string;
  type: DynamicSlotType;
  nameZh: string;
  nameEn: string;
  category: DynamicSlotCategory;
  targetTabId: string;
  targetElementId: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  supportedViews: ('hud_card' | 'spec_modal')[];
  getBadgeValue?: (ctx: DynamicPreviewContext) => string | number | undefined;
  renderCard?: (ctx: DynamicPreviewContext, actions: SlotActionHandlers) => React.ReactNode;
  renderSpecModal?: (ctx: DynamicPreviewContext, actions: SlotActionHandlers) => React.ReactNode;
}

export interface DynamicPreviewContext {
  dish: DishItem;
  currentVariant?: DishVariant | null;
  currentVariantIndex?: number;
  activeVariantIndex?: number;
  channel: 'delivery' | 'dine_in';
  previewStyleMode: 'hud_card' | 'spec_modal';
  blueprintMode?: 'photo' | 'blueprint';
  previewBlueprintMode?: 'photo' | 'blueprint';
  quantity: number;
  // Parameters
  editPrice: string;
  editOriginalPrice?: string;
  editPrevPrice?: string;
  editDeliveryDiscount: string;
  editDineInDiscount: string;
  editDeliveryDiscountTag: string;
  editDineInDiscountTag: string;
  editBadgeText: string;
  editPrepTime: string;
  editBarcode?: string;
  editSpicinessLevel: string;
  editSpicinessOptions: string[];
  selectedSpice: string;
  editFlavor: string;
  editFlavorOptions: string[];
  selectedFlavor: string;
  editFlavorTags: string[];
  editCookingStyle: string;
  editCraftStandardNote: string;
  editIngredients: any[];
  editVariants: DishVariant[];
  editOptionGroups?: DishOptionGroup[];
  editFieldSelectorMediaMap: Record<string, FieldSelectorMediaItem>;
  minOrderThreshold?: number;
  packagingFee?: string;
  finalUnitPrice: number;
  finalTotalPrice: number;
  currentDiscount: number;
  currentPrice?: number;
}

export interface SlotActionHandlers {
  onSelectSpice: (spice: string) => void;
  onSelectFlavor: (flavor: string) => void;
  onSelectVariant: (index: number) => void;
  onToggleBlueprintMode?: (mode?: 'photo' | 'blueprint') => void;
  onUpdateQuantity: (delta: number) => void;
  onAddToCart: () => void;
  onPreviewZoom?: (dishData: DishItem) => void;
  onLocateLeftField: (tabId: string, elementId?: string, labelZh?: string) => void;
  onSwitchViewMode?: (mode: 'hud_card' | 'spec_modal') => void;
  onSwitchChannel?: (channel: 'delivery' | 'dine_in') => void;
  onOpenVideoTraceModal?: () => void;
}

// ============================================================================
// 2. DYNAMIC REGISTRY SERVICE (软编码动态注册中心)
// ============================================================================

export class DynamicSlotRegistryService {
  private slots: Map<string, DynamicSlotDefinition> = new Map();

  constructor(initialSlots: DynamicSlotDefinition[] = []) {
    initialSlots.forEach((s) => this.slots.set(s.id, s));
  }

  register(slot: DynamicSlotDefinition): void {
    this.slots.set(slot.id, slot);
  }

  unregister(slotId: string): boolean {
    return this.slots.delete(slotId);
  }

  getSlot(id: string): DynamicSlotDefinition | undefined {
    return this.slots.get(id);
  }

  getSlotsByType(type: DynamicSlotType): DynamicSlotDefinition[] {
    return Array.from(this.slots.values()).filter((s) => s.type === type);
  }

  getSlotsByCategory(category: DynamicSlotCategory): DynamicSlotDefinition[] {
    return Array.from(this.slots.values()).filter((s) => s.category === category);
  }

  getSlotsForView(view: 'hud_card' | 'spec_modal'): DynamicSlotDefinition[] {
    return Array.from(this.slots.values()).filter((s) => s.supportedViews.includes(view));
  }

  getAllSlots(): DynamicSlotDefinition[] {
    return Array.from(this.slots.values());
  }

  getAllTypes(): DynamicSlotType[] {
    return Array.from(new Set(Array.from(this.slots.values()).map((s) => s.type)));
  }
}

// ============================================================================
// 2. DEFAULT DYNAMIC SLOT REGISTRY (插槽引擎注册中心)
// ============================================================================

export const DEFAULT_PREVIEW_SLOTS: DynamicSlotDefinition[] = [
  // --- 1. HERO MEDIA & CAD BLUEPRINT (视觉主图与线稿CAD) ---
  {
    id: 'slot_hero_media',
    type: 'hero_media',
    nameZh: '主图与蓝图CAD',
    nameEn: 'HERO_MEDIA_CAD',
    category: 'media_cad',
    targetTabId: 'selector_media',
    targetElementId: 'form_card_cad',
    icon: Camera,
    description: '展示菜品高清实物或工匠线稿CAD图纸，并集成促销角标',
    supportedViews: ['hud_card', 'spec_modal'],
    getBadgeValue: (ctx) => (ctx.blueprintMode === 'blueprint' ? 'CAD线稿' : '实拍大图'),
    renderCard: (ctx, actions) => {
      const { dish, currentVariant, editBadgeText, currentDiscount, channel, editDeliveryDiscountTag, editDineInDiscountTag } = ctx;
      const imageUrl = currentVariant?.imageUrl || dish.imageUrl;
      const badge = currentVariant?.badgeText || editBadgeText;
      const discountTag = channel === 'delivery'
        ? (editDeliveryDiscountTag || `立减 ¥${currentDiscount}`)
        : (editDineInDiscountTag || `堂食立减 ¥${currentDiscount}`);

      return (
        <div className="relative aspect-16/10 rounded-none overflow-hidden bg-[#eeeeec] border border-[#e2e3e1]">
          <img src={imageUrl} alt={dish.name} className="w-full h-full object-cover" />
          {badge && (
            <span className="absolute top-2.5 left-2.5 bg-[#000000] text-white text-[10px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wider shadow-sm">
              {badge}
            </span>
          )}
          {currentDiscount > 0 && (
            <span className="absolute top-2.5 right-2.5 bg-[#ba1a1a] text-white text-[10px] font-bold px-2 py-0.5 rounded-none shadow-sm">
              {discountTag}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              actions.onPreviewZoom?.(dish);
            }}
            className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white text-xs cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
            title="放大查看原图"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    },
    renderSpecModal: (ctx, actions) => {
      const { dish, currentVariant, editBadgeText, blueprintMode, editFieldSelectorMediaMap } = ctx;
      const dynamicDishForPreview = { ...dish, fieldSelectorMediaMap: editFieldSelectorMediaMap };
      const resolvedMedia = resolveVariantBlueprint(dynamicDishForPreview, currentVariant);
      const currentImage = blueprintMode === 'blueprint'
        ? (resolvedMedia.blueprintUrl || currentVariant?.blueprintImageUrl || currentVariant?.imageUrl || dish.imageUrl)
        : (currentVariant?.imageUrl || dish.imageUrl);

      return (
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div
            className={`relative w-22 h-22 sm:w-24 sm:h-24 rounded-none overflow-hidden shrink-0 border transition-all ${
              blueprintMode === 'blueprint'
                ? 'bg-[#041224] border-[#00d4ff]/40 shadow-inner'
                : 'bg-[#eeeeec] border-[#e2e3e1]'
            }`}
          >
            <img
              src={currentImage}
              alt={dish.name}
              className={`w-full h-full ${blueprintMode === 'blueprint' ? 'object-contain scale-105 p-1' : 'object-cover'}`}
            />
            {(currentVariant?.badgeText || editBadgeText) && (
              <span className="absolute top-1 left-1 bg-[#000000] text-white text-[8px] font-bold px-1 py-0.2 rounded-none uppercase">
                {currentVariant?.badgeText || editBadgeText}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                actions.onPreviewZoom?.({
                  ...dish,
                  imageUrl: currentImage,
                  name: `${dish.name}${currentVariant ? ` - ${currentVariant.name}` : ''} (${blueprintMode === 'blueprint' ? '工匠蓝图' : '实物'})`
                });
              }}
              className="absolute bottom-1 right-1 p-1 bg-black/60 text-white text-[9px] hover:bg-black cursor-pointer"
              title="查看大图"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Dual-Mode Switcher Pills */}
          <div className="flex items-center bg-[#f4f4f2] p-0.5 rounded-none border border-[#e2e3e1] text-[9.5px] font-mono">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                actions.onToggleBlueprintMode('photo');
              }}
              className={`px-1.5 py-0.5 rounded-none transition-all font-bold cursor-pointer ${
                blueprintMode === 'photo'
                  ? 'bg-white text-[#1a1c1b] shadow-xs'
                  : 'text-[#787770] hover:text-[#1a1c1b]'
              }`}
            >
              实物 PHOTO
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                actions.onToggleBlueprintMode('blueprint');
              }}
              className={`px-1.5 py-0.5 rounded-none transition-all font-bold cursor-pointer flex items-center gap-0.5 ${
                blueprintMode === 'blueprint'
                  ? 'bg-[#041224] text-[#00d4ff] shadow-xs'
                  : 'text-[#787770] hover:text-[#1a1c1b]'
              }`}
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>线稿 CAD</span>
            </button>
          </div>
        </div>
      );
    }
  },

  // --- 2. TITLE & META INFO (菜品标题与中英文标识) ---
  {
    id: 'slot_title_badge',
    type: 'title_badge',
    nameZh: '菜品标识与英文名',
    nameEn: 'TITLE_META_BADGE',
    category: 'media_cad',
    targetTabId: 'parameters',
    targetElementId: 'form_card_title',
    icon: Tag,
    description: '展示菜品中英文双语命名、在售接单状态与规格小标签',
    supportedViews: ['hud_card', 'spec_modal'],
    renderCard: (ctx) => {
      const { dish, currentVariant } = ctx;
      return (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#1a1c1b] tracking-tight leading-tight flex items-center gap-1.5 flex-wrap">
              <span>{dish.name}</span>
              {currentVariant && (
                <span className="text-xs font-bold bg-[#f4f4f2] text-[#1a1c1b] px-1.5 py-0.2 rounded-none border border-[#e2e3e1]">
                  {currentVariant.name}
                </span>
              )}
            </h3>
            <span className="text-[11px] font-bold text-[#006d36]">
              {dish.available !== false ? '在售接单中' : '全网已沽清'}
            </span>
          </div>
          {dish.enName && <p className="text-xs text-[#787770] font-mono">{dish.enName}</p>}
        </div>
      );
    },
    renderSpecModal: (ctx) => {
      const { dish, currentVariant, blueprintMode, editFieldSelectorMediaMap } = ctx;
      const dynamicDishForPreview = { ...dish, fieldSelectorMediaMap: editFieldSelectorMediaMap };
      const resolvedMedia = resolveVariantBlueprint(dynamicDishForPreview, currentVariant);

      return (
        <div className="min-w-0 flex-1 space-y-1">
          <div>
            <h4 className="font-bold text-sm text-[#1a1c1b] leading-tight flex items-center gap-1.5 flex-wrap">
              <span>{dish.name}</span>
              {currentVariant && (
                <span className="text-[10px] font-bold bg-[#f4f4f2] text-[#1a1c1b] px-1.5 py-0.5 rounded-none border border-[#e2e3e1]">
                  {currentVariant.name}
                </span>
              )}
            </h4>
            {dish.enName && (
              <p className="text-[10px] text-[#787770] font-mono truncate">{dish.enName}</p>
            )}
          </div>

          {blueprintMode === 'blueprint' && (
            <div className="p-1 bg-[#041224]/5 rounded-none border border-[#041224]/10 text-[9px] font-mono text-[#006d36] flex items-center gap-1.5 flex-wrap">
              <span>料号: {resolvedMedia.artisanCode}</span>
              <span>•</span>
              <span>温控: {resolvedMedia.coreTemp}</span>
              <span>•</span>
              <span>配比: {resolvedMedia.specRatio}</span>
            </div>
          )}
        </div>
      );
    }
  },

  // --- 3. SPICINESS & TASTE (辣度偏好与口感) ---
  {
    id: 'slot_spiciness',
    type: 'spiciness_taste',
    nameZh: '辣度偏好定制',
    nameEn: 'SPICINESS_PREFERENCE',
    category: 'flavor_taste',
    targetTabId: 'parameters',
    targetElementId: 'form_card_spiciness',
    icon: Flame,
    description: '辣度等级预设（微辣/中辣/重辣等）与食客前台可选辣度池',
    supportedViews: ['hud_card', 'spec_modal'],
    getBadgeValue: (ctx) => ctx.selectedSpice || ctx.editSpicinessLevel,
    renderCard: (ctx) => {
      const { editSpicinessLevel, editFlavor, editPrepTime } = ctx;
      return (
        <div className="flex flex-wrap gap-1.5">
          <span className="px-2 py-0.5 rounded-none bg-[#f4f4f2] text-[#1a1c1b] text-[11px] font-medium border border-[#e2e3e1] flex items-center gap-1">
            <Flame className="w-3 h-3 text-[#ba1a1a]" />
            <span>{editSpicinessLevel}</span>
          </span>
          <span className="px-2 py-0.5 rounded-none bg-[#f4f4f2] text-[#1a1c1b] text-[11px] font-medium border border-[#e2e3e1] flex items-center gap-1">
            <ChefHat className="w-3 h-3 text-[#006d36]" />
            <span>{editFlavor}</span>
          </span>
          <span className="px-2 py-0.5 rounded-none bg-[#f4f4f2] text-[#787770] text-[11px] font-mono border border-[#e2e3e1]">
            ⏱️ {editPrepTime}
          </span>
        </div>
      );
    },
    renderSpecModal: (ctx, actions) => {
      const { editSpicinessOptions, selectedSpice } = ctx;
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1a1c1b] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#ba1a1a]" />
              <span>辣度偏好定制</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-[#787770]">
              当前选择: {selectedSpice}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 min-w-0">
            {editSpicinessOptions.map((opt) => {
              const isSel = selectedSpice === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.onSelectSpice(opt);
                  }}
                  className={`min-w-0 px-2.5 py-1.5 rounded-none text-xs font-bold border transition-all cursor-pointer flex items-center justify-between ${
                    isSel
                      ? 'bg-[#000000] text-white border-[#000000] shadow-xs'
                      : 'bg-[#ffffff] text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {isSel && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
  },

  // --- 4. FLAVOR OPTIONS (酱料口味与风味定制) ---
  {
    id: 'slot_flavor_options',
    type: 'flavor_options',
    nameZh: '酱料与口味定制',
    nameEn: 'FLAVOR_OPTIONS',
    category: 'flavor_taste',
    targetTabId: 'parameters',
    targetElementId: 'form_card_flavor',
    icon: ChefHat,
    description: '秘制黑椒、蒜香、藤椒等主味型与食客端调味方案切换',
    supportedViews: ['spec_modal'],
    getBadgeValue: (ctx) => ctx.selectedFlavor || ctx.editFlavor,
    renderSpecModal: (ctx, actions) => {
      const { editFlavorOptions, selectedFlavor } = ctx;
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1a1c1b] flex items-center gap-1.5">
              <ChefHat className="w-3.5 h-3.5 text-[#006d36]" />
              <span>酱料与口味定制</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-[#787770]">
              当前口味: {selectedFlavor}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 min-w-0">
            {editFlavorOptions.map((fOpt) => {
              const isSel = selectedFlavor === fOpt;
              return (
                <button
                  key={fOpt}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.onSelectFlavor(fOpt);
                  }}
                  className={`min-w-0 px-2.5 py-1.5 rounded-none text-xs font-bold border transition-all cursor-pointer flex items-center justify-between ${
                    isSel
                      ? 'bg-[#000000] text-white border-[#000000] shadow-xs'
                      : 'bg-[#ffffff] text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#f4f4f2]'
                  }`}
                >
                  <span className="truncate">{fOpt}</span>
                  {isSel && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
  },

  // --- 5. FLAVOR TAGS (风味标签群) ---
  {
    id: 'slot_flavor_tags',
    type: 'flavor_tags',
    nameZh: '风味标签',
    nameEn: 'FLAVOR_TAGS',
    category: 'flavor_taste',
    targetTabId: 'flavor_tags',
    targetElementId: 'form_card_flavor_tags',
    icon: Tag,
    description: '如 #炙烤焦香 #鲜嫩多汁 #果木熏香 等风味气味标签',
    supportedViews: ['hud_card', 'spec_modal'],
    getBadgeValue: (ctx) => (ctx.editFlavorTags.length > 0 ? `${ctx.editFlavorTags.length}个` : undefined),
    renderCard: (ctx) => {
      const { editFlavorTags } = ctx;
      if (editFlavorTags.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1">
          {editFlavorTags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-[#eeeeec] text-[#474741] px-2 py-0.5 rounded-none font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      );
    },
    renderSpecModal: (ctx) => {
      const { editFlavorTags } = ctx;
      if (editFlavorTags.length === 0) return null;
      return (
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          {editFlavorTags.map((tag) => (
            <span
              key={tag}
              className="bg-[#f4f4f2] text-[#474741] px-1.5 py-0.2 rounded-none text-[9.5px] font-medium border border-[#e2e3e1]"
            >
              #{tag}
            </span>
          ))}
        </div>
      );
    }
  },

  // --- 6. CRAFT SOP & COOKING STYLE (制作工艺风格与出餐SOP) ---
  {
    id: 'slot_craft_sop',
    type: 'craft_sop',
    nameZh: '工艺风格与出餐SOP',
    nameEn: 'CRAFT_COOKING_SOP',
    category: 'sop_trace',
    targetTabId: 'cooking_sop',
    targetElementId: 'form_card_cooking_sop',
    icon: Zap,
    description: '出餐烹饪方式（如炭火现烤/高压微炸）及严格出品标准SOP说明',
    supportedViews: ['spec_modal'],
    getBadgeValue: (ctx) => ctx.editCookingStyle.split(' ')[0],
    renderSpecModal: (ctx) => {
      const { editCookingStyle, editCraftStandardNote } = ctx;
      return (
        <div className="p-2.5 bg-[#f9f9f7] rounded-none border border-[#e2e3e1] space-y-1 text-[10.5px]">
          <div className="flex items-center justify-between text-[#1a1c1b] font-bold">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#006d36]" />
              <span>工艺与出品标准:</span>
            </span>
            <span className="text-[#006d36] font-mono">{editCookingStyle}</span>
          </div>
          {editCraftStandardNote && (
            <p className="text-[#787770] leading-relaxed pl-3.5">
              {editCraftStandardNote}
            </p>
          )}
        </div>
      );
    }
  },

  // --- 7. INGREDIENT TRACEABILITY SOP (食材原产地溯源与配方SOP) ---
  {
    id: 'slot_ingredient_trace',
    type: 'ingredient_trace_sop',
    nameZh: '食材原产地溯源SOP',
    nameEn: 'INGREDIENT_TRACE_SOP',
    category: 'sop_trace',
    targetTabId: 'ingredient_trace',
    targetElementId: 'form_card_ingredient_trace',
    icon: FileSpreadsheet,
    description: '包含原产地地标、质检绿码合格证与视频溯源等安全透明配方SOP',
    supportedViews: ['hud_card', 'spec_modal'],
    getBadgeValue: (ctx) => (ctx.editIngredients.length > 0 ? `${ctx.editIngredients.length}味食材` : undefined),
    renderCard: (ctx) => {
      const { editIngredients } = ctx;
      if (!editIngredients || editIngredients.length === 0) return null;
      return (
        <div className="p-2 bg-[#f0fbf4] rounded-none border border-[#c3eed4] text-[10.5px] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#006d36] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#006d36] shrink-0" />
            <span>食安绿标: 已录入 {editIngredients.length} 味原产地溯源食材</span>
          </div>
          <span className="text-[10px] text-[#006d36] font-mono">100% 透明配方</span>
        </div>
      );
    },
    renderSpecModal: (ctx) => {
      const { editIngredients } = ctx;
      if (!editIngredients || editIngredients.length === 0) return null;
      return (
        <div className="p-2.5 bg-[#f0fbf4] rounded-none border border-[#a8dab5] space-y-1.5 text-[10.5px]">
          <div className="flex items-center justify-between font-bold text-[#006d36]">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#006d36]" />
              <span>食安公开溯源 ({editIngredients.length} 味透明原材)</span>
            </span>
            <span className="text-[10px] font-mono bg-white text-[#006d36] px-1.5 py-0.2 border border-[#a8dab5]">
              批批质检
            </span>
          </div>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {editIngredients.slice(0, 3).map((item, idx) => (
              <span
                key={item.id || idx}
                className="bg-white text-[#1a1c1b] px-1.5 py-0.5 rounded-none border border-[#c8c7be] text-[10px]"
              >
                {item.name} · {item.origin}
              </span>
            ))}
            {editIngredients.length > 3 && (
              <span className="text-[#006d36] font-bold text-[10px] self-center">
                +{editIngredients.length - 3} 种
              </span>
            )}
          </div>
        </div>
      );
    }
  },

  // --- 7B. VIDEO TRACEABILITY & SOP (4K视频溯源与透明工序) ---
  {
    id: 'slot_video_trace_sop',
    type: 'video_trace_sop',
    nameZh: '视频溯源与透明SOP',
    nameEn: 'VIDEO_TRACE_SOP',
    category: 'sop_trace',
    targetTabId: 'ingredient_trace',
    targetElementId: 'form_card_video_trace',
    icon: Video,
    description: '原产地放牧/捕捞实拍、冷链温控监控与出餐工序视频追溯存根',
    supportedViews: ['hud_card', 'spec_modal'],
    getBadgeValue: () => '4K视频存根',
    renderCard: (_ctx, actions) => {
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            actions.onOpenVideoTraceModal?.();
          }}
          className="p-2 bg-[#041224]/5 hover:bg-[#041224]/10 rounded-none border border-[#00d4ff]/30 text-[10.5px] flex items-center justify-between cursor-pointer transition-colors group"
        >
          <div className="flex items-center gap-1.5 text-[#006d36] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006d36] animate-pulse" />
            <Video className="w-3.5 h-3.5 text-[#006d36] shrink-0" />
            <span>4K原产地/冷链工序视频溯源</span>
          </div>
          <span className="text-[10px] bg-[#006d36] text-white px-2 py-0.5 font-mono flex items-center gap-1 group-hover:bg-[#005528] transition-colors">
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>播放存根 00:45</span>
          </span>
        </div>
      );
    },
    renderSpecModal: (_ctx, actions) => {
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            actions.onOpenVideoTraceModal?.();
          }}
          className="p-2.5 bg-[#041224] text-white rounded-none border border-[#00d4ff]/40 space-y-1.5 cursor-pointer hover:border-[#00d4ff] transition-all group"
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-[#00d4ff]">
              <Video className="w-3.5 h-3.5" />
              <span>4K高清视频溯源 · 原产地直供</span>
            </span>
            <span className="text-[9px] font-mono bg-[#00d4ff]/20 text-[#00d4ff] px-1.5 py-0.2 border border-[#00d4ff]/30">
              60 FPS · 实时存根
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-300">
            <span className="truncate mr-2">全流程冷链 -18.2℃ · 批批质检 · 鲜度封存</span>
            <span className="flex items-center gap-1 text-[#00d4ff] font-bold shrink-0 group-hover:scale-105 transition-transform">
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>点此播放实拍</span>
            </span>
          </div>
        </div>
      );
    }
  },

  // --- 8. MULTI-SPEC VARIANTS (规格变体与份量选择) ---
  {
    id: 'slot_variants',
    type: 'variant_selector',
    nameZh: '多规格变体选择器',
    nameEn: 'VARIANT_SELECTOR',
    category: 'spec_variant',
    targetTabId: 'variants',
    targetElementId: 'form_card_variants',
    icon: Layers,
    description: '支持各规格独立图片、独立价格与份量升级配置',
    supportedViews: ['hud_card', 'spec_modal'],
    getBadgeValue: (ctx) => (ctx.editVariants.length > 0 ? `${ctx.editVariants.length + 1}款` : undefined),
    renderCard: (ctx, actions) => {
      const { editVariants, currentVariantIndex, editPrice } = ctx;
      if (editVariants.length === 0) return null;
      return (
        <div className="pt-2.5 border-t border-[#e2e3e1] space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-[#787770] uppercase tracking-wider block">
              选择规格 ({editVariants.length + 1} 种可选):
            </label>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                actions.onSwitchViewMode('spec_modal');
              }}
              className="text-[11px] text-[#006d36] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
            >
              <span>查看完整弹窗 ↗</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                actions.onSelectVariant(-1);
              }}
              className={`p-2 rounded-none border text-left cursor-pointer transition-all ${
                currentVariantIndex === -1
                  ? 'border-[#000000] bg-[#000000] text-white font-bold'
                  : 'border-[#e2e3e1] bg-[#f9f9f7] text-[#1a1c1b]'
              }`}
            >
              <div className="text-xs truncate">标准份</div>
              <div className="text-[10.5px] font-mono opacity-90">
                ¥{parseFloat(editPrice || '0').toFixed(2)}
              </div>
            </button>

            {editVariants.map((v, i) => (
              <button
                key={v.id || i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  actions.onSelectVariant(i);
                }}
                className={`p-2 rounded-none border text-left cursor-pointer transition-all ${
                  currentVariantIndex === i
                    ? 'border-[#000000] bg-[#000000] text-white font-bold'
                    : 'border-[#e2e3e1] bg-[#f9f9f7] text-[#1a1c1b]'
                }`}
              >
                <div className="text-xs truncate">{v.name}</div>
                <div className="text-[10.5px] font-mono opacity-90">
                  ¥{v.price.toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    },
    renderSpecModal: (ctx, actions) => {
      const { editVariants, currentVariantIndex, editPrice } = ctx;
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1a1c1b] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#006d36]" />
              <span>份量与规格选择</span>
              <span className="text-[10px] text-[#787770] font-normal">(必选一项)</span>
            </span>
            <span className="text-[10px] text-[#787770] font-mono font-bold">
              共 {editVariants.length + 1} 种规格
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                actions.onSelectVariant(-1);
              }}
              className={`p-2.5 rounded-none border text-left cursor-pointer transition-all flex flex-col justify-between ${
                currentVariantIndex === -1
                  ? 'border-[#000000] bg-[#000000] text-white shadow-xs font-bold'
                  : 'border-[#e2e3e1] bg-[#ffffff] text-[#1a1c1b] hover:border-[#c8c7be]'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs truncate">标准默认份</span>
                {currentVariantIndex === -1 && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
              </div>
              <div className="mt-1 flex items-baseline justify-between text-[10px] font-mono">
                <span className={currentVariantIndex === -1 ? 'text-neutral-300' : 'text-[#787770]'}>
                  常规单份
                </span>
                <span>¥{parseFloat(editPrice || '0').toFixed(2)}</span>
              </div>
            </button>

            {editVariants.map((v, vIdx) => {
              const isSel = currentVariantIndex === vIdx;
              return (
                <button
                  key={v.id || vIdx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.onSelectVariant(vIdx);
                  }}
                  className={`p-2.5 rounded-none border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSel
                      ? 'border-[#000000] bg-[#000000] text-white shadow-xs font-bold'
                      : 'border-[#e2e3e1] bg-[#ffffff] text-[#1a1c1b] hover:border-[#c8c7be]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs truncate">{v.name}</span>
                    {isSel && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-[10px] font-mono">
                    <span className={isSel ? 'text-neutral-300' : 'text-[#787770]'}>
                      {v.badgeText || '升级款'}
                    </span>
                    <span>¥{v.price.toFixed(2)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }
  },

  // --- 9. PRICE & CHANNEL DISCOUNTS (基准售价与渠道立减) ---
  {
    id: 'slot_pricing',
    type: 'price_benchmark',
    nameZh: '基准售价与渠道立减',
    nameEn: 'PRICE_AND_DISCOUNT',
    category: 'pricing',
    targetTabId: 'price_discount',
    targetElementId: 'form_card_price',
    icon: SlidersHorizontal,
    description: '基准原价、外卖专享立减与堂食特惠规则计算',
    supportedViews: ['hud_card', 'spec_modal'],
    getBadgeValue: (ctx) => `¥${ctx.finalUnitPrice.toFixed(2)}`,
    renderCard: (ctx, actions) => {
      const { finalUnitPrice, editOriginalPrice, currentDiscount, editVariants } = ctx;
      return (
        <div className="pt-3 border-t border-[#e2e3e1] flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-[#1a1c1b]">¥</span>
              <span className="text-xl font-bold font-mono text-[#1a1c1b] tracking-tight leading-none">
                {finalUnitPrice.toFixed(2)}
              </span>
              {editOriginalPrice && (
                <span className="text-[11px] font-mono text-[#787770] line-through ml-1">
                  ¥{parseFloat(editOriginalPrice).toFixed(2)}
                </span>
              )}
            </div>
            {currentDiscount > 0 && (
              <span className="text-[10px] text-[#006d36] font-bold block mt-0.5">
                已享立减 ¥{currentDiscount.toFixed(2)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              actions.onSwitchViewMode('spec_modal');
            }}
            className="px-3.5 py-2 bg-[#000000] text-[#ffffff] rounded-none font-bold text-xs hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{editVariants.length > 0 ? '选规格' : '个性化定制'}</span>
          </button>
        </div>
      );
    },
    renderSpecModal: (ctx) => {
      const { finalUnitPrice, editOriginalPrice, currentDiscount, channel, editDeliveryDiscountTag, editDineInDiscountTag } = ctx;
      return (
        <div className="flex items-baseline gap-1 flex-wrap">
          <span className="text-xs font-bold text-[#1a1c1b]">¥</span>
          <span className="text-lg font-bold font-mono text-[#1a1c1b] tracking-tight">
            {finalUnitPrice.toFixed(2)}
          </span>
          {editOriginalPrice && (
            <span className="text-[10.5px] text-[#787770] line-through font-mono">
              ¥{parseFloat(editOriginalPrice).toFixed(2)}
            </span>
          )}
          {currentDiscount > 0 && (
            <span className="text-[9.5px] font-bold text-[#ba1a1a] bg-[#ffdad6] border border-[#ffb4ab] px-1.5 py-0.2 rounded-none">
              {channel === 'delivery'
                ? editDeliveryDiscountTag || `立减 ¥${currentDiscount}`
                : editDineInDiscountTag || `堂食立减 ¥${currentDiscount}`}
            </span>
          )}
        </div>
      );
    }
  },

  // --- 10. QUANTITY STEPPER (选购数量与起购控制) ---
  {
    id: 'slot_order_stepper',
    type: 'order_stepper',
    nameZh: '选购数量与限流控额',
    nameEn: 'QUANTITY_STEPPER',
    category: 'pricing',
    targetTabId: 'operating_rules',
    targetElementId: 'form_card_operating',
    icon: ShoppingBag,
    description: '前台加购份数步进器，受起购门槛与运营风控规则约束',
    supportedViews: ['spec_modal'],
    getBadgeValue: (ctx) => `×${ctx.quantity}`,
    renderSpecModal: (ctx, actions) => {
      const { quantity, minOrderThreshold } = ctx;
      return (
        <div className="pt-2 border-t border-[#e2e3e1] flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#1a1c1b]">选购数量</div>
            <div className="text-[10px] text-[#787770]">
              {minOrderThreshold > 1 ? `起购限制: ${minOrderThreshold}份` : '单笔订购上限 99 份'}
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[#f4f4f2] p-1 rounded-none border border-[#e2e3e1]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                actions.onUpdateQuantity(-1);
              }}
              className="w-6 h-6 rounded-none bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-[#1a1c1b] shadow-xs cursor-pointer active:scale-95 transition-all"
              title="减少"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-7 text-center font-mono font-bold text-xs text-[#1a1c1b]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                actions.onUpdateQuantity(1);
              }}
              className="w-6 h-6 rounded-none bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-[#1a1c1b] shadow-xs cursor-pointer active:scale-95 transition-all"
              title="增加"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    }
  }
];

export const globalSlotRegistry = new DynamicSlotRegistryService(DEFAULT_PREVIEW_SLOTS);

// ============================================================================
// 3. DYNAMIC PREVIEW ENGINE COMPONENT (动态渲染引擎主体)
// ============================================================================

export interface DynamicDishPreviewEngineProps {
  context: DynamicPreviewContext;
  actions: SlotActionHandlers;
  activeLeftTab?: string;
  onSlotInspected?: (slot: DynamicSlotDefinition) => void;
  slotsRegistry?: DynamicSlotDefinition[];
}

export const DynamicDishPreviewEngine: React.FC<DynamicDishPreviewEngineProps> = ({
  context,
  actions,
  activeLeftTab,
  onSlotInspected,
  slotsRegistry = DEFAULT_PREVIEW_SLOTS
}) => {
  // Visual Inspector State (可视化侦测模式)
  const [inspectorEnabled, setInspectorEnabled] = useState<boolean>(true);
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const [showTypeSchemaDrawer, setShowTypeSchemaDrawer] = useState<boolean>(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);

  // Enhanced actions with video modal handling
  const engineActions: SlotActionHandlers = useMemo(() => ({
    ...actions,
    onOpenVideoTraceModal: () => {
      if (actions.onOpenVideoTraceModal) {
        actions.onOpenVideoTraceModal();
      } else {
        setIsVideoModalOpen(true);
      }
    }
  }), [actions]);

  // Filter slots for current view
  const activeSlots = useMemo(() => {
    return slotsRegistry.filter((slot) => slot.supportedViews.includes(context.previewStyleMode));
  }, [slotsRegistry, context.previewStyleMode]);

  // Slot helper lookup
  const getSlot = (id: string) => slotsRegistry.find((s) => s.id === id);

  // Inspector element wrapper with hover detection & click-to-locate
  const renderInspectableSlot = (slotId: string, node: React.ReactNode) => {
    const slot = getSlot(slotId);
    if (!slot) return node;

    const isHovered = hoveredSlotId === slot.id && inspectorEnabled;
    const isLinkedToLeftTab = activeLeftTab === slot.targetTabId;

    return (
      <div
        key={slot.id}
        onMouseEnter={() => setHoveredSlotId(slot.id)}
        onMouseLeave={() => setHoveredSlotId(null)}
        onClick={(e) => {
          if (inspectorEnabled) {
            e.stopPropagation();
            actions.onLocateLeftField(slot.targetTabId, slot.targetElementId, slot.nameZh);
            onSlotInspected?.(slot);
          }
        }}
        className={`relative transition-all duration-200 group ${
          inspectorEnabled ? 'cursor-crosshair' : ''
        } ${
          isHovered
            ? 'ring-2 ring-[#006d36] bg-[#006d36]/5 shadow-sm'
            : isLinkedToLeftTab
            ? 'ring-1.5 ring-[#006d36]/50 bg-[#006d36]/2'
            : ''
        }`}
      >
        {node}

        {/* Floating Inspector HUD Label */}
        {inspectorEnabled && (
          <div
            className={`absolute top-0 right-0 z-30 pointer-events-none transition-opacity duration-150 ${
              isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <div className="bg-[#000000] text-white text-[9.5px] font-mono font-bold px-2 py-0.5 shadow-md flex items-center gap-1 border-b border-l border-white/20 whitespace-nowrap">
              <Crosshair className="w-2.5 h-2.5 text-[#00d4ff] animate-pulse" />
              <span>{slot.nameZh}</span>
              <span className="text-[#00d4ff]/80 text-[8.5px]">[{slot.type}]</span>
              <span className="text-[#c8c7be] text-[8px]">🎯点击定位</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full select-none">
      {/* 1. ENGINE CONTROL HEADER BAR */}
      <div className="px-3.5 py-2 bg-[#ffffff] border-b border-[#e2e3e1] flex items-center justify-between gap-2 shrink-0 flex-wrap">
        {/* Channel Selector */}
        <div className="flex items-center gap-1 bg-[#f4f4f2] p-0.5 rounded-none border border-[#e2e3e1]">
          <button
            type="button"
            onClick={() => {
              if (actions.onSwitchChannel) {
                actions.onSwitchChannel('delivery');
              } else {
                actions.onLocateLeftField('price_discount', 'form_card_price', '外卖渠道立减');
              }
            }}
            className={`px-2 py-1 rounded-none text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              context.channel === 'delivery'
                ? 'bg-[#000000] text-white shadow-sm'
                : 'text-[#787770] hover:text-[#1a1c1b]'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>外卖</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (actions.onSwitchChannel) {
                actions.onSwitchChannel('dine_in');
              } else {
                actions.onLocateLeftField('price_discount', 'form_card_price', '堂食渠道立减');
              }
            }}
            className={`px-2 py-1 rounded-none text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              context.channel === 'dine_in'
                ? 'bg-[#000000] text-white shadow-sm'
                : 'text-[#787770] hover:text-[#1a1c1b]'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>堂食</span>
          </button>
        </div>

        {/* View Mode Toggle: 卡片 vs 选规格 */}
        <div className="flex items-center gap-1 bg-[#f4f4f2] p-0.5 rounded-none border border-[#e2e3e1]">
          <button
            type="button"
            onClick={() => actions.onSwitchViewMode('hud_card')}
            className={`px-2 py-1 rounded-none text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              context.previewStyleMode === 'hud_card'
                ? 'bg-[#000000] text-white shadow-sm'
                : 'text-[#787770] hover:text-[#1a1c1b]'
            }`}
            title="查看菜品列表单品卡片样式"
          >
            <span>单品卡片</span>
          </button>
          <button
            type="button"
            onClick={() => actions.onSwitchViewMode('spec_modal')}
            className={`px-2 py-1 rounded-none text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              context.previewStyleMode === 'spec_modal'
                ? 'bg-[#000000] text-white shadow-sm'
                : 'text-[#787770] hover:text-[#1a1c1b]'
            }`}
            title="查看食客端点击选规格时弹出的个性化定制界面"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>选规格预览</span>
          </button>
        </div>

        {/* Dynamic Engine Inspector & Schema Controls */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Toggle Interactive Inspector */}
          <button
            type="button"
            onClick={() => setInspectorEnabled(!inspectorEnabled)}
            className={`h-7 px-2 text-[11px] font-bold border transition-all flex items-center gap-1 rounded-none cursor-pointer ${
              inspectorEnabled
                ? 'border-[#006d36] bg-[#006d36] text-white shadow-xs'
                : 'border-[#d3d1cb] bg-[#f9f9f7] text-[#474741] hover:bg-[#f4f4f2]'
            }`}
            title={inspectorEnabled ? '点击关闭组件定位侦测模式' : '点击开启组件定位侦测模式（点击任意部件直达左侧编辑项）'}
          >
            <MousePointerClick className="w-3.5 h-3.5" />
            <span>{inspectorEnabled ? '联动侦测:开' : '联动侦测:关'}</span>
          </button>

          {/* Type Schema Drawer Button */}
          <button
            type="button"
            onClick={() => setShowTypeSchemaDrawer(!showTypeSchemaDrawer)}
            className={`h-7 px-2 text-[11px] font-bold border transition-all flex items-center gap-1 rounded-none cursor-pointer ${
              showTypeSchemaDrawer
                ? 'border-[#000000] bg-[#000000] text-white'
                : 'border-[#d3d1cb] bg-[#f9f9f7] text-[#474741] hover:bg-[#f4f4f2]'
            }`}
            title="查看软编码动态类型与注册插槽映射表"
          >
            <span>类型体系</span>
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC QUICK JUMP RIBBON (插槽快捷直达条) */}
      <div className="bg-[#f4f4f2] px-3 py-1.5 border-b border-[#e2e3e1] flex items-center gap-1 overflow-x-auto hide-scrollbar shrink-0 text-[10.5px]">
        <span className="text-[#787770] font-bold shrink-0 flex items-center gap-1 mr-1">
          <Crosshair className="w-3 h-3 text-[#006d36]" />
          <span>直达:</span>
        </span>
        {activeSlots.map((slot) => {
          const Icon = slot.icon;
          const isLinked = activeLeftTab === slot.targetTabId;
          const badgeVal = slot.getBadgeValue?.(context);

          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => {
                actions.onLocateLeftField(slot.targetTabId, slot.targetElementId, slot.nameZh);
                setHoveredSlotId(slot.id);
                setTimeout(() => setHoveredSlotId(null), 1800);
              }}
              className={`px-2 py-0.5 rounded-none font-medium shrink-0 flex items-center gap-1 border transition-all cursor-pointer ${
                isLinked
                  ? 'bg-[#000000] text-white border-[#000000] font-bold shadow-xs'
                  : 'bg-white text-[#474741] border-[#d3d1cb] hover:bg-[#eaeae8] hover:text-[#1a1c1b]'
              }`}
              title={`点击直达左侧「${slot.nameZh}」配置并高亮`}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span>{slot.nameZh}</span>
              {badgeVal && (
                <span className={`text-[9px] px-1 py-0.1 font-mono ${isLinked ? 'bg-white/20 text-white' : 'bg-[#eeeeec] text-[#1a1c1b]'}`}>
                  {badgeVal}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. DYNAMIC TYPE SCHEMA DRAWER (软编码动态类型体系面板) */}
      {showTypeSchemaDrawer && (
        <div className="p-3 bg-[#1a1c1b] text-[#f4f4f2] text-xs border-b border-[#333] space-y-2 animate-in fade-in duration-150 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 bg-[#00d4ff]" />
              <span>软编码动态插槽架构 (Dynamic Slots Registry)</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 font-mono">
                {slotsRegistry.length} 个已注册
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowTypeSchemaDrawer(false)}
              className="text-[#c8c7be] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-[#a0a09a] leading-relaxed">
            本预览模块采用统一的软编码插槽驱动架构（Schema-Driven Engine）。左侧辣度口感、风味标签、工艺SOP、食材视频溯源、价格立减与规格变体均动态绑定至插槽注册表中，支持点击反向定位与实时高亮。
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto hide-scrollbar font-mono text-[10px]">
            {slotsRegistry.map((s) => (
              <div
                key={s.id}
                onClick={() => actions.onLocateLeftField(s.targetTabId, s.targetElementId, s.nameZh)}
                className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-none cursor-pointer flex items-center justify-between"
              >
                <div className="truncate">
                  <div className="text-white font-bold">{s.nameZh}</div>
                  <div className="text-[#00d4ff] text-[8.5px] truncate">{s.nameEn}</div>
                </div>
                <span className="text-[#a0a09a] text-[8.5px] shrink-0">Tab: {s.targetTabId}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MAIN PREVIEW ENGINE CANVAS (主动态画布) */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 hide-scrollbar">
        {/* ========================================================================= */}
        {/* VIEW MODE A: HUD CARD (单品卡片动态渲染)                                    */}
        {/* ========================================================================= */}
        {context.previewStyleMode === 'hud_card' && (
          <div className="bg-[#ffffff] rounded-none p-4 sm:p-5 border border-[#e2e3e1] shadow-none space-y-4">
            {/* Slot 1: Hero Media */}
            {renderInspectableSlot(
              'slot_hero_media',
              getSlot('slot_hero_media')?.renderCard?.(context, engineActions)
            )}

            {/* Slot 2: Title & Meta */}
            {renderInspectableSlot(
              'slot_title_badge',
              getSlot('slot_title_badge')?.renderCard?.(context, engineActions)
            )}

            {/* Slot 3: Spiciness & Taste */}
            {renderInspectableSlot(
              'slot_spiciness',
              getSlot('slot_spiciness')?.renderCard?.(context, engineActions)
            )}

            {/* Slot 5: Flavor Tags */}
            {context.editFlavorTags.length > 0 &&
              renderInspectableSlot(
                'slot_flavor_tags',
                getSlot('slot_flavor_tags')?.renderCard?.(context, engineActions)
              )}

            {/* Slot 7B: Video Traceability SOP */}
            {renderInspectableSlot(
              'slot_video_trace_sop',
              getSlot('slot_video_trace_sop')?.renderCard?.(context, engineActions)
            )}

            {/* Slot 7: Ingredient Traceability */}
            {context.editIngredients.length > 0 &&
              renderInspectableSlot(
                'slot_ingredient_trace',
                getSlot('slot_ingredient_trace')?.renderCard?.(context, engineActions)
              )}

            {/* Slot 8: Variants Selector */}
            {context.editVariants.length > 0 &&
              renderInspectableSlot(
                'slot_variants',
                getSlot('slot_variants')?.renderCard?.(context, engineActions)
              )}

            {/* Slot 9: Pricing & CTA Button */}
            {renderInspectableSlot(
              'slot_pricing',
              getSlot('slot_pricing')?.renderCard?.(context, engineActions)
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE B: SPEC MODAL (选规格个性化定制弹窗动态渲染)                        */}
        {/* ========================================================================= */}
        {context.previewStyleMode === 'spec_modal' && (
          <div className="bg-[#ffffff] rounded-none border border-[#e2e3e1] shadow-none overflow-hidden flex flex-col animate-in fade-in duration-150">
            {/* Simulated Mobile Status Bar */}
            <div className="bg-[#1a1c1b] text-[#c8c7be] px-4 py-1.5 text-[10px] flex items-center justify-between font-mono select-none">
              <span className="font-bold">09:41</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-[#006d36] text-white px-1.5 py-0.2 rounded-none font-sans font-bold">
                  5G GPS 极速专送
                </span>
                <div className="w-4 h-2 border border-[#787770] rounded-none relative p-[1px]">
                  <div className="bg-white h-full w-3/4 rounded-none" />
                </div>
              </div>
            </div>

            {/* Modal Title Bar */}
            <div className="px-3.5 py-2.5 bg-[#f9f9f7] border-b border-[#e2e3e1] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-none bg-[#006d36] shrink-0" />
                <span className="font-bold text-xs text-[#1a1c1b] truncate">
                  选规格与个性化定制
                </span>
                <span
                  className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-none shrink-0 ${
                    context.channel === 'delivery'
                      ? 'bg-[#e6f4ea] text-[#006d36] border border-[#a8dab5]'
                      : 'bg-[#f4f4f2] text-[#1a1c1b] border border-[#e2e3e1]'
                  }`}
                >
                  {context.channel === 'delivery' ? '🛵 外卖专送' : '🍽️ 餐车堂食'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => actions.onSwitchViewMode('hud_card')}
                className="text-[11px] font-bold text-[#787770] hover:text-[#000000] px-2 py-1 rounded-none hover:bg-[#eeeeec] transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                title="切换回菜品卡片样式"
              >
                <span>切回卡片</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-3.5 sm:p-4 space-y-4 max-h-[540px] overflow-y-auto overflow-x-hidden hide-scrollbar min-w-0">
              {/* Showcase Row: Slot 1 (Hero Media / CAD) + Slot 2 (Title / Meta) + Slot 9 (Price) */}
              <div className="flex gap-2.5 sm:gap-3 items-start pb-3.5 border-b border-[#e2e3e1] min-w-0">
                {/* Hero Media Window */}
                {renderInspectableSlot(
                  'slot_hero_media',
                  getSlot('slot_hero_media')?.renderSpecModal?.(context, engineActions)
                )}

                {/* Right Info Column */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  {renderInspectableSlot(
                    'slot_title_badge',
                    getSlot('slot_title_badge')?.renderSpecModal?.(context, engineActions)
                  )}

                  {renderInspectableSlot(
                    'slot_pricing',
                    getSlot('slot_pricing')?.renderSpecModal?.(context, engineActions)
                  )}

                  {/* Summary of selections */}
                  <div className="text-[10px] text-[#787770] flex items-center gap-1 flex-wrap pt-0.5">
                    <span>已选:</span>
                    <span className="text-[#1a1c1b] font-bold">
                      {context.currentVariant ? context.currentVariant.name : '标准默认份'}
                    </span>
                    <span>·</span>
                    <span className="text-[#1a1c1b] font-bold">{context.selectedSpice}</span>
                    <span>·</span>
                    <span className="text-[#1a1c1b] font-bold">{context.selectedFlavor}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[9.5px] text-[#787770]">
                    <span className="flex items-center gap-0.5 text-[#006d36] font-bold">
                      <CheckCircle2 className="w-2.5 h-2.5" /> 现点现烤
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5 font-mono">
                      <Clock className="w-2.5 h-2.5" /> {context.editPrepTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Slot 8: Variants Selector */}
              {renderInspectableSlot(
                'slot_variants',
                getSlot('slot_variants')?.renderSpecModal?.(context, engineActions)
              )}

              {/* Slot 3: Spiciness Customization */}
              {renderInspectableSlot(
                'slot_spiciness',
                getSlot('slot_spiciness')?.renderSpecModal?.(context, engineActions)
              )}

              {/* Slot 4: Flavor Customization */}
              {renderInspectableSlot(
                'slot_flavor_options',
                getSlot('slot_flavor_options')?.renderSpecModal?.(context, engineActions)
              )}

              {/* Slot 6 & Slot 5: Craft Standard SOP & Flavor Tags */}
              {renderInspectableSlot(
                'slot_craft_sop',
                <div className="space-y-1.5">
                  {getSlot('slot_craft_sop')?.renderSpecModal?.(context, engineActions)}
                  {getSlot('slot_flavor_tags')?.renderSpecModal?.(context, engineActions)}
                </div>
              )}

              {/* Slot 7B: Video Traceability SOP */}
              {renderInspectableSlot(
                'slot_video_trace_sop',
                getSlot('slot_video_trace_sop')?.renderSpecModal?.(context, engineActions)
              )}

              {/* Slot 7: Ingredient Traceability Summary */}
              {context.editIngredients.length > 0 &&
                renderInspectableSlot(
                  'slot_ingredient_trace',
                  getSlot('slot_ingredient_trace')?.renderSpecModal?.(context, engineActions)
                )}

              {/* Slot 10: Quantity Stepper */}
              {renderInspectableSlot(
                'slot_order_stepper',
                getSlot('slot_order_stepper')?.renderSpecModal?.(context, engineActions)
              )}
            </div>

            {/* STICKY BOTTOM ACTION BAR */}
            <div className="p-3 bg-[#f9f9f7] border-t border-[#e2e3e1] flex items-center justify-between gap-2 min-w-0 flex-wrap sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-xs text-[#787770] font-bold">合计:</span>
                  <span className="text-xs font-bold text-[#1a1c1b]">¥</span>
                  <span className="text-base sm:text-lg font-bold font-mono text-[#1a1c1b] tracking-tight">
                    {context.finalTotalPrice.toFixed(2)}
                  </span>
                  {context.editOriginalPrice && (
                    <span className="text-[10px] text-[#787770] line-through font-mono">
                      ¥{(parseFloat(context.editOriginalPrice) * context.quantity).toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="text-[9.5px] text-[#006d36] font-bold truncate">
                  {context.currentDiscount > 0 ? (
                    <span>
                      已享{context.channel === 'delivery' ? '外卖' : '堂食'}立减 ¥{(context.currentDiscount * context.quantity).toFixed(2)}
                    </span>
                  ) : (
                    <span>含选定规格与调味定制</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={actions.onAddToCart}
                className="px-3.5 py-2 bg-[#000000] hover:bg-neutral-800 text-white rounded-none font-bold text-xs shadow-sm cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ml-auto"
              >
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {context.channel === 'delivery'
                    ? `加入外卖单 (${context.editPrepTime})`
                    : `确认堂食加点`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. 4K VIDEO TRACEABILITY SIMULATION MODAL (4K视频溯源存根播放器弹窗) */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#0f172a] text-white border border-slate-700 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-[#00d4ff]" />
                <span className="font-bold text-sm">4K原产地与出餐视频溯源存根</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 font-mono">
                  LIVE STREAMING
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player Canvas Simulation */}
            <div className="relative aspect-video bg-black flex flex-col justify-between p-3 overflow-hidden border-b border-slate-800">
              {/* Top HUD Telemetry */}
              <div className="flex items-center justify-between text-[10px] font-mono text-[#00d4ff] z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-white font-bold">CAM-01 牧场/原产工序存根</span>
                  <span>4K UHD · 60FPS</span>
                </div>
                <div className="text-slate-400">
                  RTK: 31.2304°N, 121.4737°E
                </div>
              </div>

              {/* Background Video Frame Mock Image */}
              <img
                src={context.currentVariant?.imageUrl || context.dish.imageUrl}
                alt="溯源视频实景"
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />

              {/* Play / Pause Central Indicator */}
              <div className="self-center my-auto z-10 flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-black/60 border-2 border-emerald-400 flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition-transform">
                  <Play className="w-6 h-6 text-emerald-400 fill-current ml-0.5" />
                </div>
                <div className="bg-black/70 px-2.5 py-1 text-xs font-mono font-bold text-white border border-white/20">
                  {context.dish.name} · 全流程溯源存根
                </div>
              </div>

              {/* Bottom HUD Controls */}
              <div className="z-10 space-y-1.5">
                {/* Progress bar */}
                <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full w-2/5 animate-pulse" />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                  <span>00:18 / 00:45</span>
                  <span className="text-emerald-400">冷链温控: -18.2℃ 深冷锁鲜正常</span>
                </div>
              </div>
            </div>

            {/* Traceability Metadata Body */}
            <div className="p-4 bg-slate-900/90 text-xs space-y-3">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-800/60 border border-slate-700">
                  <span className="text-slate-400 block text-[10px]">原产地认证:</span>
                  <span className="font-bold text-white flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    国家地理标志保护产品
                  </span>
                </div>
                <div className="p-2 bg-slate-800/60 border border-slate-700">
                  <span className="text-slate-400 block text-[10px]">溯源码与质检编号:</span>
                  <span className="font-mono font-bold text-[#00d4ff] flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5" />
                    TR-2026-883921
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed">
                食客可在前台通过微信扫码或点单弹窗点击视频存根，查看从食材养殖采摘、冷链运输、到餐车KDS现烹的4K影像。
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-none font-bold text-xs cursor-pointer"
                >
                  关闭预览
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsVideoModalOpen(false);
                    actions.onLocateLeftField('ingredient_trace', 'form_card_video_trace', '食材视频与照片存根');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>定位左侧修改视频/食材溯源</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
