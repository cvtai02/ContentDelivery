import { NextRequest, NextResponse } from 'next/server';
import { getSEQuestionAndAnswers } from '@/lib/stackexchange';
import { getDiceBearAvatar } from '@/lib/avatar';
import type { ThreadsBlock } from '@/lib/parseThreadsPost';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { questionId, title } = await req.json() as { questionId: number; title: string };

  if (!questionId) {
    return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
  }

  try {
    const { body, questionAuthor, questionCreatedAt, questionScore, answers } = await getSEQuestionAndAnswers(questionId);

    const uniqueAuthors = [...new Set([questionAuthor || 'The Workplace', ...answers.map((a) => a.author)].filter(Boolean))];
    const avatarMap = new Map<string, string>();
    await Promise.all(uniqueAuthors.map(async (a) => { avatarMap.set(a, await getDiceBearAvatar(a)); }));

    const blocks: ThreadsBlock[] = [
      { text: body ? `${title}\n\n${body}` : title, author: questionAuthor || 'The Workplace', avatarUrl: avatarMap.get(questionAuthor || 'The Workplace'), score: questionScore ?? 0, isMain: true, createdAt: questionCreatedAt },
      ...answers.map((a) => ({
        text: a.body,
        author: a.accepted ? `✓ ${a.author}` : a.author,
        avatarUrl: avatarMap.get(a.author),
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
