function serverBase(): string {
  const env = import.meta.env.VITE_SERVER_URL?.trim();
  if (env) return env.replace(/\/+$/, '').replace(/^http/, 'ws');
  // Chạy local: wrangler dev ở cổng 8788 trên cùng máy
  return `ws://${location.hostname || 'localhost'}:8788`;
}

export const SERVER_URL = serverBase();
export const wsUrl = (code: string) => `${SERVER_URL}/ws?code=${encodeURIComponent(code)}`;

const base = () => `${location.origin}${location.pathname}${location.search}`;
/** Link mời khách */
export const inviteLink = (code: string) => `${base()}#/${code}`;
/** Link quản lý (bí mật) cho cô dâu / chú rể */
export const manageLink = (code: string, key: string) => `${base()}#/${code}?k=${key}`;
