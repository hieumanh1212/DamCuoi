import { useState } from 'react';
import { CODE_RE, LIMITS } from '../../../shared/protocol';
import { loadAccess, myWeddings } from '../lib/identity';

interface Props {
  onCreate: (c: { groom: string; bride: string; date: string; role: 'groom' | 'bride' }) => void;
  onJoin: (code: string) => void;
}

export function Home({ onCreate, onJoin }: Props) {
  const [groom, setGroom] = useState('');
  const [bride, setBride] = useState('');
  const [date, setDate] = useState('');
  const [role, setRole] = useState<'groom' | 'bride'>('groom');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [joinErr, setJoinErr] = useState('');
  const mine = myWeddings();

  return (
    <div className="home">
      <header className="hero">
        <div className="hero-rings">💍</div>
        <h1>Đám Cưới Online</h1>
        <p>Tổ chức tiệc cưới ảo — trang trí sảnh tiệc, mời bạn bè, cùng nhau chung vui dù ở bất cứ đâu.</p>
      </header>

      <div className="home-cards">
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            if (!groom.trim() || !bride.trim()) return setErr('Nhập tên cô dâu và chú rể nhé!');
            onCreate({ groom: groom.trim(), bride: bride.trim(), date, role });
          }}
        >
          <h2>💒 Tổ chức đám cưới</h2>
          <div className="row2">
            <label className="field">
              <span>Tên chú rể</span>
              <input value={groom} maxLength={LIMITS.coupleName} onChange={(e) => { setGroom(e.target.value); setErr(''); }} placeholder="vd: Hùng" />
            </label>
            <label className="field">
              <span>Tên cô dâu</span>
              <input value={bride} maxLength={LIMITS.coupleName} onChange={(e) => { setBride(e.target.value); setErr(''); }} placeholder="vd: Lan" />
            </label>
          </div>
          <label className="field">
            <span>Ngày cưới</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="field">
            <span>Bạn là</span>
            <div className="chips">
              <button type="button" className={`chip ${role === 'groom' ? 'on' : ''}`} onClick={() => setRole('groom')}>🤵 Chú rể</button>
              <button type="button" className={`chip ${role === 'bride' ? 'on' : ''}`} onClick={() => setRole('bride')}>👰 Cô dâu</button>
            </div>
          </div>
          {err && <p className="error">{err}</p>}
          <button className="btn primary big" type="submit">Tạo sảnh tiệc ✨</button>
        </form>

        <div className="card">
          <h2>🎊 Đến dự đám cưới</h2>
          <p className="muted">Nhập mã trong thiệp mời, hoặc mở trực tiếp link mời mà cô dâu chú rể gửi.</p>
          <form
            className="join-row"
            onSubmit={(e) => {
              e.preventDefault();
              const c = code.trim().toUpperCase();
              if (!CODE_RE.test(c)) return setJoinErr('Mã đám cưới không hợp lệ.');
              onJoin(c);
            }}
          >
            <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setJoinErr(''); }} placeholder="MÃ CƯỚI" maxLength={8} />
            <button className="btn primary" type="submit">Vào</button>
          </form>
          {joinErr && <p className="error">{joinErr}</p>}

          {mine.length > 0 && (
            <div className="mine">
              <h3>Đám cưới của bạn</h3>
              {mine.map((c) => (
                <button key={c} className="btn wide" onClick={() => onJoin(c)}>
                  {loadAccess(c)?.role === 'bride' ? '👰' : '🤵'} Quay lại sảnh tiệc <b>{c}</b>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <footer className="muted small">Làm với ❤️ — miễn phí, không quảng cáo, không dùng tiền thật.</footer>
    </div>
  );
}
