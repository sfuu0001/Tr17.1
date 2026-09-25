import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Sliders, 
  Printer, 
  QrCode, 
  Wifi, 
  Check, 
  RotateCcw, 
  Eye, 
  EyeOff,
  Utensils, 
  ShoppingBag, 
  Bike, 
  Scissors, 
  FileText,
  Smartphone,
  CheckCircle2,
  Edit3,
  Save,
  Sparkles,
  Info,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  Plus
} from 'lucide-react';
import { ReceiptTemplateConfig, Order, DishItem } from '../../../types';
import { INITIAL_RECEIPT_TEMPLATE } from '../../../data/merchantExtendedMockData';

interface ReceiptPaperTemplateEditorProps {
  template: ReceiptTemplateConfig;
  onSaveTemplate: (newTemplate: ReceiptTemplateConfig) => void;
  orders: Order[];
  dishes: DishItem[];
  showToast: (msg: string) => void;
}

/**
 * 实时打样所见即所得行内编辑组件
 */
interface InlineEditableTextProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  isMultiline?: boolean;
  align?: 'left' | 'center' | 'right';
  labelTip?: string;
}

const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  value,
  onChange,
  placeholder = '点击输入...',
  className = '',
  inputClassName = '',
  isMultiline = false,
  align = 'left',
  labelTip
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCommit = () => {
    setIsEditing(false);
    if (tempValue !== value) {
      onChange(tempValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isMultiline) {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div 
        className="relative inline-block w-full z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {isMultiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            rows={2}
            style={{ fontSize: '16px', touchAction: 'manipulation' }}
            className={`w-full px-2 py-1 bg-white border-2 border-dashed border-emerald-600 rounded-md text-neutral-900 shadow-lg text-base md:text-xs leading-relaxed focus:outline-none ring-2 ring-emerald-500/20 text-${align} ${inputClassName}`}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            style={{ fontSize: '16px', touchAction: 'manipulation' }}
            className={`w-full px-2 py-0.5 bg-white border-2 border-dashed border-emerald-600 rounded-md text-neutral-900 shadow-lg text-base md:text-xs focus:outline-none ring-2 ring-emerald-500/20 text-${align} ${inputClassName}`}
          />
        )}
        <span className="absolute -bottom-4 right-0 text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded shadow-2xs pointer-events-none select-none">
          回车保存 · Esc取消
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title={labelTip || '点击原地修改字段'}
      className={`group relative inline-flex items-center cursor-pointer transition-all duration-150 rounded px-1 -mx-1 border border-dashed border-emerald-400/60 bg-emerald-50/20 hover:border-emerald-600 hover:bg-emerald-50/70 hover:shadow-2xs ${className}`}
      style={{ touchAction: 'manipulation' }}
    >
      <span className={!value ? 'text-neutral-400 italic text-[11px]' : ''}>
        {value || placeholder}
      </span>
      <Edit3 className="w-3 h-3 text-emerald-600 opacity-60 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
    </div>
  );
};

