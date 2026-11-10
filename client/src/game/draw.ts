// Vẽ mọi thứ bằng canvas (không dùng ảnh): sàn, tường, sân khấu, đồ trang trí, nhân vật chibi, bong bóng chat
import type { Role } from '../../../shared/look';
import { ACCENTS, type WeddingInfo } from '../../../shared/protocol';
import { DOOR, HALL_H, HALL_W, ITEM_COLORS, STAGE, TILE, itemSize, ITEM_DEFS, type Item } from '../../../shared/world';

export type Ctx = CanvasRenderingContext2D;
type Fill = string | CanvasGradient;
const T = TILE;
export const UI_FONT = '"Be Vietnam Pro", "Segoe UI", system-ui, sans-serif';
export const SCRIPT_FONT = '"Dancing Script", "Segoe Script", cursive';
const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

// ───────── màu sắc ─────────
function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Làm sáng (amt > 0) hoặc tối (amt < 0) một màu hex */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = parseHex(hex);
  const f = (c: number) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
export function hexA(hex: string, a: number) {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${a})`;
}
export const accentOf = (info: WeddingInfo) => ACCENTS[info.accent] ?? ACCENTS[0];
export function itemColor(it: Pick<Item, 'color'>, info: WeddingInfo) {
  const c = it.color ? ITEM_COLORS[it.color] : undefined;
  return c && c !== 'accent' ? c : accentOf(info);
}

// ───────── hình học ─────────
export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}
export const fillRR = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: Fill, stroke?: string) => {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
};
export const circle = (ctx: Ctx, x: number, y: number, r: number, fill: Fill) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
};
export const ellipse = (ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: Fill, rot = 0) => {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
};
/** Bóng mềm dưới vật thể */
export function softShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.22) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(40,20,30,${a})`);
  g.addColorStop(1, 'rgba(40,20,30,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
/** Hình cầu có khối (gradient tròn sáng góc trên-trái) */
export function ball(ctx: Ctx, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, shade(color, 0.45));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.25));
  circle(ctx, x, y, r, g);
}
export const vgrad = (ctx: Ctx, y0: number, y1: number, c: string, light = 0.18, dark = -0.18) => {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, shade(c, light));
  g.addColorStop(1, shade(c, dark));
  return g;
};
export function heart(ctx: Ctx, x: number, y: number, s: number, fill: Fill) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.45, y - s, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s, x + s, y - s * 0.4, x, y + s * 0.35);
  ctx.fillStyle = fill;
  ctx.fill();
}
export function flower(ctx: Ctx, x: number, y: number, r: number, petal: string, center = '#ffd54f') {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ball(ctx, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.55, petal);
  }
  circle(ctx, x, y, r * 0.34, center);
}
function star(ctx: Ctx, x: number, y: number, R2: number, r: number, fill: Fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R2;
    if (i) ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    else ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
function bounceHint(ctx: Ctx, x: number, y: number, t: number, icon: string) {
  const dy = Math.sin(t / 300) * 2.5;
  ctx.font = `13px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(icon, x, y + dy);
  ctx.textAlign = 'start';
}
export function formatDate(d: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

// ───────── Sàn, tường, sân khấu (vẽ sẵn vào bộ đệm) ─────────
let hallCache: { key: string; canvas: HTMLCanvasElement } | null = null;

export function drawHall(ctx: Ctx, info: WeddingInfo) {
  const key = `${info.floor}|${info.accent}`;
  if (!hallCache || hallCache.key !== key) {
    const c = document.createElement('canvas');
    c.width = HALL_W * T * 2;
    c.height = HALL_H * T * 2;
    const g = c.getContext('2d')!;
    g.scale(2, 2);
    paintHall(g, info);
    hallCache = { key, canvas: c };
  }
  ctx.drawImage(hallCache.canvas, 0, 0, HALL_W * T, HALL_H * T);
}

function paintHall(ctx: Ctx, info: WeddingInfo) {
  const W = HALL_W * T, H = HALL_H * T;
  const accent = accentOf(info);
  const rand = mulberry(7);

  switch (info.floor) {
    case 'wood': {
      ctx.fillStyle = '#d9a86e';
      ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 16) {
        const off = (y / 16) % 2 ? 48 : 0;
        for (let x = -48 + off; x < W; x += 96) {
          ctx.fillStyle = `rgba(${120 + rand() * 40},${70 + rand() * 30},30,${0.08 + rand() * 0.1})`;
          ctx.fillRect(x, y, 96, 16);
          ctx.fillStyle = 'rgba(90,50,20,0.25)';
          ctx.fillRect(x, y, 1, 16);
        }
        ctx.fillStyle = 'rgba(90,50,20,0.22)';
        ctx.fillRect(0, y, W, 1);
      }
      break;
    }
    case 'pink':
      ctx.fillStyle = '#fde4ec';
      ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < HALL_H; y++) for (let x = 0; x < HALL_W; x++) {
        if ((x + y) % 2) heart(ctx, x * T + 16, y * T + 17, 3.2, '#f9c5d5');
      }
      break;
    case 'red':
      ctx.fillStyle = '#a3171f';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,214,102,0.25)';
      ctx.lineWidth = 1;
      for (let y = 0; y < HALL_H; y++) for (let x = 0; x < HALL_W; x++) {
        ctx.beginPath();
        ctx.moveTo(x * T + 16, y * T + 5); ctx.lineTo(x * T + 27, y * T + 16); ctx.lineTo(x * T + 16, y * T + 27); ctx.lineTo(x * T + 5, y * T + 16);
        ctx.closePath();
        ctx.stroke();
      }
      break;
    case 'garden':
      for (let x = 0; x < HALL_W; x++) {
        ctx.fillStyle = x % 2 ? '#8cc152' : '#7fb646';
        ctx.fillRect(x * T, 0, T, H);
      }
      for (let i = 0; i < 260; i++) {
        const x = rand() * W, y = rand() * H;
        if (i % 9 === 0) flower(ctx, x, y, 2.5, ['#ffffff', '#fff59d', '#f8bbd0'][i % 3]);
        else { ctx.fillStyle = 'rgba(60,110,30,0.35)'; ctx.fillRect(x, y, 1, 3); }
      }
      break;
    case 'gold': {
      ctx.fillStyle = '#f4e6bd';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(176,137,40,0.35)';
      for (let y = 0; y < HALL_H; y++) for (let x = 0; x < HALL_W; x++) {
        ctx.strokeRect(x * T + 0.5, y * T + 0.5, T, T);
        circle(ctx, x * T, y * T, 2, 'rgba(176,137,40,0.45)');
      }
      break;
    }
    case 'navy': {
      const g = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7);
      g.addColorStop(0, '#2c3a6b');
      g.addColorStop(1, '#141c3a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 180; i++) circle(ctx, rand() * W, rand() * H, rand() * 1.4 + 0.3, `rgba(255,255,230,${0.3 + rand() * 0.6})`);
      break;
    }
    case 'lavender':
      ctx.fillStyle = '#ebe1f7';
      ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < HALL_H; y++) for (let x = 0; x < HALL_W; x++) {
        if ((x * 3 + y) % 4 === 0) {
          for (let k = 0; k < 4; k++) ellipse(ctx, x * T + 12 + k * 1.5, y * T + 20 - k * 3, 1.4, 2, '#b39ddb');
        }
      }
      break;
    case 'beach': {
      ctx.fillStyle = '#f1dcae';
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 1400; i++) {
        ctx.fillStyle = rand() > 0.5 ? 'rgba(190,150,90,0.25)' : 'rgba(255,255,255,0.35)';
        ctx.fillRect(rand() * W, rand() * H, 1.2, 1.2);
      }
      for (let i = 0; i < 14; i++) {
        const x = rand() * W, y = rand() * H;
        ellipse(ctx, x, y, 3, 2.2, '#fff3e0', rand());
      }
      break;
    }
    case 'black':
      for (let y = 0; y < HALL_H; y++) for (let x = 0; x < HALL_W; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#232328' : '#1b1b1f';
        ctx.fillRect(x * T, y * T, T, T);
      }
      ctx.strokeStyle = 'rgba(212,175,55,0.22)';
      for (let i = 0; i < 50; i++) {
        ctx.beginPath();
        const x = rand() * W, y = rand() * H;
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + rand() * 50, y + rand() * 30, x + rand() * 70, y + rand() * 50);
        ctx.stroke();
      }
      break;
    case 'sky':
      ctx.fillStyle = '#dcecfb';
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) {
        const x = rand() * W, y = rand() * H;
        for (let k = 0; k < 3; k++) circle(ctx, x + k * 7, y + (k === 1 ? -3 : 0), 5, 'rgba(255,255,255,0.55)');
      }
      break;
    case 'mint':
      ctx.fillStyle = '#def5ec';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(102,187,160,0.25)';
      ctx.lineWidth = 6;
      for (let i = -H; i < W; i += 28) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
      ctx.lineWidth = 1;
      break;
    case 'checker':
      for (let y = 0; y < HALL_H; y++) for (let x = 0; x < HALL_W; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#f6f3ee' : '#3a3a40';
        ctx.fillRect(x * T, y * T, T, T);
      }
      break;
    case 'rosegold': {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#f8e1d8');
      g.addColorStop(1, '#e9c2b2');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 220; i++) circle(ctx, rand() * W, rand() * H, rand() * 1.3 + 0.3, `rgba(255,255,255,${0.4 + rand() * 0.5})`);
      break;
    }
    default:
      for (let y = 0; y < HALL_H; y++) for (let x = 0; x < HALL_W; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#f7f4ef' : '#ece6dd';
        ctx.fillRect(x * T, y * T, T, T);
      }
      ctx.strokeStyle = 'rgba(160,150,140,0.12)';
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        const x = rand() * W, y = rand() * H;
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + rand() * 40, y + rand() * 20, x + rand() * 60, y + rand() * 40);
        ctx.stroke();
      }
  }

  // Sân khấu: bục gỗ trắng có viền nổi
  const sx = STAGE.x0 * T, sy = STAGE.y0 * T, sw = (STAGE.x1 - STAGE.x0 + 1) * T, sh = (STAGE.y1 - STAGE.y0 + 1) * T;
  softShadow(ctx, sx + sw / 2, sy + sh + 4, sw / 2 + 10, 14, 0.25);
  fillRR(ctx, sx, sy + 6, sw, sh, 10, shade(accent, -0.35));
  fillRR(ctx, sx, sy, sw, sh, 10, vgrad(ctx, sy, sy + sh, '#fffaf2', 0.4, -0.05));
  ctx.fillStyle = 'rgba(160,120,80,0.06)';
  for (let x = sx + 20; x < sx + sw; x += 26) ctx.fillRect(x, sy + 2, 1, sh - 4);
  fillRR(ctx, sx + 6, sy + sh - 9, sw - 12, 4, 2, hexA(accent, 0.75));
  // bậc thang
  for (let i = 0; i < 2; i++) fillRR(ctx, 16 * T - i * 4, sy + sh + i * 5, 4 * T + i * 8, 7, 3, i ? '#e9dcc6' : '#f4eadb');

  // Tường: ốp tường + rèm vải
  const wallG = ctx.createLinearGradient(0, 0, 0, T);
  wallG.addColorStop(0, '#fff8ee');
  wallG.addColorStop(1, '#f3e2cc');
  ctx.fillStyle = wallG;
  ctx.fillRect(0, 0, W, T);
  ctx.fillStyle = '#f6e9d8';
  ctx.fillRect(0, 0, T * 0.6, H);
  ctx.fillRect(W - T * 0.6, 0, T * 0.6, H);
  ctx.fillRect(0, H - T * 0.6, DOOR.x0 * T, T * 0.6);
  ctx.fillRect((DOOR.x1 + 1) * T, H - T * 0.6, W - (DOOR.x1 + 1) * T, T * 0.6);
  ctx.fillStyle = 'rgba(120,80,40,0.12)';
  ctx.fillRect(0, T - 2, W, 4);
  ctx.fillRect(T * 0.6, 0, 2, H);
  ctx.fillRect(W - T * 0.6 - 2, 0, 2, H);
  // rèm vải rủ
  for (let x = 0; x < W; x += 72) {
    const g = ctx.createLinearGradient(x, 0, x + 72, 0);
    g.addColorStop(0, hexA(accent, 0.15));
    g.addColorStop(0.5, hexA(accent, 0.45));
    g.addColorStop(1, hexA(accent, 0.15));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 72, 0);
    ctx.quadraticCurveTo(x + 36, 30, x, 0);
    ctx.fill();
    flower(ctx, x, 5, 4.5, '#ffffff', accent);
  }
  // thảm chùi chân ở cửa
  fillRR(ctx, DOOR.x0 * T + 6, H - 10, (DOOR.x1 - DOOR.x0 + 1) * T - 12, 8, 3, '#8d2a2a');
}

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────── Đồ trang trí ─────────
export function itemDepth(it: Item) {
  const def = ITEM_DEFS[it.type];
  if (def.layer === 'floor') return -1;
  if (def.interact === 'sit') return it.y + 0.3; // người ngồi được vẽ đè lên ghế
  return it.y + itemSize(it).h;
}

/** Hướng lưng ghế/sofa: rot 0 nhìn xuống → lưng ở trên */
const BACK = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export function drawItem(ctx: Ctx, it: Item, info: WeddingInfo, t: number) {
  const { w, h } = itemSize(it);
  const x = it.x * T, y = it.y * T, pw = w * T, ph = h * T;
  const cx = x + pw / 2, cy = y + ph / 2;
  const accent = accentOf(info);
  const col = itemColor(it, info);

  switch (it.type) {
    // ── sàn & thảm
    case 'carpet': {
      ctx.fillStyle = it.color ? col : '#c62828';
      ctx.fillRect(x, y, pw, ph);
      ctx.fillStyle = 'rgba(255,215,0,0.4)';
      ctx.fillRect(x, y, 2, ph);
      ctx.fillRect(x + pw - 2, y, 2, ph);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(x, y + ph - 1, pw, 1);
      return;
    }
    case 'petals':
      for (let i = 0; i < 7; i++) {
        const px = x + 4 + ((i * 37 + it.id * 13) % 24), py = y + 4 + ((i * 53 + it.id * 7) % 24);
        ellipse(ctx, px, py, 3.2, 1.9, i % 2 ? shade(col, 0.35) : '#ffffff', i);
      }
      return;
    case 'rug': {
      ellipse(ctx, cx, cy, pw / 2 - 2, ph / 2 - 2, shade(col, -0.1));
      ellipse(ctx, cx, cy, pw / 2 - 6, ph / 2 - 6, shade(col, 0.25));
      ctx.strokeStyle = hexA('#ffffff', 0.6);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, pw / 2 - 10, ph / 2 - 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      flower(ctx, cx, cy, 7, shade(col, -0.15));
      return;
    }
    case 'dancefloor': {
      const n = 4, s = pw / n;
      const colors = ['#ff4f8b', '#ffd54f', '#4fc3f7', '#b388ff', '#69f0ae'];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const k = Math.floor(t / 400 + i * 1.7 + j * 2.3) % colors.length;
        ctx.fillStyle = colors[k];
        ctx.globalAlpha = 0.55 + 0.35 * Math.abs(Math.sin(t / 500 + i + j));
        ctx.fillRect(x + i * s + 1, y + j * s + 1, s - 2, s - 2);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(x + 0.5, y + 0.5, pw - 1, ph - 1);
      return;
    }

    // ── bàn ghế
    case 'table_round': {
      softShadow(ctx, cx, cy + 10, 34, 14, 0.28);
      ellipse(ctx, cx, cy + 4, 29, 27, shade(col, -0.25)); // khăn trùm rủ xuống
      const g = ctx.createRadialGradient(cx - 9, cy - 10, 4, cx, cy, 30);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#efe9e1');
      circle(ctx, cx, cy, 28, g);
      circle(ctx, cx, cy, 20, hexA(col, 0.18));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.5;
        const px = cx + Math.cos(a) * 19, py = cy + Math.sin(a) * 19;
        circle(ctx, px, py, 4.6, '#d9d9d9');
        circle(ctx, px, py, 3.8, '#ffffff');
        circle(ctx, px, py, 1.8, hexA(col, 0.35));
      }
      ellipse(ctx, cx, cy + 3, 6, 2.5, 'rgba(0,0,0,0.12)');
      flower(ctx, cx - 3, cy - 1, 4.5, col);
      flower(ctx, cx + 4, cy - 2, 4, '#ffffff');
      flower(ctx, cx + 0.5, cy - 6, 4, shade(col, 0.4));
      return;
    }
    case 'table_long':
      softShadow(ctx, cx, cy + 8, pw / 2 + 4, 10, 0.25);
      fillRR(ctx, x + 2, y + 6, pw - 4, ph - 6, 5, shade(col, -0.25));
      fillRR(ctx, x + 2, y + 2, pw - 4, ph - 7, 5, vgrad(ctx, y, y + ph, '#ffffff', 0, -0.06));
      ctx.fillStyle = hexA(col, 0.35);
      if (w > h) ctx.fillRect(x + 2, cy - 4, pw - 4, 6);
      else ctx.fillRect(cx - 3, y + 2, 6, ph - 7);
      flower(ctx, cx, cy - 2, 5, col);
      return;
    case 'chair': {
      const [bx, by] = BACK[it.rot] ?? BACK[0];
      softShadow(ctx, x + 16, y + 26, 11, 4, 0.2);
      fillRR(ctx, x + 5, y + 6, 22, 21, 5, vgrad(ctx, y + 6, y + 27, '#e2b54a', 0.2, -0.15));
      fillRR(ctx, x + 7.5, y + 8, 17, 16, 4, vgrad(ctx, y + 8, y + 24, col, 0.25, -0.1));
      ctx.fillStyle = '#b8892a';
      if (by === -1) fillRR(ctx, x + 5, y + 1, 22, 6, 3, vgrad(ctx, y, y + 7, '#e2b54a', 0.3, -0.2));
      if (by === 1) fillRR(ctx, x + 5, y + 25, 22, 6, 3, vgrad(ctx, y + 25, y + 31, '#e2b54a', 0.3, -0.2));
      if (bx === -1) fillRR(ctx, x + 1, y + 6, 6, 21, 3, '#c99a33');
      if (bx === 1) fillRR(ctx, x + 25, y + 6, 6, 21, 3, '#c99a33');
      return;
    }
    case 'sofa': {
      const [bx, by] = BACK[it.rot] ?? BACK[0];
      softShadow(ctx, cx, y + ph - 4, pw / 2, 6, 0.25);
      fillRR(ctx, x + 3, y + 4, pw - 6, ph - 6, 8, vgrad(ctx, y, y + ph, col, 0.15, -0.2));
      // tựa lưng
      const back = (bx2: number, by2: number, bw: number, bh: number) => fillRR(ctx, bx2, by2, bw, bh, 6, vgrad(ctx, by2, by2 + bh, col, 0.3, -0.05));
      if (by === -1) back(x + 3, y, pw - 6, 10);
      if (by === 1) back(x + 3, y + ph - 11, pw - 6, 10);
      if (bx === -1) back(x, y + 3, 10, ph - 6);
      if (bx === 1) back(x + pw - 11, y + 3, 10, ph - 6);
      // đệm ngồi
      const n = w > h ? w : h;
      for (let i = 0; i < n; i++) {
        const ox = w > h ? x + 8 + i * T : x + 8, oy = w > h ? y + 10 : y + 8 + i * T;
        fillRR(ctx, ox + (bx === 1 ? -4 : 0), oy + (by === 1 ? -4 : 0), T - 14, T - 16, 5, shade(col, 0.35));
      }
      ball(ctx, x + 10, cy, 4, '#ffffff');
      return;
    }
    case 'buffet': {
      softShadow(ctx, cx, cy + 8, pw / 2 + 2, 10, 0.25);
      fillRR(ctx, x + 1, y + 6, pw - 2, ph - 6, 4, shade(col, -0.2));
      fillRR(ctx, x + 1, y + 1, pw - 2, ph - 7, 4, '#fbfaf7', '#e5ded4');
      const n = Math.max(w, h);
      for (let i = 0; i < n; i++) {
        const dx = w > h ? x + 16 + i * T : cx, dy = w > h ? cy - 3 : y + 14 + i * T;
        if (i % 2 === 0) {
          ellipse(ctx, dx, dy + 1, 11, 7, '#9e9e9e');
          const g = ctx.createRadialGradient(dx - 4, dy - 4, 1, dx, dy, 11);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(1, '#b0b0b0');
          ellipse(ctx, dx, dy - 1, 10, 6, g);
          circle(ctx, dx, dy - 4, 1.8, '#757575');
        } else {
          ellipse(ctx, dx, dy, 10, 6.5, '#ffffff');
          ['#e53935', '#ffb300', '#7cb342', '#8e24aa', '#ff7043'].forEach((c, k) => ball(ctx, dx - 6 + k * 3, dy - 1 + (k % 2) * 2, 2.6, c));
        }
      }
      return;
    }
    case 'drinks':
      softShadow(ctx, cx, y + 27, 12, 4);
      fillRR(ctx, x + 4, y + 12, 24, 15, 4, vgrad(ctx, y + 12, y + 27, '#8d6e63'));
      fillRR(ctx, x + 3, y + 10, 26, 5, 2, '#a1887f');
      fillRR(ctx, x + 6, y - 2, 9, 13, 3, 'rgba(255,183,77,0.75)', 'rgba(255,255,255,0.8)');
      ['#ff7043', '#f06292', '#4fc3f7'].forEach((c, k) => {
        fillRR(ctx, x + 17 + k * 3.5, y + 3 + (k % 2) * 2, 3, 7, 1, hexA(c, 0.85));
      });
      circle(ctx, x + 10, y + 3, 1.5, 'rgba(255,255,255,0.9)');
      return;

    // ── sân khấu
    case 'backdrop': {
      const top = y - T * 0.95, height = ph + T * 0.95;
      softShadow(ctx, cx, y + ph, pw / 2 + 6, 8, 0.25);
      fillRR(ctx, x - 2, top - 2, pw + 4, height + 4, 10, '#d4a73a');
      const g = ctx.createLinearGradient(0, top, 0, top + height);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, hexA(accent, 0.3));
      fillRR(ctx, x, top, pw, height, 9, g);
      for (let i = 0; i < 9; i++) flower(ctx, x + 6 + (i * (pw - 12)) / 8, top + 4, 5, i % 2 ? accent : '#ffffff');
      flower(ctx, x + 4, top + height - 6, 6, accent);
      flower(ctx, x + pw - 4, top + height - 6, 6, accent);
      ctx.textAlign = 'center';
      ctx.fillStyle = shade(accent, -0.2);
      ctx.font = `700 19px ${SCRIPT_FONT}`;
      ctx.fillText(`${info.groom} & ${info.bride}`, cx, top + 35);
      const date = formatDate(info.date);
      if (date) {
        ctx.font = `600 8.5px ${UI_FONT}`;
        ctx.fillStyle = '#8a6d3b';
        ctx.fillText(`— ${date} —`, cx, top + 47);
      }
      ctx.textAlign = 'start';
      return;
    }
    case 'arch': {
      const top = y - T * 1.7;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#f7f1e8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + ph - 3);
      ctx.lineTo(x + 6, top + 26);
      ctx.quadraticCurveTo(cx, top - 12, x + pw - 6, top + 26);
      ctx.lineTo(x + pw - 6, y + ph - 3);
      ctx.stroke();
      ctx.lineCap = 'butt';
      for (let i = 0; i <= 14; i++) {
        const k = i / 14;
        const px = x + 6 + k * (pw - 12);
        const py = top + 26 - Math.sin(k * Math.PI) * 30 + (k < 0.06 || k > 0.94 ? 10 : 0);
        flower(ctx, px, py, 5.5, i % 3 === 0 ? col : i % 3 === 1 ? '#ffffff' : shade(col, 0.5));
      }
      for (const px of [x + 6, x + pw - 6]) for (let py = top + 40; py < y + ph - 2; py += 11) flower(ctx, px, py, 4.5, (py / 11) % 2 ? col : '#ffffff');
      return;
    }
    case 'cake': {
      softShadow(ctx, cx, y + 27, 14, 5);
      const tier = (tw: number, ty: number, th: number) => {
        fillRR(ctx, cx - tw / 2, ty, tw, th, 3, vgrad(ctx, ty, ty + th, '#ffffff', 0, -0.08), '#e6e0e6');
        for (let i = 0; i < tw / 4.5; i++) circle(ctx, cx - tw / 2 + 3 + i * 4.5, ty + th - 2, 1.3, col);
      };
      tier(26, y + 15, 12);
      tier(19, y + 7, 9);
      tier(12, y, 8);
      heart(ctx, cx, y - 1, 5, col);
      return;
    }
    case 'champagne': {
      softShadow(ctx, cx, y + 28, 13, 4);
      [4, 3, 2, 1].forEach((n, r) => {
        for (let i = 0; i < n; i++) {
          const gx = cx - (n - 1) * 5.2 + i * 10.4, gy = y + 25 - r * 7;
          ctx.beginPath();
          ctx.moveTo(gx - 4.5, gy - 6); ctx.lineTo(gx + 4.5, gy - 6); ctx.lineTo(gx, gy + 1); ctx.closePath();
          const g = ctx.createLinearGradient(gx - 4, 0, gx + 4, 0);
          g.addColorStop(0, 'rgba(255,236,150,0.95)');
          g.addColorStop(1, 'rgba(230,185,80,0.95)');
          ctx.fillStyle = g;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.stroke();
        }
      });
      return;
    }
    case 'speaker':
      softShadow(ctx, cx, y + 28, 10, 3);
      fillRR(ctx, x + 7, y, 18, 28, 4, vgrad(ctx, y, y + 28, '#37474f', 0.1, -0.3));
      ball(ctx, cx, y + 8, 4, '#607d8b');
      ball(ctx, cx, y + 19, 6.5, '#546e7a');
      circle(ctx, cx, y + 19, 2.4, '#263238');
      return;
    case 'mc':
      softShadow(ctx, cx, y + 28, 11, 4);
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 10); ctx.lineTo(x + 26, y + 10); ctx.lineTo(x + 23, y + 28); ctx.lineTo(x + 9, y + 28);
      ctx.closePath();
      ctx.fillStyle = vgrad(ctx, y + 10, y + 28, col, 0.2, -0.25);
      ctx.fill();
      fillRR(ctx, x + 5, y + 7, 22, 5, 2, '#5d4037');
      heart(ctx, cx, y + 19, 4, '#ffffff');
      ctx.strokeStyle = '#424242';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx + 5, y + 7); ctx.lineTo(cx + 2, y - 2); ctx.stroke();
      ball(ctx, cx + 2, y - 4, 3, '#616161');
      return;
    case 'piano': {
      softShadow(ctx, cx, y + ph - 4, pw / 2, 10, 0.3);
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 18);
      ctx.lineTo(x + pw - 4, y + 18);
      ctx.lineTo(x + pw - 4, y + ph - 26);
      ctx.quadraticCurveTo(x + pw - 6, y + ph - 4, cx, y + ph - 6);
      ctx.quadraticCurveTo(x + 10, y + ph - 8, x + 4, y + ph - 30);
      ctx.closePath();
      const g = ctx.createLinearGradient(x, y, x + pw, y + ph);
      g.addColorStop(0, '#4a4a55');
      g.addColorStop(0.5, '#1c1c22');
      g.addColorStop(1, '#0d0d10');
      ctx.fillStyle = g;
      ctx.fill();
      fillRR(ctx, x + 4, y + 6, pw - 8, 13, 2, '#fafafa', '#bdbdbd');
      ctx.fillStyle = '#212121';
      for (let i = 0; i < 14; i++) if (i % 7 !== 2 && i % 7 !== 6) ctx.fillRect(x + 8 + i * 3.8, y + 6, 2, 8);
      ellipse(ctx, x + 22, y + 32, 10, 4, 'rgba(255,255,255,0.12)', -0.4);
      return;
    }
    case 'love': {
      softShadow(ctx, cx, y + 28, pw / 2, 4);
      fillRR(ctx, x + 2, y + 22, pw - 4, 6, 2, '#5d4037');
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 10 + Math.sin(t / 300) * 3;
      ctx.font = `800 21px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = shade(col, 0.55);
      ctx.fillText('LOVE', cx, y + 21);
      ctx.restore();
      ctx.textAlign = 'start';
      return;
    }

    // ── trang trí
    case 'flowers':
      softShadow(ctx, cx, y + 28, 10, 3);
      fillRR(ctx, cx - 7, y + 16, 14, 12, 4, vgrad(ctx, y + 16, y + 28, '#eceff1', 0.3, -0.15));
      flower(ctx, cx - 5.5, y + 11, 5, col);
      flower(ctx, cx + 5.5, y + 11, 5, '#ffffff');
      flower(ctx, cx, y + 4, 5, shade(col, 0.45));
      return;
    case 'pillar': {
      const top = y - T * 0.8;
      softShadow(ctx, cx, y + 28, 11, 4);
      fillRR(ctx, x + 6, y + 22, 20, 6, 2, '#e0d6c8');
      const g = ctx.createLinearGradient(x + 9, 0, x + 23, 0);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#ddd2c2');
      ctx.fillStyle = g;
      ctx.fillRect(x + 9, top + 10, 14, y + 22 - top - 10);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 12 + i * 4, top + 10, 1, y + 22 - top - 10);
      fillRR(ctx, x + 6, top + 6, 20, 6, 2, '#efe7da');
      for (let i = 0; i < 5; i++) flower(ctx, x + 6 + i * 5, top + 3 - (i % 2) * 3, 4.5, i % 2 ? '#ffffff' : col);
      return;
    }
    case 'plant':
      softShadow(ctx, cx, y + 28, 11, 3);
      fillRR(ctx, cx - 8, y + 18, 16, 10, 4, vgrad(ctx, y + 18, y + 28, '#a1887f'));
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.36;
        ellipse(ctx, cx + Math.cos(a) * 9, y + 13 + Math.sin(a) * 9, 7, 3.2, i % 2 ? '#43a047' : '#66bb6a', a);
      }
      return;
    case 'tree_lights': {
      softShadow(ctx, cx, y + 28, 12, 4);
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(cx - 2, y + 14, 4, 14);
      ball(ctx, cx, y + 4, 13, '#4caf50');
      ball(ctx, cx - 7, y + 10, 8, '#43a047');
      ball(ctx, cx + 7, y + 10, 8, '#388e3c');
      for (let i = 0; i < 12; i++) {
        const a = i * 2.4, r = 4 + (i % 4) * 2.5;
        const on = Math.sin(t / 250 + i * 1.7) > -0.3;
        circle(ctx, cx + Math.cos(a) * r, y + 6 + Math.sin(a) * r * 0.8, on ? 1.8 : 1.1, on ? '#fff59d' : '#c5e1a5');
      }
      return;
    }
    case 'balloons': {
      softShadow(ctx, cx, y + 28, 7, 2);
      const sway = Math.sin(t / 700 + it.id) * 2;
      const cols = [col, '#ffffff', shade(col, 0.5)];
      const pos = [[-7, -14], [7, -18], [0, -27]];
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 0.8;
      pos.forEach(([dx, dy]) => { ctx.beginPath(); ctx.moveTo(cx, y + 26); ctx.lineTo(cx + dx + sway, y + dy + 27); ctx.stroke(); });
      pos.forEach(([dx, dy], i) => {
        ctx.save();
        ctx.translate(cx + dx + sway, y + dy + 18);
        ctx.scale(1, 1.18);
        ball(ctx, 0, 0, 7.5, cols[i]);
        ctx.restore();
      });
      return;
    }
    case 'lantern': {
      softShadow(ctx, cx, y + 28, 7, 2);
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(cx - 1, y - 4, 2, 32);
      const sw = Math.sin(t / 900 + it.id) * 1.5;
      circle(ctx, cx + sw, y + 6, 14, hexA(it.color ? col : '#ff7043', 0.15));
      ctx.save();
      ctx.translate(cx + sw, y + 6);
      ctx.scale(1, 1.1);
      ball(ctx, 0, 0, 9, it.color ? col : '#e53935');
      ctx.restore();
      ctx.fillStyle = '#ffca28';
      ctx.fillRect(cx - 5 + sw, y - 5, 10, 3);
      ctx.fillRect(cx - 5 + sw, y + 15, 10, 3);
      ctx.fillRect(cx - 0.5 + sw, y + 18, 1, 6);
      return;
    }
    case 'lamp': {
      softShadow(ctx, cx, y + 28, 8, 2);
      ctx.fillStyle = '#d4a73a';
      ctx.fillRect(cx - 1.5, y - 6, 3, 34);
      fillRR(ctx, cx - 6, y + 24, 12, 4, 2, '#b8892a');
      const glow = 0.22 + Math.sin(t / 500 + it.id) * 0.05;
      const g = ctx.createRadialGradient(cx, y - 8, 1, cx, y - 8, 18);
      g.addColorStop(0, `rgba(255,240,170,${glow + 0.3})`);
      g.addColorStop(1, 'rgba(255,240,170,0)');
      circle(ctx, cx, y - 8, 18, g);
      ball(ctx, cx, y - 8, 5, '#fff8e1');
      return;
    }
    case 'candles': {
      softShadow(ctx, cx, y + 27, 11, 3);
      [[-7, 10], [0, 4], [7, 12]].forEach(([dx, top], i) => {
        fillRR(ctx, cx + dx - 3, y + top, 6, 26 - top, 2, vgrad(ctx, y + top, y + 26, '#fffdf5', 0, -0.1));
        const fl = Math.sin(t / 120 + i * 2) * 0.6;
        const g = ctx.createRadialGradient(cx + dx, y + top - 3, 0, cx + dx, y + top - 3, 7);
        g.addColorStop(0, 'rgba(255,220,120,0.6)');
        g.addColorStop(1, 'rgba(255,220,120,0)');
        circle(ctx, cx + dx, y + top - 3, 7, g);
        ellipse(ctx, cx + dx + fl * 0.3, y + top - 3, 1.7, 3 + fl * 0.4, '#ffb300');
        ellipse(ctx, cx + dx, y + top - 2.5, 0.8, 1.6, '#fffde7');
      });
      return;
    }
    case 'heart':
      softShadow(ctx, cx, y + 28, 8, 2);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(cx - 1.5, y + 12, 3, 16);
      heart(ctx, cx, y + 11, 13 + Math.sin(t / 400) * 0.8, vgrad(ctx, y - 2, y + 16, col, 0.3, -0.15));
      return;
    case 'hy':
      softShadow(ctx, cx, y + 28, 10, 3);
      fillRR(ctx, x + 4, y, 24, 27, 4, vgrad(ctx, y, y + 27, '#ffca28', 0.25, -0.15), '#c79100');
      ctx.fillStyle = '#c62828';
      ctx.font = '700 19px "Microsoft YaHei", "SimSun", serif';
      ctx.textAlign = 'center';
      ctx.fillText('囍', cx, y + 20);
      ctx.textAlign = 'start';
      return;
    case 'teddy': {
      softShadow(ctx, cx, y + 28, 13, 4);
      const bear = (bx: number, fur: string, extra: 'bow' | 'veil') => {
        ball(ctx, bx, y + 20, 7, fur);
        ball(ctx, bx, y + 9, 6.5, fur);
        ball(ctx, bx - 5, y + 4, 2.6, fur);
        ball(ctx, bx + 5, y + 4, 2.6, fur);
        ellipse(ctx, bx, y + 11, 2.8, 2.2, shade(fur, 0.4));
        circle(ctx, bx, y + 10, 0.9, '#3e2723');
        circle(ctx, bx - 2.4, y + 7.5, 0.9, '#3e2723');
        circle(ctx, bx + 2.4, y + 7.5, 0.9, '#3e2723');
        if (extra === 'bow') { ctx.fillStyle = '#c62828'; ctx.fillRect(bx - 3, y + 15, 6, 2); }
        else ellipse(ctx, bx, y + 5, 6, 3, 'rgba(255,255,255,0.8)');
      };
      bear(cx - 7, '#a1887f', 'bow');
      bear(cx + 7, '#f5f0e6', 'veil');
      heart(ctx, cx, y + 3, 4, accent);
      return;
    }
    case 'giftpile': {
      softShadow(ctx, cx, y + 28, 13, 4);
      const box = (bx: number, by: number, bw: number, bh: number, c: string) => {
        fillRR(ctx, bx, by, bw, bh, 2, vgrad(ctx, by, by + bh, c, 0.2, -0.15));
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(bx + bw / 2 - 1.2, by, 2.4, bh);
        ctx.fillRect(bx, by + bh / 2 - 1.2, bw, 2.4);
      };
      box(x + 3, y + 15, 15, 13, col);
      box(x + 16, y + 17, 13, 11, '#ffffff');
      box(x + 8, y + 5, 13, 11, shade(col, 0.45));
      ellipse(ctx, x + 12, y + 4, 3, 2, '#ffd54f', -0.5);
      ellipse(ctx, x + 17, y + 4, 3, 2, '#ffd54f', 0.5);
      return;
    }
    case 'swan': {
      softShadow(ctx, cx, y + 27, 12, 4);
      ellipse(ctx, cx + 2, y + 21, 11, 6.5, vgrad(ctx, y + 14, y + 28, '#ffffff', 0, -0.12));
      ctx.beginPath();
      ctx.moveTo(cx - 7, y + 20);
      ctx.quadraticCurveTo(cx - 14, y + 6, cx - 6, y + 3);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';
      ball(ctx, cx - 5, y + 3, 3.4, '#ffffff');
      ctx.fillStyle = '#ff8f00';
      ctx.beginPath(); ctx.moveTo(cx - 2.5, y + 2.5); ctx.lineTo(cx + 2, y + 4); ctx.lineTo(cx - 2.5, y + 5); ctx.fill();
      circle(ctx, cx - 4.8, y + 2.3, 0.8, '#212121');
      ellipse(ctx, cx + 6, y + 18, 6, 3, 'rgba(0,0,0,0.05)', -0.3);
      return;
    }
    case 'fountain': {
      softShadow(ctx, cx, cy + 14, pw / 2, 12, 0.25);
      ellipse(ctx, cx, cy + 4, pw / 2 - 2, ph / 2 - 6, '#d7ccc8');
      const g = ctx.createRadialGradient(cx - 8, cy - 4, 2, cx, cy + 2, pw / 2 - 6);
      g.addColorStop(0, '#b3e5fc');
      g.addColorStop(1, '#4fc3f7');
      ellipse(ctx, cx, cy + 2, pw / 2 - 7, ph / 2 - 11, g);
      for (let i = 0; i < 3; i++) {
        const k = ((t / 1400 + i / 3) % 1);
        ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - k)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 2, 6 + k * 18, 3 + k * 9, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      fillRR(ctx, cx - 4, cy - 14, 8, 16, 3, '#eceff1');
      ellipse(ctx, cx, cy - 15, 9, 4, '#cfd8dc');
      for (let i = 0; i < 8; i++) {
        const k = ((t / 700 + i / 8) % 1);
        const a = (i / 8) * Math.PI * 2;
        circle(ctx, cx + Math.cos(a) * k * 12, cy - 18 - Math.sin(k * Math.PI) * 10 + k * 12, 1.4, 'rgba(225,245,254,0.9)');
      }
      return;
    }
    case 'welcome': {
      const top = y - T * 0.7;
      softShadow(ctx, cx, y + ph - 2, pw / 2 - 4, 4);
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 14, y + ph - 2); ctx.lineTo(cx - 6, top + 10);
      ctx.moveTo(cx + 14, y + ph - 2); ctx.lineTo(cx + 6, top + 10);
      ctx.stroke();
      fillRR(ctx, x + 4, top, pw - 8, 34, 4, '#fffdf7', '#d4a73a');
      ctx.textAlign = 'center';
      ctx.fillStyle = shade(accent, -0.15);
      ctx.font = `700 13px ${SCRIPT_FONT}`;
      ctx.fillText('Welcome', cx, top + 14);
      ctx.font = `600 7.5px ${UI_FONT}`;
      ctx.fillStyle = '#6d4c41';
      ctx.fillText(`${info.groom} ♥ ${info.bride}`, cx, top + 26);
      ctx.textAlign = 'start';
      flower(ctx, x + 6, top + 2, 4, accent);
      flower(ctx, x + pw - 6, top + 32, 4, '#ffffff', accent);
      return;
    }

    // ── bàn ghế (bổ sung)
    case 'table_square': {
      softShadow(ctx, cx, cy + 10, 34, 14, 0.28);
      fillRR(ctx, x + 3, y + 7, pw - 6, ph - 8, 6, shade(col, -0.25));
      fillRR(ctx, x + 3, y + 3, pw - 6, ph - 9, 6, vgrad(ctx, y, y + ph, '#ffffff', 0, -0.06));
      fillRR(ctx, x + 10, y + 10, pw - 20, ph - 23, 4, hexA(col, 0.2));
      for (const [dx, dy] of [[-14, -12], [14, -12], [-14, 10], [14, 10]]) {
        circle(ctx, cx + dx, cy + dy, 4.4, '#d9d9d9');
        circle(ctx, cx + dx, cy + dy, 3.6, '#ffffff');
      }
      flower(ctx, cx - 3, cy - 3, 4.5, col);
      flower(ctx, cx + 4, cy - 1, 4, '#ffffff');
      return;
    }
    case 'bench': {
      const [bx, by] = BACK[it.rot] ?? BACK[0];
      softShadow(ctx, cx, y + ph - 4, pw / 2, 6, 0.22);
      fillRR(ctx, x + 2, y + 6, pw - 4, ph - 10, 5, vgrad(ctx, y, y + ph, '#c49a6c', 0.2, -0.2));
      for (let i = 1; i < 4; i++) {
        ctx.fillStyle = 'rgba(90,50,20,0.25)';
        if (w > h) ctx.fillRect(x + 2, y + 6 + i * ((ph - 10) / 4), pw - 4, 1);
        else ctx.fillRect(x + 6 + i * ((pw - 12) / 4), y + 2, 1, ph - 4);
      }
      const back = (a: number, b: number, c: number, d: number) => fillRR(ctx, a, b, c, d, 3, vgrad(ctx, b, b + d, '#a87b4f', 0.2, -0.2));
      if (by === -1) back(x + 2, y, pw - 4, 6);
      if (by === 1) back(x + 2, y + ph - 6, pw - 4, 6);
      if (bx === -1) back(x, y + 2, 6, ph - 4);
      if (bx === 1) back(x + pw - 6, y + 2, 6, ph - 4);
      ball(ctx, cx, cy, 4, col);
      return;
    }
    case 'bar': {
      softShadow(ctx, cx, cy + 8, pw / 2 + 2, 10, 0.28);
      fillRR(ctx, x + 1, y + 6, pw - 2, ph - 6, 4, vgrad(ctx, y + 6, y + ph, '#6d4c41', 0.1, -0.3));
      fillRR(ctx, x, y + 1, pw, ph - 8, 4, vgrad(ctx, y, y + ph, '#fafafa', 0, -0.1), '#d7ccc8');
      const n = Math.max(w, h) * 3;
      for (let i = 0; i < n; i++) {
        const bx2 = w > h ? x + 8 + i * ((pw - 16) / (n - 1)) : cx - 4 + (i % 2) * 8;
        const by2 = w > h ? y + 4 : y + 6 + Math.floor(i / 2) * 10;
        const c = ['#2e7d32', '#6a1b9a', '#c62828', '#f9a825', '#00838f'][i % 5];
        fillRR(ctx, bx2 - 2, by2, 4, 9, 1.5, hexA(c, 0.9));
        ctx.fillStyle = '#eeeeee';
        ctx.fillRect(bx2 - 1, by2 - 2, 2, 2.5);
      }
      return;
    }
    case 'dessert': {
      softShadow(ctx, cx, cy + 8, pw / 2, 8, 0.25);
      fillRR(ctx, x + 1, y + 8, pw - 2, ph - 8, 4, vgrad(ctx, y + 8, y + ph, col, 0.2, -0.2));
      fillRR(ctx, x + 1, y + 3, pw - 2, ph - 12, 4, '#ffffff', '#eee');
      for (let i = 0; i < 5; i++) {
        const dx = x + 8 + i * 12;
        fillRR(ctx, dx - 3.5, y + 9, 7, 5, 1.5, '#ffe0b2');
        ball(ctx, dx, y + 8, 4, ['#f8bbd0', '#ffffff', '#b39ddb', '#80cbc4', '#ffcc80'][i]);
        circle(ctx, dx, y + 5, 1.2, '#e53935');
      }
      return;
    }
    case 'fruit': {
      softShadow(ctx, cx, y + 27, 12, 4);
      ctx.fillStyle = '#bdbdbd';
      ctx.fillRect(cx - 1, y + 4, 2, 22);
      [[13, 22], [10, 14], [6, 6]].forEach(([r, yy], k) => {
        ellipse(ctx, cx, y + yy + 2, r, 3, '#eeeeee');
        const fruits = ['#e53935', '#7cb342', '#ffb300', '#8e24aa', '#ff7043', '#fdd835'];
        for (let i = 0; i < 3 + (2 - k) * 2; i++) ball(ctx, cx - r + 3 + i * ((2 * r - 6) / (2 + (2 - k) * 2)), y + yy - 1, 2.8, fruits[(i + k) % 6]);
      });
      return;
    }
    case 'wine': {
      softShadow(ctx, cx, y + 27, 12, 4);
      fillRR(ctx, x + 4, y + 14, 24, 13, 3, vgrad(ctx, y + 14, y + 27, '#8d6e63', 0.1, -0.3));
      circle(ctx, x + 8, y + 28, 2, '#424242');
      circle(ctx, x + 24, y + 28, 2, '#424242');
      for (let i = 0; i < 3; i++) {
        fillRR(ctx, x + 7 + i * 6, y + 2, 5, 13, 2, '#1b5e20');
        ctx.fillStyle = '#c62828';
        ctx.fillRect(x + 7 + i * 6, y + 8, 5, 3);
      }
      ctx.fillStyle = 'rgba(183,28,28,0.75)';
      ctx.beginPath(); ctx.moveTo(x + 23, y + 6); ctx.lineTo(x + 29, y + 6); ctx.lineTo(x + 26, y + 11); ctx.fill();
      return;
    }

    // ── sân khấu (bổ sung)
    case 'drums': {
      softShadow(ctx, cx, cy + 14, pw / 2, 10, 0.25);
      ball(ctx, cx, cy + 8, 15, '#fafafa');
      circle(ctx, cx, cy + 8, 12, col);
      circle(ctx, cx, cy + 8, 5, '#ffffff');
      ball(ctx, cx - 16, cy - 4, 8, '#eceff1');
      ball(ctx, cx + 16, cy - 4, 8, '#eceff1');
      ellipse(ctx, cx - 22, cy - 18, 10, 4, '#e2b54a');
      ellipse(ctx, cx + 22, cy - 18, 10, 4, '#e2b54a');
      ball(ctx, cx, cy - 12, 6, '#cfd8dc');
      return;
    }
    case 'guitar': {
      softShadow(ctx, cx, y + 28, 8, 3);
      ctx.save();
      ctx.translate(cx, y + 14);
      ctx.rotate(-0.25);
      ellipse(ctx, 0, 8, 7.5, 7, vgrad(ctx, y, y + 28, '#d08b4e', 0.2, -0.25));
      ellipse(ctx, 0, -1, 6, 5.5, vgrad(ctx, y, y + 20, '#d08b4e', 0.2, -0.25));
      circle(ctx, 0, 4, 2.4, '#3e2723');
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(-1.3, -22, 2.6, 22);
      fillRR(ctx, -2.5, -26, 5, 5, 1, '#3e2723');
      ctx.restore();
      return;
    }
    case 'dj': {
      softShadow(ctx, cx, cy + 8, pw / 2, 8, 0.28);
      fillRR(ctx, x + 1, y + 4, pw - 2, ph - 4, 4, vgrad(ctx, y, y + ph, '#37474f', 0.1, -0.35));
      for (const dx of [x + 14, x + pw - 14]) {
        circle(ctx, dx, y + 13, 9, '#212121');
        ctx.save();
        ctx.translate(dx, y + 13);
        ctx.rotate(t / 300);
        ctx.fillStyle = '#ef5350';
        ctx.fillRect(-1, -8, 2, 6);
        ctx.restore();
        circle(ctx, dx, y + 13, 2, '#bdbdbd');
      }
      for (let i = 0; i < 6; i++) {
        const on = Math.sin(t / 150 + i) > 0;
        ctx.fillStyle = on ? ['#ff4f8b', '#ffd54f', '#4fc3f7'][i % 3] : '#455a64';
        ctx.fillRect(cx - 9 + i * 3, y + ph - 6, 2, 3);
      }
      bounceHint(ctx, cx, y - 6, t, '🪩');
      return;
    }
    case 'discoball': {
      const top = y - T * 1.6;
      softShadow(ctx, cx, y + 26, 9, 3, 0.15);
      ctx.strokeStyle = 'rgba(80,80,90,0.7)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(cx, top - 14); ctx.lineTo(cx, top); ctx.stroke();
      ball(ctx, cx, top + 9, 10, '#cfd8dc');
      const rot = (t / 900) % 1;
      for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) {
        const a = ((k + rot) / 6) * Math.PI * 2;
        const xx = cx + Math.cos(a) * 8 * Math.sin(((r + 0.5) / 4) * Math.PI);
        if (Math.sin(a) < 0) continue;
        const on = (k + r + Math.floor(t / 180)) % 3 === 0;
        ctx.fillStyle = on ? '#ffffff' : 'rgba(120,130,150,0.55)';
        ctx.fillRect(xx - 1.2, top + 2 + r * 4, 2.4, 2.4);
      }
      return;
    }
    case 'spotlight': {
      softShadow(ctx, cx, y + 28, 9, 3);
      ctx.save();
      ctx.globalAlpha = 0.18 + Math.sin(t / 400 + it.id) * 0.05;
      const g = ctx.createLinearGradient(cx, y + 4, cx - 30, y - 60);
      g.addColorStop(0, shade(col, 0.4));
      g.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - 2, y + 2); ctx.lineTo(cx - 48, y - 70); ctx.lineTo(cx - 14, y - 76); ctx.lineTo(cx + 3, y + 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#424242';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, y + 10); ctx.lineTo(cx - 7, y + 28); ctx.moveTo(cx, y + 10); ctx.lineTo(cx + 7, y + 28); ctx.moveTo(cx, y + 10); ctx.lineTo(cx, y + 28);
      ctx.stroke();
      fillRR(ctx, cx - 6, y + 1, 12, 10, 3, vgrad(ctx, y, y + 11, '#37474f', 0.2, -0.2));
      circle(ctx, cx - 3, y + 4, 2.5, shade(col, 0.6));
      return;
    }
    case 'screen': {
      const top = y - T * 1.2;
      softShadow(ctx, cx, y + ph - 2, pw / 2, 5);
      ctx.fillStyle = '#424242';
      ctx.fillRect(x + 6, top + 4, 3, y + ph - top - 4);
      ctx.fillRect(x + pw - 9, top + 4, 3, y + ph - top - 4);
      fillRR(ctx, x + 2, top, pw - 4, 50, 3, '#263238');
      const slide = Math.floor(t / 3000) % 3;
      const g = ctx.createLinearGradient(0, top + 3, 0, top + 47);
      g.addColorStop(0, ['#fde4ec', '#e3f2fd', '#fff8e1'][slide]);
      g.addColorStop(1, '#ffffff');
      fillRR(ctx, x + 5, top + 3, pw - 10, 44, 2, g);
      ctx.textAlign = 'center';
      if (slide === 1) {
        heart(ctx, cx - 10, top + 25, 8, accent);
        heart(ctx, cx + 10, top + 25, 8, shade(accent, 0.4));
      } else {
        ctx.fillStyle = shade(accent, -0.2);
        ctx.font = `700 15px ${SCRIPT_FONT}`;
        ctx.fillText(slide === 0 ? `${info.groom} & ${info.bride}` : 'Happy Wedding', cx, top + 30);
      }
      ctx.textAlign = 'start';
      return;
    }
    case 'mrmrs': {
      softShadow(ctx, cx, y + 28, pw / 2, 4);
      fillRR(ctx, x + 4, y + 22, pw - 8, 6, 2, '#d4a73a');
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 3;
      ctx.textAlign = 'center';
      ctx.fillStyle = it.color ? col : '#c9a227';
      ctx.font = `700 18px ${SCRIPT_FONT}`;
      ctx.fillText('Mr & Mrs', cx, y + 19);
      ctx.restore();
      ctx.textAlign = 'start';
      return;
    }

    // ── trang trí (bổ sung)
    case 'rose_wall': {
      const vertical = h > w;
      const top = vertical ? y : y - T * 1.1;
      const height = vertical ? ph : ph + T * 1.1;
      softShadow(ctx, cx, y + ph - 2, pw / 2, 6, 0.25);
      fillRR(ctx, x + 1, top, pw - 2, height, 6, '#2e7d32');
      for (let i = 0; i < (pw * height) / 70; i++) {
        const fx = x + 5 + ((i * 37) % (pw - 10)), fy = top + 5 + ((i * 53) % (height - 10));
        flower(ctx, fx, fy, 4.5, i % 4 === 0 ? '#ffffff' : i % 3 === 0 ? shade(col, 0.4) : col);
      }
      return;
    }
    case 'heart_arch': {
      const top = y - T * 1.9;
      const pts: [number, number][] = [];
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const hx = 16 * Math.sin(a) ** 3;
        const hy2 = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
        pts.push([cx + hx * (pw / 36), top + 30 + hy2 * 2.2]);
      }
      pts.forEach(([px2, py2], i) => { if (py2 < y + ph - 2) flower(ctx, px2, py2, 4.6, i % 3 ? col : '#ffffff'); });
      return;
    }
    case 'flower_stand': {
      softShadow(ctx, cx, y + 28, 9, 3);
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, y + 8); ctx.lineTo(cx - 7, y + 28); ctx.moveTo(cx, y + 8); ctx.lineTo(cx + 7, y + 28);
      ctx.stroke();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        flower(ctx, cx + Math.cos(a) * 7, y + 2 + Math.sin(a) * 6, 4.5, i % 3 === 0 ? '#ffffff' : i % 2 ? col : shade(col, 0.45));
      }
      flower(ctx, cx, y + 2, 5, col);
      return;
    }
    case 'vase_tall': {
      softShadow(ctx, cx, y + 28, 8, 3);
      ctx.beginPath();
      ctx.moveTo(cx - 4, y + 10); ctx.quadraticCurveTo(cx - 9, y + 20, cx - 5, y + 28); ctx.lineTo(cx + 5, y + 28); ctx.quadraticCurveTo(cx + 9, y + 20, cx + 4, y + 10);
      ctx.closePath();
      ctx.fillStyle = vgrad(ctx, y + 10, y + 28, '#e0f7fa', 0.3, -0.2);
      ctx.fill();
      ctx.strokeStyle = '#66bb6a';
      ctx.lineWidth = 1.2;
      for (const [dx, top] of [[-6, -6], [0, -12], [6, -5]]) {
        ctx.beginPath(); ctx.moveTo(cx, y + 12); ctx.quadraticCurveTo(cx + dx * 0.5, y + 2, cx + dx, y + top); ctx.stroke();
        flower(ctx, cx + dx, y + top, 4, col);
      }
      return;
    }
    case 'light_string': {
      const top = y - T * 1.3;
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(x + 3, top, 2.5, y + ph - top);
      ctx.fillRect(x + pw - 5.5, top, 2.5, y + ph - top);
      ctx.strokeStyle = 'rgba(60,60,60,0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x + 4, top + 2);
      ctx.quadraticCurveTo(cx, top + 26, x + pw - 4, top + 2);
      ctx.stroke();
      for (let i = 1; i < 12; i++) {
        const k = i / 12;
        const bx2 = x + 4 + k * (pw - 8);
        const by2 = top + 2 + 4 * k * (1 - k) * 24;
        const on = Math.sin(t / 220 + i * 1.3) > -0.4;
        const c = it.color ? col : ['#ffeb3b', '#ff80ab', '#80d8ff', '#b9f6ca'][i % 4];
        if (on) circle(ctx, bx2, by2 + 3, 5, hexA(c, 0.25));
        ball(ctx, bx2, by2 + 3, 2.2, on ? c : shade(c, -0.4));
      }
      return;
    }
    case 'chandelier': {
      softShadow(ctx, cx, cy + 8, 20, 8, 0.15);
      const top = y - T * 1.4;
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx, top - 10); ctx.lineTo(cx, top + 8); ctx.stroke();
      ellipse(ctx, cx, top + 14, 20, 6, 'rgba(201,162,39,0.85)');
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const dx = Math.cos(a) * 17, dy = Math.sin(a) * 5;
        ctx.beginPath(); ctx.moveTo(cx + dx, top + 14 + dy); ctx.lineTo(cx + dx, top + 24 + dy); ctx.stroke();
        const tw = 0.6 + 0.4 * Math.sin(t / 200 + i);
        ellipse(ctx, cx + dx, top + 27 + dy, 2, 3.5, `rgba(225,245,254,${tw})`);
      }
      const g = ctx.createRadialGradient(cx, top + 16, 2, cx, top + 16, 34);
      g.addColorStop(0, 'rgba(255,248,200,0.35)');
      g.addColorStop(1, 'rgba(255,248,200,0)');
      circle(ctx, cx, top + 16, 34, g);
      ball(ctx, cx, top + 12, 5, '#fff8e1');
      return;
    }
    case 'ribbon':
      softShadow(ctx, cx, y + 27, 10, 3);
      ellipse(ctx, cx - 8, y + 12, 8, 6, vgrad(ctx, y + 4, y + 20, col, 0.3, -0.2), -0.3);
      ellipse(ctx, cx + 8, y + 12, 8, 6, vgrad(ctx, y + 4, y + 20, col, 0.3, -0.2), 0.3);
      ctx.fillStyle = shade(col, -0.15);
      ctx.beginPath(); ctx.moveTo(cx - 2, y + 14); ctx.lineTo(cx - 8, y + 27); ctx.lineTo(cx - 3, y + 25); ctx.lineTo(cx, y + 15); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 2, y + 14); ctx.lineTo(cx + 8, y + 27); ctx.lineTo(cx + 3, y + 25); ctx.lineTo(cx, y + 15); ctx.fill();
      ball(ctx, cx, y + 13, 4, shade(col, 0.1));
      return;
    case 'bird_cage': {
      softShadow(ctx, cx, y + 28, 10, 3);
      fillRR(ctx, cx - 10, y + 24, 20, 4, 2, '#e0d6c8');
      ctx.strokeStyle = '#f5f5f5';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) { ctx.moveTo(cx + i * 4.5, y + 24); ctx.quadraticCurveTo(cx + i * 4.5, y + 2, cx, y + 1); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.stroke();
      ball(ctx, cx + 1, y + 16, 3.5, '#ffffff');
      ctx.fillStyle = '#ff8f00';
      ctx.fillRect(cx + 4, y + 15, 2, 1.2);
      for (let i = 0; i < 4; i++) flower(ctx, cx - 9 + i * 6, y + 23, 3.2, i % 2 ? col : '#ffffff');
      return;
    }
    case 'lantern_hoian': {
      softShadow(ctx, cx, y + 28, 7, 2);
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(cx - 1, y - 6, 2, 34);
      const sw2 = Math.sin(t / 800 + it.id) * 1.2;
      const c = it.color ? col : '#ff7043';
      circle(ctx, cx + sw2, y + 6, 14, hexA(c, 0.15));
      ctx.save();
      ctx.translate(cx + sw2, y + 6);
      ctx.scale(0.75, 1.15);
      ball(ctx, 0, 0, 9, c);
      ctx.restore();
      ctx.strokeStyle = shade(c, -0.3);
      ctx.lineWidth = 0.7;
      for (const dx of [-4, 0, 4]) { ctx.beginPath(); ctx.moveTo(cx + sw2 + dx * 0.6, y - 4); ctx.quadraticCurveTo(cx + sw2 + dx * 1.3, y + 6, cx + sw2 + dx * 0.6, y + 16); ctx.stroke(); }
      ctx.fillStyle = '#ffca28';
      ctx.fillRect(cx - 3 + sw2, y - 6, 6, 2);
      ctx.fillRect(cx - 3 + sw2, y + 16, 6, 2);
      ctx.fillRect(cx - 0.5 + sw2, y + 18, 1, 7);
      return;
    }
    case 'star_lamp': {
      softShadow(ctx, cx, y + 28, 6, 2);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(cx - 1, y + 10, 2, 18);
      const c = it.color ? col : '#ffca28';
      circle(ctx, cx, y + 4, 14, hexA(c, 0.18 + Math.sin(t / 400) * 0.05));
      star(ctx, cx, y + 4, 11, 4.5, vgrad(ctx, y - 7, y + 15, c, 0.4, -0.15));
      return;
    }
    case 'sakura': {
      softShadow(ctx, cx, cy + 16, pw / 2 - 4, 10, 0.25);
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(cx - 3, cy - 4, 6, 24);
      const top = y - T * 0.9;
      ball(ctx, cx, top + 26, 22, '#f8bbd0');
      ball(ctx, cx - 16, top + 36, 15, '#f48fb1');
      ball(ctx, cx + 16, top + 36, 15, '#fce4ec');
      for (let i = 0; i < 12; i++) flower(ctx, cx - 22 + ((i * 29) % 44), top + 14 + ((i * 17) % 30), 3, '#ffffff', '#f06292');
      for (let i = 0; i < 4; i++) {
        const k = ((t / 3000 + i / 4) % 1);
        ellipse(ctx, cx - 20 + i * 13 + Math.sin(k * 6) * 5, top + 40 + k * 40, 2, 1.2, '#f8bbd0', k * 4);
      }
      return;
    }
    case 'mai':
    case 'dao': {
      const petal = it.type === 'mai' ? '#fdd835' : '#f48fb1';
      softShadow(ctx, cx, y + 28, 11, 4);
      fillRR(ctx, cx - 7, y + 20, 14, 8, 3, vgrad(ctx, y + 20, y + 28, '#a1887f'));
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx, y + 21); ctx.lineTo(cx - 1, y + 8); ctx.lineTo(cx - 8, y);
      ctx.moveTo(cx - 1, y + 12); ctx.lineTo(cx + 8, y + 2);
      ctx.moveTo(cx - 1, y + 8); ctx.lineTo(cx + 2, y - 4);
      ctx.stroke();
      for (const [dx, dy] of [[-8, 0], [8, 2], [2, -4], [-4, 6], [5, 8], [-9, -4], [10, -3]]) flower(ctx, cx + dx, y + dy, 3, petal, '#e65100');
      return;
    }
    case 'palm': {
      softShadow(ctx, cx, y + 28, 12, 4);
      for (let i = 0; i < 6; i++) fillRR(ctx, cx - 3 + i * 0.4, y + 24 - i * 5, 6, 6, 2, i % 2 ? '#8d6e63' : '#a1887f');
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.55;
        ellipse(ctx, cx + 2 + Math.cos(a) * 11, y - 4 + Math.sin(a) * 6 + 6, 11, 3.2, i % 2 ? '#43a047' : '#66bb6a', a);
      }
      ball(ctx, cx, y + 2, 2.5, '#795548');
      return;
    }
    case 'pond': {
      softShadow(ctx, cx, cy + 10, pw / 2, 12, 0.2);
      ellipse(ctx, cx, cy + 2, pw / 2 - 2, ph / 2 - 4, '#bcaaa4');
      const g = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, pw / 2);
      g.addColorStop(0, '#80deea');
      g.addColorStop(1, '#26a69a');
      ellipse(ctx, cx, cy + 1, pw / 2 - 6, ph / 2 - 8, g);
      for (const [dx, dy] of [[-12, -6], [10, 4], [-4, 10]]) {
        ellipse(ctx, cx + dx, cy + dy, 7, 5, '#66bb6a');
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(cx + dx, cy + dy - 1, 6, 1);
      }
      flower(ctx, cx - 11, cy - 7, 4.5, '#f48fb1', '#fff59d');
      flower(ctx, cx + 11, cy + 3, 4, '#ffffff', '#fff59d');
      const k = (t / 1800) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - k)})`;
      ctx.beginPath(); ctx.ellipse(cx + 6, cy - 6, 3 + k * 10, 1.5 + k * 5, 0, 0, Math.PI * 2); ctx.stroke();
      return;
    }
    case 'rug_square':
      fillRR(ctx, x + 2, y + 2, pw - 4, ph - 4, 4, shade(col, -0.05));
      ctx.strokeStyle = hexA('#ffffff', 0.7);
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 7, y + 7, pw - 14, ph - 14);
      for (let i = 0; i < 4; i++) flower(ctx, x + 14 + (i % 2) * (pw - 28), y + 14 + Math.floor(i / 2) * (ph - 28), 3.5, '#ffffff', shade(col, 0.3));
      heart(ctx, cx, cy + 2, 8, shade(col, 0.35));
      return;
    case 'heart_tile':
      ctx.fillStyle = shade(col, 0.55);
      ctx.fillRect(x, y, pw, ph);
      heart(ctx, cx, cy + 3, 9, hexA(col, 0.8));
      return;
    case 'grass':
      ctx.fillStyle = '#7cb342';
      ctx.fillRect(x, y, pw, ph);
      ctx.fillStyle = '#558b2f';
      for (let i = 0; i < 10; i++) ctx.fillRect(x + ((i * 7 + it.id * 3) % 30), y + ((i * 11 + it.id) % 28), 1, 3);
      return;

    // ── tiện ích (bổ sung)
    case 'jukebox': {
      softShadow(ctx, cx, y + 28, 11, 4);
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 28); ctx.lineTo(x + 5, y + 10); ctx.arc(cx, y + 10, 11, Math.PI, 0); ctx.lineTo(x + 27, y + 28);
      ctx.closePath();
      const g = ctx.createLinearGradient(x, 0, x + 32, 0);
      g.addColorStop(0, '#ff7043');
      g.addColorStop(0.5, '#ffca28');
      g.addColorStop(1, '#ec407a');
      ctx.fillStyle = g;
      ctx.fill();
      fillRR(ctx, x + 9, y + 6, 14, 9, 4, '#fff8e1');
      for (let i = 0; i < 4; i++) {
        const on = Math.sin(t / 180 + i) > 0;
        ctx.fillStyle = on ? '#4fc3f7' : '#0277bd';
        ctx.fillRect(x + 9 + i * 4, y + 19, 2.5, 6);
      }
      bounceHint(ctx, cx, y - 6, t, '🎵');
      return;
    }
    case 'bell': {
      softShadow(ctx, cx, y + 28, 11, 3);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x + 4, y + 28); ctx.lineTo(x + 4, y + 2); ctx.lineTo(x + 28, y + 2); ctx.lineTo(x + 28, y + 28); ctx.stroke();
      const sw3 = Math.sin(t / 500) * 0.15;
      ctx.save();
      ctx.translate(cx, y + 3);
      ctx.rotate(sw3);
      ctx.beginPath();
      ctx.moveTo(-3, 1); ctx.quadraticCurveTo(-9, 4, -9, 16); ctx.lineTo(9, 16); ctx.quadraticCurveTo(9, 4, 3, 1);
      ctx.closePath();
      ctx.fillStyle = vgrad(ctx, 0, 16, '#ffd54f', 0.35, -0.2);
      ctx.fill();
      ball(ctx, 0, 17, 2.2, '#c79100');
      ctx.restore();
      flower(ctx, x + 4, y + 3, 4, accent);
      flower(ctx, x + 28, y + 3, 4, accent);
      bounceHint(ctx, cx, y - 8, t, '🔔');
      return;
    }
    case 'wishtree': {
      softShadow(ctx, cx, cy + 16, pw / 2 - 4, 10, 0.25);
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(cx - 4, cy - 6, 8, 26);
      const top = y - T * 0.9;
      ball(ctx, cx, top + 26, 24, '#66bb6a');
      ball(ctx, cx - 17, top + 38, 15, '#4caf50');
      ball(ctx, cx + 17, top + 38, 15, '#81c784');
      const tags = ['#ff8a80', '#ffd180', '#ff80ab', '#b388ff', '#84ffff', '#ffffff'];
      for (let i = 0; i < 10; i++) {
        const tx = cx - 22 + ((i * 23) % 44), ty = top + 18 + ((i * 13) % 30);
        const sw4 = Math.sin(t / 600 + i) * 1.2;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(tx, ty - 4); ctx.lineTo(tx + sw4, ty); ctx.stroke();
        fillRR(ctx, tx - 2.5 + sw4, ty, 5, 7, 1, tags[i % tags.length]);
      }
      bounceHint(ctx, cx, top - 4, t, '🌟');
      return;
    }
    case 'karaoke': {
      softShadow(ctx, cx, y + 28, 9, 3);
      ctx.strokeStyle = '#424242';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(cx, y + 8); ctx.lineTo(cx, y + 27); ctx.moveTo(cx - 7, y + 28); ctx.lineTo(cx + 7, y + 28); ctx.stroke();
      ctx.save();
      ctx.translate(cx, y + 6);
      ctx.rotate(-0.5);
      fillRR(ctx, -2, 0, 4, 9, 2, '#616161');
      ball(ctx, 0, -1, 3.6, '#9e9e9e');
      ctx.restore();
      for (let i = 0; i < 2; i++) {
        const k = ((t / 1500 + i / 2) % 1);
        ctx.globalAlpha = 1 - k;
        ctx.font = `10px ${EMOJI_FONT}`;
        ctx.fillText('♪', cx + 6 + k * 6, y + 2 - k * 14);
        ctx.globalAlpha = 1;
      }
      bounceHint(ctx, cx, y - 10, t, '🎤');
      return;
    }
    case 'fireworks': {
      softShadow(ctx, cx, y + 28, 11, 4);
      fillRR(ctx, x + 5, y + 14, 22, 14, 3, vgrad(ctx, y + 14, y + 28, '#c62828', 0.2, -0.2));
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(x + 5, y + 19, 22, 2);
      for (let i = 0; i < 4; i++) {
        fillRR(ctx, x + 7 + i * 5, y + 4 + (i % 2) * 3, 4, 12, 1, ['#42a5f5', '#ab47bc', '#66bb6a', '#ffa726'][i]);
        circle(ctx, x + 9 + i * 5, y + 4 + (i % 2) * 3, 1, '#212121');
      }
      bounceHint(ctx, cx, y - 6, t, '🎆');
      return;
    }

    // ── tiện ích
    case 'giftbox': {
      softShadow(ctx, cx, y + 28, 14, 4);
      fillRR(ctx, x + 4, y + 9, 24, 19, 3, vgrad(ctx, y + 9, y + 28, '#d32f2f', 0.15, -0.2));
      fillRR(ctx, x + 2, y + 5, 28, 7, 2, vgrad(ctx, y + 5, y + 12, '#e53935', 0.25, 0));
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(cx - 2, y + 5, 4, 23);
      ellipse(ctx, cx - 5, y + 4, 5, 3, '#ffd54f', -0.4);
      ellipse(ctx, cx + 5, y + 4, 5, 3, '#ffd54f', 0.4);
      ctx.fillStyle = '#5d0b0b';
      ctx.fillRect(cx - 7, y + 8, 14, 2);
      ctx.fillStyle = '#ffd54f';
      ctx.font = '700 9px "Microsoft YaHei", serif';
      ctx.textAlign = 'center';
      ctx.fillText('囍', cx, y + 23);
      ctx.textAlign = 'start';
      bounceHint(ctx, cx, y - 6, t, '💌');
      return;
    }
    case 'guestbook': {
      softShadow(ctx, cx, y + 28, 10, 3);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(cx - 2, y + 14, 4, 14);
      ctx.save();
      ctx.translate(cx, y + 11);
      ctx.rotate(-0.08);
      fillRR(ctx, -14, -8, 28, 16, 2, '#6d4c41');
      fillRR(ctx, -13, -7, 12.5, 14, 1, '#fffdf5');
      fillRR(ctx, 0.5, -7, 12.5, 14, 1, '#fffdf5');
      ctx.fillStyle = '#bbb';
      for (let i = 0; i < 4; i++) { ctx.fillRect(-11, -4 + i * 3, 9, 0.8); ctx.fillRect(2.5, -4 + i * 3, 9, 0.8); }
      ctx.restore();
      bounceHint(ctx, cx, y - 6, t, '✍️');
      return;
    }
    case 'photo': {
      const top = y - T * 0.8;
      softShadow(ctx, cx, y + ph - 2, pw / 2 - 2, 5);
      fillRR(ctx, x + 2, top, pw - 4, ph + T * 0.8 - 4, 5, vgrad(ctx, top, y + ph, '#e2b54a', 0.3, -0.15));
      fillRR(ctx, x + 6, top + 4, pw - 12, ph + T * 0.8 - 12, 3, hexA(accent, 0.15));
      heart(ctx, cx, top + 24, 10, vgrad(ctx, top + 10, top + 30, accent, 0.3, -0.1));
      flower(ctx, x + 8, top + 3, 4.5, accent);
      flower(ctx, x + pw - 8, top + 3, 4.5, '#ffffff', accent);
      bounceHint(ctx, cx, top - 6, t, '📸');
      return;
    }
  }
}

// Nhân vật: xem ./character.ts

// ───────── Tên, bong bóng chat ─────────
export function drawNameTag(ctx: Ctx, px: number, py: number, name: string, role: Role, me: boolean) {
  const label = (role === 'bride' ? '👰 ' : role === 'groom' ? '🤵 ' : '') + name;
  ctx.font = `${me ? 700 : 600} 10px ${UI_FONT}`;
  const w = ctx.measureText(label).width + 12;
  const y = py + 5;
  const bg = role !== 'guest' ? 'rgba(229,57,80,0.92)' : me ? 'rgba(108,92,231,0.92)' : 'rgba(30,25,40,0.62)';
  fillRR(ctx, px - w / 2, y, w, 15, 7.5, bg);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(label, px, y + 11);
  ctx.textAlign = 'start';
}

export function drawBubble(ctx: Ctx, px: number, py: number, text: string, alpha: number) {
  ctx.font = `12px ${UI_FONT}`;
  const maxW = 150;
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, 4);
  if (lines.length > 4) shown[3] += '…';
  const w = Math.min(maxW, Math.max(...shown.map((l) => ctx.measureText(l).width))) + 16;
  const h = shown.length * 15 + 9;
  const x = px - w / 2, y = py - 44 - h;
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(60,20,40,0.2)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  fillRR(ctx, x, y, w, h, 10, '#ffffff');
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.beginPath();
  ctx.moveTo(px - 5, y + h - 0.5); ctx.lineTo(px, y + h + 6); ctx.lineTo(px + 5, y + h - 0.5);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.fillStyle = '#2d2230';
  ctx.textAlign = 'center';
  shown.forEach((l, i) => ctx.fillText(l, px, y + 16.5 + i * 15));
  ctx.textAlign = 'start';
  ctx.globalAlpha = 1;
}

/** Vẽ hình thu nhỏ của một món đồ (dùng cho danh mục trang trí) */
export function drawItemThumb(canvas: HTMLCanvasElement, type: Item['type'], info: WeddingInfo, color?: number) {
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = canvas.clientWidth || 56;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const it: Item = { id: 0, type, x: 0, y: 0, rot: 0, color };
  const s = itemSize(it);
  // chừa chỗ cho phần vẽ vươn lên trên (phông, cổng hoa...)
  const tall = ['backdrop', 'arch', 'pillar', 'photo', 'welcome', 'lamp', 'balloons', 'rose_wall', 'heart_arch', 'light_string',
    'chandelier', 'screen', 'sakura', 'wishtree', 'spotlight'];
  const extraTop = tall.includes(type) ? T * 1.6 : T * 0.35;
  const wpx = s.w * T, hpx = s.h * T + extraTop;
  const k = (size * dpr * 0.86) / Math.max(wpx, hpx);
  ctx.setTransform(k, 0, 0, k, (size * dpr - wpx * k) / 2, (size * dpr - hpx * k) / 2 + extraTop * k);
  drawItem(ctx, it, info, 0);
}
