import {hydrateDatabase, persistDatabase, putRecord, record} from './db';

const HEARTBEAT_KIND = 'keeper_health';
const HEARTBEAT_ID = 'escrow';
const HEARTBEAT_ACCOUNT = 'system';
const FRESHNESS_MS = 30 * 60 * 60 * 1000;

type Heartbeat = {checkedAt: number; status: 'ok' | 'failed'};
export type KeeperHealth = {status: 'ok' | 'stale' | 'failed' | 'unconfigured'; checkedAt?: number};

export async function writeKeeperHeartbeat(status: Heartbeat['status']) {
  const revision = await hydrateDatabase();
  putRecord<Heartbeat>(HEARTBEAT_KIND, HEARTBEAT_ID, HEARTBEAT_ACCOUNT, {checkedAt: Date.now(), status});
  await persistDatabase(revision);
}

export async function readKeeperHealth(): Promise<KeeperHealth> {
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32 || !process.env.ESCROW_KEEPER_SECRET) {
    return {status: 'unconfigured'};
  }
  try {
    await hydrateDatabase();
    const heartbeat = record<Heartbeat>(HEARTBEAT_KIND, HEARTBEAT_ID);
    if (!Number.isFinite(heartbeat.checkedAt) || heartbeat.checkedAt < 0 || heartbeat.checkedAt > Date.now() + 60000 || !['ok','failed'].includes(heartbeat.status)) return {status: 'stale'};
    const status = heartbeat.status === 'failed'
      ? 'failed'
      : Date.now() - heartbeat.checkedAt <= FRESHNESS_MS ? 'ok' : 'stale';
    return {status, checkedAt: heartbeat.checkedAt};
  } catch {
    return {status: 'stale'};
  }
}
