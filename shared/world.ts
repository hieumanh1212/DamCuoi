// Thế giới: sảnh tiệc dạng lưới ô vuông, đồ trang trí, va chạm và tìm đường (dùng chung client/server)

export const TILE = 32;
export const HALL_W = 36;
export const HALL_H = 26;
/** Sân khấu (ô): cột STAGE.x0..x1, hàng STAGE.y0..y1 */
export const STAGE = { x0: 6, x1: 29, y0: 1, y1: 5 };
/** Cửa vào ở tường dưới */
export const DOOR = { x0: 16, x1: 19 };
export const SPAWN = { x: 17.5, y: HALL_H - 1.6 };

export type ItemType =
  | 'table_round' | 'table_long' | 'chair' | 'sofa' | 'buffet' | 'drinks'
  | 'backdrop' | 'arch' | 'cake' | 'champagne' | 'speaker' | 'mc' | 'piano' | 'dancefloor'
  | 'flowers' | 'plant' | 'balloons' | 'lantern' | 'lamp' | 'heart' | 'hy' | 'candles' | 'teddy'
  | 'giftpile' | 'love' | 'swan' | 'pillar' | 'welcome' | 'tree_lights' | 'fountain'
  | 'carpet' | 'petals' | 'rug'
  | 'table_square' | 'bench' | 'bar' | 'dessert' | 'fruit' | 'wine'
  | 'drums' | 'guitar' | 'dj' | 'spotlight' | 'screen' | 'mrmrs'
  | 'rose_wall' | 'heart_arch' | 'flower_stand' | 'vase_tall' | 'light_string' | 'chandelier' | 'ribbon'
  | 'bird_cage' | 'sakura' | 'mai' | 'dao' | 'palm' | 'pond' | 'lantern_hoian' | 'star_lamp'
  | 'rug_square' | 'grass' | 'heart_tile'
  | 'jukebox' | 'bell' | 'wishtree' | 'karaoke' | 'fireworks'
  | 'giftbox' | 'guestbook' | 'photo';

export type Layer = 'floor' | 'object';
export type Interact = 'gift' | 'guestbook' | 'photo' | 'sit' | 'music' | 'bell' | 'wish' | 'sing' | 'firework';

export interface ItemDef {
  type: ItemType;
  name: string;
  icon: string;
  w: number;
  h: number;
  layer: Layer;
  /** chặn đường đi */
  solid: boolean;
  interact?: Interact;
  /** xoay được (đổi hướng/đổi chiều dài) */
  rotatable?: boolean;
  /** đổi màu được (khăn bàn, đệm ghế, bóng bay...) */
  colorable?: boolean;
  /** nhóm trong danh mục trang trí */
  group: 'Bàn ghế' | 'Sân khấu' | 'Trang trí' | 'Sàn & thảm' | 'Tiện ích';
}

/** Bảng màu cho đồ trang trí. Màu 0 = theo màu chủ đạo của đám cưới */
export const ITEM_COLORS = [
  'accent', '#e53950', '#ff7aa8', '#ffc1d3', '#f8bbd0', '#c9a227', '#ffd54f', '#ffffff', '#f5e6c8',
  '#b39ddb', '#7e57c2', '#5c6bc0', '#90caf9', '#4fc3f7', '#80cbc4', '#26a69a', '#81c784',
  '#ffb74d', '#ff8a65', '#8d6e63', '#455a64', '#212121',
];

