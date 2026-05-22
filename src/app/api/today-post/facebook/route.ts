import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { publishTodayPostToFacebook } from '@/lib/facebook';
import type { TodayPost } from '@/types/today-post';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const postPath = path.join(process.cwd(), 'src', 'data', 'today-post.json');

async function readPost(): Promise<TodayPost> {
  return JSON.parse(await readFile(postPath, 'utf8')) as TodayPost;
}

export async function POST(req: Request) {
  try {
    const post = await readPost();
    const result = await publishTodayPostToFacebook(post, 'Gét gô');

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot publish to Facebook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
