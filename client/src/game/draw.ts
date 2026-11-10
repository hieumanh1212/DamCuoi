// Vẽ mọi thứ bằng canvas (không dùng ảnh): sàn, tường, sân khấu, đồ trang trí, nhân vật, bong bóng chat
import { HAIR_COLORS, OUTFIT_COLORS, SKINS, type Look, type Role } from '../../../shared/look';
import { ACCENTS, type WeddingInfo } from '../../../shared/protocol';
import { DOOR, HALL_H, HALL_W, ITEM_DEFS, STAGE, TILE, itemSize, type Item } from '../../../shared/world';

type Ctx = CanvasRenderingContext2D;
const T = TILE;

// ───────── tiện ích hình học ─────────
export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}
const circle = (ctx: Ctx, x: number, y: number, r: number, fill: string) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
};
const fillRR = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke?: string) => {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
};
const shadow = (ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.18) => {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.fill();
};
function heart(ctx: Ctx, x: number, y: number, s: number, fill: string) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.45, y - s, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s, x + s, y - s * 0.4, x, y + s * 0.35);
  ctx.fillStyle = fill;
  ctx.fill();
}
function flower(ctx: Ctx, x: number, y: number, r: number, petal: string, center = '#ffd54f') {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    circle(ctx, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, petal);
  }
  circle(ctx, x, y, r * 0.35, center);
}

export const accentOf = (info: WeddingInfo) => ACCENTS[info.accent] ?? ACCENTS[0];

export function formatDate(d: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

// ───────── Sàn, tường, sân khấu ─────────
export function drawHall(ctx: Ctx, info: WeddingInfo) {
  const W = HALL_W * T, H = HALL_H * T;
  const accent = accentOf(info);

  // Sàn
  switch (info.floor) {
    case 'wood': {
      ctx.fillStyle = '#d7a46a';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(120,70,30,0.25)';
      ctx.lineWidth = 1;
      for (let y = 0; y < H; y += 16) {
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke();
        const off = (y / 16) % 2 ? 48 : 0;
        for (let x = off; x < W; x += 96) { ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + 16); ctx.stroke(); }
      }
      break;
    }
    case 'pink':
      ctx.fillStyle = '#fde3ec';
      ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < HALL_H; y++) for (let x = 0; x < HALL_W; x++) if ((x + y) % 2) circle(ctx, x * T + 16, y * T + 16, 2, '#f8c3d4');
      break;
    case 'red':
      ctx.fillStyle = '#a3171f';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,214,102,0.22)';
      for (let y = 0; y < HALL_H; y++) for (let x = 0; x < HALL_W; x++) {
        ctx.beginPath();
        ctx.moveTo(x * T + 16, y * T + 6); ctx.lineTo(x * T + 26, y * T + 16); ctx.lineTo(x * T + 16, y * T + 26); ctx.lineTo(x * T + 6, y * T + 16);
        ctx.closePath(); ctx.stroke();
      }
      break;
    case 'garden':
      for (let x = 0; x < HALL_W; x++) {
        ctx.fillStyle = x % 2 ? '#8cc152' : '#7fb646';
        ctx.fillRect(x * T, 0, T, H);
      }
      break;
    default: // đá trắng
      for (let y = 0; y < HALL_H; y++) for (let x = 0; x < HALL_W; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#f6f3ee' : '#ece7df';
        ctx.fillRect(x * T, y * T, T, T);
      }
  }

  // Sân khấu
  const sx = STAGE.x0 * T, sy = STAGE.y0 * T, sw = (STAGE.x1 - STAGE.x0 + 1) * T, sh = (STAGE.y1 - STAGE.y0 + 1) * T;
  shadow(ctx, sx + sw / 2, sy + sh + 2, sw / 2, 8, 0.12);
  fillRR(ctx, sx, sy, sw, sh, 6, '#fffaf3');
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  for (let x = sx; x < sx + sw; x += 24) ctx.fillRect(x, sy, 1, sh);
  ctx.fillStyle = accent;
  ctx.fillRect(sx, sy + sh - 5, sw, 5);
  // bậc lên sân khấu
  const stepX = 16 * T, stepW = 4 * T;
  fillRR(ctx, stepX, sy + sh - 2, stepW, 9, 3, '#f1e6d6');

  // Tường
  ctx.fillStyle = '#fff3e3';
  ctx.fillRect(0, 0, W, T); // tường trên
  ctx.fillRect(0, 0, T * 0.6, H);
  ctx.fillRect(W - T * 0.6, 0, T * 0.6, H);
  ctx.fillRect(0, H - T * 0.6, DOOR.x0 * T, T * 0.6);
  ctx.fillRect((DOOR.x1 + 1) * T, H - T * 0.6, W - (DOOR.x1 + 1) * T, T * 0.6);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, T, W, 3);
  // dây hoa trang trí tường trên
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 64) {
    ctx.moveTo(x, 6);
    ctx.quadraticCurveTo(x + 32, 26, x + 64, 6);
  }
  ctx.stroke();
  for (let x = 32; x < W; x += 64) flower(ctx, x, 17, 4, '#ffffff', accent);
  // cửa vào
  ctx.fillStyle = '#c62828';
  ctx.fillRect(DOOR.x0 * T, H - 6, (DOOR.x1 - DOOR.x0 + 1) * T, 6);
}

