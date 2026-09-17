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
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
  shareCount?: number;
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

type PreviewState = {
  jobId: string;
  status: 'waiting' | 'ready' | 'uploading' | 'done';
  absolutePath?: string;
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
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [cardImages, setCardImages] = useState<string[] | null>(null);

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
      setPreview(null);
      setCardImages(null);
      toast.success(`Scraped ${data.replyCount} replies`);
    },
  });

  const previewCards = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error('No scrape result');
      const main = result.blocks.find((b) => b.isMain);
      const top = sortedComments(result.blocks).slice(0, TOP_COMMENTS);
      const blocks = [main, ...top]
        .filter(Boolean)
        .map((b) => ({ text: b!.text, author: b!.author, isMain: b!.isMain, likeCount: b!.likeCount, replyCount: b!.replyCount, repostCount: b!.repostCount, shareCount: b!.shareCount }));
      const res = await apiFetch('/api/zhihugen/preview-images', {
        method: 'POST',
        body: JSON.stringify({ blocks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Preview failed');
      return data as { images: string[] };
    },
    onSuccess: (data) => {
      setCardImages(data.images);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Preview failed');
    },
  });

  const render = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error('No scrape result');
      const main = result.blocks.find((b) => b.isMain);
      const top = sortedComments(result.blocks).slice(0, TOP_COMMENTS);
      const blocks = [main, ...top]
        .filter(Boolean)
        .map((b) => ({ text: b!.text, author: b!.author, isMain: b!.isMain, likeCount: b!.likeCount, replyCount: b!.replyCount, repostCount: b!.repostCount, shareCount: b!.shareCount }));

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

      const { jobId } = data as { jobId?: string; absolutePath?: string };
      if (!jobId) throw new Error('No jobId returned');

      setPreview({ jobId, status: 'waiting' });

      // Long-poll until the render is ready for preview
      const waitRes = await apiFetch(`/api/zhihugen/jobs/${jobId}/wait`);
      const waitData = await waitRes.json();
      if (!waitRes.ok) throw new Error(waitData.error || 'Job wait failed');
      if (waitData.status !== 'awaiting_upload') throw new Error(`Unexpected job status: ${waitData.status}`);

      setPreview({ jobId, status: 'ready' });
      return jobId;
    },
    onError: () => {
      setPreview(null);
    },
  });

  const confirmUpload = useMutation({
    mutationFn: async (jobId: string) => {
      setPreview((p) => p ? { ...p, status: 'uploading' } : p);
      const res = await apiFetch(`/api/zhihugen/jobs/${jobId}/confirm-upload`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data as { absolutePath: string };
    },
    onSuccess: (data) => {
      setPreview((p) => p ? { ...p, status: 'done', absolutePath: data.absolutePath } : p);
      toast.success('Video uploaded successfully');
    },
    onError: (err) => {
      setPreview((p) => p ? { ...p, status: 'ready' } : p);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    },
  });

  const discard = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiFetch(`/api/zhihugen/jobs/${jobId}/discard`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Discard failed');
      }
    },
    onSuccess: () => {
      setPreview(null);
      toast.success('Video discarded');
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
              <div className="flex gap-2">
                <button
                  onClick={() => previewCards.mutate()}
                  disabled={previewCards.isPending || comments.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                >
                  {previewCards.isPending ? 'Loading...' : 'Preview Cards'}
                </button>
                <button
                  onClick={() => render.mutate()}
                  disabled={render.isPending || comments.length === 0 || (preview?.status === 'ready' || preview?.status === 'uploading')}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {render.isPending
                    ? preview?.status === 'waiting' ? 'Rendering...' : 'Starting...'
                    : `Render Video (${Math.min(TOP_COMMENTS, comments.length)} comments)`}
                </button>
              </div>
            </div>

            {cardImages && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">Card Preview ({cardImages.length} cards)</h3>
                  <button
                    onClick={() => setCardImages(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="space-y-2">
                  {cardImages.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Card ${i + 1}`}
                      className="w-full rounded-lg border border-border"
                    />
                  ))}
                </div>
              </div>
            )}

            {preview && (
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-card-foreground">Video Preview</h3>
                {preview.status === 'waiting' && (
                  <p className="text-sm text-muted-foreground">Rendering video, please wait...</p>
                )}
                {(preview.status === 'ready' || preview.status === 'uploading') && (
                  <>
                    <video
                      key={preview.jobId}
                      src={`/api/zhihugen/jobs/${preview.jobId}/preview`}
                      controls
                      className="w-full rounded-md"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmUpload.mutate(preview.jobId)}
                        disabled={preview.status === 'uploading'}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {preview.status === 'uploading' ? 'Uploading...' : 'Confirm Upload'}
                      </button>
                      <button
                        onClick={() => discard.mutate(preview.jobId)}
                        disabled={preview.status === 'uploading' || discard.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        Discard
                      </button>
                    </div>
                  </>
                )}
                {preview.status === 'done' && (
                  <div className="space-y-2">
                    <p className="text-sm text-green-600 dark:text-green-400">Uploaded successfully.</p>
                    {preview.absolutePath && (
                      <p className="text-xs text-muted-foreground break-all">{preview.absolutePath}</p>
                    )}
                    <button
                      onClick={() => setPreview(null)}
                      className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )}

            {render.isError && (
              <p className="text-sm text-destructive">{render.error instanceof Error ? render.error.message : 'Render failed'}</p>
            )}

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
