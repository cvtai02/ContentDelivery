import { getSetting, setSetting } from '@/lib/db';

const REDDIT_DEFAULT_POST_LIMIT = 'REDDIT_DEFAULT_POST_LIMIT';
const ZHIHU_TOPIC_DEFAULT_POST_LIMIT = 'ZHIHU_TOPIC_DEFAULT_POST_LIMIT';

export type SectionPreferences = {
  redditDefaultPostLimit: number;
  zhihuTopicDefaultPostLimit: number;
};

function normalizeLimit(value: unknown, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.trunc(number), 1), 10);
}

function getLimit(key: string, fallback: number): number {
  return normalizeLimit(getSetting(key), fallback);
}

export function getSectionPreferences(): SectionPreferences {
  return {
    redditDefaultPostLimit: getLimit(REDDIT_DEFAULT_POST_LIMIT, 1),
    zhihuTopicDefaultPostLimit: getLimit(ZHIHU_TOPIC_DEFAULT_POST_LIMIT, 3),
  };
}

export function setSectionPreferences(value: Partial<SectionPreferences>): SectionPreferences {
  if (value.redditDefaultPostLimit !== undefined) {
    setSetting(REDDIT_DEFAULT_POST_LIMIT, String(normalizeLimit(value.redditDefaultPostLimit, 1)));
  }
  if (value.zhihuTopicDefaultPostLimit !== undefined) {
    setSetting(ZHIHU_TOPIC_DEFAULT_POST_LIMIT, String(normalizeLimit(value.zhihuTopicDefaultPostLimit, 3)));
  }

  return getSectionPreferences();
}
