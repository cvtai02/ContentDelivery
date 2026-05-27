import { NextRequest, NextResponse } from 'next/server';
import { cancelCodexJob } from '@/lib/codex-jobs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { jobId } = await req.json() as { jobId?: string };
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  return NextResponse.json({ cancelled: cancelCodexJob(jobId) });
}
