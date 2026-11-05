import assert from 'node:assert/strict';
import test, {mock} from 'node:test';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Account, Asset, Keypair, Transaction, TransactionBuilder, Operation, nativeToScVal, StrKey} from '@stellar/stellar-sdk';
import {availableKeeperXlm,runKeeper} from '../lib/keeper';
import {deleteRecord, putRecord, record, records} from '../lib/db';
import {horizon, soroban, LEGACY_CONTRACT_ID, invoiceContract, pollOperation} from '../lib/stellar';
import {syncERPInvoice} from '../lib/erp';
import {STELLAR} from '../lib/config';
import type {ChainOperation, Invoice} from '../lib/types';
process.env.DATABASE_PATH=join(mkdtempSync(join(tmpdir(),'centerp-keeper-')),'test.sqlite');
function receiptEvent(invoice:Invoice,status:string){return {contractId:{value:StrKey.decodeContract(invoiceContract(invoice))},body:{v0:{topics:[nativeToScVal('changed'),nativeToScVal(invoice.merchant),nativeToScVal(Buffer.from(invoice.id,'hex'))],data:nativeToScVal({amount:10000000n,status:[status]})}}};}
function mockReserve(){mock.method(horizon,'ledgers',()=>({order:()=>({limit:()=>({call:async()=>({records:[{base_reserve_in_stroops:5000000}]})})})}));}

test('keeper persists a signed hash before sending and reconciles an ambiguous finalization without a second send',async()=>{
  const keeper=Keypair.random();process.env.ESCROW_KEEPER_SECRET=keeper.secret();
  const merchant=Keypair.random().publicKey(), buyer=Keypair.random().publicKey(), resolver=Keypair.random().publicKey();
  const contract=new Asset('USDC',STELLAR.issuer).contractId(STELLAR.passphrase);
  const invoice:Invoice={id:'aa'.repeat(32),code:'TEST',merchant,buyer,resolver,amount:'1.0000000',buyerName:'Test buyer',description:'Timeout test',due:1,deliveryDue:2,commitment:'bb'.repeat(32),status:'delivered',version:2,contract,transactions:[],createdAt:Date.now()};
  putRecord('invoice',invoice.id,merchant,invoice);
  let chainStatus='Delivered';let sends=0;
  mock.method(horizon,'loadAccount',async()=>Object.assign(new Account(keeper.publicKey(),'1'),{balances:[{asset_type:'native',balance:'10000'}]}));
  mockReserve();
  mock.method(soroban,'getAccount',async()=>new Account(keeper.publicKey(),'1'));
  mock.method(soroban,'simulateTransaction',async()=>({transactionData:{},result:{retval:nativeToScVal({merchant,buyer,resolver,amount:10000000n,commitment:Buffer.from(invoice.commitment,'hex'),status:[chainStatus],disputed_at:0n})}}));
  mock.method(soroban,'prepareTransaction',async (tx: Transaction)=>tx);
  mock.method(soroban,'sendTransaction',async()=>{
    sends++;
    const saved=records<ChainOperation>('operation')[0];
    assert.equal(saved.status,'pending');assert.equal(saved.kind,'finalize');assert(saved.hash);assert(saved.xdr);
    chainStatus='Released';
    throw new Error('Network response lost after acceptance');
  });
  mock.method(soroban,'getTransaction',async()=>({status:'SUCCESS',ledger:100,applicationOrder:1,events:{contractEventsXdr:[[receiptEvent(invoice,'Released')]]}}));
  try {
    const first=await runKeeper();assert.equal(first.report[0].status,'error');
    assert.equal(record<Invoice>('invoice',invoice.id).status,'delivered');
    const second=await runKeeper();assert.equal(second.report[0].status,'success');assert.equal(sends,1);
    const settled=record<Invoice>('invoice',invoice.id);assert.equal(settled.status,'released');assert.equal(settled.transactions.length,1);
    assert.equal((await runKeeper()).processed,0);assert.equal(sends,1);
    assert.equal(invoiceContract({...invoice,contract:undefined,version:1}),LEGACY_CONTRACT_ID);
  } finally {mock.restoreAll();delete process.env.ESCROW_KEEPER_SECRET;}
});

