import {createHash, randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {accountFromRequest, assertOrigin, challenge, COOKIE, createSession, logout, publicKey, requireAccount} from '@/lib/auth';
import {anchorChallenge, anchorLogin, discoverAnchor, isAnchorAuthenticated, refreshTransfer, requestQuote, simulateTransfer, startTransfer} from '@/lib/anchor';
import {amount} from '@/lib/amount';
import {attachInvoice, erpCompany, orderForInvoice, payableForPayment, transaction} from '@/lib/erp';
import {STELLAR} from '@/lib/config';
import {hydrateDatabase, persistDatabase, putRecord, records} from '@/lib/db';
import {fetchJson, parseRequestJson} from '@/lib/http';
import {balances, contractId, ownedInvoice, pollOperation, prepare, submit} from '@/lib/stellar';
import type {AnchorTransfer, ChainOperation, Invoice} from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = async (value: unknown, revision: number | null) => { await persistDatabase(revision); return NextResponse.json(value, {headers: {'Cache-Control': 'no-store'}}); };
const string = z.string().min(1).max(20000);
const idString = z.string().min(1).max(20000);
const actions = z.discriminatedUnion('action', [
  z.object({action: z.literal('challenge'), account: string}),
  z.object({action: z.literal('session'), id: idString, signedXdr: string}),
  z.object({action: z.literal('logout')}),
  z.object({action: z.literal('friendbot')}),
  z.object({action: z.literal('anchorChallenge')}),
  z.object({action: z.literal('anchorLogin'), signedXdr: string}),
  z.object({action: z.literal('createInvoice'), buyer: string, buyerName: z.string().trim().min(2).max(120), amount: z.string().max(30), description: z.string().trim().min(3).max(1000), due: z.number().int(), deliveryDue: z.number().int(), orderId: z.string().uuid().optional()}),
  z.object({action: z.literal('quote'), kind: z.enum(['deposit', 'withdraw']), amount: z.string().max(30)}),
  z.object({action: z.literal('transfer'), kind: z.enum(['deposit', 'withdraw']), amount: z.string().max(30), quoteId: idString.optional(), invoiceId: idString.optional(), payableId: z.string().uuid().optional()}),
  z.object({action: z.literal('simulate'), id: idString}),
  z.object({action: z.literal('pollAnchor'), id: idString}),
  z.object({action: z.literal('prepare'), kind: z.enum(['trustline', 'withdraw_payment', 'create', 'fund', 'release', 'refund', 'cancel', 'expire', 'erp_payment']), invoiceId: idString.optional(), anchorId: idString.optional(), payableId: z.string().uuid().optional()}),
  z.object({action: z.literal('submit'), id: idString, signedXdr: string}),
  z.object({action: z.literal('pollChain'), id: idString}),
]);
export async function GET(request: Request) {
  try {
    await hydrateDatabase();
    const account = accountFromRequest(request);
    const [wallet, health, discovery] = await Promise.allSettled([
      account ? balances(account) : Promise.resolve({xlm: '0', usdc: '0', trustline: false, funded: false}),
      fetchJson(`${STELLAR.anchor}/health`), discoverAnchor(),
    ]);
    return NextResponse.json({account, contract: contractId(), balances: wallet.status === 'fulfilled' ? wallet.value : null,
      balanceError: wallet.status === 'rejected' ? String(wallet.reason.message) : null,
      health: health.status === 'fulfilled' && discovery.status === 'fulfilled' ? health.value : null,
      anchorAuthenticated: account ? isAnchorAuthenticated(account) : false,
      invoices: account ? records<Invoice>('invoice').filter(i => i.merchant === account || i.buyer === account) : [],
      transfers: account ? records<AnchorTransfer>('anchor').filter(t => t.account === account) : [],
      operations: account ? records<ChainOperation>('operation').filter(o => o.account === account).map(({xdr: _xdr, ...op}) => op) : [],
    }, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const revision = await hydrateDatabase();
    assertOrigin(request);
    if (Number(request.headers.get('content-length') || 0) > 100000) throw new Error('İstek çok büyük.');
    const raw = await request.text();
    if (raw.length > 100000) throw new Error('İstek çok büyük.');
    const input = actions.parse(parseRequestJson(raw));
    if (input.action === 'challenge') return reply(challenge(publicKey(input.account), new URL(request.url).host), revision);
    if (input.action === 'session') {
      const session = createSession(input.id, input.signedXdr);
      const response = await reply({account: session.account}, revision);
      response.cookies.set(COOKIE, session.token, {httpOnly: true, sameSite: 'strict', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 43200});
      return response;
    }
    if (input.action === 'logout') {
      logout(request); const response = await reply({ok: true}, revision); response.cookies.delete(COOKIE); return response;
    }
    const account = requireAccount(request);
    switch (input.action) {
      case 'friendbot': {
        return reply(await fetchJson(`https://friendbot.stellar.org?addr=${account}`), revision);
      }
      case 'anchorChallenge': return reply(await anchorChallenge(account), revision);
      case 'anchorLogin': return reply(await anchorLogin(account, input.signedXdr), revision);
      case 'createInvoice': {
        const erp = input.orderId ? orderForInvoice(request, input.orderId, account) : null;
        const buyer = publicKey(input.buyer);
        if (erp && (buyer !== erp.contact.wallet || amount(input.amount) !== erp.order.total)) throw new Error('Fatura müşterisi ve tutarı ERP siparişiyle eşleşmeli.');
        const now = Math.floor(Date.now() / 1000);
        if (buyer === account) throw new Error('Müşteri ve satıcı cüzdanı farklı olmalı.');
        if (input.due <= now + 60 || input.due > now + 366 * 86400 || input.deliveryDue < input.due || input.deliveryDue > now + 730 * 86400) throw new Error('Vade gelecekte, teslim tarihi de vadeden sonra olmalı.');
        const id = randomBytes(32).toString('hex');
        const canonical = amount(input.amount);
        const snapshot = JSON.stringify({v: 1, network: STELLAR.passphrase, id, merchant: account, buyer, amount: canonical, due: input.due, deliveryDue: input.deliveryDue, description: input.description, ...(erp ? {orderId: erp.order.id, lines: erp.order.lines} : {})});
        const invoice: Invoice = {id, code: `INV-${new Date().getFullYear()}-${id.slice(0, 6).toUpperCase()}`, merchant: account, buyer, buyerName: erp?.contact.name || input.buyerName, orderId: erp?.order.id, erpCompanyId: erp?.company.id, amount: canonical, description: input.description, due: input.due, deliveryDue: input.deliveryDue, commitment: createHash('sha256').update(snapshot).digest('hex'), status: 'draft', createdAt: Date.now(), transactions: []};
        return reply(transaction(() => {
          if (erp) attachInvoice(erp.order.id, erp.company.id, invoice.id);
          return putRecord('invoice', id, account, invoice);
        }), revision);
      }
      case 'quote': return reply(await requestQuote(account, input.kind, input.amount), revision);
      case 'transfer': {
        const wallet = await balances(account);
        if (!wallet.trustline) throw new Error('Önce USDC trustline oluşturun.');
        if (input.invoiceId) ownedInvoice(account, input.invoiceId);
        let erp: {companyId: string; payableId: string} | undefined;
        if (input.payableId) {
          if (input.kind !== 'deposit') throw new Error('ERP borcu yalnızca TRY yatırma akışına bağlanabilir.');
          const company = erpCompany(request);
          const {payable} = payableForPayment(company.id, input.payableId, account);
          if (Number(payable.amount) > 3000) throw new Error('Bu ERP ödemesi 3.000 TRY sınırını aşıyor. Daha düşük bir ödeme kaydı kullanın.');
          if (Number(input.amount) !== Number(payable.amount)) throw new Error('Anchor tutarı ERP ödeme kaydıyla eşleşmiyor. Ödeme satırından yeniden başlatın.');
          erp = {companyId: company.id, payableId: payable.id};
        }
        return reply(await startTransfer(account, input.kind, input.amount, input.quoteId, input.invoiceId, erp), revision);
      }
      case 'simulate': return reply(await simulateTransfer(account, input.id), revision);
      case 'pollAnchor': return reply(await refreshTransfer(account, input.id), revision);
      case 'prepare': {
        const erp = input.kind === 'erp_payment' ? {companyId: erpCompany(request).id, payableId: input.payableId || ''} : undefined;
        if (erp && !erp.payableId) throw new Error('ERP borç kaydı gerekli.');
        return reply(await prepare(account, input.kind, input.invoiceId, input.anchorId, erp), revision);
      }
      case 'submit': return reply(await submit(account, input.id, input.signedXdr), revision);
      case 'pollChain': return reply(await pollOperation(account, input.id), revision);
    }
  } catch (error) { return failure(error); }
}
function failure(error: unknown) {
  const message = error instanceof z.ZodError ? 'Form alanlarını kontrol edin.' : error instanceof Error ? error.message : 'İşlem tamamlanamadı.';
  return NextResponse.json({error: message}, {status: 400, headers: {'Cache-Control': 'no-store'}});
}
