// Vẽ mọi thứ bằng canvas (không dùng ảnh): sàn, tường, sân khấu, đồ trang trí, nhân vật chibi, bong bóng chat
import { HAIR_COLORS, OUTFIT_COLORS, SKINS, type Look, type Role } from '../../../shared/look';
import { ACCENTS, type WeddingInfo } from '../../../shared/protocol';
import { DOOR, HALL_H, HALL_W, ITEM_COLORS, STAGE, TILE, itemSize, ITEM_DEFS, type Item } from '../../../shared/world';

type Ctx = CanvasRenderingContext2D;
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
const fillRR = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: Fill, stroke?: string) => {
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
const ellipse = (ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: Fill, rot = 0) => {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
};
/** Bóng mềm dưới vật thể */
function softShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.22) {
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
function ball(ctx: Ctx, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, shade(color, 0.45));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.25));
  circle(ctx, x, y, r, g);
}
const vgrad = (ctx: Ctx, y0: number, y1: number, c: string, light = 0.18, dark = -0.18) => {
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

// ───────── Nhân vật chibi ─────────
export interface CharPose {
  d: number; // 0 xuống, 1 trái, 2 lên, 3 phải
  walk: number; // pha bước chân (radian), -1 = đứng yên
  sitting: boolean;
}

const R = 10; // bán kính đầu

export function drawCharacter(ctx: Ctx, px: number, py: number, look: Look, role: Role, pose: CharPose) {
  const skin = SKINS[look.skin] ?? SKINS[0];
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0];
  let outfit: string = look.outfit;
  let color = OUTFIT_COLORS[look.color] ?? OUTFIT_COLORS[0];
  if (role === 'bride') { outfit = 'gown'; color = '#ffffff'; }
  if (role === 'groom') { outfit = 'tux'; color = '#262a35'; }

  const { d, sitting } = pose;
  const walking = pose.walk >= 0 && !sitting;
  const sw = walking ? Math.sin(pose.walk) : 0;
  const bob = walking ? Math.abs(sw) * 1.6 : Math.sin(performance.now() / 600) * 0.35;
  const by = py - bob + (sitting ? 5 : 0);
  const front = d === 0, back = d === 2;
  const side = d === 1 ? -1 : d === 3 ? 1 : 0;
  const hy = by - 27; // tâm đầu
  const top = by - 16; // vai

  softShadow(ctx, px, py + 1, 12, 4.5, 0.28);

  // ── lớp sau: voan, tóc dài, đuôi ngựa
  if (role === 'bride' && !back) veil(ctx, px, hy, by, 0.7);
  if (!back && (look.hair === 'long' || role === 'bride')) {
    fillRR(ctx, px - R - 1, hy - 2, 2 * R + 2, 17, 7, vgrad(ctx, hy, hy + 15, hair, 0.05, -0.25));
  }
  if (!back && look.hair === 'ponytail') {
    const tx = side ? px - side * (R + 2) : px + R + 1;
    ellipse(ctx, tx, hy + 4, 3.2, 7, vgrad(ctx, hy - 3, hy + 11, hair, 0.2, -0.2), side ? -side * 0.3 : -0.3);
  }

  // ── chân & giày
  if (!sitting && outfit !== 'gown') {
    const pants = outfit === 'aodai' ? '#fafafa' : outfit === 'dress' ? skin : '#3b4150';
    const l = sw * 2.2;
    for (const [lx, lift] of [[-3.6, Math.max(0, l)], [3.6, Math.max(0, -l)]] as const) {
      fillRR(ctx, px + lx - 2.2, by - 7 + lift * 0.5, 4.4, 6 - lift * 0.5, 2, vgrad(ctx, by - 7, by - 1, pants, 0.1, -0.2));
      ellipse(ctx, px + lx + (side * 1), by - 1 - lift * 0.6, 3.3, 2.2, '#2e2a2a');
      circle(ctx, px + lx - 0.8 + side, by - 1.8 - lift * 0.6, 0.8, 'rgba(255,255,255,0.35)');
    }
  }

  // ── thân
  const bodyGrad = (c: string) => vgrad(ctx, top, by, c, 0.22, -0.2);
  switch (outfit) {
    case 'gown': {
      ctx.beginPath();
      ctx.moveTo(px - 5.5, top);
      ctx.lineTo(px + 5.5, top);
      ctx.bezierCurveTo(px + 8, by - 8, px + 15, by - 3, px + 14, by + 1.5);
      ctx.quadraticCurveTo(px, by + 4.5, px - 14, by + 1.5);
      ctx.bezierCurveTo(px - 15, by - 3, px - 8, by - 8, px - 5.5, top);
      ctx.closePath();
      const g = ctx.createLinearGradient(px - 14, 0, px + 14, 0);
      g.addColorStop(0, '#f1eef7');
      g.addColorStop(0.4, '#ffffff');
      g.addColorStop(1, '#dcd7e6');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,140,170,0.35)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      for (let i = -12; i <= 12; i += 3) circle(ctx, px + i, by + 1.5 + Math.abs(i) * -0.08 + 1.4, 0.9, 'rgba(200,190,220,0.8)');
      ctx.strokeStyle = 'rgba(210,200,230,0.9)';
      ctx.beginPath();
      ctx.moveTo(px - 5, top + 4); ctx.quadraticCurveTo(px, top + 7, px + 5, top + 4);
      ctx.stroke();
      break;
    }
    case 'dress':
      ctx.beginPath();
      ctx.moveTo(px - 6, top);
      ctx.lineTo(px + 6, top);
      ctx.quadraticCurveTo(px + 9, by - 9, px + 10.5, by - 4);
      ctx.quadraticCurveTo(px, by - 1.5, px - 10.5, by - 4);
      ctx.quadraticCurveTo(px - 9, by - 9, px - 6, top);
      ctx.closePath();
      ctx.fillStyle = bodyGrad(color);
      ctx.fill();
      ctx.fillStyle = shade(color, -0.3);
      ctx.fillRect(px - 5.5, top + 5, 11, 1.6);
      break;
    case 'aodai': {
      fillRR(ctx, px - 7, top, 14, 12, 5, bodyGrad(color));
      const flap = walking ? sw * 1.5 : 0;
      ctx.beginPath();
      ctx.moveTo(px - 5.5, top + 9);
      ctx.lineTo(px + 5.5, top + 9);
      ctx.lineTo(px + 5 + flap, by - 0.5);
      ctx.lineTo(px - 5 + flap, by - 0.5);
      ctx.closePath();
      ctx.fillStyle = vgrad(ctx, top + 9, by, color, 0.05, -0.25);
      ctx.fill();
      fillRR(ctx, px - 2.5, top - 1, 5, 3, 1, shade(color, -0.2));
      break;
    }
    case 'suit':
    case 'tux':
      fillRR(ctx, px - 7.5, top, 15, 12, 5, bodyGrad(color));
      if (front) {
        ctx.beginPath();
        ctx.moveTo(px - 3.5, top); ctx.lineTo(px + 3.5, top); ctx.lineTo(px, top + 8); ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.fillStyle = shade(color, -0.35);
        ctx.beginPath(); ctx.moveTo(px - 3.5, top); ctx.lineTo(px - 1, top + 6); ctx.lineTo(px - 5, top + 3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(px + 3.5, top); ctx.lineTo(px + 1, top + 6); ctx.lineTo(px + 5, top + 3); ctx.fill();
        if (outfit === 'tux') {
          ctx.fillStyle = '#d32f2f';
          ctx.beginPath();
          ctx.moveTo(px, top + 2); ctx.lineTo(px - 3.2, top + 0.5); ctx.lineTo(px - 3.2, top + 3.5);
          ctx.moveTo(px, top + 2); ctx.lineTo(px + 3.2, top + 0.5); ctx.lineTo(px + 3.2, top + 3.5);
          ctx.fill();
          ball(ctx, px - 5, top + 4.5, 1.6, '#e53935');
        } else {
          ctx.fillStyle = shade(color, 0.5);
          ctx.fillRect(px - 0.8, top + 2, 1.6, 6);
        }
        circle(ctx, px, top + 9.5, 0.7, 'rgba(255,255,255,0.6)');
      }
      break;
    default:
      fillRR(ctx, px - 7.5, top, 15, 12, 5, bodyGrad(color));
      if (front) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(px - 3, top); ctx.lineTo(px + 3, top); ctx.lineTo(px, top + 3.5); ctx.fill();
      }
      fillRR(ctx, px - 7, top + 10, 14, 3, 1.5, '#3b4150');
  }

  // ── tay
  const sleeve = outfit === 'gown' ? skin : color;
  const armSw = walking ? sw * 2.2 : 0;
  const arm = (ax: number, dy: number) => {
    fillRR(ctx, ax - 2.2, top + 1 + dy, 4.4, 9, 2.2, vgrad(ctx, top, top + 10, sleeve, 0.2, -0.2));
    ball(ctx, ax, top + 10.5 + dy, 2.2, skin);
  };
  if (d !== 3) arm(px - 9, armSw);
  if (d !== 1) arm(px + 9, -armSw);

  if (role === 'bride' && front) {
    flower(ctx, px - 2.5, top + 9, 3.2, '#f48fb1');
    flower(ctx, px + 2.5, top + 10, 3.2, '#ffffff');
    flower(ctx, px, top + 6.5, 2.8, '#ffcdd2');
  }

  // ── đầu (hình cầu có khối)
  const hg = ctx.createRadialGradient(px - 3.5, hy - 4, 1, px, hy, R + 1);
  hg.addColorStop(0, shade(skin, 0.25));
  hg.addColorStop(0.7, skin);
  hg.addColorStop(1, shade(skin, -0.15));
  circle(ctx, px, hy, R, hg);
  if (!back) {
    // tai
    if (front) { ball(ctx, px - R + 0.5, hy + 1.5, 2.3, skin); ball(ctx, px + R - 0.5, hy + 1.5, 2.3, skin); }
    else ball(ctx, px - side * 2.5, hy + 1.5, 2.3, skin);
    circle(ctx, px, hy, R, hg);
  }

  if (back) {
    hairBack(ctx, px, hy, by, look.hair, hair, role === 'bride');
    if (role === 'bride') veil(ctx, px, hy, by, 0.85);
  } else {
    face(ctx, px, hy, side, front);
    hairFront(ctx, px, hy, look.hair, hair, side, role === 'bride');
    if (role === 'bride') {
      // vương miện nhỏ lấp lánh
      ctx.fillStyle = '#ffd54f';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(px + i * 2.4 - 1.2, hy - R + 1);
        ctx.lineTo(px + i * 2.4, hy - R - 2 - (i === 0 ? 1.5 : 0));
        ctx.lineTo(px + i * 2.4 + 1.2, hy - R + 1);
        ctx.fill();
      }
      circle(ctx, px, hy - R - 2.6, 0.9, '#ffffff');
    }
  }
}

