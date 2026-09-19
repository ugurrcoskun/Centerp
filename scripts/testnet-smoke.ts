import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {Keypair, Transaction, TransactionBuilder} from '@stellar/stellar-sdk';
import {STELLAR} from '../lib/config';
import type {AnchorTransfer, BridgeState, ChainOperation, Invoice} from '../lib/types';

const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:3000';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
class TestWallet {
  key = Keypair.random(); cookie = '';
  async post<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(`${origin}/api/bridge`, {method: 'POST', headers: {'Content-Type': 'application/json', Origin: origin, Cookie: this.cookie}, body: JSON.stringify({action, ...params})});
    const body = await response.json();
    if (!response.ok) throw new Error(`${action}: ${body.error}`);
    const cookie = response.headers.get('set-cookie');
    if (cookie) this.cookie = cookie.split(';')[0];
    return body as T;
  }
  sign(xdr: string) {const tx = TransactionBuilder.fromXDR(xdr, STELLAR.passphrase); assert(tx instanceof Transaction); tx.sign(this.key); return tx.toXDR();}
  async login() {
    const challenge = await this.post<{id: string; xdr: string}>('challenge', {account: this.key.publicKey()});
    await this.post('session', {id: challenge.id, signedXdr: this.sign(challenge.xdr)});
  }
  async state(): Promise<BridgeState> {const response = await fetch(`${origin}/api/bridge`, {headers: {Cookie: this.cookie}}); return response.json();}
  async operation(kind: string, invoiceId?: string, anchorId?: string) {
    let op = await this.post<ChainOperation>('prepare', {kind, invoiceId, anchorId});
    op = await this.post<ChainOperation>('submit', {id: op.id, signedXdr: this.sign(op.xdr)});
    for (let attempt = 0; attempt < 40 && op.status === 'pending'; attempt++) {await delay(1500); op = await this.post('pollChain', {id: op.id});}
    assert.equal(op.status, 'success', op.error);
    return op;
  }
  async anchorLogin() {const auth = await this.post<{xdr: string}>('anchorChallenge'); await this.post('anchorLogin', {signedXdr: this.sign(auth.xdr)});}
  async pollTransfer(tx: AnchorTransfer) {
    for (let attempt = 0; attempt < 40 && !['completed', 'error'].includes(tx.status); attempt++) {await delay(1500); tx = await this.post('pollAnchor', {id: tx.id});}
    assert.equal(tx.status, 'completed', JSON.stringify(tx.details));
    return tx;
  }
}
async function main() {
  const merchant = new TestWallet(); const buyer = new TestWallet();
  console.log('Opening two signed app sessions and funding Testnet accounts…');
  await Promise.all([merchant.login(), buyer.login()]);
  await Promise.all([merchant.post('friendbot'), buyer.post('friendbot')]);
  const trustlines = await Promise.all([merchant.operation('trustline'), buyer.operation('trustline')]);
  console.log('Authenticating with TR Mock Anchor; requesting locked TRY → USDC quote…');
  await Promise.all([merchant.anchorLogin(), buyer.anchorLogin()]);
  const invoice = await merchant.post<Invoice>('createInvoice', {buyer: buyer.key.publicKey(), buyerName: 'Testnet Demo Müşteri', amount: '3', description: 'Uçtan uca Testnet entegrasyon testi', due: Math.floor(Date.now() / 1000) + 86400, deliveryDue: Math.floor(Date.now() / 1000) + 172800});
  const created = await merchant.operation('create', invoice.id);
  const quote = await buyer.post<{id: string}>('quote', {kind: 'deposit', amount: '250'});
  let deposit = await buyer.post<AnchorTransfer>('transfer', {kind: 'deposit', amount: '250', quoteId: quote.id, invoiceId: invoice.id});
  deposit = await buyer.post('simulate', {id: deposit.id});
  deposit = await buyer.pollTransfer(deposit);
  console.log('Deposit completed. Funding escrow and releasing after delivery approval…');
  const before = await buyer.state();
  assert(Number(before.balances.usdc) >= 3);
  const funded = await buyer.operation('fund', invoice.id);
  const escrowState = await merchant.state();
  assert.equal(escrowState.invoices.find(i => i.id === invoice.id)?.status, 'funded');
  assert.equal(escrowState.balances.usdc, '0.0000000');
  const released = await buyer.operation('release', invoice.id);
  const settled = await merchant.state();
  assert.equal(settled.invoices.find(i => i.id === invoice.id)?.status, 'released');
  assert.equal(settled.balances.usdc, '3.0000000');
  await assert.rejects(() => buyer.operation('release', invoice.id));
  console.log('Withdrawing merchant USDC to mocked TRY bank account…');
  const outQuote = await merchant.post<{id: string}>('quote', {kind: 'withdraw', amount: '1'});
  let withdraw = await merchant.post<AnchorTransfer>('transfer', {kind: 'withdraw', amount: '1', quoteId: outQuote.id, invoiceId: invoice.id});
  const paid = await merchant.operation('withdraw_payment', undefined, withdraw.id);
  withdraw = await merchant.pollTransfer(withdraw);
  const proof = {passedAt: new Date().toISOString(), network: 'TESTNET', origin, contractId: settled.contract, merchant: merchant.key.publicKey(), buyer: buyer.key.publicKey(), invoiceId: invoice.id, invoiceCode: invoice.code, trustlineHashes: trustlines.map(tx => tx.hash), createHash: created.hash, depositId: deposit.id, depositHash: deposit.hash, fundHash: funded.hash, releaseHash: released.hash, withdrawId: withdraw.id, withdrawPaymentHash: paid.hash, assertions: ['signed app sessions', 'USDC trustlines', 'SEP-1 discovery', 'SEP-10 anchor auth', 'SEP-38 locked quotes', 'SEP-6 deposit-exchange', 'mock bank simulation', 'on-chain escrow funding', 'no merchant receipt before release', 'buyer-authorized release', 'duplicate release rejected', 'SEP-6 withdraw-exchange', 'memo-id USDC payment', 'anchor completed withdrawals']};
  mkdirSync('artifacts', {recursive: true}); writeFileSync('artifacts/testnet-proof.json', JSON.stringify(proof, null, 2) + '\n');
  console.log(JSON.stringify(proof, null, 2));
}
main().catch(error => {console.error(error instanceof Error ? error.message : 'Integration test error'); process.exitCode = 1;});
