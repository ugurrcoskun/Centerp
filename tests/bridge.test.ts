import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Keypair, TransactionBuilder} from '@stellar/stellar-sdk';
import {amount, sumAmounts, units} from '../lib/amount';
import {challenge, createSession, accountFromRequest} from '../lib/auth';
import {STELLAR} from '../lib/config';
import {putRecord, record} from '../lib/db';

process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), 'invoice-bridge-tests-')), 'test.sqlite');
test('decimal amounts preserve Stellar units without floating point rounding', () => {
  assert.equal(units('0.0000001'), 1n);
  assert.equal(units('1234.5678901'), 12345678901n);
  assert.equal(sumAmounts(['0.1', '0.2']), '0.3000000');
  for (const value of ['0', '-1', 'NaN', '1e3', '0.00000001', '1000001', 'Infinity']) assert.throws(() => amount(value));
});
test('a public key alone does not establish a session; signatures and replay checks do', () => {
  const signer = Keypair.random();
  const attacker = Keypair.random();
  const proof = challenge(signer.publicKey(), 'localhost:3000');
  const invalid = TransactionBuilder.fromXDR(proof.xdr, STELLAR.passphrase);
  invalid.sign(attacker);
  assert.throws(() => createSession(proof.id, invalid.toXDR()), /imzası geçersiz/);
  const valid = TransactionBuilder.fromXDR(proof.xdr, STELLAR.passphrase);
  valid.sign(signer);
  const session = createSession(proof.id, valid.toXDR());
  assert.equal(accountFromRequest(new Request('http://localhost:3000', {headers: {Cookie: `bridge_session=${session.token}`}})), signer.publicKey());
  const forged = Buffer.from(JSON.stringify({account: signer.publicKey(), xdr: valid.toXDR()})).toString('base64url');
  assert.equal(accountFromRequest(new Request('http://localhost:3000', {headers: {Cookie: `bridge_session=${forged}`}})), null);
  assert.throws(() => createSession(proof.id, valid.toXDR()));
  assert.equal(accountFromRequest(new Request('http://localhost:3000', {headers: {Cookie: 'bridge_session=made-up'}})), null);
});
test('invoice records persist updates and do not require client-side storage', () => {
  putRecord('invoice', 'test', 'merchant', {amount: '1.0000000', status: 'draft'});
  putRecord('invoice', 'test', 'merchant', {amount: '1.0000000', status: 'open'});
  assert.deepEqual(record('invoice', 'test'), {amount: '1.0000000', status: 'open'});
});
