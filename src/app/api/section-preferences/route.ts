import { NextRequest, NextResponse } from 'next/server';
import { getSectionPreferences, setSectionPreferences } from '@/lib/section-preferences';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json(getSectionPreferences());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    redditDefaultPostLimit?: number;
    zhihuTopicDefaultPostLimit?: number;
  };

  return NextResponse.json(setSectionPreferences(body));
}
