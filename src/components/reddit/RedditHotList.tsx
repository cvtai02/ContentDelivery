'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PostDialog } from '@/components/shared/PostDialog';
import { PostLanguage } from '@/types/post';
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
type TranslationRequest = { controller: AbortController; jobId: string };

const DEFAULT_SUBREDDITS = ['antiwork', 'AskReddit', 'confession', 'AmItheAsshole', 'tifu', 'relationship_advice', 'travel'];
const SUBREDDIT_RE = /^[A-Za-z0-9_]{2,21}$/;

const SELECT_T_CLS = 'min-w-[3.5rem] text-center text-xs normal-case text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2';
const SELECT_N_CLS = 'min-w-[2rem] text-center text-xs normal-case text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2';

function defaultManagedSubreddits(): string[] {
  return DEFAULT_SUBREDDITS;
}

function normalizeSubreddit(value: string): string {
  return value.trim().replace(/^r\//i, '').replace(/^\/r\//i, '');
}

function SubredditSection({
  subreddit,
  refreshTick,
  defaultLimit,
  originStates,
  viStates,
  onStartOrigin,
  onViewOrigin,
  onStartVietnamese,
  onViewVietnamese,
  onRefreshVietnamese,
  onCancelVietnamese,
}: {
  subreddit: string;
  refreshTick: number;
  defaultLimit: number;
  originStates: Record<string, PostEntry>;
  viStates: Record<string, PostEntry>;
  onStartOrigin: (post: RedditPost) => void;
  onViewOrigin: (post: RedditPost) => void;
  onStartVietnamese: (post: RedditPost) => void;
  onViewVietnamese: (post: RedditPost) => void;
  onRefreshVietnamese: (post: RedditPost) => void;
  onCancelVietnamese: (postId: string) => void;
}) {
  const [t, setT] = useState('day');
  const [limit, setLimit] = useState(defaultLimit);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLimit(defaultLimit);
  }, [defaultLimit]);

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
                    onCancel={() => onCancelVietnamese(post.id)}
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

