// Synthesized field audio (WebAudio, no samples): match horn, pneumatic hiss,
// drivetrain motor whir tied to speed, cube collision thuds, UI clicks.
import { CFG } from './config.js';

class AudioSys {
  constructor() {
    this.ctx = null; this.master = null; this.whir = null; this.enabled = CFG.AUDIO.enabled;
  }
  init() {
    if (this.ctx || !this.enabled) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.enabled = false; }
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  now() { return this.ctx ? this.ctx.currentTime : 0; }

  // FRC match horn: stacked detuned saws ~180 Hz, 0.9 s blast
  horn(dur = 0.9) {
    if (!this.ctx) return;
    const t = this.now();
    for (const f of [174, 185, 196]) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
      g.gain.setValueAtTime(0.22, t + dur - 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 900;
      o.connect(lp); lp.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.05);
    }
  }
  // endgame warning: 3 short blasts
  warning() {
    if (!this.ctx) return;
    [0, 0.35, 0.7].forEach(d => setTimeout(() => this.horn(0.28), d * 1000));
  }
  // pneumatic solenoid hiss: filtered noise burst
  hiss(dur = 0.25, vol = 0.3) {
    if (!this.ctx) return;
    const t = this.now(), len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.8;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t);
  }
  // cube thud: lowpassed noise, intensity 0..1
  thud(intensity = 0.5) {
    if (!this.ctx) return;
    const t = this.now(), dur = 0.12, len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 300 + intensity * 500;
    const g = this.ctx.createGain(); g.gain.value = 0.15 + intensity * 0.5;
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t);
  }
  click() {
    if (!this.ctx) return;
    const t = this.now(), o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.08);
  }
  // continuous drivetrain whir; call every frame with speed 0..1
  motor(speed) {
    if (!this.ctx) return;
    const t = this.now();
    if (!this.whir) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      o.type = 'sawtooth'; lp.type = 'lowpass'; lp.frequency.value = 1400;
      o.connect(lp); lp.connect(g); g.connect(this.master);
      g.gain.value = 0; o.start();
      this.whir = { o, g };
    }
    const s = Math.min(1, Math.max(0, speed));
    this.whir.o.frequency.setTargetAtTime(90 + s * 420, t, 0.05);
    this.whir.g.gain.setTargetAtTime(s * 0.06, t, 0.08);
  }
}

export const audio = new AudioSys();
