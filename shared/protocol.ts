// Giao thức client ↔ server
import type { Look, Role } from './look';
import type { Item } from './world';

export const LIMITS = {
  nameLength: 20,
  chatLength: 120,
  wishLength: 300,
  coupleName: 20,
  welcomeLength: 120,
  maxWishes: 2000,
  /** số lời chúc tối đa một người gửi trong một lần vào phòng */
  wishesPerVisit: 3,
  ceremonyCooldown: 4000,
} as const;

export const CODE_RE = /^[A-Z0-9]{5,8}$/;

export const FLOORS = [
  { id: 'marble', name: 'Đá trắng' },
  { id: 'wood', name: 'Sàn gỗ' },
  { id: 'pink', name: 'Hồng pastel' },
  { id: 'red', name: 'Đỏ truyền thống' },
  { id: 'garden', name: 'Sân cỏ' },
  { id: 'gold', name: 'Vàng sang trọng' },
  { id: 'navy', name: 'Đêm đầy sao' },
  { id: 'lavender', name: 'Tím oải hương' },
  { id: 'beach', name: 'Bãi biển' },
] as const;
export type FloorId = (typeof FLOORS)[number]['id'];

export const ACCENTS = ['#e53950', '#ff7aa8', '#c9a227', '#8e5bd6', '#2e9e8f', '#1e88e5', '#ef6c00', '#5d4037', '#ad1457', '#00838f'];

export interface WeddingInfo {
  groom: string;
  bride: string;
  /** yyyy-mm-dd */
  date: string;
  welcome: string;
  floor: FloorId;
  accent: number;
}

export interface Wish {
  id: number;
  name: string;
  avatar: string; // emoji vai trò hoặc ký tự đầu
  message: string;
  color: number; // màu phong bì
  at: number;
}

export const ENVELOPES = [
  { name: 'Đỏ', color: '#d32f2f' },
  { name: 'Hồng', color: '#ec407a' },
  { name: 'Vàng', color: '#f9a825' },
  { name: 'Trắng', color: '#eeeeee' },
];

export interface PlayerState {
  id: string;
  name: string;
  look: Look;
  role: Role;
  /** tọa độ theo ô (số thực) */
  x: number;
  y: number;
  /** hướng: 0 xuống, 1 trái, 2 lên, 3 phải */
  d: number;
  /** đang ngồi */
  s: boolean;
}

export type CeremonyKind = 'cake' | 'toast' | 'bouquet' | 'confetti' | 'kiss';

export const CEREMONIES: { kind: CeremonyKind; name: string; icon: string; text: string }[] = [
  { kind: 'cake', name: 'Cắt bánh', icon: '🎂', text: 'Cô dâu chú rể cắt bánh cưới!' },
  { kind: 'toast', name: 'Nâng ly', icon: '🥂', text: 'Cả sảnh cùng nâng ly chúc mừng! Dzô!' },
  { kind: 'kiss', name: 'Trao tình yêu', icon: '💞', text: 'Cô dâu chú rể trao nhau nụ hôn!' },
  { kind: 'bouquet', name: 'Tung hoa', icon: '💐', text: 'Cô dâu tung hoa cưới!' },
  { kind: 'confetti', name: 'Pháo giấy', icon: '🎉', text: 'Bắn pháo giấy mừng hạnh phúc!' },
];

export const EMOTES = ['👏', '❤️', '😂', '🎉', '🥂', '😭', '😍', '🙏'];

export type ErrorCode = 'not_found' | 'exists' | 'bad_key' | 'full' | 'replaced' | 'bad_request';

// ───────── Client → Server ─────────
export type ClientMsg =
  | {
      t: 'hello';
      playerId: string;
      name: string;
      look: Look;
      /** khóa quản lý (chỉ cô dâu/chú rể có) */
      key?: string;
      /** vai trò mong muốn khi có khóa */
      role?: Role;
      /** tạo đám cưới mới */
      create?: { groom: string; bride: string; date: string; key: string };
    }
  | { t: 'move'; x: number; y: number; d: number; s: boolean }
  | { t: 'profile'; name: string; look: Look }
  | { t: 'chat'; text: string }
  | { t: 'emote'; e: string }
  | { t: 'wish'; message: string; color: number }
  | { t: 'delWish'; id: number }
  | { t: 'ceremony'; kind: CeremonyKind }
  | { t: 'place'; item: Omit<Item, 'id'> }
  | { t: 'moveItem'; id: number; x: number; y: number; rot: number }
  | { t: 'remove'; id: number }
  | { t: 'itemColor'; id: number; color: number }
  | { t: 'info'; info: Partial<WeddingInfo> }
  | { t: 'resetLayout' }
  | { t: 'ping' };

// ───────── Server → Client ─────────
export type ServerMsg =
  | {
      t: 'welcome';
      you: string;
      role: Role;
      code: string;
      info: WeddingInfo;
      items: Item[];
      wishes: Wish[];
      players: PlayerState[];
    }
  | { t: 'join'; p: PlayerState }
  | { t: 'leave'; id: string }
  | { t: 'pos'; p: [string, number, number, number, 0 | 1][] }
  | { t: 'chat'; id: string; name: string; text: string }
  | { t: 'notice'; text: string }
  | { t: 'emote'; id: string; e: string }
  | { t: 'items'; items: Item[] }
  | { t: 'info'; info: WeddingInfo }
  | { t: 'wish'; wish: Wish }
  | { t: 'delWish'; id: number }
  | { t: 'ceremony'; kind: CeremonyKind; by: string; target?: string }
  | { t: 'error'; code: ErrorCode; message: string };
