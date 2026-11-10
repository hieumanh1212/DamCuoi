import { useEffect, useState } from 'react';
import { MUSIC_TRACKS, type MusicId, type WeddingInfo } from '../../../shared/protocol';
import { music } from '../lib/music';

interface Props {
  info: WeddingInfo;
  couple: boolean;
  enabled: boolean;
  volume: number;
  onEnabled: (v: boolean) => void;
  onVolume: (v: number) => void;
  onSet: (patch: { music?: MusicId; musicUrl?: string }) => void;
  onClose: () => void;
}

export function nowPlayingName(info: WeddingInfo) {
  const id = info.music ?? 'canon';
  if (id === 'off') return 'Đã tắt nhạc';
  if (id === 'url') return 'Nhạc do cô dâu chú rể chọn';
  if ((id as string) === 'club') return '🪩 Chế độ Bar — EDM 126 BPM';
  return MUSIC_TRACKS.find((t) => t.id === id)?.name ?? '';
}

export function MusicPanel({ info, couple, enabled, volume, onEnabled, onVolume, onSet, onClose }: Props) {
  const current = info.music ?? 'canon';
  const [url, setUrl] = useState(info.musicUrl ?? '');
  const [, force] = useState(0);
  useEffect(() => { const off = music.onChange(() => force((x) => x + 1)); return () => { off(); }; }, []);

  return (
    <div className="music-panel" role="dialog" aria-label="Nhạc đám cưới">
      <header>
        <h3>🎵 Nhạc đám cưới</h3>
        <button className="x" onClick={onClose} aria-label="Đóng">✕</button>
      </header>
      <div className="now">
        <div className={`eq ${enabled && current !== 'off' ? 'on' : ''}`}><i /><i /><i /><i /></div>
        <div>
          <small>Cả sảnh đang nghe</small>
          <b>{nowPlayingName(info)}</b>
        </div>
      </div>
      {music.blocked && enabled && <p className="tip small">👆 Chạm vào bất kỳ đâu trên trang để trình duyệt cho phép phát nhạc.</p>}

      <label className="switch-row">
        <span>Nghe nhạc trên máy này</span>
        <input type="checkbox" checked={enabled} onChange={(e) => onEnabled(e.target.checked)} />
        <i className="switch" />
      </label>
      <label className="vol-row">
        <span>🔈</span>
        <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => onVolume(Number(e.target.value))} disabled={!enabled} />
        <span>🔊</span>
      </label>

      {couple && (
        <>
          <h4>Chọn nhạc cho cả sảnh</h4>
          <div className="tracks">
            {MUSIC_TRACKS.map((t) => (
              <button key={t.id} className={`track ${current === t.id ? 'on' : ''}`} onClick={() => onSet({ music: t.id })}>
                <span className="ic">{t.icon}</span>
                <span className="meta"><b>{t.name}</b><small>{t.by}</small></span>
                {current === t.id && <span className="playing">▶</span>}
              </button>
            ))}
            <button className={`track ${current === 'off' ? 'on' : ''}`} onClick={() => onSet({ music: 'off' })}>
              <span className="ic">🔇</span>
              <span className="meta"><b>Tắt nhạc</b><small>Cả sảnh yên lặng</small></span>
            </button>
          </div>
          <h4>Hoặc dán link file nhạc của bạn</h4>
          <form
            className="url-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (/^https:\/\/\S+$/.test(url.trim())) onSet({ music: 'url', musicUrl: url.trim() });
            }}
          >
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/bai-hat.mp3" />
            <button className="btn small primary" type="submit" disabled={!/^https:\/\/\S+$/.test(url.trim())}>Phát</button>
          </form>
          <p className="muted small">Link phải trỏ thẳng tới file .mp3/.ogg (không dùng link YouTube). Hãy dùng nhạc bạn có quyền phát.</p>
        </>
      )}
      {!couple && <p className="muted small">Nhạc do cô dâu chú rể chọn. Nhạc được tạo ngay trên máy bạn, không tốn dữ liệu.</p>}
    </div>
  );
}
