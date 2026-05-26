import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const origin = req.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/?weibo_error=no_code`);
  }

  const appKey = getSetting('WEIBO_APP_KEY');
  const appSecret = getSetting('WEIBO_APP_SECRET');

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

    setSetting('WEIBO_ACCESS_TOKEN', data.access_token);
    if (data.uid) setSetting('WEIBO_UID', data.uid);

    return NextResponse.redirect(`${origin}/?weibo_success=1`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.redirect(`${origin}/?weibo_error=${encodeURIComponent(msg)}`);
  }
}
