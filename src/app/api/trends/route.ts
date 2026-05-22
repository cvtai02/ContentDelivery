import { NextResponse } from 'next/server';
import type { TrendItem } from '@/types/trends';
import { isEntertainment } from '@/lib/entertainment-filter';

function extractFirst(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  return xml.match(re)?.[1]?.trim() ?? '';
}

function parseTraffic(raw: string): number {
  return parseInt(raw.replace(/[^\d]/g, ''), 10) || 0;
}

function parseItems(xml: string): TrendItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const block     = m[1];
    const newsBlock = block.match(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/)?.[1] ?? '';
    const title     = extractFirst(block, 'title');
    const traffic   = extractFirst(block, 'ht:approx_traffic');

    return {
      title,
      traffic,
      trafficNum: parseTraffic(traffic),
      url:        `https://trends.google.com/trends/explore?q=${encodeURIComponent(title)}&geo=VN`,
      pubDate:    extractFirst(block, 'pubDate'),
      imageUrl:   extractFirst(block, 'ht:picture'),
      newsTitle:  extractFirst(newsBlock, 'ht:news_item_title'),
      newsSource: extractFirst(newsBlock, 'ht:news_item_source'),
      newsUrl:    extractFirst(newsBlock, 'ht:news_item_url'),
    };
  });
}

async function fetchRss(): Promise<TrendItem[]> {
  const res = await fetch('https://trends.google.com/trending/rss?geo=VN&hl=vi', {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept':          'application/rss+xml, application/xml, text/xml, */*',
      'Accept-Language': 'vi-VN,vi;q=0.9',
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];
  return parseItems(await res.text());
}

export async function GET() {
  const all = await fetchRss();
  all.sort((a, b) => b.trafficNum - a.trafficNum);

  // Prefer entertainment items; backfill with others if not enough
  const ent   = all.filter((t) => isEntertainment(t.title, t.newsTitle));
  const other = all.filter((t) => !isEntertainment(t.title, t.newsTitle));
  const items = ent.length >= 5 ? ent : [...ent, ...other];

  return NextResponse.json(items.slice(0, 20));
}
