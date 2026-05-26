import { NextRequest, NextResponse } from 'next/server';
import { runCodex } from '@/lib/codex';
import { buildPrompt } from '@/lib/codex-prompts';
import { getZhihuAnswers } from '@/lib/zhihu';
import { decodeHtmlEntities } from '@/lib/utils';

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
      lines.push(`---------\n${i + 1}. ${a.author} - ${a.score} likes. [ts:${a.createdAt}]\n${a.content}`);
    });

    const raw = lines.join('\n\n');
    const prompt = buildPrompt('zhihu', raw);
    const content = decodeHtmlEntities(await runCodex(prompt, process.cwd(), 120_000));

    return NextResponse.json({ content });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to compose' },
      { status: 500 },
    );
  }
}
