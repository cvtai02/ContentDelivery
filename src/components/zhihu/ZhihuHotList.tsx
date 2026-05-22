'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ComposeImagePreview } from '@/components/shared/ComposeImagePreview';

type ZhihuQuestion = {
  id: string;
  title: string;
  excerpt: string;
  answerCount: number;
  heat: string;
  url: string;
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

function ComposeDialog({ question, onClose }: { question: ZhihuQuestion; onClose: () => void }) {
  const [content, setContent] = useState('');
  const [generating, setGenerating] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
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

  useEffect(() => {
    fetchImage(question.title);
  }, [question.title, fetchImage]);

  useEffect(() => {
    let cancelled = false;
    setGenerating(true);
    setError('');
    setPostUrl('');

    fetch('/api/zhihu/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: question.id, title: question.title }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setContent(data.content ?? '');
        setGenerating(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Không tạo được bài viết');
        setGenerating(false);
      });

    return () => { cancelled = true; };
  }, [question.id, question.title]);

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

          {generating ? (
            <div className="flex flex-col gap-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-surface" />
              <div className="h-32 animate-pulse rounded-xl bg-surface" />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              style={{ fieldSizing: 'content' } as any}
              className="w-full resize-none min-h-[200px] rounded-xl border border-divider bg-surface p-3 text-sm text-primary outline-none focus:border-accent"
            />
          )}
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
              disabled={generating || posting || !content}
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
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(10);
  const [compose, setCompose] = useState<ZhihuQuestion | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetch(`/api/zhihu/hot?limit=${limit}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) { setError(data.error); setLoading(false); return; }
        setQuestions(data.questions ?? []);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setError('Không thể tải dữ liệu Zhihu'); setLoading(false); } });

    return () => { cancelled = true; };
  }, [limit]);

  return (
    <>
      <div className="card h-full">
        <div className="section-label">
          知乎热榜
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className={`ml-auto ${SELECT_CLS}`}
          >
            {[5, 10, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {loading ? <Skeleton count={limit} /> : error ? (
          <p className="py-4 text-xs text-fall">{error}</p>
        ) : (
          <div className="flex flex-col divide-y divide-divider">
            {questions.map((q, i) => (
              <div key={q.id} className="py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted w-4 shrink-0">{i + 1}</span>
                  <span className="text-[10px] text-muted truncate">{q.heat}</span>
                  <button
                    onClick={() => setCompose(q)}
                    className="ml-auto shrink-0 rounded-lg bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent hover:bg-accent/20 transition-colors cursor-pointer"
                  >
                    Tạo bài viết
                  </button>
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
            ))}
          </div>
        )}
      </div>

      {compose && <ComposeDialog question={compose} onClose={() => setCompose(null)} />}
    </>
  );
}
