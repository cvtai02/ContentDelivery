import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const envPath = path.join(process.cwd(), '.env.local');

function parseEnvValue(raw: string, key: string): string {
  const match = raw.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
}

async function patchEnv(key: string, value: string) {
  const raw = await readFile(envPath, 'utf8').catch(() => '');
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  const patched = pattern.test(raw) ? raw.replace(pattern, line) : `${raw.trimEnd()}\n${line}\n`;
  await writeFile(envPath, patched, 'utf8');
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const origin = req.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/?weibo_error=no_code`);
  }

  const raw = await readFile(envPath, 'utf8').catch(() => '');
  const appKey = parseEnvValue(raw, 'WEIBO_APP_KEY');
  const appSecret = parseEnvValue(raw, 'WEIBO_APP_SECRET');

  if (!appKey || !appSecret) {
    return NextResponse.redirect(`${origin}/?weibo_error=missing_credentials`);
  }

  try {
    const redirectUri = `${origin}/api/weibo/callback`;
    const params = new URLSearchParams({
      client_id: appKey,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const res = await fetch('https://api.weibo.com/oauth2/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await res.json() as { access_token?: string; uid?: string; error?: string; error_description?: string };

    if (!res.ok || !data.access_token) {
      const msg = data.error_description ?? data.error ?? `HTTP ${res.status}`;
      return NextResponse.redirect(`${origin}/?weibo_error=${encodeURIComponent(msg)}`);
    }

    await patchEnv('WEIBO_ACCESS_TOKEN', data.access_token);
    if (data.uid) await patchEnv('WEIBO_UID', data.uid);

    return NextResponse.redirect(`${origin}/?weibo_success=1`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.redirect(`${origin}/?weibo_error=${encodeURIComponent(msg)}`);
  }
}
