/* ============================================================================
 * WorkspaceDisplaySettingsPanel —— 工作台显示设置（⚙ 锚定下拉弹窗小组件）
 * ----------------------------------------------------------------------------
 * 严格遵循 AGENTS.md 极简工控 UI 规范：
 * - 纯白基底与三位一体同色高亮 (翡翠绿/主题色)，杜绝粗黑大色块
 * - 永久废除 font-mono，统一无衬线工控标准字体
 * - 倒角规范：组件为 rounded-lg，承载容器为 rounded-xl
 * - 所有按钮与徽记强制 whitespace-nowrap 防折行
 * - 本地三轨沙箱秒级落盘 + 腾讯云持久化自愈，硬刷新 100% 不丢！
 * ==========================================================================*/

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  X,
  Monitor,
  Columns3,
  Target,
  CloudCheck,
  CloudOff,
  RotateCcw,
  Loader2,
  MousePointer,
  Type,
  Maximize2,
  Sliders,
  Frame,
  Check,
  ShieldCheck,
  Cloud
} from 'lucide-react';
import {
  WorkspacePrefs,
  OrdersColumnsPref,
  ButtonDisplayMode,
  DEFAULT_WORKSPACE_PREFS,
  WIDTH_RESISTANCE_ANCHORS,
  applyResistanceSnap,
  MARGIN_RESISTANCE_ANCHORS,
  applyMarginResistanceSnap,
  loadLocalPrefs,
  saveLocalPrefs,
  fetchPrefsFromCloud,
  savePrefsToCloud
} from '../../utils/workspacePreferences';
import { CustomerPreviewControl } from '../preview/CustomerPreviewControl';

interface WorkspaceDisplaySettingsPanelProps {
  open: boolean;
  onClose: () => void;
  prefs: WorkspacePrefs;
  onChange: (patch: Partial<WorkspacePrefs>) => void;
  syncState: 'idle' | 'saving' | 'synced' | 'local_only';
  showToast?: (msg: string) => void;
}

const COLUMN_OPTIONS: { value: OrdersColumnsPref; label: string; desc: string }[] = [
  { value: 'auto', label: '自动', desc: '视口自适应' },
  { value: 2, label: '2 列', desc: '双栏大卡' },
  { value: 3, label: '3 列', desc: '标准三栏' },
  { value: 4, label: '4 列', desc: '紧凑四栏' }
];

