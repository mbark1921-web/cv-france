import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sendMail } from './mailer.js';

const message = {to:'recipient@example.test', subject:'Fixture', text:'Synthetic test'};
test('Brevo bounds the whole request and never retries an ambiguous send', async t => {
  t.mock.property(process, 'env', {...process.env, EMAIL_MODE:'brevo', BREVO_API_KEY:'synthetic', BREVO_SENDER_EMAIL:'sender@example.test'});
  let calls = 0;
  t.mock.method(AbortSignal, 'timeout', milliseconds => {
    assert.equal(milliseconds, 15000);
    return AbortSignal.abort(new DOMException('Fixture timeout', 'TimeoutError'));
  });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
    options.signal.throwIfAborted();
  });
  await assert.rejects(sendMail(message), {name:'TimeoutError'});
  assert.equal(calls, 1);
});
test('Brevo errors omit provider details', async t => {
  t.mock.property(process, 'env', {...process.env, EMAIL_MODE:'brevo', BREVO_API_KEY:'synthetic', BREVO_SENDER_EMAIL:'sender@example.test'});
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({message:'PRIVATE recipient@example.test'}), {status:401}));
  await assert.rejects(sendMail(message), {message:'Brevo API 401'});
});
test('production console mail cannot expose reset or verification links', async t => {
  t.mock.property(process, 'env', {...process.env, EMAIL_MODE:'console', NODE_ENV:'production'});
  const log = t.mock.method(console, 'log', () => {});
  await assert.rejects(sendMail(message), /Console email is disabled/);
  assert.equal(log.mock.callCount(), 0);
});
