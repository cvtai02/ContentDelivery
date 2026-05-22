'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ComposeImagePreview } from '@/components/shared/ComposeImagePreview';
import { SettingsButton } from '@/components/settings/SettingsButton';

type ZhihuQuestion = {
  id: string;
  title: string;
  excerpt: string;
  answerCount: number;
  heat: string;
  url: string;
};

type PostState = {
  status: 'generating' | 'ready' | 'error';
  content: string;
  imageUrl: string | null;
  error: string;
};

function Skeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col divide-y divide-divider">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="py-1.5 flex flex-col gap-1">
          <div className="h-3 w-1/4 animate-pulse rounded bg-surface" />
          <div className="h-4 w-full animate-pulse rounded bg-surface" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}

function ComposeDialog({
  question,
  initialContent,
  initialImageUrl,
  onClose,
}: {
  question: ZhihuQuestion;
  initialContent: string;
  initialImageUrl: string | null;
  onClose: () => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [imageLoading, setImageLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchImage = useCallback((title: string) => {
    setImageLoading(true);
    setImageUrl(null);
    fetch(`/api/image/find?q=${encodeURIComponent(title)}`)
      .then((r) => r.json())
      .then((data) => { setImageUrl(data.url ?? null); })
      .catch(() => {})
      .finally(() => setImageLoading(false));
  }, []);

  async function postToFacebook() {
    setPosting(true);
    setError('');
    try {
      const res = await fetch('/api/zhihu/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không đăng được lên Facebook');
      setPostUrl(data.url ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đăng được lên Facebook');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-3xl flex-col rounded-2xl bg-panel shadow-2xl max-h-[90vh]">
        <div className="flex items-start gap-3 p-6 pb-0">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-accent">知乎</p>
            <p className="line-clamp-2 text-sm font-semibold text-primary">{question.title}</p>
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
            onRefresh={() => fetchImage(question.title)}
          />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            style={{ fieldSizing: 'content' } as any}
            className="w-full resize-none min-h-[200px] rounded-xl border border-divider bg-surface p-3 text-sm text-primary outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-2 p-6 pt-0">
          {error && <p className="text-xs text-fall">{error}</p>}
          {postUrl && (
            <a href={postUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent hover:underline">
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
  );
}

const SELECT_CLS = 'text-xs text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2';

export function ZhihuHotList() {
  const [questions, setQuestions] = useState<ZhihuQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [limit, setLimit] = useState(10);
  const [postStates, setPostStates] = useState<Record<string, PostState>>({});
  const [viewing, setViewing] = useState<ZhihuQuestion | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError('');

    fetch(`/api/zhihu/hot?limit=${limit}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) { setFetchError(data.error); setLoading(false); return; }
        setQuestions(data.questions ?? []);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setFetchError('Không thể tải dữ liệu Zhihu'); setLoading(false); } });

    return () => { cancelled = true; };
  }, [limit]);

  async function startGeneration(question: ZhihuQuestion) {
    const id = question.id;
    setPostStates((prev) => ({ ...prev, [id]: { status: 'generating', content: '', imageUrl: null, error: '' } }));

    try {
      const [composeRes, imageRes] = await Promise.all([
        fetch('/api/zhihu/compose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: id, title: question.title }),
        }).then((r) => r.json()),
        fetch(`/api/image/find?q=${encodeURIComponent(question.title)}`).then((r) => r.json()),
      ]);

      if (composeRes.error) throw new Error(composeRes.error);

      setPostStates((prev) => ({
        ...prev,
        [id]: { status: 'ready', content: composeRes.content ?? '', imageUrl: imageRes.url ?? null, error: '' },
      }));
    } catch (err) {
      setPostStates((prev) => ({
        ...prev,
        [id]: { status: 'error', content: '', imageUrl: null, error: err instanceof Error ? err.message : 'Lỗi' },
      }));
    }
  }

  const viewingState = viewing ? postStates[viewing.id] : null;

  return (
    <>
      <div className="card h-full">
        <div className="section-label">
          知乎热榜
          <div className="ml-auto flex items-center gap-1.5">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className={SELECT_CLS}
            >
              {[5, 10, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <SettingsButton section="zhihu" label="知乎热榜" />
          </div>
        </div>

        {loading ? <Skeleton count={limit} /> : fetchError ? (
          <p className="py-4 text-xs text-fall">{fetchError}</p>
        ) : (
          <div className="flex flex-col divide-y divide-divider">
            {questions.map((q, i) => {
              const ps = postStates[q.id];
              return (
                <div key={q.id} className="py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-muted w-4 shrink-0">{i + 1}</span>
                    <span className="text-[10px] text-muted truncate">{q.heat}</span>
                    {!ps && (
                      <button
                        onClick={() => startGeneration(q)}
                        className="ml-auto shrink-0 rounded-lg bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent hover:bg-accent/20 transition-colors cursor-pointer"
                      >
                        Tạo bài viết
                      </button>
                    )}
                    {ps?.status === 'generating' && (
                      <span className="ml-auto shrink-0 text-[11px] text-muted">Đang tạo...</span>
                    )}
                    {ps?.status === 'ready' && (
                      <button
                        onClick={() => setViewing(q)}
                        className="ml-auto shrink-0 rounded-lg bg-accent px-2 py-0.5 text-[11px] font-semibold text-black hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Xem bài viết
                      </button>
                    )}
                    {ps?.status === 'error' && (
                      <button
                        onClick={() => startGeneration(q)}
                        className="ml-auto shrink-0 rounded-lg bg-fall/10 px-2 py-0.5 text-[11px] font-semibold text-fall hover:bg-fall/20 transition-colors cursor-pointer"
                      >
                        Thử lại
                      </button>
                    )}
                  </div>
                  <a
                    href={q.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-semibold text-primary hover:underline block"
                  >
                    {q.title}
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewing && viewingState?.status === 'ready' && (
        <ComposeDialog
          question={viewing}
          initialContent={viewingState.content}
          initialImageUrl={viewingState.imageUrl}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}
