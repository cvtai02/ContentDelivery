'use client';

import { useState } from 'react';
import { useTrends } from '@/hooks/useTrends';
import type { TrendItem } from '@/types/trends';

function formatTraffic(raw: string): string {
  return raw || '—';
}

function TrackRow({ item, rank, last }: { item: TrendItem; rank: number; last: boolean }) {
  const rankColor =
    rank === 1 ? 'text-warn' :
    rank === 2 ? 'text-muted' :
    rank === 3 ? 'text-[#cd7f32]' :
                 'text-muted';

  return (
    <a
      href={`https://trends.google.com/trends/explore?geo=VN&q=${encodeURIComponent(item.title)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 py-2 hover:opacity-70 transition-opacity group ${!last ? 'border-b border-divider' : ''}`}
    >
      <span className={`w-4 text-center text-xs shrink-0 font-bold ${rankColor}`}>{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-primary group-hover:text-accent transition-colors">
          {item.title}
        </p>
      </div>
      <span className="text-xs font-bold text-rise shrink-0 tabular-nums">
        {formatTraffic(item.traffic)}
      </span>
    </a>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-surface animate-pulse" />
      ))}
    </div>
  );
}

export default function TrendsCard() {
  const { items, loading, error, refresh } = useTrends();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card h-full">
      <div className="section-label">
        📊 Google Trends · Việt Nam
        <span className="normal-case font-normal text-muted">Top tìm kiếm</span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto text-muted hover:text-primary transition-colors text-lg leading-none bg-transparent border-none cursor-pointer"
          title={expanded ? 'Thu gọn' : 'Mở rộng'}
        >
          <svg className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>

      {loading && <Skeleton />}

      {error && !loading && (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span className="text-3xl">😕</span>
          <p className="text-muted text-sm">Không tải được dữ liệu</p>
          <button
            onClick={refresh}
            className="text-xs text-accent hover:underline cursor-pointer bg-transparent border-none"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-muted text-sm text-center py-4">Không có dữ liệu</p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="flex flex-col overflow-y-auto">
          {(expanded ? items : items.slice(0, 3)).map((item, i, arr) => (
            <TrackRow key={item.title} item={item} rank={i + 1} last={i === arr.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
