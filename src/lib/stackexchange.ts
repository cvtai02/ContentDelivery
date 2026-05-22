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
  const res = await fetch(
    `${BASE}/questions?order=desc&sort=${sort}&site=workplace&pagesize=${limit}&filter=default${KEY}`,
    { next: { revalidate: 300 } },
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
}
