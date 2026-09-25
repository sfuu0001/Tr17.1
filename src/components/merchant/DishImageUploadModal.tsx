import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Link,
  Sparkles,
  Check,
  RefreshCw,
  Eye,
  Trash2,
  Sliders,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { DishItem } from '../../types';

// 导入全套暗调 30° 商业摄影官方图库
import lowkeyBurgerImg from '../../assets/images/lowkey_burger_1788031618331.jpg';
import lowkeyGnocchiImg from '../../assets/images/lowkey_gnocchi_1788031630806.jpg';
import lowkeySteakImg from '../../assets/images/lowkey_steak_1788031642790.jpg';
import lowkeyColdbrewImg from '../../assets/images/lowkey_coldbrew_1788031656934.jpg';
import lowkeyDessertImg from '../../assets/images/lowkey_dessert_1788031701857.jpg';
import lowkeyFriesImg from '../../assets/images/lowkey_fries_1788031869280.jpg';
import lowkeyOysterImg from '../../assets/images/lowkey_oyster_1788031883124.jpg';
import lowkeyScallopImg from '../../assets/images/lowkey_scallop_1788031896192.jpg';
import lowkeyEggplantImg from '../../assets/images/lowkey_eggplant_1788031910310.jpg';
import lowkeyCornImg from '../../assets/images/lowkey_corn_1788031923945.jpg';
import lowkeyLeekImg from '../../assets/images/lowkey_leek_1788031942410.jpg';
import lowkeyShrimpImg from '../../assets/images/lowkey_shrimp_1788031953102.jpg';
import lowkeyWingsImg from '../../assets/images/lowkey_wings_1788031965248.jpg';
import lowkeyLobsterImg from '../../assets/images/lowkey_lobster_1788031977894.jpg';
import lowkeyLotusImg from '../../assets/images/lowkey_lotus_1788031990785.jpg';
import lowkeyUnagiImg from '../../assets/images/lowkey_unagi_1788032004124.jpg';
import lowkeyChochinImg from '../../assets/images/lowkey_chochin_1788032023717.jpg';
import lowkeySodaImg from '../../assets/images/lowkey_soda_1788032037702.jpg';
import lowkeyLasagnaImg from '../../assets/images/lowkey_lasagna_1788032050846.jpg';
import lowkeySkewersImg from '../../assets/images/lowkey_skewers_1788031604251.jpg';
import lowkeySquidImg from '../../assets/images/lowkey_squid_1788032071156.jpg';
import lowkeyMushroomImg from '../../assets/images/lowkey_mushroom_1788032084323.jpg';

