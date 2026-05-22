import { NextRequest, NextResponse } from 'next/server';
import { publishTextToFacebook, publishWithImageToFacebook } from '@/lib/facebook';
import { getSectionTargetId } from '@/lib/section-settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { content, imageUrl } = await req.json() as { content: string; imageUrl?: string };

  if (!content) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  }

  try {
    const targetId = await getSectionTargetId('zhihu');
    const result = imageUrl
      ? await publishWithImageToFacebook(content, imageUrl, targetId)
      : await publishTextToFacebook(content, targetId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to post to Facebook' },
      { status: 500 },
    );
  }
}
