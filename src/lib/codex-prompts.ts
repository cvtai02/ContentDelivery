import { getPromptTemplate, setPromptTemplate, deletePromptTemplate } from '@/lib/db';

export type PromptKey = 'reddit' | 'zhihuVietnamese' | 'audio';

export const DEFAULT_PROMPTS: Record<PromptKey, string> = {
  reddit: `You are translating a Reddit post payload for /api/reddit/vietnamese.

Input is JSON with this shape:
{
  "title": string,
  "body": string,
  "comments": [
    {
      "text": string,
      "replies": string[]
    }
  ]
}

Translate every string value into natural Vietnamese for Vietnamese readers.
Return ONLY valid JSON with the exact same keys, nesting, array lengths, and order.
Do not add markdown, code fences, explanations, metadata, or extra fields.
Preserve empty strings as empty strings.
Preserve URLs, usernames, subreddit names, code snippets, and markdown/link targets when present.
Keep the original meaning and tone; do not summarize, censor, rewrite, or add opinions.

{{content}}`,

  zhihuVietnamese: `You are translating a Zhihu question payload for /api/zhihu/vietnamese.

Input is JSON with this shape:
{
  "title": string,
  "answers": string[]
}

Translate every string value into natural Vietnamese for Vietnamese readers.
Return ONLY valid JSON with the exact same keys, nesting, array lengths, and order.
Do not add markdown, code fences, explanations, metadata, or extra fields.
Preserve empty strings as empty strings.
Preserve URLs, usernames, code snippets, and markdown/link targets when present.
Keep the original meaning and tone; do not summarize, censor, rewrite, or add opinions.

{{content}}`,

  audio: `Chuyển bài viết sau thành script đọc audio (podcast/voiceover) bằng tiếng Việt. Yêu cầu:\n- Viết theo thể nói, tự nhiên khi đọc thành tiếng\n- Bỏ các ký hiệu khó đọc (bullet, số thứ tự, dấu gạch ngang đầu dòng)\n- Giữ nguyên nội dung, không thêm không bớt thông tin\n- Dùng từ nối tự nhiên giữa các đoạn\n- Không thêm lời mở đầu hay kết thúc của chính mình\n\nBài viết:\n{{content}}`,
};

export function getPrompts(): Record<PromptKey, string> {
  const keys: PromptKey[] = ['reddit', 'zhihuVietnamese', 'audio'];
  return Object.fromEntries(
    keys.map((k) => [k, getPromptTemplate(k) ?? DEFAULT_PROMPTS[k]]),
  ) as Record<PromptKey, string>;
}

export function savePrompt(key: PromptKey, template: string | null): void {
  if (template === null) {
    deletePromptTemplate(key);
  } else {
    setPromptTemplate(key, template);
  }
}

export function buildPrompt(key: PromptKey, content: string): string {
  const template = getPromptTemplate(key) ?? DEFAULT_PROMPTS[key];
  return template.replace('{{content}}', content);
}
