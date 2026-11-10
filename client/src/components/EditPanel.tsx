import { useEffect, useRef, useState } from 'react';
import { ACCENTS, FLOORS, LIMITS, type WeddingInfo } from '../../../shared/protocol';
import { CATALOG, ITEM_COLORS, ITEM_DEFS, type Item, type ItemType } from '../../../shared/world';
import { accentOf, drawItemThumb } from '../game/draw';

interface Props {
  info: WeddingInfo;
  placing: ItemType | null;
  placingColor: number;
  selected: Item | null;
  onPlacing: (t: ItemType | null) => void;
  onColor: (c: number) => void;
  onRotate: () => void;
  onDelete: () => void;
  onInfo: (patch: Partial<WeddingInfo>) => void;
  onReset: () => void;
  onClose: () => void;
}

const GROUPS = ['Bàn ghế', 'Sân khấu', 'Trang trí', 'Sàn & thảm', 'Tiện ích'] as const;

/** Hình thu nhỏ vẽ bằng chính hàm vẽ trong sảnh */
export function ItemThumb({ type, info, color }: { type: ItemType; info: WeddingInfo; color?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawItemThumb(ref.current, type, info, color);
  }, [type, info, color]);
  return <canvas ref={ref} className="thumb" aria-hidden />;
}

function ColorRow({ info, value, onPick }: { info: WeddingInfo; value: number; onPick: (c: number) => void }) {
  return (
    <div className="swatches">
      {ITEM_COLORS.map((c, i) => (
        <button
          key={i}
          className={`sw ${value === i ? 'on' : ''} ${i === 0 ? 'auto' : ''}`}
          style={{ background: i === 0 ? accentOf(info) : c }}
          title={i === 0 ? 'Theo màu chủ đạo' : c}
          onClick={() => onPick(i)}
        >
          {i === 0 ? 'A' : ''}
        </button>
      ))}
    </div>
  );
}

export function EditPanel(p: Props) {
  const { info, placing, placingColor, selected } = p;
  const [tab, setTab] = useState<'items' | 'look' | 'info'>('items');
  const [groom, setGroom] = useState(info.groom);
  const [bride, setBride] = useState(info.bride);
  const [welcome, setWelcome] = useState(info.welcome);
  useEffect(() => {
    setGroom(info.groom);
    setBride(info.bride);
    setWelcome(info.welcome);
  }, [info.groom, info.bride, info.welcome]);

  const active = selected ? ITEM_DEFS[selected.type] : placing ? ITEM_DEFS[placing] : null;

  return (
    <aside className="edit-panel">
      <header>
        <h3>🛠 Trang trí sảnh tiệc</h3>
        <button className="x" onClick={p.onClose} aria-label="Đóng">✕</button>
      </header>
      <div className="tabs">
        <button className={tab === 'items' ? 'on' : ''} onClick={() => setTab('items')}>Đồ trang trí</button>
        <button className={tab === 'look' ? 'on' : ''} onClick={() => setTab('look')}>Màu sắc</button>
        <button className={tab === 'info' ? 'on' : ''} onClick={() => setTab('info')}>Thông tin</button>
      </div>

      {tab === 'items' && (
        <div className="edit-body">
          {active ? (
            <div className="selected">
              <div className="sel-head">
                <ItemThumb type={active.type} info={info} color={selected ? selected.color : placingColor} />
                <div>
                  <small>{selected ? 'Đang chọn' : 'Đang đặt'}</small>
                  <b>{active.name}</b>
                </div>
              </div>
              {active.colorable && (
                <ColorRow info={info} value={selected ? selected.color ?? 0 : placingColor} onPick={p.onColor} />
              )}
              <div className="sel-actions">
                {active.rotatable && <button className="btn small" onClick={p.onRotate}>↻ Xoay</button>}
                {selected && <button className="btn small danger" onClick={p.onDelete}>🗑 Xóa</button>}
                {placing && <button className="btn small" onClick={() => p.onPlacing(null)}>✓ Xong</button>}
              </div>
              <p className="muted small">{selected ? 'Kéo món đồ trên sảnh để di chuyển.' : 'Chạm vào sảnh để đặt — ô xanh là đặt được.'}</p>
            </div>
          ) : (
            <p className="muted small tip">💡 Chọn món đồ rồi chạm vào sảnh để đặt. Chạm vào đồ có sẵn để chọn, kéo để di chuyển. Phím tắt: <kbd>R</kbd> xoay, <kbd>Del</kbd> xóa.</p>
          )}
          {GROUPS.map((g) => (
            <section key={g} className="catalog-group">
              <h4>{g}</h4>
              <div className="catalog">
                {CATALOG.filter((d) => d.group === g).map((d) => (
                  <button key={d.type} className={`cat-item ${placing === d.type ? 'on' : ''}`} onClick={() => p.onPlacing(placing === d.type ? null : d.type)}>
                    <ItemThumb type={d.type} info={info} />
                    <span className="nm">{d.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          <button className="btn small wide" onClick={() => confirm('Đặt lại toàn bộ sảnh về mẫu mặc định? Mọi trang trí hiện tại sẽ mất.') && p.onReset()}>
            ↺ Khôi phục sảnh mẫu
          </button>
        </div>
      )}

      {tab === 'look' && (
        <div className="edit-body">
          <h4>Sàn sảnh tiệc</h4>
          <div className="floor-grid">
            {FLOORS.map((f) => (
              <button key={f.id} className={`floor-opt floor-${f.id} ${info.floor === f.id ? 'on' : ''}`} onClick={() => p.onInfo({ floor: f.id })}>
                <span className="swatch" />
                {f.name}
              </button>
            ))}
          </div>
          <h4>Màu chủ đạo</h4>
          <p className="muted small">Áp dụng cho rèm, phông cưới và các món đồ đang để màu “A”.</p>
          <div className="swatches">
            {ACCENTS.map((c, i) => (
              <button key={c} className={`sw big ${info.accent === i ? 'on' : ''}`} style={{ background: c }} onClick={() => p.onInfo({ accent: i })} />
            ))}
          </div>
        </div>
      )}

      {tab === 'info' && (
        <form className="edit-body" onSubmit={(e) => { e.preventDefault(); p.onInfo({ groom, bride, welcome }); }}>
          <label className="field"><span>Tên chú rể</span><input value={groom} maxLength={LIMITS.coupleName} onChange={(e) => setGroom(e.target.value)} /></label>
          <label className="field"><span>Tên cô dâu</span><input value={bride} maxLength={LIMITS.coupleName} onChange={(e) => setBride(e.target.value)} /></label>
          <label className="field"><span>Ngày cưới</span><input type="date" value={info.date} onChange={(e) => p.onInfo({ date: e.target.value })} /></label>
          <label className="field">
            <span>Lời chào khách</span>
            <textarea rows={3} value={welcome} maxLength={LIMITS.welcomeLength} onChange={(e) => setWelcome(e.target.value)} />
          </label>
          <button className="btn primary" type="submit">Lưu thay đổi</button>
        </form>
      )}
    </aside>
  );
}
