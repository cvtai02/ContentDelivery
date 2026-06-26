import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

type ThreadsMediaItem = {
  type: 'image' | 'video';
  imageUrl: string | null;
  videoUrl: string | null;
  width: number;
  height: number;
};

type ThreadsMedia = {
  type: 'image' | 'video' | 'carousel';
  items: ThreadsMediaItem[];
} | null;

type PostBlock = {
  text: string;
  isMain: boolean;
  author?: string;
  avatarUrl?: string;
  score?: number;
  createdAt?: number;
  media?: ThreadsMedia;
};

type ScrapeResult = {
  blocks: PostBlock[];
  post: {
    username: string;
    fullName: string;
    text: string;
    likeCount: number;
    replyCount: number;
    repostCount: number;
    takenAt: number;
    profilePicUrl: string;
    isVerified: boolean;
    code: string;
    media: ThreadsMedia;
  };
  replyCount: number;
};

const THREADS_URL_RE = /threads\.(net|com)\/@[\w.]+\/post\/[\w-]+/;
const TOP_COMMENTS = 5;

function sortedComments(blocks: PostBlock[]) {
  return blocks
    .filter((b) => !b.isMain)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export default function ThreadsPage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<ScrapeResult | null>(null);

  const scrape = useMutation({
    mutationFn: async (threadsUrl: string) => {
      const res = await apiFetch('/api/threads/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: threadsUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scrape failed');
      return data as ScrapeResult;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Scraped ${data.replyCount} replies`);
    },
  });

  const render = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error('No scrape result');
      const main = result.blocks.find((b) => b.isMain);
      const top = sortedComments(result.blocks).slice(0, TOP_COMMENTS);
      const blocks = [main, ...top]
        .filter(Boolean)
        .map((b) => ({ text: b!.text, author: b!.author }));

      const res = await apiFetch('/api/zhihugen/render', {
        method: 'POST',
        body: JSON.stringify({
          blocks,
          title: `@${result.post.username}`,
          previewBeforeUpload: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Render failed');
      return data as { jobId?: string; absolutePath?: string };
    },
    onSuccess: (data) => {
      if (data.jobId) {
        toast.success(`Render job started: ${data.jobId}`);
      } else {
        toast.success('Render complete');
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!THREADS_URL_RE.test(url)) {
      toast.error('Invalid Threads URL');
      return;
    }
    scrape.mutate(url);
  }

  const comments = result ? sortedComments(result.blocks) : [];

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Threads Scraper</h1>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://threads.net/@user/post/..."
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={scrape.isPending}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {scrape.isPending ? 'Scraping...' : 'Scrape'}
          </button>
        </form>

        {result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-semibold text-card-foreground">
                  @{result.post.username}
                </span>
                <span className="text-xs text-muted-foreground">
                  {result.post.likeCount} likes · {result.replyCount} replies
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-card-foreground">
                {result.post.text}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Comments · sorted by likes · top {Math.min(TOP_COMMENTS, comments.length)} sent to render
              </h2>
              <button
                onClick={() => render.mutate()}
                disabled={render.isPending || comments.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {render.isPending ? 'Rendering...' : `Render Video (${Math.min(TOP_COMMENTS, comments.length)} comments)`}
              </button>
            </div>

            {comments.map((block, i) => (
              <div
                key={i}
                className={`rounded-lg border p-4 ${i < TOP_COMMENTS ? 'border-primary/30 bg-card' : 'border-border bg-card/50 opacity-60'}`}
              >
                <div className="mb-1 flex items-center gap-2">
                  {i < TOP_COMMENTS && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                  )}
                  {block.author && (
                    <span className="text-sm font-medium text-card-foreground">
                      @{block.author}
                    </span>
                  )}
                  {block.score != null && (
                    <span className="text-xs text-muted-foreground">{block.score} likes</span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm text-card-foreground">{block.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
