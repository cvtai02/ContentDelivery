'use client';

import { useEffect, useState } from 'react';
import { WeiboSettingsDialog } from './WeiboSettingsDialog';

type WeiboTopic = {
  rank: number;
  word: string;
  num: number;
  label: string;
  url: string;
};

const LABEL_COLORS: Record<string, string> = {
  '沸': 'text-fall',
  '爆': 'text-fall',
  '热': 'text-warn',
  '新': 'text-rise',
};

function formatNum(n: number) {
  return new Intl.NumberFormat('en-US', { notation: n >= 10000 ? 'compact' : 'standard' }).format(n);
}

function Skeleton() {
  return (
    <div className="flex flex-col divide-y divide-divider">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1.5">
          <div className="h-3 w-4 animate-pulse rounded bg-surface shrink-0" />
          <div className="h-3 flex-1 animate-pulse rounded bg-surface" />
          <div className="h-3 w-10 animate-pulse rounded bg-surface shrink-0" />
        </div>
      ))}
    </div>
  );
}

const LIMIT_OPTIONS = [10, 20, 30];

export function WeiboHotList() {
  const [topics, setTopics] = useState<WeiboTopic[]>([]);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetch('/api/weibo/hot', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTopics(data.topics ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Cannot fetch Weibo hot search');
        setLoading(false);
      });

    const interval = setInterval(() => {
      fetch('/api/weibo/hot', { cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => { if (!data.error) setTopics(data.topics ?? []); })
        .catch(() => undefined);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
    <div className="card h-full">
      <div className="section-label" lang="zh-CN">
        微博热搜
        <button
          onClick={() => setShowSettings(true)}
          className="text-muted hover:text-primary transition-colors bg-transparent border-none cursor-pointer p-0 leading-none"
          title="Weibo Settings"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="ml-auto min-w-[2.5rem] text-center text-xs normal-case text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>Top {n}</option>
          ))}
        </select>
      </div>

      {loading && <Skeleton />}

      {error && !loading && (
        <p className="text-xs text-fall">{error}</p>
      )}

      {!loading && !error && (
        <div className="flex flex-col divide-y divide-divider" lang="zh-CN">
          {topics.slice(0, limit).map((topic) => (
            <div key={topic.rank} className="flex items-center gap-2 py-1">
              <span className={`w-5 shrink-0 text-center text-[11px] font-bold ${topic.rank <= 3 ? 'text-fall' : 'text-muted'}`}>
                {topic.rank}
              </span>
              <a
                href={topic.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm font-semibold text-primary hover:underline"
              >
                {topic.word}
              </a>
              {topic.label && (
                <span className={`shrink-0 text-[10px] font-bold ${LABEL_COLORS[topic.label] ?? 'text-muted'}`}>
                  {topic.label}
                </span>
              )}
              <span className="shrink-0 text-[10px] text-muted">{formatNum(topic.num)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
    {showSettings && <WeiboSettingsDialog onClose={() => setShowSettings(false)} />}
    </>
  );
}
