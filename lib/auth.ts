import {createHash, randomBytes} from 'node:crypto';
import {Keypair, StrKey, Transaction, TransactionBuilder, WebAuth} from '@stellar/stellar-sdk';
import {deleteRecord, putRecord, record} from './db';
import {STELLAR} from './config';

const globalAuth = globalThis as unknown as {bridgeAuthKey?: Keypair};
const key = () => globalAuth.bridgeAuthKey ||= Keypair.random();
export const COOKIE = 'bridge_session';
type AuthChallenge = {account: string; xdr: string; expires: number};
type AuthSession = {account: string; expires: number};
const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');

export function publicKey(value: unknown): string {
  if (typeof value !== 'string' || !StrKey.isValidEd25519PublicKey(value)) throw new Error('Geçerli bir Stellar public key girin (G…).');
  return value;
}
export function challenge(account: string, domain: string) {
  const verifiedAccount = publicKey(account);
  const xdr = WebAuth.buildChallengeTx(key(), verifiedAccount, domain, 300, STELLAR.passphrase, domain);
  const id = randomBytes(32).toString('hex');
  putRecord('auth_challenge', id, verifiedAccount, {account: verifiedAccount, xdr, expires: Date.now() + 300000} satisfies AuthChallenge);
  return {id, xdr};
}
export function assertSignature(tx: Transaction, account: string) {
  const signer = Keypair.fromPublicKey(account);
  if (!tx.signatures.some(signature => signer.verify(tx.hash(), signature.signature))) throw new Error('Cüzdan imzası geçersiz.');
}
export function createSession(id: string, signedXdr: string) {
  let item: AuthChallenge;
  try { item = record<AuthChallenge>('auth_challenge', id); }
  catch { throw new Error('Oturum talebi geçersiz veya zaten kullanılmış. Yeniden bağlanın.'); }
  if (item.expires < Date.now()) {deleteRecord('auth_challenge', id); throw new Error('Oturum talebinin süresi doldu. Yeniden bağlanın.');}
  const expected = TransactionBuilder.fromXDR(item.xdr, STELLAR.passphrase);
  const signed = TransactionBuilder.fromXDR(signedXdr, STELLAR.passphrase);
  if (!(signed instanceof Transaction) || !Buffer.from(expected.hash()).equals(Buffer.from(signed.hash()))) throw new Error('İmzalanan oturum talebi değiştirildi.');
  assertSignature(signed, item.account);
  deleteRecord('auth_challenge', id);
  const token = randomBytes(48).toString('base64url');
  putRecord('auth_session', tokenHash(token), item.account, {account: item.account, expires: Date.now() + 43200000} satisfies AuthSession);
  return {token, account: item.account};
}
function sessionToken(request: Request) {
  return request.headers.get('cookie')?.split(';').map(c => c.trim()).find(c => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
}
export function accountFromRequest(request: Request): string | null {
  const token = sessionToken(request);
  if (!token || token.length > 128) return null;
  try {
    const session = record<AuthSession>('auth_session', tokenHash(token));
    return session.expires >= Date.now() ? publicKey(session.account) : null;
  } catch { return null; }
}
export function logout(request: Request) {
  const token = sessionToken(request);
  if (token && token.length <= 128) deleteRecord('auth_session', tokenHash(token));
}
export function requireAccount(request: Request) {
  const account = accountFromRequest(request);
  if (!account) throw new Error('Önce cüzdanınızı bağlayıp oturum talebini imzalayın.');
  return account;
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const forwardedOrigin = host ? `${proto}://${host}` : null;
  const requestOrigin = new URL(request.url).origin;
  if (
    origin !== requestOrigin &&
    origin !== forwardedOrigin &&
    origin !== process.env.APP_ORIGIN &&
    origin !== `https://${process.env.VERCEL_URL}` &&
    origin !== `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  ) {
    throw new Error('İstek kaynağına izin verilmedi.');
  }
}
