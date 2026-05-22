import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const envPath = path.join(process.cwd(), '.env.local');

type SectionConfig = { facebookTargetId: string | null };
type SectionSettings = Record<string, SectionConfig>;

async function readEnvRaw() {
  return readFile(envPath, 'utf8').catch(() => '');
}

function parseEnvValue(raw: string, key: string): string {
  const match = raw.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
}

async function patchEnv(key: string, value: string) {
  const raw = await readEnvRaw();
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  const patched = pattern.test(raw) ? raw.replace(pattern, line) : `${raw.trimEnd()}\n${line}\n`;
  await writeFile(envPath, patched, 'utf8');
}

function parseSectionSettings(raw: string): SectionSettings {
  try { return JSON.parse(raw); } catch { return {}; }
}

export async function GET() {
  const raw = await readEnvRaw();
  const settings = parseSectionSettings(parseEnvValue(raw, 'SECTION_SETTINGS'));
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const { section, facebookTargetId } = await req.json() as { section: string; facebookTargetId: string | null };

  const raw = await readEnvRaw();
  const settings = parseSectionSettings(parseEnvValue(raw, 'SECTION_SETTINGS'));
  settings[section] = { ...settings[section], facebookTargetId: facebookTargetId ?? null };

  await patchEnv('SECTION_SETTINGS', JSON.stringify(settings));
  return NextResponse.json(settings);
}