test('TTL heartbeat is a read transaction and never becomes payment evidence',async()=>{
  const keeper=Keypair.random();process.env.ESCROW_KEEPER_SECRET=keeper.secret();
  const merchant=Keypair.random().publicKey(),buyer=Keypair.random().publicKey(),resolver=Keypair.random().publicKey();
  const invoice:Invoice={id:'cc'.repeat(32),code:'TTL',merchant,buyer,resolver,amount:'1.0000000',buyerName:'TTL buyer',description:'TTL test',due:Math.floor(Date.now()/1000)+600,deliveryDue:Math.floor(Date.now()/1000)+86400,commitment:'dd'.repeat(32),status:'funded',version:2,contract:new Asset('USDC',STELLAR.issuer).contractId(STELLAR.passphrase),transactions:[],createdAt:Date.now()};
  putRecord('invoice',invoice.id,merchant,invoice);
  let sends=0;
  mock.method(horizon,'loadAccount',async()=>Object.assign(new Account(keeper.publicKey(),'1'),{balances:[{asset_type:'native',balance:'10000'}]}));
  mockReserve();
  mock.method(soroban,'getAccount',async()=>new Account(keeper.publicKey(),'1'));
  mock.method(soroban,'simulateTransaction',async()=>({transactionData:{},result:{retval:nativeToScVal({status:['Funded'],disputed_at:0n})}}));
  mock.method(soroban,'prepareTransaction',async (tx:Transaction)=>tx);
  mock.method(soroban,'sendTransaction',async()=>{sends++;return {status:'PENDING'};});
  mock.method(soroban,'getTransaction',async()=>({status:'SUCCESS',ledger:101,applicationOrder:1,events:{contractEventsXdr:[]}}));
  try {
    await runKeeper();
    assert.equal(records<ChainOperation>('operation')[0].kind,'heartbeat');
    await runKeeper();
    assert.equal(record<Invoice>('invoice',invoice.id).status,'funded');
    assert.equal(record<Invoice>('invoice',invoice.id).transactions.length,0);
    assert.equal((await runKeeper()).processed,0);assert.equal(sends,1);
  } finally {mock.restoreAll();delete process.env.ESCROW_KEEPER_SECRET;}
});

test('late fund receipts never relabel their hash as settlement or roll back a newer ERP status',async()=>{
  for(const reconciledRelease of [false,true]) {
    const merchant=Keypair.random().publicKey(),buyer=Keypair.random().publicKey(),resolver=Keypair.random().publicKey();
    const id=(reconciledRelease?'ee':'ff').repeat(32),companyId='company-'+id,orderId='order-'+id;
    const invoice:Invoice={id,code:'LATE',merchant,buyer,resolver,amount:'1.0000000',buyerName:'Buyer',description:'Late receipt',due:1,deliveryDue:2,commitment:'bb'.repeat(32),status:reconciledRelease?'released':'open',lastLedger:reconciledRelease?200:150,lastOrder:2,version:2,contract:new Asset('USDC',STELLAR.issuer).contractId(STELLAR.passphrase),transactions:[],createdAt:Date.now(),erpCompanyId:companyId,orderId};
    putRecord('erp_company',companyId,companyId,{id:companyId,wallet:merchant});
    putRecord('erp_sales',orderId,companyId,{id:orderId,companyId,code:'ORDER',invoiceId:id,total:invoice.amount,status:'invoiced',delivered:false});
    if(reconciledRelease)syncERPInvoice(invoice,'release','actual-release-hash');
    putRecord('invoice',id,merchant,invoice);
    const op:ChainOperation={id:'op-'+id,account:buyer,kind:'fund',invoiceId:id,xdr:'not-needed-for-confirmed-receipt',hash:'actual-fund-hash',status:'pending',createdAt:Date.now()};putRecord('operation',op.id,buyer,op);
    mock.method(soroban,'getTransaction',async()=>({status:'SUCCESS',ledger:199,applicationOrder:1,events:{contractEventsXdr:[[receiptEvent(invoice,'Funded')]]}}));
    mock.method(soroban,'getAccount',async()=>new Account(buyer,'1'));
    mock.method(soroban,'simulateTransaction',async()=>({transactionData:{},result:{retval:nativeToScVal({merchant,buyer,resolver,amount:10000000n,commitment:Buffer.from(invoice.commitment,'hex'),status:['Released'],disputed_at:0n})}}));
    try {
      assert.equal((await pollOperation(buyer,op.id)).status,'success');
      const saved=record<Invoice>('invoice',id);assert.equal(saved.status,reconciledRelease?'released':'funded');
      const order=record<{status:string}>('erp_sales',orderId);assert.equal(order.status,reconciledRelease?'settled':'invoiced');
      const cash=records<{companyId:string;debit:string;hash:string}>('erp_journal').filter(j=>j.companyId===companyId&&j.debit==='USDC cüzdanı');
      assert.equal(cash.length,reconciledRelease?1:0);if(cash.length)assert.equal(cash[0].hash,'actual-release-hash');
    } finally {mock.restoreAll();}
  }
});

