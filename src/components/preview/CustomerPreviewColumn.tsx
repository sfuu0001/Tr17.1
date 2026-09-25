/* ============================================================================
 * CustomerPreviewColumn —— 三端右侧「客食端预览」壳容器列（v3 根层分栏右栏）
 * ----------------------------------------------------------------------------
 * - 位于 App 根层 flex-row 最右侧（文档流内列，非悬浮层）
 * - 内容：iframe ?embed=customer（独立会话，强制 customer、不写 storage）
 * - 列头：机型下拉（6 档 + 自定义）· 旋转 · 刷新 · 收起
 * - 前置条件链由 App 保证传入；本组件内部处理 <1536px 强制收起 + 提示
 * - 挂载期间向 <html> 写 data-preview-open="1"（审计把手 right 偏移联动）
 * ============================================================================*/
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { RotateCw, RefreshCw, X, Smartphone } from 'lucide-react';
import { useToast } from '../ui/ToastContext';
import {
  getWorkspacePrefsSnapshot,
  subscribeWorkspacePrefs,
  mergeLocalPrefs
} from '../../utils/workspacePreferences';
import {
  DEVICE_PRESETS,
  CUSTOM_DEVICE_ID,
  resolvePreviewDimensions,
  PREVIEW_MIN_VIEWPORT
} from '../../constants/deviceViewport';

interface CustomerPreviewColumnProps {
  role: 'merchant' | 'rider' | 'platform';
  onClose: () => void;
}

