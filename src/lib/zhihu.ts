const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function zhihuHeaders(extra?: Record<string, string>) {
  const cookie = process.env.ZHIHU_COOKIE;
  return {
    'User-Agent': USER_AGENT,
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
  const res = await fetch(
    `https://www.zhihu.com/api/v4/topics/19553092/feeds/top_activity?limit=${limit}&after_id=0`,
    {
      headers: zhihuHeaders({ 'Referer': 'https://www.zhihu.com/topic/19553092/hot' }),
      next: { revalidate: 300 },
    },
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
}

export async function getZhihuHotQuestions(limit = 10): Promise<ZhihuQuestion[]> {
  if (!process.env.ZHIHU_COOKIE) {
    throw new Error('ZHIHU_COOKIE chưa được cấu hình. Lấy cookie z_c0 từ trình duyệt khi đăng nhập Zhihu và thêm vào .env');
  }

  const res = await fetch(
    'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50',
    {
      headers: zhihuHeaders({ 'Referer': 'https://www.zhihu.com/' }),
      next: { revalidate: 300 },
    },
  );

  if (!res.ok) throw new Error(`Zhihu API error: ${res.status}`);

  const data = await res.json() as {
    data: Array<{
      target: { id: number; title: string; excerpt?: string; answer_count?: number; type: string };
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
}
