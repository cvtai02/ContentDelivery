'use client';

import { useCallback, useEffect, useState } from 'react';
import { PostDialog } from '@/components/shared/PostDialog';
import { OriginThreadsButton } from '@/components/shared/OriginThreadsButton';
import { Skeleton } from '@/components/shared/Skeleton';
import { SettingsButton } from '@/components/settings/SettingsButton';
import type { PostBlock } from '@/lib/parseThreadsPost';

type ZhihuQuestion = {
  id: string;
  title: string;
  excerpt: string;
  answerCount: number;
  heat: string;
  url: string;
};

type PostEntry = { status: 'loading' | 'ready' | 'error'; blocks?: PostBlock[] };

const SELECT_CLS = 'text-xs text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2';

export function ZhihuHotList() {
  const [questions, setQuestions] = useState<ZhihuQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [limit, setLimit] = useState(10);
  const [originStates, setOriginStates] = useState<Record<string, PostEntry>>({});
  const [viewingOrigin, setViewingOrigin] = useState<ZhihuQuestion | null>(null);

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

  const fetchOrigin = useCallback(async (question: ZhihuQuestion) => {
    const id = question.id;
    setOriginStates((prev) => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const res = await fetch('/api/zhihu/threads', {
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
            {questions.map((q, i) => (
              <div key={q.id} className="py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted w-4 shrink-0">{i + 1}</span>
                  <span className="text-[10px] text-muted truncate">{q.heat}</span>
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
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingOrigin && originStates[viewingOrigin.id]?.blocks && (
        <PostDialog
          blocks={originStates[viewingOrigin.id].blocks!}
          title={viewingOrigin.title}
          sourceLabel="知乎热榜"
          onClose={() => setViewingOrigin(null)}
        />
      )}
    </>
  );
}
