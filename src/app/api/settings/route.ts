import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const envPath = path.join(process.cwd(), '.env.local');
const GRAPH = 'https://graph.facebook.com/v20.0';

type Target = { id: string; name: string; token: string };

async function readEnvRaw() {
  return readFile(envPath, 'utf8').catch(() => '');
}

function parseEnvValue(raw: string, key: string): string {
  const match = raw.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
}

async function patchEnv(key: string, value: string) {
  const raw = await readEnvRaw();
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  const patched = pattern.test(raw) ? raw.replace(pattern, line) : `${raw.trimEnd()}\n${line}\n`;
  await writeFile(envPath, patched, 'utf8');
}

function parseTargets(raw: string): Target[] {
  try { return JSON.parse(raw) as Target[]; } catch { return []; }
}

function mask(value: string) {
  return value ? `${value.slice(0, 8)}…${value.slice(-4)}` : '';
}

async function graphGet(url: string) {
  const res = await fetch(url);
  const data = await res.json() as { error?: { message: string } };
  if (!res.ok || data.error) throw new Error(data.error?.message ?? `HTTP ${res.status}`);
  return data;
}

// GET — return current config (credentials masked)
export async function GET() {
  const raw = await readEnvRaw();
  const targets = parseTargets(parseEnvValue(raw, 'FACEBOOK_TARGETS'));
  return NextResponse.json({
    appId: parseEnvValue(raw, 'FACEBOOK_APP_ID'),
    appSecret: mask(parseEnvValue(raw, 'FACEBOOK_APP_SECRET')),
    targets: targets.map((t) => ({ id: t.id, name: t.name, token: mask(t.token) })),
  });
}

// POST — save credentials and/or exchange user token → add page target
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    appId?: string;
    appSecret?: string;
    userToken?: string;
    pageId?: string;
  };

  const raw = await readEnvRaw();

  // Persist app credentials if provided
  const appId = body.appId?.trim() || parseEnvValue(raw, 'FACEBOOK_APP_ID');
  const appSecret = body.appSecret?.trim() || parseEnvValue(raw, 'FACEBOOK_APP_SECRET');

  if (body.appId?.trim()) await patchEnv('FACEBOOK_APP_ID', body.appId.trim());
  if (body.appSecret?.trim()) await patchEnv('FACEBOOK_APP_SECRET', body.appSecret.trim());
  if (body.userToken?.trim()) await patchEnv('FACEBOOK_ACCESS_TOKEN', body.userToken.trim());

  // If no userToken provided, just save credentials and return
  if (!body.userToken?.trim()) {
    const updated = await readEnvRaw();
    const targets = parseTargets(parseEnvValue(updated, 'FACEBOOK_TARGETS'));
    return NextResponse.json({
      appId: parseEnvValue(updated, 'FACEBOOK_APP_ID'),
      appSecret: mask(parseEnvValue(updated, 'FACEBOOK_APP_SECRET')),
      targets: targets.map((t) => ({ id: t.id, name: t.name, token: mask(t.token) })),
    });
  }

  if (!appId || !appSecret) {
    return NextResponse.json({ error: 'App ID và App Secret là bắt buộc để đổi token' }, { status: 400 });
  }

  try {
    // Exchange short-lived → long-lived user token
    const { access_token: longToken } = await graphGet(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${body.userToken.trim()}`,
    ) as { access_token: string };

    // Fetch all pages for this account
    const { data: pages } = await graphGet(
      `${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${longToken}`,
    ) as { data: Array<{ id: string; name: string; access_token: string }> };

    if (!pages?.length) throw new Error('Không tìm thấy trang Facebook nào trong tài khoản này.');

    const page = body.pageId ? pages.find((p) => p.id === body.pageId) : pages[0];
    if (!page) throw new Error(`Không tìm thấy page ${body.pageId}. Có sẵn: ${pages.map((p) => `${p.name} (${p.id})`).join(', ')}`);

    const updatedRaw = await readEnvRaw();
    const targets = parseTargets(parseEnvValue(updatedRaw, 'FACEBOOK_TARGETS'));
    const idx = targets.findIndex((t) => t.id === page.id);
    const entry: Target = { id: page.id, name: page.name, token: page.access_token };
    if (idx >= 0) targets[idx] = entry; else targets.push(entry);

    await patchEnv('FACEBOOK_TARGETS', JSON.stringify(targets));

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
