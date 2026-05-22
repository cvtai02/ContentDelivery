import { NextResponse } from 'next/server';
import { getWeiboHotSearch } from '@/lib/weibo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const topics = await getWeiboHotSearch();
    return NextResponse.json({ topics }, { headers: { 'Cache-Control': 'max-age=300' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to fetch Weibo hot search' }, { status: 500 });
  }
}
