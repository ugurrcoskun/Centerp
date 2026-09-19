import {createHash, randomBytes} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {Address, Asset, Keypair, Operation, rpc, scValToNative, TransactionBuilder, xdr} from '@stellar/stellar-sdk';
import {STELLAR} from '../lib/config';

async function main() {
  const key = Keypair.random(); // Ephemeral deployment signer; never written to disk.
  const asset = new Asset('USDC', STELLAR.issuer);
  const token = asset.contractId(STELLAR.passphrase);
  const server = new rpc.Server(STELLAR.rpc);
  const friendbot = await fetch(`https://friendbot.stellar.org?addr=${key.publicKey()}`, {signal: AbortSignal.timeout(30000)});
  if (!friendbot.ok) throw new Error(`Friendbot: ${friendbot.status}`);
  async function send(operation: ReturnType<typeof Operation.uploadContractWasm>) {
    const account = await server.getAccount(key.publicKey());
    const transaction = new TransactionBuilder(account, {fee: '100', networkPassphrase: STELLAR.passphrase}).addOperation(operation).setTimeout(180).build();
    const prepared = await server.prepareTransaction(transaction);
    prepared.sign(key);
    const sent = await server.sendTransaction(prepared);
    if (sent.status === 'ERROR') throw new Error(`Deployment refused: ${sent.errorResult?.toXDR('base64')}`);
    for (let attempt = 0; attempt < 40; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const result = await server.getTransaction(sent.hash);
      if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) return result;
      if (result.status === rpc.Api.GetTransactionStatus.FAILED) throw new Error(`Deployment failed: ${sent.hash}`);
    }
    throw new Error(`Deployment not yet confirmed: ${sent.hash}`);
  }
  // Ensure the classic USDC asset has its network-deterministic SAC instance.
  try {await server.getContractData(token, xdr.ScVal.scvLedgerKeyContractInstance());} catch {
    await send(Operation.createStellarAssetContract({asset}));
  }
  const wasm = readFileSync('contracts/invoice-escrow/target/wasm32v1-none/release/invoice_escrow.wasm');
  console.log('Uploading escrow Wasm to Testnet…');
  const upload = await send(Operation.uploadContractWasm({wasm}));
  const wasmHash = createHash('sha256').update(wasm).digest();
  console.log('Deploying escrow with fixed USDC SAC…');
  const deploy = await send(Operation.createCustomContract({address: new Address(key.publicKey()), wasmHash, salt: randomBytes(32), constructorArgs: [new Address(token).toScVal()]}));
  if (!deploy.returnValue) throw new Error('Contract ID not returned by RPC.');
  const contractId = String(scValToNative(deploy.returnValue));
  mkdirSync('artifacts', {recursive: true});
  const proof = {network: 'TESTNET', protocol: 28, contractId, token, issuer: STELLAR.issuer, wasmSha256: wasmHash.toString('hex'), uploadHash: upload.txHash, deploymentHash: deploy.txHash, deployedAt: new Date().toISOString()};
  writeFileSync('artifacts/deployment.json', JSON.stringify(proof, null, 2) + '\n');
  const envPath = '.env.local';
  let envFile = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  for (const [name, value] of [['NEXT_PUBLIC_STELLAR_NETWORK', 'TESTNET'], ['NEXT_PUBLIC_ESCROW_CONTRACT_ID', contractId]]) {
    const line = `${name}=${value}`;
    const pattern = new RegExp(`^${name}=.*$`, 'm');
    envFile = pattern.test(envFile) ? envFile.replace(pattern, line) : `${envFile.trimEnd()}${envFile.trim() ? '\n' : ''}${line}\n`;
  }
  // Never erase Vercel/Neon credentials or unrelated local settings during deployment.
  writeFileSync(envPath, envFile);
  console.log(JSON.stringify(proof, null, 2));
}
main().catch(error => {console.error(error instanceof Error ? error.message : 'Deployment error'); process.exitCode = 1;});
