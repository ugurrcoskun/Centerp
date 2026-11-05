import {authKey, authOrigin} from '@/lib/auth';
import {STELLAR} from '@/lib/config';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET() {
  try {
    const origin = authOrigin();
    const body = `VERSION="2.7.0"\nNETWORK_PASSPHRASE=${JSON.stringify(STELLAR.passphrase)}\nSIGNING_KEY=${JSON.stringify(authKey().publicKey())}\nWEB_AUTH_ENDPOINT=${JSON.stringify(origin + '/api/auth')}\n`;
    return new Response(body, {headers: {'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store'}});
  } catch {return Response.json({error: 'Sunucu kimlik doğrulama yapılandırması eksik.'}, {status: 503});}
}
