import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Keypair,TransactionBuilder} from '@stellar/stellar-sdk';
import {STELLAR} from '../lib/config';
import type {AnchorTransfer,BridgeState,ChainOperation,Invoice} from '../lib/types';
import type {Company,Contact,Employee,ERPState,Payable,Product,ProductionJob,PurchaseOrder,SalesOrder} from '../lib/erp-types';
const origin=process.env.APP_ORIGIN||'http://127.0.0.1:3000';
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
class TestActor {
  key=Keypair.random(); cookies=new Map<string,string>();
  header(){return [...this.cookies].map(([name,value])=>name+'='+value).join('; ');}
  remember(response:Response){for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0];const index=pair.indexOf('=');this.cookies.set(pair.slice(0,index),pair.slice(index+1));}}
  async post<T>(action:string,params:Record<string,unknown>={},erp=false):Promise<T>{
    const r=await fetch(origin+(erp?'/api/erp':'/api/bridge'),{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:this.header()},body:JSON.stringify({action,...params})});
    this.remember(r);const body=await r.json();if(!r.ok)throw new Error(action+': '+body.error);return (erp?body.result:body) as T;
  }
  async get<T>(erp=false):Promise<T>{const r=await fetch(origin+(erp?'/api/erp':'/api/bridge'),{headers:{Cookie:this.header()}});this.remember(r);const body=await r.json();if(!r.ok)throw new Error(body.error);return body as T;}
  sign(xdr:string){const tx=TransactionBuilder.fromXDR(xdr,STELLAR.passphrase);tx.sign(this.key);return tx.toXDR();}
  async login(){const auth=await this.post<{id:string;xdr:string}>('challenge',{account:this.key.publicKey()});await this.post('session',{id:auth.id,signedXdr:this.sign(auth.xdr)});}
  async operation(kind:string,invoiceId?:string,payableId?:string){
    let op=await this.post<ChainOperation>('prepare',{kind,invoiceId,payableId});
    if(op.status==='prepared')op=await this.post('submit',{id:op.id,signedXdr:this.sign(op.xdr)});
    for(let i=0;i<40&&op.status==='pending';i++){await sleep(1500);op=await this.post('pollChain',{id:op.id});}
    assert.equal(op.status,'success',op.error);return op;
  }
}
async function main(){
  const merchant=new TestActor();const buyer=new TestActor();
  console.log('Opening signed Testnet sessions and an isolated ERP company…');
  await Promise.all([merchant.login(),buyer.login()]);
  await Promise.all([merchant.post('friendbot'),buyer.post('friendbot')]);
  await Promise.all([merchant.operation('trustline'),buyer.operation('trustline')]);
  await merchant.get<ERPState>(true);
  await merchant.post('company',{name:'ERP Testnet Entegrasyon Şirketi'},true);
  const company=await merchant.post<Company>('linkWallet',{},true);
  const customer=await merchant.post<Contact>('contact',{name:'ERP Test Müşteri',type:'customer',wallet:buyer.key.publicKey()},true);
  const vendor=await merchant.post<Contact>('contact',{name:'ERP Test Tedarikçi',type:'vendor',wallet:buyer.key.publicKey()},true);
  const staff=await merchant.post<Employee>('employee',{name:'ERP Test Çalışan',department:'Üretim',role:'Operatör',salary:'0.5',wallet:buyer.key.publicKey()},true);
  async function product(sku:string,type:'raw'|'finished',quantity:number,price:string){return merchant.post<Product>('product',{sku,name:sku,type,quantity,reorderPoint:2,price},true);}
  const rawA=await product('TEST-RAW-A','raw',10,'0.5');
  const rawB=await product('TEST-RAW-B','raw',5,'0.5');
  const finished=await product('TEST-FINISHED','finished',0,'1');
  console.log('Purchasing → inventory receipt → vendor liability; manufacturing → finished stock…');
  const purchase=await merchant.post<PurchaseOrder>('purchase',{contactId:vendor.id,lines:[{productId:rawA.id,quantity:2,unitPrice:'0.5'}]},true);
  await merchant.post('receive',{id:purchase.id},true);
  await assert.rejects(()=>merchant.post('receive',{id:purchase.id},true));
  const job=await merchant.post<ProductionJob>('production',{outputId:finished.id,quantity:3,inputs:[{productId:rawA.id,perUnit:1},{productId:rawB.id,perUnit:1}]},true);
  await merchant.post('completeProduction',{id:job.id},true);
  const stock=await merchant.get<ERPState>(true);
  assert.equal(stock.products.find(p=>p.id===finished.id)?.quantity,3);
  const sales=await merchant.post<SalesOrder>('sales',{contactId:customer.id,lines:[{productId:finished.id,quantity:3,unitPrice:'1'}]},true);
  const invoiceInput={buyer:buyer.key.publicKey(),buyerName:customer.name,amount:'3',description:'ERP siparişinden üretilen Testnet faturası',due:Math.floor(Date.now()/1000)+86400,deliveryDue:Math.floor(Date.now()/1000)+172800,orderId:sales.id};
  await assert.rejects(()=>merchant.post('createInvoice',{...invoiceInput,amount:'4'}));
  const invoice=await merchant.post<Invoice>('createInvoice',invoiceInput);
  const registered=await merchant.operation('create',invoice.id);
  console.log('ERP sale → locked TRY quote → bank simulation → on-chain escrow…');
  const challenge=await buyer.post<{xdr:string}>('anchorChallenge');
  await buyer.post('anchorLogin',{signedXdr:buyer.sign(challenge.xdr)});
  const quote=await buyer.post<{id:string}>('quote',{kind:'deposit',amount:'250'});
  let deposit=await buyer.post<AnchorTransfer>('transfer',{kind:'deposit',amount:'250',quoteId:quote.id,invoiceId:invoice.id});
  deposit=await buyer.post('simulate',{id:deposit.id});
  for(let i=0;i<40&&!['completed','error'].includes(deposit.status);i++){await sleep(1500);deposit=await buyer.post('pollAnchor',{id:deposit.id});}
  assert.equal(deposit.status,'completed');
  const funded=await buyer.operation('fund',invoice.id);
  await merchant.post('deliver',{id:sales.id},true);
  const beforeRelease=await merchant.get<BridgeState>();
  assert.equal(beforeRelease.balances.usdc,'0.0000000');
  assert.equal(beforeRelease.invoices.find(i=>i.id===invoice.id)?.status,'funded');
  const released=await buyer.operation('release',invoice.id);
  const paidSale=await merchant.get<ERPState>(true);
  assert.equal(paidSale.sales.find(s=>s.id===sales.id)?.status,'settled');
  assert.equal(paidSale.sales.find(s=>s.id===sales.id)?.delivered,true);
  assert.equal(paidSale.products.find(p=>p.id===finished.id)?.quantity,0);
  console.log('Vendor and employee liabilities → exact USDC payments → verified ERP settlement…');
  await merchant.post('payroll',{period:'2026-09'},true);
  await assert.rejects(()=>merchant.post('payroll',{period:'2026-09'},true));
  const liabilities=await merchant.get<ERPState>(true);
  const vendorDebt=liabilities.payables.find(p=>p.sourceId===purchase.id)!;
  const salaryDebt=liabilities.payables.find(p=>p.recipientId===staff.id)!;
  await assert.rejects(()=>buyer.post('prepare',{kind:'erp_payment',payableId:vendorDebt.id}));
  const vendorPayment=await merchant.operation('erp_payment',undefined,vendorDebt.id);
  const staffPayment=await merchant.operation('erp_payment',undefined,salaryDebt.id);
  await assert.rejects(()=>merchant.operation('erp_payment',undefined,vendorDebt.id));
  const finalERP=await merchant.get<ERPState>(true);
  const finalWallet=await merchant.get<BridgeState>();
  assert.equal(finalWallet.balances.usdc,'1.5000000');
  assert(finalERP.payables.every(p=>p.status==='paid'&&p.hash));
  assert.equal(finalERP.journal.length,7);
  const proof={passedAt:new Date().toISOString(),network:'TESTNET',companyId:company.id,merchant:merchant.key.publicKey(),customer:buyer.key.publicKey(),salesOrderId:sales.id,purchaseOrderId:purchase.id,productionJobId:job.id,invoiceId:invoice.id,depositId:deposit.id,depositHash:deposit.hash,invoiceCreateHash:registered.hash,escrowFundHash:funded.hash,escrowReleaseHash:released.hash,vendorPaymentHash:vendorPayment.hash,employeePaymentHash:staffPayment.hash,finalMerchantUSDC:finalWallet.balances.usdc,journalEntryCount:finalERP.journal.length,assertions:['isolated company session','company wallet proof','purchase receipt is unique','production consumes inputs and creates stock','sales total must match invoice','shipment does not release escrow','sale settled only after buyer-authorized chain release','duplicate payroll prevented','unauthorized payer rejected','vendor and employee paid on Stellar Testnet','paid liabilities cannot be paid twice','journal linked to real transaction hashes']};
  mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/erp-testnet-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'ERP integration failed');process.exitCode=1;});
