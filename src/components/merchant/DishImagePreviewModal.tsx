import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  ExternalLink,
  Sliders,
  CheckCircle2,
  XCircle,
  Flame,
  ChefHat,
  Clock,
  Tag,
  Sparkles,
  Info,
  Camera,
  Upload
} from 'lucide-react';
import { DishItem } from '../../types';
import { copyTextToClipboard } from '../../utils/clipboard';
import { DishImageUploadModal } from './DishImageUploadModal';

interface DishImagePreviewModalProps {
  dish: DishItem | null;
  dishes?: DishItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectDish?: (dish: DishItem) => void;
  onEditDish?: (dish: DishItem) => void;
  onUpdateDish?: (dish: DishItem) => void;
  onToggleAvailability?: (dishId: string) => void;
  showToast?: (msg: string) => void;
}

export const DishImagePreviewModal: React.FC<DishImagePreviewModalProps> = ({
  dish,
  dishes = [],
  isOpen,
  onClose,
  onSelectDish,
  onEditDish,
  onUpdateDish,
  onToggleAvailability,
  showToast
}) => {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showInfoPanel, setShowInfoPanel] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset transforms when dish changes
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setImageError(false);
  }, [dish?.id, dish?.imageUrl]);

  // Find current index and navigation
  const currentIndex = dish && dishes.length > 0 ? dishes.findIndex((d) => d.id === dish.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < dishes.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && dishes[currentIndex - 1] && onSelectDish) {
      onSelectDish(dishes[currentIndex - 1]);
    }
  }, [hasPrev, dishes, currentIndex, onSelectDish]);

  const handleNext = useCallback(() => {
    if (hasNext && dishes[currentIndex + 1] && onSelectDish) {
      onSelectDish(dishes[currentIndex + 1]);
    }
  }, [hasNext, dishes, currentIndex, onSelectDish]);

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(s + 0.25, 3));
      } else if (e.key === '-' || e.key === '_') {
        setScale((s) => Math.max(s - 0.25, 0.5));
      } else if (e.key === '0') {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } else if (e.key === 'r' || e.key === 'R') {
        setRotation((r) => (r + 90) % 360);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((s) => Math.min(s + 0.15, 3.5));
    } else {
      setScale((s) => Math.max(s - 0.15, 0.5));
    }
  };

  // Mouse drag to pan when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCopyImageUrl = async () => {
    if (!dish?.imageUrl) return;
    const ok = await copyTextToClipboard(dish.imageUrl);
    if (showToast) {
      showToast(ok ? `已复制【${dish.name}】图片链接至剪贴板` : '复制失败，请手动复制');
    }
  };

  const handleOpenExternal = () => {
    if (!dish?.imageUrl) return;
    window.open(dish.imageUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    if (!dish?.imageUrl) return;
    const a = document.createElement('a');
    a.href = dish.imageUrl;
    a.download = `${dish.name || 'dish'}_preview.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (showToast) {
      showToast(`已开始下载【${dish.name}】菜品大图`);
    }
  };

  const handleToggleZoom = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(1.8);
    }
  };

  if (!isOpen || !dish) return null;

  return (
    <div
      id="dish-image-preview-lightbox"
      className="fixed inset-0 z-100 bg-neutral-950/90 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      onMouseUp={handleMouseUp}
    >
      {/* 1. Top Bar */}
      <div className="p-3 sm:px-6 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base text-white tracking-wide truncate">
              {dish.name}
            </span>
            {dish.badgeText && (
              <span className="text-[10px] bg-amber-500/30 text-amber-200 border border-amber-400/40 px-1.5 py-0.5 rounded font-semibold shrink-0">
                {dish.badgeText}
              </span>
            )}
            {!dish.available && (
              <span className="text-[10px] bg-red-900/60 text-red-200 border border-red-500/40 px-1.5 py-0.5 rounded font-semibold shrink-0">
                沽清待上架
              </span>
            )}
          </div>

          {dishes.length > 0 && currentIndex >= 0 && (
            <span className="text-xs text-neutral-400 font-mono hidden sm:inline-block">
              ({currentIndex + 1} / {dishes.length})
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-white/10 rounded-[4px] p-0.5 backdrop-blur-xs border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
              className="p-1.5 hover:bg-white/20 text-neutral-200 hover:text-white rounded cursor-pointer transition-colors"
              title="缩小 (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToggleZoom}
              className="px-2 py-1 hover:bg-white/20 text-neutral-200 hover:text-white rounded cursor-pointer font-mono font-bold text-[11px] transition-colors"
              title="切换 1x / 1.8x"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(s + 0.25, 3.5))}
              className="p-1.5 hover:bg-white/20 text-neutral-200 hover:text-white rounded cursor-pointer transition-colors"
              title="放大 (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Rotate */}
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white rounded-[4px] cursor-pointer transition-colors border border-white/10"
            title="顺时针旋转 90° (R)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Toggle Info Panel */}
          <button
            type="button"
            onClick={() => setShowInfoPanel(!showInfoPanel)}
            className={`p-2 rounded-[4px] cursor-pointer transition-colors border ${
              showInfoPanel
                ? 'bg-amber-600/80 text-white border-amber-400/50'
                : 'bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white border-white/10'
            }`}
            title={showInfoPanel ? '隐藏菜品详情面板' : '展开菜品详情面板'}
          >
            <Info className="w-4 h-4" />
          </button>

          {/* External Open */}
          <button
            type="button"
            onClick={handleOpenExternal}
            className="p-2 bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white rounded-[4px] cursor-pointer transition-colors border border-white/10 hidden sm:block"
            title="在新标签页中打开原图"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Copy URL */}
          <button
            type="button"
            onClick={handleCopyImageUrl}
            className="p-2 bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white rounded-[4px] cursor-pointer transition-colors border border-white/10"
            title="复制图片外链"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-[4px] cursor-pointer transition-colors shadow-sm ml-1"
            title="关闭预览 (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Stage Area with Navigation Buttons */}
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center overflow-hidden p-4 cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {/* Previous Button */}
        {hasPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3.5 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-xs border border-white/20 cursor-pointer transition-all hover:scale-110 shadow-lg"
            title="上一道菜品 (←)"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Next Button */}
        {hasNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3.5 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-xs border border-white/20 cursor-pointer transition-all hover:scale-110 shadow-lg"
            title="下一道菜品 (→)"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Image Display */}
        <div
          className="transition-transform duration-100 ease-out select-none flex items-center justify-center max-w-full max-h-full"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            cursor: scale > 1 ? 'grab' : 'zoom-in'
          }}
          onClick={handleToggleZoom}
        >
          {imageError ? (
            <div className="bg-neutral-900 border border-neutral-700 p-8 rounded-lg text-center text-neutral-400 space-y-3 max-w-md shadow-2xl">
              <Info className="w-12 h-12 mx-auto text-amber-500" />
              <div className="text-white font-bold text-base">{dish.name}</div>
              <p className="text-xs text-neutral-400">
                图片资源载入异常，可能是网络限制或链接格式问题。
              </p>
              <div className="text-[11px] font-mono text-neutral-500 truncate max-w-xs mx-auto">
                {dish.imageUrl}
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setImageError(false)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs cursor-pointer"
                >
                  重新加载
                </button>
                <button
                  type="button"
                  onClick={handleCopyImageUrl}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs cursor-pointer"
                >
                  复制链接
                </button>
              </div>
            </div>
          ) : (
            <img
              src={dish.imageUrl}
              alt={dish.name}
              className="max-h-[70vh] max-w-[85vw] object-contain rounded-[4px] shadow-2xl pointer-events-none ring-1 ring-white/10"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
          )}
        </div>
      </div>

      {/* 3. Bottom Information & Action Bar */}
      {showInfoPanel && (
        <div className="p-3 sm:p-4 bg-neutral-900/95 border-t border-neutral-800 text-neutral-200 z-20 shrink-0 backdrop-blur-md">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* Left: Dish Meta */}
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base text-white">{dish.name}</span>
                <span className="text-xs text-neutral-400 font-sans">{dish.enName}</span>
                <span className="px-2 py-0.5 rounded text-[11px] bg-neutral-800 text-neutral-300 font-mono border border-neutral-700">
                  {dish.category} {dish.subCategoryName ? `· ${dish.subCategoryName}` : ''}
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  ¥{dish.price.toFixed(2)}
                </span>
                {dish.originalPrice && (
                  <span className="text-xs text-neutral-500 line-through font-mono">
                    ¥{dish.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Parameters & SOP snippet */}
              <div className="flex items-center gap-2 text-xs flex-wrap text-neutral-300">
                <span className="flex items-center gap-1 bg-red-950/60 text-red-300 border border-red-800/40 px-1.5 py-0.5 rounded text-[11px]">
                  <Flame className="w-3 h-3 text-red-400" />
                  <span>{dish.spicinessLevel || '标准辣度'}</span>
                </span>
                <span className="bg-amber-950/60 text-amber-300 border border-amber-800/40 px-1.5 py-0.5 rounded text-[11px]">
                  {dish.flavor || '秘制风味'}
                </span>
                <span className="flex items-center gap-1 bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 px-1.5 py-0.5 rounded text-[11px]">
                  <ChefHat className="w-3 h-3 text-emerald-400" />
                  <span>{dish.cookingStyle || '炭火现烤'}</span>
                </span>
                <span className="flex items-center gap-1 text-neutral-400 font-mono text-[11px]">
                  <Clock className="w-3 h-3" />
                  <span>{dish.prepTime || '约8m'}</span>
                </span>
                {dish.craftStandardNote && (
                  <span className="text-neutral-400 text-[11px] truncate max-w-xs italic hidden lg:inline-block">
                    "{dish.craftStandardNote}"
                  </span>
                )}
              </div>

              {/* Tags */}
              {dish.customTags && dish.customTags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  {dish.customTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Quick Operational Controls */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-emerald-600 transition-colors shadow-xs"
                title="重新上传或从图库更换此菜品图片"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>更换/上传图片</span>
              </button>

              {onEditDish && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditDish(dish);
                  }}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-neutral-700 transition-colors shadow-xs"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>配置参数</span>
                </button>
              )}

              {onToggleAvailability && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleAvailability(dish.id);
                    if (showToast) {
                      showToast(`【${dish.name}】状态已变更为: ${dish.available ? '已沽清下架' : '在售中'}`);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-[3px] font-semibold text-xs flex items-center gap-1.5 cursor-pointer border transition-colors shadow-xs ${
                    dish.available
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                      : 'bg-red-950/80 text-red-300 border-red-700 hover:bg-red-900'
                  }`}
                >
                  {dish.available ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>在售中 (点击沽清)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <span>已沽清 (点击上架)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Re-Upload / Replace Image Modal */}
      {isUploadModalOpen && (
        <DishImageUploadModal
          dish={dish}
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onConfirmImage={(dishId, newImageUrl) => {
            if (onUpdateDish && dish) {
              onUpdateDish({
                ...dish,
                imageUrl: newImageUrl
              });
            }
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};
