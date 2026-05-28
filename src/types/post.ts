export enum PostLanguage {
  Vietnamese = 'Vietnamese',
  English = 'English',
}

export type PostStatus = 'none' | 'generating' | 'ready' | 'error';

export type PostState = {
  status: Exclude<PostStatus, 'none'>;
  content: string;
  imageUrl: string | null;
  url?: string | null;
  error: string;
};
