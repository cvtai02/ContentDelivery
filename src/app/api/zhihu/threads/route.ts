import { NextRequest, NextResponse } from 'next/server';
import { getZhihuAnswers } from '@/lib/zhihu';
import type { ThreadsBlock } from '@/lib/parseThreadsPost';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { questionId, title } = await req.json() as { questionId: string; title: string };

  if (!questionId) {
    return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
  }

  try {
    const { questionAuthor, answers } = await getZhihuAnswers(questionId);

    const blocks: ThreadsBlock[] = [
      { text: title, author: questionAuthor || '知乎', score: 0, isMain: true },
      ...answers.map((a) => ({ text: a.content, author: a.author, score: a.score, isMain: false, createdAt: a.createdAt })),
    ];

    return NextResponse.json({ blocks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch' },
      { status: 500 },
    );
  }
}
