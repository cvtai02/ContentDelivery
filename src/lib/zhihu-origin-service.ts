import { getDiceBearAvatar } from '@/lib/avatar';
import type { PostBlock } from '@/lib/parseThreadsPost';
import { getZhihuAnswers } from '@/lib/zhihu';

export async function fetchZhihuOriginBlocks(questionId: string, title: string): Promise<PostBlock[]> {
  const { questionAuthor, questionCreatedAt, answers } = await getZhihuAnswers(questionId);
  const questionDisplayAuthor = questionAuthor || 'Zhihu';
  const uniqueAuthors = [...new Set([questionDisplayAuthor, ...answers.map((a) => a.author)].filter(Boolean))];
  const avatarMap = new Map<string, string>();

  await Promise.all(uniqueAuthors.map(async (author) => {
    avatarMap.set(author, await getDiceBearAvatar(author));
  }));

  return [
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
  ];
}
