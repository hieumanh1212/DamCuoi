// Nhân vật chibi: giới tính, 16 kiểu tóc, 17 trang phục, 5 kiểu quần/váy, 14 phụ kiện, 6 khuôn mặt — vẽ 3 hướng
import {
  CLOTH_COLORS, FULL_BODY, HAIR_COLORS, SKINS, weddingLook, type Look, type Role,
} from '../../../shared/look';
import { ball, ellipse, fillRR, flower, shade, softShadow, vgrad, type Ctx } from './draw';

export interface CharPose {
  d: number; // 0 xuống (nhìn về phía người xem), 1 trái, 2 lên (quay lưng), 3 phải
  walk: number; // pha bước chân (radian), -1 = đứng yên
  sitting: boolean;
}

const R = 10; // bán kính đầu

interface P {
  ctx: Ctx;
  px: number;
  by: number; // chân
  hy: number; // tâm đầu
  top: number; // vai
  side: number; // -1 trái, 1 phải, 0 trước/sau
  front: boolean;
  back: boolean;
  look: Look;
  skin: string;
  hair: string;
  topC: string;
  botC: string;
  accC: string;
  female: boolean;
  walk: number; // -1..1
}

export function drawCharacter(ctx: Ctx, px: number, py: number, rawLook: Look, role: Role, pose: CharPose) {
  const look = weddingLook(rawLook, role);
  const walking = pose.walk >= 0 && !pose.sitting;
  const sw = walking ? Math.sin(pose.walk) : 0;
  const bob = walking ? Math.abs(sw) * 1.6 : Math.sin(performance.now() / 600) * 0.35;
  const by = py - bob + (pose.sitting ? 5 : 0);
  const p: P = {
    ctx, px, by, hy: by - 27, top: by - 16,
    side: pose.d === 1 ? -1 : pose.d === 3 ? 1 : 0,
    front: pose.d === 0, back: pose.d === 2,
    look,
    skin: SKINS[look.skin] ?? SKINS[1],
    hair: HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0],
    topC: CLOTH_COLORS[look.topColor] ?? '#1e88e5',
    botC: CLOTH_COLORS[look.bottomColor] ?? '#1f2430',
    accC: CLOTH_COLORS[look.accColor] ?? '#e53935',
    female: look.gender === 'female',
    walk: sw,
  };

  softShadow(ctx, px, py + 1, look.top === 'gown' ? 15 : 12, 4.5, 0.28);

  // lớp sau lưng
  if (!p.back) {
    if (look.accessory === 'veil') veil(p, 0.7);
    hairBehind(p);
  }
  if (p.back && look.top === 'hoodie') ball(ctx, px, p.top + 1, 6, shade(p.topC, -0.1));

  if (!pose.sitting) legs(p);
  body(p);
  arms(p);
  if (role === 'bride' && p.front) bouquet(p);

  head(p);
  if (p.back) {
    hairBack(p);
    if (look.accessory === 'veil') veil(p, 0.85);
  } else {
    face(p);
    hairFront(p);
  }
  accessory(p);
}

// ───────── Chân & quần ─────────
function legs(p: P) {
  const { ctx, px, by, look } = p;
  const t = look.top;
  if (t === 'gown' || t === 'mermaid' || t === 'longdress') {
    // chỉ thấy mũi giày dưới gấu váy
    if (t !== 'gown') for (const lx of [-3, 3]) ellipse(ctx, px + lx, by + 0.5, 2.8, 1.8, p.female ? '#8d2a3b' : '#2e2a2a');
    return;
  }
  const covers = FULL_BODY.includes(t) ? null : look.bottom;
  const pantsC = t === 'overall' ? p.topC : t === 'aodai' || t === 'aodaicuoi' ? p.botC : p.botC;
  const l = p.walk * 2.2;
  const shoe = p.female ? '#8d2a3b' : '#2e2a2a';
  for (const [lx, lift] of [[-3.6, Math.max(0, l)], [3.6, Math.max(0, -l)]] as const) {
    const y0 = by - 7 + lift * 0.5, h = 6 - lift * 0.5;
    let legC = pantsC;
    if (t === 'dress' || covers === 'skirt' || covers === 'miniskirt') legC = p.skin;
    if (covers === 'shorts') {
      fillRR(ctx, px + lx - 2.2, y0, 4.4, h, 2, p.skin);
      fillRR(ctx, px + lx - 2.4, y0, 4.8, h * 0.5, 1.5, vgrad(ctx, y0, y0 + 3, pantsC, 0.1, -0.2));
    } else {
      fillRR(ctx, px + lx - 2.2, y0, 4.4, h, 2, vgrad(ctx, y0, by - 1, legC, 0.1, -0.2));
      if (covers === 'jeans' && legC === pantsC) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(px + lx - 0.3, y0, 0.6, h);
      }
    }
    ellipse(ctx, px + lx + p.side, by - 1 - lift * 0.6, 3.3, 2.2, shoe);
    ball(ctx, px + lx - 0.8 + p.side, by - 1.8 - lift * 0.6, 0.8, 'rgba(255,255,255,0.35)');
  }
  // váy/chân váy
  if (covers === 'skirt' || covers === 'miniskirt') {
    const bottom = covers === 'skirt' ? by - 2.5 : by - 4.5;
    ctx.beginPath();
    ctx.moveTo(px - 5.8, by - 7);
    ctx.lineTo(px + 5.8, by - 7);
    ctx.lineTo(px + 8.5, bottom);
    ctx.quadraticCurveTo(px, bottom + 1.5, px - 8.5, bottom);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, by - 7, bottom, p.botC, 0.15, -0.2);
    ctx.fill();
  }
}