// ───────── Đồ trang trí ─────────
export function itemDepth(it: Item) {
  const def = ITEM_DEFS[it.type];
  if (def.layer === 'floor') return -1;
  if (it.type === 'chair') return it.y + 0.3; // người ngồi được vẽ đè lên ghế
  return it.y + itemSize(it).h;
}

export function drawItem(ctx: Ctx, it: Item, info: WeddingInfo, t: number) {
  const { w, h } = itemSize(it);
  const x = it.x * T, y = it.y * T, pw = w * T, ph = h * T;
  const cx = x + pw / 2, cy = y + ph / 2;
  const accent = accentOf(info);

  switch (it.type) {
    case 'carpet':
      ctx.fillStyle = '#c62828';
      ctx.fillRect(x, y, pw, ph);
      ctx.fillStyle = 'rgba(255,215,0,0.35)';
      ctx.fillRect(x, y, 2, ph);
      ctx.fillRect(x + pw - 2, y, 2, ph);
      return;
    case 'petals':
      for (let i = 0; i < 6; i++) {
        const px = x + 5 + ((i * 37 + it.id * 13) % 22), py = y + 5 + ((i * 53 + it.id * 7) % 22);
        ctx.beginPath();
        ctx.ellipse(px, py, 3, 1.8, i, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? '#f48fb1' : '#ffffff';
        ctx.fill();
      }
      return;
    case 'table_round': {
      shadow(ctx, cx, cy + 6, 30, 14);
      circle(ctx, cx, cy, 29, '#ffffff');
      ctx.strokeStyle = '#e8e2d8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      circle(ctx, cx, cy, 22, hexA(accent, 0.15));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.5;
        circle(ctx, cx + Math.cos(a) * 19, cy + Math.sin(a) * 19, 4, '#f5f5f5');
        ctx.strokeStyle = '#ddd';
        ctx.stroke();
      }
      flower(ctx, cx, cy, 6, accent);
      return;
    }
    case 'table_long':
      shadow(ctx, cx, cy + 6, pw / 2, 9);
      fillRR(ctx, x + 2, y + 3, pw - 4, ph - 6, 4, '#ffffff', '#e8e2d8');
      ctx.fillStyle = hexA(accent, 0.25);
      if (w > h) ctx.fillRect(x + 2, cy - 3, pw - 4, 6);
      else ctx.fillRect(cx - 3, y + 3, 6, ph - 6);
      flower(ctx, cx, cy, 5, accent);
      return;
    case 'chair': {
      // khung ghế chiavari vàng, đệm màu nhấn; lưng ghế ở phía đối diện hướng ngồi
      const back = [[0, -1], [1, 0], [0, 1], [-1, 0]][it.rot]; // rot 0 nhìn xuống → lưng ở trên
      fillRR(ctx, x + 6, y + 6, 20, 20, 4, '#d4a73a');
      fillRR(ctx, x + 8, y + 8, 16, 16, 3, hexA(accent, 0.75));
      ctx.fillStyle = '#b8892a';
      if (back[1] === -1) ctx.fillRect(x + 6, y + 3, 20, 5);
      if (back[1] === 1) ctx.fillRect(x + 6, y + 24, 20, 5);
      if (back[0] === -1) ctx.fillRect(x + 3, y + 6, 5, 20);
      if (back[0] === 1) ctx.fillRect(x + 24, y + 6, 5, 20);
      return;
    }
    case 'backdrop': {
      // phông cưới cao hơn ô của nó (vươn lên tường)
      const top = y - T * 0.9, height = ph + T * 0.9;
      shadow(ctx, cx, y + ph, pw / 2, 6);
      const g = ctx.createLinearGradient(0, top, 0, top + height);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, hexA(accent, 0.35));
      fillRR(ctx, x, top, pw, height, 8, g);
      rr(ctx, x, top, pw, height, 8);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.stroke();
      for (let i = 0; i < 7; i++) flower(ctx, x + 8 + (i * (pw - 16)) / 6, top + 6, 5, i % 2 ? accent : '#ffffff', '#ffd54f');
      ctx.textAlign = 'center';
      ctx.fillStyle = accent;
      ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`${info.groom} ❤ ${info.bride}`, cx, top + 34);
      const date = formatDate(info.date);
      if (date) {
        ctx.font = '600 9px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = '#8a6d3b';
        ctx.fillText(date, cx, top + 47);
      }
      ctx.textAlign = 'start';
      return;
    }
    case 'arch': {
      // cổng hoa: 2 cột + vòm, vẽ cao lên phía trên
      const top = y - T * 1.6;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + ph - 4);
      ctx.lineTo(x + 6, top + 26);
      ctx.quadraticCurveTo(cx, top - 10, x + pw - 6, top + 26);
      ctx.lineTo(x + pw - 6, y + ph - 4);
      ctx.stroke();
      for (let i = 0; i <= 12; i++) {
        const k = i / 12;
        const px = x + 6 + k * (pw - 12);
        const py = top + 26 - Math.sin(k * Math.PI) * 30 + (k < 0.08 || k > 0.92 ? 10 : 0);
        flower(ctx, px, py, 5, i % 3 === 0 ? accent : i % 3 === 1 ? '#ffffff' : '#f8bbd0');
      }
      for (const px of [x + 6, x + pw - 6]) for (let py = top + 40; py < y + ph - 4; py += 12) flower(ctx, px, py, 4, accent);
      return;
    }
    case 'cake': {
      shadow(ctx, cx, y + 27, 12, 4);
      fillRR(ctx, cx - 12, y + 16, 24, 11, 3, '#ffffff', '#eee');
      fillRR(ctx, cx - 9, y + 8, 18, 9, 3, '#fffdf7', '#eee');
      fillRR(ctx, cx - 6, y + 1, 12, 8, 3, '#ffffff', '#eee');
      for (let i = 0; i < 5; i++) circle(ctx, cx - 9 + i * 4.5, y + 21, 1.4, accent);
      heart(ctx, cx, y + 1, 5, accent);
      return;
    }
    case 'champagne': {
      shadow(ctx, cx, y + 28, 12, 4);
      const rows = [4, 3, 2, 1];
      rows.forEach((n, r) => {
        for (let i = 0; i < n; i++) {
          const gx = cx - (n - 1) * 5 + i * 10, gy = y + 24 - r * 7;
          ctx.beginPath();
          ctx.moveTo(gx - 4, gy - 5); ctx.lineTo(gx + 4, gy - 5); ctx.lineTo(gx, gy + 1); ctx.closePath();
          ctx.fillStyle = 'rgba(255,224,130,0.85)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(200,170,90,0.9)';
          ctx.stroke();
        }
      });
      return;
    }
    case 'giftbox': {
      shadow(ctx, cx, y + 28, 13, 4);
      fillRR(ctx, x + 4, y + 9, 24, 19, 3, '#c62828');
      fillRR(ctx, x + 2, y + 6, 28, 7, 2, '#d32f2f');
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(cx - 2, y + 6, 4, 22);
      ctx.fillRect(x + 4, y + 17, 24, 3);
      ctx.beginPath();
      ctx.ellipse(cx - 5, y + 4, 5, 3, -0.4, 0, Math.PI * 2);
      ctx.ellipse(cx + 5, y + 4, 5, 3, 0.4, 0, Math.PI * 2);
      ctx.fill();
      // khe bỏ phong bì
      ctx.fillStyle = '#5d0b0b';
      ctx.fillRect(cx - 6, y + 9, 12, 2);
      bounceHint(ctx, cx, y - 6, t, '💌');
      return;
    }
    case 'guestbook': {
      shadow(ctx, cx, y + 28, 10, 3);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(cx - 2, y + 14, 4, 14);
      ctx.save();
      ctx.translate(cx, y + 11);
      ctx.rotate(-0.08);
      fillRR(ctx, -13, -8, 26, 15, 2, '#6d4c41');
      fillRR(ctx, -12, -7, 11.5, 13, 1, '#fffdf5');
      fillRR(ctx, 0.5, -7, 11.5, 13, 1, '#fffdf5');
      ctx.fillStyle = '#bbb';
      for (let i = 0; i < 4; i++) { ctx.fillRect(-10, -4 + i * 3, 8, 1); ctx.fillRect(2.5, -4 + i * 3, 8, 1); }
      ctx.restore();
      bounceHint(ctx, cx, y - 6, t, '✍️');
      return;
    }
    case 'photo': {
      const top = y - T * 0.8;
      shadow(ctx, cx, y + ph - 2, pw / 2 - 4, 4);
      fillRR(ctx, x + 2, top, pw - 4, ph + T * 0.8 - 4, 4, '#ffffff');
      rr(ctx, x + 2, top, pw - 4, ph + T * 0.8 - 4, 4);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#d4a73a';
      ctx.stroke();
      fillRR(ctx, x + 8, top + 6, pw - 16, ph + T * 0.8 - 18, 2, hexA(accent, 0.18));
      heart(ctx, cx, top + 22, 9, accent);
      flower(ctx, x + 8, top + 4, 4, accent);
      flower(ctx, x + pw - 8, top + 4, 4, '#f8bbd0');
      bounceHint(ctx, cx, top - 6, t, '📸');
      return;
    }
    case 'flowers':
      shadow(ctx, cx, y + 28, 9, 3);
      fillRR(ctx, cx - 6, y + 16, 12, 12, 3, '#eceff1', '#cfd8dc');
      flower(ctx, cx - 5, y + 11, 4.5, accent);
      flower(ctx, cx + 5, y + 11, 4.5, '#ffffff');
      flower(ctx, cx, y + 5, 4.5, '#f8bbd0');
      return;
    case 'plant':
      shadow(ctx, cx, y + 28, 10, 3);
      fillRR(ctx, cx - 7, y + 18, 14, 10, 3, '#a1887f');
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.45;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * 8, y + 13 + Math.sin(a) * 9, 6, 3, a, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? '#43a047' : '#66bb6a';
        ctx.fill();
      }
      return;
    case 'balloons': {
      shadow(ctx, cx, y + 28, 6, 2);
      const sway = Math.sin(t / 700 + it.id) * 2;
      const cols = [accent, '#ffffff', '#f8bbd0'];
      const pos = [[-7, -14], [6, -18], [0, -26]];
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 0.8;
      pos.forEach(([dx, dy]) => { ctx.beginPath(); ctx.moveTo(cx, y + 26); ctx.lineTo(cx + dx + sway, y + dy + 26); ctx.stroke(); });
      pos.forEach(([dx, dy], i) => {
        ctx.beginPath();
        ctx.ellipse(cx + dx + sway, y + dy + 18, 7, 8.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = cols[i];
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.stroke();
        circle(ctx, cx + dx + sway - 2.5, y + dy + 14, 1.8, 'rgba(255,255,255,0.7)');
      });
      return;
    }
    case 'lantern': {
      shadow(ctx, cx, y + 28, 7, 2);
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(cx - 1, y - 4, 2, 32);
      const swing = Math.sin(t / 900 + it.id) * 1.5;
      ctx.beginPath();
      ctx.ellipse(cx + swing, y + 6, 9, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#e53935';
      ctx.fill();
      ctx.fillStyle = '#ffca28';
      ctx.fillRect(cx - 5 + swing, y - 5, 10, 3);
      ctx.fillRect(cx - 5 + swing, y + 15, 10, 3);
      ctx.fillRect(cx - 0.5 + swing, y + 18, 1, 6);
      circle(ctx, cx + swing, y + 6, 11, 'rgba(255,140,60,0.12)');
      return;
    }
    case 'lamp': {
      shadow(ctx, cx, y + 28, 7, 2);
      ctx.fillStyle = '#d4a73a';
      ctx.fillRect(cx - 1.5, y - 6, 3, 34);
      fillRR(ctx, cx - 6, y + 24, 12, 4, 2, '#b8892a');
      const glow = 0.25 + Math.sin(t / 500 + it.id) * 0.05;
      circle(ctx, cx, y - 8, 14, `rgba(255,236,150,${glow})`);
      circle(ctx, cx, y - 8, 5, '#fff8e1');
      return;
    }
    case 'heart':
      shadow(ctx, cx, y + 28, 7, 2);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(cx - 1.5, y + 12, 3, 16);
      heart(ctx, cx, y + 10, 12 + Math.sin(t / 400) * 0.8, accent);
      return;
    case 'hy':
      shadow(ctx, cx, y + 28, 9, 3);
      fillRR(ctx, x + 4, y + 1, 24, 26, 3, '#ffca28', '#c79100');
      ctx.fillStyle = '#c62828';
      ctx.font = '700 19px "Microsoft YaHei", "SimSun", serif';
      ctx.textAlign = 'center';
      ctx.fillText('囍', cx, y + 21);
      ctx.textAlign = 'start';
      return;
    case 'speaker':
      shadow(ctx, cx, y + 28, 9, 3);
      fillRR(ctx, x + 7, y + 1, 18, 27, 3, '#263238');
      circle(ctx, cx, y + 9, 4, '#546e7a');
      circle(ctx, cx, y + 20, 6, '#546e7a');
      circle(ctx, cx, y + 20, 2.5, '#263238');
      return;
  }
}

