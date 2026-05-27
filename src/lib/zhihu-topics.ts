import { getSetting, setSetting } from '@/lib/db';

const SETTING_KEY = 'ZHIHU_TOPICS';
const TOPIC_ID_RE = /^\d+$/;

export type ZhihuTopic = {
  id: string;
  name: string;
};

export const DEFAULT_ZHIHU_TOPICS: ZhihuTopic[] = [
  { id: '19553092', name: '\u65c5\u884c' },
  { id: '19550517', name: '\u4e92\u8054\u7f51' },
  { id: '19559450', name: '\u673a\u5668\u5b66\u4e60' },
  { id: '19557876', name: '\u804c\u573a' },
  { id: '19552430', name: '\u60c5\u611f' },
  { id: '19551432', name: '\u5fc3\u7406\u5b66' },
  { id: '19564412', name: '\u604b\u7231' },
];

function normalizeTopicId(value: string): string {
  const match = value.trim().match(/(?:^|\/)topic\/(\d+)|^(\d+)$/i);
  return match?.[1] ?? match?.[2] ?? '';
}

export function normalizeZhihuTopics(value: unknown): ZhihuTopic[] {
  if (!Array.isArray(value)) return DEFAULT_ZHIHU_TOPICS;

  const seen = new Set<string>();
  const normalized: ZhihuTopic[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as { id?: unknown; name?: unknown };
    if (typeof entry.id !== 'string') continue;

    const id = normalizeTopicId(entry.id);
    if (!TOPIC_ID_RE.test(id) || seen.has(id)) continue;

    const name = typeof entry.name === 'string' && entry.name.trim()
      ? entry.name.trim()
      : `Topic ${id}`;

    seen.add(id);
    normalized.push({ id, name });
  }

  return normalized;
}

export function getZhihuTopics(): ZhihuTopic[] {
  const raw = getSetting(SETTING_KEY);
  if (!raw) return DEFAULT_ZHIHU_TOPICS;

  try {
    return normalizeZhihuTopics(JSON.parse(raw));
  } catch {
    return DEFAULT_ZHIHU_TOPICS;
  }
}

export function setZhihuTopics(topics: unknown): ZhihuTopic[] {
  const normalized = normalizeZhihuTopics(topics);
  setSetting(SETTING_KEY, JSON.stringify(normalized));
  return normalized;
}
