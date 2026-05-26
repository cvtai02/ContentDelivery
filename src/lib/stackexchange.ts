import { withCache } from '@/lib/cache';
import { stripHtml } from '@/lib/utils';

const BASE = 'https://api.stackexchange.com/2.3';
const KEY = process.env.STACKEXCHANGE_KEY ? `&key=${process.env.STACKEXCHANGE_KEY}` : '';

export type SEQuestion = {
  id: number;
  title: string;
  score: number;
  answerCount: number;
  viewCount: number;
  tags: string[];
  url: string;
  createdAt: number;
};

export async function getWorkplaceHotQuestions(sort = 'votes', limit = 10): Promise<SEQuestion[]> {
  return withCache(`workplace_${sort}_${limit}`, 6 * 60 * 60 * 1000, async () => {
    const res = await fetch(
      `${BASE}/questions?order=desc&sort=${sort}&site=workplace&pagesize=${limit}&filter=default${KEY}`,
    );

    if (!res.ok) throw new Error(`Stack Exchange API error: ${res.status}`);

    const data = await res.json() as {
      items: Array<{
        question_id: number;
        title: string;
        score: number;
        answer_count: number;
        view_count: number;
        tags: string[];
        link: string;
        creation_date: number;
      }>;
    };

    return data.items.map((q) => ({
      id: q.question_id,
      title: q.title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
      score: q.score,
      answerCount: q.answer_count,
      viewCount: q.view_count,
      tags: q.tags,
      url: q.link,
      createdAt: q.creation_date,
    }));
  });
}

// ── Question + answers (for compose / threads) ─────────────────────────────

export type SEAnswer = { author: string; score: number; accepted: boolean; body: string; createdAt: number };

export async function getSEQuestionAndAnswers(questionId: number) {
  const [qRes, aRes] = await Promise.all([
    fetch(`${BASE}/questions/${questionId}?site=workplace&filter=withbody${KEY}`),
    fetch(`${BASE}/questions/${questionId}/answers?order=desc&sort=votes&site=workplace&filter=withbody&pagesize=5${KEY}`),
  ]);
  if (!qRes.ok) throw new Error(`Stack Exchange API error: ${qRes.status}`);
  if (!aRes.ok) throw new Error(`Stack Exchange API error: ${aRes.status}`);

  const [qData, aData] = await Promise.all([qRes.json(), aRes.json()]) as [
    { items: Array<{ body: string; owner: { display_name: string } }> },
    { items: Array<{ body: string; score: number; owner: { display_name: string }; is_accepted: boolean; creation_date: number }> },
  ];

  return {
    body: stripHtml(qData.items[0]?.body ?? ''),
    questionAuthor: qData.items[0]?.owner.display_name ?? '',
    answers: aData.items.map((a) => ({
      author: a.owner.display_name,
      score: a.score,
      accepted: a.is_accepted,
      body: stripHtml(a.body ?? ''),
      createdAt: a.creation_date,
    })),
  };
}
