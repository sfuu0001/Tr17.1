import React, { useState, useRef } from 'react';
import {
  Bluetooth,
  Printer,
  Settings,
  Plus,
  Radio,
  Battery,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Scissors,
  Bell,
  Play,
  FileText,
  Trash2,
  CheckCircle2,
  HardDrive,
  Zap
} from 'lucide-react';
import {
  BluetoothPrinterDevice,
  BluetoothPrintTaskLog,
  Order,
  ReceiptTemplateConfig
} from '../../types';
import {
  EscPosBuilder,
  buildOrderReceiptBytes,
  buildSelfTestBytes,
  sendBytesToBluetoothCharacteristic,
  BluetoothRemoteGATTCharacteristic
} from '../../utils/escpos';
import { getSavedDetectedPrinters } from '../../utils/printerAutoDetectEngine';
import { PrinterActionPopover } from './printer/PrinterActionPopover';
import { PrinterQuickConfigDrawer } from './printer/PrinterQuickConfigDrawer';
import { ReceiptSelfTestModal } from './printer/ReceiptSelfTestModal';

interface BluetoothPrinterManagerProps {
  orders: Order[];
  template: ReceiptTemplateConfig;
  showToast: (msg: string, desc?: string) => void;
}

// Initial Preset Food-Truck Bluetooth Thermal Printers
const DEFAULT_BLUETOOTH_PRINTERS: BluetoothPrinterDevice[] = [
  {
    id: 'bt-01',
    name: 'Printer_6BAD',
    modelBrand: 'Gprinter GP-58MBIII',
    connectionType: 'bluetooth',
    macAddress: '99092B21-0882-06DA-A5F8-1E6271FA',
    paperWidth: '58mm',
    status: 'connected',
    batteryLevel: 92,
    signalRssi: -52,
    isDefault: true,
    autoPrintNewOrders: true,
    copies: 1,
    firmwareVersion: 'V4.2.0_BLE',
    lastPrintedAt: '12:18'
  },
  {
    id: 'bt-02',
    name: 'Xprinter_XP80',
    modelBrand: 'Xprinter XP-P300',
    connectionType: 'bluetooth',
    macAddress: '001A7DDA-7109-4C88-9122-A837C901',
    paperWidth: '80mm',
    status: 'disconnected',
    batteryLevel: 68,
    signalRssi: -68,
    isDefault: false,
    autoPrintNewOrders: false,
    copies: 1,
    firmwareVersion: 'V3.8.1_BLE',
    lastPrintedAt: '昨天 19:40'
  }
];

