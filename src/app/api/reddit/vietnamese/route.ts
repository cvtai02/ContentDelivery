import { NextRequest, NextResponse } from 'next/server';
import { fetchRedditThreads } from '@/lib/reddit-service';
import { applyTranslation } from '@/lib/reddit-format';
import type { RedditContentDto } from '@/lib/reddit-format';
import type { PostBlock } from '@/lib/parseThreadsPost';
import { buildPrompt } from '@/lib/codex-prompts';
import { runCodex } from '@/lib/codex';
import { mergeAbortSignals, registerCodexJob, unregisterCodexJob } from '@/lib/codex-jobs';
import { decodeHtmlEntities } from '@/lib/utils';
import { withCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { postId, subreddit, title, refresh, translationJobId } = await req.json() as {
    postId: string;
    subreddit: string;
    title: string;
    refresh?: boolean;
    translationJobId?: string;
  };

  if (!postId || !subreddit) {
    return NextResponse.json({ error: 'Missing postId or subreddit' }, { status: 400 });
  }

  const jobController = registerCodexJob(translationJobId);
  const signal = mergeAbortSignals(req.signal, jobController?.signal);

  try {
    const translate = async () => {
      const { blocks, contentDto } = await fetchRedditThreads(postId, subreddit, title);
      const translatedRaw = await runCodex(
        buildPrompt('reddit', JSON.stringify(contentDto)),
        process.cwd(),
        120_000,
        signal,
      ).then(decodeHtmlEntities);
      const translatedDto = JSON.parse(translatedRaw) as RedditContentDto;
      return applyTranslation(blocks, translatedDto);
    };

    const blocks = refresh
      ? await translate()
      : await withCache<PostBlock[]>(`reddit_vi_${postId}`, 30 * 60 * 1000, translate);

    return NextResponse.json({ blocks });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Translation cancelled' }, { status: 499 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to translate' },
      { status: 500 },
    );
  } finally {
    unregisterCodexJob(translationJobId, jobController);
  }
}
