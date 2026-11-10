// Ngoại hình nhân vật (dùng chung client/server)

export const SKINS = ['#ffe0c7', '#f5c9a3', '#d9a477', '#a86f45'];
export const HAIR_COLORS = ['#1f1a17', '#4a3020', '#8a5a2b', '#c9a15b', '#b5482e', '#7a7a85'];
export const HAIR_STYLES = ['short', 'long', 'bun', 'curly', 'ponytail', 'spiky'] as const;
export const OUTFITS = ['shirt', 'aodai', 'dress', 'suit'] as const;
export const OUTFIT_COLORS = ['#e53935', '#ec407a', '#ab47bc', '#5c6bc0', '#29b6f6', '#26a69a', '#9ccc65', '#ffca28', '#ff7043', '#f5f5f5', '#37474f'];

export type HairStyle = (typeof HAIR_STYLES)[number];
export type Outfit = (typeof OUTFITS)[number];

export const HAIR_STYLE_NAMES: Record<HairStyle, string> = {
  short: 'Tóc ngắn', long: 'Tóc dài', bun: 'Búi tóc', curly: 'Tóc xoăn', ponytail: 'Đuôi ngựa', spiky: 'Tóc dựng',
};
export const OUTFIT_NAMES: Record<Outfit, string> = {
  shirt: 'Sơ mi', aodai: 'Áo dài', dress: 'Váy', suit: 'Vest',
};

export interface Look {
  skin: number;
  hair: HairStyle;
  hairColor: number;
  outfit: Outfit;
  color: number;
}

export type Role = 'groom' | 'bride' | 'guest';

export const ROLE_NAMES: Record<Role, string> = { groom: 'Chú rể', bride: 'Cô dâu', guest: 'Khách' };

const pick = <T>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

export function randomLook(): Look {
  return {
    skin: Math.floor(Math.random() * SKINS.length),
    hair: pick(HAIR_STYLES),
    hairColor: Math.floor(Math.random() * HAIR_COLORS.length),
    outfit: pick(OUTFITS),
    color: Math.floor(Math.random() * OUTFIT_COLORS.length),
  };
}

export function sanitizeLook(raw: any): Look {
  const r = raw && typeof raw === 'object' ? raw : {};
  const idx = (v: unknown, n: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < n ? (v as number) : 0);
  return {
    skin: idx(r.skin, SKINS.length),
    hair: HAIR_STYLES.includes(r.hair) ? r.hair : 'short',
    hairColor: idx(r.hairColor, HAIR_COLORS.length),
    outfit: OUTFITS.includes(r.outfit) ? r.outfit : 'shirt',
    color: idx(r.color, OUTFIT_COLORS.length),
  };
}
