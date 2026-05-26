import { NextRequest, NextResponse } from 'next/server';
import { runCodex } from '@/lib/codex';
import { getRedditPostAndComments } from '@/lib/reddit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { postId, subreddit, title } = await req.json() as { postId: string; subreddit: string; title: string };

  if (!postId || !subreddit) {
    return NextResponse.json({ error: 'Missing postId or subreddit' }, { status: 400 });
  }

  try {
    const { post, comments, top2Replies } = await getRedditPostAndComments(subreddit, postId);

    const lines: string[] = [];
    const body = post?.selftext?.trim().replace(/\n{3,}/g, '\n\n');
    lines.push(body ? `${title}\n\n${body}` : title);

    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      const commentBody = c.body.trim().replace(/\n{3,}/g, '\n\n');
      const parts = [`---------\n${i + 1}. ${c.author} - ${c.score} likes.\n${commentBody}`];
      for (const r of top2Replies.filter((r) => r.parentIdx === i)) {
        parts.push(`\n  ↳ ${r.author} - ${r.score} likes: ${r.body.trim().replace(/\n{3,}/g, '\n\n')}`);
      }
      lines.push(parts.join('\n'));
    }

    const raw = lines.join('\n\n');
    const prompt = `Translate the following Reddit post and comments to Vietnamese. Keep the exact format and structure. Only translate the text — do not add, remove, or rewrite anything. Do NOT translate lines that start with "Comment" (e.g. "Comment 1. AuthorName - 123 likes." must stay unchanged).\n\n${raw}`;
    const content = await runCodex(prompt, process.cwd(), 120_000);

    return NextResponse.json({ content });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch post' },
      { status: 500 },
    );
  }
}
