import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Check,
  Flame,
  ChefHat,
  Tag,
  Barcode,
  Layers,
  Sparkles,
  Sliders,
  SlidersHorizontal,
  Pencil,
  PanelRight,
  Image as ImageIcon,
  Bike,
  Utensils,
  ShoppingBag,
  Shield,
  Clock,
  Zap,
  ZoomIn,
  Camera,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  RotateCcw,
  Copy,
  Plus,
  Minus,
  Trash2,
  Crown,
  Lock,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ListFilter,
  Search,
  RefreshCw,
  Save,
  Radio,
  Eye,
  Activity,
  Wifi,
  QrCode,
  CheckCheck
} from 'lucide-react';
import {
  DishItem,
  DishVariant,
  DishOptionGroup,
  FieldSelectorMediaItem,
  DishIngredientItem
} from '../../types';
import { globalScannerEngine } from '../../utils/barcodeScannerEngine';
import { globalFranchiseEngine } from '../../utils/franchiseTenantEngine';
import { FlavorTagSelector } from './FlavorTagSelector';
import { MediaLibraryPicker } from './MediaLibraryPicker';
import {
  SPICINESS_PRESETS,
  FLAVOR_PRESETS
} from './MerchantMenuChannel';
import {
  generateArtisanSvgBlueprint,
  PRESET_SELECTOR_MEDIA_BANK
} from '../../utils/autoBlueprintEngine';
import {
  getDishIngredients,
  saveDishIngredients,
  getDishTraceabilityMeta,
  saveDishTraceabilityMeta
} from '../../utils/ingredientTraceEngine';
import { IngredientTraceSopSection } from './IngredientTraceSopSection';
import {
  DynamicDishPreviewEngine,
  DynamicPreviewContext,
  SlotActionHandlers
} from './DynamicDishPreviewEngine';

export interface DishParameterRulesModalProps {
  dish: DishItem;
  initialTab?:
    | 'parameters'
    | 'flavor_tags'
    | 'price_discount'
    | 'cooking_sop'
    | 'ingredient_trace'
    | 'image'
    | 'barcode'
    | 'preview'
    | 'variants'
    | 'operating_rules'
    | 'selector_media';
  onClose: () => void;
  onSave: (updatedDish: DishItem) => void;
  showToast: (msg: string) => void;
  onPreviewZoom?: (dish: DishItem) => void;
  onOpenUploadModal?: (dish: DishItem) => void;
}