/** Biểu tượng nhấp nháy phía trên đồ có thể tương tác */
function bounceHint(ctx: Ctx, x: number, y: number, t: number, icon: string) {
  const dy = Math.sin(t / 300) * 2.5;
  ctx.font = '13px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.9;
  ctx.fillText(icon, x, y + dy);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'start';
}

export function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ───────── Nhân vật ─────────
export interface CharPose {
  d: number; // 0 xuống, 1 trái, 2 lên, 3 phải
  walk: number; // pha bước chân (radian), -1 = đứng yên
  sitting: boolean;
}

export function drawCharacter(ctx: Ctx, px: number, py: number, look: Look, role: Role, pose: CharPose) {
  const skin = SKINS[look.skin] ?? SKINS[0];
  const hairC = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0];
  let outfit: string = look.outfit;
  let color = OUTFIT_COLORS[look.color] ?? OUTFIT_COLORS[0];
  if (role === 'bride') { outfit = 'gown'; color = '#ffffff'; }
  if (role === 'groom') { outfit = 'tux'; color = '#23262f'; }

  const { d, sitting } = pose;
  const walking = pose.walk >= 0 && !sitting;
  const swing = walking ? Math.sin(pose.walk) : 0;
  const bob = walking ? Math.abs(swing) * 1.4 : 0;
  const by = py - bob + (sitting ? 4 : 0); // gốc thân
  const front = d === 0;
  const back = d === 2;

  shadow(ctx, px, py + 1, 9, 3.2);

  // chân
  if (!sitting && outfit !== 'gown') {
    const pants = outfit === 'aodai' ? '#fafafa' : outfit === 'dress' ? skin : '#3a3f4b';
    const l = swing * 2.2;
    ctx.fillStyle = pants;
    ctx.fillRect(px - 4.5, by - 7 + Math.max(0, l), 3.5, 6 - Math.max(0, l));
    ctx.fillRect(px + 1, by - 7 + Math.max(0, -l), 3.5, 6 - Math.max(0, -l));
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(px - 5, by - 1.5, 4.5, 2);
    ctx.fillRect(px + 0.5, by - 1.5, 4.5, 2);
  }

  // khăn voan cô dâu (phía sau đầu)
  if (role === 'bride') {
    ctx.beginPath();
    ctx.moveTo(px - 7, by - 30);
    ctx.quadraticCurveTo(px - 15, by - 12, px - 10, by - 4);
    ctx.lineTo(px + 10, by - 4);
    ctx.quadraticCurveTo(px + 15, by - 12, px + 7, by - 30);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fill();
  }

  // tóc phía sau
  if (look.hair === 'long' || role === 'bride') fillRR(ctx, px - 8, by - 29, 16, 16, 6, hairC);
  if (look.hair === 'ponytail' && !front) fillRR(ctx, px - 3 + (d === 1 ? 6 : d === 3 ? -6 : 0), by - 26, 6, 12, 3, hairC);

  // thân
  const top = by - 17;
  switch (outfit) {
    case 'gown':
      ctx.beginPath();
      ctx.moveTo(px - 6, top);
      ctx.lineTo(px + 6, top);
      ctx.lineTo(px + 12, by + 1);
      ctx.lineTo(px - 12, by + 1);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#e0e0e0';
      ctx.stroke();
      ctx.fillStyle = '#f3e5f5';
      ctx.fillRect(px - 10, by - 3, 20, 1.5);
      break;
    case 'dress':
      ctx.beginPath();
      ctx.moveTo(px - 5.5, top);
      ctx.lineTo(px + 5.5, top);
      ctx.lineTo(px + 9, by - 4);
      ctx.lineTo(px - 9, by - 4);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      break;
    case 'aodai':
      fillRR(ctx, px - 6, top, 12, 15, 3, color);
      ctx.fillStyle = color;
      ctx.fillRect(px - 5, top + 10, 4, 8 - bob);
      ctx.fillRect(px + 1, top + 10, 4, 8 - bob);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(px - 2, top, 4, 3);
      break;
    case 'suit':
    case 'tux':
      fillRR(ctx, px - 6.5, top, 13, 12, 3, color);
      if (front) {
        ctx.beginPath();
        ctx.moveTo(px - 3, top); ctx.lineTo(px + 3, top); ctx.lineTo(px, top + 7); ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.fillStyle = outfit === 'tux' ? '#c62828' : '#37474f';
        if (outfit === 'tux') {
          ctx.beginPath();
          ctx.moveTo(px - 3, top + 1); ctx.lineTo(px, top + 2.5); ctx.lineTo(px - 3, top + 4);
          ctx.moveTo(px + 3, top + 1); ctx.lineTo(px, top + 2.5); ctx.lineTo(px + 3, top + 4);
          ctx.fill();
          circle(ctx, px - 4, top + 5, 1.6, '#e53935'); // hoa cài áo
        } else {
          ctx.fillRect(px - 0.8, top + 2, 1.6, 6);
        }
      }
      break;
    default: // sơ mi
      fillRR(ctx, px - 6.5, top, 13, 11, 3, color);
      ctx.fillStyle = '#3a3f4b';
      ctx.fillRect(px - 6, top + 10, 12, 2);
  }

  // tay
  const sleeve = outfit === 'gown' ? skin : color;
  const armSwing = walking ? swing * 2 : 0;
  if (d !== 3) fillRR(ctx, px - 9, top + 1 + armSwing, 3, 9, 1.5, sleeve);
  if (d !== 1) fillRR(ctx, px + 6, top + 1 - armSwing, 3, 9, 1.5, sleeve);
  if (d !== 3) circle(ctx, px - 7.5, top + 10.5 + armSwing, 1.8, skin);
  if (d !== 1) circle(ctx, px + 7.5, top + 10.5 - armSwing, 1.8, skin);

  // bó hoa cô dâu
  if (role === 'bride' && front) {
    flower(ctx, px - 2, top + 9, 3, '#f48fb1');
    flower(ctx, px + 2.5, top + 10, 3, '#ffffff');
  }

  // đầu
  const hy = by - 24;
  circle(ctx, px, hy, 7.5, skin);

  if (back) {
    // nhìn từ sau: tóc che gần hết đầu
    ctx.beginPath();
    ctx.ellipse(px, hy - 1, 8, 7.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = hairC;
    ctx.fill();
    if (look.hair === 'bun' || role === 'bride') circle(ctx, px, hy - 6, 3.5, hairC);
    if (look.hair === 'ponytail') fillRR(ctx, px - 2.5, hy + 2, 5, 10, 2.5, hairC);
  } else {
    // mái tóc
    ctx.beginPath();
    ctx.ellipse(px, hy - 2.5, 8, 6, 0, Math.PI, Math.PI * 2);
    ctx.fillStyle = hairC;
    ctx.fill();
    const side = d === 1 ? -1 : d === 3 ? 1 : 0;
    ctx.fillRect(px - 8 + (side > 0 ? 9 : 0), hy - 3, side ? 7 : 3, side ? 5 : 6);
    if (!side) ctx.fillRect(px + 5, hy - 3, 3, 6);
    switch (look.hair) {
      case 'bun':
        circle(ctx, px, hy - 9, 3.5, hairC);
        break;
      case 'curly':
        for (let i = 0; i < 7; i++) circle(ctx, px - 7 + i * 2.3, hy - 7 + (i % 2) * 1.5, 2.6, hairC);
        break;
      case 'spiky':
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const sx = px - 7 + i * 3.5;
          ctx.moveTo(sx, hy - 6); ctx.lineTo(sx + 1.7, hy - 12); ctx.lineTo(sx + 3.5, hy - 6);
        }
        ctx.fillStyle = hairC;
        ctx.fill();
        break;
      case 'ponytail':
        if (side) fillRR(ctx, px - side * 9 - 2, hy - 4, 4, 9, 2, hairC);
        break;
    }
    if (role === 'bride') {
      circle(ctx, px, hy - 9, 3.5, hairC);
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(px - 4, hy - 7.5, 8, 1.6); // vương miện nhỏ
    }
    // mắt
    ctx.fillStyle = '#2b2b2b';
    if (front) {
      circle(ctx, px - 2.8, hy + 0.5, 1.15, '#2b2b2b');
      circle(ctx, px + 2.8, hy + 0.5, 1.15, '#2b2b2b');
      circle(ctx, px - 4.6, hy + 2.6, 1.3, 'rgba(255,120,140,0.35)');
      circle(ctx, px + 4.6, hy + 2.6, 1.3, 'rgba(255,120,140,0.35)');
      ctx.beginPath();
      ctx.arc(px, hy + 2.6, 1.6, 0.2, Math.PI - 0.2);
      ctx.strokeStyle = '#8d4b3a';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    } else {
      circle(ctx, px + side * 3.5, hy + 0.5, 1.15, '#2b2b2b');
    }
  }
}

