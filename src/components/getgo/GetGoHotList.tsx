'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ComposeImagePreview } from '@/components/shared/ComposeImagePreview';
import { SettingsButton } from '@/components/settings/SettingsButton';

type RedditPost = {
  id: string;
  title: string;
  author: string;
  score: number;
  comments: number;
  url: string;
  createdUtc?: number;
};

type ZhihuQuestion = {
  id: string;
  title: string;
  answerCount: number;
  heat: string;
  url: string;
};

type ComposeTarget =
  | { kind: 'reddit'; post: RedditPost }
  | { kind: 'zhihu'; question: ZhihuQuestion };

function formatCount(n: number) {
  return new Intl.NumberFormat('en-US', { notation: n >= 1000 ? 'compact' : 'standard' }).format(n);
}

function timeAgo(utc: number) {
  const diff = Math.floor(Date.now() / 1000 - utc);
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function Skeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col divide-y divide-divider">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="py-1.5 flex flex-col gap-1">
          <div className="h-3 w-1/4 animate-pulse rounded bg-surface" />
          <div className="h-4 w-full animate-pulse rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}

type PostState = { status: 'generating' | 'ready' | 'error'; content: string; imageUrl: string | null; error: string };

function ComposeDialog({
  target,
  initialContent,
  initialImageUrl,
  onClose,
}: {
  target: ComposeTarget;
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

  const title = target.kind === 'reddit' ? target.post.title : target.question.title;

  const fetchImage = useCallback((q: string) => {
    setImageLoading(true);
    setImageUrl(null);
    fetch(`/api/image/find?q=${encodeURIComponent('travel ' + q)}`)
      .then((r) => r.json())
      .then((data) => setImageUrl(data.url ?? null))
      .catch(() => {})
      .finally(() => setImageLoading(false));
  }, []);

  async function postToFacebook() {
    setPosting(true);
    setError('');
    try {
      const res = await fetch('/api/getgo/facebook', {
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
            <p className="text-[11px] font-semibold text-accent">
              {target.kind === 'reddit' ? 'r/travel' : '知乎 · 旅行'}
            </p>
            <p className="line-clamp-2 text-sm font-semibold text-primary">{title}</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-muted hover:text-primary cursor-pointer bg-transparent border-none text-lg leading-none">✕</button>
        </div>

        <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto px-6 py-4">
          <ComposeImagePreview imageUrl={imageUrl} imageLoading={imageLoading} onRefresh={() => fetchImage(title)} />
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
            <button onClick={onClose} className="rounded-lg border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary cursor-pointer bg-transparent">Đóng</button>
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

function RedditTravelSection({ postStates, onStartGeneration, onView }: { postStates: Record<string, PostState>; onStartGeneration: (post: RedditPost) => void; onView: (post: RedditPost) => void }) {
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [t, setT] = useState('week');
  const [limit, setLimit] = useState(3);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/reddit/hot?subreddit=travel&t=${t}&limit=${limit}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) { setPosts(data.posts ?? []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [t, limit]);

  return (
    <div className="border-t-2 border-divider py-2">
      {loading ? <Skeleton count={limit} /> : (
        <div className="flex flex-col divide-y divide-divider">
          {posts.map((post, i) => (
            <div key={post.id} className={i > 0 ? 'pt-1' : ''}>
              {i === 0 && (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold text-accent">r/travel</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <select value={t} onChange={(e) => setT(e.target.value)} className={SELECT_CLS}>
                      <option value="day">Today</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                      <option value="all">All time</option>
                    </select>
                    <span className="text-[10px] text-muted">·</span>
                    <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={SELECT_CLS}>
                      {[1, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted whitespace-nowrap">
                  ▲ {formatCount(post.score)} · 💬 {formatCount(post.comments)}
                  {post.createdUtc ? ` · ${timeAgo(post.createdUtc)} ago` : ''}
                </span>
                {!postStates[post.id] && (
                  <button onClick={() => onStartGeneration(post)} className="ml-auto shrink-0 rounded-lg bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent hover:bg-accent/20 transition-colors cursor-pointer">Tạo bài viết</button>
                )}
                {postStates[post.id]?.status === 'generating' && <span className="ml-auto shrink-0 text-[11px] text-muted">Đang tạo...</span>}
                {postStates[post.id]?.status === 'ready' && (
                  <button onClick={() => onView(post)} className="ml-auto shrink-0 rounded-lg bg-accent px-2 py-0.5 text-[11px] font-semibold text-black hover:opacity-90 transition-opacity cursor-pointer">Xem bài viết</button>
                )}
                {postStates[post.id]?.status === 'error' && (
                  <button onClick={() => onStartGeneration(post)} className="ml-auto shrink-0 rounded-lg bg-fall/10 px-2 py-0.5 text-[11px] font-semibold text-fall hover:bg-fall/20 transition-colors cursor-pointer">Thử lại</button>
                )}
              </div>
              <a href={post.url} target="_blank" rel="noreferrer" className="truncate text-sm font-semibold text-primary hover:underline block">
                {post.title}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ZhihuTravelSection({ postStates, onStartGeneration, onView }: { postStates: Record<string, PostState>; onStartGeneration: (q: ZhihuQuestion) => void; onView: (q: ZhihuQuestion) => void }) {
  const [questions, setQuestions] = useState<ZhihuQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(5);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/zhihu/travel?limit=${limit}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) { setQuestions(data.questions ?? []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [limit]);

  return (
    <div className="border-t-2 border-divider py-2">
      {loading ? <Skeleton count={limit} /> : (
        <div className="flex flex-col divide-y divide-divider">
          {questions.map((q, i) => (
            <div key={q.id} className={`${i > 0 ? 'pt-1' : ''}`}>
              {i === 0 && (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold text-accent">知乎 · 旅行</span>
                  <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={`ml-auto ${SELECT_CLS}`}>
                    {[3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted truncate">{q.heat}</span>
                {!postStates[q.id] && (
                  <button onClick={() => onStartGeneration(q)} className="ml-auto shrink-0 rounded-lg bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent hover:bg-accent/20 transition-colors cursor-pointer">Tạo bài viết</button>
                )}
                {postStates[q.id]?.status === 'generating' && <span className="ml-auto shrink-0 text-[11px] text-muted">Đang tạo...</span>}
                {postStates[q.id]?.status === 'ready' && (
                  <button onClick={() => onView(q)} className="ml-auto shrink-0 rounded-lg bg-accent px-2 py-0.5 text-[11px] font-semibold text-black hover:opacity-90 transition-opacity cursor-pointer">Xem bài viết</button>
                )}
                {postStates[q.id]?.status === 'error' && (
                  <button onClick={() => onStartGeneration(q)} className="ml-auto shrink-0 rounded-lg bg-fall/10 px-2 py-0.5 text-[11px] font-semibold text-fall hover:bg-fall/20 transition-colors cursor-pointer">Thử lại</button>
                )}
              </div>
              <a href={q.url} target="_blank" rel="noreferrer" className="truncate text-sm font-semibold text-primary hover:underline block">
                {q.title}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GetGoHotList() {
  const [postStates, setPostStates] = useState<Record<string, PostState>>({});
  const [viewing, setViewing] = useState<ComposeTarget | null>(null);

  async function startGeneration(target: ComposeTarget) {
    const id = target.kind === 'reddit' ? target.post.id : target.question.id;
    const title = target.kind === 'reddit' ? target.post.title : target.question.title;
    const [url, body] = target.kind === 'reddit'
      ? ['/api/reddit/compose', { postId: id, subreddit: 'travel', title }]
      : ['/api/zhihu/compose', { questionId: id, title }];

    setPostStates((prev) => ({ ...prev, [id]: { status: 'generating', content: '', imageUrl: null, error: '' } }));

    try {
      const [composeRes, imageRes] = await Promise.all([
        fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
        fetch(`/api/image/find?q=${encodeURIComponent('travel ' + title)}`).then((r) => r.json()),
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

  const viewingId = viewing ? (viewing.kind === 'reddit' ? viewing.post.id : viewing.question.id) : null;
  const viewingState = viewingId ? postStates[viewingId] : null;

  return (
    <>
      <div className="card h-full">
        <div className="section-label">
          Gét gô
          <SettingsButton section="getgo" label="Gét gô" />
        </div>
        <RedditTravelSection
          postStates={postStates}
          onStartGeneration={(post) => startGeneration({ kind: 'reddit', post })}
          onView={(post) => setViewing({ kind: 'reddit', post })}
        />
        <ZhihuTravelSection
          postStates={postStates}
          onStartGeneration={(q) => startGeneration({ kind: 'zhihu', question: q })}
          onView={(q) => setViewing({ kind: 'zhihu', question: q })}
        />
      </div>
      {viewing && viewingState?.status === 'ready' && (
        <ComposeDialog
          target={viewing}
          initialContent={viewingState.content}
          initialImageUrl={viewingState.imageUrl}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}
