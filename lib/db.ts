import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

const globals = globalThis as unknown as {bridgeDb?: DatabaseSync};
export function db() {
  if (!globals.bridgeDb) {
    const isVercel = !!process.env.VERCEL;
    const configured = process.env.DATABASE_PATH;
    const path = configured === ':memory:'
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
