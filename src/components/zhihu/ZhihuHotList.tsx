'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PostDialog } from '@/components/shared/PostDialog';
import { PostLanguage } from '@/types/post';
import { OriginThreadsButton } from '@/components/shared/OriginThreadsButton';
import { VietnameseButton } from '@/components/shared/VietnameseButton';
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
type ZhihuTopic = { id: string; name: string };
type TranslationRequest = { controller: AbortController; jobId: string };

const SELECT_CLS = 'text-xs text-muted outline-none bg-transparent border-none cursor-pointer appearance-none underline underline-offset-2';
const TOPIC_ID_RE = /^\d+$/;

function parseTopicId(value: string): string {
  const match = value.trim().match(/(?:^|\/)topic\/(\d+)|^(\d+)$/i);
  return match?.[1] ?? match?.[2] ?? '';
}

function ZhihuTopicManagerDialog({
  topics,
  onAdd,
  onRemove,
  onClose,
}: {
  topics: ZhihuTopic[];
  onAdd: (topic: ZhihuTopic) => void;
  onRemove: (topicId: string) => void;
  onClose: () => void;
}) {
  const [topicInput, setTopicInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState('');

  function submit() {
    const id = parseTopicId(topicInput);
    if (!TOPIC_ID_RE.test(id)) {
      setError('Use a valid Zhihu topic URL or numeric topic id.');
      return;
    }
    if (topics.some((topic) => topic.id === id)) {
      setError('That topic is already listed.');
      return;
    }
    onAdd({ id, name: nameInput.trim() || `Topic ${id}` });
    setTopicInput('');
    setNameInput('');
    setError('');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-panel p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary">Zhihu topics</h2>
          <button onClick={onClose} className="text-muted hover:text-primary cursor-pointer bg-transparent border-none text-lg leading-none">x</button>
        </div>

        <div className="flex flex-col gap-2">
          <input
            value={topicInput}
            onChange={(e) => { setTopicInput(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="https://www.zhihu.com/topic/19607590"
            className="w-full rounded-xl border border-divider bg-surface px-3 py-2 text-xs text-primary outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="Display name"
              className="min-w-0 flex-1 rounded-xl border border-divider bg-surface px-3 py-2 text-xs text-primary outline-none focus:border-accent"
            />
            <button onClick={submit} className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer">
              Add
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-fall">{error}</p>}

        <div className="flex flex-col divide-y divide-divider rounded-xl border border-divider">
          {topics.map((topic) => (
            <div key={topic.id} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-primary">{topic.name}</p>
                <p className="text-[10px] text-muted">topic/{topic.id}</p>
              </div>
              <button
                onClick={() => onRemove(topic.id)}
                className="rounded-md border border-fall/30 bg-fall/10 px-2 py-1 text-[11px] font-semibold text-fall hover:bg-fall/20 cursor-pointer"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 cursor-pointer">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ZhihuTopicSection({
  topic,
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
  topic: ZhihuTopic;
  defaultLimit: number;
  originStates: Record<string, PostEntry>;
  viStates: Record<string, PostEntry>;
  onStartOrigin: (question: ZhihuQuestion) => void;
  onViewOrigin: (question: ZhihuQuestion) => void;
  onStartVietnamese: (question: ZhihuQuestion) => void;
  onViewVietnamese: (question: ZhihuQuestion) => void;
  onRefreshVietnamese: (question: ZhihuQuestion) => void;
  onCancelVietnamese: (questionId: string) => void;
}) {
  const [questions, setQuestions] = useState<ZhihuQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [limit, setLimit] = useState(defaultLimit);

  useEffect(() => {
    setLimit(defaultLimit);
  }, [defaultLimit]);

  useEffect(() => {
    setLoading(true);
    setFetchError('');
    const controller = new AbortController();
    fetch(`/api/zhihu/topic?topicId=${topic.id}&limit=${limit}`, { cache: 'no-store', signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setFetchError(data.error); setLoading(false); return; }
        setQuestions(data.questions ?? []);
        setLoading(false);
      })
      .catch((e) => { if (e.name !== 'AbortError') { setFetchError('Could not load Zhihu topic.'); setLoading(false); } });
    return () => controller.abort();
  }, [topic.id, limit]);

  return (
    <div className="border-t-2 border-divider py-2">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[10px] font-bold text-accent">{topic.name}</span>
        <span className="text-[10px] text-muted">topic/{topic.id}</span>
        {!fetchError && (
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={`ml-auto ${SELECT_CLS}`}>
            {[1, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
      </div>
      {loading ? <Skeleton count={limit} /> : fetchError ? null : (
        <div className="flex flex-col divide-y divide-divider">
          {questions.map((q) => (
            <div key={q.id} className="py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted truncate">{q.heat}</span>
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  <VietnameseButton
                    status={viStates[q.id]?.status ?? 'none'}
                    onGenerate={() => onStartVietnamese(q)}
                    onView={() => onViewVietnamese(q)}
                    onRefresh={() => onRefreshVietnamese(q)}
                    onCancel={() => onCancelVietnamese(q.id)}
                  />
                  <OriginThreadsButton
                    status={originStates[q.id]?.status ?? 'none'}
                    onGenerate={() => onStartOrigin(q)}
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

export function ZhihuHotList() {
  const [originStates, setOriginStates] = useState<Record<string, PostEntry>>({});
  const [viewingOrigin, setViewingOrigin] = useState<ZhihuQuestion | null>(null);
  const [viStates, setViStates] = useState<Record<string, PostEntry>>({});
  const [viewingVi, setViewingVi] = useState<ZhihuQuestion | null>(null);
  const viControllersRef = useRef<Record<string, TranslationRequest>>({});
  const [topics, setTopics] = useState<ZhihuTopic[]>([]);
  const [defaultTopicLimit, setDefaultTopicLimit] = useState(3);
  const [topicManagerOpen, setTopicManagerOpen] = useState(false);

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
    fetch('/api/zhihu/topics', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { topics?: ZhihuTopic[] }) => setTopics(data.topics ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch('/api/section-preferences', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { zhihuTopicDefaultPostLimit?: number }) => {
        setDefaultTopicLimit(data.zhihuTopicDefaultPostLimit ?? 3);
      })
      .catch(() => undefined);
  }, []);

  const fetchOrigin = useCallback(async (question: ZhihuQuestion) => {
    const id = question.id;
    setOriginStates((prev) => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const res = await fetch('/api/zhihu/origin', {
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

  const cancelVietnamese = useCallback((questionId: string) => {
    const request = viControllersRef.current[questionId];
    if (!request) return;
    request.controller.abort();
    void fetch('/api/codex/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: request.jobId }),
    });
  }, []);

  const fetchVietnamese = useCallback(async (question: ZhihuQuestion, refresh = false) => {
    const id = question.id;
    cancelVietnamese(id);
    const controller = new AbortController();
    const jobId = `zhihu_vi_${id}_${Date.now()}`;
    viControllersRef.current[id] = { controller, jobId };
    setViStates((prev) => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const res = await fetch('/api/zhihu/vietnamese', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: id, title: question.title, refresh, translationJobId: jobId }),
        signal: controller.signal,
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setViStates((prev) => ({ ...prev, [id]: { status: 'ready', blocks: res.blocks } }));
      setViewingVi(question);
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

  const saveTopics = useCallback(async (next: ZhihuTopic[]) => {
    setTopics(next);
    try {
      const data = await fetch('/api/zhihu/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics: next }),
      }).then((r) => r.json()) as { topics?: ZhihuTopic[] };
      if (data.topics) setTopics(data.topics);
    } catch {
      // Keep the optimistic UI; the next page load will re-sync from the DB.
    }
  }, []);

  const addTopic = useCallback((topic: ZhihuTopic) => {
    if (topics.some((item) => item.id === topic.id)) return;
    void saveTopics([...topics, topic]);
  }, [saveTopics, topics]);

  const removeTopic = useCallback((topicId: string) => {
    void saveTopics(topics.filter((topic) => topic.id !== topicId));
  }, [saveTopics, topics]);

  return (
    <>
      <div className="card h-full">
        <div className="section-label" lang="zh-CN">
          Zhihu topics
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setTopicManagerOpen(true)}
              title="Manage Zhihu topics"
              className="rounded-md bg-surface border border-divider px-2 py-0.5 text-[11px] font-semibold text-muted hover:text-primary transition-colors cursor-pointer"
            >
              topics
            </button>
            <SettingsButton section="zhihu" label="Zhihu topics" />
          </div>
        </div>

        {topics.length === 0 ? (
          <p className="border-t-2 border-divider py-4 text-xs text-muted">
            No Zhihu topics listed.
          </p>
        ) : topics.map((topic) => (
          <ZhihuTopicSection
            key={topic.id}
            topic={topic}
            defaultLimit={defaultTopicLimit}
            originStates={originStates}
            viStates={viStates}
            onStartOrigin={fetchOrigin}
            onViewOrigin={setViewingOrigin}
            onStartVietnamese={(question) => fetchVietnamese(question)}
            onViewVietnamese={setViewingVi}
            onRefreshVietnamese={(question) => fetchVietnamese(question, true)}
            onCancelVietnamese={cancelVietnamese}
          />
        ))}
      </div>

      {topicManagerOpen && (
        <ZhihuTopicManagerDialog
          topics={topics}
          onAdd={addTopic}
          onRemove={removeTopic}
          onClose={() => setTopicManagerOpen(false)}
        />
      )}

      {viewingOrigin && originStates[viewingOrigin.id]?.blocks && (
        <PostDialog
          blocks={originStates[viewingOrigin.id].blocks!}
          title={viewingOrigin.title}
          sourceLabel="Zhihu topics"
          postLanguage={PostLanguage.English}
          contentLang="zh-CN"
          onClose={() => setViewingOrigin(null)}
        />
      )}

      {viewingVi && viStates[viewingVi.id]?.blocks && (
        <PostDialog
          blocks={viStates[viewingVi.id].blocks!}
          title={viewingVi.title}
          sourceLabel="Zhihu topics - vietnamese"
          postLanguage={PostLanguage.Vietnamese}
          onClose={() => setViewingVi(null)}
        />
      )}
    </>
  );
}
