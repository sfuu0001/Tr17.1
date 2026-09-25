/**
 * embed 预览会话识别（单一事实源）
 * ----------------------------------------------------------------------------
 * URL 带 ?embed=customer 的页面 = 「客食端预览」iframe 实例。
 *
 * 该实例必须退出一切跨文档总线（BroadcastChannel / storage 事件监听 /
 * 云端 watch WebSocket / 实时通道），只消费挂载时刻的本地快照：
 *  - 同源 iframe 与宿主共享主线程，跨文档事件风暴会同时拖垮两端帧率；
 *  - 若预览实例订阅并回写共享键，会与宿主形成「写 → storage 事件 →
 *    onChange → broadcast → 对端 setState → 再写」的回声循环（实测
 *    4 秒内 71 次 storage 事件 + 105 次 BroadcastChannel 消息）。
 *  - 预览列底部标注「独立会话 · 互不影响」即为本模块的行为契约。
 */
export const IS_EMBED_CUSTOMER = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('embed') === 'customer';
