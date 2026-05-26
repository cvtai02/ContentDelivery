'use client';

import { useCallback, useEffect, useState } from 'react';
import { ComposeDialog } from '@/components/shared/ComposeDialog';
import { ThreadsButton } from '@/components/shared/ThreadsButton';
import { PostStateButtons } from '@/components/shared/PostStateButtons';
import { Skeleton } from '@/components/shared/Skeleton';
import { SettingsButton } from '@/components/settings/SettingsButton';
import { useThreads } from '@/hooks/useThreads';
import { formatCount, timeAgo } from '@/lib/utils';
import type { PostState } from '@/types/post';
import type { ThreadsEntry } from '@/hooks/useThreads';

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


const SUBREDDITS = ['antiwork', 'AskReddit', 'confession', 'AmItheAsshole', 'tifu', 'relationship_advice', 'personalfinance', 'legaladvice', 'raisedbynarcissists', 'JUSTNOMIL'];

const SELECT_T_CLS = 'min-w-[3.5rem] text-center text-xs normal-case text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2';
const SELECT_N_CLS = 'min-w-[2rem] text-center text-xs normal-case text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2';

function SubredditSection({
  subreddit,
  refreshTick,
  postStates,
  threadsStates,
  onStartGeneration,
  onView,
  onStartThreads,
  onViewThreads,
}: {
  subreddit: string;
  refreshTick: number;
  postStates: Record<string, PostState>;
  threadsStates: Record<string, ThreadsEntry>;
  onStartGeneration: (post: RedditPost) => void;
  onView: (post: RedditPost) => void;
  onStartThreads: (post: RedditPost) => void;
  onViewThreads: (post: RedditPost) => void;
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

export function RedditHotList() {
  const [refreshTick, setRefreshTick] = useState(0);
  const [postStates, setPostStates] = useState<Record<string, PostState>>({});
  const [viewing, setViewing] = useState<RedditPost | null>(null);
  const { threadsStates, startThreads: triggerThreads, setViewingThreads, dialog } = useThreads();

  useEffect(() => {
    const interval = setInterval(() => setRefreshTick((v) => v + 1), 5 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const startGeneration = useCallback(async (post: RedditPost) => {
    const id = post.id;
    const subreddit = post.subreddit ?? 'AskReddit';
    setPostStates((prev) => ({ ...prev, [id]: { status: 'generating', content: '', imageUrl: null, error: '' } }));
    try {
      const [composeRes, imageRes] = await Promise.all([
        fetch('/api/reddit/compose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: id, subreddit, title: post.title }) }).then((r) => r.json()),
        fetch(`/api/image/find?q=${encodeURIComponent(post.title)}`).then((r) => r.json()),
      ]);
      if (composeRes.error) throw new Error(composeRes.error);
      setPostStates((prev) => ({ ...prev, [id]: { status: 'ready', content: composeRes.content ?? '', imageUrl: imageRes.url ?? null, error: '' } }));
    } catch (err) {
      setPostStates((prev) => ({ ...prev, [id]: { status: 'error', content: '', imageUrl: null, error: err instanceof Error ? err.message : 'Lỗi' } }));
    }
  }, []);

  const startThreads = useCallback((post: RedditPost) => {
    triggerThreads(post.id, post.title, '/api/reddit/threads', { postId: post.id, subreddit: post.subreddit ?? 'AskReddit', title: post.title });
  }, [triggerThreads]);

  const viewingState = viewing ? postStates[viewing.id] : null;

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
            postStates={postStates}
            threadsStates={threadsStates}
            onStartGeneration={startGeneration}
            onView={setViewing}
            onStartThreads={startThreads}
            onViewThreads={(post) => setViewingThreads({ id: post.id, title: post.title })}
          />
        ))}
      </div>

      {viewing && viewingState?.status === 'ready' && (
        <ComposeDialog
          sourceLabel={`r/${viewing.subreddit ?? 'reddit'}`}
          title={viewing.title}
          facebookEndpoint="/api/reddit/facebook"
          initialContent={viewingState.content}
          initialImageUrl={viewingState.imageUrl}
          mainAuthor={`u/${viewing.author}`}
          mainCreatedAt={viewing.createdUtc}
          onClose={() => setViewing(null)}
        />
      )}

      {dialog}
    </>
  );
}
