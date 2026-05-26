import { withCache } from '@/lib/cache';

const REDDIT_UA = 'Hot-post-every-day/1.0 by cvtai105';

// ── Hot posts (for listing) ────────────────────────────────────────────────

type RedditListingResponse = {
  data: {
    children: Array<{
      data: {
        id: string;
        title: string;
        author: string;
        score: number;
        num_comments: number;
        permalink: string;
        thumbnail?: string;
        created_utc: number;
      };
    }>;
  };
};

export type RedditHotPost = {
  id: string;
  title: string;
  author: string;
  score: number;
  comments: number;
  url: string;
  thumbnail: string | null;
  createdUtc: number;
};

export async function getHotPosts(subreddit: string, { t = 'hot', limit = 3 }: { t?: string; limit?: number } = {}): Promise<RedditHotPost[]> {
  return withCache(`reddit_${subreddit}_${t}_${limit}`, 60 * 60 * 1000, async () => {
    const endpoint = t === 'hot' ? 'hot' : 'top';
    const params = new URLSearchParams({ limit: String(limit) });
    if (t !== 'hot') params.set('t', t);

    const res = await fetch(
      `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/${endpoint}.json?${params}`,
      { headers: { 'User-Agent': REDDIT_UA } },
    );

    if (!res.ok) throw new Error(`Failed to fetch Reddit posts: ${res.status}`);

    const data = (await res.json()) as RedditListingResponse;

    return data.data.children.map((item) => {
      const post = item.data;
      return {
        id: post.id,
        title: post.title,
        author: post.author,
        score: post.score,
        comments: post.num_comments,
        url: `https://reddit.com${post.permalink}`,
        thumbnail: post.thumbnail?.startsWith('http') ? post.thumbnail : null,
        createdUtc: post.created_utc,
      };
    });
  });
}

// ── Post + comments (for compose / threads) ────────────────────────────────

type RawThing = { kind: string; data: { author: string; body: string; score: number; created_utc: number } };
type RawComment = {
  kind: string;
  data: {
    author: string;
    body: string;
    score: number;
    created_utc: number;
    replies: { data: { children: RawThing[] } } | '';
  };
};

export type RedditComment = { author: string; body: string; score: number; createdAt: number };
export type RedditReply = RedditComment & { parentIdx: number };

export async function getRedditPostAndComments(subreddit: string, postId: string) {
  const res = await fetch(
    `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=10&sort=top`,
    { headers: { 'User-Agent': REDDIT_UA } },
  );
  if (!res.ok) throw new Error(`Reddit API error: ${res.status}`);

  const [postListing, commentsListing] = await res.json() as [
    { data: { children: [{ data: { title: string; selftext: string; author: string; created_utc: number } }] } },
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
          .map((r) => ({ author: r.data.author, body: r.data.body, score: r.data.score, createdAt: r.data.created_utc, parentIdx: idx }))
      : [],
  );

  return {
    post,
    comments: rawComments.map((c) => ({ author: c.data.author, body: c.data.body, score: c.data.score, createdAt: c.data.created_utc })),
    top2Replies: allReplies.sort((a, b) => b.score - a.score).slice(0, 2) as RedditReply[],
  };
}
