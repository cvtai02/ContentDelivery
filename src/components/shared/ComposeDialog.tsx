'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { ThreadsDialog } from '@/components/shared/ThreadsDialog';
import { AudioScriptDialog } from '@/components/shared/AudioScriptDialog';
import { parseCodexToBlocks } from '@/lib/parseThreadsPost';
import type { PostBlock } from '@/lib/parseThreadsPost';
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

function FacebookPostPreview({
  content,
  imageUrl,
  imageLoading,
  onRefreshImage,
}: {
  content: string;
  imageUrl: string | null;
  imageLoading: boolean;
  onRefreshImage: () => void;
}) {
  return (
    <div className="rounded-xl border border-divider bg-surface overflow-hidden">
      {/* FB post header */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
        <div className="h-9 w-9 shrink-0 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-sm font-bold select-none">
          f
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-primary leading-tight">Your Page</p>
          <p className="text-[11px] text-muted">Just now · 🌐</p>
        </div>
      </div>

      {/* Post content */}
      <div className="px-4 pb-3 text-[13px] text-primary leading-relaxed whitespace-pre-wrap break-words">
        {content}
      </div>

      {/* Image below content */}
      {imageLoading && (
        <div className="h-52 animate-pulse bg-divider" />
      )}
      {!imageLoading && imageUrl && (
        <div className="relative group">
          <Image
            src={imageUrl}
            alt="Post image"
            width={1200}
            height={630}
            unoptimized
            className="w-full object-cover max-h-[400px]"
          />
          <button
            onClick={onRefreshImage}
            className="absolute top-2 right-2 rounded-md bg-black/50 px-2 py-1 text-[11px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none"
          >
            Đổi ảnh
          </button>
        </div>
      )}

      {/* FB action bar */}
      <div className="flex items-center justify-around border-t border-divider px-4 py-1.5">
        {['👍 Thích', '💬 Bình luận', '↗ Chia sẻ'].map((label) => (
          <span key={label} className="text-[12px] font-semibold text-muted select-none">{label}</span>
        ))}
      </div>
    </div>
  );
}

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
  const [content] = useState(initialContent);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<PostResult>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [imageLoading, setImageLoading] = useState(false);
  const [threadsBlocks, setPostBlocks] = useState<PostBlock[] | null>(null);
  const [audioScript, setAudioScript] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const imageAbortRef = useRef<AbortController | null>(null);

  const refreshImage = useCallback(() => {
    imageAbortRef.current?.abort();
    const controller = new AbortController();
    imageAbortRef.current = controller;
    setImageLoading(true);
    setImageUrl(null);
    fetch(`/api/image/find?q=${encodeURIComponent(imageSearchQuery ?? title)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => { setImageUrl(data.url ?? null); })
      .catch((e) => { if (e.name !== 'AbortError') setImageUrl(null); })
      .finally(() => setImageLoading(false));
  }, [imageSearchQuery, title]);

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
    setPostBlocks(blocks);
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
        <div className="flex w-full max-w-lg flex-col rounded-2xl bg-panel shadow-2xl max-h-[90vh]">

          {/* Dialog header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-divider shrink-0">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-accent">{sourceLabel}</p>
              <p className="line-clamp-1 text-xs text-muted">{title}</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 text-muted hover:text-primary cursor-pointer bg-transparent border-none text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* Facebook post preview */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <FacebookPostPreview
              content={content}
              imageUrl={imageUrl}
              imageLoading={imageLoading}
              onRefreshImage={refreshImage}
            />
          </div>

          {/* Footer actions */}
          <div className="flex flex-col gap-2 px-5 py-3 border-t border-divider shrink-0">
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
                className="rounded-lg bg-[#1877F2] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50 cursor-pointer"
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
          onClose={() => setPostBlocks(null)}
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
