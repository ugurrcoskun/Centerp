import {readKeeperHealth} from '@/lib/keeper-monitor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const health = await readKeeperHealth();
  return Response.json(health, {
    status: health.status === 'ok' ? 200 : 503,
    headers: {'Cache-Control': 'no-store'},
  });
}
