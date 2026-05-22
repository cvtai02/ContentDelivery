'use client';

import { useRef, useState } from 'react';

interface Props {
  initialUrl?: string;
}

export default function BrowserCard({ initialUrl = 'https://chatgpt.com' }: Props) {
  const [url, setUrl]           = useState(initialUrl);
  const [input, setInput]       = useState(initialUrl);
  const [blocked, setBlocked]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const iframeRef               = useRef<HTMLIFrameElement>(null);

  function navigate(target: string) {
    const normalized = target.startsWith('http') ? target : `https://${target}`;
    setBlocked(false);
    setLoading(true);
    setUrl(normalized);
    setInput(normalized);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') navigate(input);
  }

  function handleLoad() {
    setLoading(false);
    try {
      // If same-origin access works, the site loaded fine.
      // Cross-origin sites will throw — we can't detect X-Frame-Options from JS,
      // so we optimistically mark as loaded.
      setBlocked(false);
    } catch {
      setBlocked(true);
    }
  }

  function handleError() {
    setLoading(false);
    setBlocked(true);
  }

  function reload() {
    setBlocked(false);
    setLoading(true);
    if (iframeRef.current) {
      // eslint-disable-next-line no-self-assign
      iframeRef.current.src = iframeRef.current.src;
    }
  }

  const domain = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  return (
    <div className="card h-full flex flex-col gap-0 p-0 overflow-hidden">
      {/* ── Browser chrome ── */}
      <div className="bg-surface border-b border-divider px-4 py-3 flex items-center gap-3 shrink-0">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>

        {/* Nav buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => iframeRef.current?.contentWindow?.history.back()}
            className="text-muted hover:text-primary transition-colors px-1 text-sm bg-transparent border-none cursor-pointer"
            title="Back"
          >
            ‹
          </button>
          <button
            onClick={() => iframeRef.current?.contentWindow?.history.forward()}
            className="text-muted hover:text-primary transition-colors px-1 text-sm bg-transparent border-none cursor-pointer"
            title="Forward"
          >
            ›
          </button>
          <button
            onClick={reload}
            className="text-muted hover:text-primary transition-colors px-1 text-sm bg-transparent border-none cursor-pointer"
            title="Reload"
          >
            ↻
          </button>
        </div>

        {/* Address bar */}
        <div className="flex-1 flex items-center gap-2 bg-panel rounded-lg px-3 py-1.5 border border-divider">
          <span className="text-muted text-xs shrink-0">🔒</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            className="flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
            spellCheck={false}
          />
        </div>

        {/* Open in new tab */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-primary transition-colors text-sm shrink-0"
          title="Open in new tab"
        >
          ↗
        </a>
      </div>

      {/* ── Viewport ── */}
      <div className="relative flex-1 min-h-0">
        {/* Loading bar */}
        {loading && !blocked && (
          <div className="absolute top-0 left-0 right-0 h-0.5 z-10 overflow-hidden">
            <div className="h-full bg-accent animate-pulse" style={{ width: '60%' }} />
          </div>
        )}

        {blocked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-panel">
            <span className="text-4xl">🚫</span>
            <div className="text-center">
              <p className="font-semibold text-primary">{domain} từ chối nhúng</p>
              <p className="text-muted text-sm mt-1">Trang này chặn hiển thị trong iframe.</p>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              Mở trong tab mới ↗
            </a>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={url}
            onLoad={handleLoad}
            onError={handleError}
            className="w-full h-full border-0"
            title={domain}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        )}
      </div>
    </div>
  );
}
