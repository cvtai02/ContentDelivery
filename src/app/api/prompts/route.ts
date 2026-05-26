import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_PROMPTS, getPrompts, savePrompt, type PromptKey } from '@/lib/codex-prompts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  const current = getPrompts();
  return NextResponse.json({ prompts: current, defaults: DEFAULT_PROMPTS });
}

export async function POST(req: NextRequest) {
  const { key, template } = await req.json() as { key: PromptKey; template: string | null };
  const valid: PromptKey[] = ['reddit', 'workplace', 'zhihu', 'audio'];
  if (!valid.includes(key)) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }
  savePrompt(key, template);
  return NextResponse.json({ ok: true });
}