function SubredditManagerDialog({
  subreddits,
  onAdd,
  onRemove,
  onClose,
}: {
  subreddits: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  function submit() {
    const name = normalizeSubreddit(draft);
    if (!SUBREDDIT_RE.test(name)) {
      setError('Use a valid subreddit name.');
      return;
    }
    const existing = subreddits.find((sub) => sub.toLowerCase() === name.toLowerCase());
    if (existing) {
      setError('That subreddit is already listed.');
      return;
    }
    onAdd(name);
    setDraft('');
    setError('');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-panel p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary">Reddit subreddits</h2>
          <button onClick={onClose} className="text-muted hover:text-primary cursor-pointer bg-transparent border-none text-lg leading-none">x</button>
        </div>

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="AskReddit"
            className="min-w-0 flex-1 rounded-xl border border-divider bg-surface px-3 py-2 text-xs text-primary outline-none focus:border-accent"
          />
          <button
            onClick={submit}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
          >
            Add
          </button>
        </div>
        {error && <p className="text-xs text-fall">{error}</p>}

        <div className="flex flex-col divide-y divide-divider rounded-xl border border-divider">
          {subreddits.map((sub) => (
            <div key={sub.toLowerCase()} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-primary">r/{sub}</p>
              </div>
              <button
                onClick={() => onRemove(sub)}
                className="rounded-md border border-fall/30 bg-fall/10 px-2 py-1 text-[11px] font-semibold text-fall hover:bg-fall/20 cursor-pointer"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function RedditHotList() {
  const [refreshTick, setRefreshTick] = useState(0);
  const [originStates, setOriginStates] = useState<Record<string, PostEntry>>({});
  const [viewingOrigin, setViewingOrigin] = useState<RedditPost | null>(null);
  const [viStates, setViStates] = useState<Record<string, PostEntry>>({});
  const [viewingVi, setViewingVi] = useState<RedditPost | null>(null);
  const viControllersRef = useRef<Record<string, TranslationRequest>>({});
  const [subreddits, setSubreddits] = useState<string[]>(() => defaultManagedSubreddits());
  const [defaultPostLimit, setDefaultPostLimit] = useState(1);
  const [subredditManagerOpen, setSubredditManagerOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setRefreshTick((v) => v + 1), 5 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(viControllersRef.current).forEach(({ controller, jobId }) => {
        controller.abort();
        void fetch('/api/codex/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        });
      });
      viControllersRef.current = {};
    };
  }, []);

  useEffect(() => {
    fetch('/api/reddit/subreddits', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { subreddits?: string[] }) => {
        setSubreddits(data.subreddits ?? defaultManagedSubreddits());
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch('/api/section-preferences', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { redditDefaultPostLimit?: number }) => {
        setDefaultPostLimit(data.redditDefaultPostLimit ?? 1);
      })
      .catch(() => undefined);
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

  const cancelVietnamese = useCallback((postId: string) => {
    const request = viControllersRef.current[postId];
    if (!request) return;
    request.controller.abort();
    void fetch('/api/codex/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: request.jobId }),
    });
  }, []);

  const fetchVietnamese = useCallback(async (post: RedditPost, refresh = false) => {
    const id = post.id;
    cancelVietnamese(id);
    const controller = new AbortController();
    const jobId = `reddit_vi_${id}_${Date.now()}`;
    viControllersRef.current[id] = { controller, jobId };
    setViStates((prev) => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const res = await fetch('/api/reddit/vietnamese', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, subreddit: post.subreddit ?? 'AskReddit', title: post.title, refresh, translationJobId: jobId }),
        signal: controller.signal,
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setViStates((prev) => ({ ...prev, [id]: { status: 'ready', blocks: res.blocks } }));
      setViewingVi(post);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setViStates((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        return;
      }
      setViStates((prev) => ({ ...prev, [id]: { status: 'error' } }));
    } finally {
      if (viControllersRef.current[id]?.controller === controller) {
        delete viControllersRef.current[id];
      }
    }
  }, [cancelVietnamese]);

  const saveSubreddits = useCallback(async (next: string[]) => {
    setSubreddits(next);
    try {
      const data = await fetch('/api/reddit/subreddits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddits: next }),
      }).then((r) => r.json()) as { subreddits?: string[] };
      if (data.subreddits) setSubreddits(data.subreddits);
    } catch {
      // Keep the optimistic UI; the next page load will re-sync from the DB.
    }
  }, []);

  const addSubreddit = useCallback((value: string) => {
    const name = normalizeSubreddit(value);
    if (!SUBREDDIT_RE.test(name)) return;
    const existing = subreddits.find((sub) => sub.toLowerCase() === name.toLowerCase());
    if (existing) return;
    void saveSubreddits([...subreddits, name]);
  }, [saveSubreddits, subreddits]);

  const removeSubreddit = useCallback((name: string) => {
    void saveSubreddits(subreddits.filter((sub) => (
      sub.toLowerCase() !== name.toLowerCase()
    )));
  }, [saveSubreddits, subreddits]);

  return (
    <>
      <div className="card h-full">
        <div className="section-label">
          Reddit
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setSubredditManagerOpen(true)}
              title="Manage subreddits"
              className="rounded-md bg-surface border border-divider px-2 py-0.5 text-[11px] font-semibold text-muted hover:text-primary transition-colors cursor-pointer"
            >
              subs
            </button>
            <SettingsButton section="reddit" label="Reddit" />
          </div>
        </div>
        {subreddits.length === 0 ? (
          <p className="border-t-2 border-divider py-4 text-xs text-muted">
            No subreddits listed.
          </p>
        ) : subreddits.map((sub) => (
          <SubredditSection
            key={sub.toLowerCase()}
            subreddit={sub}
            refreshTick={refreshTick}
            defaultLimit={defaultPostLimit}
            originStates={originStates}
            viStates={viStates}
            onStartOrigin={fetchOrigin}
            onViewOrigin={setViewingOrigin}
            onStartVietnamese={(post) => fetchVietnamese(post)}
            onViewVietnamese={setViewingVi}
            onRefreshVietnamese={(post) => fetchVietnamese(post, true)}
            onCancelVietnamese={cancelVietnamese}
          />
        ))}
      </div>

      {subredditManagerOpen && (
        <SubredditManagerDialog
          subreddits={subreddits}
          onAdd={addSubreddit}
          onRemove={removeSubreddit}
          onClose={() => setSubredditManagerOpen(false)}
        />
      )}

      {viewingOrigin && originStates[viewingOrigin.id]?.blocks && (
        <PostDialog
          blocks={originStates[viewingOrigin.id].blocks!}
          title={viewingOrigin.title}
          sourceLabel={`r/${viewingOrigin.subreddit ?? 'reddit'} · origin`}
          postLanguage={PostLanguage.English}
          onClose={() => setViewingOrigin(null)}
        />
      )}

      {viewingVi && viStates[viewingVi.id]?.blocks && (
        <PostDialog
          blocks={viStates[viewingVi.id].blocks!}
          title={viewingVi.title}
          sourceLabel={`r/${viewingVi.subreddit ?? 'reddit'} · vietnamese`}
          postLanguage={PostLanguage.Vietnamese}
          onClose={() => setViewingVi(null)}
        />
      )}
    </>
  );
}