function veil(ctx: Ctx, px: number, hy: number, by: number, a: number) {
  ctx.beginPath();
  ctx.moveTo(px - 8, hy - 7);
  ctx.quadraticCurveTo(px - 18, hy + 10, px - 13, by - 2);
  ctx.lineTo(px + 13, by - 2);
  ctx.quadraticCurveTo(px + 18, hy + 10, px + 8, hy - 7);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, hy - 7, 0, by);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(1, `rgba(255,255,255,${a * 0.35})`);
  ctx.fillStyle = g;
  ctx.fill();
}

function face(ctx: Ctx, px: number, hy: number, side: number, front: boolean) {
  const eye = (ex: number) => {
    ellipse(ctx, ex, hy + 2, 1.7, 2.4, '#2b1f22');
    circle(ctx, ex + 0.55, hy + 1, 0.75, '#ffffff');
    circle(ctx, ex - 0.5, hy + 3, 0.35, 'rgba(255,255,255,0.8)');
  };
  if (front) {
    eye(px - 3.7);
    eye(px + 3.7);
    ellipse(ctx, px - 6, hy + 5, 2, 1.2, 'rgba(255,110,130,0.4)');
    ellipse(ctx, px + 6, hy + 5, 2, 1.2, 'rgba(255,110,130,0.4)');
    ctx.beginPath();
    ctx.arc(px, hy + 5, 1.5, 0.15, Math.PI - 0.15);
    ctx.strokeStyle = '#8d4b3a';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  } else {
    eye(px + side * 4.6);
    ellipse(ctx, px + side * 5.5, hy + 5.2, 1.7, 1.1, 'rgba(255,110,130,0.4)');
    ctx.beginPath();
    ctx.arc(px + side * 6, hy + 5.3, 1, 0, Math.PI);
    ctx.strokeStyle = '#8d4b3a';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function hairGrad(ctx: Ctx, hy: number, hair: string) {
  return vgrad(ctx, hy - R - 2, hy + 4, hair, 0.28, -0.12);
}

function shine(ctx: Ctx, px: number, hy: number) {
  ctx.beginPath();
  ctx.arc(px - 1, hy - 1, R - 2.5, Math.PI * 1.15, Math.PI * 1.42);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function hairFront(ctx: Ctx, px: number, hy: number, style: string, hair: string, side: number, bride: boolean) {
  const g = hairGrad(ctx, hy, hair);
  // mái
  ctx.beginPath();
  ctx.ellipse(px, hy - 1.5, R + 1.2, R + 0.6, 0, Math.PI, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  if (side) {
    // nhìn ngang: tóc phủ nửa đầu phía sau
    ellipse(ctx, px - side * 3.2, hy + 0.5, R * 0.78, R * 0.95, g);
    ellipse(ctx, px + side * 3, hy - 2.5, 6, 3.6, g, side * 0.3);
  } else {
    // mái bằng 3 lọn
    ellipse(ctx, px - 5, hy - 2.6, 5.2, 4, g, 0.25);
    ellipse(ctx, px + 0.5, hy - 3.2, 5.4, 3.8, g);
    ellipse(ctx, px + 5.5, hy - 2.6, 4.6, 3.8, g, -0.25);
    if (style !== 'short' && style !== 'spiky') {
      fillRR(ctx, px - R - 1.2, hy - 2, 3.4, style === 'long' || bride ? 14 : 8, 1.7, g);
      fillRR(ctx, px + R - 2.2, hy - 2, 3.4, style === 'long' || bride ? 14 : 8, 1.7, g);
    }
  }
  switch (style) {
    case 'bun':
      ball(ctx, px, hy - R - 2.5, 4.8, hair);
      break;
    case 'curly':
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        ball(ctx, px + Math.cos(a) * (R + 0.5), hy - 1 + Math.sin(a) * (R + 0.5), 3.3, hair);
      }
      break;
    case 'spiky':
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const sx = px - 9 + i * 3.6;
        ctx.moveTo(sx, hy - 6); ctx.lineTo(sx + 1.8, hy - 14 + (i % 2) * 2); ctx.lineTo(sx + 3.6, hy - 6);
      }
      ctx.fill();
      break;
  }
  if (bride) ball(ctx, px, hy - R - 2, 4.3, hair);
  shine(ctx, px, hy);
}

function hairBack(ctx: Ctx, px: number, hy: number, by: number, style: string, hair: string, bride: boolean) {
  const g = hairGrad(ctx, hy, hair);
  if (style === 'long' || bride) fillRR(ctx, px - R - 1, hy - 2, 2 * R + 2, by - hy - 6, 8, vgrad(ctx, hy, by, hair, 0.1, -0.25));
  ellipse(ctx, px, hy - 0.5, R + 1.2, R + 0.6, g);
  if (style === 'bun' || bride) ball(ctx, px, hy - 6, 4.8, hair);
  if (style === 'ponytail') ellipse(ctx, px, hy + 9, 3.4, 7.5, vgrad(ctx, hy + 2, hy + 16, hair, 0.15, -0.2));
  if (style === 'curly') for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ball(ctx, px + Math.cos(a) * R, hy + Math.sin(a) * R, 3.2, hair);
  }
  if (style === 'spiky') {
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const sx = px - 9 + i * 3.6;
      ctx.moveTo(sx, hy - 6); ctx.lineTo(sx + 1.8, hy - 14 + (i % 2) * 2); ctx.lineTo(sx + 3.6, hy - 6);
    }
    ctx.fill();
  }
  shine(ctx, px, hy);
}

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
  const extraTop = ['backdrop', 'arch', 'pillar', 'photo', 'welcome', 'lamp', 'balloons'].includes(type) ? T * 1.2 : T * 0.3;
  const wpx = s.w * T, hpx = s.h * T + extraTop;
  const k = (size * dpr * 0.86) / Math.max(wpx, hpx);
  ctx.setTransform(k, 0, 0, k, (size * dpr - wpx * k) / 2, (size * dpr - hpx * k) / 2 + extraTop * k);
  drawItem(ctx, it, info, 0);
}
