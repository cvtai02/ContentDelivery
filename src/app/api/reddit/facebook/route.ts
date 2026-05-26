import { NextRequest } from 'next/server';
import { handleFacebookPost } from '@/lib/facebook-post';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function POST(req: NextRequest) {
  return handleFacebookPost(req, 'reddit');
}
