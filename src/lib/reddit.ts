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
  const endpoint = t === 'hot' ? 'hot' : 'top';
  const params = new URLSearchParams({ limit: String(limit) });
  if (t !== 'hot') params.set('t', t);

  const res = await fetch(
    `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/${endpoint}.json?${params}`,
    {
      headers: {
        'User-Agent': 'Hot-post-every-day/1.0 by cvtai105',
      },
      next: {
        revalidate: 18000,
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch Reddit posts: ${res.status}`);
  }

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
}
