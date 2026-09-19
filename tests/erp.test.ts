import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Keypair, TransactionBuilder} from '@stellar/stellar-sdk';
import {challenge, createSession} from '../lib/auth';
import {STELLAR} from '../lib/config';
import {attachInvoice, erpState, mutateERP, openERP, orderForInvoice, payableForAnchor, payableForPayment, settlePayable, syncERPInvoice} from '../lib/erp';
import {putRecord} from '../lib/db';
import {linkedAnchorPaymentAmount} from '../lib/stellar';
import type {Company, Contact, Employee, ERPState, Product, ProductionJob, PurchaseOrder, SalesOrder} from '../lib/erp-types';
import type {Invoice} from '../lib/types';

process.env.DATABASE_PATH=join(mkdtempSync(join(tmpdir(),'stellar-erp-tests-')),'erp.sqlite');
process.env.ERP_DISABLE_DEFAULT_SEED='1';
function workspace() {
  const opened=openERP(new Request('http://localhost:3000/api/erp'));
  const request=new Request('http://localhost:3000/api/erp',{headers:{Cookie:'erp_workspace='+opened.token}});
  return {company:opened.company,request,change:(action:string,params:Record<string,unknown>={})=>mutateERP(request,{action,...params})};
}
function bind(w:ReturnType<typeof workspace>) {
  const key=Keypair.random();
  const proof=challenge(key.publicKey(),'localhost:3000');
  const tx=TransactionBuilder.fromXDR(proof.xdr,STELLAR.passphrase);tx.sign(key);
  const session=createSession(proof.id,tx.toXDR());
  const request=new Request('http://localhost:3000/api/erp',{headers:{Cookie:w.request.headers.get('cookie')+'; bridge_session='+session.token}});
  const company=mutateERP(request,{action:'linkWallet'}) as Company;
  return {...w,company,request,key};
}
const contact=(w:ReturnType<typeof workspace>,type:'customer'|'vendor',key='')=>w.change('contact',{type,name:type==='customer'?'Müşteri':'Tedarikçi',wallet:key}) as Contact;
const product=(w:ReturnType<typeof workspace>,sku:string,quantity:number,price='1')=>w.change('product',{sku,name:sku,type:'raw',quantity,reorderPoint:2,price}) as Product;
const snapshot=(w:ReturnType<typeof workspace>)=>erpState(w.company);

