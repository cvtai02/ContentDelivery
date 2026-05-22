import { NextRequest, NextResponse } from 'next/server';
import { runCodex } from '@/lib/codex';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const USER_AGENT = 'Hot-post-every-day/1.0 by cvtai105';

type RawThing = { kind: string; data: { author: string; body: string; score: number } };

type RawComment = {
  kind: string;
  data: {
    author: string;
    body: string;
    score: number;
    replies: { data: { children: RawThing[] } } | '';
  };
};

async function fetchPostAndComments(subreddit: string, postId: string) {
  const res = await fetch(
    `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=10&sort=top`,
    { headers: { 'User-Agent': USER_AGENT } },
  );
  if (!res.ok) throw new Error(`Reddit API error: ${res.status}`);

  const [postListing, commentsListing] = await res.json() as [
    { data: { children: [{ data: { title: string; selftext: string } }] } },
    { data: { children: RawComment[] } },
  ];

  const post = postListing.data.children[0]?.data;
  const rawComments = commentsListing.data.children
    .filter((c) => c.kind === 't1' && c.data.body !== '[deleted]' && c.data.body !== '[removed]' && c.data.score >= 100)
    .slice(0, 10);

  const allReplies = rawComments.flatMap((c, idx) =>
    typeof c.data.replies === 'object'
      ? c.data.replies.data.children
          .filter((r) => r.kind === 't1' && r.data.body !== '[deleted]' && r.data.body !== '[removed]')
          .map((r) => ({ author: r.data.author, body: r.data.body, score: r.data.score, parentIdx: idx }))
      : [],
  );

  const top2Replies = allReplies
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const comments = rawComments.map((c) => ({
    author: c.data.author,
    body: c.data.body,
    score: c.data.score,
  }));

  return { post, comments, top2Replies };
}

export async function POST(req: NextRequest) {
  const { postId, subreddit, title } = await req.json() as { postId: string; subreddit: string; title: string };

  if (!postId || !subreddit) {
    return NextResponse.json({ error: 'Missing postId or subreddit' }, { status: 400 });
  }

  try {
    const { post, comments, top2Replies } = await fetchPostAndComments(subreddit, postId);

    const lines: string[] = [];

    const body = post?.selftext?.trim().replace(/\n{3,}/g, '\n\n');
    lines.push(body ? `${title}\n\n${body}` : title);

    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      const commentBody = c.body.trim().replace(/\n{3,}/g, '\n\n');
      const parts = [`Comment ${i + 1}. ${c.author} - ${c.score} likes.\n${commentBody}`];

      for (const r of top2Replies.filter((r) => r.parentIdx === i)) {
        const replyBody = r.body.trim().replace(/\n{3,}/g, '\n\n');
        parts.push(`\n  ↳ ${r.author} - ${r.score} likes: ${replyBody}`);
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
