import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  QrCode,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  Zap,
  ShoppingBag,
  Sparkles,
  Utensils,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { DishItem } from '../../types';
import {
  buildComboQrUrl,
  generateQrCodeDataUrl,
  ComboQrItem,
  ComboQrParams
} from '../../utils/qrCodeEngine';

interface ComboQrGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  dishes: DishItem[];
  onTriggerDirectComboAction?: (params: ComboQrParams) => void;
  showToast?: (title: string, desc?: string) => void;
}

export const ComboQrGeneratorModal: React.FC<ComboQrGeneratorModalProps> = ({
  isOpen,
  onClose,
  dishes,
  onTriggerDirectComboAction,
  showToast
}) => {
  const [comboName, setComboName] = useState<string>('招牌深夜双人烧烤套餐');
  const [actionType, setActionType] = useState<'combo_cart' | 'combo_pay'>('combo_cart');
  const [selectedItems, setSelectedItems] = useState<ComboQrItem[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Initialize with 2 default popular items
  useEffect(() => {
    if (dishes.length >= 2 && selectedItems.length === 0) {
      const d1 = dishes[0];
      const d2 = dishes[1];
      setSelectedItems([
        {
          dishId: d1.id,
          dishName: d1.name,
          variantId: d1.variants?.[0]?.id,
          variantName: d1.variants?.[0]?.name,
          price: d1.variants?.[0]?.price || d1.price,
          qty: 1
        },
        {
          dishId: d2.id,
          dishName: d2.name,
          variantId: d2.variants?.[0]?.id,
          variantName: d2.variants?.[0]?.name,
          price: d2.variants?.[0]?.price || d2.price,
          qty: 2
        }
      ]);
    }
  }, [dishes]);

  const totalPrice = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [selectedItems]);

  useEffect(() => {
    if (!isOpen || selectedItems.length === 0) return;

    const generatedUrl = buildComboQrUrl({
      comboName: comboName || '特惠精选组合套餐',
      items: selectedItems,
      action: actionType
    });

    setQrUrl(generatedUrl);
    setIsGenerating(true);

    generateQrCodeDataUrl(generatedUrl, {
      width: 380,
      margin: 2,
      darkColor: actionType === 'combo_pay' ? '#09090b' : '#1e1b4b',
      lightColor: '#ffffff'
    })
      .then((data) => setQrDataUrl(data))
      .catch((err) => console.error('Failed to generate combo QR code:', err))
      .finally(() => setIsGenerating(false));
  }, [isOpen, comboName, selectedItems, actionType]);

  if (!isOpen) return null;

  const handleAddItem = (dish: DishItem) => {
    const existing = selectedItems.find((i) => i.dishId === dish.id);
    if (existing) {
      setSelectedItems(
        selectedItems.map((i) => (i.dishId === dish.id ? { ...i, qty: i.qty + 1 } : i))
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          dishId: dish.id,
          dishName: dish.name,
          variantId: dish.variants?.[0]?.id,
          variantName: dish.variants?.[0]?.name,
          price: dish.variants?.[0]?.price || dish.price,
          qty: 1
        }
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, idx) => idx !== index));
  };

  const handleUpdateQty = (index: number, delta: number) => {
    setSelectedItems(
      selectedItems
        .map((item, idx) => {
          if (idx !== index) return item;
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        })
        .filter(Boolean) as ComboQrItem[]
    );
  };

  const handleCopyLink = () => {
    if (!qrUrl) return;
    navigator.clipboard?.writeText(qrUrl);
    setIsCopied(true);
    showToast?.('已复制套餐单码多点链接', '食客扫码或点击将批量多点加购');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `套餐单码多点-${comboName || '套餐'}.png`;
    link.href = qrDataUrl;
    link.click();
    showToast?.('已导出套餐真实可用二维码', '可用于桌贴海报或宣传页');
  };

  const handleSimulateScan = () => {
    if (onTriggerDirectComboAction) {
      onTriggerDirectComboAction({
        comboName: comboName || '精选组合套餐',
        items: selectedItems,
        action: actionType
      });
      onClose();
    } else {
      window.location.href = qrUrl;
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 tracking-tight">
                套餐组合·单码多点配置引擎
              </h2>
              <p className="text-xs text-neutral-500">
                配置多个菜品/规格生成唯一真实二维码 · 食客一扫批量全加购或秒付
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-200/60 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Combo Items Configuration (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            {/* Combo Name */}
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                套餐名称
              </label>
              <input
                type="text"
                value={comboName}
                onChange={(e) => setComboName(e.target.value)}
                placeholder="例如：双人招牌汉堡烤串狂欢套餐"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Action Type */}
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                扫码后动作引擎
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActionType('combo_cart')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                    actionType === 'combo_cart'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-2xs'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>自动全部加入购物车</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('combo_pay')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                    actionType === 'combo_pay'
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-2xs'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>自动跳转直接支付收银</span>
                </button>
              </div>
            </div>

            {/* Configured Items List */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-indigo-600" />
                  <span>套餐包含餐品（{selectedItems.length} 道）</span>
                </label>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  总计: ¥{totalPrice}
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {selectedItems.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-neutral-300 text-center text-xs text-neutral-400">
                    请从下方快速添加菜品至套餐组合
                  </div>
                ) : (
                  selectedItems.map((item, idx) => (
                    <div
                      key={`${item.dishId}-${idx}`}
                      className="p-2.5 rounded-xl border border-neutral-100 bg-neutral-50 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-neutral-900 truncate">
                            {item.dishName}
                          </span>
                          {item.variantName && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                              {item.variantName}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-neutral-500">
                          ¥{item.price} / 份
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="flex items-center space-x-1 bg-white border border-neutral-200 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, -1)}
                            className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-xs font-bold font-mono">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, 1)}
                            className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-neutral-400 hover:text-red-500 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Add From Menu */}
            <div>
              <span className="block text-[11px] font-bold text-neutral-500 mb-1.5">
                快速添加更多菜品入套餐
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {dishes.slice(0, 10).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleAddItem(d)}
                    className="px-2 py-1 rounded-lg text-xs bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-700 border border-neutral-200 transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-neutral-400" />
                    <span className="truncate max-w-[110px]">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Real QR Code View & Actions (5 cols) */}
          <div className="md:col-span-5 flex flex-col items-center justify-between border-t md:border-t-0 md:border-l border-neutral-100 pt-4 md:pt-0 md:pl-6 space-y-4">
            <div className="text-center w-full">
              <span className="text-xs font-bold text-neutral-800">
                套餐真实扫码二维码
              </span>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                支持微信、系统相机、支付宝扫码
              </p>
            </div>

            {/* QR Code Canvas/Image */}
            <div className="p-3 bg-white border border-neutral-200 rounded-2xl shadow-xs flex flex-col items-center w-full max-w-[240px]">
              {isGenerating ? (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-neutral-400">
                  生成套餐二维码中...
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="套餐单码多点二维码"
                  className="w-48 h-48 object-contain rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-red-500">
                  请选择至少一道菜品
                </div>
              )}
              <div className="mt-2 text-center">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {actionType === 'combo_cart' ? '🛒 扫码批量全加购' : '⚡ 扫码秒速直达支付'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-2">
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2 px-2.5 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 flex items-center justify-center space-x-1 transition cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-neutral-500" />
                      <span>复制链接</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="py-2 px-2.5 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 flex items-center justify-center space-x-1 transition cursor-pointer"
                >
                  <Download className="w-3 h-3 text-neutral-500" />
                  <span>导出二维码</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSimulateScan}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>立即触发引擎测试（单码多点）</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComboQrGeneratorModal;
