import { DurableObject } from 'cloudflare:workers';
import { CODE_RE, type ClientMsg, type ServerMsg } from '../../shared/protocol';
import { Wedding, type Store } from './wedding';

export interface Env {
  WEDDINGS: DurableObjectNamespace<WeddingRoom>;
  /** Danh sách origin được phép, cách nhau bởi dấu phẩy. Để trống = cho phép tất cả. */
  ALLOWED_ORIGINS?: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      const code = (url.searchParams.get('code') ?? '').toUpperCase();
      if (!CODE_RE.test(code)) return new Response('Mã đám cưới không hợp lệ', { status: 400 });
      if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('Cần kết nối WebSocket', { status: 426 });
      }
      const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      if (allowed.length && !allowed.includes(req.headers.get('Origin') ?? '')) {
        return new Response('Origin không được phép', { status: 403 });
      }
      return env.WEDDINGS.get(env.WEDDINGS.idFromName(code)).fetch(req);
    }
    return new Response('Đám Cưới Online server đang chạy 💍', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
} satisfies ExportedHandler<Env>;

/** Mỗi đám cưới là một Durable Object, dữ liệu (trang trí, lời chúc) được lưu bền vững */
export class WeddingRoom extends DurableObject<Env> {
  private wedding: Wedding;
  private sockets = new Map<string, WebSocket>();
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const storage = ctx.storage;
    const store: Store = {
      get: (k) => storage.get(k),
      put: (k, v) => storage.put(k, v),
      delete: (k) => storage.delete(k),
      list: (prefix) => storage.list({ prefix }),
    };
    this.wedding = new Wedding(store, { send: (id, msg) => this.send(id, msg) });
    ctx.blockConcurrencyWhile(() => this.wedding.load());
  }

  async fetch(req: Request): Promise<Response> {
    const code = (new URL(req.url).searchParams.get('code') ?? '').toUpperCase();
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    let playerId: string | null = null;

    server.addEventListener('message', (ev) => {
      let msg: ClientMsg;
      try {
        if (typeof ev.data !== 'string' || ev.data.length > 32_000) return;
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg?.t === 'ping') return;
      if (!playerId) {
        if (msg?.t !== 'hello' || typeof msg.playerId !== 'string' || !msg.playerId) return server.close(4000, 'hello required');
        const id = msg.playerId.slice(0, 64);
        const old = this.sockets.get(id);
        if (old && old !== server) {
          try {
            old.send(JSON.stringify({ t: 'error', code: 'replaced', message: 'Bạn đã mở đám cưới này ở tab khác.' }));
            old.close(4002, 'replaced');
          } catch { /* đã đóng */ }
        }
        this.sockets.set(id, server);
        if (this.wedding.join(id, code, msg)) {
          playerId = id;
          this.startTicker();
        } else {
          this.sockets.delete(id);
          server.close(4001, 'rejected');
        }
        return;
      }
      this.wedding.handle(playerId, msg);
    });

    const onClose = () => {
      if (playerId && this.sockets.get(playerId) === server) {
        this.sockets.delete(playerId);
        this.wedding.leave(playerId);
      }
      if (this.sockets.size === 0) this.stopTicker();
    };
    server.addEventListener('close', onClose);
    server.addEventListener('error', onClose);
    return new Response(null, { status: 101, webSocket: client });
  }

  private send(id: string, msg: ServerMsg) {
    const ws = this.sockets.get(id);
    if (!ws) return;
    try {
      ws.send(JSON.stringify(msg));
    } catch { /* socket đã đóng */ }
  }

  private startTicker() {
    this.ticker ??= setInterval(() => this.wedding.flush(), 100);
  }

  private stopTicker() {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }
}
