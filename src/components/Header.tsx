'use client';

import { useClock } from '@/hooks/useClock';

export default function Header() {
  const now = useClock();

  const dateStr = now?.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now?.toLocaleTimeString('vi-VN');

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-surface border border-divider rounded-card">
      <div className="text-2xl font-bold tracking-tight">
        My<span className="text-accent">News</span>{' '}
        <span className="text-lg">📰</span>
      </div>
      <div className="text-sm text-muted tabular-nums">
        {dateStr && timeStr ? `${dateStr}  •  ${timeStr}` : ''}
      </div>
    </header>
  );
}
