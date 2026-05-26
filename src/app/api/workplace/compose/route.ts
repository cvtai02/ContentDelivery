import { NextRequest, NextResponse } from 'next/server';
import { runCodex } from '@/lib/codex';
import { getSEQuestionAndAnswers } from '@/lib/stackexchange';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { questionId, title } = await req.json() as { questionId: number; title: string };

  if (!questionId) {
    return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
  }

  try {
    const { body, answers } = await getSEQuestionAndAnswers(questionId);

    const lines: string[] = [body ? `${title}\n\n${body}` : title];
    answers.forEach((a, i) => {
      const label = a.accepted ? `✓ ${a.author}` : a.author;
      lines.push(`---------\n${i + 1}. ${label} - ${a.score} likes.\n${a.body}`);
    });

    const raw = lines.join('\n\n');
    const prompt = `Translate the following Workplace Stack Exchange question and answers to Vietnamese. Keep the exact format and structure. Only translate the text — do not add, remove, or rewrite anything. Do NOT translate lines that start with "Comment" (e.g. "Comment 1. AuthorName - 123 likes." must stay unchanged).\n\n${raw}`;
    const content = await runCodex(prompt, process.cwd(), 120_000);

    return NextResponse.json({ content });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to compose' },
      { status: 500 },
    );
  }
}
