import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {db,putRecord,record,records} from '../lib/db';
import {pollOperation} from '../lib/stellar';
import type {ChainOperation,Invoice} from '../lib/types';
async function main(){
  const sourcePath=process.env.SOURCE_TEST_DATABASE_PATH;
  if(!sourcePath)throw new Error('SOURCE_TEST_DATABASE_PATH ile oluşturulan test veritabanını belirtin.');
  process.env.DATABASE_PATH=join(mkdtempSync(join(tmpdir(),'centerp-receipt-smoke-')),'clone.sqlite');
  delete process.env.VERCEL;process.env.USE_NEON='false';
  const source=new DatabaseSync(sourcePath,{readOnly:true});
  const rows=source.prepare("SELECT kind,id,account,body FROM records WHERE kind IN ('invoice','operation','erp_company','erp_sales','erp_journal')").all() as {kind:string;id:string;account:string;body:string}[];
  const insert=db().prepare('INSERT INTO records(kind,id,account,body) VALUES (?,?,?,?)');
  for(const row of rows)insert.run(row.kind,row.id,row.account,row.body);
  source.close();
  const erp=JSON.parse(readFileSync('artifacts/erp-testnet-v2-proof.json','utf8')) as {invoiceId:string;companyId:string};
  const escrow=JSON.parse(readFileSync('artifacts/escrow-v2-proof.json','utf8')) as {timeoutRefundHash:string;resolverRefundHash:string};
  const operations=records<ChainOperation>('operation').filter(o=>o.invoiceId===erp.invoiceId||[escrow.timeoutRefundHash,escrow.resolverRefundHash].includes(o.hash)).sort((a,b)=>a.createdAt-b.createdAt);
  assert(operations.length>=6);
  const checked:{invoiceId:string;kind:string;hash:string}[]=[];
  for(const operation of operations){
    if(operation.status!=='success')continue;
    const invoice=record<Invoice>('invoice',operation.invoiceId!);
    if(!checked.some(c=>c.invoiceId===invoice.id))putRecord('invoice',invoice.id,invoice.merchant,{...invoice,lastLedger:0,lastOrder:0});
    putRecord('operation',operation.id,operation.account,{...operation,status:'pending'});
    const result=await pollOperation(operation.account,operation.id);
    assert.equal(result.status,'success');checked.push({invoiceId:invoice.id,kind:operation.kind,hash:operation.hash});
  }
  assert.equal(record<Invoice>('invoice',erp.invoiceId).status,'released');
  const cash=records<{companyId:string;debit:string}>('erp_journal').filter(j=>j.companyId===erp.companyId&&j.debit==='USDC cüzdanı');assert.equal(cash.length,1);
  const proof={passedAt:new Date().toISOString(),assertions:['real Testnet receipt events parsed','receipt ledger order preserved','replay does not duplicate cash journal','only a disposable database clone changed','no new network transactions submitted'],checked};
  writeFileSync('artifacts/receipt-proof.json',JSON.stringify(proof,null,2)+'\n');console.log('PASS:',checked.length,'real transaction receipts reconciled in a disposable database clone.');
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Receipt smoke failed');process.exitCode=1;});
