import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {neon} from '@neondatabase/serverless';

const globals = globalThis as unknown as {bridgeDb?: DatabaseSync};
// Local development keeps its own SQLite file. Vercel Functions use Neon so a
// cold start cannot discard ERP, invoice, or mock data.
const remoteDatabaseUrl = () => (process.env.VERCEL || process.env.USE_NEON === 'true') ? process.env.DATABASE_URL : undefined;
type StoredRow = {namespace: string; record_key: string; value: string};
export function db() {
  if (!globals.bridgeDb) {
    const isVercel = !!process.env.VERCEL;
    const configured = process.env.DATABASE_PATH;
    const path = configured === ':memory:' || (isVercel && remoteDatabaseUrl())
      ? ':memory:'
      : resolve(configured || (isVercel ? '/tmp/bridge.sqlite' : './data/bridge.sqlite'));
    if (path !== ':memory:') {
      mkdirSync(dirname(path), {recursive: true});
    }
    const database = new DatabaseSync(path);
    database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, account TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(kind,id));
      CREATE INDEX IF NOT EXISTS records_account ON records(kind,account);
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, account TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, account TEXT NOT NULL, xdr TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS anchor_tokens (account TEXT PRIMARY KEY, token TEXT NOT NULL, expires INTEGER NOT NULL);`);
    globals.bridgeDb = database;
  }
  return globals.bridgeDb;
}

function localRows() {
  const database = db();
  const records = database.prepare('SELECT kind, id, account, body FROM records').all() as {kind: string; id: string; account: string; body: string}[];
  return [
    ...records.map(row => ({namespace: 'record', record_key: `${row.kind}:${row.id}`, value: JSON.stringify(row)})),
  ];
}

async function remoteStore() {
  const url = remoteDatabaseUrl();
  if (!url) return null;
  const sql = neon(url);
  await sql`CREATE TABLE IF NOT EXISTS centerp_store (namespace TEXT NOT NULL, record_key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(namespace, record_key))`;
  return sql;
}

/** Load the durable Neon snapshot before a server request reads application state. */
export async function hydrateDatabase() {
  const sql = await remoteStore();
  if (!sql) return;
  const remoteRows = await sql`SELECT namespace, record_key, value FROM centerp_store` as StoredRow[];
  if (!remoteRows.length) {
    const seed = localRows();
    if (seed.length) await persistDatabase();
    return;
  }
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    // Anchor access tokens intentionally stay process-local. They are short-lived
    // bearer credentials, so a cold start requires a fresh SEP-10 signature.
    database.exec('DELETE FROM records;');
    const insertRecord = database.prepare('INSERT INTO records(kind,id,account,body) VALUES (?,?,?,?)');
    for (const row of remoteRows) {
      const value = JSON.parse(row.value) as Record<string, unknown>;
      if (row.namespace === 'record') insertRecord.run(String(value.kind), String(value.id), String(value.account), String(value.body));
    }
    database.exec('COMMIT');
  } catch (error) { database.exec('ROLLBACK'); throw error; }
}

/** Persist every mutable application record after a successful API response. */
export async function persistDatabase() {
  const sql = await remoteStore();
  if (!sql) return;
  const rows = localRows();
  await sql`DELETE FROM centerp_store`;
  for (const row of rows) await sql`INSERT INTO centerp_store(namespace, record_key, value) VALUES (${row.namespace}, ${row.record_key}, ${row.value})`;
}
export function putRecord<T>(kind: string, id: string, account: string, record: T) {
  db().prepare('INSERT INTO records(kind,id,account,body) VALUES (?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body').run(kind, id, account, JSON.stringify(record));
  return record;
}
export function record<T>(kind: string, id: string): T {
  const result = db().prepare('SELECT body FROM records WHERE kind=? AND id=?').get(kind, id) as {body: string} | undefined;
  if (!result) throw new Error('Kayıt bulunamadı.');
  return JSON.parse(result.body) as T;
}
export function records<T>(kind: string): T[] {
  return (db().prepare('SELECT body FROM records WHERE kind=? ORDER BY rowid DESC').all(kind) as {body: string}[]).map(row => JSON.parse(row.body) as T);
}
export function deleteRecord(kind: string, id: string) {
  db().prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind, id);
}
