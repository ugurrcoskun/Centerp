import {existsSync, readFileSync, writeFileSync, chmodSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {Keypair} from '@stellar/stellar-sdk';
const path = '.env.local';
let body = existsSync(path) ? readFileSync(path, 'utf8') : '';
function add(name: string, value: () => string) {
  if (!new RegExp(`^${name}=.+$`, 'm').test(body)) {
    const line = `${name}=${value()}`;
    body = new RegExp(`^${name}=.*$`, 'm').test(body) ? body.replace(new RegExp(`^${name}=.*$`, 'm'), line) : body.trimEnd() + '\n' + line + '\n';
  }
}
add('APP_ORIGIN', () => 'http://127.0.0.1:3000');
add('SEP10_SIGNING_SECRET', () => Keypair.random().secret());
let resolver: Keypair | undefined;
add('ESCROW_RESOLVER_SECRET', () => {resolver = Keypair.random(); return resolver.secret();});
add('ESCROW_RESOLVER_PUBLIC_KEY', () => resolver?.publicKey() || Keypair.fromSecret(body.match(/^ESCROW_RESOLVER_SECRET=(.+)$/m)![1]).publicKey());
add('ESCROW_KEEPER_SECRET', () => Keypair.random().secret());
add('CRON_SECRET', () => randomBytes(32).toString('hex'));
writeFileSync(path, body, {mode: 0o600});
chmodSync(path, 0o600);
console.log('Yerel anahtarlar .env.local içinde hazır; mevcut değerler korundu. Secret değerleri yazdırılmadı.');
