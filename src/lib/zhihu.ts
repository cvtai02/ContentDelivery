import { withCache } from '@/lib/cache';
import { stripHtml } from '@/lib/utils';

export const ZHIHU_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function zhihuHeaders(extra?: Record<string, string>) {
  const cookie = process.env.ZHIHU_COOKIE;
  return {
    'User-Agent': ZHIHU_USER_AGENT,
    ...(cookie ? { 'Cookie': cookie } : {}),
    ...extra,
  };
}

export type ZhihuQuestion = {
  id: string;
  title: string;
  excerpt: string;
  answerCount: number;
  heat: string;
  url: string;
};

export async function getZhihuTravelQuestions(limit = 10): Promise<ZhihuQuestion[]> {
  return withCache(`zhihu_travel_${limit}`, 60 * 60 * 1000, async () => {
    const res = await fetch(
      `https://www.zhihu.com/api/v4/topics/19553092/feeds/top_activity?limit=${limit}&after_id=0`,
      { headers: zhihuHeaders({ 'Referer': 'https://www.zhihu.com/topic/19553092/hot' }) },
    );

    if (!res.ok) throw new Error(`Zhihu API error: ${res.status}`);

    const data = await res.json() as {
      data: Array<{
        target: { id: number; title: string; excerpt?: string; answer_count?: number; type: string };
        detail_text?: string;
      }>;
    };

    return data.data
      .filter((item) => item.target.type === 'question')
      .slice(0, limit)
      .map((item) => ({
        id: String(item.target.id),
        title: item.target.title,
        excerpt: item.target.excerpt ?? '',
        answerCount: item.target.answer_count ?? 0,
        heat: item.detail_text ?? '',
        url: `https://www.zhihu.com/question/${item.target.id}`,
      }));
  });
}

export async function getZhihuHotQuestions(limit = 10): Promise<ZhihuQuestion[]> {
  if (!process.env.ZHIHU_COOKIE) {
    throw new Error('ZHIHU_COOKIE chưa được cấu hình. Lấy cookie z_c0 từ trình duyệt khi đăng nhập Zhihu và thêm vào .env');
  }

  return withCache(`zhihu_hot_${limit}`, 30 * 60 * 1000, async () => {
    const res = await fetch(
      'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50',
      { headers: zhihuHeaders({ 'Referer': 'https://www.zhihu.com/' }) },
    );

    if (!res.ok) throw new Error(`Zhihu API error: ${res.status}`);

    // Large integer IDs lose precision via JSON.parse — keep them as strings
    const text = await res.text();
    const safeText = text.replace(/:(\d{16,})/g, ':"$1"');
    const data = JSON.parse(safeText) as {
      data: Array<{
        target: { id: string; title: string; excerpt?: string; answer_count?: number; type: string };
        detail_text: string;
      }>;
    };

    return data.data
      .filter((item) => item.target.type === 'question')
      .slice(0, limit)
      .map((item) => ({
        id: String(item.target.id),
        title: item.target.title,
        excerpt: item.target.excerpt ?? '',
        answerCount: item.target.answer_count ?? 0,
        heat: item.detail_text ?? '',
        url: `https://www.zhihu.com/question/${item.target.id}`,
      }));
  });
}

// ── Answers for a question (for compose / threads) ─────────────────────────

export type ZhihuAnswer = { author: string; score: number; content: string; createdAt: number };

export async function getZhihuAnswers(questionId: string): Promise<{
  questionAuthor: string;
  answers: ZhihuAnswer[];
}> {
  const cookie = process.env.ZHIHU_COOKIE;
  const headers = {
    'User-Agent': ZHIHU_USER_AGENT,
    'Referer': `https://www.zhihu.com/question/${questionId}`,
    ...(cookie ? { 'Cookie': cookie } : {}),
  };
  const signal = AbortSignal.timeout(10_000);

  const [qRes, aRes] = await Promise.all([
    fetch(`https://www.zhihu.com/api/v4/questions/${questionId}?include=author`, { headers, signal }),
    fetch(`https://www.zhihu.com/api/v4/questions/${questionId}/answers?include=data%5B*%5D.content%2Cvoteup_count%2Ccreated_time&order=default&limit=5&offset=0&platform=desktop`, { headers, signal }),
  ]);

  if (!aRes.ok) throw new Error(`Zhihu API error: ${aRes.status}`);

  const [qData, aData] = await Promise.all([
    qRes.ok ? qRes.json() : Promise.resolve(null),
    aRes.json(),
  ]) as [
    { author?: { name: string } } | null,
    { data: Array<{ author: { name: string }; voteup_count: number; content: string; created_time: number }> },
  ];

  return {
    questionAuthor: qData?.author?.name ?? '',
    answers: aData.data.map((a) => ({
      author: a.author.name,
      score: a.voteup_count,
      content: stripHtml(a.content ?? ''),
      createdAt: a.created_time,
    })),
  };
}
