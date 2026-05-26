import { getPromptTemplate, setPromptTemplate, deletePromptTemplate } from '@/lib/db';

export type PromptKey = 'reddit' | 'workplace' | 'zhihu' | 'audio';

export const DEFAULT_PROMPTS: Record<PromptKey, string> = {
  reddit: `Translate all string values in the following JSON to Vietnamese. Return ONLY valid JSON — exact same structure and keys, only the string values translated. Do not add markdown, do not wrap in code blocks.\n\n{{content}}`,

  workplace: `Translate the following Workplace Stack Exchange question and answers to Vietnamese. Keep the exact format and structure. Only translate the text content — do not add, remove, or rewrite anything. Do NOT translate or modify header lines (e.g. "1. AuthorName - 123 likes. [ts:1234567890]" must stay exactly as-is). Do NOT remove or change any [ts:...] markers.\n\n{{content}}`,

  zhihu: `Translate the following Zhihu question and answers to Vietnamese. Keep the exact format and structure. Only translate the text content — do not add, remove, or rewrite anything. Do NOT translate or modify header lines (e.g. "1. AuthorName - 123 likes. [ts:1234567890]" must stay exactly as-is). Do NOT remove or change any [ts:...] markers.\n\n{{content}}`,

  audio: `Chuyển bài viết sau thành script đọc audio (podcast/voiceover) bằng tiếng Việt. Yêu cầu:\n- Viết theo thể nói, tự nhiên khi đọc thành tiếng\n- Bỏ các ký hiệu khó đọc (bullet, số thứ tự, dấu gạch ngang đầu dòng)\n- Giữ nguyên nội dung, không thêm không bớt thông tin\n- Dùng từ nối tự nhiên giữa các đoạn\n- Không thêm lời mở đầu hay kết thúc của chính mình\n\nBài viết:\n{{content}}`,
};

export function getPrompts(): Record<PromptKey, string> {
  const keys: PromptKey[] = ['reddit', 'workplace', 'zhihu', 'audio'];
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
