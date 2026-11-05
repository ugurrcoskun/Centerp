import assert from 'node:assert/strict';
import {loadEnvConfig} from '@next/env';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Keypair} from '@stellar/stellar-sdk';
import type {Company,Contact,ERPState,Payable,Product,PurchaseOrder} from '../lib/erp-types';
import type {Invoice} from '../lib/types';
loadEnvConfig(process.cwd());
async function main(){
  const {TestActor}=await import('./erp-testnet-smoke');
  const owner=new TestActor(),billing=new TestActor(),approver=new TestActor(),viewer=new TestActor(),outsider=new TestActor();
  await Promise.all([owner.login(),billing.login(),approver.login(),viewer.login(),outsider.login()]);
  await owner.get(true);const company=await owner.post<Company>('linkWallet',{},true);
  for(const [actor,role] of [[billing,'billing'],[approver,'approver'],[viewer,'viewer']] as const){
    await owner.post('member',{account:actor.key.publicKey(),roles:[role],active:true},true);
    await actor.post('joinCompany',{companyId:company.id},true);
  }
  await assert.rejects(()=>viewer.post('company',{name:'Unauthorized rename'},true));
  await assert.rejects(()=>viewer.post('member',{account:viewer.key.publicKey(),roles:['admin'],active:true},true));
  const input={buyer:Keypair.random().publicKey(),buyerName:'Access test buyer',amount:'1',description:'Role-bound invoice draft',due:Math.floor(Date.now()/1000)+86400,deliveryDue:Math.floor(Date.now()/1000)+172800};
  await assert.rejects(()=>approver.post('createInvoice',input));
  const invoice=await billing.post<Invoice>('createInvoice',input);assert.equal(invoice.merchant,owner.key.publicKey());
  const vendor=await owner.post<Contact>('contact',{type:'vendor',name:'Access test vendor',wallet:input.buyer},true);
  const product=await owner.post<Product>('product',{sku:'ACCESS',name:'Access test item',type:'raw',quantity:0,reorderPoint:1,price:'1'},true);
  const purchase=await owner.post<PurchaseOrder>('purchase',{contactId:vendor.id,lines:[{productId:product.id,quantity:1,unitPrice:'1'}]},true);
  await owner.post('receive',{id:purchase.id},true);
  const payable=(await owner.get<ERPState>(true)).payables.find((p:Payable)=>p.sourceId===purchase.id)!;
  await assert.rejects(()=>billing.post('approvePayable',{id:payable.id},true));
  await approver.post('approvePayable',{id:payable.id},true);
  await owner.post('member',{account:approver.key.publicKey(),roles:['approver'],active:false},true);
  await assert.rejects(()=>approver.post('approvePayable',{id:payable.id},true));
  await assert.rejects(()=>outsider.post('joinCompany',{companyId:company.id},true));
  outsider.cookies.set('erp_workspace',owner.cookies.get('erp_workspace')!);
  await assert.rejects(()=>outsider.post('company',{name:'Stolen workspace cookie'},true));
  const read=await viewer.get<ERPState>(true);assert.equal(read.members.length,0);assert.equal(read.audit.length,0);
  assert((await owner.get<ERPState>(true)).audit.length>0);
  const proof={passedAt:new Date().toISOString(),companyId:company.id,assertions:['signed membership required','billing creates draft for company wallet','approver cannot create invoice','billing cannot approve payment','approver can approve payment','revocation applies to existing cookie','viewer cannot rename or escalate','outsider cannot join with company ID','workspace cookie without matching signed member rejected','member and audit data limited to managers']};
  mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/access-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Access smoke failed');process.exitCode=1;});
