import { NextRequest, NextResponse } from 'next/server';
import { getRedditPostAndComments } from '@/lib/reddit';
import type { ThreadsBlock } from '@/lib/parseThreadsPost';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { postId, subreddit, title } = await req.json() as { postId: string; subreddit: string; title: string };

  if (!postId || !subreddit) {
    return NextResponse.json({ error: 'Missing postId or subreddit' }, { status: 400 });
  }

  try {
    const { post, comments, top2Replies } = await getRedditPostAndComments(subreddit, postId);

    const body = post?.selftext?.trim().replace(/\n{3,}/g, '\n\n') ?? '';

    const blocks: ThreadsBlock[] = [
      { text: body ? `${title}\n\n${body}` : title, author: `u/${post.author}`, score: 0, isMain: true, createdAt: post.created_utc },
      ...comments.flatMap((c, i) => [
        { text: c.body.trim().replace(/\n{3,}/g, '\n\n'), author: `u/${c.author}`, score: c.score, isMain: false, createdAt: c.createdAt },
        ...top2Replies
          .filter((r) => r.parentIdx === i)
          .map((r) => ({ text: r.body.trim().replace(/\n{3,}/g, '\n\n'), author: `u/${r.author}`, score: r.score, isMain: false, isReply: true, createdAt: r.createdAt })),
      ]),
    ];

    return NextResponse.json({ blocks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch' },
      { status: 500 },
    );
  }
}
