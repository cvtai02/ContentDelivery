import { NextRequest, NextResponse } from 'next/server';
import { getZhihuAnswers } from '@/lib/zhihu';
import { getDiceBearAvatar } from '@/lib/avatar';
import type { PostBlock } from '@/lib/parseThreadsPost';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { questionId, title } = await req.json() as { questionId: string; title: string };

  if (!questionId) {
    return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
  }

  try {
    const { questionAuthor, questionCreatedAt, answers } = await getZhihuAnswers(questionId);

    const uniqueAuthors = [...new Set([questionAuthor || '知乎', ...answers.map((a) => a.author)].filter(Boolean))];
    const avatarMap = new Map<string, string>();
    await Promise.all(uniqueAuthors.map(async (a) => { avatarMap.set(a, await getDiceBearAvatar(a)); }));

    const blocks: PostBlock[] = [
      { text: title, author: questionAuthor || '知乎', avatarUrl: avatarMap.get(questionAuthor || '知乎'), score: 0, isMain: true, createdAt: questionCreatedAt },
      ...answers.map((a) => ({ text: a.content, author: a.author, avatarUrl: avatarMap.get(a.author), score: a.score, isMain: false, createdAt: a.createdAt })),
    ];

    return NextResponse.json({ blocks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch' },
      { status: 500 },
    );
  }
}
