import { useEffect, useRef, useState } from 'react';
import {
  ACCESSORIES, ACCESSORY_NAMES, BOTTOMS, BOTTOM_NAMES, CLOTH_COLORS, FACES, FACE_NAMES, FULL_BODY, GENDER_NAMES,
  GUEST_TOPS, HAIR_BY_GENDER, HAIR_COLORS, HAIR_STYLES, HAIR_STYLE_NAMES, SKINS, TOP_NAMES, WEDDING_TOPS,
  randomLook, weddingLook, type Gender, type Look, type Role,
} from '../../../shared/look';
import { LIMITS } from '../../../shared/protocol';
import { drawCharacter } from '../game/character';
import type { Profile } from '../lib/identity';

interface Props {
  profile: Profile;
  role: Role;
  onChange: (p: Profile) => void;
}

/** Xem trước nhân vật đang bước đi (xoay 4 hướng) hoặc đứng yên theo một hướng */
export function CharacterPreview({ look, role, size = 120, dir }: { look: Look; role: Role; size?: number; dir?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const lookRef = useRef(look);
  lookRef.current = look;
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const k = (size / 50) * dpr;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      const d = dir ?? [0, 3, 2, 1][Math.floor(t / 1600) % 4];
      drawCharacter(ctx, 25, 44, lookRef.current, role, { d, walk: dir === undefined ? t / 80 : -1, sitting: false });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [role, size, dir]);
  return <canvas ref={ref} style={{ width: size, height: size }} className="char-preview" />;
}

/** Hình thu nhỏ tĩnh cho từng lựa chọn (chỉ phần đầu hoặc cả người) */
function Mini({ look, role, focus }: { look: Look; role: Role; focus: 'head' | 'body' }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(look);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const size = 56;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const k = (focus === 'head' ? size / 34 : size / 38) * dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    if (focus === 'head') drawCharacter(ctx, 17, 44, look, role, { d: 0, walk: -1, sitting: false });
    else drawCharacter(ctx, 19, 39.5, look, role, { d: 0, walk: -1, sitting: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, role, focus]);
  return <canvas ref={ref} className="mini" aria-hidden />;
}

function Swatches({ colors, value, onPick }: { colors: string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="swatches">
      {colors.map((c, i) => (
        <button key={c + i} type="button" className={`sw ${value === i ? 'on' : ''}`} style={{ background: c }} onClick={() => onPick(i)} aria-label={c} />
      ))}
    </div>
  );
}

type Tab = 'base' | 'hair' | 'outfit' | 'acc';

