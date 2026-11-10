import { useState, type ReactNode } from 'react';
import type { Role } from '../../../shared/look';
import { ENVELOPES, LIMITS, type WeddingInfo, type Wish } from '../../../shared/protocol';
import { inviteLink, manageLink } from '../lib/config';

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-bg" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <header>
          {title ? <h2>{title}</h2> : <span />}
          <button className="x" onClick={onClose} aria-label="Đóng">✕</button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function GiftDialog({ info, onSend, onClose }: { info: WeddingInfo; onSend: (msg: string, color: number) => void; onClose: () => void }) {
  const [msg, setMsg] = useState('');
  const [color, setColor] = useState(0);
  const env = ENVELOPES[color];
  return (
    <Modal title="💌 Mừng cưới" onClose={onClose}>
      <p className="muted">Gửi lời chúc tới <b>{info.groom}</b> & <b>{info.bride}</b>. Phong bì sẽ được bỏ vào hòm mừng cưới và lưu trong sổ lưu bút.</p>
      <div className="envelope" style={{ background: env.color, color: color === 3 ? '#c62828' : '#ffd54f' }}>
        <div className="env-flap" />
        <span>囍</span>
      </div>
      <div className="chips center">
        {ENVELOPES.map((e, i) => (
          <button key={e.name} className={`chip ${i === color ? 'on' : ''}`} onClick={() => setColor(i)}>
            <span className="dot" style={{ background: e.color }} /> {e.name}
          </button>
        ))}
      </div>
      <textarea
        value={msg}
        maxLength={LIMITS.wishLength}
        rows={4}
        autoFocus
        placeholder="Chúc hai bạn trăm năm hạnh phúc, sớm có tin vui nhé! 🥰"
        onChange={(e) => setMsg(e.target.value)}
      />
      <div className="modal-actions">
        <span className="muted small">{msg.length}/{LIMITS.wishLength}</span>
        <button className="btn primary" disabled={!msg.trim()} onClick={() => { onSend(msg.trim(), color); onClose(); }}>Bỏ vào hòm 💌</button>
      </div>
    </Modal>
  );
}

export function Guestbook({ wishes, canDelete, onDelete, onClose, onWrite }: {
  wishes: Wish[]; canDelete: boolean; onDelete: (id: number) => void; onClose: () => void; onWrite?: () => void;
}) {
  const list = [...wishes].reverse();
  return (
    <Modal title={`📖 Sổ lưu bút (${wishes.length})`} onClose={onClose} wide>
      {onWrite && <button className="btn primary wide" onClick={onWrite}>✍️ Viết lời chúc</button>}
      {list.length === 0 ? (
        <p className="empty">Chưa có lời chúc nào. Hãy là người đầu tiên! 💕</p>
      ) : (
        <ul className="wishes">
          {list.map((w) => (
            <li key={w.id} style={{ borderLeftColor: ENVELOPES[w.color]?.color }}>
              <div className="wish-head">
                <b>{w.avatar} {w.name}</b>
                <span className="muted small">{new Date(w.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                {canDelete && <button className="del" title="Xóa" onClick={() => confirm('Xóa lời chúc này?') && onDelete(w.id)}>🗑</button>}
              </div>
              <p>{w.message}</p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function CopyRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      prompt('Sao chép:', value);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <div className={`copy-row ${secret ? 'secret' : ''}`}>
      <span className="label">{label}</span>
      <div className="copy-box">
        <input readOnly value={value} onFocus={(e) => e.target.select()} />
        <button className="btn small" onClick={copy}>{done ? '✔ Đã chép' : 'Chép'}</button>
      </div>
    </div>
  );
}

export function InviteDialog({ code, role, accessKey, info, onClose }: { code: string; role: Role; accessKey?: string; info: WeddingInfo; onClose: () => void }) {
  const link = inviteLink(code);
  const share = async () => {
    try {
      await navigator.share({ title: `Đám cưới ${info.groom} & ${info.bride}`, text: `Mời bạn đến dự đám cưới online của ${info.groom} & ${info.bride} 💍`, url: link });
    } catch { /* hủy */ }
  };
  return (
    <Modal title="🔗 Mời khách" onClose={onClose}>
      <div className="code-big">{code}</div>
      <CopyRow label="Link mời khách — gửi cho bạn bè, người thân" value={link} />
      {'share' in navigator && <button className="btn wide" onClick={share}>📤 Chia sẻ qua Zalo / Messenger…</button>}
      {role !== 'guest' && accessKey && (
        <>
          <hr />
          <CopyRow label={`🔐 Link quản lý — chỉ gửi cho ${role === 'groom' ? 'cô dâu' : 'chú rể'}`} value={manageLink(code, accessKey)} secret />
          <p className="muted small">Ai có link quản lý đều trang trí được sảnh tiệc và tổ chức nghi lễ. Đừng gửi cho khách nhé!</p>
        </>
      )}
    </Modal>
  );
}
