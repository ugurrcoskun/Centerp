import {createHash, randomUUID} from 'node:crypto';
import {Keypair, StrKey, Transaction, TransactionBuilder, WebAuth} from '@stellar/stellar-sdk';
import {db} from './db';
import {STELLAR} from './config';

const globalAuth = globalThis as unknown as {bridgeAuthKey?: Keypair};
const key = () => globalAuth.bridgeAuthKey ||= Keypair.random();
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const COOKIE = 'bridge_session';

export function publicKey(value: unknown): string {
  if (typeof value !== 'string' || !StrKey.isValidEd25519PublicKey(value)) throw new Error('Geçerli bir Stellar public key girin (G…).');
  return value;
}
export function challenge(account: string, domain: string) {
  const id = randomUUID();
  const xdr = WebAuth.buildChallengeTx(key(), publicKey(account), domain, 300, STELLAR.passphrase, domain);
  db().prepare('DELETE FROM challenges WHERE expires < ?').run(Date.now());
  db().prepare('INSERT INTO challenges VALUES(?,?,?,?)').run(id, account, xdr, Date.now() + 300000);
  return {id, xdr};
}
export function assertSignature(tx: Transaction, account: string) {
  const signer = Keypair.fromPublicKey(account);
  if (!tx.signatures.some(signature => signer.verify(tx.hash(), signature.signature))) throw new Error('Cüzdan imzası geçersiz.');
}
export function createSession(id: string, signedXdr: string) {
  const item = db().prepare('SELECT * FROM challenges WHERE id=?').get(id) as {account: string; xdr: string; expires: number} | undefined;
  if (!item || item.expires < Date.now()) throw new Error('Oturum talebinin süresi doldu. Yeniden bağlanın.');
  const expected = TransactionBuilder.fromXDR(item.xdr, STELLAR.passphrase);
  const signed = TransactionBuilder.fromXDR(signedXdr, STELLAR.passphrase);
  if (!(signed instanceof Transaction) || !Buffer.from(expected.hash()).equals(Buffer.from(signed.hash()))) throw new Error('İmzalanan oturum talebi değiştirildi.');
  assertSignature(signed, item.account);
  const token = randomUUID() + randomUUID();
  // The one-use challenge and session are committed together.
  db().exec('BEGIN IMMEDIATE');
  try {
    const result = db().prepare('DELETE FROM challenges WHERE id=?').run(id);
    if (result.changes !== 1) throw new Error('Oturum talebi zaten kullanılmış.');
    db().prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token), item.account, Date.now() + 43200000);
    db().exec('COMMIT');
  } catch (error) { db().exec('ROLLBACK'); throw error; }
  return {token, account: item.account};
}
function sessionToken(request: Request) {
  return request.headers.get('cookie')?.split(';').map(c => c.trim()).find(c => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
}
export function accountFromRequest(request: Request): string | null {
  const token = sessionToken(request);
  if (!token) return null;
  const row = db().prepare('SELECT account FROM sessions WHERE id=? AND expires>?').get(digest(token), Date.now()) as {account: string} | undefined;
  return row?.account || null;
}
export function logout(request: Request) {
  const token = sessionToken(request);
  if (token) db().prepare('DELETE FROM sessions WHERE id=?').run(digest(token));
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
