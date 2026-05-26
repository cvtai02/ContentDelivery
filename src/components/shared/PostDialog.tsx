'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ThreadsPreview } from '@/components/shared/ThreadsPreview';
import { FacebookIcon } from '@/components/shared/FacebookIcon';
import { formatFacebookPostFromBlocks } from '@/lib/reddit-format';
import type { PostBlock } from '@/lib/parseThreadsPost';

type Tab = 'threads' | 'facebook' | 'edit' | 'image';

type Props = {
  blocks: PostBlock[];
  title: string;
  sourceLabel: string;
  onClose: () => void;
};

type PostResult = { ok: true; url: string } | { ok: false; message: string } | null;

export function PostDialog({ blocks: initialBlocks, title, sourceLabel, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('threads');
  const [editedBlocks, setEditedBlocks] = useState<PostBlock[]>(initialBlocks);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<PostResult>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [capturing, setCapturing] = useState(false);
  const groupRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fbContent = formatFacebookPostFromBlocks(editedBlocks);

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  function updateBlockText(idx: number, text: string) {
    setEditedBlocks((prev) => prev.map((b, i) => i === idx ? { ...b, text } : b));
  }

  const captureImages = useCallback(async () => {
    setCapturing(true);
    setCapturedImages([]);
    try {
      const { toPng } = await import('html-to-image');
      const results: string[] = [];
      for (const el of groupRefs.current) {
        if (!el) continue;
        const dataUrl = await toPng(el, { pixelRatio: 2, skipFonts: true });
        results.push(dataUrl);
      }
      setCapturedImages(results);
    } finally {
      setCapturing(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'image') captureImages();
  }, [tab, captureImages]);

  async function postToFacebook() {
    setPosting(true);
    setPostResult(null);
    try {
      const res = await fetch('/api/reddit/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fbContent, imageUrl: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không đăng được lên Facebook');
      setPostResult({ ok: true, url: data.url ?? '' });
    } catch (err) {
      setPostResult({ ok: false, message: err instanceof Error ? err.message : 'Không đăng được lên Facebook' });
    } finally {
      setPosting(false);
    }
  }

  function downloadImage(dataUrl: string, idx: number) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `thread-${idx + 1}.png`;
    a.click();
  }

  const tabCls = (t: Tab) =>
    `px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer border-0 ${
      tab === t ? 'bg-accent text-white' : 'bg-transparent text-muted hover:text-primary'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleBackdrop}>
      <div className="flex w-[540px] max-w-[95vw] flex-col rounded-2xl bg-panel shadow-2xl max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-divider shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-accent">{sourceLabel}</p>
            <p className="line-clamp-1 text-xs text-muted">{title}</p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => setTab('threads')} className={tabCls('threads')}>Threads</button>
            <button onClick={() => setTab('facebook')} className={tabCls('facebook')}>Facebook</button>
            <button onClick={() => setTab('edit')} className={tabCls('edit')}>Edit</button>
            <button onClick={() => setTab('image')} className={tabCls('image')}>Images</button>
          </div>
          <button onClick={onClose} className="shrink-0 text-muted hover:text-primary cursor-pointer bg-transparent border-0 text-lg leading-none ml-1">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">

          {/* ThreadsPreview: always mounted offscreen to keep groupRefs valid for image capture */}
          <div style={tab !== 'threads' ? { position: 'fixed', left: -9999, top: -9999, pointerEvents: 'none' } : {}}>
            <ThreadsPreview blocks={editedBlocks} groupRefs={groupRefs} />
          </div>

          {tab === 'facebook' && (
            <div className="rounded-xl border border-divider bg-surface overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
                <div className="h-9 w-9 shrink-0 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-sm font-bold select-none">
                  f
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-primary leading-tight">Your Page</p>
                  <p className="text-[11px] text-muted">Just now · 🌐</p>
                </div>
              </div>
              <div className="px-4 pb-3 text-[13px] text-primary leading-relaxed whitespace-pre-wrap break-words">
                {fbContent}
              </div>
              <div className="flex items-center justify-around border-t border-divider px-4 py-1.5">
                {['👍 Thích', '💬 Bình luận', '↗ Chia sẻ'].map((label) => (
                  <span key={label} className="text-[12px] font-semibold text-muted select-none">{label}</span>
                ))}
              </div>
            </div>
          )}

          {tab === 'edit' && (
            <div className="flex flex-col gap-3">
              {editedBlocks.map((b, i) => {
                const label = b.isMain ? 'Bài viết' : b.isReply ? '↳ Trả lời' : 'Bình luận';
                return (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-wide">{label}</span>
                    <textarea
                      value={b.text}
                      onChange={(e) => updateBlockText(i, e.target.value)}
                      rows={b.isMain ? 6 : 3}
                      className="w-full rounded-md border border-divider bg-surface px-3 py-2 text-[13px] text-primary resize-y outline-none focus:border-accent"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'image' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">{capturedImages.length} ảnh</span>
                <button
                  onClick={captureImages}
                  disabled={capturing}
                  className="rounded-md border border-divider bg-surface px-3 py-1 text-xs font-semibold text-muted hover:text-primary disabled:opacity-40 cursor-pointer transition-colors"
                >
                  {capturing ? 'Đang chụp...' : '↺ Chụp lại'}
                </button>
              </div>
              {capturing && (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: groupRefs.current.filter(Boolean).length || 3 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-xl animate-pulse bg-divider" />
                  ))}
                </div>
              )}
              {!capturing && capturedImages.map((src, i) => (
                <div key={i} className="group relative rounded-md overflow-hidden border border-divider">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Thread ${i + 1}`} className="w-full" />
                  <button
                    onClick={() => downloadImage(src, i)}
                    className="absolute top-2 right-2 rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
                  >
                    ↓ Tải xuống
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-divider shrink-0">
          <div className="text-xs min-w-0 mr-3">
            {postResult && !postResult.ok && (
              <span className="text-fall">{postResult.message}</span>
            )}
            {postResult?.ok && (
              <a href={postResult.url} target="_blank" rel="noreferrer" className="text-accent hover:underline font-semibold">
                Đã đăng lên Facebook →
              </a>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="rounded-lg border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary cursor-pointer bg-transparent"
            >
              Đóng
            </button>
            <button
              onClick={postToFacebook}
              disabled={posting || !fbContent}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1877F2] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-wait cursor-pointer transition-opacity"
            >
              <FacebookIcon size={12} /> {posting ? 'Đang đăng...' : 'Đăng Facebook'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
