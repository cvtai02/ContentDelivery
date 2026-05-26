export type RedditContentDto = {
  title: string;
  body: string;
  comments: Array<{
    text: string;
    replies: string[];
  }>;
};

export type RedditMeta = {
  postAuthor: string;
  postScore: number;
  comments: Array<{
    author: string;
    score: number;
    replies: Array<{ author: string; score: number }>;
  }>;
};

import type { PostBlock } from '@/lib/parseThreadsPost';

export function applyTranslation(blocks: PostBlock[], translated: RedditContentDto): PostBlock[] {
  const result: PostBlock[] = [];
  let bi = 0;

  if (blocks[bi]) {
    const text = [translated.title, translated.body].filter(Boolean).join('\n\n');
    result.push({ ...blocks[bi++], text });
  }

  for (let ci = 0; ci < translated.comments.length; ci++) {
    if (blocks[bi]) result.push({ ...blocks[bi++], text: translated.comments[ci].text });
    for (let ri = 0; ri < translated.comments[ci].replies.length; ri++) {
      if (blocks[bi]) result.push({ ...blocks[bi++], text: translated.comments[ci].replies[ri] });
    }
  }

  return result;
}

export function formatFacebookPostFromBlocks(blocks: PostBlock[]): string {
  if (blocks.length === 0) return '';
  const parts: string[] = [];

  const main = blocks[0];
  const sep = main.text.indexOf('\n\n');
  const title = sep >= 0 ? main.text.slice(0, sep) : main.text;
  const body = sep >= 0 ? main.text.slice(sep + 2) : '';
  parts.push(body ? `${title.toUpperCase()}\n\n${body}` : title.toUpperCase());

  let commentIdx = 0;
  let i = 1;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.isReply) { i++; continue; }
    commentIdx++;
    let block = `${commentIdx}. ${b.text}`;
    let j = i + 1;
    while (j < blocks.length && blocks[j].isReply) {
      block += `\n  ↳ ${blocks[j].text}`;
      j++;
    }
    parts.push(block);
    i = j;
  }

  return parts.join('\n\n---------\n\n');
}

export function formatFacebookPost(translated: RedditContentDto, meta: RedditMeta): string {
  const parts: string[] = [];

  const header = translated.title.toUpperCase();
  const intro = translated.body ? `${header}\n\n${translated.body}` : header;
  parts.push(intro);

  translated.comments.forEach((comment, i) => {
    const cmeta = meta.comments[i];
    let block = `${i + 1}. ${cmeta.author} · ${cmeta.score} likes\n${comment.text}`;
    comment.replies.forEach((reply, j) => {
      const rmeta = cmeta.replies[j];
      block += `\n  ↳ ${rmeta.author} · ${rmeta.score} likes: ${reply}`;
    });
    parts.push(block);
  });

  return parts.join('\n\n---------\n\n');
}
