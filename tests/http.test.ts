import assert from 'node:assert/strict';
import test from 'node:test';
import {readApiJson} from '../lib/client-api';
import {parseRequestJson} from '../lib/http';

test('empty API responses never expose the native JSON parser error', async () => {
  await assert.rejects(
    readApiJson(new Response('', {status: 200}), 'Sunucu yanıtı eksik.'),
    /Sunucu yanıtı eksik/,
  );
  await assert.rejects(
    readApiJson(new Response('', {status: 502})),
    /Sunucu isteği başarısız \(502\)/,
  );
});

test('malformed request bodies receive an actionable message', () => {
  assert.throws(() => parseRequestJson(''), /İstek verisi eksik/);
  assert.throws(() => parseRequestJson('{'), /İstek verisi geçersiz/);
  assert.deepEqual(parseRequestJson('{"action":"sample"}'), {action: 'sample'});
});
