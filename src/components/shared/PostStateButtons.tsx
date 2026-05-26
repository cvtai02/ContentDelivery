'use client';

import type { PostStatus } from '@/types/post';

type Props = {
  state: PostStatus;
  onGenerate: () => void;
  onView: () => void;
};

export function PostStateButtons({ state, onGenerate, onView }: Props) {
  if (state === 'generating') {
    return <span className="ml-auto shrink-0 text-[11px] text-muted">Đang tạo...</span>;
  }
  if (state === 'ready') {
    return (
      <div className="ml-auto flex shrink-0 gap-1">
        <button onClick={onGenerate} className="rounded-lg bg-surface border border-divider px-2 py-0.5 text-[11px] font-semibold text-muted hover:text-primary transition-colors cursor-pointer">
          Tạo lại
        </button>
        <button onClick={onView} className="rounded-lg bg-accent px-2 py-0.5 text-[11px] font-semibold text-black hover:opacity-90 transition-opacity cursor-pointer">
          Xem bài viết
        </button>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <button onClick={onGenerate} className="ml-auto shrink-0 rounded-lg bg-fall/10 px-2 py-0.5 text-[11px] font-semibold text-fall hover:bg-fall/20 transition-colors cursor-pointer">
        Thử lại
      </button>
    );
  }
  return (
    <button onClick={onGenerate} className="ml-auto shrink-0 rounded-lg bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent hover:bg-accent/20 transition-colors cursor-pointer">
      Tạo bài viết
    </button>
  );
}
