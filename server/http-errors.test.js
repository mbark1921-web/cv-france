import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import jwt from 'jsonwebtoken';
import express from 'express';
import Stripe from 'stripe';
import { installAsyncRoutes, jsonErrorHandler } from './http-errors.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const secret = 'synthetic-c3-test-signing-key-only-123456789';
let scratch, child, base;
let output = '';
before(async () => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'jovelya-errors-'));
  fs.cpSync(path.join(root, 'server'), path.join(scratch, 'server'), { recursive: true });
  fs.writeFileSync(path.join(scratch, 'package.json'), '{"type":"module"}');
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(scratch, 'node_modules'), 'junction');
  const source = path.join(scratch, 'server/index.js');
  fs.writeFileSync(source, fs.readFileSync(source, 'utf8').replace(/\r\n/g, '\n'));
  fs.writeFileSync(source, fs.readFileSync(source, 'utf8').replace('from "stripe"', 'from "./test-stripe.js"'));
  fs.writeFileSync(path.join(scratch, 'server/test-stripe.js'), `import Stripe from 'stripe';
    export default class extends Stripe { constructor(...args) { super(...args);
      this.subscriptions.retrieve = async () => { const err = new Error('PRIVATE Stripe detail'); err.statusCode = 503; throw err; };
    } }
  `);
  fs.writeFileSync(path.join(scratch, 'server/ai.js'), `
    export async function improveProfile() { throw new Error('PRIVATE AI detail'); }
    export async function generateCoverLetter() { throw new Error('PRIVATE AI detail'); }
  `);
  const build = spawnSync(process.execPath, [path.join(root, 'server/pg-transform.js')], { cwd: scratch, encoding: 'utf8' });
  assert.equal(build.status, 0, build.stderr);
  fs.writeFileSync(path.join(scratch, 'server/db.js'), `
    const user = {id:7,email:'fixture@example.test',email_verified:false,token_version:0,plan:'free'};
    export default {
      prepare(sql) { return {
        async get(value) { if (value === 77) return {...user,id:77,plan:'premium'}; if (value === 88) return {...user,id:88,stripe_subscription_id:'sub_failure'}; if (value === 'new@example.test') return null; if(value === 99 || value === 'db-fail@example.test') throw new Error('PRIVATE database detail'); return user; },
        async all() { throw new Error('PRIVATE database detail'); },
        async run() { if (/UPDATE users/.test(sql)) throw new Error('PRIVATE webhook database detail'); return {changes:1,lastInsertRowid:7}; }
      }; },
      async close() {}, async ping() { return true; }
    };
  `);
  fs.writeFileSync(path.join(scratch, 'server/mailer.js'), `export async function sendMail() { throw new Error('PRIVATE email credentials'); }`);
  // Instrument only the copied central handler to prove requests actually reach it.
  const errorsFile = path.join(scratch, 'server/http-errors.js');
  fs.writeFileSync(errorsFile, fs.readFileSync(errorsFile, 'utf8').replace(
    'export function jsonErrorHandler(err, req, res, next) {',
    'export function jsonErrorHandler(err, req, res, next) { res.setHeader("x-test-central-error", "yes");'
  ));
  fs.writeFileSync(path.join(scratch, 'bootstrap.js'), `
    import express from 'express';
    const listen = express.application.listen;
    express.application.listen = function (...args) {
      const server = listen.apply(this, args);
      server.once('listening', () => process.send({port:server.address().port}));
      return server;
    };
    await import('./server/index.pg.generated.js');
  `);
  child = fork(path.join(scratch, 'bootstrap.js'), [], {
    cwd: scratch, execArgv: ['--unhandled-rejections=strict'], silent: true,
    env: { ...process.env, PORT:'0', JWT_SECRET:secret, STRIPE_SECRET_KEY:'sk_test_synthetic_fixture', STRIPE_WEBHOOK_SECRET:'whsec_synthetic_fixture', REGISTRATION_MODE:'open',
      DOTENV_CONFIG_PATH:path.join(scratch, 'absent.env'), ALLOWED_ORIGIN:'',
      MAINTENANCE_MODE:'off', APP_STAGE:'staging', EMAIL_MODE:'console', SUPPORT_EMAIL:'support@example.test' }
  });
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  const ready = await Promise.race([
    once(child, 'message'),
    once(child, 'exit').then(([code]) => { throw new Error(`Server exited ${code}: ${output}`); }),
    new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Server startup timeout: ' + output)), 10000); timer.unref(); })
  ]);
  base = `http://127.0.0.1:${ready[0].port}`;
});
after(async () => {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit'); child.kill(); await exited;
  }
  if (scratch) fs.rmSync(scratch, {recursive:true, force:true});
});
const token = id => jwt.sign({id,tv:0}, secret);
async function request(url, options = {}) {
  return fetch(base + url, { ...options, signal: AbortSignal.timeout(5000), headers: {
    'content-type':'application/json', authorization:'Bearer ' + token(7), ...options.headers
  }}).catch(err => { throw new Error(output, {cause:err}); });
}
async function controlled(url, options, status) {
  const response = await request(url, options);
  assert.equal(response.status, status);
  if (status >= 500) assert.equal(response.headers.get("x-test-central-error"), "yes");
  assert.match(response.headers.get('content-type'), /application\/json/);
  const body = await response.json();
  assert.equal(typeof body.error, 'string');
  assert.doesNotMatch(JSON.stringify(body), /PRIVATE|stack|SELECT|credentials/);
  assert.equal((await request('/api/health')).status, 200, output);
  assert.equal(child.exitCode, null, output);
}
test('database rejection in generated route is JSON; process remains available', async () => {
  await controlled('/api/cvs', {}, 500);
  await controlled('/api/auth/login', {method:'POST',body:JSON.stringify({email:'db-fail@example.test',password:'Test-password-123!'})}, 500);
});
test('authentication database failure is 500 while invalid JWT remains 401', async () => {
  await controlled('/api/me', {headers:{authorization:'Bearer ' + token(99)}}, 500);
  await controlled('/api/me', {headers:{authorization:'Bearer invalid'}}, 401);
});
test('email rejection is controlled for reset, verification and support', async () => {
  await controlled('/api/auth/request-password-reset', {method:'POST',body:JSON.stringify({email:'fixture@example.test'})}, 500);
  await controlled('/api/auth/resend-verification', {method:'POST',body:'{}'}, 500);
  await controlled('/api/support/contact', {method:'POST',body:JSON.stringify({name:'Test Person',email:'fixture@example.test',subject:'Test subject',message:'A synthetic test support message.'})}, 502);
});
test('registration dependency failures reach central JSON handling', async () => {
  for (const email of ['db-fail@example.test','new@example.test']) {
    await controlled('/api/auth/register', {method:'POST',body:JSON.stringify({email,password:'Test-password-123!'})}, 500);
  }
});
test('verified webhook database failure is central JSON and server remains available', async () => {
  const body = JSON.stringify({type:'customer.subscription.updated',data:{object:{id:'sub_fixture',customer:'cus_fixture',status:'active'}}});
  const stripe = new Stripe('sk_test_synthetic_fixture');
  const signature = stripe.webhooks.generateTestHeaderString({payload:body,secret:'whsec_synthetic_fixture'});
  await controlled('/api/billing/webhook', {method:'POST',body,headers:{'stripe-signature':signature}}, 500);
  const invalid = await request('/api/billing/webhook', {method:'POST',body,headers:{'stripe-signature':'invalid'}});
  assert.equal(invalid.status, 400);
  assert.equal(await invalid.text(), 'Invalid webhook signature');
  assert.equal((await request('/api/health')).status, 200);
});
test('AI and subscription dependency failures reach central handling', async () => {
  await controlled('/api/ai/improve-profile', {method:'POST',headers:{authorization:'Bearer ' + token(77)},body:JSON.stringify({text:'Synthetic candidate experience for this regression test.'})}, 502);
  await controlled('/api/ai/generate-letter', {method:'POST',headers:{authorization:'Bearer ' + token(77)},body:JSON.stringify({candidateFacts:'Synthetic candidate experience for this regression test.',targetRole:'Engineer'})}, 502);
  await controlled('/api/billing/refresh-status', {method:'POST',headers:{authorization:'Bearer ' + token(88)},body:'{}'}, 500);
});
test('invalid identifiers and malformed URL encoding are controlled', async () => {
  for (const id of ['abc','-1','0','1.5','9007199254740992','%E0%A4%A']) {
    await controlled('/api/cvs/' + id, {}, 400);
  }
});
test('malformed JSON, oversized JSON and invalid payload remain controlled', async () => {
  await controlled('/api/auth/login', {method:'POST',body:'{'}, 400);
  await controlled('/api/auth/login', {method:'POST',body:JSON.stringify({padding:'x'.repeat(1024*1024)})}, 413);
  await controlled('/api/auth/login', {method:'POST',body:'{}'}, 400);
});
test('wrapper covers route chains, nested middleware and synchronous throws', async () => {
  const app = express(); installAsyncRoutes(app);
  app.route('/failure').get([async () => { throw new Error('private'); }]);
  app.post('/failure', () => { throw new Error('private'); });
  app.use(jsonErrorHandler);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    for (const method of ['GET','POST']) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/failure`, {method, signal:AbortSignal.timeout(5000)});
      assert.equal(response.status, 500); assert.equal(typeof (await response.json()).error, 'string');
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('central handler delegates failures after headers have been sent', () => {
  const error = new Error('late failure'); let forwarded;
  jsonErrorHandler(error, {}, {headersSent:true}, err => { forwarded = err; });
  assert.equal(forwarded, error);
});

 test('async app.use, parameter callbacks and error middleware forward failures and preserve availability', async () => {
  const app = express(); installAsyncRoutes(app);
  app.get('/health', (req, res) => res.json({ok:true}));
  app.use(['/use', '/use-alias'], [[async () => { throw new Error('PRIVATE middleware'); }]]);
  app.param('item', async (req, res, next, value, name) => {
    assert.equal(value, '7'); assert.equal(name, 'item');
    throw new Error('PRIVATE parameter');
  });
  app.get('/param/:item', (req, res) => res.json({unexpected:true}));
  app.use('/error-middleware', async () => { throw new Error('first'); });
  app.use('/error-middleware', async (err, req, res, next) => { throw new Error('PRIVATE error middleware'); });
  app.use(jsonErrorHandler);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const route of ['/use','/use-alias','/param/7','/error-middleware']) {
      const response = await fetch(url + route, {signal:AbortSignal.timeout(5000)});
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {error:'Erreur interne du serveur.'});
      assert.equal((await fetch(url + '/health', {signal:AbortSignal.timeout(5000)})).status, 200);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
 });
