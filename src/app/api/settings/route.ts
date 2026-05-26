import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting, listFacebookTargets, upsertFacebookTarget } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GRAPH = 'https://graph.facebook.com/v20.0';

function mask(value: string) {
  return value ? `${value.slice(0, 8)}…${value.slice(-4)}` : '';
}

async function graphGet(url: string) {
  const res = await fetch(url);
  const data = await res.json() as { error?: { message: string } };
  if (!res.ok || data.error) throw new Error(data.error?.message ?? `HTTP ${res.status}`);
  return data;
}

export function GET() {
  const targets = listFacebookTargets();
  return NextResponse.json({
    appId: getSetting('FACEBOOK_APP_ID'),
    appSecret: mask(getSetting('FACEBOOK_APP_SECRET')),
    targets: targets.map((t) => ({ id: t.id, name: t.name, token: mask(t.token) })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    appId?: string;
    appSecret?: string;
    userToken?: string;
    pageId?: string;
  };

  if (body.appId?.trim()) setSetting('FACEBOOK_APP_ID', body.appId.trim());
  if (body.appSecret?.trim()) setSetting('FACEBOOK_APP_SECRET', body.appSecret.trim());

  const appId = getSetting('FACEBOOK_APP_ID');
  const appSecret = getSetting('FACEBOOK_APP_SECRET');

  if (!body.userToken?.trim()) {
    const targets = listFacebookTargets();
    return NextResponse.json({
      appId,
      appSecret: mask(appSecret),
      targets: targets.map((t) => ({ id: t.id, name: t.name, token: mask(t.token) })),
    });
  }

  if (!appId || !appSecret) {
    return NextResponse.json({ error: 'App ID và App Secret là bắt buộc để đổi token' }, { status: 400 });
  }

  try {
    const { access_token: longToken } = await graphGet(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${body.userToken.trim()}`,
    ) as { access_token: string };

    const { data: pages } = await graphGet(
      `${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${longToken}`,
    ) as { data: Array<{ id: string; name: string; access_token: string }> };

    if (!pages?.length) throw new Error('Không tìm thấy trang Facebook nào trong tài khoản này.');

    const page = body.pageId ? pages.find((p) => p.id === body.pageId) : pages[0];
    if (!page) throw new Error(`Không tìm thấy page ${body.pageId}. Có sẵn: ${pages.map((p) => `${p.name} (${p.id})`).join(', ')}`);

    upsertFacebookTarget({ id: page.id, name: page.name, token: page.access_token });

    const targets = listFacebookTargets();
    return NextResponse.json({
      appId,
      appSecret: mask(appSecret),
      targets: targets.map((t) => ({ id: t.id, name: t.name, token: mask(t.token) })),
      added: page.name,
      availablePages: pages.map((p) => ({ id: p.id, name: p.name })),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Token exchange failed' }, { status: 500 });
  }
}
