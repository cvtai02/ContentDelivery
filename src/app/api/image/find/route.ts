import { NextRequest, NextResponse } from 'next/server';
import { runCodex } from '@/lib/codex';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const USER_AGENT = 'Hot-post-every-day/1.0 by cvtai105';
const IMAGE_EXT = /\.(jpg|jpeg|png|webp)(\?.*)?$/i;

async function aiImageQuery(title: string): Promise<string> {
  try {
    const prompt = `Given this post title: "${title.replace(/"/g, "'")}"
Reply with ONLY 2-3 English visual keywords suitable for a Wikimedia Commons photo search that best represent this topic visually. No explanation, no punctuation — just the keywords.`;
    const result = await runCodex(prompt, process.cwd(), 30_000);
    const cleaned = result.trim().replace(/["""]/g, '').split('\n')[0].trim();
    return cleaned || '';
  } catch {
    return '';
  }
}

async function searchWikimedia(query: string): Promise<string | null> {
  const q = query.trim().split(/\s+/).slice(0, 4).join(' ');
  if (!q) return null;

  try {
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json&origin=*`,
      { headers: { 'User-Agent': USER_AGENT } },
    );
    if (!res.ok) return null;

    const data = await res.json() as {
      query?: { pages?: Record<string, { title?: string; imageinfo?: Array<{ thumburl?: string; url?: string }> }> };
    };

    const images = Object.values(data.query?.pages ?? {})
      .filter((p) => IMAGE_EXT.test(p.title ?? '') || IMAGE_EXT.test(p.imageinfo?.[0]?.url ?? ''))
      .map((p) => p.imageinfo?.[0]?.thumburl ?? p.imageinfo?.[0]?.url)
      .filter(Boolean) as string[];

    if (!images.length) return null;
    return images[Math.floor(Math.random() * Math.min(10, images.length))];
  } catch {
    return null;
  }
}

async function getHotMeme(): Promise<string | null> {
  try {
    const res = await fetch(
      'https://www.reddit.com/r/memes/hot.json?limit=25',
      { headers: { 'User-Agent': USER_AGENT } },
    );
    if (!res.ok) return null;
    const data = await res.json() as {
      data: { children: Array<{ data: { url: string; post_hint?: string } }> };
    };
    const images = data.data.children
      .map((c) => c.data)
      .filter((p) => p.post_hint === 'image' || IMAGE_EXT.test(p.url))
      .map((p) => p.url);
    if (!images.length) return null;
    return images[Math.floor(Math.random() * images.length)];
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? '';

  const aiQuery = await aiImageQuery(query);
  const searchTerm = aiQuery || query;

  const wikimediaUrl = await searchWikimedia(searchTerm);
  if (wikimediaUrl) return NextResponse.json({ url: wikimediaUrl, source: 'wikimedia' });

  // Try original query if AI query didn't find anything
  if (aiQuery && aiQuery !== query) {
    const fallbackUrl = await searchWikimedia(query);
    if (fallbackUrl) return NextResponse.json({ url: fallbackUrl, source: 'wikimedia' });
  }

  const memeUrl = await getHotMeme();
  return NextResponse.json({ url: memeUrl, source: 'meme' });
}
