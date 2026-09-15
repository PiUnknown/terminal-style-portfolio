// Web Audio API Mechanical Keyboard Sound Synthesizer (0 external files needed)

class KeyboardSoundSynthesizer {
  private ctx: AudioContext | null = null;
  public enabled: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("terminal_keyboard_sfx");
      this.enabled = saved === "true";
    }
  }

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("terminal_keyboard_sfx", enabled ? "true" : "false");
    }
  }

  // Realistic mechanical switch downstroke click
  public playKey(key?: string) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const isSpace = key === " " || key === "Space";
      const isEnter = key === "Enter";
      const isBackspace = key === "Backspace";

      // 1. Noise burst for switch friction & click
      const bufferSize = this.ctx.sampleRate * 0.035; // 35ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter for crisp mechanical clack
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      
      // Pitch variation so keypresses don't sound identical
      const pitchJitter = (Math.random() - 0.5) * 400;
      if (isSpace || isEnter) {
        filter.frequency.setValueAtTime(1200 + pitchJitter, now);
        filter.Q.setValueAtTime(2.5, now);
      } else if (isBackspace) {
        filter.frequency.setValueAtTime(2600 + pitchJitter, now);
        filter.Q.setValueAtTime(4.0, now);
      } else {
        filter.frequency.setValueAtTime(2200 + pitchJitter, now);
        filter.Q.setValueAtTime(3.5, now);
      }

      const gain = this.ctx.createGain();
      const volume = isSpace || isEnter ? 0.22 : 0.15;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isSpace ? 0.045 : 0.03));

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.05);

      // 2. Low-frequency tactile "thump" (switch bottoming out)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = "sine";
      
      const baseFreq = isSpace ? 140 : isEnter ? 180 : 260 + (Math.random() - 0.5) * 40;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.04);

      oscGain.gain.setValueAtTime(isSpace || isEnter ? 0.18 : 0.1, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Audio context error guard
    }
  }

  // Tactile navigation click
  public playNavClick() {
    this.playKey("Enter");
  }
}

export const keyboardSound = new KeyboardSoundSynthesizer();
