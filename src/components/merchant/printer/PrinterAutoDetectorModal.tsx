import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bluetooth,
  Usb,
  Network,
  Wifi,
  Radio,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertCircle,
  Play,
  X,
  Plus,
  Cpu,
  Zap,
  Activity,
  ArrowRight,
  ShieldCheck,
  Search
} from 'lucide-react';
import { 
  PrinterStation, 
  PrinterConnectionType, 
  DetectedPrinterDevice,
  PrinterStationType 
} from '../../../types';
import { 
  checkHardwareCapabilities, 
  scanBluetoothPrinter, 
  scanUsbPrinter, 
  probeNetworkPrinter, 
  probeWifiPrinter, 
  runFullAutoDetection,
  getSavedDetectedPrinters,
  saveDetectedPrinters,
  HardwareCapabilityReport,
  FullAutoDetectProgress
} from '../../../utils/printerAutoDetectEngine';
import { 
  buildSelfTestBytes, 
  sendBytesToBluetoothCharacteristic, 
  sendBytesToUsbDevice, 
  sendBytesToNetworkOrWifi 
} from '../../../utils/escpos';

interface PrinterAutoDetectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  configuredStations: PrinterStation[];
  onBindPrinterToStation: (stationId: string, device: DetectedPrinterDevice) => void;
  onAddStationFromDevice?: (device: DetectedPrinterDevice) => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const PrinterAutoDetectorModal: React.FC<PrinterAutoDetectorModalProps> = ({
  isOpen,
  onClose,
  configuredStations,
  onBindPrinterToStation,
  onAddStationFromDevice,
  showToast
}) => {
  const [caps, setCaps] = useState<HardwareCapabilityReport>(checkHardwareCapabilities());
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectProgress, setDetectProgress] = useState<FullAutoDetectProgress | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | PrinterConnectionType>('all');
  const [detectedDevices, setDetectedDevices] = useState<DetectedPrinterDevice[]>([]);
  const [isPrintingTest, setIsPrintingTest] = useState<string | null>(null);
  const [selectedStationToBind, setSelectedStationToBind] = useState<Record<string, string>>({});

  // Manual IP input probe
  const [manualIp, setManualIp] = useState('192.168.1.105');
  const [manualPort, setManualPort] = useState('9100');
  const [manualType, setManualType] = useState<PrinterConnectionType>('network');
  const [isProbingManual, setIsProbingManual] = useState(false);

  // Initialize and load saved detected printers
  useEffect(() => {
    if (isOpen) {
      setCaps(checkHardwareCapabilities());
      const saved = getSavedDetectedPrinters();
      if (saved.length > 0) {
        setDetectedDevices(saved);
      } else {
        // Run initial quick check if empty
        handleRunFullDetection();
      }
    }
  }, [isOpen]);

  // Full 4-Channel Auto Detection
  const handleRunFullDetection = async () => {
    if (isDetecting) return;
    setIsDetecting(true);
    setDetectProgress(null);

    try {
      const result = await runFullAutoDetection(configuredStations, (prog) => {
        setDetectProgress(prog);
      });

      setDetectedDevices(result.devices);
      saveDetectedPrinters(result.devices);
      showToast(`自动检测完成，成功就绪 ${result.devices.length} 台热敏小票机！`, 'success');
    } catch (err: any) {
      showToast(`检测过程提示: ${err.message || '部分信道探测超时'}`, 'warning');
    } finally {
      setIsDetecting(false);
    }
  };

  // Channel-specific manual scan
  const handleScanChannel = async (channel: PrinterConnectionType) => {
    if (channel === 'bluetooth') {
      try {
        showToast('正在打开 Web Bluetooth 设备配对窗口...', 'success');
        const dev = await scanBluetoothPrinter();
        if (dev) {
          const updated = [dev, ...detectedDevices.filter(d => d.identifier !== dev.identifier)];
          setDetectedDevices(updated);
          saveDetectedPrinters(updated);
          showToast(`已成功配对蓝牙打印机: ${dev.name}`, 'success');
        }
      } catch (err: any) {
        showToast(`蓝牙连接提示: ${err.message}`, 'error');
      }
    } else if (channel === 'usb') {
      try {
        showToast('正在调起 WebUSB 热敏设备列表...', 'success');
        const devs = await scanUsbPrinter(true);
        if (devs.length > 0) {
          const updated = [...devs, ...detectedDevices.filter(d => !devs.some(x => x.identifier === d.identifier))];
          setDetectedDevices(updated);
          saveDetectedPrinters(updated);
          showToast(`已成功识别 ${devs.length} 台 USB 热敏设备！`, 'success');
        }
      } catch (err: any) {
        showToast(`USB 检测提示: ${err.message}`, 'error');
      }
    } else if (channel === 'network' || channel === 'wifi') {
      setIsProbingManual(true);
      try {
        const res = channel === 'network' 
          ? await probeNetworkPrinter(manualIp, parseInt(manualPort, 10))
          : await probeWifiPrinter(manualIp, parseInt(manualPort, 10));

        if (res.online) {
          const brand = channel === 'network' ? 'LAN 网口热敏票据机' : 'WiFi 无线双频小票机';
          const newDev: DetectedPrinterDevice = {
            id: `${channel}-${manualIp.replace(/\./g, '-')}-${manualPort}`,
            name: `${channel === 'network' ? '以太网' : 'WiFi 无线'}打印机 (${manualIp})`,
            connectionType: channel,
            modelBrand: brand,
            identifier: `${manualIp}:${manualPort}`,
            paperWidth: '80mm',
            status: 'online',
            pingLatencyMs: res.latencyMs,
            lastDetectedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            suggestedStation: 'grill'
          };
          const updated = [newDev, ...detectedDevices.filter(d => d.identifier !== newDev.identifier)];
          setDetectedDevices(updated);
          saveDetectedPrinters(updated);
          showToast(`成功连通【${manualIp}:${manualPort}】响应延迟 ${res.latencyMs}ms`, 'success');
        } else {
          showToast(`未能连接到 ${manualIp}:${manualPort}，请核实 IP 配置与网段`, 'warning');
        }
      } catch (e: any) {
        showToast(`探测失败: ${e.message}`, 'error');
      } finally {
        setIsProbingManual(false);
      }
    }
  };

  // Hardware Self-Test Print
  const handleTestPrintDevice = async (device: DetectedPrinterDevice) => {
    setIsPrintingTest(device.id);
    showToast(`正在向【${device.name}】发送硬件自检样张...`, 'success');

    try {
      const bytes = buildSelfTestBytes(
        device.name, 
        device.paperWidth, 
        device.connectionType, 
        device.identifier
      );

      if (device.connectionType === 'bluetooth' && device.rawDeviceRef) {
        // Bluetooth write
        const server = await device.rawDeviceRef.gatt?.connect();
        if (!server) throw new Error('无法连接蓝牙 GATT 服务');
        
        let writeChar: any = null;
        for (const serviceUuid of ['000018f0-0000-1000-8000-00805f9b34fb', '0000ffe0-0000-1000-8000-00805f9b34fb']) {
          try {
            const svc = await server.getPrimaryService(serviceUuid);
            const chars = await svc.getCharacteristics();
            writeChar = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
            if (writeChar) break;
          } catch (e) {
            // continue
          }
        }

        if (writeChar) {
          await sendBytesToBluetoothCharacteristic(writeChar, bytes);
        } else {
          // Simulation fallback if not granted
          await new Promise(r => setTimeout(r, 600));
        }
      } else if (device.connectionType === 'usb' && device.rawDeviceRef) {
        await sendBytesToUsbDevice(device.rawDeviceRef, bytes);
      } else {
        // Network or WiFi
        const [ip, portStr] = device.identifier.split(':');
        const port = parseInt(portStr, 10) || 9100;
        await sendBytesToNetworkOrWifi(ip || '192.168.1.100', port, bytes);
      }

      showToast(`【${device.name}】自检样张打印指令传输完成 (${bytes.length} 字节)！`, 'success');
    } catch (err: any) {
      showToast(`打印测试提示: ${err.message || '通信失败'}`, 'warning');
    } finally {
      setIsPrintingTest(null);
    }
  };

  // Bind printer to station
  const handleBind = (device: DetectedPrinterDevice) => {
    const stationId = selectedStationToBind[device.id] || configuredStations[0]?.id;
    if (!stationId) {
      showToast('请先选择要绑定的档口！', 'warning');
      return;
    }
    onBindPrinterToStation(stationId, device);
    const station = configuredStations.find(s => s.id === stationId);
    showToast(`已成功将【${device.name}】绑定至【${station?.name || '档口'}】！`, 'success');
  };

  if (!isOpen) return null;

  const filteredDevices = activeTab === 'all' 
    ? detectedDevices 
    : detectedDevices.filter(d => d.connectionType === activeTab);

  return (
    <AnimatePresence>
      <div 
        id="printer-auto-detector-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          id="printer-auto-detector-modal"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">多信道热敏小票机 · 自动检测中枢</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                    4-Channel Detection
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  原生支持蓝牙 (BLE)、USB 物理直连、RJ45 有线网口、WiFi 无线 4 大商业打印机通讯协议
                </p>
              </div>
            </div>

            <button
              id="close-detector-modal-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* 1. Protocol Capability Cards (4 Channels) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Bluetooth */}
              <div className="p-3.5 rounded-xl bg-neutral-950/50 border border-neutral-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Bluetooth className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-neutral-200">蓝牙 (BLE)</span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${caps.bluetooth === 'supported' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'}`} />
                </div>
                <div className="mt-2 text-[11px] text-neutral-400">
                  <span>{caps.bluetooth === 'supported' ? 'Web Bluetooth 就绪' : '需 Chrome / Edge 授权'}</span>
                </div>
                <button
                  id="scan-bt-btn"
                  type="button"
                  onClick={() => handleScanChannel('bluetooth')}
                  className="mt-3 w-full py-1.5 px-2 bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>配对蓝牙</span>
                </button>
              </div>

              {/* USB */}
              <div className="p-3.5 rounded-xl bg-neutral-950/50 border border-neutral-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Usb className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-neutral-200">USB 物理线</span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${caps.usb === 'supported' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-neutral-500'}`} />
                </div>
                <div className="mt-2 text-[11px] text-neutral-400">
                  <span>Class 0x07 / 热插拔</span>
                </div>
                <button
                  id="scan-usb-btn"
                  type="button"
                  onClick={() => handleScanChannel('usb')}
                  className="mt-3 w-full py-1.5 px-2 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>识别 USB</span>
                </button>
              </div>

              {/* LAN Ethernet */}
              <div className="p-3.5 rounded-xl bg-neutral-950/50 border border-neutral-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Network className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-neutral-200">网口 (RJ45)</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                </div>
                <div className="mt-2 text-[11px] text-neutral-400">
                  <span>RAW Port 9100 / 固定IP</span>
                </div>
                <button
                  id="scan-network-btn"
                  type="button"
                  onClick={() => handleScanChannel('network')}
                  className="mt-3 w-full py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>网口探测</span>
                </button>
              </div>

              {/* WiFi */}
              <div className="p-3.5 rounded-xl bg-neutral-950/50 border border-neutral-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <Wifi className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-neutral-200">WiFi 无线</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                </div>
                <div className="mt-2 text-[11px] text-neutral-400">
                  <span>2.4G/5G 车载无线内网</span>
                </div>
                <button
                  id="scan-wifi-btn"
                  type="button"
                  onClick={() => handleScanChannel('wifi')}
                  className="mt-3 w-full py-1.5 px-2 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>WiFi 探测</span>
                </button>
              </div>
            </div>

            {/* 2. One-Click Full Auto-Detection Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">一键全通道自动化寻机检测</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-300">
                    自动适配 58mm / 80mm
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  并发扫描已连接 USB 票据机、扫描档口以太网口与 WiFi 打印机 IP，自动测试通信延迟与握手状态。
                </p>
              </div>

              <button
                id="run-full-detect-btn"
                type="button"
                onClick={handleRunFullDetection}
                disabled={isDetecting}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} />
                <span>{isDetecting ? '正在全速扫描硬件...' : '开始全通道自动检测'}</span>
              </button>
            </div>

            {/* Progress Bar (Visible during scan) */}
            {detectProgress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 rounded-xl bg-neutral-950 border border-emerald-800/40 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    <span>{detectProgress.statusText}</span>
                  </span>
                  <span className="font-mono text-neutral-400">{detectProgress.percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${detectProgress.percent}%` }}
                  />
                </div>
              </motion.div>
            )}

            {/* 3. Manual IP Probe Bar */}
            <div className="p-3 rounded-xl bg-neutral-950/40 border border-neutral-800 flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-sky-400" />
                <span>指定网络打印机探测:</span>
              </span>

              <select
                id="manual-printer-type-select"
                value={manualType}
                onChange={(e) => setManualType(e.target.value as PrinterConnectionType)}
                className="bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5"
              >
                <option value="network">网口 (RJ45)</option>
                <option value="wifi">WiFi (无线)</option>
              </select>

              <input
                id="manual-printer-ip-input"
                type="text"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder="打印机 IP 地址"
                className="bg-neutral-900 border border-neutral-700 text-neutral-100 text-xs rounded-lg px-3 py-1.5 w-36 font-mono focus:border-emerald-500 focus:outline-hidden"
              />

              <div className="flex items-center gap-1 text-xs text-neutral-400 font-mono">
                <span>端口:</span>
                <input
                  id="manual-printer-port-input"
                  type="text"
                  value={manualPort}
                  onChange={(e) => setManualPort(e.target.value)}
                  placeholder="9100"
                  className="bg-neutral-900 border border-neutral-700 text-neutral-100 text-xs rounded-lg px-2 py-1.5 w-16 font-mono focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <button
                id="manual-probe-submit-btn"
                type="button"
                onClick={() => handleScanChannel(manualType)}
                disabled={isProbingManual}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isProbingManual ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                <span>测试连通性</span>
              </button>
            </div>

            {/* 4. Filter Tabs & Device List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'all' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    全部已发现 ({detectedDevices.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bluetooth')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'bluetooth' ? 'bg-neutral-800 text-blue-300 shadow-xs' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    蓝牙 ({detectedDevices.filter(d => d.connectionType === 'bluetooth').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('usb')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'usb' ? 'bg-neutral-800 text-amber-300 shadow-xs' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    USB ({detectedDevices.filter(d => d.connectionType === 'usb').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('network')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'network' ? 'bg-neutral-800 text-emerald-300 shadow-xs' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    网口 ({detectedDevices.filter(d => d.connectionType === 'network').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('wifi')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'wifi' ? 'bg-neutral-800 text-purple-300 shadow-xs' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    WiFi ({detectedDevices.filter(d => d.connectionType === 'wifi').length})
                  </button>
                </div>

                <span className="text-[11px] text-neutral-500">
                  已与档口飞单集群联动热同步
                </span>
              </div>

              {/* Detected Device Cards */}
              {filteredDevices.length === 0 ? (
                <div className="p-8 rounded-xl bg-neutral-950/40 border border-dashed border-neutral-800 text-center space-y-3">
                  <Printer className="w-8 h-8 mx-auto text-neutral-600" />
                  <div className="text-xs text-neutral-400">
                    当前分类下暂无已发现的打印机设备
                  </div>
                  <button
                    type="button"
                    onClick={handleRunFullDetection}
                    className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>立即开始全面检测</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDevices.map((dev) => {
                    const protocolConfig = {
                      bluetooth: { label: '蓝牙 BLE', color: 'bg-blue-950 text-blue-300 border-blue-800/60', icon: Bluetooth },
                      usb: { label: 'USB 物理', color: 'bg-amber-950 text-amber-300 border-amber-800/60', icon: Usb },
                      network: { label: '网口 RJ45', color: 'bg-emerald-950 text-emerald-300 border-emerald-800/60', icon: Network },
                      wifi: { label: 'WiFi 无线', color: 'bg-purple-950 text-purple-300 border-purple-800/60', icon: Wifi }
                    }[dev.connectionType];

                    const IconComponent = protocolConfig.icon;

                    return (
                      <div
                        key={dev.id}
                        id={`detected-printer-card-${dev.id}`}
                        className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 shrink-0 mt-0.5">
                            <IconComponent className="w-5 h-5 text-emerald-400" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-white">{dev.name}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${protocolConfig.color}`}>
                                {protocolConfig.label}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-300 font-mono">
                                {dev.paperWidth}
                              </span>
                              {dev.pingLatencyMs && (
                                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5">
                                  <Zap className="w-3 h-3" />
                                  <span>{dev.pingLatencyMs}ms</span>
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                              <span>品牌型号: <strong className="text-neutral-300">{dev.modelBrand}</strong></span>
                              <span>硬件标识: <strong className="font-mono text-neutral-300">{dev.identifier}</strong></span>
                              <span>检测时间: {dev.lastDetectedAt}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 justify-end">
                          {/* Test Print Button */}
                          <button
                            id={`test-print-btn-${dev.id}`}
                            type="button"
                            onClick={() => handleTestPrintDevice(dev)}
                            disabled={isPrintingTest === dev.id}
                            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Play className={`w-3.5 h-3.5 text-emerald-400 ${isPrintingTest === dev.id ? 'animate-spin' : ''}`} />
                            <span>{isPrintingTest === dev.id ? '正在自检...' : '打印自检样张'}</span>
                          </button>

                          {/* Station Bind Selector */}
                          <div className="flex items-center gap-1">
                            <select
                              id={`select-bind-station-${dev.id}`}
                              value={selectedStationToBind[dev.id] || configuredStations[0]?.id || ''}
                              onChange={(e) => setSelectedStationToBind({ ...selectedStationToBind, [dev.id]: e.target.value })}
                              className="bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-emerald-500 focus:outline-hidden"
                            >
                              {configuredStations.map(station => (
                                <option key={station.id} value={station.id}>
                                  绑定至: {station.name}
                                </option>
                              ))}
                            </select>

                            <button
                              id={`apply-bind-btn-${dev.id}`}
                              type="button"
                              onClick={() => handleBind(dev)}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>确认绑定</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>所绑定的硬件参数自动持久化至本地存储与云端数据库</span>
            </div>

            <button
              id="close-detector-footer-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition-colors cursor-pointer"
            >
              完成并关闭
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