export const CustomerPreviewColumn: React.FC<CustomerPreviewColumnProps> = ({ role, onClose }) => {
  const prefs = useSyncExternalStore(subscribeWorkspacePrefs, getWorkspacePrefsSnapshot);
  const toast = useToast();
  const [iframeKey, setIframeKey] = useState(0);
  const [narrow, setNarrow] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < PREVIEW_MIN_VIEWPORT : false
  );
  const [avail, setAvail] = useState<{ w: number; h: number }>({ w: 440, h: 800 });
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const narrowToastFired = useRef(false);

  const dims = useMemo(
    () => resolvePreviewDimensions(prefs.previewDevice, prefs.previewCustom, prefs.previewRotated),
    [prefs.previewDevice, prefs.previewCustom, prefs.previewRotated]
  );

  // 视口宽监听：<1536 强制收起（渲染 null）并一次性提示
  useEffect(() => {
    const onResize = () => {
      const isNarrow = window.innerWidth < PREVIEW_MIN_VIEWPORT;
      setNarrow(isNarrow);
      if (isNarrow && !narrowToastFired.current) {
        narrowToastFired.current = true;
        toast.info('屏幕宽度不足 1536px，客食端预览已临时收起；加宽窗口后自动恢复');
      }
      if (!isNarrow) narrowToastFired.current = false;
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 审计把手偏移联动（fixed 把手 right → 470px）
  useEffect(() => {
    if (narrow) {
      delete document.documentElement.dataset.previewOpen;
    } else {
      document.documentElement.dataset.previewOpen = '1';
    }
    return () => {
      delete document.documentElement.dataset.previewOpen;
    };
  }, [narrow]);

  // 壳主体可用空间测量 → 缩放系数
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const update = () => setAvail({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [narrow]);

  if (narrow) return null;

  const scale = Math.min(1, avail.w > 0 ? avail.w / dims.width : 1, avail.h > 0 ? avail.h / dims.height : 1);
  const embedSrc = `${window.location.origin}/?embed=customer`;

  return (
    <div className="w-[470px] shrink-0 h-full bg-[#ffffff] border-l border-[#e2e3e1] flex flex-col">
      {/* 列头 */}
      <div className="shrink-0 h-10 px-2.5 flex items-center gap-2 border-b border-[#e2e3e1] bg-[#f7f7f5]">
        <Smartphone className="w-3.5 h-3.5 text-[#185FA5] shrink-0" />
        <span className="text-[11px] font-bold text-[#1a1c1b] shrink-0">客食端实时预览</span>
        <select
          value={prefs.previewDevice}
          onChange={(e) => mergeLocalPrefs({ previewDevice: e.target.value })}
          className="ml-auto text-[11px] font-bold text-[#1a1c1b] bg-[#ffffff] border border-[#d3d1cb] px-1.5 py-1 outline-none focus:border-[#000000] cursor-pointer max-w-[150px]"
          title="切换预览机型"
        >
          {DEVICE_PRESETS.map((d) => (
            <option key={d.id} value={d.id}>{d.label} · {d.width}×{d.height}</option>
          ))}
          <option value={CUSTOM_DEVICE_ID}>自定义…</option>
        </select>
        <button
          type="button"
          onClick={() => mergeLocalPrefs({ previewRotated: !prefs.previewRotated })}
          className={`w-7 h-7 flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
            prefs.previewRotated
              ? 'bg-[#000000] text-white border-[#000000]'
              : 'text-[#787770] hover:text-[#1a1c1b] hover:bg-[#efefed] border-[#d3d1cb]'
          }`}
          title={prefs.previewRotated ? '切换为竖屏' : '切换为横屏'}
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setIframeKey((k) => k + 1)}
          className="w-7 h-7 flex items-center justify-center text-[#787770] hover:text-[#1a1c1b] hover:bg-[#efefed] border border-[#d3d1cb] transition-colors cursor-pointer shrink-0"
          title="刷新预览（重新加载独立会话）"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center text-[#787770] hover:text-[#1a1c1b] hover:bg-[#efefed] border border-[#d3d1cb] transition-colors cursor-pointer shrink-0"
          title="收起预览列"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 自定义分辨率输入（仅 custom 档） */}
      {prefs.previewDevice === CUSTOM_DEVICE_ID && (
        <div className="shrink-0 px-2.5 py-1.5 bg-[#f7f7f5] border-b border-[#e2e3e1] flex items-center gap-2">
          <span className="text-[10px] text-[#787770] font-bold shrink-0">自定义分辨率（280–1024）:</span>
          <input
            type="number"
            min={280}
            max={1024}
            value={prefs.previewCustom.width}
            onChange={(e) => mergeLocalPrefs({ previewCustom: { ...prefs.previewCustom, width: parseInt(e.target.value) || 430 } })}
            className="w-16 px-1.5 py-0.5 text-[11px] font-mono text-center bg-white border border-[#d3d1cb] outline-none focus:border-[#000000]"
          />
          <span className="text-[10px] text-[#787770]">×</span>
          <input
            type="number"
            min={280}
            max={1024}
            value={prefs.previewCustom.height}
            onChange={(e) => mergeLocalPrefs({ previewCustom: { ...prefs.previewCustom, height: parseInt(e.target.value) || 932 } })}
            className="w-16 px-1.5 py-0.5 text-[11px] font-mono text-center bg-white border border-[#d3d1cb] outline-none focus:border-[#000000]"
          />
        </div>
      )}

      {/* 壳主体：iframe（独立会话）· 等比缩放适配可用空间 */}
      <div ref={bodyRef} className="flex-1 min-h-0 bg-[#ffffff] flex items-center justify-center overflow-hidden p-2">
        <iframe
          key={iframeKey}
          src={embedSrc}
          title="客食端实时预览"
          style={{
            width: dims.width,
            height: dims.height,
            transform: scale < 1 ? `scale(${scale})` : undefined,
            transformOrigin: 'center center',
            border: '1px solid #e2e3e1',
            background: '#ffffff'
          }}
        />
      </div>

      {/* 底部标注 */}
      <div className="shrink-0 px-2.5 py-1.5 border-t border-[#e2e3e1] bg-[#f7f7f5] flex items-center justify-between">
        <span className="font-mono text-[9.5px] text-[#9a9a96] truncate">
          {dims.label} · {dims.width}×{dims.height}
          {scale < 1 ? ` · 缩放 ${Math.round(scale * 100)}%` : ''}
        </span>
        <span className="text-[9.5px] text-[#9a9a96] shrink-0">独立会话 · 互不影响</span>
      </div>
    </div>
  );
};
