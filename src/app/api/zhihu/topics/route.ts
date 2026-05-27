import { NextRequest, NextResponse } from 'next/server';
import { getZhihuTopics, setZhihuTopics } from '@/lib/zhihu-topics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({ topics: getZhihuTopics() });
}

export async function POST(req: NextRequest) {
  const { topics } = await req.json() as { topics: unknown };
  return NextResponse.json({ topics: setZhihuTopics(topics) });
}
