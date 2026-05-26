import { NextRequest, NextResponse } from 'next/server';
import { findImage } from '@/lib/find-image';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? '';
  const url = await findImage(query);
  const source = url ? (url.includes('wikimedia') ? 'wikimedia' : 'meme') : null;
  return NextResponse.json({ url, source });
}
