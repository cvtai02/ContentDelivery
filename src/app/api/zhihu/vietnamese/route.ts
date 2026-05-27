import { NextRequest, NextResponse } from 'next/server';
import { getDiceBearAvatar } from '@/lib/avatar';
import { withCache } from '@/lib/cache';
import { runCodex } from '@/lib/codex';
import { mergeAbortSignals, registerCodexJob, unregisterCodexJob } from '@/lib/codex-jobs';
import { buildPrompt } from '@/lib/codex-prompts';
import type { PostBlock } from '@/lib/parseThreadsPost';
import { decodeHtmlEntities } from '@/lib/utils';
import { getZhihuAnswers } from '@/lib/zhihu';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ZhihuContentDto = {
  title: string;
  answers: string[];
};

async function fetchZhihuBlocks(questionId: string, title: string): Promise<{
  blocks: PostBlock[];
  contentDto: ZhihuContentDto;
}> {
  const { questionAuthor, questionCreatedAt, answers } = await getZhihuAnswers(questionId);
  const questionDisplayAuthor = questionAuthor || 'Zhihu';

  const uniqueAuthors = [
    ...new Set([questionDisplayAuthor, ...answers.map((a) => a.author)].filter(Boolean)),
  ];
  const avatarMap = new Map<string, string>();
  await Promise.all(
    uniqueAuthors.map(async (author) => {
      avatarMap.set(author, await getDiceBearAvatar(author));
    }),
  );

  return {
    blocks: [
      {
        text: title,
        author: questionDisplayAuthor,
        avatarUrl: avatarMap.get(questionDisplayAuthor),
        score: 0,
        isMain: true,
        createdAt: questionCreatedAt,
      },
      ...answers.map((answer) => ({
        text: answer.content,
        author: answer.author,
        avatarUrl: avatarMap.get(answer.author),
        score: answer.score,
        isMain: false,
        createdAt: answer.createdAt,
      })),
    ],
    contentDto: {
      title,
      answers: answers.map((answer) => answer.content),
    },
  };
}

function applyTranslation(blocks: PostBlock[], translated: ZhihuContentDto): PostBlock[] {
  const result: PostBlock[] = [];

  if (blocks[0]) {
    result.push({ ...blocks[0], text: translated.title });
  }

  translated.answers.forEach((answer, index) => {
    const block = blocks[index + 1];
    if (block) result.push({ ...block, text: answer });
  });

  return result;
}

export async function POST(req: NextRequest) {
  const { questionId, title, refresh, translationJobId } = await req.json() as {
    questionId: string;
    title: string;
    refresh?: boolean;
    translationJobId?: string;
  };

  if (!questionId) {
    return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
  }

  const jobController = registerCodexJob(translationJobId);
  const signal = mergeAbortSignals(req.signal, jobController?.signal);

  try {
    const translate = async () => {
      const { blocks, contentDto } = await fetchZhihuBlocks(questionId, title);
      const translatedRaw = await runCodex(
        buildPrompt('zhihuVietnamese', JSON.stringify(contentDto)),
        process.cwd(),
        120_000,
        signal,
      ).then(decodeHtmlEntities);
      const translatedDto = JSON.parse(translatedRaw) as ZhihuContentDto;
      return applyTranslation(blocks, translatedDto);
    };

    const blocks = refresh
      ? await translate()
      : await withCache<PostBlock[]>(`zhihu_vi_${questionId}`, 30 * 60 * 1000, translate);

    return NextResponse.json({ blocks });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Translation cancelled' }, { status: 499 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to translate' },
      { status: 500 },
    );
  } finally {
    unregisterCodexJob(translationJobId, jobController);
  }
}
