import {randomUUID, timingSafeEqual} from 'node:crypto';
import Decimal from 'decimal.js';
import {Address, Contract, Keypair, nativeToScVal, rpc, TransactionBuilder} from '@stellar/stellar-sdk';
import {hydrateDatabase, persistDatabase, putRecord, records} from './db';
import {STELLAR} from './config';
import {invoiceContract, horizon, pollOperation, soroban, viewContract} from './stellar';
import {settlementDue} from './escrow-policy';
import type {ChainOperation, Invoice} from './types';
type FeeAccount = {balances:{asset_type:string;balance:string;selling_liabilities?:string}[];subentry_count?:number;num_sponsoring?:number;num_sponsored?:number};
export function availableKeeperXlm(account: FeeAccount, baseReserveStroops: number | string) {
  const native = account.balances.find(b=>b.asset_type==='native');
  const units = 2 + (account.subentry_count || 0) + (account.num_sponsoring || 0) - (account.num_sponsored || 0);
  const reserve = new Decimal(baseReserveStroops);
  if (!Number.isInteger(units) || units < 0 || !reserve.isFinite() || !reserve.isPositive()) throw new Error('Keeper rezerv bilgisi geçersiz.');
  return new Decimal(native?.balance || 0).minus(native?.selling_liabilities || 0).minus(reserve.mul(units).div(10000000));
}
export function authorizeCron(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32 || !header) return false;
  const expected = Buffer.from('Bearer ' + secret);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function runKeeper() {
  const secret = process.env.ESCROW_KEEPER_SECRET;
  if (!secret) throw new Error('ESCROW_KEEPER_SECRET yapılandırılmalı.');
  const signer = Keypair.fromSecret(secret);
  const account = signer.publicKey();
  const [feeAccount, ledger] = await Promise.all([horizon.loadAccount(account), horizon.ledgers().order('desc').limit(1).call()]);
  const feeBalance = availableKeeperXlm(feeAccount, ledger.records[0]?.base_reserve_in_stroops);
  if (!feeBalance.isFinite() || feeBalance.lt(1)) throw new Error('Keeper harcanabilir işlem ücreti bakiyesi 1 Testnet XLM altında.');
  let revision = await hydrateDatabase();
  const report: {invoiceId: string; status: string; hash?: string; error?: string}[] = [];
  const operations = records<ChainOperation>('operation');
  const candidates = records<Invoice>('invoice').filter(i => {
    if (i.version !== 2 || !['open','funded','delivered','disputed'].includes(i.status)) return false;
    const own = operations.filter(o=>o.invoiceId===i.id&&o.account===account);
    if (own.some(o=>['prepared','pending'].includes(o.status))) return true;
    const due = i.status === 'open' ? i.due : settlementDue(i);
    if (due !== null && due <= Date.now()/1000) return true;
    const heartbeat = own.find(o=>o.kind==='heartbeat'&&o.status==='success');
    return !heartbeat || heartbeat.createdAt <= Date.now() - 7*86400000;
  });
  const lastRun = (id: string) => operations.find(o=>o.invoiceId===id&&o.account===account)?.createdAt || 0;
  candidates.sort((a,b)=>lastRun(a.id)-lastRun(b.id));
  for (const invoice of candidates.slice(0, 25)) {
    let reconciliationOrSubmissionStarted = false;
    try {
      // A saved pending hash is reconciled before any new sequence is prepared.
      const pending = records<ChainOperation>('operation').find(o => o.account === account && o.invoiceId === invoice.id && ['prepared','pending'].includes(o.status));
      if (pending) {
        reconciliationOrSubmissionStarted = true;
        if (pending.status === 'prepared') {
          // Preparation is persisted as pending before network submission below.
          // This branch handles interrupted older runs conservatively.
          pending.status = 'pending';
          putRecord('operation', pending.id, account, pending);
        }
        const result = await pollOperation(account, pending.id);
        revision = await persistDatabase(revision) ?? revision;
        report.push({invoiceId: invoice.id, status: result.status, hash: result.hash});
        continue;
      }
      const address = invoiceContract(invoice);
      const args = [new Address(invoice.merchant).toScVal(), nativeToScVal(Buffer.from(invoice.id, 'hex'), {type: 'bytes'})];
      const actual = await viewContract('get', args, address) as {status: string[]; disputed_at?: bigint};
      const status = String(Array.isArray(actual.status) ? actual.status[0] : actual.status).toLowerCase();
      // Final states reached through somebody else's wallet need their original
      // operation hash; do not label a read transaction as payment evidence.
      if (['released','refunded','cancelled','expired'].includes(status)) {
        report.push({invoiceId: invoice.id, status: 'external-settlement-needs-reconciliation'});
        continue;
      }
      const chainInvoice = {...invoice, status: status as Invoice['status'], disputedAt: Number(actual.disputed_at || 0)};
      const due = status === 'open' ? invoice.due : settlementDue(chainInvoice);
      const kind = due !== null && due <= Math.floor(Date.now()/1000) ? (status === 'open' ? 'expire' : 'finalize') : 'get';
      // A periodic signed get extends instance/invoice TTL on-chain. Simulation
      // alone would not keep long-running escrows alive.
      const lastHeartbeat = records<ChainOperation>('operation').find(o => o.account === account && o.invoiceId === invoice.id && o.kind === 'heartbeat' && o.status === 'success');
      if (kind === 'get' && lastHeartbeat && lastHeartbeat.createdAt > Date.now() - 7 * 86400000) continue;
      const source = await horizon.loadAccount(account);
      const tx = await soroban.prepareTransaction(new TransactionBuilder(source, {fee: '100', networkPassphrase: STELLAR.passphrase}).addOperation(new Contract(address).call(kind, ...args)).setTimeout(180).build());
      tx.sign(signer);
      const operation: ChainOperation = {id: randomUUID(), account, invoiceId: invoice.id, kind: kind === 'get' ? 'heartbeat' : kind, xdr: tx.toXDR(), hash: Buffer.from(tx.hash()).toString('hex'), status: 'pending', createdAt: Date.now()};
      reconciliationOrSubmissionStarted = true;
      putRecord('operation', operation.id, account, operation);
      revision = await persistDatabase(revision) ?? revision;
      // The signed hash is durable before any network side effect.
      const sent = await soroban.sendTransaction(tx);
      if (sent.status === 'ERROR') {
        operation.status = 'failed';
        operation.error = 'Keeper işlemi ağ tarafından reddedildi; sonraki çalıştırmada tekrar hazırlanacak.';
        putRecord('operation', operation.id, account, operation);
      }
      revision = await persistDatabase(revision) ?? revision;
      report.push({invoiceId: invoice.id, status: operation.status, hash: operation.hash});
    } catch (e) {
      report.push({invoiceId: invoice.id, status: 'error', error: e instanceof Error ? e.message : 'Keeper hatası'});
      // Read or preparation errors are isolated to this invoice. Once the
      // snapshot may have changed or a send is ambiguous, retry on a fresh run.
      if (reconciliationOrSubmissionStarted) break;
    }
  }
  return {processed: report.length, remaining: Math.max(0, candidates.length - 25), report};
}
