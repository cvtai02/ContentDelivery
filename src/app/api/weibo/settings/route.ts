import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function mask(value: string) {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : '';
}

function currentState() {
  return {
    appKey: getSetting('WEIBO_APP_KEY'),
    hasSecret: !!getSetting('WEIBO_APP_SECRET'),
    token: mask(getSetting('WEIBO_ACCESS_TOKEN')),
    uid: getSetting('WEIBO_UID'),
  };
}

export function GET() {
  return NextResponse.json(currentState());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { appKey?: string; appSecret?: string };
  if (body.appKey?.trim()) setSetting('WEIBO_APP_KEY', body.appKey.trim());
  if (body.appSecret?.trim()) setSetting('WEIBO_APP_SECRET', body.appSecret.trim());
  return NextResponse.json(currentState());
}
