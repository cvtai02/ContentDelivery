import { NextRequest, NextResponse } from 'next/server';
import { getSetting } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest) {
  const appKey = getSetting('WEIBO_APP_KEY');

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
