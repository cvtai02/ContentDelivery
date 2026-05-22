/**
 * Exchange a Facebook user token for a never-expiring Page Access Token,
 * then append (or update) it in the FACEBOOK_TARGETS array in .env.local.
 *
 * Usage:
 *   node scripts/facebook-token.mjs [--page-id=PAGE_ID]
 *
 * Requires in .env.local:
 *   FACEBOOK_ACCESS_TOKEN   — fresh user token from developers.facebook.com/tools/explorer
 *   FACEBOOK_APP_ID         — from your app → Settings → Basic
 *   FACEBOOK_APP_SECRET     — same place
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
const GRAPH = 'https://graph.facebook.com/v20.0';

const pageIdArg = process.argv.find((a) => a.startsWith('--page-id='));
const targetPageId = pageIdArg?.slice('--page-id='.length);

async function loadEnv() {
  const raw = await readFile(envPath, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
  return env;
}

async function patchEnv(key, value) {
  const raw = await readFile(envPath, 'utf8');
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  const patched = pattern.test(raw) ? raw.replace(pattern, line) : `${raw.trimEnd()}\n${line}\n`;
  await writeFile(envPath, patched, 'utf8');
}

async function get(url, label) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`${label}: ${data.error?.message ?? res.status}`);
  return data;
}

async function main() {
  const env = await loadEnv();
  const { FACEBOOK_ACCESS_TOKEN: userToken, FACEBOOK_APP_ID: appId, FACEBOOK_APP_SECRET: appSecret } = env;

  if (!userToken) throw new Error('FACEBOOK_ACCESS_TOKEN missing');
  if (!appId) throw new Error('FACEBOOK_APP_ID missing');
  if (!appSecret) throw new Error('FACEBOOK_APP_SECRET missing');

  // Step 1: short-lived → long-lived user token
  console.log('Step 1: Exchanging for long-lived user token…');
  const { access_token: longToken } = await get(
    `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userToken}`,
    'Token exchange',
  );
  console.log('  Done.');

  // Step 2: get page access tokens (never expire)
  console.log('Step 2: Fetching page list…');
  const { data: pages } = await get(`${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${longToken}`, 'Accounts');

  if (!pages?.length) throw new Error('No Facebook Pages found.');

  const page = targetPageId ? pages.find((p) => p.id === targetPageId) : pages[0];
  if (!page) throw new Error(`Page ${targetPageId} not found. Available: ${pages.map((p) => p.id).join(', ')}`);

  console.log(`  Page: ${page.name} (${page.id})`);

  // Step 3: merge into FACEBOOK_TARGETS
  let targets = [];
  try {
    targets = JSON.parse(env.FACEBOOK_TARGETS ?? '[]');
  } catch { /* start fresh */ }

  const existing = targets.findIndex((t) => t.id === page.id);
  const entry = { id: page.id, name: page.name, token: page.access_token };

  if (existing >= 0) {
    targets[existing] = entry;
    console.log('  Updated existing target.');
  } else {
    targets.push(entry);
    console.log('  Added new target.');
  }

  await patchEnv('FACEBOOK_TARGETS', JSON.stringify(targets));

  console.log('\nDone! FACEBOOK_TARGETS updated in .env.local:');
  targets.forEach((t, i) => console.log(`  [${i}] ${t.name} (${t.id})`));
  console.log('\nRestart Next.js để áp dụng.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});
