'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { ThreadsDialog } from '@/components/shared/ThreadsDialog';
import { AudioScriptDialog } from '@/components/shared/AudioScriptDialog';
import { parseCodexToBlocks } from '@/lib/parseThreadsPost';
import { formatFacebookPost } from '@/lib/reddit-format';
import type { RedditContentDto, RedditMeta } from '@/lib/reddit-format';
import { ThreadsIcon } from '@/components/shared/ThreadsIcon';

type PostResult = { ok: true; url: string } | { ok: false; message: string } | null;

// ── Inline editable text field ──────────────────────────────────────────────

function EditableField({
  value,
  multiline,
  onSave,
}: {
  value: string;
  multiline?: boolean;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function save() {
    onSave(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        {multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(3, draft.split('\n').length)}
            className="w-full resize-none rounded-lg border border-accent bg-surface p-2 text-[13px] text-primary outline-none leading-relaxed"
          />
        ) : (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-lg border border-accent bg-surface px-2 py-1 text-[13px] text-primary outline-none"
          />
        )}
        <div className="flex gap-1.5 justify-end">
          <button onClick={cancel} className="text-[11px] text-muted hover:text-primary cursor-pointer bg-transparent border-none">Huỷ</button>
          <button onClick={save} className="text-[11px] font-semibold text-accent hover:opacity-80 cursor-pointer bg-transparent border-none">Lưu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <span className="whitespace-pre-wrap break-words">{value}</span>
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-muted hover:text-accent cursor-pointer bg-transparent border-none align-middle"
        title="Chỉnh sửa"
      >
        ✏️
      </button>
    </div>
  );
}

// ── Facebook post preview with per-field editing ────────────────────────────

