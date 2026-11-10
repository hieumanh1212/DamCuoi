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
  | 'table_round' | 'table_long' | 'chair' | 'backdrop' | 'arch' | 'cake' | 'champagne'
  | 'giftbox' | 'guestbook' | 'photo' | 'flowers' | 'plant' | 'balloons' | 'lantern' | 'lamp'
  | 'heart' | 'hy' | 'speaker' | 'carpet' | 'petals';

export type Layer = 'floor' | 'object';
export type Interact = 'gift' | 'guestbook' | 'photo' | 'sit';

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
  /** nhóm trong danh mục trang trí */
  group: 'Bàn ghế' | 'Sân khấu' | 'Trang trí' | 'Tiện ích';
}

export const CATALOG: ItemDef[] = [
  { type: 'table_round', name: 'Bàn tròn', icon: '⚪', w: 2, h: 2, layer: 'object', solid: true, group: 'Bàn ghế' },
  { type: 'table_long', name: 'Bàn dài', icon: '▭', w: 3, h: 1, layer: 'object', solid: true, rotatable: true, group: 'Bàn ghế' },
  { type: 'chair', name: 'Ghế', icon: '🪑', w: 1, h: 1, layer: 'object', solid: false, interact: 'sit', rotatable: true, group: 'Bàn ghế' },
  { type: 'backdrop', name: 'Phông cưới', icon: '🖼️', w: 6, h: 1, layer: 'object', solid: true, group: 'Sân khấu' },
  { type: 'cake', name: 'Bánh cưới', icon: '🎂', w: 1, h: 1, layer: 'object', solid: true, group: 'Sân khấu' },
  { type: 'champagne', name: 'Tháp ly', icon: '🥂', w: 1, h: 1, layer: 'object', solid: true, group: 'Sân khấu' },
  { type: 'speaker', name: 'Loa', icon: '🔊', w: 1, h: 1, layer: 'object', solid: true, group: 'Sân khấu' },
  { type: 'arch', name: 'Cổng hoa', icon: '🌸', w: 4, h: 1, layer: 'object', solid: false, group: 'Trang trí' },
  { type: 'flowers', name: 'Chậu hoa', icon: '💐', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'plant', name: 'Cây xanh', icon: '🪴', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'balloons', name: 'Bóng bay', icon: '🎈', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'lantern', name: 'Đèn lồng', icon: '🏮', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'lamp', name: 'Cột đèn', icon: '💡', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'heart', name: 'Biển trái tim', icon: '💖', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'hy', name: 'Chữ Song Hỷ', icon: '囍', w: 1, h: 1, layer: 'object', solid: true, group: 'Trang trí' },
  { type: 'carpet', name: 'Thảm đỏ', icon: '🟥', w: 1, h: 1, layer: 'floor', solid: false, group: 'Trang trí' },
  { type: 'petals', name: 'Cánh hoa', icon: '🌺', w: 1, h: 1, layer: 'floor', solid: false, group: 'Trang trí' },
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
  return { type: raw.type, x, y, rot: ITEM_DEFS[raw.type as ItemType].rotatable ? rot : 0 };
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

  return items.map((it, i) => ({ ...it, id: i + 1 }));
}
