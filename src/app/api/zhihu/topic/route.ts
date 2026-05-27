import { NextRequest, NextResponse } from 'next/server';
import { getZhihuTopicQuestions } from '@/lib/zhihu';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const topicId = req.nextUrl.searchParams.get('topicId') ?? '';
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '5'), 30);

  if (!/^\d+$/.test(topicId)) {
    return NextResponse.json({ error: 'Invalid topicId' }, { status: 400 });
  }

  try {
    const questions = await getZhihuTopicQuestions(topicId, limit);
    return NextResponse.json({ questions }, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Zhihu topic';
    const blocked = message === 'Zhihu API error: 403'
      || message.includes('timeout')
      || message.includes('aborted')
      || message.includes('fetch failed');
    return NextResponse.json(
      { error: blocked ? 'Zhihu blocked this topic feed' : message },
      { status: 200 },
    );
  }
}
