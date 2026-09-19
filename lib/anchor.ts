import {StellarToml, WebAuth} from '@stellar/stellar-sdk';
import {db, putRecord, record} from './db';
import {STELLAR} from './config';
import {fetchJson} from './http';
import {amount} from './amount';
import type {AnchorTransfer} from './types';

export async function discoverAnchor() {
  const toml = await StellarToml.Resolver.resolve(STELLAR.homeDomain);
  if (toml.NETWORK_PASSPHRASE !== STELLAR.passphrase || toml.SIGNING_KEY !== STELLAR.anchorSigner
    || toml.WEB_AUTH_ENDPOINT !== `${STELLAR.anchor}/auth` || toml.TRANSFER_SERVER !== `${STELLAR.anchor}/sep6`
    || toml.ANCHOR_QUOTE_SERVER !== `${STELLAR.anchor}/sep38`)
    throw new Error('Anchor keşif değerleri beklenen Testnet yapılandırmasıyla eşleşmiyor.');
  const currencies = toml.CURRENCIES as {code: string; issuer: string}[] | undefined;
  if (!currencies?.some(asset => asset.code === STELLAR.assetCode && asset.issuer === STELLAR.issuer)) throw new Error('Anchor USDC issuer bilgisi eşleşmiyor.');
  return {domain: STELLAR.homeDomain, auth: toml.WEB_AUTH_ENDPOINT, transfer: toml.TRANSFER_SERVER, quote: toml.ANCHOR_QUOTE_SERVER};
}
export function anchorToken(account: string) {
  const row = db().prepare('SELECT token FROM anchor_tokens WHERE account=? AND expires>?').get(account, Date.now()) as {token: string} | undefined;
  if (!row) throw new Error('Anchor oturumu gerekli. Önce Anchor’a bağlanın.');
  return row.token;
}
export function isAnchorAuthenticated(account: string) {
  try { anchorToken(account); return true; } catch { return false; }
}
async function anchorRequest<T = Record<string, unknown>>(account: string, path: string, init?: RequestInit): Promise<T> {
  return fetchJson<T>(`${STELLAR.anchor}${path}`, {...init, headers: {...init?.headers, Authorization: `Bearer ${anchorToken(account)}`}});
}
export async function anchorChallenge(account: string) {
  await discoverAnchor();
  const body = await fetchJson<{transaction: string; network_passphrase: string}>(`${STELLAR.anchor}/auth?account=${account}&home_domain=${STELLAR.homeDomain}`);
  if (body.network_passphrase !== STELLAR.passphrase) throw new Error('Anchor yanlış ağ döndürdü.');
  const parsed = WebAuth.readChallengeTx(body.transaction, STELLAR.anchorSigner, STELLAR.passphrase, STELLAR.homeDomain, STELLAR.homeDomain);
  if (parsed.clientAccountID !== account) throw new Error('Anchor talebi farklı bir cüzdana ait.');
  return {xdr: body.transaction};
}
export async function anchorLogin(account: string, signedXdr: string) {
  const parsed = WebAuth.readChallengeTx(signedXdr, STELLAR.anchorSigner, STELLAR.passphrase, STELLAR.homeDomain, STELLAR.homeDomain);
  if (parsed.clientAccountID !== account) throw new Error('Anchor talebi farklı bir cüzdana ait.');
  WebAuth.verifyChallengeTxSigners(signedXdr, STELLAR.anchorSigner, STELLAR.passphrase, [account], STELLAR.homeDomain, STELLAR.homeDomain);
  const result = await fetchJson<{token: string}>(`${STELLAR.anchor}/auth`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({transaction: signedXdr})});
  let payload: {exp?: number};
  try {
    const encodedPayload = result.token.split('.')[1];
    if (!encodedPayload) throw new Error();
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as {exp?: number};
  } catch {
    throw new Error('Anchor geçerli bir oturum anahtarı döndürmedi. Yeniden bağlanın.');
  }
  db().prepare('INSERT INTO anchor_tokens VALUES(?,?,?) ON CONFLICT(account) DO UPDATE SET token=excluded.token, expires=excluded.expires').run(account, result.token, (payload.exp || Date.now() / 1000 + 300) * 1000);
  return {authenticated: true};
}
export async function requestQuote(account: string, kind: 'deposit' | 'withdraw', value: string) {
  const usdc = `stellar:USDC:${STELLAR.issuer}`;
  const quote = await anchorRequest<{id: string; expires_at: string; sell_amount: string; buy_amount: string}>(account, '/sep38/quote', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({
      sell_asset: kind === 'deposit' ? 'iso4217:TRY' : usdc,
      buy_asset: kind === 'deposit' ? usdc : 'iso4217:TRY',
      sell_amount: amount(value, kind === 'deposit' ? 2 : 7), context: 'sep6',
      ...(kind === 'deposit' ? {sell_delivery_method: 'bank_account'} : {buy_delivery_method: 'bank_account'}),
    }),
  });
  putRecord('quote', quote.id, account, {...quote, account, kind});
  return quote;
}
export async function startTransfer(account: string, kind: 'deposit' | 'withdraw', value: string, quoteId?: string, invoiceId?: string, erp?: {companyId: string; payableId: string}) {
  const canonical = amount(value, kind === 'deposit' ? 2 : 7);
  if (kind === 'deposit' && (Number(canonical) < 50 || Number(canonical) > 3000)) throw new Error('Mock Anchor için 50–3.000 TRY aralığında bir tutar girin.');
  if (kind === 'withdraw' && Number(canonical) < 1) throw new Error('Çekim tutarı en az 1 USDC olmalı.');
  const params = new URLSearchParams({account, amount: canonical, ...(kind === 'deposit' ? {funding_method: 'bank_account'} : {type: 'bank_account'})});
  let endpoint: string = kind;
  if (quoteId) {
    const quote = record<{account: string; kind: string; expires_at: string; sell_amount: string}>('quote', quoteId);
    if (quote.account !== account || quote.kind !== kind || Date.parse(quote.expires_at) <= Date.now() || amount(quote.sell_amount) !== amount(canonical)) throw new Error('Kur teklifinin süresi veya tutarı uygun değil. Yeniden kur alın.');
    params.set('source_asset', kind === 'deposit' ? 'iso4217:TRY' : 'USDC');
    params.set('destination_asset', kind === 'deposit' ? 'USDC' : 'iso4217:TRY');
    params.set('quote_id', quoteId);
    endpoint += '-exchange';
  } else params.set('asset_code', 'USDC');
  const result = await anchorRequest<{id: string; [key: string]: unknown}>(account, `/sep6/${endpoint}?${params}`);
  if (!result.id) throw new Error('Anchor işlem ID’si döndürmedi. İşlemi kontrol etmeden yeniden başlatmayın.');
  const transfer: AnchorTransfer = {id: result.id, account, kind, amount: canonical, quoteId, invoiceId, erpCompanyId: erp?.companyId, erpPayableId: erp?.payableId, createdAt: Date.now(), status: 'pending_user_transfer_start', details: result};
  return putRecord('anchor', result.id, account, transfer);
}
export async function refreshTransfer(account: string, id: string) {
  const current = record<AnchorTransfer>('anchor', id);
  if (current.account !== account) throw new Error('Bu işlem cüzdanınıza ait değil.');
  const result = await anchorRequest<{transaction: Record<string, unknown>}>(account, `/sep6/transaction?id=${encodeURIComponent(id)}`);
  const tx = result.transaction;
  return putRecord('anchor', id, account, {...current, status: String(tx.status), details: {...current.details, ...tx}, hash: String(tx.stellar_transaction_id || current.hash || '')});
}
export async function simulateTransfer(account: string, id: string) {
  const current = record<AnchorTransfer>('anchor', id);
  if (current.account !== account || current.kind !== 'deposit' || current.status !== 'pending_user_transfer_start') throw new Error('Bu işlem banka simülasyonuna uygun değil.');
  await anchorRequest(account, `/sep6/tx/${encodeURIComponent(id)}/simulate-bank-transfer`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({amount: current.amount})});
  return refreshTransfer(account, id);
}