export function CharacterEditor({ profile, role, onChange }: Props) {
  const { look } = profile;
  const [tab, setTab] = useState<Tab>('base');
  const set = (patch: Partial<Look>) => onChange({ ...profile, look: { ...look, ...patch } });
  const couple = role !== 'guest';
  const tops = couple ? WEDDING_TOPS : GUEST_TOPS;
  // cô dâu/chú rể: chuyển sang đồ cưới; khách: bỏ đồ cưới
  useEffect(() => {
    if (couple && !WEDDING_TOPS.includes(look.top)) onChange({ ...profile, look: weddingLook(look, role) });
    if (!couple && WEDDING_TOPS.includes(look.top)) onChange({ ...profile, look: { ...look, top: 'shirt', accessory: look.accessory === 'veil' ? 'none' : look.accessory } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couple, role]);
  const hairOrder = [...HAIR_BY_GENDER[look.gender], ...HAIR_STYLES.filter((h) => !HAIR_BY_GENDER[look.gender].includes(h))];

  const setGender = (g: Gender) => {
    const hairOk = HAIR_BY_GENDER[g].includes(look.hair);
    set({ gender: g, hair: hairOk ? look.hair : HAIR_BY_GENDER[g][1] });
  };

  return (
    <div className="char-editor">
      <div className="char-left">
        <CharacterPreview look={look} role={role} size={150} />
        <button type="button" className="btn small" onClick={() => onChange({ ...profile, look: randomLook(look.gender) })}>🎲 Ngẫu nhiên</button>
      </div>
      <div className="char-right">
        <label className="field">
          <span>Tên hiển thị</span>
          <input value={profile.name} maxLength={LIMITS.nameLength} placeholder="Tên của bạn" onChange={(e) => onChange({ ...profile, name: e.target.value })} />
        </label>

        <div className="tabs char-tabs">
          {([['base', 'Cơ bản'], ['hair', 'Tóc'], ['outfit', 'Trang phục'], ['acc', 'Phụ kiện']] as const).map(([k, n]) => (
            <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{n}</button>
          ))}
        </div>

        {tab === 'base' && (
          <div className="char-tab">
            <div className="field">
              <span>Giới tính</span>
              <div className="gender-row">
                {(['male', 'female'] as const).map((g) => (
                  <button key={g} type="button" className={`gender ${look.gender === g ? 'on' : ''}`} onClick={() => setGender(g)}>
                    <Mini look={{ ...look, gender: g, hair: HAIR_BY_GENDER[g].includes(look.hair) ? look.hair : HAIR_BY_GENDER[g][1] }} role={role} focus="head" />
                    {g === 'male' ? '♂' : '♀'} {GENDER_NAMES[g]}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Màu da</span>
              <Swatches colors={SKINS} value={look.skin} onPick={(i) => set({ skin: i })} />
            </div>
            <div className="field">
              <span>Khuôn mặt</span>
              <div className="opt-grid">
                {FACES.map((f) => (
                  <button key={f} type="button" className={`opt ${look.face === f ? 'on' : ''}`} onClick={() => set({ face: f })}>
                    <Mini look={{ ...look, face: f, accessory: 'none' }} role={role} focus="head" />
                    <small>{FACE_NAMES[f]}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'hair' && (
          <div className="char-tab">
            <div className="field">
              <span>Kiểu tóc <small className="muted">(gợi ý theo giới tính ở đầu danh sách)</small></span>
              <div className="opt-grid">
                {hairOrder.map((h) => (
                  <button key={h} type="button" className={`opt ${look.hair === h ? 'on' : ''}`} onClick={() => set({ hair: h })}>
                    <Mini look={{ ...look, hair: h, accessory: 'none' }} role={role} focus="head" />
                    <small>{HAIR_STYLE_NAMES[h]}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Màu tóc</span>
              <Swatches colors={HAIR_COLORS} value={look.hairColor} onPick={(i) => set({ hairColor: i })} />
            </div>
          </div>
        )}

        {tab === 'outfit' && (
          <div className="char-tab">
            <div className="field">
              <span>{couple ? 'Trang phục cưới' : 'Áo / trang phục'}</span>
              <div className="opt-grid">
                {tops.map((t) => (
                  <button key={t} type="button" className={`opt ${look.top === t ? 'on' : ''}`} onClick={() => set({ top: t })}>
                    <Mini look={{ ...look, top: t }} role={role} focus="body" />
                    <small>{TOP_NAMES[t]}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Màu áo</span>
              <Swatches colors={CLOTH_COLORS} value={look.topColor} onPick={(i) => set({ topColor: i })} />
            </div>
            {!FULL_BODY.includes(look.top) && (
              <>
                <div className="field">
                  <span>Quần / váy</span>
                  <div className="chips">
                    {BOTTOMS.map((b) => (
                      <button key={b} type="button" className={`chip ${look.bottom === b ? 'on' : ''}`} onClick={() => set({ bottom: b })}>{BOTTOM_NAMES[b]}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span>Màu quần / váy</span>
                  <Swatches colors={CLOTH_COLORS} value={look.bottomColor} onPick={(i) => set({ bottomColor: i })} />
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'acc' && (
          <div className="char-tab">
            <div className="field">
              <span>Phụ kiện</span>
              <div className="opt-grid">
                {ACCESSORIES.map((a) => (
                  <button key={a} type="button" className={`opt ${look.accessory === a ? 'on' : ''}`} onClick={() => set({ accessory: a })}>
                    <Mini look={{ ...look, accessory: a }} role={role} focus="head" />
                    <small>{ACCESSORY_NAMES[a]}</small>
                  </button>
                ))}
              </div>
            </div>
            {look.accessory !== 'none' && look.accessory !== 'crown' && (
              <div className="field">
                <span>Màu phụ kiện</span>
                <Swatches colors={CLOTH_COLORS} value={look.accColor} onPick={(i) => set({ accColor: i })} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
