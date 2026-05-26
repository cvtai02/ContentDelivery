/**
 * Exchange a Facebook user token for a never-expiring Page Access Token,
 * then upsert it in the facebook_targets table in mynews.db.
 *
 * Usage:
 *   node scripts/facebook-token.mjs [--page-id=PAGE_ID]
 *
 * Requires in the DB (set via Settings UI):
 *   FACEBOOK_ACCESS_TOKEN   — fresh user token from developers.facebook.com/tools/explorer
 *   FACEBOOK_APP_ID         — from your app → Settings → Basic
 *   FACEBOOK_APP_SECRET     — same place
 */

import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'mynews.db');
const GRAPH = 'https://graph.facebook.com/v20.0';

const pageIdArg = process.argv.find((a) => a.startsWith('--page-id='));
const targetPageId = pageIdArg?.slice('--page-id='.length);

function openDb() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS facebook_targets (id TEXT PRIMARY KEY, name TEXT NOT NULL, token TEXT NOT NULL);
  `);
  return db;
}

function getSetting(db, key) {
  return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? '';
}

function upsertTarget(db, target) {
  db.prepare(
    'INSERT INTO facebook_targets (id, name, token) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, token = excluded.token',
  ).run(target.id, target.name, target.token);
}

async function get(url, label) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`${label}: ${data.error?.message ?? res.status}`);
  return data;
}

async function main() {
  const db = openDb();

  const userToken = getSetting(db, 'FACEBOOK_ACCESS_TOKEN');
  const appId = getSetting(db, 'FACEBOOK_APP_ID');
  const appSecret = getSetting(db, 'FACEBOOK_APP_SECRET');

  if (!userToken) throw new Error('FACEBOOK_ACCESS_TOKEN missing in DB — set it via the Settings UI');
  if (!appId) throw new Error('FACEBOOK_APP_ID missing in DB');
  if (!appSecret) throw new Error('FACEBOOK_APP_SECRET missing in DB');

  console.log('Step 1: Exchanging for long-lived user token…');
  const { access_token: longToken } = await get(
    `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userToken}`,
    'Token exchange',
  );
  console.log('  Done.');

  console.log('Step 2: Fetching page list…');
  const { data: pages } = await get(`${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${longToken}`, 'Accounts');

  if (!pages?.length) throw new Error('No Facebook Pages found.');

  const page = targetPageId ? pages.find((p) => p.id === targetPageId) : pages[0];
  if (!page) throw new Error(`Page ${targetPageId} not found. Available: ${pages.map((p) => p.id).join(', ')}`);

  console.log(`  Page: ${page.name} (${page.id})`);

  upsertTarget(db, { id: page.id, name: page.name, token: page.access_token });

  const all = db.prepare('SELECT id, name FROM facebook_targets').all();
  console.log('\nDone! facebook_targets in mynews.db:');
  all.forEach((t, i) => console.log(`  [${i}] ${t.name} (${t.id})`));

  db.close();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});
