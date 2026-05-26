'use client';

import { useCallback, useEffect, useState } from 'react';
import { PostDialog } from '@/components/shared/PostDialog';
import { OriginThreadsButton } from '@/components/shared/OriginThreadsButton';
import { Skeleton } from '@/components/shared/Skeleton';
import { SettingsButton } from '@/components/settings/SettingsButton';
import { formatCount } from '@/lib/utils';
import type { PostBlock } from '@/lib/parseThreadsPost';

type SEQuestion = {
  id: number;
  title: string;
  score: number;
  answerCount: number;
  viewCount: number;
  tags: string[];
  url: string;
  createdAt: number;
};

type PostEntry = { status: 'loading' | 'ready' | 'error'; blocks?: PostBlock[] };

const SELECT_CLS = 'text-xs text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2';

export function WorkplaceHotList() {
  const [questions, setQuestions] = useState<SEQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('votes');
  const [limit, setLimit] = useState(10);
  const [originStates, setOriginStates] = useState<Record<number, PostEntry>>({});
  const [viewingOrigin, setViewingOrigin] = useState<SEQuestion | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/workplace/hot?sort=${sort}&limit=${limit}`, { cache: 'no-store', signal: controller.signal })
      .then((r) => r.json())
      .then((data) => { setQuestions(data.questions ?? []); setLoading(false); })
      .catch((e) => { if (e.name !== 'AbortError') setLoading(false); });
    return () => controller.abort();
  }, [sort, limit]);

  const fetchOrigin = useCallback(async (question: SEQuestion) => {
    const id = question.id;
    setOriginStates((prev) => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const res = await fetch('/api/workplace/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: id, title: question.title }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setOriginStates((prev) => ({ ...prev, [id]: { status: 'ready', blocks: res.blocks } }));
      setViewingOrigin(question);
    } catch {
      setOriginStates((prev) => ({ ...prev, [id]: { status: 'error' } }));
    }
  }, []);

  return (
    <>
      <div className="card h-full">
        <div className="section-label">
          The Workplace
          <div className="ml-auto flex items-center gap-1.5">
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={SELECT_CLS}>
              <option value="votes">All time</option>
              <option value="month">Month</option>
              <option value="week">Week</option>
              <option value="hot">Hot</option>
              <option value="activity">Recent</option>
            </select>
            <span className="text-[10px] text-muted">·</span>
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={SELECT_CLS}>
              {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <SettingsButton section="workplace" label="The Workplace" />
          </div>
        </div>

        {loading ? <Skeleton count={limit} /> : (
          <div className="flex flex-col divide-y divide-divider">
            {questions.map((q) => (
              <div key={q.id} className="py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted whitespace-nowrap">
                    ▲ {formatCount(q.score)} · 💬 {q.answerCount}
                  </span>
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    <OriginThreadsButton
                      status={originStates[q.id]?.status ?? 'none'}
                      onGenerate={() => fetchOrigin(q)}
                      onView={() => setViewingOrigin(q)}
                    />
                  </div>
                </div>
                <a href={q.url} target="_blank" rel="noreferrer" className="truncate text-sm font-semibold text-primary hover:underline block">
                  {q.title}
                </a>
                {q.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {q.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[9px] px-1 py-0.5 rounded bg-surface text-muted">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingOrigin && originStates[viewingOrigin.id]?.blocks && (
        <PostDialog
          blocks={originStates[viewingOrigin.id].blocks!}
          title={viewingOrigin.title}
          sourceLabel="The Workplace"
          onClose={() => setViewingOrigin(null)}
        />
      )}
    </>
  );
}
