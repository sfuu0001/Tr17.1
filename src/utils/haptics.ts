/**
 * 设备触感反馈（Vibration API）安全出口
 *
 * ## 为什么需要统一出口
 *
 * Chrome 对 `navigator.vibrate` 采用**粘性用户激活（sticky activation）**策略：
 * 在缺少用户手势的上下文（`setTimeout` 定时器、GPS 回调、异步动画帧）中调用时，
 * 浏览器**不会抛出异常**，而是以 [intervention] 方式静默阻断，并在控制台留下：
 *
 *   [intervention] Blocked call to navigator.vibrate because user hasn't
 *   tapped on the frame or any embedded frame yet
 *
 * 这类条目属于**策略阻断而非异常** —— 既不进 `try/catch`，也不触发 `window.onerror`，
 * 因此「外面包一层 try/catch」根本无法消除该噪音，必须在调用前判断激活状态。
 *
 * ## 行为等价性（重要）
 *
 * `navigator.userActivation.hasBeenActive` 是**粘性**标志：页面发生过任意一次用户
 * 交互后即永久为 `true`。于是：
 *
 * | 调用场景 | hasBeenActive | 本出口行为 | 与修复前对比 |
 * | :--- | :--- | :--- | :--- |
 * | 用户手势内（点击/滑动） | true | 正常振动 | **完全一致** |
 * | 手势后触发的定时器 | true | 正常振动 | **完全一致** |
 * | 页面加载即触发的定时器 | false | 跳过 | 原本就被浏览器阻断，可观测行为一致 |
 *
 * 即：本出口**只抑制「本来就不会生效」的调用**，不改变任何真实触感反馈。
 */

/** 页面是否已获得用户激活（粘性）。未实现该 API 的环境保守放行，交由浏览器自行裁决 */
function hasUserActivation(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } }).userActivation;
  // 无 userActivation 的实现（如旧版 Safari）：无法预判，放行以保持既有行为不变
  if (!ua) return true;
  return ua.hasBeenActive === true;
}

/**
 * 触发设备振动。无用户激活时静默跳过，以避免产生 intervention 控制台错误。
 *
 * @param pattern 单个时长（毫秒）或「振动,暂停,振动…」交替序列
 * @returns 是否实际发起了振动请求
 */
export function safeVibrate(pattern: number | number[]): boolean {
  if (typeof navigator === 'undefined') return false;
  const vibrate = navigator.vibrate;
  if (typeof vibrate !== 'function') return false;
  if (!hasUserActivation()) return false;
  try {
    vibrate.call(navigator, pattern);
    return true;
  } catch {
    return false;
  }
}