export function WorkspaceDisplaySettingsPanel({
  open,
  onClose,
  prefs,
  onChange,
  syncState,
  showToast
}: WorkspaceDisplaySettingsPanelProps) {
  const [pullState, setPullState] = useState<'idle' | 'pulling' | 'pulled' | 'none'>('idle');
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 动态视口屏幕宽度（支持窗口 resize 实时重新计算）
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1920
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 当前屏幕占比与实时最大宽度像素值
  const currentRatio = useMemo(() => {
    if (prefs.contentWidthPercent) return prefs.contentWidthPercent;
    if (prefs.contentWidth === 'wide') return 100;
    if (prefs.contentWidth === 'compact') return 65;
    return 88;
  }, [prefs.contentWidth, prefs.contentWidthPercent]);

  const calculatedPixelWidth = useMemo(() => {
    if (currentRatio >= 100) return '视口 100% 全宽铺满';
    const px = Math.round((viewportWidth * currentRatio) / 100);
    return `约 ${px}px (视口 ${viewportWidth}px × ${currentRatio}%)`;
  }, [viewportWidth, currentRatio]);

  // 打开时触发一次云端拉取（双向同步：具备 LWW 时间戳防倒退自愈保护）
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPullState('pulling');
    fetchPrefsFromCloud().then((cloud) => {
      if (cancelled) return;
      const local = loadLocalPrefs();
      if (cloud && (!local?.updatedAt || !cloud.updatedAt || cloud.updatedAt >= local.updatedAt)) {
        saveLocalPrefs(cloud);
        onChange(cloud);
        setPullState('pulled');
      } else {
        setPullState(local ? 'pulled' : 'none');
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 点外部 / Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // 滑块阻力吸附调整处理（即时同步调用 onChange 落盘）
  const handleRatioSliderChange = (rawVal: number) => {
    const snapped = applyResistanceSnap(rawVal, 2);
    const mode = snapped >= 98 ? 'wide' : snapped <= 68 ? 'compact' : 'standard';
    onChange({
      contentWidthPercent: snapped,
      contentWidth: mode
    });
  };

  const handleSnapAnchorClick = (percent: number) => {
    const mode = percent >= 98 ? 'wide' : percent <= 68 ? 'compact' : 'standard';
    onChange({
      contentWidthPercent: percent,
      contentWidth: mode
    });
    showToast?.(`已吸附至「${percent}% 屏幕占比」宽度 (已即时双轨落盘)`);
  };

  // 窗口安全边距阻力吸附调整处理
  const handleMarginSliderChange = (rawVal: number) => {
    const snapped = applyMarginResistanceSnap(rawVal, 1);
    onChange({ windowSafeMargin: snapped });
  };

  const handleMarginAnchorClick = (px: number) => {
    onChange({ windowSafeMargin: px });
    showToast?.(px === 0 ? '已完全消除窗口安全边距 (0px 极致贴边铺满)' : `已吸附至「${px}px 窗口安全边距」`);
  };

  // 手动触发云端保存
  const handleManualPushCloud = async () => {
    const cur = loadLocalPrefs() ?? prefs;
    const ok = await savePrefsToCloud(cur);
    if (ok) {
      showToast?.('工作台显示偏好已成功持久化至腾讯云开发');
    } else {
      showToast?.('已保存在本地安全沙箱 (云端服务离线)');
    }
  };

  return (
    <div
      ref={rootRef}
      className="absolute right-0 top-[calc(100%+8px)] w-[368px] max-h-[calc(100dvh-96px)] overflow-y-auto bg-white border border-neutral-200/90 shadow-2xl rounded-xl z-[70] custom-scrollbar text-neutral-900 select-none"
      role="dialog"
      aria-label="工作台显示设置"
    >
      {/* 顶部白色精致标题栏 */}
      <div className="sticky top-0 z-10 px-4 py-3 bg-white/95 backdrop-blur-md border-b border-neutral-100 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Sliders className="w-3 h-3" />
            </div>
            <span>工作台显示设置</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              双轨落盘
            </span>
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5 tracking-normal">
            本地三轨沙箱固化 · 腾讯云双向自愈同步
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg border border-transparent hover:border-neutral-200 bg-transparent hover:bg-neutral-50 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-all cursor-pointer"
          title="关闭设置"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 状态徽标条 */}
      <div className="px-4 py-2 bg-neutral-50/80 border-b border-neutral-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-neutral-600 text-[11px]">
            {syncState === 'synced'
              ? '腾讯云已双向权威持久化'
              : syncState === 'saving'
              ? '正在推送到腾讯云...'
              : '本地沙箱坚实固化 (硬刷新不丢)'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleManualPushCloud}
          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
        >
          <Cloud className="w-3 h-3 text-neutral-500" />
          <span>推送到云端</span>
        </button>
      </div>

      <div className="p-3.5 space-y-3.5">
        {/* 1. 快捷与悬浮按钮显示模式 */}
        <section className="bg-white border border-neutral-200/90 rounded-xl p-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-900">快捷操作与按钮显示模式</span>
            <span className="text-[10px] text-neutral-500">
              {prefs.buttonDisplayMode === 'always' ? '常驻图文' : '仅图标·悬停显字'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChange({ buttonDisplayMode: 'icon_only' })}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer bg-white ${
                prefs.buttonDisplayMode === 'icon_only'
                  ? 'border-emerald-600 text-emerald-700 ring-1.5 ring-emerald-600/15 font-bold shadow-2xs'
                  : 'border-neutral-200/90 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <MousePointer className="w-3.5 h-3.5" />
                  <span>仅显示图标</span>
                </div>
                {prefs.buttonDisplayMode === 'icon_only' && (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                )}
              </div>
              <div className="text-[10px] text-neutral-500 mt-1 leading-snug">
                极简紧凑，鼠标悬停时平滑滑出文字
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChange({ buttonDisplayMode: 'always' })}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer bg-white ${
                prefs.buttonDisplayMode === 'always'
                  ? 'border-emerald-600 text-emerald-700 ring-1.5 ring-emerald-600/15 font-bold shadow-2xs'
                  : 'border-neutral-200/90 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" />
                  <span>打开常驻</span>
                </div>
                {prefs.buttonDisplayMode === 'always' && (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                )}
              </div>
              <div className="text-[10px] text-neutral-500 mt-1 leading-snug">
                图标与按钮完整文字全量直观常驻
              </div>
            </button>
          </div>
        </section>

        {/* 2. 表单内容区最大宽度 —— 遵循 AGENTS.md 纯白与三位一体同色高亮 */}
        <section className="bg-white border border-neutral-200/90 rounded-xl p-3 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-neutral-700" />
              <span className="text-xs font-bold text-neutral-900">表单内容区最大宽度</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-xs text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                {currentRatio}%
              </span>
              <span className="text-[11px] text-neutral-500">屏幕占比</span>
            </div>
          </div>

          {/* 实时自适应换算显示 */}
          <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px]">
            <span className="text-neutral-500 flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-neutral-600" />
              <span>视口动态计算:</span>
            </span>
            <span className="font-bold text-neutral-900">
              {calculatedPixelWidth}
            </span>
          </div>

          {/* 进度阻力滑块控件 */}
          <div className="space-y-1.5 pt-1">
            <div className="relative flex items-center">
              <input
                type="range"
                min={50}
                max={100}
                step={1}
                value={currentRatio}
                onChange={(e) => handleRatioSliderChange(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-hidden"
              />
            </div>

            {/* 阻力刻度刻印 */}
            <div className="flex justify-between text-[10px] text-neutral-500 px-0.5">
              <span>50%</span>
              <span className="text-neutral-800 font-bold">60% 紧凑</span>
              <span className="text-neutral-800 font-bold">75% 舒适</span>
              <span className="text-neutral-800 font-bold">88% 沉浸</span>
              <span className="text-neutral-800 font-bold">100% 全宽</span>
            </div>
          </div>

          {/* 4 档磁吸阻力快速吸附卡片 (严格纯白基底 + 三位一体同色高亮) */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {WIDTH_RESISTANCE_ANCHORS.map((anchor) => {
              const isActive = Math.abs(currentRatio - anchor.percent) <= 1;
              return (
                <button
                  key={anchor.percent}
                  type="button"
                  onClick={() => handleSnapAnchorClick(anchor.percent)}
                  className={`py-2 px-1 border text-center transition-all cursor-pointer rounded-lg bg-white whitespace-nowrap ${
                    isActive
                      ? 'border-emerald-600 text-emerald-700 ring-1.5 ring-emerald-600/15 shadow-2xs font-bold'
                      : 'border-neutral-200/90 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
                  }`}
                >
                  <div className="text-[11px] font-bold">{anchor.percent}%</div>
                  <div className={`text-[9.5px] mt-0.5 ${isActive ? 'text-emerald-700 font-bold' : 'text-neutral-500'}`}>
                    {anchor.label}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-[10px] text-neutral-500 leading-snug">
            💡 支持任意自定义阻力滑动；滑块接近吸附档位将带有磁吸阻力，随当前设备视口分辨率动态缩放。
          </div>
        </section>

        {/* 3. 窗口安全边距 —— 支持 0px 贴边铺满 */}
        <section className="bg-white border border-neutral-200/90 rounded-xl p-3 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Frame className="w-3.5 h-3.5 text-neutral-700" />
              <span className="text-xs font-bold text-neutral-900">窗口安全边距</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-xs text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                {prefs.windowSafeMargin ?? 0}px
              </span>
              <span className="text-[11px] text-neutral-500">
                {(prefs.windowSafeMargin ?? 0) === 0 ? '无边距·已消除' : '外层缓冲'}
              </span>
            </div>
          </div>

          {/* 实时形态提示 */}
          <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px]">
            <span className="text-neutral-500">边距视觉形态:</span>
            <span className="font-bold text-neutral-900">
              {(prefs.windowSafeMargin ?? 0) === 0
                ? '已彻底消除窗口安全边距 (0px 满屏无缝)'
                : `窗口四周预留 ${(prefs.windowSafeMargin ?? 0)}px 缓冲安全边距`}
            </span>
          </div>

          {/* 进度阻力滑块控件 */}
          <div className="space-y-1.5 pt-1">
            <div className="relative flex items-center">
              <input
                type="range"
                min={0}
                max={32}
                step={1}
                value={prefs.windowSafeMargin ?? 0}
                onChange={(e) => handleMarginSliderChange(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-hidden"
              />
            </div>

            {/* 阻力刻度刻印 */}
            <div className="flex justify-between text-[10px] text-neutral-500 px-0.5">
              <span className="text-neutral-800 font-bold">0px (已消除)</span>
              <span className="text-neutral-800 font-bold">8px 微距</span>
              <span className="text-neutral-800 font-bold">16px 标准</span>
              <span className="text-neutral-800 font-bold">24px 宽松</span>
              <span>32px</span>
            </div>
          </div>

          {/* 4 档边距吸附卡片 */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {MARGIN_RESISTANCE_ANCHORS.map((anchor) => {
              const isActive = (prefs.windowSafeMargin ?? 0) === anchor.px;
              return (
                <button
                  key={anchor.px}
                  type="button"
                  onClick={() => handleMarginAnchorClick(anchor.px)}
                  className={`py-2 px-1 border text-center transition-all cursor-pointer rounded-lg bg-white whitespace-nowrap ${
                    isActive
                      ? 'border-emerald-600 text-emerald-700 ring-1.5 ring-emerald-600/15 shadow-2xs font-bold'
                      : 'border-neutral-200/90 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
                  }`}
                >
                  <div className="text-[11px] font-bold">{anchor.px}px</div>
                  <div className={`text-[9.5px] mt-0.5 ${isActive ? 'text-emerald-700 font-bold' : 'text-neutral-500'}`}>
                    {anchor.label}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. 订单中心 · 网格列数 */}
        <section className="bg-white border border-neutral-200/90 rounded-xl p-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Columns3 className="w-3.5 h-3.5 text-neutral-700" />
              <span className="text-xs font-bold text-neutral-900">订单中心 · 网格列数</span>
            </div>
            <span className="text-[11px] text-neutral-500">
              {prefs.ordersColumns === 'auto' ? '自动响应' : `固定 ${prefs.ordersColumns} 列`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {COLUMN_OPTIONS.map((opt) => {
              const active = prefs.ordersColumns === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => onChange({ ordersColumns: opt.value })}
                  className={`py-2 px-1 border text-center transition-all cursor-pointer rounded-lg bg-white whitespace-nowrap ${
                    active
                      ? 'border-emerald-600 text-emerald-700 ring-1.5 ring-emerald-600/15 shadow-2xs font-bold'
                      : 'border-neutral-200/90 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
                  }`}
                >
                  <div className="text-[11px] font-bold">{opt.label}</div>
                  <div className={`text-[9.5px] mt-0.5 ${active ? 'text-emerald-700 font-bold' : 'text-neutral-500'}`}>
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 5. 毛利红线比例 */}
        <section className="bg-white border border-neutral-200/90 rounded-xl p-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-xs font-bold text-neutral-900">毛利红线预警比例</span>
            </div>
            <span className="font-bold text-xs text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
              {prefs.marginFloorPercent}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={95}
            step={5}
            value={prefs.marginFloorPercent}
            onChange={(e) => onChange({ marginFloorPercent: parseInt(e.target.value, 10) || 50 })}
            className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-rose-600 focus:outline-hidden"
          />
          <div className="flex justify-between text-[10px] text-neutral-500">
            <span>10% (宽松)</span>
            <span>50% (标准基准)</span>
            <span>95% (极严苛)</span>
          </div>
        </section>

        {/* 6. 客食端预览管控 */}
        <CustomerPreviewControl />

        {/* 恢复默认设置按钮 */}
        <button
          type="button"
          onClick={() => {
            onChange({ ...DEFAULT_WORKSPACE_PREFS, updatedAt: new Date().toISOString() });
            showToast?.('已恢复默认工作台显示设置 (88% 沉浸宽屏)');
          }}
          className="w-full h-8 bg-white hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300 text-neutral-700 text-xs font-medium transition-all cursor-pointer rounded-lg flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
          <span>恢复默认显示设置 (88% 沉浸宽屏)</span>
        </button>
      </div>

      {/* 底部说明 */}
      <div className="px-4 py-2.5 bg-neutral-50/90 border-t border-neutral-100 text-[10.5px] text-neutral-500 leading-snug">
        设置即时本地三轨落盘，支持账号/设备级云端双向同步。硬刷新数据100%保留。
      </div>
    </div>
  );
}
