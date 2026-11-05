import {authorizeCron, runKeeper} from '@/lib/keeper';
import {writeKeeperHeartbeat} from '@/lib/keeper-monitor';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!authorizeCron(request.headers.get('authorization'))) return Response.json({error: 'Yetkisiz.'}, {status: 401});
  try {
    const result = await runKeeper();
    const failed = result.remaining > 0 || result.report.some(r => ['failed','error','external-settlement-needs-reconciliation'].includes(r.status));
    await writeKeeperHeartbeat(failed ? 'failed' : 'ok');
    return Response.json(result, {status: failed ? 503 : 200, headers: {'Cache-Control': 'no-store'}});
  } catch {
    try { await writeKeeperHeartbeat('failed'); } catch { /* best effort */ }
    return Response.json({error: 'Keeper çalışmadı.'}, {status: 503, headers: {'Cache-Control': 'no-store'}});
  }
}
