import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache');

type CacheEntry<T> = { data: T; cachedAt: number };

function filePath(key: string): string {
  const safe = key.replace(/[^a-z0-9_-]/gi, '_');
  return path.join(CACHE_DIR, `${safe}.json`);
}

function readEntry<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = fs.readFileSync(filePath(key), 'utf8');
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

function writeEntry<T>(key: string, data: T): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(filePath(key), JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {
    // non-fatal
  }
}

export async function withCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  opts?: { force?: boolean },
): Promise<T> {
  const entry = readEntry<T>(key);

  if (!opts?.force && entry && Date.now() - entry.cachedAt < ttlMs) {
    return entry.data;
  }

  try {
    const data = await fetcher();
    writeEntry(key, data);
    return data;
  } catch (err) {
    if (entry) return entry.data;
    throw err;
  }
}
