// Engine: vòng lặp vẽ, điều khiển nhân vật, camera, chế độ trang trí, hiệu ứng
import type { CeremonyKind, ClientMsg, PlayerState, WeddingInfo } from '../../../shared/protocol';
import {
  HALL_H, HALL_W, ITEM_DEFS, TILE, buildBlocked, canPlace, findPath, isBlocked, itemSize, itemTiles,
  type Interact, type Item, type ItemType,
} from '../../../shared/world';
import { drawCharacter } from './character';
import { accentOf, circle, drawBubble, drawHall, drawItem, drawNameTag, flower, heart, hexA, itemDepth } from './draw';

export interface SceneCallbacks {
  send(msg: ClientMsg): void;
  onInteract(kind: Exclude<Interact, 'sit'>, item: Item): void;
  onSelect(item: Item | null): void;
}

interface Actor {
  state: PlayerState;
  rx: number;
  ry: number;
  walk: number;
  bubble: { text: string; until: number } | null;
  emotes: { e: string; start: number }[];
}

type Effect =
  | { kind: 'confetti'; start: number; parts: { x: number; y: number; vx: number; vy: number; r: number; vr: number; c: string; s: number }[] }
  | { kind: 'hearts'; x: number; y: number; start: number }
  | { kind: 'sparkle'; x: number; y: number; start: number }
  | { kind: 'bouquet'; from: string; to: string | null; start: number }
  | { kind: 'firework'; x: number; y: number; start: number; bursts: { dx: number; h: number; c: string; delay: number }[] };

