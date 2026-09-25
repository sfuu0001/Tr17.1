/**
 * 语音录制、波形分析、实时转写与音频高保真播放引擎
 * Voice Message Audio Recorder, Waveform Analyser & Speech Engine
 */

export interface VoiceRecordingResult {
  duration: number; // 秒数 (四舍五入)
  audioBlob: Blob;
  audioUrl: string;
  audioBase64: string;
  waveform: number[]; // 10~15 个波形高度数值 (0~100)
  transcribedText: string;
}

class VoiceMessageEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private pcmChunks: Float32Array[] = [];
  private pcmSampleRate: number = 44100;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private recordingStartTime: number = 0;
  private animationFrameId: number | null = null;
  private recognition: any = null;
  private liveTranscript: string = '';
  private liveWaveformCallback: ((wave: number[]) => void) | null = null;
  private currentPlayingAudio: HTMLAudioElement | null = null;

  /**
   * 检查浏览器是否支持麦克风录音
   */
  public isMicrophoneSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    );
  }

  /**
   * 开始录制语音
   */
  public async startRecording(
    onWaveformUpdate?: (wave: number[]) => void,
    onTranscriptUpdate?: (text: string) => void
  ): Promise<{ success: boolean; mode: 'real_mic' | 'simulated'; error?: string }> {
    this.audioChunks = [];
    this.pcmChunks = [];
    this.liveTranscript = '';
    this.liveWaveformCallback = onWaveformUpdate || null;
    this.recordingStartTime = Date.now();

    // 尝试启动实时语音识别 (Web Speech API)
    this.initSpeechRecognition(onTranscriptUpdate);

    // 1. 尝试使用真实麦克风录音
    if (this.isMicrophoneSupported()) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        this.audioStream = stream;

        // 设置音频分析器与 PCM 录音备份 (双保险保障声音绝不丢失)
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
          }
          this.pcmSampleRate = this.audioContext.sampleRate || 44100;
          const source = this.audioContext.createMediaStreamSource(stream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64;
          source.connect(this.analyser);

          // 使用 ScriptProcessor 录制原始高保真 PCM 数据作为绝对可靠的 WAV 备份
          try {
            const bufferSize = 4096;
            this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
            this.scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmCopy = new Float32Array(inputData.length);
              pcmCopy.set(inputData);
              this.pcmChunks.push(pcmCopy);
            };
            source.connect(this.scriptProcessor);
            // 静音节点隔离：防止麦克风声音反馈到扬声器引发啸叫
            const muteGain = this.audioContext.createGain();
            muteGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            this.scriptProcessor.connect(muteGain);
            muteGain.connect(this.audioContext.destination);
          } catch {
            // ScriptProcessor optional fallback
          }

          this.startWaveformLoop();
        }

        // 初始化 MediaRecorder
        if (typeof MediaRecorder !== 'undefined') {
          const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/aac',
            'audio/ogg;codecs=opus',
            ''
          ];
          let selectedMime = '';
          for (const type of mimeTypes) {
            if (!type || MediaRecorder.isTypeSupported(type)) {
              selectedMime = type;
              break;
            }
          }

          const options = selectedMime ? { mimeType: selectedMime } : undefined;
          this.mediaRecorder = new MediaRecorder(stream, options);

          this.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              this.audioChunks.push(event.data);
            }
          };

          this.mediaRecorder.start(100);
        }

        return { success: true, mode: 'real_mic' };
      } catch (err: any) {
        console.warn('[VoiceEngine] 麦克风访问异常或未授权，已切换模拟对讲:', err?.message || err);
      }
    }

    // 2. 权限受限或无硬件环境时使用仿真波形
    this.startSimulatedWaveformLoop();
    return { success: true, mode: 'simulated' };
  }

  /**
   * 停止录制并生成最终音频与转写文本
   */
  public async stopRecording(
    defaultTranscriptFallback?: string
  ): Promise<VoiceRecordingResult> {
    const durationSec = Math.max(1, Math.round((Date.now() - this.recordingStartTime) / 1000));

    // 停止语音识别
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }

    // 停止动画循环
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // 整理最终转写文字
    let finalTranscript = this.liveTranscript.trim();
    if (!finalTranscript) {
      finalTranscript = defaultTranscriptFallback || '【语音消息】：对讲语音已录制发送';
    }

    // 生成波形样本
    const finalWaveform = this.generateSampleWaveform(durationSec);

    // 1. 如果有 MediaRecorder 录制的数据
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      const recorded = await new Promise<VoiceRecordingResult>((resolve) => {
        const recorder = this.mediaRecorder!;
        
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        recorder.onstop = async () => {
          let audioBlob: Blob;
          const mimeType = recorder.mimeType || 'audio/webm';

          if (this.audioChunks.length > 0) {
            audioBlob = new Blob(this.audioChunks, { type: mimeType });
          } else if (this.pcmChunks.length > 0) {
            audioBlob = this.encodeWAV(this.pcmChunks, this.pcmSampleRate);
          } else {
            audioBlob = this.createSyntheticBeepBlob(durationSec);
          }

          const audioUrl = URL.createObjectURL(audioBlob);
          const audioBase64 = await this.blobToBase64(audioBlob);

          this.cleanupStreams();

          resolve({
            duration: durationSec,
            audioBlob,
            audioUrl,
            audioBase64,
            waveform: finalWaveform,
            transcribedText: finalTranscript
          });
        };

        try {
          recorder.stop();
        } catch {
          // fallback if stop fails
          let audioBlob = this.pcmChunks.length > 0
            ? this.encodeWAV(this.pcmChunks, this.pcmSampleRate)
            : this.createSyntheticBeepBlob(durationSec);
          
          this.blobToBase64(audioBlob).then((audioBase64) => {
            this.cleanupStreams();
            resolve({
              duration: durationSec,
              audioBlob,
              audioUrl: URL.createObjectURL(audioBlob),
              audioBase64,
              waveform: finalWaveform,
              transcribedText: finalTranscript
            });
          });
        }
      });

      return recorded;
    }

    // 2. 如果 MediaRecorder 不可用但 PCM 录制成功
    if (this.pcmChunks.length > 0) {
      const audioBlob = this.encodeWAV(this.pcmChunks, this.pcmSampleRate);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioBase64 = await this.blobToBase64(audioBlob);
      this.cleanupStreams();

      return {
        duration: durationSec,
        audioBlob,
        audioUrl,
        audioBase64,
        waveform: finalWaveform,
        transcribedText: finalTranscript
      };
    }

    // 3. 仿真环境生成的音频 (带真实 WAV 音频流，避免空音频导致回退到机器人朗读)
    const audioBlob = this.createSyntheticBeepBlob(durationSec);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audioBase64 = await this.blobToBase64(audioBlob);
    this.cleanupStreams();

    return {
      duration: durationSec,
      audioBlob,
      audioUrl,
      audioBase64,
      waveform: finalWaveform,
      transcribedText: finalTranscript
    };
  }

  /**
   * 取消录音并清理资源
   */
  public cancelRecording(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }

    this.cleanupStreams();
    this.audioChunks = [];
    this.pcmChunks = [];
  }

  /**
   * 清理底层音频流与上下文
   */
  private cleanupStreams(): void {
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.audioStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
  }

  /**
   * 播放真实录制语音消息 (直接播放真声 Audio 数据并支持实时播放进度与字级追踪)
   */
  public playVoice(
    audioUrlOrBase64?: string,
    transcriptText?: string,
    duration: number = 3,
    onEnded?: () => void,
    playbackRate: number = 1.0,
    onProgress?: (progress: number, currentTime: number, totalDuration: number) => void
  ): { stop: () => void } {
    this.stopCurrentPlaying();

    let stopped = false;
    let progressTimer: any = null;

    const stopProgressTimer = () => {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
    };

    // 1. 如果有真实录制的声音（Base64 或 Blob URL）
    if (
      audioUrlOrBase64 &&
      (audioUrlOrBase64.startsWith('data:audio') ||
        audioUrlOrBase64.startsWith('blob:') ||
        audioUrlOrBase64.startsWith('http'))
    ) {
      try {
        const audio = new Audio();
        audio.src = audioUrlOrBase64;
        audio.volume = 1.0;
        audio.playbackRate = playbackRate;
        this.currentPlayingAudio = audio;

        const effectiveDuration = duration > 0 ? duration : 3;

        // 启动高频平滑进度轮询 (每 40ms 一次，支持字级高亮与拟真频谱)
        progressTimer = setInterval(() => {
          if (stopped) return;
          const curTime = audio.currentTime || 0;
          const actualDur = audio.duration && !isNaN(audio.duration) && audio.duration > 0
            ? audio.duration
            : effectiveDuration;
          const prog = Math.min(1, Math.max(0, curTime / actualDur));
          if (onProgress) {
            onProgress(prog, curTime, actualDur);
          }
        }, 40);

        audio.onended = () => {
          if (!stopped) {
            stopProgressTimer();
            if (onProgress) {
              onProgress(1.0, audio.duration || effectiveDuration, audio.duration || effectiveDuration);
            }
            this.currentPlayingAudio = null;
            if (onEnded) onEnded();
          }
        };

        audio.onerror = (e) => {
          console.warn('[VoiceEngine] Audio 播放失败，尝试声学生成:', e);
          stopProgressTimer();
          if (!stopped) {
            this.playSynthesizedTone(duration, transcriptText, onEnded, onProgress);
          }
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[VoiceEngine] 自动播放受阻:', err);
            stopProgressTimer();
            // 遇到浏览权限拦截时声学兼容播放
            if (!stopped) {
              this.playSynthesizedTone(duration, transcriptText, onEnded, onProgress);
            }
          });
        }

        return {
          stop: () => {
            stopped = true;
            stopProgressTimer();
            try {
              audio.pause();
              audio.currentTime = 0;
            } catch {}
            if (this.currentPlayingAudio === audio) {
              this.currentPlayingAudio = null;
            }
          }
        };
      } catch (err) {
        console.warn('[VoiceEngine] 初始化 Audio 失败:', err);
        stopProgressTimer();
      }
    }

    // 2. 仅当完全没有音频流时才采用蜂鸣音效与语音合成
    return this.playSynthesizedTone(duration, transcriptText, onEnded, onProgress);
  }

  /**
   * 停止当前所有正在播放的音频
   */
  public stopCurrentPlaying(): void {
    if (this.currentPlayingAudio) {
      try {
        this.currentPlayingAudio.pause();
        this.currentPlayingAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentPlayingAudio = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  /**
   * 内部：使用 Web Audio API 产生对讲提示音效，并配合 SpeechSynthesis 发音与平滑逐字推进
   */
  private playSynthesizedTone(
    duration: number,
    text?: string,
    onEnded?: () => void,
    onProgress?: (progress: number, currentTime: number, totalDuration: number) => void
  ): { stop: () => void } {
    let stopped = false;
    let progressTimer: any = null;
    const AudioCtx = typeof window !== 'undefined' ? window.AudioContext || (window as any).webkitAudioContext : null;

    if (AudioCtx) {
      try {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // 模拟对讲机开麦电台提示音 (Chirp)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(950, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } catch {
        // ignore
      }
    }

    const cleanText = text
      ? text.replace(/^【.*?】：?/, '').replace(/^语音转文字：/, '').trim()
      : '';
    // 根据字数动态计算合理的自然语速时长 (汉字约每字 0.22 秒，最少 2 秒)
    const naturalDuration = cleanText
      ? Math.max(duration || 3, Math.round(cleanText.length * 0.24 * 10) / 10)
      : Math.max(2, duration || 3);
    const startTime = Date.now();

    // 启动高精度进度轮询，驱动字级跟随
    progressTimer = setInterval(() => {
      if (stopped) return;
      const elapsed = (Date.now() - startTime) / 1000;
      const prog = Math.min(1.0, elapsed / naturalDuration);
      if (onProgress) {
        onProgress(prog, elapsed, naturalDuration);
      }
    }, 40);

    // 若有转写文本且浏览器支持语音合成，朗读转写内容实现真正发声
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && cleanText) {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'zh-CN';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => {
          if (!stopped) {
            if (progressTimer) clearInterval(progressTimer);
            if (onProgress) onProgress(1.0, naturalDuration, naturalDuration);
            clearTimeout(timer);
            if (onEnded) onEnded();
          }
        };
        utterance.onerror = () => {
          // fallback to timer
        };
        window.speechSynthesis.speak(utterance);
      } catch {
        // ignore
      }
    }

    // 倒计时结束回调保底
    const timer = setTimeout(() => {
      if (!stopped) {
        if (progressTimer) clearInterval(progressTimer);
        if (onProgress) onProgress(1.0, naturalDuration, naturalDuration);
        if (onEnded) onEnded();
      }
    }, Math.max(1500, naturalDuration * 1000));

    return {
      stop: () => {
        stopped = true;
        if (progressTimer) clearInterval(progressTimer);
        clearTimeout(timer);
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          try {
            window.speechSynthesis.cancel();
          } catch {}
        }
      }
    };
  }

  /**
   * 内部：初始化 Web Speech API 实时识别
   */
  private initSpeechRecognition(onTranscriptUpdate?: (text: string) => void): void {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'zh-CN';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            this.liveTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        const full = (this.liveTranscript + interimTranscript).trim();
        if (onTranscriptUpdate && full) {
          onTranscriptUpdate(full);
        }
      };

      this.recognition.onerror = () => {
        // ignore recognition errors
      };

      this.recognition.start();
    } catch {
      // ignore
    }
  }

  /**
   * 内部：真实麦克风频谱波形动画循环
   */
  private startWaveformLoop(): void {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const update = () => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);

      // 计算 10 个波段的分贝高度 (20% ~ 100%)
      const waveBars: number[] = [];
      const step = Math.max(1, Math.floor(dataArray.length / 10));
      for (let i = 0; i < 10; i++) {
        const val = dataArray[i * step] || 0;
        const normalized = Math.min(100, Math.max(20, Math.round((val / 255) * 100)));
        waveBars.push(normalized);
      }

      if (this.liveWaveformCallback) {
        this.liveWaveformCallback(waveBars);
      }

      this.animationFrameId = requestAnimationFrame(update);
    };

    update();
  }

  /**
   * 内部：仿真模式波形跳动
   */
  private startSimulatedWaveformLoop(): void {
    const update = () => {
      const now = Date.now();
      const waveBars: number[] = [];
      for (let i = 0; i < 10; i++) {
        const sinVal = Math.sin(now / 150 + i * 0.8);
        const rand = Math.random() * 25;
        const height = Math.min(100, Math.max(25, Math.round(50 + sinVal * 30 + rand)));
        waveBars.push(height);
      }

      if (this.liveWaveformCallback) {
        this.liveWaveformCallback(waveBars);
      }

      this.animationFrameId = requestAnimationFrame(update);
    };

    update();
  }

  /**
   * 内部：生成美观的波形数据数组 (用于气泡展示)
   */
  private generateSampleWaveform(duration: number): number[] {
    const baseWave = [35, 60, 95, 70, 85, 40, 80, 65, 45, 90, 75, 50];
    return baseWave.map((val) => Math.min(100, Math.max(20, Math.round(val + (Math.random() * 20 - 10)))));
  }

  /**
   * 将原始 Float32 PCM 录音数组编码为标准 16-Bit WAV Blob (全平台 100% 完美回放)
   */
  private encodeWAV(chunks: Float32Array[], sampleRate: number): Blob {
    let totalLength = 0;
    for (const chunk of chunks) {
      totalLength += chunk.length;
    }

    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const buffer = new ArrayBuffer(44 + merged.length * 2);
    const view = new DataView(buffer);

    // RIFF 标识
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + merged.length * 2, true);
    this.writeString(view, 8, 'WAVE');

    // fmt 子块
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, 1, true); // NumChannels (1 mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
    view.setUint16(34, 16, true); // BitsPerSample (16 bits)

    // data 子块
    this.writeString(view, 36, 'data');
    view.setUint32(40, merged.length * 2, true);

    // 写入 16-bit PCM 采样
    let index = 44;
    for (let i = 0; i < merged.length; i++) {
      const s = Math.max(-1, Math.min(1, merged[i]));
      view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      index += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  /**
   * 生成真实模拟对讲调频音音频 Blob
   */
  private createSyntheticBeepBlob(durationSec: number): Blob {
    const sampleRate = 22050;
    const numSamples = Math.floor(sampleRate * Math.min(durationSec, 3));
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // 对讲机电台底噪 + 柔和提示双音
      const chirp = Math.sin(2 * Math.PI * 650 * t) * Math.exp(-t * 8) * 0.4;
      const noise = (Math.random() * 2 - 1) * 0.03 * (t < 0.5 ? 1 : 0.2);
      buffer[i] = chirp + noise;
    }

    return this.encodeWAV([buffer], sampleRate);
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * 内部：Blob 转 Base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve((reader.result as string) || '');
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  }
}

export const voiceMessageEngine = new VoiceMessageEngine();
