import type { TodayPost } from '@/types/today-post';
import { createTodayPostIllustrationSvg } from '@/lib/today-post-illustration';
import sharp from 'sharp';

const GRAPH_BASE_URL = 'https://graph.facebook.com/v20.0';

export type FacebookTarget = {
  id: string;
  name: string;
  token: string;
};

type FacebookPostResponse = {
  id?: string;
  post_id?: string;
  error?: { message?: string };
};

export function listTargets(): FacebookTarget[] {
  const raw = process.env.FACEBOOK_TARGETS;
  if (!raw) return [];
  try {
    return JSON.parse(raw) as FacebookTarget[];
  } catch {
    return [];
  }
}

function getTarget(targetIdOrName?: string): FacebookTarget {
  const targets = listTargets();
  if (!targets.length) throw new Error('No Facebook targets configured in FACEBOOK_TARGETS');
  if (targetIdOrName) {
    const q = targetIdOrName.toLowerCase();
    const t = targets.find((t) => t.id === targetIdOrName || t.name.toLowerCase() === q);
    if (!t) throw new Error(`Facebook target "${targetIdOrName}" not found`);
    return t;
  }
  return targets[0];
}

async function readFacebookError(res: Response) {
  const data = (await res.json().catch(() => null)) as FacebookPostResponse | null;
  return data?.error?.message || `Facebook API error: ${res.status}`;
}

function buildTodayPostMessage(post: TodayPost) {
  const body = post.body.join('\n\n');
  const tags = post.tags.map((tag) => `#${tag.replace(/\s+/g, '')}`).join(' ');
  return [post.title, '', post.excerpt, '', body, '', post.callToAction, '', tags]
    .filter(Boolean)
    .join('\n');
}

export async function publishTodayPostToFacebook(post: TodayPost, targetId?: string) {
  const target = getTarget(targetId);
  const illustration = createTodayPostIllustrationSvg({
    date: post.date,
    topic: post.topic,
    title: post.title,
    imagePrompt: post.imagePrompt,
  });
  const image = await sharp(Buffer.from(illustration)).png().toBuffer();
  const imagePart = image.buffer.slice(image.byteOffset, image.byteOffset + image.byteLength) as ArrayBuffer;

  const form = new FormData();
  form.append('message', buildTodayPostMessage(post));
  form.append('access_token', target.token);
  form.append('source', new Blob([imagePart], { type: 'image/png' }), 'today-post.png');

  const res = await fetch(`${GRAPH_BASE_URL}/${target.id}/photos`, {
    method: 'POST',
    body: form,
    cache: 'no-store',
  });

  const data = (await res.json().catch(() => null)) as FacebookPostResponse | null;
  if (!res.ok) throw new Error(data?.error?.message || `Facebook API error: ${res.status}`);

  const postId = data?.id || data?.post_id;
  if (!postId) throw new Error('Facebook did not return a post id');

  return { targetId: target.id, targetName: target.name, postId, url: `https://www.facebook.com/${postId}` };
}

export async function publishWithImageToFacebook(message: string, imageUrl: string, targetId?: string) {
  const target = getTarget(targetId);

  let imageBuffer: Buffer;
  let mimeType: string;

  if (imageUrl.startsWith('data:')) {
    const [header, b64] = imageUrl.split(',');
    mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/png';
    imageBuffer = Buffer.from(b64, 'base64');
  } else {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
    mimeType = res.headers.get('content-type') ?? 'image/jpeg';
    imageBuffer = Buffer.from(await res.arrayBuffer());
  }

  const form = new FormData();
  form.append('message', message);
  form.append('access_token', target.token);
  form.append('source', new Blob([imageBuffer], { type: mimeType }), 'post-image.jpg');

  const res = await fetch(`${GRAPH_BASE_URL}/${target.id}/photos`, {
    method: 'POST',
    body: form,
    cache: 'no-store',
  });

  const data = (await res.json().catch(() => null)) as FacebookPostResponse | null;
  if (!res.ok) throw new Error(data?.error?.message || `Facebook API error: ${res.status}`);

  const postId = data?.id || data?.post_id;
  if (!postId) throw new Error('Facebook did not return a post id');

  return { targetId: target.id, targetName: target.name, postId, url: `https://www.facebook.com/${postId}` };
}

export async function publishTextToFacebook(message: string, targetId?: string) {
  const target = getTarget(targetId);

  const form = new FormData();
  form.append('message', message);
  form.append('access_token', target.token);

  const res = await fetch(`${GRAPH_BASE_URL}/${target.id}/feed`, {
    method: 'POST',
    body: form,
    cache: 'no-store',
  });

  const data = (await res.json().catch(() => null)) as FacebookPostResponse | null;
  if (!res.ok) throw new Error(await readFacebookError(res));

  const postId = data?.id;
  return { targetId: target.id, targetName: target.name, postId, url: `https://www.facebook.com/${postId}` };
}
