import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Download,
  Copy,
  Check,
  Zap,
  ShoppingBag,
  CreditCard,
  Sparkles,
  ExternalLink,
  Layers
} from 'lucide-react';
import { DishItem, DishVariant } from '../../types';
import {
  buildSingleDishQrUrl,
  generateQrCodeDataUrl,
  SingleDishQrParams
} from '../../utils/qrCodeEngine';

interface DishQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  dish: DishItem | null;
  initialVariantId?: string | null;
  initialQty?: number;
  onTriggerDirectAction?: (params: SingleDishQrParams) => void;
  showToast?: (title: string, desc?: string) => void;
}

export const DishQrCodeModal: React.FC<DishQrCodeModalProps> = ({
  isOpen,
  onClose,
  dish,
  initialVariantId,
  initialQty = 1,
  onTriggerDirectAction,
  showToast
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    initialVariantId || ''
  );
  const [actionType, setActionType] = useState<'add_to_cart' | 'quick_pay'>('add_to_cart');
  const [quantity, setQuantity] = useState<number>(initialQty);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    if (initialVariantId !== undefined) {
      setSelectedVariantId(initialVariantId || '');
    }
  }, [initialVariantId]);

  useEffect(() => {
    if (!dish || !isOpen) return;

    // Find current variant
    const currentVar = dish.variants?.find((v) => v.id === selectedVariantId);

    const generatedUrl = buildSingleDishQrUrl({
      dishId: dish.id,
      variantId: currentVar?.id,
      qty: quantity,
      action: actionType
    });

    setQrUrl(generatedUrl);
    setIsGenerating(true);

    generateQrCodeDataUrl(generatedUrl, {
      width: 380,
      margin: 2,
      darkColor: actionType === 'quick_pay' ? '#0f172a' : '#1e293b',
      lightColor: '#ffffff'
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Failed to generate dish QR code:', err);
      })
      .finally(() => {
        setIsGenerating(false);
      });
  }, [dish, isOpen, selectedVariantId, actionType, quantity]);

  if (!isOpen || !dish) return null;

  const activeVariant = dish.variants?.find((v) => v.id === selectedVariantId);
  const effectivePrice = activeVariant ? activeVariant.price : dish.price;

  const handleCopyLink = () => {
    if (!qrUrl) return;
    navigator.clipboard?.writeText(qrUrl);
    setIsCopied(true);
    showToast?.('已复制扫码点餐直连链接', '可粘贴至微信或浏览器测试');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    const variantName = activeVariant?.name ? `-${activeVariant.name}` : '';
    link.download = `点餐码-${dish.name}${variantName}-${actionType}.png`;
    link.href = qrDataUrl;
    link.click();
    showToast?.('已保存真实二维码图片', '可直接打印张贴于餐牌或桌面');
  };

  const handleSimulateScan = () => {
    if (onTriggerDirectAction) {
      onTriggerDirectAction({
        dishId: dish.id,
        variantId: activeVariant?.id,
        qty: quantity,
        action: actionType
      });
      onClose();
    } else {
      // Direct jump via window location
      window.location.href = qrUrl;
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-mono">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
                菜品专属二维码（单点/直付）
              </h2>
              <p className="text-[11px] text-neutral-500">
                真实标准 QR Code · 任意扫码工具即扫即入
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-neutral-200/60 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Dish Basic Info */}
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
            <img
              src={dish.imageUrl}
              alt={dish.name}
              className="w-12 h-12 rounded-lg object-cover border border-neutral-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-900 truncate">
                  {dish.name}
                </h3>
                <span className="text-xs font-extrabold text-orange-600 font-mono">
                  ¥{effectivePrice}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                {dish.category} · {activeVariant ? `规格: ${activeVariant.name}` : '标准规格'}
              </p>
            </div>
          </div>

          {/* Action Mode Toggle */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-700 mb-1.5">
              扫码执行动作引擎配置
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActionType('add_to_cart')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                  actionType === 'add_to_cart'
                    ? 'border-orange-500 bg-orange-50/80 text-orange-700 shadow-2xs'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>自动扫码添加购物车</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('quick_pay')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                  actionType === 'quick_pay'
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-2xs'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>自动扫码跳转直接支付</span>
              </button>
            </div>
          </div>

          {/* Variants Selector (if any) */}
          {dish.variants && dish.variants.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1.5 flex items-center justify-between">
                <span>绑定特定菜品规格</span>
                <span className="text-neutral-400 font-normal">扫码直接选定该规格</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedVariantId('')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    !selectedVariantId
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  默认标准
                </button>
                {dish.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      selectedVariantId === variant.id
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {variant.name} (¥{variant.price})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center justify-between bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
            <span className="text-xs font-medium text-neutral-700">扫单码默认加购份数</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-6 h-6 rounded-md bg-white border border-neutral-200 flex items-center justify-center text-xs text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                -
              </button>
              <span className="text-xs font-bold font-mono px-1.5">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-6 h-6 rounded-md bg-white border border-neutral-200 flex items-center justify-center text-xs text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Real QR Code Display */}
          <div className="flex flex-col items-center justify-center p-4 bg-white border border-neutral-200 rounded-2xl shadow-xs relative">
            {isGenerating ? (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-neutral-400">
                生成高精度二维码中...
              </div>
            ) : qrDataUrl ? (
              <div className="relative group">
                <img
                  src={qrDataUrl}
                  alt="扫码点餐真实二维码"
                  className="w-52 h-52 object-contain rounded-lg p-1 bg-white"
                />
                <div className="absolute inset-x-0 bottom-1 text-center">
                  <span className="text-[10px] font-bold bg-white/95 px-2 py-0.5 rounded-full border border-neutral-200 text-neutral-700 shadow-xs">
                    {actionType === 'add_to_cart' ? '🛒 扫码自动加购' : '⚡ 扫码秒速直付'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-red-500">
                二维码生成失败
              </div>
            )}
            <p className="text-[10.5px] text-neutral-400 mt-2 font-mono text-center max-w-[280px] truncate">
              {qrUrl}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="py-2 px-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">已复制链接</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-500" />
                  <span>复制点餐直链</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadQr}
              className="py-2 px-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-neutral-500" />
              <span>下载二维码图片</span>
            </button>
          </div>

          {/* Immediate Simulation Test Button */}
          <button
            type="button"
            onClick={handleSimulateScan}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs cursor-pointer ${
              actionType === 'quick_pay'
                ? 'bg-neutral-900 hover:bg-black text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>
              {actionType === 'quick_pay'
                ? '立即触发测试：扫码秒速跳转直接支付'
                : '立即触发测试：自动扫码添加购物车'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DishQrCodeModal;
