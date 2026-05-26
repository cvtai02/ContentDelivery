import { NextRequest, NextResponse } from 'next/server';
import { getAllSectionSettings, setSectionTargetId } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json(getAllSectionSettings());
}

export async function POST(req: NextRequest) {
  const { section, facebookTargetId } = await req.json() as { section: string; facebookTargetId: string | null };
  setSectionTargetId(section, facebookTargetId ?? null);
  return NextResponse.json(getAllSectionSettings());
}
