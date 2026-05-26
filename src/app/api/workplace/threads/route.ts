import { NextRequest, NextResponse } from 'next/server';
import { getSEQuestionAndAnswers } from '@/lib/stackexchange';
import type { ThreadsBlock } from '@/lib/parseThreadsPost';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { questionId, title } = await req.json() as { questionId: number; title: string };

  if (!questionId) {
    return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
  }

  try {
    const { body, questionAuthor, answers } = await getSEQuestionAndAnswers(questionId);

    const blocks: ThreadsBlock[] = [
      { text: body ? `${title}\n\n${body}` : title, author: questionAuthor || 'The Workplace', score: 0, isMain: true },
      ...answers.map((a) => ({
        text: a.body,
        author: a.accepted ? `✓ ${a.author}` : a.author,
        score: a.score,
        isMain: false,
        createdAt: a.createdAt,
      })),
    ];

    return NextResponse.json({ blocks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch' },
      { status: 500 },
    );
  }
}
