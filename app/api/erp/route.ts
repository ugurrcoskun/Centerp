import {NextResponse} from 'next/server';
import {z} from 'zod';
import {assertOrigin} from '@/lib/auth';
import {hydrateDatabase, persistDatabase} from '@/lib/db';
import {ERP_COOKIE, erpCompany, erpState, joinERP, mutateERP, openERP} from '@/lib/erp';
import {parseRequestJson} from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = async (value: unknown, revision: number | null) => { await persistDatabase(revision); return NextResponse.json(value, {headers: {'Cache-Control': 'no-store'}}); };
export async function GET(request: Request) {
  try {
    const revision = await hydrateDatabase();
    const {company, token, dirty} = openERP(request);
    const response = dirty
      ? await reply(erpState(company, request), revision)
      : NextResponse.json(erpState(company, request), {headers: {'Cache-Control': 'no-store'}});
    if (token) response.cookies.set(ERP_COOKIE, token, {httpOnly: true, sameSite: 'strict', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 30 * 86400});
    return response;
  } catch (error) {return failure(error);}
}
export async function POST(request: Request) {
  try {
    const revision = await hydrateDatabase();
    assertOrigin(request);
    const raw = await request.text();
    if (raw.length > 50000) throw new Error('İstek çok büyük.');
    const body = parseRequestJson(raw);
    if (body && typeof body === 'object' && 'action' in body && body.action === 'joinCompany') {
      const input = z.object({companyId: z.string().uuid()}).parse(body);
      const joined = joinERP(request, input.companyId);
      const response = await reply({result: {joined: true}}, revision);
      response.cookies.set(ERP_COOKIE, joined.token, {httpOnly: true, sameSite: 'strict', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 30 * 86400});
      return response;
    }
    const result = mutateERP(request, body);
    return reply({result, state: erpState(erpCompany(request), request)}, revision);
  } catch (error) {return failure(error);}
}
function failure(error: unknown) {return NextResponse.json({error: error instanceof z.ZodError ? 'Form alanlarını kontrol edin.' : error instanceof Error ? error.message : 'Kayıt tamamlanamadı.'}, {status: 400});}
