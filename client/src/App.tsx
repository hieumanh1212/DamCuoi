import { useEffect, useState } from 'react';
import { CharacterEditor } from './components/CharacterEditor';
import { Home } from './components/Home';
import { WeddingScreen, type Session } from './components/WeddingScreen';
import { loadAccess, loadProfile, newCode, newKey, saveAccess, saveProfile, type Profile } from './lib/identity';

type Stage =
  | { kind: 'home' }
  | { kind: 'prepare'; session: Session; chooseRole: boolean }
  | { kind: 'room'; session: Session };

function parseHash(): { code: string; key?: string } | null {
  const m = /^#\/([A-Za-z0-9]{5,8})(?:\?k=([A-Za-z0-9]{16,64}))?$/.exec(location.hash);
  return m ? { code: m[1].toUpperCase(), key: m[2] } : null;
}

function sessionFor(code: string): { session: Session; chooseRole: boolean } {
  const access = loadAccess(code);
  return { session: { code, key: access?.key, role: access?.role }, chooseRole: false };
}

function initialStage(): Stage {
  const h = parseHash();
  if (!h) return { kind: 'home' };
  if (h.key) {
    // Mở link quản lý: lưu khóa, rồi bỏ khóa khỏi thanh địa chỉ để không lộ khi chia sẻ màn hình
    const prev = loadAccess(h.code);
    saveAccess(h.code, { key: h.key, role: prev?.role ?? 'bride' });
    history.replaceState(null, '', `${location.pathname}${location.search}#/${h.code}`);
    return { kind: 'prepare', session: { code: h.code, key: h.key, role: prev?.role ?? 'bride' }, chooseRole: !prev };
  }
  return { kind: 'prepare', ...sessionFor(h.code) };
}

export default function App() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [stage, setStage] = useState<Stage>(initialStage);

  useEffect(() => {
    const onHash = () => {
      const h = parseHash();
      if (!h) setStage({ kind: 'home' });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goHome = () => {
    history.replaceState(null, '', location.pathname + location.search);
    setStage({ kind: 'home' });
  };

  const updateProfile = (p: Profile) => {
    setProfile(p);
    saveProfile(p);
  };

  if (stage.kind === 'home') {
    return (
      <Home
        onCreate={({ groom, bride, date, role }) => {
          const session: Session = { code: newCode(), role, create: { groom, bride, date, key: newKey() } };
          setStage({ kind: 'prepare', session, chooseRole: false });
        }}
        onJoin={(code) => setStage({ kind: 'prepare', ...sessionFor(code) })}
      />
    );
  }

  if (stage.kind === 'prepare') {
    const { session } = stage;
    const role = session.key || session.create ? session.role ?? 'groom' : 'guest';
    const enter = () => {
      const p = { ...profile, name: profile.name.trim() };
      updateProfile(p);
      history.replaceState(null, '', `${location.pathname}${location.search}#/${session.code}`);
      setStage({ kind: 'room', session });
    };
    return (
      <div className="center-screen">
        <div className="card prepare">
          <h2>{session.create ? '💒 Chuẩn bị cho ngày trọng đại' : role !== 'guest' ? '💍 Vào sảnh tiệc của bạn' : '🎊 Bạn được mời dự đám cưới!'}</h2>
          {session.create && <p className="muted">Đám cưới <b>{session.create.groom}</b> & <b>{session.create.bride}</b> — chọn ngoại hình của bạn trước khi vào sảnh.</p>}
          {!session.create && role === 'guest' && <p className="muted">Mã đám cưới: <b>{session.code}</b>. Tạo nhân vật của bạn rồi vào dự tiệc nhé.</p>}
          {stage.chooseRole && (
            <div className="field">
              <span>Bạn là</span>
              <div className="chips">
                {(['groom', 'bride'] as const).map((r) => (
                  <button
                    key={r}
                    className={`chip ${session.role === r ? 'on' : ''}`}
                    onClick={() => {
                      saveAccess(session.code, { key: session.key!, role: r });
                      setStage({ ...stage, session: { ...session, role: r } });
                    }}
                  >
                    {r === 'groom' ? '🤵 Chú rể' : '👰 Cô dâu'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <CharacterEditor profile={profile} role={role} onChange={updateProfile} />
          <div className="prepare-actions">
            <button className="btn" onClick={goHome}>← Quay lại</button>
            <button className="btn primary big" disabled={!profile.name.trim()} onClick={enter}>
              {session.create ? 'Mở sảnh tiệc ✨' : 'Vào sảnh tiệc 🎉'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WeddingScreen
      key={stage.session.code}
      session={stage.session}
      profile={profile}
      onProfile={updateProfile}
      onLeave={goHome}
      onCodeTaken={() => setStage({ kind: 'room', session: { ...stage.session, code: newCode() } })}
    />
  );
}
