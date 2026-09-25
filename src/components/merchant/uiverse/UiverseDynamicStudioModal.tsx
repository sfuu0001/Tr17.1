import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Flame,
  Radio,
  Sliders,
  Layers,
  Palette,
  Eye,
  Code2,
  Filter,
  CheckCircle2
} from 'lucide-react';
import {
  UIVERSE_ELEMENTS,
  UIVERSE_SKINS,
  UIverseElement,
  UiverseSkinMode
} from './uiverseRegistry';
import {
  UiverseLaserButton,
  UiverseTactile3DButton,
  UiverseCosmicCard,
  UiverseHoloCard,
  UiverseSonarBeacon,
  UiverseFlameTag,
  UiverseArcadeToggle,
  UiverseAudioEqualizer,
  UiverseRadarSonar
} from './UiverseDynamicComponents';

interface UiverseDynamicStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSkin: UiverseSkinMode;
  onSelectSkin: (skin: UiverseSkinMode) => void;
  onShowToast: (msg: string) => void;
}

export const UiverseDynamicStudioModal: React.FC<UiverseDynamicStudioModalProps> = ({
  isOpen,
  onClose,
  currentSkin,
  onSelectSkin,
  onShowToast
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeModuleFilter, setActiveModuleFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedElementForCode, setSelectedElementForCode] = useState<UIverseElement | null>(null);
  const [codeType, setCodeType] = useState<'tailwind' | 'css' | 'html'>('tailwind');

  // Interactive state for sandbox demos
  const [demoToggleVal, setDemoToggleVal] = useState<boolean>(true);
  const [demoClickCount, setDemoClickCount] = useState<number>(0);

  if (!isOpen) return null;

  const filteredElements = UIVERSE_ELEMENTS.filter((el) => {
    const matchCat = activeCategory === 'all' || el.category === activeCategory;
    const matchMod =
      activeModuleFilter === 'all' ||
      el.matchedModule === activeModuleFilter ||
      el.matchedModule === 'global';
    return matchCat && matchMod;
  });

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast('✨ UIverse 代码已成功复制到剪贴板！');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121214] text-neutral-100 border border-neutral-800 w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-amber-500 to-emerald-400 p-[2px] shadow-lg">
              <div className="w-full h-full bg-[#18181b] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  <span>UIverse.io 动态组件对接与自动匹配中枢</span>
                </h2>
                <a
                  href="https://uiverse.io"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-900 transition-colors"
                >
                  <span>uiverse.io 社区官方源</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                实时对接开源 UIverse 社区前沿交互元素 · 为订单中心、KDS看板、台位矩阵及排队叫号智能匹配动态组件
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="关闭窗口"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Skin Switcher Deck */}
        <div className="p-4 bg-neutral-950/90 border-b border-neutral-800/80 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>全局动态皮肤视觉系统 (Global Theme Engine)</span>
            </span>
            <span className="text-[11px] text-neutral-400 hidden sm:inline">
              一键为全平台四大主模块装配 UIverse 动态视觉风格
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {UIVERSE_SKINS.map((skin) => {
              const isActive = currentSkin === skin.id;
              return (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() => {
                    onSelectSkin(skin.id);
                    onShowToast(`已切换至: ${skin.name}`);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isActive
                      ? 'bg-neutral-900 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/50'
                      : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-white flex items-center gap-1">
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{skin.name}</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {skin.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      {skin.description}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500 font-mono">
                      {isActive ? '● 当前正在运行' : '点击装配此皮肤'}
                    </span>
                    <span
                      style={{ backgroundColor: skin.accentColor }}
                      className="w-2.5 h-2.5 rounded-full"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters Bar: Category & Business Modules */}
        <div className="px-4 py-3 bg-[#18181b] border-b border-neutral-800 flex items-center justify-between gap-3 flex-wrap shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
            {[
              { id: 'all', label: '全部组件 (All)' },
              { id: 'buttons', label: '🔘 按钮 (Buttons)' },
              { id: 'cards', label: '🎴 卡片 (Cards)' },
              { id: 'badges', label: '🏷️ 徽标与状态 (Badges)' },
              { id: 'switches', label: '⚡ 开关 (Switches)' },
              { id: 'loaders', label: '📡 声纳与跳线 (Loaders)' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                    : 'bg-neutral-800/70 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-700/50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Business Modules Matcher Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-neutral-400 font-mono text-[11px] shrink-0">匹配业务:</span>
            {[
              { id: 'all', label: '全渠道' },
              { id: 'orders', label: '📦 订单中心' },
              { id: 'kds', label: '👨‍🍳 KDS后厨' },
              { id: 'tables', label: '🍽️ 堂食桌台' },
              { id: 'calling', label: '📢 排队叫号' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveModuleFilter(m.id)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono transition-colors cursor-pointer border ${
                  activeModuleFilter === m.id
                    ? 'bg-neutral-100 text-neutral-900 font-bold border-white'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Grid: Elements List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredElements.map((el) => {
              return (
                <div
                  key={el.id}
                  className="bg-neutral-900/60 border border-neutral-800/90 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all shadow-sm group hover:shadow-md"
                >
                  <div className="space-y-3">
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 transition-colors">
                          {el.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[11px] text-neutral-400">
                            by {el.author}
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono">
                            ★ {el.popularity.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <a
                        href={el.uiverseUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="在 uiverse.io 查看原始源码"
                        className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* Matched Scenario Tag */}
                    <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800/80 flex items-center gap-1.5 text-xs">
                      <span className="text-amber-400 font-bold text-[10px] shrink-0 font-mono bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/40">
                        自动匹配
                      </span>
                      <span className="text-neutral-300 truncate font-medium text-[11px]">
                        {el.matchedScenario}
                      </span>
                    </div>

                    {/* Live Interactive Sandbox Preview */}
                    <div className="p-4 rounded-xl bg-neutral-950/90 border border-neutral-800 flex items-center justify-center min-h-[96px] relative overflow-hidden">
                      {/* Render specific component demo */}
                      {el.id === 'uiv-btn-laser-glow' && (
                        <UiverseLaserButton
                          label="⚡ 加急呼叫叫号"
                          variant="amber"
                          onClick={() => {
                            setDemoClickCount((c) => c + 1);
                            onShowToast('⚡ 触发 UIverse 赛博激光呼叫！');
                          }}
                        />
                      )}

                      {el.id === 'uiv-btn-tactile-3d' && (
                        <UiverseTactile3DButton
                          label="完成本道出餐 (3D)"
                          tone="emerald"
                          onClick={() => {
                            setDemoClickCount((c) => c + 1);
                            onShowToast('🔨 触觉反馈: 出餐划菜完成！');
                          }}
                        />
                      )}

                      {el.id === 'uiv-btn-liquid-pill' && (
                        <button
                          type="button"
                          onClick={() => onShowToast('💧 触发水滴流动核销')}
                          className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-[length:200%_auto] hover:bg-[position:right_center] text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          扫码核销 #{demoClickCount + 800}
                        </button>
                      )}

                      {el.id === 'uiv-btn-cosmic-shimmer' && (
                        <button
                          type="button"
                          onClick={() => onShowToast('🌌 星云微光启动')}
                          className="relative overflow-hidden px-4 py-2 bg-neutral-900 text-neutral-100 rounded-lg border border-neutral-700 hover:border-amber-400 text-xs font-mono font-bold shadow-sm before:absolute before:inset-0 before:-translate-x-full hover:before:translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 cursor-pointer"
                        >
                          全息诊断巡检
                        </button>
                      )}

                      {el.id === 'uiv-card-cosmic-border' && (
                        <UiverseCosmicCard urgency="flame" className="w-full">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-rose-400">#UR-8802 极速专送</span>
                            <span className="text-[10px] text-amber-300 font-mono">已等候 16m</span>
                          </div>
                          <p className="text-[11px] text-neutral-300 mt-1 font-medium">
                            黑松露和牛堡 x2 · 正在后厨铁板翻煎
                          </p>
                        </UiverseCosmicCard>
                      )}

                      {el.id === 'uiv-card-holo-tilt' && (
                        <UiverseHoloCard className="w-full">
                          <div className="flex items-center justify-between text-xs text-neutral-900">
                            <strong className="font-mono font-bold">A02桌 · 4人台</strong>
                            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.2 rounded-full font-mono">
                              就餐中 32m
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-600 mt-1 flex items-center justify-between">
                            <span>消费合计: ¥188.00</span>
                            <span className="text-emerald-700 font-bold">已出齐</span>
                          </div>
                        </UiverseHoloCard>
                      )}

                      {el.id === 'uiv-card-carbon-tech' && (
                        <div className="w-full bg-neutral-900 border-l-4 border-emerald-500 rounded-r-lg p-3 font-mono text-xs text-neutral-200">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-bold">SPEC #DEL-901</span>
                            <span className="text-[10px] text-neutral-400">GPS: 121.49, 31.23</span>
                          </div>
                          <div className="text-[11px] text-neutral-300 mt-1">
                            骑手已接单 · 距餐车 450m
                          </div>
                        </div>
                      )}

                      {el.id === 'uiv-tag-sonar-beacon' && (
                        <div className="flex items-center gap-2">
                          <UiverseSonarBeacon label="配送中 1.2km" tone="emerald" />
                          <UiverseSonarBeacon label="正在寻径" tone="blue" />
                        </div>
                      )}

                      {el.id === 'uiv-tag-flame-sizzle' && (
                        <div className="flex items-center gap-2">
                          <UiverseFlameTag label="超时催单" count={2} />
                          <UiverseFlameTag label="优先出餐" />
                        </div>
                      )}

                      {el.id === 'uiv-tag-cyber-pill' && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-neutral-900 text-amber-400 border border-amber-500/50 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>🛍️ 自提 #A88</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-neutral-900 text-emerald-400 border border-emerald-500/50 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>🍽️ 堂食 B01</span>
                          </span>
                        </div>
                      )}

                      {el.id === 'uiv-sw-arcade-rocker' && (
                        <UiverseArcadeToggle
                          checked={demoToggleVal}
                          onChange={setDemoToggleVal}
                          label={demoToggleVal ? '语音自动广播: 开启' : '语音自动广播: 静音'}
                        />
                      )}

                      {el.id === 'uiv-sw-liquid-wave' && (
                        <div className="p-1 bg-neutral-900 rounded-full flex gap-1 border border-neutral-700">
                          <button
                            type="button"
                            onClick={() => setDemoToggleVal(false)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              !demoToggleVal ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400'
                            }`}
                          >
                            按单看板
                          </button>
                          <button
                            type="button"
                            onClick={() => setDemoToggleVal(true)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              demoToggleVal ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400'
                            }`}
                          >
                            菜品汇总
                          </button>
                        </div>
                      )}

                      {el.id === 'uiv-load-audio-eq' && (
                        <div className="flex items-center gap-3 bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800">
                          <span className="text-xs font-mono text-emerald-400">正在外放广播:</span>
                          <UiverseAudioEqualizer active={true} />
                        </div>
                      )}

                      {el.id === 'uiv-load-radar-sonar' && (
                        <div className="flex items-center gap-3">
                          <UiverseRadarSonar size={56} />
                          <div className="text-left font-mono text-[11px] text-emerald-400">
                            <div>SCANNING 3KM...</div>
                            <div className="text-neutral-400 text-[10px]">周边在线骑手: 6人</div>
                          </div>
                        </div>
                      )}

                      {el.id === 'uiv-load-quantum-orbit' && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 border-2 border-transparent border-t-amber-500 border-r-amber-400 rounded-full animate-spin" />
                          <span className="text-xs font-mono text-neutral-300">
                            分站打印机通讯就绪...
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {el.description}
                    </p>
                  </div>

                  {/* Actions: View Code & Apply */}
                  <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedElementForCode(el)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>查看源码</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectSkin('cyber_neon');
                        onShowToast(`已为当前界面装配 ${el.title} 对应风格！`);
                      }}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                    >
                      <Zap className="w-3 h-3" />
                      <span>一键应用装配</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source Code Inspector Modal */}
        {selectedElementForCode && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#18181b] border border-neutral-700 w-full max-w-2xl rounded-2xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-base text-white">
                    {selectedElementForCode.title}
                  </h4>
                  <p className="text-xs text-neutral-400 font-mono">
                    UIverse Author: {selectedElementForCode.author} · 匹配: {selectedElementForCode.matchedScenario}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedElementForCode(null)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Code Format Switcher */}
              <div className="flex items-center gap-1.5 border-b border-neutral-800 pb-2">
                {[
                  { id: 'tailwind', label: 'Tailwind CSS' },
                  { id: 'css', label: 'Raw CSS' },
                  { id: 'html', label: 'HTML Structure' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCodeType(t.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                      codeType === t.id
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Code Box */}
              <div className="relative">
                <pre className="p-4 bg-neutral-950 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto max-h-[300px] border border-neutral-800">
                  {codeType === 'tailwind' && selectedElementForCode.codeSnippet.tailwind}
                  {codeType === 'css' && selectedElementForCode.codeSnippet.css}
                  {codeType === 'html' && selectedElementForCode.codeSnippet.html}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    const text =
                      codeType === 'tailwind'
                        ? selectedElementForCode.codeSnippet.tailwind
                        : codeType === 'css'
                        ? selectedElementForCode.codeSnippet.css
                        : selectedElementForCode.codeSnippet.html;
                    handleCopyCode(text, selectedElementForCode.id);
                  }}
                  className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs flex items-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
                >
                  {copiedId === selectedElementForCode.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制代码</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs">
                <a
                  href={selectedElementForCode.uiverseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <span>在 uiverse.io 原贴查看互动与更多参数</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedElementForCode(null)}
                  className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium"
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
