// Nhạc nền tổng hợp bằng WebAudio — không dùng file nhạc, không vướng bản quyền.
// - Canon in D (Pachelbel, 1680) và Bridal Chorus (Wagner, 1850): nhạc cổ điển đã thuộc phạm vi công cộng
// - Các bài còn lại: giai điệu sáng tác riêng cho dự án
// Hoặc phát link file nhạc (mp3/ogg) do cô dâu chú rể dán vào.

type Inst = 'piano' | 'strings' | 'bass' | 'bell' | 'pluck' | 'kick' | 'hat' | 'clap' | 'saw' | 'supersaw';
interface Note {
  t: number; // phách (beat) tính từ đầu vòng lặp
  n: number; // midi
  d: number; // độ dài (phách)
  v: number; // cường độ 0..1
  i: Inst;
}
interface Track {
  bpm: number;
  length: number; // phách mỗi vòng lặp
  events: Note[];
}

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** 'C#4' → 61 */
export function midi(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error('nốt sai: ' + name);
  return 12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const freq = (m: number) => 440 * 2 ** ((m - 69) / 12);

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// ───────── Các bài ─────────

/** Canon in D — bass lặp lại 8 hợp âm, rải hợp âm, 3 biến tấu giai điệu kinh điển */
function canon(): Track {
  const chords = [
    ['D3', 'F#3', 'A3', 'D4'], ['A2', 'E3', 'A3', 'C#4'], ['B2', 'F#3', 'B3', 'D4'], ['F#2', 'C#3', 'F#3', 'A3'],
    ['G2', 'D3', 'G3', 'B3'], ['D2', 'A2', 'D3', 'F#3'], ['G2', 'D3', 'G3', 'B3'], ['A2', 'E3', 'A3', 'C#4'],
  ].map((c) => c.map(midi));
  const bass = ['D3', 'A2', 'B2', 'F#2', 'G2', 'D2', 'G2', 'A2'].map(midi);
  const v1 = ['F#5', 'E5', 'D5', 'C#5', 'B4', 'A4', 'B4', 'C#5'].map(midi);
  const v2 = ['D5', 'C#5', 'B4', 'A4', 'G4', 'F#4', 'G4', 'E4'].map(midi);
  const v3 = ['D5', 'F#5', 'A5', 'G5', 'F#5', 'D5', 'F#5', 'E5', 'D5', 'B4', 'D5', 'A5', 'G5', 'B5', 'A5', 'G5'].map(midi);
  const ev: Note[] = [];
  const cycles = 4;
  for (let c = 0; c < cycles; c++) {
    const base = c * 16;
    chords.forEach((ch, k) => {
      const t0 = base + k * 2;
      ev.push({ t: t0, n: bass[k], d: 2, v: 0.55, i: 'bass' });
      [1, 2, 3, 2].forEach((idx, j) => ev.push({ t: t0 + j * 0.5, n: ch[idx] + 12, d: 0.6, v: 0.22, i: 'piano' }));
      if (c > 0) ev.push({ t: t0, n: ch[1] + 12, d: 2, v: 0.12, i: 'strings' });
      if (c === 1) ev.push({ t: t0, n: v1[k], d: 2, v: 0.5, i: 'piano' });
      if (c === 2) ev.push({ t: t0, n: v2[k] + 12, d: 2, v: 0.5, i: 'piano' });
    });
    if (c === 3) v3.forEach((n, k) => ev.push({ t: base + k, n, d: 1, v: 0.45, i: 'piano' }));
  }
  return { bpm: 66, length: cycles * 16, events: ev };
}

/** Bridal Chorus ("Here comes the bride") — giai điệu + hợp âm đệm */
function bridal(): Track {
  const mel: [string, number][] = [
    ['G4', 1], ['C5', 1.5], ['C5', 0.5], ['C5', 3],
    ['G4', 1], ['D5', 1.5], ['B4', 0.5], ['C5', 3],
    ['G4', 1], ['C5', 1.5], ['F5', 0.5], ['F5', 2], ['E5', 1], ['D5', 1], ['C5', 1], ['B4', 1], ['C5', 1], ['D5', 3],
    ['G4', 1], ['C5', 1.5], ['C5', 0.5], ['C5', 3],
    ['G4', 1], ['D5', 1.5], ['B4', 0.5], ['C5', 3],
    ['G4', 1], ['C5', 1.5], ['E5', 0.5], ['G5', 2], ['E5', 1], ['C5', 1], ['A4', 1], ['D5', 1], ['E5', 1], ['C5', 4],
  ];
  const chordOf: Record<string, string[]> = {
    C: ['C3', 'E3', 'G3'], E: ['C3', 'E3', 'G3'], G: ['C3', 'E3', 'G3'],
    D: ['G2', 'B2', 'D3'], B: ['G2', 'B2', 'D3'], F: ['F2', 'A2', 'C3'], A: ['F2', 'A2', 'C3'],
  };
  const ev: Note[] = [];
  let t = 0;
  const timeline: { t: number; n: string }[] = [];
  for (const [n, d] of mel) {
    ev.push({ t, n: midi(n), d, v: 0.55, i: 'piano' });
    ev.push({ t, n: midi(n) - 12, d, v: 0.1, i: 'strings' });
    timeline.push({ t, n });
    t += d;
  }
  const length = Math.ceil(t / 4) * 4 + 4;
  for (let b = 0; b < length; b += 2) {
    const cur = [...timeline].reverse().find((x) => x.t <= b) ?? timeline[0];
    const ch = chordOf[cur.n[0]].map(midi);
    ev.push({ t: b, n: ch[0] - 12, d: 2, v: 0.45, i: 'bass' });
    ch.forEach((n) => ev.push({ t: b, n: n + 12, d: 2, v: 0.09, i: 'strings' }));
    ev.push({ t: b + 1, n: ch[1] + 12, d: 0.8, v: 0.15, i: 'pluck' });
  }
  return { bpm: 70, length, events: ev };
}

/** Sáng tác riêng: piano lãng mạn C–G–Am–F */
function romance(): Track {
  const prog = [['C3', 'G3', 'C4', 'E4'], ['G2', 'D3', 'G3', 'B3'], ['A2', 'E3', 'A3', 'C4'], ['F2', 'C3', 'F3', 'A3']].map((c) => c.map(midi));
  const scale = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'].map(midi);
  const r = rng(1406);
  const ev: Note[] = [];
  const bars = 16;
  for (let b = 0; b < bars; b++) {
    const ch = prog[b % 4];
    const t0 = b * 4;
    ev.push({ t: t0, n: ch[0], d: 4, v: 0.45, i: 'bass' });
    [0, 1, 2, 3, 2, 1, 2, 3].forEach((idx, j) => ev.push({ t: t0 + j * 0.5, n: ch[idx] + 12, d: 0.7, v: 0.2, i: 'piano' }));
    if (b >= 4) {
      const rhythm = b % 2 ? [[0, 1.5], [1.5, 0.5], [2, 2]] : [[0, 1], [1, 1], [2, 1], [3, 1]];
      for (const [dt, d] of rhythm) {
        const toneSet = scale.filter((n) => ch.some((c) => (n - c) % 12 === 0) || r() < 0.3);
        const n = toneSet[Math.floor(r() * toneSet.length)] ?? scale[0];
        ev.push({ t: t0 + dt, n: b >= 12 ? n : n - 12, d, v: 0.45, i: 'piano' });
      }
    }
    if (b >= 8) ev.push({ t: t0, n: ch[2] + 12, d: 4, v: 0.08, i: 'strings' });
  }
  return { bpm: 72, length: bars * 4, events: ev };
}

/** Sáng tác riêng: điệu valse 3/4 */
function waltz(): Track {
  const prog = [['F2', 'A3', 'C4', 'F4'], ['C2', 'G3', 'C4', 'E4'], ['D2', 'A3', 'D4', 'F4'], ['Bb1', 'F3', 'Bb3', 'D4'],
    ['F2', 'A3', 'C4', 'F4'], ['C2', 'G3', 'Bb3', 'E4'], ['Bb1', 'F3', 'Bb3', 'D4'], ['C2', 'G3', 'C4', 'E4']].map((c) => c.map(midi));
  const r = rng(2026);
  const ev: Note[] = [];
  const bars = 16;
  for (let b = 0; b < bars; b++) {
    const ch = prog[b % 8];
    const t0 = b * 3;
    ev.push({ t: t0, n: ch[0] + 12, d: 1, v: 0.5, i: 'bass' });
    for (const k of [1, 2]) [1, 2, 3].forEach((idx) => ev.push({ t: t0 + k, n: ch[idx], d: 0.6, v: 0.12, i: 'pluck' }));
    const top = ch.slice(1).map((n) => n + 12);
    if (b % 2 === 0) {
      ev.push({ t: t0, n: top[Math.floor(r() * 3)] + 12, d: 2, v: 0.4, i: 'bell' });
      ev.push({ t: t0 + 2, n: top[Math.floor(r() * 3)] + 12, d: 1, v: 0.35, i: 'bell' });
    } else {
      ev.push({ t: t0, n: top[2] + 12, d: 3, v: 0.38, i: 'bell' });
    }
    if (b >= 8) ev.push({ t: t0, n: top[0], d: 3, v: 0.08, i: 'strings' });
  }
  return { bpm: 150, length: bars * 3, events: ev };
}

/** Sáng tác riêng: rộn ràng G–D–Em–C */
function festive(): Track {
  const prog = [['G2', 'B3', 'D4', 'G4'], ['D2', 'A3', 'D4', 'F#4'], ['E2', 'G3', 'B3', 'E4'], ['C2', 'G3', 'C4', 'E4']].map((c) => c.map(midi));
  const r = rng(99);
  const ev: Note[] = [];
  const bars = 16;
  for (let b = 0; b < bars; b++) {
    const ch = prog[b % 4];
    const t0 = b * 4;
    for (const k of [0, 2]) ev.push({ t: t0 + k, n: 0, d: 0.3, v: 0.5, i: 'kick' });
    for (let k = 0; k < 8; k++) ev.push({ t: t0 + k * 0.5, n: 0, d: 0.1, v: k % 2 ? 0.25 : 0.12, i: 'hat' });
    for (const k of [0, 1.5, 2, 3.5]) ev.push({ t: t0 + k, n: ch[0] + 12 * (k === 1.5 || k === 3.5 ? 1 : 0), d: 0.45, v: 0.5, i: 'bass' });
    for (const k of [0.5, 1.5, 2.5, 3.5]) ch.slice(1).forEach((n) => ev.push({ t: t0 + k, n, d: 0.25, v: 0.11, i: 'pluck' }));
    if (b >= 4) {
      for (let k = 0; k < 8; k++) {
        if (r() < 0.35) continue;
        const n = ch[1 + Math.floor(r() * 3)] + 12;
        ev.push({ t: t0 + k * 0.5, n, d: 0.45, v: 0.32, i: 'bell' });
      }
    }
  }
  return { bpm: 116, length: bars * 4, events: ev };
}

/** Sáng tác riêng: EDM 126 BPM cho chế độ Bar — Am F C G */
function club(): Track {
  const prog = [['A2', 'C4', 'E4', 'A4'], ['F2', 'A3', 'C4', 'F4'], ['C3', 'E4', 'G4', 'C5'], ['G2', 'B3', 'D4', 'G4']].map((c) => c.map(midi));
  const ev: Note[] = [];
  const bars = 16;
  for (let b = 0; b < bars; b++) {
    const ch = prog[Math.floor(b / 2) % 4];
    const t0 = b * 4;
    const build = b % 8 === 7; // ô nhịp dồn trước khi "drop"
    for (let k = 0; k < 4; k++) if (!build || k < 2) ev.push({ t: t0 + k, n: 0, d: 0.3, v: 0.95, i: 'kick' });
    if (b >= 2 && !build) for (const k of [1, 3]) ev.push({ t: t0 + k, n: 0, d: 0.2, v: 0.5, i: 'clap' });
    if (build) for (let k = 0; k < 8; k++) ev.push({ t: t0 + 2 + k * 0.25, n: 0, d: 0.1, v: 0.18 + k * 0.05, i: 'clap' });
    for (let k = 0; k < 4; k++) ev.push({ t: t0 + k + 0.5, n: 0, d: 0.15, v: 0.32, i: 'hat' });
    if (b >= 4) for (let k = 0; k < 16; k++) if (k % 2 === 1) ev.push({ t: t0 + k * 0.25, n: 0, d: 0.05, v: 0.1, i: 'hat' });
    if (b >= 1) for (let k = 0; k < 4; k++) ev.push({ t: t0 + k + 0.5, n: ch[0], d: 0.4, v: 0.5, i: 'saw' });
    if (b >= 4 && !build) for (const k of [0, 0.75, 1.5, 2.5, 3.25]) ch.slice(1).forEach((n) => ev.push({ t: t0 + k, n, d: 0.35, v: 0.13, i: 'supersaw' }));
    if (b >= 8) {
      const arp = [1, 2, 3, 2, 1, 3, 2, 3];
      for (let k = 0; k < 16; k++) ev.push({ t: t0 + k * 0.25, n: ch[arp[k % 8]] + 12, d: 0.2, v: 0.2, i: 'pluck' });
    }
  }
  return { bpm: 126, length: bars * 4, events: ev };
}

export const PARTY_BPM = 126;

const TRACK_BUILDERS: Record<string, () => Track> = { canon, bridal, romance, waltz, festive, club };

// ───────── Bộ máy phát ─────────

class MusicEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private wet!: GainNode;
  private noise!: AudioBuffer;
  private track: Track | null = null;
  private trackId: string | null = null;
  private startAt = 0;
  private cursor = 0;
  private loop = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private audio: HTMLAudioElement | null = null;
  private url = '';
  private volume = 0.6;
  private unlocked = false;
  private listeners = new Set<() => void>();

  constructor() {
    const unlock = () => {
      this.unlocked = true;
      void this.ctx?.resume();
      if (this.audio && this.audio.paused && this.trackId === 'url') void this.audio.play().catch(() => {});
      this.emit();
    };
    window.addEventListener('pointerdown', unlock, { once: false, capture: true });
    window.addEventListener('keydown', unlock, { once: false, capture: true });
  }

  /** Trình duyệt chỉ cho phát âm thanh sau khi người dùng chạm/bấm */
  get blocked() {
    return !this.unlocked && !!this.trackId && this.trackId !== 'off';
  }

  get playing() {
    return this.trackId;
  }

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private ensure() {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume * 0.55;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);
    // tiếng vang (reverb) từ xung nhiễu tắt dần
    const len = ctx.sampleRate * 2.4;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.32;
    this.wet.connect(verb).connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return ctx;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx) this.master.gain.setTargetAtTime(this.volume * 0.55, this.ctx.currentTime, 0.05);
    if (this.audio) this.audio.volume = this.volume;
  }

  play(id: string, url = '') {
    if (id === this.trackId && (id !== 'url' || url === this.url)) return;
    this.stop();
    this.trackId = id;
    if (id === 'off') return this.emit();
    if (id === 'url') {
      if (!url) return this.emit();
      this.url = url;
      const a = new Audio(url);
      a.loop = true;
      a.volume = this.volume;
      a.crossOrigin = 'anonymous';
      this.audio = a;
      void a.play().catch(() => { /* chờ người dùng chạm vào trang */ });
      return this.emit();
    }
    const build = TRACK_BUILDERS[id];
    if (!build) return this.emit();
    const ctx = this.ensure();
    this.track = build();
    this.track.events.sort((a, b) => a.t - b.t);
    this.startAt = ctx.currentTime + 0.15;
    this.cursor = 0;
    this.loop = 0;
    this.timer = setInterval(() => this.tick(), 90);
    this.tick();
    this.emit();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
    this.trackId = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    if (this.ctx) {
      // tắt nhanh các nốt đang ngân
      const g = this.master.gain;
      const now = this.ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + 0.15);
      g.linearRampToValueAtTime(this.volume * 0.55, now + 0.4);
    }
  }

  private tick() {
    const ctx = this.ctx, tr = this.track;
    if (!ctx || !tr) return;
    const spb = 60 / tr.bpm;
    const horizon = ctx.currentTime + 0.5;
    for (;;) {
      if (this.cursor >= tr.events.length) {
        this.cursor = 0;
        this.loop++;
      }
      const e = tr.events[this.cursor];
      const at = this.startAt + (this.loop * tr.length + e.t) * spb;
      if (at > horizon) break;
      if (at > ctx.currentTime - 0.05) this.voice(e, at, e.d * spb);
      this.cursor++;
    }
  }

  private voice(e: Note, at: number, dur: number) {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.connect(this.master);
    out.connect(this.wet);
    const f = freq(e.n);
    const env = (g: GainNode, a: number, peak: number, decayTo: number, decay: number, release: number, end: number) => {
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + a);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, decayTo), at + a + decay);
      g.gain.setValueAtTime(Math.max(0.0001, decayTo), end);
      g.gain.exponentialRampToValueAtTime(0.0001, end + release);
    };
    const osc = (type: OscillatorType, fr: number, detune = 0) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = fr;
      o.detune.value = detune;
      return o;
    };
    const v = e.v;
    switch (e.i) {
      case 'piano': {
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(4200, at);
        lp.frequency.exponentialRampToValueAtTime(1400, at + 0.6);
        const o1 = osc('triangle', f), o2 = osc('sine', f * 2), o3 = osc('sine', f * 3);
        const g2 = ctx.createGain(); g2.gain.value = 0.35;
        const g3 = ctx.createGain(); g3.gain.value = 0.12;
        o1.connect(g); o2.connect(g2).connect(g); o3.connect(g3).connect(g);
        g.connect(lp).connect(out);
        env(g, 0.006, v, v * 0.25, 0.5, 0.5, at + Math.max(dur, 0.3));
        for (const o of [o1, o2, o3]) { o.start(at); o.stop(at + dur + 1); }
        return;
      }
      case 'strings': {
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1600;
        const os = [osc('sawtooth', f, -7), osc('sawtooth', f, 7), osc('triangle', f * 2, 0)];
        os.forEach((o) => o.connect(g));
        g.connect(lp).connect(out);
        env(g, Math.min(0.45, dur * 0.4), v, v * 0.85, 0.2, 0.7, at + dur);
        os.forEach((o) => { o.start(at); o.stop(at + dur + 1); });
        return;
      }
      case 'bass': {
        const g = ctx.createGain();
        const o1 = osc('sine', f), o2 = osc('triangle', f);
        const g2 = ctx.createGain(); g2.gain.value = 0.3;
        o1.connect(g); o2.connect(g2).connect(g);
        g.connect(this.master);
        env(g, 0.01, v, v * 0.6, 0.3, 0.25, at + dur * 0.9);
        for (const o of [o1, o2]) { o.start(at); o.stop(at + dur + 0.5); }
        return;
      }
      case 'bell': {
        const g = ctx.createGain();
        const o1 = osc('sine', f), o2 = osc('sine', f * 2.76), o3 = osc('sine', f * 5.4);
        const g2 = ctx.createGain(); g2.gain.value = 0.25;
        const g3 = ctx.createGain(); g3.gain.value = 0.08;
        o1.connect(g); o2.connect(g2).connect(g); o3.connect(g3).connect(g);
        g.connect(out);
        env(g, 0.004, v, v * 0.08, Math.max(0.6, dur), 0.4, at + Math.max(dur, 0.6));
        for (const o of [o1, o2, o3]) { o.start(at); o.stop(at + dur + 1.2); }
        return;
      }
      case 'pluck': {
        const g = ctx.createGain();
        const o = osc('triangle', f);
        o.connect(g).connect(out);
        env(g, 0.004, v, v * 0.05, 0.22, 0.1, at + 0.25);
        o.start(at);
        o.stop(at + 0.5);
        return;
      }
      case 'kick': {
        const g = ctx.createGain();
        const o = osc('sine', 120);
        o.frequency.setValueAtTime(130, at);
        o.frequency.exponentialRampToValueAtTime(42, at + 0.15);
        o.connect(g).connect(this.master);
        env(g, 0.003, v, 0.0001, 0.2, 0.05, at + 0.22);
        o.start(at);
        o.stop(at + 0.35);
        return;
      }
      case 'clap': {
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1400;
        bp.Q.value = 0.8;
        const g = ctx.createGain();
        src.connect(bp).connect(g);
        g.connect(this.master);
        g.connect(this.wet);
        env(g, 0.002, v * 0.9, 0.0001, 0.16, 0.03, at + 0.18);
        src.start(at);
        src.stop(at + 0.3);
        return;
      }
      case 'saw': {
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 6;
        lp.frequency.setValueAtTime(260, at);
        lp.frequency.exponentialRampToValueAtTime(1500, at + 0.04);
        lp.frequency.exponentialRampToValueAtTime(320, at + 0.3);
        const o1 = osc('sawtooth', f), o2 = osc('square', f / 2);
        const g2 = ctx.createGain(); g2.gain.value = 0.4;
        o1.connect(g); o2.connect(g2).connect(g);
        g.connect(lp).connect(this.master);
        env(g, 0.005, v, v * 0.3, 0.2, 0.08, at + dur);
        for (const o of [o1, o2]) { o.start(at); o.stop(at + dur + 0.3); }
        return;
      }
      case 'supersaw': {
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 3200;
        const os = [-14, -6, 0, 6, 14].map((dt) => osc('sawtooth', f, dt));
        os.forEach((o) => o.connect(g));
        g.connect(lp).connect(out);
        env(g, 0.006, v, v * 0.2, 0.25, 0.15, at + dur);
        os.forEach((o) => { o.start(at); o.stop(at + dur + 0.5); });
        return;
      }
      case 'hat': {
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 7000;
        const g = ctx.createGain();
        src.connect(hp).connect(g).connect(this.master);
        env(g, 0.002, v * 0.5, 0.0001, 0.05, 0.02, at + 0.06);
        src.start(at);
        src.stop(at + 0.12);
        return;
      }
    }
  }
}

export const music = new MusicEngine();
