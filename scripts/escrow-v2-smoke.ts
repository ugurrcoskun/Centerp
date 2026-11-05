import assert from 'node:assert/strict';
import {loadEnvConfig} from '@next/env';
import {Keypair} from '@stellar/stellar-sdk';
import {mkdirSync,writeFileSync} from 'node:fs';
import {readApiJson} from '../lib/client-api';
import type {AnchorTransfer,BridgeState,Invoice} from '../lib/types';
loadEnvConfig(process.cwd());
const origin=process.env.APP_ORIGIN||'http://127.0.0.1:3000';
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
  const {TestActor}=await import('./erp-testnet-smoke');
  const merchant=new TestActor(),buyer=new TestActor(),resolver=new TestActor();
  if(!process.env.CRON_SECRET||!process.env.ESCROW_RESOLVER_SECRET)throw new Error('Yerel keeper/hakem test anahtarları gerekli.');
  resolver.key=Keypair.fromSecret(process.env.ESCROW_RESOLVER_SECRET);
  console.log('Preparing three Testnet identities for timeout and dispute checks…');
  await Promise.all([merchant.login(),buyer.login(),resolver.login()]);
  await Promise.all([merchant.post('friendbot'),buyer.post('friendbot')]);
  // Resolver may already be funded by an earlier test run.
  if(!(await resolver.get<BridgeState>()).balances.funded)await resolver.post('friendbot');
  await Promise.all([merchant.operation('trustline'),buyer.operation('trustline')]);
  await merchant.get(true);await merchant.post('linkWallet',{},true);
  const auth=await buyer.post<{xdr:string}>('anchorChallenge');await buyer.post('anchorLogin',{signedXdr:buyer.sign(auth.xdr)});
  const quote=await buyer.post<{id:string}>('quote',{kind:'deposit',amount:'100'});
  let deposit=await buyer.post<AnchorTransfer>('transfer',{kind:'deposit',amount:'100',quoteId:quote.id});deposit=await buyer.post('simulate',{id:deposit.id});
  for(let i=0;i<40&&!['completed','error'].includes(deposit.status);i++){await pause(1500);deposit=await buyer.post('pollAnchor',{id:deposit.id});}
  assert.equal(deposit.status,'completed');
  const before=(await buyer.get<BridgeState>()).balances.usdc;
  async function create(description:string,seconds:number){
    const now=Math.floor(Date.now()/1000);
    const invoice=await merchant.post<Invoice>('createInvoice',{buyer:buyer.key.publicKey(),buyerName:'Escrow V2 Test Buyer',amount:'0.1',description,due:now+seconds,deliveryDue:now+seconds+5});
    assert.equal(invoice.version,2);assert.equal(invoice.resolver,resolver.key.publicKey());
    await merchant.operation('create',invoice.id);await buyer.operation('fund',invoice.id);return invoice;
  }
  console.log('Funding a short-deadline invoice without a delivery report…');
  const timeout=await create('Testnet: missing merchant must refund',120);
  console.log('Opening a dispute and resolving it with the independent resolver…');
  const disputed=await create('Testnet: independent resolver refund',86400);
  await merchant.operation('deliver',disputed.id);
  const dispute=await buyer.operation('dispute',disputed.id);
  const resolved=await resolver.operation('resolve_refund',disputed.id);
  assert.equal((await buyer.get<BridgeState>()).invoices.find(i=>i.id===disputed.id)?.status,'refunded');
  await assert.rejects(()=>resolver.operation('resolve_refund',disputed.id));
  console.log('Waiting for the short delivery deadline; then invoking the actual keeper endpoint…');
  while(Date.now()/1000<timeout.deliveryDue+2)await pause(1000);
  let settled:Invoice|undefined;
  for(let i=0;i<20;i++){
    const response=await fetch(origin+'/api/cron/escrow',{headers:{Authorization:'Bearer '+process.env.CRON_SECRET}});
    const result=await readApiJson<{report:{invoiceId:string;status:string;error?:string}[]}>(response);
    if(result.report.some(r=>r.status==='error'))throw new Error('Keeper failed: '+result.report.find(r=>r.status==='error')?.error);
    settled=(await buyer.get<BridgeState>()).invoices.find(i=>i.id===timeout.id);
    if(settled?.status==='refunded')break;
    await pause(1500);
  }
  assert.equal(settled?.status,'refunded');
  assert.equal((await buyer.get<BridgeState>()).balances.usdc,before);
  const finalization=settled!.transactions.find(t=>t.kind==='finalize');assert(finalization);
  const proof={passedAt:new Date().toISOString(),network:'TESTNET',contract:timeout.contract,timeoutInvoiceId:timeout.id,timeoutRefundHash:finalization.hash,disputedInvoiceId:disputed.id,disputeHash:dispute.hash,resolverRefundHash:resolved.hash,buyerBalanceBefore:before,buyerBalanceAfter:(await buyer.get<BridgeState>()).balances.usdc,assertions:['independent resolver address committed','missing delivery refunded by dedicated keeper','disputed escrow refunded by authorized resolver','resolution cannot replay','buyer balances restored exactly']};
  mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/escrow-v2-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Escrow V2 test failed');process.exitCode=1;});