export const DishParameterRulesModal: React.FC<DishParameterRulesModalProps> = ({
  dish,
  initialTab = 'parameters',
  onClose,
  onSave,
  showToast,
  onPreviewZoom
}) => {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<
    | 'parameters'
    | 'price_discount'
    | 'operating_rules'
    | 'variants'
    | 'selector_media'
    | 'barcode'
    | 'cooking_sop'
    | 'ingredient_trace'
  >(() => {
    if (initialTab === 'flavor_tags' || initialTab === 'image') return 'parameters';
    if (initialTab === 'preview') return 'parameters';
    return (initialTab as any) || 'parameters';
  });

  // Tiled view toggle (平铺全部展示 vs 选项卡切换)
  const [isTiledView, setIsTiledView] = useState<boolean>(false);

  // Full broadcast sync loading state
  const [isBroadcastingSync, setIsBroadcastingSync] = useState<boolean>(false);
  const [broadcastDone, setBroadcastDone] = useState<boolean>(false);

  // Form states - Pricing
  const [editPrice, setEditPrice] = useState<string>(dish.price.toString());
  const [editOriginalPrice, setEditOriginalPrice] = useState<string>(
    dish.originalPrice ? dish.originalPrice.toString() : '45.00'
  );
  const [editPrevPrice, setEditPrevPrice] = useState<string>(
    dish.prevPrice ? dish.prevPrice.toString() : '42.00'
  );
  const [editDeliveryDiscount, setEditDeliveryDiscount] = useState<string>(
    dish.deliveryDiscount !== undefined ? dish.deliveryDiscount.toString() : '5.00'
  );
  const [editDeliveryDiscountTag, setEditDeliveryDiscountTag] = useState<string>(
    dish.deliveryDiscountTag || (dish.deliveryDiscount ? `外卖立减¥${dish.deliveryDiscount}` : '外卖立减¥5.00')
  );
  const [editDineInDiscount, setEditDineInDiscount] = useState<string>(
    dish.dineInDiscount !== undefined ? dish.dineInDiscount.toString() : '3.00'
  );
  const [editDineInDiscountTag, setEditDineInDiscountTag] = useState<string>(
    dish.dineInDiscountTag || (dish.dineInDiscount ? `堂食立减¥${dish.dineInDiscount}` : '堂食立减¥3.00')
  );

  // Spiciness, Flavor, SOP
  const [editSpicinessLevel, setEditSpicinessLevel] = useState<string>(
    dish.spicinessLevel || '微辣 (推荐)'
  );
  const [editSpicinessOptions, setEditSpicinessOptions] = useState<string[]>(
    dish.spicinessOptions && dish.spicinessOptions.length > 0
      ? dish.spicinessOptions
      : ['微辣 (默认)', '不辣 (免辣)', '中辣 (加香)', '特辣 (地狱辣酱)']
  );
  const [newSpiceInput, setNewSpiceInput] = useState<string>('');

  const [editFlavor, setEditFlavor] = useState<string>(dish.flavor || '秘制黑椒汁');
  const [editFlavorOptions, setEditFlavorOptions] = useState<string[]>(
    dish.flavorOptions && dish.flavorOptions.length > 0
      ? dish.flavorOptions
      : ['秘制黑椒汁', '黑松露蒜香', '藤椒炭烤风味', '日式烟熏照烧']
  );
  const [editFlavorTags, setEditFlavorTags] = useState<string[]>(
    dish.flavorTags && dish.flavorTags.length > 0 ? dish.flavorTags : ['果木炭烤', '和牛原切', '现煎多汁']
  );
  // 方向补充: 主理人口味风格标签可编辑（重命名 / 删除 / 新增）
  const [renamingOptionIndex, setRenamingOptionIndex] = useState<number | null>(null);
  const [renamingDraft, setRenamingDraft] = useState<string>('');
  const [newFlavorOptionDraft, setNewFlavorOptionDraft] = useState<string>('');
  // 方向补充: 口味池专属图片 + 素材库选择器
  const [editFlavorOptionImages, setEditFlavorOptionImages] = useState<Record<string, string>>(
    dish.flavorOptionImages ? { ...dish.flavorOptionImages } : {}
  );
  const [variantImagePickerIndex, setVariantImagePickerIndex] = useState<number | null>(null);
  const [flavorImagePickerTarget, setFlavorImagePickerTarget] = useState<string | null>(null);
  // 方向补充: 平铺模式模块导航（锚点跳转 + 高亮聚焦）
  const [activeAnchorPane, setActiveAnchorPane] = useState<string | null>(null);
  const [editCookingStyle, setEditCookingStyle] = useState<string>(
    dish.cookingStyle || '炭火现烤 (果木炭慢烘)'
  );
  const [editCraftStandardNote, setEditCraftStandardNote] = useState<string>(
    dish.craftStandardNote || '高温果木炭慢火烘烤，双面翻烤锁住汁水，出炉撒秘制调料'
  );
  const [editBadgeText, setEditBadgeText] = useState<string>(dish.badgeText || '全渠道爆品');
  const [editPrepTime, setEditPrepTime] = useState<string>(dish.prepTime || '8m');

  // Barcode & Hardware Scanner
  const [editBarcode, setEditBarcode] = useState<string>(dish.barcode || '6972049182301');
  const [scannerSimInput, setScannerSimInput] = useState<string>('');
  const [lastScanLatency, setLastScanLatency] = useState<string>('14ms');
  const [isListeningForBarcodeScan, setIsListeningForBarcodeScan] = useState<boolean>(false);

  // Variants (Multi-spec)
  const [editVariants, setEditVariants] = useState<DishVariant[]>(() => {
    if (dish.variants && dish.variants.length > 0) {
      return JSON.parse(JSON.stringify(dish.variants));
    }
    return [
      {
        id: 'SPEC-WAGYU-STD',
        name: '标准单层和牛堡',
        enName: 'Standard Wagyu Single',
        price: 38.0,
        specRatio: '130g / 单层',
        prepTime: '8m',
        available: true
      },
      {
        id: 'SPEC-WAGYU-DBL',
        name: '尊享双层和牛堡',
        enName: 'Deluxe Wagyu Double',
        price: 56.0,
        specRatio: '260g / 双层肉饼',
        prepTime: '11m',
        available: true
      },
      {
        id: 'SPEC-WAGYU-THK',
        name: '厚切极炙炭烤堡 (M9雪花)',
        enName: 'M9 Thick Cut Wagyu',
        price: 68.0,
        specRatio: '180g / 厚切原块',
        prepTime: '13m',
        available: true
      }
    ];
  });

  // Field Selector Media Map & Option Groups (CAD & Line-art)
  const [editFieldSelectorMediaMap, setEditFieldSelectorMediaMap] = useState<Record<string, FieldSelectorMediaItem>>(
    dish.fieldSelectorMediaMap ? JSON.parse(JSON.stringify(dish.fieldSelectorMediaMap)) : {}
  );
  const [editOptionGroups, setEditOptionGroups] = useState<DishOptionGroup[]>(
    dish.optionGroups ? JSON.parse(JSON.stringify(dish.optionGroups)) : []
  );
  const [selectorCategoryFilter, setSelectorCategoryFilter] = useState<'all' | 'variant' | 'flavor' | 'option'>('all');

  // Operational Rules (限流与全渠道风控)
  const [minOrderThreshold, setMinOrderThreshold] = useState<number>(0);
  const [peakThrottleLimit, setPeakThrottleLimit] = useState<number>(30); // 15分钟峰值限流
  const [autoSoldOutThreshold, setAutoSoldOutThreshold] = useState<number>(5); // 安全库存自动沽清
  const [couponStackingAllowed, setCouponStackingAllowed] = useState<boolean>(true);
  const [riderBoxCodeRequired, setRiderBoxCodeRequired] = useState<boolean>(true);
  const [nightCutoffEnabled, setNightCutoffEnabled] = useState<boolean>(true);
  const [nightCutoffTime, setNightCutoffTime] = useState<string>('21:30');
  const [dailyQuotaEnabled, setDailyQuotaEnabled] = useState<boolean>(true);
  const [dailyQuota, setDailyQuota] = useState<number>(50);
  const [channelDeliveryEnabled, setChannelDeliveryEnabled] = useState<boolean>(dish.available !== false);
  const [channelDineInEnabled, setChannelDineInEnabled] = useState<boolean>(dish.available !== false);
  const [channelPickupEnabled, setChannelPickupEnabled] = useState<boolean>(dish.available !== false);
  const [autoSubstituteEnabled, setAutoSubstituteEnabled] = useState<boolean>(true);
  const [stationFuseEnabled, setStationFuseEnabled] = useState<boolean>(true);
  const [packagingFee, setPackagingFee] = useState<string>('1.50');
  // 方向二: 毛利红线比例可配置（%，用于价格防呆面板）
  const [marginFloorPercent, setMarginFloorPercent] = useState<number>(50);

  // Ingredient Traceability & Recipe SOP
  const [editIngredients, setEditIngredients] = useState<DishIngredientItem[]>(() => {
    return getDishIngredients(dish);
  });
  const [editOriginSource, setEditOriginSource] = useState<string>(() => {
    return dish.originSource || getDishTraceabilityMeta(dish.id).originSource || '澳洲黑毛和牛 M9 部位肉';
  });
  const [editInspectionBatchNo, setEditInspectionBatchNo] = useState<string>(() => {
    return dish.inspectionBatchNo || getDishTraceabilityMeta(dish.id).inspectionBatchNo || 'CIQ-9901824';
  });
  const [editColdChainTemp, setEditColdChainTemp] = useState<string>(() => {
    return dish.coldChainTemp || getDishTraceabilityMeta(dish.id).coldChainTemp || '-18.4 ℃ (合格)';
  });
  const [editSupplierName, setEditSupplierName] = useState<string>(() => {
    return dish.supplierName || getDishTraceabilityMeta(dish.id).supplierName || '澳洲直采供应链联盟';
  });
  const [editSopCookingSteps, setEditSopCookingSteps] = useState<any[]>(() => {
    return dish.sopCookingSteps || [];
  });

  // Right Live Simulator States
  const [rightPreviewChannel, setRightPreviewChannel] = useState<'delivery' | 'dine_in'>('delivery');
  const [rightActiveVariantIndex, setRightActiveVariantIndex] = useState<number>(0);
  const [previewStyleMode, setPreviewStyleMode] = useState<'hud_card' | 'spec_modal'>('hud_card');
  const [previewBlueprintMode, setPreviewBlueprintMode] = useState<'photo' | 'blueprint'>('photo');
  const [previewQuantity, setPreviewQuantity] = useState<number>(1);
  const [previewSelectedSpice, setPreviewSelectedSpice] = useState<string>(editSpicinessLevel);
  const [previewSelectedFlavor, setPreviewSelectedFlavor] = useState<string>(editFlavor);
  const [previewToastMessage, setPreviewToastMessage] = useState<string | null>(null);

  // Barcode Auto-Capture Subscription
  useEffect(() => {
    if (!isListeningForBarcodeScan) return;
    const unsub = globalScannerEngine.subscribe((result) => {
      setEditBarcode(result.code);
      setIsListeningForBarcodeScan(false);
      showToast(`[硬件扫码联动] 成功录入条码: ${result.code}`);
    });
    return () => unsub();
  }, [isListeningForBarcodeScan, showToast]);

  // ============ 方向六-1: Dirty State Tracking（真实未保存改动比对）============
  const DIRTY_FIELD_LABELS: Record<string, string> = {
    editPrice: '全国统一定价',
    editOriginalPrice: '划线原价',
    editPrevPrice: '竞品对比价',
    editDeliveryDiscount: '外卖专享立减金',
    editDineInDiscount: '堂食专享立减金',
    editSpicinessLevel: '辣度档位',
    editFlavor: '默认风味',
    editFlavorOptions: '风味选项池',
    editFlavorTags: '风味标签',
    editCookingStyle: '烹饪工艺',
    editCraftStandardNote: '工艺标准备注',
    editBadgeText: '角标文案',
    editPrepTime: '出餐预估用时',
    editBarcode: '69条码',
    editVariants: '规格变体矩阵',
    editIngredients: '食材溯源清单',
    minOrderThreshold: '起送门槛',
    peakThrottleLimit: '15分钟峰值限流',
    autoSoldOutThreshold: '安全库存熔断阈值',
    dailyQuota: '单日配额',
    marginFloorPercent: '毛利红线比例',
    nightCutoffTime: '晚市自动下架时间'
  };
  const dirtySnapshotRef = useRef<Record<string, unknown>>({});
  if (Object.keys(dirtySnapshotRef.current).length === 0) {
    dirtySnapshotRef.current = {
      editPrice,
      editOriginalPrice,
      editPrevPrice,
      editDeliveryDiscount,
      editDineInDiscount,
      editSpicinessLevel,
      editFlavor,
      editFlavorOptions,
      editFlavorTags,
      editCookingStyle,
      editCraftStandardNote,
      editBadgeText,
      editPrepTime,
      editBarcode,
      editVariants,
      editIngredients,
      minOrderThreshold,
      peakThrottleLimit,
      autoSoldOutThreshold,
      dailyQuota,
      nightCutoffTime,
      marginFloorPercent
    };
  }
  const dirtyEntries = (() => {
    const snap = dirtySnapshotRef.current;
    const cur: Record<string, unknown> = {
      editPrice,
      editOriginalPrice,
      editPrevPrice,
      editDeliveryDiscount,
      editDineInDiscount,
      editSpicinessLevel,
      editFlavor,
      editFlavorOptions,
      editFlavorTags,
      editCookingStyle,
      editCraftStandardNote,
      editBadgeText,
      editPrepTime,
      editBarcode,
      editVariants,
      editIngredients,
      minOrderThreshold,
      peakThrottleLimit,
      autoSoldOutThreshold,
      dailyQuota,
      nightCutoffTime,
      marginFloorPercent
    };
    return Object.keys(cur)
      .filter((k) => JSON.stringify(snap[k]) !== JSON.stringify(cur[k]))
      .map((k) => DIRTY_FIELD_LABELS[k] ?? k);
  })();
  const dirtyCount = dirtyEntries.length;
  // 按模块聚合未保存变更数（用于左栏导航的脏标记）
  const DIRTY_LABEL_PANE: Record<string, string> = {
    全国统一定价: 'tab-pane-price-channel',
    划线原价: 'tab-pane-price-channel',
    竞品对比价: 'tab-pane-price-channel',
    外卖专享立减金: 'tab-pane-price-channel',
    堂食专享立减金: 'tab-pane-price-channel',
    毛利红线比例: 'tab-pane-risk-flow',
    辣度档位: 'tab-pane-spice-flavor',
    默认风味: 'tab-pane-spice-flavor',
    风味选项池: 'tab-pane-spice-flavor',
    风味标签: 'tab-pane-spice-flavor',
    规格变体矩阵: 'tab-pane-spec-variants',
    烹饪工艺: 'tab-pane-sop-matrix',
    工艺标准备注: 'tab-pane-sop-matrix',
    出餐预估用时: 'tab-pane-sop-matrix',
    '69条码': 'tab-pane-barcode-hardware',
    食材溯源清单: 'tab-pane-traceability',
    起送门槛: 'tab-pane-risk-flow',
    '15分钟峰值限流': 'tab-pane-risk-flow',
    安全库存熔断阈值: 'tab-pane-risk-flow',
    单日配额: 'tab-pane-risk-flow',
    晚市自动下架时间: 'tab-pane-risk-flow'
  };
  const dirtyCountByPane = dirtyEntries.reduce<Record<string, number>>((acc, label) => {
    const pane = DIRTY_LABEL_PANE[label];
    if (pane) acc[pane] = (acc[pane] ?? 0) + 1;
    return acc;
  }, {});
  const requestDiscardConfirm = (): boolean => {
    if (dirtyCount === 0) return true;
    const preview = dirtyEntries.slice(0, 3).join('、') + (dirtyEntries.length > 3 ? ' 等' : '');
    return window.confirm(
      `检测到 ${dirtyCount} 处未保存改动（${preview}）。\n\n确认放弃并关闭？未保存的配置将丢失。`
    );
  };

  // ============ 方向补充: 平铺模式模块导航（锚点跳转 + 点击高亮聚焦）============
  const PANE_ID_BY_TAB: Record<string, string> = {
    parameters: 'tab-pane-spice-flavor',
    price_discount: 'tab-pane-price-channel',
    operating_rules: 'tab-pane-risk-flow',
    variants: 'tab-pane-spec-variants',
    selector_media: 'tab-pane-blueprint-cad',
    barcode: 'tab-pane-barcode-hardware',
    cooking_sop: 'tab-pane-sop-matrix',
    ingredient_trace: 'tab-pane-traceability'
  };
  const jumpToPane = (tabId: string) => {
    const paneId = PANE_ID_BY_TAB[tabId];
    if (!paneId) return;
    const el = document.getElementById(paneId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveAnchorPane(paneId);
    el.classList.add('outline', 'outline-2', 'outline-[#ff7a1a]', 'outline-offset-4');
    window.setTimeout(() => {
      el.classList.remove('outline', 'outline-2', 'outline-[#ff7a1a]', 'outline-offset-4');
    }, 1800);
  };

  // 方向二: scroll-spy —— 滚动时自动高亮当前可视模块（仅平铺模式）
  useEffect(() => {
    if (!isTiledView) return;
    const els = Object.values(PANE_ID_BY_TAB)
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible && visible.target && visible.target.id) {
          setActiveAnchorPane(visible.target.id);
        }
      },
      { rootMargin: '-12% 0px -72% 0px', threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isTiledView]);

  // Sync state with selected spice/flavor changes
  useEffect(() => {
    setPreviewSelectedSpice(editSpicinessLevel);
  }, [editSpicinessLevel]);

  useEffect(() => {
    setPreviewSelectedFlavor(editFlavor);
  }, [editFlavor]);

  // Pricing computations
  const currentVariant = rightActiveVariantIndex >= 0 ? editVariants[rightActiveVariantIndex] : null;
  const currentPrice = currentVariant ? currentVariant.price : parseFloat(editPrice) || dish.price;
  const currentDiscount =
    rightPreviewChannel === 'delivery'
      ? parseFloat(editDeliveryDiscount) || 0
      : parseFloat(editDineInDiscount) || 0;
  const finalUnitPrice = Math.max(0, currentPrice - currentDiscount);
  const finalTotalPrice = finalUnitPrice * previewQuantity;

  // Dynamic preview context object
  const dynamicPreviewContext: DynamicPreviewContext = useMemo(
    () => ({
      dish,
      channel: rightPreviewChannel,
      previewStyleMode,
      previewBlueprintMode,
      blueprintMode: previewBlueprintMode,
      quantity: previewQuantity,
      selectedSpice: previewSelectedSpice,
      selectedFlavor: previewSelectedFlavor,
      activeVariantIndex: rightActiveVariantIndex,
      currentVariantIndex: rightActiveVariantIndex,
      currentVariant,
      currentPrice,
      currentDiscount,
      finalUnitPrice,
      finalTotalPrice,
      editPrice,
      editOriginalPrice,
      editPrevPrice,
      editDeliveryDiscount,
      editDeliveryDiscountTag,
      editDineInDiscount,
      editDineInDiscountTag,
      editBadgeText,
      editPrepTime,
      editBarcode,
      editSpicinessLevel,
      editSpicinessOptions,
      editFlavor,
      editFlavorOptions,
      editFlavorTags,
      editCookingStyle,
      editCraftStandardNote,
      editIngredients,
      editVariants,
      editOptionGroups,
      editFieldSelectorMediaMap,
      minOrderThreshold,
      packagingFee
    }),
    [
      dish,
      rightPreviewChannel,
      previewStyleMode,
      previewBlueprintMode,
      previewQuantity,
      previewSelectedSpice,
      previewSelectedFlavor,
      rightActiveVariantIndex,
      currentVariant,
      currentPrice,
      currentDiscount,
      finalUnitPrice,
      finalTotalPrice,
      editPrice,
      editOriginalPrice,
      editPrevPrice,
      editDeliveryDiscount,
      editDeliveryDiscountTag,
      editDineInDiscount,
      editDineInDiscountTag,
      editBadgeText,
      editPrepTime,
      editBarcode,
      editSpicinessLevel,
      editSpicinessOptions,
      editFlavor,
      editFlavorOptions,
      editFlavorTags,
      editCookingStyle,
      editCraftStandardNote,
      editIngredients,
      editVariants,
      editOptionGroups,
      editFieldSelectorMediaMap,
      minOrderThreshold,
      packagingFee
    ]
  );

  // Dynamic slot action handlers
  const dynamicSlotActions: SlotActionHandlers = useMemo(
    () => ({
      onSwitchChannel: (channel) => {
        setRightPreviewChannel(channel);
        setPreviewToastMessage(`🛵 已切换至【${channel === 'delivery' ? '外卖专送' : '餐车堂食'}】渠道`);
        setTimeout(() => setPreviewToastMessage(null), 2000);
      },
      onSwitchViewMode: (mode) => {
        setPreviewStyleMode(mode);
      },
      onSelectVariant: (index) => {
        setRightActiveVariantIndex(index);
      },
      onSelectSpice: (spice) => {
        setPreviewSelectedSpice(spice);
        setEditSpicinessLevel(spice);
      },
      onSelectFlavor: (flavor) => {
        setPreviewSelectedFlavor(flavor);
        setEditFlavor(flavor);
      },
      onUpdateQuantity: (delta) => {
        setPreviewQuantity((prev) => {
          const next = prev + delta;
          const min = minOrderThreshold > 0 ? minOrderThreshold : 1;
          return Math.max(min, Math.min(99, next));
        });
      },
      onToggleBlueprintMode: () => {
        setPreviewBlueprintMode((prev) => (prev === 'photo' ? 'blueprint' : 'photo'));
      },
      onLocateLeftField: (tabId, elementId, label) => {
        setActiveTab(tabId as any);
        if (label) {
          setPreviewToastMessage(`🎯 已联动定位至左侧【${label}】配置模块`);
          setTimeout(() => setPreviewToastMessage(null), 2500);
        }
        if (elementId) {
          setTimeout(() => {
            const el = document.getElementById(elementId);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('ring-2', 'ring-[#006d36]', 'bg-[#e6f4ea]/40');
              setTimeout(() => {
                el.classList.remove('ring-2', 'ring-[#006d36]', 'bg-[#e6f4ea]/40');
              }, 2000);
            }
          }, 120);
        }
      },
      onAddToCart: () => {
        const specName = currentVariant ? currentVariant.name : '标准默认份';
        setPreviewToastMessage(
          `✨ 模拟加购成功：【${dish.name} (${specName})】× ${previewQuantity} 份已加入${
            rightPreviewChannel === 'delivery' ? '外卖专送' : '堂食现场'
          }点餐车！`
        );
        setTimeout(() => setPreviewToastMessage(null), 3000);
      }
    }),
    [currentVariant, dish.name, minOrderThreshold, previewQuantity, rightPreviewChannel]
  );

  // Handle Save
  const handleSave = () => {
    const p = parseFloat(editPrice) || dish.price;
    const op = editOriginalPrice ? parseFloat(editOriginalPrice) : undefined;
    const pp = editPrevPrice ? parseFloat(editPrevPrice) : undefined;
    const dd = editDeliveryDiscount ? parseFloat(editDeliveryDiscount) : undefined;
    const did = editDineInDiscount ? parseFloat(editDineInDiscount) : undefined;

    // Franchise Price Guard Check
    const val = globalFranchiseEngine.validateDishPriceUpdate(dish.id, dish.name, p, dish.price);
    if (!val.allowed) {
      showToast(val.reason || '改价失败：超出总部价格管控合规红线！');
      return;
    }

    // Persist ingredients & traceability
    saveDishIngredients(dish.id, editIngredients);
    saveDishTraceabilityMeta(dish.id, {
      originSource: editOriginSource.trim() || undefined,
      inspectionBatchNo: editInspectionBatchNo.trim() || undefined,
      coldChainTemp: editColdChainTemp.trim() || undefined,
      supplierName: editSupplierName.trim() || undefined
    });

    const updated: DishItem = {
      ...dish,
      variants: editVariants && editVariants.length > 0 ? editVariants : undefined,
      fieldSelectorMediaMap: editFieldSelectorMediaMap,
      optionGroups: editOptionGroups && editOptionGroups.length > 0 ? editOptionGroups : undefined,
      price: p,
      originalPrice: op,
      prevPrice: pp,
      deliveryDiscount: dd,
      deliveryDiscountTag: editDeliveryDiscountTag.trim() || (dd ? `外卖立减¥${dd}` : undefined),
      dineInDiscount: did,
      dineInDiscountTag: editDineInDiscountTag.trim() || (did ? `堂食立减¥${did}` : undefined),
      discountTag: editDeliveryDiscountTag.trim() || (dd ? `外卖立减¥${dd}` : dish.discountTag),
      spicinessLevel: editSpicinessLevel,
      spicinessOptions: editSpicinessOptions,
      flavor: editFlavor,
      flavorOptions: editFlavorOptions,
      flavorTags: editFlavorTags,
      flavorOptionImages: editFlavorOptionImages,
      cookingStyle: editCookingStyle,
      craftStandardNote: editCraftStandardNote,
      badgeText: editBadgeText.trim() || undefined,
      prepTime: editPrepTime.trim() || '约8m',
      barcode: editBarcode.trim() || undefined,
      available: channelDeliveryEnabled || channelDineInEnabled || channelPickupEnabled,
      ingredients: editIngredients,
      originSource: editOriginSource.trim() || undefined,
      inspectionBatchNo: editInspectionBatchNo.trim() || undefined,
      coldChainTemp: editColdChainTemp.trim() || undefined,
      supplierName: editSupplierName.trim() || undefined,
      sopCookingSteps: editSopCookingSteps && editSopCookingSteps.length > 0 ? editSopCookingSteps : undefined
    };

    onSave(updated);
  };

  // Full network sync trigger with animation
  const handleFullSync = () => {
    setIsBroadcastingSync(true);
    setTimeout(() => {
      setIsBroadcastingSync(false);
      setBroadcastDone(true);
      showToast('⚡ 全网同步完成：已向全城 49 辆流动餐车节点广播最新工艺参数！');
      handleSave();
      setTimeout(() => setBroadcastDone(false), 2500);
    }, 1200);
  };

  // Copy Barcode Helper
  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(editBarcode).then(() => {
      showToast(`已复制条码: ${editBarcode}`);
    });
  };

  // Auto-Fill CAD Blueprints
  const handleAutoFillBlueprints = () => {
    const newMediaMap = { ...editFieldSelectorMediaMap };
    let count = 0;

    const updatedVariants = editVariants.map((v) => {
      if (!v.blueprintImageUrl) {
        const generated = generateArtisanSvgBlueprint({
          titleZh: v.name,
          titleEn: v.enName || 'PRECISION DRAFT',
          category: dish.category,
          sketchType: 'burger',
          coreTemp: '56°C',
          specRatio: '7:3',
          artisanCode: `ARTISAN #${dish.id.slice(-4) || '7721'}`
        });
        count++;
        return {
          ...v,
          blueprintImageUrl: generated,
          coreTemp: '56°C',
          specRatio: '7:3'
        };
      }
      return v;
    });
    setEditVariants(updatedVariants);

    editFlavorOptions.forEach((flavor) => {
      const key = `flavor_${flavor}`;
      if (!newMediaMap[key]?.blueprintImageUrl) {
        const generated = generateArtisanSvgBlueprint({
          titleZh: flavor,
          titleEn: 'SIGNATURE SAUCE',
          category: dish.category,
          sketchType: 'sauce',
          coreTemp: '60°C'
        });
        newMediaMap[key] = {
          id: key,
          key,
          category: 'flavor',
          fieldCategory: 'flavor',
          targetFieldId: flavor,
          fieldName: flavor,
          labelZh: flavor,
          labelEn: 'SIGNATURE FLAVOR',
          imageUrl: dish.imageUrl,
          blueprintImageUrl: generated,
          sketchType: 'sauce',
          sketchNoteZh: `${flavor} 秘制工艺标定。`
        };
        count++;
      }
    });

    setEditFieldSelectorMediaMap(newMediaMap);
    showToast(`CAD 蓝图自动化引擎已对齐：为 ${count} 项字段选择器补齐了工匠矢量线稿！`);
    setPreviewBlueprintMode('blueprint');
  };

  // Modules tab metadata configuration matching user mockup
  const MODULE_TABS = [
    {
      id: 'parameters',
      label: '辣度口感与风味',
      icon: Flame,
      badge: editSpicinessLevel.split(' ')[0]
    },
    {
      id: 'price_discount',
      label: '价格渠道立减',
      icon: SlidersHorizontal
    },
    {
      id: 'operating_rules',
      label: '限流与全渠道风控',
      icon: Shield,
      alertDot: true
    },
    {
      id: 'variants',
      label: '规格变体矩阵',
      icon: Layers,
      count: editVariants.length
    },
    {
      id: 'selector_media',
      label: '线稿图纸 CAD',
      icon: Camera,
      newBadge: 'NEW'
    },
    {
      id: 'barcode',
      label: '69条码及硬件',
      icon: Barcode
    },
    {
      id: 'cooking_sop',
      label: '工艺 SOP',
      icon: ChefHat
    },
    {
      id: 'ingredient_trace',
      label: '食材溯源 SOP',
      icon: FileSpreadsheet
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[1600px] h-[95vh] max-h-[1050px] bg-[#fcf9f0] border border-[#d3d1cb] shadow-2xl flex flex-col overflow-hidden text-[#1a1c1b] font-['Manrope',sans-serif] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. TOP CONTEXT HEADER BAR */}
        <header className="h-14 sm:h-16 bg-[#ffffff]/95 backdrop-blur-md border-b border-[#e2e3e1] z-40 flex items-center justify-between px-4 sm:px-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)] shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-sm sm:text-base text-[#1a1c1b] font-bold tracking-tight truncate">
                URBAN RADAR · 工艺中台
              </span>
              <span className="font-label-sm text-[10px] sm:text-[11px] text-[#787770] truncate">
                餐品运营 / 菜品参数与运营规则配置
              </span>
            </div>
            <div className="h-6 w-px bg-[#e2e3e1] hidden sm:block shrink-0" />
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <div className="h-5 px-2 bg-[#e6f4ea] border border-[#a8dab5] rounded flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006d36] animate-pulse" />
                <span className="font-label-micro text-[9px] text-[#006d36] font-mono">RTK 5G · 18ms</span>
              </div>
              <div className="h-5 px-2 bg-[#fff8e1] border border-[#fde68a] rounded flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#d9730d]" />
                <span className="font-label-micro text-[9px] text-[#d9730d] font-mono">HQ FRANCHISE LOCKED</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center bg-[#f6f3eb] border border-[#d3d1cb] rounded px-2.5 py-1 text-[#787770]">
              <Search className="w-3.5 h-3.5 mr-1" />
              <span className="font-label-sm text-[10.5px]">SKU / 编号 / 指令</span>
              <span className="ml-3 font-label-micro text-[9px] border border-[#e2e3e1] px-1 rounded bg-[#ffffff]">
                ⌘K
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                showToast('正在调取云端策略中心最新参数...');
              }}
              className="h-8 px-3 bg-[#f6f3eb] border border-[#d3d1cb] text-[#1a1c1b] rounded font-label-md text-xs hover:bg-[#ebe8df] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">执行同步</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="h-8 px-3.5 bg-[#000000] text-white rounded font-label-md text-xs hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>提交发布</span>
            </button>

            <div className="h-6 w-px bg-[#e2e3e1] hidden sm:block" />

            <div className="hidden lg:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#000000] text-white flex items-center justify-center font-bold text-xs">
                U
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-[10px] text-[#1a1c1b] leading-none font-bold">ENG-09</span>
                <span className="font-label-micro text-[8px] text-[#787770]">工艺总架构</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (requestDiscardConfirm()) onClose();
              }}
              className="w-8 h-8 rounded flex items-center justify-center text-[#787770] hover:text-[#1a1c1b] hover:bg-[#ebe8df] transition-colors cursor-pointer ml-1"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 2. TOP CONTEXT BANNER & BREADCRUMB LOCK BAR */}
        <div className="bg-[#fff8e1] px-4 py-1.5 border-b border-[#fde68a] flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="w-3.5 h-3.5 text-[#d9730d] shrink-0" />
            <span className="font-label-sm text-[11px] text-[#d9730d] font-bold shrink-0">
              HQ FRANCHISE LOCKED // 总部核心爆品强管控
            </span>
            <span className="font-label-micro text-[9.5px] text-[#474741] bg-[#ffffff] px-2 py-0.5 rounded border border-[#fde68a]/60 truncate">
              全国统一定价 ¥{parseFloat(editPrice || '0').toFixed(2)} · 加盟商受控模式 · 仅开放运营风控阈值微调
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[#787770] font-mono text-[10px] shrink-0 ml-auto">
            <span>
              PARAM-SYNC HASH: <strong className="text-[#1a1c1b]">SHA-256:7e9a0c4</strong>
            </span>
            <span className="text-[#006d36] flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006d36] animate-ping" />
              RTK-5G CAR-NODE-SZ49 ONLINE
            </span>
          </div>
        </div>

        {/* 3. PRODUCT HEADER WORKSTATION HUD CARD */}
        <section className="bg-[#ffffff] p-4 sm:p-5 border-b border-[#e2e3e1] shadow-xs shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              {/* Thumbnail with magnifier trigger */}
              <div
                onClick={() => onPreviewZoom && onPreviewZoom(dish)}
                className="relative group w-18 h-18 sm:w-20 sm:h-20 bg-[#f4f4f2] flex-shrink-0 overflow-hidden shadow-inner border border-[#d3d1cb] cursor-pointer"
                title="点击查看高清实拍原图"
              >
                <img
                  src={dish.imageUrl}
                  alt={dish.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <ZoomIn className="w-4 h-4" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-[#13140f]/80 px-1 py-0.5 text-center">
                  <span className="font-label-micro text-[8px] text-[#9bf6b1] font-mono">
                    SKU-{dish.id.slice(-4) || '7721'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-headline-md text-base sm:text-lg text-[#1a1c1b] uppercase tracking-tight font-bold truncate">
                    {dish.name}
                  </h1>
                  <span className="font-label-sm text-[11px] text-[#787770] font-mono">
                    {dish.enName || 'CHARCOAL WAGYU BURGER'}
                  </span>
                  <div className="h-5 px-2 bg-[#e6f4ea] border border-[#a8dab5] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006d36]" />
                    <span className="font-label-micro text-[9px] text-[#006d36] font-bold">
                      {dish.available !== false ? '全渠道在售中' : '全网沽清中'}
                    </span>
                  </div>
                  <div className="h-5 px-2 bg-[#e5e2da] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#474741]" />
                    <span className="font-label-micro text-[9px] text-[#474741] font-bold">
                      出餐约 {editPrepTime}
                    </span>
                  </div>
                </div>

                <div className="mt-1 flex items-center gap-4 flex-wrap text-xs text-[#474741]">
                  <div className="flex items-baseline gap-1">
                    <span className="font-label-micro text-[9px] text-[#787770]">基准全国售价:</span>
                    <span className="font-headline-sm text-sm font-bold text-[#000000]">
                      ¥{parseFloat(editPrice || '0').toFixed(2)}
                    </span>
                    <span className="font-label-micro text-[9px] text-[#787770] line-through">
                      ¥{parseFloat(editOriginalPrice || '45').toFixed(2)}
                    </span>
                  </div>
                  <div className="h-3 w-px bg-[#e2e3e1]" />
                  <div className="flex items-center gap-1">
                    <span className="font-label-micro text-[9px] text-[#787770]">条码:</span>
                    <span className="font-label-sm text-[10.5px] font-bold font-mono text-[#1a1c1b]">
                      {editBarcode || '6972049182301'}
                    </span>
                  </div>
                  <div className="h-3 w-px bg-[#e2e3e1] hidden sm:block" />
                  <div className="hidden sm:flex items-center gap-1">
                    <span className="font-label-micro text-[9px] text-[#787770]">温控槽位:</span>
                    <span className="font-label-sm text-[10.5px] font-mono text-[#1a1c1b] font-semibold">
                      GRILL-STATION #02 (230℃)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Telemetry Mini-Badges */}
            <div className="flex items-center gap-3 self-end lg:self-center shrink-0">
              <div className="bg-[#f9f9f7] border border-[#e2e3e1] p-2 flex flex-col items-end shadow-inner min-w-[100px]">
                <span className="font-label-micro text-[8.5px] text-[#787770]">当日实时出餐配额</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline-sm text-sm text-[#006d36] font-bold">
                    {dailyQuotaEnabled ? Math.max(0, dailyQuota - 12) : 38}
                  </span>
                  <span className="font-label-micro text-[9px] text-[#787770]">
                    / {dailyQuotaEnabled ? dailyQuota : 50} 份
                  </span>
                </div>
              </div>
              <div className="bg-[#f9f9f7] border border-[#e2e3e1] p-2 flex flex-col items-end shadow-inner min-w-[100px]">
                <span className="font-label-micro text-[8.5px] text-[#787770]">风控熔断保护</span>
                <span className="font-label-sm text-[10.5px] text-[#006d36] font-bold flex items-center gap-1 font-mono">
                  <Shield className="w-3.5 h-3.5" /> ARM 待命
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. MASTER WORKBENCH: DUAL PANE ARCHITECTURE */}
        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 overflow-hidden bg-[#f9f9f7]">
          {/* LEFT CONFIGURATION WORKSPACE (8 COLUMNS) */}
          <div className="xl:col-span-8 flex min-h-0 border-r border-[#e2e3e1] overflow-hidden bg-[#f9f9f7]">
            {/* 方向一重构: 平铺模式的左侧垂直模块导航栏（scroll-spy 跟随 + 点击聚焦） */}
            {isTiledView && (
              <nav
                className="w-[104px] shrink-0 bg-[#ffffff] border-r border-[#e2e3e1] p-1.5 space-y-1 overflow-y-auto hide-scrollbar"
                aria-label="配置模块导航"
              >
                {MODULE_TABS.map((tab, ti) => {
                  const paneId = PANE_ID_BY_TAB[tab.id as string];
                  const isActive = activeAnchorPane === paneId;
                  const RailIcon = tab.icon;
                  const paneDirty = dirtyCountByPane[paneId] ?? 0;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => jumpToPane(tab.id as string)}
                      className={`w-full p-1.5 rounded-[3px] flex flex-col items-center gap-1 text-center transition-colors cursor-pointer relative ${
                        isActive ? 'bg-[#000000] text-white' : 'text-[#474741] hover:bg-[#f4f4f2]'
                      }`}
                      title={tab.label}
                    >
                      <RailIcon className="w-3.5 h-3.5" />
                      <span className="text-[9.5px] leading-tight font-bold break-all">{tab.label}</span>
                      <span className="font-label-micro text-[8px] font-mono opacity-60">0{ti + 1}</span>
                      {paneDirty > 0 && (
                        <span
                          className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[#ff7a1a]"
                          title={`${paneDirty} 处未保存变更`}
                        />
                      )}
                    </button>
                  );
                })}
                <div className="pt-2 mt-1 border-t border-[#e2e3e1] flex flex-col gap-1">
                  <button
                    type="button"
                    aria-pressed={!isTiledView}
                    onClick={() => setIsTiledView(false)}
                    className={`w-full py-1.5 rounded-[3px] flex flex-col items-center gap-0.5 text-[9.5px] font-bold transition-colors cursor-pointer ${
                      !isTiledView ? 'bg-[#000000] text-white' : 'text-[#787770] hover:bg-[#f4f4f2]'
                    }`}
                  >
                    <PanelRight className="w-3.5 h-3.5" />
                    <span>分页视窗</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={isTiledView}
                    onClick={() => setIsTiledView(true)}
                    className={`w-full py-1.5 rounded-[3px] flex flex-col items-center gap-0.5 text-[9.5px] font-bold transition-colors cursor-pointer ${
                      isTiledView ? 'bg-[#000000] text-white' : 'text-[#787770] hover:bg-[#f4f4f2]'
                    }`}
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>全部平铺</span>
                  </button>
                </div>
              </nav>
            )}
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {/* TAB NAVIGATION SCROLL BAR */}
            {!isTiledView && (
            <div className="bg-[#ffffff] p-2 border-b border-[#e2e3e1] shadow-xs flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 hide-scrollbar flex-1 min-w-0">
                {MODULE_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        if (tab.id === 'variants' || tab.id === 'selector_media') {
                          setPreviewStyleMode('spec_modal');
                        }
                      }}
                      className={`px-3 py-1.5 font-label-md text-xs transition-colors flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                        isActive && !isTiledView
                          ? 'bg-[#000000] text-white shadow-sm'
                          : 'bg-[#f4f4f2] text-[#1a1c1b] hover:bg-[#e5e2da]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      {tab.alertDot && <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]" />}
                      {tab.newBadge && (
                        <span className="font-label-micro text-[8px] text-[#00d4ff] bg-[#041224] px-1 font-mono">
                          {tab.newBadge}
                        </span>
                      )}
                      {tab.badge && (
                        <span className="font-label-micro text-[8px] px-1 bg-[#ffffff]/30 font-mono">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center pl-2 border-l border-[#e2e3e1] shrink-0 ml-1">
                {/* 方向补充: 平铺状态按钮修复 —— 由图标方钮升级为带文案的双态分段控件 */}
                <div
                  className="flex items-center bg-[#f4f4f2] border border-[#d3d1cb] p-0.5"
                  role="group"
                  aria-label="表单视窗模式切换"
                >
                  <button
                    type="button"
                    aria-pressed={!isTiledView}
                    onClick={() => setIsTiledView(false)}
                    className={`h-7 px-2.5 flex items-center gap-1 font-label-md text-[11px] font-bold transition-colors cursor-pointer ${
                      !isTiledView
                        ? 'bg-[#000000] text-white shadow-sm'
                        : 'text-[#787770] hover:text-[#1a1c1b] hover:bg-[#e5e2da]'
                    }`}
                    title="按模块分页查看，右侧预览跟随当前模块"
                  >
                    <PanelRight className="w-3.5 h-3.5" />
                    <span>分页视窗</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={isTiledView}
                    onClick={() => setIsTiledView(true)}
                    className={`h-7 px-2.5 flex items-center gap-1 font-label-md text-[11px] font-bold transition-colors cursor-pointer ${
                      isTiledView
                        ? 'bg-[#000000] text-white shadow-sm'
                        : 'text-[#787770] hover:text-[#1a1c1b] hover:bg-[#e5e2da]'
                    }`}
                    title="8 个配置模块全部平铺展开，一次总览"
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>全部平铺</span>
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* FORM CONTENT CONTAINER */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs hide-scrollbar">
              {/* SECTION 1: SPICE & FLAVOR */}
              {(isTiledView || activeTab === 'parameters') && (
                <div id="tab-pane-spice-flavor" className="bg-[#ffffff] p-5 border border-[#e2e3e1] shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e3e1] bg-[#f9f9f7] p-2.5">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-[#ba1a1a]" />
                      <span className="font-headline-sm text-sm uppercase text-[#1a1c1b] font-bold">
                        01. 默认推荐辣度与风味口感池
                      </span>
                      <span className="font-label-micro text-[9px] text-[#787770] font-mono">
                        SPICINESS & FLAVOR ATTRIBUTES
                      </span>
                    </div>
                    <span className="font-label-micro text-[9px] text-[#006d36] bg-[#e6f4ea] px-2 py-0.5 font-bold font-mono">
                      FRONTEND-SYNCED
                    </span>
                  </div>

                  {/* Spice Preset Radio Matrix */}
                  <div>
                    <label className="font-label-sm text-xs text-[#474741] block mb-2 font-bold">
                      默认推荐辣度 (DEFAULT PRESET LEVEL):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center" id="spice-preset-group">
                      {[
                        { label: '不辣', shu: '0 SHU', value: '不辣 (ZERO)', icon: Check },
                        { label: '微辣 (推荐)', shu: '800 SHU', value: '微辣 (推荐)', icon: Flame },
                        { label: '中辣', shu: '2500 SHU', value: '中辣 (MEDIUM)', icon: Flame },
                        { label: '特辣', shu: '8000 SHU', value: '特辣 (HOT)', icon: Flame },
                        { label: '变态魔鬼辣', shu: '30000 SHU', value: '变态魔鬼辣 (DEVIL)', icon: Flame }
                      ].map((item) => {
                        const isCur = editSpicinessLevel.includes(item.label) || editSpicinessLevel === item.value;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => setEditSpicinessLevel(item.value)}
                            className={`p-3 font-label-sm text-xs flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                              isCur
                                ? 'bg-[#000000] text-white border-[#000000] shadow-sm'
                                : 'bg-[#f4f4f2] hover:bg-[#e5e2da] text-[#1a1c1b] border-[#e2e3e1]'
                            }`}
                          >
                            <item.icon className={`w-4 h-4 ${isCur ? 'text-[#ffb782]' : 'text-[#787770]'}`} />
                            <span className="font-bold">{item.label}</span>
                            <span className="font-label-micro text-[8.5px] font-mono text-[#787770]">
                              {item.shu}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customer Configurable Spicy Options Tag Pool */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-label-sm text-xs text-[#474741] font-bold">
                        顾客前台可选辣度池 (CUSTOMER SELECTABLE OPTIONS):
                      </label>
                      <span className="font-label-micro text-[9px] text-[#787770]">
                        已选 {editSpicinessOptions.length} 项
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 p-3 bg-[#f9f9f7] border border-[#e2e3e1]">
                      {editSpicinessOptions.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#ffffff] text-[#1a1c1b] font-label-sm text-xs border border-[#d3d1cb] shadow-xs"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => setEditSpicinessOptions(editSpicinessOptions.filter((t) => t !== tag))}
                            className="text-[#787770] hover:text-[#ba1a1a] cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={newSpiceInput}
                          onChange={(e) => setNewSpiceInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newSpiceInput.trim()) {
                              if (!editSpicinessOptions.includes(newSpiceInput.trim())) {
                                setEditSpicinessOptions([...editSpicinessOptions, newSpiceInput.trim()]);
                              }
                              setNewSpiceInput('');
                            }
                          }}
                          placeholder="+ 添加新辣度标签"
                          className="px-2.5 py-1 bg-[#ffffff] font-label-sm text-xs text-[#1a1c1b] outline-none border border-[#d3d1cb] focus:border-[#000000] w-36 shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newSpiceInput.trim() && !editSpicinessOptions.includes(newSpiceInput.trim())) {
                              setEditSpicinessOptions([...editSpicinessOptions, newSpiceInput.trim()]);
                              setNewSpiceInput('');
                            }
                          }}
                          className="px-2.5 py-1 bg-[#000000] text-white font-label-micro text-[10px] cursor-pointer hover:bg-neutral-800 font-bold"
                        >
                          添加
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Master Flavors Segment —— 主理人口味风格标签（可增删改 + 可选中） */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-label-sm text-xs text-[#474741] font-bold">
                        主理人口味风格标签 (MASTER TASTE PROFILES):
                      </label>
                      <span className="font-label-micro text-[9px] text-[#787770] font-mono">
                        可重命名 · 可删除 · 可新增
                      </span>
                    </div>

                    <div className="space-y-2">
                      {editFlavorOptions.map((flavor, oi) => {
                        const isSelected = editFlavor === flavor;
                        const isRenaming = renamingOptionIndex === oi;
                        return (
                          <div
                            key={`${flavor}-${oi}`}
                            className={`flex items-center gap-1.5 border p-1.5 transition-colors ${
                              isSelected
                                ? 'bg-[#000000] border-[#000000]'
                                : 'bg-[#f4f4f2] border-[#e2e3e1] hover:bg-[#e5e2da]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setFlavorImagePickerTarget(flavor)}
                              className="w-7 h-7 shrink-0 border border-[#d3d1cb] bg-[#f4f4f2] overflow-hidden cursor-pointer hover:border-[#000000] transition-colors flex items-center justify-center"
                              title="设置该口味的专属变体图片（从素材库选用，一次入库全店复用）"
                            >
                              {editFlavorOptionImages[flavor] ? (
                                <img
                                  src={editFlavorOptionImages[flavor]}
                                  alt={flavor}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-3 h-3 text-[#a8a6a0]" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditFlavor(flavor)}
                              className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center cursor-pointer ${
                                isSelected ? 'border-white' : 'border-[#b8b6ae]'
                              }`}
                              title={isSelected ? '当前默认口味' : '设为默认口味'}
                            >
                              {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                            </button>

                            {isRenaming ? (
                              <input
                                autoFocus
                                type="text"
                                value={renamingDraft}
                                onChange={(e) => setRenamingDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const v = renamingDraft.trim();
                                    if (!v) return;
                                    if (editFlavorOptions.includes(v) && v !== flavor) {
                                      showToast('已存在同名口味风格');
                                      return;
                                    }
                                    const next = [...editFlavorOptions];
                                    next[oi] = v;
                                    setEditFlavorOptions(next);
                                    if (isSelected) setEditFlavor(v);
                                    setRenamingOptionIndex(null);
                                    showToast('口味风格已重命名');
                                  }
                                  if (e.key === 'Escape') setRenamingOptionIndex(null);
                                }}
                                className="flex-1 px-1.5 py-0.5 text-xs font-bold bg-white text-[#1a1c1b] border border-[#000000] outline-none"
                              />
                            ) : (
                              <span
                                className={`flex-1 font-bold text-xs truncate cursor-pointer ${
                                  isSelected ? 'text-white' : 'text-[#1a1c1b]'
                                }`}
                                onDoubleClick={() => {
                                  setRenamingDraft(flavor);
                                  setRenamingOptionIndex(oi);
                                }}
                                title="双击重命名"
                              >
                                {flavor}
                              </span>
                            )}

                            {!isRenaming && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRenamingDraft(flavor);
                                    setRenamingOptionIndex(oi);
                                  }}
                                  className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer shrink-0 ${
                                    isSelected
                                      ? 'text-white/80 hover:text-white hover:bg-white/10'
                                      : 'text-[#787770] hover:text-[#1a1c1b] hover:bg-[#dcd9d1]'
                                  }`}
                                  title="重命名该口味风格"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={editFlavorOptions.length <= 1}
                                  onClick={() => {
                                    const next = editFlavorOptions.filter((_, idx) => idx !== oi);
                                    setEditFlavorOptions(next);
                                    if (isSelected) setEditFlavor(next[0] ?? '');
                                    showToast(`已删除口味风格「${flavor}」`);
                                  }}
                                  className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${
                                    isSelected
                                      ? 'text-white/80 hover:text-white hover:bg-white/10'
                                      : 'text-[#ba1a1a] hover:bg-[#fdecea]'
                                  }`}
                                  title={
                                    editFlavorOptions.length <= 1
                                      ? '至少保留 1 个口味风格'
                                      : '删除该口味风格'
                                  }
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1.5 mt-2">
                      <input
                        type="text"
                        value={newFlavorOptionDraft}
                        onChange={(e) => setNewFlavorOptionDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return;
                          const v = newFlavorOptionDraft.trim();
                          if (!v) return;
                          if (editFlavorOptions.includes(v)) {
                            showToast('已存在同名口味风格');
                            return;
                          }
                          setEditFlavorOptions([...editFlavorOptions, v]);
                          setNewFlavorOptionDraft('');
                          showToast(`已新增口味风格「${v}」`);
                        }}
                        placeholder="新增主理人口味风格（回车确认，如：山葵柚子醋）"
                        className="flex-1 px-2 py-1.5 text-xs bg-[#ffffff] border border-[#d3d1cb] outline-none focus:border-[#000000] placeholder:text-[#a8a6a0]"
                      />
                      <button
                        type="button"
                        disabled={!newFlavorOptionDraft.trim()}
                        onClick={() => {
                          const v = newFlavorOptionDraft.trim();
                          if (!v || editFlavorOptions.includes(v)) return;
                          setEditFlavorOptions([...editFlavorOptions, v]);
                          setNewFlavorOptionDraft('');
                          showToast(`已新增口味风格「${v}」`);
                        }}
                        className="h-8 px-3 bg-[#000000] text-white font-label-md text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>新增</span>
                      </button>
                    </div>

                    {/* Integrated Flavor Tag Selector */}
                    <div className="pt-3">
                      <FlavorTagSelector
                        variant="industrial"
                        selectedTags={editFlavorTags}
                        onChange={setEditFlavorTags}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: PRICE & CHANNEL DISCOUNTS */}
              {(isTiledView || activeTab === 'price_discount') && (
                <div id="tab-pane-price-channel" className="bg-[#ffffff] p-5 border border-[#e2e3e1] shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e3e1] bg-[#f9f9f7] p-2.5">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-[#000000]" />
                      <span className="font-headline-sm text-sm uppercase text-[#1a1c1b] font-bold">
                        02. 价格参数与全渠道立减配置
                      </span>
                      <span className="font-label-micro text-[9px] text-[#787770] font-mono">
                        PRICING TIERS & CHANNEL PROMOTIONS
                      </span>
                    </div>
                    <span className="font-label-micro text-[9px] text-[#d9730d] bg-[#fff8e1] border border-[#fde68a] px-2 py-0.5 font-bold font-mono">
                      HQ LOCKED TIERS
                    </span>
                  </div>

                  {/* Base Price Triple Group */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-[#f9f9f7] p-3.5 border border-[#e2e3e1] shadow-inner space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-xs text-[#787770]">全国统一定价</span>
                        <span className="font-label-micro text-[8px] bg-[#000000] text-white px-1 font-mono">
                          CORE
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold">¥</span>
                        <input
                          type="number"
                          step="0.1"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="font-headline-lg text-xl font-bold text-[#1a1c1b] bg-transparent outline-none w-28"
                        />
                        <span className="font-label-micro text-[9px] text-[#787770]">CNY / 份</span>
                      </div>
                      <p className="font-body-sm text-[10.5px] text-[#787770]">
                        云端策略中心锁定，加盟节点不可上调
                      </p>
                    </div>

                    <div className="bg-[#f9f9f7] p-3.5 border border-[#e2e3e1] shadow-inner space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-xs text-[#787770]">划线原价 (STRIKETHROUGH)</span>
                        <span className="font-label-micro text-[8px] text-[#787770] font-mono">DISPLAY</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-[#787770]">¥</span>
                        <input
                          type="number"
                          step="0.1"
                          value={editOriginalPrice}
                          onChange={(e) => setEditOriginalPrice(e.target.value)}
                          className="font-headline-lg text-xl font-bold text-[#787770] line-through bg-transparent outline-none w-28"
                        />
                        <span className="font-label-micro text-[9px] text-[#787770]">CNY</span>
                      </div>
                      <p className="font-body-sm text-[10.5px] text-[#787770]">
                        展示于前台菜单及外卖应用立减前视窗
                      </p>
                    </div>

                    <div className="bg-[#f9f9f7] p-3.5 border border-[#e2e3e1] shadow-inner space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-xs text-[#787770]">竞品对比价 (ANCHOR)</span>
                        <span className="font-label-micro text-[8px] text-[#787770] font-mono">MARKET</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-[#474741]">¥</span>
                        <input
                          type="number"
                          step="0.1"
                          value={editPrevPrice}
                          onChange={(e) => setEditPrevPrice(e.target.value)}
                          className="font-headline-lg text-xl font-bold text-[#474741] bg-transparent outline-none w-28"
                        />
                        <span className="font-label-micro text-[9px] text-[#787770]">周边同级</span>
                      </div>
                      <p className="font-body-sm text-[10.5px] text-[#787770]">
                        商圈同级和牛类手工汉堡锚定均价
                      </p>
                    </div>
                  </div>

                  {/* 方向二: 价格核算 / 渠道立减防呆 / 合规提示 (PRICING GUARD) */}
                  {(() => {
                    const base = parseFloat(editPrice || '0') || 0;
                    const orig = parseFloat(editOriginalPrice || '0') || 0;
                    const del = parseFloat(editDeliveryDiscount || '0') || 0;
                    const dine = parseFloat(editDineInDiscount || '0') || 0;
                    const netDel = Math.max(0, base - del);
                    const netDine = Math.max(0, base - dine);
                    const rate = base > 0 ? netDel / base : 1;
                    const rateText = `${(rate * 10).toFixed(1).replace(/\.0$/, '')} 折`;
                    const marginFloor = base * (marginFloorPercent / 100);
                    const isZero = netDel <= 0 || netDine <= 0;
                    const isRisk = !isZero && (netDel < marginFloor || netDine < marginFloor);
                    const tone = isZero
                      ? { bg: 'bg-[#fdecea]', bd: 'border-[#f09595]', tx: 'text-[#a32d2d]', chip: 'bg-[#f09595] text-white' }
                      : isRisk
                        ? { bg: 'bg-[#fff8e1]', bd: 'border-[#fde68a]', tx: 'text-[#854f0b]', chip: 'bg-[#ef9f27] text-white' }
                        : { bg: 'bg-[#f4f7f6]', bd: 'border-[#d3d1cb]', tx: 'text-[#1a1c1b]', chip: 'bg-[#006d36] text-white' };
                    const origMissing = !(editOriginalPrice || '').trim() || orig <= 0;
                    const origInvalid = orig > 0 && orig <= base;
                    const applyDiscountRate = (r: number) => {
                      const disc = Math.max(0, Math.round(base * (1 - r) * 100) / 100);
                      setEditDeliveryDiscount(String(disc));
                      setEditDineInDiscount(String(disc));
                      showToast(`已按 ${(r * 10).toFixed(1)} 折换算两渠道立减 ¥${disc.toFixed(2)}`);
                    };
                    const applyRoundDown = () => {
                      const target = Math.floor(netDel);
                      const disc = Math.max(0, Math.round((base - target) * 100) / 100);
                      setEditDeliveryDiscount(String(disc));
                      showToast(`已抹零：外卖到手价取整为 ¥${target}`);
                    };
                    return (
                      <div className={`p-4 border space-y-3 shadow-xs transition-colors ${tone.bg} ${tone.bd}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Tag className={`w-4 h-4 ${tone.tx}`} />
                            <span className="font-headline-sm text-xs font-bold">
                              到手价核算与商业合规防呆 (PRICING GUARD)
                            </span>
                          </div>
                          <span className={`font-label-micro text-[9px] px-1.5 py-0.5 font-bold font-mono ${tone.chip}`}>
                            {isZero ? '🚫 到手价≤0 禁止上单' : isRisk ? '⚠️ 低于毛利红线' : '✓ 核算通过'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          <div className="bg-[#ffffff]/70 border border-[#e2e3e1] p-2.5 space-y-0.5">
                            <span className="font-label-micro text-[9px] text-[#787770] block">外卖到手价</span>
                            <span className={`font-headline-lg text-lg font-bold font-mono ${netDel <= 0 ? 'text-[#a32d2d]' : 'text-[#000000]'}`}>
                              ¥{netDel.toFixed(2)}
                            </span>
                          </div>
                          <div className="bg-[#ffffff]/70 border border-[#e2e3e1] p-2.5 space-y-0.5">
                            <span className="font-label-micro text-[9px] text-[#787770] block">堂食到手价</span>
                            <span className={`font-headline-lg text-lg font-bold font-mono ${netDine <= 0 ? 'text-[#a32d2d]' : 'text-[#000000]'}`}>
                              ¥{netDine.toFixed(2)}
                            </span>
                          </div>
                          <div className="bg-[#ffffff]/70 border border-[#e2e3e1] p-2.5 space-y-0.5">
                            <span className="font-label-micro text-[9px] text-[#787770] block">综合折扣率</span>
                            <span className="font-headline-lg text-lg font-bold font-mono text-[#000000]">
                              {rateText}
                            </span>
                          </div>
                          <div className="bg-[#ffffff]/70 border border-[#e2e3e1] p-2.5 space-y-0.5">
                            <span className="font-label-micro text-[9px] text-[#787770] block">毛利红线 ({marginFloorPercent}%)</span>
                            <span className="font-headline-lg text-lg font-bold font-mono text-[#787770]">
                              ¥{marginFloor.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {(isZero || isRisk) && (
                          <div className={`text-[11px] leading-relaxed p-2 border ${isZero ? 'bg-[#ffffff] border-[#f09595] text-[#a32d2d]' : 'bg-[#ffffff] border-[#fde68a] text-[#854f0b]'}`}>
                            {isZero
                              ? '⚠️ 立减金额已大于或等于定价，到手价 ≤ 0。请立即下调立减金，否则该菜品无法参与外卖/堂食上单。'
                              : `⚠️ 到手价已低于定价 50% 的毛利红线（¥${marginFloor.toFixed(2)}），存在亏本售出风险。请复核渠道补贴策略。`}
                          </div>
                        )}

                        {(origMissing || origInvalid) && (
                          <div className="text-[11px] leading-relaxed p-2 bg-[#ffffff] border border-[#fde68a] text-[#854f0b]">
                            {origMissing
                              ? '⚠️ 合规提示：未填写「划线原价」。电商平台要求划线价必须有真实成交依据，建议填写历史售价或直接留空，避免虚构原价违规。'
                              : `⚠️ 合规提示：划线原价（¥${orig.toFixed(2)}）不高于全国统一定价（¥${base.toFixed(2)}），构成虚构原价风险，请上调划线价或下调定价。`}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="font-label-micro text-[9px] text-[#787770]">智能定价助手:</span>
                          <button
                            type="button"
                            onClick={() => applyDiscountRate(0.85)}
                            className="h-6 px-2.5 bg-[#ffffff] border border-[#d3d1cb] hover:border-[#000000] text-[#1a1c1b] font-label-micro text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            一键 8.5 折
                          </button>
                          <button
                            type="button"
                            onClick={() => applyDiscountRate(0.9)}
                            className="h-6 px-2.5 bg-[#ffffff] border border-[#d3d1cb] hover:border-[#000000] text-[#1a1c1b] font-label-micro text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            一键 9 折
                          </button>
                          <button
                            type="button"
                            onClick={applyRoundDown}
                            className="h-6 px-2.5 bg-[#ffffff] border border-[#d3d1cb] hover:border-[#000000] text-[#1a1c1b] font-label-micro text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            一键抹零到整数
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditDeliveryDiscount(String(dish.deliveryDiscount ?? 0));
                              setEditDineInDiscount(String(dish.dineInDiscount ?? 0));
                              setEditOriginalPrice(String(dish.originalPrice ?? ''));
                              showToast('价格与立减参数已还原为云端初始值');
                            }}
                            className="h-6 px-2.5 bg-[#f9f9f7] border border-[#d3d1cb] hover:border-[#000000] text-[#787770] font-label-micro text-[10px] font-bold cursor-pointer transition-colors ml-auto"
                          >
                            还原本品价格参数
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Channel Independent Instant Discount */}
                  <div className="space-y-3 pt-2">
                    <span className="font-label-sm text-xs text-[#474741] block font-bold">
                      全渠道独立立减补贴与到手价结算 (CHANNEL SPECIFIC DEDUCTION)
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Delivery Channel */}
                      <div className="p-4 bg-[#f9f9f7] border border-[#e2e3e1] space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bike className="w-4 h-4 text-[#000000]" />
                            <span className="font-headline-sm text-xs font-bold">
                              外卖配送渠道 (DELIVERY)
                            </span>
                          </div>
                          <span className="font-label-micro text-[9px] text-[#006d36] bg-[#e6f4ea] px-1.5 py-0.5 font-bold">
                            通道开启
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-body-md text-xs text-[#474741]">专享立减金:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-label-sm text-xs text-[#ba1a1a] font-bold">- ¥</span>
                            <input
                              type="number"
                              step="0.5"
                              value={editDeliveryDiscount}
                              onChange={(e) => setEditDeliveryDiscount(e.target.value)}
                              className="w-20 px-2 py-1 bg-[#ffffff] border border-[#d3d1cb] font-mono font-bold text-right outline-none focus:border-[#000000]"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[#787770] font-label-micro text-[10px] pt-1 border-t border-[#e2e3e1]">
                          <span>顾客到手参考价:</span>
                          <span className="text-[#000000] font-bold font-mono text-xs">
                            ¥{Math.max(0, parseFloat(editPrice || '0') - (parseFloat(editDeliveryDiscount) || 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Dine-In Channel */}
                      <div className="p-4 bg-[#f9f9f7] border border-[#e2e3e1] space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Utensils className="w-4 h-4 text-[#000000]" />
                            <span className="font-headline-sm text-xs font-bold">
                              餐车现场堂食 (TRUCK DINE-IN)
                            </span>
                          </div>
                          <span className="font-label-micro text-[9px] text-[#006d36] bg-[#e6f4ea] px-1.5 py-0.5 font-bold">
                            通道开启
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-body-md text-xs text-[#474741]">专享立减金:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-label-sm text-xs text-[#ba1a1a] font-bold">- ¥</span>
                            <input
                              type="number"
                              step="0.5"
                              value={editDineInDiscount}
                              onChange={(e) => setEditDineInDiscount(e.target.value)}
                              className="w-20 px-2 py-1 bg-[#ffffff] border border-[#d3d1cb] font-mono font-bold text-right outline-none focus:border-[#000000]"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[#787770] font-label-micro text-[10px] pt-1 border-t border-[#e2e3e1]">
                          <span>顾客到手参考价:</span>
                          <span className="text-[#000000] font-bold font-mono text-xs">
                            ¥{Math.max(0, parseFloat(editPrice || '0') - (parseFloat(editDineInDiscount) || 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: RISK & FLOW CONTROL */}
              {(isTiledView || activeTab === 'operating_rules') && (
                <div id="tab-pane-risk-flow" className="bg-[#ffffff] p-5 border border-[#e2e3e1] shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e3e1] bg-[#f9f9f7] p-2.5">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#ba1a1a]" />
                      <span className="font-headline-sm text-sm uppercase text-[#1a1c1b] font-bold">
                        03. 流动餐车全渠道供售通断与限流风控矩阵
                      </span>
                      <span className="font-label-micro text-[9px] text-[#ba1a1a] font-bold font-mono">
                        CRITICAL DEFENSE ENGINE
                      </span>
                    </div>
                    <span className="font-label-micro text-[9px] text-[#006d36] bg-[#e6f4ea] px-2 py-0.5 font-bold font-mono">
                      AUTO-REGULATING
                    </span>
                  </div>

                  {/* 方向二: 毛利红线比例可配置 */}
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-[#fff8e1] border border-[#fde68a]">
                    <div className="min-w-0">
                      <div className="font-label-sm text-xs font-bold text-[#854f0b]">毛利红线比例 (MARGIN FLOOR)</div>
                      <div className="text-[10px] text-[#854f0b]/80 leading-snug">
                        到手价低于定价 × 该比例时，价格防呆面板转为琥珀/红色警示（同步用于「价格渠道立减」模块）
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min={10}
                        max={95}
                        value={marginFloorPercent}
                        onChange={(e) => {
                          const n = parseInt(e.target.value);
                          setMarginFloorPercent(isNaN(n) ? 50 : Math.min(95, Math.max(10, n)));
                        }}
                        className="w-16 px-2 py-1 text-xs font-mono font-bold text-center bg-[#ffffff] border border-[#d3d1cb] outline-none focus:border-[#000000]"
                      />
                      <span className="font-bold text-xs text-[#854f0b]">%</span>
                    </div>
                  </div>

                  {/* Channel Circuit Breakers */}
                  <div>
                    <label className="font-label-sm text-xs text-[#474741] block mb-2 font-bold">
                      三端渠道独立供售切断器 (CHANNEL CIRCUIT BREAKERS):
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div className="p-3 bg-[#f9f9f7] border border-[#e2e3e1] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bike className="w-4 h-4 text-[#006d36]" />
                          <div className="flex flex-col">
                            <span className="font-body-md text-xs font-bold">外卖专送渠道</span>
                            <span className="font-label-micro text-[8.5px] text-[#787770]">
                              MEITUAN / ELEME
                            </span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={channelDeliveryEnabled}
                          onChange={(e) => {
                            setChannelDeliveryEnabled(e.target.checked);
                            if (!e.target.checked) showToast('已熔断切断【外卖渠道】订购');
                          }}
                          className="w-4 h-4 accent-black cursor-pointer"
                        />
                      </div>

                      <div className="p-3 bg-[#f9f9f7] border border-[#e2e3e1] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Utensils className="w-4 h-4 text-[#006d36]" />
                          <div className="flex flex-col">
                            <span className="font-body-md text-xs font-bold">餐车现场堂食</span>
                            <span className="font-label-micro text-[8.5px] text-[#787770]">
                              ON-SITE COUNTER
                            </span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={channelDineInEnabled}
                          onChange={(e) => {
                            setChannelDineInEnabled(e.target.checked);
                            if (!e.target.checked) showToast('已熔断切断【堂食渠道】订购');
                          }}
                          className="w-4 h-4 accent-black cursor-pointer"
                        />
                      </div>

                      <div className="p-3 bg-[#f9f9f7] border border-[#e2e3e1] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-[#006d36]" />
                          <div className="flex flex-col">
                            <span className="font-body-md text-xs font-bold">预约到车自提</span>
                            <span className="font-label-micro text-[8.5px] text-[#787770]">
                              PRE-ORDER PICKUP
                            </span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={channelPickupEnabled}
                          onChange={(e) => {
                            setChannelPickupEnabled(e.target.checked);
                            if (!e.target.checked) showToast('已熔断切断【自提渠道】订购');
                          }}
                          className="w-4 h-4 accent-black cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dual Slider Control Matrix */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#f9f9f7] p-3.5 border border-[#e2e3e1] shadow-inner space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-[#ba1a1a]" />
                          <span className="font-headline-sm text-xs font-bold">15分钟峰值限流保护</span>
                        </div>
                        <span className="font-mono font-bold text-[#1a1c1b] text-xs">
                          {peakThrottleLimit} 份 / 15m
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="60"
                        step="5"
                        value={peakThrottleLimit}
                        onChange={(e) => setPeakThrottleLimit(Number(e.target.value))}
                        className="w-full accent-black cursor-pointer"
                      />
                      <p className="font-body-sm text-[10px] text-[#787770]">
                        当15分钟内涌入订单达到阈值时，自动触发前台出餐排队延时提示与降频限单
                      </p>
                    </div>

                    <div className="bg-[#f9f9f7] p-3.5 border border-[#e2e3e1] shadow-inner space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-[#d9730d]" />
                          <span className="font-headline-sm text-xs font-bold">安全库存自动沽清</span>
                        </div>
                        <span className="font-mono font-bold text-[#1a1c1b] text-xs">
                          ≤ {autoSoldOutThreshold} 份触发
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="15"
                        value={autoSoldOutThreshold}
                        onChange={(e) => setAutoSoldOutThreshold(Number(e.target.value))}
                        className="w-full accent-black cursor-pointer"
                      />
                      <p className="font-body-sm text-[10px] text-[#787770]">
                        车载冷链储位低于阈值时，各渠道自动转为「库存紧张」并预警补给中心
                      </p>
                    </div>
                  </div>

                  {/* Operational Risk Toggles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    <div className="flex items-center justify-between p-3 bg-[#f9f9f7] border border-[#e2e3e1]">
                      <div className="flex flex-col">
                        <span className="font-body-md text-xs font-bold">晚市定时自动下架防过载</span>
                        <span className="font-label-micro text-[9px] text-[#787770]">
                          锁定每日结束营业前清算周期
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={nightCutoffTime}
                          onChange={(e) => setNightCutoffTime(e.target.value)}
                          className="font-mono font-bold text-xs bg-white border border-[#d3d1cb] px-1.5 py-0.5"
                        />
                        <input
                          type="checkbox"
                          checked={nightCutoffEnabled}
                          onChange={(e) => setNightCutoffEnabled(e.target.checked)}
                          className="accent-black w-4 h-4 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#f9f9f7] border border-[#e2e3e1]">
                      <div className="flex flex-col">
                        <span className="font-body-md text-xs font-bold">单日限量供应配额控制</span>
                        <span className="font-label-micro text-[9px] text-[#787770]">
                          由中央物料配给箱每日定量直发
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={dailyQuota}
                          onChange={(e) => setDailyQuota(Number(e.target.value))}
                          className="font-mono font-bold text-xs bg-white border border-[#d3d1cb] px-1.5 py-0.5 w-16"
                        />
                        <input
                          type="checkbox"
                          checked={dailyQuotaEnabled}
                          onChange={(e) => setDailyQuotaEnabled(e.target.checked)}
                          className="accent-black w-4 h-4 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#f9f9f7] border border-[#e2e3e1]">
                      <div className="flex flex-col">
                        <span className="font-body-md text-xs font-bold">售罄自动推荐备选平替品</span>
                        <span className="font-label-micro text-[9px] text-[#787770]">
                          沽清时无缝弹窗推荐备选汉堡
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoSubstituteEnabled}
                        onChange={(e) => setAutoSubstituteEnabled(e.target.checked)}
                        className="accent-black w-4 h-4 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#f9f9f7] border border-[#e2e3e1]">
                      <div className="flex flex-col">
                        <span className="font-body-md text-xs font-bold">烤台超负荷动态延时补偿</span>
                        <span className="font-label-micro text-[9px] text-[#787770]">
                          测温超过260℃自动出餐延时 +3m
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={stationFuseEnabled}
                        onChange={(e) => setStationFuseEnabled(e.target.checked)}
                        className="accent-black w-4 h-4 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: SPECIFICATION VARIANTS */}
              {(isTiledView || activeTab === 'variants') && (
                <div id="tab-pane-spec-variants" className="bg-[#ffffff] p-5 border border-[#e2e3e1] shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e3e1] bg-[#f9f9f7] p-2.5">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#000000]" />
                      <span className="font-headline-sm text-sm uppercase text-[#1a1c1b] font-bold">
                        04. 多规格变体与独立定价矩阵
                      </span>
                      <span className="font-label-micro text-[9px] text-[#787770] font-mono">
                        PORTION & MULTI-SPECIFICATION MATRIX
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newV: DishVariant = {
                          id: `SPEC-${Date.now().toString().slice(-4)}`,
                          name: `新规格 ${editVariants.length + 1}`,
                          price: parseFloat(editPrice) || dish.price,
                          specRatio: '150g',
                          refCode: '9m',
                          available: true
                        };
                        setEditVariants([...editVariants, newV]);
                        showToast('已新增变体规格！');
                      }}
                      className="h-6 px-2.5 bg-[#000000] text-white font-label-micro text-[10px] flex items-center gap-1 shadow-xs cursor-pointer hover:bg-neutral-800"
                    >
                      <Plus className="w-3 h-3" />
                      <span>添加规格</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-[#e2e3e1]">
                    <table className="w-full text-left font-body-sm text-xs">
                      <thead className="bg-[#f4f4f2] font-label-micro text-[9.5px] text-[#787770] border-b border-[#e2e3e1]">
                        <tr>
                          <th className="p-2.5">规格编码</th>
                          <th className="p-2.5">规格名称</th>
                          <th className="p-2.5">肉饼克重/层数</th>
                          <th className="p-2.5">基准单价</th>
                          <th className="p-2.5">出餐时间</th>
                          <th className="p-2.5">按份售卖 / 起购量</th>
                          <th className="p-2.5">变体图</th>
                          <th className="p-2.5 text-right">默认推荐 / 操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e3e1]">
                        {editVariants.map((v, i) => {
                          const isDefault = rightActiveVariantIndex === i;
                          return (
                            <tr
                              key={v.id || i}
                              className={`transition-colors ${
                                isDefault ? 'bg-[#e6f4ea]/30 font-bold' : 'hover:bg-[#f9f9f7]'
                              } ${v.available === false ? 'opacity-60' : ''}`}
                            >
                              <td className="p-2.5 font-mono text-[11px] text-[#787770]">{v.id}</td>
                              <td className="p-2.5">
                                <input
                                  type="text"
                                  value={v.name}
                                  onChange={(e) => {
                                    const next = [...editVariants];
                                    next[i].name = e.target.value;
                                    setEditVariants(next);
                                  }}
                                  className="font-bold text-xs bg-transparent border-b border-dashed border-[#c8c7be] focus:border-[#000000] outline-none"
                                />
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="text"
                                  value={v.specRatio || '130g'}
                                  onChange={(e) => {
                                    const next = [...editVariants];
                                    next[i].specRatio = e.target.value;
                                    setEditVariants(next);
                                  }}
                                  className="text-xs text-[#474741] bg-transparent border-b border-dashed border-[#c8c7be] focus:border-[#000000] outline-none w-28"
                                />
                              </td>
                              <td className="p-2.5 font-mono">
                                ¥
                                <input
                                  type="number"
                                  step="0.5"
                                  value={v.price}
                                  onChange={(e) => {
                                    const next = [...editVariants];
                                    next[i].price = parseFloat(e.target.value) || 0;
                                    setEditVariants(next);
                                  }}
                                  className="font-bold text-xs w-16 bg-transparent border-b border-dashed border-[#c8c7be] focus:border-[#000000] outline-none ml-0.5"
                                />
                              </td>
                              <td className="p-2.5 font-mono">{v.refCode || editPrepTime}</td>
                              {/* 方向补充: 按份售卖参数（一份 N 串/份 · 最低加购 M） */}
                              <td className="p-2.5">
                                <div className="flex items-center gap-1">
                                  <span className="text-[9.5px] text-[#787770] shrink-0">一份</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={v.unitsPerServing ?? 1}
                                    onChange={(e) => {
                                      const next = [...editVariants];
                                      next[i].unitsPerServing = Math.max(1, parseInt(e.target.value) || 1);
                                      setEditVariants(next);
                                    }}
                                    className="w-10 px-1 py-0.5 text-[11px] font-mono text-center bg-white border border-[#d3d1cb] outline-none focus:border-[#000000]"
                                    title="一份包含的数量"
                                  />
                                  <input
                                    type="text"
                                    value={v.saleUnit ?? '份'}
                                    onChange={(e) => {
                                      const next = [...editVariants];
                                      next[i].saleUnit = e.target.value;
                                      setEditVariants(next);
                                    }}
                                    className="w-8 px-1 py-0.5 text-[11px] text-center bg-white border border-[#d3d1cb] outline-none focus:border-[#000000]"
                                    title="售卖单位（份/串/杯）"
                                  />
                                  <span className="text-[9.5px] text-[#787770] shrink-0">起购</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={v.minPurchaseQty ?? 1}
                                    onChange={(e) => {
                                      const next = [...editVariants];
                                      next[i].minPurchaseQty = Math.max(1, parseInt(e.target.value) || 1);
                                      setEditVariants(next);
                                    }}
                                    className="w-10 px-1 py-0.5 text-[11px] font-mono text-center bg-white border border-[#d3d1cb] outline-none focus:border-[#000000]"
                                    title="该规格最低加购数量"
                                  />
                                </div>
                              </td>
                              {/* 方向补充: 变体专属图片（素材库选用 / 上传入库复用） */}
                              <td className="p-2.5">
                                <button
                                  type="button"
                                  onClick={() => setVariantImagePickerIndex(i)}
                                  className="block w-10 h-10 border border-[#d3d1cb] bg-[#f4f4f2] overflow-hidden cursor-pointer hover:border-[#000000] transition-colors"
                                  title="设置该规格的专属变体图片（可从素材库选用，一次入库全店复用）"
                                >
                                  {v.imageUrl ? (
                                    <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <ImageIcon className="w-3.5 h-3.5 text-[#a8a6a0] mx-auto" />
                                  )}
                                </button>
                              </td>
                              <td className="p-2.5 text-right space-x-2">
                                {v.available === false && (
                                  <span className="font-label-micro text-[8.5px] text-[#d9730d] bg-[#fff8e1] border border-[#fde68a] px-1.5 py-0.5 font-bold">
                                    沽清
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy: DishVariant = {
                                      ...v,
                                      id: `SPEC-${Date.now().toString().slice(-4)}-${i}`,
                                      name: `${v.name} (副本)`,
                                      isDefault: false
                                    };
                                    const next = [...editVariants];
                                    next.splice(i + 1, 0, copy);
                                    setEditVariants(next);
                                    showToast(`已克隆「${v.name}」，可直接微调价格与克重`);
                                  }}
                                  className="font-label-micro text-[9px] text-[#006d36] hover:underline cursor-pointer"
                                >
                                  复制
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...editVariants];
                                    const turningOff = next[i].available !== false;
                                    next[i] = { ...next[i], available: !turningOff };
                                    setEditVariants(next);
                                    showToast(
                                      turningOff
                                        ? `「${v.name}」已临时沽清（规格保留，可随时恢复供售）`
                                        : `「${v.name}」已恢复供售`
                                    );
                                  }}
                                  className={`font-label-micro text-[9px] cursor-pointer hover:underline ${
                                    v.available === false ? 'text-[#006d36]' : 'text-[#d9730d]'
                                  }`}
                                >
                                  {v.available === false ? '恢复供售' : '临时沽清'}
                                </button>
                                <button
                                  type="button"
                                  disabled={i === 0}
                                  onClick={() => {
                                    if (i === 0) return;
                                    const next = [...editVariants];
                                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                                    setEditVariants(next);
                                    setRightActiveVariantIndex((idx) =>
                                      idx === i ? i - 1 : idx === i - 1 ? i : idx
                                    );
                                  }}
                                  className="font-label-micro text-[9px] text-[#787770] hover:text-[#000000] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  上移
                                </button>
                                <button
                                  type="button"
                                  disabled={i === editVariants.length - 1}
                                  onClick={() => {
                                    if (i === editVariants.length - 1) return;
                                    const next = [...editVariants];
                                    [next[i + 1], next[i]] = [next[i], next[i + 1]];
                                    setEditVariants(next);
                                    setRightActiveVariantIndex((idx) =>
                                      idx === i ? i + 1 : idx === i + 1 ? i : idx
                                    );
                                  }}
                                  className="font-label-micro text-[9px] text-[#787770] hover:text-[#000000] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  下移
                                </button>
                                {isDefault ? (
                                  <span className="font-label-micro text-[8.5px] text-[#006d36] bg-[#e6f4ea] px-1.5 py-0.5 font-bold">
                                    DEFAULT
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setRightActiveVariantIndex(i)}
                                    className="font-label-micro text-[9px] text-[#787770] hover:text-[#000000] cursor-pointer"
                                  >
                                    设为默认
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditVariants(editVariants.filter((_, idx) => idx !== i));
                                    if (rightActiveVariantIndex === i) setRightActiveVariantIndex(0);
                                  }}
                                  className="font-label-micro text-[9px] text-[#ba1a1a] hover:underline cursor-pointer"
                                >
                                  删除
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 5: SELECTOR MEDIA & BLUEPRINTS CAD */}
              {(isTiledView || activeTab === 'selector_media') && (
                <div id="tab-pane-blueprint-cad" className="bg-[#ffffff] p-5 border border-[#e2e3e1] shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#e2e3e1] bg-[#f9f9f7] p-2.5 gap-2">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#00d4ff]" />
                      <span className="font-headline-sm text-sm uppercase text-[#1a1c1b] font-bold">
                        05. 字段选择器图纸与线稿自动化管理
                      </span>
                      <span className="font-label-micro text-[9px] text-[#00d4ff] bg-[#041224] px-2 py-0.5 font-mono">
                        CAD-ENGINE v2.4
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoFillBlueprints}
                      className="h-7 px-3 bg-[#082846] text-[#00d4ff] font-label-sm text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer font-bold"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>智能补齐全量线稿 (AUTO-FILL)</span>
                    </button>
                  </div>

                  {/* Filter pill tabs */}
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: 'all', label: '全部图纸 (8)' },
                      { id: 'variant', label: '规格变体 (3)' },
                      { id: 'flavor', label: '风味酱料 (3)' },
                      { id: 'option', label: '配菜选装 (2)' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSelectorCategoryFilter(tab.id as any)}
                        className={`px-2.5 py-1 font-label-micro text-[9.5px] cursor-pointer transition-colors ${
                          selectorCategoryFilter === tab.id
                            ? 'bg-[#000000] text-white font-bold'
                            : 'bg-[#f4f4f2] text-[#474741] hover:bg-[#e5e2da]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Blueprint Matrix Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Blueprint Card 1 */}
                    <div className="bg-[#041224] p-3 relative overflow-hidden flex flex-col justify-between h-48 shadow-md border border-[#00d4ff]/20">
                      <div className="flex items-center justify-between z-10">
                        <span className="font-mono text-[9px] text-[#00d4ff]">DWG #01 · 整体装配剖面</span>
                        <span className="font-mono text-[8.5px] text-white/60">VECTOR-0.5</span>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                        <svg
                          className="w-36 h-36 text-[#00d4ff]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="0.75"
                          viewBox="0 0 100 100"
                        >
                          <circle cx="50" cy="50" r="45" strokeDasharray="2,2" />
                          <rect height="40" rx="4" width="60" x="20" y="30" />
                          <line x1="10" x2="90" y1="50" y2="50" />
                          <line x1="50" x2="50" y1="10" y2="90" />
                          <text fill="currentColor" fontFamily="'Space Grotesk', sans-serif" fontSize="6" x="24" y="45">
                            WAGYU 130g
                          </text>
                          <text fill="currentColor" fontFamily="'Space Grotesk', sans-serif" fontSize="6" x="24" y="62">
                            BRIOCHE 80g
                          </text>
                        </svg>
                      </div>
                      <div className="z-10 flex items-center justify-between pt-2 border-t border-[#00d4ff]/20">
                        <div className="flex flex-col">
                          <span className="font-body-sm text-xs text-white font-bold">标准装配立体线稿</span>
                          <span className="font-label-micro text-[8.5px] text-white/70 font-mono">
                            ASSEMBLY-STD.DWG
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewBlueprintMode('blueprint');
                            showToast('已载入标准装配立体线稿 DWG');
                          }}
                          className="px-2 py-0.5 bg-[#082846] text-[#00d4ff] font-label-micro text-[9px] hover:bg-[#00d4ff] hover:text-[#041224] transition-colors cursor-pointer"
                        >
                          查看图纸
                        </button>
                      </div>
                    </div>

                    {/* Blueprint Card 2 */}
                    <div className="bg-[#041224] p-3 relative overflow-hidden flex flex-col justify-between h-48 shadow-md border border-[#00d4ff]/20">
                      <div className="flex items-center justify-between z-10">
                        <span className="font-mono text-[9px] text-[#00d4ff]">DWG #02 · 双层厚切形位公差</span>
                        <span className="font-mono text-[8.5px] text-white/60">LAYER-2.0</span>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                        <svg
                          className="w-36 h-36 text-[#00d4ff]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="0.75"
                          viewBox="0 0 100 100"
                        >
                          <rect height="15" rx="3" width="70" x="15" y="25" />
                          <rect height="15" rx="3" width="70" x="15" y="45" />
                          <rect height="15" rx="3" width="70" x="15" y="65" />
                          <line strokeDasharray="1,3" x1="5" x2="95" y1="10" y2="90" />
                          <text fill="currentColor" fontFamily="'Space Grotesk', sans-serif" fontSize="5" x="25" y="35">
                            PATTY 01
                          </text>
                          <text fill="currentColor" fontFamily="'Space Grotesk', sans-serif" fontSize="5" x="25" y="55">
                            PATTY 02
                          </text>
                        </svg>
                      </div>
                      <div className="z-10 flex items-center justify-between pt-2 border-t border-[#00d4ff]/20">
                        <div className="flex flex-col">
                          <span className="font-body-sm text-xs text-white font-bold">双层肉饼叠置图</span>
                          <span className="font-label-micro text-[8.5px] text-white/70 font-mono">
                            DBL-STACK.DWG
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setRightActiveVariantIndex(1);
                            setPreviewBlueprintMode('blueprint');
                            showToast('已切换至双层变体蓝图透视');
                          }}
                          className="px-2 py-0.5 bg-[#082846] text-[#00d4ff] font-label-micro text-[9px] hover:bg-[#00d4ff] hover:text-[#041224] transition-colors cursor-pointer"
                        >
                          查看图纸
                        </button>
                      </div>
                    </div>

                    {/* Blueprint Card 3 */}
                    <div className="bg-[#f9f9f7] p-3 flex flex-col justify-between h-48 shadow-inner border border-[#e2e3e1]">
                      <div className="flex items-center justify-between">
                        <span className="font-label-micro text-[8.5px] text-[#787770] font-mono">
                          VECTOR #03 · 酱料喷涂轨迹
                        </span>
                        <span className="font-label-micro text-[8px] text-[#006d36] bg-[#e6f4ea] px-1 font-bold">
                          AI-GENERATED
                        </span>
                      </div>
                      <div className="flex flex-col items-center justify-center text-center py-2">
                        <Activity className="w-8 h-8 text-[#787770] mb-1 opacity-60" />
                        <span className="font-headline-sm text-xs text-[#1a1c1b] font-bold">
                          秘制黑椒喷射半径
                        </span>
                        <span className="font-label-micro text-[8.5px] text-[#787770] font-mono">
                          NOZZLE CALIBRATION 15ml
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#e2e3e1]">
                        <span className="font-label-micro text-[9px] text-[#474741]">状态: 已关联配方</span>
                        <button
                          type="button"
                          onClick={() => showToast('已重新校准喷头坐标参数 (X:120 Y:45)')}
                          className="px-2 py-0.5 bg-[#f4f4f2] text-[#1a1c1b] font-label-micro text-[9px] hover:bg-[#e5e2da] transition-colors cursor-pointer border border-[#d3d1cb]"
                        >
                          校准坐标
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 6: BARCODE & HARDWARE SCANNER LINK */}
              {(isTiledView || activeTab === 'barcode') && (
                <div id="tab-pane-barcode-hardware" className="bg-[#ffffff] p-5 border border-[#e2e3e1] shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e3e1] bg-[#f9f9f7] p-2.5">
                    <div className="flex items-center gap-2">
                      <Barcode className="w-4 h-4 text-[#000000]" />
                      <span className="font-headline-sm text-sm uppercase text-[#1a1c1b] font-bold">
                        06. 69商品条码与无线扫码枪硬件联动
                      </span>
                      <span className="font-label-micro text-[9px] text-[#787770] font-mono">
                        HARDWARE TELEMETRY & BARCODE LINK
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#006d36] animate-pulse" />
                      <span className="font-label-micro text-[9px] text-[#006d36] font-mono font-bold">
                        USB-HID CONNECTED
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="space-y-2">
                      <label className="font-label-sm text-xs text-[#474741] block font-bold">
                        国际 69 标准条码编码 (EAN-13):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editBarcode}
                          onChange={(e) => setEditBarcode(e.target.value)}
                          className="flex-1 px-3 py-2 bg-[#f9f9f7] font-mono font-bold text-[#1a1c1b] outline-none border border-[#d3d1cb] focus:border-[#000000] shadow-inner text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleCopyBarcode}
                          className="h-9 px-3 bg-[#f4f4f2] hover:bg-[#e5e2da] text-[#1a1c1b] font-label-sm text-xs transition-colors flex items-center gap-1 border border-[#d3d1cb] cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>复制</span>
                        </button>
                      </div>
                      <p className="font-body-sm text-[10.5px] text-[#787770]">
                        扫码枪扫描到此条码时，车载收银 POS 与保温出餐灯箱将自动调取本配方工艺
                      </p>
                    </div>

                    <div className="bg-[#f9f9f7] p-3.5 border border-[#e2e3e1] shadow-inner flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-xs text-[#474741] font-bold">硬件扫码模拟器</span>
                        <span className="font-label-micro text-[8.5px] text-[#787770] font-mono">
                          LISTENING PORT 9100
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={scannerSimInput}
                          onChange={(e) => setScannerSimInput(e.target.value)}
                          placeholder="对准激光枪或输入测试条码..."
                          className="flex-1 px-2.5 py-1.5 bg-[#ffffff] font-mono text-xs outline-none border border-[#d3d1cb] focus:border-[#000000]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (scannerSimInput.trim()) {
                              setEditBarcode(scannerSimInput.trim());
                              setLastScanLatency(`${Math.floor(Math.random() * 10 + 8)}ms`);
                              showToast(`[模拟硬件扫码成功] 条码: ${scannerSimInput.trim()}`);
                              setScannerSimInput('');
                            }
                          }}
                          className="px-3 py-1.5 bg-[#000000] text-white font-label-sm text-xs hover:bg-neutral-800 cursor-pointer font-bold"
                        >
                          模拟扫码
                        </button>
                      </div>
                      <div className="text-[#787770] font-label-micro text-[9px] flex items-center justify-between pt-1 border-t border-[#e2e3e1]">
                        <span>最近识别响应: {lastScanLatency}</span>
                        <span className="text-[#006d36] font-bold font-mono">校验码和位: 1 (VALID)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 7: SOP MATRIX */}
              {(isTiledView || activeTab === 'cooking_sop') && (
                <div id="tab-pane-sop-matrix" className="bg-[#ffffff] p-5 border border-[#e2e3e1] shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e3e1] bg-[#f9f9f7] p-2.5">
                    <div className="flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-[#000000]" />
                      <span className="font-headline-sm text-sm uppercase text-[#1a1c1b] font-bold">
                        07. SOP 工艺操作步骤流水
                      </span>
                      <span className="font-label-micro text-[9px] text-[#787770] font-mono">
                        STANDARD OPERATING PROCEDURE
                      </span>
                    </div>
                    <span className="font-label-micro text-[9px] bg-[#e5e2da] px-2 py-0.5 font-mono font-bold">
                      4 STAGES
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 bg-[#f9f9f7] border border-[#e2e3e1] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#000000] text-white flex items-center justify-center font-mono font-bold text-xs">
                          1
                        </span>
                        <div>
                          <h2 className="font-body-md text-xs font-bold text-[#1a1c1b]">
                            面团醒发与黄油烘烤 (BRIOCHE BUN TOAST)
                          </h2>
                          <p className="font-body-sm text-[10.5px] text-[#787770]">
                            下压式扒炉 180℃，双面黄油轻烤 45 秒，至边缘轻微焦褐感
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-[#474741] font-bold">00:45s</span>
                    </div>

                    <div className="p-3 bg-[#f9f9f7] border border-[#e2e3e1] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#000000] text-white flex items-center justify-center font-mono font-bold text-xs">
                          2
                        </span>
                        <div>
                          <h2 className="font-body-md text-xs font-bold text-[#1a1c1b]">
                            和牛排果木炭烤 (CHARCOAL SEARING)
                          </h2>
                          <p className="font-body-sm text-[10.5px] text-[#787770]">
                            专用炭火烤台 230℃，单面封边 90 秒后翻面，中心温度达到 65℃
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-[#006d36] font-bold">03:30s</span>
                    </div>

                    <div className="p-3 bg-[#f9f9f7] border border-[#e2e3e1] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#000000] text-white flex items-center justify-center font-mono font-bold text-xs">
                          3
                        </span>
                        <div>
                          <h2 className="font-body-md text-xs font-bold text-[#1a1c1b]">
                            酱料定量喷涂与组装 (ASSEMBLY & DRESSING)
                          </h2>
                          <p className="font-body-sm text-[10.5px] text-[#787770]">
                            依次放置车达芝士片、酸黄瓜 3 片、喷射秘制黑椒酱 15ml、加盖顶层面包
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-[#474741] font-bold">00:30s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 8: TRACEABILITY */}
              {(isTiledView || activeTab === 'ingredient_trace') && (
                <div id="tab-pane-traceability" className="bg-[#ffffff] p-5 border border-[#e2e3e1] shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e3e1] bg-[#f9f9f7] p-2.5">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-[#006d36]" />
                      <span className="font-headline-sm text-sm uppercase text-[#1a1c1b] font-bold">
                        08. 食材区块链溯源与冷链温控记录
                      </span>
                      <span className="font-label-micro text-[9px] text-[#787770] font-mono">
                        COLD-CHAIN AUDIT LOG
                      </span>
                    </div>
                    <span className="font-label-micro text-[9px] text-[#006d36] bg-[#e6f4ea] px-2 py-0.5 font-bold font-mono">
                      BLOCK #189283
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div className="p-3 bg-[#f9f9f7] border border-[#e2e3e1] space-y-1">
                      <span className="font-label-micro text-[8.5px] text-[#787770]">牛肉产地来源</span>
                      <p className="font-body-md text-xs font-bold text-[#1a1c1b]">{editOriginSource}</p>
                      <span className="font-mono text-[9px] text-[#474741]">
                        BATCH: {editInspectionBatchNo}
                      </span>
                    </div>
                    <div className="p-3 bg-[#f9f9f7] border border-[#e2e3e1] space-y-1">
                      <span className="font-label-micro text-[8.5px] text-[#787770]">车载冷柜瞬时温度</span>
                      <p className="font-mono text-xs font-bold text-[#006d36]">{editColdChainTemp}</p>
                      <span className="font-mono text-[9px] text-[#474741]">SENSOR: SINK-COLD-A</span>
                    </div>
                    <div className="p-3 bg-[#f9f9f7] border border-[#e2e3e1] space-y-1">
                      <span className="font-label-micro text-[8.5px] text-[#787770]">检疫合格证明</span>
                      <p className="font-body-md text-xs font-bold text-[#1a1c1b]">海关动植检检验通过</p>
                      <span className="font-mono text-[9px] text-[#474741]">
                        SUPPLIER: {editSupplierName}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <IngredientTraceSopSection
                      dish={dish}
                      ingredients={editIngredients}
                      originSource={editOriginSource}
                      inspectionBatchNo={editInspectionBatchNo}
                      coldChainTemp={editColdChainTemp}
                      supplierName={editSupplierName}
                      sopCookingSteps={editSopCookingSteps}
                      onUpdateIngredients={setEditIngredients}
                      onUpdateOriginSource={setEditOriginSource}
                      onUpdateInspectionBatchNo={setEditInspectionBatchNo}
                      onUpdateColdChainTemp={setEditColdChainTemp}
                      onUpdateSupplierName={setEditSupplierName}
                      onUpdateSopCookingSteps={setEditSopCookingSteps}
                    />
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* RIGHT FIXED LIVE SIMULATOR VIEWPORT (4 COLUMNS) */}
          <div className="xl:col-span-4 flex flex-col min-h-0 bg-[#f9f9f7] p-4 sm:p-5 overflow-y-auto hide-scrollbar gap-3 border-t xl:border-t-0">
            {/* SIMULATOR CONTROL BAR */}
            <div className="bg-[#ffffff] p-2 border border-[#e2e3e1] shadow-xs flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1 bg-[#f9f9f7] p-1 border border-[#e2e3e1]">
                <button
                  type="button"
                  onClick={() => dynamicSlotActions.onSwitchChannel('delivery')}
                  className={`px-3 py-1 font-label-micro text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
                    rightPreviewChannel === 'delivery'
                      ? 'bg-[#000000] text-white shadow-xs font-bold'
                      : 'text-[#1a1c1b] hover:bg-[#eaeae8]'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>外卖端</span>
                </button>
                <button
                  type="button"
                  onClick={() => dynamicSlotActions.onSwitchChannel('dine_in')}
                  className={`px-3 py-1 font-label-micro text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
                    rightPreviewChannel === 'dine_in'
                      ? 'bg-[#000000] text-white shadow-xs font-bold'
                      : 'text-[#1a1c1b] hover:bg-[#eaeae8]'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>堂食端</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => dynamicSlotActions.onToggleBlueprintMode()}
                  className="h-7 px-2.5 bg-[#f4f4f2] hover:bg-[#e5e2da] border border-[#d3d1cb] font-label-micro text-[10px] flex items-center gap-1 cursor-pointer font-bold"
                  title="切换 CAD 线稿透视模式"
                >
                  <Zap className="w-3 h-3 text-[#006d36]" />
                  <span>{previewBlueprintMode === 'blueprint' ? 'CAD蓝图' : '实物图'}</span>
                </button>
              </div>
            </div>

            {/* Toast simulated notification */}
            {previewToastMessage && (
              <div className="p-2.5 bg-[#e6f4ea] text-[#006d36] border border-[#a8dab5] text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-150 shrink-0">
                <span className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">{previewToastMessage}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewToastMessage(null)}
                  className="text-[#006d36] cursor-pointer ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* HARDWARE EMULATION CLIENT SCREEN (PHONE/TABLET HUD SIMULATOR) */}
            <div className="bg-[#ffffff] border border-[#d3d1cb] shadow-md overflow-hidden relative shrink-0">
              {/* Live Client Header Bar */}
              <div className="bg-[#f4f4f2] px-4 py-1.5 flex items-center justify-between border-b border-[#e2e3e1]">
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[9px] font-bold">9:41</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006d36]" />
                </div>
                <span className="font-label-micro text-[8.5px] uppercase font-bold tracking-wider text-[#474741]">
                  URBAN RADAR FOODCRAFT
                </span>
                <div className="flex items-center gap-1 font-mono text-[9px] text-[#474741]">
                  <Wifi className="w-3 h-3" />
                  <span>5G</span>
                </div>
              </div>

              {/* Food Visual Banner / CAD Blueprint Mode */}
              <div className="relative h-44 w-full bg-[#e5e2da] overflow-hidden">
                {previewBlueprintMode === 'photo' ? (
                  <img
                    src={dish.imageUrl}
                    alt={dish.name}
                    className="w-full h-full object-cover transition-opacity duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#041224] flex flex-col justify-between p-3 pointer-events-none">
                    <div className="flex justify-between items-center text-[#00d4ff] font-mono text-[8px]">
                      <span>[HUD-PROJECTION: BURGER-WAGYU]</span>
                      <span>GEO-TOLERANCE ±0.2mm</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <svg
                        className="w-28 h-28 text-[#00d4ff]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.8"
                        viewBox="0 0 100 100"
                      >
                        <circle cx="50" cy="50" r="40" strokeDasharray="2,2" />
                        <line x1="20" x2="80" y1="40" y2="40" />
                        <line x1="15" x2="85" y1="52" y2="52" />
                        <line x1="20" x2="80" y1="64" y2="64" />
                        <circle cx="50" cy="50" r="6" />
                      </svg>
                    </div>
                    <div className="text-right text-[#00d4ff] font-mono text-[8px]">
                      TEMP: 230℃ · DWELL: 210s
                    </div>
                  </div>
                )}

                {/* Channel Badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#000000]/90 text-white font-label-micro text-[9px] backdrop-blur-sm">
                  <span>
                    {rightPreviewChannel === 'delivery' ? '外卖专享渠道 🛵' : '餐车堂食端 🍽️'}
                  </span>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-[#ffffff]/90 text-[#1a1c1b] font-label-micro text-[9px] backdrop-blur-sm shadow border border-[#e2e3e1]">
                  出餐预计: <span className="font-bold font-mono">{editPrepTime}</span>
                </div>
              </div>

              {/* Food Specification Content in Client */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-headline-sm text-sm font-bold text-[#1a1c1b]">{dish.name}</h2>
                    <p className="font-body-sm text-[10.5px] text-[#787770]">
                      {dish.ingredients && dish.ingredients.length > 0
                        ? dish.ingredients.map((i) => i.name).join(' · ')
                        : '澳洲黑毛和牛 · 手工打制 · 现烤布里欧修'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="font-headline-sm text-sm font-bold text-[#000000]">
                        ¥{finalUnitPrice.toFixed(2)}
                      </span>
                      <span className="font-label-micro text-[9px] text-[#787770] line-through">
                        ¥{parseFloat(editOriginalPrice || '45').toFixed(2)}
                      </span>
                    </div>
                    {currentDiscount > 0 && (
                      <span className="font-label-micro text-[8.5px] text-[#ba1a1a] bg-[#ffdad6] px-1 font-bold">
                        已立减 ¥{currentDiscount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Interactive Options in Simulator */}
                <div className="pt-1 space-y-1">
                  <span className="font-label-micro text-[9px] text-[#474741] block font-bold">
                    选择辣度口感 (联动表单项)
                  </span>
                  <div className="grid grid-cols-4 gap-1 text-center font-label-micro text-[9px]">
                    {editSpicinessOptions.slice(0, 4).map((spice) => {
                      const isSel = previewSelectedSpice === spice;
                      return (
                        <button
                          key={spice}
                          type="button"
                          onClick={() => dynamicSlotActions.onSelectSpice(spice)}
                          className={`py-1 transition-colors cursor-pointer border ${
                            isSel
                              ? 'bg-[#000000] text-white font-bold shadow-xs border-[#000000]'
                              : 'bg-[#f4f4f2] text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#e5e2da]'
                          }`}
                        >
                          {spice.replace(/\s*\(.*?\)/, '')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-1 space-y-1">
                  <span className="font-label-micro text-[9px] text-[#474741] block font-bold">
                    选择主理人酱汁
                  </span>
                  <div className="flex items-center gap-1 text-center font-label-micro text-[9px]">
                    {editFlavorOptions.slice(0, 3).map((flv) => {
                      const isFlv = previewSelectedFlavor === flv;
                      return (
                        <button
                          key={flv}
                          type="button"
                          onClick={() => dynamicSlotActions.onSelectFlavor(flv)}
                          className={`flex-1 py-1 transition-colors cursor-pointer border ${
                            isFlv
                              ? 'bg-[#000000] text-white font-bold shadow-xs border-[#000000]'
                              : 'bg-[#f4f4f2] text-[#1a1c1b] border-[#e2e3e1] hover:bg-[#e5e2da]'
                          }`}
                        >
                          {flv}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity Stepper & Add To Cart */}
                <div className="pt-2 flex items-center justify-between border-t border-[#e2e3e1]">
                  <div className="flex items-center bg-[#f9f9f7] p-1 shadow-inner border border-[#d3d1cb]">
                    <button
                      type="button"
                      onClick={() => dynamicSlotActions.onUpdateQuantity(-1)}
                      className="w-6 h-6 flex items-center justify-center bg-[#ffffff] text-[#1a1c1b] font-bold hover:bg-[#f4f4f2] cursor-pointer border border-[#d3d1cb]"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-xs">
                      {previewQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => dynamicSlotActions.onUpdateQuantity(1)}
                      className="w-6 h-6 flex items-center justify-center bg-[#ffffff] text-[#1a1c1b] font-bold hover:bg-[#f4f4f2] cursor-pointer border border-[#d3d1cb]"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={dynamicSlotActions.onAddToCart}
                    className="px-4 py-2 bg-[#000000] hover:bg-neutral-800 text-white font-label-sm text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer font-bold"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>加入点餐车 ¥{finalTotalPrice.toFixed(2)}</span>
                  </button>
                </div>
              </div>

              {/* Simulated Risk & Telemetry Indicator Strip */}
              <div className="bg-[#f9f9f7] p-2.5 space-y-1 font-label-micro text-[9px] text-[#787770] border-t border-[#e2e3e1]">
                <div className="flex items-center justify-between">
                  <span>车载节点当前出餐负荷:</span>
                  <span className="text-[#006d36] font-mono font-bold">NORMAL (62%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>扫码枪条码校验和:</span>
                  <span className="font-mono text-[#1a1c1b] font-bold">
                    {editBarcode || '6972049182301'} OK
                  </span>
                </div>
              </div>
            </div>

            {/* REVERSE FOCUS INSPECTION HINT */}
            <div className="bg-[#f9f9f7] p-2.5 border border-[#e2e3e1] shadow-inner flex items-center gap-2 text-[#474741] shrink-0">
              <RefreshCw className="w-3.5 h-3.5 text-[#006d36] shrink-0" />
              <span className="font-label-micro text-[9.5px]">
                提示：双栏实时双向同步。在左侧调整立减或辣度池，真机视图即刻刷新渲染。
              </span>
            </div>
          </div>
        </div>

        {/* 5. WORKBENCH BOTTOM PERSISTENT ACTION FOOTER */}
        <footer className="bg-[#ffffff] p-3 sm:p-4 border-t border-[#e2e3e1] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#006d36] animate-pulse" />
              <span className="font-label-sm text-xs text-[#1a1c1b] font-bold">流动餐车中台就绪</span>
            </div>
            <div className="h-4 w-px bg-[#e2e3e1] hidden sm:block" />
            <span className="font-label-micro text-[9.5px] text-[#787770]">
              未提交的草稿改动:{' '}
              <span
                className={`font-mono font-bold ${
                  dirtyCount > 0 ? 'text-[#d9730d]' : 'text-[#006d36]'
                }`}
              >
                {dirtyCount} 处属性变更
              </span>
              {dirtyCount > 0 && (
                <span className="ml-1">（{dirtyEntries.slice(0, 2).join('、')}）</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                if (requestDiscardConfirm()) onClose();
              }}
              className="h-9 px-4 bg-[#f9f9f7] hover:bg-[#f4f4f2] border border-[#d3d1cb] text-[#1a1c1b] font-label-md text-xs transition-colors flex items-center gap-1 cursor-pointer font-bold"
            >
              放弃重置
            </button>
            <button
              type="button"
              disabled={isBroadcastingSync}
              onClick={handleFullSync}
              className="h-9 px-5 bg-[#000000] hover:bg-neutral-800 text-white font-label-md text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer font-bold"
            >
              {isBroadcastingSync ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>正在向全城 49 辆餐车广播...</span>
                </>
              ) : broadcastDone ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-[#9bf6b1]" />
                  <span>全网同步完成 (49/49)</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>保存并全网同步至餐车前台</span>
                </>
              )}
            </button>
          </div>
        </footer>

        {/* 方向补充: 在库图片素材库选择器（变体图 / 口味图 共用） */}
        {variantImagePickerIndex !== null && (
          <MediaLibraryPicker
            open
            title={`规格变体图片 —— ${editVariants[variantImagePickerIndex]?.name ?? ''}`}
            activeDataUrl={editVariants[variantImagePickerIndex]?.imageUrl}
            showToast={showToast}
            onClose={() => setVariantImagePickerIndex(null)}
            onPick={(item) => {
              const next = [...editVariants];
              next[variantImagePickerIndex] = {
                ...next[variantImagePickerIndex],
                imageUrl: item.dataUrl
              };
              setEditVariants(next);
              setVariantImagePickerIndex(null);
            }}
          />
        )}
        {flavorImagePickerTarget !== null && (
          <MediaLibraryPicker
            open
            title={`口味专属图片 —— ${flavorImagePickerTarget}`}
            activeDataUrl={editFlavorOptionImages[flavorImagePickerTarget]}
            showToast={showToast}
            onClose={() => setFlavorImagePickerTarget(null)}
            onPick={(item) => {
              setEditFlavorOptionImages((prev) => ({
                ...prev,
                [flavorImagePickerTarget]: item.dataUrl
              }));
              setFlavorImagePickerTarget(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