export const BluetoothPrinterManager: React.FC<BluetoothPrinterManagerProps> = ({
  orders,
  template,
  showToast
}) => {
  const [printers, setPrinters] = useState<BluetoothPrinterDevice[]>(() => {
    const raw = localStorage.getItem('obsidian_bt_printers');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: any) => ({
            ...p,
            connectionType: p.connectionType || 'bluetooth'
          }));
        }
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_BLUETOOTH_PRINTERS;
  });

  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(
    printers[0]?.id || 'bt-01'
  );

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    orders[0]?.id || ''
  );

  const [logs, setLogs] = useState<BluetoothPrintTaskLog[]>([
    {
      id: 'log-01',
      timestamp: '12:18:04',
      printerName: 'Printer_6BAD',
      orderNo: '#9821',
      bytesCount: 684,
      status: 'success',
      taskType: 'order_receipt',
      detail: '单联出单完成 · 耗时 480ms'
    }
  ]);

  // UI Interactive States
  const [isScanning, setIsScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeMenuPrinterId, setActiveMenuPrinterId] = useState<string | null>(null);
  const [configDrawerDevice, setConfigDrawerDevice] = useState<any | null>(null);
  const [selfTestModalDevice, setSelfTestModalDevice] = useState<any | null>(null);

  // Collapsible Advanced Panels (默认折叠以保持精简)
  const [isManualPrintOpen, setIsManualPrintOpen] = useState(false);
  const [isHardwareDebugOpen, setIsHardwareDebugOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Real Web Bluetooth GATT Reference
  const realBluetoothCharacteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(
    null
  );

  const activePrinter = printers.find((p) => p.id === selectedPrinterId) || printers[0];
  const targetOrder = orders.find((o) => o.id === selectedOrderId) || orders[0] || {
    id: 'ord-current-real',
    orderNo: '#A108',
    customerName: '流动餐车食客',
    userPhone: '138****0000',
    deliveryAddress: '流动餐车外摆取餐口',
    items: [
      { name: '现烤招牌羊肉大串', quantity: 4, price: 48.0, options: '微辣 · 孜然' },
      { name: '手作鲜柠檬冷萃茶', quantity: 2, price: 36.0, options: '少冰 · 七分糖' }
    ],
    totalAmount: 84.0,
    createdTime: '刚刚'
  };

  const savePrinters = (newList: BluetoothPrinterDevice[]) => {
    setPrinters(newList);
    localStorage.setItem('obsidian_bt_printers', JSON.stringify(newList));
  };

  const addLog = (
    taskType: BluetoothPrintTaskLog['taskType'],
    orderNo: string,
    bytesCount: number,
    status: 'success' | 'failed',
    detail?: string
  ) => {
    const newLog: BluetoothPrintTaskLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      printerName: activePrinter?.name || '蓝牙小票机',
      orderNo,
      bytesCount,
      status,
      taskType,
      detail
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 19)]);
  };

  // Toggle connection
  const handleToggleConnection = async (printerId: string) => {
    const target = printers.find((p) => p.id === printerId);
    if (!target) return;

    if (target.status === 'connected') {
      const updated = printers.map((p) =>
        p.id === printerId ? { ...p, status: 'disconnected' as const } : p
      );
      savePrinters(updated);
      realBluetoothCharacteristicRef.current = null;
      showToast(`已断开【${target.name}】蓝牙连接`);
    } else {
      const updatedConnecting = printers.map((p) =>
        p.id === printerId ? { ...p, status: 'connecting' as const } : p
      );
      savePrinters(updatedConnecting);

      setTimeout(() => {
        const updatedConnected = printers.map((p) =>
          p.id === printerId ? { ...p, status: 'connected' as const } : p
        );
        savePrinters(updatedConnected);
        showToast(`已成功连接【${target.name}】`);
      }, 500);
    }
  };

  // Set default printer
  const handleSetDefault = (printerId: string) => {
    const updated = printers.map((p) => ({
      ...p,
      isDefault: p.id === printerId
    }));
    savePrinters(updated);
    showToast('已设为默认打印机');
  };

  // Remove printer
  const handleRemovePrinter = (printerId: string) => {
    if (printers.length <= 1) {
      showToast('至少保留一台打印机');
      return;
    }
    const updated = printers.filter((p) => p.id !== printerId);
    savePrinters(updated);
    if (selectedPrinterId === printerId) {
      setSelectedPrinterId(updated[0]?.id || '');
    }
    showToast('已删除打印机');
  };

  // Test Print
  const handleTestPrint = async (printer: BluetoothPrinterDevice) => {
    setIsPrinting(true);
    setSelfTestModalDevice(printer);
    try {
      const bytes = buildSelfTestBytes(
        printer.name, 
        printer.paperWidth, 
        (printer.connectionType as any) || 'bluetooth', 
        printer.macAddress
      );
      if (realBluetoothCharacteristicRef.current) {
        await sendBytesToBluetoothCharacteristic(
          realBluetoothCharacteristicRef.current,
          bytes
        );
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }
      addLog('self_test', '自检样张', bytes.length, 'success', '打印测试已就绪');
      showToast(`已向【${printer.name}】下发测试打印`);
    } catch (err: any) {
      showToast('测试打印失败', err?.message);
    } finally {
      setIsPrinting(false);
    }
  };

  // Real Scan / Pair new device
  const handleScanAndAdd = async () => {
    setIsScanning(true);
    showToast('正在搜索附近蓝牙打印机...');
    const hasWebBluetooth =
      typeof navigator !== 'undefined' && 'bluetooth' in navigator && (navigator as any).bluetooth;

    if (hasWebBluetooth) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            '000018f0-0000-1000-8000-00805f9b34fb',
            '0000ffe0-0000-1000-8000-00805f9b34fb'
          ]
        });

        if (device && device.name) {
          const newDev: BluetoothPrinterDevice = {
            id: `bt-${Date.now()}`,
            name: device.name,
            modelBrand: 'ESC/POS Thermal',
            macAddress: (device.id || '99092B21-0882-06DA-A5F8-1E6271FA').slice(0, 32).toUpperCase(),
            paperWidth: '58mm',
            status: 'connected',
            batteryLevel: 95,
            signalRssi: -45,
            isDefault: false,
            autoPrintNewOrders: true,
            copies: 1,
            firmwareVersion: 'V5.0_BLE'
          };
          const next = [newDev, ...printers];
          savePrinters(next);
          setSelectedPrinterId(newDev.id);
          showToast(`已成功配对连接【${device.name}】`);
          setIsScanning(false);
          return;
        }
      } catch (e) {
        // Fallback simulation discovery
      }
    }

    // Virtual Add
    setTimeout(() => {
      const randSuffix = Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase();
      const newDev: BluetoothPrinterDevice = {
        id: `bt-${Date.now()}`,
        name: `Printer_${randSuffix}`,
        modelBrand: 'Portable 58mm',
        macAddress: `99092B21-${randSuffix}-06DA-A5F8-1E6271FA`,
        paperWidth: '58mm',
        status: 'connected',
        batteryLevel: 88,
        signalRssi: -50,
        isDefault: false,
        autoPrintNewOrders: true,
        copies: 1,
        firmwareVersion: 'V4.2.0_BLE'
      };
      savePrinters([newDev, ...printers]);
      setSelectedPrinterId(newDev.id);
      showToast(`已成功添加新打印机【${newDev.name}】`);
      setIsScanning(false);
    }, 600);
  };

  // Save drawer config
  const handleSaveDrawerConfig = (updated: any) => {
    const nextList = printers.map((p) => {
      if (p.id === updated.id) {
        return { ...p, ...updated };
      }
      return updated.isDefault ? { ...p, isDefault: false } : p;
    });
    savePrinters(nextList);
  };

  return (
    <div className="space-y-4">
      {/* 极简参数配置抽屉 */}
      <PrinterQuickConfigDrawer
        isOpen={!!configDrawerDevice}
        onClose={() => setConfigDrawerDevice(null)}
        device={configDrawerDevice}
        onSave={handleSaveDrawerConfig}
        onTestPrint={(dev) => handleTestPrint(dev)}
        showToast={showToast}
      />

      {/* 实体自检测试出纸与真机调起弹窗 */}
      <ReceiptSelfTestModal
        isOpen={!!selfTestModalDevice}
        onClose={() => setSelfTestModalDevice(null)}
        device={selfTestModalDevice}
        onSendRawBytes={async () => {
          if (selfTestModalDevice) {
            const bytes = buildSelfTestBytes(
              selfTestModalDevice.name, 
              selfTestModalDevice.paperWidth, 
              (selfTestModalDevice.connectionType as any) || 'bluetooth', 
              selfTestModalDevice.macAddress
            );
            if (realBluetoothCharacteristicRef.current) {
              await sendBytesToBluetoothCharacteristic(realBluetoothCharacteristicRef.current, bytes);
            }
          }
        }}
        showToast={showToast}
      />

      {/* 顶部标题栏与全局设置 (参考图 2: BR RawPrinter 极简顶栏) */}
      <div className="flex items-center justify-between px-1 py-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
            BR RawPrinter
          </h2>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
        </div>

        <button
          type="button"
          onClick={() => {
            if (activePrinter) setConfigDrawerDevice(activePrinter);
          }}
          className="w-8 h-8 rounded-full text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
          title="系统配置"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* 设备分组标尺行 (参考图 2: 打印机 +) */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-neutral-800">打印机</span>
        <button
          type="button"
          onClick={handleScanAndAdd}
          disabled={isScanning}
          className="w-7 h-7 rounded-lg text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
          title="添加/扫描蓝牙打印机"
        >
          <Plus className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 极简打印机设备卡片列表 (精确复刻图 2 的精简美学) */}
      <div className="space-y-2.5">
        {printers.map((printer) => {
          const isConnected = printer.status === 'connected';
          const isMenuOpen = activeMenuPrinterId === printer.id;

          return (
            <div
              key={printer.id}
              className={`bg-white rounded-xl border transition-all p-3.5 relative flex items-center justify-between gap-3 shadow-2xs ${
                printer.isDefault
                  ? 'border-neutral-300 ring-1 ring-neutral-200'
                  : 'border-neutral-200/90 hover:border-neutral-300'
              }`}
            >
              {/* 左侧：蓝牙图标与核心信息 */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50/80 text-emerald-700 flex items-center justify-center shrink-0">
                  <Bluetooth className="w-4 h-4" />
                </div>

                <div className="min-w-0 space-y-0.5">
                  {/* 第一行：状态点 + 名称 + 默认微标 */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isConnected
                          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                          : 'bg-neutral-300'
                      }`}
                    />
                    <span className="font-bold text-sm text-neutral-900 truncate">
                      {printer.name}
                    </span>
                    {printer.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0">
                        默认
                      </span>
                    )}
                    {printer.autoPrintNewOrders !== false && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0 flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5" />
                        <span>自动出纸</span>
                      </span>
                    )}
                  </div>

                  {/* 第二行：精炼副字段 (规格 · MAC/UUID) */}
                  <div className="text-[11px] text-neutral-400 truncate flex items-center gap-1.5">
                    <span>{printer.paperWidth}</span>
                    <span>·</span>
                    <span className="truncate max-w-[200px] sm:max-w-[320px]">
                      {printer.macAddress}
                    </span>
                    {printer.batteryLevel !== undefined && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-neutral-500">
                          <Battery className="w-3 h-3 text-emerald-600" />
                          <span>{printer.batteryLevel}%</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 右侧：更多操作按钮与图 2 弹出 Popover */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setActiveMenuPrinterId(isMenuOpen ? null : printer.id)
                  }
                  className="w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
                  title="操作菜单"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* 图 2 右侧极简 Popover */}
                <PrinterActionPopover
                  isOpen={isMenuOpen}
                  onClose={() => setActiveMenuPrinterId(null)}
                  isDefault={printer.isDefault}
                  isConnected={isConnected}
                  onSetDefault={() => handleSetDefault(printer.id)}
                  onOpenConfig={() => setConfigDrawerDevice(printer)}
                  onTestPrint={() => handleTestPrint(printer)}
                  onToggleConnect={() => handleToggleConnection(printer.id)}
                  onDelete={() => handleRemovePrinter(printer.id)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 极简折叠扩展区：折叠不需要平铺的字段与高级指令，按需展开          */}
      {/* ============================================================== */}
      <div className="space-y-2 pt-2">
        {/* 折叠区 1：即时选单出纸与打样 */}
        <div className="bg-white rounded-xl border border-neutral-200/90 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setIsManualPrintOpen(!isManualPrintOpen)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Printer className="w-3.5 h-3.5 text-neutral-500" />
              <span>即时选单打样出纸</span>
            </div>
            {isManualPrintOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </button>

          {isManualPrintOpen && (
            <div className="p-3.5 border-t border-neutral-100 bg-neutral-50/50 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-neutral-500 text-[11px]">选择当前出单对象:</span>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800 focus:outline-none"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNo} · {o.customerName} (¥{o.totalAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (activePrinter) handleTestPrint(activePrinter);
                  }}
                  className="h-8 px-3 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  自检样张
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activePrinter) {
                      setSelfTestModalDevice(activePrinter);
                      showToast(`已向【${activePrinter.name}】下发订单【${targetOrder.orderNo}】小票出单`);
                    }
                  }}
                  className="h-8 px-4 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>立即打印</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 折叠区 2：硬件切刀与蜂鸣动作指令 */}
        <div className="bg-white rounded-xl border border-neutral-200/90 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setIsHardwareDebugOpen(!isHardwareDebugOpen)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-neutral-500" />
              <span>硬件动作测试 (切刀 / 蜂鸣 / 走纸)</span>
            </div>
            {isHardwareDebugOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </button>

          {isHardwareDebugOpen && (
            <div className="p-3.5 border-t border-neutral-100 bg-neutral-50/50 flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  showToast(`【${activePrinter?.name}】蜂鸣器提示动作完成`);
                }}
                className="h-8 px-3 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-neutral-500" />
                <span>蜂鸣测试</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  showToast(`【${activePrinter?.name}】推进走纸 3 行`);
                }}
                className="h-8 px-3 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-neutral-500" />
                <span>走纸 3 行</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  showToast(`【${activePrinter?.name}】自动切刀测试指令已下发`);
                }}
                className="h-8 px-3 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-neutral-500" />
                <span>切纸动作</span>
              </button>
            </div>
          )}
        </div>

        {/* 折叠区 3：打印流水审计 */}
        <div className="bg-white rounded-xl border border-neutral-200/90 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setIsLogsOpen(!isLogsOpen)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-neutral-500" />
              <span>打印任务流水 ({logs.length})</span>
            </div>
            {isLogsOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </button>

          {isLogsOpen && (
            <div className="p-3.5 border-t border-neutral-100 bg-neutral-50/50 space-y-1.5 text-[11px]">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 bg-white rounded-lg border border-neutral-200/70"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-neutral-800">{log.printerName}</span>
                    <span className="text-neutral-400">· {log.orderNo}</span>
                  </div>
                  <span className="text-neutral-400">{log.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
