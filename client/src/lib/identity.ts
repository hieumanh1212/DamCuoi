import { randomLook, sanitizeLook, type Look, type Role } from '../../../shared/look';

export interface Profile {
  name: string;
  look: Look;
}

const PROFILE_KEY = 'dam-cuoi:profile';
const ID_KEY = 'dam-cuoi:playerId';
const KEYS_KEY = 'dam-cuoi:keys';

function get(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}
function set(store: Storage, key: string, value: string) {
  try {
    store.setItem(key, value);
  } catch {
    /* chế độ ẩn danh */
  }
}

export function loadProfile(): Profile {
  try {
    const p = JSON.parse(get(localStorage, PROFILE_KEY) ?? '');
    if (p && typeof p.name === 'string') return { name: p.name, look: sanitizeLook(p.look) };
  } catch {
    /* chưa có */
  }
  return { name: '', look: randomLook() };
}

export function saveProfile(p: Profile) {
  set(localStorage, PROFILE_KEY, JSON.stringify(p));
}

function randomString(n: number, chars: string) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

let memoryId: string | null = null;
/** Mỗi tab một id (sessionStorage) → tải lại trang vẫn là cùng một người */
export function getPlayerId(): string {
  const saved = get(sessionStorage, ID_KEY);
  if (saved) return saved;
  memoryId ??= randomString(20, 'abcdefghijklmnopqrstuvwxyz0123456789');
  set(sessionStorage, ID_KEY, memoryId);
  return memoryId;
}

export const newCode = () => randomString(6, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
export const newKey = () => randomString(24, 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789');

/** Khóa quản lý của các đám cưới mà máy này là cô dâu/chú rể */
interface CoupleAccess {
  key: string;
  role: Exclude<Role, 'guest'>;
}

export function loadAccess(code: string): CoupleAccess | null {
  try {
    const all = JSON.parse(get(localStorage, KEYS_KEY) ?? '{}');
    const a = all[code];
    if (a && typeof a.key === 'string') return { key: a.key, role: a.role === 'bride' ? 'bride' : 'groom' };
  } catch {
    /* không có */
  }
  return null;
}

export function saveAccess(code: string, access: CoupleAccess) {
  let all: Record<string, CoupleAccess> = {};
  try {
    all = JSON.parse(get(localStorage, KEYS_KEY) ?? '{}') ?? {};
  } catch {
    /* hỏng → ghi mới */
  }
  all[code] = access;
  set(localStorage, KEYS_KEY, JSON.stringify(all));
}

/** Đám cưới mà máy này đã tổ chức (để hiện ở trang chủ) */
export function myWeddings(): string[] {
  try {
    return Object.keys(JSON.parse(get(localStorage, KEYS_KEY) ?? '{}') ?? {});
  } catch {
    return [];
  }
}
