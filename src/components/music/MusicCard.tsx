'use client';

import { useState } from 'react';
import { MUSIC_CHARTS } from '@/data/music';
import type { MusicTab, Track } from '@/types/music';

const TABS: { key: MusicTab; label: string }[] = [
  { key: 'tiktok-vn',     label: '🇻🇳 TikTok VN'     },
  { key: 'tiktok-global', label: '🌐 TikTok Global'   },
  { key: 'douyin',        label: '抖音 Douyin'         },
];

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function TrackRow({ track, rank }: { track: Track; rank: number }) {
  const medal = rank < 3 ? RANK_MEDALS[rank] : undefined;

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-surface rounded-xl hover:bg-divider transition-colors cursor-default">
      {/* Rank */}
      <span
        className={`w-6 text-center shrink-0 text-sm ${
          medal ? 'text-warn' : 'text-muted'
        }`}
      >
        {medal ?? rank + 1}
      </span>

      {/* Cover */}
      <div className="w-10 h-10 shrink-0 bg-panel rounded-lg flex items-center justify-center text-xl">
        {track.emoji}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">
          {track.name}{' '}
          {track.hot && (
            <span className="text-[10px] font-bold text-hot">🔥 HOT</span>
          )}
        </p>
        <p className="text-[11px] text-muted truncate">{track.artist}</p>
      </div>

      {/* Plays */}
      <span className="text-xs font-semibold text-accent shrink-0">{track.plays}</span>
    </div>
  );
}

export default function MusicCard() {
  const [active, setActive] = useState<MusicTab>('tiktok-vn');
  const tracks: Track[] = MUSIC_CHARTS[active];

  return (
    <div className="card h-full">
      <div className="section-label">🎵 Hot Music Charts</div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-surface rounded-xl p-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`chip-tab ${active === key ? 'active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="flex flex-col gap-1.5">
        {tracks.map((track, i) => (
          <TrackRow key={`${track.name}-${i}`} track={track} rank={i} />
        ))}
      </div>
    </div>
  );
}
