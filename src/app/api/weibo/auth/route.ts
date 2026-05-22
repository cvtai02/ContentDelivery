import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const envPath = path.join(process.cwd(), '.env.local');

function parseEnvValue(raw: string, key: string): string {
  const match = raw.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
}

export async function GET(req: NextRequest) {
  const raw = await readFile(envPath, 'utf8').catch(() => '');
  const appKey = parseEnvValue(raw, 'WEIBO_APP_KEY');

  if (!appKey) {
    return NextResponse.json({ error: 'WEIBO_APP_KEY chưa được cấu hình' }, { status: 400 });
  }

  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/weibo/callback`;
  const authUrl = new URL('https://api.weibo.com/oauth2/authorize');
  authUrl.searchParams.set('client_id', appKey);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);

  return NextResponse.redirect(authUrl.toString());
}
