import { describe, expect, it } from 'vitest';
import { randomLook } from '../shared/look';
import type { ClientMsg, ServerMsg } from '../shared/protocol';
import { Wedding, type Store } from '../server/src/wedding';
import { buildBlocked, canPlace, defaultLayout, findPath, isBlocked, ITEM_DEFS, SPAWN } from '../shared/world';

function memStore(): Store & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: async (k) => structuredClone(data.get(k)) as any,
    put: async (k, v) => void data.set(k, structuredClone(v)),
    delete: async (k) => data.delete(k),
    list: async (prefix) => new Map([...data].filter(([k]) => k.startsWith(prefix))) as any,
  };
}

const KEY = 'k'.repeat(24);
const hello = (extra: Partial<Extract<ClientMsg, { t: 'hello' }>> = {}): Extract<ClientMsg, { t: 'hello' }> => ({
  t: 'hello', playerId: 'x', name: 'Khách', look: randomLook(), ...extra,
});

function setup(store = memStore()) {
  const inbox = new Map<string, ServerMsg[]>();
  const w = new Wedding(store, { send: (id, m) => { if (!inbox.has(id)) inbox.set(id, []); inbox.get(id)!.push(m); } }, () => 0);
  const msgs = (id: string) => inbox.get(id) ?? [];
  const last = <T extends ServerMsg['t']>(id: string, t: T) =>
    [...msgs(id)].reverse().find((m) => m.t === t) as Extract<ServerMsg, { t: T }> | undefined;
  return { w, store, msgs, last };
}

async function created() {
  const s = setup();
  await s.w.load();
  s.w.join('groom', 'ABCDE', hello({ name: 'Hùng', create: { groom: 'Hùng', bride: 'Lan', date: '2026-12-20', key: KEY } }));
  return s;
}

describe('Bản đồ', () => {
  it('sảnh mẫu hợp lệ: không chồng đồ, trong tường, chỗ xuất hiện đi được', () => {
    const items = defaultLayout();
    for (const it of items) expect(canPlace(items, it, it.id), `${it.type}@${it.x},${it.y}`).toBe(true);
    const g = buildBlocked(items);
    expect(isBlocked(g, Math.floor(SPAWN.x), Math.floor(SPAWN.y))).toBe(false);
  });

  it('mọi ghế và hòm mừng cưới đều đi tới được từ cửa', () => {
    const items = defaultLayout();
    const g = buildBlocked(items);
    const sx = Math.floor(SPAWN.x), sy = Math.floor(SPAWN.y);
    for (const it of items.filter((i) => i.type === 'chair')) {
      expect(findPath(g, sx, sy, it.x, it.y), `ghế ${it.x},${it.y}`).not.toBeNull();
    }
    const gift = items.find((i) => ITEM_DEFS[i.type].interact === 'gift')!;
    // tới ô cạnh hòm
    expect(findPath(g, sx, sy, gift.x + 1, gift.y)).not.toBeNull();
  });

  it('không đặt đồ chồng lên nhau, nhưng thảm (lớp sàn) nằm dưới đồ được', () => {
    const items = [{ id: 1, type: 'table_round' as const, x: 5, y: 5, rot: 0 }];
    expect(canPlace(items, { type: 'chair', x: 6, y: 6, rot: 0 })).toBe(false);
    expect(canPlace(items, { type: 'carpet', x: 6, y: 6, rot: 0 })).toBe(true);
    expect(canPlace(items, { type: 'chair', x: 0, y: 6, rot: 0 })).toBe(false); // trong tường
  });

  it('tìm đường vòng qua vật cản', () => {
    const items = [{ id: 1, type: 'table_long' as const, x: 4, y: 5, rot: 0 }];
    const path = findPath(buildBlocked(items), 5, 4, 5, 6)!;
    expect(path.at(-1)).toEqual([5, 6]);
    expect(path.length).toBeGreaterThan(2);
  });
});

