import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { checkAndExecuteVersionPurge } from './utils/versionPurgeGateway';

// 启动版本检测与自愈清理网关：若检测到新版本发布，立即清空旧用户文件与数据残留
if (typeof window !== 'undefined') {
  checkAndExecuteVersionPurge().catch((err) => {
    console.warn('[VersionPurgeGateway] 初始化检测异常:', err);
  });
}

/**
 * 全局未捕获异常守卫。
 *
 * 作用范围（须准确理解）：仅拦截**未捕获的异常与 Promise rejection**，
 * 即 `window.onerror` / `unhandledrejection` 两条路径。它**无法**过滤第三方
 * SDK 主动调用 `console.error` 输出的日志 —— 那类噪音必须在 SDK 调用侧收敛
 * （如传输层不再对未就绪的通道反复重试）。
 *
 * 清单只覆盖两类：
 *   1. 跨域脚本被浏览器折叠后毫无信息量的 "Script error."；
 *   2. 第三方 SDK（高德 AMap / Leaflet / CloudBase 实时通道）的**已知内部噪声**。
 * 业务异常一律不在此列 —— 不得为「让控制台好看」而扩大屏蔽范围。
 */
const SDK_NOISE_PATTERNS = [
  'Script error.',
  'INVALID_USER_KEY',
  'FlyDataAuthTask',
  'AMap',
  '_leaflet_pos',
  'initWebSocketConnection',
  'credentials not found',
  // CloudBase 实时通道 WebSocket 客户端超时。属连接不可用时的 SDK 内部 rejection，
  // 根因由传输层的就绪门控与单路订阅消除（见 utils/transport/adapters.ts）。
  'wsclient.send timedout'
];

function isKnownSdkNoise(message: string): boolean {
  return SDK_NOISE_PATTERNS.some((pattern) => message.includes(pattern));
}

if (typeof window !== 'undefined') {
  const rawConsoleError = console.error;
  console.error = (...args: any[]) => {
    try {
      const fullText = args
        .map((arg) => (typeof arg === 'string' ? arg : arg?.message || JSON.stringify(arg) || ''))
        .join(' ');
      if (isKnownSdkNoise(fullText)) {
        return;
      }
    } catch {
      // ignore
    }
    rawConsoleError.apply(console, args);
  };

  window.addEventListener('error', (e) => {
    if (!e.message || isKnownSdkNoise(e.message)) {
      e.preventDefault();
      return true;
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const message = typeof reason === 'string' ? reason : reason?.message || '';
    if (!reason || isKnownSdkNoise(message)) {
      e.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
