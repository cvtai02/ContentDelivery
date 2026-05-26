import { NextRequest, NextResponse } from 'next/server';
import { runCodex } from '@/lib/codex';
import { buildPrompt } from '@/lib/codex-prompts';
import { getSEQuestionAndAnswers } from '@/lib/stackexchange';
import { decodeHtmlEntities } from '@/lib/utils';

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
      lines.push(`---------\n${i + 1}. ${label} - ${a.score} likes. [ts:${a.createdAt}]\n${a.body}`);
    });

    const raw = lines.join('\n\n');
    const prompt = buildPrompt('workplace', raw);
    const content = decodeHtmlEntities(await runCodex(prompt, process.cwd(), 120_000));

    return NextResponse.json({ content });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to compose' },
      { status: 500 },
    );
  }
}
