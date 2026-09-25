import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Settings2, 
  Check, 
  X, 
  Bell, 
  Megaphone,
  Radio,
  UserCheck,
  Bike,
  Clock,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Bluetooth,
  Speaker,
  Smartphone,
  Activity,
  RefreshCw,
  HelpCircle,
  StopCircle
} from 'lucide-react';
import { 
  VoiceConfig, 
  getVoiceConfig, 
  saveVoiceConfig, 
  speakText, 
  playChimeSound, 
  playPersonaAudition,
  stopCurrentAudio,
  forceStopAllBroadcasts,
  getBroadcastState,
  BroadcastState,
  VOICE_FORCE_STOP_EVENT,
  voiceAlerts,
  VOICE_PERSONAS,
  VoicePersonaId,
  getAvailableSystemVoices,
  findBestPersonaVoice,
  resolvePersonaVoiceName,
  checkVoicePackAvailability,
  unlockAudioContext,
  diagnoseAndRepairVoiceEngine,
  VoiceEngineDiagnosis
} from '../../utils/voiceAlertEngine';
import {
  mergeLocalPrefs,
  fetchPrefsFromCloud,
  getWorkspacePrefsSnapshot
} from '../../utils/workspacePreferences';

/** 语音配置 → wsPrefs.voice 云端镜像（写时双发，fire-and-forget） */
function syncVoiceToWorkspacePrefs(cfg: VoiceConfig): void {
  try {
    mergeLocalPrefs({
      voice: {
        enabled: cfg.enabled,
        volume: cfg.volume,
        rate: cfg.rate,
        pitch: cfg.pitch,
        persona: cfg.persona,
        personaVoiceMap: cfg.personaVoiceMap,
        chimeStyle: cfg.chimeStyle,
        soundEffectEnabled: cfg.soundEffectEnabled,
        humanCadenceEnabled: cfg.humanCadenceEnabled,
        autoPlayNewOrder: cfg.autoPlayNewOrder,
        autoPlayUrgent: cfg.autoPlayUrgent,
        autoPlayCalling: cfg.autoPlayCalling,
        autoPlayQueueWait: cfg.autoPlayQueueWait,
        autoPlayRiderPool: cfg.autoPlayRiderPool,
        autoPlayRiderAction: cfg.autoPlayRiderAction
      }
    });
  } catch { /* 云同步失败不影响本地生效 */ }
}
import { 
  globalBluetoothAudio,
  BluetoothAudioConfig,
  BluetoothSpeakerDevice,
  AudioRoutingMode 
} from '../../utils/bluetoothAudioEngine';
import { BluetoothSpeakerModal } from './BluetoothSpeakerModal';

interface MerchantVoiceControlsProps {
  showToast: (msg: string) => void;
}

