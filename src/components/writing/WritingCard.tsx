'use client';

import { useMemo, useState } from 'react';
import { getDailyPrompts } from '@/data/writing-prompts';
import type { WritingCategory, WritingPrompt } from '@/data/writing-prompts';

const CATEGORIES: { key: WritingCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all',      label: 'Tất cả',    icon: '✦' },
  { key: 'blog',     label: 'Blog',      icon: '📝' },
  { key: 'social',   label: 'Social',    icon: '📢' },
  { key: 'creative', label: 'Sáng tác',  icon: '✍️'  },
  { key: 'journal',  label: 'Nhật ký',   icon: '📖' },
];

const CAT_COLORS: Record<WritingCategory, string> = {
  blog:     'text-accent   bg-[#1a1d3a]',
  social:   'text-rise     bg-[#0d2b23]',
  creative: 'text-hot      bg-[#2d0a1f]',
  journal:  'text-warn     bg-[#2d1f06]',
};

const CAT_BADGE: Record<WritingCategory, string> = {
  blog:     '📝 Blog',
  social:   '📢 Social',
  creative: '✍️ Sáng tác',
  journal:  '📖 Nhật ký',
};

export default function WritingCard() {
  const allPrompts     = useMemo(() => getDailyPrompts(), []);
  const [cat, setCat]  = useState<WritingCategory | 'all'>('all');
  const [idx, setIdx]  = useState(0);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);

  const filtered: WritingPrompt[] = cat === 'all'
    ? allPrompts
    : allPrompts.filter((p) => p.category === cat);

  const current = filtered[idx % filtered.length];

  function nextPrompt() {
    setIdx((i) => (i + 1) % filtered.length);
    setDraft('');
  }

  function switchCat(c: WritingCategory | 'all') {
    setCat(c);
    setIdx(0);
    setDraft('');
  }

  async function copyDraft() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const charCount = draft.length;

  return (
    <div className="card h-full">
      <div className="section-label">✦ Hôm nay viết gì</div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => switchCat(key)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              cat === key
                ? 'bg-accent text-white border-accent'
                : 'bg-transparent text-muted border-divider hover:border-muted'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Prompt card */}
      {current && (
        <div className={`rounded-xl p-4 flex flex-col gap-2 ${CAT_COLORS[current.category]}`}>
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-sm leading-snug text-primary flex-1">
              {current.prompt}
            </p>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_COLORS[current.category]}`}>
              {CAT_BADGE[current.category]}
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            💡 {current.hint}
          </p>
        </div>
      )}

      {/* Draft area */}
      <div className="flex flex-col gap-2 flex-1">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Bắt đầu viết tại đây..."
          className="w-full flex-1 min-h-[180px] bg-surface border border-divider rounded-xl p-4 text-sm text-primary
                     placeholder:text-muted outline-none resize-none focus:border-accent transition-colors leading-relaxed"
        />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted tabular-nums">
            {wordCount} từ · {charCount} ký tự
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={nextPrompt}
              className="px-3 py-1.5 text-xs font-semibold text-muted border border-divider rounded-lg
                         hover:border-muted hover:text-primary transition-all cursor-pointer bg-transparent"
            >
              ↻ Gợi ý khác
            </button>
            <button
              onClick={copyDraft}
              disabled={!draft}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border-none ${
                draft
                  ? 'bg-accent text-white hover:opacity-90'
                  : 'bg-surface text-muted cursor-not-allowed'
              }`}
            >
              {copied ? '✓ Đã copy' : '⎘ Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
