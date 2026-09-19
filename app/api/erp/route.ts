import {NextResponse} from 'next/server';
import {z} from 'zod';
import {assertOrigin} from '@/lib/auth';
import {ERP_COOKIE, erpCompany, erpState, mutateERP, openERP} from '@/lib/erp';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (value: unknown) => NextResponse.json(value, {headers: {'Cache-Control': 'no-store'}});
export async function GET(request: Request) {
  try {
    const {company, token} = openERP(request);
    const response = reply(erpState(company, request));
    if (token) response.cookies.set(ERP_COOKIE, token, {httpOnly: true, sameSite: 'strict', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 30 * 86400});
    return response;
  } catch (error) {return failure(error);}
}
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const raw = await request.text();
    if (raw.length > 50000) throw new Error('İstek çok büyük.');
    const result = mutateERP(request, JSON.parse(raw));
    return reply({result, state: erpState(erpCompany(request), request)});
  } catch (error) {return failure(error);}
}
function failure(error: unknown) {return NextResponse.json({error: error instanceof z.ZodError ? 'Form alanlarını kontrol edin.' : error instanceof Error ? error.message : 'Kayıt tamamlanamadı.'}, {status: 400});}
