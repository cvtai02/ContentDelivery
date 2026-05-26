export type ThreadsBlock = {
  text: string;
  isMain: boolean;
  isReply?: boolean;
  author?: string;
  score?: number;
  createdAt?: number;
};

export function parseThreadsPost(content: string): ThreadsBlock[] {
  const SEPARATOR = /\n-{9}\n/;
  const parts = content.split(SEPARATOR).map((s) => s.trim()).filter(Boolean);
  return parts.map((text, i) => ({ text, isMain: i === 0 }));
}

const LIKES_PAT = /(?:likes?|lượt thích)/.source;
const HEADER_RE = new RegExp(`^\\d+\\.\\s+(.+?)\\s+-\\s+(\\d+)\\s+${LIKES_PAT}\\.`);
const REPLY_RE  = new RegExp(`^(.+?)\\s+-\\s+(\\d+)\\s+${LIKES_PAT}:\\s+([\\s\\S]+)$`);

export function parseCodexToBlocks(content: string): ThreadsBlock[] {
  const parts = content.split(/\n-{9}\n/).map((s) => s.trim()).filter(Boolean);
  const blocks: ThreadsBlock[] = [];

  parts.forEach((part, i) => {
    if (i === 0) {
      blocks.push({ text: part, isMain: true });
      return;
    }

    const [commentPart, ...replyParts] = part.split(/\n\s+↳\s+/);

    const lines = commentPart.split('\n');
    const headerMatch = lines[0].match(HEADER_RE);
    blocks.push(headerMatch ? {
      text: lines.slice(1).join('\n').trim(),
      author: headerMatch[1].trim(),
      score: parseInt(headerMatch[2], 10),
      isMain: false,
    } : { text: commentPart.trim(), isMain: false });

    for (const reply of replyParts) {
      const replyMatch = reply.match(REPLY_RE);
      blocks.push(replyMatch ? {
        text: replyMatch[3].trim(),
        author: replyMatch[1].trim(),
        score: parseInt(replyMatch[2], 10),
        isMain: false,
        isReply: true,
      } : { text: reply.trim(), isMain: false, isReply: true });
    }
  });

  return blocks;
}
