import { useEffect, useState } from 'react';
import { ACCENTS, FLOORS, LIMITS, type WeddingInfo } from '../../../shared/protocol';
import { CATALOG, ITEM_DEFS, type Item, type ItemType } from '../../../shared/world';

interface Props {
  info: WeddingInfo;
  placing: ItemType | null;
  selected: Item | null;
  onPlacing: (t: ItemType | null) => void;
  onRotate: () => void;
  onDelete: () => void;
  onInfo: (patch: Partial<WeddingInfo>) => void;
  onReset: () => void;
  onClose: () => void;
}

const GROUPS = ['Bàn ghế', 'Sân khấu', 'Trang trí', 'Tiện ích'] as const;

export function EditPanel({ info, placing, selected, onPlacing, onRotate, onDelete, onInfo, onReset, onClose }: Props) {
  const [tab, setTab] = useState<'items' | 'look' | 'info'>('items');
  const [groom, setGroom] = useState(info.groom);
  const [bride, setBride] = useState(info.bride);
  const [welcome, setWelcome] = useState(info.welcome);
  useEffect(() => {
    setGroom(info.groom);
    setBride(info.bride);
    setWelcome(info.welcome);
  }, [info.groom, info.bride, info.welcome]);

  return (
    <aside className="edit-panel">
      <header>
        <h3>🛠 Trang trí sảnh tiệc</h3>
        <button className="x" onClick={onClose} aria-label="Đóng">✕</button>
      </header>
      <div className="tabs">
        <button className={tab === 'items' ? 'on' : ''} onClick={() => setTab('items')}>Đồ trang trí</button>
        <button className={tab === 'look' ? 'on' : ''} onClick={() => setTab('look')}>Màu sắc</button>
        <button className={tab === 'info' ? 'on' : ''} onClick={() => setTab('info')}>Thông tin</button>
      </div>

      {tab === 'items' && (
        <div className="edit-body">
          {selected ? (
            <div className="selected">
              <span>{ITEM_DEFS[selected.type].icon} <b>{ITEM_DEFS[selected.type].name}</b></span>
              <div className="sel-actions">
                {ITEM_DEFS[selected.type].rotatable && <button className="btn small" onClick={onRotate}>↻ Xoay</button>}
                <button className="btn small danger" onClick={onDelete}>🗑 Xóa</button>
              </div>
              <p className="muted small">Kéo món đồ trên sảnh để di chuyển.</p>
            </div>
          ) : placing ? (
            <div className="selected">
              <span>Đang đặt: {ITEM_DEFS[placing].icon} <b>{ITEM_DEFS[placing].name}</b></span>
              <div className="sel-actions">
                {ITEM_DEFS[placing].rotatable && <button className="btn small" onClick={onRotate}>↻ Xoay</button>}
                <button className="btn small" onClick={() => onPlacing(null)}>Xong</button>
              </div>
              <p className="muted small">Chạm vào sảnh để đặt. Ô xanh = đặt được.</p>
            </div>
          ) : (
            <p className="muted small hint">Chọn món đồ bên dưới rồi chạm vào sảnh để đặt. Chạm vào đồ có sẵn để chọn, kéo để di chuyển. Phím tắt: R xoay, Delete xóa.</p>
          )}
          {GROUPS.map((g) => (
            <div key={g} className="catalog-group">
              <h4>{g}</h4>
              <div className="catalog">
                {CATALOG.filter((d) => d.group === g).map((d) => (
                  <button key={d.type} className={`cat-item ${placing === d.type ? 'on' : ''}`} onClick={() => onPlacing(placing === d.type ? null : d.type)}>
                    <span className="ic">{d.icon}</span>
                    <span className="nm">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button className="btn small wide" onClick={() => confirm('Đặt lại toàn bộ sảnh về mẫu mặc định? Mọi trang trí hiện tại sẽ mất.') && onReset()}>
            ↺ Khôi phục sảnh mẫu
          </button>
        </div>
      )}

      {tab === 'look' && (
        <div className="edit-body">
          <h4>Sàn</h4>
          <div className="chips">
            {FLOORS.map((f) => (
              <button key={f.id} className={`chip ${info.floor === f.id ? 'on' : ''}`} onClick={() => onInfo({ floor: f.id })}>{f.name}</button>
            ))}
          </div>
          <h4>Màu chủ đạo</h4>
          <div className="swatches">
            {ACCENTS.map((c, i) => (
              <button key={c} className={`sw big ${info.accent === i ? 'on' : ''}`} style={{ background: c }} onClick={() => onInfo({ accent: i })} />
            ))}
          </div>
        </div>
      )}

      {tab === 'info' && (
        <form className="edit-body" onSubmit={(e) => { e.preventDefault(); onInfo({ groom, bride, welcome }); }}>
          <label className="field"><span>Tên chú rể</span><input value={groom} maxLength={LIMITS.coupleName} onChange={(e) => setGroom(e.target.value)} /></label>
          <label className="field"><span>Tên cô dâu</span><input value={bride} maxLength={LIMITS.coupleName} onChange={(e) => setBride(e.target.value)} /></label>
          <label className="field"><span>Ngày cưới</span><input type="date" value={info.date} onChange={(e) => onInfo({ date: e.target.value })} /></label>
          <label className="field">
            <span>Lời chào khách</span>
            <textarea rows={3} value={welcome} maxLength={LIMITS.welcomeLength} onChange={(e) => setWelcome(e.target.value)} />
          </label>
          <button className="btn primary" type="submit">Lưu</button>
        </form>
      )}
    </aside>
  );
}
