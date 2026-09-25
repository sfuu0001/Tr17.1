/* =========================================================================
 * ⛔ 分辨率锁定 RESOLUTION LOCK —— 禁止修改 / DO NOT MODIFY ⛔
 * 本组件为「客食端（顾客点餐前台）」的桌面壳：
 *   - 独立访问（电脑端 ≥1024px）：以白底直角壳居中呈现，默认基准机型
 *     iPhone 15 Pro Max 430×932（逻辑 px）——尺寸来源
 *     src/constants/deviceViewport.ts，禁止改动默认基准档。
 *   - 移动端（<1024px）：全屏直铺（100dvh），不套壳。
 * 可通过 props 覆盖宽高（预览列的自定义机型场景），默认走基准档。
 * 任何 AI / 开发者修复其他问题时不得改动基准尺寸与 translateZ(0)
 * （后者是 fixed 弹层包含块的关键，删除会导致弹层铺满整屏）。
 * ========================================================================= */
import React, { useEffect, useState } from 'react';
import {
  PHONE_FRAME_MEDIA_QUERY,
  DEFAULT_DEVICE_ID,
  getDeviceById
} from '../../constants/deviceViewport';

interface CustomerPhoneFrameProps {
  children: React.ReactNode;
  /** 覆盖宽度（逻辑 px）；不传 = 默认基准档 */
  width?: number;
  /** 覆盖高度（逻辑 px）；不传 = 默认基准档 */
  height?: number;
  /** 底部标注文字；不传 = 默认机型标注 */
  caption?: string;
}

export const CustomerPhoneFrame: React.FC<CustomerPhoneFrameProps> = ({ children, width, height, caption }) => {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(PHONE_FRAME_MEDIA_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(PHONE_FRAME_MEDIA_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  if (!isDesktop) {
    // 移动端：原样全屏（100dvh），不套壳
    return <div className="relative h-[100dvh] w-full overflow-hidden">{children}</div>;
  }

  const preset = getDeviceById(DEFAULT_DEVICE_ID)!;
  const w = width ?? preset.width;   // ⛔ 默认基准 430
  const h = height ?? preset.height; // ⛔ 默认基准 932
  const cap = caption ?? `${preset.label} · ${w}×${h} · 客食端标准视口`;

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#ffffff] py-4 select-none">
      <div className="flex flex-col items-center gap-2">
        {/* 视口壳：白底 · 直角 · 1px hairline · 无阴影 —— ⛔ 尺寸锁定，勿改
            translateZ(0)：让壳成为 fixed 后代的包含块（弹层约束在壳内），必须保留 */}
        <div
          className="relative overflow-hidden bg-[#ffffff] border border-[#e2e3e1]"
          style={{
            width: w,
            height: `min(${h}px, calc(100dvh - 56px))`,
            transform: 'translateZ(0)'
          }}
        >
          {children}
        </div>
        <div className="font-mono text-[10px] text-[#9a9a96] tracking-wider">{cap}</div>
      </div>
    </div>
  );
};
