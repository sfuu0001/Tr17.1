import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Sliders, 
  Check, 
  Bell, 
  Scissors, 
  Wifi, 
  Layers, 
  Zap, 
  ChevronRight,
  ShieldCheck,
  Play,
  Bluetooth,
  Usb,
  Network
} from 'lucide-react';
import { PrinterStation, BluetoothPrinterDevice } from '../../../types';

interface PrinterQuickConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  device: {
    id: string;
    name: string;
    paperWidth: '58mm' | '80mm';
    copies?: number;
    autoPrintNewOrders?: boolean;
    connectionType?: string;
    macAddress?: string;
    deviceIp?: string;
    port?: number;
    categoriesHandled?: string[];
  } | null;
  onSave: (updatedConfig: any) => void;
  onTestPrint?: (device: any) => void;
  showToast: (msg: string) => void;
}

export const PrinterQuickConfigDrawer: React.FC<PrinterQuickConfigDrawerProps> = ({
  isOpen,
  onClose,
  device,
  onSave,
  onTestPrint,
  showToast
}) => {
  if (!isOpen || !device) return null;

  // 准确推导协议：若是 MAC 地址或以 bt- 开头，则是蓝牙 BLE
  const initialConn = device.connectionType || 
    (device.macAddress || device.id.startsWith('bt-') ? 'bluetooth' : (device.deviceIp ? 'network' : 'bluetooth'));

  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(device.paperWidth || '58mm');
  const [copies, setCopies] = useState<number>(device.copies || 1);
  const [connectionType, setConnectionType] = useState<string>(initialConn);
  const [autoPrint, setAutoPrint] = useState<boolean>((device as any).autoPrintOnNewOrder ?? device.autoPrintNewOrders ?? true);
  const [isDefault, setIsDefault] = useState<boolean>(!!(device as any).isDefault);
  const [enableBuzzer, setEnableBuzzer] = useState<boolean>(true);
  const [enableCutter, setEnableCutter] = useState<boolean>(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    device.categoriesHandled || ['all']
  );

  const handleSaveConfig = () => {
    onSave({
      ...device,
      paperWidth,
      copies,
      connectionType,
      autoPrintNewOrders: autoPrint,
      autoPrintOnNewOrder: autoPrint,
      isDefault,
      enableBuzzer,
      enableCutter,
      categoriesHandled: selectedCategories
    });
    showToast(`【${device.name}】参数配置已保存`);
    onClose();
  };

  const handleTriggerTest = () => {
    const currentDeviceState = {
      ...device,
      paperWidth,
      copies,
      connectionType,
      autoPrintNewOrders: autoPrint,
      autoPrintOnNewOrder: autoPrint,
      isDefault,
      enableBuzzer,
      enableCutter,
      categoriesHandled: selectedCategories
    };
    if (onTestPrint) {
      onTestPrint(currentDeviceState);
    } else {
      showToast(`已向【${device.name}】发送测试打印指令`);
    }
  };

  const CATEGORY_OPTS = [
    { key: 'all', label: '全部分类 (总单)' },
    { key: 'bbq', label: '现烤招牌' },
    { key: 'drinks', label: '特调水吧' },
    { key: 'fried', label: '精选炸物' },
    { key: 'staple', label: '主食点心' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col justify-between border-l border-neutral-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-neutral-200/90 flex items-center justify-between bg-neutral-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">打印参数配置</h3>
              <p className="text-[11px] text-neutral-500 truncate max-w-[240px]">{device.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white border border-neutral-200/90 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
          {/* 设备信息概要与协议切换 */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2">
            <div className="flex items-center justify-between text-neutral-500 text-[11px]">
              <span>设备标识:</span>
              <span className="text-neutral-800 font-medium break-all max-w-[220px] text-right">
                {device.macAddress || device.deviceIp || device.id}
              </span>
            </div>

            {/* 接口协议多选切换 */}
            <div className="space-y-1.5 pt-1 border-t border-neutral-200/60">
              <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                <span>通信接口协议:</span>
                <span className="text-emerald-700 font-bold text-[10px]">
                  {connectionType === 'bluetooth' ? '蓝牙 BLE 5.2' : connectionType === 'usb' ? 'USB 直连' : connectionType === 'wifi' ? 'WiFi 无线' : 'ESC/POS 网口'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {[
                  { key: 'bluetooth', label: '蓝牙 BLE', icon: Bluetooth },
                  { key: 'usb', label: 'USB 直连', icon: Usb },
                  { key: 'network', label: '网口', icon: Network },
                  { key: 'wifi', label: 'WiFi', icon: Wifi }
                ].map((item) => {
                  const Icon = item.icon;
                  const isSel = connectionType === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setConnectionType(item.key)}
                      className={`h-7 px-1.5 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        isSel
                          ? 'bg-white text-neutral-950 border-neutral-900 ring-1 ring-neutral-900/10 font-bold shadow-2xs'
                          : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 1. 纸卷规格 */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-neutral-700 block">
              纸卷宽度规格
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`h-9 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paperWidth === '58mm'
                    ? 'bg-white text-neutral-950 border-neutral-900 ring-1.5 ring-neutral-900/10 shadow-xs'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <span>58mm (便携手持)</span>
                {paperWidth === '58mm' && <Check className="w-3.5 h-3.5 text-neutral-950" />}
              </button>

              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`h-9 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paperWidth === '80mm'
                    ? 'bg-white text-neutral-950 border-neutral-900 ring-1.5 ring-neutral-900/10 shadow-xs'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <span>80mm (前台大票)</span>
                {paperWidth === '80mm' && <Check className="w-3.5 h-3.5 text-neutral-950" />}
              </button>
            </div>
          </div>

          {/* 2. 出纸联数 */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-neutral-700 block">
              单次打印联数
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCopies(num)}
                  className={`h-8 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    copies === num
                      ? 'bg-white text-neutral-950 border-neutral-900 ring-1.5 ring-neutral-900/10 shadow-xs'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <span>{num} 联</span>
                  {copies === num && <Check className="w-3 h-3 text-neutral-950" />}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 硬件动作控制 */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="text-[11px] font-bold text-neutral-700 block">
              自动化控制策略
            </label>

            <div className="bg-white rounded-xl border border-neutral-200/90 divide-y divide-neutral-100">
              {/* 设为主打印机 */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-neutral-800 block text-xs">设为主打印机 (Master)</span>
                  <span className="text-[10px] text-neutral-400">单机或全渠道订单默认优先由此设备出单</span>
                </div>
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-neutral-900 cursor-pointer"
                />
              </div>

              {/* 来单自动出纸 */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-neutral-800 block text-xs">来单自动出纸</span>
                  <span className="text-[10px] text-neutral-400">收到新订单后无需手工点击即可出单</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={(e) => setAutoPrint(e.target.checked)}
                  className="w-4 h-4 rounded text-neutral-900 cursor-pointer"
                />
              </div>

              {/* 蜂鸣器提示 */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-neutral-800 block text-xs">蜂鸣声音提示</span>
                  <span className="text-[10px] text-neutral-400">打印开始时驱动蜂鸣马达发声</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableBuzzer}
                  onChange={(e) => setEnableBuzzer(e.target.checked)}
                  className="w-4 h-4 rounded text-neutral-900 cursor-pointer"
                />
              </div>

              {/* 自动切刀 */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-neutral-800 block text-xs">自动裁切小票</span>
                  <span className="text-[10px] text-neutral-400">打印完成后下发 ESC/POS 步进切刀指令</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableCutter}
                  onChange={(e) => setEnableCutter(e.target.checked)}
                  className="w-4 h-4 rounded text-neutral-900 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 4. 档口拆单类目绑定 */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="text-[11px] font-bold text-neutral-700 block">
              承接档口出餐分类
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTS.map((cat) => {
                const isSelected = selectedCategories.includes(cat.key);
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      if (cat.key === 'all') {
                        setSelectedCategories(['all']);
                      } else {
                        const filtered = selectedCategories.filter((c) => c !== 'all');
                        if (isSelected) {
                          const next = filtered.filter((c) => c !== cat.key);
                          setSelectedCategories(next.length === 0 ? ['all'] : next);
                        } else {
                          setSelectedCategories([...filtered, cat.key]);
                        }
                      }
                    }}
                    className={`h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <span>{cat.label}</span>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 sm:p-4 border-t border-neutral-200/90 bg-neutral-50/60 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3 rounded-lg bg-white border border-neutral-200/90 text-neutral-600 font-semibold text-xs hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            取消
          </button>

          {/* 自检测试出纸按键 */}
          <button
            type="button"
            onClick={handleTriggerTest}
            className="flex-1 h-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 font-bold text-xs shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            title="下发测试自检样张并调起打印机"
          >
            <Play className="w-3.5 h-3.5" />
            <span>自检测试出纸</span>
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            className="flex-1 h-9 rounded-lg bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>保存配置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