// Preset categorized high-definition real food photography gallery
export const FOOD_PRESET_GALLERY: {
  category: string;
  categoryLabel: string;
  items: { url: string; title: string; desc: string }[];
}[] = [
  {
    category: 'yakitori',
    categoryLabel: '🍢 日式烧鸟',
    items: [
      {
        url: lowkeyChochinImg,
        title: '炭火极上生烤提灯串',
        desc: '暗调Low-key 30°机位，金黄爆浆卵黄'
      },
      {
        url: lowkeyWingsImg,
        title: '果木炭烤一折二鸡中翅',
        desc: '左侧柔光箱侧光，焦香酥脆'
      },
      {
        url: lowkeyUnagiImg,
        title: '秘制蒲烧炭烤鳗鱼串',
        desc: '浓醇蒲烧酱汁，芝麻与山椒粉提香'
      }
    ]
  },
  {
    category: 'skewers',
    categoryLabel: '🍢 炭烤串串',
    items: [
      {
        url: lowkeySkewersImg,
        title: '秘制果木炭烤牛肉大串',
        desc: '大块冷鲜牛里脊，红润焦香爆汁'
      },
      {
        url: lowkeyCornImg,
        title: '炭烤黄油香甜糯玉米',
        desc: '黄油轻刷炙烤，微焦金黄颗粒饱满'
      },
      {
        url: lowkeyLeekImg,
        title: '秘制炭烤紫根韭菜串',
        desc: '翠绿鲜嫩，孜然与辣椒干碟撒料'
      },
      {
        url: lowkeyLotusImg,
        title: '清脆炭烤薄切莲藕片',
        desc: '爽脆薄切，波浪红油香脆入味'
      },
      {
        url: lowkeyEggplantImg,
        title: '金银蒜蓉整只炭烤大茄子',
        desc: '剖开软烂，金银双色蒜蓉滋滋冒油'
      }
    ]
  },
  {
    category: 'seafood',
    categoryLabel: '🦪 鲜活海鲜',
    items: [
      {
        url: lowkeyOysterImg,
        title: '金银蒜蓉炭烤乳山大生蚝',
        desc: '深海原壳，浓郁蒜香与葱花热油'
      },
      {
        url: lowkeyScallopImg,
        title: '蒜蓉粉丝炭烤天鹅蛋扇贝',
        desc: '晶莹粉丝吸饱贝肉鲜汁'
      },
      {
        url: lowkeyShrimpImg,
        title: '鲜烤南美白对虾串',
        desc: '整只竹签现穿，红亮酥壳'
      },
      {
        url: lowkeySquidImg,
        title: '香辣炭烤深海大鱿鱼',
        desc: '红油酱汁油亮，鲜弹劲道'
      }
    ]
  },
  {
    category: 'baked',
    categoryLabel: '🧀 芝士焗类 & 意面',
    items: [
      {
        url: lowkeyLobsterImg,
        title: '芝士焗波士顿大龙虾',
        desc: '金黄焦斑，双倍马苏里拉拉丝'
      },
      {
        url: lowkeyLasagnaImg,
        title: '意式肉酱千层焗面',
        desc: '慢炖牛肉肉酱与浓醇奶酪层叠'
      },
      {
        url: lowkeyGnocchiImg,
        title: '黑松露墨汁手工玉棋',
        desc: '深黑墨汁玉棋与现刨夏季黑松露'
      }
    ]
  },
  {
    category: 'western',
    categoryLabel: '🥩 精致西餐 & 牛排',
    items: [
      {
        url: lowkeySteakImg,
        title: '极炙炭烤雪花和牛排',
        desc: '五分熟粉嫩肉芯，岩板盛放'
      },
      {
        url: lowkeyBurgerImg,
        title: '碳烤和牛小汉堡双重奏',
        desc: '竹炭黑金面包配和牛厚切肉饼'
      },
      {
        url: lowkeyFriesImg,
        title: '黑曜石松露金黄脆薯',
        desc: '外酥里糯，黑松露油与帕玛森干酪'
      }
    ]
  },
  {
    category: 'drinks_desserts',
    categoryLabel: '🥤 饮品 & 甜品小吃',
    items: [
      {
        url: lowkeySodaImg,
        title: '极夜西西里青柠微气泡',
        desc: '青柠薄片与剔透冰块，清爽微气泡'
      },
      {
        url: lowkeyColdbrewImg,
        title: '暗夜虚空冷萃浓缩咖啡',
        desc: '埃塞俄比亚单品，冷萃浓缩与绵密冷奶沫'
      },
      {
        url: lowkeyDessertImg,
        title: '火山熔岩黑芝麻舒芙蕾',
        desc: '黑曜石熔岩流心，法式金箔点缀'
      }
    ]
  }
];

interface DishImageUploadModalProps {
  dish: DishItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmImage?: (dishId: string, newImageUrl: string) => void;
  showToast?: (msg: string) => void;
  customTitle?: string;
  customSubtitle?: string;
  initialImageUrl?: string;
  onConfirmUrl?: (newImageUrl: string) => void;
}

