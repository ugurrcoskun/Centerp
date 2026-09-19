import {randomUUID} from 'node:crypto';
import {Address, Asset, Contract, Horizon, Memo, nativeToScVal, Operation, rpc, scValToNative, Transaction, TransactionBuilder} from '@stellar/stellar-sdk';
import {STELLAR} from './config';
import {amount, units} from './amount';
import {assertSignature} from './auth';
import {payableForPayment, settlePayable, syncERPInvoice} from './erp';
import {putRecord, record, records} from './db';
import type {AnchorTransfer, ChainOperation, Invoice, InvoiceStatus} from './types';

export const horizon = new Horizon.Server(STELLAR.horizon);
export const soroban = new rpc.Server(STELLAR.rpc);
export const usdc = new Asset(STELLAR.assetCode, STELLAR.issuer);
export const contractId = () => process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID || 'CCDPQPUS5SIBJF6YK2FZZV65P45U5FK7A3TMUE25T62VS3GQ22OG76IL';

export async function balances(account: string) {
  try {
    const result = await horizon.loadAccount(account);
    const xlm = result.balances.find(b => b.asset_type === 'native');
    const token = result.balances.find(b => 'asset_code' in b && b.asset_code === 'USDC' && b.asset_issuer === STELLAR.issuer);
    return {xlm: xlm?.balance || '0', usdc: token?.balance || '0', trustline: !!token, funded: true};
  } catch (error) {
    if (error && typeof error === 'object' && 'response' in error && (error.response as {status?: number})?.status === 404)
      return {xlm: '0', usdc: '0', trustline: false, funded: false};
    throw new Error('Stellar bakiyesi alınamadı. Bağlantıyı yenileyin.');
  }
}
export function ownedInvoice(account: string, id: string) {
  const invoice = record<Invoice>('invoice', id);
  if (invoice.merchant !== account && invoice.buyer !== account) throw new Error('Bu fatura cüzdanınıza ait değil.');
  return invoice;
}
export function linkedAnchorPaymentAmount(account: string, companyId: string, payableId: string, anchorId: string) {
  const transfer = record<AnchorTransfer>('anchor', anchorId);
  if (transfer.account !== account || transfer.kind !== 'deposit' || transfer.status !== 'completed' || transfer.erpCompanyId !== companyId || transfer.erpPayableId !== payableId || !transfer.quoteId)
    throw new Error('Tamamlanmış TRY → USDC işlemi bu ERP ödemesiyle eşleşmiyor.');
  const quote = record<{account: string; buy_amount: string}>('quote', transfer.quoteId);
  if (quote.account !== account) throw new Error('Anchor kur teklifi bu cüzdana ait değil.');
  return amount(quote.buy_amount);
}
export async function prepare(account: string, kind: string, invoiceId?: string, anchorId?: string, erp?: {companyId: string; payableId: string}): Promise<ChainOperation> {
  const source = await horizon.loadAccount(account);
  let builder = new TransactionBuilder(source, {fee: '100', networkPassphrase: STELLAR.passphrase});
  let isContract = false;
  if (kind === 'trustline') {
    builder = builder.addOperation(Operation.changeTrust({asset: usdc}));
  } else if (kind === 'erp_payment') {
    if (!erp) throw new Error('ERP ödeme kaydı gerekli.');
    const {payable, destination} = payableForPayment(erp.companyId, erp.payableId, account);
    const previous = records<ChainOperation>('operation').find(op => op.erpPayableId === payable.id && op.status !== 'failed');
    if (previous) return previous;
    let paymentAmount = payable.amount;
    if (anchorId) paymentAmount = linkedAnchorPaymentAmount(account, erp.companyId, payable.id, anchorId);
    builder = builder.addMemo(Memo.text(payable.code)).addOperation(Operation.payment({destination, asset: usdc, amount: paymentAmount}));
  } else if (kind === 'withdraw_payment') {
    if (!anchorId) throw new Error('Anchor işlem ID’si gerekli.');
    const transfer = record<AnchorTransfer>('anchor', anchorId);
    if (transfer.account !== account || transfer.kind !== 'withdraw' || transfer.hash || transfer.status === 'completed') throw new Error('Çekim işlemi uygun değil.');
    // Prevent a second signed payment for an already prepared withdrawal.
    const previous = records<ChainOperation>('operation').find(op => op.anchorId === anchorId && op.status !== 'failed');
    if (previous) return previous;
    const details = transfer.details;
    const destination = String(details.account_id || details.stellar_account_id || '');
    if (!destination.startsWith('G') || !details.memo || String(details.memo_type) !== 'id') throw new Error('Anchor ödeme talimatı geçersiz veya desteklenmeyen memo türü içeriyor.');
    builder = builder.addMemo(Memo.id(String(details.memo))).addOperation(Operation.payment({destination, asset: usdc, amount: transfer.amount}));
  } else {
    if (!invoiceId || !contractId()) throw new Error('Escrow sözleşmesi yapılandırılmamış. Önce Testnet deployment’ını tamamlayın.');
    const invoice = ownedInvoice(account, invoiceId);
    const merchantAction = ['create', 'refund', 'cancel'].includes(kind);
    const buyerAction = ['fund', 'release'].includes(kind);
    if (merchantAction && invoice.merchant !== account || buyerAction && invoice.buyer !== account) throw new Error('Bu işlem için doğru cüzdanı bağlayın.');
    const states: Record<string, InvoiceStatus> = {create: 'draft', fund: 'open', release: 'funded', refund: 'funded', cancel: 'open', expire: 'open'};
    if (!states[kind] || states[kind] !== invoice.status) throw new Error('Fatura bu işleme uygun değil.');
    const previous = records<ChainOperation>('operation').find(op => op.account === account && op.invoiceId === invoiceId && op.kind === kind && ['prepared', 'pending'].includes(op.status));
    if (previous && (previous.status === 'pending' || previous.createdAt > Date.now() - 120000)) return previous;
    if (kind === 'create') {
      const actualToken = await viewContract('token', []);
      if (actualToken !== usdc.contractId(STELLAR.passphrase)) throw new Error('Escrow sözleşmesi beklenen USDC SAC ile yapılandırılmamış.');
    }
    const args = [new Address(invoice.merchant).toScVal(), nativeToScVal(Buffer.from(invoice.id, 'hex'), {type: 'bytes'})];
    if (kind === 'create') args.push(new Address(invoice.buyer).toScVal(), nativeToScVal(units(invoice.amount), {type: 'i128'}), nativeToScVal(Buffer.from(invoice.commitment, 'hex'), {type: 'bytes'}), nativeToScVal(BigInt(invoice.due), {type: 'u64'}), nativeToScVal(BigInt(invoice.deliveryDue), {type: 'u64'}));
    builder = builder.addOperation(new Contract(contractId()).call(kind, ...args));
    isContract = true;
  }
  let tx = builder.setTimeout(180).build();
  if (isContract) tx = await soroban.prepareTransaction(tx);
  const operation: ChainOperation = {id: randomUUID(), account, kind, invoiceId, anchorId, erpCompanyId: erp?.companyId, erpPayableId: erp?.payableId, xdr: tx.toXDR(), hash: Buffer.from(tx.hash()).toString('hex'), status: 'prepared', createdAt: Date.now()};
  return putRecord('operation', operation.id, account, operation);
}
export async function viewContract(method: string, args: Parameters<Contract['call']>[1][]) {
  const source = await soroban.getAccount('GCLCZEQZ2THTEDAOFI66LACNPLY4OBKN7VKLEZFMBIHYKYQOW2W7T3Z6');
  const tx = new TransactionBuilder(source, {fee: '100', networkPassphrase: STELLAR.passphrase}).addOperation(new Contract(contractId()).call(method, ...args)).setTimeout(30).build();
  const sim = await soroban.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`Sözleşme okunamadı: ${sim.error}`);
  if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) throw new Error('Sözleşme sonucu alınamadı.');
  return scValToNative(sim.result.retval);
}
export async function submit(account: string, id: string, signedXdr: string) {
  const operation = record<ChainOperation>('operation', id);
  if (operation.account !== account) throw new Error('İşlem başka cüzdana ait.');
  if (operation.status === 'success' || operation.status === 'failed') return operation;
  // A timeout leaves the first submission outcome unknown. Do not submit the
  // same sequence number again: Horizon would reject that retry and we could
  // incorrectly mark an already accepted transaction as failed. Pending
  // operations are reconciled by the regular status polling instead.
  if (operation.status === 'pending') return operation;
  const signed = TransactionBuilder.fromXDR(signedXdr, STELLAR.passphrase);
  if (!(signed instanceof Transaction) || Buffer.from(signed.hash()).toString('hex') !== operation.hash) throw new Error('İmzalanan işlem beklenen ağ, işlem veya tutarla eşleşmiyor.');
  assertSignature(signed, account);
  operation.status = 'pending';
  putRecord('operation', id, account, operation);
  try {
    if (['trustline', 'withdraw_payment', 'erp_payment'].includes(operation.kind)) {
      const response = await horizon.submitTransaction(signed);
      if (response.successful) return markSuccess(operation);
    } else {
      const response = await soroban.sendTransaction(signed);
      if (response.status === 'ERROR') {
        operation.status = 'failed';
        operation.error = response.errorResult?.toXDR('base64') || 'Stellar işlemi reddedildi.';
      }
    }
  } catch (error) {
    const rejection = error && typeof error === 'object' && 'response' in error
      ? error.response as {status?: number; data?: {extras?: {result_codes?: unknown}}} : null;
    if (rejection?.status === 400 && rejection.data?.extras?.result_codes) {
      operation.status = 'failed';
      operation.error = `Stellar işlemi reddetti: ${JSON.stringify(rejection.data.extras.result_codes)}`;
    } else {
      // Timeouts are ambiguous. Keep the hash pending and inspect the chain.
      operation.error = `Gönderim sonucu belirsiz. İşlem hash’iyle kontrol edin: ${error instanceof Error ? error.message : 'Bağlantı hatası'}`;
    }
  }
  return putRecord('operation', id, account, operation);
}
async function markSuccess(operation: ChainOperation) {
  if (operation.invoiceId) {
    const invoice = record<Invoice>('invoice', operation.invoiceId);
    const actual = await viewContract('get', [new Address(invoice.merchant).toScVal(), nativeToScVal(Buffer.from(invoice.id, 'hex'), {type: 'bytes'})]) as {merchant: string; buyer: string; amount: bigint; commitment: Uint8Array; status: unknown};
    if (actual.merchant !== invoice.merchant || actual.buyer !== invoice.buyer || BigInt(actual.amount) !== units(invoice.amount) || Buffer.from(actual.commitment).toString('hex') !== invoice.commitment) throw new Error('On-chain fatura taahhüdü yerel kayıtla eşleşmiyor.');
    const actualState = String(Array.isArray(actual.status) ? actual.status[0] : actual.status).toLowerCase() as InvoiceStatus;
    invoice.status = actualState;
    if (!invoice.transactions.some(tx => tx.hash === operation.hash)) invoice.transactions.push({kind: operation.kind, hash: operation.hash});
    syncERPInvoice(invoice, operation.kind, operation.hash);
    putRecord('invoice', invoice.id, invoice.merchant, invoice);
  }
  if (operation.anchorId && operation.kind === 'withdraw_payment') {
    const transfer = record<AnchorTransfer>('anchor', operation.anchorId);
    transfer.hash = operation.hash;
    transfer.status = 'pending_anchor';
    putRecord('anchor', transfer.id, transfer.account, transfer);
  }
  if (operation.erpCompanyId && operation.erpPayableId) settlePayable(operation.erpCompanyId, operation.erpPayableId, operation.hash);
  operation.status = 'success';
  delete operation.error;
  return putRecord('operation', operation.id, operation.account, operation);
}
export async function pollOperation(account: string, id: string) {
  const operation = record<ChainOperation>('operation', id);
  if (operation.account !== account) throw new Error('İşlem başka cüzdana ait.');
  if (operation.status !== 'pending') return operation;
  if (['trustline', 'withdraw_payment', 'erp_payment'].includes(operation.kind)) {
    try {
      const transaction = await horizon.transactions().transaction(operation.hash).call();
      if (transaction.successful) return markSuccess(operation);
      operation.status = 'failed';
      operation.error = 'Stellar işlemi başarısız.';
    } catch { return operation; }
  } else {
    const result = await soroban.getTransaction(operation.hash);
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) return markSuccess(operation);
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      operation.status = 'failed';
      operation.error = 'Sözleşme işlemi başarısız; para aktarımı gerçekleşmedi.';
    }
  }
  return putRecord('operation', id, account, operation);
}
