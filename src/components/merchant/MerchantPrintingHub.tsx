import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Printer, 
  Settings, 
  Layers, 
  CheckCircle2, 
  Check,
  AlertCircle, 
  Wifi, 
  QrCode, 
  Copy, 
  Play, 
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Sliders,
  Scissors,
  FileText,
  Bluetooth,
  Usb,
  Network,
  Radio,
  Zap,
  MoreVertical,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  PrinterStation, 
  ReceiptTemplateConfig, 
  Order, 
  DishItem,
  DetectedPrinterDevice 
} from '../../types';
import { 
  INITIAL_PRINTER_STATIONS, 
  INITIAL_RECEIPT_TEMPLATE 
} from '../../data/merchantExtendedMockData';
import { BluetoothPrinterManager } from './BluetoothPrinterManager';
import { PrinterAutoDetectorModal } from './printer/PrinterAutoDetectorModal';
import { PrinterActionPopover } from './printer/PrinterActionPopover';
import { PrinterQuickConfigDrawer } from './printer/PrinterQuickConfigDrawer';
import { ReceiptPaperTemplateEditor } from './printer/ReceiptPaperTemplateEditor';
import { ReceiptSelfTestModal } from './printer/ReceiptSelfTestModal';
import { 
  getAutoPrintPolicy, 
  saveAutoPrintPolicy, 
  AutoPrintPolicyConfig 
} from '../../utils/autoPrintDispatcherEngine';
import { 
  buildOrderReceiptBytes, 
  buildSelfTestBytes, 
  sendBytesToNetworkOrWifi, 
  sendBytesToUsbDevice 
} from '../../utils/escpos';

interface MerchantPrintingHubProps {
  orders: Order[];
  dishes: DishItem[];
  showToast: (msg: string) => void;
}

