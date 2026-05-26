'use client';

import { useEffect, useState } from 'react';

type MaskedTarget = { id: string; name: string; token: string };
type AvailablePage = { id: string; name: string };

type Config = {
  appId: string;
  appSecret: string;
  targets: MaskedTarget[];
};

const AUDIO_KEY = 'audio';

async function postJson<T>(url: string, body: object): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({})) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`);
  return data;
}

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
  const [fetching, setFetching] = useState(true);

  // Credentials section
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [credLoading, setCredLoading] = useState(false);
  const [credMessage, setCredMessage] = useState('');
  const [credError, setCredError] = useState('');

  // Token exchange section
  const [userToken, setUserToken] = useState('');
  const [pageId, setPageId] = useState('');
  const [availablePages, setAvailablePages] = useState<AvailablePage[]>([]);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenMessage, setTokenMessage] = useState('');
  const [tokenError, setTokenError] = useState('');

  // Audio prompt section
  const [audioPrompt, setAudioPrompt] = useState('');
  const [audioDefault, setAudioDefault] = useState('');
  const [audioSaved, setAudioSaved] = useState('');
  const [audioSaving, setAudioSaving] = useState(false);
  const [audioMessage, setAudioMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/prompts').then((r) => r.json()),
    ]).then(([d, pd]: [Config, { prompts: Record<string, string>; defaults: Record<string, string> }]) => {
      setConfig(d);
      setAppId(d.appId ?? '');
      const val = pd.prompts[AUDIO_KEY] ?? '';
      setAudioPrompt(val);
      setAudioSaved(val);
      setAudioDefault(pd.defaults[AUDIO_KEY] ?? '');
      setFetching(false);
    }).catch(() => setFetching(false));
  }, []);

  async function saveAudioPrompt() {
    setAudioSaving(true);
    setAudioMessage('');
    try {
      const isDefault = audioPrompt === audioDefault;
      await postJson('/api/prompts', { key: AUDIO_KEY, template: isDefault ? null : audioPrompt });
      setAudioSaved(audioPrompt);
      setAudioMessage('Đã lưu.');
    } catch {
      setAudioMessage('Lỗi khi lưu.');
    } finally {
      setAudioSaving(false);
    }
  }

  async function saveCreds(e: React.FormEvent) {
    e.preventDefault();
    setCredLoading(true);
    setCredError('');
    setCredMessage('');
    try {
      const data = await postJson<Config>('/api/settings', { appId: appId || undefined, appSecret: appSecret || undefined });
      setConfig({ appId: data.appId, appSecret: data.appSecret, targets: data.targets });
      setAppSecret('');
      setCredMessage('Đã lưu.');
    } catch (err) {
      setCredError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setCredLoading(false);
    }
  }

  async function getPermanentToken(e: React.FormEvent) {
    e.preventDefault();
    setTokenLoading(true);
    setTokenError('');
    setTokenMessage('');
    setAvailablePages([]);
    try {
      const data = await postJson<Config & { added?: string; availablePages?: AvailablePage[] }>(
        '/api/settings',
        { userToken: userToken || undefined, pageId: pageId || undefined },
      );
      setConfig({ appId: data.appId, appSecret: data.appSecret, targets: data.targets });
      setUserToken('');
      setPageId('');
      if (data.availablePages && data.availablePages.length > 1) {
        setAvailablePages(data.availablePages);
      }
      setTokenMessage(data.added ? `Đã thêm "${data.added}". Restart Next.js để áp dụng.` : 'Đã lưu.');
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setTokenLoading(false);
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

        {/* Credentials */}
        <form onSubmit={saveCreds} className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">App Credentials</p>
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
          {credError && <p className="text-xs text-fall">{credError}</p>}
          {credMessage && <p className="text-xs text-accent">{credMessage}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={credLoading}
              className="rounded-lg bg-surface border border-divider px-4 py-1.5 text-xs font-semibold text-primary hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-wait cursor-pointer"
            >
              {credLoading ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </form>

        <hr className="border-divider" />

        {/* Token exchange */}
        <form onSubmit={getPermanentToken} className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Thêm Page Target</p>
          <Field
            label="User Access Token"
            value={userToken}
            onChange={setUserToken}
            placeholder="EAAZAh… (lấy từ Graph API Explorer)"
            hint="Cần quyền pages_manage_posts"
          />
          <Field
            label="Page ID (tuỳ chọn)"
            value={pageId}
            onChange={setPageId}
            placeholder="Mặc định lấy page đầu tiên"
          />

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

          {tokenError && <p className="text-xs text-fall">{tokenError}</p>}
          {tokenMessage && <p className="text-xs text-accent">{tokenMessage}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary cursor-pointer bg-transparent">
              Đóng
            </button>
            <button
              type="submit"
              disabled={tokenLoading || !userToken}
              className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-wait cursor-pointer"
            >
              {tokenLoading ? 'Đang lấy token…' : 'Get permanent token & save'}
            </button>
          </div>
        </form>

        <hr className="border-divider" />

        {/* Audio prompt */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Audio Script Prompt</p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted">Prompt Template</label>
              {audioPrompt !== audioDefault && (
                <button
                  onClick={() => setAudioPrompt(audioDefault)}
                  className="text-xs text-muted hover:text-primary bg-transparent border-none cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <textarea
              value={audioPrompt}
              onChange={(e) => setAudioPrompt(e.target.value)}
              rows={7}
              spellCheck={false}
              className="w-full rounded-xl border border-divider bg-surface px-3 py-2 text-xs text-primary font-mono outline-none focus:border-accent resize-y"
            />
            <p className="text-[10px] text-muted">
              Use <code className="bg-surface px-1 rounded">{'{{content}}'}</code> where the article content is inserted.
            </p>
          </div>
          {audioMessage && <p className="text-xs text-accent">{audioMessage}</p>}
          <div className="flex justify-end">
            <button
              onClick={saveAudioPrompt}
              disabled={audioSaving || audioPrompt === audioSaved}
              className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {audioSaving ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
