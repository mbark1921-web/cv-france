import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import tls from 'node:tls';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { databaseConnectionOptions } from './database-tls.js';

let scratch, cert, key;
const remote = 'postgresql://fixture:synthetic@example.test/postgres';
const options = (url = remote, env = {}) => databaseConnectionOptions({DATABASE_URL:url, ...env});
before(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'jovelya-tls-'));
  const openssl = process.env.OPENSSL_BIN || 'openssl';
  const generated = spawnSync(openssl, ['req','-x509','-newkey','rsa:2048','-nodes','-days','1',
    '-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost',
    '-keyout',path.join(scratch,'key.pem'),'-out',path.join(scratch,'cert.pem')], {encoding:'utf8'});
  assert.equal(generated.status, 0, 'OpenSSL is required (or set OPENSSL_BIN): ' + (generated.error?.message || generated.stderr));
  key = fs.readFileSync(path.join(scratch,'key.pem'));
  cert = fs.readFileSync(path.join(scratch,'cert.pem'));
});
after(() => { if(scratch) fs.rmSync(scratch,{recursive:true,force:true}); });

test('remote and production connections require certificate and hostname verification', () => {
  for (const env of [{},{NODE_ENV:'production'},{APP_STAGE:'production'},{PGSSLMODE:'no-verify'}]) {
    const client = new pg.Client(options(remote, env));
    assert.equal(client.connectionParameters.ssl.rejectUnauthorized,true);
    assert.equal(typeof client.connectionParameters.ssl.checkServerIdentity,'function');
  }
});
test('URL TLS flags cannot replace or downgrade the verified pg options', () => {
  for (const mode of ['require','prefer','verify-ca','verify-full']) {
    const config = options(remote + '?sslmode=' + mode + '&uselibpqcompat=true&application_name=fixture', {DATABASE_CA_CERT_PATH:path.join(scratch,'cert.pem')});
    const client = new pg.Client(config);
    assert.equal(client.connectionParameters.ssl.rejectUnauthorized,true);
    assert.equal(client.connectionParameters.ssl.ca,cert.toString());
    assert.equal(client.connectionParameters.application_name,'fixture');
    assert.equal(new URL(config.connectionString).searchParams.has('sslmode'),false);
  }
  for (const query of ['sslmode=no-verify','ssl=no-verify','ssl=0','ssl=false','sslmode=disable','sslkey=private.pem','sslmode=verify-full&sslmode=disable']) {
    assert.throws(() => options(remote + '?' + query));
  }
});
test('plaintext is explicit and restricted to non-production loopback', () => {
  for (const host of ['localhost','127.0.0.1','[::1]']) {
    const url = 'postgresql://fixture@' + host + '/postgres?sslmode=disable';
    assert.equal(new pg.Client(options(url)).connectionParameters.ssl,false);
    assert.throws(() => options(url,{NODE_ENV:'production'}));
    assert.throws(() => options(url,{APP_STAGE:'production'}));
  }
  assert.equal(options('postgresql://fixture@localhost/postgres').ssl.rejectUnauthorized,true);
  assert.throws(() => options('postgresql://fixture@localhost/postgres?sslmode=disable&host=example.test'));
  assert.throws(() => options('postgresql://fixture@localhost/postgres?sslmode=disable&host=localhost&host=example.test'));
});
test('missing, malformed CA and global TLS bypass fail safely without credentials', () => {
  fs.writeFileSync(path.join(scratch,'invalid.pem'),'not a certificate');
  for(const file of ['missing.pem','invalid.pem','key.pem']) {
    assert.throws(() => options(remote,{DATABASE_CA_CERT_PATH:path.join(scratch,file)}), err => {
      assert.equal(err.message,'Database CA certificate file is missing or invalid.');
      assert.doesNotMatch(err.message,/synthetic|fixture/); return true;
    });
  }
  assert.throws(() => options(remote,{NODE_TLS_REJECT_UNAUTHORIZED:'0'}));
  assert.throws(() => options('not-a-url-secret'), /valid PostgreSQL/);
});
test('sslrootcert URL path is loaded without allowing pg to replace verification', () => {
  const url = new URL(remote); url.searchParams.set('sslrootcert',path.join(scratch,'cert.pem'));
  url.searchParams.set('sslmode','verify-full');
  const client = new pg.Client(options(url.toString()));
  assert.equal(client.connectionParameters.ssl.ca,cert.toString());
  assert.equal(client.connectionParameters.ssl.rejectUnauthorized,true);
});

