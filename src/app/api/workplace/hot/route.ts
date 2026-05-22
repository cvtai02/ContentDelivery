import { NextRequest, NextResponse } from 'next/server';
import { getWorkplaceHotQuestions } from '@/lib/stackexchange';

export const dynamic = 'force-dynamic';

const VALID_SORTS = ['votes', 'hot', 'week', 'month', 'activity'];

export async function GET(req: NextRequest) {
  const sort = VALID_SORTS.includes(req.nextUrl.searchParams.get('sort') ?? '')
    ? req.nextUrl.searchParams.get('sort')!
    : 'votes';
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '10'), 30);

  try {
    const questions = await getWorkplaceHotQuestions(sort, limit);
    return NextResponse.json({ questions }, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch' },
      { status: 500 },
    );
  }
}
