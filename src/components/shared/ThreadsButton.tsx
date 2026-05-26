'use client';

import { ThreadsIcon } from '@/components/shared/ThreadsIcon';

type Status = 'none' | 'loading' | 'ready' | 'error';

type Props = { status: Status; onGenerate: () => void; onView: () => void };

export function ThreadsButton({ status, onGenerate, onView }: Props) {
  if (status === 'loading') {
    return <span className="shrink-0 text-[11px] text-muted">Đang tải...</span>;
  }
  if (status === 'ready') {
    return (
      <button
        onClick={onView}
        className="shrink-0 rounded-lg bg-surface border border-divider px-2 py-0.5 text-[11px] font-semibold text-muted hover:text-primary transition-colors cursor-pointer"
      >
        Xem Threads
      </button>
    );
  }
  if (status === 'error') {
    return (
      <button
        onClick={onGenerate}
        className="shrink-0 rounded-lg bg-fall/10 px-2 py-0.5 text-[11px] font-semibold text-fall hover:bg-fall/20 transition-colors cursor-pointer"
      >
        Thử lại
      </button>
    );
  }
  return (
    <button
      onClick={onGenerate}
      className="shrink-0 rounded-lg bg-surface border border-divider px-2 py-0.5 text-[11px] font-semibold text-muted hover:text-primary transition-colors cursor-pointer"
    >
      <ThreadsIcon />
    </button>
  );
}
