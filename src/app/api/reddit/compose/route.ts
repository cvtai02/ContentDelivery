import { NextRequest, NextResponse } from 'next/server';
import { fetchRedditThreads } from '@/lib/reddit-service';
// RedditMeta is part of the response shape — imported for clarity
import type { RedditContentDto } from '@/lib/reddit-service';
import { buildPrompt } from '@/lib/codex-prompts';
import { runCodex } from '@/lib/codex';
import { decodeHtmlEntities } from '@/lib/utils';
import { findImage } from '@/lib/find-image';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { postId, subreddit, title } = await req.json() as { postId: string; subreddit: string; title: string };

  if (!postId || !subreddit) {
    return NextResponse.json({ error: 'Missing postId or subreddit' }, { status: 400 });
  }

  try {
    const { contentDto: originalDto, meta } = await fetchRedditThreads(postId, subreddit, title);

    const [translatedRaw, imageUrl] = await Promise.all([
      runCodex(buildPrompt('reddit', JSON.stringify(originalDto)), process.cwd(), 120_000).then(decodeHtmlEntities),
      findImage(title),
    ]);

    const contentDto = JSON.parse(translatedRaw) as RedditContentDto;

    return NextResponse.json({ contentDto, meta, imageUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to compose' },
      { status: 500 },
    );
  }
}