describe('Đám cưới', () => {
  it('tạo đám cưới: người tạo là chú rể, có sảnh mẫu, được lưu lại', async () => {
    const { w, last, store } = await created();
    const welcome = last('groom', 'welcome')!;
    expect(welcome.role).toBe('groom');
    expect(welcome.info.groom).toBe('Hùng');
    expect(welcome.items.length).toBeGreaterThan(50);
    expect(store.data.has('wedding')).toBe(true);
    expect(w.exists).toBe(true);
  });

  it('khách vào bằng mã; vào nhầm mã không tồn tại thì báo lỗi', async () => {
    const s = setup();
    await s.w.load();
    expect(s.w.join('g1', 'ZZZZZ', hello())).toBe(false);
    expect(s.last('g1', 'error')?.code).toBe('not_found');

    const { w, last } = await created();
    expect(w.join('g1', 'ABCDE', hello({ name: 'Minh' }))).toBe(true);
    expect(last('g1', 'welcome')?.role).toBe('guest');
    expect(last('groom', 'join')?.p.name).toBe('Minh');
  });

  it('người tạo chọn là cô dâu thì vào với vai cô dâu', async () => {
    const s = setup();
    await s.w.load();
    s.w.join('b', 'ABCDE', hello({ role: 'bride', create: { groom: 'Hùng', bride: 'Lan', date: '', key: KEY } }));
    expect(s.last('b', 'welcome')?.role).toBe('bride');
  });

  it('link quản lý: đúng khóa thành cô dâu, sai khóa bị từ chối', async () => {
    const { w, last } = await created();
    expect(w.join('bride', 'ABCDE', hello({ key: KEY, role: 'bride' }))).toBe(true);
    expect(last('bride', 'welcome')?.role).toBe('bride');
    expect(w.join('hacker', 'ABCDE', hello({ key: 'sai'.repeat(8) }))).toBe(false);
    expect(last('hacker', 'error')?.code).toBe('bad_key');
  });

  it('khách không được trang trí, cô dâu chú rể thì được', async () => {
    const { w, last } = await created();
    w.join('g1', 'ABCDE', hello());
    const before = last('groom', 'welcome')!.items.length;
    w.handle('g1', { t: 'place', item: { type: 'balloons', x: 2, y: 10, rot: 0 } });
    expect(last('groom', 'items')).toBeUndefined();
    w.handle('groom', { t: 'place', item: { type: 'balloons', x: 2, y: 10, rot: 0 } });
    expect(last('g1', 'items')?.items.length).toBe(before + 1);
    // đặt chồng lên → bị bỏ qua
    w.handle('groom', { t: 'place', item: { type: 'plant', x: 2, y: 10, rot: 0 } });
    expect(last('g1', 'items')?.items.length).toBe(before + 1);
    const id = last('g1', 'items')!.items.at(-1)!.id;
    w.handle('groom', { t: 'moveItem', id, x: 2, y: 12, rot: 0 });
    expect(last('g1', 'items')!.items.find((i) => i.id === id)).toMatchObject({ x: 2, y: 12 });
    w.handle('groom', { t: 'remove', id });
    expect(last('g1', 'items')!.items.length).toBe(before);
  });

  it('đổi màu đồ trang trí; di chuyển vẫn giữ màu; đồ không đổi màu được thì bỏ qua', async () => {
    const { w, last } = await created();
    const items = last('groom', 'welcome')!.items;
    const table = items.find((i) => i.type === 'table_round')!;
    w.handle('groom', { t: 'itemColor', id: table.id, color: 3 });
    expect(last('groom', 'items')!.items.find((i) => i.id === table.id)?.color).toBe(3);
    w.handle('groom', { t: 'moveItem', id: table.id, x: table.x, y: table.y, rot: 0 });
    expect(last('groom', 'items')!.items.find((i) => i.id === table.id)?.color).toBe(3);
    w.handle('groom', { t: 'itemColor', id: table.id, color: 0 });
    expect(last('groom', 'items')!.items.find((i) => i.id === table.id)?.color).toBeUndefined();
    const piano = { type: 'piano' as const, x: 2, y: 22, rot: 0, color: 4 };
    w.handle('groom', { t: 'place', item: piano });
    const placed = last('groom', 'items')!.items.at(-1)!;
    expect(placed.type).toBe('piano');
    expect(placed.color).toBeUndefined();
  });

  it('đổi thông tin & giao diện', async () => {
    const { w, last } = await created();
    w.handle('groom', { t: 'info', info: { welcome: 'Chào mừng!', floor: 'wood', accent: 2, bride: '  Ngọc   Lan ' } });
    expect(last('groom', 'info')?.info).toMatchObject({ welcome: 'Chào mừng!', floor: 'wood', accent: 2, bride: 'Ngọc Lan' });
    w.handle('groom', { t: 'info', info: { floor: 'khong-co' as any, accent: 99 } });
    expect(last('groom', 'info')?.info).toMatchObject({ floor: 'wood', accent: 2 });
  });

  it('lời chúc: lưu lại, giới hạn mỗi lượt vào, cô dâu chú rể xóa được', async () => {
    const s = await created();
    s.w.join('g1', 'ABCDE', hello({ name: 'Minh' }));
    for (let i = 0; i < 5; i++) s.w.handle('g1', { t: 'wish', message: `Chúc mừng ${i}`, color: 1 });
    const wishes = s.msgs('groom').filter((m) => m.t === 'wish');
    expect(wishes).toHaveLength(3);
    expect([...s.store.data.keys()].filter((k) => k.startsWith('wish:'))).toHaveLength(3);

    // tải lại từ bộ nhớ → vẫn còn lời chúc
    const again = setup(s.store);
    await again.w.load();
    again.w.join('g2', 'ABCDE', hello());
    expect(again.last('g2', 'welcome')?.wishes).toHaveLength(3);

    const id = (wishes[0] as any).wish.id;
    s.w.handle('g1', { t: 'delWish', id });
    expect(s.last('groom', 'delWish')).toBeUndefined();
    s.w.handle('groom', { t: 'delWish', id });
    expect(s.last('g1', 'delWish')?.id).toBe(id);
  });

  it('nghi lễ: chỉ cô dâu chú rể; tung hoa trúng một khách', async () => {
    const { w, last } = await created();
    w.join('g1', 'ABCDE', hello({ name: 'Minh' }));
    w.handle('g1', { t: 'ceremony', kind: 'confetti' });
    expect(last('groom', 'ceremony')).toBeUndefined();
    w.handle('groom', { t: 'ceremony', kind: 'bouquet' });
    expect(last('g1', 'ceremony')).toMatchObject({ kind: 'bouquet', target: 'g1' });
    expect(last('g1', 'notice')?.text).toContain('Minh');
  });

  it('di chuyển: gom vị trí gửi định kỳ, giới hạn trong sảnh', async () => {
    const { w, last } = await created();
    w.join('g1', 'ABCDE', hello());
    w.handle('g1', { t: 'move', x: 999, y: 5.5, d: 3, s: false });
    w.flush();
    const pos = last('groom', 'pos')!.p.find((p) => p[0] === 'g1')!;
    expect(pos[1]).toBeLessThan(40);
    expect(pos[2]).toBe(5.5);
    // vào lại sau khi thoát → giữ chỗ cũ
    w.leave('g1');
    expect(last('groom', 'leave')?.id).toBe('g1');
    w.join('g1', 'ABCDE', hello());
    expect(last('g1', 'welcome')!.players.find((p) => p.id === 'g1')!.y).toBe(5.5);
  });

  it('gửi lại lệnh tạo với đúng khóa = vào lại; khóa khác = mã đã dùng', async () => {
    const { w, last } = await created();
    expect(w.join('groom', 'ABCDE', hello({ create: { groom: 'A', bride: 'B', date: '', key: KEY } }))).toBe(true);
    expect(last('groom', 'welcome')?.info.groom).toBe('Hùng');
    expect(w.join('z', 'ABCDE', hello({ create: { groom: 'A', bride: 'B', date: '', key: 'x'.repeat(20) } }))).toBe(false);
    expect(last('z', 'error')?.code).toBe('exists');
  });
});

