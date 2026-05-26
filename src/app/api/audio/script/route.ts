import { NextRequest, NextResponse } from 'next/server';
import { runCodex } from '@/lib/codex';
import { buildPrompt } from '@/lib/codex-prompts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { content } = await req.json() as { content: string };

  if (!content) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  }

  try {
    const prompt = buildPrompt('audio', content);
    const script = await runCodex(prompt, process.cwd(), 120_000);
    return NextResponse.json({ script });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate script' },
      { status: 500 },
    );
  }
}
