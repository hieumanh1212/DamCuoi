import { useEffect, useRef, useState } from 'react';
import type { Role } from '../../../shared/look';
import { CEREMONIES, EMOTES, LIMITS, type ServerMsg, type WeddingInfo, type Wish } from '../../../shared/protocol';
import type { Item, ItemType } from '../../../shared/world';
import { formatDate } from '../game/draw';
import { Scene } from '../game/scene';
import { wsUrl } from '../lib/config';
import { Connection, type Status } from '../lib/connection';
import { getPlayerId, saveAccess, type Profile } from '../lib/identity';
import { isMuted, setMuted, sfx } from '../lib/sfx';
import { CharacterEditor } from './CharacterEditor';
import { GiftDialog, Guestbook, InviteDialog, Modal } from './Dialogs';
import { EditPanel } from './EditPanel';

export interface Session {
  code: string;
  create?: { groom: string; bride: string; date: string; key: string };
  key?: string;
  role?: 'groom' | 'bride';
}

interface Props {
  session: Session;
  profile: Profile;
  onProfile: (p: Profile) => void;
  onLeave: () => void;
  onCodeTaken: () => void;
}

interface LogEntry {
  id: number;
  name?: string;
  text: string;
  notice?: boolean;
}

type Panel = 'gift' | 'guestbook' | 'invite' | 'character' | null;
let seq = 0;

