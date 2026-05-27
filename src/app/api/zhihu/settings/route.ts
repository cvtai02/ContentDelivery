import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function mask(value: string) {
  return value ? `${value.slice(0, 8)}...${value.slice(-4)}` : '';
}

export function GET() {
  return NextResponse.json({
    topicCookie: mask(getSetting('ZHIHU_TOPIC_COOKIE')),
    xZse93: getSetting('ZHIHU_TOPIC_X_ZSE_93'),
    xZse96: mask(getSetting('ZHIHU_TOPIC_X_ZSE_96')),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    topicCookie?: string;
    xZse93?: string;
    xZse96?: string;
  };

  if (typeof body.topicCookie === 'string') {
    setSetting('ZHIHU_TOPIC_COOKIE', body.topicCookie.trim());
  }
  if (typeof body.xZse93 === 'string') {
    setSetting('ZHIHU_TOPIC_X_ZSE_93', body.xZse93.trim());
  }
  if (typeof body.xZse96 === 'string') {
    setSetting('ZHIHU_TOPIC_X_ZSE_96', body.xZse96.trim());
  }

  return GET();
}
