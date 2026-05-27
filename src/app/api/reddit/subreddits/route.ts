import { NextRequest, NextResponse } from 'next/server';
import { getRedditSubreddits, setRedditSubreddits } from '@/lib/reddit-subreddits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({ subreddits: getRedditSubreddits() });
}

export async function POST(req: NextRequest) {
  const { subreddits } = await req.json() as { subreddits: unknown };
  return NextResponse.json({ subreddits: setRedditSubreddits(subreddits) });
}