test('opaque company sessions isolate all business records and mutation references',()=>{
  const a=workspace();const b=workspace();const vendor=contact(a,'vendor');const item=product(a,'A',10);
  assert.equal(snapshot(b).products.length,0);
  assert.throws(()=>b.change('purchase',{contactId:vendor.id,lines:[{productId:item.id,quantity:1,unitPrice:'1'}]}),/şirketinize ait değil/);
});
test('purchase acceptance updates stock, liability and journal together and only once',()=>{
  const w=workspace();const vendor=contact(w,'vendor');const item=product(w,'RAW',1);
  const order=w.change('purchase',{contactId:vendor.id,lines:[{productId:item.id,quantity:2,unitPrice:'0.1'}]}) as PurchaseOrder;
  w.change('receive',{id:order.id});
  const state=snapshot(w);
  assert.equal(state.products[0].quantity,3);
  assert.equal(state.payables[0].amount,'0.2000000');
  assert.equal(state.journal.length,1);
  assert.throws(()=>w.change('receive',{id:order.id}));
  assert.equal(snapshot(w).products[0].quantity,3);
});
test('insufficient stock in a later line rolls back the whole shipment and all movements',()=>{
  const w=workspace();const customer=contact(w,'customer');const a=product(w,'A',10);const b=product(w,'B',1);
  const sale=w.change('sales',{contactId:customer.id,lines:[{productId:a.id,quantity:2,unitPrice:'1'},{productId:b.id,quantity:2,unitPrice:'1'}]}) as SalesOrder;
  const before=snapshot(w).movements.length;
  assert.throws(()=>w.change('deliver',{id:sale.id}),/yeterli stok yok/);
  const state=snapshot(w);
  assert.equal(state.products.find(p=>p.id===a.id)?.quantity,10);
  assert.equal(state.movements.length,before);
  assert.equal(state.sales[0].delivered,false);
});
test('production plans do not reserve stock; completion is atomic and cannot be replayed',()=>{
  const w=workspace();const a=product(w,'A',10);const b=product(w,'B',1);const out=product(w,'OUT',0);
  const job=w.change('production',{outputId:out.id,quantity:2,inputs:[{productId:a.id,perUnit:1},{productId:b.id,perUnit:1}]}) as ProductionJob;
  assert.throws(()=>w.change('completeProduction',{id:job.id}));
  assert.equal(snapshot(w).products.find(p=>p.id===a.id)?.quantity,10);
  const good=w.change('production',{outputId:out.id,quantity:1,inputs:[{productId:a.id,perUnit:2},{productId:b.id,perUnit:1}]}) as ProductionJob;
  w.change('completeProduction',{id:good.id});
  assert.equal(snapshot(w).products.find(p=>p.id===out.id)?.quantity,1);
  assert.equal(snapshot(w).products.find(p=>p.id===a.id)?.quantity,8);
  assert.throws(()=>w.change('completeProduction',{id:good.id}));
});
test('employee period liabilities are unique and retain the original amount snapshot',()=>{
  const w=workspace();
  const employee=w.change('employee',{name:'Test Çalışan',department:'Üretim',role:'Operatör',salary:'0.5'}) as Employee;
  w.change('payroll',{period:'2026-09'});
  assert.throws(()=>w.change('payroll',{period:'2026-09'}));
  w.change('employee',{id:employee.id,name:employee.name,department:employee.department,role:employee.role,salary:'1'});
  assert.equal(snapshot(w).payables[0].amount,'0.5000000');
  w.change('payroll',{period:'2026-10'});
  assert.equal(snapshot(w).payables.length,2);
});
test('sample workspace fills core modules and can be completed again without duplicates',()=>{
  const w=workspace();
  w.change('sample');
  const first=snapshot(w);
  assert.equal(first.contacts.length,6);
  assert.equal(first.products.length,7);
  assert.equal(first.employees.length,5);
  assert.equal(first.sales.length,3);
  assert.equal(first.purchases.length,3);
  assert.equal(first.production.filter(job=>job.status==='planned').length,1);
  assert.equal(first.payables.filter(row=>row.type==='vendor').length,2);
  assert.equal(first.payables.filter(row=>row.type==='salary').length,5);
  const counts=[first.contacts.length,first.products.length,first.employees.length,first.sales.length,first.purchases.length,first.production.length,first.payables.length,first.movements.length,first.journal.length];
  w.change('sample');
  const second=snapshot(w);
  assert.deepEqual([second.contacts.length,second.products.length,second.employees.length,second.sales.length,second.purchases.length,second.production.length,second.payables.length,second.movements.length,second.journal.length],counts);
});
test('new workspaces receive sample records by default while deleted records stay deleted',()=>{
  delete process.env.ERP_DISABLE_DEFAULT_SEED;
  const w=workspace();
  process.env.ERP_DISABLE_DEFAULT_SEED='1';
  const initial=snapshot(w);
  assert.equal(initial.contacts.length,6);
  assert.equal(initial.products.length,7);
  assert.equal(initial.employees.length,5);
  const employee=initial.employees[0];
  w.change('delete',{kind:'employee',id:employee.id});
  assert.equal(snapshot(w).employees.length,4);
  openERP(w.request);
  assert.equal(snapshot(w).employees.length,4);
});
test('record deletion protects dependencies and removes editable workflow records',()=>{
  const w=workspace();w.change('sample');
  const first=snapshot(w);
  const sale=first.sales.find(row=>row.contactId===first.contacts.find(contact=>contact.name.startsWith('Nova'))?.id)!;
  assert.throws(()=>w.change('delete',{kind:'contact',id:sale.contactId}),/bağlı siparişleri/);
  w.change('delete',{kind:'sales',id:sale.id});
  w.change('delete',{kind:'contact',id:sale.contactId});
  const ordered=snapshot(w).purchases.find(row=>row.status==='ordered')!;
  w.change('delete',{kind:'purchase',id:ordered.id});
  const planned=snapshot(w).production.find(row=>row.status==='planned')!;
  w.change('delete',{kind:'production',id:planned.id});
  const state=snapshot(w);
  assert.equal(state.sales.length,2);
  assert.equal(state.contacts.length,5);
  assert.equal(state.purchases.filter(row=>row.status==='ordered').length,0);
  assert.equal(state.production.filter(row=>row.status==='planned').length,0);
});
test('sales totals bind to company wallet and journals transition only with verified invoice events',()=>{
  const w=bind(workspace());const buyer=Keypair.random();const customer=contact(w,'customer',buyer.publicKey());const item=product(w,'FINISHED',3);
  const sale=w.change('sales',{contactId:customer.id,lines:[{productId:item.id,quantity:3,unitPrice:'0.1'}]}) as SalesOrder;
  assert.equal(sale.total,'0.3000000');
  assert.throws(()=>orderForInvoice(w.request,sale.id,buyer.publicKey()),/şirkete bağlı/);
  assert.equal(orderForInvoice(w.request,sale.id,w.key.publicKey()).order.id,sale.id);
  const invoice:Invoice={id:'a'.repeat(64),code:'TEST',merchant:w.key.publicKey(),buyer:buyer.publicKey(),buyerName:customer.name,amount:sale.total,description:'Test',due:1,deliveryDue:2,commitment:'b'.repeat(64),createdAt:Date.now(),status:'open',transactions:[],erpCompanyId:w.company.id,orderId:sale.id};
  attachInvoice(sale.id,w.company.id,invoice.id);
  syncERPInvoice(invoice,'create','create-hash');
  syncERPInvoice(invoice,'create','create-hash');
  assert.equal(snapshot(w).journal.length,1);
  syncERPInvoice({...invoice,status:'funded'},'fund','fund-hash');
  assert.equal(snapshot(w).sales[0].status,'invoiced');
  syncERPInvoice({...invoice,status:'released'},'release','release-hash');
  assert.equal(snapshot(w).sales[0].status,'settled');
  assert.equal(snapshot(w).journal.length,3);
  assert.equal(snapshot(w).sales[0].delivered,false);
});
test('payable settlement requires company wallet, recipient key and an immutable payment hash',()=>{
  const w=bind(workspace());const recipient=Keypair.random();const vendor=contact(w,'vendor',recipient.publicKey());const item=product(w,'A',0);
  const purchase=w.change('purchase',{contactId:vendor.id,lines:[{productId:item.id,quantity:1,unitPrice:'1'}]}) as PurchaseOrder;
  w.change('receive',{id:purchase.id});
  const payable=snapshot(w).payables[0];
  assert.throws(()=>payableForPayment(w.company.id,payable.id,recipient.publicKey()),/Şirketin Stellar/);
  assert.equal(payableForPayment(w.company.id,payable.id,w.key.publicKey()).destination,recipient.publicKey());
  settlePayable(w.company.id,payable.id,'payment-hash');
  settlePayable(w.company.id,payable.id,'payment-hash');
  assert.equal(snapshot(w).journal.length,2);
  assert.equal(snapshot(w).payables[0].status,'paid');
  assert.throws(()=>payableForPayment(w.company.id,payable.id,w.key.publicKey()),/zaten ödendi/);
  assert.throws(()=>settlePayable(w.company.id,payable.id,'different-hash'));
});

