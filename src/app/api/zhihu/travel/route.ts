import { NextRequest, NextResponse } from 'next/server';
import { getZhihuTravelQuestions } from '@/lib/zhihu';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '10'), 30);

  try {
    const questions = await getZhihuTravelQuestions(limit);
    return NextResponse.json({ questions }, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch Zhihu travel' },
      { status: 500 },
    );
  }
}
