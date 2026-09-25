/**
 * 轻量兜底 Toast (Fallback Toast)
 * ------------------------------------------------------------------
 * 审计修复 (P1): 多个 chat/omni 组件将 showToast 的默认值设为 console.log，
 * 导致组件脱离父级(未注入 useToast)时提示信息只进控制台、用户不可见。
 *
 * 本模块提供一个零依赖的 DOM 兜底：在页面右上角临时渲染提示条，
 * 无论组件是否被 React ToastProvider 包裹都能让用户看到反馈。
 * 优先使用全局 useToast 注入（父级传入），仅作为默认占位使用。
 */

export function fallbackToast(titleOrMsg: string, description?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const id = `fb-toast-${Date.now()}`;
    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = [
      'position:fixed',
      'top:16px',
      'right:16px',
      'z-index:99999',
      'max-width:340px',
      'background:rgba(18,18,18,0.92)',
      'color:#ffffff',
      'padding:10px 14px',
      'border:1px solid rgba(255,255,255,0.12)',
      'border-radius:8px',
      'box-shadow:0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
      'backdrop-filter:blur(16px)',
      '-webkit-backdrop-filter:blur(16px)',
      'font:500 12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC",sans-serif',
      'opacity:0',
      'transform:translateY(-6px)',
      'transition:opacity .18s ease, transform .18s ease',
      'pointer-events:auto'
    ].join(';');
    const titleEl = document.createElement('div');
    titleEl.textContent = titleOrMsg;
    el.appendChild(titleEl);
    if (description) {
      const descEl = document.createElement('div');
      descEl.textContent = description;
      descEl.style.cssText = 'color:rgba(255,255,255,.72);margin-top:3px;font-size:11px';
      el.appendChild(descEl);
    }
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px)';
      setTimeout(() => el.remove(), 200);
    }, 2600);
  } catch {
    // DOM 不可用时静默降级（不抛错）
  }
}

/** 兼容单参/双参签名 */
export function fallbackToastCompat(titleOrMsg: string | undefined, description?: string): void {
  fallbackToast(titleOrMsg || '操作完成', description);
}
