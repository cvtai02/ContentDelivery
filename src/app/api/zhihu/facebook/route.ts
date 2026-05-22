import { NextRequest, NextResponse } from 'next/server';
import { publishTextToFacebook, publishWithImageToFacebook } from '@/lib/facebook';

export async function POST(req: NextRequest) {
  const { content, imageUrl } = await req.json() as { content: string; imageUrl?: string };

  if (!content) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  }

  try {
    const result = imageUrl
      ? await publishWithImageToFacebook(content, imageUrl, 'Reddeibo')
      : await publishTextToFacebook(content, 'Reddeibo');
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to post to Facebook' },
      { status: 500 },
    );
  }
}
