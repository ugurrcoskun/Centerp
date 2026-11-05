import {Transaction, TransactionBuilder} from '@stellar/stellar-sdk';
import {NextResponse} from 'next/server';
import {authOrigin, challenge, COOKIE, createSession} from '@/lib/auth';
import {hydrateDatabase, persistDatabase, records} from '@/lib/db';
import {STELLAR} from '@/lib/config';
import {parseRequestJson} from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'};
export function OPTIONS() {return new Response(null,{status:204,headers});}
export async function GET(request: Request) {
  try {
    const revision = await hydrateDatabase();
    const query = new URL(request.url).searchParams;
    if (query.has('home_domain') && query.get('home_domain') !== new URL(authOrigin()).host) throw new Error('home_domain eşleşmiyor.');
    if (query.has('memo') || query.has('client_domain')) throw new Error('Bu sürüm memo ve client_domain desteklemiyor.');
    const proof = challenge(query.get('account') || '', new URL(authOrigin()).host);
    await persistDatabase(revision);
    return NextResponse.json({transaction: proof.xdr, network_passphrase: STELLAR.passphrase}, {headers});
  } catch (e) {return fail(e);}
}
export async function POST(request: Request) {
  try {
    const revision = await hydrateDatabase();
    const text = await request.text();
    if (text.length > 20000) throw new Error('İstek çok büyük.');
    const parsed = request.headers.get('content-type')?.includes('application/json') ? parseRequestJson(text) : Object.fromEntries(new URLSearchParams(text));
    if (!parsed || typeof parsed !== 'object' || !('transaction' in parsed) || typeof parsed.transaction !== 'string') throw new Error('İmzalı transaction gerekli.');
    const body = parsed as {transaction: string};
    const tx = TransactionBuilder.fromXDR(body.transaction, STELLAR.passphrase);
    if (!(tx instanceof Transaction)) throw new Error('Geçersiz oturum işlemi.');
    const pending = records<{xdr: string}>('auth_challenge').find(p => Buffer.from(TransactionBuilder.fromXDR(p.xdr, STELLAR.passphrase).hash()).equals(Buffer.from(tx.hash())));
    if (!pending) throw new Error('Oturum talebi bulunamadı veya kullanılmış.');
    // The existing challenge endpoint stores IDs separately; derive the matching
    // ID from the records table rather than trusting a client-provided account.
    const {db} = await import('@/lib/db');
    const row = db().prepare("SELECT id FROM records WHERE kind='auth_challenge' AND body=?").get(JSON.stringify(pending)) as {id: string} | undefined;
    if (!row) throw new Error('Oturum talebi bulunamadı.');
    const session = createSession(row.id, body.transaction);
    await persistDatabase(revision);
    const response = NextResponse.json({token: session.token}, {headers});
    response.cookies.set(COOKIE, session.token, {httpOnly: true, sameSite: 'strict', secure: new URL(authOrigin()).protocol === 'https:', path: '/', maxAge: 43200});
    return response;
  } catch (e) {return fail(e);}
}
function fail(e: unknown) {return NextResponse.json({error: e instanceof Error ? e.message : 'Oturum doğrulanamadı.'}, {status: 400, headers});}
