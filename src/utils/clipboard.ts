/**
 * 安全复制到剪贴板函数，兼容 iframe 沙箱限制与现代浏览器 API
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. 尝试使用现代 Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // 忽略或降级至传统 execCommand
    }
  }

  // 2. 降级方案：创建隐藏 textarea 执行 execCommand('copy')
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch (e) {
      return false;
    }
  }

  return false;
}
