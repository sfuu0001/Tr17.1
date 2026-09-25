import React, { useState, useRef } from 'react';
import {
  Layers,
  Upload,
  Image as ImageIcon,
  Trash2,
  Plus,
  Check,
  Copy,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Eye,
  RefreshCw,
  ExternalLink,
  Tag,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  CheckCircle,
  Palette,
  Sliders,
  Ratio,
  Maximize2,
  X
} from 'lucide-react';
import { DishItem, DishVariant, DishVariantImageStyle } from '../../types';
import { FOOD_PRESET_GALLERY } from './DishImageUploadModal';
import {
  DEFAULT_VARIANT_IMAGE_STYLE,
  getVariantAspectClass,
  getVariantBorderClass,
  getVariantFilterClass,
  getVariantFitClass,
  getVariantBadgeClasses
} from '../../utils/variantStyleHelper';

export interface DishVariantEditorProps {
  dish?: DishItem;
  dishName?: string;
  basePrice: number;
  baseImageUrl: string;
  variants: DishVariant[];
  onChange: (variants: DishVariant[]) => void;
  showToast?: (msg: string) => void;
  onOpenUploadModalForVariant?: (variantIndex: number, currentVariant: DishVariant) => void;
  onRequestUploadImage?: (variantIndex: number, currentVariant: DishVariant) => void;
}