// ───────── Thân & trang phục ─────────
function torso(p: P, fill: string | CanvasGradient, bottom: number, sw?: number, ww?: number) {
  const { ctx, px, top } = p;
  const s = sw ?? (p.female ? 6.8 : 7.6);
  const w = ww ?? (p.female ? 6 : 7.2);
  ctx.beginPath();
  ctx.moveTo(px - s + 2.5, top);
  ctx.lineTo(px + s - 2.5, top);
  ctx.quadraticCurveTo(px + s, top, px + s, top + 3);
  ctx.lineTo(px + w, bottom - 1.5);
  ctx.quadraticCurveTo(px + w, bottom, px + w - 2, bottom);
  ctx.lineTo(px - w + 2, bottom);
  ctx.quadraticCurveTo(px - w, bottom, px - w, bottom - 1.5);
  ctx.lineTo(px - s, top + 3);
  ctx.quadraticCurveTo(px - s, top, px - s + 2.5, top);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function bell(p: P, fill: string | CanvasGradient, waist: number, hem: number, width: number, curve = 4) {
  const { ctx, px } = p;
  ctx.beginPath();
  ctx.moveTo(px - 5, waist);
  ctx.lineTo(px + 5, waist);
  ctx.bezierCurveTo(px + 7, waist + 4, px + width, hem - curve, px + width, hem);
  ctx.quadraticCurveTo(px, hem + 3, px - width, hem);
  ctx.bezierCurveTo(px - width, hem - curve, px - 7, waist + 4, px - 5, waist);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function vNeck(p: P, inner: string, depth = 6) {
  if (!p.front) return;
  const { ctx, px, top } = p;
  ctx.beginPath();
  ctx.moveTo(px - 3.3, top); ctx.lineTo(px + 3.3, top); ctx.lineTo(px, top + depth); ctx.closePath();
  ctx.fillStyle = inner;
  ctx.fill();
}

function body(p: P) {
  const { ctx, px, by, top, look, front } = p;
  const c = p.topC;
  const g = (col = c) => vgrad(ctx, top, by, col, 0.22, -0.2);
  const hem = by - 5.5;
  switch (look.top) {
    case 'tshirt':
      torso(p, g(), hem);
      if (front) ellipse(ctx, px, top + 0.5, 2.6, 1.6, p.skin);
      break;
    case 'shirt':
      torso(p, g(), hem);
      if (front) {
        ctx.fillStyle = shade(c, -0.15);
        ctx.beginPath(); ctx.moveTo(px - 3.5, top); ctx.lineTo(px, top + 3); ctx.lineTo(px - 1.5, top + 4.5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(px + 3.5, top); ctx.lineTo(px, top + 3); ctx.lineTo(px + 1.5, top + 4.5); ctx.fill();
        for (let i = 0; i < 3; i++) ball(ctx, px, top + 5 + i * 2.5, 0.55, '#ffffff');
      }
      break;
    case 'hoodie':
      torso(p, g(), hem + 0.5, p.female ? 7.2 : 8, p.female ? 6.8 : 7.6);
      if (front) {
        ellipse(ctx, px, top + 1, 4.5, 2.2, shade(c, -0.18));
        fillRR(ctx, px - 4, top + 6.5, 8, 3.5, 1.5, shade(c, -0.12));
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(px - 1.5, top + 1.5); ctx.lineTo(px - 1.5, top + 4.5); ctx.moveTo(px + 1.5, top + 1.5); ctx.lineTo(px + 1.5, top + 4.5); ctx.stroke();
      }
      break;
    case 'sweater':
      torso(p, g(), hem);
      ctx.fillStyle = shade(c, -0.15);
      ctx.fillRect(px - (p.female ? 6 : 7.2), hem - 2, p.female ? 12 : 14.4, 2);
      if (front) ellipse(ctx, px, top + 0.6, 3, 1.6, shade(c, -0.2));
      if (front) for (let i = 0; i < 3; i++) ball(ctx, px - 3 + i * 3, top + 5, 0.9, shade(c, 0.35));
      break;
    case 'suit':
    case 'tux':
    case 'whitesuit': {
      const jc = look.top === 'tux' ? '#23262f' : look.top === 'whitesuit' ? '#f7f5f0' : c;
      torso(p, g(jc), hem + 0.5);
      vNeck(p, '#ffffff', 7);
      if (front) {
        ctx.fillStyle = shade(jc, -0.3);
        ctx.beginPath(); ctx.moveTo(px - 3.3, top); ctx.lineTo(px - 0.8, top + 6.5); ctx.lineTo(px - 5, top + 3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(px + 3.3, top); ctx.lineTo(px + 0.8, top + 6.5); ctx.lineTo(px + 5, top + 3); ctx.fill();
        if (look.top === 'suit') {
          ctx.fillStyle = '#c62828';
          ctx.fillRect(px - 0.8, top + 1.5, 1.6, 5.5);
        } else {
          ctx.fillStyle = look.top === 'tux' ? '#d32f2f' : '#1f2430';
          ctx.beginPath();
          ctx.moveTo(px, top + 2); ctx.lineTo(px - 3.2, top + 0.6); ctx.lineTo(px - 3.2, top + 3.4);
          ctx.moveTo(px, top + 2); ctx.lineTo(px + 3.2, top + 0.6); ctx.lineTo(px + 3.2, top + 3.4);
          ctx.fill();
          ball(ctx, px - 5, top + 4.5, 1.6, '#e53935');
        }
        ball(ctx, px, top + 9, 0.7, 'rgba(255,255,255,0.7)');
      }
      break;
    }
    case 'blazer':
      torso(p, g('#ffffff'), hem);
      if (front) {
        ctx.fillStyle = g();
        ctx.beginPath(); ctx.moveTo(px - 7.5, top + 2); ctx.lineTo(px - 2.5, top); ctx.lineTo(px - 1.5, hem); ctx.lineTo(px - 7, hem); ctx.fill();
        ctx.beginPath(); ctx.moveTo(px + 7.5, top + 2); ctx.lineTo(px + 2.5, top); ctx.lineTo(px + 1.5, hem); ctx.lineTo(px + 7, hem); ctx.fill();
      } else torso(p, g(), hem);
      break;
    case 'jacket':
      torso(p, g(), hem + 0.5, p.female ? 7.2 : 8, p.female ? 6.5 : 7.6);
      if (front) {
        ctx.fillStyle = shade(c, -0.25);
        ctx.fillRect(px - 0.4, top + 1, 0.8, hem - top - 1);
        fillRR(ctx, px - 4.5, top - 1, 9, 3, 1.5, shade(c, -0.15));
      }
      break;
    case 'overall':
      torso(p, g('#ffffff'), hem);
      fillRR(ctx, px - 5, top + 4, 10, hem - top - 3.5, 2, g());
      if (front) {
        ctx.fillStyle = g();
        ctx.fillRect(px - 5, top, 1.6, 5); ctx.fillRect(px + 3.4, top, 1.6, 5);
        ball(ctx, px - 4.2, top + 4.5, 0.9, '#ffd54f'); ball(ctx, px + 4.2, top + 4.5, 0.9, '#ffd54f');
        fillRR(ctx, px - 2.5, top + 6, 5, 3, 1, shade(c, -0.12));
      }
      break;
    case 'aobaba':
      torso(p, g(), hem + 1.5, p.female ? 7.2 : 8, p.female ? 7.2 : 8);
      if (front) {
        ellipse(ctx, px, top + 0.5, 2.6, 1.5, p.skin);
        for (let i = 0; i < 4; i++) ball(ctx, px, top + 3 + i * 2.3, 0.6, shade(c, -0.35));
      }
      break;
    case 'aodai':
    case 'aodaicuoi': {
      const ac = look.top === 'aodaicuoi' && look.topColor === 0 ? '#c62828' : c;
      torso(p, g(ac), by - 7, 6.8, p.female ? 5.8 : 6.6);
      const flap = p.walk * 1.5;
      ctx.beginPath();
      ctx.moveTo(px - 5, by - 8); ctx.lineTo(px + 5, by - 8);
      ctx.lineTo(px + 4.6 + flap, by - 0.5); ctx.lineTo(px - 4.6 + flap, by - 0.5);
      ctx.closePath();
      ctx.fillStyle = vgrad(ctx, by - 8, by, ac, 0.05, -0.25);
      ctx.fill();
      fillRR(ctx, px - 2.5, top - 1, 5, 3, 1, shade(ac, -0.2));
      if (look.top === 'aodaicuoi') {
        for (let i = 0; i < 5; i++) ball(ctx, px - 3 + (i % 3) * 3 + flap * (i > 2 ? 1 : 0), top + 4 + i * 2.6, 0.9, '#ffd54f');
        ctx.strokeStyle = '#ffd54f';
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.arc(px, top + 6, 3, 0, Math.PI * 2); ctx.stroke();
      }
      break;
    }
    case 'dress':
      torso(p, g(), by - 9, 6.4, 5.4);
      bell(p, vgrad(ctx, by - 10, by - 3, c, 0.15, -0.22), by - 10, by - 3.5, 10, 3);
      ctx.fillStyle = shade(c, -0.3);
      ctx.fillRect(px - 5, by - 10.5, 10, 1.4);
      break;
    case 'longdress':
      torso(p, g(), by - 9, 6.4, 5.4);
      bell(p, vgrad(ctx, by - 10, by + 1, c, 0.15, -0.22), by - 10, by + 0.5, 9, 6);
      break;
    case 'gown': {
      torso(p, g(), by - 9, 6.2, 5);
      const gg = ctx.createLinearGradient(px - 15, 0, px + 15, 0);
      gg.addColorStop(0, shade(c, -0.08));
      gg.addColorStop(0.4, shade(c, 0.25));
      gg.addColorStop(1, shade(c, -0.15));
      bell(p, gg, by - 10, by + 2, 15, 8);
      for (let i = -12; i <= 12; i += 3) ball(ctx, px + i, by + 2.6, 0.9, 'rgba(210,200,225,0.9)');
      if (p.front) {
        ctx.strokeStyle = 'rgba(200,190,220,0.9)';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(px - 5, top + 3); ctx.quadraticCurveTo(px, top + 6, px + 5, top + 3); ctx.stroke();
      }
      break;
    }
    case 'mermaid': {
      torso(p, g(), by - 9, 6.2, 5);
      ctx.beginPath();
      ctx.moveTo(px - 5, by - 10); ctx.lineTo(px + 5, by - 10);
      ctx.quadraticCurveTo(px + 6, by - 5, px + 3.5, by - 3);
      ctx.quadraticCurveTo(px + 11, by + 0, px + 11, by + 2);
      ctx.quadraticCurveTo(px, by + 3.5, px - 11, by + 2);
      ctx.quadraticCurveTo(px - 11, by + 0, px - 3.5, by - 3);
      ctx.quadraticCurveTo(px - 6, by - 5, px - 5, by - 10);
      ctx.closePath();
      ctx.fillStyle = vgrad(ctx, by - 10, by + 2, c, 0.25, -0.15);
      ctx.fill();
      break;
    }
  }
}

function arms(p: P) {
  const { ctx, px, top, look, side } = p;
  const t = look.top;
  const bare = t === 'gown' || t === 'mermaid' || t === 'dress' || t === 'longdress';
  const short = t === 'tshirt' || t === 'overall';
  const jc = t === 'tux' ? '#23262f' : t === 'whitesuit' ? '#f7f5f0' : t === 'aodaicuoi' && look.topColor === 0 ? '#c62828' : p.topC;
  const sleeve = bare ? p.skin : t === 'overall' ? '#ffffff' : jc;
  const sw = p.walk ? p.walk * 2.2 : 0;
  const off = p.female ? 8.4 : 9.2;
  const arm = (ax: number, dy: number) => {
    fillRR(ctx, ax - 2.2, top + 1 + dy, 4.4, 9, 2.2, vgrad(ctx, top, top + 10, p.skin, 0.2, -0.2));
    if (!bare) fillRR(ctx, ax - 2.3, top + 0.5 + dy, 4.6, short ? 4.5 : 9, 2.2, vgrad(ctx, top, top + 10, sleeve, 0.2, -0.2));
    ball(ctx, ax, top + 10.5 + dy, 2.2, p.skin);
  };
  if (side !== 1) arm(px - off, sw);
  if (side !== -1) arm(px + off, -sw);
}

function bouquet(p: P) {
  const { ctx, px, top } = p;
  ctx.fillStyle = '#66bb6a';
  ctx.fillRect(px - 1, top + 10, 2, 4);
  flower(ctx, px - 2.5, top + 9, 3.2, '#f48fb1');
  flower(ctx, px + 2.5, top + 10, 3.2, '#ffffff');
  flower(ctx, px, top + 6.5, 2.8, '#ffcdd2');
}

// ───────── Đầu & mặt ─────────
function head(p: P) {
  const { ctx, px, hy, skin, front, side, back } = p;
  const hg = ctx.createRadialGradient(px - 3.5, hy - 4, 1, px, hy, R + 1);
  hg.addColorStop(0, shade(skin, 0.25));
  hg.addColorStop(0.7, skin);
  hg.addColorStop(1, shade(skin, -0.15));
  if (!back) {
    if (front) { ball(ctx, px - R + 0.5, hy + 1.5, 2.3, skin); ball(ctx, px + R - 0.5, hy + 1.5, 2.3, skin); }
    else ball(ctx, px - side * 2.5, hy + 1.5, 2.3, skin);
  }
  ctx.beginPath();
  ctx.arc(px, hy, R, 0, Math.PI * 2);
  ctx.fillStyle = hg;
  ctx.fill();
}

function face(p: P) {
  const { ctx, px, hy, side, front, female, look } = p;
  const dark = '#2b1f22';
  const eyeAt = front ? [px - 3.7, px + 3.7] : [px + side * 4.6];
  const lashes = (ex: number, dir: number) => {
    if (!female) return;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(ex + dir * 1.4, hy - 0.2); ctx.lineTo(ex + dir * 2.6, hy - 1.2); ctx.stroke();
  };
  const arcEye = (ex: number, up: boolean) => {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (up) ctx.arc(ex, hy + 2.6, 1.9, Math.PI * 1.15, Math.PI * 1.85);
    else ctx.arc(ex, hy + 0.8, 1.9, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.lineCap = 'butt';
  };
  const roundEye = (ex: number, big = false) => {
    ellipse(ctx, ex, hy + 2, big ? 2.1 : 1.7, big ? 2.8 : 2.4, dark);
    ball(ctx, ex + 0.6, hy + 0.9, big ? 0.95 : 0.75, '#ffffff');
    ball(ctx, ex - 0.5, hy + 3.1, 0.38, 'rgba(255,255,255,0.85)');
    if (big) ball(ctx, ex - 0.7, hy + 1.2, 0.4, '#ffffff');
  };
  eyeAt.forEach((ex, i) => {
    const dir = front ? (i === 0 ? -1 : 1) : side;
    switch (look.face) {
      case 'happy': arcEye(ex, true); break;
      case 'calm': arcEye(ex, false); break;
      case 'sparkle': roundEye(ex, true); break;
      case 'wink': if (front && i === 1) arcEye(ex, true); else roundEye(ex); break;
      default: roundEye(ex);
    }
    lashes(ex, dir);
  });
  // má hồng
  const cheeks = front ? [px - 6, px + 6] : [px + side * 5.5];
  for (const cx of cheeks) ellipse(ctx, cx, hy + 5.2, 2, 1.2, 'rgba(255,110,130,0.42)');
  // miệng
  const mx = front ? px : px + side * 6;
  ctx.strokeStyle = female ? '#c2185b' : '#8d4b3a';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  if (look.face === 'cat') {
    ctx.arc(mx - 1, hy + 5.2, 1, 0, Math.PI);
    ctx.moveTo(mx + 2, hy + 5.2);
    ctx.arc(mx + 1, hy + 5.2, 1, 0, Math.PI);
    ctx.stroke();
  } else if (look.face === 'happy' || look.face === 'wink') {
    ctx.moveTo(mx - 1.8, hy + 4.8);
    ctx.quadraticCurveTo(mx, hy + 7.4, mx + 1.8, hy + 4.8);
    ctx.closePath();
    ctx.fillStyle = '#e57373';
    ctx.fill();
  } else {
    ctx.arc(mx, hy + 5, front ? 1.5 : 1, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }
}

// ───────── Tóc ─────────
const hairGrad = (p: P) => vgrad(p.ctx, p.hy - R - 3, p.hy + 4, p.hair, 0.28, -0.12);

function shine(p: P) {
  const { ctx, px, hy } = p;
  ctx.beginPath();
  ctx.arc(px - 1, hy - 1, R - 2.5, Math.PI * 1.15, Math.PI * 1.42);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** Phần tóc nằm sau đầu/thân khi nhìn từ trước hoặc ngang */
function hairBehind(p: P) {
  const { ctx, px, hy, side } = p;
  const g = vgrad(ctx, hy, hy + 18, p.hair, 0.05, -0.25);
  switch (p.look.hair) {
    case 'long':
      fillRR(ctx, px - R - 1.5, hy - 2, 2 * R + 3, 19, 7, g);
      break;
    case 'wavy':
      fillRR(ctx, px - R - 1, hy - 2, 2 * R + 2, 17, 7, g);
      for (let i = 0; i < 5; i++) { ball(ctx, px - R - 1, hy + 2 + i * 3.6, 2.6, p.hair); ball(ctx, px + R + 1, hy + 2 + i * 3.6, 2.6, p.hair); }
      break;
    case 'afro':
      ball(ctx, px, hy - 2, R + 6, p.hair);
      break;
    case 'bob':
      fillRR(ctx, px - R - 1.5, hy - 3, 2 * R + 3, 12, 6, g);
      break;
    case 'ponytail':
      ellipse(ctx, side ? px - side * (R + 2) : px + R + 1, hy + 4, 3.2, 7.5, g, side ? -side * 0.3 : -0.3);
      break;
    case 'braid':
      if (side) for (let i = 0; i < 5; i++) ball(ctx, px - side * (R - 1), hy + 4 + i * 3, 2.4, i % 2 ? shade(p.hair, -0.1) : p.hair);
      break;
  }
}

function hairFront(p: P) {
  const { ctx, px, hy, side, look } = p;
  const g = hairGrad(p);
  const s = look.hair;
  if (s === 'bald') return shine(p);
  if (s === 'mohawk') {
    ctx.fillStyle = g;
    ctx.beginPath();
    if (side) {
      for (let i = 0; i < 5; i++) {
        const x0 = px - side * 6 + side * i * 3;
        ctx.moveTo(x0 - 1.5, hy - R + 2); ctx.lineTo(x0, hy - R - 6 + Math.abs(i - 2)); ctx.lineTo(x0 + 1.5, hy - R + 2);
      }
    } else {
      ctx.moveTo(px - 2.8, hy - R + 3); ctx.lineTo(px, hy - R - 8); ctx.lineTo(px + 2.8, hy - R + 3);
    }
    ctx.fill();
    ellipse(ctx, px, hy - R + 2.5, 3.2, 2.5, g);
    return shine(p);
  }
  // nền mái tóc
  const capR = s === 'buzz' ? R + 0.4 : s === 'afro' ? R + 3 : R + 1.2;
  ctx.beginPath();
  ctx.ellipse(px, hy - (s === 'buzz' ? 0.5 : 1.5), capR, s === 'buzz' ? R * 0.85 : R + 0.6, 0, Math.PI, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  if (side) {
    ellipse(ctx, px - side * 3.2, hy + 0.5, R * 0.78, R * 0.95, g);
    if (s !== 'buzz') ellipse(ctx, px + side * 3, hy - 2.5, 6, 3.6, g, side * 0.3);
  } else if (s === 'sidepart') {
    ellipse(ctx, px - 3, hy - 3.5, 8, 4.2, g, 0.25);
    ellipse(ctx, px + 6, hy - 2.5, 3.5, 3.5, g);
  } else if (s !== 'buzz' && s !== 'afro') {
    ellipse(ctx, px - 5, hy - 2.6, 5.2, 4, g, 0.25);
    ellipse(ctx, px + 0.5, hy - 3.2, 5.4, 3.8, g);
    ellipse(ctx, px + 5.5, hy - 2.6, 4.6, 3.8, g, -0.25);
  }
  // tóc hai bên má
  const longSides = ['long', 'wavy', 'bob', 'braid', 'twintails', 'ponytail', 'bun', 'spacebuns'].includes(s);
  if (!side && longSides) {
    const len = s === 'bob' ? 9 : s === 'long' || s === 'wavy' ? 15 : 8;
    fillRR(ctx, px - R - 1.2, hy - 2, 3.6, len, 1.8, g);
    fillRR(ctx, px + R - 2.4, hy - 2, 3.6, len, 1.8, g);
  }
  switch (s) {
    case 'spiky':
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const sx = px - 9 + i * 3.6;
        ctx.moveTo(sx, hy - 6); ctx.lineTo(sx + 1.8, hy - 14 + (i % 2) * 2); ctx.lineTo(sx + 3.6, hy - 6);
      }
      ctx.fill();
      break;
    case 'curly':
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        ball(ctx, px + Math.cos(a) * (R + 0.5), hy - 1 + Math.sin(a) * (R + 0.5), 3.3, p.hair);
      }
      break;
    case 'afro':
      for (let i = 0; i < 7; i++) ball(ctx, px - 9 + i * 3, hy - R + 1 + (i % 2) * 1.5, 3, shade(p.hair, 0.08));
      break;
    case 'bun':
      ball(ctx, px, hy - R - 2.5, 4.8, p.hair);
      break;
    case 'spacebuns':
      ball(ctx, px - 7, hy - R + 0.5, 4.2, p.hair);
      ball(ctx, px + 7, hy - R + 0.5, 4.2, p.hair);
      break;
    case 'twintails':
      for (const dx of side ? [-side] : [-1, 1]) {
        ellipse(ctx, px + dx * (R + 2.5), hy + 5, 3.2, 8, vgrad(ctx, hy - 3, hy + 13, p.hair, 0.2, -0.2), dx * 0.2);
        ball(ctx, px + dx * (R + 1.5), hy - 2, 1.6, CLOTH_COLORS[p.look.accColor] ?? '#e53935');
      }
      break;
    case 'braid':
      if (!side) for (let i = 0; i < 5; i++) ball(ctx, px + R - 0.5, hy + 4 + i * 3, 2.4, i % 2 ? shade(p.hair, -0.1) : p.hair);
      break;
  }
  shine(p);
}

function hairBack(p: P) {
  const { ctx, px, hy, by, look } = p;
  const g = hairGrad(p);
  const s = look.hair;
  if (s === 'afro') ball(ctx, px, hy - 1, R + 6, p.hair);
  if (s === 'long' || s === 'wavy') fillRR(ctx, px - R - 1.5, hy - 2, 2 * R + 3, by - hy - 5, 8, vgrad(ctx, hy, by, p.hair, 0.1, -0.25));
  if (s === 'bob') fillRR(ctx, px - R - 1.5, hy - 2, 2 * R + 3, 11, 6, g);
  if (s !== 'bald' && s !== 'mohawk') ellipse(ctx, px, hy - 0.5, s === 'buzz' ? R + 0.3 : R + 1.2, s === 'buzz' ? R : R + 0.6, g);
  switch (s) {
    case 'mohawk':
      ellipse(ctx, px, hy - 3, 3, R - 1, g);
      break;
    case 'bun':
      ball(ctx, px, hy - 6, 4.8, p.hair);
      break;
    case 'spacebuns':
      ball(ctx, px - 7, hy - R + 0.5, 4.2, p.hair);
      ball(ctx, px + 7, hy - R + 0.5, 4.2, p.hair);
      break;
    case 'ponytail':
      ellipse(ctx, px, hy + 9, 3.4, 7.5, vgrad(ctx, hy + 2, hy + 16, p.hair, 0.15, -0.2));
      break;
    case 'braid':
      for (let i = 0; i < 6; i++) ball(ctx, px, hy + 6 + i * 3, 2.5, i % 2 ? shade(p.hair, -0.1) : p.hair);
      break;
    case 'twintails':
      for (const dx of [-1, 1]) ellipse(ctx, px + dx * (R + 2.5), hy + 5, 3.2, 8, p.hair, dx * 0.2);
      break;
    case 'curly':
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ball(ctx, px + Math.cos(a) * R, hy + Math.sin(a) * R, 3.2, p.hair);
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
  if (s !== 'bald') shine(p);
}

// ───────── Phụ kiện ─────────
function veil(p: P, a: number) {
  const { ctx, px, hy, by } = p;
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

function crown(p: P, small: boolean) {
  const { ctx, px, hy } = p;
  const s = small ? 0.75 : 1;
  ctx.fillStyle = vgrad(ctx, hy - R - 6, hy - R, '#ffd54f', 0.35, -0.2);
  ctx.beginPath();
  ctx.moveTo(px - 6 * s, hy - R + 1);
  ctx.lineTo(px - 6 * s, hy - R - 4 * s);
  ctx.lineTo(px - 3 * s, hy - R - 1.5 * s);
  ctx.lineTo(px, hy - R - 6 * s);
  ctx.lineTo(px + 3 * s, hy - R - 1.5 * s);
  ctx.lineTo(px + 6 * s, hy - R - 4 * s);
  ctx.lineTo(px + 6 * s, hy - R + 1);
  ctx.closePath();
  ctx.fill();
  ball(ctx, px, hy - R - 1 * s, 1.1 * s, '#e53935');
}

function accessory(p: P) {
  const { ctx, px, hy, side, front, back, look } = p;
  const c = p.accC;
  const dark = '#2b2b33';
  switch (look.accessory) {
    case 'glasses':
    case 'sunglasses': {
      if (back) return;
      const sun = look.accessory === 'sunglasses';
      const lens = (x: number) => {
        if (sun) fillRR(ctx, x - 2.8, hy + 0.2, 5.6, 3.8, 1.6, 'rgba(25,25,35,0.92)');
        else {
          ctx.beginPath();
          ctx.arc(x, hy + 2, 2.8, 0, Math.PI * 2);
          ctx.strokeStyle = dark;
          ctx.lineWidth = 0.9;
          ctx.stroke();
          ctx.fillStyle = 'rgba(200,230,255,0.25)';
          ctx.fill();
        }
      };
      if (front) {
        lens(px - 3.7); lens(px + 3.7);
        ctx.strokeStyle = dark;
        ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(px - 1, hy + 1.6); ctx.lineTo(px + 1, hy + 1.6); ctx.stroke();
      } else {
        lens(px + side * 4.6);
        ctx.strokeStyle = dark;
        ctx.beginPath(); ctx.moveTo(px + side * 1.8, hy + 1.5); ctx.lineTo(px - side * 3, hy + 1); ctx.stroke();
      }
      return;
    }
    case 'fedora':
      ellipse(ctx, px, hy - R + 2.5, R + 5, 3.2, vgrad(ctx, hy - R, hy - R + 5, c, 0.1, -0.3));
      fillRR(ctx, px - 7, hy - R - 6, 14, 9, 4, vgrad(ctx, hy - R - 6, hy - R + 3, c, 0.25, -0.15));
      ctx.fillStyle = '#212121';
      ctx.fillRect(px - 7, hy - R, 14, 2);
      return;
    case 'cap':
      ctx.beginPath();
      ctx.ellipse(px, hy - 2.5, R + 1.4, R, 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = vgrad(ctx, hy - R - 2, hy - 2, c, 0.3, -0.1);
      ctx.fill();
      if (front) ellipse(ctx, px, hy - 2.5, 8, 2.5, shade(c, -0.2));
      else if (side) ellipse(ctx, px + side * 9, hy - 2.5, 6, 2, shade(c, -0.2));
      ball(ctx, px, hy - R - 1, 1.3, shade(c, -0.15));
      return;
    case 'beret':
      ellipse(ctx, px - 2, hy - R + 0.5, R + 0.5, 4.2, vgrad(ctx, hy - R - 4, hy - R + 4, c, 0.3, -0.15), -0.15);
      ball(ctx, px - 2, hy - R - 3.5, 1.2, shade(c, -0.2));
      return;
    case 'bow': {
      const bx = side ? px - side * 3 : px + 5.5, by2 = hy - R + 1;
      ellipse(ctx, bx - 3, by2, 3.2, 2.3, vgrad(ctx, by2 - 2, by2 + 2, c, 0.3, -0.15), -0.3);
      ellipse(ctx, bx + 3, by2, 3.2, 2.3, vgrad(ctx, by2 - 2, by2 + 2, c, 0.3, -0.15), 0.3);
      ball(ctx, bx, by2, 1.5, shade(c, -0.1));
      return;
    }
    case 'flower':
      flower(ctx, side ? px - side * 6 : px - 7, hy - 5, 4.2, c);
      return;
    case 'headband':
      ctx.beginPath();
      ctx.ellipse(px, hy - 1, R + 0.8, R - 0.5, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.strokeStyle = c;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      if (front) ball(ctx, px + 5, hy - R + 1.5, 1.6, shade(c, 0.3));
      return;
    case 'crown':
      crown(p, false);
      return;
    case 'veil':
      crown(p, true);
      return;
    case 'khandong': {
      const kc = look.accColor === 0 ? '#c62828' : c;
      for (let i = 0; i < 3; i++) {
        ellipse(ctx, px, hy - 4 - i * 2.2, R + 1.5 - i * 0.8, 3.2, vgrad(ctx, hy - 8 - i * 2, hy - 1 - i * 2, kc, 0.3 - i * 0.05, -0.15));
      }
      ctx.strokeStyle = 'rgba(255,213,79,0.8)';
      ctx.lineWidth = 0.7;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(px, hy - 4 - i * 2.2, R + 1.5 - i * 0.8, 3.2, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); }
      return;
    }
    case 'bunny':
      for (const dx of [-4, 4]) {
        ellipse(ctx, px + dx, hy - R - 7, 2.6, 7, c === '#ffffff' ? '#ffffff' : c, dx * 0.03);
        ellipse(ctx, px + dx, hy - R - 6.5, 1.2, 5, '#f8bbd0');
      }
      return;
    case 'cat':
      for (const dx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(px + dx * 3, hy - R + 1.5); ctx.lineTo(px + dx * 7.5, hy - R - 6); ctx.lineTo(px + dx * 9.5, hy - R + 4);
        ctx.closePath();
        ctx.fillStyle = c;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px + dx * 4.6, hy - R + 2); ctx.lineTo(px + dx * 7.4, hy - R - 3.2); ctx.lineTo(px + dx * 8.6, hy - R + 3);
        ctx.closePath();
        ctx.fillStyle = '#f8bbd0';
        ctx.fill();
      }
      return;
  }
}
