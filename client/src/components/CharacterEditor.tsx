import { useEffect, useRef } from 'react';
import {
  HAIR_COLORS, HAIR_STYLES, HAIR_STYLE_NAMES, OUTFITS, OUTFIT_COLORS, OUTFIT_NAMES, SKINS, randomLook,
  type Look, type Role,
} from '../../../shared/look';
import { LIMITS } from '../../../shared/protocol';
import { drawCharacter } from '../game/draw';
import type { Profile } from '../lib/identity';

interface Props {
  profile: Profile;
  role: Role;
  onChange: (p: Profile) => void;
}

/** Xem trước nhân vật đang bước đi */
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
      const k = (size / 48) * dpr;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      const d = dir ?? [0, 3, 2, 1][Math.floor(t / 1600) % 4];
      drawCharacter(ctx, 24, 42, lookRef.current, role, { d, walk: dir === undefined ? t / 80 : -1, sitting: false });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [role, size, dir]);
  return <canvas ref={ref} style={{ width: size, height: size }} className="char-preview" />;
}

export function CharacterEditor({ profile, role, onChange }: Props) {
  const { look } = profile;
  const set = (patch: Partial<Look>) => onChange({ ...profile, look: { ...look, ...patch } });
  const couple = role !== 'guest';

  return (
    <div className="char-editor">
      <div className="char-left">
        <CharacterPreview look={look} role={role} />
        <button type="button" className="btn small" onClick={() => onChange({ ...profile, look: randomLook() })}>🎲 Ngẫu nhiên</button>
      </div>
      <div className="char-right">
        <label className="field">
          <span>Tên hiển thị</span>
          <input
            value={profile.name}
            maxLength={LIMITS.nameLength}
            placeholder="Tên của bạn"
            onChange={(e) => onChange({ ...profile, name: e.target.value })}
          />
        </label>
        <div className="field">
          <span>Màu da</span>
          <div className="swatches">
            {SKINS.map((c, i) => (
              <button key={c} type="button" className={`sw ${look.skin === i ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ skin: i })} />
            ))}
          </div>
        </div>
        <div className="field">
          <span>Kiểu tóc</span>
          <div className="chips">
            {HAIR_STYLES.map((h) => (
              <button key={h} type="button" className={`chip ${look.hair === h ? 'on' : ''}`} onClick={() => set({ hair: h })}>{HAIR_STYLE_NAMES[h]}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Màu tóc</span>
          <div className="swatches">
            {HAIR_COLORS.map((c, i) => (
              <button key={c} type="button" className={`sw ${look.hairColor === i ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ hairColor: i })} />
            ))}
          </div>
        </div>
        {couple ? (
          <p className="note">{role === 'bride' ? '👰 Cô dâu tự động mặc váy cưới trắng và voan.' : '🤵 Chú rể tự động mặc vest đen, nơ đỏ.'}</p>
        ) : (
          <>
            <div className="field">
              <span>Trang phục</span>
              <div className="chips">
                {OUTFITS.map((o) => (
                  <button key={o} type="button" className={`chip ${look.outfit === o ? 'on' : ''}`} onClick={() => set({ outfit: o })}>{OUTFIT_NAMES[o]}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Màu trang phục</span>
              <div className="swatches">
                {OUTFIT_COLORS.map((c, i) => (
                  <button key={c} type="button" className={`sw ${look.color === i ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ color: i })} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
