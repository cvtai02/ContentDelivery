'use client';

import { useCallback, useEffect, useState } from 'react';
import { PostDialog } from '@/components/shared/PostDialog';
import { OriginThreadsButton } from '@/components/shared/OriginThreadsButton';
import { VietnameseButton } from '@/components/shared/VietnameseButton';
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
  thumbnail: string | null;
  createdUtc?: number;
  subreddit?: string;
};

type PostEntry = { status: 'loading' | 'ready' | 'error'; blocks?: PostBlock[] };

const SUBREDDITS = ['antiwork', 'AskReddit', 'confession', 'AmItheAsshole', 'tifu', 'relationship_advice', 'personalfinance', 'legaladvice', 'raisedbynarcissists', 'JUSTNOMIL'];

const SELECT_T_CLS = 'min-w-[3.5rem] text-center text-xs normal-case text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2';
const SELECT_N_CLS = 'min-w-[2rem] text-center text-xs normal-case text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2';

function SubredditSection({
  subreddit,
  refreshTick,
  originStates,
  viStates,
  onStartOrigin,
  onViewOrigin,
  onStartVietnamese,
  onViewVietnamese,
  onRefreshVietnamese,
}: {
  subreddit: string;
  refreshTick: number;
  originStates: Record<string, PostEntry>;
  viStates: Record<string, PostEntry>;
  onStartOrigin: (post: RedditPost) => void;
  onViewOrigin: (post: RedditPost) => void;
  onStartVietnamese: (post: RedditPost) => void;
  onViewVietnamese: (post: RedditPost) => void;
  onRefreshVietnamese: (post: RedditPost) => void;
}) {
  const [t, setT] = useState('day');
  const [limit, setLimit] = useState(1);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/reddit/hot?subreddit=${subreddit}&t=${t}&limit=${limit}`, { cache: 'no-store', signal: controller.signal })
      .then((r) => r.json())
      .then((data) => { setPosts((data.posts ?? []).map((p: RedditPost) => ({ ...p, subreddit }))); setLoading(false); })
      .catch((e) => { if (e.name !== 'AbortError') setLoading(false); });
    return () => controller.abort();
  }, [subreddit, t, limit, refreshTick]);

  return (
    <div className="border-t-2 border-divider py-2">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[10px] font-bold text-accent">r/{subreddit}</span>
        <div className="flex items-center gap-1 ml-auto">
          <select value={t} onChange={(e) => setT(e.target.value)} className={SELECT_T_CLS}>
            <option value="day">Today</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
            <option value="all">All time</option>
          </select>
          <span className="text-[10px] text-muted">·</span>
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={SELECT_N_CLS}>
            {[1, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      {loading ? <Skeleton count={limit} /> : (
        <div className="flex flex-col divide-y divide-divider">
          {posts.map((post) => (
            <div key={post.id} className="pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted whitespace-nowrap">
                  ▲ {formatCount(post.score)} pts · 💬 {formatCount(post.comments)}
                  {post.createdUtc ? ` · ${timeAgo(post.createdUtc)} ago` : ''}
                </span>
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  <VietnameseButton
                    status={viStates[post.id]?.status ?? 'none'}
                    onGenerate={() => onStartVietnamese(post)}
                    onView={() => onViewVietnamese(post)}
                    onRefresh={() => onRefreshVietnamese(post)}
                  />
                  <OriginThreadsButton
                    status={originStates[post.id]?.status ?? 'none'}
                    onGenerate={() => onStartOrigin(post)}
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

export function RedditHotList() {
  const [refreshTick, setRefreshTick] = useState(0);
  const [originStates, setOriginStates] = useState<Record<string, PostEntry>>({});
  const [viewingOrigin, setViewingOrigin] = useState<RedditPost | null>(null);
  const [viStates, setViStates] = useState<Record<string, PostEntry>>({});
  const [viewingVi, setViewingVi] = useState<RedditPost | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setRefreshTick((v) => v + 1), 5 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrigin = useCallback(async (post: RedditPost) => {
    const id = post.id;
    setOriginStates((prev) => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const res = await fetch('/api/reddit/origin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, subreddit: post.subreddit ?? 'AskReddit', title: post.title }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setOriginStates((prev) => ({ ...prev, [id]: { status: 'ready', blocks: res.blocks } }));
      setViewingOrigin(post);
    } catch {
      setOriginStates((prev) => ({ ...prev, [id]: { status: 'error' } }));
    }
  }, []);

  const fetchVietnamese = useCallback(async (post: RedditPost, refresh = false) => {
    const id = post.id;
    setViStates((prev) => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const res = await fetch('/api/reddit/vietnamese', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, subreddit: post.subreddit ?? 'AskReddit', title: post.title, refresh }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setViStates((prev) => ({ ...prev, [id]: { status: 'ready', blocks: res.blocks } }));
      setViewingVi(post);
    } catch {
      setViStates((prev) => ({ ...prev, [id]: { status: 'error' } }));
    }
  }, []);

  return (
    <>
      <div className="card h-full">
        <div className="section-label">
          Reddit
          <SettingsButton section="reddit" label="Reddit" />
        </div>
        {SUBREDDITS.map((sub) => (
          <SubredditSection
            key={sub}
            subreddit={sub}
            refreshTick={refreshTick}
            originStates={originStates}
            viStates={viStates}
            onStartOrigin={fetchOrigin}
            onViewOrigin={setViewingOrigin}
            onStartVietnamese={(post) => fetchVietnamese(post)}
            onViewVietnamese={setViewingVi}
            onRefreshVietnamese={(post) => fetchVietnamese(post, true)}
          />
        ))}
      </div>

      {viewingOrigin && originStates[viewingOrigin.id]?.blocks && (
        <PostDialog
          blocks={originStates[viewingOrigin.id].blocks!}
          title={viewingOrigin.title}
          sourceLabel={`r/${viewingOrigin.subreddit ?? 'reddit'} · origin`}
          onClose={() => setViewingOrigin(null)}
        />
      )}

      {viewingVi && viStates[viewingVi.id]?.blocks && (
        <PostDialog
          blocks={viStates[viewingVi.id].blocks!}
          title={viewingVi.title}
          sourceLabel={`r/${viewingVi.subreddit ?? 'reddit'} · vietnamese`}
          onClose={() => setViewingVi(null)}
        />
      )}
    </>
  );
}
