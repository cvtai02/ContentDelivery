'use client';

import { useCallback, useState } from 'react';
import { ThreadsDialog } from '@/components/shared/ThreadsDialog';
import type { ThreadsBlock } from '@/lib/parseThreadsPost';

export type ThreadsEntry = { status: 'loading' | 'ready' | 'error'; blocks?: ThreadsBlock[] };

export function useThreads() {
  const [threadsStates, setThreadsStates] = useState<Record<string, ThreadsEntry>>({});
  const [viewingThreads, setViewingThreads] = useState<{ id: string; title: string } | null>(null);

  const startThreads = useCallback(async (id: string, title: string, endpoint: string, body: object) => {
    setThreadsStates((prev) => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setThreadsStates((prev) => ({ ...prev, [id]: { status: 'ready', blocks: data.blocks } }));
      setViewingThreads({ id, title });
    } catch {
      setThreadsStates((prev) => ({ ...prev, [id]: { status: 'error' } }));
    }
  }, []);

  const dialog = viewingThreads && threadsStates[viewingThreads.id]?.status === 'ready' ? (
    <ThreadsDialog
      blocks={threadsStates[viewingThreads.id].blocks!}
      title={viewingThreads.title}
      onClose={() => setViewingThreads(null)}
    />
  ) : null;

  return { threadsStates, startThreads, setViewingThreads, dialog };
}
