'use client';

import { useCallback, useEffect, useState } from 'react';
import { PostDialog } from '@/components/shared/PostDialog';
import { OriginThreadsButton } from '@/components/shared/OriginThreadsButton';
import { Skeleton } from '@/components/shared/Skeleton';
import { SettingsButton } from '@/components/settings/SettingsButton';
import { formatCount, timeAgo } from '@/lib/utils';
import type { PostBlock } from '@/lib/parseThreadsPost';

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

type PostEntry = { status: 'loading' | 'ready' | 'error'; blocks?: PostBlock[] };
type ViewingTarget = { id: string; title: string; label: string };

const SELECT_CLS = 'text-xs text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2';

function RedditTravelSection({
  originStates,
  onFetchOrigin,
  onViewOrigin,
}: {
  originStates: Record<string, PostEntry>;
  onFetchOrigin: (post: RedditPost) => void;
  onViewOrigin: (post: RedditPost) => void;
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
                  <OriginThreadsButton
                    status={originStates[post.id]?.status ?? 'none'}
                    onGenerate={() => onFetchOrigin(post)}
                    onView={() => onViewOrigin(post)}
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

function ZhihuTravelSection({
  originStates,
  onFetchOrigin,
  onViewOrigin,
}: {
  originStates: Record<string, PostEntry>;
  onFetchOrigin: (q: ZhihuQuestion) => void;
  onViewOrigin: (q: ZhihuQuestion) => void;
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
                  <OriginThreadsButton
                    status={originStates[q.id]?.status ?? 'none'}
                    onGenerate={() => onFetchOrigin(q)}
                    onView={() => onViewOrigin(q)}
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
  const [originStates, setOriginStates] = useState<Record<string, PostEntry>>({});
  const [viewing, setViewing] = useState<ViewingTarget | null>(null);

  const fetchRedditOrigin = useCallback(async (post: RedditPost) => {
    const id = post.id;
    setOriginStates((prev) => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const res = await fetch('/api/reddit/origin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, subreddit: 'travel', title: post.title }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setOriginStates((prev) => ({ ...prev, [id]: { status: 'ready', blocks: res.blocks } }));
      setViewing({ id, title: post.title, label: 'r/travel' });
    } catch {
      setOriginStates((prev) => ({ ...prev, [id]: { status: 'error' } }));
    }
  }, []);

  const fetchZhihuOrigin = useCallback(async (q: ZhihuQuestion) => {
    const id = q.id;
    setOriginStates((prev) => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const res = await fetch('/api/zhihu/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: id, title: q.title }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setOriginStates((prev) => ({ ...prev, [id]: { status: 'ready', blocks: res.blocks } }));
      setViewing({ id, title: q.title, label: '知乎 · 旅行' });
    } catch {
      setOriginStates((prev) => ({ ...prev, [id]: { status: 'error' } }));
    }
  }, []);

  return (
    <>
      <div className="card h-full">
        <div className="section-label">
          Gét gô
          <SettingsButton section="getgo" label="Gét gô" />
        </div>
        <RedditTravelSection
          originStates={originStates}
          onFetchOrigin={fetchRedditOrigin}
          onViewOrigin={(post) => setViewing({ id: post.id, title: post.title, label: 'r/travel' })}
        />
        <ZhihuTravelSection
          originStates={originStates}
          onFetchOrigin={fetchZhihuOrigin}
          onViewOrigin={(q) => setViewing({ id: q.id, title: q.title, label: '知乎 · 旅行' })}
        />
      </div>

      {viewing && originStates[viewing.id]?.blocks && (
        <PostDialog
          blocks={originStates[viewing.id].blocks!}
          title={viewing.title}
          sourceLabel={viewing.label}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}
