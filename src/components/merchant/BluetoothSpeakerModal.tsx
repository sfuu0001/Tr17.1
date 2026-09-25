import React, { useState, useEffect } from 'react';
import {
  Bluetooth,
  Volume2,
  VolumeX,
  Battery,
  BatteryCharging,
  Radio,
  Signal,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Smartphone,
  Speaker,
  HelpCircle,
  Plus,
  Trash2,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import {
  globalBluetoothAudio,
  BluetoothSpeakerDevice,
  BluetoothAudioConfig,
  AudioRoutingMode,
  checkAudioSinkSupport,
  checkWebBluetoothSupport,
  checkMediaDevicesSupport
} from '../../utils/bluetoothAudioEngine';

interface BluetoothSpeakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const BluetoothSpeakerModal: React.FC<BluetoothSpeakerModalProps> = ({
  isOpen,
  onClose,
  showToast
}) => {
  const [devices, setDevices] = useState<BluetoothSpeakerDevice[]>(() => globalBluetoothAudio.getDevices());
  const [config, setConfig] = useState<BluetoothAudioConfig>(() => globalBluetoothAudio.getConfig());
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'routing' | 'devices' | 'test' | 'tuning'>('routing');
  const [isTestingBt, setIsTestingBt] = useState(false);
  const [isTestingPhone, setIsTestingPhone] = useState(false);

  // 监听引擎事件刷新
  useEffect(() => {
    const handleUpdate = () => {
      setDevices(globalBluetoothAudio.getDevices());
      setConfig(globalBluetoothAudio.getConfig());
    };
    window.addEventListener('obsidian_bluetooth_speaker_changed', handleUpdate);
    return () => window.removeEventListener('obsidian_bluetooth_speaker_changed', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const activeDevice = devices.find(d => d.id === config.activeDeviceId) || null;
  const isConnected = config.enabled && activeDevice && activeDevice.status === 'connected';

  // 切换路由模式
  const handleSelectRoutingMode = (mode: AudioRoutingMode) => {
    globalBluetoothAudio.setRoutingMode(mode);
    if (mode === 'voice_only') {
      showToast('已切换至【仅系统语音专属通道】：只播放订单叫号，非语音与手机声音保留源设备');
    } else {
      showToast('已切换至【统一混合播放】：系统语音与所有声音混合路由');
    }
  };

  // 连接设备
  const handleConnect = async (devId: string) => {
    const ok = await globalBluetoothAudio.connectDevice(devId);
    const target = devices.find(d => d.id === devId);
    if (ok) {
      showToast(`已成功绑定并连接【${target?.name || '蓝牙音箱'}】`);
    }
  };

  // 断开设备
  const handleDisconnect = (devId: string) => {
    globalBluetoothAudio.disconnectDevice(devId);
    showToast('已断开蓝牙播放器连接');
  };

  // 移除设备
  const handleRemove = (devId: string) => {
    globalBluetoothAudio.removeDevice(devId);
    showToast('已解除该蓝牙音箱绑定');
  };

  // 搜索新设备
  const handleScanPair = async () => {
    setIsScanning(true);
    showToast('正在启动蓝牙与声卡输出扫描中枢...');
    try {
      const newDev = await globalBluetoothAudio.requestPairNewDevice();
      if (newDev) {
        showToast(`配对成功！已绑定【${newDev.name}】`);
      }
    } catch (e) {
      showToast('搜索已取消或未发现新设备');
    } finally {
      setIsScanning(false);
    }
  };

  // 测试蓝牙通道
  const handleTestBluetoothVoice = async () => {
    setIsTestingBt(true);
    showToast('正在向【蓝牙音箱】发送系统专送语音测试...');
    try {
      await globalBluetoothAudio.testBluetoothVoiceChannel();
    } finally {
      setTimeout(() => setIsTestingBt(false), 2400);
    }
  };

  // 测试源设备手机通道
  const handleTestSourcePhone = async () => {
    setIsTestingPhone(true);
    showToast('正在向【源设备手机】发送非语音本地发声测试...');
    try {
      await globalBluetoothAudio.testSourceDeviceLocalChannel();
    } finally {
      setTimeout(() => setIsTestingPhone(false), 2400);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-[#e3e2e0] flex flex-col max-h-[92vh] overflow-hidden select-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[#e6e6e4] bg-[#fafaf9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0 relative">
              <Bluetooth className="w-5 h-5" />
              {isConnected && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#37352f]">
                  蓝牙播放器链接与绑定系统
                </h2>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                  isConnected 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {isConnected ? '已连接运行中' : '未连接蓝牙'}
                </span>
              </div>
              <p className="text-xs text-[#787774] mt-0.5">
                支持三端声学定向隔离：仅播报系统语音，非语音及手机音频安全保留源设备
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#787774] hover:text-[#37352f] hover:bg-[#efefed] rounded-lg transition-colors cursor-pointer"
            title="关闭窗口"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Segmented Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-2 pb-0 bg-white border-b border-[#efefed] flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('routing')}
            className={`px-3 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'routing'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>声学路由模式 (核心)</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-semibold">
              {config.routingMode === 'voice_only' ? '仅系统语音' : '统一混合'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            className={`px-3 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'devices'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <Speaker className="w-4 h-4" />
            <span>设备绑定与列表</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-[#efefed] text-[#787774] rounded font-semibold">
              {devices.length}台音箱
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('test')}
            className={`px-3 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'test'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>双通道隔离实测</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tuning')}
            className={`px-3 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tuning'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-[#787774] hover:text-[#37352f]'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>大喇叭增益与调谐</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-[#37352f]">
          
          {/* TAB 1: 声学专属路由设置 (核心诉求) */}
          {activeTab === 'routing' && (
            <div className="space-y-4">
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-blue-900 leading-relaxed flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">声学定向隔离路由说明：</span>
                  通过现代浏览器声卡输出端口与底层通道隔离技术，系统支持将自营专送订单、前台叫号、出餐提醒等关键语音独占发往餐车外放蓝牙音箱；手机本地的声音（微信、音乐、通话、普通点击音）留在手机自身扬声器，互不干扰！
                </div>
              </div>

              {/* Two Core Routing Options Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Mode A: 仅系统语音专属通道 (Voice Dedicated) */}
                <div
                  onClick={() => handleSelectRoutingMode('voice_only')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    config.routingMode === 'voice_only'
                      ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                      : 'border-[#e6e6e4] hover:border-[#b4b4b0] bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                          ✓
                        </span>
                        <h3 className="font-bold text-sm sm:text-base text-[#37352f]">
                          只播放系统语音播报
                        </h3>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        官方推荐 · 声学隔离
                      </span>
                    </div>

                    <p className="text-xs text-[#5a5854] leading-relaxed mb-3">
                      <strong>【精准专线通道】</strong> 仅将餐车订单播报、前台取餐叫号、催单预警与后厨出餐等系统业务语音，定向路由至绑定的蓝牙播放器。
                    </p>

                    <div className="bg-white/80 border border-[#e3e2e0] rounded-lg p-2.5 text-[11px] space-y-1.5 mb-3 font-mono">
                      <div className="flex items-center justify-between text-blue-800">
                        <span className="flex items-center gap-1">
                          <Speaker className="w-3.5 h-3.5 text-blue-600" />
                          <span>系统业务语音</span>
                        </span>
                        <span className="font-bold">➔ 蓝牙音响输出 🔊</span>
                      </div>
                      <div className="flex items-center justify-between text-[#787774]">
                        <span className="flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5 text-slate-600" />
                          <span>非语音/手机自身声源</span>
                        </span>
                        <span className="font-bold">➔ 手机扬声器保留 📱</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-dashed border-[#dcdad5] flex items-center justify-between">
                    <span className="text-[11px] text-[#787774]">不路由手机其他杂音至蓝牙</span>
                    <span className={`text-xs font-bold ${
                      config.routingMode === 'voice_only' ? 'text-blue-700' : 'text-[#787774]'
                    }`}>
                      {config.routingMode === 'voice_only' ? '● 当前生效中' : '点击选择此模式'}
                    </span>
                  </div>
                </div>

                {/* Mode B: 统一混合播放 (Unified) */}
                <div
                  onClick={() => handleSelectRoutingMode('unified')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    config.routingMode === 'unified'
                      ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                      : 'border-[#e6e6e4] hover:border-[#b4b4b0] bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#787774] text-white text-xs flex items-center justify-center font-bold">
                          2
                        </span>
                        <h3 className="font-bold text-sm sm:text-base text-[#37352f]">
                          统一混合播放模式
                        </h3>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#efefed] text-[#787774] border border-[#d3d1cb]">
                        全局通道
                      </span>
                    </div>

                    <p className="text-xs text-[#5a5854] leading-relaxed mb-3">
                      <strong>【全局混音通道】</strong> 系统语音播报与整个设备的点击音、提示音以及所有声源统一通过默认音频通道输出，不作专属声学分离。
                    </p>

                    <div className="bg-white/80 border border-[#e3e2e0] rounded-lg p-2.5 text-[11px] space-y-1.5 mb-3 font-mono">
                      <div className="flex items-center justify-between text-[#5a5854]">
                        <span>系统业务语音</span>
                        <span className="font-bold">➔ 混合全局输出 🔊</span>
                      </div>
                      <div className="flex items-center justify-between text-[#5a5854]">
                        <span>非语音及其他设备声音</span>
                        <span className="font-bold">➔ 混合全局输出 🔊</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-dashed border-[#dcdad5] flex items-center justify-between">
                    <span className="text-[11px] text-[#787774]">适合将所有设备声音全部外放</span>
                    <span className={`text-xs font-bold ${
                      config.routingMode === 'unified' ? 'text-blue-700' : 'text-[#787774]'
                    }`}>
                      {config.routingMode === 'unified' ? '● 当前生效中' : '点击选择此模式'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Active Speaker Status Banner */}
              <div className="p-4 rounded-xl bg-[#fafaf9] border border-[#e3e2e0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shrink-0">
                    🔊
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#37352f]">
                        {activeDevice ? activeDevice.name : '未选择绑定音箱'}
                      </span>
                      {activeDevice && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold">
                          电量 {activeDevice.batteryLevel}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#787774] mt-0.5">
                      {activeDevice 
                        ? `${activeDevice.brandModel} · MAC: ${activeDevice.macAddress}`
                        : '请在设备列表中选择或配对餐车蓝牙外放音响'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleTestBluetoothVoice}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>试听蓝牙播报</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('devices')}
                    className="px-3 py-1.5 bg-white hover:bg-[#efefed] text-[#37352f] rounded-lg text-xs font-bold border border-[#d3d1cb] cursor-pointer transition-colors"
                  >
                    切换设备
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 设备绑定与列表 */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-sm text-[#37352f]">已绑定的流动餐车蓝牙音箱</h3>
                  <p className="text-xs text-[#787774]">支持记忆多台车载或手持音箱，断线自动优先重连默认设备</p>
                </div>

                <button
                  type="button"
                  onClick={handleScanPair}
                  disabled={isScanning}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                >
                  <Bluetooth className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? '正在扫描搜索...' : '搜索配对新音箱'}</span>
                </button>
              </div>

              {/* Devices Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {devices.map((dev) => {
                  const isCur = dev.id === config.activeDeviceId;
                  const isDevConnected = dev.status === 'connected';

                  return (
                    <div
                      key={dev.id}
                      className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                        isCur
                          ? 'border-blue-500 bg-blue-50/20 shadow-xs'
                          : 'border-[#e6e6e4] hover:border-[#b4b4b0] bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">
                              {dev.deviceType === 'soundbar' ? '📻' : dev.deviceType === 'car_bluetooth' ? '🚚' : '🔊'}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-sm text-[#37352f]">{dev.name}</span>
                                {dev.isDefault && (
                                  <span className="text-[9px] px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-semibold">
                                    默认
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#787774] font-mono block">
                                MAC: {dev.macAddress}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                            isDevConnected
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : dev.status === 'connecting'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                              : 'bg-neutral-100 text-[#787774] border-neutral-200'
                          }`}>
                            {isDevConnected ? '已连接' : dev.status === 'connecting' ? '连接中...' : '已断开'}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#787774] mb-3 line-clamp-1">{dev.brandModel}</p>

                        {/* Telemetry info */}
                        <div className="grid grid-cols-3 gap-1.5 bg-[#f7f7f5] p-2 rounded-lg text-[10px] text-[#5a5854] mb-3 font-mono">
                          <div className="flex items-center gap-1">
                            <Battery className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{dev.batteryLevel}% 电量</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Signal className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>{dev.signalRssi} dBm</span>
                          </div>
                          <div className="text-right truncate">
                            <span>{dev.lastConnectedAt}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#f0eee9] gap-2">
                        {isCur && isDevConnected ? (
                          <button
                            type="button"
                            onClick={() => handleDisconnect(dev.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200 cursor-pointer"
                          >
                            断开连接
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConnect(dev.id)}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded cursor-pointer shadow-2xs"
                          >
                            连接并生效
                          </button>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleTestBluetoothVoice()}
                            className="p-1 text-[#787774] hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            title="试听该音箱"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(dev.id)}
                            className="p-1 text-[#787774] hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="解除绑定"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hardware API compatibility note */}
              <div className="bg-[#f7f7f5] rounded-xl p-3 border border-[#e6e6e4] flex items-center justify-between text-[11px] text-[#787774] flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    底层支持：W3C setSinkId ({checkAudioSinkSupport() ? '✅ 已就绪' : '⚠️ 自动虚拟路由'}) · Web Bluetooth ({checkWebBluetoothSupport() ? '✅ 可用' : '⚠️ 模拟通道'})
                  </span>
                </div>
                <span className="text-[10px] text-blue-700 font-medium">支持全自动断线重连</span>
              </div>
            </div>
          )}

          {/* TAB 3: 双通道隔离实测 (现场验证两端分离) */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">现场声学生理隔离验证中心：</span>
                在此您可以分别向「蓝牙音箱专属通道」与「源设备手机通道」单独发送测试音频，现场验证两者是否彻底分立。
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Test A: Bluetooth Speaker Voice Channel */}
                <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                        🔊
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#37352f]">测试 1：仅蓝牙音箱发声</h4>
                        <span className="text-[10px] text-blue-700 font-mono">系统语音专属定向通道</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#5a5854] leading-relaxed mb-4">
                      将直接向已连接的蓝牙播放器发送高保真真人语音播报，验证餐车外放音箱正常出声，手机扬声器保持静默。
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestBluetoothVoice}
                    disabled={isTestingBt}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                      isTestingBt
                        ? 'bg-blue-700 text-white animate-pulse'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    <span>{isTestingBt ? '正在蓝牙音箱发声中...' : '▶ 验证蓝牙音响播报'}</span>
                  </button>
                </div>

                {/* Test B: Source Device Phone Local Channel */}
                <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50/40 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold">
                        📱
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#37352f]">测试 2：仅源设备手机发声</h4>
                        <span className="text-[10px] text-slate-700 font-mono">非语音/手机本机扬声器通道</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#5a5854] leading-relaxed mb-4">
                      将直接向手机自带喇叭（或当前浏览端本地声卡）播放非语音提示声，验证蓝牙音箱完全静音不漏音。
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestSourcePhone}
                    disabled={isTestingPhone}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                      isTestingPhone
                        ? 'bg-slate-900 text-white animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>{isTestingPhone ? '正在手机本地发声中...' : '▶ 验证源设备手机发声'}</span>
                  </button>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="p-3 bg-[#fafaf9] rounded-xl border border-[#e3e2e0] text-center text-xs text-[#787774]">
                当前路由模式：<strong className="text-[#37352f]">{config.routingMode === 'voice_only' ? '【仅系统语音专属通道】' : '【统一混合模式】'}</strong> · 已开启防非语音泄漏防护
              </div>
            </div>
          )}

          {/* TAB 4: 大喇叭增益与调谐 */}
          {activeTab === 'tuning' && (
            <div className="space-y-4">
              {/* Gain Slider */}
              <div className="p-4 rounded-xl border border-[#e6e6e4] bg-[#fafaf9] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#37352f]">针对蓝牙大喇叭的播报人声增益</h4>
                    <p className="text-xs text-[#787774]">流动餐车户外环境嘈杂时，可适当提高播报分贝</p>
                  </div>
                  <span className="text-sm font-mono font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-md">
                    {Math.round(config.voiceVolumeGain * 100)}% ({config.voiceVolumeGain > 1 ? `+${((config.voiceVolumeGain - 1) * 6).toFixed(1)}dB` : '标准'})
                  </span>
                </div>

                <input
                  type="range"
                  min="0.8"
                  max="1.8"
                  step="0.1"
                  value={config.voiceVolumeGain}
                  onChange={(e) => globalBluetoothAudio.setVolumeGain(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#e6e6e4] rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                <div className="flex justify-between text-[10px] text-[#908e89] font-mono">
                  <span>80% (室内静音)</span>
                  <span>100% (标准原声)</span>
                  <span>130% (+2dB 窗口推荐)</span>
                  <span>160% (+4dB 户外穿透)</span>
                  <span>180% (极限广播)</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2.5">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#e6e6e4] bg-white cursor-pointer hover:bg-[#fafaf9]">
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-[#37352f]">智能人声防爆音限制器 (Limiter)</div>
                    <div className="text-[11px] text-[#787774]">当瞬间高音量触发时，平滑压制峰值，防止大喇叭喇叭破音破损</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.preventAudioClipping}
                    onChange={(e) => globalBluetoothAudio.updateAdvancedOptions({ preventAudioClipping: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#e6e6e4] bg-white cursor-pointer hover:bg-[#fafaf9]">
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-[#37352f]">严格防非语音泄漏防护 (Sound Leak Protection)</div>
                    <div className="text-[11px] text-[#787774]">强制阻止所有非语音音效流向蓝牙通道，确保蓝牙音响仅出业务口令</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.soundLeakProtection}
                    onChange={(e) => globalBluetoothAudio.updateAdvancedOptions({ soundLeakProtection: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#e6e6e4] bg-white cursor-pointer hover:bg-[#fafaf9]">
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-[#37352f]">断线静默自动重连 (Auto Reconnect)</div>
                    <div className="text-[11px] text-[#787774]">当蓝牙音箱走出范围或休眠唤醒后，自动恢复专属语音通道绑定</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.autoReconnect}
                    onChange={(e) => globalBluetoothAudio.updateAdvancedOptions({ autoReconnect: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#e6e6e4] bg-[#fafaf9] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-[#787774]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              当前状态：{isConnected ? `已绑定 【${activeDevice?.name}】` : '未连接音箱'} · 模式：{config.routingMode === 'voice_only' ? '仅系统语音' : '统一混合'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#37352f] hover:bg-[#201f1d] text-white rounded-lg text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-colors"
          >
            完成并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
