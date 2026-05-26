import { NextResponse } from 'next/server';
import { listFacebookPages } from '@/lib/facebook';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  try {
    const pages = listFacebookPages();

    return NextResponse.json({
      pages,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot read Facebook pages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