export const MerchantVoiceControls: React.FC<MerchantVoiceControlsProps> = ({ showToast }) => {
  const [config, setConfig] = useState<VoiceConfig>(getVoiceConfig());
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState<boolean>(false);
  const [btConfig, setBtConfig] = useState<BluetoothAudioConfig>(() => globalBluetoothAudio.getConfig());
  const [activeBtDevice, setActiveBtDevice] = useState<BluetoothSpeakerDevice | null>(() => globalBluetoothAudio.getActiveDevice());
  const [diagnosis, setDiagnosis] = useState<VoiceEngineDiagnosis | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  // 连续播报状态（强制中断按钮的数据源）与语音包装载状态
  const [broadcastState, setBroadcastState] = useState<BroadcastState>(() => getBroadcastState());
  const [voicePackStatus, setVoicePackStatus] = useState<Partial<Record<VoicePersonaId, boolean>>>({});

  const runDiagnosis = async () => {
    setIsDiagnosing(true);
    await unlockAudioContext();
    const res = await diagnoseAndRepairVoiceEngine();
    setDiagnosis(res);
    setIsDiagnosing(false);
    showToast(res.repaired ? '已完成声学自检并成功修复挂起通道！' : '声学引擎自检完毕，系统已就绪！');
  };

  // 监听外部配置变动事件，保持全局一致
  useEffect(() => {
    const handleSync = () => {
      setConfig(getVoiceConfig());
    };
    const handleBtSync = () => {
      setBtConfig(globalBluetoothAudio.getConfig());
      setActiveBtDevice(globalBluetoothAudio.getActiveDevice());
    };
    window.addEventListener('voiceConfigChanged', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('obsidian_bluetooth_speaker_changed', handleBtSync);
    return () => {
      window.removeEventListener('voiceConfigChanged', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('obsidian_bluetooth_speaker_changed', handleBtSync);
    };
  }, []);

  // v3 偏好云端绑定：本地语音键缺失时从 wsPrefs（云端镜像）自愈回写
  useEffect(() => {
    const healFromPrefs = () => {
      try {
        if (localStorage.getItem('obsidian_merchant_voice_config_v2')) return; // 本地健在，不接管
        const snap = getWorkspacePrefsSnapshot();
        if (!snap.voice) return;
        saveVoiceConfig({ ...getVoiceConfig(), ...snap.voice } as VoiceConfig);
        setConfig(getVoiceConfig());
        window.dispatchEvent(new CustomEvent('voiceConfigChanged', { detail: getVoiceConfig() }));
      } catch { /* 自愈失败静默降级 */ }
    };
    healFromPrefs();
    // 挂载期云端拉取完成后再补一次（首次设备/清库场景）
    fetchPrefsFromCloud().then((cloud) => { if (cloud) healFromPrefs(); });
  }, []);

  useEffect(() => {
    const updateVoices = () => {
      const voices = getAvailableSystemVoices();
      setSystemVoices(voices);
    };
    updateVoices();
    // 深度修复：必须 addEventListener，禁止 onvoiceschanged 赋值——
    // 此前该赋值会覆盖引擎侧同名监听，导致引擎音源缓存失效、角色切换解析不到新音源
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
    }
  }, [isOpen]);

  // 连续播报状态轮询（1.2s）：驱动顶栏与面板中的强制中断按钮可见性
  useEffect(() => {
    const tick = () => setBroadcastState(getBroadcastState());
    tick();
    const timer = setInterval(tick, 1200);
    window.addEventListener(VOICE_FORCE_STOP_EVENT, tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener(VOICE_FORCE_STOP_EVENT, tick);
    };
  }, []);

  // 语音包（WAV 母带）装载状态检测（面板打开时检测一次）
  useEffect(() => {
    if (!isOpen) return;
    checkVoicePackAvailability().then(setVoicePackStatus);
  }, [isOpen]);

  const updateConfig = (partial: Partial<VoiceConfig>) => {
    const updated = { ...config, ...partial };
    setConfig(updated);
    saveVoiceConfig(updated);
    syncVoiceToWorkspacePrefs(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('voiceConfigChanged', { detail: updated }));
    }
  };

  const handleToggleMute = () => {
    const nextState = !config.enabled;
    const newCfg = { ...config, enabled: nextState };
    setConfig(newCfg);
    saveVoiceConfig(newCfg);
    syncVoiceToWorkspacePrefs(newCfg);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('voiceConfigChanged', { detail: newCfg }));
    }
    showToast(nextState ? '🔊 真人语音播报与出餐声学铃声已开启' : '🔇 语音播报已静音');
    if (nextState) {
      playChimeSound('order');
    }
  };

  const handleSelectPersona = (personaId: VoicePersonaId) => {
    const personaMeta = VOICE_PERSONAS.find(p => p.id === personaId) || VOICE_PERSONAS[0];
    const updated: VoiceConfig = {
      ...config,
      persona: personaId,
      selectedVoiceName: undefined, // 消除旧角色锁定，确保自动匹配当前角色的最佳音源
      rate: personaMeta.defaultRate,
      pitch: personaMeta.defaultPitch
    };

    setConfig(updated);
    saveVoiceConfig(updated); // 关键：立即同步写入存储，防止异步延迟读取旧配置
    syncVoiceToWorkspacePrefs(updated);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('voiceConfigChanged', { detail: updated }));
    }

    showToast(`已切换至【${personaMeta.name}】(${personaMeta.genderLabel})，真人母带原声已即时生效`);
    
    // 立即播放高保真母带级纯正真人音频（男女声完全独立，杜绝机械人机感）
    playPersonaAudition(personaId, updated.volume);
  };

  const currentPersona = VOICE_PERSONAS.find(p => p.id === config.persona) || VOICE_PERSONAS[0];

  // 连续播报强制中断结束：立即停当前语音 + 清空待播队列 + 停母带音频
  const handleForceStop = () => {
    forceStopAllBroadcasts();
    setBroadcastState(getBroadcastState());
    showToast('⏹ 已强制中断全部连续播报（含排队队列）');
  };

  // 为指定真人角色绑定专属系统音源（精准切换的核心：角色 ↔ 音源 1:1 记忆）
  const handleBindPersonaVoice = (personaId: VoicePersonaId, voiceName: string) => {
    const map = { ...(config.personaVoiceMap || {}) };
    if (voiceName) {
      map[personaId] = voiceName;
    } else {
      delete map[personaId]; // 清除绑定 = 回落自动独占分配
    }
    updateConfig({ personaVoiceMap: map });
    showToast(voiceName ? `已为该角色绑定专属音源，下次播报即生效` : '已解除绑定，回落智能独占分配');
  };

  return (
    <div className="relative">
      {/* Top Bar Quick Indicator & Controls */}
      <div style={{ backgroundColor: '#ffffff' }} className="group/voice flex items-center gap-1 bg-white hover:bg-[#f8f8f7] px-1.5 py-1 rounded-[4px] border border-[#d3d1cb] text-xs transition-all shrink-0 cursor-pointer">
        <button
          type="button"
          onClick={handleToggleMute}
          className={`flex items-center gap-1 cursor-pointer font-medium ${
            config.enabled ? 'text-emerald-700' : 'text-[#787774]'
          }`}
          title={config.enabled ? '点击静音语音播报' : '点击开启语音播报'}
        >
          {config.enabled ? (
            <div className="flex items-center">
              <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover/voice:max-w-[48px] group-hover/voice:opacity-100 group-hover/voice:ml-1 transition-all duration-200 font-semibold">语音</span>
            </div>
          ) : (
            <div className="flex items-center">
              <VolumeX className="w-3.5 h-3.5 text-[#787774] shrink-0" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover/voice:max-w-[48px] group-hover/voice:opacity-100 group-hover/voice:ml-1 transition-all duration-200 font-semibold">静音</span>
            </div>
          )}
        </button>

        {(broadcastState.speaking || broadcastState.queueLength > 0) && (
          <>
            <span className="text-[#d3d1cb] hidden group-hover/voice:inline transition-opacity duration-200">|</span>
            <button
              type="button"
              onClick={handleForceStop}
              className="relative flex items-center cursor-pointer shrink-0"
              title={`强制中断全部连续播报（当前排队 ${broadcastState.queueLength} 条）`}
            >
              <StopCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse shrink-0" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover/voice:max-w-[48px] group-hover/voice:opacity-100 group-hover/voice:ml-1 transition-all duration-200 font-semibold text-rose-700">中断</span>
              {broadcastState.queueLength > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[12px] h-[12px] px-0.5 rounded-full bg-rose-600 text-white text-[8px] font-bold flex items-center justify-center">
                  {broadcastState.queueLength}
                </span>
              )}
            </button>
          </>
        )}

        <span className="text-[#d3d1cb] hidden group-hover/voice:inline transition-opacity duration-200">|</span>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-[#37352f] hover:text-black p-0.5 cursor-pointer shrink-0 flex items-center gap-0.5"
          title="语音播报设置"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

        <span className="text-[#d3d1cb] hidden group-hover/voice:inline transition-opacity duration-200">|</span>

      {/* Voice Settings Backdrop on Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 sm:hidden z-40 backdrop-blur-2xs"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Voice Settings Dropdown / Modal */}
      {isOpen && (
        <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-14 sm:top-full mt-1.5 sm:w-96 max-w-[calc(100vw-24px)] mx-auto sm:mx-0 bg-white rounded-xl shadow-2xl border border-[#d3d1cb] p-4 sm:p-5 z-50 text-[#37352f] max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#e3e2e0] mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm">真人语音播报中心</span>
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded border border-emerald-200">
                    去人机声引擎
                  </span>
                </div>
                <p className="text-[11px] text-[#787774]">覆盖前台叫号、等位、自营新订单与骑手协同</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#787774] hover:text-[#37352f] p-1 rounded hover:bg-[#f1f1ef] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* 声学自检与挂起自愈卡片 (解决播放不生效与浏览器挂起) */}
            <div className="p-2.5 bg-[#fbfbfa] rounded-lg border border-[#e3e2e0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[#37352f]">声学引擎状态诊断</span>
                    {diagnosis && (
                      <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                        diagnosis.speechSynthesisState === 'ready' || diagnosis.speechSynthesisState === 'speaking'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {diagnosis.speechSynthesisState === 'ready' ? '就绪' : diagnosis.speechSynthesisState === 'speaking' ? '播报中' : '已挂起'}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#787774] block">
                    {diagnosis 
                      ? `中文音源 ${diagnosis.availableVoicesCount} 个 · AudioContext: ${diagnosis.audioContextState}` 
                      : '检测浏览器自动播放授权与语音合成通道'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={runDiagnosis}
                disabled={isDiagnosing}
                className="px-2 py-1 bg-white hover:bg-[#f1f1ef] text-[#37352f] rounded border border-[#d3d1cb] font-medium text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95 transition-all"
                title="一键诊断声学通道并强制激活挂起的音频服务"
              >
                <RefreshCw className={`w-3 h-3 text-emerald-600 ${isDiagnosing ? 'animate-spin' : ''}`} />
                <span>{isDiagnosing ? '诊断中' : '自检修复'}</span>
              </button>
            </div>

            {/* 连续播报强制中断（引擎级：停当前语音 + 清空队列 + 停母带音频） */}
            <div className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
              broadcastState.speaking || broadcastState.queueLength > 0
                ? 'bg-rose-50/70 border-rose-200'
                : 'bg-[#fbfbfa] border-[#e3e2e0]'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <StopCircle className={`w-4 h-4 shrink-0 ${broadcastState.speaking ? 'text-rose-600 animate-pulse' : 'text-[#787774]'}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[#37352f]">连续播报强制中断</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                      broadcastState.speaking
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-[#e6e6e4] text-[#787774]'
                    }`}>
                      {broadcastState.speaking ? '播报中' : '空闲'}
                    </span>
                    {broadcastState.queueLength > 0 && (
                      <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-amber-100 text-amber-800">
                        队列 {broadcastState.queueLength} 条待播
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#787774] block truncate">
                    一键结束当前语音与全部排队连续播报（叫号连播/重复播报立即终止）
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleForceStop}
                disabled={!broadcastState.speaking && broadcastState.queueLength === 0}
                className={`shrink-0 px-2.5 py-1.5 rounded-md font-bold text-[11px] flex items-center gap-1 border transition-all active:scale-95 ${
                  broadcastState.speaking || broadcastState.queueLength > 0
                    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 cursor-pointer shadow-xs'
                    : 'bg-[#f5f5f4] text-[#b0afa9] border-[#e6e6e4] cursor-not-allowed'
                }`}
                title="立即停止所有正在播出与排队中的语音"
              >
                <StopCircle className="w-3.5 h-3.5" />
                强制中断
              </button>
            </div>

            {/* Master Switch */}
            <div className="flex items-center justify-between p-2.5 bg-[#f7f7f5] rounded-lg border border-[#e3e2e0]">
              <div className="flex items-center gap-2">
                <Volume2 className={`w-4 h-4 ${config.enabled ? 'text-emerald-600' : 'text-[#787774]'}`} />
                <div>
                  <span className="font-semibold text-[#37352f] block">总语音播报开关</span>
                  <span className="text-[10px] text-[#787774]">关闭后所有出餐声效与叫号静音</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateConfig({ enabled: !config.enabled })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  config.enabled ? 'bg-emerald-600' : 'bg-[#d3d1cb]'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    config.enabled ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Bluetooth Speaker & Dedicated Voice Routing Card */}
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bluetooth className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-[#37352f]">
                        {activeBtDevice ? activeBtDevice.name : '流动餐车蓝牙音箱'}
                      </span>
                      {activeBtDevice && activeBtDevice.status === 'connected' && (
                        <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold">
                          电量 {activeBtDevice.batteryLevel}%
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#787774] block">
                      {activeBtDevice?.status === 'connected' 
                        ? `${activeBtDevice.brandModel}` 
                        : '未绑定蓝牙外放广播播放器'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBluetoothModalOpen(true)}
                  className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-white hover:bg-blue-50 rounded-md border border-blue-200 cursor-pointer shadow-2xs"
                >
                  管理/绑定
                </button>
              </div>

              {/* Quick Routing Switcher */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    globalBluetoothAudio.setRoutingMode('voice_only');
                    showToast('已设为【仅系统语音专属通道】：非语音与手机声音保留源设备');
                  }}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    btConfig.routingMode === 'voice_only'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-white hover:bg-[#f7f7f5] text-[#37352f] border-[#d3d1cb]'
                  }`}
                >
                  <div className="text-[11px] font-bold flex items-center justify-between">
                    <span>只播系统语音</span>
                    {btConfig.routingMode === 'voice_only' && <Check className="w-3 h-3" />}
                  </div>
                  <div className={`text-[9px] mt-0.5 ${btConfig.routingMode === 'voice_only' ? 'text-blue-100' : 'text-[#787774]'}`}>
                    手机声音安全留本机
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    globalBluetoothAudio.setRoutingMode('unified');
                    showToast('已设为【统一混合播放模式】：所有音频混合路由');
                  }}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    btConfig.routingMode === 'unified'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-white hover:bg-[#f7f7f5] text-[#37352f] border-[#d3d1cb]'
                  }`}
                >
                  <div className="text-[11px] font-bold flex items-center justify-between">
                    <span>统一混合播放</span>
                    {btConfig.routingMode === 'unified' && <Check className="w-3 h-3" />}
                  </div>
                  <div className={`text-[9px] mt-0.5 ${btConfig.routingMode === 'unified' ? 'text-blue-100' : 'text-[#787774]'}`}>
                    所有声音一并外放
                  </div>
                </button>
              </div>
            </div>

            {/* Persona Selection (真人音色风格选择 - 核心去除人机声) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[#37352f] flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  真人音色母带（男女纯正原声 · 绝非机械音）
                </span>
                <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
                  当前生效: {currentPersona.avatarIcon} {currentPersona.name}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {VOICE_PERSONAS.map(p => {
                  const isSelected = config.persona === p.id;
                  const isMale = p.gender === 'male';
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPersona(p.id)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500 shadow-xs' 
                          : 'border-[#e3e2e0] bg-[#fafaf8] hover:bg-[#f1f1ef]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-2xl mt-0.5">{p.avatarIcon}</span>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[#37352f]">{p.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              isMale 
                                ? 'bg-sky-100 text-sky-800 border border-sky-200' 
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {p.genderLabel}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-white text-[#787774] rounded border border-[#e3e2e0]">
                              {p.badge}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-600 text-white rounded font-medium">
                                当前已生效
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#787774] line-clamp-1 mt-0.5">{p.description}</p>
                          <div className="text-[9px] text-[#908e89] flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            <span className="text-emerald-700 font-medium">独立真人录音母带 (WAV高保真)</span>
                            {voicePackStatus[p.id] !== undefined && (
                              <span className={`px-1 py-0.2 rounded font-semibold border ${
                                voicePackStatus[p.id]
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  : 'text-amber-800 bg-amber-50 border-amber-200'
                              }`}>
                                {voicePackStatus[p.id] ? '母带已装载' : '母带缺失·回退合成'}
                              </span>
                            )}
                          </div>
                          {/* 精准音源绑定：实际生效音源可见 + 角色专属绑定（修复切换不精准） */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] text-[#908e89] shrink-0 font-medium">实际音源</span>
                            <select
                              value={resolvePersonaVoiceName(p.id)}
                              onChange={(e) => handleBindPersonaVoice(p.id, e.target.value)}
                              className="max-w-[180px] px-1 py-0.5 rounded border border-[#e3e2e0] bg-white text-[9px] text-[#37352f] cursor-pointer truncate"
                              title="该角色实际使用的系统音源；可手动绑定专属音源，修复切换语音不精准"
                            >
                              <option value="">智能独占分配</option>
                              {systemVoices.map(v => (
                                <option key={v.name} value={v.name}>{v.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectPersona(p.id);
                          }}
                          className={`text-[11px] px-2.5 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer font-medium ${
                            isSelected 
                              ? 'bg-amber-600 text-white hover:bg-amber-700' 
                              : 'bg-white hover:bg-[#e3e2e0] text-[#37352f] border border-[#d3d1cb]'
                          }`}
                          title="点击试听真人原声并生效"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>{isSelected ? '已生效 · 试听母带' : '选用并试听'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Human Cadence & Natural Phrasing Toggle */}
            <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-200/80 space-y-1">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                  <div>
                    <span className="font-semibold text-emerald-950 block">真人呼吸韵律与单号口语化</span>
                    <span className="text-[10px] text-emerald-700 block">
                      自动拆分数字单号（如 9821 念为 9、8、2、1），注入微停顿，杜绝人机机械连读
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.humanCadenceEnabled}
                  onChange={(e) => updateConfig({ humanCadenceEnabled: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>
            </div>

            {/* Business Scenario Independent Toggles */}
            <div className="space-y-2 pt-1 border-t border-[#e3e2e0]">
              <span className="font-bold text-[#37352f] block">场景语音独立开关</span>
              
              <div className="grid grid-cols-1 gap-1.5 bg-[#fbfbfa] p-2 rounded-lg border border-[#e3e2e0]">
                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-white">
                  <span className="text-[#37352f] flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-emerald-600" />
                    <span>商家端：自营新订单到达提醒</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.autoPlayNewOrder}
                    onChange={(e) => updateConfig({ autoPlayNewOrder: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-white">
                  <span className="text-[#37352f] flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-rose-600" />
                    <span>商家端：加急催单与超时警报</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.autoPlayUrgent}
                    onChange={(e) => updateConfig({ autoPlayUrgent: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-white">
                  <span className="text-[#37352f] flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                    <span>前台端：取餐叫号广播 (窗口/吧台)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.autoPlayCalling}
                    onChange={(e) => updateConfig({ autoPlayCalling: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-white">
                  <span className="text-[#37352f] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>等位端：排队叫号入座与候餐进度提醒</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.autoPlayQueueWait}
                    onChange={(e) => updateConfig({ autoPlayQueueWait: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-white">
                  <span className="text-[#37352f] flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-purple-600" />
                    <span>骑手端：新顺路订单派发与履约状态</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={config.autoPlayRiderPool && config.autoPlayRiderAction}
                    onChange={(e) => updateConfig({ 
                      autoPlayRiderPool: e.target.checked,
                      autoPlayRiderAction: e.target.checked
                    })}
                    className="rounded text-purple-600 focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Volume & Rate Sliders */}
            <div className="space-y-3 pt-2 border-t border-[#e3e2e0]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#37352f] flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-[#787774]" />
                  声学参数调节
                </span>
                <span className="text-[10px] text-[#787774]">支持真人微调</span>
              </div>

              <div>
                <div className="flex justify-between text-[#787774] mb-1">
                  <span>播报音量</span>
                  <span className="font-mono font-bold text-[#37352f]">{Math.round(config.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.volume}
                  onChange={(e) => updateConfig({ volume: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-[#e3e2e0] rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-[#787774] mb-1">
                  <span>语速节奏</span>
                  <span className="font-bold text-[#37352f]">{config.rate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={config.rate}
                  onChange={(e) => updateConfig({ rate: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-[#e3e2e0] rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>
            </div>

            {/* Fast Scene Audition Matrix (全场景快速真人试听) */}
            <div className="pt-2 border-t border-[#e3e2e0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#37352f]">场景语音真人效果试听</span>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  当前音色：{currentPersona.avatarIcon} {currentPersona.name}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    await unlockAudioContext();
                    voiceAlerts.newSelfOperatedOrder('9821', 128.0, '先锋食客');
                    showToast('正在播报【自营新订单】真人语音...');
                  }}
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg border border-emerald-200 flex flex-col items-start gap-0.5 cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <Bell className="w-3 h-3 text-emerald-700" />
                    <span>自营新订单到达</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 line-clamp-1">
                    “您有新的自营专送订单，单号 9、8、2、1...”
                  </span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await unlockAudioContext();
                    voiceAlerts.callingGuest('P08', '餐车取餐窗口');
                    showToast('正在播报【前台取餐叫号】真人语音...');
                  }}
                  className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-200 flex flex-col items-start gap-0.5 cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <Megaphone className="w-3 h-3 text-amber-700" />
                    <span>前台取餐叫号</span>
                  </div>
                  <span className="text-[10px] text-amber-700 line-clamp-1">
                    “请——P 零八号顾客，到餐车取餐窗口...”
                  </span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await unlockAudioContext();
                    voiceAlerts.callingWaitTable('B02', 3, '露天餐吧堂食区');
                    showToast('正在播报【等位到号入座】真人语音...');
                  }}
                  className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg border border-blue-200 flex flex-col items-start gap-0.5 cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <Clock className="w-3 h-3 text-blue-700" />
                    <span>等位排队到号</span>
                  </div>
                  <span className="text-[10px] text-blue-700 line-clamp-1">
                    “请——B 零二号顾客，3人桌已准备就绪...”
                  </span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await unlockAudioContext();
                    voiceAlerts.riderNewDeliveryPool('9825', 16.5, 650);
                    showToast('正在播报【骑手新单派发】真人语音...');
                  }}
                  className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-lg border border-purple-200 flex flex-col items-start gap-0.5 cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <Bike className="w-3 h-3 text-purple-700" />
                    <span>骑手新单派发</span>
                  </div>
                  <span className="text-[10px] text-purple-700 line-clamp-1">
                    “骑士您好！收到新的自营顺路订单...”
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await unlockAudioContext();
                    voiceAlerts.waitingQueueReminder('A05', 2);
                    showToast('正在播报【等位候餐进度】...');
                  }}
                  className="px-2 py-1.5 bg-[#f7f7f5] hover:bg-[#e3e2e0] text-[#37352f] rounded border border-[#d3d1cb] flex items-center justify-center gap-1 cursor-pointer text-[11px]"
                >
                  <Clock className="w-3 h-3 text-[#787774]" />
                  <span>试听等位进度提醒</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await unlockAudioContext();
                    voiceAlerts.riderOrderDelivered('9821', 15.0);
                    showToast('正在播报【骑手妥投确认】...');
                  }}
                  className="px-2 py-1.5 bg-[#f7f7f5] hover:bg-[#e3e2e0] text-[#37352f] rounded border border-[#d3d1cb] flex items-center justify-center gap-1 cursor-pointer text-[11px]"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>试听骑手送达入账</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Bluetooth Speaker Management & Isolation Test Modal */}
      <BluetoothSpeakerModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
        showToast={showToast}
      />
    </div>
  );
};
