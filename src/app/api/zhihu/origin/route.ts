import { NextRequest, NextResponse } from 'next/server';
import { fetchZhihuOriginBlocks } from '@/lib/zhihu-origin-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { questionId, title } = await req.json() as { questionId: string; title: string };

  if (!questionId) {
    return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
  }

  try {
    return NextResponse.json({ blocks: await fetchZhihuOriginBlocks(questionId, title) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch' },
      { status: 500 },
    );
  }
}
