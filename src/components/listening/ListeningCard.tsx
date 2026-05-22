'use client';

import { useState } from 'react';
import { TRACKS, MOODS } from '@/data/tracks';
import type { Mood, Track } from '@/data/tracks';

function YoutubePlayer({ track }: { track: Track }) {
  const isLive = track.duration === 'Live';
  const src = `https://www.youtube.com/embed/${track.youtubeId}?autoplay=0&rel=0&modestbranding=1${isLive ? '&start=0' : ''}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full rounded-xl overflow-hidden bg-panel" style={{ aspectRatio: '16/9' }}>
        <iframe
          key={track.youtubeId}
          src={src}
          title={track.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
      <div>
        <p className="font-semibold text-sm leading-tight">{track.title}</p>
        <p className="text-muted text-xs mt-0.5">{track.artist}</p>
      </div>
    </div>
  );
}

function TrackRow({
  track,
  active,
  onClick,
}: {
  track: Track;
  active: boolean;
  onClick: () => void;
}) {
  const mood = MOODS.find((m) => m.key === track.mood)!;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer border-none ${
        active
          ? 'bg-accent/20 ring-1 ring-accent'
          : 'bg-surface hover:bg-divider'
      }`}
    >
      <span className="text-lg shrink-0">{mood.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${active ? 'text-accent' : 'text-primary'}`}>
          {track.title}
        </p>
        <p className="text-xs text-muted truncate">{track.artist}</p>
      </div>
      <span className="text-[11px] text-muted shrink-0 tabular-nums">{track.duration}</span>
    </button>
  );
}

export default function ListeningCard() {
  const [mood, setMood]       = useState<Mood>('lofi');
  const [selected, setSelected] = useState<Track>(TRACKS.find((t) => t.mood === 'lofi')!);

  const filtered = TRACKS.filter((t) => t.mood === mood);

  function switchMood(m: Mood) {
    setMood(m);
    const first = TRACKS.find((t) => t.mood === m);
    if (first) setSelected(first);
  }

  return (
    <div className="card">
      <div className="section-label">🎧 Hôm nay nghe gì</div>

      {/* Mood tabs */}
      <div className="flex gap-1.5">
        {MOODS.map(({ key, label, icon, color }) => (
          <button
            key={key}
            onClick={() => switchMood(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold
                        transition-all cursor-pointer border-none ${
              mood === key
                ? `bg-panel ${color} ring-1 ring-divider`
                : 'bg-surface text-muted hover:text-primary'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Main layout: player left, list right */}
      <div className="grid grid-cols-12 gap-4 mt-1">
        {/* Player */}
        <div className="col-span-12 lg:col-span-7">
          <YoutubePlayer track={selected} />
        </div>

        {/* Track list */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1">
          {filtered.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              active={selected.id === track.id}
              onClick={() => setSelected(track)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
