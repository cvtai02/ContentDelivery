'use client';

import { useEffect, useState } from 'react';

type MaskedTarget = { id: string; name: string; token: string };
type AvailablePage = { id: string; name: string };

type Config = {
  appId: string;
  appSecret: string;
  targets: MaskedTarget[];
};

function Field({ label, value, onChange, placeholder, type = 'text', hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-muted">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-divider bg-surface px-3 py-2 text-xs text-primary outline-none focus:border-accent font-mono"
      />
      {hint && <p className="text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [userToken, setUserToken] = useState('');
  const [pageId, setPageId] = useState('');
  const [availablePages, setAvailablePages] = useState<AvailablePage[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: Config) => {
        setConfig(d);
        setAppId(d.appId ?? '');
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setAvailablePages([]);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: appId || undefined,
          appSecret: appSecret || undefined,
          userToken: userToken || undefined,
          pageId: pageId || undefined,
        }),
      });
      const data = await res.json() as Config & { added?: string; availablePages?: AvailablePage[] };
      if (!res.ok) throw new Error((data as unknown as { error: string }).error);

      setConfig({ appId: data.appId, appSecret: data.appSecret, targets: data.targets });
      setAppSecret('');
      setUserToken('');

      if (data.availablePages && data.availablePages.length > 1) {
        setAvailablePages(data.availablePages);
      }

      setMessage(data.added
        ? `Đã thêm "${data.added}" vào danh sách. Restart Next.js để áp dụng.`
        : 'Đã lưu cài đặt.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-lg flex-col gap-5 rounded-2xl bg-panel p-6 shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-primary">Facebook Settings</h2>
          <button onClick={onClose} className="text-muted hover:text-primary cursor-pointer bg-transparent border-none text-lg leading-none">✕</button>
        </div>

        {/* Current targets */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Targets đang cấu hình</p>
          {fetching ? (
            <div className="h-10 animate-pulse rounded-xl bg-surface" />
          ) : !config?.targets.length ? (
            <p className="text-xs text-muted italic">Chưa có target nào.</p>
          ) : (
            config.targets.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary">{t.name}</p>
                  <p className="text-[11px] text-muted font-mono">{t.id} · {t.token}</p>
                </div>
                <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">active</span>
              </div>
            ))
          )}
        </div>

        <hr className="border-divider" />

        {/* Credential form */}
        <form onSubmit={submit} className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Cài đặt</p>

          <Field
            label="App ID"
            value={appId}
            onChange={setAppId}
            placeholder="1796431771326850"
            hint="developers.facebook.com → App → Settings → Basic"
          />
          <Field
            label="App Secret"
            value={appSecret}
            onChange={setAppSecret}
            placeholder="Để trống nếu không đổi"
            type="password"
          />
          <Field
            label="User Access Token"
            value={userToken}
            onChange={setUserToken}
            placeholder="EAAZAh… (lấy từ Graph API Explorer)"
            hint="Cần quyền pages_manage_posts — để trống nếu chỉ lưu App ID/Secret"
          />
          <Field
            label="Page ID (tuỳ chọn)"
            value={pageId}
            onChange={setPageId}
            placeholder="Mặc định lấy page đầu tiên"
          />

          {/* Available pages hint */}
          {availablePages.length > 0 && (
            <div className="rounded-xl bg-surface p-3 flex flex-col gap-1">
              <p className="text-xs font-semibold text-muted">Các page trong tài khoản:</p>
              {availablePages.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPageId(p.id)}
                  className="text-left text-xs text-accent hover:underline cursor-pointer bg-transparent border-none"
                >
                  {p.name} — {p.id}
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-fall">{error}</p>}
          {message && <p className="text-xs text-accent">{message}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary cursor-pointer bg-transparent">
              Đóng
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-wait cursor-pointer"
            >
              {loading ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