function FacebookPreview({
  dto,
  meta,
  imageUrl,
  imageLoading,
  onDtoChange,
  onRefreshImage,
}: {
  dto: RedditContentDto;
  meta: RedditMeta;
  imageUrl: string | null;
  imageLoading: boolean;
  onDtoChange: (updated: RedditContentDto) => void;
  onRefreshImage: () => void;
}) {
  function setTitle(v: string) { onDtoChange({ ...dto, title: v }); }
  function setBody(v: string) { onDtoChange({ ...dto, body: v }); }
  function setCommentText(i: number, v: string) {
    const comments = dto.comments.map((c, ci) => ci === i ? { ...c, text: v } : c);
    onDtoChange({ ...dto, comments });
  }
  function setReply(ci: number, ri: number, v: string) {
    const comments = dto.comments.map((c, i) => i === ci
      ? { ...c, replies: c.replies.map((r, j) => j === ri ? v : r) }
      : c);
    onDtoChange({ ...dto, comments });
  }

  return (
    <div className="rounded-xl border border-divider bg-surface overflow-hidden text-[13px]">
      {/* FB header */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
        <div className="h-9 w-9 shrink-0 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-sm font-bold select-none">f</div>
        <div>
          <p className="text-[13px] font-semibold text-primary leading-tight">Your Page</p>
          <p className="text-[11px] text-muted">Just now · 🌐</p>
        </div>
      </div>

      {/* Main post */}
      <div className="px-4 pb-3 space-y-1 text-primary leading-relaxed">
        <div className="font-bold text-[14px]">
          <EditableField value={dto.title.toUpperCase()} onSave={(v) => setTitle(v)} />
        </div>
        <div className="text-[11px] text-muted">{meta.postAuthor} · {meta.postScore} likes</div>
        {dto.body && (
          <EditableField value={dto.body} multiline onSave={setBody} />
        )}
      </div>

      {/* Comments */}
      {dto.comments.map((comment, ci) => {
        const cmeta = meta.comments[ci];
        return (
          <div key={ci} className="border-t border-divider px-4 py-2.5 space-y-1 text-primary leading-relaxed">
            <div className="text-[11px] text-muted font-semibold">{ci + 1}. {cmeta.author} · {cmeta.score} likes</div>
            <EditableField value={comment.text} multiline onSave={(v) => setCommentText(ci, v)} />
            {comment.replies.map((reply, ri) => {
              const rmeta = cmeta.replies[ri];
              return (
                <div key={ri} className="ml-4 border-l-2 border-divider pl-3 text-[12px] text-muted">
                  <div className="text-[11px] font-semibold mb-0.5">↳ {rmeta.author} · {rmeta.score} likes</div>
                  <EditableField value={reply} onSave={(v) => setReply(ci, ri, v)} />
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Image below content */}
      {imageLoading && <div className="h-52 animate-pulse bg-divider" />}
      {!imageLoading && imageUrl && (
        <div className="relative group border-t border-divider">
          <Image src={imageUrl} alt="Post image" width={1200} height={630} unoptimized className="w-full object-cover max-h-[400px]" />
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

// ── Main dialog ──────────────────────────────────────────────────────────────

export function RedditComposeDialog({
  sourceLabel,
  title,
  initialDto,
  meta,
  initialImageUrl,
  mainAuthor,
  mainCreatedAt,
  onClose,
}: {
  sourceLabel: string;
  title: string;
  initialDto: RedditContentDto;
  meta: RedditMeta;
  initialImageUrl: string | null;
  mainAuthor?: string;
  mainCreatedAt?: number;
  onClose: () => void;
}) {
  const [dto, setDto] = useState<RedditContentDto>(initialDto);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<PostResult>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [imageLoading, setImageLoading] = useState(false);
  const [threadsBlocks, setThreadsBlocks] = useState(null as ReturnType<typeof parseCodexToBlocks> | null);
  const [audioScript, setAudioScript] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const imageAbortRef = useRef<AbortController | null>(null);

  const refreshImage = useCallback(() => {
    imageAbortRef.current?.abort();
    const controller = new AbortController();
    imageAbortRef.current = controller;
    setImageLoading(true);
    setImageUrl(null);
    fetch(`/api/image/find?q=${encodeURIComponent(title)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => { setImageUrl(data.url ?? null); })
      .catch((e) => { if (e.name !== 'AbortError') setImageUrl(null); })
      .finally(() => setImageLoading(false));
  }, [title]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  async function generateAudioScript() {
    setAudioLoading(true);
    try {
      const content = formatFacebookPost(dto, meta);
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
    const content = formatFacebookPost(dto, meta);
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
      const content = formatFacebookPost(dto, meta);
      const res = await fetch('/api/reddit/facebook', {
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleBackdropClick}>
        <div className="flex w-full max-w-lg flex-col rounded-2xl bg-panel shadow-2xl max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-divider shrink-0">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-accent">{sourceLabel}</p>
              <p className="line-clamp-1 text-xs text-muted">{title}</p>
            </div>
            <button onClick={onClose} className="shrink-0 text-muted hover:text-primary cursor-pointer bg-transparent border-none text-lg leading-none">✕</button>
          </div>

          {/* Preview */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <FacebookPreview
              dto={dto}
              meta={meta}
              imageUrl={imageUrl}
              imageLoading={imageLoading}
              onDtoChange={setDto}
              onRefreshImage={refreshImage}
            />
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-2 px-5 py-3 border-t border-divider shrink-0">
            {result && !result.ok && <p className="text-xs text-fall">{result.message}</p>}
            {result?.ok && (
              <a href={result.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent hover:underline">
                Đã đăng lên Facebook →
              </a>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary cursor-pointer bg-transparent">Đóng</button>
              <button onClick={generateAudioScript} disabled={audioLoading} className="rounded-lg bg-surface border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary disabled:opacity-40 disabled:cursor-wait cursor-pointer transition-colors">
                {audioLoading ? 'Đang tạo...' : '🎙️ Audio'}
              </button>
              <button onClick={openThreads} className="rounded-lg bg-surface border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary cursor-pointer transition-colors flex items-center gap-1.5">
                <ThreadsIcon size={13} /> Threads
              </button>
              <button onClick={postToFacebook} disabled={posting} className="rounded-lg bg-[#1877F2] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50 cursor-pointer">
                {posting ? 'Đang đăng...' : 'Đăng Facebook'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {threadsBlocks && <ThreadsDialog blocks={threadsBlocks} title={title} onClose={() => setThreadsBlocks(null)} />}
      {audioScript && <AudioScriptDialog script={audioScript} onClose={() => setAudioScript(null)} />}
    </>
  );
}