export const MerchantPrintingHub: React.FC<MerchantPrintingHubProps> = ({
  orders,
  dishes,
  showToast
}) => {
  const [stations, setStations] = useState<PrinterStation[]>(() => {
    const raw = localStorage.getItem('obsidian_printer_stations');
    return raw ? JSON.parse(raw) : INITIAL_PRINTER_STATIONS;
  });

  const [template, setTemplate] = useState<ReceiptTemplateConfig>(() => {
    const raw = localStorage.getItem('obsidian_receipt_template');
    return raw ? JSON.parse(raw) : INITIAL_RECEIPT_TEMPLATE;
  });

  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'stations' | 'bluetooth' | 'template' | 'split_preview'>('stations');
  const [selectedStation, setSelectedStation] = useState<PrinterStation | null>(stations[0] || null);
  const [isDetectorOpen, setIsDetectorOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [channelMode, setChannelMode] = useState<'auto' | 'dine_in' | 'pickup' | 'delivery'>('auto');

  // 全局来单自动出单策略状态
  const [autoPolicy, setAutoPolicy] = useState<AutoPrintPolicyConfig>(getAutoPrintPolicy);

  // 监听食客在线下单支付成功后自动出纸事件
  React.useEffect(() => {
    const handleAutoPrintSuccess = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.orderNo) {
        showToast(`⚡【自动出单成功】订单 #${custom.detail.orderNo} 已由【${custom.detail.printerName}】完成出纸！`);
      }
    };
    window.addEventListener('obsidian_order_auto_printed', handleAutoPrintSuccess);
    return () => window.removeEventListener('obsidian_order_auto_printed', handleAutoPrintSuccess);
  }, [showToast]);

  const toggleAutoPrintPolicy = () => {
    const next = saveAutoPrintPolicy({ autoPrintEnabled: !autoPolicy.autoPrintEnabled });
    setAutoPolicy(next);
    showToast(next.autoPrintEnabled ? '⚡ 来单自动出单已开启：顾客在线支付即刻自动出纸' : '⏸️ 来单自动出单已暂停：需人工手工打印');
  };

  // Popover & Drawer states
  const [activeMenuStationId, setActiveMenuStationId] = useState<string | null>(null);
  const [configDrawerStation, setConfigDrawerStation] = useState<any | null>(null);
  const [selfTestModalStation, setSelfTestModalStation] = useState<any | null>(null);

  // 单按钮下拉菜单配置与状态
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  const HUB_VIEW_OPTIONS = useMemo(() => [
    {
      key: 'bluetooth' as const,
      label: '随车蓝牙便携机',
      icon: Bluetooth,
      description: '低功耗 BLE 5.2 · BR RawPrinter',
      badge: '随车主打',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200/80',
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50/80'
    },
    {
      key: 'stations' as const,
      label: '档口打印集群',
      icon: Printer,
      description: '主厨/烧烤/水吧多档口网络矩阵',
      badge: 'LAN / WiFi',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      iconColor: 'text-neutral-800',
      iconBg: 'bg-neutral-100'
    },
    {
      key: 'template' as const,
      label: '小票打样与纸张模板',
      icon: Sliders,
      description: '58mm/80mm 连续卷纸与联单参数',
      badge: '纸张设计',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200/80',
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50/80'
    },
    {
      key: 'split_preview' as const,
      label: '全渠道拆单模拟',
      icon: Layers,
      description: '多渠道订单自动分单与飞单流转',
      badge: '飞单履约',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200/80',
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50/80'
    }
  ], []);

  const currentViewOption = HUB_VIEW_OPTIONS.find(opt => opt.key === activeSubTab) || HUB_VIEW_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setIsViewMenuOpen(false);
      }
    };
    if (isViewMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isViewMenuOpen]);

  // Real data resolution
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
        channelType: found.channelType || 'dine_in'
      };
    }

    const realItems = (dishes && dishes.length > 0 ? dishes.slice(0, 4) : []).map((d, i) => ({
      name: d.name,
      quantity: i === 0 ? 2 : 1,
      price: d.price,
      options: d.options?.[0] || '标准出品'
    }));

    const total = realItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

    return {
      id: 'ord-current-real',
      orderNo: '#A108',
      customerName: '流动餐车食客',
      userPhone: '138****0000',
      items: realItems.length > 0 ? realItems : [
        { name: '现烤招牌羊肉大串', quantity: 4, price: 48.0, options: '微辣' },
        { name: '手作鲜柠檬冷萃茶', quantity: 2, price: 36.0, options: '少冰' }
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
      channelType: 'dine_in'
    };
  }, [orders, dishes, selectedOrderId]);

  // Compute effective channel
  const effectiveChannel = useMemo<'dine_in' | 'pickup' | 'delivery'>(() => {
    if (channelMode !== 'auto') return channelMode;
    if (currentOrder.channelType === 'pickup') return 'pickup';
    if (currentOrder.channelType === 'delivery') return 'delivery';
    if (currentOrder.channelType === 'dine_in') return 'dine_in';
    if (currentOrder.tableCode) return 'dine_in';
    if (currentOrder.pickupCode) return 'pickup';
    return 'dine_in';
  }, [channelMode, currentOrder]);

  const saveStations = (newStations: PrinterStation[]) => {
    setStations(newStations);
    localStorage.setItem('obsidian_printer_stations', JSON.stringify(newStations));
  };

  const saveTemplate = (newTemplate: ReceiptTemplateConfig) => {
    setTemplate(newTemplate);
    localStorage.setItem('obsidian_receipt_template', JSON.stringify(newTemplate));
    showToast('小票模板配置已保存');
  };

  // Hardware Printing
  const handleTestPrint = async (station: PrinterStation) => {
    setSelfTestModalStation(station);
    showToast(`正在向【${station.name}】下发测试样张...`);
    try {
      const bytes = buildSelfTestBytes(station.name, station.paperWidth, station.connectionType || 'network', station.deviceIp || station.macAddress);
      if (station.connectionType === 'usb' && station.usbVendorId) {
        await sendBytesToUsbDevice(parseInt(station.usbVendorId, 16), parseInt(station.usbProductId || '0x5011', 16), bytes);
      } else if (station.connectionType === 'network' || station.connectionType === 'wifi') {
        await sendBytesToNetworkOrWifi(station.deviceIp || '192.168.1.200', station.port || 9100, bytes);
      } else {
        await new Promise(r => setTimeout(r, 450));
      }
      showToast(`【${station.name}】测试打印完成`);
    } catch (e: any) {
      showToast(`打印失败: ${e?.message || '通信中断'}`);
    }
  };

  const handleSetDefaultStation = (stationId: string) => {
    const updated = stations.map(s => ({
      ...s,
      isDefault: s.id === stationId
    }));
    saveStations(updated);
    showToast('已设为默认打印机');
  };

  const handleDeleteStation = (stationId: string) => {
    if (stations.length <= 1) {
      showToast('至少保留一台打印机设备');
      return;
    }
    const updated = stations.filter(s => s.id !== stationId);
    saveStations(updated);
    showToast('已移除该打印机设备');
  };

  const handleBindPrinterToStation = (stationId: string, device: DetectedPrinterDevice) => {
    const updated = stations.map(s => {
      if (s.id === stationId) {
        return {
          ...s,
          name: `${device.name}`,
          connectionType: device.connectionType,
          deviceIp: device.connectionType === 'network' || device.connectionType === 'wifi' ? device.identifier : s.deviceIp,
          macAddress: device.connectionType === 'bluetooth' ? device.identifier : s.macAddress,
          usbVendorId: device.connectionType === 'usb' ? device.identifier.split(':')[0] : s.usbVendorId,
          usbProductId: device.connectionType === 'usb' ? device.identifier.split(':')[1] : s.usbProductId,
          paperWidth: device.paperWidth,
          status: 'online' as const,
          pingLatencyMs: device.pingLatencyMs,
          lastPrintedAt: '刚刚绑定'
        };
      }
      return s;
    });
    saveStations(updated);
  };

  const handleSaveDrawerConfig = (updated: any) => {
    const nextList = stations.map(s => {
      if (s.id === updated.id) {
        return { ...s, ...updated };
      }
      return updated.isDefault ? { ...s, isDefault: false } : s;
    });
    saveStations(nextList);
  };

  // Split order items
  const getSplitItemsForStation = (station: PrinterStation) => {
    if (station.categoriesHandled.includes('all')) {
      return currentOrder.items;
    }
    return currentOrder.items.filter(item => {
      const matchedDish = dishes.find(d => d.name === item.name);
      if (!matchedDish) return true;
      return station.categoriesHandled.includes(matchedDish.category);
    });
  };

  return (
    <div className="space-y-4">
      {/* 4-Channel Auto-Detector Modal */}
      <PrinterAutoDetectorModal
        isOpen={isDetectorOpen}
        onClose={() => setIsDetectorOpen(false)}
        configuredStations={stations}
        onBindPrinterToStation={handleBindPrinterToStation}
        showToast={showToast}
      />

      {/* 参数配置抽屉 (折叠不需要平铺的字段) */}
      <PrinterQuickConfigDrawer
        isOpen={!!configDrawerStation}
        onClose={() => setConfigDrawerStation(null)}
        device={configDrawerStation}
        onSave={handleSaveDrawerConfig}
        onTestPrint={(dev) => handleTestPrint(dev)}
        showToast={showToast}
      />

      {/* 实体自检测试出纸与真机调起弹窗 */}
      <ReceiptSelfTestModal
        isOpen={!!selfTestModalStation}
        onClose={() => setSelfTestModalStation(null)}
        device={selfTestModalStation}
        onSendRawBytes={async () => {
          if (selfTestModalStation) {
            await handleTestPrint(selfTestModalStation);
          }
        }}
        showToast={showToast}
      />

      {/* ================================================================= */}
      {/* 1. 单排一体化调度工具栏 (参考图 1 供售打样主控胶囊风格与图 2 顶栏) */}
      {/* ================================================================= */}
      {/* ================================================================= */}
      {/* 1. 单排一体化调度工具栏 (单按钮下拉菜单 Popover + 自动出纸 + 扫描) */}
      {/* ================================================================= */}
      <div className="flex items-center justify-between gap-2 bg-white rounded-xl border border-neutral-200/90 p-1.5 shadow-2xs">
        {/* 左侧：美化单按钮下拉菜单触发器 (严格 h-8 标尺, 极简毛玻璃卡片 Popover) */}
        <div className="relative" ref={viewMenuRef}>
          <button
            type="button"
            onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
            className={`h-8 px-3 rounded-lg border transition-all flex items-center gap-2 cursor-pointer shadow-2xs select-none active:scale-[0.98] ${
              isViewMenuOpen
                ? 'bg-neutral-900/[0.04] text-neutral-950 border-neutral-400 ring-2 ring-neutral-900/10 font-bold'
                : 'bg-white text-neutral-800 border-neutral-200/90 hover:border-neutral-300 hover:bg-neutral-50 font-semibold'
            }`}
          >
            {/* 动态图标 */}
            <currentViewOption.icon className={`w-3.5 h-3.5 ${currentViewOption.iconColor} shrink-0`} />
            
            {/* 当前选中模块名称 */}
            <span className="text-xs whitespace-nowrap">{currentViewOption.label}</span>
            
            {/* 绿色连通微光指示灯 */}
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)] shrink-0" />
            
            {/* 优雅下拉旋转小箭头 */}
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 shrink-0 ${isViewMenuOpen ? 'rotate-180 text-neutral-700' : ''}`} />
          </button>

          {/* 美化下拉弹出菜单 (毛玻璃、超柔阴影与工控卡片排版) */}
          {isViewMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 rounded-xl backdrop-blur-xl bg-white/95 border border-neutral-200/90 shadow-xl shadow-neutral-950/10 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 tracking-wider uppercase flex items-center justify-between">
                <span>打印调度 · 场景切换</span>
                <span className="text-[9px] text-neutral-400 font-normal">点击切换视图</span>
              </div>

              {HUB_VIEW_OPTIONS.map((opt) => {
                const isSelected = activeSubTab === opt.key;
                const IconComponent = opt.icon;

                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setActiveSubTab(opt.key);
                      setIsViewMenuOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900/[0.06] text-neutral-950 font-bold border border-neutral-300/80 shadow-2xs'
                        : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-md ${opt.iconBg} flex items-center justify-center shrink-0 border border-neutral-200/50`}>
                        <IconComponent className={`w-3.5 h-3.5 ${opt.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs truncate">{opt.label}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border leading-tight ${opt.badgeColor}`}>
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-normal">
                          {opt.description}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/80">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 右侧：单排极简自动出纸总控 + 扫描新设备 (统一 h-8，单排不折行) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleAutoPrintPolicy}
            className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-[0.98] ${
              autoPolicy.autoPrintEnabled
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300/80 hover:bg-emerald-100/70'
                : 'bg-neutral-50 text-neutral-500 border border-neutral-200 hover:bg-neutral-100'
            }`}
            title={autoPolicy.autoPrintEnabled ? '点击暂停来单自动出单' : '点击开启来单自动出单'}
          >
            <Zap className={`w-3.5 h-3.5 ${autoPolicy.autoPrintEnabled ? 'text-emerald-600 animate-pulse' : 'text-neutral-400'}`} />
            <span className="hidden xs:inline">{autoPolicy.autoPrintEnabled ? '自动出纸: 开启' : '自动出纸: 暂停'}</span>
            <span className="xs:hidden">{autoPolicy.autoPrintEnabled ? '自动开启' : '自动暂停'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDetectorOpen(true)}
            className="h-8 px-2.5 sm:px-3 rounded-lg bg-white border border-neutral-200/90 hover:bg-neutral-50 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs whitespace-nowrap active:scale-[0.98]"
            title="一键扫描新设备"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>扫描新设备</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. 子标签：随车蓝牙便携机 (复用 BR RawPrinter 极简架构)            */}
      {/* ================================================================= */}
      {activeSubTab === 'bluetooth' && (
        <BluetoothPrinterManager
          orders={orders}
          template={template}
          showToast={showToast}
        />
      )}

      {/* ================================================================= */}
      {/* 3. 子标签：档口打印机集群 (参考图 2 极简卡片重构，去除冗长文字)      */}
      {/* ================================================================= */}
      {activeSubTab === 'stations' && (
        <div className="space-y-3">
          {/* 设备分组标尺行 (参考图 2: 打印机 +) */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-800">打印机</span>
              <span className="text-[11px] text-neutral-400">
                ({stations.filter(s => s.status === 'online').length}/{stations.length} 台在线)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsDetectorOpen(true)}
              className="w-7 h-7 rounded-lg text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 flex items-center justify-center transition-all cursor-pointer"
              title="添加/扫描新打印机"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* 极简打印机设备卡片列表 (精确复刻图 2 的精简美学) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {stations.map(station => {
              const connType = station.connectionType || 'network';
              const isOnline = station.status === 'online';
              const isMenuOpen = activeMenuStationId === station.id;

              return (
                <div
                  key={station.id}
                  className={`bg-white rounded-xl border transition-all p-3.5 relative flex items-center justify-between gap-3 shadow-2xs ${
                    station.isDefault
                      ? 'border-neutral-300 ring-1 ring-neutral-200'
                      : 'border-neutral-200/90 hover:border-neutral-300'
                  }`}
                >
                  {/* 左侧：连接协议图标与设备信息 */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      connType === 'bluetooth' ? 'bg-blue-50 text-blue-600' :
                      connType === 'usb' ? 'bg-amber-50 text-amber-600' :
                      connType === 'wifi' ? 'bg-purple-50 text-purple-600' :
                      'bg-emerald-50 text-emerald-700'
                    }`}>
                      {connType === 'bluetooth' && <Bluetooth className="w-4 h-4" />}
                      {connType === 'usb' && <Usb className="w-4 h-4" />}
                      {connType === 'wifi' && <Wifi className="w-4 h-4" />}
                      {connType === 'network' && <Network className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      {/* 第一行：状态指示绿点 + 名称 + 默认微标 */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isOnline
                              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                              : 'bg-neutral-300'
                          }`}
                        />
                        <span className="font-bold text-sm text-neutral-900 truncate">
                          {station.name}
                        </span>
                        {station.isDefault && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0">
                            默认
                          </span>
                        )}
                        {station.autoPrintOnNewOrder !== false && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0 flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" />
                            <span>自动出单</span>
                          </span>
                        )}
                      </div>

                      {/* 第二行：精炼副字段 (规格 · IP/MAC 截断) */}
                      <div className="text-[11px] text-neutral-400 truncate flex items-center gap-1.5">
                        <span>{station.paperWidth}</span>
                        <span>·</span>
                        <span className="truncate max-w-[180px] sm:max-w-[260px]">
                          {connType === 'bluetooth'
                            ? (station.macAddress || 'BLE 设备')
                            : connType === 'usb'
                            ? (station.usbVendorId ? `${station.usbVendorId}:${station.usbProductId || '0x5011'}` : 'USB 直连')
                            : `${station.deviceIp || '192.168.1.200'}:${station.port || 9100}`}
                        </span>
                        {station.pingLatencyMs && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-700 font-medium">
                              {station.pingLatencyMs}ms
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 右侧：操作菜单触发器与浮层 Popover */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMenuStationId(isMenuOpen ? null : station.id)
                      }
                      className="w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
                      title="操作菜单"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* 图 2 右侧极简 Popover */}
                    <PrinterActionPopover
                      isOpen={isMenuOpen}
                      onClose={() => setActiveMenuStationId(null)}
                      isDefault={station.isDefault}
                      isConnected={isOnline}
                      onSetDefault={() => handleSetDefaultStation(station.id)}
                      onOpenConfig={() => setConfigDrawerStation(station)}
                      onTestPrint={() => handleTestPrint(station)}
                      onDelete={() => handleDeleteStation(station.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. 子标签：小票样式打样与纸样模板定制中心 (全功能完整恢复)         */}
      {/* ================================================================= */}
      {activeSubTab === 'template' && (
        <ReceiptPaperTemplateEditor
          template={template}
          onSaveTemplate={saveTemplate}
          orders={orders}
          dishes={dishes}
          showToast={showToast}
        />
      )}

      {/* ================================================================= */}
      {/* 5. 子标签：全渠道拆单飞单模拟                                     */}
      {/* ================================================================= */}
      {activeSubTab === 'split_preview' && (
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
            <div>
              <h3 className="font-bold text-sm text-neutral-900">智能档口拆单飞单</h3>
              <p className="text-xs text-neutral-400 mt-0.5">根据品类自动分流出餐，前后厨极速协同</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800 focus:outline-none"
              >
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.orderNo} · {o.customerName} (¥{o.totalAmount})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 档口拆单平铺卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {stations.map(station => {
              const splitItems = getSplitItemsForStation(station);
              return (
                <div key={station.id} className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/50 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200">
                      <span className="font-bold text-xs text-neutral-900">{station.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-200/70 text-neutral-700 font-medium">
                        {station.paperWidth}
                      </span>
                    </div>

                    <div className="space-y-1 py-1 min-h-[90px]">
                      {splitItems.length === 0 ? (
                        <div className="text-neutral-400 text-xs py-6 text-center">本单无该档口菜品</div>
                      ) : (
                        splitItems.map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="text-neutral-800 font-medium truncate">{item.name}</span>
                            <span className="font-bold text-neutral-600">x{item.quantity}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTestPrint(station)}
                    className="w-full h-7 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    <span>单机补打</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
