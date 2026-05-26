import { NextRequest, NextResponse } from 'next/server';
import { runCodex } from '@/lib/codex';
import { getZhihuAnswers } from '@/lib/zhihu';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { questionId, title } = await req.json() as { questionId: string; title: string };

  if (!questionId) {
    return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
  }

  try {
    const { answers } = await getZhihuAnswers(questionId);

    const lines: string[] = [title];
    answers.forEach((a, i) => {
      lines.push(`---------\n${i + 1}. ${a.author} - ${a.score} likes.\n${a.content}`);
    });

    const raw = lines.join('\n\n');
    const prompt = `Translate the following Zhihu question and answers to Vietnamese. Keep the exact format and structure. Only translate the text — do not add, remove, or rewrite anything. Do NOT translate lines that start with "Comment" (e.g. "Comment 1. AuthorName - 123 likes." must stay unchanged).\n\n${raw}`;
    const content = await runCodex(prompt, process.cwd(), 120_000);

    return NextResponse.json({ content });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to compose' },
      { status: 500 },
    );
  }
}
