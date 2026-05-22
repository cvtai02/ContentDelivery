'use client';

import { useEffect, useState } from 'react';

type Config = { appKey: string; hasSecret: boolean; token: string; uid: string };

function Field({ label, value, onChange, placeholder, type = 'text', hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-muted">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-divider bg-surface px-3 py-2 text-xs text-primary outline-none focus:border-accent font-mono"
      />
      {hint && <p className="text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

export function WeiboSettingsDialog({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/weibo/settings')
      .then((r) => r.json())
      .then((d: Config) => {
        setConfig(d);
        setAppKey(d.appKey ?? '');
      })
      .catch(() => undefined);

    // Pick up success/error from OAuth redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('weibo_success')) {
      setMessage('Đăng nhập Weibo thành công!');
      window.history.replaceState({}, '', window.location.pathname);
      fetch('/api/weibo/settings').then((r) => r.json()).then(setConfig).catch(() => undefined);
    }
    if (params.get('weibo_error')) {
      setError(`Lỗi: ${params.get('weibo_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/weibo/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appKey: appKey || undefined, appSecret: appSecret || undefined }),
      });
      const data = await res.json() as Config;
      setConfig(data);
      setAppSecret('');
      setMessage('Đã lưu.');
    } catch {
      setError('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl bg-panel p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-primary">Weibo Settings</h2>
          <button onClick={onClose} className="text-muted hover:text-primary cursor-pointer bg-transparent border-none text-lg leading-none">✕</button>
        </div>

        {/* Current token status */}
        <div className="rounded-xl bg-surface px-4 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted">Access Token</p>
            <p className="text-xs font-mono text-primary mt-0.5">
              {config?.token ? config.token : 'Chưa đăng nhập'}
            </p>
            {config?.uid && <p className="text-[10px] text-muted mt-0.5">UID: {config.uid}</p>}
          </div>
          {config?.token
            ? <span className="shrink-0 rounded-full bg-rise/15 px-2 py-0.5 text-[10px] font-semibold text-rise">active</span>
            : <span className="shrink-0 rounded-full bg-divider px-2 py-0.5 text-[10px] font-semibold text-muted">none</span>
          }
        </div>

        <form onSubmit={save} className="flex flex-col gap-3">
          <Field
            label="App Key"
            value={appKey}
            onChange={setAppKey}
            placeholder="1234567890"
            hint="open.weibo.com → 我的应用 → App Key"
          />
          <Field
            label="App Secret"
            value={appSecret}
            onChange={setAppSecret}
            placeholder="Để trống nếu không đổi"
            type="password"
          />

          {error && <p className="text-xs text-fall">{error}</p>}
          {message && <p className="text-xs text-rise">{message}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Đang lưu…' : 'Lưu'}
            </button>
            <a
              href="/api/weibo/auth"
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-opacity ${
                config?.appKey
                  ? 'bg-rise text-black hover:opacity-90 cursor-pointer'
                  : 'bg-divider text-muted cursor-not-allowed pointer-events-none'
              }`}
            >
              Đăng nhập Weibo
            </a>
            <button type="button" onClick={onClose} className="ml-auto rounded-lg border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary cursor-pointer bg-transparent">
              Đóng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
