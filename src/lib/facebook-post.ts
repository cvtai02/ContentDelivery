import { NextRequest, NextResponse } from 'next/server';
import { publishTextToFacebook, publishWithImageToFacebook } from '@/lib/facebook';
import { getSectionTargetId } from '@/lib/section-settings';

export async function handleFacebookPost(req: NextRequest, section: string) {
  const { content, imageUrl } = await req.json() as { content: string; imageUrl?: string };

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  }

  try {
    const targetId = getSectionTargetId(section);
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
