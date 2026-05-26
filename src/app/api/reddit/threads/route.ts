import { NextRequest, NextResponse } from 'next/server';
import { getRedditPostAndComments } from '@/lib/reddit';
import { getRedditAvatar, getDiceBearAvatar } from '@/lib/avatar';
import type { ThreadsBlock } from '@/lib/parseThreadsPost';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getAvatarForUser(username: string): Promise<string> {
  return (await getRedditAvatar(username)) ?? (await getDiceBearAvatar(username));
}

const MEDIA_EMBED_RE = /!\[[^\]]*\]\([^)]*\)/;

function hasMediaEmbed(text: string): boolean {
  return MEDIA_EMBED_RE.test(text);
}

function cleanText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) → text
    .replace(/&#x200B;/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function POST(req: NextRequest) {
  const { postId, subreddit, title } = await req.json() as { postId: string; subreddit: string; title: string };

  if (!postId || !subreddit) {
    return NextResponse.json({ error: 'Missing postId or subreddit' }, { status: 400 });
  }

  try {
    const { post, comments, top2Replies } = await getRedditPostAndComments(subreddit, postId);

    const body = cleanText(post?.selftext ?? '');

    const uniqueAuthors = [...new Set([
      post.author,
      ...comments.map((c) => c.author),
      ...top2Replies.map((r) => r.author),
    ].filter(Boolean))] as string[];

    const avatarMap = new Map<string, string>();
    await Promise.all(
      uniqueAuthors.map(async (author) => {
        avatarMap.set(author, await getAvatarForUser(author));
      }),
    );

    const blocks: ThreadsBlock[] = [
      {
        text: body ? `${title}\n\n${body}` : title,
        author: `u/${post.author}`,
        avatarUrl: avatarMap.get(post.author),
        score: post.score,
        isMain: true,
        createdAt: post.created_utc,
      },
      ...comments.flatMap((c, i) => {
        if (hasMediaEmbed(c.body)) return [];
        return [
          {
            text: cleanText(c.body),
            author: `u/${c.author}`,
            avatarUrl: avatarMap.get(c.author),
            score: c.score,
            isMain: false,
            createdAt: c.createdAt,
          },
          ...top2Replies
            .filter((r) => r.parentIdx === i && !hasMediaEmbed(r.body) && r.score >= c.score * 0.6)
            .map((r) => ({
              text: cleanText(r.body),
              author: `u/${r.author}`,
              avatarUrl: avatarMap.get(r.author),
              score: r.score,
              isMain: false,
              isReply: true,
              createdAt: r.createdAt,
            })),
        ];
      }),
    ];

    return NextResponse.json({ blocks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch' },
      { status: 500 },
    );
  }
}
