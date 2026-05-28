import { withCache } from '@/lib/cache';
import { stripHtml } from '@/lib/utils';
import { getSetting } from '@/lib/db';

export const ZHIHU_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';

function zhihuHeaders(extra?: Record<string, string>) {
  const cookie = getSetting('ZHIHU_COOKIE');
  return {
    'User-Agent': ZHIHU_USER_AGENT,
    ...(cookie ? { 'Cookie': cookie } : {}),
    ...extra,
  };
}

function zhihuTopicHeaders(topicId: string) {
  const cookie = getSetting('ZHIHU_TOPIC_COOKIE') || getSetting('ZHIHU_COOKIE');
  const zse93 = getSetting('ZHIHU_TOPIC_X_ZSE_93');
  const zse96 = getSetting('ZHIHU_TOPIC_X_ZSE_96');

  return {
    'User-Agent': ZHIHU_USER_AGENT,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': `https://www.zhihu.com/topic/${topicId}/hot`,
    'X-Requested-With': 'fetch',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    ...(cookie ? { 'Cookie': cookie } : {}),
    ...(zse93 ? { 'x-zse-93': zse93 } : {}),
    ...(zse96 ? { 'x-zse-96': zse96 } : {}),
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

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function findQuestionCandidate(value: unknown): UnknownRecord | null {
  if (!isRecord(value)) return null;

  const id = value.id;
  const title = value.title;
  const type = value.type;
  if ((typeof id === 'number' || typeof id === 'string') && typeof title === 'string' && (!type || type === 'question')) {
    return value;
  }

  for (const key of ['question', 'target', 'object', 'answer', 'article']) {
    const found = findQuestionCandidate(value[key]);
    if (found) return found;
  }

  return null;
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function mapTopicFeedItem(item: unknown): ZhihuQuestion | null {
  const question = findQuestionCandidate(item);
  if (!question) return null;

  const id = String(question.id);
  const wrapper = isRecord(item) ? item : {};
  const target = isRecord(wrapper.target) ? wrapper.target : {};
  const answer = isRecord(target.answer) ? target.answer : isRecord(wrapper.answer) ? wrapper.answer : {};
  const voteupCount = numberValue(answer.voteup_count || target.voteup_count || wrapper.voteup_count);
  const heat = textValue(wrapper.detail_text)
    || (voteupCount ? `${voteupCount} \u8d5e\u540c` : '');

  return {
    id,
    title: textValue(question.title),
    excerpt: textValue(question.excerpt),
    answerCount: numberValue(question.answer_count),
    heat,
    url: `https://www.zhihu.com/question/${id}`,
  };
}

export async function getZhihuTopicQuestions(topicId: string, limit = 10): Promise<ZhihuQuestion[]> {
  return withCache(`zhihu_topic_v5_essence_v2_${topicId}_${limit}`, 60 * 60 * 1000, async () => {
    const res = await fetch(
      `https://www.zhihu.com/api/v5.1/topics/${encodeURIComponent(topicId)}/feeds/essence/v2`,
      {
        headers: zhihuTopicHeaders(topicId),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Zhihu API error: ${res.status}${body ? ` ${body.slice(0, 160)}` : ''}`);
    }

    const data = await res.json() as { data?: unknown[] };

    const seen = new Set<string>();
    const questions = (data.data ?? [])
      .map(mapTopicFeedItem)
      .filter((item): item is ZhihuQuestion => Boolean(item))
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

    return questions.slice(0, limit);
  });
}

export async function getZhihuTravelQuestions(limit = 10): Promise<ZhihuQuestion[]> {
  return getZhihuTopicQuestions('19553092', limit);
}

export async function getZhihuHotQuestions(limit = 10): Promise<ZhihuQuestion[]> {
  if (!getSetting('ZHIHU_COOKIE')) {
    throw new Error('ZHIHU_COOKIE chưa được cấu hình. Vào Settings để nhập cookie z_c0 từ trình duyệt khi đăng nhập Zhihu.');
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

const MAX_ZHIHU_ANSWER_LENGTH = 200;
const MIN_ZHIHU_ANSWER_SCORE = 80;
const MEDIA_EMBED_RE = /!\[[^\]]*\]\([^)]*\)|<img\b|<figure\b|data-actualsrc=/i;
const SPAM_RE = /(https?:\/\/|www\.|t\.me|telegram|whatsapp|wechat|weixin|微信|加微|vx[:：]?|qq[:：]?\d|邮箱|email|私信|联系|扫码|二维码)/i;

function hasMediaEmbed(text: string): boolean {
  return MEDIA_EMBED_RE.test(text);
}

function normalizeAnswerContent(html: string): string {
  return stripHtml(html).replace(/\n{3,}/g, '\n\n').trim();
}

function isUsefulShortAnswer(answer: { voteup_count: number; content: string }): boolean {
  if (answer.voteup_count < MIN_ZHIHU_ANSWER_SCORE) return false;
  if (hasMediaEmbed(answer.content)) return false;

  const content = normalizeAnswerContent(answer.content);
  if (!content || content.length >= MAX_ZHIHU_ANSWER_LENGTH) return false;
  if (SPAM_RE.test(content)) return false;

  return true;
}

export async function getZhihuAnswers(questionId: string): Promise<{
  questionAuthor: string;
  questionCreatedAt?: number;
  answers: ZhihuAnswer[];
}> {
  const cookie = getSetting('ZHIHU_COOKIE');
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
    { author?: { name: string }; created?: number } | null,
    { data: Array<{ author: { name: string }; voteup_count: number; content: string; created_time: number }> },
  ];

  return {
    questionAuthor: qData?.author?.name ?? '',
    questionCreatedAt: qData?.created,
    answers: aData.data
      .filter((a) => isUsefulShortAnswer({ voteup_count: a.voteup_count, content: a.content ?? '' }))
      .map((a) => ({
        author: a.author.name,
        score: a.voteup_count,
        content: normalizeAnswerContent(a.content ?? ''),
        createdAt: a.created_time,
      }))
      .filter((a) => a.content),
  };
}
