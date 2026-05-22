import { NextRequest, NextResponse } from 'next/server';
import { getHotPosts } from '@/lib/reddit';

const ALLOWED_SUBREDDITS = ['antiwork', 'AskReddit', 'confession', 'AmItheAsshole', 'tifu', 'relationship_advice', 'personalfinance', 'legaladvice', 'raisedbynarcissists', 'JUSTNOMIL', 'travel'] as const;

export async function GET(req: NextRequest) {
  const subreddit = req.nextUrl.searchParams.get('subreddit') ?? 'AskReddit';

  if (!ALLOWED_SUBREDDITS.includes(subreddit as (typeof ALLOWED_SUBREDDITS)[number])) {
    return NextResponse.json(
      { error: 'Subreddit not allowed' },
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
