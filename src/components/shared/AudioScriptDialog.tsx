'use client';

import { useState } from 'react';

type Props = { script: string; onClose: () => void };

export function AudioScriptDialog({ script, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdropClick}
    >
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-panel shadow-2xl max-h-[90vh]">
        <div className="flex items-center justify-between p-6 pb-0">
          <p className="text-sm font-semibold text-primary">🎙️ Audio Script</p>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary cursor-pointer bg-transparent border-none text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <pre className="whitespace-pre-wrap text-sm text-primary font-sans leading-relaxed">{script}</pre>
        </div>

        <div className="flex justify-end gap-2 p-6 pt-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary cursor-pointer bg-transparent"
          >
            Đóng
          </button>
          <button
            onClick={copy}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 cursor-pointer transition-opacity"
          >
            {copied ? 'Đã sao chép ✓' : 'Sao chép'}
          </button>
        </div>
      </div>
    </div>
  );
}
