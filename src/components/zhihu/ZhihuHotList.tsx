'use client';

import { useEffect, useState } from 'react';
import { ComposeDialog } from '@/components/shared/ComposeDialog';
import { ThreadsButton } from '@/components/shared/ThreadsButton';
import { PostStateButtons } from '@/components/shared/PostStateButtons';
import { Skeleton } from '@/components/shared/Skeleton';
import { SettingsButton } from '@/components/settings/SettingsButton';
import { useThreads } from '@/hooks/useThreads';
import type { PostState } from '@/types/post';

type ZhihuQuestion = {
  id: string;
  title: string;
  excerpt: string;
  answerCount: number;
  heat: string;
  url: string;
};


const SELECT_CLS = 'text-xs text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2';

export function ZhihuHotList() {
  const [questions, setQuestions] = useState<ZhihuQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [limit, setLimit] = useState(10);
  const [postStates, setPostStates] = useState<Record<string, PostState>>({});
  const [viewing, setViewing] = useState<ZhihuQuestion | null>(null);
  const { threadsStates, startThreads: triggerThreads, setViewingThreads, dialog } = useThreads();

  useEffect(() => {
    setLoading(true);
    setFetchError('');
    const controller = new AbortController();
    fetch(`/api/zhihu/hot?limit=${limit}`, { cache: 'no-store', signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setFetchError(data.error); setLoading(false); return; }
        setQuestions(data.questions ?? []);
        setLoading(false);
      })
      .catch((e) => { if (e.name !== 'AbortError') { setFetchError('Không thể tải dữ liệu Zhihu'); setLoading(false); } });
    return () => controller.abort();
  }, [limit]);

  async function startGeneration(question: ZhihuQuestion) {
    const id = question.id;
    setPostStates((prev) => ({ ...prev, [id]: { status: 'generating', content: '', imageUrl: null, error: '' } }));
    try {
      const [composeRes, imageRes] = await Promise.all([
        fetch('/api/zhihu/compose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: id, title: question.title }) }).then((r) => r.json()),
        fetch(`/api/image/find?q=${encodeURIComponent(question.title)}`).then((r) => r.json()),
      ]);
      if (composeRes.error) throw new Error(composeRes.error);
      setPostStates((prev) => ({ ...prev, [id]: { status: 'ready', content: composeRes.content ?? '', imageUrl: imageRes.url ?? null, error: '' } }));
    } catch (err) {
      setPostStates((prev) => ({ ...prev, [id]: { status: 'error', content: '', imageUrl: null, error: err instanceof Error ? err.message : 'Lỗi' } }));
    }
  }

  function startThreads(question: ZhihuQuestion) {
    triggerThreads(question.id, question.title, '/api/zhihu/threads', { questionId: question.id, title: question.title });
  }

  const viewingState = viewing ? postStates[viewing.id] : null;

  return (
    <>
      <div className="card h-full">
        <div className="section-label">
          知乎热榜
          <div className="ml-auto flex items-center gap-1.5">
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={SELECT_CLS}>
              {[5, 10, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <SettingsButton section="zhihu" label="知乎热榜" />
          </div>
        </div>

        {loading ? <Skeleton count={limit} /> : fetchError ? (
          <p className="py-4 text-xs text-fall">{fetchError}</p>
        ) : (
          <div className="flex flex-col divide-y divide-divider">
            {questions.map((q, i) => {
              const ps = postStates[q.id];
              const ts = threadsStates[q.id];
              return (
                <div key={q.id} className="py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-muted w-4 shrink-0">{i + 1}</span>
                    <span className="text-[10px] text-muted truncate">{q.heat}</span>
                    <div className="ml-auto flex items-center gap-1 shrink-0">
                      <ThreadsButton
                        status={ts?.status ?? 'none'}
                        onGenerate={() => startThreads(q)}
                        onView={() => setViewingThreads({ id: q.id, title: q.title })}
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewing && viewingState?.status === 'ready' && (
        <ComposeDialog
          sourceLabel="知乎"
          title={viewing.title}
          facebookEndpoint="/api/zhihu/facebook"
          initialContent={viewingState.content}
          initialImageUrl={viewingState.imageUrl}
          onClose={() => setViewing(null)}
        />
      )}

      {dialog}
    </>
  );
}
