import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Sparkles,
  Utensils,
  Bike,
  Smartphone,
  Eye,
  ShoppingBag,
  X,
  Edit3,
  Sliders,
  Check,
  CheckSquare,
  Square,
  Layers,
  ArrowRight,
  TrendingDown,
  Percent,
  SlidersHorizontal,
  Flame,
  ShieldCheck,
  Cloud,
  Download,
  Copy,
  ChefHat,
  Info,
  RefreshCw,
  Clock,
  CloudLightning,
  CheckCheck,
  ZoomIn,
  Maximize2,
  Barcode,
  Scan,
  QrCode,
  Upload,
  Camera,
  Power,
  Image as ImageIcon,
  AlertCircle,
  Minus,
  Printer,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ExternalLink,
  FileText,
  CheckCircle,
  Trash2
} from 'lucide-react';
import { DishItem, CategoryType, SubCategoryType, DishVariant } from '../../types';
import { CATEGORY_TAXONOMY, getCategoryDef } from '../../data/categoryTaxonomy';
import { rematchAllDishImages } from '../../utils/dishImageMatcher';
import { seedDishesToCloud } from '../../utils/cloudbase';
import { globalFranchiseEngine } from '../../utils/franchiseTenantEngine';
import { generateEan13Barcode, globalScannerEngine, playScannerBeep } from '../../utils/barcodeScannerEngine';
import { DishPriceCalculator } from '../DishPriceCalculator';
import { DishDiscountBanner } from '../DishDiscountBanner';
import { CloudbaseStatusModal } from '../CloudbaseStatusModal';
import { DishImagePreviewModal } from './DishImagePreviewModal';
import { DishImageUploadModal, FOOD_PRESET_GALLERY } from './DishImageUploadModal';
import { DishParameterRulesModal } from './DishParameterRulesModal';
import { FlavorTagSelector } from './FlavorTagSelector';
import { DishVariantEditor } from './DishVariantEditor';
import { AccountAuditDrawer } from './AccountAuditDrawer';
import {
  getVariantBorderClass,
  getVariantFitClass,
  getVariantFilterClass,
  getVariantBadgeClasses
} from '../../utils/variantStyleHelper';
import {
  getChannelOverrides,
  setChannelOverride,
  setChannelOverridesBulk,
  DishChannelStatus
} from '../../utils/dishAvailability';
import { MerchantMenuHeaderDeck } from './MerchantMenuHeaderDeck';
import { MerchantDishListView } from './MerchantDishListView';
import { MerchantMenuPagination } from './MerchantMenuPagination';
import { ConsoleBatchRibbon } from './menu-console/ConsoleBatchRibbon';
import { DishQrCodeModal } from '../common/DishQrCodeModal';
import { ComboQrGeneratorModal } from './ComboQrGeneratorModal';

// Standard Preset Options for quick selection
export const SPICINESS_PRESETS = [
  '不辣 (原味)',
  '微辣 (推荐)',
  '中辣 (经典川香)',
  '重辣 (嗜辣专享)',
  '变态辣 (魔鬼椒定制)'
];

export const FLAVOR_PRESETS = [
  '秘制黑椒酱香',
  '经典炭烤椒盐',
  '秘传孜然麻辣',
  '青花椒藤椒风味',
  '黑松露法式蒜香',
  '老北京秘制甜辣',
  '蜜汁叉烧风味',
  '日式照烧香浓',
  '泰式青柠酸辣',
  '香烤葱油原汁'
];

export const COOKING_STYLE_PRESETS = [
  '炭火现烤 (果木炭慢烘)',
  '远红外炙烤 (锁鲜多汁)',
  '高压微炸 (外酥里嫩)',
  '铁板生煎 (焦香浓郁)',
  '先卤后烤 (软烂入味)',
  '生滚锁鲜 (清润鲜甜)',
  '低温慢煮 (粉嫩多汁)',
  '酥脆金黄 (轻油薄脆)'
];

interface MerchantMenuChannelProps {
  dishes: DishItem[];
  onToggleAvailability: (dishId: string) => void;
  onAddNewDish: (dish: Partial<DishItem>) => void;
  onUpdateDish?: (dish: DishItem) => void;
  onBulkUpdateDishes?: (updater: (prev: DishItem[]) => DishItem[]) => void;
  onRematchAllImages?: () => void;
  showToast: (msg: string) => void;
}