export const ReceiptPaperTemplateEditor: React.FC<ReceiptPaperTemplateEditorProps> = ({
  template: initialTemplate,
  onSaveTemplate,
  orders,
  dishes,
  showToast
}) => {
  const [template, setTemplate] = useState<ReceiptTemplateConfig>(initialTemplate);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeChannelTab, setActiveChannelTab] = useState<'dine_in' | 'pickup' | 'delivery'>('dine_in');
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');

  // 动态生成真实模拟预览订单
  const currentOrder = useMemo<Order>(() => {
    const found = orders.find(o => o.id === selectedOrderId);
    if (found) {
      return {
        ...found,
        tableCode: found.tableCode || 'A-08',
        tableZone: found.tableZone || '餐车外摆休闲区',
        dinerCount: found.dinerCount || 4,
        pickupCode: found.pickupCode || '6812',
        pickupShelfCode: found.pickupShelfCode || '02号保温自提柜',
        deliveryAddress: found.deliveryAddress || '黑石科技园区 1 号楼 B 座 1204 室',
        channelType: activeChannelTab
      };
    }

    const realItems = (dishes && dishes.length > 0 ? dishes.slice(0, 3) : []).map((d, i) => ({
      name: d.name,
      quantity: i === 0 ? 2 : 1,
      price: d.price,
      options: (d as any).options?.[0] || '标准出品'
    }));

    const total = realItems.reduce((acc, it) => acc + it.price * it.quantity, 0);

    return {
      id: 'ord-mock-sample',
      orderNo: '#A108',
      customerName: '流动餐车食客',
      userPhone: '138****0000',
      items: realItems.length > 0 ? realItems : [
        { name: '现烤招牌羊肉大串', quantity: 4, price: 48.0, options: '微辣 · 孜然' },
        { name: '手作鲜柠檬冷萃茶', quantity: 2, price: 36.0, options: '少冰 · 七分糖' }
      ],
      totalAmount: total > 0 ? total : 84.0,
      status: 'cooking',
      statusText: '制作中',
      createdTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      estimatedDeliveryTime: '30分钟后',
      etaMinutes: 25,
      deliveryAddress: '黑石科技园区 1 号楼 B 座 1204 室',
      tableCode: 'A-08',
      tableZone: '餐车外摆休闲区',
      dinerCount: 4,
      pickupCode: '6812',
      pickupShelfCode: '02号保温自提柜',
      truckName: 'Urban Radar 流动餐车',
      progressPercent: 30,
      channelType: activeChannelTab
    };
  }, [orders, dishes, selectedOrderId, activeChannelTab]);

  // 修改字段函数
  const handleUpdateField = <K extends keyof ReceiptTemplateConfig>(key: K, value: ReceiptTemplateConfig[K]) => {
    setTemplate(prev => {
      const updated = { ...prev, [key]: value };
      setHasUnsavedChanges(true);
      return updated;
    });
  };

  // 保存当前模板
  const handleSaveAll = () => {
    onSaveTemplate(template);
    setHasUnsavedChanges(false);
    showToast('小票打样模板已成功保存，全站档口打印机同步生效！');
  };

  // 恢复初始配置
  const handleResetToDefault = () => {
    setTemplate(INITIAL_RECEIPT_TEMPLATE);
    onSaveTemplate(INITIAL_RECEIPT_TEMPLATE);
    setHasUnsavedChanges(false);
    showToast('小票模板已重置为系统初始预设！');
  };

  // 触发浏览器打印预览
  const handleBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* ================================================================= */}
      {/* 1. 顶部操作调度栏 (单排一体化 + 保存状态 + 场景切换) */}
      {/* ================================================================= */}
      <div className="bg-white rounded-xl border border-neutral-200/90 p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-900">
                小票实时打样与所见即所得定制
              </h3>
              {hasUnsavedChanges ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  有未保存修改
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" />
                  已全部保存
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              无需繁琐表单：直接点击下方打样小票上的任意标题、文本、开关即可就地修改！
            </p>
          </div>
        </div>

        {/* 右侧：保存与还原核心操作按钮 */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="h-8 px-3 rounded-lg border border-neutral-200/90 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="重置为系统默认的小票预设模板"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
            <span>恢复默认</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className={`h-8 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98] ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 ring-2 ring-emerald-500/20 animate-pulse'
                : 'bg-neutral-900 hover:bg-black text-white'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>保存小票模板</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. 打样视口控制条 (纸宽切换 58mm/80mm + 3大就餐场景胶囊切换) */}
      {/* ================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-neutral-200/90 p-2 shadow-2xs">
        {/* 左侧：3大就餐场景快速切换 (堂食 / 自提 / 外卖) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[11px] font-bold text-neutral-400 px-1 shrink-0">
            打样联别:
          </span>

          <button
            type="button"
            onClick={() => setActiveChannelTab('dine_in')}
            className={`h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-2xs active:scale-[0.98] ${
              activeChannelTab === 'dine_in'
                ? 'bg-white text-neutral-950 border-[1.5px] border-neutral-900 shadow-xs ring-1.5 ring-neutral-900/10'
                : 'bg-white text-neutral-600 border border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
          >
            <Utensils className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>堂食桌台联</span>
            {activeChannelTab === 'dine_in' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveChannelTab('pickup')}
            className={`h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-2xs active:scale-[0.98] ${
              activeChannelTab === 'pickup'
                ? 'bg-white text-neutral-950 border-[1.5px] border-neutral-900 shadow-xs ring-1.5 ring-neutral-900/10'
                : 'bg-white text-neutral-600 border border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>自提核销联</span>
            {activeChannelTab === 'pickup' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveChannelTab('delivery')}
            className={`h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-2xs active:scale-[0.98] ${
              activeChannelTab === 'delivery'
                ? 'bg-white text-neutral-950 border-[1.5px] border-neutral-900 shadow-xs ring-1.5 ring-neutral-900/10'
                : 'bg-white text-neutral-600 border border-neutral-200/90 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
          >
            <Bike className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>专送外卖联</span>
            {activeChannelTab === 'delivery' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* 右侧：热敏纸卷规格 (58mm 随车便携 / 80mm 档口宽幅) */}
        <div className="flex items-center gap-1 p-0.5 bg-neutral-100 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setPaperWidth('58mm')}
            className={`h-7 px-2.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              paperWidth === '58mm' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            58mm 便携随车
          </button>
          <button
            type="button"
            onClick={() => setPaperWidth('80mm')}
            className={`h-7 px-2.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              paperWidth === '80mm' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            80mm 档口宽幅
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. 核心主舞台：实时打样预览与所见即所得编辑纸张 (WYSIWYG Live Canvas) */}
      {/* ================================================================= */}
      <div 
        className="bg-neutral-100/70 border border-neutral-200/80 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center min-h-[580px] relative overflow-hidden"
        style={{ touchAction: 'manipulation' }}
      >
        {/* 背景轻点阵纹理与居中提示 */}
        <div className="absolute top-3 left-4 flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium select-none pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>所见即所得编辑器：点击纸样上任意虚线框文字直接修改 (已锁定 1:1 原画防缩放)</span>
        </div>

        {/* 顶部真实打印出纸口效果模拟 */}
        <div className="w-48 sm:w-64 h-2 bg-neutral-300 rounded-full shadow-inner mb-2" />

        {/* 核心虚拟热敏小票纸张 */}
        <div
          className={`w-full bg-[#fffffb] text-neutral-900 p-5 sm:p-6 border border-neutral-300/90 rounded-b-xl shadow-xl shadow-neutral-950/5 space-y-3.5 select-none relative transition-colors ${
            paperWidth === '58mm' ? 'max-w-[320px] text-[11px]' : 'max-w-[420px] text-xs'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          {/* 顶部小票联别提示 (点击即可行内修改标题) */}
          <div className="text-center pb-2 border-b border-dashed border-neutral-300 space-y-1">
            <div className="flex items-center justify-center">
              {activeChannelTab === 'dine_in' && (
                <InlineEditableText
                  value={template.dineInTitle || '堂食出单联'}
                  onChange={(val) => handleUpdateField('dineInTitle', val)}
                  placeholder="堂食出单联"
                  className="font-bold text-[11px] text-neutral-500 tracking-wide"
                  align="center"
                  labelTip="点击修改堂食联别标题"
                />
              )}
              {activeChannelTab === 'pickup' && (
                <InlineEditableText
                  value={template.pickupTitle || '顾客自提联'}
                  onChange={(val) => handleUpdateField('pickupTitle', val)}
                  placeholder="顾客自提联"
                  className="font-bold text-[11px] text-neutral-500 tracking-wide"
                  align="center"
                  labelTip="点击修改自提联别标题"
                />
              )}
              {activeChannelTab === 'delivery' && (
                <InlineEditableText
                  value={template.deliveryTitle || '专送外卖联 (骑手/封口)'}
                  onChange={(val) => handleUpdateField('deliveryTitle', val)}
                  placeholder="专送外卖联"
                  className="font-bold text-[11px] text-neutral-500 tracking-wide"
                  align="center"
                  labelTip="点击修改外卖联别标题"
                />
              )}
            </div>

            {/* 顾客联标识微标签 (可点击开启/关闭或修改文字) */}
            <div className="flex items-center justify-center gap-1 pt-0.5">
              <InlineEditableText
                value={template.customerCopyText || '【顾客联 · 请妥善保管小票】'}
                onChange={(val) => handleUpdateField('customerCopyText', val)}
                placeholder="点击设置联单说明文字"
                className="text-[10px] text-neutral-400 font-medium"
                align="center"
                labelTip="点击修改顾客联说明语"
              />
            </div>

            {/* 商户/餐车主抬头 (大字粗体，所见即所得修改) */}
            <div className="pt-1">
              <InlineEditableText
                value={template.headerTitle}
                onChange={(val) => handleUpdateField('headerTitle', val)}
                placeholder="点击输入商户/餐车名称"
                className="font-black text-base sm:text-lg tracking-tight text-neutral-950 block text-center"
                inputClassName="text-center font-black text-sm"
                align="center"
                labelTip="点击修改商户品牌/餐车名称"
              />
            </div>

            {/* 副标题 / Slogan */}
            <div>
              <InlineEditableText
                value={template.subHeader}
                onChange={(val) => handleUpdateField('subHeader', val)}
                placeholder="+ 点击添加副标题 / 特色标语"
                className="text-[11px] text-neutral-500 block text-center"
                inputClassName="text-center text-xs"
                align="center"
                labelTip="点击修改副标题或特色标语"
              />
            </div>

            {/* 流水单号 (大字展示，支持点击切换是否显示) */}
            <div className="pt-1.5 flex items-center justify-center gap-1.5">
              <div
                onClick={() => handleUpdateField('showOrderNo', !template.showOrderNo)}
                title={template.showOrderNo ? '点击隐藏订单号' : '点击显示订单号'}
                className={`cursor-pointer transition-all px-2 py-0.5 rounded border ${
                  template.showOrderNo
                    ? 'border-transparent font-black text-2xl sm:text-3xl text-neutral-950 tracking-wider hover:border-emerald-500 hover:border-dashed hover:bg-emerald-50/50'
                    : 'border-dashed border-neutral-300 text-neutral-400 text-xs italic'
                }`}
              >
                {template.showOrderNo ? currentOrder.orderNo : '【订单号已隐藏 · 点击开启】'}
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* 场景核心主字段区域 (桌台 / 取餐码 / 外卖地址) */}
          {/* ============================================================= */}
          <div className="py-2 border-b border-dashed border-neutral-300 space-y-1.5 text-center">
            {/* 堂食专属字段 */}
            {activeChannelTab === 'dine_in' && (
              <div className="space-y-1">
                <div className="text-[10px] text-neutral-400 flex items-center justify-center gap-1">
                  <span>堂食桌台</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateField('showDineInTableBig', !template.showDineInTableBig)}
                    className="text-[9px] px-1 py-0.2 rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    title="切换桌号字号"
                  >
                    {template.showDineInTableBig !== false ? '大字模式' : '标准字号'}
                  </button>
                </div>

                <div className={`font-black text-neutral-900 ${template.showDineInTableBig !== false ? 'text-2xl tracking-wider' : 'text-base'}`}>
                  {currentOrder.tableCode || 'A-08'}
                </div>

                <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-600">
                  <InlineEditableText
                    value={template.dineInZoneNotice || '餐车外摆休闲区'}
                    onChange={(val) => handleUpdateField('dineInZoneNotice', val)}
                    placeholder="点击修改就餐区域描述"
                    className="text-neutral-600"
                    labelTip="点击修改就餐区域描述"
                  />
                  <span>· 就餐人数: {currentOrder.dinerCount || 4} 位</span>
                </div>
              </div>
            )}

            {/* 自提专属字段 */}
            {activeChannelTab === 'pickup' && (
              <div className="space-y-1">
                <div className="text-[10px] text-neutral-400">取餐核销校验码</div>
                <div className="font-black text-2xl tracking-widest text-emerald-800">
                  {currentOrder.pickupCode || '6812'}
                </div>
                <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-600">
                  <span>提餐位置:</span>
                  <InlineEditableText
                    value={template.pickupLockerCode || '02号保温取餐格'}
                    onChange={(val) => handleUpdateField('pickupLockerCode', val)}
                    placeholder="点击修改保温柜/取餐格名称"
                    className="font-bold text-neutral-800"
                    labelTip="点击修改自提格编号"
                  />
                </div>
              </div>
            )}

            {/* 外卖专送专属字段 */}
            {activeChannelTab === 'delivery' && (
              <div className="text-left space-y-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <span>外卖配送目的地:</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateField('showDeliveryAddressBig', !template.showDeliveryAddressBig)}
                    className="text-[9px] px-1 py-0.2 rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    title="切换地址字体大小"
                  >
                    {template.showDeliveryAddressBig !== false ? '地址特大加粗' : '标准地址'}
                  </button>
                </div>
                <div className={`font-black text-neutral-950 leading-tight ${template.showDeliveryAddressBig !== false ? 'text-sm sm:text-base' : 'text-xs'}`}>
                  {currentOrder.deliveryAddress}
                </div>
                <div className="text-[10.5px] text-neutral-500">
                  食客联络: {currentOrder.customerName} ({currentOrder.userPhone})
                </div>
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* 菜品明细与口味备注区域 (支持开关口味备注与金额展示) */}
          {/* ============================================================= */}
          <div className="space-y-2 py-2 border-b border-dashed border-neutral-300">
            <div className="flex justify-between items-center text-[10px] font-bold text-neutral-400 pb-0.5">
              <span>品名规格</span>
              <div className="flex items-center gap-2">
                {/* 口味备注开关按钮 */}
                <button
                  type="button"
                  onClick={() => handleUpdateField('showOptionNotes', !template.showOptionNotes)}
                  className={`flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    template.showOptionNotes
                      ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/80'
                      : 'bg-neutral-100 text-neutral-400 line-through'
                  }`}
                  title="点击切换是否打印口味备注"
                >
                  {template.showOptionNotes ? <Check className="w-2.5 h-2.5" /> : null}
                  <span>口味备注: {template.showOptionNotes ? '显示' : '隐藏'}</span>
                </button>

                {/* 价格开关按钮 */}
                <button
                  type="button"
                  onClick={() => handleUpdateField('showPrice', !template.showPrice)}
                  className={`flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    template.showPrice
                      ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/80'
                      : 'bg-neutral-100 text-neutral-400 line-through'
                  }`}
                  title="点击切换是否打印菜品金额"
                >
                  {template.showPrice ? <Check className="w-2.5 h-2.5" /> : null}
                  <span>金额: {template.showPrice ? '显示' : '隐藏'}</span>
                </button>
              </div>
            </div>

            {/* 模拟菜品列表 */}
            {currentOrder.items.map((it, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between items-center font-bold text-neutral-900 text-xs">
                  <span className="truncate pr-2">{it.name}</span>
                  <span className="shrink-0">
                    x{it.quantity} {template.showPrice && `¥${it.price.toFixed(1)}`}
                  </span>
                </div>
                {template.showOptionNotes && it.options && (
                  <div className="text-[10px] text-neutral-500 pl-2">
                    ↳ {it.options}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ============================================================= */}
          {/* 金额汇总结算行 */}
          {/* ============================================================= */}
          {template.showPrice && (
            <div className="space-y-1 py-1.5 border-b border-dashed border-neutral-300">
              <div className="flex justify-between items-center font-bold">
                <span className="text-xs">合计金额</span>
                <span className="text-base font-black text-neutral-950">
                  ¥{currentOrder.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>实付方式</span>
                <span>移动扫码支付 (已结算)</span>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 车载高速 WiFi 信息条 (点击账号和密码可就地修改) */}
          {/* ============================================================= */}
          <div className="p-2 bg-neutral-50 rounded-lg border border-neutral-200 text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-[10px] text-neutral-500 font-bold">
              <Wifi className="w-3 h-3 text-neutral-700" />
              <span>随车高速 WiFi</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="text-neutral-400">名称:</span>
                <InlineEditableText
                  value={template.wifiName || 'Obsidian_Guest_5G'}
                  onChange={(val) => handleUpdateField('wifiName', val)}
                  placeholder="点击输入WiFi名称"
                  className="font-bold text-neutral-900"
                  labelTip="点击修改WiFi名称"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-neutral-400">密码:</span>
                <InlineEditableText
                  value={template.wifiPassword || 'eat-good-food'}
                  onChange={(val) => handleUpdateField('wifiPassword', val)}
                  placeholder="点击输入WiFi密码"
                  className="font-bold text-neutral-900"
                  labelTip="点击修改WiFi密码"
                />
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* 外卖场景专属：食安封签标尺 */}
          {/* ============================================================= */}
          {activeChannelTab === 'delivery' && (
            <div
              onClick={() => handleUpdateField('showFoodSafetySeal', !template.showFoodSafetySeal)}
              title={template.showFoodSafetySeal !== false ? '点击关闭食安封签' : '点击开启食安封签'}
              className={`p-2 rounded border border-dashed text-center transition-all cursor-pointer ${
                template.showFoodSafetySeal !== false
                  ? 'border-neutral-400 bg-neutral-50 hover:bg-neutral-100 text-neutral-800'
                  : 'border-neutral-200 bg-neutral-50/50 text-neutral-400 italic text-[10px]'
              }`}
            >
              {template.showFoodSafetySeal !== false ? (
                <div className="space-y-0.5">
                  <div className="flex items-center justify-center gap-1 text-[10.5px] font-bold">
                    <Scissors className="w-3 h-3 text-neutral-600" />
                    <span>食安封签 (完好请签收 · 破损请拒收)</span>
                  </div>
                  <div className="text-[9px] text-neutral-400">
                    剪刀虚线沿此切断 · 封贴于保温餐袋封口处
                  </div>
                </div>
              ) : (
                <span>【食安封签已关闭 · 点击重新开启】</span>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* 二维码展示区 (点击切换用途，或点击右侧小眼睛开关) */}
          {/* ============================================================= */}
          <div className="pt-1 flex flex-col items-center justify-center space-y-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleUpdateField('showQrCode', !template.showQrCode)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors ${
                  template.showQrCode
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                    : 'bg-neutral-100 text-neutral-400'
                }`}
                title="点击开关底部二维码"
              >
                {template.showQrCode ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>{template.showQrCode ? '二维码: 已启用' : '二维码: 已隐藏'}</span>
              </button>

              {template.showQrCode && (
                <select
                  value={template.qrCodeType || 'pickup'}
                  onChange={(e) => handleUpdateField('qrCodeType', e.target.value as any)}
                  className="text-base md:text-[10px] font-bold bg-neutral-100 text-neutral-700 rounded px-1.5 py-0.5 border border-neutral-200 cursor-pointer focus:outline-none"
                  style={{ fontSize: '16px', touchAction: 'manipulation' }}
                  title="切换二维码功能"
                >
                  <option value="pickup">取餐核销码</option>
                  <option value="invoice">电子发票码</option>
                  <option value="wechat">微信社群码</option>
                  <option value="wifi">扫码连WiFi</option>
                </select>
              )}
            </div>

            {template.showQrCode && (
              <div className="flex flex-col items-center pt-1">
                <div className="w-16 h-16 bg-neutral-900 text-white rounded flex items-center justify-center shadow-xs">
                  <QrCode className="w-12 h-12 text-white" />
                </div>
                <span className="text-[9.5px] text-neutral-400 mt-1 font-medium">
                  {template.qrCodeType === 'invoice'
                    ? '扫码开具增值税电子发票'
                    : template.qrCodeType === 'wechat'
                    ? '扫码加入流动餐车车友群'
                    : template.qrCodeType === 'wifi'
                    ? '扫码直连车载高速WiFi'
                    : '出示此码核验极速提餐'}
                </span>
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* 页脚温馨提示 (点击行内编辑文本) */}
          {/* ============================================================= */}
          <div className="pt-2 border-t border-dashed border-neutral-200 text-center">
            <InlineEditableText
              value={template.footerNotes}
              onChange={(val) => handleUpdateField('footerNotes', val)}
              placeholder="+ 点击添加底部页脚温馨提示（如等候提醒、客服电话）"
              className="text-[10.5px] text-neutral-500 block text-center leading-relaxed"
              inputClassName="text-center text-xs"
              align="center"
              isMultiline
              labelTip="点击修改页脚提示与客服说明"
            />
            <div className="text-[9px] text-neutral-300 pt-1.5">
              出纸打样系统时间: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* 底部真实打样与实体出纸按键 */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleBrowserPrint}
            className="h-8 px-3.5 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Smartphone className="w-3.5 h-3.5 text-neutral-500" />
            <span>浏览器弹窗打样</span>
          </button>

          <button
            type="button"
            onClick={() => {
              showToast('已向当前随车便携机与后厨档口下发打样指令！');
            }}
            className="h-8 px-3.5 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>下发物理样张</span>
          </button>
        </div>
      </div>
    </div>
  );
};