test('missing classic payments unlock only after Horizon has indexed beyond their expiry',async()=>{
  const payer=Keypair.random().publicKey();
  const tx=new TransactionBuilder(new Account(payer,'1'),{fee:'100',networkPassphrase:STELLAR.passphrase}).addOperation(Operation.payment({destination:Keypair.random().publicKey(),asset:Asset.native(),amount:'1'})).setTimeout(180).build();
  const max=Number(tx.timeBounds!.maxTime);let indexedTime=max+30;
  const op:ChainOperation={id:'classic-missing',account:payer,kind:'erp_payment',xdr:tx.toXDR(),hash:Buffer.from(tx.hash()).toString('hex'),status:'pending',createdAt:Date.now()};putRecord('operation',op.id,payer,op);
  mock.method(horizon,'transactions',()=>({transaction:()=>({call:async()=>{throw Object.assign(new Error('Not found'),{response:{status:404}});}})}));
  mock.method(horizon,'ledgers',()=>({order:()=>({limit:()=>({call:async()=>({records:[{closed_at:new Date(indexedTime*1000).toISOString()}]})})})}));
  try {
    assert.equal((await pollOperation(payer,op.id)).status,'pending');
    indexedTime=max+61;
    assert.equal((await pollOperation(payer,op.id)).status,'failed');
    assert.equal(record<ChainOperation>('operation',op.id).status,'failed');
  } finally {mock.restoreAll();}
});

test('keeper fee availability excludes reserve sponsorship and selling liabilities',()=>{
  const balances=[{asset_type:'native',balance:'5.0000000',selling_liabilities:'1.0000000'}];
  assert.equal(availableKeeperXlm({balances,subentry_count:2,num_sponsoring:2,num_sponsored:1},5000000).toString(),'1.5');
  assert.equal(availableKeeperXlm({balances:[{asset_type:'native',balance:'1.0000000'}]},5000000).toString(),'0');
  assert.equal(availableKeeperXlm({balances:[{asset_type:'native',balance:'1.0000000'}],num_sponsored:2},5000000).toString(),'1');
});

test('an unreadable invoice does not prevent the next invoice from being finalized', async () => {
  const keeper = Keypair.random();
  const merchant = Keypair.random().publicKey();
  const base: Invoice = {
    id: 'ab'.repeat(32), code: 'BATCH', merchant, buyer: Keypair.random().publicKey(),
    amount: '1.0000000', buyerName: 'Buyer', description: 'Keeper batch', due: 1,
    deliveryDue: 2, commitment: 'bb'.repeat(32), status: 'funded', version: 2,
    contract: new Asset('USDC', STELLAR.issuer).contractId(STELLAR.passphrase), transactions: [], createdAt: Date.now(),
  };
  const unreadable = {...base, id: 'cd'.repeat(32)};
  const invoices = [base, unreadable];
  process.env.ESCROW_KEEPER_SECRET = keeper.secret();
  // Keep the new fixtures ahead of the cases used by earlier tests.
  for (const invoice of records<Invoice>('invoice')) deleteRecord('invoice', invoice.id);
  for (const invoice of invoices) putRecord('invoice', invoice.id, merchant, invoice);
  mock.method(horizon, 'loadAccount', async () => Object.assign(new Account(keeper.publicKey(), '1'), {balances: [{asset_type: 'native', balance: '10000'}]}));
  mockReserve();
  mock.method(soroban, 'getAccount', async () => new Account(keeper.publicKey(), '1'));
  let reads = 0;
  mock.method(soroban, 'simulateTransaction', async () => {
    if (++reads === 1) throw new Error('Invoice ledger entry unavailable');
    return {transactionData: {}, result: {retval: nativeToScVal({status: ['Funded']})}};
  });
  mock.method(soroban, 'prepareTransaction', async (tx: Transaction) => tx);
  const send = mock.method(soroban, 'sendTransaction', async () => ({status: 'PENDING'}));
  try {
    const {report} = await runKeeper();
    assert.deepEqual(report.map(({invoiceId, status}) => [invoiceId, status]), [[unreadable.id, 'error'], [base.id, 'pending']]);
    assert.equal(send.mock.callCount(), 1);
    assert.equal(records<ChainOperation>('operation').find(op => op.invoiceId === base.id)?.kind, 'finalize');
  } finally {
    mock.restoreAll();
    delete process.env.ESCROW_KEEPER_SECRET;
    for (const invoice of invoices) deleteRecord('invoice', invoice.id);
  }
});
