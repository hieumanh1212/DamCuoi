// Ngoại hình nhân vật (dùng chung client/server)

export type Gender = 'male' | 'female';
export type Role = 'groom' | 'bride' | 'guest';

export const GENDER_NAMES: Record<Gender, string> = { male: 'Nam', female: 'Nữ' };
export const ROLE_NAMES: Record<Role, string> = { groom: 'Chú rể', bride: 'Cô dâu', guest: 'Khách' };

export const SKINS = ['#ffe9d9', '#ffe0c7', '#f7d0ae', '#eebd92', '#d9a477', '#bf8a5e', '#a06a42', '#7a4b2c'];

export const HAIR_COLORS = [
  '#1b1716', '#3b2a22', '#5a3a26', '#7b4a2a', '#a0703f', '#d8b26a', '#efe0b8', '#b5482e',
  '#7d1f2e', '#8a8a94', '#f2f2f2', '#f6a5c0', '#c3a6f0', '#5c8ee6', '#7fd8c4', '#6b3fa0',
];

export const CLOTH_COLORS = [
  '#ffffff', '#f5ecdc', '#d7ccc8', '#9e9e9e', '#424242', '#1f2430',
  '#e53935', '#ff7aa8', '#f8bbd0', '#ad1457', '#ff8a65', '#ffb74d',
  '#ffd54f', '#fff59d', '#aed581', '#43a047', '#26a69a', '#80deea',
  '#4fc3f7', '#1e88e5', '#283593', '#b39ddb', '#7e57c2', '#8d6e63',
];

export const HAIR_STYLES = [
  'buzz', 'short', 'sidepart', 'spiky', 'mohawk', 'curly', 'afro', 'bald',
  'bob', 'long', 'wavy', 'ponytail', 'twintails', 'bun', 'spacebuns', 'braid',
] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];
export const HAIR_STYLE_NAMES: Record<HairStyle, string> = {
  buzz: 'Đầu đinh', short: 'Tóc ngắn', sidepart: 'Rẽ ngôi', spiky: 'Tóc dựng', mohawk: 'Mohawk', curly: 'Xoăn ngắn',
  afro: 'Afro', bald: 'Trọc', bob: 'Tóc bob', long: 'Dài thẳng', wavy: 'Dài sóng', ponytail: 'Đuôi ngựa',
  twintails: 'Hai bím', bun: 'Búi cao', spacebuns: 'Búi hai bên', braid: 'Tết bím',
};
/** Kiểu tóc gợi ý theo giới tính (vẫn chọn được tất cả) */
export const HAIR_BY_GENDER: Record<Gender, HairStyle[]> = {
  male: ['buzz', 'short', 'sidepart', 'spiky', 'mohawk', 'curly', 'afro', 'bald'],
  female: ['bob', 'long', 'wavy', 'ponytail', 'twintails', 'bun', 'spacebuns', 'braid'],
};

export const FACES = ['normal', 'happy', 'sparkle', 'wink', 'calm', 'cat'] as const;
export type Face = (typeof FACES)[number];
export const FACE_NAMES: Record<Face, string> = {
  normal: 'Bình thường', happy: 'Cười híp', sparkle: 'Long lanh', wink: 'Nháy mắt', calm: 'Hiền hoà', cat: 'Mèo con',
};

export const TOPS = [
  'tshirt', 'shirt', 'hoodie', 'sweater', 'suit', 'blazer', 'jacket', 'overall', 'aobaba', 'aodai', 'dress', 'longdress',
  // trang phục cưới
  'gown', 'mermaid', 'tux', 'whitesuit', 'aodaicuoi',
] as const;
export type Top = (typeof TOPS)[number];
export const TOP_NAMES: Record<Top, string> = {
  tshirt: 'Áo thun', shirt: 'Sơ mi', hoodie: 'Hoodie', sweater: 'Áo len', suit: 'Vest', blazer: 'Blazer',
  jacket: 'Áo khoác', overall: 'Yếm', aobaba: 'Áo bà ba', aodai: 'Áo dài', dress: 'Váy xòe', longdress: 'Đầm dài',
  gown: 'Váy cưới', mermaid: 'Váy đuôi cá', tux: 'Vest cưới', whitesuit: 'Vest trắng', aodaicuoi: 'Áo dài cưới',
};
export const WEDDING_TOPS: Top[] = ['gown', 'mermaid', 'tux', 'whitesuit', 'aodaicuoi'];
export const GUEST_TOPS: Top[] = TOPS.filter((t) => !WEDDING_TOPS.includes(t));
/** Trang phục tự che phần chân (không cần chọn quần/váy) */
export const FULL_BODY: Top[] = ['dress', 'longdress', 'gown', 'mermaid', 'overall'];

