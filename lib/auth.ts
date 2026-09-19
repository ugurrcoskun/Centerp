import {Keypair, StrKey, Transaction, TransactionBuilder, WebAuth} from '@stellar/stellar-sdk';
import {STELLAR} from './config';

const globalAuth = globalThis as unknown as {bridgeAuthKey?: Keypair; usedChallenges?: Set<string>};
const key = () => globalAuth.bridgeAuthKey ||= Keypair.random();
const usedChallenges = () => globalAuth.usedChallenges ||= new Set<string>();
export const COOKIE = 'bridge_session';
type AuthProof = {account: string; xdr: string};

function encodeProof(value: AuthProof) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
function decodeProof(value: string | undefined): AuthProof | null {
  if (!value || value.length > 16000) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<AuthProof>;
    if (typeof parsed.account !== 'string' || typeof parsed.xdr !== 'string' || parsed.xdr.length > 12000) return null;
    return {account: publicKey(parsed.account), xdr: parsed.xdr};
  } catch { return null; }
}

export function publicKey(value: unknown): string {
  if (typeof value !== 'string' || !StrKey.isValidEd25519PublicKey(value)) throw new Error('Geçerli bir Stellar public key girin (G…).');
  return value;
}
export function challenge(account: string, domain: string) {
  const xdr = WebAuth.buildChallengeTx(key(), publicKey(account), domain, 300, STELLAR.passphrase, domain);
  // The challenge carries its expected account and XDR. It is therefore safe to
  // verify after a Vercel function instance changes, without temporary storage.
  return {id: encodeProof({account, xdr}), xdr};
}
export function assertSignature(tx: Transaction, account: string) {
  const signer = Keypair.fromPublicKey(account);
  if (!tx.signatures.some(signature => signer.verify(tx.hash(), signature.signature))) throw new Error('Cüzdan imzası geçersiz.');
}
export function createSession(id: string, signedXdr: string) {
  const item = decodeProof(id);
  if (!item) throw new Error('Oturum talebi geçersiz. Yeniden bağlanın.');
  if (usedChallenges().has(id)) throw new Error('Oturum talebi zaten kullanılmış.');
  const expected = TransactionBuilder.fromXDR(item.xdr, STELLAR.passphrase);
  const signed = TransactionBuilder.fromXDR(signedXdr, STELLAR.passphrase);
  if (!(signed instanceof Transaction) || !Buffer.from(expected.hash()).equals(Buffer.from(signed.hash()))) throw new Error('İmzalanan oturum talebi değiştirildi.');
  assertSignature(signed, item.account);
  usedChallenges().add(id);
  if (usedChallenges().size > 2048) usedChallenges().clear();
  return {token: encodeProof({account: item.account, xdr: signedXdr}), account: item.account};
}
function sessionToken(request: Request) {
  return request.headers.get('cookie')?.split(';').map(c => c.trim()).find(c => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
}
export function accountFromRequest(request: Request): string | null {
  const proof = decodeProof(sessionToken(request));
  if (!proof) return null;
  try {
    const signed = TransactionBuilder.fromXDR(proof.xdr, STELLAR.passphrase);
    if (!(signed instanceof Transaction)) return null;
    assertSignature(signed, proof.account);
    return proof.account;
  } catch { return null; }
}
export function logout(request: Request) {
  // The signed proof is held only in the HttpOnly cookie, which the logout
  // endpoint clears in its response.
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
