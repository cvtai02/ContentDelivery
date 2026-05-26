'use client';

import { useEffect, useState } from 'react';
import { ComposeDialog } from '@/components/shared/ComposeDialog';
import { ThreadsButton } from '@/components/shared/ThreadsButton';
import { ThreadsDialog } from '@/components/shared/ThreadsDialog';
import { PostStateButtons } from '@/components/shared/PostStateButtons';
import { Skeleton } from '@/components/shared/Skeleton';
import { SettingsButton } from '@/components/settings/SettingsButton';
import { formatCount, timeAgo } from '@/lib/utils';
import type { PostState } from '@/types/post';
import type { ThreadsBlock } from '@/lib/parseThreadsPost';

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

type ThreadsEntry = { status: 'loading' | 'ready' | 'error'; blocks?: ThreadsBlock[] };

const SELECT_CLS = 'text-xs text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2';

function RedditTravelSection({ postStates, threadsStates, onStartGeneration, onView, onStartThreads, onViewThreads }: {
  postStates: Record<string, PostState>;
  threadsStates: Record<string, ThreadsEntry>;
  onStartGeneration: (post: RedditPost) => void;
  onView: (post: RedditPost) => void;
  onStartThreads: (post: RedditPost) => void;
  onViewThreads: (post: RedditPost) => void;
}) {
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [t, setT] = useState('week');
  const [limit, setLimit] = useState(3);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/reddit/hot?subreddit=travel&t=${t}&limit=${limit}`, { cache: 'no-store', signal: controller.signal })
      .then((r) => r.json())
      .then((data) => { setPosts(data.posts ?? []); setLoading(false); })
      .catch((e) => { if (e.name !== 'AbortError') setLoading(false); });
    return () => controller.abort();
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
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  <ThreadsButton
                    status={threadsStates[post.id]?.status ?? 'none'}
                    onGenerate={() => onStartThreads(post)}
                    onView={() => onViewThreads(post)}
                  />
                  <PostStateButtons
                    state={postStates[post.id]?.status ?? 'none'}
                    onGenerate={() => onStartGeneration(post)}
                    onView={() => onView(post)}
                  />
                </div>
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

function ZhihuTravelSection({ postStates, threadsStates, onStartGeneration, onView, onStartThreads, onViewThreads }: {
  postStates: Record<string, PostState>;
  threadsStates: Record<string, ThreadsEntry>;
  onStartGeneration: (q: ZhihuQuestion) => void;
  onView: (q: ZhihuQuestion) => void;
  onStartThreads: (q: ZhihuQuestion) => void;
  onViewThreads: (q: ZhihuQuestion) => void;
}) {
  const [questions, setQuestions] = useState<ZhihuQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(5);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/zhihu/travel?limit=${limit}`, { cache: 'no-store', signal: controller.signal })
      .then((r) => r.json())
      .then((data) => { setQuestions(data.questions ?? []); setLoading(false); })
      .catch((e) => { if (e.name !== 'AbortError') setLoading(false); });
    return () => controller.abort();
  }, [limit]);

  return (
    <div className="border-t-2 border-divider py-2">
      {loading ? <Skeleton count={limit} /> : (
        <div className="flex flex-col divide-y divide-divider">
          {questions.map((q, i) => (
            <div key={q.id} className={i > 0 ? 'pt-1' : ''}>
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
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  <ThreadsButton
                    status={threadsStates[q.id]?.status ?? 'none'}
                    onGenerate={() => onStartThreads(q)}
                    onView={() => onViewThreads(q)}
                  />
                  <PostStateButtons
                    state={postStates[q.id]?.status ?? 'none'}
                    onGenerate={() => onStartGeneration(q)}
                    onView={() => onView(q)}
                  />
                </div>
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
  const [threadsStates, setThreadsStates] = useState<Record<string, ThreadsEntry>>({});
  const [viewingThreads, setViewingThreads] = useState<{ id: string; title: string } | null>(null);

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
      setPostStates((prev) => ({ ...prev, [id]: { status: 'ready', content: composeRes.content ?? '', imageUrl: imageRes.url ?? null, error: '' } }));
    } catch (err) {
      setPostStates((prev) => ({ ...prev, [id]: { status: 'error', content: '', imageUrl: null, error: err instanceof Error ? err.message : 'Lỗi' } }));
    }
  }

  async function startThreads(id: string, title: string, endpoint: string, body: object) {
    setThreadsStates((prev) => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setThreadsStates((prev) => ({ ...prev, [id]: { status: 'ready', blocks: data.blocks } }));
      setViewingThreads({ id, title });
    } catch {
      setThreadsStates((prev) => ({ ...prev, [id]: { status: 'error' } }));
    }
  }

  const viewingId = viewing ? (viewing.kind === 'reddit' ? viewing.post.id : viewing.question.id) : null;
  const viewingState = viewingId ? postStates[viewingId] : null;
  const viewingTitle = viewing ? (viewing.kind === 'reddit' ? viewing.post.title : viewing.question.title) : '';
  const viewingLabel = viewing ? (viewing.kind === 'reddit' ? 'r/travel' : '知乎 · 旅行') : '';

  return (
    <>
      <div className="card h-full">
        <div className="section-label">
          Gét gô
          <SettingsButton section="getgo" label="Gét gô" />
        </div>
        <RedditTravelSection
          postStates={postStates}
          threadsStates={threadsStates}
          onStartGeneration={(post) => startGeneration({ kind: 'reddit', post })}
          onView={(post) => setViewing({ kind: 'reddit', post })}
          onStartThreads={(post) => startThreads(post.id, post.title, '/api/reddit/threads', { postId: post.id, subreddit: 'travel', title: post.title })}
          onViewThreads={(post) => setViewingThreads({ id: post.id, title: post.title })}
        />
        <ZhihuTravelSection
          postStates={postStates}
          threadsStates={threadsStates}
          onStartGeneration={(q) => startGeneration({ kind: 'zhihu', question: q })}
          onView={(q) => setViewing({ kind: 'zhihu', question: q })}
          onStartThreads={(q) => startThreads(q.id, q.title, '/api/zhihu/threads', { questionId: q.id, title: q.title })}
          onViewThreads={(q) => setViewingThreads({ id: q.id, title: q.title })}
        />
      </div>

      {viewing && viewingState?.status === 'ready' && (
        <ComposeDialog
          sourceLabel={viewingLabel}
          title={viewingTitle}
          facebookEndpoint="/api/getgo/facebook"
          imageSearchQuery={`travel ${viewingTitle}`}
          initialContent={viewingState.content}
          initialImageUrl={viewingState.imageUrl}
          mainAuthor={viewing.kind === 'reddit' ? `u/${viewing.post.author}` : undefined}
          mainCreatedAt={viewing.kind === 'reddit' ? viewing.post.createdUtc : undefined}
          onClose={() => setViewing(null)}
        />
      )}

      {viewingThreads && threadsStates[viewingThreads.id]?.status === 'ready' && (
        <ThreadsDialog
          blocks={threadsStates[viewingThreads.id].blocks!}
          title={viewingThreads.title}
          onClose={() => setViewingThreads(null)}
        />
      )}
    </>
  );
}
