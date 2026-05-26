export async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const mime = res.headers.get('content-type')?.split(';')[0] ?? 'image/png';
    return `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`;
  } catch {
    return null;
  }
}

export async function getDiceBearAvatar(seed: string): Promise<string> {
  const url = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  return (await fetchAsDataUrl(url)) ?? url;
}

export async function getRedditAvatar(username: string): Promise<string | null> {
  if (!username || username === '[deleted]') return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
      headers: { 'User-Agent': 'MyNews/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const raw: string = data?.data?.snoovatar_img || data?.data?.icon_img || '';
    if (!raw || raw.includes('placeholder')) return null;
    return fetchAsDataUrl(raw.replace(/&amp;/g, '&'));
  } catch {
    return null;
  }
}
