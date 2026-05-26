import { getRedditPostAndComments } from '@/lib/reddit';
import { getRedditAvatar, getDiceBearAvatar } from '@/lib/avatar';
import type { PostBlock } from '@/lib/parseThreadsPost';
import type { RedditContentDto, RedditMeta } from '@/lib/reddit-format';

export type { RedditContentDto, RedditMeta } from '@/lib/reddit-format';
export { formatFacebookPost } from '@/lib/reddit-format';

const MEDIA_EMBED_RE = /!\[[^\]]*\]\([^)]*\)/;

function hasMediaEmbed(text: string): boolean {
  return MEDIA_EMBED_RE.test(text);
}

function cleanText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/&#x200B;/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeBody(text: string): string {
  return text.trim().replace(/\n{3,}/g, '\n\n');
}


export async function fetchRedditThreads(
  postId: string,
  subreddit: string,
  title: string,
): Promise<{ blocks: PostBlock[]; contentDto: RedditContentDto; meta: RedditMeta }> {
  const { post, comments, top2Replies } = await getRedditPostAndComments(subreddit, postId);

  const uniqueAuthors = [
    ...new Set(
      [post.author, ...comments.map((c) => c.author), ...top2Replies.map((r) => r.author)].filter(Boolean),
    ),
  ] as string[];

  const avatarMap = new Map<string, string>();
  await Promise.all(
    uniqueAuthors.map(async (author) => {
      avatarMap.set(author, (await getRedditAvatar(author)) ?? (await getDiceBearAvatar(author)));
    }),
  );

  const body = cleanText(post?.selftext ?? '');

  // Preserve original indices so top2Replies parentIdx stays valid after filtering
  const filteredComments = comments
    .map((c, originalIdx) => ({ ...c, originalIdx }))
    .filter((c) => !hasMediaEmbed(c.body));

  const blocks: PostBlock[] = [
    {
      text: body ? `${title}\n\n${body}` : title,
      author: `${post.author}`,
      avatarUrl: avatarMap.get(post.author),
      score: post.score,
      isMain: true,
      createdAt: post.created_utc,
    },
    ...filteredComments.flatMap((c) => [
      {
        text: cleanText(c.body),
        author: `${c.author}`,
        avatarUrl: avatarMap.get(c.author),
        score: c.score,
        isMain: false,
        createdAt: c.createdAt,
      },
      ...top2Replies
        .filter((r) => r.parentIdx === c.originalIdx && !hasMediaEmbed(r.body) && r.score >= c.score * 0.6)
        .map((r) => ({
          text: cleanText(r.body),
          author: `${r.author}`,
          avatarUrl: avatarMap.get(r.author),
          score: r.score,
          isMain: false,
          isReply: true as const,
          createdAt: r.createdAt,
        })),
    ]),
  ];

  const contentDto: RedditContentDto = {
    title,
    body: normalizeBody(post?.selftext ?? ''),
    comments: filteredComments.map((c) => ({
      text: normalizeBody(c.body),
      replies: top2Replies
        .filter((r) => r.parentIdx === c.originalIdx && !hasMediaEmbed(r.body) && r.score >= c.score * 0.6)
        .map((r) => normalizeBody(r.body)),
    })),
  };

  const meta: RedditMeta = {
    postAuthor: post.author,
    postScore: post.score,
    comments: filteredComments.map((c) => ({
      author: c.author,
      score: c.score,
      replies: top2Replies
        .filter((r) => r.parentIdx === c.originalIdx && !hasMediaEmbed(r.body) && r.score >= c.score * 0.6)
        .map((r) => ({ author: r.author, score: r.score })),
    })),
  };

  return { blocks, contentDto, meta };
}
