import { getSetting } from '@/lib/db';

/**
 * App-only (client_credentials) OAuth for Reddit.
 *
 * Reads REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET from the settings table
 * (configure via the Settings UI). When credentials are present, requests go
 * to oauth.reddit.com with a cached bearer token — far higher rate limits than
 * the anonymous endpoints. When they're absent (or the token request fails),
 * we transparently fall back to the public www.reddit.com *.json endpoints so
 * the app keeps working without configuration.
 */

const USER_AGENT = 'Hot-post-every-day/1.0 by cvtai105';
const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const OAUTH_BASE = 'https://oauth.reddit.com';
const PUBLIC_BASE = 'https://www.reddit.com';

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string | null> {
  const clientId = getSetting('REDDIT_CLIENT_ID');
  const clientSecret = getSetting('REDDIT_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    cachedToken = null;
    throw new Error(`Reddit OAuth token request failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  // Renew a minute before the real expiry to avoid mid-flight 401s.
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

/**
 * Fetch a Reddit API path (e.g. `/r/pics/hot.json?limit=3`). Uses the
 * authenticated oauth.reddit.com host when credentials are configured,
 * otherwise the anonymous www.reddit.com host. Always sets a descriptive
 * User-Agent (required by Reddit). Extra init (signal, etc.) is forwarded.
 */
export async function redditFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAppToken().catch(() => null);
  const headers = new Headers(init.headers);
  headers.set('User-Agent', USER_AGENT);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${OAUTH_BASE}${path}`, { ...init, headers });
  }

  return fetch(`${PUBLIC_BASE}${path}`, { ...init, headers });
}

export function isRedditOAuthConfigured(): boolean {
  return Boolean(getSetting('REDDIT_CLIENT_ID') && getSetting('REDDIT_CLIENT_SECRET'));
}