// Minimal PostgreSQL wire fixture: real pg SSLRequest, TLS handshake and SELECT 1.
// No database data, credentials, certificates or private keys are stored in the repo.
function message(type, payload) {
  const size = Buffer.alloc(4); size.writeInt32BE(payload.length + 4);
  return Buffer.concat([Buffer.from(type),size,payload]);
}
async function endpoint() {
  const sockets = new Set();
  const secure = tls.createServer({key,cert}, socket => {
    let pending = Buffer.alloc(0), startup = true;
    socket.on('error',()=>{});
    socket.on('data', chunk => {
      pending = Buffer.concat([pending,chunk]);
      while (pending.length >= (startup ? 4 : 5)) {
        const size = pending.readInt32BE(startup ? 0 : 1) + (startup ? 0 : 1);
        if(pending.length < size) return;
        const packet = pending.subarray(0,size); pending = pending.subarray(size);
        if(startup) {
          startup = false;
          socket.write(Buffer.concat([message('R',Buffer.alloc(4)),message('Z',Buffer.from('I'))]));
        } else if(packet[0] === 81) {
          // RowDescription: one int4 column named value.
          const column = Buffer.alloc(18); column.writeInt32BE(23,6); column.writeInt16BE(4,10); column.writeInt32BE(-1,12);
          const value = Buffer.from([0,1,0,0,0,1,49]);
          socket.write(Buffer.concat([
            message('T',Buffer.concat([Buffer.from([0,1]),Buffer.from('value\0'),column])),
            message('D',value),message('C',Buffer.from('SELECT 1\0')),message('Z',Buffer.from('I'))
          ]));
        } else if(packet[0] === 88) socket.end();
      }
    });
  });
  secure.on('tlsClientError',()=>{});
  const server = net.createServer(socket => {
    sockets.add(socket); socket.on('close',()=>sockets.delete(socket)); socket.on('error',()=>{});
    socket.once('data', packet => {
      assert.equal(packet.readInt32BE(4),80877103);
      socket.write('S'); secure.emit('connection',socket);
    });
  });
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  return {port:server.address().port, async close(){for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}};
}
async function connectFixture(host, env, accepted) {
  const server = await endpoint();
  const client = new pg.Client({...options('postgresql://fixture@'+host+':'+server.port+'/postgres?sslmode=require',env),connectionTimeoutMillis:3000});
  try {
    if(accepted) {
      await client.connect();
      assert.equal(client.connection.stream.authorized,true);
      assert.equal((await client.query('SELECT 1 AS value')).rows[0].value,1);
    } else {
      await assert.rejects(client.connect(), err => ['DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','ERR_TLS_CERT_ALTNAME_INVALID'].includes(err.code));
    }
  } finally {await client.end();await server.close();}
}
test('trusted certificate is accepted by pg and a query succeeds', async () => {
  await connectFixture('localhost',{NODE_ENV:'production',DATABASE_CA_CERT_PATH:path.join(scratch,'cert.pem')},true);
});
test('untrusted certificate is rejected by pg with no plaintext fallback', async () => {
  await connectFixture('localhost',{NODE_ENV:'production'},false);
});
test('trusted certificate for the wrong hostname is rejected by pg', async () => {
  await connectFixture('127.0.0.1',{NODE_ENV:'production',DATABASE_CA_CERT_PATH:path.join(scratch,'cert.pem')},false);
});