export const CATALOG: ItemDef[] = [
  { type: 'table_round', name: 'Bàn tròn', icon: '⚪', w: 2, h: 2, layer: 'object', solid: true, colorable: true, group: 'Bàn ghế' },
  { type: 'table_long', name: 'Bàn dài', icon: '▭', w: 3, h: 1, layer: 'object', solid: true, rotatable: true, colorable: true, group: 'Bàn ghế' },
  { type: 'chair', name: 'Ghế', icon: '🪑', w: 1, h: 1, layer: 'object', solid: false, interact: 'sit', rotatable: true, colorable: true, group: 'Bàn ghế' },
  { type: 'sofa', name: 'Sofa đôi', icon: '🛋️', w: 2, h: 1, layer: 'object', solid: false, interact: 'sit', rotatable: true, colorable: true, group: 'Bàn ghế' },
  { type: 'buffet', name: 'Bàn buffet', icon: '🍱', w: 3, h: 1, layer: 'object', solid: true, rotatable: true, colorable: true, group: 'Bàn ghế' },
  { type: 'drinks', name: 'Quầy nước', icon: '🍹', w: 1, h: 1, layer: 'object', solid: true, group: 'Bàn ghế' },
  { type: 'backdrop', name: 'Phông cưới', icon: '🖼️', w: 6, h: 1, layer: 'object', solid: true, group: 'Sân khấu' },
  { type: 'cake', name: 'Bánh cưới', icon: '🎂', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Sân khấu' },
  { type: 'champagne', name: 'Tháp ly', icon: '🥂', w: 1, h: 1, layer: 'object', solid: true, group: 'Sân khấu' },
  { type: 'speaker', name: 'Loa', icon: '🔊', w: 1, h: 1, layer: 'object', solid: true, group: 'Sân khấu' },
  { type: 'mc', name: 'Bục MC', icon: '🎤', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Sân khấu' },
  { type: 'piano', name: 'Đàn piano', icon: '🎹', w: 2, h: 2, layer: 'object', solid: true, group: 'Sân khấu' },
  { type: 'love', name: 'Chữ LOVE', icon: '💗', w: 2, h: 1, layer: 'object', solid: true, colorable: true, group: 'Sân khấu' },
  { type: 'arch', name: 'Cổng hoa', icon: '🌸', w: 4, h: 1, layer: 'object', solid: false, colorable: true, group: 'Trang trí' },
  { type: 'flowers', name: 'Chậu hoa', icon: '💐', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Trang trí' },
  { type: 'pillar', name: 'Cột hoa', icon: '🏛️', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Trang trí' },
  { type: 'plant', name: 'Cây xanh', icon: '🪴', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'tree_lights', name: 'Cây đèn', icon: '🌳', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'balloons', name: 'Bóng bay', icon: '🎈', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Trang trí' },
  { type: 'lantern', name: 'Đèn lồng', icon: '🏮', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Trang trí' },
  { type: 'lamp', name: 'Cột đèn', icon: '💡', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'candles', name: 'Nến', icon: '🕯️', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'heart', name: 'Biển trái tim', icon: '💖', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Trang trí' },
  { type: 'hy', name: 'Chữ Song Hỷ', icon: '囍', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'teddy', name: 'Gấu bông', icon: '🧸', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'giftpile', name: 'Chồng quà', icon: '🎀', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Trang trí' },
  { type: 'swan', name: 'Thiên nga', icon: '🦢', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'fountain', name: 'Đài phun nước', icon: '⛲', w: 2, h: 2, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'welcome', name: 'Bảng chào mừng', icon: '🪧', w: 2, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'table_square', name: 'Bàn vuông', icon: '⬜', w: 2, h: 2, layer: 'object', solid: true, colorable: true, group: 'Bàn ghế' },
  { type: 'bench', name: 'Ghế băng', icon: '🪑', w: 2, h: 1, layer: 'object', solid: false, interact: 'sit', rotatable: true, colorable: true, group: 'Bàn ghế' },
  { type: 'bar', name: 'Quầy bar', icon: '🍸', w: 3, h: 1, layer: 'object', solid: true, rotatable: true, group: 'Bàn ghế' },
  { type: 'dessert', name: 'Bàn tráng miệng', icon: '🧁', w: 2, h: 1, layer: 'object', solid: true, colorable: true, group: 'Bàn ghế' },
  { type: 'fruit', name: 'Tháp trái cây', icon: '🍇', w: 1, h: 1, layer: 'object', solid: true, group: 'Bàn ghế' },
  { type: 'wine', name: 'Xe rượu vang', icon: '🍷', w: 1, h: 1, layer: 'object', solid: true, group: 'Bàn ghế' },
  { type: 'drums', name: 'Bộ trống', icon: '🥁', w: 2, h: 2, layer: 'object', solid: true, colorable: true, group: 'Sân khấu' },
  { type: 'guitar', name: 'Đàn guitar', icon: '🎸', w: 1, h: 1, layer: 'object', solid: true, group: 'Sân khấu' },
  { type: 'dj', name: 'Bàn DJ', icon: '🎧', w: 2, h: 1, layer: 'object', solid: true, group: 'Sân khấu' },
  { type: 'spotlight', name: 'Đèn sân khấu', icon: '🔦', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Sân khấu' },
  { type: 'screen', name: 'Màn chiếu', icon: '📽️', w: 3, h: 1, layer: 'object', solid: true, group: 'Sân khấu' },
  { type: 'mrmrs', name: 'Chữ Mr & Mrs', icon: '💑', w: 2, h: 1, layer: 'object', solid: true, colorable: true, group: 'Sân khấu' },
  { type: 'rose_wall', name: 'Tường hoa hồng', icon: '🌹', w: 3, h: 1, layer: 'object', solid: true, rotatable: true, colorable: true, group: 'Trang trí' },
  { type: 'heart_arch', name: 'Cổng trái tim', icon: '💞', w: 3, h: 1, layer: 'object', solid: false, colorable: true, group: 'Trang trí' },
  { type: 'flower_stand', name: 'Lẵng hoa', icon: '💮', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Trang trí' },
  { type: 'vase_tall', name: 'Bình hoa cao', icon: '🏺', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Trang trí' },
  { type: 'light_string', name: 'Dây đèn', icon: '✨', w: 3, h: 1, layer: 'object', solid: false, colorable: true, group: 'Trang trí' },
  { type: 'chandelier', name: 'Đèn chùm', icon: '💎', w: 2, h: 2, layer: 'object', solid: false, group: 'Trang trí' },
  { type: 'ribbon', name: 'Nơ lớn', icon: '🎀', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Trang trí' },
  { type: 'bird_cage', name: 'Lồng chim hoa', icon: '🕊️', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Trang trí' },
  { type: 'lantern_hoian', name: 'Đèn lồng Hội An', icon: '🏮', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Trang trí' },
  { type: 'star_lamp', name: 'Đèn ông sao', icon: '⭐', w: 1, h: 1, layer: 'object', solid: true, colorable: true, group: 'Trang trí' },
  { type: 'sakura', name: 'Cây anh đào', icon: '🌸', w: 2, h: 2, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'mai', name: 'Cây mai vàng', icon: '🌼', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'dao', name: 'Cây đào', icon: '🌺', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'palm', name: 'Cây dừa', icon: '🌴', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'pond', name: 'Hồ sen', icon: '🪷', w: 2, h: 2, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'carpet', name: 'Thảm đỏ', icon: '🟥', w: 1, h: 1, layer: 'floor', solid: false, colorable: true, group: 'Sàn & thảm' },
  { type: 'rug', name: 'Thảm tròn', icon: '⭕', w: 2, h: 2, layer: 'floor', solid: false, colorable: true, group: 'Sàn & thảm' },
  { type: 'dancefloor', name: 'Sàn nhảy LED', icon: '🪩', w: 2, h: 2, layer: 'floor', solid: false, group: 'Sàn & thảm' },
  { type: 'petals', name: 'Cánh hoa', icon: '🌺', w: 1, h: 1, layer: 'floor', solid: false, colorable: true, group: 'Sàn & thảm' },
  { type: 'rug_square', name: 'Thảm vuông', icon: '🟪', w: 2, h: 2, layer: 'floor', solid: false, colorable: true, group: 'Sàn & thảm' },
  { type: 'heart_tile', name: 'Gạch trái tim', icon: '💟', w: 1, h: 1, layer: 'floor', solid: false, colorable: true, group: 'Sàn & thảm' },
  { type: 'grass', name: 'Thảm cỏ', icon: '🟩', w: 1, h: 1, layer: 'floor', solid: false, group: 'Sàn & thảm' },
  { type: 'jukebox', name: 'Máy hát', icon: '📻', w: 1, h: 1, layer: 'object', solid: true, interact: 'music', group: 'Tiện ích' },
  { type: 'bell', name: 'Chuông cưới', icon: '🔔', w: 1, h: 1, layer: 'object', solid: true, interact: 'bell', group: 'Tiện ích' },
  { type: 'wishtree', name: 'Cây điều ước', icon: '🌳', w: 2, h: 2, layer: 'object', solid: true, interact: 'wish', group: 'Tiện ích' },
  { type: 'karaoke', name: 'Micro karaoke', icon: '🎤', w: 1, h: 1, layer: 'object', solid: true, interact: 'sing', group: 'Tiện ích' },
  { type: 'fireworks', name: 'Bệ pháo hoa', icon: '🎆', w: 1, h: 1, layer: 'object', solid: true, interact: 'firework', group: 'Tiện ích' },
  { type: 'giftbox', name: 'Hòm mừng cưới', icon: '🎁', w: 1, h: 1, layer: 'object', solid: true, interact: 'gift', group: 'Tiện ích' },
  { type: 'guestbook', name: 'Sổ lưu bút', icon: '📖', w: 1, h: 1, layer: 'object', solid: true, interact: 'guestbook', group: 'Tiện ích' },
  { type: 'photo', name: 'Khung chụp ảnh', icon: '📸', w: 2, h: 1, layer: 'object', solid: true, interact: 'photo', group: 'Tiện ích' },
];

export const ITEM_DEFS = Object.fromEntries(CATALOG.map((d) => [d.type, d])) as Record<ItemType, ItemDef>;

/** rot: 0 = hướng xuống (mặc định), 1 = trái, 2 = lên, 3 = phải */
export interface Item {
  id: number;
  type: ItemType;
  x: number;
  y: number;
  rot: number;
  /** chỉ số trong ITEM_COLORS (0 / không có = theo màu chủ đạo) */
  color?: number;
}

export const MAX_ITEMS = 600;

export function itemSize(it: Pick<Item, 'type' | 'rot'>) {
  const d = ITEM_DEFS[it.type];
  const swap = d.rotatable && d.w !== d.h && it.rot % 2 === 1;
  return swap ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
}

export function itemTiles(it: Pick<Item, 'type' | 'rot' | 'x' | 'y'>): [number, number][] {
  const { w, h } = itemSize(it);
  const out: [number, number][] = [];
  for (let y = it.y; y < it.y + h; y++) for (let x = it.x; x < it.x + w; x++) out.push([x, y]);
  return out;
}

/** Ô nằm trong sảnh (không phải tường) */
export const insideHall = (x: number, y: number) => x >= 1 && y >= 1 && x < HALL_W - 1 && y < HALL_H - 1;

/** Có thể đặt món đồ tại vị trí này không (bỏ qua món có id = ignoreId khi đang di chuyển) */
export function canPlace(items: Item[], it: Pick<Item, 'type' | 'rot' | 'x' | 'y'>, ignoreId?: number): boolean {
  const def = ITEM_DEFS[it.type];
  if (!def) return false;
  const tiles = itemTiles(it);
  if (!tiles.every(([x, y]) => insideHall(x, y))) return false;
  const taken = new Set<string>();
  for (const o of items) {
    if (o.id === ignoreId || ITEM_DEFS[o.type]?.layer !== def.layer) continue;
    for (const [x, y] of itemTiles(o)) taken.add(`${x},${y}`);
  }
  return tiles.every(([x, y]) => !taken.has(`${x},${y}`));
}

export function sanitizeItem(raw: any): Omit<Item, 'id'> | null {
  if (!raw || typeof raw !== 'object' || !(raw.type in ITEM_DEFS)) return null;
  const x = Math.round(Number(raw.x));
  const y = Math.round(Number(raw.y));
  const rot = ((Math.round(Number(raw.rot)) % 4) + 4) % 4;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(rot)) return null;
  const def = ITEM_DEFS[raw.type as ItemType];
  const color = Number(raw.color);
  const out: Omit<Item, 'id'> = { type: raw.type, x, y, rot: def.rotatable ? rot : 0 };
  if (def.colorable && Number.isInteger(color) && color > 0 && color < ITEM_COLORS.length) out.color = color;
  return out;
}

// ───────── Va chạm & tìm đường ─────────

/** Lưới chặn: true = không đi qua được */
export function buildBlocked(items: Item[]): Uint8Array {
  const g = new Uint8Array(HALL_W * HALL_H);
  for (let y = 0; y < HALL_H; y++) for (let x = 0; x < HALL_W; x++) if (!insideHall(x, y)) g[y * HALL_W + x] = 1;
  for (const it of items) {
    if (!ITEM_DEFS[it.type]?.solid) continue;
    for (const [x, y] of itemTiles(it)) if (x >= 0 && y >= 0 && x < HALL_W && y < HALL_H) g[y * HALL_W + x] = 1;
  }
  return g;
}

export const isBlocked = (g: Uint8Array, x: number, y: number) =>
  x < 0 || y < 0 || x >= HALL_W || y >= HALL_H || g[y * HALL_W + x] === 1;

/** A* trên lưới 8 hướng (không cắt góc). Trả về danh sách ô (không gồm ô xuất phát) hoặc null */
export function findPath(g: Uint8Array, sx: number, sy: number, tx: number, ty: number): [number, number][] | null {
  if (isBlocked(g, tx, ty)) return null;
  if (sx === tx && sy === ty) return [];
  const W = HALL_W;
  const N = W * HALL_H;
  const gs = new Float32Array(N).fill(Infinity);
  const from = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const start = sy * W + sx;
  const goal = ty * W + tx;
  gs[start] = 0;
  // hàng đợi ưu tiên đơn giản (lưới nhỏ nên đủ nhanh)
  const open: number[] = [start];
  const fs = new Float32Array(N).fill(Infinity);
  const h = (i: number) => {
    const dx = Math.abs((i % W) - tx), dy = Math.abs(Math.floor(i / W) - ty);
    return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
  };
  fs[start] = h(start);
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (fs[open[i]] < fs[open[bi]]) bi = i;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % W, cy = Math.floor(cur / W);
    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (isBlocked(g, nx, ny)) continue;
      if (dx && dy && (isBlocked(g, cx + dx, cy) || isBlocked(g, cx, cy + dy))) continue; // không cắt góc
      const ni = ny * W + nx;
      const ng = gs[cur] + cost;
      if (ng < gs[ni]) {
        gs[ni] = ng;
        from[ni] = cur;
        fs[ni] = ng + h(ni);
        open.push(ni);
      }
    }
  }
  if (from[goal] === -1) return null;
  const path: [number, number][] = [];
  for (let i = goal; i !== start; i = from[i]) path.push([i % W, Math.floor(i / W)]);
  return path.reverse();
}

// ───────── Sảnh mẫu ─────────

export function defaultLayout(): Item[] {
  const items: Omit<Item, 'id'>[] = [];
  const add = (type: ItemType, x: number, y: number, rot = 0) => items.push({ type, x, y, rot });

  // Sân khấu
  add('backdrop', 15, 1);
  add('hy', 13, 1);
  add('hy', 22, 1);
  add('cake', 14, 3);
  add('champagne', 21, 3);
  add('speaker', 7, 1);
  add('speaker', 28, 1);
  add('flowers', 9, 1);
  add('flowers', 26, 1);
  add('lantern', 11, 1);
  add('lantern', 24, 1);
  add('balloons', 7, 5);
  add('balloons', 28, 5);
  add('love', 17, 3);
  add('candles', 12, 3);
  add('candles', 23, 3);
  add('pillar', 6, 3);
  add('pillar', 29, 3);

  // Buffet & quầy nước dọc hai bên tường, cây đèn ở góc
  for (const bx of [1, HALL_W - 2]) {
    add('buffet', bx, 9, 1);
    add('buffet', bx, 14, 1);
    add('drinks', bx, 19);
  }
  add('tree_lights', 2, 6);
  add('tree_lights', HALL_W - 3, 6);
  add('fireworks', 4, 6);
  add('fireworks', HALL_W - 5, 6);

  // Thảm đỏ từ cửa lên sân khấu + cánh hoa hai bên
  for (let y = 6; y <= HALL_H - 2; y++) {
    add('carpet', 17, y);
    add('carpet', 18, y);
  }
  for (const y of [8, 12, 16, 20]) {
    add('petals', 16, y);
    add('petals', 19, y);
  }
  add('arch', 16, HALL_H - 4);

  // Bàn tiệc: 4 bàn mỗi hàng × 3 hàng, mỗi bàn 6 ghế
  for (const ty of [8, 13, 18]) {
    for (const tx of [4, 10, 22, 28]) {
      add('table_round', tx, ty);
      add('chair', tx, ty - 1, 0); // ghế phía trên quay xuống
      add('chair', tx + 1, ty - 1, 0);
      add('chair', tx, ty + 2, 2); // ghế phía dưới quay lên
      add('chair', tx + 1, ty + 2, 2);
      add('chair', tx - 1, ty, 3); // ghế bên trái quay sang phải
      add('chair', tx + 2, ty + 1, 1); // ghế bên phải quay sang trái
    }
  }

  // Cửa vào
  add('giftbox', 13, HALL_H - 3);
  add('guestbook', 22, HALL_H - 3);
  add('photo', 30, HALL_H - 3);
  add('plant', 1, 1);
  add('plant', HALL_W - 2, 1);
  add('plant', 1, HALL_H - 2);
  add('plant', HALL_W - 2, HALL_H - 2);
  add('lamp', 14, HALL_H - 2);
  add('lamp', 21, HALL_H - 2);
  add('heart', 4, HALL_H - 3);
  add('welcome', 8, HALL_H - 4);
  add('jukebox', HALL_W - 3, HALL_H - 4);
  add('bell', 2, HALL_H - 4);
  add('wishtree', 25, HALL_H - 5);

  return items.map((it, i) => ({ ...it, id: i + 1 }));
}
