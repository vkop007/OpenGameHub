/* Tiny WebAudio synth — every sound is generated, no audio files. */

type Ctx = AudioContext & { _unlocked?: boolean };

class Sfx {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  muted = false;

  private ensure(): Ctx | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC() as Ctx;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.32;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = "sine",
    gain = 0.5,
    slideTo?: number,
    delay = 0,
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, gain = 0.4, filterFreq = 900, delay = 0) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFreq, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(120, filterFreq * 0.3), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  jump() {
    this.tone(360, 0.16, "triangle", 0.35, 620);
  }
  land() {
    this.noise(0.1, 0.22, 500);
    this.tone(150, 0.09, "sine", 0.22, 90);
  }
  dive() {
    this.noise(0.28, 0.3, 1600);
    this.tone(300, 0.24, "sawtooth", 0.16, 120);
  }
  kick() {
    this.noise(0.14, 0.35, 2400);
    this.tone(220, 0.12, "square", 0.16, 90);
  }
  hit() {
    this.tone(180, 0.2, "square", 0.28, 70);
    this.noise(0.16, 0.3, 700);
  }
  splash() {
    this.noise(0.5, 0.4, 1800);
    this.tone(520, 0.3, "sine", 0.16, 140);
  }
  zap() {
    this.tone(880, 0.12, "square", 0.22, 220);
    this.tone(440, 0.22, "sawtooth", 0.18, 80, 0.06);
  }
  beep(high = false) {
    this.tone(high ? 880 : 520, high ? 0.28 : 0.14, "triangle", 0.3);
  }
  go() {
    this.tone(660, 0.1, "triangle", 0.3);
    this.tone(990, 0.3, "triangle", 0.3, 990, 0.1);
  }
  green() {
    this.tone(660, 0.12, "sine", 0.26);
    this.tone(880, 0.18, "sine", 0.26, 880, 0.1);
  }
  yellow() {
    this.tone(520, 0.1, "square", 0.14);
    this.tone(520, 0.1, "square", 0.14, 520, 0.16);
  }
  red() {
    this.tone(200, 0.3, "sawtooth", 0.24, 150);
    this.tone(150, 0.34, "square", 0.16, 110, 0.05);
  }
  thud() {
    this.tone(90, 0.22, "sine", 0.4, 50);
    this.noise(0.16, 0.25, 300);
  }
  boing() {
    this.tone(180, 0.32, "sine", 0.34, 520);
    this.tone(360, 0.22, "triangle", 0.16, 880, 0.04);
  }
  tile() {
    this.tone(300, 0.1, "triangle", 0.16, 180);
  }
  erupt() {
    this.noise(0.5, 0.4, 700);
    this.tone(70, 0.45, "sawtooth", 0.3, 45);
    this.tone(320, 0.3, "triangle", 0.14, 90, 0.05);
  }
  piston() {
    this.noise(0.12, 0.4, 2600);
    this.tone(120, 0.16, "square", 0.24, 55);
  }
  bumper() {
    this.tone(240, 0.2, "sine", 0.4, 760);
    this.tone(480, 0.16, "triangle", 0.2, 1200, 0.03);
  }
  sizzle() {
    this.noise(0.55, 0.42, 3400);
    this.tone(190, 0.4, "sawtooth", 0.12, 60);
  }
  finish() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => this.tone(n, 0.26, "triangle", 0.3, n, i * 0.11));
    this.tone(1318, 0.5, "sine", 0.22, 1318, 0.46);
  }
  click() {
    this.tone(700, 0.06, "triangle", 0.2, 900);
  }
  countdown(n: number) {
    this.tone(n === 0 ? 880 : 440, n === 0 ? 0.35 : 0.14, "triangle", 0.3);
  }
}

export const sfx = new Sfx();
