/**
 * 声触协同物理反馈引擎 (Tactile Audio-Haptic Engine)
 * 基于 Web Audio API 合成物理微动开关、机械齿轮咬合与纸张撕扯音效，
 * 并联动移动端 navigator.vibrate 触觉反馈。
 */

class AudioHapticService {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private hapticEnabled: boolean = true;

  constructor() {
    // 惰性加载 AudioContext，避免在非用户手势时引起警告
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public setHapticEnabled(enabled: boolean) {
    this.hapticEnabled = enabled;
  }

  /**
   * 触发物理设备微震动
   */
  public vibrate(pattern: number | number[]) {
    if (!this.hapticEnabled || typeof window === 'undefined') return;
    try {
      if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // 忽略部分不支持或受 iframe 限制的环境
    }
  }

  /**
   * 1. 轻量触控微动开关声 (Light Micro-switch Click - ~4.2kHz)
   * 适用于：热力格子划过、数量加减、选项切换
   */
  public playMicroClick() {
    this.vibrate(10);
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(3800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.02);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.02);
    } catch {}
  }

  /**
   * 2. 机械滑块卡榫落锁声 (Mechanical Latch / Lock Snap)
   * 适用于：规格确认、优惠券核销、模式切换
   */
  public playMechanicalLatch() {
    this.vibrate([15, 30, 20]);
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  }

  /**
   * 3. 钱箱锁扣弹开 / 平账重力共振 (Cash Drawer Chime & Thud)
   * 适用于：交接班平账、钱箱打开、大额对账通过
   */
  public playCashDrawerChime() {
    this.vibrate([40, 60, 40]);
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // 钟声泛音
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
      osc1.frequency.exponentialRampToValueAtTime(2093, ctx.currentTime + 0.15); // C7
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.25);

      // 低频抽屉滑动木纹感
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(180, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.18);
      gain2.gain.setValueAtTime(0.15, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.18);
    } catch {}
  }

  /**
   * 4. 热敏小票撕纸撕裂声 (Ticket Tear Micro-chirp)
   * 适用于：出餐撕单、打印防伪凭证、核销完成
   */
  public playTicketTear() {
    this.vibrate([20, 20, 20]);
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // 快速白噪声脉冲模拟纸张纤维摩擦撕裂
      const bufferSize = ctx.sampleRate * 0.06;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, ctx.currentTime);
      filter.Q.setValueAtTime(3.0, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start(ctx.currentTime);
      whiteNoise.stop(ctx.currentTime + 0.06);
    } catch {}
  }

  /**
   * 5. 警示 / 风险审计阻断音 (Tactical Warning Staccato)
   * 适用于：钱箱长短款差异警告、风控删单拦截
   */
  public playWarningAlert() {
    this.vibrate([50, 40, 50]);
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }
}

export const audioHaptics = new AudioHapticService();
