import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {neon} from '@neondatabase/serverless';

const globals = globalThis as unknown as {bridgeDb?: DatabaseSync};
// Local development keeps its own SQLite file. Vercel Functions use Neon so a
// cold start cannot discard ERP, invoice, or mock data.
const remoteDatabaseUrl = () => (process.env.VERCEL || process.env.USE_NEON === 'true') ? process.env.DATABASE_URL : undefined;
type StoredRow = {namespace: string; record_key: string; value: string};
type SnapshotRow = {revision: string | number; payload: unknown};
function parseStoredJson<T>(value: string, label: string): T {
  try {
    if (!value.trim()) throw new Error();
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`Saklanan ${label} kaydı bozuk. Veriyi yeniden yükleyin.`);
  }
}
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
  const anchorTokens = database.prepare('SELECT account, token, expires FROM anchor_tokens WHERE expires > ?').all(Date.now()) as {account: string; token: string; expires: number}[];
  return [
    ...records.map(row => ({namespace: 'record', record_key: `${row.kind}:${row.id}`, value: JSON.stringify(row)})),
    ...anchorTokens.map(row => ({namespace: 'anchor_token', record_key: row.account, value: JSON.stringify(row)})),
  ];
}

async function remoteStore() {
  const url = remoteDatabaseUrl();
  if (!url) return null;
  const sql = neon(url);
  await sql`CREATE TABLE IF NOT EXISTS centerp_store (namespace TEXT NOT NULL, record_key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(namespace, record_key))`;
  await sql`CREATE TABLE IF NOT EXISTS centerp_snapshot (id SMALLINT PRIMARY KEY CHECK (id = 1), revision BIGINT NOT NULL, payload JSONB NOT NULL)`;
  return sql;
}

/** Load the durable Neon snapshot before a server request reads application state. */
export async function hydrateDatabase(): Promise<number | null> {
  const sql = await remoteStore();
  if (!sql) return null;
  let snapshots = await sql`SELECT revision, payload FROM centerp_snapshot WHERE id = 1` as SnapshotRow[];
  if (!snapshots.length) {
    const legacyRows = await sql`SELECT namespace, record_key, value FROM centerp_store` as StoredRow[];
    const seed = legacyRows.length ? legacyRows : localRows();
    await sql`INSERT INTO centerp_snapshot(id, revision, payload) VALUES (1, 1, ${JSON.stringify(seed)}::jsonb) ON CONFLICT (id) DO NOTHING`;
    snapshots = await sql`SELECT revision, payload FROM centerp_snapshot WHERE id = 1` as SnapshotRow[];
  }
  const snapshot = snapshots[0];
  if (!snapshot) throw new Error('Kalıcı veri deposu başlatılamadı. Tekrar deneyin.');
  const remoteRows = (typeof snapshot.payload === 'string'
    ? parseStoredJson<unknown>(snapshot.payload, 'Neon snapshot')
    : snapshot.payload) as unknown;
  if (!Array.isArray(remoteRows)) throw new Error('Kalıcı veri deposunun biçimi geçersiz.');
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    // Only server-side Testnet Anchor tokens are restored; they never enter an
    // API response and expired credentials are excluded from every snapshot.
    database.exec('DELETE FROM records; DELETE FROM anchor_tokens;');
    const insertRecord = database.prepare('INSERT INTO records(kind,id,account,body) VALUES (?,?,?,?)');
    const insertAnchorToken = database.prepare('INSERT INTO anchor_tokens(account,token,expires) VALUES (?,?,?)');
    for (const row of remoteRows as StoredRow[]) {
      if (!row || typeof row.record_key !== 'string' || typeof row.value !== 'string') throw new Error('Kalıcı veri deposunda geçersiz bir kayıt var.');
      const value = parseStoredJson<Record<string, unknown>>(row.value, row.record_key);
      if (row.namespace === 'record') insertRecord.run(String(value.kind), String(value.id), String(value.account), String(value.body));
      if (row.namespace === 'anchor_token' && Number(value.expires) > Date.now()) insertAnchorToken.run(String(value.account), String(value.token), Number(value.expires));
    }
    database.exec('COMMIT');
  } catch (error) { database.exec('ROLLBACK'); throw error; }
  return Number(snapshot.revision);
}

/** Persist every mutable application record after a successful API response. */
export async function persistDatabase(expectedRevision?: number | null) {
  // Capture the request's result before the first network await. Another request
  // may hydrate the shared in-memory SQLite database while this one is saving.
  const rows = localRows();
  const sql = await remoteStore();
  if (!sql) return;
  if (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision)) throw new Error('Kalıcı veri sürümü eksik. İsteği yenileyip tekrar deneyin.');
  const updated = await sql`UPDATE centerp_snapshot SET revision = revision + 1, payload = ${JSON.stringify(rows)}::jsonb WHERE id = 1 AND revision = ${expectedRevision} RETURNING revision`;
  if (!updated.length) throw new Error('Veriler başka bir işlem tarafından güncellendi. En güncel kayıtlar yüklendi; işlemi tekrar deneyin.');
}
export function putRecord<T>(kind: string, id: string, account: string, record: T) {
  db().prepare('INSERT INTO records(kind,id,account,body) VALUES (?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body').run(kind, id, account, JSON.stringify(record));
  return record;
}
export function record<T>(kind: string, id: string): T {
  const result = db().prepare('SELECT body FROM records WHERE kind=? AND id=?').get(kind, id) as {body: string} | undefined;
  if (!result) throw new Error('Kayıt bulunamadı.');
  return parseStoredJson<T>(result.body, `${kind}:${id}`);
}
export function records<T>(kind: string): T[] {
  return (db().prepare('SELECT id, body FROM records WHERE kind=? ORDER BY rowid DESC').all(kind) as {id: string; body: string}[])
    .map(row => parseStoredJson<T>(row.body, `${kind}:${row.id}`));
}
export function deleteRecord(kind: string, id: string) {
  db().prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind, id);
}
