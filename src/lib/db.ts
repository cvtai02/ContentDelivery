import Database from 'better-sqlite3';
import path from 'node:path';

const DB_PATH = path.join(process.cwd(), 'mynews.db');

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

function openDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS facebook_targets (
      id    TEXT PRIMARY KEY,
      name  TEXT NOT NULL,
      token TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS section_settings (
      section            TEXT PRIMARY KEY,
      facebook_target_id TEXT
    );
    CREATE TABLE IF NOT EXISTS prompts (
      key      TEXT PRIMARY KEY,
      template TEXT NOT NULL
    );
  `);
  return db;
}

export function getDb(): Database.Database {
  if (!global.__db) global.__db = openDb();
  return global.__db;
}

// ── settings helpers ──────────────────────────────────────────────────────────

export function getSetting(key: string): string {
  const row = getDb().prepare<[string], { value: string }>('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value ?? '';
}

export function setSetting(key: string, value: string): void {
  getDb().prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

// ── facebook targets ──────────────────────────────────────────────────────────

export type FacebookTarget = { id: string; name: string; token: string };

export function listFacebookTargets(): FacebookTarget[] {
  return getDb().prepare<[], FacebookTarget>('SELECT id, name, token FROM facebook_targets').all();
}

export function upsertFacebookTarget(target: FacebookTarget): void {
  getDb().prepare('INSERT INTO facebook_targets (id, name, token) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, token = excluded.token').run(target.id, target.name, target.token);
}

// ── section settings ──────────────────────────────────────────────────────────

export function getSectionTargetId(section: string): string | null {
  const row = getDb().prepare<[string], { facebook_target_id: string | null }>('SELECT facebook_target_id FROM section_settings WHERE section = ?').get(section);
  return row?.facebook_target_id ?? null;
}

export function setSectionTargetId(section: string, targetId: string | null): void {
  getDb().prepare('INSERT INTO section_settings (section, facebook_target_id) VALUES (?, ?) ON CONFLICT(section) DO UPDATE SET facebook_target_id = excluded.facebook_target_id').run(section, targetId);
}

export function getAllSectionSettings(): Record<string, { facebookTargetId: string | null }> {
  const rows = getDb().prepare<[], { section: string; facebook_target_id: string | null }>('SELECT section, facebook_target_id FROM section_settings').all();
  return Object.fromEntries(rows.map((r) => [r.section, { facebookTargetId: r.facebook_target_id }]));
}

// ── prompts ───────────────────────────────────────────────────────────────────

export function getPromptTemplate(key: string): string | null {
  const row = getDb().prepare<[string], { template: string }>('SELECT template FROM prompts WHERE key = ?').get(key);
  return row?.template ?? null;
}

export function setPromptTemplate(key: string, template: string): void {
  getDb().prepare('INSERT INTO prompts (key, template) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET template = excluded.template').run(key, template);
}

export function deletePromptTemplate(key: string): void {
  getDb().prepare('DELETE FROM prompts WHERE key = ?').run(key);
}
