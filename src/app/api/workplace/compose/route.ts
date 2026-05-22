import { NextRequest, NextResponse } from 'next/server';
import { runCodex } from '@/lib/codex';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BASE = 'https://api.stackexchange.com/2.3';
const KEY = process.env.STACKEXCHANGE_KEY ? `&key=${process.env.STACKEXCHANGE_KEY}` : '';

function decodeHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchQuestionAndAnswers(questionId: number) {
  const [qRes, aRes] = await Promise.all([
    fetch(`${BASE}/questions/${questionId}?site=workplace&filter=withbody${KEY}`),
    fetch(`${BASE}/questions/${questionId}/answers?order=desc&sort=votes&site=workplace&filter=withbody&pagesize=5${KEY}`),
  ]);

  if (!qRes.ok) throw new Error(`Stack Exchange API error: ${qRes.status}`);
  if (!aRes.ok) throw new Error(`Stack Exchange API error: ${aRes.status}`);

  const [qData, aData] = await Promise.all([qRes.json(), aRes.json()]) as [
    { items: Array<{ body: string; owner: { display_name: string } }> },
    { items: Array<{ body: string; score: number; owner: { display_name: string }; is_accepted: boolean }> },
  ];

  const question = qData.items[0];
  const answers = aData.items.map((a) => ({
    author: a.owner.display_name,
    score: a.score,
    accepted: a.is_accepted,
    body: decodeHtml(a.body ?? ''),
  }));

  return {
    body: decodeHtml(question?.body ?? ''),
    answers,
  };
}

export async function POST(req: NextRequest) {
  const { questionId, title } = await req.json() as { questionId: number; title: string };

  if (!questionId) {
    return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
  }

  try {
    const { body, answers } = await fetchQuestionAndAnswers(questionId);

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
