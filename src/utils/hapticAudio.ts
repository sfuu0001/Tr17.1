// Synthesized mechanical ratchet/click audio generator for gear wheel dial interactions
let audioCtx: AudioContext | null = null;
let isAudioMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function toggleAudioMute(muted?: boolean): boolean {
  if (muted !== undefined) {
    isAudioMuted = muted;
  } else {
    isAudioMuted = !isAudioMuted;
  }
  return isAudioMuted;
}

export function isMuted(): boolean {
  return isAudioMuted;
}

/**
 * Play a subtle, crisp mechanical gear ratchet tick sound
 */
export function playGearTickSound(frequency = 750, duration = 0.022) {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.4, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Graceful silent fallback
  }
}

/**
 * Play a solid mechanical button switch / engagement sound
 */
export function playGearEngageSound() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Dual-tone mechanical snap
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(520, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.04);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.045);
    osc2.stop(ctx.currentTime + 0.045);
  } catch {
    // Graceful silent fallback
  }
}

/**
 * 菜品卡片与侧边栏滚动联动时的微触觉音效反馈 (高质感柔和微击音)
 */
export function playCategoryLinkSound(categoryIndex = 0) {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // 根据分类序号微调基础频率，营造升降阶梯般的高级细腻反馈感
    const baseFreq = 480 + (categoryIndex % 8) * 35;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.045, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.032);
  } catch {
    // Graceful silent fallback
  }
}

/**
 * 点击侧边栏精准吸附到目标菜品区块时的吸附提示音
 */
export function playCategorySnapSound() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.042);
  } catch {
    // Graceful silent fallback
  }
}