export const DishImageUploadModal: React.FC<DishImageUploadModalProps> = ({
  dish,
  isOpen,
  onClose,
  onConfirmImage,
  showToast,
  customTitle,
  customSubtitle,
  initialImageUrl,
  onConfirmUrl
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'gallery'>('upload');
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState<string>(initialImageUrl || dish?.imageUrl || '');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [selectedGalleryCat, setSelectedGalleryCat] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state on dish or initialImageUrl open
  React.useEffect(() => {
    if (isOpen) {
      const startUrl = initialImageUrl || dish?.imageUrl || '';
      setCurrentPreviewUrl(startUrl);
      setInputUrl(startUrl);
      setFileMeta(null);
    }
  }, [dish?.id, dish?.imageUrl, initialImageUrl, isOpen]);

  if (!isOpen || (!dish && !initialImageUrl && !customTitle)) return null;

  // Process File to Base64 Data URL
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      if (showToast) showToast('请选择有效的图片文件 (JPG, PNG, WEBP 等)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      if (showToast) showToast('图片文件大小建议不超过 10MB');
      return;
    }

    setIsProcessing(true);
    const sizeInKb = (file.size / 1024).toFixed(1);
    setFileMeta({
      name: file.name,
      size: `${sizeInKb} KB`
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCurrentPreviewUrl(dataUrl);
        setInputUrl(dataUrl);
        setIsProcessing(false);
        if (showToast) {
          showToast(`已成功载入本地图片【${file.name}】(${sizeInKb}KB)`);
        }
      }
    };
    reader.onerror = () => {
      setIsProcessing(false);
      if (showToast) showToast('图片读取失败，请重试');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processImageFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (!inputUrl.trim()) {
      if (showToast) showToast('请输入有效的图片链接');
      return;
    }
    setCurrentPreviewUrl(inputUrl.trim());
    setFileMeta(null);
    if (showToast) showToast('已应用外链图片预览');
  };

  const handleSave = () => {
    if (!currentPreviewUrl) {
      if (showToast) showToast('请先选择或上传图片');
      return;
    }
    if (onConfirmUrl) {
      onConfirmUrl(currentPreviewUrl);
      if (showToast) {
        showToast(customTitle ? `已成功应用图片样式！` : `图片已成功更新！`);
      }
    } else if (dish) {
      onConfirmImage(dish.id, currentPreviewUrl);
      if (showToast) {
        showToast(`已成功更新【${dish.name}】的菜品主图！`);
      }
    }
    onClose();
  };

  const displayName = dish?.name || '变体图片';
  const displayCurrentImg = currentPreviewUrl || dish?.imageUrl || '';

  return (
    <div className="fixed inset-0 z-110 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-[4px] border border-[#d3d1cb] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 bg-[#f7f7f5] border-b border-[#e6e6e4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded overflow-hidden border border-[#d3d1cb] bg-[#eeeeec] shrink-0">
              {displayCurrentImg ? (
                <img
                  src={displayCurrentImg}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400">
                  <ImageIcon className="w-4 h-4" />
                </div>
              )}
            </div>
            <div>
              <div className="font-bold text-sm text-[#37352f] flex items-center gap-1.5">
                <span>{customTitle || `更换 / 重新上传【${displayName}】菜品图片`}</span>
              </div>
              <div className="text-[10.5px] text-[#787774]">
                {customSubtitle || '支持本地文件极速上传、外链替换及系统高清水印美食库一键选用'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#787774] hover:text-black p-1 rounded hover:bg-neutral-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-[#f1f1ef] px-3 pt-1 border-b border-[#e6e6e4] gap-1 shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-t-[3px] transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-white text-[#2b593f] border-t border-x border-[#e6e6e4] -mb-[1px] font-bold'
                : 'text-[#787774] hover:text-black'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>本地重新上传</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`px-3 py-1.5 rounded-t-[3px] transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'gallery'
                ? 'bg-white text-[#2b593f] border-t border-x border-[#e6e6e4] -mb-[1px] font-bold'
                : 'text-[#787774] hover:text-black'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>精选高清美食图库</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3 py-1.5 rounded-t-[3px] transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'url'
                ? 'bg-white text-[#2b593f] border-t border-x border-[#e6e6e4] -mb-[1px] font-bold'
                : 'text-[#787774] hover:text-black'
            }`}
          >
            <Link className="w-3.5 h-3.5 text-sky-600" />
            <span>网络图片外链</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1 hide-scrollbar">
          {/* Main Visual Comparison: Current Live vs Proposed New */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#fafaf8] rounded-[3px] border border-[#e6e6e4]">
            {/* Old Picture */}
            <div className="space-y-1 text-center">
              <div className="text-[11px] font-bold text-[#787774] flex items-center justify-center gap-1">
                <span>当前线上主图</span>
              </div>
              <div className="relative w-full h-32 rounded overflow-hidden border border-[#d3d1cb] bg-[#eeeeec]">
                <img
                  src={dish.imageUrl}
                  alt="Original"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* New Preview */}
            <div className="space-y-1 text-center">
              <div className="text-[11px] font-bold text-[#2b593f] flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2b593f]" />
                <span>替换后即时预览</span>
                {fileMeta && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1 rounded font-mono">
                    {fileMeta.size}
                  </span>
                )}
              </div>
              <div className="relative w-full h-32 rounded overflow-hidden border-2 border-emerald-600 bg-[#eeeeec] group shadow-inner">
                <img
                  src={currentPreviewUrl || dish.imageUrl}
                  alt="New Preview"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white font-bold gap-1.5">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>处理中...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TAB 1: 本地上传 */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-[4px] text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isDragOver
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 scale-[1.01]'
                    : 'border-[#d3d1cb] hover:border-[#2b593f] bg-[#fbfbfa] hover:bg-white text-neutral-600'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100/80 text-emerald-800 flex items-center justify-center shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-sm text-[#37352f]">
                    点击选择图片，或将本地文件拖拽至此处
                  </div>
                  <p className="text-[11px] text-[#787774]">
                    支持 JPG, PNG, WEBP, HEIC 格式高清实拍图 (建议比例 4:3 或 1:1，大小 10MB 以内)
                  </p>
                </div>

                <button
                  type="button"
                  className="mt-1 px-3 py-1 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-bold text-xs shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>浏览本地电脑文件</span>
                </button>
              </div>

              {fileMeta && (
                <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 flex items-center justify-between text-[11px] text-emerald-900">
                  <div className="flex items-center gap-1.5 truncate">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="font-bold">已载入:</span>
                    <span className="truncate">{fileMeta.name}</span>
                    <span className="font-mono text-emerald-700">({fileMeta.size})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPreviewUrl(dish.imageUrl);
                      setFileMeta(null);
                    }}
                    className="text-red-600 hover:text-red-800 font-semibold cursor-pointer shrink-0 ml-2"
                  >
                    撤销重选
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 系统预设精选图库 */}
          {activeTab === 'gallery' && (
            <div className="space-y-3">
              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedGalleryCat('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                    selectedGalleryCat === 'all'
                      ? 'bg-[#37352f] text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  全部精选
                </button>
                {FOOD_PRESET_GALLERY.map((cat) => (
                  <button
                    key={cat.category}
                    type="button"
                    onClick={() => setSelectedGalleryCat(cat.category)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                      selectedGalleryCat === cat.category
                        ? 'bg-[#2b593f] text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {cat.categoryLabel}
                  </button>
                ))}
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 hide-scrollbar">
                {FOOD_PRESET_GALLERY.filter(
                  (c) => selectedGalleryCat === 'all' || c.category === selectedGalleryCat
                ).flatMap((c) =>
                  c.items.map((item, idx) => {
                    const isChosen = currentPreviewUrl === item.url;
                    return (
                      <div
                        key={`${item.url}-${idx}`}
                        onClick={() => {
                          setCurrentPreviewUrl(item.url);
                          setInputUrl(item.url);
                          setFileMeta(null);
                        }}
                        className={`relative rounded-[3px] overflow-hidden border cursor-pointer group transition-all ${
                          isChosen
                            ? 'border-2 border-emerald-600 ring-2 ring-emerald-300/50 shadow-md'
                            : 'border-[#d3d1cb] hover:border-[#37352f]'
                        }`}
                      >
                        <div className="w-full h-24 overflow-hidden bg-[#eeeeec]">
                          <img
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-200"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-1.5 bg-white border-t border-[#f1f1ef]">
                          <div className="font-bold text-[11px] text-[#37352f] truncate">
                            {item.title}
                          </div>
                          <div className="text-[9.5px] text-[#787774] truncate">{item.desc}</div>
                        </div>

                        {isChosen && (
                          <div className="absolute top-1 right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: 网络图片外链 */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-[#5a5854] block">
                  直接粘贴任意外部图片 URL (HTTP / HTTPS / OSS / CDN / Base64):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... 或 https://your-cdn.com/dish.jpg"
                    className="w-full p-2 bg-[#f7f7f5] border border-[#d3d1cb] rounded-[3px] focus:outline-none focus:border-[#37352f] text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-3 py-2 bg-[#37352f] hover:bg-black text-white rounded-[3px] font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                  >
                    预览
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-sky-50 rounded border border-sky-200 text-[11px] text-sky-900 leading-relaxed">
                💡 提示: 您可以直接粘贴来自图床、微信公众号、小红书或任意 CDN 的菜品实拍图片链接，系统会自动完成适配并同步至全端菜单。
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#f7f7f5] border-t border-[#e6e6e4] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-[#787774]">
            点击确认后将立即替换此菜品在顾客端、外卖端及堂食点单机的图片展示。
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white text-[#37352f] border border-[#d3d1cb] rounded-[3px] font-semibold cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-[#2b593f] hover:bg-[#204430] text-white rounded-[3px] font-bold cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>确认替换并保存</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
