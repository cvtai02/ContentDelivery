import { NextRequest, NextResponse } from 'next/server';
import { runCodex } from '@/lib/codex';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
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

async function fetchTopAnswers(questionId: string) {
  const cookie = process.env.ZHIHU_COOKIE;
  const res = await fetch(
    `https://www.zhihu.com/api/v4/questions/${questionId}/answers?include=data%5B*%5D.content%2Cvoteup_count&order=default&limit=5&offset=0&platform=desktop`,
    {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': `https://www.zhihu.com/question/${questionId}`,
        ...(cookie ? { 'Cookie': cookie } : {}),
      },
    },
  );

  if (!res.ok) throw new Error(`Zhihu API error: ${res.status}`);

  const data = await res.json() as {
    data: Array<{ author: { name: string }; voteup_count: number; content: string }>;
  };

  return data.data.map((a) => ({
    author: a.author.name,
    score: a.voteup_count,
    content: stripHtml(a.content ?? ''),
  }));
}

export async function POST(req: NextRequest) {
  const { questionId, title } = await req.json() as { questionId: string; title: string };

  if (!questionId) {
    return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
  }

  try {
    const answers = await fetchTopAnswers(questionId);

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