test('Anchor bank instructions do not require the recipient wallet before final Stellar settlement',()=>{
  const w=bind(workspace());const vendor=contact(w,'vendor');const item=product(w,'ANCHOR-FIRST',0);
  const purchase=w.change('purchase',{contactId:vendor.id,lines:[{productId:item.id,quantity:1,unitPrice:'50'}]}) as PurchaseOrder;
  w.change('receive',{id:purchase.id});
  const payable=snapshot(w).payables[0];
  assert.equal(payableForAnchor(w.company.id,payable.id,w.key.publicKey()).id,payable.id);
  assert.throws(()=>payableForPayment(w.company.id,payable.id,w.key.publicKey()),/Alıcının Stellar cüzdanı eksik/);
});

test('TRY-linked ERP payments use the Anchor quote USDC output, never the TRY face value',()=>{
  const w=bind(workspace());const recipient=Keypair.random();const vendor=contact(w,'vendor',recipient.publicKey());const item=product(w,'TRY-LINK',0);
  const purchase=w.change('purchase',{contactId:vendor.id,lines:[{productId:item.id,quantity:1,unitPrice:'2850'}]}) as PurchaseOrder;
  w.change('receive',{id:purchase.id});
  const payable=snapshot(w).payables[0];
  putRecord('quote','quote-try',w.key.publicKey(),{account:w.key.publicKey(),buy_amount:'58.1730000'});
  putRecord('anchor','anchor-try',w.key.publicKey(),{id:'anchor-try',account:w.key.publicKey(),kind:'deposit',status:'completed',amount:'2850.00',quoteId:'quote-try',erpCompanyId:w.company.id,erpPayableId:payable.id,createdAt:Date.now(),details:{}});
  assert.equal(linkedAnchorPaymentAmount(w.key.publicKey(),w.company.id,payable.id,'anchor-try'),'58.1730000');
  assert.throws(()=>linkedAnchorPaymentAmount(w.key.publicKey(),w.company.id,'wrong-payable','anchor-try'),/eşleşmiyor/);
});

test('escrow refund reverses revenue and receivables once without restoring shipped stock',()=>{
  const w=bind(workspace());const buyer=Keypair.random();const customer=contact(w,'customer',buyer.publicKey());const item=product(w,'RETURNED',3);
  const sale=w.change('sales',{contactId:customer.id,lines:[{productId:item.id,quantity:2,unitPrice:'1'}]}) as SalesOrder;
  const invoice:Invoice={id:'c'.repeat(64),code:'REFUND',merchant:w.key.publicKey(),buyer:buyer.publicKey(),buyerName:customer.name,amount:sale.total,description:'Refund test',due:1,deliveryDue:2,commitment:'d'.repeat(64),createdAt:Date.now(),status:'open',transactions:[],erpCompanyId:w.company.id,orderId:sale.id};
  attachInvoice(sale.id,w.company.id,invoice.id);
  syncERPInvoice(invoice,'create','create-refund-hash');
  syncERPInvoice({...invoice,status:'funded'},'fund','fund-refund-hash');
  w.change('deliver',{id:sale.id});
  syncERPInvoice({...invoice,status:'refunded'},'refund','refund-hash');
  syncERPInvoice({...invoice,status:'refunded'},'refund','refund-hash');
  const state=snapshot(w);
  assert.equal(state.journal.length,4);
  assert.equal(state.sales[0].status,'refunded');
  assert.equal(state.products[0].quantity,1);
  for(const account of ['Müşteri alacakları','Escrow alacakları','Satış gelirleri','USDC cüzdanı']){
    const net=state.journal.reduce((sum,row)=>sum+(row.debit===account?Number(row.amount):0)-(row.credit===account?Number(row.amount):0),0);
    assert.equal(net,0,account+' must have no remaining balance');
  }
});