export const BOTTOMS = ['pants', 'jeans', 'shorts', 'skirt', 'miniskirt'] as const;
export type Bottom = (typeof BOTTOMS)[number];
export const BOTTOM_NAMES: Record<Bottom, string> = {
  pants: 'Quần âu', jeans: 'Quần jean', shorts: 'Quần short', skirt: 'Chân váy', miniskirt: 'Váy ngắn',
};

export const ACCESSORIES = [
  'none', 'glasses', 'sunglasses', 'fedora', 'cap', 'beret', 'bow', 'flower', 'headband', 'crown', 'veil', 'khandong', 'bunny', 'cat',
] as const;
export type Accessory = (typeof ACCESSORIES)[number];
export const ACCESSORY_NAMES: Record<Accessory, string> = {
  none: 'Không', glasses: 'Kính cận', sunglasses: 'Kính râm', fedora: 'Mũ phớt', cap: 'Mũ lưỡi trai', beret: 'Mũ nồi',
  bow: 'Nơ tóc', flower: 'Hoa cài tóc', headband: 'Băng đô', crown: 'Vương miện', veil: 'Voan cưới', khandong: 'Khăn đóng',
  bunny: 'Tai thỏ', cat: 'Tai mèo',
};

export interface Look {
  gender: Gender;
  skin: number;
  face: Face;
  hair: HairStyle;
  hairColor: number;
  top: Top;
  topColor: number;
  bottom: Bottom;
  bottomColor: number;
  accessory: Accessory;
  accColor: number;
}

const pick = <T>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
const idx = (n: number) => Math.floor(Math.random() * n);
const WHITE = 0, BLACK = 5;

export function randomLook(gender: Gender = Math.random() < 0.5 ? 'male' : 'female'): Look {
  const female = gender === 'female';
  const top = pick<Top>(female ? ['tshirt', 'shirt', 'sweater', 'blazer', 'aodai', 'dress', 'longdress', 'aobaba', 'hoodie'] : ['tshirt', 'shirt', 'hoodie', 'sweater', 'suit', 'blazer', 'jacket', 'aobaba']);
  return {
    gender,
    skin: idx(6),
    face: pick(FACES),
    hair: pick(HAIR_BY_GENDER[gender]),
    hairColor: idx(9),
    top,
    topColor: idx(CLOTH_COLORS.length),
    bottom: pick<Bottom>(female ? ['skirt', 'jeans', 'pants', 'miniskirt'] : ['pants', 'jeans', 'shorts']),
    bottomColor: pick([1, 2, 3, 4, 5, 19, 20, 23]),
    accessory: Math.random() < 0.45 ? pick<Accessory>(female ? ['bow', 'flower', 'headband', 'glasses', 'beret'] : ['glasses', 'sunglasses', 'cap', 'fedora']) : 'none',
    accColor: idx(CLOTH_COLORS.length),
  };
}

/** Trang phục mặc định khi trở thành cô dâu / chú rể */
export function weddingLook(look: Look, role: Role): Look {
  if (role === 'bride' && !WEDDING_TOPS.includes(look.top)) return { ...look, top: 'gown', topColor: WHITE, accessory: 'veil', accColor: WHITE };
  if (role === 'groom' && !WEDDING_TOPS.includes(look.top)) return { ...look, top: 'tux', topColor: BLACK, bottomColor: BLACK };
  return look;
}

/** Chuẩn hoá dữ liệu (kể cả định dạng cũ: { skin, hair, hairColor, outfit, color }) */
export function sanitizeLook(raw: any): Look {
  const r = raw && typeof raw === 'object' ? raw : {};
  const num = (v: unknown, n: number, d = 0) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < n ? (v as number) : d);
  const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
  // chuyển từ định dạng cũ
  const legacyTop: Record<string, Top> = { shirt: 'shirt', aodai: 'aodai', dress: 'dress', suit: 'suit' };
  const top = oneOf(r.top ?? legacyTop[r.outfit], TOPS, 'tshirt');
  const gender: Gender = r.gender === 'female' || r.gender === 'male' ? r.gender : top === 'dress' || top === 'aodai' || ['long', 'bun', 'ponytail'].includes(r.hair) ? 'female' : 'male';
  return {
    gender,
    skin: num(r.skin, SKINS.length, 1),
    face: oneOf(r.face, FACES, 'normal'),
    hair: oneOf(r.hair, HAIR_STYLES, 'short'),
    hairColor: num(r.hairColor, HAIR_COLORS.length),
    top,
    topColor: num(r.topColor ?? r.color, CLOTH_COLORS.length, 19),
    bottom: oneOf(r.bottom, BOTTOMS, 'pants'),
    bottomColor: num(r.bottomColor, CLOTH_COLORS.length, 5),
    accessory: oneOf(r.accessory, ACCESSORIES, 'none'),
    accColor: num(r.accColor, CLOTH_COLORS.length, 6),
  };
}