const SPEED = 4.2; // ô / giây
const WORLD_W = HALL_W * TILE;
const WORLD_H = HALL_H * TILE;
const CHAIR_DIR = [0, 1, 2, 3]; // rot của ghế → hướng ngồi
/** Nhân vật được vẽ to hơn ô một chút cho dễ nhìn */
const CHAR_SCALE = 1.15;

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private info!: WeddingInfo;
  private items: Item[] = [];
  private blocked: Uint8Array = new Uint8Array(HALL_W * HALL_H);
  private actors = new Map<string, Actor>();
  private me: string | null = null;

  private keys = new Set<string>();
  private path: [number, number][] | null = null;
  private goal: { kind: 'sit'; item: Item; tx: number; ty: number } | { kind: 'interact'; item: Item; interact: Exclude<Interact, 'sit'> } | null = null;
  private marker: { x: number; y: number; at: number } | null = null;
  private lastSent = { x: 0, y: 0, d: 0, s: false, at: 0 };

  // camera
  private vw = 0;
  private vh = 0;
  private dpr = 1;
  private zoom = 1;
  private camX = WORLD_W / 2;
  private camY = WORLD_H / 2;
  private freeCam: { x: number; y: number } | null = null;
  /** phần màn hình bị giao diện nổi che (px) — camera chừa chỗ để không bị che */
  private insets = { top: 0, bottom: 0, left: 0, right: 0 };

  // trang trí
  private editing = false;
  private placing: { type: ItemType; rot: number; color: number } | null = null;
  private selectedId: number | null = null;
  private drag: { id: number; dx: number; dy: number; x: number; y: number; moved: boolean } | null = null;
  private pan: { sx: number; sy: number; cx: number; cy: number } | null = null;
  private hover: { x: number; y: number } | null = null;

  private effects: Effect[] = [];
  private raf = 0;
  private last = 0;
  private ro: ResizeObserver;

  constructor(private canvas: HTMLCanvasElement, private cb: SceneCallbacks) {
    this.ctx = canvas.getContext('2d')!;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  // ───────── Dữ liệu từ server ─────────
  setInfo(info: WeddingInfo) {
    this.info = info;
  }

  setItems(items: Item[]) {
    this.items = items;
    this.blocked = buildBlocked(items);
    if (this.selectedId !== null && !items.some((i) => i.id === this.selectedId)) this.select(null);
    else if (this.selectedId !== null) this.cb.onSelect(items.find((i) => i.id === this.selectedId) ?? null);
  }

  setMe(id: string) {
    this.me = id;
  }

  setPlayers(list: PlayerState[]) {
    this.actors.clear();
    for (const p of list) this.upsert(p);
    const me = this.meActor();
    if (me) {
      this.camX = me.rx * TILE;
      this.camY = me.ry * TILE;
      this.lastSent = { x: me.state.x, y: me.state.y, d: me.state.d, s: me.state.s, at: 0 };
    }
  }

  upsert(p: PlayerState) {
    const a = this.actors.get(p.id);
    if (a) {
      // cập nhật tên/ngoại hình; vị trí của chính mình do máy mình quyết định
      const keepPos = p.id === this.me;
      a.state = keepPos ? { ...p, x: a.state.x, y: a.state.y, d: a.state.d, s: a.state.s } : p;
    } else {
      this.actors.set(p.id, { state: { ...p }, rx: p.x, ry: p.y, walk: -1, bubble: null, emotes: [] });
    }
  }

  remove(id: string) {
    this.actors.delete(id);
  }

  applyPositions(list: [string, number, number, number, 0 | 1][]) {
    for (const [id, x, y, d, s] of list) {
      if (id === this.me) continue;
      const a = this.actors.get(id);
      if (!a) continue;
      a.state.x = x;
      a.state.y = y;
      a.state.d = d;
      a.state.s = !!s;
    }
  }

  say(id: string, text: string) {
    const a = this.actors.get(id);
    if (a) a.bubble = { text, until: performance.now() + 6000 };
  }

  emote(id: string, e: string) {
    const a = this.actors.get(id);
    if (a) a.emotes.push({ e, start: performance.now() });
  }

  ceremony(kind: CeremonyKind, by: string, target?: string) {
    const now = performance.now();
    const centerOf = (type: ItemType) =>
      this.items.filter((i) => i.type === type).map((i) => {
        const s = itemSize(i);
        return { x: (i.x + s.w / 2) * TILE, y: (i.y + s.h / 2) * TILE };
      });
    switch (kind) {
      case 'cake':
        for (const c of centerOf('cake')) this.effects.push({ kind: 'sparkle', x: c.x, y: c.y, start: now });
        this.emote(by, '🎂');
        break;
      case 'toast':
        for (const c of centerOf('champagne')) this.effects.push({ kind: 'sparkle', x: c.x, y: c.y, start: now });
        for (const id of this.actors.keys()) this.emote(id, '🥂');
        break;
      case 'kiss':
        for (const a of this.actors.values()) {
          if (a.state.role !== 'guest') this.effects.push({ kind: 'hearts', x: a.rx * TILE, y: a.ry * TILE - 20, start: now });
        }
        break;
      case 'bouquet':
        this.effects.push({ kind: 'bouquet', from: by, to: target ?? null, start: now });
        break;
      case 'confetti':
        this.confetti();
        break;
    }
  }

  /** Pháo hoa bắn lên từ bệ (tọa độ ô) */
  firework(x: number, y: number) {
    const colors = ['#ff4f8b', '#ffd54f', '#4fc3f7', '#b388ff', '#69f0ae', '#ff8a65', '#ffffff'];
    const bursts = Array.from({ length: 5 }, (_, i) => ({
      dx: (Math.random() - 0.5) * 220,
      h: 140 + Math.random() * 120,
      c: colors[Math.floor(Math.random() * colors.length)],
      delay: i * 0.35 + Math.random() * 0.2,
    }));
    this.effects.push({ kind: 'firework', x: x * TILE, y: y * TILE, start: performance.now(), bursts });
  }

  // ───────── Trang trí ─────────
  setEditing(on: boolean) {
    this.editing = on;
    this.placing = null;
    this.drag = null;
    this.freeCam = on ? { x: this.camX, y: this.camY } : null;
    if (!on) this.select(null);
  }

  setPlacing(type: ItemType | null, color = 0) {
    this.placing = type ? { type, rot: 0, color } : null;
    if (type) this.select(null);
  }

  /** Đổi màu: món đang đặt hoặc món đang chọn */
  setColor(color: number) {
    if (this.placing) {
      this.placing.color = color;
      return;
    }
    if (this.selectedId !== null) this.cb.send({ t: 'itemColor', id: this.selectedId, color });
  }

  rotate() {
    if (this.placing) {
      this.placing.rot = (this.placing.rot + 1) % 4;
      return;
    }
    const it = this.items.find((i) => i.id === this.selectedId);
    if (it && ITEM_DEFS[it.type].rotatable) {
      this.cb.send({ t: 'moveItem', id: it.id, x: it.x, y: it.y, rot: (it.rot + 1) % 4 });
    }
  }

  deleteSelected() {
    if (this.selectedId !== null) this.cb.send({ t: 'remove', id: this.selectedId });
    this.select(null);
  }

  private select(id: number | null) {
    this.selectedId = id;
    this.cb.onSelect(id === null ? null : this.items.find((i) => i.id === id) ?? null);
  }

  // ───────── Camera ─────────
  setZoom(z: number) {
    this.zoom = Math.min(2.4, Math.max(0.3, z));
  }

  getZoom() {
    return this.zoom;
  }

  /** Phủ kín màn hình (cover): không còn khoảng trống hai bên, camera đi theo nhân vật */
  private baseScale() {
    return Math.max(this.vw / WORLD_W, this.vh / WORLD_H, 0.55);
  }

  private get scale() {
    return this.baseScale() * this.zoom;
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.vw = r.width;
    this.vh = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
  }

  private toWorld(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    const s = this.scale;
    return {
      x: (clientX - r.left - this.vw / 2) / s + this.camX,
      y: (clientY - r.top - this.vh / 2) / s + this.camY,
    };
  }

  setInsets(i: { top: number; bottom: number; left: number; right: number }) {
    this.insets = i;
  }

  /** Giới hạn tâm camera; padA/padB là phần bị che ở đầu/cuối trục (px màn hình) */
  private clampCam(c: number, view: number, world: number, padA = 0, padB = 0) {
    const s = this.scale;
    const lo = (view / 2 - padA) / s;
    const hi = world - (view / 2 - padB) / s;
    if (hi < lo) return world / 2 + (padB - padA) / 2 / s;
    return Math.min(hi, Math.max(lo, c));
  }

  /** Ảnh chụp màn hình sảnh tiệc */
  snapshot(): string {
    return this.canvas.toDataURL('image/png');
  }

  // ───────── Nhập liệu ─────────
  private typing() {
    const el = document.activeElement;
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.typing()) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
      this.keys.add(k);
      e.preventDefault();
    }
    if (this.editing) {
      if (k === 'r') this.rotate();
      if (k === 'delete' || k === 'backspace') this.deleteSelected();
      if (k === 'escape') { this.setPlacing(null); this.select(null); }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onBlur = () => this.keys.clear();

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.setZoom(this.zoom * (e.deltaY < 0 ? 1.1 : 0.9));
  };

  private itemAt(tx: number, ty: number, layer?: 'object' | 'floor'): Item | null {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (layer && ITEM_DEFS[it.type].layer !== layer) continue;
      if (itemTiles(it).some(([x, y]) => x === tx && y === ty)) return it;
    }
    return null;
  }

  private onDown = (e: PointerEvent) => {
    const w = this.toWorld(e.clientX, e.clientY);
    const tx = Math.floor(w.x / TILE), ty = Math.floor(w.y / TILE);
    if (this.editing) {
      this.canvas.setPointerCapture(e.pointerId);
      if (this.placing) {
        const it = { type: this.placing.type, rot: this.placing.rot, color: this.placing.color, ...this.anchor(this.placing.type, this.placing.rot, tx, ty) };
        if (canPlace(this.items, it)) this.cb.send({ t: 'place', item: it });
        return;
      }
      const hit = this.itemAt(tx, ty, 'object') ?? this.itemAt(tx, ty, 'floor');
      if (hit) {
        this.select(hit.id);
        this.drag = { id: hit.id, dx: tx - hit.x, dy: ty - hit.y, x: hit.x, y: hit.y, moved: false };
      } else {
        this.select(null);
        this.pan = { sx: e.clientX, sy: e.clientY, cx: this.camX, cy: this.camY };
      }
      return;
    }
    this.walkTo(tx, ty);
  };

  private onMove = (e: PointerEvent) => {
    const w = this.toWorld(e.clientX, e.clientY);
    const tx = Math.floor(w.x / TILE), ty = Math.floor(w.y / TILE);
    this.hover = { x: tx, y: ty };
    if (this.drag) {
      const nx = tx - this.drag.dx, ny = ty - this.drag.dy;
      if (nx !== this.drag.x || ny !== this.drag.y) {
        this.drag.x = nx;
        this.drag.y = ny;
        this.drag.moved = true;
      }
    } else if (this.pan && this.freeCam) {
      const s = this.scale;
      this.freeCam.x = this.pan.cx - (e.clientX - this.pan.sx) / s;
      this.freeCam.y = this.pan.cy - (e.clientY - this.pan.sy) / s;
    }
  };

  private onUp = () => {
    if (this.drag?.moved) {
      const it = this.items.find((i) => i.id === this.drag!.id);
      if (it) {
        const moved = { type: it.type, rot: it.rot, x: this.drag.x, y: this.drag.y };
        if (canPlace(this.items, moved, it.id)) this.cb.send({ t: 'moveItem', id: it.id, x: moved.x, y: moved.y, rot: it.rot });
      }
    }
    this.drag = null;
    this.pan = null;
  };

  /** Ô góc trên-trái để món đồ nằm giữa con trỏ */
  private anchor(type: ItemType, rot: number, tx: number, ty: number) {
    const { w, h } = itemSize({ type, rot });
    return { x: tx - Math.floor((w - 1) / 2), y: ty - Math.floor((h - 1) / 2) };
  }

  // ───────── Di chuyển nhân vật ─────────
  private meActor() {
    return this.me ? this.actors.get(this.me) : undefined;
  }

  private walkTo(tx: number, ty: number) {
    const me = this.meActor();
    if (!me) return;
    const sx = Math.floor(me.state.x), sy = Math.floor(me.state.y);
    const obj = this.itemAt(tx, ty, 'object');
    const def = obj ? ITEM_DEFS[obj.type] : null;
    this.goal = null;

    let dest: [number, number] | null = null;
    if (obj && def?.interact === 'sit') {
      dest = [tx, ty]; // sofa dài: ngồi đúng ô được chạm
      this.goal = { kind: 'sit', item: obj, tx, ty };
    } else if (obj && def?.interact && def.interact !== 'sit') {
      // đi tới ô trống gần món đồ nhất
      let best: [number, number] | null = null;
      let bestLen = Infinity;
      for (const [ix, iy] of itemTiles(obj)) {
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nx = ix + dx, ny = iy + dy;
          if (isBlocked(this.blocked, nx, ny)) continue;
          const len = Math.hypot(nx - sx, ny - sy);
          if (len < bestLen) { bestLen = len; best = [nx, ny]; }
        }
      }
      dest = best;
      this.goal = { kind: 'interact', item: obj, interact: def.interact };
    } else if (!isBlocked(this.blocked, tx, ty)) {
      dest = [tx, ty];
    }
    if (!dest) return;
    const path = findPath(this.blocked, sx, sy, dest[0], dest[1]);
    if (!path) return;
    this.path = path;
    this.marker = { x: dest[0], y: dest[1], at: performance.now() };
    if (me.state.s) me.state.s = false;
    if (!path.length) this.arrive(me);
  }

  private arrive(me: Actor) {
    const goal = this.goal;
    this.goal = null;
    this.path = null;
    if (!goal) return;
    if (goal.kind === 'sit') {
      me.state.x = goal.tx + 0.5;
      me.state.y = goal.ty + 0.5;
      me.state.d = CHAIR_DIR[goal.item.rot] ?? 0;
      me.state.s = true;
    } else {
      const s = itemSize(goal.item);
      const cx = goal.item.x + s.w / 2, cy = goal.item.y + s.h / 2;
      me.state.d = Math.abs(cx - me.state.x) > Math.abs(cy - me.state.y) ? (cx < me.state.x ? 1 : 3) : cy < me.state.y ? 2 : 0;
      this.cb.onInteract(goal.interact, goal.item);
    }
  }

  private free(x: number, y: number) {
    const r = 0.26;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r * 0.6], [r, r * 0.6]]) {
      if (isBlocked(this.blocked, Math.floor(x + ox), Math.floor(y + oy))) return false;
    }
    return true;
  }

  private updateMe(dt: number) {
    const me = this.meActor();
    if (!me) return;
    const st = me.state;
    let vx = 0, vy = 0;
    if (!this.typing()) {
      if (this.keys.has('arrowleft') || this.keys.has('a')) vx -= 1;
      if (this.keys.has('arrowright') || this.keys.has('d')) vx += 1;
      if (this.keys.has('arrowup') || this.keys.has('w')) vy -= 1;
      if (this.keys.has('arrowdown') || this.keys.has('s')) vy += 1;
    }
    let moving = false;
    if (vx || vy) {
      this.path = null;
      this.goal = null;
      this.marker = null;
      st.s = false;
      const len = Math.hypot(vx, vy);
      const step = (SPEED * dt) / len;
      const nx = st.x + vx * step, ny = st.y + vy * step;
      if (this.free(nx, st.y)) st.x = nx;
      if (this.free(st.x, ny)) st.y = ny;
      st.d = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 1 : 3) : vy < 0 ? 2 : 0;
      moving = true;
    } else if (this.path) {
      if (!this.path.length) {
        this.arrive(me);
      } else {
        const [tx, ty] = this.path[0];
        const gx = tx + 0.5, gy = ty + 0.5;
        const dx = gx - st.x, dy = gy - st.y;
        const dist = Math.hypot(dx, dy);
        const step = SPEED * dt;
        if (dist <= step) {
          st.x = gx;
          st.y = gy;
          this.path.shift();
          if (!this.path.length) this.arrive(me);
        } else {
          st.x += (dx / dist) * step;
          st.y += (dy / dist) * step;
        }
        if (dist > 0.01) st.d = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 3) : dy < 0 ? 2 : 0;
        moving = true;
      }
    }
    me.rx = st.x;
    me.ry = st.y;
    me.walk = moving ? (me.walk < 0 ? 0 : me.walk + dt * 13) : -1;

    // gửi vị trí ~10 lần/giây khi có thay đổi
    const now = performance.now();
    const L = this.lastSent;
    const changed = Math.abs(L.x - st.x) > 0.01 || Math.abs(L.y - st.y) > 0.01 || L.d !== st.d || L.s !== st.s;
    if (changed && now - L.at > 95) {
      this.cb.send({ t: 'move', x: Math.round(st.x * 100) / 100, y: Math.round(st.y * 100) / 100, d: st.d, s: st.s });
      this.lastSent = { x: st.x, y: st.y, d: st.d, s: st.s, at: now };
    }
  }

  // ───────── Vòng lặp ─────────
  private frame = (t: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (t - (this.last || t)) / 1000);
    this.last = t;
    if (!this.info) return;
    this.updateMe(dt);
    for (const [id, a] of this.actors) {
      if (id === this.me) continue;
      const dx = a.state.x - a.rx, dy = a.state.y - a.ry;
      const k = Math.min(1, dt * 10);
      a.rx += dx * k;
      a.ry += dy * k;
      const moving = Math.hypot(dx, dy) > 0.03;
      a.walk = moving ? (a.walk < 0 ? 0 : a.walk + dt * 13) : -1;
    }
    this.render(t);
  };

  private render(t: number) {
    const ctx = this.ctx;
    const s = this.scale;
    // camera
    const me = this.meActor();
    const target = this.freeCam ?? (me ? { x: me.rx * TILE, y: me.ry * TILE } : { x: WORLD_W / 2, y: WORLD_H / 2 });
    const I = this.insets;
    if (this.freeCam) {
      this.freeCam.x = this.clampCam(this.freeCam.x, this.vw, WORLD_W, I.left, I.right);
      this.freeCam.y = this.clampCam(this.freeCam.y, this.vh, WORLD_H, I.top, I.bottom);
    }
    const cx = this.clampCam(target.x, this.vw, WORLD_W, I.left, I.right);
    const cy = this.clampCam(target.y, this.vh, WORLD_H, I.top, I.bottom);
    this.camX += (cx - this.camX) * (this.freeCam ? 1 : 0.15);
    this.camY += (cy - this.camY) * (this.freeCam ? 1 : 0.15);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    bg.addColorStop(0, '#f6e3ea');
    bg.addColorStop(1, '#efe2d3');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const d = this.dpr;
    ctx.setTransform(d * s, 0, 0, d * s, d * (this.vw / 2 - this.camX * s), d * (this.vh / 2 - this.camY * s));

    drawHall(ctx, this.info);
    for (const it of this.items) if (ITEM_DEFS[it.type].layer === 'floor') drawItem(ctx, it, this.info, t);

    if (this.editing) this.drawGrid();
    if (this.marker && !this.editing) {
      const age = (t - this.marker.at) / 1000;
      if (age < 1.2 && this.path) {
        ctx.beginPath();
        ctx.ellipse((this.marker.x + 0.5) * TILE, (this.marker.y + 0.5) * TILE, 10 + age * 4, 5 + age * 2, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(108,92,231,${1 - age / 1.2})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // vẽ theo chiều sâu (y)
    type D = { depth: number; draw: () => void };
    const list: D[] = [];
    for (const it of this.items) {
      if (ITEM_DEFS[it.type].layer === 'floor') continue;
      const dragging = this.drag?.moved && this.drag.id === it.id;
      list.push({
        depth: itemDepth(it),
        draw: () => {
          if (dragging) ctx.globalAlpha = 0.35;
          drawItem(ctx, it, this.info, t);
          ctx.globalAlpha = 1;
        },
      });
    }
    for (const [id, a] of this.editing ? [] : this.actors) {
      list.push({
        depth: a.ry + (a.state.s ? 0.05 : 0),
        draw: () => {
          ctx.save();
          ctx.translate(a.rx * TILE, a.ry * TILE + 8);
          ctx.scale(CHAR_SCALE, CHAR_SCALE);
          drawCharacter(ctx, 0, 0, a.state.look, a.state.role, { d: a.state.d, walk: a.walk, sitting: a.state.s });
          ctx.restore();
        },
      });
      void id;
    }
    list.sort((a, b) => a.depth - b.depth);
    for (const x of list) x.draw();

    if (this.editing) this.drawEditOverlay();

    // tên, bong bóng chat, biểu cảm (luôn ở trên)
    const now = performance.now();
    const sorted = this.editing ? [] : [...this.actors.entries()].sort((a, b) => a[1].ry - b[1].ry);
    for (const [id, a] of sorted) drawNameTag(ctx, a.rx * TILE, a.ry * TILE + 8, a.state.name, a.state.role, id === this.me);
    for (const [, a] of sorted) {
      const px = a.rx * TILE, py = a.ry * TILE + 8 + (a.state.s ? 4 : 0);
      if (a.bubble) {
        const left = a.bubble.until - now;
        if (left <= 0) a.bubble = null;
        else drawBubble(ctx, px, py - 6, a.bubble.text, Math.min(1, left / 400));
      }
      a.emotes = a.emotes.filter((e) => now - e.start < 2200);
      a.emotes.forEach((e, i) => {
        const k = (now - e.start) / 2200;
        ctx.globalAlpha = 1 - k * k;
        ctx.font = '22px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(e.e, px + (i % 3 - 1) * 14, py - 58 - k * 40);
        ctx.textAlign = 'start';
        ctx.globalAlpha = 1;
      });
    }

    this.drawEffects(now);
  }

  private drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(108,92,231,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < HALL_W; x++) { ctx.moveTo(x * TILE, TILE); ctx.lineTo(x * TILE, WORLD_H - TILE); }
    for (let y = 1; y < HALL_H; y++) { ctx.moveTo(TILE, y * TILE); ctx.lineTo(WORLD_W - TILE, y * TILE); }
    ctx.stroke();
  }

  private drawEditOverlay() {
    const ctx = this.ctx;
    const outline = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(x * TILE + 1, y * TILE + 1, w * TILE - 2, h * TILE - 2);
      ctx.setLineDash([]);
    };
    const sel = this.items.find((i) => i.id === this.selectedId);
    if (sel && !this.drag?.moved) {
      const s = itemSize(sel);
      outline(sel.x, sel.y, s.w, s.h, '#6c5ce7');
    }
    // bóng mờ khi đặt / kéo
    let ghost: (Pick<Item, 'type' | 'rot' | 'x' | 'y' | 'color'> & { ignore?: number }) | null = null;
    if (this.placing && this.hover) {
      ghost = { type: this.placing.type, rot: this.placing.rot, color: this.placing.color, ...this.anchor(this.placing.type, this.placing.rot, this.hover.x, this.hover.y) };
    } else if (this.drag?.moved) {
      const it = this.items.find((i) => i.id === this.drag!.id);
      if (it) ghost = { type: it.type, rot: it.rot, color: it.color, x: this.drag.x, y: this.drag.y, ignore: it.id };
    }
    if (ghost) {
      const ok = canPlace(this.items, ghost, ghost.ignore);
      ctx.globalAlpha = 0.6;
      drawItem(ctx, { ...ghost, id: -1 }, this.info, 0);
      ctx.globalAlpha = 1;
      const s = itemSize(ghost);
      ctx.fillStyle = ok ? 'rgba(76,175,80,0.18)' : 'rgba(229,57,53,0.25)';
      ctx.fillRect(ghost.x * TILE, ghost.y * TILE, s.w * TILE, s.h * TILE);
      outline(ghost.x, ghost.y, s.w, s.h, ok ? '#43a047' : '#e53935');
    }
  }

  // ───────── Hiệu ứng ─────────
  private confetti() {
    const colors = ['#e53950', '#ffca28', '#ff7aa8', '#ffffff', '#6c5ce7', '#29b6f6', '#66bb6a'];
    const parts = Array.from({ length: 160 }, () => ({
      x: Math.random() * this.vw,
      y: -20 - Math.random() * this.vh * 0.6,
      vx: (Math.random() - 0.5) * 60,
      vy: 90 + Math.random() * 120,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 8,
      c: colors[Math.floor(Math.random() * colors.length)],
      s: 4 + Math.random() * 5,
    }));
    this.effects.push({ kind: 'confetti', start: performance.now(), parts });
  }

  private drawEffects(now: number) {
    const ctx = this.ctx;
    const accent = accentOf(this.info);
    this.effects = this.effects.filter((e) => now - e.start < (e.kind === 'confetti' ? 5000 : e.kind === 'bouquet' ? 2600 : e.kind === 'firework' ? 4200 : 2500));
    for (const e of this.effects) {
      const age = (now - e.start) / 1000;
      if (e.kind === 'firework') {
        for (const b of e.bursts) {
          const k = age - b.delay;
          if (k < 0) continue;
          const bx = e.x + b.dx * Math.min(1, k / 0.8), peak = e.y - b.h;
          if (k < 0.8) {
            // tên lửa bay lên
            const ry = e.y - (b.h * k) / 0.8;
            circle(ctx, e.x + b.dx * (k / 0.8), ry, 2.2, '#fff8e1');
            ctx.globalAlpha = 0.5;
            circle(ctx, e.x + b.dx * (k / 0.8) * 0.95, ry + 8, 1.5, '#ffcc80');
            ctx.globalAlpha = 1;
          } else {
            const p = k - 0.8;
            if (p > 2) continue;
            ctx.globalAlpha = Math.max(0, 1 - p / 2);
            for (let i = 0; i < 28; i++) {
              const a = (i / 28) * Math.PI * 2;
              const r = 8 + p * 70;
              const px = bx + Math.cos(a) * r, py = peak + Math.sin(a) * r + p * p * 18;
              circle(ctx, px, py, 2.4 - p * 0.8, i % 3 ? b.c : '#ffffff');
            }
            ctx.globalAlpha = 1;
          }
        }
      } else if (e.kind === 'hearts') {
        for (let i = 0; i < 9; i++) {
          const k = (age * 0.8 + i / 9) % 1;
          ctx.globalAlpha = 1 - k;
          heart(ctx, e.x + Math.sin(i * 2.1 + age * 3) * 16, e.y - k * 60, 6 + (i % 3) * 2, i % 2 ? accent : '#ff8fb1');
        }
        ctx.globalAlpha = 1;
      } else if (e.kind === 'sparkle') {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + age;
          const r = 10 + age * 22;
          ctx.globalAlpha = Math.max(0, 1 - age / 2.5);
          circle(ctx, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r * 0.7, 2.2, i % 2 ? '#ffd54f' : '#ffffff');
        }
        ctx.globalAlpha = 1;
      } else if (e.kind === 'bouquet') {
        const from = this.actors.get(e.from);
        const to = e.to ? this.actors.get(e.to) : null;
        if (!from) continue;
        const fx = from.rx * TILE, fy = from.ry * TILE - 20;
        const tx = to ? to.rx * TILE : fx, ty = to ? to.ry * TILE - 20 : fy + 160;
        const k = Math.min(1, age / 1.6);
        const x = fx + (tx - fx) * k;
        const y = fy + (ty - fy) * k - Math.sin(k * Math.PI) * 140;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(age * 6);
        flower(ctx, -4, 0, 5, '#f48fb1');
        flower(ctx, 4, 0, 5, '#ffffff');
        flower(ctx, 0, -5, 5, accent);
        ctx.restore();
        if (k >= 1 && to) {
          ctx.globalAlpha = Math.max(0, 1 - (age - 1.6));
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            circle(ctx, tx + Math.cos(a) * (age - 1.6) * 40, ty + Math.sin(a) * (age - 1.6) * 30, 2.5, '#ffd54f');
          }
          ctx.globalAlpha = 1;
        }
      }
    }
    // pháo giấy vẽ theo tọa độ màn hình
    const confetti = this.effects.filter((e) => e.kind === 'confetti');
    if (confetti.length) {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      for (const e of confetti) {
        if (e.kind !== 'confetti') continue;
        const age = (now - e.start) / 1000;
        ctx.globalAlpha = Math.max(0, Math.min(1, (5 - age) / 1.2));
        for (const p of e.parts) {
          const x = p.x + p.vx * age + Math.sin(age * 3 + p.r) * 12;
          const y = p.y + p.vy * age;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(p.r + p.vr * age);
          ctx.fillStyle = p.c;
          ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    }
    void hexA;
  }
}
