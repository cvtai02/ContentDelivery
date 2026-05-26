'use client';

import { useState } from 'react';
import { ThreadsDialog } from '@/components/shared/ThreadsDialog';
import type { PostBlock } from '@/lib/parseThreadsPost';

async function fetchDiceBearDataUrl(seed: string): Promise<string> {
  const url = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const buffer = await res.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch {
    return url;
  }
}

async function enrichWithAvatars(blocks: PostBlock[]): Promise<PostBlock[]> {
  const authors = [...new Set(blocks.filter(b => b.author && !b.avatarUrl).map(b => b.author!))];
  if (authors.length === 0) return blocks;
  const avatarMap = new Map<string, string>();
  await Promise.all(authors.map(async (a) => { avatarMap.set(a, await fetchDiceBearDataUrl(a)); }));
  return blocks.map(b => ({ ...b, avatarUrl: b.avatarUrl ?? (b.author ? avatarMap.get(b.author) : undefined) }));
}

type Props = {
  blocks: PostBlock[];
  title: string;
  disabled?: boolean;
};

export function ThreadsViewButton({ blocks, title, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [enrichedBlocks, setEnrichedBlocks] = useState<PostBlock[]>([]);

  async function handleOpen() {
    setEnrichedBlocks(await enrichWithAvatars(blocks));
    setOpen(true);
  }

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={disabled || blocks.length === 0}
        className="bg-transparent border-0 p-0.5 text-[11px] font-semibold text-muted hover:text-primary disabled:opacity-40 cursor-pointer transition-colors"
      >
        origin
      </button>
      {open && (
        <ThreadsDialog blocks={enrichedBlocks} title={title} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
