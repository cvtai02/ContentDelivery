import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function getSectionTargetId(section: string): Promise<string | undefined> {
  const envPath = path.join(process.cwd(), '.env.local');
  const raw = await readFile(envPath, 'utf8').catch(() => '');
  const match = raw.match(/^SECTION_SETTINGS=(.*)$/m);
  if (!match) return undefined;
  try {
    const settings = JSON.parse(match[1].trim()) as Record<string, { facebookTargetId: string | null }>;
    return settings[section]?.facebookTargetId ?? undefined;
  } catch {
    return undefined;
  }
}
