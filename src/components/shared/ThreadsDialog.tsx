'use client';

import { useCallback } from 'react';
import { ThreadsPreview } from '@/components/shared/ThreadsPreview';
import type { ThreadsBlock } from '@/lib/parseThreadsPost';

type Props = {
  blocks: ThreadsBlock[];
  title: string;
  onClose: () => void;
};

export function ThreadsDialog({ blocks, title, onClose }: Props) {
  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdrop}
    >
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-panel shadow-2xl max-h-[90vh]">
        <div className="flex items-center gap-3 p-6 pb-0">
          <p className="flex-1 line-clamp-2 text-sm font-semibold text-primary min-w-0">{title}</p>
          <button
            onClick={onClose}
            className="shrink-0 text-muted hover:text-primary cursor-pointer bg-transparent border-none text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <ThreadsPreview blocks={blocks} />
        </div>

        <div className="flex justify-end p-6 pt-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary cursor-pointer bg-transparent"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
