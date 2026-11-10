// Logic một đám cưới — không phụ thuộc Cloudflare để dễ test.
import { sanitizeLook, type Role } from '../../shared/look';
import {
  ACCENTS, CEREMONIES, EMOTES, ENVELOPES, FLOORS, LIMITS,
  type ClientMsg, type ErrorCode, type PlayerState, type ServerMsg, type WeddingInfo, type Wish,
} from '../../shared/protocol';
import {
  HALL_H, HALL_W, MAX_ITEMS, SPAWN, canPlace, defaultLayout, sanitizeItem, type Item,
} from '../../shared/world';

/** Lưu trữ bền vững (Durable Object storage hoặc bộ nhớ khi test) */
export interface Store {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  list<T>(prefix: string): Promise<Map<string, T>>;
}

export interface Transport {
  send(playerId: string, msg: ServerMsg): void;
}

interface Saved {
  info: WeddingInfo;
  key: string;
  items: Item[];
  nextId: number;
  nextWishId: number;
  createdAt: number;
}

interface Player extends PlayerState {
  chatTimes: number[];
  emoteTimes: number[];
  wishes: number;
}

const clampName = (s: unknown, n: number) => String(s ?? '').trim().replace(/\s+/g, ' ').slice(0, n);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class Wedding {
  private saved: Saved | null = null;
  private wishes: Wish[] = [];
  private players = new Map<string, Player>();
  private lastPos = new Map<string, { x: number; y: number }>();
  private dirty = new Set<string>();
  private lastCeremony = 0;

  constructor(
    private store: Store,
    private transport: Transport,
    private rng: () => number = Math.random,
  ) {}

  get exists() {
    return this.saved !== null;
  }

  get online() {
    return this.players.size;
  }

  async load() {
    this.saved = (await this.store.get<Saved>('wedding')) ?? null;
    const w = await this.store.list<Wish>('wish:');
    this.wishes = [...w.values()].sort((a, b) => a.id - b.id);
  }

  // ───────── Vào / ra ─────────

  /** Xử lý tin 'hello'. Trả về false nếu bị từ chối (đã gửi lỗi). */
  join(id: string, code: string, hello: Extract<ClientMsg, { t: 'hello' }>): boolean {
    const name = clampName(hello.name, LIMITS.nameLength) || 'Khách';
    const look = sanitizeLook(hello.look);

    // Gửi lại lệnh tạo với đúng khóa (vd. rớt mạng lúc tạo) → coi như vào phòng bình thường
    if (hello.create && this.saved && hello.create.key === this.saved.key) {
      hello = { ...hello, create: undefined, key: hello.create.key };
    }
    if (hello.create) {
      if (this.saved) return this.reject(id, 'exists', 'Mã đám cưới đã được dùng, hãy thử lại.');
      const c = hello.create;
      const groom = clampName(c.groom, LIMITS.coupleName);
      const bride = clampName(c.bride, LIMITS.coupleName);
      if (!groom || !bride || typeof c.key !== 'string' || c.key.length < 16 || c.key.length > 64) {
        return this.reject(id, 'bad_request', 'Thiếu thông tin cô dâu chú rể.');
      }
      const items = defaultLayout();
      this.saved = {
        info: {
          groom, bride,
          date: typeof c.date === 'string' && DATE_RE.test(c.date) ? c.date : '',
          welcome: 'Cảm ơn bạn đã đến chung vui cùng chúng mình!',
          floor: 'marble',
          accent: 0,
        },
        key: c.key,
        items,
        nextId: items.length + 1,
        nextWishId: 1,
        createdAt: Date.now(),
      };
      void this.persist();
      hello = { ...hello, key: c.key }; // người tạo là cô dâu/chú rể
    }
    if (!this.saved) return this.reject(id, 'not_found', 'Không tìm thấy đám cưới này. Kiểm tra lại link mời nhé!');

    let role: Role = 'guest';
    if (hello.key) {
      if (hello.key !== this.saved.key) return this.reject(id, 'bad_key', 'Link quản lý không đúng.');
      role = hello.role === 'bride' ? 'bride' : 'groom';
    }
    if (!this.players.has(id) && this.players.size >= 100) return this.reject(id, 'full', 'Sảnh tiệc đã đầy (100 người).');

    const prev = this.players.get(id) ?? this.lastPos.get(id);
    const jitter = () => (this.rng() - 0.5) * 2;
    const p: Player = {
      id, name, look, role,
      x: prev?.x ?? SPAWN.x + jitter(),
      y: prev?.y ?? SPAWN.y,
      d: 2, s: false,
      chatTimes: [], emoteTimes: [],
      wishes: this.players.get(id)?.wishes ?? 0,
    };
    const isNew = !this.players.has(id);
    this.players.set(id, p);

    const { info, items } = this.saved;
    this.transport.send(id, {
      t: 'welcome', you: id, role, code, info, items, wishes: this.wishes,
      players: [...this.players.values()].map(this.publicState),
    });
    this.broadcast({ t: 'join', p: this.publicState(p) }, id);
    if (isNew) {
      const who = role === 'bride' ? `Cô dâu ${name}` : role === 'groom' ? `Chú rể ${name}` : name;
      this.broadcast({ t: 'notice', text: `${who} đã đến dự tiệc 🎊` });
    }
    return true;
  }

  leave(id: string) {
    const p = this.players.get(id);
    if (!p) return;
    this.players.delete(id);
    this.dirty.delete(id);
    this.lastPos.set(id, { x: p.x, y: p.y });
    if (this.lastPos.size > 500) this.lastPos.delete(this.lastPos.keys().next().value!);
    this.broadcast({ t: 'leave', id });
  }

  // ───────── Tin nhắn ─────────

  handle(id: string, msg: ClientMsg) {
    const p = this.players.get(id);
    if (!p || !msg || typeof msg !== 'object' || !this.saved) return;
    const couple = p.role !== 'guest';
    switch (msg.t) {
      case 'move': return this.move(p, msg);
      case 'profile':
        p.name = clampName(msg.name, LIMITS.nameLength) || p.name;
        p.look = sanitizeLook(msg.look);
        this.broadcast({ t: 'join', p: this.publicState(p) });
        return;
      case 'chat': return this.chat(p, msg.text);
      case 'emote': return this.emote(p, msg.e);
      case 'wish': return this.wish(p, msg.message, msg.color);
      case 'delWish': if (couple) this.delWish(msg.id); return;
      case 'ceremony': if (couple) this.ceremony(p, msg.kind); return;
      case 'place': if (couple) this.place(msg.item); return;
      case 'moveItem': if (couple) this.moveItem(msg.id, msg.x, msg.y, msg.rot); return;
      case 'remove': if (couple) this.removeItem(msg.id); return;
      case 'info': if (couple) this.updateInfo(msg.info); return;
      case 'resetLayout': if (couple) this.resetLayout(); return;
    }
  }

  private move(p: Player, m: Extract<ClientMsg, { t: 'move' }>) {
    const x = Number(m.x), y = Number(m.y), d = Number(m.d);
    if (![x, y, d].every(Number.isFinite)) return;
    p.x = Math.min(HALL_W - 0.5, Math.max(0.5, x));
    p.y = Math.min(HALL_H - 0.5, Math.max(0.5, y));
    p.d = ((Math.round(d) % 4) + 4) % 4;
    p.s = !!m.s;
    this.dirty.add(p.id);
  }

  /** Gửi vị trí đã thay đổi (gọi định kỳ ~10 lần/giây) */
  flush() {
    if (!this.dirty.size) return;
    const p: [string, number, number, number, 0 | 1][] = [];
    for (const id of this.dirty) {
      const pl = this.players.get(id);
      if (pl) p.push([id, Math.round(pl.x * 100) / 100, Math.round(pl.y * 100) / 100, pl.d, pl.s ? 1 : 0]);
    }
    this.dirty.clear();
    if (p.length) this.broadcast({ t: 'pos', p });
  }

  private rate(times: number[], max: number, windowMs: number) {
    const now = Date.now();
    while (times.length && now - times[0] > windowMs) times.shift();
    if (times.length >= max) return false;
    times.push(now);
    return true;
  }

  private chat(p: Player, raw: unknown) {
    const text = String(raw ?? '').trim().slice(0, LIMITS.chatLength);
    if (!text || !this.rate(p.chatTimes, 5, 4000)) return;
    this.broadcast({ t: 'chat', id: p.id, name: p.name, text });
  }

  private emote(p: Player, e: unknown) {
    if (typeof e !== 'string' || !EMOTES.includes(e) || !this.rate(p.emoteTimes, 4, 2000)) return;
    this.broadcast({ t: 'emote', id: p.id, e });
  }

  private wish(p: Player, raw: unknown, color: unknown) {
    const message = String(raw ?? '').trim().slice(0, LIMITS.wishLength);
    if (!message || !this.saved) return;
    if (p.wishes >= LIMITS.wishesPerVisit) {
      this.transport.send(p.id, { t: 'notice', text: 'Bạn đã gửi đủ lời chúc rồi, cảm ơn bạn nhiều! 💕' });
      return;
    }
    if (this.wishes.length >= LIMITS.maxWishes) return;
    p.wishes++;
    const wish: Wish = {
      id: this.saved.nextWishId++,
      name: p.name,
      avatar: p.role === 'bride' ? '👰' : p.role === 'groom' ? '🤵' : '🙂',
      message,
      color: Number.isInteger(color) && (color as number) >= 0 && (color as number) < ENVELOPES.length ? (color as number) : 0,
      at: Date.now(),
    };
    this.wishes.push(wish);
    void this.store.put(`wish:${String(wish.id).padStart(6, '0')}`, wish);
    void this.persist();
    this.broadcast({ t: 'wish', wish });
    this.broadcast({ t: 'notice', text: `💌 ${p.name} đã gửi lời chúc mừng hạnh phúc!` });
  }

  private delWish(id: unknown) {
    const i = this.wishes.findIndex((w) => w.id === id);
    if (i < 0) return;
    const [w] = this.wishes.splice(i, 1);
    void this.store.delete(`wish:${String(w.id).padStart(6, '0')}`);
    this.broadcast({ t: 'delWish', id: w.id });
  }

  private ceremony(p: Player, kind: unknown) {
    const def = CEREMONIES.find((c) => c.kind === kind);
    const now = Date.now();
    if (!def || now - this.lastCeremony < LIMITS.ceremonyCooldown) return;
    this.lastCeremony = now;
    let target: string | undefined;
    let text = def.text;
    if (def.kind === 'bouquet') {
      const guests = [...this.players.values()].filter((x) => x.role === 'guest');
      if (guests.length) {
        const lucky = guests[Math.floor(this.rng() * guests.length)];
        target = lucky.id;
        text = `💐 ${lucky.name} đã bắt được hoa cưới! Sắp tới lượt rồi nhé!`;
      } else {
        text = '💐 Cô dâu tung hoa... nhưng chưa có khách nào bắt!';
      }
    }
    this.broadcast({ t: 'ceremony', kind: def.kind, by: p.id, target });
    this.broadcast({ t: 'notice', text: def.kind === 'bouquet' ? text : `${def.icon} ${text}` });
  }

  // ───────── Trang trí (chỉ cô dâu chú rể) ─────────

  private place(raw: unknown) {
    const s = this.saved!;
    const it = sanitizeItem(raw);
    if (!it || s.items.length >= MAX_ITEMS || !canPlace(s.items, it)) return;
    s.items.push({ ...it, id: s.nextId++ });
    this.itemsChanged();
  }

  private moveItem(id: unknown, x: unknown, y: unknown, rot: unknown) {
    const s = this.saved!;
    const cur = s.items.find((i) => i.id === id);
    if (!cur) return;
    const it = sanitizeItem({ type: cur.type, x, y, rot });
    if (!it || !canPlace(s.items, it, cur.id)) return;
    Object.assign(cur, it);
    this.itemsChanged();
  }

  private removeItem(id: unknown) {
    const s = this.saved!;
    const i = s.items.findIndex((x) => x.id === id);
    if (i < 0) return;
    s.items.splice(i, 1);
    this.itemsChanged();
  }

  private resetLayout() {
    const s = this.saved!;
    s.items = defaultLayout();
    s.nextId = s.items.length + 1;
    this.itemsChanged();
  }

  private itemsChanged() {
    void this.persist();
    this.broadcast({ t: 'items', items: this.saved!.items });
  }

  private updateInfo(raw: Partial<WeddingInfo> | undefined) {
    if (!raw || typeof raw !== 'object') return;
    const info = this.saved!.info;
    if (raw.groom !== undefined) info.groom = clampName(raw.groom, LIMITS.coupleName) || info.groom;
    if (raw.bride !== undefined) info.bride = clampName(raw.bride, LIMITS.coupleName) || info.bride;
    if (typeof raw.date === 'string' && (raw.date === '' || DATE_RE.test(raw.date))) info.date = raw.date;
    if (raw.welcome !== undefined) info.welcome = String(raw.welcome).trim().slice(0, LIMITS.welcomeLength);
    if (FLOORS.some((f) => f.id === raw.floor)) info.floor = raw.floor!;
    if (Number.isInteger(raw.accent) && raw.accent! >= 0 && raw.accent! < ACCENTS.length) info.accent = raw.accent!;
    void this.persist();
    this.broadcast({ t: 'info', info });
  }

  // ───────── Tiện ích ─────────

  private publicState = (p: Player): PlayerState => ({
    id: p.id, name: p.name, look: p.look, role: p.role, x: p.x, y: p.y, d: p.d, s: p.s,
  });

  private broadcast(msg: ServerMsg, except?: string) {
    for (const id of this.players.keys()) if (id !== except) this.transport.send(id, msg);
  }

  private reject(id: string, code: ErrorCode, message: string) {
    this.transport.send(id, { t: 'error', code, message });
    return false;
  }

  private persist() {
    return this.store.put('wedding', this.saved);
  }
}
