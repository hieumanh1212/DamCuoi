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
import { MusicPanel } from './MusicPanel';
import { music } from '../lib/music';

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
  at: number;
}

type Panel = 'gift' | 'guestbook' | 'invite' | 'character' | null;

const lsGet = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* bỏ qua */ } };
let seq = 0;

const CHAT_KEY = 'dam-cuoi:chatOpen';
const initialChatOpen = () => {
  try {
    const v = localStorage.getItem(CHAT_KEY);
    return v === null ? window.innerWidth > 820 : v === '1';
  } catch {
    return window.innerWidth > 820;
  }
};

export function WeddingScreen({ session, profile, onProfile, onLeave, onCodeTaken }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const connRef = useRef<Connection | null>(null);
  const createdRef = useRef(false);
  const welcomedRef = useRef(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const peopleRef = useRef(new Set<string>());
  const chatOpenRef = useRef(false);

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
  const [placingColor, setPlacingColor] = useState(0);
  const [selected, setSelected] = useState<Item | null>(null);
  const [ceremonyBar, setCeremonyBar] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatOpen, setChatOpenState] = useState(initialChatOpen);
  const [unread, setUnread] = useState(0);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [draft, setDraft] = useState<Profile>(profile);
  const [musicOpen, setMusicOpen] = useState(false);
  const [party, setPartyState] = useState(false);
  const partyRef = useRef(false);
  partyRef.current = party;
  const [musicOn, setMusicOn] = useState(() => lsGet('dam-cuoi:musicOn', '1') === '1');
  const [volume, setVolume] = useState(() => Number(lsGet('dam-cuoi:volume', '0.6')));
  const [fullscreen, setFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 12000);
    return () => clearTimeout(t);
  }, []);

  // báo cho camera biết phần màn hình bị giao diện nổi che
  const insetsRef = useRef<() => void>(() => {});
  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth <= 820;
      sceneRef.current?.setInsets({
        top: mobile ? 112 : 80,
        bottom: mobile ? 70 : 76,
        left: editing && !mobile ? 330 : 0,
        right: chatOpen && !mobile ? 330 : musicOpen && !mobile ? 370 : 0,
      });
    };
    insetsRef.current = update;
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [editing, chatOpen, musicOpen]);
  const canFullscreen = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

  // nhạc nền: phát bài cô dâu chú rể chọn
  useEffect(() => {
    if (!info) return;
    if (!musicOn) music.play('off');
    else if (party) music.play('club');
    else music.play(info.music ?? 'canon', info.musicUrl ?? '');
  }, [info?.music, info?.musicUrl, musicOn, info, party]);
  useEffect(() => music.setVolume(volume), [volume]);
  useEffect(() => () => music.play('off'), []);
  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const [, tick] = useState(0);

  chatOpenRef.current = chatOpen;
  const send = (m: Parameters<Connection['send']>[0]) => connRef.current?.send(m);
  const couple = role !== 'guest';

  const setChatOpen = (v: boolean) => {
    setChatOpenState(v);
    if (v) setUnread(0);
    try { localStorage.setItem(CHAT_KEY, v ? '1' : '0'); } catch { /* bỏ qua */ }
  };

  const toast = (text: string) => {
    const id = ++seq;
    setToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  };
  const addLog = (e: Omit<LogEntry, 'id' | 'at'>) => {
    setLog((l) => [...l.slice(-150), { ...e, id: ++seq, at: Date.now() }]);
    if (!chatOpenRef.current && !e.notice) setUnread((u) => u + 1);
  };

  // làm mới nhật ký nổi (tin nhắn tự mờ dần)
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log, chatOpen]);

  useEffect(() => {
    const scene = new Scene(canvasRef.current!, {
      send: (m) => connRef.current?.send(m),
      onInteract: (kind, item) => {
        switch (kind) {
          case 'gift':
          case 'wish':
            return setPanel('gift');
          case 'guestbook':
            return setPanel('guestbook');
          case 'photo':
            return takePhoto();
          case 'music':
            return setMusicOpen(true);
          case 'bell':
            sfx.bell();
            return connRef.current?.send({ t: 'emote', e: '🔔' });
          case 'sing':
            sfx.sing();
            return connRef.current?.send({ t: 'emote', e: '🎤' });
          case 'firework':
            return connRef.current?.send({ t: 'fx', kind: 'firework', x: item.x + 0.5, y: item.y + 0.5 });
          case 'party':
            return connRef.current?.send({ t: 'party', on: !partyRef.current });
        }
      },
      onSelect: setSelected,
    });
    sceneRef.current = scene;
    insetsRef.current();

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
          setPartyState(m.party);
          scene.setParty(m.party);
          setError(null);
          if (m.role !== 'guest') {
            const key = session.create?.key ?? session.key;
            if (key) saveAccess(m.code, { key, role: m.role });
          }
          if (session.create) createdRef.current = true;
          if (!welcomedRef.current) {
            welcomedRef.current = true;
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
        case 'party':
          setPartyState(m.on);
          scene.setParty(m.on);
          if (m.on) sfx.confetti();
          return;
        case 'fx':
          scene.firework(m.x, m.y);
          sfx.boom();
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
    // lối tắt cho kiểm thử tự động (chỉ khi chạy dev)
    if (import.meta.env.DEV) Object.assign(window, { __send: (m: never) => conn.send(m), __scene: scene });
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
    sceneRef.current?.setPlacing(t, placingColor);
  };

  const pickColor = (c: number) => {
    if (placing) setPlacingColor(c);
    sceneRef.current?.setColor(c);
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
          <div className="big-emoji">😕</div>
          <h2>{error}</h2>
          <button className="btn primary" onClick={onLeave}>Về trang chủ</button>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const recent = log.filter((e) => now - e.at < 9000).slice(-3);
  const logList = (
    <>
      {log.map((e) => (
        <div key={e.id} className={`line ${e.notice ? 'n' : ''}`}>{e.name && <b>{e.name}</b>}<span>{e.text}</span></div>
      ))}
      {log.length === 0 && <p className="muted small empty-chat">Chưa có tin nhắn. Chào mọi người một tiếng nhé! 👋</p>}
    </>
  );

  return (
    <div className={`wed ${editing ? 'editing' : ''} ${chatOpen ? 'chat-open' : 'chat-closed'}`}>
      <header className="wed-top">
        <button className="brand" onClick={() => confirm('Rời khỏi đám cưới?') && onLeave()} title="Rời tiệc">💍</button>
        <div className="title">
          {info ? (
            <>
              <b className="names">{info.groom} <span className="amp">&</span> {info.bride}</b>
              <span className="sub">
                {info.date && <>{formatDate(info.date)} · </>}
                <span className="online">● {count} người đang dự</span>
              </span>
            </>
          ) : (
            <span className="muted">Đang vào sảnh tiệc…</span>
          )}
        </div>
        <nav className="top-actions">
          {couple && <button className={`tb accent ${editing ? "on" : ""}`} onClick={toggleEdit} title="Trang trí"><i>🛠</i><span>Trang trí</span></button>}
          {couple && <button className={`tb accent ${ceremonyBar ? 'on' : ''}`} onClick={() => setCeremonyBar((v) => !v)} title="Nghi lễ"><i>🎊</i><span>Nghi lễ</span></button>}
          <button className="tb" onClick={() => setPanel('gift')} title="Mừng cưới"><i>💌</i><span>Mừng cưới</span></button>
          <button className="tb" onClick={() => setPanel('guestbook')} title="Lưu bút"><i>📖</i><span>Lưu bút</span>{wishes.length > 0 && <em className="badge">{wishes.length}</em>}</button>
          <button className="tb" onClick={() => setPanel('invite')} title="Mời khách"><i>🔗</i><span>Mời khách</span></button>
          <button className="tb" onClick={() => { setDraft(profile); setPanel('character'); }} title="Nhân vật"><i>👕</i><span>Nhân vật</span></button>
          <button className="tb" onClick={takePhoto} title="Chụp ảnh"><i>📸</i><span>Chụp ảnh</span></button>
          <button className={`tb ${musicOpen ? 'on' : ''}`} onClick={() => setMusicOpen((v) => !v)} title="Nhạc"><i>{musicOn && info?.music !== 'off' ? '🎵' : '🔕'}</i><span>Nhạc</span></button>
          {canFullscreen && <button className="tb" onClick={toggleFullscreen} title={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}><i>{fullscreen ? '🗗' : '⛶'}</i><span>{fullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span></button>}
          <button className="tb icon" onClick={() => { setMuted(!muted); setMutedState(!muted); }} title="Âm thanh"><i>{muted ? '🔇' : '🔊'}</i></button>
        </nav>
      </header>

      <div className="wed-body">
        <div className="stage-wrap">
          <canvas ref={canvasRef} className="world" />
          {status !== 'open' && <div className="net">{status === 'connecting' ? 'Đang kết nối…' : 'Mất kết nối, đang thử lại…'}</div>}
          <div className="toasts">{toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>

          <div className="float-tools">
            <button className={`chat-toggle ${chatOpen ? 'on' : ''}`} onClick={() => setChatOpen(!chatOpen)} title={chatOpen ? 'Ẩn trò chuyện' : 'Mở trò chuyện'}>
              💬{!chatOpen && unread > 0 && <em className="badge">{unread > 99 ? '99+' : unread}</em>}
            </button>
            <button onClick={() => zoom(1.2)} aria-label="Phóng to">＋</button>
            <button onClick={() => zoom(1 / 1.2)} aria-label="Thu nhỏ">－</button>
          </div>

          {!editing && !chatOpen && recent.length > 0 && (
            <div className="mini-log" onClick={() => setChatOpen(true)}>
              {recent.map((e) => (
                <div key={e.id} className={e.notice ? 'n' : ''} style={{ opacity: Math.min(1, (9000 - (now - e.at)) / 2000) }}>
                  {e.name && <b>{e.name}: </b>}{e.text}
                </div>
              ))}
            </div>
          )}

          {!editing && showHint && <div className="hint">Chạm để đi · WASD/mũi tên · Chạm ghế để ngồi · Chạm 🎁 📻 🔔 🎆 để tương tác</div>}
          {party && !editing && (
            <div className="party-banner">
              <span className="dot" />🪩 <b>Chế độ Bar</b> · DJ tự động đang quẩy
              <button onClick={() => send({ t: 'party', on: false })}>Tắt</button>
            </div>
          )}
          {editing && <div className="edit-hint">👻 Đang ẩn khách mời để bạn trang trí dễ hơn · Kéo nền để di chuyển góc nhìn</div>}
          {musicOpen && info && (
            <MusicPanel
              info={party ? { ...info, music: 'club' as never } : info}
              couple={couple}
              enabled={musicOn}
              volume={volume}
              onEnabled={(v) => { setMusicOn(v); lsSet('dam-cuoi:musicOn', v ? '1' : '0'); }}
              onVolume={(v) => { setVolume(v); lsSet('dam-cuoi:volume', String(v)); }}
              onSet={(patch) => send({ t: 'info', info: patch })}
              onClose={() => setMusicOpen(false)}
            />
          )}

          {ceremonyBar && couple && (
            <div className="ceremony-bar">
              {CEREMONIES.map((c) => (
                <button key={c.kind} onClick={() => send({ t: 'ceremony', kind: c.kind })}>
                  <span>{c.icon}</span>{c.name}
                </button>
              ))}
              <button className={party ? 'party-on' : ''} onClick={() => send({ t: 'party', on: !party })}>
                <span>🪩</span>{party ? 'Tắt Bar' : 'Bật Bar'}
              </button>
            </div>
          )}

          {editing && info && (
            <EditPanel
              info={info}
              placing={placing}
              placingColor={placingColor}
              selected={selected}
              onPlacing={setPlacing}
              onColor={pickColor}
              onRotate={() => sceneRef.current?.rotate()}
              onDelete={() => sceneRef.current?.deleteSelected()}
              onInfo={(patch) => send({ t: 'info', info: patch })}
              onReset={() => send({ t: 'resetLayout' })}
              onClose={toggleEdit}
            />
          )}
        </div>

        <aside className="side" aria-hidden={!chatOpen}>
          <header>
            <h3>💬 Trò chuyện</h3>
            <button className="x" onClick={() => setChatOpen(false)} aria-label="Ẩn trò chuyện">✕</button>
          </header>
          <div className="log" ref={logRef}>{logList}</div>
        </aside>
      </div>

      <footer className="wed-bottom">
        <div className="emote-wrap">
          <button className={`emote-btn ${emoteOpen ? 'on' : ''}`} onClick={() => setEmoteOpen((v) => !v)} aria-label="Biểu cảm">😊</button>
          {emoteOpen && (
            <div className="emote-pop">
              {EMOTES.map((e) => <button key={e} onClick={() => { send({ t: 'emote', e }); setEmoteOpen(false); }}>{e}</button>)}
            </div>
          )}
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
          <input value={chatText} maxLength={LIMITS.chatLength} placeholder="Nói gì đó với mọi người…" onChange={(e) => setChatText(e.target.value)} enterKeyHint="send" />
          <button className="send" type="submit" aria-label="Gửi">➤</button>
        </form>
        <div className="quick-emotes">
          {EMOTES.slice(0, 4).map((e) => <button key={e} onClick={() => send({ t: 'emote', e })}>{e}</button>)}
        </div>
      </footer>

      {welcome && info && (
        <Modal title="" onClose={() => setWelcome(false)}>
          <div className="welcome-card">
            <div className="welcome-rings">💍</div>
            <p className="eyebrow">Trân trọng kính mời bạn đến dự</p>
            <h2 className="script">{info.groom} & {info.bride}</h2>
            {info.date && <p className="date-pill">{formatDate(info.date)}</p>}
            <p className="welcome-msg">“{info.welcome}”</p>
            <ul className="howto">
              <li><span>🚶</span><div>Chạm vào sảnh để đi lại, chạm vào ghế để ngồi</div></li>
              <li><span>🎁</span><div>Ghé <b>hòm mừng cưới</b> để gửi phong bì kèm lời chúc</div></li>
              <li><span>💬</span><div>Chat và thả biểu cảm ở thanh bên dưới</div></li>
            </ul>
            <button className="btn primary big wide" onClick={() => setWelcome(false)}>Vào tiệc thôi! 🎉</button>
          </div>
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
