'use client';

type Status = 'none' | 'loading' | 'ready' | 'error';

type Props = {
  status: Status;
  onGenerate: () => void;
  onView: () => void;
  onRefresh?: () => void;
  onCancel?: () => void;
};

export function VietnameseButton({ status, onGenerate, onView, onRefresh, onCancel }: Props) {
  if (status === 'loading') {
    return (
      <span className="shrink-0 inline-flex items-center gap-1">
        <span className="text-[11px] text-muted">translating...</span>
        {onCancel && (
          <button
            onClick={onCancel}
            title="Cancel translation"
            className="rounded-md border border-fall/30 bg-fall/10 px-1.5 py-0.5 text-[11px] font-semibold text-fall hover:bg-fall/20 transition-colors cursor-pointer"
          >
            cancel
          </button>
        )}
      </span>
    );
  }

  if (status === 'ready') {
    return (
      <span className="shrink-0 inline-flex items-center gap-0.5">
        <button
          onClick={onView}
          className="rounded-md bg-surface border border-divider px-2 py-0.5 text-[11px] font-semibold text-muted hover:text-primary transition-colors cursor-pointer"
        >
          vietnamese
        </button>
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Re-translate (bypass cache)"
            className="rounded-md bg-surface border border-divider px-1.5 py-0.5 text-[11px] text-muted hover:text-primary transition-colors cursor-pointer"
          >
            retry
          </button>
        )}
      </span>
    );
  }

  if (status === 'error') {
    return (
      <button
        onClick={onGenerate}
        className="shrink-0 rounded-md bg-fall/10 border border-fall/30 px-2 py-0.5 text-[11px] font-semibold text-fall hover:bg-fall/20 transition-colors cursor-pointer"
      >
        vietnamese
      </button>
    );
  }

  return (
    <button
      onClick={onGenerate}
      className="shrink-0 rounded-md bg-surface border border-divider px-2 py-0.5 text-[11px] font-semibold text-muted hover:text-primary transition-colors cursor-pointer"
    >
      vietnamese
    </button>
  );
}
