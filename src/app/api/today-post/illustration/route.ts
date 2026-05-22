import { NextRequest, NextResponse } from 'next/server';
import { createTodayPostIllustrationSvg } from '@/lib/today-post-illustration';

export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get('topic') ?? 'Today Post';
  const title = req.nextUrl.searchParams.get('title') ?? topic;
  const date = req.nextUrl.searchParams.get('date') ?? '';
  const imagePrompt = req.nextUrl.searchParams.get('imagePrompt') ?? '';
  const svg = createTodayPostIllustrationSvg({ date, topic, title, imagePrompt });

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
