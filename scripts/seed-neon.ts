import {loadEnvConfig} from '@next/env';

async function main() {
  loadEnvConfig(process.cwd());
  process.env.USE_NEON = 'true';
  process.env.DATABASE_PATH = ':memory:';
  const {db, hydrateDatabase, persistDatabase, records} = await import('../lib/db');
  const {openERP} = await import('../lib/erp');

  await hydrateDatabase();
  if (records('erp_company').length) {
    console.log('Neon already contains Centerp records; seed skipped.');
  } else {
    openERP(new Request('https://centerp.local/api/erp'));
    await persistDatabase();
    console.log('Seeded Comuchain mock workspace in Neon.');
  }
  db().close();
}

void main();