export function WeddingScreen({ session, profile, onProfile, onLeave, onCodeTaken }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const connRef = useRef<Connection | null>(null);
  const createdRef = useRef(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const peopleRef = useRef(new Set<string>());
  const createdWelcomeShown = useRef(false);

  const [status, setStatus] = useState<Status>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('guest');
  const [info, setInfo] = useState<WeddingInfo | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [count, setCount] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [editing, setEditing] = useState(false);
  const [placing, setPlacingState] = useState<ItemType | null>(null);
  const [selected, setSelected] = useState<Item | null>(null);
  const [ceremonyBar, setCeremonyBar] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [draft, setDraft] = useState<Profile>(profile);

  const send = (m: Parameters<Connection['send']>[0]) => connRef.current?.send(m);
  const couple = role !== 'guest';

  const toast = (text: string) => {
    const id = ++seq;
    setToasts((t) => [...t.slice(-3), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  };
  const addLog = (e: Omit<LogEntry, 'id'>) => setLog((l) => [...l.slice(-150), { ...e, id: ++seq }]);

  useEffect(() => {
    const scene = new Scene(canvasRef.current!, {
      send: (m) => connRef.current?.send(m),
      onInteract: (kind) => {
        if (kind === 'gift') setPanel('gift');
        else if (kind === 'guestbook') setPanel('guestbook');
        else takePhoto();
      },
      onSelect: setSelected,
    });
    sceneRef.current = scene;

    const onMessage = (m: ServerMsg) => {
      const people = peopleRef.current;
      switch (m.t) {
        case 'welcome': {
          scene.setMe(m.you);
          scene.setInfo(m.info);
          scene.setItems(m.items);
          scene.setPlayers(m.players);
          people.clear();
          m.players.forEach((p) => people.add(p.id));
          setCount(people.size);
          setInfo(m.info);
          setWishes(m.wishes);
          setRole(m.role);
          setError(null);
          if (m.role !== 'guest') {
            const key = session.create?.key ?? session.key;
            if (key) saveAccess(m.code, { key, role: m.role });
          }
          if (session.create) createdRef.current = true;
          if (!createdWelcomeShown.current) {
            createdWelcomeShown.current = true;
            if (session.create) setPanel('invite');
            else setWelcome(true);
            sfx.chime();
          }
          return;
        }
        case 'join':
          scene.upsert(m.p);
          people.add(m.p.id);
          setCount(people.size);
          return;
        case 'leave':
          scene.remove(m.id);
          people.delete(m.id);
          setCount(people.size);
          return;
        case 'pos':
          scene.applyPositions(m.p);
          return;
        case 'chat':
          scene.say(m.id, m.text);
          addLog({ name: m.name, text: m.text });
          sfx.chat();
          return;
        case 'notice':
          toast(m.text);
          addLog({ text: m.text, notice: true });
          return;
        case 'emote':
          scene.emote(m.id, m.e);
          return;
        case 'items':
          scene.setItems(m.items);
          return;
        case 'info':
          scene.setInfo(m.info);
          setInfo(m.info);
          return;
        case 'wish':
          setWishes((w) => [...w, m.wish]);
          sfx.wish();
          return;
        case 'delWish':
          setWishes((w) => w.filter((x) => x.id !== m.id));
          return;
        case 'ceremony':
          scene.ceremony(m.kind, m.by, m.target);
          if (m.kind === 'confetti') sfx.confetti();
          else if (m.kind === 'toast') sfx.toast();
          else if (m.kind === 'kiss') sfx.kiss();
          else sfx.chime();
          return;
        case 'error':
          if (m.code === 'exists') onCodeTaken();
          else setError(m.message);
          return;
      }
    };

    const conn = new Connection(
      wsUrl(session.code),
      () => ({
        t: 'hello',
        playerId: getPlayerId(),
        name: profileRef.current.name,
        look: profileRef.current.look,
        key: session.create?.key ?? session.key,
        role: session.role,
        create: session.create && !createdRef.current ? session.create : undefined,
      }),
      onMessage,
      setStatus,
    );
    connRef.current = conn;
    conn.connect();
    return () => {
      conn.close();
      scene.destroy();
      connRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const setPlacing = (t: ItemType | null) => {
    setPlacingState(t);
    sceneRef.current?.setPlacing(t);
  };

  const toggleEdit = () => {
    const on = !editing;
    setEditing(on);
    setPlacing(null);
    sceneRef.current?.setEditing(on);
    setCeremonyBar(false);
  };

  function takePhoto() {
    const url = sceneRef.current?.snapshot();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `dam-cuoi-${session.code}.png`;
    a.click();
    toast('📸 Đã chụp ảnh sảnh tiệc!');
  }

  const zoom = (k: number) => {
    const s = sceneRef.current;
    if (s) s.setZoom(s.getZoom() * k);
  };

  if (error) {
    return (
      <div className="center-screen">
        <div className="card narrow">
          <h2>😕 {error}</h2>
          <button className="btn primary" onClick={onLeave}>Về trang chủ</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`wed ${editing ? 'editing' : ''}`}>
      <header className="wed-top">
        <button className="brand" onClick={() => confirm('Rời khỏi đám cưới?') && onLeave()} title="Rời tiệc">💍</button>
        <div className="title">
          {info ? (
            <>
              <b>{info.groom} <span className="hearts">❤</span> {info.bride}</b>
              {info.date && <span className="date">{formatDate(info.date)}</span>}
            </>
          ) : (
            <span className="muted">Đang vào sảnh tiệc…</span>
          )}
        </div>
        <span className="online" title="Đang có mặt">👥 {count}</span>
        <div className="top-actions">
          {couple && <button className={`tb ${editing ? 'on' : ''}`} onClick={toggleEdit}>🛠 <span>Trang trí</span></button>}
          {couple && <button className={`tb ${ceremonyBar ? 'on' : ''}`} onClick={() => setCeremonyBar((v) => !v)}>🎊 <span>Nghi lễ</span></button>}
          <button className="tb" onClick={() => setPanel('gift')}>💌 <span>Mừng cưới</span></button>
          <button className="tb" onClick={() => setPanel('guestbook')}>📖 <span>Lưu bút</span>{wishes.length > 0 && <i className="badge">{wishes.length}</i>}</button>
          <button className="tb" onClick={() => setPanel('invite')}>🔗 <span>Mời khách</span></button>
          <button className="tb" onClick={() => { setDraft(profile); setPanel('character'); }}>👕 <span>Nhân vật</span></button>
          <button className="tb" onClick={takePhoto}>📸 <span>Chụp ảnh</span></button>
          <button className="tb icon" onClick={() => { setMuted(!muted); setMutedState(!muted); }} title="Âm thanh">{muted ? '🔇' : '🔊'}</button>
        </div>
      </header>

      <div className="wed-body">
        <div className="stage-wrap">
          <canvas ref={canvasRef} className="world" />
          {status !== 'open' && <div className="net">{status === 'connecting' ? 'Đang kết nối…' : 'Mất kết nối, đang thử lại…'}</div>}
          <div className="toasts">{toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>
          <div className="zoom">
            <button onClick={() => zoom(1.2)} aria-label="Phóng to">＋</button>
            <button onClick={() => zoom(1 / 1.2)} aria-label="Thu nhỏ">－</button>
          </div>
          {!editing && <div className="hint">🖱️ Chạm/nhấp để đi · ⌨️ WASD/mũi tên · Chạm ghế để ngồi · Chạm 🎁 để mừng cưới</div>}

          {ceremonyBar && couple && (
            <div className="ceremony-bar">
              {CEREMONIES.map((c) => (
                <button key={c.kind} onClick={() => send({ t: 'ceremony', kind: c.kind })}>
                  <span>{c.icon}</span>{c.name}
                </button>
              ))}
            </div>
          )}

          {/* nhật ký chat nổi (điện thoại) */}
          <div className={`float-log ${chatOpen ? 'open' : ''}`} onClick={() => setChatOpen((v) => !v)}>
            {log.slice(chatOpen ? -40 : -4).map((e) => (
              <div key={e.id} className={e.notice ? 'n' : ''}>{e.name && <b>{e.name}: </b>}{e.text}</div>
            ))}
          </div>

          {editing && info && (
            <EditPanel
              info={info}
              placing={placing}
              selected={selected}
              onPlacing={setPlacing}
              onRotate={() => sceneRef.current?.rotate()}
              onDelete={() => sceneRef.current?.deleteSelected()}
              onInfo={(patch) => send({ t: 'info', info: patch })}
              onReset={() => send({ t: 'resetLayout' })}
              onClose={toggleEdit}
            />
          )}
        </div>

        <aside className="side">
          <h3>💬 Trò chuyện</h3>
          <div className="log">
            {log.map((e) => (
              <div key={e.id} className={e.notice ? 'n' : ''}>{e.name && <b>{e.name}: </b>}{e.text}</div>
            ))}
            {log.length === 0 && <p className="muted small">Chào mọi người một tiếng nhé! 👋</p>}
          </div>
        </aside>
      </div>

      <footer className="wed-bottom">
        <div className="emotes">
          {EMOTES.map((e) => <button key={e} onClick={() => send({ t: 'emote', e })}>{e}</button>)}
        </div>
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            const t = chatText.trim();
            if (t) send({ t: 'chat', text: t });
            setChatText('');
            (document.activeElement as HTMLElement | null)?.blur?.();
          }}
        >
          <input value={chatText} maxLength={LIMITS.chatLength} placeholder="Nói gì đó… (Enter để gửi)" onChange={(e) => setChatText(e.target.value)} enterKeyHint="send" />
          <button className="btn primary" type="submit">Gửi</button>
        </form>
      </footer>

      {welcome && info && (
        <Modal title={`💒 Đám cưới ${info.groom} & ${info.bride}`} onClose={() => setWelcome(false)}>
          <p className="welcome-msg">“{info.welcome}”</p>
          {info.date && <p className="muted">Ngày cưới: <b>{formatDate(info.date)}</b></p>}
          <ul className="howto">
            <li>🚶 Chạm vào sảnh để đi lại, chạm vào ghế để ngồi.</li>
            <li>🎁 Ghé <b>hòm mừng cưới</b> để gửi phong bì kèm lời chúc.</li>
            <li>💬 Chat và thả biểu cảm ở thanh phía dưới.</li>
          </ul>
          <button className="btn primary wide" onClick={() => setWelcome(false)}>Vào tiệc thôi! 🎉</button>
        </Modal>
      )}
      {panel === 'gift' && info && (
        <GiftDialog info={info} onClose={() => setPanel(null)} onSend={(message, color) => send({ t: 'wish', message, color })} />
      )}
      {panel === 'guestbook' && (
        <Guestbook
          wishes={wishes}
          canDelete={couple}
          onDelete={(id) => send({ t: 'delWish', id })}
          onClose={() => setPanel(null)}
          onWrite={couple ? undefined : () => setPanel('gift')}
        />
      )}
      {panel === 'invite' && info && (
        <InviteDialog code={session.code} role={role} accessKey={session.create?.key ?? session.key} info={info} onClose={() => setPanel(null)} />
      )}
      {panel === 'character' && (
        <Modal title="👕 Nhân vật của bạn" onClose={() => setPanel(null)} wide>
          <CharacterEditor profile={draft} role={role} onChange={setDraft} />
          <div className="modal-actions">
            <span />
            <button
              className="btn primary"
              disabled={!draft.name.trim()}
              onClick={() => {
                const p = { ...draft, name: draft.name.trim() };
                onProfile(p);
                send({ t: 'profile', name: p.name, look: p.look });
                setPanel(null);
              }}
            >
              Lưu
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
