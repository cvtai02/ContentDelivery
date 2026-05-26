export type PostBlock = {
  text: string;
  isMain: boolean;
  isReply?: boolean;
  author?: string;
  avatarUrl?: string;
  score?: number;
  createdAt?: number;
};

export function parseThreadsPost(content: string): PostBlock[] {
  const SEPARATOR = /\n-{9}\n/;
  const parts = content.split(SEPARATOR).map((s) => s.trim()).filter(Boolean);
  return parts.map((text, i) => ({ text, isMain: i === 0 }));
}

const LIKES_PAT = /(?:likes?|lượt thích)/.source;
const HEADER_RE = new RegExp(`^\\d+\\.\\s+(.+?)\\s+-\\s+(\\d+)\\s+${LIKES_PAT}\\.(?:\\s+\\[ts:(\\d+)\\])?`);
const REPLY_RE  = new RegExp(`^(.+?)\\s+-\\s+(\\d+)\\s+${LIKES_PAT}(?:\\s+\\[ts:(\\d+)\\])?:\\s+([\\s\\S]+)$`);

export function parseCodexToBlocks(content: string): PostBlock[] {
  const parts = content.split(/\n-{9}\n/).map((s) => s.trim()).filter(Boolean);
  const blocks: PostBlock[] = [];

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
      createdAt: headerMatch[3] ? parseInt(headerMatch[3], 10) : undefined,
      isMain: false,
    } : { text: commentPart.trim(), isMain: false });

    for (const reply of replyParts) {
      const replyMatch = reply.match(REPLY_RE);
      blocks.push(replyMatch ? {
        text: replyMatch[4].trim(),
        author: replyMatch[1].trim(),
        score: parseInt(replyMatch[2], 10),
        createdAt: replyMatch[3] ? parseInt(replyMatch[3], 10) : undefined,
        isMain: false,
        isReply: true,
      } : { text: reply.trim(), isMain: false, isReply: true });
    }
  });

  return blocks;
}
