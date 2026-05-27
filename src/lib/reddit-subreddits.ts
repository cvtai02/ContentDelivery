import { getSetting, setSetting } from '@/lib/db';

const SETTING_KEY = 'REDDIT_SUBREDDITS';
const SUBREDDIT_RE = /^[A-Za-z0-9_]{2,21}$/;

export const DEFAULT_SUBREDDITS = [
  'antiwork',
  'AskReddit',
  'confession',
  'AmItheAsshole',
  'tifu',
  'relationship_advice',
  'travel',
];

function normalizeSubreddit(value: string): string {
  return value.trim().replace(/^r\//i, '').replace(/^\/r\//i, '');
}

export function normalizeSubreddits(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_SUBREDDITS;

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') continue;
    const name = normalizeSubreddit(item);
    const key = name.toLowerCase();
    if (!SUBREDDIT_RE.test(name) || seen.has(key)) continue;
    seen.add(key);
    normalized.push(name);
  }

  return normalized;
}

export function getRedditSubreddits(): string[] {
  const raw = getSetting(SETTING_KEY);
  if (!raw) return DEFAULT_SUBREDDITS;

  try {
    return normalizeSubreddits(JSON.parse(raw));
  } catch {
    return DEFAULT_SUBREDDITS;
  }
}

export function setRedditSubreddits(subreddits: unknown): string[] {
  const normalized = normalizeSubreddits(subreddits);
  setSetting(SETTING_KEY, JSON.stringify(normalized));
  return normalized;
}
