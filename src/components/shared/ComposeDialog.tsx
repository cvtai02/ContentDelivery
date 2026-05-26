'use client';

import { useCallback, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ComposeImagePreview } from '@/components/shared/ComposeImagePreview';
import { ThreadsDialog } from '@/components/shared/ThreadsDialog';
import { AudioScriptDialog } from '@/components/shared/AudioScriptDialog';
import { parseCodexToBlocks } from '@/lib/parseThreadsPost';
import type { ThreadsBlock } from '@/lib/parseThreadsPost';
import { ThreadsIcon } from '@/components/shared/ThreadsIcon';

type PostResult = { ok: true; url: string } | { ok: false; message: string } | null;

type Props = {
  sourceLabel: string;
  title: string;
  facebookEndpoint: string;
  imageSearchQuery?: string;
  initialContent: string;
  initialImageUrl: string | null;
  mainAuthor?: string;
  mainCreatedAt?: number;
  onClose: () => void;
};

export function ComposeDialog({
  sourceLabel,
  title,
  facebookEndpoint,
  imageSearchQuery,
  initialContent,
  initialImageUrl,
  mainAuthor,
  mainCreatedAt,
  onClose,
}: Props) {
  const [content, setContent] = useState(initialContent);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<PostResult>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [imageLoading, setImageLoading] = useState(false);
  const [threadsBlocks, setThreadsBlocks] = useState<ThreadsBlock[] | null>(null);
  const [audioScript, setAudioScript] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const imageAbortRef = useRef<AbortController | null>(null);

  const fetchImage = useCallback((q: string) => {
    imageAbortRef.current?.abort();
    const controller = new AbortController();
    imageAbortRef.current = controller;
    setImageLoading(true);
    setImageUrl(null);
    fetch(`/api/image/find?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => { setImageUrl(data.url ?? null); })
      .catch((e) => { if (e.name !== 'AbortError') setImageUrl(null); })
      .finally(() => setImageLoading(false));
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  async function generateAudioScript() {
    setAudioLoading(true);
    try {
      const res = await fetch('/api/audio/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAudioScript(data.script);
    } finally {
      setAudioLoading(false);
    }
  }

  function openThreads() {
    const blocks = parseCodexToBlocks(content);
    if (blocks.length === 0) return;
    if (mainAuthor) blocks[0].author = mainAuthor;
    if (mainCreatedAt) blocks[0].createdAt = mainCreatedAt;
    setThreadsBlocks(blocks);
  }

  async function postToFacebook() {
    setPosting(true);
    setResult(null);
    try {
      const res = await fetch(facebookEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không đăng được lên Facebook');
      setResult({ ok: true, url: data.url ?? '' });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Không đăng được lên Facebook' });
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={handleBackdropClick}
      >
        <div className="flex w-full max-w-3xl flex-col rounded-2xl bg-panel shadow-2xl max-h-[90vh]">
          <div className="flex items-start gap-3 p-6 pb-0">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-accent">{sourceLabel}</p>
              <p className="line-clamp-2 text-sm font-semibold text-primary">{title}</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 text-muted hover:text-primary cursor-pointer bg-transparent border-none text-lg leading-none"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto px-6 py-4">
            <ComposeImagePreview
              imageUrl={imageUrl}
              imageLoading={imageLoading}
              onRefresh={() => fetchImage(imageSearchQuery ?? title)}
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ fieldSizing: 'content' } as CSSProperties & { fieldSizing?: string }}
              className="w-full resize-none min-h-[200px] rounded-xl border border-divider bg-surface p-3 text-sm text-primary outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-2 p-6 pt-0">
            {result && !result.ok && <p className="text-xs text-fall">{result.message}</p>}
            {result?.ok && (
              <a href={result.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent hover:underline">
                Đã đăng lên Facebook →
              </a>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary cursor-pointer bg-transparent"
              >
                Đóng
              </button>
              <button
                onClick={generateAudioScript}
                disabled={audioLoading || !content}
                className="rounded-lg bg-surface border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary disabled:opacity-40 disabled:cursor-wait cursor-pointer transition-colors"
              >
                {audioLoading ? 'Đang tạo...' : '🎙️ Audio'}
              </button>
              <button
                onClick={openThreads}
                disabled={!content}
                className="rounded-lg bg-surface border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary disabled:opacity-40 cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <ThreadsIcon size={13} /> Threads
              </button>
              <button
                onClick={postToFacebook}
                disabled={posting || !content}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50 cursor-pointer"
              >
                {posting ? 'Đang đăng...' : 'Đăng Facebook'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {threadsBlocks && (
        <ThreadsDialog
          blocks={threadsBlocks}
          title={title}
          onClose={() => setThreadsBlocks(null)}
        />
      )}

      {audioScript && (
        <AudioScriptDialog
          script={audioScript}
          onClose={() => setAudioScript(null)}
        />
      )}
    </>
  );
}
