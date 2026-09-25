/* ============================================================================
 * CustomerPreviewControl —— 客食端预览「1+3 四开关」管控组件
 * ----------------------------------------------------------------------------
 * 状态流转规则（与最终落地方案文档 §3.2 一致）：
 * 1. 总开关 OFF → 三端立即收起；端开关置灰禁用，但状态保留（重开无副作用）
 * 2. 总开关 OFF 时端开关防御性拦截（UI 置灰 + 逻辑兜底）
 * 3. 端开关切换 → 当前所在端右栏即时显隐（由 App 判定链消费）；其余端仅记忆
 * 4. 电脑端前置：非电脑端整组置灰并提示「仅电脑端可用」
 * 写入统一走 mergeLocalPrefs → 本地即时 + 云端异步跟随（账号级双向同步）
 * ============================================================================*/
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { MonitorSmartphone } from 'lucide-react';
import {
  getWorkspacePrefsSnapshot,
  subscribeWorkspacePrefs,
  mergeLocalPrefs,
  PreviewRoleId
} from '../../utils/workspacePreferences';
import { DESKTOP_MEDIA_QUERY } from '../../constants/deviceViewport';

const END_META: { id: PreviewRoleId; label: string }[] = [
  { id: 'merchant', label: '商家端' },
  { id: 'rider', label: '骑手端' },
  { id: 'platform', label: '平台端' }
];

function useIsDesktopDevice(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(DESKTOP_MEDIA_QUERY).matches
      : false
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

function Switch({
  checked,
  disabled,
  onToggle,
  title
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      title={title}
      className={`relative w-9 h-5 rounded-full transition-all shrink-0 border ${
        disabled
          ? 'cursor-not-allowed opacity-40 border-[#d3d1cb] bg-[#e5e5e2]'
          : 'cursor-pointer'
      } ${checked ? 'bg-[#1a1918] border-[#1a1918]' : 'bg-[#e5e4df] border-[#d3d1cb]'}`}
    >
      <span
        className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-all ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export function CustomerPreviewControl() {
  const prefs = useSyncExternalStore(subscribeWorkspacePrefs, getWorkspacePrefsSnapshot);
  const isDesktop = useIsDesktopDevice();
  const pc = prefs.previewControl;
  const envBlocked = !isDesktop;

  const setMaster = (next: boolean) => {
    // ON → 不改动 ends（各端恢复记忆状态）；OFF → 三端立即收起（ends 保留）
    mergeLocalPrefs({ previewControl: { masterEnabled: next, ends: {} } });
  };
  const setEnd = (role: PreviewRoleId, next: boolean) => {
    if (!pc.masterEnabled) return; // 防御性拦截（UI 已置灰）
    mergeLocalPrefs({ previewControl: { masterEnabled: true, ends: { [role]: next } } });
  };

  const badgeFor = (role: PreviewRoleId): { text: string; cls: string } => {
    if (envBlocked) return { text: '仅电脑端可用', cls: 'text-[#854F0B] bg-[#fff8e1] border-[#fde68a]' };
    if (!pc.masterEnabled) return { text: '已被总开关关闭', cls: 'text-[#787770] bg-[#f4f4f2] border-[#d3d1cb]' };
    return pc.ends[role]
      ? { text: '生效中', cls: 'text-[#006d36] bg-[#e1f5ee] border-[#9fe1cb]' }
      : { text: '已关闭', cls: 'text-[#787770] bg-[#f4f4f2] border-[#d3d1cb]' };
  };

  return (
    <section className="bg-[#ffffff] border border-[#e2e3e1] p-3 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <MonitorSmartphone className="w-3.5 h-3.5 text-[#185FA5]" />
        <span className="font-headline-sm text-xs font-bold text-[#1a1c1b]">客食端预览管控</span>
        <span className="ml-auto font-mono text-[9px] text-[#9a9a96]">1+3 SWITCHES</span>
      </div>

      {!isDesktop && (
        <div className="text-[10px] text-[#854F0B] bg-[#fff8e1] border border-[#fde68a] px-2 py-1 leading-snug">
          当前为手机 / 平板设备，客食端预览壳仅电脑端可用
        </div>
      )}

      {/* 一键总开关 */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-[#1a1c1b]">全部工作台启用</div>
          <div className="text-[9.5px] text-[#787770] leading-snug">
            关闭后三端预览列全部收起（各端记忆保留，重开自动恢复）
          </div>
        </div>
        <Switch
          checked={pc.masterEnabled}
          disabled={envBlocked}
          onToggle={() => setMaster(!pc.masterEnabled)}
          title={pc.masterEnabled ? '关闭全部工作台的客食端预览' : '开启客食端预览（按各端开关生效）'}
        />
      </div>

      {/* 三端独立开关 */}
      <div className="grid grid-cols-3 gap-1.5">
        {END_META.map(({ id, label }) => {
          const badge = badgeFor(id);
          const disabled = envBlocked || !pc.masterEnabled;
          return (
            <div key={id} className="bg-[#f7f7f5] border border-[#e2e3e1] p-2 flex flex-col items-center gap-1.5">
              <span className="text-[10.5px] font-bold text-[#1a1c1b]">{label}</span>
              <Switch
                checked={pc.ends[id]}
                disabled={disabled}
                onToggle={() => setEnd(id, !pc.ends[id])}
                title={`${label}客食端预览列开关`}
              />
              <span className={`text-[8.5px] font-bold px-1 py-px border ${badge.cls}`}>{badge.text}</span>
            </div>
          );
        })}
      </div>

      <p className="text-[9.5px] text-[#787770] leading-snug">
        开关状态账号级保存：本地即时生效 + 云端双向同步；本地记录被清除后，重新进入将自动从云端拉取还原。
      </p>
    </section>
  );
}
