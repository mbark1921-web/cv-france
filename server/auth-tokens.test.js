import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { issueAuthToken, consumeAuthToken } from './auth-tokens.js';
import { hashToken } from './tokens.js';
import { verifyEmailSchema, resetConfirmSchema } from './validation.js';

// TEST_DATABASE_URL must name an isolated local PostgreSQL instance. The suite
// creates/drops only its own randomly named schema and uses the real db adapter.
const schema = 'c2_tokens_' + randomBytes(8).toString('hex');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let admin;
let db;
let generated;
let scratch;
const cases = [
  ['passwordReset', 'password_reset_tokens', 30],
  ['emailVerification', 'email_verification_tokens', 60]
];

before(async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to an isolated local PostgreSQL instance');
  const url = new URL(process.env.TEST_DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Tests require a local database');
  admin = new pg.Pool({ connectionString: url.toString() });
  await admin.query(`CREATE SCHEMA ${schema}`);
  await admin.query(`CREATE TABLE ${schema}.users (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    password_hash text NOT NULL DEFAULT 'old-password',
    token_version integer NOT NULL DEFAULT 0,
    email_verified boolean NOT NULL DEFAULT false
  )`);
  for (const [, table] of cases) {
    await admin.query(`CREATE TABLE ${schema}.${table} (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id integer NOT NULL REFERENCES ${schema}.users(id),
      token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, used_at timestamptz
    )`);
  }
  url.searchParams.set('options', `-c search_path=${schema}`);
  url.searchParams.set('application_name', schema);
  process.env.DATABASE_URL = url.toString();
  db = (await import('./db.js')).default;

  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'jovelya-token-routes-'));
  fs.mkdirSync(path.join(scratch, 'server'));
  fs.writeFileSync(path.join(scratch, 'server/index.js'), fs.readFileSync(path.join(root, 'server/index.js'), 'utf8').replace(/\r\n/g, '\n'));
  const result = spawnSync(process.execPath, [path.join(root, 'server/pg-transform.js')], { cwd: scratch, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  generated = fs.readFileSync(path.join(scratch, 'server/index.pg.generated.js'), 'utf8');
  const syntax = spawnSync(process.execPath, ['--check', path.join(scratch, 'server/index.pg.generated.js')], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
});

after(async () => {
  await db?.close();
  if (admin) {
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
  if (scratch) fs.rmSync(scratch, { recursive: true, force: true });
});

async function seed(purpose, table, expiresAt, rawOverride) {
  const token = issueAuthToken(purpose);
  if (rawOverride) { token.raw = rawOverride; token.hash = hashToken(rawOverride); }
  const { rows: [user] } = await db.query('INSERT INTO users DEFAULT VALUES RETURNING *');
  await db.query(`INSERT INTO ${table}(user_id,token_hash,expires_at) VALUES(?,?,?)`, [user.id, token.hash, expiresAt || token.expiresAt]);
  return { ...token, user };
}

const change = id => db.query('UPDATE users SET token_version=token_version+1 WHERE id=?', [id]);
const userRow = async id => (await db.query('SELECT * FROM users WHERE id=?', [id])).rows[0];

for (const [purpose, table, minutes] of cases) {
  test(`${purpose}: issuance expires in exactly ${minutes} minutes`, t => {
    const now = Date.parse('2026-09-05T12:00:00.000Z');
    t.mock.timers.enable({ apis: ['Date'], now });
    const token = issueAuthToken(purpose);
    assert.equal(Date.parse(token.expiresAt) - now, minutes * 60_000);
    assert.equal(token.hash, hashToken(token.raw));
  });

  for (const [offset, valid] of [[-1, true], [0, false], [1, false]]) {
    test(`${purpose}: expiry boundary ${offset} ms`, async () => {
      const expires = '2026-09-05T12:00:00.000Z';
      const token = await seed(purpose, table, expires);
      const now = new Date(Date.parse(expires) + offset).toISOString();
      // Keep real SQL/locking; freeze only the SQL wall clock for exact +/-1 ms.
      const fixedClockDb = { ...db, query: (sql, params) => db.query(
        sql.replaceAll('clock_timestamp()', `TIMESTAMPTZ '${now}'`), params
      ) };
      assert.equal(await consumeAuthToken(fixedClockDb, purpose, token.raw, change), valid);
      assert.equal((await userRow(token.user.id)).token_version, valid ? 1 : 0);
    });
  }

  test(`${purpose}: valid token succeeds once and reuse fails`, async () => {
    const token = await seed(purpose, table);
    assert.equal(await consumeAuthToken(db, purpose, token.raw, change), true);
    assert.equal(await consumeAuthToken(db, purpose, token.raw, change), false);
    assert.equal((await userRow(token.user.id)).token_version, 1);
  });

  test(`${purpose}: expired, unknown, and legacy long-lived tokens cannot be consumed`, async () => {
    const expired = await seed(purpose, table, new Date(Date.now() - 60_000).toISOString());
    const legacy = await seed(purpose, table, new Date(Date.now() + 1e12).toISOString(), randomBytes(32).toString('hex'));
    for (const raw of [expired.raw, legacy.raw, issueAuthToken(purpose).raw]) {
      assert.equal(await consumeAuthToken(db, purpose, raw, change), false);
    }
    assert.equal((await userRow(expired.user.id)).token_version, 0);
    assert.equal((await userRow(legacy.user.id)).token_version, 0);
  });

  test(`${purpose}: concurrent consumption has exactly one winner under a real row lock`, async () => {
    const token = await seed(purpose, table);
    let entered;
    let release;
    const claimed = new Promise(resolve => { entered = resolve; });
    const hold = new Promise(resolve => { release = resolve; });
    const first = consumeAuthToken(db, purpose, token.raw, async id => { entered(); await hold; await change(id); });
    await claimed;
    const second = consumeAuthToken(db, purpose, token.raw, change);
    try {
      let blocked = false;
      for (let i = 0; i < 200; i++) {
        const result = await admin.query("SELECT 1 FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock'", [schema]);
        if (result.rows.length) { blocked = true; break; }
        await delay(10);
      }
      assert.ok(blocked, 'Second connection must actually contend on the token row');
    } finally { release(); }
    assert.deepEqual(await Promise.all([first, second]), [true, false]);
    assert.equal((await userRow(token.user.id)).token_version, 1);
  });

  test(`${purpose}: failed account change rolls back token consumption`, async () => {
    const token = await seed(purpose, table);
    await assert.rejects(consumeAuthToken(db, purpose, token.raw, async id => {
      await change(id);
      throw new Error('simulated account failure');
    }), /simulated account failure/);
    assert.equal((await userRow(token.user.id)).token_version, 0);
    assert.equal(await consumeAuthToken(db, purpose, token.raw, change), true);
  });
}

// Execute generated route bodies with real schemas, bcrypt and PostgreSQL,
// without starting an HTTP server or contacting an email provider.
function handler(route) {
  const start = generated.indexOf(`app.post("${route}", async `);
  assert.ok(start >= 0);
  const body = generated.slice(generated.indexOf('async ', start), generated.indexOf('\n});', start) + 2);
  return vm.runInNewContext(`(${body})`, {
    db, bcrypt, consumeAuthToken, verifyEmailSchema, resetConfirmSchema,
    parse: (schema, body, res) => {
      const result = schema.safeParse(body);
      if (result.success) return result.data;
      res.status(400).json({ error: 'Données invalides.' });
      return null;
    }
  });
}

async function call(route, body) {
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
  await handler(route)({ body }, response, err => { throw err; });
  return response;
}

test('generated reset route: concurrent requests reset password and revoke sessions exactly once', async () => {
  const token = await seed('passwordReset', 'password_reset_tokens');
  const body = { token: token.raw, newPassword: 'New-password-123!' };
  const results = await Promise.all([call('/api/auth/reset-password', body), call('/api/auth/reset-password', body)]);
  assert.deepEqual(results.map(r => r.statusCode).sort(), [200, 400]);
  const user = await userRow(token.user.id);
  assert.equal(user.token_version, 1);
  assert.equal(await bcrypt.compare(body.newPassword, user.password_hash), true);
});

test('generated verification route: concurrent requests verify once', async () => {
  const token = await seed('emailVerification', 'email_verification_tokens');
  const results = await Promise.all([call('/api/auth/verify-email', { token: token.raw }), call('/api/auth/verify-email', { token: token.raw })]);
  assert.deepEqual(results.map(r => r.statusCode).sort(), [200, 400]);
  assert.equal((await userRow(token.user.id)).email_verified, true);
  assert.equal((await userRow(token.user.id)).token_version, 0);
});

test('token purposes cannot be interchanged', async () => {
  const reset = await seed('passwordReset', 'password_reset_tokens');
  const verify = await seed('emailVerification', 'email_verification_tokens');
  assert.equal(await consumeAuthToken(db, 'emailVerification', reset.raw, change), false);
  assert.equal(await consumeAuthToken(db, 'passwordReset', verify.raw, change), false);
});
