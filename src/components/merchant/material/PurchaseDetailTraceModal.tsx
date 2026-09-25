import React, { useState } from 'react';
import {
  X,
  FileText,
  Truck,
  Building2,
  Calendar,
  Phone,
  MapPin,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  DollarSign,
  Clock,
  Printer,
  Edit,
  Save,
  Check,
  Scale
} from 'lucide-react';
import { PurchaseRecord } from '../../../types';

interface PurchaseDetailTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PurchaseRecord | null;
  onUpdateRecord?: (updated: PurchaseRecord) => void;
  showToast: (msg: string) => void;
}

export const PurchaseDetailTraceModal: React.FC<PurchaseDetailTraceModalProps> = ({
  isOpen,
  onClose,
  record,
  onUpdateRecord,
  showToast
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<PurchaseRecord>>({});

  React.useEffect(() => {
    if (record) {
      setForm({
        ...record,
        platformName: record.platformName || '美菜网 (餐饮供应链平台)',
        procurementMethod: record.procurementMethod || '平台采购',
        brand: record.brand || '双汇冷鲜 / 恒阳食品',
        storageMethod: record.storageMethod || '冷冻 -18℃以下',
        flavor: record.flavor || '原味自然醇香',
        productForm: record.productForm || '原切冷冻生胚肉块',
        description: record.description || '精选排酸分割原肉，肉质纹理清晰，适宜串烤出餐，解冻后出水率低。',
        specGramsPerPack: record.specGramsPerPack || 500,
        specPacksPerBox: record.specPacksPerBox || 20,
        specBoxes: record.specBoxes || Math.ceil(record.quantity / 10) || 2,
        specCalculatedKg: record.specCalculatedKg || record.quantity || 20,
        pricePerKg: record.pricePerKg || (record.unitPrice || 42),
        destinationLocation: record.destinationLocation || '流动餐车·静安大悦城站 车载急冻仓 A-01',
        orderTime: record.orderTime || record.timestamp || '2026-09-07 08:30',
        deliveryTime: record.deliveryTime || '2026-09-07 11:15',
        standardCode: record.standardCode || 'GB/T 20575-2020 / GB 2707',
        productionDate: record.productionDate || '2026-09-01',
        manufacturer: record.manufacturer || '中粮安达肉类食品深加工有限公司',
        productionAddress: record.productionAddress || '山东省潍坊市寒亭区现代食品产业园 88 号',
        originPlace: record.originPlace || '中国·山东潍坊',
        hotline: record.hotline || '400-820-9988 / 0536-8889999'
      });
      setIsEditing(false);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  // 动态自动换算总公斤数
  const safeGrams = Number(form.specGramsPerPack) || 500;
  const safePacks = Number(form.specPacksPerBox) || 20;
  const safeBoxes = Number(form.specBoxes) || 2;
  const autoCalculatedKg = ((safeGrams * safePacks * safeBoxes) / 1000);
  const safePricePerKg = Number(form.pricePerKg) || 40;
  const autoTotalAmount = (autoCalculatedKg * safePricePerKg);

  const handleSave = () => {
    if (!record) return;
    const updated: PurchaseRecord = {
      ...record,
      ...form,
      quantity: autoCalculatedKg,
      unitPrice: safePricePerKg,
      totalAmount: autoTotalAmount,
      specCalculatedKg: autoCalculatedKg,
      pricePerKg: safePricePerKg
    };
    if (onUpdateRecord) {
      onUpdateRecord(updated);
    }
    setIsEditing(false);
    showToast(`采购单 [${record.purchaseNo}] 溯源资质档案已更新！`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none border border-[#cbd5e1] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#e2e8f0] bg-[#0f172a] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-none bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold tracking-wide">
                  采购商品全量档案 · 溯源合规与规格履约单
                </h2>
                <span className="font-mono text-xs text-amber-300 bg-amber-950/60 border border-amber-500/40 px-1.5 py-0.2 rounded-none">
                  {record.purchaseNo}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                涵盖采买渠道平台、多级规格换算、食品安全产品标准号、冷链物流时效与原厂溯源
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-1 text-slate-400 hover:text-white rounded-none cursor-pointer"
              title="打印留存"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-none transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* 模式操作条 */}
          <div className="flex items-center justify-between bg-neutral-50 px-3 py-2 border border-neutral-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-800">商品名称:</span>
              <span className="text-sm font-bold text-black">{record.itemName}</span>
              <span className="px-2 py-0.5 bg-neutral-200 text-neutral-700 text-[10px] font-mono">
                {record.category}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3 py-1 bg-black text-white text-xs font-bold rounded-none flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>保存档案修改</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 bg-white border border-neutral-300 hover:border-black text-neutral-800 text-xs font-bold rounded-none flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>编辑商品与采购信息</span>
                </button>
              )}
            </div>
          </div>

          {/* 1. 采购规格与价格计算矩阵 */}
          <div className="border border-neutral-200 p-3.5 rounded-none space-y-2.5">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <span className="font-bold text-neutral-900 flex items-center gap-1.5 text-xs">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>一、采购规格参数与每公斤单价核算</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-700 font-bold">
                规格换算公式: 单包克重(g) × 每箱包数 × 采购件数 ÷ 1000 = 总公斤数
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-neutral-50 p-3 border border-neutral-200">
              {/* 品牌 */}
              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">品牌名称 *</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.brand || ''}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs font-bold text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-bold text-neutral-900 text-xs truncate">{form.brand}</div>
                )}
              </div>

              {/* 单包克重 */}
              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">单包规格克重 (g)</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={form.specGramsPerPack || 500}
                    onChange={(e) => setForm({ ...form, specGramsPerPack: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs font-mono font-bold text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-mono font-bold text-neutral-900 text-xs">{form.specGramsPerPack} g/包</div>
                )}
              </div>

              {/* 每箱包数 */}
              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">每件/箱包数</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={form.specPacksPerBox || 20}
                    onChange={(e) => setForm({ ...form, specPacksPerBox: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs font-mono font-bold text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-mono font-bold text-neutral-900 text-xs">{form.specPacksPerBox} 包/件</div>
                )}
              </div>

              {/* 采购件数 */}
              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">采购件数 (件/箱)</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={form.specBoxes || 2}
                    onChange={(e) => setForm({ ...form, specBoxes: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs font-mono font-bold text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-mono font-bold text-neutral-900 text-xs">{form.specBoxes} 件</div>
                )}
              </div>

              {/* 折合总公斤数 */}
              <div className="bg-emerald-50 p-1.5 border border-emerald-300 text-right">
                <div className="text-[10px] text-emerald-800 font-bold">约等于公斤数</div>
                <div className="text-base font-mono font-bold text-emerald-700 mt-0.5">
                  {autoCalculatedKg.toFixed(2)} kg
                </div>
              </div>
            </div>

            {/* 公斤单价与总采购金额 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-100">
              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">
                  每公斤单价是多少钱 (¥/kg) *
                </label>
                {isEditing ? (
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-xs">¥</span>
                    <input
                      type="number"
                      step="0.5"
                      value={form.pricePerKg || 40}
                      onChange={(e) => setForm({ ...form, pricePerKg: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-neutral-300 pl-6 pr-2 py-1 text-xs font-mono font-bold text-neutral-900 rounded-none focus:outline-none focus:border-black"
                    />
                  </div>
                ) : (
                  <div className="font-mono font-bold text-neutral-900 text-sm">
                    ¥{Number(form.pricePerKg || 40).toFixed(2)} /kg
                  </div>
                )}
              </div>

              <div>
                <div className="text-[11px] text-neutral-600 font-medium mb-1">单件折合金额</div>
                <div className="font-mono font-bold text-neutral-800 text-sm mt-1">
                  ¥{((safeGrams * safePacks / 1000) * safePricePerKg).toFixed(2)} /件
                </div>
              </div>

              <div className="text-right sm:text-right">
                <div className="text-[11px] text-neutral-600 font-medium mb-1">采购单总采购金额</div>
                <div className="text-lg font-mono font-bold text-emerald-600">
                  ¥{autoTotalAmount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* 2. 采购平台渠道与商品属性 */}
          <div className="border border-neutral-200 p-3.5 rounded-none space-y-2.5">
            <span className="font-bold text-neutral-900 flex items-center gap-1.5 text-xs border-b border-neutral-200 pb-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span>二、采买渠道、存储温区与风味形态属性</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">
                  平台名称 / 采购渠道 *
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.platformName || ''}
                    onChange={(e) => setForm({ ...form, platformName: e.target.value })}
                    placeholder="如：美菜网、快驴进货、新发地农贸"
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-bold text-neutral-900 text-xs">{form.platformName}</div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">采购方式 *</label>
                {isEditing ? (
                  <select
                    value={form.procurementMethod || '平台采购'}
                    onChange={(e) => setForm({ ...form, procurementMethod: e.target.value })}
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  >
                    <option value="平台采购">电商供应链平台 (美菜/快驴等)</option>
                    <option value="某个批发市场线下直采">批发市场线下直采 (新发地/江桥等)</option>
                    <option value="某个批发市场小程序">批发市场微信小程序渠道</option>
                    <option value="厂家源头直供">厂家源头冷链直供</option>
                  </select>
                ) : (
                  <div className="font-medium text-neutral-800 text-xs">{form.procurementMethod}</div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">存储方式 / 温区 *</label>
                {isEditing ? (
                  <select
                    value={form.storageMethod || '冷冻 -18℃以下'}
                    onChange={(e) => setForm({ ...form, storageMethod: e.target.value })}
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  >
                    <option value="冷冻 -18℃以下">冷冻 -18℃以下 (硬核锁鲜)</option>
                    <option value="微冻 -2~0℃">微冻 -2~0℃ (排酸待烤)</option>
                    <option value="冷藏 0~4℃">冷藏 0~4℃ (果蔬保鲜)</option>
                    <option value="常温避光干燥">常温避光干燥 (料包干货)</option>
                  </select>
                ) : (
                  <div className="font-medium text-neutral-800 text-xs">{form.storageMethod}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">产品口味</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.flavor || ''}
                    onChange={(e) => setForm({ ...form, flavor: e.target.value })}
                    placeholder="如：奥尔良、孜然、麻辣、原味"
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-medium text-neutral-800 text-xs">{form.flavor}</div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">产品形态</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.productForm || ''}
                    onChange={(e) => setForm({ ...form, productForm: e.target.value })}
                    placeholder="如：冷冻原切肉块、腌制生胚、手工穿制串"
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-medium text-neutral-800 text-xs">{form.productForm}</div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">保质期 (天/月)</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.notes || '12个月 (-18℃密封)'}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="如：12个月 / 7天"
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-medium text-neutral-800 text-xs">{form.notes || '12个月'}</div>
                )}
              </div>
            </div>

            {/* 商品描述信息 */}
            <div className="pt-1">
              <label className="block text-[11px] text-neutral-600 font-medium mb-1">商品描述信息</label>
              {isEditing ? (
                <textarea
                  rows={2}
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-white border border-neutral-300 p-2 text-xs text-neutral-900 rounded-none focus:outline-none focus:border-black"
                />
              ) : (
                <div className="text-neutral-700 text-xs bg-neutral-50 p-2 border border-neutral-200 leading-relaxed">
                  {form.description}
                </div>
              )}
            </div>
          </div>

          {/* 3. 物流配送与履约时间戳 */}
          <div className="border border-neutral-200 p-3.5 rounded-none space-y-2.5">
            <span className="font-bold text-neutral-900 flex items-center gap-1.5 text-xs border-b border-neutral-200 pb-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>三、冷链物流配送与交接时效</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">
                  配送到达指定地点 *
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.destinationLocation || ''}
                    onChange={(e) => setForm({ ...form, destinationLocation: e.target.value })}
                    placeholder="如：餐车站台·车载急冻抽屉 A-01"
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-bold text-neutral-900 text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                    <span>{form.destinationLocation}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">下单时间 *</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.orderTime || ''}
                    onChange={(e) => setForm({ ...form, orderTime: e.target.value })}
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs font-mono text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-mono text-neutral-800 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span>{form.orderTime}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">送达时间 *</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.deliveryTime || ''}
                    onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs font-mono text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-mono text-neutral-800 text-xs flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>{form.deliveryTime}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. 产品执行标准号与原厂溯源信息 */}
          <div className="border border-neutral-200 p-3.5 rounded-none space-y-2.5">
            <span className="font-bold text-neutral-900 flex items-center gap-1.5 text-xs border-b border-neutral-200 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>四、食品安全执行标准号与生产商资质溯源</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">产品标准号 *</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.standardCode || ''}
                    onChange={(e) => setForm({ ...form, standardCode: e.target.value })}
                    placeholder="如：GB/T 20575 / GB 2707"
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs font-mono font-bold text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-mono font-bold text-neutral-900 text-xs">{form.standardCode}</div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">生产日期 *</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={form.productionDate || ''}
                    onChange={(e) => setForm({ ...form, productionDate: e.target.value })}
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs font-mono text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-mono text-neutral-800 text-xs">{form.productionDate}</div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">产地 (原产国/省市) *</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.originPlace || ''}
                    onChange={(e) => setForm({ ...form, originPlace: e.target.value })}
                    placeholder="如：中国·山东潍坊"
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-medium text-neutral-800 text-xs">{form.originPlace}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">生产商全称 *</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.manufacturer || ''}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-medium text-neutral-800 text-xs truncate">{form.manufacturer}</div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">生产工厂地址 *</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.productionAddress || ''}
                    onChange={(e) => setForm({ ...form, productionAddress: e.target.value })}
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-medium text-neutral-800 text-xs truncate">{form.productionAddress}</div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">销售与售后热线 *</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.hotline || ''}
                    onChange={(e) => setForm({ ...form, hotline: e.target.value })}
                    className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs font-mono text-neutral-900 rounded-none focus:outline-none focus:border-black"
                  />
                ) : (
                  <div className="font-mono text-neutral-800 text-xs flex items-center gap-1">
                    <Phone className="w-3 h-3 text-neutral-400" />
                    <span>{form.hotline}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-100 rounded-none text-xs font-semibold cursor-pointer"
          >
            关闭返回
          </button>
          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-black text-white rounded-none text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存履约档案</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