export const DishVariantEditor: React.FC<DishVariantEditorProps> = ({
  dish,
  dishName,
  basePrice,
  baseImageUrl,
  variants,
  onChange,
  showToast,
  onOpenUploadModalForVariant,
  onRequestUploadImage
}) => {
  // Active modal or popover states
  const [activeGalleryVariantIndex, setActiveGalleryVariantIndex] = useState<number | null>(null);
  const [selectedGalleryCat, setSelectedGalleryCat] = useState<string>('all');
  const [zoomedImageUrl, setZoomedImageUrl] = useState<{ url: string; title: string; style?: DishVariantImageStyle } | null>(null);
  const [urlInputIndex, setUrlInputIndex] = useState<number | null>(null);
  const [urlInputValue, setUrlInputValue] = useState<string>('');
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedStyleIndex, setExpandedStyleIndex] = useState<number | null>(null);

  // File input refs map
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // 1. Add a new empty variant
  const handleAddVariant = () => {
    const nextIndex = variants.length + 1;
    const newVariant: DishVariant = {
      id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `新规格变体 #${nextIndex}`,
      price: basePrice,
      originalPrice: undefined,
      imageUrl: '', // default empty, inherits dish main image
      imageStyle: {
        aspectRatio: '1:1',
        borderStyle: 'subtle',
        fitMode: 'cover',
        badgeText: '',
        badgeColor: 'purple',
        filter: 'normal'
      },
      description: '',
      isDefault: variants.length === 0,
      available: true
    };
    onChange([...variants, newVariant]);
    if (showToast) {
      showToast(`已新增变体规格 #${nextIndex}，请设置单独价格与图片样式`);
    }
  };

  // 2. Preset Quick Generators
  const applyPresetTemplates = (templateType: 'size' | 'quality' | 'combo') => {
    let newItems: DishVariant[] = [];
    const idPrefix = `var-${Date.now()}`;

    if (templateType === 'size') {
      newItems = [
        {
          id: `${idPrefix}-s`,
          name: '精巧尝鲜小份 (150g)',
          price: Math.max(1, Math.round(basePrice * 0.75)),
          originalPrice: basePrice,
          imageUrl: '',
          imageStyle: {
            aspectRatio: '1:1',
            borderStyle: 'subtle',
            fitMode: 'cover',
            badgeText: '尝鲜小份',
            badgeColor: 'emerald',
            filter: 'normal'
          },
          description: '单人轻松份量，解馋无负担',
          isDefault: false,
          available: true
        },
        {
          id: `${idPrefix}-m`,
          name: '经典招牌标准份 (250g)',
          price: basePrice,
          originalPrice: undefined,
          imageUrl: baseImageUrl,
          imageStyle: {
            aspectRatio: '1:1',
            borderStyle: 'subtle',
            fitMode: 'cover',
            badgeText: '招牌推荐',
            badgeColor: 'purple',
            filter: 'normal'
          },
          description: '本店招牌经典份量，饱腹满足',
          isDefault: true,
          available: true
        },
        {
          id: `${idPrefix}-l`,
          name: '加料双倍超大份 (400g)',
          price: Math.round(basePrice * 1.5),
          originalPrice: Math.round(basePrice * 1.65),
          imageUrl: '',
          imageStyle: {
            aspectRatio: '4:3',
            borderStyle: 'amber',
            fitMode: 'cover',
            badgeText: '超大份',
            badgeColor: 'amber',
            filter: 'crisp'
          },
          description: '大胃王专享，双倍肉量加倍过瘾',
          isDefault: false,
          available: true
        }
      ];
    } else if (templateType === 'quality') {
      newItems = [
        {
          id: `${idPrefix}-std`,
          name: '经典原味原切版',
          price: basePrice,
          originalPrice: undefined,
          imageUrl: baseImageUrl,
          imageStyle: {
            aspectRatio: '1:1',
            borderStyle: 'subtle',
            fitMode: 'cover',
            badgeText: '经典原味',
            badgeColor: 'purple',
            filter: 'normal'
          },
          description: '传承经典工艺，炭火锁汁',
          isDefault: true,
          available: true
        },
        {
          id: `${idPrefix}-cheese`,
          name: '双层爆浆浓芝士版',
          price: basePrice + 12,
          originalPrice: basePrice + 18,
          imageUrl: '',
          imageStyle: {
            aspectRatio: '4:3',
            borderStyle: 'amber',
            fitMode: 'cover',
            badgeText: '爆浆拉丝',
            badgeColor: 'amber',
            filter: 'warm'
          },
          description: '新西兰进口马苏里拉+车达双芝士焗烤',
          isDefault: false,
          available: true
        },
        {
          id: `${idPrefix}-truffle`,
          name: '极上黑松露奢享版',
          price: basePrice + 28,
          originalPrice: basePrice + 38,
          imageUrl: '',
          imageStyle: {
            aspectRatio: '4:3',
            borderStyle: 'purple',
            fitMode: 'cover',
            badgeText: '黑松露奢享',
            badgeColor: 'purple',
            filter: 'lowkey'
          },
          description: '特调意大利黑松露酱，奢华风味扑鼻',
          isDefault: false,
          available: true
        }
      ];
    } else if (templateType === 'combo') {
      newItems = [
        {
          id: `${idPrefix}-single`,
          name: '单人享味版 (赠特调饮品)',
          price: basePrice + 6,
          originalPrice: basePrice + 15,
          imageUrl: baseImageUrl,
          imageStyle: {
            aspectRatio: '1:1',
            borderStyle: 'subtle',
            fitMode: 'cover',
            badgeText: '赠特饮',
            badgeColor: 'emerald',
            filter: 'normal'
          },
          description: '含主菜1份 + 冰爽碳酸冷饮1罐',
          isDefault: true,
          available: true
        },
        {
          id: `${idPrefix}-double`,
          name: '甜蜜双人精选组合',
          price: Math.round(basePrice * 1.8),
          originalPrice: Math.round(basePrice * 2.1),
          imageUrl: '',
          imageStyle: {
            aspectRatio: '16:9',
            borderStyle: 'amber',
            fitMode: 'cover',
            badgeText: '双人组合',
            badgeColor: 'amber',
            filter: 'crisp'
          },
          description: '含主菜大份 + 招牌配菜 + 双人饮品',
          isDefault: false,
          available: true
        }
      ];
    }

    onChange(newItems);
    if (showToast) {
      showToast(`已快捷生成 ${newItems.length} 个规格变体，包含独立定价与专属图片样式！`);
    }
  };

  // 3. Update single variant property
  const updateVariant = (index: number, patch: Partial<DishVariant>) => {
    const copy = [...variants];
    copy[index] = { ...copy[index], ...patch };
    onChange(copy);
  };

  // 4. Set variant as default
  const setDefaultVariant = (targetIndex: number) => {
    const copy = variants.map((v, idx) => ({
      ...v,
      isDefault: idx === targetIndex
    }));
    onChange(copy);
    if (showToast) {
      showToast(`已将【${variants[targetIndex].name}】设为前台默认选中变体！`);
    }
  };

  // 5. Remove variant
  const handleRemoveVariant = (index: number) => {
    const targetName = variants[index].name;
    const copy = variants.filter((_, idx) => idx !== index);
    // If the removed one was default and we still have variants, set the first as default
    if (variants[index].isDefault && copy.length > 0) {
      copy[0].isDefault = true;
    }
    onChange(copy);
    if (showToast) {
      showToast(`已删除变体【${targetName}】`);
    }
  };

  // 6. Duplicate variant
  const handleDuplicateVariant = (index: number) => {
    const source = variants[index];
    const newVariant: DishVariant = {
      ...source,
      id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${source.name} (副本)`,
      isDefault: false
    };
    const copy = [...variants];
    copy.splice(index + 1, 0, newVariant);
    onChange(copy);
    if (showToast) {
      showToast(`已成功复制变体【${source.name}】！`);
    }
  };

  // 7. Move variant up / down
  const handleMoveVariant = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === variants.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const copy = [...variants];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    onChange(copy);
  };

  // 8. Process local file to base64 for variant image
  const processVariantFile = (file: File, variantIndex: number) => {
    if (!file.type.startsWith('image/')) {
      if (showToast) showToast('请选择有效的图片文件 (JPG, PNG, WEBP 等)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      if (showToast) showToast('图片文件大小建议不超过 10MB');
      return;
    }

    const sizeInKb = (file.size / 1024).toFixed(1);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        updateVariant(variantIndex, { imageUrl: dataUrl });
        if (showToast) {
          showToast(`已成功上传并替换【${variants[variantIndex].name}】独立图片 (${sizeInKb}KB)！`);
        }
      }
    };
    reader.onerror = () => {
      if (showToast) showToast('读取图片文件失败，请重试');
    };
    reader.readAsDataURL(file);
  };

  // 9. Drag & drop handlers
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processVariantFile(e.dataTransfer.files[0], index);
    }
  };

  // 10. Flattened presets for gallery selection
  const allPresetPhotos = React.useMemo(() => {
    const list: { category: string; categoryLabel: string; url: string; title: string; desc: string }[] = [];
    FOOD_PRESET_GALLERY.forEach((cat) => {
      cat.items.forEach((item) => {
        list.push({
          category: cat.category,
          categoryLabel: cat.categoryLabel,
          ...item
        });
      });
    });
    return list;
  }, []);

  const filteredPresetPhotos = React.useMemo(() => {
    if (selectedGalleryCat === 'all') return allPresetPhotos;
    return allPresetPhotos.filter((p) => p.category === selectedGalleryCat);
  }, [allPresetPhotos, selectedGalleryCat]);

  // Price range summary calculation
  const priceRange = React.useMemo(() => {
    if (variants.length === 0) return null;
    const prices = variants.map((v) => v.price).filter((p) => !isNaN(p));
    if (prices.length === 0) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max, isSingle: min === max };
  }, [variants]);

  return (
    <div className="space-y-4">
      {/* 1. Header Explanation & Quick Actions Banner */}
      <div className="p-3.5 bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-white rounded-[3px] border border-purple-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-purple-600 text-white rounded-[3px] shadow-xs shrink-0 mt-0.5">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-purple-950">
                  菜品独立变体体系与多规格管理
                </h3>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded">
                  {variants.length} 个规格变体
                </span>
              </div>
              <p className="text-[11px] text-purple-800/90 mt-0.5 leading-relaxed">
                每个变体均可配置<span className="font-bold underline decoration-purple-400">独立销售价格</span>与<span className="font-bold underline decoration-purple-400">专属实物图片样式</span>，支持重新上传本地图片、预设图库挑选及外链替换。
              </p>
            </div>
          </div>

          {/* Quick Add Variant Button */}
          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleAddVariant}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-[3px] shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增变体规格</span>
            </button>
          </div>
        </div>

        {/* Preset Quick Generator Bar */}
        <div className="pt-2 border-t border-purple-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-purple-900 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>快速套用行业规格模板:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyPresetTemplates('size')}
              className="px-2 py-0.8 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded text-[10.5px] font-semibold cursor-pointer transition-colors"
              title="生成: 小份 / 标准份 / 超大份"
            >
              分量规格 (小/中/大)
            </button>
            <button
              type="button"
              onClick={() => applyPresetTemplates('quality')}
              className="px-2 py-0.8 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded text-[10.5px] font-semibold cursor-pointer transition-colors"
              title="生成: 原切原味 / 浓芝士版 / 极上黑松露"
            >
              配方配置 (原味/芝士/黑松露)
            </button>
            <button
              type="button"
              onClick={() => applyPresetTemplates('combo')}
              className="px-2 py-0.8 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded text-[10.5px] font-semibold cursor-pointer transition-colors"
              title="生成: 单人享味 / 双人套餐"
            >
              组合套餐 (单人/双人)
            </button>
          </div>
        </div>
      </div>

      {/* 2. Active Price Range & Base Comparison Card */}
      {priceRange && (
        <div className="p-2.5 bg-[#f7f7f5] rounded border border-[#e6e6e4] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#787774]">主商品基准价:</span>
            <span className="font-bold text-[#37352f]">¥{basePrice.toFixed(2)}</span>
            <span className="text-[#d3d1cb]">|</span>
            <span className="text-[#787774]">变体综合售价区间:</span>
            <span className="font-extrabold text-purple-700 text-sm">
              {priceRange.isSingle
                ? `¥${priceRange.min.toFixed(2)}`
                : `¥${priceRange.min.toFixed(2)} ~ ¥${priceRange.max.toFixed(2)}`}
            </span>
          </div>

          <div className="text-[10.5px] text-[#787774]">
            前台列表将显示变体价格区间，顾客加购时可直选变体
          </div>
        </div>
      )}

      {/* 3. Empty State if no variants */}
      {variants.length === 0 ? (
        <div className="p-8 text-center bg-white rounded border border-dashed border-[#d3d1cb] space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-sm text-[#37352f]">当前菜品尚未开启多变体规格</div>
            <div className="text-xs text-[#787774] mt-1 max-w-md mx-auto">
              当前商品仅以单品基础售价 ¥{basePrice.toFixed(2)} 与默认主图销售。若该菜品有不同分量、口味版本或加料配置，点击下方按钮即可为各版本单独设置专属实物图片与价格。
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddVariant}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>立即启用并添加首个变体</span>
          </button>
        </div>
      ) : (
        /* 4. Variants Cards List */
        <div className="space-y-3">
          {variants.map((variant, index) => {
            const hasCustomImage = Boolean(variant.imageUrl && variant.imageUrl.trim());
            const displayImgUrl = hasCustomImage ? variant.imageUrl : baseImageUrl;
            const priceDiff = variant.price - basePrice;
            const isDragTarget = dragOverIndex === index;

            return (
              <div
                key={variant.id || index}
                className={`bg-white rounded-[3px] border transition-all ${
                  variant.isDefault
                    ? 'border-purple-400 ring-1 ring-purple-100 shadow-2xs'
                    : 'border-[#e6e6e4] hover:border-[#d3d1cb]'
                }`}
              >
                {/* Variant Header Row */}
                <div className="p-2.5 bg-[#f9f9f8] border-b border-[#e6e6e4] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-grow min-w-[200px]">
                    {/* Order Index Badge */}
                    <span className="w-5 h-5 rounded bg-purple-100 text-purple-900 font-bold text-[10.5px] flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>

                    {/* Variant Name Input */}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={variant.name}
                        onChange={(e) => updateVariant(index, { name: e.target.value })}
                        placeholder="变体规格名称 (如: 标准双人份 / 豪华芝士厚切版)"
                        className="w-full bg-white border border-[#d3d1cb] focus:border-purple-500 rounded px-2 py-1 text-xs font-bold text-[#37352f] outline-none"
                      />
                    </div>
                  </div>

                  {/* Actions & Status Pill Bar */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Default Variant Button */}
                    <button
                      type="button"
                      onClick={() => setDefaultVariant(index)}
                      className={`px-2 py-0.8 rounded text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                        variant.isDefault
                          ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                          : 'bg-white text-[#787774] border-[#d3d1cb] hover:text-black'
                      }`}
                      title={variant.isDefault ? '当前作为默认规格' : '设为前台默认选中变体'}
                    >
                      <Check className="w-3 h-3" />
                      <span>{variant.isDefault ? '默认规格' : '设为默认'}</span>
                    </button>

                    {/* Stock Status Switch */}
                    <button
                      type="button"
                      onClick={() => updateVariant(index, { available: !variant.available })}
                      className={`px-2 py-0.8 rounded text-[10.5px] font-bold border cursor-pointer transition-all ${
                        variant.available !== false
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-red-50 text-red-700 border-red-300'
                      }`}
                    >
                      {variant.available !== false ? '在售中' : '已沽清'}
                    </button>

                    {/* Move Up */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveVariant(index, 'up')}
                      className="p-1 rounded text-[#787774] hover:text-black hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="上移此变体"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      disabled={index === variants.length - 1}
                      onClick={() => handleMoveVariant(index, 'down')}
                      className="p-1 rounded text-[#787774] hover:text-black hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="下移此变体"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateVariant(index)}
                      className="p-1 rounded text-[#787774] hover:text-purple-700 hover:bg-purple-50 cursor-pointer"
                      title="复制本变体规格"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(index)}
                      className="p-1 rounded text-[#787774] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      title="删除此变体"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Variant Body: 2 Columns Layout */}
                <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3.5">
                  {/* LEFT COLUMN: 变体独立图片样式与替换/重新上传 (5 cols) */}
                  <div className="md:col-span-5 space-y-2.5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#37352f] flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                        <span>变体专属图片与样式</span>
                      </span>

                      <div className="flex items-center gap-1">
                        {hasCustomImage ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>独立图</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-[#787774] bg-neutral-100 px-1.5 py-0.2 rounded border border-neutral-200">
                            继承主图
                          </span>
                        )}
                        {variant.imageStyle?.badgeText && (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                            {variant.imageStyle.badgeText}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Image Box & Dropzone */}
                    {(() => {
                      const imgStyle = variant.imageStyle || DEFAULT_VARIANT_IMAGE_STYLE;
                      const badgeConf = getVariantBadgeClasses(imgStyle.badgeColor);

                      return (
                        <div
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                          className={`relative rounded border transition-all overflow-hidden flex flex-col items-center justify-center p-2.5 bg-[#fcfcfb] group ${
                            isDragTarget
                              ? 'border-2 border-dashed border-purple-500 bg-purple-50/50'
                              : 'border-[#e6e6e4]'
                          }`}
                        >
                          {/* Image Visualizer with Individual Variant Style */}
                          <div className="w-full flex justify-center py-1">
                            <div
                              className={`relative w-full max-w-[240px] max-h-36 overflow-hidden transition-all duration-300 bg-neutral-100 ${getVariantAspectClass(
                                imgStyle.aspectRatio
                              )} ${getVariantBorderClass(imgStyle.borderStyle)}`}
                            >
                              {displayImgUrl ? (
                                <img
                                  src={displayImgUrl}
                                  alt={variant.name}
                                  className={`w-full h-full transition-all duration-300 group-hover:scale-105 ${getVariantFitClass(
                                    imgStyle.fitMode
                                  )} ${getVariantFilterClass(imgStyle.filter)} ${
                                    !hasCustomImage ? 'opacity-80' : ''
                                  }`}
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-[#787774] text-xs">
                                  <ImageIcon className="w-6 h-6 text-[#d3d1cb] mb-1" />
                                  <span>暂未设置图片</span>
                                </div>
                              )}

                              {/* Custom Variant Corner Badge */}
                              {imgStyle.badgeText && (
                                <div
                                  className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8.5px] font-bold shadow-xs border flex items-center gap-0.5 leading-none z-10 ${badgeConf.bg} ${badgeConf.text} ${badgeConf.border}`}
                                >
                                  <span>{imgStyle.badgeText}</span>
                                </div>
                              )}

                              {/* Top Status Tag */}
                              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 z-10">
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-black/75 backdrop-blur-xs text-white">
                                  {hasCustomImage ? '专属实物图' : '主图代展'}
                                </span>
                              </div>

                              {/* Zoom Preview button */}
                              {displayImgUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setZoomedImageUrl({
                                      url: displayImgUrl,
                                      title: `变体【${variant.name}】实物展示`,
                                      style: imgStyle
                                    })
                                  }
                                  className="absolute bottom-1.5 right-1.5 p-1 bg-black/70 hover:bg-black text-white rounded cursor-pointer transition-colors z-10"
                                  title="放大预览此变体效果"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Drag overlay notice */}
                              {isDragTarget && (
                                <div className="absolute inset-0 bg-purple-600/80 text-white flex flex-col items-center justify-center text-xs font-bold gap-1 z-20">
                                  <Upload className="w-5 h-5 animate-bounce" />
                                  <span>松开鼠标立即替换变体图片</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Hidden File Input for local replacement */}
                          <input
                            ref={(el) => {
                              fileInputRefs.current[variant.id] = el;
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                processVariantFile(e.target.files[0], index);
                              }
                            }}
                          />

                          {/* Action Button Strip */}
                          <div className="w-full mt-2 grid grid-cols-3 gap-1">
                            {/* 1. Upload / Replace Local File */}
                            <button
                              type="button"
                              onClick={() => {
                                if (onRequestUploadImage) {
                                  onRequestUploadImage(index, variant);
                                } else if (onOpenUploadModalForVariant) {
                                  onOpenUploadModalForVariant(index, variant);
                                } else {
                                  fileInputRefs.current[variant.id]?.click();
                                }
                              }}
                              className="px-1.5 py-1.5 bg-white hover:bg-purple-50 text-purple-900 border border-purple-300 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-colors shadow-2xs"
                              title="选择电脑本地图片重新上传或替换此变体图片"
                            >
                              <Upload className="w-3 h-3 text-purple-600 shrink-0" />
                              <span className="truncate">{hasCustomImage ? '重新上传' : '上传本地图'}</span>
                            </button>

                            {/* 2. Pick from Preset Gallery */}
                            <button
                              type="button"
                              onClick={() => setActiveGalleryVariantIndex(index)}
                              className="px-1.5 py-1.5 bg-white hover:bg-neutral-100 text-[#37352f] border border-[#d3d1cb] rounded text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-colors shadow-2xs"
                              title="从系统高品质美食摄影库挑选变体图片"
                            >
                              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate">图库挑选</span>
                            </button>

                            {/* 3. Toggle Image Style Customizer */}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedStyleIndex(expandedStyleIndex === index ? null : index)
                              }
                              className={`px-1.5 py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-colors border shadow-2xs ${
                                expandedStyleIndex === index
                                  ? 'bg-purple-600 text-white border-purple-700'
                                  : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200'
                              }`}
                              title="配置变体专属展示比例、边框样式、角标与滤镜"
                            >
                              <Sliders className="w-3 h-3 shrink-0" />
                              <span className="truncate">图片样式</span>
                            </button>
                          </div>

                          {/* Secondary row: URL input toggle and Reset */}
                          <div className="w-full mt-1.5 flex items-center justify-between text-[10px] text-[#787774]">
                            <button
                              type="button"
                              onClick={() => {
                                setUrlInputIndex(urlInputIndex === index ? null : index);
                                setUrlInputValue(variant.imageUrl || '');
                              }}
                              className="text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>输入外链替换</span>
                            </button>

                            {hasCustomImage && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateVariant(index, { imageUrl: '' });
                                  if (showToast) {
                                    showToast(`已恢复变体【${variant.name}】继承菜品主图`);
                                  }
                                }}
                                className="text-neutral-500 hover:text-red-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                                title="清除此变体的单独图片，改用主商品封面图"
                              >
                                <RefreshCw className="w-2.5 h-2.5" />
                                <span>恢复继承主图</span>
                              </button>
                            )}
                          </div>

                          {/* Expandable URL Input Field */}
                          {urlInputIndex === index && (
                            <div className="w-full mt-2 p-1.5 bg-white rounded border border-purple-200 space-y-1 animate-in fade-in">
                              <input
                                type="url"
                                value={urlInputValue}
                                onChange={(e) => setUrlInputValue(e.target.value)}
                                placeholder="粘贴 HTTPS 图片直链..."
                                className="w-full text-[10.5px] px-2 py-1 border border-[#d3d1cb] rounded focus:border-purple-500 outline-none"
                              />
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setUrlInputIndex(null)}
                                  className="px-2 py-0.5 text-[10px] text-[#787774] hover:text-black rounded cursor-pointer"
                                >
                                  取消
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (urlInputValue.trim()) {
                                      updateVariant(index, { imageUrl: urlInputValue.trim() });
                                      setUrlInputIndex(null);
                                      if (showToast) {
                                        showToast(`已应用外链图片至变体【${variant.name}】！`);
                                      }
                                    }
                                  }}
                                  className="px-2 py-0.5 text-[10px] bg-purple-600 text-white font-bold rounded cursor-pointer"
                                >
                                  应用
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ======================================================== */}
                          {/* EXPANDABLE INDIVIDUAL IMAGE STYLE CONFIGURATION PANEL */}
                          {/* ======================================================== */}
                          {expandedStyleIndex === index && (
                            <div className="w-full mt-2.5 p-2 bg-white rounded-lg border border-purple-200 space-y-2 text-left animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-1 border-b border-purple-100">
                                <span className="text-[10.5px] font-bold text-purple-950 flex items-center gap-1">
                                  <Palette className="w-3 h-3 text-purple-600" />
                                  <span>专属图片样式配置</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateVariant(index, {
                                      imageStyle: { ...DEFAULT_VARIANT_IMAGE_STYLE }
                                    });
                                    if (showToast) showToast('已重置变体图片样式为默认');
                                  }}
                                  className="text-[9.5px] text-[#787774] hover:text-purple-700 cursor-pointer"
                                >
                                  重置默认样式
                                </button>
                              </div>

                              {/* 1. Aspect Ratio */}
                              <div>
                                <label className="block text-[9.5px] font-bold text-[#4d4c46] mb-1">
                                  展示比例 (Aspect Ratio)
                                </label>
                                <div className="grid grid-cols-4 gap-1">
                                  {[
                                    { id: '1:1', label: '1:1 方形' },
                                    { id: '4:3', label: '4:3 微距' },
                                    { id: '16:9', label: '16:9 宽屏' },
                                    { id: 'round', label: '圆形 徽章' }
                                  ].map((r) => (
                                    <button
                                      key={r.id}
                                      type="button"
                                      onClick={() =>
                                        updateVariant(index, {
                                          imageStyle: {
                                            ...imgStyle,
                                            aspectRatio: r.id as DishVariantImageStyle['aspectRatio']
                                          }
                                        })
                                      }
                                      className={`py-1 text-[9px] font-bold rounded border text-center cursor-pointer transition-all ${
                                        imgStyle.aspectRatio === r.id
                                          ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                                          : 'bg-neutral-50 hover:bg-neutral-100 text-[#4d4c46] border-[#d3d1cb]'
                                      }`}
                                    >
                                      {r.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* 2. Border Style */}
                              <div>
                                <label className="block text-[9.5px] font-bold text-[#4d4c46] mb-1">
                                  外框装饰风格 (Border Style)
                                </label>
                                <div className="grid grid-cols-3 gap-1">
                                  {[
                                    { id: 'none', label: '无边框' },
                                    { id: 'subtle', label: '浅灰微框' },
                                    { id: 'purple', label: '尊贵紫金' },
                                    { id: 'amber', label: '黄金典藏' },
                                    { id: 'emerald', label: '翡翠清新' },
                                    { id: 'dashed', label: '工艺虚线' }
                                  ].map((b) => (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() =>
                                        updateVariant(index, {
                                          imageStyle: {
                                            ...imgStyle,
                                            borderStyle: b.id as DishVariantImageStyle['borderStyle']
                                          }
                                        })
                                      }
                                      className={`py-1 text-[9px] font-bold rounded border text-center cursor-pointer transition-all ${
                                        imgStyle.borderStyle === b.id
                                          ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                                          : 'bg-neutral-50 hover:bg-neutral-100 text-[#4d4c46] border-[#d3d1cb]'
                                      }`}
                                    >
                                      {b.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* 3. Badge Text & Preset Badges */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[9.5px] font-bold text-[#4d4c46]">
                                    图片专属角标 (Badge)
                                  </label>
                                  <span className="text-[9px] text-[#787774]">
                                    点选预设或自定义输入
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-1 mb-1.5">
                                  {['超大份', '双倍肉', '爆浆拉丝', '主厨首选', '尝鲜特惠', '低卡推荐'].map(
                                    (tag) => (
                                      <button
                                        key={tag}
                                        type="button"
                                        onClick={() =>
                                          updateVariant(index, {
                                            imageStyle: { ...imgStyle, badgeText: tag }
                                          })
                                        }
                                        className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded cursor-pointer border ${
                                          imgStyle.badgeText === tag
                                            ? 'bg-purple-600 text-white border-purple-700'
                                            : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                                        }`}
                                      >
                                        +{tag}
                                      </button>
                                    )
                                  )}
                                  {imgStyle.badgeText && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateVariant(index, {
                                          imageStyle: { ...imgStyle, badgeText: '' }
                                        })
                                      }
                                      className="px-1.5 py-0.5 text-[8.5px] font-bold rounded bg-rose-50 text-rose-700 border border-rose-200 cursor-pointer"
                                    >
                                      清除角标
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-12 gap-1">
                                  <input
                                    type="text"
                                    value={imgStyle.badgeText || ''}
                                    onChange={(e) =>
                                      updateVariant(index, {
                                        imageStyle: { ...imgStyle, badgeText: e.target.value }
                                      })
                                    }
                                    placeholder="输入自定义角标 (最多6字)..."
                                    maxLength={8}
                                    className="col-span-8 px-2 py-1 bg-white border border-[#d3d1cb] rounded text-[9.5px] outline-none focus:border-purple-500"
                                  />
                                  <select
                                    value={imgStyle.badgeColor || 'purple'}
                                    onChange={(e) =>
                                      updateVariant(index, {
                                        imageStyle: {
                                          ...imgStyle,
                                          badgeColor: e.target.value as DishVariantImageStyle['badgeColor']
                                        }
                                      })
                                    }
                                    className="col-span-4 px-1 py-1 bg-white border border-[#d3d1cb] rounded text-[9px] font-bold text-[#37352f] outline-none"
                                  >
                                    <option value="purple">紫色标</option>
                                    <option value="amber">金色标</option>
                                    <option value="emerald">绿色标</option>
                                    <option value="red">红色标</option>
                                    <option value="neutral">暗黑标</option>
                                  </select>
                                </div>
                              </div>

                              {/* 4. Filter Tone & Fit Mode */}
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <div>
                                  <label className="block text-[9.5px] font-bold text-[#4d4c46] mb-1">
                                    色彩基调滤镜
                                  </label>
                                  <select
                                    value={imgStyle.filter || 'normal'}
                                    onChange={(e) =>
                                      updateVariant(index, {
                                        imageStyle: {
                                          ...imgStyle,
                                          filter: e.target.value as DishVariantImageStyle['filter']
                                        }
                                      })
                                    }
                                    className="w-full px-1.5 py-1 bg-white border border-[#d3d1cb] rounded text-[9.5px] font-medium outline-none"
                                  >
                                    <option value="normal">真实原色</option>
                                    <option value="warm">暖光烘焙 (食欲感)</option>
                                    <option value="crisp">鲜锐质感 (高微距)</option>
                                    <option value="lowkey">暗调氛围 (高级感)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[9.5px] font-bold text-[#4d4c46] mb-1">
                                    画面适配裁剪
                                  </label>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateVariant(index, {
                                          imageStyle: { ...imgStyle, fitMode: 'cover' }
                                        })
                                      }
                                      className={`flex-1 py-1 text-[9px] font-bold rounded border cursor-pointer ${
                                        imgStyle.fitMode === 'cover'
                                          ? 'bg-purple-600 text-white border-purple-700'
                                          : 'bg-neutral-50 text-[#4d4c46] border-[#d3d1cb]'
                                      }`}
                                    >
                                      铺满裁剪
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateVariant(index, {
                                          imageStyle: { ...imgStyle, fitMode: 'contain' }
                                        })
                                      }
                                      className={`flex-1 py-1 text-[9px] font-bold rounded border cursor-pointer ${
                                        imgStyle.fitMode === 'contain'
                                          ? 'bg-purple-600 text-white border-purple-700'
                                          : 'bg-neutral-50 text-[#4d4c46] border-[#d3d1cb]'
                                      }`}
                                    >
                                      完整留白
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* RIGHT COLUMN: 变体独立价格与参数配置 (7 cols) */}
                  <div className="md:col-span-7 space-y-3">
                    {/* 1. Pricing Section */}
                    <div className="p-2.5 bg-[#fbfbfa] rounded border border-[#e6e6e4] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#37352f] flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-purple-600" />
                          <span>变体独立定价 (Independent Price)</span>
                        </span>

                        {/* Diff Indicator */}
                        <div className="text-[10.5px]">
                          {priceDiff === 0 ? (
                            <span className="text-[#787774] font-medium bg-neutral-100 px-1.5 py-0.2 rounded">
                              与基准价一致
                            </span>
                          ) : priceDiff > 0 ? (
                            <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-mono">
                              比基准价高 +¥{priceDiff.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-mono">
                              比基准价低 -¥{Math.abs(priceDiff).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Independent Selling Price */}
                        <div>
                          <label className="block text-[10px] text-[#787774] font-medium mb-1">
                            独立实售价 (¥) <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 font-bold text-[#787774] text-xs">
                              ¥
                            </span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={variant.price || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                updateVariant(index, { price: val });
                              }}
                              className="w-full pl-6 pr-2 py-1.5 bg-white border border-[#d3d1cb] focus:border-purple-500 rounded font-mono font-extrabold text-sm text-[#37352f] outline-none"
                            />
                          </div>
                        </div>

                        {/* Original Striking Price */}
                        <div>
                          <label className="block text-[10px] text-[#787774] font-medium mb-1">
                            独立划线原价 (¥ 选填)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 font-medium text-[#787774] text-xs">
                              ¥
                            </span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={variant.originalPrice || ''}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                updateVariant(index, { originalPrice: val });
                              }}
                              placeholder="划线原价"
                              className="w-full pl-6 pr-2 py-1.5 bg-white border border-[#d3d1cb] focus:border-purple-500 rounded font-mono text-xs text-[#787774] outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Quick Adjust Price Shortcuts */}
                      <div className="flex items-center gap-1 pt-1 text-[10px]">
                        <span className="text-[#787774] shrink-0">快捷微调:</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => updateVariant(index, { price: basePrice })}
                            className="px-1.5 py-0.5 bg-white hover:bg-neutral-100 text-[#37352f] border border-[#d3d1cb] rounded text-[10px] font-mono cursor-pointer"
                          >
                            设为基准价 ¥{basePrice.toFixed(0)}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateVariant(index, { price: variant.price + 5 })}
                            className="px-1.5 py-0.5 bg-white hover:bg-purple-50 text-purple-900 border border-[#d3d1cb] rounded text-[10px] font-mono cursor-pointer"
                          >
                            +¥5
                          </button>
                          <button
                            type="button"
                            onClick={() => updateVariant(index, { price: variant.price + 10 })}
                            className="px-1.5 py-0.5 bg-white hover:bg-purple-50 text-purple-900 border border-[#d3d1cb] rounded text-[10px] font-mono cursor-pointer"
                          >
                            +¥10
                          </button>
                          <button
                            type="button"
                            onClick={() => updateVariant(index, { price: variant.price + 20 })}
                            className="px-1.5 py-0.5 bg-white hover:bg-purple-50 text-purple-900 border border-[#d3d1cb] rounded text-[10px] font-mono cursor-pointer"
                          >
                            +¥20
                          </button>
                          <button
                            type="button"
                            onClick={() => updateVariant(index, { price: Math.max(1, variant.price - 5) })}
                            className="px-1.5 py-0.5 bg-white hover:bg-neutral-100 text-[#37352f] border border-[#d3d1cb] rounded text-[10px] font-mono cursor-pointer"
                          >
                            -¥5
                          </button>
                          <button
                            type="button"
                            onClick={() => updateVariant(index, { price: Math.round(basePrice * 0.9) })}
                            className="px-1.5 py-0.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-[10px] font-mono cursor-pointer"
                            title="按基准价9折设置"
                          >
                            9折
                          </button>
                          <button
                            type="button"
                            onClick={() => updateVariant(index, { price: Math.round(basePrice * 0.85) })}
                            className="px-1.5 py-0.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-[10px] font-mono cursor-pointer"
                            title="按基准价8.5折设置"
                          >
                            8.5折
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 2. Variant Details: Description & SKU */}
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] text-[#787774] font-medium mb-1">
                          变体规格卖点 / 分量描述 (顾客端展示)
                        </label>
                        <input
                          type="text"
                          value={variant.description || ''}
                          onChange={(e) => updateVariant(index, { description: e.target.value })}
                          placeholder="例如: 含双份原切牛排，配融化车达芝士与黑椒特调酱"
                          className="w-full px-2 py-1 bg-white border border-[#d3d1cb] focus:border-purple-500 rounded text-xs text-[#37352f] outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-[#787774] font-medium mb-1">
                            独立变体编码 (SKU)
                          </label>
                          <input
                            type="text"
                            value={variant.sku || ''}
                            onChange={(e) => updateVariant(index, { sku: e.target.value })}
                            placeholder="如: VAR-01"
                            className="w-full px-2 py-1 bg-white border border-[#d3d1cb] focus:border-purple-500 rounded text-xs font-mono text-[#37352f] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-[#787774] font-medium mb-1">
                            前台点餐状态
                          </label>
                          <div className="text-xs py-1 text-[#787774] flex items-center gap-1.5 font-medium">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                variant.available !== false ? 'bg-emerald-500' : 'bg-red-500'
                              }`}
                            />
                            <span>
                              {variant.available !== false ? '可正常点选下单' : '前台变体置灰 (沽清)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Preset Photo Gallery Picker Modal */}
      {activeGalleryVariantIndex !== null && (
        <div className="fixed inset-0 z-120 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[4px] border border-[#d3d1cb] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-3 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 text-purple-800 rounded">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm text-[#37352f]">
                    从摄影图库挑选【{variants[activeGalleryVariantIndex]?.name}】独立图片
                  </div>
                  <div className="text-[10px] text-[#787774]">
                    精选暗调Low-key微距实拍，点击即可即时应用为此变体样式
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveGalleryVariantIndex(null)}
                className="text-[#787774] hover:text-black p-1 rounded hover:bg-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="p-2 border-b border-[#e6e6e4] flex items-center gap-1.5 overflow-x-auto bg-[#fafaf8]">
              <button
                type="button"
                onClick={() => setSelectedGalleryCat('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer ${
                  selectedGalleryCat === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-[#787774] border border-[#d3d1cb] hover:text-black'
                }`}
              >
                全部美食 ({allPresetPhotos.length})
              </button>
              {FOOD_PRESET_GALLERY.map((cat) => (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => setSelectedGalleryCat(cat.category)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer whitespace-nowrap ${
                    selectedGalleryCat === cat.category
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-[#787774] border border-[#d3d1cb] hover:text-black'
                  }`}
                >
                  {cat.categoryLabel} ({cat.items.length})
                </button>
              ))}
            </div>

            {/* Gallery Grid */}
            <div className="p-3 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5 flex-1">
              {filteredPresetPhotos.map((photo, pIdx) => (
                <div
                  key={pIdx}
                  onClick={() => {
                    updateVariant(activeGalleryVariantIndex, { imageUrl: photo.url });
                    if (showToast) {
                      showToast(
                        `已将【${photo.title}】设为变体【${variants[activeGalleryVariantIndex]?.name}】独立图片！`
                      );
                    }
                    setActiveGalleryVariantIndex(null);
                  }}
                  className="group relative rounded border border-[#e2e3e1] hover:border-purple-500 overflow-hidden cursor-pointer bg-neutral-50 transition-all hover:shadow-md"
                >
                  <div className="aspect-4/3 w-full overflow-hidden bg-neutral-100">
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-2 bg-white">
                    <div className="font-bold text-xs text-[#37352f] truncate">{photo.title}</div>
                    <div className="text-[10px] text-[#787774] truncate">{photo.desc}</div>
                  </div>
                  <div className="absolute inset-0 bg-purple-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1">
                    <Check className="w-4 h-4" />
                    <span>选择此样式</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. High-Def Zoom Preview Lightbox */}
      {zoomedImageUrl && (
        <div
          onClick={() => setZoomedImageUrl(null)}
          className="fixed inset-0 z-130 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 text-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-neutral-700"
          >
            <div className="p-3 bg-neutral-950 flex items-center justify-between text-xs font-bold border-b border-neutral-800">
              <div className="flex items-center gap-1.5 truncate">
                <ImageIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">{zoomedImageUrl.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setZoomedImageUrl(null)}
                className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col items-center justify-center bg-neutral-950/60">
              {(() => {
                const style = zoomedImageUrl.style || DEFAULT_VARIANT_IMAGE_STYLE;
                const badgeClasses = getVariantBadgeClasses(style.badgeColor);

                return (
                  <div className="relative max-w-sm w-full">
                    <div
                      className={`relative w-full overflow-hidden mx-auto ${getVariantAspectClass(
                        style.aspectRatio
                      )} ${getVariantBorderClass(style.borderStyle)}`}
                    >
                      <img
                        src={zoomedImageUrl.url}
                        alt={zoomedImageUrl.title}
                        className={`w-full h-full ${getVariantFitClass(style.fitMode)} ${getVariantFilterClass(
                          style.filter
                        )} transition-all`}
                        referrerPolicy="no-referrer"
                      />
                      {style.badgeText && (
                        <div
                          className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold shadow-md border leading-none z-10 ${badgeClasses.bg} ${badgeClasses.text} ${badgeClasses.border}`}
                        >
                          {style.badgeText}
                        </div>
                      )}
                    </div>

                    {/* Style Meta Specs Display */}
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[10.5px] text-neutral-400">
                      <span className="bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                        比例: {style.aspectRatio}
                      </span>
                      <span className="bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                        边框: {style.borderStyle}
                      </span>
                      <span className="bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                        滤镜: {style.filter}
                      </span>
                      {style.badgeText && (
                        <span className="bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded border border-purple-700 font-bold">
                          角标: {style.badgeText}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