export const MerchantMenuChannel: React.FC<MerchantMenuChannelProps> = ({
  dishes,
  onToggleAvailability,
  onAddNewDish,
  onUpdateDish,
  onBulkUpdateDishes,
  onRematchAllImages,
  showToast
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [cookingStyleFilter, setCookingStyleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCloudbaseModalOpen, setIsCloudbaseModalOpen] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  // Cloud Sync Handler for full menu
  const handleSyncAllDishesToCloud = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await seedDishesToCloud(dishes, (current, total, name) => {
        setSyncProgress({ current, total, name });
      });
      if (res.success) {
        showToast(`已成功将全部 ${res.count} 道菜品（包含日式烧鸟与芝士焗类）同步至腾讯云端数据库！`);
      } else {
        showToast(`云端同步提示: ${res.error || '已同步至本地安全双轨存储'}`);
      }
    } catch (err: any) {
      showToast(`同步遇到问题: ${err?.message || '请检查网络连接'}`);
    } finally {
      setIsSyncingCloud(false);
      setSyncProgress(null);
    }
  };

  /**
   * 重匹配云端图库：按菜品名称 / 类目重新解析主图与图集，
   * 由 Top Deck 的「重匹配图片」战术按钮触发。
   */
  const handleRematchAllImages = () => {
    if (!onBulkUpdateDishes) {
      showToast('当前运行环境未开放批量图片重匹配通道，请稍后重试');
      return;
    }
    let matchedCount = 0;
    onBulkUpdateDishes((prev) => {
      const next = rematchAllDishImages(prev);
      matchedCount = next.length;
      return next;
    });
    showToast(`已按菜品名称与类目重新匹配云端图库：${matchedCount} 道菜品主图已同步刷新`);
  };

  // Edit Dish Modal State
  const [editingDish, setEditingDish] = useState<DishItem | null>(null);
  const [previewZoomDish, setPreviewZoomDish] = useState<DishItem | null>(null);
  const [uploadModalDish, setUploadModalDish] = useState<DishItem | null>(null);
  const [editActiveTab, setEditActiveTab] = useState<'parameters' | 'flavor_tags' | 'price_discount' | 'cooking_sop' | 'image' | 'barcode' | 'preview' | 'variants'>('parameters');
  const [editVariants, setEditVariants] = useState<DishVariant[]>([]);
  const [variantImageModalTarget, setVariantImageModalTarget] = useState<{ variantIndex: number; currentVariant: DishVariant } | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editOriginalPrice, setEditOriginalPrice] = useState('');
  const [editPrevPrice, setEditPrevPrice] = useState('');
  const [editDeliveryDiscount, setEditDeliveryDiscount] = useState('');
  const [editDeliveryDiscountTag, setEditDeliveryDiscountTag] = useState('');
  const [editDineInDiscount, setEditDineInDiscount] = useState('');
  const [editDineInDiscountTag, setEditDineInDiscountTag] = useState('');
  const [editSpicinessLevel, setEditSpicinessLevel] = useState('微辣 (推荐)');
  const [editSpicinessOptions, setEditSpicinessOptions] = useState<string[]>([]);
  const [editFlavor, setEditFlavor] = useState('秘制黑椒酱香');
  const [editFlavorOptions, setEditFlavorOptions] = useState<string[]>([]);
  const [editFlavorTags, setEditFlavorTags] = useState<string[]>([]);
  const [editCookingStyle, setEditCookingStyle] = useState('炭火现烤 (果木炭慢烘)');
  const [editCraftStandardNote, setEditCraftStandardNote] = useState('');
  const [editBadgeText, setEditBadgeText] = useState('');
  const [editPrepTime, setEditPrepTime] = useState('约8m');
  const [editCustomFlavorInput, setEditCustomFlavorInput] = useState('');
  const [editCustomSpiceInput, setEditCustomSpiceInput] = useState('');
  const [editPreviewMode, setEditPreviewMode] = useState<'delivery' | 'dine_in'>('delivery');
  const [rightPreviewChannel, setRightPreviewChannel] = useState<'delivery' | 'dine_in' | 'compare'>('delivery');
  const [rightActiveVariantIndex, setRightActiveVariantIndex] = useState<number>(-1);
  const [previewStyleMode, setPreviewStyleMode] = useState<'card' | 'spec_modal'>('spec_modal');
  const [previewModalQuantity, setPreviewModalQuantity] = useState<number>(1);
  const [previewSelectedSpiciness, setPreviewSelectedSpiciness] = useState<string>('');
  const [previewSelectedFlavor, setPreviewSelectedFlavor] = useState<string>('');
  const [previewToastMessage, setPreviewToastMessage] = useState<string | null>(null);
  const [editBarcode, setEditBarcode] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isListeningForBarcodeScan, setIsListeningForBarcodeScan] = useState(false);

  // Quick Clone & Create Dish State
  const [cloningSourceDish, setCloningSourceDish] = useState<DishItem | null>(null);
  const [cloneDishName, setCloneDishName] = useState('');
  const [cloneDishEnName, setCloneDishEnName] = useState('');
  const [cloneDishPrice, setCloneDishPrice] = useState('58.00');
  const [cloneDishOriginalPrice, setCloneDishOriginalPrice] = useState('68.00');
  const [cloneDishPrevPrice, setCloneDishPrevPrice] = useState('62.00');
  const [cloneDishDeliveryDiscount, setCloneDishDeliveryDiscount] = useState('5.00');
  const [cloneDishDeliveryDiscountTag, setCloneDishDeliveryDiscountTag] = useState('外卖立减¥5');
  const [cloneDishDineInDiscount, setCloneDishDineInDiscount] = useState('3.00');
  const [cloneDishDineInDiscountTag, setCloneDishDineInDiscountTag] = useState('堂食立减¥3');
  const [cloneDishCategory, setCloneDishCategory] = useState<DishItem['category']>('skewers');
  const [cloneDishSubCategory, setCloneDishSubCategory] = useState<string | undefined>(undefined);
  const [cloneDishSubCategoryName, setCloneDishSubCategoryName] = useState<string | undefined>(undefined);
  const [cloneDishSpicinessLevel, setCloneDishSpicinessLevel] = useState('微辣 (推荐)');
  const [cloneDishSpicinessOptions, setCloneDishSpicinessOptions] = useState<string[]>([]);
  const [cloneDishFlavor, setCloneDishFlavor] = useState('秘制黑椒酱香');
  const [cloneDishFlavorOptions, setCloneDishFlavorOptions] = useState<string[]>([]);
  const [cloneDishFlavorTags, setCloneDishFlavorTags] = useState<string[]>([]);
  const [cloneDishCookingStyle, setCloneDishCookingStyle] = useState('炭火现烤 (果木炭慢烘)');
  const [cloneDishCraftStandardNote, setCloneDishCraftStandardNote] = useState('');
  const [cloneDishBadgeText, setCloneDishBadgeText] = useState('快速复制');
  const [cloneDishDescription, setCloneDishDescription] = useState('');
  const [cloneDishPrepTime, setCloneDishPrepTime] = useState('约8m');
  const [cloneDishImageUrl, setCloneDishImageUrl] = useState('');

  // Batch selection states
  const [selectedDishIds, setSelectedDishIds] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchActionType, setBatchActionType] = useState<
    'delivery_discount' | 'dinein_discount' | 'price_adjust' | 'spicy_flavor' | 'flavor_tags' | 'cooking_style' | 'availability'
  >('delivery_discount');

  // Real Usable QR Code States (Single Dish / Variant QR & Multi-Dish Combo QR)
  const [qrCodeDish, setQrCodeDish] = useState<DishItem | null>(null);
  const [isDishQrModalOpen, setIsDishQrModalOpen] = useState<boolean>(false);
  const [isComboQrModalOpen, setIsComboQrModalOpen] = useState<boolean>(false);
  const [batchDeliveryDiscount, setBatchDeliveryDiscount] = useState('5.00');
  const [batchDeliveryDiscountTag, setBatchDeliveryDiscountTag] = useState('外卖立减¥5');
  const [batchDineInDiscount, setBatchDineInDiscount] = useState('3.00');
  const [batchDineInDiscountTag, setBatchDineInDiscountTag] = useState('堂食立减¥3');
  const [batchPriceOffset, setBatchPriceOffset] = useState('-3.00');
  const [batchSpicinessLevel, setBatchSpicinessLevel] = useState('微辣 (推荐)');
  const [batchFlavor, setBatchFlavor] = useState('秘制黑椒酱香');
  const [batchFlavorTags, setBatchFlavorTags] = useState<string[]>([]);
  const [batchFlavorTagMode, setBatchFlavorTagMode] = useState<'append' | 'overwrite' | 'clear'>('append');
  const [batchCookingStyle, setBatchCookingStyle] = useState('炭火现烤 (果木炭慢烘)');
  const [batchAvailabilityMode, setBatchAvailabilityMode] = useState<
    'all_in_stock' | 'all_sold_out' | 'delivery_only' | 'dinein_only' | 'pickup_only'
  >('all_in_stock');

  // Layout view mode state: 'auto' (table on lg, card on mobile), 'table' (force table), 'card' (force card)
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'card'>('auto');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Advanced filter states
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [advPriceMin, setAdvPriceMin] = useState('');
  const [advPriceMax, setAdvPriceMax] = useState('');
  const [advHasVariants, setAdvHasVariants] = useState(false);
  const [advHasBarcode, setAdvHasBarcode] = useState(false);
  const [advHasDiscount, setAdvHasDiscount] = useState(false);

  // Quick Price Adjust Modal
  const [isQuickPriceModalOpen, setIsQuickPriceModalOpen] = useState(false);
  const [quickPriceMode, setQuickPriceMode] = useState<'offset' | 'fixed'>('offset');
  const [quickPriceValue, setQuickPriceValue] = useState('-3.00');

  // Thermal Label Print Preview
  const [labelPreviewDish, setLabelPreviewDish] = useState<DishItem | null>(null);

  // Interactive Parameter Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerDish, setDrawerDish] = useState<DishItem | null>(null);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'params' | 'sop' | 'pricing' | 'rules'>('params');
  const [drawerSpiciness, setDrawerSpiciness] = useState('微辣 (推荐)');
  const [drawerFlavor, setDrawerFlavor] = useState('秘制黑椒酱香');
  const [drawerTags, setDrawerTags] = useState<string[]>([]);
  const [drawerCookingStyle, setDrawerCookingStyle] = useState('炭火现烤 (果木炭慢烘)');
  const [drawerPrepTime, setDrawerPrepTime] = useState('约8m');
  const [drawerCraftNote, setDrawerCraftNote] = useState('高温果木炭慢火烘烤，双面翻烤锁住汁水，出炉撒秘制调料');
  const [drawerStation, setDrawerStation] = useState('炭火烤台');
  const [drawerPackaging, setDrawerPackaging] = useState('耐热食品级锡纸保温盒');
  const [drawerPackagingFee, setDrawerPackagingFee] = useState('1.50');
  const [drawerBarcode, setDrawerBarcode] = useState('');
  const [drawerDailyQuota, setDrawerDailyQuota] = useState('50');
  const [drawerSafetyStock, setDrawerSafetyStock] = useState('3');
  const [drawerNightCutoff, setDrawerNightCutoff] = useState('21:30');
  const [drawerDineInPrice, setDrawerDineInPrice] = useState('58.00');
  const [drawerDeliveryPrice, setDrawerDeliveryPrice] = useState('63.00');
  const [drawerMiniappPrice, setDrawerMiniappPrice] = useState('59.80');
  const [drawerDeliveryAvail, setDrawerDeliveryAvail] = useState(true);
  const [drawerDineInAvail, setDrawerDineInAvail] = useState(true);
  const [drawerPickupAvail, setDrawerPickupAvail] = useState(true);
  const [drawerAutoSoldout, setDrawerAutoSoldout] = useState(true);
  const [drawerNightLimit, setDrawerNightLimit] = useState(false);
  const [drawerPeakFuse, setDrawerPeakFuse] = useState(false);
  const [drawerNewTagInput, setDrawerNewTagInput] = useState('');

  // More menu dropdown tracking
  const [moreActionDishId, setMoreActionDishId] = useState<string | null>(null);

  // New Dish Form State
  const [newDishName, setNewDishName] = useState('');
  const [newDishEnName, setNewDishEnName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('58.00');
  const [newDishOriginalPrice, setNewDishOriginalPrice] = useState('68.00');
  const [newDishPrevPrice, setNewDishPrevPrice] = useState('62.00');
  const [newDishDeliveryDiscount, setNewDishDeliveryDiscount] = useState('5.00');
  const [newDishDeliveryDiscountTag, setNewDishDeliveryDiscountTag] = useState('外卖立减¥5');
  const [newDishDineInDiscount, setNewDishDineInDiscount] = useState('3.00');
  const [newDishDineInDiscountTag, setNewDishDineInDiscountTag] = useState('堂食立减¥3');
  const [newDishCategory, setNewDishCategory] = useState<DishItem['category']>('skewers');
  const [newDishTypeTag, setNewDishTypeTag] = useState('外卖特惠');
  const [newDishSpicinessLevel, setNewDishSpicinessLevel] = useState('微辣 (推荐)');
  const [newDishFlavor, setNewDishFlavor] = useState('秘制黑椒酱香');
  const [newDishFlavorTags, setNewDishFlavorTags] = useState<string[]>(['炙烤焦香', '鲜嫩多汁']);
  const [newDishCookingStyle, setNewDishCookingStyle] = useState('炭火现烤 (果木炭慢烘)');
  const [newDishCraftStandardNote, setNewDishCraftStandardNote] = useState('果木炭高温慢烤，外皮焦香锁住肉汁');
  const [newDishPrepTime, setNewDishPrepTime] = useState('约8m');
  const [newDishImageUrl, setNewDishImageUrl] = useState('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80');

  // Channel overrides states (persist multi-channel activation in safeStorage)
  const [channelOverrides, setChannelOverrides] = useState<Record<string, DishChannelStatus>>(() =>
    getChannelOverrides()
  );

  // Granular Toggle Single Channel for a Dish
  const toggleChannel = (dishId: string, channel: 'dineIn' | 'delivery' | 'pickup') => {
    const targetDish = dishes.find((d) => d.id === dishId);
    const initialFallback: DishChannelStatus = targetDish
      ? {
          dineIn: targetDish.available !== false,
          delivery: targetDish.available !== false,
          pickup: targetDish.available !== false
        }
      : { dineIn: true, delivery: true, pickup: true };

    const current = channelOverrides[dishId] || initialFallback;
    const updated: DishChannelStatus = { ...current, [channel]: !current[channel] };
    const hasAnyActive = updated.dineIn || updated.delivery || updated.pickup;

    setChannelOverrides((prev) => ({ ...prev, [dishId]: updated }));
    setChannelOverride(dishId, updated);

    if (targetDish && onUpdateDish) {
      onUpdateDish({
        ...targetDish,
        available: hasAnyActive
      });
    }

    const channelNameMap = {
      delivery: '外卖',
      dineIn: '堂食',
      pickup: '自提'
    };
    const channelStateStr = updated[channel] ? '已开启在售' : '已沽清下架';
    showToast(`【${targetDish?.name || '菜品'}】${channelNameMap[channel]}渠道${channelStateStr}！`);
  };

  // One-click All Channels (In-Stock / Sold-Out) for a Single Dish
  const handleSetSingleDishAllChannels = (dish: DishItem, status: boolean) => {
    const newStatus: DishChannelStatus = { dineIn: status, delivery: status, pickup: status };
    setChannelOverrides((prev) => ({
      ...prev,
      [dish.id]: newStatus
    }));
    setChannelOverride(dish.id, newStatus);
    if (onUpdateDish) {
      onUpdateDish({
        ...dish,
        available: status
      });
    }
    showToast(
      status
        ? `【${dish.name}】已一键全渠道上架在售（外卖、堂食、自提全开）！`
        : `【${dish.name}】已一键全渠道沽清（外卖、堂食、自提全关）！`
    );
  };

  // Bulk One-click In-Stock (All Channels On)
  const handleBulkAllInStock = (targets: DishItem[] = filteredDishes) => {
    const list = targets && targets.length > 0 ? targets : filteredDishes;
    if (!list || list.length === 0) {
      showToast('当前列表无菜品');
      return;
    }
    const newOverrides: Record<string, DishChannelStatus> = {};
    const targetMap = new Map(list.map((d) => [d.id, true]));
    list.forEach((d) => {
      newOverrides[d.id] = { dineIn: true, delivery: true, pickup: true };
    });
    setChannelOverrides((prev) => ({ ...prev, ...newOverrides }));
    setChannelOverridesBulk(newOverrides);

    if (onBulkUpdateDishes) {
      onBulkUpdateDishes((prev) =>
        prev.map((d) => (targetMap.has(d.id) ? { ...d, available: true } : d))
      );
    } else if (onUpdateDish) {
      list.forEach((d) => {
        onUpdateDish({ ...d, available: true });
      });
    }
    showToast(`已一键将 ${list.length} 道菜品全渠道上架在售！`);
  };

  // Bulk One-click Out-of-Stock / Sold-Out (All Channels Off)
  const handleBulkAllSoldOut = (targets: DishItem[] = filteredDishes) => {
    const list = targets && targets.length > 0 ? targets : filteredDishes;
    if (!list || list.length === 0) {
      showToast('当前列表无菜品');
      return;
    }
    const newOverrides: Record<string, DishChannelStatus> = {};
    const targetMap = new Map(list.map((d) => [d.id, true]));
    list.forEach((d) => {
      newOverrides[d.id] = { dineIn: false, delivery: false, pickup: false };
    });
    setChannelOverrides((prev) => ({ ...prev, ...newOverrides }));
    setChannelOverridesBulk(newOverrides);

    if (onBulkUpdateDishes) {
      onBulkUpdateDishes((prev) =>
        prev.map((d) => (targetMap.has(d.id) ? { ...d, available: false } : d))
      );
    } else if (onUpdateDish) {
      list.forEach((d) => {
        onUpdateDish({ ...d, available: false });
      });
    }
    showToast(`已一键将 ${list.length} 道菜品全渠道一键沽清！`);
  };

  const filteredDishes = dishes.filter((d) => {
    if (selectedCategory !== 'all' && d.category !== selectedCategory) return false;
    if (selectedSubCategory !== 'all' && d.subCategory && d.subCategory !== selectedSubCategory) return false;
    if (selectedTag !== 'all') {
      const qTag = selectedTag.toLowerCase();
      const matchTag =
        (d.flavorTags && d.flavorTags.some((t) => t.toLowerCase().includes(qTag))) ||
        (d.customTags && d.customTags.some((t) => t.toLowerCase().includes(qTag))) ||
        (d.typeTag && d.typeTag.toLowerCase().includes(qTag)) ||
        (d.badgeText && d.badgeText.toLowerCase().includes(qTag)) ||
        (d.subCategoryName && d.subCategoryName.toLowerCase().includes(qTag)) ||
        (d.flavor && d.flavor.toLowerCase().includes(qTag));
      if (!matchTag) return false;
    }
    if (statusFilter === 'available' && !d.available) return false;
    if (statusFilter === 'unavailable' && d.available) return false;
    if (cookingStyleFilter !== 'all') {
      if (!d.cookingStyle || !d.cookingStyle.includes(cookingStyleFilter)) return false;
    }
    // Advanced filters
    if (advPriceMin) {
      const min = parseFloat(advPriceMin);
      if (!isNaN(min) && d.price < min) return false;
    }
    if (advPriceMax) {
      const max = parseFloat(advPriceMax);
      if (!isNaN(max) && d.price > max) return false;
    }
    if (advHasVariants && (!d.variants || d.variants.length === 0)) return false;
    if (advHasBarcode && !d.barcode) return false;
    if (advHasDiscount && !d.deliveryDiscount && !d.dineInDiscount) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.enName.toLowerCase().includes(q) ||
        d.typeTag.toLowerCase().includes(q) ||
        (d.barcode && d.barcode.toLowerCase().includes(q)) ||
        (d.subCategoryName && d.subCategoryName.toLowerCase().includes(q)) ||
        (d.flavorTags && d.flavorTags.some((t) => t.toLowerCase().includes(q))) ||
        (d.customTags && d.customTags.some((t) => t.toLowerCase().includes(q))) ||
        (d.flavor && d.flavor.toLowerCase().includes(q)) ||
        (d.spicinessLevel && d.spicinessLevel.toLowerCase().includes(q)) ||
        (d.cookingStyle && d.cookingStyle.toLowerCase().includes(q)) ||
        (d.badgeText && d.badgeText.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Pagination calculation
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(filteredDishes.length / pageSize)) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedDishes = pageSize > 0 ? filteredDishes.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize) : filteredDishes;

  // Drawer open / close / save
  const openParamDrawer = (dish: DishItem) => {
    setDrawerDish(dish);
    setDrawerActiveTab('params');
    setDrawerSpiciness(dish.spicinessLevel || '微辣 (推荐)');
    setDrawerFlavor(dish.flavor || '秘制黑椒酱香');
    setDrawerTags(dish.flavorTags ? [...dish.flavorTags] : ['秘制黑椒', '炭火现烤']);
    setDrawerCookingStyle(dish.cookingStyle || '炭火现烤 (果木炭慢烘)');
    setDrawerPrepTime(dish.prepTime || '约8m');
    setDrawerCraftNote(dish.craftStandardNote || '高温果木炭慢火烘烤，双面翻烤锁住汁水，出炉撒秘制调料');
    setDrawerStation((dish as any).kitchenStation || '炭火烤台');
    setDrawerPackaging((dish as any).packagingType || '耐热食品级锡纸保温盒');
    setDrawerPackagingFee(((dish as any).packagingFee !== undefined ? (dish as any).packagingFee : 1.5).toString());
    setDrawerBarcode(dish.barcode || `69799880${String(dish.id).padStart(4, '0')}`);
    setDrawerDailyQuota(((dish as any).dailyStockLimit || 50).toString());
    setDrawerSafetyStock('3');
    setDrawerNightCutoff('21:30');

    const override = channelOverrides[dish.id];
    setDrawerDeliveryAvail(override ? override.delivery : dish.available);
    setDrawerDineInAvail(override ? override.dineIn : dish.available);
    setDrawerPickupAvail(override ? override.pickup : dish.available);

    const currentDineIn = dish.dineInDiscount ? dish.price - dish.dineInDiscount : dish.price;
    setDrawerDineInPrice(currentDineIn.toFixed(2));
    setDrawerDeliveryPrice(dish.price.toFixed(2));
    setDrawerMiniappPrice((dish.price * 0.95).toFixed(2));
    setDrawerAutoSoldout(true);
    setDrawerNightLimit(false);
    setDrawerPeakFuse(false);
    setDrawerNewTagInput('');
    setIsDrawerOpen(true);
  };

  const closeParamDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleSaveDrawerChanges = () => {
    if (!drawerDish) return;
    const p = parseFloat(drawerDeliveryPrice) || drawerDish.price;
    const dip = parseFloat(drawerDineInPrice) || p;
    const pkgFee = parseFloat(drawerPackagingFee) || 1.5;
    const quota = parseInt(drawerDailyQuota, 10) || 50;

    const updated: DishItem = {
      ...drawerDish,
      price: p,
      dineInDiscount: dip < p ? parseFloat((p - dip).toFixed(2)) : undefined,
      dineInDiscountTag: dip < p ? `堂食立减¥${(p - dip).toFixed(2)}` : undefined,
      spicinessLevel: drawerSpiciness,
      flavor: drawerFlavor,
      flavorTags: drawerTags,
      cookingStyle: drawerCookingStyle,
      prepTime: drawerPrepTime,
      craftStandardNote: drawerCraftNote,
      barcode: drawerBarcode,
      kitchenStation: drawerStation,
      packagingType: drawerPackaging,
      packagingFee: pkgFee,
      dailyStockLimit: quota,
      available: Boolean(drawerDeliveryAvail || drawerDineInAvail || drawerPickupAvail)
    } as any;

    const channelStatus: DishChannelStatus = {
      delivery: drawerDeliveryAvail,
      dineIn: drawerDineInAvail,
      pickup: drawerPickupAvail
    };

    // Persist channel availability overrides
    setChannelOverrides((prev) => ({
      ...prev,
      [drawerDish.id]: channelStatus
    }));
    setChannelOverride(drawerDish.id, channelStatus);

    if (onUpdateDish) {
      onUpdateDish(updated);
    }
    showToast(`【${updated.name}】参数与运营规则已成功保存并实时广播到各终端！`);
    setIsDrawerOpen(false);
  };

  // Quick Price apply
  const handleApplyQuickPrice = () => {
    if (selectedDishIds.size === 0) {
      showToast('请先勾选需要改价的菜品');
      return;
    }
    const val = parseFloat(quickPriceValue);
    if (isNaN(val)) {
      showToast('请输入有效的改价金额');
      return;
    }

    // Pre-flight franchise policy check on all selected dishes
    for (const d of filteredDishes) {
      if (!selectedDishIds.has(d.id)) continue;
      const targetPrice = quickPriceMode === 'offset'
        ? Math.max(1, parseFloat((d.price + val).toFixed(2)))
        : Math.max(1, val);
      const check = globalFranchiseEngine.validateDishPriceUpdate(d.id, d.name, targetPrice, d.price);
      if (!check.allowed) {
        showToast(check.reason || `越权拦截：【${d.name}】为总部特级管控爆品，禁止批量调价！`);
        return;
      }
    }

    let count = 0;
    filteredDishes.forEach((d) => {
      if (!selectedDishIds.has(d.id)) return;
      const newPrice = quickPriceMode === 'offset'
        ? Math.max(1, parseFloat((d.price + val).toFixed(2)))
        : Math.max(1, val);
      const updated: DishItem = {
        ...d,
        prevPrice: d.price,
        price: newPrice
      };
      if (onUpdateDish) onUpdateDish(updated);
      count++;
    });
    showToast(`已成功为 ${count} 道菜品批量调整价格！`);
    setIsQuickPriceModalOpen(false);
  };

  // Thermal Label Print simulation
  const handlePrintLabel = (dish: DishItem) => {
    try {
      playScannerBeep();
    } catch (_) {}
    if (dish.barcode) {
      navigator.clipboard?.writeText?.(dish.barcode).catch(() => {});
    }
    setLabelPreviewDish(dish);
    showToast(`[出单指令] 已向后厨热敏条码机发送【${dish.name}】条码标贴打印指令！`);
  };

  // Stock inventory adjustment
  const handleAdjustStock = (dish: DishItem) => {
    const input = window.prompt(`请输入【${dish.name}】车载冷库实物盘点库存量（份）:`, '35');
    if (input !== null) {
      const num = parseInt(input, 10);
      if (!isNaN(num)) {
        showToast(`【${dish.name}】车载冷库实物库存已校准为 ${num} 份，云端各渠道已实时更新！`);
      }
    }
  };

  // Batch toggle helper
  const handleToggleSelectAll = () => {
    if (selectedDishIds.size === filteredDishes.length) {
      setSelectedDishIds(new Set());
    } else {
      setSelectedDishIds(new Set(filteredDishes.map((d) => d.id)));
    }
  };

  const handleToggleSelectDish = (id: string) => {
    setSelectedDishIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Execute Batch Edit Action
  const handleExecuteBatchAction = () => {
    if (selectedDishIds.size === 0) {
      showToast('请先勾选需要批量修改的菜品');
      return;
    }

    const newOverrides: Record<string, { dineIn: boolean; delivery: boolean; pickup: boolean }> = {};

    filteredDishes.forEach((dish) => {
      if (!selectedDishIds.has(dish.id)) return;

      let updatedDish = { ...dish };

      if (batchActionType === 'delivery_discount') {
        const dd = parseFloat(batchDeliveryDiscount) || undefined;
        updatedDish = {
          ...updatedDish,
          deliveryDiscount: dd,
          deliveryDiscountTag: batchDeliveryDiscountTag.trim() || (dd ? `外卖立减¥${dd}` : undefined),
          discountTag: batchDeliveryDiscountTag.trim() || (dd ? `外卖立减¥${dd}` : updatedDish.discountTag)
        };
      } else if (batchActionType === 'dinein_discount') {
        const did = parseFloat(batchDineInDiscount) || undefined;
        updatedDish = {
          ...updatedDish,
          dineInDiscount: did,
          dineInDiscountTag: batchDineInDiscountTag.trim() || (did ? `堂食立减¥${did}` : undefined)
        };
      } else if (batchActionType === 'price_adjust') {
        const offset = parseFloat(batchPriceOffset) || 0;
        const newP = Math.max(1, parseFloat((dish.price + offset).toFixed(2)));
        updatedDish = {
          ...updatedDish,
          prevPrice: dish.price,
          price: newP
        };
      } else if (batchActionType === 'spicy_flavor') {
        updatedDish = {
          ...updatedDish,
          spicinessLevel: batchSpicinessLevel,
          flavor: batchFlavor
        };
      } else if (batchActionType === 'flavor_tags') {
        let finalTags = dish.flavorTags ? [...dish.flavorTags] : [];
        if (batchFlavorTagMode === 'clear') {
          finalTags = [];
        } else if (batchFlavorTagMode === 'overwrite') {
          finalTags = [...batchFlavorTags];
        } else if (batchFlavorTagMode === 'append') {
          finalTags = Array.from(new Set([...finalTags, ...batchFlavorTags]));
        }
        updatedDish = {
          ...updatedDish,
          flavorTags: finalTags
        };
      } else if (batchActionType === 'cooking_style') {
        updatedDish = {
          ...updatedDish,
          cookingStyle: batchCookingStyle
        };
      } else if (batchActionType === 'availability') {
        if (batchAvailabilityMode === 'all_in_stock') {
          updatedDish = { ...updatedDish, available: true };
          newOverrides[dish.id] = { dineIn: true, delivery: true, pickup: true };
        } else if (batchAvailabilityMode === 'all_sold_out') {
          updatedDish = { ...updatedDish, available: false };
          newOverrides[dish.id] = { dineIn: false, delivery: false, pickup: false };
        } else if (batchAvailabilityMode === 'delivery_only') {
          updatedDish = { ...updatedDish, available: true };
          newOverrides[dish.id] = { dineIn: false, delivery: true, pickup: false };
        } else if (batchAvailabilityMode === 'dinein_only') {
          updatedDish = { ...updatedDish, available: true };
          newOverrides[dish.id] = { dineIn: true, delivery: false, pickup: false };
        } else if (batchAvailabilityMode === 'pickup_only') {
          updatedDish = { ...updatedDish, available: true };
          newOverrides[dish.id] = { dineIn: false, delivery: false, pickup: true };
        }
      }

      if (onUpdateDish) {
        onUpdateDish(updatedDish);
      }
    });

    if (Object.keys(newOverrides).length > 0) {
      setChannelOverrides((prev) => ({ ...prev, ...newOverrides }));
      setChannelOverridesBulk(newOverrides);
    }

    showToast(`成功批量更新 ${selectedDishIds.size} 道菜品的参数与规则！`);
    setIsBatchModalOpen(false);
    setSelectedDishIds(new Set());
  };

  // 1. Open Parameter Configuration Modal for Single Dish
  const openEditModal = (
    dish: DishItem,
    initialTab: 'parameters' | 'flavor_tags' | 'price_discount' | 'cooking_sop' | 'image' | 'barcode' | 'preview' | 'variants' = 'parameters'
  ) => {
    setEditingDish(dish);
    setEditActiveTab(initialTab);
    setEditVariants(dish.variants && dish.variants.length > 0 ? JSON.parse(JSON.stringify(dish.variants)) : []);
    setVariantImageModalTarget(null);
    setEditImageUrl(dish.imageUrl);
    setEditPrice(dish.price.toString());
    setEditOriginalPrice(dish.originalPrice ? dish.originalPrice.toString() : '');
    setEditPrevPrice(dish.prevPrice ? dish.prevPrice.toString() : '');
    setEditDeliveryDiscount(dish.deliveryDiscount !== undefined ? dish.deliveryDiscount.toString() : '');
    setEditDeliveryDiscountTag(dish.deliveryDiscountTag || (dish.deliveryDiscount ? `外卖立减¥${dish.deliveryDiscount}` : ''));
    setEditDineInDiscount(dish.dineInDiscount !== undefined ? dish.dineInDiscount.toString() : '');
    setEditDineInDiscountTag(dish.dineInDiscountTag || (dish.dineInDiscount ? `堂食立减¥${dish.dineInDiscount}` : ''));
    
    // Spiciness, Flavor and Cooking Style
    setEditSpicinessLevel(dish.spicinessLevel || '微辣 (推荐)');
    setEditSpicinessOptions(dish.spicinessOptions && dish.spicinessOptions.length > 0 ? dish.spicinessOptions : SPICINESS_PRESETS);
    setEditFlavor(dish.flavor || '秘制黑椒酱香');
    setEditFlavorOptions(dish.flavorOptions && dish.flavorOptions.length > 0 ? dish.flavorOptions : FLAVOR_PRESETS.slice(0, 5));
    setEditFlavorTags(dish.flavorTags && dish.flavorTags.length > 0 ? dish.flavorTags : []);
    setEditCookingStyle(dish.cookingStyle || '炭火现烤 (果木炭慢烘)');
    setEditCraftStandardNote(dish.craftStandardNote || '高温果木炭慢火烘烤，双面翻烤锁住汁水，出炉撒秘制调料');
    setEditBadgeText(dish.badgeText || '');
    setEditPrepTime(dish.prepTime || '约8m');
    setEditCustomFlavorInput('');
    setEditCustomSpiceInput('');
    setEditBarcode(dish.barcode || '');
    setIsListeningForBarcodeScan(false);
    setRightPreviewChannel('delivery');
    setRightActiveVariantIndex(-1);
    setPreviewStyleMode(initialTab === 'variants' || (dish.variants && dish.variants.length > 0) ? 'spec_modal' : 'spec_modal');
    setPreviewModalQuantity(1);
    setPreviewSelectedSpiciness(dish.spicinessLevel || '微辣 (推荐)');
    setPreviewSelectedFlavor(dish.flavor || '秘制黑椒酱香');
  };

  // Hardware Barcode Scanner auto-capture inside Dish Edit Modal
  React.useEffect(() => {
    if (!editingDish || !isListeningForBarcodeScan) return;
    const unsub = globalScannerEngine.subscribe((result) => {
      setEditBarcode(result.code);
      setIsListeningForBarcodeScan(false);
      showToast(`[扫码枪] 成功录入条形码: ${result.code}`);
    });
    return () => unsub();
  }, [editingDish, isListeningForBarcodeScan]);

  // Save single dish edits
  const handleSaveEdit = () => {
    if (!editingDish) return;
    const p = parseFloat(editPrice) || editingDish.price;
    const op = editOriginalPrice ? parseFloat(editOriginalPrice) : undefined;
    const pp = editPrevPrice ? parseFloat(editPrevPrice) : undefined;
    const dd = editDeliveryDiscount ? parseFloat(editDeliveryDiscount) : undefined;
    const did = editDineInDiscount ? parseFloat(editDineInDiscount) : undefined;

    const updated: DishItem = {
      ...editingDish,
      variants: editVariants && editVariants.length > 0 ? editVariants : undefined,
      imageUrl: editImageUrl.trim() || editingDish.imageUrl,
      price: p,
      originalPrice: op,
      prevPrice: pp,
      deliveryDiscount: dd,
      deliveryDiscountTag: editDeliveryDiscountTag.trim() || (dd ? `外卖立减¥${dd}` : undefined),
      dineInDiscount: did,
      dineInDiscountTag: editDineInDiscountTag.trim() || (did ? `堂食立减¥${did}` : undefined),
      discountTag: editDeliveryDiscountTag.trim() || (dd ? `外卖立减¥${dd}` : editingDish.discountTag),
      spicinessLevel: editSpicinessLevel,
      spicinessOptions: editSpicinessOptions,
      flavor: editFlavor,
      flavorOptions: editFlavorOptions,
      flavorTags: editFlavorTags,
      cookingStyle: editCookingStyle,
      craftStandardNote: editCraftStandardNote,
      badgeText: editBadgeText.trim() || undefined,
      prepTime: editPrepTime.trim() || '约8m',
      barcode: editBarcode.trim() || undefined
    };

    if (onUpdateDish) {
      onUpdateDish(updated);
    }
    setEditingDish(null);
    showToast(`【${updated.name}】参数、主图与规则已成功同步至前台！`);
  };

  // 2. Start Quick Clone Dish
  const handleStartCloneDish = (dish: DishItem) => {
    setCloningSourceDish(dish);
    setCloneDishName(`${dish.name} (复制)`);
    setCloneDishEnName(dish.enName ? `${dish.enName} (Copy)` : 'Specialty Creation');
    setCloneDishPrice(dish.price.toString());
    setCloneDishOriginalPrice(dish.originalPrice ? dish.originalPrice.toString() : '');
    setCloneDishPrevPrice(dish.prevPrice ? dish.prevPrice.toString() : '');
    setCloneDishDeliveryDiscount(dish.deliveryDiscount !== undefined ? dish.deliveryDiscount.toString() : '');
    setCloneDishDeliveryDiscountTag(dish.deliveryDiscountTag || '');
    setCloneDishDineInDiscount(dish.dineInDiscount !== undefined ? dish.dineInDiscount.toString() : '');
    setCloneDishDineInDiscountTag(dish.dineInDiscountTag || '');
    setCloneDishCategory(dish.category);
    setCloneDishSubCategory(dish.subCategory);
    setCloneDishSubCategoryName(dish.subCategoryName);
    setCloneDishSpicinessLevel(dish.spicinessLevel || '微辣 (推荐)');
    setCloneDishSpicinessOptions(dish.spicinessOptions && dish.spicinessOptions.length > 0 ? dish.spicinessOptions : SPICINESS_PRESETS);
    setCloneDishFlavor(dish.flavor || '青花椒藤椒风味');
    setCloneDishFlavorOptions(dish.flavorOptions && dish.flavorOptions.length > 0 ? dish.flavorOptions : FLAVOR_PRESETS.slice(0, 5));
    setCloneDishFlavorTags(dish.flavorTags && dish.flavorTags.length > 0 ? dish.flavorTags : []);
    setCloneDishCookingStyle(dish.cookingStyle || '炭火现烤 (果木炭慢烘)');
    setCloneDishCraftStandardNote(dish.craftStandardNote || '高温果木炭慢火烘烤，双面翻烤锁住汁水');
    setCloneDishBadgeText('新品复制');
    setCloneDishDescription(dish.description || '主厨独家配方现制');
    setCloneDishPrepTime(dish.prepTime || '约8m');
    setCloneDishImageUrl(dish.imageUrl);
  };

  // Confirm Quick Clone Dish & Create New
  const handleConfirmCloneDish = () => {
    if (!cloningSourceDish) return;
    if (!cloneDishName.trim()) {
      showToast('请输入复制后的菜品名称');
      return;
    }

    const priceNum = parseFloat(cloneDishPrice) || cloningSourceDish.price;
    const origPriceNum = cloneDishOriginalPrice ? parseFloat(cloneDishOriginalPrice) : undefined;
    const prevPriceNum = cloneDishPrevPrice ? parseFloat(cloneDishPrevPrice) : undefined;
    const delDiscNum = cloneDishDeliveryDiscount ? parseFloat(cloneDishDeliveryDiscount) : undefined;
    const dineDiscNum = cloneDishDineInDiscount ? parseFloat(cloneDishDineInDiscount) : undefined;

    const clonedDish: Partial<DishItem> = {
      id: `dish-clone-${Date.now()}`,
      name: cloneDishName.trim(),
      enName: cloneDishEnName.trim() || 'Artisan Recipe',
      price: priceNum,
      originalPrice: origPriceNum,
      prevPrice: prevPriceNum,
      deliveryDiscount: delDiscNum,
      deliveryDiscountTag: cloneDishDeliveryDiscountTag.trim() || (delDiscNum ? `外卖立减¥${delDiscNum}` : undefined),
      dineInDiscount: dineDiscNum,
      dineInDiscountTag: cloneDishDineInDiscountTag.trim() || (dineDiscNum ? `堂食立减¥${dineDiscNum}` : undefined),
      discountTag: cloneDishDeliveryDiscountTag.trim() || (delDiscNum ? `外卖立减¥${delDiscNum}` : undefined),
      category: cloneDishCategory,
      subCategory: cloneDishSubCategory,
      subCategoryName: cloneDishSubCategoryName,
      typeTag: '新品复制',
      badgeText: cloneDishBadgeText.trim() || undefined,
      description: cloneDishDescription || cloningSourceDish.description,
      prepTime: cloneDishPrepTime || '约8m',
      imageUrl: cloneDishImageUrl || cloningSourceDish.imageUrl,
      available: true,
      orderType: cloningSourceDish.orderType || 'both',
      optionGroups: cloningSourceDish.optionGroups ? JSON.parse(JSON.stringify(cloningSourceDish.optionGroups)) : undefined,
      nutrition: cloningSourceDish.nutrition,
      originSource: cloningSourceDish.originSource,
      chefNotes: cloningSourceDish.chefNotes,
      galleryImages: cloningSourceDish.galleryImages,
      spicinessLevel: cloneDishSpicinessLevel,
      spicinessOptions: cloneDishSpicinessOptions,
      flavor: cloneDishFlavor,
      flavorOptions: cloneDishFlavorOptions,
      flavorTags: cloneDishFlavorTags,
      cookingStyle: cloneDishCookingStyle,
      craftStandardNote: cloneDishCraftStandardNote,
      isCloned: true
    };

    onAddNewDish(clonedDish);
    showToast(`已成功基于【${cloningSourceDish.name}】快速复制并新建【${cloneDishName}】！`);
    setCloningSourceDish(null);
  };

  // 3. Create Brand New Dish from Scratch
  const handleCreateDish = () => {
    if (!newDishName.trim()) {
      showToast('请输入菜品名称');
      return;
    }
    const priceNum = parseFloat(newDishPrice) || 38.0;
    const origPriceNum = newDishOriginalPrice ? parseFloat(newDishOriginalPrice) : undefined;
    const prevPriceNum = newDishPrevPrice ? parseFloat(newDishPrevPrice) : undefined;
    const delDiscNum = newDishDeliveryDiscount ? parseFloat(newDishDeliveryDiscount) : undefined;
    const dineDiscNum = newDishDineInDiscount ? parseFloat(newDishDineInDiscount) : undefined;

    onAddNewDish({
      id: `dish-new-${Date.now()}`,
      name: newDishName,
      enName: newDishEnName || 'Artisan Street Creation',
      price: priceNum,
      originalPrice: origPriceNum,
      prevPrice: prevPriceNum,
      deliveryDiscount: delDiscNum,
      deliveryDiscountTag: newDishDeliveryDiscountTag.trim() || (delDiscNum ? `外卖立减¥${delDiscNum}` : undefined),
      dineInDiscount: dineDiscNum,
      dineInDiscountTag: newDishDineInDiscountTag.trim() || (dineDiscNum ? `堂食立减¥${dineDiscNum}` : undefined),
      discountTag: newDishDeliveryDiscountTag.trim() || (delDiscNum ? `外卖立减¥${delDiscNum}` : undefined),
      category: newDishCategory,
      typeTag: newDishTypeTag,
      description: '主厨匠心手作现制，严选新鲜食材，移动厨房现场炙烤。',
      prepTime: newDishPrepTime || '约8m',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
      available: true,
      orderType: 'both',
      spicinessLevel: newDishSpicinessLevel,
      spicinessOptions: SPICINESS_PRESETS,
      flavor: newDishFlavor,
      flavorOptions: FLAVOR_PRESETS.slice(0, 5),
      flavorTags: newDishFlavorTags,
      cookingStyle: newDishCookingStyle,
      craftStandardNote: newDishCraftStandardNote
    });
    setIsAddModalOpen(false);
    setNewDishName('');
    showToast(`新品【${newDishName}】已配置参数并全渠道上架发布！`);
  };

  // Construct a preview dish for the edit modal
  const previewDish: DishItem | null = editingDish
    ? {
        ...editingDish,
        imageUrl: editImageUrl || editingDish.imageUrl,
        price: parseFloat(editPrice) || editingDish.price,
        originalPrice: editOriginalPrice ? parseFloat(editOriginalPrice) : undefined,
        prevPrice: editPrevPrice ? parseFloat(editPrevPrice) : undefined,
        deliveryDiscount: editDeliveryDiscount ? parseFloat(editDeliveryDiscount) : undefined,
        deliveryDiscountTag: editDeliveryDiscountTag.trim() || (editDeliveryDiscount ? `外卖立减¥${editDeliveryDiscount}` : undefined),
        dineInDiscount: editDineInDiscount ? parseFloat(editDineInDiscount) : undefined,
        dineInDiscountTag: editDineInDiscountTag.trim() || (editDineInDiscount ? `堂食立减¥${editDineInDiscount}` : undefined),
        spicinessLevel: editSpicinessLevel,
        flavor: editFlavor,
        flavorTags: editFlavorTags,
        cookingStyle: editCookingStyle,
        craftStandardNote: editCraftStandardNote,
        badgeText: editBadgeText,
        variants: editVariants
      }
    : null;

  // Render customer-facing Variant Selection Modal Preview ("选规格弹窗样式")
  const renderSpecModalPreview = (isFullWidth: boolean = false) => {
    if (!previewDish) return null;

    const selectedVariant =
      rightActiveVariantIndex >= 0 && editVariants[rightActiveVariantIndex]
        ? editVariants[rightActiveVariantIndex]
        : null;

    const basePrice = Number(editPrice) || previewDish.price;
    const currentPrice = selectedVariant ? selectedVariant.price : basePrice;
    const currentOrigPrice =
      selectedVariant?.originalPrice ??
      (editOriginalPrice ? Number(editOriginalPrice) : (previewDish.originalPrice || basePrice));

    const channel = rightPreviewChannel === 'compare' ? 'delivery' : rightPreviewChannel;
    const discount =
      channel === 'dine_in'
        ? (Number(editDineInDiscount) || 0)
        : (Number(editDeliveryDiscount) || 0);

    const discountTag =
      channel === 'dine_in'
        ? (editDineInDiscountTag || (editDineInDiscount ? `堂食立减¥${editDineInDiscount}` : ''))
        : (editDeliveryDiscountTag || (editDeliveryDiscount ? `外卖立减¥${editDeliveryDiscount}` : ''));

    const netPrice = Math.max(0, currentPrice - discount);
    const totalPrice = Math.max(0, netPrice * previewModalQuantity);

    const activeImage = selectedVariant?.imageUrl || editImageUrl || previewDish.imageUrl;
    const activeBadge = selectedVariant?.badgeText || selectedVariant?.imageStyle?.badgeText || editBadgeText;

    const spiceOptions = [
      '不辣 (原味)',
      '微辣 (推荐)',
      '中辣 (经典川香)',
      '重辣 (嗜辣专享)',
      '变态辣 (魔鬼椒)'
    ];

    const baseFlavorList =
      editFlavorOptions && editFlavorOptions.length > 0
        ? editFlavorOptions
        : ['秘制黑椒酱香', '金牌蒜香风味', '浓郁香辣调和', '孜然原汁原味'];

    // Ensure all flavor options are unique, avoiding duplicate keys and duplicate UI buttons
    const flavorOptions = Array.from(
      new Set([
        ...(editFlavor ? [editFlavor] : []),
        ...baseFlavorList
      ])
    ).filter(Boolean);

    return (
      <div className={`space-y-3 ${isFullWidth ? 'max-w-2xl mx-auto' : 'w-full'}`}>
        {/* Toast simulated notification */}
        {previewToastMessage && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              {previewToastMessage}
            </span>
            <button
              type="button"
              onClick={() => setPreviewToastMessage(null)}
              className="text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Phone Container */}
        <div className="bg-white rounded-none border border-neutral-300 shadow-md overflow-hidden flex flex-col">
          {/* Simulated Mobile Status Bar */}
          <div className="bg-neutral-900 text-neutral-300 px-4 py-1.5 text-[10px] flex items-center justify-between font-mono select-none">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px]">5G</span>
              <span className="w-4 h-2 border border-neutral-400 rounded-none inline-block relative p-[1px]">
                <span className="bg-emerald-400 h-full w-3/4 block rounded-none"></span>
              </span>
            </div>
          </div>

          {/* Modal Title Bar */}
          <div className="px-3.5 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-none bg-purple-600"></span>
              <span className="font-bold text-xs text-neutral-800">
                选规格与个性化定制
              </span>
              <span
                className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-none ${
                  channel === 'delivery'
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {channel === 'delivery' ? '🛵 外卖专送通道' : '🍽️ 堂食现场通道'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewStyleMode('card')}
                className="text-[10px] text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                title="切换回菜品卡片样式"
              >
                切至卡片
              </button>
              <button
                type="button"
                onClick={() => setPreviewStyleMode('card')}
                className="text-neutral-400 hover:text-black p-0.5 rounded hover:bg-neutral-200 cursor-pointer"
                title="关闭弹窗 (返回卡片)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-3.5 space-y-4 max-h-[540px] overflow-y-auto hide-scrollbar">
            {/* 1. Hero Product Card with Independent Variant Photo & Price */}
            <div className="flex gap-3 items-start pb-3 border-b border-neutral-100">
              {/* Product Photo */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-none overflow-hidden shrink-0 border border-neutral-200 bg-neutral-100 group">
                <img
                  src={activeImage}
                  alt={previewDish.name}
                  className={`w-full h-full ${getVariantFitClass(selectedVariant?.imageFit || selectedVariant?.imageStyle?.fitMode)} ${getVariantBorderClass(selectedVariant?.borderStyle || selectedVariant?.imageStyle?.borderStyle)} ${getVariantFilterClass(selectedVariant?.visualFilter || selectedVariant?.imageStyle?.filter)}`}
                />
                {activeBadge && (
                  <span
                    className="absolute top-1 left-1 px-1.5 py-0.5 rounded-none text-[9px] font-bold shadow-xs bg-purple-600 text-white border border-purple-400"
                  >
                    {activeBadge}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setPreviewZoomDish({
                      ...previewDish,
                      imageUrl: activeImage,
                      name: `${previewDish.name}${selectedVariant ? ` - ${selectedVariant.name}` : ''}`
                    })
                  }
                  className="absolute bottom-1 right-1 p-1 bg-black/60 text-white rounded text-[9px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 cursor-pointer"
                  title="查看高清大图"
                >
                  <ZoomIn className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Product Info & Price Showcase */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 leading-tight">
                    {previewDish.name}
                    {selectedVariant && (
                      <span className="text-purple-700 font-semibold text-xs ml-1.5 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        {selectedVariant.name}
                      </span>
                    )}
                  </h4>
                  {previewDish.enName && (
                    <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                      {previewDish.enName}
                    </p>
                  )}
                </div>

                {/* Pricing & Discounts */}
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-red-600">¥</span>
                  <span className="text-xl font-black font-mono text-red-600">
                    {netPrice.toFixed(2)}
                  </span>
                  {currentOrigPrice > netPrice && (
                    <span className="text-xs text-neutral-400 line-through font-mono">
                      ¥{currentOrigPrice.toFixed(2)}
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded">
                      {discountTag || `立减¥${discount}`}
                    </span>
                  )}
                </div>

                {/* Selected Attributes Summary */}
                <div className="text-[10.5px] text-neutral-500 flex items-center gap-1.5 flex-wrap">
                  <span>已选:</span>
                  <span className="text-neutral-800 font-medium">
                    {selectedVariant ? selectedVariant.name : '标准默认规格'}
                  </span>
                  <span>·</span>
                  <span className="text-neutral-800 font-medium">
                    {previewSelectedSpiciness || editSpicinessLevel}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-neutral-500 pt-0.5">
                  <span className="flex items-center gap-0.5 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-2.5 h-2.5" /> 现点现烤
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {editPrepTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Variant Image Strip (if multiple variants have photos) */}
            {editVariants.some((v) => v.imageUrl) && (
              <div className="space-y-1.5">
                <div className="text-[10.5px] font-bold text-neutral-600 flex items-center justify-between">
                  <span>📸 独立规格实拍效果快速预览:</span>
                  <span className="text-[9.5px] text-purple-600">点击小图同步选中</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
                  {/* Base standard thumbnail */}
                  <div
                    onClick={() => setRightActiveVariantIndex(-1)}
                    className={`shrink-0 w-14 h-14 rounded border p-0.5 cursor-pointer transition-all text-center ${
                      rightActiveVariantIndex === -1
                        ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-neutral-200 bg-neutral-50 hover:border-neutral-400'
                    }`}
                  >
                    <img
                      src={editImageUrl || previewDish.imageUrl}
                      alt="标准"
                      className="w-full h-8 object-cover rounded"
                    />
                    <div className="text-[8.5px] font-bold truncate mt-0.5 text-neutral-700">标准</div>
                  </div>

                  {editVariants.map((v, vIdx) => (
                    <div
                      key={`variant-thumb-${isFullWidth ? 'full' : 'drawer'}-${v.id || vIdx}-${vIdx}`}
                      onClick={() => setRightActiveVariantIndex(vIdx)}
                      className={`shrink-0 w-14 h-14 rounded border p-0.5 cursor-pointer transition-all text-center ${
                        rightActiveVariantIndex === vIdx
                          ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-200'
                          : 'border-neutral-200 bg-neutral-50 hover:border-neutral-400'
                      }`}
                    >
                      <img
                        src={v.imageUrl || editImageUrl || previewDish.imageUrl}
                        alt={v.name}
                        className={`w-full h-8 object-cover rounded ${getVariantFitClass(v.imageFit || v.imageStyle?.fitMode)} ${getVariantFilterClass(v.visualFilter || v.imageStyle?.filter)}`}
                      />
                      <div className="text-[8.5px] font-bold truncate mt-0.5 text-neutral-700">{v.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. SPECIFICATION / VARIANT SELECTION (规格变体选择) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span>份量与规格选择</span>
                  <span className="text-[10px] text-neutral-400 font-normal">(必选一项)</span>
                </span>
                <span className="text-[10px] text-purple-700 font-medium">
                  {editVariants.length > 0 ? `共 ${editVariants.length + 1} 种规格可选` : '基础规格'}
                </span>
              </div>

              {/* Variant Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* Standard / Base Variant Button */}
                <button
                  type="button"
                  onClick={() => setRightActiveVariantIndex(-1)}
                  className={`p-2 rounded-none border text-left cursor-pointer transition-all flex flex-col justify-between relative ${
                    rightActiveVariantIndex === -1
                      ? 'border-purple-600 bg-purple-50/70 shadow-xs ring-1 ring-purple-400'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-bold text-xs text-neutral-900 leading-tight">
                      标准标配
                    </span>
                    {rightActiveVariantIndex === -1 && (
                      <span className="w-3.5 h-3.5 rounded-none bg-purple-600 text-white flex items-center justify-center text-[9px] shrink-0 font-mono">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between text-[10px]">
                    <span className="text-neutral-500">常规单份</span>
                    <span className="font-mono font-bold text-red-600">
                      ¥{basePrice.toFixed(2)}
                    </span>
                  </div>
                </button>

                {/* Custom Configured Variants */}
                {editVariants.map((variant, idx) => {
                  const isSelected = rightActiveVariantIndex === idx;
                  return (
                    <button
                      key={`variant-btn-${isFullWidth ? 'full' : 'drawer'}-${variant.id || idx}-${idx}`}
                      type="button"
                      onClick={() => setRightActiveVariantIndex(idx)}
                      className={`p-2 rounded-none border text-left cursor-pointer transition-all flex flex-col justify-between relative ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/70 shadow-xs ring-1 ring-purple-400'
                          : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-xs text-neutral-900 leading-tight truncate">
                          {variant.name}
                        </span>
                        {isSelected ? (
                          <span className="w-3.5 h-3.5 rounded-none bg-purple-600 text-white flex items-center justify-center text-[9px] shrink-0 font-mono">
                            ✓
                          </span>
                        ) : variant.isDefault ? (
                          <span className="text-[8.5px] bg-amber-100 text-amber-800 font-bold px-1 rounded-none">
                            推荐
                          </span>
                        ) : null}
                      </div>

                      {(variant.badgeText || variant.imageStyle?.badgeText) && (
                        <div className="my-0.5">
                          <span className="text-[8.5px] bg-purple-100 text-purple-800 px-1 py-0.2 rounded-none font-medium truncate max-w-full inline-block">
                            {variant.badgeText || variant.imageStyle?.badgeText}
                          </span>
                        </div>
                      )}

                      <div className="mt-1 flex items-baseline justify-between text-[10px]">
                        <span className="text-neutral-500 truncate text-[9px]">
                          {variant.imageUrl ? '📷 独立实拍' : '主图'}
                        </span>
                        <span className="font-mono font-bold text-red-600">
                          ¥{variant.price.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* No variants hint */}
              {editVariants.length === 0 && (
                <div className="p-2 bg-purple-50/50 rounded border border-dashed border-purple-200 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-600">
                    💡 当前菜品尚未添加副规格（如大份/双拼/升级套餐等）
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditActiveTab('variants')}
                    className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-0.5 cursor-pointer underline text-[10.5px]"
                  >
                    <span>+ 前往配置规格</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. SPICINESS PREFERENCE (辣度定制) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  <span>辣度偏好定制</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  当前: {previewSelectedSpiciness || editSpicinessLevel}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {spiceOptions.map((opt, sIdx) => {
                  const isCurrent = (previewSelectedSpiciness || editSpicinessLevel) === opt;
                  return (
                    <button
                      key={`spice-${isFullWidth ? 'full' : 'drawer'}-${opt}-${sIdx}`}
                      type="button"
                      onClick={() => {
                        setPreviewSelectedSpiciness(opt);
                        setEditSpicinessLevel(opt);
                      }}
                      className={`px-2.5 py-1.5 rounded text-[11px] font-medium border text-center cursor-pointer transition-all flex items-center justify-center gap-1 ${
                        isCurrent
                          ? 'border-red-500 bg-red-50 text-red-700 font-bold shadow-2xs'
                          : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {isCurrent && <Check className="w-3 h-3 text-red-600" />}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. FLAVOR / CONDIMENT PREFERENCE (风味定制) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-amber-600" />
                  <span>酱料与口味定制</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  当前: {previewSelectedFlavor || editFlavor}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 gap-1.5">
                {flavorOptions.map((fOpt, fIdx) => {
                  const isCurrent = (previewSelectedFlavor || editFlavor) === fOpt;
                  return (
                    <button
                      key={`flavor-${isFullWidth ? 'full' : 'drawer'}-${fOpt}-${fIdx}`}
                      type="button"
                      onClick={() => {
                        setPreviewSelectedFlavor(fOpt);
                        setEditFlavor(fOpt);
                      }}
                      className={`px-2.5 py-1.5 rounded text-[11px] font-medium border text-center cursor-pointer transition-all flex items-center justify-center gap-1 ${
                        isCurrent
                          ? 'border-amber-600 bg-amber-50 text-amber-800 font-bold shadow-2xs'
                          : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {isCurrent && <Check className="w-3 h-3 text-amber-700" />}
                      <span className="truncate">{fOpt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. CRAFT STANDARD & FLAVOR TAGS */}
            <div className="p-2.5 bg-neutral-50 rounded-none border border-neutral-200 space-y-1.5 text-[10.5px]">
              <div className="flex items-center justify-between text-neutral-700 font-medium">
                <span className="flex items-center gap-1">
                  <ChefHat className="w-3 h-3 text-emerald-700" />
                  <span>工艺与出品标准:</span>
                </span>
                <span className="text-emerald-800 font-bold">{editCookingStyle}</span>
              </div>
              {editCraftStandardNote && (
                <p className="text-neutral-500 leading-relaxed pl-4">
                  {editCraftStandardNote}
                </p>
              )}
              {editFlavorTags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap pt-1 pl-4">
                  {editFlavorTags.map((tag, tIdx) => (
                    <span
                      key={`tag-${isFullWidth ? 'full' : 'drawer'}-${tag}-${tIdx}`}
                      className="bg-amber-100/70 text-amber-900 px-1.5 py-0.5 rounded-none text-[9.5px] font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 6. QUANTITY STEPPER (购买数量步进器) */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-neutral-800">选购数量</div>
                <div className="text-[10px] text-neutral-400">单笔订购上限 99 份</div>
              </div>

              <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-none border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setPreviewModalQuantity((prev) => Math.max(1, prev - 1))}
                  className="w-7 h-7 rounded-none bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 shadow-2xs cursor-pointer active:scale-95 transition-all"
                  title="减少"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-mono font-bold text-sm text-neutral-900">
                  {previewModalQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewModalQuantity((prev) => Math.min(99, prev + 1))}
                  className="w-7 h-7 rounded-none bg-white hover:bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 shadow-2xs cursor-pointer active:scale-95 transition-all"
                  title="增加"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Modal Bottom Action Bar (吸底加购栏) */}
          <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-neutral-500 font-medium">合计:</span>
                <span className="text-xs font-bold text-red-600">¥</span>
                <span className="text-lg font-black font-mono text-red-600">
                  {totalPrice.toFixed(2)}
                </span>
                {currentOrigPrice > netPrice && (
                  <span className="text-[10.5px] text-neutral-400 line-through font-mono">
                    ¥{(currentOrigPrice * previewModalQuantity).toFixed(2)}
                  </span>
                )}
              </div>
              <div className="text-[9.5px] text-neutral-500 truncate">
                {discount > 0 ? (
                  <span className="text-emerald-700 font-medium">
                    已享{channel === 'delivery' ? '外卖' : '堂食'}立减 ¥{(discount * previewModalQuantity).toFixed(2)}
                  </span>
                ) : (
                  <span>含选定规格及调味定制</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const specName = selectedVariant ? selectedVariant.name : '标准标配';
                setPreviewToastMessage(`✨ 模拟加购成功：${previewDish.name} (${specName}) × ${previewModalQuantity} 份 已加入${channel === 'delivery' ? '外卖单' : '堂食单'}`);
                setTimeout(() => setPreviewToastMessage(null), 3000);
              }}
              className={`px-4 py-2.5 rounded-none font-bold text-xs text-white shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 ${
                channel === 'delivery'
                  ? 'bg-sky-600 hover:bg-sky-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>
                {channel === 'delivery'
                  ? `加入外卖单 (${editPrepTime})`
                  : `确认堂食加点`}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const categoriesList = [
    { id: 'all', name: '全部', count: dishes.length },
    { id: 'yakitori', name: '日式烧鸟', count: dishes.filter((d) => d.category === 'yakitori').length },
    { id: 'baked', name: '芝士焗类', count: dishes.filter((d) => d.category === 'baked').length },
    { id: 'skewers', name: '炭烤串串', count: dishes.filter((d) => d.category === 'skewers').length },
    { id: 'western', name: '精致西餐', count: dishes.filter((d) => d.category === 'western').length },
    { id: 'mains', name: '主食简餐', count: dishes.filter((d) => d.category === 'mains').length },
    { id: 'drinks', name: '特调冷萃', count: dishes.filter((d) => d.category === 'drinks').length },
    { id: 'desserts', name: '手作甜品', count: dishes.filter((d) => d.category === 'desserts').length },
    { id: 'snacks', name: '风味小吃', count: dishes.filter((d) => d.category === 'snacks').length }
  ];

  const cookingStylesList = [
    '炭火现烤',
    '烤箱焗烤',
    '原汁纯手作',
    '冷萃冰滴',
    '低卡轻食'
  ];

  return (
    <div
      id="merchant-menu-channel-container"
      className="min-h-screen bg-page-bg font-body-md text-text-prominent antialiased pb-24 sm:pb-16"
    >
      {/* 1. Console Top Deck + Metrics Deck + Filter Deck（Industrial Precision Console） */}
      <MerchantMenuHeaderDeck
        dishes={dishes}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isSyncingCloud={isSyncingCloud}
        onSyncAllDishesToCloud={handleSyncAllDishesToCloud}
        onRematchImages={handleRematchAllImages}
        channelOverrides={channelOverrides}
        selectedDishIds={selectedDishIds}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={() => setSelectedDishIds(new Set())}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        categories={categoriesList}
        selectedCategory={selectedCategory}
        setSelectedCategory={(cat) => {
          setSelectedCategory(cat);
          setCurrentPage(1);
        }}
        searchQuery={searchQuery}
        setSearchQuery={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        setStatusFilter={(s) => {
          setStatusFilter(s);
          setCurrentPage(1);
        }}
        cookingStyleFilter={cookingStyleFilter}
        setCookingStyleFilter={(s) => {
          setCookingStyleFilter(s);
          setCurrentPage(1);
        }}
        cookingStyles={cookingStylesList}
        isAdvancedFilterOpen={isAdvancedFilterOpen}
        setIsAdvancedFilterOpen={setIsAdvancedFilterOpen}
        advPriceMin={advPriceMin}
        setAdvPriceMin={setAdvPriceMin}
        advPriceMax={advPriceMax}
        setAdvPriceMax={setAdvPriceMax}
        advHasVariants={advHasVariants}
        setAdvHasVariants={setAdvHasVariants}
        advHasBarcode={advHasBarcode}
        setAdvHasBarcode={setAdvHasBarcode}
        advHasDiscount={advHasDiscount}
        setAdvHasDiscount={setAdvHasDiscount}
        onResetAllFilters={() => {
          setAdvPriceMin('');
          setAdvPriceMax('');
          setAdvHasVariants(false);
          setAdvHasBarcode(false);
          setAdvHasDiscount(false);
          setCurrentPage(1);
        }}
        onOpenQuickPriceModal={() => setIsQuickPriceModalOpen(true)}
        onBulkAllInStock={() => {
          const targets =
            selectedDishIds.size > 0
              ? dishes.filter((d) => selectedDishIds.has(d.id))
              : filteredDishes;
          handleBulkAllInStock(targets);
        }}
        onBulkAllSoldOut={() => {
          const targets =
            selectedDishIds.size > 0
              ? dishes.filter((d) => selectedDishIds.has(d.id))
              : filteredDishes;
          handleBulkAllSoldOut(targets);
        }}
        onOpenBatchModal={() => setIsBatchModalOpen(true)}
        onOpenComboQrModal={() => setIsComboQrModalOpen(true)}
      />

      {/* 2+3. DISH TOPOLOGY MATRIX：高密度表格 / 卡片拓扑 + 页脚遥测与分页（一体化硬边界容器） */}
      <div className="px-space-sm sm:px-space-md lg:px-space-lg pb-space-sm sm:pb-space-md lg:pb-space-lg">
        <div className="bg-card-bg rounded-console border border-border-main overflow-hidden">
          <MerchantDishListView
        pagedDishes={pagedDishes}
        filteredDishesCount={filteredDishes.length}
        viewMode={viewMode}
        selectedDishIds={selectedDishIds}
        channelOverrides={channelOverrides}
        moreActionDishId={moreActionDishId}
        onToggleSelectDish={handleToggleSelectDish}
        onToggleSelectAll={handleToggleSelectAll}
        onToggleChannel={toggleChannel}
        onSetSingleDishAllChannels={handleSetSingleDishAllChannels}
        onPrintLabel={handlePrintLabel}
        onOpenEditModal={openEditModal}
        onOpenDrawer={openParamDrawer}
        onOpenUploadModal={(dish) => setUploadModalDish(dish)}
        onPreviewZoom={(dish) => setPreviewZoomDish(dish)}
        onOpenQrCode={(dish) => {
          setQrCodeDish(dish);
          setIsDishQrModalOpen(true);
        }}
        onQuickPrice={(dish) => {
          const policy = globalFranchiseEngine.getPolicy(dish.id);
          const ctx = globalFranchiseEngine.getContext();
          if (policy?.isHqLocked && !ctx.isHqUser && !policy.allowFranchiseePriceOverride) {
            showToast(`越权拦截：【${dish.name}】为总部特级核心爆品，全国统一定价，禁止加盟商改价！`);
            return;
          }
          setSelectedDishIds(new Set([dish.id]));
          setQuickPriceMode('fixed');
          setQuickPriceValue(dish.price.toFixed(2));
          setIsQuickPriceModalOpen(true);
        }}
        onCloneDish={handleStartCloneDish}
        setMoreActionDishId={setMoreActionDishId}
        onResetFilters={() => {
          setSelectedCategory('all');
          setStatusFilter('all');
          setCookingStyleFilter('all');
          setSearchQuery('');
          setAdvPriceMin('');
          setAdvPriceMax('');
          setAdvHasVariants(false);
          setAdvHasBarcode(false);
          setAdvHasDiscount(false);
          setCurrentPage(1);
        }}
      />

          {/* 3. 页脚遥测条与战术分页器 */}
          <MerchantMenuPagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredDishes.length}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* 4. 战术批量操作 HUD 浮层（仅在存在选中项时吸附底部） */}
      <ConsoleBatchRibbon
        selectedDishes={dishes.filter((d) => selectedDishIds.has(d.id))}
        onOpenQuickPriceModal={() => setIsQuickPriceModalOpen(true)}
        onBulkAllInStock={() =>
          handleBulkAllInStock(
            selectedDishIds.size > 0 ? dishes.filter((d) => selectedDishIds.has(d.id)) : filteredDishes
          )
        }
        onBulkAllSoldOut={() =>
          handleBulkAllSoldOut(
            selectedDishIds.size > 0 ? dishes.filter((d) => selectedDishIds.has(d.id)) : filteredDishes
          )
        }
        onClearSelection={() => setSelectedDishIds(new Set())}
      />

      {/* Modal 1: 单品参数与运营规则配置弹窗 (Urban Radar Redesigned Modal) */}
      {editingDish && (
        <DishParameterRulesModal
          dish={editingDish}
          initialTab={editActiveTab as any}
          onClose={() => setEditingDish(null)}
          onSave={(updatedDish) => {
            if (typeof updatedDish.available === 'boolean') {
              const status: DishChannelStatus = {
                delivery: updatedDish.available,
                dineIn: updatedDish.available,
                pickup: updatedDish.available
              };
              setChannelOverrides((prev) => ({ ...prev, [updatedDish.id]: status }));
              setChannelOverride(updatedDish.id, status);
            }
            if (onUpdateDish) {
              onUpdateDish(updatedDish);
            }
            setEditingDish(null);
            showToast(`【${updatedDish.name}】参数、主图与运营规则已成功同步至前台！`);
          }}
          showToast={showToast}
          onPreviewZoom={(dish) => setPreviewZoomDish(dish)}
          onOpenUploadModal={(dish) => setUploadModalDish(dish)}
        />
      )}

      {/* Modal 2: 快速复制并新建菜品弹窗 (Quick Clone & Create Modal) */}
      {cloningSourceDish && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-xl rounded-[4px] border border-[#d3d1cb] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[94vh] flex flex-col">
            {/* Header */}
            <div className="p-3.5 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-sm text-[#37352f]">
                  基于【{cloningSourceDish.name}】快速复制并新建商品
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCloningSourceDish(null)}
                className="text-[#787774] hover:text-black cursor-pointer p-1 rounded hover:bg-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Source Overview Banner */}
            <div className="p-3 bg-purple-50/60 border-b border-purple-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded overflow-hidden shrink-0 border border-purple-200 bg-[#eeeeec]">
                  <img
                    src={cloningSourceDish.imageUrl}
                    alt={cloningSourceDish.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-bold text-xs text-purple-950">
                    原版商品: {cloningSourceDish.name} (¥{cloningSourceDish.price.toFixed(2)})
                  </div>
                  <div className="text-[10px] text-purple-700">
                    已自动克隆原始规格配料、图片素材与工艺参数，您可直接微调后立即新建。
                  </div>
                </div>
              </div>

              <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold shrink-0">
                1秒极速建档
              </span>
            </div>

            {/* Clone Form Body */}
            <div className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1 hide-scrollbar">
              {/* New Dish Name with Suffix Fast Buttons */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#5a5854] block">新菜品名称 *:</label>
                <input
                  type="text"
                  value={cloneDishName}
                  onChange={(e) => setCloneDishName(e.target.value)}
                  placeholder="如: 炭烤和牛小汉堡 (藤椒新口味)"
                  className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none focus:border-[#37352f] font-bold text-[#37352f]"
                />

                {/* Quick Suffix Fill Buttons */}
                <div className="flex items-center gap-1 flex-wrap text-[10.5px]">
                  <span className="text-[#787774]">快捷后缀:</span>
                  {[
                    '(藤椒风味)',
                    '(秘制微辣)',
                    '(大份升级版)',
                    '(炭烤微炸)',
                    '(二号配方)',
                    '(手作新口味)'
                  ].map((suf) => (
                    <button
                      key={suf}
                      type="button"
                      onClick={() => setCloneDishName(`${cloningSourceDish.name} ${suf}`)}
                      className="px-1.5 py-0.5 bg-[#f1f1ef] hover:bg-purple-100 hover:text-purple-900 rounded text-[10px] border border-[#d3d1cb] cursor-pointer transition-colors"
                    >
                      {suf}
                    </button>
                  ))}
                </div>
              </div>

              {/* English Name */}
              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">英文名称:</label>
                <input
                  type="text"
                  value={cloneDishEnName}
                  onChange={(e) => setCloneDishEnName(e.target.value)}
                  placeholder="e.g. Charred Wagyu Slider (Green Peppercorn)"
                  className="w-full p-1.5 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none"
                />
              </div>

              {/* Price & Category Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-semibold text-[#5a5854] block mb-1">售价 (¥) *:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cloneDishPrice}
                    onChange={(e) => setCloneDishPrice(e.target.value)}
                    className="w-full p-1.5 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#5a5854] block mb-1">原价 (¥):</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="选填"
                    value={cloneDishOriginalPrice}
                    onChange={(e) => setCloneDishOriginalPrice(e.target.value)}
                    className="w-full p-1.5 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#5a5854] block mb-1">类目:</label>
                  <select
                    value={cloneDishCategory}
                    onChange={(e) => setCloneDishCategory(e.target.value as any)}
                    className="w-full p-1.5 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none"
                  >
                    <option value="yakitori">🍢 日式烧鸟</option>
                    <option value="baked">🧀 芝士焗类</option>
                    <option value="skewers">🍢 炭烤串串</option>
                    <option value="western">🥩 精致西餐</option>
                    <option value="mains">🍜 主食简餐</option>
                    <option value="drinks">🥤 特调冷萃</option>
                    <option value="snacks">🧆 风味小吃</option>
                    <option value="desserts">🍰 手作甜品</option>
                  </select>
                </div>
              </div>

              {/* Specified Parameters Tuning for the Cloned Dish */}
              <div className="p-3 bg-[#f7f7f5] rounded-[3px] border border-[#e6e6e4] space-y-2.5">
                <div className="font-bold text-[#37352f] flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  <span>指定参数快速定制 (Spiciness, Flavor & Cooking Style)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold text-neutral-600 block mb-1">默认辣度:</label>
                    <select
                      value={cloneDishSpicinessLevel}
                      onChange={(e) => setCloneDishSpicinessLevel(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs focus:outline-none"
                    >
                      {SPICINESS_PRESETS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-600 block mb-1">默认口味风格:</label>
                    <select
                      value={cloneDishFlavor}
                      onChange={(e) => setCloneDishFlavor(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs focus:outline-none"
                    >
                      {FLAVOR_PRESETS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-600 block mb-1">制作风格:</label>
                    <select
                      value={cloneDishCookingStyle}
                      onChange={(e) => setCloneDishCookingStyle(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs focus:outline-none"
                    >
                      {COOKING_STYLE_PRESETS.map((cs) => (
                        <option key={cs} value={cs}>{cs}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-neutral-600 block mb-1">工艺说明与SOP要点:</label>
                  <input
                    type="text"
                    value={cloneDishCraftStandardNote}
                    onChange={(e) => setCloneDishCraftStandardNote(e.target.value)}
                    placeholder="如: 高温荔枝木炭翻烤，出炉撒秘制青花椒藤椒料"
                    className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs"
                  />
                </div>

                {/* Flavor Tags Configuration for Cloned Dish */}
                <div className="pt-1">
                  <FlavorTagSelector
                    selectedTags={cloneDishFlavorTags}
                    onChange={setCloneDishFlavorTags}
                    title="复制菜品风味标签设定"
                    description="可继承原菜品标签，或进行多选修改与自定义添加"
                    compact={true}
                  />
                </div>
              </div>

              {/* Takeout & Dine In Discounts */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 bg-sky-50/70 border border-sky-200 rounded space-y-1">
                  <span className="font-bold text-sky-900 block text-[11px]">外卖立减配置</span>
                  <input
                    type="number"
                    placeholder="立减额 如 5.0"
                    value={cloneDishDeliveryDiscount}
                    onChange={(e) => setCloneDishDeliveryDiscount(e.target.value)}
                    className="w-full p-1 bg-white border border-sky-300 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="标签 如 外卖立减¥5"
                    value={cloneDishDeliveryDiscountTag}
                    onChange={(e) => setCloneDishDeliveryDiscountTag(e.target.value)}
                    className="w-full p-1 bg-white border border-sky-300 rounded text-xs"
                  />
                </div>

                <div className="p-2 bg-amber-50/70 border border-amber-200 rounded space-y-1">
                  <span className="font-bold text-amber-900 block text-[11px]">堂食立减配置</span>
                  <input
                    type="number"
                    placeholder="立减额 如 3.0"
                    value={cloneDishDineInDiscount}
                    onChange={(e) => setCloneDishDineInDiscount(e.target.value)}
                    className="w-full p-1 bg-white border border-amber-300 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="标签 如 堂食立减¥3"
                    value={cloneDishDineInDiscountTag}
                    onChange={(e) => setCloneDishDineInDiscountTag(e.target.value)}
                    className="w-full p-1 bg-white border border-amber-300 rounded text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCloningSourceDish(null)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmCloneDish}
                className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-[3px] font-bold cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>确认创建并立即上架</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: 新增菜品弹窗 (Add New Dish Modal) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-lg rounded-[4px] border border-[#d3d1cb] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="p-3.5 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#2b593f]" />
                <span className="font-bold text-sm text-[#37352f]">新建菜品与参数配置</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#787774] hover:text-black cursor-pointer p-1 rounded hover:bg-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1 hide-scrollbar">
              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">菜品名称 *:</label>
                <input
                  type="text"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  placeholder="如: 炭烤黑椒安格斯牛舌"
                  className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none focus:border-[#37352f]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#5a5854] block">英文名称 (选填):</label>
                <input
                  type="text"
                  value={newDishEnName}
                  onChange={(e) => setNewDishEnName(e.target.value)}
                  placeholder="e.g. Charred Angus Beef Tongue"
                  className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#5a5854] block">分类:</label>
                  <select
                    value={newDishCategory}
                    onChange={(e) => setNewDishCategory(e.target.value as any)}
                    className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none"
                  >
                    <option value="yakitori">🍢 日式烧鸟</option>
                    <option value="baked">🧀 芝士焗类</option>
                    <option value="skewers">🍢 炭烤串串</option>
                    <option value="western">🥩 精致西餐</option>
                    <option value="mains">🍜 主食简餐</option>
                    <option value="drinks">🥤 特调冷萃</option>
                    <option value="snacks">🧆 风味小吃</option>
                    <option value="desserts">🍰 手作甜品</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#5a5854] block">售价 (¥) *:</label>
                  <input
                    type="number"
                    value={newDishPrice}
                    onChange={(e) => setNewDishPrice(e.target.value)}
                    className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#5a5854] block">原价 (¥):</label>
                  <input
                    type="number"
                    placeholder="选填"
                    value={newDishOriginalPrice}
                    onChange={(e) => setNewDishOriginalPrice(e.target.value)}
                    className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Specified Parameters Settings */}
              <div className="p-3 bg-[#f7f7f5] rounded-[3px] border border-[#e6e6e4] space-y-2.5">
                <div className="font-bold text-[#37352f] flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  <span>指定参数预设 (辣度、口味与制作风格)</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold text-neutral-600 block mb-1">默认辣度:</label>
                    <select
                      value={newDishSpicinessLevel}
                      onChange={(e) => setNewDishSpicinessLevel(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs"
                    >
                      {SPICINESS_PRESETS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-600 block mb-1">默认口味风格:</label>
                    <select
                      value={newDishFlavor}
                      onChange={(e) => setNewDishFlavor(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs"
                    >
                      {FLAVOR_PRESETS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-600 block mb-1">制作风格:</label>
                    <select
                      value={newDishCookingStyle}
                      onChange={(e) => setNewDishCookingStyle(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs"
                    >
                      {COOKING_STYLE_PRESETS.map((cs) => (
                        <option key={cs} value={cs}>{cs}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-neutral-600 block mb-1">制作工艺与SOP说明:</label>
                  <input
                    type="text"
                    value={newDishCraftStandardNote}
                    onChange={(e) => setNewDishCraftStandardNote(e.target.value)}
                    placeholder="如: 果木炭高温慢烤，外皮焦香锁住肉汁"
                    className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs"
                  />
                </div>

                {/* Flavor Tags Selector for New Dish */}
                <div className="pt-1">
                  <FlavorTagSelector
                    selectedTags={newDishFlavorTags}
                    onChange={setNewDishFlavorTags}
                    title="新品风味标签设定"
                    description="多选预设风味标签或自定义输入新增"
                    compact={true}
                  />
                </div>
              </div>

              {/* Takeout & Dine In Discount Inputs */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#e6e6e4]">
                <div className="p-2 bg-sky-50/70 border border-sky-200 rounded space-y-1.5">
                  <span className="font-bold text-sky-900 block">外卖立减配置</span>
                  <input
                    type="number"
                    placeholder="立减额 如 5.0"
                    value={newDishDeliveryDiscount}
                    onChange={(e) => setNewDishDeliveryDiscount(e.target.value)}
                    className="w-full p-1 bg-white border border-sky-300 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="标签 如 外卖立减¥5"
                    value={newDishDeliveryDiscountTag}
                    onChange={(e) => setNewDishDeliveryDiscountTag(e.target.value)}
                    className="w-full p-1 bg-white border border-sky-300 rounded text-xs"
                  />
                </div>

                <div className="p-2 bg-amber-50/70 border border-amber-200 rounded space-y-1.5">
                  <span className="font-bold text-amber-900 block">堂食立减配置</span>
                  <input
                    type="number"
                    placeholder="立减额 如 3.0"
                    value={newDishDineInDiscount}
                    onChange={(e) => setNewDishDineInDiscount(e.target.value)}
                    className="w-full p-1 bg-white border border-amber-300 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="标签 如 堂食立减¥3"
                    value={newDishDineInDiscountTag}
                    onChange={(e) => setNewDishDineInDiscountTag(e.target.value)}
                    className="w-full p-1 bg-white border border-amber-300 rounded text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateDish}
                className="px-4 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-semibold cursor-pointer shadow-2xs"
              >
                立即发布上架
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: 批量配置弹窗 (Batch Actions Modal) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-lg rounded-[4px] border border-[#d3d1cb] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#2b593f]" />
                <span className="font-bold text-sm text-[#37352f]">
                  批量修改菜品参数与优惠规则 ({selectedDishIds.size} 道已选)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="text-[#787774] hover:text-black cursor-pointer p-1 rounded hover:bg-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-[#5a5854] block">选择批量执行的操作类型:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'delivery_discount', label: '外卖专享立减' },
                    { id: 'dinein_discount', label: '堂食专享立减' },
                    { id: 'spicy_flavor', label: '🌶️ 辣度口味统一' },
                    { id: 'flavor_tags', label: '🏷️ 批量风味标签' },
                    { id: 'cooking_style', label: '🍳 制作风格统一' },
                    { id: 'price_adjust', label: '统一调价 (¥)' },
                    { id: 'availability', label: '批量在售/沽清' }
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setBatchActionType(act.id as any)}
                      className={`p-2 rounded-[3px] font-semibold border text-center transition-all cursor-pointer ${
                        batchActionType === act.id
                          ? 'bg-[#37352f] text-white border-[#37352f]'
                          : 'bg-[#f7f7f5] text-[#37352f] border-[#d3d1cb] hover:bg-[#ebebe9]'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Action Fields */}
              {batchActionType === 'flavor_tags' && (
                <div className="p-3 bg-amber-50/60 rounded border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950">批量风味标签操作模式:</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: 'append', label: '➕ 追加标签' },
                        { id: 'overwrite', label: '🔄 覆盖全部' },
                        { id: 'clear', label: '🗑️ 一键清空' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setBatchFlavorTagMode(m.id as any)}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer transition-all ${
                            batchFlavorTagMode === m.id
                              ? 'bg-amber-800 text-white border-amber-900 shadow-2xs'
                              : 'bg-white text-neutral-800 border-neutral-300 hover:bg-amber-100/50'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {batchFlavorTagMode !== 'clear' && (
                    <FlavorTagSelector
                      selectedTags={batchFlavorTags}
                      onChange={setBatchFlavorTags}
                      title="选择要批量应用的标签"
                      description={
                        batchFlavorTagMode === 'append'
                          ? '选中的标签将追加合并至所有勾选菜品中（不影响已有其他标签）'
                          : '选中的标签将完全覆盖替换勾选菜品原有的全部标签'
                      }
                      compact={true}
                    />
                  )}

                  {batchFlavorTagMode === 'clear' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>⚠️ 执行后将清空所选 {selectedDishIds.size} 道菜品的全部风味标签。</span>
                    </div>
                  )}
                </div>
              )}
              {batchActionType === 'spicy_flavor' && (
                <div className="p-3 bg-red-50/60 rounded border border-red-200 space-y-2.5">
                  <span className="font-bold text-red-950 block">统一配置辣度与口味:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-neutral-600 block mb-1">默认辣度:</label>
                      <select
                        value={batchSpicinessLevel}
                        onChange={(e) => setBatchSpicinessLevel(e.target.value)}
                        className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs"
                      >
                        {SPICINESS_PRESETS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-neutral-600 block mb-1">默认口味:</label>
                      <select
                        value={batchFlavor}
                        onChange={(e) => setBatchFlavor(e.target.value)}
                        className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs"
                      >
                        {FLAVOR_PRESETS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {batchActionType === 'cooking_style' && (
                <div className="p-3 bg-emerald-50/60 rounded border border-emerald-200 space-y-2.5">
                  <span className="font-bold text-emerald-950 block">统一配置制作风格:</span>
                  <select
                    value={batchCookingStyle}
                    onChange={(e) => setBatchCookingStyle(e.target.value)}
                    className="w-full p-2 bg-white border border-emerald-300 rounded text-xs font-semibold"
                  >
                    {COOKING_STYLE_PRESETS.map((cs) => (
                      <option key={cs} value={cs}>{cs}</option>
                    ))}
                  </select>
                </div>
              )}

              {batchActionType === 'delivery_discount' && (
                <div className="p-3 bg-sky-50/60 rounded border border-sky-200 space-y-2">
                  <span className="font-bold text-sky-900 block">批量外卖立减:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="立减额 如 5.0"
                      value={batchDeliveryDiscount}
                      onChange={(e) => setBatchDeliveryDiscount(e.target.value)}
                      className="w-full p-1.5 bg-white border border-sky-300 rounded text-xs"
                    />
                    <input
                      type="text"
                      placeholder="展示标签 如 外卖立减¥5"
                      value={batchDeliveryDiscountTag}
                      onChange={(e) => setBatchDeliveryDiscountTag(e.target.value)}
                      className="w-full p-1.5 bg-white border border-sky-300 rounded text-xs"
                    />
                  </div>
                </div>
              )}

              {batchActionType === 'dinein_discount' && (
                <div className="p-3 bg-amber-50/60 rounded border border-amber-200 space-y-2">
                  <span className="font-bold text-amber-900 block">批量堂食立减:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="立减额 如 3.0"
                      value={batchDineInDiscount}
                      onChange={(e) => setBatchDineInDiscount(e.target.value)}
                      className="w-full p-1.5 bg-white border border-amber-300 rounded text-xs"
                    />
                    <input
                      type="text"
                      placeholder="展示标签 如 堂食立减¥3"
                      value={batchDineInDiscountTag}
                      onChange={(e) => setBatchDineInDiscountTag(e.target.value)}
                      className="w-full p-1.5 bg-white border border-amber-300 rounded text-xs"
                    />
                  </div>
                </div>
              )}

              {batchActionType === 'price_adjust' && (
                <div className="p-3 bg-[#f7f7f5] rounded border border-[#d3d1cb] space-y-2">
                  <span className="font-bold text-[#37352f] block">调整所有勾选菜品售价:</span>
                  <input
                    type="number"
                    placeholder="如 -3.00 (直降3元) 或 5.00 (涨价5元)"
                    value={batchPriceOffset}
                    onChange={(e) => setBatchPriceOffset(e.target.value)}
                    className="w-full p-1.5 bg-white border border-[#d3d1cb] rounded text-xs font-mono font-bold"
                  />
                </div>
              )}

              {batchActionType === 'availability' && (
                <div className="p-3 bg-[#f7f7f5] rounded border border-[#d3d1cb] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#37352f] block">批量上下架与渠道售卖设置:</span>
                    <span className="text-[10px] text-neutral-500 font-medium">已选择 {selectedDishIds.size} 道菜品</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      {
                        mode: 'all_in_stock',
                        title: '⚡ 一键全渠道在售',
                        desc: '外卖、堂食、自提全部开启在售',
                        activeClass: 'bg-emerald-700 text-white border-emerald-800'
                      },
                      {
                        mode: 'all_sold_out',
                        title: '🚫 一键全渠道沽清',
                        desc: '外卖、堂食、自提全部设为已沽清',
                        activeClass: 'bg-red-700 text-white border-red-800'
                      },
                      {
                        mode: 'delivery_only',
                        title: '🛵 仅开通【外卖】在售',
                        desc: '仅外卖渠道在售，堂食/自提沽清',
                        activeClass: 'bg-sky-700 text-white border-sky-800'
                      },
                      {
                        mode: 'dinein_only',
                        title: '🍽️ 仅开通【堂食】在售',
                        desc: '仅堂食渠道在售，外卖/自提沽清',
                        activeClass: 'bg-amber-700 text-white border-amber-800'
                      },
                      {
                        mode: 'pickup_only',
                        title: '🛍️ 仅开通【自提】在售',
                        desc: '仅自提渠道在售，外卖/堂食沽清',
                        activeClass: 'bg-purple-700 text-white border-purple-800'
                      }
                    ].map((item) => (
                      <button
                        key={item.mode}
                        type="button"
                        onClick={() => setBatchAvailabilityMode(item.mode as any)}
                        className={`p-2.5 rounded-[3px] border text-left cursor-pointer transition-all ${
                          batchAvailabilityMode === item.mode
                            ? `${item.activeClass} shadow-xs font-bold`
                            : 'bg-white text-neutral-700 border-[#d3d1cb] hover:bg-neutral-50'
                        }`}
                      >
                        <div className="text-xs font-bold">{item.title}</div>
                        <div className={`text-[10px] mt-0.5 ${batchAvailabilityMode === item.mode ? 'text-white/80' : 'text-neutral-500'}`}>
                          {item.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchAction}
                className="px-4 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-bold cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>立即应用批量修改</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dish Image Fullscreen Zoom & Lightbox Modal */}
      <DishImagePreviewModal
        dish={previewZoomDish}
        dishes={filteredDishes}
        isOpen={Boolean(previewZoomDish)}
        onClose={() => setPreviewZoomDish(null)}
        onSelectDish={(d) => setPreviewZoomDish(d)}
        onEditDish={(d) => openEditModal(d)}
        onUpdateDish={onUpdateDish}
        onToggleAvailability={(dishId) => {
          onToggleAvailability(dishId);
          const target = dishes.find((d) => d.id === dishId);
          const nextAvail = target ? !target.available : true;
          const status: DishChannelStatus = {
            delivery: nextAvail,
            dineIn: nextAvail,
            pickup: nextAvail
          };
          setChannelOverrides((prev) => ({ ...prev, [dishId]: status }));
          setChannelOverride(dishId, status);
        }}
        showToast={showToast}
      />

      {/* Upload/Replace Dish Image Modal */}
      {uploadModalDish && (
        <DishImageUploadModal
          dish={uploadModalDish}
          isOpen={Boolean(uploadModalDish)}
          onClose={() => setUploadModalDish(null)}
          onConfirmUrl={(newUrl) => {
            const updated: DishItem = {
              ...uploadModalDish,
              imageUrl: newUrl
            };
            if (onUpdateDish) {
              onUpdateDish(updated);
            }
            if (editingDish && editingDish.id === uploadModalDish.id) {
              setEditImageUrl(newUrl);
            }
            setUploadModalDish(null);
            showToast(`【${uploadModalDish.name}】菜品主图已更新成功！`);
          }}
        />
      )}

      {/* Upload/Replace Variant Image Modal */}
      {variantImageModalTarget && editingDish && (
        <DishImageUploadModal
          dish={editingDish}
          customTitle={`为变体【${variantImageModalTarget.currentVariant.name}】设置独立图片`}
          customSubtitle="支持本地重传、URL替换或从海量精选食谱图库中挑选专属实物效果"
          initialImageUrl={variantImageModalTarget.currentVariant.imageUrl || editImageUrl || editingDish.imageUrl}
          isOpen={true}
          onClose={() => setVariantImageModalTarget(null)}
          onConfirmUrl={(newUrl) => {
            const idx = variantImageModalTarget.variantIndex;
            setEditVariants((prev) => {
              const copy = [...prev];
              if (copy[idx]) {
                copy[idx] = { ...copy[idx], imageUrl: newUrl };
              }
              return copy;
            });
            setVariantImageModalTarget(null);
            showToast(`变体【${variantImageModalTarget.currentVariant.name}】独立图片样式已更新！`);
          }}
        />
      )}

      {/* Cloudbase Sync Modal */}
      <CloudbaseStatusModal
        isOpen={isCloudbaseModalOpen}
        onClose={() => setIsCloudbaseModalOpen(false)}
        dishes={dishes}
        orders={[]}
        onDishesUpdated={(updatedDishes) => {
          // If updated from cloud, dishes can be reloaded
        }}
        isConnected={true}
      />

      {/* BEGIN: Mobile Bottom Status Bar（已迁移至 Industrial Precision Console 令牌集） */}
      <aside className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-dark-container text-white px-3 py-1.5 flex items-center justify-between gap-2 border-t border-dark-container-border shadow-console-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-signal-live animate-pulse" />
          <span className="font-label-micro uppercase">网关已连通</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsQuickPriceModalOpen(true)}
            className="px-2 py-1 border border-white/25 text-white font-label-micro uppercase rounded-console hover:bg-white/10 transition-colors cursor-pointer"
          >
            批量改价
          </button>
          <button
            type="button"
            onClick={() => handleBulkAllInStock(dishes)}
            className="px-2 py-1 bg-status-olive border border-transparent text-white font-label-micro uppercase font-bold rounded-console hover:opacity-90 transition-colors cursor-pointer"
          >
            一键全通售
          </button>
        </div>
      </aside>
      {/* END: Mobile Bottom Status Bar */}

      {/* BEGIN: InteractiveParameterDrawer */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 transition-opacity"
          id="drawer-backdrop"
          onClick={closeParamDrawer}
        />
      )}
      <aside
        id="param-drawer"
        className={`fixed inset-y-0 right-0 max-w-lg w-full bg-[#F9F9F7] z-50 border-l border-[#D3D1CB] shadow-2xl flex flex-col transform transition-transform duration-200 ease-in-out font-sans rounded-none ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 bg-[#1A1A17] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-400 font-bold tracking-wider uppercase">
                PARAMETER DECK
              </span>
              <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.2 rounded-none">
                SKU: {drawerDish?.barcode || '697998800019'}
              </span>
            </div>
            <h3 className="text-base font-black truncate max-w-[280px]" id="drawer-title">
              {drawerDish?.name || '菜品参数与全渠道运营规则'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {drawerDish && (
              <button
                type="button"
                onClick={() => {
                  closeParamDrawer();
                  openEditModal(drawerDish, 'parameters');
                }}
                className="px-2 py-1 text-xs bg-purple-900/60 border border-purple-400 text-purple-200 hover:bg-purple-800 font-mono rounded-none cursor-pointer"
                title="打开全量 9 维度高级向导"
              >
                全量向导 ↗
              </button>
            )}
            <button
              type="button"
              className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-none cursor-pointer"
              onClick={closeParamDrawer}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Sub-navigation Tabs */}
        <div className="flex border-b border-[#D3D1CB] bg-white text-xs font-mono shrink-0 overflow-x-auto">
          {[
            { id: 'params', label: '1. 工艺与味型' },
            { id: 'pricing', label: '2. 全渠道定价' },
            { id: 'sop', label: '3. 后厨SOP包装' },
            { id: 'rules', label: '4. 自动沽清联锁' }
          ].map((tab) => {
            const isActive = drawerActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDrawerActiveTab(tab.id as any)}
                className={`px-3 py-2.5 font-bold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                  isActive
                    ? 'border-[#1A1A17] text-[#1A1A17] bg-[#FAF9F5]'
                    : 'border-transparent text-neutral-500 hover:text-[#1A1A17] hover:bg-neutral-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Drawer Body */}
        <div className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden flex-1 space-y-5 text-xs text-neutral-800 min-w-0">
          {/* Dish Meta Card */}
          <div className="border border-[#D3D1CB] p-3 bg-white space-y-1.5 rounded-none min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-neutral-500 uppercase font-bold">
                当前调控对象 (SKU SPEC)
              </span>
              <span className="text-[10px] font-mono font-bold bg-neutral-100 text-neutral-700 px-1.5 py-0.5 border border-[#D3D1CB]">
                类目: {drawerDish?.category || '炭烤串串'}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-base font-black text-[#1A1A17] truncate">
                  {drawerDish?.name}
                </div>
                <div className="text-neutral-500 font-mono text-[11px] truncate">
                  {drawerDish?.enName || 'ARTISANAL DISH SPECIFICATION'}
                </div>
              </div>
              <div className="text-right font-mono shrink-0">
                <div className="text-base font-extrabold text-[#1A1A17]">
                  ¥{parseFloat(drawerDeliveryPrice || '0').toFixed(2)}
                </div>
                <div className="text-[10px] text-neutral-400">外卖基准售价</div>
              </div>
            </div>
          </div>

          {/* TAB 1: 基础工艺味型 */}
          {drawerActiveTab === 'params' && (
            <div className="space-y-4 animate-in fade-in duration-100 min-w-0">
              {/* 1.1 辣度等级锁定 */}
              <div className="space-y-2 min-w-0">
                <label className="font-bold text-xs uppercase tracking-wider block text-neutral-700">
                  1.1 辣度等级与出餐工艺锁定
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-center min-w-0">
                  {[
                    { label: '不辣 (0/5)', val: '不辣 (原味)' },
                    { label: '微辣 (1/5)', val: '微辣 (推荐)' },
                    { label: '中辣 (3/5)', val: '中辣 (经典川香)' },
                    { label: '重辣 (5/5)', val: '重辣 (嗜辣专享)' }
                  ].map((sp) => {
                    const active = drawerSpiciness.includes(sp.label.slice(0, 2));
                    return (
                      <button
                        key={sp.label}
                        type="button"
                        onClick={() => setDrawerSpiciness(sp.val)}
                        className={`py-2 px-1 border text-xs font-mono transition-colors rounded-none cursor-pointer min-w-0 truncate ${
                          active
                            ? 'border-red-500 bg-red-50 text-red-700 font-bold shadow-xs'
                            : 'border-[#D3D1CB] bg-white hover:bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {sp.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1.2 出餐主工艺风格 */}
              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-neutral-700">
                  1.2 出餐制作主工艺风格
                </label>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-center">
                  {[
                    '炭火现烤 (果木炭慢烘)',
                    '鲜炸酥脆 (定温控油)',
                    '果木烟熏 (秘法腌熏)',
                    '鲜煲慢煨 (原汤炖制)',
                    '冷萃原酿 (低温冰滴)',
                    '低卡轻食 (水润清鲜)'
                  ].map((craft) => {
                    const active = drawerCookingStyle.includes(craft.slice(0, 4));
                    return (
                      <button
                        key={craft}
                        type="button"
                        onClick={() => setDrawerCookingStyle(craft)}
                        className={`py-1.5 px-2 border text-[11px] truncate font-mono transition-colors rounded-none cursor-pointer ${
                          active
                            ? 'border-[#1A1A17] bg-[#1A1A17] text-white font-bold'
                            : 'border-[#D3D1CB] bg-white hover:bg-neutral-100 text-neutral-700'
                        }`}
                        title={craft}
                      >
                        {craft.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1.3 味型与特调酱汁 */}
              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-neutral-700">
                  1.3 核心风味与调制基底
                </label>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-center">
                  {[
                    '秘制黑椒酱香',
                    '日式照烧浓郁',
                    '经典海盐原汁',
                    '川味香辣孜然',
                    '蒜香金汤金蒜',
                    '意式黑松露香'
                  ].map((flv) => {
                    const active = drawerFlavor.includes(flv.slice(0, 4));
                    return (
                      <button
                        key={flv}
                        type="button"
                        onClick={() => setDrawerFlavor(flv)}
                        className={`py-1.5 px-2 border text-[11px] truncate font-mono transition-colors rounded-none cursor-pointer ${
                          active
                            ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold'
                            : 'border-[#D3D1CB] bg-white hover:bg-neutral-100 text-neutral-700'
                        }`}
                        title={flv}
                      >
                        {flv}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1.4 风味与用料特征标签池 */}
              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-neutral-700">
                  1.4 风味与食材特征标签池
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {drawerTags.map((tag, idx) => (
                    <span
                      key={`drawer-tag-${idx}`}
                      className="px-2 py-1 bg-neutral-200 text-neutral-800 font-mono flex items-center gap-1 rounded-none text-xs"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => setDrawerTags((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-neutral-500 hover:text-black ml-0.5 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="新标签..."
                      value={drawerNewTagInput}
                      onChange={(e) => setDrawerNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && drawerNewTagInput.trim()) {
                          e.preventDefault();
                          setDrawerTags((prev) => [...prev, drawerNewTagInput.trim()]);
                          setDrawerNewTagInput('');
                        }
                      }}
                      className="w-20 px-1.5 py-1 border border-dashed border-neutral-400 text-xs font-mono rounded-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (drawerNewTagInput.trim()) {
                          setDrawerTags((prev) => [...prev, drawerNewTagInput.trim()]);
                          setDrawerNewTagInput('');
                        }
                      }}
                      className="px-2 py-1 border border-dashed border-neutral-400 text-neutral-600 font-mono rounded-none hover:bg-neutral-100 cursor-pointer"
                    >
                      + 增添
                    </button>
                  </div>
                </div>

                {/* Quick Add Suggestions */}
                <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-mono pt-1">
                  <span>推荐:</span>
                  {['炙烤焦香', '鲜嫩多汁', '原切和牛', '解腻清爽'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        if (!drawerTags.includes(sug)) {
                          setDrawerTags((prev) => [...prev, sug]);
                        }
                      }}
                      className="hover:text-[#1A1A17] underline cursor-pointer"
                    >
                      +{sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1.5 条码与出餐热敏标贴 */}
              <div className="space-y-2 border-t border-[#D3D1CB] pt-3">
                <label className="font-bold text-xs uppercase tracking-wider block text-neutral-700">
                  1.5 条码与出单热敏标贴
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={drawerBarcode}
                    onChange={(e) => setDrawerBarcode(e.target.value)}
                    placeholder="条形码/EAN-13"
                    className="flex-1 px-2.5 py-1.5 border border-[#D3D1CB] bg-white font-mono text-xs rounded-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDrawerBarcode(`697${Math.floor(100000000 + Math.random() * 900000000)}`)
                    }
                    className="px-2.5 py-1.5 border border-[#D3D1CB] bg-white hover:bg-neutral-100 font-mono text-xs rounded-none cursor-pointer whitespace-nowrap"
                  >
                    随机换码
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (drawerDish) {
                        handlePrintLabel(drawerDish);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-[#1A1A17] text-white hover:bg-black font-mono text-xs rounded-none cursor-pointer whitespace-nowrap flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>打标贴</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 全渠道差异定价 */}
          {drawerActiveTab === 'pricing' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900 font-mono">
                💡 平台支持按渠道独立定价与差异化营销策略，保存后实时同步至各端口 POS、外卖聚合器与小程序。
              </div>

              <div className="space-y-3 font-mono">
                {/* DineIn Price */}
                <div className="p-3 bg-white border border-[#D3D1CB] space-y-1 rounded-none">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-800">堂食终端价格 (POS)</span>
                    <div className="flex items-center gap-1">
                      <span className="text-neutral-500">¥</span>
                      <input
                        type="number"
                        step="0.1"
                        value={drawerDineInPrice}
                        onChange={(e) => setDrawerDineInPrice(e.target.value)}
                        className="w-24 text-right py-1 px-2 border border-neutral-300 text-xs rounded-none font-bold"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    适用于车载吧台触控屏与店内直接点单
                  </div>
                </div>

                {/* Delivery Base Price */}
                <div className="p-3 bg-white border border-[#D3D1CB] space-y-1 rounded-none">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-800">外卖平台基准价 (美团/饿了么)</span>
                    <div className="flex items-center gap-1">
                      <span className="text-neutral-500">¥</span>
                      <input
                        type="number"
                        step="0.1"
                        value={drawerDeliveryPrice}
                        onChange={(e) => setDrawerDeliveryPrice(e.target.value)}
                        className="w-24 text-right py-1 px-2 border border-neutral-300 text-xs rounded-none font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500">
                      较堂食价浮动:{' '}
                      <strong
                        className={
                          parseFloat(drawerDeliveryPrice) > parseFloat(drawerDineInPrice)
                            ? 'text-red-700'
                            : 'text-neutral-700'
                        }
                      >
                        {parseFloat(drawerDeliveryPrice) >= parseFloat(drawerDineInPrice)
                          ? `+¥${(
                              parseFloat(drawerDeliveryPrice || '0') -
                              parseFloat(drawerDineInPrice || '0')
                            ).toFixed(2)}`
                          : `-¥${(
                              parseFloat(drawerDineInPrice || '0') -
                              parseFloat(drawerDeliveryPrice || '0')
                            ).toFixed(2)}`}
                      </strong>
                    </span>
                    <span className="text-neutral-500">建议溢价覆盖平台扣点</span>
                  </div>
                </div>

                {/* Miniapp Private Domain Price */}
                <div className="p-3 bg-white border border-[#D3D1CB] space-y-1 rounded-none">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-800">小程序私域专享价</span>
                    <div className="flex items-center gap-1">
                      <span className="text-neutral-500">¥</span>
                      <input
                        type="number"
                        step="0.1"
                        value={drawerMiniappPrice}
                        onChange={(e) => setDrawerMiniappPrice(e.target.value)}
                        className="w-24 text-right py-1 px-2 border border-neutral-300 text-xs rounded-none font-bold text-emerald-800"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    支持私域会员积分抵扣上限 10%
                  </div>
                </div>

                {/* Packaging Fee */}
                <div className="p-3 bg-white border border-[#D3D1CB] space-y-1 rounded-none">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-800">外卖配送餐盒打包费</span>
                    <div className="flex items-center gap-1">
                      <span className="text-neutral-500">¥</span>
                      <input
                        type="number"
                        step="0.5"
                        value={drawerPackagingFee}
                        onChange={(e) => setDrawerPackagingFee(e.target.value)}
                        className="w-24 text-right py-1 px-2 border border-neutral-300 text-xs rounded-none font-bold"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    外卖通道每份独立计收，堂食及打包自提免费
                  </div>
                </div>
              </div>

              {/* Fast Price Sync Toolset */}
              <div className="p-3 bg-neutral-100 border border-[#D3D1CB] space-y-2">
                <span className="font-bold text-neutral-700 block font-mono text-[11px]">
                  快捷比例定价助手:
                </span>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-center">
                  <button
                    type="button"
                    onClick={() => {
                      const base = parseFloat(drawerDineInPrice) || 50;
                      setDrawerDeliveryPrice((base * 1.1).toFixed(2));
                    }}
                    className="py-1.5 px-2 border border-[#D3D1CB] bg-white hover:bg-neutral-50 text-xs rounded-none cursor-pointer"
                  >
                    外卖 +10%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = parseFloat(drawerDineInPrice) || 50;
                      setDrawerMiniappPrice((base * 0.95).toFixed(2));
                    }}
                    className="py-1.5 px-2 border border-[#D3D1CB] bg-white hover:bg-neutral-50 text-xs rounded-none cursor-pointer"
                  >
                    私域 -5%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = drawerDineInPrice;
                      setDrawerDeliveryPrice(base);
                      setDrawerMiniappPrice(base);
                    }}
                    className="py-1.5 px-2 border border-[#D3D1CB] bg-white hover:bg-neutral-50 text-xs rounded-none cursor-pointer"
                  >
                    全渠道统一定价
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 后厨SOP与包装 */}
          {drawerActiveTab === 'sop' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* 3.1 出餐耗时步进 */}
              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-neutral-700">
                  3.1 预计基础出餐时间
                </label>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-center">
                  {['约5m', '约8m', '约12m', '约15m'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDrawerPrepTime(t)}
                      className={`py-2 border text-xs font-mono transition-colors rounded-none cursor-pointer ${
                        drawerPrepTime === t
                          ? 'border-[#1A1A17] bg-[#1A1A17] text-white font-bold'
                          : 'border-[#D3D1CB] bg-white hover:bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3.2 生产工位分派 */}
              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-neutral-700">
                  3.2 车载后厨生产工位分派
                </label>
                <div className="grid grid-cols-2 gap-1.5 font-mono">
                  {['炭火烤台', '炸炉工位', '冷萃吧台', '主食切配台'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setDrawerStation(st)}
                      className={`py-2 px-3 border text-xs font-mono text-left transition-colors rounded-none cursor-pointer ${
                        drawerStation === st
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-[#D3D1CB] bg-white hover:bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3.3 工艺标准与后厨SOP备忘 */}
              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-neutral-700">
                  3.3 烹饪工艺标准与操作要领
                </label>
                <textarea
                  rows={3}
                  value={drawerCraftNote}
                  onChange={(e) => setDrawerCraftNote(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D3D1CB] text-xs font-sans rounded-none focus:outline-none focus:border-[#1A1A17]"
                  placeholder="请输入后厨操作要领..."
                />
              </div>

              {/* 3.4 专用包材与包装规范 */}
              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-neutral-700">
                  3.4 外卖出餐保温包材规范
                </label>
                <select
                  value={drawerPackaging}
                  onChange={(e) => setDrawerPackaging(e.target.value)}
                  className="w-full p-2 bg-white border border-[#D3D1CB] text-xs font-mono rounded-none focus:outline-none"
                >
                  <option value="耐热食品级锡纸保温盒">耐热食品级锡纸保温盒 (推荐)</option>
                  <option value="防油加厚牛皮纸袋">防油加厚牛皮纸袋 (干香烤物)</option>
                  <option value="双层真空恒温气柱袋">双层真空恒温气柱袋 (长途保鲜)</option>
                  <option value="可降解甘蔗浆防漏餐盒">可降解甘蔗浆防漏餐盒 (汤品)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 4: 自动沽清与联锁 */}
          {drawerActiveTab === 'rules' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* 4.1 全渠道实时在售开关 */}
              <div className="space-y-2">
                <label className="font-bold text-xs uppercase tracking-wider block text-neutral-700">
                  4.1 各渠道实时供售通断
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDrawerDeliveryAvail(!drawerDeliveryAvail)}
                    className={`p-3 border text-center font-mono rounded-none cursor-pointer transition-colors ${
                      drawerDeliveryAvail
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-[#BA1A1A] bg-red-50 text-[#BA1A1A]'
                    }`}
                  >
                    <div className="font-bold">外卖专送</div>
                    <div className="text-[11px] mt-1">
                      {drawerDeliveryAvail ? '● 在售供应' : '× 已沽清'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDrawerDineInAvail(!drawerDineInAvail)}
                    className={`p-3 border text-center font-mono rounded-none cursor-pointer transition-colors ${
                      drawerDineInAvail
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-[#BA1A1A] bg-red-50 text-[#BA1A1A]'
                    }`}
                  >
                    <div className="font-bold">车载堂食</div>
                    <div className="text-[11px] mt-1">
                      {drawerDineInAvail ? '● 在售供应' : '× 已沽清'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDrawerPickupAvail(!drawerPickupAvail)}
                    className={`p-3 border text-center font-mono rounded-none cursor-pointer transition-colors ${
                      drawerPickupAvail
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-[#BA1A1A] bg-red-50 text-[#BA1A1A]'
                    }`}
                  >
                    <div className="font-bold">预约自提</div>
                    <div className="text-[11px] mt-1">
                      {drawerPickupAvail ? '● 在售供应' : '× 已沽清'}
                    </div>
                  </button>
                </div>
              </div>

              {/* 4.2 智能库存联锁与自动下架规则 */}
              <div className="space-y-3 font-mono">
                <label className="font-bold text-xs uppercase tracking-wider block text-neutral-700">
                  4.2 自动沽清联锁与防超卖熔断
                </label>

                {/* Rule 1: Safety Stock Interlock */}
                <div className="p-3 bg-white border border-[#D3D1CB] space-y-2 rounded-none">
                  <label className="flex items-center gap-2 text-xs cursor-pointer select-none font-bold">
                    <input
                      type="checkbox"
                      checked={drawerAutoSoldout}
                      onChange={(e) => setDrawerAutoSoldout(e.target.checked)}
                      className="w-4 h-4 border-neutral-400 text-[#1A1A17] focus:ring-0 rounded-none cursor-pointer"
                    />
                    <span>车载冷库安全库存自动熔断</span>
                  </label>
                  <div className="flex items-center gap-2 pl-6 text-[11px] text-neutral-600">
                    <span>当车载原料盘点存量 &lt;</span>
                    <input
                      type="number"
                      value={drawerSafetyStock}
                      onChange={(e) => setDrawerSafetyStock(e.target.value)}
                      className="w-16 px-1.5 py-0.5 border border-neutral-300 text-center text-xs font-bold rounded-none"
                    />
                    <span>份时，外卖通道自动转为沽清</span>
                  </div>
                </div>

                {/* Rule 2: Night Time Cutoff */}
                <div className="p-3 bg-white border border-[#D3D1CB] space-y-2 rounded-none">
                  <label className="flex items-center gap-2 text-xs cursor-pointer select-none font-bold">
                    <input
                      type="checkbox"
                      checked={drawerNightLimit}
                      onChange={(e) => setDrawerNightLimit(e.target.checked)}
                      className="w-4 h-4 border-neutral-400 text-[#1A1A17] focus:ring-0 rounded-none cursor-pointer"
                    />
                    <span>晚市定时自动下架防过载</span>
                  </label>
                  <div className="flex items-center gap-2 pl-6 text-[11px] text-neutral-600">
                    <span>每天到达</span>
                    <input
                      type="text"
                      value={drawerNightCutoff}
                      onChange={(e) => setDrawerNightCutoff(e.target.value)}
                      className="w-20 px-1.5 py-0.5 border border-neutral-300 text-center text-xs font-bold rounded-none"
                    />
                    <span>后自动下架现做繁复类菜品</span>
                  </div>
                </div>

                {/* Rule 3: Daily Quota */}
                <div className="p-3 bg-white border border-[#D3D1CB] space-y-2 rounded-none">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-800">每日限量供应配额</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={drawerDailyQuota}
                        onChange={(e) => setDrawerDailyQuota(e.target.value)}
                        className="w-20 px-2 py-0.5 border border-neutral-300 text-right text-xs font-bold rounded-none"
                      />
                      <span className="text-neutral-500">份/天</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    达到当日出单配额上限后，全渠道自动显示售罄
                  </div>
                </div>

                {/* Rule 4: Peak KDS Overflow Fuse */}
                <div className="p-3 bg-white border border-[#D3D1CB] space-y-2 rounded-none">
                  <label className="flex items-center gap-2 text-xs cursor-pointer select-none font-bold">
                    <input
                      type="checkbox"
                      checked={drawerPeakFuse}
                      onChange={(e) => setDrawerPeakFuse(e.target.checked)}
                      className="w-4 h-4 border-neutral-400 text-[#1A1A17] focus:ring-0 rounded-none cursor-pointer"
                    />
                    <span>后厨挂单积压时动态延长外卖配送用时预估</span>
                  </label>
                  <div className="text-[11px] text-neutral-500 pl-6">
                    当车载烤台积压超过 8 单时，前台预计送达自动 +15 分钟
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#D3D1CB] bg-white flex items-center justify-between shrink-0 font-mono">
          <div className="text-[11px] text-neutral-500 hidden sm:block">
            已编辑: {drawerDish?.name}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-4 py-2 border border-[#D3D1CB] text-neutral-700 hover:bg-neutral-100 font-mono text-xs rounded-none cursor-pointer"
              onClick={closeParamDrawer}
            >
              取消退出
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-[#1A1A17] text-white hover:bg-black font-mono text-xs font-bold rounded-none cursor-pointer shadow-xs flex items-center gap-1.5"
              onClick={handleSaveDrawerChanges}
            >
              <Check className="w-3.5 h-3.5" />
              <span>保存并实时广播生效</span>
            </button>
          </div>
        </div>
      </aside>
      {/* END: InteractiveParameterDrawer */}

      {/* 右侧内嵌折叠式多账号操作记录对比与版本恢复审计抽屉 */}
      <AccountAuditDrawer
        currentModule="dishes"
        showToast={showToast}
        onRestoreSuccess={() => {
          showToast('菜品数据已恢复至历史版本！');
        }}
      />

      {/* 真实可用菜品/规格二维码弹窗（单点/直接支付/加购） */}
      <DishQrCodeModal
        isOpen={isDishQrModalOpen}
        onClose={() => {
          setIsDishQrModalOpen(false);
          setQrCodeDish(null);
        }}
        dish={qrCodeDish}
        showToast={showToast}
      />

      {/* 真实可用商家套餐组合二维码生成弹窗（扫单码多点/批量加购/组合直付） */}
      <ComboQrGeneratorModal
        isOpen={isComboQrModalOpen}
        onClose={() => setIsComboQrModalOpen(false)}
        dishes={dishes}
        showToast={showToast}
      />
    </div>
  );
};
