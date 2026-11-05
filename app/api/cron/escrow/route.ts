import {authorizeCron, runKeeper} from '@/lib/keeper';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!authorizeCron(request.headers.get('authorization'))) return Response.json({error: 'Yetkisiz.'}, {status: 401});
  try {
    const result = await runKeeper();
    const failed = result.remaining > 0 || result.report.some(r => ['failed','error','external-settlement-needs-reconciliation'].includes(r.status));
    return Response.json(result, {status: failed ? 503 : 200, headers: {'Cache-Control': 'no-store'}});
  } catch (e) {return Response.json({error: e instanceof Error ? e.message : 'Keeper çalışmadı.'}, {status: 503});}
}
