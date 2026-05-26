'use client';

import { FacebookIcon } from '@/components/shared/FacebookIcon';

type Status = 'none' | 'generating' | 'ready' | 'error';

type Props = { status: Status; onGenerate: () => void; onView: () => void };

export function FacebookViButton({ status, onGenerate, onView }: Props) {
  if (status === 'generating') {
    return <span className="shrink-0 text-[11px] text-muted">Đang tạo...</span>;
  }
  if (status === 'ready') {
    return (
      <button
        onClick={onView}
        className="shrink-0 inline-flex items-center gap-1 rounded-md bg-[#1877F2]/10 border border-[#1877F2]/30 px-2 py-0.5 text-[11px] font-semibold text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors cursor-pointer"
      >
        <FacebookIcon size={11} /> vi
      </button>
    );
  }
  if (status === 'error') {
    return (
      <button
        onClick={onGenerate}
        className="shrink-0 inline-flex items-center gap-1 rounded-md bg-fall/10 border border-fall/30 px-2 py-0.5 text-[11px] font-semibold text-fall hover:bg-fall/20 transition-colors cursor-pointer"
      >
        <FacebookIcon size={11} /> vi
      </button>
    );
  }
  return (
    <button
      onClick={onGenerate}
      className="shrink-0 inline-flex items-center gap-1 rounded-md bg-surface border border-divider px-2 py-0.5 text-[11px] font-semibold text-muted hover:text-primary transition-colors cursor-pointer"
    >
      <FacebookIcon size={11} /> vi
    </button>
  );
}