export function drawNameTag(ctx: Ctx, px: number, py: number, name: string, role: Role, me: boolean) {
  const label = (role === 'bride' ? '👰 ' : role === 'groom' ? '🤵 ' : '') + name;
  ctx.font = `${me ? 700 : 600} 10px "Segoe UI", system-ui, sans-serif`;
  const w = ctx.measureText(label).width + 10;
  const y = py + 5;
  fillRR(ctx, px - w / 2, y, w, 14, 7, role !== 'guest' ? 'rgba(229,57,80,0.9)' : me ? 'rgba(108,92,231,0.9)' : 'rgba(30,30,40,0.6)');
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(label, px, y + 10.5);
  ctx.textAlign = 'start';
}

export function drawBubble(ctx: Ctx, px: number, py: number, text: string, alpha: number) {
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  const maxW = 150;
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, 4);
  if (lines.length > 4) shown[3] += '…';
  const w = Math.min(maxW, Math.max(...shown.map((l) => ctx.measureText(l).width))) + 14;
  const h = shown.length * 15 + 8;
  const x = px - w / 2, y = py - 44 - h;
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 4;
  fillRR(ctx, x, y, w, h, 8, '#ffffff');
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(px - 5, y + h - 0.5); ctx.lineTo(px, y + h + 6); ctx.lineTo(px + 5, y + h - 0.5);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.textAlign = 'center';
  shown.forEach((l, i) => ctx.fillText(l, px, y + 16 + i * 15));
  ctx.textAlign = 'start';
  ctx.globalAlpha = 1;
}

export { heart, flower, circle };
