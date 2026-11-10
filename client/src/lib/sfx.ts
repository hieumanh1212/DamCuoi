// Âm thanh nhỏ tạo bằng WebAudio (không cần file âm thanh)
const KEY = 'dam-cuoi:muted';
let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
})();

export const isMuted = () => muted;
export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    /* bỏ qua */
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', delay = 0, vol = 0.07) {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {
    /* không hỗ trợ */
  }
}

const melody = (notes: [number, number][], type: OscillatorType = 'triangle') => {
  let at = 0;
  for (const [f, d] of notes) {
    tone(f, d * 1.4, type, at);
    at += d;
  }
};

export const sfx = {
  pop: () => tone(880, 0.08, 'sine', 0, 0.05),
  chat: () => tone(660, 0.06, 'sine', 0, 0.03),
  wish: () => melody([[784, 0.12], [988, 0.12], [1175, 0.25]]),
  // giai điệu chuông cưới ngắn (tự sáng tác)
  chime: () => melody([[523, 0.18], [659, 0.18], [784, 0.18], [1047, 0.4]]),
  confetti: () => {
    for (let i = 0; i < 6; i++) tone(600 + Math.random() * 900, 0.08, 'square', i * 0.05, 0.02);
  },
  toast: () => { tone(1568, 0.15, 'sine'); tone(2093, 0.25, 'sine', 0.08); },
  kiss: () => melody([[659, 0.15], [880, 0.3]], 'sine'),
};
