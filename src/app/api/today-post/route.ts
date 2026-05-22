import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';
import type { TodayPost } from '@/types/today-post';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);

const postPath = path.join(process.cwd(), 'src', 'data', 'today-post.json');
const scriptPath = path.join(process.cwd(), 'scripts', 'generate-today-post.mjs');
let pendingPost: Promise<TodayPost> | null = null;
type TodayPostProvider = 'codex' | 'claude';

async function readPost(): Promise<TodayPost> {
  return JSON.parse(await readFile(postPath, 'utf8')) as TodayPost;
}

export async function GET() {
  try {
    return NextResponse.json(await readPost(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'today post not found' }, { status: 404 });
  }
}

export async function POST(req: Request) {
  if (pendingPost) {
    return NextResponse.json(
      { error: 'Today Post is already generating. Please wait for the current request to finish.' },
      { status: 409 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const provider: TodayPostProvider = body.provider === 'claude' ? 'claude' : 'codex';
    const location: string = ['vietnam', 'asia', 'world'].includes(body.location) ? body.location : 'vietnam';

    pendingPost = (async () => {
      const current = await readPost().catch(() => null);
      const args = [scriptPath, '--force', `--provider=${provider}`, `--location=${location}`];

      if (current?.topic) {
        args.push(`--avoid-topic=${current.topic}`);
      }

      await execFileAsync(process.execPath, args, {
        cwd: process.cwd(),
        timeout: 150_000,
        windowsHide: true,
      });

      return readPost();
    })();

    const post = await pendingPost;

    return NextResponse.json(post, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes('timed out')
        ? 'The selected provider took too long to generate a topic. Please try again.'
        : error instanceof Error
          ? error.message
          : 'failed to generate today post';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    pendingPost = null;
  }
}
