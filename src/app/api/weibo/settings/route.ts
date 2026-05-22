import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const envPath = path.join(process.cwd(), '.env.local');

async function readEnvRaw() {
  return readFile(envPath, 'utf8').catch(() => '');
}

export function parseEnvValue(raw: string, key: string): string {
  const match = raw.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
}

export async function patchEnv(key: string, value: string) {
  const raw = await readEnvRaw();
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  const patched = pattern.test(raw) ? raw.replace(pattern, line) : `${raw.trimEnd()}\n${line}\n`;
  await writeFile(envPath, patched, 'utf8');
}

function mask(value: string) {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : '';
}

export async function GET() {
  const raw = await readEnvRaw();
  return NextResponse.json({
    appKey: parseEnvValue(raw, 'WEIBO_APP_KEY'),
    hasSecret: !!parseEnvValue(raw, 'WEIBO_APP_SECRET'),
    token: mask(parseEnvValue(raw, 'WEIBO_ACCESS_TOKEN')),
    uid: parseEnvValue(raw, 'WEIBO_UID'),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { appKey?: string; appSecret?: string };
  if (body.appKey?.trim()) await patchEnv('WEIBO_APP_KEY', body.appKey.trim());
  if (body.appSecret?.trim()) await patchEnv('WEIBO_APP_SECRET', body.appSecret.trim());
  const raw = await readEnvRaw();
  return NextResponse.json({
    appKey: parseEnvValue(raw, 'WEIBO_APP_KEY'),
    hasSecret: !!parseEnvValue(raw, 'WEIBO_APP_SECRET'),
    token: mask(parseEnvValue(raw, 'WEIBO_ACCESS_TOKEN')),
    uid: parseEnvValue(raw, 'WEIBO_UID'),
  });
}
