import {loadEnvConfig} from '@next/env';
loadEnvConfig(process.cwd());
async function main() {
const {runKeeper} = await import('../lib/keeper');
return runKeeper().then(result => {
  console.log(JSON.stringify(result, null, 2));
  if (result.remaining || result.report.some(r => ['failed','error','external-settlement-needs-reconciliation'].includes(r.status))) process.exitCode = 1;
});
}
main().catch(e => {console.error(e instanceof Error ? e.message : 'Keeper hatası'); process.exitCode = 1;});
