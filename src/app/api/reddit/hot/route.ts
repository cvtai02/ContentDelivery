import { NextRequest, NextResponse } from 'next/server';
import { getHotPosts } from '@/lib/reddit';

const SUBREDDIT_RE = /^[A-Za-z0-9_]{2,21}$/;

export async function GET(req: NextRequest) {
  const subreddit = req.nextUrl.searchParams.get('subreddit') ?? 'AskReddit';

  if (!SUBREDDIT_RE.test(subreddit)) {
    return NextResponse.json(
      { error: 'Invalid subreddit' },
      { status: 400 },
    );
  }

  const t = req.nextUrl.searchParams.get('t') ?? 'hot';
  const limit = Math.min(25, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? '3')));

  try {
    const posts = await getHotPosts(subreddit, { t, limit });

    return NextResponse.json({
      subreddit,
      posts,
    });
  } catch {
    return NextResponse.json(
      { error: 'Cannot fetch Reddit posts' },
      { status: 500 },
    );
  }
}
