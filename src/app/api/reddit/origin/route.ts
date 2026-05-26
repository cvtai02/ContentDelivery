import { NextRequest, NextResponse } from 'next/server';
import { fetchRedditThreads } from '@/lib/reddit-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { postId, subreddit, title } = await req.json() as { postId: string; subreddit: string; title: string };

  if (!postId || !subreddit) {
    return NextResponse.json({ error: 'Missing postId or subreddit' }, { status: 400 });
  }

  try {
    const { blocks } = await fetchRedditThreads(postId, subreddit, title);
    return NextResponse.json({ blocks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch' },
      { status: 500 },
    );
  }
}
