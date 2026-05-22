export interface TodayPost {
  date: string;
  topic: string;
  title: string;
  excerpt: string;
  body: string[];
  tags: string[];
  callToAction: string;
  imagePrompt: string;
  imageUrl?: string;
  generatedAt: string;
  source: 'codex' | 'claude' | 'fallback';
}
