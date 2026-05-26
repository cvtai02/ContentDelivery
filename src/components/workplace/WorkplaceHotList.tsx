'use client';

import { useEffect, useState } from 'react';
import { ComposeDialog } from '@/components/shared/ComposeDialog';
import { ThreadsButton } from '@/components/shared/ThreadsButton';
import { PostStateButtons } from '@/components/shared/PostStateButtons';
import { Skeleton } from '@/components/shared/Skeleton';
import { SettingsButton } from '@/components/settings/SettingsButton';
import { useThreads } from '@/hooks/useThreads';
import { formatCount } from '@/lib/utils';
import type { PostState } from '@/types/post';

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


const SELECT_CLS = 'text-xs text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2';

export function WorkplaceHotList() {
  const [questions, setQuestions] = useState<SEQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('votes');
  const [limit, setLimit] = useState(10);
  const [postStates, setPostStates] = useState<Record<number, PostState>>({});
  const [viewing, setViewing] = useState<SEQuestion | null>(null);
  const { threadsStates, startThreads: triggerThreads, setViewingThreads, dialog } = useThreads();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/workplace/hot?sort=${sort}&limit=${limit}`, { cache: 'no-store', signal: controller.signal })
      .then((r) => r.json())
      .then((data) => { setQuestions(data.questions ?? []); setLoading(false); })
      .catch((e) => { if (e.name !== 'AbortError') setLoading(false); });
    return () => controller.abort();
  }, [sort, limit]);

  async function startGeneration(question: SEQuestion) {
    const id = question.id;
    setPostStates((prev) => ({ ...prev, [id]: { status: 'generating', content: '', imageUrl: null, error: '' } }));
    try {
      const [composeRes, imageRes] = await Promise.all([
        fetch('/api/workplace/compose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: id, title: question.title }) }).then((r) => r.json()),
        fetch(`/api/image/find?q=${encodeURIComponent(question.title)}`).then((r) => r.json()),
      ]);
      if (composeRes.error) throw new Error(composeRes.error);
      setPostStates((prev) => ({ ...prev, [id]: { status: 'ready', content: composeRes.content ?? '', imageUrl: imageRes.url ?? null, error: '' } }));
    } catch (err) {
      setPostStates((prev) => ({ ...prev, [id]: { status: 'error', content: '', imageUrl: null, error: err instanceof Error ? err.message : 'Lỗi' } }));
    }
  }

  function startThreads(question: SEQuestion) {
    triggerThreads(String(question.id), question.title, '/api/workplace/threads', { questionId: question.id, title: question.title });
  }

  const viewingState = viewing ? postStates[viewing.id] : null;

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
            {questions.map((q) => {
              const ps = postStates[q.id];
              const ts = threadsStates[q.id];
              return (
                <div key={q.id} className="py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted whitespace-nowrap">
                      ▲ {formatCount(q.score)} · 💬 {q.answerCount}
                    </span>
                    <div className="ml-auto flex items-center gap-1 shrink-0">
                      <ThreadsButton
                        status={ts?.status ?? 'none'}
                        onGenerate={() => startThreads(q)}
                        onView={() => setViewingThreads({ id: String(q.id), title: q.title })}
                      />
                      <PostStateButtons
                        state={ps?.status ?? 'none'}
                        onGenerate={() => startGeneration(q)}
                        onView={() => setViewing(q)}
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
              );
            })}
          </div>
        )}
      </div>

      {viewing && viewingState?.status === 'ready' && (
        <ComposeDialog
          sourceLabel="The Workplace"
          title={viewing.title}
          facebookEndpoint="/api/workplace/facebook"
          initialContent={viewingState.content}
          initialImageUrl={viewingState.imageUrl}
          mainCreatedAt={viewing.createdAt}
          onClose={() => setViewing(null)}
        />
      )}

      {dialog}
    </>
  );
}
